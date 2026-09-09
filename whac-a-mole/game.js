(() => {
  const board = document.getElementById('board');
  const scoreLabel = document.getElementById('score');
  const timeLabel = document.getElementById('time');
  const bestLabel = document.getElementById('best');
  const moleSVG = '<svg class="mole" viewBox="0 0 100 100" aria-hidden="true"><circle cx="19" cy="32" r="13" fill="#815637"/><circle cx="81" cy="32" r="13" fill="#815637"/><path d="M12 100V52a38 38 0 0 1 76 0v48" fill="#a77950"/><ellipse cx="50" cy="72" rx="28" ry="22" fill="#d5b48b"/><ellipse cx="36" cy="48" rx="4" ry="6" fill="#29261f"/><ellipse cx="64" cy="48" rx="4" ry="6" fill="#29261f"/><ellipse cx="50" cy="64" rx="9" ry="6" fill="#67412f"/><path d="M43 76q7 8 14 0" fill="none" stroke="#67412f" stroke-width="3" stroke-linecap="round"/><path d="M46 78h8v7h-8z" fill="#fff5dc"/></svg>';
  let score = 0, best = 0, elapsed = 0, active = -1, previous = -1, expires = 0, nextSpawn = 0, hitUntil = 0;
  let running = false, paused = false, finished = false, selected = 4, frame = 0, lastFrame = 0;
  const ui = OG.createUI({ restart, togglePause });
  const holes = Array.from({ length: 9 }, (_, i) => {
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'hole'; button.tabIndex = i === selected ? 0 : -1;
    button.setAttribute('aria-label', `Hole ${i + 1}, empty`);
    button.setAttribute('aria-keyshortcuts', String(i + 1));
    button.innerHTML = `<span class="mole-clip">${moleSVG}</span><span class="hole-number" aria-hidden="true">${i + 1}</span>`;
    button.addEventListener('pointerdown', event => { if (event.button === 0) { event.preventDefault(); select(i, false); hit(i); } });
    button.addEventListener('click', event => { if (event.detail === 0) hit(i); });
    button.addEventListener('focus', () => select(i, false));
    board.append(button);
    return button;
  });
  function bestKey() { return 'whac-a-mole:best:' + ui.difficulty; }
  function clearHoles() {
    holes.forEach((hole, i) => { hole.classList.remove('up', 'hit'); hole.setAttribute('aria-label', `Hole ${i + 1}, empty`); });
  }
  function restart(playImmediately = false) {
    cancelAnimationFrame(frame); frame = 0;
    score = elapsed = expires = nextSpawn = hitUntil = 0;
    active = previous = -1;
    running = paused = finished = false;
    best = Number(OG.storage.get(bestKey(), 0)) || 0;
    scoreLabel.textContent = '0'; bestLabel.textContent = String(best); timeLabel.textContent = '0:30';
    clearHoles(); ui.setPaused(false);
    ui.showOverlay('Ready', '30 seconds', 'Play', start, false);
    if (playImmediately) start();
  }
  function start() {
    running = true; paused = false; ui.hideOverlay(); ui.setPaused(false);
    select(selected); spawn(); wake();
  }
  function select(index, focus = true) {
    selected = index;
    holes.forEach((hole, i) => { hole.tabIndex = i === selected ? 0 : -1; });
    if (focus) holes[selected].focus({ preventScroll: true });
  }
  function spawn() {
    clearHoles();
    // Choose uniformly among the other holes; never repeat the same hole in succession.
    const choices = holes.map((_, i) => i).filter(i => i !== previous);
    active = choices[Math.floor(Math.random() * choices.length)]; previous = active;
    const lifetime = { easy: 1450, normal: 1150, hard: 900 }[ui.difficulty] - (elapsed / 30000) * 260;
    expires = elapsed + lifetime;
    holes[active].classList.add('up'); holes[active].setAttribute('aria-label', `Hole ${active + 1}, mole!`);
  }
  function hit(index) {
    if (!running || paused || index !== active || elapsed >= expires) return;
    active = -1;
    scoreLabel.textContent = String(++score);
    if (score > best) { best = score; OG.storage.set(bestKey(), best); bestLabel.textContent = String(best); }
    holes[index].classList.add('hit'); holes[index].setAttribute('aria-label', `Hole ${index + 1}, caught`);
    hitUntil = elapsed + 180; nextSpawn = elapsed + 300;
    OGAudio.play('hit');
  }
  function togglePause() {
    if (!running || finished) return;
    paused = !paused;
    if (paused) { cancelAnimationFrame(frame); frame = 0; } ui.setPaused(paused);
    if (paused) ui.showOverlay('Paused', '', 'Resume', togglePause);
    else { ui.hideOverlay(); wake(); }
  }
  function finish() {
    running = false; finished = true; active = -1; clearHoles();
    OGAudio.play('success');
    ui.showOverlay('Round complete', `${score} moles caught · Best ${best}`, 'Another round', () => { restart(); start(); });
  }
  function tick(now) {
    frame = 0;
    if (!running || paused || document.hidden) return;
    elapsed += now - lastFrame; lastFrame = now;
    timeLabel.textContent = OG.formatTime(Math.ceil(Math.max(0, 30000 - elapsed) / 1000));
    if (elapsed >= 30000) { finish(); return; }
    if (hitUntil && elapsed >= hitUntil) { clearHoles(); hitUntil = 0; }
    if (active >= 0 && elapsed >= expires) { active = -1; clearHoles(); nextSpawn = elapsed + 220; }
    if (active === -1 && elapsed >= nextSpawn) spawn();
    frame = requestAnimationFrame(tick);
  }
  function wake() { if (!frame) { lastFrame = performance.now(); frame = requestAnimationFrame(tick); } }
  board.addEventListener('keydown', event => {
    const offsets = { ArrowUp: -3, ArrowDown: 3, ArrowLeft: -1, ArrowRight: 1 };
    if (event.key in offsets) { event.preventDefault(); select((selected + offsets[event.key] + 9) % 9); }
  });
  window.addEventListener('keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.repeat || event.target.closest('input, select, textarea')) return;
    if (/^[1-9]$/.test(event.key)) { event.preventDefault(); const i = Number(event.key) - 1; select(i, false); hit(i); }
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden && running && !paused) togglePause(); });
  window.addEventListener('blur', () => { if (running && !paused) togglePause(); });
  OGInput.bind({ surface: board, action: () => { if (finished) { restart(); start(); } else if (!running) start(); else if (paused) togglePause(); else hit(selected); }, pause: togglePause, restart: () => { restart(); start(); }, swipe: false });
  restart();
})();
