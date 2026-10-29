import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { parseGIF, decompressFrames } from 'gifuct-js';

test('N01–N04 legacy synthetic source: stamp editor stays in GIF and produces GIF @smoke', async ({page}) => {
 await page.addInitScript(() => { Object.defineProperty(window,'showSaveFilePicker',{value:undefined}); });
 await page.goto('/#home');
 await page.evaluate(async()=>{
  await Promise.all([(window as any).__memoryHistoryMigrationPromise,(window as any).__memorySettingsReady]);
  const frames=Array.from({length:8},(_,i)=>{const c=document.createElement('canvas');c.width=120;c.height=80;const x=c.getContext('2d')!;x.fillStyle=`hsl(${i*40},90%,50%)`;x.fillRect(0,0,120,80);x.fillStyle='white';x.font='40px sans-serif';x.fillText(String(i+1),45,55);return c.toDataURL('image/png');});
  const db=await new Promise<IDBDatabase>((resolve,reject)=>{const r=indexedDB.open('babyExpressionRouletteDB',3);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});
  await new Promise<void>((resolve,reject)=>{const tx=db.transaction('creations','readwrite');tx.objectStore('creations').put({id:'synthetic-a',title:'Synthetic A',createdAt:1700000000000,updatedAt:1700000000000,mode:'roulette',frames,times:frames.map((_,i)=>i)});tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});db.close();
 });
 await page.locator('[data-route="gif"]').click();
 await page.locator('#labGifChoosePast').click();
 await page.getByRole('button',{name:/Synthetic A.*8コマ/}).click();
 await expect(page.locator('#labGifSelectedTitle')).toContainText('Synthetic A');
 await expect(page.locator('#labMakeGif')).toBeEnabled();
 for (const seconds of ['0.05','0.1','0.2','0.5','1']) {
  await page.locator('#labGifSpeed').selectOption(seconds);
  await page.locator('#labMakeGif').click();
  await expect(page.locator('#labGifResult')).toBeVisible();
  const intervals=await page.locator('#labGifPreview').evaluate((img:HTMLImageElement)=>new Promise<number[]>((resolve,reject)=>{const times:number[]=[];const timer=setTimeout(()=>{observer.disconnect();reject(new Error('preview did not advance'))},5000);const observer=new MutationObserver(()=>{times.push(performance.now());if(times.length===3){clearTimeout(timer);observer.disconnect();resolve([times[1]-times[0],times[2]-times[1]])}});observer.observe(img,{attributes:true,attributeFilter:['src']})}));
  for(const interval of intervals)expect(Math.abs(interval-Number(seconds)*1000)).toBeLessThan(Math.max(100,Number(seconds)*300));
  const file=await page.locator('#labGifDownload').getAttribute('href');
  const encoded=await page.evaluate(async url=>{const b=await (await fetch(url!)).arrayBuffer();return Array.from(new Uint8Array(b));},file);
  const decoded=decompressFrames(parseGIF(Uint8Array.from(encoded)),true);
  expect(decoded).toHaveLength(8);
  const expectedColors=await page.evaluate(()=>Array.from({length:8},(_,i)=>{const c=document.createElement('canvas');c.width=c.height=1;const x=c.getContext('2d')!;x.fillStyle=`hsl(${i*40},90%,50%)`;x.fillRect(0,0,1,1);return Array.from(x.getImageData(0,0,1,1).data).slice(0,3)}));
  decoded.forEach((frame,i)=>{const offset=(5*frame.dims.width+5)*4;for(let channel=0;channel<3;channel++)expect(Math.abs(frame.patch[offset+channel]-expectedColors[i][channel])).toBeLessThan(60)});
  expect(decoded.map(f=>f.delay)).toEqual(Array(8).fill(Number(seconds)*1000));
 }
 await page.locator('#labGifSpeed').selectOption('0.2');
 await page.locator('#sharePrivacyGif').click();
 await expect(page).toHaveURL(/#gif$/);
 await expect(page.locator('#labGifEditor #sharePrivacyEditor')).toBeVisible();
 await expect(page.locator('#shareRouletteOptions')).not.toBeVisible();
 await expect(page.locator('#shareMaskIndex')).toHaveText('1 / 8コマ');
 await page.locator('#sharePrivacyCanvas').click({position:{x:20,y:20}});
 await expect(page.locator('#shareMaskCount')).toContainText('1個');
 page.once('dialog', dialog=>dialog.accept());await page.locator('#shareMaskCopy').click();
 await page.locator('#shareMaskNext').click();await expect(page.locator('#shareMaskCount')).toContainText('1個');
 await page.locator('#shareMaskPrev').click();
 await page.locator('#sharePrivacyExportSelected').click();
 await expect(page.locator('#shareOutput')).toBeVisible();
 const downloadPromise=page.waitForEvent('download'); await page.locator('#shareOutputSave').click();
 const download=await downloadPromise;expect(download.suggestedFilename()).toMatch(/\.gif$/);
 const bytes=await readFile((await download.path())!);expect(bytes.subarray(0,6).toString()).toBe('GIF89a');expect(bytes.length).toBeGreaterThan(100);
 const decoded=decompressFrames(parseGIF(bytes),true);
 expect(decoded).toHaveLength(8);
 expect(decoded.map(f=>f.delay)).toEqual(Array(8).fill(200));
 // First image is red; the centered stamp must change the pixels there.
 const frame=decoded[0]; const pixel=(x:number,y:number)=>Array.from(frame.patch.slice((y*frame.dims.width+x)*4,(y*frame.dims.width+x)*4+3));
 expect(pixel(5,5)[0]).toBeGreaterThan(180); expect(pixel(20,20)).not.toEqual(pixel(5,5));
 for(const f of decoded){const color=(x:number,y:number)=>Array.from(f.patch.slice((y*f.dims.width+x)*4,(y*f.dims.width+x)*4+3));expect(color(20,20)).not.toEqual(color(5,5));}
 await page.locator('#sharePrivacyClose').click();
 await expect(page.locator('#sharePrivacyEditor')).not.toBeVisible();
 await expect(page.locator('#labGifSelectedTitle')).toContainText('Synthetic A');
 await expect(page).toHaveURL(/#gif$/);
 // N13: transition from GIF output to a different received roulette.
 await page.locator('#labGifSection [data-nav-back]').click();
 await page.locator('[data-route="receive"]').click();
 const frames=await page.evaluate(()=>['red','blue'].map(color=>{const c=document.createElement('canvas');c.width=c.height=80;const x=c.getContext('2d')!;x.fillStyle=color;x.fillRect(0,0,80,80);return c.toDataURL()}));
 const payload={format:'memory-moments-playable',version:1,title:'Received B',mode:'roulette',frames,times:[0,1]};
 await page.locator('#shareImportFile').setInputFiles({name:'b.mmrplay',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(payload))});
 await expect(page).toHaveURL(/#play$/);await page.locator('#stage').click();
 await page.locator('#shareOpenFromPlay').click(); await expect(page).toHaveURL(/#share$/);
 await expect(page.locator('#shareSourceState')).toContainText('Received B');
 await expect(page.locator('#shareRouletteOptions')).toBeVisible();
 await expect(page.locator('#sharePrivacyEditor')).not.toBeVisible();
 await expect(page.locator('#shareOutput')).not.toBeVisible();
 const current=await page.locator('#shareSelectedFrameImage').getAttribute('src');expect(frames).toContain(current);
});
test('N05 changing synthetic source clears the previous GIF and stamp editor',async({page})=>{
 await page.goto('/#home');
 await page.evaluate(async()=>{
  await (window as any).__memoryHistoryMigrationPromise;
  const db=await new Promise<IDBDatabase>((resolve,reject)=>{const r=indexedDB.open('babyExpressionRouletteDB',3);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});
  const tx=db.transaction('creations','readwrite');
  for(const [name,color,count] of [['A','#e02020',8],['B','#2040e0',12]] as const){
   const frames=Array.from({length:count},(_,i)=>{const c=document.createElement('canvas');c.width=120;c.height=80;const ctx=c.getContext('2d')!;ctx.fillStyle=color;ctx.fillRect(0,0,120,80);ctx.fillStyle='white';ctx.font='30px sans-serif';ctx.fillText(String(i+1),40,50);return c.toDataURL('image/png')});
   tx.objectStore('creations').put({id:'synthetic-'+name,title:'Synthetic '+name,createdAt:1700000000000,mode:'roulette',frames,times:frames.map((_,i)=>i)});
  }
  await new Promise<void>((resolve,reject)=>{tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error)});db.close();
 });
 await page.locator('[data-route="gif"]').click(); await page.locator('#labGifChoosePast').click();
 await page.getByRole('button',{name:/Synthetic A.*8コマ/}).click(); await expect(page.locator('#labMakeGif')).toBeEnabled();
 await page.locator('#labMakeGif').click(); await expect(page.locator('#labGifResult')).toBeVisible();
 await page.locator('#sharePrivacyGif').click(); await page.locator('#sharePrivacyExportSelected').click(); await expect(page.locator('#sharePrivacyStatus')).toContainText('まずスタンプ'); await expect(page.locator('#shareOutput')).not.toBeVisible(); await page.locator('#sharePrivacyCanvas').click({position:{x:20,y:20}}); await expect(page.locator('#shareMaskCount')).toContainText('1個');
 await page.locator('#labGifChangeVideo').click();
 await page.getByRole('button',{name:/Synthetic B.*12コマ/}).click();
 await expect(page.locator('#labGifSelectedTitle')).toContainText('Synthetic B');
 await expect(page.locator('#labGifResult')).not.toBeVisible(); await expect(page.locator('#sharePrivacyEditor')).not.toBeVisible();
 await page.locator('#sharePrivacyGif').click(); await expect(page.locator('#shareMaskCount')).toContainText('0個');
 await expect(page.locator('#shareMaskIndex')).toHaveText('1 / 12コマ'); await expect(page).toHaveURL(/#gif$/);
});
test('S11 leaving while GIF encoding does not reopen results',async({page})=>{
 await page.goto('/#home');
 await page.evaluate(async()=>{await (window as any).__memoryHistoryMigrationPromise;const db=await new Promise<IDBDatabase>((resolve,reject)=>{const r=indexedDB.open('babyExpressionRouletteDB',3);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});const frames=Array.from({length:40},(_,i)=>{const c=document.createElement('canvas');c.width=c.height=120;const x=c.getContext('2d')!;x.fillStyle=`hsl(${i*9},90%,50%)`;x.fillRect(0,0,120,120);return c.toDataURL()});await new Promise<void>((resolve,reject)=>{const tx=db.transaction('creations','readwrite');tx.objectStore('creations').put({id:'long',title:'Synthetic long',createdAt:1700000000000,mode:'roulette',frames,times:frames.map((_,i)=>i)});tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error)});db.close()});
 await page.locator('[data-route="gif"]').click();await page.locator('#labGifChoosePast').click();await page.getByRole('button',{name:/Synthetic long.*40コマ/}).click();await expect(page.locator('#labMakeGif')).toBeEnabled();
 await page.locator('#labMakeGif').click(); await expect(page.locator('#labGifStatus')).toContainText('GIFを作って'); await page.locator('#labGifSection [data-nav-back]').click();await expect(page).toHaveURL(/#home$/);
 await page.locator('[data-route="gif"]').click();await expect(page).toHaveURL(/#gif$/);await expect(page.locator('#labGifResult')).not.toBeVisible();await expect(page.locator('#labGifEditor')).not.toBeVisible(); await page.waitForTimeout(2000);await expect(page.locator('#labGifResult')).not.toBeVisible();
});
