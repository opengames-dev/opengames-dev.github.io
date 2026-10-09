const BlocksLogic = (() => {
  const width = 10, height = 20, lockDelay = 500, maxResets = 15;
  // Each shape sits in an n×n box and rotates clockwise within it.
  const shapes = {
    I: { n: 4, cells: [[0, 1], [1, 1], [2, 1], [3, 1]] },
    O: { n: 2, cells: [[0, 0], [1, 0], [0, 1], [1, 1]] },
    T: { n: 3, cells: [[1, 0], [0, 1], [1, 1], [2, 1]] },
    S: { n: 3, cells: [[1, 0], [2, 0], [0, 1], [1, 1]] },
    Z: { n: 3, cells: [[0, 0], [1, 0], [1, 1], [2, 1]] },
    J: { n: 3, cells: [[0, 0], [0, 1], [1, 1], [2, 1]] },
    L: { n: 3, cells: [[2, 0], [0, 1], [1, 1], [2, 1]] }
  };
  const names = Object.keys(shapes);
  const kicks = [[0, 0], [-1, 0], [1, 0], [0, -1], [-2, 0], [2, 0]];
  const lineScores = [0, 100, 300, 500, 800];
  const startLevels = { easy: 1, normal: 3, hard: 6 };
  function cellsOf(piece) {
    const { n, cells } = shapes[piece.name];
    return cells.map(([x, y]) => {
      for (let i = 0; i < piece.r; i++) [x, y] = [n - 1 - y, x];
      return [piece.x + x, piece.y + y];
    });
  }
  function bag(random) {
    const list = names.slice();
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
  }
  function fits(state, piece) {
    return cellsOf(piece).every(([x, y]) => x >= 0 && x < width && y < height && (y < 0 || !state.grid[y][x]));
  }
  function interval(level) { return Math.max(60, Math.round(1000 * .8 ** (level - 1))); }
  function spawn(state) {
    if (state.queue.length < 7) state.queue.push(...bag(state.random));
    const name = state.queue.shift();
    state.piece = { name, r: 0, x: name === 'O' ? 4 : 3, y: 0 };
    state.fall = state.lockTime = state.resets = 0;
    if (!fits(state, state.piece)) state.over = true;
  }
  function create(difficulty = 'normal', random = Math.random) {
    const start = startLevels[difficulty] || startLevels.normal;
    const state = {
      grid: Array.from({ length: height }, () => Array(width).fill('')),
      queue: bag(random), piece: null, start, level: start, lines: 0, score: 0,
      fall: 0, lockTime: 0, resets: 0, cleared: [], over: false, random
    };
    spawn(state);
    return state;
  }
  function grounded(state) { return !fits(state, { ...state.piece, y: state.piece.y + 1 }); }
  // Successful moves on the floor postpone locking, a limited number of times.
  function tryPlace(state, piece) {
    if (state.over || !fits(state, piece)) return false;
    state.piece = piece;
    if (state.resets < maxResets && grounded(state)) { state.lockTime = 0; state.resets++; }
    return true;
  }
  function shift(state, dx) { return state.piece ? tryPlace(state, { ...state.piece, x: state.piece.x + dx }) : false; }
  function rotate(state, dir = 1) {
    if (!state.piece || state.piece.name === 'O') return false;
    const r = (state.piece.r + dir + 4) % 4;
    return kicks.some(([dx, dy]) => tryPlace(state, { ...state.piece, r, x: state.piece.x + dx, y: state.piece.y + dy }));
  }
  function lock(state) {
    for (const [x, y] of cellsOf(state.piece)) if (y >= 0) state.grid[y][x] = state.piece.name;
    const above = cellsOf(state.piece).some(([, y]) => y < 0);
    state.cleared = [];
    state.grid.forEach((row, y) => { if (row.every(Boolean)) state.cleared.push(y); });
    for (const y of state.cleared) { state.grid.splice(y, 1); state.grid.unshift(Array(width).fill('')); }
    const lines = state.cleared.length;
    state.score += lineScores[lines] * state.level;
    state.lines += lines;
    state.level = state.start + Math.floor(state.lines / 10);
    if (above) { state.over = true; state.piece = null; return 'over'; }
    spawn(state);
    return state.over ? 'over' : lines ? 'clear' : 'lock';
  }
  function softDrop(state) {
    if (state.over || grounded(state)) return false;
    state.piece = { ...state.piece, y: state.piece.y + 1 };
    state.score++; state.fall = 0;
    return true;
  }
  function ghost(state) {
    let y = state.piece.y;
    while (fits(state, { ...state.piece, y: y + 1 })) y++;
    return { ...state.piece, y };
  }
  function hardDrop(state) {
    if (state.over) return 'over';
    const target = ghost(state);
    state.score += (target.y - state.piece.y) * 2;
    state.piece = target;
    return lock(state);
  }
  // Advance gravity and lock delay by dt milliseconds.
  function update(state, dt) {
    if (state.over) return 'over';
    if (grounded(state)) {
      state.fall = 0;
      state.lockTime += dt;
      return state.lockTime >= lockDelay ? lock(state) : 'wait';
    }
    state.lockTime = 0;
    state.fall += dt;
    const step = interval(state.level);
    while (state.fall >= step && !grounded(state)) {
      state.fall -= step;
      state.piece = { ...state.piece, y: state.piece.y + 1 };
    }
    return 'fall';
  }
  return { create, cellsOf, fits, shift, rotate, softDrop, hardDrop, ghost, update, interval, bag, shapes, names, width, height, lockDelay, lineScores, startLevels };
})();
if (typeof module !== 'undefined') module.exports = BlocksLogic;
