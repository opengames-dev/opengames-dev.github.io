/* A randomized depth-first walk carves a spanning tree: every cell is reachable. */
const MazeLogic = (() => {
  const directions = {
    up: { x: 0, y: -1, wall: 0, opposite: 2 },
    right: { x: 1, y: 0, wall: 1, opposite: 3 },
    down: { x: 0, y: 1, wall: 2, opposite: 0 },
    left: { x: -1, y: 0, wall: 3, opposite: 1 }
  };
  function generate(size, random = Math.random) {
    const cells = Array.from({ length: size * size }, () => [true, true, true, true]);
    const visited = new Set([0]);
    const stack = [0];
    while (stack.length) {
      const current = stack[stack.length - 1];
      const x = current % size, y = Math.floor(current / size);
      const neighbors = Object.values(directions).filter(d => {
        const nx = x + d.x, ny = y + d.y;
        return nx >= 0 && nx < size && ny >= 0 && ny < size && !visited.has(ny * size + nx);
      });
      if (!neighbors.length) { stack.pop(); continue; }
      const next = neighbors[Math.floor(random() * neighbors.length)];
      const index = (y + next.y) * size + x + next.x;
      cells[current][next.wall] = false;
      cells[index][next.opposite] = false;
      visited.add(index);
      stack.push(index);
    }
    return { size, cells };
  }
  function move(maze, player, name) {
    const d = directions[name];
    if (!d || maze.cells[player.y * maze.size + player.x][d.wall]) return player;
    return { x: player.x + d.x, y: player.y + d.y };
  }
  return { generate, move, directions };
})();
if (typeof module !== 'undefined') module.exports = MazeLogic;
