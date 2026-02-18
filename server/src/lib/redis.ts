/**
 * Redis client singleton.
 * Shared across rate limiter, plan enforcer cache, and other services.
 * Falls back gracefully (fail-open) if Redis is unavailable.
 */
import { Redis } from 'ioredis';

const redisUrl = process.env['REDIS_URL'] || 'redis://localhost:6379';

let redisClient: Redis | null = null;
let redisAvailable = true;

function createClient(): Redis {
  const client = new Redis(redisUrl, {
    maxRetriesPerRequest: 1,
    retryStrategy(times: number) {
      if (times > 3) {
        console.warn('[redis] Max retries exceeded, giving up reconnection');
        return null; // stop retrying
      }
      return Math.min(times * 500, 3000);
    },
    lazyConnect: true,
  });

  client.on('error', (err: Error) => {
    if (redisAvailable) {
      console.warn('[redis] Connection error — rate limiting will fail open:', err.message);
      redisAvailable = false;
    }
  });

  client.on('connect', () => {
    if (!redisAvailable) {
      console.log('[redis] Reconnected');
    }
    redisAvailable = true;
  });

  return client;
}

export function getRedis(): Redis | null {
  if (!redisClient) {
    try {
      redisClient = createClient();
      void redisClient.connect().catch(() => {
        redisAvailable = false;
      });
    } catch {
      console.warn('[redis] Failed to create client — rate limiting disabled');
      redisAvailable = false;
      return null;
    }
  }
  return redisAvailable ? redisClient : null;
}

export function isRedisAvailable(): boolean {
  return redisAvailable;
}
