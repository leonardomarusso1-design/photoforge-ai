export type UserRole = "user" | "community" | "admin";
export type ClientStatus =
  | "new"
  | "waiting_photos"
  | "ready"
  | "generating"
  | "review"
  | "delivered"
  | "cancelled";
export type ShootStatus = "draft" | "waiting_photos" | "ready" | "generating" | "completed" | "review" | "approved" | "failed" | "delivered" | "archived";
export type LegacyQualityStatus = "boa" | "media" | "ruim";
export type PhotoQualityStatus = "pending" | "approved" | "warning" | "rejected";
export type LightingQuality = "good" | "medium" | "poor" | LegacyQualityStatus;
export type QualityStatus = LegacyQualityStatus | PhotoQualityStatus;
export type GenerationQuantity = 1 | 2 | 4 | 8 | 16;

export type Profile = {
  id: string;
  user_id: string;
  name: string;
  email: string;
  whatsapp?: string;
  role: UserRole;
  plan_type: "free" | "community" | "public" | "pro" | "admin" | "Comunidade" | "Publico" | "Pro" | "Admin";
  status?: "active" | "blocked" | "deleted";
  avatar_url?: string;
  created_at: string;
  updated_at: string;
};

export type Client = {
  id: string;
  user_id: string;
  name: string;
  whatsapp: string;
  email?: string;
  city?: string;
  age?: number;
  notes?: string;
  status: ClientStatus;
  total_revenue: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
};

export type Shoot = {
  id: string;
  user_id: string;
  client_id: string;
  title: string;
  category: string;
  status: ShootStatus;
  sold_price: number;
  outfit?: string;
  outfit_color?: string;
  shoes?: string;
  accessories?: string;
  hair?: string;
  makeup?: string;
  location?: string;
  mood?: string;
  pose?: string;
  expression?: string;
  lighting?: string;
  photo_style?: string;
  free_notes?: string;
  generated_prompt?: string;
  negative_prompt?: string;
  credits_used: number;
  provider: string;
  quantity: GenerationQuantity;
  consent_confirmed: boolean;
  consent_confirmed_at?: string | null;
  consent_internal_use?: boolean | null;
  consent_whatsapp_example?: boolean | null;
  consent_portfolio?: boolean | null;
  consent_ads?: boolean | null;
  consent_no_public_use?: boolean | null;
  subtype?: string;
  recreate_reference_mode?: boolean | null;
  recreate_options?: Record<string, boolean> | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
};

export type ReferencePhoto = {
  id: string;
  user_id: string;
  client_id: string;
  shoot_id: string;
  type: string;
  storage_path?: string;
  file_url: string;
  quality_status: QualityStatus;
  quality_score?: number | null;
  quality_issues?: string[] | null;
  quality_recommendation?: string | null;
  can_be_primary_identity?: boolean | null;
  is_screenshot?: boolean | null;
  has_face?: boolean | null;
  face_clear?: boolean | null;
  face_visible?: boolean;
  body_visible?: boolean;
  resolution_ok?: boolean | null;
  lighting_quality?: LightingQuality | null;
  notes?: string;
  audited_at?: string | null;
  created_at: string;
};

export type GeneratedImage = {
  id: string;
  user_id: string;
  client_id: string;
  shoot_id: string;
  file_url: string;
  prompt_used: string;
  provider: string;
  model: string;
  status: "completed" | "failed";
  width: number;
  height: number;
  seed: number;
  cost_estimate: number;
  is_favorite?: boolean;
  portfolio_authorized?: boolean | null;
  delivered_at?: string | null;
  created_at: string;
  deleted_at?: string | null;
};

export type CreditState = {
  id: string;
  user_id: string;
  balance: number;
  total_purchased: number;
  total_used: number;
  updated_at: string;
};

export type CreditTransaction = {
  id: string;
  user_id: string;
  type: "purchase" | "usage" | "refund" | "admin_adjustment";
  amount: number;
  description: string;
  related_shoot_id?: string;
  created_at: string;
};

export type GenerationLog = {
  id: string;
  user_id: string;
  shoot_id: string;
  provider: string;
  model: string;
  request_payload: unknown;
  response_payload?: unknown;
  status: "pending" | "success" | "failed";
  error_message?: string;
  credits_charged: number;
  cost_estimate: number;
  created_at: string;
};

export type DemoState = {
  profile: Profile;
  clients: Client[];
  shoots: Shoot[];
  referencePhotos: ReferencePhoto[];
  generatedImages: GeneratedImage[];
  credits: CreditState;
  creditTransactions: CreditTransaction[];
  generationLogs: GenerationLog[];
  generationConfig: {
    provider: string;
    effectiveProvider: string;
    isRealProvider: boolean;
    realAiEnabledForAdmin: boolean;
    quantityOptions: GenerationQuantity[];
    creditsPerImage: number;
  };
};
