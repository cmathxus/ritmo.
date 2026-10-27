begin;
alter table public.meals add column meal_time time;
-- Registros anteriores continuam sem horário informado; não inventamos horários históricos.
alter table public.meals alter column meal_time set default (now() at time zone 'America/Sao_Paulo')::time;
create index meals_user_date_time on public.meals(user_id,date,meal_time);
alter table public.metabolic_profiles add column goal text not null default 'maintenance' check(goal in ('deficit','maintenance','surplus'));
alter table public.metabolic_profiles add column method text not null default 'unimed' check(method in ('unimed','pal'));
alter table public.metabolic_profiles add column pal numeric check(pal between 1.4 and 2.4);
drop function public.save_metabolic_profile(text,text,numeric,numeric,integer,text,integer);
create function public.save_metabolic_profile(p_mode text,p_sex text default null,p_weight numeric default null,p_height numeric default null,p_age integer default null,p_activity text default null,p_manual integer default null,p_goal text default 'maintenance',p_method text default 'unimed',p_pal numeric default null)
returns void language plpgsql security definer set search_path='' as $$
declare owner_id uuid:=(select auth.uid());basal numeric;daily integer;factor numeric;
begin
 if owner_id is null then raise exception 'authentication_required';end if;
 if p_goal is null or p_goal not in ('deficit','maintenance','surplus') or p_method is null or p_method not in ('unimed','pal') then raise exception 'invalid_metabolism';end if;
 if p_mode='calculator' then
  if p_sex is null or p_sex not in ('male','female') or p_weight is null or p_weight not between 20 and 400 or p_height is null or p_height not between 100 and 250 or p_age is null or p_age not between 18 and 120 then raise exception 'invalid_metabolism';end if;
  if p_sex='male' then basal:=66+13.7*p_weight+5*p_height-6.8*p_age;else basal:=655+9.6*p_weight+1.7*p_height-4.7*p_age;end if;
  if p_method='pal' then
   if p_pal is null or p_pal not between 1.4 and 2.4 then raise exception 'invalid_metabolism';end if;
   factor:=p_pal;p_activity:=null;
  else
   if p_activity is null or p_activity not in ('none','moderate','intense') then raise exception 'invalid_metabolism';end if;
   if p_sex='male' then factor:=case p_activity when 'none' then 1.25 when 'moderate' then 1.35 else 1.45 end;
   else factor:=case p_activity when 'none' then 1.20 when 'moderate' then 1.30 else 1.40 end;end if;
   p_pal:=null;
  end if;
  if basal<=0 then raise exception 'invalid_metabolism';end if;daily:=round(basal*factor);
 elsif p_mode='manual' and p_manual between 1 and 15000 then
  daily:=p_manual;p_sex:=null;p_weight:=null;p_height:=null;p_age:=null;p_activity:=null;p_pal:=null;p_method:='unimed';
 else raise exception 'invalid_metabolism';end if;
 update public.profiles set base_calories=daily where id=owner_id;
 if not found then raise exception 'profile_missing';end if;
 insert into public.metabolic_profiles(user_id,mode,sex,weight,height,age,activity,basal_calories,daily_calories,goal,method,pal)
 values(owner_id,p_mode,p_sex,p_weight,p_height,p_age,p_activity,round(basal),daily,p_goal,p_method,p_pal)
 on conflict(user_id) do update set mode=excluded.mode,sex=excluded.sex,weight=excluded.weight,height=excluded.height,age=excluded.age,activity=excluded.activity,basal_calories=excluded.basal_calories,daily_calories=excluded.daily_calories,goal=excluded.goal,method=excluded.method,pal=excluded.pal,updated_at=now();
end;$$;
revoke all on function public.save_metabolic_profile(text,text,numeric,numeric,integer,text,integer,text,text,numeric) from public,anon;
grant execute on function public.save_metabolic_profile(text,text,numeric,numeric,integer,text,integer,text,text,numeric) to authenticated;
notify pgrst,'reload schema';
commit;
