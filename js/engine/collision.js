(function () {
  "use strict";
  const OA = window.OrbArena;

  const Collision = {
    circles(a, b) {
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const radius = a.radius + b.radius;
      const distanceSquared = dx * dx + dy * dy;
      if (distanceSquared > radius * radius) return null;
      const distance = Math.sqrt(distanceSquared);
      if (distance < 0.0001) return { dx: radius, dy: 0, distance: 0, overlap: radius, nx: 1, ny: 0 };
      return { dx, dy, distance, overlap: Math.max(0, radius - distance), nx: dx / distance, ny: dy / distance };
    },

    resolveCircles(a, b, contact, globalElasticity = 1) {
      const inverseA = 1 / Math.max(0.2, a.mass);
      const inverseB = 1 / Math.max(0.2, b.mass);
      const inverseTotal = inverseA + inverseB;
      const correction = Math.max(0, contact.overlap - 0.01) * 0.86 / inverseTotal;
      a.x -= contact.nx * correction * inverseA;
      a.y -= contact.ny * correction * inverseA;
      b.x += contact.nx * correction * inverseB;
      b.y += contact.ny * correction * inverseB;

      const relativeX = b.vx - a.vx;
      const relativeY = b.vy - a.vy;
      const velocityAlongNormal = OA.Vector.dot(relativeX, relativeY, contact.nx, contact.ny);
      if (velocityAlongNormal >= 0) return { impulse: 0, relativeSpeed: 0, effectiveMass: 1 / inverseTotal };
      const restitution = OA.clamp(Math.min(a.elasticity, b.elasticity) * globalElasticity, 0.35, 1.16);
      const impulse = -(1 + restitution) * velocityAlongNormal / inverseTotal;
      const impulseX = impulse * contact.nx;
      const impulseY = impulse * contact.ny;
      a.vx -= impulseX * inverseA;
      a.vy -= impulseY * inverseA;
      b.vx += impulseX * inverseB;
      b.vy += impulseY * inverseB;
      return { impulse, relativeSpeed: Math.abs(velocityAlongNormal), effectiveMass: 1 / inverseTotal };
    },

    sweptCircles(a, b) {
      const sx = b.previousX - a.previousX;
      const sy = b.previousY - a.previousY;
      const dx = (b.x - b.previousX) - (a.x - a.previousX);
      const dy = (b.y - b.previousY) - (a.y - a.previousY);
      const radius = a.radius + b.radius;
      const c = sx * sx + sy * sy - radius * radius;
      if (c <= 0) return { t: 0 };
      const aa = dx * dx + dy * dy;
      if (aa < 0.000001) return null;
      const bb = 2 * (sx * dx + sy * dy);
      const discriminant = bb * bb - 4 * aa * c;
      if (discriminant < 0) return null;
      const t = (-bb - Math.sqrt(discriminant)) / (2 * aa);
      return t >= 0 && t <= 1 ? { t } : null;
    },

    segmentCircle(x1, y1, x2, y2, circleX, circleY, radius) {
      const dx = x2 - x1;
      const dy = y2 - y1;
      const lengthSquared = dx * dx + dy * dy;
      let t = lengthSquared > 0 ? ((circleX - x1) * dx + (circleY - y1) * dy) / lengthSquared : 0;
      t = OA.clamp(t, 0, 1);
      const x = x1 + dx * t;
      const y = y1 + dy * t;
      const nxRaw = circleX - x;
      const nyRaw = circleY - y;
      const distance = Math.hypot(nxRaw, nyRaw);
      if (distance > radius) return null;
      const normal = distance > 0.0001 ? { x: nxRaw / distance, y: nyRaw / distance } : OA.Vector.normalize(-dy, dx);
      return { t, x, y, distance, nx: normal.x, ny: normal.y, overlap: radius - distance };
    },

    circleStatic(body, obstacle) {
      const dx = body.x - obstacle.x;
      const dy = body.y - obstacle.y;
      const radius = body.radius + obstacle.radius;
      const distance = Math.hypot(dx, dy);
      if (distance >= radius) return null;
      const normal = distance > 0.0001 ? { x: dx / distance, y: dy / distance } : { x: 1, y: 0 };
      return { nx: normal.x, ny: normal.y, overlap: radius - distance, distance };
    },

    resolveStatic(body, contact, restitution = 1.05) {
      body.x += contact.nx * (contact.overlap + 0.02);
      body.y += contact.ny * (contact.overlap + 0.02);
      const normalVelocity = body.vx * contact.nx + body.vy * contact.ny;
      if (normalVelocity >= 0) return 0;
      const impulse = -(1 + restitution) * normalVelocity;
      body.vx += contact.nx * impulse;
      body.vy += contact.ny * impulse;
      return Math.abs(normalVelocity);
    }
  };

  OA.Collision = Collision;
}());
