import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { format, addDays, subDays } from 'date-fns';
import { Meal, NutritionLog, MealType } from '../utils/types';
import Actionbar from '../components/Actionbar';
import { getMealsByDate, deleteMeal, getNutritionLog } from '../utils/database';
import { copyMealsFromDate } from '../utils/nutritionDatabase';

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
    
    setLoading(true);
    try {
      // Fetch meals for the selected date
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const fetchedMeals = await getMealsByDate(user.id, dateStr);
      setMeals(fetchedMeals);
      
      // Fetch nutrition log for the date
      const log = await getNutritionLog(user.id, dateStr);
      
      if (log) {
        setNutritionLog(log);
      } else if (fetchedMeals.length > 0) {
        // Calculate totals from meals if no log exists
        const totals = fetchedMeals.reduce((acc, meal) => {
          const multiplier = meal.amount_grams / 100;
          return {
            calories: acc.calories + (meal.food?.calories_per_100g || 0) * multiplier,
            protein: acc.protein + (meal.food?.protein_per_100g || 0) * multiplier,
            carbs: acc.carbs + (meal.food?.carbs_per_100g || 0) * multiplier,
            fat: acc.fat + (meal.food?.fat_per_100g || 0) * multiplier,
            fiber: acc.fiber + (meal.food?.fiber_per_100g || 0) * multiplier
          };
        }, { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });

        setNutritionLog({
          clerk_user_id: user.id,
          date: dateStr,
          calories: Math.round(totals.calories),
          protein: Math.round(totals.protein),
          carbs: Math.round(totals.carbs),
          fat: Math.round(totals.fat),
          fiber: Math.round(totals.fiber)
        });
      } else {
        // No meals, set empty nutrition log
        setNutritionLog({
          clerk_user_id: user.id,
          date: dateStr,
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0
        });
      }
    } catch (error) {
      console.error('Error fetching meals:', error);
    } finally {
      setLoading(false);
    }
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
    if (!user) return;
    
    const fromDate = format(subDays(selectedDate, 1), 'yyyy-MM-dd');
    const toDate = format(selectedDate, 'yyyy-MM-dd');
    
    try {
      const success = await copyMealsFromDate(user.id, fromDate, toDate);
      if (success) {
        // Refresh meals after copying
        await fetchMeals();
      } else {
        alert('No meals found on the previous day to copy.');
      }
    } catch (error) {
      console.error('Error copying meals:', error);
      alert('Failed to copy meals from previous day.');
    }
  };

  const handleDeleteMeal = async (mealId: string) => {
    if (confirm('Are you sure you want to delete this meal?')) {
      try {
        const success = await deleteMeal(mealId);
        if (success) {
          // Refresh meals after deletion
          await fetchMeals();
        }
      } catch (error) {
        console.error('Error deleting meal:', error);
        alert('Failed to delete meal.');
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Actionbar />
        <div className="pt-24 flex items-center justify-center min-h-screen">
          <div className="text-gray-400">Loading...</div>
        </div>
      </div>
    );
  }

  const mealGroups = groupMealsByType();

  return (
    <div className="min-h-screen bg-gray-900">
      <Actionbar />
      
      <div className="w-full pt-24 pb-20">
        <div className="max-w-4xl mx-auto px-4">
          <h1 className="text-2xl font-bold mb-6">Food Diary</h1>
          <div className="max-w-2xl mx-auto">
            {/* Date Navigation */}
            <div className="bg-gray-800 rounded-lg shadow-md p-4 mb-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => handleDateChange('prev')}
              className="p-2 hover:bg-gray-750 rounded"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="text-center">
              <div className="font-semibold">{format(selectedDate, 'EEEE')}</div>
              <div className="text-sm text-gray-400">{format(selectedDate, 'MMM d, yyyy')}</div>
            </div>
            <button
              onClick={() => handleDateChange('next')}
              className="p-2 hover:bg-gray-750 rounded"
              disabled={selectedDate >= new Date()}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Daily Summary */}
        <div className="bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Daily Summary</h2>
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {Math.round(nutritionLog?.calories || 0)}
              </div>
              <div className="text-xs text-gray-400">Calories</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">
                {Math.round(nutritionLog?.protein || 0)}g
              </div>
              <div className="text-xs text-gray-400">Protein</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {Math.round(nutritionLog?.carbs || 0)}g
              </div>
              <div className="text-xs text-gray-400">Carbs</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-600">
                {Math.round(nutritionLog?.fat || 0)}g
              </div>
              <div className="text-xs text-gray-400">Fat</div>
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
            className="bg-gray-700 text-gray-300 py-3 px-4 rounded-lg hover:bg-gray-600 transition-colors"
          >
            Copy Previous Day
          </button>
        </div>

        {/* Meals by Type */}
        {mealGroups.map(group => (
          <div key={group.type} className="bg-gray-800 rounded-lg shadow-md p-4 mb-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold capitalize">{group.type}</h3>
              {group.totalCalories > 0 && (
                <div className="text-sm text-gray-400">
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
                        <div className="text-sm text-gray-400">
                          {meal.amount_grams}g • {Math.round((meal.food?.calories_per_100g || 0) * meal.amount_grams / 100)} cal
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteMeal(meal.id!)}
                        className="text-red-500 hover:text-red-700 ml-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
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
        <div className="bg-gray-800 rounded-lg shadow-md p-4">
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
      </div>
    </div>
  );
};

export default FoodDiaryPage;