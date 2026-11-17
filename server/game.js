// 서버 권한형 게임 로직: 이동, 전투, 몬스터 AI, 스킬, 경험치, 퀘스트
import {
  CLASSES, SKILLS, COFFEE, MONSTERS, SPAWNS, QUEST, expNeed,
  buildMap, walkable, findPath, nearestWalkable, isTown, SPAWN_POINT, TOWN_MAX_X,
} from '../shared/data.js';

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const r2 = (v) => Math.round(v * 100) / 100;

export class Game {
  constructor() {
    this.map = buildMap();
    this.players = new Map();
    this.monsters = new Map();
    this.events = [];
    this.nextId = 1;
    this.time = 0;
    for (const sp of SPAWNS) for (let i = 0; i < sp.count; i++) this.spawnMonster(sp);
  }

  // ---------- 몬스터 ----------
  monsterWalkable(x, y) { return x >= TOWN_MAX_X + 1 && walkable(this.map, x, y); }

  randomSpawnPos(sp) {
    for (let tries = 0; tries < 60; tries++) {
      const x = Math.floor(rand(sp.x0, sp.x1 + 1)) + 0.5;
      const y = Math.floor(rand(sp.y0, sp.y1 + 1)) + 0.5;
      if (this.monsterWalkable(x, y)) return { x, y };
    }
    const p = nearestWalkable(this.map, sp.x0 + 0.5, sp.y0 + 0.5, 6);
    return p ? { x: p.x + 0.5, y: p.y + 0.5 } : { x: sp.x0 + 0.5, y: sp.y0 + 0.5 };
  }

  spawnMonster(sp) {
    const def = MONSTERS[sp.kind];
    const pos = this.randomSpawnPos(sp);
    const m = {
      id: this.nextId++, kind: sp.kind, def, sp,
      x: pos.x, y: pos.y, home: { ...pos },
      hp: def.hp, maxHp: def.hp, dead: false, respawnAt: 0,
      target: 0, returning: false, nextAtk: 0, stunUntil: 0,
      wander: null, nextWander: rand(1, 4), contributors: new Set(),
      slamAt: 0, nextSlam: 0, slamPos: null,
    };
    this.monsters.set(m.id, m);
    return m;
  }

  // ---------- 플레이어 ----------
  addPlayer(conn, name, cls) {
    const c = CLASSES[cls];
    const p = {
      id: this.nextId++, conn, name, cls,
      x: SPAWN_POINT.x + rand(-1, 1), y: SPAWN_POINT.y + rand(0, 1.5),
      path: [], target: 0, repathAt: 0, nextAtk: 0,
      lv: 1, exp: 0,
      maxHp: c.hp, maxMp: c.mp, hp: c.hp, mp: c.mp, atk: c.atk, def: c.def,
      dead: false, respawnAt: 0, skillReady: 0, coffeeReady: 0, defBuffUntil: 0,
      quest: { slime: 0, bug: 0, ghost: 0, golem: 0 }, questDone: false,
      lastChat: 0, lastMsg: this.time, regenAcc: 0,
    };
    if (!walkable(this.map, p.x, p.y)) { p.x = SPAWN_POINT.x; p.y = SPAWN_POINT.y; }
    this.players.set(p.id, p);
    this.events.push({ k: 'sys', text: `${name}님(${c.name})이 접속했습니다.` });
    return p;
  }

  removePlayer(id) {
    const p = this.players.get(id);
    if (!p) return;
    this.players.delete(id);
    for (const m of this.monsters.values()) {
      if (m.target === id) { m.target = 0; m.returning = true; }
      m.contributors.delete(id);
    }
    this.events.push({ k: 'sys', text: `${p.name}님이 퇴장했습니다.` });
  }

  handle(p, msg) {
    p.lastMsg = this.time;
    if (!msg || typeof msg !== 'object') return;
    const num = (v) => typeof v === 'number' && Number.isFinite(v);
    switch (msg.t) {
      case 'move':
        if (p.dead || !num(msg.x) || !num(msg.y)) return;
        p.target = 0;
        this.setPathTo(p, msg.x, msg.y);
        break;
      case 'attack': {
        if (p.dead) return;
        const m = this.monsters.get(msg.id);
        if (!m || m.dead) return;
        p.target = m.id; p.repathAt = 0;
        break;
      }
      case 'skill':
        if (!num(msg.x) || !num(msg.y)) return;
        this.useSkill(p, msg.x, msg.y);
        break;
      case 'coffee':
        this.useCoffee(p);
        break;
      case 'stop':
        p.path = []; p.target = 0;
        break;
      case 'chat': {
        if (typeof msg.text !== 'string') return;
        const text = msg.text.replace(/[\u0000-\u001f]/g, '').trim().slice(0, 60);
        if (!text || this.time - p.lastChat < 0.7) return;
        p.lastChat = this.time;
        this.events.push({ k: 'chat', id: p.id, name: p.name, text });
        break;
      }
      case 'emote':
        if (!Number.isInteger(msg.n) || msg.n < 0 || msg.n > 3) return;
        this.events.push({ k: 'emote', id: p.id, n: msg.n });
        break;
      default:
        break;
    }
  }

