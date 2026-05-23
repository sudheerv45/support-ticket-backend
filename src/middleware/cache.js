const { getRedisClient } = require('../config/redis');
const logger = require('../utils/logger');

const cache = (duration = 300) => {
  return async (req, res, next) => {
    const key = `cache:${req.originalUrl}:${JSON.stringify(req.query)}`;

    try {
      const redis = getRedisClient();
      const cached = await redis.get(key);

      if (cached) {
        logger.info(`Cache hit: ${key}`);
        return res.json(JSON.parse(cached));
      }

      // Override res.json to cache the response
      const originalJson = res.json.bind(res);
      res.json = (data) => {
        redis.setex(key, duration, JSON.stringify(data));
        logger.info(`Cache set: ${key}`);
        return originalJson(data);
      };

      next();
    } catch (error) {
      logger.warn('Cache middleware error:', error);
      next();
    }
  };
};

const clearCache = async (pattern) => {
  try {
    const redis = getRedisClient();
    const keys = await redis.keys(`cache:*${pattern}*`);
    if (keys.length > 0) {
      await redis.del(...keys);
      logger.info(`Cache cleared for pattern: ${pattern}`);
    }
  } catch (error) {
    logger.warn('Clear cache error:', error);
  }
};

module.exports = { cache, clearCache };
