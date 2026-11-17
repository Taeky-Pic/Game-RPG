// 서버와 클라이언트가 함께 쓰는 게임 데이터 (맵, 직업, 스킬, 몬스터, 길찾기)
// 브라우저와 Node 양쪽에서 ES 모듈로 import 됩니다.

// ---------- 아이소메트릭(쿼터뷰) 좌표 ----------
export const TW = 32; // 타일 가로 (저해상도 픽셀)
export const TH = 16; // 타일 세로
export function toScreen(x, y) {
  return { sx: (x - y) * (TW / 2), sy: (x + y) * (TH / 2) };
}
export function toWorld(sx, sy) {
  const a = sx / (TW / 2);
  const b = sy / (TH / 2);
  return { x: (a + b) / 2, y: (b - a) / 2 };
}

// ---------- 직업(부서) ----------
export const CLASSES = {
  gongmu: {
    name: '공무팀', color: '#3a6fd8', role: '근접 돌격',
    hp: 120, mp: 50, atk: 14, def: 4, range: 1.5, atkCd: 0.8, speed: 3.6, ranged: false,
    skill: 'dash', desc: '서류철로 빠르게 베는 돌격형. 스킬로 적진을 가르며 돌진합니다.',
  },
  maint: {
    name: '유지보수팀', color: '#2aa59a', role: '근접 탱커',
    hp: 150, mp: 40, atk: 12, def: 6, range: 1.5, atkCd: 0.9, speed: 3.4, ranged: false,
    skill: 'spin', desc: '튼튼한 스패너 전사. 스킬로 주변 적을 한꺼번에 쓸어버립니다.',
  },
  hr: {
    name: '인사팀', color: '#d24fa0', role: '원거리 서포터',
    hp: 95, mp: 80, atk: 10, def: 2, range: 4.5, atkCd: 1.0, speed: 3.6, ranged: true,
    skill: 'heart', desc: '칭찬 하트를 던지는 서포터. 스킬로 적을 기절시키고 동료를 치유합니다.',
  },
  finance: {
    name: '재무팀', color: '#6a5bd6', role: '원거리 마법',
    hp: 90, mp: 90, atk: 12, def: 2, range: 5, atkCd: 1.1, speed: 3.5, ranged: true,
    skill: 'paper', desc: '결재 서류를 다루는 마법사. 스킬로 넓은 범위에 강한 피해를 줍니다.',
  },
  ehs: {
    name: 'EHS팀', color: '#3aa64f', role: '힐러',
    hp: 115, mp: 70, atk: 11, def: 5, range: 3.5, atkCd: 1.0, speed: 3.5, ranged: true,
    skill: 'aura', desc: '안전 제일! 꼬깔콘을 던지는 힐러. 스킬로 주변 동료를 회복하고 방어력을 올립니다.',
  },
};
export const CLASS_IDS = Object.keys(CLASSES);

export const SKILLS = {
  dash:  { name: '결재 돌진', icon: '⚡', cd: 5, mp: 15, range: 4, desc: '커서 방향으로 돌진하며 경로의 적에게 220% 피해' },
  spin:  { name: '스패너 회오리', icon: '🔧', cd: 4, mp: 12, range: 0, desc: '주변 적 모두에게 180% 피해 + 밀쳐내기' },
  heart: { name: '칭찬 하트 폭격', icon: '💗', cd: 6, mp: 18, range: 6, desc: '지정 위치 적 150% 피해·1.5초 기절, 아군 15% 회복' },
  paper: { name: '서류 폭풍', icon: '📄', cd: 5, mp: 20, range: 7, desc: '지정 위치 넓은 범위 적에게 200% 피해' },
  aura:  { name: '안전 제일 오라', icon: '✚', cd: 8, mp: 20, range: 0, desc: '주변 동료 30% 회복 + 6초간 방어력 50% 증가' },
};
export const COFFEE = { name: '믹스커피', icon: '☕', cd: 15, desc: 'HP 40%, MP 20% 회복' };

