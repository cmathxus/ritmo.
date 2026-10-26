begin;
create table public.metabolic_profiles (
 user_id uuid primary key references public.profiles(id) on delete cascade,
 mode text not null check(mode in ('calculator','manual')),
 sex text check(sex in ('male','female')),
 weight numeric check(weight between 20 and 400),
 height numeric check(height between 100 and 250),
 age integer check(age between 18 and 120),
 activity text check(activity in ('none','moderate','intense')),
 basal_calories integer,
 daily_calories integer not null check(daily_calories between 1 and 15000),
 updated_at timestamptz not null default now()
);
alter table public.metabolic_profiles enable row level security;
-- Contas anteriores mantêm a base que já escolheram. Novas contas fazem onboarding.
insert into public.metabolic_profiles(user_id,mode,daily_calories)
select id,'manual',base_calories from public.profiles;
revoke all on public.metabolic_profiles from anon,authenticated;
grant select on public.metabolic_profiles to authenticated;
create policy metabolic_owner_read on public.metabolic_profiles for select to authenticated using(user_id=(select auth.uid()));
create function public.save_metabolic_profile(p_mode text,p_sex text default null,p_weight numeric default null,p_height numeric default null,p_age integer default null,p_activity text default null,p_manual integer default null)
returns void language plpgsql security definer set search_path='' as $$
declare owner_id uuid := (select auth.uid()); basal numeric; daily integer; factor numeric;
begin
 if owner_id is null then raise exception 'authentication_required'; end if;
 if p_mode='calculator' then
  if p_sex is null or p_sex not in ('male','female') or p_weight is null or p_weight not between 20 and 400 or p_height is null or p_height not between 100 and 250 or p_age is null or p_age not between 18 and 120 or p_activity is null or p_activity not in ('none','moderate','intense') then raise exception 'invalid_metabolism'; end if;
  if p_sex='male' then basal:=66+13.7*p_weight+5*p_height-6.8*p_age;factor:=case p_activity when 'none' then 1.25 when 'moderate' then 1.35 else 1.45 end;
  else basal:=655+9.6*p_weight+1.7*p_height-4.7*p_age;factor:=case p_activity when 'none' then 1.20 when 'moderate' then 1.30 else 1.40 end;end if;
  if basal<=0 then raise exception 'invalid_metabolism';end if;
  daily:=round(basal*factor);
 elsif p_mode='manual' and p_manual between 1 and 15000 then
  daily:=p_manual;p_sex:=null;p_weight:=null;p_height:=null;p_age:=null;p_activity:=null;
 else raise exception 'invalid_metabolism';end if;
 update public.profiles set base_calories=daily where id=owner_id;
 if not found then raise exception 'profile_missing';end if;
 insert into public.metabolic_profiles(user_id,mode,sex,weight,height,age,activity,basal_calories,daily_calories)
 values(owner_id,p_mode,p_sex,p_weight,p_height,p_age,p_activity,round(basal),daily)
 on conflict(user_id) do update set mode=excluded.mode,sex=excluded.sex,weight=excluded.weight,height=excluded.height,age=excluded.age,activity=excluded.activity,basal_calories=excluded.basal_calories,daily_calories=excluded.daily_calories,updated_at=now();
end;$$;
revoke all on function public.save_metabolic_profile(text,text,numeric,numeric,integer,text,integer) from public,anon;
grant execute on function public.save_metabolic_profile(text,text,numeric,numeric,integer,text,integer) to authenticated;
notify pgrst,'reload schema';
commit;
