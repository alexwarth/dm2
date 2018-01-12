const Koa = require('koa')
const static = require('koa-static')
const route = require('koa-route')
const websockify = require('koa-websocket')

const app = websockify(new Koa())

app.use(static('./'))

app.ws.use(route.all('/', (ctx) => {
  ctx.websocket.send(['Hello World'])
  ctx.websocket.on('message', message => {
    console.log(message)
  })
}))

app.listen(3000, info => {
  console.log(info)
})
