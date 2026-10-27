import {useEffect,useRef,useState,type ChangeEvent} from 'react';
import {Camera,Check,ChevronRight,ImagePlus,Leaf,LoaderCircle,Plus,Sparkles,Trash2} from 'lucide-react';
import {supabase} from './data';
import {photoDataUrl,preparePhoto} from './photo';

type Ingredient={name:string;portion:string;calories:number};
type Estimate={title:string;items:Ingredient[];notes:string;remaining:number};
export type MealDraft={name:string;calories:number;description:string};
const errors:Record<string,string>={
  INVALID_QUESTION:'Escreva uma pergunta entre 5 e 500 caracteres.',
  AUTH_REQUIRED:'Sua sessão expirou. Entre novamente para analisar a foto.',
  AI_NOT_CONFIGURED:'A análise por foto ainda não está disponível. Você pode registrar a refeição manualmente.',
  AI_SETUP_REQUIRED:'A análise por foto ainda não está disponível. Tente novamente mais tarde.',
  DAILY_LIMIT:'Você chegou ao limite de 20 análises de fotos de hoje. Amanhã pode continuar; o registro manual segue disponível.',
  GLOBAL_LIMIT:'O limite de análises do app foi atingido hoje. Você ainda pode registrar manualmente.',
  COOLDOWN:'Aguarde 15 segundos entre uma análise e outra.',
  DUPLICATE_REQUEST:'Essa foto já foi enviada nesta tentativa. Inicie uma nova análise.',
  NO_FOOD:'Não consegui identificar uma refeição. Tente uma foto mais clara, mostrando o prato inteiro.',
  PHOTO_UNCLEAR:'Não consegui analisar essa foto. Tente enquadrar apenas a refeição, com boa iluminação.',
  INVALID_IMAGE:'Não consegui ler esta imagem. Escolha outra foto.',
  IMAGE_TOO_LARGE:'A foto ficou muito grande. Escolha uma imagem menor.',
  AI_TIMEOUT:'A análise demorou mais que o esperado. Tente novamente em alguns instantes.',
  AI_UNAVAILABLE:'A análise está indisponível agora. Tente novamente mais tarde ou registre manualmente.',
  AI_BILLING_REQUIRED:'O serviço de IA está sem saldo para analisar fotos. O registro manual continua disponível.',
  AI_KEY_INVALID:'A chave do serviço de IA precisa ser corrigida pelo responsável do app. O registro manual continua disponível.',
  AI_ACCESS_DENIED:'O serviço de IA não autorizou a análise. O registro manual continua disponível.',
  AI_RATE_LIMIT:'A cota do Gemini foi atingida. Tente mais tarde; se for o limite diário, aguarde a renovação. Você ainda pode preencher manualmente.',
  AI_FREE_TIER_UNAVAILABLE:'A cota gratuita do Gemini não está disponível para este projeto ou região. O responsável pelo app precisa verificar o Google AI Studio.',
  AI_MODEL_UNAVAILABLE:'O modelo de IA está indisponível para este projeto. Você ainda pode preencher manualmente.',
  AI_SPEND_LIMIT:'O projeto de IA atingiu seu limite de gastos ou uso. O responsável pelo app precisa verificar o painel da API.',
  AI_INCOMPLETE:'Não consegui terminar a análise. Tente uma foto mais nítida.',
  INVALID_AI_RESPONSE:'Não consegui montar uma estimativa confiável. Tente outra foto ou registre manualmente.',
};
export async function invoke<T>(method:'GET'|'POST',signal:AbortSignal,body?:Record<string,unknown>):Promise<T>{
  if(!supabase)throw new Error('A análise por foto funciona quando o Supabase está conectado.');
  const {data,error}=await supabase.functions.invoke<T>('analyze-meal',{method,body,signal,timeout:55000});
  if(error){
    if(signal.aborted)throw new DOMException('Cancelled','AbortError');
    let code='AI_UNAVAILABLE';
    if(error.context instanceof Response){try{const payload=await error.context.json();code=payload.error||code;}catch{/* generic network message */}}
    const questionErrors:Record<string,string>={DAILY_LIMIT:'Você chegou ao limite de 50 mensagens do chat de hoje. Suas análises de fotos têm um limite separado.',GLOBAL_LIMIT:'O limite diário do chat foi atingido. O limite de fotos é separado.',COOLDOWN:'Aguarde 3 segundos antes de enviar outra mensagem.',INVALID_QUESTION:'Escreva uma mensagem entre 1 e 500 caracteres.',AUTH_REQUIRED:'Sua sessão expirou. Entre novamente para consultar a IA.',AI_NOT_CONFIGURED:'A consulta ainda não está disponível. Tente novamente mais tarde.',INVALID_IMAGE:'O servidor de perguntas ainda precisa ser atualizado pelo responsável do app.',PHOTO_UNCLEAR:'Não consegui responder essa pergunta. Tente reformular com alimento e porção.',INVALID_AI_RESPONSE:'Não consegui montar uma resposta confiável. Tente reformular a pergunta.',AI_INCOMPLETE:'A resposta não foi concluída. Tente novamente.'};
    throw new Error((body?.mode==='question'?questionErrors[code]:undefined)||errors[code]||errors.AI_UNAVAILABLE);
  }
  return data as T;
}

