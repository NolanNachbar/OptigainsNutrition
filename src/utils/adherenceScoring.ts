// Adherence and consistency scoring system
// Tracks how well users follow their targets without judgment

import { NutritionLog, Macros } from './types';

export interface AdherenceMetrics {
  calorieAdherence: number;      // 0-100%
  proteinAdherence: number;      // 0-100%
  loggingConsistency: number;    // 0-100%
  overallScore: number;          // 0-100%
  streakDays: number;
  trend: 'improving' | 'stable' | 'declining';
  insights: string[];
}

export interface DailyAdherence {
  date: string;
  calories: { actual: number; target: number; adherence: number };
  protein: { actual: number; target: number; adherence: number };
  carbs: { actual: number; target: number; adherence: number };
  fat: { actual: number; target: number; adherence: number };
  logged: boolean;
  withinRange: boolean;
}

export interface ConsistencyReport {
  period: number; // days
  daysLogged: number;
  daysInRange: number;
  averageAdherence: number;
  consistency: number; // 0-100%
  patterns: {
    bestDay: string; // e.g., "Tuesday"
    worstDay: string;
    weekendAdherence: number;
    weekdayAdherence: number;
  };
}

/**
 * Calculate adherence for a single macro/calorie target
 * Uses a tolerance range to avoid being overly strict
 */
export function calculateAdherence(
  actual: number,
  target: number,
  tolerance: number = 0.1 // 10% tolerance by default
): number {
  if (target === 0) return 100; // No target set
  
  const lowerBound = target * (1 - tolerance);
  const upperBound = target * (1 + tolerance);
  
  if (actual >= lowerBound && actual <= upperBound) {
    return 100; // Within tolerance range
  }
  
  // Calculate how far off from the tolerance range
  let deviation: number;
  if (actual < lowerBound) {
    deviation = (lowerBound - actual) / target;
  } else {
    deviation = (actual - upperBound) / target;
  }
  
  // Convert deviation to adherence score (exponential decay)
  // Small deviations have minimal impact, large deviations drop quickly
  const adherence = Math.max(0, 100 * Math.exp(-deviation * 3));
  
  return Math.round(adherence);
}

/**
 * Calculate daily adherence metrics
 */
export function calculateDailyAdherence(
  log: NutritionLog,
  targets: Macros
): DailyAdherence {
  const calorieAdherence = calculateAdherence(log.calories, targets.calories, 0.05); // 5% tolerance for calories
  const proteinAdherence = calculateAdherence(log.protein, targets.protein, 0.1);   // 10% tolerance for protein
  const carbAdherence = calculateAdherence(log.carbs, targets.carbs, 0.15);         // 15% tolerance for carbs
  const fatAdherence = calculateAdherence(log.fat, targets.fat, 0.15);              // 15% tolerance for fat
  
  // Consider "within range" if calories and protein are both > 90%
  const withinRange = calorieAdherence >= 90 && proteinAdherence >= 90;
  
  return {
    date: log.date,
    calories: {
      actual: log.calories,
      target: targets.calories,
      adherence: calorieAdherence
    },
    protein: {
      actual: log.protein,
      target: targets.protein,
      adherence: proteinAdherence
    },
    carbs: {
      actual: log.carbs,
      target: targets.carbs,
      adherence: carbAdherence
    },
    fat: {
      actual: log.fat,
      target: targets.fat,
      adherence: fatAdherence
    },
    logged: true,
    withinRange
  };
}

/**
 * Calculate adherence metrics over a period
 */
export function calculateAdherenceMetrics(
  logs: NutritionLog[],
  targets: Macros,
  totalDays: number
): AdherenceMetrics {
  if (logs.length === 0) {
    return {
      calorieAdherence: 0,
      proteinAdherence: 0,
      loggingConsistency: 0,
      overallScore: 0,
      streakDays: 0,
      trend: 'stable',
      insights: ['Start logging your meals to track adherence.']
    };
  }

  // Calculate daily adherence for all logs
  const dailyAdherence = logs.map(log => calculateDailyAdherence(log, targets));
  
  // Average adherence scores
  const avgCalorieAdherence = dailyAdherence.reduce((sum, day) => sum + day.calories.adherence, 0) / dailyAdherence.length;
  const avgProteinAdherence = dailyAdherence.reduce((sum, day) => sum + day.protein.adherence, 0) / dailyAdherence.length;
  
  // Logging consistency
  const loggingConsistency = (logs.length / totalDays) * 100;
  
  // Calculate current streak
  const streakDays = calculateStreak(dailyAdherence);
  
  // Overall score (weighted average)
  const overallScore = Math.round(
    avgCalorieAdherence * 0.4 +  // 40% weight on calories
    avgProteinAdherence * 0.3 +   // 30% weight on protein
    loggingConsistency * 0.3      // 30% weight on consistency
  );
  
  // Determine trend (compare last week to previous week)
  const trend = calculateTrend(dailyAdherence);
  
  // Generate insights
  const insights = generateAdherenceInsights({
    calorieAdherence: avgCalorieAdherence,
    proteinAdherence: avgProteinAdherence,
    loggingConsistency,
    overallScore,
    streakDays,
    trend,
    insights: []
  }, dailyAdherence);
  
  return {
    calorieAdherence: Math.round(avgCalorieAdherence),
    proteinAdherence: Math.round(avgProteinAdherence),
    loggingConsistency: Math.round(loggingConsistency),
    overallScore,
    streakDays,
    trend,
    insights
  };
}

/**
 * Calculate current adherence streak
 */
