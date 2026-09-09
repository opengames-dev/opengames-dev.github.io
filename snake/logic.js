const SnakeLogic = (() => {
  const vectors = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
  const same = (a, b) => a.x === b.x && a.y === b.y;
  function foodFor(body, size, random = Math.random) {
    const occupied = new Set(body.map(p => p.y * size + p.x));
    const free = [];
    for (let i = 0; i < size * size; i++) if (!occupied.has(i)) free.push(i);
    if (!free.length) return null;
    const index = free[Math.floor(random() * free.length)];
    return { x: index % size, y: Math.floor(index / size) };
  }
  function create(size = 20, random = Math.random) {
    const y = Math.floor(size / 2), x = Math.floor(size / 2);
    const body = [{ x, y }, { x: x - 1, y }, { x: x - 2, y }];
    return { size, body, direction: 'right', queue: [], food: foodFor(body, size, random), score: 0, over: false, won: false };
  }
  function turn(state, name) {
    if (!vectors[name] || state.over || state.queue.length >= 2) return false;
    const previous = state.queue[state.queue.length - 1] || state.direction;
    const a = vectors[previous], b = vectors[name];
    if (previous === name || (a.x + b.x === 0 && a.y + b.y === 0)) return false;
    state.queue.push(name);
    return true;
  }
  function step(state, random = Math.random) {
    if (state.over) return 'over';
    state.direction = state.queue.shift() || state.direction;
    const d = vectors[state.direction];
    const head = { x: state.body[0].x + d.x, y: state.body[0].y + d.y };
    const eating = state.food && same(head, state.food);
    // The tail moves away on a normal step, so its current cell is safe to enter.
    const occupied = eating ? state.body : state.body.slice(0, -1);
    if (head.x < 0 || head.y < 0 || head.x >= state.size || head.y >= state.size || occupied.some(p => same(p, head))) {
      state.over = true; return 'collision';
    }
    state.body.unshift(head);
    if (!eating) state.body.pop();
    else {
      state.score++;
      state.food = foodFor(state.body, state.size, random);
      if (!state.food) { state.over = state.won = true; return 'won'; }
      return 'eat';
    }
    return 'move';
  }
  return { create, turn, step, foodFor, vectors };
})();
if (typeof module !== 'undefined') module.exports = SnakeLogic;
