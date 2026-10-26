export function dateKey(d = new Date()) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
export function moveDate(key, offset) { const d = new Date(`${key}T12:00:00`); d.setDate(d.getDate()+offset); return dateKey(d); }
export function totals(meals, base, extra) { const eaten = meals.reduce((s,m)=>s+Number(m.calories),0); const spent = Number(base)+Number(extra); return {eaten,spent,balance:eaten-spent,remaining:Math.max(0,spent-eaten)}; }
export function validCalories(n, max=20000) { return Number.isInteger(Number(n)) && Number(n)>0 && Number(n)<=max; }
