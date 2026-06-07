import { buildPremiumPrompt, defaultNegativePrompt } from "@/lib/ai/buildPremiumPrompt";
import { mockProvider } from "@/lib/ai/providers/mockProvider";
import type { Client, CreditState, GenerationLog, ReferencePhoto, Shoot } from "@/lib/types";

export async function generateImagesWithProvider(args: {
  shoot: Shoot;
  client: Client;
  referencePhotos: ReferencePhoto[];
  credits: CreditState;
}) {
  if (!args.shoot.consent_confirmed) {
    throw new Error("Confirme que voce tem autorizacao de uso da imagem antes de gerar.");
  }
  if (args.credits.balance < args.shoot.quantity) {
    throw new Error("Creditos insuficientes.");
  }
  const prompt = buildPremiumPrompt(args.shoot, args.client, args.referencePhotos);
  const negativePrompt = defaultNegativePrompt;
  const provider = mockProvider;
  const result = await provider.generate({ shoot: args.shoot, prompt, negativePrompt, referencePhotos: args.referencePhotos });
  const log: GenerationLog = {
    id: `log-${Date.now()}`,
    user_id: args.shoot.user_id,
    shoot_id: args.shoot.id,
    provider: provider.name,
    model: result.model,
    request_payload: { quantity: args.shoot.quantity, prompt, negativePrompt },
    response_payload: { images: result.images.length },
    status: "success",
    credits_charged: args.shoot.quantity,
    cost_estimate: result.costEstimate,
    created_at: new Date().toISOString()
  };
  return { prompt, negativePrompt, images: result.images, log };
}
