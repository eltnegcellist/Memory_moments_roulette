(()=>{
'use strict';
const VALID=new Set(['home','create','library','play','favorites','history','settings']);
let currentView='home';
let returnFromPlay='home';

function routeFromHash(){
  const raw=(location.hash||'').replace(/^#/,'');
  return VALID.has(raw)?raw:'home';
}
function applyView(view){
  const target=VALID.has(view)?view:'home';
  document.querySelectorAll('[data-app-view]').forEach(el=>{
    el.hidden=el.dataset.appView!==target;
  });
  document.body.dataset.appView=target;
  currentView=target;
  if(target==='library')window.__memoryDeckRender?.();
  window.scrollTo({top:0,behavior:'auto'});
}
function navigate(view,options={}){
  const target=VALID.has(view)?view:'home';
  if(target==='play'&&currentView!=='play'){
    returnFromPlay=currentView==='create'?'home':currentView;
  }
  const hash='#'+target;
  if(location.hash!==hash){
    const fn=options.replace?'replaceState':'pushState';
    history[fn]({view:target},'',hash);
  }
  applyView(target);
}
window.__memoryNavigate=navigate;
window.__memoryBackFromPlay=()=>navigate(returnFromPlay||'home');

document.addEventListener('click',async e=>{
  const newBtn=e.target.closest('#homeNewVideoBtn,#createPickBtn');
  if(newBtn){
    e.preventDefault();
    document.getElementById('fileInput')?.click();
    return;
  }
  const back=e.target.closest('[data-nav-back]');
  if(back){
    e.preventDefault();
    navigate('home');
    return;
  }
  const routeBtn=e.target.closest('[data-route]');
  if(routeBtn){
    e.preventDefault();
    const route=routeBtn.dataset.route;
    if(route==='library')await window.__memoryDeckStartSelection?.();
    navigate(route);
  }
});

document.getElementById('fileInput')?.addEventListener('change',e=>{
  if(e.currentTarget.files?.length)navigate('create');
});

window.addEventListener('popstate',()=>applyView(routeFromHash()));
applyView(routeFromHash());
})();