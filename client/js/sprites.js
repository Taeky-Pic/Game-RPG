// 코드로 그리는 픽셀아트 스프라이트 (캐릭터, 몬스터, 타일, 오브젝트)
import { TW, TH, T } from '/shared/data.js';

const OUTLINE = '#2a2340';

function cv(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  return [c, ctx];
}
function px(ctx, x, y, w, h, color) { ctx.fillStyle = color; ctx.fillRect(x, y, w, h); }
function ellipse(ctx, cx, cy, rx, ry, color) {
  ctx.fillStyle = color;
  for (let y = -ry; y <= ry; y++) {
    const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry + 0.01))));
    ctx.fillRect(Math.round(cx - w), Math.round(cy + y), w * 2 + 1, 1);
  }
}

// 불투명 픽셀 둘레에 1px 외곽선
function outline(c, color = OUTLINE) {
  const ctx = c.getContext('2d');
  const { width: w, height: h } = c;
  const src = ctx.getImageData(0, 0, w, h);
  const out = ctx.createImageData(w, h);
  const a = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : src.data[(y * w + x) * 4 + 3]);
  const r = parseInt(color.slice(1, 3), 16), g = parseInt(color.slice(3, 5), 16), b = parseInt(color.slice(5, 7), 16);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (src.data[i + 3] > 0) { for (let k = 0; k < 4; k++) out.data[i + k] = src.data[i + k]; continue; }
      if (a(x - 1, y) || a(x + 1, y) || a(x, y - 1) || a(x, y + 1)) {
        out.data[i] = r; out.data[i + 1] = g; out.data[i + 2] = b; out.data[i + 3] = 255;
      }
    }
  ctx.putImageData(out, 0, 0);
  return c;
}
// 흰색 실루엣 (피격 깜빡임)
function whiteOf(c) {
  const [w, ctx] = cv(c.width, c.height);
  ctx.drawImage(c, 0, 0);
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, c.width, c.height);
  return w;
}

// ---------------- 캐릭터 ----------------
const SKIN = '#ffd9b8', SKIN_D = '#eab08c';
const STYLES = {
  gongmu: { hair: '#7a4a28', hairD: '#5a3418', top: '#2c3a7a', topD: '#1f2a5c', pants: '#2c3a7a', shoes: '#3a2414', shirt: '#ffffff', tie: '#3b6be0', item: 'folder' },
  maint: { hair: '#3a2a20', hairD: '#2a1c14', top: '#3f78d0', topD: '#2d5ca8', pants: '#3f78d0', shoes: '#6b4226', cap: '#2d64c8', capD: '#1f4a98', strap: '#2d5ca8', belt: '#6b4226', item: 'wrench' },
  hr: { hair: '#c4682f', hairD: '#9a4c1e', top: '#f49ab8', topD: '#d97a9c', skirt: '#2a2f5a', shoes: '#1e2240', longHair: true, item: 'clipboard' },
  finance: { hair: '#2a2224', hairD: '#1a1416', top: '#f0f2f8', topD: '#cdd2e2', pants: '#3c4a7c', shoes: '#22263a', tie: '#2c3f8a', glasses: true, item: 'briefcase' },
  ehs: { hair: '#8a5228', hairD: '#6a3a18', top: '#c8e83a', topD: '#a6c42a', sleeve: '#3d8a50', pants: '#4f7a5a', shoes: '#e8e8e8', helmet: true, longHair: true, vest: true, item: 'cone' },
  npc: { hair: '#4a3a30', hairD: '#33261e', top: '#5a5f72', topD: '#43475a', pants: '#43475a', shoes: '#22202a', shirt: '#ffffff', tie: '#b84a4a', glasses: true, item: 'folder' },
};

