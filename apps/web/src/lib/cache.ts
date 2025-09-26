import IORedis from "ioredis";
import pino from "pino";

type CacheValue = Record<string, unknown> | string | number | boolean | null;

const log = pino({ name: "cache" });

const redisUrl = process.env.REDIS_URL;
type RedisLike = {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, mode: "EX", ttl: number): Promise<"OK" | null>;
  on(event: "error", listener: (error: unknown) => void): void;
};
let redis: RedisLike | undefined;

if (redisUrl) {
  const RedisCtor: any = IORedis as any;
  redis = new RedisCtor(redisUrl) as RedisLike;
  redis.on("error", (error: unknown) => {
    log.warn({ error }, "Redis connection error");
  });
}

const memoryStore = new Map<string, { value: CacheValue; expiresAt: number }>();

export async function getCache<T = CacheValue>(key: string): Promise<T | undefined> {
  if (redis) {
    const raw = await redis.get(key);
    if (!raw) return undefined;
    return JSON.parse(raw) as T;
  }

  const entry = memoryStore.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    memoryStore.delete(key);
    return undefined;
  }
  return entry.value as T;
}

export async function setCache(key: string, value: CacheValue, ttlSeconds: number): Promise<void> {
  if (redis) {
    await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
    return;
  }

  memoryStore.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000
  });
}
