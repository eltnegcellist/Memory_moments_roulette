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