// frame: 0,1 대기 / 2~5 걷기 / 6 공격
function drawChar(ctx, s, back, frame) {
  const walk = frame >= 2 && frame <= 5 ? [1, 0, -1, 0][frame - 2] : 0;
  const bob = frame === 1 ? 1 : (frame === 3 || frame === 5 ? 1 : 0);
  const atk = frame === 6;
  const ox = 2, oy = 2; // 캔버스 여백 (외곽선/소품용)

  const P = (x, y, w, h, c) => px(ctx, x + ox, y + oy, w, h, c);
  // 다리
  if (s.skirt) {
    P(8, 26, 2, 4 - Math.max(0, walk), SKIN); P(13, 26, 2, 4 - Math.max(0, -walk), SKIN);
    P(7, 30 - Math.max(0, walk), 3, 2, s.shoes); P(13, 30 - Math.max(0, -walk), 3, 2, s.shoes);
  } else {
    const lh = 6 - Math.max(0, walk), rh = 6 - Math.max(0, -walk);
    P(7 + (walk > 0 ? -1 : 0), 24, 4, lh, s.pants); P(12 + (walk < 0 ? 1 : 0), 24, 4, rh, s.pants);
    P(6 + (walk > 0 ? -1 : 0), 24 + lh, 5, 2, s.shoes); P(12 + (walk < 0 ? 1 : 0), 24 + rh, 5, 2, s.shoes);
  }
  const by = bob; // 상체 흔들림
  // 몸통
  P(6, 15 + by, 11, 9, s.top);
  P(6, 22 + by, 11, 2, s.topD);
  if (s.skirt) P(6, 23 + by, 11, 4, s.skirt);
  if (!back) {
    if (s.shirt) { P(10, 15 + by, 3, 3, s.shirt); }
    if (s.tie) { P(11, 16 + by, 1, 6, s.tie); }
    if (s.strap) { P(7, 15 + by, 2, 8, s.strap); P(14, 15 + by, 2, 8, s.strap); P(9, 19 + by, 5, 3, s.topD); }
    if (s.belt) P(6, 23 + by, 11, 1, s.belt);
    if (s.vest) { P(6, 19 + by, 11, 1, '#f08a24'); P(6, 21 + by, 11, 1, '#d8d8e0'); P(11, 15 + by, 1, 9, s.sleeve); }
    if (s.top === '#f49ab8') { P(10, 15 + by, 3, 2, '#ffffff'); }
  } else if (s.vest) { P(6, 19 + by, 11, 1, '#f08a24'); P(6, 21 + by, 11, 1, '#d8d8e0'); }
  // 팔
  const sleeve = s.sleeve || s.top;
  const sw = walk; // 팔 흔들기 (다리와 반대)
  P(4, 15 + by - sw, 2, 7, sleeve); P(4, 22 + by - sw, 2, 2, SKIN);
  if (atk) {
    P(17, 16 + by, 6, 2, sleeve); P(23, 16 + by, 2, 2, SKIN);
  } else {
    P(17, 15 + by + sw, 2, 7, sleeve); P(17, 22 + by + sw, 2, 2, SKIN);
  }
  // 소품
  const iy = 20 + by - sw;
  if (s.item === 'folder') { P(0, iy, 4, 6, '#e0b860'); P(0, iy, 4, 1, '#c09040'); }
  if (s.item === 'briefcase') { P(0, iy + 2, 5, 4, '#6b4226'); P(1, iy + 1, 3, 1, '#4a2a16'); }
  if (s.item === 'clipboard') { P(-1, iy - 2, 5, 6, '#3a4a8a'); P(0, iy - 1, 3, 4, '#f4f4f4'); }
  if (s.item === 'cone') { P(0, iy + 1, 3, 1, '#f08a24'); P(-1, iy + 2, 5, 2, '#ffffff'); P(-1, iy + 4, 5, 2, '#f08a24'); }
  if (s.item === 'wrench') {
    if (atk) { P(24, 13 + by, 2, 6, '#b8c0cc'); P(23, 11 + by, 4, 2, '#8a92a0'); }
    else { P(19, 12 + by + sw, 2, 9, '#b8c0cc'); P(18, 10 + by + sw, 4, 3, '#8a92a0'); }
  }
  // 머리
  const hy = by;
  if (s.longHair) { P(4, 6 + hy, 15, 13, s.hairD); }
  P(5, 2 + hy, 13, 13, SKIN);
  P(5, 13 + hy, 13, 1, SKIN_D);
  if (back) {
    P(4, 1 + hy, 15, 13, s.hair); P(5, 12 + hy, 13, 2, s.hairD);
  } else {
    P(4, 1 + hy, 15, 5, s.hair); P(4, 6 + hy, 2, 6, s.hair); P(17, 6 + hy, 2, 6, s.hair);
    P(6, 5 + hy, 4, 2, s.hair); P(12, 5 + hy, 3, 1, s.hairD);
    // 눈
    P(7, 8 + hy, 2, 3, '#2a2340'); P(14, 8 + hy, 2, 3, '#2a2340');
    P(7, 8 + hy, 1, 1, '#ffffff'); P(14, 8 + hy, 1, 1, '#ffffff');
    P(6, 11 + hy, 2, 1, '#f5a3a3'); P(15, 11 + hy, 2, 1, '#f5a3a3');
    P(10, 12 + hy, 3, 1, '#b85a5a');
    if (s.glasses) {
      P(6, 7 + hy, 4, 1, '#111'); P(13, 7 + hy, 4, 1, '#111'); P(6, 10 + hy, 4, 1, '#111'); P(13, 10 + hy, 4, 1, '#111');
      P(6, 7 + hy, 1, 4, '#111'); P(9, 7 + hy, 1, 4, '#111'); P(13, 7 + hy, 1, 4, '#111'); P(16, 7 + hy, 1, 4, '#111');
      P(10, 8 + hy, 3, 1, '#111');
    }
  }
  if (s.cap) {
    P(4, 0 + hy, 15, 5, s.cap); P(4, 4 + hy, 15, 1, s.capD);
    if (!back) { P(3, 5 + hy, 17, 1, s.capD); P(10, 1 + hy, 3, 2, '#ffffff'); }
  }
  if (s.helmet) {
    P(4, 0 + hy, 15, 5, '#f4f4f4'); P(3, 4 + hy, 17, 2, '#dcdce4');
    if (!back) { P(10, 1 + hy, 3, 1, '#2fb04a'); P(11, 0 + hy, 1, 3, '#2fb04a'); }
  }
}

