// TDEE Calculator with Coaching Logic
// Comprehensive Total Daily Energy Expenditure calculations and recommendations

export interface UserProfile {
  age: number;
  weight: number; // kg
  height: number; // cm
  sex: 'male' | 'female';
  activityLevel: ActivityLevel;
  goal: GoalType;
}

export interface WeightDataPoint {
  date: Date;
  weight: number; // kg
}

export interface IntakeDataPoint {
  date: Date;
  calories: number;
  protein: number; // grams
  carbs: number; // grams
  fat: number; // grams
}

export interface TDEEData {
  bmr: number;
  tdee: number;
  estimatedTDEE: number; // Based on actual intake and weight change
  confidence: number; // 0-1 confidence in the estimate
  weightTrend: number; // kg/week
  adherenceScore: number; // 0-100
}

export interface CoachingRecommendation {
  targetCalories: number;
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
  message: string;
  adjustmentReason: string;
  priority: 'high' | 'medium' | 'low';
  suggestions: string[];
}

export enum ActivityLevel {
  SEDENTARY = 1.2,
  LIGHTLY_ACTIVE = 1.375,
  MODERATELY_ACTIVE = 1.55,
  VERY_ACTIVE = 1.725,
  EXTRA_ACTIVE = 1.9
}

export enum GoalType {
  CUT = 'cut',
  MAINTAIN = 'maintain',
  GAIN = 'gain'
}

// Constants
const CALORIES_PER_KG = 7700; // Approximate calories in 1kg of body weight
const PROTEIN_PER_KG = 2.2; // Recommended protein per kg bodyweight
const FAT_PERCENTAGE_MIN = 0.20; // Minimum fat as percentage of calories
const FAT_PERCENTAGE_MAX = 0.35; // Maximum fat as percentage of calories

/**
 * Calculate Basal Metabolic Rate using Mifflin-St Jeor equation
 */
export function calculateBMR(profile: UserProfile): number {
  const { weight, height, age, sex } = profile;
  
  if (weight <= 0 || height <= 0 || age <= 0) {
    throw new Error('Invalid profile data: weight, height, and age must be positive');
  }
  
  let bmr: number;
  
  if (sex === 'male') {
    bmr = 10 * weight + 6.25 * height - 5 * age + 5;
  } else {
    bmr = 10 * weight + 6.25 * height - 5 * age - 161;
  }
  
  return Math.round(bmr);
}

/**
 * Calculate TDEE from BMR and activity level
 */
export function calculateTDEE(bmr: number, activityLevel: ActivityLevel): number {
  return Math.round(bmr * activityLevel);
}

/**
 * Calculate exponential moving average for weight trend
 */
export function calculateWeightTrend(
  weightData: WeightDataPoint[],
  smoothingFactor: number = 0.1
): { trend: number[]; currentTrend: number; weeklyChange: number } {
  if (weightData.length < 2) {
    throw new Error('Insufficient weight data for trend analysis');
  }
  
  // Sort by date
  const sorted = [...weightData].sort((a, b) => a.date.getTime() - b.date.getTime());
  
  // Calculate EMA
  const trend: number[] = [sorted[0].weight];
  
  for (let i = 1; i < sorted.length; i++) {
    const ema = sorted[i].weight * smoothingFactor + trend[i - 1] * (1 - smoothingFactor);
    trend.push(ema);
  }
  
  // Calculate weekly change using last 14 days of data
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  
  const recentData = sorted.filter(d => d.date >= twoWeeksAgo);
  const recentTrend = trend.slice(-recentData.length);
  
  if (recentTrend.length >= 2) {
    const daysDiff = (sorted[sorted.length - 1].date.getTime() - recentData[0].date.getTime()) / (1000 * 60 * 60 * 24);
    const weightDiff = recentTrend[recentTrend.length - 1] - recentTrend[0];
    const weeklyChange = (weightDiff / daysDiff) * 7;
    
    return {
      trend,
      currentTrend: trend[trend.length - 1],
      weeklyChange: Math.round(weeklyChange * 100) / 100
    };
  }
  
  return {
    trend,
    currentTrend: trend[trend.length - 1],
    weeklyChange: 0
  };
}

/**
 * Estimate TDEE based on actual intake and weight change
 */
