/* 归档 · 功能验证（无头 DOM 测试）
 * 运行：node test/functional.js
 * 覆盖：页面初始化 / 视图切换 / 主题 / 红绿灯(web+electron) / 压缩 / 解压 / 校验 / 拆分 / 合并 / 最近记录
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { webcrypto } = require('crypto');
const { JSDOM } = require('jsdom');

const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const vendorJs = [
  'vendor/jszip.min.js',
  'vendor/hash.js',
].map((f) => fs.readFileSync(path.join(ROOT, f), 'utf8'));
const appJs = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');

/* 把 vendor + app 内联进 HTML，便于 beforeParse 注入测试替身 */
let page = html
  .replace(/<script src="[^"]*"><\/script>\s*/g, '')
  .replace('</body>', `<script>${vendorJs.join('\n')}</script>\n<script>${appJs}</script>\n</body>`);

let failures = 0;
let checks = 0;
function ok(cond, name, extra) {
  checks++;
  if (cond) { console.log('  ✓', name); }
  else { failures++; console.log('  ✗ FAIL', name, extra || ''); }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function run() {
  /* ============ 测试替身 ============ */
  const fake = {
    calls: [],
    minimize: () => fake.calls.push('min'),
    maximize: () => fake.calls.push('max'),
    close: () => fake.calls.push('close'),
    onMaximizedChange: (cb) => { fake.maxCb = cb; },
  };
  const downloads = [];       // 下载 blob 记录
  const createdUrls = [];
  const errors = [];

  const dom = new JSDOM(page, {
    url: 'https://archive.local/',
    runScripts: 'outside-only',
    pretendToBeVisual: true,
    beforeParse(win) {
      try { Object.defineProperty(win, 'crypto', { value: webcrypto, configurable: true }); }
      catch (e) { try { win.crypto = webcrypto; } catch (e2) {} }   // ArchiveHash.shaHex 需要 crypto.subtle
      win.setImmediate = (cb) => setTimeout(cb, 0);              // JSZip 异步调度依赖
      win.clearImmediate = (id) => clearTimeout(id);
      win.electronAPI = fake;                                  // 模拟 Electron 环境
      win.URL.createObjectURL = (b) => { createdUrls.push(b); return 'blob:fake-' + createdUrls.length; };
      win.URL.revokeObjectURL = () => {};
      win.navigator.clipboard = { writeText: async () => {} };
      win.console.error = (...a) => { errors.push(a.join(' ')); };  // 记录页面 JS 错误
      win.addEventListener('unhandledrejection', (e) => {
        errors.push('REJECTION: ' + ((e.reason && (e.reason.stack || e.reason.message)) || e.reason));
      });
      win.addEventListener('error', (e) => { errors.push('EVENT-ERROR: ' + e.message); });
      // File.prototype.arrayBuffer 兜底（jsdom 缺失时）
      if (typeof win.File.prototype.arrayBuffer !== 'function') {
        win.File.prototype.arrayBuffer = function () {
          return new Promise((res) => {
            const fr = new win.FileReader();
            fr.onload = () => res(fr.result);
            fr.readAsArrayBuffer(this);
          });
        };
      }
      // 拦截下载（downloadBlob 用 <a download>）
      const origClick = win.HTMLAnchorElement.prototype.click;
      win.HTMLAnchorElement.prototype.click = function () {
        if (this.download) downloads.push({ name: this.download, url: this.href });
        else origClick.call(this);
      };
    },
  });
  const { window } = dom;
  // 手动执行脚本（绕开 jsdom 内联 <script> 的求值怪癖）
  window.eval(vendorJs.join('\n'));
  window.eval(appJs);
  const { document } = window;
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  const dispatch = (el, type, files) => {
    const ev = new window.Event(type, { bubbles: true, cancelable: true });
    ev.dataTransfer = { files };
    el.dispatchEvent(ev);
  };
  const mkFile = (name, bytes) => new window.File([new Uint8Array(bytes)], name);

  console.log('== 归档功能验证 ==\n');

  /* 1. 初始化：无 JS 错误、核心元素齐全 */
  ok(errors.length === 0, '页面加载无 JS 错误' + (errors.length ? ' -> ' + errors.join(' | ') : ''));
  ok($$('.nav-item').length === 5, '侧栏 5 个功能项');
  ok($('#view-home').classList.contains('active'), '默认首页激活');
  ok($('#btnClose') && $('#btnMin') && $('#btnMax'), '红绿灯按钮存在');

  /* 2. 视图切换 */
  for (const [mode, id] of [['compress', 'view-compress'], ['extract', 'view-extract'], ['checksum', 'view-checksum'], ['split', 'view-split']]) {
    const nav = document.querySelector(`.nav-item[data-mode="${mode}"]`);
    nav.click();
    ok($('#' + id).classList.contains('active'), `视图切换 → ${mode}`);
  }

  /* 3. 主题切换 */
  const beforeTheme = document.documentElement.getAttribute('data-theme');
  $('#themeToggle').click();
  const afterTheme = document.documentElement.getAttribute('data-theme');
  ok(beforeTheme !== afterTheme, `主题切换 ${beforeTheme} → ${afterTheme}`);

  /* 4. 红绿灯（Electron 路径） */
  $('#btnMin').click();
  $('#btnMax').click();
  $('#btnClose').click();
  ok(fake.calls.join(',') === 'min,max,close', `红绿灯 IPC 调用顺序: ${fake.calls.join(',')}`);
  ok(typeof fake.maxCb === 'function', '已订阅最大化状态事件');
  fake.maxCb({ maximized: true });
  ok(document.body.classList.contains('maximized'), '最大化 → body.maximized');
  ok($('#maxTip').textContent === '还原', '最大化 → 绿按钮提示「还原」');
  ok($('#btnMax').getAttribute('aria-label') === '还原', '最大化 → aria-label 同步「还原」');
  fake.maxCb({ maximized: false });
  ok(!document.body.classList.contains('maximized') && $('#maxTip').textContent === '最大化', '还原 → 提示回到「最大化」');
  ok($$('.light-label').length === 3 && $$('.light-label')[0].textContent === '关闭', '三个红绿灯均有提示文字');

  /* 5. 压缩 */
  document.querySelector('.nav-item[data-mode="compress"]').click();
  dispatch($('#dropCompress'), 'drop', [mkFile('a.txt', [0x41, 0x42, 0x43]), mkFile('b.png', new Array(2000).fill(7))]);
  ok($$('#compressList .row').length === 2, '拖入 2 个文件 → 列表 2 行');
  ok(!$('#compressBtn').disabled, '压缩按钮已启用');
  ok($('#compressInfo').textContent.includes('2 个条目'), '状态栏显示条目数');
  $('#compressList .row .f-del').click();
  ok($$('#compressList .row').length === 1, '移除一个文件 → 剩 1 行');
  $('#estimateBtn').click();
  ok($('#estimateBtn').disabled, '预估点击后进入分析状态');
  await sleep(1200);
  ok(!$('#estimate').hidden && $('#estimate').innerHTML.includes('原始'), '体积预估已生成' + (!$('#estimate').hidden ? '' : ' | toast: ' + $('#toast').textContent));
  $('#compressBtn').click();
  await sleep(900);
  ok(downloads.some((d) => d.name === 'archive.zip'), '压缩产出 archive.zip 下载' + (downloads.length ? ' | 实际: ' + downloads.map((d) => d.name).join(',') : '') + ' | toast: ' + $('#toast').textContent);
  ok($('#compressProgress').hidden, '压缩进度条已收起');

  /* 6. 解压（真实 zip） */
  const JSZip = require(path.join(ROOT, 'vendor', 'jszip.min.js'));
  const zip = new JSZip();
  zip.file('readme.txt', '归档测试内容');
  zip.file('sub/note.md', '# hello');
  const zipBuf = await zip.generateAsync({ type: 'nodebuffer' });
  document.querySelector('.nav-item[data-mode="extract"]').click();
  dispatch($('#dropExtract'), 'drop', [mkFile('test.zip', zipBuf)]);
  await sleep(500);
  ok(!$('#archiveHead').hidden, '压缩包已读取（归档头显示）');
  const fileRows = $$('#extractList .row').filter((r) => !r.classList.contains('folder'));
  ok(fileRows.length === 2, '解压树渲染 2 个文件（' + fileRows.length + '）');
  ok($('#archiveName').textContent === 'test.zip', '归档名正确');
  const zipRows = $$('#extractList .row').filter((r) => !r.classList.contains('folder'));
  zipRows[0].click(); // 取消选中
  const beforeExtractDownloads = downloads.length;
  $('#extractSel').click();
  await sleep(900);
  ok(downloads.length === beforeExtractDownloads + 1, '「解压选中」逐一下载 1 个文件（' + (downloads.length - beforeExtractDownloads) + '）');

  /* 7. 校验（MD5 向量） */
  document.querySelector('.nav-item[data-mode="checksum"]').click();
  const testBytes = new TextEncoder().encode('abc');
  const expectMd5 = crypto.createHash('md5').update(testBytes).digest('hex');
  dispatch($('#dropHash'), 'drop', [mkFile('abc.bin', testBytes)]);
  await sleep(600);
  const val = $('.hash-val').textContent;
  ok(/^[0-9a-f]{32}$/.test(val) && val === expectMd5, `MD5 校验值正确（${val}）`);
  ok(!$('.hash-copy').disabled, '复制按钮已启用');
  $('#hashAlgSeg button[data-v="sha256"]').click();
  dispatch($('#dropHash'), 'drop', [mkFile('abc.bin', testBytes)]);
  await sleep(600);
  const val256 = $('.hash-val').textContent;
  const expect256 = crypto.createHash('sha256').update(testBytes).digest('hex');
  ok(val256 === expect256, `SHA-256 校验值正确（${val256.slice(0, 12)}…）`);

  /* 8. 拆分 / 合并 */
  document.querySelector('.nav-item[data-mode="split"]').click();
  $('#splitSizeSeg button[data-v="10485760"]').click(); // 10MB 档
  dispatch($('#dropSplit'), 'drop', [mkFile('big.bin', new Array(15 * 1024 * 1024).fill(1))]);
  ok(!$('#splitBtn').disabled, '15MB 文件 + 10MB 档 → 拆分按钮启用');
  ok($('#splitInfo').textContent.includes('2 个分卷'), '提示将拆为 2 个分卷');
  $('#splitBtn').click();
  await sleep(900);
  ok(downloads.filter((d) => d.name.startsWith('big.bin.part.')).length === 2, '拆分为 2 个分卷下载');
  $('#splitModeSeg button[data-v="merge"]').click();
  ok($('#mergePanel').hidden === false && $('#splitPanel').hidden === true, '切换到合并面板');
  dispatch($('#dropMerge'), 'drop', [
    mkFile('movie.bin.part.002', new Array(10).fill(2)),
    mkFile('movie.bin.part.001', new Array(10).fill(1)),
  ]);
  ok(!$('#mergeBtn').disabled, '合并按钮启用');
  const badges = $$('#mergeList .order-badge').map((b) => b.textContent);
  ok(badges.join(',') === '1,2', `分卷按序号排序: ${badges.join(',')}`);
  const beforeMerge = downloads.length;
  $('#mergeBtn').click();
  await sleep(700);
  ok(downloads.length === beforeMerge + 1 && downloads[downloads.length - 1].name === 'movie.bin', '合并还原为 movie.bin');

  /* 9. 最近记录 */
  ok($$('#recentList .recent-item').length >= 2, '最近记录已有压缩/解压任务');

  /* 10. 红绿灯 web 回退（关掉 electronAPI 模拟） */
  // 上面已验证 electron 路径；这里验证 web 路径不报错
  const dom2 = new JSDOM(page, {
    url: 'https://archive.local/',
    runScripts: 'outside-only',
    pretendToBeVisual: true,
    beforeParse(win) {
      try { Object.defineProperty(win, 'crypto', { value: webcrypto, configurable: true }); }
      catch (e) { try { win.crypto = webcrypto; } catch (e2) {} }
      win.setImmediate = (cb) => setTimeout(cb, 0);
      win.clearImmediate = (id) => clearTimeout(id);
      delete win.electronAPI;
      win.URL.createObjectURL = () => 'blob:x';
      win.URL.revokeObjectURL = () => {};
      win.navigator.clipboard = { writeText: async () => {} };
      win.close = () => true;
      // 模拟全屏状态（jsdom 无 fullscreenElement）
      win.__fsEl = null;
      Object.defineProperty(win.HTMLDocument.prototype, 'fullscreenElement', {
        get() { return win.__fsEl || null; }, configurable: true,
      });
    },
  });
  const w2 = dom2.window;
  w2.eval(vendorJs.join('\n'));
  w2.eval(appJs);
  const d2 = w2.document;
  d2.querySelector('#btnMin').click();
  ok(d2.querySelector('#window').classList.contains('minimized'), 'web 模式：最小化 → 动画类');
  d2.querySelector('#btnMax').click();
  ok(d2.body.classList.contains('maximized'), 'web 模式：最大化 → body.maximized');
  w2.__fsEl = d2.querySelector('#window'); // 模拟已进入全屏
  d2.querySelector('#btnMax').click();
  ok(!d2.body.classList.contains('maximized'), 'web 模式：再次点击 → 还原');

  console.log('\n== 结果 ==');
  console.log(failures === 0 ? `全部通过（${checks} 项）✅` : `失败 ${failures}/${checks} 项 ❌`);
  if (errors.length) console.log('JS 错误记录:', errors);
  process.exit(failures === 0 ? 0 : 1);
}

run().catch((e) => { console.error('测试异常:', e); process.exit(2); });
