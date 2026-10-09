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
const deckSearch=document.getElementById('deckSearch');
const deckSort=document.getElementById('deckSort');
const deckSelectionStatus=document.getElementById('deckSelectionStatus');
const deckSelectAllBtn=document.getElementById('deckSelectAllBtn');
const deckClearSelectionBtn=document.getElementById('deckClearSelectionBtn');
const deckLibraryManageBtn=document.getElementById('deckLibraryManageBtn');
const deckLibraryManageNote=document.getElementById('deckLibraryManageNote');
const homeSavedVideoCount=document.getElementById('homeSavedVideoCount');
if(!deckCard||!deckDrawBtn||!deckPicker)return;

let processing=false;
let libraryManageMode=false;
const selectedSourceIds=new Set();
const thumbnailJobs=new Map();
const thumbnailTargets=new WeakMap();
const thumbnailObserver=typeof IntersectionObserver!=='undefined'
  ? new IntersectionObserver(entries=>{
      for(const entry of entries){
        if(!entry.isIntersecting)continue;
        const src=thumbnailTargets.get(entry.target);
        thumbnailObserver.unobserve(entry.target);
        if(src)ensureSourceThumbnail(src,entry.target);
      }
    },{rootMargin:'320px 0px'})
  : null;
let selectionLoaded=false;
let lastDeckSources=[];
let backgroundQueue=Promise.resolve();
const queuedSourceIds=new Set();
const opfsWriteJobs=new Map();
const OPFS_PREFIX='memory-moments-source-';

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
function sourceMomentDate(src){
  const t=Number(src?.addedAt)||Number(src?.lastModified)||Date.now();
  return new Date(t);
}
function sourceDisplayName(src){
  const d=sourceMomentDate(src);
  const md=(d.getMonth()+1)+'/'+d.getDate();
  const hm=d.toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit'});
  return md+' '+hm;
}
function sourceDisplayTime(src){
  return sourceDisplayName(src);
}
function sourceSearchText(src){
  const d=sourceMomentDate(src);
  return [
    src?.fileName||'',
    sourceDisplayName(src),
    (d.getMonth()+1)+'/'+d.getDate(),
    d.getFullYear()+'/'+(d.getMonth()+1)+'/'+d.getDate(),
    sourceDisplayTime(src)
  ].join(' ').toLowerCase();
}
function sourceMonthKey(src){
  const d=sourceMomentDate(src);
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
}
function sourceMonthLabel(src){
  const d=sourceMomentDate(src);
  return d.getFullYear()+'年'+(d.getMonth()+1)+'月';
}
function formatDuration(seconds){
  const s=Math.max(0,Math.round(Number(seconds)||0));
  const m=Math.floor(s/60),r=s%60;
  return m+':'+String(r).padStart(2,'0');
}
async function firstFrameForSource(sourceId){
  const db=await openDB();
  return new Promise((res,rej)=>{
    const idx=db.transaction(FRAME_STORE,'readonly').objectStore(FRAME_STORE).index('sourceVideoId');
    const r=idx.openCursor(IDBKeyRange.only(sourceId));
    r.onsuccess=()=>res(r.result?.value||null);
    r.onerror=()=>rej(r.error);
  });
}
async function makeSourceThumbnail(dataUrl){
  if(!dataUrl)return null;
  const img=await new Promise((res,rej)=>{
    const x=new Image();x.onload=()=>res(x);x.onerror=()=>rej(new Error('thumbnail image error'));x.src=dataUrl;
  });
  const maxEdge=320;
  const scale=Math.min(1,maxEdge/Math.max(img.naturalWidth||1,img.naturalHeight||1));
  const canvas=document.createElement('canvas');
  canvas.width=Math.max(2,Math.round((img.naturalWidth||1)*scale));
  canvas.height=Math.max(2,Math.round((img.naturalHeight||1)*scale));
  const cx=canvas.getContext('2d');
  cx.drawImage(img,0,0,canvas.width,canvas.height);
  let out=canvas.toDataURL('image/webp',.68);
  if(!out.startsWith('data:image/webp'))out=canvas.toDataURL('image/jpeg',.68);
  return {dataUrl:out,size:approxDataUrlBytes(out),width:canvas.width,height:canvas.height};
}
async function ensureSourceThumbnail(src,img){
  if(src.thumbnailData){img.src=src.thumbnailData;return;}
  let job=thumbnailJobs.get(src.id);
  if(!job){
    job=(async()=>{
      const first=await firstFrameForSource(src.id);
      if(!first?.imageData)return null;
      const thumb=await makeSourceThumbnail(first.imageData);
      if(!thumb)return null;
      src.thumbnailData=thumb.dataUrl;
      src.thumbnailSize=thumb.size;
      src.thumbnailWidth=thumb.width;
      src.thumbnailHeight=thumb.height;
      src.storageBytes=(Number(src.storageBytes)||0)+thumb.size;
      const db=await openDB();
      await new Promise((res,rej)=>{
        const tx=db.transaction(SOURCE_STORE,'readwrite');
        tx.objectStore(SOURCE_STORE).put(src);
        tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error);
      });
      return thumb.dataUrl;
    })().finally(()=>thumbnailJobs.delete(src.id));
    thumbnailJobs.set(src.id,job);
  }
  try{
    const data=await job;
    if(data&&img.isConnected)img.src=data;
  }catch(e){}
}
function loadSourceThumbnail(src,img){
  if(src.thumbnailData){img.src=src.thumbnailData;return;}
  if(thumbnailObserver){
    thumbnailTargets.set(img,src);
    thumbnailObserver.observe(img);
  }else{
    ensureSourceThumbnail(src,img);
  }
}
async function loadSelectedSources(sources){
  const valid=new Set(sources.map(s=>s.id));
  if(selectionLoaded){
    for(const id of [...selectedSourceIds])if(!valid.has(id))selectedSourceIds.delete(id);
    return;
  }
  selectionLoaded=true;
  const saved=await metaGet('selectedSourceIds');
  if(Array.isArray(saved)){
    saved.filter(id=>valid.has(id)).forEach(id=>selectedSourceIds.add(id));
  }else{
    selectedSourceIds.clear();
  }
}
async function saveSelectedSources(){
  await metaPut('selectedSourceIds',[...selectedSourceIds]);
}
function updateSelectionStatus(sources){
  const list=Array.isArray(sources)?sources:[];
  const n=list.filter(s=>selectedSourceIds.has(s.id)).length;
  const momentCount=list.reduce((total,s)=>total+(Number(s.candidateCount)||0),0);
  if(deckStatus){
    deckStatus.textContent=list.length
      ? list.length+'本の動画から '+momentCount+'個の一瞬を保存しています。'+(n?' 現在 '+n+'本を選択中です。':' ルーレットに使う動画を選んでください。')
      : 'まだ保存した動画はありません。上の「新しい動画からルーレットを作る」から追加してください。';
  }
  if(deckSelectionStatus){
    deckSelectionStatus.textContent=!list.length
      ? '動画がありません'
      : n===0
        ? '動画が選択されていません'
        : n===list.length
          ? 'すべての'+n+'本を選択中'
          : n+' / '+list.length+'本を選択中';
  }
  if(homeSavedVideoCount)homeSavedVideoCount.textContent=list.length?list.length+'本の保存済み動画から選ぶ':'まだ保存した動画はありません';
  deckDrawBtn.disabled=!n||processing;
  deckDrawBtn.textContent=n>0&&n<list.length?'🎴 選んだ'+n+'本でおみくじを引く':'🎴 選んだ動画でおみくじを引く';
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
    const totalBytes=x.bytes+(Number(src.thumbnailSize)||0);
    if(src.candidateCount!==x.count||src.storageBytes!==totalBytes){
      src.candidateCount=x.count;src.storageBytes=totalBytes;
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
  const appLine='保存済み動画データ：'+formatBytes(localBytes);
  if(!navigator.storage?.estimate)return appLine;
  try{
    const e=await navigator.storage.estimate();
    const usage=Number(e.usage)||0,quota=Number(e.quota)||0;
    const persistent=navigator.storage.persisted?await navigator.storage.persisted():false;
    const browserLine=quota
      ? 'ブラウザ保存領域（参考）：'+formatBytes(usage)+' 使用 / 上限 約'+formatBytes(quota)
      : '';
    const protectionLine='保存保護：'+(persistent?'有効':'通常');
    return [appLine,browserLine,protectionLine].filter(Boolean).join('\n');
  }catch(e){return appLine;}
}
function filteredSortedSources(sources){
  const q=(deckSearch?.value||'').trim().toLowerCase();
  const newest=(deckSort?.value||'newest')!=='oldest';
  return sources
    .filter(src=>!q||sourceSearchText(src).includes(q))
    .sort((a,b)=>{
      const d=sourceMomentDate(a)-sourceMomentDate(b);
      return newest?-d:d;
    });
}
function makeSourceTile(src,{selectable=false,manageable=false}={}){
  const card=document.createElement('article');
  card.className='deckVideoTile'+(selectedSourceIds.has(src.id)?' selected':'');
  card.dataset.sourceId=src.id;

  const choose=document.createElement('button');
  choose.type='button';
  choose.className='deckVideoPick';
  choose.setAttribute('aria-pressed',selectedSourceIds.has(src.id)?'true':'false');
  const displayName=sourceDisplayName(src);
  choose.setAttribute('aria-label',displayName+(selectedSourceIds.has(src.id)?' 選択済み':' 選択する'));

  const media=document.createElement('div');
  media.className='deckVideoThumb';
  const img=document.createElement('img');
  img.alt='';
  if(src.thumbnailData)img.src=src.thumbnailData;
  else ensureSourceThumbnail(src,img);
  const play=document.createElement('span');
  play.className='deckVideoIcon';
  play.textContent='▶';
  const check=document.createElement('span');
  check.className='deckVideoCheck';
  check.textContent='✓';
  const duration=document.createElement('span');
  duration.className='deckVideoDuration';
  duration.textContent=formatDuration(src.duration);
  media.append(img,play,check,duration);

  const info=document.createElement('div');
  info.className='deckVideoInfo';
  const name=document.createElement('strong');
  name.textContent=displayName;
  const meta=document.createElement('small');
  const pendingCount=Math.max(Number(src.imagePending)||0,Number(src.replayPending)||0);
  const finishState=pendingCount
    ? (src.resumeNeedsFile?' ・ 仕上げ未完了（同じ動画を選ぶと再開）':' ・ 仕上げ中')
    : '';
  meta.textContent=(Number(src.candidateCount)||0)+'個の一瞬 ・ '+formatDuration(src.duration)+finishState;
  info.append(name,meta);
  choose.append(media,info);

  if(selectable){
    choose.onclick=async()=>{
      if(selectedSourceIds.has(src.id))selectedSourceIds.delete(src.id);
      else selectedSourceIds.add(src.id);
      await saveSelectedSources();
      updateSelectionStatus(lastDeckSources);
      renderSourceLibraries();
    };
  }else{
    choose.disabled=true;
    choose.setAttribute('aria-disabled','true');
  }
  card.appendChild(choose);

  if(manageable){
    const del=document.createElement('button');
    del.type='button';
    del.className='deckVideoDelete';
    del.setAttribute('aria-label',displayName+'を保存済み動画から削除');
    del.textContent='×';
    del.onclick=async e=>{
      e.preventDefault();e.stopPropagation();
      if(!confirm('「'+displayName+'」を保存済み動画から削除しますか？'))return;
      await deleteSource(src.id);
      await renderDeck();
    };
    card.appendChild(del);
  }
  return card;
}
function renderGroupedLibrary(container,sources,options){
  container.innerHTML='';
  const visible=filteredSortedSources(sources);
  if(!visible.length){
    container.innerHTML='<div class="note">'+(sources.length?'検索条件に合う動画がありません。':'追加した動画がここに並びます。')+'</div>';
    return;
  }
  let currentKey=null,grid=null;
  for(const src of visible){
    const key=sourceMonthKey(src);
    if(key!==currentKey){
      currentKey=key;
      const section=document.createElement('section');
      section.className='deckMonthGroup';
      const head=document.createElement('div');
      head.className='deckMonthHead';
      const title=document.createElement('strong');
      title.textContent=sourceMonthLabel(src);
      const count=document.createElement('span');
      count.textContent=visible.filter(x=>sourceMonthKey(x)===key).length+'本';
      head.append(title,count);
      grid=document.createElement('div');
      grid.className='deckVideoGrid';
      section.append(head,grid);
      container.appendChild(section);
    }
    grid.appendChild(makeSourceTile(src,options));
  }
}
function renderSourceLibraries(){
  renderGroupedLibrary(deckPicker,lastDeckSources,{selectable:!libraryManageMode,manageable:libraryManageMode});
  if(deckSources)renderGroupedLibrary(deckSources,lastDeckSources,{selectable:false,manageable:true});
}
function syncLibraryManageMode(){
  deckCard.classList.toggle('manage-mode',libraryManageMode);
  if(deckLibraryManageBtn)deckLibraryManageBtn.textContent=libraryManageMode?'管理を終了':'動画を管理';
  if(deckLibraryManageNote)deckLibraryManageNote.textContent=libraryManageMode
    ? '削除したい動画の × を押してください。ルーレット用の選択は一時停止しています。'
    : 'タップして今回使う動画を選びます。';
  renderSourceLibraries();
}
async function renderDeck(){
  const s=await stats();
  lastDeckSources=s.sources;
  await loadSelectedSources(s.sources);
  const validIds=new Set(s.sources.map(x=>x.id));
  for(const id of [...selectedSourceIds])if(!validIds.has(id))selectedSourceIds.delete(id);
  updateSelectionStatus(s.sources);
  if(deckStorage)deckStorage.textContent=await storageText(s.bytes);
  renderSourceLibraries();
}
async function deleteSource(sourceId){
  selectedSourceIds.delete(sourceId);
  queuedSourceIds.delete(sourceId);
  await removeOpfsForSource(sourceId);
  await saveSelectedSources();
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


async function updateSourceRecord(sourceId,patch){
  const db=await openDB();
  return new Promise((res,rej)=>{
    const tx=db.transaction(SOURCE_STORE,'readwrite');
    const store=tx.objectStore(SOURCE_STORE);
    const req=store.get(sourceId);
    req.onsuccess=()=>{
      const src=req.result;
      if(src)store.put({...src,...patch});
    };
    tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error);
  });
}
function opfsFileName(sourceId){
  return OPFS_PREFIX+sourceId+'.video';
}
async function opfsRoot(){
  if(!navigator.storage?.getDirectory)return null;
  try{return await navigator.storage.getDirectory();}catch(e){return null;}
}
async function removeOpfsFileByName(name){
  if(!name)return;
  const root=await opfsRoot();
  if(!root)return;
  try{await root.removeEntry(name);}catch(e){}
}
async function removeOpfsForSource(sourceId){
  await removeOpfsFileByName(opfsFileName(sourceId));
}
async function getOpfsResumeFile(src){
  const root=await opfsRoot();
  if(!root||!src?.id)return null;
  const name=src.opfsName||opfsFileName(src.id);
  try{
    const handle=await root.getFileHandle(name);
    const file=await handle.getFile();
    if(Number(src.fileSize)>0&&file.size!==Number(src.fileSize)){
      await removeOpfsFileByName(name);
      return null;
    }
    if(!file.size)return null;
    return file;
  }catch(e){return null;}
}
async function cleanupSourceOpfsIfComplete(sourceId){
  if(opfsWriteJobs.has(sourceId))return;
  const frames=await framesForSource(sourceId);
  if(!frames.length)return;
  const pending=frames.some(x=>x.imagePending||!(Number(x.replayFrameCount)>=2&&Number(x.replaySize)>0));
  if(pending)return;
  await removeOpfsForSource(sourceId);
  await updateSourceRecord(sourceId,{opfsReady:false,opfsComplete:true,resumeNeedsFile:false,backgroundCompletedAt:Date.now()});
}
function persistSourceFileForResume(file,sourceId){
  if(!file||!sourceId)return Promise.resolve(false);
  if(opfsWriteJobs.has(sourceId))return opfsWriteJobs.get(sourceId);
  const job=(async()=>{
    const root=await opfsRoot();
    if(!root){
      await updateSourceRecord(sourceId,{opfsReady:false,resumeNeedsFile:true});
      return false;
    }
    const name=opfsFileName(sourceId);
    try{
      await updateSourceRecord(sourceId,{opfsName:name,opfsReady:false,resumeNeedsFile:false,opfsWriting:true});
      const handle=await root.getFileHandle(name,{create:true});
      const writable=await handle.createWritable();
      await writable.write(file);
      await writable.close();
      const saved=await handle.getFile();
      if(Number(file.size)>0&&saved.size!==Number(file.size))throw new Error('temporary video size mismatch');
      await updateSourceRecord(sourceId,{
        opfsName:name,opfsReady:true,opfsWriting:false,resumeNeedsFile:false,
        opfsSize:saved.size,opfsSavedAt:Date.now()
      });
      await cleanupSourceOpfsIfComplete(sourceId);
      return true;
    }catch(err){
      console.warn('temporary source save failed',err);
      await updateSourceRecord(sourceId,{opfsReady:false,opfsWriting:false,resumeNeedsFile:true});
      return false;
    }
  })().finally(()=>opfsWriteJobs.delete(sourceId));
  opfsWriteJobs.set(sourceId,job);
  return job;
}
async function clearOpfsSourceFiles(){
  const root=await opfsRoot();
  if(!root)return;
  try{
    for await(const [name] of root.entries()){
      if(name.startsWith(OPFS_PREFIX)){
        try{await root.removeEntry(name);}catch(e){}
      }
    }
  }catch(e){}
}
function pendingTargetsFromFrames(frames){
  return (frames||[]).map(x=>({
    id:x.id,time:x.timestamp,imageSize:Number(x.imageSize)||0,
    needImage:!!x.imagePending,
    needReplay:!(Number(x.replayFrameCount)>=2&&Number(x.replaySize)>0)
  })).filter(x=>x.needImage||x.needReplay);
}
async function resumePendingBackgroundWork(){
  const sources=await getAll(SOURCE_STORE);
  const knownIds=new Set(sources.map(x=>x.id));
  const root=await opfsRoot();
  if(root){
    try{
      for await(const [name] of root.entries()){
        if(!name.startsWith(OPFS_PREFIX))continue;
        const sourceId=name.slice(OPFS_PREFIX.length,-'.video'.length);
        if(!knownIds.has(sourceId)){
          try{await root.removeEntry(name);}catch(e){}
        }
      }
    }catch(e){}
  }
  const jobs=[];
  for(const src of sources){
    if(opfsWriteJobs.has(src.id))continue;
    const frames=await framesForSource(src.id);
    const targets=pendingTargetsFromFrames(frames);
    if(!targets.length){
      await cleanupSourceOpfsIfComplete(src.id);
      continue;
    }
    const imageReadyCount=frames.filter(x=>!x.imagePending).length;
    const replayReadyCount=frames.filter(x=>Number(x.replayFrameCount)>=2&&Number(x.replaySize)>0).length;
    const file=await getOpfsResumeFile(src);
    if(file){
      await updateSourceRecord(src.id,{
        opfsReady:true,resumeNeedsFile:false,opfsWriting:false,
        imageReadyCount,imagePending:Math.max(0,frames.length-imageReadyCount),
        replayReadyCount,replayPending:Math.max(0,frames.length-replayReadyCount)
      });
      jobs.push({file,sourceId:src.id,targets,resumed:true});
    }else{
      await updateSourceRecord(src.id,{
        opfsReady:false,opfsWriting:false,resumeNeedsFile:true,
        imageReadyCount,imagePending:Math.max(0,frames.length-imageReadyCount),
        replayReadyCount,replayPending:Math.max(0,frames.length-replayReadyCount)
      });
    }
  }
  enqueueBackgroundJobs(jobs);
  renderDeck().catch(()=>{});
}

function replayTiming(targetTime,duration){
  const d=Math.max(.05,Number(duration)||0);
  const target=Math.max(0,Math.min(d-.04,Number(targetTime)||0));
  const reverse=target<EARLY_REPLAY_SECONDS;
  const start=reverse?target:Math.max(0,target-REPLAY_SECONDS);
  const end=reverse?Math.min(d-.04,target+REPLAY_SECONDS):target;
  return {target,start,end,span:Math.max(.04,end-start),mode:reverse?'reverse':'forward'};
}
function waitForMediaEvent(el,name,timeout=10000){
  if(name==='loadedmetadata'&&el.readyState>=1)return Promise.resolve();
  return new Promise((resolve,reject)=>{
    const done=()=>{cleanup();resolve();};
    const fail=()=>{cleanup();reject(new Error('background video '+name+' failed'));};
    const timer=setTimeout(()=>{cleanup();reject(new Error('background video '+name+' timeout'));},timeout);
    const cleanup=()=>{clearTimeout(timer);el.removeEventListener(name,done);el.removeEventListener('error',fail);};
    el.addEventListener(name,done,{once:true});
    el.addEventListener('error',fail,{once:true});
  });
}
async function backgroundSeekTo(v,time){
  const safe=Math.max(0,Math.min((Number(v.duration)||.05)-.04,Number(time)||0));
  if(Math.abs((Number(v.currentTime)||0)-safe)>.02){
    v.currentTime=safe;
    try{await waitForMediaEvent(v,'seeked',6000);}catch(e){}
  }
  await new Promise(r=>setTimeout(r,24));
}
async function captureDeckImageBackground(v,canvas,cx,time){
  await backgroundSeekTo(v,time);
  const maxEdge=1280;
  const vw=Math.max(1,v.videoWidth||1),vh=Math.max(1,v.videoHeight||1);
  const scale=Math.min(1,maxEdge/Math.max(vw,vh));
  canvas.width=Math.max(2,Math.round(vw*scale));
  canvas.height=Math.max(2,Math.round(vh*scale));
  cx.drawImage(v,0,0,canvas.width,canvas.height);
  let dataUrl=canvas.toDataURL('image/webp',.82);
  if(!dataUrl.startsWith('data:image/webp'))dataUrl=canvas.toDataURL('image/jpeg',.82);
  return {dataUrl,width:canvas.width,height:canvas.height,size:approxDataUrlBytes(dataUrl)};
}
async function captureReplayBurstBackground(v,canvas,cx,targetTime){
  const timing=replayTiming(targetTime,v.duration);
  const vw=Math.max(1,v.videoWidth||1),vh=Math.max(1,v.videoHeight||1);
  const scale=Math.min(1,REPLAY_EDGE/Math.max(vw,vh));
  canvas.width=Math.max(2,Math.round(vw*scale));
  canvas.height=Math.max(2,Math.round(vh*scale));
  const frames=[];
  let bytes=0;
  for(let i=0;i<REPLAY_FRAME_COUNT;i++){
    const p=REPLAY_FRAME_COUNT===1?0:i/(REPLAY_FRAME_COUNT-1);
    await backgroundSeekTo(v,timing.start+timing.span*p);
    cx.drawImage(v,0,0,canvas.width,canvas.height);
    let dataUrl=canvas.toDataURL('image/webp',REPLAY_QUALITY);
    if(!dataUrl.startsWith('data:image/webp'))dataUrl=canvas.toDataURL('image/jpeg',REPLAY_QUALITY);
    frames.push(dataUrl);
    bytes+=approxDataUrlBytes(dataUrl);
  }
  if(timing.mode==='reverse')frames.reverse();
  return {frames,mode:timing.mode,span:timing.span,bytes,width:canvas.width,height:canvas.height,count:frames.length};
}
async function storeBackgroundImage(frameId,stored){
  const db=await openDB();
  let frameFound=false;
  await new Promise((res,rej)=>{
    const tx=db.transaction(FRAME_STORE,'readwrite');
    const fs=tx.objectStore(FRAME_STORE);
    const req=fs.get(frameId);
    req.onsuccess=()=>{
      const fr=req.result;
      if(!fr)return;
      frameFound=true;
      fs.put({...fr,
        imageData:stored.dataUrl,width:stored.width,height:stored.height,
        imageSize:stored.size,imagePending:false
      });
    };
    tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error);
  });
  if(!frameFound)return false;
  const ids=activeCreation?.deckCandidateIds||[];
  for(let i=0;i<ids.length;i++){
    if(ids[i]!==frameId||!activeCreation?.frames)continue;
    activeCreation.frames[i]=stored.dataUrl;
    if(typeof currentIndex!=='undefined'&&currentIndex===i&&typeof running!=='undefined'&&!running&&playImage){
      playImage.src=stored.dataUrl;
    }
  }
  return true;
}
async function storeBackgroundReplay(sourceId,frameId,replay){
  const db=await openDB();
  let frameFound=false;
  await new Promise((res,rej)=>{
    const tx=db.transaction([FRAME_STORE,REPLAY_STORE],'readwrite');
    const fs=tx.objectStore(FRAME_STORE),rs=tx.objectStore(REPLAY_STORE);
    const req=fs.get(frameId);
    req.onsuccess=()=>{
      const fr=req.result;
      if(!fr)return;
      frameFound=true;
      fs.put({...fr,
        replayMode:replay.mode,replaySpan:replay.span,replaySize:replay.bytes,
        replayWidth:replay.width,replayHeight:replay.height,replayFrameCount:replay.count,
        replayQuality:REPLAY_QUALITY,replayEdge:REPLAY_EDGE,replayPending:false
      });
      rs.put({
        id:frameId,frames:replay.frames,mode:replay.mode,span:replay.span,
        width:replay.width,height:replay.height,frameCount:replay.count,
        quality:REPLAY_QUALITY,edge:REPLAY_EDGE,size:replay.bytes,createdAt:Date.now()
      });
    };
    tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error);
  });
  if(!frameFound)return false;
  const ids=activeCreation?.deckCandidateIds||[];
  for(let i=0;i<ids.length;i++){
    if(ids[i]!==frameId)continue;
    if(activeCreation.deckReplayModes)activeCreation.deckReplayModes[i]=replay.mode;
    if(activeCreation.deckReplaySpans)activeCreation.deckReplaySpans[i]=replay.span;
  }
  return true;
}
async function refreshSourceStorage(sourceId){
  const [frames,sources]=await Promise.all([framesForSource(sourceId),getAll(SOURCE_STORE)]);
  const src=sources.find(x=>x.id===sourceId);
  if(!src)return;
  const imageReadyCount=frames.filter(x=>!x.imagePending).length;
  const replayReadyCount=frames.filter(x=>Number(x.replayFrameCount)>=2&&Number(x.replaySize)>0).length;
  await updateSourceRecord(sourceId,{
    storageBytes:frames.reduce((n,x)=>n+(Number(x.imageSize)||0)+(Number(x.replaySize)||0),0)+(Number(src.thumbnailSize)||0),
    imageReadyCount,imagePending:Math.max(0,frames.length-imageReadyCount),
    replayReadyCount,replayPending:Math.max(0,frames.length-replayReadyCount)
  });
}
async function runBackgroundMediaJob(job){
  if(!job?.file||!job.targets?.length)return;
  const v=document.createElement('video');
  v.muted=true;v.playsInline=true;v.preload='metadata';
  const canvas=document.createElement('canvas');
  const cx=canvas.getContext('2d');
  const url=URL.createObjectURL(job.file);
  try{
    v.src=url;v.load();
    await waitForMediaEvent(v,'loadedmetadata',10000);
    let currentBytes=(await stats()).bytes;
    const byteLimit=await effectiveByteLimit(currentBytes);
    for(const target of job.targets){
      if(!document.hidden&&typeof requestIdleCallback==='function'){
        await new Promise(r=>requestIdleCallback(()=>r(),{timeout:180}));
      }
      if(target.needImage){
        const stored=await captureDeckImageBackground(v,canvas,cx,target.time);
        const oldSize=Number(target.imageSize)||0;
        const delta=Math.max(0,stored.size-oldSize);
        if(currentBytes+delta<=byteLimit){
          const saved=await storeBackgroundImage(target.id,stored);
          if(saved){currentBytes+=delta;target.imageSize=stored.size;target.needImage=false;}
        }
      }
      if(target.needReplay){
        const replay=await captureReplayBurstBackground(v,canvas,cx,target.time);
        if(currentBytes+replay.bytes<=byteLimit){
          const saved=await storeBackgroundReplay(job.sourceId,target.id,replay);
          if(saved){currentBytes+=replay.bytes;target.needReplay=false;}
        }
      }
    }
    await refreshSourceStorage(job.sourceId);
    await cleanupSourceOpfsIfComplete(job.sourceId);
    const activeIds=new Set(activeCreation?.deckCandidateIds||[]);
    if(activeCreation?.id&&job.targets.some(x=>activeIds.has(x.id))){
      try{
        const alreadySaved=typeof dbGet==='function'?await dbGet(activeCreation.id):null;
        if(alreadySaved&&typeof persistCreation==='function')await persistCreation(activeCreation);
      }catch(e){console.warn('background roulette history refresh failed',e);}
    }
  }catch(err){
    console.warn('background media save failed',err);
  }finally{
    await refreshSourceStorage(job.sourceId).catch(()=>{});
    await cleanupSourceOpfsIfComplete(job.sourceId).catch(()=>{});
    try{v.pause();v.removeAttribute('src');v.load();}catch(e){}
    URL.revokeObjectURL(url);
  }
}
function enqueueBackgroundJobs(jobs){
  const pending=(jobs||[]).filter(x=>x?.sourceId&&x?.targets?.some(t=>t.needImage||t.needReplay)&&!queuedSourceIds.has(x.sourceId));
  if(!pending.length)return;
  pending.forEach(x=>queuedSourceIds.add(x.sourceId));
  backgroundQueue=backgroundQueue.then(async()=>{
    for(const job of pending){
      try{await runBackgroundMediaJob(job);}
      finally{queuedSourceIds.delete(job.sourceId);}
    }
    await renderDeck().catch(()=>{});
  }).catch(err=>{
    pending.forEach(x=>queuedSourceIds.delete(x.sourceId));
    console.warn('background media queue failed',err);
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
    const own=await framesForSource(existing.id);
    const pending=pendingTargetsFromFrames(own);
    if(pending.length)persistSourceFileForResume(file,existing.id).catch(()=>{});
    return {
      duplicate:true,name:file.name,count:0,sourceId:existing.id,
      backgroundJob:pending.length?{file,sourceId:existing.id,targets:pending}:null
    };
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
    duration,addedAt:Date.now(),candidateCount:0,
    opfsName:opfsFileName(sourceId),opfsReady:false,opfsWriting:false,resumeNeedsFile:false
  };
  const frames=[];
  let bytes=before.bytes;
  const byteLimit=await effectiveByteLimit(before.bytes);
  const analysisWidth=Math.max(2,Number(captureCanvas.width)||2);
  const analysisHeight=Math.max(2,Number(captureCanvas.height)||2);
  for(let i=0;i<picked.length;i++){
    const p=picked[i];
    progressText.textContent='動画 '+overallIndex+' / '+total+' ・ ルーレットを準備しています '+(i+1)+' / '+picked.length;
    const imageData=p.dataUrl;
    const imageSize=approxDataUrlBytes(imageData);
    if(bytes+imageSize>byteLimit)break;
    const d=details[i]||{};
    const candidateId=sourceId+'-'+String(i).padStart(3,'0');
    const timing=replayTiming(p.time,duration);
    frames.push({
      id:candidateId,sourceVideoId:sourceId,timestamp:p.time,
      imageData,width:analysisWidth,height:analysisHeight,imageSize,createdAt:Date.now(),imagePending:true,
      replayMode:timing.mode,replaySpan:0,replaySize:0,
      replayWidth:0,replayHeight:0,replayFrameCount:0,
      replayQuality:REPLAY_QUALITY,replayEdge:REPLAY_EDGE,replayPending:true,
      clarity:d.clarityScore??null,rarity:d.rarityScore??null,change:d.changeScore??null,featureScore:d.score??null
    });
    bytes+=imageSize;
  }
  if(!frames.length)throw new Error('デッキの保存容量が上限に達しています');
  source.candidateCount=frames.length;
  const thumb=await makeSourceThumbnail(frames[0]?.imageData).catch(()=>null);
  if(thumb){
    source.thumbnailData=thumb.dataUrl;
    source.thumbnailSize=thumb.size;
    source.thumbnailWidth=thumb.width;
    source.thumbnailHeight=thumb.height;
  }
  source.storageBytes=frames.reduce((n,x)=>n+(Number(x.imageSize)||0),0)+(Number(source.thumbnailSize)||0);
  source.imagePending=frames.length;
  source.imageReadyCount=0;
  source.replayPending=frames.length;
  source.replayReadyCount=0;
  source.replaySpec={edge:REPLAY_EDGE,frames:REPLAY_FRAME_COUNT,quality:REPLAY_QUALITY,seconds:REPLAY_SECONDS};
  await saveSourceAndFrames(source,frames,[]);
  persistSourceFileForResume(file,sourceId).catch(()=>{});
  return {
    duplicate:false,name:file.name,count:frames.length,sourceId,
    backgroundJob:{
      file,sourceId,
      targets:frames.map(x=>({id:x.id,time:x.timestamp,imageSize:x.imageSize,needImage:true,needReplay:true}))
    }
  };
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
  const backgroundJobs=[];
  try{
    for(let i=0;i<files.length;i++){
      try{
        const r=await extractOne(files[i],i+1,files.length);
        if(r.sourceId)batchSourceIds.push(r.sourceId);
        if(r.backgroundJob)backgroundJobs.push(r.backgroundJob);
        if(r.duplicate)duplicates++;else added+=r.count;
      }catch(e){
        failed++;
        errors.push(files[i].name+': '+(e?.message||e));
      }
    }
    requestPersistence().catch(()=>{});
    if(batchSourceIds.length){
      selectedSourceIds.clear();
      batchSourceIds.forEach(id=>selectedSourceIds.add(id));
      selectionLoaded=true;
      await saveSelectedSources();
    }
    progressBar.style.width='100%';
    let msg=added+'個の一瞬を準備しました。ルーレットはすぐに始められます。';
    if(duplicates)msg+=' '+duplicates+'本は追加済みのためスキップしました。';
    if(failed)msg+=' '+failed+'本は処理できませんでした。';
    if(batchSourceIds.length)msg+=' 高解像度画像と奇跡リプレイはバックグラウンドで保存します。';
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
    if(batchSourceIds.length){
      const creation=await buildDeckCreation(batchSourceIds);
      if(creation){
        window.__memoryNavigate?.('play');
        currentCreation=null;
        preparePlay(creation);
        if(typeof persistCreation==='function'){
          persistCreation(creation).catch(e=>console.error('roulette history save failed',e));
        }
      }
    }
    enqueueBackgroundJobs(backgroundJobs);
    renderDeck().catch(()=>{});
  }finally{
    processing=false;
    fileInput.disabled=false;
    fileInput.value='';
    renderDeck().catch(()=>{});
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
  const wanted=[...new Set(sourceIds||[])];
  if(!wanted.length)return null;
  const [frameGroups,sources]=await Promise.all([
    Promise.all(wanted.map(id=>framesForSource(id))),
    getAll(SOURCE_STORE)
  ]);
  const frames=frameGroups.flat();
  if(!frames.length)return null;
  const sourceNames=new Map(sources.map(x=>[x.id,sourceDisplayName(x)]));
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
  try{await persistCreation(creation);}catch(e){console.error('roulette history save failed',e);}
  currentCreation=null;
  preparePlay(creation);
});
deckAddBtn?.addEventListener('click',()=>fileInput.click());
deckManageBtn?.addEventListener('click',()=>{
  if(!deckManage)return;
  deckManage.hidden=!deckManage.hidden;
  deckManageBtn.textContent=deckManage.hidden?'保存データを管理':'管理を閉じる';
});
deckLibraryManageBtn?.addEventListener('click',()=>{
  libraryManageMode=!libraryManageMode;
  syncLibraryManageMode();
});
async function backupDeck(){
  const [sources,frames,replays,drawState]=await Promise.all([getAll(SOURCE_STORE),getAll(FRAME_STORE),getAll(REPLAY_STORE),metaGet('drawState')]);
  if(!frames.length){alert('バックアップする思い出デッキがありません。');return;}
  const payload={format:'memory-moments-roulette-deck',version:3,exportedAt:new Date().toISOString(),sources,frames,replays,drawState,selectedSourceIds:[...selectedSourceIds]};
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
        const storageBytes=accepted.reduce((n,x)=>n+(Number(x.frame.imageSize)||0)+(Number(x.frame.replaySize)||0),0)+(Number(src.thumbnailSize)||0);
        const hasPending=accepted.some(x=>x.frame.imagePending||!(Number(x.frame.replayFrameCount)>=2&&Number(x.frame.replaySize)>0));
        ss.put({...src,candidateCount:accepted.length,storageBytes,opfsName:null,opfsReady:false,opfsWriting:false,resumeNeedsFile:hasPending});
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
  if(cur.count===0&&Array.isArray(payload.selectedSourceIds)){
    selectedSourceIds.clear();
    const afterSourceIds=new Set((await getAll(SOURCE_STORE)).map(s=>s.id));
    payload.selectedSourceIds.filter(id=>afterSourceIds.has(id)).forEach(id=>selectedSourceIds.add(id));
    selectionLoaded=true;
    await saveSelectedSources();
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
  selectedSourceIds.clear();
  selectionLoaded=true;
  await saveSelectedSources();
  await clearOpfsSourceFiles();
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
deckSearch?.addEventListener('input',()=>renderSourceLibraries());
deckSearch?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();renderSourceLibraries();}});
deckSort?.addEventListener('change',()=>renderSourceLibraries());
deckSelectAllBtn?.addEventListener('click',async()=>{
  selectedSourceIds.clear();
  lastDeckSources.forEach(s=>selectedSourceIds.add(s.id));
  await saveSelectedSources();
  updateSelectionStatus(lastDeckSources);
  renderSourceLibraries();
});
deckClearSelectionBtn?.addEventListener('click',async()=>{
  selectedSourceIds.clear();
  await saveSelectedSources();
  updateSelectionStatus(lastDeckSources);
  renderSourceLibraries();
});
document.addEventListener('visibilitychange',()=>{
  if(processing&&document.hidden){
    deckNotice.textContent='シーン分析中です。OSに停止されない限り処理を続け、停止された場合も完了済みデータは残ります。';
    deckNotice.className='note deckNotice';
  }
  if(!document.hidden){
    resumePendingBackgroundWork().catch(err=>console.warn('background resume failed',err));
  }
});
window.addEventListener('pageshow',()=>{
  resumePendingBackgroundWork().catch(err=>console.warn('background resume failed',err));
});
requestPersistence().catch(()=>{});
window.__memoryDeckRender=()=>renderDeck();
window.__memoryDeckStartSelection=async()=>{
  libraryManageMode=false;
  deckCard.classList.remove('manage-mode');
  if(deckLibraryManageBtn)deckLibraryManageBtn.textContent='動画を管理';
  if(deckLibraryManageNote)deckLibraryManageNote.textContent='タップして今回使う動画を選びます。';
  selectedSourceIds.clear();
  selectionLoaded=true;
  await saveSelectedSources();
  renderSourceLibraries();
  updateSelectionStatus(lastDeckSources);
};
renderDeck().catch(err=>{console.error(err);deckStatus.textContent='デッキ情報を読み込めませんでした。';});
resumePendingBackgroundWork().catch(err=>console.warn('background resume failed',err));
})();