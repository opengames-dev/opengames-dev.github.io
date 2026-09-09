/* Shared layout and focus-view regressions. Requires external Playwright. */
const assert = require('node:assert/strict');
const { chromium, firefox } = require('playwright');
const base = process.env.TEST_URL || 'http://127.0.0.1:8080/';
const games = ['labyrinth', 'snake', 'memory', 'whac-a-mole'];
const viewports = [
  {width:1440,height:900}, {width:768,height:1024}, {width:800,height:600},
  {width:390,height:844}, {width:320,height:568}, {width:844,height:390}, {width:568,height:320}
];
const overlaps = (a,b) => a.x < b.x+b.width-1 && a.x+a.width > b.x+1 && a.y < b.y+b.height-1 && a.y+a.height > b.y+1;
const errors = [];
async function click(page, selector) { await page.locator(selector).click({force:true}); }
async function settle(page) { await page.clock.runFor(32); }
function fits(box, viewport, label) {
  assert(box.x >= -1 && box.y >= -1 && box.x+box.width <= viewport.width+1 && box.y+box.height <= viewport.height+1, `${label} is outside viewport: ${JSON.stringify(box)}`);
}
async function geometry(page, viewport, label) {
  const size = await page.evaluate(() => ({w:document.documentElement.scrollWidth,h:document.documentElement.scrollHeight}));
  assert(size.w <= viewport.width && size.h <= viewport.height+1, `${label} scrolls: ${JSON.stringify(size)}`);
  const board = await page.locator('#board').boundingBox();
  fits(board,viewport,label+' board');
  const controls=[];
  for(const selector of ['.stats','.game-toolbar','.dpad']) {
    if (!await page.locator(selector).count()) continue;
    const box=await page.locator(selector).boundingBox();
    fits(box,viewport,label+' '+selector);
    assert(!overlaps(board,box),`${label}: ${selector} covers a game target`);
    for(const other of controls) assert(!overlaps(box,other), `${label}: controls overlap`);
    controls.push(box);
  }
  return board;
}
async function check(browser,label) {
  const context=await browser.newContext({reducedMotion:'reduce'});
  const page=await context.newPage();
  page.setDefaultTimeout(5000);
  page.on('pageerror',e=>errors.push(label+': '+e.message));
  await page.clock.install({time:new Date('2026-01-01T00:00:00Z')});
  await page.clock.pauseAt(new Date('2026-01-01T00:01:00Z'));
  for(const viewport of viewports) {
    await page.setViewportSize(viewport);
    for(const game of games) {
      await page.goto(base+game+'/');
      // The largest Memory deck checks rectangular board sizing too.
      if(game==='memory') {
        await click(page,'#settings summary');
        await click(page,'[data-difficulty="hard"]');
      }
      await settle(page);
      const name=`${label} ${game} ${viewport.width}×${viewport.height}`;
      const normal=await geometry(page,viewport,name);
      assert.equal(await page.locator('.game-description, .game-footer').count(),0);
      assert.equal(await page.locator('#control-hint').isVisible(),false);
      if(viewport.width>=700 || (viewport.width>=540 && viewport.width>viewport.height)) {
        const panel=await page.locator('.game-toolbar').boundingBox();
        assert(panel.x >= normal.x+normal.width, name+' is missing the side panel');
      }
      await click(page,'#settings summary');
      fits(await page.locator('.settings-content').boundingBox(),viewport,name+' settings');
      await click(page,'#settings summary');
      await click(page,'#fullscreen');
      await settle(page);
      assert(await page.evaluate(()=>Boolean(document.fullscreenElement)),name+' did not enter native fullscreen');
      assert.equal(await page.locator('.game-header').isVisible(),false);
      assert.equal(await page.locator('#fullscreen').getAttribute('aria-label'),'Exit fullscreen');
      const focused=await geometry(page,viewport,name+' fullscreen');
      assert(focused.width >= normal.width-1,name+' fullscreen shrinks the board');
      await click(page,'#settings summary');
      fits(await page.locator('.settings-content').boundingBox(),viewport,name+' fullscreen settings');
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('#settings').evaluate(el=>el.open),false);
      assert(await page.evaluate(()=>document.body.classList.contains('is-focused')),'Escape should close settings first');
      await click(page,'#fullscreen');
      await settle(page);
      await page.locator('.game-header').waitFor({state:'visible'});
      assert.equal(await page.locator('.game-header').isVisible(),true,name+' failed to exit fullscreen');
      assert.equal(await page.locator('#fullscreen').getAttribute('aria-label'),'Fullscreen');
    }
    console.log(`${label}: all games fit ${viewport.width}×${viewport.height}, with larger fullscreen boards and unobstructed controls`);
  }
  // Opening and closing settings preserves the player's prior pause state.
  await page.goto(base+'labyrinth/');
  await click(page,'#settings summary');
  assert.equal(await page.locator('#pause').textContent(),'Resume');
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#pause').textContent(),'Pause');
  await click(page,'#pause');
  await click(page,'#settings summary');
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#pause').textContent(),'Resume');
  await click(page,'#fullscreen');
  await page.keyboard.press('Escape');
  await settle(page);
  await page.locator('.game-header').waitFor({state:'visible'});
  assert.equal(await page.locator('.game-header').isVisible(),true);
  assert.equal(await page.locator('#pause').textContent(),'Resume','Exiting focus should not resume paused play');
  await context.close();

  // Some mobile browsers lack the Fullscreen API. The same focused UI still works.
  const fallback=await browser.newContext({viewport:{width:390,height:844}});
  await fallback.addInitScript(()=>Object.defineProperty(document,'fullscreenEnabled',{get:()=>false}));
  const phone=await fallback.newPage();
  phone.on('pageerror',e=>errors.push(label+': '+e.message));
  await phone.goto(base+'labyrinth/');
  await click(phone,'#fullscreen');
  assert.equal(await phone.locator('.game-header').isVisible(),false);
  assert.equal(await phone.evaluate(()=>document.fullscreenElement),null);
  await click(phone,'#fullscreen');
  assert.equal(await phone.locator('.game-header').isVisible(),true);
  await fallback.close();
  console.log(`${label}: settings pause state, Escape, and mobile fullscreen fallback passed`);
}
(async()=>{
  const chrome=await chromium.launch({...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
  try {await check(chrome,'Chromium');} finally {await chrome.close();}
  if(!process.env.SKIP_FIREFOX) {
    const fox=await firefox.launch();
    try {await check(fox,'Firefox');} finally {await fox.close();}
  }
  assert.deepEqual(errors,[]);
})().catch(e=>{console.error(e);process.exitCode=1;});
