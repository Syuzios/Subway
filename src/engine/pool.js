// Generic object pool (PERF-08).
//
// Goal: zero allocations per frame during gameplay — critical for mobile GC.
// Used in Phase 2 for obstacles, Linky coins, and world chunks. Scaffolded
// here so the pattern is established on day one and later plans drop into
// an existing API instead of re-inventing pooling.
//
// Usage:
//   const pool = new Pool(
//     () => new Obstacle(),   // factory — called on cold miss
//     (o) => o.reset(),       // reset — called on release
//     16,                     // initial pre-allocation
//   );
//   const o = pool.acquire();
//   // ...use o...
//   pool.release(o);

export class Pool {
  constructor(factory, reset, initial = 0) {
    this._factory = factory;
    this._reset = reset;
    this._free = [];
    this._live = new Set();
    for (let i = 0; i < initial; i++) this._free.push(factory());
  }

  acquire() {
    const obj = this._free.pop() ?? this._factory();
    this._live.add(obj);
    return obj;
  }

  release(obj) {
    if (!this._live.delete(obj)) return;
    this._reset(obj);
    this._free.push(obj);
  }

  get liveCount() {
    return this._live.size;
  }

  get freeCount() {
    return this._free.length;
  }
}
