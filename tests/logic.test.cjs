const test = require('node:test');
const assert = require('node:assert/strict');
const Maze = require('../labyrinth/logic.js');
const Snake = require('../snake/logic.js');
const Flap = require('../flap/logic.js');
const Blocks = require('../blocks/logic.js');

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

const STEP = 1 / 240;
function fly(state, seconds) {
  let result;
  for (let t = 0; t < seconds && !state.over; t += STEP) result = Flap.step(state, STEP);
  return result;
}

test('Flap waits for the first flap, then falls under gravity and stops at the ceiling', () => {
  const state = Flap.create('normal', seeded(1));
  assert.equal(fly(state, 3), 'wait');
  assert.equal(state.bird.y, .44);
  assert.equal(state.posts.length, 0);
  assert.equal(Flap.flap(state), true);
  const start = state.bird.y;
  fly(state, .1);
  assert(state.bird.y < start, 'a flap lifts the bird');
  fly(state, .5);
  assert(state.bird.vy > 0, 'gravity turns the climb into a fall');
  const ceiling = Flap.create('normal', seeded(1));
  for (let i = 0; i < 12; i++) { Flap.flap(ceiling); fly(ceiling, .05); }
  assert.equal(ceiling.over, false);
  assert(ceiling.bird.y >= Flap.radius);
});

test('Flap ends on the ground and on a post, and rejects flaps afterwards', () => {
  const ground = Flap.create('easy', seeded(2));
  Flap.flap(ground);
  assert.equal(fly(ground, 5), 'crash');
  assert.equal(ground.over, true);
  assert.equal(Flap.flap(ground), false);
  assert.equal(Flap.step(ground, STEP), 'over');
  const post = Flap.create('normal', seeded(3));
  Flap.flap(post);
  post.posts = [{ x: Flap.birdX - .02, y: post.bird.y + .4, scored: false }];
  assert.equal(Flap.step(post, STEP), 'crash');
  const clear = Flap.create('normal', seeded(3));
  Flap.flap(clear);
  clear.posts = [{ x: Flap.birdX - .02, y: clear.bird.y, scored: false }];
  assert.notEqual(Flap.step(clear, STEP), 'crash');
});

test('Flap scores each post once as the bird passes its middle', () => {
  const state = Flap.create('normal', seeded(4));
  Flap.flap(state);
  state.bird.vy = 0;
  state.posts = [{ x: Flap.birdX - Flap.postWidth / 2 + .0005, y: state.bird.y, scored: false }];
  assert.equal(Flap.step(state, STEP), 'score');
  assert.equal(state.score, 1);
  assert.notEqual(Flap.step(state, STEP), 'score');
  assert.equal(state.score, 1);
});

test('Flap gaps stay on the board, within reach of the last gap, and spaced evenly', () => {
  for (const [level, config] of Object.entries(Flap.levels)) {
    for (let seed = 0; seed < 30; seed++) {
      const random = seeded(seed), state = Flap.create(level, random);
      let previous = null;
      for (let i = 0; i < 40; i++) {
        const y = Flap.gapFor(state, previous, random);
        assert(y - config.gap / 2 >= Flap.margin - 1e-9 && y + config.gap / 2 <= Flap.ground - Flap.margin + 1e-9);
        if (previous != null) assert(Math.abs(y - previous) <= config.shift + 1e-9);
        previous = y;
      }
    }
  }
  const state = Flap.create('hard', seeded(5));
  Flap.flap(state);
  for (let i = 0; i < 2000; i++) { state.bird.y = .44; state.bird.vy = 0; Flap.step(state, STEP); state.over = false; }
  for (let i = 1; i < state.posts.length; i++) assert(Math.abs(state.posts[i].x - state.posts[i - 1].x - Flap.spacing) < 1e-9);
});

test('A simple steady pilot can clear many posts on every difficulty', () => {
  for (const level of Object.keys(Flap.levels)) {
    for (let seed = 0; seed < 10; seed++) {
      const state = Flap.create(level, seeded(seed));
      Flap.flap(state);
      while (!state.over && state.score < 50) {
        const next = state.posts.find(post => post.x + Flap.postWidth > Flap.birdX - Flap.radius);
        const target = next ? next.y + .03 : .44;
        if (state.bird.y > target && state.bird.vy > 0) Flap.flap(state);
        Flap.step(state, STEP);
      }
      assert.equal(state.score, 50, `${level} seed ${seed} crashed at ${state.score}`);
    }
  }
});

function emptyBlocks(name = 'T', level = 'normal') {
  const state = Blocks.create(level, seeded(1));
  state.piece = { name, r: 0, x: 3, y: 0 };
  return state;
}

test('Blocks deals every shape once per bag of seven', () => {
  for (let seed = 0; seed < 20; seed++) {
    const state = Blocks.create('normal', seeded(seed));
    const dealt = [state.piece.name];
    while (dealt.length < 14) { Blocks.hardDrop(state); dealt.push(state.piece.name); state.grid.forEach(row => row.fill('')); }
    assert.deepEqual(dealt.slice(0, 7).sort(), Blocks.names.slice().sort());
    assert.deepEqual(dealt.slice(7).sort(), Blocks.names.slice().sort());
  }
});

