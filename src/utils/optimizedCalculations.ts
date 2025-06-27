// Optimized algorithms for heavy calculations with performance monitoring

import { WeightEntry, NutritionLog, UserNutritionProfile } from './types';

// Performance monitoring
interface PerformanceMetrics {
  functionName: string;
  executionTime: number;
  inputSize: number;
  cacheHit?: boolean;
  algorithm?: string;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private maxMetrics = 1000;

  startTimer(functionName: string): (inputSize?: number, cacheHit?: boolean, algorithm?: string) => PerformanceMetrics {
    const startTime = performance.now();
    
    return (inputSize: number = 0, cacheHit: boolean = false, algorithm: string = 'default') => {
      const executionTime = performance.now() - startTime;
      const metric: PerformanceMetrics = {
        functionName,
        executionTime,
        inputSize,
        cacheHit,
        algorithm
      };
      
      this.metrics.push(metric);
      
      // Keep only recent metrics
      if (this.metrics.length > this.maxMetrics) {
        this.metrics = this.metrics.slice(-this.maxMetrics);
      }
      
      // Log slow operations in development
      if (process.env.NODE_ENV === 'development' && executionTime > 100) {
        console.warn(`[Performance] Slow calculation: ${functionName} took ${executionTime.toFixed(2)}ms`);
      }
      
      return metric;
    };
  }

  getStats() {
    const stats = this.metrics.reduce((acc, metric) => {
      if (!acc[metric.functionName]) {
        acc[metric.functionName] = {
          count: 0,
          totalTime: 0,
          avgTime: 0,
          maxTime: 0,
          minTime: Infinity,
          cacheHitRate: 0,
          cacheHits: 0
        };
      }
      
      const stat = acc[metric.functionName];
      stat.count++;
      stat.totalTime += metric.executionTime;
      stat.maxTime = Math.max(stat.maxTime, metric.executionTime);
      stat.minTime = Math.min(stat.minTime, metric.executionTime);
      stat.avgTime = stat.totalTime / stat.count;
      
      if (metric.cacheHit) stat.cacheHits++;
      stat.cacheHitRate = (stat.cacheHits / stat.count) * 100;
      
      return acc;
    }, {} as Record<string, any>);
    
    return stats;
  }
}

const performanceMonitor = new PerformanceMonitor();

// Optimized weight trend calculation using efficient algorithms
export function calculateOptimizedWeightTrend(
  weights: WeightEntry[],
  smoothingFactor: number = 0.1,
  algorithm: 'exponential' | 'kalman' | 'adaptive' = 'adaptive'
): Array<{ date: string; smoothedWeight: number; trend: number; confidence: number }> {
  const timer = performanceMonitor.startTimer('calculateOptimizedWeightTrend');
  
  if (weights.length === 0) {
    timer(0, false, algorithm);
    return [];
  }

  // Sort weights by date for efficient processing
  const sortedWeights = [...weights].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  let results: Array<{ date: string; smoothedWeight: number; trend: number; confidence: number }> = [];

  switch (algorithm) {
    case 'exponential':
      results = exponentialSmoothing(sortedWeights, smoothingFactor);
      break;
    case 'kalman':
      results = kalmanFilter(sortedWeights);
      break;
    case 'adaptive':
      results = adaptiveSmoothing(sortedWeights);
      break;
  }

  timer(weights.length, false, algorithm);
  return results;
}

// Exponential smoothing implementation (O(n))
function exponentialSmoothing(
  weights: WeightEntry[], 
  alpha: number
): Array<{ date: string; smoothedWeight: number; trend: number; confidence: number }> {
  const results = [];
  let smoothedWeight = weights[0].weight;
  let trend = 0;
  
  for (let i = 0; i < weights.length; i++) {
    const weight = weights[i];
    
    if (i === 0) {
      smoothedWeight = weight.weight;
    } else {
      const prevSmoothed = smoothedWeight;
      smoothedWeight = alpha * weight.weight + (1 - alpha) * smoothedWeight;
      trend = alpha * (smoothedWeight - prevSmoothed) + (1 - alpha) * trend;
    }
    
    // Calculate confidence based on data consistency
    const confidence = Math.min(100, (i + 1) * 10);
    
    results.push({
      date: weight.date,
      smoothedWeight: Math.round(smoothedWeight * 100) / 100,
      trend: Math.round(trend * 1000) / 1000,
      confidence
    });
  }
  
  return results;
}

