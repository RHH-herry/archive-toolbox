# 更新日志 / Changelog

本项目所有值得注意的变更都记录在此文件。

格式遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

---

## [Unreleased]

### 计划中

- 支持 7z / tar.gz 读取
- 压缩包内文件预览（文本 / 图片）
- 密码保护的 ZIP 支持

---

## [1.0.0] - 2026-08-08

首个正式版本。序列号 `AT-1.0.0-20260808-001`，构建号 `2026.08.08.001`。

### 新增

- **ZIP 压缩**：拖入文件或整个文件夹打包为 `.zip`，保留目录结构；提供无压缩 / 快速 / 标准 / 最大四级压缩比
- **真实体积预估**：用 JSZip 按当前级别实际跑一遍，给出压缩后体积与节省率，而非估算
- **ZIP 解压**：树形浏览归档内容、关键词搜索筛选、勾选部分或全部解压
- **直写系统文件夹**：优先使用 File System Access API 直接写入用户选择的目录；不支持的浏览器自动回退为逐一下载
- **完整性校验**：MD5 / SHA-1 / SHA-256 / SHA-512 四种算法
- **分卷拆分与合并**：大文件按 10 / 50 / 100 / 500 MB 拆成分卷，按序号合并还原
- **最近记录**：本地保存最近的压缩 / 解压任务，可一键回到对应功能
- **深浅双主题**：跟随偏好记忆
- **Windows 桌面版**：Electron 33 + electron-builder（NSIS 中文安装向导），macOS 风格左侧红绿灯、整窗圆角、启动动画
- **在线版**：GitHub Pages 部署，浏览器打开即用
- 42 项自动化功能测试（`test/functional.js`，jsdom 驱动，覆盖真实 JSZip 压缩解压与标准哈希向量）
- 安全文档 [SECURITY.md](SECURITY.md)：本地优先架构、Electron 安全基线、威胁模型
- 版本元数据文件 [VERSION](VERSION)

### 变更

- 分卷拆分从「逐个下载」改为「直写所选文件夹」，不支持时回退下载（`cec03f3`）
- 主窗口恢复为不透明渲染 —— 透明窗口在部分显卡驱动下渲染异常（`9fe8083`）
- 窗口实现「只留圆角、下方零衬垫」，去掉阴影垫片（`fbd2571`）
- NSIS 安装向导全面中文化

### 修复

- 启动动画时长调整为 2.4s，避免主窗口未就绪时闪烁
- 红绿灯按钮提示文字重做，最大化状态下绿灯提示同步为「还原」，`aria-label` 一并更新

### 安全

- Electron 渲染进程强制 `contextIsolation: true` + `nodeIntegration: false`
- 全部能力经 `preload.js` 的 `contextBridge` 白名单暴露，渲染层无法直接触达 Node
- JSZip 本地内置于 `vendor/`，不引用任何外部 CDN
- 全程零网络请求，文件不上传

---

[Unreleased]: https://github.com/RHH-herry/archive-toolbox/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/RHH-herry/archive-toolbox/releases/tag/v1.0.0
