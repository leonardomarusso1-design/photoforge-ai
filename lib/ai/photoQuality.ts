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
  const resolutionOk = shortSide >= 480 && longSide >= 720;
  const extremelyLowResolution = shortSide < 320 || longSide < 480;
  const phoneScreenshotShape = height > width && height / Math.max(width, 1) > 1.9 && longSide >= 1600;
  const screenshotName = /(screenshot|screen shot|captura|print|whatsapp|instagram|gallery|galeria)/i.test(fileName);
  const strongTopBar = (input.topEdgeContrast ?? 0) > 115;
  const weakTopBar = (input.topEdgeContrast ?? 0) > 85;
  const strongScreenshotEvidence = screenshotName || (phoneScreenshotShape && strongTopBar);
  const weakScreenshotEvidence = !strongScreenshotEvidence && phoneScreenshotShape && weakTopBar;
  const isScreenshot = strongScreenshotEvidence;
  const darkRatio = input.darkRatio ?? 0;
  const brightRatio = input.brightRatio ?? 0;
  const lightingQuality = darkRatio > 0.72 || brightRatio > 0.62 ? "poor" : darkRatio > 0.48 || brightRatio > 0.42 ? "medium" : "good";
  const unusableLighting = darkRatio > 0.9 || brightRatio > 0.82;

  if (!resolutionOk) {
    issues.push("resolucao_baixa");
  }
  if (strongScreenshotEvidence) {
    issues.push("possivel_captura_aceita");
  } else if (weakScreenshotEvidence) {
    issues.push("aviso_de_formato_aceito");
  }
  if (lightingQuality === "poor") {
    issues.push(darkRatio > brightRatio ? "foto_muito_escura" : "foto_muito_estourada");
  } else if (lightingQuality === "medium") {
    issues.push("iluminacao_media");
  }

  const isFace = faceTypes.includes(type);
  const isBody = bodyTypes.includes(type);
  const optionalPoseScenario = type === "pose_scenario";
  const optionalDetail = type === "important_detail" || type === "tattoo_arm" || type === "tattoo_leg" || type === "back" || type === "hair_detail";
  const optionalOutfit = type === "outfit_visual" || type === "outfit_reference";
  const hasFace = isFace || Boolean(input.width && input.height && !isBody);
  const faceClear = isFace ? !extremelyLowResolution && !unusableLighting : false;
  const bodyVisible = isBody ? !extremelyLowResolution && !unusableLighting : false;
  let score = isFace ? 82 : isBody ? 76 : 78;

  if (isFace && !hasFace) {
    score -= 45;
    issues.push("rosto_nao_visivel");
  }
  if (isFace && !faceClear) {
    score -= lightingQuality === "poor" || extremelyLowResolution ? 35 : 14;
    issues.push("rosto_sem_nitidez_suficiente");
  }
  if (isBody && !bodyVisible) {
    score -= lightingQuality === "poor" || extremelyLowResolution ? 34 : 16;
    issues.push("corpo_inteiro_nao_confirmado");
  }
  if (!resolutionOk) score -= extremelyLowResolution ? 25 : 8;
  if (lightingQuality === "poor") score -= 22;
  if (lightingQuality === "medium") score -= 8;
  if (strongScreenshotEvidence) score = Math.min(score, 72);
  if (weakScreenshotEvidence) score = Math.min(score, 78);
  if (optionalDetail && (!resolutionOk || lightingQuality === "poor")) {
    score -= 10;
    issues.push("detalhe_pouco_nitido");
  }
  if (optionalOutfit && !resolutionOk) {
    score -= 6;
    issues.push("visual_pouco_claro");
  }

  if ((isFace && hasFace && faceClear) || (isBody && bodyVisible)) {
    score = Math.max(score, lightingQuality === "poor" || extremelyLowResolution ? 58 : 65);
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  const unusableRequiredPhoto = (isFace || isBody) && (extremelyLowResolution || unusableLighting);
  const status = unusableRequiredPhoto ? "rejected" : score >= 75 ? "approved" : "warning";
  const canBePrimary = isFace && hasFace && status !== "rejected";

  let recommendation = isFace ? "Foto aprovada. Rosto visivel, nitidez aceitavel e boa referencia para identidade." : "Foto aprovada. Qualidade suficiente para orientar o ensaio.";
  if (status === "warning" && isFace) recommendation = "Foto utilizavel. Se quiser melhorar o resultado, use luz mais clara e evite filtros fortes.";
  if (status === "warning" && isBody) recommendation = "Foto utilizavel para proporcao corporal. Para melhorar, mantenha o corpo inteiro visivel e com boa luz.";
  if (status === "warning" && !isFace && !isBody) recommendation = "Atencao: referencia utilizavel, mas uma imagem mais clara pode melhorar o resultado.";
  if (status === "rejected") recommendation = "Foto reprovada apenas por qualidade minima. Envie uma nova imagem mais nitida e com rosto/corpo visivel.";
  if (weakScreenshotEvidence) recommendation = "A imagem pode parecer captura de tela, mas foi aceita. Foto original costuma melhorar o resultado.";
  if (isScreenshot) recommendation = "A imagem parece captura de tela, mas foi aceita. Se possivel, use a foto original para melhorar a identidade.";
  if (isScreenshot && optionalPoseScenario) recommendation = "A imagem parece captura de tela, mas pode servir como inspiracao de pose ou cenario.";
  if (optionalDetail && status !== "approved") recommendation = "Essa referencia de detalhe esta fraca. A IA pode nao preservar esse detalhe corretamente.";
  if (isFace && !canBePrimary && status !== "rejected") recommendation = "Atencao: a foto pode ajudar, mas uma foto de rosto mais nitida melhora a preservacao da identidade.";

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
    .filter((photo) => photo.can_be_primary_identity !== false)
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
  const lines = ["Antes de gerar, envie as fotos obrigatorias ou troque apenas as imagens sem qualidade minima."];
  quality.missingTypes.forEach((type) => lines.push(`${type}: envie esta foto obrigatoria.`));
  [...quality.rejected, ...quality.pending].forEach((photo) => {
    lines.push(`${photo.type}: ${photo.quality_recommendation || "envie uma foto mais nitida."}`);
  });
  if (!quality.primary) lines.push("Rosto: envie pelo menos uma foto facial utilizavel para preservar identidade.");
  return lines.join("\n");
}
