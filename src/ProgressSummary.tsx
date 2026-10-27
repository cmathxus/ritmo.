import EnergyGuide from './EnergyGuide';
import {Check,Sprout,Target} from 'lucide-react';
import {achievement,balanceState,goalLabels} from './progress.mjs';
import type {Meal} from './data';
export default function ProgressSummary({balance,mealCount,isToday,goal,meals,uid,onGoal}:{balance:number;mealCount:number;isToday:boolean;goal?:'deficit'|'maintenance'|'surplus';meals:Meal[];uid:string;onGoal:()=>void}){
 const status=balanceState(balance,mealCount>0);const progress=achievement(meals,uid);
 return <section className="progress-overview"><div className={`balance-status state-${status.key}`}><span className="eyebrow">{isToday?'COMO ESTÁ SEU DIA ATÉ AGORA':'BALANÇO DOS REGISTROS DO DIA'}</span><h2>{status.label}</h2><p>{status.detail}</p><div className="goal-line"><Target size={15}/>{goal?`Seu objetivo: ${goalLabels[goal]}`:'Objetivo ainda não escolhido'}<button className="text-button goal-change" onClick={onGoal}>{goal?'Alterar objetivo':'Escolher objetivo'}</button></div><small>{isToday?'O dia ainda está em andamento. O gasto considera o dia inteiro e as refeições só entram quando você registra.':'Este resultado depende de todas as refeições e atividades terem sido registradas.'} A faixa de ±100 kcal é apenas uma aproximação visual.</small><EnergyGuide/></div>{progress&&<div className="achievement-card"><Sprout size={24}/><div><strong>{progress.title}</strong><p>{progress.text}</p></div></div>}</section>;
}
