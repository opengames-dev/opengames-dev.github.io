window.OG = (() => {
  const storage = {
    get(key, fallback) {
      try { return localStorage.getItem('opengames:' + key) ?? fallback; } catch { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem('opengames:' + key, String(value)); } catch { /* Private browsing can disable storage. */ }
    }
  };
  function formatTime(seconds) {
    const whole = Math.max(0, Math.floor(seconds));
    return Math.floor(whole / 60) + ':' + String(whole % 60).padStart(2, '0');
  }
  function createUI({ restart, togglePause }) {
    const game = document.body.dataset.game;
    const saved = storage.get(game + ':difficulty', 'normal');
    let difficulty = ['easy', 'normal', 'hard'].includes(saved) ? saved : 'normal';
    const overlay = document.getElementById('overlay');
    const action = document.getElementById('overlay-action');
    const surface = document.getElementById('board');
    let overlayAction;
    let paused = false;
    const settings = document.getElementById('settings');
    const settingsToggle = settings.querySelector('summary');
    const settingsContent = settings.querySelector('.settings-content');
    function fitSettings() {
      if (!settings.open) return;
      const previousX = parseFloat(settingsContent.style.getPropertyValue('--menu-x')) || 0;
      const previousY = parseFloat(settingsContent.style.getPropertyValue('--menu-y')) || 0;
      const box = settingsContent.getBoundingClientRect();
      // Keep a popover beside its button, nudging it only at screen edges.
      const x = Math.max(12 - box.left + previousX, Math.min(0, innerWidth - 12 - box.right + previousX));
      const y = Math.max(12 - box.top + previousY, Math.min(0, innerHeight - 12 - box.bottom + previousY));
      settingsContent.style.setProperty('--menu-x', x + 'px');
      settingsContent.style.setProperty('--menu-y', y + 'px');
    }
    window.addEventListener('resize', fitSettings);
    const menuResize = new ResizeObserver(fitSettings);
    menuResize.observe(settingsContent);
    menuResize.observe(document.querySelector('.game-layout'));
    document.getElementById('restart').addEventListener('click', () => restart(true));
    document.querySelectorAll('[data-difficulty]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.difficulty === difficulty));
      button.addEventListener('click', () => {
        difficulty = button.dataset.difficulty;
        storage.set(game + ':difficulty', difficulty);
        document.querySelectorAll('[data-difficulty]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
        resumeAfterSettings = false;
        setSettingsOpen(false);
        restart(true);
        focusGame();
      });
    });
    const sound = document.getElementById('sound');
    function updateSound() {
      sound.textContent = OGAudio.enabled ? 'Sound on' : 'Sound off';
      sound.setAttribute('aria-pressed', String(OGAudio.enabled));
    }
    sound.addEventListener('click', () => { OGAudio.toggle(); updateSound(); });
    updateSound();
    function focusGame() {
      const target = overlay.hidden ? (surface.querySelector('button:not(:disabled)') || surface) : action;
      target.focus({ preventScroll: true });
    }
    // Settings pause active play and restore it on close, without losing the
    // player's existing pause state. Difficulty changes start a fresh game.
    let resumeAfterSettings = false;
    function setSettingsOpen(open) {
      if (settings.open === open) return;
      settings.open = open;
      if (open) {
        resumeAfterSettings = !paused && overlay.hidden;
        if (resumeAfterSettings) togglePause();
        fitSettings();
        requestAnimationFrame(fitSettings);
      } else {
        if (resumeAfterSettings && paused && !document.hidden) togglePause();
        resumeAfterSettings = false;
        if (settings.contains(document.activeElement)) settingsToggle.focus({ preventScroll: true });
      }
    }
    // Handle activation directly: native details toggle events can be coalesced
    // when a player closes and reopens the menu quickly after changing difficulty.
    settingsToggle.addEventListener('click', event => {
      event.preventDefault();
      setSettingsOpen(!settings.open);
    });
    document.addEventListener('pointerdown', event => {
      if (settings.open && !settings.contains(event.target)) {
        if (event.target.closest('#pause, #overlay-action')) resumeAfterSettings = false;
        setSettingsOpen(false);
      }
    });
    const fullscreen = document.getElementById('fullscreen');
    function setFocused(focused) {
      document.body.classList.toggle('is-focused', focused);
      fullscreen.setAttribute('aria-pressed', String(focused));
      fullscreen.setAttribute('aria-label', focused ? 'Exit fullscreen' : 'Fullscreen');
      fullscreen.title = focused ? 'Exit fullscreen' : 'Fullscreen';
      fitSettings();
    }
    async function exitFocus() {
      if (document.fullscreenElement) {
        try { await document.exitFullscreen(); } catch { /* Keep the exit control available. */ }
      } else setFocused(false);
    }
    fullscreen.addEventListener('click', async () => {
      if (document.body.classList.contains('is-focused')) { await exitFocus(); return; }
      // Keep the same focused layout on phones that do not expose native fullscreen.
      if (document.fullscreenEnabled) {
        try { await document.documentElement.requestFullscreen(); } catch { /* Focus view still works. */ }
      }
      setFocused(true);
    });
    document.addEventListener('fullscreenchange', () => {
      const focused = Boolean(document.fullscreenElement);
      setFocused(focused);
      if (!focused) setSettingsOpen(false);
    });
    window.addEventListener('keydown', event => {
      if (event.key !== 'Escape') return;
      if (settings.open) {
        event.preventDefault(); event.stopImmediatePropagation();
        setSettingsOpen(false);
      } else if (document.body.classList.contains('is-focused')) {
        event.preventDefault(); event.stopImmediatePropagation();
        exitFocus();
      }
    }, true);
    document.getElementById('pause').addEventListener('click', () => togglePause());
    action.addEventListener('click', () => overlayAction?.());
    function announce(message) { document.getElementById('announcement').textContent = message; }
    return {
      get difficulty() { return difficulty; },
      announce,
      showOverlay(title, message, label, callback, focus = true) {
        document.getElementById('overlay-title').textContent = title;
        document.getElementById('overlay-message').textContent = message;
        action.textContent = label;
        overlayAction = callback;
        surface.inert = true;
        overlay.hidden = false;
        announce(title + '. ' + message);
        if (focus && !document.hidden && !settings.open) action.focus({ preventScroll: true });
      },
      hideOverlay() {
        const focused = overlay.contains(document.activeElement);
        overlay.hidden = true;
        surface.inert = false;
        if (focused) (surface.querySelector('button:not(:disabled)') || surface).focus({ preventScroll: true });
      },
      setPaused(value) {
        paused = value;
        const button = document.getElementById('pause');
        button.textContent = paused ? 'Resume' : 'Pause';
        button.setAttribute('aria-pressed', String(paused));
      }
    };
  }
  // Canvas coordinates stay in CSS pixels; the backing buffer tracks display density.
  function canvasView(canvas, draw) {
    const context = canvas.getContext('2d');
    let size = 0;
    function resize() {
      size = canvas.getBoundingClientRect().width;
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.round(size * ratio);
      canvas.height = Math.round(size * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      draw(context, size);
    }
    new ResizeObserver(resize).observe(canvas);
    window.addEventListener('resize', resize);
    return { draw: () => { if (size) draw(context, size); } };
  }
  return { storage, formatTime, createUI, canvasView, reducedMotion: matchMedia('(prefers-reduced-motion: reduce)') };
})();