export function estimateTDEEFromData(
  intakeData: IntakeDataPoint[],
  weightTrend: { weeklyChange: number },
  confidenceThreshold: number = 7 // minimum days of data
): { estimatedTDEE: number; confidence: number } {
  if (intakeData.length < confidenceThreshold) {
    return {
      estimatedTDEE: 0,
      confidence: 0
    };
  }
  
  // Calculate average daily intake
  const totalCalories = intakeData.reduce((sum, day) => sum + day.calories, 0);
  const avgDailyIntake = totalCalories / intakeData.length;
  
  // Convert weekly weight change to daily caloric surplus/deficit
  const dailyCalorieBalance = (weightTrend.weeklyChange * CALORIES_PER_KG) / 7;
  
  // Estimated TDEE = Average intake - calorie balance
  const estimatedTDEE = Math.round(avgDailyIntake - dailyCalorieBalance);
  
  // Calculate confidence based on data consistency and quantity
  const dataPoints = Math.min(intakeData.length / 30, 1); // Max confidence at 30 days
  const intakeVariance = calculateVarianceCoefficient(intakeData.map(d => d.calories));
  const consistencyScore = Math.max(0, 1 - intakeVariance);
  
  const confidence = Math.min(dataPoints * consistencyScore, 1);
  
  return {
    estimatedTDEE,
    confidence: Math.round(confidence * 100) / 100
  };
}

/**
 * Calculate coefficient of variance for consistency measurement
 */
function calculateVarianceCoefficient(values: number[]): number {
  if (values.length === 0) return 0;
  
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  if (mean === 0) return 0;
  
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);
  
  return stdDev / mean;
}

/**
 * Calculate adherence score based on target vs actual intake
 */
export function calculateAdherenceScore(
  intakeData: IntakeDataPoint[],
  targetCalories: number,
  allowedDeviation: number = 0.1 // 10% deviation allowed
): number {
  if (intakeData.length === 0) return 0;
  
  let adherentDays = 0;
  const deviationThreshold = targetCalories * allowedDeviation;
  
  for (const day of intakeData) {
    const deviation = Math.abs(day.calories - targetCalories);
    if (deviation <= deviationThreshold) {
      adherentDays++;
    }
  }
  
  return Math.round((adherentDays / intakeData.length) * 100);
}

/**
 * Generate target macros and calories based on goal
 */
export function calculateTargets(
  profile: UserProfile,
  tdee: number,
  goal: GoalType
): { calories: number; protein: number; fat: number; carbs: number } {
  let targetCalories: number;
  
  switch (goal) {
    case GoalType.CUT:
      // 20% deficit for cutting
      targetCalories = Math.round(tdee * 0.8);
      break;
    case GoalType.GAIN:
      // 10% surplus for gaining
      targetCalories = Math.round(tdee * 1.1);
      break;
    case GoalType.MAINTAIN:
    default:
      targetCalories = tdee;
  }
  
  // Calculate macros
  const proteinGrams = Math.round(profile.weight * PROTEIN_PER_KG);
  const proteinCalories = proteinGrams * 4;
  
  // Fat: 25-30% of calories
  const fatPercentage = goal === GoalType.CUT ? FAT_PERCENTAGE_MIN : FAT_PERCENTAGE_MAX;
  const fatCalories = targetCalories * fatPercentage;
  const fatGrams = Math.round(fatCalories / 9);
  
  // Carbs: remaining calories
  const carbCalories = targetCalories - proteinCalories - fatCalories;
  const carbGrams = Math.round(carbCalories / 4);
  
  return {
    calories: targetCalories,
    protein: proteinGrams,
    fat: fatGrams,
    carbs: carbGrams
  };
}

/**
 * Generate coaching recommendations based on progress
 */
