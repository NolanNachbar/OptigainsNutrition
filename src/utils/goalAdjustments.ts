// Goal-based constraints and auto-adjustment logic
// Implements evidence-based rate limits and macro adjustments

import { GoalType, Macros } from './types';

export interface GoalConstraints {
  minWeeklyRate: number;  // % body weight per week
  maxWeeklyRate: number;  // % body weight per week
  recommendedRate: number;
  minCalories: number;    // Absolute minimum for safety
  proteinMultiplier: number; // g per kg body weight
  description: string;
}

export interface AdjustmentRecommendation {
  type: 'increase' | 'decrease' | 'maintain';
  calories: number;
  macros: Macros;
  reasoning: string[];
  confidence: 'low' | 'medium' | 'high';
  priority: 'urgent' | 'moderate' | 'optional';
}

export interface PerformanceMetrics {
  actualWeeklyRate: number;      // % body weight change per week
  targetWeeklyRate: number;       // Goal rate
  adherenceScore: number;         // 0-100%
  energyLevel: number;            // 1-5 subjective
  hungerLevel: number;            // 1-5 subjective
  trainingPerformance: number;    // 1-5 subjective
  avgCaloriesConsumed: number;
  loggingConsistency: number;     // 0-100%
}

/**
 * Get evidence-based constraints for each goal type
 */
export function getGoalConstraints(
  goal: GoalType,
  sex: 'male' | 'female',
  trainingExperience: 'beginner' | 'intermediate' | 'advanced' = 'intermediate'
): GoalConstraints {
  const constraints: Record<GoalType, GoalConstraints> = {
    cut: {
      minWeeklyRate: 0.25,
      maxWeeklyRate: sex === 'female' ? 0.75 : 1.0,
      recommendedRate: 0.5,
      minCalories: sex === 'female' ? 1200 : 1500,
      proteinMultiplier: 2.3, // Higher protein during cuts
      description: 'Sustainable fat loss while preserving muscle'
    },
    gain: {
      minWeeklyRate: 0.1,
      maxWeeklyRate: trainingExperience === 'beginner' ? 0.5 : 0.25,
      recommendedRate: trainingExperience === 'beginner' ? 0.3 : 0.15,
      minCalories: 0, // No minimum for gaining
      proteinMultiplier: 1.8,
      description: 'Lean muscle gain with minimal fat'
    },
    maintenance: {
      minWeeklyRate: -0.1,
      maxWeeklyRate: 0.1,
      recommendedRate: 0,
      minCalories: 0,
      proteinMultiplier: 1.6,
      description: 'Weight stability with potential recomposition'
    },
    recomp: {
      minWeeklyRate: -0.15,
      maxWeeklyRate: 0.05,
      recommendedRate: -0.05, // Slight deficit
      minCalories: sex === 'female' ? 1400 : 1700,
      proteinMultiplier: 2.2,
      description: 'Simultaneous fat loss and muscle gain'
    }
  };

  return constraints[goal];
}

/**
 * Calculate macro adjustments based on goal and performance
 */
export function calculateMacroAdjustments(
  currentMacros: Macros,
  weightKg: number,
  goal: GoalType,
  performance: PerformanceMetrics,
  constraints: GoalConstraints
): Macros {
  // Start with protein - critical for all goals
  let protein = Math.round(weightKg * constraints.proteinMultiplier);
  
  // Adjust protein based on adherence and hunger
  if (performance.hungerLevel > 4) {
    protein = Math.round(protein * 1.1); // Increase protein if very hungry
  }
  
  // Calculate fat (minimum for hormonal health)
  const minFatGrams = weightKg * 0.7; // 0.7g per kg minimum
  let fat = Math.max(minFatGrams, currentMacros.fat);
  
  // Adjust fat based on goal and performance
  if (goal === 'cut' && performance.energyLevel < 3) {
    fat = Math.round(fat * 0.9); // Reduce fat slightly if low energy on cut
  } else if (goal === 'gain' && performance.actualWeeklyRate < constraints.minWeeklyRate) {
    fat = Math.round(fat * 1.1); // Increase fat for easier surplus
  }
  
  // Calculate carbs to fill remaining calories
  const proteinCalories = protein * 4;
  const fatCalories = fat * 9;
  const carbCalories = currentMacros.calories - proteinCalories - fatCalories;
  const carbs = Math.max(50, Math.round(carbCalories / 4)); // Minimum 50g carbs
  
  // Calculate fiber (14g per 1000 calories)
  const fiber = Math.round((currentMacros.calories / 1000) * 14);
  
  return {
    calories: currentMacros.calories,
    protein,
    carbs,
    fat,
    fiber
  };
}

/**
 * Generate calorie adjustment recommendation
 */
