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
let latest=null, recorded=null, recording=null, editorSource=null, favoritePhoto=null;
let editIndex=0, marks=[], chosen='🐻', maskSize=.27, outputFile=null, busy=false;
let savedSelection=null, shareFromPlayer=false, shareSelectToken=0;
const historyPicker=document.createElement('div');
historyPicker.id='shareSavedPicker';
historyPicker.hidden=true;
historyPicker.style.cssText='margin:14px 0;padding:14px;border:1px solid #eadfd8;border-radius:14px;background:#fff7ef';
historyPicker.innerHTML='<label for="shareSavedPickerSelect">共有する過去のルーレット</label>'+
  '<select id="shareSavedPickerSelect" style="display:block;width:100%;margin-top:8px;min-height:48px">'+
  '<option value="">履歴を確認しています…</option></select>'+
  '<p id="shareSavedPickerHint" class="note" role="status" aria-live="polite"></p>';
byId('shareSourceState').after(historyPicker);
// Home shortcut and player button have different source semantics.
document.addEventListener('click',e=>{
 if(e.target.closest?.('[data-route="share"]'))shareFromPlayer=false;
},true);
const message=(s)=>{status.textContent=s||'';};
const editorMessage=(s)=>{byId('sharePrivacyStatus').textContent=s||'';};
const getCreation=()=>savedSelection||(shareFromPlayer?window.__memoryShareGetActiveCreation?.():null);
function shareStopIndex(c){
 const count=c?.frames?.length||0;
 if(shareFromPlayer&&c===window.__memoryShareGetActiveCreation?.()){
  const current=window.__memoryShareGetCurrentIndex?.();
  if(Number.isInteger(current)&&current>=0&&current<count)return current;
 }
 const draws=Array.isArray(c?.drawHistory)?c.drawHistory:[];
 const index=draws.length?draws[draws.length-1]?.index:null;
 return Number.isInteger(index)&&index>=0&&index<count?index:0;
}
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
 byId('shareOutputLabel').textContent=label+'（'+Math.max(1,Math.ceil(blob.size/1024))+'KB）';
 const supported=!!(navigator.share&&navigator.canShare?.({files:[outputFile]}));
 byId('shareOutputSend').disabled=false;
 byId('shareOutputSend').textContent=supported?'共有先を選ぶ':'送るために端末へ保存';
 byId('shareOutputHelp').textContent=supported
  ?'送信する前に共有内容と送信相手を確認してください。'
  :'この形式は直接共有できません。端末に保存してから、LINEの「ファイル」添付で送ってください。';
 output.hidden=false;
 message('ファイルができました。保存か送信を選んでください。');
 byId('shareOutputSave').focus();
}
function closeOutput(){output.hidden=true;}
function clearOutput(){outputFile=null;closeOutput();}
byId('shareOutputClose').addEventListener('click',closeOutput);
output.addEventListener('click',e=>{if(e.target===output)closeOutput();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!output.hidden)closeOutput();});
byId('shareOutputSave').addEventListener('click',()=>{
 if(!outputFile)return;
 downloadFile(outputFile);closeOutput();
 message('端末へ保存しました。LINEなどで送る場合は「ファイル」として添付してください。');
});
byId('shareOutputSend').addEventListener('click',async()=>{
 if(!outputFile)return;
 if(!navigator.share||!navigator.canShare?.({files:[outputFile]})){
   downloadFile(outputFile);closeOutput();
   message('ファイルを端末に保存しました。LINEの「ファイル」添付から送ってください。');
   return;
 }
 try{
   await navigator.share({files:[outputFile],title:'思い出ルーレットおみくじ',text:'自分の動画から作った思い出ルーレット '+BASE});
   closeOutput();
 }catch(err){
   if(err?.name!=='AbortError'){
     byId('shareOutputHelp').textContent='直接共有できませんでした。端末に保存し、LINEからファイル添付してください。';
   }
 }
});
function snapshot(){
 const c=getCreation();
 if(!c||!Array.isArray(c.frames)||!c.frames.length)throw new Error('共有するルーレットを履歴から選んでください。');
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
function chooseMovieSequence(c){
 // Prefer actually captured roulette frames; use a generated spin for a
 // saved roulette that was not just stopped on this page.
 if(recorded?.source===c&&Array.isArray(recorded.indices)&&recorded.indices.length)return recorded;
 const count=c.frames.length;
 let previous=-1;
 const indices=[];
 for(let i=0,n=Math.max(26,Math.min(64,count*4));i<n;i++){
   let ix=Math.floor(Math.random()*count);
   if(count>1&&ix===previous)ix=(ix+1+Math.floor(Math.random()*(count-1)))%count;
   indices.push(ix);previous=ix;
 }
 const stopIndex=shareStopIndex(c);
 return {source:c,indices,stopIndex,mode:c.mode,
   fortune:c.mode==='omikuji'?(c.fortunes?.[stopIndex]||'今日の運勢'):null,generated:true};
}
async function makeNormalMovie(frameImages){
 const creation=snapshot();
 if(creation.frames.length<2)throw new Error('動画には2枚以上のコマが必要です。');
 const playback=chooseMovieSequence(creation);
 if(!HTMLCanvasElement.prototype.captureStream)throw new Error('動画生成に対応していないブラウザです。');
 const format=movieMime();
 if(!format)throw new Error('このブラウザはMP4・WebMの録画に対応していません。');
 const photos=frameImages||playback.source.frames;
 const finalPhoto=await loadImage(photos[playback.stopIndex]);
 const isLandscape=finalPhoto.naturalWidth>finalPhoto.naturalHeight*1.12;
 const w=isLandscape?960:540, h=isLandscape?540:960;
 // Convert sources to small temporary canvases one at a time instead of
 // retaining dozens of full-resolution decoded photos in memory.
 const indices=playback.indices.slice(-64);
 const used=[...new Set(indices.concat(playback.stopIndex))];
 const cache=new Map();
 for(const ix of used){
  const photo=ix===playback.stopIndex?finalPhoto:await loadImage(photos[ix]);
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
  const img=cache.get(index)||cache.get(playback.stopIndex);
  ctx.fillStyle='#17141d';ctx.fillRect(0,0,w,h);
  drawPhoto(ctx,img,w,h);
  ctx.fillStyle='rgba(26,18,29,.78)';
  ctx.fillRect(0,0,w,76);
  ctx.font='bold '+(w>h?25:29)+'px sans-serif';ctx.textAlign='center';ctx.fillStyle='#fff7e5';
  ctx.fillText('思い出ルーレットおみくじ',w/2,48);
  ctx.fillStyle=stopped?'rgba(255,245,222,.95)':'rgba(0,0,0,.65)';
  ctx.fillRect(0,h-170,w,170);
  ctx.fillStyle=stopped?'#8d324c':'#fff';ctx.font='bold '+(w>h?39:49)+'px sans-serif';
  ctx.fillText(stopped?(playback.mode==='omikuji'?(playback.fortune||'結果発表'):'この瞬間！'):'ルーレット抽選中…',w/2,h-87);
  ctx.fillStyle='#494047';ctx.font='19px sans-serif';
  if(stopped)ctx.fillText('自分では選ばなかった一枚に出会う',w/2,h-42);
 };
 paint(indices[0]??playback.stopIndex,false);
 rec.start(250);
 const begun=performance.now();
 try{
  await new Promise(resolve=>{
   const tick=now=>{
    const t=(now-begun)/1000;
    if(t>=total){paint(playback.stopIndex,true);resolve();return;}
    const ix=t<spinSeconds?indices[Math.min(indices.length-1,Math.floor(t/spinSeconds*indices.length))]:playback.stopIndex;
    paint(ix,t>=spinSeconds);
    requestAnimationFrame(tick);
   };
   requestAnimationFrame(tick);
  });
  rec.stop();
  const blob=await done;
  if(!blob.size)throw new Error('動画データが空です。');
  // Android fragmented MP4 headers can report 0s / ~3s even if frames last
  // longer. Patch mvhd/tkhd/mdhd using the actual sample timeline; do not
  // transcode or reorder the recorded frames.
  let movie=blob;
  if(format.type==='video/mp4'){
   if(typeof window.__memoryFixMp4Duration!=='function')
    throw new Error('動画の再生時間を確定できませんでした。ページを再読み込みしてください');
   movie=(await window.__memoryFixMp4Duration(blob,total)).blob;
  }
  return {blob:movie,ext:format.ext,type:format.type};
 }finally{
  if(rec.state!=='inactive')try{rec.stop();}catch(e){}
  stream.getTracks().forEach(t=>t.stop());
 }
}
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
 const c=getCreation(),count=c?.frames?.length||0;
 byId('shareSourceState').textContent=count
  ? (shareFromPlayer?'現在のルーレット：':'選んだルーレット：')+(c.title||'')+'（'+count+'コマ）'
  : shareFromPlayer?'再生中のルーレットがありません。'
   :'まず共有したいルーレットを上の履歴から選んでください。';
 byId('shareRouletteBuild').disabled=count<1;
 const format=byId('shareRouletteFormat').value;
 byId('shareRouletteBuild').textContent=format==='movie'?'動画を作成して保存・共有':
   format==='play'?'遊べるファイルを作成して保存・共有':'写真を作成して保存・共有';
}
async function showSavedHistory(){
 const token=shareSelectToken, select=byId('shareSavedPickerSelect'), hint=byId('shareSavedPickerHint');
 select.replaceChildren(new Option('履歴を読み込んでいます…',''));select.disabled=true;
 hint.textContent='この端末に保存したルーレットを確認しています。';
 try{
  try{await window.__memoryHistoryMigrationPromise;}catch(e){console.warn('share migration',e);}
  const all=await dbAll();
  if(token!==shareSelectToken)return;
  select.replaceChildren(new Option('共有するルーレットを選んでください',''));
  for(const x of all.filter(x=>x?.id)){
   const count=Number(x.frameCount)||x.frames?.length||x.deckCandidateIds?.length||0;
   const date=new Date(x.updatedAt||x.createdAt||Date.now()).toLocaleDateString('ja-JP');
   select.add(new Option((x.title||'ルーレット')+' ・ '+date+' ・ '+count+'コマ',x.id));
  }
  select.disabled=!all.length;
  hint.textContent=all.length?'保存済みのルーレットを選ぶと、共有ファイルを作成できます。'
   :'この端末にはまだ作ったルーレットがありません。ホームから作成してください。';
 }catch(err){
  if(token!==shareSelectToken)return;
  console.error('share history list failed',err);
  select.replaceChildren(new Option('履歴を読み込めませんでした',''));
  hint.textContent='履歴を読み込めませんでした。ホームの「履歴」を確認してください。';
 }
}
byId('shareSavedPickerSelect').addEventListener('change',async e=>{
 const id=e.currentTarget.value,token=++shareSelectToken,hint=byId('shareSavedPickerHint');
 savedSelection=null;clearOutput();editor.hidden=true;editorSource=null;marks=[];
 setPreviewMeta();
 if(!id){hint.textContent='共有するルーレットを選択してください。';return;}
 hint.textContent='選んだルーレットを読み込んでいます…';
 try{
  const c=await dbGet(id); // dbGet hydrates images referenced by saved deck frames.
  if(token!==shareSelectToken)return;
  if(!c?.frames?.length){
   hint.textContent='元の画像がなくなっているため共有できません。別の履歴を選んでください。';
   return;
  }
  savedSelection=c;
  hint.textContent='読み込みました。下で共有形式を選んでください。';
 }catch(err){
  if(token!==shareSelectToken)return;
  console.error('share history hydrate failed',err);
  hint.textContent='読み込みに失敗しました。別の履歴を選んでください。';
 }
 setPreviewMeta();
});
window.__memoryShareOnOpen=()=>{
 ++shareSelectToken;savedSelection=null;
 historyPicker.hidden=shareFromPlayer;
 favoritePhoto=null;
 byId('shareRouletteOptions').hidden=false;
 byId('shareFavoriteOptions').hidden=true;
 byId('sharePageHeading').textContent='思い出のルーレットを届ける';
 setPreviewMeta();
 byId('shareRouletteMask').checked=false;
 byId('shareFavoriteMask').checked=false;
 editor.hidden=true;editorSource=null;marks=[];clearOutput();
 if(!shareFromPlayer)showSavedHistory();
 message('端末内でファイルを作成します。共有先への送信は自分で選んだ場合のみです。');
};
byId('shareOpenFromPlay').addEventListener('click',()=>{
 shareFromPlayer=true;
 window.__memoryNavigate?.('share');
});
byId('shareRouletteFormat').addEventListener('change',()=>{
 clearOutput();editor.hidden=true;editorSource=null;marks=[];setPreviewMeta();
});
byId('shareRouletteMask').addEventListener('change',()=>{
 clearOutput();editor.hidden=true;editorSource=null;marks=[];
});
function outputFormatLabel(format){
 return format==='movie'?'抽選動画':format==='photo'?'停止写真':'遊べるルーレット';
}
async function makePhotoBlob(frame){
 const image=await loadImage(frame);
 const canvas=document.createElement('canvas');
 canvas.width=image.naturalWidth||image.width;
 canvas.height=image.naturalHeight||image.height;
 canvas.getContext('2d',{alpha:false}).drawImage(image,0,0,canvas.width,canvas.height);
 return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('写真を作成できませんでした。')),'image/jpeg',.9));
}
async function buildRouletteFile(c,format,maskedFramesList=null){
 // For an unmasked share, ALWAYS use the original candidate images from c.frames.
 // Stamps are never applied to the deck or written back to storage.
 const frames=maskedFramesList||c.frames;
 if(format==='play'){
   ready(packRoulette(c,frames),'memory-roulette-'+Date.now()+'.mmrplay',maskedFramesList?'スタンプ付きの遊べるルーレット':'遊べるルーレット');
 }else if(format==='movie'){
   message('抽選動画を作成しています。画面を閉じずにお待ちください。');
   const {blob,ext,type}=await makeNormalMovie(maskedFramesList);
   ready(blob,'memory-roulette-'+Date.now()+ext,
    (maskedFramesList?'スタンプ付きの':'')+'抽選動画（'+(type==='video/mp4'?'MP4':'WebM')+'）');
 }else if(format==='photo'){
   const blob=await makePhotoBlob(frames[shareStopIndex(c)]);
   ready(blob,'memory-moment-'+Date.now()+'.jpg',maskedFramesList?'スタンプ付きの写真':'停止写真');
 }else throw new Error('共有形式を選んでください。');
}
byId('shareRouletteBuild').addEventListener('click',e=>runBusy(e.currentTarget,async()=>{
 const c=snapshot(),format=byId('shareRouletteFormat').value;
 if((format==='play'||format==='movie')&&c.frames.length<2)throw new Error('2コマ以上のルーレットが必要です。');
 if(byId('shareRouletteMask').checked){
   // Opening a new privacy session resets every previous mask, even if the
   // user exported a different masked format before.
   openEditor({...sourceForCurrent(),selectedFormat:format});
   return;
 }
 editor.hidden=true;editorSource=null;marks=[];
 await buildRouletteFile(c,format);
}));
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
const receiveMessage=text=>{byId('receiveStatus').textContent=text||'';};
byId('shareImportFile').addEventListener('change',async e=>{
 const file=e.target.files?.[0];e.target.value='';
 if(!file)return;
 if(file.size>MAX_BYTES){receiveMessage('48MB以下のルーレットファイルを選んでください。');return;}
 receiveMessage('受け取ったルーレットを読み込んでいます…');
 try{
   const data=JSON.parse(await file.text());
   const c=validatePlayFile(data);
   clearOutput();
   receiveMessage('');
   window.__memoryShareLoadCreation?.(c);
 }catch(err){
   console.error('roulette import:',err);
   receiveMessage('読み込めませんでした：'+(err?.message||err));
 }
});
function sourceForCurrent(){
 const c=snapshot();
 if(c.frames.length>LIMIT)throw new Error('スタンプ加工は120コマまでです。動画を少なく選択してください。');
 return {kind:'roulette',title:c.title||'ルーレット',frames:c.frames.slice(),creation:c,stopIndex:shareStopIndex(c)};
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
 // Enter the standard sharing screen first. Stamps are optional, never forced.
 favoritePhoto={image:item.image};
 ++shareSelectToken;
 historyPicker.hidden=true;
 byId('shareRouletteOptions').hidden=true;
 byId('shareFavoriteOptions').hidden=false;
 byId('sharePageHeading').textContent='お気に入りの写真を共有する';
 byId('shareSourceState').textContent='お気に入りから選んだ写真を共有します。';
 byId('shareFavoriteMask').checked=false;
 editor.hidden=true;editorSource=null;marks=[];clearOutput();
 message('スタンプなしで共有できます。必要なときだけ「ひみつスタンプ」を選んでください。');
};
byId('shareFavoriteMask').addEventListener('change',()=>{
 clearOutput();editor.hidden=true;editorSource=null;marks=[];
});
byId('shareFavoriteBuild').addEventListener('click',e=>runBusy(e.currentTarget,async()=>{
 if(!favoritePhoto?.image)throw new Error('お気に入り写真を選び直してください。');
 if(byId('shareFavoriteMask').checked){
  openEditor({kind:'photo',title:'お気に入り',frames:[favoritePhoto.image],selectedFormat:'photo'});
  return;
 }
 const blob=await makePhotoBlob(favoritePhoto.image);
 ready(blob,'memory-moment-'+Date.now()+'.jpg','お気に入りの写真');
}));
byId('sharePrivacyGif').addEventListener('click',()=>{
 try{const src=sourceForGif();window.__memoryNavigate?.('share');openEditor({...src,selectedFormat:'gif'});}catch(err){message(err.message);}
});
function openEditor(src){
 editorSource=src;marks=src.frames.map(()=>[]);editIndex=src.kind==='roulette'?Math.max(0,Math.min(src.frames.length-1,src.stopIndex||0)):0;chosen='🐻';maskSize=.27;
 editor.hidden=false;clearOutput();
 byId('sharePrivacyTitle').textContent='ひみつスタンプ：'+src.title;
 const hasMore=src.frames.length>1;
 byId('shareMaskPrev').disabled=!hasMore;byId('shareMaskNext').disabled=!hasMore;
 const format=src.selectedFormat||'photo';
 byId('sharePrivacyExportSelected').textContent='スタンプ付き'+
   (format==='movie'?'動画':format==='play'?'遊べるルーレット':format==='gif'?'GIF':'写真')+
   'を作成して保存・共有';
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
 renderEditor().catch(console.error);
});
byId('shareMaskPrev').addEventListener('click',()=>{editIndex=(editIndex-1+marks.length)%marks.length;renderEditor().catch(console.error);});
byId('shareMaskNext').addEventListener('click',()=>{editIndex=(editIndex+1)%marks.length;renderEditor().catch(console.error);});
byId('shareMaskUndo').addEventListener('click',()=>{marks[editIndex]?.pop();renderEditor().catch(console.error);});
byId('shareMaskCopy').addEventListener('click',()=>{
 if(!marks[editIndex]?.length)return;
 if(!confirm('このスタンプ位置をすべてのコマにコピーします。人物が動くと顔が露出することがあります。全コマを必ず確認してください。'))return;
 marks=marks.map(()=>marks[editIndex].map(m=>({...m})));
 renderEditor().catch(console.error);
});
byId('shareMaskSize').addEventListener('input',e=>{maskSize=Number(e.target.value)/100;});
byId('shareMaskType').addEventListener('change',e=>{chosen=e.target.value;});
byId('sharePrivacyClose').addEventListener('click',()=>{editor.hidden=true;editorSource=null;});
function exportChecked(){
 if(!editorSource)throw new Error('編集する画像を選んでください。');
 if(!marks.some(arr=>arr.length))throw new Error('まずスタンプを置いてください。');
 const untouched=marks.filter(arr=>!arr.length).length;
 if(editorSource.frames.length>1&&untouched){
   editorMessage('スタンプ未設定のコマが'+untouched+'枚あります。隠したい部分がないか確認してください。');
 }
}
byId('sharePrivacyExportSelected').addEventListener('click',e=>runBusy(e.currentTarget,async()=>{
 exportChecked();
 const format=editorSource.selectedFormat;
 if(format==='photo'){
   const blob=await renderMasked(editIndex);
   ready(blob,'secret-moment-'+Date.now()+'.jpg','スタンプ付きの写真（現在のコマ）');
   return;
 }
 const frames=await maskedFrames();
 if(format==='gif'){
   if(typeof window.__memoryShareEncodeGif!=='function')throw new Error('GIF書き出し機能が利用できません。');
   const items=frames.map((image,i)=>({image,time:Number(editorSource.times?.[i])||i}));
   const blob=await window.__memoryShareEncodeGif(items,editorSource.delay||20);
   ready(blob,'secret-roulette-'+Date.now()+'.gif','スタンプ付きGIF');
   return;
 }
 await buildRouletteFile(editorSource.creation,format,frames);
}));
if(location.hash==='#share')window.__memoryShareOnOpen?.();
})();
