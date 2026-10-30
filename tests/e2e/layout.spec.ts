import { test, expect } from '@playwright/test';
test('S14 portrait and landscape GIF entry controls remain clickable',async({page})=>{
 await page.goto('/#home');
 for(const size of [{width:360,height:780},{width:780,height:360}]){
  await page.setViewportSize(size);
  const entry=page.locator('[data-route="gif"]');await entry.scrollIntoViewIfNeeded();await entry.click();await expect(page).toHaveURL(/#gif$/);
  const button=page.locator('#labGifChoosePast');
  // The router schedules a later scroll-to-top. Playwright's trial and real
  // clicks wait for a stable actionable target instead of sampling mid-scroll.
  await expect(button).toBeVisible();
  await button.click({trial:true});await button.click();
  await expect(page.locator('#labGifPast')).toBeVisible();await page.locator('#labGifSection [data-nav-back]').click();
 }
});
test('S14 home routes retain usable primary controls in narrow portrait and landscape',async({page})=>{
 await page.goto('/#home');
 const targets:[string,string][]=[['library','#deckSearch'],['favorites','#labCollectionSection [data-nav-back]'],['history','#legacyLibrarySection [data-nav-back]'],['settings','#frameCount'],['gif','#labGifChoosePast'],['share-picker','#sharePickerSection [data-nav-back]'],['receive','.receiveFileLabel']];
 for(const size of [{width:360,height:780},{width:780,height:360}]){await page.setViewportSize(size);
  for(const [route,selector] of targets){await page.locator(`[data-route="${route}"]`).click();await expect(page).toHaveURL(new RegExp(`#${route}$`));const control=page.locator(selector);await control.scrollIntoViewIfNeeded();await expect(control).toBeVisible();await control.click({trial:true,timeout:5000});
   const hit=await control.evaluate(el=>{const b=el.getBoundingClientRect();const target=document.elementFromPoint(b.x+b.width/2,b.y+b.height/2);return {w:b.width,h:b.height,inside:b.x+b.width/2>=0&&b.x+b.width/2<innerWidth&&b.y+b.height/2>=0&&b.y+b.height/2<innerHeight,hit:!!target&&(target===el||el.contains(target))}});
   expect(hit.w).toBeGreaterThan(0);expect(hit.h).toBeGreaterThan(0);expect(hit.inside).toBe(true);expect(hit.hit).toBe(true);
   await page.locator(`section[data-app-view="${route}"] [data-nav-back]`).first().click();await expect(page).toHaveURL(/#home$/);
  }
 }
});
test('S14 share output and stamp editor are operable in portrait and landscape',async({page})=>{
 await page.goto('/#home');const frames=await page.evaluate(()=>['red','blue'].map(color=>{const c=document.createElement('canvas');c.width=c.height=80;const x=c.getContext('2d')!;x.fillStyle=color;x.fillRect(0,0,80,80);return c.toDataURL()}));
 await page.locator('[data-route="receive"]').click();await page.locator('#shareImportFile').setInputFiles({name:'fixture.mmrplay',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({format:'memory-moments-playable',version:1,title:'Synthetic',mode:'roulette',frames,times:[0,1]}))});await expect(page).toHaveURL(/#play$/);await page.locator('#shareOpenFromPlay').click();
 for(const size of [{width:360,height:780},{width:780,height:360}]){
  await page.setViewportSize(size);await page.locator('#shareRouletteFormat').selectOption('photo');await page.locator('#shareRouletteMask').uncheck();await page.locator('#shareRouletteBuild').click();await expect(page.locator('#shareOutput')).toBeVisible();
  await page.locator('#shareOutputClose').click({trial:true});await page.locator('#shareOutputSave').click({trial:true});await page.locator('#shareOutputClose').click();
  await page.locator('#shareRouletteMask').check();await page.locator('#shareRouletteBuild').click();await expect(page.locator('#sharePrivacyEditor')).toBeVisible();await page.locator('#sharePrivacyCanvas').click({trial:true});await page.locator('#sharePrivacyClose').click({trial:true});await page.locator('#sharePrivacyClose').click();
 }
});
test('S14 create, play and GIF stamp controls remain usable after rotation',async({page})=>{
 test.setTimeout(90000);await page.goto('/#create');await expect(page.locator('#createPickBtn')).toBeVisible();await page.locator('#createPickBtn').click({trial:true});await page.goto('/#home');await page.reload();
 await page.locator('#fileInput').setInputFiles('tests/fixtures/synthetic-a.webm');await expect(page).toHaveURL(/#play$/,{timeout:60000});
 for(const size of [{width:360,height:780},{width:780,height:360}]){await page.setViewportSize(size);await page.locator('#stage').click({trial:true});await page.locator('#shareOpenFromPlay').click({trial:true})}
 await page.locator('#backBtn').click();await page.locator('[data-route="gif"]').click();await page.locator('#labGifChoosePast').click();await page.locator('#labGifSourceGrid .deckVideoPick').first().click();await expect(page.locator('#labGifEditor')).toBeVisible();
 for(const size of [{width:360,height:780},{width:780,height:360}]){await page.setViewportSize(size);await page.locator('#sharePrivacyGif').click();await expect(page.locator('#sharePrivacyEditor')).toBeVisible();await page.locator('#sharePrivacyCanvas').click({trial:true});await page.locator('#shareMaskNext').click({trial:true});await page.locator('#sharePrivacyExportSelected').click({trial:true});await page.locator('#sharePrivacyClose').click()}
});
test('S14 visible enabled controls in empty-data routes are hit-testable',async({page})=>{
 test.setTimeout(120000);await page.goto('/#home');const routes=['home','create','library','history','favorites','settings','gif','share-picker','receive'];
 for(const size of [{width:360,height:780},{width:780,height:360}]){await page.setViewportSize(size);for(const route of routes){await page.goto('/#'+route);await expect(page.locator('body')).toHaveAttribute('data-app-view',route);const controls=page.locator(`[data-app-view="${route}"]:not(body)`).locator('button:visible:enabled, select:visible:enabled, input:not([type=file]):visible:enabled, a[href]:visible');const count=await controls.count();for(let i=0;i<count;i++)await controls.nth(i).click({trial:true,timeout:5000});}}
});
test('S14 visible controls in populated play, share and GIF states are hit-testable',async({page})=>{
 test.setTimeout(120000);await page.goto('/#home');await page.locator('#fileInput').setInputFiles('tests/fixtures/synthetic-a.webm');await expect(page).toHaveURL(/#play$/,{timeout:60000});await page.locator('#stage').click();
 async function hitAll(selector:string){const controls=page.locator(selector).locator('button:visible:enabled, select:visible:enabled, input:not([type=file]):visible:enabled, a[href]:visible');const n=await controls.count();expect(n).toBeGreaterThan(0);for(let i=0;i<n;i++)await controls.nth(i).click({trial:true,timeout:5000})}
 for(const size of [{width:360,height:780},{width:780,height:360}]){await page.setViewportSize(size);await hitAll('#playSection');await page.locator('#shareOpenFromPlay').click();await hitAll('#shareSection');await page.locator('#shareRouletteFormat').selectOption('photo');await page.locator('#shareRouletteBuild').click();await expect(page.locator('#shareOutput')).toBeVisible();await hitAll('#shareOutput');await page.locator('#shareOutputClose').click();await page.locator('#shareRouletteMask').check();await page.locator('#shareRouletteBuild').click();await expect(page.locator('#sharePrivacyEditor')).toBeVisible();await hitAll('#sharePrivacyEditor');await page.locator('#sharePrivacyClose').click();await page.locator('#shareBackBtn').click()}
 await page.locator('#backBtn').click();await page.locator('[data-route="gif"]').click();await page.locator('#labGifChoosePast').click();await page.locator('#labGifSourceGrid .deckVideoPick').first().click();await expect(page.locator('#labGifEditor')).toBeVisible();
 for(const size of [{width:360,height:780},{width:780,height:360}]){await page.setViewportSize(size);await hitAll('#labGifEditor');await page.locator('#sharePrivacyGif').click();await expect(page.locator('#sharePrivacyEditor')).toBeVisible();await hitAll('#sharePrivacyEditor');await page.locator('#sharePrivacyClose').click()}
});
test('S14 populated history, favorites and share picker controls remain reachable',async({page})=>{
 await page.goto('/#home');await page.evaluate(async()=>{await (window as any).__memoryHistoryMigrationPromise;const c=document.createElement('canvas');c.width=c.height=50;const x=c.getContext('2d')!;x.fillStyle='blue';x.fillRect(0,0,50,50);const img=c.toDataURL();for(const [name,store,record] of [['babyExpressionRouletteDB','creations',{id:'a',title:'Synthetic A',createdAt:1700000000000,mode:'roulette',frames:[img,img],times:[0,1]}],['babyExpressionRouletteLabDB','dailyPhotos',{id:'f',createdAt:1700000000000,image:img,fortune:'吉'}]] as [string,string,any][]){const db=await new Promise<IDBDatabase>((resolve,reject)=>{const r=indexedDB.open(name);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});await new Promise<void>((resolve,reject)=>{const tx=db.transaction(store,'readwrite');tx.objectStore(store).put(record);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error)});db.close()}});await page.reload();
 for(const size of [{width:360,height:780},{width:780,height:360}]){await page.setViewportSize(size);for(const route of ['history','favorites','share-picker']){await page.locator(`[data-route="${route}"]`).click();const root=page.locator(`section[data-app-view="${route}"]`);if(route==='history')await expect(root.locator('.saved')).toHaveCount(1);if(route==='favorites')await expect(root.locator('.labPhotoCard')).toHaveCount(1);if(route==='share-picker')await expect(root.locator('.shareSavedCard')).toHaveCount(1);const controls=root.locator('button:visible:enabled,select:visible:enabled,input:not([type=file]):visible:enabled,a[href]:visible');for(let i=0;i<await controls.count();i++)await controls.nth(i).click({trial:true,timeout:5000});await root.locator('[data-nav-back]').first().click()}}
});
test('S14 help and favorite viewer dialogs remain operable in both orientations',async({page})=>{
 await page.goto('/#home');await page.evaluate(async()=>{const c=document.createElement('canvas');c.width=c.height=50;const x=c.getContext('2d')!;x.fillStyle='blue';x.fillRect(0,0,50,50);const db=await new Promise<IDBDatabase>((resolve,reject)=>{const r=indexedDB.open('babyExpressionRouletteLabDB',1);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});await new Promise<void>((resolve,reject)=>{const t=db.transaction('dailyPhotos','readwrite');t.objectStore('dailyPhotos').put({id:'f',image:c.toDataURL(),createdAt:1700000000000});t.oncomplete=()=>resolve();t.onerror=()=>reject(t.error)});db.close()});await page.reload();
 for(const size of [{width:360,height:780},{width:780,height:360}]){await page.setViewportSize(size);await page.locator('#howtoOpen').click();await expect(page.locator('#howtoModal')).toHaveAttribute('aria-hidden','false');const help=page.locator('#howtoModal button:visible:enabled');for(let i=0;i<await help.count();i++)await help.nth(i).click({trial:true,timeout:5000});await page.locator('#howtoClose').click();
 await page.locator('[data-route="favorites"]').click();await page.locator('.labPhotoOpen').click();await expect(page.locator('#labPhotoViewer')).toHaveClass(/show/);await page.locator('#labPhotoViewerClose').click({trial:true});await page.locator('#labPhotoViewerDone').click({trial:true});await page.locator('#labPhotoViewerClose').click();await page.locator('#labCollectionSection [data-nav-back]').click();}
});
test('S14 special result overlay controls remain reachable after rotation',async({page})=>{
 test.setTimeout(90000);await page.goto('/#home');await page.locator('#fileInput').setInputFiles('tests/fixtures/synthetic-a.webm');await expect(page).toHaveURL(/#play$/,{timeout:60000});await page.evaluate(async()=>{await (window as any).__memorySettingsReady});
 for(const size of [{width:360,height:780},{width:780,height:360}]){await page.setViewportSize(size);await page.evaluate(()=>{const select=document.querySelector('#labSpecialMode') as HTMLSelectElement;select.value='miracle';select.dispatchEvent(new Event('change',{bubbles:true}))});await page.locator('#stage').click();await expect(page.locator('#labMiracleOverlay')).toHaveClass(/show/,{timeout:15000});const controls=page.locator('#labMiracleOverlay button:visible:enabled');await expect(controls.first()).toBeVisible({timeout:30000});for(let i=0;i<await controls.count();i++)await controls.nth(i).click({trial:true,timeout:5000});await page.locator('#labMiracleBack').click();await page.locator('#stage').click();}
});
