(()=>{
const SOURCE_STORE='deckSources';
const FRAME_STORE='deckFrames';
const META_STORE='deckMeta';
const MAX_FRAMES=300;
const MAX_BYTES=60*1024*1024;
const deckCard=document.getElementById('deckCard');
const deckStatus=document.getElementById('deckStatus');
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
if(!deckCard||!deckDrawBtn||!deckAddBtn||!deckManage||!deckSources)return;

let processing=false;

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
async function stats(){
  const [sources,frames]=await Promise.all([getAll(SOURCE_STORE),getAll(FRAME_STORE)]);
  const bytes=frames.reduce((s,f)=>s+(f.imageSize||approxDataUrlBytes(f.imageData)),0);
  return {sources,frames,count:frames.length,bytes};
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
  deckStatus.textContent=s.count
    ? s.sources.length+'本の動画から '+s.count+'個の一瞬を保存しています。'
    : 'まだ思い出デッキはありません。動画を追加すると、次回からすぐにおみくじを引けます。';
  deckDrawBtn.disabled=!s.count||processing;
  deckStorage.textContent=await storageText(s.bytes);
  deckSources.innerHTML='';
  if(!s.sources.length){
    deckSources.innerHTML='<div class="note">追加した動画はここに表示されます。</div>';
  }else{
    const counts=new Map();
    s.frames.forEach(f=>counts.set(f.sourceVideoId,(counts.get(f.sourceVideoId)||0)+1));
    s.sources.sort((a,b)=>(b.addedAt||0)-(a.addedAt||0)).forEach(src=>{
      const row=document.createElement('div');
      row.className='deckSourceRow';
      const main=document.createElement('div');
      main.className='deckSourceMain';
      const name=document.createElement('strong');
      name.textContent=src.fileName||'動画';
      const meta=document.createElement('span');
      meta.textContent=(counts.get(src.id)||0)+'個の一瞬 ・ '+new Date(src.addedAt||Date.now()).toLocaleDateString('ja-JP');
      main.append(name,meta);
      const del=document.createElement('button');
      del.className='danger';
      del.type='button';
      del.textContent='この動画分を削除';
      del.onclick=async()=>{
        if(!confirm('「'+(src.fileName||'この動画')+'」から作った一瞬をデッキから削除しますか？'))return;
        await deleteSource(src.id);
        await renderDeck();
      };
      row.append(main,del);
      deckSources.appendChild(row);
    });
  }
}
async function deleteSource(sourceId){
  const db=await openDB();
  await new Promise((res,rej)=>{
    const tx=db.transaction([SOURCE_STORE,FRAME_STORE],'readwrite');
    tx.objectStore(SOURCE_STORE).delete(sourceId);
    const idx=tx.objectStore(FRAME_STORE).index('sourceVideoId');
    const req=idx.openCursor(IDBKeyRange.only(sourceId));
    req.onsuccess=()=>{const cur=req.result;if(cur){cur.delete();cur.continue();}};
    tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error);
  });
  const state=await metaGet('drawState');
  if(state){
    state.remainingIds=(state.remainingIds||[]).filter(id=>!id.startsWith(sourceId+'-'));
    state.universeIds=(state.universeIds||[]).filter(id=>!id.startsWith(sourceId+'-'));
    await metaPut('drawState',state);
  }
}
async function sourceExists(fingerprint){
  const all=await getAll(SOURCE_STORE);
  return all.some(x=>x.fingerprint===fingerprint);
}
async function saveSourceAndFrames(source,frames){
  const db=await openDB();
  return new Promise((res,rej)=>{
    const tx=db.transaction([SOURCE_STORE,FRAME_STORE],'readwrite');
    tx.objectStore(SOURCE_STORE).put(source);
    const fs=tx.objectStore(FRAME_STORE);
    frames.forEach(x=>fs.put(x));
    tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error);
  });
}
async function extractOne(file,overallIndex,total){
  await waitUntilVisible();
  progressText.textContent='動画 '+overallIndex+' / '+total+' を読み込んでいます…';
  await loadVideo(file);
  setupCanvas();
  const duration=video.duration;
  const fingerprint=hashString([file.name,file.size,file.lastModified,Math.round(duration*1000)].join('|'));
  if(await sourceExists(fingerprint))return {duplicate:true,name:file.name,count:0};
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
  let bytes=before.bytes;
  for(let i=0;i<picked.length;i++){
    const p=picked[i],imageSize=approxDataUrlBytes(p.dataUrl);
    if(bytes+imageSize>MAX_BYTES)break;
    const d=details[i]||{};
    frames.push({
      id:sourceId+'-'+String(i).padStart(3,'0'),sourceVideoId:sourceId,timestamp:p.time,
      imageData:p.dataUrl,width:captureCanvas.width,height:captureCanvas.height,imageSize,createdAt:Date.now(),
      clarity:d.clarityScore??null,rarity:d.rarityScore??null,change:d.changeScore??null,featureScore:d.score??null
    });
    bytes+=imageSize;
  }
  if(!frames.length)throw new Error('デッキの保存容量が上限に達しています');
  source.candidateCount=frames.length;
  await saveSourceAndFrames(source,frames);
  return {duplicate:false,name:file.name,count:frames.length};
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
  try{
    for(let i=0;i<files.length;i++){
      try{
        const r=await extractOne(files[i],i+1,files.length);
        if(r.duplicate)duplicates++;else added+=r.count;
      }catch(e){
        failed++;
        errors.push(files[i].name+': '+(e?.message||e));
      }
    }
    await requestPersistence();
    progressBar.style.width='100%';
    let msg=added+'個の一瞬を思い出デッキに追加しました。';
    if(duplicates)msg+=' '+duplicates+'本は追加済みのためスキップしました。';
    if(failed)msg+=' '+failed+'本は処理できませんでした。';
    progressText.textContent=msg;
    deckNotice.textContent=errors.length?errors.join(' / '):msg;
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
async function buildDeckCreation(){
  const [frames,sources]=await Promise.all([getAll(FRAME_STORE),getAll(SOURCE_STORE)]);
  if(!frames.length)return null;
  const sourceNames=new Map(sources.map(x=>[x.id,x.fileName||'動画']));
  const ids=frames.map(x=>x.id);
  const drawState=await preparedDrawState(ids);
  const mode=modeName();
  return {
    id:'deck-'+Date.now(),
    title:'思い出おみくじデッキ',
    createdAt:Date.now(),updatedAt:Date.now(),sourceKey:null,mode,deckMode:true,
    frames:frames.map(x=>x.imageData),
    fortunes:mode==='omikuji'?frames.map(()=>drawFortune()):[],
    times:frames.map(x=>x.timestamp),
    appeal:frames.map(x=>({score:x.featureScore,clarityScore:x.clarity,rarityScore:x.rarity,changeScore:x.change})),
    deckCandidateIds:ids,
    deckSourceIds:frames.map(x=>x.sourceVideoId),
    deckSourceNames:frames.map(x=>sourceNames.get(x.sourceVideoId)||'動画'),
    deckDrawState:drawState
  };
}
deckDrawBtn.addEventListener('click',async()=>{
  if(processing)return;
  const creation=await buildDeckCreation();
  if(!creation)return;
  unlockAudio();
  currentCreation=null;
  preparePlay(creation);
});
deckAddBtn.addEventListener('click',()=>fileInput.click());
deckManageBtn.addEventListener('click',()=>{
  deckManage.hidden=!deckManage.hidden;
  deckManageBtn.textContent=deckManage.hidden?'デッキを管理':'管理を閉じる';
});
async function backupDeck(){
  const [sources,frames,drawState]=await Promise.all([getAll(SOURCE_STORE),getAll(FRAME_STORE),metaGet('drawState')]);
  if(!frames.length){alert('バックアップする思い出デッキがありません。');return;}
  const payload={format:'memory-moments-roulette-deck',version:1,exportedAt:new Date().toISOString(),sources,frames,drawState};
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
  const db=await openDB();
  await new Promise((res,rej)=>{
    const tx=db.transaction([SOURCE_STORE,FRAME_STORE],'readwrite');
    const ss=tx.objectStore(SOURCE_STORE),fs=tx.objectStore(FRAME_STORE);
    for(const src of payload.sources){
      if(existingFp.has(src.fingerprint))continue;
      const candidates=payload.frames.filter(x=>x.sourceVideoId===src.id);
      const accepted=[];
      for(const fr of candidates){
        const b=fr.imageSize||approxDataUrlBytes(fr.imageData);
        if(count>=MAX_FRAMES||bytes+b>MAX_BYTES)break;
        accepted.push({...fr,imageSize:b});count++;bytes+=b;added++;
      }
      if(accepted.length){
        ss.put({...src,candidateCount:accepted.length});
        accepted.forEach(x=>fs.put(x));
      }
    }
    tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error);
  });
  await metaPut('drawState',{universeIds:[],remainingIds:[],cycle:1});
  await requestPersistence();
  await renderDeck();
  deckNotice.textContent=added+'個の一瞬をバックアップから復元しました。';
  deckNotice.className='note deckNotice ok';
}
deckClearBtn?.addEventListener('click',async()=>{
  if(!confirm('思い出おみくじデッキをすべて削除しますか？ 今日の一枚や従来の保存ルーレットは削除しません。'))return;
  const db=await openDB();
  await new Promise((res,rej)=>{
    const tx=db.transaction([SOURCE_STORE,FRAME_STORE,META_STORE],'readwrite');
    tx.objectStore(SOURCE_STORE).clear();
    tx.objectStore(FRAME_STORE).clear();
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