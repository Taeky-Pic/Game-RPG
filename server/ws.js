// 외부 라이브러리 없이 동작하는 최소 WebSocket 서버 구현 (RFC 6455, 텍스트 메시지)
// 사내망에서 npm 설치 없이 Node.js 만으로 실행할 수 있게 하기 위함.
import crypto from 'node:crypto';
import { EventEmitter } from 'node:events';

const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const MAX_PAYLOAD = 64 * 1024;
const MAX_BUFFERED = 2 * 1024 * 1024;

export class WsConn extends EventEmitter {
  constructor(socket) {
    super();
    this.socket = socket;
    this.buf = Buffer.alloc(0);
    this.frag = [];
    this.fragOp = 0;
    this.open = true;
    socket.setNoDelay(true);
    socket.on('data', (d) => this._onData(d));
    socket.on('close', () => this._closed());
    socket.on('error', () => this._closed());
  }

  _onData(d) {
    if (!this.open) return;
    this.buf = this.buf.length ? Buffer.concat([this.buf, d]) : d;
    if (this.buf.length > MAX_PAYLOAD * 4) return this.close();
    for (;;) {
      if (this.buf.length < 2) return;
      const b0 = this.buf[0], b1 = this.buf[1];
      const fin = (b0 & 0x80) !== 0;
      const op = b0 & 0x0f;
      const masked = (b1 & 0x80) !== 0;
      let len = b1 & 0x7f;
      let off = 2;
      if (len === 126) {
        if (this.buf.length < 4) return;
        len = this.buf.readUInt16BE(2); off = 4;
      } else if (len === 127) {
        if (this.buf.length < 10) return;
        if (this.buf.readUInt32BE(2) !== 0) return this.close();
        len = this.buf.readUInt32BE(6); off = 10;
      }
      if (!masked || len > MAX_PAYLOAD) return this.close();
      if (this.buf.length < off + 4 + len) return;
      const mask = this.buf.subarray(off, off + 4);
      const payload = Buffer.from(this.buf.subarray(off + 4, off + 4 + len));
      for (let i = 0; i < payload.length; i++) payload[i] ^= mask[i & 3];
      this.buf = this.buf.subarray(off + 4 + len);

      if (op === 0x8) return this.close();
      if (op === 0x9) { this._send(0xa, payload); continue; }
      if (op === 0xa) continue;
      if (op === 0x1 || op === 0x2) { this.frag = [payload]; this.fragOp = op; }
      else if (op === 0x0) {
        if (!this.frag.length) return this.close();
        this.frag.push(payload);
        if (this.frag.reduce((s, b) => s + b.length, 0) > MAX_PAYLOAD) return this.close();
      } else return this.close();
      if (fin) {
        const msg = Buffer.concat(this.frag);
        const op0 = this.fragOp;
        this.frag = [];
        if (op0 === 0x1) this.emit('message', msg.toString('utf8'));
      }
      if (!this.open) return;
    }
  }

  send(str) { this._send(0x1, Buffer.from(str, 'utf8')); }

  _send(op, payload) {
    if (!this.open) return;
    if (this.socket.writableLength > MAX_BUFFERED) { this._closed(); return; } // 너무 느린 클라이언트
    const len = payload.length;
    let header;
    if (len < 126) header = Buffer.from([0x80 | op, len]);
    else if (len < 65536) { header = Buffer.alloc(4); header[0] = 0x80 | op; header[1] = 126; header.writeUInt16BE(len, 2); }
    else { header = Buffer.alloc(10); header[0] = 0x80 | op; header[1] = 127; header.writeUInt32BE(0, 2); header.writeUInt32BE(len, 6); }
    try { this.socket.write(Buffer.concat([header, payload])); } catch { this._closed(); }
  }

  close() {
    if (!this.open) return;
    this._send(0x8, Buffer.alloc(0));
    this.open = false;
    try { this.socket.end(); } catch { /* ignore */ }
    setTimeout(() => this.socket.destroy(), 500).unref();
    this.emit('close');
  }

  _closed() {
    if (!this.open) return;
    this.open = false;
    this.socket.destroy();
    this.emit('close');
  }
}

export function handleUpgrade(req, socket, head, onConn) {
  const key = req.headers['sec-websocket-key'];
  if (!key || String(req.headers.upgrade || '').toLowerCase() !== 'websocket') {
    socket.destroy();
    return;
  }
  const accept = crypto.createHash('sha1').update(key + GUID).digest('base64');
  socket.write(
    'HTTP/1.1 101 Switching Protocols\r\n' +
    'Upgrade: websocket\r\n' +
    'Connection: Upgrade\r\n' +
    `Sec-WebSocket-Accept: ${accept}\r\n\r\n`
  );
  const conn = new WsConn(socket);
  onConn(conn);
  if (head && head.length) conn._onData(head);
}
