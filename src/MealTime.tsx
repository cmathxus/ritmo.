import {useState} from 'react';
import {localMealTime} from './progress.mjs';
export default function MealTime({initial,date}:{initial?:string|null;date:string}){
 const [mode,setMode]=useState(initial?'custom':'now');
 return <fieldset className="meal-time"><legend>Horário da refeição</legend><div className="time-options"><label><input type="radio" name="time_mode" value="now" checked={mode==='now'} onChange={()=>setMode('now')}/>Hora do registro</label><label><input type="radio" name="time_mode" value="custom" checked={mode==='custom'} onChange={()=>setMode('custom')}/>Outro horário</label></div>{mode==='custom'?<label>Em que horário você comeu?<input name="meal_time" type="time" required defaultValue={initial?.slice(0,5)||localMealTime()}/></label>:<p>A hora atual será registrada quando você salvar, no dia selecionado ({new Date(`${date}T12:00:00`).toLocaleDateString('pt-BR')}). Para uma refeição anterior, escolha “Outro horário”.</p>}</fieldset>;
}
