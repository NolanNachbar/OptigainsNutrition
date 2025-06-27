import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { format } from 'date-fns';
import Actionbar from '../components/Actionbar';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { 
  getNutritionLogs, 
  getUserProfile,
  getWeightEntries 
} from '../utils/database';
import { NutritionLog, UserNutritionProfile, Macros } from '../utils/types';

interface NutritionStats {
  averages: Macros;
  adherence: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  trends: {
    calories: 'increasing' | 'decreasing' | 'stable';
    weight: 'increasing' | 'decreasing' | 'stable';
  };
  consistency: number;
}

const NutritionDashboardPage: React.FC = () => {
  const { user } = useUser();
  const [nutritionLogs, setNutritionLogs] = useState<NutritionLog[]>([]);
  const [userProfile, setUserProfile] = useState<UserNutritionProfile | null>(null);
  const [stats, setStats] = useState<NutritionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<7 | 14 | 30>(14);

  useEffect(() => {
    if (user) {
      fetchNutritionData();
    }
  }, [user, timeframe]);

  const fetchNutritionData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const [logs, profile, weights] = await Promise.all([
        getNutritionLogs(user.id, timeframe),
        getUserProfile(user.id),
        getWeightEntries(user.id, timeframe)
      ]);

      setNutritionLogs(logs);
      setUserProfile(profile);
      
      if (logs.length > 0 && profile) {
        setStats(calculateNutritionStats(logs, profile, weights));
      }
    } catch (error) {
      console.error('Error fetching nutrition data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateNutritionStats = (
    logs: NutritionLog[], 
    profile: UserNutritionProfile,
    weights: any[]
  ): NutritionStats => {
    // Calculate averages
    const totals = logs.reduce((acc, log) => ({
      calories: acc.calories + log.calories,
      protein: acc.protein + log.protein,
      carbs: acc.carbs + log.carbs,
      fat: acc.fat + log.fat,
      fiber: acc.fiber + (log.fiber || 0)
    }), { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });

    const averages = {
      calories: Math.round(totals.calories / logs.length),
      protein: Math.round(totals.protein / logs.length),
      carbs: Math.round(totals.carbs / logs.length),
      fat: Math.round(totals.fat / logs.length),
      fiber: Math.round(totals.fiber / logs.length)
    };

    // Calculate adherence (percentage of days hitting within 10% of target)
    const adherence = {
      calories: calculateAdherence(logs.map(l => l.calories), profile.target_macros.calories),
      protein: calculateAdherence(logs.map(l => l.protein), profile.target_macros.protein),
      carbs: calculateAdherence(logs.map(l => l.carbs), profile.target_macros.carbs),
      fat: calculateAdherence(logs.map(l => l.fat), profile.target_macros.fat)
    };

    // Calculate trends
    const firstHalf = logs.slice(0, Math.floor(logs.length / 2));
    const secondHalf = logs.slice(Math.floor(logs.length / 2));
    
    const firstHalfAvg = firstHalf.reduce((sum, log) => sum + log.calories, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, log) => sum + log.calories, 0) / secondHalf.length;
    
    const calorieTrend = secondHalfAvg > firstHalfAvg * 1.05 ? 'increasing' : 
                        secondHalfAvg < firstHalfAvg * 0.95 ? 'decreasing' : 'stable';

    // Weight trend
    let weightTrend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (weights.length >= 2) {
      const firstWeight = weights[weights.length - 1].weight;
      const lastWeight = weights[0].weight;
      const change = lastWeight - firstWeight;
      weightTrend = change > 0.3 ? 'increasing' : change < -0.3 ? 'decreasing' : 'stable';
    }

    // Consistency (percentage of days with complete logs)
    const consistency = Math.round((logs.length / timeframe) * 100);

    return {
      averages,
      adherence,
      trends: {
        calories: calorieTrend,
        weight: weightTrend
      },
      consistency
    };
  };

  const calculateAdherence = (values: number[], target: number): number => {
    const tolerance = 0.1; // 10% tolerance
    const inRange = values.filter(value => 
      value >= target * (1 - tolerance) && value <= target * (1 + tolerance)
    );
    return Math.round((inRange.length / values.length) * 100);
  };

  const getMacroDistribution = () => {
    if (!stats) return null;

    const totalCals = stats.averages.calories;
    const proteinCals = stats.averages.protein * 4;
    const carbsCals = stats.averages.carbs * 4;
    const fatCals = stats.averages.fat * 9;

    return {
      protein: Math.round((proteinCals / totalCals) * 100),
      carbs: Math.round((carbsCals / totalCals) * 100),
      fat: Math.round((fatCals / totalCals) * 100)
    };
  };

  const getAdherenceColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-500';
    if (percentage >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing':
        return <span className="text-green-500">↗</span>;
      case 'decreasing':
        return <span className="text-red-500">↘</span>;
      default:
        return <span className="text-blue-500">→</span>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Actionbar />
        <div className="pt-24 flex items-center justify-center min-h-screen">
          <div className="text-gray-400">Loading nutrition data...</div>
        </div>
      </div>
    );
  }

  const macroDistribution = getMacroDistribution();

  return (
    <div className="min-h-screen bg-gray-900">
      <Actionbar />
      
      <div className="w-full pt-20 pb-20">
        <div className="max-w-6xl mx-auto px-4">
          {/* Header */}
          <div className="mb-8 flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold tracking-tight">Nutrition Dashboard</h1>
              <p className="text-gray-400 mt-2">Comprehensive nutrition insights and trends</p>
            </div>
            
            <div className="flex gap-2">
              {[7, 14, 30].map((days) => (
                <Button
                  key={days}
                  variant={timeframe === days ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setTimeframe(days as 7 | 14 | 30)}
                >
                  {days}d
                </Button>
              ))}
            </div>
          </div>

          {/* Key Metrics */}
          {stats && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                <Card>
                  <div className="p-6 text-center">
                    <div className="text-3xl font-bold text-blue-500">
                      {stats.averages.calories}
                    </div>
                    <div className="text-sm text-gray-400 mt-1">Avg Calories</div>
                    <div className="flex items-center justify-center mt-2">
                      {getTrendIcon(stats.trends.calories)}
                      <span className="text-xs text-gray-500 ml-1">
                        {timeframe}d trend
                      </span>
                    </div>
                  </div>
                </Card>

                <Card>
                  <div className="p-6 text-center">
                    <div className="text-3xl font-bold text-green-500">
                      {stats.averages.protein}g
                    </div>
                    <div className="text-sm text-gray-400 mt-1">Avg Protein</div>
                    <div className="text-xs text-gray-500 mt-2">
                      {macroDistribution?.protein}% of calories
                    </div>
                  </div>
                </Card>

                <Card>
                  <div className="p-6 text-center">
                    <div className="text-3xl font-bold text-orange-500">
                      {stats.consistency}%
                    </div>
                    <div className="text-sm text-gray-400 mt-1">Consistency</div>
                    <div className="text-xs text-gray-500 mt-2">
                      {nutritionLogs.length}/{timeframe} days logged
                    </div>
                  </div>
                </Card>

                <Card>
                  <div className="p-6 text-center">
                    <div className="text-3xl font-bold text-purple-500">
                      {Math.round((stats.adherence.calories + stats.adherence.protein) / 2)}%
                    </div>
                    <div className="text-sm text-gray-400 mt-1">Target Adherence</div>
                    <div className="flex items-center justify-center mt-2">
                      {getTrendIcon(stats.trends.weight)}
                      <span className="text-xs text-gray-500 ml-1">
                        weight trend
                      </span>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Macro Breakdown */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <Card>
                  <div className="p-6">
                    <h2 className="text-xl font-semibold mb-4">Macro Averages</h2>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span>Protein</span>
                        <span className="font-medium">{stats.averages.protein}g ({macroDistribution?.protein}%)</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Carbohydrates</span>
                        <span className="font-medium">{stats.averages.carbs}g ({macroDistribution?.carbs}%)</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Fat</span>
                        <span className="font-medium">{stats.averages.fat}g ({macroDistribution?.fat}%)</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Fiber</span>
                        <span className="font-medium">{stats.averages.fiber}g</span>
                      </div>
                    </div>
                  </div>
                </Card>

                <Card>
                  <div className="p-6">
                    <h2 className="text-xl font-semibold mb-4">Target Adherence</h2>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span>Calories</span>
                        <span className={`font-medium ${getAdherenceColor(stats.adherence.calories)}`}>
                          {stats.adherence.calories}%
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Protein</span>
                        <span className={`font-medium ${getAdherenceColor(stats.adherence.protein)}`}>
                          {stats.adherence.protein}%
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Carbohydrates</span>
                        <span className={`font-medium ${getAdherenceColor(stats.adherence.carbs)}`}>
                          {stats.adherence.carbs}%
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Fat</span>
                        <span className={`font-medium ${getAdherenceColor(stats.adherence.fat)}`}>
                          {stats.adherence.fat}%
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Recent Logs */}
              <Card>
                <div className="p-6">
                  <h2 className="text-xl font-semibold mb-4">Recent Nutrition Logs</h2>
                  <div className="space-y-3">
                    {nutritionLogs.slice(0, 7).map((log, index) => {
                      const targets = userProfile?.target_macros;
                      const calorieVariance = targets ? ((log.calories - targets.calories) / targets.calories * 100) : 0;
                      
                      return (
                        <div key={log.date || index} className="flex justify-between items-center p-4 bg-gray-800/50 rounded-lg">
                          <div>
                            <div className="font-medium">{format(new Date(log.date), 'MMM d, yyyy')}</div>
                            <div className="text-sm text-gray-400">
                              {log.protein}g protein • {log.carbs}g carbs • {log.fat}g fat
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-semibold">{log.calories} cal</div>
                            <div className={`text-sm ${calorieVariance > 5 ? 'text-green-400' : calorieVariance < -5 ? 'text-red-400' : 'text-gray-400'}`}>
                              {calorieVariance > 0 ? '+' : ''}{Math.round(calorieVariance)}% vs target
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </Card>
            </>
          )}

          {/* No Data State */}
          {(!stats || nutritionLogs.length === 0) && (
            <Card>
              <div className="p-8 text-center">
                <div className="text-gray-400 mb-4">
                  <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2">No Nutrition Data</h3>
                <p className="text-gray-400 mb-6">
                  Start logging your meals to see detailed nutrition insights and trends.
                </p>
                <Button onClick={() => window.location.href = '/food-diary'}>
                  Log Your First Meal
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default NutritionDashboardPage;