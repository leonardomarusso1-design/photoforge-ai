import { NextResponse } from "next/server";
import { buildCompositionGoal } from "@/lib/ai/buildPremiumPrompt";
import { creditsPerImageForProvider, isRealProvider, normalizeProviderName, generateImagesWithProvider } from "@/lib/ai/generateImage";
import { imageQuantityError, isValidImageQuantity } from "@/lib/ai/providerRules";
import { qualityBlockMessage, summarizePhotoQuality } from "@/lib/ai/photoQuality";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Client, GeneratedImage, ReferencePhoto, Shoot } from "@/lib/types";

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

const friendlyGeminiError = "Não foi possível gerar a imagem agora. Pode ser limite temporário da API ou configuração de cobrança. Tente novamente em alguns minutos ou fale com o suporte.";

function summarizedError(error: unknown) {
  const raw = error instanceof Error ? error.message : typeof error === "string" ? error : "unknown_error";
  return raw.replace(process.env.GEMINI_API_KEY ?? "__NO_GEMINI_KEY__", "[redacted]").slice(0, 260);
}

function logGenerationError(args: { userId?: string; provider?: string; model?: string; status: string; error: unknown }) {
  console.error("Generation provider error", {
    user_id: args.userId ?? null,
    provider: args.provider ?? null,
    model: args.model ?? null,
    status: args.status,
    error: summarizedError(args.error)
  });
}

function isGeminiFriendlyError(error: unknown) {
  const message = summarizedError(error).toLowerCase();
  return ["gemini", "google", "quota", "billing", "bill", "model", "rate", "429", "403", "401", "resource_exhausted", "permission_denied", "not found"].some((token) => message.includes(token));
}

function storageRouteForPath(path: string) {
  return `/api/generated-image/${path.split("/").map(encodeURIComponent).join("/")}`;
}

function parseDataImageUrl(value: string) {
  const match = value.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  return {
    mimeType: match[1],
    buffer: Buffer.from(match[2], "base64")
  };
}

async function loadImageBuffer(fileUrl: string) {
  const inline = parseDataImageUrl(fileUrl);
  if (inline) return inline;

  const response = await fetch(fileUrl);
  if (!response.ok) {
    throw new Error(`Nao foi possivel baixar a imagem gerada: ${response.status}`);
  }
  const mimeType = response.headers.get("content-type") || "image/jpeg";
  return {
    mimeType,
    buffer: Buffer.from(await response.arrayBuffer())
  };
}

async function persistGeneratedImagesToStorage(args: {
  admin: ReturnType<typeof createSupabaseAdminClient>;
  userId: string;
  clientId: string;
  shootId: string;
  images: GeneratedImage[];
}) {
  const saved: GeneratedImage[] = [];
  for (const [index, image] of args.images.entries()) {
    const { mimeType, buffer } = await loadImageBuffer(image.file_url);
    const extension = mimeType.includes("webp") ? "webp" : mimeType.includes("png") ? "png" : "jpg";
    const storagePath = `${args.userId}/${args.clientId}/${args.shootId}/${Date.now()}-${index}-${crypto.randomUUID()}.${extension}`;
    const { error } = await args.admin.storage
      .from("generated-images")
      .upload(storagePath, buffer, { contentType: mimeType, upsert: false });

    if (error) {
      logSupabaseError("Supabase error", error);
      throw new Error("Nao foi possivel salvar a imagem gerada no storage.");
    }

    saved.push({
      ...image,
      file_url: storageRouteForPath(storagePath)
    });
  }
  return saved;
}

async function signedReferenceUrl(args: {
  admin: ReturnType<typeof createSupabaseAdminClient>;
  photo: ReferencePhoto;
}) {
  const referencePathOrUrl = args.photo.storage_path || args.photo.file_url;
  if (!referencePathOrUrl) return null;
  if (/^https?:\/\//.test(referencePathOrUrl) || referencePathOrUrl.startsWith("data:")) {
    return referencePathOrUrl;
  }
  const { data: signed, error } = await args.admin.storage
    .from("client-reference-photos")
    .createSignedUrl(referencePathOrUrl, 60 * 60);
  if (error || !signed?.signedUrl) {
    if (error) logSupabaseError("Supabase error", error);
    throw new Error("Nao foi possivel preparar as fotos de referencia para geracao real.");
  }
  return signed.signedUrl;
}

