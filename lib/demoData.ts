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
  { type: "face_neutral", label: "Rosto neutro/serio", description: "Boa luz, rosto nitido, sem filtro forte." },
  { type: "face_smiling", label: "Rosto sorrindo", description: "Sorriso natural para preservar boca, olhos e expressao." },
  { type: "full_body_front", label: "Corpo inteiro de frente", description: "Corpo visivel para manter proporcoes reais." }
];

export const optionalPhotoTypes = [
  { type: "full_body_side", label: "Corpo inteiro de lado", description: "Avancado: melhora bracos, pernas e proporcoes do corpo." },
  { type: "tattoo_arm", label: "Tatuagem no braco", description: "Opcional para preservar tatuagens ou marcas visiveis no braco." },
  { type: "tattoo_leg", label: "Tatuagem na perna", description: "Opcional para preservar tatuagens ou detalhes nas pernas." },
  { type: "back", label: "Costas", description: "Opcional para roupas, cabelo ou detalhes vistos por tras." },
  { type: "hair_detail", label: "Detalhe do cabelo", description: "Opcional para preservar cor, comprimento e penteado real." },
  { type: "outfit_reference", label: "Referencia de roupa", description: "Referencia de roupa, calcado, acessorios ou estilo visual." },
  { type: "extra", label: "Extra", description: "Envie qualquer outra referencia complementar." }
];

export const templates = [
  { name: "Aniversario Luxo", category: "Aniversario", subtype: "luxo", description: "Decoracao premium, pose elegante e luz editorial.", image: "/assets/landing/template-aniversario.png", credits: 10, popular: true, badge: "Mais vendido" },
  { name: "Aniversario Baloes", category: "Aniversario", subtype: "baloes", description: "Cenario festivo realista com baloes e composicao limpa.", image: "/assets/landing/template-aniversario.png", credits: 10 },
  { name: "Aniversario Bolo", category: "Aniversario", subtype: "bolo", description: "Foto de celebracao com bolo, detalhes reais e sorriso natural.", image: "/assets/landing/template-aniversario.png", credits: 10 },
  { name: "Casual Urbano", category: "Casual", subtype: "urbano", description: "Rua, cafe ou parque com energia espontanea e moderna.", image: "/assets/landing/template-casual.png", credits: 10 },
  { name: "Casual Praia", category: "Casual", subtype: "praia", description: "Lifestyle leve com luz natural, vento e pele realista.", image: "/assets/landing/template-casual.png", credits: 10, badge: "Bom para WhatsApp" },
  { name: "Casual Cafe", category: "Casual", subtype: "cafe", description: "Foto espontanea em cafeteria, clima leve e comercial.", image: "/assets/landing/template-casual.png", credits: 10 },
  { name: "Praia Lifestyle", category: "Praia", subtype: "lifestyle", description: "Oceano, areia, luz de fim de tarde e corpo proporcional.", image: "/assets/landing/template-praia.png", credits: 10 },
  { name: "Profissional Premium", category: "Profissional/empresa", subtype: "premium", description: "Retrato confiavel para marca pessoal, empresa ou autoridade.", image: "/assets/landing/template-profissional.png", credits: 10, popular: true, badge: "Ideal para perfil" },
  { name: "LinkedIn", category: "Profissional/empresa", subtype: "linkedin", description: "Imagem clara, profissional e pronta para perfil e curriculo.", image: "/assets/landing/template-profissional.png", credits: 10 },
  { name: "Casal Editorial", category: "Casal", subtype: "editorial", description: "Quimica natural, contato elegante e composicao emocional.", image: "/assets/landing/template-casal.png", credits: 10 },
  { name: "Gestante Elegante", category: "Gestante", subtype: "estudio", description: "Luz suave, styling delicado e composicao respeitosa.", image: "/assets/landing/template-gestante.png", credits: 10 },
  { name: "Infantil Estudio", category: "Infantil/bebe", subtype: "estudio", description: "Cena infantil delicada, segura e com aparencia fotografica.", image: "/assets/landing/template-infantil.png", credits: 10 },
  { name: "Fitness Academia", category: "Fitness", subtype: "academia", description: "Postura forte, luz atletica e proporcoes naturais.", image: "/assets/landing/template-fitness.png", credits: 10 },
  { name: "Recriar Referencia", category: "Personalizado", subtype: "referencia", description: "Use quando a cliente mandar uma inspiracao e pedir algo igual. A IA usa a referencia apenas para pose, roupa, ambiente, luz e composicao, preservando rosto, corpo, cabelo e idade da cliente.", image: "/assets/landing/gallery-preview.png", credits: 10, popular: true, badge: "Mais usado por clientes" }
].map((template, index) => ({ id: `template-${index + 1}`, ...template }));

