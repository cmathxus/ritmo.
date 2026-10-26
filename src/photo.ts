export async function preparePhoto(file:File):Promise<Blob>{
  if(!file.type.startsWith('image/'))throw new Error('Escolha uma imagem da refeição.');
  if(file.size>15*1024*1024)throw new Error('A imagem deve ter até 15 MB.');
  let image:ImageBitmap|HTMLImageElement;
  try{
    if(typeof createImageBitmap==='function')image=await createImageBitmap(file,{imageOrientation:'from-image'});
    else image=await loadImage(file);
  }catch{
    try{image=await loadImage(file);}catch{throw new Error('Não consegui abrir a foto. Tente uma imagem JPG, PNG ou WebP.');}
  }
  try{
    const width=image instanceof HTMLImageElement?image.naturalWidth:image.width;
    const height=image instanceof HTMLImageElement?image.naturalHeight:image.height;
    if(!width||!height||width*height>60_000_000)throw new Error('A resolução desta foto é muito grande. Escolha uma versão menor.');
    const scale=Math.min(1,1280/Math.max(width,height));const canvas=document.createElement('canvas');
    canvas.width=Math.max(1,Math.round(width*scale));canvas.height=Math.max(1,Math.round(height*scale));
    const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Não foi possível preparar a foto neste navegador.');
    ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);
    const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Não foi possível preparar a foto.')),'image/jpeg',.82));
    if(blob.size>1_450_000)throw new Error('A foto ainda está muito grande. Tente uma imagem menor.');
    return blob;
  }finally{if('close' in image)image.close();}
}
function loadImage(file:File):Promise<HTMLImageElement>{
  return new Promise((resolve,reject)=>{const url=URL.createObjectURL(file);const image=new Image();image.onload=()=>{URL.revokeObjectURL(url);resolve(image);};image.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('Unsupported image'));};image.src=url;});
}
export function photoDataUrl(blob:Blob):Promise<string>{
  return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(new Error('Não foi possível ler a foto.'));reader.readAsDataURL(blob);});
}
