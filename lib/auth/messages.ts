export function translateAuthError(message?: string) {
  const text = (message ?? "").toLowerCase();

  if (!text) return "Nao foi possivel concluir a acao agora.";
  if (text.includes("invalid login credentials")) return "E-mail ou senha incorretos.";
  if (text.includes("email not confirmed")) return "Confirme seu e-mail antes de entrar.";
  if (text.includes("already registered") || text.includes("already exists")) return "Este e-mail ja esta em uso. Faca login ou recupere a senha.";
  if (text.includes("database error saving new user")) return "Nao foi possivel criar sua conta por erro de banco. Rode o SQL de correcao do Supabase e tente novamente.";
  if (text.includes("password") && text.includes("at least")) return "A senha deve ter pelo menos 6 caracteres.";
  if (text.includes("rate limit") || text.includes("too many") || text.includes("security purposes")) return "Muitas tentativas em pouco tempo. Aguarde alguns minutos antes de pedir outro e-mail ou trocar a senha.";
  if (text.includes("signup") && text.includes("disabled")) return "Cadastro desativado no Supabase Auth.";
  if (text.includes("email") && text.includes("invalid")) return "Digite um e-mail valido.";
  if (text.includes("fetch failed")) return "Nao foi possivel conectar ao Supabase agora.";

  return message ?? "Nao foi possivel concluir a acao agora.";
}
