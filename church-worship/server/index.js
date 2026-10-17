/**
 * Live-control relay.
 *
 * A dumb fan-out hub: whatever one client sends goes to every other client.
 * It holds the last live state (and the last status line for phone remotes)
 * so a projector or phone that connects late — or reconnects after a network
 * blip mid-service — immediately catches up instead of showing a blank screen.
 *
 * Needed when the projector or stage display runs on a different machine, or
 * for the phone remote. Same-browser windows sync over BroadcastChannel
 * without it.
 *
 * GET /info reports this laptop's addresses on the local network, so the
 * operator window can show phones where to connect (and a QR code for it).
 */

import { createServer } from 'node:http'
import { networkInterfaces } from 'node:os'
import { WebSocketServer } from 'ws'

const PORT = Number(process.env.PORT ?? 8080)

function lanAddresses() {
  const out = []
  for (const list of Object.values(networkInterfaces())) {
    for (const a of list ?? []) if (a.family === 'IPv4' && !a.internal) out.push(a.address)
  }
  return out
}

const http = createServer((req, res) => {
  if (req.url?.startsWith('/info')) {
    res.writeHead(200, { 'content-type': 'application/json', 'access-control-allow-origin': '*' })
    res.end(JSON.stringify({ addresses: lanAddresses() }))
    return
  }
  res.writeHead(404)
  res.end()
})

const wss = new WebSocketServer({ server: http })

// Replayed to every new client, by message type.
const last = { live: null, status: null }

wss.on('connection', (socket) => {
  for (const msg of Object.values(last)) if (msg) socket.send(msg)

  socket.on('message', (data) => {
    const text = data.toString()

    let type
    try {
      type = JSON.parse(text).type
    } catch {
      return // drop anything that isn't valid JSON
    }
    if (type in last) last[type] = text

    for (const client of wss.clients) {
      if (client !== socket && client.readyState === client.OPEN) client.send(text)
    }
  })
})

http.listen(PORT, () => {
  console.log(`Live relay listening on ws://localhost:${PORT}`)
  for (const ip of lanAddresses()) console.log(`  phones on this network: http://${ip}:5173/remote`)
})