function calculateStreak(dailyAdherence: DailyAdherence[]): number {
  if (dailyAdherence.length === 0) return 0;
  
  // Sort by date (most recent first)
  const sorted = [...dailyAdherence].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  
  let streak = 0;
  for (const day of sorted) {
    if (day.withinRange) {
      streak++;
    } else {
      break;
    }
  }
  
  return streak;
}

/**
 * Calculate adherence trend
 */
function calculateTrend(dailyAdherence: DailyAdherence[]): 'improving' | 'stable' | 'declining' {
  if (dailyAdherence.length < 14) return 'stable';
  
  // Split into two weeks
  const sorted = [...dailyAdherence].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  
  const midpoint = Math.floor(sorted.length / 2);
  const firstHalf = sorted.slice(0, midpoint);
  const secondHalf = sorted.slice(midpoint);
  
  const firstHalfAvg = firstHalf.reduce((sum, day) => 
    sum + (day.calories.adherence + day.protein.adherence) / 2, 0
  ) / firstHalf.length;
  
  const secondHalfAvg = secondHalf.reduce((sum, day) => 
    sum + (day.calories.adherence + day.protein.adherence) / 2, 0
  ) / secondHalf.length;
  
  const difference = secondHalfAvg - firstHalfAvg;
  
  if (difference > 5) return 'improving';
  if (difference < -5) return 'declining';
  return 'stable';
}

/**
 * Generate actionable insights based on adherence patterns
 */
function generateAdherenceInsights(
  metrics: AdherenceMetrics,
  dailyAdherence: DailyAdherence[]
): string[] {
  const insights: string[] = [];
  
  // Logging consistency insights
  if (metrics.loggingConsistency < 60) {
    insights.push('Try to log meals more consistently - aim for at least 5 days per week.');
  } else if (metrics.loggingConsistency >= 90) {
    insights.push('Excellent logging consistency! Keep it up.');
  }
  
  // Calorie adherence insights
  if (metrics.calorieAdherence < 70) {
    const avgDeviation = dailyAdherence.reduce((sum, day) => 
      sum + Math.abs(day.calories.actual - day.calories.target), 0
    ) / dailyAdherence.length;
    
    if (avgDeviation > 0) {
      insights.push(`You're averaging ${Math.round(avgDeviation)} calories off target. Small adjustments can help.`);
    }
  }
  
  // Protein insights
  if (metrics.proteinAdherence < 80) {
    insights.push('Protein intake is inconsistent. Consider meal prep or protein-rich snacks.');
  }
  
  // Streak insights
  if (metrics.streakDays >= 7) {
    insights.push(`Great ${metrics.streakDays}-day streak! Consistency builds results.`);
  } else if (metrics.streakDays === 0 && dailyAdherence.length > 0) {
    insights.push('Get back on track today to start a new streak.');
  }
  
  // Trend insights
  if (metrics.trend === 'improving') {
    insights.push('Your adherence is improving - great progress!');
  } else if (metrics.trend === 'declining') {
    insights.push('Adherence has slipped recently. Small wins count - focus on one meal at a time.');
  }
  
  return insights;
}

/**
 * Generate a consistency report with patterns
 */
export function generateConsistencyReport(
  logs: NutritionLog[],
  targets: Macros,
  periodDays: number = 30
): ConsistencyReport {
  const dailyAdherence = logs.map(log => calculateDailyAdherence(log, targets));
  
  // Group by day of week
  const dayGroups: Record<string, DailyAdherence[]> = {};
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  dailyAdherence.forEach(day => {
    const dayOfWeek = dayNames[new Date(day.date).getDay()];
    if (!dayGroups[dayOfWeek]) dayGroups[dayOfWeek] = [];
    dayGroups[dayOfWeek].push(day);
  });
  
  // Find best and worst days
  let bestDay = '';
  let worstDay = '';
  let bestAdherence = 0;
  let worstAdherence = 100;
  
  Object.entries(dayGroups).forEach(([day, entries]) => {
    const avgAdherence = entries.reduce((sum, entry) => 
      sum + (entry.calories.adherence + entry.protein.adherence) / 2, 0
    ) / entries.length;
    
    if (avgAdherence > bestAdherence) {
      bestAdherence = avgAdherence;
      bestDay = day;
    }
    if (avgAdherence < worstAdherence) {
      worstAdherence = avgAdherence;
      worstDay = day;
    }
  });
  
  // Weekend vs weekday
  const weekendDays = dailyAdherence.filter(day => {
    const dayOfWeek = new Date(day.date).getDay();
    return dayOfWeek === 0 || dayOfWeek === 6;
  });
  
  const weekdayDays = dailyAdherence.filter(day => {
    const dayOfWeek = new Date(day.date).getDay();
    return dayOfWeek > 0 && dayOfWeek < 6;
  });
  
  const weekendAdherence = weekendDays.length > 0
    ? weekendDays.reduce((sum, day) => sum + day.calories.adherence, 0) / weekendDays.length
    : 0;
    
  const weekdayAdherence = weekdayDays.length > 0
    ? weekdayDays.reduce((sum, day) => sum + day.calories.adherence, 0) / weekdayDays.length
    : 0;
  
  return {
    period: periodDays,
    daysLogged: logs.length,
    daysInRange: dailyAdherence.filter(day => day.withinRange).length,
    averageAdherence: Math.round(
      dailyAdherence.reduce((sum, day) => sum + day.calories.adherence, 0) / dailyAdherence.length
    ),
    consistency: Math.round((logs.length / periodDays) * 100),
    patterns: {
      bestDay,
      worstDay,
      weekendAdherence: Math.round(weekendAdherence),
      weekdayAdherence: Math.round(weekdayAdherence)
    }
  };
}