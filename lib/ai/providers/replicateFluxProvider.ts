import type { GeneratedImage } from "@/lib/types";
import type { ImageProvider } from "@/lib/ai/providers/base";

const MODEL = "black-forest-labs/flux-kontext-pro";
const MODEL_API_URL = `https://api.replicate.com/v1/models/${MODEL}/predictions`;
const COST_PER_IMAGE_USD = 0.04;

function extractOutputUrl(output: unknown): string | null {
  if (typeof output === "string") return output;
  if (Array.isArray(output)) {
    const first = output[0];
    if (typeof first === "string") return first;
    if (first && typeof first === "object" && "url" in first && typeof first.url === "string") return first.url;
  }
  if (output && typeof output === "object") {
    if ("url" in output && typeof output.url === "string") return output.url;
    if ("href" in output && typeof output.href === "string") return output.href;
  }
  return null;
}

async function waitForPrediction(initialPrediction: Record<string, unknown>, token: string) {
  let prediction = initialPrediction;
  for (let attempt = 0; attempt < 18; attempt += 1) {
    if (prediction.status === "succeeded" || prediction.status === "failed" || prediction.status === "canceled") {
      return prediction;
    }

    const getUrl = (prediction.urls as { get?: string } | undefined)?.get;
    if (!getUrl) return prediction;
    await new Promise((resolve) => setTimeout(resolve, 5000));

    const response = await fetch(getUrl, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`Replicate prediction polling failed: ${response.status}`);
    }
    prediction = await response.json() as Record<string, unknown>;
  }
  return prediction;
}

async function runSingleImage(args: {
  token: string;
  prompt: string;
  inputImage: string;
  aspectRatio: string;
  seed: number;
}) {
  const response = await fetch(MODEL_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${args.token}`,
      "Content-Type": "application/json",
      Prefer: "wait=60"
    },
    body: JSON.stringify({
      input: {
        prompt: args.prompt,
        input_image: args.inputImage,
        aspect_ratio: args.aspectRatio,
        output_format: "jpg",
        safety_tolerance: 2,
        prompt_upsampling: false,
        seed: args.seed
      }
    })
  });

  const prediction = await response.json() as Record<string, unknown>;

  if (!response.ok) {
    const message = typeof prediction.detail === "string" ? prediction.detail : `Replicate request failed: ${response.status}`;
    throw new Error(message);
  }

  const completed = await waitForPrediction(prediction, args.token);
  if (completed.status !== "succeeded") {
    const error = typeof completed.error === "string" ? completed.error : "Replicate generation did not succeed.";
    throw new Error(error);
  }

  const url = extractOutputUrl(completed.output);
  if (!url) {
    throw new Error("Replicate did not return an image URL.");
  }

  return { url, prediction: completed };
}

export const replicateFluxProvider: ImageProvider = {
  name: "replicate_flux",
  async generate(input) {
    const token = process.env.REPLICATE_API_TOKEN;
    if (!token) {
      throw new Error("REPLICATE_API_TOKEN is not configured.");
    }
    const inputImage = input.referenceImages[0];
    if (!inputImage) {
      throw new Error("Replicate requires at least one signed reference image.");
    }
    if (input.imageCount > 4) {
      throw new Error("Provider real limitado a no maximo 4 imagens por geracao.");
    }

    const now = new Date().toISOString();
    const rawResponses: unknown[] = [];
    const images: GeneratedImage[] = [];

    for (let index = 0; index < input.imageCount; index += 1) {
      const seed = Math.floor(Math.random() * 999999999);
      const result = await runSingleImage({
        token,
        prompt: input.prompt,
        inputImage,
        aspectRatio: input.aspectRatio,
        seed
      });
      rawResponses.push(result.prediction);
      images.push({
        id: `replicate-${Date.now()}-${index}`,
        user_id: input.userId,
        client_id: input.clientId,
        shoot_id: input.shootId,
        file_url: result.url,
        prompt_used: input.prompt,
        provider: "replicate_flux",
        model: MODEL,
        status: "completed",
        width: 1024,
        height: 1024,
        seed,
        cost_estimate: COST_PER_IMAGE_USD,
        is_favorite: false,
        created_at: now
      });
    }

    return {
      images,
      provider: "replicate_flux",
      model: MODEL,
      rawResponse: rawResponses,
      costEstimate: input.imageCount * COST_PER_IMAGE_USD
    };
  }
};
