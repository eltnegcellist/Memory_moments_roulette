const FORTUNE_ICONS={"大大吉":"🎊","大吉":"🌟","中吉":"✨","小吉":"🍀","吉":"🎈","末吉":"🌸","凶":"☁️","大凶":"⚡"};
const FORTUNE_COLORS={"大大吉":"#9f003f","大吉":"#b40000","中吉":"#b85d00","小吉":"#28752c","吉":"#754600","末吉":"#8b5f00","凶":"#56616c","大凶":"#4b2b7f"};
const FORTUNE_MESSAGES={"大大吉":"特別な運勢。思いがけない一瞬との出会いまで、今日のおみくじの結果です。","大吉":"今日は特別ないい日。笑顔で過ごすとさらに運気アップ！","中吉":"いい流れの日。落ち着いて進めばいいことがありそう。","小吉":"小さな幸せを見つけられる日。やさしい気持ちで。","吉":"安定したいい日。いつも通りがいちばんの近道です。","末吉":"これからじわっと上向き。あせらずゆっくりいこう。","凶":"今日は慎重めで。無理せず、のんびりが吉です。","大凶":"ひと休みの日。深呼吸して、気楽にいきましょう。"};
const FORTUNE_WEIGHTS=[["大吉",10],["吉",20],["中吉",20],["小吉",20],["末吉",15],["凶",10],["大凶",5]];
function drawFortune(){
  const total=FORTUNE_WEIGHTS.reduce((s,x)=>s+x[1],0);
  let r=Math.random()*total;
  for(const [name,w] of FORTUNE_WEIGHTS){r-=w;if(r<0)return name;}
  return "吉";
}
const $=id=>document.getElementById(id);
const fileInput=$("fileInput"), frameCountEl=$("frameCount"), plainModeEl=$("plainMode"), showFortunesEl=$("showFortunes"), previewSection=$("previewSection"), progressWrap=$("progressWrap"), progressBar=$("progressBar"), progressText=$("progressText"), grid=$("grid"), previewTitle=$("previewTitle"), previewNote=$("previewNote"), analysisStatus=$("analysisStatus"), playBtn=$("playBtn"), reextractBtn=$("reextractBtn"), library=$("library");
const video=$("video"), captureCanvas=$("captureCanvas"), smallCanvas=$("smallCanvas"), ctx=captureCanvas.getContext("2d",{willReadFrequently:true}), sctx=smallCanvas.getContext("2d",{willReadFrequently:true});
const playSection=$("playSection"), stage=$("stage"), playImage=$("playImage"), fortuneBadge=$("fortuneBadge"), resultCard=$("resultCard"), resultText=$("resultText"), message=$("message"), rouletteBadge=$("rouletteBadge"), tapHint=$("tapHint");
const bigOverlay=$("bigOverlay");
let objectUrl=null, lastFile=null, currentSourceKey=null, selectedFrames=[], selectedFortunes=[], selectedAppealDetails=[], currentCreation=null, activeCreation=null, running=false, timer=null, currentIndex=0, primed=false;
const PUBLIC_SETTINGS_KEY='memory-roulette-settings-v1';
function loadPublicSettings(){
  let data={};
  try{data=JSON.parse(localStorage.getItem(PUBLIC_SETTINGS_KEY)||'{}')||{};}catch(e){}
  const frame=String(data.frameCount||'auto');
  if([...frameCountEl.options].some(x=>x.value===frame))frameCountEl.value=frame;
  plainModeEl.checked=!!data.plainMode;
  if(showFortunesEl)showFortunesEl.checked=!!data.showFortunes;
}
function savePublicSettings(){
  try{
    localStorage.setItem(PUBLIC_SETTINGS_KEY,JSON.stringify({
      frameCount:frameCountEl.value||'auto',
      plainMode:!!plainModeEl.checked,
      showFortunes:!!showFortunesEl?.checked
    }));
  }catch(e){}
}
loadPublicSettings();
if(showFortunesEl)showFortunesEl.dispatchEvent(new Event('change',{bubbles:true}));
function sourceKeyFor(file){return file?`${file.name}|${file.size}|${file.lastModified}`:null;}
function modeName(){return plainModeEl.checked?"roulette":"omikuji";}
function autoTitle(mode){const d=new Date(); const pad=n=>String(n).padStart(2,'0'); return mode==='omikuji' ? `思い出おみくじ ${d.getMonth()+1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}` : `思い出ルーレット ${d.getMonth()+1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;}
function shuffle(arr){const a=arr.slice(); for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]];} return a;}
function manualTargetCount(){const v=frameCountEl.value; return v==='auto'?null:Number(v);}
function autoTargetCount(duration,distinctCount,totalCount){ const choices=[12,14,16,18,20,24,28]; let desired=18; if(duration<4) desired=12; else if(duration<7) desired=14; else if(duration<12) desired=16; else if(duration<20) desired=18; else if(duration<35) desired=20; else if(duration<60) desired=24; else desired=28; const diversity=totalCount>0?distinctCount/totalCount:0.5; if(diversity<0.22) desired-=4; else if(diversity<0.35) desired-=2; else if(diversity>0.68) desired+=2; desired=Math.max(12,Math.min(28,desired)); return choices.reduce((best,x)=>Math.abs(x-desired)<Math.abs(best-desired)?x:best,choices[0]); }
function updatePreviewMeta(){ const mode=modeName(); previewTitle.textContent=mode==='omikuji' ? '自動で作成したおみくじ' : '自動で作成した思い出ルーレット'; previewNote.textContent=mode==='omikuji' ? '保存名は自動で付けます。必要なら保存後に変更できます。特徴度は写真の良し悪しを決める点数ではなく、候補どうしの違いを見るための補助値です。' : '保存名は自動で付けます。必要なら保存後に変更できます。'; }
plainModeEl.addEventListener('change',async()=>{ savePublicSettings(); if(selectedFrames.length){ if(modeName()==='omikuji'){ selectedFortunes=await assignFortunes(selectedFrames); } renderGrid(); } updatePreviewMeta(); });
frameCountEl.addEventListener('change',savePublicSettings);
showFortunesEl?.addEventListener('change',savePublicSettings);
function once(target,event,timeout=6000){return new Promise((resolve,reject)=>{let done=false; const fn=()=>{if(done)return; done=true; clearTimeout(to); target.removeEventListener(event,fn); resolve();}; const to=setTimeout(()=>{if(done)return; done=true; target.removeEventListener(event,fn); reject(new Error(event+' timeout'));},timeout); target.addEventListener(event,fn,{once:true});})}
async function loadVideo(file){ if(objectUrl) URL.revokeObjectURL(objectUrl); currentSourceKey=sourceKeyFor(file); objectUrl=URL.createObjectURL(file); video.src=objectUrl; video.load(); if(video.readyState<1) await once(video,'loadedmetadata',10000); if(!isFinite(video.duration)||video.duration<=0) throw new Error('動画の長さを取得できません'); }
async function seekTo(t){ const safe=Math.max(0,Math.min(video.duration-.04,t)); if(Math.abs(video.currentTime-safe)>.02){ video.currentTime=safe; try{await once(video,'seeked',6000)}catch(e){} } await new Promise(r=>setTimeout(r,35)); }
function setupCanvas(){ const maxW=420, scale=Math.min(1,maxW/video.videoWidth); captureCanvas.width=Math.max(2,Math.round(video.videoWidth*scale)); captureCanvas.height=Math.max(2,Math.round(video.videoHeight*scale)); }
function descriptorAndQuality(){ const w=captureCanvas.width,h=captureCanvas.height,cw=Math.round(w*.68),ch=Math.round(h*.68); const sx=Math.round((w-cw)/2),sy=Math.round((h-ch)/2); sctx.drawImage(captureCanvas,sx,sy,cw,ch,0,0,28,28); const d=sctx.getImageData(0,0,28,28).data, gray=new Float32Array(784); let mean=0,sharp=0; for(let i=0,p=0;i<d.length;i+=4,p++){const g=d[i]*.299+d[i+1]*.587+d[i+2]*.114; gray[p]=g; mean+=g;} mean/=gray.length; for(let y=1;y<27;y++)for(let x=1;x<27;x++){const p=y*28+x,g=gray[p]; sharp+=Math.abs(g-gray[p-1])+Math.abs(g-gray[p-28]);} sharp/=(26*26*2); const exposure=1-Math.min(1,Math.abs(mean-128)/128); return {desc:Array.from(gray),sharp,quality:sharp*.8+exposure*18}; }
function dist(a,b){ let s=0; for(let i=0;i<a.length;i++){const d=a[i]-b[i]; s+=d*d;} return Math.sqrt(s/a.length); }
async function captureCandidate(time){ await seekTo(time); ctx.drawImage(video,0,0,captureCanvas.width,captureCanvas.height); const q=descriptorAndQuality(); return {time,dataUrl:captureCanvas.toDataURL('image/jpeg',.84),...q}; }
function chooseDiverse(list,n){ if(list.length<=n) return list.slice().sort((a,b)=>a.time-b.time); const ranked=[...list].sort((a,b)=>b.quality-a.quality), chosen=[ranked[0]], rem=list.filter(x=>x!==ranked[0]); while(chosen.length<n&&rem.length){ let bi=0,bs=-1e9; for(let i=0;i<rem.length;i++){ let md=1e9; for(const s of chosen) md=Math.min(md,dist(rem[i].desc,s.desc)); const score=md*1.7+rem[i].quality*.28; if(score>bs){bs=score;bi=i;} } chosen.push(rem.splice(bi,1)[0]); } return chosen.sort((a,b)=>a.time-b.time); }
function normalizeScores(arr){
const vals=arr.slice();
const finite=vals.filter(Number.isFinite);
if(!finite.length) return vals.map(_=>0.5);
const min=Math.min(...finite), max=Math.max(...finite);
if(Math.abs(max-min)<1e-9) return vals.map(_=>0.5);
return vals.map(v=>Number.isFinite(v)?(v-min)/(max-min):0.5);
}
function visualRarity(frames){
if(frames.length<2) return frames.map(_=>0.5);
const raw=frames.map((f,i)=>{
const ds=[];
for(let j=0;j<frames.length;j++) if(i!==j && f.desc && frames[j].desc) ds.push(dist(f.desc,frames[j].desc));
if(!ds.length) return 0;
ds.sort((a,b)=>a-b);
const k=Math.min(3,ds.length);
const nearest=ds.slice(0,k).reduce((a,b)=>a+b,0)/k;
const median=ds[Math.floor(ds.length/2)];
return nearest*0.7+median*0.3;
});
return normalizeScores(raw);
}
function temporalChange(frames){
if(frames.length<2) return frames.map(_=>0.5);
const raw=frames.map((f,i)=>{
const ds=[];
if(i>0 && f.desc && frames[i-1].desc) ds.push(dist(f.desc,frames[i-1].desc));
if(i<frames.length-1 && f.desc && frames[i+1].desc) ds.push(dist(f.desc,frames[i+1].desc));
return ds.length?ds.reduce((a,b)=>a+b,0)/ds.length:0;
});
return normalizeScores(raw);
}
function computeAppealDetails(frames){
const clarity=normalizeScores(frames.map(f=>f.quality||0));
const rarity=visualRarity(frames);
const change=temporalChange(frames);
const details=frames.map((f,i)=>({
clarity:clarity[i],rarity:rarity[i],change:change[i],
raw:clarity[i]*0.45+rarity[i]*0.35+change[i]*0.20
}));
const overall=normalizeScores(details.map(x=>x.raw));
details.forEach((x,i)=>{
x.score=Math.round(overall[i]*100);
x.clarityScore=Math.round(x.clarity*100);
x.rarityScore=Math.round(x.rarity*100);
x.changeScore=Math.round(x.change*100);
});
if(analysisStatus){
analysisStatus.style.display='block';
analysisStatus.className='note analysisStatus ok';
analysisStatus.textContent='特徴度はAIを使わず、動画内の相対差から算出しています。くっきり45%・珍しさ35%・前後からの変化20%。写真の良し悪しを採点する値ではありません。';
}
return details;
}
async function assignFortunes(frames){
selectedAppealDetails=computeAppealDetails(frames);
return frames.map(()=>drawFortune());
}
async function extractFromCurrentFile(){
const file=fileInput.files?.[0] || lastFile; if(!file) return; lastFile=file;
progressWrap.style.display='block'; previewSection.style.display='none'; progressBar.style.width='2%'; progressText.textContent='動画を読み込んでいます...';
try{
await loadVideo(file); setupCanvas();
const manualTarget=manualTargetCount();
const sampleHint=manualTarget||28;
const sampleCount=Math.min(90, Math.max(sampleHint*4, Math.ceil(video.duration*3)));
const start=Math.min(.15,video.duration*.02), end=Math.max(start,video.duration-.08), times=[];
for(let i=0;i<sampleCount;i++) times.push(start+(end-start)*(sampleCount===1?0:i/(sampleCount-1)));
const candidates=[];
for(let i=0;i<times.length;i++){ progressText.textContent=`候補を確認中... ${i+1}/${times.length}`; progressBar.style.width=(5+60*i/times.length)+'%'; candidates.push(await captureCandidate(times[i])); }
const sorted=[...candidates].sort((a,b)=>a.time-b.time), filtered=[];
for(const c of sorted){ if(c.sharp<4) continue; const prev=filtered[filtered.length-1]; if(prev && dist(c.desc,prev.desc)<4.2){ if(c.quality>prev.quality) filtered[filtered.length-1]=c; } else filtered.push(c); }
const target=manualTarget||autoTargetCount(video.duration,filtered.length,sorted.length);
selectedFrames=chooseDiverse(filtered.length>=target?filtered:sorted,target);
if(modeName()==='omikuji'){ progressText.textContent='候補の特徴を整理し、運勢サンプルを準備しています...'; progressBar.style.width='78%'; selectedFortunes=await assignFortunes(selectedFrames); } else { selectedFortunes=[]; selectedAppealDetails=[]; }
progressBar.style.width='100%'; progressText.textContent=`${manualTarget?'':'おまかせで'}${selectedFrames.length}枚を選びました`;
renderGrid(); updatePreviewMeta(); previewSection.style.display='block'; previewSection.scrollIntoView({behavior:'smooth'});
}catch(e){ console.error(e); progressText.textContent='動画を処理できませんでした'; alert('動画を処理できませんでした: '+e.message); }
}
function renderGrid(){
grid.innerHTML='';
const showFortune=modeName()==='omikuji';
selectedFrames.forEach((f,i)=>{
const d=document.createElement('div');d.className='thumbWrap';
const fortune=selectedFortunes[i],a=selectedAppealDetails[i];
d.innerHTML=`<div class="thumb"><img src="${f.dataUrl}">${showFortune&&a?`<span class="scoreChip">特徴度 ${a.score}</span>`:''}<div class="thumbInfo"><span>${i+1} / ${f.time.toFixed(1)}s</span>${showFortune?`<span class="fchip">${FORTUNE_ICONS[fortune]||'🎴'} ${fortune}</span>`:''}</div></div>${showFortune&&a?`<div class="scoreDetails">くっきり ${a.clarityScore} ・ 珍しさ ${a.rarityScore} ・ 変化 ${a.changeScore}</div>`:''}`;
grid.appendChild(d);
});
}
function makeCreation(){ const mode=modeName(); const id=currentCreation?.id || ('r'+Date.now()+Math.random().toString(36).slice(2,8)); return { id, title: currentCreation?.title || autoTitle(mode), createdAt: currentCreation?.createdAt || Date.now(), updatedAt: Date.now(), sourceKey: currentSourceKey, mode, frames: selectedFrames.map(f=>f.dataUrl), fortunes: mode==='omikuji' ? selectedFortunes.slice() : [], times: selectedFrames.map(f=>f.time), appeal: mode==='omikuji' ? selectedAppealDetails.map(x=>({score:x.score,clarityScore:x.clarityScore,rarityScore:x.rarityScore,changeScore:x.changeScore})) : [] }; }
const DBNAME='babyExpressionRouletteDB', STORE='creations';
const LAST_ROULETTE_KEY='memory-moments-last-roulette-v1';
function openDB(){return new Promise((resolve,reject)=>{const r=indexedDB.open(DBNAME,3);r.onupgradeneeded=()=>{
  const db=r.result;
  if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE,{keyPath:'id'});
  if(!db.objectStoreNames.contains('deckSources')){
    const s=db.createObjectStore('deckSources',{keyPath:'id'});
    s.createIndex('fingerprint','fingerprint',{unique:false});
  }
  if(!db.objectStoreNames.contains('deckFrames')){
    const s=db.createObjectStore('deckFrames',{keyPath:'id'});
    s.createIndex('sourceVideoId','sourceVideoId',{unique:false});
  }
  if(!db.objectStoreNames.contains('deckMeta'))db.createObjectStore('deckMeta',{keyPath:'key'});
  if(!db.objectStoreNames.contains('deckReplays'))db.createObjectStore('deckReplays',{keyPath:'id'});
};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
async function dbPut(x){const db=await openDB();return new Promise((res,rej)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(x);tx.oncomplete=res;tx.onerror=()=>rej(tx.error)})}
async function dbGet(id){if(!id)return null;const db=await openDB();return new Promise((res,rej)=>{const r=db.transaction(STORE).objectStore(STORE).get(id);r.onsuccess=()=>res(r.result||null);r.onerror=()=>rej(r.error)})}
function rememberLastRoulette(x){if(!x?.id)return;try{localStorage.setItem(LAST_ROULETTE_KEY,x.id);}catch(e){}}
async function persistCreation(x){if(!x?.id||!Array.isArray(x.frames)||!x.frames.length)return;await dbPut(x);rememberLastRoulette(x);refreshLibrary().catch(e=>console.error('roulette history refresh failed',e));}
async function dbAll(){const db=await openDB();return new Promise((res,rej)=>{const r=db.transaction(STORE).objectStore(STORE).getAll();r.onsuccess=()=>res(r.result.sort((a,b)=>(b.updatedAt||b.createdAt)-(a.updatedAt||a.createdAt)));r.onerror=()=>rej(r.error)})}
async function dbDelete(id){const db=await openDB();return new Promise((res,rej)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).delete(id);tx.oncomplete=res;tx.onerror=()=>rej(tx.error)})}
async function refreshLibrary(){ const all=await dbAll(); const homeHistoryCount=$("homeHistoryCount"); if(homeHistoryCount)homeHistoryCount.textContent=all.length?all.length+'件のルーレット':'まだありません'; library.innerHTML=''; if(!all.length){ library.innerHTML='<div class="note">まだ作ったルーレットはありません。</div>'; return; } all.forEach(x=>{ const el=document.createElement('div'); el.className='saved'; el.innerHTML=`<img src="${x.frames[0]}"><div class="savedMain"><div class="savedTitle"></div><div class="savedMeta">${x.mode==='omikuji'?'おみくじ':'通常ルーレット'} ・ ${new Date(x.updatedAt||x.createdAt).toLocaleString('ja-JP')} ・ ${x.frames.length}枚</div><div class="savedBtns"><button class="primary open">遊ぶ</button><button class="secondary renameToggle">名前変更</button><button class="danger del">削除</button></div><div class="renameRow" style="display:none"><input type="text" value=""><button class="secondary saveName">保存</button></div></div>`; el.querySelector('.savedTitle').textContent=x.title; el.querySelector('.renameRow input').value=x.title; el.querySelector('.open').onclick=()=>{ unlockAudio(); preparePlay(x); }; el.querySelector('.renameToggle').onclick=()=>{ const row=el.querySelector('.renameRow'); row.style.display=row.style.display==='none'?'flex':'none'; }; el.querySelector('.saveName').onclick=async()=>{ const nx=(el.querySelector('.renameRow input').value||'').trim(); if(!nx) return; x.title=nx; x.updatedAt=Date.now(); await dbPut(x); refreshLibrary(); }; el.querySelector('.del').onclick=async()=>{ if(confirm('削除しますか？')){ await dbDelete(x.id); refreshLibrary(); } }; library.appendChild(el); }); }
async function saveCurrentCreation(){ currentCreation=makeCreation(); await persistCreation(currentCreation); }
let audioCtx=null;
const activeTones=new Set();
function ensureAudio(){
if(!audioCtx){ const Ctx=window.AudioContext||window.webkitAudioContext; if(Ctx) audioCtx=new Ctx(); }
if(audioCtx&&audioCtx.state==='suspended') audioCtx.resume();
return !!audioCtx;
}
function tone(freq,dur,when=0,vol=.09,type='triangle'){
if(!audioCtx||audioCtx.state!=='running') return;
const now=audioCtx.currentTime+when, osc=audioCtx.createOscillator(), gain=audioCtx.createGain();
osc.type=type; osc.frequency.setValueAtTime(freq,now);
gain.gain.setValueAtTime(.0001,now); gain.gain.exponentialRampToValueAtTime(vol,now+.015); gain.gain.exponentialRampToValueAtTime(.0001,now+dur);
osc.connect(gain).connect(audioCtx.destination);
activeTones.add(osc);
osc.addEventListener('ended',()=>{activeTones.delete(osc);osc.disconnect();gain.disconnect();},{once:true});
osc.start(now); osc.stop(now+dur+.03);
}
function unlockAudio(){ primed=true; ensureAudio(); playSound('start'); }
function playSound(name){
if(!primed||!ensureAudio()) return;
const seq={start:[[523,.14,0],[659,.16,.10],[784,.22,.22]],'吉':[[523,.20,0],[659,.24,.13],[784,.34,.30],[1047,.48,.48]],'小吉':[[587,.20,0],[698,.24,.13],[784,.34,.30],[988,.48,.48]],'中吉':[[659,.20,0],[784,.24,.13],[988,.34,.30],[1175,.50,.48]],'末吉':[[494,.20,0],[587,.24,.13],[698,.34,.30],[784,.48,.48]],'凶':[[466,.28,0],[392,.32,.20],[330,.50,.46]],'大凶':[[392,.32,0],[330,.38,.24],[262,.62,.54]],'大吉':[[523,.16,0],[659,.16,.11],[784,.18,.22],[1047,.24,.34],[1319,.38,.52],[1568,.65,.78]],'大大吉':[[659,.14,0],[784,.14,.09],[1047,.16,.18],[1319,.18,.28],[1568,.22,.40],[2093,.42,.58],[2637,.58,.78]]}[name]||[[523,.2,0]];
seq.forEach(([f,d,w],i)=>tone(f,d,w,(name==='大吉'||name==='大大吉')?.12:.08,i%2?'sine':'triangle'));
}
function updatePlayStageAspect(x){
stage.classList.remove('stageLandscape');
stage.style.removeProperty('aspect-ratio');
// A mixed deck must never use a landscape stage when it contains portrait frames.
// Portrait is intentionally preferred so vertical memories stay large and readable.
if(x?.deckPreferPortrait)return;
if(x?.deckMode&&x?.deckAllLandscape===false)return;
const src=x?.frames?.[0];
if(!src)return;
const probe=new Image();
probe.onload=()=>{
  if(activeCreation!==x)return;
  const w=Number(probe.naturalWidth)||0;
  const h=Number(probe.naturalHeight)||0;
  if(!w||!h)return;
  if(w/h>1.12){
    stage.classList.add('stageLandscape');
    stage.style.aspectRatio=w+' / '+h;
  }
};
probe.src=src;
}
function preparePlay(x){
window.__memoryNavigate?.('play');
rememberLastRoulette(x);
activeCreation=x; running=false; clearInterval(timer); currentIndex=0;
updatePlayStageAspect(x);
playSection.style.display='block';
fortuneBadge.style.display='none'; resultCard.style.display='none';
rouletteBadge.style.display='block'; rouletteBadge.textContent='タップでストップ';
tapHint.textContent='画像をタップすると止まります'; playImage.src=x.frames[0];
window.__memoryOnRoulettePrepared?.(x);
playSection.scrollIntoView({behavior:'smooth'});
startRun(false);
}
function showRandom(){ const arr=activeCreation.frames; if(!arr?.length) return; let n=currentIndex; while(arr.length>1 && n===currentIndex) n=Math.floor(Math.random()*arr.length); currentIndex=n; playImage.src=arr[n]; }
function startRun(withSound=true){ running=true; window.__memoryOnRouletteStarted?.(); stage.classList.add('pulse'); fortuneBadge.style.display='none'; resultCard.style.display='none'; rouletteBadge.style.display='block'; rouletteBadge.textContent='タップでストップ'; tapHint.textContent='画像をタップすると止まります'; showRandom(); clearInterval(timer); timer=setInterval(showRandom,75); if(withSound) playSound('start'); }
function stopRun(){
running=false; clearInterval(timer); timer=null; stage.classList.remove('pulse');
if(activeCreation?.deckMode&&typeof window.__memoryDeckResolveStop==='function'){
  const resolved=window.__memoryDeckResolveStop(activeCreation,currentIndex);
  if(Number.isInteger(resolved)&&resolved>=0&&resolved<activeCreation.frames.length){
    currentIndex=resolved;
    playImage.src=activeCreation.frames[currentIndex];
  }
}
if(activeCreation.mode==='omikuji'){
  const baseFortune=window.__babyLabForcedSpecial==='reversal'?'大凶':drawFortune();
  const resolved=typeof window.__memoryResolveFortuneResult==='function'
    ? window.__memoryResolveFortuneResult(baseFortune)
    : null;
  const f=resolved?.fortune||baseFortune;
  if(Array.isArray(activeCreation.fortunes))activeCreation.fortunes[currentIndex]=f;
  fortuneBadge.style.display='block'; fortuneBadge.textContent=(FORTUNE_ICONS[f]||'🎴')+' '+f; fortuneBadge.style.color=FORTUNE_COLORS[f]||'#700';
  resultCard.style.display='block'; resultText.textContent=f; resultText.style.color=FORTUNE_COLORS[f]||'#700'; message.textContent=resolved?.message||FORTUNE_MESSAGES[f]||'';
  rouletteBadge.style.display='none'; if(f==='大吉') celebrate(); else playSound(f);
}else{
  rouletteBadge.style.display='block'; rouletteBadge.textContent='この瞬間！'; playSound('吉');
}
tapHint.textContent='もう一度タップすると再開します';
window.__memoryOnRouletteStopped?.();
}
function celebrate(){ bigOverlay.classList.remove('show'); void bigOverlay.offsetWidth; bigOverlay.classList.add('show'); const pal=['#ffd700','#fff0a0','#fff','#ff5a61','#ff9d00']; for(let i=0;i<90;i++){ const e=document.createElement('div'); e.className='confetti'; e.style.left=Math.random()*100+'vw'; e.style.width=7+Math.random()*9+'px'; e.style.height=10+Math.random()*18+'px'; e.style.background=pal[Math.floor(Math.random()*pal.length)]; e.style.animationDuration=1.8+Math.random()*1.6+'s'; e.style.animationDelay=Math.random()*.3+'s'; document.body.appendChild(e); setTimeout(()=>e.remove(),3800); } if(navigator.vibrate) navigator.vibrate([100,60,140,70,260]); playSound('大吉'); setTimeout(()=>bigOverlay.classList.remove('show'),2500); }
fileInput.addEventListener('change',()=>{ if(fileInput.files?.length){ currentCreation=null; if(typeof window.__memoryDeckHandleFiles==='function'){ window.__memoryDeckHandleFiles(Array.from(fileInput.files)); return; } extractFromCurrentFile(); } });
reextractBtn.addEventListener('click',()=>{ if(lastFile){ currentCreation=null; extractFromCurrentFile(); } });
playBtn.addEventListener('click',()=>{ if(!selectedFrames.length) return; unlockAudio(); currentCreation=makeCreation(); persistCreation(currentCreation).catch(e=>console.error('roulette history save failed',e)); preparePlay(currentCreation); });
stage.addEventListener('pointerdown',e=>{ e.preventDefault(); if(!primed) unlockAudio(); if(running) stopRun(); else startRun(); },{passive:false});
// Abandoning a spin does not count as stopping/drawing a result.
function exitRoulette(){
  const interrupted=running;
  running=false;
  clearInterval(timer);timer=null;
  stage.classList.remove('pulse');
  window.__memoryStopRouletteEffects?.();
  window.__memoryOnRouletteExit?.();
  document.querySelectorAll('.confetti').forEach(e=>e.remove());
  bigOverlay.classList.remove('show','deluxe');
  if(interrupted){
    rouletteBadge.style.display='block';
    rouletteBadge.textContent='タップで再開';
    tapHint.textContent='画像をタップすると再開します';
  }
  // Also stop oscillators already queued on the Web Audio timeline.
  for(const osc of activeTones){try{osc.stop();}catch(e){}}
  activeTones.clear();
  try{navigator.vibrate?.(0);}catch(e){}
  try{audioCtx?.suspend().catch(()=>{});}catch(e){}
}
window.__memoryExitRoulette=exitRoulette;
$('backBtn').addEventListener('click',()=>{
  if(window.__memoryBackFromPlay)window.__memoryBackFromPlay();
  else{exitRoulette();window.__memoryNavigate?.('home');}
});
async function restoreLastRouletteAfterReload(){
  if(location.hash!=='#play'||activeCreation?.frames?.length)return;
  try{
    let saved=null,lastId=null;
    try{lastId=localStorage.getItem(LAST_ROULETTE_KEY);}catch(e){}
    if(lastId)saved=await dbGet(lastId);
    if(!saved){const all=await dbAll();saved=all[0]||null;}
    if(saved?.frames?.length){preparePlay(saved);return;}
  }catch(e){console.error('last roulette restore failed',e);}
  window.__memoryNavigate?.('home',{replace:true});
}
updatePreviewMeta(); refreshLibrary();
window.addEventListener('DOMContentLoaded',()=>setTimeout(()=>restoreLastRouletteAfterReload(),0));
if('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(()=>{});
