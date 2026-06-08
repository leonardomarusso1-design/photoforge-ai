import type { ImageProvider } from "@/lib/ai/providers/base";

export const mockProvider: ImageProvider = {
  name: "mock",
  async generate(input) {
    await new Promise((resolve) => setTimeout(resolve, 650));
    const now = new Date().toISOString();
    const images = Array.from({ length: input.imageCount }, (_, index) => ({
      id: `generated-${Date.now()}-${index}`,
      user_id: input.shoot.user_id,
      client_id: input.shoot.client_id,
      shoot_id: input.shoot.id,
      file_url: `/api/placeholder?seed=${encodeURIComponent(`${input.shoot.id}-${index}-${Date.now()}`)}`,
      prompt_used: input.prompt,
      provider: "mock",
      model: "mock-v1",
      status: "completed" as const,
      width: 1024,
      height: 1365,
      seed: Math.floor(Math.random() * 999999),
      cost_estimate: 1,
      is_favorite: false,
      created_at: now
    }));
    return { images, provider: "mock", model: "mock-v1", rawResponse: { images: images.length }, costEstimate: input.imageCount };
  }
};
