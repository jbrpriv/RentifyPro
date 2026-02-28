const { Redis } = require('ioredis');

// Only enable TLS when REDIS_URL uses the rediss:// scheme (production / cloud Redis)
// Using tls:{} unconditionally breaks plain redis:// connections in local dev
const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const useTls   = redisUrl.startsWith('rediss://');

const redisConnection = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  ...(useTls ? { tls: {} } : {}),
});

redisConnection.on('connect', () => console.log('Redis connected'));
redisConnection.on('error', (err) => console.error('Redis error:', err.message));

module.exports = redisConnection;