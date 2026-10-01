(()=>{
const box=document.getElementById('deluxeMode');
if(!box)return;
let deluxe=false;
let photoFocusTimer=null;
let drumRollTimer=null;
let drumStep=0;
const originals={preparePlay,startRun,stopRun,unlockAudio,celebrate};
const clsMap={'大吉':'fortune-daikichi','吉':'fortune-kichi','中吉':'fortune-chukichi','小吉':'fortune-shokichi','末吉':'fortune-suekichi','凶':'fortune-kyo','大凶':'fortune-daikyo'};
const rank={'大吉':6,'吉':5,'中吉':4,'小吉':3,'末吉':2,'凶':1,'大凶':0};
const messages={
'大吉':['今日は特別ないい日。小さな笑顔まで宝物になりそう。','うれしいことが重なりそう。いつもの一日をたっぷり楽しんで。','幸運がふわっと近づく日。心に残る瞬間をたくさん見つけてみよう。','今日は主役の日。思いきり笑って、のびのび過ごそう。','すてきな偶然に出会えそう。懐かしい思い出を楽しむのが吉。','今日の一枚が、とっておきの思い出になりそう。','気分も運気も上向き。新しい発見がありそうな日。','幸せの種があちこちに。いつもの景色にも注目してみて。'],
'吉':['穏やかないい日。いつものペースがいちばん心地よさそう。','自然体で過ごすほどいい流れに。のんびり楽しもう。','小さないいことを見つけられそう。ゆっくり周りを見てみて。','今日は安心感たっぷり。お気に入りの時間を大切に。','いいリズムの日。笑ったり休んだり、気ままにどうぞ。','じんわり幸せを感じる日。写真を一枚多めに撮ってみよう。','今日は平和な追い風。小さなチャレンジにも向いていそう。','ほっとする出来事がありそう。好きな遊びをたっぷり楽しんで。'],
'中吉':['いい流れが育っていく日。少し先に楽しみが待っていそう。','じわじわ運気上昇。思いがけない一瞬に出会えるかも。','うれしい変化がありそう。小さな発見を見逃さないで。','好奇心がきらり。初めてのものに出会うといい刺激になりそう。','今日は気分も上向き。懐かしい思い出を楽しむとさらに吉。','ちょうどいい追い風。無理せず進めばいいことがありそう。','思いがけない懐かしい瞬間に出会えそう。ゆっくり楽しんで。','今日は伸びしろの日。新しい一面がちらっと見えるかも。'],
'小吉':['小さな幸せが見つかる日。ひとつひとつを楽しんで。','ささやかなラッキーに出会えそう。お気に入りを大切に。','今日はゆっくり育つ幸運の日。急がずのんびりでOK。','ちょっとした笑顔がうれしい日。穏やかな時間を楽しもう。','小さな発見が大きな思い出に。身近なものに注目してみて。','何気ない一瞬が見つかりそう。いつもの思い出も丁寧に。','小さな一歩がうれしい日。できたことをたくさん喜ぼう。','静かなラッキーが待っていそう。ゆったり観察してみて。'],
'末吉':['これからじわっと上向き。今日は準備の日と思ってのんびりと。','後半ほどいい感じ。焦らずゆっくり過ごしてみよう。','小さな変化が次の楽しみにつながりそう。','今日は待つことも大切。心地いいタイミングを探してみて。','今はのんびり、あとでにっこり。そんな一日になりそう。','少しずついい方向へ。無理せず自然な流れに任せよう。','今日は再発見日和。意外な一瞬を見つけられるかも。','明日につながる小さなラッキーがありそう。'],
'凶':['今日はのんびりモード。無理をしないのがいちばんの開運。','ちょっと休憩が吉。ゆっくりした時間を楽しもう。','予定通りじゃなくても大丈夫。気分に合わせていこう。','少し気まぐれな日かも。そんな日もあとで楽しい思い出。','がんばりすぎない日。ひと息ついたら運気も回復しそう。','今日は寄り道歓迎。予定より心地よさを優先して。','ちょっとしたハプニングも笑い話になりそう。気楽にいこう。','今日は省エネ運転。たっぷり休んで次のいい流れを待とう。'],
'大凶':['今日は思いきってお休み気分。のんびりするほど大吉に近づきそう。','大凶はレアもの。引けただけでちょっと特別な日。','予定はゆるめでOK。安心できる時間をたっぷりどうぞ。','今日は頑張らない選択が大正解。ゆっくり充電しよう。','ちょっと波乱の予感。でもあとで笑えればそれもいい思い出。','今日は安全運転で。いつもの場所がいちばん落ち着きそう。','レアな運勢が出ました。記念にこの一瞬を残しておこう。','ゆっくり、のんびり、気ままに。そんな日も大切な一日。']
};
const last={};
function pick(f){const a=messages[f]||[''];let i=Math.floor(Math.random()*a.length);if(a.length>1&&i===last[f])i=(i+1+Math.floor(Math.random()*(a.length-1)))%a.length;last[f]=i;return a[i];}
function stopDrumRoll(){
  if(drumRollTimer){clearInterval(drumRollTimer);drumRollTimer=null;}
  drumStep=0;
}
function startDrumRoll(){
  stopDrumRoll();
  if(!deluxe||!primed||!ensureAudio())return;
  const hit=()=>{
    const accents=[.026,.018,.022,.019,.03,.019];
    const freqs=[118,142,126,150,120,158];
    const k=drumStep++%accents.length;
    tone(freqs[k],.055,0,accents[k],k%2?'triangle':'square');
    if(k===4)tone(230,.035,.018,.012,'triangle');
  };
  hit();
  drumRollTimer=setInterval(hit,92);
}
function clearFx(){
stopDrumRoll();
clearTimeout(photoFocusTimer);photoFocusTimer=null;
Object.values(clsMap).forEach(c=>stage.classList.remove(c));
stage.classList.remove('result-reveal','photo-focus');
document.querySelectorAll('.fxParticle').forEach(e=>e.remove());
bigOverlay.classList.remove('show','deluxe');
}
function focusPhoto(){
stage.classList.remove('result-reveal');
stage.classList.add('photo-focus');
document.querySelectorAll('.fxParticle').forEach(e=>e.remove());
bigOverlay.classList.remove('show','deluxe');
}
function cfg(f){return {'大吉':{s:['✦','✧','★','●'],c:['#ffd700','#fff3a6','#ff7b62','#fff'],n:64},'吉':{s:['✦','●','❀'],c:['#ffb36b','#ffe0a8','#ff9cac','#fff'],n:38},'中吉':{s:['✧','❀','●'],c:['#ffd18c','#ffc0d0','#fff0b5','#fff'],n:42},'小吉':{s:['🍀','✦','●'],c:['#7fcf8a','#d5f0c7','#fff6cf','#fff'],n:34},'末吉':{s:['🌸','·','✧'],c:['#f3a9bd','#ffd9e2','#ead9ff','#fff'],n:32},'凶':{s:['☁','✧','·'],c:['#aeb9c7','#dbe3ec','#9eabc0','#fff'],n:26},'大凶':{s:['✦','☾','·'],c:['#9387b7','#c3b8e4','#70658f','#fff'],n:28}}[f]||{s:['✦'],c:['#fff'],n:24};}
function particles(f){const x=cfg(f);for(let i=0;i<x.n;i++){const e=document.createElement('span');e.className='fxParticle';e.textContent=x.s[Math.floor(Math.random()*x.s.length)];e.style.left=(4+Math.random()*92)+'vw';e.style.top=(-10-Math.random()*18)+'vh';e.style.color=x.c[Math.floor(Math.random()*x.c.length)];e.style.fontSize=(10+Math.random()*16)+'px';e.style.animationDuration=(1.8+Math.random()*2.1)+'s';e.style.animationDelay=(Math.random()*.45)+'s';e.style.setProperty('--drift',(-70+Math.random()*140)+'px');document.body.appendChild(e);setTimeout(()=>e.remove(),4700);}}
function impact(f){if(!audioCtx||audioCtx.state!=='running')return;const r=rank[f]??3;if(r>=4){tone(1047,.20,.02,.06,'sine');tone(1319,.28,.12,.055,'sine');}else if(r<=1){tone(196,.22,.02,.05,'triangle');tone(262,.32,.18,.045,'sine');}else{tone(784,.20,.02,.05,'sine');tone(988,.25,.15,.05,'sine');}}
function deluxeStart(){if(!audioCtx||audioCtx.state!=='running')return;[[392,.12,0],[523,.13,.08],[659,.15,.16],[784,.20,.26],[1047,.26,.39]].forEach(([f,d,w],i)=>tone(f,d,w,.07,i%2?'sine':'triangle'));}
function reveal(f){
const c=clsMap[f];if(c)stage.classList.add(c);
stage.classList.add('result-reveal');stage.classList.remove('photo-focus');
particles(f);
if(f==='大吉'){bigOverlay.classList.add('deluxe');originals.celebrate();impact(f);}
else{playSound(f);impact(f);}
if(navigator.vibrate){const r=rank[f]??3;navigator.vibrate(r>=5?[70,45,100]:r<=1?[45,70,45]:[50,35,70]);}
clearTimeout(photoFocusTimer);
photoFocusTimer=setTimeout(focusPhoto,1500);
}
unlockAudio=function(){primed=true;ensureAudio();if(box.checked)deluxeStart();else playSound('start');};
preparePlay=function(x){deluxe=!!box.checked;playSection.classList.toggle('deluxe-mode',deluxe);photoAction.style.display='none';clearFx();originals.preparePlay(x);};
startRun=function(withSound=true){
  photoAction.style.display='none';
  clearFx();
  originals.startRun(false);
  if(deluxe){
    if(withSound)deluxeStart();
    setTimeout(()=>{if(running&&deluxe)startDrumRoll();},withSound?360:120);
  }else if(withSound){
    playSound('start');
  }
};
celebrate=function(){bigOverlay.classList.remove('deluxe');originals.celebrate();};
stopRun=function(){stopDrumRoll();running=false;clearInterval(timer);timer=null;stage.classList.remove('pulse');if(activeCreation.mode==='omikuji'){const f=activeCreation.fortunes[currentIndex]||'吉';fortuneBadge.style.display='block';fortuneBadge.textContent=(FORTUNE_ICONS[f]||'🎴')+' '+f;fortuneBadge.style.color=FORTUNE_COLORS[f]||'#700';resultCard.style.display='block';resultText.textContent=f;resultText.style.color=FORTUNE_COLORS[f]||'#700';message.textContent=pick(f);rouletteBadge.style.display='none';if(deluxe)reveal(f);else if(f==='大吉')celebrate();else playSound(f);photoAction.style.display='inline-flex';}else{rouletteBadge.style.display='block';rouletteBadge.textContent='この瞬間！';if(deluxe){stage.classList.add('result-reveal');stage.classList.remove('photo-focus');particles('吉');impact('吉');clearTimeout(photoFocusTimer);photoFocusTimer=setTimeout(focusPhoto,1500);}playSound('吉');}tapHint.textContent='もう一度タップすると再開します';};

const photoViewer=document.createElement('div');
photoViewer.id='photoViewer';
photoViewer.setAttribute('aria-hidden','true');
photoViewer.innerHTML='<img id="photoViewerImage" alt="思い出の写真"><button id="photoViewerClose" type="button" aria-label="写真表示を閉じる">×</button><div id="photoViewerHint">タップで戻る</div>';
document.body.appendChild(photoViewer);
const photoAction=document.createElement('button');
photoAction.id='photoAction';
photoAction.type='button';
photoAction.innerHTML='<span class="photoActionIcon" aria-hidden="true">🖼️</span><span>写真を見る</span>';
photoAction.setAttribute('aria-label','写真を全画面で見る');
photoAction.style.display='none';
stage.appendChild(photoAction);
const photoViewerImage=photoViewer.querySelector('#photoViewerImage');
const photoViewerClose=photoViewer.querySelector('#photoViewerClose');
let photoViewerNative=false;

async function openPhotoViewer(){
  if(running||!activeCreation||activeCreation.mode!=='omikuji')return;
  clearTimeout(photoFocusTimer);photoFocusTimer=null;
  photoViewerImage.src=playImage.currentSrc||playImage.src;
  photoViewer.classList.add('show');
  photoViewer.setAttribute('aria-hidden','false');
  try{
    if(photoViewer.requestFullscreen){
      await photoViewer.requestFullscreen({navigationUI:'hide'});
      photoViewerNative=true;
    }
  }catch(e){photoViewerNative=false;}
}
function closePhotoViewer(fromFullscreen=false){
  photoViewer.classList.remove('show');
  photoViewer.setAttribute('aria-hidden','true');
  if(!fromFullscreen&&document.fullscreenElement===photoViewer&&document.exitFullscreen){
    document.exitFullscreen().catch(()=>{});
  }
  photoViewerNative=false;
}
photoAction.addEventListener('pointerdown',e=>{
  if(running||!activeCreation||activeCreation.mode!=='omikuji')return;
  e.preventDefault();e.stopPropagation();openPhotoViewer();
},{passive:false});
photoViewer.addEventListener('pointerdown',e=>{
  e.preventDefault();e.stopPropagation();closePhotoViewer();
},{passive:false});
photoViewerClose.addEventListener('pointerdown',e=>{
  e.preventDefault();e.stopPropagation();closePhotoViewer();
},{passive:false});
document.addEventListener('fullscreenchange',()=>{
  if(photoViewerNative&&document.fullscreenElement!==photoViewer&&photoViewer.classList.contains('show')){
    closePhotoViewer(true);
  }
});

})();