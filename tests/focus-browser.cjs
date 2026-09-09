/* Shared layout and focus-view regressions. Requires external Playwright. */
const assert = require('node:assert/strict');
const { chromium, firefox } = require('playwright');
const base = process.env.TEST_URL || 'http://127.0.0.1:8080/';
const games = ['labyrinth', 'snake', 'memory', 'whac-a-mole', 'dune'];
const viewports = [
  {width:1440,height:900}, {width:768,height:1024}, {width:800,height:600},
  {width:390,height:844}, {width:320,height:568}, {width:844,height:390}, {width:568,height:320}
];
const overlaps = (a,b) => a.x < b.x+b.width-1 && a.x+a.width > b.x+1 && a.y < b.y+b.height-1 && a.y+a.height > b.y+1;
const errors = [];
async function click(page, selector) { await page.locator(selector).click({force:true}); if (selector.includes('settings')) await settle(page); }
async function settle(page) { await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))); }
// Native fullscreen and details toggles finish asynchronously after their events.
// Retry read-only layout assertions while rendering settles; persistent defects fail.
async function settled(check) {
  const deadline = Date.now() + 1500;
  for (;;) {
    try { return await check(); }
    catch (error) {
      if (Date.now() >= deadline) throw error;
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }
}
function fits(box, viewport, label) {
  assert(box.x >= -1 && box.y >= -1 && box.x+box.width <= viewport.width+1 && box.y+box.height <= viewport.height+1, `${label} is outside viewport: ${JSON.stringify(box)}`);
}
async function geometry(page, viewport, label) {
  return settled(() => readGeometry(page, viewport, label));
}
async function readGeometry(page, viewport, label) {
  // Read one rendered layout, rather than mixing boxes across fullscreen frames.
  const snapshot = await page.evaluate(() => ({
    size: {w:document.documentElement.scrollWidth,h:document.documentElement.scrollHeight},
    board: document.getElementById('board').getBoundingClientRect().toJSON(),
    controls: ['.stats','.game-toolbar','.dpad'].flatMap(selector => {
      const element = document.querySelector(selector);
      return element ? [{selector,box:element.getBoundingClientRect().toJSON()}] : [];
    })
  }));
  const {size,board}=snapshot;
  assert(size.w <= viewport.width && size.h <= viewport.height+1, `${label} scrolls: ${JSON.stringify(size)}`);
  fits(board,viewport,label+' board');
  const controls=[];
  for(const {selector,box} of snapshot.controls) {
    fits(box,viewport,label+' '+selector);
    assert(!overlaps(board,box),`${label}: ${selector} covers a game target; board=${JSON.stringify(board)} control=${JSON.stringify(box)}`);
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
      await settled(async () => fits(await page.locator('.settings-content').boundingBox(),viewport,name+' settings'));
      await click(page,'#settings summary');
      await page.evaluate(() => {
        window.testFullscreenChange = new Promise(resolve => document.addEventListener('fullscreenchange', () => resolve(), {once:true}));
      });
      await click(page,'#fullscreen');
      await page.evaluate(() => window.testFullscreenChange);
      await settle(page);
      assert(await page.evaluate(()=>Boolean(document.fullscreenElement)),name+' did not enter native fullscreen');
      assert.equal(await page.locator('.game-header').isVisible(),false);
      assert.equal(await page.locator('#fullscreen').getAttribute('aria-label'),'Exit fullscreen');
      // Firefox headless enters its virtual monitor size, which can differ from
      // Playwright's emulated window. Validate the actual fullscreen viewport.
      const fullViewport = await page.evaluate(() => ({width:innerWidth,height:innerHeight}));
      const focused=await geometry(page,fullViewport,name+' fullscreen');
      if (fullViewport.width === viewport.width && fullViewport.height === viewport.height) {
        assert(focused.width >= normal.width-1,name+' fullscreen shrinks the board');
      }
      await click(page,'#settings summary');
      await settled(async () => fits(await page.locator('.settings-content').boundingBox(),fullViewport,name+' fullscreen settings'));
      await page.keyboard.press('Escape');
      await settle(page);
      await settled(async () => assert.equal(await page.locator('#settings').evaluate(el=>el.open),false));
      // Firefox reserves Escape for native fullscreen; Chromium lets the menu close first.
      if (await page.evaluate(()=>document.body.classList.contains('is-focused'))) await click(page,'#fullscreen');
      await settle(page);
      await page.locator('.game-header').waitFor({state:'visible'});
      assert.equal(await page.locator('.game-header').isVisible(),true,name+' failed to exit fullscreen');
      assert.equal(await page.locator('#fullscreen').getAttribute('aria-label'),'Fullscreen');
      await page.setViewportSize(viewport);
    }
    console.log(`${label}: all games fit ${viewport.width}×${viewport.height}, with focused boards and unobstructed controls`);
  }
  // Opening and closing settings preserves the player's prior pause state.
  await page.goto(base+'labyrinth/');
  await click(page,'#settings summary');
  await settled(async () => assert.equal(await page.locator('#pause').textContent(),'Resume'));
  await page.keyboard.press('Escape');
      await settle(page);
  await settled(async () => assert.equal(await page.locator('#pause').textContent(),'Pause'));
  await click(page,'#pause');
  await click(page,'#settings summary');
  await page.keyboard.press('Escape');
      await settle(page);
  await settled(async () => assert.equal(await page.locator('#pause').textContent(),'Resume'));
  await click(page,'#fullscreen');
  await page.locator('body.is-focused').waitFor();
  await page.keyboard.press('Escape');
      await settle(page);
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
  if (!process.env.SKIP_CHROMIUM) {
    const chrome=await chromium.launch({...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
    try {await check(chrome,'Chromium');} finally {await chrome.close();}
  }
  if(!process.env.SKIP_FIREFOX) {
    const fox=await firefox.launch();
    try {await check(fox,'Firefox');} finally {await fox.close();}
  }
  assert.deepEqual(errors,[]);
})().catch(e=>{console.error(e);process.exitCode=1;});
