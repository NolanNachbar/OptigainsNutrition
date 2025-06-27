// Performance-optimized caching layer for expensive calculations

interface CacheItem<T> {
  value: T;
  timestamp: number;
  ttl: number;
}

export class PerformanceCache<T = any> {
  private cache: Map<string, CacheItem<T>>;
  private maxSize: number;
  private hits: number = 0;
  private misses: number = 0;

  constructor(maxSize: number = 100) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  get(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      this.misses++;
      return null;
    }

    // Check if expired
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    this.hits++;
    // Move to end (LRU)
    this.cache.delete(key);
    this.cache.set(key, item);
    
    return item.value;
  }

  set(key: string, value: T, ttl: number = 5 * 60 * 1000): void {
    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      ttl
    });
  }

  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  getStats() {
    const hitRate = this.hits / (this.hits + this.misses) || 0;
    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: Math.round(hitRate * 100)
    };
  }
}

// Specialized caches for different data types
export const tdeeCache = new PerformanceCache<any>(50);
export const trendCache = new PerformanceCache<any>(100);
export const foodCache = new PerformanceCache<any>(200);

// Memoization decorator
export function memoize<T extends (...args: any[]) => any>(
  fn: T,
  cache: PerformanceCache,
  keyGenerator?: (...args: Parameters<T>) => string
): T {
  return ((...args: Parameters<T>) => {
    const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args);
    
    const cached = cache.get(key);
    if (cached !== null) {
      return cached;
    }

    const result = fn(...args);
    cache.set(key, result);
    return result;
  }) as T;
}

// React hook for caching
import { useRef, useCallback } from 'react';

export function useCache<T>(ttl: number = 5 * 60 * 1000) {
  const cacheRef = useRef(new PerformanceCache<T>());

  const getCached = useCallback((key: string) => {
    return cacheRef.current.get(key);
  }, []);

  const setCached = useCallback((key: string, value: T, customTtl?: number) => {
    cacheRef.current.set(key, value, customTtl || ttl);
  }, [ttl]);

  const clearCache = useCallback(() => {
    cacheRef.current.clear();
  }, []);

  const getStats = useCallback(() => {
    return cacheRef.current.getStats();
  }, []);

  return { getCached, setCached, clearCache, getStats };
}

// Cache key generators
export const cacheKeys = {
  tdee: (userId: string, date: string) => `tdee:${userId}:${date}`,
  trend: (userId: string, days: number) => `trend:${userId}:${days}`,
  meals: (userId: string, date: string) => `meals:${userId}:${date}`,
  food: (foodId: string) => `food:${foodId}`,
  recent: (userId: string) => `recent:${userId}`,
  favorites: (userId: string) => `favorites:${userId}`
};