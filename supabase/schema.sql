-- Execute no SQL Editor de um projeto NOVO do Supabase.
-- ANTES: substitua os dois e-mails abaixo pelos e-mails reais da dupla.
begin;

create table public.allowed_members (
  slot smallint primary key check (slot between 1 and 2),
  email text not null unique check (email = lower(trim(email)))
);
insert into public.allowed_members(slot,email) values
  (1,'seu-email@exemplo.com'),
  (2,'email-do-amigo@exemplo.com');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 40),
  base_calories integer not null default 2400 check (base_calories between 1 and 15000)
);
create table public.daily_logs (
  user_id uuid not null references public.profiles(id) on delete cascade,
  date date not null,
  base_calories integer not null check (base_calories between 1 and 15000),
  extra_calories integer not null default 0 check (extra_calories between 0 and 10000),
  activity text not null default '' check (char_length(activity) <= 120),
  primary key (user_id,date)
);
create table public.meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  date date not null,
  name text not null check (char_length(trim(name)) between 1 and 120),
  calories integer not null check (calories between 1 and 20000),
  category text not null check (category in ('Café da manhã','Almoço','Lanche','Jantar','Outros')),
  created_at timestamptz not null default now(),
  foreign key (user_id,date) references public.daily_logs(user_id,date) on delete cascade
);
create index meals_date_idx on public.meals(date,user_id);
create index daily_logs_date_idx on public.daily_logs(date);

-- SECURITY DEFINER com search_path vazio evita recursão de RLS e resolve
-- todos os objetos explicitamente. Somente membros da lista podem ler dados.
create function public.is_duo_member() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from auth.users u join public.allowed_members a on a.email = lower(u.email)
    where u.id = (select auth.uid())
  );
$$;
revoke all on function public.is_duo_member() from public, anon;
grant execute on function public.is_duo_member() to authenticated;

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.allowed_members where email=lower(new.email)) then
    raise exception 'not_allowed: email is not authorized';
  end if;
  insert into public.profiles (id,name) values (
    new.id, coalesce(nullif(left(trim(new.raw_user_meta_data ->> 'name'),40),''),'Pessoa')
  );
  return new;
end;
$$;
revoke all on function public.handle_new_user() from public, anon, authenticated;
create trigger on_auth_user_created after insert on auth.users
  for each row execute procedure public.handle_new_user();

alter table public.allowed_members enable row level security;
alter table public.profiles enable row level security;
alter table public.daily_logs enable row level security;
alter table public.meals enable row level security;

revoke all on public.allowed_members from anon,authenticated;
revoke all on public.profiles,public.daily_logs,public.meals from anon,authenticated;
grant select on public.profiles,public.daily_logs,public.meals to authenticated;
grant update(name,base_calories) on public.profiles to authenticated;
grant insert on public.daily_logs to authenticated;
grant update(extra_calories,activity) on public.daily_logs to authenticated;
grant insert,update,delete on public.meals to authenticated;

create policy profiles_read_duo on public.profiles for select to authenticated
using ((select public.is_duo_member()));
create policy profiles_update_self on public.profiles for update to authenticated
using (id=(select auth.uid()) and (select public.is_duo_member()))
with check (id=(select auth.uid()) and (select public.is_duo_member()));
create policy days_read_duo on public.daily_logs for select to authenticated
using ((select public.is_duo_member()));
create policy days_insert_self on public.daily_logs for insert to authenticated
with check (user_id=(select auth.uid()) and (select public.is_duo_member()));
create policy days_update_self on public.daily_logs for update to authenticated
using (user_id=(select auth.uid()) and (select public.is_duo_member()))
with check (user_id=(select auth.uid()) and (select public.is_duo_member()));
create policy meals_read_duo on public.meals for select to authenticated
using ((select public.is_duo_member()));
create policy meals_insert_self on public.meals for insert to authenticated
with check (user_id=(select auth.uid()) and (select public.is_duo_member()));
create policy meals_update_self on public.meals for update to authenticated
using (user_id=(select auth.uid()) and (select public.is_duo_member()))
with check (user_id=(select auth.uid()) and (select public.is_duo_member()));
create policy meals_delete_self on public.meals for delete to authenticated
using (user_id=(select auth.uid()) and (select public.is_duo_member()));
commit;
