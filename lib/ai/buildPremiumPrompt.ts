import type { Client, ReferencePhoto, Shoot } from "@/lib/types";

const identityBlock = `Use the uploaded photos only as identity and body reference. Do not copy the clothing or background from the reference photos unless explicitly requested. Preserve the real face, facial structure, natural asymmetry, real skin texture, age, body proportions, hair, eyes, nose, mouth, lips, jawline, and all visible distinctive features of the person. Do not beautify excessively. Do not create a model-like face. Do not change ethnicity, age, weight, body shape, hairstyle, skin tone or facial expression beyond what is requested. Keep natural imperfections and realistic human details. The final image must look like a real professional photo, not AI-generated.`;

const anatomyBlock = `Maintain realistic human anatomy, natural posture, correct hands, correct fingers, correct legs, realistic shoulders, realistic feet and normal body proportions. Keep the person looking their real age. Do not make the person younger or older unless explicitly requested. Preserve the original hair color, hair volume, hairline, haircut and natural texture. Preserve natural skin texture, pores, small marks, wrinkles, moles and realistic imperfections. Avoid plastic skin, over-smoothing or beauty filter look.`;

const matureClientBlock = `The client is 50 years old or older. Do not rejuvenate. Do not slim the body. Preserve age-compatible skin texture, arms, legs, face, neck, hands, natural body proportions, natural wrinkles and real mature features. The client must still look like the same real person at the real age.`;

