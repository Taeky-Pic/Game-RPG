// 클라이언트 진입점: 접속, 입력, 상태 동기화, HUD
import {
  buildMap, CLASSES, CLASS_IDS, SKILLS, COFFEE, MONSTERS, QUEST, NPC, MAP_W, MAP_H, T, toScreen, isTown,
} from '/shared/data.js';
import { Renderer } from './render.js';

const $ = (id) => document.getElementById(id);
const map = buildMap();
const canvas = $('game');
const R = new Renderer(canvas, map);

const state = {
  myId: 0, players: new Map(), monsters: new Map(), dying: [],
  me: null, hover: null, targetId: 0, cls: null,
};
let ws = null;
let mouse = { x: innerWidth / 2, y: innerHeight / 2, down: false, lastSend: 0 };
let pendingTalk = false;
let zone = '';

const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* 무시 */ } },
};

// ================= 로그인 화면 =================
let selCls = CLASS_IDS.includes(store.get('hbc_cls')) ? store.get('hbc_cls') : 'gongmu';
$('nameInput').value = store.get('hbc_name') || '';
function renderCards() {
  const wrap = $('cards');
  wrap.innerHTML = '';
  for (const id of CLASS_IDS) {
    const c = CLASSES[id];
    const el = document.createElement('div');
    el.className = 'card' + (id === selCls ? ' sel' : '');
    el.style.setProperty('--c', c.color);
    el.innerHTML = `<div class="ctab" style="background:${c.color}"></div><div class="cimg" style="background-image:url(/assets/card_${id}.png)"></div><div class="crole"></div>`;
    el.querySelector('.ctab').textContent = c.name;
    el.querySelector('.crole').textContent = c.role;
    el.onclick = () => { selCls = id; renderCards(); };
    wrap.appendChild(el);
  }
  const c = CLASSES[selCls], sk = SKILLS[c.skill];
  $('classInfo').innerHTML = '';
  const add = (html) => { const d = document.createElement('div'); d.innerHTML = html; $('classInfo').appendChild(d); return d; };
  add(`<b></b> — <span></span>`).querySelector('b').textContent = c.name;
  $('classInfo').lastChild.querySelector('span').textContent = c.desc;
  const d2 = add(`스킬 <b></b> : <span></span> &nbsp;(MP <i></i>, 쿨타임 <i></i>초)`);
  d2.querySelector('b').textContent = `${sk.icon} ${sk.name}`;
  d2.querySelector('span').textContent = sk.desc;
  d2.querySelectorAll('i')[0].textContent = sk.mp;
  d2.querySelectorAll('i')[1].textContent = sk.cd;
  const d3 = add(`HP <i></i> · MP <i></i> · 공격 <i></i> · 방어 <i></i> · 사거리 <i></i>`);
  [c.hp, c.mp, c.atk, c.def, c.ranged ? '원거리' : '근접'].forEach((v, i) => (d3.querySelectorAll('i')[i].textContent = v));
}
renderCards();

$('joinBtn').onclick = join;
$('nameInput').addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.isComposing) join(); });

function join() {
  const name = $('nameInput').value.trim();
  if (!name) { $('loginErr').textContent = '이름을 입력해 주세요.'; return; }
  store.set('hbc_name', name); store.set('hbc_cls', selCls);
  $('joinBtn').disabled = true;
  $('loginErr').textContent = '';
  connect(name, selCls);
}

