import type { GeneratedImage, ReferencePhoto, Shoot } from "@/lib/types";

export type ImageProviderInput = {
  userId: string;
  clientId: string;
  shootId: string;
  shoot: Shoot;
  prompt: string;
  negativePrompt: string;
  referencePhotos: ReferencePhoto[];
  referenceImages: string[];
  imageCount: number;
  aspectRatio: "match_input_image" | "1:1" | "16:9" | "9:16" | "4:3" | "3:4";
  metadata: Record<string, unknown>;
};

export type ImageProviderResult = {
  images: GeneratedImage[];
  provider: string;
  model: string;
  rawResponse?: unknown;
  costEstimate: number;
};

export interface ImageProvider {
  name: string;
  generate(input: ImageProviderInput): Promise<ImageProviderResult>;
}
