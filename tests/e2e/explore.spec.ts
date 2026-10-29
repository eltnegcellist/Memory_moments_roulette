import { test, expect } from '@playwright/test';
const routes = ['library','favorites','history','settings','gif','share-picker','receive'];
for (const seed of [1,2,3,4,5,6,7,8,9,10]) {
 test(`P2 deterministic empty-library exploration seed ${seed}`,async({page})=>{
  test.setTimeout(90000);
  let state=seed; const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state;};
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/#home');
  for(let i=0;i<100;i++){
   const route=routes[random()%routes.length];
   await page.locator(`[data-route="${route}"]`).click();
   await expect(page).toHaveURL(new RegExp(`#${route}$`));
   await expect(page.locator('body')).toHaveAttribute('data-app-view',route);
   await expect(page.locator(`section[data-app-view="${route}"]`).first()).toBeVisible();
   await page.locator(`section[data-app-view="${route}"] [data-nav-back]`).first().click();
   await expect(page).toHaveURL(/#home$/);
   await expect(page.locator('body')).toHaveAttribute('data-app-view','home');
  }
  expect(errors).toEqual([]);
 });
}
