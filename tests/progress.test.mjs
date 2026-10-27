import test from 'node:test';import assert from 'node:assert/strict';
import {balanceState,validMealTime,localMealTime,achievement} from '../src/progress.mjs';
import {calculateMetabolism} from '../src/metabolism.mjs';
test('balanço deixa explícito déficit, manutenção e superávit sem classificar dia sem refeições',()=>{
 assert.equal(balanceState(-1000,false).key,'empty');
 for(const v of [-100,0,100])assert.equal(balanceState(v,true).key,'maintenance');
 assert.equal(balanceState(-101,true).key,'deficit');assert.equal(balanceState(101,true).key,'surplus');
});
test('horários locais e refeições anteriores rejeitam horário futuro e valores inválidos',()=>{
 assert.equal(localMealTime(new Date(2026,9,26,8,5)),'08:05');
 assert.equal(validMealTime('08:00','2026-10-26','2026-10-26','12:30'),true);
 assert.equal(validMealTime('13:00','2026-10-26','2026-10-26','12:30'),false);
 assert.equal(validMealTime('23:30','2026-10-25','2026-10-26','12:30'),true);
 for(const t of ['24:00','12:60','','8:00'])assert.equal(validMealTime(t,'2026-10-26','2026-10-26','12:30'),false);
});
test('conquistas contam dias distintos do próprio usuário, sem premiar balanço',()=>{
 const meals=[{user_id:'a',date:'2026-10-20'},{user_id:'a',date:'2026-10-20'},{user_id:'b',date:'2026-10-21'}];
 assert.ok(achievement(meals,'a'));assert.equal(achievement(meals,'c'),null);
 const week=Array.from({length:7},(_,i)=>({user_id:'a',date:`2026-10-${20+i}`}));assert.match(achievement(week,'a').title,/Sete dias/);
});
test('PAL considera fator da rotina completa e preserva fórmula simplificada existente',()=>{
 const base={sex:'male',weight:75,height:175,age:28,activity:'moderate'};
 assert.equal(calculateMetabolism({...base,method:'pal',pal:1.6}).daily,2845);
 assert.equal(calculateMetabolism(base).daily,2400);
 for(const pal of [1.39,2.41,NaN,Infinity])assert.equal(calculateMetabolism({...base,method:'pal',pal}),null);
});
