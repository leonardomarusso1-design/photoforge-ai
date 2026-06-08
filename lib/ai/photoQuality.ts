import type { ReferencePhoto } from "@/lib/types";

export type PhotoAuditInput = {
  type: string;
  fileName?: string;
  width?: number;
  height?: number;
  fileSize?: number;
  darkRatio?: number;
  brightRatio?: number;
  topEdgeContrast?: number;
};

export type PhotoAuditResult = {
  quality_status: "approved" | "warning" | "rejected";
  quality_score: number;
  quality_issues: string[];
  quality_recommendation: string;
  can_be_primary_identity: boolean;
  is_screenshot: boolean;
  has_face: boolean;
  face_clear: boolean;
  body_visible: boolean;
  resolution_ok: boolean;
  lighting_quality: "good" | "medium" | "poor";
  audited_at: string;
};

const requiredTypes = ["face_neutral", "face_smiling", "full_body_front", "full_body_side"];
const faceTypes = ["face_neutral", "face_smiling"];
const bodyTypes = ["full_body_front", "full_body_side"];

function normalizeStatus(status?: string | null) {
  if (status === "boa") return "approved";
  if (status === "media") return "warning";
  if (status === "ruim") return "rejected";
  if (status === "approved" || status === "warning" || status === "rejected" || status === "pending") return status;
  return "pending";
}

function photoScore(photo: ReferencePhoto) {
  if (typeof photo.quality_score === "number") return photo.quality_score;
  const status = normalizeStatus(photo.quality_status);
  if (status === "approved") return 80;
  if (status === "warning") return 65;
  if (status === "rejected") return 30;
  return 0;
}

