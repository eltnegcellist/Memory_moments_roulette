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
 const oldWorker="const C='synthetic-old-cache';self.addEventListener('install',e=>e.waitUntil(caches.open(C).then(c=>c.addAll(['./','./index.html','./navigation.js?old'])).then(()=>self.skipWaiting())));self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));self.addEventListener('fetch',e=>e.respondWith(fetch(e.request).catch(()=>caches.match(e.request))));";
 const server=createServer(async(req,res)=>{try{let p=decodeURIComponent(new URL(req.url!,'http://localhost').pathname);if(p==='/')p='/index.html';if(p.includes('..')){res.writeHead(400).end();return}let body:Buffer|string;if(p==='/sw.js')body=old?oldWorker:current;else body=await readFile(path.join(process.cwd(),p));const ext=path.extname(p);res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.webmanifest':'application/manifest+json'} as Record<string,string>)[ext]||'application/octet-stream');res.setHeader('Cache-Control','no-store');res.end(body)}catch{res.writeHead(404).end()}});
 await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));const addr=server.address();if(!addr||typeof addr==='string')throw new Error('server failed');
 try{await page.goto(`http://127.0.0.1:${addr.port}/#home`);await page.evaluate(()=>navigator.serviceWorker.ready);await expect.poll(()=>page.evaluate(()=>caches.keys())).toContain('synthetic-old-cache');
 old=false;await page.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration();await r!.update()});
 await expect.poll(async()=>page.evaluate(()=>caches.keys()),{timeout:15000}).toEqual(['baby-roulette-pages-1.2.1-gif-stamp-fix1']);
 const cachedUrls=await page.evaluate(async()=>{const cache=await caches.open('baby-roulette-pages-1.2.1-gif-stamp-fix1');return (await cache.keys()).map(r=>r.url)});expect(cachedUrls.some(url=>url.includes('navigation.js?v=1.2.1-share-gallery-stop1'))).toBe(true);expect(cachedUrls.some(url=>url.includes('navigation.js?old'))).toBe(false);
 await page.reload();await context.setOffline(true);await page.reload();await page.locator('[data-route="gif"]').click();await expect(page.locator('#labGifAddVideo')).toBeVisible();await expect(page).toHaveURL(/#gif$/);await context.setOffline(false);
 }finally{await context.setOffline(false);await new Promise<void>(resolve=>server.close(()=>resolve()))}
});
test('S16 historical h25 release updates to current and works offline',async({page,context})=>{
 test.setTimeout(90000);
 const {createServer}=await import('node:http');const {readFile}=await import('node:fs/promises');const {execFileSync}=await import('node:child_process');const path=await import('node:path');let old=true;
 const cache=new Map<string,Buffer>();
 const server=createServer(async(req,res)=>{try{let p=decodeURIComponent(new URL(req.url!,'http://localhost').pathname);if(p==='/')p='/index.html';if(p.includes('..')){res.writeHead(400).end();return}let body:Buffer;if(old){if(!cache.has(p))cache.set(p,execFileSync('git',['show',`6bfb190:${p.slice(1)}`],{maxBuffer:20*1024*1024,stdio:['ignore','pipe','ignore']}));body=cache.get(p)!}else body=await readFile(path.join(process.cwd(),p));const ext=path.extname(p);res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.webmanifest':'application/manifest+json'} as Record<string,string>)[ext]||'application/octet-stream');res.setHeader('Cache-Control','no-store');res.end(body)}catch{res.writeHead(404).end()}});
 await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));const addr=server.address();if(!addr||typeof addr==='string')throw new Error('server failed');
 try{await page.goto(`http://127.0.0.1:${addr.port}/#home`);await page.evaluate(()=>navigator.serviceWorker.ready);await expect.poll(()=>page.evaluate(()=>caches.keys())).toContain('baby-roulette-pages-1.1.0-h25-android-tested-r3');
 old=false;await page.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration();await r!.update()});
 await expect.poll(()=>page.evaluate(()=>caches.keys()),{timeout:30000}).toEqual(['baby-roulette-pages-1.2.1-gif-stamp-fix1']);
 await page.reload();await expect(page.locator('[data-route="gif"]')).toBeVisible();await context.setOffline(true);await page.reload();await page.locator('[data-route="gif"]').click();await expect(page.locator('#labGifAddVideo')).toBeVisible();await expect(page).toHaveURL(/#gif$/);
 }finally{await context.setOffline(false);await new Promise<void>(resolve=>server.close(()=>resolve()))}
});