  setPathTo(p, x, y) {
    const goal = nearestWalkable(this.map, x, y, 3);
    if (!goal) { p.path = []; return false; }
    const path = findPath(this.map, p.x, p.y, goal.x, goal.y);
    if (!path) { p.path = []; return false; }
    // 마지막 지점은 클릭한 정확한 위치(같은 타일이면)로
    if (Math.floor(x) === goal.x && Math.floor(y) === goal.y && walkable(this.map, x, y)) {
      if (path.length) path[path.length - 1] = { x, y };
      else path.push({ x, y });
    }
    p.path = path;
    return true;
  }

  // ---------- 전투 ----------
  calcDamage(atk, mult, def) {
    const crit = Math.random() < 0.1;
    let d = atk * mult * rand(0.85, 1.15) * (crit ? 1.5 : 1) - def * 0.5;
    return { v: Math.max(1, Math.round(d)), crit };
  }

  hurtMonster(m, p, mult) {
    if (m.dead) return;
    const { v, crit } = this.calcDamage(p.atk, mult, m.def.def);
    m.hp -= v;
    m.contributors.add(p.id);
    if (!m.target) { m.target = p.id; m.returning = false; }
    this.events.push({ k: 'dmg', x: r2(m.x), y: r2(m.y), v, crit, t: 'm', id: m.id });
    if (m.hp <= 0) this.killMonster(m);
  }

  killMonster(m) {
    m.hp = 0; m.dead = true; m.target = 0; m.slamAt = 0;
    m.respawnAt = this.time + (m.def.boss ? 40 : rand(7, 11));
    this.events.push({ k: 'die', id: m.id, x: r2(m.x), y: r2(m.y), kind: m.kind });
    if (m.def.boss) this.events.push({ k: 'sys', text: `★ ${m.def.name}을(를) 쓰러뜨렸습니다! 모두 수고하셨어요!` });
    for (const pid of m.contributors) {
      const p = this.players.get(pid);
      if (!p || p.dead) continue;
      this.giveExp(p, m.def.exp);
      if (!p.questDone && p.quest[m.kind] < QUEST.goals[m.kind]) {
        p.quest[m.kind]++;
        const done = Object.keys(QUEST.goals).every((k) => p.quest[k] >= QUEST.goals[k]);
        if (done) {
          p.questDone = true;
          this.events.push({ k: 'quest', id: p.id, name: p.name });
          this.giveExp(p, QUEST.rewardExp);
        }
      }
    }
    m.contributors.clear();
  }

  giveExp(p, amount) {
    p.exp += amount;
    let up = false;
    while (p.exp >= expNeed(p.lv)) {
      p.exp -= expNeed(p.lv);
      p.lv++;
      p.maxHp += 12; p.maxMp += 6; p.atk += 2; p.def += 1;
      up = true;
    }
    if (up) {
      p.hp = p.maxHp; p.mp = p.maxMp;
      this.events.push({ k: 'lvl', id: p.id, lv: p.lv, name: p.name });
    }
  }

  hurtPlayer(p, m, mult) {
    if (p.dead) return;
    const def = p.def * (this.time < p.defBuffUntil ? 1.5 : 1);
    const { v, crit } = this.calcDamage(m.def.atk, mult, def);
    p.hp -= v;
    this.events.push({ k: 'dmg', x: r2(p.x), y: r2(p.y), v, crit, t: 'p', id: p.id });
    if (p.hp <= 0) {
      p.hp = 0; p.dead = true; p.path = []; p.target = 0;
      p.respawnAt = this.time + 5;
      this.events.push({ k: 'pdie', id: p.id, name: p.name });
      for (const mm of this.monsters.values()) if (mm.target === p.id) { mm.target = 0; mm.returning = true; }
    }
  }

  heal(p, amount) {
    if (p.dead) return;
    const v = Math.min(Math.round(amount), p.maxHp - p.hp);
    p.hp += v;
    if (v > 0) this.events.push({ k: 'heal', x: r2(p.x), y: r2(p.y), v, id: p.id });
  }

