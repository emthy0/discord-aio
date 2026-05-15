import { createClient } from "redis"
import { env } from "../config/env"

// TODO: Redis is not currently used by any feature. Wire up when needed.
let client: ReturnType<typeof createClient> | null = null

export async function getRedisClient() {
  if (client) return client

  const url = env.redisUrl ?? (env.redisHost ? `redis://:${env.redisPassword}@${env.redisHost}:${env.redisPort ?? 6379}` : undefined)
  client = createClient({ url })
  await client.connect()
  return client
}
