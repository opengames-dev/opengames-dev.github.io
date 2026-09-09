(() => {
  const canvas = document.getElementById('board');
  const movesLabel = document.getElementById('moves');
  const timeLabel = document.getElementById('time');
  let maze, player, trail, moves, elapsed, started, paused, won;
  let displayed = { x: 0, y: 0 }, lastFrame = 0, frame = 0;
  const ui = OG.createUI({ restart, togglePause });
  const view = OG.canvasView(canvas, draw);
  function restart() {
    cancelAnimationFrame(frame); frame = 0;
    maze = MazeLogic.generate({ easy: 7, normal: 11, hard: 17 }[ui.difficulty]);
    player = { x: 0, y: 0 };
    displayed = { ...player };
    trail = new Set([0]);
    moves = elapsed = 0;
    started = paused = won = false;
    movesLabel.textContent = '0';
    timeLabel.textContent = '0:00';
    ui.hideOverlay();
    ui.setPaused(false);
    ui.announce('New maze. Start at the circle and find the flag.');
    view.draw();
    wake();
  }
  function move(direction) {
    if (paused || won) return;
    const next = MazeLogic.move(maze, player, direction);
    if (next === player) return;
    started = true;
    player = next;
    trail.add(player.y * maze.size + player.x);
    movesLabel.textContent = String(++moves);
    OGAudio.play('move');
    if (player.x === maze.size - 1 && player.y === maze.size - 1) {
      won = true;
      displayed = { ...player };
      OGAudio.play('success');
      ui.showOverlay('Maze complete', `${moves} moves · ${OG.formatTime(elapsed)}`, 'Another maze', restart);
    }
    view.draw();
    wake();
  }
  function togglePause() {
    if (won) return;
    paused = !paused;
    if (paused) { cancelAnimationFrame(frame); frame = 0; }
    ui.setPaused(paused);
    if (paused) ui.showOverlay('Paused', '', 'Resume', togglePause);
    else { ui.hideOverlay(); wake(); }
  }
  function draw(ctx, size) {
    if (!maze) return;
    const cell = size / maze.size;
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = '#f8faf3'; ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#dee8d5';
    for (const index of trail) {
      ctx.beginPath(); ctx.arc((index % maze.size + .5) * cell, (Math.floor(index / maze.size) + .5) * cell, cell * .09, 0, Math.PI * 2); ctx.fill();
    }
    // Starting ring and a flag distinguish the endpoints without relying on color.
    ctx.strokeStyle = '#91a387'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cell / 2, cell / 2, cell * .32, 0, Math.PI * 2); ctx.stroke();
    const exit = (maze.size - 1) * cell;
    ctx.fillStyle = '#e8d69c'; ctx.fillRect(exit + 2, exit + 2, cell - 4, cell - 4);
    ctx.strokeStyle = '#624c20'; ctx.lineWidth = Math.max(1.5, cell * .055);
    ctx.beginPath(); ctx.moveTo(exit + cell * .35, exit + cell * .76); ctx.lineTo(exit + cell * .35, exit + cell * .23); ctx.stroke();
    ctx.fillStyle = '#bd411c'; ctx.beginPath(); ctx.moveTo(exit + cell * .37, exit + cell * .23); ctx.lineTo(exit + cell * .78, exit + cell * .38); ctx.lineTo(exit + cell * .37, exit + cell * .52); ctx.fill();
    ctx.strokeStyle = '#53684c'; ctx.lineWidth = Math.max(2, cell * .065); ctx.lineCap = 'square';
    ctx.beginPath();
    maze.cells.forEach((walls, index) => {
      const x = (index % maze.size) * cell, y = Math.floor(index / maze.size) * cell;
      if (walls[0]) { ctx.moveTo(x, y); ctx.lineTo(x + cell, y); }
      if (walls[3]) { ctx.moveTo(x, y); ctx.lineTo(x, y + cell); }
    });
    ctx.moveTo(size, 0); ctx.lineTo(size, size); ctx.lineTo(0, size); ctx.stroke();
    ctx.fillStyle = '#bd411c'; ctx.beginPath(); ctx.arc((displayed.x + .5) * cell, (displayed.y + .5) * cell, cell * .24, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff8e7'; ctx.beginPath(); ctx.arc((displayed.x + .56) * cell, (displayed.y + .43) * cell, cell * .065, 0, Math.PI * 2); ctx.fill();
  }
  function tick(now) {
    frame = 0;
    const dt = Math.min((now - lastFrame) / 1000, .1); lastFrame = now;
    if (paused || won || document.hidden) return;
    if (started) { elapsed += dt; timeLabel.textContent = OG.formatTime(elapsed); }
    const ease = OG.reducedMotion.matches ? 1 : 1 - Math.exp(-dt * 26);
    displayed.x += (player.x - displayed.x) * ease;
    displayed.y += (player.y - displayed.y) * ease;
    view.draw();
    if (started) frame = requestAnimationFrame(tick);
  }
  function wake() { if (!frame) { lastFrame = performance.now(); frame = requestAnimationFrame(tick); } }
  document.addEventListener('visibilitychange', () => { if (document.hidden && !paused && !won) togglePause(); });
  window.addEventListener('blur', () => { if (started && !paused && !won) togglePause(); });
  OGInput.bind({ surface: canvas, direction: move, action: () => { if (won) restart(); else if (paused) togglePause(); }, pause: togglePause, restart, hold: true });
  restart();
})();
