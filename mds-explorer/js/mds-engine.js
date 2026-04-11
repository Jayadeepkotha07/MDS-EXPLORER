/**
 * mds-engine.js
 * Core Multidimensional Scaling engine
 * Supports: Metric MDS (gradient descent) and Non-Metric MDS (PAV isotonic regression)
 */

const MDSEngine = {

  /**
   * Run MDS on a distance matrix D
   * @param {number[][]} D        - n×n dissimilarity matrix
   * @param {number}     dims     - target dimensions (2 or 3)
   * @param {boolean}    metric   - true = Metric MDS, false = Non-Metric MDS
   * @param {number}     maxIter  - maximum optimization iterations
   * @param {Function}   onStep   - optional async callback(coords, stress, iter)
   * @returns {Promise<{coords: number[][], stress: number}>}
   */
  async run(D, dims = 2, metric = true, maxIter = 100, onStep = null) {
    const n = D.length;
    const flat = [];
    for (let i = 0; i < n; i++)
      for (let j = i + 1; j < n; j++)
        flat.push(D[i][j]);

    const maxD = Math.max(...flat) || 1;
    const Dn = D.map(r => r.map(v => v / maxD));

    let X = Array.from({ length: n }, () =>
      Array.from({ length: dims }, () => (Math.random() - 0.5) * 2)
    );
    X = this._center(X, n, dims);

    let lr = 0.06, prevStress = Infinity;

    for (let iter = 0; iter < maxIter; iter++) {
      const d = this._dist(X);
      const delta = metric ? Dn : this._isotonic(Dn, d, n);
      const stress = this._stress(d, delta, n);
      const grad = this._grad(X, d, delta, n, dims);

      for (let i = 0; i < n; i++)
        for (let k = 0; k < dims; k++)
          X[i][k] -= lr * grad[i][k];

      X = this._center(X, n, dims);
      lr = stress > prevStress ? lr * 0.88 : Math.min(lr * 1.02, 0.12);
      prevStress = stress;

      if (onStep && (iter % 2 === 0 || iter === maxIter - 1)) {
        await new Promise(r => setTimeout(r, 0));
        onStep(this._copy(X), stress, iter);
      }
    }

    const d = this._dist(X);
    const delta = metric ? Dn : this._isotonic(Dn, d, n);
    return { coords: X, stress: this._stress(d, delta, n) };
  },

  /** Euclidean distance matrix */
  _dist(X) {
    const n = X.length;
    const d = Array.from({ length: n }, () => new Array(n).fill(0));
    for (let i = 0; i < n; i++)
      for (let j = i + 1; j < n; j++) {
        let s = 0;
        for (const k in X[0]) s += (X[i][k] - X[j][k]) ** 2;
        d[i][j] = d[j][i] = Math.sqrt(s) || 1e-9;
      }
    return d;
  },

  /** Normalized Kruskal stress-1 */
  _stress(d, delta, n) {
    let num = 0, den = 0;
    for (let i = 0; i < n; i++)
      for (let j = i + 1; j < n; j++) {
        num += (d[i][j] - delta[i][j]) ** 2;
        den += d[i][j] ** 2;
      }
    return den ? Math.sqrt(num / den) : 0;
  },

  /** Gradient of stress w.r.t. coordinates */
  _grad(X, d, delta, n, dims) {
    const g = Array.from({ length: n }, () => new Array(dims).fill(0));
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        const s = (d[i][j] - delta[i][j]) / (d[i][j] + 1e-9);
        for (let k = 0; k < dims; k++)
          g[i][k] += 2 * s * (X[i][k] - X[j][k]);
      }
    return g;
  },

  /** Center configuration at origin */
  _center(X, n, dims) {
    const m = new Array(dims).fill(0);
    for (let i = 0; i < n; i++)
      for (let k = 0; k < dims; k++)
        m[k] += X[i][k];
    for (let k = 0; k < dims; k++) m[k] /= n;
    return X.map(r => r.map((v, k) => v - m[k]));
  },

  /** Deep copy of coordinate array */
  _copy(X) {
    return X.map(r => [...r]);
  },

  /**
   * Non-metric: compute isotonic (monotone) regression of current layout
   * distances against target ordinal dissimilarities using PAV algorithm.
   */
  _isotonic(Dn, d, n) {
    const pairs = [];
    for (let i = 0; i < n; i++)
      for (let j = i + 1; j < n; j++)
        pairs.push({ i, j, dn: Dn[i][j], d: d[i][j] });
    pairs.sort((a, b) => a.dn - b.dn);

    const iso = this._pav(pairs.map(p => p.d));
    const disp = Array.from({ length: n }, () => new Array(n).fill(0));
    for (let k = 0; k < pairs.length; k++)
      disp[pairs[k].i][pairs[k].j] = disp[pairs[k].j][pairs[k].i] = iso[k];
    return disp;
  },

  /**
   * Pool Adjacent Violators (PAV) algorithm for isotonic regression
   * @param {number[]} y - values to fit monotonically
   * @returns {number[]}
   */
  _pav(y) {
    const blocks = y.map((v, i) => ({ s: v, c: 1, start: i }));
    let i = 0;
    while (i < blocks.length - 1) {
      if (blocks[i].s / blocks[i].c > blocks[i + 1].s / blocks[i + 1].c) {
        blocks[i].s += blocks[i + 1].s;
        blocks[i].c += blocks[i + 1].c;
        blocks.splice(i + 1, 1);
        if (i > 0) i--;
      } else {
        i++;
      }
    }
    const r = new Array(y.length);
    for (const b of blocks) {
      const v = b.s / b.c;
      for (let k = b.start; k < b.start + b.c; k++) r[k] = v;
    }
    return r;
  }
};
