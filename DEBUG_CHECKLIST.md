# PhotoForge AI - Debug Checklist

Use este checklist antes de concluir qualquer tarefa no MVP.

## 1. Como testar login

1. Abrir `/login`.
2. Entrar com usuario existente.
3. Confirmar redirecionamento para `/app/dashboard`.
4. Confirmar que logout volta para `/login`.
5. Confirmar que usuario nao autenticado acessando `/app/dashboard` volta para `/login`.
6. Confirmar que usuario comum nao entra em `/admin`.

Se falhar:

- Verificar `.env.local`.
- Verificar Supabase Auth Users.
- Verificar cookies/sessao.
- Verificar middleware.

## 2. Como testar cliente

1. Acessar `/app/clients/new`.
2. Informar nome.
3. Informar WhatsApp valido com DDD.
4. Informar e-mail valido.
5. Informar idade numerica se usar idade.
6. Salvar.
7. Confirmar que abre `/app/clients/[id]`.
8. Confirmar no Supabase Table Editor que `public.clients` recebeu a linha.
9. Confirmar `clients.user_id = auth.user.id`.
10. Dar F5 e confirmar que cliente continua na lista.
11. Clicar `Editar`, alterar dados e salvar.

Valores de `clients.status` devem ser tecnicos:

- `new`
- `waiting_photos`
- `ready`
- `generating`
- `review`
- `delivered`
- `cancelled`

Nunca salvar `Novo`, `Entregue` etc. no banco.

## 3. Como testar ensaio

1. Acessar `/app/shoots/new`.
2. Preencher nome do ensaio.
3. Selecionar cliente.
4. Escolher categoria.
5. Clicar continuar.
6. Confirmar que o ensaio foi criado como `draft`.
7. Confirmar no Supabase que `shoots.user_id = auth.user.id`.
8. Abrir `/app/shoots/[id]`.
9. Clicar `Editar`.
10. Confirmar que aparecem dados do ensaio e fotos do ensaio.
11. Editar dados e salvar.

Se aparecer erro de schema cache:

- Verificar SQLs em `supabase/fix-*.sql`.
- Rodar `notify pgrst, 'reload schema';`.

## 4. Como testar upload

1. Criar ou abrir ensaio em rascunho.
2. Enviar as 4 fotos obrigatorias:
   - `face_neutral`
   - `face_smiling`
   - `full_body_front`
   - `full_body_side`
3. Confirmar preview na interface.
4. Confirmar arquivos no bucket `client-reference-photos`.
5. Confirmar caminho:

```text
{user_id}/{client_id}/{shoot_id}/{type}/{filename}
```

6. Confirmar linhas em `public.reference_photos`.
7. Confirmar campos:
   - `user_id`
   - `client_id`
   - `shoot_id`
   - `type`
   - `storage_path`
   - `file_url`
   - `quality_status`
   - `created_at`
8. Remover uma foto.
9. Confirmar que o registro foi removido do banco.
10. Confirmar que o checklist volta para pendente.

Arquivos aceitos:

- JPG/JPEG
- PNG
- WEBP
- Ate 10 MB

## 5. Como testar geracao mock

1. Abrir ensaio com as 4 fotos obrigatorias reais.
2. Marcar consentimento.
3. Escolher quantidade:
   - 4
   - 8
   - 16
4. Confirmar que checklist mostra:
   - Cliente selecionada: OK
   - Fotos obrigatorias enviadas: OK
   - Categoria escolhida: OK
   - Consentimento confirmado: OK
   - Creditos suficientes: OK
5. Clicar gerar.
6. Confirmar que o backend:
   - cria `generation_logs.status = pending`
   - desconta creditos
   - cria `credit_transactions.type = usage`
   - cria `generated_images`
   - atualiza `generation_logs.status = success`
   - atualiza `shoots.status = completed`
7. Confirmar imagens no ensaio.
8. Confirmar imagens em `/app/gallery`.
9. Dar F5 e confirmar persistencia.

## 6. Como testar creditos

1. Ver saldo em `/app/dashboard`.
2. Gerar 4 imagens.
3. Confirmar desconto de 4 creditos.
4. Confirmar `credits.balance` no Supabase.
5. Confirmar `credit_transactions` com:
   - `type = usage`
   - `amount = -4`
   - `balance_before`
   - `balance_after`
6. Reduzir saldo para menos que quantidade desejada.
7. Tentar gerar.
8. Confirmar mensagem `Creditos insuficientes`.
9. Confirmar que saldo nao mudou.

## 7. Como testar admin

1. Entrar com e-mail admin configurado em `ADMIN_EMAIL`.
2. Confirmar `profiles.role = admin`.
3. Confirmar que menu Admin aparece.
4. Acessar `/admin`.
5. Confirmar metricas:
   - usuarios totais
   - creditos em circulacao
   - imagens geradas
   - ensaios totais
   - logs com erro
   - usuarios bloqueados
   - provider ativo
6. Confirmar que aparecem:
   - `generation_logs`
   - `credit_transactions`
7. Entrar com usuario comum.
8. Confirmar que menu Admin nao aparece.
9. Tentar `/admin` direto.
10. Confirmar redirect para `/app/dashboard`.

## 8. Como testar RLS

1. Criar dados com usuario A.
2. Sair.
3. Entrar com usuario B.
4. Confirmar que usuario B nao ve:
   - clientes do usuario A
   - ensaios do usuario A
   - fotos do usuario A
   - galeria do usuario A
   - creditos/transacoes do usuario A
5. Verificar no Table Editor que cada tabela usa `user_id = auth.user.id`.
6. Confirmar policies:
   - `auth.uid() = user_id` para usuario comum.
   - admin via `public.is_admin()` onde aplicavel.
7. Nunca colocar `public.is_admin()` em policy da propria tabela `profiles`.

## 9. Como rodar build

Com npm normal:

```bash
npm run build
```

Nesta maquina, se o npm global falhar, usar:

```bash
cmd /c npm run build
```

Build deve terminar sem erro de TypeScript/Next.

Se o Next reclamar de cache estranho:

```powershell
Remove-Item -Recurse -Force .next
cmd /c npm run build
```

## 10. Logs de erro esperados em desenvolvimento

Sempre que Supabase falhar, o console deve registrar:

```ts
console.error("Supabase error", {
  message: error.message,
  details: error.details,
  hint: error.hint,
  code: error.code,
  full: error
});
```

Use `dev-server.log` para procurar erros backend:

```powershell
Get-Content dev-server.log -Tail 200
```

## 11. Checklist final antes de entregar

- Login funciona.
- Cliente cria e edita.
- Ensaio cria e edita.
- Upload das 4 fotos obrigatorias funciona.
- Checklist depende de `reference_photos` real.
- Geracao sem credito bloqueia.
- Geracao com credito desconta.
- Transacao `usage` e criada.
- Log `pending` vira `success`.
- Imagens aparecem no ensaio.
- Imagens aparecem na galeria.
- Favorito/preview/download/soft delete funcionam.
- Dashboard atualiza.
- Admin e usuario comum ficam separados.
- F5 nao perde dados.
- `cmd /c npm run build` passa.
