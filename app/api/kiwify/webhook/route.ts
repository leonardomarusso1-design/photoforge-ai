import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { resolvePlan } from "@/lib/kiwify/plans";
import { sendWelcomeEmail } from "@/lib/email/resend";

function logSupabaseError(context: string, error: unknown) {
  if (!error) return;
  const err = error as { message?: string; details?: string; hint?: string; code?: string };
  console.error(context, { message: err.message, details: err.details, hint: err.hint, code: err.code, full: error });
}

type KiwifyWebhookBody = {
  order_id: string;
  webhook_event_type: string;
  order_status: string;
  Product: { product_name: string; product_id: string };
  Customer: { email: string; full_name: string };
};

export async function POST(request: Request) {
  try {
    const secret = request.headers.get("x-access-secret");
    if (!secret || secret !== process.env.KIWIFY_WEBHOOK_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as KiwifyWebhookBody;
    const { order_id, webhook_event_type, order_status, Product, Customer } = body;

    const isApproved =
      (webhook_event_type === "order_approved" || webhook_event_type === "order_paid") &&
      order_status === "paid";

    if (!isApproved) {
      return NextResponse.json({ ok: true, skipped: "not_paid" });
    }

    const admin = createSupabaseAdminClient();

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("user_id")
      .eq("email", Customer.email)
      .maybeSingle();

    if (profileError) {
      logSupabaseError("Kiwify webhook profile lookup", profileError);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    if (!profile) {
      console.log("Kiwify webhook: user not found", { email: Customer.email, order_id });
      return NextResponse.json({ ok: true, skipped: "user_not_found" });
    }

    const userId = profile.user_id;

    const { data: existing, error: idempotencyError } = await admin
      .from("credit_transactions")
      .select("id")
      .eq("user_id", userId)
      .eq("type", "purchase")
      .ilike("description", `%${order_id}%`)
      .maybeSingle();

    if (idempotencyError) {
      logSupabaseError("Kiwify webhook idempotency check", idempotencyError);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    if (existing) {
      return NextResponse.json({ ok: true, skipped: "already_processed" });
    }

    const plan = resolvePlan(Product.product_name, Product.product_id);
    if (!plan) {
      console.log("Kiwify webhook: plan not mapped", { product_name: Product.product_name, product_id: Product.product_id, order_id });
      return NextResponse.json({ ok: true, skipped: "plan_not_mapped" });
    }

    const { data: creditsRow, error: creditsReadError } = await admin
      .from("credits")
      .select("balance, total_purchased, total_used")
      .eq("user_id", userId)
      .maybeSingle();

    if (creditsReadError) {
      logSupabaseError("Kiwify webhook credits read", creditsReadError);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    const now = new Date().toISOString();
    const balanceBefore = creditsRow?.balance ?? 0;
    const totalPurchasedBefore = creditsRow?.total_purchased ?? 0;
    const totalUsed = creditsRow?.total_used ?? 0;
    const balanceAfter = balanceBefore + plan.credits;
    const description = `Compra Kiwify ${plan.name} order:${order_id}`;

    if (creditsRow) {
      const { error: updateError } = await admin
        .from("credits")
        .update({ balance: balanceAfter, total_purchased: totalPurchasedBefore + plan.credits, updated_at: now })
        .eq("user_id", userId);

      if (updateError) {
        logSupabaseError("Kiwify webhook credits update", updateError);
        return NextResponse.json({ error: "Database error" }, { status: 500 });
      }
    } else {
      const { error: insertError } = await admin
        .from("credits")
        .insert({ user_id: userId, balance: plan.credits, total_purchased: plan.credits, total_used: 0, updated_at: now });

      if (insertError) {
        logSupabaseError("Kiwify webhook credits insert", insertError);
        return NextResponse.json({ error: "Database error" }, { status: 500 });
      }
    }

    const { error: txError } = await admin.from("credit_transactions").insert({
      user_id: userId,
      type: "purchase",
      amount: plan.credits,
      balance_before: balanceBefore,
      balance_after: balanceAfter,
      description
    });

    if (txError) {
      logSupabaseError("Kiwify webhook transaction insert", txError);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    try {
      await sendWelcomeEmail({
        to: Customer.email,
        name: Customer.full_name || Customer.email,
        planName: plan.name,
        isSubscription: plan.isSubscription,
        credits: plan.credits
      });
    } catch (emailError) {
      console.error("Kiwify webhook: email failed (credit already applied)", { order_id, error: emailError });
    }

    return NextResponse.json({ ok: true, credited: plan.credits });
  } catch (error) {
    logSupabaseError("Kiwify webhook unexpected error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
