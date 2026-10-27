import {goalOptions} from './goal-options';
import EnergyGuide from './EnergyGuide';
import {useState,type FormEvent} from 'react';
import {groupRpc,groupError} from './groups';
import {supabase} from './data';
export default function GoalForm({initial,onSaved}:{initial?:'deficit'|'maintenance'|'surplus';onSaved:(goal:'deficit'|'maintenance'|'surplus')=>void}){
 const [goal,setGoal]=useState(initial||'');const [busy,setBusy]=useState(false);const [error,setError]=useState('');
 async function save(e:FormEvent){e.preventDefault();if(!goal)return;setBusy(true);setError('');try{if(supabase)await groupRpc('set_personal_goal',{p_goal:goal});onSaved(goal as 'deficit'|'maintenance'|'surplus');}catch(e){setError(groupError(e));}finally{setBusy(false);}}
 return <form onSubmit={save}><p className="dialog-description">O que você quer para esta fase? A escolha ajuda o app a explicar seus registros; ela não cria uma dieta nem muda seu gasto estimado.</p><fieldset className="activity-options"><legend>Seu objetivo</legend>{goalOptions.map(g=><label key={g.id} className={goal===g.id?'selected':''}><input type="radio" name="personal_goal" required checked={goal===g.id} onChange={()=>setGoal(g.id)}/><span><strong>{g.title}</strong><small><b>{g.term}</b> · {g.text}</small></span></label>)}</fieldset><EnergyGuide/>{error&&<p className="error" role="alert">{error}</p>}<button className="primary" disabled={busy||!goal}>{busy?'Salvando…':'Salvar objetivo'}</button></form>;
}
