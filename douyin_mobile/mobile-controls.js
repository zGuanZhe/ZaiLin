(function () {
  "use strict";

  const canvas = document.getElementById("game");
  const joystick = document.querySelector(".joystick");
  const joystickCanvas = document.querySelector(".joystick-canvas");
  const joystickKnob = document.querySelector(".joystick-knob");
  const joyCtx = joystickCanvas?.getContext("2d");
  const heldKeys = new Set();
  const repeatTimers = new Map();
  const joystickState = {
    active: false,
    pointerId: null,
    x: 0,
    y: 0,
    strength: 0,
    phase: 0,
    lastTime: performance.now(),
  };
  let immersivePending = false;
  let landscapeLocked = false;

  function isFullscreen() {
    return !!(document.fullscreenElement || document.webkitFullscreenElement);
  }

  function lockLandscape() {
    if (landscapeLocked) return;
    try {
      if (screen.orientation?.lock) {
        screen.orientation.lock("landscape")
          .then(() => { landscapeLocked = true; })
          .catch(() => {});
      }
    } catch (error) {
      void error;
    }
  }

  // Retry-safe: only short-circuits while a request is in flight or we are
  // already fullscreen. If a previous attempt failed, or the user exited
  // fullscreen, the next gesture tries again instead of being locked out.
  async function requestImmersiveMode() {
    if (!immersivePending && !isFullscreen()) {
      immersivePending = true;
      const root = document.documentElement;
      try {
        if (root.requestFullscreen) {
          await root.requestFullscreen({ navigationUI: "hide" });
        } else if (root.webkitRequestFullscreen) {
          root.webkitRequestFullscreen();
        }
      } catch (error) {
        void error;
      } finally {
        immersivePending = false;
      }
    }
    lockLandscape();
  }

  function onFullscreenChange() {
    if (!isFullscreen()) {
      // Leaving fullscreen drops the orientation lock; allow it to re-arm.
      landscapeLocked = false;
    }
  }

  function emitKey(type, code) {
    window.dispatchEvent(new KeyboardEvent(type, {
      bubbles: true,
      cancelable: true,
      code,
      key: keyForCode(code),
    }));
  }

  function keyForCode(code) {
    const map = {
      ArrowLeft: "ArrowLeft",
      ArrowRight: "ArrowRight",
      ArrowUp: "ArrowUp",
      ArrowDown: "ArrowDown",
      KeyA: "a",
      KeyD: "d",
      KeyL: "l",
      KeyR: "r",
      Space: " ",
    };
    return map[code] || code;
  }

  function holdKey(code, button) {
    if (!heldKeys.has(code)) {
      heldKeys.add(code);
      emitKey("keydown", code);
    }
    button?.classList.add("is-held");
  }

  function releaseKey(code, button) {
    if (heldKeys.delete(code)) {
      emitKey("keyup", code);
    }
    button?.classList.remove("is-held");
  }

  function tapKey(code) {
    emitKey("keydown", code);
    window.setTimeout(() => emitKey("keyup", code), 45);
  }

  function startRepeat(code, button) {
    tapKey(code);
    button.classList.add("is-held");
    stopRepeat(code);
    const first = window.setTimeout(() => {
      tapKey(code);
      const interval = window.setInterval(() => tapKey(code), 150);
      repeatTimers.set(code, { interval });
    }, 260);
    repeatTimers.set(code, { first });
  }

  function stopRepeat(code, button) {
    const timers = repeatTimers.get(code);
    if (timers?.first) window.clearTimeout(timers.first);
    if (timers?.interval) window.clearInterval(timers.interval);
    repeatTimers.delete(code);
    button?.classList.remove("is-held");
  }

  function releaseAll() {
    for (const code of [...heldKeys]) {
      releaseKey(code);
    }
    for (const code of [...repeatTimers.keys()]) {
      stopRepeat(code);
    }
    resetJoystick();
  }

  function wireButton(button) {
    const tap = button.dataset.tapKey;
    const repeat = button.dataset.repeatKey;

    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      requestImmersiveMode();
      button.setPointerCapture?.(event.pointerId);
      canvas?.focus();
      if (tap) {
        button.classList.add("is-held");
        tapKey(tap);
      }
      if (repeat) startRepeat(repeat, button);
    });

    const finish = (event) => {
      event.preventDefault();
      if (tap) button.classList.remove("is-held");
      if (repeat) stopRepeat(repeat, button);
    };

    button.addEventListener("pointerup", finish);
    button.addEventListener("pointercancel", finish);
    button.addEventListener("lostpointercapture", finish);
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function resizeJoystickCanvas() {
    if (!joystickCanvas || !joystick) return;
    const rect = joystick.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    joystickCanvas.width = Math.max(1, Math.round(rect.width * dpr));
    joystickCanvas.height = Math.max(1, Math.round(rect.height * dpr));
  }

  function updateJoystickFromPointer(event) {
    if (!joystick) return;
    const rect = joystick.getBoundingClientRect();
    const radius = Math.min(rect.width, rect.height) * 0.42;
    const dx = event.clientX - (rect.left + rect.width / 2);
    const dy = event.clientY - (rect.top + rect.height / 2);
    const distance = Math.hypot(dx, dy);
    const limited = Math.min(distance, radius);
    const angle = Math.atan2(dy, dx);
    const x = Math.cos(angle) * limited;
    const y = Math.sin(angle) * limited;
    joystickState.x = x;
    joystickState.y = y;
    joystickState.strength = clamp(limited / radius, 0, 1);
    joystick?.style.setProperty("--joy-x", `${x}px`);
    joystick?.style.setProperty("--joy-y", `${y}px`);
    joystickKnob.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
    applyJoystickKeys();
  }

  function applyJoystickKeys() {
    const dead = 0.23;
    if (!joystickState.active || joystickState.strength < dead || Math.abs(joystickState.x) < 8) {
      releaseKey("KeyA");
      releaseKey("KeyD");
      return;
    }
    if (joystickState.x < 0) {
      holdKey("KeyA");
      releaseKey("KeyD");
    } else {
      holdKey("KeyD");
      releaseKey("KeyA");
    }
  }

  function resetJoystick() {
    joystickState.active = false;
    joystickState.pointerId = null;
    joystickState.x = 0;
    joystickState.y = 0;
    joystickState.strength = 0;
    releaseKey("KeyA");
    releaseKey("KeyD");
    if (joystickKnob) {
      joystickKnob.style.transform = "translate(-50%, -50%)";
    }
    joystick?.style.setProperty("--joy-x", "0px");
    joystick?.style.setProperty("--joy-y", "0px");
  }

  function wireJoystick() {
    if (!joystick) return;
    joystick.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      requestImmersiveMode();
      joystick.setPointerCapture?.(event.pointerId);
      canvas?.focus();
      joystickState.active = true;
      joystickState.pointerId = event.pointerId;
      updateJoystickFromPointer(event);
    });
    joystick.addEventListener("pointermove", (event) => {
      if (!joystickState.active || joystickState.pointerId !== event.pointerId) return;
      event.preventDefault();
      updateJoystickFromPointer(event);
    });
    const finish = (event) => {
      if (joystickState.pointerId !== null && joystickState.pointerId !== event.pointerId) return;
      event.preventDefault();
      resetJoystick();
    };
    joystick.addEventListener("pointerup", finish);
    joystick.addEventListener("pointercancel", finish);
    joystick.addEventListener("lostpointercapture", finish);
  }

  function drawOrganicRing(cx, cy, baseRadius, wobble, phase, alpha, lineWidth, offset) {
    const points = 96;
    joyCtx.beginPath();
    for (let i = 0; i <= points; i += 1) {
      const t = (i / points) * Math.PI * 2;
      const wave =
        Math.sin(t * 2.1 + phase + offset) * wobble * 0.55
        + Math.sin(t * 4.2 - phase * 0.72 + offset * 1.7) * wobble * 0.32
        + Math.sin(t * 7.1 + phase * 1.33) * wobble * 0.18;
      const lean = joystickState.x * 0.08 * Math.cos(t) + joystickState.y * 0.08 * Math.sin(t);
      const r = baseRadius + wave + lean;
      const x = cx + Math.cos(t) * r;
      const y = cy + Math.sin(t) * r;
      if (i === 0) {
        joyCtx.moveTo(x, y);
      } else {
        joyCtx.lineTo(x, y);
      }
    }
    joyCtx.closePath();
    joyCtx.globalAlpha = alpha;
    joyCtx.strokeStyle = "rgba(248,248,248,0.95)";
    joyCtx.lineWidth = lineWidth;
    joyCtx.stroke();
  }

  function renderJoystick(now = performance.now()) {
    if (joyCtx && joystickCanvas) {
      const dt = Math.min(0.05, (now - joystickState.lastTime) / 1000);
      joystickState.lastTime = now;
      const width = joystickCanvas.width;
      const height = joystickCanvas.height;
      const scale = width / Math.max(1, joystickCanvas.getBoundingClientRect().width);
      const cx = width / 2;
      const cy = height / 2;
      const baseRadius = Math.min(width, height) * 0.34;
      const strength = joystickState.active ? joystickState.strength : 0;
      joystickState.phase += dt * (0.75 + strength * strength * 12.5);
      joyCtx.clearRect(0, 0, width, height);
      joyCtx.lineCap = "round";
      joyCtx.lineJoin = "round";
      joyCtx.globalCompositeOperation = "source-over";
      const wobble = scale * (1.15 + strength * 10.5);
      drawOrganicRing(cx, cy, baseRadius - scale * 7, wobble * 0.9, joystickState.phase * 1.22, 0.28 + strength * 0.17, scale * 1.25, 0.4);
      drawOrganicRing(cx, cy, baseRadius, wobble, joystickState.phase, 0.62 + strength * 0.22, scale * 1.55, 1.8);
      drawOrganicRing(cx, cy, baseRadius + scale * 7, wobble * 0.75, joystickState.phase * 0.78, 0.3 + strength * 0.2, scale * 1.1, 3.1);
      if (strength > 0.18) {
        const hx = cx + joystickState.x * scale;
        const hy = cy + joystickState.y * scale;
        joyCtx.globalAlpha = 0.34 + strength * 0.24;
        joyCtx.strokeStyle = "rgba(248,248,248,0.88)";
        joyCtx.lineWidth = scale * 1.1;
        joyCtx.beginPath();
        joyCtx.moveTo(cx, cy);
        joyCtx.lineTo(hx, hy);
        joyCtx.stroke();
      }
    }
    requestAnimationFrame(renderJoystick);
  }

  document.querySelectorAll(".touch-button").forEach(wireButton);
  document.addEventListener("touchstart", requestImmersiveMode, { passive: true });
  document.addEventListener("pointerdown", requestImmersiveMode);
  document.addEventListener("fullscreenchange", onFullscreenChange);
  document.addEventListener("webkitfullscreenchange", onFullscreenChange);
  wireJoystick();
  resizeJoystickCanvas();
  window.addEventListener("resize", resizeJoystickCanvas);
  window.addEventListener("orientationchange", () => window.setTimeout(resizeJoystickCanvas, 120));
  window.addEventListener("blur", releaseAll);
  window.addEventListener("pagehide", releaseAll);
  document.addEventListener("contextmenu", (event) => event.preventDefault());
  canvas?.focus();
  requestAnimationFrame(renderJoystick);
})();
