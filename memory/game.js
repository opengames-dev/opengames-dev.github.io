(() => {
  const board = document.getElementById('board');
  const movesLabel = document.getElementById('moves');
  const pairsLabel = document.getElementById('pairs');
  const timeLabel = document.getElementById('time');
  // Original geometric drawings, with names for assistive technology.
  const symbols = [
    ['Circle', '<circle cx="24" cy="24" r="14"/>'],
    ['Triangle', '<path d="M24 8 41 38H7Z"/>'],
    ['Square', '<rect x="10" y="10" width="28" height="28" rx="2"/>'],
    ['Diamond', '<path d="m24 5 17 19-17 19L7 24Z"/>'],
    ['Star', '<path d="m24 5 6 12 13 2-10 10 2 14-11-7-12 7 3-14L5 19l13-2Z"/>'],
    ['Heart', '<path d="M24 40 8 24C-2 9 19 1 24 15 29 1 50 9 40 24Z"/>'],
    ['Moon', '<path d="M31 6C7 2 0 35 23 41c10 3 18-3 20-9C23 38 14 17 31 6Z"/>'],
    ['Plus', '<path d="M19 7h10v12h12v10H29v12H19V29H7V19h12Z"/>'],
    ['Bolt', '<path d="M26 3 10 28h12l-1 17 17-27H26Z"/>'],
    ['Flower', '<path d="M24 18C4-9-9 24 18 24-9 44 24 57 24 30c20 27 33-6 6-6C57 4 24-9 24 18Z"/>'],
    ['Arch', '<path d="M8 40V23a16 16 0 0 1 32 0v17H30V23a6 6 0 0 0-12 0v17Z"/>'],
    ['Flag', '<path d="M12 43V6l27 4-8 9 8 10-27-4" fill="none" stroke="currentColor" stroke-width="5"/>'],
    ['Waves', '<path d="M5 16q9-12 19 0t19 0M5 31q9-12 19 0t19 0" fill="none" stroke="currentColor" stroke-width="5"/>'],
    ['Leaf', '<path d="M9 40C-2 12 24 5 41 7c0 23-10 39-32 33Z"/><path d="m9 40 23-24" stroke="#fffcf5" stroke-width="3"/>'],
    ['Eye', '<path d="M3 24Q24 0 45 24 24 48 3 24Z" fill="none" stroke="currentColor" stroke-width="4"/><circle cx="24" cy="24" r="7"/>'],
    ['Hourglass', '<path d="M10 6h28L28 24l10 18H10l10-18Z"/>'],
    ['Drop', '<path d="M24 4C20 14 9 22 9 30a15 15 0 0 0 30 0C39 22 28 14 24 4Z"/>'],
    ['Spiral', '<path d="M24 24c9-8 17 5 8 12C15 48 0 27 11 13 27-6 49 13 41 32" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"/>']
  ];
  let cards = [], first = null, second = null, moves = 0, matched = 0, total = 0, elapsed = 0;
  let remaining = 0, started = false, paused = false, won = false, columns = 4, selected = 0, frame = 0, lastFrame = 0;
  const ui = OG.createUI({ restart, togglePause });
  function restart() {
    cancelAnimationFrame(frame); frame = 0;
    columns = { easy: 2, normal: 4, hard: 5 }[ui.difficulty];
    const rows = ui.difficulty === 'easy' ? 2 : 4;
    total = columns * rows / 2;
    const deck = Array.from({ length: total * 2 }, (_, i) => i % total);
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    first = second = null;
    moves = matched = elapsed = remaining = selected = 0;
    started = paused = won = false;
    board.style.setProperty('--columns', columns);
    board.style.aspectRatio = `${columns} / ${rows}`;
    document.body.style.setProperty('--board-ratio', columns / rows);
    board.replaceChildren();
    cards = deck.map((symbol, index) => {
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'memory-card'; button.tabIndex = index === 0 ? 0 : -1;
      button.setAttribute('aria-label', `Card ${index + 1}, face down`);
      button.innerHTML = `<span class="card-inner" aria-hidden="true"><span class="card-back"></span><span class="card-front"><svg viewBox="0 0 48 48" fill="currentColor">${symbols[symbol][1]}</svg></span></span>`;
      const card = { button, symbol, matched: false, index };
      button.addEventListener('click', () => flip(card));
      button.addEventListener('focus', () => select(index, false));
      board.append(button);
      return card;
    });
    movesLabel.textContent = '0'; timeLabel.textContent = '0:00'; updatePairs();
    ui.hideOverlay(); ui.setPaused(false);
    ui.announce(`New board. Find ${total} pairs.`);
  }
  function select(index, focus = true) {
    selected = index;
    cards.forEach((card, i) => { card.button.tabIndex = i === selected ? 0 : -1; });
    if (focus) cards[selected].button.focus({ preventScroll: true });
  }
  function updatePairs() { pairsLabel.textContent = `${matched} / ${total}`; }
  function flip(card) {
    if (paused || won || remaining > 0 || card.matched || card === first) return;
    started = true; wake();
    select(card.index, false);
    card.button.classList.add('revealed');
    card.button.setAttribute('aria-label', `Card ${card.index + 1}, ${symbols[card.symbol][0]}`);
    OGAudio.play('flip');
    if (!first) { first = card; return; }
    second = card;
    movesLabel.textContent = String(++moves);
    if (first.symbol === second.symbol) {
      [first, second].forEach(item => {
        item.matched = true; item.button.classList.add('matched');
        item.button.setAttribute('aria-label', `Card ${item.index + 1}, ${symbols[item.symbol][0]}, matched`);
        item.button.setAttribute('aria-disabled', 'true');
      });
      matched++; updatePairs(); first = second = null;
      OGAudio.play('hit'); ui.announce(`Match. ${matched} of ${total} pairs found.`);
      if (matched === total) {
        won = true; OGAudio.play('success');
        ui.showOverlay('All pairs found', `${total} pairs · ${moves} moves · ${OG.formatTime(elapsed)}`, 'New board', restart);
      }
    } else { remaining = 850; ui.announce('No match. Try another pair.'); }
  }
  function togglePause() {
    if (won) return;
    paused = !paused;
    if (paused) { cancelAnimationFrame(frame); frame = 0; } ui.setPaused(paused);
    if (paused) ui.showOverlay('Paused', '', 'Resume', togglePause);
    else { ui.hideOverlay(); wake(); }
  }
  function tick(now) {
    frame = 0;
    if (paused || won || !started || document.hidden) return;
    const dt = now - lastFrame; lastFrame = now;
    elapsed += dt / 1000; timeLabel.textContent = OG.formatTime(elapsed);
    if (remaining > 0) {
      remaining -= dt;
      if (remaining <= 0) {
        [first, second].forEach(card => {
          card.button.classList.remove('revealed');
          card.button.setAttribute('aria-label', `Card ${card.index + 1}, face down`);
        });
        first = second = null; remaining = 0;
      }
    }
    frame = requestAnimationFrame(tick);
  }
  function wake() { if (!frame) { lastFrame = performance.now(); frame = requestAnimationFrame(tick); } }
  board.addEventListener('keydown', event => {
    const offsets = { ArrowUp: -columns, ArrowDown: columns, ArrowLeft: -1, ArrowRight: 1 };
    if (event.key in offsets) { event.preventDefault(); select((selected + offsets[event.key] + cards.length) % cards.length); }
    if (event.key === 'Home') { event.preventDefault(); select(0); }
    if (event.key === 'End') { event.preventDefault(); select(cards.length - 1); }
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden && !paused && !won) togglePause(); });
  window.addEventListener('blur', () => { if (started && !paused && !won) togglePause(); });
  OGInput.bind({ surface: board, pause: togglePause, restart, swipe: false });
  restart();
})();