export function auditReferencePhoto(input: PhotoAuditInput): PhotoAuditResult {
  const issues: string[] = [];
  const type = input.type;
  const fileName = input.fileName?.toLowerCase() ?? "";
  const width = input.width ?? 0;
  const height = input.height ?? 0;
  const shortSide = Math.min(width, height);
  const longSide = Math.max(width, height);
  const resolutionOk = shortSide >= 600 && longSide >= 900;
  const phoneScreenshotShape = height > width && height / Math.max(width, 1) > 1.8 && longSide >= 1400;
  const screenshotName = /(screenshot|screen shot|captura|print|whatsapp|instagram|gallery|galeria)/i.test(fileName);
  const suspiciousTopBar = (input.topEdgeContrast ?? 0) > 70;
  const isScreenshot = screenshotName || (phoneScreenshotShape && suspiciousTopBar);
  const darkRatio = input.darkRatio ?? 0;
  const brightRatio = input.brightRatio ?? 0;
  const lightingQuality = darkRatio > 0.58 || brightRatio > 0.48 ? "poor" : darkRatio > 0.38 || brightRatio > 0.32 ? "medium" : "good";

  let score = 100;
  if (!resolutionOk) {
    score -= 25;
    issues.push("resolucao_baixa");
  }
  if (isScreenshot) {
    score = Math.min(score, 35);
    issues.push("captura_de_tela");
  }
  if (lightingQuality === "poor") {
    score -= 25;
    issues.push(darkRatio > brightRatio ? "foto_muito_escura" : "foto_muito_estourada");
  } else if (lightingQuality === "medium") {
    score -= 12;
    issues.push("iluminacao_media");
  }

  const isFace = faceTypes.includes(type);
  const isBody = bodyTypes.includes(type);
  const hasFace = isFace || Boolean(input.width && input.height && !isBody);
  const faceClear = isFace ? resolutionOk && !isScreenshot && lightingQuality !== "poor" : false;
  const bodyVisible = isBody ? resolutionOk && !isScreenshot : false;

  if (isFace && !hasFace) {
    score -= 45;
    issues.push("rosto_nao_visivel");
  }
  if (isFace && !faceClear) {
    score -= 25;
    issues.push("rosto_sem_nitidez_suficiente");
  }
  if (isBody && !bodyVisible) {
    score -= 30;
    issues.push("corpo_inteiro_nao_confirmado");
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  const status = isScreenshot ? "rejected" : score >= 75 ? "approved" : score >= 60 ? "warning" : "rejected";
  const canBePrimary = isFace && status === "approved" && score >= 75 && !isScreenshot && faceClear;

  let recommendation = "Aprovada: foto com qualidade suficiente para continuar.";
  if (status === "warning") recommendation = "Atencao: foto utilizavel, mas envie uma versao melhor se possivel.";
  if (status === "rejected") recommendation = "Reprovada: envie uma foto original, nitida, sem print e com melhor iluminacao.";
  if (isScreenshot) recommendation = "Essa imagem parece ser uma captura de tela. Envie a foto original, sem print, sem icones e com melhor qualidade.";
  if (isFace && !canBePrimary && status !== "rejected") recommendation = "Atencao: a foto pode ajudar, mas envie um rosto mais nitido para preservar identidade.";

  return {
    quality_status: status,
    quality_score: score,
    quality_issues: issues,
    quality_recommendation: recommendation,
    can_be_primary_identity: canBePrimary,
    is_screenshot: isScreenshot,
    has_face: hasFace,
    face_clear: faceClear,
    body_visible: bodyVisible,
    resolution_ok: resolutionOk,
    lighting_quality: lightingQuality,
    audited_at: new Date().toISOString()
  };
}

export function selectPrimaryIdentityImage(referencePhotos: ReferencePhoto[]) {
  const candidates = referencePhotos
    .filter((photo) => faceTypes.includes(photo.type))
    .filter((photo) => normalizeStatus(photo.quality_status) !== "rejected")
    .filter((photo) => photo.can_be_primary_identity === true)
    .filter((photo) => photo.is_screenshot !== true)
    .filter((photo) => photo.face_clear !== false)
    .sort((a, b) => {
      const typePriority = (photo: ReferencePhoto) => photo.type === "face_neutral" ? 0 : 1;
      return typePriority(a) - typePriority(b) || photoScore(b) - photoScore(a);
    });
  return candidates[0] ?? null;
}

export function summarizePhotoQuality(referencePhotos: ReferencePhoto[]) {
  const required = referencePhotos.filter((photo) => requiredTypes.includes(photo.type));
  const rejected = required.filter((photo) => normalizeStatus(photo.quality_status) === "rejected");
  const warning = required.filter((photo) => normalizeStatus(photo.quality_status) === "warning");
  const pending = required.filter((photo) => normalizeStatus(photo.quality_status) === "pending");
  const missingTypes = requiredTypes.filter((type) => !referencePhotos.some((photo) => photo.type === type));
  const primary = selectPrimaryIdentityImage(referencePhotos);
  return {
    ok: missingTypes.length === 0 && rejected.length === 0 && pending.length === 0 && Boolean(primary),
    primary,
    rejected,
    warning,
    pending,
    missingTypes,
    summary: {
      required_count: required.length,
      rejected_count: rejected.length,
      warning_count: warning.length,
      pending_count: pending.length,
      missing_types: missingTypes,
      primary_identity_photo_id: primary?.id ?? null
    }
  };
}

export function qualityBlockMessage(referencePhotos: ReferencePhoto[]) {
  const quality = summarizePhotoQuality(referencePhotos);
  if (quality.ok) return "";
  const lines = ["Antes de gerar, corrija as fotos abaixo."];
  quality.missingTypes.forEach((type) => lines.push(`${type}: envie esta foto obrigatoria.`));
  [...quality.rejected, ...quality.pending].forEach((photo) => {
    lines.push(`${photo.type}: ${photo.quality_recommendation || "envie uma foto original e nitida."}`);
  });
  if (!quality.primary) lines.push("Rosto: envie uma foto facial original, nitida e aprovada para preservar identidade.");
  return lines.join("\n");
}
