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
