/* Share Studio: local-only exports; no PWA share-target, network or cloud upload. */
(()=>{
'use strict';
const byId=id=>document.getElementById(id);
const BASE=new URL('./', document.baseURI).href;
const LIMIT=120, MAX_BYTES=48*1024*1024;
const panel=byId('shareSection'), output=byId('shareOutput'), status=byId('shareStatus');
if(!panel)return;
const editor=byId('sharePrivacyEditor'), canvas=byId('sharePrivacyCanvas');
const pctx=canvas.getContext('2d');
let latest=null, recorded=null, recording=null, editorSource=null, favoritePhoto=null;
let editIndex=0, marks=[], chosen='🐻', maskSize=.27, outputFile=null, busy=false;
let outputGeneration=0, activeOutputGeneration=0;
let savedSelection=null, shareFromPlayer=false, shareSelectToken=0;
let simpleHtml=null, simpleZip=null, simpleExportToken=0;
let selectedStopIndex=null, selectedDraw=null, frameGridPage=0;
const FRAME_PAGE_SIZE=30;
const savedGallery=byId('shareSavedGallery');
const pickerStatus=byId('sharePickerStatus');
const message=(s)=>{
 status.textContent=s||'';
 // GIF privacy export happens inside the GIF page, not the roulette sharing page.
 if(editorSource?.kind==='gif'){
  const gifStatus=byId('labGifStatus');
  if(gifStatus){gifStatus.style.display='block';gifStatus.textContent=s||'';}
 }
};
const editorMessage=(s)=>{byId('sharePrivacyStatus').textContent=s||'';};
const stopPicker=byId('shareStopPicker');
const getCreation=()=>savedSelection||(shareFromPlayer?window.__memoryShareGetActiveCreation?.():null);
function shareStopIndex(c){
 const count=c?.frames?.length||0;
 if(Number.isInteger(selectedStopIndex)&&selectedStopIndex>=0&&selectedStopIndex<count)return selectedStopIndex;
 if(shareFromPlayer&&c===window.__memoryShareGetActiveCreation?.()){
  const index=window.__memoryShareGetCurrentIndex?.();
  if(Number.isInteger(index)&&index>=0&&index<count)return index;
 }
 const draws=Array.isArray(c?.drawHistory)?c.drawHistory:[];
 for(let i=draws.length-1;i>=0;i--){
  const index=draws[i]?.index;
  if(Number.isInteger(index)&&index>=0&&index<count)return index;
 }
 return 0;
}
function shareStopFortune(c,index){
 if(selectedDraw?.index===index&&selectedDraw?.fortune)return selectedDraw.fortune;
 if(shareFromPlayer&&recorded?.source===c&&recorded.stopIndex===index&&recorded.fortune)return recorded.fortune;
 const draws=Array.isArray(c?.drawHistory)?c.drawHistory:[];
 for(let i=draws.length-1;i>=0;i--){
  if(draws[i]?.index===index&&draws[i]?.fortune)return draws[i].fortune;
 }
 return c?.fortunes?.[index]||null;
}
const stickerColors={'🐻':'#e8b886','🐱':'#f6c89e','🌸':'#ffe0e9','⭐':'#fff4a7','🔒':'#c6daee'};
function safeName(name){
 return String(name||'memory-roulette').replace(/[^\w\u3040-\u30ff\u3400-\u9fff-]/g,'_').slice(0,45)||'memory-roulette';
}
function ready(blob,name,label){
 if(busy&&activeOutputGeneration!==outputGeneration)return;
 if(blob.size>MAX_BYTES)throw new Error('共有データが大きすぎます（48MB上限）。動画数を減らしてください。');
 // Chromium Android checks the MIME type by exact string match. Keep HTML UTF-8
 // bytes intact, but send the file with the permitted text/html media type.
 const fileType=/\.html?$/i.test(name)?'text/html':(blob.type||'application/octet-stream');
 outputFile=new File([blob],name,{type:fileType});
 byId('shareOutputLabel').textContent=label+'（'+Math.max(1,Math.ceil(blob.size/1024))+'KB）';
 byId('shareOutputSave').textContent=typeof window.showSaveFilePicker==='function'?'保存先を選んで保存':'↓ 端末に保存';
 const isBundle=/\.(?:html|zip)$/i.test(name);
 const supported=!!(navigator.share&&navigator.canShare?.({files:[outputFile]}));
 byId('shareOutputSend').hidden=false;
 byId('shareOutputSend').disabled=isBundle&&!supported;
 byId('shareOutputSend').textContent=isBundle?'LINEなどへ直接共有':(supported?'共有先を選ぶ':'送るために端末へ保存');
 byId('shareOutputHelp').textContent=supported
  ?(isBundle?'ZIP/HTMLファイルのみをAndroidの共有画面へ渡します。LINEなどの送り先を選択してください。添付されるかは相手のアプリに依存します。':'送信する前に共有内容と送信相手を確認してください。')
  :'このブラウザーではファイルの直接共有が利用できません。Chromeで開き直してお試しください。端末保存も利用できます。';
 output.hidden=false;
 message('ファイルができました。保存か送信を選んでください。');
 byId('shareOutputSave').focus();
}
function closeOutput(){output.hidden=true;}
function clearOutput(){
 outputGeneration++;outputFile=null;closeOutput();
}
window.addEventListener('hashchange',clearOutput);
byId('shareOutputClose').addEventListener('click',closeOutput);
output.addEventListener('click',e=>{if(e.target===output)closeOutput();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!output.hidden)closeOutput();});
byId('shareOutputSave').addEventListener('click',async()=>{
 if(!outputFile)return;
 const file=outputFile;
 try{
  const saved=await window.__memorySaveMediaFile(file,file.name);
  if(saved.mode==='cancelled')return;
  closeOutput();
  message(saved.mode==='picker'?'選択したフォルダへ保存しました。':(saved.warning||'ダウンロードを開始しました。'));
 }catch(err){message(err?.message||'端末へ保存できませんでした。');}
});
byId('shareOutputSend').addEventListener('click',async()=>{
 if(!outputFile)return;
 const file=outputFile;
 const isBundle=/\.(?:html|zip)$/i.test(file.name);
 if(!navigator.share||!navigator.canShare?.({files:[file]})){
   if(isBundle){
     byId('shareOutputHelp').textContent='このブラウザーからのファイル直接共有は利用できません。Android Chromeで開き直してお試しください。';
     return;
   }
   const saved=await window.__memorySaveMediaFile(file,file.name);
   if(saved.mode==='cancelled')return;
   closeOutput();
   message(saved.mode==='picker'?'選択したフォルダへ保存しました。LINEからファイルを添付してください。':(saved.warning||'ダウンロードを開始しました。LINEからファイルを添付してください。'));
   return;
 }
 try{
   // ZIP/HTML must be sent as an actual attachment. Sending a title/text/URL
   // alongside it makes some Android share targets treat the intent as text.
   // Trigger navigator.share directly from the click handler (user activation).
   const data=isBundle?{files:[file]}:{files:[file],title:'思い出ルーレットおみくじ',text:'自分の動画から作った思い出ルーレット '+BASE};
   await navigator.share(data);
   closeOutput();
 }catch(err){
   if(err?.name==='AbortError')return;
   const kind=typeof err?.name==='string' ? err.name : 'UnknownError';
   const detail=typeof err?.message==='string' ? err.message.slice(0,150) : '';
   const diagnosis=kind==='NotAllowedError'?'ブラウザーの共有権限や画面の制限が考えられます。Chromeで開いてお試しください。':
     kind==='DataError'?'ファイルを共有先に引き渡せなかった可能性があります。':
     kind==='TypeError'?'ブラウザーがこのファイル形式を共有対象として受け付けていません。':
     '共有先のアプリやブラウザーがファイルを受け取れなかった可能性があります。';
   byId('shareOutputHelp').textContent='ZIP/HTMLの直接共有に失敗しました（'+kind+'）。'+diagnosis+(detail?' 詳細: '+detail:'');
 }
});
function snapshot(){
 const c=getCreation();
 if(!c||!Array.isArray(c.frames)||!c.frames.length)throw new Error('共有するルーレットを選んでください。');
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
function htmlBundleAppUrl(){
 // Derive the stable Pages project host from a branch-preview host without
 // baking private repository or deployment hostnames into the shipped bundle.
 const parts=location.hostname.split('.');
 if(parts.length>=3&&parts.at(-2)==='pages'&&parts.at(-1)==='dev')
  return location.protocol+'//'+parts.at(-3)+'.pages.dev/';
 return new URL('.',location.href).href;
}
async function makeHtmlBundle(c,frames){
 const packed=packRoulette(c,frames);
 if(!globalThis.crypto?.getRandomValues)throw new Error('安全な生成にはHTTPSが必要です。');
 const random=new Uint8Array(16);crypto.getRandomValues(random);
 const session='mmr-html-'+Array.from(random,b=>b.toString(16).padStart(2,'0')).join('');
 const config={appUrl:htmlBundleAppUrl(),session};
 const escaped=s=>s.replace(/</g,'\\u003c');
 const template="<!doctype html>\n<html lang=\"ja\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1,viewport-fit=cover\"><meta name=\"referrer\" content=\"no-referrer\">\n<meta http-equiv=\"Content-Security-Policy\" content=\"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; connect-src 'none'\">\n<title>思い出ルーレットを開く</title>\n<style>\n*{box-sizing:border-box}body{margin:0;background:#fff7ef;color:#3a2b32;font-family:system-ui,sans-serif}\nheader{background:linear-gradient(110deg,#f5bed0,#ffe0af);padding:16px;text-align:center}\nh1{font-size:19px;margin:0 0 6px}p{font-size:14px;line-height:1.65;margin:6px 0}\nmain{padding:16px;max-width:560px;margin:auto}\n#status{padding:15px;margin:12px 0;background:white;border-radius:12px;line-height:1.6}\nbutton{display:block;padding:14px 18px;border:1px solid #e49bb8;border-radius:12px;background:#fff;color:#682e4d;font-weight:700;font-size:15px;width:100%;margin:10px 0}\n#openapp{background:#ce3e76;color:white;border:0;min-height:56px}#openapp[hidden]{display:none!important}\ndetails{margin:24px 0;color:#715564;font-size:13px}summary{cursor:pointer}\n</style></head><body>\n<header><h1>🎲 思い出ルーレット</h1><p>受け取ったルーレットをアプリで開きます。</p></header>\n<main>\n<div id=\"status\" role=\"status\" aria-live=\"polite\">思い出ルーレットを起動しています…</div>\n<button id=\"openapp\" type=\"button\" hidden>思い出ルーレットを開く</button>\n<p>写真はこのHTMLファイル内にあります。外部サーバーにはアップロードしません。再生と履歴保存は既存のWebアプリで行います。</p>\n<details><summary>アプリを開けない場合</summary><p>起動が制限されるときは上のボタンを押してください。認証が必要な場合はログインを完了してください。接続ができないときは下のファイルをアプリの「友達からもらったルーレット」から読み込めます。</p><button id=\"fallback\" type=\"button\">受信ファイル（.mmrplay）を保存</button></details>\n</main>\n<script id=\"cfg\" type=\"application/json\">%%MMR_CONFIG_JSON%%</script>\n<script id=\"data\" type=\"application/json\">%%MMR_PAYLOAD_JSON%%</script>\n<script>\n(function(){\n'use strict';\nconst status=document.getElementById('status');\nconst openBtn=document.getElementById('openapp');\nlet config,payload,app;\ntry{\n config=JSON.parse(document.getElementById('cfg').textContent);\n payload=JSON.parse(document.getElementById('data').textContent);\n app=new URL(config.appUrl);\n if(!/^https?:$/.test(app.protocol)||!/^mmr-html-[a-f0-9]{32}$/.test(config.session)||\n    payload.format!=='memory-moments-playable'||payload.version!==1)throw Error('形式が不正です');\n}catch(err){\n status.textContent='ファイルが不正です：'+String(err.message||err);\n return;\n}\ndocument.getElementById('fallback').addEventListener('click',function(){\n const blob=new Blob([JSON.stringify(payload)],{type:'application/json'});\n const url=URL.createObjectURL(blob),a=document.createElement('a');\n a.href=url;a.download='received-memory-roulette.mmrplay';\n document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(url)},2000);\n});\nlet popup=null,complete=false,timeout=null;\nfunction appLink(){\n const url=new URL(app.href);\n url.searchParams.set('mmr_html','1');\n url.searchParams.set('mmr_session',config.session);\n url.searchParams.set('mmr_transport','opener');\n url.hash='receive';\n return url.href;\n}\nfunction showManual(reason){\n if(complete)return;\n openBtn.hidden=false;\n status.textContent=reason;\n}\nfunction launch(isAutomatic){\n if(complete)return;\n let opened=null;\n try{opened=window.open(appLink(),'_blank');}catch(err){}\n if(!opened){\n  showManual('ブラウザーがアプリの自動起動を制限しました。「思い出ルーレットを開く」を押してください。');\n  return;\n }\n popup=opened;\n openBtn.hidden=true;\n status.textContent=isAutomatic?'既存アプリを起動しました。アプリの画面に移動してください。':'既存アプリを開きました。認証が必要な場合はログインしてください。';\n clearTimeout(timeout);\n timeout=setTimeout(function(){\n  if(!complete)showManual('アプリがまだ写真を受け取れていません。「思い出ルーレットを開く」を押して再試行できます。認証中の場合はログインを完了してください。');\n },8000);\n}\nopenBtn.addEventListener('click',function(){launch(false);});\nwindow.addEventListener('message',function(event){\n if(event.origin!==app.origin||event.source!==popup||!event.data||event.data.session!==config.session)return;\n if(event.data.kind==='MMR_HTML_READY'){\n  if(complete)return;\n  status.textContent='写真を既存アプリに引き継いでいます…';\n  event.source.postMessage({kind:'MMR_HTML_IMPORT',session:config.session,playable:payload},app.origin);\n }else if(event.data.kind==='MMR_HTML_IMPORTED'){\n  if(event.data.saved){\n   complete=true;clearTimeout(timeout);openBtn.hidden=true;\n   status.textContent='思い出ルーレットに保存しました。開いたアプリで遊べます。次回からは「友達からもらったルーレット」から再生できます。';\n  }else{\n   showManual('アプリでの履歴保存が完了していません。「思い出ルーレットを開く」から再試行してください。');\n  }\n }else if(event.data.kind==='MMR_HTML_ERROR'){\n  showManual('受信できませんでした：'+String(event.data.reason||'不明なエラー')+'。もう一度アプリを開いてください。');\n }\n});\n// Do not embed or run a roulette in this HTML. Browsers may block this\n// automatic new-tab attempt; only then is a user-gesture button required.\nlaunch(true);\n})();\n</script></body></html>\n";
 const packedJson=await packed.text();
 const text=template.replace('%%MMR_CONFIG_JSON%%',()=>escaped(JSON.stringify(config)))
  .replace('%%MMR_PAYLOAD_JSON%%',()=>escaped(packedJson));
 const localized=window.MemorySharedI18n?.embed(text)||text;
 const blob=new Blob([localized],{type:'text/html;charset=utf-8'});
 if(blob.size>MAX_BYTES)throw new Error('HTMLが48MBを超えています。共有枚数を減らしてください。');
 return blob;
}
// ZIP "store" method: no third-party scripts and works with stock Android extractors.
// Only one trusted ASCII basename; no directories, paths, or executable files.
function zipSingleHtmlFile(htmlBlob){
 return htmlBlob.arrayBuffer().then(buffer=>{
  const bytes=new Uint8Array(buffer);
  const name=new TextEncoder().encode('open-memory-roulette.html');
  const length=bytes.byteLength;
  if(length>MAX_BYTES-256||length>0xffffffff)throw new Error('ZIPファイルが48MBを超えます。コマ数を減らしてください。');
  let crc=0xffffffff;
  for(let i=0;i<length;i++){
   crc^=bytes[i];
   for(let bit=0;bit<8;bit++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);
  }
  crc=(crc^0xffffffff)>>>0;
  const local=new Uint8Array(30),l=new DataView(local.buffer);
  l.setUint32(0,0x04034b50,true);l.setUint16(4,20,true);
  l.setUint16(6,0x800,true);l.setUint16(8,0,true);
  l.setUint16(10,0,true);l.setUint16(12,0x21,true);
  l.setUint32(14,crc,true);l.setUint32(18,length,true);
  l.setUint32(22,length,true);l.setUint16(26,name.length,true);
  const central=new Uint8Array(46),c=new DataView(central.buffer);
  c.setUint32(0,0x02014b50,true);c.setUint16(4,20,true);
  c.setUint16(6,20,true);c.setUint16(8,0x800,true);
  c.setUint16(10,0,true);c.setUint16(12,0,true);
  c.setUint16(14,0x21,true);c.setUint32(16,crc,true);
  c.setUint32(20,length,true);c.setUint32(24,length,true);
  c.setUint16(28,name.length,true);
  const directoryOffset=local.length+name.length+length;
  const directoryLength=central.length+name.length;
  const end=new Uint8Array(22),e=new DataView(end.buffer);
  e.setUint32(0,0x06054b50,true);e.setUint16(8,1,true);
  e.setUint16(10,1,true);e.setUint32(12,directoryLength,true);
  e.setUint32(16,directoryOffset,true);
  return new Blob([local,name,bytes,central,name,end],{type:'application/zip'});
 });
}
// Prebuild files before the tap: navigator.share needs a live user gesture.
async function prepareSimpleExports(){
 const token=++simpleExportToken;
 const direct=byId('shareDirectHtml'),save=byId('shareSaveZip'),notice=byId('shareSimpleStatus');
 simpleHtml=null;simpleZip=null;direct.disabled=true;save.disabled=true;
 notice.textContent='共有ファイルを準備しています…';
 if(window.__memoryAdvancedShareEnabled)return;
 try{
  const c=snapshot();
  const html=await makeHtmlBundle(c,c.frames);
  const stamp=Date.now();
  const htmlFile=new File([html],'memory-roulette-'+stamp+'.html',{type:'text/html'});
  const zip=await zipSingleHtmlFile(html);
  if(token!==simpleExportToken)return;
  simpleHtml=htmlFile;
  simpleZip=new File([zip],'memory-roulette-'+stamp+'.zip',{type:'application/zip'});
  direct.disabled=!(navigator.share&&navigator.canShare?.({files:[htmlFile]}));
  save.disabled=false;
  notice.textContent=direct.disabled
    ?'このブラウザーはHTMLの直接共有に対応していません。ZIPは保存できます。'
    :'準備完了。HTMLは直接共有、LINEにはZIPを保存して添付してください。';
 }catch(err){
  if(token!==simpleExportToken)return;
  notice.textContent='共有ファイルを作成できませんでした：'+String(err?.message||err);
 }
}
byId('shareDirectHtml').addEventListener('click',async()=>{
 if(!simpleHtml)return;
 const file=simpleHtml;
 if(!navigator.share||!navigator.canShare?.({files:[file]})){
  byId('shareSimpleStatus').textContent='この環境ではHTMLファイルを直接共有できません。';
  return;
 }
 try{
  // Synchronous share() invocation from the tap; no async preparation here.
  await navigator.share({files:[file]});
  byId('shareSimpleStatus').textContent='共有先でHTMLファイルの送信を確認してください。';
 }catch(err){
  if(err?.name==='AbortError')return;
  byId('shareSimpleStatus').textContent='直接共有に失敗しました（'+String(err?.name||'Error')+'）：'+String(err?.message||'共有先で拒否された可能性があります。');
 }
});
byId('shareSaveZip').addEventListener('click',async()=>{
 if(!simpleZip)return;
 try{
  const result=await window.__memorySaveMediaFile(simpleZip,simpleZip.name);
  if(result?.mode==='cancelled')return;
  byId('shareSimpleStatus').textContent='ZIPを保存しました。LINEのトークから「＋」→「ファイル」で添付してください。';
 }catch(err){byId('shareSimpleStatus').textContent='ZIP保存失敗：'+String(err?.message||err);}
});
window.addEventListener('memory-share-settings-changed',()=>{
 if(document.body.dataset.appView==='share')window.__memoryShareOnOpen?.();
});
async function runBusy(button,work){
 if(busy)return;
 busy=true;button.disabled=true;clearOutput();activeOutputGeneration=outputGeneration;
 try{await work();}
 catch(err){if(activeOutputGeneration===outputGeneration){console.error('share studio:',err);message(err?.message||'処理できませんでした。');editorMessage(err?.message||'処理できませんでした。');}}
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
 if(recorded?.source===c&&Array.isArray(recorded.indices)&&recorded.indices.length&&recorded.stopIndex===shareStopIndex(c))
  return {...recorded,fortune:shareStopFortune(c,recorded.stopIndex)||recorded.fortune};
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
   fortune:c.mode==='omikuji'?(shareStopFortune(c,stopIndex)||'今日の運勢'):null,generated:true};
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

function stopLabel(c,index){
 const count=c.frames.length;
 const raw=Number(c.times?.[index]);
 const time=Number.isFinite(raw)&&raw>=0?' ・ 元動画 '+raw.toFixed(1)+'秒':'';
 return (index+1)+' / '+count+'コマ'+time;
}
function selectStop(index,draw=null){
 if(busy)return;
 const c=getCreation();
 if(!c?.frames?.length||!Number.isInteger(index)||index<0||index>=c.frames.length)return;
 selectedStopIndex=index;
 selectedDraw=draw;
 frameGridPage=Math.floor(index/FRAME_PAGE_SIZE);
 editor.hidden=true;editorSource=null;marks=[];clearOutput();
 renderStopPicker();
}
function renderFramePage(){
 const c=getCreation(), grid=byId('shareStopFrameGrid');
 grid.replaceChildren();
 if(!c?.frames?.length)return;
 const pages=Math.ceil(c.frames.length/FRAME_PAGE_SIZE);
 frameGridPage=Math.max(0,Math.min(pages-1,frameGridPage));
 byId('shareFramePageLabel').textContent=(frameGridPage+1)+' / '+pages+'ページ';
 byId('shareFramePagePrev').disabled=frameGridPage===0;
 byId('shareFramePageNext').disabled=frameGridPage===pages-1;
 const start=frameGridPage*FRAME_PAGE_SIZE,end=Math.min(c.frames.length,start+FRAME_PAGE_SIZE);
 for(let i=start;i<end;i++){
  const btn=document.createElement('button');
  btn.type='button';btn.className='shareFrameThumb';
  const selected=i===shareStopIndex(c);
  btn.classList.toggle('is-selected',selected);
  btn.setAttribute('aria-pressed',String(selected));
  btn.setAttribute('aria-label',(i+1)+'コマ目を停止位置にする');
  const img=document.createElement('img');
  img.src=c.frames[i];img.loading='lazy';img.alt='';
  const label=document.createElement('span');label.textContent=(i+1)+'コマ目';
  btn.append(img,label);
  btn.addEventListener('click',()=>selectStop(i));
  grid.appendChild(btn);
 }
}
function renderPastDraws(c){
 const section=byId('sharePastDrawSection'),grid=byId('sharePastDrawGallery');
 grid.replaceChildren();
 const draws=(Array.isArray(c.drawHistory)?c.drawHistory:[])
   .filter(entry=>Number.isInteger(entry?.index)&&entry.index>=0&&entry.index<c.frames.length)
   .slice(-40).reverse();
 section.hidden=!draws.length;
 for(const draw of draws){
  const b=document.createElement('button');b.type='button';b.className='shareDrawCard';
  const active=draw===selectedDraw;
  b.classList.toggle('is-selected',active);
  b.setAttribute('aria-pressed',String(active));
  const image=document.createElement('img');image.src=c.frames[draw.index];image.loading='lazy';image.alt='';
  const info=document.createElement('span');
  const title=document.createElement('strong');
  title.textContent=(draw.index+1)+'コマ目'+(draw.fortune?' ・ '+draw.fortune:'');
  const subtitle=document.createElement('small');
  subtitle.textContent=draw.drawnAt?new Date(draw.drawnAt).toLocaleString(window.MemoryI18n?.language||'ja-JP'):'過去の停止結果';
  info.append(title,subtitle);b.append(image,info);
  b.addEventListener('click',()=>selectStop(draw.index,draw));
  grid.appendChild(b);
 }
}
function renderStopPicker(){
 const c=getCreation();
 const format=byId('shareRouletteFormat').value;
 stopPicker.hidden=!window.__memoryAdvancedShareEnabled||!c?.frames?.length||!!favoritePhoto||format==='play';
 if(stopPicker.hidden)return;
 const index=shareStopIndex(c);
 byId('shareSelectedFrameImage').src=c.frames[index];
 byId('shareSelectedFrameLabel').textContent=stopLabel(c,index);
 const fortune=shareStopFortune(c,index);
 byId('shareSelectedFrameFortune').textContent=fortune?'停止結果：'+fortune:'このコマで停止します';
 byId('shareStopPrev').disabled=c.frames.length<2;
 byId('shareStopNext').disabled=c.frames.length<2;
 byId('shareStopNote').textContent=shareFromPlayer
  ?'現在遊んでいるルーレットです。初期選択はこの画面を開いたときのコマです。'
  :'履歴から選んだルーレットです。過去の結果と全コマから停止位置を選べます。';
 renderPastDraws(c);
 if(byId('shareAllFramesDetails').open)renderFramePage();
}
byId('shareStopPrev').addEventListener('click',()=>{
 const c=getCreation();if(c?.frames?.length)selectStop((shareStopIndex(c)-1+c.frames.length)%c.frames.length);
});
byId('shareStopNext').addEventListener('click',()=>{
 const c=getCreation();if(c?.frames?.length)selectStop((shareStopIndex(c)+1)%c.frames.length);
});
byId('shareFramePagePrev').addEventListener('click',()=>{frameGridPage--;renderFramePage();});
byId('shareFramePageNext').addEventListener('click',()=>{frameGridPage++;renderFramePage();});
byId('shareAllFramesDetails').addEventListener('toggle',()=>{
 if(byId('shareAllFramesDetails').open)renderFramePage();
 else byId('shareStopFrameGrid').replaceChildren();
});
function setPreviewMeta(){
 const c=getCreation(),count=c?.frames?.length||0;
 byId('shareSourceState').textContent=count
  ? (shareFromPlayer?'現在のルーレット：':'選んだルーレット：')+(c.title||'')+'（'+count+'コマ）'
  : '共有するルーレットがありません。ホームの「共有する」から履歴を選択してください。';
 byId('shareRouletteBuild').disabled=count<1;
 const format=byId('shareRouletteFormat').value;
 byId('shareRouletteBuild').textContent=format==='movie'?'動画を作成して保存・共有':
   format==='play'?'遊べるファイルを作成して保存・共有':format==='zip'?'ZIPを作成して保存・共有':format==='html'?'HTMLを作成して保存・共有':'写真を作成して保存・共有';
 renderStopPicker();
}
async function savedCardPreviews(x){
 const count=Number(x.frameCount)||x.frames?.length||x.deckCandidateIds?.length||0;
 if(!count)return [];
 const positions=[0,Math.floor((count-1)/2),count-1];
 const indices=[...new Set(positions)].filter(i=>i>=0&&i<count);
 if(Array.isArray(x.frames)&&x.frames.length)return indices.map(i=>x.frames[i]).filter(Boolean);
 if(Array.isArray(x.deckCandidateIds)&&x.deckCandidateIds.length){
  const records=await getDeckFrameRecords(indices.map(i=>x.deckCandidateIds[i]));
  return records.map(x=>x?.imageData).filter(Boolean);
 }
 const image=await creationPreview(x);
 return image?[image]:[];
}
async function showSavedHistory(){
 const token=shareSelectToken;
 savedGallery.replaceChildren();
 pickerStatus.textContent='保存済みのルーレットを探しています…';
 try{
  try{await window.__memoryHistoryMigrationPromise;}catch(e){console.warn('share migration',e);}
  const all=(await dbAll()).filter(x=>x?.id);
  if(token!==shareSelectToken)return;
  if(!all.length){
   pickerStatus.textContent='共有できるルーレットがありません。ホームから動画を選び、ルーレットを作ってください。';
   return;
  }
  pickerStatus.textContent=all.length+'件のルーレット。写真を確認して選んでください。';
  for(const x of all){
   const count=Number(x.frameCount)||x.frames?.length||x.deckCandidateIds?.length||0;
   const card=document.createElement('button');card.type='button';card.className='shareSavedCard';
   const preview=document.createElement('span');preview.className='shareSavedPreviews';
   for(let i=0;i<3;i++){
    const image=document.createElement('img');image.alt='';image.loading='lazy';
    image.src='./icons/memory-roulette-omikuji.png?v=memorybrand2';
    preview.appendChild(image);
   }
   const caption=document.createElement('span');caption.className='shareSavedCaption';
   const title=document.createElement('strong');title.dataset.noI18n='';title.textContent=x.title||'ルーレット';
   const date=new Date(x.updatedAt||x.createdAt||Date.now()).toLocaleString(window.MemoryI18n?.language||'ja-JP');
   const meta=document.createElement('small');
   meta.textContent=(x.mode==='omikuji'?'おみくじ':'通常ルーレット')+' ・ '+date+' ・ '+count+'コマ';
   caption.append(title,meta);
   const hint=document.createElement('span');hint.className='shareSavedArrow';hint.textContent='選ぶ ›';
   card.append(preview,caption,hint);
   savedGallery.appendChild(card);
   card.addEventListener('click',async()=>{
    const ownToken=++shareSelectToken;
    card.disabled=true;pickerStatus.textContent='選んだルーレットを読み込んでいます…';
    try{
     const c=await dbGet(x.id);
     if(ownToken!==shareSelectToken)return;
     if(!c?.frames?.length)throw new Error('元画像が見つかりません。');
     savedSelection=c;shareFromPlayer=false;
     selectedStopIndex=null;selectedDraw=null;frameGridPage=0;
     window.__memoryNavigate?.('share');
    }catch(err){
     if(ownToken!==shareSelectToken)return;
     console.error('share history hydrate failed',err);
     pickerStatus.textContent='読み込めませんでした：'+(err?.message||err);
     card.disabled=false;
    }
   });
   // Keep the list interactive while each card loads its own preview.
   savedCardPreviews(x).then(sources=>{
    if(token!==shareSelectToken)return;
    const images=preview.querySelectorAll('img');
    sources.forEach((src,i)=>{if(images[i]&&src)images[i].src=src;});
   }).catch(err=>console.warn('share card preview unavailable',err));
  }
 }catch(err){
  if(token!==shareSelectToken)return;
  console.error('share history list failed',err);
  pickerStatus.textContent='履歴を読み込めませんでした。ホームの「履歴」も確認してください。';
 }
}
window.__memoryShareOnPickerOpen=()=>{
 ++shareSelectToken;
 shareFromPlayer=false;savedSelection=null;
 selectedStopIndex=null;selectedDraw=null;favoritePhoto=null;
 showSavedHistory();
};
window.__memoryShareOnOpen=()=>{
 ++shareSelectToken;
 if(shareFromPlayer)savedSelection=null;
 favoritePhoto=null;
 byId('shareRouletteOptions').hidden=false;
 byId('shareFavoriteOptions').hidden=true;
 byId('sharePageHeading').textContent=shareFromPlayer?'このルーレットを共有する':'選んだルーレットを共有する';
 byId('shareRouletteMask').checked=false;
 byId('shareFavoriteMask').checked=false;
 editor.hidden=true;editorSource=null;marks=[];clearOutput();
 byId('shareAllFramesDetails').open=false;
 frameGridPage=Math.floor(shareStopIndex(getCreation()||{frames:[]})/FRAME_PAGE_SIZE);
 setPreviewMeta();
 byId('shareSimpleActions').hidden=!!window.__memoryAdvancedShareEnabled;
 if(window.__memoryAdvancedShareEnabled){++simpleExportToken;simpleHtml=null;simpleZip=null;}
 else void prepareSimpleExports();
 message('写真データはこの端末内で共有ファイルにまとめます。');
};
byId('shareOpenFromPlay').addEventListener('click',()=>{
 shareFromPlayer=true;savedSelection=null;favoritePhoto=null;
 selectedStopIndex=window.__memoryShareGetCurrentIndex?.()??null;
 selectedDraw=null;frameGridPage=0;
 window.__memoryNavigate?.('share');
});
byId('shareRouletteFormat').addEventListener('change',()=>{
 clearOutput();editor.hidden=true;editorSource=null;marks=[];setPreviewMeta();
 if(['play','html','zip'].includes(byId('shareRouletteFormat').value))message('受け取った人がルーレットを回せます。ZIPの場合は受信側で解凍してHTMLを開いてください。');
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
 }else if(format==='zip'){
   const html=await makeHtmlBundle(c,frames);
   const archive=await zipSingleHtmlFile(html);
   ready(archive,'memory-roulette-'+Date.now()+'.zip',maskedFramesList?'スタンプ付きLINE用ZIP':'LINE用ZIPルーレット');
   // ready() displays the file-only direct sharing instructions. The ZIP still needs extraction by recipients.
 }else if(format==='html'){
   ready(await makeHtmlBundle(c,frames),'memory-roulette-'+Date.now()+'.html',maskedFramesList?'スタンプ付きHTMLルーレット（実験）':'HTMLルーレット（実験）');
   // HTML uses the same file-only share mechanism; some targets may reject HTML attachments.
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
 if((format==='play'||format==='zip'||format==='html'||format==='movie')&&c.frames.length<2)throw new Error('2コマ以上のルーレットが必要です。');
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
// Local HTML supplies photos in browser memory only; no network/photo storage.
// Two isolated transports: iframe (public access) or an explicitly user-opened
// top-level tab (Access sign-in; avoids the login screen's iframe prohibition).
(function setupHtmlPackageReceiver(){
 const params=new URLSearchParams(location.search);
 const session=params.get('mmr_session')||'';
 if(params.get('mmr_html')!=='1'||!/^mmr-html-[a-f0-9]{32}$/.test(session))return;
 const isOpener=params.get('mmr_transport')==='opener';
 const sender=isOpener?window.opener:window.parent;
 if(!sender||sender===window)return;
 let handled=false;
 window.addEventListener('message',event=>{
  if(handled||event.source!==sender)return;
  if(event.origin!=='null'&&event.origin!==location.origin)return;
  const data=event.data;
  if(!data||data.kind!=='MMR_HTML_IMPORT'||data.session!==session)return;
  handled=true;
  const destination=event.origin==='null'?'*':event.origin;
  (async()=>{
   try{
    const creation=validatePlayFile(data.playable);
    if(typeof window.__memoryReceiveImportCreation!=='function')throw Error('受信機能が利用できません');
    // iframe storage may be partitioned. Only the top-level tab persists.
    const result=await window.__memoryReceiveImportCreation(creation,{persist:isOpener});
    sender.postMessage({kind:'MMR_HTML_IMPORTED',session,frameCount:creation.frames.length,saved:!!result.saved,duplicate:!!result.duplicate},destination);
   }catch(err){
    sender.postMessage({kind:'MMR_HTML_ERROR',session,reason:String(err?.message||'無効な画像')},destination);
   }
  })();
 });
 document.addEventListener('DOMContentLoaded',()=>{
  sender.postMessage({kind:'MMR_HTML_READY',session},'*');
 },{once:true});
})();
async function importReceivedFile(file,target){
 const show=text=>{if(target)target.textContent=text||'';};
 if(file.size>MAX_BYTES){show('48MB以下のルーレットファイルを選んでください。');return;}
 show('受信したルーレットを保存しています…');
 try{
  let data;
  if(/\.html?$/i.test(file.name)){
   // Extract only the known JSON payload. Do not parse untrusted markup
   // into a DOM: even an inert HTML document can load external subresources.
   const source=await file.text();
   const match=source.match(/<script id="data" type="application\/json">([\s\S]*?)<\/script>/i);
   if(!match)throw Error('対応するルーレットHTMLではありません。');
   data=JSON.parse(match[1]);
  }else data=JSON.parse(await file.text());
  const c=validatePlayFile(data);
  if(typeof window.__memoryReceiveImportCreation!=='function')throw Error('受信機能が利用できません。');
  clearOutput();
  await window.__memoryReceiveImportCreation(c,{persist:true});
  show('');
 }catch(err){
  console.error('roulette import:',err);
  show('読み込めませんでした：'+String(err?.message||err));
 }
}
for(const id of ['shareImportFile','receivedImportFile']){
 byId(id)?.addEventListener('change',async e=>{
  const file=e.target.files?.[0];e.target.value='';
  if(file)await importReceivedFile(file,byId(id==='shareImportFile'?'receiveStatus':'receivedImportStatus'));
 });
}
function sourceForCurrent(){
 const c=snapshot();
 if(c.frames.length>LIMIT)throw new Error('スタンプ加工は120コマまでです。動画を少なく選択してください。');
 return {kind:'roulette',title:c.title||'ルーレット',frames:c.frames.slice(),creation:c,stopIndex:shareStopIndex(c)};
}
function sourceForGif(){
 const result=window.__memoryShareGetGifSource?.();
 if(!result?.frames||result.frames.length<2)throw new Error('先にGIF画面で2コマ以上の動画を選択してください。');
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
 stopPicker.hidden=true;
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
// The GIF editor stays within the GIF workflow and reuses the same stamp controls.
const gifEditorHost=byId('labGifEditor');
const originalEditorAnchor=editor.nextSibling,originalOutputAnchor=output.nextSibling;
function closeGifPrivacy(){
 if(!gifEditorHost||editor.parentNode!==gifEditorHost)return;
 editor.hidden=true;editorSource=null;marks=[];clearOutput();
 panel.insertBefore(editor,originalEditorAnchor);
 panel.insertBefore(output,originalOutputAnchor);
}
window.__memoryShareGifClose=closeGifPrivacy;
byId('sharePrivacyGif').addEventListener('click',()=>{
 try{
  const src=sourceForGif();
  closeGifPrivacy();
  if(!gifEditorHost)throw new Error('GIF編集画面を開けませんでした。ページを再読み込みしてください。');
  gifEditorHost.append(editor,output);
  openEditor({...src,selectedFormat:'gif'});
 }catch(err){
  const gifStatus=byId('labGifStatus');
  if(gifStatus){gifStatus.style.display='block';gifStatus.textContent=err?.message||String(err);}
 }
});
function openEditor(src){
 editorSource=src;marks=src.frames.map(()=>[]);editIndex=src.kind==='roulette'?Math.max(0,Math.min(src.frames.length-1,src.stopIndex||0)):0;chosen='🐻';maskSize=.27;
 editor.hidden=false;clearOutput();
 byId('sharePrivacyTitle').textContent='ひみつスタンプ：'+src.title;
 const hasMore=src.frames.length>1;
 byId('shareMaskPrev').disabled=!hasMore;byId('shareMaskNext').disabled=!hasMore;
 const format=src.selectedFormat||'photo';
 byId('sharePrivacyExportSelected').textContent='スタンプ付き'+
   (format==='movie'?'動画':format==='play'?'遊べるルーレット':format==='zip'?'ZIPルーレット':format==='html'?'HTMLルーレット':format==='gif'?'GIF':'写真')+
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
 clearOutput();
 const box=canvas.getBoundingClientRect();
 const x=Math.max(0,Math.min(1,(e.clientX-box.left)/box.width));
 const y=Math.max(0,Math.min(1,(e.clientY-box.top)/box.height));
 marks[editIndex].push({x,y,size:maskSize,char:chosen});
 renderEditor().catch(console.error);
});
byId('shareMaskPrev').addEventListener('click',()=>{clearOutput();editIndex=(editIndex-1+marks.length)%marks.length;renderEditor().catch(console.error);});
byId('shareMaskNext').addEventListener('click',()=>{clearOutput();editIndex=(editIndex+1)%marks.length;renderEditor().catch(console.error);});
byId('shareMaskUndo').addEventListener('click',()=>{clearOutput();marks[editIndex]?.pop();renderEditor().catch(console.error);});
byId('shareMaskCopy').addEventListener('click',()=>{
 if(!marks[editIndex]?.length)return;
 if(!confirm('このスタンプ位置をすべてのコマにコピーします。人物が動くと顔が露出することがあります。全コマを必ず確認してください。'))return;
 clearOutput();
 marks=marks.map(()=>marks[editIndex].map(m=>({...m})));
 renderEditor().catch(console.error);
});
byId('shareMaskSize').addEventListener('input',e=>{maskSize=Number(e.target.value)/100;});
byId('shareMaskType').addEventListener('change',e=>{chosen=e.target.value;});
byId('sharePrivacyClose').addEventListener('click',()=>{
 clearOutput();
 if(editorSource?.kind==='gif')closeGifPrivacy();
 else{editor.hidden=true;editorSource=null;}
});
function exportChecked(){
 if(!editorSource)throw new Error('編集する画像を選んでください。');
 if(!marks.some(arr=>arr.length))throw new Error('まずスタンプを置いてください。');
 if(editorSource.kind==='roulette'&&editorSource.selectedFormat==='photo'&&!(marks[editorSource.stopIndex]?.length))
  throw new Error('共有する停止コマにスタンプを置いてください。');
 const untouched=marks.filter(arr=>!arr.length).length;
 if(editorSource.frames.length>1&&untouched){
   editorMessage('スタンプ未設定のコマが'+untouched+'枚あります。隠したい部分がないか確認してください。');
 }
}
byId('sharePrivacyExportSelected').addEventListener('click',e=>runBusy(e.currentTarget,async()=>{
 exportChecked();
 const format=editorSource.selectedFormat;
 if(format==='photo'){
   const index=editorSource.kind==='roulette'?editorSource.stopIndex:editIndex;
   const blob=await renderMasked(index);
   ready(blob,'secret-moment-'+Date.now()+'.jpg','スタンプ付きの写真（選択した停止コマ）');
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
if(location.hash==='#share-picker')window.__memoryShareOnPickerOpen?.();
})();

