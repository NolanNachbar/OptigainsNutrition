// Adaptive TDEE Algorithm with MacroFactor-style adherence-neutral calculations
// Uses advanced weight trend modeling and energy balance equations

import { WeightEntry, NutritionLog, Macros, GoalType } from './types';
import { 
  calculateWeightTrend, 
  analyzeWeightTrend, 
  calculateAdherenceNeutralTDEE as calculateTDEEFromTrend,
  getTDEEConfidence 
} from './weightTrend';
import { calculateAdherenceMetrics } from './adherenceScoring';
import { 
  BiologicalData, 
  ActivityData, 
  calculateEnergyComponents,
  EnergyComponents 
} from './energyExpenditure';

export interface TDEEData {
  currentTDEE: number;
  confidence: number; // 0-100
  confidenceLevel: 'low' | 'medium' | 'high';
  trendWeight: number;
  weightTrend: 'gaining' | 'losing' | 'maintaining';
  weeklyChangeRate: number; // % body weight per week
  dailyChangeRate: number; // kg per day
  adherenceScore: number; // 0-100
  energyComponents?: EnergyComponents;
  dataQuality: 'low' | 'medium' | 'high';
  lastUpdated: string;
  methodology: 'initial' | 'adaptive' | 'hybrid';
}

// Export the calculateTrendWeight function directly for backwards compatibility
export const calculateTrendWeight = (weights: WeightEntry[]): number => {
  const trendPoints = calculateWeightTrend(weights);
  return trendPoints.length > 0 ? trendPoints[trendPoints.length - 1].trendWeight : 0;
};

// Calculate MacroFactor-style adaptive TDEE using adherence-neutral approach
export const calculateAdaptiveTDEE = (
  weights: WeightEntry[],
  nutritionLogs: NutritionLog[],
  targetMacros: Macros,
  biologicalData?: BiologicalData,
  activityData?: ActivityData,
  minDataDays: number = 7
): TDEEData => {
  // Calculate initial TDEE from macros if no biological data
  const initialTDEE = targetMacros.calories;
  
  // Need minimum data for calculations
  const validLogs = nutritionLogs.filter(log => log.calories > 0);
  if (weights.length < 2 || validLogs.length < minDataDays) {
    return {
      currentTDEE: initialTDEE,
      confidence: 0,
      confidenceLevel: 'low',
      trendWeight: weights[0]?.weight || 0,
      weightTrend: 'maintaining',
      weeklyChangeRate: 0,
      dailyChangeRate: 0,
      adherenceScore: 0,
      dataQuality: 'low',
      lastUpdated: new Date().toISOString(),
      methodology: 'initial'
    };
  }
  
  // Step 1: Calculate weight trend using exponential smoothing
  const trendPoints = calculateWeightTrend(weights);
  const trendAnalysis = analyzeWeightTrend(trendPoints);
  
  // Step 2: Calculate average intake (adherence-neutral - uses actual intake, not targets)
  const recentDays = Math.min(14, validLogs.length);
  const recentLogs = validLogs
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, recentDays);
  
  const avgDailyIntake = recentLogs.reduce((sum, log) => sum + log.calories, 0) / recentLogs.length;
  
  // Step 3: Calculate weight change over period
  const oldestLog = recentLogs[recentLogs.length - 1];
  const newestLog = recentLogs[0];
  const daysElapsed = Math.max(1, 
    (new Date(newestLog.date).getTime() - new Date(oldestLog.date).getTime()) / (1000 * 60 * 60 * 24)
  );
  
  // Get weight change from trend analysis
  const weightChangeKg = trendAnalysis.dailyChangeRate * daysElapsed;
  
  // Step 4: Calculate adherence-neutral TDEE using energy balance
  const adaptiveTDEE = calculateTDEEFromTrend(avgDailyIntake, weightChangeKg, daysElapsed);
  
  // Step 5: Calculate confidence based on multiple factors
  const weightEntries = weights.filter(w => {
    const date = new Date(w.date);
    return date >= new Date(oldestLog.date) && date <= new Date(newestLog.date);
  }).length;
  
  const tdeeConfidence = getTDEEConfidence(
    recentLogs.length,
    daysElapsed,
    weightEntries,
    trendAnalysis.volatility
  );
  
  // Step 6: Calculate adherence metrics
  const adherenceMetrics = calculateAdherenceMetrics(recentLogs, targetMacros, daysElapsed);
  
  // Step 7: Calculate energy components if biological data available
  let energyComponents: EnergyComponents | undefined;
  if (biologicalData && activityData) {
    energyComponents = calculateEnergyComponents(
      biologicalData,
      activityData,
      avgDailyIntake,
      adaptiveTDEE
    );
  }
  
  // Step 8: Determine methodology used
  let methodology: 'initial' | 'adaptive' | 'hybrid' = 'adaptive';
  if (tdeeConfidence.level === 'low') {
    methodology = 'initial';
  } else if (energyComponents) {
    methodology = 'hybrid';
  }
  
  // Step 9: Apply smoothing to prevent dramatic swings
  const maxChange = initialTDEE * 0.15; // Max 15% change
  const tdeeChange = adaptiveTDEE - initialTDEE;
  const smoothedTDEE = initialTDEE + Math.max(-maxChange, Math.min(maxChange, tdeeChange));
  
  return {
    currentTDEE: Math.round(smoothedTDEE),
    confidence: Math.round(tdeeConfidence.score * 100),
    confidenceLevel: tdeeConfidence.level,
    trendWeight: trendAnalysis.currentTrendWeight,
    weightTrend: trendAnalysis.trendDirection,
    weeklyChangeRate: trendAnalysis.weeklyChangeRate,
    dailyChangeRate: trendAnalysis.dailyChangeRate,
    adherenceScore: adherenceMetrics.overallScore,
    energyComponents,
    dataQuality: trendAnalysis.dataQuality,
    lastUpdated: new Date().toISOString(),
    methodology
  };
};

