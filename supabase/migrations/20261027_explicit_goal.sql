begin;
alter table public.metabolic_profiles add column goal_selected boolean not null default false;
-- Defaults antigos não comprovam uma escolha. Mantemos o valor, mas pedimos confirmação.
create function public.confirm_selected_goal() returns trigger language plpgsql set search_path='' as $$
begin new.goal_selected:=true;return new;end;$$;
revoke all on function public.confirm_selected_goal() from public,anon,authenticated;
create trigger explicit_metabolic_goal before insert or update on public.metabolic_profiles for each row execute function public.confirm_selected_goal();
create function public.set_personal_goal(p_goal text) returns void language plpgsql security definer set search_path='' as $$
begin
 if (select auth.uid()) is null then raise exception 'authentication_required';end if;
 if p_goal is null or p_goal not in ('deficit','maintenance','surplus') then raise exception 'invalid_goal';end if;
 update public.metabolic_profiles set goal=p_goal,updated_at=now() where user_id=(select auth.uid());
 if not found then raise exception 'profile_missing';end if;
end;$$;
revoke all on function public.set_personal_goal(text) from public,anon;
grant execute on function public.set_personal_goal(text) to authenticated;
notify pgrst,'reload schema';
commit;
