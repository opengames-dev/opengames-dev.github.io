(() => {
  const canvas = document.getElementById('board');
  const nextCanvas = document.getElementById('next');
  const scoreLabel = document.getElementById('score');
  const linesLabel = document.getElementById('lines');
  const B = BlocksLogic;
  // Face, lower lip, and shine for each shape, from the collection's palette.
  const colors = {
    I: ['#4f8a8b', '#3a6b6c', '#9cc6c2'], O: ['#d9a441', '#b07f27', '#f3d590'],
    T: ['#785783', '#5a3f64', '#b79cc0'], S: ['#61864d', '#476a37', '#a3c28d'],
    Z: ['#bd411c', '#93300f', '#eb9a7c'], J: ['#3f6377', '#2c4a5a', '#8fb0c1'],
    L: ['#92542b', '#6f3d1b', '#d39b6d']
  };
  let state, running = false, paused = false, lastFrame = 0, frame = 0, best = 0, flash = null;
  const ui = OG.createUI({ restart, togglePause });
  const view = OG.canvasView(canvas, draw);
  function bestKey() { return 'blocks:best:' + ui.difficulty; }
  function restart(playImmediately = false) {
    cancelAnimationFrame(frame); frame = 0;
    state = B.create(ui.difficulty);
    running = paused = false; flash = null;
    best = Number(OG.storage.get(bestKey(), 0)) || 0;
    updateStats();
    ui.setPaused(false);
    ui.showOverlay('Ready', '', 'Play', start, false);
    view.draw();
    if (playImmediately) start();
  }
  function start() {
    running = true; paused = false;
    ui.hideOverlay(); ui.setPaused(false);
    canvas.focus({ preventScroll: true });
    wake();
  }
  function playing() { return running && !paused && !state.over; }
  function updateStats() {
    scoreLabel.textContent = String(state.score);
    linesLabel.textContent = String(state.lines);
    drawNext();
  }
  // Every player action redraws at once rather than waiting for the next frame.
  function act(change) {
    if (!running && !state.over && !paused) { start(); return; }
    if (!playing()) return;
    const result = change();
    if (result === true) view.draw();
    else if (typeof result === 'string') settle(result);
  }
  function direction(name, repeat) {
    act(() => {
      if (name === 'left') return B.shift(state, -1);
      if (name === 'right') return B.shift(state, 1);
      if (name === 'down') { const moved = B.softDrop(state); if (moved) scoreLabel.textContent = String(state.score); return moved; }
      if (name === 'up' && !repeat) return B.rotate(state, 1);
      return false;
    });
  }
  function drop() { act(() => B.hardDrop(state)); }
  function action() {
    if (state.over) { restart(); start(); }
    else if (paused) togglePause();
    else if (!running) start();
    else drop();
  }
  function settle(result) {
    if (result === 'clear') {
      const lines = state.cleared.length;
      flash = { rows: state.cleared.slice(), at: performance.now() };
      OGAudio.play(lines === 4 ? 'success' : 'eat');
      ui.announce(`${lines} ${lines === 1 ? 'line' : 'lines'} cleared · Level ${state.level}`);
    } else if (result === 'lock' || result === 'over') OGAudio.play('move');
    updateStats();
    if (state.score > best) { best = state.score; OG.storage.set(bestKey(), best); }
    view.draw();
    if (state.over) end();
  }
  function togglePause() {
    if (!running || state.over) return;
    paused = !paused;
    if (paused) { cancelAnimationFrame(frame); frame = 0; } ui.setPaused(paused);
    if (paused) ui.showOverlay('Paused', '', 'Resume', togglePause);
    else { ui.hideOverlay(); wake(); }
  }
  function end() {
    running = false;
    cancelAnimationFrame(frame); frame = 0;
    OGAudio.play('failure');
    ui.showOverlay('Game over', `${state.lines} ${state.lines === 1 ? 'line' : 'lines'} · Score ${state.score} · Best ${best}`, 'Play again', () => { restart(); start(); });
  }
  // A tile with a darker lower lip and a small shine, so stacked cells stay distinct.
  function cell(ctx, x, y, size, name) {
    const [face, lip, shine] = colors[name];
    const inset = Math.max(1, size * .05), side = size - inset * 2, radius = size * .2;
    ctx.fillStyle = lip;
    ctx.beginPath(); ctx.roundRect(x + inset, y + inset, side, side, radius); ctx.fill();
    ctx.fillStyle = face;
    ctx.beginPath(); ctx.roundRect(x + inset, y + inset, side, side - size * .12, radius); ctx.fill();
    ctx.fillStyle = shine;
    ctx.beginPath(); ctx.roundRect(x + size * .2, y + size * .18, size * .26, size * .11, size * .055); ctx.fill();
  }
  function draw(ctx, w) {
    if (!state) return;
    // Height follows the well's fixed 1:2 shape rather than any measured rounding.
    const size = w / B.width, h = size * B.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#f7f6f0'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#dcdbd0';
    const dot = Math.max(1, size * .05);
    for (let y = 1; y < B.height; y++) for (let x = 1; x < B.width; x++) ctx.fillRect(x * size - dot / 2, y * size - dot / 2, dot, dot);
    state.grid.forEach((row, y) => row.forEach((name, x) => { if (name) cell(ctx, x * size, y * size, size, name); }));
    if (flash && !OG.reducedMotion.matches) {
      const age = (performance.now() - flash.at) / 260;
      if (age < 1) {
        ctx.fillStyle = `rgba(255, 253, 232, ${(1 - age) * .85})`;
        // Briefly brighten where the cleared rows were.
        flash.rows.forEach(y => ctx.fillRect(0, y * size, w, size));
      } else flash = null;
    }
    if (!state.piece) return;
    const [face] = colors[state.piece.name];
    ctx.fillStyle = face; ctx.strokeStyle = face; ctx.lineWidth = Math.max(1.5, size * .06);
    for (const [x, y] of B.cellsOf(B.ghost(state))) {
      ctx.beginPath(); ctx.roundRect(x * size + size * .12, y * size + size * .12, size * .76, size * .76, size * .16);
      ctx.globalAlpha = .12; ctx.fill(); ctx.globalAlpha = .5; ctx.stroke();
    }
    ctx.globalAlpha = 1;
    for (const [x, y] of B.cellsOf(state.piece)) if (y >= 0) cell(ctx, x * size, y * size, size, state.piece.name);
  }
  function drawNext() {
    const ratio = window.devicePixelRatio || 1, w = 48, h = 24;
    if (nextCanvas.width !== w * ratio) { nextCanvas.width = w * ratio; nextCanvas.height = h * ratio; }
    const ctx = nextCanvas.getContext('2d');
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const name = state.queue[0];
    nextCanvas.setAttribute('aria-label', 'Next piece: ' + name);
    const cells = B.cellsOf({ name, r: 0, x: 0, y: 0 });
    const xs = cells.map(c => c[0]), ys = cells.map(c => c[1]);
    const cols = Math.max(...xs) - Math.min(...xs) + 1, rows = Math.max(...ys) - Math.min(...ys) + 1;
    const size = 11, ox = (w - cols * size) / 2 - Math.min(...xs) * size, oy = (h - rows * size) / 2 - Math.min(...ys) * size;
    for (const [x, y] of cells) cell(ctx, ox + x * size, oy + y * size, size, name);
  }
  function tick(timestamp) {
    frame = 0;
    if (!playing() || document.hidden) return;
    const dt = Math.min(timestamp - lastFrame, 250); lastFrame = timestamp;
    const result = B.update(state, dt);
    if (result === 'lock' || result === 'clear' || result === 'over') settle(result);
    if (state.over) return;
    view.draw();
    frame = requestAnimationFrame(tick);
  }
  function wake() { if (!frame) { lastFrame = performance.now(); frame = requestAnimationFrame(tick); } }
  document.addEventListener('visibilitychange', () => { if (document.hidden && running && !paused) togglePause(); });
  window.addEventListener('blur', () => { if (running && !paused) togglePause(); });
  window.addEventListener('resize', drawNext);
  // Z and X rotate, following the same keyboard exclusions as the shared input.
  window.addEventListener('keydown', event => {
    if (event.repeat || event.altKey || event.ctrlKey || event.metaKey || event.target.closest('input, select, textarea, .game-settings')) return;
    const key = event.key.toLowerCase();
    if (key === 'x' || key === 'z') { event.preventDefault(); act(() => B.rotate(state, key === 'x' ? 1 : -1)); }
  });
  // A short tap on the board rotates; drags are handled as swipes by OGInput.
  let tap = null;
  canvas.addEventListener('pointerdown', event => { if (event.button === 0) tap = { x: event.clientX, y: event.clientY, at: performance.now(), moved: false }; });
  canvas.addEventListener('pointermove', event => { if (tap && Math.hypot(event.clientX - tap.x, event.clientY - tap.y) > 12) tap.moved = true; });
  canvas.addEventListener('pointerup', () => {
    if (tap && !tap.moved && performance.now() - tap.at < 350) act(() => B.rotate(state, 1));
    tap = null;
  });
  canvas.addEventListener('pointercancel', () => { tap = null; });
  const dropButton = document.getElementById('drop');
  dropButton.addEventListener('pointerdown', event => { if (event.button === 0) { event.preventDefault(); drop(); } });
  dropButton.addEventListener('click', event => { if (event.detail === 0) drop(); });
  OGInput.bind({ surface: canvas, direction, action, pause: togglePause, restart: () => { restart(); start(); }, hold: true });
  restart();
})();
