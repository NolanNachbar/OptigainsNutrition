// Adaptive TDEE Algorithm with Trend Weight Calculation
// Based on exponentially weighted moving averages and actual energy balance

import { WeightEntry, NutritionLog } from './types';

interface TDEEData {
  currentTDEE: number;
  confidence: number; // 0-100
  trendWeight: number;
  weightTrend: 'gaining' | 'losing' | 'maintaining';
  weeklyChange: number; // kg per week
  adherenceScore: number; // 0-100
  lastUpdated: string;
}

// Calculate exponentially weighted moving average for trend weight
export const calculateTrendWeight = (
  weights: WeightEntry[], 
  smoothingFactor: number = 0.1
): number => {
  if (weights.length === 0) return 0;
  
  // Sort by date ascending
  const sortedWeights = [...weights].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  
  // Initialize with first weight
  let trend = sortedWeights[0].weight;
  
  // Apply exponential smoothing
  for (let i = 1; i < sortedWeights.length; i++) {
    trend = trend + smoothingFactor * (sortedWeights[i].weight - trend);
  }
  
  return Math.round(trend * 10) / 10;
};

// Calculate rate of weight change (kg per week)
export const calculateWeightChangeRate = (
  weights: WeightEntry[],
  days: number = 14
): number => {
  if (weights.length < 2) return 0;
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  const recentWeights = weights
    .filter(w => new Date(w.date) >= cutoffDate)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  if (recentWeights.length < 2) return 0;
  
  const firstWeight = calculateTrendWeight(recentWeights.slice(0, 3));
  const lastWeight = calculateTrendWeight(recentWeights.slice(-3));
  const daysDiff = Math.abs(
    (new Date(recentWeights[recentWeights.length - 1].date).getTime() - 
     new Date(recentWeights[0].date).getTime()) / (1000 * 60 * 60 * 24)
  );
  
  if (daysDiff === 0) return 0;
  
  const changePerDay = (lastWeight - firstWeight) / daysDiff;
  return changePerDay * 7; // Convert to per week
};

// Calculate adaptive TDEE based on actual results
export const calculateAdaptiveTDEE = (
  weights: WeightEntry[],
  nutritionLogs: NutritionLog[],
  initialTDEE: number,
  minDataDays: number = 7
): TDEEData => {
  // Need at least minDataDays of data
  const validLogs = nutritionLogs.filter(log => log.calories > 0);
  if (weights.length < 2 || validLogs.length < minDataDays) {
    return {
      currentTDEE: initialTDEE,
      confidence: 0,
      trendWeight: weights[0]?.weight || 0,
      weightTrend: 'maintaining',
      weeklyChange: 0,
      adherenceScore: 0,
      lastUpdated: new Date().toISOString()
    };
  }
  
  // Calculate trend weight and rate of change
  const trendWeight = calculateTrendWeight(weights);
  const weeklyChange = calculateWeightChangeRate(weights);
  
  // Determine weight trend
  let weightTrend: 'gaining' | 'losing' | 'maintaining';
  if (weeklyChange > 0.1) weightTrend = 'gaining';
  else if (weeklyChange < -0.1) weightTrend = 'losing';
  else weightTrend = 'maintaining';
  
  // Calculate average intake over recent period
  const recentDays = 14;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - recentDays);
  
  const recentLogs = validLogs
    .filter(log => new Date(log.date) >= cutoffDate)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  if (recentLogs.length < minDataDays) {
    return {
      currentTDEE: initialTDEE,
      confidence: 10,
      trendWeight,
      weightTrend,
      weeklyChange,
      adherenceScore: (validLogs.length / minDataDays) * 100,
      lastUpdated: new Date().toISOString()
    };
  }
  
  // Calculate average daily intake
  const avgCalories = recentLogs.reduce((sum, log) => sum + log.calories, 0) / recentLogs.length;
  
  // Calculate TDEE based on energy balance
  // 1 kg of body weight ≈ 7700 calories
  const dailyChange = weeklyChange / 7; // kg per day
  const calorieAdjustment = dailyChange * 7700; // calories per day
  
  // TDEE = Average Intake - Calorie Surplus/Deficit
  const calculatedTDEE = Math.round(avgCalories - calorieAdjustment);
  
  // Smooth the TDEE change to avoid dramatic swings
  const tdeeChange = calculatedTDEE - initialTDEE;
  const maxChange = initialTDEE * 0.2; // Max 20% change at once
  const smoothedTDEE = initialTDEE + Math.max(-maxChange, Math.min(maxChange, tdeeChange));
  
  // Calculate confidence based on data quality
  const dataPoints = recentLogs.length;
  const consistency = Math.min(100, (dataPoints / recentDays) * 100);
  const weightDataPoints = weights.filter(w => new Date(w.date) >= cutoffDate).length;
  const weightConsistency = Math.min(100, (weightDataPoints / recentDays) * 100);
  
  const confidence = Math.round((consistency + weightConsistency) / 2);
  
  // Calculate adherence score
  const targetCalories = initialTDEE; // Use initial as baseline
  const adherenceScores = recentLogs.map(log => {
    const diff = Math.abs(log.calories - targetCalories);
    const percentDiff = (diff / targetCalories) * 100;
    return Math.max(0, 100 - percentDiff);
  });
  const adherenceScore = Math.round(
    adherenceScores.reduce((sum, score) => sum + score, 0) / adherenceScores.length
  );
  
  return {
    currentTDEE: Math.round(smoothedTDEE),
    confidence,
    trendWeight,
    weightTrend,
    weeklyChange: Math.round(weeklyChange * 100) / 100,
    adherenceScore,
    lastUpdated: new Date().toISOString()
  };
};

