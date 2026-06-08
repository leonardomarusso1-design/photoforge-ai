import type { Client, DemoState, GeneratedImage, GenerationLog, ReferencePhoto, Shoot } from "@/lib/types";

export const categories = [
  "Aniversario",
  "Casal",
  "Profissional/empresa",
  "Infantil/bebe",
  "Gestante",
  "Fitness",
  "Praia",
  "Luxo",
  "Casual",
  "Lifestyle",
  "Natal",
  "Mae e filhos",
  "Noivado",
  "Formatura",
  "Beleza/estudio",
  "Personalizado"
];

export const requiredPhotoTypes = [
  { type: "face_neutral", label: "Rosto neutro" },
  { type: "face_smiling", label: "Rosto sorrindo" },
  { type: "full_body_front", label: "Corpo inteiro frente" },
  { type: "full_body_side", label: "Corpo inteiro lado" }
];

export const optionalPhotoTypes = [
  { type: "outfit_visual", label: "Roupa / visual", description: "Envie uma referencia de roupa, calcado, acessorios ou estilo visual." },
  { type: "pose_scenario", label: "Pose / cenario", description: "Envie uma referencia de pose, enquadramento, local ou composicao." },
  { type: "important_detail", label: "Detalhe importante", description: "Use para tatuagem, cabelo, costas, cicatriz ou qualquer detalhe que precisa aparecer corretamente." },
  { type: "extra", label: "Extra", description: "Envie qualquer outra referencia complementar." }
];

export const templates = [
  ["Aniversario Luxo", "Aniversario", "Cenario premium com decoracao elegante e luz de estudio."],
  ["Aniversario Baloes", "Aniversario", "Composicao festiva realista com baloes e acabamento editorial."],
  ["Ensaio Executivo Premium", "Profissional/empresa", "Retrato corporativo moderno, confiavel e sofisticado."],
  ["Ensaio Praia Realista", "Praia", "Luz natural, vento suave, tons reais de pele e lifestyle premium."],
  ["Ensaio Casal Romantico", "Casal", "Quimica natural, contato elegante e expressoes autenticas."],
  ["Ensaio Fitness Academia", "Fitness", "Luz atletica, postura forte e proporcoes naturais."],
  ["Ensaio Bebe Estudio", "Infantil/bebe", "Cena segura, delicada e com textura de pele realista."],
  ["Ensaio Gestante Elegante", "Gestante", "Iluminacao emocional, styling suave e composicao respeitosa."],
  ["Ensaio Casual Urbano", "Casual", "Ambiente natural, pose relaxada e elegancia cotidiana."],
  ["Ensaio Beleza Estudio", "Beleza/estudio", "Close realista, maquiagem refinada e luz profissional."]
].map(([name, category, description], index) => ({ id: `template-${index + 1}`, name, category, description }));

const now = new Date().toISOString();
const userId = "demo-user";

const clients: Client[] = [
  { id: "client-1", user_id: userId, name: "Marina Alves", whatsapp: "+55 11 99999-1101", email: "marina@email.com", city: "Sao Paulo", age: 29, notes: "Prefere ensaios elegantes e tons escuros.", status: "ready", total_revenue: 297, created_at: now, updated_at: now },
  { id: "client-2", user_id: userId, name: "Beatriz Lima", whatsapp: "+55 21 98888-2202", city: "Rio de Janeiro", age: 34, notes: "Quer fotos profissionais para LinkedIn.", status: "review", total_revenue: 197, created_at: now, updated_at: now },
  { id: "client-3", user_id: userId, name: "Camila Rocha", whatsapp: "+55 31 97777-3303", city: "Belo Horizonte", age: 26, notes: "Ensaio praia com vestido claro.", status: "delivered", total_revenue: 147, created_at: now, updated_at: now }
];

