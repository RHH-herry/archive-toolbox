<div align="center">

# 🗜 归档 · 压缩与解压

**Archive Toolbox — 拖进来就能压 / 解，文件全程留在你电脑上。**

*A ZIP tool that never uploads your files. Everything runs in your browser.*

[![Version](https://img.shields.io/badge/version-1.0.0-3b82f6?style=flat-square)](https://github.com/RHH-herry/archive-toolbox/releases/latest)
[![License](https://img.shields.io/badge/license-MIT-22c55e?style=flat-square)](LICENSE)
[![CI](https://img.shields.io/github/actions/workflow/status/RHH-herry/archive-toolbox/ci.yml?branch=main&style=flat-square&label=CI)](https://github.com/RHH-herry/archive-toolbox/actions)
[![Tests](https://img.shields.io/badge/tests-42%20passing-22c55e?style=flat-square)](test/functional.js)
[![Stars](https://img.shields.io/github/stars/RHH-herry/archive-toolbox?style=flat-square&color=f59e0b)](https://github.com/RHH-herry/archive-toolbox/stargazers)
[![Zero Upload](https://img.shields.io/badge/upload-0%20bytes-ef4444?style=flat-square)](#-隐私--privacy)

### [🌐 立即在线体验](https://rhh-herry.github.io/archive-toolbox/) · [⬇️ 下载 Windows 桌面版](https://github.com/RHH-herry/archive-toolbox/releases/latest)

</div>

---

## 为什么再造一个解压工具

搜「在线解压」，出来的站点几乎都要你先把压缩包**传到它服务器**。里面可能有合同、身份证扫描件、公司代码 —— 你不知道它存了多久、给谁看了。

装个客户端呢？WinRAR 弹窗、7-Zip 界面停留在 2005 年、某些国产工具捆绑全家桶。

**这个项目：浏览器打开就能用，文件一个字节都不上传，界面是 2026 年的样子，MIT 开源，代码你随时可以审。**

> Search "online unzip" and nearly every result uploads your archive to their server. This one doesn't — pure browser-side ZIP handling, zero upload, MIT licensed.

## ✨ 功能 / Features

### 📦 压缩

- 拖入**文件或整个文件夹**，打包成 `.zip`，**保留完整目录结构**
- 四级压缩比：无压缩 / 快速 / 标准 / 最大
- **真实体积预估**：不是拍脑袋估算，而是用 JSZip 按当前级别实际跑一遍，给出压缩后体积与节省率
- 自定义输出文件名

### 📂 解压

- 读取 `.zip`，**树形浏览**归档内容，支持关键词搜索筛选
- 勾选部分文件解压，或一键全部解压
- **直接写入你选择的系统文件夹**（File System Access API）—— 不是一个个下载到「下载」目录再手动挪
- 不支持该 API 的浏览器（Firefox / Safari）自动回退为逐一下载，功能不缺失
- 可选解压到以压缩包命名的子文件夹，避免文件散落

### 🔐 校验

- MD5 / SHA-1 / SHA-256 / SHA-512 四种算法
- 用来验证下载的文件有没有被篡改或传输损坏

### ✂️ 拆分 / 合并

- 大文件按 10 / 50 / 100 / 500 MB 拆成分卷（邮件附件、网盘单文件限制场景）
- 分卷**直接写入所选文件夹**，按序号自动排序合并还原

### 🎨 体验

- **最近记录**：本地保存最近的压缩 / 解压任务，一键回到对应功能
- **深浅双主题**：记忆偏好
- **桌面版窗口**：macOS 风格左侧红绿灯（关闭 / 最小化 / 最大化还原），整窗圆角无阴影垫，最大化自动去圆角

## 🚀 三种用法 / Three Ways to Use

### 1. 在线版（最快）

👉 **<https://rhh-herry.github.io/archive-toolbox/>**

打开就是完整应用，不用装任何东西。

### 2. 本地文件（最彻底的离线）

```bash
git clone https://github.com/RHH-herry/archive-toolbox.git
cd archive-toolbox
# 双击 index.html 即可，不需要 Node、不需要构建
```

### 3. Windows 桌面版

到 [Releases](https://github.com/RHH-herry/archive-toolbox/releases/latest) 下载 NSIS 中文安装向导版。含开始菜单 / 桌面快捷方式，可正常卸载。

## 🩺 故障排除 / Troubleshooting

**窗口出现黑边、闪烁，或整个窗口不显示？**

桌面版默认使用透明窗口来实现「只留圆角、下方无衬垫」的外观。少数显卡 / 驱动组合对透明窗口支持不佳。用**不透明模式**启动即可：

```bat
:: 方式一：命令行参数
"%LOCALAPPDATA%\Programs\归档\归档.exe" --opaque

:: 方式二：环境变量（对所有启动方式生效）
setx ARCHIVE_OPAQUE 1
```

也可以右键桌面快捷方式 → 属性 → 在「目标」末尾加上一个空格和 `--opaque`。

**窗口在虚拟机 / 远程桌面里渲染异常？** 追加 `--disable-gpu` 关闭硬件加速。

## 🌍 浏览器支持 / Browser Support

| 浏览器 | 压缩 / 解压 | 直写文件夹 | 说明 |
|:--|:--:|:--:|:--|
| Chrome 90+ | ✅ | ✅ | 完整体验 |
| Edge 90+ | ✅ | ✅ | 完整体验 |
| Firefox 90+ | ✅ | ⚠️ | 回退为逐一下载 |
| Safari 15+ | ✅ | ⚠️ | 回退为逐一下载 |

「直写文件夹」依赖 [File System Access API](https://developer.mozilla.org/docs/Web/API/File_System_API)，目前仅 Chromium 系支持。不支持时功能不缺失，只是要从「下载」目录取文件。

## 🔒 隐私 / Privacy

| 承诺 | 如何验证 |
|:--|:--|
| 不上传任何文件 | F12 → Network 面板，压缩解压全程无请求 |
| 无遥测 / 无埋点 | 源码全公开，CI 中有自动检查 |
| 不引外部 CDN | JSZip 在 `vendor/` 本地引入 |
| 桌面版安全基线 | `contextIsolation: true` + `nodeIntegration: false`，能力经 `preload.js` 白名单暴露 |

详见 [SECURITY.md](SECURITY.md)，含完整威胁模型。

## 🧪 测试 / Testing

```bash
npm install     # 只装 jsdom 等测试依赖
npm test        # 42 项功能测试
```

**不是 mock 测试**：压缩解压走真实 JSZip，哈希比对标准测试向量。覆盖范围：

- 视图切换、主题切换、最近记录
- Electron 红绿灯 IPC 调用顺序、最大化状态同步、`aria-label` 无障碍属性
- 拖拽入列、移除、体积预估、进度条状态机
- **真实 ZIP 产出**与文件名/大小断言
- 解压树渲染、选择性解压
- **MD5 `900150983cd24fb0d6963f7d28e17f72`、SHA-256 `ba7816bf…` 标准向量**
- 15MB 文件按 10MB 拆成 2 卷、按序合并还原
- **web 降级模式**下的窗口行为（保证在线版不依赖 Electron）

## 🛠 技术栈 / Tech Stack

- **前端**：纯静态 HTML / CSS / JS，零构建、零框架
- **ZIP**：[JSZip](https://stuk.github.io/jszip/)（本地 `vendor/jszip.min.js`）
- **哈希**：Web Crypto API + 自实现 MD5
- **桌面**：Electron 33 + electron-builder（NSIS）
- **测试**：jsdom 驱动的 42 项功能测试

同一份前端代码跑两种形态 —— `app.js` 通过 `typeof window.electronAPI !== 'undefined'` 判断环境自动适配。

## 🤝 参与贡献 / Contributing

见 [CONTRIBUTING.md](CONTRIBUTING.md)，里面有开发约定、测试要求和关键设计约束。

> 底线：**任何引入上传、遥测、第三方分析的 PR 都不会被合并。**

- 🐛 [报告 Bug](https://github.com/RHH-herry/archive-toolbox/issues/new?template=bug_report.yml)
- ✨ [提功能建议](https://github.com/RHH-herry/archive-toolbox/issues/new?template=feature_request.yml)
- 📖 [行为准则](CODE_OF_CONDUCT.md) · [更新日志](CHANGELOG.md) · [安全策略](SECURITY.md)

## 🗺 路线图 / Roadmap

- [ ] 7z / tar.gz 读取支持
- [ ] 压缩包内文件预览（文本 / 图片）
- [ ] 密码保护的 ZIP
- [ ] macOS / Linux 桌面版打包

## 🔗 姊妹项目 / Related

| 项目 | 说明 |
|:--|:--|
| [效率工具箱](https://github.com/RHH-herry/efficiency-toolbox) | 40 个离线小工具合集：图片压缩、JSON 格式化、正则测试、二维码、哈希计算等（MIT 开源） |
| [FileOrganizer Pro](https://github.com/RHH-herry/FileOrganizer-Pro) | Windows 智能文件整理工具（免费下载） |

## 📄 许可证 / License

[MIT](LICENSE) © 2026 RHH-herry — 可免费商用、修改、再分发，保留版权声明即可。

---

<div align="center">

**觉得有用的话，点个 ⭐ Star 呗**

[![Star History Chart](https://api.star-history.com/svg?repos=RHH-herry/archive-toolbox&type=Date)](https://star-history.com/#RHH-herry/archive-toolbox&Date)

</div>
