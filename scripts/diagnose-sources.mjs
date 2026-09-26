// 출처에 접속하지 못하는 진짜 원인을 찾는다. "fetch failed"는 DNS·TLS·차단을 모두 같은 말로 덮는다.
// 사용: node scripts/diagnose-sources.mjs
import { readFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { lookup } from 'node:dns/promises'
import { connect as tlsConnect } from 'node:tls'
import yaml from 'js-yaml'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

const hosts = new Set()
for (const f of readdirSync(join(root, 'rules')).filter((n) => n.endsWith('.yaml'))) {
  const doc = yaml.load(readFileSync(join(root, 'rules', f), 'utf8'), { schema: yaml.CORE_SCHEMA })
  for (const s of doc?.sources ?? []) hosts.add(new URL(s.url).hostname)
}
// 대조군: 이게 되면 네트워크 자체는 멀쩡하다는 뜻이다.
hosts.add('www.google.com')
hosts.add('www.gov.kr')

/** 오류의 진짜 원인까지 펼친다. fetch 는 원인을 cause 에 숨긴다. */
function explain(error) {
  const parts = []
  let e = error
  while (e) {
    parts.push([e.code, e.message].filter(Boolean).join(' '))
    e = e.cause
  }
  return parts.join(' ← ')
}

async function tlsHandshake(host) {
  return new Promise((resolve) => {
    const socket = tlsConnect({ host, port: 443, servername: host, timeout: 15000 }, () => {
      const info = `${socket.getProtocol()} ${socket.getCipher()?.name} authorized=${socket.authorized}`
      socket.end()
      resolve(info)
    })
    socket.on('timeout', () => { socket.destroy(); resolve('시간 초과 (응답 없음)') })
    socket.on('error', (e) => resolve(`실패 — ${explain(e)}`))
  })
}

const UA_BROWSER =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36'

for (const host of hosts) {
  console.log(`\n===== ${host}`)

  try {
    const { address, family } = await lookup(host)
    console.log(`DNS      : ${address} (IPv${family})`)
  } catch (e) {
    console.log(`DNS      : 실패 — ${explain(e)}`)
    continue
  }

  console.log(`TLS      : ${await tlsHandshake(host)}`)

  for (const [label, headers] of [
    ['기본 UA', { 'user-agent': 'settle-quest-source-check/0.1' }],
    ['브라우저 UA', { 'user-agent': UA_BROWSER, accept: 'text/html,application/xhtml+xml', 'accept-language': 'ko-KR,ko;q=0.9' }],
  ]) {
    const started = Date.now()
    try {
      const res = await fetch(`https://${host}/`, { headers, signal: AbortSignal.timeout(20000) })
      const body = await res.text()
      console.log(`HTTP(${label}): ${res.status} ${res.headers.get('server') ?? ''} ${body.length}바이트 ${Date.now() - started}ms`)
    } catch (e) {
      console.log(`HTTP(${label}): 실패 ${Date.now() - started}ms — ${explain(e)}`)
    }
  }
}