const shoots: Shoot[] = [
  { id: "shoot-1", user_id: userId, client_id: "client-1", title: "Aniversario editorial", category: "Aniversario", status: "completed", sold_price: 297, outfit: "vestido longo", outfit_color: "vermelho", shoes: "salto preto", accessories: "brincos discretos", hair: "cabelo solto natural", makeup: "maquiagem elegante", location: "estudio escuro premium", mood: "sofisticado", pose: "confiante", expression: "sorriso leve", lighting: "luz suave de estudio", photo_style: "realistic DSLR photo", free_notes: "Preservar tatuagem no braco.", credits_used: 8, provider: "mock", quantity: 8, consent_confirmed: true, created_at: now, updated_at: now },
  { id: "shoot-2", user_id: userId, client_id: "client-2", title: "Retrato executivo", category: "Profissional/empresa", status: "completed", sold_price: 197, outfit: "blazer", outfit_color: "azul marinho", location: "escritorio moderno", mood: "confiante", pose: "postura ereta", expression: "neutra e segura", lighting: "luz natural controlada", photo_style: "professional photography", credits_used: 4, provider: "mock", quantity: 4, consent_confirmed: true, created_at: now, updated_at: now },
  { id: "shoot-3", user_id: userId, client_id: "client-3", title: "Praia lifestyle", category: "Praia", status: "draft", sold_price: 147, outfit: "vestido leve", outfit_color: "off white", location: "praia ao por do sol", mood: "natural", pose: "caminhando na areia", expression: "leve", lighting: "luz natural", photo_style: "realistic DSLR photo", credits_used: 0, provider: "mock", quantity: 4, consent_confirmed: false, created_at: now, updated_at: now },
  { id: "shoot-4", user_id: userId, client_id: "client-1", title: "Beleza estudio", category: "Beleza/estudio", status: "ready", sold_price: 97, makeup: "glam suave", location: "fundo cinza", lighting: "beauty dish", photo_style: "high detail", credits_used: 0, provider: "mock", quantity: 4, consent_confirmed: true, created_at: now, updated_at: now },
  { id: "shoot-5", user_id: userId, client_id: "client-2", title: "Casual urbano", category: "Casual", status: "failed", sold_price: 87, outfit: "camisa branca", location: "rua arborizada", lighting: "fim de tarde", photo_style: "natural colors", credits_used: 4, provider: "mock", quantity: 4, consent_confirmed: true, created_at: now, updated_at: now }
];

const generatedImages: GeneratedImage[] = Array.from({ length: 8 }, (_, index) => ({
  id: `image-${index + 1}`,
  user_id: userId,
  client_id: index < 4 ? "client-1" : "client-2",
  shoot_id: index < 4 ? "shoot-1" : "shoot-2",
  file_url: `/api/placeholder?seed=${index + 1}`,
  prompt_used: "Prompt premium mockado para desenvolvimento visual.",
  provider: "mock",
  model: "mock-v1",
  status: "completed",
  width: 1024,
  height: 1365,
  seed: 1000 + index,
  cost_estimate: 1,
  is_favorite: index === 1,
  created_at: now
}));

const referencePhotos: ReferencePhoto[] = [
  ...requiredPhotoTypes.map((photo, index) => ({ id: `ref-${index + 1}`, user_id: userId, client_id: "client-1", shoot_id: "shoot-1", type: photo.type, file_url: `/api/placeholder?seed=ref-${index}`, quality_status: "boa" as const, face_visible: index < 2, body_visible: index >= 2, lighting_quality: "boa" as const, notes: "", created_at: now })),
  ...requiredPhotoTypes.map((photo, index) => ({ id: `ref-b-${index + 1}`, user_id: userId, client_id: "client-2", shoot_id: "shoot-2", type: photo.type, file_url: `/api/placeholder?seed=ref-b-${index}`, quality_status: "boa" as const, face_visible: index < 2, body_visible: index >= 2, lighting_quality: "boa" as const, notes: "", created_at: now }))
];

const generationLogs: GenerationLog[] = [
  { id: "log-1", user_id: userId, shoot_id: "shoot-1", provider: "mock", model: "mock-v1", request_payload: { quantity: 8 }, response_payload: { images: 8 }, status: "success", credits_charged: 8, cost_estimate: 8, created_at: now },
  { id: "log-2", user_id: userId, shoot_id: "shoot-5", provider: "mock", model: "mock-v1", request_payload: { quantity: 4 }, status: "failed", error_message: "Falha simulada registrada para visualizacao admin.", credits_charged: 4, cost_estimate: 4, created_at: now }
];

export const defaultDemoState: DemoState = {
  profile: { id: "profile-1", user_id: userId, name: "Leonardo Demo", email: "admin@photoforge.ai", whatsapp: "+55 11 90000-0000", role: "admin", plan_type: "admin", status: "active", created_at: now, updated_at: now },
  clients,
  shoots,
  referencePhotos,
  generatedImages,
  credits: { id: "credits-1", user_id: userId, balance: 120, total_purchased: 150, total_used: 30, updated_at: now },
  creditTransactions: [
    { id: "tx-1", user_id: userId, type: "purchase", amount: 150, description: "Creditos iniciais de desenvolvimento", created_at: now },
    { id: "tx-2", user_id: userId, type: "usage", amount: -8, description: "Geracao do ensaio Aniversario editorial", related_shoot_id: "shoot-1", created_at: now }
  ],
  generationLogs,
  generationConfig: {
    provider: "mock",
    effectiveProvider: "mock",
    isRealProvider: false,
    realAiEnabledForAdmin: false,
    quantityOptions: [4, 8, 16],
    creditsPerImage: 1
  }
};
