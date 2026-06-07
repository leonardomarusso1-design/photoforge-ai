"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Card, Field, inputClass, Logo } from "@/components/ui";
import { translateAuthError } from "@/lib/auth/messages";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function AuthPage({ mode }: { mode: "login" | "register" | "forgot" }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const next = searchParams.get("next") ?? "/app/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const title = mode === "login" ? "Entrar" : mode === "register" ? "Criar conta" : "Recuperar senha";
  const confirmationRedirect = typeof window === "undefined" ? undefined : `${window.location.origin}/auth/callback?next=/app/dashboard`;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    if (mode === "login") {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (signInError) {
        setError(translateAuthError(signInError.message));
        return;
      }
      router.replace(next);
      router.refresh();
      return;
    }

    if (mode === "register") {
      const checkResponse = await fetch("/api/auth/check-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const checkData = await checkResponse.json();

      if (!checkResponse.ok) {
        setLoading(false);
        setError(checkData.error ?? "Nao foi possivel verificar se o e-mail ja esta em uso.");
        return;
      }

      if (checkData.exists) {
        setLoading(false);
        setError(checkData.confirmed ? "Este e-mail ja esta em uso. Faca login ou recupere a senha." : "Este e-mail ja foi cadastrado e ainda precisa de confirmacao. Use Reenviar confirmacao.");
        return;
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/app/dashboard`
        }
      });
      setLoading(false);
      if (signUpError) {
        setError(translateAuthError(signUpError.message));
        return;
      }
      if (data.user) {
        await fetch("/api/auth/ensure-profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: data.user.id, email, name })
        });
      }
      if (data.session) {
        router.replace("/app/dashboard");
        router.refresh();
        return;
      }
      setMessage("Cadastro criado. Confira seu e-mail para confirmar a conta antes de entrar.");
      return;
    }

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`
    });
    setLoading(false);
    if (resetError) {
      setError(translateAuthError(resetError.message));
      return;
    }
    setMessage("Enviamos as instrucoes de recuperacao para seu e-mail.");
  }

  async function resendConfirmation() {
    if (!email) {
      setError("Digite seu e-mail para reenviar a confirmacao.");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo: confirmationRedirect
      }
    });

    setLoading(false);
    if (resendError) {
      setError(translateAuthError(resendError.message));
      return;
    }

    setMessage("Se a conta estiver pendente, o Supabase reenviou o e-mail de confirmacao.");
  }

  return (
    <main className="mesh grid min-h-screen place-items-center px-4 py-10">
      <Card className="w-full max-w-md">
        <Logo />
        <h1 className="mt-8 text-2xl font-semibold">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">Autenticacao real via Supabase Auth. O profile e criado automaticamente pelo trigger do banco.</p>
        <form onSubmit={submit} className="mt-6 grid gap-4">
          {mode === "register" ? <Field label="Nome"><input className={inputClass} value={name} onChange={(event) => setName(event.target.value)} placeholder="Seu nome" required /></Field> : null}
          <Field label="E-mail"><input className={inputClass} type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="voce@email.com" required /></Field>
          {mode !== "forgot" ? <Field label="Senha"><input className={inputClass} type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="********" minLength={6} required /></Field> : null}
          {error ? <div className="rounded-lg border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">{error}</div> : null}
          {message ? <div className="rounded-lg border border-cyan/30 bg-cyan/10 p-3 text-sm text-cyan">{message}</div> : null}
          <Button type="submit" disabled={loading}>{loading ? "Processando..." : mode === "forgot" ? "Enviar recuperacao" : mode === "register" ? "Criar conta" : "Entrar"}</Button>
          {mode === "register" ? <Button type="button" variant="secondary" disabled={loading || !email} onClick={resendConfirmation}>Reenviar confirmacao</Button> : null}
        </form>
        <div className="mt-5 flex justify-between text-sm text-slate-400">
          <a href="/login">Login</a>
          <a href="/register">Cadastro</a>
          <a href="/forgot-password">Esqueci senha</a>
        </div>
      </Card>
    </main>
  );
}

export function ResetPasswordPage() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setError("As senhas nao conferem.");
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError(translateAuthError(updateError.message));
      return;
    }

    setMessage("Senha alterada com sucesso. Redirecionando para o dashboard...");
    setTimeout(() => {
      router.replace("/app/dashboard");
      router.refresh();
    }, 900);
  }

  return (
    <main className="mesh grid min-h-screen place-items-center px-4 py-10">
      <Card className="w-full max-w-md">
        <Logo />
        <h1 className="mt-8 text-2xl font-semibold">Redefinir senha</h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">Escolha uma nova senha para sua conta PhotoForge AI.</p>
        <form onSubmit={submit} className="mt-6 grid gap-4">
          <Field label="Nova senha"><input className={inputClass} type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="********" minLength={6} required /></Field>
          <Field label="Confirmar senha"><input className={inputClass} type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="********" minLength={6} required /></Field>
          {error ? <div className="rounded-lg border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">{error}</div> : null}
          {message ? <div className="rounded-lg border border-cyan/30 bg-cyan/10 p-3 text-sm text-cyan">{message}</div> : null}
          <Button type="submit" disabled={loading}>{loading ? "Salvando..." : "Salvar nova senha"}</Button>
        </form>
      </Card>
    </main>
  );
}

export function LegalPage({ type }: { type: "terms" | "privacy" | "image" }) {
  const copy = {
    terms: ["Termos de uso", "A plataforma deve ser usada apenas com autorizacao da pessoa fotografada. Nao e permitido criar conteudo enganoso, ilegal, intimo, ofensivo ou sem consentimento. Contas podem ser bloqueadas em caso de uso indevido."],
    privacy: ["Politica de privacidade", "A plataforma armazena imagens enviadas para processamento, dados de clientes e historico de geracoes. O usuario pode excluir dados. Quando provedores externos forem configurados, imagens poderao ser enviadas para processamento conforme contrato e configuracao."],
    image: ["Politica de uso de imagem", "O usuario e responsavel por ter autorizacao da pessoa fotografada. Fotos enviadas sao usadas para gerar o ensaio. Nao use fotos de terceiros sem autorizacao. A plataforma pode bloquear contas com uso indevido."]
  }[type];
  return (
    <main className="min-h-screen bg-ink px-4 py-10 text-white md:px-8">
      <div className="mx-auto max-w-3xl">
        <Logo />
        <Card className="mt-8">
          <h1 className="text-3xl font-semibold">{copy[0]}</h1>
          <p className="mt-5 text-sm leading-7 text-slate-300">{copy[1]}</p>
          <p className="mt-4 text-sm leading-7 text-slate-300">Este texto e uma base profissional inicial e nao substitui revisao juridica definitiva, especialmente para LGPD, consentimento e contratos comerciais.</p>
          <Button href="/" className="mt-6" variant="secondary">Voltar</Button>
        </Card>
      </div>
    </main>
  );
}
