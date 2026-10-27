begin;
create table public.groups (
 id uuid primary key default gen_random_uuid(),
 name text not null check(char_length(trim(name)) between 2 and 40),
 created_by uuid references public.profiles(id) on delete set null,
 created_at timestamptz not null default now(), archived_at timestamptz, migrated boolean not null default false
);
create table public.group_members (
 group_id uuid not null references public.groups(id) on delete cascade,
 user_id uuid not null unique references public.profiles(id) on delete cascade,
 role text not null check(role in ('admin','member')), joined_at timestamptz not null default now(),
 primary key(group_id,user_id)
);
create unique index group_one_admin on public.group_members(group_id) where role='admin';
create table public.group_invites (
 id uuid primary key default gen_random_uuid(),group_id uuid not null references public.groups(id) on delete cascade,
 token_hash text not null unique,expires_at timestamptz not null,revoked_at timestamptz,
 created_by uuid references public.profiles(id) on delete set null,created_at timestamptz not null default now()
);
create unique index group_one_invite on public.group_invites(group_id) where revoked_at is null;
create table public.group_invite_attempts(user_id uuid primary key references public.profiles(id) on delete cascade,started_at timestamptz not null,used integer not null);
create table public.group_signals(user_id uuid primary key references public.profiles(id) on delete cascade,revision integer not null default 0);
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.group_invites enable row level security;
alter table public.group_invite_attempts enable row level security;
alter table public.group_signals enable row level security;
revoke all on public.groups,public.group_members,public.group_invites,public.group_invite_attempts,public.group_signals from anon,authenticated;
grant select on public.groups,public.group_members,public.group_signals to authenticated;

create function public.my_group_id() returns uuid language sql stable security definer set search_path='' as $$
 select group_id from public.group_members where user_id=(select auth.uid());
$$;
revoke all on function public.my_group_id() from public,anon;
grant execute on function public.my_group_id() to authenticated;
create policy groups_member_read on public.groups for select to authenticated using(id=(select public.my_group_id()) and archived_at is null);
create policy group_members_read on public.group_members for select to authenticated using(group_id=(select public.my_group_id()));
create policy group_signals_self on public.group_signals for select to authenticated using(user_id=(select auth.uid()));

-- Nenhum dado do diário é copiado. Os sinais só invalidam o cache do próprio usuário.
create function public.signal_group(gid uuid,extra_user uuid default null) returns void language sql security definer set search_path='' as $$
 insert into public.group_signals(user_id,revision)
 select id,1 from public.profiles where id in (select user_id from public.group_members where group_id=gid union select extra_user)
 on conflict(user_id) do update set revision=public.group_signals.revision+1;
$$;
revoke all on function public.signal_group(uuid,uuid) from public,anon,authenticated;
create function public.group_members_changed() returns trigger language plpgsql security definer set search_path='' as $$
declare gid uuid; affected uuid; replacement uuid;
begin
 if TG_OP='DELETE' then gid:=old.group_id;affected:=old.user_id;else gid:=new.group_id;affected:=new.user_id;end if;
 if TG_OP='DELETE' and old.role='admin' and not exists(select 1 from public.group_members where group_id=gid and role='admin') then
  select user_id into replacement from public.group_members where group_id=gid order by joined_at,user_id limit 1;
  if replacement is not null then update public.group_members set role='admin' where group_id=gid and user_id=replacement;end if;
 end if;
 perform public.signal_group(gid,affected);return null;
end;$$;
revoke all on function public.group_members_changed() from public,anon,authenticated;
create trigger notify_group_members after insert or update or delete on public.group_members for each row execute function public.group_members_changed();
create function public.groups_changed() returns trigger language plpgsql security definer set search_path='' as $$
begin perform public.signal_group(new.id);return null;end;$$;
revoke all on function public.groups_changed() from public,anon,authenticated;
create trigger notify_group_changes after update on public.groups for each row execute function public.groups_changed();