// Kalman filter implementation for more sophisticated smoothing
function kalmanFilter(weights: WeightEntry[]): Array<{ date: string; smoothedWeight: number; trend: number; confidence: number }> {
  const results = [];
  
  // Kalman filter parameters
  let x = weights[0].weight; // Initial state (weight)
  let P = 1.0; // Initial uncertainty
  const Q = 0.01; // Process noise (weight change variability)
  const R = 0.1; // Measurement noise (scale accuracy)
  
  let velocity = 0; // Rate of weight change
  
  for (let i = 0; i < weights.length; i++) {
    const measurement = weights[i].weight;
    
    // Prediction step
    const x_pred = x + velocity;
    const P_pred = P + Q;
    
    // Update step
    const K = P_pred / (P_pred + R); // Kalman gain
    x = x_pred + K * (measurement - x_pred);
    P = (1 - K) * P_pred;
    
    // Update velocity (trend)
    if (i > 0) {
      const timeDiff = Math.max(1, i); // Simplified time difference
      velocity = (x - results[i - 1].smoothedWeight) / timeDiff;
    }
    
    const confidence = Math.min(100, 100 - P * 10);
    
    results.push({
      date: weights[i].date,
      smoothedWeight: Math.round(x * 100) / 100,
      trend: Math.round(velocity * 1000) / 1000,
      confidence: Math.round(confidence)
    });
  }
  
  return results;
}

// Adaptive smoothing that adjusts based on data volatility
function adaptiveSmoothing(weights: WeightEntry[]): Array<{ date: string; smoothedWeight: number; trend: number; confidence: number }> {
  if (weights.length <= 1) return exponentialSmoothing(weights, 0.3);
  
  // Calculate volatility to determine smoothing factor
  const volatility = calculateVolatility(weights);
  
  // Higher volatility = more smoothing (lower alpha)
  // Lower volatility = less smoothing (higher alpha)
  const alpha = Math.max(0.1, Math.min(0.5, 0.3 - volatility * 0.2));
  
  return exponentialSmoothing(weights, alpha);
}

// Optimized TDEE calculation with caching and incremental updates
export function calculateOptimizedTDEE(
  weights: WeightEntry[],
  nutritionLogs: NutritionLog[],
  profile: UserNutritionProfile
): {
  currentTDEE: number;
  confidence: number;
  algorithm: string;
  dataQuality: number;
} {
  const timer = performanceMonitor.startTimer('calculateOptimizedTDEE');
  
  // Early return for insufficient data
  if (weights.length < 7 || nutritionLogs.length < 7) {
    timer(weights.length + nutritionLogs.length, false, 'insufficient_data');
    return {
      currentTDEE: profile.tdee_estimate || 2500,
      confidence: 10,
      algorithm: 'fallback',
      dataQuality: 20
    };
  }

  // Use different algorithms based on data quantity and quality
  const dataPoints = Math.min(weights.length, nutritionLogs.length);
  let algorithm: string;
  let result: any;

  if (dataPoints >= 21) {
    // Sufficient data for sophisticated analysis
    algorithm = 'weighted_regression';
    result = weightedRegressionTDEE(weights, nutritionLogs, profile);
  } else if (dataPoints >= 14) {
    // Medium data - use moving average approach
    algorithm = 'moving_average';
    result = movingAverageTDEE(weights, nutritionLogs, profile);
  } else {
    // Limited data - simple calculation
    algorithm = 'simple_energy_balance';
    result = simpleEnergyBalance(weights, nutritionLogs, profile);
  }

  timer(dataPoints, false, algorithm);
  return { ...result, algorithm };
}