// ---------- 몬스터 ----------
export const MONSTERS = {
  slime: { name: '야근 슬라임', lv: 1, hp: 45, atk: 6, def: 1, exp: 8, speed: 1.6, aggro: 0, range: 1.1, atkCd: 1.4, ranged: false },
  bug:   { name: '버그 벌레', lv: 3, hp: 80, atk: 10, def: 3, exp: 16, speed: 2.4, aggro: 4, range: 1.1, atkCd: 1.2, ranged: false },
  ghost: { name: '결재 지연 유령', lv: 5, hp: 130, atk: 15, def: 4, exp: 30, speed: 2.0, aggro: 5, range: 3.5, atkCd: 1.8, ranged: true },
  golem: { name: '마감 골렘', lv: 8, hp: 1500, atk: 26, def: 8, exp: 300, speed: 1.6, aggro: 6, range: 1.9, atkCd: 2.0, ranged: false, boss: true },
};
export const SPAWNS = [
  { kind: 'slime', count: 8, x0: 28, x1: 34, y0: 3, y1: 30 },
  { kind: 'bug', count: 7, x0: 35, x1: 42, y0: 3, y1: 30 },
  { kind: 'ghost', count: 5, x0: 42, x1: 49, y0: 2, y1: 19 },
  { kind: 'golem', count: 1, x0: 45, x1: 45, y0: 26, y1: 26 },
];
export const QUEST = {
  title: '사내 버그 소탕 작전',
  goals: { slime: 5, bug: 5, ghost: 3, golem: 1 },
  rewardExp: 200,
};

export function expNeed(lv) { return 25 * lv + 5 * lv * lv; }

// ---------- 맵 ----------
export const MAP_W = 52;
export const MAP_H = 34;
export const T = { GRASS: 0, STONE: 1, WATER: 2, BUILDING: 3, HEDGE: 4, FIELD: 5, FENCE: 6, DIRT: 7, POND: 8 };
export const TOWN_MAX_X = 25; // x < 26 은 마을(안전지대)
export const BUILDING = { x0: 3, x1: 16, y0: 1, y1: 5 }; // 포함 범위
export const FOUNTAIN = { x: 12.5, y: 15.5 };
export const SPAWN_POINT = { x: 12.5, y: 9.5 };
export const NPC = { x: 10.5, y: 7.5, name: '공무팀 박선임' };

export function isTown(x) { return x < TOWN_MAX_X + 1; }

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export { mulberry32 };

