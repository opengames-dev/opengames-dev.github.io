(() => {
  const canvas = document.getElementById('board');
  const scoreLabel = document.getElementById('score');
  const bestLabel = document.getElementById('best');
  let state, running = false, paused = false, accumulator = 0, lastFrame = 0, frame = 0, best = 0, now = 0;
  const ui = OG.createUI({ restart, togglePause });
  const view = OG.canvasView(canvas, draw);
  function bestKey() { return 'snake:best:' + ui.difficulty; }
  function restart(playImmediately = false) {
    cancelAnimationFrame(frame); frame = 0;
    state = SnakeLogic.create(20);
    running = paused = false;
    accumulator = 0;
    best = Number(OG.storage.get(bestKey(), 0)) || 0;
    bestLabel.textContent = String(best);
    scoreLabel.textContent = '0';
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
  function move(direction) {
    if (state.over || paused) return;
    SnakeLogic.turn(state, direction);
    if (!running) start();
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
    OGAudio.play(state.won ? 'success' : 'failure');
    ui.showOverlay(state.won ? 'Board complete' : 'Game over', `${state.score} ${state.score === 1 ? 'fruit' : 'fruits'} collected · Best ${best}`, 'Play again', () => { restart(); start(); });
    view.draw();
  }
  function draw(ctx, size) {
    if (!state) return;
    const cell = size / state.size;
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = '#f4f7ed'; ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = '#e5ebdd'; ctx.lineWidth = .6;
    ctx.beginPath();
    for (let i = 0; i <= state.size; i++) { ctx.moveTo(i * cell, 0); ctx.lineTo(i * cell, size); ctx.moveTo(0, i * cell); ctx.lineTo(size, i * cell); } ctx.stroke();
    if (state.food) {
      const x = (state.food.x + .5) * cell, y = (state.food.y + .5) * cell;
      const pulse = OG.reducedMotion.matches ? 1 : 1 + Math.sin(now / 240) * .06;
      ctx.fillStyle = '#bc4021'; ctx.beginPath(); ctx.arc(x, y, cell * .34 * pulse, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#526c36'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y - cell * .25); ctx.lineTo(x + cell * .12, y - cell * .48); ctx.stroke();
    }
    state.body.forEach((p, i) => {
      ctx.fillStyle = i === 0 ? '#294d35' : '#61864d';
      ctx.beginPath(); ctx.roundRect(p.x * cell + 1, p.y * cell + 1, cell - 2, cell - 2, cell * .23); ctx.fill();
    });
    const head = state.body[0], d = SnakeLogic.vectors[state.direction];
    for (const side of [-1, 1]) {
      const x = (head.x + .5 + d.x * .2 + d.y * side * .18) * cell;
      const y = (head.y + .5 + d.y * .2 + d.x * side * .18) * cell;
      ctx.fillStyle = '#fffde8'; ctx.beginPath(); ctx.arc(x, y, cell * .09, 0, Math.PI * 2); ctx.fill();
    }
  }
  function tick(timestamp) {
    frame = 0;
    if (!running || paused || document.hidden) return;
    now = timestamp;
    accumulator += Math.min(timestamp - lastFrame, 250); lastFrame = timestamp;
    const interval = Math.max(65, { easy: 185, normal: 140, hard: 105 }[ui.difficulty] - state.score * 2);
    while (accumulator >= interval && !state.over) {
      accumulator -= interval;
      const result = SnakeLogic.step(state);
      if (result === 'eat' || result === 'won') {
        scoreLabel.textContent = String(state.score);
        if (state.score > best) { best = state.score; OG.storage.set(bestKey(), best); bestLabel.textContent = String(best); }
        OGAudio.play('eat');
      }
      if (state.over) { end(); return; }
    }
    view.draw();
    frame = requestAnimationFrame(tick);
  }
  function wake() { if (!frame) { lastFrame = performance.now(); frame = requestAnimationFrame(tick); } }
  document.addEventListener('visibilitychange', () => { if (document.hidden && running && !paused) togglePause(); });
  window.addEventListener('blur', () => { if (running && !paused) togglePause(); });
  OGInput.bind({ surface: canvas, direction: move, action: () => { if (state.over) { restart(); start(); } else if (paused) togglePause(); else if (!running) start(); }, pause: togglePause, restart: () => { restart(); start(); } });
  restart();
})();
