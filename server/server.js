// HBC 오피스 어드벤처 서버: 정적 파일 + WebSocket 게임 서버 (의존성 없음)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { handleUpgrade } from './ws.js';
import { Game } from './game.js';
import { CLASSES } from '../shared/data.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT) || 3000;
const TICK = 1 / 20;      // 20Hz 시뮬레이션
const SEND_EVERY = 2;     // 2틱마다 전송 = 10Hz

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.png': 'image/png', '.json': 'application/json', '.ico': 'image/x-icon', '.svg': 'image/svg+xml',
};

function serveStatic(req, res) {
  let url;
  try { url = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch { res.writeHead(400); res.end(); return; }
  let base = path.join(ROOT, 'client');
  if (url.startsWith('/shared/')) { base = path.join(ROOT, 'shared'); url = url.slice('/shared'.length); }
  if (url === '/') url = '/index.html';
  const file = path.normalize(path.join(base, url));
  if (!file.startsWith(base + path.sep)) { res.writeHead(403); res.end(); return; }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(data);
  });
}

const game = new Game();
const conns = new Set();

const server = http.createServer(serveStatic);
server.on('upgrade', (req, socket, head) => {
  if (!req.url.startsWith('/ws')) { socket.destroy(); return; }
  handleUpgrade(req, socket, head, (conn) => {
    conns.add(conn);
    let player = null;
    conn.msgCount = 0;
    conn.on('message', (raw) => {
      if (++conn.msgCount > 60) return; // 초당 60개 초과 메시지는 무시
      let msg;
      try { msg = JSON.parse(raw); } catch { return; }
      if (!player) {
        if (msg && msg.t === 'join') {
          const name = String(msg.name || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 10);
          const cls = String(msg.cls || '');
          if (!name || !CLASSES[cls]) { conn.send(JSON.stringify({ t: 'err', text: '이름과 직업을 확인해 주세요.' })); return; }
          if (game.players.size >= 30) { conn.send(JSON.stringify({ t: 'err', text: '서버가 가득 찼습니다 (최대 30명).' })); return; }
          player = game.addPlayer(conn, name, cls);
          conn.player = player;
          conn.send(JSON.stringify({ t: 'welcome', id: player.id }));
        }
        return;
      }
      if (msg && msg.t === 'ping') return void (player.lastMsg = game.time);
      game.handle(player, msg);
    });
    conn.on('close', () => {
      conns.delete(conn);
      if (player) game.removePlayer(player.id);
    });
  });
});

let tickCount = 0;
let last = process.hrtime.bigint();
let acc = 0;
setInterval(() => {
  const now = process.hrtime.bigint();
  acc += Number(now - last) / 1e9;
  last = now;
  if (acc > 0.5) acc = 0.5; // 서버가 멈췄다 돌아와도 폭주 방지
  while (acc >= TICK) {
    acc -= TICK;
    game.tick(TICK);
    tickCount++;
    // 3분 동안 아무 메시지가 없으면 연결 정리 (절전 PC 등. 백그라운드 탭은 핑이 1분 간격까지 느려질 수 있음)
    if (tickCount % 20 === 0) {
      for (const c of conns) { c.msgCount = 0; if (c.player && game.time - c.player.lastMsg > 180) c.close(); }
    }
    if (tickCount % SEND_EVERY === 0) broadcast();
  }
}, 1000 / 60);

function broadcast() {
  const { p, m, ev } = game.snapshotBase();
  const base = JSON.stringify({ t: 's', time: Math.round(game.time * 1000) / 1000, p, m, ev });
  const head = base.slice(0, -1);
  for (const c of conns) {
    if (!c.player || !c.open) continue;
    c.send(`${head},"me":${JSON.stringify(game.meFor(c.player))}}`);
  }
}

server.listen(PORT, '0.0.0.0', () => {
  const ips = [];
  for (const list of Object.values(os.networkInterfaces()))
    for (const a of list || []) if (a.family === 'IPv4' && !a.internal) ips.push(a.address);
  console.log('');
  console.log('  ★ HBC 오피스 어드벤처 서버가 시작되었습니다!');
  console.log(`  - 이 PC에서:     http://localhost:${PORT}`);
  for (const ip of ips) console.log(`  - 동료 PC에서:   http://${ip}:${PORT}`);
  console.log('  (창을 닫으면 서버가 종료됩니다)');
  console.log('');
});
