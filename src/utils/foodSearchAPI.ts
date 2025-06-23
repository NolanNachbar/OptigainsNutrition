import { Food } from './types';

// USDA FoodData Central API
const USDA_API_KEY = import.meta.env.VITE_USDA_API_KEY || 'DEMO_KEY';
const USDA_API_BASE = 'https://api.nal.usda.gov/fdc/v1';

// OpenFoodFacts API (no key required)
const OFF_API_BASE = 'https://world.openfoodfacts.org/api/v0';

// Remove unused interfaces - they are only used internally in conversion functions

/**
 * Search for foods using USDA FoodData Central API
 */
export async function searchUSDAFoods(query: string, limit: number = 20): Promise<Food[]> {
  try {
    const response = await fetch(
      `${USDA_API_BASE}/foods/search?query=${encodeURIComponent(query)}&limit=${limit}&api_key=${USDA_API_KEY}`
    );

    if (!response.ok) {
      throw new Error('USDA API request failed');
    }

    const data = await response.json();
    
    return data.foods?.map((food: any) => convertUSDAToFood(food)).filter(Boolean) || [];
  } catch (error) {
    console.error('Error searching USDA foods:', error);
    return [];
  }
}

/**
 * Get food details by USDA FDC ID
 */
export async function getUSDAFoodDetails(fdcId: string): Promise<Food | null> {
  try {
    const response = await fetch(
      `${USDA_API_BASE}/food/${fdcId}?api_key=${USDA_API_KEY}`
    );

    if (!response.ok) {
      throw new Error('USDA API request failed');
    }

    const data = await response.json();
    return convertUSDAToFood(data);
  } catch (error) {
    console.error('Error fetching USDA food details:', error);
    return null;
  }
}

/**
 * Search for foods by barcode using Open Food Facts API
 */
export async function searchFoodByBarcode(barcode: string): Promise<Food | null> {
  try {
    const response = await fetch(`${OFF_API_BASE}/product/${barcode}.json`);
    
    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    
    if (data.status !== 1 || !data.product) {
      return null;
    }

    return convertOpenFoodFactsToFood(data.product);
  } catch (error) {
    console.error('Error searching by barcode:', error);
    return null;
  }
}

/**
 * Search Open Food Facts for foods (backup when USDA is unavailable)
 */
export async function searchOpenFoodFacts(query: string, limit: number = 20): Promise<Food[]> {
  try {
    const response = await fetch(
      `${OFF_API_BASE}/cgi/search.pl?search_terms=${encodeURIComponent(
        query
      )}&search_simple=1&action=process&json=1&page_size=${limit}`
    );

    if (!response.ok) {
      throw new Error('OpenFoodFacts API request failed');
    }

    const data = await response.json();
    
    return data.products?.map((product: any) => convertOpenFoodFactsToFood(product)).filter(Boolean) || [];
  } catch (error) {
    console.error('Error searching OpenFoodFacts:', error);
    return [];
  }
}

/**
 * Combined food search that tries multiple sources
 */
export async function searchFoods(query: string, options?: {
  includeUSDA?: boolean;
  includeOpenFoodFacts?: boolean;
  limit?: number;
}): Promise<Food[]> {
  const { 
    includeUSDA = true, 
    includeOpenFoodFacts = true, 
    limit = 20 
  } = options || {};

  const searches: Promise<Food[]>[] = [];

  if (includeUSDA && USDA_API_KEY !== 'DEMO_KEY') {
    searches.push(searchUSDAFoods(query, limit));
  }

  if (includeOpenFoodFacts) {
    searches.push(searchOpenFoodFacts(query, limit));
  }

  const results = await Promise.allSettled(searches);
  
  // Combine results from all sources
  const foods: Food[] = [];
  results.forEach(result => {
    if (result.status === 'fulfilled') {
      foods.push(...result.value);
    }
  });

  // Remove duplicates based on name and brand
  const uniqueFoods = foods.reduce((acc, food) => {
    const key = `${food.name}-${food.brand}`.toLowerCase();
    if (!acc.some(f => `${f.name}-${f.brand}`.toLowerCase() === key)) {
      acc.push(food);
    }
    return acc;
  }, [] as Food[]);

  return uniqueFoods.slice(0, limit);
}