const subtypePrompts: Record<string, string> = {
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

const categoryPrompts: Record<string, string> = {
  Aniversario: "Create a realistic birthday photoshoot in a beautiful decorated environment, elegant balloons, premium lighting, tasteful composition, professional camera look, realistic celebration atmosphere.",
  Casal: "Create a realistic couple photoshoot with natural chemistry, elegant composition, romantic but not exaggerated mood, realistic body interaction, natural hands and authentic expressions. The man should have a calm and confident neutral expression, mouth closed, no visible teeth, no exaggerated smile, unless the user explicitly requests otherwise.",
  "Profissional/empresa": "Create a professional business portrait/photoshoot with confident posture, premium corporate environment, clean background, realistic lighting, trustworthy and high-status visual.",
  "Infantil/bebe": "Create a realistic baby or child photoshoot with soft lighting, safe environment, natural expression, delicate scenery, realistic skin texture and age-appropriate pose.",
  Fitness: "Create a realistic fitness photoshoot with athletic lighting, gym or studio environment, strong but natural posture, realistic body proportions and authentic fitness aesthetic.",
  Gestante: "Create a realistic maternity photoshoot with elegant lighting, emotional but natural atmosphere, soft styling, realistic body proportions and respectful composition.",
  Praia: "Create a realistic beach photoshoot with natural sunlight, ocean background, sand, soft wind, realistic skin tones and premium lifestyle aesthetic.",
  Luxo: "Create a realistic luxury photoshoot with premium environment, elegant styling, cinematic lighting, high-end editorial photography look.",
  Casual: "Create a realistic casual lifestyle photoshoot in a natural environment, relaxed pose, authentic expression, realistic everyday elegance."
};

export const defaultNegativePrompt = "AI-generated look, fake face, different person, changed identity, overly beautified face, plastic skin, blurred face, distorted eyes, asymmetrical eyes beyond natural features, changed nose, changed mouth, changed lips, changed jawline, wrong age, younger face, older face, wrong body, unrealistic body proportions, extra fingers, missing fingers, broken hands, distorted hands, deformed legs, extra limbs, bad anatomy, blurry, low quality, cartoon, 3D render, doll-like skin, wax skin, beauty filter, over-smoothed skin, watermark, text, logo, signature, mutated body, distorted tattoos, wrong tattoos, fake tattoos, unnatural smile, exaggerated teeth, wrong person, different face, changed face structure, different skin tone, lighter skin, darker skin, different ethnicity, different body weight, thinner body, heavier body, different hair color, different eye color, model-perfect face, idealized face.";

function normalizeText(value?: string | null) {
  return value?.trim().replace(/\s+/g, " ") ?? "";
}

function normalizeKey(value: string) {
  return normalizeText(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function significantTokens(value: string) {
  const stopWords = new Set(["e", "de", "da", "do", "com", "sem", "a", "o", "as", "os", "the", "and", "with", "of"]);
  return normalizeKey(value).split(" ").filter((token) => token.length > 2 && !stopWords.has(token));
}

function isRedundantDetail(base: string, detail: string) {
  const baseKey = normalizeKey(base);
  const detailKey = normalizeKey(detail);
  if (!baseKey || !detailKey) return false;
  if (baseKey.includes(detailKey) || detailKey.includes(baseKey)) return true;
  const baseTokens = new Set(significantTokens(base));
  const detailTokens = significantTokens(detail);
  if (detailTokens.length === 0) return false;
  const overlap = detailTokens.filter((token) => baseTokens.has(token) || [...baseTokens].some((baseToken) => baseToken.includes(token) || token.includes(baseToken))).length;
  return overlap / detailTokens.length >= 0.7;
}

function buildOutfitLine(shoot: Shoot) {
  const outfit = normalizeText(shoot.outfit);
  const color = normalizeText(shoot.outfit_color);
  if (!outfit && !color) return "";
  if (!outfit) return color;
  if (!color || isRedundantDetail(outfit, color)) return outfit;
  return `${outfit}, main colors: ${color}`;
}

export function buildCompositionGoal(shoot: Shoot) {
  const briefing = normalizeKey([
    shoot.category,
    shoot.location,
    shoot.mood,
    shoot.pose,
    shoot.photo_style,
    shoot.free_notes
  ].filter(Boolean).join(" "));
  const wantsOpenComposition = [
    "ambiente",
    "cenario",
    "praia",
    "beach",
    "mar",
    "ocean",
    "pedra",
    "rock",
    "corpo inteiro",
    "full body",
    "ensaio",
    "lifestyle"
  ].some((keyword) => briefing.includes(keyword));

  if (wantsOpenComposition) {
    return "medium-wide lifestyle shot or full-body composition; subject and surrounding environment clearly visible; avoid tight close-up portrait unless explicitly requested";
  }

  return "professional portrait/lifestyle composition with enough space to show pose, styling and body proportions; avoid overly tight face-only crop unless explicitly requested";
}

function optionalReferenceBlock(referencePhotos: ReferencePhoto[]) {
  const groups = [
    ["outfit_visual", "outfit_reference"],
    ["pose_scenario", "mood_reference"],
    ["important_detail", "tattoo_arm", "tattoo_leg", "back", "hair_detail"],
    ["extra"]
  ];
  const labels = ["outfit/visual", "pose/scenario", "important detail", "extra"];
  const descriptions = groups
    .map((types, index) => {
      const count = referencePhotos.filter((photo) => types.includes(photo.type)).length;
      return count > 0 ? `${labels[index]} reference provided (${count}).` : "";
    })
    .filter(Boolean);
  return descriptions.length > 0 ? descriptions.join(" ") : "";
}

function isMatureClient(client: Client, shoot: Shoot) {
  const notes = normalizeKey([client.notes, shoot.free_notes].filter(Boolean).join(" "));
  return Boolean((client.age && client.age >= 50) || notes.includes("50 anos") || notes.includes("50+") || notes.includes("cliente 50"));
}

export function buildPremiumPrompt(shoot: Shoot, client: Client, referencePhotos: ReferencePhoto[]) {
  const tattoos = referencePhotos.some((photo) => photo.type.includes("tattoo"));
  const outfit = buildOutfitLine(shoot);
  const compositionGoal = buildCompositionGoal(shoot);
  const matureClient = isMatureClient(client, shoot);
  const subtypeKey = shoot.subtype
    ? `${normalizeKey(shoot.category)}|${normalizeKey(shoot.subtype)}`
    : "";
  const sceneBase = (subtypeKey && subtypePrompts[subtypeKey])
    ?? categoryPrompts[shoot.category]
    ?? "Create a realistic professional photoshoot with premium composition, believable location, natural colors and high-end photography look.";
  const scene = [
    sceneBase,
    shoot.location && `Location/scenario: ${shoot.location}.`,
    shoot.mood && `Mood/environment: ${shoot.mood}.`,
    shoot.lighting && `Lighting: ${shoot.lighting}.`
  ].filter(Boolean).join(" ");
  const styling = [
    outfit && `Outfit: ${outfit}.`,
    shoot.shoes && `Shoes: ${shoot.shoes}.`,
    shoot.accessories && `Accessories: ${shoot.accessories}.`,
    shoot.hair && `Hair: ${shoot.hair}.`,
    shoot.makeup && `Makeup: ${shoot.makeup}.`
  ].filter(Boolean).join(" ");
  const direction = [
    shoot.pose && `Desired pose: ${shoot.pose}.`,
    shoot.expression && `Desired expression: ${shoot.expression}.`,
    shoot.photo_style && `Photo style: ${shoot.photo_style}.`,
    shoot.free_notes && `User details: ${shoot.free_notes}.`
  ].filter(Boolean).join(" ");
  const references = optionalReferenceBlock(referencePhotos);

  return [
    `Identity priority: ${identityBlock}`,
    `Client: ${client.name}${client.age ? `, ${client.age} years old` : ""}.`,
    "Before generating, mentally describe the exact person in the reference photos: their specific face shape, exact skin tone, exact hair color and style, exact body proportions, exact weight and build. Generate THAT specific person, not a similar one.",
    shoot.recreate_reference_mode
      ? "RECREATE MODE ACTIVE: A visual reference photo has been provided showing a scene, pose, outfit and environment. Your job is to place THIS SPECIFIC CLIENT — the person in the identity reference photos — into that scene. The reference scene is a LOCATION and STYLE guide only. The face, body, hair, skin tone, weight, age and all physical features must come EXCLUSIVELY from the identity photos, not from the reference scene. If the reference shows a different person, IGNORE that person's appearance completely."
      : "",
    shoot.recreate_reference_mode
      ? "Physical anchoring: The client has the following characteristics extracted from their identity photos — preserve ALL of these exactly:\n- Face: exact facial structure, real asymmetry, natural skin texture\n- Hair: exact color, volume, length, style and hairline\n- Body: exact weight, build, proportions and posture\n- Skin: exact tone, pores, marks and natural imperfections\n- Age: exact apparent age, do not make younger or older\nThese are non-negotiable. The scene changes, the person never does."
      : "",
    matureClient ? matureClientBlock : "",
    tattoos ? "Preserve all visible tattoos accurately in the same body areas, with realistic placement, scale and orientation." : "",
    `Body and proportions: ${anatomyBlock}`,
    `Scene: ${scene}`,
    styling ? `Outfit and styling: ${styling} This outfit and styling has priority over clothing visible in face/body reference photos.` : "",
    direction ? `Pose and expression: ${direction}` : "",
    `Composition: ${compositionGoal}. If a beach, rock, ocean or environment is requested, show the beach/ocean/surroundings clearly and keep the framing open enough to see the body pose.`,
    references ? `Optional references: ${references} Face references are for identity only, not clothing, background or crop.` : "Reference usage: face and body photos are for identity, age, hair and body proportions only, not clothing, background or crop.",
    shoot.recreate_reference_mode ? "Recreate-reference mode: use the optional reference only for pose, outfit, environment, lighting and composition. Do not copy the reference person's face, body, age, hair, proportions or identity. Preserve the real client's face, body, hair, age, skin texture and natural proportions completely." : "",
    "Photographic quality: realistic DSLR photo, professional photography, high detail, real human skin, realistic shadows, natural colors, believable background, no artificial AI look.",
    "CRITICAL IDENTITY REMINDER: The person in this image MUST be the exact same person from the reference photos. Same face. Same skin tone. Same hair. Same body. Same weight. Same proportions. If you are about to generate a different person, STOP and start over with the correct identity.",
    shoot.recreate_reference_mode
      ? "CRITICAL RECREATE REMINDER: You are placing a REAL specific person into a new scene. This is NOT a creative interpretation. The person's appearance is fixed and non-negotiable. If the output shows someone who looks different from the identity photos — different face structure, slimmer, heavier, younger, older, different hair — it is WRONG. Generate again with strict identity adherence."
      : "",
    `Negative prompt: ${defaultNegativePrompt}${shoot.recreate_reference_mode ? " Recreate-specific negative: copying reference person's face, using reference person's body, merging reference person's features with client's features, blending two people's appearances, composite face, hybrid identity." : ""} Do not copy hoodie, sweatshirt, casual clothing, indoor background or tight face crop from the uploaded identity references unless explicitly requested. Do not add text, labels, logos, watermarks or written words inside the image.`
  ].filter(Boolean).join("\n\n");
}
