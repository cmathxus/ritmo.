import {supabase,friendlyError,type Profile,type Meal,type Day} from './data';
import {moveDate} from './domain.mjs';
export type Group={id:string;name:string;created_by:string|null;migrated:boolean};
export type Member={group_id:string;user_id:string;role:'admin'|'member';joined_at:string;profile:Profile};
export type GroupData={group:Group|null;members:Member[]};
export async function groupRpc<T=unknown>(name:string,args:Record<string,unknown>={}):Promise<T>{
 if(!supabase)throw new Error('Esta ação fica disponível na sua conta conectada.');
 const {data,error}=await supabase.rpc(name,args);if(error)throw error;if(data?.error)throw new Error(data.error);return data as T;
}
export function groupError(e:unknown){
 const m=e instanceof Error?e.message:String((e as {message?:string})?.message||'');
 for(const [key,text] of Object.entries({already_grouped:'Você já está em um grupo. Saia dele antes de entrar em outro.',group_full:'Este grupo já tem 10 pessoas.',invalid_group_invite:'Convite inválido, vencido ou substituído. Peça um novo link ao administrador.',invite_rate_limit:'Muitas tentativas de convite. Aguarde um minuto.',group_admin_required:'Só o administrador atual pode fazer isso.',group_member_required:'Você já não participa deste grupo.',transfer_admin_first:'Transfira a administração para outro membro antes de sair.',invalid_group_name:'Use um nome de 2 a 40 caracteres.',member_missing:'Este membro já não está no grupo.'}))if(m.includes(key))return text;
 return friendlyError(e);
}
export async function loadGroup():Promise<GroupData>{
 if(!supabase)return {group:null,members:[]};
 const {data:groups,error}=await supabase.from('groups').select('id,name,created_by,migrated').is('archived_at',null).maybeSingle();if(error)throw error;
 if(!groups)return {group:null,members:[]};
 const [members,profiles]=await Promise.all([supabase.from('group_members').select('group_id,user_id,role,joined_at').eq('group_id',groups.id),supabase.from('profiles').select('id,name,base_calories')]);
 if(members.error)throw members.error;if(profiles.error)throw profiles.error;
 return {group:groups,members:(members.data||[]).map(m=>({...m,profile:profiles.data!.find(p=>p.id===m.user_id)!})).filter(m=>m.profile)};
}
export async function loadGroupDays(date:string,userId?:string){
 if(!supabase)return {meals:[] as Meal[],days:[] as Day[]};
 const from=userId?moveDate(date,-6):date;
 let meals=supabase.from('meals').select('*').gte('date',from).lte('date',date).order('meal_time',{nullsFirst:false}).order('created_at');
 let days=supabase.from('daily_logs').select('*').gte('date',from).lte('date',date);
 if(userId){meals=meals.eq('user_id',userId);days=days.eq('user_id',userId);}
 const [m,d]=await Promise.all([meals,days]);if(m.error)throw m.error;if(d.error)throw d.error;return {meals:(m.data||[]) as Meal[],days:(d.data||[]) as Day[]};
}
// Subscribe only to the current user's signal, never all membership rows.
export function watchGroup(userId:string,invalidate:()=>void){
 if(!supabase)return ()=>{};
 const channel=supabase.channel(`group-access-${userId}-${crypto.randomUUID()}`).on('postgres_changes',{event:'*',schema:'public',table:'group_signals',filter:`user_id=eq.${userId}`},invalidate).subscribe(status=>{if(['CHANNEL_ERROR','TIMED_OUT','CLOSED'].includes(status))invalidate();});
 const focus=()=>invalidate();const visibility=()=>invalidate();window.addEventListener('focus',focus);document.addEventListener('visibilitychange',visibility);
 return ()=>{void supabase?.removeChannel(channel);window.removeEventListener('focus',focus);document.removeEventListener('visibilitychange',visibility);};
}
