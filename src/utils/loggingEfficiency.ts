// Logging efficiency utilities for quick food entry
// Implements portion memory, frequent foods, and smart defaults

import { Food, Meal, MealType } from './types';

export interface PortionMemory {
  foodId: string;
  foodName: string;
  portions: PortionRecord[];
  lastUsed: string;
  frequency: number;
}

export interface PortionRecord {
  amount: number;
  unit: 'g' | 'oz';
  mealType: MealType;
  timestamp: string;
}

export interface FrequentFood {
  food: Food;
  frequency: number;
  lastUsed: string;
  averagePortion: number;
  preferredMealTypes: MealType[];
}

export interface QuickAddSuggestion {
  food: Food;
  suggestedAmount: number;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
  mealType: MealType;
}

/**
 * Get smart portion suggestion based on history
 */
export function getSmartPortionSize(
  foodId: string,
  mealType: MealType,
  portionHistory: PortionMemory[],
  defaultPortion: number = 100
): { amount: number; confidence: 'high' | 'medium' | 'low' } {
  const foodHistory = portionHistory.find(h => h.foodId === foodId);
  
  if (!foodHistory || foodHistory.portions.length === 0) {
    return { amount: defaultPortion, confidence: 'low' };
  }
  
  // Get portions for this meal type
  const mealTypePortions = foodHistory.portions.filter(p => p.mealType === mealType);
  
  if (mealTypePortions.length > 0) {
    // Use most recent portion for this meal type
    const lastPortion = mealTypePortions[mealTypePortions.length - 1];
    return { amount: lastPortion.amount, confidence: 'high' };
  }
  
  // Fall back to average of all portions
  const avgPortion = foodHistory.portions.reduce((sum, p) => sum + p.amount, 0) / foodHistory.portions.length;
  return { amount: Math.round(avgPortion), confidence: 'medium' };
}

/**
 * Update portion memory with new entry
 */
export function updatePortionMemory(
  meal: Meal,
  existingMemory: PortionMemory[]
): PortionMemory[] {
  const memory = [...existingMemory];
  const existingIndex = memory.findIndex(m => m.foodId === meal.food_id);
  
  const newPortion: PortionRecord = {
    amount: meal.amount_grams,
    unit: 'g', // Always store in grams
    mealType: meal.meal_type,
    timestamp: meal.logged_at
  };
  
  if (existingIndex >= 0) {
    // Update existing memory
    memory[existingIndex].portions.push(newPortion);
    memory[existingIndex].lastUsed = meal.logged_at;
    memory[existingIndex].frequency++;
    
    // Keep only last 20 portions
    if (memory[existingIndex].portions.length > 20) {
      memory[existingIndex].portions = memory[existingIndex].portions.slice(-20);
    }
  } else {
    // Create new memory
    memory.push({
      foodId: meal.food_id,
      foodName: meal.food?.name || '',
      portions: [newPortion],
      lastUsed: meal.logged_at,
      frequency: 1
    });
  }
  
  return memory;
}

/**
 * Get frequent foods for a specific meal type
 */
export function getFrequentFoods(
  meals: Meal[],
  mealType?: MealType,
  limit: number = 10
): FrequentFood[] {
  const foodFrequency = new Map<string, {
    food: Food;
    count: number;
    portions: number[];
    mealTypes: MealType[];
    lastUsed: string;
  }>();
  
  // Aggregate food frequency
  meals.forEach(meal => {
    if (!meal.food || (mealType && meal.meal_type !== mealType)) return;
    
    const existing = foodFrequency.get(meal.food_id);
    if (existing) {
      existing.count++;
      existing.portions.push(meal.amount_grams);
      if (!existing.mealTypes.includes(meal.meal_type)) {
        existing.mealTypes.push(meal.meal_type);
      }
      if (meal.logged_at > existing.lastUsed) {
        existing.lastUsed = meal.logged_at;
      }
    } else {
      foodFrequency.set(meal.food_id, {
        food: meal.food,
        count: 1,
        portions: [meal.amount_grams],
        mealTypes: [meal.meal_type],
        lastUsed: meal.logged_at
      });
    }
  });
  
  // Convert to FrequentFood array
  const frequentFoods: FrequentFood[] = Array.from(foodFrequency.values())
    .map(({ food, count, portions, mealTypes, lastUsed }) => ({
      food,
      frequency: count,
      lastUsed,
      averagePortion: Math.round(portions.reduce((a, b) => a + b, 0) / portions.length),
      preferredMealTypes: mealTypes
    }))
    .sort((a, b) => {
      // Sort by recency and frequency
      const recencyWeight = 0.3;
      const frequencyWeight = 0.7;
      
      const aDays = (Date.now() - new Date(a.lastUsed).getTime()) / (1000 * 60 * 60 * 24);
      const bDays = (Date.now() - new Date(b.lastUsed).getTime()) / (1000 * 60 * 60 * 24);
      
      const aScore = (a.frequency * frequencyWeight) - (aDays * recencyWeight);
      const bScore = (b.frequency * frequencyWeight) - (bDays * recencyWeight);
      
      return bScore - aScore;
    })
    .slice(0, limit);
  
  return frequentFoods;
}

