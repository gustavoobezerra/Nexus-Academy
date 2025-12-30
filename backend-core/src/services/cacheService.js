import { createClient } from 'redis';

let redisClient = null;
let isConnected = false;

// In-memory fallback cache
const memoryCache = new Map();
const memoryCacheTTL = new Map();

export const cacheService = {
  async connect() {
    if (process.env.REDIS_URL) {
      try {
        redisClient = createClient({ url: process.env.REDIS_URL });
        redisClient.on('error', (err) => console.error('Redis Client Error:', err));
        redisClient.on('connect', () => { isConnected = true; console.info('✅ Redis connected'); });
        redisClient.on('disconnect', () => { isConnected = false; console.info('Redis disconnected'); });
        await redisClient.connect();
        return true;
      } catch (error) {
        console.warn('Redis connection failed, using memory cache:', error.message);
        return false;
      }
    }
    // DEBUG: console.log('Redis not configured, using memory cache');
    return false;
  },

  isConnected() {
    return isConnected && redisClient?.isOpen;
  },

  async get(key) {
    if (this.isConnected()) {
      const value = await redisClient.get(key);
      return value ? JSON.parse(value) : null;
    }
    // Memory fallback
    const ttl = memoryCacheTTL.get(key);
    if (ttl && Date.now() > ttl) {
      memoryCache.delete(key);
      memoryCacheTTL.delete(key);
      return null;
    }
    return memoryCache.get(key) || null;
  },

  async set(key, value, ttlSeconds = 3600) {
    const serialized = JSON.stringify(value);
    if (this.isConnected()) {
      await redisClient.setEx(key, ttlSeconds, serialized);
    } else {
      memoryCache.set(key, value);
      memoryCacheTTL.set(key, Date.now() + ttlSeconds * 1000);
    }
  },

  async del(key) {
    if (this.isConnected()) {
      await redisClient.del(key);
    } else {
      memoryCache.delete(key);
      memoryCacheTTL.delete(key);
    }
  },

  async delPattern(pattern) {
    if (this.isConnected()) {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(keys);
      }
    } else {
      const regex = new RegExp(pattern.replace('*', '.*'));
      for (const key of memoryCache.keys()) {
        if (regex.test(key)) {
          memoryCache.delete(key);
          memoryCacheTTL.delete(key);
        }
      }
    }
  },

  async incr(key) {
    if (this.isConnected()) {
      return await redisClient.incr(key);
    }
    const current = (memoryCache.get(key) || 0) + 1;
    memoryCache.set(key, current);
    return current;
  },

  async expire(key, ttlSeconds) {
    if (this.isConnected()) {
      await redisClient.expire(key, ttlSeconds);
    } else {
      memoryCacheTTL.set(key, Date.now() + ttlSeconds * 1000);
    }
  },

  // Cache wrapper for functions
  async cached(key, fn, ttlSeconds = 3600) {
    const cached = await this.get(key);
    if (cached !== null) return cached;
    const result = await fn();
    await this.set(key, result, ttlSeconds);
    return result;
  },

  // Rate limiting
  async checkRateLimit(key, limit, windowSeconds) {
    const current = await this.incr(key);
    if (current === 1) {
      await this.expire(key, windowSeconds);
    }
    return { allowed: current <= limit, current, limit };
  },

  // Session management
  async setSession(sessionId, data, ttlSeconds = 86400) {
    await this.set(`session:${sessionId}`, data, ttlSeconds);
  },

  async getSession(sessionId) {
    return await this.get(`session:${sessionId}`);
  },

  async deleteSession(sessionId) {
    await this.del(`session:${sessionId}`);
  },

  // Specific cache keys
  keys: {
    teacherAnalytics: (teacherId) => `analytics:teacher:${teacherId}`,
    studentData: (studentId) => `student:${studentId}`,
    classData: (classId) => `class:${classId}`,
    paymentStats: (teacherId) => `payments:stats:${teacherId}`,
    dashboardConfig: (userId) => `dashboard:${userId}`,
    reportGeneration: (reportId) => `report:gen:${reportId}`
  },

  async disconnect() {
    if (redisClient?.isOpen) {
      await redisClient.quit();
    }
  }
};

export default cacheService;
