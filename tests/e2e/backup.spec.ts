import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
test('S20 backup and restore synthetic video frames in a fresh context',async({page,browser})=>{
 test.setTimeout(90000);
 await page.addInitScript(()=>Object.defineProperty(window,'showSaveFilePicker',{value:undefined}));
 await page.goto('/#home');await page.locator('[data-route="gif"]').click();await page.locator('#labGifFileInput').setInputFiles('tests/fixtures/synthetic-a.webm');
 await expect(page.locator('#labGifEditor')).toBeVisible({timeout:60000});
 await page.locator('#labGifSection [data-nav-back]').click();await page.locator('[data-route="settings"]').click();
 const pending=page.waitForEvent('download');await page.locator('#deckBackupBtn').click();const download=await pending;
 expect(download.suggestedFilename()).toMatch(/\.mmrbackup$/);const data=await readFile((await download.path())!);
 const records=data.toString().trim().split('\n').map(x=>JSON.parse(x));expect(records[0].format).toBe('memory-moments-roulette-deck-stream');
 const frames=records.filter(x=>x.type==='frame').map(x=>({id:x.data.id,imageData:x.data.imageData}));expect(frames.length).toBeGreaterThan(1);
 const ctx=await browser.newContext({baseURL:new URL(page.url()).origin,serviceWorkers:'block'});const target=await ctx.newPage();
 try{await target.goto('/#settings');await target.locator('#deckRestoreInput').setInputFiles({name:'synthetic.mmrbackup',mimeType:'application/x-ndjson',buffer:data});
 await expect(target.locator('#deckNotice')).toContainText('復元',{timeout:30000});
 const restored=await target.evaluate(async()=>{const db=await new Promise<IDBDatabase>((resolve,reject)=>{const r=indexedDB.open('babyExpressionRouletteDB',3);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});const all=await new Promise<any[]>((resolve,reject)=>{const r=db.transaction('deckFrames').objectStore('deckFrames').getAll();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});db.close();return all.map(x=>({id:x.id,imageData:x.imageData}))});
 expect(restored.sort((a,b)=>a.id.localeCompare(b.id))).toEqual(frames.sort((a,b)=>a.id.localeCompare(b.id)));
 await target.locator('#settingsSection [data-nav-back]').click();await expect(target).toHaveURL(/#home$/);
 }finally{await ctx.close()}
});
