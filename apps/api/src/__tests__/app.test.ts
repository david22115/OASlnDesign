import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import app from '../index';
import { prisma } from '@repo/database';
import { redis } from '../services/redis';

// Mock ioredis to prevent connection attempts
vi.mock('ioredis', () => {
  return {
    Redis: vi.fn().mockImplementation(() => ({
      on: vi.fn(),
      ping: vi.fn().mockResolvedValue('PONG'),
      get: vi.fn(),
      setex: vi.fn(),
      quit: vi.fn(),
    })),
  };
});

// Mock bullmq
vi.mock('bullmq', () => {
  return {
    Queue: class {
       close = vi.fn().mockResolvedValue(true);
       add = vi.fn().mockResolvedValue({ id: 'job-id' });
    }
  };
});

// Mock the dependencies
vi.mock('@repo/database', () => ({
  prisma: {
    $queryRaw: vi.fn().mockResolvedValue([{ 1: 1 }]),
    $disconnect: vi.fn(),
  }
}));

vi.mock('../services/redis', () => ({
  redis: {
    ping: vi.fn().mockResolvedValue('PONG'),
    get: vi.fn(),
    setex: vi.fn(),
    quit: vi.fn(),
  }
}));

describe('App Integration Tests', () => {
  it('should return 200 for health check', async () => {
    const res = await request(app).get('/health');
    
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('OK');
    expect(res.body.services.db).toBe('up');
    expect(res.body.services.redis).toBe('up');
  });

  it('should return 401 for unauthorized access to dynamic admin', async () => {
    const res = await request(app).get('/api/admin/dynamic/schemas');
    expect(res.status).toBe(401);
  });
});
