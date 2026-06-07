# PhotoForge AI

SaaS em Next.js para criar ensaios fotograficos realistas com IA para clientes finais. A versao atual usa Supabase Auth real, PostgreSQL com RLS, buckets privados, `mockProvider`, sistema de creditos, galeria, dashboard e admin.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase Auth, PostgreSQL e Storage
- Provider abstrato em `lib/ai/providers`
- Deploy pronto para Vercel

## Rodar localmente

```bash
cp .env.example .env.local
npm install
npm run dev
```

Preencha `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
AI_PROVIDER=mock
APP_URL=http://localhost:3000
ADMIN_EMAIL=
```

Abra `http://localhost:3000`. Login, cadastro, recuperacao de senha e logout usam Supabase Auth real.

> Observacao neste ambiente: o `npm` global desta maquina estava quebrado. Usei `corepack pnpm install`, `corepack pnpm typecheck` e `corepack pnpm build` para validar.

## Supabase

1. Abra o Supabase Dashboard.
2. Entre no projeto.
3. Va em **SQL Editor**.
4. Crie uma nova query.
5. Cole todo o conteudo de `supabase/schema.sql`.
6. Clique em **Run**.

O `schema.sql` cria:

- tabelas do app
- enums
- indexes
- triggers
- profile automatico ao criar usuario
- saldo inicial de creditos
- RLS
- policies
- buckets privados de storage

Buckets criados:

- `user-uploads`
- `client-reference-photos`
- `generated-images`

Os buckets ficam privados. Para upload seguro, salve arquivos com caminho iniciado pelo `user_id`, por exemplo `USER_ID/arquivo.webp`, e use signed URLs quando precisar exibir imagens privadas.

## Admin

O `schema.sql` insere `admin_email` em `app_settings`. Quando um usuario novo e criado, o trigger `handle_new_user` compara o e-mail cadastrado com esse valor:

- e-mail igual ao `admin_email`: `role = admin`, `plan_type = admin`, `status = active`
- outros usuarios: `role = user`, `plan_type = public`, `status = active`

Se o usuario admin ja existir antes de rodar o schema, execute no SQL Editor:

```sql
update public.profiles
set role = 'admin', plan_type = 'admin', status = 'active'
where email = 'SEU_EMAIL_ADMIN';
```

## Seguranca

- `lib/supabase/client.ts` usa apenas `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- `lib/supabase/server.ts` usa a anon key com cookies de sessao no servidor.
- `lib/supabase/admin.ts` usa `SUPABASE_SERVICE_ROLE_KEY` apenas no backend e importa `server-only`.
- Nunca exponha `SUPABASE_SERVICE_ROLE_KEY` ou chaves de IA no frontend.

## Providers reais

Nao ha IA real integrada ainda. Arquivos preparados:

- `lib/ai/providers/base.ts`
- `lib/ai/providers/mockProvider.ts`
- `lib/ai/providers/fluxProvider.ts`
- `lib/ai/providers/openaiProvider.ts`
- `lib/ai/providers/geminiProvider.ts`
- `lib/ai/generateImage.ts`
- `lib/ai/buildPremiumPrompt.ts`

Para trocar o provider, implemente o request mapping no provider escolhido, guarde a chave somente em variavel de ambiente e chame tudo pelo backend.

## Deploy Vercel

1. Envie o repositorio para GitHub.
2. Importe na Vercel.
3. Configure as variaveis de ambiente.
4. Rode build com `npm run build`.
