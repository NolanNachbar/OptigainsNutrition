import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import Actionbar from '../components/Actionbar';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { WeightChart } from '../components/charts/WeightChart';
import { MacroChart } from '../components/charts/MacroChart';
import { CalorieTrendChart } from '../components/charts/CalorieTrendChart';
import { 
  getUserProfile, 
  getWeightEntries, 
  getNutritionLogs 
} from '../utils/database';
import { calculateTrendWeight } from '../utils/adaptiveTDEE';
import { WeightEntry, NutritionLog, UserNutritionProfile } from '../utils/types';

type TimeRange = '7d' | '30d' | '90d' | 'all';

const AnalyticsPage: React.FC = () => {
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [weightEntries, setWeightEntries] = useState<WeightEntry[]>([]);
  const [nutritionLogs, setNutritionLogs] = useState<NutritionLog[]>([]);
  const [profile, setProfile] = useState<UserNutritionProfile | null>(null);
  const [activeTab, setActiveTab] = useState<'weight' | 'calories' | 'macros'>('weight');

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, timeRange]);

  const fetchData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Get user profile
      const userProfile = await getUserProfile(user.id);
      setProfile(userProfile);
      
      // Calculate days based on time range
      const days = timeRange === '7d' ? 7 : 
                  timeRange === '30d' ? 30 : 
                  timeRange === '90d' ? 90 : 365;
      
      // Fetch weight entries
      const weights = await getWeightEntries(user.id, days);
      setWeightEntries(weights);
      
      // Fetch nutrition logs
      const logs = await getNutritionLogs(user.id, days);
      setNutritionLogs(logs);
      
    } catch (error) {
      console.error('Error fetching analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate trend weights
  const trendWeights = weightEntries.length > 0 
    ? weightEntries.map((_, index) => 
        calculateTrendWeight(weightEntries.slice(0, index + 1))
      )
    : [];

  // Calculate statistics
  const stats = {
    avgCalories: nutritionLogs.length > 0
      ? Math.round(nutritionLogs.reduce((sum, log) => sum + log.calories, 0) / nutritionLogs.length)
      : 0,
    avgProtein: nutritionLogs.length > 0
      ? Math.round(nutritionLogs.reduce((sum, log) => sum + log.protein, 0) / nutritionLogs.length)
      : 0,
    avgCarbs: nutritionLogs.length > 0
      ? Math.round(nutritionLogs.reduce((sum, log) => sum + log.carbs, 0) / nutritionLogs.length)
      : 0,
    avgFat: nutritionLogs.length > 0
      ? Math.round(nutritionLogs.reduce((sum, log) => sum + log.fat, 0) / nutritionLogs.length)
      : 0,
    weightChange: weightEntries.length >= 2
      ? (weightEntries[0].weight - weightEntries[weightEntries.length - 1].weight).toFixed(1)
      : '0',
    loggingStreak: nutritionLogs.filter(log => log.calories > 0).length
  };

  const timeRangeButtons: { value: TimeRange; label: string }[] = [
    { value: '7d', label: '7 Days' },
    { value: '30d', label: '30 Days' },
    { value: '90d', label: '90 Days' },
    { value: 'all', label: 'All Time' }
  ];

  const tabs = [
    { id: 'weight' as const, label: 'Weight Trend', icon: '📊' },
    { id: 'calories' as const, label: 'Calorie Intake', icon: '🔥' },
    { id: 'macros' as const, label: 'Macro Distribution', icon: '🥗' }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Actionbar />
        <div className="pt-24 flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-gray-700 border-t-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <Actionbar />
      
      <div className="w-full pt-24 pb-20">
        <div className="max-w-6xl mx-auto px-4">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold tracking-tight">Analytics</h1>
            <p className="text-gray-400 mt-2">Track your progress with detailed insights</p>
          </div>

          {/* Time Range Selector */}
          <div className="flex gap-2 mb-6">
            {timeRangeButtons.map((btn) => (
              <Button
                key={btn.value}
                variant={timeRange === btn.value ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setTimeRange(btn.value)}
              >
                {btn.label}
              </Button>
            ))}
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card variant="glass">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-500">{stats.avgCalories}</div>
                <div className="text-sm text-gray-400 mt-1">Avg Daily Calories</div>
              </div>
            </Card>
            <Card variant="glass">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-500">{stats.weightChange} kg</div>
                <div className="text-sm text-gray-400 mt-1">Weight Change</div>
              </div>
            </Card>
            <Card variant="glass">
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-500">{stats.avgProtein}g</div>
                <div className="text-sm text-gray-400 mt-1">Avg Daily Protein</div>
              </div>
            </Card>
            <Card variant="glass">
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-500">{stats.loggingStreak}</div>
                <div className="text-sm text-gray-400 mt-1">Days Logged</div>
              </div>
            </Card>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-4 mb-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Chart Container */}
          <Card variant="elevated" className="p-6">
            {activeTab === 'weight' && weightEntries.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-4">Weight Progress</h2>
                <WeightChart 
                  weightEntries={weightEntries}
                  trendWeight={trendWeights}
                  targetWeight={undefined}
                />
              </div>
            )}
            
            {activeTab === 'calories' && nutritionLogs.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-4">Calorie Intake Trend</h2>
                <CalorieTrendChart
                  nutritionLogs={nutritionLogs}
                  targetCalories={profile?.target_macros.calories}
                  adaptiveTDEE={profile?.tdee_estimate}
                />
              </div>
            )}
            
            {activeTab === 'macros' && nutritionLogs.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-4">Macronutrient Distribution</h2>
                <MacroChart
                  nutritionLogs={nutritionLogs}
                />
              </div>
            )}

            {/* Empty State */}
            {((activeTab === 'weight' && weightEntries.length === 0) ||
              ((activeTab === 'calories' || activeTab === 'macros') && nutritionLogs.length === 0)) && (
              <div className="text-center py-12">
                <div className="text-gray-400 text-lg">No data available for this time period</div>
                <p className="text-gray-500 mt-2">Start logging to see your analytics</p>
              </div>
            )}
          </Card>

          {/* Additional Insights */}
          {nutritionLogs.length > 0 && (
            <Card variant="glass" className="mt-6 p-6">
              <h3 className="text-lg font-semibold mb-4">Average Macros</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="text-sm text-gray-400">Protein</div>
                  <div className="text-2xl font-bold text-blue-500">{stats.avgProtein}g</div>
                  <div className="text-xs text-gray-500">
                    {((stats.avgProtein * 4 / stats.avgCalories) * 100).toFixed(0)}% of calories
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-400">Carbs</div>
                  <div className="text-2xl font-bold text-green-500">{stats.avgCarbs}g</div>
                  <div className="text-xs text-gray-500">
                    {((stats.avgCarbs * 4 / stats.avgCalories) * 100).toFixed(0)}% of calories
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-400">Fat</div>
                  <div className="text-2xl font-bold text-orange-500">{stats.avgFat}g</div>
                  <div className="text-xs text-gray-500">
                    {((stats.avgFat * 9 / stats.avgCalories) * 100).toFixed(0)}% of calories
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;