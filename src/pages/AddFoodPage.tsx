import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { Food, MealType } from '../utils/types';
import Actionbar from '../components/Actionbar';

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
    
    // TODO: Implement actual database fetching
    // Mock recent foods
    const mockRecent: Food[] = [
      {
        id: '1',
        name: 'Chicken Breast',
        brand: 'Generic',
        serving_size: 100,
        calories_per_100g: 165,
        protein_per_100g: 31,
        carbs_per_100g: 0,
        fat_per_100g: 3.6
      },
      {
        id: '2',
        name: 'Brown Rice',
        brand: 'Generic',
        serving_size: 100,
        calories_per_100g: 112,
        protein_per_100g: 2.6,
        carbs_per_100g: 23,
        fat_per_100g: 0.9
      },
      {
        id: '3',
        name: 'Banana',
        brand: 'Generic',
        serving_size: 118,
        serving_unit: 'medium',
        calories_per_100g: 89,
        protein_per_100g: 1.1,
        carbs_per_100g: 23,
        fat_per_100g: 0.3
      }
    ];
    
    setRecentFoods(mockRecent);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    // TODO: Implement actual food search
    // For now, filter mock data
    const results = recentFoods.filter(food =>
      food.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setSearchResults(results);
    setLoading(false);
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
    
    // TODO: Save to database
    console.log('Adding food:', {
      food: selectedFood,
      amount: parseFloat(amount),
      mealType
    });
    
    navigate('/diary');
  };

  const handleCreateFood = async () => {
    if (!newFood.name || !user) return;
    
    // TODO: Save new food to database
    console.log('Creating food:', newFood);
    
    setIsCreatingFood(false);
    navigate('/diary');
  };

  const handleBarcodeScanner = () => {
    // TODO: Implement barcode scanner
    alert('Barcode scanner not yet implemented');
  };

  if (isCreatingFood) {
    return (
      <div className="min-h-screen bg-gray-100">
        <Actionbar />
        
        <div className="container mx-auto px-4 py-6 max-w-md">
          <h1 className="text-2xl font-bold mb-6">Create New Food</h1>
          
          <div className="bg-white rounded-lg shadow-md p-6">
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
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Actionbar />
      
      <div className="container mx-auto px-4 py-6 max-w-md">
        <h1 className="text-2xl font-bold mb-6">Add Food to {mealType}</h1>
        
        {/* Search Bar */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search foods..."
              className="flex-1 p-2 border rounded-lg"
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
              className="flex-1 text-sm bg-gray-100 py-2 rounded-lg hover:bg-gray-200"
            >
              📷 Scan Barcode
            </button>
            <button
              onClick={() => setIsCreatingFood(true)}
              className="flex-1 text-sm bg-gray-100 py-2 rounded-lg hover:bg-gray-200"
            >
              ➕ Create Food
            </button>
          </div>
        </div>

        {/* Selected Food */}
        {selectedFood && (
          <div className="bg-blue-50 rounded-lg shadow-md p-4 mb-4">
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
                      <div className="text-gray-600">Cal</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold">{nutrition.protein}g</div>
                      <div className="text-gray-600">Protein</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold">{nutrition.carbs}g</div>
                      <div className="text-gray-600">Carbs</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold">{nutrition.fat}g</div>
                      <div className="text-gray-600">Fat</div>
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
          <div className="bg-white rounded-lg shadow-md p-4 mb-4">
            <h3 className="font-semibold mb-3">Search Results</h3>
            {searchResults.map(food => (
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
        )}

        {/* Recent Foods */}
        <div className="bg-white rounded-lg shadow-md p-4">
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
  );
};

export default AddFoodPage;