// ================= 네트워크 =================
function connect(name, cls) {
  const url = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`;
  ws = new WebSocket(url);
  let welcomed = false;
  ws.onopen = () => send({ t: 'join', name, cls });
  ws.onmessage = (e) => {
    let msg;
    try { msg = JSON.parse(e.data); } catch { return; }
    if (msg.t === 'welcome') {
      welcomed = true;
      state.myId = msg.id; state.cls = cls;
      $('login').classList.add('hidden');
      $('hud').classList.remove('hidden');
      setupHud(name, cls);
      openDialog(true);
    } else if (msg.t === 'err') {
      $('loginErr').textContent = msg.text;
      $('joinBtn').disabled = false;
      ws.close();
    } else if (msg.t === 's') applySnapshot(msg);
  };
  ws.onclose = () => {
    if (welcomed) $('disconnected').classList.remove('hidden');
    else { $('joinBtn').disabled = false; if (!$('loginErr').textContent) $('loginErr').textContent = '서버에 접속할 수 없습니다.'; }
  };
}
function send(o) { if (ws && ws.readyState === 1) ws.send(JSON.stringify(o)); }
setInterval(() => send({ t: 'ping' }), 5000);

// ================= 스냅샷 적용 =================
function applySnapshot(msg) {
  const now = performance.now() / 1000;
  const seenP = new Set();
  for (const d of msg.p) {
    seenP.add(d.i);
    let p = state.players.get(d.i);
    if (!p) {
      p = { id: d.i, rx: d.x, ry: d.y, flip: false, back: false, hitUntil: 0, attackUntil: 0, chat: null, emote: null, moving: false };
      state.players.set(d.i, p);
    }
    Object.assign(p, { name: d.n, cls: d.c, x: d.x, y: d.y, hp: d.hp, mh: d.mh, lv: d.lv, dead: !!d.d, buff: !!d.b });
  }
  for (const id of [...state.players.keys()]) if (!seenP.has(id)) state.players.delete(id);

  const seenM = new Set();
  for (const d of msg.m) {
    seenM.add(d.i);
    let m = state.monsters.get(d.i);
    if (!m) {
      m = { id: d.i, rx: d.x, ry: d.y, flip: false, hitUntil: 0, attackUntil: 0, moving: false };
      state.monsters.set(d.i, m);
    }
    Object.assign(m, { kind: d.k, x: d.x, y: d.y, hp: d.hp, mh: d.mh, st: !!d.st });
  }
  for (const id of [...state.monsters.keys()]) if (!seenM.has(id)) state.monsters.delete(id);

  for (const ev of msg.ev) handleEvent(ev, now);

  state.me = msg.me;
  state.targetId = msg.me.tg || 0;
  if (state.targetId && !state.monsters.has(state.targetId)) state.targetId = 0;
  updateHud();
}

// 직업 카드 이미지에서 얼굴 중심 좌표 (원본 px)
const FACE_POS = { gongmu: [62, 95], maint: [72, 95], hr: [78, 110], finance: [72, 95], ehs: [72, 100] };
const PROJ = { hr: () => R.heart, finance: () => R.paper, ehs: () => R.cone };

function handleEvent(ev, now) {
  const isMe = ev.id === state.myId;
  switch (ev.k) {
    case 'dmg': {
      if (ev.t === 'm') {
        const m = state.monsters.get(ev.id);
        if (m) m.hitUntil = now + 0.12;
        R.addText(ev.x, ev.y, String(ev.v), ev.crit ? '#ffd84a' : '#ffffff', ev.crit);
        R.burst(ev.x, ev.y, ev.crit ? '#ffd84a' : '#ffffff', ev.crit ? 10 : 5, 50, 12, 2, 0.35);
      } else {
        const p = state.players.get(ev.id);
        if (p) p.hitUntil = now + 0.12;
        R.addText(ev.x, ev.y, String(ev.v), '#ff6a7a', ev.crit);
        if (isMe) R.shake = 0.15;
      }
      break;
    }
    case 'heal':
      R.addText(ev.x, ev.y, '+' + ev.v, '#7cff8a');
      break;
    case 'atk': {
      const p = state.players.get(ev.id);
      if (!p) break;
      p.attackUntil = now + 0.25;
      faceToward(p, ev.tx, ev.ty);
      if (ev.ranged && PROJ[ev.cls]) R.projectile({ x: p.rx, y: p.ry }, { x: ev.tx, y: ev.ty }, PROJ[ev.cls](), 0.22, 8);
      else {
        const a = toScreen(p.rx, p.ry), b = toScreen(ev.tx, ev.ty);
        R.slash(ev.tx, ev.ty, Math.atan2(b.sy - a.sy, b.sx - a.sx), ev.cls === 'maint' ? '#c8d8ff' : '#9ad0ff');
      }
      break;
    }
    case 'matk': {
      const m = state.monsters.get(ev.id);
      if (!m) break;
      m.attackUntil = now + 0.25;
      faceToward(m, ev.tx, ev.ty);
      if (ev.ranged) R.projectile({ x: m.rx, y: m.ry }, { x: ev.tx, y: ev.ty }, R.stamp, 0.3, 12);
      break;
    }
    case 'die': {
      const m = state.monsters.get(ev.id);
      if (!document.hidden) state.dying.push({ kind: ev.kind, rx: m ? m.rx : ev.x, ry: m ? m.ry : ev.y, life: 0, max: 0.5 });
      R.burst(ev.x, ev.y, '#e8e4ff', 14, 60, 10, 3, 0.6);
      if (state.targetId === ev.id) state.targetId = 0;
      break;
    }
    case 'fx': skillFx(ev); break;
    case 'warn': R.warn(ev.x, ev.y, ev.r, ev.dur); break;
    case 'lvl': {
      const p = state.players.get(ev.id);
      if (p) R.column(p.rx, p.ry);
      if (p) R.addText(p.rx, p.ry, 'LEVEL UP!', '#ffe04a', true);
      if (isMe) toast(`레벨 업! Lv${ev.lv} 달성`, true);
      log(`★ ${ev.name}님이 Lv${ev.lv}이 되었습니다!`, 'sys');
      break;
    }
    case 'quest':
      if (isMe) toast(`퀘스트 완료! "${QUEST.title}" (보상 EXP ${QUEST.rewardExp})`, true);
      log(`★ ${ev.name}님이 "${QUEST.title}"를 완료했습니다!`, 'sys');
      break;
    case 'chat': {
      const p = state.players.get(ev.id);
      if (p) p.chat = { text: ev.text, until: now + 4.5 };
      log(ev.text, isMe ? 'me' : '', ev.name);
      break;
    }
    case 'emote': {
      const p = state.players.get(ev.id);
      if (p) p.emote = { n: ev.n, start: now, until: now + 2.2 };
      break;
    }
    case 'sys': log(ev.text, 'sys'); break;
    case 'pdie':
      log(`${ev.name}님이 쓰러졌습니다.`, 'sys');
      break;
    case 'respawn': {
      const p = state.players.get(ev.id);
      if (p) { p.rx = p.x; p.ry = p.y; R.ring(p.x, p.y, 0.2, 1.2, '#ffffff', 0.6); }
      break;
    }
    case 'spawn': {
      const m = state.monsters.get(ev.id);
      if (m) R.burst(m.x, m.y, '#c8b8ff', 8, 30, 4, 2, 0.5);
      break;
    }
    case 'nomp':
      if (isMe) { toast('MP가 부족합니다'); $('slotSkill').classList.remove('nomp'); void $('slotSkill').offsetWidth; $('slotSkill').classList.add('nomp'); }
      break;
    default: break;
  }
}

function skillFx(ev) {
  const p = state.players.get(ev.id);
  switch (ev.s) {
    case 'dash': {
      if (p) {
        faceToward(p, ev.x, ev.y);
        const sp = R.chars[p.cls];
        R.trail(p, ev.x0, ev.y0, ev.x, ev.y, (p.back ? sp.back : sp.front)[6]);
        p.attackUntil = performance.now() / 1000 + 0.3;
      }
      R.ring(ev.x, ev.y, 0.3, 1.4, '#7ec8ff', 0.4, 2);
      for (let i = 0; i < 10; i++) R.burst(ev.x0 + (ev.x - ev.x0) * (i / 10), ev.y0 + (ev.y - ev.y0) * (i / 10), i % 2 ? '#7ec8ff' : '#ffffff', 2, 40, 12, 2, 0.4);
      break;
    }
    case 'spin':
      if (p) p.attackUntil = performance.now() / 1000 + 0.35;
      R.ring(ev.x, ev.y, 0.4, 2.3, '#7ec8ff', 0.45, 3, false);
      R.ring(ev.x, ev.y, 0.2, 1.8, '#ffffff', 0.35, 2, false);
      R.burst(ev.x, ev.y, '#a8d8ff', 18, 90, 10, 2, 0.5);
      break;
    case 'heart':
      if (p) { p.attackUntil = performance.now() / 1000 + 0.3; faceToward(p, ev.x, ev.y); }
      R.ring(ev.x, ev.y, 0.3, 1.9, '#ff7ab8', 0.5, 2);
      for (let i = 0; i < 9; i++) {
        const a = Math.random() * Math.PI * 2, r = Math.random() * 1.5;
        R.spriteParticle(ev.x + Math.cos(a) * r, ev.y + Math.sin(a) * r, R.heart, { oy: -60, vy: 150, max: 0.55, delay: i * 0.03 });
      }
      R.burst(ev.x, ev.y, '#ff9ad0', 14, 70, 6, 2, 0.6);
      break;
    case 'paper':
      if (p) { p.attackUntil = performance.now() / 1000 + 0.3; faceToward(p, ev.x, ev.y); }
      R.magic(ev.x, ev.y, 2.3, '#b89aff', 0.9);
      for (let i = 0; i < 14; i++) {
        const a = Math.random() * Math.PI * 2, r = Math.random() * 2;
        R.spriteParticle(ev.x + Math.cos(a) * r, ev.y + Math.sin(a) * r, R.paper, { oy: -10, vx: (Math.random() - 0.5) * 50, vy: -60 - Math.random() * 40, g: 60, max: 0.8, delay: i * 0.02 });
      }
      break;
    case 'aura':
      R.ring(ev.x, ev.y, 0.5, 4, '#7cff6a', 0.6, 2);
      R.magic(ev.x, ev.y, 1.2, '#7cff6a', 0.8);
      for (let i = 0; i < 12; i++) {
        const a = Math.random() * Math.PI * 2, r = Math.random() * 3;
        R.spriteParticle(ev.x + Math.cos(a) * r, ev.y + Math.sin(a) * r, R.cross, { oy: -6, vy: -40, max: 0.9, delay: i * 0.04 });
      }
      break;
    case 'coffee':
      R.burst(ev.x, ev.y, '#f4e4d0', 8, 20, 30, 2, 0.8);
      R.ring(ev.x, ev.y, 0.2, 0.8, '#c08048', 0.5, 2);
      break;
    case 'slam':
      R.ring(ev.x, ev.y, 0.5, 2.8, '#ffb070', 0.5, 3);
      R.burst(ev.x, ev.y, '#c09a66', 24, 110, 4, 3, 0.6);
      R.shake = 0.3;
      break;
    default: break;
  }
}

function faceToward(e, tx, ty) {
  const a = toScreen(e.rx, e.ry), b = toScreen(tx, ty);
  const dx = b.sx - a.sx, dy = b.sy - a.sy;
  if (Math.abs(dx) > 0.5) e.flip = dx > 0;
  if (Math.abs(dy) > 0.5) e.back = dy < 0;
}

// ================= HUD =================
function setupHud(name, cls) {
  const c = CLASSES[cls], sk = SKILLS[c.skill];
  $('stName').textContent = name;
  $('stClass').textContent = c.name;
  $('stClass').style.background = c.color;
  $('stFace').style.backgroundImage = `url(/assets/card_${cls}.png)`;
  const [fx, fy] = FACE_POS[cls];
  $('stFace').style.backgroundPosition = `${-(fx * 1.2 - 30)}px ${-(fy * 1.2 - 30)}px`;
  $('skillIcon').textContent = sk.icon;
  $('skillName').textContent = sk.name;
  $('slotSkill').title = `${sk.name}: ${sk.desc} (MP ${sk.mp})`;
  $('slotCoffee').title = `${COFFEE.name}: ${COFFEE.desc}`;
}

let lastQuestKey = '';
function updateHud() {
  const me = state.me;
  if (!me) return;
  $('stLv').textContent = `Lv${me.lv}`;
  $('hpBar').style.width = `${(me.hp / me.mh) * 100}%`;
  $('mpBar').style.width = `${(me.mp / me.mm) * 100}%`;
  $('expBar').style.width = `${Math.min(100, (me.exp / me.need) * 100)}%`;
  $('hpTxt').textContent = `${me.hp} / ${me.mh}`;
  $('mpTxt').textContent = `${me.mp} / ${me.mm}`;
  $('expTxt').textContent = `EXP ${me.exp} / ${me.need}`;
  $('online').textContent = `접속 중 ${state.players.size}명 · 공격 ${me.atk} · 방어 ${me.def}`;
  const sk = SKILLS[CLASSES[state.cls].skill];
  setCd($('slotSkill'), me.sk, sk.cd);
  setCd($('slotCoffee'), me.cf, COFFEE.cd);
  $('slotSkill').style.opacity = me.mp < sk.mp ? 0.6 : 1;
  $('dead').classList.toggle('hidden', !me.d);
  if (me.d) $('deadTxt').textContent = `${Math.ceil(me.rs)}초 후 본사 앞에서 부활합니다`;
  const qk = JSON.stringify(me.q) + me.qd;
  if (qk !== lastQuestKey) {
    lastQuestKey = qk;
    const ul = $('questList');
    ul.innerHTML = '';
    for (const [k, goal] of Object.entries(QUEST.goals)) {
      const li = document.createElement('li');
      const n = Math.min(goal, me.q[k] || 0);
      if (n >= goal) li.className = 'done';
      const a = document.createElement('span'); a.textContent = MONSTERS[k].name;
      const b = document.createElement('span'); b.textContent = `${n} / ${goal}`;
      li.append(a, b);
      ul.appendChild(li);
    }
    if (me.qd) { const li = document.createElement('li'); li.className = 'done'; li.textContent = '완료! 박선임에게 보고하기'; ul.appendChild(li); }
  }
}
function setCd(el, remain, total) {
  const cd = el.querySelector('.cd'), t = el.querySelector('.cdtxt');
  cd.style.height = remain > 0 ? `${(remain / total) * 100}%` : '0';
  t.textContent = remain > 0 ? Math.ceil(remain) : '';
  if (el.dataset.prev > 0 && remain === 0) { el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); }
  el.dataset.prev = remain;
}

function log(text, cls = '', name = '') {
  const box = $('chatLog');
  const d = document.createElement('div');
  if (cls) d.className = cls;
  if (name) { const b = document.createElement('b'); b.textContent = name + ': '; d.appendChild(b); }
  d.appendChild(document.createTextNode(text));
  box.appendChild(d);
  while (box.children.length > 80) box.firstChild.remove();
  box.scrollTop = box.scrollHeight;
}
function toast(text, gold = false) {
  const d = document.createElement('div');
  d.className = 'toast' + (gold ? ' gold' : '');
  d.textContent = text;
  $('toasts').appendChild(d);
  setTimeout(() => d.remove(), 2700);
}
let bannerTimer = 0;
function banner(text) {
  const b = $('banner');
  b.textContent = text;
  b.classList.add('show');
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => b.classList.remove('show'), 2200);
}

// ================= NPC 대화 =================
const dlg = { lines: [], i: 0, shown: 0, open: false };
function openDialog(intro = false) {
  const done = state.me && state.me.qd;
  dlg.lines = done
    ? ['역시 우리 HBC 크루! 덕분에 오늘은 정시 퇴근이에요!', '...라고 말하고 싶지만, 몬스터들이 또 생겨나고 있네요.\n계속 부탁해요!']
    : [
      '이번에도 일이 생겼군요...\n다 같이 가볼까요?',
      "동쪽 사냥터에 '야근 슬라임', '버그 벌레',\n'결재 지연 유령'이 대량 발생했어요!",
      "가장 깊은 곳엔 '마감 골렘'까지 나타났다는 소문이...\n동료들과 함께 처리해 주세요!",
      intro ? '(땅을 클릭해 이동, 몬스터를 클릭해 공격!\n우클릭이나 1번 키로 부서 스킬을 쓸 수 있어요.)' : '조심해서 다녀오세요. 마을로 돌아오면 금방 회복돼요!',
    ];
  dlg.i = 0; dlg.shown = 0; dlg.open = true;
  $('dialog').classList.remove('hidden');
}
function advanceDialog() {
  const line = dlg.lines[dlg.i];
  if (dlg.shown < line.length) { dlg.shown = line.length; return; }
  dlg.i++; dlg.shown = 0;
  if (dlg.i >= dlg.lines.length) closeDialog();
}
function closeDialog() { dlg.open = false; $('dialog').classList.add('hidden'); }
$('dialog').addEventListener('mousedown', (e) => { e.stopPropagation(); advanceDialog(); });

// ================= 입력 =================
function worldAtMouse() { return R.screenToWorld(mouse.x, mouse.y); }
function moveToMouse(showMarker) {
  const w = worldAtMouse();
  send({ t: 'move', x: w.x, y: w.y });
  if (showMarker) R.marker(w.x, w.y);
}
function castSkill() {
  const me = state.players.get(state.myId);
  if (!me || me.dead) return;
  const w = worldAtMouse();
  faceToward(me, w.x, w.y);
  send({ t: 'skill', x: w.x, y: w.y });
}

canvas.addEventListener('contextmenu', (e) => e.preventDefault());
canvas.addEventListener('mousemove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; });
canvas.addEventListener('mousedown', (e) => {
  mouse.x = e.clientX; mouse.y = e.clientY;
  if (!state.myId) return;
  if (document.activeElement === $('chatInput')) $('chatInput').blur();
  if (e.button === 2) { castSkill(); return; }
  if (e.button !== 0) return;
  if (dlg.open) { closeDialog(); }
  const hit = R.pick(state, mouse.x, mouse.y);
  pendingTalk = false;
  if (hit && hit.type === 'monster') {
    send({ t: 'attack', id: hit.id });
    state.targetId = hit.id;
    return;
  }
  if (hit && hit.type === 'npc') {
    pendingTalk = true;
    send({ t: 'move', x: NPC.x, y: NPC.y + 1 });
    return;
  }
  mouse.down = true;
  mouse.lastSend = performance.now();
  moveToMouse(true);
});
addEventListener('mouseup', (e) => { if (e.button === 0) mouse.down = false; });
addEventListener('blur', () => { mouse.down = false; });

addEventListener('keydown', (e) => {
  if (!state.myId) return;
  const chat = $('chatInput');
  if (document.activeElement === chat) {
    if (e.key === 'Enter' && !e.isComposing) {
      const t = chat.value.trim();
      if (t) send({ t: 'chat', text: t });
      chat.value = '';
      chat.blur();
    } else if (e.key === 'Escape') chat.blur();
    return;
  }
  if (e.repeat && e.code !== 'Digit1') return;
  switch (e.code) {
    case 'Enter': case 'NumpadEnter': e.preventDefault(); chat.focus(); break;
    case 'Digit1': case 'Numpad1': castSkill(); break;
    case 'KeyF': send({ t: 'coffee' }); break;
    case 'Digit5': case 'Digit6': case 'Digit7': case 'Digit8': send({ t: 'emote', n: Number(e.code.slice(-1)) - 5 }); break;
    case 'Space': e.preventDefault(); if (dlg.open) advanceDialog(); break;
    case 'Escape': closeDialog(); $('help').classList.add('hidden'); break;
    case 'KeyH': $('help').classList.toggle('hidden'); break;
    case 'KeyS': send({ t: 'stop' }); break;
    default: break;
  }
});
$('help').addEventListener('mousedown', () => $('help').classList.add('hidden'));
$('slotSkill').addEventListener('mousedown', (e) => { e.stopPropagation(); castSkill(); });
$('slotCoffee').addEventListener('mousedown', (e) => { e.stopPropagation(); send({ t: 'coffee' }); });
document.querySelectorAll('[data-emote]').forEach((el) => el.addEventListener('mousedown', (e) => { e.stopPropagation(); send({ t: 'emote', n: Number(el.dataset.emote) }); }));

// ================= 미니맵 =================
const mini = $('minimap');
const mctx = mini.getContext('2d');
const MS = mini.width / (MAP_W + MAP_H);
const miniBase = document.createElement('canvas');
miniBase.width = mini.width; miniBase.height = mini.height;
{
  const c = miniBase.getContext('2d');
  const col = { [T.GRASS]: '#86c95e', [T.FIELD]: '#5f9e4c', [T.STONE]: '#d8d2ea', [T.WATER]: '#5aa6e0', [T.BUILDING]: '#e8c870', [T.HEDGE]: '#2f5f2c', [T.FENCE]: '#a07040', [T.DIRT]: '#c09a66', [T.POND]: '#5aa6e0' };
  c.fillStyle = '#1e3a20'; c.fillRect(0, 0, mini.width, mini.height);
  for (let y = 0; y < MAP_H; y++)
    for (let x = 0; x < MAP_W; x++) {
      const t = map.tiles[y * MAP_W + x];
      c.fillStyle = map.block[y * MAP_W + x] && t !== T.BUILDING && t !== T.WATER && t !== T.POND && t !== T.FENCE ? '#3c7a38' : col[t];
      const p = miniPos(x + 0.5, y + 0.5);
      c.fillRect(Math.floor(p.x - MS), Math.floor(p.y - MS / 2), Math.ceil(MS * 2), Math.ceil(MS) + 1);
    }
}
function miniPos(x, y) { return { x: (x - y + MAP_H) * MS, y: (x + y) * MS / 2 + 4 }; }
function drawMini(now) {
  mctx.drawImage(miniBase, 0, 0);
  for (const m of state.monsters.values()) {
    const p = miniPos(m.rx, m.ry);
    const boss = MONSTERS[m.kind].boss;
    mctx.fillStyle = boss ? '#ff2a2a' : '#ff7a7a';
    mctx.fillRect(Math.round(p.x) - (boss ? 2 : 1), Math.round(p.y) - (boss ? 2 : 1), boss ? 5 : 2, boss ? 5 : 2);
  }
  const n = miniPos(NPC.x, NPC.y);
  mctx.fillStyle = '#ffe04a'; mctx.fillRect(Math.round(n.x) - 1, Math.round(n.y) - 1, 3, 3);
  for (const p of state.players.values()) {
    const q = miniPos(p.rx, p.ry);
    const mine = p.id === state.myId;
    mctx.fillStyle = mine ? '#ffffff' : '#4ae0ff';
    const s = mine ? 4 : 3;
    mctx.fillRect(Math.round(q.x) - (s >> 1), Math.round(q.y) - (s >> 1), s, s);
    if (mine && Math.floor(now * 3) % 2) { mctx.strokeStyle = '#2a2350'; mctx.strokeRect(Math.round(q.x) - 3.5, Math.round(q.y) - 3.5, 7, 7); }
  }
}

// ================= 메인 루프 =================
let last = performance.now();
let miniAcc = 0;
function frame(t) {
  const now = t / 1000;
  const dt = Math.min(0.1, (t - last) / 1000);
  last = t;

  // 보간
  const k = Math.min(1, dt * 12);
  for (const e of [...state.players.values(), ...state.monsters.values()]) {
    const dx = e.x - e.rx, dy = e.y - e.ry;
    const d = Math.hypot(dx, dy);
    if (d > 6) { e.rx = e.x; e.ry = e.y; }
    else { e.rx += dx * k; e.ry += dy * k; }
    e.moving = d > 0.06;
    if (e.moving && now >= e.attackUntil) {
      const a = toScreen(0, 0), b = toScreen(dx, dy);
      const sdx = b.sx - a.sx, sdy = b.sy - a.sy;
      if (Math.abs(sdx) > 0.3) e.flip = sdx > 0;
      if (Math.abs(sdy) > 0.3) e.back = sdy < 0;
    }
  }
  state.dying = state.dying.filter((d) => (d.life += dt) < d.max);

  // 누르고 있으면 계속 이동
  if (mouse.down && state.myId && performance.now() - mouse.lastSend > 220) {
    mouse.lastSend = performance.now();
    moveToMouse(false);
  }
  // 마우스 커서 모양
  state.hover = state.myId ? R.pick(state, mouse.x, mouse.y) : null;
  canvas.className = state.hover ? (state.hover.type === 'monster' ? 'attack' : 'talk') : '';

  // NPC 대화 도착 체크
  const me = state.players.get(state.myId);
  if (pendingTalk && me && Math.hypot(me.x - NPC.x, me.y - NPC.y) < 2.2) { pendingTalk = false; openDialog(); }
  // 대화 타자 효과
  if (dlg.open) {
    const line = dlg.lines[dlg.i];
    dlg.shown = Math.min(line.length, dlg.shown + dt * 40);
    $('dlgText').textContent = line.slice(0, Math.floor(dlg.shown));
  }
  // 지역 이름
  if (me) {
    const z = isTown(me.x) ? 'HBC 본사 앞' : 'HBC 동쪽 사냥터';
    if (z !== zone) { zone = z; $('zoneName').textContent = z; banner(z === 'HBC 본사 앞' ? '🏢 HBC 본사 앞 (안전지대)' : '⚔️ HBC 동쪽 사냥터'); }
  }

  R.draw(state, dt, now);
  miniAcc += dt;
  if (miniAcc > 0.1) { miniAcc = 0; drawMini(now); }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
window.__hbc = { state, R }; // 디버그/테스트용
