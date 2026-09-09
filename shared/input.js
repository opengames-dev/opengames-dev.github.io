window.OGInput = {
  bind({ surface, direction, action, pause, restart, hold = false, swipe = true }) {
    const keys = { ArrowUp: 'up', w: 'up', ArrowDown: 'down', s: 'down', ArrowLeft: 'left', a: 'left', ArrowRight: 'right', d: 'right' };
    const interactive = target => target.closest('button, summary, a, input, select, textarea');
    window.addEventListener('keydown', event => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.target.closest('input, select, textarea, .game-settings')) return;
      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
      if (keys[key] && direction && !event.target.closest('a, [data-difficulty]')) {
        event.preventDefault();
        if (!event.repeat || hold) direction(keys[key]);
      } else if (key === 'Escape' && !event.repeat) { pause?.(); }
      else if (key === 'r' && !event.repeat) { restart?.(); }
      else if ((key === ' ' || key === 'Enter') && !interactive(event.target)) {
        event.preventDefault();
        if (!event.repeat) action?.();
      }
    });
    let pressDelay;
    let pressRepeat;
    function release() { clearTimeout(pressDelay); clearInterval(pressRepeat); }
    document.querySelectorAll('[data-direction]').forEach(button => {
      button.addEventListener('pointerdown', event => {
        if (event.button !== 0) return;
        event.preventDefault();
        release();
        button.setPointerCapture(event.pointerId);
        direction(button.dataset.direction);
        if (hold) pressDelay = setTimeout(() => { pressRepeat = setInterval(() => direction(button.dataset.direction), 110); }, 240);
      });
      button.addEventListener('click', event => { if (event.detail === 0) direction(button.dataset.direction); });
      button.addEventListener('lostpointercapture', release);
    });
    window.addEventListener('pointerup', release);
    window.addEventListener('pointercancel', release);
    window.addEventListener('blur', release);
    document.addEventListener('visibilitychange', release);
    if (swipe && direction) {
      let origin;
      surface.addEventListener('pointerdown', event => {
        if (event.button !== 0) return;
        surface.focus({ preventScroll: true });
        origin = { x: event.clientX, y: event.clientY, id: event.pointerId };
        surface.setPointerCapture(event.pointerId);
      });
      surface.addEventListener('pointermove', event => {
        if (!origin || event.pointerId !== origin.id) return;
        const dx = event.clientX - origin.x, dy = event.clientY - origin.y;
        if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return;
        direction(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
        origin = { x: event.clientX, y: event.clientY, id: event.pointerId };
      });
      surface.addEventListener('lostpointercapture', () => { origin = null; });
    }
    // Poll only after a pad connects. Buttons are edge-triggered; movement may repeat.
    let frame = 0, previousDirection = '', lastMove = 0, previousAction = false, previousPause = false;
    function poll(now) {
      frame = 0;
      let pads;
      try { pads = [...navigator.getGamepads()].filter(Boolean); } catch { return; }
      if (!pads.length) { previousDirection = ''; previousAction = previousPause = false; return; }
      const pad = pads[0];
      const pressed = index => Boolean(pad.buttons[index]?.pressed);
      const x = pad.axes[0] || 0, y = pad.axes[1] || 0;
      const move = pressed(12) ? 'up' : pressed(13) ? 'down' : pressed(14) ? 'left' : pressed(15) ? 'right'
        : Math.abs(x) > .45 && Math.abs(x) > Math.abs(y) ? (x > 0 ? 'right' : 'left')
        : Math.abs(y) > .45 ? (y > 0 ? 'down' : 'up') : '';
      if (!document.hidden && !document.getElementById('settings')?.open) {
        if (move && (move !== previousDirection || (hold && now - lastMove > 140))) { direction?.(move); lastMove = now; }
        if (pressed(0) && !previousAction) action?.();
        if (pressed(9) && !previousPause) pause?.();
      }
      previousDirection = move;
      previousAction = pressed(0);
      previousPause = pressed(9);
      frame = requestAnimationFrame(poll);
    }
    if (direction) {
      window.addEventListener('gamepadconnected', () => { if (!frame) frame = requestAnimationFrame(poll); });
      try { if ([...(navigator.getGamepads?.() || [])].some(Boolean)) frame = requestAnimationFrame(poll); } catch { /* Optional API. */ }
    }
  }
};