test('Blocks rotations return home and keep four cells; walls and stacks block moves', () => {
  for (const name of Blocks.names) {
    const piece = { name, r: 0, x: 3, y: 2 };
    const home = JSON.stringify(Blocks.cellsOf(piece).sort());
    for (let r = 0; r < 4; r++) assert.equal(new Set(Blocks.cellsOf({ ...piece, r }).map(String)).size, 4);
    assert.equal(JSON.stringify(Blocks.cellsOf({ ...piece, r: 4 % 4 }).sort()), home);
  }
  const state = emptyBlocks('T');
  for (let i = 0; i < 10; i++) Blocks.shift(state, -1);
  assert.equal(state.piece.x, 0);
  assert.equal(Blocks.shift(state, -1), false);
  state.grid[1][3] = 'Z';
  assert.equal(Blocks.shift(state, 1), false);
  assert.equal(state.piece.x, 0);
});

test('Blocks rotation kicks off a wall instead of failing', () => {
  const state = emptyBlocks('I');
  state.piece = { name: 'I', r: 1, x: -2, y: 4 };
  assert(Blocks.fits(state, state.piece));
  assert.equal(Blocks.rotate(state, 1), true);
  assert(Blocks.cellsOf(state.piece).every(([x]) => x >= 0 && x < Blocks.width));
  const o = emptyBlocks('O');
  assert.equal(Blocks.rotate(o, 1), false);
});

test('Blocks gravity follows the level, and pieces lock only after the lock delay', () => {
  const state = emptyBlocks('T', 'easy');
  assert.equal(Blocks.interval(1), 1000);
  Blocks.update(state, 999);
  assert.equal(state.piece.y, 0);
  Blocks.update(state, 1);
  assert.equal(state.piece.y, 1);
  state.piece.y = Blocks.ghost(state).y;
  assert.equal(Blocks.update(state, Blocks.lockDelay - 1), 'wait');
  assert.equal(Blocks.shift(state, 1), true);
  assert.equal(Blocks.update(state, Blocks.lockDelay - 1), 'wait', 'moving on the floor resets the delay');
  assert.equal(Blocks.update(state, 1), 'lock');
  assert(state.grid[Blocks.height - 1].some(Boolean));
  assert.equal(state.piece.y, 0);
});

test('Blocks clears full rows, collapses the stack, and scores by level', () => {
  const state = emptyBlocks('I', 'normal');
  for (const y of [19, 18, 17, 16]) for (let x = 0; x < 10; x++) if (x !== 9) state.grid[y][x] = 'O';
  state.grid[15][0] = 'Z';
  state.piece = { name: 'I', r: 1, x: 7, y: 0 };
  const drop = Blocks.ghost(state).y - state.piece.y;
  assert.equal(Blocks.hardDrop(state), 'clear');
  assert.deepEqual(state.cleared, [16, 17, 18, 19]);
  assert.equal(state.lines, 4);
  assert.equal(state.score, 800 * 3 + drop * 2);
  assert.equal(state.grid[19][0], 'Z');
  assert.equal(state.grid.flat().filter(Boolean).length, 1);
  const split = emptyBlocks('I');
  for (let x = 0; x < 10; x++) { split.grid[19][x] = 'O'; split.grid[17][x] = 'O'; }
  split.grid[18][0] = 'J'; split.grid[19][4] = '';
  split.piece = { name: 'O', r: 0, x: 8, y: 0 };
  split.grid[17][8] = split.grid[17][9] = '';
  split.grid[16][3] = 'S';
  Blocks.hardDrop(split);
  assert.deepEqual(split.cleared, [17]);
  assert.equal(split.grid[17][3], 'S');
  assert.equal(split.grid[18][0], 'J');
  assert.equal(split.grid[19][4], '');
});

test('Blocks levels rise every ten lines, and a blocked spawn ends the game', () => {
  const state = emptyBlocks('I', 'hard');
  assert.equal(state.level, 6);
  state.lines = 9;
  for (let x = 0; x < 6; x++) state.grid[19][x] = 'O';
  state.piece = { name: 'I', r: 0, x: 6, y: 0 };
  assert.equal(Blocks.hardDrop(state), 'clear');
  assert.equal(state.level, 7);
  const full = emptyBlocks('T');
  for (let y = 2; y < 20; y++) for (let x = 0; x < 10; x++) if (x !== y % 10) full.grid[y][x] = 'O';
  full.grid[1].fill('L'); full.grid[1][0] = '';
  let result;
  for (let i = 0; i < 4 && result !== 'over'; i++) result = Blocks.hardDrop(full);
  assert.equal(result, 'over');
  assert.equal(full.over, true);
  assert.equal(Blocks.shift(full, 1), false);
  assert.equal(Blocks.update(full, 5000), 'over');
});
