/**
 * Drives the installed Android app through its WebView (Chrome DevTools
 * Protocol). Android WebView does not support Playwright's browser-level CDP,
 * so this talks to the page target directly and evaluates small DOM helpers.
 *
 * Usage:
 *   adb forward tcp:9222 localabstract:webview_devtools_remote_<pid>
 *   node scripts/device-test.mjs
 */
import { writeFile } from 'node:fs/promises'
import WebSocket from 'ws'

const CDP = process.env.CDP_URL ?? 'http://127.0.0.1:9222'
const OUT = process.env.OUT_DIR ?? '/tmp/shabh-shots'

const targets = await (await fetch(`${CDP}/json/list`)).json()
const target = targets.find((item) => item.type === 'page')
if (!target) throw new Error('No WebView page target found')

const socket = new WebSocket(target.webSocketDebuggerUrl, { maxPayload: 256 * 1024 * 1024 })
await new Promise((resolve, reject) => {
  socket.once('open', resolve)
  socket.once('error', reject)
})

let nextId = 0
const pending = new Map()
socket.on('message', (raw) => {
  const message = JSON.parse(raw.toString())
  if (message.id && pending.has(message.id)) {
    const { resolve, reject } = pending.get(message.id)
    pending.delete(message.id)
    message.error ? reject(new Error(`${message.method}: ${message.error.message}`)) : resolve(message.result)
  }
})

function send(method, params = {}) {
  const id = ++nextId
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject })
    socket.send(JSON.stringify({ id, method, params }))
  })
}

async function evaluate(expression) {
  const result = await send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true
  })
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text)
  }
  return result.result.value
}

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const log = (...args) => console.log(...args)

const clickText = (text) =>
  evaluate(`(() => {
    const nodes = [...document.querySelectorAll('button, a, [role="button"]')]
    const el = nodes.find((node) => node.textContent && node.textContent.includes(${JSON.stringify(text)}))
    if (!el) return false
    el.scrollIntoView({ block: 'center' })
    el.click()
    return true
  })()`)

const fillLabel = (label, value) =>
  evaluate(`(() => {
    const labelEl = [...document.querySelectorAll('label')].find(
      (node) => (node.textContent ?? '').trim() === ${JSON.stringify(label)}
    )
    const inputs = [...document.querySelectorAll('input')]
    const el = labelEl?.htmlFor
      ? document.getElementById(labelEl.htmlFor)
      : inputs.find((input) => (input.placeholder ?? '').includes(${JSON.stringify(label)}))
    if (!el) return false
    el.focus()
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
    setter.call(el, ${JSON.stringify(value)})
    el.dispatchEvent(new Event('input', { bubbles: true }))
    return true
  })()`)

const bodyText = () => evaluate('document.body.innerText')
const screenshot = async (name) => {
  const shot = await send('Page.captureScreenshot', { format: 'png' })
  await writeFile(`${OUT}/${name}.png`, Buffer.from(shot.data, 'base64'))
}

await send('Page.enable')
await send('Runtime.enable')

// Make sure we are on a job with work left.
await send('Page.navigate', { url: 'https://localhost/jobs/job_seed_3' })
await pause(1500)
if ((await bodyText()).includes('Employee sign in')) {
  await fillLabel('Employee ID', 'EMP-1042')
  await fillLabel('PIN', '1234')
  await clickText('Sign in')
  await pause(1200)
  await send('Page.navigate', { url: 'https://localhost/jobs/job_seed_3' })
  await pause(1500)
}

log('URL:', await evaluate('location.href'))
log('JOB:', (await bodyText()).split('\n').find((line) => line.includes('Metro Retail Store')) ?? 'unknown')

if (!(await clickText('Send OTP'))) throw new Error('Send OTP button not found')
await pause(900)
const withCode = await bodyText()
const code = withCode.match(/Code:\s*(\d{6})/)?.[1]
if (!code) throw new Error('Demo code was not rendered')
log('OTP CODE:', code)

if (!(await fillLabel('Customer OTP', code))) throw new Error('OTP input not found')
if (!(await clickText('Verify & allow work'))) throw new Error('Verify button not found')
await pause(1500)

const verified = await bodyText()
const timerLine = verified.split('\n').find((line) => /left|Over by/.test(line))
log('VERIFIED:', verified.includes('OTP verified'))
log('SERVICES UNLOCKED:', !verified.includes('Verify the customer OTP to unlock'))
log('TIMER:', timerLine ?? 'not visible')
await screenshot('20-device-verified')

// First service → live camera.
if (!(await clickText('Start service'))) throw new Error('Start service button not found')
await pause(1000)
const sheet = await bodyText()
log('SERVICE SHEET:', sheet.split('\n').slice(0, 6).join(' | '))
if (!(await clickText('Open live camera'))) throw new Error('Open live camera not found')
await pause(3000)

const video = await evaluate(`(() => {
  const el = document.querySelector('video')
  if (!el) return null
  return { readyState: el.readyState, width: el.videoWidth, height: el.videoHeight, paused: el.paused }
})()`)
log('CAMERA VIDEO:', JSON.stringify(video))
const cameraText = await bodyText()
log('CAMERA ERROR UI:', cameraText.includes('Camera unavailable') || cameraText.includes('permission'))
await screenshot('21-device-camera')

socket.close()