  useSkill(p, tx, ty) {
    if (p.dead) return;
    const sid = CLASSES[p.cls].skill;
    const sk = SKILLS[sid];
    if (this.time < p.skillReady) return;
    if (p.mp < sk.mp) { this.events.push({ k: 'nomp', id: p.id }); return; }
    p.mp -= sk.mp;
    p.skillReady = this.time + sk.cd;
    const alive = [...this.monsters.values()].filter((m) => !m.dead);

    if (sid === 'dash') {
      let dx = tx - p.x, dy = ty - p.y;
      const len = Math.hypot(dx, dy) || 1;
      dx /= len; dy /= len;
      const x0 = p.x, y0 = p.y;
      let x = p.x, y = p.y;
      for (let s = 0; s < sk.range; s += 0.1) {
        const nx = x + dx * 0.1, ny = y + dy * 0.1;
        if (!walkable(this.map, nx, ny)) break;
        x = nx; y = ny;
      }
      p.x = x; p.y = y; p.path = [];
      for (const m of alive) if (segDist(m, x0, y0, x, y) <= 1.0) this.hurtMonster(m, p, 2.2);
      this.events.push({ k: 'fx', s: 'dash', id: p.id, x0: r2(x0), y0: r2(y0), x: r2(x), y: r2(y) });
    } else if (sid === 'spin') {
      for (const m of alive) {
        if (dist(m, p) > 2.3) continue;
        this.hurtMonster(m, p, 1.8);
        if (!m.dead && !m.def.boss) {
          const d = dist(m, p) || 1;
          const nx = m.x + ((m.x - p.x) / d) * 0.8, ny = m.y + ((m.y - p.y) / d) * 0.8;
          if (this.monsterWalkable(nx, ny)) { m.x = nx; m.y = ny; }
        }
      }
      this.events.push({ k: 'fx', s: 'spin', id: p.id, x: r2(p.x), y: r2(p.y) });
    } else if (sid === 'heart' || sid === 'paper') {
      const c = clampRange(p, tx, ty, sk.range);
      const radius = sid === 'heart' ? 1.9 : 2.3;
      for (const m of alive) {
        if (dist(m, c) > radius) continue;
        this.hurtMonster(m, p, sid === 'heart' ? 1.5 : 2.0);
        if (sid === 'heart' && !m.dead) m.stunUntil = this.time + (m.def.boss ? 0.6 : 1.5);
      }
      if (sid === 'heart') {
        for (const q of this.players.values()) if (!q.dead && dist(q, c) <= radius) this.heal(q, q.maxHp * 0.15);
      }
      this.events.push({ k: 'fx', s: sid, id: p.id, x: r2(c.x), y: r2(c.y) });
    } else if (sid === 'aura') {
      for (const q of this.players.values()) {
        if (q.dead || dist(q, p) > 4) continue;
        this.heal(q, q.maxHp * 0.3);
        q.defBuffUntil = this.time + 6;
      }
      this.events.push({ k: 'fx', s: 'aura', id: p.id, x: r2(p.x), y: r2(p.y) });
    }
  }

  useCoffee(p) {
    if (p.dead || this.time < p.coffeeReady) return;
    p.coffeeReady = this.time + COFFEE.cd;
    this.heal(p, p.maxHp * 0.4);
    p.mp = Math.min(p.maxMp, p.mp + p.maxMp * 0.2);
    this.events.push({ k: 'fx', s: 'coffee', id: p.id, x: r2(p.x), y: r2(p.y) });
  }

  // ---------- 틱 ----------
  tick(dt) {
    this.time += dt;
    for (const p of this.players.values()) this.tickPlayer(p, dt);
    for (const m of this.monsters.values()) this.tickMonster(m, dt);
    this.separateMonsters();
    this.separatePlayers();
  }

