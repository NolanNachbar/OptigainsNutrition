import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { format, addDays, subDays, isToday } from 'date-fns';
import { Meal, NutritionLog, MealType, UserNutritionProfile } from '../utils/types';
import Actionbar from '../components/Actionbar';
import { getMealsByDate, deleteMeal, getNutritionLog, getUserProfile, copyMealsFromDate, createOrUpdateNutritionLog, createMeal } from '../utils/database';
import { formatWeight } from '../utils/unitConversions';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
// Using SVG icons instead of lucide-react for now

interface MealGroup {
  type: MealType;
  meals: Meal[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
}

interface MacroBarProps {
  label: string;
  current: number;
  target: number;
  unit?: string;
  color: string;
  percentage?: boolean;
}

const FoodDiaryPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [meals, setMeals] = useState<Meal[]>([]);
  const [nutritionLog, setNutritionLog] = useState<NutritionLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserNutritionProfile | null>(null);
  
  const foodUnit = userProfile?.food_weight_unit || 'metric';
  const [expandedMeals, setExpandedMeals] = useState<Set<string>>(new Set());
  const [editingMealName, setEditingMealName] = useState<string | null>(null);
  const [customMealNames, setCustomMealNames] = useState<{[key: string]: string}>({});
  
  const MacroBar: React.FC<MacroBarProps> = ({ label, current, target, unit = 'g', color, percentage = true }) => {
    const percent = target > 0 ? (current / target) * 100 : 0;
    const isOver = percent > 100;
    
    return (
      <div className="space-y-1">
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">{label}</span>
          <span className={`font-medium ${isOver ? 'text-red-400' : ''}`}>
            {current}{unit} / {target}{unit}
          </span>
        </div>
        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-300 ${isOver ? 'bg-red-500' : ''}`}
            style={{ 
              width: `${Math.min(percent, 100)}%`,
              backgroundColor: isOver ? undefined : color 
            }}
          />
        </div>
        {percentage && (
          <div className="text-right text-xs text-gray-500">
            {Math.round(percent)}%
          </div>
        )}
      </div>
    );
  };

  useEffect(() => {
    if (user) {
      fetchMeals();
      fetchUserProfile();
      loadCustomMealNames();
    }
  }, [user, selectedDate]);

  const loadCustomMealNames = () => {
    const saved = localStorage.getItem('customMealNames');
    if (saved) {
      setCustomMealNames(JSON.parse(saved));
    }
  };

  const saveMealName = (mealType: string, newName: string) => {
    const updated = { ...customMealNames, [mealType]: newName };
    setCustomMealNames(updated);
    localStorage.setItem('customMealNames', JSON.stringify(updated));
    setEditingMealName(null);
  };

  const getMealDisplayName = (mealType: string) => {
    return customMealNames[mealType] || mealType.charAt(0).toUpperCase() + mealType.slice(1);
  };
  
  const fetchUserProfile = async () => {
    if (!user) return;
    const profile = await getUserProfile(user.id);
    if (profile) {
      setUserProfile(profile);
    }
  };

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
          fat: 0,
          fiber: 0
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

  const toggleMealExpanded = (mealType: MealType) => {
    setExpandedMeals(prev => {
      const newSet = new Set(prev);
      if (newSet.has(mealType)) {
        newSet.delete(mealType);
      } else {
        newSet.add(mealType);
      }
      return newSet;
    });
  };

  const handleEditMeal = (meal: Meal) => {
    // Navigate to edit page with meal data
    navigate(`/add-food?edit=${meal.id}&meal=${meal.meal_type}`);
  };

  const handleCopyMeal = async (meal: Meal) => {
    if (!user) return;
    try {
      await createMeal({
        ...meal,
        id: undefined,
        logged_at: new Date().toISOString()
      });
      await fetchMeals();
    } catch (error) {
      console.error('Error copying meal:', error);
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
      
      <div className="w-full pt-20 pb-20">
        <div className="max-w-4xl mx-auto px-4">
          {/* Date Navigation */}
          <Card className="mb-6 p-0 overflow-hidden">
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-800 to-gray-750">
              <button
                onClick={() => handleDateChange('prev')}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="text-center">
                <div className="font-semibold text-lg">{format(selectedDate, 'EEEE')}</div>
                <div className="text-sm text-gray-400">{format(selectedDate, 'MMMM d, yyyy')}</div>
                {isToday(selectedDate) && (
                  <div className="text-xs text-blue-400 mt-1">Today</div>
                )}
              </div>
              <button
                onClick={() => handleDateChange('next')}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                disabled={selectedDate >= new Date()}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </Card>

          {/* Macro Summary */}
          {userProfile && (
            <Card className="mb-6">
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-center mb-2">
                  <h2 className="text-lg font-semibold">Today's Progress</h2>
                  <div className="text-2xl font-bold text-blue-400">
                    {Math.round(nutritionLog?.calories || 0)} cal
                  </div>
                </div>
                
                <MacroBar 
                  label="Calories"
                  current={Math.round(nutritionLog?.calories || 0)}
                  target={userProfile.target_macros.calories}
                  unit=""
                  color="#3B82F6"
                />
                
                <div className="grid grid-cols-3 gap-4 mt-4">
                  <MacroBar 
                    label="Protein"
                    current={Math.round(nutritionLog?.protein || 0)}
                    target={userProfile.target_macros.protein}
                    color="#EF4444"
                  />
                  <MacroBar 
                    label="Carbs"
                    current={Math.round(nutritionLog?.carbs || 0)}
                    target={userProfile.target_macros.carbs}
                    color="#10B981"
                  />
                  <MacroBar 
                    label="Fat"
                    current={Math.round(nutritionLog?.fat || 0)}
                    target={userProfile.target_macros.fat}
                    color="#F59E0B"
                  />
                </div>
              </div>
            </Card>
          )}

          {/* Quick Actions */}
          <div className="flex gap-3 mb-6">
            <Button
              onClick={() => navigate('/add-food')}
              className="flex-1 flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Food
            </Button>
            <Button
              onClick={handleCopyPreviousDay}
              variant="secondary"
              className="flex items-center gap-2"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy Yesterday
            </Button>
          </div>

          {/* Meals by Type */}
          {mealGroups.map(group => (
            <Card key={group.type} className="mb-4">
              <div className="p-4">
                <div 
                  className="flex justify-between items-center mb-3 cursor-pointer"
                  onClick={() => toggleMealExpanded(group.type)}
                >
                  <div className="flex items-center gap-2">
                    {editingMealName === group.type ? (
                      <input
                        type="text"
                        defaultValue={getMealDisplayName(group.type)}
                        onBlur={(e) => saveMealName(group.type, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            saveMealName(group.type, e.currentTarget.value);
                          }
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="text-lg font-semibold bg-gray-700 border border-gray-600 rounded px-2 py-1"
                        autoFocus
                      />
                    ) : (
                      <h3 
                        className="font-semibold text-lg cursor-pointer hover:text-blue-400"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingMealName(group.type);
                        }}
                      >
                        {getMealDisplayName(group.type)}
                      </h3>
                    )}
                    <div className="text-sm text-gray-400">
                      ({group.meals.length} {group.meals.length === 1 ? 'item' : 'items'})
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {group.totalCalories > 0 && (
                      <div className="text-sm font-medium">
                        {group.totalCalories} cal
                      </div>
                    )}
                    <svg 
                      className={`w-5 h-5 transition-transform ${expandedMeals.has(group.type) ? 'rotate-90' : ''}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
                
                {expandedMeals.has(group.type) && (
                  <div className="space-y-2">
                    {group.meals.length === 0 ? (
                      <Button
                        onClick={() => navigate(`/add-food?meal=${group.type}`)}
                        variant="ghost"
                        className="w-full justify-start"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add {group.type}
                      </Button>
                    ) : (
                      <>
                        {group.meals.map(meal => (
                          <div 
                            key={meal.id} 
                            className="p-3 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition-colors group"
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="font-medium">{meal.food?.name}</div>
                                <div className="text-sm text-gray-400 mt-1">
                                  {formatWeight(meal.amount_grams, foodUnit)} • 
                                  {Math.round((meal.food?.calories_per_100g || 0) * meal.amount_grams / 100)} cal • 
                                  {Math.round((meal.food?.protein_per_100g || 0) * meal.amount_grams / 100)}g protein
                                </div>
                              </div>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditMeal(meal);
                                  }}
                                  className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                                  title="Edit"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01" />
                                  </svg>
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCopyMeal(meal);
                                  }}
                                  className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                                  title="Copy"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteMeal(meal.id!);
                                  }}
                                  className="p-2 hover:bg-red-900/50 rounded-lg transition-colors text-red-400"
                                  title="Delete"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                        <Button
                          onClick={() => navigate(`/add-food?meal=${group.type}`)}
                          variant="ghost"
                          className="w-full justify-start mt-2"
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          Add more
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </Card>
          ))}

