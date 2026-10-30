import { test, expect, Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test.beforeEach(async ({page}) => { await page.addInitScript(() => { Object.defineProperty(window, 'showSaveFilePicker', { value: undefined }); }); });
async function routes(page: Page, route: string) {
  await expect(page).toHaveURL(new RegExp('#' + route + '$'));
  await expect(page.locator('body')).toHaveAttribute('data-app-view', route);
  const shown = await page.locator('section[data-app-view]').evaluateAll(es => [...new Set(es.filter(e => { const s = getComputedStyle(e); return s.display !== 'none' && s.visibility !== 'hidden' && e.getClientRects().length > 0; }).map(e => (e as HTMLElement).dataset.appView))]);
  expect(shown).toEqual([route]);
}
async function dbCounts(page: Page) {
 await page.evaluate(async () => { await Promise.all([(window as any).__memoryHistoryMigrationPromise, (window as any).__memorySettingsReady]); });
 return page.evaluate(async () => {
  const names = ['babyExpressionRouletteDB','babyExpressionRouletteLabDB'];
  const result: Record<string,Record<string,number>> = {};
  for (const name of names) {
   const db = await new Promise<IDBDatabase>((resolve,reject) => { const r=indexedDB.open(name); r.onsuccess=()=>resolve(r.result); r.onerror=()=>reject(r.error); });
   result[name] = {};
   for (const store of Array.from(db.objectStoreNames)) result[name][store] = await new Promise<number>((resolve,reject)=>{ const r=db.transaction(store).objectStore(store).count();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error); });
   db.close();
  }
  return result;
 });
}
async function creationRecords(page: Page) {
 return page.evaluate(async()=>{const db=await new Promise<IDBDatabase>((resolve,reject)=>{const r=indexedDB.open('babyExpressionRouletteDB',3);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});const records=await new Promise<any[]>((resolve,reject)=>{const r=db.transaction('creations').objectStore('creations').getAll();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});db.close();return records});
}
async function userRecords(page: Page) {
 return page.evaluate(async()=>{const out:Record<string,unknown[]>={};for(const [name,stores] of [['babyExpressionRouletteDB',['creations','deckSources','deckFrames','deckReplays','deckMeta']],['babyExpressionRouletteLabDB',['dailyPhotos']]] as [string,string[]][]){const db=await new Promise<IDBDatabase>((resolve,reject)=>{const r=indexedDB.open(name);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});for(const store of stores)out[store]=await new Promise<any[]>((resolve,reject)=>{const r=db.transaction(store).objectStore(store).getAll();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});db.close()}return out});
}
async function synthetic(page: Page) {
 return page.evaluate(() => ['#e83131','#1650dd'].map((color,i)=>{ const c=document.createElement('canvas');c.width=120;c.height=80;const ctx=c.getContext('2d')!;ctx.fillStyle=color;ctx.fillRect(0,0,120,80);ctx.fillStyle='white';ctx.font='40px sans-serif';ctx.fillText(String(i+1),45,55);return c.toDataURL('image/png'); }));
}
async function importSynthetic(page: Page) {
 const frames = await synthetic(page);
 await page.locator('[data-route="receive"]').click();
 await routes(page,'receive');
 const data={format:'memory-moments-playable',version:1,title:'Synthetic A',mode:'roulette',frames,times:[0,1]};
 await page.locator('#shareImportFile').setInputFiles({name:'synthetic.mmrplay',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(data))});
 await routes(page,'play');
 return frames;
}
test('N10 receive → play → share → play → receive keeps data temporary @smoke', async ({page})=>{
 await page.goto('/#home');
 const seed=await synthetic(page);
 await page.evaluate(async frames=>{await (window as any).__memoryHistoryMigrationPromise;const db=await new Promise<IDBDatabase>((resolve,reject)=>{const r=indexedDB.open('babyExpressionRouletteDB',3);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});await new Promise<void>((resolve,reject)=>{const tx=db.transaction('creations','readwrite');tx.objectStore('creations').put({id:'canary',title:'Existing',createdAt:1700000000000,mode:'roulette',frames,times:[0,1]});tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error)});db.close()},seed);
 const before=await dbCounts(page);const existing=await creationRecords(page);
 const frames=await importSynthetic(page);
 await page.locator('#stage').click();
 const stopped=await page.locator('#playImage').getAttribute('src'); expect(frames).toContain(stopped);
 await page.locator('#shareOpenFromPlay').click(); await routes(page,'share');
 await expect(page.locator('#shareSelectedFrameImage')).toHaveAttribute('src',stopped!);
 await page.locator('#shareBackBtn').click(); await routes(page,'play');
 await expect(page.locator('#playImage')).toHaveAttribute('src',stopped!);
 await page.locator('#backBtn').click(); await routes(page,'receive');
 expect(await dbCounts(page)).toEqual(before);expect(await creationRecords(page)).toEqual(existing);
});
test('N14 playable file contains selected synthetic frames @smoke',async({page})=>{
 await page.goto('/#home'); const frames=await importSynthetic(page);
 await page.locator('#shareOpenFromPlay').click(); await routes(page,'share');
 await page.locator('#shareRouletteFormat').selectOption('play');
 await page.locator('#shareRouletteBuild').click();
 await expect(page.locator('#shareOutput')).toBeVisible();
 await page.evaluate(()=>{const save=(window as any).__memorySaveMediaFile;(window as any).__memorySaveMediaFile=(blob:Blob,name:string)=>{(window as any).__observedMime=blob.type;return save(blob,name)}});
 const downloadPromise=page.waitForEvent('download'); await page.locator('#shareOutputSave').click();
 const download=await downloadPromise; expect(await page.evaluate(()=>(window as any).__observedMime)).toBe('application/json');expect(download.suggestedFilename()).toMatch(/\.mmrplay$/);
 const raw=await readFile((await download.path())!,'utf8'); const data=JSON.parse(raw);
 expect(data.format).toBe('memory-moments-playable'); expect(data.version).toBe(1); expect(data.frames).toEqual(frames);
});
test('S09 invalid receive file reports error and preserves DB @smoke',async({page})=>{
 await page.goto('/#home'); const before=await dbCounts(page);
 await page.locator('[data-route="receive"]').click(); await routes(page,'receive');
 await page.locator('#shareImportFile').setInputFiles({name:'broken.mmrplay',mimeType:'application/json',buffer:Buffer.from('{broken')});
 await expect(page.locator('#receiveStatus')).toContainText('読み込めませんでした');
 await routes(page,'receive'); expect(await dbCounts(page)).toEqual(before);
});
test('N17 direct gif and empty play deep links remain usable @smoke',async({page})=>{
 await page.goto('/#gif'); await routes(page,'gif');
 await expect(page.locator('#labGifAddVideo')).toBeVisible();
 await page.reload(); await routes(page,'gif');
 await page.goto('/#play'); await page.reload(); await expect(page).toHaveURL(/#home$/); await routes(page,'home');
});
test('N12/S01 selected photo and mask do not leak into subsequent unmasked JPEG',async({page})=>{
 await page.goto('/#home'); const sourceFrames=await importSynthetic(page);
 await page.locator('#shareOpenFromPlay').click(); await routes(page,'share');
 await page.locator('#shareAllFramesDetails summary').click();
 await page.getByRole('button',{name:'2コマ目を停止位置にする'}).click();
 await expect(page.locator('#shareSelectedFrameLabel')).toContainText('2 / 2');
 await page.locator('#shareRouletteFormat').selectOption('photo');
 await expect(page.locator('#shareSelectedFrameLabel')).toContainText('2 / 2');
 await page.evaluate(()=>{const save=(window as any).__memorySaveMediaFile;(window as any).__memorySaveMediaFile=(blob:Blob,name:string)=>{(window as any).__observedMime=blob.type;return save(blob,name)}});
 async function save() {
  const pending=page.waitForEvent('download'); await page.locator('#shareOutputSave').click();
  const d=await pending; expect(await page.evaluate(()=>(window as any).__observedMime)).toBe('image/jpeg');expect(d.suggestedFilename()).toMatch(/\.jpg$/); return readFile((await d.path())!);
 }
 await page.locator('#shareRouletteMask').check(); await page.locator('#shareRouletteBuild').click();
 await expect(page.locator('#sharePrivacyEditor')).toBeVisible();
 await page.locator('#sharePrivacyCanvas').click({position:{x:20,y:20}});
 await page.locator('#sharePrivacyExportSelected').click(); await expect(page.locator('#shareOutput')).toBeVisible();
 const masked=await save();
 await expect(page.locator('#shareSelectedFrameLabel')).toContainText('2 / 2');
 await page.locator('#shareRouletteMask').uncheck(); await page.locator('#shareRouletteBuild').click();
 await expect(page.locator('#shareOutput')).toBeVisible(); const plain=await save();
 expect(plain.subarray(0,3)).toEqual(Buffer.from([0xff,0xd8,0xff]));
 async function pixel(buf:Buffer,x:number,y:number) {return page.evaluate(async ({data,x,y})=>{const image=new Image(); image.src=`data:image/jpeg;base64,${data}`; await image.decode();const c=document.createElement('canvas');c.width=image.width;c.height=image.height;const ctx=c.getContext('2d')!;ctx.drawImage(image,0,0);return Array.from(ctx.getImageData(x,y,1,1).data);},{data:buf.toString('base64'),x,y});}
 const blue=await pixel(plain,5,5); expect(blue[2]).toBeGreaterThan(150);expect(blue[2]).toBeGreaterThan(blue[0]);
 const p=await pixel(plain,20,20),m=await pixel(masked,20,20); expect(m.slice(0,3)).not.toEqual(p.slice(0,3));
 const meanError=await page.evaluate(async ({src,jpeg})=>{async function pixels(src:string){const img=new Image();img.src=src;await img.decode();const c=document.createElement('canvas');c.width=img.width;c.height=img.height;const x=c.getContext('2d')!;x.drawImage(img,0,0);return x.getImageData(0,0,c.width,c.height).data}const a=await pixels(src),b=await pixels('data:image/jpeg;base64,'+jpeg);if(a.length!==b.length)throw Error('dimensions differ');let sum=0,maxRegion=0;for(let i=0;i<a.length;i+=4)for(let k=0;k<3;k++){const d=Math.abs(a[i+k]-b[i+k]);sum+=d;const n=i/4;if(n%120<35&&Math.floor(n/120)<35)maxRegion=Math.max(maxRegion,d)}return {mean:sum/(a.length/4*3),maxRegion}},{src:sourceFrames[1],jpeg:plain.toString('base64')});expect(meanError.mean).toBeLessThan(5);expect(meanError.maxRegion).toBeLessThan(35);

});
test('N06/N07 history selection returns to picker with selected image',async({page})=>{
 await page.goto('/#home'); const frames=await synthetic(page);
 await page.evaluate(async frames=>{
  await (window as any).__memoryHistoryMigrationPromise;
  const db=await new Promise<IDBDatabase>((resolve,reject)=>{const r=indexedDB.open('babyExpressionRouletteDB',3);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});
  await new Promise<void>((resolve,reject)=>{const tx=db.transaction('creations','readwrite');tx.objectStore('creations').put({id:'a',title:'Synthetic A',createdAt:1700000000000,mode:'roulette',frames,times:[0,1]});tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});db.close();
 },frames);
 await page.locator('[data-route="share-picker"]').click(); await routes(page,'share-picker');
 await page.locator('.shareSavedCard').filter({hasText:'Synthetic A'}).click(); await routes(page,'share');
 await expect(page.locator('#shareSourceState')).toContainText('Synthetic A');
 await expect(page.locator('#shareSelectedFrameImage')).toHaveAttribute('src',frames[0]);
 await page.locator('#shareBackBtn').click(); await routes(page,'share-picker');
 await expect(page.locator('.shareSavedCard').filter({hasText:'Synthetic A'})).toBeVisible();
});
test('N16/S04 real synthetic video through GIF import UI keeps roulette history',async({page})=>{
 test.setTimeout(120000);
 await page.goto('/#home'); const before=await dbCounts(page);
 await page.locator('[data-route="gif"]').click(); await routes(page,'gif');
 await page.locator('#labGifFileInput').setInputFiles('tests/fixtures/synthetic-a.webm');
 await expect(page.locator('#labGifEditor')).toBeVisible({timeout:90000});
 await expect(page.locator('#labGifSelectedTitle')).toContainText('8コマ');
 const previewPixel=await page.locator('#labGifSelectedFrames img').first().evaluate(async (img:HTMLImageElement)=>{await img.decode();const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;const x=c.getContext('2d')!;x.drawImage(img,0,0);return Array.from(x.getImageData(5,5,1,1).data);});
 expect(previewPixel[0]).toBeLessThan(80); expect(previewPixel[1]).toBeLessThan(90); expect(previewPixel[2]).toBeGreaterThan(40);
 await expect(page.locator('#labMakeGif')).toBeEnabled(); await routes(page,'gif');
 const after=await dbCounts(page);
 expect(after.babyExpressionRouletteDB.creations).toBe(before.babyExpressionRouletteDB.creations);
 expect(after.babyExpressionRouletteDB.deckSources).toBe(before.babyExpressionRouletteDB.deckSources+1);
 expect(after.babyExpressionRouletteDB.deckFrames).toBeGreaterThan(before.babyExpressionRouletteDB.deckFrames);
});
test('N08 history → play → share → play → history preserves selected creation',async({page})=>{
 await page.goto('/#home'); const frames=await synthetic(page);
 await page.evaluate(async frames=>{
  await (window as any).__memoryHistoryMigrationPromise;
  const db=await new Promise<IDBDatabase>((resolve,reject)=>{const r=indexedDB.open('babyExpressionRouletteDB',3);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});
  await new Promise<void>((resolve,reject)=>{const tx=db.transaction('creations','readwrite');tx.objectStore('creations').put({id:'a',title:'Synthetic A',createdAt:1700000000000,mode:'roulette',frames,times:[0,1]});tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});db.close();
 },frames);
 await page.reload(); await page.locator('[data-route="history"]').click(); await routes(page,'history');
 await page.locator('.saved').filter({hasText:'Synthetic A'}).getByRole('button',{name:'遊ぶ'}).click();
 await routes(page,'play'); await page.locator('#stage').click();
 const stopped=await page.locator('#playImage').getAttribute('src'); expect(frames).toContain(stopped);
 await page.locator('#shareOpenFromPlay').click(); await routes(page,'share');
 await expect(page.locator('#shareSourceState')).toContainText('Synthetic A');
 await expect(page.locator('#shareSelectedFrameImage')).toHaveAttribute('src',stopped!);
 await page.locator('#shareBackBtn').click(); await routes(page,'play');
 await expect(page.locator('#playImage')).toHaveAttribute('src',stopped!);
 await page.locator('#backBtn').click(); await routes(page,'history');
 await expect(page.locator('.saved').filter({hasText:'Synthetic A'})).toBeVisible();
});
test('N16 normal synthetic video import reaches play and persists history',async({page})=>{
 test.setTimeout(120000);
 await page.goto('/#home'); const before=await dbCounts(page);
 await page.evaluate(()=>{(window as any).__viewTransitions=[];new MutationObserver(()=>{(window as any).__viewTransitions.push(document.body.dataset.appView)}).observe(document.body,{attributes:true,attributeFilter:['data-app-view']})});
 await page.locator('#fileInput').setInputFiles('tests/fixtures/synthetic-a.webm');
 await expect(page).toHaveURL(/#play$/, {timeout:90000}); await routes(page,'play');
 const transitions=await page.evaluate(()=>(window as any).__viewTransitions as string[]);expect(transitions.indexOf('create')).toBeGreaterThanOrEqual(0);expect(transitions.lastIndexOf('play')).toBeGreaterThan(transitions.indexOf('create'));
 await expect(page.locator('#playImage')).toHaveAttribute('src',/^data:image\//);
 await expect.poll(async()=>(await dbCounts(page)).babyExpressionRouletteDB.creations,{timeout:15000}).toBe(before.babyExpressionRouletteDB.creations+1);
 const after=await dbCounts(page);expect(after.babyExpressionRouletteDB.deckSources).toBe(before.babyExpressionRouletteDB.deckSources+1);
});
test('N15/S15 browser back and forward alternate with in-app back',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/#home');
 for(let i=0;i<12;i++){
  await page.locator('[data-route="gif"]').click(); await routes(page,'gif');
  await page.goBack(); await routes(page,'home');
  await page.goForward(); await routes(page,'gif');
  await page.locator('#labGifSection [data-nav-back]').click(); await routes(page,'home');
 }
 expect(errors).toEqual([]);
});
test('N14 selected stop frame is present in generated roulette movie',async({page})=>{
 test.setTimeout(60000); await page.goto('/#home');await importSynthetic(page);
 await page.locator('#shareOpenFromPlay').click(); await routes(page,'share');
 await page.locator('#shareAllFramesDetails summary').click();
 await page.getByRole('button',{name:'2コマ目を停止位置にする'}).click();
 await page.locator('#shareRouletteFormat').selectOption('movie');
 await page.locator('#shareRouletteBuild').click(); await expect(page.locator('#shareOutput')).toBeVisible({timeout:30000});
 await page.evaluate(()=>{const save=(window as any).__memorySaveMediaFile;(window as any).__memorySaveMediaFile=(blob:Blob,name:string)=>{(window as any).__observedMime=blob.type;return save(blob,name)}});
 const pending=page.waitForEvent('download'); await page.locator('#shareOutputSave').click(); const d=await pending;
 const ext=d.suggestedFilename().endsWith('.mp4')?'mp4':'webm';expect(d.suggestedFilename()).toMatch(/\.(mp4|webm)$/);
 expect(await page.evaluate(()=>(window as any).__observedMime)).toBe(ext==='mp4'?'video/mp4':'video/webm');
 const bytes=await readFile((await d.path())!);expect(bytes.length).toBeGreaterThan(1000);
 if(ext==='webm')expect(bytes.subarray(0,4)).toEqual(Buffer.from([0x1a,0x45,0xdf,0xa3]));
 else expect(bytes.subarray(4,8).toString()).toBe('ftyp');
 const playback=await page.evaluate(async ({data,ext})=>{
  const binary=Uint8Array.from(atob(data),c=>c.charCodeAt(0));const url=URL.createObjectURL(new Blob([binary],{type:ext==='mp4'?'video/mp4':'video/webm'}));
  try { const v=document.createElement('video');v.src=url;v.muted=true;await new Promise<void>((resolve,reject)=>{v.onloadedmetadata=()=>resolve();v.onerror=()=>reject(new Error('video metadata failed'))});
   v.currentTime=2.7;await new Promise<void>((resolve,reject)=>{v.onseeked=()=>resolve();v.onerror=()=>reject(new Error('video seek failed'))});
   const c=document.createElement('canvas');c.width=v.videoWidth;c.height=v.videoHeight;const ctx=c.getContext('2d')!;ctx.drawImage(v,0,0);return {duration:v.duration,rgb:Array.from(ctx.getImageData(20,Math.floor(c.height/2),1,1).data)};
  } finally {URL.revokeObjectURL(url)}
 },{data:bytes.toString('base64'),ext});
 expect(playback.duration).toBeGreaterThan(2.7);expect(playback.duration).toBeLessThan(10);expect(playback.rgb[2]).toBeGreaterThan(120);expect(playback.rgb[2]).toBeGreaterThan(playback.rgb[0]);
});
test('N09 library selection → play → share → play → library',async({page})=>{
 test.setTimeout(90000);await page.goto('/#home');
 await page.locator('[data-route="gif"]').click();await page.locator('#labGifFileInput').setInputFiles('tests/fixtures/synthetic-a.webm');
 await expect(page.locator('#labGifEditor')).toBeVisible({timeout:60000});
 await page.locator('#labGifSection [data-nav-back]').click();await routes(page,'home');
 await page.locator('#homePastVideoBtn').click();await routes(page,'library');
 await page.locator('#deckPicker .deckVideoPick').first().click();
 await expect(page.locator('#deckDrawBtn')).toBeEnabled();await page.locator('#deckDrawBtn').click();
 await routes(page,'play');await page.locator('#stage').click();
 const stopped=await page.locator('#playImage').getAttribute('src');expect(stopped).toMatch(/^data:image\//);
 const index=await page.evaluate(()=>(window as any).__memoryShareGetCurrentIndex());
 async function rgb(src:string) {return page.evaluate(async src=>{const img=new Image();img.src=src;await img.decode();const c=document.createElement('canvas');c.width=img.width;c.height=img.height;const x=c.getContext('2d')!;x.drawImage(img,0,0);return Array.from(x.getImageData(5,5,1,1).data).slice(0,3)},src)}
 const before=await rgb(stopped!);
 await page.locator('#shareOpenFromPlay').click();await routes(page,'share');
 const selected=await page.locator('#shareSelectedFrameImage').getAttribute('src');
 const shared=await rgb(selected!);shared.forEach((v,i)=>expect(Math.abs(v-before[i])).toBeLessThan(40));
 await page.locator('#shareBackBtn').click();await routes(page,'play');
 expect(await page.evaluate(()=>(window as any).__memoryShareGetCurrentIndex())).toBe(index);
 const after=await rgb((await page.locator('#playImage').getAttribute('src'))!);after.forEach((v,i)=>expect(Math.abs(v-before[i])).toBeLessThan(40));
 await page.locator('#backBtn').click();await routes(page,'library');
});
test('N11 favorite sharing produces selected JPEG and returns to favorites',async({page})=>{
 await page.goto('/#home'); const frames=await synthetic(page);
 await page.evaluate(async image=>{const db=await new Promise<IDBDatabase>((resolve,reject)=>{const r=indexedDB.open('babyExpressionRouletteLabDB',1);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});await new Promise<void>((resolve,reject)=>{const t=db.transaction('dailyPhotos','readwrite');t.objectStore('dailyPhotos').put({id:'favorite-a',image,createdAt:1700000000000,fortune:'吉'});t.oncomplete=()=>resolve();t.onerror=()=>reject(t.error)});db.close()},frames[1]);
 await page.reload();await page.locator('[data-route="favorites"]').click();await routes(page,'favorites');
 await page.locator('.labPhotoCard').getByRole('button',{name:'共有する'}).click();await routes(page,'share');
 await expect(page.locator('#shareFavoriteOptions')).toBeVisible();await expect(page.locator('#shareRouletteOptions')).not.toBeVisible();
 await page.locator('#shareFavoriteBuild').click();await expect(page.locator('#shareOutput')).toBeVisible();
 const pending=page.waitForEvent('download');await page.locator('#shareOutputSave').click();const file=await pending;
 expect(file.suggestedFilename()).toMatch(/\.jpg$/);const bytes=await readFile((await file.path())!);expect(bytes.subarray(0,3)).toEqual(Buffer.from([255,216,255]));
 const rgb=await page.evaluate(async data=>{const img=new Image();img.src=`data:image/jpeg;base64,${data}`;await img.decode();const c=document.createElement('canvas');c.width=img.width;c.height=img.height;const x=c.getContext('2d')!;x.drawImage(img,0,0);return Array.from(x.getImageData(5,5,1,1).data)},bytes.toString('base64'));
 expect(rgb[2]).toBeGreaterThan(150);expect(rgb[2]).toBeGreaterThan(rgb[0]);
 await page.locator('#shareBackBtn').click();await routes(page,'favorites');await expect(page.locator('.labPhotoCard')).toHaveCount(1);
});
test('S09 unsupported and oversized received files leave data untouched',async({page})=>{
 await page.goto('/#home');const frames=await synthetic(page);
 await page.evaluate(async frames=>{await (window as any).__memoryHistoryMigrationPromise;const db=await new Promise<IDBDatabase>((resolve,reject)=>{const r=indexedDB.open('babyExpressionRouletteDB',3);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});await new Promise<void>((resolve,reject)=>{const tx=db.transaction('creations','readwrite');tx.objectStore('creations').put({id:'canary',title:'Canary',createdAt:1700000000000,mode:'roulette',frames,times:[0,1]});tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error)});db.close()},frames);
 await page.evaluate(async image=>{const main=await new Promise<IDBDatabase>((resolve,reject)=>{const r=indexedDB.open('babyExpressionRouletteDB',3);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});await new Promise<void>((resolve,reject)=>{const t=main.transaction(['deckSources','deckFrames','deckReplays'],'readwrite');t.objectStore('deckSources').put({id:'source-canary',fileName:'canary.webm',candidateCount:1,thumbnailData:image,storageBytes:0});t.objectStore('deckFrames').put({id:'frame-canary',sourceVideoId:'source-canary',imageData:image,timestamp:0});t.objectStore('deckReplays').put({id:'replay-canary',frames:[image]});t.oncomplete=()=>resolve();t.onerror=()=>reject(t.error)});main.close();const lab=await new Promise<IDBDatabase>((resolve,reject)=>{const r=indexedDB.open('babyExpressionRouletteLabDB',1);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});await new Promise<void>((resolve,reject)=>{const t=lab.transaction('dailyPhotos','readwrite');t.objectStore('dailyPhotos').put({id:'favorite-canary',image,createdAt:1700000000000});t.oncomplete=()=>resolve();t.onerror=()=>reject(t.error)});lab.close()},frames[0]);
 const before=await dbCounts(page);const records=await creationRecords(page);const allRecords=await userRecords(page);
 await page.locator('[data-route="receive"]').click();
 await page.locator('#shareImportFile').setInputFiles({name:'broken.mmrplay',mimeType:'application/json',buffer:Buffer.from('{broken')});await expect(page.locator('#receiveStatus')).toContainText('読み込めませんでした');
 await page.locator('#shareImportFile').setInputFiles({name:'unsupported.mmrplay',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({format:'unknown',version:1,frames:[]}))});
 await expect(page.locator('#receiveStatus')).toContainText('対応していない');await routes(page,'receive');
 await page.evaluate(()=>{const input=document.querySelector('#shareImportFile') as HTMLInputElement;const dt=new DataTransfer();dt.items.add(new File([new Uint8Array(48*1024*1024+1)],'large.mmrplay',{type:'application/json'}));input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));});
 await expect(page.locator('#receiveStatus')).toContainText('48MB以下');await routes(page,'receive');expect(await dbCounts(page)).toEqual(before);expect(await creationRecords(page)).toEqual(records);expect(await userRecords(page)).toEqual(allRecords);
});
test('S18 denied save falls back to download while preserving history',async({page})=>{
 await page.goto('/#home');const before=await dbCounts(page);await importSynthetic(page);
 await page.locator('#shareOpenFromPlay').click();await page.locator('#shareRouletteFormat').selectOption('play');await page.locator('#shareRouletteBuild').click();await expect(page.locator('#shareOutput')).toBeVisible();
 await page.evaluate(()=>{(window as any).showSaveFilePicker=async()=>({createWritable:async()=>{throw new DOMException('test quota','QuotaExceededError')}})});
 const pending=page.waitForEvent('download');await page.locator('#shareOutputSave').click();const d=await pending;expect(d.suggestedFilename()).toMatch(/\.mmrplay$/);
 await expect(page.locator('#shareStatus')).toContainText('ダウンロード');expect(await dbCounts(page)).toEqual(before);
});
test('N18 empty storage safely handles sharing without selection',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/#home');await page.locator('[data-route="share-picker"]').click();await routes(page,'share-picker');
 await expect(page.locator('#sharePickerStatus')).toContainText('ありません');
 await page.goto('/#share');await page.reload();await routes(page,'share');
 await expect(page.locator('#shareSourceState')).toContainText('ありません');await expect(page.locator('#shareRouletteBuild')).toBeDisabled();await page.locator('#shareBackBtn').click();await routes(page,'home');
 expect(errors).toEqual([]);
});
test('S05 alternating two saved roulettes exports only selected frames',async({page})=>{
 await page.goto('/#home');const frames=await page.evaluate(()=>['red','green','blue','yellow'].map(color=>{const c=document.createElement('canvas');c.width=c.height=80;const x=c.getContext('2d')!;x.fillStyle=color;x.fillRect(0,0,80,80);return c.toDataURL()}));
 await page.evaluate(async frames=>{await (window as any).__memoryHistoryMigrationPromise;const db=await new Promise<IDBDatabase>((resolve,reject)=>{const r=indexedDB.open('babyExpressionRouletteDB',3);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});await new Promise<void>((resolve,reject)=>{const tx=db.transaction('creations','readwrite');for(const [id,fs] of [['A',frames.slice(0,2)],['B',frames.slice(2,4)]] as [string,string[]][])tx.objectStore('creations').put({id,title:'Synthetic '+id,createdAt:1700000000000,mode:'roulette',frames:fs,times:[0,1]});tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error)});db.close()},frames);
 await page.locator('[data-route="share-picker"]').click();
 for(const [name,expected] of [['A',frames.slice(0,2)],['B',frames.slice(2,4)],['A',frames.slice(0,2)]] as [string,string[]][]){
  await page.locator('.shareSavedCard').filter({hasText:'Synthetic '+name}).click();await routes(page,'share');await expect(page.locator('#shareSourceState')).toContainText('Synthetic '+name);
  await page.locator('#shareRouletteFormat').selectOption('play');await page.locator('#shareRouletteBuild').click();await expect(page.locator('#shareOutput')).toBeVisible();
  const pending=page.waitForEvent('download');await page.locator('#shareOutputSave').click();const d=await pending;const data=JSON.parse(await readFile((await d.path())!,'utf8'));expect(data.frames).toEqual(expected);
  await page.locator('#shareRouletteFormat').selectOption('photo');await page.locator('#shareAllFramesDetails summary').click();await page.getByRole('button',{name:'2コマ目を停止位置にする'}).click();await expect(page.locator('#shareSelectedFrameImage')).toHaveAttribute('src',expected[1]);await page.locator('#shareRouletteBuild').click();
  const imagePending=page.waitForEvent('download');await page.locator('#shareOutputSave').click();const imageFile=await imagePending;const bytes=await readFile((await imageFile.path())!);
  const pixels=await page.evaluate(async ({orig,jpeg})=>{async function rgb(src:string){const i=new Image();i.src=src;await i.decode();const c=document.createElement('canvas');c.width=i.width;c.height=i.height;const x=c.getContext('2d')!;x.drawImage(i,0,0);return Array.from(x.getImageData(5,5,1,1).data).slice(0,3)}return [await rgb(orig),await rgb('data:image/jpeg;base64,'+jpeg)]},{orig:expected[1],jpeg:bytes.toString('base64')});pixels[1].forEach((v,i)=>expect(Math.abs(v-pixels[0][i])).toBeLessThan(15));
  await page.locator('#shareBackBtn').click();await routes(page,'share-picker');
 }
});
test('S08 close output and save again without external share',async({page})=>{
 await page.addInitScript(()=>{Object.defineProperty(navigator,'share',{value:undefined,configurable:true});Object.defineProperty(navigator,'canShare',{value:undefined,configurable:true})});
 await page.goto('/#home'); await importSynthetic(page); await page.locator('#shareOpenFromPlay').click();
 await page.locator('#shareRouletteFormat').selectOption('play'); await page.locator('#shareRouletteBuild').click();
 await expect(page.locator('#shareOutput')).toBeVisible();await page.locator('#shareOutputClose').click();
 await expect(page.locator('#shareOutput')).not.toBeVisible(); await routes(page,'share');
 await page.locator('#shareRouletteBuild').click();await expect(page.locator('#shareOutput')).toBeVisible();
 const pending=page.waitForEvent('download');await page.locator('#shareOutputSave').click();const d=await pending;
 expect(d.suggestedFilename()).toMatch(/\.mmrplay$/);expect(JSON.parse(await readFile((await d.path())!,'utf8')).frames).toHaveLength(2);
 await page.locator('#shareRouletteBuild').click();await expect(page.locator('#shareOutputSend')).toContainText('端末へ保存');
 const fallback=page.waitForEvent('download');await page.locator('#shareOutputSend').click();const saved=await fallback;expect(saved.suggestedFilename()).toMatch(/\.mmrplay$/);
});
test('S13 share and receive refresh remain safe with ephemeral data',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/#home');await importSynthetic(page);await page.locator('#shareOpenFromPlay').click();await routes(page,'share');
 await page.reload();await routes(page,'share');await expect(page.locator('#shareSourceState')).toContainText('ありません');await expect(page.locator('#shareRouletteBuild')).toBeDisabled();
 await page.goto('/#receive');await page.reload();await routes(page,'receive');await expect(page.locator('#receiveStatus')).toBeEmpty();expect(errors).toEqual([]);
});
test('S10 leaving a spinning received roulette stops timers without recording draws',async({page})=>{
 await page.addInitScript(()=>{const proto=AudioContext.prototype,original=proto.createOscillator;(window as any).__audioContexts=new Set();(window as any).__activeOscillators=new Set();proto.createOscillator=function(){(window as any).__audioContexts.add(this);const osc=original.call(this);(window as any).__activeOscillators.add(osc);osc.addEventListener('ended',()=>{(window as any).__activeOscillators.delete(osc)});return osc}});
 await page.goto('/#home');const before=await dbCounts(page);await importSynthetic(page);
 await page.locator('#stage').click();await page.locator('#stage').click();
 await page.locator('#shareOpenFromPlay').click();await routes(page,'share');
 await page.locator('#shareBackBtn').click();await routes(page,'play');
 const source=await page.locator('#playImage').getAttribute('src');await page.waitForTimeout(500);
 await expect(page.locator('#playImage')).toHaveAttribute('src',source!);
 await expect(page.locator('#rouletteBadge')).toContainText('再開');
 expect(await page.evaluate(()=>(window as any).__audioContexts.size)).toBeGreaterThan(0);await expect.poll(()=>page.evaluate(()=>Array.from((window as any).__audioContexts as Set<AudioContext>).every(ctx=>ctx.state!=='running')),{timeout:3000}).toBe(true);
 await page.locator('#backBtn').click();await routes(page,'receive');expect(await dbCounts(page)).toEqual(before);
});
test('S17 create from synthetic video, favorite and share',async({page})=>{
 test.setTimeout(90000);await page.goto('/#home');
 await page.locator('#fileInput').setInputFiles('tests/fixtures/synthetic-a.webm');await expect(page).toHaveURL(/#play$/,{timeout:60000});await page.locator('#stage').click();
 await expect(page.locator('#labSavePhoto')).toBeVisible();await page.locator('#labSavePhoto').click();
 await page.locator('#backBtn').click();await routes(page,'home');await page.locator('[data-route="history"]').click();await expect(page.locator('.saved')).toHaveCount(1);
 await page.locator('#legacyLibrarySection [data-nav-back]').click();await page.locator('[data-route="favorites"]').click();await expect(page.locator('.labPhotoCard')).toHaveCount(1);
 const image=await page.locator('.labPhotoCard img').getAttribute('src');expect(image).toMatch(/^data:image\//);
 await page.locator('.labPhotoShare').click();await routes(page,'share');await expect(page.locator('#shareFavoriteOptions')).toBeVisible();await page.locator('#shareFavoriteBuild').click();await expect(page.locator('#shareOutput')).toBeVisible();
 const pending=page.waitForEvent('download');await page.locator('#shareOutputSave').click();const d=await pending;expect(d.suggestedFilename()).toMatch(/\.jpg$/);const bytes=await readFile((await d.path())!);expect(bytes.subarray(0,3)).toEqual(Buffer.from([255,216,255]));
 const rgb=async(src:string)=>page.evaluate(async src=>{const i=new Image();i.src=src;await i.decode();const c=document.createElement('canvas');c.width=i.width;c.height=i.height;const x=c.getContext('2d')!;x.drawImage(i,0,0);return Array.from(x.getImageData(5,5,1,1).data).slice(0,3)},src);
 const original=await rgb(image!);const output=await rgb('data:image/jpeg;base64,'+bytes.toString('base64'));output.forEach((v,i)=>expect(Math.abs(v-original[i])).toBeLessThan(30));
});
test('S04 importing video B for GIF preserves prior roulette selection and creations',async({page})=>{
 test.setTimeout(120000);await page.goto('/#home');await page.locator('#fileInput').setInputFiles('tests/fixtures/synthetic-a.webm');await expect(page).toHaveURL(/#play$/,{timeout:60000});
 await expect.poll(async()=>(await creationRecords(page)).length).toBe(1);
 async function selected(){return page.evaluate(async()=>{const db=await new Promise<IDBDatabase>((resolve,reject)=>{const r=indexedDB.open('babyExpressionRouletteDB',3);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});const item=await new Promise<any>((resolve,reject)=>{const r=db.transaction('deckMeta').objectStore('deckMeta').get('selectedSourceIds');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});db.close();return item?.value})}
 const selectedBefore=await selected(),historyBefore=await creationRecords(page);expect(selectedBefore).toHaveLength(1);
 await page.locator('#backBtn').click();await routes(page,'home');await page.locator('[data-route="gif"]').click();
 await page.locator('#labGifFileInput').setInputFiles('tests/fixtures/synthetic-b.webm');await expect(page.locator('#labGifSelectedTitle')).toContainText('12コマ',{timeout:60000});await routes(page,'gif');
 expect(await selected()).toEqual(selectedBefore);expect(await creationRecords(page)).toEqual(historyBefore);
});
test('N01 past synthetic video selection keeps 8 source frames and GIF controls',async({page})=>{
 test.setTimeout(90000);await page.goto('/#home');await page.locator('[data-route="gif"]').click();
 await page.locator('#labGifFileInput').setInputFiles('tests/fixtures/synthetic-a.webm');await expect(page.locator('#labGifEditor')).toBeVisible({timeout:60000});
 await page.locator('#labGifSection [data-nav-back]').click();await page.locator('[data-route="gif"]').click();await page.locator('#labGifChoosePast').click();
 await expect(page.locator('#labGifSourceGrid .deckVideoPick')).toHaveCount(1);await page.locator('#labGifSourceGrid .deckVideoPick').click();
 await expect(page.locator('#labGifSelectedTitle')).toContainText('8コマ');await expect(page.locator('#labGifSpeed')).toBeVisible();await expect(page.locator('#labMakeGif')).toBeEnabled();await routes(page,'gif');
 const data=await page.evaluate(async()=>{const source=(window as any).__memoryShareGetGifSource();const id=(document.querySelector('#labGifSource') as HTMLSelectElement).value;const db=await new Promise<IDBDatabase>((resolve,reject)=>{const r=indexedDB.open('babyExpressionRouletteDB',3);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});const item=await new Promise<any>((resolve,reject)=>{const r=db.transaction('deckSources').objectStore('deckSources').get(id);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});db.close();return {fileName:item.fileName,count:source.frames.length}});
 expect(data).toEqual({fileName:'synthetic-a.webm',count:8});
});
test('S01 stop picker previous, next, grid and past draw select the right frame',async({page})=>{
 await page.goto('/#home');const frames=await synthetic(page);
 await page.evaluate(async frames=>{await (window as any).__memoryHistoryMigrationPromise;const db=await new Promise<IDBDatabase>((resolve,reject)=>{const r=indexedDB.open('babyExpressionRouletteDB',3);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});await new Promise<void>((resolve,reject)=>{const tx=db.transaction('creations','readwrite');tx.objectStore('creations').put({id:'a',title:'Synthetic A',createdAt:1700000000000,mode:'roulette',frames,times:[0,1],drawHistory:[{index:1,drawnAt:1700000000000}]});tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error)});db.close()},frames);
 await page.locator('[data-route="share-picker"]').click();await page.locator('.shareSavedCard').filter({hasText:'Synthetic A'}).click();await routes(page,'share');
 await expect(page.locator('#shareSelectedFrameImage')).toHaveAttribute('src',frames[1]);
 await page.locator('#shareStopPrev').click();await expect(page.locator('#shareSelectedFrameImage')).toHaveAttribute('src',frames[0]);
 await page.locator('#shareStopNext').click();await expect(page.locator('#shareSelectedFrameImage')).toHaveAttribute('src',frames[1]);
 await page.locator('#shareAllFramesDetails summary').click();await page.getByRole('button',{name:'1コマ目を停止位置にする'}).click();await expect(page.locator('#shareSelectedFrameImage')).toHaveAttribute('src',frames[0]);
 await page.locator('.shareDrawCard').click();await expect(page.locator('#shareSelectedFrameImage')).toHaveAttribute('src',frames[1]);
 await page.locator('#shareRouletteFormat').selectOption('photo');await page.locator('#shareRouletteBuild').click();const pending=page.waitForEvent('download');await page.locator('#shareOutputSave').click();const d=await pending;const bytes=await readFile((await d.path())!);const rgb=await page.evaluate(async data=>{const i=new Image();i.src='data:image/jpeg;base64,'+data;await i.decode();const c=document.createElement('canvas');c.width=i.width;c.height=i.height;const x=c.getContext('2d')!;x.drawImage(i,0,0);return Array.from(x.getImageData(5,5,1,1).data)},bytes.toString('base64'));expect(rgb[2]).toBeGreaterThan(150);expect(rgb[2]).toBeGreaterThan(rgb[0]);
 await page.locator('#shareRouletteFormat').selectOption('movie');await page.locator('#shareRouletteBuild').click();await expect(page.locator('#shareOutput')).toBeVisible({timeout:30000});const moviePending=page.waitForEvent('download');await page.locator('#shareOutputSave').click();const movie=await moviePending;const movieBytes=await readFile((await movie.path())!);const movieColor=await page.evaluate(async ({data,name})=>{const binary=Uint8Array.from(atob(data),c=>c.charCodeAt(0));const url=URL.createObjectURL(new Blob([binary],{type:name.endsWith('.mp4')?'video/mp4':'video/webm'}));try{const v=document.createElement('video');v.src=url;v.muted=true;await new Promise<void>((resolve,reject)=>{v.onloadedmetadata=()=>resolve();v.onerror=()=>reject(Error('video load'))});v.currentTime=2.7;await new Promise<void>((resolve,reject)=>{v.onseeked=()=>resolve();v.onerror=()=>reject(Error('video seek'))});const c=document.createElement('canvas');c.width=v.videoWidth;c.height=v.videoHeight;const x=c.getContext('2d')!;x.drawImage(v,0,0);return Array.from(x.getImageData(20,Math.floor(c.height/2),1,1).data)}finally{URL.revokeObjectURL(url)}},{data:movieBytes.toString('base64'),name:movie.suggestedFilename()});expect(movieColor[2]).toBeGreaterThan(120);expect(movieColor[2]).toBeGreaterThan(movieColor[0]);
});
test('S02 library searches filenames and sorts two synthetic videos',async({page})=>{
 test.setTimeout(120000);await page.goto('/#home');
 const a=await readFile('tests/fixtures/synthetic-a.webm'),b=await readFile('tests/fixtures/synthetic-b.webm');
 await page.locator('#fileInput').setInputFiles({name:'synthetic-a.webm',mimeType:'video/webm',buffer:a,lastModified:1577836800000});await expect(page).toHaveURL(/#play$/,{timeout:60000});await page.locator('#backBtn').click();
 await page.locator('#fileInput').setInputFiles({name:'synthetic-b.webm',mimeType:'video/webm',buffer:b,lastModified:1640995200000});await expect(page).toHaveURL(/#play$/,{timeout:60000});await page.locator('#backBtn').click();
 await page.locator('#homePastVideoBtn').click();await routes(page,'library');await expect(page.locator('#deckPicker .deckVideoPick')).toHaveCount(2);
 const newest=await page.locator('#deckPicker .deckVideoTile').evaluateAll(xs=>xs.map(x=>(x as HTMLElement).dataset.sourceId));
 await page.locator('#deckSort').selectOption('oldest');const oldest=await page.locator('#deckPicker .deckVideoTile').evaluateAll(xs=>xs.map(x=>(x as HTMLElement).dataset.sourceId));expect(oldest).toEqual([...newest].reverse());
 await page.locator('#deckSearch').fill('synthetic-a');await expect(page.locator('#deckPicker .deckVideoPick')).toHaveCount(1);await page.locator('#deckPicker .deckVideoPick').click();await expect(page.locator('#deckDrawBtn')).toBeEnabled();
});
test('S08 cancelling the save picker keeps output available',async({page})=>{
 await page.goto('/#home');await importSynthetic(page);await page.locator('#shareOpenFromPlay').click();await page.locator('#shareRouletteFormat').selectOption('play');await page.locator('#shareRouletteBuild').click();await expect(page.locator('#shareOutput')).toBeVisible();
 await page.evaluate(()=>{(window as any).showSaveFilePicker=async()=>{throw new DOMException('cancelled','AbortError')}});let downloads=0;page.on('download',()=>downloads++);
 await page.locator('#shareOutputSave').click();await expect(page.locator('#shareOutput')).toBeVisible();expect(downloads).toBe(0);await page.locator('#shareOutputClose').click();await expect(page.locator('#shareOutput')).not.toBeVisible();
});
test('N11 normal roulette output followed by favorite photo does not mix formats or sources',async({page})=>{
 await page.goto('/#home');const frames=await synthetic(page);
 await page.evaluate(async image=>{const db=await new Promise<IDBDatabase>((resolve,reject)=>{const r=indexedDB.open('babyExpressionRouletteLabDB',1);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});await new Promise<void>((resolve,reject)=>{const t=db.transaction('dailyPhotos','readwrite');t.objectStore('dailyPhotos').put({id:'fav',image,createdAt:1700000000000,fortune:'吉'});t.oncomplete=()=>resolve();t.onerror=()=>reject(t.error)});db.close()},frames[1]);await page.reload();
 await importSynthetic(page);await page.locator('#shareOpenFromPlay').click();await page.locator('#shareRouletteFormat').selectOption('play');await page.locator('#shareRouletteBuild').click();await expect(page.locator('#shareOutput')).toBeVisible();await page.locator('#shareOutputClose').click();await page.locator('#shareBackBtn').click();await page.locator('#backBtn').click();await routes(page,'receive');await page.locator('#receiveSection [data-nav-back]').click();
 await page.locator('[data-route="favorites"]').click();await page.locator('.labPhotoShare').click();await routes(page,'share');await expect(page.locator('#shareRouletteOptions')).not.toBeVisible();await expect(page.locator('#shareOutput')).not.toBeVisible();await expect(page.locator('#shareFavoriteOptions')).toBeVisible();
 await page.locator('#shareFavoriteBuild').click();const pending=page.waitForEvent('download');await page.locator('#shareOutputSave').click();const d=await pending;expect(d.suggestedFilename()).toMatch(/\.jpg$/);const bytes=await readFile((await d.path())!);const color=await page.evaluate(async bytes=>{const img=new Image();img.src='data:image/jpeg;base64,'+bytes;await img.decode();const c=document.createElement('canvas');c.width=img.width;c.height=img.height;const x=c.getContext('2d')!;x.drawImage(img,0,0);return Array.from(x.getImageData(5,5,1,1).data)},bytes.toString('base64'));expect(color[2]).toBeGreaterThan(150);expect(color[2]).toBeGreaterThan(color[0]);
});
test('S18 quota failure during video import reports error and preserves existing history',async({page})=>{
 test.setTimeout(90000);await page.goto('/#home');const frames=await synthetic(page);
 await page.evaluate(async frames=>{await (window as any).__memoryHistoryMigrationPromise;const db=await new Promise<IDBDatabase>((resolve,reject)=>{const r=indexedDB.open('babyExpressionRouletteDB',3);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});await new Promise<void>((resolve,reject)=>{const tx=db.transaction('creations','readwrite');tx.objectStore('creations').put({id:'canary',title:'Canary',createdAt:1700000000000,mode:'roulette',frames,times:[0,1]});tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error)});db.close()},frames);
 const before=await creationRecords(page);await page.locator('[data-route="gif"]').click();
 await page.evaluate(()=>{const original=IDBDatabase.prototype.transaction;IDBDatabase.prototype.transaction=function(stores:any,mode?:any,options?:any){if(mode==='readwrite'&&(Array.isArray(stores)?stores.includes('deckSources'):stores==='deckSources'))throw new DOMException('synthetic quota','QuotaExceededError');return original.call(this,stores,mode,options)}});
 await page.locator('#labGifFileInput').setInputFiles('tests/fixtures/synthetic-a.webm');await expect(page.locator('#labGifStatus')).toContainText(/取り込め|形式を確認/,{timeout:60000});await routes(page,'gif');expect(await creationRecords(page)).toEqual(before);await expect(page.locator('#labGifStatus')).toContainText(/容量|空き/);
});
test('N18 empty database safely initializes every route',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 const selectors:[string,string][]=[['home','#homeNewVideoBtn'],['create','#createPickBtn'],['library','#deckDrawBtn'],['favorites','#labCollectionSection'],['history','#legacyLibrarySection'],['settings','#frameCount'],['gif','#labGifAddVideo'],['share-picker','#sharePickerStatus'],['share','#shareRouletteBuild'],['receive','#shareImportFile']];
 for(const [route,selector] of selectors){await page.goto('/#'+route);await page.reload();await routes(page,route);await expect(page.locator(selector)).toBeAttached()}
 await page.goto('/#create');await page.reload();await page.locator('#createSection [data-nav-back]').click();await routes(page,'home');
 await page.goto('/#play');await page.reload();await expect(page).toHaveURL(/#home$/);await routes(page,'home');expect(errors).toEqual([]);
});
test('N15 browser history preserves received roulette context',async({page})=>{
 await page.goto('/#home');const frames=await importSynthetic(page);await page.locator('#stage').click();const stopped=await page.locator('#playImage').getAttribute('src');expect(frames).toContain(stopped);
 await page.locator('#shareOpenFromPlay').click();await routes(page,'share');await page.goBack();await routes(page,'play');await expect(page.locator('#playImage')).toHaveAttribute('src',stopped!);
 await page.goBack();await routes(page,'receive');await page.goForward();await routes(page,'play');await expect(page.locator('#playImage')).toHaveAttribute('src',stopped!);
 await page.goForward();await routes(page,'share');await expect(page.locator('#shareSelectedFrameImage')).toHaveAttribute('src',stopped!);await page.locator('#shareBackBtn').click();await routes(page,'play');await page.locator('#backBtn').click();await routes(page,'receive');
});
test('S13 GIF refresh discards editor state and saved source can be reopened',async({page})=>{
 test.setTimeout(90000);await page.goto('/#home');await page.locator('[data-route="gif"]').click();await page.locator('#labGifFileInput').setInputFiles('tests/fixtures/synthetic-a.webm');await expect(page.locator('#labGifEditor')).toBeVisible({timeout:60000});await page.locator('#labGifSpeed').selectOption('0.5');await page.locator('#sharePrivacyGif').click();await page.locator('#sharePrivacyCanvas').click({position:{x:20,y:20}});
 await page.reload();await routes(page,'gif');await expect(page.locator('#sharePrivacyEditor')).not.toBeVisible();await expect(page.locator('#labGifEditor')).not.toBeVisible();await page.locator('#labGifChoosePast').click();await page.locator('#labGifSourceGrid .deckVideoPick').first().click();await expect(page.locator('#labGifSelectedTitle')).toContainText('8コマ');await expect(page.locator('#labMakeGif')).toBeEnabled();await expect(page.locator('#shareOutput')).not.toBeVisible();
});
test('N12 masked playable export has no original frames and off restores originals',async({page})=>{
 await page.goto('/#home');const originals=await importSynthetic(page);await page.locator('#shareOpenFromPlay').click();await page.locator('#shareRouletteFormat').selectOption('play');await page.locator('#shareRouletteMask').check();await page.locator('#shareRouletteBuild').click();await expect(page.locator('#sharePrivacyEditor')).toBeVisible();
 await page.locator('#sharePrivacyCanvas').click({position:{x:20,y:20}});page.once('dialog',dialog=>dialog.accept());await page.locator('#shareMaskCopy').click();await page.locator('#sharePrivacyExportSelected').click();await expect(page.locator('#shareOutput')).toBeVisible();
 async function downloaded(){const p=page.waitForEvent('download');await page.locator('#shareOutputSave').click();const d=await p;expect(d.suggestedFilename()).toMatch(/\.mmrplay$/);return JSON.parse(await readFile((await d.path())!,'utf8'))}
 const masked=await downloaded();expect(masked.frames).toHaveLength(2);for(let i=0;i<2;i++){expect(masked.frames[i]).not.toBe(originals[i]);expect(JSON.stringify(masked)).not.toContain(originals[i]);const diff=await page.evaluate(async ({a,b})=>{async function p(src:string){const i=new Image();i.src=src;await i.decode();const c=document.createElement('canvas');c.width=i.width;c.height=i.height;const x=c.getContext('2d')!;x.drawImage(i,0,0);return Array.from(x.getImageData(20,20,1,1).data)}const x=await p(a),y=await p(b);return x.slice(0,3).reduce((sum,v,i)=>sum+Math.abs(v-y[i]),0)},{a:originals[i],b:masked.frames[i]});expect(diff).toBeGreaterThan(30)}
 await page.locator('#shareRouletteMask').uncheck();await page.locator('#shareRouletteBuild').click();await expect(page.locator('#shareOutput')).toBeVisible();const plain=await downloaded();expect(plain.frames).toEqual(originals);
});