const now = new Date().toISOString();
const userId = "demo-user";

const clients: Client[] = [
  { id: "client-1", user_id: userId, name: "Marina Alves", whatsapp: "+55 11 99999-1101", email: "marina@email.com", city: "Sao Paulo", age: 29, notes: "Prefere ensaios elegantes e tons escuros.", status: "ready", total_revenue: 297, created_at: now, updated_at: now },
  { id: "client-2", user_id: userId, name: "Camila Rocha", whatsapp: "+55 31 97777-3303", city: "Belo Horizonte", age: 26, notes: "Ensaio praia com vestido claro.", status: "delivered", total_revenue: 247, created_at: now, updated_at: now },
  { id: "client-3", user_id: userId, name: "Renata Lima", whatsapp: "+55 21 98888-2202", city: "Rio de Janeiro", age: 38, notes: "Quer fotos profissionais e uma recriacao de referencia.", status: "review", total_revenue: 397, created_at: now, updated_at: now }
];

const shoots: Shoot[] = [
  { id: "shoot-1", user_id: userId, client_id: "client-1", title: "Aniversario Luxo", category: "Aniversario", status: "completed", sold_price: 297, outfit: "vestido longo", outfit_color: "vermelho", location: "estudio escuro premium", pose: "confiante", expression: "sorriso leve", lighting: "luz suave de estudio", photo_style: "realistic iPhone 15 photo", credits_used: 10, provider: "demo", quantity: 4, consent_confirmed: true, consent_portfolio: true, created_at: now, updated_at: now },
  { id: "shoot-2", user_id: userId, client_id: "client-2", title: "Praia Lifestyle", category: "Praia", status: "delivered", sold_price: 247, outfit: "vestido leve", outfit_color: "off white", location: "praia ao por do sol", pose: "caminhando na areia", expression: "leve", lighting: "luz natural", photo_style: "realistic iPhone 15 photo", credits_used: 10, provider: "demo", quantity: 4, consent_confirmed: true, created_at: now, updated_at: now },
  { id: "shoot-3", user_id: userId, client_id: "client-1", title: "Casual Urbano", category: "Casual", status: "review", sold_price: 197, outfit: "camisa branca", location: "rua arborizada", lighting: "fim de tarde", photo_style: "natural colors", credits_used: 10, provider: "demo", quantity: 4, consent_confirmed: true, created_at: now, updated_at: now },
  { id: "shoot-4", user_id: userId, client_id: "client-3", title: "Profissional Premium", category: "Profissional/empresa", status: "ready", sold_price: 397, outfit: "blazer", outfit_color: "azul marinho", location: "escritorio moderno", expression: "neutra e segura", lighting: "luz natural controlada", photo_style: "professional iPhone 15 photo", credits_used: 0, provider: "demo", quantity: 4, consent_confirmed: true, created_at: now, updated_at: now },
  { id: "shoot-5", user_id: userId, client_id: "client-3", title: "Recriar Referencia", category: "Personalizado", status: "draft", sold_price: 197, outfit: "roupa parecida com referencia", location: "ambiente da referencia", photo_style: "realistic iPhone 15 photo", free_notes: "Usar referencia somente para pose, roupa, ambiente, luz e composicao.", credits_used: 0, provider: "demo", quantity: 4, consent_confirmed: true, recreate_reference_mode: true, recreate_options: { same_pose: true, similar_outfit: true, same_scene: true, same_lighting: true, keep_real_client: true, keep_real_body: true, keep_real_hair: true, iphone_photo: true }, created_at: now, updated_at: now }
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
  profile: { id: "profile-1", user_id: userId, name: "Usuario Demo", email: "demo@photoforge.ai", whatsapp: "+55 11 90000-0000", role: "user", plan_type: "free", status: "active", created_at: now, updated_at: now },
  clients,
  shoots,
  referencePhotos,
  generatedImages,
  credits: { id: "credits-1", user_id: userId, balance: 100, total_purchased: 130, total_used: 30, updated_at: now },
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