  tickPlayer(p, dt) {
    if (p.dead) {
      if (this.time >= p.respawnAt) {
        p.dead = false; p.hp = p.maxHp; p.mp = p.maxMp;
        p.x = SPAWN_POINT.x + rand(-1, 1); p.y = SPAWN_POINT.y + rand(0, 1.5);
        if (!walkable(this.map, p.x, p.y)) { p.x = SPAWN_POINT.x; p.y = SPAWN_POINT.y; }
        this.events.push({ k: 'respawn', id: p.id });
      }
      return;
    }
    // 자연 회복 (마을에서는 3배)
    p.regenAcc += dt;
    if (p.regenAcc >= 1) {
      p.regenAcc -= 1;
      const k = isTown(p.x) ? 3 : 1;
      p.hp = Math.min(p.maxHp, p.hp + p.maxHp * 0.01 * k);
      p.mp = Math.min(p.maxMp, p.mp + p.maxMp * 0.02 * k);
    }
    const c = CLASSES[p.cls];
    if (p.target) {
      const m = this.monsters.get(p.target);
      if (!m || m.dead) { p.target = 0; p.path = []; }
      else {
        const d = dist(m, p);
        if (d <= c.range) {
          p.path = [];
          if (this.time >= p.nextAtk) {
            p.nextAtk = this.time + c.atkCd;
            this.events.push({ k: 'atk', id: p.id, tx: r2(m.x), ty: r2(m.y), cls: p.cls, ranged: c.ranged });
            this.hurtMonster(m, p, 1);
          }
        } else if (this.time >= p.repathAt) {
          p.repathAt = this.time + 0.4;
          if (!this.setPathTo(p, m.x, m.y)) p.target = 0;
        }
      }
    }
    this.followPath(p, c.speed * dt);
  }

  followPath(p, step) {
    while (step > 0 && p.path.length) {
      const n = p.path[0];
      const dx = n.x - p.x, dy = n.y - p.y;
      const d = Math.hypot(dx, dy);
      if (d <= step) { p.x = n.x; p.y = n.y; p.path.shift(); step -= d; }
      else { p.x += (dx / d) * step; p.y += (dy / d) * step; step = 0; }
    }
  }

  tickMonster(m, dt) {
    if (m.dead) {
      if (this.time >= m.respawnAt) {
        const pos = this.randomSpawnPos(m.sp);
        m.x = pos.x; m.y = pos.y; m.home = { ...pos };
        m.hp = m.maxHp; m.dead = false; m.target = 0; m.returning = false; m.stunUntil = 0;
        this.events.push({ k: 'spawn', id: m.id });
      }
      return;
    }
    const def = m.def;
    // 보스 내려찍기 처리
    if (m.slamAt && this.time >= m.slamAt) {
      m.slamAt = 0;
      for (const p of this.players.values()) if (!p.dead && dist(p, m.slamPos) <= 2.6) this.hurtPlayer(p, m, 1.6);
      this.events.push({ k: 'fx', s: 'slam', x: r2(m.slamPos.x), y: r2(m.slamPos.y) });
    }
    if (this.time < m.stunUntil) return;

    let target = m.target ? this.players.get(m.target) : null;
    if (target && (target.dead || isTown(target.x) || dist(m, m.home) > 10)) {
      m.target = 0; target = null; m.returning = true;
    }
    if (!target && !m.returning && def.aggro > 0) {
      let best = null, bd = def.aggro;
      for (const p of this.players.values()) {
        if (p.dead || isTown(p.x)) continue;
        const d = dist(p, m);
        if (d < bd) { bd = d; best = p; }
      }
      if (best) { m.target = best.id; target = best; }
    }
    const speed = def.speed * dt;
    if (target) {
      const d = dist(target, m);
      if (d > def.range - 0.1) this.moveMonster(m, target.x, target.y, speed);
      else if (this.time >= m.nextAtk) {
        m.nextAtk = this.time + def.atkCd;
        this.events.push({ k: 'matk', id: m.id, tx: r2(target.x), ty: r2(target.y), ranged: def.ranged });
        this.hurtPlayer(target, m, 1);
      }
      if (def.boss && !m.slamAt && this.time >= m.nextSlam) {
        m.nextSlam = this.time + 7;
        m.slamAt = this.time + 1.1;
        m.slamPos = { x: target.x, y: target.y };
        this.events.push({ k: 'warn', x: r2(target.x), y: r2(target.y), r: 2.6, dur: 1.1 });
      }
    } else if (m.returning) {
      if (dist(m, m.home) < 0.3) { m.returning = false; m.hp = m.maxHp; m.contributors.clear(); }
      else if (!this.moveMonster(m, m.home.x, m.home.y, speed * 1.5)) {
        // 막혔으면 집으로 순간이동
        m.x = m.home.x; m.y = m.home.y;
      }
    } else {
      // 배회
      m.nextWander -= dt;
      if (m.wander) {
        if (dist(m, m.wander) < 0.15 || !this.moveMonster(m, m.wander.x, m.wander.y, speed * 0.5)) m.wander = null;
      } else if (m.nextWander <= 0) {
        m.nextWander = rand(2, 5);
        const wx = m.home.x + rand(-2.5, 2.5), wy = m.home.y + rand(-2.5, 2.5);
        if (this.monsterWalkable(wx, wy)) m.wander = { x: wx, y: wy };
      }
    }
  }

