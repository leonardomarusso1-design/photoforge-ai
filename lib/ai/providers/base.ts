import type { GeneratedImage, ReferencePhoto, Shoot } from "@/lib/types";

export type ImageProviderInput = {
  shoot: Shoot;
  prompt: string;
  negativePrompt: string;
  referencePhotos: ReferencePhoto[];
};

export type ImageProviderResult = {
  images: GeneratedImage[];
  model: string;
  costEstimate: number;
};

export interface ImageProvider {
  name: string;
  generate(input: ImageProviderInput): Promise<ImageProviderResult>;
}
