// Behavioral modeling and data weighting system
// Weights TDEE calculations based on data quality and consistency patterns

import { NutritionLog, WeightEntry } from './types';

export interface DataPeriod {
  startDate: string;
  endDate: string;
  logs: NutritionLog[];
  weights: WeightEntry[];
  consistency: number; // 0-1
  stability: number; // 0-1 (how stable the data is)
  weight: number; // 0-1 (how much to weight this period)
}

export interface BehavioralPattern {
  type: 'weekend_deviation' | 'weekday_consistency' | 'meal_skipping' | 'binge_restrict' | 'steady';
  strength: number; // 0-1
  impact: 'positive' | 'negative' | 'neutral';
  description: string;
}

export interface DataQualityMetrics {
  overallQuality: number; // 0-1
  loggingDensity: number; // 0-1
  weighingFrequency: number; // 0-1
  dataStability: number; // 0-1
  patterns: BehavioralPattern[];
  recommendations: string[];
}

/**
 * Analyze data periods and assign weights for TDEE calculation
 */
export function analyzeDataPeriods(
  logs: NutritionLog[],
  weights: WeightEntry[],
  periodLengthDays: number = 7
): DataPeriod[] {
  if (logs.length === 0 || weights.length === 0) return [];
  
  // Sort by date
  const sortedLogs = [...logs].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  const sortedWeights = [...weights].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  
  // Determine date range
  const startDate = new Date(Math.min(
    new Date(sortedLogs[0].date).getTime(),
    new Date(sortedWeights[0].date).getTime()
  ));
  const endDate = new Date(Math.max(
    new Date(sortedLogs[sortedLogs.length - 1].date).getTime(),
    new Date(sortedWeights[sortedWeights.length - 1].date).getTime()
  ));
  
  const periods: DataPeriod[] = [];
  
  // Create periods
  let currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const periodStart = new Date(currentDate);
    const periodEnd = new Date(currentDate);
    periodEnd.setDate(periodEnd.getDate() + periodLengthDays - 1);
    
    // Get data for this period
    const periodLogs = sortedLogs.filter(log => {
      const logDate = new Date(log.date);
      return logDate >= periodStart && logDate <= periodEnd;
    });
    
    const periodWeights = sortedWeights.filter(weight => {
      const weightDate = new Date(weight.date);
      return weightDate >= periodStart && weightDate <= periodEnd;
    });
    
    if (periodLogs.length > 0 || periodWeights.length > 0) {
      // Calculate consistency (% of days with logs)
      const consistency = periodLogs.length / periodLengthDays;
      
      // Calculate stability (coefficient of variation in calories)
      const stability = calculateStability(periodLogs);
      
      // Calculate weight based on recency, consistency, and stability
      const recencyWeight = calculateRecencyWeight(periodStart, endDate);
      const dataWeight = (consistency * 0.4 + stability * 0.4 + recencyWeight * 0.2);
      
      periods.push({
        startDate: periodStart.toISOString().split('T')[0],
        endDate: periodEnd.toISOString().split('T')[0],
        logs: periodLogs,
        weights: periodWeights,
        consistency,
        stability,
        weight: dataWeight
      });
    }
    
    currentDate.setDate(currentDate.getDate() + periodLengthDays);
  }
  
  return periods;
}

/**
 * Calculate stability of calorie intake
 */
function calculateStability(logs: NutritionLog[]): number {
  if (logs.length < 2) return 0.5;
  
  const calories = logs.map(log => log.calories);
  const mean = calories.reduce((a, b) => a + b, 0) / calories.length;
  
  if (mean === 0) return 0;
  
  const variance = calories.reduce((sum, cal) => 
    sum + Math.pow(cal - mean, 2), 0
  ) / calories.length;
  
  const stdDev = Math.sqrt(variance);
  const coefficientOfVariation = stdDev / mean;
  
  // Convert to stability score (lower CV = higher stability)
  // CV of 0.2 (20%) or less = high stability
  return Math.max(0, Math.min(1, 1 - coefficientOfVariation / 0.4));
}

