import {useEffect,useRef,type ReactNode} from 'react';
import {X} from 'lucide-react';
export default function Dialog({title,children,onClose}:{title:string;children:ReactNode;onClose:()=>void}) {
  const ref=useRef<HTMLDivElement>(null);const closeRef=useRef(onClose);closeRef.current=onClose;
  useEffect(()=>{const old=document.activeElement as HTMLElement;const el=ref.current;const focusables=()=>Array.from(el?.querySelectorAll<HTMLElement>('button,input,select,textarea,a[href]')||[]).filter(el=>!el.hasAttribute('disabled')&&el.getAttribute('tabindex')!=='-1');(focusables()[1]||focusables()[0])?.focus();const handler=(e:KeyboardEvent)=>{if(e.key==='Escape')closeRef.current();if(e.key==='Tab'){const f=focusables();if(e.shiftKey&&document.activeElement===f[0]){e.preventDefault();f.at(-1)?.focus();}else if(!e.shiftKey&&document.activeElement===f.at(-1)){e.preventDefault();f[0]?.focus();}}};document.addEventListener('keydown',handler);const overflow=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.removeEventListener('keydown',handler);document.body.style.overflow=overflow;old?.focus();};},[]);
  return <div className="overlay" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}><div className="dialog" role="dialog" aria-modal="true" aria-label={title} ref={ref}><header><h2>{title}</h2><button className="icon-button" aria-label="Fechar" onClick={onClose}><X size={20}/></button></header>{children}</div></div>;
}