          {/* Notes Section */}
          <Card className="mb-6">
            <div className="p-4">
              <h3 className="font-semibold mb-3">Daily Notes</h3>
              <textarea
                className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg resize-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                rows={3}
                placeholder="Track your hunger, energy levels, or any notes about today..."
                value={nutritionLog?.notes || ''}
                onChange={async (e) => {
                  const newNotes = e.target.value;
                  if (nutritionLog) {
                    await createOrUpdateNutritionLog({
                      ...nutritionLog,
                      notes: newNotes
                    });
                    setNutritionLog({ ...nutritionLog, notes: newNotes });
                  }
                }}
              />
            </div>
          </Card>
          
          {/* Nutrition Timeline */}
          <Card>
            <div className="p-4">
              <h3 className="font-semibold mb-3">Today's Timeline</h3>
              <div className="text-sm text-gray-400">
                {meals.length === 0 ? (
                  <p>No meals logged yet</p>
                ) : (
                  <div className="space-y-2">
                    {meals
                      .sort((a, b) => new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime())
                      .map(meal => (
                        <div key={meal.id} className="flex items-center gap-3">
                          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="font-medium">{format(new Date(meal.logged_at), 'h:mm a')}</span>
                          <span className="text-gray-400">-</span>
                          <span>{meal.food?.name}</span>
                          <span className="text-gray-500">({meal.meal_type})</span>
                        </div>
                      ))
                    }
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default FoodDiaryPage;