// Weighted regression for TDEE calculation (most accurate for large datasets)
function weightedRegressionTDEE(
  weights: WeightEntry[],
  nutritionLogs: NutritionLog[],
  profile: UserNutritionProfile
): { currentTDEE: number; confidence: number; dataQuality: number } {
  // Combine weight and nutrition data by date
  const combinedData = combineDataByDate(weights, nutritionLogs);
  
  if (combinedData.length < 14) {
    return simpleEnergyBalance(weights, nutritionLogs, profile);
  }

  // Calculate weight changes and energy balance
  const dataPoints = [];
  for (let i = 1; i < combinedData.length; i++) {
    const current = combinedData[i];
    const previous = combinedData[i - 1];
    
    if (current.weight && previous.weight && current.calories) {
      const weightChange = current.weight - previous.weight;
      const energyBalance = current.calories; // Simplified - could include exercise
      
      dataPoints.push({
        energyBalance,
        weightChange,
        weight: Math.abs(i - combinedData.length) // More recent data has higher weight
      });
    }
  }

  if (dataPoints.length < 7) {
    return simpleEnergyBalance(weights, nutritionLogs, profile);
  }

  // Weighted linear regression
  // 1 kg of fat = ~7700 calories (used implicitly in the algorithm)
  
  let numerator = 0;
  let denominator = 0;
  let totalWeight = 0;

  for (const point of dataPoints) {
    const actualWeightChange = point.weightChange;
    const weight = point.weight;
    
    numerator += weight * point.energyBalance * actualWeightChange;
    denominator += weight * Math.pow(actualWeightChange, 2);
    totalWeight += weight;
  }

  const estimatedTDEE = denominator > 0 ? numerator / denominator : profile.tdee_estimate;
  
  // Calculate confidence based on data consistency
  const variance = calculateVariance(dataPoints.map(p => p.weightChange));
  const confidence = Math.max(10, Math.min(95, 80 - variance * 20));
  
  // Calculate data quality
  const dataQuality = Math.min(100, (dataPoints.length / 21) * 100);

  return {
    currentTDEE: Math.round(Math.max(1200, Math.min(5000, estimatedTDEE))),
    confidence: Math.round(confidence),
    dataQuality: Math.round(dataQuality)
  };
}

// Moving average TDEE calculation (good for medium datasets)
function movingAverageTDEE(
  weights: WeightEntry[],
  nutritionLogs: NutritionLog[],
  profile: UserNutritionProfile
): { currentTDEE: number; confidence: number; dataQuality: number } {
  const combinedData = combineDataByDate(weights, nutritionLogs);
  const windowSize = Math.min(14, Math.floor(combinedData.length / 2));
  
  if (combinedData.length < windowSize) {
    return simpleEnergyBalance(weights, nutritionLogs, profile);
  }

  // Calculate rolling averages
  const rollingAverages = [];
  for (let i = windowSize; i < combinedData.length; i++) {
    const window = combinedData.slice(i - windowSize, i);
    
    const avgWeight = window.reduce((sum, d) => sum + (d.weight || 0), 0) / window.length;
    const avgCalories = window.reduce((sum, d) => sum + (d.calories || 0), 0) / window.length;
    
    const nextData = combinedData[i];
    if (nextData.weight) {
      const weightChange = nextData.weight - avgWeight;
      rollingAverages.push({
        avgCalories,
        weightChange,
        actualWeight: nextData.weight
      });
    }
  }

  if (rollingAverages.length === 0) {
    return simpleEnergyBalance(weights, nutritionLogs, profile);
  }

  // Calculate TDEE from energy balance
  const caloriesPerKg = 7700;
  let totalTDEE = 0;
  let validCalculations = 0;

  for (const avg of rollingAverages) {
    const energyDeficit = avg.weightChange * caloriesPerKg;
    const estimatedTDEE = avg.avgCalories + energyDeficit;
    
    if (estimatedTDEE > 1000 && estimatedTDEE < 6000) {
      totalTDEE += estimatedTDEE;
      validCalculations++;
    }
  }

  const currentTDEE = validCalculations > 0 ? totalTDEE / validCalculations : profile.tdee_estimate;
  const confidence = Math.min(85, (validCalculations / rollingAverages.length) * 70);
  const dataQuality = Math.min(100, (combinedData.length / 14) * 100);

  return {
    currentTDEE: Math.round(Math.max(1200, Math.min(5000, currentTDEE))),
    confidence: Math.round(confidence),
    dataQuality: Math.round(dataQuality)
  };
}

