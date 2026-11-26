/**
 * Subsequence DTW for the wake word. The template (the teacher's "HEC") may start
 * within `startSlack` frames of the beginning of the segment and end anywhere in
 * it. Local cost is the Euclidean distance between two feature frames; a step
 * that is not diagonal costs `stepPenalty` extra, which stops one template frame
 * from soaking up half the segment. The score is the path cost divided by the
 * path length. Pure, no imports.
 */
export interface DtwResult {
  /** Mean local cost along the best path (smaller = closer). Infinity when it cannot match. */
  dist: number;
  /** Segment frame where the template ended. */
  end: number;
}

export interface DtwOptions {
  startSlack?: number;
  stepPenalty?: number;
}

function local(a: Float32Array, b: Float32Array): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) { const d = a[i] - b[i]; s += d * d; }
  return Math.sqrt(s);
}

export function subsequenceDtw(template: Float32Array[], seq: Float32Array[], opts: DtwOptions = {}): DtwResult {
  const M = template.length, N = seq.length;
  if (!M || !N) return { dist: Infinity, end: -1 };
  const slack = opts.startSlack ?? 8;
  const pen = opts.stepPenalty ?? 0;
  // Template may stretch to at most 2.5x the sequence frames and a segment
  // frame may carry at most 2.5 template frames: bound j by i.
  let prevC = new Float64Array(N).fill(Infinity), prevL = new Float64Array(N);
  let curC = new Float64Array(N).fill(Infinity), curL = new Float64Array(N);
  for (let i = 0; i < M; i++) {
    const jMin = Math.max(0, Math.floor(i / 2.5) - slack);
    const jMax = Math.min(N - 1, Math.ceil(i * 2.5) + slack);
    curC.fill(Infinity);
    for (let j = jMin; j <= jMax; j++) {
      const d = local(template[i], seq[j]);
      let best = Infinity, len = 0;
      if (i === 0) {
        if (j <= slack) { best = 0; len = 0; }
      } else if (j > 0 && prevC[j - 1] < best) { best = prevC[j - 1]; len = prevL[j - 1]; }
      if (i > 0 && prevC[j] + pen < best) { best = prevC[j] + pen; len = prevL[j]; }
      if (j > 0 && curC[j - 1] + pen < best) { best = curC[j - 1] + pen; len = curL[j - 1]; }
      if (best === Infinity) continue;
      curC[j] = best + d;
      curL[j] = len + 1;
    }
    const tc = prevC, tl = prevL;
    prevC = curC; prevL = curL; curC = tc; curL = tl;
  }
  let dist = Infinity, end = -1;
  for (let j = 0; j < N; j++) {
    if (prevC[j] === Infinity) continue;
    const v = prevC[j] / prevL[j];
    if (v < dist) { dist = v; end = j; }
  }
  return { dist, end };
}

/** Best-2-of-N average of the per-template distances (or the mean of all, when there are fewer than 2). */
export function bestTwoAverage(dists: number[]): number {
  const s = dists.filter((d) => Number.isFinite(d)).sort((a, b) => a - b);
  if (!s.length) return Infinity;
  if (s.length === 1) return s[0];
  return (s[0] + s[1]) / 2;
}

/** Score a segment against every template. */
export function wakeScore(templates: Float32Array[][], seq: Float32Array[], opts?: DtwOptions): { score: number; dists: number[]; end: number } {
  const rs = templates.map((t) => subsequenceDtw(t, seq, opts));
  const dists = rs.map((r) => r.dist);
  // where the word ended: the median end of the two best templates
  const order = rs.map((r, i) => i).filter((i) => Number.isFinite(dists[i])).sort((a, b) => dists[a] - dists[b]).slice(0, 2);
  const end = order.length ? Math.round(order.reduce((a, i) => a + rs[i].end, 0) / order.length) : -1;
  return { score: bestTwoAverage(dists), dists, end };
}
