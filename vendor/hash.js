/* ============================================================
   离线校验哈希库 —— MD5（手写，零依赖）+ SHA 系列（crypto.subtle）
   暴露全局 window.ArchiveHash：{ md5, shaHex, toBytes }
   MD5 实现与 app 工具库 dev-hash.js 同源（已通过标准向量校验）
   ============================================================ */
(function (global) {
  'use strict';

  /* ---- 字节化：字符串按 UTF-8 编码；已是字节数组则原样返回 ---- */
  function toBytes(data) {
    if (data instanceof Uint8Array) return data;
    if (Array.isArray(data)) return Uint8Array.from(data);
    if (data && data.buffer instanceof ArrayBuffer) return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
    if (data instanceof ArrayBuffer) return new Uint8Array(data);
    return new TextEncoder().encode(String(data));
  }

  /* ---- MD5（手写，零依赖） ---- */
  function md5(data) {
    const src = toBytes(data);
    const n = src.length;
    const origLenBits = n * 8;

    // 填充：先补 0x80，再补 0 直到长度 ≡ 56 (mod 64)，最后追加 64 位小端长度
    const bytes = new Uint8Array((((n + 8) >> 6) + 1) << 6);
    bytes.set(src);
    bytes[n] = 0x80;
    const lo = origLenBits >>> 0;
    const hi = Math.floor(origLenBits / 4294967296) >>> 0;
    const tail = bytes.length - 8;
    bytes[tail] = lo & 0xff; bytes[tail + 1] = (lo >>> 8) & 0xff; bytes[tail + 2] = (lo >>> 16) & 0xff; bytes[tail + 3] = (lo >>> 24) & 0xff;
    bytes[tail + 4] = hi & 0xff; bytes[tail + 5] = (hi >>> 8) & 0xff; bytes[tail + 6] = (hi >>> 16) & 0xff; bytes[tail + 7] = (hi >>> 24) & 0xff;

    const K = [];
    for (let i = 0; i < 64; i++) K[i] = (Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296)) >>> 0;
    const S = [7,12,17,22,7,12,17,22,7,12,17,22,7,12,17,22,
               5,9,14,20,5,9,14,20,5,9,14,20,5,9,14,20,
               4,11,16,23,4,11,16,23,4,11,16,23,4,11,16,23,
               6,10,15,21,6,10,15,21,6,10,15,21,6,10,15,21];
    const rol = (x, s) => ((x << s) | (x >>> (32 - s))) >>> 0;
    const add = (...ns) => { let r = 0; for (const v of ns) r = (r + (v >>> 0)) % 4294967296; return r >>> 0; };
    const F = (x,y,z) => (x & y) | (~x & z);
    const G = (x,y,z) => (x & z) | (y & ~z);
    const H = (x,y,z) => x ^ y ^ z;
    const I = (x,y,z) => y ^ (x | ~z);

    let a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;

    const M = new Uint32Array(16);
    for (let chunk = 0; chunk < bytes.length; chunk += 64) {
      for (let i = 0; i < 16; i++) {
        const j = chunk + i * 4;
        M[i] = (bytes[j] | (bytes[j + 1] << 8) | (bytes[j + 2] << 16) | (bytes[j + 3] << 24)) >>> 0;
      }
      let A = a0, B = b0, C = c0, D = d0;
      for (let i = 0; i < 64; i++) {
        let f, g;
        if (i < 16) { f = F(B,C,D); g = i; }
        else if (i < 32) { f = G(B,C,D); g = (5 * i + 1) % 16; }
        else if (i < 48) { f = H(B,C,D); g = (3 * i + 5) % 16; }
        else { f = I(B,C,D); g = (7 * i) % 16; }
        const tmp = D; D = C; C = B;
        B = (B + rol(add(A, f, K[i], M[g]) >>> 0, S[i])) >>> 0;
        A = tmp;
      }
      a0 = (a0 + A) >>> 0; b0 = (b0 + B) >>> 0; c0 = (c0 + C) >>> 0; d0 = (d0 + D) >>> 0;
    }

    const toHexLE = (v) => {
      let str = '';
      for (let i = 0; i < 4; i++) str += ((v >>> (i * 8)) & 0xff).toString(16).padStart(2, '0');
      return str;
    };
    return toHexLE(a0) + toHexLE(b0) + toHexLE(c0) + toHexLE(d0);
  }

  /* ---- SHA 系列：浏览器原生 crypto.subtle（本地计算，不联网） ---- */
  async function shaHex(alg, data) {
    const bytes = toBytes(data);
    const subtle = (typeof global.crypto !== 'undefined' && global.crypto.subtle) || null;
    if (!subtle) throw new Error('当前环境不支持 crypto.subtle');
    const buf = await subtle.digest(alg, bytes);
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  global.ArchiveHash = { md5, shaHex, toBytes };
})(window);
