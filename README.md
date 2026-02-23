# Gemini URL 快捷打开

- 点击工具栏图标 → 将当前网页发送给Gemini分析
- 在插件选项中，添加Prompt提示词、URL规则、CSS选择器（可选）。CSS选择器为空时发送URL，非空则抽取文本发送。

## 安装

```bash
git clone https://github.com/smilingpoplar/gemini-url-quickopen.git
cd gemini-url-quickopen
npm install
npm run build
```

### Chrome

1. 打开 `chrome://extensions/`
2. 开启「开发者模式」
3. 点击「加载已解压的扩展程序」
4. 选择 `./dist/chrome`

### Firefox（临时）

1. 打开 `about:debugging#/runtime/this-firefox`
2. 点击「临时加载附加组件...」
3. 选择 `./dist/firefox/manifest.json`

### Firefox（永久）

1. 下载 [Firefox 开发者版](https://www.mozilla.org/firefox/developer/)
2. 打开 `about:addons`
3. 点击齿轮 →「从文件安装附加组件」
4. 选择 `./dist/firefox/gemini-url-1.0.0.zip`
