import { NextResponse } from "next/server";
import { generateImagesWithProvider } from "@/lib/ai/generateImage";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Client, ReferencePhoto, Shoot } from "@/lib/types";

function logSupabaseError(context: string, error: unknown) {
  if (!error) return;
  const supabaseError = error as { message?: string; details?: string; hint?: string; code?: string };
  console.error(context, {
    message: supabaseError.message,
    details: supabaseError.details,
    hint: supabaseError.hint,
    code: supabaseError.code,
    full: error
  });
}

export async function POST(request: Request) {
  let admin: ReturnType<typeof createSupabaseAdminClient> | null = null;
  let generationLogId: string | null = null;
  let debited = false;
  let refundContext: { userId: string; shootId: string; title: string; quantity: number; previousBalance: number; previousTotalUsed: number } | null = null;

  try {
    const body = (await request.json()) as {
      shoot: Shoot;
      client: Client;
      referencePhotos: ReferencePhoto[];
    };

    if (!body.shoot || !body.client) {
      return NextResponse.json({ error: "Dados incompletos para gerar o ensaio." }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Sessao invalida. Entre novamente." }, { status: 401 });
    }

    admin = createSupabaseAdminClient();
    const { data: shoot, error: shootError } = await admin
      .from("shoots")
      .select("*")
      .eq("id", body.shoot.id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (shootError || !shoot) {
      if (shootError) logSupabaseError("Supabase error", shootError);
      return NextResponse.json({ error: "Ensaio nao encontrado para este usuario." }, { status: 404 });
    }

    const { data: client, error: clientError } = await admin
      .from("clients")
      .select("*")
      .eq("id", shoot.client_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (clientError || !client) {
      if (clientError) logSupabaseError("Supabase error", clientError);
      return NextResponse.json({ error: "Cliente nao encontrada para este usuario." }, { status: 404 });
    }

    if (!shoot.consent_confirmed) {
      return NextResponse.json({ error: "Confirme a autorizacao de uso de imagem antes de gerar." }, { status: 400 });
    }

    const { data: referencePhotos, error: refsError } = await admin
      .from("reference_photos")
      .select("*")
      .eq("user_id", user.id)
      .eq("client_id", client.id)
      .eq("shoot_id", shoot.id);

    if (refsError) {
      logSupabaseError("Supabase error", refsError);
      return NextResponse.json({ error: "Nao foi possivel consultar as fotos obrigatorias." }, { status: 400 });
    }

    const required = ["face_neutral", "face_smiling", "full_body_front", "full_body_side"];
    const sent = new Set((referencePhotos ?? []).map((photo) => photo.type));
    if (!required.every((type) => sent.has(type))) {
      return NextResponse.json({ error: "Envie todas as fotos obrigatorias antes de continuar." }, { status: 400 });
    }

    const { data: realCredits, error: creditsError } = await admin.from("credits").select("*").eq("user_id", user.id).maybeSingle();
    if (creditsError) {
      logSupabaseError("Supabase error", creditsError);
      return NextResponse.json({ error: "Nao foi possivel consultar seus creditos agora." }, { status: 400 });
    }

    const credits = realCredits ?? { id: user.id, user_id: user.id, balance: 0, total_purchased: 0, total_used: 0, updated_at: new Date().toISOString() };
    const trustedShoot = { ...shoot, user_id: user.id } as Shoot;
    const trustedClient = client as Client;
    const trustedReferencePhotos = (referencePhotos ?? []) as ReferencePhoto[];
    const nextBalance = credits.balance - trustedShoot.quantity;
    const now = new Date().toISOString();

    if (nextBalance < 0) {
      return NextResponse.json({ error: "Creditos insuficientes." }, { status: 400 });
    }

    const { data: pendingLog, error: pendingLogError } = await admin
      .from("generation_logs")
      .insert({
        user_id: user.id,
        shoot_id: trustedShoot.id,
        provider: trustedShoot.provider || "mock",
        model: "mock-v1",
        request_payload: { quantity: trustedShoot.quantity, shoot_id: trustedShoot.id },
        status: "pending",
        credits_charged: trustedShoot.quantity,
        cost_estimate: trustedShoot.quantity
      })
      .select("id")
      .single();

    if (pendingLogError || !pendingLog) {
      logSupabaseError("Supabase error", pendingLogError);
      return NextResponse.json({ error: "Nao foi possivel iniciar o log de geracao." }, { status: 400 });
    }

    generationLogId = pendingLog.id;

    await admin
      .from("shoots")
      .update({ status: "generating", updated_at: now })
      .eq("id", trustedShoot.id)
      .eq("user_id", user.id);

    const { error: debitError } = await admin
      .from("credits")
      .update({
        balance: nextBalance,
        total_used: credits.total_used + trustedShoot.quantity,
        updated_at: now
      })
      .eq("user_id", user.id);

    if (debitError) {
      logSupabaseError("Supabase error", debitError);
      await admin.from("generation_logs").update({ status: "failed", error_message: debitError.message }).eq("id", generationLogId);
      await admin.from("shoots").update({ status: "failed", updated_at: now }).eq("id", trustedShoot.id).eq("user_id", user.id);
      return NextResponse.json({ error: "Nao foi possivel descontar creditos agora." }, { status: 400 });
    }

    debited = true;
    refundContext = { userId: user.id, shootId: trustedShoot.id, title: trustedShoot.title, quantity: trustedShoot.quantity, previousBalance: credits.balance, previousTotalUsed: credits.total_used };

    const { error: usageTxError } = await admin.from("credit_transactions").insert({
      user_id: user.id,
      type: "usage",
      amount: -trustedShoot.quantity,
      balance_before: credits.balance,
      balance_after: nextBalance,
      description: `Geracao do ensaio ${trustedShoot.title}`,
      related_shoot_id: trustedShoot.id
    });

    if (usageTxError) {
      throw usageTxError;
    }

    const result = await generateImagesWithProvider({ shoot: trustedShoot, client: trustedClient, referencePhotos: trustedReferencePhotos, credits });
    const { error: imagesError } = await admin.from("generated_images").insert(
      result.images.map((image) => ({
        user_id: user.id,
        client_id: image.client_id,
        shoot_id: image.shoot_id,
        file_url: image.file_url,
        prompt_used: image.prompt_used,
        provider: image.provider,
        model: image.model,
        status: image.status,
        width: image.width,
        height: image.height,
        seed: image.seed,
        cost_estimate: image.cost_estimate,
        is_favorite: false
      }))
    );

    if (imagesError) {
      throw imagesError;
    }

    const { error: successLogError } = await admin.from("generation_logs").update({
      provider: result.log.provider,
      model: result.log.model,
      request_payload: result.log.request_payload,
      response_payload: result.log.response_payload,
      status: "success",
      error_message: null,
      credits_charged: result.log.credits_charged,
      cost_estimate: result.log.cost_estimate
    }).eq("id", generationLogId);

    if (successLogError) {
      throw successLogError;
    }

    const { error: shootUpdateError } = await admin
      .from("shoots")
      .update({
        status: "completed",
        generated_prompt: result.prompt,
        negative_prompt: result.negativePrompt,
        credits_used: trustedShoot.quantity,
        updated_at: now
      })
      .eq("id", trustedShoot.id)
      .eq("user_id", user.id);

    if (shootUpdateError) {
      throw shootUpdateError;
    }

    return NextResponse.json(result);
  } catch (error) {
    logSupabaseError("Supabase error", error);
    if (admin && debited && refundContext) {
      await admin
        .from("credits")
        .update({
          balance: refundContext.previousBalance,
          total_used: refundContext.previousTotalUsed,
          updated_at: new Date().toISOString()
        })
        .eq("user_id", refundContext.userId);
      await admin.from("credit_transactions").insert({
        user_id: refundContext.userId,
        type: "refund",
        amount: refundContext.quantity,
        balance_before: refundContext.previousBalance - refundContext.quantity,
        balance_after: refundContext.previousBalance,
        description: `Reembolso por falha na geracao do ensaio ${refundContext.title}`,
        related_shoot_id: refundContext.shootId
      });
      await admin.from("shoots").update({ status: "failed", updated_at: new Date().toISOString() }).eq("id", refundContext.shootId).eq("user_id", refundContext.userId);
    }
    if (admin && generationLogId) {
      const errorMessage = error instanceof Error ? error.message : "Falha tecnica na geracao.";
      await admin.from("generation_logs").update({ status: "failed", error_message: errorMessage }).eq("id", generationLogId);
    }
    const message = error instanceof Error ? error.message : "Nao foi possivel gerar as imagens agora. Tente novamente ou fale com o suporte.";
    const safeMessage = message.includes("Creditos") || message.includes("autorizacao") ? message : "Nao foi possivel gerar as imagens agora. Tente novamente ou fale com o suporte.";
    return NextResponse.json({ error: safeMessage }, { status: 400 });
  }
}