// 결정적으로 생성 (서버/클라이언트가 동일한 맵을 가짐)
export function buildMap() {
  const rnd = mulberry32(20261117);
  const tiles = new Uint8Array(MAP_W * MAP_H);
  const block = new Uint8Array(MAP_W * MAP_H);
  const objects = []; // {type, x, y, ...}  x,y = 기준 좌표(타일 중심)
  const idx = (x, y) => y * MAP_W + x;
  const set = (x, y, t) => { if (x >= 0 && y >= 0 && x < MAP_W && y < MAP_H) tiles[idx(x, y)] = t; };

  // 기본 지면
  for (let y = 0; y < MAP_H; y++)
    for (let x = 0; x < MAP_W; x++)
      set(x, y, x <= TOWN_MAX_X - 1 ? T.GRASS : T.FIELD);

  // 마을 광장 (돌길)
  for (let y = 6; y <= 24; y++) for (let x = 2; x <= 22; x++) set(x, y, T.STONE);
  // 동쪽으로 가는 길
  for (let y = 15; y <= 18; y++) for (let x = 22; x <= 28; x++) set(x, y, T.STONE);
  for (let y = 16; y <= 17; y++) for (let x = 29; x <= 37; x++) set(x, y, T.DIRT);
  // 울타리 (게이트 y 15~18)
  for (let y = 0; y < MAP_H; y++) {
    if (y >= 15 && y <= 18) continue;
    if (y === 0 || y === MAP_H - 1) continue;
    set(TOWN_MAX_X, y, T.FENCE);
    objects.push({ type: 'fence', x: TOWN_MAX_X + 0.5, y: y + 0.5 });
  }
  // 본사 건물
  for (let y = BUILDING.y0; y <= BUILDING.y1; y++)
    for (let x = BUILDING.x0; x <= BUILDING.x1; x++) set(x, y, T.BUILDING);
  // 외곽 산울타리
  for (let y = 0; y < MAP_H; y++)
    for (let x = 0; x < MAP_W; x++) {
      if (tiles[idx(x, y)] === T.BUILDING) continue;
      if (x === 0 || y === 0 || x === MAP_W - 1 || y === MAP_H - 1) set(x, y, T.HEDGE);
    }
  for (let y = 0; y <= 6; y++) for (let x = 0; x <= 2; x++) set(x, y, T.HEDGE);

  // 분수
  for (let y = 14; y <= 16; y++) for (let x = 11; x <= 13; x++) set(x, y, T.WATER);
  objects.push({ type: 'fountain', x: FOUNTAIN.x, y: FOUNTAIN.y });

  // 화단 (3x2)
  const beds = [[4, 8], [17, 8], [4, 21], [17, 21]];
  for (const [bx, by] of beds) {
    for (let y = by; y < by + 2; y++) for (let x = bx; x < bx + 3; x++) block[idx(x, y)] = 1;
    objects.push({ type: 'flowerbed', x: bx + 1.5, y: by + 1, w: 3, h: 2 });
  }
  // 벤치, 가로등
  for (const [x, y] of [[9, 10], [15, 10], [9, 21], [15, 21]]) { block[idx(x, y)] = 1; objects.push({ type: 'bench', x: x + 0.5, y: y + 0.5 }); }
  for (const [x, y] of [[9, 13], [15, 13], [9, 18], [15, 18], [21, 14], [21, 19]]) { block[idx(x, y)] = 1; objects.push({ type: 'lamp', x: x + 0.5, y: y + 0.5 }); }

  // 마을 나무 (광장 바깥 잔디)
  const treeOk = (x, y) => tiles[idx(x, y)] === T.GRASS || tiles[idx(x, y)] === T.FIELD;
  for (let y = 25; y < MAP_H - 1; y++)
    for (let x = 1; x < TOWN_MAX_X; x++) {
      if (!treeOk(x, y)) continue;
      const edge = y >= MAP_H - 3 || x <= 2;
      if (edge ? rnd() < 0.55 : rnd() < 0.08) { block[idx(x, y)] = 1; objects.push({ type: 'tree', x: x + 0.5, y: y + 0.5, v: (rnd() * 3) | 0 }); }
    }
  for (let y = 7; y < 25; y++)
    for (const x of [23, 24]) {
      if (!treeOk(x, y)) continue;
      if (rnd() < 0.35) { block[idx(x, y)] = 1; objects.push({ type: 'tree', x: x + 0.5, y: y + 0.5, v: (rnd() * 3) | 0 }); }
    }
  for (let x = 17; x < TOWN_MAX_X; x++)
    for (let y = 1; y <= 5; y++) {
      if (!treeOk(x, y)) continue;
      if (rnd() < 0.3) { block[idx(x, y)] = 1; objects.push({ type: 'tree', x: x + 0.5, y: y + 0.5, v: (rnd() * 3) | 0 }); }
    }

  // 사냥터: 연못
  for (let y = 0; y < MAP_H; y++)
    for (let x = TOWN_MAX_X + 1; x < MAP_W; x++) {
      const dx = (x + 0.5 - 39) / 3.4, dy = (y + 0.5 - 8) / 2.4;
      if (dx * dx + dy * dy < 1) set(x, y, T.POND);
    }
  // 보스 공터
  for (let y = 0; y < MAP_H; y++)
    for (let x = TOWN_MAX_X + 1; x < MAP_W; x++) {
      const dx = x + 0.5 - 45.5, dy = y + 0.5 - 26.5;
      if (dx * dx + dy * dy < 16 && tiles[idx(x, y)] !== T.HEDGE) set(x, y, T.DIRT);
    }
  // 사냥터 나무, 바위
  for (let y = 1; y < MAP_H - 1; y++)
    for (let x = TOWN_MAX_X + 2; x < MAP_W - 1; x++) {
      if (tiles[idx(x, y)] !== T.FIELD) continue;
      if (y >= 14 && y <= 19 && x < 38) continue; // 길 주변 비우기
      const r = rnd();
      if (r < 0.06) { block[idx(x, y)] = 1; objects.push({ type: 'tree', x: x + 0.5, y: y + 0.5, v: 3 + ((rnd() * 2) | 0) }); }
      else if (r < 0.075) { block[idx(x, y)] = 1; objects.push({ type: 'rock', x: x + 0.5, y: y + 0.5, v: (rnd() * 2) | 0 }); }
    }
  // 사냥터 외곽 나무
  for (let x = TOWN_MAX_X + 1; x < MAP_W; x++) {
    for (const y of [1, MAP_H - 2]) if (tiles[idx(x, y)] === T.FIELD && !block[idx(x, y)] && rnd() < 0.5) {
      block[idx(x, y)] = 1; objects.push({ type: 'tree', x: x + 0.5, y: y + 0.5, v: 3 + ((rnd() * 2) | 0) });
    }
  }
  for (let y = 2; y < MAP_H - 2; y++) {
    const x = MAP_W - 2;
    if (tiles[idx(x, y)] === T.FIELD && !block[idx(x, y)] && rnd() < 0.5) {
      block[idx(x, y)] = 1; objects.push({ type: 'tree', x: x + 0.5, y: y + 0.5, v: 3 + ((rnd() * 2) | 0) });
    }
  }

  // 지형 기반 차단
  for (let i = 0; i < tiles.length; i++) {
    const t = tiles[i];
    if (t === T.WATER || t === T.BUILDING || t === T.HEDGE || t === T.FENCE || t === T.POND) block[i] = 1;
  }
  // 스폰/NPC 위치는 반드시 통행 가능
  block[idx(Math.floor(SPAWN_POINT.x), Math.floor(SPAWN_POINT.y))] = 0;
  block[idx(Math.floor(NPC.x), Math.floor(NPC.y))] = 1; // NPC 자리는 통과 불가

  objects.sort((a, b) => (a.x + a.y) - (b.x + b.y));
  return { tiles, block, objects, w: MAP_W, h: MAP_H };
}

