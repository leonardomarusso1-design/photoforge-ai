import type { ImageProvider } from "@/lib/ai/providers/base";

export const fluxProvider: ImageProvider = {
  name: "flux",
  async generate() {
    throw new Error("FLUX provider is prepared but not configured. Set FLUX_API_KEY and implement the request mapping.");
  }
};
