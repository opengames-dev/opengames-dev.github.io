/* Optional integration checks. See README for the external Playwright setup. */
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium, firefox } = require('playwright');
const base = process.env.TEST_URL || 'http://127.0.0.1:8080/';
const games = ['labyrinth', 'snake', 'memory', 'whac-a-mole'];
const errors = [];

async function visit(page, game) {
  await page.goto(base + (game ? game + '/' : '') + 'index.html');
  await page.clock.runFor(40);
}
async function press(page, selector) {
  if (selector.includes('data-difficulty') || selector === '#sound') {
    if (!await page.locator('#settings').evaluate(el => el.open)) await page.locator('#settings summary').click({force:true});
  }
  await page.locator(selector).click({force:true});
  if (selector === '#sound') await page.locator('#settings summary').click({force:true});
}
async function run(browser, label, touch = false) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, hasTouch: touch, reducedMotion: 'reduce' });
  const page = await context.newPage();
  page.setDefaultTimeout(5000);
  page.on('pageerror', error => errors.push(`${label}: ${error.message}`));
  page.on('console', message => { if (message.type() === 'error') errors.push(`${label}: ${message.text()}`); });
  await page.clock.install({ time: new Date('2026-01-01T12:00:00Z') });
  await page.clock.pauseAt(new Date('2026-01-01T12:01:00Z'));

  // Responsive layout, shared controls, and canvas display density.
  for (const viewport of [{width:1280,height:900},{width:390,height:844},{width:320,height:568},{width:844,height:390}]) {
    await page.setViewportSize(viewport);
    for (const game of ['', ...games]) {
      await visit(page, game);
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${label} ${game} overflows at ${viewport.width}`);
      if (!game) { assert.equal(await page.locator('.game-card').count(), 4); continue; }
      const box = await page.locator('#board').boundingBox();
      assert(box.width >= 180 && box.width <= 1000, `${label} ${game}: invalid board ${box.width}`);
      if (game !== 'memory') assert(Math.abs(box.width - box.height) < 2, `${label} ${game}: nonsquare board`);
      assert(box.y + box.height <= viewport.height + 1, `${label} ${game}: board below viewport at ${viewport.width}×${viewport.height}`);
      await press(page, '[data-difficulty="easy"]');
      assert.equal(await page.locator('[data-difficulty="easy"]').getAttribute('aria-pressed'), 'true');
      await press(page, '#sound');
      assert.equal(await page.locator('#sound').getAttribute('aria-pressed'), 'true');
      await press(page, '#sound');
      if (game === 'labyrinth' || game === 'snake') {
        assert(await page.locator('canvas').evaluate(canvas => Math.abs(canvas.width - canvas.getBoundingClientRect().width * devicePixelRatio) < 2));
      }
    }
  }
  console.log(`${label}: responsive layouts and shared controls passed`);
  await page.setViewportSize({width:1000,height:900});

  // Solve a generated maze through the same keyboard handler a player uses.
  await visit(page, 'labyrinth');
  await page.evaluate(() => {
    const generate = MazeLogic.generate;
    MazeLogic.generate = (...args) => { window.testMaze = generate(...args); return window.testMaze; };
  });
  await press(page, '#restart');
  const solution = await page.evaluate(() => {
    const maze = window.testMaze, queue = [[0, []]], visited = new Set([0]);
    const names = ['up', 'right', 'down', 'left'], offsets = [-maze.size, 1, maze.size, -1];
    while (queue.length) {
      const [index, route] = queue.shift();
      if (index === maze.size * maze.size - 1) return route;
      maze.cells[index].forEach((wall, d) => {
        const next = index + offsets[d];
        if (!wall && !visited.has(next)) { visited.add(next); queue.push([next, [...route, names[d]]]); }
      });
    }
  });
  await page.locator('#board').focus();
  await page.keyboard.press('ArrowUp');
  assert.equal(await page.locator('#moves').textContent(), '0');
  const keyFor = direction => 'Arrow' + direction[0].toUpperCase() + direction.slice(1);
  await page.keyboard.press(keyFor(solution[0]));
  await page.clock.runFor(1100);
  await press(page, '#pause');
  const time = await page.locator('#time').textContent();
  await page.clock.runFor(3000);
  assert.equal(await page.locator('#time').textContent(), time);
  await press(page, '#overlay-action');
  await page.locator('#board').focus();
  for (const direction of solution.slice(1)) await page.keyboard.press(keyFor(direction));
  assert.equal(await page.locator('#overlay-title').textContent(), 'Maze complete');
  assert.equal(Number(await page.locator('#moves').textContent()), solution.length);
  await press(page, '#overlay-action');
  assert.equal(await page.locator('#moves').textContent(), '0');
  console.log(`${label}: Labyrinth solved, paused, and restarted`);

  await visit(page, 'snake');
  await press(page, '[data-difficulty="normal"]');
  await page.evaluate(() => {
    const create = SnakeLogic.create;
    SnakeLogic.create = (...args) => {
      const state = create(...args);
      state.food = {x: state.body[0].x + 1, y: state.body[0].y};
      return state;
    };
  });
  await press(page, '#restart');
  assert.equal(await page.locator('#overlay').isVisible(), false);
  await page.clock.runFor(155);
  assert.equal(await page.locator('#score').textContent(), '1');
  await page.keyboard.press('Escape');
  await page.clock.runFor(5000);
  assert.equal(await page.locator('#overlay-title').textContent(), 'Paused');
  await press(page, '#overlay-action');
  await page.clock.runFor(2200);
  assert.equal(await page.locator('#overlay-title').textContent(), 'Game over');
  const snakeScore = await page.locator('#score').textContent();
  assert(Number(snakeScore) >= 1);
  assert.equal(await page.locator('#best').textContent(), snakeScore);
  await press(page, '#overlay-action');
  assert.equal(await page.locator('#overlay').isVisible(), false);
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  assert.equal(await page.locator('#pause').textContent(), 'Resume');
  await page.reload();
  assert.equal(await page.locator('#best').textContent(), snakeScore);
  console.log(`${label}: Snake scoring, loss, replay, focus pause, and persistence passed`);

  await visit(page, 'memory');
  await press(page, '[data-difficulty="normal"]');
  const shapes = await page.locator('.card-front svg').evaluateAll(nodes => nodes.map(node => node.innerHTML));
  const different = shapes.findIndex(shape => shape !== shapes[0]);
  const third = shapes.findIndex((_, index) => index !== 0 && index !== different);
  await press(page, '.memory-card:nth-child(1)');
  await press(page, `.memory-card:nth-child(${different + 1})`);
  await press(page, `.memory-card:nth-child(${third + 1})`);
  assert.equal(await page.locator('.revealed').count(), 2);
  assert.equal(await page.locator('#moves').textContent(), '1');
  await press(page, '#pause');
  await page.clock.runFor(2000);
  assert.equal(await page.locator('.revealed').count(), 2);
  await press(page, '#overlay-action');
  await page.clock.runFor(900);
  assert.equal(await page.locator('.revealed').count(), 0);
  await press(page, '#restart');
  await page.locator('.memory-card').first().focus();
  await page.keyboard.press('ArrowRight');
  assert.equal(await page.locator('.memory-card:nth-child(2)').evaluate(el => el === document.activeElement), true);
  await page.keyboard.press('Space');
  assert.equal(await page.locator('.revealed').count(), 1);
  await press(page, '[data-difficulty="easy"]');
  assert.equal(await page.locator('.memory-card').count(), 4);
  await page.clock.runFor(1200);
  assert.equal(await page.locator('.revealed').count(), 0);
  const pairs = await page.locator('.card-front svg').evaluateAll(nodes => {
    const groups = {};
    nodes.forEach((node,index) => (groups[node.innerHTML] ||= []).push(index));
    return Object.values(groups);
  });
  for (const pair of pairs) for (const index of pair) await press(page, `.memory-card:nth-child(${index + 1})`);
  assert.equal(await page.locator('#overlay-title').textContent(), 'All pairs found');
  assert.equal(await page.locator('#pairs').textContent(), '2 / 2');
  await press(page, '#overlay-action');
  assert.equal(await page.locator('.matched').count(), 0);
  console.log(`${label}: Memory rapid input, mismatch pause, keyboard, completion, and reset passed`);

  await visit(page, 'whac-a-mole');
  await press(page, '#overlay-action');
  const hole = await page.locator('.hole.up').evaluate(el => [...el.parentElement.children].indexOf(el));
  if (touch) await page.locator('.hole.up').tap();
  else await press(page, '.hole.up');
  await press(page, `.hole:nth-child(${hole + 1})`);
  assert.equal(await page.locator('#score').textContent(), '1');
  await page.clock.runFor(350);
  const next = await page.locator('.hole.up').evaluate(el => [...el.parentElement.children].indexOf(el));
  assert.notEqual(next, hole);
  await page.keyboard.press(String(next + 1));
  assert.equal(await page.locator('#score').textContent(), '2');
  await page.clock.runFor(400);
  await press(page, '#pause');
  const left = await page.locator('#time').textContent();
  await page.clock.runFor(5000);
  assert.equal(await page.locator('#time').textContent(), left);
  await press(page, '#overlay-action');
  await page.clock.runFor(30000);
  assert.equal(await page.locator('#time').textContent(), '0:00');
  assert.equal(await page.locator('#overlay-title').textContent(), 'Round complete');
  await press(page, '#overlay-action');
  assert.equal(await page.locator('#score').textContent(), '0');
  assert.equal(await page.locator('#overlay').isVisible(), false);
  await press(page, '#restart');
  assert.equal(await page.locator('#overlay').isVisible(), false);
  console.log(`${label}: Mole touch/click, double-hit protection, keyboard, timer, and replay passed`);

  // No web server is required. All pages also load through file://.
  for (const game of games) {
    await page.goto(pathToFileURL(path.resolve(__dirname, '..', game, 'index.html')).href);
    assert.equal(await page.locator('#board').count(), 1);
    await press(page, '[data-difficulty="easy"]');
    if (game === 'memory') {
      await press(page, '.memory-card:first-child');
      assert.equal(await page.locator('.revealed').count(), 1);
    } else if (game !== 'labyrinth') {
      if (await page.locator('#overlay').isVisible()) await press(page, '#overlay-action');
      assert.equal(await page.locator('#overlay').isVisible(), false);
    }
  }
  console.log(`${label}: direct file playback passed`);
  // Large Memory deck keeps every card comfortably tappable on a small phone.
  await page.setViewportSize({width:320,height:568});
  await visit(page, 'memory');
  await press(page, '[data-difficulty="hard"]');
  assert.equal(await page.locator('.memory-card').count(), 20);
  const cardBox = await page.locator('.memory-card').first().boundingBox();
  assert(cardBox.width >= 44 && cardBox.height >= 44, `Small-phone card too small: ${JSON.stringify(cardBox)}`);
  console.log(`${label}: hard Memory touch targets passed`);
  await context.close();
}

(async () => {
  const chrome = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? {executablePath:process.env.CHROME_PATH} : {}) });
  try { await run(chrome, 'Chromium', true); } finally { await chrome.close(); }
  if (!process.env.SKIP_FIREFOX) {
    const fox = await firefox.launch({ headless:true });
    try { await run(fox, 'Firefox'); } finally { await fox.close(); }
  }
  assert.deepEqual(errors, [], 'Browser console errors');
  console.log('All browser checks passed; no console errors.');
})().catch(error => { console.error(error); process.exitCode = 1; });
