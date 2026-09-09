const test = require('node:test');
const assert = require('node:assert/strict');
const Maze = require('../labyrinth/logic.js');
const Snake = require('../snake/logic.js');
const Dune = require('../dune/logic.js');

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

test('Dune terrain is continuous and every difficulty creates a valid starting state', () => {
  for (const difficulty of ['easy', 'normal', 'hard']) {
    const state = Dune.create(difficulty);
    assert.equal(state.difficulty, difficulty);
    assert.equal(state.grounded, true);
    assert.equal(state.y, Dune.terrainHeight(0) - Dune.radius);
    assert(state.config.diveGravity > state.config.airGravity * 3);
    assert(Number.isFinite(Dune.terrainSlope(12.345)));
  }
  assert.equal(Dune.create('unknown').difficulty, 'normal');
  for (let x = 0; x < 10; x += 0.01) {
    assert(Math.abs(Dune.terrainHeight(x + 0.001) - Dune.terrainHeight(x)) < 0.002);
  }
});

test('Dune launches, lands, scores, and applies the held dive force', () => {
  for (const difficulty of ['easy', 'normal', 'hard']) {
    const state = Dune.create(difficulty);
    let launched = false, landed = false;
    for (let frame = 0; frame < 1200; frame++) {
      const result = Dune.step(state, 1 / 120);
      if (result === 'launch') launched = true;
      if (result === 'land') { landed = true; break; }
    }
    assert.equal(launched, true);
    assert.equal(landed, true);
    assert(state.score > 0);
  }

  const coasting = Dune.create('normal');
  const diving = Dune.create('normal');
  for (const item of [coasting, diving]) {
    item.grounded = false;
    item.airTime = 1;
    item.y = 0.1;
    item.vy = 0;
  }
  Dune.setHeld(diving, true);
  Dune.step(coasting, 0.1);
  Dune.step(diving, 0.1);
  assert(diving.vy > coasting.vy);

  const rolling = Dune.create('normal');
  const pressedIntoSlope = Dune.create('normal');
  Dune.setHeld(pressedIntoSlope, true);
  Dune.step(rolling, 0.1);
  Dune.step(pressedIntoSlope, 0.1);
  assert.equal(pressedIntoSlope.grounded, true);
  assert(pressedIntoSlope.speed > rolling.speed);
});

test('Dune accepts a slope-matched landing and rejects a hard impact', () => {
  function falling(vy) {
    const state = Dune.create('normal');
    state.x = 0.3;
    state.grounded = false;
    state.airTime = 1;
    state.y = Dune.terrainHeight(state.x) - Dune.radius - 0.002;
    state.vx = 0.4;
    state.vy = vy;
    return state;
  }
  const soft = falling(0.3);
  assert.equal(Dune.step(soft, 0.01), 'land');
  assert.equal(soft.over, false);
  assert.equal(soft.score, 1);

  const highAndClean = falling(0.1);
  highAndClean.y = Dune.terrainHeight(highAndClean.x) - Dune.radius - 0.0001;
  highAndClean.peakClearance = 0.2;
  assert.equal(Dune.step(highAndClean, 0.01), 'land');
  assert.equal(highAndClean.score, 3);

  const heldThroughLanding = falling(0.1);
  heldThroughLanding.y = Dune.terrainHeight(heldThroughLanding.x) - Dune.radius - 0.0001;
  Dune.setHeld(heldThroughLanding, true);
  assert.equal(Dune.step(heldThroughLanding, 0.01), 'land');
  assert.equal(heldThroughLanding.held, true);

  const hard = falling(0.8);
  assert.equal(Dune.step(hard, 0.01), 'crash');
  assert.equal(hard.over, true);
  assert.equal(Dune.step(hard, 0.01), 'over');
});
