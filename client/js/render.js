// 렌더링: 저해상도 월드 캔버스(픽셀아트) + 고해상도 텍스트 오버레이
import { TW, TH, toScreen, toWorld, MAP_W, MAP_H, BUILDING, NPC, CLASSES, MONSTERS } from '/shared/data.js';
import * as S from './sprites.js';

const PAD = 40, PAD_TOP = 200;
const EMOTES = ['❗', '❤️', '💢', '💧'];

export class Renderer {
  constructor(canvas, map) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.map = map;
    this.world = document.createElement('canvas');
    this.wctx = this.world.getContext('2d');
    this.scale = 2;
    this.offX = 0; this.offY = 0;
    this.fxGround = []; this.fxTop = []; this.texts = [];
    this.shake = 0;
    this.buildAssets();
    this.buildGround();
    this.resize();
    addEventListener('resize', () => this.resize());
  }

  resize() {
    const w = innerWidth, h = innerHeight;
    this.dpr = Math.min(2, devicePixelRatio || 1);
    this.scale = w > 2300 ? 3 : 2;
    this.canvas.width = Math.round(w * this.dpr);
    this.canvas.height = Math.round(h * this.dpr);
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.world.width = Math.ceil(w / this.scale);
    this.world.height = Math.ceil(h / this.scale);
    this.wctx.imageSmoothingEnabled = false;
    this.cssW = w; this.cssH = h;
  }

  buildAssets() {
    this.chars = {};
    for (const c of [...Object.keys(CLASSES), 'npc']) this.chars[c] = S.makeCharSprites(c);
    this.mons = {};
    for (const k of Object.keys(MONSTERS)) this.mons[k] = S.makeMonsterSprites(k);
    this.trees = [0, 1, 2, 3, 4].map((v) => S.makeTree(v));
    this.rocks = [S.makeRock(0), S.makeRock(1)];
    this.bench = S.makeBench();
    this.lamp = S.makeLamp();
    this.fence = S.makeFence();
    this.flowerbed = S.makeFlowerbed();
    this.fountain = S.makeFountain();
    this.heart = S.makeHeart();
    this.paper = S.makePaper();
    this.cross = S.makeCross();
    this.cone = S.makeCone();
    this.stamp = S.makeStamp();
  }

  buildGround() {
    const w = (MAP_W + MAP_H) * (TW / 2) + PAD * 2;
    const h = (MAP_W + MAP_H) * (TH / 2) + PAD_TOP + PAD;
    const g = document.createElement('canvas');
    g.width = w; g.height = h;
    const ctx = g.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    this.gx0 = MAP_H * (TW / 2) + PAD;
    this.gy0 = PAD_TOP;
    for (let y = 0; y < MAP_H; y++)
      for (let x = 0; x < MAP_W; x++) {
        const s = toScreen(x, y);
        S.drawTile(ctx, this.map.tiles[y * MAP_W + x], this.gx0 + s.sx - TW / 2, this.gy0 + s.sy, x, y);
      }
    S.drawBuilding(ctx, BUILDING, (x, y) => { const s = toScreen(x, y); return { sx: this.gx0 + s.sx, sy: this.gy0 + s.sy }; });
    this.ground = g;
  }

  // 화면(CSS px) -> 월드 타일 좌표
  screenToWorld(mx, my) {
    const sx = mx / this.scale - this.offX;
    const sy = my / this.scale - this.offY;
    return toWorld(sx, sy);
  }
  // 월드 -> 저해상도 화면 좌표
  w2s(x, y) {
    const s = toScreen(x, y);
    return { x: s.sx + this.offX, y: s.sy + this.offY };
  }

  // 마우스 위치의 몬스터/NPC 선택
  pick(state, mx, my) {
    const lx = mx / this.scale, ly = my / this.scale;
    let best = null, bestKey = -Infinity;
    for (const m of state.monsters.values()) {
      const s = this.w2s(m.rx, m.ry);
      const big = MONSTERS[m.kind].boss;
      const hw = big ? 22 : 13, hh = big ? 46 : 26;
      if (lx >= s.x - hw && lx <= s.x + hw && ly >= s.y - hh && ly <= s.y + 4) {
        const key = m.rx + m.ry;
        if (key > bestKey) { bestKey = key; best = { type: 'monster', id: m.id }; }
      }
    }
    if (!best) {
      const s = this.w2s(NPC.x, NPC.y);
      if (lx >= s.x - 12 && lx <= s.x + 12 && ly >= s.y - 36 && ly <= s.y + 4) best = { type: 'npc' };
    }
    return best;
  }

  // ---------- 효과 ----------
  addText(x, y, text, color, big = false) { if (document.hidden) return;
    this.texts.push({ x, y, text, color, big, life: 0, max: big ? 1.3 : 1.0, dx: (Math.random() - 0.5) * 0.4 });
  }
  ring(x, y, r0, r1, color, max = 0.5, width = 2, ground = true) { if (document.hidden) return;
    (ground ? this.fxGround : this.fxTop).push({ t: 'ring', x, y, r0, r1, color, life: 0, max, width });
  }
  burst(x, y, color, n = 8, speed = 40, h = 10, size = 2, max = 0.5) { if (document.hidden) return;
    const s = toScreen(x, y);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = speed * (0.4 + Math.random() * 0.6);
      this.fxTop.push({ t: 'p', sx: s.sx, sy: s.sy - h, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.6 - 20, g: 80, color, size, life: 0, max: max * (0.6 + Math.random() * 0.4) });
    }
  }
  spriteParticle(x, y, img, opts = {}) { if (document.hidden) return;
    const s = toScreen(x, y);
    this.fxTop.push({ t: 'sp', img, sx: s.sx + (opts.ox || 0), sy: s.sy + (opts.oy || 0), vx: opts.vx || 0, vy: opts.vy || 0, g: opts.g || 0, life: -(opts.delay || 0), max: opts.max || 0.8, rot: opts.rot || 0 });
  }
  projectile(from, to, img, max = 0.25, arc = 10) { if (document.hidden) return;
    this.fxTop.push({ t: 'proj', from, to, img, life: 0, max, arc });
  }
  slash(x, y, ang, color = '#ffffff', max = 0.2, r = 14) { if (document.hidden) return;
    this.fxTop.push({ t: 'slash', x, y, ang, color, life: 0, max, r });
  }
  warn(x, y, r, dur) { if (document.hidden) return; this.fxGround.push({ t: 'warn', x, y, r, life: 0, max: dur }); }
  magic(x, y, r, color, max) { if (document.hidden) return; this.fxGround.push({ t: 'magic', x, y, r, color, life: 0, max }); }
  trail(ent, x0, y0, x1, y1, sprite) { if (document.hidden) return;
    for (let i = 0; i < 5; i++) {
      const k = i / 5;
      this.fxGround.push({ t: 'ghost', x: x0 + (x1 - x0) * k, y: y0 + (y1 - y0) * k, sprite, life: -i * 0.03, max: 0.35, flip: ent.flip });
    }
    this.fxTop.push({ t: 'line', x0, y0, x1, y1, life: 0, max: 0.35 });
  }
  column(x, y) { if (document.hidden) return; this.fxTop.push({ t: 'column', x, y, life: 0, max: 1.2 }); }
  marker(x, y) { if (document.hidden) return; this.fxGround.push({ t: 'marker', x, y, life: 0, max: 0.6 }); }

  updateFx(list, dt) {
    for (const f of list) {
      f.life += dt;
      if (f.t === 'p' || f.t === 'sp') {
        if (f.life < 0) continue;
        f.vy += (f.g || 0) * dt; f.sx += f.vx * dt; f.sy += f.vy * dt;
      }
    }
    return list.filter((f) => f.life < f.max);
  }

  // ---------- 그리기 ----------
  draw(state, dt, now) {
    const { wctx: c, world } = this;
    // 카메라
    const me = state.players.get(state.myId);
    const cam = me ? toScreen(me.rx, me.ry) : toScreen(MAP_W / 4, MAP_H / 2);
    let shx = 0, shy = 0;
    if (this.shake > 0) { this.shake -= dt; shx = (Math.random() - 0.5) * 4; shy = (Math.random() - 0.5) * 3; }
    this.offX = Math.round(world.width / 2 - cam.sx + shx);
    this.offY = Math.round(world.height / 2 - cam.sy + 16 + shy);

    c.setTransform(1, 0, 0, 1, 0, 0);
    c.fillStyle = '#2e5a32';
    c.fillRect(0, 0, world.width, world.height);
    c.drawImage(this.ground, this.offX - this.gx0, this.offY - this.gy0);

    // 바닥 효과
    this.fxGround = this.updateFx(this.fxGround, dt);
    for (const f of this.fxGround) this.drawFx(c, f, now);
    // 대상 표시
    if (state.targetId) {
      const m = state.monsters.get(state.targetId);
      if (m) this.drawSelect(c, m.rx, m.ry, MONSTERS[m.kind].boss ? 1.4 : 0.7, '#ff5a5a', now);
    }
    if (state.hover && state.hover.type === 'monster' && state.hover.id !== state.targetId) {
      const m = state.monsters.get(state.hover.id);
      if (m) this.drawSelect(c, m.rx, m.ry, MONSTERS[m.kind].boss ? 1.4 : 0.7, '#ffffff', now);
    }

    // 깊이 정렬
    const list = [];
    const W = world.width, H = world.height;
    const inView = (x, y, mx = 60, top = 120) => {
      const s = this.w2s(x, y);
      return s.x > -mx && s.x < W + mx && s.y > -20 && s.y < H + top;
    };
    for (const o of this.map.objects) if (inView(o.x, o.y)) list.push({ k: o.x + o.y, o });
    for (const p of state.players.values()) list.push({ k: p.rx + p.ry, p });
    for (const m of state.monsters.values()) list.push({ k: m.rx + m.ry, m });
    for (const d of state.dying) list.push({ k: d.rx + d.ry, d });
    list.push({ k: NPC.x + NPC.y, npc: true });
    list.sort((a, b) => a.k - b.k);
    for (const it of list) {
      if (it.o) this.drawObject(c, it.o, now);
      else if (it.p) this.drawPlayer(c, it.p, now);
      else if (it.m) this.drawMonster(c, it.m, now);
      else if (it.d) this.drawDying(c, it.d, now);
      else if (it.npc) this.drawNpc(c, now);
    }

    // 위쪽 효과
    this.fxTop = this.updateFx(this.fxTop, dt);
    for (const f of this.fxTop) this.drawFx(c, f, now);

    // 화면에 업스케일
    const o = this.ctx;
    o.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    o.imageSmoothingEnabled = false;
    o.clearRect(0, 0, this.cssW, this.cssH);
    o.drawImage(world, 0, 0, world.width * this.scale, world.height * this.scale);
    this.drawOverlay(o, state, dt, now);
  }

  drawSelect(c, x, y, r, color, now) {
    const s = this.w2s(x, y);
    c.save();
    c.strokeStyle = color; c.lineWidth = 1;
    c.globalAlpha = 0.7 + Math.sin(now * 8) * 0.3;
    c.beginPath(); c.ellipse(s.x, s.y, r * 22.6, r * 11.3, 0, 0, Math.PI * 2); c.stroke();
    c.restore();
  }

  drawShadow(c, x, y, rx = 9, ry = 4) {
    c.fillStyle = 'rgba(30,20,60,0.28)';
    c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fill();
  }

  drawObject(c, o, now) {
    const s = this.w2s(o.x, o.y);
    let img, ax, ay;
    switch (o.type) {
      case 'tree': img = this.trees[o.v]; ax = 17; ay = 46; this.drawShadow(c, s.x, s.y, 13, 6); break;
      case 'rock': img = this.rocks[o.v]; ax = 12; ay = 14; break;
      case 'bench': img = this.bench; ax = 15; ay = 13; break;
      case 'lamp': img = this.lamp; ax = 7; ay = 44; break;
      case 'fence': img = this.fence; ax = 17; ay = 22; break;
      case 'flowerbed': img = this.flowerbed.canvas; ax = this.flowerbed.ax; ay = this.flowerbed.ay; break;
      case 'fountain': img = this.fountain[Math.floor(now * 6) % 3]; ax = 52; ay = 52; break;
      default: return;
    }
    c.drawImage(img, Math.round(s.x - ax), Math.round(s.y - ay));
  }

  drawCharSprite(c, sprites, e, frame, now, alpha = 1) {
    const s = this.w2s(e.rx, e.ry);
    const set = e.back ? sprites.back : sprites.front;
    const wset = e.back ? sprites.backW : sprites.frontW;
    const img = set[frame];
    c.save();
    c.globalAlpha = alpha;
    const x = Math.round(s.x), y = Math.round(s.y);
    if (e.dead) {
      c.translate(x, y - 4);
      c.rotate(-Math.PI / 2);
      c.globalAlpha = 0.75;
      c.drawImage(img, -16, -14);
      c.restore();
      return;
    }
    if (e.flip) { c.translate(x, 0); c.scale(-1, 1); c.translate(-x, 0); }
    c.drawImage(img, x - 14, y - 34);
    if (now < e.hitUntil) { c.globalAlpha = 0.7; c.drawImage(wset[frame], x - 14, y - 34); }
    c.restore();
  }

  frameOf(e, now) {
    if (now < e.attackUntil) return 6;
    if (e.moving) return 2 + (Math.floor(now * 9 + e.id) % 4);
    return Math.floor(now * 2 + e.id * 0.3) % 2;
  }

  drawPlayer(c, p, now) {
    const s = this.w2s(p.rx, p.ry);
    this.drawShadow(c, s.x, s.y);
    if (p.buff) {
      c.save(); c.strokeStyle = '#7cff6a'; c.globalAlpha = 0.5 + Math.sin(now * 6) * 0.3;
      c.beginPath(); c.ellipse(s.x, s.y, 12, 6, 0, 0, Math.PI * 2); c.stroke(); c.restore();
    }
    this.drawCharSprite(c, this.chars[p.cls], p, p.dead ? 0 : this.frameOf(p, now), now);
  }

  drawNpc(c, now) {
    const e = { rx: NPC.x, ry: NPC.y, back: false, flip: false, hitUntil: 0, id: 99 };
    const s = this.w2s(NPC.x, NPC.y);
    this.drawShadow(c, s.x, s.y);
    this.drawCharSprite(c, this.chars.npc, e, Math.floor(now * 2) % 2, now);
  }

  drawMonster(c, m, now) {
    const sp = this.mons[m.kind];
    const boss = MONSTERS[m.kind].boss;
    const s = this.w2s(m.rx, m.ry);
    const f = Math.floor(now * (m.moving ? 6 : 2.5) + m.id) % 2;
    const img = sp.frames[f];
    const ax = boss ? 21 : 13, ay = boss ? 45 : 24;
    const float = m.kind === 'ghost' ? Math.round(Math.sin(now * 3 + m.id) * 2) - 4 : 0;
    this.drawShadow(c, s.x, s.y, boss ? 20 : 9, boss ? 8 : 4);
    let lunge = 0;
    if (now < m.attackUntil) lunge = 2;
    c.save();
    const x = Math.round(s.x), y = Math.round(s.y + float);
    if (m.flip) { c.translate(x, 0); c.scale(-1, 1); c.translate(-x, 0); }
    c.drawImage(img, x - ax + lunge, y - ay);
    if (now < m.hitUntil) { c.globalAlpha = 0.75; c.drawImage(sp.white[f], x - ax + lunge, y - ay); }
    c.restore();
    if (m.st) {
      for (let i = 0; i < 3; i++) {
        const a = now * 5 + (i * Math.PI * 2) / 3;
        c.fillStyle = '#ffe04a';
        c.fillRect(Math.round(s.x + Math.cos(a) * 8), Math.round(s.y - ay - 3 + Math.sin(a) * 3), 2, 2);
      }
    }
  }

  drawDying(c, d, now) {
    const sp = this.mons[d.kind];
    const boss = MONSTERS[d.kind].boss;
    const s = this.w2s(d.rx, d.ry);
    const k = 1 - d.life / d.max;
    c.save();
    c.globalAlpha = Math.max(0, k);
    c.drawImage(sp.white[0], Math.round(s.x - (boss ? 21 : 13)), Math.round(s.y - (boss ? 45 : 24) - (1 - k) * 8));
    c.restore();
  }

  ell(c, x, y, r) { const s = this.w2s(x, y); c.beginPath(); c.ellipse(s.x, s.y, Math.max(0.1, r * 22.6), Math.max(0.1, r * 11.3), 0, 0, Math.PI * 2); }

  drawFx(c, f, now) {
    if (f.life < 0) return;
    const k = f.life / f.max;
    c.save();
    switch (f.t) {
      case 'ring': {
        c.globalAlpha = 1 - k; c.strokeStyle = f.color; c.lineWidth = f.width;
        this.ell(c, f.x, f.y, f.r0 + (f.r1 - f.r0) * Math.sqrt(k)); c.stroke();
        break;
      }
      case 'warn': {
        c.fillStyle = 'rgba(255,40,40,0.18)'; this.ell(c, f.x, f.y, f.r); c.fill();
        c.fillStyle = 'rgba(255,60,60,0.35)'; this.ell(c, f.x, f.y, f.r * k); c.fill();
        c.strokeStyle = '#ff4040'; c.lineWidth = 1; this.ell(c, f.x, f.y, f.r); c.stroke();
        break;
      }
      case 'magic': {
        const s = this.w2s(f.x, f.y);
        c.globalAlpha = k < 0.8 ? 1 : (1 - k) * 5;
        c.strokeStyle = f.color; c.lineWidth = 1;
        this.ell(c, f.x, f.y, f.r); c.stroke();
        this.ell(c, f.x, f.y, f.r * 0.72); c.stroke();
        const n = 8;
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2 + now * 1.5;
          c.fillStyle = f.color;
          c.fillRect(Math.round(s.x + Math.cos(a) * f.r * 19), Math.round(s.y + Math.sin(a) * f.r * 9.5), 2, 2);
        }
        c.globalAlpha *= 0.2; c.fillStyle = f.color; this.ell(c, f.x, f.y, f.r); c.fill();
        break;
      }
      case 'marker': {
        c.globalAlpha = 1 - k; c.strokeStyle = '#a8ff6a'; c.lineWidth = 1;
        this.ell(c, f.x, f.y, 0.5 * (1 - k * 0.6)); c.stroke();
        break;
      }
      case 'ghost': {
        const s = this.w2s(f.x, f.y);
        c.globalAlpha = (1 - k) * 0.5;
        const x = Math.round(s.x);
        if (f.flip) { c.translate(x, 0); c.scale(-1, 1); c.translate(-x, 0); }
        c.drawImage(f.sprite, x - 14, Math.round(s.y) - 34);
        break;
      }
      case 'line': {
        const a = this.w2s(f.x0, f.y0), b = this.w2s(f.x1, f.y1);
        c.globalAlpha = 1 - k;
        c.strokeStyle = '#7ec8ff'; c.lineWidth = 6 * (1 - k) + 1;
        c.beginPath(); c.moveTo(a.x, a.y - 14); c.lineTo(b.x, b.y - 14); c.stroke();
        c.strokeStyle = '#ffffff'; c.lineWidth = 2;
        c.beginPath(); c.moveTo(a.x, a.y - 14); c.lineTo(b.x, b.y - 14); c.stroke();
        break;
      }
      case 'p': {
        c.globalAlpha = 1 - k; c.fillStyle = f.color;
        c.fillRect(Math.round(f.sx + this.offX), Math.round(f.sy + this.offY), f.size, f.size);
        break;
      }
      case 'sp': {
        c.globalAlpha = k > 0.7 ? (1 - k) / 0.3 : 1;
        c.drawImage(f.img, Math.round(f.sx + this.offX - f.img.width / 2), Math.round(f.sy + this.offY - f.img.height / 2));
        break;
      }
      case 'proj': {
        const a = this.w2s(f.from.x, f.from.y), b = this.w2s(f.to.x, f.to.y);
        const x = a.x + (b.x - a.x) * k, y = a.y + (b.y - a.y) * k - 16 - Math.sin(k * Math.PI) * f.arc;
        c.translate(Math.round(x), Math.round(y));
        if (f.img === this.cone || f.img === this.paper) c.rotate(k * 12);
        c.drawImage(f.img, -Math.round(f.img.width / 2), -Math.round(f.img.height / 2));
        break;
      }
      case 'slash': {
        const s = this.w2s(f.x, f.y);
        c.globalAlpha = 1 - k; c.strokeStyle = f.color; c.lineWidth = 3 * (1 - k) + 1;
        c.beginPath();
        c.ellipse(s.x, s.y - 12, f.r, f.r * 0.6, f.ang, -1.2 + k * 1.5, 0.6 + k * 1.5);
        c.stroke();
        break;
      }
      case 'column': {
        const s = this.w2s(f.x, f.y);
        const h = 70;
        c.globalAlpha = (1 - k) * 0.6;
        const g = c.createLinearGradient(0, s.y - h, 0, s.y);
        g.addColorStop(0, 'rgba(255,230,120,0)'); g.addColorStop(1, 'rgba(255,220,90,1)');
        c.fillStyle = g; c.fillRect(Math.round(s.x - 10), Math.round(s.y - h), 20, h);
        break;
      }
      default: break;
    }
    c.restore();
  }

  // ---------- 오버레이 (선명한 텍스트) ----------
  drawOverlay(o, state, dt, now) {
    const sc = this.scale;
    const toO = (x, y) => { const s = this.w2s(x, y); return { x: s.x * sc, y: s.y * sc }; };
    o.textAlign = 'center';
    o.textBaseline = 'middle';
    o.lineJoin = 'round';
    const label = (text, x, y, color = '#ffffff', size = 12, weight = 'bold') => {
      o.font = `${weight} ${size}px "Malgun Gothic", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif`;
      o.lineWidth = 3; o.strokeStyle = 'rgba(30,22,60,0.9)';
      o.strokeText(text, x, y); o.fillStyle = color; o.fillText(text, x, y);
    };
    const bar = (x, y, w, ratio, color) => {
      o.fillStyle = 'rgba(30,22,60,0.85)'; o.fillRect(x - w / 2 - 1, y - 1, w + 2, 6);
      o.fillStyle = '#4a3a5a'; o.fillRect(x - w / 2, y, w, 4);
      o.fillStyle = color; o.fillRect(x - w / 2, y, Math.max(0, w * ratio), 4);
    };

    // NPC
    {
      const s = toO(NPC.x, NPC.y);
      label(NPC.name, s.x, s.y + 7 * sc, '#ffe58a', 12);
      const bob = Math.sin(now * 3) * 3 - 48 * sc + 96;
      o.fillStyle = '#ffffff'; o.strokeStyle = '#3a3a7a'; o.lineWidth = 2;
      o.beginPath(); o.roundRect(s.x - 16, s.y - 96 + bob, 32, 20, 8); o.fill(); o.stroke();
      o.fillStyle = '#3a3a7a';
      for (let i = 0; i < 3; i++) { o.beginPath(); o.arc(s.x - 8 + i * 8, s.y - 86 + bob, 2.4, 0, Math.PI * 2); o.fill(); }
    }

    // 몬스터 이름/체력
    for (const m of state.monsters.values()) {
      const def = MONSTERS[m.kind];
      const show = m.hp < m.mh || state.targetId === m.id || (state.hover && state.hover.id === m.id) || def.boss;
      if (!show) continue;
      const s = toO(m.rx, m.ry);
      const top = s.y - (def.boss ? 50 : 28) * sc;
      label(`Lv${def.lv} ${def.name}`, s.x, top - 8, def.boss ? '#ff9a9a' : '#ffffff', def.boss ? 13 : 11);
      bar(s.x, top, def.boss ? 80 : 40, m.hp / m.mh, '#ff5a6a');
    }

    // 플레이어 이름/체력/말풍선/감정
    for (const p of state.players.values()) {
      const s = toO(p.rx, p.ry);
      const mine = p.id === state.myId;
      label(`Lv${p.lv} ${p.name}`, s.x, s.y + 7 * sc, mine ? '#fff27a' : '#ffffff', 12);
      label(CLASSES[p.cls].name, s.x, s.y + 7 * sc + 14, CLASSES[p.cls].color === '#6a5bd6' ? '#b8b0ff' : lighten(CLASSES[p.cls].color), 10, 'normal');
      if (!p.dead) bar(s.x, s.y - 39 * sc, 36, p.hp / p.mh, '#5ae07a');
      if (p.chat && now < p.chat.until) this.bubble(o, p.chat.text, s.x, s.y - 46 * sc);
      if (p.emote && now < p.emote.until) {
        const k = Math.min(1, (now - p.emote.start) * 6);
        o.font = `${Math.round(22 * k)}px "Segoe UI Emoji", "Apple Color Emoji", sans-serif`;
        o.fillText(EMOTES[p.emote.n], s.x + 11 * sc, s.y - 41 * sc - Math.sin(now * 6) * 2);
      }
    }

    // 떠오르는 숫자
    this.texts = this.texts.filter((t) => (t.life += dt) < t.max);
    for (const t of this.texts) {
      const s = toO(t.x, t.y);
      const k = t.life / t.max;
      const pop = t.life < 0.1 ? 1 + (0.1 - t.life) * 5 : 1;
      o.globalAlpha = k > 0.6 ? (1 - k) / 0.4 : 1;
      label(t.text, s.x + t.dx * 60, s.y - 30 * sc - k * 18 * sc, t.color, Math.round((t.big ? 22 : 16) * pop), '900');
      o.globalAlpha = 1;
    }
  }

  bubble(o, text, x, y) {
    o.font = '13px "Malgun Gothic", "Apple SD Gothic Neo", sans-serif';
    const lines = wrap(o, text, 170);
    const w = Math.max(...lines.map((l) => o.measureText(l).width)) + 18;
    const h = lines.length * 17 + 10;
    const bx = x - w / 2, by = y - h;
    o.fillStyle = 'rgba(255,255,255,0.96)'; o.strokeStyle = '#5a5aa8'; o.lineWidth = 2;
    o.beginPath(); o.roundRect(bx, by, w, h, 8); o.fill(); o.stroke();
    o.beginPath(); o.moveTo(x - 6, y - 1); o.lineTo(x, y + 7); o.lineTo(x + 6, y - 1); o.closePath(); o.fill();
    o.fillStyle = '#2a2350';
    lines.forEach((l, i) => o.fillText(l, x, by + 13 + i * 17));
  }
}

function wrap(o, text, maxW) {
  const out = []; let cur = '';
  for (const ch of text) {
    if (o.measureText(cur + ch).width > maxW && cur) { out.push(cur); cur = ch; }
    else cur += ch;
  }
  if (cur) out.push(cur);
  return out.slice(0, 4);
}
function lighten(hex) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.min(255, Math.round(v + (255 - v) * 0.45));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}
