(() => {
  const canvas = document.getElementById('board');
  const scoreLabel = document.getElementById('score');
  const bestLabel = document.getElementById('best');
  const L = FlapLogic, STEP = 1 / 240;
  let state, running = false, paused = false, accumulator = 0, lastFrame = 0, frame = 0, best = 0, now = 0;
  const ui = OG.createUI({ restart, togglePause });
  const view = OG.canvasView(canvas, draw);
  function bestKey() { return 'flap:best:' + ui.difficulty; }
  function restart(playImmediately = false) {
    cancelAnimationFrame(frame); frame = 0;
    state = L.create(ui.difficulty);
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
  // Play shows the bird hovering; the first flap starts the posts moving.
  function start() {
    running = true; paused = false;
    ui.hideOverlay(); ui.setPaused(false);
    canvas.focus({ preventScroll: true });
    wake();
  }
  function flap() {
    if (!running || paused || state.over) return;
    if (L.flap(state)) OGAudio.play('move');
  }
  function action() {
    if (state.over) { restart(); start(); }
    else if (paused) togglePause();
    else if (!running) start();
    else flap();
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
    OGAudio.play('failure');
    ui.showOverlay('Game over', `${state.score} ${state.score === 1 ? 'post' : 'posts'} passed · Best ${best}`, 'Play again', () => { restart(); start(); });
    view.draw();
  }
  function draw(ctx, size) {
    if (!state) return;
    const u = size, still = OG.reducedMotion.matches, groundY = L.ground * u;
    ctx.clearRect(0, 0, u, u);
    ctx.fillStyle = '#eaf1f2'; ctx.fillRect(0, 0, u, u);
    // Soft clouds and hills drift slower than the posts.
    const drift = still ? 0 : state.distance;
    ctx.fillStyle = '#f8fbf9';
    for (let i = 0; i < 3; i++) {
      const x = ((i * .43 + .12 - drift * .15) % 1.3 + 1.3) % 1.3 - .15, y = .14 + (i % 2) * .12;
      ctx.beginPath(); ctx.roundRect(x * u, y * u, .2 * u, .055 * u, .0275 * u); ctx.fill();
    }
    ctx.fillStyle = '#d5e2d6';
    for (let i = 0; i < 4; i++) {
      const x = ((i * .4 - drift * .35) % 1.6 + 1.6) % 1.6 - .3;
      ctx.beginPath(); ctx.arc((x + .2) * u, groundY + .02 * u, .2 * u, Math.PI, 0); ctx.fill();
    }
    for (const post of state.posts) {
      const x = post.x * u, w = L.postWidth * u, top = (post.y - state.gap / 2) * u, bottom = (post.y + state.gap / 2) * u;
      const cap = .035 * u, lip = .012 * u;
      ctx.fillStyle = '#6f8f72';
      ctx.fillRect(x + lip, 0, w - lip * 2, top - cap);
      ctx.fillRect(x + lip, bottom + cap, w - lip * 2, groundY - bottom - cap);
      ctx.fillStyle = '#86a587';
      ctx.fillRect(x + lip + w * .14, 0, w * .12, top - cap);
      ctx.fillRect(x + lip + w * .14, bottom + cap, w * .12, groundY - bottom - cap);
      ctx.fillStyle = '#4c6b52';
      ctx.beginPath(); ctx.roundRect(x, top - cap, w, cap, [0, 0, 5, 5]); ctx.fill();
      ctx.beginPath(); ctx.roundRect(x, bottom, w, cap, [5, 5, 0, 0]); ctx.fill();
    }
    ctx.fillStyle = '#cdb88f'; ctx.fillRect(0, groundY, u, u - groundY);
    ctx.fillStyle = '#9f8a63'; ctx.fillRect(0, groundY, u, .012 * u);
    ctx.strokeStyle = '#bfa784'; ctx.lineWidth = .018 * u;
    ctx.beginPath();
    const stripe = .07, offset = (state.distance % stripe) / stripe;
    for (let i = -1; i < 1 / stripe + 2; i++) {
      const x = (i - offset) * stripe * u;
      ctx.moveTo(x, groundY + .03 * u); ctx.lineTo(x - .04 * u, u);
    }
    ctx.stroke();
    drawBird(ctx, u, still);
  }
  function drawBird(ctx, u, still) {
    const bird = state.bird;
    const hover = state.started || still ? 0 : Math.sin(now / 260) * .008;
    const r = L.radius * u, tilt = state.started ? Math.max(-.45, Math.min(1.1, bird.vy * 1.4)) : 0;
    ctx.save();
    ctx.translate(L.birdX * u, (bird.y + hover) * u);
    ctx.rotate(tilt);
    ctx.fillStyle = '#d9a441';
    ctx.beginPath(); ctx.moveTo(r * .8, -r * .3); ctx.lineTo(r * 1.55, r * .05); ctx.lineTo(r * .8, r * .4); ctx.fill();
    ctx.fillStyle = '#bd411c'; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ecaa7f'; ctx.beginPath(); ctx.ellipse(r * .1, r * .45, r * .55, r * .35, 0, 0, Math.PI * 2); ctx.fill();
    // The wing beats while rising and rests while falling.
    const beat = still || state.over ? 0 : bird.vy < 0 || !state.started ? Math.sin(now / 45) : .4;
    ctx.fillStyle = '#8f2f14';
    ctx.beginPath(); ctx.ellipse(-r * .3, r * .05, r * .52, r * (.2 + Math.abs(beat) * .18), -beat * .5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fffde8'; ctx.beginPath(); ctx.arc(r * .38, -r * .32, r * .3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#252921'; ctx.beginPath(); ctx.arc(r * .48, -r * .32, r * .13, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  function tick(timestamp) {
    frame = 0;
    if (!running || paused || document.hidden) return;
    now = timestamp;
    accumulator += Math.min(timestamp - lastFrame, 250) / 1000; lastFrame = timestamp;
    while (accumulator >= STEP && !state.over) {
      accumulator -= STEP;
      const result = L.step(state, STEP);
      if (result === 'score') {
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
  canvas.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    event.preventDefault();
    canvas.focus({ preventScroll: true });
    flap();
  });
  OGInput.bind({ surface: canvas, direction: name => { if (name === 'up') flap(); }, action, pause: togglePause, restart: () => { restart(); start(); }, swipe: false });
  restart();
})();
