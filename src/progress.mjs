export const goalLabels={deficit:'Emagrecer',maintenance:'Manter o peso',surplus:'Ganhar peso'};
export function balanceState(balance,hasMeals){
 if(!hasMeals)return {key:'empty',label:'Aguardando refeições',detail:'Seu balanço aparece conforme você registra o que comeu.'};
 if(Math.abs(balance)<=100)return {key:'maintenance',label:'Consumo perto do gasto',detail:'Isso é manutenção: as calorias registradas estão próximas do gasto diário estimado.'};
 return balance<0?{key:'deficit',label:'Consumo abaixo do gasto',detail:'Isso é déficit calórico: você registrou menos calorias nas refeições do que o gasto diário estimado.'}:{key:'surplus',label:'Consumo acima do gasto',detail:'Isso é superávit calórico: você registrou mais calorias nas refeições do que o gasto diário estimado.'};
}
export function localMealTime(now=new Date()){return `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;}
export function validMealTime(time,date,today,now=localMealTime()){
 return /^([01]\d|2[0-3]):[0-5]\d$/.test(time)&&date<=today&&(date!==today||time<=now);
}
export function achievement(meals,userId){
 const days=new Set(meals.filter(m=>m.user_id===userId).map(m=>m.date));const count=days.size;
 if(count>=14)return {title:'Parabéns pela constância!',text:`Você já registrou refeições em ${count} dias deste período. Cada registro ajuda a conhecer sua rotina.`};
 if(count>=7)return {title:'Sete dias de presença. Boa!',text:`Você anotou refeições em ${count} dias deste período. Seu histórico está tomando forma.`};
 if(count>=3)return {title:'Seu ritmo está tomando forma.',text:`Você já cuidou dos registros em ${count} dias deste período. Parabéns por seguir acompanhando.`};
 if(count===2)return {title:'Mais um dia no seu ritmo. Boa!',text:'Você já registrou refeições em dois dias deste período. Parabéns por continuar.'};
 if(count>0)return {title:'Primeiro passo registrado. Boa!',text:'Você tirou um tempo para acompanhar sua alimentação. Continue no seu ritmo.'};
 return null;
}