// ========== Conversion Functions ==========

function convertUSDAToFood(usdaFood: any): Food | null {
  if (!usdaFood) return null;

  // Find relevant nutrients
  const nutrients = usdaFood.foodNutrients || [];
  
  const findNutrient = (ids: number[]): number => {
    const nutrient = nutrients.find((n: any) => ids.includes(n.nutrientId));
    return nutrient?.value || 0;
  };

  // USDA Nutrient IDs
  const NUTRIENT_IDS = {
    calories: [1008], // Energy (kcal)
    protein: [1003], // Protein
    carbs: [1005], // Carbohydrate, by difference
    fat: [1004], // Total lipid (fat)
    fiber: [1079], // Fiber, total dietary
    sugar: [2000], // Sugars, total
    saturatedFat: [1258], // Fatty acids, total saturated
    sodium: [1093] // Sodium, Na
  };

  const food: Food = {
    name: usdaFood.description || usdaFood.lowercaseDescription || 'Unknown Food',
    brand: usdaFood.brandOwner || usdaFood.brandName || 'Generic',
    barcode: usdaFood.gtinUpc,
    serving_size: 100, // USDA typically reports per 100g
    calories_per_100g: findNutrient(NUTRIENT_IDS.calories),
    protein_per_100g: findNutrient(NUTRIENT_IDS.protein),
    carbs_per_100g: findNutrient(NUTRIENT_IDS.carbs),
    fat_per_100g: findNutrient(NUTRIENT_IDS.fat),
    fiber_per_100g: findNutrient(NUTRIENT_IDS.fiber),
    sugar_per_100g: findNutrient(NUTRIENT_IDS.sugar),
    saturated_fat_per_100g: findNutrient(NUTRIENT_IDS.saturatedFat),
    sodium_per_100g: findNutrient(NUTRIENT_IDS.sodium) / 1000, // Convert mg to g
    is_verified: true
  };

  // Only return if we have basic macro data
  if (food.calories_per_100g > 0) {
    return food;
  }

  return null;
}

function convertOpenFoodFactsToFood(product: any): Food | null {
  if (!product || !product.nutriments) return null;

  const nutriments = product.nutriments;
  
  const food: Food = {
    name: product.product_name || 'Unknown Food',
    brand: product.brands || 'Generic',
    barcode: product.code,
    serving_size: 100,
    calories_per_100g: nutriments['energy-kcal_100g'] || 0,
    protein_per_100g: nutriments['proteins_100g'] || 0,
    carbs_per_100g: nutriments['carbohydrates_100g'] || 0,
    fat_per_100g: nutriments['fat_100g'] || 0,
    fiber_per_100g: nutriments['fiber_100g'],
    sugar_per_100g: nutriments['sugars_100g'],
    saturated_fat_per_100g: nutriments['saturated-fat_100g'],
    sodium_per_100g: nutriments['sodium_100g'], // Already in g
    is_verified: true
  };

  // Only return if we have basic macro data
  if (food.calories_per_100g > 0) {
    return food;
  }

  return null;
}

/**
 * Estimate calories from macros if not provided
 */
export function estimateCaloriesFromMacros(protein: number, carbs: number, fat: number): number {
  return Math.round((protein * 4) + (carbs * 4) + (fat * 9));
}

/**
 * Validate macro data for consistency
 */
export function validateMacroData(food: Food): boolean {
  const calculatedCalories = estimateCaloriesFromMacros(
    food.protein_per_100g,
    food.carbs_per_100g,
    food.fat_per_100g
  );
  
  // Allow 20% margin of error
  const margin = 0.2;
  const lowerBound = food.calories_per_100g * (1 - margin);
  const upperBound = food.calories_per_100g * (1 + margin);
  
  return calculatedCalories >= lowerBound && calculatedCalories <= upperBound;
}