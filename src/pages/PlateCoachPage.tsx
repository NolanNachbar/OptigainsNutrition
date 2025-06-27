import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import Actionbar from '../components/Actionbar';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { getUserProfile } from '../utils/database';
import { UserNutritionProfile, GoalType } from '../utils/types';

interface PlateGuide {
  protein: number; // percentage of plate
  vegetables: number;
  carbs: number;
  fats: number;
  title: string;
  description: string;
  examples: {
    protein: string[];
    vegetables: string[];
    carbs: string[];
    fats: string[];
  };
}

const PlateCoachPage: React.FC = () => {
  const { user } = useUser();
  const [userProfile, setUserProfile] = useState<UserNutritionProfile | null>(null);
  const [selectedMeal, setSelectedMeal] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('lunch');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchUserProfile();
    }
  }, [user]);

  const fetchUserProfile = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const profile = await getUserProfile(user.id);
      setUserProfile(profile);
    } catch (error) {
      console.error('Error fetching user profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPlateGuide = (goal: GoalType, meal: string): PlateGuide => {
    const guides: { [key: string]: { [meal: string]: PlateGuide } } = {
      'fat_loss': {
        breakfast: {
          protein: 30,
          vegetables: 20,
          carbs: 25,
          fats: 25,
          title: 'Fat Loss Breakfast',
          description: 'Higher protein and moderate carbs to keep you satisfied and energized.',
          examples: {
            protein: ['Greek yogurt', 'Eggs', 'Protein powder', 'Cottage cheese'],
            vegetables: ['Spinach', 'Berries', 'Tomatoes', 'Bell peppers'],
            carbs: ['Oats', 'Whole grain toast', 'Banana', 'Sweet potato'],
            fats: ['Nuts', 'Avocado', 'Olive oil', 'Nut butter']
          }
        },
        lunch: {
          protein: 35,
          vegetables: 40,
          carbs: 15,
          fats: 10,
          title: 'Fat Loss Lunch',
          description: 'Prioritize protein and vegetables with minimal carbs to support fat loss.',
          examples: {
            protein: ['Chicken breast', 'Fish', 'Tofu', 'Lean beef', 'Turkey'],
            vegetables: ['Broccoli', 'Cauliflower', 'Zucchini', 'Asparagus', 'Green beans'],
            carbs: ['Quinoa', 'Brown rice', 'Sweet potato'],
            fats: ['Olive oil', 'Nuts', 'Seeds']
          }
        },
        dinner: {
          protein: 40,
          vegetables: 45,
          carbs: 10,
          fats: 5,
          title: 'Fat Loss Dinner',
          description: 'Lighter on carbs and fats, heavy on protein and vegetables.',
          examples: {
            protein: ['Salmon', 'Chicken', 'Lean beef', 'White fish', 'Shrimp'],
            vegetables: ['Brussels sprouts', 'Spinach', 'Kale', 'Cucumber', 'Lettuce'],
            carbs: ['Small portion of rice', 'Quinoa'],
            fats: ['Cooking oil', 'Small amount of nuts']
          }
        },
        snack: {
          protein: 50,
          vegetables: 30,
          carbs: 10,
          fats: 10,
          title: 'Fat Loss Snack',
          description: 'Protein-focused snacks to maintain satiety between meals.',
          examples: {
            protein: ['Protein shake', 'Hard-boiled eggs', 'Greek yogurt'],
            vegetables: ['Cucumber', 'Celery', 'Cherry tomatoes'],
            carbs: ['Apple slices', 'Berries'],
            fats: ['Small amount of almonds']
          }
        }
      },
      'muscle_gain': {
        breakfast: {
          protein: 25,
          vegetables: 15,
          carbs: 40,
          fats: 20,
          title: 'Muscle Gain Breakfast',
          description: 'Higher carbs and adequate protein to fuel your workouts and recovery.',
          examples: {
            protein: ['Eggs', 'Greek yogurt', 'Protein powder', 'Turkey sausage'],
            vegetables: ['Spinach', 'Mushrooms', 'Onions'],
            carbs: ['Oats', 'Whole grain toast', 'Banana', 'Pancakes'],
            fats: ['Nuts', 'Nut butter', 'Avocado', 'Olive oil']
          }
        },
        lunch: {
          protein: 30,
          vegetables: 25,
          carbs: 30,
          fats: 15,
          title: 'Muscle Gain Lunch',
          description: 'Balanced macros with substantial carbs for energy and protein for muscle synthesis.',
          examples: {
            protein: ['Chicken', 'Beef', 'Fish', 'Turkey', 'Beans'],
            vegetables: ['Broccoli', 'Carrots', 'Bell peppers', 'Spinach'],
            carbs: ['Rice', 'Pasta', 'Quinoa', 'Potatoes', 'Bread'],
            fats: ['Olive oil', 'Nuts', 'Cheese']
          }
        },
        dinner: {
          protein: 35,
          vegetables: 25,
          carbs: 25,
          fats: 15,
          title: 'Muscle Gain Dinner',
          description: 'Protein-rich dinner with moderate carbs for recovery and growth.',
          examples: {
            protein: ['Steak', 'Salmon', 'Chicken thighs', 'Ground turkey'],
            vegetables: ['Asparagus', 'Brussels sprouts', 'Green beans'],
            carbs: ['Sweet potato', 'Rice', 'Pasta'],
            fats: ['Butter', 'Olive oil', 'Nuts']
          }
        },
        snack: {
          protein: 40,
          vegetables: 10,
          carbs: 35,
          fats: 15,
          title: 'Muscle Gain Snack',
          description: 'Energy-dense snacks with protein for muscle building.',
          examples: {
            protein: ['Protein shake', 'Cottage cheese', 'Tuna'],
            vegetables: ['Carrot sticks'],
            carbs: ['Crackers', 'Fruit', 'Granola'],
            fats: ['Nuts', 'Nut butter', 'Seeds']
          }
        }
      },
      'maintenance': {
        breakfast: {
          protein: 25,
          vegetables: 20,
          carbs: 35,
          fats: 20,
          title: 'Maintenance Breakfast',
          description: 'Balanced nutrition to maintain your current weight and energy levels.',
          examples: {
            protein: ['Eggs', 'Greek yogurt', 'Protein smoothie'],
            vegetables: ['Spinach', 'Berries', 'Tomatoes'],
            carbs: ['Oats', 'Toast', 'Fruit'],
            fats: ['Nuts', 'Avocado', 'Seeds']
          }
        },
        lunch: {
          protein: 30,
          vegetables: 30,
          carbs: 25,
          fats: 15,
          title: 'Maintenance Lunch',
          description: 'Well-balanced meal with equal emphasis on all macronutrients.',
          examples: {
            protein: ['Chicken', 'Fish', 'Tofu', 'Beans'],
            vegetables: ['Mixed salad', 'Roasted vegetables', 'Soup'],
            carbs: ['Rice', 'Quinoa', 'Bread', 'Pasta'],
            fats: ['Olive oil', 'Nuts', 'Cheese']
          }
        },
        dinner: {
          protein: 30,
          vegetables: 35,
          carbs: 20,
          fats: 15,
          title: 'Maintenance Dinner',
          description: 'Lighter dinner with plenty of vegetables and adequate protein.',
          examples: {
            protein: ['Salmon', 'Chicken', 'Lean beef', 'Lentils'],
            vegetables: ['Steamed broccoli', 'Roasted vegetables', 'Salad'],
            carbs: ['Small portion of rice', 'Quinoa', 'Sweet potato'],
            fats: ['Cooking oil', 'Nuts', 'Seeds']
          }
        },
        snack: {
          protein: 35,
          vegetables: 25,
          carbs: 25,
          fats: 15,
          title: 'Maintenance Snack',
          description: 'Balanced snacks to bridge meals without excess calories.',
          examples: {
            protein: ['Greek yogurt', 'Protein bar', 'Hummus'],
            vegetables: ['Vegetables and dip', 'Salad'],
            carbs: ['Fruit', 'Crackers', 'Rice cakes'],
            fats: ['Nuts', 'Seeds', 'Avocado']
          }
        }
      }
    };

    const goalKey = goal || 'maintenance';
    return guides[goalKey]?.[meal] || guides['maintenance'][meal];
  };

  const PlateVisualization: React.FC<{ guide: PlateGuide }> = ({ guide }) => {
    return (
      <div className="relative">
        {/* Plate Circle */}
        <div className="w-80 h-80 mx-auto relative">
          <svg viewBox="0 0 200 200" className="w-full h-full">
            {/* Plate border */}
            <circle
              cx="100"
              cy="100"
              r="95"
              fill="none"
              stroke="#4B5563"
              strokeWidth="2"
            />
            
            {/* Protein section */}
            <path
              d={`M 100 100 L 100 5 A 95 95 0 ${guide.protein > 50 ? 1 : 0} 1 ${
                100 + 95 * Math.sin((guide.protein / 100) * 2 * Math.PI)
              } ${
                100 - 95 * Math.cos((guide.protein / 100) * 2 * Math.PI)
              } Z`}
              fill="#EF4444"
              fillOpacity="0.7"
            />
            
            {/* Vegetables section */}
            <path
              d={`M 100 100 L ${
                100 + 95 * Math.sin((guide.protein / 100) * 2 * Math.PI)
              } ${
                100 - 95 * Math.cos((guide.protein / 100) * 2 * Math.PI)
              } A 95 95 0 ${guide.vegetables > 50 ? 1 : 0} 1 ${
                100 + 95 * Math.sin(((guide.protein + guide.vegetables) / 100) * 2 * Math.PI)
              } ${
                100 - 95 * Math.cos(((guide.protein + guide.vegetables) / 100) * 2 * Math.PI)
              } Z`}
              fill="#10B981"
              fillOpacity="0.7"
            />
            
            {/* Carbs section */}
            <path
              d={`M 100 100 L ${
                100 + 95 * Math.sin(((guide.protein + guide.vegetables) / 100) * 2 * Math.PI)
              } ${
                100 - 95 * Math.cos(((guide.protein + guide.vegetables) / 100) * 2 * Math.PI)
              } A 95 95 0 ${guide.carbs > 50 ? 1 : 0} 1 ${
                100 + 95 * Math.sin(((guide.protein + guide.vegetables + guide.carbs) / 100) * 2 * Math.PI)
              } ${
                100 - 95 * Math.cos(((guide.protein + guide.vegetables + guide.carbs) / 100) * 2 * Math.PI)
              } Z`}
              fill="#F59E0B"
              fillOpacity="0.7"
            />
            
            {/* Fats section */}
            <path
              d={`M 100 100 L ${
                100 + 95 * Math.sin(((guide.protein + guide.vegetables + guide.carbs) / 100) * 2 * Math.PI)
              } ${
                100 - 95 * Math.cos(((guide.protein + guide.vegetables + guide.carbs) / 100) * 2 * Math.PI)
              } A 95 95 0 ${guide.fats > 50 ? 1 : 0} 1 100 5 Z`}
              fill="#8B5CF6"
              fillOpacity="0.7"
            />
          </svg>
        </div>

        {/* Legend */}
        <div className="grid grid-cols-2 gap-4 mt-6">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 rounded"></div>
            <span className="text-sm">Protein ({guide.protein}%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span className="text-sm">Vegetables ({guide.vegetables}%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-500 rounded"></div>
            <span className="text-sm">Carbs ({guide.carbs}%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-purple-500 rounded"></div>
            <span className="text-sm">Fats ({guide.fats}%)</span>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Actionbar />
        <div className="pt-24 flex items-center justify-center min-h-screen">
          <div className="text-gray-400">Loading plate guide...</div>
        </div>
      </div>
    );
  }

  const currentGuide = getPlateGuide(userProfile?.goal_type || 'maintenance', selectedMeal);

  return (
    <div className="min-h-screen bg-gray-900">
      <Actionbar />
      
      <div className="w-full pt-20 pb-20">
        <div className="max-w-6xl mx-auto px-4">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold tracking-tight">Plate Coach</h1>
            <p className="text-gray-400 mt-2">Visual portion guidance for optimal nutrition</p>
          </div>

          {/* Meal Selection */}
          <div className="flex gap-2 mb-8 justify-center">
            {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map((meal) => (
              <Button
                key={meal}
                variant={selectedMeal === meal ? 'primary' : 'secondary'}
                onClick={() => setSelectedMeal(meal)}
                className="capitalize"
              >
                {meal}
              </Button>
            ))}
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Plate Visualization */}
            <Card>
              <div className="p-8">
                <h2 className="text-xl font-semibold mb-2 text-center">{currentGuide.title}</h2>
                <p className="text-gray-400 mb-6 text-center">{currentGuide.description}</p>
                <PlateVisualization guide={currentGuide} />
              </div>
            </Card>

            {/* Food Examples */}
            <Card>
              <div className="p-8">
                <h2 className="text-xl font-semibold mb-6">Food Examples</h2>
                
                <div className="space-y-6">
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-4 h-4 bg-red-500 rounded"></div>
                      <h3 className="font-medium">Protein Sources</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {currentGuide.examples.protein.map((food, index) => (
                        <span key={index} className="px-3 py-1 bg-red-500/20 text-red-300 rounded-full text-sm">
                          {food}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-4 h-4 bg-green-500 rounded"></div>
                      <h3 className="font-medium">Vegetables & Fruits</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {currentGuide.examples.vegetables.map((food, index) => (
                        <span key={index} className="px-3 py-1 bg-green-500/20 text-green-300 rounded-full text-sm">
                          {food}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                      <h3 className="font-medium">Carbohydrates</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {currentGuide.examples.carbs.map((food, index) => (
                        <span key={index} className="px-3 py-1 bg-yellow-500/20 text-yellow-300 rounded-full text-sm">
                          {food}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-4 h-4 bg-purple-500 rounded"></div>
                      <h3 className="font-medium">Healthy Fats</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {currentGuide.examples.fats.map((food, index) => (
                        <span key={index} className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-sm">
                          {food}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Additional Tips */}
          <Card className="mt-8">
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">Portion Tips</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="text-3xl mb-2">✋</div>
                  <div className="font-medium">Protein</div>
                  <div className="text-sm text-gray-400">Palm-sized portion</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl mb-2">👊</div>
                  <div className="font-medium">Vegetables</div>
                  <div className="text-sm text-gray-400">1-2 fist-sized portions</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl mb-2">🥄</div>
                  <div className="font-medium">Carbs</div>
                  <div className="text-sm text-gray-400">Cupped hand portion</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl mb-2">👍</div>
                  <div className="font-medium">Fats</div>
                  <div className="text-sm text-gray-400">Thumb-sized portion</div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PlateCoachPage;