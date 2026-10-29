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
 const before=await dbCounts(page);
 const frames=await importSynthetic(page);
 await page.locator('#stage').click();
 const stopped=await page.locator('#playImage').getAttribute('src'); expect(frames).toContain(stopped);
 await page.locator('#shareOpenFromPlay').click(); await routes(page,'share');
 await expect(page.locator('#shareSelectedFrameImage')).toHaveAttribute('src',stopped!);
 await page.locator('#shareBackBtn').click(); await routes(page,'play');
 await expect(page.locator('#playImage')).toHaveAttribute('src',stopped!);
 await page.locator('#backBtn').click(); await routes(page,'receive');
 expect(await dbCounts(page)).toEqual(before);
});
test('N14 playable file contains selected synthetic frames @smoke',async({page})=>{
 await page.goto('/#home'); const frames=await importSynthetic(page);
 await page.locator('#shareOpenFromPlay').click(); await routes(page,'share');
 await page.locator('#shareRouletteFormat').selectOption('play');
 await page.locator('#shareRouletteBuild').click();
 await expect(page.locator('#shareOutput')).toBeVisible();
 const downloadPromise=page.waitForEvent('download'); await page.locator('#shareOutputSave').click();
 const download=await downloadPromise; expect(download.suggestedFilename()).toMatch(/\.mmrplay$/);
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
 await page.goto('/#home'); await importSynthetic(page);
 await page.locator('#shareOpenFromPlay').click(); await routes(page,'share');
 await page.locator('#shareAllFramesDetails summary').click();
 await page.getByRole('button',{name:'2コマ目を停止位置にする'}).click();
 await expect(page.locator('#shareSelectedFrameLabel')).toContainText('2 / 2');
 await page.locator('#shareRouletteFormat').selectOption('photo');
 await expect(page.locator('#shareSelectedFrameLabel')).toContainText('2 / 2');
 async function save() {
  const pending=page.waitForEvent('download'); await page.locator('#shareOutputSave').click();
  const d=await pending; expect(d.suggestedFilename()).toMatch(/\.jpg$/); return readFile((await d.path())!);
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
 await page.locator('#fileInput').setInputFiles('tests/fixtures/synthetic-a.webm');
 await expect(page).toHaveURL(/#play$/, {timeout:90000}); await routes(page,'play');
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
 const pending=page.waitForEvent('download'); await page.locator('#shareOutputSave').click(); const d=await pending;
 const ext=d.suggestedFilename().endsWith('.mp4')?'mp4':'webm';expect(d.suggestedFilename()).toMatch(/\.(mp4|webm)$/);
 const bytes=await readFile((await d.path())!);expect(bytes.length).toBeGreaterThan(1000);
 if(ext==='webm')expect(bytes.subarray(0,4)).toEqual(Buffer.from([0x1a,0x45,0xdf,0xa3]));
 else expect(bytes.subarray(4,8).toString()).toBe('ftyp');
 const rgb=await page.evaluate(async ({data,ext})=>{
  const binary=Uint8Array.from(atob(data),c=>c.charCodeAt(0));const url=URL.createObjectURL(new Blob([binary],{type:ext==='mp4'?'video/mp4':'video/webm'}));
  try { const v=document.createElement('video');v.src=url;v.muted=true;await new Promise<void>((resolve,reject)=>{v.onloadedmetadata=()=>resolve();v.onerror=()=>reject(new Error('video metadata failed'))});
   v.currentTime=2.7;await new Promise<void>((resolve,reject)=>{v.onseeked=()=>resolve();v.onerror=()=>reject(new Error('video seek failed'))});
   const c=document.createElement('canvas');c.width=v.videoWidth;c.height=v.videoHeight;const ctx=c.getContext('2d')!;ctx.drawImage(v,0,0);return Array.from(ctx.getImageData(20,Math.floor(c.height/2),1,1).data);
  } finally {URL.revokeObjectURL(url)}
 },{data:bytes.toString('base64'),ext});
 expect(rgb[2]).toBeGreaterThan(120);expect(rgb[2]).toBeGreaterThan(rgb[0]);
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
 const before=await dbCounts(page);const records=await creationRecords(page);
 await page.locator('[data-route="receive"]').click();
 await page.locator('#shareImportFile').setInputFiles({name:'unsupported.mmrplay',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({format:'unknown',version:1,frames:[]}))});
 await expect(page.locator('#receiveStatus')).toContainText('対応していない');await routes(page,'receive');
 await page.evaluate(()=>{const input=document.querySelector('#shareImportFile') as HTMLInputElement;const dt=new DataTransfer();dt.items.add(new File([new Uint8Array(48*1024*1024+1)],'large.mmrplay',{type:'application/json'}));input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));});
 await expect(page.locator('#receiveStatus')).toContainText('48MB以下');await routes(page,'receive');expect(await dbCounts(page)).toEqual(before);expect(await creationRecords(page)).toEqual(records);
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
 await expect(page.locator('#shareSourceState')).toContainText('ありません');await expect(page.locator('#shareRouletteBuild')).toBeDisabled();
 expect(errors).toEqual([]);
});
test('S05 alternating two saved roulettes exports only selected frames',async({page})=>{
 await page.goto('/#home');const frames=await synthetic(page);
 await page.evaluate(async frames=>{await (window as any).__memoryHistoryMigrationPromise;const db=await new Promise<IDBDatabase>((resolve,reject)=>{const r=indexedDB.open('babyExpressionRouletteDB',3);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});await new Promise<void>((resolve,reject)=>{const tx=db.transaction('creations','readwrite');for(const [id,fs] of [['A',[frames[0],frames[0]]],['B',[frames[1],frames[1]]]] as [string,string[]][])tx.objectStore('creations').put({id,title:'Synthetic '+id,createdAt:1700000000000,mode:'roulette',frames:fs,times:[0,1]});tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error)});db.close()},frames);
 await page.locator('[data-route="share-picker"]').click();
 for(const [name,expected] of [['A',frames[0]],['B',frames[1]],['A',frames[0]]] as [string,string][]){
  await page.locator('.shareSavedCard').filter({hasText:'Synthetic '+name}).click();await routes(page,'share');
  await expect(page.locator('#shareSourceState')).toContainText('Synthetic '+name);
  await page.locator('#shareRouletteFormat').selectOption('play');await page.locator('#shareRouletteBuild').click();await expect(page.locator('#shareOutput')).toBeVisible();
  const pending=page.waitForEvent('download');await page.locator('#shareOutputSave').click();const d=await pending;
  const data=JSON.parse(await readFile((await d.path())!,'utf8'));expect(data.frames).toEqual([expected,expected]);
  await page.locator('#shareBackBtn').click();await routes(page,'share-picker');
 }
});
test('S08 close output and save again without external share',async({page})=>{
 await page.goto('/#home'); await importSynthetic(page); await page.locator('#shareOpenFromPlay').click();
 await page.locator('#shareRouletteFormat').selectOption('play'); await page.locator('#shareRouletteBuild').click();
 await expect(page.locator('#shareOutput')).toBeVisible();await page.locator('#shareOutputClose').click();
 await expect(page.locator('#shareOutput')).not.toBeVisible(); await routes(page,'share');
 await page.locator('#shareRouletteBuild').click();await expect(page.locator('#shareOutput')).toBeVisible();
 const pending=page.waitForEvent('download');await page.locator('#shareOutputSave').click();const d=await pending;
 expect(d.suggestedFilename()).toMatch(/\.mmrplay$/);expect(JSON.parse(await readFile((await d.path())!,'utf8')).frames).toHaveLength(2);
});
test('S13 share and receive refresh remain safe with ephemeral data',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/#home');await importSynthetic(page);await page.locator('#shareOpenFromPlay').click();await routes(page,'share');
 await page.reload();await routes(page,'share');await expect(page.locator('#shareSourceState')).toContainText('ありません');await expect(page.locator('#shareRouletteBuild')).toBeDisabled();
 await page.goto('/#receive');await page.reload();await routes(page,'receive');await expect(page.locator('#receiveStatus')).toBeEmpty();expect(errors).toEqual([]);
});
test('S10 leaving a spinning received roulette stops timers without recording draws',async({page})=>{
 await page.goto('/#home');const before=await dbCounts(page);await importSynthetic(page);
 await page.locator('#shareOpenFromPlay').click();await routes(page,'share');
 await page.locator('#shareBackBtn').click();await routes(page,'play');
 const source=await page.locator('#playImage').getAttribute('src');await page.waitForTimeout(500);
 await expect(page.locator('#playImage')).toHaveAttribute('src',source!);
 await expect(page.locator('#rouletteBadge')).toContainText('再開');
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
