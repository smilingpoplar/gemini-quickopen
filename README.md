# Gemini URL Chrome 扩展

一个简洁的 Chrome 浏览器插件，点击图标即可将当前网页 URL 发送到 Gemini 进行分析。

## 功能特点

- 一键获取当前网页 URL 并在 Gemini 中打开
- 可自定义 Prompt，灵活控制分析需求
- 美观的设置页面，实时预览效果
- 使用 Chrome Manifest V3 标准

## 安装方法

### 开发者模式安装

1. 下载本项目的所有文件
2. 打开 Chrome 浏览器，进入 `chrome://extensions/`
3. 开启右上角的「开发者模式」
4. 点击「加载已解压的扩展程序」
5. 选择本项目文件夹
6. 安装成功！你会在 Chrome 工具栏看到插件图标

### 生成图标（可选）

如果图标文件夹为空，请运行：

```bash
node generate-icons.js
```

这将自动生成所需的图标文件。

## 使用方法

1. **点击图标**: 在任意网页点击插件图标，会自动打开 Gemini 并附带当前页面 URL
2. **自定义设置**: 
   - 右键点击插件图标 → 「选项」
   - 或者在 `chrome://extensions/` 中找到本插件，点击「详细信息」→ 「扩展程序选项」
3. 在设置页面修改 Prompt，例如：
   - `请分析这个网页: `
   - `总结这篇文章的主要内容: `
   - `请检查这个页面的安全问题: `

## 文件结构

```
gemini-chrome-extension/
├── manifest.json      # 插件配置文件
├── background.js      # 后台脚本，处理点击事件
├── options.html       # 设置页面
├── options.js         # 设置页面逻辑
├── generate-icons.js  # 图标生成脚本
├── icons/             # 图标文件夹
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
└── README.md          # 说明文档
```

## 技术说明

- **Manifest Version**: 3
- **权限**: 
  - `activeTab`: 获取当前标签页信息
  - `storage`: 保存用户设置
- **API**: 
  - Chrome Action API (处理图标点击)
  - Chrome Storage API (保存用户设置)
  - Chrome Tabs API (打开新标签页)

## 自定义开发

### 修改默认 Prompt

编辑 `background.js` 中的 `DEFAULT_PROMPT` 常量：

```javascript
const DEFAULT_PROMPT = "你的默认提示词";
```

### 修改目标 URL

编辑 `background.js` 中的 `geminiUrl` 构建逻辑：

```javascript
const geminiUrl = `https://gemini.google.com/app?q=${encodeURIComponent(prompt + currentUrl)}`;
```

## 注意事项

1. 需要登录 Google 账号才能使用 Gemini
2. 插件需要访问当前标签页的权限
3. 设置会自动同步到 Google 账号（如果开启了 Chrome 同步）

## 许可证

MIT License
