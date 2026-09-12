import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(process.env.PLAYWRIGHT_PACKAGE || 'C:/Users/29707/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const { chromium } = require('playwright');
const browser = await chromium.launch({ executablePath: process.env.BROWSER_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await context.newPage();
page.setDefaultTimeout(12000);
const base = process.env.APP_BASE_URL || 'http://127.0.0.1:5187/';
const url = route => new URL(`#${route}`, base).href;
const output = `test-results/${base.includes('4173') ? 'production' : 'development'}`;
const errors = [], report = [];
page.on('pageerror', error => errors.push(error.message));
await fs.mkdir(output, { recursive: true });
const button = name => page.getByRole('button', { name, exact: true });
const enter = name => button(`进入这个世界：${name}`);
async function selected(name) {
  await page.locator('.theme-selector[data-busy="false"]').waitFor();
  await enter(name).waitFor();
  assert.equal(await page.getByRole('heading', { level: 2 }).count(), 1);
  assert.equal(await page.locator('.theme-face').count(), 1);
}
async function noOverflow(label) {
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, label);
}

try {
  await page.goto(url('/'));
  await page.getByRole('heading', { name: '节奏康复', exact: true }).waitFor();
  assert.equal(await page.locator('.site-header, .site-footer').count(), 0);
  assert.equal(await page.locator('main a').count(), 2);
  await page.getByRole('link', { name: '过往记录', exact: true }).click();
  await page.getByRole('heading', { name: '第一段节奏，等你开启' }).waitFor();
  assert.equal(await page.getByText('2026 复客松').count(), 0);
  await page.getByRole('link', { name: '治疗师入口' }).waitFor();
  await page.getByRole('link', { name: '去选一个喜欢的世界' }).click();
  await selected('萌宠互动');
  await page.getByRole('link', { name: '返回', exact: true }).click();
  await page.waitForURL(url('/'));
  await page.getByRole('link', { name: '开始', exact: true }).click();
  await selected('萌宠互动');
  report.push('Launch, history, empty history CTA and explicit back links work.');

  await button('下一个主题').click();
  await page.waitForTimeout(220);
  await page.screenshot({ path: `${output}/cube-midpoint.png` });
  await selected('花园养成');
  await button('选择星空旅行').click();
  await selected('星空旅行');
  await button('下一个主题').click();
  await selected('萌宠互动');
  await button('上一个主题').click();
  await selected('星空旅行');
  await button('下一个主题').focus();
  await page.keyboard.press('ArrowRight');
  await selected('萌宠互动');
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('aria-label')), '下一个主题');

  // Both events occur before React has a chance to paint disabled feedback.
  await button('下一个主题').evaluate(node => { node.click(); node.click(); });
  await page.locator('.theme-enter').evaluate(node => node.click());
  assert.equal(page.url(), url('/themes'));
  await selected('花园养成');
  await button('下一个主题').click();
  await page.setViewportSize({ width: 410, height: 844 });
  await selected('花园养成');
  await button('下一个主题').click();
  await selected('星空旅行');
  await button('下一个主题').click();
  await page.getByRole('link', { name: '返回', exact: true }).click();
  await page.waitForTimeout(600);
  await page.getByRole('link', { name: '开始', exact: true }).click();
  await selected('萌宠互动');
  report.push('Looping, dots, keyboard, same-frame repeated input, resize cancellation and unmount recovery work.');

  const box = await page.locator('.theme-viewport').boundingBox();
  await page.mouse.move(box.x + box.width * .75, box.y + 80);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * .25, box.y + 85, { steps: 8 });
  await page.mouse.up();
  await selected('花园养成');
  await page.mouse.move(box.x + box.width * .5, box.y + 80);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * .5 + 10, box.y + 170, { steps: 8 });
  await page.mouse.up();
  await selected('花园养成');
  report.push('Horizontal drag switches one theme; vertical drag does not switch.');

  const touch = await context.newCDPSession(page);
  await touch.send('Emulation.setTouchEmulationEnabled', { enabled: true });
  async function swipe(dx, dy) {
    const bounds = await page.locator('.theme-viewport').boundingBox();
    const x = bounds.x + bounds.width * .7, y = bounds.y + 100;
    await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    for (let i = 1; i <= 8; i++) await touch.send('Input.dispatchTouchEvent', {
      type: 'touchMove', touchPoints: [{ x: x + dx * i / 8, y: y + dy * i / 8 }],
    });
    await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  }
  await swipe(-100, 5);
  await selected('星空旅行');
  await swipe(5, -100);
  await selected('星空旅行');
  await touch.send('Emulation.setTouchEmulationEnabled', { enabled: false });
  await touch.detach();
  report.push('Emulated touch swipe changes theme; vertical touch scroll does not.');

  for (const [id, name] of [['pet', '萌宠互动'], ['garden', '花园养成'], ['space', '星空旅行']]) {
    await button(`选择${name}`).click();
    await selected(name);
    await enter(name).click();
    await page.waitForURL(url(`/prepare/${id}`));
    await button('了解了，继续').waitFor();
    await page.getByRole('link', { name: '返回主题', exact: true }).click();
    await selected('萌宠互动');
  }
  report.push('Every selected theme enters its matching preparation page through the existing loading flow.');

  for (const [width, height] of [[320, 800], [360, 800], [390, 844], [390, 568], [1440, 900], [1440, 600]]) {
    await page.setViewportSize({ width, height });
    await page.goto(url('/'));
    await page.screenshot({ path: `${output}/start-${width}-${height}.png`, fullPage: true });
    await noOverflow(`start ${width}x${height}`);
    await page.getByRole('link', { name: '开始', exact: true }).click();
    await selected('萌宠互动');
    await page.screenshot({ path: `${output}/themes-${width}-${height}.png`, fullPage: true });
    await noOverflow(`themes ${width}x${height}`);
    const sizes = await page.locator('.theme-selector button').evaluateAll(nodes => nodes.map(node => {
      const r = node.getBoundingClientRect(); return { width: r.width, height: r.height };
    }));
    assert.ok(sizes.every(r => r.width >= 44 && r.height >= 44));
  }
  report.push('320/360/390/1440px and short viewports: no horizontal overflow; all controls >=44px.');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await button('下一个主题').click();
  const transform = await page.locator('.theme-cube').evaluate(node => getComputedStyle(node).transform);
  assert.ok(transform === 'none' || transform === 'matrix(1, 0, 0, 1, 0, 0)', transform);
  await selected('花园养成');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await button('下一个主题').click();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await selected('花园养成');
  await button('下一个主题').click();
  await selected('星空旅行');
  report.push('Reduced motion uses no 3D rotation and preference changes cancel cleanly.');

  // Increase computed text sizes only, simulating text-only zoom without shrinking controls.
  await page.setViewportSize({ width: 320, height: 568 });
  await page.evaluate(() => {
    const nodes = [...document.querySelectorAll('.theme-screen h1, .theme-scene-copy h2, .theme-scene-copy p, .theme-enter, .theme-back')];
    const sizes = nodes.map(node => parseFloat(getComputedStyle(node).fontSize));
    nodes.forEach((node, i) => { node.style.fontSize = `${sizes[i] * 2}px`; });
  });
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await page.screenshot({ path: `${output}/themes-large-text.png`, fullPage: true });
  await noOverflow('200% text');
  assert.ok(await page.locator('.theme-face-current').evaluate(face => {
    const bounds = face.getBoundingClientRect();
    return [...face.querySelectorAll('h2, p')].every(node => {
      const r = node.getBoundingClientRect();
      return r.top >= bounds.top && r.bottom <= bounds.bottom && r.left >= bounds.left && r.right <= bounds.right;
    });
  }), '200% text in a short viewport must not be cropped');
  await page.route('**/themes/**/poster.jpg', route => route.abort());
  await page.reload();
  await page.getByText('主题画面暂时不可用', { exact: true }).waitFor();
  await button('下一个主题').click();
  await selected('花园养成');
  await enter('花园养成').click();
  await page.getByRole('alert').waitFor();
  await button('下一个主题').click();
  await selected('星空旅行');
  report.push('Missing artwork keeps selection usable; failed launch restores controls and displays the existing error.');
  await page.unroute('**/themes/**/poster.jpg');
  assert.deepEqual(errors, [], 'Unexpected browser errors');
  await fs.writeFile(`${output}/entry-report.txt`, report.join('\n'));
  console.log(report.join('\n'));
} catch (error) {
  await page.screenshot({ path: `${output}/failure.png`, fullPage: true }).catch(() => {});
  throw error;
} finally { await browser.close(); }