/**
 * Calculate recency weight (more recent = higher weight)
 */
function calculateRecencyWeight(periodStart: Date, overallEnd: Date): number {
  const daysAgo = Math.floor(
    (overallEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)
  );
  
  // Exponential decay with half-life of 30 days
  return Math.exp(-daysAgo / 30);
}

/**
 * Detect behavioral patterns in the data
 */
export function detectBehavioralPatterns(
  logs: NutritionLog[]
): BehavioralPattern[] {
  const patterns: BehavioralPattern[] = [];
  
  if (logs.length < 14) return patterns;
  
  // Pattern 1: Weekend vs Weekday deviation
  const weekendPattern = detectWeekendPattern(logs);
  if (weekendPattern) patterns.push(weekendPattern);
  
  // Pattern 2: Meal skipping
  const skippingPattern = detectMealSkipping(logs);
  if (skippingPattern) patterns.push(skippingPattern);
  
  // Pattern 3: Binge-restrict cycles
  const bingeRestrictPattern = detectBingeRestrict(logs);
  if (bingeRestrictPattern) patterns.push(bingeRestrictPattern);
  
  // Pattern 4: Steady logging
  const steadyPattern = detectSteadyPattern(logs);
  if (steadyPattern) patterns.push(steadyPattern);
  
  return patterns;
}

/**
 * Detect weekend deviation pattern
 */
function detectWeekendPattern(logs: NutritionLog[]): BehavioralPattern | null {
  const weekdayLogs = logs.filter(log => {
    const day = new Date(log.date).getDay();
    return day >= 1 && day <= 5;
  });
  
  const weekendLogs = logs.filter(log => {
    const day = new Date(log.date).getDay();
    return day === 0 || day === 6;
  });
  
  if (weekdayLogs.length < 5 || weekendLogs.length < 2) return null;
  
  const weekdayAvg = weekdayLogs.reduce((sum, log) => sum + log.calories, 0) / weekdayLogs.length;
  const weekendAvg = weekendLogs.reduce((sum, log) => sum + log.calories, 0) / weekendLogs.length;
  
  const deviation = Math.abs(weekendAvg - weekdayAvg) / weekdayAvg;
  
  if (deviation > 0.15) { // 15% deviation
    return {
      type: 'weekend_deviation',
      strength: Math.min(deviation / 0.3, 1), // Max at 30% deviation
      impact: weekendAvg > weekdayAvg ? 'negative' : 'positive',
      description: weekendAvg > weekdayAvg 
        ? `Weekend calories ${Math.round(deviation * 100)}% higher than weekdays`
        : `Weekend calories ${Math.round(deviation * 100)}% lower than weekdays`
    };
  }
  
  return null;
}

/**
 * Detect meal skipping pattern
 */
function detectMealSkipping(logs: NutritionLog[]): BehavioralPattern | null {
  const veryLowCalorieDays = logs.filter(log => log.calories < 1000).length;
  const percentage = veryLowCalorieDays / logs.length;
  
  if (percentage > 0.1) { // More than 10% of days
    return {
      type: 'meal_skipping',
      strength: Math.min(percentage / 0.3, 1),
      impact: 'negative',
      description: `${Math.round(percentage * 100)}% of days have very low calorie intake`
    };
  }
  
  return null;
}

/**
 * Detect binge-restrict pattern
 */
function detectBingeRestrict(logs: NutritionLog[]): BehavioralPattern | null {
  if (logs.length < 7) return null;
  
  // Look for alternating high/low days
  let alternations = 0;
  const avgCalories = logs.reduce((sum, log) => sum + log.calories, 0) / logs.length;
  
  for (let i = 1; i < logs.length; i++) {
    const prev = logs[i - 1].calories;
    const curr = logs[i].calories;
    
    const prevHigh = prev > avgCalories * 1.2;
    const currHigh = curr > avgCalories * 1.2;
    const prevLow = prev < avgCalories * 0.8;
    const currLow = curr < avgCalories * 0.8;
    
    if ((prevHigh && currLow) || (prevLow && currHigh)) {
      alternations++;
    }
  }
  
  const alternationRate = alternations / (logs.length - 1);
  
  if (alternationRate > 0.3) { // 30% of transitions are alternations
    return {
      type: 'binge_restrict',
      strength: Math.min(alternationRate / 0.5, 1),
      impact: 'negative',
      description: 'Detected pattern of alternating high and low calorie days'
    };
  }
  
  return null;
}

