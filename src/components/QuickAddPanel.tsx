import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { theme } from '../styles/theme';
import { getRecentFoods, getFavoriteFoods, quickAddMeal } from '../utils/database';
import { Food, MealType } from '../utils/types';

interface QuickAddFoodExtended extends Food {
  lastAmount?: number;
  frequency?: number;
  isFavorite?: boolean;
}

export const QuickAddPanel: React.FC = React.memo(() => {
  const navigate = useNavigate();
  const { user } = useUser();
  const [recentFoods, setRecentFoods] = useState<QuickAddFoodExtended[]>([]);
  const [favoriteFoods, setFavoriteFoods] = useState<QuickAddFoodExtended[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingFood, setAddingFood] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadQuickAddFoods();
    }
  }, [user]);

  const loadQuickAddFoods = async () => {
    if (!user) return;
    
    try {
      const [recent, favorites] = await Promise.all([
        getRecentFoods(user.id, 8),
        getFavoriteFoods(user.id)
      ]);
      
      // Map the returned Food[] to QuickAddFoodExtended[]
      const recentWithExtras: QuickAddFoodExtended[] = recent.map(food => ({
        ...food,
        lastAmount: 100, // Default amount
        frequency: 0,
        isFavorite: false
      }));
      
      const favoritesWithExtras: QuickAddFoodExtended[] = favorites
        .filter(fav => fav.food) // Ensure food exists
        .map(fav => ({
          ...fav.food!,
          lastAmount: 100, // Default amount
          frequency: fav.frequency || 0,
          isFavorite: true
        }));
      
      setRecentFoods(recentWithExtras);
      setFavoriteFoods(favoritesWithExtras);
    } catch (error) {
      console.error('Error loading quick add foods:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMealType = (): MealType => {
    const hour = new Date().getHours();
    if (hour < 11) return 'breakfast';
    if (hour < 15) return 'lunch';
    if (hour < 20) return 'dinner';
    return 'snack';
  };

  const handleQuickAdd = async (food: QuickAddFoodExtended) => {
    if (!user || addingFood) return;
    
    if (!food.id) return;
    setAddingFood(food.id);
    
    try {
      const mealType = getMealType();
      const amount = food.lastAmount || 100;
      
      await quickAddMeal(user.id, {
        food_id: food.id,
        meal_type: mealType,
        amount_grams: amount,
        date: new Date().toISOString().split('T')[0]
      });
      
      // Show success feedback
      const button = document.getElementById(`quick-add-${food.id}`);
      if (button) {
        button.classList.add('success');
        setTimeout(() => button.classList.remove('success'), 1000);
      }
    } catch (error) {
      console.error('Error quick adding food:', error);
    } finally {
      setAddingFood(null);
    }
  };

  if (loading) return null;

  const displayFoods = favoriteFoods.length > 0 ? favoriteFoods : recentFoods;
  if (displayFoods.length === 0) return null;

  return (
    <>
      <style>
        {`
          .quick-add-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
            gap: ${theme.spacing[3]};
          }

          .quick-add-item {
            background: ${theme.colors.gray[800]};
            border: 1px solid ${theme.colors.gray[700]};
            border-radius: ${theme.borderRadius.lg};
            padding: ${theme.spacing[3]};
            cursor: pointer;
            transition: all ${theme.animation.duration.fast} ${theme.animation.easing.appleEase};
            user-select: none;
            -webkit-tap-highlight-color: transparent;
            position: relative;
            overflow: hidden;
            min-height: 80px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }

          .quick-add-item:hover {
            background: ${theme.colors.gray[700]};
            transform: translateY(-2px);
            box-shadow: ${theme.shadows.md};
          }

          .quick-add-item:active {
            transform: translateY(0);
          }

          .quick-add-item.loading {
            opacity: 0.6;
            pointer-events: none;
          }

          .quick-add-item.success {
            animation: quickAddSuccess 0.6s ${theme.animation.easing.appleEase};
          }

          @keyframes quickAddSuccess {
            0% { background: ${theme.colors.gray[800]}; }
            50% { background: ${theme.colors.green[900]}; transform: scale(0.98); }
            100% { background: ${theme.colors.gray[800]}; }
          }

          .quick-add-name {
            font-size: ${theme.typography.fontSize.sm};
            font-weight: ${theme.typography.fontWeight.medium};
            color: ${theme.colors.gray[100]};
            margin-bottom: ${theme.spacing[1]};
            overflow: hidden;
            text-overflow: ellipsis;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
          }

          .quick-add-info {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: ${theme.typography.fontSize.xs};
            color: ${theme.colors.gray[500]};
          }

          .quick-add-calories {
            font-weight: ${theme.typography.fontWeight.medium};
            color: ${theme.colors.gray[400]};
          }

          .quick-add-amount {
            color: ${theme.colors.gray[600]};
          }

          .favorite-badge {
            position: absolute;
            top: ${theme.spacing[2]};
            right: ${theme.spacing[2]};
            width: 16px;
            height: 16px;
            color: ${theme.colors.orange[500]};
          }

          @media (max-width: 640px) {
            .quick-add-grid {
              grid-template-columns: repeat(2, 1fr);
            }
          }
        `}
      </style>

      <Card variant="elevated" className="mb-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium">
            {favoriteFoods.length > 0 ? 'Favorite Foods' : 'Recent Foods'}
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/add-food')}
          >
            View All
          </Button>
        </div>

        <div className="quick-add-grid">
          {displayFoods.slice(0, 6).map((food) => (
            <button
              key={food.id}
              id={`quick-add-${food.id}`}
              className={`quick-add-item ${addingFood === food.id ? 'loading' : ''}`}
              onClick={() => handleQuickAdd(food)}
              disabled={addingFood !== null}
            >
              {food.isFavorite && (
                <svg className="favorite-badge" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              )}
              
              <div className="quick-add-name">{food.name}</div>
              
              <div className="quick-add-info">
                <span className="quick-add-calories">
                  {Math.round(food.calories_per_100g * (food.lastAmount || 100) / 100)} cal
                </span>
                <span className="quick-add-amount">
                  {food.lastAmount || 100}g
                </span>
              </div>

              {addingFood === food.id && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-700 border-t-blue-500"></div>
                </div>
              )}
            </button>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t border-gray-800">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Quick add to {getMealType()}
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/add-food?scan=true')}
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h2M8 20H6m-2-4v-2m0-2v-2m0-2V6m4-2h2M8 4H6" />
                </svg>
              }
            >
              Scan Barcode
            </Button>
          </div>
        </div>
      </Card>
    </>
  );
});