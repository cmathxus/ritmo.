begin;
-- Um registro importado preserva a base, mas não comprova que a pessoa fez o formulário.
alter table public.metabolic_profiles add column onboarding_completed boolean not null default false;
update public.metabolic_profiles set onboarding_completed=true where mode='calculator';
create function public.mark_metabolic_onboarding_completed() returns trigger
language plpgsql set search_path='' as $$
begin
 new.onboarding_completed:=true;
 return new;
end;$$;
revoke all on function public.mark_metabolic_onboarding_completed() from public,anon,authenticated;
-- Apenas a RPC autenticada pode escrever na tabela. O backfill anterior não dispara este trigger.
create trigger complete_metabolic_onboarding before insert or update on public.metabolic_profiles
for each row execute function public.mark_metabolic_onboarding_completed();
notify pgrst,'reload schema';
commit;
