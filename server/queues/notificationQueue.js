const { Queue } = require('bullmq');
const redisConnection = require('../config/redis');

// One queue for all notification jobs
const notificationQueue = new Queue('notifications', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,           // Retry failed jobs 3 times
    backoff: {
      type: 'exponential',
      delay: 5000,         // Wait 5s, then 10s, then 20s between retries
    },
    removeOnComplete: 100, // Keep last 100 completed jobs for debugging
    removeOnFail: 50,      // Keep last 50 failed jobs
  },
});

module.exports = notificationQueue;