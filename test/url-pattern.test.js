import test from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizeUrlPatternInput,
  urlMatchPatternToRegex,
  matchRule
} from '../src/url-pattern.js';
import { DEFAULT_PROMPT } from '../src/constants.js';

test('normalizeUrlPatternInput should auto-complete bare domains', () => {
  assert.equal(normalizeUrlPatternInput('github.com'), '*://github.com/*');
  assert.equal(normalizeUrlPatternInput('*.youtube.com'), '*://*.youtube.com/*');
});

test('normalizeUrlPatternInput should keep scheme and append path wildcard when missing', () => {
  assert.equal(normalizeUrlPatternInput('https://github.com'), 'https://github.com/*');
  assert.equal(normalizeUrlPatternInput('https://github.com/*'), 'https://github.com/*');
  assert.equal(normalizeUrlPatternInput('wallstreetcn.com/livenews'), '*://wallstreetcn.com/livenews*');
});

test('urlMatchPatternToRegex should match wildcard scheme and host patterns', () => {
  const regex = urlMatchPatternToRegex('*.youtube.com');
  assert.ok(regex);
  assert.equal(regex.test('https://youtube.com/watch?v=1'), true);
  assert.equal(regex.test('http://m.youtube.com/watch?v=1'), true);
  assert.equal(regex.test('https://example.com'), false);
});

test('urlMatchPatternToRegex should match path prefix when path has no wildcard', () => {
  const regex = urlMatchPatternToRegex('wallstreetcn.com/livenews');
  assert.ok(regex);
  assert.equal(regex.test('https://wallstreetcn.com/livenews'), true);
  assert.equal(regex.test('https://wallstreetcn.com/livenews/3055332'), true);
  assert.equal(regex.test('https://wallstreetcn.com/livenews?from=home'), true);
});

test('urlMatchPatternToRegex should return null for invalid pattern', () => {
  const regex = urlMatchPatternToRegex('*foo*');
  assert.equal(regex, null);
});

test('matchRule should return first matched rule by order', () => {
  const rules = [
    { id: '1', urlPattern: '*.github.com\nexample.com', prompt: 'rule-1' },
    { id: '2', urlPattern: 'github.com', prompt: 'rule-2' },
    { id: '3', urlPattern: '*', prompt: 'default' }
  ];

  const matched = matchRule('https://docs.github.com/en', rules);
  assert.equal(matched.prompt, 'rule-1');
});

test('matchRule should fallback to default rule', () => {
  const rules = [
    { id: '1', urlPattern: 'github.com', prompt: 'rule-1' },
    { id: '2', urlPattern: '*', prompt: 'default', cssSelector: '#app' }
  ];

  const matched = matchRule('https://news.ycombinator.com', rules);
  assert.equal(matched.prompt, 'default');
  assert.equal(matched.cssSelector, '');
});

test('matchRule should fallback to hardcoded default when no default rule', () => {
  const rules = [
    { id: '1', urlPattern: 'github.com', prompt: 'rule-1' }
  ];

  const matched = matchRule('https://news.ycombinator.com', rules);
  assert.equal(matched.prompt, DEFAULT_PROMPT);
  assert.equal(matched.cssSelector, '');
});
