import {dateKey,moveDate} from './domain.mjs';

export function monthStart(key) { return `${key.slice(0,7)}-01`; }
export function moveMonth(key, offset) {
  const d=new Date(`${key}T12:00:00`);
  d.setDate(1);d.setMonth(d.getMonth()+offset);
  return dateKey(d);
}
export function monthDays(key) {
  const first=monthStart(key);
  const weekday=new Date(`${first}T12:00:00`).getDay();
  return Array.from({length:42},(_,i)=>moveDate(first,i-weekday));
}
