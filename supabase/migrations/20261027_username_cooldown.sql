begin;
alter table public.profiles add column username_next_change_at timestamptz;
-- Nomes provisórios podem ser personalizados imediatamente. Os já escolhidos passam a ter o prazo de três meses.
update public.profiles set username_next_change_at=now()+interval '3 months'
where username<>'u_'||right(replace(id::text,'-',''),20);
create or replace function public.set_username(p_username text) returns void language plpgsql security definer set search_path='' as $$
declare handle text:=lower(trim(p_username));current_profile public.profiles;
begin
 if (select auth.uid()) is null then raise exception 'authentication_required';end if;
 if handle is null or handle!~'^[a-z0-9_]{3,24}$' then raise exception 'invalid_username';end if;
 select * into current_profile from public.profiles where id=(select auth.uid()) for update;
 if not found then raise exception 'profile_missing';end if;
 if handle=current_profile.username then return;end if;
 if current_profile.username_next_change_at>now() then raise exception 'username_cooldown';end if;
 update public.profiles set username=handle,username_next_change_at=now()+interval '3 months' where id=current_profile.id;
end;$$;
notify pgrst,'reload schema';
commit;
