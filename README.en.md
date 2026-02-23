# Gemini URL QuickOpen

- Click toolbar icon → Send current webpage to Gemini for analysis
- In extension options, add Prompt, URL rules, and CSS selector (optional). Empty CSS selector sends URL, non-empty extracts text and sends.

## Install

```bash
git clone https://github.com/smilingpoplar/gemini-url-quickopen.git
cd gemini-url-quickopen
npm install
npm run build
```

### Chrome

1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select `dist/chrome`

### Firefox (Temporary)

1. Open `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on..."
3. Select `dist/firefox/manifest.json`

### Firefox (Permanent)

1. Download [Firefox Developer Edition](https://www.mozilla.org/firefox/developer/)
2. Open Developer Edition `about:addons`
3. Click gear → "Install Add-on From File"
4. Select `dist/firefox/gemini-url-1.0.0.zip`