create function public.create_group(p_name text) returns uuid language plpgsql security definer set search_path='' as $$
declare owner_id uuid:=(select auth.uid());gid uuid;
begin
 if owner_id is null then raise exception 'authentication_required';end if;
 if p_name is null or char_length(trim(p_name)) not between 2 and 40 then raise exception 'invalid_group_name';end if;
 perform id from public.profiles where id=owner_id for update;
 if not found then raise exception 'profile_missing';end if;
 if exists(select 1 from public.group_members where user_id=owner_id) then raise exception 'already_grouped';end if;
 insert into public.groups(name,created_by) values(trim(p_name),owner_id) returning id into gid;
 insert into public.group_members(group_id,user_id,role) values(gid,owner_id,'admin');return gid;
end;$$;

create function public.require_group_admin(gid uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 perform id from public.groups where id=gid and archived_at is null for update;
 if not found or not exists(select 1 from public.group_members where group_id=gid and user_id=(select auth.uid()) and role='admin') then raise exception 'group_admin_required';end if;
end;$$;
revoke all on function public.require_group_admin(uuid) from public,anon,authenticated;

create function public.create_group_invite(p_group_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare token text:=replace(gen_random_uuid()::text||gen_random_uuid()::text,'-','');expires timestamptz:=now()+interval '7 days';
begin
 perform public.require_group_admin(p_group_id);
 update public.group_invites set revoked_at=now() where group_id=p_group_id and revoked_at is null;
 insert into public.group_invites(group_id,token_hash,expires_at,created_by) values(p_group_id,encode(sha256(convert_to(token,'UTF8')),'hex'),expires,(select auth.uid()));
 return jsonb_build_object('token',token,'expires_at',expires);
end;$$;

create function public.consume_group_invite_attempt() returns boolean language plpgsql security definer set search_path='' as $$
declare owner_id uuid:=(select auth.uid());attempt public.group_invite_attempts;
begin
 if owner_id is null then raise exception 'authentication_required';end if;
 insert into public.group_invite_attempts values(owner_id,now(),1) on conflict(user_id) do update set
 used=case when public.group_invite_attempts.started_at<now()-interval '1 minute' then 1 else least(public.group_invite_attempts.used+1,21) end,
 started_at=case when public.group_invite_attempts.started_at<now()-interval '1 minute' then now() else public.group_invite_attempts.started_at end
 returning * into attempt;
 return attempt.used<=20;
end;$$;
revoke all on function public.consume_group_invite_attempt() from public,anon,authenticated;

create function public.preview_group_invite(p_token text) returns jsonb language plpgsql security definer set search_path='' as $$
declare gid uuid;group_name text;
begin
 if not public.consume_group_invite_attempt() then return jsonb_build_object('error','invite_rate_limit');end if;
 if p_token is null or p_token!~'^[a-f0-9]{64}$' then return jsonb_build_object('error','invalid_group_invite');end if;
 select g.id,g.name into gid,group_name from public.group_invites i join public.groups g on g.id=i.group_id
 where i.token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex') and i.revoked_at is null and i.expires_at>now() and g.archived_at is null;
 if gid is null then return jsonb_build_object('error','invalid_group_invite');end if;
 return jsonb_build_object('name',group_name,'members',(select count(*) from public.group_members where group_id=gid),'full',(select count(*) from public.group_members where group_id=gid)>=10);
end;$$;

create function public.join_group(p_token text) returns jsonb language plpgsql security definer set search_path='' as $$
declare owner_id uuid:=(select auth.uid());gid uuid;existing uuid;
begin
 if not public.consume_group_invite_attempt() then return jsonb_build_object('error','invite_rate_limit');end if;
 if p_token is null or p_token!~'^[a-f0-9]{64}$' then return jsonb_build_object('error','invalid_group_invite');end if;
 select group_id into gid from public.group_invites where token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex') and revoked_at is null and expires_at>now();
 if gid is null then return jsonb_build_object('error','invalid_group_invite');end if;
 perform id from public.groups where id=gid and archived_at is null for update;
 if not found then return jsonb_build_object('error','invalid_group_invite');end if;
 -- Revalida após o bloqueio: trocar convite e aceitar ao mesmo tempo não permite usar o antigo.
 if not exists(select 1 from public.group_invites where group_id=gid and token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex') and revoked_at is null and expires_at>now()) then return jsonb_build_object('error','invalid_group_invite');end if;
 perform id from public.profiles where id=owner_id for update;
 select group_id into existing from public.group_members where user_id=owner_id;
 if existing=gid then return jsonb_build_object('joined',true);end if;
 if existing is not null then return jsonb_build_object('error','already_grouped');end if;
 if (select count(*) from public.group_members where group_id=gid)>=10 then return jsonb_build_object('error','group_full');end if;
 insert into public.group_members(group_id,user_id,role) values(gid,owner_id,'member');return jsonb_build_object('joined',true);
end;$$;

create function public.rename_group(p_group_id uuid,p_name text) returns void language plpgsql security definer set search_path='' as $$
begin perform public.require_group_admin(p_group_id);
 if p_name is null or char_length(trim(p_name)) not between 2 and 40 then raise exception 'invalid_group_name';end if;
 update public.groups set name=trim(p_name) where id=p_group_id;
end;$$;
create function public.remove_group_member(p_group_id uuid,p_user_id uuid) returns void language plpgsql security definer set search_path='' as $$
begin perform public.require_group_admin(p_group_id);
 if p_user_id=(select auth.uid()) then raise exception 'use_leave_group';end if;
 delete from public.group_members where group_id=p_group_id and user_id=p_user_id and role='member';
 if not found then raise exception 'member_missing';end if;
end;$$;
create function public.transfer_group_admin(p_group_id uuid,p_user_id uuid) returns void language plpgsql security definer set search_path='' as $$
begin perform public.require_group_admin(p_group_id);
 if p_user_id=(select auth.uid()) then return;end if;
 if not exists(select 1 from public.group_members where group_id=p_group_id and user_id=p_user_id) then raise exception 'member_missing';end if;
 update public.group_members set role='member' where group_id=p_group_id and user_id=(select auth.uid());
 update public.group_members set role='admin' where group_id=p_group_id and user_id=p_user_id;
end;$$;
create function public.leave_group(p_group_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare member_role text;
begin
 perform id from public.groups where id=p_group_id for update;
 select role into member_role from public.group_members where group_id=p_group_id and user_id=(select auth.uid());
 if member_role is null then raise exception 'group_member_required';end if;
 if member_role='admin' and (select count(*) from public.group_members where group_id=p_group_id)>1 then raise exception 'transfer_admin_first';end if;
 delete from public.group_members where group_id=p_group_id and user_id=(select auth.uid());
 if not exists(select 1 from public.group_members where group_id=p_group_id) then
  update public.groups set archived_at=now() where id=p_group_id;
  update public.group_invites set revoked_at=now() where group_id=p_group_id and revoked_at is null;
 end if;
end;$$;

revoke all on function public.create_group(text),public.create_group_invite(uuid),public.preview_group_invite(text),public.join_group(text),public.rename_group(uuid,text),public.remove_group_member(uuid,uuid),public.transfer_group_admin(uuid,uuid),public.leave_group(uuid) from public,anon;
grant execute on function public.create_group(text),public.create_group_invite(uuid),public.preview_group_invite(text),public.join_group(text),public.rename_group(uuid,text),public.remove_group_member(uuid,uuid),public.transfer_group_admin(uuid,uuid),public.leave_group(uuid) to authenticated;

-- Migração das duplas existentes. Contas individuais continuam sem grupo.
do $$declare duo record;gid uuid;admin_id uuid;begin
 for duo in select duo_id from public.profiles group by duo_id having count(*)>=2 loop
  select p.id into admin_id from public.profiles p join auth.users u on u.id=p.id where p.duo_id=duo.duo_id order by u.created_at,p.id limit 1;
  insert into public.groups(name,created_by,migrated) values('Nosso grupo',admin_id,true) returning id into gid;
  insert into public.group_members(group_id,user_id,role)
  select gid,id,case when id=admin_id then 'admin' else 'member' end from public.profiles where duo_id=duo.duo_id;
 end loop;
end;$$;
create or replace function public.can_view_user(target uuid) returns boolean language sql stable security definer set search_path='' as $$
 select target=(select auth.uid()) or exists(select 1 from public.group_members me join public.group_members other on other.group_id=me.group_id where me.user_id=(select auth.uid()) and other.user_id=target);
$$;
-- Convites de dupla deixam de conceder participação e acesso.
revoke all on function public.get_my_invite(),public.join_duo(uuid) from authenticated;
do $$begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime') then
  execute 'alter publication supabase_realtime add table public.group_signals';
 end if;
end;$$;
notify pgrst,'reload schema';
commit;
