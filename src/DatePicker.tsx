import {useEffect,useId,useLayoutEffect,useRef,useState,type KeyboardEvent} from 'react';
import {CalendarDays,ChevronDown,ChevronLeft,ChevronRight,Leaf} from 'lucide-react';
import {dateKey,moveDate} from './domain.mjs';
import {monthDays,monthStart,moveMonth} from './calendar.mjs';

const weekdays=['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
const months=Array.from({length:12},(_,i)=>new Date(2026,i,1).toLocaleDateString('pt-BR',{month:'long'}));
const fullDate=(d:string)=>new Date(`${d}T12:00:00`).toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
type Props={value:string;onChange:(v:string)=>void;markedDates:string[];loadMarkedDates?:(from:string,to:string)=>Promise<string[]>};

export default function DatePicker({value,onChange,markedDates,loadMarkedDates}:Props){
  const today=dateKey();const id=useId();const root=useRef<HTMLDivElement>(null);const trigger=useRef<HTMLButtonElement>(null);
  const [open,setOpen]=useState(false);const [month,setMonth]=useState(monthStart(value));const [focusDate,setFocusDate]=useState(value);const [choosingMonth,setChoosingMonth]=useState(false);
  const [loadedMarks,setLoadedMarks]=useState<string[]|null>(null);const [marksLoading,setMarksLoading]=useState(false);const [marksError,setMarksError]=useState(false);
  const panel=useRef<HTMLDivElement>(null);const [position,setPosition]=useState<{top:number;left:number;shifted:boolean}|null>(null);
  const marks=new Set(loadedMarks??markedDates);const year=Number(month.slice(0,4));const monthIndex=Number(month.slice(5,7))-1;
  const initialFocus=useRef(false);
  function close(restoreFocus=true){setOpen(false);setChoosingMonth(false);if(restoreFocus)trigger.current?.focus();}
  function choose(d:string){if(d>today)return;onChange(d);close();}
  function browse(offset:number){const next=moveMonth(month,offset);if(next<=monthStart(today)){setMonth(next);setFocusDate(next);}}
  useLayoutEffect(()=>{
    if(!open)return;
    function place(){
      if(!panel.current||!root.current)return;
      const anchor=root.current.getBoundingClientRect();
      const desired=anchor.bottom+10;const top=Math.max(12,Math.min(desired,window.innerHeight-panel.current.offsetHeight-12));
      const left=Math.max(12,Math.min(anchor.left,window.innerWidth-panel.current.offsetWidth-12));
      setPosition({top,left,shifted:top<desired-1});
    }
    place();window.addEventListener('resize',place);window.addEventListener('scroll',place,true);
    return()=>{window.removeEventListener('resize',place);window.removeEventListener('scroll',place,true);};
  },[open,choosingMonth]);
  useEffect(()=>{
    if(!open)return;
    const outside=(e:PointerEvent)=>{if(!root.current?.contains(e.target as Node))close(false);};
    const escape=(e:globalThis.KeyboardEvent)=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();}};
    document.addEventListener('pointerdown',outside);document.addEventListener('keydown',escape);
    return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape);};
  },[open]);
  useEffect(()=>{
    if(!open||choosingMonth||!position)return;
    if(!initialFocus.current)return;
    root.current?.querySelector<HTMLButtonElement>(`[data-date="${focusDate}"]`)?.focus();initialFocus.current=false;
  },[open,month,focusDate,choosingMonth,position]);
  useEffect(()=>{
    if(!open||!loadMarkedDates)return;
    let active=true;setLoadedMarks(null);setMarksLoading(true);setMarksError(false);
    const last=moveDate(moveMonth(month,1),-1);
    loadMarkedDates(month,last).then(ds=>{if(active)setLoadedMarks(ds);}).catch(()=>{if(active)setMarksError(true);}).finally(()=>{if(active)setMarksLoading(false);});
    return()=>{active=false;};
  },[open,month,loadMarkedDates]);
  function onDayKey(e:KeyboardEvent<HTMLButtonElement>,d:string){
    let next=d;
    if(e.key==='ArrowRight')next=moveDate(d,1);
    else if(e.key==='ArrowLeft')next=moveDate(d,-1);
    else if(e.key==='ArrowDown')next=moveDate(d,7);
    else if(e.key==='ArrowUp')next=moveDate(d,-7);
    else if(e.key==='Home')next=moveDate(d,-new Date(`${d}T12:00:00`).getDay());
    else if(e.key==='End')next=moveDate(d,6-new Date(`${d}T12:00:00`).getDay());
    else if(e.key==='PageUp'||e.key==='PageDown'){
      const first=moveMonth(d,e.key==='PageUp'?-1:1);const last=moveDate(moveMonth(first,1),-1);
      next=first.slice(0,8)+String(Math.min(Number(d.slice(8)),Number(last.slice(8)))).padStart(2,'0');
    }else return;
    e.preventDefault();if(next>today)next=today;
    initialFocus.current=true;setFocusDate(next);setMonth(monthStart(next));
  }
  return <div className="date-picker" ref={root} onBlur={e=>{if(open&&e.relatedTarget&&!e.currentTarget.contains(e.relatedTarget as Node))close(false);}}>
    <button type="button" className="icon-button date-step" aria-label="Dia anterior" onClick={()=>onChange(moveDate(value,-1))}><ChevronLeft size={18}/></button>
    <button ref={trigger} type="button" className={`date-trigger ${open?'is-open':''}`} aria-label={`Escolher data: ${fullDate(value)}`} aria-haspopup="dialog" aria-expanded={open} aria-controls={open?id:undefined} onClick={()=>{if(open)close();else{setMonth(monthStart(value));setFocusDate(value);initialFocus.current=true;setChoosingMonth(false);setOpen(true);}}}>
      <CalendarDays size={17}/><strong>{value===today?'Hoje':new Date(`${value}T12:00:00`).toLocaleDateString('pt-BR',{day:'numeric',month:'long'})}</strong>
      {value===today&&<span>{new Date(`${value}T12:00:00`).toLocaleDateString('pt-BR',{day:'numeric',month:'long'})}</span>}<ChevronDown className="date-chevron" size={13}/>
    </button>
    <button type="button" className="icon-button date-step" aria-label="Próximo dia" disabled={value>=today} onClick={()=>onChange(moveDate(value,1))}><ChevronRight size={18}/></button>
    {open&&<div ref={panel} id={id} className={`calendar-popover ${position?.shifted?'is-shifted':''}`} style={{position:'fixed',top:position?.top??0,left:position?.left??0,visibility:position?'visible':'hidden'}} role="dialog" aria-label="Escolher data do diário">
      <div className="calendar-eyebrow"><span><Leaf size={13}/>CADA DIA CONTA</span><span className="calendar-year">{year}</span></div>
      <div className="calendar-header"><button type="button" className={`calendar-month-label ${choosingMonth?'expanded':''}`} aria-label="Escolher mês e ano" aria-expanded={choosingMonth} onClick={()=>setChoosingMonth(v=>!v)}>{months[monthIndex]} <ChevronDown size={15}/></button><div><button type="button" className="icon-button" aria-label={choosingMonth?'Ano anterior':'Mês anterior'} onClick={()=>choosingMonth?setMonth(moveMonth(month,-12)):browse(-1)}><ChevronLeft size={17}/></button><button type="button" className="icon-button" aria-label={choosingMonth?'Próximo ano':'Próximo mês'} disabled={choosingMonth?year>=Number(today.slice(0,4)):month>=monthStart(today)} onClick={()=>choosingMonth?setMonth(moveMonth(month,12)):browse(1)}><ChevronRight size={17}/></button></div></div>
      {choosingMonth?<div className="calendar-months" key={year}>{months.map((name,i)=>{const key=`${year}-${String(i+1).padStart(2,'0')}-01`;return <button type="button" key={name} disabled={key>today} aria-pressed={i===monthIndex} className={i===monthIndex?'selected':''} onClick={()=>{setMonth(key);setFocusDate(key);setChoosingMonth(false);initialFocus.current=true;}}>{name.slice(0,3)}</button>;})}</div>:<div className="calendar-month" key={month}><div className="calendar-weekdays" aria-hidden="true">{weekdays.map(d=><span key={d}>{d}</span>)}</div><div role="grid" aria-label={`${months[monthIndex]} de ${year}`} className="calendar-days">{Array.from({length:6},(_,row)=><div role="row" key={row}>{monthDays(month).slice(row*7,row*7+7).map(d=><div role="gridcell" key={d} aria-selected={d===value}><button type="button" data-date={d} tabIndex={d===focusDate?0:-1} className={`calendar-day ${d.slice(0,7)!==month.slice(0,7)?'outside-month':''} ${d===value?'selected':''} ${d===today?'today':''} ${marks.has(d)?'has-records':''}`} disabled={d>today} aria-current={d===today?'date':undefined} aria-label={`${fullDate(d)}${marks.has(d)?', com registros':''}`} onFocus={()=>setFocusDate(d)} onKeyDown={e=>onDayKey(e,d)} onClick={()=>choose(d)}><span>{Number(d.slice(8))}</span><i aria-hidden="true"/></button></div>)}</div>)}</div></div>}
      <div className="calendar-footer"><span className={marksLoading?'marks-loading':''}><i/>{marksLoading?'Carregando…':marksError?'Marcações indisponíveis':'Com registros'}</span><button type="button" onClick={()=>choose(today)}>Ir para hoje <ChevronRight size={13}/></button></div>
    </div>}
  </div>;
}
