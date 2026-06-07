-- Compatibilidade com schemas que exigem balance_before/balance_after.
-- Se preferir manter essas colunas obrigatorias, o app ja foi ajustado para preenche-las.
-- Este SQL só garante defaults para registros antigos/futuros administrativos.

alter table public.credit_transactions
add column if not exists balance_before int;

alter table public.credit_transactions
add column if not exists balance_after int;

update public.credit_transactions
set balance_before = 0
where balance_before is null;

update public.credit_transactions
set balance_after = balance_before + amount
where balance_after is null;

alter table public.credit_transactions
alter column balance_before set default 0;

alter table public.credit_transactions
alter column balance_after set default 0;

notify pgrst, 'reload schema';