export function makeCharSprites(cls) {
  const s = STYLES[cls];
  const res = { front: [], back: [], frontW: [], backW: [] };
  for (const back of [false, true]) {
    for (let f = 0; f < 7; f++) {
      const [c, ctx] = cv(30, 36);
      drawChar(ctx, s, back, f);
      outline(c);
      (back ? res.back : res.front).push(c);
      (back ? res.backW : res.frontW).push(whiteOf(c));
    }
  }
  return res;
}

// ---------------- 몬스터 ----------------
function drawMonster(ctx, kind, f) {
  if (kind === 'slime') {
    const sq = f === 1 ? 1 : 0;
    ellipse(ctx, 12, 16 + sq, 9 + sq, 7 - sq, '#7a6fb0');
    ellipse(ctx, 12, 14 + sq, 7, 4 - sq, '#9a90d0');
    px(ctx, 8, 11 + sq, 3, 2, '#c8c0f0');
    // 피곤한 눈
    px(ctx, 7, 16 + sq, 4, 1, '#2a2340'); px(ctx, 14, 16 + sq, 4, 1, '#2a2340');
    px(ctx, 7, 18 + sq, 4, 1, '#5a4f8a'); px(ctx, 14, 18 + sq, 4, 1, '#5a4f8a');
    px(ctx, 11, 20 + sq, 3, 1, '#2a2340');
    px(ctx, 16, 20 + sq, 1, 2, '#bfe8ff');
  } else if (kind === 'bug') {
    const l = f === 1 ? 1 : 0;
    for (let i = 0; i < 3; i++) { px(ctx, 4 - l, 13 + i * 3, 3, 1, '#2a3a20'); px(ctx, 18 + l, 13 + i * 3 + (l ? 1 : 0), 3, 1, '#2a3a20'); }
    ellipse(ctx, 12, 16, 7, 6, '#4cae4f');
    px(ctx, 12, 11, 1, 11, '#2f7a32');
    ellipse(ctx, 12, 8, 5, 3, '#2a3a20');
    px(ctx, 9, 7, 2, 2, '#ff4040'); px(ctx, 14, 7, 2, 2, '#ff4040');
    px(ctx, 8, 2 + l, 1, 4, '#2a3a20'); px(ctx, 16, 2 + l, 1, 4, '#2a3a20');
    px(ctx, 7, 1 + l, 2, 2, '#ffcc33'); px(ctx, 16, 1 + l, 2, 2, '#ffcc33');
    px(ctx, 8, 14, 2, 2, '#8ade6a'); px(ctx, 15, 17, 2, 2, '#8ade6a');
  } else if (kind === 'ghost') {
    const o = f === 1 ? 1 : 0;
    ellipse(ctx, 12, 10 + o, 8, 8, '#eef0ff');
    px(ctx, 4, 10 + o, 17, 9, '#eef0ff');
    for (let i = 0; i < 4; i++) px(ctx, 4 + i * 4 + (o ? 2 : 0), 19 + o, 2, 2, '#eef0ff');
    px(ctx, 5, 6 + o, 3, 3, '#ffffff');
    ellipse(ctx, 9, 11 + o, 1, 2, '#3a3060'); ellipse(ctx, 15, 11 + o, 1, 2, '#3a3060');
    px(ctx, 10, 15 + o, 4, 2, '#3a3060');
    // 서류 + 빨간 도장
    px(ctx, 17, 13 + o, 6, 7, '#ffffff'); px(ctx, 18, 14 + o, 4, 1, '#9aa0b0'); px(ctx, 18, 16 + o, 4, 1, '#9aa0b0');
    px(ctx, 19, 17 + o, 3, 2, '#e03a3a');
  } else if (kind === 'golem') {
    const o = f === 1 ? 1 : 0;
    // 다리
    px(ctx, 9, 36, 7, 8, '#8a6a3c'); px(ctx, 24, 36, 7, 8, '#8a6a3c');
    // 몸통: 서류 상자
    px(ctx, 6, 16 + o, 28, 21, '#b08850');
    px(ctx, 6, 16 + o, 28, 3, '#c8a068');
    px(ctx, 19, 16 + o, 2, 21, '#d8c090');
    for (let i = 0; i < 4; i++) px(ctx, 9, 22 + i * 3 + o, 8, 1, '#f4f0e0');
    px(ctx, 23, 24 + o, 8, 6, '#ffffff'); px(ctx, 24, 25 + o, 6, 1, '#e03a3a'); px(ctx, 24, 27 + o, 4, 1, '#e03a3a');
    // 팔: 바인더
    px(ctx, 0, 18 + o * 2, 6, 14, '#5a5fb0'); px(ctx, 34, 18 - o, 6, 14, '#5a5fb0');
    px(ctx, 1, 20 + o * 2, 4, 1, '#c0c4f0'); px(ctx, 35, 20 - o, 4, 1, '#c0c4f0');
    // 머리: 종이 더미
    px(ctx, 11, 2 + o, 18, 15, '#f4f0e0');
    for (let i = 0; i < 5; i++) px(ctx, 11, 4 + i * 3 + o, 18, 1, '#d0ccc0');
    px(ctx, 14, 8 + o, 4, 3, '#ff3030'); px(ctx, 22, 8 + o, 4, 3, '#ff3030');
    px(ctx, 15, 8 + o, 1, 1, '#ffd0d0'); px(ctx, 23, 8 + o, 1, 1, '#ffd0d0');
    px(ctx, 16, 13 + o, 8, 2, '#2a2340');
    // "마감" 붉은 띠
    px(ctx, 11, 0 + o, 18, 2, '#e03a3a');
  }
}
const MON_SIZE = { slime: [26, 26], bug: [26, 26], ghost: [26, 26], golem: [42, 46] };
export function makeMonsterSprites(kind) {
  const [w, h] = MON_SIZE[kind];
  const frames = [], white = [];
  for (let f = 0; f < 2; f++) {
    const [c, ctx] = cv(w, h);
    ctx.translate(1, 1);
    drawMonster(ctx, kind, f);
    outline(c);
    frames.push(c); white.push(whiteOf(c));
  }
  return { frames, white };
}

