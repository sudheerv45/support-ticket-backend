const Queue = require('bull');
const logger = require('../utils/logger');

let emailQueue = null;
let notificationQueue = null;

const setupQueues = () => {
  const redisConfig = process.env.REDIS_URL || 'redis://localhost:6379';

  // Email queue for sending notifications
  emailQueue = new Queue('email-notifications', redisConfig, {
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000
      },
      removeOnComplete: 100,
      removeOnFail: 50
    }
  });

  // Notification queue for in-app notifications
  notificationQueue = new Queue('in-app-notifications', redisConfig, {
    defaultJobOptions: {
      attempts: 2,
      backoff: {
        type: 'fixed',
        delay: 3000
      },
      removeOnComplete: 100,
      removeOnFail: 50
    }
  });

  // Process email jobs
  emailQueue.process(async (job) => {
    const { to, subject, template, data } = job.data;
    logger.info(`Processing email job ${job.id} for ${to}`);

    // Here you would integrate with your email service (SendGrid, AWS SES, etc.)
    // For now, we'll log it
    logger.info(`Email sent to ${to}: ${subject}`);
    return { sent: true, to, timestamp: new Date().toISOString() };
  });

  // Process notification jobs
  notificationQueue.process(async (job) => {
    const { userId, type, message, ticketId } = job.data;
    logger.info(`Processing notification job ${job.id} for user ${userId}`);

    // Emit real-time notification via Socket.IO
    const { getIO } = require('./socket');
    try {
      const io = getIO();
      io.to(`user:${userId}`).emit('notification', {
        type,
        message,
        ticketId,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.warn('Socket.IO not available for notification');
    }

    return { delivered: true, userId, timestamp: new Date().toISOString() };
  });

  // Event listeners
  emailQueue.on('completed', (job, result) => {
    logger.info(`Email job ${job.id} completed:`, result);
  });

  emailQueue.on('failed', (job, err) => {
    logger.error(`Email job ${job.id} failed:`, err);
  });

  notificationQueue.on('completed', (job, result) => {
    logger.info(`Notification job ${job.id} completed:`, result);
  });

  notificationQueue.on('failed', (job, err) => {
    logger.error(`Notification job ${job.id} failed:`, err);
  });

  logger.info('Bull queues initialized');
};

const getEmailQueue = () => emailQueue;
const getNotificationQueue = () => notificationQueue;

module.exports = { setupQueues, getEmailQueue, getNotificationQueue };
