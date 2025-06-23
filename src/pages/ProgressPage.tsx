import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { format, subDays } from 'date-fns';
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
import { getWeightRange, getNutritionLogRange, addWeightEntry } from '../utils/database';
import { calculateAdaptiveTDEE } from '../utils/tdeeCalculator';

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
    
    setLoading(true);
    try {
      // Calculate date range
      const days = timeRange === 'week' ? 7 : timeRange === 'month' ? 30 : 90;
      const endDate = format(new Date(), 'yyyy-MM-dd');
      const startDate = format(subDays(new Date(), days), 'yyyy-MM-dd');
      
      // Fetch weight entries and nutrition logs
      const [weights, logs] = await Promise.all([
        getWeightRange(user.id, startDate, endDate),
        getNutritionLogRange(user.id, startDate, endDate)
      ]);
      
      setWeightEntries(weights);
      setNutritionLogs(logs);
    } catch (error) {
      console.error('Error fetching progress data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddWeight = async () => {
    if (!newWeight || !user) return;
    
    const weight = parseFloat(newWeight);
    if (isNaN(weight)) return;
    
    try {
      const success = await addWeightEntry({
        clerk_user_id: user.id,
        date: format(new Date(), 'yyyy-MM-dd'),
        weight
      });
      
      if (success) {
        // Refresh data
        await fetchProgressData();
        setNewWeight('');
        setShowWeightModal(false);
      } else {
        alert('Failed to add weight entry.');
      }
    } catch (error) {
      console.error('Error adding weight:', error);
      alert('Failed to add weight entry.');
    }
  };

  const calculateAverages = (): { macros: Macros, tdee: number, tdeeConfidence: number } => {
    if (nutritionLogs.length === 0 || weightEntries.length < 2) {
      return {
        macros: { calories: 0, protein: 0, carbs: 0, fat: 0 },
        tdee: 0,
        tdeeConfidence: 0
      };
    }
    
    // Calculate adaptive TDEE
    const tdeeCalc = calculateAdaptiveTDEE(
      weightEntries.map(w => ({ date: w.date, weight: w.weight })),
      nutritionLogs.map(n => ({ 
        date: n.date, 
        calories: n.calories, 
        protein: n.protein, 
        carbs: n.carbs, 
        fat: n.fat 
      }))
    );
    
    // Calculate average macros
    const sum = nutritionLogs.reduce((acc, log) => ({
      calories: acc.calories + log.calories,
      protein: acc.protein + log.protein,
      carbs: acc.carbs + log.carbs,
      fat: acc.fat + log.fat,
      fiber: acc.fiber + (log.fiber || 0)
    }), { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });
    
    const count = nutritionLogs.length;
    
    return {
      macros: {
        calories: Math.round(sum.calories / count),
        protein: Math.round(sum.protein / count),
        carbs: Math.round(sum.carbs / count),
        fat: Math.round(sum.fat / count),
        fiber: Math.round(sum.fiber / count)
      },
      tdee: tdeeCalc.tdee || 0,
      tdeeConfidence: tdeeCalc.confidence || 0
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
      <div className="min-h-screen bg-gray-900">
        <Actionbar />
        <div className="pt-24 flex items-center justify-center min-h-screen">
          <div className="text-gray-400">Loading...</div>
        </div>
      </div>
    );
  }

  const { macros: avgMacros, tdee, tdeeConfidence } = calculateAverages();
  const latestWeight = weightEntries[weightEntries.length - 1]?.weight || 0;
  const weekAgoWeight = weightEntries.find(w => 
    new Date(w.date) <= subDays(new Date(), 7)
  )?.weight || latestWeight;
  const weeklyChange = latestWeight - weekAgoWeight;

  return (
    <div className="min-h-screen bg-gray-900">
      <Actionbar />
      
      <div className="w-full pt-24 pb-20">
        <div className="max-w-4xl mx-auto px-4">
          <h1 className="text-2xl font-bold mb-6">Progress</h1>
          <div className="max-w-2xl mx-auto">
            {/* Time Range Selector */}
            <div className="bg-gray-800 rounded-lg shadow-md p-4 mb-6">
          <div className="flex gap-2">
            <button
              onClick={() => setTimeRange('week')}
              className={`flex-1 py-2 px-4 rounded-lg ${
                timeRange === 'week' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-750 hover:bg-gray-700'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setTimeRange('month')}
              className={`flex-1 py-2 px-4 rounded-lg ${
                timeRange === 'month' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-750 hover:bg-gray-700'
              }`}
            >
              Month
            </button>
            <button
              onClick={() => setTimeRange('3months')}
              className={`flex-1 py-2 px-4 rounded-lg ${
                timeRange === '3months' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-750 hover:bg-gray-700'
              }`}
            >
              3 Months
            </button>
          </div>
        </div>

        {/* Weight Summary */}
        <div className="bg-gray-800 rounded-lg shadow-md p-6 mb-6">
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
              <div className="text-sm text-gray-400">Current</div>
            </div>
            <div>
              <div className={`text-2xl font-bold ${
                weeklyChange > 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {weeklyChange > 0 ? '+' : ''}{weeklyChange.toFixed(1)} kg
              </div>
              <div className="text-sm text-gray-400">This Week</div>
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
        <div className="bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">TDEE Estimate</h2>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">{tdee || 'N/A'}</div>
            <div className="text-gray-400">calories/day</div>
            {tdeeConfidence > 0 && (
              <div className="mt-2">
                <div className="text-sm text-gray-500">Confidence: {tdeeConfidence}%</div>
                <div className="w-full bg-gray-700 rounded-full h-2 mt-1">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${tdeeConfidence}%` }}
                  />
                </div>
              </div>
            )}
            <p className="text-sm text-gray-500 mt-2">
              {tdeeConfidence < 50 
                ? 'Need more data for accurate calculation'
                : 'Based on your intake and weight changes'
              }
            </p>
          </div>
        </div>

        {/* Average Macros */}
        <div className="bg-gray-800 rounded-lg shadow-md p-6 mb-6">
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
        <div className="bg-gray-800 rounded-lg shadow-md p-6">
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
        </div>
      </div>

      {/* Weight Entry Modal */}
      {showWeightModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-lg p-6 max-w-sm w-full">
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

export default ProgressPage;