// ---------------- 타일 ----------------
function diamondRows(fn) {
  for (let r = 0; r < TH; r++) {
    const half = r < TH / 2 ? (r + 1) * 2 : (TH - r) * 2;
    fn(r, TW / 2 - half, half * 2);
  }
}
function hash(x, y, k = 0) {
  let h = (x * 374761393 + y * 668265263 + k * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
const TILE_COLORS = {
  [T.GRASS]: ['#86c95e', '#7aba52', '#94d66a'],
  [T.FIELD]: ['#5f9e4c', '#548f42', '#6cac58'],
  [T.STONE]: ['#c9c2d8', '#b3abc6', '#ddd6ea'],
  [T.DIRT]: ['#c09a66', '#a8844f', '#d0ac78'],
  [T.HEDGE]: ['#3f7a3a', '#33662f', '#4c8c46'],
  [T.WATER]: ['#c9c2d8', '#b3abc6', '#ddd6ea'],
  [T.POND]: ['#5aa6e0', '#4a90cc', '#8ac8f0'],
  [T.FENCE]: ['#7aba52', '#6ca848', '#86c95e'],
  [T.BUILDING]: ['#b8b0c8', '#a8a0b8', '#c8c0d8'],
};
// 한 타일을 ctx의 (ox, oy) (다이아몬드 좌상단)에 그림
export function drawTile(ctx, t, ox, oy, tx, ty) {
  const [base, dark, light] = TILE_COLORS[t] || TILE_COLORS[T.GRASS];
  diamondRows((r, x0, w) => { ctx.fillStyle = base; ctx.fillRect(ox + x0, oy + r, w, 1); });
  if (t === T.STONE || t === T.WATER || t === T.BUILDING) {
    // 자갈 줄눈: 타일을 2x2 로 나누는 선
    ctx.fillStyle = dark;
    for (let i = 0; i < TW / 2; i += 2) {
      ctx.fillRect(ox + TW / 4 + i, oy + TH / 4 + i / 2, 2, 1);
      ctx.fillRect(ox + TW * 3 / 4 - i - 2, oy + TH / 4 + i / 2, 2, 1);
    }
    ctx.fillStyle = light;
    ctx.fillRect(ox + TW / 2 - 1, oy + 2, 3, 1);
    ctx.fillRect(ox + 6, oy + TH / 2, 3, 1);
    ctx.fillRect(ox + TW - 9, oy + TH / 2, 3, 1);
    ctx.fillRect(ox + TW / 2 - 1, oy + TH - 4, 3, 1);
  } else {
    diamondRows((r, x0, w) => {
      for (let i = 0; i < w; i += 2) {
        const h = hash(tx * 64 + i, ty * 64 + r, t);
        if (h < 0.12) { ctx.fillStyle = dark; ctx.fillRect(ox + x0 + i, oy + r, 2, 1); }
        else if (h > 0.93) { ctx.fillStyle = light; ctx.fillRect(ox + x0 + i, oy + r, 1, 1); }
      }
    });
    if ((t === T.GRASS || t === T.FIELD) && hash(tx, ty, 9) < 0.18) {
      const fx = ox + 10 + Math.floor(hash(tx, ty, 3) * 12), fy = oy + 5 + Math.floor(hash(tx, ty, 4) * 6);
      const fc = ['#ffffff', '#ffe066', '#ff8fb0', '#b0a0ff'][Math.floor(hash(tx, ty, 5) * 4)];
      ctx.fillStyle = fc; ctx.fillRect(fx, fy, 1, 1); ctx.fillRect(fx + 2, fy + 1, 1, 1);
    }
    if (t === T.HEDGE) {
      ctx.fillStyle = light;
      ctx.fillRect(ox + 10, oy + 4, 3, 2); ctx.fillRect(ox + 18, oy + 8, 3, 2);
    }
    if (t === T.POND) {
      ctx.fillStyle = light;
      if (hash(tx, ty, 7) < 0.5) ctx.fillRect(ox + 12, oy + 7, 5, 1);
    }
  }
}

// ---------------- 오브젝트 ----------------
export function makeTree(v) {
  const [c, ctx] = cv(34, 50);
  const field = v >= 3;
  const g1 = field ? '#3f8a3e' : '#4fa64a', g2 = field ? '#2f6e30' : '#3c8a3a', g3 = field ? '#5aa858' : '#78c868';
  px(ctx, 14, 34, 6, 13, '#7a5232'); px(ctx, 14, 34, 2, 13, '#5a3a20');
  const blobs = v % 3 === 0 ? [[17, 26, 12, 9], [11, 18, 8, 7], [22, 17, 8, 7], [17, 11, 9, 8]]
    : v % 3 === 1 ? [[17, 28, 11, 8], [17, 18, 10, 10], [17, 9, 7, 6]]
      : [[17, 27, 13, 8], [12, 19, 9, 8], [23, 20, 8, 7], [17, 12, 8, 7]];
  for (const [x, y, rx, ry] of blobs) ellipse(ctx, x, y + 1, rx, ry, g2);
  for (const [x, y, rx, ry] of blobs) ellipse(ctx, x - 1, y - 1, rx - 2, ry - 2, g1);
  for (const [x, y, rx] of blobs) px(ctx, x - rx / 2, y - 3, 3, 2, g3);
  if (v === 1) for (let i = 0; i < 4; i++) px(ctx, 9 + i * 5, 16 + (i % 2) * 8, 2, 2, '#ff8fb0');
  return outline(c);
}
export function makeRock(v) {
  const [c, ctx] = cv(24, 18);
  ellipse(ctx, 12, 10, v ? 8 : 10, 6, '#8a8aa0');
  ellipse(ctx, 11, 8, v ? 6 : 7, 4, '#a8a8c0');
  px(ctx, 8, 6, 3, 1, '#c8c8dc');
  return outline(c);
}
export function makeBench() {
  const [c, ctx] = cv(30, 20);
  // 등받이 / 좌석 (아이소 방향 대각선 느낌)
  for (let i = 0; i < 22; i += 2) {
    px(ctx, 4 + i, 4 + (i >> 1), 2, 3, '#a0683a');
    px(ctx, 4 + i, 8 + (i >> 1), 2, 3, '#c08048');
  }
  px(ctx, 5, 11, 2, 5, '#4a4a5a'); px(ctx, 23, 16, 2, 3, '#4a4a5a');
  return outline(c);
}
export function makeLamp() {
  const [c, ctx] = cv(14, 46);
  px(ctx, 5, 12, 3, 30, '#3c3f6a'); px(ctx, 3, 40, 7, 4, '#3c3f6a');
  px(ctx, 2, 3, 9, 9, '#3c3f6a'); px(ctx, 3, 4, 7, 7, '#ffe48a'); px(ctx, 4, 5, 2, 3, '#fff8d8');
  px(ctx, 1, 1, 11, 2, '#2a2c50'); px(ctx, 5, 0, 3, 1, '#d8b040');
  return outline(c);
}
export function makeFence() {
  // 울타리는 y 방향(화면의 오른쪽 위 ↔ 왼쪽 아래)으로 이어짐. 기준점 (16, 22) = 타일 중심
  const [c, ctx] = cv(34, 34);
  const ground = (i) => 30 - i / 2;
  for (let i = 0; i < 32; i += 1) {
    px(ctx, i + 1, ground(i) - 11, 1, 2, '#c08048');
    px(ctx, i + 1, ground(i) - 6, 1, 2, '#c08048');
  }
  for (const i of [2, 16, 30]) px(ctx, i, ground(i) - 14, 3, 14, '#9a6034');
  return outline(c);
}
export function makeFlowerbed() {
  const w = 3, h = 2; // 타일 단위
  const W = (w + h) * (TW / 2) + 2, H = (w + h) * (TH / 2) + 14;
  const [c, ctx] = cv(W, H);
  const ox = h * (TW / 2) + 1, oy = 10;
  const pt = (x, y) => [ox + (x - y) * (TW / 2), oy + (x + y) * (TH / 2)];
  // 측면 테두리
  const poly = (pts, color) => { ctx.fillStyle = color; ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.fill(); };
  const [L, B, R, Tt] = [pt(0, h), pt(w, h), pt(w, 0), pt(0, 0)];
  poly([L, B, [B[0], B[1] + 4], [L[0], L[1] + 4]], '#8a7a9a');
  poly([B, R, [R[0], R[1] + 4], [B[0], B[1] + 4]], '#a090b0');
  poly([Tt, R, B, L], '#5a3a28');
  // 꽃
  const cols = ['#ff6f91', '#ffd84a', '#ffffff', '#b07cff', '#ff9f43'];
  let k = 0;
  for (let y = 0.3; y < h; y += 0.45)
    for (let x = 0.3; x < w; x += 0.45) {
      const [sx, sy] = pt(x, y);
      px(ctx, sx - 1, sy - 3, 3, 3, '#3c8a3a');
      px(ctx, sx - 1, sy - 4, 2, 2, cols[(k++ * 7 + Math.floor(x * 3)) % cols.length]);
    }
  return { canvas: c, ax: ox + (w - h) * (TW / 4), ay: oy + (w + h) * (TH / 4) };
}
// 분수 (프레임 3개)
export function makeFountain() {
  const frames = [];
  for (let f = 0; f < 3; f++) {
    const [c, ctx] = cv(104, 76);
    const cx = 52, cy = 52;
    ellipse(ctx, cx, cy + 4, 46, 22, '#8a84a8');
    ellipse(ctx, cx, cy, 46, 22, '#d8d2ea');
    ellipse(ctx, cx, cy, 40, 18, '#9a94b8');
    ellipse(ctx, cx, cy + 1, 38, 16, '#5aa6e0');
    ellipse(ctx, cx - 6, cy - 2, 22, 8, '#7cc0f0');
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + f * 0.7;
      px(ctx, cx + Math.cos(a) * 28, cy + Math.sin(a) * 11, 3, 1, '#d8f0ff');
    }
    // 중앙 기둥
    px(ctx, cx - 4, cy - 26, 8, 26, '#d8d2ea'); px(ctx, cx - 4, cy - 26, 2, 26, '#f0ecf8');
    ellipse(ctx, cx, cy - 26, 11, 4, '#c8c2dc');
    ellipse(ctx, cx, cy - 27, 9, 3, '#5aa6e0');
    // 물줄기
    const jh = [12, 14, 13][f];
    px(ctx, cx - 1, cy - 27 - jh, 2, jh, '#bfe6ff');
    for (const s of [-1, 1]) for (let i = 0; i < 8; i++) {
      px(ctx, cx + s * (2 + i * 1.6), cy - 27 - jh + i * i * 0.45 + ((i + f) % 2), 2, 2, i % 2 ? '#bfe6ff' : '#e8f6ff');
    }
    outline(c);
    frames.push(c);
  }
  return frames;
}

// 본사 건물 (지면 레이어에 한번만 그림)
export function drawBuilding(ctx, B, toScr) {
  const Hh = 78; // 벽 높이
  const corner = (x, y) => { const s = toScr(x, y); return [s.sx, s.sy]; };
  const Lc = corner(B.x0, B.y1 + 1), Bc = corner(B.x1 + 1, B.y1 + 1), Rc = corner(B.x1 + 1, B.y0), Tc = corner(B.x0, B.y0);
  const poly = (pts, color) => { ctx.fillStyle = color; ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.fill(); };
  const up = ([x, y], h) => [x, y - h];
  // 정면(왼쪽 아래를 향함): Lc -> Bc
  poly([Lc, Bc, up(Bc, Hh), up(Lc, Hh)], '#ead8aa');
  // 오른쪽 면: Bc -> Rc
  poly([Bc, Rc, up(Rc, Hh), up(Bc, Hh)], '#cdb886');
  // 지붕
  const roofH = Hh + 2;
  poly([up(Tc, roofH), up(Rc, roofH), up(Bc, roofH), up(Lc, roofH)], '#4a5296');
  poly([up(Lc, roofH), up(Bc, roofH), up(Bc, Hh - 4), up(Lc, Hh - 4)], '#3a4078');
  poly([up(Bc, roofH), up(Rc, roofH), up(Rc, Hh - 4), up(Bc, Hh - 4)], '#2e3364');
  // 지붕 위 탑
  const midTop = corner((B.x0 + B.x1 + 1) / 2, (B.y0 + B.y1 + 1) / 2);
  const tw = 26;
  poly([[midTop[0] - tw, midTop[1] - roofH], [midTop[0], midTop[1] - roofH + 13], [midTop[0], midTop[1] - roofH - 20], [midTop[0] - tw, midTop[1] - roofH - 33]], '#ead8aa');
  poly([[midTop[0], midTop[1] - roofH + 13], [midTop[0] + tw, midTop[1] - roofH], [midTop[0] + tw, midTop[1] - roofH - 33], [midTop[0], midTop[1] - roofH - 20]], '#cdb886');
  poly([[midTop[0] - tw - 3, midTop[1] - roofH - 33], [midTop[0], midTop[1] - roofH - 50], [midTop[0] + tw + 3, midTop[1] - roofH - 33], [midTop[0], midTop[1] - roofH - 18]], '#4a5296');

  // 정면 장식: 면 좌표계 (u: Lc에서 Bc 방향 픽셀, v: 위로)
  const frontLen = (B.x1 + 1 - B.x0) * (TW / 2);
  ctx.save();
  ctx.setTransform(1, 0.5, 0, 1, Lc[0], Lc[1]);
  // 바닥 석재 띠
  ctx.fillStyle = '#a8968a'; ctx.fillRect(0, -8, frontLen, 8);
  ctx.fillStyle = '#d4c094'; ctx.fillRect(0, -Hh + 2, frontLen, 4);
  ctx.fillStyle = '#d4c094'; ctx.fillRect(0, -42, frontLen, 2);
  // 창문
  for (let u = 10; u < frontLen - 10; u += 22) {
    if (Math.abs(u + 6 - frontLen / 2) < 34) continue;
    for (const v of [-34, -66]) {
      ctx.fillStyle = '#3c4a7c'; ctx.fillRect(u, v, 13, 20);
      ctx.fillStyle = '#7aa4e8'; ctx.fillRect(u + 1, v + 1, 11, 18);
      ctx.fillStyle = '#b8d4ff'; ctx.fillRect(u + 2, v + 2, 3, 7);
      ctx.fillStyle = '#3c4a7c'; ctx.fillRect(u + 6, v + 1, 1, 18);
    }
  }
  // 기둥과 아치 입구
  const cu = frontLen / 2;
  ctx.fillStyle = '#d4c094'; ctx.fillRect(cu - 34, -64, 8, 64); ctx.fillRect(cu + 26, -64, 8, 64);
  ctx.fillStyle = '#c0aa7c'; ctx.fillRect(cu - 26, -50, 52, 50);
  ctx.fillStyle = '#2a2340';
  ctx.beginPath(); ctx.moveTo(cu - 18, 0); ctx.lineTo(cu - 18, -28); ctx.quadraticCurveTo(cu, -46, cu + 18, -28); ctx.lineTo(cu + 18, 0); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#4a3a5a'; ctx.fillRect(cu - 14, -26, 28, 26);
  ctx.fillStyle = '#ffd86a'; ctx.fillRect(cu - 2, -20, 4, 4);
  // HBC 간판
  ctx.fillStyle = '#b07a20'; ctx.fillRect(cu - 30, -76, 60, 18);
  ctx.fillStyle = '#ffcf4a'; ctx.fillRect(cu - 28, -74, 56, 14);
  ctx.fillStyle = '#7a4a10';
  ctx.font = 'bold 13px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('HBC', cu, -66);
  ctx.restore();
  // 오른쪽 면 창문
  const sideLen = (B.y1 + 1 - B.y0) * (TW / 2);
  ctx.save();
  ctx.setTransform(1, -0.5, 0, 1, Bc[0], Bc[1]);
  ctx.fillStyle = '#9a8a7e'; ctx.fillRect(0, -8, sideLen, 8);
  for (let u = 8; u < sideLen - 10; u += 22)
    for (const v of [-34, -66]) {
      ctx.fillStyle = '#2e3a64'; ctx.fillRect(u, v, 13, 20);
      ctx.fillStyle = '#5a7cc0'; ctx.fillRect(u + 1, v + 1, 11, 18);
    }
  ctx.restore();
  // 입구 계단
  const st = corner((B.x0 + B.x1 + 1) / 2, B.y1 + 1);
  for (let i = 0; i < 3; i++) {
    poly([[st[0] - 30 + i * 2, st[1] + i * 2 - 10], [st[0] + 6 - i * 2, st[1] + 8 + i * 2], [st[0] + 6 - i * 2, st[1] + 10 + i * 2], [st[0] - 30 + i * 2, st[1] + i * 2 - 8]], i % 2 ? '#bdb4cc' : '#d8d0e6');
  }
}

// 효과용 작은 스프라이트
export function makeHeart(color = '#ff5fa2') {
  const [c, ctx] = cv(9, 8);
  const rows = ['.XX.XX..', 'XXXXXXX.', 'XXXXXXX.', '.XXXXX..', '..XXX...', '...X....'];
  rows.forEach((r, y) => [...r].forEach((ch, x) => { if (ch === 'X') px(ctx, x + 1, y + 1, 1, 1, color); }));
  px(ctx, 2, 2, 1, 1, '#ffffff');
  return outline(c, '#7a1a4a');
}
export function makePaper() {
  const [c, ctx] = cv(8, 9);
  px(ctx, 1, 1, 6, 7, '#ffffff'); px(ctx, 2, 3, 4, 1, '#9aa0c0'); px(ctx, 2, 5, 3, 1, '#9aa0c0');
  return outline(c, '#4a4a7a');
}
export function makeCross() {
  const [c, ctx] = cv(9, 9);
  px(ctx, 3, 1, 3, 7, '#7cff6a'); px(ctx, 1, 3, 7, 3, '#7cff6a'); px(ctx, 4, 2, 1, 5, '#e8ffe0'); px(ctx, 2, 4, 5, 1, '#e8ffe0');
  return c;
}
export function makeCone() {
  const [c, ctx] = cv(8, 9);
  px(ctx, 3, 1, 2, 2, '#f08a24'); px(ctx, 2, 3, 4, 2, '#ffffff'); px(ctx, 1, 5, 6, 2, '#f08a24'); px(ctx, 0, 7, 8, 1, '#c06010');
  return outline(c);
}
export function makeStamp() {
  const [c, ctx] = cv(9, 9);
  px(ctx, 1, 1, 7, 7, '#ffffff'); px(ctx, 2, 2, 5, 5, '#e03a3a'); px(ctx, 3, 3, 3, 3, '#ffffff'); px(ctx, 4, 4, 1, 1, '#e03a3a');
  return outline(c, '#7a1a1a');
}
