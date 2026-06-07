# PhotoForge AI - Project Context

## 1. Objetivo do app

PhotoForge AI e um SaaS para criar ensaios fotograficos realistas com IA para clientes finais. O MVP atual deve funcionar de ponta a ponta com `mockProvider`, sem IA real e sem pagamento real:

cliente -> ensaio -> upload das fotos -> checklist -> geracao mock -> desconto de creditos -> transacao -> log -> imagens salvas -> galeria -> dashboard atualizado.

## 2. Stack usada

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- Supabase Auth
- Supabase PostgreSQL com RLS
- Supabase Storage
- `@supabase/ssr`
- `@supabase/supabase-js`
- `lucide-react`
- Provider de IA abstrato em `lib/ai/providers`
- Deploy previsto: Vercel integrada ao GitHub

Arquivos importantes:

- `components/ClientApp.tsx`: telas autenticadas principais.
- `components/AppShell.tsx`: layout e menu autenticado.
- `components/PublicPages.tsx`: login, cadastro, esqueci senha e reset.
- `app/api/generate/route.ts`: geracao mock, creditos, logs e imagens.
- `app/api/admin/overview/route.ts`: metricas admin.
- `lib/supabase/client.ts`: Supabase frontend.
- `lib/supabase/server.ts`: Supabase server com cookies.
- `lib/supabase/admin.ts`: Supabase service role, backend only.
- `lib/supabase/currentUser.ts`: helper de usuario autenticado.
- `supabase/schema.sql`: schema base.
- `supabase/migrations`: migrations base.
- `supabase/fix-*.sql`: correcoes incrementais usadas durante o MVP.

## 3. Fluxo principal

1. Usuario cria conta ou faz login com Supabase Auth.
2. App garante `profiles` e `credits` para `auth.user.id`.
3. Usuario cria cliente em `public.clients`.
4. Usuario cria ensaio em `public.shoots`.
5. Ensaio e salvo como `draft` antes do upload, pois uploads precisam de `shoot_id`.
6. Usuario faz upload das fotos obrigatorias e opcionais para Supabase Storage.
7. Cada upload cria/atualiza registro em `public.reference_photos`.
8. Checklist de geracao so libera quando as 4 fotos obrigatorias existem no banco.
9. Usuario confirma consentimento.
10. Backend valida sessao, ownership, fotos, consentimento e creditos reais.
11. Backend cria log `pending`, desconta creditos, cria `credit_transactions` usage.
12. `mockProvider` gera placeholders.
13. Backend salva `generated_images`, marca log `success`, marca ensaio `completed`.
14. Dashboard, ensaio e galeria recarregam dados reais do Supabase.

## 4. Tabelas Supabase

Tabelas principais:

- `profiles`: perfil do usuario, role, plano e status.
- `clients`: clientes cadastrados pelo usuario.
- `shoots`: ensaios criados pelo usuario.
- `reference_photos`: fotos enviadas para referencia do ensaio.
- `generated_images`: imagens mock/geradas.
- `credits`: saldo atual de creditos por usuario.
- `credit_transactions`: historico de uso, compra, ajuste e reembolso.
- `generation_logs`: logs de geracao.
- `plans`: planos preparados para futuro pagamento.
- `app_settings`: configuracoes gerais.
- `security_logs`: logs de seguranca.

Storage:

- Bucket `client-reference-photos`: fotos reais enviadas pelo usuario.
- Bucket `generated-images`: preparado para imagens reais futuras.
- Bucket `user-uploads`: preparado para uploads gerais.

## 5. auth.user.id vs profiles.id vs profiles.user_id

Esses ids nao devem ser confundidos:

- `auth.user.id`: id real do usuario no Supabase Auth.
- `profiles.id`: id interno da linha na tabela `profiles`.
- `profiles.user_id`: referencia para `auth.users.id`.

O app deve tratar `auth.user.id` como identidade operacional do usuario.

## 6. Regra obrigatoria de user_id

Todas as tabelas operacionais devem usar `auth.user.id` no campo `user_id`.

Tabelas operacionais:

- `clients.user_id`
- `shoots.user_id`
- `reference_photos.user_id`
- `generated_images.user_id`
- `credits.user_id`
- `credit_transactions.user_id`
- `generation_logs.user_id`
- `security_logs.user_id`

Nunca usar `profiles.id` como `user_id` operacional.

Para obter usuario no frontend:

- Use `supabase.auth.getUser()`.
- Ou use helpers em `lib/supabase/currentUser.ts`.

Para saber se e admin:

- Buscar `profiles` por `profiles.user_id = auth.user.id`.

## 7. Regras de RLS

Regras gerais:

- Usuario comum so ve seus proprios dados.
- Policies operacionais usam `auth.uid() = user_id`.
- Admin pode acessar dados administrativos por policies que usam `public.is_admin()`.
- Policies da propria tabela `profiles` nao devem chamar `public.is_admin()`, para evitar recursao infinita.
- `public.is_admin()` consulta `profiles` por `user_id = auth.uid()` e `role = 'admin'`.

Admin:

- Menu Admin so aparece se `profile.role === 'admin'` e `status === 'active'`.
- `/admin` valida role no servidor em `app/admin/layout.tsx`.
- Middleware tambem protege `/admin`.

## 8. Regras de creditos

