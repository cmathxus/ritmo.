import test from 'node:test';
import assert from 'node:assert/strict';
import {monthDays,monthStart,moveMonth} from '../src/calendar.mjs';
test('calendário inclui as semanas completas de outubro de 2026',()=>{
 const days=monthDays('2026-10-26');assert.equal(days.length,42);assert.equal(days[0],'2026-09-27');assert.equal(days.at(-1),'2026-11-07');assert.equal(new Set(days).size,42);
});
test('navegação por mês não pula fevereiro em datas no fim do mês',()=>{
 assert.equal(moveMonth('2026-01-31',1),'2026-02-01');assert.equal(moveMonth('2026-01-01',-1),'2025-12-01');assert.equal(moveMonth('2026-12-01',1),'2027-01-01');
});
test('fevereiro bissexto e meses começando no domingo',()=>{
 assert.ok(monthDays('2024-02-10').includes('2024-02-29'));assert.equal(monthDays('2026-02-01')[0],'2026-02-01');assert.equal(monthStart('2026-10-26'),'2026-10-01');
});