export function generateCoachingRecommendation(
  profile: UserProfile,
  tdeeData: TDEEData,
  _intakeData: IntakeDataPoint[],
  _weightData: WeightDataPoint[]
): CoachingRecommendation {
  const targets = calculateTargets(profile, tdeeData.estimatedTDEE || tdeeData.tdee, profile.goal);
  
  // Analyze progress
  const weeklyChange = tdeeData.weightTrend;
  
  let message: string;
  let adjustmentReason: string;
  let priority: 'high' | 'medium' | 'low';
  const suggestions: string[] = [];
  
  // Generate recommendations based on goal and progress
  if (profile.goal === GoalType.CUT) {
    if (weeklyChange > -0.25) {
      // Not losing weight fast enough
      message = 'Your weight loss has stalled. Consider increasing your deficit.';
      adjustmentReason = 'Insufficient caloric deficit for consistent weight loss';
      priority = 'high';
      suggestions.push('Reduce daily calories by 100-200');
      suggestions.push('Increase cardio by 20-30 minutes per week');
      suggestions.push('Ensure accurate food tracking');
    } else if (weeklyChange < -1) {
      // Losing too fast
      message = 'You\'re losing weight too quickly. This may lead to muscle loss.';
      adjustmentReason = 'Excessive caloric deficit';
      priority = 'high';
      suggestions.push('Increase daily calories by 100-200');
      suggestions.push('Focus on resistance training');
      suggestions.push('Ensure adequate protein intake');
    } else {
      message = 'Great progress! You\'re losing weight at a healthy rate.';
      adjustmentReason = 'On track with goals';
      priority = 'low';
      suggestions.push('Maintain current approach');
      suggestions.push('Monitor energy levels');
    }
  } else if (profile.goal === GoalType.GAIN) {
    if (weeklyChange < 0.1) {
      // Not gaining enough
      message = 'Weight gain is slower than expected. Consider increasing calories.';
      adjustmentReason = 'Insufficient caloric surplus';
      priority = 'medium';
      suggestions.push('Increase daily calories by 100-200');
      suggestions.push('Add a pre/post workout snack');
      suggestions.push('Consider liquid calories if appetite is low');
    } else if (weeklyChange > 0.5) {
      // Gaining too fast
      message = 'You\'re gaining weight quickly. Monitor body composition.';
      adjustmentReason = 'Excessive caloric surplus';
      priority = 'medium';
      suggestions.push('Reduce daily calories by 100-150');
      suggestions.push('Increase training volume');
      suggestions.push('Monitor body fat percentage');
    } else {
      message = 'Excellent! You\'re gaining at an optimal rate.';
      adjustmentReason = 'On track with goals';
      priority = 'low';
      suggestions.push('Continue current nutrition plan');
      suggestions.push('Progressive overload in training');
    }
  } else {
    // Maintenance
    if (Math.abs(weeklyChange) > 0.25) {
      message = 'Your weight is fluctuating. Let\'s stabilize your intake.';
      adjustmentReason = 'Weight not stable';
      priority = 'medium';
      suggestions.push('Track intake more consistently');
      suggestions.push('Maintain regular meal timing');
      suggestions.push(`Adjust calories to ${targets.calories}`);
    } else {
      message = 'Perfect! You\'re maintaining your weight successfully.';
      adjustmentReason = 'Successfully maintaining';
      priority = 'low';
      suggestions.push('Continue current habits');
      suggestions.push('Focus on performance goals');
    }
  }
  
  // Add adherence-based suggestions
  if (tdeeData.adherenceScore < 70) {
    suggestions.push('Improve consistency - aim for 80%+ adherence');
    suggestions.push('Plan meals in advance');
    suggestions.push('Set daily reminders for tracking');
  }
  
  // Use data parameters to provide more specific recommendations if needed
  if (_intakeData.length < 7) {
    suggestions.push('Track food intake more consistently for better recommendations');
  }
  
  if (_weightData.length < 2) {
    suggestions.push('Weigh yourself regularly for accurate progress tracking');
  }
  
  return {
    targetCalories: targets.calories,
    targetProtein: targets.protein,
    targetCarbs: targets.carbs,
    targetFat: targets.fat,
    message,
    adjustmentReason,
    priority,
    suggestions
  };
}


/**
 * Main TDEE calculation function combining all components
 */
