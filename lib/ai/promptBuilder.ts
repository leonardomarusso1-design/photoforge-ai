import type { Client, ReferencePhoto, Shoot } from "@/lib/types";

export const baseIdentityPrompt = `Use the uploaded client photos only as identity reference. Preserve the real face, facial structure, natural facial asymmetry, body proportions, skin texture, skin tone, hair color, hair length, hairstyle, eyes, nose, mouth, arms, legs and natural features. Do not change the client's identity. Do not change the body shape. Do not change the hair. Do not make the client younger. Do not beautify too much. Do not create a model face. Make the final result look like a real photo taken by a human with a modern smartphone, similar to an iPhone 15 photo, not an AI image. Keep natural imperfections, realistic skin texture, normal human proportions, real shadows and believable lighting. If a reference image is provided, use it only for pose, outfit, scene, lighting and composition. Do not copy the reference person's face, body, age or hair.`;

export const over50Prompt = `The client is over 50 years old. Keep the real age visible. Do not rejuvenate. Keep arms, legs, skin texture and body proportions realistic for the client's age.`;

export const shootTemplates: Record<string, string> = {
  aniversario: "Create a realistic birthday photoshoot with tasteful celebration elements, premium but natural decoration, believable indoor or outdoor lighting, and an authentic celebratory mood.",
  casual: "Create a realistic casual lifestyle photo with relaxed styling, natural posture, modern everyday environment, and candid human energy.",
  profissional: "Create a realistic professional portrait or business lifestyle photo with confident posture, clean premium environment, trustworthy expression, and polished natural lighting.",
  casal: "Create a realistic couple photoshoot with natural chemistry, respectful body interaction, believable hand placement, authentic expressions, and romantic but not exaggerated composition.",
  praia: "Create a realistic beach lifestyle photo with natural sunlight, ocean and sand visible, believable wind, realistic shadows, and warm but natural skin tones."
};

function normalizeText(value?: string | null) {
  return value?.trim().replace(/\s+/g, " ") ?? "";
}

export function normalizePromptKey(value?: string | null) {
  return normalizeText(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function templateForShootType(shootType: string) {
  const key = normalizePromptKey(shootType);
  if (key.includes("anivers")) return shootTemplates.aniversario;
  if (key.includes("casual")) return shootTemplates.casual;
  if (key.includes("profissional") || key.includes("empresa") || key.includes("business")) return shootTemplates.profissional;
  if (key.includes("casal")) return shootTemplates.casal;
  if (key.includes("praia") || key.includes("beach")) return shootTemplates.praia;
  return "Create a realistic personalized photoshoot with believable styling, natural composition, and high fidelity identity preservation.";
}

function optionalReferenceSummary(referencePhotos: ReferencePhoto[]) {
  const referenceCount = referencePhotos.filter((photo) => !["face_neutral", "face_smiling", "full_body_front", "full_body_side"].includes(photo.type)).length;
  if (referenceCount === 0) return "";
  return `Additional reference images provided: ${referenceCount}. Use them only for pose, outfit, scene, framing, lighting and composition. Never copy the face, body, age, hair or identity from any reference person.`;
}

export function buildGeminiImagePrompt(args: {
  identityImages: unknown[];
  referenceImage?: unknown;
  shootType: string;
  styleType: string;
  age?: number | null;
  extraInstructions?: string | null;
}) {
  return [
    baseIdentityPrompt,
    args.age && args.age >= 50 ? over50Prompt : "",
    `Shoot type: ${args.shootType}. ${templateForShootType(args.shootType)}`,
    args.styleType ? `Style direction: ${args.styleType}. Keep the style photographic and realistic, never illustrative or synthetic.` : "",
    `Input usage: ${args.identityImages.length} uploaded client identity image(s) are provided. Use all of them together to preserve the same real person consistently.`,
    args.referenceImage ? "A separate reference image is provided. Use it only for pose, outfit, scene, framing, lighting and composition. Do not copy the reference person's face, body, age or hair." : "",
    args.extraInstructions ? `Extra instructions from the shoot brief: ${args.extraInstructions}` : "",
    "Output: one final realistic photo, no text, no watermark, no logo, no collage, no before/after layout."
  ].filter(Boolean).join("\n\n");
}

export function buildGeminiPromptFromShoot(shoot: Shoot, client: Client, referencePhotos: ReferencePhoto[]) {
  const styleDetails = [
    shoot.photo_style,
    shoot.location && `Location/scenario: ${shoot.location}`,
    shoot.mood && `Mood: ${shoot.mood}`,
    shoot.lighting && `Lighting: ${shoot.lighting}`,
    shoot.pose && `Pose: ${shoot.pose}`,
    shoot.expression && `Expression: ${shoot.expression}`,
    shoot.outfit && `Outfit: ${shoot.outfit}`,
    shoot.outfit_color && `Outfit colors: ${shoot.outfit_color}`,
    shoot.shoes && `Shoes: ${shoot.shoes}`,
    shoot.accessories && `Accessories: ${shoot.accessories}`,
    shoot.hair && `Hair styling request: ${shoot.hair}`,
    shoot.makeup && `Makeup: ${shoot.makeup}`
  ].filter(Boolean).join(". ");

  return [
    buildGeminiImagePrompt({
      identityImages: referencePhotos.filter((photo) => ["face_neutral", "face_smiling", "full_body_front", "full_body_side"].includes(photo.type)),
      referenceImage: referencePhotos.find((photo) => !["face_neutral", "face_smiling", "full_body_front", "full_body_side"].includes(photo.type)),
      shootType: shoot.category,
      styleType: styleDetails || shoot.category,
      age: client.age,
      extraInstructions: shoot.free_notes
    }),
    shoot.recreate_reference_mode
      ? "Special recreate-reference mode is active. The client wants a result similar to the optional reference. Use the optional reference only for selected visual direction such as pose, outfit, scene, lighting and composition. Never copy the reference person's face, body, age, hair, identity or proportions. Preserve the real client completely, including real age, real body, real hair and real skin texture. Keep the final image like a real iPhone 15 photo."
      : "",
    shoot.recreate_options ? `Selected recreate options: ${Object.entries(shoot.recreate_options).filter(([, enabled]) => enabled).map(([key]) => key).join(", ") || "none"}.` : "",
    optionalReferenceSummary(referencePhotos)
  ].filter(Boolean).join("\n\n");
}