export function generateCalorieAdjustment(
  currentTDEE: number,
  currentCalories: number,
  performance: PerformanceMetrics,
  goal: GoalType,
  constraints: GoalConstraints
): AdjustmentRecommendation {
  const reasoning: string[] = [];
  let recommendedCalories = currentCalories;
  let adjustmentType: 'increase' | 'decrease' | 'maintain' = 'maintain';
  let confidence: 'low' | 'medium' | 'high' = 'medium';
  let priority: 'urgent' | 'moderate' | 'optional' = 'moderate';


  // Goal-specific logic
  switch (goal) {
    case 'cut':
      if (performance.actualWeeklyRate < constraints.minWeeklyRate * 0.5) {
        // Losing too slowly
        adjustmentType = 'decrease';
        const deficit = Math.min(200, currentCalories * 0.1); // Max 10% reduction
        recommendedCalories = Math.max(constraints.minCalories, currentCalories - deficit);
        reasoning.push(`Weight loss is slower than target (${performance.actualWeeklyRate.toFixed(2)}% vs ${performance.targetWeeklyRate}% per week).`);
        
        if (performance.adherenceScore < 80) {
          reasoning.push('However, focus on improving adherence before reducing calories further.');
          priority = 'optional';
        }
      } else if (performance.actualWeeklyRate > constraints.maxWeeklyRate) {
        // Losing too fast
        adjustmentType = 'increase';
        recommendedCalories = currentCalories + 150;
        reasoning.push('Weight loss is too rapid - increasing calories to preserve muscle mass.');
        priority = 'urgent';
      }
      
      // Check subjective metrics
      if (performance.energyLevel < 2 || performance.hungerLevel > 4) {
        if (adjustmentType !== 'increase') {
          recommendedCalories = Math.min(currentCalories + 100, currentTDEE - 300);
          reasoning.push('Low energy or high hunger detected - small calorie increase recommended.');
        }
      }
      break;

    case 'gain':
      if (performance.actualWeeklyRate < constraints.minWeeklyRate) {
        // Not gaining enough
        adjustmentType = 'increase';
        const surplus = Math.min(200, currentCalories * 0.1);
        recommendedCalories = currentCalories + surplus;
        reasoning.push(`Weight gain is below target (${performance.actualWeeklyRate.toFixed(2)}% vs ${performance.targetWeeklyRate}% per week).`);
      } else if (performance.actualWeeklyRate > constraints.maxWeeklyRate * 1.5) {
        // Gaining too fast
        adjustmentType = 'decrease';
        recommendedCalories = currentCalories - 100;
        reasoning.push('Weight gain is too rapid - reducing calories to minimize fat gain.');
        priority = 'urgent';
      }
      break;

    case 'maintenance':
      if (Math.abs(performance.actualWeeklyRate) > 0.2) {
        if (performance.actualWeeklyRate > 0) {
          adjustmentType = 'decrease';
          recommendedCalories = currentCalories - 100;
          reasoning.push('Slight weight gain detected - reducing calories to maintain.');
        } else {
          adjustmentType = 'increase';
          recommendedCalories = currentCalories + 100;
          reasoning.push('Slight weight loss detected - increasing calories to maintain.');
        }
      }
      break;

    case 'recomp':
      // Recomp is more nuanced - focus on performance metrics
      if (performance.trainingPerformance < 3 && performance.actualWeeklyRate < -0.2) {
        adjustmentType = 'increase';
        recommendedCalories = currentCalories + 75;
        reasoning.push('Training performance suffering - slight calorie increase recommended.');
      } else if (performance.actualWeeklyRate > 0.1) {
        adjustmentType = 'decrease';
        recommendedCalories = currentCalories - 75;
        reasoning.push('Weight trending up - small calorie reduction for recomposition.');
      }
      break;
  }

  // Determine confidence based on data quality
  if (performance.loggingConsistency > 85 && performance.adherenceScore > 80) {
    confidence = 'high';
  } else if (performance.loggingConsistency < 60) {
    confidence = 'low';
    reasoning.push('Low logging consistency - improve tracking before making adjustments.');
  }

  // Add context about the adjustment
  if (adjustmentType !== 'maintain') {
    const changeAmount = Math.abs(recommendedCalories - currentCalories);
    reasoning.push(`Recommended ${adjustmentType} of ${changeAmount} calories.`);
  } else {
    reasoning.push('Current calorie target is appropriate - maintain course.');
  }

  // Calculate adjusted macros
  const adjustedMacros = calculateMacroAdjustments(
    { ...performance, calories: recommendedCalories } as any,
    80, // This should be passed in - using placeholder
    goal,
    performance,
    constraints
  );

  return {
    type: adjustmentType,
    calories: recommendedCalories,
    macros: adjustedMacros,
    reasoning,
    confidence,
    priority
  };
}

/**
 * Validate if a proposed rate is safe and sustainable
 */
export function isRateSafe(
  weeklyRate: number,
  goal: GoalType,
  constraints: GoalConstraints
): { safe: boolean; warnings: string[] } {
  const warnings: string[] = [];
  
  if (weeklyRate < constraints.minWeeklyRate) {
    if (goal === 'cut') {
      warnings.push('Rate may be too slow to see meaningful progress.');
    } else if (goal === 'gain') {
      warnings.push('Rate is below minimum for muscle growth stimulus.');
    }
  }
  
  if (weeklyRate > constraints.maxWeeklyRate) {
    if (goal === 'cut') {
      warnings.push('Rate is too aggressive - high risk of muscle loss.');
      warnings.push('Consider a more moderate deficit for sustainability.');
    } else if (goal === 'gain') {
      warnings.push('Rate is too high - excessive fat gain likely.');
      warnings.push('Slow down to maximize muscle-to-fat ratio.');
    }
  }
  
  return {
    safe: weeklyRate >= constraints.minWeeklyRate * 0.8 && 
          weeklyRate <= constraints.maxWeeklyRate * 1.2,
    warnings
  };
}