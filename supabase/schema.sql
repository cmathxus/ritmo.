-- Execute no SQL Editor de um projeto NOVO do Supabase.
-- Cadastro aberto. Os diários só são compartilhados após aceitar um convite.
begin;

create table public.duos (
  id uuid primary key default gen_random_uuid(),
  invite_token uuid not null unique default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  duo_id uuid not null references public.duos(id),
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
create index profiles_duo_idx on public.profiles(duo_id);

-- Funções de leitura evitam recursão das políticas e não expõem a dupla de terceiros.
create function public.can_view_user(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles me join public.profiles other on other.duo_id=me.duo_id
    where me.id=(select auth.uid()) and other.id=target);
$$;
revoke all on function public.can_view_user(uuid) from public,anon;
grant execute on function public.can_view_user(uuid) to authenticated;

create function public.get_my_invite() returns uuid
language plpgsql security definer set search_path = '' as $$
declare duo uuid; token uuid;
begin
  select duo_id into duo from public.profiles where id=(select auth.uid());
  if duo is null then raise exception 'profile_missing'; end if;
  if (select count(*) from public.profiles where duo_id=duo)>=2 then raise exception 'duo_full'; end if;
  select invite_token into token from public.duos where id=duo;
  return token;
end;
$$;
revoke all on function public.get_my_invite() from public,anon;
grant execute on function public.get_my_invite() to authenticated;

create function public.join_duo(invite uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare target uuid; current_duo uuid;
begin
  if (select auth.uid()) is null then raise exception 'authentication_required'; end if;
  select id into target from public.duos where invite_token=invite;
  if target is null then raise exception 'invalid_invite'; end if;
  select duo_id into current_duo from public.profiles where id=(select auth.uid()) for update;
  if current_duo is null then raise exception 'profile_missing'; end if;
  -- Bloqueios em ordem estável: duas aceitações simultâneas nunca excedem duas pessoas.
  perform id from public.duos where id in (target,current_duo) order by id for update;
  if target=current_duo then return; end if;
  if (select count(*) from public.profiles where duo_id=current_duo)>1 then raise exception 'already_paired'; end if;
  if (select count(*) from public.profiles where duo_id=target)>=2 then raise exception 'duo_full'; end if;
  update public.profiles set duo_id=target where id=(select auth.uid());
  delete from public.duos where id=current_duo and not exists(select 1 from public.profiles where duo_id=current_duo);
end;
$$;
revoke all on function public.join_duo(uuid) from public,anon;
grant execute on function public.join_duo(uuid) to authenticated;

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare new_duo uuid;
begin
  insert into public.duos default values returning id into new_duo;
  insert into public.profiles (id,duo_id,name) values (
    new.id,new_duo,coalesce(nullif(left(trim(new.raw_user_meta_data ->> 'name'),40),''),'Pessoa')
  );
  return new;
end;
$$;
revoke all on function public.handle_new_user() from public, anon, authenticated;
create trigger on_auth_user_created after insert on auth.users
  for each row execute procedure public.handle_new_user();

alter table public.duos enable row level security;
alter table public.profiles enable row level security;
alter table public.daily_logs enable row level security;
alter table public.meals enable row level security;

revoke all on public.duos from anon,authenticated;
revoke all on public.profiles,public.daily_logs,public.meals from anon,authenticated;
grant select on public.profiles,public.daily_logs,public.meals to authenticated;
grant update(name,base_calories) on public.profiles to authenticated;
grant insert on public.daily_logs to authenticated;
grant update(extra_calories,activity) on public.daily_logs to authenticated;
grant insert,update,delete on public.meals to authenticated;

create policy profiles_read_duo on public.profiles for select to authenticated
using (public.can_view_user(id));
create policy profiles_update_self on public.profiles for update to authenticated
using (id=(select auth.uid()))
with check (id=(select auth.uid()));
create policy days_read_duo on public.daily_logs for select to authenticated
using (public.can_view_user(user_id));
create policy days_insert_self on public.daily_logs for insert to authenticated
with check (user_id=(select auth.uid()));
create policy days_update_self on public.daily_logs for update to authenticated
using (user_id=(select auth.uid()))
with check (user_id=(select auth.uid()));
create policy meals_read_duo on public.meals for select to authenticated
using (public.can_view_user(user_id));
create policy meals_insert_self on public.meals for insert to authenticated
with check (user_id=(select auth.uid()));
create policy meals_update_self on public.meals for update to authenticated
using (user_id=(select auth.uid()))
with check (user_id=(select auth.uid()));
create policy meals_delete_self on public.meals for delete to authenticated
using (user_id=(select auth.uid()));
notify pgrst, 'reload schema';
commit;
