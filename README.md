# Gemini URL 快捷打开

一个支持 Chrome/Firefox 的浏览器扩展：点击图标即可把当前页面 URL 发送到 Gemini，并按 URL 规则附加自定义 Prompt。

## 技术栈

- Manifest V3
- [extension.js](https://github.com/extension-js/extension.js)（统一开发/构建）

## 开发与构建

安装依赖：

```bash
npm install
```

本地开发（默认 Chrome）：

```bash
npm run dev
```

指定 Firefox 开发：

```bash
npx extension dev --browser=firefox --polyfill
```

构建两个浏览器：

```bash
npm run build
```

仅构建 Chrome：

```bash
npm run build:chrome
```

仅构建 Firefox：

```bash
npm run build:firefox
```

## 项目结构

```text
.
├── manifest.json      # 统一清单（含 extension.js 浏览器前缀字段）
├── background.js
├── content.js
├── options.html
├── options.js
├── icons/
└── dist/              # extension.js 构建产物
```

## 浏览器差异处理

在 `manifest.json` 中使用 extension.js 的浏览器前缀字段：

- `background.service_worker` 作为 Chromium 默认实现
- `firefox:background.scripts` 覆盖 Firefox 后台脚本配置
- `firefox:browser_specific_settings` 提供 Gecko 扩展 ID

运行时 API 统一使用 `browser.*`。项目脚本已显式开启 extension.js 的 `--polyfill` 选项，确保 Chromium 与 Firefox 行为一致。

## 功能说明

- 点击工具栏图标：打开 Gemini 并携带 `当前 URL + 匹配到的 Prompt`
- 快捷键命令：`open-gemini`
- 选项页：按顺序配置 URL 规则（支持通用 URL 匹配模式；也支持直接写域名如 `github.com`，会自动按 `*://github.com/*` 匹配），支持默认规则

## 许可证

MIT
