(() => {
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d", { alpha: false });

  const SCREEN_W = 640;
  const SCREEN_H = 360;
  const FLOOR_Y = 239;
  const BASE_ZOOM = 0.5;
  const CAMERA_Y_REST = 121;
  const STAR_TILE_W = 1500;
  const START_X = 310;
  const TEMP_START_LEVEL = 1;

  const ORANGE = "#ff6a00";
  const WHITE = "rgba(248, 248, 248, 0.96)";
  const DIM_WHITE = "rgba(248, 248, 248, 0.46)";
  const TOKEN_R = 18;
  const LEVEL5_ROCKET_SCALE = 0.67;
  const LEVEL5_SUN = { x: 104, y: 76, r: 36 };
  const LEVEL7_SEQUENCE_THRESHOLD = 0.84;

  const keys = new Set();
  const tokens = [];
  const effects = [];
  const pointer = {
    x: 0,
    y: 0,
    down: false,
    token: null,
    hoverTarget: null,
    offsetX: 0,
    offsetY: 0,
  };

  let jumpQueued = false;
  let lastTime = performance.now();
  let renderScaleX = 1;
  let renderScaleY = 1;
  let nextId = 1;

  const camera = {
    x: START_X + 36,
    y: CAMERA_Y_REST,
    zoom: BASE_ZOOM,
  };

  const player = {
    worldX: START_X,
    y: FLOOR_Y,
    vx: 0,
    vy: 0,
    facing: 1,
    phase: 0,
    grounded: true,
    inputX: 0,
    idlePhase: 0,
    runBlend: 0,
    lean: 0,
    iceFall: 0,
    ruleVelocityTimer: 0,
    symbolTimer: 0,
    landSquash: 0,
    slip: 0,
    appliedAcceleration: null,
    boostFlash: 0,
    charge: "neutral",
  };

  const world = {
    iceFriction: 0,
    windmillSpin: 0,
    windmillTokenSpawned: false,
    windmillAxis: { x: 0, y: 0 },
    spaceStarted: false,
    hasMoved: false,
    flowPulse: 0,
    composedVelocityId: null,
    composedAccelerationId: null,
    trajectoryTimer: 0,
    level4AscentTime: 0,
    sceneIndex: 1,
    lastSceneIndex: 1,
    sceneFlash: 0,
  };

  const WORKBENCH_DEFAULT = { x: 448, y: 30, w: 172, h: 178 };
  const WORKBENCH_LEVEL4 = { x: 448, y: 30, w: 172, h: 178 };

  const workbench = {
    x: WORKBENCH_DEFAULT.x,
    y: WORKBENCH_DEFAULT.y,
    w: WORKBENCH_DEFAULT.w,
    h: WORKBENCH_DEFAULT.h,
    activeToken: null,
    pulse: 0,
  };

  const terrain = {
    ice: { x1: 900, x2: 1420 },
    stairs: [{ x: 1800, w: 240, h: 92 }],
    windmill: { x: 2460, y: FLOOR_Y - 62, r: 48 },
  };

  const CHARGE_STATES = ["positive", "neutral", "negative"];
  const level4 = {
    active: false,
    phase: "electric",
    alpha: 0,
    originX: 0,
    originY: 0,
    chargeApplied: false,
    result: "pending",
    messageTimer: 0,
    resetTimer: 0,
    spaceExitTimer: 0,
    fieldDwell: 0,
    hasEnteredField: false,
    magneticTurn: 0,
    screenShake: 0,
    fieldGlow: 0,
    exitGlow: 0,
    forceLineTimer: 0,
    tokenShake: 0,
    entryCleaned: false,
    electricExitTimer: 0,
    transitionKind: "",
    transitionTimer: 0,
    transitionDuration: 1,
    transitionFrom: null,
    transitionTo: null,
    field: {
      id: "level4_magnetic_field",
      type: "magneticField",
      direction: "intoScreen",
      force: 1.18,
      active: true,
    },
    electricField: {
      id: "level4_electric_field",
      type: "electricField",
      direction: { x: 0, y: -1 },
      force: 720,
      active: true,
      rect: { x: -220, y: 560, w: 820, h: 620 },
      transitionY: 610,
      exitDriftTime: 2,
    },
    electricStart: { x: 80, y: 1030 },
    electricQToken: { x: 138, y: 986 },
    electricMarker: { x: 216, y: 812 },
    playerStart: { x: 80, y: 570 },
    start: { x: 34, y: 600, w: 126, h: 8 },
    fieldRect: { x: -145, y: -140, w: 652, h: 1040 },
    fieldVisualRect: { x: -470, y: -620, w: 1320, h: 2040 },
    exit: { x: 404, y: 286, w: 42, h: 190 },
    pit: { x: 0, y: 690, w: 390, h: 100 },
    qToken: { x: 138, y: 558 },
    eMarker: { x: 210, y: 250 },
  };

  const level5 = {
    active: false,
    alpha: 0,
    originX: 0,
    originY: 0,
    scroll: 0,
    flightSpeed: 84,
    thrust: 0,
    thrustApplied: false,
    rocketPower: 0,
    boarded: false,
    reveal: 0,
    formulaShift: 0,
    messageTimer: 0,
    orbitTrail: [],
    orbitPhase: 0,
    nextLevelTimer: 0,
    complete: false,
    starDrift: 0,
    thrustAnchor: null,
    playerLocal: { x: 190, y: 0 },
    rocketLocal: { x: 390, y: -4 },
    rocketAngle: -0.08,
  };

  const slingshot = {
    active: false,
    alpha: 0,
    timer: 0,
    duration: 8.2,
    phase: "setup",
    result: "pending",
    messageTimer: 0,
    captureTimer: 0,
    preview: 0,
    curvatureApplied: false,
    curvature: 0,
    angle: Math.PI * 0.22,
    startAngle: Math.PI * 0.18,
    endAngle: -Math.PI * 1.18,
    radius: 210,
    semiMajor: 410,
    semiMinor: 145,
    orbitTilt: 0.34,
    captureRadius: 72,
    exitSpeed: 0,
    escapeTimer: 0,
    escapeX: 0,
    escapeY: 0,
    solarSpin: 0,
    fadeOut: 0,
    rocketX: 0,
    rocketY: 0,
    rocketAngle: 0,
    rocketVX: 0,
    rocketVY: 0,
    viewX: 0,
    viewY: 0,
    formula: 0,
    trail: [],
    assistLine: [],
  };

  const level7 = {
    active: false,
    alpha: 0,
    rocketScreen: { x: 306, y: 190 },
    rocketAngle: -0.03,
    targetBeta: 0.35,
    displayBeta: 0.08,
    gamma: 1,
    starDrift: 0,
    starSpeed: 18,
    sequenceActive: false,
    sequenceTime: 0,
    sequenceDuration: 22,
    sequencePlayed: false,
    returningToEarth: false,
    warpPulse: 0,
    messageTimer: 0,
    cameraRoll: 0,
    blackHolePulse: 0,
    earthZoom: 0,
    rocketDrop: { active: false, x: 430, y: -90, vy: 260, angle: -Math.PI / 2, spin: 0, timer: 0 },
  };

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smoothstep = (edge0, edge1, value) => {
    const t = clamp((value - edge0) / Math.max(edge1 - edge0, 0.0001), 0, 1);
    return t * t * (3 - 2 * t);
  };
  const signOrFacing = (value, facing) => (Math.abs(value) > 3 ? Math.sign(value) : facing || 1);
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const normalize = (vector) => {
    const length = Math.hypot(vector.x, vector.y);
    return length < 0.0001 ? { x: 1, y: 0 } : { x: vector.x / length, y: vector.y / length };
  };
  const angleDelta = (from, to) => {
    let delta = to - from;
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    return delta;
  };
  const isScreenOmega = (token) => token?.type === "omega" && Math.hypot(token.direction.x, token.direction.y) < 0.2;
  const isVerticalVelocity = (token) => token?.type === "velocity" && Math.abs(token.direction.y) > 0.65;
  const isChargeToken = (token) => token?.type === "charge";

  function level4ToWorld(point) {
    return {
      x: level4.originX + point.x,
      y: level4.originY + point.y,
    };
  }

  function worldToLevel4(point) {
    return {
      x: point.x - level4.originX,
      y: point.y - level4.originY,
    };
  }

  function level4RectContains(rect, point) {
    return point.x >= rect.x && point.x <= rect.x + rect.w && point.y >= rect.y && point.y <= rect.y + rect.h;
  }

  function level4MagneticStartWorld() {
    return level4ToWorld({ x: level4.playerStart.x, y: level4.start.y });
  }

  function level5ToWorld(point) {
    return {
      x: level5.originX + point.x,
      y: level5.originY - level5.scroll + point.y,
    };
  }

  function level5RocketWorld() {
    return level5ToWorld(level5.rocketLocal);
  }

  function level5RocketToken() {
    return tokens.find((token) => token.id === "level5_rocket");
  }

  function level5TemperatureToken() {
    return tokens.find((token) => token.id === "level5_temperature");
  }

  function level7SpeedToken() {
    return tokens.find((token) => token.id === "level7_speed");
  }

  function level5RocketTarget() {
    const rocket = level5RocketWorld();
    const center = worldToScreen(rocket);
    return {
      x: center.x,
      y: center.y,
      r: 64 * camera.zoom + 26,
    };
  }

  function level7RocketTarget() {
    return {
      x: level7.rocketScreen.x,
      y: level7.rocketScreen.y,
      r: 72,
      angle: level7.rocketAngle,
    };
  }

  function level5RocketNoseScreen(center, angle, scale) {
    const noseX = -92 * LEVEL5_ROCKET_SCALE * scale;
    const noseY = 0;
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    return {
      x: center.x + noseX * c - noseY * s,
      y: center.y + noseX * s + noseY * c,
    };
  }

  function slingshotSun() {
    return {
      x: SCREEN_W * 0.34,
      y: SCREEN_H * 0.28,
    };
  }

  function rotatePoint(x, y, angle) {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    return { x: x * c - y * s, y: x * s + y * c };
  }

  function slingshotOrbitPoint(angle, scale = 1) {
    const sun = slingshotSun();
    const local = rotatePoint(
      Math.cos(angle) * slingshot.semiMajor * scale,
      Math.sin(angle) * slingshot.semiMinor * scale,
      slingshot.orbitTilt,
    );
    return { x: sun.x + local.x, y: sun.y + local.y };
  }

  function slingshotTangentAngle(angle, counterClockwise = true) {
    const dx = -Math.sin(angle) * slingshot.semiMajor;
    const dy = Math.cos(angle) * slingshot.semiMinor;
    const tangent = rotatePoint(dx, dy, slingshot.orbitTilt);
    return Math.atan2(tangent.y, tangent.x) + (counterClockwise ? 0 : Math.PI);
  }

  function slingshotToken() {
    return tokens.find((token) => token.id === "slingshot_s");
  }

  function slingshotRocketTarget() {
    if (!slingshot.active) {
      return { x: 0, y: 0, r: 0 };
    }
    return {
      x: slingshot.rocketX - slingshot.viewX,
      y: slingshot.rocketY - slingshot.viewY,
      r: 36,
    };
  }

  function slingshotCurveTokenPoint() {
    return slingshotOrbitPoint(Math.PI * 0.04, 1);
  }

  function slingshotScreen(point) {
    return {
      x: point.x - slingshot.viewX,
      y: point.y - slingshot.viewY,
    };
  }

  function sampleSlingshotPath(curvature = slingshot.curvature || 0, count = 52) {
    const path = [];
    const amount = clamp(curvature / 100, 0, 1);
    const endAngle = lerp(-Math.PI * 0.1, slingshot.endAngle, amount);
    for (let i = 0; i < count; i += 1) {
      const t = i / Math.max(1, count - 1);
      const angle = lerp(slingshot.startAngle, endAngle, smoothstep(0, 1, t));
      const tighten = 1 - smoothstep(0.2, 0.68, t) * amount * 0.34;
      path.push(slingshotOrbitPoint(angle, tighten));
    }
    return path;
  }

  function drawSmoothScreenPath(points) {
    if (points.length < 2) {
      return;
    }
    const first = slingshotScreen(points[0]);
    ctx.beginPath();
    ctx.moveTo(first.x, first.y);
    for (let i = 1; i < points.length - 1; i += 1) {
      const current = slingshotScreen(points[i]);
      const next = slingshotScreen(points[i + 1]);
      ctx.quadraticCurveTo(current.x, current.y, (current.x + next.x) * 0.5, (current.y + next.y) * 0.5);
    }
    const last = slingshotScreen(points[points.length - 1]);
    ctx.lineTo(last.x, last.y);
  }

  function level4TransitionProgress() {
    if (level4.transitionDuration <= 0) {
      return 1;
    }
    return 1 - clamp(level4.transitionTimer / level4.transitionDuration, 0, 1);
  }

  function level4TransitionSceneMix() {
    if (level4.phase === "electricToMagnetic") {
      return smoothstep(0.18, 0.82, level4TransitionProgress());
    }
    return level4.phase === "magnetic" ? 1 : 0;
  }

  function level4TransitionChargeAlpha() {
    if (level4.transitionKind !== "electricToMagnetic") {
      return 1;
    }
    return 1 - smoothstep(0.52, 0.86, level4TransitionProgress());
  }

  function isLevel4AutoTransition() {
    return level4.active && (level4.phase === "spaceToElectric" || level4.phase === "electricToMagnetic");
  }

  function isLevel4ElectricPhase() {
    return level4.phase === "electric" || level4.phase === "spaceToElectric";
  }

  function lockAutoTransitionInput() {
    jumpQueued = false;
    keys.clear();
    pointer.down = false;
    pointer.token = null;
    pointer.hoverTarget = null;
    workbench.activeToken = null;
  }

  function isInsideMagneticField(point, field = level4.fieldRect) {
    return (
      point.x >= field.x
      && point.x <= field.x + field.w
      && point.y >= field.y
      && point.y <= field.y + field.h
    );
  }

  function isInsideElectricField(point, field = level4.electricField.rect) {
    return (
      point.x >= field.x
      && point.x <= field.x + field.w
      && point.y >= field.y
      && point.y <= field.y + field.h
    );
  }

  function isInsideLevel4Exit(point) {
    return (
      point.x > level4.exit.x - 34
      && point.x < level4.exit.x + level4.exit.w + 84
      && point.y > level4.exit.y - 74
      && point.y < level4.exit.y + level4.exit.h + 58
    );
  }

  function isLevel4ExitReached(dt) {
    if (player.charge !== "negative") {
      return false;
    }
    const samples = [
      { x: player.worldX, y: player.y - 74 },
      { x: player.worldX, y: player.y - 42 },
      { x: player.worldX, y: player.y - 10 },
      { x: player.worldX + player.vx * dt * 0.45, y: player.y - 42 + player.vy * dt * 0.45 },
    ];
    return samples.some((point) => isInsideLevel4Exit(worldToLevel4(point)));
  }

  function tokenDirection(type, direction) {
    const vector = direction || { x: 1, y: 0 };
    if (type === "omega" && Math.hypot(vector.x, vector.y) < 0.2) {
      return { x: 0, y: 0 };
    }
    return normalize(vector);
  }

  function mulberry32(seed) {
    return () => {
      let t = (seed += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const random = mulberry32(20260530);

  function gaussian() {
    const u = Math.max(random(), 0.0001);
    const v = Math.max(random(), 0.0001);
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(Math.PI * 2 * v);
  }

  function buildStars() {
    const layers = [
      { count: 42, parallax: 0.08, yParallax: 0.035, min: 0.35, max: 0.9, alpha: 0.38 },
      { count: 76, parallax: 0.18, yParallax: 0.06, min: 0.42, max: 1.18, alpha: 0.68 },
      { count: 44, parallax: 0.31, yParallax: 0.09, min: 0.72, max: 1.58, alpha: 0.88 },
    ];

    return layers.map((layer, layerIndex) => {
      const stars = [];
      for (let i = 0; i < layer.count; i += 1) {
        const clustered = random() < (layerIndex === 1 ? 0.42 : 0.24);
        const clusterX = random() < 0.58 ? -250 : 260;
        const clusterY = random() < 0.72 ? -16 : -126;
        stars.push({
          x: clustered ? clusterX + gaussian() * (72 + layerIndex * 18) : random() * STAR_TILE_W - STAR_TILE_W / 2,
          y: clustered ? clusterY + gaussian() * (54 + layerIndex * 11) : random() * 310 - 222,
          size: lerp(layer.min, layer.max, random()),
          alpha: layer.alpha * lerp(0.32, 1, random()),
          twinkle: lerp(0.6, 2.4, random()),
          cool: random() < 0.17,
        });
      }
      return { ...layer, stars };
    });
  }

  const starLayers = buildStars();

  function buildLevel7Stars() {
    const stars = [];
    for (let i = 0; i < 360; i += 1) {
      const band = random() < 0.58 ? gaussian() * 75 : (random() * SCREEN_H - SCREEN_H / 2);
      stars.push({
        x: random() * 2600,
        y: SCREEN_H / 2 + band,
        z: lerp(0.22, 1.35, random()),
        size: lerp(0.45, 1.75, random()),
        alpha: lerp(0.26, 0.98, random()),
        tint: random() < 0.5 ? "white" : (random() < 0.5 ? "blue" : "red"),
        twinkle: lerp(0.7, 2.6, random()),
      });
    }
    return stars;
  }

  const level7Stars = buildLevel7Stars();

  function level7PhaseWindows(t) {
    return {
      warp: 1 - smoothstep(0.2, 0.34, t),
      approach: smoothstep(0.22, 0.42, t) * (1 - smoothstep(0.54, 0.64, t)),
      capture: smoothstep(0.48, 0.64, t) * (1 - smoothstep(0.7, 0.78, t)),
      fall: smoothstep(0.62, 0.78, t) * (1 - smoothstep(0.9, 0.97, t)),
      earth: smoothstep(0.78, 0.96, t),
      blackout: smoothstep(0.965, 1, t),
    };
  }

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    renderScaleX = canvas.width / SCREEN_W;
    renderScaleY = canvas.height / SCREEN_H;
  }

  function canvasPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * SCREEN_W,
      y: ((event.clientY - rect.top) / rect.height) * SCREEN_H,
    };
  }

  function worldToScreen(point) {
    const shake = level4.active && level4.screenShake > 0
      ? {
        x: Math.sin(world.flowPulse * 71) * level4.screenShake * 3.5,
        y: Math.cos(world.flowPulse * 83) * level4.screenShake * 2.2,
      }
      : { x: 0, y: 0 };
    return {
      x: (point.x - camera.x) * camera.zoom + SCREEN_W / 2 + shake.x,
      y: (point.y - camera.y) * camera.zoom + SCREEN_H / 2 + shake.y,
    };
  }

  function screenToWorld(point) {
    return {
      x: (point.x - SCREEN_W / 2) / camera.zoom + camera.x,
      y: (point.y - SCREEN_H / 2) / camera.zoom + camera.y,
    };
  }

  function floorScreenY() {
    return worldToScreen({ x: 0, y: FLOOR_Y }).y;
  }

  function rectContains(rect, point) {
    return point.x >= rect.x && point.x <= rect.x + rect.w && point.y >= rect.y && point.y <= rect.y + rect.h;
  }

  function playerHeadTarget() {
    return worldToScreen({ x: player.worldX + player.facing * 9, y: player.y - 76 });
  }

  function level5PlayerTarget() {
    const center = worldToScreen({ x: player.worldX, y: player.y - 36 });
    return {
      x: center.x,
      y: center.y,
      r: 56 + camera.zoom * 52,
    };
  }

  function iceRuleTarget() {
    const iceCenter = worldToScreen({ x: (terrain.ice.x1 + terrain.ice.x2) / 2, y: FLOOR_Y - 31 });
    const iceScreenStart = worldToScreen({ x: terrain.ice.x1, y: FLOOR_Y }).x;
    const iceScreenEnd = worldToScreen({ x: terrain.ice.x2, y: FLOOR_Y }).x;
    return {
      x1: Math.min(iceScreenStart, iceScreenEnd) - 20,
      x2: Math.max(iceScreenStart, iceScreenEnd) + 20,
      y: iceCenter.y,
    };
  }

  function windmillRuleTarget() {
    const windmill = terrain.windmill;
    const center = worldToScreen({ x: windmill.x, y: windmill.y });
    return {
      x: center.x,
      y: center.y,
      r: windmill.r * camera.zoom + 24,
    };
  }

  function dropTargetAt(token, point) {
    if (!token) {
      return null;
    }
    if (rectContains(workbench, point)) {
      if (level4.active && token.type !== "charge") {
        return null;
      }
      if (level5.active && token.type !== "temperature") {
        return null;
      }
      if (slingshot.active && token.type !== "curvature") {
        return null;
      }
      if (level7.active && token.role !== "level7_speed") {
        return null;
      }
      return "workbench";
    }
    if (level7.active && token.role === "level7_speed") {
      const target = level7RocketTarget();
      if (distance(point, target) < target.r) {
        return "level7Rocket";
      }
      return null;
    }
    if (slingshot.active && token.type === "curvature") {
      const target = slingshotRocketTarget();
      if (distance(point, target) < target.r + 18) {
        return "rocket";
      }
    }
    if (level5.active && token.type === "temperature") {
      const target = level5RocketTarget();
      if (distance(point, target) < target.r) {
        return "rocket";
      }
    }
    if (level5.active && token.type === "rocket") {
      const target = level5PlayerTarget();
      if (distance(point, target) < target.r) {
        return "player";
      }
    }
    if ((token.type === "velocity" || token.type === "acceleration" || (level4.active && token.type === "charge")) && distance(point, playerHeadTarget()) < 58) {
      return "player";
    }
    if (level5.active && token.type === "rocket" && distance(point, playerHeadTarget()) < 72) {
      return "player";
    }
    const ice = iceRuleTarget();
    if (token.type === "mu" && point.x > ice.x1 && point.x < ice.x2 && Math.abs(point.y - ice.y) < 80) {
      return "ice";
    }
    if (token.type === "omega" && distance(point, windmillRuleTarget()) < windmillRuleTarget().r) {
      return "windmill";
    }
    return null;
  }

  function addEffect(config) {
    effects.push({
      type: config.type,
      x: config.x,
      y: config.y,
      screen: Boolean(config.screen),
      direction: config.direction || { x: 1, y: 0 },
      color: config.color || ORANGE,
      ttl: config.ttl || 0.55,
      life: config.ttl || 0.55,
      value: config.value || 1,
    });
  }

  function tokenLabel(token) {
    if (token.type === "mu") {
      return `μ=${token.value.toFixed(1).replace(".0", "")}`;
    }
    if (token.type === "charge") {
      return token.labels?.[token.stateValue] || "q0";
    }
    if (token.type === "temperature") {
      return token.mode === "bench" ? "T" : `T=${Math.round(token.value)}`;
    }
    if (token.type === "curvature") {
      return "s";
    }
    if (token.type === "omega") {
      return "ω";
    }
    if (token.type === "acceleration") {
      return "a";
    }
    if (token.type === "rocket") {
      return "";
    }
    return "v";
  }

  function directionMark(vector, token = null) {
    if (token && isScreenOmega(token)) {
      return token.spin >= 0 ? "⊙" : "⊗";
    }
    if (Math.abs(vector.y) > Math.abs(vector.x) * 1.4) {
      return vector.y < 0 ? "↑" : "↓";
    }
    if (Math.abs(vector.x) > Math.abs(vector.y) * 1.4) {
      return vector.x < 0 ? "←" : "→";
    }
    if (vector.x < 0 && vector.y < 0) return "↖";
    if (vector.x > 0 && vector.y < 0) return "↗";
    if (vector.x < 0 && vector.y > 0) return "↙";
    return "↘";
  }

  function addToken(config) {
    const token = {
      id: config.id || `token_${nextId++}`,
      type: config.type,
      value: config.value ?? 1,
      direction: tokenDirection(config.type, config.direction),
      spin: config.spin ?? 1,
      worldX: config.worldX ?? START_X,
      worldY: config.worldY ?? FLOOR_Y - 90,
      screenX: config.screenX ?? 0,
      screenY: config.screenY ?? 0,
      homeX: config.worldX ?? START_X,
      homeY: config.worldY ?? FLOOR_Y - 90,
      mode: config.mode || "world",
      role: config.role || "",
      attachSlot: config.attachSlot || 0,
      generated: Boolean(config.generated),
      visible: config.visible !== false,
      draggable: config.draggable !== false,
      stateValue: config.stateValue || "neutral",
      states: config.states || null,
      labels: config.labels || null,
      validState: config.validState || null,
      target: config.target || "",
      slot: -1,
      flash: 0,
      pop: config.pop || 0,
    };
    tokens.push(token);
    return token;
  }

  function initTokens() {
    addToken({
      id: "v_head",
      type: "velocity",
      value: 2.6,
      direction: { x: 1, y: 0 },
      mode: "head",
      role: "starter",
      visible: false,
    });
    addToken({
      id: "mu_ice",
      type: "mu",
      value: 0,
      worldX: (terrain.ice.x1 + terrain.ice.x2) / 2,
      worldY: FLOOR_Y - 38,
      role: "ice",
    });
    addToken({
      id: "v_ice",
      type: "velocity",
      value: 4.4,
      direction: { x: 1, y: 0 },
      worldX: terrain.ice.x1 - 95,
      worldY: FLOOR_Y - 88,
      role: "ice_boost",
    });
  }

  function spawnLevel4ChargeToken() {
    if (tokens.some((token) => token.id === "level4_charge")) {
      return;
    }
    const point = level4ToWorld(level4.electricQToken);
    addToken({
      id: "level4_charge",
      type: "charge",
      label: "q",
      stateValue: "positive",
      states: CHARGE_STATES,
      labels: {
        positive: "q+",
        neutral: "q0",
        negative: "q-",
      },
      validState: "negative",
      target: "player",
      mode: "world",
      worldX: point.x,
      worldY: point.y,
      role: "level4_charge",
      visible: true,
      draggable: true,
    });
  }

  function spawnLevel5RocketToken() {
    if (level5RocketToken()) {
      return;
    }
    const point = level5RocketWorld();
    addToken({
      id: "level5_rocket",
      type: "rocket",
      value: 0,
      mode: "world",
      worldX: point.x,
      worldY: point.y,
      role: "level5_rocket",
      pop: 1,
    });
  }

  function spawnLevel5TemperatureToken() {
    if (level5TemperatureToken()) {
      return;
    }
    const rocket = level5RocketWorld();
    addToken({
      id: "level5_temperature",
      type: "temperature",
      value: 0,
      direction: { x: 0, y: 0 },
      mode: "world",
      worldX: rocket.x + 112,
      worldY: rocket.y - 48,
      role: "level5_temperature",
      pop: 1,
    });
  }

  function spawnLevel7SpeedToken() {
    const existing = level7SpeedToken();
    if (existing) {
      existing.mode = "world";
      existing.slot = -1;
      existing.worldX = -48;
      existing.worldY = -48;
      existing.screenX = 138;
      existing.screenY = 220;
      existing.homeX = existing.worldX;
      existing.homeY = existing.worldY;
      existing.visible = true;
      existing.draggable = true;
      existing.value = 3.5;
      existing.direction = { x: 1, y: 0 };
      existing.flash = 1;
      existing.pop = 1;
      return existing;
    }
    return addToken({
      id: "level7_speed",
      type: "velocity",
      value: 3.5,
      direction: { x: 1, y: 0 },
      mode: "world",
      worldX: -48,
      worldY: -48,
      screenX: 138,
      screenY: 220,
      role: "level7_speed",
      pop: 1,
    });
  }

  function spawnSlingshotToken() {
    if (slingshotToken()) {
      return;
    }
    const point = slingshotCurveTokenPoint();
    addToken({
      id: "slingshot_s",
      type: "curvature",
      value: 0,
      direction: { x: -1, y: -1 },
      mode: "world",
      worldX: point.x,
      worldY: point.y,
      role: "slingshot_curve",
      pop: 1,
      flash: 1,
    });
  }

  function tokenCenter(token) {
    if (token.mode === "drag") {
      return { x: token.screenX, y: token.screenY };
    }
    if (token.mode === "bench") {
      return { x: token.screenX, y: token.screenY };
    }
    if (token.role === "level7_speed" && token.mode === "world") {
      return { x: token.screenX, y: token.screenY };
    }
    if (token.mode === "attached") {
      const fade = level4.phase === "electricToMagnetic"
        ? level4TransitionChargeAlpha()
        : 1;
      return worldToScreen({ x: player.worldX - 36 - (1 - fade) * 10, y: player.y - 58 - (1 - fade) * 8 });
    }
    if (token.mode === "head") {
      if (isVerticalVelocity(token)) {
        return worldToScreen({ x: player.worldX - 58, y: player.y - 44 });
      }
      return worldToScreen({ x: player.worldX + player.facing * 12, y: player.y - 98 });
    }
    if (token.role === "slingshot_curve") {
      return slingshotScreen({ x: token.worldX, y: token.worldY });
    }
    return worldToScreen({ x: token.worldX, y: token.worldY });
  }

  function tokenRadius(token) {
    if (token.type === "rocket") {
      return 48;
    }
    if (token.mode === "head") {
      return isVerticalVelocity(token) ? 24 : 13;
    }
    if (token.mode === "bench") {
      return 11;
    }
    if (token.mode === "drag") {
      return 16;
    }
    if (token.mode === "attached") {
      return 15;
    }
    if (isChargeToken(token)) {
      return 17;
    }
    if (token.type === "temperature") {
      return 17;
    }
    if (token.type === "curvature") {
      return 18;
    }
    return 15;
  }

  function removeFromWorkbench(token) {
    if (token.mode !== "bench") {
      return;
    }
    token.mode = "drag";
    token.slot = -1;
    if (workbench.activeToken === token) {
      workbench.activeToken = null;
    }
  }

  function firstFreeSlot() {
    const occupied = new Set(tokens.filter((token) => token.mode === "bench" && token.slot >= 0).map((token) => token.slot));
    for (let index = 0; index < 3; index += 1) {
      if (!occupied.has(index)) {
        return index;
      }
    }
    return 1;
  }

  function workbenchMetrics() {
    return {
      titleY: workbench.y + 17,
      headerY: workbench.y + 39,
      topLineY: workbench.y + 53,
      rowGap: 32,
      firstRowY: workbench.y + 70,
      outRowY: workbench.y + workbench.h - 22,
      varX: workbench.x + 25,
      valueX: workbench.x + 79,
      dirX: workbench.x + 145,
      valueMinusX: workbench.x + 91,
      valuePlusX: workbench.x + 116,
      dirButtonX: workbench.x + 149,
      splitVarX: workbench.x + 54,
      splitValueX: workbench.x + 122,
    };
  }

  function slotPoint(slot) {
    const metrics = workbenchMetrics();
    const rowY = metrics.firstRowY + slot * metrics.rowGap;
    const points = [
      { x: metrics.varX, y: rowY },
      { x: metrics.varX, y: rowY },
      { x: metrics.varX, y: rowY },
      { x: metrics.varX, y: metrics.outRowY },
    ];
    return points[slot] || points[1];
  }

  function placeInWorkbench(token, slot = firstFreeSlot()) {
    if (level4.active && token.type === "charge") {
      player.charge = "neutral";
      level4.chargeApplied = false;
    }
    token.mode = "bench";
    token.slot = slot;
    const point = slotPoint(slot);
    token.screenX = point.x;
    token.screenY = point.y;
    token.dragOrigin = null;
    token.visible = true;
    token.draggable = true;
    workbench.activeToken = token;
    workbench.pulse = 1;
    updateWorkbenchOutputs();
  }

  function attachChargeToPlayer(token) {
    player.charge = token.stateValue || "neutral";
    level4.chargeApplied = true;
    token.mode = "attached";
    token.slot = -1;
    token.visible = true;
    token.draggable = true;
    token.dragOrigin = null;
    token.flash = 1;
    if (workbench.activeToken === token) {
      workbench.activeToken = null;
    }
    level4.fieldGlow = Math.max(level4.fieldGlow, player.charge === "negative" ? 0.72 : 0.24);
    if (player.charge === "positive") {
      level4.tokenShake = 0.35;
    }
  }

  function boardLevel5Rocket(token) {
    if (!level5.active || level5.boarded) {
      return;
    }
    level5.boarded = true;
    level5.messageTimer = 1.2;
    token.visible = false;
    token.draggable = false;
    token.mode = "world";
    token.slot = -1;
    token.dragOrigin = null;
    workbench.activeToken = null;
    spawnLevel5TemperatureToken();
  }

  function applyTokenToRocket(token) {
    if (!level5.active || token.type !== "temperature") {
      return false;
    }
    const power = clamp(token.value, 0, 1800);
    token.value = power;
    token.mode = "world";
    token.slot = -1;
    token.dragOrigin = null;
    token.visible = true;
    token.draggable = true;
    token.flash = 1;
    const rocket = level5RocketWorld();
    token.worldX = rocket.x + 112;
    token.worldY = rocket.y - 48;
    token.homeX = token.worldX;
    token.homeY = token.worldY;
    if (workbench.activeToken === token) {
      workbench.activeToken = null;
    }
    if (power > 0) {
      level5.thrustApplied = true;
      level5.rocketPower = power;
      level5.messageTimer = 1.2;
      const anchor = level5RocketWorld();
      level5.thrustAnchor = { x: anchor.x, y: anchor.y };
      token.visible = false;
      token.draggable = false;
    } else {
      level5.thrustApplied = false;
      level5.rocketPower = 0;
      level5.thrust = 0;
      level5.messageTimer = 0.8;
    }
    return true;
  }

  function applyTokenToSlingshotRocket(token) {
    if (!slingshot.active || token.type !== "curvature") {
      return false;
    }
    slingshot.curvature = clamp(token.value, 0, 100);
    slingshot.curvatureApplied = true;
    slingshot.phase = "capture";
    slingshot.timer = 0;
    slingshot.captureTimer = 0;
    slingshot.result = "pending";
    slingshot.messageTimer = 0.2;
    slingshot.assistLine = sampleSlingshotPath(slingshot.curvature, 60);
    token.mode = "world";
    token.slot = -1;
    token.visible = false;
    token.draggable = false;
    token.dragOrigin = null;
    token.flash = 1;
    if (workbench.activeToken === token) {
      workbench.activeToken = null;
    }
    workbench.pulse = 0.6;
    return true;
  }

  function level7BetaFromToken(token) {
    return clamp((token?.value || 0) / 10, 0.05, 0.96);
  }

  function applyLevel7SpeedToRocket(token) {
    if (!level7.active || token.role !== "level7_speed") {
      return false;
    }
    level7.targetBeta = level7BetaFromToken(token);
    token.mode = "world";
    token.slot = -1;
    token.screenX = 138;
    token.screenY = 220;
    token.worldX = -48;
    token.worldY = -48;
    token.visible = !level7.sequenceActive;
    token.draggable = !level7.sequenceActive;
    token.flash = 1;
    token.dragOrigin = null;
    if (workbench.activeToken === token) {
      workbench.activeToken = null;
    }
    if (level7.targetBeta >= LEVEL7_SEQUENCE_THRESHOLD) {
      startLevel7Sequence();
    } else {
      level7.messageTimer = 1.1;
      workbench.pulse = 0.7;
    }
    return true;
  }

  function setTokenWorld(token, point) {
    const worldPoint = screenToWorld(point);
    token.mode = "world";
    token.slot = -1;
    token.worldX = worldPoint.x;
    token.worldY = worldPoint.y;
    token.homeX = token.worldX;
    token.homeY = token.worldY;
    token.dragOrigin = null;
    if (workbench.activeToken === token) {
      workbench.activeToken = null;
    }
  }

  function createHeadVelocitySnapshot(headToken) {
    const center = tokenCenter(headToken);
    const snapshot = addToken({
      type: "velocity",
      value: headToken.value,
      direction: headToken.direction,
      mode: "drag",
      role: "head_snapshot",
      visible: true,
      screenX: center.x,
      screenY: center.y,
      worldX: player.worldX,
      worldY: player.y - 92,
    });
    snapshot.homeX = player.worldX;
    snapshot.homeY = player.y - 92;
    return snapshot;
  }

  function returnWorkbenchSources(type) {
    for (const source of tokens) {
      if (source.mode !== "bench" || source.generated || source.type !== type) {
        continue;
      }
      if (source.role === "head_snapshot") {
        source.visible = false;
        source.draggable = false;
        source.mode = "world";
        source.slot = -1;
        continue;
      }
      source.mode = "world";
      source.slot = -1;
      source.worldX = source.homeX;
      source.worldY = source.homeY;
      source.flash = 0.35;
    }
    workbench.activeToken = null;
  }

  function restoreTokenToWorkbenchOrigin(token) {
    const origin = token.dragOrigin;
    if (!origin || origin.mode !== "bench") {
      return false;
    }
    token.mode = "bench";
    token.slot = origin.slot;
    const point = slotPoint(origin.slot);
    token.screenX = point.x;
    token.screenY = point.y;
    token.visible = true;
    token.draggable = true;
    token.flash = 0.75;
    token.dragOrigin = null;
    workbench.activeToken = token;
    workbench.pulse = 1;
    return true;
  }

  function clearNonChargeWorkbenchTokensForLevel4() {
    for (const token of tokens) {
      if (token.type === "charge") {
        continue;
      }
      if (token.mode === "bench" || token.mode === "drag" || token.generated || token.role === "head_snapshot" || token.id === "v_composed" || token.id === "a_from_omega") {
        token.mode = "world";
        token.slot = -1;
        token.dragOrigin = null;
        token.visible = false;
        token.draggable = false;
      }
    }
    pointer.token = null;
    pointer.hoverTarget = null;
    workbench.activeToken = null;
    workbench.pulse = 0.75;
  }

  function clearTokensForLevel5() {
    for (const token of tokens) {
      if (token.role === "level5_rocket" || token.role === "level5_temperature") {
        continue;
      }
      if (token.id === "v_head") {
        token.visible = false;
      }
      if (token.mode === "bench" || token.mode === "drag" || token.generated || token.role === "level4_charge" || token.role === "head_snapshot" || token.type === "charge") {
        token.mode = "world";
        token.slot = -1;
        token.dragOrigin = null;
        token.visible = false;
        token.draggable = false;
      }
    }
    pointer.down = false;
    pointer.token = null;
    pointer.hoverTarget = null;
    workbench.activeToken = null;
    workbench.pulse = 0.7;
  }

  function clearTokensForLevel7() {
    for (const token of tokens) {
      if (token.role === "level7_speed") {
        continue;
      }
      if (token.id === "v_head") {
        token.visible = false;
      }
      if (
        token.mode === "bench"
        || token.mode === "drag"
        || token.generated
        || token.role === "level4_charge"
        || token.role === "level5_rocket"
        || token.role === "level5_temperature"
        || token.role === "slingshot_curve"
        || token.role === "head_snapshot"
        || token.type === "charge"
      ) {
        token.mode = "world";
        token.slot = -1;
        token.dragOrigin = null;
        token.visible = false;
        token.draggable = false;
      }
    }
    pointer.down = false;
    pointer.token = null;
    pointer.hoverTarget = null;
    workbench.activeToken = null;
    workbench.pulse = 0.7;
  }

  function clearAppliedPlayerToken(token) {
    if (restoreTokenToWorkbenchOrigin(token)) {
      return;
    }
    token.mode = "world";
    token.slot = -1;
    if (token.generated || token.role === "head_snapshot") {
      token.visible = false;
      token.draggable = false;
    } else {
      token.visible = true;
      token.worldX = token.homeX;
      token.worldY = token.homeY;
      token.flash = 0.35;
    }
    if (workbench.activeToken === token) {
      workbench.activeToken = null;
    }
  }

  function applyTokenToPlayer(token) {
    if (token.type === "rocket") {
      boardLevel5Rocket(token);
      return;
    }
    if (token.type === "charge") {
      attachChargeToPlayer(token);
      return;
    }

    if (token.type === "velocity") {
      const scale = 68;
      player.vx += token.direction.x * token.value * scale;
      player.vy += token.direction.y * token.value * scale;
      player.grounded = false;
      player.boostFlash = 1;
      player.ruleVelocityTimer = Math.max(player.ruleVelocityTimer, 3.6);
      player.iceFall = Math.max(0, player.iceFall - 0.35);
      token.flash = 1;
      if (Math.abs(token.direction.x) > 0.16 && Math.abs(token.direction.y) > 0.16) {
        world.trajectoryTimer = 2.8;
      }
      clearAppliedPlayerToken(token);
    }

    if (token.type === "acceleration") {
      player.appliedAcceleration = {
        x: token.direction.x * token.value * 235,
        y: token.direction.y * token.value * 235,
        ttl: 10,
      };
      player.boostFlash = 1;
      world.spaceStarted = true;
      clearAppliedPlayerToken(token);
    }

    if (workbench.activeToken === token) {
      workbench.activeToken = null;
    }
  }

  function applyTokenToIce(token) {
    if (token.type !== "mu") {
      return false;
    }
    world.iceFriction = clamp(token.value, 0, 1);
    token.mode = "world";
    token.slot = -1;
    token.worldX = (terrain.ice.x1 + terrain.ice.x2) / 2;
    token.worldY = FLOOR_Y - 38;
    token.flash = 1;
    addEffect({
      type: "surface",
      x: token.worldX,
      y: FLOOR_Y,
      color: WHITE,
      ttl: 0.7,
      value: world.iceFriction,
    });
    return true;
  }

  function applyTokenToWindmill(token) {
    if (token.type !== "omega") {
      return false;
    }
    const windmill = terrain.windmill;
    const axisChanged = Math.abs(token.direction.y) > 0.35;
    token.mode = "world";
    token.slot = -1;
    token.worldX = windmill.x;
    token.worldY = windmill.y - 82;
    token.homeX = token.worldX;
    token.homeY = token.worldY;
    token.role = "windmill_applied";
    token.flash = 1;
    workbench.activeToken = null;

    if (!axisChanged) {
      addEffect({
        type: "impulse",
        x: windmill.x,
        y: windmill.y - 20,
        direction: { x: 0, y: -1 },
        color: WHITE,
        ttl: 0.38,
        value: 1,
      });
      return true;
    }

    world.windmillAxis = normalize(token.direction);
    world.windmillSpin = Math.max(world.windmillSpin, token.value + 1.2);
    let acceleration = tokens.find((item) => item.id === "a_from_omega");
    const value = clamp(token.value * 0.8, 1, 7);
    if (!acceleration) {
      acceleration = addToken({
        id: "a_from_omega",
        type: "acceleration",
        value,
        direction: token.direction,
        generated: true,
        mode: "world",
        worldX: windmill.x + 74,
        worldY: windmill.y - 104,
        role: "wind_accel",
      });
    }
    acceleration.visible = true;
    acceleration.mode = "world";
    acceleration.slot = -1;
    acceleration.value = value;
    acceleration.direction = normalize(token.direction);
    acceleration.worldX = windmill.x + 74;
    acceleration.worldY = windmill.y - 104;
    acceleration.homeX = acceleration.worldX;
    acceleration.homeY = acceleration.worldY;
    acceleration.role = "wind_accel";
    acceleration.flash = 1;
    acceleration.pop = 1;
    addEffect({
      type: "impulse",
      x: windmill.x,
      y: windmill.y - 12,
      direction: acceleration.direction,
      color: WHITE,
      ttl: 0.75,
      value,
    });
    return true;
  }

  function dropToken(token, point) {
    const target = dropTargetAt(token, point);
    pointer.hoverTarget = null;

    if (target === "workbench") {
      placeInWorkbench(token);
      return;
    }

    if (target === "player") {
      applyTokenToPlayer(token);
      updateWorkbenchOutputs();
      return;
    }

    if (target === "ice") {
      applyTokenToIce(token);
      updateWorkbenchOutputs();
      return;
    }

    if (target === "windmill") {
      applyTokenToWindmill(token);
      updateWorkbenchOutputs();
      return;
    }

    if (target === "rocket") {
      if (slingshot.active && token.type === "curvature") {
        applyTokenToSlingshotRocket(token);
      } else {
        applyTokenToRocket(token);
      }
      updateWorkbenchOutputs();
      return;
    }

    if (target === "level7Rocket") {
      applyLevel7SpeedToRocket(token);
      updateWorkbenchOutputs();
      return;
    }

    setTokenWorld(token, point);
    updateWorkbenchOutputs();
  }

  function updateWorkbenchOutputs() {
    const benchTokens = tokens.filter((token) => token.mode === "bench" && token.visible);
    if (level4.active) {
      const composedVelocity = tokens.find((token) => token.id === "v_composed");
      if (composedVelocity && composedVelocity.mode === "bench") {
        composedVelocity.visible = false;
      }
      return;
    }
    const velocityTokens = benchTokens.filter((token) => token.type === "velocity" && !token.generated);

    let composedVelocity = tokens.find((token) => token.id === "v_composed");
    if (velocityTokens.length >= 2) {
      const vector = velocityTokens.slice(0, 2).reduce(
        (sum, token) => ({
          x: sum.x + token.direction.x * token.value,
          y: sum.y + token.direction.y * token.value,
        }),
        { x: 0, y: 0 },
      );
      const magnitude = clamp(Math.hypot(vector.x, vector.y) * 1.12, 0.5, 16);
      if (!composedVelocity) {
        composedVelocity = addToken({
          id: "v_composed",
          type: "velocity",
          value: magnitude,
          direction: vector,
          generated: true,
          mode: "bench",
          screenX: slotPoint(3).x,
          screenY: slotPoint(3).y,
        });
      }
      if (pointer.token !== composedVelocity) {
        composedVelocity.visible = true;
        composedVelocity.mode = "bench";
        composedVelocity.slot = 3;
        composedVelocity.screenX = slotPoint(3).x;
        composedVelocity.screenY = slotPoint(3).y;
        composedVelocity.value = magnitude;
        composedVelocity.direction = normalize(vector);
        composedVelocity.flash = Math.max(composedVelocity.flash, 0.55);
      }
      workbench.pulse = Math.max(workbench.pulse, 0.8);
    } else if (composedVelocity && composedVelocity.mode === "bench") {
      composedVelocity.visible = false;
    }

  }

  function findTokenAt(point) {
    for (let index = tokens.length - 1; index >= 0; index -= 1) {
      const token = tokens[index];
      if (!token.visible || !token.draggable) {
        continue;
      }
      const center = tokenCenter(token);
      if (distance(point, center) <= tokenRadius(token) + 8) {
        return token;
      }
    }
    return null;
  }

  function isMoveKey(code) {
    return ["KeyA", "KeyD", "KeyW", "Space", "ArrowLeft", "ArrowRight"].includes(code);
  }

  function isEditKey(code) {
    return ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Minus", "NumpadSubtract", "Equal", "NumpadAdd"].includes(code);
  }

  function setChargeState(token, state) {
    token.stateValue = state;
    token.flash = 1;
    level4.tokenShake = token.stateValue === "positive" ? 0.45 : 0;
  }

  function cycleChargeState(token, step = 1) {
    const states = ["positive", "neutral", "negative"];
    const index = states.indexOf(token.stateValue);
    setChargeState(token, states[(index + step + states.length) % states.length]);
  }

  function applyChargeToPlayer(token) {
    attachChargeToPlayer(token);
    return true;
  }

  function adjustActiveToken(code) {
    const token = workbench.activeToken;
    if (!token || token.mode !== "bench") {
      return false;
    }

    if (token.type === "charge") {
      if (code === "ChargeMinus" || code === "Minus" || code === "NumpadSubtract" || code === "ArrowLeft") {
        setChargeState(token, "negative");
        return true;
      }
      if (code === "ChargePlus" || code === "Equal" || code === "NumpadAdd" || code === "ArrowRight") {
        setChargeState(token, "positive");
        return true;
      }
      if (code === "ChargeState") {
        cycleChargeState(token, 1);
        return true;
      }
      return false;
    }

    if (token.type === "temperature") {
      let changed = false;
      if (code === "ArrowRight" || code === "Equal" || code === "NumpadAdd") {
        token.value += 200;
        changed = true;
      }
      if (code === "ArrowLeft" || code === "Minus" || code === "NumpadSubtract") {
        token.value -= 200;
        changed = true;
      }
      if (!changed) {
        return false;
      }
      token.value = clamp(Math.round(token.value / 100) * 100, 0, 1800);
      token.flash = 1;
      updateWorkbenchOutputs();
      return true;
    }

    if (token.type === "curvature") {
      let changed = false;
      if (code === "ArrowRight" || code === "Equal" || code === "NumpadAdd" || code === "ChargePlus") {
        token.value += 20;
        changed = true;
      }
      if (code === "ArrowLeft" || code === "Minus" || code === "NumpadSubtract" || code === "ChargeMinus") {
        token.value -= 20;
        changed = true;
      }
      if (!changed) {
        return false;
      }
      token.value = clamp(Math.round(token.value / 20) * 20, 0, 100);
      slingshot.preview = token.value;
      slingshot.assistLine = sampleSlingshotPath(token.value, 60);
      token.flash = 1;
      updateWorkbenchOutputs();
      return true;
    }

    if (token.role === "level7_speed") {
      let changed = false;
      if (code === "ArrowRight" || code === "Equal" || code === "NumpadAdd" || code === "ChargePlus") {
        token.value += 0.7;
        changed = true;
      }
      if (code === "ArrowLeft" || code === "Minus" || code === "NumpadSubtract" || code === "ChargeMinus") {
        token.value -= 0.7;
        changed = true;
      }
      if (!changed) {
        return false;
      }
      token.value = clamp(Math.round(token.value * 10) / 10, 0.5, 9.6);
      level7.targetBeta = level7BetaFromToken(token);
      token.flash = 1;
      updateWorkbenchOutputs();
      return true;
    }

    if (code === "ArrowRight") {
      token.value += token.type === "mu" ? 0.2 : 0.4;
    }
    if (code === "ArrowLeft") {
      token.value -= token.type === "mu" ? 0.2 : 0.4;
    }
    if (token.type === "mu") {
      token.value = clamp(Math.round(token.value * 5) / 5, 0, 1);
    } else {
      token.value = clamp(token.value, 0.5, token.type === "velocity" ? 14 : 8);
    }

    if (code === "ArrowUp") {
      token.direction = { x: 0, y: -1 };
    }
    if (code === "ArrowDown") {
      token.direction = { x: 0, y: 1 };
    }

    token.flash = 1;
    updateWorkbenchOutputs();
    return true;
  }

  function workbenchControlAt(point) {
    const token = workbench.activeToken;
    if (!token || token.mode !== "bench") {
      return null;
    }
    const metrics = workbenchMetrics();
    if (token.type === "charge" || token.type === "curvature") {
      const rowY = tokenCenter(token).y;
      const minusButton = { x: metrics.valueMinusX - 10, y: rowY - 10, w: 20, h: 20 };
      const plusButton = { x: metrics.valuePlusX - 10, y: rowY - 10, w: 20, h: 20 };
      if (rectContains(minusButton, point)) {
        return "ChargeMinus";
      }
      if (rectContains(plusButton, point)) {
        return "ChargePlus";
      }
      return null;
    }
    const center = tokenCenter(token);
    if (token.role === "level4_charge" && level4.tokenShake > 0) {
      center.x += Math.sin(world.flowPulse * 42) * 3.5 * level4.tokenShake;
    }
    const controls = [
      { code: "ArrowLeft", x: metrics.valueMinusX, y: center.y },
      { code: "ArrowRight", x: metrics.valuePlusX, y: center.y },
    ];
    if (token.type !== "temperature" && token.type !== "curvature") {
      controls.push(
        { code: "ArrowUp", x: metrics.dirButtonX, y: center.y - 10 },
        { code: "ArrowDown", x: metrics.dirButtonX, y: center.y + 10 },
      );
    }
    return controls.find((control) => distance(point, control) < 12)?.code || null;
  }

  function approach(current, target, maxDelta) {
    if (current < target) {
      return Math.min(current + maxDelta, target);
    }
    return Math.max(current - maxDelta, target);
  }

  function currentSurface() {
    if (player.worldX >= terrain.ice.x1 && player.worldX <= terrain.ice.x2) {
      return {
        type: "ice",
        friction: world.iceFriction,
        traction: world.iceFriction <= 0.04 ? 0 : clamp(world.iceFriction * 0.78 + 0.015, 0.015, 1),
      };
    }
    return { type: "ground", friction: 1, traction: 1 };
  }

  function floorAt(x, y) {
    let floor = FLOOR_Y;
    for (const step of terrain.stairs) {
      const top = FLOOR_Y - step.h;
      if (x > step.x && x < step.x + step.w && y <= top + 34) {
        floor = Math.min(floor, top);
      }
    }
    if (level4.active && level4.phase === "magnetic") {
      for (const platform of [level4.start]) {
        const worldPlatform = level4ToWorld(platform);
        if (x >= worldPlatform.x && x <= worldPlatform.x + platform.w && y <= worldPlatform.y + 34) {
          floor = Math.min(floor, worldPlatform.y);
        }
      }
    }
    return floor;
  }

  function resolveStepWalls(oldX) {
    const margin = 13;
    for (const step of terrain.stairs) {
      const top = FLOOR_Y - step.h;
      const leftFace = step.x - margin;
      const rightFace = step.x + step.w + margin;
      const tooLowToClear = player.y > top + 12;
      if (!tooLowToClear) {
        continue;
      }
      if (oldX <= leftFace && player.worldX > leftFace && player.vx > 0) {
        player.worldX = leftFace;
        player.vx = 0;
        player.landSquash = Math.max(player.landSquash, 0.25);
      }
      if (oldX >= rightFace && player.worldX < rightFace && player.vx < 0) {
        player.worldX = rightFace;
        player.vx = 0;
        player.landSquash = Math.max(player.landSquash, 0.25);
      }
    }
  }

  function updateWindmill(dt) {
    const windmill = terrain.windmill;
    const passed = player.worldX > windmill.x - 70 && player.worldX < windmill.x + 150 && player.y > FLOOR_Y - 155;
    if (passed || world.spaceStarted) {
      world.windmillSpin = approach(world.windmillSpin, 7.5, dt * 2.2);
    } else {
      world.windmillSpin = approach(world.windmillSpin, 0, dt * 0.28);
    }

    if (passed && !world.windmillTokenSpawned) {
      world.windmillTokenSpawned = true;
      addToken({
        id: "omega_windmill",
        type: "omega",
        value: 4.8,
        direction: { x: 0, y: 0 },
        spin: 1,
        worldX: windmill.x,
        worldY: windmill.y - 82,
        role: "windmill",
        pop: 1,
      });
    }
  }

  function startLevel4() {
    const horizontalDrift = clamp(player.vx * 0.18 + 26, -34, 78);
    const verticalDrift = clamp(player.vy * 0.42, -230, -154);
    const transitionTo = {
      x: player.worldX + horizontalDrift,
      y: player.y + verticalDrift,
    };
    lockAutoTransitionInput();
    level4.active = true;
    level4.phase = "spaceToElectric";
    level4.alpha = 0;
    level4.entryCleaned = true;
    level4.originX = transitionTo.x - level4.electricStart.x;
    level4.originY = transitionTo.y - level4.electricStart.y;
    level4.chargeApplied = false;
    level4.result = "transition";
    level4.messageTimer = 0;
    level4.resetTimer = 0;
    level4.spaceExitTimer = 0;
    level4.fieldDwell = 0;
    level4.hasEnteredField = false;
    level4.magneticTurn = 0;
    level4.screenShake = 0;
    level4.fieldGlow = 0.08;
    level4.exitGlow = 0;
    level4.forceLineTimer = 0;
    level4.tokenShake = 0;
    level4.electricExitTimer = 0;
    level4.transitionKind = "spaceToElectric";
    level4.transitionDuration = 1.58;
    level4.transitionTimer = level4.transitionDuration;
    level4.transitionFrom = { x: player.worldX, y: player.y };
    level4.transitionTo = transitionTo;
    clearNonChargeWorkbenchTokensForLevel4();
    spawnLevel4ChargeToken();
    resetLevel4ChargeToken();
    player.vx = (transitionTo.x - player.worldX) / level4.transitionDuration;
    player.vy = (transitionTo.y - player.y) / level4.transitionDuration;
    player.facing = 1;
    player.grounded = false;
    player.appliedAcceleration = null;
    player.landSquash = 0;
    player.boostFlash = 0;
  }

  function setPlayerAtLevel4Start() {
    const localStart = isLevel4ElectricPhase()
      ? level4.electricStart
      : { x: level4.playerStart.x, y: level4.start.y };
    const startPoint = level4ToWorld(localStart);
    player.worldX = startPoint.x;
    player.y = startPoint.y;
    player.vx = 0;
    player.vy = 0;
    player.facing = 1;
    player.grounded = level4.phase === "magnetic";
    const q = tokens.find((token) => token.id === "level4_charge");
    player.charge = q && q.mode === "attached" ? q.stateValue : "neutral";
    player.appliedAcceleration = null;
    player.landSquash = level4.phase === "magnetic" ? 0.7 : 0;
    player.boostFlash = 0;
  }

  function resetLevel4ChargeToken() {
    const q = tokens.find((token) => token.id === "level4_charge");
    if (!q) {
      return;
    }
    const local = isLevel4ElectricPhase() ? level4.electricQToken : level4.qToken;
    const point = level4ToWorld(local);
    if (isLevel4ElectricPhase() || q.mode === "world") {
      q.mode = "world";
      q.slot = -1;
      q.worldX = point.x;
      q.worldY = point.y;
      q.homeX = point.x;
      q.homeY = point.y;
      q.visible = true;
      q.draggable = true;
      q.flash = 0.5;
      q.pop = 1;
      if (isLevel4ElectricPhase()) {
        q.stateValue = "positive";
      }
    }
    if (isLevel4ElectricPhase()) {
      workbench.activeToken = null;
      player.charge = "neutral";
    } else if (q.mode !== "attached") {
      player.charge = "neutral";
    }
  }

  function enterLevel4Magnetic() {
    const q = tokens.find((token) => token.id === "level4_charge");
    level4.phase = "magnetic";
    level4.result = "pending";
    level4.messageTimer = 0;
    level4.resetTimer = 0;
    level4.spaceExitTimer = 0;
    level4.fieldDwell = 0;
    level4.hasEnteredField = false;
    level4.magneticTurn = 0;
    level4.screenShake = 0;
    level4.fieldGlow = 0.2;
    level4.exitGlow = 0;
    level4.forceLineTimer = 0;
    level4.tokenShake = 0;
    level4.electricExitTimer = 0;
    clearNonChargeWorkbenchTokensForLevel4();
    if (q && q.mode !== "bench") {
      q.mode = "attached";
      q.slot = -1;
      q.visible = true;
      q.draggable = true;
      q.flash = 1;
    }
    setPlayerAtLevel4Start();
    if (q && q.mode === "attached") {
      player.charge = q.stateValue;
    }
  }

  function beginElectricToMagneticTransition() {
    const q = tokens.find((token) => token.id === "level4_charge");
    lockAutoTransitionInput();
    level4.phase = "electricToMagnetic";
    level4.transitionKind = "electricToMagnetic";
    level4.transitionDuration = 2.1;
    level4.transitionTimer = level4.transitionDuration;
    level4.transitionFrom = { x: player.worldX, y: player.y };
    level4.transitionTo = level4MagneticStartWorld();
    level4.result = "transition";
    level4.fieldDwell = 0;
    level4.hasEnteredField = false;
    level4.magneticTurn = 0;
    level4.screenShake = 0;
    level4.fieldGlow = 0.14;
    level4.exitGlow = 0;
    level4.forceLineTimer = 0.25;
    player.grounded = false;
    player.facing = 1;
    player.appliedAcceleration = null;
    if (q) {
      q.mode = "attached";
      q.slot = -1;
      q.visible = true;
      q.draggable = false;
      q.flash = 0.35;
    }
  }

  function finishSpaceToElectricTransition() {
    level4.phase = "electric";
    level4.result = "pending";
    level4.transitionKind = "";
    level4.transitionTimer = 0;
    level4.transitionFrom = null;
    level4.transitionTo = null;
    player.vx = 0;
    player.vy = 0;
    player.grounded = false;
    player.charge = "neutral";
    level4.fieldGlow = Math.max(level4.fieldGlow, 0.24);
  }

  function finishElectricToMagneticTransition() {
    const q = tokens.find((token) => token.id === "level4_charge");
    level4.phase = "magnetic";
    level4.result = "pending";
    level4.transitionKind = "";
    level4.transitionTimer = 0;
    level4.transitionFrom = null;
    level4.transitionTo = null;
    level4.electricExitTimer = 0;
    level4.fieldDwell = 0;
    level4.hasEnteredField = false;
    level4.magneticTurn = 0;
    level4.fieldGlow = 0.2;
    player.worldX = level4MagneticStartWorld().x;
    player.y = level4MagneticStartWorld().y;
    player.vx = 0;
    player.vy = 0;
    player.grounded = true;
    player.charge = "neutral";
    if (q) {
      q.stateValue = "positive";
      q.mode = "world";
      q.visible = true;
      q.draggable = true;
      q.flash = 0.7;
      q.pop = 0.5;
      q.worldX = level4ToWorld(level4.qToken).x;
      q.worldY = level4ToWorld(level4.qToken).y;
      q.homeX = q.worldX;
      q.homeY = q.worldY;
    }
  }

  function failLevel4(kind) {
    if (level4.result === "success" || level4.resetTimer > 0) {
      return;
    }
    level4.result = kind;
    level4.messageTimer = 0.78;
    level4.resetTimer = 0.78;
    level4.fieldGlow = kind === "failed-positive" ? 0.04 : Math.max(level4.fieldGlow, 0.18);
    level4.tokenShake = kind === "failed-positive" ? 0.85 : 0.35;
    level4.screenShake = 1;
  }

  function resetLevel4Attempt() {
    setPlayerAtLevel4Start();
    level4.result = "pending";
    level4.messageTimer = 0;
    level4.resetTimer = 0;
    level4.spaceExitTimer = 0;
    level4.fieldDwell = 0;
    level4.hasEnteredField = false;
    level4.magneticTurn = 0;
    level4.screenShake = 0;
    level4.fieldGlow = 0.15;
    level4.exitGlow = 0;
    level4.forceLineTimer = 0;
    level4.tokenShake = 0;
    level4.electricExitTimer = 0;
    clearNonChargeWorkbenchTokensForLevel4();
    resetLevel4ChargeToken();
  }

  function startLevel5() {
    const startX = player.worldX;
    const startY = player.y;
    level4.active = false;
    level4.alpha = 0;
    level4.spaceExitTimer = 0;
    level5.active = true;
    level5.alpha = 0;
    level5.originX = startX - level5.playerLocal.x;
    level5.originY = startY - level5.playerLocal.y;
    level5.scroll = 0;
    level5.flightSpeed = 84;
    level5.thrust = 0;
    level5.thrustApplied = false;
    level5.rocketPower = 0;
    level5.boarded = false;
    level5.reveal = 0;
    level5.formulaShift = 0;
    level5.messageTimer = 0.8;
    level5.rocketAngle = -0.08;
    level5.rocketLocal = { x: 390, y: -4 };
    level5.orbitTrail = [];
    level5.orbitPhase = 0;
    level5.nextLevelTimer = 0;
    level5.complete = false;
    level5.thrustAnchor = null;
    clearTokensForLevel5();
    spawnLevel5RocketToken();
    const rocket = level5RocketToken();
    if (rocket) {
      const point = level5RocketWorld();
      rocket.worldX = point.x;
      rocket.worldY = point.y;
      rocket.homeX = point.x;
      rocket.homeY = point.y;
      rocket.visible = true;
      rocket.draggable = true;
      rocket.mode = "world";
      rocket.flash = 1;
      rocket.pop = 1;
    }
    player.worldX = startX;
    player.y = startY;
    player.vx = 0;
    player.vy = 0;
    player.grounded = false;
    player.inputX = 0;
    player.appliedAcceleration = null;
    player.charge = "neutral";
    const rocketPoint = level5RocketWorld();
    camera.x = rocketPoint.x - 18;
    camera.y = rocketPoint.y - 42;
    camera.zoom = 0.52;
  }

  function updateLevel5(dt) {
    if (!level5.active) {
      return;
    }
    level5.alpha = approach(level5.alpha, 1, dt * 0.7);
    level5.messageTimer = Math.max(0, level5.messageTimer - dt);
    const targetThrust = level5.thrustApplied ? clamp(level5.rocketPower / 1400, 0.16, 1) : 0;
    level5.thrust = approach(level5.thrust, targetThrust, dt * 0.32);
    const targetFlightSpeed = level5.thrustApplied ? 145 + level5.thrust * 470 : 84;
    level5.flightSpeed = approach(level5.flightSpeed, targetFlightSpeed, dt * (level5.thrustApplied ? 95 : 28));
    level5.scroll += level5.flightSpeed * dt;
    level5.starDrift += dt * (16 + level5.thrust * 220);
    level5.reveal = clamp(level5.reveal + (level5.thrustApplied ? dt * (0.06 + level5.thrust * 0.18) : 0), 0, 1);
    level5.formulaShift = approach(level5.formulaShift, level5.thrustApplied ? 1 : 0, dt * 0.42);
    level5.completeT = level5.complete ? clamp(1 - level5.nextLevelTimer / 1.8, 0, 1) : 0;

    if (level5.boarded && level5.thrustApplied) {
      const curveRate = 0.18 + level5.thrust * 0.38;
      level5.orbitPhase += dt * curveRate;
      level5.rocketLocal.x -= (28 + level5.thrust * 92) * dt;
      level5.rocketLocal.y = -4 - level5.reveal * 42;
      level5.rocketAngle = lerp(level5.rocketAngle, -0.18 - level5.reveal * 0.25, clamp(dt * 1.4, 0, 1));
    } else {
      const idleTarget = level5.thrustApplied
        ? -0.18
        : -0.08 + Math.sin(world.flowPulse * 1.6) * 0.045;
      level5.rocketAngle = lerp(level5.rocketAngle, idleTarget, clamp(dt * 1.8, 0, 1));
    }

    const rocketPoint = level5RocketWorld();
    const rocket = level5RocketToken();
    if (rocket && !level5.boarded && rocket.mode !== "drag") {
      rocket.worldX = rocketPoint.x;
      rocket.worldY = rocketPoint.y;
      rocket.homeX = rocketPoint.x;
      rocket.homeY = rocketPoint.y;
      rocket.visible = true;
      rocket.draggable = true;
    }

    const temp = level5TemperatureToken();
    if (temp && temp.mode !== "bench" && temp.mode !== "drag") {
      if (level5.thrustApplied && temp.value > 0) {
        temp.visible = false;
        temp.draggable = false;
      } else {
        temp.worldX = rocketPoint.x + 112;
        temp.worldY = rocketPoint.y - 48;
        temp.homeX = temp.worldX;
        temp.homeY = temp.worldY;
        temp.visible = true;
        temp.draggable = true;
      }
    }

    if (level5.boarded) {
      player.worldX = rocketPoint.x - 2;
      player.y = rocketPoint.y + 15;
    } else {
      const playerPoint = level5ToWorld(level5.playerLocal);
      player.worldX = playerPoint.x;
      player.y = playerPoint.y;
    }
    player.vx = 0;
    player.vy = -level5.flightSpeed;
    player.grounded = false;
    player.inputX = 0;
    player.appliedAcceleration = null;

    if (level5.boarded && level5.thrustApplied && !level5.thrustAnchor) {
      level5.thrustAnchor = { x: rocketPoint.x, y: rocketPoint.y };
    }

    const targetZoom = lerp(0.52, 0.2, smoothstep(0.08, 1, level5.reveal));
    const sunRun = smoothstep(0.5, 1, level5.reveal) * level5.thrust;
    const followX = rocketPoint.x - 18 + level5.thrust * 26;
    const followY = rocketPoint.y - 42;
    const rocketOffsetX = (SCREEN_W * 0.24) / Math.max(targetZoom, 0.001);
    const rocketOffsetY = (SCREEN_H * 0.14) / Math.max(targetZoom, 0.001);
    const sunApproachX = rocketPoint.x - rocketOffsetX;
    const sunApproachY = rocketPoint.y + rocketOffsetY;
    camera.x = lerp(camera.x, lerp(followX, sunApproachX, sunRun), clamp(dt * 4.2, 0, 1));
    camera.y = lerp(camera.y, lerp(followY, sunApproachY, sunRun), clamp(dt * 4.2, 0, 1));
    camera.zoom = lerp(camera.zoom, targetZoom, clamp(dt * 1.7, 0, 1));

    const center = worldToScreen(rocketPoint);
    const scale = clamp(camera.zoom / 0.5, 0.36, 1.08);
    void scale;
    if (level5.boarded && level5.thrustApplied && level5.reveal >= 0.96 && !level5.complete) {
      level5.complete = true;
      level5.nextLevelTimer = Math.max(level5.nextLevelTimer, 1.8);
      level5.messageTimer = Math.max(level5.messageTimer, 1.8);
    }
    void center;
    const wasComplete = level5.complete;
    level5.nextLevelTimer = Math.max(0, level5.nextLevelTimer - dt);
    if (wasComplete && level5.nextLevelTimer <= 0 && !slingshot.active) {
      startSlingshot();
    }
    updateWorkbenchLayout(dt);
  }

  function startSlingshot() {
    slingshot.active = true;
    slingshot.alpha = 0;
    slingshot.timer = 0;
    slingshot.phase = "setup";
    slingshot.result = "pending";
    slingshot.messageTimer = 0;
    slingshot.captureTimer = 0;
    slingshot.preview = 0;
    slingshot.curvatureApplied = false;
    slingshot.curvature = 0;
    slingshot.fadeOut = 0;
    slingshot.formula = 0;
    slingshot.zoomIn = 0;
    slingshot.solarSpin = 0;
    slingshot.startAngle = Math.PI * 0.18;
    slingshot.endAngle = -Math.PI * 1.18;
    slingshot.angle = slingshot.startAngle;
    slingshot.radius = 210;
    slingshot.exitSpeed = 0;
    slingshot.escapeTimer = 0;
    slingshot.escapeX = 0;
    slingshot.escapeY = 0;
    slingshot.viewX = 0;
    slingshot.viewY = 0;
    slingshot.trail = [];
    slingshot.assistLine = [];
    const start = slingshotOrbitPoint(slingshot.startAngle, 1);
    slingshot.rocketX = start.x;
    slingshot.rocketY = start.y;
    slingshot.rocketAngle = slingshotTangentAngle(slingshot.startAngle, true);
    slingshot.rocketVX = 0;
    slingshot.rocketVY = 0;
    level5.thrustApplied = false;
    level5.thrust = 0;
    level5.alpha = 0;
    level5.active = false;
    pointer.token = null;
    pointer.hoverTarget = null;
    workbench.activeToken = null;
    for (const token of tokens) {
      if (token.role === "level5_rocket" || token.role === "level5_temperature") {
        token.visible = false;
        token.draggable = false;
      }
    }
    spawnSlingshotToken();
    const token = slingshotToken();
    if (token) {
      const point = slingshotCurveTokenPoint();
      token.worldX = point.x;
      token.worldY = point.y;
      token.homeX = point.x;
      token.homeY = point.y;
      token.mode = "world";
      token.slot = -1;
      token.value = 0;
      token.visible = true;
      token.draggable = true;
      token.flash = 1;
    }
  }

  function updateSlingshot(dt) {
    if (!slingshot.active) {
      return;
    }
    player.vx = 0;
    player.vy = 0;
    player.grounded = false;
    player.inputX = 0;
    slingshot.timer += dt;
    slingshot.alpha = clamp(slingshot.alpha + dt * 1.6, 0, 1);
    slingshot.zoomIn = clamp(slingshot.zoomIn + dt * 1.4, 0, 1);
    slingshot.formula = clamp(slingshot.formula + dt * 0.55, 0, 1);
    slingshot.messageTimer = Math.max(0, slingshot.messageTimer - dt);
    slingshot.solarSpin += dt * 0.18;

    const token = slingshotToken();
    if (token && token.mode === "world" && token.visible) {
      const point = slingshotCurveTokenPoint();
      token.worldX = point.x;
      token.worldY = point.y;
      token.homeX = point.x;
      token.homeY = point.y;
    }
    if (token?.mode === "bench") {
      slingshot.preview = token.value;
      slingshot.assistLine = sampleSlingshotPath(token.value, 60);
    }

    if (slingshot.phase === "setup") {
      slingshot.angle -= dt * 0.13;
      const minSetupAngle = -Math.PI * 0.04;
      if (slingshot.angle < minSetupAngle) {
        slingshot.angle = slingshot.startAngle;
      }
      const p = slingshotOrbitPoint(slingshot.angle, 1);
      slingshot.rocketX = p.x;
      slingshot.rocketY = p.y;
      slingshot.rocketAngle = slingshotTangentAngle(slingshot.angle, true);
    } else if (slingshot.phase === "capture") {
      const amount = clamp(slingshot.curvature / 100, 0, 1);
      const duration = lerp(3.2, 5.2, amount);
      const t = clamp(slingshot.timer / duration, 0, 1);
      const targetEnd = lerp(-Math.PI * 0.1, slingshot.endAngle, amount);
      slingshot.angle = lerp(slingshot.startAngle, targetEnd, smoothstep(0, 1, t));
      const tighten = 1 - smoothstep(0.2, 0.68, t) * amount * 0.34;
      const p = slingshotOrbitPoint(slingshot.angle, tighten);
      const prevX = slingshot.rocketX;
      const prevY = slingshot.rocketY;
      slingshot.rocketX = p.x;
      slingshot.rocketY = p.y;
      slingshot.rocketVX = (slingshot.rocketX - prevX) / Math.max(dt, 0.001);
      slingshot.rocketVY = (slingshot.rocketY - prevY) / Math.max(dt, 0.001);
      slingshot.rocketAngle = Math.atan2(slingshot.rocketVY, slingshot.rocketVX);
      slingshot.captureTimer += dt;
      const releaseT = lerp(0.86, 0.68, amount);
      if (t >= releaseT && amount >= 0.88) {
        const speed = Math.max(320, Math.hypot(slingshot.rocketVX, slingshot.rocketVY));
        const tangent = normalize({ x: slingshot.rocketVX, y: slingshot.rocketVY });
        slingshot.phase = "escape";
        slingshot.result = "success";
        slingshot.messageTimer = 1.3;
        slingshot.exitSpeed = 290 + amount * 260;
        slingshot.escapeTimer = 0;
        slingshot.escapeX = Math.min(-260, tangent.x * slingshot.exitSpeed - 170 * amount);
        slingshot.escapeY = tangent.y * slingshot.exitSpeed - 42;
        slingshot.rocketVX = tangent.x * speed;
        slingshot.rocketVY = tangent.y * speed;
      } else if (t >= 1) {
        if (amount < 0.45) {
          slingshot.phase = "fail";
          slingshot.result = "missed-capture";
          slingshot.messageTimer = 1.8;
        } else if (amount < 0.88) {
          slingshot.phase = "fail";
          slingshot.result = "offset";
          slingshot.messageTimer = 1.8;
        }
      }
    } else if (slingshot.phase === "escape") {
      slingshot.rocketVX = approach(slingshot.rocketVX, slingshot.escapeX, dt * 190);
      slingshot.rocketVY = approach(slingshot.rocketVY, slingshot.escapeY, dt * 120);
      slingshot.rocketX += slingshot.rocketVX * dt;
      slingshot.rocketY += slingshot.rocketVY * dt;
      slingshot.rocketAngle = Math.atan2(slingshot.rocketVY, slingshot.rocketVX);
      slingshot.escapeTimer += dt;
      const followX = slingshot.rocketX - SCREEN_W * 0.32;
      const followY = slingshot.rocketY - SCREEN_H * 0.42;
      slingshot.viewX = lerp(slingshot.viewX, followX, clamp(dt * 2.8, 0, 1));
      slingshot.viewY = lerp(slingshot.viewY, followY, clamp(dt * 2, 0, 1));
      slingshot.fadeOut = Math.max(slingshot.fadeOut, smoothstep(0.9, 2.1, slingshot.escapeTimer));
      if (slingshot.escapeTimer >= 2.15 && !level7.active) {
        const rocketScreen = slingshotScreen({ x: slingshot.rocketX, y: slingshot.rocketY });
        startLevel7({ rocketScreen, rocketAngle: slingshot.rocketAngle });
        return;
      }
    } else if (slingshot.phase === "fail") {
      const driftX = slingshot.result === "offset" ? 80 : 20;
      const driftY = slingshot.result === "offset" ? -150 : 120;
      slingshot.rocketX += driftX * dt;
      slingshot.rocketY += driftY * dt;
      slingshot.rocketAngle = lerp(slingshot.rocketAngle, Math.atan2(driftY, driftX), clamp(dt * 2, 0, 1));
      if (slingshot.messageTimer <= 0) {
        startSlingshot();
        return;
      }
    }

    if (slingshot.phase !== "setup") {
      slingshot.trail.push({ x: slingshot.rocketX, y: slingshot.rocketY, life: 1 });
      if (slingshot.trail.length > 220) {
        slingshot.trail.shift();
      }
    }
    for (let i = slingshot.trail.length - 1; i >= 0; i -= 1) {
      slingshot.trail[i].life -= dt * (slingshot.phase === "fail" ? 0.34 : 0.12);
      if (slingshot.trail[i].life <= 0) slingshot.trail.splice(i, 1);
    }
    player.worldX = slingshot.rocketX;
    player.y = slingshot.rocketY;
    level5.starDrift += dt * 80;
  }

  function startLevel7(entry = null) {
    level4.active = false;
    level5.active = false;
    slingshot.active = false;
    level7.active = true;
    level7.alpha = entry ? 0.72 : 0;
    level7.rocketScreen = entry?.rocketScreen
      ? { x: entry.rocketScreen.x, y: entry.rocketScreen.y }
      : { x: 316, y: 188 };
    level7.rocketAngle = typeof entry?.rocketAngle === "number" ? entry.rocketAngle : -0.03;
    level7.targetBeta = 0.35;
    level7.displayBeta = 0.08;
    level7.gamma = 1;
    level7.starDrift = 0;
    level7.starSpeed = 18;
    level7.sequenceActive = false;
    level7.sequenceTime = 0;
    level7.sequencePlayed = false;
    level7.returningToEarth = false;
    level7.warpPulse = entry ? 0.65 : 0;
    level7.messageTimer = entry ? 0.65 : 1.2;
    level7.cameraRoll = 0;
    level7.blackHolePulse = 0;
    level7.earthZoom = 0;
    level7.rocketDrop = { active: false, x: 430, y: -90, vy: 260, angle: -Math.PI / 2, spin: 0, timer: 0 };
    clearTokensForLevel7();
    spawnLevel7SpeedToken();
    player.worldX = START_X;
    player.y = FLOOR_Y;
    player.vx = 0;
    player.vy = 0;
    player.grounded = false;
    player.inputX = 0;
    player.appliedAcceleration = null;
    player.charge = "neutral";
    camera.x = START_X + 36;
    camera.y = CAMERA_Y_REST;
    camera.zoom = BASE_ZOOM;
    workbench.x = WORKBENCH_DEFAULT.x;
    workbench.y = WORKBENCH_DEFAULT.y;
    workbench.w = WORKBENCH_DEFAULT.w;
    workbench.h = WORKBENCH_DEFAULT.h;
  }

  function startLevel7Sequence() {
    if (!level7.active || level7.sequenceActive) {
      return;
    }
    level7.sequenceActive = true;
    level7.sequencePlayed = true;
    level7.sequenceTime = 0;
    level7.returningToEarth = false;
    level7.warpPulse = 1;
    level7.blackHolePulse = 0;
    level7.earthZoom = 0;
    level7.messageTimer = 0;
    pointer.token = null;
    pointer.hoverTarget = null;
    workbench.activeToken = null;
    const speed = level7SpeedToken();
    if (speed) {
      speed.mode = "world";
      speed.slot = -1;
      speed.visible = false;
      speed.draggable = false;
      speed.dragOrigin = null;
    }
  }

  function finishLevel7ReturnToLevel1() {
    if (!level7.active || level7.returningToEarth) {
      return;
    }
    level7.returningToEarth = true;
    level7.active = false;
    level7.sequenceActive = false;
    level7.sequenceTime = 0;
    level7.messageTimer = 0;
    pointer.down = false;
    pointer.token = null;
    pointer.hoverTarget = null;
    workbench.activeToken = null;
    for (const token of tokens) {
      if (token.role === "level7_speed") {
        token.mode = "world";
        token.visible = false;
        token.draggable = false;
        token.slot = -1;
      }
    }
    player.worldX = START_X;
    player.y = FLOOR_Y - 210;
    player.vx = 72;
    player.vy = 170;
    player.facing = 1;
    player.grounded = false;
    player.inputX = 0;
    player.phase = 0;
    player.idlePhase = 0;
    player.runBlend = 0;
    player.lean = 0;
    player.landSquash = 0;
    player.appliedAcceleration = null;
    player.charge = "neutral";
    level7.rocketDrop = { active: true, x: 438, y: -86, vy: 250, angle: -Math.PI / 2, spin: 0.18, timer: 0 };
    world.spaceStarted = false;
    world.hasMoved = false;
    world.sceneIndex = 1;
    world.lastSceneIndex = 1;
    world.sceneFlash = 1;
    camera.x = START_X + 36;
    camera.y = CAMERA_Y_REST - 70;
    camera.zoom = BASE_ZOOM;
    workbench.x = WORKBENCH_DEFAULT.x;
    workbench.y = WORKBENCH_DEFAULT.y;
    workbench.w = WORKBENCH_DEFAULT.w;
    workbench.h = WORKBENCH_DEFAULT.h;
  }

  function updateLevel7(dt) {
    if (!level7.active) {
      return;
    }
    level7.alpha = approach(level7.alpha, 1, dt * 1.4);
    level7.messageTimer = Math.max(0, level7.messageTimer - dt);
    level7.warpPulse = Math.max(0, level7.warpPulse - dt * 0.85);
    const speed = level7SpeedToken();
    if (speed && speed.mode !== "drag" && speed.mode !== "bench" && !level7.sequenceActive) {
      speed.screenX = 138 + Math.sin(world.flowPulse * 1.8) * 1.2;
      speed.screenY = 220 + Math.cos(world.flowPulse * 1.4) * 1.0;
      speed.visible = true;
      speed.draggable = true;
      level7.targetBeta = level7BetaFromToken(speed);
    }

    const idleBeta = 0.08;
    if (level7.sequenceActive) {
      level7.sequenceTime += dt;
      const t = clamp(level7.sequenceTime / level7.sequenceDuration, 0, 1);
      const phases = level7PhaseWindows(t);
      const launch = smoothstep(0.02, 0.18, t);
      const tunnel = smoothstep(0.08, 0.28, t) * (1 - phases.earth * 0.55);
      const flare = smoothstep(0.18, 0.35, t) * (1 - smoothstep(0.52, 0.68, t));
      const settle = smoothstep(0.88, 1, t);
      const peakBeta = Math.max(level7.targetBeta, LEVEL7_SEQUENCE_THRESHOLD);
      level7.displayBeta = lerp(idleBeta, peakBeta, launch);
      level7.displayBeta = lerp(level7.displayBeta, 0.96, tunnel * (1 - settle) * 0.88);
      level7.displayBeta = lerp(level7.displayBeta, 0.62, phases.capture * 0.35);
      level7.displayBeta = lerp(level7.displayBeta, 0.22, phases.earth * 0.8);
      level7.starSpeed = 22 + launch * 520 + tunnel * 1420 + flare * 960 + phases.approach * 340 + phases.fall * 1180 - phases.earth * 720;
      const entry = smoothstep(0.58, 0.78, t);
      const earthCentering = phases.earth * (1 - phases.blackout);
      level7.rocketAngle = -0.03
        + Math.sin(t * Math.PI * 8.4) * 0.035 * (1 - phases.earth)
        - launch * 0.04
        - phases.approach * 0.18
        - entry * 0.56
        + phases.earth * 0.38;
      level7.rocketScreen.x = 316
        + Math.sin(t * Math.PI * 5.4) * 16 * tunnel
        - flare * 42
        + phases.approach * 104
        - phases.capture * 74
        - phases.fall * 34
        + earthCentering * 48;
      level7.rocketScreen.y = 188
        + Math.cos(t * Math.PI * 4.2) * 9 * tunnel
        - flare * 6
        - phases.approach * 30
        + phases.capture * 16
        + phases.fall * 34
        - earthCentering * 18;
      level7.cameraRoll = Math.sin(t * Math.PI * 10) * 0.04 * tunnel
        + phases.approach * -0.18
        + Math.sin(t * 42) * 0.03 * phases.capture
        + phases.fall * Math.sin(t * 54) * 0.045
        + phases.earth * 0.08;
      level7.blackHolePulse = Math.max(phases.approach, phases.capture, phases.fall * 0.72);
      level7.earthZoom = phases.earth;
      if (t >= 1) {
        finishLevel7ReturnToLevel1();
      }
    } else {
      level7.displayBeta = approach(level7.displayBeta, idleBeta, dt * 0.9);
      level7.starSpeed = approach(level7.starSpeed, 18, dt * 50);
      level7.rocketAngle = lerp(level7.rocketAngle, -0.03 + Math.sin(world.flowPulse * 1.2) * 0.018, clamp(dt * 2, 0, 1));
      level7.rocketScreen.x = lerp(level7.rocketScreen.x, 316, clamp(dt * 2.4, 0, 1));
      level7.rocketScreen.y = lerp(level7.rocketScreen.y, 188 + Math.sin(world.flowPulse * 1.05) * 2.4, clamp(dt * 2.4, 0, 1));
      level7.cameraRoll = lerp(level7.cameraRoll, 0, clamp(dt * 2, 0, 1));
    }
    const beta = clamp(level7.displayBeta, 0, 0.98);
    level7.gamma = 1 / Math.sqrt(Math.max(0.04, 1 - beta * beta));
    level7.starDrift += level7.starSpeed * dt;
    updateWorkbenchLayout(dt);
  }

  function updateLevel7RocketDrop(dt) {
    if (!level7.rocketDrop.active) {
      return;
    }
    const drop = level7.rocketDrop;
    drop.timer += dt;
    drop.vy += 360 * dt;
    drop.y += drop.vy * dt;
    drop.x += Math.sin(drop.timer * 2.2) * 18 * dt;
    drop.angle += drop.spin * dt;
    drop.spin = approach(drop.spin, 0.7, dt * 0.35);
    if (drop.y > SCREEN_H + 160) {
      drop.active = false;
    }
  }

  function bootTemporaryStartLevel() {
    if (TEMP_START_LEVEL === 4) {
      player.worldX = terrain.windmill.x;
      player.y = -980;
      player.vx = 0;
      player.vy = 0;
      player.grounded = false;
      world.spaceStarted = true;
      world.level4AscentTime = 1;
      world.sceneIndex = 5;
      world.lastSceneIndex = 5;
      startLevel4();
      finishSpaceToElectricTransition();
      setPlayerAtLevel4Start();
      level4.alpha = 1;
      level4.fieldGlow = 0.24;
      workbench.x = WORKBENCH_LEVEL4.x;
      workbench.y = WORKBENCH_LEVEL4.y;
      workbench.w = WORKBENCH_LEVEL4.w;
      workbench.h = WORKBENCH_LEVEL4.h;
      camera.x = level4.originX + 190;
      camera.y = player.y - 118;
      camera.zoom = 0.52;
      return;
    }
    if (TEMP_START_LEVEL === 5) {
      player.worldX = terrain.windmill.x;
      player.y = -1800;
      player.vx = 0;
      player.vy = 0;
      player.grounded = false;
      world.spaceStarted = true;
      world.level4AscentTime = 1;
      world.sceneIndex = 5;
      world.lastSceneIndex = 5;
      startLevel5();
      level5.alpha = 1;
      level5.boarded = true;
      const rocketPoint = level5RocketWorld();
      player.worldX = rocketPoint.x - 2;
      player.y = rocketPoint.y + 15;
      const rocketTok = level5RocketToken();
      if (rocketTok) {
        rocketTok.visible = false;
        rocketTok.draggable = false;
        rocketTok.mode = "world";
      }
      spawnLevel5TemperatureToken();
      camera.x = rocketPoint.x - 18;
      camera.y = rocketPoint.y - 42;
      camera.zoom = 0.52;
      return;
    }
    if (TEMP_START_LEVEL === 6) {
      world.spaceStarted = true;
      world.sceneIndex = 5;
      world.lastSceneIndex = 5;
      startSlingshot();
      slingshot.alpha = 1;
      slingshot.zoomIn = 1;
      slingshot.formula = 1;
      workbench.x = WORKBENCH_LEVEL4.x;
      workbench.y = WORKBENCH_LEVEL4.y;
      workbench.w = WORKBENCH_LEVEL4.w;
      workbench.h = WORKBENCH_LEVEL4.h;
      return;
    }
    if (TEMP_START_LEVEL === 7) {
      startLevel7();
      level7.alpha = 1;
      return;
    }
  }

  function updateWorkbenchLayout(dt) {
    const target = level4.active || slingshot.active ? WORKBENCH_LEVEL4 : WORKBENCH_DEFAULT;
    const amount = clamp(dt * 5, 0, 1);
    workbench.x = lerp(workbench.x, target.x, amount);
    workbench.y = lerp(workbench.y, target.y, amount);
    workbench.w = lerp(workbench.w, target.w, amount);
    workbench.h = lerp(workbench.h, target.h, amount);
    for (const token of tokens) {
      if (token.mode === "bench") {
        const point = slotPoint(token.slot);
        token.screenX = lerp(token.screenX, point.x, amount);
        token.screenY = lerp(token.screenY, point.y, amount);
      }
    }
  }

  function updateLevel4Electric(dt) {
    const head = worldToLevel4({ x: player.worldX, y: player.y - 44 });
    const body = worldToLevel4({ x: player.worldX, y: player.y });
    const inField = isInsideElectricField(head);
    const q = tokens.find((token) => token.id === "level4_charge");

    if (inField && player.charge === "positive" && q?.mode === "attached") {
      player.vx = approach(player.vx, 0, 180 * dt);
      player.vy = approach(player.vy, -360, level4.electricField.force * dt);
      player.grounded = false;
      level4.fieldGlow = 1;
      level4.forceLineTimer = 1;
      level4.hasEnteredField = true;
    }

    if (body.y <= level4.electricField.transitionY && player.charge === "positive") {
      if (level4.electricExitTimer <= 0) {
        level4.electricExitTimer = level4.electricField.exitDriftTime;
      }
      const t = 1 - clamp(level4.electricExitTimer / level4.electricField.exitDriftTime, 0, 1);
      player.vx = approach(player.vx, 92, (95 + t * 120) * dt);
      player.vy = approach(player.vy, -210, 245 * dt);
      level4.forceLineTimer = Math.max(level4.forceLineTimer, 0.35);
      level4.fieldGlow = Math.max(level4.fieldGlow, 0.28 * (1 - t));
      level4.electricExitTimer -= dt;
      if (level4.electricExitTimer <= 0) {
        beginElectricToMagneticTransition();
      }
      return;
    }

    const electric = level4.electricField.rect;
    const outOfElectricBounds = body.x < electric.x - 60
      || body.x > electric.x + electric.w + 60
      || body.y > electric.y + electric.h + 120
      || body.y < electric.y - 160;
    if (outOfElectricBounds) {
      failLevel4("failed-electric");
    }
  }

  function updateLevel4Magnetic(dt) {
    const local = worldToLevel4({ x: player.worldX, y: player.y - 44 });
    const body = worldToLevel4({ x: player.worldX, y: player.y });
    const inField = isInsideMagneticField(local, level4.fieldRect);

    if (inField) {
      level4.hasEnteredField = true;
      level4.fieldDwell += dt;
    } else {
      level4.fieldDwell = Math.max(0, level4.fieldDwell - dt * 0.5);
    }

    if (inField && level4.field.active) {
      const speed = Math.hypot(player.vx, player.vy);
      if (speed > 56 && player.charge !== "neutral") {
        const oldVx = player.vx;
        const oldVy = player.vy;
        const oldAngle = Math.atan2(oldVy, oldVx);
        const sign = player.charge === "positive" ? 1 : -1;
        const omega = level4.field.force;
        player.vx += oldVy * sign * omega * dt;
        player.vy += -oldVx * sign * omega * dt;
        const nextSpeed = Math.hypot(player.vx, player.vy);
        const targetSpeed = clamp(speed, 210, 390);
        if (nextSpeed > 0.001) {
          player.vx = (player.vx / nextSpeed) * targetSpeed;
          player.vy = (player.vy / nextSpeed) * targetSpeed;
        }
        const newAngle = Math.atan2(player.vy, player.vx);
        level4.magneticTurn += Math.abs(angleDelta(oldAngle, newAngle));
        level4.fieldGlow = player.charge === "negative" ? 1 : Math.max(level4.fieldGlow, 0.32);
        level4.forceLineTimer = 1;
        if (level4.magneticTurn >= Math.PI * 2) {
          failLevel4("failed-orbit");
          return;
        }
      } else if (player.charge === "neutral" && Math.abs(player.vy) > 70) {
        level4.fieldGlow = Math.max(level4.fieldGlow, 0.08);
      }
    }

    const reachedExit = isLevel4ExitReached(dt);
    if (reachedExit && level4.result !== "success") {
      level4.result = "success";
      level4.messageTimer = 3.4;
      level4.spaceExitTimer = 3.2;
      level4.exitGlow = 1;
      level4.fieldGlow = 1;
      player.vy = Math.min(player.vy, -120);
      player.vx = Math.max(player.vx, 175);
      player.grounded = false;
      const q = tokens.find((token) => token.id === "level4_charge");
      if (q) {
        q.flash = 1;
      }
      return;
    }

    const leftMagneticField = !isInsideMagneticField(body, level4.fieldRect);
    if (level4.result === "pending" && leftMagneticField) {
      if (player.charge === "positive" || body.x < level4.fieldRect.x) {
        failLevel4("failed-positive");
      } else if (player.charge === "neutral" || body.y < level4.fieldRect.y) {
        failLevel4("failed-neutral");
      } else {
        failLevel4("failed-missed");
      }
    }
  }

  function updateLevel4Transition(dt) {
    if (!level4.transitionKind || !level4.transitionFrom || !level4.transitionTo) {
      return;
    }
    const t = level4TransitionProgress();
    const travel = t;
    player.worldX = lerp(level4.transitionFrom.x, level4.transitionTo.x, travel);
    player.y = lerp(level4.transitionFrom.y, level4.transitionTo.y, travel);
    player.vx = (level4.transitionTo.x - level4.transitionFrom.x) / level4.transitionDuration;
    player.vy = (level4.transitionTo.y - level4.transitionFrom.y) / level4.transitionDuration;
    player.grounded = false;
    player.inputX = 0;
    if (level4.transitionKind === "spaceToElectric") {
      player.charge = "neutral";
      level4.fieldGlow = Math.max(level4.fieldGlow, 0.22 * t);
    } else {
      const q = tokens.find((token) => token.id === "level4_charge");
      const chargeAlpha = level4TransitionChargeAlpha();
      player.charge = chargeAlpha > 0.08 ? "positive" : "neutral";
      if (q) {
        q.visible = chargeAlpha > 0.02;
        q.draggable = false;
      }
      level4.fieldGlow = Math.max(level4.fieldGlow, 0.08 + 0.12 * (1 - chargeAlpha));
      level4.forceLineTimer = Math.max(level4.forceLineTimer, 0.2 * chargeAlpha);
    }
    level4.transitionTimer -= dt;
    if (level4.transitionTimer <= 0) {
      if (level4.transitionKind === "spaceToElectric") {
        finishSpaceToElectricTransition();
      } else {
        finishElectricToMagneticTransition();
      }
    }
  }

  function updateLevel4(dt) {
    if (level5.active || slingshot.active || level7.active) {
      updateWorkbenchLayout(dt);
      return;
    }
    if (!level4.active) {
      if (world.spaceStarted && player.y < FLOOR_Y - 720) {
        world.level4AscentTime += dt;
        if (world.level4AscentTime > 0.75) {
          startLevel4();
        }
      } else {
        world.level4AscentTime = Math.max(0, world.level4AscentTime - dt * 0.5);
      }
      updateWorkbenchLayout(dt);
      return;
    }

    level4.alpha = approach(level4.alpha, 1, dt * (level4.phase === "spaceToElectric" ? 0.5 : 0.75));
    level4.fieldGlow = Math.max(0, level4.fieldGlow - dt * 0.75);
    level4.exitGlow = Math.max(0, level4.exitGlow - dt * 0.55);
    level4.forceLineTimer = Math.max(0, level4.forceLineTimer - dt * 2.2);
    level4.tokenShake = Math.max(0, level4.tokenShake - dt * 2.8);
    level4.screenShake = Math.max(0, level4.screenShake - dt * 3.4);
    if (level4.resetTimer > 0) {
      level4.resetTimer -= dt;
      if (level4.resetTimer <= 0) {
        resetLevel4Attempt();
      }
      updateWorkbenchLayout(dt);
      return;
    }
    if (level4.spaceExitTimer > 0) {
      level4.spaceExitTimer -= dt;
      player.vx = approach(player.vx, 170, 260 * dt);
      player.vy -= 1120 * dt;
      player.grounded = false;
      level4.fieldGlow = Math.max(level4.fieldGlow, 0.72);
      level4.forceLineTimer = Math.max(level4.forceLineTimer, 0.42);
      if (level4.spaceExitTimer <= 0) {
        startLevel5();
        updateWorkbenchLayout(dt);
        return;
      }
    }

    if (isLevel4AutoTransition()) {
      updateLevel4Transition(dt);
    } else if (level4.result === "pending") {
      if (level4.phase === "electric") {
        updateLevel4Electric(dt);
      } else {
        updateLevel4Magnetic(dt);
      }
    }

    level4.messageTimer = Math.max(0, level4.messageTimer - dt);
    updateWorkbenchLayout(dt);
  }

  function updatePlayer(dt) {
    const editingVariable = Boolean(workbench.activeToken && workbench.activeToken.mode === "bench");
    const controlsLocked = isLevel4AutoTransition() || level5.active || slingshot.active || level7.active;
    const left = !controlsLocked && (keys.has("KeyA") || (!editingVariable && keys.has("ArrowLeft")));
    const right = !controlsLocked && (keys.has("KeyD") || (!editingVariable && keys.has("ArrowRight")));
    const inputX = (right ? 1 : 0) - (left ? 1 : 0);
    const wasGrounded = player.grounded;
    const surface = currentSurface();
    const floor = floorAt(player.worldX, player.y);
    player.ruleVelocityTimer = Math.max(0, player.ruleVelocityTimer - dt);
    const movingNow = inputX !== 0 || Math.abs(player.vx) > 18 || Math.abs(player.vy) > 24;
    player.symbolTimer = movingNow ? 0.9 : Math.max(0, player.symbolTimer - dt);
    player.inputX = inputX;
    player.slip = surface.type === "ice" ? 1 - surface.friction : 0;
    const slickIce = surface.type === "ice" && surface.friction <= 0.04;
    const ruleGlide = player.ruleVelocityTimer > 0;
    const walkingOnSlickIce = slickIce && player.grounded && !ruleGlide && inputX !== 0;
    const inElectricField = level4.active
      && level4.phase === "electric"
      && isInsideElectricField(worldToLevel4({ x: player.worldX, y: player.y - 44 }));
    const inElectricWater = level4.active
      && level4.phase === "electric"
      && (inElectricField || level4.electricExitTimer > 0);

    if (!world.hasMoved && (inputX !== 0 || Math.abs(player.vx) > 20)) {
      world.hasMoved = true;
      const starter = tokens.find((token) => token.id === "v_head");
      if (starter) {
        starter.visible = true;
        starter.flash = 1;
      }
    }

    const desiredSpeed = walkingOnSlickIce || inElectricWater ? 0 : inputX * (surface.type === "ice" ? 120 : 226);
    const accel = walkingOnSlickIce || inElectricWater ? 0 : (player.grounded ? 720 : 390) * surface.traction;
    const coast = player.grounded ? (surface.type === "ice" ? (slickIce && !ruleGlide ? 280 : 18 + world.iceFriction * 150) : 105) : 26;
    const turnBrake = player.grounded && inputX !== 0 && Math.sign(player.vx) !== inputX ? 520 * surface.traction : 0;

    if (inElectricWater) {
      player.vx = approach(player.vx, level4.electricExitTimer > 0 ? player.vx : 0, 260 * dt);
      if (inputX !== 0) {
        player.facing = inputX;
      }
    } else if (inputX !== 0) {
      player.vx = approach(player.vx, desiredSpeed, (accel + turnBrake) * dt);
      player.facing = inputX;
    } else {
      player.vx = approach(player.vx, 0, coast * dt);
    }
    player.vx = clamp(player.vx, -305, 305);
    player.iceFall = approach(player.iceFall, walkingOnSlickIce ? 1 : 0, dt * (walkingOnSlickIce ? 3.5 : 2.2));

    if (jumpQueued && player.grounded && !controlsLocked) {
      player.vy = -360;
      player.grounded = false;
    }
    jumpQueued = false;

    let gravity = 890;
    if (player.appliedAcceleration) {
      player.vx += player.appliedAcceleration.x * dt;
      player.vy += player.appliedAcceleration.y * dt;
      player.appliedAcceleration.ttl -= dt;
      gravity = 800;
      if (player.appliedAcceleration.ttl <= 0) {
        player.appliedAcceleration = null;
      }
    }
    if (level4.active || level5.active || slingshot.active || level7.active) {
      gravity = 0;
    }

    player.vy += gravity * dt;
    const oldX = player.worldX;
    player.worldX += player.vx * dt;
    player.y += player.vy * dt;
    if (slickIce && !ruleGlide && player.grounded) {
      const leftStop = terrain.ice.x1 + 42;
      const rightStop = terrain.ice.x2 - 42;
      if (oldX <= leftStop && player.worldX > leftStop) {
        player.worldX = leftStop;
        player.vx = 0;
        player.iceFall = 1;
      }
      if (oldX >= rightStop && player.worldX < rightStop) {
        player.worldX = rightStop;
        player.vx = 0;
        player.iceFall = 1;
      }
    }
    resolveStepWalls(oldX);

    const newFloor = floorAt(player.worldX, player.y);
    if (player.y >= newFloor) {
      player.y = newFloor;
      if (player.vy > 0) {
        player.vy = 0;
      }
      player.grounded = true;
      if (!wasGrounded) {
        player.landSquash = 1;
      }
    } else {
      player.grounded = false;
    }

    const speedBlend = clamp(Math.abs(player.vx) / 215, 0, 1);
    const targetBlend = player.grounded
      ? Math.max(speedBlend, player.slip * 0.55 * Math.abs(inputX), walkingOnSlickIce ? 0.86 : 0, inElectricWater ? Math.abs(inputX) * 0.72 : 0)
      : Math.max(inElectricWater ? 0.18 : 0.33, speedBlend, inElectricWater ? Math.abs(inputX) * 0.9 : 0);
    player.runBlend = lerp(player.runBlend, targetBlend, clamp(dt * 9, 0, 1));
    player.lean = lerp(player.lean, signOrFacing(player.vx, player.facing) * speedBlend - player.slip * inputX * 0.55, clamp(dt * 7, 0, 1));
    player.landSquash = Math.max(0, player.landSquash - dt * 4.1);
    player.boostFlash = Math.max(0, player.boostFlash - dt * 2.2);
    player.idlePhase += dt * (inElectricWater ? 0.72 : 1.5) + dt * player.runBlend * (inElectricWater ? 0.55 : 1.2);

    const cadence = inElectricWater
      ? 1.15 + Math.abs(player.inputX) * 2.2
      : 3.0 + Math.abs(player.vx) * 0.052 + player.slip * Math.abs(inputX) * (walkingOnSlickIce ? 8.5 : 3.2);
    player.phase += cadence * dt * Math.max(inElectricWater ? 0.45 : 0.2, player.runBlend);

    const rise = clamp((-player.y + 70) / 880, 0, 1);
    const targetZoom = lerp(BASE_ZOOM, 0.34, rise);
    const cameraLead = player.facing * (54 + Math.abs(player.vx) * 0.05);
    const jumpLook = clamp(player.vy * 0.035, -22, 18);
    if (!level4.active && !level5.active) {
      const returnFall = level7.returningToEarth && player.y < FLOOR_Y - 16;
      const returnRate = returnFall ? 1.65 : 1;
      const returnZoom = returnFall ? 0.38 : targetZoom;
      camera.x = lerp(camera.x, player.worldX + cameraLead, clamp(dt * 5.8, 0, 1));
      camera.y = lerp(camera.y, CAMERA_Y_REST + jumpLook + Math.min(player.y - FLOOR_Y, 0) * (returnFall ? 0.62 : 0.42), clamp(dt * 3.5 * returnRate, 0, 1));
      camera.zoom = lerp(camera.zoom, returnZoom, clamp(dt * 2.8, 0, 1));
      if (level7.returningToEarth && player.grounded) {
        level7.returningToEarth = false;
        world.sceneFlash = Math.max(world.sceneFlash, 1);
      }
    } else if (level4.active) {
      const levelCenterX = level4.originX + 190;
      const sceneMix = level4TransitionSceneMix();
      const transitionBlend = isLevel4AutoTransition() ? smoothstep(0.05, 1, level4TransitionProgress()) : 1;
      const centerBias = lerp(0.72, 0.82, sceneMix);
      const desiredX = lerp(levelCenterX, player.worldX, centerBias);
      const verticalLead = clamp(player.vy * 0.012, -12, 12);
      const desiredY = player.y - 42 + verticalLead;
      const levelZoom = lerp(0.54, 0.5, sceneMix);
      const targetX = lerp(camera.x, desiredX, transitionBlend);
      const targetY = lerp(camera.y, desiredY, transitionBlend);
      const targetLevelZoom = isLevel4AutoTransition() ? lerp(camera.zoom, levelZoom, transitionBlend) : levelZoom;
      const cameraRate = isLevel4AutoTransition() ? 3.2 : 4.8;
      camera.x = lerp(camera.x, targetX, clamp(dt * cameraRate, 0, 1));
      camera.y = lerp(camera.y, targetY, clamp(dt * cameraRate, 0, 1));
      camera.zoom = lerp(camera.zoom, targetLevelZoom, clamp(dt * (isLevel4AutoTransition() ? 2.2 : 3.6), 0, 1));
    }
  }

  function sceneIndexForX(x) {
    if (x < terrain.ice.x1 - 120) return 1;
    if (x < terrain.ice.x2 - 60) return 2;
    if (x < terrain.stairs[0].x - 160) return 3;
    if (x < terrain.windmill.x - 180) return 4;
    return 5;
  }

  function updateSceneState(dt) {
    world.sceneIndex = sceneIndexForX(player.worldX);
    if (world.sceneIndex !== world.lastSceneIndex) {
      world.lastSceneIndex = world.sceneIndex;
      world.sceneFlash = 1;
    }
    world.sceneFlash = Math.max(0, world.sceneFlash - dt * 1.9);
  }

  function updateEffects(dt) {
    for (let index = effects.length - 1; index >= 0; index -= 1) {
      const effect = effects[index];
      effect.life -= dt;
      if (effect.life <= 0) {
        effects.splice(index, 1);
      }
    }
  }

  function updateHeadVelocityToken() {
    const token = tokens.find((item) => item.id === "v_head" && item.mode === "head");
    if (!token) {
      return;
    }
    if (level5.active || level7.active) {
      token.visible = false;
      return;
    }
    const vertical = !player.grounded && Math.abs(player.vy) > 24;
    const horizontalSpeed = Math.abs(player.vx);
    const speed = vertical ? Math.abs(player.vy) : horizontalSpeed;
    token.value = clamp(speed / 20, 0.5, 8.5);
    token.direction = vertical ? { x: 0, y: Math.sign(player.vy) || 1 } : { x: player.facing || 1, y: 0 };
    token.visible = world.hasMoved && player.symbolTimer > 0 && speed > 16;
  }

  function update(dt) {
    updatePlayer(dt);
    updateWindmill(dt);
    updateLevel4(dt);
    updateLevel5(dt);
    updateSlingshot(dt);
    updateLevel7(dt);
    updateLevel7RocketDrop(dt);
    updateSceneState(dt);
    updateEffects(dt);
    updateHeadVelocityToken();
    updateTokenVisibility();
    world.trajectoryTimer = Math.max(0, world.trajectoryTimer - dt);
    world.flowPulse += dt;
    workbench.pulse = Math.max(0, workbench.pulse - dt * 2.7);
    for (const token of tokens) {
      token.flash = Math.max(0, token.flash - dt * 2.4);
      token.pop = Math.max(0, (token.pop || 0) - dt * 2.8);
    }
    updateWorkbenchOutputs();
  }

  function updateTokenVisibility() {
    for (const token of tokens) {
      if (token.id === "v_head" && token.mode === "head") {
        continue;
      }
      if (token.mode !== "world") {
        continue;
      }
      if (token.role === "level4_charge") {
        token.visible = level4.active;
        continue;
      }
      if (token.role === "level5_rocket" || token.role === "level5_temperature") {
        token.visible = level5.active && token.visible;
        continue;
      }
      if (token.role === "level7_speed") {
        token.visible = level7.active && token.visible;
        continue;
      }
      if (token.role === "ice" || token.role === "ice_boost") {
        token.visible = player.worldX > terrain.ice.x1 - 260 && player.worldX < terrain.ice.x2 + 180;
        continue;
      }
      if (token.role === "windmill") {
        token.visible = Math.abs(token.worldX - player.worldX) < 260 || world.spaceStarted;
      }
    }
  }

  function drawBackground(time) {
    const floorY = floorScreenY();
    const inSpace = level5.active || slingshot.active;
    const skyHeight = inSpace ? SCREEN_H : Math.max(floorY, 1);
    const sky = ctx.createLinearGradient(0, 0, 0, skyHeight);
    sky.addColorStop(0, "#000003");
    sky.addColorStop(0.62, "#000000");
    sky.addColorStop(1, "#020204");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);

    ctx.save();
    ctx.globalCompositeOperation = "screen";
    const drift = inSpace ? level5.starDrift : 0;
    const yCullTop = inSpace ? -40 : -8;
    const yCullBottom = inSpace ? SCREEN_H + 40 : floorY - 7;
    for (const layer of starLayers) {
      const shiftedCamera = camera.x * layer.parallax;
      const minTile = Math.floor((shiftedCamera - SCREEN_W / camera.zoom) / STAR_TILE_W) - 1;
      const maxTile = Math.ceil((shiftedCamera + SCREEN_W / camera.zoom) / STAR_TILE_W) + 1;
      const driftY = drift * (0.55 + layer.parallax * 1.1);
      const tileH = SCREEN_H + 80;
      for (let tile = minTile; tile <= maxTile; tile += 1) {
        for (const star of layer.stars) {
          const x = (star.x + tile * STAR_TILE_W - shiftedCamera) * camera.zoom + SCREEN_W / 2;
          let y = (star.y - camera.y * layer.yParallax) * camera.zoom + SCREEN_H / 2;
          if (inSpace) {
            y = ((y - yCullTop + driftY) % tileH + tileH) % tileH + yCullTop;
          }
          if (x < -8 || x > SCREEN_W + 8 || y < yCullTop || y > yCullBottom) {
            continue;
          }
          const flicker = 0.78 + Math.sin(time * 0.0012 * star.twinkle + star.x) * 0.22;
          ctx.globalAlpha = star.alpha * flicker;
          ctx.fillStyle = star.cool ? "#d8e6ff" : "#ffffff";
          ctx.beginPath();
          ctx.arc(x, y, star.size * 0.48, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    const nebulaX = (-205 - camera.x * 0.18) * camera.zoom + SCREEN_W / 2;
    const nebula = ctx.createRadialGradient(nebulaX, 150, 4, nebulaX, 150, 115);
    nebula.addColorStop(0, "rgba(85, 105, 140, 0.08)");
    nebula.addColorStop(0.35, "rgba(44, 64, 98, 0.04)");
    nebula.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.globalAlpha = 1;
    ctx.fillStyle = nebula;
    ctx.fillRect(0, 0, SCREEN_W, skyHeight);
    ctx.restore();

    if (inSpace) {
      return;
    }

    const floor = ctx.createLinearGradient(0, floorY, 0, SCREEN_H);
    floor.addColorStop(0, "#ededee");
    floor.addColorStop(0.16, "#dedee1");
    floor.addColorStop(1, "#d0d0d3");
    ctx.fillStyle = floor;
    ctx.fillRect(0, floorY, SCREEN_W, SCREEN_H - floorY);

    ctx.save();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.72)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, floorY + 0.5);
    ctx.lineTo(SCREEN_W, floorY + 0.5);
    ctx.stroke();

    ctx.globalAlpha = 0.055;
    for (let i = 0; i < 18; i += 1) {
      const y = floorY + 14 + i * 6.8;
      const offset = ((camera.x * 0.15 + i * 23) % 90) - 90;
      ctx.strokeStyle = i % 2 === 0 ? "#ffffff" : "#b8b8bc";
      ctx.beginPath();
      ctx.moveTo(offset, y);
      ctx.lineTo(SCREEN_W + 90, y + Math.sin(i) * 0.35);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawWorldRect(x, top, w, h, fill, stroke = "rgba(245,245,245,0.72)") {
    const a = worldToScreen({ x, y: top });
    const b = worldToScreen({ x: x + w, y: top + h });
    ctx.fillStyle = fill;
    ctx.fillRect(a.x, a.y, b.x - a.x, b.y - a.y);
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1.1;
    ctx.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y);
  }

  function drawLevel4Platform(rect, glow = 0, visualYOffset = 0, alpha = level4.alpha) {
    const point = level4ToWorld(rect);
    const a = worldToScreen({ x: point.x, y: point.y + visualYOffset });
    const b = worldToScreen({ x: point.x + rect.w, y: point.y + rect.h + visualYOffset });
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.shadowColor = "rgba(255,255,255,0.8)";
    ctx.shadowBlur = 4 + glow * 18;
    ctx.fillStyle = `rgba(232,232,235,${0.92 + glow * 0.08})`;
    ctx.fillRect(a.x, a.y, b.x - a.x, Math.max(2, b.y - a.y));
    ctx.strokeStyle = `rgba(255,255,255,${0.54 + glow * 0.42})`;
    ctx.lineWidth = 1.1 + glow * 0.8;
    ctx.strokeRect(a.x, a.y, b.x - a.x, Math.max(2, b.y - a.y));
    ctx.restore();
  }

  function drawMagneticCross(point, alpha, size = 5) {
    const p = worldToScreen(level4ToWorld(point));
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = WHITE;
    ctx.lineWidth = 1.1;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(p.x - size, p.y - size);
    ctx.lineTo(p.x + size, p.y + size);
    ctx.moveTo(p.x + size, p.y - size);
    ctx.lineTo(p.x - size, p.y + size);
    ctx.stroke();
  }

  function drawElectricLine(x, y0, y1, alpha) {
    const a = worldToScreen(level4ToWorld({ x, y: y0 }));
    const b = worldToScreen(level4ToWorld({ x, y: y1 }));
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = WHITE;
    ctx.fillStyle = WHITE;
    ctx.lineWidth = 1.1;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(b.x, b.y);
    ctx.lineTo(b.x - 4, b.y + 8);
    ctx.lineTo(b.x + 4, b.y + 8);
    ctx.closePath();
    ctx.fill();
  }

  function magneticTrajectorySample() {
    if (!level4.active || level4.phase !== "magnetic" || player.charge === "neutral" || player.vy > -35) {
      return null;
    }
    const sign = player.charge === "positive" ? 1 : -1;
    const omega = level4.field.force;
    let x = player.worldX;
    let y = player.y - 44;
    let vx = player.vx;
    let vy = player.vy;
    const speed = Math.hypot(vx, vy);
    if (speed < 80) {
      return null;
    }
    const points = [];
    for (let i = 0; i < 64; i += 1) {
      const local = worldToLevel4({ x, y });
      points.push({ x, y });
      if (!isInsideMagneticField(local, level4.fieldRect) || local.x > level4.exit.x + level4.exit.w + 30 || local.y < 36) {
        break;
      }
      const oldVx = vx;
      const oldVy = vy;
      vx += oldVy * sign * omega * 0.045;
      vy += -oldVx * sign * omega * 0.045;
      const nextSpeed = Math.hypot(vx, vy);
      if (nextSpeed > 0.001) {
        vx = (vx / nextSpeed) * speed;
        vy = (vy / nextSpeed) * speed;
      }
      x += vx * 0.045;
      y += vy * 0.045;
    }
    const radius = speed / Math.max(omega, 0.001);
    const center = {
      x: player.worldX + (player.vy / speed) * sign * radius,
      y: player.y - 44 + (-player.vx / speed) * sign * radius,
    };
    return { points, center };
  }

  function drawLevel4MagneticArc() {
    const sample = magneticTrajectorySample();
    if (!sample || sample.points.length < 4) {
      return;
    }
    const { points, center } = sample;
    const tracePath = () => {
      const first = worldToScreen(points[0]);
      ctx.beginPath();
      ctx.moveTo(first.x, first.y);
      for (let index = 1; index < points.length; index += 1) {
        const point = worldToScreen(points[index]);
        ctx.lineTo(point.x, point.y);
      }
    };

    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.setLineDash([5, 6]);
    tracePath();
    ctx.strokeStyle = "rgba(0,0,0,0.75)";
    ctx.lineWidth = 3.2;
    ctx.stroke();
    tracePath();
    ctx.strokeStyle = "rgba(255,255,255,0.72)";
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.setLineDash([]);

    const c = worldToScreen(center);
    const start = worldToScreen(points[0]);
    if (c.x > -80 && c.x < SCREEN_W + 80 && c.y > -80 && c.y < SCREEN_H + 80) {
      ctx.globalAlpha = level4.alpha * 0.78;
      ctx.strokeStyle = "rgba(255,255,255,0.58)";
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 5]);
      ctx.beginPath();
      ctx.moveTo(c.x, c.y);
      ctx.lineTo(start.x, start.y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = WHITE;
      ctx.beginPath();
      ctx.arc(c.x, c.y, 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.86)";
      ctx.lineWidth = 2.4;
      ctx.font = "12px Cambria Math, Georgia, 'Times New Roman', serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.strokeText("圆心 O", c.x + 7, c.y - 2);
      ctx.fillText("圆心 O", c.x + 7, c.y - 2);
    }
    ctx.restore();
  }

  function drawLevel4(time) {
    if (!level4.active && level4.alpha <= 0) {
      return;
    }
    const alpha = level4.alpha;
    const field = level4.fieldRect;
    const glow = Math.max(level4.fieldGlow, level4.result === "success" ? 0.85 : 0);
    const sceneMix = level4TransitionSceneMix();
    const electricAlpha = level4.phase === "electricToMagnetic" ? alpha * (1 - sceneMix) : alpha;
    const magneticAlpha = level4.phase === "electricToMagnetic" ? alpha * sceneMix : alpha;

    ctx.save();
    ctx.globalAlpha = alpha;

    if (isLevel4ElectricPhase() || level4.phase === "electricToMagnetic") {
      const electric = level4.electricField.rect;
      const eGlow = Math.max(level4.fieldGlow, player.charge === "positive" ? 0.35 : 0);
      for (let i = 0; i < 11; i += 1) {
        const x = electric.x + 74 + i * 62;
        drawElectricLine(x, electric.y + electric.h - 28, electric.y + 42, electricAlpha * (0.24 + eGlow * 0.46));
      }
      const marker = worldToScreen(level4ToWorld(level4.electricMarker));
      ctx.globalAlpha = electricAlpha * 0.78;
      ctx.font = "italic 17px Cambria Math, Georgia, 'Times New Roman', serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.strokeStyle = "rgba(0,0,0,0.82)";
      ctx.lineWidth = 2.2;
      ctx.strokeText("E↑", marker.x, marker.y);
      ctx.fillStyle = WHITE;
      ctx.fillText("E↑", marker.x, marker.y);
      drawWorldText("关卡 4：电场上升", level4.originX + 116, level4.originY + level4.electricStart.y - 248, electricAlpha * 0.78, 14);
      drawWorldText("F = qE", level4.originX + 248, level4.originY + level4.electricStart.y - 206, electricAlpha * 0.7, 13);
      if (level4.result === "failed-electric" && level4.messageTimer > 0) {
        drawWorldText("把 +q 拖给火柴人", player.worldX, player.y - 92, Math.min(1, level4.messageTimer), 11);
      }
      if (isLevel4ElectricPhase()) {
        ctx.restore();
        return;
      }
    }

    drawLevel4Platform(level4.start, 0, 10, magneticAlpha);

    const visualField = level4.fieldVisualRect || field;
    const crossAlpha = magneticAlpha * (0.28 + glow * 0.38) * (player.charge === "positive" ? 0.58 : 1);
    let row = 0;
    for (let y = visualField.y + 42; y < visualField.y + visualField.h - 28; y += 66) {
      let col = 0;
      for (let x = visualField.x + 36 + (row % 2) * 13; x < visualField.x + visualField.w - 24; x += 52) {
        drawMagneticCross({
          x,
          y,
        }, crossAlpha, 4.8);
        col += 1;
      }
      row += 1;
    }

    const magneticMarker = worldToScreen(level4ToWorld(level4.eMarker));
    ctx.globalAlpha = magneticAlpha * 0.78;
    ctx.font = "italic 17px Cambria Math, Georgia, 'Times New Roman', serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.strokeStyle = "rgba(0,0,0,0.82)";
    ctx.lineWidth = 2.2;
    ctx.strokeText("B×", magneticMarker.x, magneticMarker.y);
    ctx.fillStyle = WHITE;
    ctx.fillText("B×", magneticMarker.x, magneticMarker.y);

    const exit = level4.exit;
    const ex0 = worldToScreen(level4ToWorld({ x: exit.x, y: exit.y }));
    const ex1 = worldToScreen(level4ToWorld({ x: exit.x + exit.w, y: exit.y + exit.h }));
    const exitGradient = ctx.createLinearGradient(ex0.x, ex0.y, ex1.x, ex1.y);
    exitGradient.addColorStop(0, `rgba(255,255,255,${0.08 + level4.exitGlow * 0.2})`);
    exitGradient.addColorStop(1, `rgba(255,255,255,${0.3 + level4.exitGlow * 0.55})`);
    ctx.globalAlpha = magneticAlpha;
    ctx.fillStyle = exitGradient;
    ctx.fillRect(ex0.x, ex0.y, ex1.x - ex0.x, ex1.y - ex0.y);
    ctx.strokeStyle = `rgba(255,255,255,${0.45 + level4.exitGlow * 0.45})`;
    ctx.lineWidth = 1.4 + level4.exitGlow;
    ctx.strokeRect(ex0.x, ex0.y, ex1.x - ex0.x, ex1.y - ex0.y);
    ctx.font = "10px Cambria Math, Georgia, 'Times New Roman', serif";
    ctx.textAlign = "center";
    ctx.fillStyle = WHITE;
    ctx.globalAlpha = magneticAlpha * (0.52 + level4.exitGlow * 0.36);
    ctx.fillText("出口", (ex0.x + ex1.x) * 0.5, ex0.y - 11);

    drawLevel4MagneticArc();

    drawWorldText("关卡 4：叉磁场", level4.originX + 178, level4.originY + 48, magneticAlpha * 0.8, 14);
    drawWorldText("F = qvB", level4.originX + 178, level4.originY + 72, magneticAlpha * 0.72, 13);
    if (level4.result === "success" && level4.messageTimer > 0) {
      drawWorldText("-q 的圆弧进入出口", player.worldX + 20, player.y - 86, Math.min(1, level4.messageTimer), 12);
    }
    if (level4.result === "failed-neutral" && level4.messageTimer > 0) {
      drawWorldText("没有电荷，磁场不改变路径", player.worldX, player.y - 86, Math.min(1, level4.messageTimer), 11);
    }
    if (level4.result === "failed-positive" && level4.messageTimer > 0) {
      drawWorldText("正电荷向左偏转", player.worldX, player.y - 86, Math.min(1, level4.messageTimer), 11);
    }
    if (level4.result === "failed-missed" && level4.messageTimer > 0) {
      drawWorldText("沿圆弧进入右侧出口", player.worldX, player.y - 86, Math.min(1, level4.messageTimer), 11);
    }
    if (level4.result === "failed-orbit" && level4.messageTimer > 0) {
      drawWorldText("转满一圈，重新来过", player.worldX, player.y - 86, Math.min(1, level4.messageTimer), 11);
    }

    ctx.restore();
  }

  function drawLevel5Celestial(time) {
    if (!level5.active) {
      return;
    }
    const alpha = level5.alpha;
    const completeT = level5.completeT || 0;
    const fadeOthers = 1 - smoothstep(0.04, 0.7, completeT);
    ctx.save();
    ctx.lineCap = "round";
    ctx.strokeStyle = WHITE;

    const reveal = smoothstep(0.12, 1, level5.reveal);
    if (reveal > 0.01) {
      const earthAlpha = alpha * smoothstep(0.08, 0.42, level5.reveal) * fadeOthers;
      const earthX = lerp(322, 232, reveal);
      const earthY = lerp(SCREEN_H + 132, SCREEN_H + 34, reveal);
      const earthR = lerp(210, 154, reveal);
      const earth = ctx.createRadialGradient(earthX - earthR * 0.42, earthY - earthR * 0.42, 8, earthX, earthY, earthR);
      earth.addColorStop(0, `rgba(255,255,255,${0.98 * earthAlpha})`);
      earth.addColorStop(0.66, `rgba(232,232,235,${0.92 * earthAlpha})`);
      earth.addColorStop(1, `rgba(198,198,202,${0.9 * earthAlpha})`);
      ctx.globalAlpha = 1;
      ctx.fillStyle = earth;
      ctx.beginPath();
      ctx.arc(earthX, earthY, earthR, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = `rgba(255,255,255,${0.28 * earthAlpha})`;
      ctx.lineWidth = 1.2;
      ctx.stroke();

      const orbitAlpha = alpha * smoothstep(0.34, 0.72, level5.reveal) * fadeOthers;
      ctx.globalAlpha = orbitAlpha;
      ctx.strokeStyle = WHITE;
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.ellipse(earthX + 36, earthY - 36, earthR * 1.45, earthR * 0.42, -0.36, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = orbitAlpha * 0.72;
      ctx.beginPath();
      ctx.arc(earthX + earthR * 1.2, earthY - earthR * 0.34, 2.2, 0, Math.PI * 2);
      ctx.fillStyle = WHITE;
      ctx.fill();

      const sunAlpha = alpha * smoothstep(0.68, 1, level5.reveal);
      if (sunAlpha > 0.01) {
        const grow = smoothstep(0, 1, completeT);
        const sunX = lerp(LEVEL5_SUN.x, SCREEN_W * 0.5, grow);
        const sunY = lerp(LEVEL5_SUN.y, SCREEN_H * 0.5, grow);
        const sunR = lerp(LEVEL5_SUN.r, SCREEN_W * 0.62, grow);
        const sun = ctx.createRadialGradient(sunX, sunY, 4, sunX, sunY, sunR * 2.3);
        sun.addColorStop(0, `rgba(255,255,255,${(0.92 + grow * 0.08) * sunAlpha})`);
        sun.addColorStop(0.28, `rgba(255,214,230,${(0.28 + grow * 0.32) * sunAlpha})`);
        sun.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = sun;
        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.arc(sunX, sunY, sunR * 2.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = sunAlpha;
        ctx.fillStyle = "rgba(242,242,244,0.94)";
        ctx.beginPath();
        ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
    void time;
  }

  function drawLevel5OrbitTrail(fade = 1) {
    if (!level5.active || !level5.thrustAnchor) {
      return;
    }
    const anchor = level5.thrustAnchor;
    const current = level5RocketWorld();
    if (Math.hypot(current.x - anchor.x, current.y - anchor.y) < 8) {
      return;
    }
    const a = worldToScreen(anchor);
    const b = worldToScreen(current);
    const midX = (a.x + b.x) * 0.5;
    const midY = (a.y + b.y) * 0.5;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const bow = Math.min(180, len * 0.45);
    const ctrlX = midX + nx * bow;
    const ctrlY = midY + ny * bow - Math.min(60, len * 0.18);

    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (let pass = 0; pass < 3; pass += 1) {
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.quadraticCurveTo(ctrlX, ctrlY, b.x, b.y);
      if (pass === 0) {
        ctx.globalAlpha = level5.alpha * 0.22 * fade;
        ctx.strokeStyle = "rgba(255,182,222,0.9)";
        ctx.lineWidth = 9;
      } else if (pass === 1) {
        ctx.globalAlpha = level5.alpha * 0.78 * fade;
        ctx.strokeStyle = "rgba(255,205,235,0.95)";
        ctx.lineWidth = 2.6;
      } else {
        ctx.globalAlpha = level5.alpha * 0.96 * fade;
        ctx.strokeStyle = WHITE;
        ctx.lineWidth = 1.2;
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawRocketShape(center, angle, scale, active, time, alpha) {
    const thrust = clamp(level5.thrust, 0, 1);
    ctx.save();
    ctx.translate(center.x, center.y);
    ctx.rotate(angle);
    ctx.scale(scale * LEVEL5_ROCKET_SCALE, scale * LEVEL5_ROCKET_SCALE);
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    const outline = "rgba(245,244,255,0.94)";
    const pinkOutline = "rgba(255,196,229,0.9)";
    const bodyFill = "rgba(33,31,35,0.96)";
    const plume = active ? 48 + thrust * 82 : 26;
    const plumePulse = 0.8 + Math.sin(time * 0.009) * 0.12;

    ctx.globalAlpha = alpha * (active ? 0.56 + thrust * 0.26 : 0.18);
    const outerFlame = ctx.createLinearGradient(84, 0, 84 + plume, 0);
    outerFlame.addColorStop(0, "rgba(255,228,245,0.92)");
    outerFlame.addColorStop(0.45, "rgba(255,155,205,0.58)");
    outerFlame.addColorStop(1, "rgba(255,140,190,0)");
    ctx.fillStyle = outerFlame;
    ctx.strokeStyle = "rgba(255,196,229,0.52)";
    ctx.lineWidth = 1.7;
    ctx.beginPath();
    ctx.moveTo(84, -13);
    ctx.bezierCurveTo(108 + plume * 0.16, -22 * plumePulse, 130 + plume * 0.44, -17, 84 + plume, 0);
    ctx.bezierCurveTo(130 + plume * 0.44, 17, 108 + plume * 0.16, 22 * plumePulse, 84, 13);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.globalAlpha = alpha * (active ? 0.72 : 0.3);
    const innerFlame = ctx.createLinearGradient(88, 0, 88 + plume * 0.62, 0);
    innerFlame.addColorStop(0, "rgba(255,255,255,0.96)");
    innerFlame.addColorStop(0.55, "rgba(255,205,230,0.58)");
    innerFlame.addColorStop(1, "rgba(255,205,230,0)");
    ctx.fillStyle = innerFlame;
    ctx.beginPath();
    ctx.moveTo(88, -7);
    ctx.bezierCurveTo(106 + plume * 0.12, -12, 118 + plume * 0.32, -8, 88 + plume * 0.62, 0);
    ctx.bezierCurveTo(118 + plume * 0.32, 8, 106 + plume * 0.12, 12, 88, 7);
    ctx.closePath();
    ctx.fill();

    ctx.globalAlpha = alpha;
    ctx.fillStyle = bodyFill;
    ctx.strokeStyle = pinkOutline;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(18, -18);
    ctx.lineTo(60, -40);
    ctx.lineTo(70, -14);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(22, 18);
    ctx.lineTo(62, 38);
    ctx.lineTo(72, 13);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = bodyFill;
    ctx.strokeStyle = outline;
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    ctx.moveTo(-92, 0);
    ctx.quadraticCurveTo(-74, -19, -43, -23);
    ctx.lineTo(70, -18);
    ctx.quadraticCurveTo(84, -14, 88, -4);
    ctx.lineTo(88, 4);
    ctx.quadraticCurveTo(84, 14, 70, 18);
    ctx.lineTo(-43, 23);
    ctx.quadraticCurveTo(-74, 19, -92, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.globalAlpha = alpha * 0.96;
    ctx.fillStyle = "rgba(204,204,226,0.88)";
    ctx.strokeStyle = outline;
    ctx.lineWidth = 2.1;
    for (const band of [
      { x: -64, w: 13, top: -18, bottom: 18 },
      { x: -32, w: 13, top: -22, bottom: 22 },
    ]) {
      ctx.beginPath();
      ctx.moveTo(band.x, band.top);
      ctx.lineTo(band.x + band.w, band.top - 1);
      ctx.lineTo(band.x + band.w, band.bottom + 1);
      ctx.lineTo(band.x, band.bottom);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    ctx.globalAlpha = alpha * 0.8;
    ctx.strokeStyle = "rgba(255,255,255,0.22)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-39, -15);
    ctx.quadraticCurveTo(8, -23, 64, -13);
    ctx.stroke();

    ctx.globalAlpha = alpha;
    ctx.fillStyle = "rgba(29,27,31,0.98)";
    ctx.strokeStyle = pinkOutline;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(86, -11);
    ctx.lineTo(101, -8);
    ctx.lineTo(101, 8);
    ctx.lineTo(86, 11);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function drawSeatedStickmanOnRocket(center, angle, scale, alpha, time = 0) {
    const t = time * 0.001;
    const sway = Math.sin(t * 1.4) * 1.6;
    const swayB = Math.sin(t * 1.05 + 0.7) * 1.1;
    const breath = Math.sin(t * 1.9) * 0.9;
    const armWave = Math.sin(t * 1.2 + 0.4) * 2.4;
    const headBob = Math.sin(t * 1.7) * 0.6;
    ctx.save();
    ctx.translate(center.x, center.y);
    ctx.rotate(angle + Math.sin(t * 0.9) * 0.012);
    ctx.scale(scale * LEVEL5_ROCKET_SCALE, scale * LEVEL5_ROCKET_SCALE);
    ctx.strokeStyle = ORANGE;
    ctx.shadowColor = "rgba(255, 94, 0, 0.62)";
    ctx.shadowBlur = 5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.globalAlpha = alpha;
    ctx.lineWidth = 4.8;
    const stroke = (points) => {
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i += 1) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.stroke();
    };
    const hip = { x: -10 + sway * 0.4, y: -20 };
    const shoulder = { x: 3 + sway, y: -51 + breath };
    stroke([hip, { x: -6 + sway * 0.7, y: -37 + breath * 0.5 }, shoulder]);
    stroke([
      { x: 1 + sway * 0.7, y: -46 + breath * 0.4 },
      { x: -19 + swayB, y: -31 + armWave * 0.3 },
      { x: -30 + swayB * 1.2, y: -19 + armWave },
    ]);
    stroke([
      { x: 3 + sway * 0.7, y: -44 + breath * 0.4 },
      { x: 27 + swayB * 0.6, y: -32 - armWave * 0.4 },
      { x: 40 + swayB * 0.9, y: -24 - armWave },
    ]);
    stroke([hip, { x: -24, y: -5 }, { x: -39, y: 3 }]);
    stroke([hip, { x: 8, y: -3 }, { x: 30, y: 2 }]);
    ctx.beginPath();
    ctx.arc(5 + sway * 1.1, -65 + headBob, 10.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 3;
    ctx.strokeStyle = WHITE;
    ctx.lineWidth = 2.1;
    ctx.beginPath();
    ctx.moveTo(-2 + sway * 1.1, -73 + headBob);
    ctx.lineTo(24 + sway * 1.1, -73 + headBob);
    ctx.quadraticCurveTo(38 + sway * 1.1, -70 + headBob, 43 + sway * 1.1, -62 + headBob);
    ctx.moveTo(0 + sway * 1.1, -75 + headBob);
    ctx.lineTo(0 + sway * 1.1, -91 + headBob);
    ctx.lineTo(23 + sway * 1.1, -94 + headBob);
    ctx.quadraticCurveTo(32 + sway * 1.1, -91 + headBob, 32 + sway * 1.1, -80 + headBob);
    ctx.lineTo(4 + sway * 1.1, -78 + headBob);
    ctx.stroke();
    ctx.restore();
  }

  function drawLevel5Formula(time, fade = 1) {
    const alpha = level5.alpha * fade;
    const shift = level5.formulaShift;
    ctx.save();
    ctx.fillStyle = WHITE;
    ctx.shadowColor = "rgba(255,255,255,0.18)";
    ctx.shadowBlur = 3;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.globalAlpha = alpha * 0.76;
    ctx.font = "11px Georgia, 'Times New Roman', serif";
    ctx.fillText("关卡 5：空气动力学", 22, 18);
    ctx.font = "italic 13px Cambria Math, Georgia, 'Times New Roman', serif";
    ctx.globalAlpha = alpha * (0.86 - shift * 0.52);
    ctx.fillText("m₁v₁ = m₂v₂", 22, 39);

    if (shift > 0.02) {
      const rocket = level5RocketWorld();
      const center = worldToScreen(rocket);
      const angle = level5.rocketAngle;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const scale = clamp(camera.zoom / 0.5, 0.36, 1.08) * LEVEL5_ROCKET_SCALE;
      const ax = (dx, dy) => ({
        x: center.x + dx * cos - dy * sin,
        y: center.y + dx * sin + dy * cos,
      });

      const exhaustBase = ax(94 * scale, 18 * scale);
      const exhaustTip = ax((94 + 70) * scale, 24 * scale);
      const noseBase = ax(-30 * scale, -28 * scale);
      const noseTip = ax((-30 - 70) * scale, -34 * scale);

      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      const drawArrow = (start, end, color, width) => {
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const len = Math.hypot(dx, dy);
        if (len < 0.5) return;
        const ux = dx / len;
        const uy = dy / len;
        ctx.strokeStyle = "rgba(0,0,0,0.85)";
        ctx.lineWidth = width + 1.6;
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
        const ang = Math.atan2(uy, ux);
        const headLen = 7;
        ctx.strokeStyle = "rgba(0,0,0,0.85)";
        ctx.lineWidth = width + 1.6;
        ctx.beginPath();
        ctx.moveTo(end.x, end.y);
        ctx.lineTo(end.x - Math.cos(ang - 0.5) * headLen, end.y - Math.sin(ang - 0.5) * headLen);
        ctx.lineTo(end.x - Math.cos(ang + 0.5) * headLen, end.y - Math.sin(ang + 0.5) * headLen);
        ctx.closePath();
        ctx.stroke();
        ctx.fillStyle = color;
        ctx.fill();
      };

      ctx.globalAlpha = alpha * shift * 0.9;
      drawArrow(exhaustBase, exhaustTip, "rgba(255, 196, 229, 0.95)", 2);
      drawArrow(noseBase, noseTip, WHITE, 2);

      const labelExhaust = ax((94 + 38) * scale, 36 * scale);
      const labelNose = ax((-30 - 38) * scale, -46 * scale);
      ctx.globalAlpha = alpha * shift * 0.95;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "italic 12px Cambria Math, Georgia, 'Times New Roman', serif";
      ctx.strokeStyle = "rgba(0,0,0,0.82)";
      ctx.lineWidth = 2.2;
      ctx.fillStyle = WHITE;
      ctx.strokeText("m₁v₁", labelExhaust.x, labelExhaust.y);
      ctx.fillText("m₁v₁", labelExhaust.x, labelExhaust.y);
      ctx.strokeText("m₂v₂", labelNose.x, labelNose.y);
      ctx.fillText("m₂v₂", labelNose.x, labelNose.y);

      void time;
    }

    ctx.restore();
  }

  function drawLevel5(time) {
    if (!level5.active) {
      return;
    }
    drawLevel5Celestial(time);
    const fadeOthers = 1 - smoothstep(0.04, 0.7, level5.completeT || 0);
    drawLevel5OrbitTrail(fadeOthers);
    const rocketToken = level5RocketToken();
    const center = !level5.boarded && rocketToken?.visible
      ? tokenCenter(rocketToken)
      : worldToScreen(level5RocketWorld());
    const scale = clamp(camera.zoom / 0.5, 0.36, 1.08);
    drawRocketShape(center, level5.rocketAngle, scale, level5.thrustApplied, time, level5.alpha * fadeOthers);
    if (level5.boarded) {
      drawSeatedStickmanOnRocket(center, level5.rocketAngle, scale, level5.alpha * fadeOthers, time);
    }
    drawLevel5Formula(time, fadeOthers);
    if (level5.complete && level5.nextLevelTimer > 0) {
      ctx.save();
      ctx.globalAlpha = level5.alpha * Math.min(1, level5.nextLevelTimer) * fadeOthers;
      ctx.fillStyle = WHITE;
      ctx.shadowColor = "rgba(255,255,255,0.36)";
      ctx.shadowBlur = 5;
      ctx.font = "italic 13px Cambria Math, Georgia, 'Times New Roman', serif";
      ctx.textAlign = "center";
      ctx.fillText("轨道接入太阳：下一关", SCREEN_W / 2, 42);
      ctx.restore();
    }
  }

  function drawSlingshot(time) {
    if (!slingshot.active) {
      return;
    }
    const sun = slingshotSun();
    const sunScreen = slingshotScreen(sun);
    const sunX = sunScreen.x;
    const sunY = sunScreen.y;
    const zoomIn = smoothstep(0, 1, slingshot.zoomIn);
    const sunR = lerp(28, 31, zoomIn);
    const visible = slingshot.alpha * (1 - slingshot.fadeOut);
    const sceneAlpha = visible * smoothstep(0.34, 1, zoomIn);

    ctx.save();
    const corona = ctx.createRadialGradient(sunX - sunR * 0.18, sunY - sunR * 0.24, 4, sunX, sunY, sunR * 3.2);
    corona.addColorStop(0, `rgba(255,255,255,${0.82 * visible})`);
    corona.addColorStop(0.18, `rgba(238,238,240,${0.34 * visible})`);
    corona.addColorStop(0.46, `rgba(185,185,190,${0.12 * visible})`);
    corona.addColorStop(0.75, `rgba(255,170,210,${0.04 * visible})`);
    corona.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = corona;
    ctx.beginPath();
    ctx.arc(sunX, sunY, sunR * 3.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = visible;
    const sunBody = ctx.createRadialGradient(sunX - sunR * 0.28, sunY - sunR * 0.32, 2, sunX, sunY, sunR);
    sunBody.addColorStop(0, "rgba(248,248,250,0.96)");
    sunBody.addColorStop(0.52, "rgba(210,210,214,0.88)");
    sunBody.addColorStop(1, "rgba(120,120,126,0.72)");
    ctx.fillStyle = sunBody;
    ctx.beginPath();
    ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
    ctx.fill();

    const planets = [
      { rx: 74,  ry: 26,  tilt: 0.34, size: 1.2, period: 5.2,  phase: 0.4, color: "rgba(210,210,214,0.72)" },
      { rx: 138, ry: 49,  tilt: 0.34, size: 1.6, period: 9.4,  phase: 1.7, color: "rgba(232,232,236,0.74)" },
      { rx: 224, ry: 79,  tilt: 0.34, size: 1.4, period: 14.6, phase: 3.1, color: "rgba(185,190,204,0.68)" },
      { rx: 320, ry: 113, tilt: 0.34, size: 2.0, period: 22.4, phase: 5.3, color: "rgba(236,236,238,0.76)" },
      { rx: 410, ry: 145, tilt: 0.34, size: 1.4, period: 31.5, phase: 2.2, color: "rgba(170,174,184,0.62)" },
    ];

    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const orbit of planets) {
      ctx.globalAlpha = sceneAlpha * 0.26;
      ctx.strokeStyle = "rgba(245,245,248,0.38)";
      ctx.lineWidth = 0.75;
      ctx.beginPath();
      ctx.ellipse(sunX, sunY, orbit.rx, orbit.ry, orbit.tilt, 0, Math.PI * 2);
      ctx.stroke();
    }
    for (const orbit of planets) {
      const a = (time * 0.001 + slingshot.solarSpin) / orbit.period * Math.PI * 2 + orbit.phase;
      const cos = Math.cos(orbit.tilt);
      const sin = Math.sin(orbit.tilt);
      const lx = Math.cos(a) * orbit.rx;
      const ly = Math.sin(a) * orbit.ry;
      const worldPoint = {
        x: sun.x + lx * cos - ly * sin,
        y: sun.y + lx * sin + ly * cos,
      };
      const planetPoint = slingshotScreen(worldPoint);
      const px = planetPoint.x;
      const py = planetPoint.y;
      ctx.globalAlpha = sceneAlpha * 0.92;
      ctx.fillStyle = orbit.color;
      ctx.beginPath();
      ctx.arc(px, py, orbit.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = sceneAlpha * 0.32;
      ctx.beginPath();
      ctx.arc(px, py, orbit.size * 2.2, 0, Math.PI * 2);
      ctx.fill();
    }

    const captureAlpha = sceneAlpha * (slingshot.phase === "setup" ? 0.28 : 0.42);
    ctx.globalAlpha = captureAlpha;
    ctx.strokeStyle = "rgba(255,255,255,0.72)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 7]);
    ctx.beginPath();
    ctx.arc(sunX, sunY, slingshot.captureRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    const mainOrbit = slingshotOrbitPoint(0, 1);
    void mainOrbit;
    ctx.globalAlpha = sceneAlpha * 0.54;
    ctx.strokeStyle = "rgba(255,255,255,0.72)";
    ctx.lineWidth = 1.05;
    ctx.beginPath();
    ctx.ellipse(sunX, sunY, slingshot.semiMajor, slingshot.semiMinor, slingshot.orbitTilt, -0.1, Math.PI * 2.05);
    ctx.stroke();

    const sPoint = slingshotScreen(slingshotCurveTokenPoint());
    ctx.globalAlpha = sceneAlpha * 0.86;
    ctx.fillStyle = WHITE;
    ctx.strokeStyle = "rgba(0,0,0,0.72)";
    ctx.lineWidth = 2.2;
    ctx.font = "italic 15px Cambria Math, Georgia, 'Times New Roman', serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.strokeText("s", sPoint.x, sPoint.y - 20);
    ctx.fillText("s", sPoint.x, sPoint.y - 20);
    ctx.globalAlpha = sceneAlpha * 0.52;
    ctx.strokeStyle = WHITE;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(sPoint.x - 10, sPoint.y - 10);
    ctx.lineTo(sPoint.x - 2, sPoint.y - 3);
    ctx.stroke();

    const guidePath = slingshot.assistLine.length ? slingshot.assistLine : sampleSlingshotPath(slingshot.preview, 48);
    if ((slingshot.preview > 0 || pointer.token?.type === "curvature") && guidePath.length > 1) {
      for (let pass = 0; pass < 2; pass += 1) {
        drawSmoothScreenPath(guidePath);
        ctx.globalAlpha = sceneAlpha * (pass === 0 ? 0.18 : 0.62);
        ctx.strokeStyle = pass === 0 ? "rgba(255,182,222,0.95)" : WHITE;
        ctx.lineWidth = pass === 0 ? 6 : 1.25;
        ctx.stroke();
      }
    }

    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (let pass = 0; pass < 3; pass += 1) {
      drawSmoothScreenPath(slingshot.trail);
      if (pass === 0) {
        ctx.globalAlpha = sceneAlpha * 0.22;
        ctx.strokeStyle = "rgba(255,182,222,0.95)";
        ctx.lineWidth = 8.4;
      } else if (pass === 1) {
        ctx.globalAlpha = sceneAlpha * 0.78;
        ctx.strokeStyle = "rgba(255,205,235,0.95)";
        ctx.lineWidth = 2.2;
      } else {
        ctx.globalAlpha = sceneAlpha * 0.96;
        ctx.strokeStyle = WHITE;
        ctx.lineWidth = 1.1;
      }
      ctx.stroke();
    }

    if (slingshot.phase === "capture" || slingshot.phase === "escape") {
      const speed = clamp(Math.hypot(slingshot.rocketVX, slingshot.rocketVY) / 460, 0, 1);
      if (speed > 0.05) {
        ctx.save();
        const rocketPoint = slingshotScreen({ x: slingshot.rocketX, y: slingshot.rocketY });
        ctx.translate(rocketPoint.x, rocketPoint.y);
        ctx.rotate(slingshot.rocketAngle);
        ctx.globalAlpha = sceneAlpha * (0.35 + speed * 0.55);
        ctx.strokeStyle = ORANGE;
        ctx.fillStyle = ORANGE;
        ctx.lineWidth = 2;
        ctx.shadowColor = "rgba(255, 110, 0, 0.72)";
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.moveTo(0, 24);
        ctx.lineTo(-32 - speed * 28, 24);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-32 - speed * 28, 24);
        ctx.lineTo(-22 - speed * 20, 18);
        ctx.lineTo(-22 - speed * 20, 30);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = WHITE;
        ctx.shadowBlur = 2;
        ctx.font = "italic 12px Cambria Math, Georgia, 'Times New Roman', serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("Δv", -35 - speed * 20, 39);
        ctx.restore();
      }
    }

    ctx.globalAlpha = sceneAlpha;
    drawRocketShape(
      slingshotScreen({ x: slingshot.rocketX, y: slingshot.rocketY }),
      slingshot.rocketAngle,
      0.46,
      true,
      time,
      sceneAlpha,
    );
    drawSeatedStickmanOnRocket(
      slingshotScreen({ x: slingshot.rocketX, y: slingshot.rocketY }),
      slingshot.rocketAngle,
      0.46,
      sceneAlpha,
      time,
    );

    ctx.fillStyle = WHITE;
    ctx.shadowColor = "rgba(255,255,255,0.32)";
    ctx.shadowBlur = 5;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.globalAlpha = sceneAlpha * 0.86;
    ctx.font = "11px Georgia, 'Times New Roman', serif";
    ctx.fillText("关卡 6：引力弹弓", 22, 18);
    ctx.font = "italic 13px Cambria Math, Georgia, 'Times New Roman', serif";
    ctx.globalAlpha = sceneAlpha * slingshot.formula * 0.94;
    ctx.fillText("s  →  Δv", 22, 39);

    if (slingshot.messageTimer > 0 || slingshot.phase === "setup") {
      const text = slingshot.phase === "setup"
        ? "取轨道上的 s，调到完全幅度后拖到火箭"
        : slingshot.result === "missed-capture"
        ? "未捕获：弧长不足"
        : slingshot.result === "offset"
        ? "偏移：未按逆时针进入捕获"
        : "逆时针捕获，速度增加";
      ctx.globalAlpha = sceneAlpha * (slingshot.phase === "setup" ? 0.48 : Math.min(1, slingshot.messageTimer));
      ctx.font = "10px Georgia, 'Times New Roman', serif";
      ctx.textAlign = "center";
      ctx.fillText(text, SCREEN_W * 0.5, SCREEN_H - 26);
    }
    ctx.restore();
  }

  function level7StarColor(star, beta, side) {
    if (side > 0.18) {
      return beta > 0.56 ? "rgba(150,196,255,0.96)" : (star.tint === "red" ? "rgba(255,210,222,0.9)" : "rgba(235,242,255,0.94)");
    }
    if (side < -0.18) {
      return beta > 0.56 ? "rgba(255,146,168,0.82)" : (star.tint === "blue" ? "rgba(218,230,255,0.88)" : "rgba(255,232,236,0.9)");
    }
    return star.tint === "blue" ? "rgba(210,228,255,0.94)" : (star.tint === "red" ? "rgba(255,218,228,0.88)" : "rgba(255,255,255,0.94)");
  }

  function drawLevel7Starfield(time) {
    const beta = clamp(level7.displayBeta, 0, 0.98);
    const t = level7.sequenceActive ? clamp(level7.sequenceTime / level7.sequenceDuration, 0, 1) : 0;
    const phases = level7.sequenceActive ? level7PhaseWindows(t) : level7PhaseWindows(0);
    const tunnel = level7.sequenceActive ? smoothstep(0.08, 0.32, t) * (1 - phases.earth * 0.5) : 0;
    const streak = smoothstep(0.22, 0.82, beta);
    const centerY = SCREEN_H / 2 + Math.sin(time * 0.0008) * 6 * tunnel;
    const diagonal = phases.approach + phases.capture * 0.8 + phases.fall * 0.45;
    ctx.save();
    const bg = ctx.createLinearGradient(0, 0, SCREEN_W, SCREEN_H);
    bg.addColorStop(0, `rgba(${Math.round(48 * diagonal)}, 0, 0, 1)`);
    bg.addColorStop(0.48, "#000000");
    bg.addColorStop(1, `rgba(0, ${Math.round(28 * phases.earth)}, ${Math.round(70 * phases.earth)}, 1)`);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    ctx.globalCompositeOperation = "screen";
    for (const star of level7Stars) {
      let x = (star.x + level7.starDrift * star.z) % 2600;
      if (x < 0) x += 2600;
      x -= 960;
      const perspective = lerp(0.9, 1.35, tunnel) * (0.82 + star.z * 0.28);
      const y = centerY + (star.y - SCREEN_H / 2) * perspective + Math.sin(time * 0.001 * star.twinkle + star.x) * (1.2 + tunnel * 4) * star.z - diagonal * (x - SCREEN_W / 2) * 0.36;
      const side = (x - SCREEN_W * 0.5) / SCREEN_W;
      if (x < -260 || x > SCREEN_W + 260 || y < -100 || y > SCREEN_H + 100) {
        continue;
      }
      const alpha = level7.alpha * star.alpha * (0.62 + Math.sin(time * 0.001 * star.twinkle + star.y) * 0.16);
      const line = (8 + level7.starSpeed * 0.055 * star.z) * streak;
      ctx.strokeStyle = level7StarColor(star, beta, side);
      ctx.fillStyle = ctx.strokeStyle;
      ctx.globalAlpha = alpha * (0.58 + streak * 0.42);
      if (line > 1.2) {
        ctx.lineWidth = Math.max(0.7, star.size * 0.7);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - line * (1 + diagonal * 0.8), y + side * tunnel * 16 + diagonal * line * 0.62);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(x, y, star.size * 0.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (level7.sequenceActive) {
      const flare = smoothstep(0.32, 0.58, t) * (1 - smoothstep(0.75, 1, t));
      const blue = ctx.createLinearGradient(0, 0, SCREEN_W, 0);
      blue.addColorStop(0, `rgba(255,80,116,${0.11 * flare})`);
      blue.addColorStop(0.42, "rgba(255,255,255,0)");
      blue.addColorStop(1, `rgba(80,156,255,${0.16 * flare})`);
      ctx.fillStyle = blue;
      ctx.globalAlpha = level7.alpha;
      ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);

      const redBlue = ctx.createLinearGradient(0, 0, SCREEN_W, SCREEN_H);
      redBlue.addColorStop(0, `rgba(255,32,26,${0.18 * diagonal})`);
      redBlue.addColorStop(0.48, "rgba(0,0,0,0)");
      redBlue.addColorStop(1, `rgba(0,118,255,${0.2 * (diagonal + phases.earth * 0.8)})`);
      ctx.fillStyle = redBlue;
      ctx.globalAlpha = level7.alpha;
      ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);

      ctx.globalAlpha = level7.alpha * flare * 0.22;
      ctx.strokeStyle = "rgba(255,255,255,0.84)";
      ctx.lineWidth = 1.1;
      for (let i = 0; i < 10; i += 1) {
        const y = centerY + (i - 4.5) * 22 + Math.sin(time * 0.003 + i) * 8;
        ctx.beginPath();
        ctx.moveTo(-40, y + i * 2);
        ctx.bezierCurveTo(170, y - 36, 420, y + 38, SCREEN_W + 40, y - 8);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function drawLevel7RelativityMarks(time) {
    if (!level7.sequenceActive && level7.messageTimer <= 0) {
      return;
    }
    const beta = clamp(level7.displayBeta, 0, 0.98);
    const t = level7.sequenceActive ? clamp(level7.sequenceTime / level7.sequenceDuration, 0, 1) : 1;
    const show = level7.sequenceActive ? smoothstep(0.18, 0.34, t) * (1 - smoothstep(0.88, 1, t)) : clamp(level7.messageTimer, 0, 1) * 0.38;
    const gamma = level7.gamma;
    ctx.save();
    ctx.globalAlpha = level7.alpha * show;
    ctx.strokeStyle = "rgba(255,255,255,0.76)";
    ctx.fillStyle = WHITE;
    ctx.shadowColor = "rgba(255,255,255,0.24)";
    ctx.shadowBlur = 5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const clockX = 76;
    const clockY = 86;
    const slow = clamp((gamma - 1) / 2.6, 0, 1);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(clockX, clockY, 18, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(clockX, clockY);
    ctx.lineTo(clockX + Math.cos(time * 0.001 * (1 - slow * 0.72)) * 12, clockY + Math.sin(time * 0.001 * (1 - slow * 0.72)) * 12);
    ctx.moveTo(clockX, clockY);
    ctx.lineTo(clockX + Math.cos(time * 0.00042 * (1 - slow * 0.8)) * 8, clockY + Math.sin(time * 0.00042 * (1 - slow * 0.8)) * 8);
    ctx.stroke();

    const rulerX = 48;
    const rulerY = 286;
    const contracted = 112 / Math.max(gamma, 1);
    ctx.strokeStyle = "rgba(255,196,229,0.86)";
    ctx.beginPath();
    ctx.moveTo(rulerX, rulerY);
    ctx.lineTo(rulerX + contracted, rulerY);
    ctx.stroke();
    for (let i = 0; i <= 8; i += 1) {
      const x = rulerX + (contracted / 8) * i;
      ctx.beginPath();
      ctx.moveTo(x, rulerY - 4);
      ctx.lineTo(x, rulerY + 4);
      ctx.stroke();
    }

    const prismX = SCREEN_W - 82;
    const prismY = 86;
    ctx.strokeStyle = "rgba(150,196,255,0.9)";
    ctx.beginPath();
    ctx.moveTo(prismX - 28, prismY - 12);
    ctx.lineTo(prismX - 2, prismY - 2);
    ctx.lineTo(prismX + 28, prismY - 16);
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,146,168,0.82)";
    ctx.beginPath();
    ctx.moveTo(prismX - 28, prismY + 12);
    ctx.lineTo(prismX - 2, prismY + 2);
    ctx.lineTo(prismX + 28, prismY + 16);
    ctx.stroke();

    ctx.font = "11px Georgia, 'Times New Roman', serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.globalAlpha *= 0.9;
    ctx.fillText("关卡 7：相对论", 22, 18);
    ctx.font = "8px Consolas, 'Courier New', monospace";
    ctx.fillText(`v ${(beta * 100).toFixed(0)}%c`, 22, 36);
    ctx.restore();
  }

  function drawLevel7BlackHole(time, phases) {
    const visible = clamp(phases.approach + phases.capture + phases.fall * 0.8, 0, 1);
    if (visible <= 0.01) {
      return;
    }
    const t = level7.sequenceActive ? clamp(level7.sequenceTime / level7.sequenceDuration, 0, 1) : 0;
    const cx = lerp(210, SCREEN_W / 2, phases.capture * 0.55 + phases.fall * 0.38);
    const cy = lerp(150, SCREEN_H / 2, phases.capture * 0.45 + phases.fall * 0.5);
    const r = 24 + visible * 58 + phases.fall * 160;
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    const halo = ctx.createRadialGradient(cx, cy, r * 0.16, cx, cy, r * 2.4);
    halo.addColorStop(0, `rgba(70,40,130,${0.5 * visible})`);
    halo.addColorStop(0.24, `rgba(190,24,12,${0.32 * visible})`);
    halo.addColorStop(0.5, `rgba(255,82,42,${0.14 * visible})`);
    halo.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 2.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.translate(cx, cy);
    ctx.rotate(-0.22 + Math.sin(time * 0.0007) * 0.04 + phases.capture * 0.32);
    for (let pass = 0; pass < 3; pass += 1) {
      ctx.globalAlpha = visible * (pass === 0 ? 0.16 : pass === 1 ? 0.46 : 0.88);
      ctx.strokeStyle = pass === 0 ? "rgba(255,44,30,0.9)" : pass === 1 ? "rgba(255,154,92,0.9)" : "rgba(255,218,212,0.94)";
      ctx.lineWidth = pass === 0 ? 14 : pass === 1 ? 4.2 : 1.35;
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 1.26, r * 0.34, 0, Math.PI * 0.05, Math.PI * 1.95);
      ctx.stroke();
    }
    ctx.rotate(time * 0.0005);
    ctx.globalAlpha = visible * 0.5;
    ctx.strokeStyle = "rgba(80,126,255,0.75)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 24; i += 1) {
      const a = (i / 24) * Math.PI * 2 + time * 0.0008;
      const inner = r * (0.8 + Math.sin(i) * 0.08);
      const outer = r * (1.7 + (i % 5) * 0.08);
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * inner, Math.sin(a) * inner * 0.78);
      ctx.lineTo(Math.cos(a) * outer, Math.sin(a) * outer * 0.78);
      ctx.stroke();
    }
    ctx.globalCompositeOperation = "source-over";
    const shadow = ctx.createRadialGradient(0, 0, 1, 0, 0, r * 0.78);
    shadow.addColorStop(0, "#000000");
    shadow.addColorStop(0.62, "#000000");
    shadow.addColorStop(0.78, "rgba(18,8,30,0.98)");
    shadow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = shadow;
    ctx.globalAlpha = visible;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.86, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = "screen";
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.globalAlpha = visible * (0.2 + phases.earth * 0.8);
    const whitePoint = Math.max(1.2, 2 + phases.earth * 34 + smoothstep(0.52, 0.74, t) * 2);
    ctx.beginPath();
    ctx.arc(0, 0, whitePoint, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawLevel7EarthReturn(time, phases) {
    const visible = phases.earth;
    if (visible <= 0.01) {
      return;
    }
    const t = clamp(level7.sequenceTime / level7.sequenceDuration, 0, 1);
    const grow = smoothstep(0.79, 0.965, t);
    const pulse = 0.5 + Math.sin(time * 0.004) * 0.5;
    const cx = SCREEN_W / 2 + Math.sin(time * 0.0009) * 3.5 * (1 - grow);
    const cy = SCREEN_H / 2 + lerp(-6, 4, grow);
    const coreRadius = lerp(2.4, 620, grow);
    const haloRadius = coreRadius * (1.55 + 0.08 * pulse);
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    const outer = ctx.createRadialGradient(cx, cy, coreRadius * 0.55, cx, cy, Math.max(32, haloRadius));
    outer.addColorStop(0, "rgba(255,255,255,0)");
    outer.addColorStop(0.34, `rgba(170,226,255,${0.18 * visible})`);
    outer.addColorStop(0.56, `rgba(46,146,255,${0.34 * visible})`);
    outer.addColorStop(0.78, `rgba(16,68,190,${0.23 * visible})`);
    outer.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = outer;
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(24, haloRadius), 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = visible * (0.38 + grow * 0.36);
    ctx.strokeStyle = "rgba(185,226,255,0.86)";
    ctx.lineWidth = 1.2 + grow * 3.4;
    ctx.beginPath();
    ctx.arc(cx, cy, coreRadius + 2 + pulse * 7, 0, Math.PI * 2);
    ctx.stroke();

    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = "rgba(255,255,255,0.92)";
    ctx.shadowBlur = 12 + grow * 28;
    ctx.globalAlpha = visible;
    ctx.beginPath();
    ctx.arc(cx, cy, coreRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = visible * (1 - grow) * 0.55;
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 10; i += 1) {
      const a = time * 0.0013 + i * 0.72;
      const len = 46 + i * 8;
      const x = cx + Math.cos(a) * (coreRadius + 22 + i * 3);
      const y = cy + Math.sin(a) * (coreRadius + 18 + i * 3);
      ctx.beginPath();
      ctx.moveTo(x - Math.cos(a) * len * 0.45, y - Math.sin(a) * len * 0.45);
      ctx.lineTo(x + Math.cos(a) * len * 0.45, y + Math.sin(a) * len * 0.45);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawLevel7RocketDrop(time) {
    if (!level7.rocketDrop.active) {
      return;
    }
    const drop = level7.rocketDrop;
    const alpha = clamp(1 - smoothstep(SCREEN_H + 40, SCREEN_H + 150, drop.y), 0, 1);
    const scale = 0.5 + Math.sin(drop.timer * 3.2) * 0.018;
    drawRocketShape({ x: drop.x, y: drop.y }, drop.angle, scale, true, time, alpha, 0.45);
  }

  function drawLevel7(time) {
    if (!level7.active) {
      return;
    }
    drawLevel7Starfield(time);
    ctx.save();
    ctx.translate(SCREEN_W / 2, SCREEN_H / 2);
    ctx.rotate(level7.cameraRoll);
    ctx.translate(-SCREEN_W / 2, -SCREEN_H / 2);
    const t = level7.sequenceActive ? clamp(level7.sequenceTime / level7.sequenceDuration, 0, 1) : 0;
    const phases = level7.sequenceActive ? level7PhaseWindows(t) : level7PhaseWindows(0);
    drawLevel7BlackHole(time, phases);
    drawLevel7EarthReturn(time, phases);
    const tunnel = level7.sequenceActive ? smoothstep(0.08, 0.32, t) * (1 - phases.earth * 0.6) : 0;
    const contract = clamp(1 / Math.max(level7.gamma, 1), 0.34, 1);
    const rocketFade = 1 - smoothstep(0.955, 0.995, t);
    const scale = 0.88 + tunnel * 0.22 + level7.warpPulse * 0.04 - phases.approach * 0.1 - phases.fall * 0.16 - phases.earth * 0.14;
    const center = {
      x: level7.rocketScreen.x,
      y: level7.rocketScreen.y,
    };
    if (rocketFade > 0.02) {
      ctx.save();
      ctx.translate(center.x, center.y);
      ctx.scale(lerp(1, contract, tunnel), 1);
      ctx.translate(-center.x, -center.y);
      drawRocketShape(center, level7.rocketAngle, scale, level7.sequenceActive, time, level7.alpha * rocketFade, level7.sequenceActive ? clamp(level7.displayBeta, 0.18, 1) : 0.08);
      drawSeatedStickmanOnRocket(center, level7.rocketAngle, scale, level7.alpha * rocketFade, time);
      ctx.restore();
    }

    if (level7.sequenceActive && rocketFade > 0.02) {
      const noseX = center.x - Math.cos(level7.rocketAngle) * 78 * LEVEL5_ROCKET_SCALE * scale;
      const noseY = center.y - Math.sin(level7.rocketAngle) * 78 * LEVEL5_ROCKET_SCALE * scale;
      ctx.globalCompositeOperation = "screen";
      const cone = ctx.createLinearGradient(noseX - 180, noseY, noseX + 130, noseY);
      cone.addColorStop(0, "rgba(255,80,116,0.06)");
      cone.addColorStop(0.52, "rgba(255,255,255,0)");
      cone.addColorStop(1, "rgba(80,156,255,0.13)");
      ctx.fillStyle = cone;
      ctx.beginPath();
      ctx.ellipse(noseX + 12, noseY, 250, 54 + tunnel * 28, level7.rocketAngle, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    if (t < 0.48) {
      drawLevel7RelativityMarks(time);
    }
    if (!level7.sequenceActive && level7.messageTimer > 0) {
      ctx.save();
      ctx.globalAlpha = level7.alpha * clamp(level7.messageTimer, 0, 1) * 0.72;
      ctx.fillStyle = WHITE;
      ctx.shadowColor = "rgba(255,255,255,0.24)";
      ctx.shadowBlur = 4;
      ctx.font = "10px Georgia, 'Times New Roman', serif";
      ctx.textAlign = "center";
      ctx.fillText(level7.sequencePlayed ? "速度回落，星光恢复" : "把 v 调高，再拖回火箭", SCREEN_W / 2, 48);
      ctx.restore();
    }
  }

  function drawEnvironment(time) {
    const iceStart = worldToScreen({ x: terrain.ice.x1, y: FLOOR_Y }).x;
    const iceEnd = worldToScreen({ x: terrain.ice.x2, y: FLOOR_Y }).x;
    const floorY = floorScreenY();
    const iceWidth = iceEnd - iceStart;

    ctx.save();
    const slick = 1 - world.iceFriction;
    const topIce = ctx.createLinearGradient(iceStart, floorY, iceEnd, floorY + 80);
    topIce.addColorStop(0, `rgba(20, 20, 22, ${0.24 + slick * 0.28})`);
    topIce.addColorStop(0.35, `rgba(76, 76, 80, ${0.38 + slick * 0.24})`);
    topIce.addColorStop(1, `rgba(140, 140, 144, ${0.2 + slick * 0.16})`);
    ctx.fillStyle = topIce;
    ctx.beginPath();
    ctx.moveTo(iceStart - 4, floorY + 1);
    ctx.lineTo(iceEnd + 26, floorY + 1);
    ctx.lineTo(iceEnd + 56, floorY + 82);
    ctx.lineTo(iceStart + 46, floorY + 65);
    ctx.bezierCurveTo(iceStart - 42, floorY + 58, iceStart - 38, floorY + 18, iceStart - 4, floorY + 1);
    ctx.closePath();
    ctx.fill();

    const underIce = ctx.createLinearGradient(0, floorY + 26, 0, floorY + 126);
    underIce.addColorStop(0, `rgba(255,255,255,${0.12 + slick * 0.1})`);
    underIce.addColorStop(0.42, `rgba(72,72,76,${0.16 + slick * 0.16})`);
    underIce.addColorStop(1, "rgba(210,210,214,0)");
    ctx.fillStyle = underIce;
    ctx.beginPath();
    ctx.moveTo(iceStart + 44, floorY + 64);
    ctx.lineTo(iceEnd + 56, floorY + 82);
    ctx.lineTo(iceEnd + 78, floorY + 132);
    ctx.lineTo(iceStart + 110, floorY + 118);
    ctx.closePath();
    ctx.fill();

    if (player.worldX > terrain.ice.x1 - 45 && player.worldX < terrain.ice.x2 + 45) {
      const reflection = worldToScreen({ x: player.worldX, y: FLOOR_Y + 10 });
      ctx.save();
      ctx.globalAlpha = 0.12 + slick * 0.1;
      ctx.translate(reflection.x, reflection.y);
      ctx.scale(1, -0.75);
      ctx.strokeStyle = ORANGE;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = 4.5 * camera.zoom;
      ctx.beginPath();
      ctx.moveTo(-10 * camera.zoom, -4 * camera.zoom);
      ctx.lineTo(4 * camera.zoom, -38 * camera.zoom);
      ctx.lineTo(14 * camera.zoom, -8 * camera.zoom);
      ctx.stroke();
      ctx.restore();
    }

    ctx.strokeStyle = `rgba(255,255,255,${0.48 + slick * 0.28})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(iceStart - 2, floorY + 1.5);
    ctx.lineTo(iceEnd + 24, floorY + 1.5);
    ctx.stroke();

    ctx.globalAlpha = 0.16 + slick * 0.24;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1;
    for (let i = 0; i < 9; i += 1) {
      const x = iceStart + 38 + i * 55 - ((camera.x * 0.35) % 55);
      ctx.beginPath();
      ctx.moveTo(x, floorY + 17 + Math.sin(i) * 4);
      ctx.lineTo(x + 36, floorY + 15 + Math.cos(i) * 3);
      ctx.stroke();
    }
    ctx.restore();

    for (const step of terrain.stairs) {
      drawWorldRect(step.x, FLOOR_Y - step.h, step.w, step.h, "rgba(219, 219, 222, 0.98)", "rgba(245,245,245,0.9)");
    }

    drawWindmill(time);
    drawLevel4(time);
    drawLevel5(time);
  }

  function drawWindmill(time) {
    const windmill = terrain.windmill;
    const center = worldToScreen({ x: windmill.x, y: windmill.y });
    if (center.x < -120 || center.x > SCREEN_W + 120) {
      return;
    }

    ctx.save();
    ctx.strokeStyle = WHITE;
    ctx.fillStyle = WHITE;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 2.2;
    const base = worldToScreen({ x: windmill.x, y: FLOOR_Y });
    const mastTop = worldToScreen({ x: windmill.x, y: windmill.y + 2 });
    ctx.beginPath();
    ctx.moveTo(base.x - 28 * camera.zoom, base.y);
    ctx.lineTo(mastTop.x, mastTop.y);
    ctx.lineTo(base.x + 28 * camera.zoom, base.y);
    ctx.stroke();
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(base.x, base.y);
    ctx.lineTo(center.x, center.y + 6 * camera.zoom);
    ctx.stroke();

    const horizontalRotor = Math.abs(world.windmillAxis.y) > 0.35;
    const spinSign = world.windmillAxis.y > 0 ? -1 : 1;
    const angle = time * 0.0017 * Math.max(world.windmillSpin, 0.8) * spinSign;
    if (horizontalRotor) {
      const rx = windmill.r * camera.zoom * 1.12;
      const ry = windmill.r * camera.zoom * 0.24;
      ctx.save();
      ctx.globalAlpha = 0.28;
      ctx.beginPath();
      ctx.ellipse(center.x, center.y, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      ctx.lineWidth = 2.4;
      for (let i = 0; i < 4; i += 1) {
        const a = angle + i * Math.PI * 0.5;
        const depth = 0.46 + Math.max(0, Math.sin(a)) * 0.54;
        const tip = {
          x: center.x + Math.cos(a) * rx,
          y: center.y + Math.sin(a) * ry,
        };
        ctx.globalAlpha = 0.42 + depth * 0.58;
        ctx.beginPath();
        ctx.moveTo(center.x, center.y);
        ctx.lineTo(tip.x, tip.y);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(tip.x, tip.y, 1.7 + depth * 1.3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(center.x, center.y - 26 * camera.zoom);
      ctx.lineTo(center.x, center.y + 28 * camera.zoom);
      ctx.stroke();
      if (world.windmillAxis.y > 0) {
        ctx.globalAlpha = 0.18 + Math.min(world.windmillSpin / 9, 1) * 0.42;
        ctx.lineWidth = 1;
        for (let i = 0; i < 7; i += 1) {
          const drift = ((time * 0.055 + i * 19) % 42) * camera.zoom;
          const x = center.x - 28 * camera.zoom + i * 9 * camera.zoom;
          const y0 = center.y + 34 * camera.zoom + drift;
          ctx.beginPath();
          ctx.moveTo(x, y0);
          ctx.lineTo(x, y0 + 20 * camera.zoom);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
    } else {
      for (let i = 0; i < 4; i += 1) {
        const a = angle + i * Math.PI * 0.5;
        const inner = {
          x: center.x + Math.cos(a - 0.18) * windmill.r * camera.zoom * 0.2,
          y: center.y + Math.sin(a - 0.18) * windmill.r * camera.zoom * 0.2,
        };
        const tip = {
          x: center.x + Math.cos(a) * windmill.r * camera.zoom,
          y: center.y + Math.sin(a) * windmill.r * camera.zoom,
        };
        const wing = {
          x: center.x + Math.cos(a + 0.34) * windmill.r * camera.zoom * 0.78,
          y: center.y + Math.sin(a + 0.34) * windmill.r * camera.zoom * 0.78,
        };
        ctx.globalAlpha = 0.18;
        ctx.beginPath();
        ctx.moveTo(inner.x, inner.y);
        ctx.lineTo(tip.x, tip.y);
        ctx.lineTo(wing.x, wing.y);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 0.96;
        ctx.beginPath();
        ctx.moveTo(center.x, center.y);
        ctx.lineTo(tip.x, tip.y);
        ctx.stroke();
      }
    }
    ctx.beginPath();
    ctx.arc(center.x, center.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawWorldText(text, x, y, alpha = 0.68, size = 13) {
    const point = worldToScreen({ x, y });
    if (point.x < 24 || point.x > SCREEN_W - 24 || point.y < 20 || point.y > SCREEN_H - 20) {
      return;
    }
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = WHITE;
    ctx.shadowColor = "rgba(255,255,255,0.35)";
    ctx.shadowBlur = 4;
    ctx.font = `${size}px Cambria Math, Georgia, 'Times New Roman', serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, point.x, point.y);
    ctx.restore();
  }

  function drawSceneCues(time) {
    void time;
  }

  function drawEffects() {
    for (const effect of effects) {
      const t = 1 - effect.life / effect.ttl;
      const center = effect.screen ? { x: effect.x, y: effect.y } : worldToScreen({ x: effect.x, y: effect.y });
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - t);
      ctx.strokeStyle = effect.color;
      ctx.fillStyle = effect.color;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.shadowColor = effect.color;
      ctx.shadowBlur = 8 * (1 - t);

      if (effect.type === "impulse") {
        const radius = 10 + t * (20 + effect.value * 2);
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.lineWidth = 2.2;
        for (let i = 0; i < 3; i += 1) {
          const spread = (i - 1) * 0.28;
          const angle = Math.atan2(effect.direction.y, effect.direction.x) + spread;
          const start = radius * 0.28;
          const end = radius * 1.18;
          ctx.beginPath();
          ctx.moveTo(center.x + Math.cos(angle) * start, center.y + Math.sin(angle) * start);
          ctx.lineTo(center.x + Math.cos(angle) * end, center.y + Math.sin(angle) * end);
          ctx.stroke();
        }
      }

      if (effect.type === "surface") {
        ctx.lineWidth = 1.5;
        const width = 48 + t * 95;
        ctx.beginPath();
        ctx.moveTo(center.x - width * 0.5, center.y + 2);
        ctx.lineTo(center.x + width * 0.5, center.y + 2);
        ctx.stroke();
        ctx.globalAlpha *= 0.45;
        ctx.beginPath();
        ctx.arc(center.x, center.y - 6, 18 + t * 34, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  function composedTrajectorySource() {
    if (world.trajectoryTimer > 0 && Math.abs(player.vx) > 35 && Math.abs(player.vy) > 35) {
      return {
        vx: player.vx,
        vy: player.vy,
        live: true,
      };
    }
    return null;
  }

  function drawParabolicTrajectory() {
    const source = composedTrajectorySource();
    if (!source || Math.hypot(source.vx, source.vy) < 70) {
      return;
    }
    const start = { x: player.worldX, y: player.y - 36 };
    const gravity = player.appliedAcceleration ? 800 : 890;
    const points = [];
    for (let i = 0; i < 42; i += 1) {
      const t = i * 0.066;
      const x = start.x + source.vx * t;
      const y = start.y + source.vy * t + 0.5 * gravity * t * t;
      const floor = floorAt(x, y);
      points.push({ x, y: Math.min(y, floor - 3) });
      if (i > 5 && y >= floor - 2) {
        break;
      }
    }
    if (points.length < 4) {
      return;
    }

    const tracePath = () => {
      const first = worldToScreen(points[0]);
      ctx.beginPath();
      ctx.moveTo(first.x, first.y);
      for (let index = 1; index < points.length; index += 1) {
        const point = worldToScreen(points[index]);
        ctx.lineTo(point.x, point.y);
      }
    };

    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.setLineDash([4, 5]);
    tracePath();
    ctx.strokeStyle = "rgba(0,0,0,0.72)";
    ctx.lineWidth = 3.1;
    ctx.stroke();
    tracePath();
    ctx.strokeStyle = source.live ? "rgba(255,255,255,0.64)" : "rgba(255,255,255,0.48)";
    ctx.lineWidth = 1.1;
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = source.live ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.58)";
    for (let index = 3; index < points.length; index += 5) {
      const point = worldToScreen(points[index]);
      ctx.beginPath();
      ctx.arc(point.x, point.y, 1.45, 0, Math.PI * 2);
      ctx.fill();
    }

    const last = worldToScreen(points[points.length - 1]);
    const prev = worldToScreen(points[Math.max(0, points.length - 3)]);
    const angle = Math.atan2(last.y - prev.y, last.x - prev.x);
    ctx.strokeStyle = "rgba(255,255,255,0.66)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(last.x - Math.cos(angle - 0.68) * 6, last.y - Math.sin(angle - 0.68) * 6);
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(last.x - Math.cos(angle + 0.68) * 6, last.y - Math.sin(angle + 0.68) * 6);
    ctx.stroke();
    ctx.restore();
  }

  function drawTargetHighlights() {
    if (!pointer.token || !pointer.hoverTarget) {
      return;
    }
    ctx.save();
    ctx.strokeStyle = WHITE;
    ctx.fillStyle = pointer.hoverTarget === "ice" ? ORANGE : WHITE;
    ctx.shadowColor = ctx.strokeStyle;
    ctx.shadowBlur = 8;
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 1.5;

    if (pointer.hoverTarget === "player") {
      const head = level5.active && pointer.token?.type === "rocket" ? level5PlayerTarget() : playerHeadTarget();
      ctx.strokeStyle = WHITE;
      ctx.shadowColor = "rgba(255,255,255,0.9)";
      ctx.globalAlpha = 0.72;
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      if (level5.active && pointer.token?.type === "rocket") {
        ctx.ellipse(head.x, head.y, head.r * 0.72, head.r * 0.48, -0.08, 0, Math.PI * 2);
      } else {
        ctx.arc(head.x, head.y, 31, 0, Math.PI * 2);
      }
      ctx.stroke();
      ctx.globalAlpha = 0.28;
      ctx.beginPath();
      if (level5.active && pointer.token?.type === "rocket") {
        ctx.ellipse(head.x, head.y, head.r * 0.88, head.r * 0.6, -0.08, 0, Math.PI * 2);
      } else {
        ctx.arc(head.x, head.y, 38, 0, Math.PI * 2);
      }
      ctx.stroke();
    }

    if (pointer.hoverTarget === "ice") {
      const ice = iceRuleTarget();
      ctx.strokeStyle = ORANGE;
      ctx.fillStyle = ORANGE;
      ctx.shadowColor = ORANGE;
      ctx.beginPath();
      ctx.moveTo(ice.x1 + 8, ice.y);
      ctx.lineTo(ice.x2 - 8, ice.y);
      ctx.stroke();
      ctx.globalAlpha = 0.3;
      ctx.fillRect(ice.x1, ice.y - 24, ice.x2 - ice.x1, 48);
    }

    if (pointer.hoverTarget === "windmill") {
      const target = windmillRuleTarget();
      ctx.strokeStyle = WHITE;
      ctx.globalAlpha = 0.45;
      ctx.beginPath();
      ctx.arc(target.x, target.y, target.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 0.18;
      ctx.beginPath();
      ctx.arc(target.x, target.y, target.r + 10, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (pointer.hoverTarget === "rocket") {
      const target = slingshot.active ? slingshotRocketTarget() : level5RocketTarget();
      ctx.strokeStyle = WHITE;
      ctx.shadowColor = "rgba(255,255,255,0.9)";
      ctx.globalAlpha = 0.48;
      ctx.beginPath();
      ctx.ellipse(target.x, target.y, target.r * 1.2, target.r * 0.58, slingshot.active ? slingshot.rocketAngle : -0.12, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 0.18;
      ctx.beginPath();
      ctx.ellipse(target.x, target.y, target.r * 1.45, target.r * 0.72, slingshot.active ? slingshot.rocketAngle : -0.12, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (pointer.hoverTarget === "level7Rocket") {
      const target = level7RocketTarget();
      ctx.strokeStyle = WHITE;
      ctx.shadowColor = "rgba(255,255,255,0.9)";
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.ellipse(target.x, target.y, target.r * 1.28, target.r * 0.52, target.angle, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 0.18;
      ctx.beginPath();
      ctx.ellipse(target.x, target.y, target.r * 1.55, target.r * 0.66, target.angle, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (pointer.hoverTarget === "workbench") {
      ctx.strokeRect(workbench.x - 4, workbench.y - 4, workbench.w + 8, workbench.h + 8);
    }
    ctx.restore();
  }

  function drawWorkbench() {
    if ((!slingshot.active && level5.active && level5.thrustApplied && level5.reveal > 0.22 && !workbench.activeToken && !pointer.token) || (level7.active && level7.sequenceActive)) {
      return;
    }
    ctx.save();
    const pulse = workbench.pulse;
    const level7Focus = level7.active ? 0.38 : 0;
    const focus = Math.max(pulse, pointer.hoverTarget === "workbench" ? 0.7 : 0, workbench.activeToken ? 0.48 : 0, level7Focus);
    ctx.globalAlpha = 0.2 + focus * 0.62;
    ctx.fillStyle = "rgba(0, 0, 0, 0.24)";
    ctx.fillRect(workbench.x, workbench.y, workbench.w, workbench.h);
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.2 + focus * 0.58})`;
    ctx.lineWidth = 1 + focus * 0.45;
    ctx.strokeRect(workbench.x, workbench.y, workbench.w, workbench.h);

    const metrics = workbenchMetrics();

    ctx.globalAlpha = 0.24 + focus * 0.6;
    ctx.fillStyle = WHITE;
    ctx.font = "10px Georgia, 'Times New Roman', serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText("变量表", workbench.x + 10, metrics.titleY);

    const chargeToken = tokens.find((token) => token.type === "charge" && token.mode === "bench" && token.visible);
    const slingshotCurve = tokens.find((token) => token.type === "curvature" && token.mode === "bench" && token.visible);
    const drawMiniButton = (label, x, y, active = true) => {
      ctx.globalAlpha = active ? 0.74 + focus * 0.2 : 0.24;
      ctx.fillStyle = "rgba(0, 0, 0, 0.42)";
      ctx.strokeStyle = "rgba(255, 255, 255, 0.72)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x, y, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = WHITE;
      ctx.font = "12px Georgia, 'Times New Roman', serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, x, y - 1);
    };
    if (slingshot.active) {
      ctx.font = "7px Consolas, 'Courier New', monospace";
      ctx.fillText("VAR", workbench.x + 14, metrics.headerY);
      ctx.fillText("ARC", workbench.x + 62, metrics.headerY);
      ctx.globalAlpha = 0.1 + focus * 0.18;
      ctx.strokeStyle = WHITE;
      ctx.beginPath();
      ctx.moveTo(workbench.x + 12, metrics.topLineY);
      ctx.lineTo(workbench.x + workbench.w - 12, metrics.topLineY);
      ctx.stroke();
      ctx.globalAlpha = 0.64 + focus * 0.26;
      ctx.font = "8px Consolas, 'Courier New', monospace";
      ctx.fillStyle = WHITE;
      ctx.fillText(slingshotCurve ? "s" : "-", workbench.x + 16, metrics.firstRowY);
      ctx.fillText(slingshotCurve ? `${Math.round(slingshotCurve.value)}%` : "-", workbench.x + 62, metrics.firstRowY);
      drawMiniButton("-", metrics.valueMinusX, metrics.firstRowY, Boolean(slingshotCurve));
      drawMiniButton("+", metrics.valuePlusX, metrics.firstRowY, Boolean(slingshotCurve));
      ctx.globalAlpha = slingshotCurve ? 0.62 + focus * 0.16 : 0.22;
      ctx.fillStyle = WHITE;
      ctx.font = "6.5px Consolas, 'Courier New', monospace";
      ctx.textAlign = "left";
      ctx.fillText("拖到火箭预瞄", workbench.x + 12, metrics.outRowY);
      ctx.restore();
      return;
    }
    if (level4.active) {
      ctx.font = "7px Consolas, 'Courier New', monospace";
      ctx.fillText("VAR", workbench.x + 14, metrics.headerY);
      ctx.fillText("CHARGE", workbench.x + 62, metrics.headerY);
      ctx.globalAlpha = 0.1 + focus * 0.18;
      ctx.strokeStyle = WHITE;
      ctx.beginPath();
      ctx.moveTo(workbench.x + 12, metrics.topLineY);
      ctx.lineTo(workbench.x + workbench.w - 12, metrics.topLineY);
      ctx.stroke();
      ctx.globalAlpha = 0.64 + focus * 0.26;
      ctx.font = "8px Consolas, 'Courier New', monospace";
      ctx.fillStyle = WHITE;
      ctx.fillText(chargeToken ? "q" : "-", workbench.x + 16, metrics.firstRowY);
      ctx.fillText(chargeToken ? tokenLabel(chargeToken) : "-", workbench.x + 62, metrics.firstRowY);
      drawMiniButton("-", metrics.valueMinusX, metrics.firstRowY, Boolean(chargeToken));
      drawMiniButton("+", metrics.valuePlusX, metrics.firstRowY, Boolean(chargeToken));
      ctx.globalAlpha = chargeToken ? 0.62 + focus * 0.16 : 0.22;
      ctx.fillStyle = WHITE;
      ctx.font = "6.5px Consolas, 'Courier New', monospace";
      ctx.textAlign = "left";
      ctx.fillText("拖回身体生效", workbench.x + 12, metrics.outRowY);
      ctx.restore();
      return;
    }

    ctx.font = "6.5px Consolas, 'Courier New', monospace";
    ctx.fillText("VAR", workbench.x + 12, metrics.headerY);
    ctx.fillText("VALUE", workbench.x + 62, metrics.headerY);
    ctx.fillText("DIR", workbench.x + 132, metrics.headerY);

    ctx.globalAlpha = 0.08 + focus * 0.22;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(metrics.splitVarX, workbench.y + 27);
    ctx.lineTo(metrics.splitVarX, workbench.y + workbench.h - 8);
    ctx.moveTo(metrics.splitValueX, workbench.y + 27);
    ctx.lineTo(metrics.splitValueX, workbench.y + workbench.h - 8);
    for (let i = 0; i < 5; i += 1) {
      const y = i === 0 ? metrics.topLineY : metrics.firstRowY + (i - 1) * metrics.rowGap + metrics.rowGap * 0.5;
      ctx.moveTo(workbench.x + 7, y);
      ctx.lineTo(workbench.x + workbench.w - 7, y);
    }
    ctx.stroke();

    const benchTokens = tokens.filter((token) => token.mode === "bench" && token.visible);
    ctx.globalAlpha = 0.58 + focus * 0.26;
    ctx.fillStyle = WHITE;
    ctx.font = "7px Consolas, 'Courier New', monospace";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    for (const token of benchTokens) {
      const center = tokenCenter(token);
      const valueText = token.type === "mu"
        ? token.value.toFixed(1).replace(".0", "")
        : token.type === "temperature"
        ? Math.round(token.value).toString()
        : token.role === "level7_speed"
        ? `${level7BetaFromToken(token).toFixed(2)}c`
        : token.value.toFixed(1).replace(".0", "");
      ctx.fillText(valueText, workbench.x + 65, center.y);
      ctx.fillText(token.type === "mu" || token.type === "temperature" || token.role === "level7_speed" ? "-" : directionMark(token.direction, token), metrics.dirX - 4, center.y);
      if (token.generated) {
        ctx.globalAlpha = 0.42;
        ctx.fillText("OUT", workbench.x + 58, center.y);
        ctx.globalAlpha = 0.58 + focus * 0.26;
      }
    }

    if (benchTokens.filter((token) => token.type === "velocity" && !token.generated).length >= 2) {
      ctx.globalAlpha = 0.75;
      ctx.fillStyle = WHITE;
      ctx.font = "13px Georgia, 'Times New Roman', serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("+", workbench.x + 42, (slotPoint(0).y + slotPoint(1).y) * 0.5);
      ctx.fillText("=", workbench.x + 42, (slotPoint(1).y + slotPoint(3).y) * 0.5);
    }
    if (benchTokens.some((token) => token.type === "omega" && !token.generated)) {
      ctx.globalAlpha = 0.72;
      ctx.fillStyle = WHITE;
      ctx.font = "10px Cambria Math, Georgia, 'Times New Roman', serif";
      ctx.textAlign = "center";
      ctx.fillText("→ 风", workbench.x + 92, slotPoint(3).y);
    }

    if (workbench.activeToken && workbench.activeToken.mode === "bench") {
      const center = tokenCenter(workbench.activeToken);
      const drawControl = (label, x, y) => {
        ctx.globalAlpha = 0.82;
        ctx.fillStyle = "rgba(0, 0, 0, 0.46)";
        ctx.strokeStyle = "rgba(255, 255, 255, 0.84)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(x, y, 7.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = WHITE;
        ctx.font = "11px Georgia, 'Times New Roman', serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(label, x, y - 1);
      };
      drawControl("-", metrics.valueMinusX, center.y);
      drawControl("+", metrics.valuePlusX, center.y);
      if (workbench.activeToken.type !== "temperature" && workbench.activeToken.role !== "level7_speed") {
        drawControl("↑", metrics.dirButtonX, center.y - 10);
        drawControl("↓", metrics.dirButtonX, center.y + 10);
      }
      ctx.globalAlpha = 0.34;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(workbench.x + 12, center.y + 16);
      ctx.lineTo(workbench.x + workbench.w - 12, center.y + 16);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawToken(token) {
    if (!token.visible) {
      return;
    }
    if (token.type === "rocket") {
      return;
    }
    const center = tokenCenter(token);
    if (center.x < -60 || center.x > SCREEN_W + 60 || center.y < -80 || center.y > SCREEN_H + 80) {
      return;
    }

    const active = token === workbench.activeToken || token === pointer.token;
    const pulse = token.flash;
    const levelFade = token.role === "level4_charge" && level4.active ? level4.alpha : 1;
    const slingshotFade = token.role === "slingshot_curve" && slingshot.active ? slingshot.alpha : 1;
    const transitionFade = token.type === "charge" && token.mode === "attached" && level4.phase === "electricToMagnetic"
      ? level4TransitionChargeAlpha()
      : 1;
    const tokenFade = levelFade * slingshotFade * transitionFade;
    if (tokenFade <= 0.02) {
      return;
    }
    const pop = clamp(token.pop || 0, 0, 1);
    const popScale = pop > 0 ? 1 + Math.sin(pop * Math.PI) * 0.42 : 1;
    const popLift = pop > 0 ? Math.sin(pop * Math.PI) * 8 : 0;
    ctx.save();
    if (pop > 0) {
      ctx.translate(center.x, center.y - popLift);
      ctx.scale(popScale, popScale);
      ctx.translate(-center.x, -center.y);
    }
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.shadowColor = token.type === "mu" || token.type === "charge" || token.type === "curvature" ? "rgba(255,255,255,0.55)" : "rgba(255, 110, 0, 0.45)";
    ctx.shadowBlur = active ? 8 : 3 + pulse * 5 + (token.type === "charge" && token.stateValue === "positive" ? level4.fieldGlow * 8 : 0);

    if (token.type === "curvature") {
      ctx.globalAlpha = tokenFade * (active ? 1 : 0.9);
      ctx.strokeStyle = WHITE;
      ctx.fillStyle = WHITE;
      ctx.lineWidth = active ? 1.8 : 1.2;
      ctx.beginPath();
      ctx.arc(center.x, center.y, 11, Math.PI * 0.82, Math.PI * 1.86);
      ctx.stroke();
      ctx.beginPath();
      const arrowA = Math.PI * 1.86;
      const ax = center.x + Math.cos(arrowA) * 11;
      const ay = center.y + Math.sin(arrowA) * 11;
      ctx.moveTo(ax, ay);
      ctx.lineTo(ax + 3, ay - 5);
      ctx.lineTo(ax + 6, ay + 1);
      ctx.stroke();
      ctx.font = "italic 15px Cambria Math, Georgia, 'Times New Roman', serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.strokeStyle = "rgba(0,0,0,0.82)";
      ctx.lineWidth = 2.3;
      ctx.strokeText("s", center.x, center.y + 2);
      ctx.fillText("s", center.x, center.y + 2);
      if (active || token.mode === "bench") {
        ctx.shadowBlur = 0;
        ctx.globalAlpha = tokenFade * 0.78;
        ctx.font = "8px Consolas, 'Courier New', monospace";
        ctx.fillText(`${Math.round(token.value)}%`, center.x, center.y + 23);
      }
      ctx.restore();
      return;
    }

    if (token.mode === "head" && !active) {
      if (isVerticalVelocity(token)) {
        const mark = token.direction.y < 0 ? "↑" : "↓";
        const speedText = `${token.value.toFixed(1).replace(".0", "")} m/s`;
        ctx.globalAlpha = 0.95;
        ctx.shadowBlur = 5 + pulse * 5;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.strokeStyle = "rgba(0,0,0,0.88)";
        ctx.lineWidth = 2.8;
        ctx.font = "italic 15px Cambria Math, Georgia, 'Times New Roman', serif";
        ctx.strokeText("v", center.x - 8, center.y + 1);
        ctx.fillStyle = WHITE;
        ctx.fillText("v", center.x - 8, center.y + 1);
        ctx.fillStyle = WHITE;
        ctx.font = "20px Cambria Math, Georgia, 'Times New Roman', serif";
        ctx.strokeText(mark, center.x + 13, center.y - 1);
        ctx.fillText(mark, center.x + 13, center.y - 1);

        ctx.shadowBlur = 2;
        ctx.font = "7.2px Consolas, 'Courier New', monospace";
        ctx.textBaseline = "top";
        ctx.lineWidth = 2;
        ctx.strokeText(speedText, center.x + 1, center.y + 16);
        ctx.fillText(speedText, center.x + 1, center.y + 16);
        ctx.restore();
        return;
      }
      ctx.globalAlpha = 0.92;
      ctx.fillStyle = WHITE;
      ctx.shadowBlur = 4 + pulse * 5;
      ctx.font = "italic 11.5px Cambria Math, Georgia, 'Times New Roman', serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.strokeStyle = "rgba(0,0,0,0.85)";
      ctx.lineWidth = 1.8;
      ctx.strokeText("v", center.x, center.y + 1);
      ctx.fillText("v", center.x, center.y + 1);
      ctx.restore();
      return;
    }

    ctx.globalAlpha = (token.mode === "head" ? 0.9 : 1) * tokenFade;
    ctx.strokeStyle = active ? "#ffffff" : DIM_WHITE;
    ctx.lineWidth = active ? 1.4 : 1;
    if (active) {
      ctx.globalAlpha = (0.34 + pulse * 0.22) * tokenFade;
      ctx.beginPath();
      ctx.moveTo(center.x - 15, center.y + 14);
      ctx.lineTo(center.x + 15, center.y + 14);
      ctx.stroke();
    }

    ctx.fillStyle = token.type === "velocity" || token.type === "acceleration" ? ORANGE : WHITE;
    ctx.globalAlpha = (token.mode === "bench" ? 0.92 : 1) * tokenFade;
    const labelSize = token.mode === "bench"
      ? (token.type === "mu" ? 8.8 : (token.type === "charge" || token.type === "temperature" ? 12.5 : 11.5))
      : (token.type === "mu" ? 10.5 : (token.type === "charge" || token.type === "temperature" ? 15.5 : 14.5));
    ctx.font = token.type === "mu" || token.type === "charge" || token.type === "temperature"
      ? `${labelSize}px Cambria Math, Georgia, 'Times New Roman', serif`
      : `italic ${labelSize}px Cambria Math, Georgia, 'Times New Roman', serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const label = tokenLabel(token);
    ctx.strokeStyle = "rgba(0,0,0,0.86)";
    ctx.lineWidth = 2.4;
    ctx.strokeText(label, center.x, center.y + (token.type === "mu" ? 0 : -1));
    ctx.fillText(label, center.x, center.y + (token.type === "mu" ? 0 : -1));

    if (token.type !== "mu" && token.type !== "charge" && token.type !== "temperature") {
      const direction = token.direction;
      ctx.strokeStyle = WHITE;
      ctx.fillStyle = WHITE;
      if (isScreenOmega(token)) {
        ctx.font = `${token.mode === "bench" ? 11 : 14}px Cambria Math, Georgia, 'Times New Roman', serif`;
        const mark = directionMark(direction, token);
        ctx.strokeStyle = "rgba(0,0,0,0.86)";
        ctx.lineWidth = 2.2;
        ctx.strokeText(mark, center.x + (token.mode === "bench" ? 12 : 16), center.y - 1);
        ctx.fillText(mark, center.x + (token.mode === "bench" ? 12 : 16), center.y - 1);
      } else {
        const arrowLength = token.mode === "bench" ? 13 : 22;
        const start = { x: center.x + 10 - direction.x * 2, y: center.y - direction.y * 2 };
        const end = { x: center.x + 10 + direction.x * arrowLength, y: center.y + direction.y * arrowLength };
        ctx.strokeStyle = "rgba(0,0,0,0.85)";
        ctx.lineWidth = 3.6;
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
        ctx.strokeStyle = WHITE;
        ctx.lineWidth = 1.7;
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
        const angle = Math.atan2(direction.y, direction.x);
        ctx.strokeStyle = "rgba(0,0,0,0.85)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(end.x, end.y);
        ctx.lineTo(end.x - Math.cos(angle - 0.65) * 5, end.y - Math.sin(angle - 0.65) * 5);
        ctx.lineTo(end.x - Math.cos(angle + 0.65) * 5, end.y - Math.sin(angle + 0.65) * 5);
        ctx.closePath();
        ctx.stroke();
        ctx.fillStyle = WHITE;
        ctx.fill();
      }
    }

    if (active && token.mode !== "bench" && token.type !== "charge" && token.type !== "temperature") {
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 0.82 * tokenFade;
      ctx.fillStyle = WHITE;
      ctx.font = "8px Consolas, 'Courier New', monospace";
      const suffix = token.role === "level7_speed" ? "c" : (token.type === "velocity" ? " m/s" : (token.type === "acceleration" ? " m/s2" : ""));
      const valueText = token.role === "level7_speed"
        ? level7BetaFromToken(token).toFixed(2)
        : token.value.toFixed(1).replace(".0", "");
      const readout = `${valueText}${suffix}`;
      ctx.fillText(readout, center.x, center.y + 23);
      if (token.type !== "mu" && token.type !== "charge") {
        ctx.font = "11px Georgia, 'Times New Roman', serif";
        ctx.fillText(directionMark(token.direction, token), center.x + 22, center.y - 12);
      }
    }
    ctx.restore();
  }

  function strokeWorld(points) {
    const first = worldToScreen(points[0]);
    ctx.beginPath();
    ctx.moveTo(first.x, first.y);
    for (let index = 1; index < points.length; index += 1) {
      const point = worldToScreen(points[index]);
      ctx.lineTo(point.x, point.y);
    }
    ctx.stroke();
  }

  function legPose(hip, phase, side, stride, liftScale, facing, airborne, slip, footBaseY) {
    const swing = Math.sin(phase);
    const lift = Math.max(0, Math.cos(phase)) ** 1.35 * liftScale;
    const slipDrag = slip * Math.max(0, -swing) * 14;
    const foot = {
      x: hip.x + facing * (swing * stride - 3 * side - slipDrag),
      y: footBaseY - 1 - lift - airborne * (8 + side * 1.5),
    };
    const midX = (hip.x + foot.x) * 0.5;
    const midY = (hip.y + foot.y) * 0.5;
    const knee = {
      x: midX + facing * side * (7 + lift * 0.36),
      y: midY - 8 - lift * 0.36,
    };
    return { knee, foot, lift };
  }

  function drawStickman() {
    const facing = signOrFacing(player.vx, player.facing);
    const speed = Math.abs(player.vx);
    const moving = speed > 14 || Math.abs(player.inputX) > 0 || player.appliedAcceleration;
    const idle = !moving && player.grounded ? 1 : 0;
    const speedBlend = clamp(speed / 226, 0, 1);
    const blend = clamp(player.runBlend, 0, 1);
    const airborne = player.grounded ? 0 : 1;
    const spaceBlend = clamp((FLOOR_Y - player.y) / 260, 0, 1);
    const electricWater = level4.active && level4.phase === "electric";
    const swimInput = electricWater ? Math.abs(player.inputX) : 0;
    const zeroGBlend = clamp(Math.max(spaceBlend, level4.active ? (electricWater ? 0.95 : 0.85) : 0), 0, 1);
    const slideBlend = clamp(player.slip * (speed / 220 + Math.abs(player.inputX) * 0.55), 0, 1);
    const fallBlend = clamp(player.iceFall, 0, 1);
    const squash = player.landSquash;
    const phase = player.phase;
    const idleSway = Math.sin(player.idlePhase) * idle;
    const drift = Math.sin(player.idlePhase * (electricWater ? 0.48 : 0.82)) * zeroGBlend;
    const drift2 = Math.cos(player.idlePhase * (electricWater ? 0.36 : 0.63)) * zeroGBlend;
    const stride = electricWater ? 13 + swimInput * 19 : 10 + 20 * blend + slideBlend * 8 - spaceBlend * 7;
    const lift = electricWater ? 5 + swimInput * 13 : 4 + 11 * blend + slideBlend * 3;
    const bodyFloor = floorAt(player.worldX, player.y);
    const footBaseY = player.grounded ? bodyFloor : player.y + 4 + spaceBlend * 8;
    const crouch = player.grounded ? speedBlend * 2.5 + slideBlend * 2.8 : 0;
    const bob = electricWater
      ? Math.sin(player.idlePhase * 0.55) * 2.2 - swimInput * Math.sin(phase * 1.7) * 2.4
      : player.grounded ? Math.abs(Math.sin(phase * 2)) * 1.7 * blend - squash * 2.8 + idleSway * 0.65 : -3 - spaceBlend * 4;
    const lean = electricWater
      ? facing * (2.5 + swimInput * 5.8) + Math.sin(player.idlePhase * 0.45) * 2.4
      : player.lean * (4.5 + 7.5 * blend) - facing * slideBlend * 8 + facing * spaceBlend * 5;

    const hip = {
      x: player.worldX - facing * squash * 2 - facing * spaceBlend * 3 + drift * 2.6,
      y: player.y - 26 + crouch - bob + squash * 3 + drift2 * 3.2,
    };
    const chest = {
      x: hip.x + facing * (4.5 + lean + blend * 1.1) - facing * airborne * 3 + idleSway * 0.45,
      y: hip.y - (28 - speedBlend * 2.2 - squash * 2) + airborne * 2 + spaceBlend * 5 + (electricWater ? 3.5 : 0),
    };
    const neck = {
      x: chest.x + facing * (3.8 + blend * 1.5),
      y: chest.y - 6 + speedBlend * 0.8 + idleSway * 0.25,
    };
    const head = {
      x: neck.x + facing * (7 + blend * 1.6) + drift * 1.2,
      y: neck.y - 9 + speedBlend * 1.1 + squash * 1.3 + idleSway * 0.3 - drift2 * 0.8,
      r: 12 - squash * 0.8,
    };
    const shoulder = {
      x: chest.x + facing * 1.5,
      y: chest.y + 1,
    };

    const leadLeg = legPose(hip, phase + Math.PI * 0.08, 1, stride, lift, facing, airborne, player.slip, footBaseY);
    const trailLeg = legPose(hip, phase + Math.PI * 1.08, -1, stride, lift, facing, airborne, player.slip, footBaseY);
    if (zeroGBlend > 0.02) {
      const floatKick = Math.sin(player.idlePhase * (electricWater ? 0.64 : 1.15)) * zeroGBlend;
      const floatCurl = Math.cos(player.idlePhase * (electricWater ? 0.52 : 0.92)) * zeroGBlend;
      const swimKick = Math.sin(phase) * swimInput;
      leadLeg.foot.x -= facing * (9 + 11 * zeroGBlend - floatKick * 5 - swimKick * 8);
      trailLeg.foot.x -= facing * (16 + 9 * zeroGBlend + floatKick * 4 + swimKick * 7);
      leadLeg.foot.y += (electricWater ? 20 : 14) * zeroGBlend + floatCurl * 5 * zeroGBlend + swimKick * 5;
      trailLeg.foot.y += (electricWater ? 27 : 20) * zeroGBlend - floatCurl * 4 * zeroGBlend - swimKick * 4;
      leadLeg.knee.y += (electricWater ? 15 : 10) * zeroGBlend - floatKick * 2 * zeroGBlend;
      trailLeg.knee.y += (electricWater ? 18 : 13) * zeroGBlend + floatKick * 2 * zeroGBlend;
    }

    const blendInto = (point, target, amount) => {
      point.x = lerp(point.x, target.x, amount);
      point.y = lerp(point.y, target.y, amount);
    };
    if (fallBlend > 0.02) {
      const scramble = Math.sin(phase * 2.4) * 5;
      blendInto(hip, { x: player.worldX - facing * 8, y: bodyFloor - 9 }, fallBlend);
      blendInto(chest, { x: player.worldX + facing * 13, y: bodyFloor - 18 }, fallBlend);
      blendInto(neck, { x: player.worldX + facing * 27, y: bodyFloor - 20 }, fallBlend);
      blendInto(head, { x: player.worldX + facing * 39, y: bodyFloor - 22 }, fallBlend);
      head.r = lerp(head.r, 11.2, fallBlend);
      blendInto(shoulder, { x: player.worldX + facing * 14, y: bodyFloor - 18 }, fallBlend);
      blendInto(leadLeg.foot, { x: player.worldX - facing * (24 + scramble), y: bodyFloor - 1 }, fallBlend);
      blendInto(leadLeg.knee, { x: player.worldX - facing * (10 - scramble * 0.5), y: bodyFloor - 21 }, fallBlend);
      blendInto(trailLeg.foot, { x: player.worldX + facing * (8 - scramble), y: bodyFloor - 2 }, fallBlend);
      blendInto(trailLeg.knee, { x: player.worldX + facing * (18 + scramble * 0.4), y: bodyFloor - 12 }, fallBlend);
    }
    const armSwing = Math.sin(phase + Math.PI);
    const otherArmSwing = Math.sin(phase);
    const armFloat = Math.sin(player.idlePhase * (electricWater ? 0.58 : 0.94)) * zeroGBlend;
    const swimStroke = Math.sin(phase + Math.PI * 0.25) * swimInput;
    const armReach = electricWater ? 15 + swimInput * 11 : 10 + 8 * blend + slideBlend * 3 - zeroGBlend * 4;
    const backElbow = {
      x: shoulder.x - facing * (8 + armReach * 0.4) + facing * armSwing * 7 * blend - facing * fallBlend * 9 - facing * armFloat * 4 - facing * swimStroke * 13,
      y: shoulder.y + 1 - otherArmSwing * 6 * blend + fallBlend * 9 + zeroGBlend * (5 + armFloat * 3) + (electricWater ? 5 : 0),
    };
    const backHand = {
      x: shoulder.x - facing * armReach + facing * armSwing * 9 * blend - facing * fallBlend * 11 - facing * swimStroke * 18,
      y: shoulder.y + 11 + otherArmSwing * 7 * blend + zeroGBlend * (13 + armFloat * 5) + fallBlend * 11 + (electricWater ? 7 + swimStroke * 5 : 0),
    };
    const frontElbow = {
      x: shoulder.x + facing * (7 + armReach * 0.28) - facing * armSwing * 6 * blend + facing * fallBlend * 7 + facing * armFloat * 3 + facing * swimStroke * 9,
      y: shoulder.y + 3 + otherArmSwing * 5 * blend + fallBlend * 7 + zeroGBlend * (4 - armFloat * 2) + (electricWater ? 4 - swimStroke * 3 : 0),
    };
    const frontHand = {
      x: shoulder.x + facing * (11 + armReach * 0.45) - facing * armSwing * 9 * blend + facing * fallBlend * 9 + facing * swimStroke * 15,
      y: shoulder.y + 13 - otherArmSwing * 5 * blend + zeroGBlend * (10 - armFloat * 4) + fallBlend * 9 + (electricWater ? 6 - swimStroke * 4 : 0),
    };

    ctx.save();
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.strokeStyle = ORANGE;
    ctx.shadowColor = "rgba(255, 94, 0, 0.66)";
    ctx.shadowBlur = (4.8 + player.boostFlash * 8) * camera.zoom;

    if (moving && player.grounded) {
      const foot = leadLeg.lift > trailLeg.lift ? trailLeg.foot : leadLeg.foot;
      ctx.globalAlpha = player.slip > 0.5 ? 0.55 : 0.32;
      ctx.lineWidth = 2.5 * camera.zoom;
      strokeWorld([
        { x: foot.x - facing * (13 + speed * 0.025), y: bodyFloor - 1.5 },
        { x: foot.x - facing * 2, y: bodyFloor - 1 },
      ]);
      ctx.globalAlpha = 1;
    }

    ctx.lineWidth = 5.2 * camera.zoom;
    strokeWorld([leadLeg.foot, leadLeg.knee, hip]);
    strokeWorld([trailLeg.foot, trailLeg.knee, hip]);
    strokeWorld([hip, chest, neck]);
    strokeWorld([backHand, backElbow, shoulder, frontElbow, frontHand]);

    const headScreen = worldToScreen(head);
    ctx.lineWidth = 4.6 * camera.zoom;
    ctx.beginPath();
    ctx.arc(headScreen.x, headScreen.y, head.r * camera.zoom, 0, Math.PI * 2);
    ctx.stroke();

    if (player.boostFlash > 0.1 || player.appliedAcceleration) {
      ctx.strokeStyle = "#ff7a16";
      ctx.globalAlpha = clamp(player.boostFlash + spaceBlend, 0.25, 0.9);
      ctx.lineWidth = 2.2 * camera.zoom;
      ctx.shadowBlur = 5 * camera.zoom;
      const top = head.y - head.r - 18;
      strokeWorld([
        { x: head.x - 7, y: top },
        { x: head.x, y: top + 8 },
        { x: head.x + 7, y: top },
      ]);
      ctx.globalAlpha = 1;
    }

    const shadow = worldToScreen({ x: hip.x - facing * 5, y: bodyFloor + 4 });
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = "#090909";
    ctx.beginPath();
    ctx.ellipse(shadow.x, shadow.y, 35 * camera.zoom, 4.5 * camera.zoom, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawVelocityMeter() {
    const speed = Math.abs(player.vx) / 20;
    if (speed < 0.25) {
      return;
    }
    const facing = signOrFacing(player.vx, player.facing);
    const bodyTop = worldToScreen({ x: player.worldX + facing * 11, y: player.y - 102 });
    const centerX = bodyTop.x + facing * 4;
    const y = bodyTop.y;
    const length = clamp(18 + speed * 3.45, 23, 56);
    const startX = centerX - (length / 2) * facing;
    const endX = centerX + (length / 2) * facing;
    const arrow = 5 * facing;

    ctx.save();
    ctx.strokeStyle = WHITE;
    ctx.fillStyle = WHITE;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(startX, y);
    ctx.lineTo(endX, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(endX, y);
    ctx.lineTo(endX - arrow, y - 4);
    ctx.lineTo(endX - arrow, y + 4);
    ctx.closePath();
    ctx.fill();

    ctx.font = "5.5px Consolas, 'Courier New', monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillText(`${speed.toFixed(1)} m/s`, centerX - 4 * facing, y - 5);
    ctx.restore();
  }

  function drawLevel4ForceLines() {
    if (!level4.active || level4.forceLineTimer <= 0) {
      return;
    }
    const center = worldToScreen({ x: player.worldX, y: player.y - 45 });
    const intensity = clamp(level4.forceLineTimer, 0, 1);
    const speed = Math.hypot(player.vx, player.vy);
    const sign = player.charge === "positive" ? 1 : (player.charge === "negative" ? -1 : 0);
    const force = level4.phase === "electric" || level4.phase === "spaceToElectric"
      ? { x: 0, y: -1 }
      : speed > 0.001 && sign !== 0
      ? normalize({ x: player.vy * sign, y: -player.vx * sign })
      : { x: 0, y: -1 };
    const tangent = { x: -force.y, y: force.x };
    ctx.save();
    ctx.globalAlpha = level4.alpha * (0.25 + intensity * 0.55);
    ctx.strokeStyle = WHITE;
    ctx.lineWidth = 1.2;
    ctx.lineCap = "round";
    for (let i = 0; i < 4; i += 1) {
      const offset = (i - 1.5) * 8;
      const x = center.x + tangent.x * offset - force.x * 31;
      const y = center.y + tangent.y * offset - force.y * 31;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + force.x * 19, y + force.y * 19);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawLevel4Hud() {
    if (!level4.active) {
      return;
    }
    ctx.save();
    ctx.globalAlpha = level4.alpha * 0.78;
    ctx.fillStyle = WHITE;
    ctx.shadowColor = "rgba(255,255,255,0.26)";
    ctx.shadowBlur = 3;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.font = "11px Georgia, 'Times New Roman', serif";
    const electricHud = level4.phase === "electric" || level4.phase === "spaceToElectric";
    ctx.fillText(electricHud ? "关卡 4：电场上升" : "关卡 4：叉磁场", 22, 18);
    ctx.font = "italic 10px Cambria Math, Georgia, 'Times New Roman', serif";
    ctx.fillText(electricHud ? "F = qE" : "F = qvB", 22, 36);
    ctx.restore();
  }

  function drawTokenLayer() {
    for (const token of tokens) {
      if (token.mode !== "bench") {
        drawToken(token);
      }
    }
    drawWorkbench();
    for (const token of tokens) {
      if (token.mode === "bench") {
        drawToken(token);
      }
    }
  }

  function render(time) {
    ctx.setTransform(renderScaleX, 0, 0, renderScaleY, 0, 0);
    if (level7.active) {
      drawLevel7(time);
      drawTargetHighlights();
      drawTokenLayer();
      return;
    }
    drawBackground(time);
    if (slingshot.active) {
      drawSlingshot(time);
      drawTargetHighlights();
      drawTokenLayer();
      return;
    }
    drawEnvironment(time);
    drawSceneCues(time);
    drawLevel4Hud();
    drawEffects();
    drawParabolicTrajectory();
    drawVelocityMeter();
    if (!(level5.active && level5.boarded)) {
      drawStickman();
    }
    drawLevel4ForceLines();
    drawLevel7RocketDrop(time);
    drawTargetHighlights();
    drawTokenLayer();
  }

  function loop(now) {
    const dt = clamp((now - lastTime) / 1000, 0, 1 / 30);
    lastTime = now;
    update(dt);
    render(now);
    requestAnimationFrame(loop);
  }

  function resetGame() {
    tokens.length = 0;
    effects.length = 0;
    pointer.down = false;
    pointer.token = null;
    pointer.hoverTarget = null;
    player.worldX = START_X;
    player.y = FLOOR_Y;
    player.vx = 0;
    player.vy = 0;
    player.facing = 1;
    player.phase = 0;
    player.inputX = 0;
    player.runBlend = 0;
    player.lean = 0;
    player.iceFall = 0;
    player.ruleVelocityTimer = 0;
    player.symbolTimer = 0;
    player.landSquash = 0;
    player.slip = 0;
    player.appliedAcceleration = null;
    player.boostFlash = 0;
    player.charge = "neutral";
    player.grounded = true;
    world.iceFriction = 0;
    world.windmillSpin = 0;
    world.windmillTokenSpawned = false;
    world.windmillAxis = { x: 0, y: 0 };
    world.spaceStarted = false;
    world.hasMoved = false;
    world.flowPulse = 0;
    world.trajectoryTimer = 0;
    world.level4AscentTime = 0;
    world.sceneIndex = 1;
    world.lastSceneIndex = 1;
    world.sceneFlash = 0;
    workbench.activeToken = null;
    workbench.pulse = 0;
    workbench.x = WORKBENCH_DEFAULT.x;
    workbench.y = WORKBENCH_DEFAULT.y;
    workbench.w = WORKBENCH_DEFAULT.w;
    workbench.h = WORKBENCH_DEFAULT.h;
    level4.active = false;
    level4.phase = "electric";
    level4.alpha = 0;
    level4.originX = 0;
    level4.originY = 0;
    level4.chargeApplied = false;
    level4.result = "pending";
    level4.messageTimer = 0;
    level4.resetTimer = 0;
    level4.spaceExitTimer = 0;
    level4.fieldDwell = 0;
    level4.hasEnteredField = false;
    level4.magneticTurn = 0;
    level4.screenShake = 0;
    level4.fieldGlow = 0;
    level4.exitGlow = 0;
    level4.forceLineTimer = 0;
    level4.tokenShake = 0;
    level4.entryCleaned = false;
    level4.electricExitTimer = 0;
    level4.transitionKind = "";
    level4.transitionTimer = 0;
    level4.transitionDuration = 1;
    level4.transitionFrom = null;
    level4.transitionTo = null;
    level5.active = false;
    level5.alpha = 0;
    level5.originX = 0;
    level5.originY = 0;
    level5.scroll = 0;
    level5.flightSpeed = 84;
    level5.thrust = 0;
    level5.thrustApplied = false;
    level5.rocketPower = 0;
    level5.boarded = false;
    level5.reveal = 0;
    level5.formulaShift = 0;
    level5.messageTimer = 0;
    level5.rocketAngle = -0.08;
    level5.rocketLocal = { x: 390, y: -4 };
    level5.orbitTrail = [];
    level5.orbitPhase = 0;
    level5.nextLevelTimer = 0;
    level5.complete = false;
    level5.starDrift = 0;
    level5.thrustAnchor = null;
    slingshot.active = false;
    slingshot.alpha = 0;
    slingshot.timer = 0;
    slingshot.phase = "setup";
    slingshot.result = "pending";
    slingshot.messageTimer = 0;
    slingshot.captureTimer = 0;
    slingshot.preview = 0;
    slingshot.curvatureApplied = false;
    slingshot.curvature = 0;
    slingshot.fadeOut = 0;
    slingshot.formula = 0;
    slingshot.zoomIn = 0;
    slingshot.solarSpin = 0;
    slingshot.angle = slingshot.startAngle;
    slingshot.radius = 210;
    slingshot.exitSpeed = 0;
    slingshot.escapeTimer = 0;
    slingshot.escapeX = 0;
    slingshot.escapeY = 0;
    slingshot.viewX = 0;
    slingshot.viewY = 0;
    slingshot.rocketX = 0;
    slingshot.rocketY = 0;
    slingshot.rocketAngle = 0;
    slingshot.rocketVX = 0;
    slingshot.rocketVY = 0;
    slingshot.trail = [];
    slingshot.assistLine = [];
    level7.active = false;
    level7.alpha = 0;
    level7.rocketScreen = { x: 306, y: 190 };
    level7.rocketAngle = -0.03;
    level7.targetBeta = 0.35;
    level7.displayBeta = 0.08;
    level7.gamma = 1;
    level7.starDrift = 0;
    level7.starSpeed = 18;
    level7.sequenceActive = false;
    level7.sequenceTime = 0;
    level7.sequencePlayed = false;
    level7.returningToEarth = false;
    level7.warpPulse = 0;
    level7.messageTimer = 0;
    level7.cameraRoll = 0;
    level7.blackHolePulse = 0;
    level7.earthZoom = 0;
    level7.rocketDrop = { active: false, x: 430, y: -90, vy: 260, angle: -Math.PI / 2, spin: 0, timer: 0 };
    camera.x = START_X + 36;
    camera.y = CAMERA_Y_REST;
    camera.zoom = BASE_ZOOM;
    initTokens();
    bootTemporaryStartLevel();
  }

  window.addEventListener("resize", resizeCanvas);
  window.addEventListener("keydown", (event) => {
    if (event.code === "KeyR") {
      resetGame();
      keys.add(event.code);
      return;
    }
    if (event.code === "KeyL") {
      startLevel7();
      event.preventDefault();
      return;
    }
    if (isLevel4AutoTransition()) {
      if (isMoveKey(event.code) || isEditKey(event.code)) {
        event.preventDefault();
      }
      return;
    }
    if (isEditKey(event.code) && adjustActiveToken(event.code)) {
      event.preventDefault();
      return;
    }
    if (isMoveKey(event.code)) {
      event.preventDefault();
    }
    if (!keys.has(event.code) && ["Space", "KeyW"].includes(event.code)) {
      jumpQueued = true;
    }
    keys.add(event.code);
  });

  window.addEventListener("keyup", (event) => {
    keys.delete(event.code);
  });

  canvas.addEventListener("pointerdown", (event) => {
    const point = canvasPoint(event);
    canvas.focus();
    if (isLevel4AutoTransition()) {
      pointer.down = false;
      pointer.token = null;
      pointer.hoverTarget = null;
      return;
    }
    pointer.down = true;
    pointer.x = point.x;
    pointer.y = point.y;
    const controlCode = workbenchControlAt(point);
    if (controlCode) {
      adjustActiveToken(controlCode);
      pointer.down = false;
      return;
    }
    const token = findTokenAt(point);
    if (token) {
      const dragToken = token.mode === "head" ? createHeadVelocitySnapshot(token) : token;
      const center = token.mode === "head" ? tokenCenter(token) : tokenCenter(dragToken);
      const dragOrigin = dragToken.mode === "bench"
        ? {
          mode: "bench",
          slot: dragToken.slot,
        }
        : null;
      if (dragToken.mode === "attached" && dragToken.type === "charge") {
        player.charge = "neutral";
        level4.chargeApplied = false;
      }
      if (token.mode !== "head") {
        removeFromWorkbench(dragToken);
      } else {
        token.flash = 0.5;
      }
      dragToken.dragOrigin = dragOrigin;
      pointer.token = dragToken;
      pointer.offsetX = center.x - point.x;
      pointer.offsetY = center.y - point.y;
      dragToken.mode = "drag";
      dragToken.screenX = point.x + pointer.offsetX;
      dragToken.screenY = point.y + pointer.offsetY;
      dragToken.flash = 1;
      pointer.hoverTarget = dropTargetAt(dragToken, point);
    } else {
      pointer.hoverTarget = null;
    }
  });

  canvas.addEventListener("pointermove", (event) => {
    const point = canvasPoint(event);
    pointer.x = point.x;
    pointer.y = point.y;
    if (pointer.token) {
      pointer.token.screenX = point.x + pointer.offsetX;
      pointer.token.screenY = point.y + pointer.offsetY;
      pointer.hoverTarget = dropTargetAt(pointer.token, point);
      if (pointer.hoverTarget === "workbench") {
        workbench.pulse = Math.max(workbench.pulse, 0.42);
      }
    }
  });

  function releasePointer(event) {
    if (!pointer.down) {
      return;
    }
    const point = event ? canvasPoint(event) : { x: pointer.x, y: pointer.y };
    if (pointer.token) {
      dropToken(pointer.token, point);
    }
    pointer.down = false;
    pointer.token = null;
    pointer.hoverTarget = null;
  }

  canvas.addEventListener("pointerup", releasePointer);
  canvas.addEventListener("pointercancel", releasePointer);
  canvas.addEventListener("pointerleave", (event) => {
    if (pointer.token) {
      releasePointer(event);
    }
  });

  initTokens();
  bootTemporaryStartLevel();
  resizeCanvas();
  requestAnimationFrame(loop);

  window.__stickPhysicsState = { player, world, tokens, workbench, camera, effects, level4, level5, slingshot, level7 };
})();
