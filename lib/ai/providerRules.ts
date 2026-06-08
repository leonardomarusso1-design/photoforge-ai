export type GenerationQuantity = 1 | 2 | 4 | 8 | 16;

export const MOCK_IMAGE_QUANTITIES: GenerationQuantity[] = [4, 8, 16];
export const REAL_IMAGE_QUANTITIES: GenerationQuantity[] = [1, 2, 4];

export function normalizeProviderName(provider?: string) {
  if (provider === "replicate" || provider === "replicate_flux" || provider === "flux_kontext_pro") return "replicate_flux";
  return "mock";
}

export function isRealProvider(provider?: string) {
  return normalizeProviderName(provider) !== "mock";
}

export function creditsPerImageForProvider(provider?: string) {
  return isRealProvider(provider) ? 10 : 1;
}

export function quantityOptionsForProvider(provider?: string) {
  return isRealProvider(provider) ? REAL_IMAGE_QUANTITIES : MOCK_IMAGE_QUANTITIES;
}

export function isValidImageQuantity(provider: string | undefined, quantity: number) {
  return quantityOptionsForProvider(provider).includes(quantity as GenerationQuantity);
}

export function imageQuantityError(provider: string | undefined) {
  if (isRealProvider(provider)) {
    return "Provider real permite apenas 1, 2 ou 4 imagens por geracao.";
  }
  return "Mock permite apenas 4, 8 ou 16 imagens por geracao.";
}
