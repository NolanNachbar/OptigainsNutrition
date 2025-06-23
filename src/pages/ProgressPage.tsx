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
import { Card, MetricCard, CardGroup } from '../components/ui/Card';
import { Button, ButtonGroup } from '../components/ui/Button';
import { ProgressRing, MultiProgressRing } from '../components/ui/ProgressRing';
import { theme } from '../styles/theme';

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
          borderColor: theme.colors.blue[500],
          backgroundColor: `${theme.colors.blue[500]}20`,
          borderWidth: 3,
          pointBackgroundColor: theme.colors.blue[500],
          pointBorderColor: theme.colors.gray[900],
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 7,
          tension: 0.4
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
          borderColor: theme.colors.green[500],
          backgroundColor: `${theme.colors.green[500]}20`,
          borderWidth: 3,
          pointBackgroundColor: theme.colors.green[500],
          pointBorderColor: theme.colors.gray[900],
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 7,
          tension: 0.4
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
          <h1 className="text-3xl font-bold mb-2 tracking-tight">Progress</h1>
          <p className="text-gray-400 mb-8">Track your journey towards your goals</p>
          
          <div className="max-w-2xl mx-auto">
            {/* Time Range Selector */}
            <Card className="mb-6">
              <ButtonGroup className="w-full">
                <Button
                  variant={timeRange === 'week' ? 'primary' : 'secondary'}
                  onClick={() => setTimeRange('week')}
                  className="flex-1"
                >
                  Week
                </Button>
                <Button
                  variant={timeRange === 'month' ? 'primary' : 'secondary'}
                  onClick={() => setTimeRange('month')}
                  className="flex-1"
                >
                  Month
                </Button>
                <Button
                  variant={timeRange === '3months' ? 'primary' : 'secondary'}
                  onClick={() => setTimeRange('3months')}
                  className="flex-1"
                >
                  3 Months
                </Button>
              </ButtonGroup>
            </Card>

        {/* Weight Summary */}
        <Card variant="elevated" className="mb-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Weight Tracking</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowWeightModal(true)}
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              }
            >
              Add Entry
            </Button>
          </div>
          
          <CardGroup>
            <MetricCard
              title="Current Weight"
              value={`${latestWeight.toFixed(1)} kg`}
              subtitle="Latest measurement"
            />
            <MetricCard
              title="Weekly Change"
              value={`${weeklyChange > 0 ? '+' : ''}${weeklyChange.toFixed(1)} kg`}
              subtitle="7-day average"
              trend={weeklyChange !== 0 ? { value: Math.abs(weeklyChange), isPositive: weeklyChange > 0 } : undefined}
            />
          </CardGroup>
          
          {weightEntries.length > 1 && (
            <div className="h-64 mt-6">
              <Line 
                data={getWeightChartData()} 
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      display: false
                    },
                    tooltip: {
                      backgroundColor: theme.colors.gray[800],
                      titleColor: theme.colors.gray[100],
                      bodyColor: theme.colors.gray[300],
                      borderColor: theme.colors.gray[700],
                      borderWidth: 1,
                      padding: 12,
                      cornerRadius: 8,
                      displayColors: false
                    }
                  },
                  scales: {
                    x: {
                      grid: {
                        display: false
                      },
                      ticks: {
                        color: theme.colors.gray[400]
                      }
                    },
                    y: {
                      beginAtZero: false,
                      grid: {
                        color: theme.colors.gray[800]
                      },
                      ticks: {
                        color: theme.colors.gray[400]
                      }
                    }
                  }
                }}
              />
            </div>
          )}
        </Card>

        {/* TDEE Estimate */}
        <Card variant="glass" className="mb-6">
          <h2 className="text-xl font-semibold mb-6">Adaptive TDEE</h2>
          <div className="flex flex-col items-center">
            <div className="mb-4">
              <ProgressRing
                value={tdeeConfidence}
                size={120}
                strokeWidth={10}
                color={theme.colors.blue[500]}
                backgroundColor={theme.colors.gray[800]}
              />
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold mb-1">
                {tdee ? tdee.toLocaleString() : '—'}
              </div>
              <div className="text-gray-400 text-sm mb-4">calories per day</div>
              <p className="text-sm text-gray-500 max-w-xs">
                {tdeeConfidence < 50 
                  ? 'Keep tracking for 2+ weeks to improve accuracy'
                  : `${tdeeConfidence}% confidence based on ${nutritionLogs.length} days of data`
                }
              </p>
            </div>
          </div>
        </Card>

        {/* Average Macros */}
        <Card variant="elevated" className="mb-6">
          <h2 className="text-xl font-semibold mb-6">Average Daily Intake</h2>
          
          {/* Macro Distribution Ring */}
          <div className="flex justify-center mb-6">
            <MultiProgressRing
              size={140}
              strokeWidth={16}
              values={[
                {
                  value: (avgMacros.protein * 4 / avgMacros.calories) * 100 || 0,
                  color: theme.colors.blue[500],
                  label: 'Protein'
                },
                {
                  value: (avgMacros.carbs * 4 / avgMacros.calories) * 100 || 0,
                  color: theme.colors.green[500],
                  label: 'Carbs'
                },
                {
                  value: (avgMacros.fat * 9 / avgMacros.calories) * 100 || 0,
                  color: theme.colors.orange[500],
                  label: 'Fat'
                }
              ]}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <MetricCard
              title="Calories"
              value={avgMacros.calories.toLocaleString()}
              subtitle="Daily average"
            />
            <MetricCard
              title="Protein"
              value={`${avgMacros.protein}g`}
              subtitle={`${Math.round((avgMacros.protein * 4 / avgMacros.calories) * 100) || 0}% of calories`}
            />
            <MetricCard
              title="Carbs"
              value={`${avgMacros.carbs}g`}
              subtitle={`${Math.round((avgMacros.carbs * 4 / avgMacros.calories) * 100) || 0}% of calories`}
            />
            <MetricCard
              title="Fat"
              value={`${avgMacros.fat}g`}
              subtitle={`${Math.round((avgMacros.fat * 9 / avgMacros.calories) * 100) || 0}% of calories`}
            />
          </div>
        </Card>

        {/* Calorie Trend */}
        <Card variant="elevated">
          <h2 className="text-xl font-semibold mb-6">Calorie Trend</h2>
          {nutritionLogs.length > 1 ? (
            <div className="h-64">
              <Line 
                data={getCalorieChartData()} 
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      display: false
                    },
                    tooltip: {
                      backgroundColor: theme.colors.gray[800],
                      titleColor: theme.colors.gray[100],
                      bodyColor: theme.colors.gray[300],
                      borderColor: theme.colors.gray[700],
                      borderWidth: 1,
                      padding: 12,
                      cornerRadius: 8,
                      displayColors: false
                    }
                  },
                  scales: {
                    x: {
                      grid: {
                        display: false
                      },
                      ticks: {
                        color: theme.colors.gray[400]
                      }
                    },
                    y: {
                      grid: {
                        color: theme.colors.gray[800]
                      },
                      ticks: {
                        color: theme.colors.gray[400]
                      }
                    }
                  }
                }}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-gray-500">
              <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <p className="text-sm">Track more days to see trends</p>
            </div>
          )}
            </Card>
          </div>
        </div>
      </div>

      {/* Weight Entry Modal */}
      {showWeightModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <Card variant="elevated" className="max-w-sm w-full animate-scale-in">
            <h3 className="text-xl font-semibold mb-6">Log Weight</h3>
            <input
              type="number"
              step="0.1"
              value={newWeight}
              onChange={(e) => setNewWeight(e.target.value)}
              placeholder="Enter weight"
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl mb-6 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
              autoFocus
            />
            <ButtonGroup className="w-full">
              <Button
                onClick={handleAddWeight}
                variant="primary"
                className="flex-1"
                disabled={!newWeight}
              >
                Save Entry
              </Button>
              <Button
                onClick={() => {
                  setShowWeightModal(false);
                  setNewWeight('');
                }}
                variant="secondary"
                className="flex-1"
              >
                Cancel
              </Button>
            </ButtonGroup>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ProgressPage;