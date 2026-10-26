begin;
alter table public.meals add column if not exists description text not null default '' check (char_length(description)<=1000);

-- Guarda apenas contadores e identificadores de tentativas; nunca fotos ou prompts.
create table if not exists public.ai_usage_buckets (
  bucket text primary key,
  used integer not null default 0 check (used>=0),
  last_request timestamptz
);
create table if not exists public.ai_analysis_requests (
  id uuid primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists ai_analysis_requests_created_idx on public.ai_analysis_requests(created_at);
alter table public.ai_usage_buckets enable row level security;
alter table public.ai_analysis_requests enable row level security;
revoke all on public.ai_usage_buckets,public.ai_analysis_requests from anon,authenticated;

create or replace function public.reserve_meal_analysis(p_user_id uuid,p_request_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare day_key text:=to_char(timezone('America/Sao_Paulo',now()),'YYYY-MM-DD');
  user_bucket text; global_bucket text; user_count integer; global_count integer; previous_request timestamptz;
begin
  if not exists(select 1 from public.profiles where id=p_user_id) then
    return jsonb_build_object('allowed',false,'reason','profile_missing');
  end if;
  user_bucket:='user:'||p_user_id::text||':'||day_key;
  global_bucket:='global:'||day_key;
  -- O mesmo bloqueio global serializa reserva, verificação e incremento.
  insert into public.ai_usage_buckets(bucket) values(global_bucket) on conflict do nothing;
  select used into global_count from public.ai_usage_buckets where bucket=global_bucket for update;
  if exists(select 1 from public.ai_analysis_requests where id=p_request_id) then
    return jsonb_build_object('allowed',false,'reason','duplicate_request');
  end if;
  if global_count>=100 then return jsonb_build_object('allowed',false,'reason','global_limit'); end if;
  insert into public.ai_usage_buckets(bucket) values(user_bucket) on conflict do nothing;
  select used,last_request into user_count,previous_request from public.ai_usage_buckets where bucket=user_bucket for update;
  if user_count>=20 then return jsonb_build_object('allowed',false,'reason','daily_limit'); end if;
  if previous_request>now()-interval '15 seconds' then return jsonb_build_object('allowed',false,'reason','cooldown'); end if;
  insert into public.ai_analysis_requests(id,user_id) values(p_request_id,p_user_id);
  update public.ai_usage_buckets set used=used+1,last_request=now() where bucket in (user_bucket,global_bucket);
  -- A janela curta de metadados não guarda histórico indefinidamente.
  delete from public.ai_analysis_requests where created_at<now()-interval '7 days';
  delete from public.ai_usage_buckets where right(bucket,10)<to_char(timezone('America/Sao_Paulo',now())-interval '7 days','YYYY-MM-DD');
  return jsonb_build_object('allowed',true,'remaining',19-user_count);
end;
$$;
revoke all on function public.reserve_meal_analysis(uuid,uuid) from public,anon,authenticated;
grant execute on function public.reserve_meal_analysis(uuid,uuid) to service_role;
notify pgrst,'reload schema';
commit;
