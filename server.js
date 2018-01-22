const PORT = process.env.PORT || 3000

const RoomDB = require('./lib/roomdb.node.js')

const Koa = require('koa')
const koaStatic = require('koa-static')
const route = require('koa-route')
const koaBody = require('koa-body')
const koaCors = require('koa-cors')
const util = require('util')

const room = new RoomDB()
const clients = new Map()

const app = new Koa()
app.use(koaCors({origin: true}))
app.use(koaBody())

app.use(async (ctx, next) => {
  if (ctx.method !== 'POST') return next()
  const requestBody = util.inspect(ctx.request.body)
  console.log(`<- ${ctx.url} ${requestBody}`)
  await next()
  const responseBody = util.inspect(ctx.body)
  console.log(`-> ${ctx.url} ${responseBody}`)
})

// On the first POST, allow asserting a client id maybe
app.use(async (ctx, next) => {
  if (ctx.method !== 'POST') return next()

  const id = ctx.request.body.id

  ctx.state.client = clients.get(id) || room.connect(id)

  if (!clients.has(ctx.state.client.id)) {
    clients.set(ctx.state.client.id, ctx.state.client)
  }

  await next()
})

const assert = async (ctx, next) => {
  const {fact} = ctx.request.body
  await ctx.state.client.assert(fact)
  ctx.body = {id: ctx.state.client.id}
}

const retract = async (ctx, next) => {
  const {fact} = ctx.request.body
  await ctx.state.client.retract(fact)
  ctx.body = 'okay!'
}

const facts = async (ctx, next) => {
  ctx.body = room.facts
}

const select = async (ctx, next) => {
  const {facts} = ctx.request.body
  await ctx.state.client
    .select(facts)
    .doAll(solutions => { ctx.body = { solutions } })
}

const disconnect = async (ctx, next) => {
  await ctx.state.client
    .disconnect()
    .do(obj => { ctx.body = obj })
}

app.use(route.post('/assert', assert))
app.use(route.post('/select', select))
app.use(route.post('/retract', retract))
app.use(route.post('/disconnect', disconnect))

app.use(route.post('/facts', facts))

app.use(koaStatic('./'))

app.listen(PORT)

console.log(`listening on ${PORT}`)

process.on('SIGINT', () => {
  console.log()
  console.log(`see you later, space surfer...`)
  process.exit(0)
})
