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
  const [originalServings, setOriginalServings] = useState(1);
  const [prepTime, setPrepTime] = useState('');
  const [cookTime, setCookTime] = useState('');
  const [instructions, setInstructions] = useState('');
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([]);
  const [customServingSize, setCustomServingSize] = useState('');
  const [servingUnit, setServingUnit] = useState('serving');
  const [totalWeight, setTotalWeight] = useState(0);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Food[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [amount, setAmount] = useState('100');
  
  // UI state
  const [activeTab, setActiveTab] = useState<'details' | 'ingredients' | 'instructions' | 'nutrition'>('details');
  const [saving, setSaving] = useState(false);
  const [scaleMode, setScaleMode] = useState<'servings' | 'weight' | 'custom'>('servings');
  const [targetServings, setTargetServings] = useState(1);

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


  // const nutrition = calculateNutrition(); // Replaced by scaledNutrition
  
  // Calculate scaling factor
  const getScalingFactor = () => {
    switch (scaleMode) {
      case 'servings':
        return targetServings / originalServings;
      case 'weight':
        const currentWeight = ingredients.reduce((sum, ing) => sum + ing.amount_grams, 0);
        return totalWeight > 0 ? totalWeight / currentWeight : 1;
      case 'custom':
        return parseFloat(customServingSize) || 1;
      default:
        return 1;
    }
  };
  
  const scalingFactor = getScalingFactor();
  
  // Scale ingredients
  const scaleIngredient = (ingredient: RecipeIngredient) => ({
    ...ingredient,
    amount_grams: ingredient.amount_grams * scalingFactor
  });
  
  // Calculate scaled nutrition
  const calculateScaledNutrition = () => {
    const scaledIngredients = ingredients.map(scaleIngredient);
    const totals = scaledIngredients.reduce((acc, ing) => {
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

    const targetServingCount = scaleMode === 'servings' ? targetServings : servings;
    const perServing = {
      calories: totals.calories / targetServingCount,
      protein: totals.protein / targetServingCount,
      carbs: totals.carbs / targetServingCount,
      fat: totals.fat / targetServingCount,
      fiber: totals.fiber / targetServingCount
    };

    return { totals, perServing };
  };
  
  const scaledNutrition = calculateScaledNutrition();

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
    { id: 'instructions' as const, label: 'Instructions' },
    { id: 'nutrition' as const, label: 'Nutrition & Scaling' }
  ];
  
  // Set original servings when servings is first set
  const handleServingsChange = (newServings: number) => {
    if (originalServings === 1 && newServings > 1) {
      setOriginalServings(newServings);
    }
    setServings(newServings);
    if (scaleMode === 'servings') {
      setTargetServings(newServings);
    }
  };

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
                  {Math.round(scaledNutrition.perServing.calories)}
                </div>
                <div className="text-sm text-gray-400">Cal/serving</div>
                {scalingFactor !== 1 && (
                  <div className="text-xs text-blue-400">Scaled {scalingFactor.toFixed(1)}x</div>
                )}
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-500">
                  {Math.round(scaledNutrition.perServing.protein)}g
                </div>
                <div className="text-sm text-gray-400">Protein</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-500">
                  {Math.round(scaledNutrition.perServing.carbs)}g
                </div>
                <div className="text-sm text-gray-400">Carbs</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-500">
                  {Math.round(scaledNutrition.perServing.fat)}g
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
                      onChange={(e) => handleServingsChange(parseInt(e.target.value) || 1)}
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

          {/* Nutrition & Scaling Tab */}
          {activeTab === 'nutrition' && (
            <div className="space-y-6">
              {/* Scaling Controls */}
              <Card variant="elevated">
                <h2 className="text-xl font-semibold mb-6">Recipe Scaling</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <button
                    onClick={() => setScaleMode('servings')}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      scaleMode === 'servings'
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-gray-600 hover:border-gray-500'
                    }`}
                  >
                    <div className="font-medium">Scale by Servings</div>
                    <div className="text-sm text-gray-400 mt-1">Adjust serving count</div>
                  </button>
                  
                  <button
                    onClick={() => setScaleMode('weight')}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      scaleMode === 'weight'
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-gray-600 hover:border-gray-500'
                    }`}
                  >
                    <div className="font-medium">Scale by Weight</div>
                    <div className="text-sm text-gray-400 mt-1">Target total weight</div>
                  </button>
                  
                  <button
                    onClick={() => setScaleMode('custom')}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      scaleMode === 'custom'
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-gray-600 hover:border-gray-500'
                    }`}
                  >
                    <div className="font-medium">Custom Scale</div>
                    <div className="text-sm text-gray-400 mt-1">Custom multiplier</div>
                  </button>
                </div>

                {scaleMode === 'servings' && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Target Servings</label>
                    <input
                      type="number"
                      value={targetServings}
                      onChange={(e) => setTargetServings(parseInt(e.target.value) || 1)}
                      min="1"
                      className="w-full max-w-xs p-3 bg-gray-800 border border-gray-700 rounded-lg"
                    />
                    <div className="text-sm text-gray-400 mt-2">
                      Scaling factor: {(targetServings / originalServings).toFixed(2)}x
                    </div>
                  </div>
                )}

                {scaleMode === 'weight' && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Target Total Weight (g)</label>
                    <input
                      type="number"
                      value={totalWeight}
                      onChange={(e) => setTotalWeight(parseInt(e.target.value) || 0)}
                      min="0"
                      className="w-full max-w-xs p-3 bg-gray-800 border border-gray-700 rounded-lg"
                    />
                    <div className="text-sm text-gray-400 mt-2">
                      Current weight: {ingredients.reduce((sum, ing) => sum + ing.amount_grams, 0)}g
                    </div>
                  </div>
                )}

                {scaleMode === 'custom' && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Custom Serving Size</label>
                    <div className="flex gap-2 max-w-md">
                      <input
                        type="number"
                        value={customServingSize}
                        onChange={(e) => setCustomServingSize(e.target.value)}
                        step="0.1"
                        className="flex-1 p-3 bg-gray-800 border border-gray-700 rounded-lg"
                        placeholder="1.5"
                      />
                      <select
                        value={servingUnit}
                        onChange={(e) => setServingUnit(e.target.value)}
                        className="px-3 bg-gray-800 border border-gray-700 rounded-lg"
                      >
                        <option value="serving">serving</option>
                        <option value="cup">cup</option>
                        <option value="slice">slice</option>
                        <option value="piece">piece</option>
                        <option value="scoop">scoop</option>
                      </select>
                    </div>
                  </div>
                )}
              </Card>

              {/* Scaled Ingredients */}
              {ingredients.length > 0 && scalingFactor !== 1 && (
                <Card variant="elevated">
                  <h2 className="text-xl font-semibold mb-6">Scaled Ingredients</h2>
                  
                  <div className="space-y-3">
                    {ingredients.map((ingredient, index) => {
                      const scaled = scaleIngredient(ingredient);
                      return (
                        <div key={index} className="flex justify-between items-center p-3 bg-gray-800/50 rounded-lg">
                          <div>
                            <div className="font-medium">{ingredient.food?.name}</div>
                            <div className="text-sm text-gray-400">
                              Original: {ingredient.amount_grams}g
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium text-blue-400">{Math.round(scaled.amount_grams)}g</div>
                            <div className="text-sm text-gray-400">
                              {Math.round((ingredient.food?.calories_per_100g || 0) * scaled.amount_grams / 100)} cal
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              )}

              {/* Detailed Nutrition */}
              <Card variant="elevated">
                <h2 className="text-xl font-semibold mb-6">Detailed Nutrition</h2>
                
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-medium mb-4">Per Serving</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Calories</span>
                        <span className="font-medium">{Math.round(scaledNutrition.perServing.calories)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Protein</span>
                        <span className="font-medium">{Math.round(scaledNutrition.perServing.protein)}g</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Carbohydrates</span>
                        <span className="font-medium">{Math.round(scaledNutrition.perServing.carbs)}g</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Fat</span>
                        <span className="font-medium">{Math.round(scaledNutrition.perServing.fat)}g</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Fiber</span>
                        <span className="font-medium">{Math.round(scaledNutrition.perServing.fiber)}g</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-medium mb-4">Total Recipe</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Calories</span>
                        <span className="font-medium">{Math.round(scaledNutrition.totals.calories)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Protein</span>
                        <span className="font-medium">{Math.round(scaledNutrition.totals.protein)}g</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Carbohydrates</span>
                        <span className="font-medium">{Math.round(scaledNutrition.totals.carbs)}g</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Fat</span>
                        <span className="font-medium">{Math.round(scaledNutrition.totals.fat)}g</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Fiber</span>
                        <span className="font-medium">{Math.round(scaledNutrition.totals.fiber)}g</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
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