import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { Food, QuickAddFood } from '../utils/types';
import Actionbar from '../components/Actionbar';
import { searchFoods, getFavoriteFoods, getQuickAddFoods, deleteFood, updateFood, toggleFavoriteFood } from '../utils/database';

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
    
    setLoading(true);
    try {
      // Fetch user's custom foods
      const userFoods = await searchFoods('', user.id);
      const customFoods = userFoods.filter(food => food.user_id === user.id);
      setMyFoods(customFoods);
      
      // Fetch favorites
      const favoriteFoods = await getFavoriteFoods(user.id);
      setFavorites(favoriteFoods);
      
      // Fetch recent foods
      const recent = await getQuickAddFoods(user.id, 20);
      setRecentFoods(recent);
    } catch (error) {
      console.error('Error fetching foods:', error);
    } finally {
      setLoading(false);
    }
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
    
    try {
      const success = await deleteFood(foodId);
      if (success) {
        // Refresh foods
        await fetchFoods();
      } else {
        alert('Failed to delete food.');
      }
    } catch (error) {
      console.error('Error deleting food:', error);
      alert('Failed to delete food.');
    }
  };

  const handleEditFood = (food: Food) => {
    setSelectedFood(food);
    setShowEditModal(true);
  };

  const handleSaveFood = async () => {
    if (!selectedFood || !selectedFood.id) return;
    
    try {
      const success = await updateFood(selectedFood.id, selectedFood);
      if (success) {
        // Refresh foods
        await fetchFoods();
        setShowEditModal(false);
        setSelectedFood(null);
      } else {
        alert('Failed to update food.');
      }
    } catch (error) {
      console.error('Error updating food:', error);
      alert('Failed to update food.');
    }
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
      <div className="min-h-screen bg-gray-900">
        <Actionbar />
        <div className="pt-24 flex items-center justify-center min-h-screen">
          <div className="text-gray-400">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <Actionbar />
      
      <div className="w-full pt-24 pb-20">
        <div className="max-w-4xl mx-auto px-4">
          <h1 className="text-2xl font-bold mb-6">Food Database</h1>
          <div className="max-w-2xl mx-auto">
            {/* Search Bar */}
            <div className="bg-gray-800 rounded-lg shadow-md p-4 mb-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search foods..."
            className="w-full p-2 border rounded-lg"
          />
        </div>

        {/* Tabs */}
        <div className="bg-gray-800 rounded-lg shadow-md mb-4">
          <div className="flex">
            <button
              onClick={() => setActiveTab('my-foods')}
              className={`flex-1 py-3 px-4 font-medium border-b-2 transition-colors ${
                activeTab === 'my-foods'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              My Foods
            </button>
            <button
              onClick={() => setActiveTab('favorites')}
              className={`flex-1 py-3 px-4 font-medium border-b-2 transition-colors ${
                activeTab === 'favorites'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              Favorites
            </button>
            <button
              onClick={() => setActiveTab('recent')}
              className={`flex-1 py-3 px-4 font-medium border-b-2 transition-colors ${
                activeTab === 'recent'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              Recent
            </button>
          </div>
        </div>

        {/* Foods List */}
        <div className="bg-gray-800 rounded-lg shadow-md p-4 mb-4">
          {filteredFoods().length === 0 ? (
            <p className="text-gray-400 text-center py-8">
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
                          <div className="text-sm text-gray-400">
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
                          <div className="text-sm text-gray-400">
                            {item.food?.brand} • {item.food?.calories_per_100g} cal per 100g
                          </div>
                          <div className="text-xs text-gray-400">
                            Used {item.frequency} times
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => navigate(`/add-food?foodId=${item.food_id}`)}
                            className="text-blue-600 hover:text-blue-800 text-sm"
                          >
                            Quick Add
                          </button>
                          {activeTab === 'recent' && (
                            <button
                              onClick={async () => {
                                try {
                                  await toggleFavoriteFood(user!.id, item.food_id);
                                  await fetchFoods();
                                } catch (error) {
                                  console.error('Error toggling favorite:', error);
                                }
                              }}
                              className="text-yellow-600 hover:text-yellow-800 text-sm"
                            >
                              Favorite
                            </button>
                          )}
                        </div>
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
            className="px-4 py-3 bg-gray-700 rounded-lg hover:bg-gray-600"
          >
            Export
          </button>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Food Modal */}
      {showEditModal && selectedFood && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
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
                className="flex-1 bg-gray-700 py-2 rounded-lg hover:bg-gray-600"
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