// Import goal adjustment utilities
import { 
  getGoalConstraints, 
  generateCalorieAdjustment,
  PerformanceMetrics 
} from './goalAdjustments';

// Get TDEE adjustment recommendations using MacroFactor-style logic
export const getTDEERecommendations = (
  tdeeData: TDEEData,
  goal: GoalType,
  targetRate: number, // % body weight per week
  sex: 'male' | 'female',
  energyLevel: number = 3,
  hungerLevel: number = 3,
  trainingPerformance: number = 3,
  loggingConsistency: number = 0
) => {
  const constraints = getGoalConstraints(goal, sex);
  
  // Build performance metrics
  const performance: PerformanceMetrics = {
    actualWeeklyRate: tdeeData.weeklyChangeRate,
    targetWeeklyRate: targetRate,
    adherenceScore: tdeeData.adherenceScore,
    energyLevel,
    hungerLevel,
    trainingPerformance,
    avgCaloriesConsumed: tdeeData.currentTDEE, // Approximation
    loggingConsistency: loggingConsistency || tdeeData.confidence
  };
  
  // Generate primary calorie adjustment
  const adjustment = generateCalorieAdjustment(
    tdeeData.currentTDEE,
    tdeeData.currentTDEE, // Current calories = TDEE for now
    performance,
    goal,
    constraints
  );
  
  // Convert to recommendation format
  const recommendations = [];
  
  // Add main adjustment recommendation
  if (adjustment.type !== 'maintain') {
    recommendations.push({
      type: adjustment.type === 'increase' ? 'increase_calories' : 'decrease_calories',
      message: adjustment.reasoning.join(' '),
      severity: adjustment.priority,
      adjustment: adjustment.calories - tdeeData.currentTDEE,
      newCalories: adjustment.calories,
      newMacros: adjustment.macros,
      confidence: adjustment.confidence
    });
  }
  
  // Add data quality warnings
  if (tdeeData.dataQuality === 'low') {
    recommendations.push({
      type: 'improve_data_quality',
      message: 'Weigh yourself more frequently and log meals consistently for better recommendations.',
      severity: 'info' as const,
      adjustment: 0
    });
  }
  
  // Add energy component insights if available
  if (tdeeData.energyComponents && tdeeData.energyComponents.confidence > 0.7) {
    const neatPercentage = (tdeeData.energyComponents.neat / tdeeData.energyComponents.total) * 100;
    if (neatPercentage < 15 && goal === 'cut') {
      recommendations.push({
        type: 'metabolic_adaptation',
        message: 'Your daily activity (NEAT) appears suppressed. Consider a diet break or increasing daily movement.',
        severity: 'warning' as const,
        adjustment: 0
      });
    }
  }
  
  return recommendations;
};