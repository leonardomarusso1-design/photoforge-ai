import type { ImageProvider } from "@/lib/ai/providers/base";

export const openaiProvider: ImageProvider = {
  name: "openai",
  async generate() {
    throw new Error("OpenAI image provider is prepared but not configured. Set OPENAI_API_KEY and implement the request mapping.");
  }
};
