import "dotenv/config"

function requireEnv(key: string): string {
  const val = process.env[key]
  if (!val) throw new Error(`Missing required environment variable: ${key}`)
  return val
}

export const env = {
  discordToken: requireEnv("discordToken"),
  discordToken2: requireEnv("discordToken2"),
  discordClientID: requireEnv("discordClientID"),
  discordClientID2: requireEnv("discordClientID2"),
  databaseSRV: requireEnv("databaseSRV"),
  youtubeApiKey: requireEnv("youtubeApiKey"),
  redisHost: process.env["REDIS_HOST"],
  redisPort: process.env["REDIS_PORT"] ? parseInt(process.env["REDIS_PORT"]) : undefined,
  redisPassword: process.env["REDIS_PASSWORD"],
  redisUrl: process.env["REDISCLOUD_URL"],
} as const
