import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { dateKey, moveDate } from './domain.mjs';
export type Profile = {id:string; name:string; base_calories:number};
export type Meal = {id:string; user_id:string; date:string; name:string; calories:number; category:string; created_at:string};
export type Day = {user_id:string; date:string; base_calories:number; extra_calories:number; activity:string};
export type Data = {profiles:Profile[]; meals:Meal[]; days:Day[]};
const url=import.meta.env.VITE_SUPABASE_URL, key=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
export let supabase:SupabaseClient|null=null;
export let configError='';
if(url||key){
  try{
    if(!url||!key)throw new Error('Missing configuration');
    supabase=createClient(url,key);
  }catch{
    configError='Confira VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY e gere um novo build. As duas variáveis precisam estar preenchidas com os valores do seu projeto.';
  }
}
const storageKey='ritmo-demo-v1';
export function demoData():Data {
  try { const d=JSON.parse(localStorage.getItem(storageKey)||'null'); if(d?.profiles?.length && Array.isArray(d.meals) && Array.isArray(d.days)) return d; } catch { /* fresh demo */ }
  const today=dateKey();
  const profiles=[{id:'demo-you',name:'Você',base_calories:2400},{id:'demo-friend',name:'Rafa',base_calories:2600}];
  const meals:Meal[]=[];const days:Day[]=[];
  for(let i=6;i>=0;i--) for(const [pidx,p] of profiles.entries()) {
    const date=moveDate(today,-i); days.push({user_id:p.id,date,base_calories:p.base_calories,extra_calories:i===0?300: i%2?200:0,activity:i===0?'Corrida · 30 minutos':i%2?'Caminhada':''});
    const items=i===0?[['Ovos mexidos com pão integral',320,'Café da manhã'],['Frango, arroz e salada',580,'Almoço'],['Iogurte com banana e aveia',245,'Lanche']]:[['Café da manhã',350+i*13,'Café da manhã'],['Almoço caseiro',640+i*11,'Almoço'],['Fruta e iogurte',220,'Lanche'],['Jantar',580+i*20,'Jantar']];
    for(const [name,calories,category] of items) meals.push({id:crypto.randomUUID(),user_id:p.id,date,name:String(name),calories:Number(calories)+pidx*70,category:String(category),created_at:`${date}T12:00:00`});
  }
  return {profiles,meals,days};
}
export function persistDemo(data:Data) { localStorage.setItem(storageKey,JSON.stringify(data)); }
export async function loadData(date:string):Promise<Data> {
  if(!supabase) return demoData();
  const from=moveDate(date,-35),to=moveDate(date,7);
  const [profiles,meals,days]=await Promise.all([
    supabase.from('profiles').select('id,name,base_calories'),
    supabase.from('meals').select('*').gte('date',from).lte('date',to).order('created_at'),
    supabase.from('daily_logs').select('*').gte('date',from).lte('date',to)
  ]);
  for(const r of [profiles,meals,days]) if(r.error) throw r.error;
  return {profiles:profiles.data||[],meals:meals.data||[],days:days.data||[]};
}
export async function ensureDay(day:Day) {
  if(!supabase) return;
  const {error}=await supabase.from('daily_logs').upsert(day,{onConflict:'user_id,date',ignoreDuplicates:true});
  if(error) throw error;
}
export async function exportOwnData(userId:string) {
  if(!supabase) throw new Error('Supabase unavailable');
  const client=supabase;
  async function pages(table:'meals'|'daily_logs') {
    const rows:Record<string,unknown>[]=[];
    for(let start=0;;start+=500){
      let query=client.from(table).select('*').eq('user_id',userId).order('date');
      if(table==='meals')query=query.order('id');
      const {data,error}=await query.range(start,start+499);
      if(error)throw error;
      rows.push(...(data||[]));
      if(!data||data.length<500)break;
    }
    return rows;
  }
  const [meals,days]=await Promise.all([pages('meals'),pages('daily_logs')]);
  return {meals:meals as unknown as Meal[],days:days as unknown as Day[]};
}
export function friendlyError(e:unknown) {
  const message=e instanceof Error?e.message:String((e as {message?:string})?.message||'');
  if(/Invalid login credentials/i.test(message)) return 'E-mail ou senha incorretos.';
  if(/Email not confirmed/i.test(message)) return 'Confirme seu e-mail antes de entrar.';
  if(/rate limit/i.test(message)) return 'Muitas tentativas. Aguarde um pouco e tente novamente.';
  if(/Failed to fetch|NetworkError/i.test(message)) return 'Não foi possível conectar. Confira sua internet e tente novamente.';
  if(/not_allowed|not authorized/i.test(message)) return 'Este e-mail não está na lista da dupla. Confira os e-mails autorizados no Supabase.';
  return 'Não foi possível concluir. Tente novamente. Se persistir, confira a configuração do Supabase.';
}
