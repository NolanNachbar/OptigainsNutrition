// Performance-optimized caching layer for expensive calculations

interface CacheItem<T> {
  value: T;
  timestamp: number;
  ttl: number;
  dependencies?: string[]; // For cache invalidation
  tags?: string[]; // For bulk invalidation
}

interface CacheInvalidationRule {
  pattern: RegExp;
  action: 'delete' | 'refresh';
  dependencies?: string[];
}

export class PerformanceCache<T = any> {
  private cache: Map<string, CacheItem<T>>;
  private maxSize: number;
  private hits: number = 0;
  private misses: number = 0;
  private invalidationRules: CacheInvalidationRule[] = [];
  private tagIndex: Map<string, Set<string>> = new Map(); // tag -> keys
  private dependencyIndex: Map<string, Set<string>> = new Map(); // dependency -> keys

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

  set(key: string, value: T, ttl: number = 5 * 60 * 1000, options?: {
    dependencies?: string[];
    tags?: string[];
  }): void {
    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.removeFromIndexes(firstKey);
        this.cache.delete(firstKey);
      }
    }

    // Remove old entry from indexes if updating
    if (this.cache.has(key)) {
      this.removeFromIndexes(key);
    }

    const item: CacheItem<T> = {
      value,
      timestamp: Date.now(),
      ttl,
      dependencies: options?.dependencies,
      tags: options?.tags
    };

    this.cache.set(key, item);
    this.updateIndexes(key, item);
  }

  clear(): void {
    this.cache.clear();
    this.tagIndex.clear();
    this.dependencyIndex.clear();
    this.hits = 0;
    this.misses = 0;
  }

  getStats() {
    const hitRate = this.hits / (this.hits + this.misses) || 0;
    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: Math.round(hitRate * 100),
      tags: this.tagIndex.size,
      dependencies: this.dependencyIndex.size
    };
  }

  // Advanced invalidation methods
  private updateIndexes(key: string, item: CacheItem<T>): void {
    // Update tag index
    if (item.tags) {
      for (const tag of item.tags) {
        if (!this.tagIndex.has(tag)) {
          this.tagIndex.set(tag, new Set());
        }
        this.tagIndex.get(tag)!.add(key);
      }
    }

    // Update dependency index
    if (item.dependencies) {
      for (const dep of item.dependencies) {
        if (!this.dependencyIndex.has(dep)) {
          this.dependencyIndex.set(dep, new Set());
        }
        this.dependencyIndex.get(dep)!.add(key);
      }
    }
  }

  private removeFromIndexes(key: string): void {
    const item = this.cache.get(key);
    if (!item) return;

    // Remove from tag index
    if (item.tags) {
      for (const tag of item.tags) {
        const keys = this.tagIndex.get(tag);
        if (keys) {
          keys.delete(key);
          if (keys.size === 0) {
            this.tagIndex.delete(tag);
          }
        }
      }
    }

    // Remove from dependency index
    if (item.dependencies) {
      for (const dep of item.dependencies) {
        const keys = this.dependencyIndex.get(dep);
        if (keys) {
          keys.delete(key);
          if (keys.size === 0) {
            this.dependencyIndex.delete(dep);
          }
        }
      }
    }
  }

  // Invalidate by tag
  invalidateByTag(tag: string): number {
    const keys = this.tagIndex.get(tag);
    if (!keys) return 0;

    let deletedCount = 0;
    for (const key of Array.from(keys)) {
      if (this.cache.has(key)) {
        this.removeFromIndexes(key);
        this.cache.delete(key);
        deletedCount++;
      }
    }

    return deletedCount;
  }

  // Invalidate by dependency
  invalidateByDependency(dependency: string): number {
    const keys = this.dependencyIndex.get(dependency);
    if (!keys) return 0;

    let deletedCount = 0;
    for (const key of Array.from(keys)) {
      if (this.cache.has(key)) {
        this.removeFromIndexes(key);
        this.cache.delete(key);
        deletedCount++;
      }
    }

    return deletedCount;
  }

  // Invalidate by pattern
  invalidateByPattern(pattern: RegExp): number {
    let deletedCount = 0;
    for (const key of Array.from(this.cache.keys())) {
      if (pattern.test(key)) {
        this.removeFromIndexes(key);
        this.cache.delete(key);
        deletedCount++;
      }
    }
    return deletedCount;
  }

  // Add invalidation rule
  addInvalidationRule(rule: CacheInvalidationRule): void {
    this.invalidationRules.push(rule);
  }

  // Apply invalidation rules
  applyInvalidationRules(trigger: string): number {
    let totalDeleted = 0;
    
    for (const rule of this.invalidationRules) {
      if (rule.pattern.test(trigger)) {
        if (rule.action === 'delete') {
          // Delete matching entries
          totalDeleted += this.invalidateByPattern(rule.pattern);
        }
        // Handle dependencies
        if (rule.dependencies) {
          for (const dep of rule.dependencies) {
            totalDeleted += this.invalidateByDependency(dep);
          }
        }
      }
    }

    return totalDeleted;
  }

  // Get keys by tag
  getKeysByTag(tag: string): string[] {
    const keys = this.tagIndex.get(tag);
    return keys ? Array.from(keys) : [];
  }

  // Get keys by dependency
  getKeysByDependency(dependency: string): string[] {
    const keys = this.dependencyIndex.get(dependency);
    return keys ? Array.from(keys) : [];
  }

  // Batch operations
  setMany(entries: Array<{
    key: string;
    value: T;
    ttl?: number;
    dependencies?: string[];
    tags?: string[];
  }>): void {
    for (const entry of entries) {
      this.set(entry.key, entry.value, entry.ttl, {
        dependencies: entry.dependencies,
        tags: entry.tags
      });
    }
  }

  // Export cache data for debugging
  export(): any {
    const entries: any[] = [];
    for (const [key, item] of this.cache.entries()) {
      entries.push({
        key,
        value: item.value,
        timestamp: item.timestamp,
        ttl: item.ttl,
        dependencies: item.dependencies,
        tags: item.tags,
        age: Date.now() - item.timestamp
      });
    }
    return {
      entries,
      stats: this.getStats(),
      tagIndex: Object.fromEntries(
        Array.from(this.tagIndex.entries()).map(([tag, keys]) => [tag, Array.from(keys)])
      ),
      dependencyIndex: Object.fromEntries(
        Array.from(this.dependencyIndex.entries()).map(([dep, keys]) => [dep, Array.from(keys)])
      )
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

  const setCached = useCallback((key: string, value: T, customTtl?: number, options?: {
    dependencies?: string[];
    tags?: string[];
  }) => {
    cacheRef.current.set(key, value, customTtl || ttl, options);
  }, [ttl]);

  const clearCache = useCallback(() => {
    cacheRef.current.clear();
  }, []);

  const getStats = useCallback(() => {
    return cacheRef.current.getStats();
  }, []);

  const invalidateByTag = useCallback((tag: string) => {
    return cacheRef.current.invalidateByTag(tag);
  }, []);

  const invalidateByDependency = useCallback((dependency: string) => {
    return cacheRef.current.invalidateByDependency(dependency);
  }, []);

  const invalidateByPattern = useCallback((pattern: RegExp) => {
    return cacheRef.current.invalidateByPattern(pattern);
  }, []);

  const addInvalidationRule = useCallback((rule: CacheInvalidationRule) => {
    cacheRef.current.addInvalidationRule(rule);
  }, []);

  return { 
    getCached, 
    setCached, 
    clearCache, 
    getStats,
    invalidateByTag,
    invalidateByDependency,
    invalidateByPattern,
    addInvalidationRule
  };
}

// Enhanced cache key generators with tags and dependencies
export const cacheKeys = {
  tdee: (userId: string, date: string) => `tdee:${userId}:${date}`,
  trend: (userId: string, days: number) => `trend:${userId}:${days}`,
  meals: (userId: string, date: string) => `meals:${userId}:${date}`,
  food: (foodId: string) => `food:${foodId}`,
  recent: (userId: string) => `recent:${userId}`,
  favorites: (userId: string) => `favorites:${userId}`,
  profile: (userId: string) => `profile:${userId}`,
  analytics: (userId: string, period: string) => `analytics:${userId}:${period}`,
  progress: (userId: string, timeframe: string) => `progress:${userId}:${timeframe}`,
  recipes: (userId: string) => `recipes:${userId}`,
  weeklyCheckIn: (userId: string, weekStart: string) => `weekly:${userId}:${weekStart}`,
  expenditure: (userId: string, date: string) => `expenditure:${userId}:${date}`,
  habits: (userId: string, date: string) => `habits:${userId}:${date}`,
  dashboard: (userId: string, date: string) => `dashboard:${userId}:${date}`
};

// Cache tags for bulk invalidation
export const cacheTags = {
  user: (userId: string) => `user:${userId}`,
  nutrition: (userId: string) => `nutrition:${userId}`,
  weights: (userId: string) => `weights:${userId}`,
  foods: 'foods',
  userFoods: (userId: string) => `userFoods:${userId}`,
  analytics: (userId: string) => `analytics:${userId}`,
  dashboard: (userId: string) => `dashboard:${userId}`,
  tdee: (userId: string) => `tdee:${userId}`,
  trends: (userId: string) => `trends:${userId}`
};

// Cache dependencies for smart invalidation
export const cacheDependencies = {
  userProfile: (userId: string) => `dep:profile:${userId}`,
  userMeals: (userId: string, date: string) => `dep:meals:${userId}:${date}`,
  userWeights: (userId: string) => `dep:weights:${userId}`,
  userTargets: (userId: string) => `dep:targets:${userId}`,
  foodData: (foodId: string) => `dep:food:${foodId}`
};

// Global cache manager
export class CacheManager {
  private static instance: CacheManager;
  private caches: Map<string, PerformanceCache> = new Map();

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  getCache(name: string): PerformanceCache {
    if (!this.caches.has(name)) {
      const cache = new PerformanceCache(200);
      this.setupInvalidationRules(cache, name);
      this.caches.set(name, cache);
    }
    return this.caches.get(name)!;
  }

  private setupInvalidationRules(cache: PerformanceCache, cacheName: string): void {
    // Setup automatic invalidation rules based on cache type
    switch (cacheName) {
      case 'dashboard':
        // Dashboard cache depends on meals, weights, profile
        cache.addInvalidationRule({
          pattern: /^(meal|weight|profile):/,
          action: 'delete',
          dependencies: ['dashboard']
        });
        break;
      
      case 'analytics':
        // Analytics depend on all user data
        cache.addInvalidationRule({
          pattern: /^(meal|weight|profile|tdee):/,
          action: 'delete',
          dependencies: ['analytics']
        });
        break;
      
      case 'tdee':
        // TDEE depends on meals and weights
        cache.addInvalidationRule({
          pattern: /^(meal|weight):/,
          action: 'delete',
          dependencies: ['tdee']
        });
        break;
    }
  }

  // Invalidate across all caches
  invalidateByTag(tag: string): number {
    let totalDeleted = 0;
    for (const cache of this.caches.values()) {
      totalDeleted += cache.invalidateByTag(tag);
    }
    return totalDeleted;
  }

  invalidateByDependency(dependency: string): number {
    let totalDeleted = 0;
    for (const cache of this.caches.values()) {
      totalDeleted += cache.invalidateByDependency(dependency);
    }
    return totalDeleted;
  }

  // Smart invalidation based on data changes
  invalidateUserData(userId: string, dataType: 'meals' | 'weights' | 'profile' | 'all'): void {
    switch (dataType) {
      case 'meals':
        this.invalidateByTag(cacheTags.nutrition(userId));
        this.invalidateByTag(cacheTags.dashboard(userId));
        this.invalidateByTag(cacheTags.analytics(userId));
        this.invalidateByTag(cacheTags.tdee(userId));
        break;
      
      case 'weights':
        this.invalidateByTag(cacheTags.weights(userId));
        this.invalidateByTag(cacheTags.dashboard(userId));
        this.invalidateByTag(cacheTags.analytics(userId));
        this.invalidateByTag(cacheTags.tdee(userId));
        this.invalidateByTag(cacheTags.trends(userId));
        break;
      
      case 'profile':
        this.invalidateByTag(cacheTags.user(userId));
        this.invalidateByTag(cacheTags.dashboard(userId));
        this.invalidateByTag(cacheTags.analytics(userId));
        break;
      
      case 'all':
        this.invalidateByTag(cacheTags.user(userId));
        this.invalidateByTag(cacheTags.nutrition(userId));
        this.invalidateByTag(cacheTags.weights(userId));
        this.invalidateByTag(cacheTags.dashboard(userId));
        this.invalidateByTag(cacheTags.analytics(userId));
        this.invalidateByTag(cacheTags.tdee(userId));
        this.invalidateByTag(cacheTags.trends(userId));
        break;
    }
  }

  // Get global cache statistics
  getGlobalStats(): any {
    const stats: any = {};
    for (const [name, cache] of this.caches.entries()) {
      stats[name] = cache.getStats();
    }
    return stats;
  }

  // Clear all caches
  clearAll(): void {
    for (const cache of this.caches.values()) {
      cache.clear();
    }
  }
}

// Helper hook for smart caching with automatic invalidation
export function useSmartCache<T>(
  cacheName: string,
  userId: string,
  options?: {
    ttl?: number;
    autoInvalidate?: Array<'meals' | 'weights' | 'profile'>;
  }
) {
  const cacheManager = CacheManager.getInstance();
  const cache = cacheManager.getCache(cacheName);
  
  const getCached = useCallback((key: string) => {
    return cache.get(key);
  }, [cache]);

  const setCached = useCallback((
    key: string, 
    value: T, 
    customTtl?: number,
    cacheOptions?: {
      dependencies?: string[];
      tags?: string[];
    }
  ) => {
    // Auto-add user tags
    const tags = [
      cacheTags.user(userId),
      ...(cacheOptions?.tags || [])
    ];
    
    cache.set(key, value, customTtl || options?.ttl || 5 * 60 * 1000, {
      dependencies: cacheOptions?.dependencies,
      tags
    });
  }, [cache, userId, options?.ttl]);

  const invalidateUserData = useCallback((
    dataType: 'meals' | 'weights' | 'profile' | 'all'
  ) => {
    cacheManager.invalidateUserData(userId, dataType);
  }, [cacheManager, userId]);

  return {
    getCached,
    setCached,
    invalidateUserData,
    getStats: () => cache.getStats(),
    clearCache: () => cache.clear()
  };
}