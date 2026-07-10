(function () {
  "use strict";
  const OA = window.OrbArena;

  const Vector = {
    length(x, y) { return Math.hypot(x, y); },
    lengthSquared(x, y) { return x * x + y * y; },
    normalize(x, y) {
      const length = Math.hypot(x, y);
      return length > 0.000001 ? { x: x / length, y: y / length, length } : { x: 1, y: 0, length: 0 };
    },
    dot(ax, ay, bx, by) { return ax * bx + ay * by; },
    cross(ax, ay, bx, by) { return ax * by - ay * bx; },
    reflect(vx, vy, nx, ny) {
      const projection = 2 * (vx * nx + vy * ny);
      return { x: vx - projection * nx, y: vy - projection * ny };
    },
    clampLength(x, y, maximum) {
      const length = Math.hypot(x, y);
      if (length <= maximum || length === 0) return { x, y, length };
      const scale = maximum / length;
      return { x: x * scale, y: y * scale, length: maximum };
    },
    angleDifference(a, b) {
      let difference = (b - a + Math.PI) % (Math.PI * 2) - Math.PI;
      if (difference < -Math.PI) difference += Math.PI * 2;
      return difference;
    },
    fromAngle(angle, length = 1) { return { x: Math.cos(angle) * length, y: Math.sin(angle) * length }; },
    rotate(x, y, angle) { return { x: x * Math.cos(angle) - y * Math.sin(angle), y: x * Math.sin(angle) + y * Math.cos(angle) }; }
  };

  OA.Vector = Vector;
}());
