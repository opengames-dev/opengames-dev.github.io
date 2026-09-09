/* Optional Chromium checks for touch, gamepad, and restricted browser features. */
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const base = process.env.TEST_URL || 'http://127.0.0.1:8080/';
(async () => {
  const browser = await chromium.launch({ ...(process.env.CHROME_PATH ? {executablePath:process.env.CHROME_PATH} : {}) });
  const errors = [];
  try {
    const context = await browser.newContext({ viewport:{width:390,height:844}, hasTouch:true, isMobile:true, deviceScaleFactor:2 });
    await context.addInitScript(() => {
      window.testPad = null;
      Object.defineProperty(navigator, 'getGamepads', { value: () => window.testPad ? [window.testPad] : [] });
    });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.clock.install({time:new Date('2026-01-01T00:00:00Z')});
    await page.clock.pauseAt(new Date('2026-01-01T00:01:00Z'));
    await page.goto(base + 'labyrinth/');
    await page.clock.runFor(32);
    await page.evaluate(() => {
      const generate = MazeLogic.generate;
      MazeLogic.generate = (...args) => { window.testMaze = generate(...args); return window.testMaze; };
    });
    await page.locator('#restart').click({force:true});
    const direction = await page.evaluate(() => window.testMaze.cells[0][1] ? 'down' : 'right');
    const box = await page.locator('#board').boundingBox();
    const session = await context.newCDPSession(page);
    const point = {x:box.x + box.width / 2, y:box.y + box.height / 2};
    await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]});
    await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:point.x + (direction === 'right' ? 45 : 0),y:point.y + (direction === 'down' ? 45 : 0)}]});
    await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    assert.equal(await page.locator('#moves').textContent(), '1');
    assert(await page.locator('#board').evaluate(el => Math.abs(el.width - el.getBoundingClientRect().width * 2) < 2));

    // Connect a standard pad and move using the left analog stick.
    await page.locator('#restart').click({force:true});
    await page.evaluate(() => {
      const right = !window.testMaze.cells[0][1];
      window.testPad = {axes: right ? [1,0] : [0,1], buttons:Array.from({length:16},()=>({pressed:false}))};
      window.dispatchEvent(new Event('gamepadconnected'));
    });
    await page.clock.runFor(32);
    assert.equal(await page.locator('#moves').textContent(), '1');
    await page.evaluate(() => { window.testPad.axes=[0,0]; window.testPad.buttons[9].pressed=true; });
    await page.clock.runFor(32);
    assert.equal(await page.locator('#pause').textContent(), 'Resume');
    await page.evaluate(() => { window.testPad.buttons[9].pressed=false; window.testPad.buttons[0].pressed=true; });
    await page.clock.runFor(32);
    assert.equal(await page.locator('#pause').textContent(), 'Pause');

    await page.goto(base + 'snake/');
    await page.evaluate(() => {
      const create=SnakeLogic.create;
      SnakeLogic.create=(...args)=>{window.testSnake=create(...args);return window.testSnake;};
    });
    await page.locator('#restart').click({force:true});
    await page.evaluate(() => {
      window.testPad={axes:[0,0],buttons:Array.from({length:16},(_,i)=>({pressed:i===12}))};
      window.dispatchEvent(new Event('gamepadconnected'));
    });
    await page.clock.runFor(200);
    assert.equal(await page.evaluate(() => window.testSnake.direction), 'up');
    assert.equal(await page.locator('#overlay').isVisible(), false);
    // Hiding the page cancels its frame immediately; a long absence cannot advance play.
    const beforeHidden = await page.evaluate(() => JSON.stringify(window.testSnake.body));
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable:true, value:true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await page.clock.runFor(60000);
    assert.equal(await page.evaluate(() => JSON.stringify(window.testSnake.body)), beforeHidden);
    assert.equal(await page.locator('#pause').textContent(), 'Resume');
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable:true, value:false });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await page.locator('#overlay-action').click({force:true});
    await page.clock.runFor(32);
    assert.equal(await page.locator('#overlay').isVisible(), false);

    await page.goto(base + 'memory/');
    await page.locator('.memory-card').first().tap();
    assert.equal(await page.locator('.revealed').count(),1);
    await context.close();
    console.log('Touch swipe/tap, 2× canvas resolution, and synthetic gamepad analog/D-pad/action/pause passed.');

    const restricted = await browser.newContext();
    await restricted.addInitScript(() => {
      Object.defineProperty(window,'localStorage',{get(){throw new DOMException('Storage unavailable','SecurityError');}});
      Object.defineProperty(window,'AudioContext',{value:function(){throw new Error('Audio unavailable');}});
      Object.defineProperty(navigator,'getGamepads',{value:()=>{throw new DOMException('Gamepad unavailable','SecurityError');}});
    });
    const restrictedPage = await restricted.newPage();
    restrictedPage.on('pageerror', error => errors.push(error.message));
    for(const game of ['labyrinth','snake','memory','whac-a-mole']) {
      await restrictedPage.goto(base + game + '/');
      await restrictedPage.locator('#settings summary').click();
      await restrictedPage.locator('#sound').click();
      await restrictedPage.locator('[data-difficulty="easy"]').click();
      await restrictedPage.locator('#restart').click();
      if(game === 'memory') {
        await restrictedPage.locator('.memory-card').first().click();
        assert.equal(await restrictedPage.locator('.revealed').count(),1);
      } else if(game !== 'labyrinth') {
        if (await restrictedPage.locator('#overlay').isVisible()) await restrictedPage.locator('#overlay-action').click();
        assert.equal(await restrictedPage.locator('#overlay').isVisible(),false);
      }
    }
    await restricted.close();
    console.log('All games remain playable when storage, audio, and gamepad APIs are unavailable.');
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
})().catch(error => {console.error(error);process.exitCode=1;});
