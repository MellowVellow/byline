import { chromium } from 'playwright'
const sleep = ms => new Promise(r => setTimeout(r, ms))
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
let t0 = Date.now()
const ts = () => ((Date.now()-t0)/1000).toFixed(2)
page.on('response', r => { if (r.url().includes('/api/')) console.log(ts(), 'RESP', r.status(), r.url().split('/api/')[1]) })
await page.goto('http://localhost:5199/app', { waitUntil: 'domcontentloaded' })
await page.waitForSelector('.byline-paper-editor', { timeout: 15000 })
await sleep(1200)
const ed = page.locator('.byline-paper-editor')
const snap = () => page.evaluate(() => ({
  ghost: document.querySelectorAll('.ghost-text').length,
  ghostTxt: document.querySelector('.ghost-text')?.textContent || '',
  pops: document.querySelectorAll('.caret-pop').length,
  popText: document.querySelector('.caret-pop')?.textContent || '',
}))
await ed.click()
await ed.type('The quick brown fox jumps over the lazy dog and keeps running far away', { delay: 30 })
console.log('typed1', ts())
await sleep(2500)
console.log('PAUSE1', ts(), JSON.stringify(await snap()))
await page.keyboard.type(' near the river today', { delay: 25 })
console.log('typed2', ts(), JSON.stringify(await snap()))
await sleep(2500)
console.log('PAUSE2', ts(), JSON.stringify(await snap()))
// dismiss then selection
await page.keyboard.press('Escape')
await sleep(200)
// select a phrase by dragging across first line area
const box = await ed.boundingBox()
console.log('BOX', JSON.stringify(box))
await page.mouse.move(box.x + 45, box.y + 20)
await page.mouse.down()
await page.mouse.move(box.x + 180, box.y + 20, { steps: 12 })
await page.mouse.up()
console.log('SELECTED', ts(), JSON.stringify(await snap()))
for (let i=0;i<20;i++){ await sleep(400); const s=await snap(); console.log('SEL', ts(), JSON.stringify(s)); if (s.popText && !s.popText.startsWith('Thinking')) break }
await browser.close()
