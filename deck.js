(()=>{
const SOURCE_STORE='deckSources';
const FRAME_STORE='deckFrames';
const META_STORE='deckMeta';
const REPLAY_STORE='deckReplays';
const MAX_FRAMES=1500;
const MAX_BYTES=650*1024*1024;
const REPLAY_EDGE=420;
const REPLAY_FRAME_COUNT=12;
const REPLAY_QUALITY=.70;
const REPLAY_SECONDS=3.0;
const EARLY_REPLAY_SECONDS=2.5;
const deckCard=document.getElementById('deckCard');
const deckStatus=document.getElementById('deckStatus');
const deckPicker=document.getElementById('deckPicker');
const deckNotice=document.getElementById('deckNotice');
const deckDrawBtn=document.getElementById('deckDrawBtn');
const deckAddBtn=document.getElementById('deckAddBtn');
const deckManageBtn=document.getElementById('deckManageBtn');
const deckManage=document.getElementById('deckManage');
const deckSources=document.getElementById('deckSources');
const deckStorage=document.getElementById('deckStorage');
const deckBackupBtn=document.getElementById('deckBackupBtn');
const deckRestoreBtn=document.getElementById('deckRestoreBtn');
const deckRestoreInput=document.getElementById('deckRestoreInput');
const deckClearBtn=document.getElementById('deckClearBtn');
if(!deckCard||!deckDrawBtn||!deckAddBtn||!deckManage||!deckSources||!deckPicker)return;

let processing=false;
const selectedSourceIds=new Set();

async function getAll(store){
  const db=await openDB();
  return new Promise((res,rej)=>{
    const tx=db.transaction(store,'readonly');
    const r=tx.objectStore(store).getAll();
    r.onsuccess=()=>res(r.result||[]);
    r.onerror=()=>rej(r.error);
  });
}
async function metaGet(key){
  const db=await openDB();
  return new Promise((res,rej)=>{
    const tx=db.transaction(META_STORE,'readonly');
    const r=tx.objectStore(META_STORE).get(key);
    r.onsuccess=()=>res(r.result?.value??null);
    r.onerror=()=>rej(r.error);
  });
}
async function metaPut(key,value){
  const db=await openDB();
  return new Promise((res,rej)=>{
    const tx=db.transaction(META_STORE,'readwrite');
    tx.objectStore(META_STORE).put({key,value,updatedAt:Date.now()});
    tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error);
  });
}
function hashString(s){
  let h=2166136261;
  for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}
  return (h>>>0).toString(36);
}
function approxDataUrlBytes(s){
  if(!s)return 0;
  const comma=s.indexOf(',');
  return Math.ceil((s.length-(comma>=0?comma+1:0))*0.75);
}
function deckTargetCount(duration){
  const manual=frameCountEl?.value&&frameCountEl.value!=='auto'?Number(frameCountEl.value):null;
  if(Number.isFinite(manual)&&manual>0)return manual;
  if(duration<15)return 8;
  if(duration<60)return 12;
  return 15;
}
function isUsableCandidate(c){
  const a=c?.desc;
  if(!a?.length)return false;
  let sum=0,sum2=0,min=255,max=0;
  for(const v of a){sum+=v;sum2+=v*v;if(v<min)min=v;if(v>max)max=v;}
  const mean=sum/a.length;
  const variance=Math.max(0,sum2/a.length-mean*mean);
  if(mean<3||mean>252)return false;
  if(max-min<5&&variance<3)return false;
  return true;
}
function selectDiverseMoments(list,n){
  const sorted=[...list].sort((a,b)=>a.time-b.time);
  if(sorted.length<=n)return sorted;
  const chosen=[sorted[Math.floor(sorted.length/2)]];
  const remaining=sorted.filter(x=>x!==chosen[0]);
  const span=Math.max(.001,sorted[sorted.length-1].time-sorted[0].time);
  while(chosen.length<n&&remaining.length){
    let bestI=0,best=-Infinity;
    for(let i=0;i<remaining.length;i++){
      const c=remaining[i];
      let visual=Infinity,temporal=Infinity;
      for(const x of chosen){
        visual=Math.min(visual,dist(c.desc,x.desc));
        temporal=Math.min(temporal,Math.abs(c.time-x.time)/span);
      }
      const score=visual+temporal*16;
      if(score>best){best=score;bestI=i;}
    }
    chosen.push(remaining.splice(bestI,1)[0]);
  }
  return chosen.sort((a,b)=>a.time-b.time);
}
function waitUntilVisible(){
  if(!document.hidden)return Promise.resolve();
  return new Promise(resolve=>{
    const on=()=>{if(!document.hidden){document.removeEventListener('visibilitychange',on);resolve();}};
    document.addEventListener('visibilitychange',on);
  });
}
async function captureDeckImage(time){
  await waitUntilVisible();
  await seekTo(time);
  const maxEdge=1280;
  const vw=Math.max(1,video.videoWidth||1),vh=Math.max(1,video.videoHeight||1);
  const scale=Math.min(1,maxEdge/Math.max(vw,vh));
  captureCanvas.width=Math.max(2,Math.round(vw*scale));
  captureCanvas.height=Math.max(2,Math.round(vh*scale));
  ctx.drawImage(video,0,0,captureCanvas.width,captureCanvas.height);
  let dataUrl=captureCanvas.toDataURL('image/webp',.82);
  if(!dataUrl.startsWith('data:image/webp'))dataUrl=captureCanvas.toDataURL('image/jpeg',.82);
  return {dataUrl,width:captureCanvas.width,height:captureCanvas.height};
}
async function captureReplayBurst(targetTime){
  const duration=Math.max(.05,Number(video.duration)||0);
  const target=Math.max(0,Math.min(duration-.04,Number(targetTime)||0));
  const reverse=target<EARLY_REPLAY_SECONDS;
  const start=reverse?target:Math.max(0,target-REPLAY_SECONDS);
  const end=reverse?Math.min(duration-.04,target+REPLAY_SECONDS):target;
  const span=Math.max(.04,end-start);
  const vw=Math.max(1,video.videoWidth||1),vh=Math.max(1,video.videoHeight||1);
  const scale=Math.min(1,REPLAY_EDGE/Math.max(vw,vh));
  captureCanvas.width=Math.max(2,Math.round(vw*scale));
  captureCanvas.height=Math.max(2,Math.round(vh*scale));
  const frames=[];
  let totalBytes=0;
  for(let i=0;i<REPLAY_FRAME_COUNT;i++){
    await waitUntilVisible();
    const p=REPLAY_FRAME_COUNT===1?0:i/(REPLAY_FRAME_COUNT-1);
    const t=start+span*p;
    await seekTo(t);
    ctx.drawImage(video,0,0,captureCanvas.width,captureCanvas.height);
    let dataUrl=captureCanvas.toDataURL('image/webp',REPLAY_QUALITY);
    if(!dataUrl.startsWith('data:image/webp'))dataUrl=captureCanvas.toDataURL('image/jpeg',REPLAY_QUALITY);
    frames.push(dataUrl);
    totalBytes+=approxDataUrlBytes(dataUrl);
  }
  if(reverse)frames.reverse();
  return {
    frames,
    mode:reverse?'reverse':'forward',
    span,
    bytes:totalBytes,
    width:captureCanvas.width,
    height:captureCanvas.height,
    count:frames.length
  };
}
async function framesForSource(sourceId){
  const db=await openDB();
  return new Promise((res,rej)=>{
    const idx=db.transaction(FRAME_STORE,'readonly').objectStore(FRAME_STORE).index('sourceVideoId');
    const r=idx.getAll(IDBKeyRange.only(sourceId));
    r.onsuccess=()=>res(r.result||[]);
    r.onerror=()=>rej(r.error);
  });
}
async function stats(){
  const sources=await getAll(SOURCE_STORE);
  const complete=sources.every(s=>Number.isFinite(Number(s.candidateCount))&&Number.isFinite(Number(s.storageBytes)));
  if(complete){
    return {
      sources,
      count:sources.reduce((n,s)=>n+(Number(s.candidateCount)||0),0),
      bytes:sources.reduce((n,s)=>n+(Number(s.storageBytes)||0),0)
    };
  }
  const frames=await getAll(FRAME_STORE);
  const bySource=new Map();
  let bytes=0;
  for(const fr of frames){
    const b=(fr.imageSize||approxDataUrlBytes(fr.imageData))+(fr.replaySize||0);
    bytes+=b;
    const x=bySource.get(fr.sourceVideoId)||{count:0,bytes:0};
    x.count++;x.bytes+=b;bySource.set(fr.sourceVideoId,x);
  }
  for(const src of sources){
    const x=bySource.get(src.id)||{count:0,bytes:0};
    if(src.candidateCount!==x.count||src.storageBytes!==x.bytes){
      src.candidateCount=x.count;src.storageBytes=x.bytes;
      try{
        const db=await openDB();
        const tx=db.transaction(SOURCE_STORE,'readwrite');
        tx.objectStore(SOURCE_STORE).put(src);
      }catch(e){}
    }
  }
  return {sources,count:frames.length,bytes};
}
async function effectiveByteLimit(currentBytes=0){
  let limit=MAX_BYTES;
  if(navigator.storage?.estimate){
    try{
      const e=await navigator.storage.estimate();
      const quota=Number(e.quota)||0,usage=Number(e.usage)||0;
      if(quota>0){
        const free=Math.max(0,quota-usage);
        limit=Math.min(limit,currentBytes+Math.max(0,free-25*1024*1024));
      }
    }catch(e){}
  }
  return limit;
}
function formatBytes(n){
  if(n<1024*1024)return Math.max(0,n/1024).toFixed(n<10240?1:0)+'KB';
  return (n/1024/1024).toFixed(1)+'MB';
}
async function storageText(localBytes){
  if(!navigator.storage?.estimate)return 'デッキ '+formatBytes(localBytes);
  try{
    const e=await navigator.storage.estimate();
    const usage=Number(e.usage)||0,quota=Number(e.quota)||0;
    const persistent=navigator.storage.persisted?await navigator.storage.persisted():false;
    return 'デッキ '+formatBytes(localBytes)+(quota?' ・ 端末保存 '+formatBytes(usage)+' / '+formatBytes(quota):'')+(persistent?' ・ 保存保護あり':' ・ 通常保存');
  }catch(e){return 'デッキ '+formatBytes(localBytes);}
}
async function renderDeck(){
  const s=await stats();
  const validIds=new Set(s.sources.map(x=>x.id));
  for(const id of [...selectedSourceIds])if(!validIds.has(id))selectedSourceIds.delete(id);
  const selected=s.sources.filter(x=>selectedSourceIds.has(x.id));
  deckStatus.textContent=s.count
    ? s.sources.length+'本の動画から '+s.count+'個の一瞬を保存しています。'+(selected.length?' 現在 '+selected.length+'本を選択中です。':' ルーレットに使う動画を選んでください。')
    : 'まだ保存した動画はありません。上の「新しい動画からルーレットを作る」から追加してください。';
  deckDrawBtn.disabled=!selected.length||processing;
  deckStorage.textContent=await storageText(s.bytes);

  deckPicker.innerHTML='';
  const sortedSources=[...s.sources].sort((a,b)=>(b.addedAt||0)-(a.addedAt||0));
  if(!sortedSources.length){
    deckPicker.innerHTML='<div class="note">追加した動画がここに並びます。</div>';
  }else{
    sortedSources.forEach(src=>{
      const row=document.createElement('label');
      row.className='deckPickRow';
      const check=document.createElement('input');
      check.type='checkbox';
      check.checked=selectedSourceIds.has(src.id);
      check.addEventListener('change',()=>{
        if(check.checked)selectedSourceIds.add(src.id);
        else selectedSourceIds.delete(src.id);
        renderDeck().catch(console.error);
      });
      const main=document.createElement('div');
      main.className='deckSourceMain';
      const name=document.createElement('strong');
      name.textContent=src.fileName||'動画';
      const meta=document.createElement('span');
      meta.textContent=(Number(src.candidateCount)||0)+'個の一瞬 ・ '+new Date(src.addedAt||Date.now()).toLocaleDateString('ja-JP');
      main.append(name,meta);
      row.append(check,main);
      deckPicker.appendChild(row);
    });
  }

  deckSources.innerHTML='';
  if(!sortedSources.length){
    deckSources.innerHTML='<div class="note">追加した動画はここに表示されます。</div>';
  }else{
    sortedSources.forEach(src=>{
      const row=document.createElement('div');
      row.className='deckSourceRow';
      const main=document.createElement('div');
      main.className='deckSourceMain';
      const name=document.createElement('strong');
      name.textContent=src.fileName||'動画';
      const meta=document.createElement('span');
      meta.textContent=(Number(src.candidateCount)||0)+'個の一瞬 ・ '+formatBytes(Number(src.storageBytes)||0)+' ・ '+new Date(src.addedAt||Date.now()).toLocaleDateString('ja-JP');
      main.append(name,meta);
      const del=document.createElement('button');
      del.className='danger'; del.type='button'; del.textContent='この動画分を削除';
      del.onclick=async()=>{
        if(!confirm('「'+(src.fileName||'この動画')+'」から作った一瞬をデッキから削除しますか？'))return;
        await deleteSource(src.id); await renderDeck();
      };
      row.append(main,del); deckSources.appendChild(row);
    });
  }
}
async function deleteSource(sourceId){
  selectedSourceIds.delete(sourceId);
  const db=await openDB();
  await new Promise((res,rej)=>{
    const tx=db.transaction([SOURCE_STORE,FRAME_STORE,REPLAY_STORE],'readwrite');
    tx.objectStore(SOURCE_STORE).delete(sourceId);
    const framesStore=tx.objectStore(FRAME_STORE);
    const replayStore=tx.objectStore(REPLAY_STORE);
    const idx=framesStore.index('sourceVideoId');
    const req=idx.openCursor(IDBKeyRange.only(sourceId));
    req.onsuccess=()=>{
      const cur=req.result;
      if(cur){
        replayStore.delete(cur.primaryKey);
        cur.delete();
        cur.continue();
      }
    };
    tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error);
  });
  const state=await metaGet('drawState');
  if(state){
    state.remainingIds=(state.remainingIds||[]).filter(id=>!id.startsWith(sourceId+'-'));
    state.universeIds=(state.universeIds||[]).filter(id=>!id.startsWith(sourceId+'-'));
    await metaPut('drawState',state);
  }
}
async function existingSource(fingerprint){
  const all=await getAll(SOURCE_STORE);
  return all.find(x=>x.fingerprint===fingerprint)||null;
}
async function sourceHasReplay(sourceId){
  const own=await framesForSource(sourceId);
  return !!own.length&&own.every(x=>Number(x.replayFrameCount)>=2&&Number(x.replaySize)>0);
}
async function saveSourceAndFrames(source,frames,replays){
  const db=await openDB();
  return new Promise((res,rej)=>{
    const tx=db.transaction([SOURCE_STORE,FRAME_STORE,REPLAY_STORE],'readwrite');
    tx.objectStore(SOURCE_STORE).put(source);
    const fs=tx.objectStore(FRAME_STORE);
    const rs=tx.objectStore(REPLAY_STORE);
    frames.forEach(x=>fs.put(x));
    replays.forEach(x=>rs.put(x));
    tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error);
  });
}
window.__memoryDeckLoadReplay=async candidateId=>{
  if(!candidateId)return null;
  const db=await openDB();
  return new Promise((res,rej)=>{
    const r=db.transaction(REPLAY_STORE,'readonly').objectStore(REPLAY_STORE).get(candidateId);
    r.onsuccess=()=>res(r.result||null);
    r.onerror=()=>rej(r.error);
  });
};
async function extractOne(file,overallIndex,total){
  await waitUntilVisible();
  progressText.textContent='動画 '+overallIndex+' / '+total+' を読み込んでいます…';
  await loadVideo(file);
  setupCanvas();
  const duration=video.duration;
  const fingerprint=hashString([file.name,file.size,file.lastModified,Math.round(duration*1000)].join('|'));
  const existing=await existingSource(fingerprint);
  if(existing){
    if(await sourceHasReplay(existing.id))return {duplicate:true,name:file.name,count:0,sourceId:existing.id};
    await deleteSource(existing.id);
  }
  const before=await stats();
  const room=Math.max(0,MAX_FRAMES-before.count);
  if(!room)throw new Error('思い出デッキは最大'+MAX_FRAMES+'個です');
  const target=Math.min(deckTargetCount(duration),room);
  const sampleCount=Math.min(70,Math.max(target*4,Math.ceil(duration*2.2)));
  const start=Math.min(.12,duration*.02),end=Math.max(start,duration-.06);
  const candidates=[];
  for(let i=0;i<sampleCount;i++){
    await waitUntilVisible();
    const t=start+(end-start)*(sampleCount===1?0:i/(sampleCount-1));
    progressText.textContent='動画 '+overallIndex+' / '+total+' ・ 一瞬を探しています '+(i+1)+' / '+sampleCount;
    progressBar.style.width=(5+80*((overallIndex-1)+(i+1)/sampleCount)/total)+'%';
    const c=await captureCandidate(t);
    if(isUsableCandidate(c))candidates.push(c);
  }
  const deduped=[];
  for(const c of candidates){
    const prev=deduped[deduped.length-1];
    if(prev&&dist(c.desc,prev.desc)<3.2)continue;
    deduped.push(c);
  }
  const picked=selectDiverseMoments(deduped.length?deduped:candidates,target);
  if(!picked.length)throw new Error('保存できる一瞬を見つけられませんでした');
  const details=computeAppealDetails(picked);
  const sourceId='s'+Date.now().toString(36)+hashString(fingerprint+Math.random());
  const source={
    id:sourceId,fingerprint,fileName:file.name,fileSize:file.size,lastModified:file.lastModified,
    duration,addedAt:Date.now(),candidateCount:0
  };
  const frames=[];
  const replays=[];
  let bytes=before.bytes;
  const byteLimit=await effectiveByteLimit(before.bytes);
  for(let i=0;i<picked.length;i++){
    const p=picked[i];
    progressText.textContent='動画 '+overallIndex+' / '+total+' ・ 通常画像を保存しています '+(i+1)+' / '+picked.length;
    const stored=await captureDeckImage(p.time);
    const imageSize=approxDataUrlBytes(stored.dataUrl);
    progressText.textContent='動画 '+overallIndex+' / '+total+' ・ 奇跡リプレイを保存しています '+(i+1)+' / '+picked.length+'（420px・12コマ）';
    const replay=await captureReplayBurst(p.time);
    const candidateBytes=imageSize+replay.bytes;
    if(bytes+candidateBytes>byteLimit)break;
    const d=details[i]||{};
    const candidateId=sourceId+'-'+String(i).padStart(3,'0');
    frames.push({
      id:candidateId,sourceVideoId:sourceId,timestamp:p.time,
      imageData:stored.dataUrl,width:stored.width,height:stored.height,imageSize,createdAt:Date.now(),
      replayMode:replay.mode,replaySpan:replay.span,replaySize:replay.bytes,
      replayWidth:replay.width,replayHeight:replay.height,replayFrameCount:replay.count,
      replayQuality:REPLAY_QUALITY,replayEdge:REPLAY_EDGE,
      clarity:d.clarityScore??null,rarity:d.rarityScore??null,change:d.changeScore??null,featureScore:d.score??null
    });
    replays.push({
      id:candidateId,frames:replay.frames,mode:replay.mode,span:replay.span,
      width:replay.width,height:replay.height,frameCount:replay.count,
      quality:REPLAY_QUALITY,edge:REPLAY_EDGE,size:replay.bytes,createdAt:Date.now()
    });
    bytes+=candidateBytes;
  }
  if(!frames.length)throw new Error('デッキの保存容量が上限に達しています');
  source.candidateCount=frames.length;
  source.storageBytes=frames.reduce((n,x)=>n+(Number(x.imageSize)||0)+(Number(x.replaySize)||0),0);
  source.replaySpec={edge:REPLAY_EDGE,frames:REPLAY_FRAME_COUNT,quality:REPLAY_QUALITY,seconds:REPLAY_SECONDS};
  await saveSourceAndFrames(source,frames,replays);
  return {duplicate:false,name:file.name,count:frames.length,sourceId};
}
async function requestPersistence(){
  if(!navigator.storage?.persist)return false;
  try{return await navigator.storage.persist();}catch(e){return false;}
}
window.__memoryDeckHandleFiles=async files=>{
  if(processing||!files?.length)return;
  processing=true;
  fileInput.disabled=true;
  deckDrawBtn.disabled=true;
  progressWrap.style.display='block';
  previewSection.style.display='none';
  progressBar.style.width='3%';
  let added=0,duplicates=0,failed=0;
  const errors=[];
  const batchSourceIds=[];
  try{
    for(let i=0;i<files.length;i++){
      try{
        const r=await extractOne(files[i],i+1,files.length);
        if(r.sourceId)batchSourceIds.push(r.sourceId);
        if(r.duplicate)duplicates++;else added+=r.count;
      }catch(e){
        failed++;
        errors.push(files[i].name+': '+(e?.message||e));
      }
    }
    await requestPersistence();
    if(batchSourceIds.length){selectedSourceIds.clear();batchSourceIds.forEach(id=>selectedSourceIds.add(id));}
    progressBar.style.width='100%';
    let msg=added+'個の一瞬を思い出デッキに追加しました。';
    if(duplicates)msg+=' '+duplicates+'本は追加済みのためスキップしました。';
    if(failed)msg+=' '+failed+'本は処理できませんでした。';
    if(batchSourceIds.length)msg+=' 今回選んだ動画だけをルーレット候補にしています。';
    progressText.textContent=msg;
    const standalone=window.matchMedia?.('(display-mode: standalone)')?.matches||navigator.standalone===true;
    let notice=errors.length?errors.join(' / '):msg;
    if(added&&!standalone){
      try{
        if(!localStorage.getItem('memory-deck-home-hint-v1')){
          notice+=' 継続して使う場合は、ホーム画面への追加とデッキのバックアップがおすすめです。';
          localStorage.setItem('memory-deck-home-hint-v1','1');
        }
      }catch(e){}
    }
    deckNotice.textContent=notice;
    deckNotice.className='note deckNotice '+(failed?'warn':'ok');
    await renderDeck();
    deckCard.scrollIntoView({behavior:'smooth',block:'start'});
  }finally{
    processing=false;
    fileInput.disabled=false;
    fileInput.value='';
    await renderDeck();
  }
};

