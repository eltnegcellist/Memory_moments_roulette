(()=>{
'use strict';
const VALID=new Set(['home','create','library','play','favorites','history','settings']);
let currentView='home';
let returnFromPlay='home';
let scrollToken=0;

function routeFromHash(){
  const raw=(location.hash||'').replace(/^#/,'');
  return VALID.has(raw)?raw:'home';
}
function forceTop(){
  const token=++scrollToken;
  const go=()=>{
    if(token!==scrollToken)return;
    window.scrollTo(0,0);
    document.documentElement.scrollTop=0;
    document.body.scrollTop=0;
  };
  go();
  requestAnimationFrame(()=>{go();requestAnimationFrame(go);});
  setTimeout(go,60);
}
function applyView(view){
  const target=VALID.has(view)?view:'home';
  if(currentView==='favorites'&&target!=='favorites'){
    Promise.resolve(window.__memoryCommitFavoriteDeletes?.()).catch(err=>console.error('favorite delete commit failed',err));
  }
  document.body.dataset.appView=target;
  document.querySelectorAll('[data-app-view]').forEach(el=>{
    const active=el.dataset.appView===target;
    el.hidden=false;
    el.classList.toggle('is-active-view',active);
    el.setAttribute('aria-hidden',active?'false':'true');
  });
  currentView=target;
  if(target==='library')window.__memoryDeckRender?.();
  forceTop();
}
function writeRoute(target,replace=false){
  const hash='#'+target;
  if(location.hash===hash)return;
  try{
    const fn=replace?'replaceState':'pushState';
    window.history[fn]({view:target},'',hash);
  }catch(e){
    location.hash=hash;
  }
}
function navigate(view,options={}){
  const target=VALID.has(view)?view:'home';
  if(target==='play'&&currentView!=='play'){
    returnFromPlay=currentView==='create'?'home':currentView;
  }
  // Paint the destination first. History updates must never be able to leave a blank page.
  applyView(target);
  writeRoute(target,!!options.replace);
}
window.__memoryNavigate=navigate;
window.__memoryBackFromPlay=()=>navigate(returnFromPlay||'home');

document.addEventListener('click',e=>{
  const newBtn=e.target.closest?.('#homeNewVideoBtn,#createPickBtn');
  if(newBtn){
    e.preventDefault();
    document.getElementById('fileInput')?.click();
    return;
  }
  const back=e.target.closest?.('[data-nav-back]');
  if(back){
    e.preventDefault();
    navigate('home');
    return;
  }
  const routeBtn=e.target.closest?.('[data-route]');
  if(routeBtn){
    e.preventDefault();
    const route=routeBtn.dataset.route;
    navigate(route);
    if(route==='library'){
      Promise.resolve(window.__memoryDeckStartSelection?.()).catch(err=>console.error('library selection init failed',err));
    }
  }
});

document.getElementById('fileInput')?.addEventListener('change',e=>{
  if(e.currentTarget.files?.length)navigate('create');
});

window.addEventListener('popstate',()=>applyView(routeFromHash()));
window.addEventListener('hashchange',()=>applyView(routeFromHash()));
applyView(routeFromHash());
})();