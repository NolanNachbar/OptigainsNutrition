// Database initialization and exports
import { db } from './supabaseDatabase';

// Initialize database with Clerk token getter
export const initializeDatabase = (getToken: () => Promise<string | null>) => {
  db.setClerkTokenGetter(getToken);
};

// Export database instance
export { db };

// Export all database functions
export const getUserProfile = (userId: string) => db.getUserProfile(userId);
export const createOrUpdateUserProfile = (profile: any) => db.createOrUpdateUserProfile(profile);
export const getNutritionLog = (userId: string, date: string) => db.getNutritionLog(userId, date);
export const createOrUpdateNutritionLog = (log: any) => db.createOrUpdateNutritionLog(log);
export const getNutritionLogs = (userId: string, days: number) => db.getNutritionLogs(userId, days);
export const getMealsByDate = (userId: string, date: string) => db.getMealsByDate(userId, date);
export const createMeal = (meal: any) => db.createMeal(meal);
export const deleteMeal = (mealId: string) => db.deleteMeal(mealId);
export const searchFoods = (query: string, userId?: string) => db.searchFoods(query, userId);
export const createFood = async (food: any) => {
  const foodId = await db.createFood(food);
  if (foodId) {
    // Return the created food object
    return await db.getFoodById(foodId);
  }
  return null;
};
export const getFoodById = (foodId: string) => db.getFoodById(foodId);
export const getWeightEntries = (userId: string, limit?: number) => db.getWeightEntries(userId, limit);
export const createWeightEntry = (entry: any) => db.createWeightEntry(entry);
export const addWeightEntry = (entry: any) => createWeightEntry(entry);
export const getWeeklyCheckIns = (userId: string, limit?: number) => db.getWeeklyCheckIns(userId, limit);
export const createWeeklyCheckIn = (checkIn: any) => db.createWeeklyCheckIn(checkIn);
export const getLatestWeeklyCheckIn = (userId: string) => db.getLatestWeeklyCheckIn(userId);
export const getQuickAddFoods = (userId: string, limit?: number) => db.getQuickAddFoods(userId, limit);
export const updateQuickAddFrequency = (userId: string, foodId: string) => db.updateQuickAddFrequency(userId, foodId);

// Additional functions from nutritionDatabase.ts
export const calculateDailyTotals = async (userId: string, date: string) => {
  const meals = await getMealsByDate(userId, date);
  
  return meals.reduce((totals, meal) => {
    if (!meal.food) return totals;
    
    const multiplier = meal.amount_grams / 100;
    return {
      calories: totals.calories + (meal.food.calories_per_100g * multiplier),
      protein: totals.protein + (meal.food.protein_per_100g * multiplier),
      carbs: totals.carbs + (meal.food.carbs_per_100g * multiplier),
      fat: totals.fat + (meal.food.fat_per_100g * multiplier),
      fiber: (totals.fiber || 0) + ((meal.food.fiber_per_100g || 0) * multiplier),
      sugar: (totals.sugar || 0) + ((meal.food.sugar_per_100g || 0) * multiplier),
      saturatedFat: (totals.saturatedFat || 0) + ((meal.food.saturated_fat_per_100g || 0) * multiplier),
      sodium: (totals.sodium || 0) + ((meal.food.sodium_per_100g || 0) * multiplier)
    };
  }, { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, saturatedFat: 0, sodium: 0 });
};

export const deleteFood = async (foodId: string) => db.deleteFood(foodId);

export const updateFood = async (foodId: string, updates: any) => db.updateFood(foodId, updates);

export const getFavoriteFoods = async (userId: string) => {
  return db.getQuickAddFoods(userId, 50).then(foods => 
    foods.filter(f => f.is_favorite)
  );
};

export const toggleFavoriteFood = async (userId: string, foodId: string) => db.toggleFavoriteFood(userId, foodId);

// Wrapper for addMeal to match the old API
export const addMeal = async (meal: any) => {
  const mealId = await createMeal(meal);
  return mealId !== null;
};

// Additional helper functions
export const getWeightRange = async (userId: string, startDate: string, endDate: string) => {
  const entries = await getWeightEntries(userId);
  return entries.filter(entry => entry.date >= startDate && entry.date <= endDate);
};

export const calculateWeeklyAverages = async (userId: string, weekEndDate: string) => {
  const startDate = new Date(weekEndDate);
  startDate.setDate(startDate.getDate() - 6);
  const weekStartDate = startDate.toISOString().split('T')[0];
  
  const logs = await getNutritionLogRange(userId, weekStartDate, weekEndDate);
  
  if (logs.length === 0) {
    return {
      macros: { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
      adherence: 0
    };
  }
  
  const totals = logs.reduce((acc, log) => ({
    calories: acc.calories + log.calories,
    protein: acc.protein + log.protein,
    carbs: acc.carbs + log.carbs,
    fat: acc.fat + log.fat,
    fiber: acc.fiber + (log.fiber || 0)
  }), { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });
  
  const avgMacros = {
    calories: Math.round(totals.calories / logs.length),
    protein: Math.round(totals.protein / logs.length),
    carbs: Math.round(totals.carbs / logs.length),
    fat: Math.round(totals.fat / logs.length),
    fiber: Math.round(totals.fiber / logs.length)
  };
  
  // Calculate adherence (simplified)
  const adherence = logs.length >= 5 ? 80 : (logs.length / 7) * 100;
  
  return { macros: avgMacros, adherence: Math.round(adherence) };
};

export const getNutritionLogRange = async (userId: string, startDate: string, endDate: string) => {
  // This would need to be implemented in supabaseDatabase.ts
  // For now, let's create a simple implementation
  const logs = [];
  const current = new Date(startDate);
  const end = new Date(endDate);
  
  while (current <= end) {
    const dateStr = current.toISOString().split('T')[0];
    const log = await getNutritionLog(userId, dateStr);
    if (log) {
      logs.push(log);
    }
    current.setDate(current.getDate() + 1);
  }
  
  return logs;
};