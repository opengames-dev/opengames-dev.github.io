const test = require('node:test');
const assert = require('node:assert/strict');
const Maze = require('../labyrinth/logic.js');
const Snake = require('../snake/logic.js');

function seeded(seed) {
  return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
}

test('Every maze is a connected tree with closed boundaries and reciprocal walls', () => {
  for (const size of [7, 11, 17]) {
    for (let seed = 0; seed < 40; seed++) {
      const maze = Maze.generate(size, seeded(seed));
      const visited = new Set([0]), stack = [0];
      let openings = 0;
      maze.cells.forEach((walls, index) => {
        const x = index % size, y = Math.floor(index / size);
        for (const d of Object.values(Maze.directions)) {
          const nx = x + d.x, ny = y + d.y;
          if (nx < 0 || nx >= size || ny < 0 || ny >= size) assert.equal(walls[d.wall], true);
          else {
            assert.equal(walls[d.wall], maze.cells[ny * size + nx][d.opposite]);
            if (!walls[d.wall]) openings++;
          }
        }
      });
      while (stack.length) {
        const index = stack.pop();
        const player = { x: index % size, y: Math.floor(index / size) };
        for (const name of Object.keys(Maze.directions)) {
          const next = Maze.move(maze, player, name), key = next.y * size + next.x;
          if (!visited.has(key)) { visited.add(key); stack.push(key); }
        }
      }
      assert.equal(visited.size, size * size);
      assert.equal(openings / 2, size * size - 1);
      const start = { x: 0, y: 0 };
      assert.equal(Maze.move(maze, start, 'up'), start);
      assert.equal(Maze.move(maze, start, 'left'), start);
    }
  }
});

test('Snake rejects reversals and safely buffers two rapid turns', () => {
  const state = Snake.create();
  assert.equal(Snake.turn(state, 'left'), false);
  assert.equal(Snake.turn(state, 'up'), true);
  assert.equal(Snake.turn(state, 'down'), false);
  assert.equal(Snake.turn(state, 'left'), true);
  assert.equal(Snake.turn(state, 'down'), false);
  Snake.step(state);
  assert.equal(state.direction, 'up');
  Snake.step(state);
  assert.equal(state.direction, 'left');
  assert.equal(state.over, false);
});

test('Snake grows only when eating, and food never overlaps its body', () => {
  const state = Snake.create(20, seeded(1));
  state.food = { x: state.body[0].x + 1, y: state.body[0].y };
  assert.equal(Snake.step(state, seeded(2)), 'eat');
  assert.equal(state.body.length, 4);
  assert.equal(state.score, 1);
  for (let seed = 0; seed < 100; seed++) {
    const food = Snake.foodFor(state.body, state.size, seeded(seed));
    assert(!state.body.some(p => p.x === food.x && p.y === food.y));
  }
  state.food = { x: 0, y: 0 };
  assert.equal(Snake.step(state), 'move');
  assert.equal(state.body.length, 4);
});

test('Walls and the body cause a loss; entering the departing tail is allowed', () => {
  const wall = Snake.create();
  wall.body = [{ x: 19, y: 5 }, { x: 18, y: 5 }, { x: 17, y: 5 }];
  assert.equal(Snake.step(wall), 'collision');
  assert.equal(Snake.step(wall), 'over');
  const tail = Snake.create();
  tail.body = [{ x: 2, y: 2 }, { x: 2, y: 3 }, { x: 1, y: 3 }, { x: 1, y: 2 }];
  tail.direction = 'left'; tail.food = { x: 10, y: 10 };
  assert.equal(Snake.step(tail), 'move');
  const body = Snake.create();
  body.body = [{ x: 2, y: 2 }, { x: 2, y: 3 }, { x: 3, y: 3 }, { x: 3, y: 2 }, { x: 4, y: 2 }];
  assert.equal(Snake.step(body), 'collision');
});

test('Filling the board wins without attempting to place food in a full grid', () => {
  const state = {
    size: 2, body: [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }],
    direction: 'right', queue: [], food: { x: 1, y: 0 }, score: 0, over: false, won: false
  };
  assert.equal(Snake.step(state), 'won');
  assert.equal(state.food, null);
  assert.equal(state.body.length, 4);
  assert.equal(state.won, true);
});
