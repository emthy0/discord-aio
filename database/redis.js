const CONF = {
  socket: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
  },
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  password: process.env.REDIS_PASSWORD,
  db: 0,
}
const {createClient} = require('redis')
const redisClient = createClient(CONF)
// console.log(CONF)
redisClient.on('connect', function () {
  console.log('redis connected')
  console.log(`connected ${redisClient.connected}`)
})

redisClient.on('error', (err) => {
  console.log('main error')
  console.error(err)
})

// redisClient.connect();

module.exports = redisClient

// const CONF = {
//   host: process.env.REDIS_HOST,
//   port: process.env.REDIS_PORT,
//   password: process.env.REDIS_PASSWORD,
//   db: 0,
// }

// const serverRedisClient = redis.createClient(CONF)

// serverRedisClient.on('connect', function () {
//   console.log('redis connected')
//   console.log(`connected ${serverRedisClient.connected}`)
// })

// module.exports.serverDB = serverRedisClient

// const CONF2 = {
//   host: process.env.REDIS_HOST,
//   port: process.env.REDIS_PORT,
//   password: process.env.REDIS_PASSWORD,
//   db: 1,
// }

// const tokenRedisClient = redis.createClient(CONF2)

// tokenRedisClient.on('connect', function () {
//   console.log('redis connected')
//   console.log(`connected ${tokenRedisClient.connected}`)
// })

// module.exports.tokenDB = tokenRedisClient