const Koa = require('koa')
const koaStatic = require('koa-static')
const route = require('koa-route')
const websockify = require('koa-websocket')

const app = websockify(new Koa())

app.use(koaStatic('./'))

app.ws.use(route.all('/', (ctx) => {
  ctx.websocket.on('connect', info => {
    console.log(info)
  })
  ctx.websocket.on('message', message => {
    ctx.websocket.send(message)
  })
}))

app.listen(3000)
