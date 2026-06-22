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
  { name: "Aniversario Luxo", category: "Aniversario", subtype: "luxo", description: "Vestido elegante, balões dourados, iluminação de estúdio premium. Resultado com aparência de ensaio fotográfico profissional.", image: "/assets/landing/template-aniversario.png", credits: 10, popular: true, badge: "Mais vendido" },
  { name: "Aniversario Baloes", category: "Aniversario", subtype: "baloes", description: "Cenário festivo com balões coloridos, fundo limpo e composição celebrativa. Ótimo para postar no Instagram.", image: "/assets/landing/template-aniversario.png", credits: 10 },
  { name: "Aniversario Bolo", category: "Aniversario", subtype: "bolo", description: "Pose natural com bolo de aniversário, sorriso real e detalhes de celebração. Parece foto tirada por fotógrafo profissional.", image: "/assets/landing/template-aniversario.png", credits: 10 },
  { name: "Casual Urbano", category: "Casual", subtype: "urbano", description: "Foto espontânea em rua arborizada ou café urbano, roupas do dia a dia, aparência natural sem filtro.", image: "/assets/landing/template-casual.png", credits: 8 },
  { name: "Casual Praia", category: "Casual", subtype: "praia", description: "Lifestyle leve com luz dourada do fim de tarde, vento no cabelo e pele realista. Perfeito para WhatsApp e stories.", image: "/assets/landing/template-casual.png", credits: 10, badge: "Bom para WhatsApp" },
  { name: "Casual Cafe", category: "Casual", subtype: "cafe", description: "Ambiente aconchegante de cafeteria, xícara na mão, expressão leve. Ideal para conteúdo de redes sociais.", image: "/assets/landing/template-casual.png", credits: 8 },
  { name: "Praia Lifestyle", category: "Praia", subtype: "lifestyle", description: "Foto ampla com praia ao fundo, ondas visíveis, composição aberta e luz natural. A cliente aparece de corpo inteiro.", image: "/assets/landing/template-praia.png", credits: 10 },
  { name: "Praia Editorial", category: "Praia", subtype: "editorial", description: "Visual sofisticado beira-mar: vestido fluido, iluminação golden hour, composição editorial com profundidade.", image: "/assets/landing/template-praia.png", credits: 10 },
  { name: "Profissional Premium", category: "Profissional/empresa", subtype: "perfil", description: "Retrato com fundo neutro ou escritório moderno, blazer, expressão segura. Ideal para LinkedIn e autoridade digital.", image: "/assets/landing/template-profissional.png", credits: 10, popular: true, badge: "Ideal para perfil" },
  { name: "LinkedIn/Corporativo", category: "Profissional/empresa", subtype: "linkedin", description: "Foto corporativa limpa, sem exageros, ideal para perfil profissional e apresentações.", image: "/assets/landing/template-profissional.png", credits: 8 },
  { name: "Casal Editorial", category: "Casal", subtype: "editorial", description: "Dois juntos em ambiente bonito, gestos naturais, olhares conectados. Clima romântico com acabamento editorial.", image: "/assets/landing/template-casal.png", credits: 12 },
  { name: "Gestante Elegante", category: "Gestante", subtype: "elegante", description: "Ensaio gestante delicado: vestido fluido, iluminação suave, barriga em evidência. Respeitoso e emocionante.", image: "/assets/landing/template-gestante.png", credits: 12 },
  { name: "Infantil Estudio", category: "Infantil/bebe", subtype: "estudio", description: "Criança em cenário colorido e seguro, expressão genuína, fundo limpo. Parece foto de estúdio infantil de verdade.", image: "/assets/landing/template-infantil.png", credits: 10 },
  { name: "Fitness Academia", category: "Fitness", subtype: "academia", description: "Pose forte em academia, roupa esportiva, iluminação atlética. Transmite energia e disciplina.", image: "/assets/landing/template-fitness.png", credits: 10 },
  { name: "Recriar Referencia", category: "Personalizado", subtype: "referencia", description: "Mande uma foto de inspiração e recrie o cenário, pose e roupa com o rosto e corpo reais da cliente.", image: "/assets/landing/gallery-preview.png", credits: 12, popular: true, badge: "Mais usado por clientes" },
  { name: "Prompt Personalizado", category: "Personalizado", subtype: "avancado", description: "Monte do zero: escolha cenário, roupa, pose, expressão e todos os detalhes manualmente.", image: "/assets/landing/hero-dashboard.png", credits: 10, badge: "Avancado" }
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
