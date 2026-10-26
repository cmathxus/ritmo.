import test from 'node:test';
import assert from 'node:assert/strict';
import {dateKey,moveDate,totals,validCalories} from '../src/domain.mjs';
test('soma refeições, base e atividade extra sem duplicar treino habitual',()=>{
  assert.deepEqual(totals([{calories:320},{calories:580},{calories:245}],2400,300),{eaten:1145,spent:2700,balance:-1555,remaining:1555});
});
test('excesso mantém balanço positivo e não exibe restante negativo',()=>{
  assert.deepEqual(totals([{calories:2800}],2400,100),{eaten:2800,spent:2500,balance:300,remaining:0});
});
test('dia vazio não inventa consumo',()=>{assert.equal(totals([],2400,0).eaten,0);});
test('navega virada de mês, ano e ano bissexto sem conversão UTC',()=>{
  assert.equal(moveDate('2026-01-01',-1),'2025-12-31');
  assert.equal(moveDate('2024-03-01',-1),'2024-02-29');
  assert.equal(moveDate('2026-02-28',1),'2026-03-01');
  assert.equal(dateKey(new Date(2026,9,26,23,59)),'2026-10-26');
});
test('calorias rejeitam zero, negativos, decimais, infinito e valores fora do limite',()=>{
  for(const n of [0,-1,1.5,NaN,Infinity,20001,'abc',''])assert.equal(validCalories(n),false);
  for(const n of [1,550,20000])assert.equal(validCalories(n),true);
});