  moveMonster(m, tx, ty, step) {
    const dx = tx - m.x, dy = ty - m.y;
    const d = Math.hypot(dx, dy);
    if (d < 0.01) return true;
    const s = Math.min(step, d);
    const nx = m.x + (dx / d) * s, ny = m.y + (dy / d) * s;
    if (this.monsterWalkable(nx, ny)) { m.x = nx; m.y = ny; return true; }
    if (this.monsterWalkable(nx, m.y)) { m.x = nx; return true; }
    if (this.monsterWalkable(m.x, ny)) { m.y = ny; return true; }
    return false;
  }

  separateMonsters() {
    const arr = [...this.monsters.values()].filter((m) => !m.dead);
    for (let i = 0; i < arr.length; i++)
      for (let j = i + 1; j < arr.length; j++) {
        const a = arr[i], b = arr[j];
        const minD = a.def.boss || b.def.boss ? 1.2 : 0.6;
        const dx = b.x - a.x, dy = b.y - a.y;
        const d = Math.hypot(dx, dy);
        if (d >= minD || d < 1e-4) continue;
        const push = (minD - d) * 0.25;
        const ux = dx / d, uy = dy / d;
        if (this.monsterWalkable(a.x - ux * push, a.y - uy * push)) { a.x -= ux * push; a.y -= uy * push; }
        if (this.monsterWalkable(b.x + ux * push, b.y + uy * push)) { b.x += ux * push; b.y += uy * push; }
      }
  }

  separatePlayers() {
    const arr = [...this.players.values()].filter((p) => !p.dead && !p.path.length);
    for (let i = 0; i < arr.length; i++)
      for (let j = i + 1; j < arr.length; j++) {
        const a = arr[i], b = arr[j];
        let dx = b.x - a.x, dy = b.y - a.y;
        let d = Math.hypot(dx, dy);
        if (d >= 0.5) continue;
        if (d < 1e-3) { dx = Math.random() - 0.5; dy = Math.random() - 0.5; d = Math.hypot(dx, dy) || 1; }
        const push = Math.min(0.03, (0.5 - d) * 0.5);
        const ux = dx / d, uy = dy / d;
        if (walkable(this.map, a.x - ux * push, a.y - uy * push)) { a.x -= ux * push; a.y -= uy * push; }
        if (walkable(this.map, b.x + ux * push, b.y + uy * push)) { b.x += ux * push; b.y += uy * push; }
      }
  }

  // ---------- 전송 ----------
  snapshotBase() {
    const p = [];
    for (const q of this.players.values()) {
      p.push({
        i: q.id, n: q.name, c: q.cls, x: r2(q.x), y: r2(q.y),
        hp: Math.round(q.hp), mh: q.maxHp, lv: q.lv, d: q.dead ? 1 : 0,
        b: this.time < q.defBuffUntil ? 1 : 0, mv: q.path.length ? 1 : 0,
      });
    }
    const m = [];
    for (const q of this.monsters.values()) {
      if (q.dead) continue;
      m.push({
        i: q.id, k: q.kind, x: r2(q.x), y: r2(q.y), hp: Math.max(0, Math.round(q.hp)), mh: q.maxHp,
        st: this.time < q.stunUntil ? 1 : 0, tg: q.target ? 1 : 0,
      });
    }
    const ev = this.events;
    this.events = [];
    return { p, m, ev };
  }

  meFor(q) {
    return {
      id: q.id, lv: q.lv, exp: q.exp, need: expNeed(q.lv), hp: Math.round(q.hp), mh: q.maxHp,
      mp: Math.round(q.mp), mm: q.maxMp, atk: q.atk, def: q.def,
      sk: r2(Math.max(0, q.skillReady - this.time)), cf: r2(Math.max(0, q.coffeeReady - this.time)),
      q: q.quest, qd: q.questDone, d: q.dead ? 1 : 0, rs: q.dead ? r2(Math.max(0, q.respawnAt - this.time)) : 0,
      tg: q.target,
    };
  }
}

function clampRange(p, x, y, range) {
  const dx = x - p.x, dy = y - p.y;
  const d = Math.hypot(dx, dy);
  if (d <= range) return { x, y };
  return { x: p.x + (dx / d) * range, y: p.y + (dy / d) * range };
}

function segDist(pt, x0, y0, x1, y1) {
  const vx = x1 - x0, vy = y1 - y0;
  const l2 = vx * vx + vy * vy;
  let t = l2 ? ((pt.x - x0) * vx + (pt.y - y0) * vy) / l2 : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(pt.x - (x0 + vx * t), pt.y - (y0 + vy * t));
}