Regra MVP:

- 1 imagem = 1 credito.
- 4 imagens = 4 creditos.
- 8 imagens = 8 creditos.
- 16 imagens = 16 creditos.

Antes de gerar:

- Buscar saldo real em `public.credits` por `user_id = auth.user.id`.
- Se saldo insuficiente, bloquear geracao e nao descontar nada.
- Mostrar `Creditos insuficientes`.

Durante geracao:

- Criar `generation_logs` com `status = pending`.
- Descontar saldo em `credits`.
- Criar `credit_transactions` com `type = usage`.
- Preencher `balance_before` e `balance_after` se existirem no schema real.

Em falha depois do desconto:

- Marcar `shoots.status = failed`.
- Marcar `generation_logs.status = failed`.
- Reembolsar creditos.
- Criar `credit_transactions` com `type = refund`.

## 9. Regras de upload

Bucket:

- `client-reference-photos`

Caminho:

```text
{user_id}/{client_id}/{shoot_id}/{type}/{filename}
```

Tipos aceitos:

- JPG
- JPEG
- PNG
- WEBP

Limite:

- 10 MB por arquivo.

Fotos obrigatorias:

- `face_neutral`
- `face_smiling`
- `full_body_front`
- `full_body_side`

Fotos opcionais:

- `tattoo_arm`
- `tattoo_leg`
- `back`
- `hair_detail`
- `outfit_reference`
- `extra`

Cada upload deve:

- Usar `auth.user.id` como `user_id`.
- Fazer upload real para Storage.
- Salvar `storage_path` e/ou `file_url`.
- Criar registro em `public.reference_photos`.
- Permitir preview.
- Permitir remover/substituir.

## 10. Regras de geracao mock

O MVP usa apenas `mockProvider`.

Nao integrar IA real ainda.

Backend de geracao:

- Rota: `app/api/generate/route.ts`.
- Deve validar usuario logado.
- Deve validar que o ensaio pertence ao usuario.
- Deve validar que a cliente pertence ao usuario.
- Deve buscar fotos obrigatorias reais em `reference_photos`.
- Deve validar `consent_confirmed = true`.
- Deve validar creditos reais.
- Deve montar prompt premium com `buildPremiumPrompt`.
- Deve chamar `generateImagesWithProvider`.
- Deve salvar imagens em `generated_images`.
- Deve atualizar dashboard/galeria apos reload.

## 11. Regras futuras para provider real

Providers preparados:

- `lib/ai/providers/base.ts`
- `lib/ai/providers/mockProvider.ts`
- `lib/ai/providers/fluxProvider.ts`
- `lib/ai/providers/openaiProvider.ts`
- `lib/ai/providers/geminiProvider.ts`

Quando integrar provider real:

- Chaves ficam apenas em variaveis de ambiente server-side.
- Nunca expor chave no frontend.
- Uploads privados devem usar signed URLs ou proxy backend.
- Provider real deve ser chamado somente no backend.
- Deve manter fluxo de creditos/logs/reembolso.
- Deve registrar custo estimado e payload seguro.
- Deve tratar falhas com refund quando houver desconto previo.

## 12. O que nao pode ser feito

- Nao usar `profiles.id` como `user_id` operacional.
- Nao expor `SUPABASE_SERVICE_ROLE_KEY` no frontend.
- Nao integrar IA real sem pedido explicito.
- Nao implementar pagamento real sem pedido explicito.
- Nao desativar RLS para resolver erro rapidamente.
- Nao remover policies de seguranca sem substituir por policies equivalentes.
- Nao usar dados demo/localStorage no fluxo autenticado real.
- Nao considerar dropdown ou estado local como upload valido.
- Nao gerar sem as 4 fotos obrigatorias reais no banco.
- Nao descontar credito se saldo for insuficiente.
- Nao misturar dashboard admin com dashboard de usuario comum.

## 13. Checklist antes de mexer em codigo

Antes de alterar:

- Ler `PROJECT_CONTEXT.md`.
- Ler `DEBUG_CHECKLIST.md`.
- Procurar usos de `profile.id`, `profile.user_id` e `user_id`.
- Confirmar se a alteracao e frontend, backend ou banco.
- Se mexer em banco, atualizar `supabase/schema.sql` e criar/ajustar arquivo em `supabase/migrations` ou `supabase/fix-*.sql`.
- Se mexer em upload, validar Storage e `reference_photos`.
- Se mexer em geracao, validar creditos, logs, transacoes e refund.
- Se mexer em admin, validar usuario comum e admin.
- Rodar `npm run build` ou `cmd /c npm run build` nesta maquina se o npm direto falhar.
- Reiniciar o servidor local apos mudancas relevantes.

## Ferramentas e integracoes recomendadas

Estas integracoes nao fazem parte do runtime obrigatorio do MVP, mas devem ser configuradas para evolucao do projeto:

- GitHub: versionar o repositorio e abrir PRs.
- Vercel: conectar ao GitHub e configurar variaveis de ambiente.
- Supabase CLI/local: manter migrations e testar schema local quando possivel.
- Codex no VS Code ou Trae: usar este arquivo como contexto inicial.
- Sentry ou Logtail: observabilidade futura para erros frontend/backend.

Ao configurar ferramentas externas, registrar passos e decisoes no `README.md`.
