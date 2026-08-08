# 贡献指南 / Contributing

感谢你愿意为 **归档 · 压缩与解压** 出一份力。这份文档说明了参与本项目的具体方式。

---

## 目录

- [行为准则](#行为准则)
- [我能做什么](#我能做什么)
- [提交 Issue](#提交-issue)
- [本地开发](#本地开发)
- [运行测试](#运行测试)
- [代码风格](#代码风格)
- [提交 Pull Request](#提交-pull-request)
- [Commit 规范](#commit-规范)
- [版本与发布](#版本与发布)

---

## 行为准则

参与本项目即表示你同意遵守 [行为准则](CODE_OF_CONDUCT.md)。

## 我能做什么

不写代码也能帮上忙：

| 方式 | 难度 | 说明 |
|---|---|---|
| 报告 Bug | ⭐ | 遇到问题就开 Issue，附上浏览器版本与复现步骤 |
| 补充文档 | ⭐ | README 表述不清、缺少示例，都欢迎改 |
| 翻译 | ⭐⭐ | 界面文案与文档的英文/其他语言版本 |
| 提交新工具 / 新功能 | ⭐⭐⭐ | 见下方「本地开发」 |
| 性能优化 | ⭐⭐⭐ | 大文件处理、内存占用等 |
| 兼容性测试 | ⭐⭐ | 在冷门浏览器/系统上跑一遍并反馈 |

## 提交 Issue

开 Issue 前请先：

1. 在 [已有 Issue](https://github.com/RHH-herry/archive-toolbox/issues?q=is%3Aissue) 里搜一下，避免重复
2. 用对应的模板（Bug 报告 / 功能建议）
3. Bug 报告务必包含：**操作系统 + 浏览器及版本 + 复现步骤 + 期望结果 + 实际结果**；控制台报错请截图或贴文本

> 安全漏洞请**不要**公开提 Issue，按 [SECURITY.md](SECURITY.md) 中的流程私下披露。

## 本地开发

### 环境要求

- **Node.js 22.22.2 或更高**（仅用于跑测试和打包桌面版；网页版本身不需要 Node）
  - 测试依赖 `jsdom@30`，其 `engines` 为 `^22.22.2 || ^24.15.0 || >=26.0.0`，**Node 20 及以下无法运行测试**（会报 `webidl.util.markAsUncloneable is not a function`）
- Git

### 起步

```bash
git clone https://github.com/RHH-herry/archive-toolbox.git
cd archive-toolbox
# 网页版：不需要任何构建，直接用浏览器打开
start index.html          # Windows
open  index.html          # macOS

# 桌面版开发（需要 Node）
npm install
npm start                 # 启动 Electron
```

### 项目结构

```
archive-toolbox/
├── index.html            # 应用主页面（网页版入口，也是 Electron 渲染进程页面）
├── app.js                # 全部业务逻辑（压缩/解压/校验/拆分合并/最近记录/主题）
├── styles.css            # 主样式
├── splash.html/.css      # 桌面版启动动画
├── main.js               # Electron 主进程（窗口、IPC）
├── preload.js            # contextBridge 安全桥接，暴露最小 electronAPI
├── vendor/
│   ├── jszip.min.js      # ZIP 编解码（本地引入，不走 CDN）
│   └── hash.js           # 哈希实现
├── test/functional.js    # 42 项功能测试（jsdom 驱动）
├── VERSION               # 版本 / 构建号 / 序列号
└── package.json          # Electron + electron-builder 配置
```

### 关键设计约束

1. **同一份前端跑两种形态**。`app.js` 通过 `const isElectron = typeof window.electronAPI !== 'undefined'` 判断运行环境：
   - Electron 下走 IPC 调窗口控制、用 Node 能力
   - 浏览器下自动降级（窗口按钮变成 CSS 动画演示、文件写入回退为下载）

   **改动涉及 Electron API 时，务必确认浏览器分支也能正常工作**，否则在线版会白屏。

2. **解压优先直写文件夹**。使用 File System Access API（`showDirectoryPicker`）直接写入用户选择的目录；不支持的浏览器（Firefox / Safari）自动回退为逐一下载。新增文件输出功能请复用 `app.js` 中已有的写入抽象，不要各写各的。

3. **Electron 安全基线不可降级**：`contextIsolation: true`、`nodeIntegration: false`、`sandbox` 相关配置见 `main.js`。渲染进程不允许直接访问 Node，所有能力经 `preload.js` 的 `contextBridge` 白名单暴露。

4. **零外部请求**。JSZip 已放入 `vendor/`，不要改成 CDN 引入。

## 运行测试

```bash
# 安装测试依赖（jsdom）
npm install

# 跑 42 项功能测试
npm test
# 等价于 node test/functional.js
```

测试覆盖：视图切换、主题切换、Electron 红绿灯 IPC 顺序与最大化状态同步、拖拽入列、体积预估、**真实 JSZip 压缩产出**、解压树渲染与选择性解压、**MD5/SHA-256 标准向量校验**、15MB 文件按 10MB 分卷拆分与按序合并还原、最近记录、以及 web 降级模式下的窗口行为。

这些不是 mock —— 压缩解压走的是真实 JSZip，哈希比对的是标准测试向量。

**提交 PR 前必须保证测试全绿。** CI 会在 Node 22 / 24 两个版本上自动跑一遍。

## 代码风格

本项目**刻意不引入构建工具和 Lint 配置**，保持「克隆下来双击就能跑」。因此风格靠约定：

- 缩进 2 空格，不用 Tab
- 字符串优先单引号（HTML 属性用双引号）
- 语句结尾加分号
- 变量/函数用 `camelCase`，常量用 `UPPER_SNAKE`，DOM id 用 `camelCase`
- 中文注释，说明「为什么」而不是「是什么」
- **不要引入外部 CDN**：任何第三方库必须放进 `vendor/` 本地引入，这是隐私承诺的一部分
- **不要加入任何网络请求、遥测、埋点、分析脚本** —— 含此类代码的 PR 会被直接关闭

## 提交 Pull Request

1. Fork 本仓库，从 `main` 切出分支：`git checkout -b feat/your-feature`
2. 完成修改，**跑通测试**
3. 按 [Commit 规范](#commit-规范) 提交
4. 推到你的 Fork，开 PR 到本仓库 `main`
5. 在 PR 描述里说明：改了什么、为什么改、怎么验证

PR 检查清单：

- [ ] 测试通过
- [ ] 没有引入外部网络请求 / CDN / 遥测
- [ ] 没有引入新的运行时依赖（如确有必要，请在 PR 中说明理由）
- [ ] 在 Chrome 和 Firefox 上各手动验证过一次
- [ ] 相关文档（README / CHANGELOG）已同步更新

## Commit 规范

采用 [Conventional Commits](https://www.conventionalcommits.org/zh-hans/)：

```
<type>(<scope>): <简短描述>
```

常用 type：

| type | 用途 |
|---|---|
| `feat` | 新功能 |
| `fix` | 修 Bug |
| `docs` | 只改文档 |
| `style` | 不影响逻辑的格式调整 |
| `refactor` | 重构（既不加功能也不修 Bug） |
| `perf` | 性能优化 |
| `test` | 增删测试 |
| `chore` | 构建/工具链/杂项 |

示例：

```
feat(image): 图片压缩支持 AVIF 输出
fix(zip): 修复中文文件名在 Safari 下乱码
docs: 补充离线使用说明
```

## 版本与发布

- 遵循 [语义化版本](https://semver.org/lang/zh-CN/)：`MAJOR.MINOR.PATCH`
- 版本号、构建号、序列号统一记录在 [`VERSION`](VERSION) 文件
- 每次发布同步更新 [`CHANGELOG.md`](CHANGELOG.md)
- 发布由维护者打 tag（`v1.2.3`）后创建 GitHub Release

---

再次感谢。哪怕只是改了一个错别字，也是实实在在的贡献。
