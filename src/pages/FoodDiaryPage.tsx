import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { format, addDays, subDays } from 'date-fns';
import { Meal, NutritionLog, MealType } from '../utils/types';
import Actionbar from '../components/Actionbar';

interface MealGroup {
  type: MealType;
  meals: Meal[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
}

const FoodDiaryPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [meals, setMeals] = useState<Meal[]>([]);
  const [nutritionLog, setNutritionLog] = useState<NutritionLog | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMeals();
  }, [user, selectedDate]);

  const fetchMeals = async () => {
    if (!user) return;
    
    // TODO: Implement actual database fetching
    // For now, using mock data
    const mockMeals: Meal[] = [
      {
        id: '1',
        user_id: user.id,
        food_id: '1',
        food: {
          id: '1',
          name: 'Chicken Breast',
          brand: 'Generic',
          serving_size: 100,
          calories_per_100g: 165,
          protein_per_100g: 31,
          carbs_per_100g: 0,
          fat_per_100g: 3.6
        },
        amount_grams: 150,
        meal_type: 'lunch',
        logged_at: format(selectedDate, 'yyyy-MM-dd')
      },
      {
        id: '2',
        user_id: user.id,
        food_id: '2',
        food: {
          id: '2',
          name: 'Brown Rice',
          brand: 'Generic',
          serving_size: 100,
          calories_per_100g: 112,
          protein_per_100g: 2.6,
          carbs_per_100g: 23,
          fat_per_100g: 0.9
        },
        amount_grams: 200,
        meal_type: 'lunch',
        logged_at: format(selectedDate, 'yyyy-MM-dd')
      }
    ];

    setMeals(mockMeals);
    
    // Calculate totals for the day
    const totals = mockMeals.reduce((acc, meal) => {
      const multiplier = meal.amount_grams / 100;
      return {
        calories: acc.calories + (meal.food?.calories_per_100g || 0) * multiplier,
        protein: acc.protein + (meal.food?.protein_per_100g || 0) * multiplier,
        carbs: acc.carbs + (meal.food?.carbs_per_100g || 0) * multiplier,
        fat: acc.fat + (meal.food?.fat_per_100g || 0) * multiplier
      };
    }, { calories: 0, protein: 0, carbs: 0, fat: 0 });

    setNutritionLog({
      user_id: user.id,
      date: format(selectedDate, 'yyyy-MM-dd'),
      ...totals
    });

    setLoading(false);
  };

  const groupMealsByType = (): MealGroup[] => {
    const mealTypes: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];
    
    return mealTypes.map(type => {
      const typeMeals = meals.filter(meal => meal.meal_type === type);
      const totals = typeMeals.reduce((acc, meal) => {
        const multiplier = meal.amount_grams / 100;
        return {
          calories: acc.calories + (meal.food?.calories_per_100g || 0) * multiplier,
          protein: acc.protein + (meal.food?.protein_per_100g || 0) * multiplier,
          carbs: acc.carbs + (meal.food?.carbs_per_100g || 0) * multiplier,
          fat: acc.fat + (meal.food?.fat_per_100g || 0) * multiplier
        };
      }, { calories: 0, protein: 0, carbs: 0, fat: 0 });

      return {
        type,
        meals: typeMeals,
        totalCalories: Math.round(totals.calories),
        totalProtein: Math.round(totals.protein),
        totalCarbs: Math.round(totals.carbs),
        totalFat: Math.round(totals.fat)
      };
    });
  };

  const handleDateChange = (direction: 'prev' | 'next') => {
    setSelectedDate(current => 
      direction === 'prev' ? subDays(current, 1) : addDays(current, 1)
    );
  };

  const handleCopyPreviousDay = async () => {
    // TODO: Implement copy from previous day
    console.log('Copy from previous day');
  };

  const deleteMeal = async (mealId: string) => {
    // TODO: Implement delete meal
    setMeals(meals.filter(meal => meal.id !== mealId));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100">
        <Actionbar />
        <div className="flex items-center justify-center h-screen">
          <div className="text-gray-600">Loading...</div>
        </div>
      </div>
    );
  }

  const mealGroups = groupMealsByType();

  return (
    <div className="min-h-screen bg-gray-100">
      <Actionbar />
      
      <div className="container mx-auto px-4 py-6 max-w-md">
        {/* Date Navigation */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => handleDateChange('prev')}
              className="p-2 hover:bg-gray-100 rounded"
            >
              ←
            </button>
            <div className="text-center">
              <div className="font-semibold">{format(selectedDate, 'EEEE')}</div>
              <div className="text-sm text-gray-600">{format(selectedDate, 'MMM d, yyyy')}</div>
            </div>
            <button
              onClick={() => handleDateChange('next')}
              className="p-2 hover:bg-gray-100 rounded"
              disabled={selectedDate >= new Date()}
            >
              →
            </button>
          </div>
        </div>

        {/* Daily Summary */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Daily Summary</h2>
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {Math.round(nutritionLog?.calories || 0)}
              </div>
              <div className="text-xs text-gray-600">Calories</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">
                {Math.round(nutritionLog?.protein || 0)}g
              </div>
              <div className="text-xs text-gray-600">Protein</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {Math.round(nutritionLog?.carbs || 0)}g
              </div>
              <div className="text-xs text-gray-600">Carbs</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-600">
                {Math.round(nutritionLog?.fat || 0)}g
              </div>
              <div className="text-xs text-gray-600">Fat</div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => navigate('/add-food')}
            className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors"
          >
            + Add Food
          </button>
          <button
            onClick={handleCopyPreviousDay}
            className="bg-gray-200 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Copy Previous Day
          </button>
        </div>

        {/* Meals by Type */}
        {mealGroups.map(group => (
          <div key={group.type} className="bg-white rounded-lg shadow-md p-4 mb-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold capitalize">{group.type}</h3>
              {group.totalCalories > 0 && (
                <div className="text-sm text-gray-600">
                  {group.totalCalories} cal
                </div>
              )}
            </div>
            
            {group.meals.length === 0 ? (
              <button
                onClick={() => navigate(`/add-food?meal=${group.type}`)}
                className="w-full text-left text-gray-500 hover:text-blue-600 py-2"
              >
                + Add {group.type}
              </button>
            ) : (
              <>
                {group.meals.map(meal => (
                  <div key={meal.id} className="border-t pt-2 mt-2">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="font-medium">{meal.food?.name}</div>
                        <div className="text-sm text-gray-600">
                          {meal.amount_grams}g • {Math.round((meal.food?.calories_per_100g || 0) * meal.amount_grams / 100)} cal
                        </div>
                      </div>
                      <button
                        onClick={() => deleteMeal(meal.id!)}
                        className="text-red-500 hover:text-red-700 ml-2"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
                <button
                  onClick={() => navigate(`/add-food?meal=${group.type}`)}
                  className="w-full text-left text-gray-500 hover:text-blue-600 py-2 mt-2 border-t"
                >
                  + Add more
                </button>
              </>
            )}
          </div>
        ))}

        {/* Notes Section */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <h3 className="font-semibold mb-2">Notes</h3>
          <textarea
            className="w-full p-2 border rounded-lg resize-none"
            rows={3}
            placeholder="Add notes about your day..."
            value={nutritionLog?.notes || ''}
            onChange={(e) => {
              // TODO: Update notes in database
              console.log('Update notes:', e.target.value);
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default FoodDiaryPage;