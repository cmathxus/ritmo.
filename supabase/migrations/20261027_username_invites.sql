begin;
alter table public.profiles add column username text unique check(username ~ '^[a-z0-9_]{3,24}$');
-- Identificadores provisórios únicos; cada pessoa pode escolher seu @ em Preferências.
update public.profiles set username='u_'||right(replace(id::text,'-',''),20);
-- UUID completo excede o limite de nomes escolhidos; provisórios usam 20 caracteres do UUID.
alter table public.profiles drop constraint profiles_username_check;
update public.profiles set username='u_'||right(replace(id::text,'-',''),20);
alter table public.profiles add constraint profiles_username_check check(username ~ '^[a-z0-9_]{3,24}$');
create function public.assign_username() returns trigger language plpgsql set search_path='' as $$
begin new.username:='u_'||right(replace(new.id::text,'-',''),20);return new;end;$$;
revoke all on function public.assign_username() from public,anon,authenticated;
create trigger profile_username before insert on public.profiles for each row execute function public.assign_username();
create function public.set_username(p_username text) returns void language plpgsql security definer set search_path='' as $$
declare handle text:=lower(trim(p_username));begin
 if (select auth.uid()) is null then raise exception 'authentication_required';end if;
 if handle!~'^[a-z0-9_]{3,24}$' or handle is null then raise exception 'invalid_username';end if;
 update public.profiles set username=handle where id=(select auth.uid());
end;$$;
revoke all on function public.set_username(text) from public,anon;
grant execute on function public.set_username(text) to authenticated;
create table public.group_notifications(
 id uuid primary key default gen_random_uuid(),recipient_id uuid not null references public.profiles(id) on delete cascade,
 group_id uuid not null references public.groups(id) on delete cascade,sender_id uuid references public.profiles(id) on delete set null,
 group_name text not null,sender_name text not null,status text not null default 'pending' check(status in ('pending','accepted','declined','cancelled')),
 created_at timestamptz not null default now(),expires_at timestamptz not null default now()+interval '7 days'
);
create unique index group_pending_recipient on public.group_notifications(group_id,recipient_id) where status='pending';
create index notifications_recipient on public.group_notifications(recipient_id,created_at desc);
alter table public.group_notifications enable row level security;
revoke all on public.group_notifications from anon,authenticated;
grant select on public.group_notifications to authenticated;
create policy notification_recipient_read on public.group_notifications for select to authenticated using(recipient_id=(select auth.uid()));
create function public.invite_group_username(p_group_id uuid,p_username text) returns jsonb language plpgsql security definer set search_path='' as $$
declare target uuid;handle text:=lower(trim(ltrim(p_username,'@')));gname text;sname text;
begin
 perform public.require_group_admin(p_group_id);
 if not public.consume_group_invite_attempt() then return jsonb_build_object('error','invite_rate_limit');end if;
 select id into target from public.profiles where username=handle;
 if target is null then return jsonb_build_object('error','username_not_found');end if;
 if target=(select auth.uid()) then return jsonb_build_object('error','invite_self');end if;
 if exists(select 1 from public.group_members where user_id=target) then return jsonb_build_object('error','recipient_grouped');end if;
 if (select count(*) from public.group_members where group_id=p_group_id)>=10 then return jsonb_build_object('error','group_full');end if;
 if (select count(*) from public.group_notifications where sender_id=(select auth.uid()) and created_at>now()-interval '1 day')>=30 then return jsonb_build_object('error','invite_rate_limit');end if;
 update public.group_notifications set status='cancelled' where group_id=p_group_id and recipient_id=target and status='pending' and expires_at<=now();
 if exists(select 1 from public.group_notifications where group_id=p_group_id and recipient_id=target and status='pending') then return jsonb_build_object('error','invite_pending');end if;
 select name into gname from public.groups where id=p_group_id;select name into sname from public.profiles where id=(select auth.uid());
 insert into public.group_notifications(recipient_id,group_id,sender_id,group_name,sender_name) values(target,p_group_id,(select auth.uid()),gname,sname);
 insert into public.group_signals values(target,1) on conflict(user_id) do update set revision=public.group_signals.revision+1;
 return jsonb_build_object('sent',true);
end;$$;
create function public.respond_group_notification(p_id uuid,p_accept boolean) returns jsonb language plpgsql security definer set search_path='' as $$
declare notice public.group_notifications;gid uuid;begin
 select group_id into gid from public.group_notifications where id=p_id and recipient_id=(select auth.uid());
 if gid is null then return jsonb_build_object('error','invite_missing');end if;
 perform id from public.groups where id=gid for update;
 select * into notice from public.group_notifications where id=p_id and recipient_id=(select auth.uid()) for update;
 if notice.status<>'pending' or notice.expires_at<=now() or not exists(select 1 from public.groups where id=gid and archived_at is null) then return jsonb_build_object('error','invite_missing');end if;
 if p_accept then
  perform id from public.profiles where id=(select auth.uid()) for update;
  if exists(select 1 from public.group_members where user_id=(select auth.uid())) then return jsonb_build_object('error','already_grouped');end if;
  if (select count(*) from public.group_members where group_id=gid)>=10 then return jsonb_build_object('error','group_full');end if;
  insert into public.group_members(group_id,user_id,role) values(gid,(select auth.uid()),'member');
 end if;
 update public.group_notifications set status=case when p_accept then 'accepted' else 'declined' end where id=p_id;
 insert into public.group_signals values((select auth.uid()),1) on conflict(user_id) do update set revision=public.group_signals.revision+1;
 return jsonb_build_object('accepted',p_accept);
end;$$;
revoke all on function public.invite_group_username(uuid,text),public.respond_group_notification(uuid,boolean) from public,anon;
grant execute on function public.invite_group_username(uuid,text),public.respond_group_notification(uuid,boolean) to authenticated;
update public.group_invites set revoked_at=now() where revoked_at is null;
revoke all on function public.create_group_invite(uuid),public.preview_group_invite(text),public.join_group(text) from authenticated;
notify pgrst,'reload schema';
commit;
