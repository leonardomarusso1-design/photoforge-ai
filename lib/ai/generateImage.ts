import { buildCompositionGoal, buildPremiumPrompt, defaultNegativePrompt } from "@/lib/ai/buildPremiumPrompt";
import { buildGeminiPromptFromShoot } from "@/lib/ai/promptBuilder";
import { creditsPerImageForProvider, imageQuantityError, isRealProvider, isValidImageQuantity, normalizeProviderName } from "@/lib/ai/providerRules";
import { geminiProvider } from "@/lib/ai/providers/geminiProvider";
import { geminiProProvider } from "@/lib/ai/providers/geminiProProvider";
import { mockProvider } from "@/lib/ai/providers/mockProvider";
import { replicateFluxProvider } from "@/lib/ai/providers/replicateFluxProvider";
import type { ImageProvider } from "@/lib/ai/providers/base";
import type { Client, CreditState, GenerationLog, ReferencePhoto, Shoot } from "@/lib/types";
export { creditsPerImageForProvider, isRealProvider, normalizeProviderName };

function selectProvider(providerName: string): ImageProvider {
  if (normalizeProviderName(providerName) === "gemini") return geminiProvider;
  if (normalizeProviderName(providerName) === "gemini_pro") return geminiProProvider;
  if (normalizeProviderName(providerName) === "replicate_flux") return replicateFluxProvider;
  return mockProvider;
}

export async function generateImagesWithProvider(args: {
  shoot: Shoot;
  client: Client;
  referencePhotos: ReferencePhoto[];
  referenceImageUrls?: string[];
  credits: CreditState;
  providerName?: string;
  isAdmin?: boolean;
  creditCost?: number;
  qualityLog?: unknown;
  primaryIdentityPhotoId?: string | null;
  referencePhotoIds?: string[];
  rejectedPhotoIds?: string[];
  warningPhotoIds?: string[];
}) {
  if (!args.shoot.consent_confirmed) {
    throw new Error("Confirme que voce tem autorizacao de uso da imagem antes de gerar.");
  }
  const providerName = normalizeProviderName(args.providerName ?? args.shoot.provider);
  const realProvider = isRealProvider(providerName);
  const creditCost = args.creditCost ?? args.shoot.quantity * creditsPerImageForProvider(providerName);

  if (realProvider) {
    if (!args.isAdmin || process.env.ALLOW_REAL_AI_FOR_ADMIN !== "true") {
      throw new Error("Provider real disponivel apenas para teste admin.");
    }
  }

  if (!isValidImageQuantity(providerName, args.shoot.quantity)) {
    throw new Error(imageQuantityError(providerName));
  }

  if (args.credits.balance < creditCost) {
    throw new Error("Creditos insuficientes.");
  }
  const prompt = (providerName === "gemini" || providerName === "gemini_pro")
    ? buildGeminiPromptFromShoot(args.shoot, args.client, args.referencePhotos)
    : buildPremiumPrompt(args.shoot, args.client, args.referencePhotos);
  const compositionGoal = buildCompositionGoal(args.shoot);
  const aspectRatio = compositionGoal.includes("medium-wide") || compositionGoal.includes("full-body") ? "4:3" : "3:4";
  const negativePrompt = defaultNegativePrompt;
  const provider = selectProvider(providerName);
  const result = await provider.generate({
    userId: args.shoot.user_id,
    clientId: args.shoot.client_id,
    shootId: args.shoot.id,
    shoot: args.shoot,
    prompt,
    negativePrompt,
    referencePhotos: args.referencePhotos,
    referenceImages: args.referenceImageUrls ?? [],
    imageCount: args.shoot.quantity,
    aspectRatio,
    metadata: {
      clientName: args.client.name,
      category: args.shoot.category,
      provider: provider.name,
      composition_goal: compositionGoal,
      aspect_ratio: aspectRatio
    }
  });
  const log: GenerationLog = {
    id: `log-${Date.now()}`,
    user_id: args.shoot.user_id,
    shoot_id: args.shoot.id,
    provider: result.provider,
    model: result.model,
    request_payload: {
      image_count: args.shoot.quantity,
      quantity: args.shoot.quantity,
      credits_charged: creditCost,
      prompt_final: prompt,
      prompt,
      negative_prompt: negativePrompt,
      negativePrompt,
      composition_goal: compositionGoal,
      aspect_ratio: aspectRatio,
      provider: provider.name,
      model: result.model,
      primary_identity_photo_id: args.primaryIdentityPhotoId ?? null,
      reference_photo_ids: args.referencePhotoIds ?? args.referencePhotos.map((photo) => photo.id),
      rejected_photo_ids: args.rejectedPhotoIds ?? [],
      warning_photo_ids: args.warningPhotoIds ?? [],
      quality_summary: args.qualityLog ?? null
    },
    response_payload: { images: result.images.length, raw: result.rawResponse },
    status: "success",
    credits_charged: creditCost,
    cost_estimate: result.costEstimate,
    created_at: new Date().toISOString()
  };
  return { prompt, negativePrompt, images: result.images, log };
}