async function preparedDrawState(ids){
  const allSet=new Set(ids);
  const saved=(await metaGet('drawState'))||{};
  let universe=(saved.universeIds||[]).filter(id=>allSet.has(id));
  let remaining=(saved.remainingIds||[]).filter(id=>allSet.has(id));
  const known=new Set(universe);
  const fresh=ids.filter(id=>!known.has(id));
  if(fresh.length){
    universe=universe.concat(fresh);
    remaining=shuffle(remaining.concat(fresh));
  }
  if(!remaining.length){
    universe=ids.slice();
    remaining=shuffle(ids);
  }
  const state={universeIds:universe,remainingIds:remaining,cycle:Number(saved.cycle)||1};
  await metaPut('drawState',state);
  return state;
}
window.__memoryDeckResolveStop=(creation,fallback)=>{
  const state=creation?.deckDrawState;
  const ids=creation?.deckCandidateIds||[];
  if(!state||!ids.length)return fallback;
  if(!state.remainingIds.length){
    state.remainingIds=shuffle(ids);
    state.universeIds=ids.slice();
    state.cycle=(state.cycle||1)+1;
  }
  const id=state.remainingIds.shift();
  metaPut('drawState',state).catch(()=>{});
  const ix=ids.indexOf(id);
  return ix>=0?ix:fallback;
};
async function buildDeckCreation(sourceIds){
  const [allFrames,sources]=await Promise.all([getAll(FRAME_STORE),getAll(SOURCE_STORE)]);
  const wanted=new Set(sourceIds||[]);
  const frames=allFrames.filter(x=>wanted.has(x.sourceVideoId));
  if(!frames.length)return null;
  const sourceNames=new Map(sources.map(x=>[x.id,x.fileName||'動画']));
  const ids=frames.map(x=>x.id);
  const drawState=await preparedDrawState(ids);
  const mode=modeName();
  const selectedNames=[...new Set(frames.map(x=>sourceNames.get(x.sourceVideoId)||'動画'))];
  const hasPortrait=frames.some(x=>(Number(x.height)||0)>(Number(x.width)||0)*1.12);
  const allLandscape=frames.every(x=>(Number(x.width)||0)>(Number(x.height)||0)*1.12);
  return {
    id:'deck-'+Date.now(),
    title:selectedNames.length===1?selectedNames[0]:(selectedNames.length+'本の思い出おみくじ'),
    createdAt:Date.now(),updatedAt:Date.now(),sourceKey:null,mode,deckMode:true,
    frames:frames.map(x=>x.imageData),
    fortunes:mode==='omikuji'?frames.map(()=>drawFortune()):[],
    times:frames.map(x=>x.timestamp),
    appeal:frames.map(x=>({score:x.featureScore,clarityScore:x.clarity,rarityScore:x.rarity,changeScore:x.change})),
    deckCandidateIds:ids,
    deckSourceIds:frames.map(x=>x.sourceVideoId),
    deckSourceNames:frames.map(x=>sourceNames.get(x.sourceVideoId)||'動画'),
    deckReplayModes:frames.map(x=>x.replayMode||null),
    deckReplaySpans:frames.map(x=>Number(x.replaySpan)||0),
    deckDrawState:drawState,
    deckPreferPortrait:hasPortrait,
    deckAllLandscape:allLandscape
  };
}
deckDrawBtn.addEventListener('click',async()=>{
  if(processing)return;
  const creation=await buildDeckCreation([...selectedSourceIds]);
  if(!creation)return;
  unlockAudio();
  currentCreation=null;
  preparePlay(creation);
});
deckAddBtn.addEventListener('click',()=>fileInput.click());
deckManageBtn.addEventListener('click',()=>{
  deckManage.hidden=!deckManage.hidden;
  deckManageBtn.textContent=deckManage.hidden?'保存データを管理':'管理を閉じる';
});
async function backupDeck(){
  const [sources,frames,replays,drawState]=await Promise.all([getAll(SOURCE_STORE),getAll(FRAME_STORE),getAll(REPLAY_STORE),metaGet('drawState')]);
  if(!frames.length){alert('バックアップする思い出デッキがありません。');return;}
  const payload={format:'memory-moments-roulette-deck',version:2,exportedAt:new Date().toISOString(),sources,frames,replays,drawState};
  const blob=new Blob([JSON.stringify(payload)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  const d=new Date(),pad=n=>String(n).padStart(2,'0');
  a.href=url;
  a.download='memory-moments-deck-'+d.getFullYear()+pad(d.getMonth()+1)+pad(d.getDate())+'.json';
  document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1500);
}
async function restoreDeck(file){
  const text=await file.text();
  const payload=JSON.parse(text);
  if(payload?.format!=='memory-moments-roulette-deck'||!Array.isArray(payload.sources)||!Array.isArray(payload.frames))throw new Error('対応する思い出デッキのバックアップではありません');
  const cur=await stats();
  const existingFp=new Set(cur.sources.map(x=>x.fingerprint));
  let count=cur.count,bytes=cur.bytes,added=0;
  const restoreLimit=await effectiveByteLimit(cur.bytes);
  const db=await openDB();
  const backupReplays=Array.isArray(payload.replays)?payload.replays:[];
  const replayById=new Map(backupReplays.map(x=>[x.id,x]));
  await new Promise((res,rej)=>{
    const tx=db.transaction([SOURCE_STORE,FRAME_STORE,REPLAY_STORE],'readwrite');
    const ss=tx.objectStore(SOURCE_STORE),fs=tx.objectStore(FRAME_STORE),rs=tx.objectStore(REPLAY_STORE);
    for(const src of payload.sources){
      if(existingFp.has(src.fingerprint))continue;
      const candidates=payload.frames.filter(x=>x.sourceVideoId===src.id);
      const accepted=[];
      for(const fr of candidates){
        const legacyFrames=Array.isArray(fr.replayFrames)?fr.replayFrames:null;
        const replayRecord=replayById.get(fr.id)||(
          legacyFrames?{id:fr.id,frames:legacyFrames,mode:fr.replayMode||'forward',span:Number(fr.replaySpan)||REPLAY_SECONDS,
            width:fr.replayWidth||0,height:fr.replayHeight||0,frameCount:legacyFrames.length,
            quality:fr.replayQuality||REPLAY_QUALITY,edge:fr.replayEdge||REPLAY_EDGE,
            size:fr.replaySize||legacyFrames.reduce((n,x)=>n+approxDataUrlBytes(x),0),createdAt:fr.createdAt||Date.now()}:null
        );
        const imageBytes=fr.imageSize||approxDataUrlBytes(fr.imageData);
        const replayBytes=replayRecord?.size||fr.replaySize||0;
        const b=imageBytes+replayBytes;
        if(count>=MAX_FRAMES||bytes+b>restoreLimit)break;
        const clean={...fr,imageSize:imageBytes,replaySize:replayBytes};
        delete clean.replayFrames;
        accepted.push({frame:clean,replay:replayRecord});count++;bytes+=b;added++;
      }
      if(accepted.length){
        const storageBytes=accepted.reduce((n,x)=>n+(Number(x.frame.imageSize)||0)+(Number(x.frame.replaySize)||0),0);
        ss.put({...src,candidateCount:accepted.length,storageBytes});
        accepted.forEach(x=>{fs.put(x.frame);if(x.replay)rs.put(x.replay);});
      }
    }
    tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error);
  });
  const after=await getAll(FRAME_STORE);
  const afterIds=new Set(after.map(x=>x.id));
  if(cur.count===0&&payload.drawState){
    await metaPut('drawState',{
      universeIds:(payload.drawState.universeIds||[]).filter(id=>afterIds.has(id)),
      remainingIds:(payload.drawState.remainingIds||[]).filter(id=>afterIds.has(id)),
      cycle:Number(payload.drawState.cycle)||1
    });
  }else{
    await metaPut('drawState',{universeIds:[],remainingIds:[],cycle:1});
  }
  await requestPersistence();
  await renderDeck();
  deckNotice.textContent=added+'個の一瞬をバックアップから復元しました。';
  deckNotice.className='note deckNotice ok';
}
deckClearBtn?.addEventListener('click',async()=>{
  if(!confirm('思い出おみくじデッキをすべて削除しますか？ 今日の一枚や従来の保存ルーレットは削除しません。'))return;
  const db=await openDB();
  await new Promise((res,rej)=>{
    const tx=db.transaction([SOURCE_STORE,FRAME_STORE,META_STORE,REPLAY_STORE],'readwrite');
    tx.objectStore(SOURCE_STORE).clear();
    tx.objectStore(FRAME_STORE).clear();
    tx.objectStore(REPLAY_STORE).clear();
    tx.objectStore(META_STORE).delete('drawState');
    tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error);
  });
  deckNotice.textContent='思い出デッキを削除しました。';
  deckNotice.className='note deckNotice';
  await renderDeck();
});
deckBackupBtn?.addEventListener('click',backupDeck);
deckRestoreBtn?.addEventListener('click',()=>deckRestoreInput?.click());
deckRestoreInput?.addEventListener('change',async()=>{
  const f=deckRestoreInput.files?.[0];
  if(!f)return;
  try{await restoreDeck(f);}catch(e){alert('復元できませんでした: '+(e?.message||e));}
  deckRestoreInput.value='';
});
document.addEventListener('visibilitychange',()=>{
  if(processing&&document.hidden){
    deckNotice.textContent='処理を一時停止します。画面に戻ると続きから再開します。完了済みの動画は保存されています。';
    deckNotice.className='note deckNotice';
  }
});
requestPersistence().catch(()=>{});
renderDeck().catch(err=>{console.error(err);deckStatus.textContent='デッキ情報を読み込めませんでした。';});
})();