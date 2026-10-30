import { test } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
// Snapshot the empty-database DOM for review, not a coverage assertion.
test('inventory visible and hidden controls', async ({page},info)=>{
 await page.goto('/#home');
 const controls=await page.locator('button, input, select, a[href]').evaluateAll(nodes=>nodes.map(el=>({tag:el.tagName.toLowerCase(),id:el.id||null,route:el.closest('[data-app-view]')?.getAttribute('data-app-view')||null,label:el.getAttribute('aria-label')||el.textContent?.trim().replace(/\s+/g,' ').slice(0,120)||el.getAttribute('placeholder')||null,target:el.getAttribute('data-route'),back:el.hasAttribute('data-nav-back')})));
 const json=JSON.stringify(controls,null,2);await info.attach('empty-db-controls.json',{body:json,contentType:'application/json'});if(process.env.INVENTORY_OUTPUT)await writeFile(process.env.INVENTORY_OUTPUT,json+'\n');
});
