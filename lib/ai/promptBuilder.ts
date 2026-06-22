import type { Client, ReferencePhoto, Shoot } from "@/lib/types";

export const baseIdentityPrompt = `Uploaded photos are identity photos only. Preserve the real face, facial structure, natural facial asymmetry, body proportions, skin texture, skin tone, hair color, hair length, hairstyle, eyes, nose, mouth, arms, legs and natural features. Do not change the client's identity. Do not change the body shape. Do not change the hair. Do not make the client younger. Do not beautify too much. Do not create a model face. Make the final result look like a real photo taken by a human with a modern smartphone, similar to an iPhone 15 photo, not an AI image. Keep natural imperfections, realistic skin texture, normal human proportions, real shadows and believable lighting.`;

export const over50Prompt = `The client is over 50 years old. Keep the real age visible. Do not rejuvenate. Keep arms, legs, skin texture and body proportions realistic for the client's age.`;

export const subtypePrompts: Record<string, string> = {
  "aniversario|luxo": "Create a realistic luxury birthday photoshoot in an elegant studio or premium indoor venue. Decor: golden balloons, floral arrangements, champagne, candles, velvet or silk textures. Lighting: soft studio key light with warm fill. Mood: sophisticated celebration. Camera look: editorial DSLR portrait, shallow depth of field, rich colors.",
  "aniversario|baloes": "Create a realistic birthday photoshoot with colorful balloons as main prop. Setting: clean studio background or bright outdoor space. Balloons: mixed colors, floating naturally. Mood: joyful celebration. Lighting: bright, airy, natural. Camera: lifestyle shot showing balloons and subject together.",
  "aniversario|bolo": "Create a realistic birthday photoshoot featuring a beautiful decorated cake as main element. Setting: table setup, warm ambient light, candles lit on cake. Pose: natural interaction with cake. Mood: genuine celebration moment. Camera: lifestyle close-medium shot.",
  "casual|urbano": "Create a realistic casual lifestyle photo in an urban environment: tree-lined street, modern cafe exterior, or urban park. Natural daylight or golden hour. Outfit: everyday casual. Pose: relaxed, spontaneous. Camera: candid lifestyle shot, natural colors.",
  "casual|praia": "Create a realistic casual beach lifestyle photo. Setting: open beach, golden hour light, soft waves. Mood: relaxed, authentic. Wind in hair, bare feet on sand. Camera: wide lifestyle shot showing beach environment clearly.",
  "casual|cafe": "Create a realistic lifestyle photo in a cozy coffee shop. Setting: wooden tables, warm ambient light, coffee cup in frame. Mood: relaxed, content. Camera: medium lifestyle shot, bokeh background.",
  "praia|lifestyle": "Create a realistic wide beach lifestyle photo. Setting: full beach scene, ocean waves visible, open sky. Natural sunlight. Pose: natural movement or standing. Camera: wide shot showing full body and beach environment.",
  "praia|editorial": "Create a realistic editorial beach photo. Setting: beach at golden hour or sunset, dramatic sky. Composition: editorial framing, strong visual identity. Lighting: warm directional natural light. Camera: editorial DSLR, rich tones.",
  "profissional/empresa|perfil": "Create a realistic professional headshot or portrait. Setting: neutral background (grey, white, dark) or modern office environment. Lighting: soft studio or window light. Expression: confident, approachable. Camera: tight portrait or medium shot.",
  "profissional/empresa|linkedin": "Create a realistic LinkedIn-style professional photo. Setting: clean neutral background or modern interior. Expression: friendly and professional. Attire: business casual or formal. Camera: natural portrait, clean composition.",
  "casal|editorial": "Create a realistic editorial couple photo. Setting: beautiful location (urban, nature or studio). Natural interaction between couple. Mood: romantic but not exaggerated. Lighting: natural or soft studio. Camera: lifestyle editorial composition.",
  "gestante|elegante": "Create a realistic elegant maternity photo. Setting: soft neutral studio or natural outdoor space. Lighting: soft directional light highlighting the bump. Styling: flowing dress or elegant outfit. Mood: emotional, beautiful, respectful. Camera: medium or full body shot.",
  "infantil/bebe|estudio": "Create a realistic studio baby or child photo. Setting: clean studio with soft props, pastel colors, safe environment. Lighting: soft diffused studio light. Expression: genuine, natural. Camera: medium shot, shallow depth of field.",
  "fitness|academia": "Create a realistic fitness gym photo. Setting: modern gym interior, equipment visible in background. Lighting: athletic dramatic lighting. Pose: strong, confident athletic pose. Camera: medium to full body shot showing physique and environment.",
  "personalizado|referencia": "Create a realistic professional photoshoot that recreates the scene, pose, outfit and lighting from the provided reference image. Use the reference only for visual direction. Preserve 100% of the client's real identity.",
  "personalizado|avancado": "Create a realistic professional photoshoot based on the written description provided. Follow all specified details for scene, outfit, pose and expression."
};

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
  sceneOverride?: string;
}) {
  return [
    baseIdentityPrompt,
    args.age && args.age >= 50 ? over50Prompt : "",
    `Shoot type: ${args.shootType}. ${args.sceneOverride ?? templateForShootType(args.shootType)}`,
    args.styleType ? `Style direction: ${args.styleType}. Keep the style photographic and realistic, never illustrative or synthetic.` : "",
    `Input usage: ${args.identityImages.length} uploaded client identity image(s) are provided. Use all of them together to preserve the same real person consistently.`,
    args.referenceImage ? "A separate optional reference image is provided. Use it only for pose, outfit, scene, framing, lighting and composition. Do not copy the reference person's face, body, age or hair." : "No optional visual reference image is provided. Use the selected template and written fields for pose, outfit, scene, lighting and composition.",
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

  const subtypeKey = shoot.subtype
    ? `${normalizePromptKey(shoot.category)}|${normalizePromptKey(shoot.subtype)}`
    : "";
  const sceneOverride = (subtypeKey && subtypePrompts[subtypeKey]) || undefined;

  return [
    buildGeminiImagePrompt({
      identityImages: referencePhotos.filter((photo) => ["face_neutral", "face_smiling", "full_body_front", "full_body_side"].includes(photo.type)),
      referenceImage: referencePhotos.find((photo) => !["face_neutral", "face_smiling", "full_body_front", "full_body_side"].includes(photo.type)),
      shootType: shoot.category,
      styleType: styleDetails || shoot.category,
      age: client.age,
      extraInstructions: shoot.free_notes,
      sceneOverride
    }),
    "Before generating, mentally describe the exact person in the reference photos: their specific face shape, exact skin tone, exact hair color and style, exact body proportions, exact weight and build. Generate THAT specific person, not a similar one.",
    shoot.recreate_reference_mode
      ? "RECREATE MODE ACTIVE: A visual reference photo has been provided showing a scene, pose, outfit and environment. Your job is to place THIS SPECIFIC CLIENT — the person in the identity reference photos — into that scene. The reference scene is a LOCATION and STYLE guide only. The face, body, hair, skin tone, weight, age and all physical features must come EXCLUSIVELY from the identity photos, not from the reference scene. If the reference shows a different person, IGNORE that person's appearance completely."
      : "",
    shoot.recreate_reference_mode
      ? "Physical anchoring: The client has the following characteristics extracted from their identity photos — preserve ALL of these exactly:\n- Face: exact facial structure, real asymmetry, natural skin texture\n- Hair: exact color, volume, length, style and hairline\n- Body: exact weight, build, proportions and posture\n- Skin: exact tone, pores, marks and natural imperfections\n- Age: exact apparent age, do not make younger or older\nThese are non-negotiable. The scene changes, the person never does."
      : "",
    shoot.recreate_reference_mode
      ? "Special recreate-reference mode is active. The client wants a result similar to the optional reference. Use the optional reference only for selected visual direction such as pose, outfit, scene, lighting and composition. Never copy the reference person's face, body, age, hair, identity or proportions. Preserve the real client completely, including real age, real body, real hair and real skin texture. Keep the final image like a real iPhone 15 photo."
      : "",
    shoot.recreate_options ? `Selected recreate options: ${Object.entries(shoot.recreate_options).filter(([, enabled]) => enabled).map(([key]) => key).join(", ") || "none"}.` : "",
    optionalReferenceSummary(referencePhotos),
    "CRITICAL IDENTITY REMINDER: The person in this image MUST be the exact same person from the reference photos. Same face. Same skin tone. Same hair. Same body. Same weight. Same proportions. If you are about to generate a different person, STOP and start over with the correct identity.",
    shoot.recreate_reference_mode
      ? "CRITICAL RECREATE REMINDER: You are placing a REAL specific person into a new scene. This is NOT a creative interpretation. The person's appearance is fixed and non-negotiable. If the output shows someone who looks different from the identity photos — different face structure, slimmer, heavier, younger, older, different hair — it is WRONG. Generate again with strict identity adherence."
      : "",
    shoot.recreate_reference_mode
      ? "Negative: different person, wrong person, different face, changed face structure, different skin tone, lighter skin, darker skin, different ethnicity, different body weight, thinner body, heavier body, different hair color, different eye color, model-perfect face, idealized face, copying reference person's face, using reference person's body, merging reference person's features with client's features, blending two people's appearances, composite face, hybrid identity."
      : "Negative: different person, wrong person, different face, changed face structure, different skin tone, lighter skin, darker skin, different ethnicity, different body weight, thinner body, heavier body, different hair color, different eye color, model-perfect face, idealized face."
  ].filter(Boolean).join("\n\n");
}
