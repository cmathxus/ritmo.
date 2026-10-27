import {Check,Sprout,Target} from 'lucide-react';
import {achievement,balanceState,goalLabels} from './progress.mjs';
import type {Meal} from './data';
export default function ProgressSummary({balance,mealCount,isToday,goal,meals,uid}:{balance:number;mealCount:number;isToday:boolean;goal?:'deficit'|'maintenance'|'surplus';meals:Meal[];uid:string}){
 const status=balanceState(balance,mealCount>0);const progress=achievement(meals,uid);
 return <section className="progress-overview"><div className={`balance-status state-${status.key}`}><span className="eyebrow">{isToday?'COMO ESTÁ SEU DIA ATÉ AGORA':'BALANÇO DOS REGISTROS DO DIA'}</span><h2>{status.label}</h2><p>{status.detail}</p><div className="goal-line"><Target size={15}/>{goal?`Seu objetivo: ${goalLabels[goal]}`:'Escolha seu objetivo em Preferências.'}{goal===status.key&&mealCount>0&&<span><Check size={14}/>Na direção do seu objetivo</span>}</div><small>Consumo menos gasto estimado · Manutenção visual: ±100 kcal. {isToday?'Este valor é parcial e muda conforme seus registros.':'Depende de todos os registros estarem completos.'}</small></div>{progress&&<div className="achievement-card"><Sprout size={24}/><div><strong>{progress.title}</strong><p>{progress.text}</p></div></div>}</section>;
}
