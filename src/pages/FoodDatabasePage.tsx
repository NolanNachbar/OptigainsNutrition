import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { Food, QuickAddFood } from '../utils/types';
import Actionbar from '../components/Actionbar';

type TabType = 'my-foods' | 'favorites' | 'recent';

const FoodDatabasePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState<TabType>('my-foods');
  const [myFoods, setMyFoods] = useState<Food[]>([]);
  const [favorites, setFavorites] = useState<QuickAddFood[]>([]);
  const [recentFoods, setRecentFoods] = useState<QuickAddFood[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFoods();
  }, [user]);

  const fetchFoods = async () => {
    if (!user) return;
    
    // TODO: Implement actual database fetching
    // Mock data
    const mockMyFoods: Food[] = [
      {
        id: '1',
        name: 'Homemade Protein Shake',
        brand: 'Custom',
        serving_size: 350,
        serving_unit: 'shake',
        calories_per_100g: 120,
        protein_per_100g: 20,
        carbs_per_100g: 8,
        fat_per_100g: 2,
        user_id: user.id
      },
      {
        id: '2',
        name: 'Overnight Oats',
        brand: 'Custom',
        serving_size: 250,
        serving_unit: 'bowl',
        calories_per_100g: 150,
        protein_per_100g: 8,
        carbs_per_100g: 25,
        fat_per_100g: 3,
        fiber_per_100g: 4,
        user_id: user.id
      }
    ];

    const mockFavorites: QuickAddFood[] = [
      {
        id: '1',
        user_id: user.id,
        food_id: '3',
        food: {
          id: '3',
          name: 'Chicken Breast',
          brand: 'Generic',
          serving_size: 100,
          calories_per_100g: 165,
          protein_per_100g: 31,
          carbs_per_100g: 0,
          fat_per_100g: 3.6
        },
        frequency: 15,
        last_used: '2024-06-20'
      }
    ];

    const mockRecent: QuickAddFood[] = [
      {
        id: '2',
        user_id: user.id,
        food_id: '4',
        food: {
          id: '4',
          name: 'Greek Yogurt',
          brand: 'Chobani',
          serving_size: 170,
          serving_unit: 'container',
          calories_per_100g: 100,
          protein_per_100g: 10,
          carbs_per_100g: 6,
          fat_per_100g: 4
        },
        frequency: 8,
        last_used: '2024-06-22'
      }
    ];
    
    setMyFoods(mockMyFoods);
    setFavorites(mockFavorites);
    setRecentFoods(mockRecent);
    setLoading(false);
  };

  const filteredFoods = () => {
    const query = searchQuery.toLowerCase();
    
    switch (activeTab) {
      case 'my-foods':
        return myFoods.filter(food => 
          food.name.toLowerCase().includes(query) ||
          food.brand?.toLowerCase().includes(query)
        );
      case 'favorites':
        return favorites.filter(fav => 
          fav.food?.name.toLowerCase().includes(query) ||
          fav.food?.brand?.toLowerCase().includes(query)
        );
      case 'recent':
        return recentFoods.filter(recent => 
          recent.food?.name.toLowerCase().includes(query) ||
          recent.food?.brand?.toLowerCase().includes(query)
        );
      default:
        return [];
    }
  };

  const handleDeleteFood = async (foodId: string) => {
    if (!confirm('Are you sure you want to delete this food?')) return;
    
    // TODO: Delete from database
    setMyFoods(myFoods.filter(food => food.id !== foodId));
  };

  const handleEditFood = (food: Food) => {
    setSelectedFood(food);
    setShowEditModal(true);
  };

  const handleSaveFood = async () => {
    if (!selectedFood) return;
    
    // TODO: Save to database
    setMyFoods(myFoods.map(food => 
      food.id === selectedFood.id ? selectedFood : food
    ));
    
    setShowEditModal(false);
    setSelectedFood(null);
  };

  const handleExportFoods = () => {
    const data = {
      myFoods,
      favorites: favorites.map(f => f.food),
      exportedAt: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'optigains-foods-export.json';
    a.click();
    URL.revokeObjectURL(url);
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

  return (
    <div className="min-h-screen bg-gray-100">
      <Actionbar />
      
      <div className="container mx-auto px-4 py-6 max-w-md">
        <h1 className="text-2xl font-bold mb-6">Food Database</h1>
        
        {/* Search Bar */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search foods..."
            className="w-full p-2 border rounded-lg"
          />
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-md mb-4">
          <div className="flex">
            <button
              onClick={() => setActiveTab('my-foods')}
              className={`flex-1 py-3 px-4 font-medium border-b-2 transition-colors ${
                activeTab === 'my-foods'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
            >
              My Foods
            </button>
            <button
              onClick={() => setActiveTab('favorites')}
              className={`flex-1 py-3 px-4 font-medium border-b-2 transition-colors ${
                activeTab === 'favorites'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
            >
              Favorites
            </button>
            <button
              onClick={() => setActiveTab('recent')}
              className={`flex-1 py-3 px-4 font-medium border-b-2 transition-colors ${
                activeTab === 'recent'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
            >
              Recent
            </button>
          </div>
        </div>

        {/* Foods List */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-4">
          {filteredFoods().length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              {searchQuery ? 'No foods found matching your search.' : 'No foods to display.'}
            </p>
          ) : (
            <div className="space-y-2">
              {activeTab === 'my-foods' && (
                <>
                  {(filteredFoods() as Food[]).map(food => (
                    <div key={food.id} className="border-b last:border-b-0 pb-2">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="font-medium">{food.name}</div>
                          <div className="text-sm text-gray-600">
                            {food.calories_per_100g} cal • {food.protein_per_100g}g protein per 100g
                          </div>
                        </div>
                        <div className="flex gap-2 ml-2">
                          <button
                            onClick={() => handleEditFood(food)}
                            className="text-blue-600 hover:text-blue-800 text-sm"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteFood(food.id!)}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}
              
              {(activeTab === 'favorites' || activeTab === 'recent') && (
                <>
                  {(filteredFoods() as QuickAddFood[]).map(item => (
                    <div key={item.id} className="border-b last:border-b-0 pb-2">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="font-medium">{item.food?.name}</div>
                          <div className="text-sm text-gray-600">
                            {item.food?.brand} • {item.food?.calories_per_100g} cal per 100g
                          </div>
                          <div className="text-xs text-gray-500">
                            Used {item.frequency} times
                          </div>
                        </div>
                        <button
                          onClick={() => navigate(`/add-food?foodId=${item.food_id}`)}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          Quick Add
                        </button>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={() => navigate('/add-food?create=true')}
            className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700"
          >
            + Create New Food
          </button>
          <button
            onClick={handleExportFoods}
            className="px-4 py-3 bg-gray-200 rounded-lg hover:bg-gray-300"
          >
            Export
          </button>
        </div>
      </div>

      {/* Edit Food Modal */}
      {showEditModal && selectedFood && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Edit Food</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input
                  type="text"
                  value={selectedFood.name}
                  onChange={(e) => setSelectedFood({ ...selectedFood, name: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Brand</label>
                <input
                  type="text"
                  value={selectedFood.brand || ''}
                  onChange={(e) => setSelectedFood({ ...selectedFood, brand: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Calories</label>
                  <input
                    type="number"
                    value={selectedFood.calories_per_100g}
                    onChange={(e) => setSelectedFood({ 
                      ...selectedFood, 
                      calories_per_100g: parseFloat(e.target.value) 
                    })}
                    className="w-full p-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Protein (g)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={selectedFood.protein_per_100g}
                    onChange={(e) => setSelectedFood({ 
                      ...selectedFood, 
                      protein_per_100g: parseFloat(e.target.value) 
                    })}
                    className="w-full p-2 border rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Carbs (g)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={selectedFood.carbs_per_100g}
                    onChange={(e) => setSelectedFood({ 
                      ...selectedFood, 
                      carbs_per_100g: parseFloat(e.target.value) 
                    })}
                    className="w-full p-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Fat (g)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={selectedFood.fat_per_100g}
                    onChange={(e) => setSelectedFood({ 
                      ...selectedFood, 
                      fat_per_100g: parseFloat(e.target.value) 
                    })}
                    className="w-full p-2 border rounded-lg"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={handleSaveFood}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
              >
                Save Changes
              </button>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedFood(null);
                }}
                className="flex-1 bg-gray-200 py-2 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FoodDatabasePage;