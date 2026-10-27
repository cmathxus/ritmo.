begin;
-- Independent counters for chat; photo counters are untouched.
create or replace function public.reserve_calorie_chat(p_user_id uuid,p_request_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare day_key text:=to_char(timezone('America/Sao_Paulo',now()),'YYYY-MM-DD');
  user_bucket text; global_bucket text; user_count integer; global_count integer; previous_request timestamptz;
begin
  if not exists(select 1 from public.profiles where id=p_user_id) then
    return jsonb_build_object('allowed',false,'reason','profile_missing');
  end if;
  user_bucket:='chat:user:'||p_user_id::text||':'||day_key;
  global_bucket:='chat:global:'||day_key;
  -- O mesmo bloqueio global serializa reserva, verificação e incremento.
  insert into public.ai_usage_buckets(bucket) values(global_bucket) on conflict do nothing;
  select used into global_count from public.ai_usage_buckets where bucket=global_bucket for update;
  if exists(select 1 from public.ai_analysis_requests where id=p_request_id) then
    return jsonb_build_object('allowed',false,'reason','duplicate_request');
  end if;
  if global_count>=500 then return jsonb_build_object('allowed',false,'reason','global_limit'); end if;
  insert into public.ai_usage_buckets(bucket) values(user_bucket) on conflict do nothing;
  select used,last_request into user_count,previous_request from public.ai_usage_buckets where bucket=user_bucket for update;
  if user_count>=50 then return jsonb_build_object('allowed',false,'reason','daily_limit'); end if;
  if previous_request>now()-interval '3 seconds' then return jsonb_build_object('allowed',false,'reason','cooldown'); end if;
  insert into public.ai_analysis_requests(id,user_id) values(p_request_id,p_user_id);
  update public.ai_usage_buckets set used=used+1,last_request=now() where bucket in (user_bucket,global_bucket);
  -- A janela curta de metadados não guarda histórico indefinidamente.
  delete from public.ai_analysis_requests where created_at<now()-interval '7 days';
  delete from public.ai_usage_buckets where right(bucket,10)<to_char(timezone('America/Sao_Paulo',now())-interval '7 days','YYYY-MM-DD');
  return jsonb_build_object('allowed',true,'remaining',49-user_count);
end;
$$;
revoke all on function public.reserve_calorie_chat(uuid,uuid) from public,anon,authenticated;
grant execute on function public.reserve_calorie_chat(uuid,uuid) to service_role;

notify pgrst,'reload schema';
commit;
