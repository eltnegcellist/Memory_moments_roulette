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
 await page.locator('#shareMaskUndo').click();await expect(page.locator('#shareMaskCount')).toContainText('0個');
 await page.locator('#shareMaskSize').fill('50');await page.locator('#sharePrivacyCanvas').click({position:{x:20,y:20}});await expect(page.locator('#shareMaskCount')).toContainText('1個');
 page.once('dialog', dialog=>dialog.accept());await page.locator('#shareMaskCopy').click();
 await page.locator('#shareMaskNext').click();await expect(page.locator('#shareMaskCount')).toContainText('1個');
 await page.locator('#shareMaskPrev').click();
 await page.locator('#sharePrivacyExportSelected').click();
 await expect(page.locator('#shareOutput')).toBeVisible();
 await page.evaluate(()=>{const save=(window as any).__memorySaveMediaFile;(window as any).__memorySaveMediaFile=(blob:Blob,name:string)=>{(window as any).__observedMime=blob.type;return save(blob,name)}});
 const downloadPromise=page.waitForEvent('download'); await page.locator('#shareOutputSave').click();
 expect(await page.evaluate(()=>(window as any).__observedMime)).toBe('image/gif');
 const download=await downloadPromise;expect(download.suggestedFilename()).toMatch(/\.gif$/);
 const bytes=await readFile((await download.path())!);expect(bytes.subarray(0,6).toString()).toBe('GIF89a');expect(bytes.length).toBeGreaterThan(100);
 const decoded=decompressFrames(parseGIF(bytes),true);
 expect(decoded).toHaveLength(8);
 expect(decoded.map(f=>f.delay)).toEqual(Array(8).fill(200));
 // First image is red; the centered stamp must change the pixels there.
 const frame=decoded[0]; const pixel=(x:number,y:number)=>Array.from(frame.patch.slice((y*frame.dims.width+x)*4,(y*frame.dims.width+x)*4+3));
 expect(pixel(100,10)[0]).toBeGreaterThan(180); expect(pixel(20,20)).not.toEqual(pixel(100,10));
 const expectedColors=await page.evaluate(()=>Array.from({length:8},(_,i)=>{const c=document.createElement('canvas');c.width=c.height=1;const x=c.getContext('2d')!;x.fillStyle=`hsl(${i*40},90%,50%)`;x.fillRect(0,0,1,1);return Array.from(x.getImageData(0,0,1,1).data).slice(0,3)}));
 decoded.forEach((f,i)=>{const color=(x:number,y:number)=>Array.from(f.patch.slice((y*f.dims.width+x)*4,(y*f.dims.width+x)*4+3));expect(color(20,20)).not.toEqual(color(100,10));expect(color(35,20)).not.toEqual(color(100,10));color(100,10).forEach((v,c)=>expect(Math.abs(v-expectedColors[i][c])).toBeLessThan(60))});
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
 await page.locator('#sharePrivacyCanvas').click({position:{x:20,y:20}});await page.locator('#labGifSpeed').selectOption('0.5');await expect(page.locator('#sharePrivacyEditor')).not.toBeVisible();await expect(page.locator('#labGifResult')).not.toBeVisible();
 await page.locator('#labGifSection [data-nav-back]').click();await page.locator('[data-route="gif"]').click();await expect(page.locator('#labGifEditor')).not.toBeVisible();await expect(page.locator('#sharePrivacyEditor')).not.toBeVisible();await expect(page.locator('#labGifResult')).not.toBeVisible();
});
test('S11 leaving while GIF encoding does not reopen results',async({page})=>{
 await page.goto('/#home');
 await page.evaluate(async()=>{await (window as any).__memoryHistoryMigrationPromise;const db=await new Promise<IDBDatabase>((resolve,reject)=>{const r=indexedDB.open('babyExpressionRouletteDB',3);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});const frames=Array.from({length:40},(_,i)=>{const c=document.createElement('canvas');c.width=c.height=120;const x=c.getContext('2d')!;x.fillStyle=`hsl(${i*9},90%,50%)`;x.fillRect(0,0,120,120);return c.toDataURL()});await new Promise<void>((resolve,reject)=>{const tx=db.transaction('creations','readwrite');tx.objectStore('creations').put({id:'long',title:'Synthetic long',createdAt:1700000000000,mode:'roulette',frames,times:frames.map((_,i)=>i)});tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error)});db.close()});
 await page.locator('[data-route="gif"]').click();await page.locator('#labGifChoosePast').click();await page.getByRole('button',{name:/Synthetic long.*40コマ/}).click();await expect(page.locator('#labMakeGif')).toBeEnabled();
 await page.locator('#labMakeGif').click(); await expect(page.locator('#labGifStatus')).toContainText('GIFを作って'); await page.locator('#labGifSection [data-nav-back]').click();await expect(page).toHaveURL(/#home$/);
 await page.locator('[data-route="gif"]').click();await expect(page).toHaveURL(/#gif$/);await expect(page.locator('#labGifResult')).not.toBeVisible();await expect(page.locator('#labGifEditor')).not.toBeVisible(); await page.waitForTimeout(2000);await expect(page.locator('#labGifResult')).not.toBeVisible();
});
test('S02/S19 two real synthetic videos can be searched by filename and kept separate @smoke',async({page,browserName})=>{
 test.skip(browserName==='webkit'&&!process.env.TEST_WEBM_WEBKIT,'WebM fixture import is not yet validated in CI WebKit; search is tested separately with seeded sources');
 test.setTimeout(120000);await page.goto('/#home');await page.locator('[data-route="gif"]').click();
 await page.locator('#labGifFileInput').setInputFiles('tests/fixtures/synthetic-a.webm');await expect(page.locator('#labGifEditor')).toBeVisible({timeout:60000});
 await page.locator('#labGifFileInput').setInputFiles('tests/fixtures/synthetic-b.webm');await expect(page.locator('#labGifSelectedTitle')).toContainText('12コマ',{timeout:60000});
 const names=await page.evaluate(async()=>{const db=await new Promise<IDBDatabase>((resolve,reject)=>{const r=indexedDB.open('babyExpressionRouletteDB',3);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});const records=await new Promise<any[]>((resolve,reject)=>{const r=db.transaction('deckSources').objectStore('deckSources').getAll();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});db.close();return records.map(x=>x.fileName)});expect(names).toEqual(expect.arrayContaining(['synthetic-a.webm','synthetic-b.webm']));
 await page.locator('#labGifChangeVideo').click();await page.locator('#labGifSearch').fill('synthetic-a');
 await expect(page.locator('#labGifSourceGrid .deckVideoPick')).toHaveCount(1);
 await page.locator('#labGifSourceGrid .deckVideoPick').click();await expect(page.locator('#labGifSelectedTitle')).toContainText('8コマ');
});
test('S19 two imported synthetic videos remain separate in generated GIF',async({page})=>{
 test.setTimeout(120000);await page.goto('/#home');await page.locator('[data-route="gif"]').click();
 await page.locator('#labGifFileInput').setInputFiles('tests/fixtures/synthetic-a.webm');await expect(page.locator('#labGifEditor')).toBeVisible({timeout:60000});
 await page.locator('#labGifFileInput').setInputFiles('tests/fixtures/synthetic-b.webm');await expect(page.locator('#labGifSelectedTitle')).toContainText('12コマ',{timeout:60000});
 const expected=await page.evaluate(async()=>{const source=(window as any).__memoryShareGetGifSource();const sourceId=(document.querySelector('#labGifSource') as HTMLSelectElement).value;const db=await new Promise<IDBDatabase>((resolve,reject)=>{const r=indexedDB.open('babyExpressionRouletteDB',3);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});const saved=await new Promise<any>((resolve,reject)=>{const r=db.transaction('deckSources').objectStore('deckSources').get(sourceId);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});db.close();const colors=[];for(const frame of source.frames){const img=new Image();img.src=frame.image;await img.decode();const c=document.createElement('canvas');c.width=img.width;c.height=img.height;const x=c.getContext('2d')!;x.drawImage(img,0,0);colors.push(Array.from(x.getImageData(5,5,1,1).data).slice(0,3))}return {name:saved.fileName,colors}});
 expect(expected.name).toBe('synthetic-b.webm');expect(expected.colors).toHaveLength(12);
 await page.locator('#labMakeGif').click();await expect(page.locator('#labGifResult')).toBeVisible();
 const url=await page.locator('#labGifDownload').getAttribute('href');const bytes=await page.evaluate(async url=>Array.from(new Uint8Array(await (await fetch(url!)).arrayBuffer())),url);
 const frames=decompressFrames(parseGIF(Uint8Array.from(bytes)),true);expect(frames).toHaveLength(12);
 frames.forEach((frame,i)=>{const offset=(5*frame.dims.width+5)*4;for(let c=0;c<3;c++)expect(Math.abs(frame.patch[offset+c]-expected.colors[i][c])).toBeLessThan(70)});
 const first=Array.from(frames[0].patch.slice((5*frames[0].dims.width+5)*4,(5*frames[0].dims.width+5)*4+3));expect(first[0]).toBeGreaterThan(140);expect(first[2]).toBeGreaterThan(140);expect(first[1]).toBeLessThan(90);
});
test('S12 delayed first source cannot overwrite the last selection',async({page})=>{
 await page.goto('/#home');
 await page.evaluate(async()=>{await (window as any).__memoryHistoryMigrationPromise;const db=await new Promise<IDBDatabase>((resolve,reject)=>{const r=indexedDB.open('babyExpressionRouletteDB',3);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});await new Promise<void>((resolve,reject)=>{const tx=db.transaction('creations','readwrite');for(const name of ['A','B']){const c=document.createElement('canvas');c.width=c.height=50;const x=c.getContext('2d')!;x.fillStyle=name==='A'?'red':'blue';x.fillRect(0,0,50,50);const img=c.toDataURL();tx.objectStore('creations').put({id:name,title:'Synthetic '+name,createdAt:1700000000000,mode:'roulette',frames:[img,img],times:[0,1]})}tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error)});db.close()});
 await page.locator('[data-route="gif"]').click();await page.locator('#labGifChoosePast').click();await expect(page.getByRole('button',{name:/Synthetic A.*2コマ/})).toBeVisible();
 await page.evaluate(()=>{const original=(window as any).__memoryGifLoadSource;(window as any).__memoryGifLoadSource=async (id:string)=>{if(id.includes('legacy-gif:A:'))await new Promise(resolve=>setTimeout(resolve,700));return original(id)}});
 await page.getByRole('button',{name:/Synthetic A.*2コマ/}).click();await page.getByRole('button',{name:/Synthetic B.*2コマ/}).click();
 await expect(page.locator('#labGifSelectedTitle')).toContainText('Synthetic B');await page.waitForTimeout(900);await expect(page.locator('#labGifSelectedTitle')).toContainText('Synthetic B');
 const src=await page.locator('#labGifSelectedFrames img').first().getAttribute('src');const rgb=await page.evaluate(async src=>{const i=new Image();i.src=src!;await i.decode();const c=document.createElement('canvas');c.width=c.height=50;const x=c.getContext('2d')!;x.drawImage(i,0,0);return Array.from(x.getImageData(5,5,1,1).data)},src);expect(rgb[2]).toBeGreaterThan(200);expect(rgb[0]).toBeLessThan(30);
});
test('S07 one-frame legacy history cannot produce a GIF',async({page})=>{
 await page.goto('/#home');await page.evaluate(async()=>{await (window as any).__memoryHistoryMigrationPromise;const c=document.createElement('canvas');c.width=c.height=50;const x=c.getContext('2d')!;x.fillStyle='red';x.fillRect(0,0,50,50);const db=await new Promise<IDBDatabase>((resolve,reject)=>{const r=indexedDB.open('babyExpressionRouletteDB',3);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});await new Promise<void>((resolve,reject)=>{const t=db.transaction('creations','readwrite');t.objectStore('creations').put({id:'one',title:'One frame',createdAt:1700000000000,mode:'roulette',frames:[c.toDataURL()],times:[0]});t.oncomplete=()=>resolve();t.onerror=()=>reject(t.error)});db.close()});
 await page.locator('[data-route="gif"]').click();await page.locator('#labGifChoosePast').click();await expect(page.locator('#labGifSourceGrid .deckVideoPick')).toHaveCount(0);await expect(page.locator('#labGifFrameInfo')).toContainText('ありません');await expect(page.locator('#labGifEditor')).not.toBeVisible();await expect(page.locator('#labGifResult')).not.toBeVisible();await expect(page).toHaveURL(/#gif$/);
 await expect(page.locator('#labGifFrameInfo')).toContainText(/2(?:枚|コマ)以上/);
});
test('S11 changing speed and source during encoding discards old tasks',async({page})=>{
 test.setTimeout(90000);await page.goto('/#home');await page.evaluate(async()=>{await (window as any).__memoryHistoryMigrationPromise;const db=await new Promise<IDBDatabase>((resolve,reject)=>{const r=indexedDB.open('babyExpressionRouletteDB',3);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});await new Promise<void>((resolve,reject)=>{const tx=db.transaction('creations','readwrite');for(const name of ['A','B']){const frames=Array.from({length:40},(_,i)=>{const c=document.createElement('canvas');c.width=c.height=120;const x=c.getContext('2d')!;x.fillStyle=name==='A'?'red':'blue';x.fillRect(0,0,120,120);x.fillStyle='white';x.fillText(String(i),10,20);return c.toDataURL()});tx.objectStore('creations').put({id:name,title:'Race '+name,createdAt:1700000000000,mode:'roulette',frames,times:frames.map((_,i)=>i)})}tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error)});db.close()});
 await page.locator('[data-route="gif"]').click();await page.locator('#labGifChoosePast').click();await page.getByRole('button',{name:/Race A.*40コマ/}).click();await expect(page.locator('#labMakeGif')).toBeEnabled();
 await page.locator('#labMakeGif').click();await expect(page.locator('#labGifStatus')).toContainText('GIFを作って');await page.locator('#labGifSpeed').selectOption('0.5');await page.waitForTimeout(2000);await expect(page.locator('#labGifResult')).not.toBeVisible();
 await page.locator('#labMakeGif').click();await expect(page.locator('#labGifStatus')).toContainText('GIFを作って');await page.locator('#labGifChangeVideo').click();await page.getByRole('button',{name:/Race B.*40コマ/}).click();await expect(page.locator('#labGifSelectedTitle')).toContainText('Race B');await page.waitForTimeout(2000);await expect(page.locator('#labGifResult')).not.toBeVisible();
});
test('S02 seeded GIF source filename search @smoke',async({page,browserName})=>{
 test.skip(browserName!=='webkit','Chromium uses the real video import variant');await page.goto('/#home');
 await page.evaluate(async()=>{await (window as any).__memoryHistoryMigrationPromise;const db=await new Promise<IDBDatabase>((resolve,reject)=>{const r=indexedDB.open('babyExpressionRouletteDB',3);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});const canvas=document.createElement('canvas');canvas.width=canvas.height=50;const x=canvas.getContext('2d')!;x.fillStyle='blue';x.fillRect(0,0,50,50);const image=canvas.toDataURL();await new Promise<void>((resolve,reject)=>{const tx=db.transaction(['deckSources','deckFrames'],'readwrite');tx.objectStore('deckSources').put({id:'b',fileName:'synthetic-b.webm',candidateCount:2,addedAt:1700000000000,storageBytes:0,analysisPending:false,thumbnailData:image});for(let i=0;i<2;i++)tx.objectStore('deckFrames').put({id:'b-'+i,sourceVideoId:'b',timestamp:i,imageData:image});tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error)});db.close()});
 await page.locator('[data-route="gif"]').click();await page.locator('#labGifChoosePast').click();await expect(page.locator('#labGifSourceGrid .deckVideoPick')).toHaveCount(1);await page.locator('#labGifSearch').fill('synthetic-b');await expect(page.locator('#labGifSourceGrid .deckVideoPick')).toHaveCount(1);
});
