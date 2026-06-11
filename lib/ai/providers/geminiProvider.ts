import { GoogleGenAI } from "@google/genai";
import type { GeneratedImage } from "@/lib/types";
import type { ImageProvider } from "@/lib/ai/providers/base";

type GeminiResponsePart = {
  text?: string;
  inlineData?: {
    mimeType?: string;
    data?: string;
  };
};

export const geminiProvider: ImageProvider = {
  name: "gemini",
  async generate(input) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured.");
    }
    if (input.referenceImages.length === 0) {
      throw new Error("Gemini requires at least one uploaded identity image.");
    }

    const model = process.env.GEMINI_IMAGE_MODEL || "gemini-3.1-flash-image";
    const ai = new GoogleGenAI({ apiKey });
    const now = new Date().toISOString();
    const images: GeneratedImage[] = [];
    const rawResponses: unknown[] = [];

    for (let index = 0; index < input.imageCount; index += 1) {
      const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [{ text: input.prompt }];

      for (const [imageIndex, imageUrl] of input.referenceImages.entries()) {
        const image = await fetchImageAsInlineData(imageUrl);
        parts.push({
          text: imageIndex < 4
            ? `Identity reference ${imageIndex + 1}: preserve this same client's real face, body, hair, skin tone, age and proportions.`
            : `Optional visual reference ${imageIndex - 3}: use only for pose, outfit, scene, lighting, framing or composition. Do not copy this person's identity.`
        });
        parts.push({ inlineData: image });
      }

      const response = await ai.models.generateContent({
        model,
        contents: parts
      });

      const responseParts = (response.candidates?.[0]?.content?.parts ?? []) as GeminiResponsePart[];
      const imagePart = responseParts.find((part) => part.inlineData?.data);
      if (!imagePart || !("inlineData" in imagePart) || !imagePart.inlineData?.data) {
        throw new Error("Gemini did not return an image.");
      }

      images.push({
        id: `gemini-${Date.now()}-${index}`,
        user_id: input.userId,
        client_id: input.clientId,
        shoot_id: input.shootId,
        file_url: `data:${imagePart.inlineData.mimeType || "image/png"};base64,${imagePart.inlineData.data}`,
        prompt_used: input.prompt,
        provider: "gemini",
        model,
        status: "completed",
        width: 1024,
        height: 1024,
        seed: 0,
        cost_estimate: 0,
        is_favorite: false,
        created_at: now
      });
      rawResponses.push({
        candidateCount: response.candidates?.length ?? 0,
        text: responseParts.filter((part) => part.text).map((part) => part.text).join("\n") || null
      });
    }

    return {
      images,
      provider: "gemini",
      model,
      rawResponse: rawResponses,
      costEstimate: 0
    };
  }
};

function parseDataUrl(value: string) {
  const match = value.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  return { mimeType: match[1], data: match[2] };
}

async function fetchImageAsInlineData(imageUrl: string) {
  const dataUrl = parseDataUrl(imageUrl);
  if (dataUrl) return dataUrl;

  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Could not load reference image for Gemini: ${response.status}`);
  }
  const contentType = response.headers.get("content-type") || "image/jpeg";
  if (!contentType.startsWith("image/")) {
    throw new Error("Reference file is not an image.");
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  return {
    mimeType: contentType,
    data: buffer.toString("base64")
  };
}
