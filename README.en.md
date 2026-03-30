# Gemini QuickOpen

- Pre-warm Gemini in the background to speed up opening
- Click toolbar icon → Send current webpage to Gemini for analysis
- In the extension options, add Prompt, URL rules, and CSS selector (optional). If the CSS selector is empty, the URL will be sent; if not empty, text will be extracted simultaneously.

## Install

```bash
git clone https://github.com/smilingpoplar/gemini-quickopen.git
cd gemini-quickopen
pnpm install
pnpm build
```

### Chrome

1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked extension"
4. Select `./dist/chrome-mv3`

### Firefox (Temporary)

1. Open `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on..."
3. Select `./dist/firefox-mv2/manifest.json`

### Firefox (Permanent)

1. Download [Firefox Developer Edition](https://www.mozilla.org/firefox/developer/)
2. Open `about:addons`
3. Click gear → "Install Add-on From File"
4. Select the generated zip under `./dist/*-firefox.zip`