export function calculateCompleteTDEE(
  profile: UserProfile,
  weightData: WeightDataPoint[],
  intakeData: IntakeDataPoint[],
  targetCalories?: number
): TDEEData {
  try {
    // Calculate base values
    const bmr = calculateBMR(profile);
    const tdee = calculateTDEE(bmr, profile.activityLevel);
    
    // Calculate weight trend
    const weightTrendData = weightData.length >= 2 
      ? calculateWeightTrend(weightData)
      : { trend: [], currentTrend: profile.weight, weeklyChange: 0 };
    
    // Estimate TDEE from actual data
    const { estimatedTDEE, confidence } = intakeData.length >= 7
      ? estimateTDEEFromData(intakeData, weightTrendData)
      : { estimatedTDEE: tdee, confidence: 0 };
    
    // Calculate adherence
    const adherenceScore = targetCalories
      ? calculateAdherenceScore(intakeData, targetCalories)
      : 0;
    
    return {
      bmr,
      tdee,
      estimatedTDEE,
      confidence,
      weightTrend: weightTrendData.weeklyChange,
      adherenceScore
    };
  } catch (error) {
    throw new Error(`TDEE calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Calculate macro targets based on user profile and TDEE
export function calculateMacroTargets(
  profile: UserNutritionProfile,
  tdee: number,
  currentWeight: number
): Macros {
  const userProfile: UserProfile = {
    age: 30, // Default age if not available
    weight: currentWeight,
    height: 175, // Default height if not available
    sex: 'male' as const, // Default if not available
    activityLevel: ActivityLevel.MODERATELY_ACTIVE,
    goal: profile.goal_type === 'maintenance' ? GoalType.MAINTAIN :
          profile.goal_type === 'cut' ? GoalType.CUT : GoalType.GAIN
  };
  
  const targets = calculateTargets(userProfile, tdee, userProfile.goal);
  
  return {
    calories: targets.calories,
    protein: targets.protein,
    carbs: targets.carbs,
    fat: targets.fat,
    fiber: Math.round((targets.calories / 1000) * 14) // 14g per 1000 calories
  };
}

// Adjust macros based on weekly check-in data
export function adjustMacrosFromCheckIn(
  currentMacros: Macros,
  weeklyWeightChange: number,
  goalType: GoalType | string,
  energyLevel: number,
  hungerLevel: number,
  trainingPerformance: number
): Macros {
  let calorieAdjustment = 0;
  
  // Convert string goal type to enum if needed
  const goal = goalType === 'maintenance' ? GoalType.MAINTAIN :
               goalType === 'cut' ? GoalType.CUT : 
               goalType === 'gain' ? GoalType.GAIN : GoalType.MAINTAIN;
  
  // Adjust based on weight change and goal
  if (goal === GoalType.CUT) {
    if (weeklyWeightChange > -0.25) {
      // Not losing fast enough
      calorieAdjustment = -100;
    } else if (weeklyWeightChange < -1) {
      // Losing too fast
      calorieAdjustment = 150;
    }
  } else if (goal === GoalType.GAIN) {
    if (weeklyWeightChange < 0.1) {
      // Not gaining enough
      calorieAdjustment = 150;
    } else if (weeklyWeightChange > 0.5) {
      // Gaining too fast
      calorieAdjustment = -100;
    }
  } else {
    // Maintenance
    if (Math.abs(weeklyWeightChange) > 0.25) {
      calorieAdjustment = weeklyWeightChange > 0 ? -100 : 100;
    }
  }
  
  // Adjust based on subjective feedback
  if (energyLevel <= 2 || trainingPerformance <= 2) {
    // Low energy or poor performance
    calorieAdjustment = Math.max(calorieAdjustment, 100);
  }
  
  if (hungerLevel >= 4 && goal === GoalType.CUT) {
    // Very hungry during cut
    calorieAdjustment = Math.max(calorieAdjustment, 50);
  }
  
  // Apply adjustment
  const newCalories = currentMacros.calories + calorieAdjustment;
  
  // Recalculate macros with new calories
  const carbAdjustment = calorieAdjustment / 4; // Adjust carbs primarily
  
  return {
    calories: newCalories,
    protein: currentMacros.protein, // Keep protein stable
    carbs: Math.max(currentMacros.carbs + carbAdjustment, 50), // Min 50g carbs
    fat: currentMacros.fat, // Keep fat stable
    fiber: currentMacros.fiber || Math.round((newCalories / 1000) * 14)
  };
}

// Calculate adaptive TDEE from weight and intake data
export function calculateAdaptiveTDEE(
  weightEntries: { date: string; weight: number }[],
  nutritionLogs: { date: string; calories: number; protein: number; carbs: number; fat: number }[]
): { tdee: number; confidence: number } {
  if (weightEntries.length < 2 || nutritionLogs.length < 7) {
    return { tdee: 0, confidence: 0 };
  }
  
  // Convert to required format
  const weightData: WeightDataPoint[] = weightEntries.map(w => ({
    date: new Date(w.date),
    weight: w.weight
  }));
  
  const intakeData: IntakeDataPoint[] = nutritionLogs.map(n => ({
    date: new Date(n.date),
    calories: n.calories,
    protein: n.protein,
    carbs: n.carbs,
    fat: n.fat
  }));
  
  // Calculate weight trend
  const weightTrend = calculateWeightTrend(weightData);
  
  // Estimate TDEE
  const { estimatedTDEE, confidence } = estimateTDEEFromData(intakeData, weightTrend);
  
  return {
    tdee: estimatedTDEE,
    confidence: Math.round(confidence * 100)
  };
}

// Import UserNutritionProfile type
import { UserNutritionProfile, Macros } from './types';

// Export all functions and types for external use
export default {
  calculateBMR,
  calculateTDEE,
  calculateWeightTrend,
  estimateTDEEFromData,
  calculateAdherenceScore,
  calculateTargets,
  generateCoachingRecommendation,
  calculateCompleteTDEE,
  calculateMacroTargets,
  adjustMacrosFromCheckIn,
  calculateAdaptiveTDEE
};