export async function POST(request: Request) {
  let admin: ReturnType<typeof createSupabaseAdminClient> | null = null;
  let generationLogId: string | null = null;
  let debited = false;
  let refundContext: { userId: string; shootId: string; title: string; creditsCharged: number; previousBalance: number; previousTotalUsed: number } | null = null;

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

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("role,status")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profileError) {
      logSupabaseError("Supabase error", profileError);
      return NextResponse.json({ error: "Nao foi possivel validar seu perfil agora." }, { status: 400 });
    }

    const isAdmin = profile?.role === "admin" && profile?.status === "active";

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

    const required = ["face_neutral", "face_smiling", "full_body_front"];
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
    const photoQuality = summarizePhotoQuality(trustedReferencePhotos);
    if (!photoQuality.ok) {
      return NextResponse.json({ error: qualityBlockMessage(trustedReferencePhotos) }, { status: 400 });
    }
    const primaryReference = photoQuality.primary;
    const providerName = normalizeProviderName(process.env.AI_PROVIDER || trustedShoot.provider || "mock");
    const realProvider = isRealProvider(providerName);
    const creditsCharged = trustedShoot.quantity * creditsPerImageForProvider(providerName);
    const nextBalance = credits.balance - creditsCharged;
    const now = new Date().toISOString();
    const compositionGoal = buildCompositionGoal(trustedShoot);
    const aspectRatio = compositionGoal.includes("medium-wide") || compositionGoal.includes("full-body") ? "4:3" : "3:4";

    if (realProvider) {
      if (!isAdmin || process.env.ALLOW_REAL_AI_FOR_ADMIN !== "true") {
        return NextResponse.json({ error: "Provider real disponivel apenas para teste admin." }, { status: 403 });
      }
    }

    if (!isValidImageQuantity(providerName, trustedShoot.quantity)) {
      return NextResponse.json({ error: imageQuantityError(providerName) }, { status: 400 });
    }

    if (nextBalance < 0) {
      return NextResponse.json({ error: "Creditos insuficientes." }, { status: 400 });
    }

    const identityTypes = ["face_neutral", "face_smiling", "full_body_front", "full_body_side"];
    const orderedReferencePhotos = [
      ...trustedReferencePhotos.filter((photo) => identityTypes.includes(photo.type)),
      ...trustedReferencePhotos.filter((photo) => !identityTypes.includes(photo.type))
    ];
    const referenceImageUrls: string[] = [];
    if (realProvider) {
      for (const photo of orderedReferencePhotos) {
        const signedUrl = await signedReferenceUrl({ admin, photo });
        if (signedUrl) referenceImageUrls.push(signedUrl);
      }
      if (referenceImageUrls.length === 0) {
        return NextResponse.json({ error: "Nao foi possivel preparar as fotos de identidade para geracao real." }, { status: 400 });
      }
    }

    const pendingModel = providerName === "gemini"
      ? process.env.GEMINI_IMAGE_MODEL || "gemini-3.1-flash-image"
      : realProvider ? "black-forest-labs/flux-kontext-pro" : "mock-v1";

    const { data: pendingLog, error: pendingLogError } = await admin
      .from("generation_logs")
      .insert({
        user_id: user.id,
        shoot_id: trustedShoot.id,
        provider: providerName,
        model: pendingModel,
        request_payload: {
          image_count: trustedShoot.quantity,
          quantity: trustedShoot.quantity,
          shoot_id: trustedShoot.id,
          provider: providerName,
          model: pendingModel,
          credits_charged_on_success: creditsCharged,
          composition_goal: compositionGoal,
          aspect_ratio: aspectRatio,
          primary_identity_photo_id: primaryReference?.id ?? null,
          reference_photo_ids: trustedReferencePhotos.map((photo) => photo.id),
          rejected_photo_ids: photoQuality.rejected.map((photo) => photo.id),
          warning_photo_ids: photoQuality.warning.map((photo) => photo.id),
          quality_summary: photoQuality.summary
        },
        status: "pending",
        credits_charged: 0,
        cost_estimate: providerName === "replicate_flux" ? trustedShoot.quantity * 0.04 : 0
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

    let result: Awaited<ReturnType<typeof generateImagesWithProvider>>;
    try {
      result = await generateImagesWithProvider({
        shoot: trustedShoot,
        client: trustedClient,
        referencePhotos: trustedReferencePhotos,
        referenceImageUrls,
        credits,
        providerName,
        isAdmin,
        creditCost: creditsCharged,
        qualityLog: photoQuality.summary,
        primaryIdentityPhotoId: primaryReference?.id ?? null,
        referencePhotoIds: trustedReferencePhotos.map((photo) => photo.id),
        rejectedPhotoIds: photoQuality.rejected.map((photo) => photo.id),
        warningPhotoIds: photoQuality.warning.map((photo) => photo.id)
      });
    } catch (error) {
      logGenerationError({ userId: user.id, provider: providerName, model: pendingModel, status: "provider_failed", error });
      throw error;
    }

    const storedImages = realProvider
      ? await persistGeneratedImagesToStorage({
          admin,
          userId: user.id,
          clientId: trustedClient.id,
          shootId: trustedShoot.id,
          images: result.images
        })
      : result.images;

    const { error: debitError } = await admin
      .from("credits")
      .update({
        balance: nextBalance,
        total_used: credits.total_used + creditsCharged,
        updated_at: now
      })
      .eq("user_id", user.id);

    if (debitError) {
      logSupabaseError("Supabase error", debitError);
      await admin.from("generation_logs").update({ status: "failed", error_message: debitError.message }).eq("id", generationLogId);
      await admin.from("shoots").update({ status: "failed", updated_at: now }).eq("id", trustedShoot.id).eq("user_id", user.id);
      return NextResponse.json({ error: "Nao foi possivel descontar creditos apos a geracao." }, { status: 400 });
    }

    debited = true;
    refundContext = { userId: user.id, shootId: trustedShoot.id, title: trustedShoot.title, creditsCharged, previousBalance: credits.balance, previousTotalUsed: credits.total_used };

    const { error: usageTxError } = await admin.from("credit_transactions").insert({
      user_id: user.id,
      type: "usage",
      amount: -creditsCharged,
      balance_before: credits.balance,
      balance_after: nextBalance,
      description: `Geracao do ensaio ${trustedShoot.title}`,
      related_shoot_id: trustedShoot.id
    });

    if (usageTxError) {
      throw usageTxError;
    }

    const imageRowsWithAudit = storedImages.map((image) => ({
        user_id: user.id,
        client_id: image.client_id,
        shoot_id: image.shoot_id,
        file_url: image.file_url,
        output_url: image.file_url,
        prompt_used: image.prompt_used,
        provider: image.provider,
        model: image.model,
        status: image.status,
        credits_used: creditsCharged,
        error_message: null,
        width: image.width,
        height: image.height,
        seed: image.seed,
        cost_estimate: image.cost_estimate,
        is_favorite: false
      }));

    let { error: imagesError } = await admin.from("generated_images").insert(imageRowsWithAudit);

    if (imagesError?.message?.includes("output_url") || imagesError?.message?.includes("credits_used") || imagesError?.message?.includes("error_message")) {
      const legacyRows = imageRowsWithAudit.map(({ output_url, credits_used, error_message, ...row }) => row);
      const fallback = await admin.from("generated_images").insert(legacyRows);
      imagesError = fallback.error;
    }

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
        credits_used: creditsCharged,
        updated_at: now
      })
      .eq("id", trustedShoot.id)
      .eq("user_id", user.id);

    if (shootUpdateError) {
      throw shootUpdateError;
    }

    return NextResponse.json({ ...result, images: storedImages });
  } catch (error) {
    if (isGeminiFriendlyError(error)) {
      logGenerationError({ userId: refundContext?.userId, provider: "gemini", model: process.env.GEMINI_IMAGE_MODEL || "gemini-3.1-flash-image", status: "failed", error });
    } else {
      logSupabaseError("Supabase error", error);
    }
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
        amount: refundContext.creditsCharged,
        balance_before: refundContext.previousBalance - refundContext.creditsCharged,
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
    const safeMessage = isGeminiFriendlyError(error) ? friendlyGeminiError : message.includes("Creditos") || message.includes("autorizacao") ? message : "Nao foi possivel gerar as imagens agora. Tente novamente ou fale com o suporte.";
    return NextResponse.json({ error: safeMessage }, { status: 400 });
  }
}