export function walkable(map, x, y) {
  const tx = Math.floor(x), ty = Math.floor(y);
  if (tx < 0 || ty < 0 || tx >= map.w || ty >= map.h) return false;
  return map.block[ty * map.w + tx] === 0;
}

// ---------- A* 길찾기 (8방향, 모서리 뚫기 금지) ----------
export function findPath(map, sx, sy, gx, gy, maxNodes = 4000) {
  const W = map.w, H = map.h;
  sx = Math.floor(sx); sy = Math.floor(sy); gx = Math.floor(gx); gy = Math.floor(gy);
  if (gx < 0 || gy < 0 || gx >= W || gy >= H) return null;
  if (sx === gx && sy === gy) return [];
  const blocked = (x, y) => x < 0 || y < 0 || x >= W || y >= H || map.block[y * W + x] === 1;
  if (blocked(gx, gy)) return null;
  const N = W * H;
  const g = new Float32Array(N).fill(Infinity);
  const came = new Int32Array(N).fill(-1);
  const closed = new Uint8Array(N);
  const heap = []; // [f, idx]
  const push = (f, i) => {
    heap.push([f, i]);
    let c = heap.length - 1;
    while (c > 0) { const p = (c - 1) >> 1; if (heap[p][0] <= heap[c][0]) break; [heap[p], heap[c]] = [heap[c], heap[p]]; c = p; }
  };
  const pop = () => {
    const top = heap[0]; const last = heap.pop();
    if (heap.length) {
      heap[0] = last; let c = 0;
      for (;;) {
        const l = 2 * c + 1, r = l + 1; let m = c;
        if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
        if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
        if (m === c) break; [heap[m], heap[c]] = [heap[c], heap[m]]; c = m;
      }
    }
    return top;
  };
  const h = (x, y) => { const dx = Math.abs(x - gx), dy = Math.abs(y - gy); return Math.max(dx, dy) + 0.4142 * Math.min(dx, dy); };
  const s = sy * W + sx; g[s] = 0; push(h(sx, sy), s);
  let expanded = 0;
  const dirs = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.4142], [1, -1, 1.4142], [-1, 1, 1.4142], [-1, -1, 1.4142]];
  while (heap.length) {
    const [, cur] = pop();
    if (closed[cur]) continue;
    closed[cur] = 1;
    if (++expanded > maxNodes) return null;
    const cx = cur % W, cy = (cur / W) | 0;
    if (cx === gx && cy === gy) {
      const path = []; let k = cur;
      while (k !== s) { path.push({ x: (k % W) + 0.5, y: ((k / W) | 0) + 0.5 }); k = came[k]; }
      path.reverse();
      return path;
    }
    for (const [dx, dy, cost] of dirs) {
      const nx = cx + dx, ny = cy + dy;
      if (blocked(nx, ny)) continue;
      if (dx && dy && (blocked(cx + dx, cy) || blocked(cx, cy + dy))) continue;
      const ni = ny * W + nx;
      if (closed[ni]) continue;
      const ng = g[cur] + cost;
      if (ng < g[ni]) { g[ni] = ng; came[ni] = cur; push(ng + h(nx, ny), ni); }
    }
  }
  return null;
}

export function nearestWalkable(map, x, y, maxR = 3) {
  const tx = Math.floor(x), ty = Math.floor(y);
  if (walkable(map, tx, ty)) return { x: tx, y: ty };
  let best = null, bd = Infinity;
  for (let r = 1; r <= maxR; r++) {
    for (let dy = -r; dy <= r; dy++)
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const nx = tx + dx, ny = ty + dy;
        if (!walkable(map, nx, ny)) continue;
        const d = (nx + 0.5 - x) ** 2 + (ny + 0.5 - y) ** 2;
        if (d < bd) { bd = d; best = { x: nx, y: ny }; }
      }
    if (best) return best;
  }
  return null;
}
