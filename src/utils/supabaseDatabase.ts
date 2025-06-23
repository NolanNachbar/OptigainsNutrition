// Supabase Database Implementation
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  UserNutritionProfile,
  Food,
  Meal,
  NutritionLog,
  WeightEntry,
  QuickAddFood,
  WeeklyCheckIn
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

    const { error } = await client
      .from('user_nutrition_profiles')
      .upsert(dbProfile, { onConflict: 'clerk_user_id' });

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

  // ========== Meal Operations ==========

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

// Create and export the database instance
export const db = new SupabaseDB(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_KEY
);