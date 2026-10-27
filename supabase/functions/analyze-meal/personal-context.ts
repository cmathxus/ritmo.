type Fetcher=(input:string|URL|Request,init?:RequestInit)=>Promise<Response>;
export function contextDates(timeZone:string,now=new Date()){
 const format=new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'}),parts=format.formatToParts(now),part=(type:string)=>parts.find(p=>p.type===type)!.value;
 const today=`${part('year')}-${part('month')}-${part('day')}`,from=new Date(`${today}T12:00:00Z`);from.setUTCDate(from.getUTCDate()-6);return {today,from:from.toISOString().slice(0,10),timeZone};
}
export async function loadPersonalContext({url,anon,auth,userId,timeZone,fetcher}:{url:string;anon:string;auth:string;userId:string;timeZone:string;fetcher:Fetcher}){
 const dates=contextDates(timeZone),headers={apikey:anon,Authorization:auth};
 async function rows(table:string,params:Record<string,string>){const query=new URLSearchParams(params);const response=await fetcher(`${url}/rest/v1/${table}?${query}`,{headers,signal:AbortSignal.timeout(7000)});if(!response.ok)throw new Error('CONTEXT_UNAVAILABLE');const data=await response.json();if(!Array.isArray(data))throw new Error('CONTEXT_UNAVAILABLE');return data;}
 const [profiles,metabolic,meals,days]=await Promise.all([
  rows('profiles',{select:'name,base_calories',id:`eq.${userId}`,limit:'1'}),
  rows('metabolic_profiles',{select:'mode,sex,weight,height,age,activity,basal_calories,daily_calories,method,pal,goal,goal_selected,updated_at',user_id:`eq.${userId}`,limit:'1'}),
  rows('meals',{select:'date,name,calories,category,description,meal_time',user_id:`eq.${userId}`,date:`gte.${dates.from}`,and:`(date.lte.${dates.today})`,order:'date.desc,meal_time.desc.nullslast,created_at.desc',limit:'121'}),
  rows('daily_logs',{select:'date,base_calories,extra_calories,activity',user_id:`eq.${userId}`,date:`gte.${dates.from}`,and:`(date.lte.${dates.today})`,order:'date.desc',limit:'7'}),
 ]);
 const safe=(v:unknown,max=120)=>typeof v==='string'?v.slice(0,max):'';
 const own=profiles[0],calculation=metabolic[0];
 const profile=own?{name:safe(own.name,40),current_daily_base:own.base_calories}:null;
 const metabolism=calculation?{...calculation,goal:calculation.goal_selected?calculation.goal:null}:null;
 const records=meals.slice(0,120).map(m=>({date:m.date,food:safe(m.name),calories:m.calories,category:safe(m.category,40),notes:safe(m.description,250),time:m.meal_time}));
 const activity=days.map(d=>({...d,activity:safe(d.activity)}));
 return {period:dates,profile,metabolism,meals:records,daily_activity:activity,truncated:meals.length>120,limits:'Somente registros dos últimos 7 dias, até 120 refeições. Ausência de registro não significa ausência de comida ou exercício. Não há confirmação de que os dias estejam completos. Gasto é estimativa diária, não calorias já queimadas até este horário.'};
}
