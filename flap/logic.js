const FlapLogic = (() => {
  // Units are board fractions: the board is 1×1 with y pointing down.
  const ground = .88, birdX = .3, radius = .032, hitRadius = .027;
  const gravity = 2.45, lift = .74, maxFall = 1.15;
  const postWidth = .15, spacing = .56, margin = .1;
  const levels = {
    easy: { gap: .32, speed: .27, shift: .22 },
    normal: { gap: .28, speed: .32, shift: .3 },
    hard: { gap: .25, speed: .37, shift: .36 }
  };
  function gapFor(state, previous, random) {
    const min = margin + state.gap / 2, max = Math.max(min, ground - margin - state.gap / 2);
    // Limit each change so the next gap is always reachable at the current speed.
    const low = previous == null ? min : Math.max(min, previous - state.shift);
    const high = previous == null ? max : Math.min(max, previous + state.shift);
    return low + random() * (high - low);
  }
  function create(level = 'normal', random = Math.random) {
    const config = levels[level] || levels.normal;
    return { ...config, bird: { y: .44, vy: 0 }, posts: [], score: 0, distance: 0, started: false, over: false, random };
  }
  function flap(state) {
    if (state.over) return false;
    state.started = true;
    state.bird.vy = -lift;
    return true;
  }
  function hitsRect(x, y, r, left, top, right, bottom) {
    if (bottom <= top) return false;
    const dx = x - Math.max(left, Math.min(x, right)), dy = y - Math.max(top, Math.min(y, bottom));
    return dx * dx + dy * dy < r * r;
  }
  function speedOf(state) { return state.speed + Math.min(state.score, 40) * .002; }
  function step(state, dt, random = state.random || Math.random) {
    if (state.over) return 'over';
    if (!state.started) return 'wait';
    const bird = state.bird;
    bird.vy = Math.min(maxFall, bird.vy + gravity * dt);
    bird.y += bird.vy * dt;
    if (bird.y < radius) { bird.y = radius; bird.vy = Math.max(0, bird.vy); }
    const move = speedOf(state) * dt;
    state.distance += move;
    for (const post of state.posts) post.x -= move;
    while (state.posts.length && state.posts[0].x + postWidth < -.05) state.posts.shift();
    const last = state.posts[state.posts.length - 1];
    if (!last) state.posts.push({ x: 1.1, y: gapFor(state, null, random), scored: false });
    else if (last.x <= 1.1 - spacing) state.posts.push({ x: last.x + spacing, y: gapFor(state, last.y, random), scored: false });
    if (bird.y + hitRadius >= ground) { bird.y = ground - radius; state.over = true; return 'crash'; }
    for (const post of state.posts) {
      const top = post.y - state.gap / 2, bottom = post.y + state.gap / 2;
      if (hitsRect(birdX, bird.y, hitRadius, post.x, -1, post.x + postWidth, top) ||
          hitsRect(birdX, bird.y, hitRadius, post.x, bottom, post.x + postWidth, ground)) {
        state.over = true; return 'crash';
      }
    }
    let result = 'move';
    for (const post of state.posts) {
      if (!post.scored && post.x + postWidth / 2 < birdX) { post.scored = true; state.score++; result = 'score'; }
    }
    return result;
  }
  return { create, flap, step, gapFor, levels, ground, birdX, radius, hitRadius, postWidth, spacing, margin };
})();
if (typeof module !== 'undefined') module.exports = FlapLogic;