// Get TDEE adjustment recommendations
export const getTDEERecommendations = (
  tdeeData: TDEEData,
  goal: 'cut' | 'gain' | 'maintenance' | 'recomp',
  targetRate: number // % body weight per week
) => {
  const recommendations = [];
  
  // Check if current rate matches goal
  const currentRate = (tdeeData.weeklyChange / tdeeData.trendWeight) * 100;
  
  if (goal === 'cut') {
    if (currentRate > -targetRate * 0.5) {
      recommendations.push({
        type: 'increase_deficit',
        message: `Weight loss is slower than target. Consider reducing calories by 100-200.`,
        severity: 'warning' as const,
        adjustment: -150
      });
    } else if (currentRate < -targetRate * 1.5) {
      recommendations.push({
        type: 'decrease_deficit',
        message: `Weight loss is too rapid. Increase calories by 100-200 to preserve muscle.`,
        severity: 'warning' as const,
        adjustment: 150
      });
    }
  } else if (goal === 'gain') {
    if (currentRate < targetRate * 0.5) {
      recommendations.push({
        type: 'increase_surplus',
        message: `Weight gain is slower than target. Consider adding 100-200 calories.`,
        severity: 'info' as const,
        adjustment: 150
      });
    } else if (currentRate > targetRate * 1.5) {
      recommendations.push({
        type: 'decrease_surplus',
        message: `Weight gain is too rapid. Reduce calories by 100-200 to minimize fat gain.`,
        severity: 'warning' as const,
        adjustment: -150
      });
    }
  }
  
  // Check adherence
  if (tdeeData.adherenceScore < 70) {
    recommendations.push({
      type: 'improve_adherence',
      message: `Low adherence detected. Focus on consistency before making adjustments.`,
      severity: 'info' as const,
      adjustment: 0
    });
  }
  
  // Check confidence
  if (tdeeData.confidence < 50) {
    recommendations.push({
      type: 'need_more_data',
      message: `Need more consistent data for accurate recommendations. Keep logging!`,
      severity: 'info' as const,
      adjustment: 0
    });
  }
  
  return recommendations;
};