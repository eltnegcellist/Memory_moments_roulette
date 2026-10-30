import { test, expect } from '@playwright/test';
test.use({serviceWorkers:'allow'});
test('S16 installed service worker supports offline navigation',async({page,context})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/#home');await page.evaluate(()=>navigator.serviceWorker.ready);
 await page.reload();await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
 const keys=await page.evaluate(()=>caches.keys());expect(keys.some(x=>x.includes('gif-stamp-fix1'))).toBeTruthy();
 await context.setOffline(true);await page.reload();
 await expect(page.locator('body')).toHaveAttribute('data-app-view','home');
 await page.locator('[data-route="gif"]').click();await expect(page).toHaveURL(/#gif$/);await expect(page.locator('#labGifAddVideo')).toBeVisible();
 await page.locator('#labGifSection [data-nav-back]').click();await expect(page).toHaveURL(/#home$/);
 await context.setOffline(false);await page.reload();await expect(page.locator('body')).toHaveAttribute('data-app-view','home');expect(errors).toEqual([]);
});
test('S16 simulated old service worker updates to current cache then works offline',async({page,context})=>{
 const {createServer}=await import('node:http');const {readFile}=await import('node:fs/promises');const path=await import('node:path');let old=true;
 const current=await readFile('sw.js','utf8');
 const server=createServer(async(req,res)=>{try{let p=decodeURIComponent(new URL(req.url!,'http://localhost').pathname);if(p==='/')p='/index.html';if(p.includes('..')){res.writeHead(400).end();return}let body:Buffer|string;if(p==='/sw.js')body=old?current.replace('baby-roulette-pages-1.2.1-gif-stamp-fix1','synthetic-old-cache'):current;else body=await readFile(path.join(process.cwd(),p));const ext=path.extname(p);res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.webmanifest':'application/manifest+json'} as Record<string,string>)[ext]||'application/octet-stream');res.setHeader('Cache-Control','no-store');res.end(body)}catch{res.writeHead(404).end()}});
 await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));const addr=server.address();if(!addr||typeof addr==='string')throw new Error('server failed');
 try{await page.goto(`http://127.0.0.1:${addr.port}/#home`);await page.evaluate(()=>navigator.serviceWorker.ready);await expect.poll(()=>page.evaluate(()=>caches.keys())).toContain('synthetic-old-cache');
 old=false;await page.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration();await r!.update()});
 await expect.poll(async()=>page.evaluate(()=>caches.keys()),{timeout:15000}).toEqual(['baby-roulette-pages-1.2.1-gif-stamp-fix1']);
 await page.reload();await context.setOffline(true);await page.reload();await page.locator('[data-route="gif"]').click();await expect(page.locator('#labGifAddVideo')).toBeVisible();await expect(page).toHaveURL(/#gif$/);await context.setOffline(false);
 }finally{await context.setOffline(false);await new Promise<void>(resolve=>server.close(()=>resolve()))}
});
