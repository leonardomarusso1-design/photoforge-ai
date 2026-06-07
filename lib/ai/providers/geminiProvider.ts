import type { ImageProvider } from "@/lib/ai/providers/base";

export const geminiProvider: ImageProvider = {
  name: "gemini",
  async generate() {
    throw new Error("Gemini Imagen provider is prepared but not configured. Set GEMINI_API_KEY and implement the request mapping.");
  }
};
