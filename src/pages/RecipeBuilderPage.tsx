import React, { useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import Actionbar from '../components/Actionbar';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { searchFoods } from '../utils/database';
import { RecipeIngredient, Food } from '../utils/types';

const RecipeBuilderPage: React.FC = () => {
  const { user } = useUser();
  const navigate = useNavigate();
  
  // Recipe state
  const [recipeName, setRecipeName] = useState('');
  const [description, setDescription] = useState('');
  const [servings, setServings] = useState(1);
  const [prepTime, setPrepTime] = useState('');
  const [cookTime, setCookTime] = useState('');
  const [instructions, setInstructions] = useState('');
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([]);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Food[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [amount, setAmount] = useState('100');
  
  // UI state
  const [activeTab, setActiveTab] = useState<'details' | 'ingredients' | 'instructions'>('details');
  const [saving, setSaving] = useState(false);

  // Search for foods
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setSearching(true);
    try {
      const results = await searchFoods(searchQuery, user?.id);
      setSearchResults(results);
    } catch (error) {
      console.error('Error searching foods:', error);
    } finally {
      setSearching(false);
    }
  };

  // Add ingredient to recipe
  const handleAddIngredient = () => {
    if (!selectedFood || !amount) return;
    
    const newIngredient: RecipeIngredient = {
      food_id: selectedFood.id!,
      food: selectedFood,
      amount_grams: parseFloat(amount)
    };
    
    setIngredients([...ingredients, newIngredient]);
    setSelectedFood(null);
    setAmount('100');
    setSearchQuery('');
    setSearchResults([]);
  };

  // Remove ingredient
  const handleRemoveIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  // Update ingredient amount
  const handleUpdateAmount = (index: number, newAmount: string) => {
    const updated = [...ingredients];
    updated[index].amount_grams = parseFloat(newAmount) || 0;
    setIngredients(updated);
  };

  // Calculate total nutrition
  const calculateNutrition = () => {
    const totals = ingredients.reduce((acc, ing) => {
      if (!ing.food) return acc;
      const multiplier = ing.amount_grams / 100;
      
      return {
        calories: acc.calories + (ing.food.calories_per_100g * multiplier),
        protein: acc.protein + (ing.food.protein_per_100g * multiplier),
        carbs: acc.carbs + (ing.food.carbs_per_100g * multiplier),
        fat: acc.fat + (ing.food.fat_per_100g * multiplier),
        fiber: acc.fiber + ((ing.food.fiber_per_100g || 0) * multiplier)
      };
    }, { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });

    // Per serving
    const perServing = {
      calories: totals.calories / servings,
      protein: totals.protein / servings,
      carbs: totals.carbs / servings,
      fat: totals.fat / servings,
      fiber: totals.fiber / servings
    };

    return { totals, perServing };
  };

  const nutrition = calculateNutrition();

  // Save recipe
  const handleSaveRecipe = async () => {
    if (!recipeName || ingredients.length === 0) {
      alert('Please add a recipe name and at least one ingredient');
      return;
    }
    
    setSaving(true);
    try {
      // This would save to database
      console.log('Saving recipe:', {
        name: recipeName,
        description,
        servings,
        prepTime,
        cookTime,
        instructions,
        ingredients
      });
      
      // Navigate back to food database or dashboard
      navigate('/foods');
    } catch (error) {
      console.error('Error saving recipe:', error);
      alert('Failed to save recipe');
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'details' as const, label: 'Recipe Details' },
    { id: 'ingredients' as const, label: 'Ingredients' },
    { id: 'instructions' as const, label: 'Instructions' }
  ];

  return (
    <div className="min-h-screen bg-gray-900">
      <Actionbar />
      
      <div className="w-full pt-24 pb-20">
        <div className="max-w-4xl mx-auto px-4">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold tracking-tight">Recipe Builder</h1>
            <p className="text-gray-400 mt-2">Create custom recipes with calculated nutrition</p>
          </div>

          {/* Nutrition Summary Card */}
          <Card variant="glass" className="mb-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-500">
                  {Math.round(nutrition.perServing.calories)}
                </div>
                <div className="text-sm text-gray-400">Cal/serving</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-500">
                  {Math.round(nutrition.perServing.protein)}g
                </div>
                <div className="text-sm text-gray-400">Protein</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-500">
                  {Math.round(nutrition.perServing.carbs)}g
                </div>
                <div className="text-sm text-gray-400">Carbs</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-500">
                  {Math.round(nutrition.perServing.fat)}g
                </div>
                <div className="text-sm text-gray-400">Fat</div>
              </div>
            </div>
          </Card>

          {/* Tab Navigation */}
          <div className="flex gap-2 mb-6">
            {tabs.map((tab) => (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </Button>
            ))}
          </div>

          {/* Recipe Details Tab */}
          {activeTab === 'details' && (
            <Card variant="elevated">
              <h2 className="text-xl font-semibold mb-6">Recipe Details</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Recipe Name</label>
                  <input
                    type="text"
                    value={recipeName}
                    onChange={(e) => setRecipeName(e.target.value)}
                    className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg"
                    placeholder="My Awesome Recipe"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg"
                    rows={3}
                    placeholder="A delicious and nutritious meal..."
                  />
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Servings</label>
                    <input
                      type="number"
                      value={servings}
                      onChange={(e) => setServings(parseInt(e.target.value) || 1)}
                      min="1"
                      className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Prep Time (min)</label>
                    <input
                      type="number"
                      value={prepTime}
                      onChange={(e) => setPrepTime(e.target.value)}
                      className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg"
                      placeholder="15"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Cook Time (min)</label>
                    <input
                      type="number"
                      value={cookTime}
                      onChange={(e) => setCookTime(e.target.value)}
                      className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg"
                      placeholder="30"
                    />
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Ingredients Tab */}
          {activeTab === 'ingredients' && (
            <Card variant="elevated">
              <h2 className="text-xl font-semibold mb-6">Ingredients</h2>
              
              {/* Search Section */}
              <div className="mb-6 p-4 bg-gray-800/50 rounded-lg">
                <div className="flex gap-2 mb-4">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    className="flex-1 p-3 bg-gray-700 border border-gray-600 rounded-lg"
                    placeholder="Search for ingredients..."
                  />
                  <Button onClick={handleSearch} loading={searching}>
                    Search
                  </Button>
                </div>
                
                {/* Search Results */}
                {searchResults.length > 0 && (
                  <div className="space-y-2 mb-4">
                    {searchResults.slice(0, 5).map((food) => (
                      <div
                        key={food.id}
                        onClick={() => setSelectedFood(food)}
                        className={`p-3 rounded-lg cursor-pointer transition-all ${
                          selectedFood?.id === food.id
                            ? 'bg-blue-500/20 border border-blue-500'
                            : 'bg-gray-700/50 hover:bg-gray-700'
                        }`}
                      >
                        <div className="font-medium">{food.name}</div>
                        {food.brand && <div className="text-sm text-gray-400">{food.brand}</div>}
                        <div className="text-sm text-gray-400 mt-1">
                          {food.calories_per_100g} cal • {food.protein_per_100g}g protein per 100g
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Add Ingredient */}
                {selectedFood && (
                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <label className="block text-sm font-medium mb-1">Amount (grams)</label>
                      <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg"
                      />
                    </div>
                    <Button onClick={handleAddIngredient} variant="primary" size="sm">
                      Add Ingredient
                    </Button>
                  </div>
                )}
              </div>
              
              {/* Ingredients List */}
              <div className="space-y-2">
                {ingredients.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    No ingredients added yet. Search and add ingredients above.
                  </div>
                ) : (
                  ingredients.map((ingredient, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium">{ingredient.food?.name}</div>
                        <div className="text-sm text-gray-400">
                          {Math.round((ingredient.food?.calories_per_100g || 0) * ingredient.amount_grams / 100)} cal
                        </div>
                      </div>
                      <input
                        type="number"
                        value={ingredient.amount_grams}
                        onChange={(e) => handleUpdateAmount(index, e.target.value)}
                        className="w-24 p-2 bg-gray-700 border border-gray-600 rounded-lg text-right"
                      />
                      <span className="text-gray-400">g</span>
                      <Button
                        onClick={() => handleRemoveIngredient(index)}
                        variant="ghost"
                        size="sm"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </Card>
          )}

          {/* Instructions Tab */}
          {activeTab === 'instructions' && (
            <Card variant="elevated">
              <h2 className="text-xl font-semibold mb-6">Instructions</h2>
              
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                className="w-full p-4 bg-gray-800 border border-gray-700 rounded-lg"
                rows={12}
                placeholder="1. Preheat oven to 350°F...&#10;2. Mix ingredients...&#10;3. Bake for 30 minutes..."
              />
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 mt-6">
            <Button
              onClick={() => navigate(-1)}
              variant="secondary"
              size="lg"
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveRecipe}
              variant="primary"
              size="lg"
              className="flex-1"
              loading={saving}
              disabled={!recipeName || ingredients.length === 0}
            >
              Save Recipe
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecipeBuilderPage;