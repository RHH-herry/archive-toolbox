/* ===== 归档 · 压缩与解压 — 逻辑 ===== */
(function () {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  /* ---------- 工具函数 ---------- */
  function fmtSize(b) {
    if (b == null) return '—';
    if (b < 1024) return b + ' B';
    if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
    if (b < 1024 * 1024 * 1024) return (b / 1024 / 1024).toFixed(1) + ' MB';
    return (b / 1024 / 1024 / 1024).toFixed(2) + ' GB';
  }
  /* 矢量图标（SF 风格） */
  const ICONS = {
    image: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" stroke-linecap="round"><rect x="3" y="5" width="18" height="14" rx="3"/><circle cx="9" cy="10" r="1.7"/><path d="M5 17l4.5-4.5 3 3L16 12l3 3.5"/></svg>',
    code: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M9 8l-4 4 4 4M15 8l4 4-4 4"/></svg>',
    audio: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V6l10-2v12"/><circle cx="7" cy="18" r="2.3"/><circle cx="17" cy="16" r="2.3"/></svg>',
    video: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><rect x="3" y="6" width="13" height="12" rx="2.5"/><path d="M16 10l5-3v10l-5-3z" fill="currentColor" opacity=".7" stroke="none"/></svg>',
    archive: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" stroke-linecap="round"><path d="M3 7l9-4 9 4-9 4-9-4z"/><path d="M3 7v10l9 4 9-4V7"/><path d="M12 11v6"/></svg>',
    doc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" stroke-linecap="round"><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/><path d="M9 12h6M9 15h6M9 18h4" stroke-width="1.4"/></svg>',
    folder: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" stroke-linecap="round"><path d="M3 6a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>'
  };
  function fileIcon(name) {
    const ext = (name.split('.').pop() || '').toLowerCase();
    const T = {
      image: '#bf5af2', code: '#64d2ff', audio: '#ff375f', video: '#5e5ce6',
      archive: '#c9651a', doc: '#8e8e93', pdf: '#ff453a', xls: '#30d158',
      ppt: '#ff9f0a', folder: '#ffb340'
    };
    const map = {
      png:'image', jpg:'image', jpeg:'image', gif:'image', webp:'image', svg:'image', bmp:'image', heic:'image',
      zip:'archive', rar:'archive', '7z':'archive', tar:'archive', gz:'archive',
      js:'code', ts:'code', py:'code', html:'code', css:'code', json:'code', xml:'code', yml:'code', php:'code', go:'code', rs:'code', c:'code', cpp:'code', java:'code', sh:'code',
      mp3:'audio', wav:'audio', flac:'audio', aac:'audio', ogg:'audio',
      mp4:'video', mov:'video', avi:'video', mkv:'video', webm:'video',
      pdf:'pdf', doc:'doc', docx:'doc', txt:'doc', md:'doc', csv:'doc', rtf:'doc', log:'doc',
      xls:'xls', xlsx:'xls', ppt:'ppt', pptx:'ppt'
    };
    const kind = map[ext] || 'doc';
    return { svg: ICONS[kind] || ICONS.doc, tint: T[kind] || T.doc };
  }
  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }
  let toastTimer;
  function toast(msg, kind) {
    const t = $('#toast');
    const ic = kind === 'err'
      ? '<span class="t-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v6M12 16.5v.5"/></svg></span>'
      : '<span class="t-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4 10-11"/></svg></span>';
    t.className = 'toast' + (kind === 'err' ? ' err' : '');
    t.innerHTML = ic + '<span>' + escapeHtml(msg) + '</span>';
    t.hidden = false;
    requestAnimationFrame(() => t.classList.add('show'));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      t.classList.remove('show');
      setTimeout(() => (t.hidden = true), 250);
    }, 2600);
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  /* ---------- 外观切换 ---------- */
  const saved = localStorage.getItem('archive-theme');
  if (saved) document.documentElement.setAttribute('data-theme', saved);
  $('#themeToggle').addEventListener('click', () => {
    const cur = document.documentElement.getAttribute('data-theme');
    const next = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('archive-theme', next);
  });

  /* ---------- 红黄绿圆点 ---------- */
  const isElectron = typeof window.electronAPI !== 'undefined';
  $('#btnClose').addEventListener('click', () => {
    if (isElectron) {
      window.electronAPI.close();
    } else {
      const closed = window.close();
      if (!closed && !window.opener) toast('请在浏览器中关闭此标签页');
    }
  });
  $('#btnMin').addEventListener('click', () => {
    if (isElectron) {
      window.electronAPI.minimize();
    } else {
      $('#window').classList.toggle('minimized');
    }
  });
  $('#btnMax').addEventListener('click', () => {
    if (isElectron) {
      window.electronAPI.maximize();
    } else {
      if (!document.fullscreenElement) {
        $('#window').requestFullscreen?.();
        document.body.classList.add('maximized');
      } else {
        document.exitFullscreen?.();
        document.body.classList.remove('maximized');
      }
    }
  });

  /* 最大化状态同步：切换圆角外壳 + 绿按钮「还原」图标与提示 */
  function applyMaximized(max) {
    document.body.classList.toggle('maximized', !!max);
    const tip = document.getElementById('maxTip');
    if (tip) tip.textContent = max ? '还原' : '最大化';
  }
  if (isElectron && window.electronAPI.onMaximizedChange) {
    window.electronAPI.onMaximizedChange((s) => applyMaximized(s && s.maximized));
  }

  /* ---------- 视图切换 ---------- */
  function goMode(mode) {
    $$('.nav-item').forEach((x) => x.classList.toggle('active', x.dataset.mode === mode));
    $$('.view').forEach((v) => v.classList.remove('active'));
    const v = $('#view-' + mode);
    if (v) v.classList.add('active');
  }
  $$('.nav-item').forEach((b) => b.addEventListener('click', () => goMode(b.dataset.mode)));
  $$('.hero-card').forEach((c) => c.addEventListener('click', () => goMode(c.dataset.go)));

  /* ---------- 拖放高亮 ---------- */
  function bindDrop(zone, handler) {
    ['dragenter', 'dragover'].forEach((ev) =>
      zone.addEventListener(ev, (e) => { e.preventDefault(); zone.classList.add('over'); })
    );
    ['dragleave', 'drop'].forEach((ev) =>
      zone.addEventListener(ev, (e) => {
        e.preventDefault();
        if (ev === 'dragleave' && zone.contains(e.relatedTarget)) return;
        zone.classList.remove('over');
      })
    );
    zone.addEventListener('drop', (e) => {
      const files = e.dataTransfer.files;
      if (files && files.length) handler(files);
    });
  }

  /* ================= 历史记录（最近任务） ================= */
  const HKEY = 'archive-history';
  function loadHistory() {
    try { return JSON.parse(localStorage.getItem(HKEY) || '[]'); } catch (e) { return []; }
  }
  function addHistory(type, name, size) {
    const list = loadHistory();
    list.unshift({ type, name, size, time: Date.now() });
    const seen = new Set(); const dedup = [];
    for (const it of list) {
      const key = it.type + '|' + it.name;
      if (seen.has(key)) continue;
      seen.add(key); dedup.push(it);
      if (dedup.length >= 8) break;
    }
    try { localStorage.setItem(HKEY, JSON.stringify(dedup)); } catch (e) {}
    renderRecent();
  }
  function relTime(t) {
    const d = (Date.now() - t) / 1000;
    if (d < 60) return '刚刚';
    if (d < 3600) return Math.floor(d / 60) + ' 分钟前';
    if (d < 86400) return Math.floor(d / 3600) + ' 小时前';
    return Math.floor(d / 86400) + ' 天前';
  }
  function renderRecent() {
    const wrap = $('#recent'); const box = $('#recentList');
    const list = loadHistory();
    wrap.hidden = false; box.innerHTML = '';
    if (!list.length) {
      box.innerHTML = '<div class="recent-empty">完成压缩或解压后，最近的任务会显示在这里</div>';
      return;
    }
    const icoC = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7l9-4 9 4-9 4-9-4z"/><path d="M3 7v10l9 4 9-4V7"/><path d="M12 11v6"/></svg>';
    const icoX = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>';
    list.forEach((it, idx) => {
      const el = document.createElement('div');
      el.className = 'recent-item';
      el.innerHTML =
        `<span class="ri-ico ${it.type === 'compress' ? 'c' : 'x'}">${it.type === 'compress' ? icoC : icoX}</span>` +
        `<span class="ri-text"><span class="ri-name">${escapeHtml(it.name)}</span>` +
        `<span class="ri-meta">${it.type === 'compress' ? '压缩' : '解压'} · ${fmtSize(it.size)} · ${relTime(it.time)}</span></span>` +
        `<button class="ri-del" title="移除">×</button>`;
      el.addEventListener('click', (e) => {
        if (e.target.closest('.ri-del')) {
          e.stopPropagation();
          const all = loadHistory(); all.splice(idx, 1);
          try { localStorage.setItem(HKEY, JSON.stringify(all)); } catch (er) {}
          renderRecent();
          return;
        }
        goMode(it.type === 'compress' ? 'compress' : 'extract');
      });
      box.appendChild(el);
    });
  }
  renderRecent();

  /* ================= 压缩 ================= */
  const selected = new Map(); // path -> File
  const fileInput = $('#fileInput');
  const dirInput = $('#dirInput');
  dirInput.setAttribute('webkitdirectory', '');
  dirInput.setAttribute('directory', '');

  $('#pickFiles').addEventListener('click', () => fileInput.click());
  $('#pickDir').addEventListener('click', () => dirInput.click());
  fileInput.addEventListener('change', (e) => addFiles(e.target.files, false));
  dirInput.addEventListener('change', (e) => addFiles(e.target.files, true));

  function addFiles(fileList, isDir) {
    Array.from(fileList).forEach((f) => {
      const path = isDir && f.webkitRelativePath ? f.webkitRelativePath : f.name;
      if (path.endsWith('/')) return;
      selected.set(path, f);
    });
    renderCompress();
  }

  function renderCompress() {
    const list = $('#compressList');
    list.innerHTML = '';
    let total = 0;
    Array.from(selected.entries()).forEach(([path, f]) => {
      total += f.size;
      const row = document.createElement('div');
      row.className = 'row';
      const dir = path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '';
      const ic = fileIcon(path);
      row.innerHTML =
        `<span class="f-ico" style="--tint:${ic.tint}">${ic.svg}</span>` +
        `<span class="f-name">${escapeHtml(f.name)}` +
        (dir ? `<span class="f-path"> · ${escapeHtml(dir)}</span>` : '') + `</span>` +
        `<span class="f-size">${fmtSize(f.size)}</span>` +
        `<button class="f-del" title="移除">×</button>`;
      row.querySelector('.f-del').addEventListener('click', () => {
        selected.delete(path); renderCompress();
      });
      list.appendChild(row);
    });
    const n = selected.size;
    $('#compressInfo').textContent = n ? `${n} 个条目 · 共 ${fmtSize(total)}` : '尚未添加文件';
    $('#compressBtn').disabled = n === 0;
  }

  bindDrop($('#dropCompress'), (files) => addFiles(files, false));

  /* 压缩级别：分段控制器 */
  let levelValue = 6;
  $('#levelSeg').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    levelValue = parseInt(b.dataset.v, 10);
    $$('#levelSeg button').forEach((x) => x.classList.remove('active'));
    b.classList.add('active');
  });

  /* 体积预估：真实用 JSZip 跑当前级别 */
  $('#estimateBtn').addEventListener('click', async () => {
    if (!selected.size) { toast('请先添加要压缩的文件'); return; }
    let raw = 0; selected.forEach((f) => { raw += f.size; });
    if (raw > 300 * 1024 * 1024) { toast('文件较大，已跳过体积预估'); return; }
    const btn = $('#estimateBtn'); const box = $('#estimate');
    const old = btn.textContent;
    btn.disabled = true; btn.textContent = '分析中…';
    try {
      const zip = new JSZip();
      selected.forEach((f, path) => zip.file(path, f));
      const lvl = levelValue === 0 ? 0 : levelValue;
      const out = await zip.generateAsync(
        { type: 'blob', compression: lvl === 0 ? 'STORE' : 'DEFLATE', compressionOptions: { level: lvl } }
      );
      const comp = out.size;
      const save = raw > 0 ? Math.max(0, Math.round((1 - comp / raw) * 100)) : 0;
      const w = raw > 0 ? Math.max(4, Math.min(100, Math.round((comp / raw) * 100))) : 0;
      box.hidden = false;
      box.innerHTML =
        `<span class="e-item">原始 <span class="e-val">${fmtSize(raw)}</span></span>` +
        `<span class="e-item">压缩后 <span class="e-val">${fmtSize(comp)}</span></span>` +
        `<span class="e-item e-save">节省 ${save}%</span>` +
        `<span class="e-bar"><i style="width:${w}%"></i></span>`;
    } catch (err) {
      toast('分析失败：' + err.message, 'err');
    } finally {
      btn.disabled = false; btn.textContent = old;
    }
  });

  $('#compressBtn').addEventListener('click', async () => {
    if (!selected.size) return;
    const level = levelValue;
    const name = ($('#zipName').value || 'archive').trim().replace(/\.zip$/i, '');
    const btn = $('#compressBtn');
    btn.disabled = true;
    const prog = $('#compressProgress');
    prog.hidden = false;
    const fill = $('#compressFill');
    const pct = $('#compressPct');

    try {
      const zip = new JSZip();
      Array.from(selected.entries()).forEach(([path, f]) => {
        zip.file(path, f); // JSZip 内部以 ArrayBuffer 读取
      });
      const blob = await zip.generateAsync(
        { type: 'blob', compression: level === 0 ? 'STORE' : 'DEFLATE', compressionOptions: { level } },
        (meta) => {
          const p = Math.round(meta.percent);
          fill.style.width = p + '%';
          pct.textContent = p + '%';
        }
      );
      downloadBlob(blob, name + '.zip');
      addHistory('compress', name + '.zip', blob.size);
      fill.classList.add('done');
      toast(`已生成 ${name}.zip（${fmtSize(blob.size)}）`);
    } catch (err) {
      toast('压缩失败：' + err.message, 'err');
    } finally {
      btn.disabled = false;
      setTimeout(() => { prog.hidden = true; fill.classList.remove('done'); fill.style.width = '0%'; pct.textContent = '0%'; }, 700);
    }
  });

  /* ================= 解压 ================= */
  let currentZip = null;
  let fileEntries = [];      // 可解压文件条目
  const selectedSet = new Set(); // 选中的 path
  let currentArchiveName = '';
  let archiveTotal = 0;
  let extractFilter = '';

  const zipInput = $('#zipInput');
  $('#pickZip').addEventListener('click', () => zipInput.click());
  zipInput.addEventListener('change', (e) => { if (e.target.files[0]) loadZip(e.target.files[0]); });
  bindDrop($('#dropExtract'), (files) => {
    const z = Array.from(files).find((f) => /\.zip$/i.test(f.name));
    if (z) loadZip(z); else toast('请拖入 .zip 文件');
  });

  function sizeOf(entry) {
    try { return entry._data ? entry._data.uncompressedSize : null; } catch (e) { return null; }
  }

  function loadZip(file) {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const zip = await JSZip.loadAsync(reader.result);
        currentZip = zip;
        fileEntries = [];
        zip.forEach((relPath, entry) => {
          if (!entry.dir) fileEntries.push(entry);
        });
        fileEntries.sort((a, b) => a.name.localeCompare(b.name));
        selectedSet.clear();
        fileEntries.forEach((e) => selectedSet.add(e.name));

        let total = 0;
        fileEntries.forEach((e) => { const s = sizeOf(e); if (s) total += s; });
        currentArchiveName = file.name;
        archiveTotal = total;
        $('#archiveName').textContent = file.name;
        $('#archiveMeta').textContent =
          `${fileEntries.length} 个文件 · 约 ${fmtSize(total)}` +
          (typeof window.showDirectoryPicker === 'function' ? '' : ' · 浏览器将逐一下载');
        $('#archiveHead').hidden = false;
        $('#extractToolbar').hidden = false;
        $('#subfolderName').textContent = file.name.replace(/\.zip$/i, '');
        renderExtractTree();
        $('#extractAll').disabled = false;
        $('#extractSel').disabled = false;
        toast('压缩包已读取');
      } catch (err) {
        toast('无法读取压缩包：' + err.message, 'err');
      }
    };
    reader.readAsArrayBuffer(file);
  }

  function renderExtractTree() {
    const list = $('#extractList');
    list.innerHTML = '';
    const root = {};
    const kw = extractFilter.toLowerCase();
    fileEntries.forEach((e) => {
      if (kw && !e.name.toLowerCase().includes(kw)) return; // 搜索过滤（保留父链）
      const parts = e.name.split('/');
      let node = root;
      parts.forEach((p, i) => {
        node[p] = node[p] || {};
        node = node[p];
        if (i === parts.length - 1) node.__entry = e;
      });
    });
    const walk = (node, depth) => {
      Object.keys(node).forEach((key) => {
        const child = node[key];
        const indent = depth * 16;
        if (child.__entry) {
          const e = child.__entry;
          const ic = fileIcon(e.name);
          const row = document.createElement('div');
          row.className = 'row' + (selectedSet.has(e.name) ? ' selected' : '');
          row.dataset.path = e.name;
          row.innerHTML =
            `<span class="indent" style="width:${indent}px"></span>` +
            `<span class="f-check">${selectedSet.has(e.name) ? '✓' : ''}</span>` +
            `<span class="f-ico" style="--tint:${ic.tint}">${ic.svg}</span>` +
            `<span class="f-name">${escapeHtml(key)}</span>` +
            `<span class="f-size">${fmtSize(sizeOf(e))}</span>`;
          row.addEventListener('click', () => {
            if (selectedSet.has(e.name)) selectedSet.delete(e.name);
            else selectedSet.add(e.name);
            renderExtractTree();
          });
          list.appendChild(row);
        } else {
          const row = document.createElement('div');
          row.className = 'row folder';
          row.innerHTML =
            `<span class="indent" style="width:${indent}px"></span>` +
            `<span class="f-ico" style="--tint:#ffb340">${ICONS.folder}</span>` +
            `<span class="f-name">${escapeHtml(key)}</span>`;
          list.appendChild(row);
          walk(child, depth + 1);
        }
      });
    };
    walk(root, 0);
  }

  async function extractChosen() {
    if (!currentZip) return;
    const chosen = fileEntries.filter((e) => selectedSet.has(e.name));
    if (!chosen.length) { toast('请先选择要解压的文件'); return; }
    const prog = $('#extractProgress');
    prog.hidden = false;
    const fill = $('#extractFill');
    const pct = $('#extractPct');

    const supportsFSA = typeof window.showDirectoryPicker === 'function';
    if (supportsFSA) {
      try {
        const dir = await window.showDirectoryPicker();
        let outDir = dir;
        if ($('#subfolderToggle').checked) {
          const base = currentArchiveName.replace(/\.zip$/i, '') || 'archive';
          outDir = await dir.getDirectoryHandle(base, { create: true });
        }
        for (let i = 0; i < chosen.length; i++) {
          const e = chosen[i];
          const parts = e.name.split('/').filter(Boolean);
          let h = outDir;
          for (let j = 0; j < parts.length - 1; j++) h = await h.getDirectoryHandle(parts[j], { create: true });
          const fh = await h.getFileHandle(parts[parts.length - 1], { create: true });
          const w = await fh.createWritable();
          await w.write(await e.async('uint8array'));
          await w.close();
          const p = Math.round(((i + 1) / chosen.length) * 100);
          fill.style.width = p + '%'; pct.textContent = p + '%';
        }
        fill.classList.add('done');
        addHistory('extract', currentArchiveName, archiveTotal);
        toast(`已解压 ${chosen.length} 个文件到所选文件夹`);
        setTimeout(() => { prog.hidden = true; fill.classList.remove('done'); fill.style.width = '0%'; pct.textContent = '0%'; }, 700);
        return;
      } catch (err) {
        if (err.name === 'AbortError') { prog.hidden = true; return; }
        toast('直写文件夹失败，改为逐一下载');
      }
    }
    // 回退：逐一下载
    for (let i = 0; i < chosen.length; i++) {
      const e = chosen[i];
      const blob = await e.async('blob');
      downloadBlob(blob, e.name.split('/').pop());
      const p = Math.round(((i + 1) / chosen.length) * 100);
      fill.style.width = p + '%'; pct.textContent = p + '%';
    }
    fill.classList.add('done');
    addHistory('extract', currentArchiveName, archiveTotal);
    toast(`已下载 ${chosen.length} 个文件`);
    setTimeout(() => { prog.hidden = true; fill.classList.remove('done'); fill.style.width = '0%'; pct.textContent = '0%'; }, 700);
  }

  $('#extractAll').addEventListener('click', () => {
    fileEntries.forEach((e) => selectedSet.add(e.name));
    extractChosen();
  });
  $('#extractSel').addEventListener('click', extractChosen);
  $('#searchInput').addEventListener('input', (e) => {
    extractFilter = e.target.value.trim();
    renderExtractTree();
  });
  $('#subfolderToggle').addEventListener('change', () => { /* 解压时读取状态 */ });

  /* ================= 校验（MD5 / SHA） ================= */
  const ALG_LABEL = { md5: 'MD5', sha1: 'SHA-1', sha256: 'SHA-256', sha512: 'SHA-512' };
  const COPY_SVG = '<svg viewBox="0 0 24 24"><rect x="9" y="9" width="11" height="11" rx="2.5"/><path d="M6 15H5a2 2 0 01-2-2V5a2 2 0 012-2h8a2 2 0 012 2v1"/></svg>';
  let hashAlg = 'md5';

  const hashInput = $('#hashInput');
  $('#pickHash').addEventListener('click', () => hashInput.click());
  hashInput.addEventListener('change', (e) => { hashFiles(e.target.files); e.target.value = ''; });
  $('#hashAlgSeg').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    hashAlg = b.dataset.v;
    $$('#hashAlgSeg button').forEach((x) => x.classList.remove('active'));
    b.classList.add('active');
    if ($('#hashList').children.length) toast('算法已切换为 ' + ALG_LABEL[hashAlg]);
  });
  bindDrop($('#dropHash'), (files) => hashFiles(files));

  async function hashFiles(files) {
    const arr = Array.from(files);
    if (!arr.length) return;
    const list = $('#hashList');
    list.innerHTML = '';
    for (const f of arr) {
      const card = document.createElement('div');
      card.className = 'hash-card';
      const ic = fileIcon(f.name);
      card.innerHTML =
        `<div class="hash-top">` +
          `<span class="f-ico" style="--tint:${ic.tint}">${ic.svg}</span>` +
          `<span class="f-name">${escapeHtml(f.name)}<span class="f-path"> · ${fmtSize(f.size)}</span></span>` +
          `<button class="hash-copy" title="复制校验值" disabled>${COPY_SVG}</button>` +
        `</div>` +
        `<span class="hash-val">计算中…</span>`;
      list.appendChild(card);
      await new Promise((r) => setTimeout(r, 30)); // 先渲染「计算中…」
      const valEl = card.querySelector('.hash-val');
      const copyBtn = card.querySelector('.hash-copy');
      try {
        const buf = await f.arrayBuffer();
        const u8 = new Uint8Array(buf);
        const hex = hashAlg === 'md5'
          ? ArchiveHash.md5(u8)
          : await ArchiveHash.shaHex('SHA-' + hashAlg.slice(3), u8);
        valEl.textContent = hex;
        copyBtn.disabled = false;
        copyBtn.addEventListener('click', async () => {
          try {
            await navigator.clipboard.writeText(hex);
            toast('校验值已复制');
          } catch (err) { toast('复制失败', 'err'); }
        });
      } catch (err) {
        valEl.textContent = '✗ ' + err.message;
      }
    }
    toast(`已计算 ${arr.length} 个文件的 ${ALG_LABEL[hashAlg]} 校验值`);
  }

  /* ================= 拆分 / 合并 ================= */
  let splitMode = 'split';
  let splitFile = null;
  let splitSize = 52428800;
  let mergeFiles = [];

  $('#splitModeSeg').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    splitMode = b.dataset.v;
    $$('#splitModeSeg button').forEach((x) => x.classList.remove('active'));
    b.classList.add('active');
    $('#splitPanel').hidden = splitMode !== 'split';
    $('#mergePanel').hidden = splitMode !== 'merge';
  });

  const splitInput = $('#splitInput');
  $('#pickSplit').addEventListener('click', () => splitInput.click());
  splitInput.addEventListener('change', (e) => { if (e.target.files[0]) setSplitFile(e.target.files[0]); e.target.value = ''; });
  bindDrop($('#dropSplit'), (files) => { const f = Array.from(files)[0]; if (f) setSplitFile(f); });

  function setSplitFile(f) {
    splitFile = f;
    const list = $('#splitList');
    list.innerHTML = '';
    const ic = fileIcon(f.name);
    const count = Math.ceil(f.size / splitSize);
    const row = document.createElement('div');
    row.className = 'row';
    row.innerHTML =
      `<span class="f-ico" style="--tint:${ic.tint}">${ic.svg}</span>` +
      `<span class="f-name">${escapeHtml(f.name)}</span>` +
      `<span class="f-size">${fmtSize(f.size)}</span>`;
    list.appendChild(row);
    $('#splitInfo').textContent = count > 1 ? `将拆分为 ${count} 个分卷（每个 ${fmtSize(splitSize)}）` : '文件小于分卷大小，无需拆分';
    $('#splitBtn').disabled = count <= 1;
  }

  $('#splitSizeSeg').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    splitSize = parseInt(b.dataset.v, 10);
    $$('#splitSizeSeg button').forEach((x) => x.classList.remove('active'));
    b.classList.add('active');
    if (splitFile) setSplitFile(splitFile);
  });

  $('#splitBtn').addEventListener('click', async () => {
    if (!splitFile) return;
    const count = Math.ceil(splitFile.size / splitSize);
    const btn = $('#splitBtn');
    btn.disabled = true;
    const prog = $('#splitProgress'); prog.hidden = false;
    const fill = $('#splitFill'); const pct = $('#splitPct');
    const base = splitFile.name;
    try {
      for (let i = 0; i < count; i++) {
        const start = i * splitSize;
        const end = Math.min(splitFile.size, start + splitSize);
        const part = splitFile.slice(start, end);
        const num = String(i + 1).padStart(3, '0');
        downloadBlob(part, base + '.part.' + num);
        const p = Math.round(((i + 1) / count) * 100);
        fill.style.width = p + '%'; pct.textContent = p + '%';
        await new Promise((r) => setTimeout(r, 140)); // 让浏览器逐个开始下载
      }
      fill.classList.add('done');
      toast(`已生成 ${count} 个分卷（${base}.part.001 … .part.${String(count).padStart(3, '0')}）`);
    } catch (err) {
      toast('拆分失败：' + err.message, 'err');
    } finally {
      btn.disabled = false;
      setTimeout(() => { prog.hidden = true; fill.classList.remove('done'); fill.style.width = '0%'; pct.textContent = '0%'; }, 900);
    }
  });

  const mergeInput = $('#mergeInput');
  $('#pickMerge').addEventListener('click', () => mergeInput.click());
  mergeInput.addEventListener('change', (e) => { addMergeFiles(e.target.files); e.target.value = ''; });
  bindDrop($('#dropMerge'), (files) => addMergeFiles(files));

  function partIndex(name) {
    const m = name.match(/\.part\.(\d+)/i);
    return m ? parseInt(m[1], 10) : null;
  }

  function addMergeFiles(files) {
    mergeFiles = mergeFiles.concat(Array.from(files));
    const seen = new Set(); const dedup = [];
    for (const f of mergeFiles) {
      const k = f.name + '|' + f.size;
      if (seen.has(k)) continue;
      seen.add(k); dedup.push(f);
    }
    mergeFiles = dedup;
    renderMerge();
  }

  function renderMerge() {
    const list = $('#mergeList');
    list.innerHTML = '';
    mergeFiles.slice()
      .sort((a, b) => (partIndex(a.name) || 0) - (partIndex(b.name) || 0))
      .forEach((f, i) => {
        const row = document.createElement('div');
        row.className = 'row';
        const ic = fileIcon(f.name);
        const idx = partIndex(f.name);
        row.innerHTML =
          `<span class="order-badge">${idx != null ? idx : i + 1}</span>` +
          `<span class="f-ico" style="--tint:${ic.tint}">${ic.svg}</span>` +
          `<span class="f-name">${escapeHtml(f.name)}</span>` +
          `<span class="f-size">${fmtSize(f.size)}</span>` +
          `<button class="f-del" title="移除">×</button>`;
        row.querySelector('.f-del').addEventListener('click', () => {
          mergeFiles.splice(mergeFiles.indexOf(f), 1);
          renderMerge();
        });
        list.appendChild(row);
      });
    const total = mergeFiles.reduce((s, f) => s + f.size, 0);
    $('#mergeInfo').textContent = mergeFiles.length
      ? `${mergeFiles.length} 个分卷 · 共 ${fmtSize(total)}（按序号排序）`
      : '尚未选择分卷';
    $('#mergeBtn').disabled = mergeFiles.length === 0;
  }

  $('#mergeBtn').addEventListener('click', async () => {
    if (!mergeFiles.length) return;
    const sorted = mergeFiles.slice().sort((a, b) => (partIndex(a.name) || 0) - (partIndex(b.name) || 0));
    const btn = $('#mergeBtn');
    btn.disabled = true;
    const prog = $('#mergeProgress'); prog.hidden = false;
    const fill = $('#mergeFill'); const pct = $('#mergePct');
    const outName = (sorted[0].name.replace(/\.part\.\d+$/i, '') || 'merged.bin').trim();
    const bufs = [];
    try {
      for (let i = 0; i < sorted.length; i++) {
        bufs.push(await sorted[i].arrayBuffer());
        const p = Math.round(((i + 1) / sorted.length) * 100);
        fill.style.width = p + '%'; pct.textContent = p + '%';
      }
      const blob = new Blob(bufs);
      downloadBlob(blob, outName);
      fill.classList.add('done');
      toast(`已合并还原为 ${outName}（${fmtSize(blob.size)}）`);
    } catch (err) {
      toast('合并失败：' + err.message, 'err');
    } finally {
      btn.disabled = false;
      setTimeout(() => { prog.hidden = true; fill.classList.remove('done'); fill.style.width = '0%'; pct.textContent = '0%'; }, 900);
    }
  });

  // 初始化
  renderCompress();
})();
