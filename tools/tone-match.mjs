/**
 * Sjednocení tónu fotografií podle hero.webp.
 *
 * Základ je vždy assets/hero.webp — první obrazovka určuje, jak web
 * vypadá, a všechno ostatní se k ní přizpůsobí. Přenáší se průměr
 * a rozptyl v prostoru LAB, roztažení rozptylu je omezené, jinak na
 * jednolitých plochách vznikají barevné závoje.
 *
 * Spuštění:  node tools/tone-match.mjs
 * Vyžaduje:  PLAYWRIGHT_DIR=<cesta k node_modules> (dekódování webp a zápis zpět)
 */
// playwright se do package.json nedává — Netlify by ho tahal při každém buildu.
// Cestu k lokálně nainstalovanému balíku předej přes PLAYWRIGHT_DIR.
const pw = await import(
  process.env.PLAYWRIGHT_DIR ? `${process.env.PLAYWRIGHT_DIR}/playwright/index.js` : 'playwright'
);
const chromium = pw.chromium ?? pw.default.chromium;
import fs from 'fs';
const DIR='/home/user/konsalting-profi-/assets';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const p=await b.newPage();
const b64=f=>fs.readFileSync(`${DIR}/${f}`).toString('base64');
const targets=['about.webp','step.webp','foto-2.webp','foto-3.webp'];
const out=await p.evaluate(async ({base, files, strength})=>{
  const load=(d)=>new Promise(r=>{const i=new Image();i.onload=()=>r(i);i.src='data:image/webp;base64,'+d});
  // sRGB -> LAB
  const f=t=>t>0.008856?Math.cbrt(t):(7.787*t+16/116);
  function toLab(r,g,bl){
    r/=255;g/=255;bl/=255;
    r=r>0.04045?Math.pow((r+0.055)/1.055,2.4):r/12.92;
    g=g>0.04045?Math.pow((g+0.055)/1.055,2.4):g/12.92;
    bl=bl>0.04045?Math.pow((bl+0.055)/1.055,2.4):bl/12.92;
    const X=(r*0.4124+g*0.3576+bl*0.1805)/0.95047,
          Y=(r*0.2126+g*0.7152+bl*0.0722),
          Z=(r*0.0193+g*0.1192+bl*0.9505)/1.08883;
    const fx=f(X),fy=f(Y),fz=f(Z);
    return [116*fy-16, 500*(fx-fy), 200*(fy-fz)];
  }
  const fi=t=>t>0.2068966?t*t*t:(t-16/116)/7.787;
  function toRgb(L,a,bb){
    const fy=(L+16)/116, fx=fy+a/500, fz=fy-bb/200;
    let X=fi(fx)*0.95047, Y=fi(fy), Z=fi(fz)*1.08883;
    let r= X*3.2406+Y*-1.5372+Z*-0.4986,
        g= X*-0.9689+Y*1.8758+Z*0.0415,
        bl=X*0.0557+Y*-0.2040+Z*1.0570;
    const gm=v=>{v=v<=0.0031308?12.92*v:1.055*Math.pow(Math.max(v,0),1/2.4)-0.055;return Math.max(0,Math.min(255,Math.round(v*255)))};
    return [gm(r),gm(g),gm(bl)];
  }
  function stats(img){
    const c=document.createElement('canvas');c.width=img.width;c.height=img.height;
    const g=c.getContext('2d',{willReadFrequently:true});g.drawImage(img,0,0);
    const d=g.getImageData(0,0,c.width,c.height).data;
    const n=d.length/4; const s=[0,0,0], sq=[0,0,0]; const lab=new Float32Array(n*3);
    for(let i=0,j=0;i<d.length;i+=4,j+=3){
      const L=toLab(d[i],d[i+1],d[i+2]);
      lab[j]=L[0];lab[j+1]=L[1];lab[j+2]=L[2];
      for(let k=0;k<3;k++){s[k]+=L[k];sq[k]+=L[k]*L[k]}
    }
    const m=s.map(v=>v/n), sd=sq.map((v,k)=>Math.sqrt(Math.max(1e-6,v/n-m[k]*m[k])));
    return {c,g,d,n,lab,m,sd};
  }
  const baseImg=await load(base);
  const B=stats(baseImg);
  const res={};
  for(const [name,data] of Object.entries(files)){
    const img=await load(data);
    const S=stats(img);
    for(let j=0;j<S.n*3;j+=3){
      const px=[];
      for(let k=0;k<3;k++){
        const v=S.lab[j+k];
        // растяжение разброса ограничим, иначе на однотонных местах лезут цветные ореолы
        let r=B.sd[k]/S.sd[k];
        r=Math.max(0.75,Math.min(k===0?1.25:1.10,r));
        const moved=(v-S.m[k])*r+B.m[k];
        px[k]=v+(moved-v)*strength;
      }
      const rgb=toRgb(px[0],px[1],px[2]);
      const i=(j/3)*4;
      S.d[i]=rgb[0];S.d[i+1]=rgb[1];S.d[i+2]=rgb[2];
    }
    S.g.putImageData(new ImageData(S.d,S.c.width,S.c.height),0,0);
    res[name]=S.c.toDataURL('image/webp',0.72).split(',')[1];
  }
  return {res, base:{m:B.m.map(v=>+v.toFixed(1)), sd:B.sd.map(v=>+v.toFixed(1))}};
},{base:b64('hero.webp'), files:Object.fromEntries(targets.map(f=>[f,b64(f)])), strength:0.72});

console.log('база hero → L,a,b среднее',out.base.m,' разброс',out.base.sd);
for(const [name,data] of Object.entries(out.res)){
  const buf=Buffer.from(data,'base64');
  fs.writeFileSync(`${DIR}/${name}`,buf);
  console.log(name, buf.length+'b');
}
await b.close();