/**
 * Generate quick-add suggestions based on patterns
 */
export function generateQuickAddSuggestions(
  mealType: MealType,
  timeOfDay: number, // 0-23 hours
  dayOfWeek: number, // 0-6 (Sunday-Saturday)
  recentMeals: Meal[],
  frequentFoods: FrequentFood[]
): QuickAddSuggestion[] {
  const suggestions: QuickAddSuggestion[] = [];
  
  // Filter meals from same meal type and similar time
  const similarMeals = recentMeals.filter(meal => {
    if (meal.meal_type !== mealType) return false;
    
    const mealHour = new Date(meal.logged_at).getHours();
    const mealDay = new Date(meal.logged_at).getDay();
    
    // Same meal type within 2 hours and same day of week
    return Math.abs(mealHour - timeOfDay) <= 2 && mealDay === dayOfWeek;
  });
  
  // Get foods from similar meals
  const similarFoodIds = new Set(similarMeals.map(m => m.food_id));
  
  // Add suggestions from pattern matching
  frequentFoods.forEach(({ food, averagePortion, preferredMealTypes, frequency }) => {
    if (similarFoodIds.has(food.id!)) {
      // High confidence - eaten at this time before
      suggestions.push({
        food,
        suggestedAmount: averagePortion,
        confidence: 'high',
        reason: `You often have ${food.name} for ${mealType} at this time`,
        mealType
      });
    } else if (preferredMealTypes.includes(mealType) && frequency > 5) {
      // Medium confidence - frequent food for this meal type
      suggestions.push({
        food,
        suggestedAmount: averagePortion,
        confidence: 'medium',
        reason: `Frequently eaten for ${mealType}`,
        mealType
      });
    }
  });
  
  // Sort by confidence and limit
  return suggestions
    .sort((a, b) => {
      const confidenceOrder = { high: 3, medium: 2, low: 1 };
      return confidenceOrder[b.confidence] - confidenceOrder[a.confidence];
    })
    .slice(0, 5);
}

/**
 * Get meal copying suggestions
 */
export function getMealCopySuggestions(
  currentDate: string,
  mealType: MealType,
  recentMeals: Meal[],
  lookbackDays: number = 7
): { date: string; meals: Meal[]; similarity: number }[] {
  const suggestions: { date: string; meals: Meal[]; similarity: number }[] = [];
  const currentDay = new Date(currentDate).getDay();
  
  // Group meals by date
  const mealsByDate = new Map<string, Meal[]>();
  recentMeals.forEach(meal => {
    const date = meal.logged_at.split('T')[0];
    if (!mealsByDate.has(date)) {
      mealsByDate.set(date, []);
    }
    mealsByDate.get(date)!.push(meal);
  });
  
  // Find similar days
  mealsByDate.forEach((meals, date) => {
    if (date === currentDate) return;
    
    const dayMeals = meals.filter(m => m.meal_type === mealType);
    if (dayMeals.length === 0) return;
    
    const mealDate = new Date(date);
    const dayOfWeek = mealDate.getDay();
    const daysAgo = Math.floor((new Date(currentDate).getTime() - mealDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysAgo > lookbackDays) return;
    
    // Calculate similarity score
    let similarity = 0;
    
    // Same day of week = high similarity
    if (dayOfWeek === currentDay) similarity += 0.5;
    
    // Recent = higher similarity
    similarity += (1 - daysAgo / lookbackDays) * 0.3;
    
    // Multiple items = higher similarity
    similarity += Math.min(dayMeals.length / 5, 0.2);
    
    suggestions.push({
      date,
      meals: dayMeals,
      similarity
    });
  });
  
  // Sort by similarity
  return suggestions.sort((a, b) => b.similarity - a.similarity).slice(0, 3);
}

/**
 * Store and retrieve portion memory from localStorage
 */
export function savePortionMemory(userId: string, memory: PortionMemory[]): void {
  localStorage.setItem(`portion_memory_${userId}`, JSON.stringify(memory));
}

export function loadPortionMemory(userId: string): PortionMemory[] {
  const stored = localStorage.getItem(`portion_memory_${userId}`);
  return stored ? JSON.parse(stored) : [];
}

/**
 * Clean up old portion memory entries
 */
export function cleanupPortionMemory(memory: PortionMemory[], maxAgeDays: number = 90): PortionMemory[] {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - maxAgeDays);
  
  return memory.filter(m => new Date(m.lastUsed) > cutoffDate);
}