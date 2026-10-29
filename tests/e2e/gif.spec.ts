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
  const file=await page.locator('#labGifDownload').getAttribute('href');
  const encoded=await page.evaluate(async url=>{const b=await (await fetch(url!)).arrayBuffer();return Array.from(new Uint8Array(b));},file);
  const decoded=decompressFrames(parseGIF(Uint8Array.from(encoded)),true);
  expect(decoded).toHaveLength(8);
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
 await page.locator('#sharePrivacyClose').click();
 await expect(page.locator('#sharePrivacyEditor')).not.toBeVisible();
 await expect(page.locator('#labGifSelectedTitle')).toContainText('Synthetic A');
 await expect(page).toHaveURL(/#gif$/);
});
