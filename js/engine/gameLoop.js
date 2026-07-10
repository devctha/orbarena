(function () {
  "use strict";
  const OA = window.OrbArena;

  class GameLoop {
    constructor(update, render) {
      this.update = update;
      this.render = render;
      this.fixedStep = OA.CONFIG.loop.fixedStep;
      this.maxFrame = OA.CONFIG.loop.maxFrame;
      this.maxSteps = OA.CONFIG.loop.maxSteps;
      this.accumulator = 0;
      this.lastTime = 0;
      this.running = false;
      this.paused = false;
      this.speed = 1;
      this.frameRequest = 0;
      this.fps = 60;
      this.targetFps = 60;
      this.lastRenderTime = 0;
      this.boundTick = (time) => this.tick(time);
      document.addEventListener("visibilitychange", () => {
        if (document.hidden && this.running) this.setPaused(true, "visibility");
      });
    }

    start() {
      if (this.running) return;
      this.running = true;
      this.lastTime = performance.now();
      this.frameRequest = requestAnimationFrame(this.boundTick);
    }

    stop() {
      this.running = false;
      cancelAnimationFrame(this.frameRequest);
    }

    setPaused(paused, source = "user") {
      this.paused = paused;
      this.pauseSource = source;
      this.lastTime = performance.now();
    }

    setSpeed(speed) { this.speed = OA.clamp(Number(speed) || 1, 0.5, 4); }
    setTargetFps(value) { this.targetFps = value === "unlimited" ? 0 : OA.clamp(Number(value) || 60, 30, 240); }

    tick(now) {
      if (!this.running) return;
      if (this.targetFps && this.lastRenderTime && now - this.lastRenderTime < 1000 / this.targetFps - .5) { this.frameRequest = requestAnimationFrame(this.boundTick); return; }
      this.lastRenderTime = now;
      const realDelta = Math.min(this.maxFrame, Math.max(0, (now - this.lastTime) / 1000));
      this.lastTime = now;
      this.fps += ((realDelta > 0 ? 1 / realDelta : 60) - this.fps) * 0.08;

      if (!this.paused) {
        this.accumulator += realDelta * this.speed;
        let steps = 0;
        while (this.accumulator >= this.fixedStep && steps < this.maxSteps) {
          this.update(this.fixedStep);
          this.accumulator -= this.fixedStep;
          steps += 1;
        }
        if (steps === this.maxSteps) this.accumulator = 0;
      }
      this.render(this.accumulator / this.fixedStep, realDelta);
      this.frameRequest = requestAnimationFrame(this.boundTick);
    }
  }

  OA.GameLoop = GameLoop;
}());
