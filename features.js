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
const gifSourceNote=document.getElementById('labGifSourceNote');
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
    '<div class="labPhotoViewerTitle">今日の一枚</div>'+
    '<img id="labPhotoViewerImage" alt="保存した今日の一枚">'+
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
  '運勢とは別に、この一枚が今日のごほうび。',
  'この瞬間に出会えたのも、今日だけの偶然。奇跡の一枚です。',
  '思いがけない一瞬が、今日の宝物になりました。'
];
const REVERSAL_MESSAGES=[
  '大凶……と思いきや、この一枚で全部ひっくり返りました。',
  '運勢は大凶。でも、この一瞬を見たら今日は最高の日。',
  'まさかの大逆転。最後に残ったのは、とびきり幸せな一枚。'
];

let currentLab=null;
let history=[];
let gifUrl=null;
let gifFileName='memory-roulette-history.gif';
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
    '<img id="labMiracleStill" alt="奇跡の一枚">'+
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
  '<button id="labReplaySpecial" type="button">✨ 奇跡のリプレイ</button>'+
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
function setSpecialResultStyle(special){
  resultCardEl.classList.toggle('labSpecialMiracle',special==='miracle');
  resultCardEl.classList.toggle('labSpecialReversal',special==='reversal');
  if(specialEmblem){
    specialEmblem.style.display=special?'block':'none';
    specialEmblem.textContent=special==='miracle'
      ? '✦ MIRACLE MOMENT ✦'
      : special==='reversal'
        ? '🌈 REVERSAL FORTUNE 🌈'
        : '';
  }

}
function revealSpecialImmediately(special){
  return false;
}
function specialFortuneDisplay(special,baseFortune){
  if(special==='miracle')return {head:'きょうの運勢',fortune:baseFortune,badge:(FORTUNE_ICONS[baseFortune]||'🎴')+' '+baseFortune};
  if(special==='reversal')return {head:'大凶かと思ったら…',fortune:'大逆転大吉',badge:'🌈 大逆転大吉'};
  return {head:'きょうの運勢',fortune:baseFortune,badge:(FORTUNE_ICONS[baseFortune]||'🎴')+' '+baseFortune};
}
function applySpecialFortuneDisplay(special,baseFortune){
  const d=specialFortuneDisplay(special,baseFortune);
  setSpecialResultStyle(special);
  if(resultHeadEl)resultHeadEl.textContent=d.head;
  resultTextEl.textContent=d.fortune;
  resultTextEl.style.color=FORTUNE_COLORS[baseFortune==='大凶'?'大吉':baseFortune]||'#700';
  fortuneBadgeEl.textContent=d.badge;
  fortuneBadgeEl.style.color=FORTUNE_COLORS[baseFortune==='大凶'?'大吉':baseFortune]||'#700';
  return d;
}
function playSpecialSound(kind){
  try{
    if(!primed||!ensureAudio())return;
    if(kind==='reversal'){
      tone(392,.12,0,.05,'triangle');tone(659,.15,.10,.055,'sine');
      tone(988,.20,.23,.06,'sine');tone(1319,.35,.40,.065,'sine');
      tone(1568,.42,.62,.06,'sine');
    }else{
      tone(784,.13,0,.055,'sine');tone(1047,.16,.10,.06,'sine');
      tone(1319,.20,.22,.065,'sine');tone(1568,.34,.37,.07,'sine');
      tone(2093,.45,.58,.055,'sine');
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
      : {kicker:'その一瞬を、もう一度',title:'奇跡の瞬間',sub:'まもなくスローリプレイ'},
    replay:{kicker:'奇跡の瞬間へ',title:'',sub:'0.42× SLOW REPLAY'},
    final:kind==='reversal'
      ? {duration:t.final,kicker:'大凶かと思ったら…',title:'大逆転大吉！',sub:'🌈 奇跡の一枚 🌈'}
      : {duration:t.final,kicker:'運勢とは別の、特別な一瞬',title:'奇跡の一枚！',sub:'✨ SPECIAL MOMENT ✨'}
  };
}
function specialMovieMimeType(){
  if(typeof MediaRecorder==='undefined')return '';
  const types=[
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm'
  ];
  return types.find(t=>!MediaRecorder.isTypeSupported||MediaRecorder.isTypeSupported(t))||'';
}
function specialMovieSupported(){
  return typeof MediaRecorder!=='undefined'&&
    typeof HTMLCanvasElement!=='undefined'&&
    typeof HTMLCanvasElement.prototype.captureStream==='function';
}
function specialMovieExportKey(replay){
  return replay?[(replay.kind||''),Number(replay.targetTime||0).toFixed(3),replay.index??'',replay.replayCandidateId||''].join('|'):'';
}
function specialMovieFilename(kind){
  const label=kind==='reversal'?'daigyakuten-daikichi':'kiseki-no-ichimai';
  return 'memory-'+label+'-'+new Date().toISOString().replace(/[:.]/g,'-')+'.webm';
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
  a.download=specialMovieFilename(currentMiracleReplay?.kind||'miracle');
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
function drawMovieText(ctx,w,h,kicker,title,sub,theme='gold',alpha=1){
  ctx.save();
  ctx.globalAlpha=Math.max(0,Math.min(1,alpha));
  ctx.textAlign='center';
  ctx.textBaseline='middle';
  ctx.shadowColor='rgba(0,0,0,.72)';
  ctx.shadowBlur=Math.round(w*.022);
  ctx.fillStyle='rgba(255,255,255,.94)';
  ctx.font='800 '+Math.round(w*.037)+'px system-ui, sans-serif';
  if(kicker)ctx.fillText(kicker,w/2,h*.30);
  const titleSize=title&&title.length>=6?w*.092:w*.126;
  ctx.font='1000 '+Math.round(titleSize)+'px system-ui, sans-serif';
  if(theme==='gold'){
    const g=ctx.createLinearGradient(w*.2,0,w*.8,0);
    g.addColorStop(0,'#fff7b7');g.addColorStop(.5,'#ffffff');g.addColorStop(1,'#ffd34d');
    ctx.fillStyle=g;
  }else if(theme==='rainbow'){
    const g=ctx.createLinearGradient(w*.18,0,w*.82,0);
    g.addColorStop(0,'#ff8bd7');g.addColorStop(.27,'#9bdcff');g.addColorStop(.55,'#fff49c');g.addColorStop(.8,'#a9ffca');g.addColorStop(1,'#ddb0ff');
    ctx.fillStyle=g;
  }else{
    ctx.fillStyle='#fff';
  }
  if(title)ctx.fillText(title,w/2,h*.43);
  ctx.fillStyle='rgba(255,255,255,.92)';
  ctx.font='850 '+Math.round(w*.041)+'px system-ui, sans-serif';
  if(sub)ctx.fillText(sub,w/2,h*.56);
  ctx.restore();
}
function drawMovieReplayCaption(ctx,w,h,kicker,sub){
  ctx.save();
  const y=h*.86;
  ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.shadowColor='rgba(0,0,0,.92)';ctx.shadowBlur=Math.round(w*.018);
  ctx.fillStyle='rgba(255,255,255,.95)';
  ctx.font='900 '+Math.round(w*.034)+'px system-ui, sans-serif';
  ctx.fillText(kicker,w/2,y);
  ctx.font='850 '+Math.round(w*.027)+'px system-ui, sans-serif';
  ctx.fillStyle='rgba(255,255,255,.86)';
  ctx.fillText(sub,w/2,y+Math.round(w*.055));
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
    const x=((p.x+Math.sin(t*.8+p.phase)*.025)%1)*w;
    const yy=fall?((p.y+t*p.speed)%1):((p.y-Math.sin(t*.6+p.phase)*.018+1)%1);
    const y=yy*h;
    const size=Math.max(2,p.size*Math.min(w,h)*(0.72+intensity*.55));
    ctx.save();
    ctx.translate(x,y);
    ctx.rotate(t*p.spin+p.phase);
    ctx.globalAlpha=Math.min(1,.24+intensity*.62);
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
  ctx.save();
  ctx.globalCompositeOperation='screen';
  if(kind==='miracle'){
    const r=ctx.createRadialGradient(w*.5,h*.42,0,w*.5,h*.42,Math.max(w,h)*.72);
    r.addColorStop(0,'rgba(255,255,230,'+(0.22+progress*.32)+')');
    r.addColorStop(.28,'rgba(255,214,68,'+(0.16+progress*.28)+')');
    r.addColorStop(1,'rgba(138,70,255,0)');
    ctx.fillStyle=r;ctx.fillRect(0,0,w,h);
    ctx.strokeStyle='rgba(255,238,145,'+(0.08+progress*.3)+')';
  }else{
    const g=ctx.createLinearGradient(0,h*.15,w,h*.85);
    g.addColorStop(0,'rgba(255,90,208,'+(progress*.28)+')');
    g.addColorStop(.3,'rgba(74,205,255,'+(progress*.30)+')');
    g.addColorStop(.62,'rgba(255,238,86,'+(progress*.25)+')');
    g.addColorStop(1,'rgba(133,100,255,'+(progress*.3)+')');
    ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
    ctx.strokeStyle='rgba(225,210,255,'+(0.08+progress*.28)+')';
  }
  ctx.lineWidth=Math.max(2,w*.006);
  for(let i=0;i<4;i++){
    const rr=(.18+i*.13+progress*.08)*Math.max(w,h);
    ctx.globalAlpha=.16+progress*.14;
    ctx.beginPath();ctx.arc(w/2,h*.45,rr,0,Math.PI*2);ctx.stroke();
  }
  if(flash>0){
    ctx.globalAlpha=Math.min(1,flash);
    ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);
  }
  ctx.restore();
}
function drawSpecialMovieFrame(ctx,state){
  const {kind,t,timeline,still,video,videoReady,replayImages,particles,w,h}=state;
  const spec=specialSequenceSpec(kind,{targetTime:state.targetTime});
  const slowStart=timeline.intro;
  const slowEnd=timeline.intro+timeline.slow;
  const finalStart=slowEnd;
  let source=still;
  if(t>=slowStart&&t<slowEnd){
    if(video&&videoReady()&&video.readyState>=2){
      source=video;
    }else if(Array.isArray(replayImages)&&replayImages.length){
      const p=(t-slowStart)/Math.max(.01,timeline.slow);
      const ix=Math.max(0,Math.min(replayImages.length-1,Math.floor(p*replayImages.length)));
      source=replayImages[ix]||still;
    }
  }

  if(t<slowStart){
    drawMovieMedia(ctx,still,w,h,1,kind==='reversal'?.58:.30);
    drawMovieText(
      ctx,w,h,
      spec.intro.kicker,
      spec.intro.title,
      spec.intro.sub,
      kind==='reversal'?'plain':'gold',
      1
    );
    return;
  }

  if(t<slowEnd){
    const p=(t-slowStart)/Math.max(.01,timeline.slow);
    drawMovieMedia(ctx,source,w,h,1+.008*p,0);
    drawMovieReplayCaption(ctx,w,h,spec.replay.kicker,spec.replay.sub);
    return;
  }

  const p=Math.min(1,(t-finalStart)/timeline.final);
  drawMovieMedia(ctx,still,w,h,1.025-p*.015,0);
  const flash=Math.max(0,1-p/.13);
  drawMovieAura(ctx,w,h,kind,p,flash*.86);
  drawMovieParticles(ctx,particles,w,h,t,1,true);
  drawMovieText(
    ctx,w,h,
    spec.final.kicker,
    spec.final.title,
    spec.final.sub,
    kind==='reversal'?'rainbow':'gold',
    Math.min(1,p*3.4)
  );
}
async function prepareSpecialMovieVideo(replay,slowDuration){
  if(!replaySourceAvailable())return null;
  const src=replaySourceUrl();
  if(!src)return null;
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
    return {video:v,start,target,rate,cleanup:()=>{try{v.pause();}catch(e){}v.removeAttribute('src');v.load();v.remove();}};
  }catch(err){
    try{v.removeAttribute('src');v.load();v.remove();}catch(e){}
    diag('movie-source-fallback',{name:err?.name||'Error',message:String(err?.message||err)});
    return null;
  }
}
async function renderSpecialMovie(kind,replay,onProgress){
  if(!specialMovieSupported())throw new Error('このブラウザはムービー保存に対応していません');
  if(!replay?.frameSrc)throw new Error('奇跡の写真がありません');

  const timeline=specialMovieTimeline(kind,replay);
  const still=await loadImage(replay.frameSrc);
  let storedReplay=null;
  if(replay.replayCandidateId&&typeof window.__memoryDeckLoadReplay==='function'){
    try{storedReplay=await window.__memoryDeckLoadReplay(replay.replayCandidateId);}catch(e){}
  }
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
  const mime=specialMovieMimeType();
  const options={videoBitsPerSecond:4800000};
  if(mime)options.mimeType=mime;
  const recorder=new MediaRecorder(stream,options);
  const chunks=[];
  recorder.ondataavailable=e=>{if(e.data&&e.data.size)chunks.push(e.data);};

  const source=await prepareSpecialMovieVideo(replay,timeline.slow);
  const particles=createMovieParticles(kind,96);
  let movieVideo=source?.video||null;
  let videoFailed=!movieVideo;
  let videoStarted=false;
  let videoPaused=false;

  const finished=new Promise((resolve,reject)=>{
    recorder.onerror=e=>reject(e.error||new Error('動画の録画に失敗しました'));
    recorder.onstop=()=>resolve(new Blob(chunks,{type:mime||'video/webm'}));
  });

  recorder.start(250);
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
        drawSpecialMovieFrame(ctx,{
          kind,t,timeline,still,video:movieVideo,
          videoReady:()=>!videoFailed,
          replayImages,
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
    return {blob,usedSource:(!!movieVideo&&!videoFailed)||replayImages.length>=2,width:w,height:h};
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
    setSpecialMovieStatus('完成済みムービーを保存しました','success');
    return;
  }
  if(specialMovieGenerating)return;

  if(!specialMovieSupported()){
    setSpecialMovieStatus('このブラウザではムービー保存を利用できません','error');
    return;
  }

  specialMovieGenerating=true;
  const generation=++specialMovieGenerationToken;
  setSpecialMovieButtons('🎬 生成中…',true);
  setSpecialMovieStatus('ムービーを準備しています…');
  try{
    const result=await renderSpecialMovie(replay.kind,replay,p=>{
      if(generation===specialMovieGenerationToken)setSpecialMovieStatus('ムービー生成中… '+p+'%');
    });
    if(generation!==specialMovieGenerationToken)return;
    if(specialMovieUrl)URL.revokeObjectURL(specialMovieUrl);
    specialMovieBlob=result.blob;
    specialMovieUrl=URL.createObjectURL(result.blob);
    specialMovieKey=key;
    setSpecialMovieButtons('↓ ムービーをもう一度保存',false);
    setSpecialMovieStatus(result.usedSource
      ? 'スローモーション入りムービーを作成しました（音声なし）'
      : '元動画を使えないため写真演出ムービーを作成しました（音声なし）','success');
    downloadSpecialMovie();
    diag('movie-export-success',{kind:replay.kind,usedSource:result.usedSource,size:result.blob.size,width:result.width,height:result.height});
  }catch(err){
    if(generation!==specialMovieGenerationToken)return;
    console.error(err);
    setSpecialMovieButtons('🎬 ムービー保存',false);
    setSpecialMovieStatus(err?.message||'ムービーを作成できませんでした','error');
    diag('movie-export-error',{kind:replay.kind,name:err?.name||'Error',message:String(err?.message||err)});
  }finally{
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
  miracleKicker.textContent='奇跡の瞬間へ';
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
  try{stored=await window.__memoryDeckLoadReplay(candidateId);}catch(e){return false;}
  if(token!==miracleSequenceToken)return false;
  const seq=stored?.frames;
  if(!Array.isArray(seq)||seq.length<2)return false;
  const mode=stored.mode||activeCreation?.deckReplayModes?.[currentIndex]||'forward';
  const span=Math.max(.04,Number(stored.span)||Number(activeCreation?.deckReplaySpans?.[currentIndex])||MIRACLE_REPLAY_LEAD_SECONDS);
  miracleVideo.style.display='none';
  miracleStill.style.display='block';
  miracleReplayLabel.textContent=mode==='reverse'?'↶ REVERSE 0.42× REPLAY':'0.42× SLOW REPLAY';
  miracleKicker.textContent='奇跡の瞬間へ';
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
  miracleKicker.textContent='奇跡の瞬間へ';
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
  const storedDeckReplay=!!(
    activeCreation?.deckMode&&
    deckCandidateId&&
    Number(activeCreation?.deckReplaySpans?.[currentIndex])>0&&
    typeof window.__memoryDeckLoadReplay==='function'
  );
  const pendingDeckReplay=!!(activeCreation?.deckMode&&deckCandidateId&&!storedDeckReplay);
  const plan=storedDeckReplay
    ? {route:'stored-deck-frames',early:(activeCreation?.deckReplayModes?.[currentIndex]==='reverse'),targetTime:Math.max(0,Number(targetTime)||0)}
    : pendingDeckReplay
      ? {route:'photo-only',early:false,targetTime:Math.max(0,Number(targetTime)||0),pending:true}
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
    miracleSub.textContent=plan.pending?'仕上げ処理中のため、この一枚をゆっくり表示します':'この一枚をゆっくり表示します';
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
    miracleSub.textContent='🌈 奇跡の一枚 🌈';
    playSpecialSound('reversal');
    if(navigator.vibrate)navigator.vibrate([120,40,120,40,220,60,320]);
  }else{
    const baseFortune=currentMiracleReplay?.fortune||currentLab?.fortune||'吉';
    // Miracle is a separate "photo win"; keep the original fortune unchanged.
    applySpecialFortuneDisplay('miracle',baseFortune);
    miracleKicker.textContent='運勢とは別の、特別な一瞬';
    miracleTitle.textContent='奇跡の一枚！';
    miracleSub.textContent='✨ SPECIAL MOMENT ✨';
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
  currentMiracleReplay={kind,frameSrc,targetTime,index:currentIndex,fortune:replayFortune};
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
  miracleTitle.textContent=replayAgain?(kind==='reversal'?'大逆転の瞬間':'奇跡の瞬間'):spec.intro.title;
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
  currentMiracleReplay={kind,frameSrc,targetTime,index:currentIndex,fortune:currentLab?.fortune||null};
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

function historySourceGroups(){
  const map=new Map();
  history.forEach((x,i)=>{
    const key=x.deckMode?(x.sourceVideoId||('deck-'+(x.sourceName||'unknown'))):'single-source';
    if(!map.has(key))map.set(key,{key,label:x.deckMode?(x.sourceName||'元動画'):'元動画',items:[]});
    map.get(key).items.push({...x,historyIndex:i});
  });
  return Array.from(map.values());
}
function syncGifSourceChooser(){
  if(!gifSourceWrap||!gifSource||!gifSourceNote)return;
  const groups=historySourceGroups();
  const deckHistory=history.some(x=>x.deckMode);
  const previous=gifSource.value;
  gifSource.innerHTML='';
  groups.forEach(g=>{
    const o=document.createElement('option');
    o.value=g.key;
    o.textContent=g.label+'（'+g.items.length+'枚）';
    o.disabled=g.items.length<2;
    gifSource.appendChild(o);
  });
  const eligible=groups.filter(g=>g.items.length>=2);
  const keep=eligible.find(g=>g.key===previous);
  if(keep)gifSource.value=keep.key;
  else if(eligible[0])gifSource.value=eligible[0].key;
  gifSourceWrap.style.display=deckHistory&&groups.length>1?'block':'none';
  makeGifBtn.disabled=!eligible.length;
  if(!history.length){
    gifSourceNote.textContent='';
  }else if(!eligible.length){
    gifSourceNote.textContent='同じ元動画から2枚以上引くとGIFを作れます。';
  }else if(deckHistory&&groups.length>1){
    gifSourceNote.textContent='複数動画のコマは混ぜず、選んだ元動画の中だけを時間順に並べます。';
  }else{
    gifSourceNote.textContent='';
  }
}
function renderHistory(){
  historyEl.innerHTML='';
  historyEmpty.style.display=history.length?'none':'block';
  clearHistoryBtn.disabled=!history.length;

  history.forEach((x,i)=>{
    const card=document.createElement('button');
    card.type='button';
    card.className='labHistoryItem';
    const historyLabel=x.plain?'この瞬間！':(x.displayFortune||specialFortuneDisplay(x.special,x.fortune).fortune);
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
    displayFortune:item.plain?'この瞬間！':(item.displayFortune||specialFortuneDisplay(item.special,item.fortune).fortune),
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
    messageEl.textContent=x.message||'このときの結果です。';

    currentLab={fortune:x.fortune,displayFortune:x.displayFortune||specialFortuneDisplay(x.special,x.fortune).fortune,lucky:x.lucky||pickLucky(),special:x.special,fromHistory:true};
    renderLucky(currentLab.lucky);

    if(x.special){
      currentMiracleReplay={
        kind:x.special,frameSrc:x.image,targetTime:x.targetTime??x.time,index:x.index,fortune:x.fortune||null,
        replayCandidateId:x.replayCandidateId||null,replayMode:x.replayMode||null,replaySpan:x.replaySpan||0
      };
      replaySpecialBtn.style.display='block';
      movieResultBtn.style.display='block';
      specialLine.textContent=x.special==='reversal'?'🌈 大逆転！奇跡の一枚':'✨ 奇跡の一枚';
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
function clearGifResult(){
  closeGifViewer();
  if(gifUrl){
    URL.revokeObjectURL(gifUrl);
    gifUrl=null;
  }
  gifResult.style.display='none';
  gifPreview.removeAttribute('src');
  gifDownload.removeAttribute('href');
  gifFileName='memory-roulette-history.gif';
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
  const fortune=(resultTextEl.textContent||'吉').trim();
  const lucky=pickLucky();
  const special=specialFor(fortune);
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
      replaySpan:activeCreation?.deckReplaySpans?.[currentIndex]||0
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

window.__memoryOnRouletteStopped=()=>setTimeout(showLabResult,40);
window.__memoryOnRouletteStarted=()=>{
  clearLab();
  if(resultHeadEl)resultHeadEl.textContent='きょうの運勢';
};
window.__memoryOnRoulettePrepared=x=>{
  clearLab();
  restoreDrawHistory(x);
  clearGifResult();
  primeMiracleReplaySource(x);
};
window.__memoryOnRouletteExit=()=>{
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
      displayFortune:currentLab.displayFortune||specialFortuneDisplay(currentLab.special,currentLab.fortune).fortune,
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
  clearGifResult();
  gifStatus.style.display='none';
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
  if(history.length<2)return;
  makeGifBtn.disabled=true;
  clearGifResult();
  gifStatus.style.display='block';
  gifStatus.textContent='GIFを作っています… 0/'+history.length;

  try{
    const groups=historySourceGroups();
    const eligible=groups.filter(g=>g.items.length>=2);
    let group=null;
    if(history.some(x=>x.deckMode)){
      group=eligible.find(g=>g.key===gifSource?.value)||eligible[0]||null;
    }else{
      group=eligible[0]||null;
    }
    if(!group)throw new Error('同じ元動画から2枚以上の履歴が必要です');
    const sorted=group.items.slice().sort((a,b)=>a.time-b.time||a.drawnAt-b.drawnAt);
    gifStatus.textContent='「'+group.label+'」を時間順に並べています… 0/'+sorted.length;
    const blob=await makeGif(sorted,(done,total)=>{
      gifStatus.textContent='「'+group.label+'」を時間順に並べています… '+done+'/'+total;
    });
    gifUrl=URL.createObjectURL(blob);
    gifPreview.src=gifUrl;
    gifDownload.href=gifUrl;
    const safe=(group.label||'video').replace(/[\\/:*?"<>|]/g,'_').slice(0,48);
    gifFileName='memory-roulette-'+safe+'.gif';
    gifDownload.download=gifFileName;
    gifResult.style.display='block';
    gifStatus.textContent='「'+group.label+'」の'+sorted.length+'枚を、元動画の時間順に並べてGIFを作りました。';
  }catch(err){
    console.error(err);
    gifStatus.textContent='GIFを作れませんでした: '+err.message;
  }finally{
    syncGifSourceChooser();
  }
});
gifSource?.addEventListener('change',()=>clearGifResult());

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
async function makeGif(entries,onProgress){
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
    const delay=32;

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
    card.innerHTML='<img alt="保存した思い出の写真"><div class="labPhotoMeta"><strong></strong><span></span><div class="labPhotoActions"><button type="button" class="labPhotoDownload">画像をダウンロード</button><button type="button" class="labPhotoOpen">開く</button></div></div><button type="button" class="labDelete">削除</button>';
    card.querySelector('img').src=x.image;
    const mark=x.special==='reversal'?'🌈 ':x.special==='miracle'?'✨ ':'';
    card.querySelector('strong').textContent=mark+(x.displayFortune||specialFortuneDisplay(x.special,x.fortune).fortune)+' ・ '+(x.luckyColor||'')+' ・ '+(x.luckyPoint||'');
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
    card.querySelector('.labDelete').addEventListener('click',async()=>{
      await labDelete(x.id);
      renderCollection();
    });
    collectionEl.appendChild(card);
  });
}

renderHistory();
renderCollection().catch(console.error);
})();