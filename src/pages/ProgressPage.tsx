import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { format, subDays, startOfWeek } from 'date-fns';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { WeightEntry, NutritionLog, Macros } from '../utils/types';
import Actionbar from '../components/Actionbar';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const ProgressPage: React.FC = () => {
  const { user } = useUser();
  const [timeRange, setTimeRange] = useState<'week' | 'month' | '3months'>('month');
  const [weightEntries, setWeightEntries] = useState<WeightEntry[]>([]);
  const [nutritionLogs, setNutritionLogs] = useState<NutritionLog[]>([]);
  const [newWeight, setNewWeight] = useState('');
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProgressData();
  }, [user, timeRange]);

  const fetchProgressData = async () => {
    if (!user) return;
    
    // TODO: Implement actual database fetching
    // Mock data for demonstration
    const mockWeights: WeightEntry[] = [];
    const mockLogs: NutritionLog[] = [];
    
    // Generate mock data for the selected time range
    const days = timeRange === 'week' ? 7 : timeRange === 'month' ? 30 : 90;
    
    for (let i = days; i >= 0; i--) {
      const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
      
      // Weight entries (not every day)
      if (i % 3 === 0) {
        mockWeights.push({
          id: `weight-${i}`,
          user_id: user.id,
          date,
          weight: 75 + Math.sin(i / 10) * 2 + Math.random() * 0.5
        });
      }
      
      // Nutrition logs (every day)
      mockLogs.push({
        id: `log-${i}`,
        user_id: user.id,
        date,
        calories: 2400 + Math.round(Math.random() * 400 - 200),
        protein: 170 + Math.round(Math.random() * 40 - 20),
        carbs: 250 + Math.round(Math.random() * 60 - 30),
        fat: 75 + Math.round(Math.random() * 20 - 10),
        fiber: 25 + Math.round(Math.random() * 10 - 5)
      });
    }
    
    setWeightEntries(mockWeights);
    setNutritionLogs(mockLogs);
    setLoading(false);
  };

  const handleAddWeight = async () => {
    if (!newWeight || !user) return;
    
    const weight = parseFloat(newWeight);
    if (isNaN(weight)) return;
    
    // TODO: Save to database
    const newEntry: WeightEntry = {
      id: Date.now().toString(),
      user_id: user.id,
      date: format(new Date(), 'yyyy-MM-dd'),
      weight
    };
    
    setWeightEntries([...weightEntries, newEntry]);
    setNewWeight('');
    setShowWeightModal(false);
  };

  const calculateAverages = (): { macros: Macros, tdee: number } => {
    if (nutritionLogs.length === 0) {
      return {
        macros: { calories: 0, protein: 0, carbs: 0, fat: 0 },
        tdee: 0
      };
    }
    
    const sum = nutritionLogs.reduce((acc, log) => ({
      calories: acc.calories + log.calories,
      protein: acc.protein + log.protein,
      carbs: acc.carbs + log.carbs,
      fat: acc.fat + log.fat,
      fiber: acc.fiber + (log.fiber || 0)
    }), { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });
    
    const count = nutritionLogs.length;
    const avgCalories = Math.round(sum.calories / count);
    
    // Calculate TDEE based on weight change
    let tdee = avgCalories;
    if (weightEntries.length >= 2) {
      const firstWeight = weightEntries[0].weight;
      const lastWeight = weightEntries[weightEntries.length - 1].weight;
      const weightChange = lastWeight - firstWeight;
      const weeks = nutritionLogs.length / 7;
      const weeklyChange = weightChange / weeks;
      
      // 3500 calories = 1 lb, convert kg to lbs
      const calorieAdjustment = (weeklyChange * 2.20462 * 3500) / 7;
      tdee = Math.round(avgCalories - calorieAdjustment);
    }
    
    return {
      macros: {
        calories: avgCalories,
        protein: Math.round(sum.protein / count),
        carbs: Math.round(sum.carbs / count),
        fat: Math.round(sum.fat / count),
        fiber: Math.round(sum.fiber / count)
      },
      tdee
    };
  };

  const getWeightChartData = () => {
    return {
      labels: weightEntries.map(entry => format(new Date(entry.date), 'MMM d')),
      datasets: [
        {
          label: 'Weight (kg)',
          data: weightEntries.map(entry => entry.weight),
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.3
        }
      ]
    };
  };

  const getCalorieChartData = () => {
    return {
      labels: nutritionLogs.map(log => format(new Date(log.date), 'MMM d')),
      datasets: [
        {
          label: 'Daily Calories',
          data: nutritionLogs.map(log => log.calories),
          borderColor: 'rgb(34, 197, 94)',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          tension: 0.3
        }
      ]
    };
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

  const { macros: avgMacros, tdee } = calculateAverages();
  const latestWeight = weightEntries[weightEntries.length - 1]?.weight || 0;
  const weekAgoWeight = weightEntries.find(w => 
    new Date(w.date) <= subDays(new Date(), 7)
  )?.weight || latestWeight;
  const weeklyChange = latestWeight - weekAgoWeight;

  return (
    <div className="min-h-screen bg-gray-100">
      <Actionbar />
      
      <div className="container mx-auto px-4 py-6 max-w-md">
        <h1 className="text-2xl font-bold mb-6">Progress</h1>
        
        {/* Time Range Selector */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="flex gap-2">
            <button
              onClick={() => setTimeRange('week')}
              className={`flex-1 py-2 px-4 rounded-lg ${
                timeRange === 'week' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setTimeRange('month')}
              className={`flex-1 py-2 px-4 rounded-lg ${
                timeRange === 'month' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              Month
            </button>
            <button
              onClick={() => setTimeRange('3months')}
              className={`flex-1 py-2 px-4 rounded-lg ${
                timeRange === '3months' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              3 Months
            </button>
          </div>
        </div>

        {/* Weight Summary */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Weight</h2>
            <button
              onClick={() => setShowWeightModal(true)}
              className="text-blue-600 hover:text-blue-800"
            >
              + Add
            </button>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <div className="text-2xl font-bold">{latestWeight.toFixed(1)} kg</div>
              <div className="text-sm text-gray-600">Current</div>
            </div>
            <div>
              <div className={`text-2xl font-bold ${
                weeklyChange > 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {weeklyChange > 0 ? '+' : ''}{weeklyChange.toFixed(1)} kg
              </div>
              <div className="text-sm text-gray-600">This Week</div>
            </div>
          </div>
          
          {weightEntries.length > 1 && (
            <div className="h-48">
              <Line 
                data={getWeightChartData()} 
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      display: false
                    }
                  },
                  scales: {
                    y: {
                      beginAtZero: false
                    }
                  }
                }}
              />
            </div>
          )}
        </div>

        {/* TDEE Estimate */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">TDEE Estimate</h2>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">{tdee}</div>
            <div className="text-gray-600">calories/day</div>
            <p className="text-sm text-gray-500 mt-2">
              Based on your average intake and weight change
            </p>
          </div>
        </div>

        {/* Average Macros */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Average Daily Intake</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span>Calories</span>
              <span className="font-semibold">{avgMacros.calories}</span>
            </div>
            <div className="flex justify-between">
              <span>Protein</span>
              <span className="font-semibold">{avgMacros.protein}g</span>
            </div>
            <div className="flex justify-between">
              <span>Carbs</span>
              <span className="font-semibold">{avgMacros.carbs}g</span>
            </div>
            <div className="flex justify-between">
              <span>Fat</span>
              <span className="font-semibold">{avgMacros.fat}g</span>
            </div>
            <div className="flex justify-between">
              <span>Fiber</span>
              <span className="font-semibold">{avgMacros.fiber}g</span>
            </div>
          </div>
        </div>

        {/* Calorie Trend */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold mb-4">Calorie Trend</h2>
          {nutritionLogs.length > 1 && (
            <div className="h-48">
              <Line 
                data={getCalorieChartData()} 
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      display: false
                    }
                  }
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Weight Entry Modal */}
      {showWeightModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold mb-4">Log Weight</h3>
            <input
              type="number"
              step="0.1"
              value={newWeight}
              onChange={(e) => setNewWeight(e.target.value)}
              placeholder="Weight in kg"
              className="w-full p-2 border rounded-lg mb-4"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={handleAddWeight}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setShowWeightModal(false);
                  setNewWeight('');
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

export default ProgressPage;