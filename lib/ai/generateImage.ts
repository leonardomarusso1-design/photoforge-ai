import { buildPremiumPrompt, defaultNegativePrompt } from "@/lib/ai/buildPremiumPrompt";
import { creditsPerImageForProvider, imageQuantityError, isRealProvider, isValidImageQuantity, normalizeProviderName } from "@/lib/ai/providerRules";
import { mockProvider } from "@/lib/ai/providers/mockProvider";
import { replicateFluxProvider } from "@/lib/ai/providers/replicateFluxProvider";
import type { ImageProvider } from "@/lib/ai/providers/base";
import type { Client, CreditState, GenerationLog, ReferencePhoto, Shoot } from "@/lib/types";
export { creditsPerImageForProvider, isRealProvider, normalizeProviderName };

function selectProvider(providerName: string): ImageProvider {
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
  const prompt = buildPremiumPrompt(args.shoot, args.client, args.referencePhotos);
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
    aspectRatio: "match_input_image",
    metadata: {
      clientName: args.client.name,
      category: args.shoot.category,
      provider: provider.name
    }
  });
  const log: GenerationLog = {
    id: `log-${Date.now()}`,
    user_id: args.shoot.user_id,
    shoot_id: args.shoot.id,
    provider: result.provider,
    model: result.model,
    request_payload: { image_count: args.shoot.quantity, quantity: args.shoot.quantity, credits_charged: creditCost, prompt, negativePrompt, provider: provider.name, model: result.model },
    response_payload: { images: result.images.length, raw: result.rawResponse },
    status: "success",
    credits_charged: creditCost,
    cost_estimate: result.costEstimate,
    created_at: new Date().toISOString()
  };
  return { prompt, negativePrompt, images: result.images, log };
}