export default function PhotoMeal({onAccept,onManual,initialFile}:{initialFile?:File;onAccept:(draft:MealDraft)=>void;onManual:()=>void}){
  const [blob,setBlob]=useState<Blob|null>(null);const [preview,setPreview]=useState('');const [preparing,setPreparing]=useState(false);const [analyzing,setAnalyzing]=useState(false);const [context,setContext]=useState('');
  const [result,setResult]=useState<Estimate|null>(null);const [error,setError]=useState('');const [available,setAvailable]=useState<boolean|null>(null);const [checking,setChecking]=useState(false);
  const camera=useRef<HTMLInputElement>(null);const gallery=useRef<HTMLInputElement>(null);const controller=useRef<AbortController|null>(null);const alive=useRef(true);const selection=useRef(0);
  const resultTitle=useRef<HTMLInputElement>(null);const hasResult=Boolean(result);
  useEffect(()=>{if(hasResult)resultTitle.current?.focus();},[hasResult]);
  useEffect(()=>{alive.current=true;return()=>{alive.current=false;controller.current?.abort();};},[]);
  useEffect(()=>{if(!blob){setPreview('');return;}const url=URL.createObjectURL(blob);setPreview(url);return()=>URL.revokeObjectURL(url);},[blob]);
  async function checkAvailability(){
    if(!supabase){setAvailable(false);return;}
    setChecking(true);const c=new AbortController();
    try{const status=await invoke<{available:boolean}>('GET',c.signal);if(alive.current)setAvailable(status.available);}
    catch{if(alive.current)setAvailable(null);}
    finally{if(alive.current)setChecking(false);}
  }
  useEffect(()=>{void checkAvailability();},[]);
  useEffect(()=>{if(initialFile)void chooseFile(initialFile);},[initialFile]);
  async function choose(e:ChangeEvent<HTMLInputElement>){const file=e.currentTarget.files?.[0];e.currentTarget.value='';if(file)await chooseFile(file);}
  async function chooseFile(file:File){
    const version=++selection.current;setError('');setPreparing(true);setResult(null);
    try{const photo=await preparePhoto(file);if(alive.current&&version===selection.current)setBlob(photo);}
    catch(err){if(alive.current&&version===selection.current)setError(err instanceof Error?err.message:'Não foi possível abrir a foto.');}
    finally{if(alive.current&&version===selection.current)setPreparing(false);}
  }
  async function analyze(){
    if(!blob||analyzing)return;setError('');setAnalyzing(true);const c=new AbortController();controller.current=c;
    try{
      const image=await photoDataUrl(blob);if(c.signal.aborted)return;
      const estimate=await invoke<Estimate>('POST',c.signal,{image,context:context.trim(),request_id:crypto.randomUUID()});
      if(!estimate?.items?.length||!estimate.title)throw new Error(errors.INVALID_AI_RESPONSE);
      if(alive.current){setResult(estimate);setAvailable(true);}
    }catch(err){if(alive.current&&!(err instanceof DOMException&&err.name==='AbortError'))setError(err instanceof Error?err.message:errors.AI_UNAVAILABLE);}
    finally{if(alive.current)setAnalyzing(false);}
  }
  const total=result?.items.reduce((s,i)=>s+Number(i.calories||0),0)||0;
  function review(){if(!result||total<1||total>20000)return;onAccept({name:result.title,calories:total,description:result.items.map(i=>`${i.name}: ${i.portion} (~${i.calories} kcal)`).join('\n').slice(0,1000)});}
  return <div className="photo-meal">
    <input ref={camera} className="sr-only" type="file" accept="image/*" capture="environment" tabIndex={-1} aria-label="Tirar foto da refeição" onChange={choose}/>
    <input ref={gallery} className="sr-only" type="file" accept="image/*" tabIndex={-1} aria-label="Escolher foto da refeição" onChange={choose}/>
    {!result&&<><p className="dialog-description">Uma foto, uma estimativa e menos tempo preenchendo.</p><div className={`photo-preview ${analyzing?'is-analyzing':''}`}>
      {preview?<img src={preview} alt="Foto selecionada da refeição"/>:<div className="photo-placeholder"><span><Camera size={32} strokeWidth={1.5}/></span><h3>Mostre o que tem no prato.</h3><p>Uma foto de cima, com boa luz,<br/>ajuda a estimar melhor as porções.</p></div>}
      {(preparing||analyzing)&&<div className="photo-progress" role="status"><LoaderCircle className="spin" size={23}/><strong>{preparing?'Preparando sua foto…':'Olhando seu prato…'}</strong><span>{analyzing?'Identificando alimentos e estimando porções.':'Ajustando o tamanho para enviar mais rápido.'}</span></div>}
      {analyzing&&<span className="photo-scan" aria-hidden="true"/>}
    </div><div className="photo-source-buttons"><button type="button" className="secondary" disabled={preparing||analyzing} onClick={()=>camera.current?.click()}><Camera size={16}/>Tirar foto</button><button type="button" className="secondary" disabled={preparing||analyzing} onClick={()=>gallery.current?.click()}><ImagePlus size={16}/>{blob?'Trocar imagem':'Escolher imagem'}</button></div>
    <label>Algo que a foto não mostra? <span className="optional">opcional</span><textarea rows={2} maxLength={500} placeholder="Ex.: frango grelhado, 3 colheres de arroz, sem molho…" value={context} disabled={analyzing} onChange={e=>setContext(e.target.value)}/></label>
    {available===false&&<div className="notice photo-unavailable"><span>A análise por foto ainda não está disponível. O registro manual continua funcionando.</span><button type="button" className="text-button" disabled={checking} onClick={checkAvailability}>{checking?'Verificando…':'Verificar de novo'}</button></div>}
    <p className="photo-privacy"><Leaf size={14}/><span>Ao analisar, a foto e o contexto serão enviados ao Google Gemini. Na cota gratuita, o Google pode usá-los para melhorar seus produtos. Envie só o prato, sem dados pessoais. Não guardamos a imagem no Ritmo. Até 20 análises por conta por dia, sujeitas à cota do Gemini.</span></p>
    </>}
    {result&&<><div className="photo-result-heading"><span><Sparkles size={18}/></span><div><h3>Seu prato, em uma estimativa.</h3><p>Confira as porções e ajuste o que precisar.</p></div><Check size={20}/></div><label>Nome da refeição<input ref={resultTitle} value={result.title} maxLength={120} onChange={e=>setResult({...result,title:e.target.value})}/></label>
    <div className="photo-ingredients">{result.items.map((item,index)=><div className="photo-ingredient" key={index}><div><strong>{item.name}</strong><input aria-label={`Porção de ${item.name}`} value={item.portion} maxLength={100} onChange={e=>setResult({...result,items:result.items.map((i,j)=>j===index?{...i,portion:e.target.value}:i)})}/></div><label><span className="sr-only">Calorias de {item.name}</span><input type="number" min="0" max="10000" step="1" value={item.calories} onChange={e=>setResult({...result,items:result.items.map((i,j)=>j===index?{...i,calories:Math.max(0,Math.min(10000,Math.round(Number(e.target.value))))}:i)})}/><small>kcal</small></label><button type="button" className="icon-button" aria-label={`Remover ${item.name} da sugestão`} onClick={()=>setResult({...result,items:result.items.filter((_,j)=>j!==index)})}><Trash2 size={15}/></button></div>)}</div>
    <div className="photo-total"><span>Total estimado</span><strong>{new Intl.NumberFormat('pt-BR').format(total)} <small>kcal</small></strong></div>
    <div className="notice photo-estimate-note"><Sparkles size={16}/><span>{result.notes||'Calorias e porções são aproximadas. Confira antes de salvar.'}</span></div><p className="photo-quota">{result.remaining} análises restantes hoje · A refeição ainda não foi salva.</p></>}
    {error&&<p className="error photo-error" role="alert">{error}</p>}
    <div className="photo-actions">{result?<><button type="button" className="text-button" onClick={()=>{setResult(null);setError('');}}>Usar outra foto</button><button type="button" className="primary" disabled={!result.title.trim()||total<1||total>20000} onClick={review}>Revisar e registrar<ChevronRight size={16}/></button></>:<><button type="button" className="text-button" disabled={analyzing} onClick={onManual}><Plus size={14}/>Preencher manualmente</button><button type="button" className="primary" disabled={!blob||preparing||analyzing||checking||available===false} onClick={analyze}>{analyzing?<LoaderCircle size={16} className="spin"/>:<Sparkles size={16}/>}{analyzing?'Analisando…':'Estimar calorias'}</button></>}</div>
  </div>;
}
