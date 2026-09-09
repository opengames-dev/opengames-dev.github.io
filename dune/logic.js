(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.DuneLogic = api;
})(typeof window === 'undefined' ? globalThis : window, () => {
  const TAU = Math.PI * 2;
  const radius = 0.026;
  const settings = {
    easy: { startSpeed: 0.43, airGravity: 0.72, diveGravity: 2.25, landingLimit: 0.72 },
    normal: { startSpeed: 0.47, airGravity: 0.82, diveGravity: 2.85, landingLimit: 0.58 },
    hard: { startSpeed: 0.51, airGravity: 0.92, diveGravity: 3.45, landingLimit: 0.47 }
  };

  function terrainHeight(x) {
    return 0.68
      + 0.14 * Math.sin(TAU * x / 1.25)
      + 0.018 * Math.sin(TAU * x / 3.4 + 0.8);
  }

  function terrainSlope(x) {
    return 0.14 * (TAU / 1.25) * Math.cos(TAU * x / 1.25)
      + 0.018 * (TAU / 3.4) * Math.cos(TAU * x / 3.4 + 0.8);
  }

  function create(difficulty = 'normal') {
    const level = settings[difficulty] || settings.normal;
    return {
      difficulty: settings[difficulty] ? difficulty : 'normal',
      config: { ...level },
      x: 0,
      y: terrainHeight(0) - radius,
      vx: level.startSpeed,
      vy: 0,
      speed: level.startSpeed,
      held: false,
      grounded: true,
      climbed: false,
      over: false,
      score: 0,
      landings: 0,
      airTime: 0,
      peakClearance: 0,
      lastLanding: 0
    };
  }

  function setHeld(state, held) {
    if (!state.over) state.held = Boolean(held);
  }

  function step(state, dt) {
    if (state.over || !(dt > 0)) return state.over ? 'over' : 'move';
    const level = state.config;

    if (state.grounded) {
      const slope = terrainSlope(state.x);
      const length = Math.hypot(1, slope);
      const groundGravity = 0.86 + (state.held ? (level.diveGravity - level.airGravity) * 0.65 : 0);
      state.speed += (groundGravity * slope / length + 0.018 - state.speed * 0.018) * dt;
      state.speed = Math.max(0.32, Math.min(0.78, state.speed));
      state.x += state.speed / length * dt;
      const nextSlope = terrainSlope(state.x);
      state.y = terrainHeight(state.x) - radius;
      state.vx = state.speed / Math.hypot(1, nextSlope);
      state.vy = state.vx * nextSlope;

      if (nextSlope < -0.5) state.climbed = true;
      if (!state.held && state.climbed && nextSlope > -0.31 && nextSlope < -0.05) {
        state.grounded = false;
        state.climbed = false;
        state.airTime = 0;
        state.peakClearance = 0;
        state.y -= 0.003;
        state.vy -= 0.18 + state.speed * 0.12;
        return 'launch';
      }
      if (nextSlope > 0.05) state.climbed = false;
      return 'move';
    }

    const gravity = state.held ? level.diveGravity : level.airGravity;
    state.airTime += dt;
    state.vy += gravity * dt;
    state.x += state.vx * dt;
    state.y += state.vy * dt;
    const surface = terrainHeight(state.x);
    state.peakClearance = Math.max(state.peakClearance, surface - radius - state.y);

    if (state.airTime < 0.06 || state.y + radius < surface) return 'move';

    const slope = terrainSlope(state.x);
    const length = Math.hypot(1, slope);
    const impact = (-slope * state.vx + state.vy) / length;
    if (impact > level.landingLimit) {
      state.y = surface - radius;
      state.held = false;
      state.over = true;
      state.lastLanding = 0;
      return 'crash';
    }

    const along = (state.vx + slope * state.vy) / length;
    const clean = impact < level.landingLimit * 0.46;
    const high = state.peakClearance > 0.09;
    const points = 1 + (clean ? 1 : 0) + (high ? 1 : 0);
    state.score += points;
    state.landings++;
    state.lastLanding = points;
    state.grounded = true;
    state.speed = Math.max(0.34, Math.min(0.78, along * 0.98 + (clean ? 0.018 : 0)));
    state.y = surface - radius;
    state.vx = state.speed / length;
    state.vy = state.vx * slope;
    state.climbed = slope < -0.5;
    return 'land';
  }

  return { radius, settings, terrainHeight, terrainSlope, create, setHeld, step };
});
