// Supabase Database Implementation
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  UserNutritionProfile,
  Food,
  Meal,
  NutritionLog,
  WeightEntry,
  QuickAddFood,
  WeeklyCheckIn,
  MealType,
  ExpenditureData,
  HabitEntry
} from './types';

export class SupabaseDB {
  private supabase: SupabaseClient;
  private supabaseUrl: string;
  private supabaseKey: string;
  private getClerkToken: (() => Promise<string | null>) | null = null;
  private authClient: SupabaseClient | null = null;
  private lastToken: string | null = null;

  constructor(url: string, key: string) {
    this.supabaseUrl = url;
    this.supabaseKey = key;
    this.supabase = createClient(url, key);
  }

  // Set the Clerk token getter function
  setClerkTokenGetter(getter: () => Promise<string | null>) {
    if (this.getClerkToken) {
      console.log('[SupabaseDB] Token getter already set, skipping');
      return;
    }
    console.log('[SupabaseDB] Setting Clerk token getter');
    this.getClerkToken = getter;
  }

  // Get authenticated Supabase client
  private async getAuthClient(): Promise<SupabaseClient> {
    if (!this.getClerkToken) {
      console.warn('[SupabaseDB] No Clerk token getter set, using anonymous client');
      return this.supabase;
    }

    try {
      const token = await this.getClerkToken();
      
      // Return cached client if token hasn't changed
      if (token === this.lastToken && this.authClient) {
        return this.authClient;
      }
      
      // Only log in development or if there's an issue
      if (!token) {
        console.warn('[SupabaseDB] No Clerk token available');
      }
      
      if (token) {
        // Create new client and cache it
        this.authClient = createClient(
          this.supabaseUrl,
          this.supabaseKey,
          {
            global: {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            },
            auth: {
              persistSession: false,
              autoRefreshToken: false,
              detectSessionInUrl: false
            },
          }
        );
        this.lastToken = token;
        return this.authClient;
      }
    } catch (error) {
      console.error('[SupabaseDB] Error getting Clerk token:', error);
    }

    console.warn('[SupabaseDB] Falling back to anonymous client');
    return this.supabase;
  }

  // ========== User Profile Operations ==========

  async getUserProfile(userId: string): Promise<UserNutritionProfile | null> {
    const client = await this.getAuthClient();
    
    const { data, error } = await client
      .from('user_nutrition_profiles')
      .select('*')
      .eq('clerk_user_id', userId);

    if (error) {
      console.error('Error fetching user profile:', error);
      console.error('Full error object:', JSON.stringify(error, null, 2));
      return null;
    }

    // Return the first item if exists, otherwise null
    const profile = data && data.length > 0 ? data[0] : null;

    // Convert database format to TypeScript interface
    if (profile) {
      return {
        ...profile,
        target_macros: {
          calories: profile.target_calories,
          protein: profile.target_protein,
          carbs: profile.target_carbs,
          fat: profile.target_fat,
          fiber: profile.target_fiber
        }
      };
    }

    return null;
  }

  async createOrUpdateUserProfile(profile: UserNutritionProfile): Promise<boolean> {
    const client = await this.getAuthClient();
    const { target_macros, ...rest } = profile;
    
    const dbProfile = {
      ...rest,
      target_calories: target_macros.calories,
      target_protein: target_macros.protein,
      target_carbs: target_macros.carbs,
      target_fat: target_macros.fat,
      target_fiber: target_macros.fiber || 30
    };

    // First check if profile exists
    const { data: existing } = await client
      .from('user_nutrition_profiles')
      .select('id')
      .eq('clerk_user_id', profile.clerk_user_id)
      .maybeSingle();
    
    let error;
    if (existing) {
      // Update existing profile
      ({ error } = await client
        .from('user_nutrition_profiles')
        .update(dbProfile)
        .eq('clerk_user_id', profile.clerk_user_id));
    } else {
      // Insert new profile
      ({ error } = await client
        .from('user_nutrition_profiles')
        .insert(dbProfile));
    }

    if (error) {
      console.error('Error updating user profile:', error);
      return false;
    }

    return true;
  }

