import {readFileSync,writeFileSync} from 'node:fs';
import {Resvg} from '@resvg/resvg-js';
const root=new URL('../',import.meta.url);
// Canonical project icon: all install icons must derive from this SVG.
const svg=readFileSync(new URL('public/favicon.svg',root),'utf8');
for(const [filename,size,opaque] of [['icon-192.png',192,false],['icon-512.png',512,false],['apple-touch-icon.png',180,true],['icon-maskable-512.png',512,true]]){
 const renderer=new Resvg(svg,{fitTo:{mode:'width',value:size},...(opaque?{background:'#184b39'}:{})});
 writeFileSync(new URL(`public/${filename}`,root),renderer.render().asPng());
}
console.log('App icons generated from public/favicon.svg.');
