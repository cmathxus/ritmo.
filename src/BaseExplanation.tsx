import {Flame,Plus,Activity} from 'lucide-react';
import type {MetabolicProfile} from './data';
export function baseKind(base:number,profile?:MetabolicProfile|null,currentDay=true){
 if(!currentDay)return 'historical';
 if(!profile||profile.daily_calories!==base)return 'custom';
 if(profile.mode==='calculator'&&profile.basal_calories&&profile.basal_calories>0&&profile.basal_calories<=base)return 'calculated';
 return 'custom';
}
export default function BaseExplanation({base,profile,currentDay}:{base:number;profile?:MetabolicProfile|null;currentDay:boolean}){
 const kind=baseKind(base,profile,currentDay),calculated=kind==='calculated';
 const number=(n:number)=>n.toLocaleString('pt-BR');
 return <div className="base-explanation">{calculated?<><div className="base-parts" aria-label="Composição da base diária"><div><span><Flame size={14}/>TMB · em repouso</span><strong>{number(profile!.basal_calories!)} <small>kcal</small></strong></div><Plus size={15}/><div><span><Activity size={14}/>Rotina estimada</span><strong>{number(base-profile!.basal_calories!)} <small>kcal</small></strong></div></div><p><strong>Treino não entra na TMB.</strong> Nesta base, o fator de atividade acrescenta a rotina escolhida no cálculo.</p><details><summary>E a musculação?</summary><p>Se a musculação já fez parte da rotina que você selecionou, ela está contemplada na estimativa. Se ficou de fora, registre abaixo como atividade extra. Some cada atividade uma única vez.</p></details></>:<><p><strong>TMB é só o gasto em repouso.</strong> {kind==='historical'?'Este é o valor de base salvo naquele dia.':'Esta base foi definida por você ou não tem um cálculo correspondente salvo.'}</p><details><summary>Quando registrar um treino?</summary><p>Se a base contém apenas a TMB, ela não inclui os gastos de tarefas, deslocamentos nem exercícios. Registre os gastos que ficaram fora dela. Se você informou o gasto diário total com seus treinos habituais, acrescente apenas o que não está incluído.</p></details></>}</div>;
}
