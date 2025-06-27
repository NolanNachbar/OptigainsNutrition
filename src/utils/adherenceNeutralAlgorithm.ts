// MacroFactor-style adherence-neutral TDEE algorithm
import { ExpenditureData, WeightEntry, NutritionLog } from './types';

export class AdherenceNeutralAlgorithm {
  private static readonly ALGORITHM_VERSION = 'v3.0';
  private static readonly MIN_DATA_POINTS = 7;
  
  /**
   * Calculate TDEE using adherence-neutral approach
   * This adjusts based on actual weight changes and calorie intake,
   * regardless of target adherence
   */
  static calculateTDEE(
    weightEntries: WeightEntry[],
    nutritionLogs: NutritionLog[],
    currentTDEE: number = 2000
  ): ExpenditureData | null {
    
    if (weightEntries.length < this.MIN_DATA_POINTS || nutritionLogs.length < this.MIN_DATA_POINTS) {
      return null;
    }

    // Sort by date
    const sortedWeights = [...weightEntries].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    const sortedLogs = [...nutritionLogs].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const latestDate = sortedWeights[sortedWeights.length - 1].date;
    const latestWeight = sortedWeights[sortedWeights.length - 1].weight;

    // Calculate weight changes
    const weightChange7d = this.calculateWeightChange(sortedWeights, 7);
    const weightChange14d = this.calculateWeightChange(sortedWeights, 14);

    // Calculate calorie averages
    const calorieAvg7d = this.calculateCalorieAverage(sortedLogs, 7);
    const calorieAvg14d = this.calculateCalorieAverage(sortedLogs, 14);

    // Adaptive TDEE calculation using exponentially weighted moving average
    const estimatedTDEE = this.calculateAdaptiveTDEE(
      weightChange14d,
      calorieAvg14d,
      currentTDEE
    );

    // Calculate confidence based on data consistency
    const confidence = this.calculateConfidence(
      sortedWeights,
      sortedLogs,
      weightChange7d,
      weightChange14d
    );

    // Determine trend
    const trend = this.determineTrend(weightChange7d, weightChange14d);

    return {
      clerk_user_id: sortedLogs[0].clerk_user_id,
      date: latestDate,
      estimated_tdee: Math.round(estimatedTDEE),
      confidence: Math.round(confidence),
      weight_kg: latestWeight,
      calories_consumed: Math.round(calorieAvg7d),
      weight_change_7d: weightChange7d,
      weight_change_14d: weightChange14d,
      calorie_average_7d: Math.round(calorieAvg7d),
      calorie_average_14d: Math.round(calorieAvg14d),
      trend,
      algorithm_version: this.ALGORITHM_VERSION
    };
  }

  /**
   * Calculate weight change over specified days
   */
  private static calculateWeightChange(weights: WeightEntry[], days: number): number {
    if (weights.length < 2) return 0;

    const endDate = new Date(weights[weights.length - 1].date);
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - days);

    const recentWeights = weights.filter(w => 
      new Date(w.date) >= startDate && new Date(w.date) <= endDate
    );

    if (recentWeights.length < 2) return 0;

    const startWeight = recentWeights[0].weight;
    const endWeight = recentWeights[recentWeights.length - 1].weight;

    return endWeight - startWeight;
  }

  /**
   * Calculate average calories over specified days
   */
  private static calculateCalorieAverage(logs: NutritionLog[], days: number): number {
    if (logs.length === 0) return 0;

    const endDate = new Date(logs[logs.length - 1].date);
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - days);

    const recentLogs = logs.filter(log => 
      new Date(log.date) >= startDate && new Date(log.date) <= endDate
    );

    if (recentLogs.length === 0) return 0;

    const totalCalories = recentLogs.reduce((sum, log) => sum + log.calories, 0);
    return totalCalories / recentLogs.length;
  }

  /**
   * Calculate adaptive TDEE using energy balance equation
   * TDEE = Calories_in - (Weight_change * 7700) / days
   * Where 7700 is kcal per kg of body weight
   */
  private static calculateAdaptiveTDEE(
    weightChange: number,
    avgCalories: number,
    currentTDEE: number
  ): number {
    const daysInPeriod = 14;
    const caloriesPerKg = 7700; // Approximate calories per kg of body weight

    // Energy balance calculation
    const energyFromWeightChange = (weightChange * caloriesPerKg) / daysInPeriod;
    const rawTDEE = avgCalories - energyFromWeightChange;

    // Apply exponentially weighted moving average to smooth changes
    const alpha = 0.3; // Smoothing factor
    const adaptiveTDEE = alpha * rawTDEE + (1 - alpha) * currentTDEE;

    // Bounds checking - prevent extreme values
    const minTDEE = Math.max(1200, currentTDEE * 0.7);
    const maxTDEE = Math.min(4000, currentTDEE * 1.3);

    return Math.max(minTDEE, Math.min(maxTDEE, adaptiveTDEE));
  }

  /**
   * Calculate confidence score based on data quality and consistency
   */
  private static calculateConfidence(
    weights: WeightEntry[],
    logs: NutritionLog[],
    weightChange7d: number,
    weightChange14d: number
  ): number {
    let confidence = 100;

    // Reduce confidence for insufficient data
    if (weights.length < 14) confidence -= 20;
    if (logs.length < 14) confidence -= 20;

    // Reduce confidence for inconsistent weight trends
    const trendConsistency = Math.abs(weightChange7d - weightChange14d / 2);
    if (trendConsistency > 0.5) confidence -= 15;

    // Reduce confidence for extreme weight changes (likely water weight)
    if (Math.abs(weightChange7d) > 1.0) confidence -= 10;
    if (Math.abs(weightChange14d) > 2.0) confidence -= 10;

    // Reduce confidence for missing data days
    const expectedDays = 14;
    const actualDays = logs.length;
    const completeness = actualDays / expectedDays;
    confidence *= completeness;

    return Math.max(0, Math.min(100, confidence));
  }

  /**
   * Determine weight trend
   */
  private static determineTrend(
    weightChange7d: number,
    weightChange14d: number
  ): 'gaining' | 'losing' | 'maintaining' {
    const avgChange = (weightChange7d + weightChange14d / 2) / 2;
    
    if (avgChange > 0.2) return 'gaining';
    if (avgChange < -0.2) return 'losing';
    return 'maintaining';
  }

  /**
   * Generate macro recommendations based on TDEE and goals
   */
  static generateMacroRecommendations(
    tdee: number,
    goalType: 'fat_loss' | 'muscle_gain' | 'maintenance',
    bodyWeight: number
  ) {
    let calorieTarget = tdee;
    
    // Adjust calories based on goal
    switch (goalType) {
      case 'fat_loss':
        calorieTarget = tdee * 0.85; // 15% deficit
        break;
      case 'muscle_gain':
        calorieTarget = tdee * 1.1; // 10% surplus
        break;
      case 'maintenance':
        calorieTarget = tdee;
        break;
    }

    // Protein: 2.2g per kg body weight (minimum for muscle preservation)
    const protein = Math.max(bodyWeight * 2.2, calorieTarget * 0.25 / 4);

    // Fat: 25-30% of calories
    const fat = calorieTarget * 0.28 / 9;

    // Carbs: remaining calories
    const carbs = (calorieTarget - (protein * 4) - (fat * 9)) / 4;

    return {
      calories: Math.round(calorieTarget),
      protein: Math.round(protein),
      carbs: Math.round(Math.max(0, carbs)),
      fat: Math.round(fat),
      fiber: Math.round(Math.min(35, calorieTarget / 100)) // 1g per 100 calories, max 35g
    };
  }
}