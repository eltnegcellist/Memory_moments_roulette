import { test, expect } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
const routes = ['library','favorites','history','settings','gif','share-picker','receive'];
for (const seed of [1,2,3,4,5,6,7,8,9,10]) {
 test(`P2 deterministic empty-library exploration seed ${seed}`,async({page},info)=>{
  test.setTimeout(90000);
  let state=seed; const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state;};
  const errors:string[]=[],actions:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/#home');
  try { for(let i=0;i<100;i++){
   const route=routes[random()%routes.length];
   await page.locator(`[data-route="${route}"]`).click();actions.push(`home→${route}`);
   await expect(page).toHaveURL(new RegExp(`#${route}$`));
   await expect(page.locator('body')).toHaveAttribute('data-app-view',route);
   await expect(page.locator(`section[data-app-view="${route}"]`).first()).toBeVisible();
   await page.locator(`section[data-app-view="${route}"] [data-nav-back]`).first().click();actions.push(`${route}→home`);
   await expect(page).toHaveURL(/#home$/);
   await expect(page.locator('body')).toHaveAttribute('data-app-view','home');
  }} finally {const json=JSON.stringify({seed,actions,errors},null,2);await info.attach('model-actions.json',{body:json,contentType:'application/json'});if(process.env.EXPLORE_OUTPUT)await writeFile(join(process.env.EXPLORE_OUTPUT,`seed-${seed}.json`),json+'\n');}
  expect(errors).toEqual([]);
 });
}
for (const seed of [42,99]) {
 test(`P2 seeded receive-play-share exploration ${seed}`,async({page},info)=>{
  test.setTimeout(90000);let state=seed;const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state};const actions:string[]=[],errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/#home');const frames=await page.evaluate(()=>['red','blue'].map(color=>{const c=document.createElement('canvas');c.width=c.height=50;const x=c.getContext('2d')!;x.fillStyle=color;x.fillRect(0,0,50,50);return c.toDataURL()}));
  const file={name:'synthetic.mmrplay',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({format:'memory-moments-playable',version:1,title:'Model fixture',mode:'roulette',frames,times:[0,1]}))};
  try { for(let i=0;i<100;i++){
   const current=await page.locator('body').getAttribute('data-app-view');let next=current;
   if(current==='home'){await page.locator('[data-route="receive"]').click();next='receive';actions.push('home→receive')}
   else if(current==='receive'){if(random()%3){await page.locator('#shareImportFile').setInputFiles(file);next='play';actions.push('receive→play')}else{await page.locator('#receiveSection [data-nav-back]').click();next='home';actions.push('receive→home')}}
   else if(current==='play'){if(random()%3){await page.locator('#shareOpenFromPlay').click();next='share';actions.push('play→share')}else{await page.locator('#backBtn').click();next='receive';actions.push('play→receive')}}
   else if(current==='share'){if(random()%3){await page.locator('#shareBackBtn').click();next='play';actions.push('share→play')}else{const value=['movie','play','photo'][random()%3];await page.locator('#shareRouletteFormat').selectOption(value);actions.push('share format '+value);await expect(page.locator('#shareRouletteFormat')).toHaveValue(value)}}
   else throw new Error('unexpected view '+current);
   await expect(page).toHaveURL(new RegExp('#'+next+'$'));await expect(page.locator('body')).toHaveAttribute('data-app-view',next!);
  }
  } finally {const json=JSON.stringify({seed,actions,errors},null,2);await info.attach('model-actions.json',{body:json,contentType:'application/json'});if(process.env.EXPLORE_OUTPUT)await writeFile(join(process.env.EXPLORE_OUTPUT,`seed-${seed}.json`),json+'\n');}expect(errors).toEqual([]);
 });
}
