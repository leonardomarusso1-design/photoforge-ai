import { Resend } from "resend";

function getResend() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return new Resend(apiKey);
}

function from() {
  return process.env.RESEND_FROM ?? "PhotoForge AI <photoforge@toqy.com.br>";
}

function discordUrl() {
  return process.env.DISCORD_INVITE_URL ?? "https://discord.gg/Sc6t4eJPvH";
}

function appUrl() {
  return (process.env.APP_URL ?? "https://app.leonardomarusso.com.br") + "/app/dashboard";
}

function communityHtml(name: string, credits: number) {
  const discord = discordUrl();
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f7fb;font-family:Inter,ui-sans-serif,system-ui,sans-serif;color:#1a1d27;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f7fb;padding:40px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;">
        <tr><td style="background:linear-gradient(135deg,#07090f,#10131b);padding:32px 36px;text-align:center;">
          <div style="display:inline-flex;align-items:center;justify-content:center;width:48px;height:48px;border-radius:10px;background:linear-gradient(135deg,#f4d58d,#2dd4bf,#8b5cf6);font-weight:900;font-size:14px;color:#07090f;margin-bottom:12px;">PF</div>
          <h1 style="margin:0;font-size:22px;font-weight:700;color:#ffffff;line-height:1.3;">Bem-vindo à comunidade<br>PhotoForge AI!</h1>
        </td></tr>
        <tr><td style="padding:36px;">
          <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#374151;">Olá, <strong>${name}</strong>!</p>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#4b5563;">Sua assinatura da <strong>Comunidade Mensal</strong> foi confirmada. Você recebeu <strong>${credits} créditos</strong> e vai ganhar esse saldo todo mês enquanto a assinatura estiver ativa.</p>
          <p style="margin:0 0 28px;font-size:15px;line-height:1.7;color:#4b5563;">Acesse o Discord da comunidade para tirar dúvidas, ver atualizações e trocar experiências com outros membros.</p>
          <div style="text-align:center;margin-bottom:28px;">
            <a href="${discord}" style="display:inline-block;background:#f4d58d;color:#07090f;font-weight:700;font-size:15px;padding:14px 32px;border-radius:8px;text-decoration:none;">Entrar no Discord</a>
          </div>
          <p style="margin:0;font-size:13px;line-height:1.6;color:#9ca3af;text-align:center;">Se o botão não funcionar, copie e acesse: <a href="${discord}" style="color:#2dd4bf;">${discord}</a></p>
        </td></tr>
        <tr><td style="background:#f9fafb;padding:20px 36px;border-top:1px solid #e5e7eb;">
          <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">PhotoForge AI · Plataforma de ensaios com IA</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function creditsHtml(name: string, planName: string, credits: number) {
  const app = appUrl();
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f7fb;font-family:Inter,ui-sans-serif,system-ui,sans-serif;color:#1a1d27;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f7fb;padding:40px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;">
        <tr><td style="background:linear-gradient(135deg,#07090f,#10131b);padding:32px 36px;text-align:center;">
          <div style="display:inline-flex;align-items:center;justify-content:center;width:48px;height:48px;border-radius:10px;background:linear-gradient(135deg,#f4d58d,#2dd4bf,#8b5cf6);font-weight:900;font-size:14px;color:#07090f;margin-bottom:12px;">PF</div>
          <h1 style="margin:0;font-size:22px;font-weight:700;color:#ffffff;line-height:1.3;">Seus créditos estão prontos!</h1>
        </td></tr>
        <tr><td style="padding:36px;">
          <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#374151;">Olá, <strong>${name}</strong>!</p>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#4b5563;">Sua compra do plano <strong>${planName}</strong> foi confirmada. <strong>${credits} créditos</strong> já foram adicionados à sua conta e estão prontos para uso.</p>
          <p style="margin:0 0 28px;font-size:15px;line-height:1.7;color:#4b5563;">Acesse o app para começar a gerar ensaios agora mesmo.</p>
          <div style="text-align:center;margin-bottom:28px;">
            <a href="${app}" style="display:inline-block;background:#f4d58d;color:#07090f;font-weight:700;font-size:15px;padding:14px 32px;border-radius:8px;text-decoration:none;">Acessar o app</a>
          </div>
          <p style="margin:0;font-size:13px;line-height:1.6;color:#9ca3af;text-align:center;">Se o botão não funcionar, copie e acesse: <a href="${app}" style="color:#2dd4bf;">${app}</a></p>
        </td></tr>
        <tr><td style="background:#f9fafb;padding:20px 36px;border-top:1px solid #e5e7eb;">
          <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">PhotoForge AI · Plataforma de ensaios com IA</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendWelcomeEmail(args: {
  to: string;
  name: string;
  planName: string;
  isSubscription: boolean;
  credits: number;
}) {
  const resend = getResend();
  if (!resend) {
    console.log("sendWelcomeEmail: RESEND_API_KEY not set, skipping email", { to: args.to, plan: args.planName });
    return;
  }

  const subject = args.isSubscription
    ? "Bem-vindo à comunidade PhotoForge AI!"
    : "Seus créditos PhotoForge AI estão prontos!";

  const html = args.isSubscription
    ? communityHtml(args.name, args.credits)
    : creditsHtml(args.name, args.planName, args.credits);

  const { error } = await resend.emails.send({ from: from(), to: args.to, subject, html });
  if (error) {
    console.error("sendWelcomeEmail: Resend error", { to: args.to, plan: args.planName, error });
  }
}
