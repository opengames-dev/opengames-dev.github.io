(() => {
  const canvas = document.getElementById('board');
  const scoreLabel = document.getElementById('score');
  const bestLabel = document.getElementById('best');
  const fixedStep = 1 / 120;
  let state, running = false, paused = false, accumulator = 0, lastFrame = 0, frame = 0, best = 0, landingFeedback = null;
  const ui = OG.createUI({ restart, togglePause });
  const view = OG.canvasView(canvas, draw);

  function bestKey() { return 'dune:best:' + ui.difficulty; }

  function restart(playImmediately = false) {
    cancelAnimationFrame(frame);
    frame = 0;
    state = DuneLogic.create(ui.difficulty);
    running = paused = false;
    accumulator = 0;
    landingFeedback = null;
    const savedBest = Number(OG.storage.get(bestKey(), 0));
    best = Number.isFinite(savedBest) && savedBest >= 0 ? Math.floor(savedBest) : 0;
    scoreLabel.textContent = '0';
    bestLabel.textContent = String(best);
    canvas.classList.remove('is-diving');
    ui.setPaused(false);
    ui.showOverlay('Ready', 'Hold to dive. Release to fly. Land softly.', 'Play', start, false);
    view.draw();
    if (playImmediately) start();
  }

  function start() {
    if (state.over) return;
    running = true;
    paused = false;
    ui.hideOverlay();
    ui.setPaused(false);
    canvas.focus({ preventScroll: true });
    wake();
  }

  function setDiving(diving) {
    if (!running || paused || state.over) return;
    DuneLogic.setHeld(state, diving);
    canvas.classList.toggle('is-diving', diving);
  }

  function togglePause() {
    if (!running || state.over) return;
    paused = !paused;
    setDiving(false);
    if (paused) {
      DuneLogic.setHeld(state, false);
      canvas.classList.remove('is-diving');
      cancelAnimationFrame(frame);
      frame = 0;
    }
    ui.setPaused(paused);
    if (paused) ui.showOverlay('Paused', '', 'Resume', togglePause);
    else { ui.hideOverlay(); wake(); }
  }

  function finish() {
    running = false;
    canvas.classList.remove('is-diving');
    if (state.score > best) {
      best = state.score;
      OG.storage.set(bestKey(), best);
      bestLabel.textContent = String(best);
    }
    OGAudio.play('failure');
    ui.showOverlay('Hard landing', `${state.score} points · Best ${best}`, 'Play again', () => { restart(); start(); });
    view.draw();
  }

  function updateScore() {
    scoreLabel.textContent = String(state.score);
    if (state.score > best) {
      best = state.score;
      OG.storage.set(bestKey(), best);
      bestLabel.textContent = String(best);
    }
    OGAudio.play(state.lastLanding >= 3 ? 'success' : 'hit');
    landingFeedback = { points: state.lastLanding, until: performance.now() + 700 };
    ui.announce(`${state.lastLanding}-point landing. Score ${state.score}.`);
  }

  function tick(timestamp) {
    frame = 0;
    if (!running || paused || document.hidden) return;
    accumulator += Math.min((timestamp - lastFrame) / 1000, 0.2);
    lastFrame = timestamp;
    while (accumulator >= fixedStep && !state.over) {
      accumulator -= fixedStep;
      const result = DuneLogic.step(state, fixedStep);
      if (result === 'launch') OGAudio.play('move');
      else if (result === 'land') updateScore();
      else if (result === 'crash') { finish(); return; }
    }
    view.draw();
    frame = requestAnimationFrame(tick);
  }

  function wake() {
    if (!frame) {
      lastFrame = performance.now();
      frame = requestAnimationFrame(tick);
    }
  }

  function terrainPath(ctx, size, camera, offset = 0) {
    ctx.beginPath();
    ctx.moveTo(0, size);
    for (let px = 0; px <= size + 4; px += 4) {
      const worldX = camera + px / size;
      ctx.lineTo(px, (DuneLogic.terrainHeight(worldX) + offset) * size);
    }
    ctx.lineTo(size, size);
    ctx.closePath();
  }

  function draw(ctx, size) {
    if (!state) return;
    const camera = state.x - 0.28;
    ctx.clearRect(0, 0, size, size);

    const sky = ctx.createLinearGradient(0, 0, 0, size);
    sky.addColorStop(0, '#e8eedb');
    sky.addColorStop(0.72, '#f7e6c7');
    sky.addColorStop(1, '#d8a263');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, size, size);

    ctx.fillStyle = '#f6c96f';
    ctx.beginPath();
    ctx.arc(size * 0.79, size * 0.2, size * 0.075, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = '#aa8658';
    ctx.beginPath();
    ctx.moveTo(0, size * 0.62);
    for (let px = 0; px <= size + 6; px += 6) {
      const x = camera * 0.28 + px / size;
      const y = 0.6 + 0.055 * Math.sin(x * 4.1) + 0.022 * Math.sin(x * 9.3 + 1);
      ctx.lineTo(px, y * size);
    }
    ctx.lineTo(size, size);
    ctx.lineTo(0, size);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    terrainPath(ctx, size, camera);
    const sand = ctx.createLinearGradient(0, size * 0.48, 0, size);
    sand.addColorStop(0, '#d7a15e');
    sand.addColorStop(1, '#b8783d');
    ctx.fillStyle = sand;
    ctx.fill();
    ctx.strokeStyle = '#76502d';
    ctx.lineWidth = Math.max(2, size * 0.007);
    ctx.lineJoin = 'round';
    ctx.stroke();

    const clearance = DuneLogic.terrainHeight(state.x) - DuneLogic.radius - state.y;
    if (clearance > 0.035) {
      ctx.save();
      ctx.globalAlpha = Math.min(0.22, clearance * 0.7);
      ctx.fillStyle = '#473827';
      ctx.beginPath();
      ctx.ellipse(size * 0.28, DuneLogic.terrainHeight(state.x) * size, size * 0.038, size * 0.012, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    const bx = size * 0.28;
    const by = state.y * size;
    const radius = DuneLogic.radius * size;
    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(state.x / DuneLogic.radius);
    ctx.fillStyle = state.over ? '#8e4936' : '#bd411c';
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#7c2f1c';
    ctx.lineWidth = Math.max(1.5, size * 0.004);
    ctx.stroke();
    ctx.strokeStyle = '#f6d0a4';
    ctx.lineWidth = Math.max(2, radius * 0.22);
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.56, -1.15, 1.15);
    ctx.stroke();
    ctx.restore();

    if (landingFeedback && performance.now() < landingFeedback.until) {
      const remaining = (landingFeedback.until - performance.now()) / 700;
      ctx.save();
      ctx.globalAlpha = OG.reducedMotion.matches ? 1 : Math.min(1, remaining * 2.5);
      ctx.fillStyle = '#71331f';
      ctx.font = `700 ${Math.max(15, size * 0.038)}px Trebuchet MS, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(`+${landingFeedback.points}`, bx + radius * 2.2, by - radius * 1.8);
      ctx.restore();
    }

    if (state.held) {
      const arrowTop = by - radius * 4.15;
      const arrowNeck = by - radius * 2.25;
      const arrowTip = by - radius * 1.05;
      ctx.save();
      ctx.strokeStyle = '#8f321b';
      ctx.fillStyle = '#8f321b';
      ctx.lineWidth = Math.max(3, size * 0.006);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(bx, arrowTop);
      ctx.lineTo(bx, arrowNeck);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(bx - radius * 0.72, arrowNeck);
      ctx.lineTo(bx + radius * 0.72, arrowNeck);
      ctx.lineTo(bx, arrowTip);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  canvas.addEventListener('pointerdown', event => {
    if (event.button !== 0 || !running || paused || state.over) return;
    event.preventDefault();
    canvas.focus({ preventScroll: true });
    canvas.setPointerCapture(event.pointerId);
    setDiving(true);
  });
  canvas.addEventListener('pointerup', event => {
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    setDiving(false);
  });
  canvas.addEventListener('pointercancel', () => setDiving(false));
  canvas.addEventListener('lostpointercapture', () => setDiving(false));

  window.addEventListener('keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.repeat || event.target.closest('button, summary, a, input, select, textarea, .game-settings')) return;
    if (event.key !== ' ' && event.key !== 'Enter') return;
    event.preventDefault();
    if (state.over) { restart(); start(); }
    else if (paused) togglePause();
    else if (!running) start();
    setDiving(true);
  });
  window.addEventListener('keyup', event => {
    if (event.key === ' ' || event.key === 'Enter') setDiving(false);
  });
  window.addEventListener('blur', () => { if (running && !paused) togglePause(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && running && !paused) togglePause(); });
  OGInput.bind({ surface: canvas, pause: togglePause, restart: () => { restart(); start(); }, swipe: false });
  restart();
})();
