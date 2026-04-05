const EPSILON = 0.02;

function approxEq(a, b) { return Math.abs(a - b) < EPSILON; }
function vec2Eq(a, b) { return approxEq(a.x, b.x) && approxEq(a.y, b.y); }

function pointOnSegment(p, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 < EPSILON * EPSILON) return vec2Eq(p, a);
  const t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
  const projX = a.x + t * dx, projY = a.y + t * dy;
  return Math.abs(p.x - projX) < EPSILON && Math.abs(p.y - projY) < EPSILON;
}

function pointInTriangle(p, A, B, C) {
  const v0 = { x: C.x - A.x, y: C.y - A.y };
  const v1 = { x: B.x - A.x, y: B.y - A.y };
  const v2 = { x: p.x - A.x, y: p.y - A.y };
  const d00 = v0.x*v0.x + v0.y*v0.y;
  const d01 = v0.x*v1.x + v0.y*v1.y;
  const d02 = v0.x*v2.x + v0.y*v2.y;
  const d11 = v1.x*v1.x + v1.y*v1.y;
  const d12 = v1.x*v2.x + v1.y*v2.y;
  const inv = 1 / (d00*d11 - d01*d01);
  const u = (d11*d02 - d01*d12) * inv;
  const v = (d00*d12 - d01*d02) * inv;
  return u >= -EPSILON && v >= -EPSILON && u + v <= 1 + EPSILON;
}

export function validatePattern(pattern) {
  const errors = [];
  const { sideLength, vertices: V, centroid, strips, joints, pieceTemplates, stripProperties } = pattern;
  const A = V.A, B = V.B, C = V.C;

  // Rule 1
  if (!approxEq(A.x, 0) || !approxEq(A.y, 0)) errors.push('Rule 1: A should be (0,0)');
  if (!approxEq(B.x, sideLength) || !approxEq(B.y, 0)) errors.push(`Rule 1: B should be (${sideLength},0)`);
  const expCx = sideLength / 2, expCy = sideLength * Math.sqrt(3) / 2;
  if (!approxEq(C.x, expCx) || !approxEq(C.y, expCy)) errors.push(`Rule 1: C should be (${expCx.toFixed(2)},${expCy.toFixed(2)}), got (${C.x},${C.y})`);

  // Rule 2
  const cx = (A.x+B.x+C.x)/3, cy = (A.y+B.y+C.y)/3;
  if (!approxEq(centroid.x, cx) || !approxEq(centroid.y, cy)) errors.push(`Rule 2: centroid should be (${cx.toFixed(2)},${cy.toFixed(2)})`);

  // Rule 3
  for (const s of strips) {
    if (!pointInTriangle(s.start, A, B, C)) errors.push(`Rule 3: strip ${s.id} start outside triangle`);
    if (!pointInTriangle(s.end, A, B, C)) errors.push(`Rule 3: strip ${s.id} end outside triangle`);
  }

  // Rule 4
  for (const s of strips) {
    const exp = Math.atan2(s.end.y - s.start.y, s.end.x - s.start.x);
    let diff = Math.abs(s.orientation - exp);
    if (diff > Math.PI) diff = Math.abs(diff - 2*Math.PI);
    if (diff > 0.002) errors.push(`Rule 4: strip ${s.id} orientation ${s.orientation.toFixed(4)} expected ${exp.toFixed(4)}`);
  }

  const stripMap = Object.fromEntries(strips.map(s => [s.id, s]));
  const jointMap = Object.fromEntries(joints.map(j => [j.id, j]));

  // Rule 5
  for (const j of joints) {
    for (const m of j.members) {
      const s = stripMap[m.stripId];
      if (!s) continue;
      if (!pointOnSegment(j.position, s.start, s.end))
        errors.push(`Rule 5: joint ${j.id} not on strip ${m.stripId}`);
    }
  }

  // Rule 6
  for (const s of strips) {
    for (const c of s.cuts) {
      const j = jointMap[c.jointId];
      if (!j) continue;
      if (!vec2Eq(c.position, j.position))
        errors.push(`Rule 6: strip ${s.id} cut for ${c.jointId} position mismatch`);
    }
  }

  // Rule 7
  const cutPositions = strips.flatMap(s => s.cuts.map(c => c.position));
  for (const j of joints) {
    if (!cutPositions.some(p => vec2Eq(p, j.position)))
      errors.push(`Rule 7: joint ${j.id} has no matching strip cut`);
  }

  // Rule 8
  const jointIds = new Set(joints.map(j => j.id));
  for (const s of strips) {
    for (const c of s.cuts) {
      if (!jointIds.has(c.jointId)) errors.push(`Rule 8: strip ${s.id} cut refs unknown joint ${c.jointId}`);
    }
  }

  // Rule 9
  const stripIds = new Set(strips.map(s => s.id));
  for (const j of joints) {
    for (const m of j.members) {
      if (!stripIds.has(m.stripId)) errors.push(`Rule 9: joint ${j.id} member refs unknown strip ${m.stripId}`);
    }
  }

  // Rule 10
  const spIds = new Set(stripProperties.map(sp => sp.id));
  for (const pt of pieceTemplates) {
    if (!spIds.has(pt.stripPropertyId)) errors.push(`Rule 10: pieceTemplate ${pt.id} refs unknown sp ${pt.stripPropertyId}`);
  }

  // Rule 11
  for (const pt of pieceTemplates) {
    if (!stripIds.has(pt.stripId)) errors.push(`Rule 11: pieceTemplate ${pt.id} refs unknown strip ${pt.stripId}`);
  }

  // Rule 12
  for (let i = 0; i < strips.length; i++) {
    for (let j = i+1; j < strips.length; j++) {
      if (vec2Eq(strips[i].start, strips[j].start) && vec2Eq(strips[i].end, strips[j].end))
        errors.push(`Rule 12: strips ${strips[i].id} and ${strips[j].id} identical`);
    }
  }

  // Rule 13
  for (const s of strips) {
    if (vec2Eq(s.start, s.end)) errors.push(`Rule 13: strip ${s.id} zero length`);
  }

  return errors;
}
