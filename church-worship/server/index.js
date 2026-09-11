/**
 * Live-control relay.
 *
 * A dumb fan-out hub: whatever one client sends goes to every other client.
 * It holds the last live message so a projector that connects late — or
 * reconnects after a network blip mid-service — immediately catches up instead
 * of showing a blank screen.
 *
 * Only needed when the projector or stage display runs on a different machine.
 * Same-browser windows sync over BroadcastChannel without it.
 */

import { WebSocketServer } from 'ws'

const PORT = Number(process.env.PORT ?? 8080)
const wss = new WebSocketServer({ port: PORT })

let lastLive = null

wss.on('connection', (socket) => {
  if (lastLive) socket.send(lastLive)

  socket.on('message', (data) => {
    const text = data.toString()

    try {
      if (JSON.parse(text).type === 'live') lastLive = text
    } catch {
      return // drop anything that isn't valid JSON
    }

    for (const client of wss.clients) {
      if (client !== socket && client.readyState === client.OPEN) client.send(text)
    }
  })
})

console.log(`Live relay listening on ws://localhost:${PORT}`)
