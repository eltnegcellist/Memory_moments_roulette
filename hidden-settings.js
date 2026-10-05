(()=>{
const trigger=document.getElementById('labSettingsTrigger');
const detailOptions=document.getElementById('detailOptions');
const inline=document.getElementById('labSettingsInline');
const hint=document.getElementById('labSettingsHint');
const scoreBox=document.getElementById('showScores');
const deluxeMode=document.getElementById('deluxeMode');
const deluxeItem=document.getElementById('labDeluxeItem');
const specialMode=document.getElementById('labSpecialMode');
const plainMode=document.getElementById('plainMode');
const resetAppDataBtn=document.getElementById('labResetAppData');
if(!trigger||!detailOptions||!inline||!scoreBox||!deluxeMode||!specialMode||!plainMode)return;

const KEY='baby-roulette-hidden-settings-v29';
const LEGACY_KEY='baby-roulette-hidden-settings-v27';
let taps=0;
let tapTimer=null;
let deluxePreference=true;
let syncingDeluxe=false;
let labVisible=false;

function readSettings(){
  let data={};
  try{
    const raw=localStorage.getItem(KEY)||localStorage.getItem(LEGACY_KEY)||'{}';
    data=JSON.parse(raw)||{};
  }catch(e){}
  return data;
}
function save(){
  try{
    localStorage.setItem(KEY,JSON.stringify({
      showScores:!!scoreBox.checked,
      deluxeEnabled:!!deluxePreference,
      specialTestMode:specialMode.value||'normal'
    }));
  }catch(e){}
}
function syncDeluxeForMode(){
  syncingDeluxe=true;
  if(plainMode.checked){
    deluxeMode.checked=false;
    deluxeMode.disabled=true;
    deluxeItem?.classList.add('disabled-by-plain');
  }else{
    deluxeMode.disabled=false;
    deluxeMode.checked=!!deluxePreference;
    deluxeItem?.classList.remove('disabled-by-plain');
  }
  syncingDeluxe=false;
}
function renderLabVisibility(){
  inline.hidden=!labVisible;
  if(hint)hint.style.display=labVisible?'none':'block';
  trigger.title='5回タップでLAB設定を表示・非表示';
}
function toggleLab(){
  labVisible=!labVisible;
  renderLabVisibility();
  if(labVisible){
    detailOptions.open=true;
    inline.classList.remove('justUnlocked');
    void inline.offsetWidth;
    inline.classList.add('justUnlocked');
    setTimeout(()=>inline.classList.remove('justUnlocked'),1100);
    setTimeout(()=>inline.scrollIntoView({behavior:'smooth',block:'nearest'}),80);
  }
}
function load(){
  const data=readSettings();
  scoreBox.checked=!!data.showScores;
  specialMode.value=data.specialTestMode||((data.extremeMode===true)?'slow':'normal');
  window.__babyLabSpecialMode=specialMode.value;
  window.__babyLabForcedSpecial=null;
  deluxePreference=typeof data.deluxeEnabled==='boolean'?data.deluxeEnabled:true;
  labVisible=false;
  syncDeluxeForMode();
  renderLabVisibility();
  scoreBox.dispatchEvent(new Event('change',{bubbles:true}));
  save();
}

trigger.addEventListener('click',()=>{
  taps++;
  clearTimeout(tapTimer);
  tapTimer=setTimeout(()=>{taps=0;},1800);
  if(taps>=5){
    taps=0;
    clearTimeout(tapTimer);
    toggleLab();
  }
});

scoreBox.addEventListener('change',save);
specialMode.addEventListener('change',()=>{window.__babyLabSpecialMode=specialMode.value;window.__babyLabForcedSpecial=null;save();});
deluxeMode.addEventListener('change',()=>{
  if(syncingDeluxe||plainMode.checked)return;
  deluxePreference=!!deluxeMode.checked;
  save();
});
plainMode.addEventListener('change',syncDeluxeForMode);
resetAppDataBtn?.addEventListener('click',()=>{
  const ok=confirm('この端末の「思い出ルーレットおみくじ」の思い出デッキ・保存済みルーレット・今日の一枚・LAB設定・キャッシュをすべて削除します。元に戻せません。完全初期化しますか？');
  if(!ok)return;
  try{sessionStorage.setItem('baby-roulette-reset-authorized','1');}catch(e){}
  location.href='./reset.html?from=lab&ts='+Date.now();
});

load();

// LAB special-effect forcing. Reversal needs a genuine 大凶 base result so
// the full production sequence can be tested exactly as users will see it.
const previousStop=stopRun;
stopRun=function(){
  let forced=null;
  if(activeCreation?.mode==='omikuji'){
    const mode=specialMode.value||'normal';
    if(mode==='miracle')forced='miracle';
    if(mode==='reversal')forced='reversal';
    if(mode==='slow')forced=Math.random()<.5?'miracle':'reversal';
  }
  window.__babyLabForcedSpecial=forced;
  previousStop();
};
})();