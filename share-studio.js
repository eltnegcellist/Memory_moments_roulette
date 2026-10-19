/* Share Studio: local-only exports; no PWA share-target, network or cloud upload. */
(()=>{
'use strict';
const byId=id=>document.getElementById(id);
const BASE='https://eltnegcellist.github.io/Memory_moments_roulette/';
const LIMIT=120, MAX_BYTES=48*1024*1024;
const panel=byId('shareSection'), output=byId('shareOutput'), status=byId('shareStatus');
if(!panel)return;
const editor=byId('sharePrivacyEditor'), canvas=byId('sharePrivacyCanvas');
const pctx=canvas.getContext('2d');
let latest=null, recorded=null, recording=null, editorSource=null;
let editIndex=0, marks=[], chosen='🐻', maskSize=.27, outputFile=null, busy=false;
const message=(s)=>{status.textContent=s||'';};
const editorMessage=(s)=>{byId('sharePrivacyStatus').textContent=s||'';};
const getCreation=()=>window.__memoryShareGetActiveCreation?.()||null;
const stickerColors={'🐻':'#e8b886','🐱':'#f6c89e','🌸':'#ffe0e9','⭐':'#fff4a7','🔒':'#c6daee'};
function safeName(name){
 return String(name||'memory-roulette').replace(/[^\w\u3040-\u30ff\u3400-\u9fff-]/g,'_').slice(0,45)||'memory-roulette';
}
function downloadFile(file){
 const url=URL.createObjectURL(file);
 const a=document.createElement('a');a.href=url;a.download=file.name;
 document.body.appendChild(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),30000);
}
function ready(blob,name,label){
 if(blob.size>MAX_BYTES)throw new Error('共有データが大きすぎます（48MB上限）。動画数を減らしてください。');
 outputFile=new File([blob],name,{type:blob.type||'application/octet-stream'});
 output.hidden=false;
 byId('shareOutputLabel').textContent=label+'（'+Math.max(1,Math.ceil(blob.size/1024))+'KB）';
 byId('shareOutputSend').disabled=!(navigator.canShare?.({files:[outputFile]}));
 byId('shareOutputSend').title=byId('shareOutputSend').disabled?'この形式を共有できない場合は保存してLINEからファイル添付してください':'';
 message('準備できました。保存するか、共有先を選んでください。');
}
function clearOutput(){
 outputFile=null;output.hidden=true;byId('shareOutputSend').disabled=true;
}
byId('shareOutputSave').addEventListener('click',()=>{if(outputFile)downloadFile(outputFile);});
byId('shareOutputSend').addEventListener('click',()=>{
 if(!outputFile||!navigator.canShare?.({files:[outputFile]}))return;
 navigator.share({files:[outputFile],title:'思い出ルーレットおみくじ',text:'自分の動画から作った思い出ルーレット '+BASE})
  .catch(err=>{if(err?.name!=='AbortError')message('共有できませんでした。保存してLINE等から添付してください。');});
});
function snapshot(){
 const c=getCreation();
 if(!c||!Array.isArray(c.frames)||!c.frames.length)throw new Error('先にルーレットを作成してください。');
 return c;
}
function packRoulette(c,frames){
 if(!Array.isArray(frames)||frames.length<2||frames.length>LIMIT)throw new Error('共有できるコマ数は2〜120枚です。動画の選択数を減らしてください。');
 const allowed=/^data:image\/(?:png|jpeg|webp);base64,[a-zA-Z0-9+/=]+$/;
 let total=0;
 for(const frame of frames){
   if(typeof frame!=='string'||!allowed.test(frame))throw new Error('共有できない画像形式が含まれます。');
   total+=frame.length;
   if(frame.length>7*1024*1024||total>MAX_BYTES)throw new Error('画像が大きすぎます。共有対象を減らしてください。');
 }
 const data={format:'memory-moments-playable',version:1,title:String(c.title||'思い出ルーレット').slice(0,100),
  mode:c.mode==='roulette'?'roulette':'omikuji',
  times:frames.map((_,i)=>Number(c.times?.[i])||0),
  frames};
 const bytes=JSON.stringify(data);
 if(bytes.length>MAX_BYTES)throw new Error('共有ファイルが48MBを超えます。');
 return new Blob([bytes],{type:'application/json'});
}
async function runBusy(button,work){
 if(busy)return;
 busy=true;button.disabled=true;clearOutput();
 try{await work();}
 catch(err){console.error('share studio:',err);message(err?.message||'処理できませんでした。');editorMessage(err?.message||'処理できませんでした。');}
 finally{busy=false;button.disabled=false;}
}
byId('sharePlayableBuild').addEventListener('click',e=>runBusy(e.currentTarget,async()=>{
 const c=snapshot();
 const blob=packRoulette(c,c.frames);
 ready(blob,safeName(c.title)+'.mmrplay','遊べるルーレットファイル');
 message('写真を含むファイルです。送る相手を確認してください。');
}));
function loadImage(src){
 return new Promise((resolve,reject)=>{
  const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(new Error('画像を読めませんでした。'));im.src=src;
 });
}
function drawPhoto(ctx,img,w,h){
 const iw=img.naturalWidth||img.width,ih=img.naturalHeight||img.height;
 const scale=Math.max(w/iw,h/ih), sw=iw*scale,sh=ih*scale;
 ctx.drawImage(img,(w-sw)/2,(h-sh)/2,sw,sh);
}
function coverMasks(ctx,items,w,h){
 for(const mark of (items||[])){
   const x=mark.x*w,y=mark.y*h,r=mark.size*Math.min(w,h)/2;
   ctx.save();
   ctx.fillStyle=stickerColors[mark.char]||'#e8b886';
   ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
   ctx.textAlign='center';ctx.textBaseline='middle';
   ctx.font=Math.round(r*1.28)+'px sans-serif';
   ctx.fillText(mark.char,x,y+1);
   ctx.restore();
 }
}
async function renderMasked(index){
 const s=editorSource, image=await loadImage(s.frames[index]);
 const max=1080,scale=Math.min(1,max/Math.max(image.naturalWidth,image.naturalHeight));
 const w=Math.round(image.naturalWidth*scale),h=Math.round(image.naturalHeight*scale);
 const off=document.createElement('canvas');off.width=w;off.height=h;
 const context=off.getContext('2d',{alpha:false});
 context.drawImage(image,0,0,w,h);
 coverMasks(context,marks[index],w,h);
 return new Promise((resolve,reject)=>off.toBlob(b=>b?resolve(b):reject(new Error('加工画像を生成できません')), 'image/jpeg',.88));
}
async function maskedFrames(){
 const results=[];
 for(let i=0;i<editorSource.frames.length;i++){
   editorMessage('画像を加工中 '+(i+1)+'/'+editorSource.frames.length);
   const blob=await renderMasked(i);
   results.push(await new Promise((resolve,reject)=>{
     const reader=new FileReader();
     reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(reader.error);
     reader.readAsDataURL(blob);
   }));
 }
 return results;
}
function movieMime(){
 if(typeof MediaRecorder==='undefined')return null;
 for(const item of [
  {mime:'video/mp4;codecs=avc1.42E01E',type:'video/mp4',ext:'.mp4'},
  {mime:'video/mp4',type:'video/mp4',ext:'.mp4'},
  {mime:'video/webm;codecs=vp9',type:'video/webm',ext:'.webm'},
  {mime:'video/webm;codecs=vp8',type:'video/webm',ext:'.webm'},
  {mime:'video/webm',type:'video/webm',ext:'.webm'}
 ]){
  if(MediaRecorder.isTypeSupported?.(item.mime))return item;
 }
 return null;
}
async function makeNormalMovie(frameImages){
 if(!recorded||recorded.source!==getCreation())throw new Error('このルーレットを1回START・STOPしてから動画化してください。');
 if(!HTMLCanvasElement.prototype.captureStream)throw new Error('動画生成に対応していないブラウザです。');
 const format=movieMime();
 if(!format)throw new Error('このブラウザはMP4・WebMの録画に対応していません。');
 const photos=frameImages||recorded.source.frames;
 const finalPhoto=await loadImage(photos[recorded.stopIndex]);
 const isLandscape=finalPhoto.naturalWidth>finalPhoto.naturalHeight*1.12;
 const w=isLandscape?960:540, h=isLandscape?540:960;
 // Convert sources to small temporary canvases one at a time instead of
 // retaining dozens of full-resolution decoded photos in memory.
 const indices=recorded.indices.slice(-64);
 const used=[...new Set(indices.concat(recorded.stopIndex))];
 const cache=new Map();
 for(const ix of used){
  const photo=ix===recorded.stopIndex?finalPhoto:await loadImage(photos[ix]);
  const thumb=document.createElement('canvas');
  thumb.width=Math.round(w*.6);thumb.height=Math.round(h*.6);
  drawPhoto(thumb.getContext('2d',{alpha:false}),photo,thumb.width,thumb.height);
  cache.set(ix,thumb);
 }
 const off=document.createElement('canvas');off.width=w;off.height=h;
 const ctx=off.getContext('2d',{alpha:false});
 const stream=off.captureStream(30), chunks=[];
 const rec=new MediaRecorder(stream,{mimeType:format.mime,videoBitsPerSecond:3000000});
 rec.ondataavailable=e=>{if(e.data?.size)chunks.push(e.data);};
 const done=new Promise((resolve,reject)=>{
   rec.onstop=()=>resolve(new Blob(chunks,{type:format.type}));
   rec.onerror=e=>reject(e.error||new Error('録画中にエラーが発生しました。'));
 });
 const spinSeconds=Math.max(1.2,Math.min(5.4,indices.length*.075));
 const total=spinSeconds+1.8;
 const paint=(index,stopped)=>{
  const img=cache.get(index)||cache.get(recorded.stopIndex);
  ctx.fillStyle='#17141d';ctx.fillRect(0,0,w,h);
  drawPhoto(ctx,img,w,h);
  ctx.fillStyle='rgba(26,18,29,.78)';
  ctx.fillRect(0,0,w,76);
  ctx.font='bold '+(w>h?25:29)+'px sans-serif';ctx.textAlign='center';ctx.fillStyle='#fff7e5';
  ctx.fillText('思い出ルーレットおみくじ',w/2,48);
  ctx.fillStyle=stopped?'rgba(255,245,222,.95)':'rgba(0,0,0,.65)';
  ctx.fillRect(0,h-170,w,170);
  ctx.fillStyle=stopped?'#8d324c':'#fff';ctx.font='bold '+(w>h?39:49)+'px sans-serif';
  ctx.fillText(stopped?(recorded.mode==='omikuji'?(recorded.fortune||'結果発表'):'この瞬間！'):'ルーレット抽選中…',w/2,h-87);
  ctx.fillStyle='#494047';ctx.font='19px sans-serif';
  if(stopped)ctx.fillText('自分では選ばなかった一枚に出会う',w/2,h-42);
 };
 paint(indices[0]??recorded.stopIndex,false);
 rec.start(250);
 const begun=performance.now();
 try{
  await new Promise(resolve=>{
   const tick=now=>{
    const t=(now-begun)/1000;
    if(t>=total){paint(recorded.stopIndex,true);resolve();return;}
    const ix=t<spinSeconds?indices[Math.min(indices.length-1,Math.floor(t/spinSeconds*indices.length))]:recorded.stopIndex;
    paint(ix,t>=spinSeconds);
    requestAnimationFrame(tick);
   };
   requestAnimationFrame(tick);
  });
  rec.stop();
  const blob=await done;
  if(!blob.size)throw new Error('動画データが空です。');
  return {blob,ext:format.ext,type:format.type};
 }finally{
  if(rec.state!=='inactive')try{rec.stop();}catch(e){}
  stream.getTracks().forEach(t=>t.stop());
 }
}
byId('shareVideoBuild').addEventListener('click',e=>runBusy(e.currentTarget,async()=>{
 message('抽選を動画にしています。画面を開いたままにしてください…');
 const {blob,ext,type}=await makeNormalMovie();
 ready(blob,'memory-roulette-'+Date.now()+ext,type==='video/mp4'?'ルーレット動画（MP4）':'ルーレット動画（WebM：相手の端末で再生できない場合があります）');
}));
window.__memoryShareOnStarted=c=>{
 recording={source:c,indices:[],started:performance.now()};
 recorded=null;clearOutput();
};
window.__memoryShareOnFrame=index=>{
 if(!recording)return;
 recording.indices.push(index);
 if(recording.indices.length>100)recording.indices.shift();
};
window.__memoryShareOnStopped=data=>{
 if(!recording)return;
 recorded={source:recording.source,indices:recording.indices.slice(),stopIndex:data.index,
  fortune:data.fortune,mode:data.mode};
 if(!recorded.indices.length)recorded.indices=[recorded.stopIndex];
 recording=null;
};
function setPreviewMeta(){
 const c=getCreation();
 byId('shareSourceState').textContent=c?.frames?.length
  ? '現在のルーレット：'+(c.title||'')+'（'+c.frames.length+'コマ）'
  : '先に「新しい動画」「過去の動画」からルーレットを作成してください。受け取りはいつでも利用できます。';
 byId('shareVideoBuild').disabled=!(recorded&&recorded.source===c);
 byId('sharePlayableBuild').disabled=!(c?.frames?.length);
 byId('sharePrivacyBegin').disabled=!(c?.frames?.length);
}
window.__memoryShareOnOpen=()=>{setPreviewMeta();message('画像や動画は端末内で生成します。共有先への送信は利用者が選んだ場合のみです。');};
byId('shareOpenFromPlay').addEventListener('click',()=>window.__memoryNavigate?.('share'));
function validatePlayFile(payload){
 if(!payload||payload.format!=='memory-moments-playable'||payload.version!==1)throw new Error('対応していないルーレットファイルです。');
 const raw=payload.frames;
 if(!Array.isArray(raw)||raw.length<2||raw.length>LIMIT)throw new Error('画像枚数が不正です。');
 let sum=0;
 for(const src of raw){
   if(typeof src!=='string'||!/^data:image\/(?:png|jpeg|webp);base64,[a-zA-Z0-9+/=]+$/.test(src))throw new Error('画像に不正なデータがあります。');
   sum+=src.length;
   if(src.length>7*1024*1024||sum>MAX_BYTES)throw new Error('共有データが大きすぎます。');
 }
 return {
  id:null,shareImported:true,title:String(payload.title||'共有ルーレット').slice(0,100),
  frames:raw,frameCount:raw.length,mode:payload.mode==='roulette'?'roulette':'omikuji',
  fortunes:[],times:raw.map((_,i)=>Number.isFinite(payload.times?.[i])?Number(payload.times[i]):i)
 };
}
byId('shareImportFile').addEventListener('change',async e=>{
 const file=e.target.files?.[0];e.target.value='';
 if(!file)return;
 if(file.size>MAX_BYTES){message('48MB以下のルーレットファイルを選んでください。');return;}
 try{
   const data=JSON.parse(await file.text());
   const c=validatePlayFile(data);
   clearOutput();window.__memoryShareLoadCreation?.(c);
 }catch(err){console.error('roulette import:',err);message('読み込めませんでした：'+(err?.message||err));}
});
function sourceForCurrent(){
 const c=snapshot();
 if(c.frames.length>LIMIT)throw new Error('スタンプ加工は120コマまでです。動画を少なく選択してください。');
 return {kind:'roulette',title:c.title||'ルーレット',frames:c.frames.slice(),creation:c};
}
function sourceForGif(){
 const result=window.__memoryShareGetGifSource?.();
 if(!result?.frames?.length)throw new Error('先にGIF画面で動画を選択してください。');
 if(result.frames.length>LIMIT)throw new Error('GIFのコマ数が120枚を超えます。');
 return {kind:'gif',title:result.title,frames:result.frames.map(f=>f.image),
  times:result.frames.map(f=>f.time),delay:result.delay};
}
window.__memoryShareOpenPhoto=item=>{
 if(!item?.image)return;
 window.__memoryNavigate?.('share');
 openEditor({kind:'photo',title:'お気に入り',frames:[item.image]});
};
byId('sharePrivacyBegin').addEventListener('click',()=>{
 try{openEditor(sourceForCurrent());}catch(err){message(err.message);}
});
byId('sharePrivacyGif').addEventListener('click',()=>{
 try{const src=sourceForGif();window.__memoryNavigate?.('share');openEditor(src);}catch(err){message(err.message);}
});
function openEditor(src){
 editorSource=src;marks=src.frames.map(()=>[]);editIndex=src.kind==='roulette'?Math.max(0,Math.min(src.frames.length-1,window.__memoryShareGetCurrentIndex?.()||0)):0;chosen='🐻';maskSize=.27;
 editor.hidden=false;clearOutput();
 byId('sharePrivacyTitle').textContent='ひみつスタンプ：'+src.title;
 byId('sharePrivacyReview').checked=false;
 const hasMore=src.frames.length>1;
 byId('shareMaskPrev').disabled=!hasMore;byId('shareMaskNext').disabled=!hasMore;
 byId('sharePrivacyExportImage').hidden=src.kind!=='photo'&&src.kind!=='roulette';
 byId('sharePrivacyExportGif').hidden=src.kind!=='gif';
 byId('sharePrivacyExportPlay').hidden=src.kind!=='roulette';
 byId('sharePrivacyExportVideo').hidden=src.kind!=='roulette'||!recorded||recorded.source!==src.creation;
 editorMessage('スタンプで顔を隠せます。顔以外の背景や服装も確認してください。');
 renderEditor();
 editor.scrollIntoView({behavior:'smooth',block:'start'});
}
async function renderEditor(){
 if(!editorSource)return;
 const token=editIndex;
 const im=await loadImage(editorSource.frames[token]);
 if(!editorSource||editIndex!==token)return;
 const max=600,ratio=Math.min(1,max/Math.max(im.naturalWidth,im.naturalHeight));
 canvas.width=Math.max(1,Math.round(im.naturalWidth*ratio));
 canvas.height=Math.max(1,Math.round(im.naturalHeight*ratio));
 pctx.drawImage(im,0,0,canvas.width,canvas.height);
 coverMasks(pctx,marks[token],canvas.width,canvas.height);
 byId('shareMaskIndex').textContent=(token+1)+' / '+editorSource.frames.length+'コマ';
 byId('shareMaskCount').textContent=marks[token].length+'個のスタンプ';
}
canvas.addEventListener('click',e=>{
 if(!editorSource)return;
 const box=canvas.getBoundingClientRect();
 const x=Math.max(0,Math.min(1,(e.clientX-box.left)/box.width));
 const y=Math.max(0,Math.min(1,(e.clientY-box.top)/box.height));
 marks[editIndex].push({x,y,size:maskSize,char:chosen});
 byId('sharePrivacyReview').checked=false;renderEditor().catch(console.error);
});
byId('shareMaskPrev').addEventListener('click',()=>{editIndex=(editIndex-1+marks.length)%marks.length;renderEditor().catch(console.error);});
byId('shareMaskNext').addEventListener('click',()=>{editIndex=(editIndex+1)%marks.length;renderEditor().catch(console.error);});
byId('shareMaskUndo').addEventListener('click',()=>{marks[editIndex]?.pop();byId('sharePrivacyReview').checked=false;renderEditor().catch(console.error);});
byId('shareMaskCopy').addEventListener('click',()=>{
 if(!marks[editIndex]?.length)return;
 if(!confirm('このスタンプ位置をすべてのコマにコピーします。人物が動くと顔が露出することがあります。全コマを必ず確認してください。'))return;
 marks=marks.map(()=>marks[editIndex].map(m=>({...m})));
 byId('sharePrivacyReview').checked=false;renderEditor().catch(console.error);
});
byId('shareMaskSize').addEventListener('input',e=>{maskSize=Number(e.target.value)/100;});
byId('shareMaskType').addEventListener('change',e=>{chosen=e.target.value;});
byId('sharePrivacyClose').addEventListener('click',()=>{editor.hidden=true;editorSource=null;});
function exportChecked(){
 if(!editorSource||!byId('sharePrivacyReview').checked)throw new Error('全コマを確認し、チェックを入れてください。');
 if(!marks.some(arr=>arr.length))throw new Error('まずスタンプを置いてください。');
}
byId('sharePrivacyExportImage').addEventListener('click',e=>runBusy(e.currentTarget,async()=>{
 exportChecked();
 const blob=await renderMasked(editIndex);
 ready(blob,'secret-moment-'+Date.now()+'.jpg','スタンプ加工済み写真（現在表示中の1コマ）');
}));
byId('sharePrivacyExportPlay').addEventListener('click',e=>runBusy(e.currentTarget,async()=>{
 exportChecked();
 const frames=await maskedFrames();
 const blob=packRoulette(editorSource.creation,frames);
 ready(blob,'secret-roulette-'+Date.now()+'.mmrplay','スタンプ加工済みの遊べるルーレット');
}));
byId('sharePrivacyExportGif').addEventListener('click',e=>runBusy(e.currentTarget,async()=>{
 exportChecked();
 if(typeof window.__memoryShareEncodeGif!=='function')throw new Error('GIF書き出し機能が利用できません。');
 const frames=await maskedFrames();
 const items=frames.map((image,i)=>({image,time:Number(editorSource.times?.[i])||i}));
 const blob=await window.__memoryShareEncodeGif(items,editorSource.delay||20);
 ready(blob,'secret-roulette-'+Date.now()+'.gif','ひみつスタンプGIF');
}));
byId('sharePrivacyExportVideo').addEventListener('click',e=>runBusy(e.currentTarget,async()=>{
 exportChecked();
 const frames=await maskedFrames();
 const {blob,ext,type}=await makeNormalMovie(frames);
 ready(blob,'secret-roulette-'+Date.now()+ext,type==='video/mp4'?'ひみつスタンプ動画（MP4）':'ひみつスタンプ動画（WebM）');
}));
if(location.hash==='#share')window.__memoryShareOnOpen?.();
})();
