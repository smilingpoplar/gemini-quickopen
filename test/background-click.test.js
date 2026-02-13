import test from 'node:test';
import assert from 'node:assert/strict';

function createMockBrowser({ currentUrl, urlPatterns }) {
  const events = {
    onInstalled: null,
    onClicked: null,
    onCommand: null
  };
  const createdTabs = [];

  const storageSync = {
    get(keys, callback) {
      const result = { urlPatterns };
      if (typeof callback === 'function') {
        callback(result);
        return;
      }
      return Promise.resolve(result);
    },
    set() {
      return Promise.resolve();
    }
  };

  return {
    browser: {
      runtime: {
        onInstalled: {
          addListener(listener) {
            events.onInstalled = listener;
          }
        }
      },
      action: {
        onClicked: {
          addListener(listener) {
            events.onClicked = listener;
          }
        }
      },
      commands: {
        onCommand: {
          addListener(listener) {
            events.onCommand = listener;
          }
        }
      },
      storage: {
        sync: storageSync
      },
      tabs: {
        query() {
          return Promise.resolve([{ id: 1, url: currentUrl }]);
        },
        create(payload) {
          createdTabs.push(payload);
          return Promise.resolve(payload);
        }
      }
    },
    events,
    createdTabs
  };
}

test('click action should use matched configured prompt for wallstreetcn livenews page', async () => {
  const mock = createMockBrowser({
    currentUrl: 'https://wallstreetcn.com/livenews/3055332',
    urlPatterns: [
      { id: '1', urlPattern: 'wallstreetcn.com/livenews', cssSelector: '', prompt: '按我的配置总结要点' },
      { id: '2', urlPattern: '*', cssSelector: '', prompt: '请总结' }
    ]
  });

  globalThis.browser = mock.browser;
  globalThis.chrome = undefined;

  await import(`../background.js?test_click=${Date.now()}`);

  assert.equal(typeof mock.events.onClicked, 'function');
  await mock.events.onClicked({ id: 1 });

  assert.equal(mock.createdTabs.length, 1);
  const geminiUrl = new URL(mock.createdTabs[0].url);
  const query = decodeURIComponent(geminiUrl.searchParams.get('q'));

  assert.equal(
    query,
    'https://wallstreetcn.com/livenews/3055332\n按我的配置总结要点'
  );

  delete globalThis.browser;
  delete globalThis.chrome;
});
