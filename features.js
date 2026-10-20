(()=>{
const stageEl=document.getElementById('stage');
const resultCardEl=document.getElementById('resultCard');
const resultTextEl=document.getElementById('resultText');
const resultHeadEl=document.getElementById('resultHead');
const messageEl=document.getElementById('message');
const fortuneBadgeEl=document.getElementById('fortuneBadge');
const rouletteBadgeEl=document.getElementById('rouletteBadge');
const tapHintEl=document.getElementById('tapHint');
const playImageEl=document.getElementById('playImage');
const collectionEl=document.getElementById('labCollection');
const pendingFavoriteDeletes=new Set();
const historyEl=document.getElementById('labHistory');
const historyEmpty=document.getElementById('labHistoryEmpty');
const makeGifBtn=document.getElementById('labMakeGif');
const clearHistoryBtn=document.getElementById('labClearHistory');
const gifStatus=document.getElementById('labGifStatus');
const gifResult=document.getElementById('labGifResult');
const gifPreview=document.getElementById('labGifPreview');
const gifDownload=document.getElementById('labGifDownload');
const gifSourceWrap=document.getElementById('labGifSourceWrap');
const gifSource=document.getElementById('labGifSource');
const gifSourceGrid=document.getElementById('labGifSourceGrid');
const gifSourceNote=document.getElementById('labGifSourceNote');
const gifAddVideo=document.getElementById('labGifAddVideo');
const gifFileInput=document.getElementById('labGifFileInput');
const gifChoosePast=document.getElementById('labGifChoosePast');
const gifPast=document.getElementById('labGifPast');
const gifEditor=document.getElementById('labGifEditor');
const gifSearch=document.getElementById('labGifSearch');
const gifSort=document.getElementById('labGifSort');
const gifSelectedTitle=document.getElementById('labGifSelectedTitle');
const gifSelectedFrames=document.getElementById('labGifSelectedFrames');
const gifChangeVideo=document.getElementById('labGifChangeVideo');
const gifFrameInfo=document.getElementById('labGifFrameInfo');
const gifSpeed=document.getElementById('labGifSpeed');
if(!stageEl||!resultCardEl||!collectionEl||!historyEl)return;

const gifViewer=document.createElement('div');
gifViewer.id='labGifViewer';
gifViewer.innerHTML=
  '<button id="labGifViewerClose" type="button" aria-label="GIFを閉じる">×</button>'+
  '<div class="labGifViewerInner">'+
    '<div class="labGifViewerTitle">作成したGIF</div>'+
    '<img id="labGifViewerImage" alt="作成したGIF">'+
    '<div class="labGifViewerNote">保存したGIFと同じ内容です</div>'+
    '<button id="labGifViewerDone" type="button">閉じる</button>'+
  '</div>';
document.body.appendChild(gifViewer);
const gifViewerImage=gifViewer.querySelector('#labGifViewerImage');
const gifViewerClose=gifViewer.querySelector('#labGifViewerClose');
const gifViewerDone=gifViewer.querySelector('#labGifViewerDone');
function openGifViewer(){
  if(!gifUrl)return;
  gifViewerImage.src=gifUrl;
  gifViewer.classList.add('show');
  document.body.classList.add('labGifViewerOpen');
}
function closeGifViewer(){
  gifViewer.classList.remove('show');
  gifViewerImage.removeAttribute('src');
  document.body.classList.remove('labGifViewerOpen');
}
gifViewerClose.addEventListener('click',closeGifViewer);
gifViewerDone.addEventListener('click',closeGifViewer);


const photoViewer=document.createElement('div');
photoViewer.id='labPhotoViewer';
photoViewer.innerHTML=
  '<button id="labPhotoViewerClose" type="button" aria-label="画像を閉じる">×</button>'+
  '<div class="labPhotoViewerInner">'+
    '<div class="labPhotoViewerTitle">お気に入り</div>'+
    '<img id="labPhotoViewerImage" alt="保存したお気に入り写真">'+
    '<div class="labPhotoViewerNote">端末に保存した画像と同じ写真です</div>'+
    '<button id="labPhotoViewerDone" type="button">閉じる</button>'+
  '</div>';
document.body.appendChild(photoViewer);
const photoViewerImage=photoViewer.querySelector('#labPhotoViewerImage');
const photoViewerClose=photoViewer.querySelector('#labPhotoViewerClose');
const photoViewerDone=photoViewer.querySelector('#labPhotoViewerDone');

const downloadNotice=document.createElement('div');
downloadNotice.id='labDownloadNotice';
downloadNotice.innerHTML=
  '<span>✓ 画像を保存しました</span>'+
  '<button id="labDownloadNoticeOpen" type="button">開く</button>'+
  '<button id="labDownloadNoticeClose" type="button" aria-label="閉じる">×</button>';
document.body.appendChild(downloadNotice);
const downloadNoticeOpen=downloadNotice.querySelector('#labDownloadNoticeOpen');
const downloadNoticeClose=downloadNotice.querySelector('#labDownloadNoticeClose');
let lastDownloadedPhoto=null;
let downloadNoticeTimer=null;

function openDailyPhoto(item){
  if(!item?.image)return;
  photoViewerImage.src=item.image;
  photoViewer.classList.add('show');
  document.body.classList.add('labPhotoViewerOpen');
}
function closeDailyPhoto(){
  photoViewer.classList.remove('show');
  photoViewerImage.removeAttribute('src');
  document.body.classList.remove('labPhotoViewerOpen');
}
function hideDownloadNotice(){
  clearTimeout(downloadNoticeTimer);
  downloadNoticeTimer=null;
  downloadNotice.classList.remove('show');
}
function showDownloadNotice(item){
  lastDownloadedPhoto=item;
  downloadNotice.classList.add('show');
  clearTimeout(downloadNoticeTimer);
  downloadNoticeTimer=setTimeout(hideDownloadNotice,15000);
}
photoViewerClose.addEventListener('click',closeDailyPhoto);
photoViewerDone.addEventListener('click',closeDailyPhoto);
downloadNoticeOpen.addEventListener('click',()=>{
  if(lastDownloadedPhoto)openDailyPhoto(lastDownloadedPhoto);
  hideDownloadNotice();
});
downloadNoticeClose.addEventListener('click',hideDownloadNotice);

const MIRACLE_GENERAL_RATE=.08;
const REVERSAL_DAIKYO_RATE=.40;
const MIRACLE_REPLAY_LEAD_SECONDS=3.0;
const MIRACLE_REPLAY_RATE=.42;
const EARLY_REPLAY_THRESHOLD=2.5;

const LUCKY_COLORS=[
  {name:'さくらピンク',hex:'#f4a7b9'},{name:'ミルクホワイト',hex:'#fffaf2'},
  {name:'おひさまイエロー',hex:'#f6d365'},{name:'そらいろ',hex:'#8ecae6'},
  {name:'若葉グリーン',hex:'#9bd18b'},{name:'ラベンダー',hex:'#c7b2e5'},
  {name:'ももいろ',hex:'#f7b2c4'},{name:'クリーム',hex:'#f4dfad'}
];
const LUCKY_POINTS=[
  'ほっぺ','おてて','あんよ','口もと','まつげ','つむじ','おなか','横顔',
  'にぎった手','ちいさな指','ふわふわの髪','眠そうな目'
];
const MIRACLE_MESSAGES=[
  '特大吉の特別リプレイです。',
  'この一瞬をスローでもう一度。',
  '思いがけない一瞬まで、今日のおみくじの結果です。'
];
const REVERSAL_MESSAGES=[
  '大凶……と思いきや、この一枚で全部ひっくり返りました。',
  '運勢は大凶。でも、この一瞬を見たら今日は最高の日。',
  'まさかの大逆転。最後に残ったのは、とびきり幸せな一枚。'
];

let currentLab=null;
let history=[];
let gifUrl=null;
let gifFileName='memory-roulette-frames.gif';
let gifGeneration=0;
let gifGenerating=false;
let gifPreviewTimer=null;
let gifChooserSignature='';
let gifSourceCatalog=[];
let gifLoadedSourceKey=null;
let gifLoadedFrames=[];
let gifLoading=false;
let gifLoadToken=0;
let gifPastOpen=false;
let dockTimer=null;
let rareTimer=null;
let miracleSequenceToken=0;
let currentMiracleReplay=null;
let miracleAutoCloseTimer=null;
let replaySourceKey=null;
let replayWarmupGeneration=0;
let specialMovieUrl=null;
let specialMovieBlob=null;
let specialMovieKey=null;
let specialMovieGenerating=false;
let specialMovieGenerationToken=0;

let lastReplayPlan=null;

function safeReplayState(){
  const activeKey=activeCreation?.sourceKey||null;
  return {
    targetTime:currentMiracleReplay?.targetTime??null,
    sourceAvailable:replaySourceAvailable(),
    hasObjectUrl:!!objectUrl,
    hasLastFile:!!lastFile,
    activeHasSourceKey:!!activeKey,
    currentHasSourceKey:!!currentSourceKey,
    sourceKeyMatches:!!(activeKey&&currentSourceKey&&activeKey===currentSourceKey),
    replayKeyMatches:!!(activeKey&&replaySourceKey&&activeKey===replaySourceKey),
    videoReadyState:miracleVideo?.readyState??null,
    videoDuration:Number.isFinite(miracleVideo?.duration)?Number(miracleVideo.duration.toFixed(3)):null
  };
}
function diag(){}
function replayPlan(targetTime,sourceAvailable){
  const target=Math.max(0,Number(targetTime)||0);
  const early=target<EARLY_REPLAY_THRESHOLD;
  if(early&&sourceAvailable)return {route:'reverse-source',early:true,targetTime:target};
  if(!early&&sourceAvailable)return {route:'forward-source',early:false,targetTime:target};
  if(early&&!sourceAvailable)return {route:'reverse-frames',early:true,targetTime:target};
  return {route:'photo-only',early:false,targetTime:target};
}
const playShellEl=stageEl.closest('.playShell');
const resultDock=document.createElement('div');
resultDock.id='labResultDock';
playShellEl.insertAdjacentElement('afterend',resultDock);

const miracleOverlay=document.createElement('div');
miracleOverlay.id='labMiracleOverlay';
miracleOverlay.innerHTML=
  '<div class="labMiracleBackdrop"><img id="labMiracleBackdropImage" alt=""></div>'+
  '<div class="labMiracleHalo"></div>'+
  '<div class="labMiracleBurst"></div>'+
  '<div class="labMiracleConfetti"></div>'+
  '<div class="labMiracleReplayWrap">'+
    '<div id="labMiracleReplayLabel">0.5× SLOW REPLAY</div>'+
    '<video id="labMiracleVideo" playsinline muted preload="metadata"></video>'+
    '<img id="labMiracleStill" alt="特別な一瞬">'+
  '</div>'+
  '<div class="labMiracleCenter">'+
    '<div class="labMiracleKicker"></div>'+
    '<div class="labMiracleTitle"></div>'+
    '<div class="labMiracleSub"></div>'+
  '</div>'+
  '<div id="labMovieStatus" aria-live="polite"></div>'+
  '<div class="labMiracleActions">'+
    '<button id="labReplayAgain" type="button">↻ リプレイ</button>'+
    '<button id="labSaveSpecialMovie" type="button">🎬 ムービー保存</button>'+
    '<button id="labMiracleBack" type="button">結果へ戻る</button>'+
  '</div>'+
  '<div class="labMiracleSparkles"></div>';
document.body.appendChild(miracleOverlay);

const miracleKicker=miracleOverlay.querySelector('.labMiracleKicker');
const miracleTitle=miracleOverlay.querySelector('.labMiracleTitle');
const miracleSub=miracleOverlay.querySelector('.labMiracleSub');
const miracleSparkles=miracleOverlay.querySelector('.labMiracleSparkles');
const miracleBurst=miracleOverlay.querySelector('.labMiracleBurst');
const miracleConfetti=miracleOverlay.querySelector('.labMiracleConfetti');
const miracleVideo=miracleOverlay.querySelector('#labMiracleVideo');
const miracleStill=miracleOverlay.querySelector('#labMiracleStill');
const miracleBackdropImage=miracleOverlay.querySelector('#labMiracleBackdropImage');
const miracleReplayLabel=miracleOverlay.querySelector('#labMiracleReplayLabel');
const miracleReplayAgain=miracleOverlay.querySelector('#labReplayAgain');
const miracleMovieBtn=miracleOverlay.querySelector('#labSaveSpecialMovie');
const miracleMovieStatus=miracleOverlay.querySelector('#labMovieStatus');
const miracleBack=miracleOverlay.querySelector('#labMiracleBack');

const extra=document.createElement('div');
extra.id='labFortuneExtra';
extra.innerHTML=
  '<div id="labSpecialEmblem"></div>'+
  '<div id="labLucky"></div>'+
  '<div id="labSpecialLine"></div>'+
  '<button id="labReplaySpecial" type="button">✨ 特別リプレイ</button>'+
  '<button id="labSaveSpecialMovieResult" type="button">🎬 この演出をムービー保存</button>'+
  '<div id="labMovieResultStatus" aria-live="polite"></div>'+
  '<button id="labSavePhoto" type="button">♡ お気に入りに保存</button>';
resultCardEl.appendChild(extra);
const specialEmblem=extra.querySelector('#labSpecialEmblem');
const luckyEl=extra.querySelector('#labLucky');
const specialLine=extra.querySelector('#labSpecialLine');
const replaySpecialBtn=extra.querySelector('#labReplaySpecial');
const movieResultBtn=extra.querySelector('#labSaveSpecialMovieResult');
const movieResultStatus=extra.querySelector('#labMovieResultStatus');
const saveBtn=extra.querySelector('#labSavePhoto');
replaySpecialBtn.style.display='none';
movieResultBtn.style.display='none';

function randomOf(arr){return arr[Math.floor(Math.random()*arr.length)];}
function pickLucky(){return {color:randomOf(LUCKY_COLORS),point:randomOf(LUCKY_POINTS)};}
function renderLucky(lucky){
  if(!lucky)return;
  luckyEl.innerHTML=
    '<div class="labLuckyRow"><span>今日のラッキーカラー</span><b><i style="background:'+lucky.color.hex+'"></i>'+lucky.color.name+'</b></div>'+
    '<div class="labLuckyRow"><span>今日のラッキーポイント</span><b>✨ '+lucky.point+'</b></div>';
}
function specialFor(fortune){
  const forced=window.__babyLabForcedSpecial;
  window.__babyLabForcedSpecial=null;
  if(forced==='miracle'||forced==='reversal')return forced;
  if(fortune==='大凶'){
    return Math.random()<REVERSAL_DAIKYO_RATE?'reversal':null;
  }
  return Math.random()<MIRACLE_GENERAL_RATE?'miracle':null;
}
window.__memoryResolveFortuneResult=baseFortune=>{
  const special=specialFor(baseFortune);
  const displayFortune=special==='miracle'?'特大吉':baseFortune;
  const message=special==='miracle'?FORTUNE_MESSAGES['特大吉']:null;
  window.__memoryPendingSpecialResult={special,baseFortune,displayFortune};
  return {fortune:displayFortune,special,baseFortune,message};
};
window.__memoryResolveStoppedFortune=baseFortune=>window.__memoryResolveFortuneResult(baseFortune).fortune;
function setSpecialResultStyle(special){
  resultCardEl.classList.toggle('labSpecialMiracle',special==='miracle');
  resultCardEl.classList.toggle('labSpecialReversal',special==='reversal');
  if(specialEmblem){
    specialEmblem.style.display=special?'block':'none';
    specialEmblem.textContent=special==='miracle'
      ? '✦ SPECIAL FORTUNE ✦'
      : special==='reversal'
        ? '🌈 REVERSAL FORTUNE 🌈'
        : '';
  }

}
function revealSpecialImmediately(special){
  return special==='miracle';
}
function specialFortuneDisplay(special,baseFortune){
  if(special==='miracle')return {head:'きょうの運勢',fortune:'特大吉',badge:(FORTUNE_ICONS['特大吉']||'🎊')+' 特大吉',message:FORTUNE_MESSAGES['特大吉']};
  if(special==='reversal')return {head:'大凶かと思ったら…',fortune:'大逆転大吉',badge:'🌈 大逆転大吉',message:'大凶から一転。今日は大逆転大吉！'};
  return {head:'きょうの運勢',fortune:baseFortune,badge:(FORTUNE_ICONS[baseFortune]||'🎴')+' '+baseFortune};
}
function applySpecialFortuneDisplay(special,baseFortune){
  const d=specialFortuneDisplay(special,baseFortune);
  setSpecialResultStyle(special);
  if(resultHeadEl)resultHeadEl.textContent=d.head;
  resultTextEl.textContent=d.fortune;
  const colorKey=d.fortune==='大逆転大吉'?'大吉':d.fortune;
  resultTextEl.style.color=FORTUNE_COLORS[colorKey]||'#700';
  fortuneBadgeEl.textContent=d.badge;
  fortuneBadgeEl.style.color=FORTUNE_COLORS[colorKey]||'#700';
  if(d.message&&messageEl)messageEl.textContent=d.message;
  return d;
}
function resolvedDisplayFortune(item){
  if(!item)return '吉';
  if(item.plain)return 'この瞬間！';
  if(item.special)return specialFortuneDisplay(item.special,item.fortune||'吉').fortune;
  return item.displayFortune||item.fortune||'吉';
}
// The same fanfare is used by the live result and the exported movie.
function specialFanfareNotes(kind){
  return kind==='reversal'
    ? [[392,.12,0,.05,'triangle'],[659,.15,.10,.055,'sine'],
       [988,.20,.23,.06,'sine'],[1319,.35,.40,.065,'sine'],
       [1568,.42,.62,.06,'sine']]
    : [[784,.13,0,.055,'sine'],[1047,.16,.10,.06,'sine'],
       [1319,.20,.22,.065,'sine'],[1568,.34,.37,.07,'sine'],
       [2093,.45,.58,.055,'sine']];
}
function playSpecialSound(kind){
  try{
    if(!primed||!ensureAudio())return;
    for(const [freq,duration,delay,volume,type] of specialFanfareNotes(kind)){
      tone(freq,duration,delay,volume,type);
    }
  }catch(e){}
}
function fillMiracleSparkles(kind='miracle'){
  miracleSparkles.innerHTML='';
  miracleConfetti.innerHTML='';
  const chars=kind==='reversal'
    ? ['✦','◆','●','🌈','✨','✧']
    : ['✦','★','✧','●','✨','✺'];
  for(let i=0;i<116;i++){
    const s=document.createElement('span');
    s.textContent=chars[Math.floor(Math.random()*chars.length)];
    s.style.setProperty('--x',(Math.random()*100)+'vw');
    s.style.setProperty('--y',(Math.random()*100)+'vh');
    s.style.setProperty('--d',(Math.random()*1.05)+'s');
    s.style.setProperty('--r',(-220+Math.random()*440)+'deg');
    s.style.setProperty('--travel',(-50+Math.random()*100)+'px');
    s.style.fontSize=(9+Math.random()*34)+'px';
    s.className=kind==='reversal'?'rainbow':'gold';
    miracleSparkles.appendChild(s);
  }
  for(let i=0;i<42;i++){
    const p=document.createElement('i');
    p.style.setProperty('--x',(Math.random()*100)+'vw');
    p.style.setProperty('--d',(Math.random()*1.2)+'s');
    p.style.setProperty('--dur',(1.7+Math.random()*1.7)+'s');
    p.style.setProperty('--rot',(-360+Math.random()*720)+'deg');
    p.style.setProperty('--h',kind==='reversal'?(Math.random()*360)+'deg':(38+Math.random()*22)+'deg');
    miracleConfetti.appendChild(p);
  }
}

function specialMovieTimeline(kind,replay=null){
  const target=Math.max(0,Number(replay?.targetTime)||MIRACLE_REPLAY_LEAD_SECONDS);
  const storedSpan=Number(replay?.replaySpan)||0;
  const lead=storedSpan>0?Math.min(MIRACLE_REPLAY_LEAD_SECONDS,storedSpan):Math.min(MIRACLE_REPLAY_LEAD_SECONDS,Math.max(.04,target));
  const slow=Math.max(.35,lead/MIRACLE_REPLAY_RATE);
  const intro=kind==='reversal'?.78:.52;
  const final=4.20;
  return {intro,slow,final,total:intro+slow+final,lead,rate:MIRACLE_REPLAY_RATE};
}
function specialSequenceSpec(kind,replay=null){
  const t=specialMovieTimeline(kind,replay);
  return {
    ...t,
    introDuration:t.intro,
    intro:kind==='reversal'
      ? {kicker:'大凶……',title:'……あれ？',sub:'まだ終わっていません'}
      : {kicker:'',title:'特大吉',sub:''},
    replay:kind==='reversal'
      ? {kicker:'',title:'',sub:''}
      : {kicker:'',title:'',sub:''},
    final:kind==='reversal'
      ? {duration:t.final,kicker:'',title:'大逆転大吉！',sub:'🌈 SPECIAL FORTUNE 🌈'}
      : {duration:t.final,kicker:'',title:'特大吉！',sub:'✨ SPECIAL FORTUNE ✨'}
  };
}
function specialMovieMimeType(withAudio=false){
  if(typeof MediaRecorder==='undefined'||typeof MediaRecorder.isTypeSupported!=='function')return '';
  const types=withAudio?[
    'video/mp4;codecs=avc1.42E01F,mp4a.40.2',
    'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
    'video/mp4;codecs=avc1,mp4a.40.2',
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus'
  ]:[
    'video/mp4;codecs=avc1.42E01F',
    'video/mp4;codecs=avc1.42E01E',
    'video/mp4;codecs=avc1',
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm'
  ];
  return types.find(t=>MediaRecorder.isTypeSupported(t))||'';
}
function specialMovieFormat(blob){
  return (blob?.type||'').startsWith('video/mp4')?'mp4':'webm';
}
async function specialMovieDetectFormat(blob){
  // Trust the actual file header rather than the requested MIME type.
  const header=new Uint8Array(await blob.slice(0,12).arrayBuffer());
  if(header.length>=8&&header[4]===0x66&&header[5]===0x74&&header[6]===0x79&&header[7]===0x70)return 'mp4'; // ftyp
  if(header.length>=4&&header[0]===0x1a&&header[1]===0x45&&header[2]===0xdf&&header[3]===0xa3)return 'webm'; // EBML
  return '';
}
function specialMovieSupported(){
  return typeof MediaRecorder!=='undefined'&&
    typeof HTMLCanvasElement!=='undefined'&&
    typeof HTMLCanvasElement.prototype.captureStream==='function';
}
function specialMovieExportKey(replay){
  return replay?[(replay.kind||''),Number(replay.targetTime||0).toFixed(3),replay.index??'',replay.replayCandidateId||''].join('|'):'';
}
function specialMovieFilename(kind,blob){
  const label=kind==='reversal'?'daigyakuten-daikichi':'dai-daikichi';
  return 'memory-'+label+'-'+new Date().toISOString().replace(/[:.]/g,'-')+'.'+specialMovieFormat(blob);
}
function setSpecialMovieStatus(text,state=''){
  const cls=state?('state-'+state):'';
  if(miracleMovieStatus){
    miracleMovieStatus.textContent=text||'';
    miracleMovieStatus.className=cls;
  }
  if(movieResultStatus){
    movieResultStatus.textContent=text||'';
    movieResultStatus.className=cls;
  }
}
function setSpecialMovieButtons(text,disabled=false){
  [miracleMovieBtn,movieResultBtn].forEach(btn=>{
    if(!btn)return;
    btn.textContent=text;
    btn.disabled=!!disabled;
  });
}
function resetSpecialMovieExport(){
  specialMovieGenerationToken++;
  if(specialMovieUrl){
    URL.revokeObjectURL(specialMovieUrl);
    specialMovieUrl=null;
  }
  specialMovieBlob=null;
  specialMovieKey=null;
  specialMovieGenerating=false;
  setSpecialMovieStatus('');
  setSpecialMovieButtons('🎬 ムービー保存',false);
}
function downloadSpecialMovie(){
  if(!specialMovieBlob)return false;
  if(!specialMovieUrl)specialMovieUrl=URL.createObjectURL(specialMovieBlob);
  const a=document.createElement('a');
  a.href=specialMovieUrl;
  a.download=specialMovieFilename(currentMiracleReplay?.kind||'miracle',specialMovieBlob);
  a.style.display='none';
  document.body.appendChild(a);
  a.click();
  a.remove();
  return true;
}
function movieSourceSize(source){
  const w=source?.videoWidth||source?.naturalWidth||source?.width||1;
  const h=source?.videoHeight||source?.naturalHeight||source?.height||1;
  return {w:Math.max(1,w),h:Math.max(1,h)};
}
function drawMovieMedia(ctx,source,w,h,zoom=1,dim=0){
  const sz=movieSourceSize(source);
  ctx.save();
  ctx.fillStyle='#07070a';
  ctx.fillRect(0,0,w,h);

  const cover=Math.max(w/sz.w,h/sz.h)*1.16*zoom;
  const cw=sz.w*cover,ch=sz.h*cover;
  ctx.filter='blur('+Math.max(12,Math.round(Math.min(w,h)*.022))+'px) brightness(.42) saturate(1.28)';
  ctx.drawImage(source,(w-cw)/2,(h-ch)/2,cw,ch);
  ctx.filter='none';

  const contain=Math.min(w/sz.w,h/sz.h)*zoom;
  const dw=sz.w*contain,dh=sz.h*contain;
  ctx.drawImage(source,(w-dw)/2,(h-dh)/2,dw,dh);
  if(dim>0){
    ctx.fillStyle='rgba(4,3,6,'+Math.min(.82,dim)+')';
    ctx.fillRect(0,0,w,h);
  }
  ctx.restore();
}
function drawMovieIntroBackdrop(ctx,source,w,h,kind){
  // The on-screen intro hides the foreground video and shows only a dark,
  // blurred, full-bleed backdrop behind the centered introduction.
  const sz=movieSourceSize(source);
  ctx.save();
  ctx.fillStyle='#09080b';ctx.fillRect(0,0,w,h);
  const cover=Math.max(w/sz.w,h/sz.h)*1.15;
  const dw=sz.w*cover,dh=sz.h*cover;
  ctx.filter='blur('+Math.round(w*.045)+'px) brightness(.36) saturate(1.25)';
  ctx.drawImage(source,(w-dw)/2,(h-dh)/2,dw,dh);
  ctx.filter='none';
  ctx.fillStyle=kind==='reversal'?'rgba(8,5,12,.58)':'rgba(8,7,10,.24)';
  ctx.fillRect(0,0,w,h);
  ctx.restore();
}
function drawMovieText(ctx,w,h,kicker,title,sub,theme='gold',alpha=1,phase='intro'){
  // The live overlay centers the introductory text, but places the result
  // title high on the final photograph (mobile CSS: top 16%).
  const final=phase==='final';
  ctx.save();
  ctx.globalAlpha=Math.max(0,Math.min(1,alpha));
  ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.shadowColor='rgba(0,0,0,.78)';
  ctx.shadowBlur=Math.round(w*.025);
  ctx.fillStyle='rgba(255,255,255,.96)';
  ctx.font='950 '+Math.round(w*(final?.037:.034))+'px system-ui, sans-serif';
  if(kicker)ctx.fillText(kicker,w/2,h*(final?.222:.43),w*.93);
  let titleSize=w*(title&&title.length>=6?.119:.150);
  if(!final)titleSize*=.86;
  const scale=final
    ? (alpha<.28?.45+alpha/.28*.62:1)
    : 1;
  ctx.font='1000 '+Math.round(titleSize*scale)+'px system-ui, sans-serif';
  if(theme==='gold'){
    const g=ctx.createLinearGradient(w*.2,0,w*.8,0);
    g.addColorStop(0,'#fff7b7');g.addColorStop(.5,'#fffce9');g.addColorStop(1,'#ffd34d');
    ctx.fillStyle=g;
  }else if(theme==='rainbow'){
    const g=ctx.createLinearGradient(w*.18,0,w*.82,0);
    g.addColorStop(0,'#ff8bd7');g.addColorStop(.27,'#9bdcff');g.addColorStop(.55,'#fff49c');
    g.addColorStop(.8,'#a9ffca');g.addColorStop(1,'#ddb0ff');
    ctx.fillStyle=g;
  }else ctx.fillStyle='#fff';
  if(title)ctx.fillText(title,w/2,h*(final?.293:.505),w*.95);
  ctx.fillStyle='rgba(255,255,255,.95)';
  ctx.font='900 '+Math.round(w*(final?.041:.037))+'px system-ui, sans-serif';
  if(sub)ctx.fillText(sub,w/2,h*(final?.354:.572),w*.96);
  ctx.restore();
}
function createMovieParticles(kind,count=90){
  return Array.from({length:count},(_,i)=>({
    x:Math.random(),y:Math.random(),size:.003+Math.random()*.009,
    speed:.06+Math.random()*.18,phase:Math.random()*6.283,
    hue:kind==='reversal'?Math.random()*360:38+Math.random()*28,
    spin:(Math.random()-.5)*5,shape:i%4
  }));
}
function drawMovieParticles(ctx,particles,w,h,t,intensity=1,fall=false){
  ctx.save();
  for(const p of particles){
    const delay=p.phase/6.283*1.2;
    const duration=1.7+p.speed*7;
    const elapsed=t-delay;
    if(fall&&(elapsed<0||elapsed>duration))continue;
    const x=(p.x+Math.sin(t*.8+p.phase)*.025)*w;
    const y=fall?(-.08+elapsed/duration*1.20)*h
      :(p.y-Math.sin(t*.6+p.phase)*.018)*h;
    const size=Math.max(2,p.size*Math.min(w,h)*(0.72+intensity*.55));
    ctx.save();
    ctx.translate(x,y);
    ctx.rotate(t*p.spin+p.phase);
    ctx.globalAlpha=fall?Math.min(.85,elapsed/.12):Math.min(1,.24+intensity*.62);
    ctx.fillStyle='hsla('+p.hue+',92%,66%,.92)';
    if(p.shape===0){
      ctx.fillRect(-size*.35,-size*1.2,size*.7,size*2.4);
    }else if(p.shape===1){
      ctx.beginPath();ctx.arc(0,0,size*.58,0,Math.PI*2);ctx.fill();
    }else{
      ctx.font=Math.round(size*2.1)+'px system-ui';
      ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText(p.shape===2?'✦':'◆',0,0);
    }
    ctx.restore();
  }
  ctx.restore();
}
function drawMovieAura(ctx,w,h,kind,progress,flash=0){
  // Match the live full-screen repeating-conic burst and spinning halo.
  // The old exporter drew four circles, which looked nothing like the app.
  ctx.save();
  ctx.translate(w/2,h*.50);
  ctx.globalCompositeOperation='screen';
  const length=Math.hypot(w,h);
  const angleShift=(-10+progress*38)*Math.PI/180;
  const opacity=Math.min(1,progress/.10)*(.95-progress*.68);
  const count=kind==='reversal'?60:40;
  for(let i=0;i<count;i++){
    const a=(Math.PI*2*i/count)+angleShift;
    const da=(kind==='reversal'?.028:.039);
    ctx.beginPath();ctx.moveTo(0,0);
    ctx.lineTo(Math.cos(a)*length,Math.sin(a)*length);
    ctx.lineTo(Math.cos(a+da)*length,Math.sin(a+da)*length);
    ctx.closePath();
    let rgb='255,255,255';
    if(kind==='reversal'){
      const colors=['255,120,220','110,220,255','255,238,115'];
      rgb=colors[i%colors.length];
    }
    ctx.fillStyle='rgba('+rgb+','+(opacity*(kind==='reversal'?.46:.36))+')';
    ctx.fill();
  }
  ctx.restore();
  if(flash>0){
    ctx.save();ctx.fillStyle='rgba(255,255,255,'+Math.min(.88,flash*.88)+')';
    ctx.fillRect(0,0,w,h);ctx.restore();
  }
}
function drawSpecialMovieFrame(ctx,state){
  const {kind,t,timeline,still,video,videoReady,replayImages,particles,w,h}=state;
  const spec=specialSequenceSpec(kind,{targetTime:state.targetTime});
  const slowStart=timeline.intro;
  const slowEnd=timeline.intro+timeline.slow;
  let source=still;
  const hasReplayFrames=Array.isArray(replayImages)&&replayImages.length>=2;
  if(t>=slowStart&&t<slowEnd){
    // The live deck preview uses stored frames. The MP4 should show those
    // same frames at the same interval rather than a different live-video cut.
    if(hasReplayFrames){
      const p=(t-slowStart)/Math.max(.01,timeline.slow);
      const ix=Math.max(0,Math.min(replayImages.length-1,Math.floor(p*replayImages.length)));
      source=replayImages[ix]||still;
    }else if(video&&videoReady()&&video.readyState>=2)source=video;
  }

  if(t<slowStart){
    drawMovieIntroBackdrop(ctx,still,w,h,kind);
    drawMovieText(ctx,w,h,spec.intro.kicker,spec.intro.title,spec.intro.sub,
      kind==='reversal'?'plain':'gold',1,'intro');
    return;
  }

  if(t<slowEnd){
    drawMovieMedia(ctx,source,w,h,1,0);
    // Leave the slow-replay scene unobstructed by technical labels.
    return;
  }

  const p=Math.min(1,(t-slowEnd)/timeline.final);
  // The live image appears slightly zoomed, then settles at its original size.
  const zoom=p<.12?.92+(p/.12)*.105:1.025-Math.min(1,(p-.12)/.88)*.025;
  drawMovieMedia(ctx,still,w,h,zoom,0);
  drawMovieAura(ctx,w,h,kind,p,Math.max(0,1-p/.16));
  drawMovieParticles(ctx,particles,w,h,Math.max(0,t-slowEnd),1,true);
  drawMovieText(ctx,w,h,spec.final.kicker,spec.final.title,spec.final.sub,
    kind==='reversal'?'rainbow':'gold',Math.min(1,p*4.1),'final');
}
async function prepareSpecialMovieVideo(replay,slowDuration){
  // Reverse clips are rendered from stored frames in playback order.
  if(replay?.replayMode==='reverse')return null;
  const liveFile=replay?.sourceVideoId&&window.__memoryDeckReplayFile?.(replay.sourceVideoId);
  if(!liveFile&&!replaySourceAvailable())return null;
  const ownUrl=liveFile?URL.createObjectURL(liveFile):null;
  const src=ownUrl||replaySourceUrl();
  if(!src){if(ownUrl)URL.revokeObjectURL(ownUrl);return null;}
  const v=document.createElement('video');
  v.muted=true;v.playsInline=true;v.preload='auto';
  v.style.cssText='position:fixed;width:2px;height:2px;opacity:.001;left:-20px;top:-20px;pointer-events:none';
  document.body.appendChild(v);
  try{
    v.src=src;
    v.load();
    if(v.readyState<1)await waitForVideoEvent(v,'loadedmetadata',5000);
    const duration=Number(v.duration);
    if(!Number.isFinite(duration)||duration<=0)throw new Error('invalid movie duration');
    const target=Math.max(0,Math.min(duration-.05,Number(replay.targetTime)||0));
    const desiredLead=Math.min(target,MIRACLE_REPLAY_LEAD_SECONDS);
    if(desiredLead<.12)throw new Error('target too close to beginning');
    const start=Math.max(0,target-desiredLead);
    const rate=MIRACLE_REPLAY_RATE;
    v.currentTime=start;
    try{await waitForVideoEvent(v,'seeked',2200);}catch(e){}
    v.playbackRate=rate;
    return {video:v,start,target,rate,cleanup:()=>{try{v.pause();}catch(e){}v.removeAttribute('src');v.load();v.remove();if(ownUrl)URL.revokeObjectURL(ownUrl);}};
  }catch(err){
    try{v.removeAttribute('src');v.load();v.remove();}catch(e){}
    if(ownUrl)URL.revokeObjectURL(ownUrl);
    diag('movie-source-fallback',{name:err?.name||'Error',message:String(err?.message||err)});
    return null;
  }
}
function createSpecialMovieSoundtrack(){
  // Compose an original, royalty-free jingle in memory, and record it only into
  // the exported movie. This works even when the original video is unavailable.
  const Ctx=window.AudioContext||window.webkitAudioContext;
  if(!Ctx)return null;
  try{
    const ctx=new Ctx();
    const destination=ctx.createMediaStreamDestination();
    const track=destination.stream.getAudioTracks()[0];
    if(!track){ctx.close().catch(()=>{});return null;}
    // Called synchronously from the export button's user activation.
    const ready=ctx.resume().catch(()=>{});
    function note(frequency,offset,duration,volume=.07,type='sine'){
      const at=ctx.currentTime+offset;
      const osc=ctx.createOscillator();
      const gain=ctx.createGain();
      osc.type=type;
      osc.frequency.setValueAtTime(frequency,at);
      gain.gain.setValueAtTime(.0001,at);
      gain.gain.exponentialRampToValueAtTime(volume,at+.025);
      gain.gain.exponentialRampToValueAtTime(.0001,at+duration);
      osc.connect(gain).connect(destination);
      osc.start(at);
      osc.stop(at+duration+.025);
      osc.onended=()=>{try{osc.disconnect();gain.disconnect();}catch(e){}};
    }
    return {
      track,ready,
      start(timeline,kind){
        if(ctx.state!=='running')return;
        // Keep the audio encoder active for the full movie, including the
        // silent introduction and finale tail. Some Android muxers otherwise
        // write a shorter AAC track than the H.264 video track.
        const carrier=ctx.createOscillator();
        const carrierGain=ctx.createGain();
        carrier.type='sine';
        carrier.frequency.value=220;
        carrierGain.gain.value=.000005; // practically inaudible, not a soundtrack
        carrier.connect(carrierGain).connect(destination);
        carrier.start(ctx.currentTime);
        carrier.stop(ctx.currentTime+timeline.total+.12);
        carrier.onended=()=>{
          try{carrier.disconnect();carrierGain.disconnect();}catch(e){}
        };
        // The live sequence is silent during the intro and slow replay.
        // Use the same reveal fanfare as the app, with no added background music.
        const reveal=timeline.intro+timeline.slow;
        for(const [f,d,delay,volume,type] of specialFanfareNotes(kind)){
          note(f,reveal+delay,d,volume,type);
        }
      },
      cleanup(){
        try{track.stop();}catch(e){}
        try{ctx.close().catch(()=>{});}catch(e){}
      }
    };
  }catch(e){console.warn('movie soundtrack unavailable',e);return null;}
}

async function renderSpecialMovie(kind,replay,onProgress,soundtrack){
  if(!specialMovieSupported())throw new Error('このブラウザはムービー保存に対応していません');
  if(!replay?.frameSrc)throw new Error('リプレイする写真がありません');

  const still=await loadImage(replay.frameSrc);
  let storedReplay=null;
  if(replay.replayCandidateId){
    try{
      storedReplay=typeof window.__memoryDeckEnsureReplay==='function'
        ? await window.__memoryDeckEnsureReplay(replay.replayCandidateId,replay.sourceVideoId,replay.targetTime)
        : await window.__memoryDeckLoadReplay?.(replay.replayCandidateId);
    }catch(e){console.warn('slow replay source lookup failed',e);}
  }
  const timeline=specialMovieTimeline(kind,{
    ...replay,replaySpan:Number(storedReplay?.span)||replay.replaySpan
  });
  const replayImages=Array.isArray(storedReplay?.frames)
    ? (await Promise.all(storedReplay.frames.map(src=>loadImage(src).catch(()=>null)))).filter(Boolean)
    : [];
  const portrait=still.naturalHeight>=still.naturalWidth;
  const w=portrait?720:1280;
  const h=portrait?1280:720;
  const canvas=document.createElement('canvas');
  canvas.width=w;canvas.height=h;
  const ctx=canvas.getContext('2d',{alpha:false});
  if(!ctx)throw new Error('Canvasを準備できませんでした');

  const stream=canvas.captureStream(30);
  let mime=soundtrack?.track?specialMovieMimeType(true):'';
  let hasAudio=!!mime&&!!soundtrack?.track;
  if(!mime)mime=specialMovieMimeType();
  if(!mime)throw new Error('このブラウザはムービーの録画形式に対応していません');
  if(hasAudio)stream.addTrack(soundtrack.track);
  let recorder;
  try{
    recorder=new MediaRecorder(stream,{videoBitsPerSecond:4800000,audioBitsPerSecond:128000,mimeType:mime});
  }catch(err){
    if(!hasAudio)throw err;
    // Keep the movie export functional if the browser rejects a mixed stream.
    stream.removeTrack(soundtrack.track);
    hasAudio=false;
    mime=specialMovieMimeType();
    recorder=new MediaRecorder(stream,{videoBitsPerSecond:4800000,mimeType:mime});
  }
  const chunks=[];
  recorder.ondataavailable=e=>{if(e.data&&e.data.size)chunks.push(e.data);};

  // The app's deck replay shows the stored sequence; export those SAME
  // frames rather than independently replaying the source at a different rate.
  const source=replayImages.length>=2?null:await prepareSpecialMovieVideo({
    ...replay,replayMode:storedReplay?.mode||replay.replayMode
  },timeline.slow);
  if(!source&&replayImages.length<2){
    throw new Error('スローモーション用の連続コマを準備できませんでした。元動画の処理完了後にもう一度お試しください');
  }
  const particles=createMovieParticles(kind,96);
  let movieVideo=source?.video||null;
  let videoFailed=!movieVideo;
  let videoStarted=false;
  let videoPaused=false;
  let lastVideoTime=Number(movieVideo?.currentTime)||0;
  let lastVideoProgressAt=timeline.intro;

  const finished=new Promise((resolve,reject)=>{
    recorder.onerror=e=>reject(e.error||new Error('動画の録画に失敗しました'));
    recorder.onstop=()=>resolve(new Blob(chunks,{type:recorder.mimeType||mime}));
  });

  await soundtrack?.ready;
  recorder.start(250);
  if(hasAudio)soundtrack.start(timeline,kind);
  const begin=performance.now();
  let lastProgress=-1;
  try{
    await new Promise(resolve=>{
      const tick=now=>{
        const t=Math.min(timeline.total,(now-begin)/1000);
        if(movieVideo&&t>=timeline.intro&&!videoStarted){
          videoStarted=true;
          movieVideo.play().catch(err=>{
            videoFailed=true;
            diag('movie-video-play-fallback',{name:err?.name||'Error',message:String(err?.message||err)});
          });
        }
        if(movieVideo&&!videoPaused&&t>=timeline.intro+timeline.slow){
          videoPaused=true;
          try{movieVideo.pause();}catch(e){}
        }
        if(movieVideo&&t>=timeline.intro&&t<timeline.intro+timeline.slow){
          const current=Number(movieVideo.currentTime)||0;
          if(current>lastVideoTime+.015){
            lastVideoTime=current;
            lastVideoProgressAt=t;
          }
        }
        drawSpecialMovieFrame(ctx,{
          kind,t,timeline,still,video:movieVideo,
          // Recover visually if Chrome leaves the source video frozen.
          videoReady:()=>!videoFailed&&(!replayImages.length||t-lastVideoProgressAt<.35),
          replayImages,
          replayMode:storedReplay?.mode||replay.replayMode||'forward',
          particles,w,h
        });
        const percent=Math.min(99,Math.floor(t/timeline.total*100));
        if(percent!==lastProgress&&percent%4===0){
          lastProgress=percent;
          onProgress?.(percent);
        }
        if(t>=timeline.total)return resolve();
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    try{movieVideo?.pause();}catch(e){}
    recorder.stop();
    const blob=await finished;
    onProgress?.(100);
    if(!blob.size)throw new Error('生成したムービーが空でした');
    const format=await specialMovieDetectFormat(blob);
    if(!format)throw new Error('生成したムービーの形式を確認できませんでした');
    return {blob:new Blob([blob],{type:format==='mp4'?'video/mp4':'video/webm'}),format,withSound:hasAudio,usedSource:(!!movieVideo&&!videoFailed)||replayImages.length>=2,width:w,height:h};
  }finally{
    try{
      if(recorder.state!=='inactive')recorder.stop();
    }catch(e){}
    source?.cleanup?.();
    stream.getTracks().forEach(t=>t.stop());
  }
}
async function saveCurrentSpecialMovie(){
  const replay=currentMiracleReplay;
  if(!replay||!['miracle','reversal'].includes(replay.kind))return;
  const key=specialMovieExportKey(replay);
  clearTimeout(miracleAutoCloseTimer);
  miracleAutoCloseTimer=null;

  if(specialMovieBlob&&specialMovieKey===key){
    downloadSpecialMovie();
    setSpecialMovieStatus('');
    return;
  }
  if(specialMovieGenerating)return;

  if(!specialMovieSupported()){
    setSpecialMovieStatus('このブラウザではムービー保存を利用できません','error');
    return;
  }

  // Unlock Web Audio while we still have the user's direct click.
  const soundtrack=createSpecialMovieSoundtrack();
  specialMovieGenerating=true;
  const generation=++specialMovieGenerationToken;
  setSpecialMovieButtons('🎬 生成中…',true);
  setSpecialMovieStatus('ムービーを準備しています…');
  try{
    const result=await renderSpecialMovie(replay.kind,replay,p=>{
      if(generation===specialMovieGenerationToken)setSpecialMovieStatus('ムービー生成中… '+p+'%');
    },soundtrack);
    if(generation!==specialMovieGenerationToken)return;
    if(specialMovieUrl)URL.revokeObjectURL(specialMovieUrl);
    specialMovieBlob=result.blob;
    specialMovieUrl=URL.createObjectURL(result.blob);
    specialMovieKey=key;
    setSpecialMovieButtons('↓ ムービーをもう一度保存',false);
    // Do not cover the resulting photo with technical success messages.
    setSpecialMovieStatus('');
    downloadSpecialMovie();
    diag('movie-export-success',{kind:replay.kind,usedSource:result.usedSource,size:result.blob.size,format:result.format,withSound:result.withSound,width:result.width,height:result.height});
  }catch(err){
    if(generation!==specialMovieGenerationToken)return;
    console.error(err);
    setSpecialMovieButtons('🎬 ムービー保存',false);
    setSpecialMovieStatus(err?.message||'ムービーを作成できませんでした','error');
    diag('movie-export-error',{kind:replay.kind,name:err?.name||'Error',message:String(err?.message||err)});
  }finally{
    soundtrack?.cleanup();
    if(generation===specialMovieGenerationToken)specialMovieGenerating=false;
  }
}

function sleep(ms){return new Promise(r=>setTimeout(r,ms));}
function waitForPresentedFrame(el,timeout=450){
  return new Promise(resolve=>{
    let done=false;
    const finish=()=>{
      if(done)return;
      done=true;
      clearTimeout(to);
      resolve();
    };
    const to=setTimeout(finish,timeout);
    if(typeof el.requestVideoFrameCallback==='function'){
      try{el.requestVideoFrameCallback(()=>finish());}catch(e){finish();}
    }else{
      requestAnimationFrame(()=>requestAnimationFrame(finish));
    }
  });
}
function waitForVideoEvent(el,name,timeout=4000){
  return new Promise((resolve,reject)=>{
    let done=false;
    const finish=ok=>{
      if(done)return;
      done=true;
      clearTimeout(to);
      el.removeEventListener(name,on);
      ok?resolve():reject(new Error(name+' timeout'));
    };
    const on=()=>finish(true);
    const to=setTimeout(()=>finish(false),timeout);
    el.addEventListener(name,on,{once:true});
  });
}
async function seekReplayVideo(el,time,token,timeout=1800){
  if(token!==miracleSequenceToken)return false;
  const duration=Number.isFinite(el.duration)&&el.duration>0?el.duration:null;
  const safe=duration?Math.max(0,Math.min(duration-.04,Number(time)||0)):Math.max(0,Number(time)||0);

  if(Math.abs((el.currentTime||0)-safe)<=.025){
    await waitForPresentedFrame(el,300);
    return token===miracleSequenceToken;
  }

  const ok=await new Promise(resolve=>{
    let done=false;
    let to=null;
    const finish=value=>{
      if(done)return;
      done=true;
      clearTimeout(to);
      el.removeEventListener('seeked',onSeeked);
      el.removeEventListener('timeupdate',onTimeUpdate);
      resolve(value);
    };
    const closeEnough=()=>Math.abs((el.currentTime||0)-safe)<=.12;
    const onSeeked=()=>finish(closeEnough());
    const onTimeUpdate=()=>{if(closeEnough())finish(true);};
    el.addEventListener('seeked',onSeeked);
    el.addEventListener('timeupdate',onTimeUpdate);
    to=setTimeout(()=>finish(closeEnough()),timeout);
    try{el.currentTime=safe;}catch(e){finish(false);}
  });
  if(!ok||token!==miracleSequenceToken)return false;
  await waitForPresentedFrame(el,350);
  return token===miracleSequenceToken;
}
function replaySourceUrl(){
  return objectUrl || video?.currentSrc || video?.src || '';
}
function replaySourceAvailable(){
  const src=replaySourceUrl();
  const key=activeCreation?.sourceKey||null;
  return !!(src&&lastFile&&activeCreation?.times?.length&&key&&replaySourceKey===key&&currentSourceKey===key);
}
function primeMiracleReplaySource(x){
  const warmupId=++replayWarmupGeneration;
  const sequenceAtPrime=miracleSequenceToken;
  let key=x?.sourceKey||null;
  // Backward compatibility for a roulette created earlier in this same session.
  if(!key&&x&&currentCreation&&x.id===currentCreation.id&&currentSourceKey){
    key=currentSourceKey;
    x.sourceKey=key;
  }
  const canUse=!!(x&&key&&lastFile&&objectUrl&&currentSourceKey===key);
  replaySourceKey=canUse?key:null;
  diag('prime-source',{
    canUse,
    creationHasKey:!!key,
    currentHasKey:!!currentSourceKey,
    keyMatches:!!(key&&currentSourceKey&&key===currentSourceKey),
    hasObjectUrl:!!objectUrl,
    hasLastFile:!!lastFile
  });
  try{miracleVideo.pause();}catch(e){}
  if(!canUse){
    miracleVideo.removeAttribute('src');
    miracleVideo.load();
    return;
  }
  if(miracleVideo.src!==objectUrl){
    miracleVideo.src=objectUrl;
    miracleVideo.load();
  }
  miracleVideo.muted=true;
  miracleVideo.playbackRate=MIRACLE_REPLAY_RATE;

  // Warm up the blob-backed video while preparePlay is still reached from
  // the user's PLAY tap. This substantially reduces later Android play() failures.
  try{
    diag('warmup-start',{readyState:miracleVideo.readyState});
    const warm=miracleVideo.play();
    if(warm&&typeof warm.then==='function'){
      warm.then(()=>{
        if(warmupId!==replayWarmupGeneration||sequenceAtPrime!==miracleSequenceToken){
          diag('warmup-finished',{action:'leave-playing-state-alone'});
          return;
        }
        miracleVideo.pause();
        try{miracleVideo.currentTime=0;}catch(e){}
        diag('warmup-finished',{action:'paused-at-zero'});
      }).catch(err=>diag('warmup-error',{name:err?.name||'Error',message:String(err?.message||err)}));
    }
  }catch(err){
    diag('warmup-error',{name:err?.name||'Error',message:String(err?.message||err)});
  }
}
function cancelMiracleSequence(clearReplay=false){
  replayWarmupGeneration++;
  miracleSequenceToken++;
  clearTimeout(miracleAutoCloseTimer);
  miracleAutoCloseTimer=null;
  try{miracleVideo.pause();}catch(e){}
  if(clearReplay)currentMiracleReplay=null;
}
function hideMiracleOverlay(clearReplay=false){
  cancelMiracleSequence(clearReplay);
  miracleOverlay.className='';
  document.body.classList.remove('labMiracleOpen');
  miracleKicker.textContent='';
  miracleTitle.textContent='';
  miracleSub.textContent='';
  miracleSparkles.innerHTML='';
  miracleConfetti.innerHTML='';
  miracleStill.removeAttribute('src');
  miracleBackdropImage.removeAttribute('src');
  miracleStill.style.display='none';
  miracleVideo.style.display='none';
}
async function attemptReplay(src,targetTime,token,forceReload=false){
  if(token!==miracleSequenceToken)return false;
  replayWarmupGeneration++;
  diag('forward-attempt-start',{targetTime:Number(targetTime)||0,forceReload,readyState:miracleVideo.readyState});
  try{
    miracleVideo.pause();
    if(forceReload||miracleVideo.src!==src){
      miracleVideo.removeAttribute('src');
      miracleVideo.load();
      miracleVideo.src=src;
      miracleVideo.load();
    }
    if(miracleVideo.readyState<1){
      await waitForVideoEvent(miracleVideo,'loadedmetadata',5000);
    }
    if(token!==miracleSequenceToken)return false;

    const duration=Number.isFinite(miracleVideo.duration)&&miracleVideo.duration>0
      ? miracleVideo.duration
      : video.duration;
    if(!Number.isFinite(duration)||duration<=0){
      diag('forward-attempt-error',{targetTime:Number(targetTime)||0,forceReload,name:'InvalidDuration'});
      return false;
    }

    const target=Math.max(0,Math.min(duration-.04,Number(targetTime)||0));
    const start=Math.max(0,target-MIRACLE_REPLAY_LEAD_SECONDS);
    const availableLead=Math.max(.04,target-start);
    const replayRate=availableLead<.9?Math.max(.18,availableLead/2.4):MIRACLE_REPLAY_RATE;

    const sought=await seekReplayVideo(miracleVideo,start,token,1800);
    if(!sought){
      diag('forward-seek-failed',{target,start,forceReload,currentTime:Number((miracleVideo.currentTime||0).toFixed(3))});
      return false;
    }
    if(token!==miracleSequenceToken)return false;

    miracleVideo.muted=true;
    miracleVideo.playbackRate=replayRate;
    miracleReplayLabel.textContent=(Math.round(replayRate*100)/100)+'× SLOW REPLAY';
    await miracleVideo.play();
    diag('forward-play-started',{target,start,replayRate,forceReload,readyState:miracleVideo.readyState});

    let reachedTarget=false;
    let stopReason='unknown';
    const expectedMs=((target-start)/Math.max(.1,replayRate))*1000;
    const maxMs=Math.min(14000,Math.max(3500,expectedMs+2600));
    const began=performance.now();
    let lastProgressAt=began;
    let lastTime=miracleVideo.currentTime;

    await new Promise(resolve=>{
      let raf=0;
      const finish=reason=>{
        stopReason=reason;
        try{miracleVideo.pause();}catch(e){}
        cancelAnimationFrame(raf);
        resolve();
      };
      const tick=()=>{
        if(token!==miracleSequenceToken)return finish('cancelled');
        const now=performance.now();
        const t=miracleVideo.currentTime||0;
        if(t>lastTime+.012){
          lastTime=t;
          lastProgressAt=now;
        }
        if(t>=target-.05){
          reachedTarget=true;
          return finish('target');
        }
        if(miracleVideo.ended){
          reachedTarget=t>=target-.15;
          return finish(reachedTarget?'ended-at-target':'ended-early');
        }
        if(now-began>maxMs)return finish('watchdog-timeout');
        if(now-lastProgressAt>1900)return finish('stalled');
        raf=requestAnimationFrame(tick);
      };
      tick();
    });

    const ok=token===miracleSequenceToken&&reachedTarget;
    diag('forward-attempt-end',{
      ok,reason:stopReason,target,start,replayRate,forceReload,
      currentTime:Number((miracleVideo.currentTime||0).toFixed(3))
    });
    return ok;
  }catch(err){
    diag('forward-attempt-error',{targetTime:Number(targetTime)||0,forceReload,name:err?.name||'Error',message:String(err?.message||err)});
    console.warn('miracle replay attempt failed',err);
    try{miracleVideo.pause();}catch(e){}
    return false;
  }
}
async function captureReverseReplayFrames(src,targetTime,token){
  if(token!==miracleSequenceToken)return null;
  diag('reverse-capture-start',{targetTime:Number(targetTime)||0});
  try{
    miracleVideo.pause();
    if(miracleVideo.src!==src){
      miracleVideo.removeAttribute('src');
      miracleVideo.load();
      miracleVideo.src=src;
      miracleVideo.load();
    }
    if(miracleVideo.readyState<1){
      await waitForVideoEvent(miracleVideo,'loadedmetadata',5000);
    }
    if(token!==miracleSequenceToken)return null;

    const duration=Number.isFinite(miracleVideo.duration)&&miracleVideo.duration>0
      ? miracleVideo.duration
      : video.duration;
    if(!Number.isFinite(duration)||duration<=0)return null;

    const target=Math.max(0,Math.min(duration-.04,Number(targetTime)||0));
    const endTime=Math.min(duration-.04,target+MIRACLE_REPLAY_LEAD_SECONDS);
    const span=endTime-target;
    if(span<.55)return null;

    const canvas=document.createElement('canvas');
    const maxW=420;
    const scale=Math.min(1,maxW/(miracleVideo.videoWidth||maxW));
    canvas.width=Math.max(2,Math.round((miracleVideo.videoWidth||maxW)*scale));
    canvas.height=Math.max(2,Math.round((miracleVideo.videoHeight||maxW)*scale));
    const c=canvas.getContext('2d');

    const count=Math.max(12,Math.min(18,Math.ceil(span/.18)));
    const frames=[];
    miracleReplayLabel.textContent='↶ REVERSE REPLAY · PREPARING';
    miracleSub.textContent='逆再生を準備中…';

    // Capture real source-video frames first. We later show them in reverse,
    // rather than relying on Android to repaint a video element after rapid seeks.
    for(let n=0;n<count;n++){
      if(token!==miracleSequenceToken)return null;
      const p=count===1?0:n/(count-1);
      const t=target+span*p;
      const sought=await seekReplayVideo(miracleVideo,t,token,1500);
      if(!sought){
        diag('reverse-seek-failed',{targetTime:Number(targetTime)||0,captureTime:t,index:n});
        continue;
      }
      if(token!==miracleSequenceToken)return null;
      try{
        c.drawImage(miracleVideo,0,0,canvas.width,canvas.height);
        frames.push(canvas.toDataURL('image/jpeg',.82));
      }catch(e){}
    }
    const result=frames.length>=3?frames:null;
    diag('reverse-capture-end',{ok:!!result,frames:frames.length,targetTime:Number(targetTime)||0});
    return result;
  }catch(err){
    diag('reverse-capture-error',{targetTime:Number(targetTime)||0,name:err?.name||'Error',message:String(err?.message||err)});
    console.warn('reverse frame capture failed',err);
    return null;
  }
}
async function replayReverseTowardTarget(src,targetTime,token){
  const frames=await captureReverseReplayFrames(src,targetTime,token);
  if(!frames||token!==miracleSequenceToken){
    diag('reverse-replay-end',{ok:false,targetTime:Number(targetTime)||0});
    return false;
  }

  miracleVideo.style.display='none';
  miracleStill.style.display='block';
  miracleReplayLabel.textContent='↶ REVERSE SLOW REPLAY';
  miracleKicker.textContent='特別な一瞬へ';
  miracleSub.textContent='逆再生で近づいています';

  const reversed=frames.slice().reverse();
  // About 6 seconds of clearly visible reverse motion.
  const hold=Math.max(320,Math.min(480,6000/reversed.length));
  for(const frame of reversed){
    if(token!==miracleSequenceToken)return false;
    miracleStill.src=frame;
    miracleBackdropImage.src=frame;
    await sleep(hold);
  }
  const ok=token===miracleSequenceToken;
  diag('reverse-replay-end',{ok,targetTime:Number(targetTime)||0,frames:frames.length});
  return ok;
}
async function runForwardSourceReplay(targetTime,token){
  if(!replaySourceAvailable()){
    diag('forward-source-unavailable',{targetTime:Number(targetTime)||0,...safeReplayState()});
    return false;
  }
  const src=replaySourceUrl();
  miracleReplayLabel.textContent='0.42× SLOW REPLAY';
  miracleVideo.style.display='block';
  miracleStill.style.display='none';
  miracleVideo.muted=true;
  miracleVideo.playbackRate=MIRACLE_REPLAY_RATE;

  if(await attemptReplay(src,targetTime,token,false))return true;
  if(token!==miracleSequenceToken)return false;

  miracleReplayLabel.textContent='0.42× SLOW REPLAY · RETRY';
  await sleep(180);
  if(token!==miracleSequenceToken)return false;
  if(await attemptReplay(src,targetTime,token,true))return true;
  if(token!==miracleSequenceToken)return false;

  miracleReplayLabel.textContent='0.42× SLOW REPLAY · RETRY 2';
  await sleep(260);
  if(token!==miracleSequenceToken)return false;
  return await attemptReplay(src,targetTime,token,true);
}

async function runReverseSourceReplay(targetTime,token){
  if(!replaySourceAvailable()){
    diag('reverse-source-unavailable',{targetTime:Number(targetTime)||0,...safeReplayState()});
    return false;
  }
  return await replayReverseTowardTarget(replaySourceUrl(),targetTime,token);
}

async function replayStoredDeckFrames(token){
  const candidateId=activeCreation?.deckCandidateIds?.[currentIndex];
  if(!candidateId||typeof window.__memoryDeckLoadReplay!=='function')return false;
  let stored=null;
  try{
    const sourceId=activeCreation?.deckSourceIds?.[currentIndex]||null;
    const targetTime=Number(activeCreation?.times?.[currentIndex])||0;
    stored=typeof window.__memoryDeckEnsureReplay==='function'
      ? await window.__memoryDeckEnsureReplay(candidateId,sourceId,targetTime)
      : await window.__memoryDeckLoadReplay(candidateId);
  }catch(e){return false;}
  if(token!==miracleSequenceToken)return false;
  const seq=stored?.frames;
  if(!Array.isArray(seq)||seq.length<2)return false;
  const mode=stored.mode||activeCreation?.deckReplayModes?.[currentIndex]||'forward';
  const span=Math.max(.04,Number(stored.span)||Number(activeCreation?.deckReplaySpans?.[currentIndex])||MIRACLE_REPLAY_LEAD_SECONDS);
  miracleVideo.style.display='none';
  miracleStill.style.display='block';
  miracleReplayLabel.textContent=mode==='reverse'?'↶ REVERSE 0.42× REPLAY':'0.42× SLOW REPLAY';
  miracleKicker.textContent='特別な一瞬へ';
  miracleSub.textContent=mode==='reverse'?'逆再生で近づいています':'保存した連続コマをスロー再生中';
  const totalMs=(span/Math.max(.1,MIRACLE_REPLAY_RATE))*1000;
  const hold=Math.max(120,Math.min(850,totalMs/seq.length));
  let shown=0;
  for(const src of seq){
    if(token!==miracleSequenceToken)return false;
    if(!src)continue;
    miracleStill.src=src;
    miracleBackdropImage.src=src;
    shown++;
    await sleep(hold);
  }
  const ok=shown>=2&&token===miracleSequenceToken;
  diag('stored-deck-replay-end',{ok,mode,framesShown:shown,span,candidateId});
  return ok;
}
async function replayReverseFramesFallback(targetTime,token){
  const target=Math.max(0,Number(targetTime)||0);
  if(target>=EARLY_REPLAY_THRESHOLD){
    diag('sparse-fallback-blocked',{targetTime:target,reason:'mid-video-guard'});
    return false;
  }

  const times=activeCreation?.times||[];
  const frames=activeCreation?.frames||[];
  if(!times.length||!frames.length)return false;

  const order=times.map((t,i)=>({t:Number(t)||0,i})).sort((a,b)=>a.t-b.t);
  const at=order.reduce((best,x,idx)=>
    Math.abs(x.t-target)<Math.abs(order[best].t-target)?idx:best,0);
  let seq=order.slice(at,Math.min(order.length,at+6)).reverse();
  if(seq.length<2&&order.length>1){
    seq=order.slice(at,Math.min(order.length,at+2)).reverse();
  }
  if(!seq.length)return false;

  miracleVideo.style.display='none';
  miracleStill.style.display='block';
  miracleReplayLabel.textContent='↶ REVERSE REPLAY';
  miracleKicker.textContent='特別な一瞬へ';
  miracleSub.textContent='逆向きフレームリプレイ';

  const hold=Math.max(500,Math.min(800,3000/seq.length));
  let shown=0;
  for(const x of seq){
    if(token!==miracleSequenceToken)return false;
    const src=frames[x.i];
    if(!src)continue;
    miracleStill.src=src;
    miracleBackdropImage.src=src;
    shown++;
    await sleep(hold);
  }
  const ok=shown>0&&token===miracleSequenceToken;
  diag('reverse-frames-fallback-end',{ok,targetTime:target,framesShown:shown});
  return ok;
}
async function executeReplayPlan(targetTime,token,frameSrc){
  const deckCandidateId=activeCreation?.deckCandidateIds?.[currentIndex];
  const canTryStoredDeckReplay=!!(
    activeCreation?.deckMode&&
    deckCandidateId&&
    typeof window.__memoryDeckLoadReplay==='function'
  );
  // The replay store itself is the source of truth. Try it whenever a deck
  // candidate exists; if the optional frames are not there yet, fall back
  // naturally to the special-photo treatment with no user-facing error state.
  const plan=canTryStoredDeckReplay
    ? {route:'stored-deck-frames',early:(activeCreation?.deckReplayModes?.[currentIndex]==='reverse'),targetTime:Math.max(0,Number(targetTime)||0)}
    : replayPlan(targetTime,replaySourceAvailable());
  lastReplayPlan=plan;
  diag('plan',{...plan,sourceState:safeReplayState()});

  let replayed=false;
  if(plan.route==='stored-deck-frames'){
    replayed=await replayStoredDeckFrames(token);
  }else if(plan.route==='reverse-source'){
    replayed=await runReverseSourceReplay(targetTime,token);
    if(!replayed&&token===miracleSequenceToken){
      diag('fallback',{from:'reverse-source',to:'reverse-frames',targetTime:plan.targetTime});
      replayed=await replayReverseFramesFallback(targetTime,token);
    }
  }else if(plan.route==='forward-source'){
    replayed=await runForwardSourceReplay(targetTime,token);
    if(!replayed&&token===miracleSequenceToken){
      // Mid-video must never degrade into sparse slideshow.
      diag('fallback',{from:'forward-source',to:'photo-only',targetTime:plan.targetTime});
    }
  }else if(plan.route==='reverse-frames'){
    replayed=await replayReverseFramesFallback(targetTime,token);
  }

  if(token!==miracleSequenceToken)return {ok:false,plan};

  if(!replayed){
    miracleVideo.style.display='none';
    miracleStill.style.display='block';
    miracleStill.src=frameSrc;
    miracleBackdropImage.src=frameSrc;
    miracleReplayLabel.textContent='SPECIAL PHOTO';
    miracleSub.textContent='この一枚をゆっくり表示します';
    try{
      miracleStill.getAnimations?.().forEach(x=>x.cancel());
      miracleStill.animate?.(
        [{transform:'scale(1.015)'},{transform:'scale(1.075)'}],
        {duration:1050,easing:'ease-out',fill:'forwards'}
      );
    }catch(e){}
    await sleep(850);
  }

  diag('replay-finished',{ok:replayed,route:plan.route,targetTime:plan.targetTime});
  return {ok:replayed,plan};
}

function showFinalMiraclePhoto(kind,frameSrc){
  diag('final-photo',{kind,route:lastReplayPlan?.route||null,targetTime:lastReplayPlan?.targetTime??null});

  try{miracleVideo.pause();}catch(e){}
  clearTimeout(miracleAutoCloseTimer);
  miracleVideo.style.display='none';
  miracleStill.src=frameSrc;
  miracleBackdropImage.src=frameSrc;
  miracleStill.style.display='block';
  miracleOverlay.className='show final-photo '+(kind==='reversal'?'reversal-mode':'miracle-mode');
  fillMiracleSparkles(kind);

  movieResultBtn.style.display='block';
  setSpecialMovieStatus('');
  setSpecialMovieButtons(specialMovieBlob&&specialMovieKey===specialMovieExportKey(currentMiracleReplay)
    ?'↓ ムービーをもう一度保存':'🎬 ムービー保存',false);

  if(kind==='reversal'){
    // Until this moment the normal result card intentionally remains "大凶".
    applySpecialFortuneDisplay('reversal','大凶');
    miracleKicker.textContent='大凶かと思ったら…';
    miracleTitle.textContent='大逆転大吉！';
    miracleSub.textContent='🌈 SPECIAL FORTUNE 🌈';
    playSpecialSound('reversal');
    if(navigator.vibrate)navigator.vibrate([120,40,120,40,220,60,320]);
  }else{
    const baseFortune=currentMiracleReplay?.fortune||currentLab?.fortune||'吉';
    // The special moment is itself the rare fortune: 特大吉.
    applySpecialFortuneDisplay('miracle',baseFortune);
    miracleKicker.textContent='特別な一瞬を引きました';
    miracleTitle.textContent='特大吉！';
    miracleSub.textContent='✨ SPECIAL FORTUNE ✨';
    playSpecialSound('miracle');
    if(navigator.vibrate)navigator.vibrate([90,45,120,55,180,60,260]);
  }
  // Keep the full-screen photo long enough to enjoy, then fully remove
  // the overlay so no invisible layer can intercept taps.
  miracleAutoCloseTimer=setTimeout(()=>{
    if(miracleOverlay.classList.contains('final-photo')){
      hideMiracleOverlay(false);
      dockResult();
    }
  },4200);
}
async function playMiracleSequence(kind,replayAgain=false){
  clearTimeout(miracleAutoCloseTimer);
  miracleAutoCloseTimer=null;
  const frameSrc=currentMiracleReplay?.frameSrc||(playImageEl.currentSrc||playImageEl.src);
  const targetTime=currentMiracleReplay?.targetTime??Number(activeCreation?.times?.[currentIndex]);
  const replayFortune=currentMiracleReplay?.fortune||currentLab?.fortune||null;
  // Preserve the captured candidate ID, replay mode and source file mapping.
  // Replacing this object used to turn exported slow replay into a static photo.
  currentMiracleReplay={
    ...currentMiracleReplay,kind,frameSrc,targetTime,index:currentIndex,fortune:replayFortune
  };
  const token=++miracleSequenceToken;
  const spec=specialSequenceSpec(kind,currentMiracleReplay);

  document.body.classList.add('labMiracleOpen');
  miracleStill.style.display='none';
  miracleVideo.style.display='none';
  miracleBackdropImage.src=frameSrc;
  miracleSparkles.innerHTML='';
  miracleConfetti.innerHTML='';

  miracleOverlay.className='show '+(kind==='reversal'?'reversal-wait-mode':'miracle-intro-mode');
  miracleKicker.textContent=replayAgain?'もう一度、その瞬間へ':spec.intro.kicker;
  miracleTitle.textContent=replayAgain?(kind==='reversal'?'大逆転の瞬間':'特大吉の一瞬'):spec.intro.title;
  miracleSub.textContent=replayAgain?'まもなくスローリプレイ':spec.intro.sub;
  if(kind==='reversal'&&!replayAgain&&navigator.vibrate)navigator.vibrate([70,80,70]);
  await sleep(replayAgain?280:Math.round(spec.introDuration*1000));
  if(token!==miracleSequenceToken)return;

  miracleOverlay.className='show replay-mode '+(kind==='reversal'?'reversal-replay':'miracle-replay');
  miracleKicker.textContent=spec.replay.kicker;
  miracleTitle.textContent=spec.replay.title;
  miracleSub.textContent=spec.replay.sub;
  miracleReplayLabel.textContent=spec.replay.sub;

  await executeReplayPlan(targetTime,token,frameSrc);
  if(token!==miracleSequenceToken)return;

  showFinalMiraclePhoto(kind,frameSrc);
}
function undockResult(){
  clearTimeout(dockTimer);
  dockTimer=null;
  if(rouletteBadgeEl.parentElement!==stageEl){
    stageEl.appendChild(rouletteBadgeEl);
  }
  rouletteBadgeEl.classList.remove('labPlainDocked');
  if(resultCardEl.parentElement!==stageEl){
    stageEl.insertBefore(resultCardEl,rouletteBadgeEl);
  }
  resultCardEl.classList.remove('labDocked');
  resultDock.classList.remove('show');
}
function dockResult(){
  if(running||!currentLab)return;
  if(currentLab.plain){
    resultDock.appendChild(rouletteBadgeEl);
    rouletteBadgeEl.classList.add('labPlainDocked');
    resultDock.classList.add('show');
    return;
  }
  resultDock.appendChild(resultCardEl);
  resultCardEl.classList.add('labDocked');
  resultDock.classList.add('show');
}
function clearSpecial(){
  clearTimeout(rareTimer);
  rareTimer=null;
  resetSpecialMovieExport();
  movieResultBtn.style.display='none';
  stageEl.classList.remove('lab-miracle','lab-reversal');
  hideMiracleOverlay(true);
  replaySpecialBtn.style.display='none';
}
function clearLab(){
  clearSpecial();
  undockResult();
  setSpecialResultStyle(null);
  extra.style.display='none';
  specialLine.style.display='none';
  currentLab=null;
}
function showMiracle(kind){
  const frameSrc=playImageEl.currentSrc||playImageEl.src;
  const targetTime=Number(activeCreation?.times?.[currentIndex]);
  currentMiracleReplay={
    kind,frameSrc,targetTime,index:currentIndex,fortune:currentLab?.fortune||null,
    replayCandidateId:activeCreation?.deckCandidateIds?.[currentIndex]||null,
    replayMode:activeCreation?.deckReplayModes?.[currentIndex]||null,
    replaySpan:activeCreation?.deckReplaySpans?.[currentIndex]||0,
    sourceVideoId:activeCreation?.deckSourceIds?.[currentIndex]||null
  };
  replaySpecialBtn.style.display='block';

  if(kind==='miracle'){
    stageEl.classList.add('lab-miracle');
    specialLine.textContent='✨ '+randomOf(MIRACLE_MESSAGES);
    specialLine.className='miracle';
  }else{
    stageEl.classList.add('lab-reversal');
    specialLine.textContent='🌈 '+randomOf(REVERSAL_MESSAGES);
    specialLine.className='reversal';
  }
  specialLine.style.display='block';
  playMiracleSequence(kind,false);
}

async function replayMiracleImmediately(){
  if(!currentMiracleReplay)return;

  clearTimeout(miracleAutoCloseTimer);
  miracleAutoCloseTimer=null;

  const replay=currentMiracleReplay;
  const token=++miracleSequenceToken;

  document.body.classList.add('labMiracleOpen');
  miracleOverlay.className='show replay-mode '+(replay.kind==='reversal'?'reversal-replay':'miracle-replay');
  miracleKicker.textContent='もう一度、その瞬間へ';
  miracleTitle.textContent='';
  miracleSub.textContent='0.5× SLOW REPLAY';
  miracleReplayLabel.textContent='0.5× SLOW REPLAY';
  miracleSparkles.innerHTML='';
  miracleConfetti.innerHTML='';
  miracleStill.style.display='none';
  miracleBackdropImage.src=replay.frameSrc;

  try{miracleVideo.pause();}catch(e){}

  await executeReplayPlan(replay.targetTime,token,replay.frameSrc);
  if(token!==miracleSequenceToken)return;

  showFinalMiraclePhoto(replay.kind,replay.frameSrc);
}

miracleMovieBtn.addEventListener('click',e=>{
  e.preventDefault();e.stopPropagation();
  saveCurrentSpecialMovie();
});
movieResultBtn.addEventListener('click',e=>{
  e.preventDefault();e.stopPropagation();
  saveCurrentSpecialMovie();
});

miracleReplayAgain.addEventListener('pointerdown',e=>{
  e.preventDefault();
  e.stopPropagation();
  replayMiracleImmediately();
},{passive:false});
replaySpecialBtn.addEventListener('pointerdown',e=>{
  e.preventDefault();
  e.stopPropagation();
  replayMiracleImmediately();
},{passive:false});
const closeMiracle=()=>{
  hideMiracleOverlay(false);
  dockResult();
};
miracleBack.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();closeMiracle();});

// Standalone GIF page: use saved candidate frames, independent of the active roulette.
function gifFrameGroups(){
  return gifSourceCatalog.map(src=>({
    key:src.id,label:src.label,count:src.count,thumbnail:src.thumbnail,
    origin:src.origin,dateMs:src.dateMs,dateLabel:src.dateLabel,
    monthKey:src.monthKey,monthLabel:src.monthLabel,
    items:gifLoadedSourceKey===src.id?gifLoadedFrames:[]
  }));
}
function renderGifSourceCards(groups){
  if(!gifSourceGrid)return;
  const q=(gifSearch?.value||'').trim().toLowerCase();
  const oldest=gifSort?.value==='oldest';
  const visible=groups.filter(g=>!q||[g.label,g.dateLabel,g.monthLabel,g.origin==='legacy'?'旧履歴':'動画'].join(' ').toLowerCase().includes(q))
    .sort((a,b)=>oldest?a.dateMs-b.dateMs:b.dateMs-a.dateMs);
  const signature=JSON.stringify(visible.map(g=>[g.key,g.label,g.count,g.monthKey]));
  if(gifChooserSignature!==signature){
    gifChooserSignature=signature;
    gifSourceGrid.replaceChildren();
    let month=null,grid=null;
    for(const g of visible){
      if(month!==g.monthKey){
        month=g.monthKey;
        const section=document.createElement('section');section.className='deckMonthGroup';
        const head=document.createElement('div');head.className='deckMonthHead';
        const title=document.createElement('strong');title.textContent=g.monthLabel||'保存済み動画';
        const count=document.createElement('span');
        count.textContent=visible.filter(v=>v.monthKey===month).length+'本';
        head.append(title,count);
        grid=document.createElement('div');grid.className='deckVideoGrid';
        section.append(head,grid);gifSourceGrid.appendChild(section);
      }
      const tile=document.createElement('article');
      tile.className='deckVideoTile';tile.dataset.sourceKey=g.key;
      const button=document.createElement('button');
      button.type='button';button.className='deckVideoPick';
      button.setAttribute('aria-pressed','false');
      button.setAttribute('aria-label',g.label+'、'+g.count+'コマからGIFを作る');
      const media=document.createElement('div');media.className='deckVideoThumb';
      if(g.thumbnail){
        const img=document.createElement('img');
        img.src=g.thumbnail;img.alt='';img.loading='lazy';img.decoding='async';
        media.appendChild(img);
      }
      const icon=document.createElement('span');icon.className='deckVideoIcon';icon.textContent=g.origin==='legacy'?'▤':'▶';
      const check=document.createElement('span');check.className='deckVideoCheck';check.textContent='✓';
      media.append(icon,check);
      const info=document.createElement('div');info.className='deckVideoInfo';
      const name=document.createElement('strong');name.textContent=g.label;
      const note=document.createElement('small');
      note.textContent=g.count+'コマ'+(g.origin==='legacy'?' ・ 旧履歴':'');
      info.append(name,note);button.append(media,info);tile.appendChild(button);grid.appendChild(tile);
      button.addEventListener('click',()=>{
        if(gifSource.value===g.key&&gifLoadedFrames.length>=2&&gifLoadedSourceKey===g.key){
          gifEditor.hidden=false;gifEditor.scrollIntoView({behavior:'smooth',block:'start'});
          return;
        }
        gifSource.value=g.key;
        clearGifResult();
        gifStatus.style.display='none';
        syncGifSourceChooser();loadGifSource(g.key);
      });
    }
    if(!visible.length){
      const note=document.createElement('p');note.className='note';
      note.textContent=groups.length?'検索条件に合う動画はありません。':'保存した動画がありません。新しい動画を選んでください。';
      gifSourceGrid.appendChild(note);
    }
  }
  gifSourceGrid.querySelectorAll('.deckVideoTile').forEach(tile=>{
    const active=tile.dataset.sourceKey===gifSource.value;
    tile.classList.toggle('selected',active);
    tile.querySelector('.deckVideoPick')?.setAttribute('aria-pressed',String(active));
  });
}
function syncGifSourceChooser(){
  if(!gifSourceWrap||!gifSource||!gifSourceNote)return;
  const groups=gifFrameGroups(),old=gifSource.value;
  gifSource.replaceChildren();
  for(const g of groups){
    const option=document.createElement('option');
    option.value=g.key;option.textContent=g.label+'（'+g.count+'コマ）';
    gifSource.appendChild(option);
  }
  if(groups.some(g=>g.key===old))gifSource.value=old;
  else gifSource.selectedIndex=-1;
  gifSourceWrap.style.display=gifPastOpen?'grid':'none';
  renderGifSourceCards(groups);
  const chosen=groups.find(g=>g.key===gifSource.value);
  makeGifBtn.disabled=gifGenerating||gifLoading||!chosen||gifLoadedSourceKey!==chosen.key||gifLoadedFrames.length<2;
  gifFrameInfo.textContent=groups.length
    ? '保存済み：'+groups.length+'本。画像をタップしてGIFにする動画を選んでください。'
    : '過去の動画がありません。新しい動画を選んでください。';
  gifSourceNote.textContent='1本ずつGIFにします。別の動画のコマは混ぜません。';
}
async function loadGifSource(sourceKey){
  const token=++gifLoadToken;
  gifLoading=true;gifLoadedSourceKey=null;gifLoadedFrames=[];
  gifEditor.hidden=true;
  syncGifSourceChooser();
  gifStatus.style.display='block';
  gifStatus.textContent='選んだ動画のコマを読み込んでいます…';
  try{
    const frames=await window.__memoryGifLoadSource?.(sourceKey);
    if(token!==gifLoadToken||document.body.dataset.appView!=='gif')return;
    gifLoadedSourceKey=sourceKey;
    gifLoadedFrames=Array.isArray(frames)?frames:[];
    if(gifLoadedFrames.length<2){
      gifStatus.textContent='GIFには2枚以上の保存画像が必要です。別の動画を選ぶか、新しい動画を追加してください。';
      return;
    }
    const name=gifSourceCatalog.find(g=>g.id===sourceKey)?.label||'選択した動画';
    gifSelectedTitle.textContent=name+'（'+gifLoadedFrames.length+'コマ）';
    gifSelectedFrames.replaceChildren();
    [gifLoadedFrames[0],gifLoadedFrames[Math.floor((gifLoadedFrames.length-1)/2)],gifLoadedFrames[gifLoadedFrames.length-1]].forEach(frame=>{
      const img=document.createElement('img');
      img.src=frame.image;img.alt='選択した動画のコマ';
      gifSelectedFrames.appendChild(img);
    });
    gifEditor.hidden=false;gifStatus.style.display='none';
    gifEditor.scrollIntoView({behavior:'smooth',block:'start'});
  }catch(err){
    if(token!==gifLoadToken)return;
    console.error('GIF source load failed',err);
    gifStatus.textContent='この動画のコマを読み込めませんでした。別の動画を選んでください。';
  }finally{
    if(token===gifLoadToken){gifLoading=false;syncGifSourceChooser();}
  }
}
window.__memoryShareGetGifSource=()=>{
  if(!gifLoadedSourceKey||gifLoadedFrames.length<2)return null;
  return {title:gifSelectedTitle?.textContent||'選択した動画',
    frames:gifLoadedFrames.map(x=>({image:x.image,time:x.time})),
    delay:Math.round(Number(gifSpeed?.value||.2)*100)};
};
window.__memoryGifOpen=async()=>{
  const token=++gifLoadToken;
  clearGifResult();
  gifPastOpen=false;gifSourceCatalog=[];gifLoadedSourceKey=null;gifLoadedFrames=[];
  gifChooserSignature='';gifLoading=true;
  gifPast.hidden=true;gifEditor.hidden=true;
  gifChoosePast?.setAttribute('aria-expanded','false');
  if(gifSearch)gifSearch.value='';
  if(gifSort)gifSort.value='newest';
  gifStatus.style.display='none';
  syncGifSourceChooser();
  try{
    const sources=await window.__memoryGifListSources?.();
    if(token!==gifLoadToken||document.body.dataset.appView!=='gif')return;
    gifSourceCatalog=Array.isArray(sources)?sources:[];
    gifSource.selectedIndex=-1;
    gifChooserSignature='';
  }catch(err){
    if(token!==gifLoadToken)return;
    console.error('GIF video library failed',err);
    gifStatus.style.display='block';
    gifStatus.textContent='保存した動画の一覧を読み込めませんでした。画面を開き直してください。';
  }finally{
    if(token===gifLoadToken){gifLoading=false;syncGifSourceChooser();}
  }
};
window.__memoryGifClose=()=>{
  ++gifLoadToken;gifLoading=false;gifPastOpen=false;
  gifSourceCatalog=[];gifLoadedFrames=[];gifLoadedSourceKey=null;gifChooserSignature='';
  clearGifResult();
};
function openGifPast(){
  gifPastOpen=true;
  gifPast.hidden=false;
  gifChoosePast?.setAttribute('aria-expanded','true');
  syncGifSourceChooser();
  gifPast.scrollIntoView({behavior:'smooth',block:'start'});
}
gifChoosePast?.addEventListener('click',openGifPast);
gifSearch?.addEventListener('input',()=>{gifChooserSignature='';syncGifSourceChooser();});
gifSort?.addEventListener('change',()=>{gifChooserSignature='';syncGifSourceChooser();});
gifChangeVideo?.addEventListener('click',()=>{
  gifEditor.hidden=true;clearGifResult();openGifPast();
});
gifAddVideo?.addEventListener('click',()=>{
  if(!gifFileInput)return;
  gifFileInput.value='';gifFileInput.click();
});
gifFileInput?.addEventListener('change',async()=>{
  const files=Array.from(gifFileInput.files||[]);
  if(!files.length)return;
  gifAddVideo.disabled=true;
  gifEditor.hidden=true;clearGifResult();
  gifStatus.style.display='block';
  gifStatus.textContent='動画からGIF用のコマを抽出しています。端末内で処理します…';
  try{
    const imported=await window.__memoryDeckHandleFiles?.(files,{gifOnly:true});
    if(document.body.dataset.appView!=='gif')return;
    await window.__memoryGifOpen?.();
    if(document.body.dataset.appView!=='gif')return;
    const sourceKey=Array.isArray(imported)?String(imported[0]||''):'';
    if(sourceKey&&gifSourceCatalog.some(g=>g.id===sourceKey)){
      gifSource.value=sourceKey;
      syncGifSourceChooser();
      await loadGifSource(sourceKey);
    }else{
      openGifPast();
      gifStatus.style.display='block';
      gifStatus.textContent='新しく取り込める動画がありませんでした。保存済みの動画を選ぶか形式を確認してください。';
    }
  }catch(err){
    console.error('GIF video import failed',err);
    gifStatus.style.display='block';
    gifStatus.textContent='動画を取り込めませんでした: '+(err?.message||err);
  }finally{
    gifAddVideo.disabled=false;gifFileInput.value='';
  }
});
function renderHistory(){
  historyEl.innerHTML='';
  historyEmpty.style.display=history.length?'none':'block';
  clearHistoryBtn.disabled=!history.length;

  history.forEach((x,i)=>{
    const card=document.createElement('button');
    card.type='button';
    card.className='labHistoryItem';
    const historyLabel=resolvedDisplayFortune(x);
    card.setAttribute('aria-label',(i+1)+'回目 '+historyLabel+' の結果を見る');
    card.innerHTML='<img alt=""><div><strong></strong><span></span><em>結果を見る</em></div>';
    card.querySelector('img').src=x.image;
    card.querySelector('strong').textContent=(i+1)+'回目 ・ '+historyLabel;
    card.querySelector('span').textContent=x.deckMode
      ? (x.sourceName||'動画')+' ・ '+x.time.toFixed(1)+'秒'
      : '元動画 '+x.time.toFixed(1)+'秒';
    card.addEventListener('click',()=>showHistoryEntry(x));
    historyEl.appendChild(card);
  });
  syncGifSourceChooser();
}
function persistDrawHistory(){
  if(!activeCreation?.id)return;
  activeCreation.drawHistory=history.map(x=>{const y={...x};delete y.image;return y;});
  activeCreation.updatedAt=Date.now();
  if(typeof dbPut==='function')dbPut(activeCreation).catch(e=>console.error('draw history save failed',e));
}
function restoreDrawHistory(x){
  const saved=Array.isArray(x?.drawHistory)?x.drawHistory:[];
  history=saved.slice(-40).map(entry=>{
    const idx=Number.isInteger(entry.index)?entry.index:null;
    return {...entry,image:entry.image||(idx!==null?x?.frames?.[idx]:null)||''};
  }).filter(entry=>entry.image);
  renderHistory();
}
function addHistory(item){
  const time=Number(activeCreation?.times?.[currentIndex]);
  history.push({
    image:playImageEl.currentSrc||playImageEl.src,
    time:Number.isFinite(time)?time:currentIndex,
    targetTime:Number.isFinite(time)?time:currentIndex,
    index:currentIndex,
    fortune:item.fortune||null,
    displayFortune:resolvedDisplayFortune(item),
    lucky:item.lucky||null,
    special:item.special||null,
    plain:!!item.plain,
    message:messageEl?.textContent||'',
    deckMode:!!activeCreation?.deckMode,
    sourceVideoId:activeCreation?.deckSourceIds?.[currentIndex]||null,
    sourceName:activeCreation?.deckSourceNames?.[currentIndex]||null,
    replayCandidateId:activeCreation?.deckCandidateIds?.[currentIndex]||null,
    replayMode:activeCreation?.deckReplayModes?.[currentIndex]||null,
    replaySpan:activeCreation?.deckReplaySpans?.[currentIndex]||0,
    drawnAt:Date.now()
  });
  if(history.length>40)history.shift();
  renderHistory();
  persistDrawHistory();
}
function showHistoryEntry(x){
  clearInterval(timer);
  timer=null;
  running=false;
  stageEl.classList.remove('pulse');
  clearSpecial();
  undockResult();
  setSpecialResultStyle(null);

  const idx=Number.isInteger(x.index)?x.index:
    activeCreation?.times?.reduce((best,t,i)=>Math.abs(t-x.time)<Math.abs((activeCreation.times[best]??Infinity)-x.time)?i:best,0);
  if(Number.isInteger(idx))currentIndex=idx;

  playImageEl.src=x.image;
  specialLine.style.display='none';
  specialLine.className='';
  replaySpecialBtn.style.display='none';

  if(x.plain){
    fortuneBadgeEl.style.display='none';
    resultCardEl.style.display='none';
    rouletteBadgeEl.style.display='block';
    rouletteBadgeEl.textContent='この瞬間！';
    currentLab={fortune:null,displayFortune:'この瞬間！',lucky:null,special:null,plain:true,fromHistory:true};
    extra.style.display='none';
  }else{
    fortuneBadgeEl.style.display='block';
    resultCardEl.style.display='block';
    if(x.special){
      applySpecialFortuneDisplay(x.special,x.fortune);
    }else{
      if(resultHeadEl)resultHeadEl.textContent='きょうの運勢';
      fortuneBadgeEl.textContent=(FORTUNE_ICONS[x.fortune]||'🎴')+' '+x.fortune;
      fortuneBadgeEl.style.color=FORTUNE_COLORS[x.fortune]||'#700';
      resultTextEl.textContent=x.fortune;
      resultTextEl.style.color=FORTUNE_COLORS[x.fortune]||'#700';
    }
    messageEl.textContent=x.special==='miracle'
      ? FORTUNE_MESSAGES['特大吉']
      : x.special==='reversal'
        ? '大凶から一転。今日は大逆転大吉！'
        : (x.message||'このときの結果です。');

    currentLab={fortune:x.fortune,displayFortune:resolvedDisplayFortune(x),lucky:x.lucky||pickLucky(),special:x.special,fromHistory:true};
    renderLucky(currentLab.lucky);

    if(x.special){
      currentMiracleReplay={
        kind:x.special,frameSrc:x.image,targetTime:x.targetTime??x.time,index:x.index,fortune:x.fortune||null,
        replayCandidateId:x.replayCandidateId||null,replayMode:x.replayMode||null,replaySpan:x.replaySpan||0,
        sourceVideoId:x.sourceVideoId||null
      };
      replaySpecialBtn.style.display='block';
      movieResultBtn.style.display='block';
      specialLine.textContent=x.special==='reversal'?'🌈 大逆転大吉・特別リプレイ':'✨ 特大吉・特別リプレイ';
      specialLine.className=x.special==='reversal'?'reversal':'miracle';
      specialLine.style.display='block';
    }

    saveBtn.textContent='♡ お気に入りに保存';
    saveBtn.disabled=false;
    extra.style.display='block';
    rouletteBadgeEl.style.display='none';
  }

  const photoAction=document.getElementById('photoAction');
  if(photoAction)photoAction.style.display='inline-flex';

  tapHintEl.textContent='履歴を表示中。写真をタップするとルーレットを再開します';
  dockResult();
  window.__memoryNavigate?.('play');
  document.getElementById('playSection')?.scrollIntoView({behavior:'smooth',block:'start'});
}
function stopGifPreview(){
  if(gifPreviewTimer!==null)clearInterval(gifPreviewTimer);
  gifPreviewTimer=null;
}
// Preview frames directly so large GIF decoding cannot slow down the screen's playback.
// The saved GIF still encodes the same frames and the same selected delay.
function startGifPreview(frames,seconds){
  stopGifPreview();
  if(!frames.length)return;
  let index=0;
  gifPreview.src=frames[0].image;
  gifPreviewTimer=setInterval(()=>{
    if(document.hidden||gifResult.style.display==='none')return;
    const gifSection=document.getElementById('labGifSection');
    if(gifSection&&gifSection.getClientRects().length===0)return;
    index=(index+1)%frames.length;
    gifPreview.src=frames[index].image;
  },Math.round(seconds*1000));
}
function clearGifResult(){
  stopGifPreview();
  closeGifViewer();
  if(gifUrl){
    URL.revokeObjectURL(gifUrl);
    gifUrl=null;
  }
  gifResult.style.display='none';
  gifPreview.removeAttribute('src');
  gifDownload.removeAttribute('href');
  gifFileName='memory-roulette-frames.gif';
  gifGeneration++;
  gifGenerating=false;
}
function showLabResult(){
  if(!activeCreation||running)return;
  if(activeCreation.mode!=='omikuji'){
    currentLab={fortune:null,lucky:null,special:null,displayFortune:'この瞬間！',plain:true};
    addHistory(currentLab);
    clearTimeout(dockTimer);
    if(stageEl.classList.contains('stageLandscape')){
      dockResult();
    }else{
      dockTimer=setTimeout(dockResult,1550);
    }
    return;
  }
  const pending=window.__memoryPendingSpecialResult||null;
  window.__memoryPendingSpecialResult=null;
  const fortune=(pending?.baseFortune||resultTextEl.textContent||'吉').trim();
  const lucky=pickLucky();
  const special=pending ? pending.special : specialFor(fortune);
  const targetTime=Number(activeCreation?.times?.[currentIndex]);

  if(resultHeadEl)resultHeadEl.textContent='きょうの運勢';
  setSpecialResultStyle(null);
  currentLab={fortune,lucky,special,displayFortune:fortune};
  if(special){
    const display=specialFortuneDisplay(special,fortune);
    currentLab.displayFortune=display.fortune;
    if(revealSpecialImmediately(special)){
      applySpecialFortuneDisplay(special,fortune);
    }
  }
  renderLucky(lucky);
  specialLine.style.display='none';
  specialLine.className='';
  replaySpecialBtn.style.display='none';
  saveBtn.textContent='♡ お気に入りに保存';
  saveBtn.disabled=false;
  extra.style.display='block';

  if(special){
    currentMiracleReplay={
      kind:special,
      frameSrc:playImageEl.currentSrc||playImageEl.src,
      targetTime:Number.isFinite(targetTime)?targetTime:currentIndex,
      index:currentIndex,
      fortune,
      replayCandidateId:activeCreation?.deckCandidateIds?.[currentIndex]||null,
      replayMode:activeCreation?.deckReplayModes?.[currentIndex]||null,
      replaySpan:activeCreation?.deckReplaySpans?.[currentIndex]||0,
      sourceVideoId:activeCreation?.deckSourceIds?.[currentIndex]||null
    };
    replaySpecialBtn.style.display='block';
  }

  addHistory(currentLab);
  clearTimeout(dockTimer);
  if(stageEl.classList.contains('stageLandscape')){
    dockResult();
  }else{
    dockTimer=setTimeout(dockResult,special?7000:1550);
  }

  if(special){
    rareTimer=setTimeout(()=>{
      if(!running)showMiracle(special);
    },special==='reversal'?1100:900);
  }
}

/* Distinguish an intentional tap from a scroll gesture. */
let stageGesture=null;
stageEl.addEventListener('pointerdown',e=>{
  if(e.target.closest('button,a,input,label'))return;
  stageGesture={id:e.pointerId,x:e.clientX,y:e.clientY,t:performance.now(),moved:false};
  e.stopImmediatePropagation();
},true);
window.addEventListener('pointermove',e=>{
  if(!stageGesture||e.pointerId!==stageGesture.id)return;
  if(Math.hypot(e.clientX-stageGesture.x,e.clientY-stageGesture.y)>12)stageGesture.moved=true;
},true);
window.addEventListener('pointerup',e=>{
  if(!stageGesture||e.pointerId!==stageGesture.id)return;
  const g=stageGesture;
  stageGesture=null;
  const moved=g.moved||Math.hypot(e.clientX-g.x,e.clientY-g.y)>12;
  if(moved||performance.now()-g.t>700)return;
  e.preventDefault();
  if(!primed)unlockAudio();
  if(running)stopRun();else startRun();
},true);
window.addEventListener('pointercancel',e=>{
  if(stageGesture&&e.pointerId===stageGesture.id)stageGesture=null;
},true);

let rouletteStoppedTimer=null;
window.__memoryOnRouletteStopped=()=>{
  clearTimeout(rouletteStoppedTimer);
  rouletteStoppedTimer=setTimeout(()=>{
    rouletteStoppedTimer=null;
    if(document.body.dataset.appView==='play'&&!running)showLabResult();
  },40);
};
window.__memoryOnRouletteStarted=()=>{
  window.__memoryPendingSpecialResult=null;
  clearTimeout(rouletteStoppedTimer);rouletteStoppedTimer=null;
  clearLab();
  if(resultHeadEl)resultHeadEl.textContent='きょうの運勢';
};
window.__memoryOnRoulettePrepared=x=>{
  window.__memoryPendingSpecialResult=null;
  clearTimeout(rouletteStoppedTimer);rouletteStoppedTimer=null;
  clearLab();
  restoreDrawHistory(x);
  clearGifResult();
  primeMiracleReplaySource(x);
};
window.__memoryOnRouletteExit=()=>{
  window.__memoryPendingSpecialResult=null;
  clearTimeout(rouletteStoppedTimer);rouletteStoppedTimer=null;
  clearTimeout(dockTimer);dockTimer=null;
  clearTimeout(rareTimer);rareTimer=null;
  clearSpecial();
  undockResult();
  stageGesture=null;
};

saveBtn.addEventListener('pointerdown',async e=>{
  e.preventDefault();
  e.stopPropagation();
  if(!currentLab||running)return;

  saveBtn.disabled=true;
  saveBtn.textContent='保存中…';
  try{
    await labSave({
      id:'p'+Date.now()+Math.random().toString(36).slice(2,7),
      createdAt:Date.now(),
      image:playImageEl.currentSrc||playImageEl.src,
      fortune:currentLab.fortune,
      displayFortune:resolvedDisplayFortune(currentLab),
      luckyColor:currentLab.lucky.color.name,
      luckyColorHex:currentLab.lucky.color.hex,
      luckyPoint:currentLab.lucky.point,
      special:currentLab.special,
      targetTime:Number(activeCreation?.times?.[currentIndex])
    });
    saveBtn.textContent='✓ 保存しました';
    await renderCollection();
  }catch(err){
    console.error(err);
    saveBtn.disabled=false;
    saveBtn.textContent='保存できませんでした';
  }
},{passive:false});

clearHistoryBtn.addEventListener('click',()=>{
  history=[];
  if(activeCreation?.id){activeCreation.drawHistory=[];activeCreation.updatedAt=Date.now();if(typeof dbPut==='function')dbPut(activeCreation).catch(e=>console.error('draw history clear failed',e));}
  renderHistory();
  // Draw history is independent from the GIF of all extracted frames.
});

gifDownload.addEventListener('click',e=>{
  e.preventDefault();
  e.stopPropagation();
  if(!gifUrl)return;

  const a=document.createElement('a');
  a.href=gifUrl;
  a.download=gifFileName;
  a.style.display='none';
  document.body.appendChild(a);
  a.click();
  a.remove();

  gifStatus.style.display='block';
  gifStatus.textContent='GIFを保存しました。全画面で表示します。';
  openGifViewer();
});

makeGifBtn.addEventListener('click',async()=>{
  if(gifGenerating)return;
  const groups=gifFrameGroups();
  const group=groups.find(g=>g.key===gifSource?.value&&g.items.length>=2&&g.key===gifLoadedSourceKey)||null;
  if(!group){
    gifStatus.style.display='block';
    gifStatus.textContent='GIFには同じ元動画のコマが2枚以上必要です。';
    return;
  }
  const frames=group.items;
  // GIF89a stores each frame delay in centiseconds; keep output and preview identical.
  const allowedGifDelays=new Set([5,10,20,50,100]);
  const requestedDelay=Math.round(Number(gifSpeed?.value)*100);
  const centiseconds=allowedGifDelays.has(requestedDelay)?requestedDelay:10;
  const seconds=centiseconds/100;
  clearGifResult();
  const generation=gifGeneration;
  gifGenerating=true;
  syncGifSourceChooser();
  gifStatus.style.display='block';
  gifStatus.textContent='「'+group.label+'」の全'+frames.length+'コマからGIFを作っています… 0/'+frames.length;
  try{
    const blob=await makeGif(frames,(done,total)=>{
      if(generation===gifGeneration)gifStatus.textContent='「'+group.label+'」のGIFを作っています… '+done+'/'+total;
    },centiseconds,()=>generation!==gifGeneration);
    if(generation!==gifGeneration)return;
    gifUrl=URL.createObjectURL(blob);
    startGifPreview(frames,seconds);
    gifDownload.href=gifUrl;
    const safe=(group.label||'video').replace(/[^a-zA-Z0-9ぁ-んァ-ヶ一-龠_-]/g,'_').slice(0,48);
    gifFileName='memory-roulette-'+safe+'.gif';
    gifDownload.download=gifFileName;
    gifResult.style.display='block';
    gifStatus.textContent='「'+group.label+'」の全'+frames.length+'コマを時間順に並べました（'+seconds+'秒ごとに切り替え）。';
  }catch(err){
    if(generation===gifGeneration){
      console.error(err);
      gifStatus.textContent='GIFを作れませんでした: '+err.message;
    }
  }finally{
    if(generation===gifGeneration)gifGenerating=false;
    syncGifSourceChooser();
  }
});
gifSource?.addEventListener('change',()=>{clearGifResult();syncGifSourceChooser();loadGifSource(gifSource.value);});
gifSpeed?.addEventListener('change',()=>{
  clearGifResult();
  gifStatus.style.display='none';
  syncGifSourceChooser();
});

async function loadImage(src){
  return new Promise((resolve,reject)=>{
    const img=new Image();
    img.onload=()=>resolve(img);
    img.onerror=()=>reject(new Error('画像を読み込めません'));
    img.src=src;
  });
}
function u16(v){return [v&255,(v>>8)&255];}
function buildAdaptivePalette(data,maxColors=256){
  const hist=new Map();
  for(let i=0;i<data.length;i+=16){
    const r=data[i],g=data[i+1],b=data[i+2];
    const key=((r>>3)<<10)|((g>>3)<<5)|(b>>3);
    const e=hist.get(key);
    if(e){
      e.n++;e.r+=r;e.g+=g;e.b+=b;
    }else{
      hist.set(key,{n:1,r,g,b});
    }
  }
  let points=Array.from(hist.values(),e=>({n:e.n,r:e.r/e.n,g:e.g/e.n,b:e.b/e.n}));
  if(!points.length)points=[{n:1,r:0,g:0,b:0}];

  const boxes=[points];
  const stats=box=>{
    let r0=255,r1=0,g0=255,g1=0,b0=255,b1=0,n=0;
    for(const p of box){
      r0=Math.min(r0,p.r);r1=Math.max(r1,p.r);
      g0=Math.min(g0,p.g);g1=Math.max(g1,p.g);
      b0=Math.min(b0,p.b);b1=Math.max(b1,p.b);
      n+=p.n;
    }
    return {ranges:[r1-r0,g1-g0,b1-b0],n};
  };

  while(boxes.length<maxColors){
    let best=-1,bestScore=-1,bestStats=null;
    for(let i=0;i<boxes.length;i++){
      if(boxes[i].length<2)continue;
      const s=stats(boxes[i]);
      const score=Math.max(...s.ranges)*Math.sqrt(s.n);
      if(score>bestScore){
        best=i;
        bestScore=score;
        bestStats=s;
      }
    }
    if(best<0)break;

    const box=boxes.splice(best,1)[0];
    const channel=bestStats.ranges.indexOf(Math.max(...bestStats.ranges));
    const key=['r','g','b'][channel];
    box.sort((a,b)=>a[key]-b[key]);

    const total=box.reduce((s,p)=>s+p.n,0);
    let acc=0,cut=1;
    for(let i=0;i<box.length-1;i++){
      acc+=box[i].n;
      if(acc>=total/2){cut=i+1;break;}
    }
    boxes.push(box.slice(0,cut),box.slice(cut));
  }

  const palette=boxes.map(box=>{
    let n=0,r=0,g=0,b=0;
    for(const p of box){
      n+=p.n;r+=p.r*p.n;g+=p.g*p.n;b+=p.b*p.n;
    }
    return [Math.round(r/n),Math.round(g/n),Math.round(b/n)];
  });
  while(palette.length<256)palette.push(palette[palette.length-1]||[0,0,0]);
  return palette.slice(0,256);
}
function mapToPalette(data,palette){
  const out=new Uint8Array(data.length/4);
  const lut=new Int16Array(32768);
  lut.fill(-1);

  for(let i=0,p=0;i<data.length;i+=4,p++){
    const r=data[i],g=data[i+1],b=data[i+2];
    const key=((r>>3)<<10)|((g>>3)<<5)|(b>>3);
    let pi=lut[key];

    if(pi<0){
      let best=0,bd=Infinity;
      for(let k=0;k<palette.length;k++){
        const q=palette[k];
        const dr=r-q[0],dg=g-q[1],db=b-q[2];
        const d=dr*dr*2+dg*dg*3+db*db;
        if(d<bd){
          bd=d;
          best=k;
          if(d===0)break;
        }
      }
      pi=best;
      lut[key]=pi;
    }
    out[p]=pi;
  }
  return out;
}
function lzwEncode(pixels,minCodeSize=8){
  const clear=1<<minCodeSize;
  const end=clear+1;
  const codeSize=minCodeSize+1;
  const out=[];
  let bitBuf=0,bitCount=0,sinceClear=0;

  const emit=code=>{
    bitBuf|=code<<bitCount;
    bitCount+=codeSize;
    while(bitCount>=8){
      out.push(bitBuf&255);
      bitBuf>>=8;
      bitCount-=8;
    }
  };

  emit(clear);
  for(let i=0;i<pixels.length;i++){
    emit(pixels[i]);
    sinceClear++;
    if(sinceClear>=200){
      emit(clear);
      sinceClear=0;
    }
  }
  emit(end);
  if(bitCount>0)out.push(bitBuf&255);
  return out;
}
function appendSubBlocks(writer,data){
  for(let i=0;i<data.length;i+=255){
    const n=Math.min(255,data.length-i);
    writer.push(n);
    for(let j=0;j<n;j++)writer.push(data[i+j]);
  }
  writer.push(0);
}
window.__memoryShareEncodeGif=(frames,delay)=>makeGif(frames,()=>{},delay,()=>false);
async function makeGif(entries,onProgress,delay=50,isCancelled=()=>false){
  const first=await loadImage(entries[0].image);
  const maxW=360,maxH=480;
  const scale=Math.min(1,maxW/first.naturalWidth,maxH/first.naturalHeight);
  const w=Math.max(2,Math.round(first.naturalWidth*scale));
  const h=Math.max(2,Math.round(first.naturalHeight*scale));
  const canvas=document.createElement('canvas');
  canvas.width=w;
  canvas.height=h;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  const bytes=[];

  'GIF89a'.split('').forEach(ch=>bytes.push(ch.charCodeAt(0)));
  bytes.push(...u16(w),...u16(h),0x70,0,0);
  bytes.push(0x21,0xFF,0x0B,...Array.from('NETSCAPE2.0').map(c=>c.charCodeAt(0)),0x03,0x01,0x00,0x00,0x00);

  for(let fi=0;fi<entries.length;fi++){
    if(isCancelled())throw new Error('GIF生成が中断されました');
    const img=fi===0?first:await loadImage(entries[fi].image);
    ctx.clearRect(0,0,w,h);
    ctx.fillStyle='#000';
    ctx.fillRect(0,0,w,h);

    const s=Math.min(w/img.naturalWidth,h/img.naturalHeight);
    const dw=Math.round(img.naturalWidth*s);
    const dh=Math.round(img.naturalHeight*s);
    ctx.drawImage(img,Math.round((w-dw)/2),Math.round((h-dh)/2),dw,dh);

    const d=ctx.getImageData(0,0,w,h).data;
    const palette=buildAdaptivePalette(d,256);
    const idx=mapToPalette(d,palette);

    bytes.push(0x21,0xF9,0x04,0x00,...u16(delay),0x00,0x00);
    bytes.push(0x2C,0,0,0,0,...u16(w),...u16(h),0x87);
    for(const q of palette)bytes.push(q[0],q[1],q[2]);
    bytes.push(0x08);
    appendSubBlocks(bytes,lzwEncode(idx,8));

    onProgress?.(fi+1,entries.length);
    await new Promise(r=>setTimeout(r,0));
  }

  bytes.push(0x3B);
  return new Blob([new Uint8Array(bytes)],{type:'image/gif'});
}

const DB='babyExpressionRouletteLabDB';
const STORE='dailyPhotos';

function labDB(){
  return new Promise((resolve,reject)=>{
    const r=indexedDB.open(DB,1);
    r.onupgradeneeded=()=>{
      if(!r.result.objectStoreNames.contains(STORE)){
        r.result.createObjectStore(STORE,{keyPath:'id'});
      }
    };
    r.onsuccess=()=>resolve(r.result);
    r.onerror=()=>reject(r.error);
  });
}
async function labSave(item){
  const db=await labDB();
  await new Promise((resolve,reject)=>{
    const tx=db.transaction(STORE,'readwrite');
    tx.objectStore(STORE).put(item);
    tx.oncomplete=resolve;
    tx.onerror=()=>reject(tx.error);
  });

  const all=await labAll();
  if(all.length>40){
    const old=all.slice(40);
    const db2=await labDB();
    await new Promise((resolve,reject)=>{
      const tx=db2.transaction(STORE,'readwrite');
      const st=tx.objectStore(STORE);
      old.forEach(x=>st.delete(x.id));
      tx.oncomplete=resolve;
      tx.onerror=()=>reject(tx.error);
    });
  }
}
async function labAll(){
  const db=await labDB();
  return new Promise((resolve,reject)=>{
    const r=db.transaction(STORE).objectStore(STORE).getAll();
    r.onsuccess=()=>resolve(r.result.sort((a,b)=>b.createdAt-a.createdAt));
    r.onerror=()=>reject(r.error);
  });
}
async function labDelete(id){
  const db=await labDB();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(STORE,'readwrite');
    tx.objectStore(STORE).delete(id);
    tx.oncomplete=resolve;
    tx.onerror=()=>reject(tx.error);
  });
}
async function commitPendingFavoriteDeletes(){
  const ids=[...pendingFavoriteDeletes];
  if(!ids.length)return;
  pendingFavoriteDeletes.clear();
  const failed=[];
  for(const id of ids){
    try{await labDelete(id);}
    catch(err){
      failed.push(id);
      console.error('favorite delete commit failed',err);
    }
  }
  failed.forEach(id=>pendingFavoriteDeletes.add(id));
  await renderCollection();
}
window.__memoryCommitFavoriteDeletes=commitPendingFavoriteDeletes;

function setFavoriteDeleteState(card,button,pending){
  card.classList.toggle('is-pending-delete',pending);
  button.textContent=pending?'元に戻す':'削除';
  button.setAttribute('aria-label',pending?'お気に入りの削除を取り消す':'お気に入りから削除');
}
async function downloadDailyPhoto(item){
  if(!item?.image)return false;
  try{
    let blob;
    if(typeof item.image==='string'&&item.image.startsWith('data:')){
      const comma=item.image.indexOf(',');
      const meta=item.image.slice(5,comma);
      const type=(meta.split(';')[0]||'image/jpeg');
      const raw=/;base64/i.test(meta)
        ?atob(item.image.slice(comma+1))
        :decodeURIComponent(item.image.slice(comma+1));
      const bytes=new Uint8Array(raw.length);
      for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
      blob=new Blob([bytes],{type});
    }else{
      blob=await (await fetch(item.image)).blob();
    }
    const type=blob.type||'image/jpeg';
    const ext=type.includes('png')?'png':type.includes('webp')?'webp':'jpg';
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;
    a.download='memory-moment-'+new Date(item.createdAt||Date.now()).toISOString().replace(/[:.]/g,'-')+'.'+ext;
    a.style.display='none';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1800);
    return true;
  }catch(err){
    diag('daily-photo-download-error',{name:err?.name||'Error',message:String(err?.message||err)});
    return false;
  }
}
async function renderCollection(){
  const all=await labAll();
  const homeFavoriteCount=document.getElementById('homeFavoriteCount');
  if(homeFavoriteCount)homeFavoriteCount.textContent=all.length?all.length+'枚保存':'まだありません';
  collectionEl.innerHTML='';
  if(!all.length){
    collectionEl.innerHTML='<div class="note">まだ保存されていません。</div>';
    return;
  }

  all.forEach(x=>{
    const card=document.createElement('article');
    card.className='labPhotoCard';
    const d=new Date(x.createdAt);
    card.innerHTML='<img alt="保存した思い出の写真"><div class="labPhotoMeta"><strong></strong><span></span><div class="labPhotoActions"><button type="button" class="labPhotoDownload">画像をダウンロード</button><button type="button" class="labPhotoOpen">開く</button></div></div><div class="labDeleteState" aria-live="polite"><strong>削除しました</strong><span>この画面を離れるまで取り消せます</span></div><button type="button" class="labDelete" aria-label="お気に入りから削除">削除</button>';
    card.querySelector('img').src=x.image;
    const mark=x.special==='reversal'?'🌈 ':x.special==='miracle'?'✨ ':'';
    card.querySelector('strong').textContent=mark+resolvedDisplayFortune(x)+' ・ '+(x.luckyColor||'')+' ・ '+(x.luckyPoint||'');
    card.querySelector('span').textContent=d.toLocaleString('ja-JP',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'});
    card.querySelector('.labPhotoDownload').addEventListener('click',async e=>{
      e.preventDefault();
      e.stopPropagation();
      const btn=e.currentTarget;
      btn.disabled=true;
      const old=btn.textContent;
      btn.textContent='保存中…';
      const ok=await downloadDailyPhoto(x);
      btn.textContent=ok?'✓ 保存しました':'保存できませんでした';
      if(ok)showDownloadNotice(x);
      setTimeout(()=>{btn.textContent=old;btn.disabled=false;},1300);
    });
    card.querySelector('.labPhotoOpen').addEventListener('click',e=>{
      e.preventDefault();
      e.stopPropagation();
      openDailyPhoto(x);
    });
    const shareButton=document.createElement('button');
    shareButton.type='button';
    shareButton.className='labPhotoSecretShare';
    shareButton.textContent='ひみつスタンプ';
    card.querySelector('.labPhotoActions').appendChild(shareButton);
    shareButton.addEventListener('click',e=>{
      e.preventDefault();e.stopPropagation();
      window.__memoryShareOpenPhoto?.(x);
    });
    const deleteBtn=card.querySelector('.labDelete');
    setFavoriteDeleteState(card,deleteBtn,pendingFavoriteDeletes.has(x.id));
    deleteBtn.addEventListener('click',e=>{
      e.preventDefault();
      e.stopPropagation();
      const undo=pendingFavoriteDeletes.has(x.id);
      if(undo)pendingFavoriteDeletes.delete(x.id);
      else pendingFavoriteDeletes.add(x.id);
      setFavoriteDeleteState(card,deleteBtn,!undo);
    });
    collectionEl.appendChild(card);
  });
}

renderHistory();
renderCollection().catch(console.error);
// On a direct #gif URL or refresh, navigation.js runs before this script is loaded.
if(document.body.dataset.appView==='gif'){
  window.__memoryGifOpen().catch(err=>console.error('GIF initial load failed',err));
}
})();