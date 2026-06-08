import type { Client, ReferencePhoto, Shoot } from "@/lib/types";

const identityBlock = `Use the uploaded reference photos only as identity reference. Preserve the real face, facial structure, natural asymmetry, real skin texture, age, body proportions, hair, eyes, nose, mouth, lips, jawline, and all visible distinctive features of the person. Do not beautify excessively. Do not create a model-like face. Do not change ethnicity, age, weight, body shape, hairstyle, skin tone or facial expression beyond what is requested. Keep natural imperfections and realistic human details. The final image must look like a real professional photo, not AI-generated.`;

const anatomyBlock = `Maintain realistic human anatomy, natural posture, correct hands, correct fingers, correct legs, realistic shoulders, realistic feet and normal body proportions. Keep the person looking their real age. Do not make the person younger or older unless explicitly requested. Preserve the original hair color, hair volume, hairline, haircut and natural texture. Preserve natural skin texture, pores, small marks, wrinkles, moles and realistic imperfections. Avoid plastic skin, over-smoothing or beauty filter look.`;

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

export const defaultNegativePrompt = "AI-generated look, fake face, different person, changed identity, overly beautified face, plastic skin, blurred face, distorted eyes, asymmetrical eyes beyond natural features, changed nose, changed mouth, changed lips, changed jawline, wrong age, younger face, older face, wrong body, unrealistic body proportions, extra fingers, missing fingers, broken hands, distorted hands, deformed legs, extra limbs, bad anatomy, blurry, low quality, cartoon, 3D render, doll-like skin, wax skin, beauty filter, over-smoothed skin, watermark, text, logo, signature, mutated body, distorted tattoos, wrong tattoos, fake tattoos, unnatural smile, exaggerated teeth.";

export function buildPremiumPrompt(shoot: Shoot, client: Client, referencePhotos: ReferencePhoto[]) {
  const tattoos = referencePhotos.some((photo) => photo.type.includes("tattoo"));
  const outfit = [shoot.outfit, shoot.outfit_color].filter(Boolean).join(", ");
  const scene = [
    categoryPrompts[shoot.category] ?? "Create a realistic professional photoshoot with premium composition, believable location, natural colors and high-end photography look.",
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

  return [
    `Identity priority: ${identityBlock}`,
    `Client: ${client.name}${client.age ? `, ${client.age} years old` : ""}.`,
    tattoos ? "Preserve all visible tattoos accurately in the same body areas, with realistic placement, scale and orientation." : "",
    `Body and proportions: ${anatomyBlock}`,
    `Scene: ${scene}`,
    styling ? `Clothing, hair and accessories: ${styling}` : "",
    direction ? `Expression, pose and style: ${direction}` : "",
    "Photographic quality: realistic DSLR photo, professional photography, high detail, real human skin, realistic shadows, natural colors, believable background, no artificial AI look.",
    "Negative instructions: Do not add text, labels, logos, watermarks or written words inside the image."
  ].filter(Boolean).join("\n\n");
}
