// Weight trend modeling using exponential smoothing
// Based on MacroFactor's approach to trend weight calculation

import { WeightEntry } from './types';

export interface WeightTrendPoint {
  date: string;
  rawWeight: number;
  trendWeight: number;
  confidence: number;
}

export interface WeightTrendAnalysis {
  currentTrendWeight: number;
  weeklyChangeRate: number; // % body weight per week
  dailyChangeRate: number; // kg or lbs per day
  volatility: number; // measure of weight fluctuation
  dataQuality: 'low' | 'medium' | 'high';
  trendDirection: 'gaining' | 'losing' | 'maintaining';
}

/**
 * Calculate exponentially smoothed weight trend
 * Uses adaptive smoothing based on data consistency
 */
export function calculateWeightTrend(
  weights: WeightEntry[],
  smoothingFactor: number = 0.1
): WeightTrendPoint[] {
  if (weights.length === 0) return [];

  // Sort by date
  const sortedWeights = [...weights].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const trendPoints: WeightTrendPoint[] = [];
  let currentTrend = sortedWeights[0].weight;

  // Fill in missing days and calculate trend
  const startDate = new Date(sortedWeights[0].date);
  const endDate = new Date(sortedWeights[sortedWeights.length - 1].date);
  let weightIndex = 0;

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    const currentWeight = sortedWeights[weightIndex];

    if (currentWeight && currentWeight.date === dateStr) {
      // We have actual data for this day
      const alpha = getAdaptiveSmoothingFactor(
        currentWeight.weight,
        currentTrend,
        smoothingFactor
      );
      
      currentTrend = alpha * currentWeight.weight + (1 - alpha) * currentTrend;
      
      trendPoints.push({
        date: dateStr,
        rawWeight: currentWeight.weight,
        trendWeight: currentTrend,
        confidence: 1.0
      });
      
      weightIndex++;
    } else {
      // Missing data - interpolate trend
      trendPoints.push({
        date: dateStr,
        rawWeight: currentTrend, // Use trend as estimate
        trendWeight: currentTrend,
        confidence: 0.5 // Lower confidence for interpolated points
      });
    }
  }

  return trendPoints;
}

/**
 * Adaptive smoothing factor based on weight volatility
 * Larger changes get less smoothing to react faster
 */
function getAdaptiveSmoothingFactor(
  currentWeight: number,
  trendWeight: number,
  baseFactor: number
): number {
  const percentChange = Math.abs((currentWeight - trendWeight) / trendWeight);
  
  // If change is > 2%, reduce smoothing to react faster
  if (percentChange > 0.02) {
    return Math.min(baseFactor * 2, 0.3);
  }
  
  return baseFactor;
}

/**
 * Analyze weight trend for coaching decisions
 */
export function analyzeWeightTrend(
  trendPoints: WeightTrendPoint[]
): WeightTrendAnalysis {
  if (trendPoints.length < 7) {
    return {
      currentTrendWeight: trendPoints[trendPoints.length - 1]?.trendWeight || 0,
      weeklyChangeRate: 0,
      dailyChangeRate: 0,
      volatility: 0,
      dataQuality: 'low',
      trendDirection: 'maintaining'
    };
  }

  // Get last 14 days of data for analysis
  const recentPoints = trendPoints.slice(-14);
  const currentWeight = recentPoints[recentPoints.length - 1].trendWeight;
  const weekAgoWeight = recentPoints[Math.max(0, recentPoints.length - 8)].trendWeight;
  const twoWeeksAgoWeight = recentPoints[0].trendWeight;

  // Calculate weekly change rate
  const weeklyChange = currentWeight - weekAgoWeight;
  const weeklyChangeRate = (weeklyChange / weekAgoWeight) * 100;

  // Calculate daily change rate
  const totalDays = recentPoints.length;
  const totalChange = currentWeight - twoWeeksAgoWeight;
  const dailyChangeRate = totalChange / totalDays;

  // Calculate volatility (standard deviation of daily changes)
  const dailyChanges: number[] = [];
  for (let i = 1; i < recentPoints.length; i++) {
    dailyChanges.push(recentPoints[i].rawWeight - recentPoints[i - 1].rawWeight);
  }
  
  const avgDailyChange = dailyChanges.reduce((a, b) => a + b, 0) / dailyChanges.length;
  const variance = dailyChanges.reduce((sum, change) => {
    return sum + Math.pow(change - avgDailyChange, 2);
  }, 0) / dailyChanges.length;
  const volatility = Math.sqrt(variance);

  // Determine data quality based on confidence scores
  const avgConfidence = recentPoints.reduce((sum, p) => sum + p.confidence, 0) / recentPoints.length;
  const dataQuality = avgConfidence > 0.8 ? 'high' : avgConfidence > 0.5 ? 'medium' : 'low';

  // Determine trend direction
  let trendDirection: 'gaining' | 'losing' | 'maintaining' = 'maintaining';
  const weeklyThreshold = 0.25; // 0.25% per week threshold
  
  if (weeklyChangeRate > weeklyThreshold) {
    trendDirection = 'gaining';
  } else if (weeklyChangeRate < -weeklyThreshold) {
    trendDirection = 'losing';
  }

  return {
    currentTrendWeight: currentWeight,
    weeklyChangeRate,
    dailyChangeRate,
    volatility,
    dataQuality,
    trendDirection
  };
}

/**
 * Calculate energy stored/released from weight change
 * Uses ~7700 kcal per kg of body weight change
 */
export function calculateEnergyFromWeightChange(
  weightChangeKg: number,
  daysElapsed: number
): number {
  const CALORIES_PER_KG = 7700; // Approximate caloric density of body tissue
  const totalCaloriesStored = weightChangeKg * CALORIES_PER_KG;
  return totalCaloriesStored / daysElapsed; // Daily calorie surplus/deficit
}

/**
 * Back-calculate TDEE from weight trend and intake
 * TDEE = Average Intake ± Energy from Weight Change
 */
export function calculateAdherenceNeutralTDEE(
  avgDailyIntake: number,
  weightChangeKg: number,
  daysElapsed: number
): number {
  const energyFromWeightChange = calculateEnergyFromWeightChange(weightChangeKg, daysElapsed);
  
  // If gaining weight, TDEE is lower than intake
  // If losing weight, TDEE is higher than intake
  return Math.round(avgDailyIntake - energyFromWeightChange);
}

/**
 * Get confidence in TDEE estimate based on data quality
 */
export function getTDEEConfidence(
  loggedDays: number,
  totalDays: number,
  weightEntries: number,
  volatility: number
): { score: number; level: 'low' | 'medium' | 'high' } {
  // Factors for confidence:
  // 1. Logging consistency (40%)
  const loggingScore = (loggedDays / totalDays) * 0.4;
  
  // 2. Weight entry frequency (30%)
  const weightScore = Math.min(weightEntries / totalDays, 1) * 0.3;
  
  // 3. Weight stability (30%) - lower volatility = higher confidence
  const stabilityScore = Math.max(0, 1 - (volatility / 2)) * 0.3;
  
  const totalScore = loggingScore + weightScore + stabilityScore;
  
  return {
    score: totalScore,
    level: totalScore > 0.7 ? 'high' : totalScore > 0.4 ? 'medium' : 'low'
  };
}