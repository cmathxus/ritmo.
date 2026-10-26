import {useEffect,useRef,useState} from 'react';
const format=new Intl.NumberFormat('pt-BR');

export default function AnimatedNumber({value}:{value:number}){
  const [display,setDisplay]=useState(value);const current=useRef(value);
  useEffect(()=>{
    if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){current.current=value;setDisplay(value);return;}
    const start=current.current;if(start===value)return;
    let frame=0;let started=0;
    function tick(time:number){
      if(!started)started=time;
      const progress=Math.min(1,(time-started)/550);
      const eased=1-Math.pow(1-progress,3);current.current=start+(value-start)*eased;setDisplay(Math.round(current.current));
      if(progress<1)frame=requestAnimationFrame(tick);
    }
    frame=requestAnimationFrame(tick);return()=>cancelAnimationFrame(frame);
  },[value]);
  return <span className="animated-number" aria-label={format.format(value)}><span aria-hidden="true">{format.format(display)}</span></span>;
}