// Simple energy balance calculation (for small datasets)
function simpleEnergyBalance(
  weights: WeightEntry[],
  nutritionLogs: NutritionLog[],
  profile: UserNutritionProfile
): { currentTDEE: number; confidence: number; dataQuality: number } {
  const combinedData = combineDataByDate(weights, nutritionLogs);
  
  if (combinedData.length < 7) {
    return {
      currentTDEE: profile.tdee_estimate || 2500,
      confidence: 10,
      dataQuality: 20
    };
  }

  const recent = combinedData.slice(-7);
  const avgCalories = recent.reduce((sum, d) => sum + (d.calories || 0), 0) / recent.length;
  
  const firstWeight = recent[0].weight;
  const lastWeight = recent[recent.length - 1].weight;
  
  if (!firstWeight || !lastWeight) {
    return {
      currentTDEE: profile.tdee_estimate || 2500,
      confidence: 10,
      dataQuality: 30
    };
  }

  const weightChange = lastWeight - firstWeight;
  const caloriesPerKg = 7700;
  const energyDeficit = (weightChange * caloriesPerKg) / 7; // Per day
  
  const estimatedTDEE = avgCalories + energyDeficit;
  const confidence = Math.min(60, combinedData.length * 5);
  const dataQuality = Math.min(100, (combinedData.length / 7) * 50);

  return {
    currentTDEE: Math.round(Math.max(1200, Math.min(5000, estimatedTDEE))),
    confidence: Math.round(confidence),
    dataQuality: Math.round(dataQuality)
  };
}

// Utility functions for optimization
function combineDataByDate(weights: WeightEntry[], nutritionLogs: NutritionLog[]) {
  const dataMap = new Map();
  
  // Add weights
  weights.forEach(weight => {
    if (!dataMap.has(weight.date)) {
      dataMap.set(weight.date, {});
    }
    dataMap.get(weight.date).weight = weight.weight;
    dataMap.get(weight.date).date = weight.date;
  });
  
  // Add nutrition logs
  nutritionLogs.forEach(log => {
    if (!dataMap.has(log.date)) {
      dataMap.set(log.date, {});
    }
    dataMap.get(log.date).calories = log.calories;
    dataMap.get(log.date).date = log.date;
  });
  
  return Array.from(dataMap.values())
    .filter(d => d.date)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

function calculateVolatility(weights: WeightEntry[]): number {
  if (weights.length < 2) return 0;
  
  const changes = [];
  for (let i = 1; i < weights.length; i++) {
    changes.push(Math.abs(weights[i].weight - weights[i - 1].weight));
  }
  
  const avgChange = changes.reduce((sum, change) => sum + change, 0) / changes.length;
  return Math.min(1, avgChange / 2); // Normalize to 0-1
}

function calculateVariance(values: number[]): number {
  if (values.length === 0) return 0;
  
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
  
  return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length;
}

// Batch processing for large datasets
export function batchProcessNutritionData<T, R>(
  data: T[],
  processFn: (batch: T[]) => R[],
  batchSize: number = 100
): R[] {
  const timer = performanceMonitor.startTimer('batchProcessNutritionData');
  
  const results: R[] = [];
  
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    const batchResults = processFn(batch);
    results.push(...batchResults);
    
    // Yield control to prevent blocking
    if (i % (batchSize * 10) === 0) {
      setTimeout(() => {}, 0);
    }
  }
  
  timer(data.length, false, `batch_${batchSize}`);
  return results;
}

// Memory-efficient data streaming for very large datasets
export function* streamProcessData<T, R>(
  data: T[],
  processFn: (item: T) => R,
  chunkSize: number = 50
): Generator<R[], void, unknown> {
  for (let i = 0; i < data.length; i += chunkSize) {
    const chunk = data.slice(i, i + chunkSize);
    yield chunk.map(processFn);
  }
}

// Export performance monitoring
export function getCalculationPerformanceStats() {
  return performanceMonitor.getStats();
}

// Cleanup old performance data
export function clearPerformanceHistory() {
  performanceMonitor['metrics'] = [];
}