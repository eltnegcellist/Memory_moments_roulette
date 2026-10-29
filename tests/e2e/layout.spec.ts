import { test, expect } from '@playwright/test';
test('S14 portrait and landscape GIF entry controls remain clickable',async({page})=>{
 await page.goto('/#home');
 for(const size of [{width:360,height:780},{width:780,height:360}]){
  await page.setViewportSize(size);
  const entry=page.locator('[data-route="gif"]');await entry.scrollIntoViewIfNeeded();await entry.click();await expect(page).toHaveURL(/#gif$/);
  const button=page.locator('#labGifChoosePast');await button.scrollIntoViewIfNeeded();
  const hit=await button.evaluate(el=>{const b=el.getBoundingClientRect();const hit=document.elementFromPoint(b.left+b.width/2,b.top+b.height/2);return {width:b.width,height:b.height,hit:!!hit&&(hit===el||el.contains(hit))}});
  expect(hit.width).toBeGreaterThan(0);expect(hit.height).toBeGreaterThan(0);expect(hit.hit).toBe(true);
  await button.click();await expect(page.locator('#labGifPast')).toBeVisible();await page.locator('#labGifSection [data-nav-back]').click();
 }
});