/**
 * Detect steady logging pattern
 */
function detectSteadyPattern(logs: NutritionLog[]): BehavioralPattern | null {
  const stability = calculateStability(logs);
  
  if (stability > 0.7) {
    return {
      type: 'steady',
      strength: stability,
      impact: 'positive',
      description: 'Consistent daily calorie intake detected'
    };
  }
  
  return null;
}

/**
 * Calculate overall data quality metrics
 */
export function calculateDataQuality(
  logs: NutritionLog[],
  weights: WeightEntry[],
  targetDays: number = 30
): DataQualityMetrics {
  const actualDays = Math.floor(
    (new Date().getTime() - new Date(Math.min(
      ...logs.map(l => new Date(l.date).getTime()),
      ...weights.map(w => new Date(w.date).getTime())
    )).getTime()) / (1000 * 60 * 60 * 24)
  );
  
  const daysToConsider = Math.min(actualDays, targetDays);
  
  // Logging density
  const loggingDensity = Math.min(logs.length / daysToConsider, 1);
  
  // Weighing frequency
  const weighingFrequency = Math.min(weights.length / (daysToConsider / 3), 1); // Expect weighing every 3 days
  
  // Data stability
  const dataStability = calculateStability(logs);
  
  // Detect patterns
  const patterns = detectBehavioralPatterns(logs);
  
  // Overall quality (weighted average)
  const overallQuality = (
    loggingDensity * 0.4 +
    weighingFrequency * 0.3 +
    dataStability * 0.3
  );
  
  // Generate recommendations
  const recommendations: string[] = [];
  
  if (loggingDensity < 0.7) {
    recommendations.push('Log meals more consistently - aim for at least 5 days per week');
  }
  
  if (weighingFrequency < 0.7) {
    recommendations.push('Weigh yourself more frequently - aim for every 2-3 days');
  }
  
  if (dataStability < 0.5) {
    recommendations.push('Try to maintain more consistent daily calories for accurate TDEE calculation');
  }
  
  // Pattern-based recommendations
  patterns.forEach(pattern => {
    if (pattern.impact === 'negative') {
      switch (pattern.type) {
        case 'weekend_deviation':
          recommendations.push('Consider planning weekend meals to match weekday consistency');
          break;
        case 'meal_skipping':
          recommendations.push('Avoid skipping meals - it makes TDEE calculation less accurate');
          break;
        case 'binge_restrict':
          recommendations.push('Aim for steady daily calories rather than alternating high/low days');
          break;
      }
    }
  });
  
  return {
    overallQuality,
    loggingDensity,
    weighingFrequency,
    dataStability,
    patterns,
    recommendations
  };
}

/**
 * Weight TDEE calculations based on data quality
 */
export function getWeightedTDEE(
  tdeeCalculations: { period: DataPeriod; tdee: number }[]
): { weightedTDEE: number; confidence: number } {
  if (tdeeCalculations.length === 0) {
    return { weightedTDEE: 0, confidence: 0 };
  }
  
  let totalWeight = 0;
  let weightedSum = 0;
  
  tdeeCalculations.forEach(({ period, tdee }) => {
    const weight = period.weight;
    weightedSum += tdee * weight;
    totalWeight += weight;
  });
  
  const weightedTDEE = totalWeight > 0 ? weightedSum / totalWeight : 0;
  const confidence = Math.min(totalWeight, 1); // Max confidence at weight sum of 1
  
  return {
    weightedTDEE: Math.round(weightedTDEE),
    confidence
  };
}