  // ========== Nutrition Log Operations ==========

  async getNutritionLog(userId: string, date: string): Promise<NutritionLog | null> {
    const client = await this.getAuthClient();
    
    const { data, error } = await client
      .from('nutrition_logs')
      .select('*')
      .eq('clerk_user_id', userId)
      .eq('date', date);

    if (error) {
      console.error('Error fetching nutrition log:', error);
      console.error('Error details:', { 
        message: error.message, 
        details: error.details, 
        hint: error.hint,
        code: error.code 
      });
      return null;
    }

    // Return the first item if exists, otherwise null
    return data && data.length > 0 ? data[0] : null;
  }

  async createOrUpdateNutritionLog(log: NutritionLog): Promise<boolean> {
    const client = await this.getAuthClient();
    const { error } = await client
      .from('nutrition_logs')
      .upsert(log, { onConflict: 'clerk_user_id,date' });

    if (error) {
      console.error('Error updating nutrition log:', error);
      return false;
    }

    return true;
  }

  async getNutritionLogs(userId: string, days: number): Promise<NutritionLog[]> {
    const client = await this.getAuthClient();
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await client
      .from('nutrition_logs')
      .select('*')
      .eq('clerk_user_id', userId)
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0])
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching nutrition logs:', error);
      return [];
    }

    return data || [];
  }

  // ========== Meal Operations ==========

  async copyMealsFromDate(userId: string, fromDate: string, toDate: string): Promise<boolean> {
    const client = await this.getAuthClient();
    
    // Get meals from source date
    const sourceMeals = await this.getMealsByDate(userId, fromDate);
    
    if (sourceMeals.length === 0) {
      return false;
    }
    
    // Copy meals to target date
    const copiedMeals = sourceMeals.map(meal => ({
      clerk_user_id: meal.clerk_user_id,
      food_id: meal.food_id,
      amount_grams: meal.amount_grams,
      meal_type: meal.meal_type,
      logged_at: `${toDate}T${new Date(meal.logged_at).toISOString().split('T')[1]}`
    }));
    
    const { error } = await client
      .from('meals')
      .insert(copiedMeals);
    
    if (error) {
      console.error('Error copying meals:', error);
      return false;
    }
    
    return true;
  }

  async getMealsByDate(userId: string, date: string): Promise<Meal[]> {
    const client = await this.getAuthClient();
    const startOfDay = `${date}T00:00:00`;
    const endOfDay = `${date}T23:59:59`;

    const { data, error } = await client
      .from('meals')
      .select(`
        *,
        food:foods(*)
      `)
      .eq('clerk_user_id', userId)
      .gte('logged_at', startOfDay)
      .lte('logged_at', endOfDay)
      .order('logged_at', { ascending: true });

    if (error) {
      console.error('Error fetching meals:', error);
      return [];
    }

    return data || [];
  }

  async createMeal(meal: Meal): Promise<string | null> {
    const client = await this.getAuthClient();
    const { food, ...mealData } = meal;
    
    const { data, error } = await client
      .from('meals')
      .insert(mealData)
      .select()
      .single();

    if (error) {
      console.error('Error creating meal:', error);
      return null;
    }

    return data?.id || null;
  }

  async deleteMeal(mealId: string): Promise<boolean> {
    const client = await this.getAuthClient();
    const { error } = await client
      .from('meals')
      .delete()
      .eq('id', mealId);

    if (error) {
      console.error('Error deleting meal:', error);
      return false;
    }

    return true;
  }

  // ========== Food Operations ==========

  async searchFoods(query: string, userId?: string): Promise<Food[]> {
    const client = await this.getAuthClient();
    let queryBuilder = client
      .from('foods')
      .select('*');

    // Search both public foods and user's custom foods
    if (userId) {
      queryBuilder = queryBuilder.or(`user_id.is.null,user_id.eq.${userId}`);
    } else {
      queryBuilder = queryBuilder.is('user_id', null);
    }

    if (query) {
      queryBuilder = queryBuilder.ilike('name', `%${query}%`);
    }

    const { data, error } = await queryBuilder.limit(20);

    if (error) {
      console.error('Error searching foods:', error);
      console.error('Full error details:', { 
        message: error.message, 
        details: error.details, 
        hint: error.hint,
        code: error.code 
      });
      return [];
    }

    return data || [];
  }

  async createFood(food: Food): Promise<string | null> {
    const client = await this.getAuthClient();
    
    // Convert clerk_user_id to user_id if needed
    const foodData = { ...food };
    if (foodData.clerk_user_id && !foodData.user_id) {
      foodData.user_id = foodData.clerk_user_id;
      delete foodData.clerk_user_id;
    }
    
    // Remove fields that might not exist in the database
    if ('is_verified' in foodData) delete foodData.is_verified;
    if ('verified' in foodData) delete foodData.verified;
    if ('created_at' in foodData) delete foodData.created_at; // This is auto-generated
    if ('id' in foodData) delete foodData.id; // This is auto-generated
    
    const { data, error } = await client
      .from('foods')
      .insert(foodData)
      .select()
      .single();

    if (error) {
      console.error('Error creating food:', error);
      return null;
    }

    return data?.id || null;
  }

  async getFoodById(foodId: string): Promise<Food | null> {
    const client = await this.getAuthClient();
    const { data, error } = await client
      .from('foods')
      .select('*')
      .eq('id', foodId)
      .single();

    if (error) {
      console.error('Error fetching food:', error);
      return null;
    }

    return data;
  }

  // ========== Weight Entry Operations ==========

  async getWeightEntries(userId: string, limit?: number): Promise<WeightEntry[]> {
    const client = await this.getAuthClient();
    let query = client
      .from('weight_entries')
      .select('*')
      .eq('clerk_user_id', userId)
      .order('date', { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching weight entries:', error);
      return [];
    }

    return data || [];
  }

  async createWeightEntry(entry: WeightEntry): Promise<boolean> {
    const client = await this.getAuthClient();
    const { error } = await client
      .from('weight_entries')
      .insert(entry);

    if (error) {
      console.error('Error creating weight entry:', error);
      return false;
    }

    return true;
  }

  // ========== Weekly Check-in Operations ==========

  async getWeeklyCheckIns(userId: string, limit?: number): Promise<WeeklyCheckIn[]> {
    const client = await this.getAuthClient();
    let query = client
      .from('weekly_check_ins')
      .select('*')
      .eq('clerk_user_id', userId)
      .order('week_start_date', { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching weekly check-ins:', error);
      return [];
    }

    return data || [];
  }

  async createWeeklyCheckIn(checkIn: WeeklyCheckIn): Promise<boolean> {
    const client = await this.getAuthClient();
    const { error } = await client
      .from('weekly_check_ins')
      .insert(checkIn);

    if (error) {
      console.error('Error creating weekly check-in:', error);
      return false;
    }

    return true;
  }

  async getLatestWeeklyCheckIn(userId: string): Promise<WeeklyCheckIn | null> {
    const client = await this.getAuthClient();
    const { data, error } = await client
      .from('weekly_check_ins')
      .select('*')
      .eq('clerk_user_id', userId)
      .order('week_start_date', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Error fetching latest weekly check-in:', error);
      return null;
    }

    return data && data.length > 0 ? data[0] : null;
  }

  // ========== Food Management Operations ==========

  async deleteFood(foodId: string): Promise<boolean> {
    const client = await this.getAuthClient();
    const { error } = await client
      .from('foods')
      .delete()
      .eq('id', foodId);

    if (error) {
      console.error('Error deleting food:', error);
      return false;
    }

    return true;
  }

  async updateFood(foodId: string, updates: any): Promise<boolean> {
    const client = await this.getAuthClient();
    const { error } = await client
      .from('foods')
      .update(updates)
      .eq('id', foodId);

    if (error) {
      console.error('Error updating food:', error);
      return false;
    }

    return true;
  }

  async toggleFavoriteFood(userId: string, foodId: string): Promise<boolean> {
    const client = await this.getAuthClient();
    
    // Check if exists
    const { data: existing } = await client
      .from('quick_add_foods')
      .select('*')
      .eq('clerk_user_id', userId)
      .eq('food_id', foodId)
      .single();

    if (existing) {
      // Toggle favorite status
      const { error } = await client
        .from('quick_add_foods')
        .update({ is_favorite: !existing.is_favorite })
        .eq('id', existing.id);

      if (error) {
        console.error('Error toggling favorite:', error);
        return false;
      }
    } else {
      // Create as favorite
      const { error } = await client
        .from('quick_add_foods')
        .insert({
          clerk_user_id: userId,
          food_id: foodId,
          frequency: 0,
          is_favorite: true
        });

      if (error) {
        console.error('Error creating favorite:', error);
        return false;
      }
    }

    return true;
  }

  // ========== Meal Template Operations ==========

  async getMealTemplates(userId: string): Promise<any[]> {
    const client = await this.getAuthClient();
    const { data, error } = await client
      .from('meal_templates')
      .select('*')
      .eq('clerk_user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching meal templates:', error);
      return [];
    }

    return data || [];
  }

  async createMealTemplate(template: any): Promise<string | null> {
    const client = await this.getAuthClient();
    const { data, error } = await client
      .from('meal_templates')
      .insert(template)
      .select()
      .single();

    if (error) {
      console.error('Error creating meal template:', error);
      return null;
    }

    return data?.id || null;
  }

  async deleteMealTemplate(templateId: string): Promise<boolean> {
    const client = await this.getAuthClient();
    const { error } = await client
      .from('meal_templates')
      .delete()
      .eq('id', templateId);

    if (error) {
      console.error('Error deleting meal template:', error);
      return false;
    }

    return true;
  }

  async applyMealTemplate(userId: string, templateId: string, mealType: MealType, date: string): Promise<boolean> {
    const client = await this.getAuthClient();
    
    // Get template
    const { data: template, error: templateError } = await client
      .from('meal_templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (templateError || !template) {
      console.error('Error fetching meal template:', templateError);
      return false;
    }

    // Create meals from template
    const meals = template.foods.map((food: any) => ({
      clerk_user_id: userId,
      food_id: food.food_id,
      amount_grams: food.amount_grams,
      meal_type: mealType,
      logged_at: `${date}T${new Date().toISOString().split('T')[1]}`
    }));

    const { error: mealsError } = await client
      .from('meals')
      .insert(meals);

    if (mealsError) {
      console.error('Error applying meal template:', mealsError);
      return false;
    }

    return true;
  }

  // ========== Expenditure Tracking Operations ==========

  async getExpenditureData(userId: string, limit?: number): Promise<ExpenditureData[]> {
    const client = await this.getAuthClient();
    let query = client
      .from('expenditure_data')
      .select('*')
      .eq('clerk_user_id', userId)
      .order('date', { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching expenditure data:', error);
      return [];
    }

    return data || [];
  }

  async createExpenditureData(data: ExpenditureData): Promise<boolean> {
    const client = await this.getAuthClient();
    const { error } = await client
      .from('expenditure_data')
      .upsert(data, { onConflict: 'clerk_user_id,date' });

    if (error) {
      console.error('Error creating expenditure data:', error);
      return false;
    }

    return true;
  }

  async getLatestExpenditureData(userId: string): Promise<ExpenditureData | null> {
    const client = await this.getAuthClient();
    const { data, error } = await client
      .from('expenditure_data')
      .select('*')
      .eq('clerk_user_id', userId)
      .order('date', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Error fetching latest expenditure data:', error);
      return null;
    }

    return data && data.length > 0 ? data[0] : null;
  }

  // ========== Habit Tracking Operations ==========

  async getHabitEntries(userId: string, limit?: number): Promise<HabitEntry[]> {
    const client = await this.getAuthClient();
    let query = client
      .from('habit_entries')
      .select('*')
      .eq('clerk_user_id', userId)
      .order('date', { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching habit entries:', error);
      return [];
    }

    return data || [];
  }

  async createOrUpdateHabitEntry(entry: HabitEntry): Promise<boolean> {
    const client = await this.getAuthClient();
    const { error } = await client
      .from('habit_entries')
      .upsert(entry, { onConflict: 'clerk_user_id,date' });

    if (error) {
      console.error('Error creating habit entry:', error);
      return false;
    }

    return true;
  }

  async getHabitStreak(userId: string, habitType: keyof HabitEntry): Promise<number> {
    const client = await this.getAuthClient();
    const { data, error } = await client
      .from('habit_entries')
      .select('*')
      .eq('clerk_user_id', userId)
      .order('date', { ascending: false })
      .limit(100); // Look back up to 100 days

    if (error || !data) {
      console.error('Error fetching habit streak:', error);
      return 0;
    }

    let streak = 0;
    const today = new Date();
    
    for (let i = 0; i < data.length; i++) {
      const entryDate = new Date(data[i].date);
      const daysDiff = Math.floor((today.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff === i && data[i][habitType]) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  }

  // ========== Quick Add Foods Operations ==========

  async getQuickAddFoods(userId: string, limit?: number): Promise<QuickAddFood[]> {
    const client = await this.getAuthClient();
    let query = client
      .from('quick_add_foods')
      .select(`
        *,
        food:foods(*)
      `)
      .eq('clerk_user_id', userId)
      .order('frequency', { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching quick add foods:', error);
      return [];
    }

    return data || [];
  }

  async getRecentFoods(userId: string, limit: number = 20): Promise<Food[]> {
    const client = await this.getAuthClient();
    
    // Get recent foods from meals
    const { data: recentMeals, error } = await client
      .from('meals')
      .select(`
        food_id,
        foods(*)
      `)
      .eq('clerk_user_id', userId)
      .order('logged_at', { ascending: false })
      .limit(limit * 2); // Get more to account for duplicates

    if (error) {
      console.error('Error fetching recent foods:', error);
      return [];
    }

    // Remove duplicates and return unique foods
    const seenFoods = new Set();
    const uniqueFoods: Food[] = [];
    
    for (const meal of recentMeals || []) {
      if (meal.foods && !seenFoods.has(meal.food_id)) {
        seenFoods.add(meal.food_id);
        uniqueFoods.push(meal.foods as unknown as Food);
        if (uniqueFoods.length >= limit) break;
      }
    }
    
    return uniqueFoods;
  }

  async updateQuickAddFrequency(userId: string, foodId: string): Promise<boolean> {
    const client = await this.getAuthClient();
    
    // First check if it exists
    const { data: existing } = await client
      .from('quick_add_foods')
      .select('*')
      .eq('clerk_user_id', userId)
      .eq('food_id', foodId)
      .single();

    if (existing) {
      // Update frequency
      const { error } = await client
        .from('quick_add_foods')
        .update({ 
          frequency: existing.frequency + 1,
          last_used: new Date().toISOString()
        })
        .eq('id', existing.id);

      if (error) {
        console.error('Error updating quick add frequency:', error);
        return false;
      }
    } else {
      // Create new quick add entry
      const { error } = await client
        .from('quick_add_foods')
        .insert({
          clerk_user_id: userId,
          food_id: foodId,
          frequency: 1,
          last_used: new Date().toISOString()
        });

      if (error) {
        console.error('Error creating quick add entry:', error);
        return false;
      }
    }

    return true;
  }
}

// Singleton instance
let dbInstance: SupabaseDB | null = null;

// Create and export the database instance as a singleton
export const db = (() => {
  if (!dbInstance) {
    console.log('[SupabaseDB] Creating singleton instance');
    dbInstance = new SupabaseDB(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_KEY
    );
  }
  return dbInstance;
})();