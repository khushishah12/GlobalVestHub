import type { RFModel } from '@/models/rf-model';
import stockReturnRf from '@/models/stock_return_rf.json';
import regimeRf from '@/models/regime_rf.json';

export type { RFModel };

const REGIME_NAMES = ['BEAR', 'NEUTRAL', 'BULL'];

const REGRESSOR: RFModel = stockReturnRf as unknown as RFModel;
const REGIME: RFModel = regimeRf as unknown as RFModel;

function scaleRow(x: number[], mean: number[], scale: number[]): number[] {
  const out = new Array<number>(x.length);
  for (let i = 0; i < x.length; i++) out[i] = (x[i] - mean[i]) / scale[i];
  return out;
}

function treeLeafNode(m: RFModel, treeIdx: number, x: number[]): number {
  const off = m.trees.offsets[treeIdx];
  const end = m.trees.offsets[treeIdx + 1] ?? m.trees.n_nodes;
  let node = off;
  while (node < end && node >= off) {
    const f = m.trees.feature[node];
    if (f < 0) break;
    const child = x[f] <= m.trees.threshold[node] ? m.trees.left[node] : m.trees.right[node];
    node = off + child;
  }
  return node;
}

function leafWeight(m: RFModel, node: number): number {
  let sum = 0;
  for (let k = 0; k < m.trees.value_width; k++) sum += m.trees.value[node * m.trees.value_width + k];
  return sum > 0 ? sum : 1;
}

export interface RegressionOut {
  predicted_return: number;
  confidence: number;
}

export function predictReturns(features: Record<string, number>): RegressionOut {
  const m = REGRESSOR;
  const names = m.features ?? [];
  const raw = names.map(n => features[n] ?? 0);
  const x = scaleRow(raw, m.scaler.mean, m.scaler.scale);
  const perTree = new Array<number>(m.n_estimators);
  for (let t = 0; t < m.n_estimators; t++) {
    perTree[t] = m.trees.value[treeLeafNode(m, t, x) * m.trees.value_width];
  }
  const mean = perTree.reduce((a, b) => a + b, 0) / m.n_estimators;
  let variance = 0;
  for (let t = 0; t < m.n_estimators; t++) {
    const d = perTree[t] - mean;
    variance += d * d;
  }
  const std = Math.sqrt(variance / m.n_estimators);
  const pred = Math.max(-30, Math.min(60, mean));
  const confidence = Math.round(Math.min(95, Math.max(30, 100 - std * 2)));
  return { predicted_return: Number(pred.toFixed(2)), confidence };
}

export interface RegimeOut {
  regime: string;
  confidence: number;
  probabilities: number[];
}

export function predictRegime(ohlcv: number[][]): RegimeOut {
  const m = REGIME;
  const w = m.trees.value_width;
  const k = m.n_classes ?? 3;
  const rows = ohlcv.slice(-60);
  const c = rows.map(r => r[3] ?? 0);
  const h = rows.map(r => r[1] ?? 0);
  const l = rows.map(r => r[2] ?? 0);
  const v = rows.map(r => r[4] ?? 0);
  if (c.length < 2) {
    return { regime: 'NEUTRAL', confidence: 0, probabilities: [33.3, 33.3, 33.3] };
  }
  const probs = new Array<number>(k).fill(0);
  for (let i = 0; i < c.length; i++) {
    const f0 = i > 0 && c[i - 1] > 0 ? Math.log(c[i] / c[i - 1]) : 0;
    const f1 = c[i] > 0 ? (h[i] - l[i]) / c[i] : 0;
    const f2 = i >= 4 && c[i - 4] > 0 ? Math.log(c[i] / c[i - 4]) : 0;
    const f3 = v[i] > 0 ? Math.log(v[i]) : 0;
    const x = scaleRow([f0, f1, f2, f3], m.scaler.mean, m.scaler.scale);
    const rowProbs = new Array<number>(k).fill(0);
    for (let t = 0; t < m.n_estimators; t++) {
      const node = treeLeafNode(m, t, x);
const total = leafWeight(m, node);
      for (let ci = 0; ci < k; ci++) rowProbs[ci] += m.trees.value[node * w + ci] / total;
    }
    for (let ci = 0; ci < k; ci++) probs[ci] += rowProbs[ci] / m.n_estimators / c.length;
  }
  let best = 0;
  for (let ci = 1; ci < k; ci++) if (probs[ci] > probs[best]) best = ci;
  return {
    regime: REGIME_NAMES[best] ?? 'NEUTRAL',
    confidence: Number((probs[best] * 100).toFixed(1)),
    probabilities: probs.map(p => Number((p * 100).toFixed(1))),
  };
}

export function recommendationFor(pct: number): string {
  if (pct < 0.2) return 'Strong Buy';
  if (pct < 0.5) return 'Buy';
  if (pct < 0.8) return 'Watchlist';
  return 'Avoid';
}
