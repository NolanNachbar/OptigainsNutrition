import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { Food, MealType } from '../utils/types';
import Actionbar from '../components/Actionbar';
import BarcodeScanner from '../components/BarcodeScanner';
import { searchFoods as searchDBFoods, createFood, getQuickAddFoods, createMeal as addMeal } from '../utils/database';
import { searchFoods, searchFoodByBarcode } from '../utils/foodSearchAPI';
import { format } from 'date-fns';

const AddFoodPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const [searchParams] = useSearchParams();
  const mealType = (searchParams.get('meal') as MealType) || 'snack';
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Food[]>([]);
  const [recentFoods, setRecentFoods] = useState<Food[]>([]);
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [amount, setAmount] = useState('100');
  const [isCreatingFood, setIsCreatingFood] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);

  // New food form state
  const [newFood, setNewFood] = useState<Partial<Food>>({
    name: '',
    brand: '',
    serving_size: 100,
    calories_per_100g: 0,
    protein_per_100g: 0,
    carbs_per_100g: 0,
    fat_per_100g: 0,
    fiber_per_100g: 0
  });

  useEffect(() => {
    fetchRecentFoods();
  }, [user]);

  const fetchRecentFoods = async () => {
    if (!user) return;
    
    try {
      const quickAddFoods = await getQuickAddFoods(user.id, 10);
      const foods = quickAddFoods
        .filter(item => item.food)
        .map(item => item.food as Food);
      setRecentFoods(foods);
    } catch (error) {
      console.error('Error fetching recent foods:', error);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim() || !user) return;
    
    setLoading(true);
    try {
      // Search in database first
      const dbResults = await searchDBFoods(searchQuery, user.id);
      
      // If not enough results, search external APIs
      if (dbResults.length < 5) {
        const apiResults = await searchFoods(searchQuery, { limit: 20 });
        
        // Combine results, database foods first
        const combined = [...dbResults];
        apiResults.forEach(food => {
          if (!combined.some(f => f.name === food.name && f.brand === food.brand)) {
            combined.push(food);
          }
        });
        
        setSearchResults(combined.slice(0, 20));
      } else {
        setSearchResults(dbResults);
      }
    } catch (error) {
      console.error('Error searching foods:', error);
      alert('Failed to search foods. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const calculateNutrition = (food: Food, grams: number) => {
    const multiplier = grams / 100;
    return {
      calories: Math.round(food.calories_per_100g * multiplier),
      protein: Math.round(food.protein_per_100g * multiplier * 10) / 10,
      carbs: Math.round(food.carbs_per_100g * multiplier * 10) / 10,
      fat: Math.round(food.fat_per_100g * multiplier * 10) / 10,
      fiber: Math.round((food.fiber_per_100g || 0) * multiplier * 10) / 10
    };
  };

  const handleAddFood = async () => {
    if (!selectedFood || !user) return;
    
    try {
      const meal = {
        clerk_user_id: user.id,
        food_id: selectedFood.id!,
        amount_grams: parseFloat(amount),
        meal_type: mealType,
        logged_at: format(new Date(), "yyyy-MM-dd'T'HH:mm:ss")
      };
      
      const success = await addMeal(meal);
      if (success) {
        navigate('/diary');
      } else {
        alert('Failed to add food. Please try again.');
      }
    } catch (error) {
      console.error('Error adding food:', error);
      alert('Failed to add food. Please try again.');
    }
  };

  const handleCreateFood = async () => {
    if (!newFood.name || !user) return;
    
    try {
      const foodToCreate = {
        ...newFood,
        clerk_user_id: user.id,
        is_verified: false
      } as Omit<Food, 'id' | 'created_at'>;
      
      const createdFood = await createFood(foodToCreate);
      if (createdFood) {
        // Automatically add the created food
        setSelectedFood(createdFood);
        setIsCreatingFood(false);
      } else {
        alert('Failed to create food. Please try again.');
      }
    } catch (error) {
      console.error('Error creating food:', error);
      alert('Failed to create food. Please try again.');
    }
  };

  const handleBarcodeScanner = () => {
    setShowBarcodeScanner(true);
  };

  const handleBarcodeResult = async (barcode: string) => {
    setShowBarcodeScanner(false);
    setLoading(true);
    
    try {
      const food = await searchFoodByBarcode(barcode);
      if (food) {
        setSelectedFood(food);
        // Show success message in a more subtle way
        const message = document.createElement('div');
        message.className = 'fixed top-20 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-4 py-2 rounded-lg z-50';
        message.textContent = `Found: ${food.name}`;
        document.body.appendChild(message);
        setTimeout(() => message.remove(), 3000);
      } else {
        alert('Product not found. Try searching by name or create a custom food.');
      }
    } catch (error) {
      console.error('Error processing barcode:', error);
      alert('Failed to process barcode. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (isCreatingFood) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Actionbar />
        
        <div className="w-full pt-24 pb-20">
          <div className="max-w-4xl mx-auto px-4">
            <h1 className="text-2xl font-bold mb-6">Create New Food</h1>
            <div className="max-w-2xl mx-auto">
              <div className="bg-gray-800 rounded-lg shadow-md p-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Food Name *</label>
                <input
                  type="text"
                  value={newFood.name}
                  onChange={(e) => setNewFood({ ...newFood, name: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                  placeholder="e.g., Chicken Breast"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Brand</label>
                <input
                  type="text"
                  value={newFood.brand}
                  onChange={(e) => setNewFood({ ...newFood, brand: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                  placeholder="e.g., Tyson"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Serving Size (g)</label>
                  <input
                    type="number"
                    value={newFood.serving_size}
                    onChange={(e) => setNewFood({ ...newFood, serving_size: parseFloat(e.target.value) })}
                    className="w-full p-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Calories</label>
                  <input
                    type="number"
                    value={newFood.calories_per_100g}
                    onChange={(e) => setNewFood({ ...newFood, calories_per_100g: parseFloat(e.target.value) })}
                    className="w-full p-2 border rounded-lg"
                    placeholder="per 100g"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Protein (g)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newFood.protein_per_100g}
                    onChange={(e) => setNewFood({ ...newFood, protein_per_100g: parseFloat(e.target.value) })}
                    className="w-full p-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Carbs (g)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newFood.carbs_per_100g}
                    onChange={(e) => setNewFood({ ...newFood, carbs_per_100g: parseFloat(e.target.value) })}
                    className="w-full p-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Fat (g)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newFood.fat_per_100g}
                    onChange={(e) => setNewFood({ ...newFood, fat_per_100g: parseFloat(e.target.value) })}
                    className="w-full p-2 border rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Fiber (g)</label>
                <input
                  type="number"
                  step="0.1"
                  value={newFood.fiber_per_100g}
                  onChange={(e) => setNewFood({ ...newFood, fiber_per_100g: parseFloat(e.target.value) })}
                  className="w-full p-2 border rounded-lg"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={handleCreateFood}
                disabled={!newFood.name}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-300"
              >
                Create Food
              </button>
              <button
                onClick={() => setIsCreatingFood(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-900"
              >
                Cancel
              </button>
            </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <Actionbar />
      
      <div className="w-full pt-24 pb-20">
        <div className="max-w-4xl mx-auto px-4">
          <h1 className="text-2xl font-bold mb-6">Add Food to {mealType}</h1>
          <div className="max-w-2xl mx-auto">
            {/* Search Bar */}
            <div className="bg-gray-800 rounded-lg shadow-md p-4 mb-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search foods..."
              className="flex-1 p-2 border rounded-lg"
              disabled={loading}
            />
            <button
              onClick={handleSearch}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Search
            </button>
          </div>
          
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleBarcodeScanner}
              className="flex-1 text-sm bg-gray-750 py-2 rounded-lg hover:bg-gray-700 flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Scan Barcode
            </button>
            <button
              onClick={() => setIsCreatingFood(true)}
              className="flex-1 text-sm bg-gray-750 py-2 rounded-lg hover:bg-gray-700"
            >
              Create Food
            </button>
          </div>
        </div>

        {/* Selected Food */}
        {selectedFood && (
          <div className="bg-gray-900 rounded-lg shadow-md p-4 mb-4">
            <h3 className="font-semibold mb-2">{selectedFood.name}</h3>
            <div className="flex gap-4 mb-3">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-24 p-2 border rounded-lg"
              />
              <span className="py-2">grams</span>
            </div>
            
            <div className="grid grid-cols-4 gap-2 text-sm">
              {(() => {
                const nutrition = calculateNutrition(selectedFood, parseFloat(amount) || 0);
                return (
                  <>
                    <div className="text-center">
                      <div className="font-semibold">{nutrition.calories}</div>
                      <div className="text-gray-400">Cal</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold">{nutrition.protein}g</div>
                      <div className="text-gray-400">Protein</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold">{nutrition.carbs}g</div>
                      <div className="text-gray-400">Carbs</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold">{nutrition.fat}g</div>
                      <div className="text-gray-400">Fat</div>
                    </div>
                  </>
                );
              })()}
            </div>
            
            <button
              onClick={handleAddFood}
              className="w-full mt-4 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
            >
              Add to {mealType}
            </button>
          </div>
        )}

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="bg-gray-800 rounded-lg shadow-md p-4 mb-4">
            <h3 className="font-semibold mb-3">Search Results</h3>
            {searchResults.map(food => (
              <button
                key={food.id}
                onClick={() => setSelectedFood(food)}
                className="w-full text-left p-3 hover:bg-gray-900 border-b last:border-b-0"
              >
                <div className="font-medium">{food.name}</div>
                <div className="text-sm text-gray-400">
                  {food.brand} • {food.calories_per_100g} cal per 100g
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Recent Foods */}
        <div className="bg-gray-800 rounded-lg shadow-md p-4">
          <h3 className="font-semibold mb-3">Recent Foods</h3>
          {recentFoods.map(food => (
            <button
              key={food.id}
              onClick={() => setSelectedFood(food)}
              className="w-full text-left p-3 hover:bg-gray-50 border-b last:border-b-0"
            >
              <div className="font-medium">{food.name}</div>
              <div className="text-sm text-gray-600">
                {food.brand} • {food.calories_per_100g} cal per 100g
              </div>
            </button>
          ))}
            </div>
          </div>
        </div>
      </div>

      {/* Barcode Scanner Modal */}
      {showBarcodeScanner && (
        <BarcodeScanner
          onResult={handleBarcodeResult}
          onClose={() => setShowBarcodeScanner(false)}
        />
      )}
    </div>
  );
};

export default AddFoodPage;