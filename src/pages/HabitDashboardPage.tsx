import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { format } from 'date-fns';
import Actionbar from '../components/Actionbar';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { 
  getHabitEntries, 
  createOrUpdateHabitEntry,
  getHabitStreak,
  getNutritionLogs,
  getWeightEntries,
  getUserProfile
} from '../utils/database';
import { HabitEntry, UserNutritionProfile } from '../utils/types';

interface HabitStats {
  streaks: {
    logged_food: number;
    logged_weight: number;
    hit_calorie_target: number;
    hit_protein_target: number;
    exercise_completed: number;
  };
  weeklyCompletion: {
    [key: string]: number;
  };
  patterns: {
    bestDay: string;
    worstDay: string;
    averageScore: number;
  };
}

const HabitDashboardPage: React.FC = () => {
  const { user } = useUser();
  const [habitEntries, setHabitEntries] = useState<HabitEntry[]>([]);
  const [todayEntry, setTodayEntry] = useState<HabitEntry | null>(null);
  const [stats, setStats] = useState<HabitStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userProfile, setUserProfile] = useState<UserNutritionProfile | null>(null);

  const today = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    if (user) {
      fetchHabitData();
      generateTodayEntry();
    }
  }, [user]);

  const fetchHabitData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const [habits, profile] = await Promise.all([
        getHabitEntries(user.id, 30),
        getUserProfile(user.id)
      ]);

      setHabitEntries(habits);
      setUserProfile(profile);

      // Find today's entry
      const todayHabit = habits.find(h => h.date === today);
      if (todayHabit) {
        setTodayEntry(todayHabit);
      }

      // Calculate stats
      await calculateStats();
    } catch (error) {
      console.error('Error fetching habit data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateTodayEntry = async () => {
    if (!user) return;

    try {
      // Auto-generate today's habit entry based on actual data
      const [nutritionLogs, weightEntries] = await Promise.all([
        getNutritionLogs(user.id, 1),
        getWeightEntries(user.id, 1)
      ]);

      const todayLog = nutritionLogs.find(log => log.date === today);
      const todayWeight = weightEntries.find(w => w.date === today);

      if (todayLog && userProfile) {
        const calorieTarget = userProfile.target_macros.calories;
        const proteinTarget = userProfile.target_macros.protein;

        const autoEntry: Partial<HabitEntry> = {
          logged_food: !!todayLog,
          logged_weight: !!todayWeight,
          hit_calorie_target: todayLog ? Math.abs(todayLog.calories - calorieTarget) <= calorieTarget * 0.1 : false,
          hit_protein_target: todayLog ? todayLog.protein >= proteinTarget * 0.9 : false,
        };

        setTodayEntry(prev => prev ? { ...prev, ...autoEntry } : {
          clerk_user_id: user.id,
          date: today,
          logged_food: false,
          logged_weight: false,
          hit_calorie_target: false,
          hit_protein_target: false,
          exercise_completed: false,
          stress_level: 3,
          energy_level: 3,
          hunger_level: 3,
          ...autoEntry
        } as HabitEntry);
      }
    } catch (error) {
      console.error('Error generating today entry:', error);
    }
  };

  const calculateStats = async () => {
    if (!user) return;

    try {
      const streaks = {
        logged_food: await getHabitStreak(user.id, 'logged_food'),
        logged_weight: await getHabitStreak(user.id, 'logged_weight'),
        hit_calorie_target: await getHabitStreak(user.id, 'hit_calorie_target'),
        hit_protein_target: await getHabitStreak(user.id, 'hit_protein_target'),
        exercise_completed: await getHabitStreak(user.id, 'exercise_completed'),
      };

      // Calculate weekly completion rates
      const weeklyCompletion: { [key: string]: number } = {};
      const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      
      dayNames.forEach(day => {
        const dayEntries = habitEntries.filter(entry => {
          const entryDay = format(new Date(entry.date), 'EEEE');
          return entryDay === day;
        });

        if (dayEntries.length > 0) {
          const completionScore = dayEntries.reduce((sum, entry) => {
            const score = (entry.logged_food ? 1 : 0) + 
                         (entry.logged_weight ? 1 : 0) + 
                         (entry.hit_calorie_target ? 1 : 0) + 
                         (entry.hit_protein_target ? 1 : 0) + 
                         (entry.exercise_completed ? 1 : 0);
            return sum + (score / 5);
          }, 0);
          weeklyCompletion[day] = Math.round((completionScore / dayEntries.length) * 100);
        } else {
          weeklyCompletion[day] = 0;
        }
      });

      // Find patterns
      const sortedDays = Object.entries(weeklyCompletion).sort(([,a], [,b]) => b - a);
      const bestDay = sortedDays[0]?.[0] || 'None';
      const worstDay = sortedDays[sortedDays.length - 1]?.[0] || 'None';
      const averageScore = Object.values(weeklyCompletion).reduce((sum, score) => sum + score, 0) / Object.values(weeklyCompletion).length;

      setStats({
        streaks,
        weeklyCompletion,
        patterns: {
          bestDay,
          worstDay,
          averageScore: Math.round(averageScore)
        }
      });
    } catch (error) {
      console.error('Error calculating stats:', error);
    }
  };

  const updateTodayEntry = async (updates: Partial<HabitEntry>) => {
    if (!user || !todayEntry) return;

    setSaving(true);
    try {
      const updatedEntry = { ...todayEntry, ...updates };
      await createOrUpdateHabitEntry(updatedEntry);
      setTodayEntry(updatedEntry);
      
      // Refresh data to update streaks
      await fetchHabitData();
    } catch (error) {
      console.error('Error updating habit entry:', error);
    } finally {
      setSaving(false);
    }
  };

  const getStreakColor = (streak: number) => {
    if (streak >= 7) return 'text-green-500';
    if (streak >= 3) return 'text-yellow-500';
    return 'text-gray-400';
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Actionbar />
        <div className="pt-24 flex items-center justify-center min-h-screen">
          <div className="text-gray-400">Loading habit data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <Actionbar />
      
      <div className="w-full pt-20 pb-20">
        <div className="max-w-6xl mx-auto px-4">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold tracking-tight">Habit Dashboard</h1>
            <p className="text-gray-400 mt-2">Build consistent nutrition and lifestyle habits</p>
          </div>

          {/* Today's Habits */}
          <Card className="mb-6">
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">Today's Check-in</h2>
              
              {todayEntry && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div className="text-center">
                    <button
                      onClick={() => updateTodayEntry({ logged_food: !todayEntry.logged_food })}
                      className={`w-full p-4 rounded-lg border-2 transition-all ${
                        todayEntry.logged_food
                          ? 'border-green-500 bg-green-500/10 text-green-500'
                          : 'border-gray-600 hover:border-gray-500'
                      }`}
                      disabled={saving}
                    >
                      <div className="text-2xl mb-2">🍽️</div>
                      <div className="font-medium">Food Logged</div>
                    </button>
                  </div>

                  <div className="text-center">
                    <button
                      onClick={() => updateTodayEntry({ logged_weight: !todayEntry.logged_weight })}
                      className={`w-full p-4 rounded-lg border-2 transition-all ${
                        todayEntry.logged_weight
                          ? 'border-green-500 bg-green-500/10 text-green-500'
                          : 'border-gray-600 hover:border-gray-500'
                      }`}
                      disabled={saving}
                    >
                      <div className="text-2xl mb-2">⚖️</div>
                      <div className="font-medium">Weight Logged</div>
                    </button>
                  </div>

                  <div className="text-center">
                    <button
                      onClick={() => updateTodayEntry({ hit_calorie_target: !todayEntry.hit_calorie_target })}
                      className={`w-full p-4 rounded-lg border-2 transition-all ${
                        todayEntry.hit_calorie_target
                          ? 'border-green-500 bg-green-500/10 text-green-500'
                          : 'border-gray-600 hover:border-gray-500'
                      }`}
                      disabled={saving}
                    >
                      <div className="text-2xl mb-2">🎯</div>
                      <div className="font-medium">Calorie Target</div>
                    </button>
                  </div>

                  <div className="text-center">
                    <button
                      onClick={() => updateTodayEntry({ hit_protein_target: !todayEntry.hit_protein_target })}
                      className={`w-full p-4 rounded-lg border-2 transition-all ${
                        todayEntry.hit_protein_target
                          ? 'border-green-500 bg-green-500/10 text-green-500'
                          : 'border-gray-600 hover:border-gray-500'
                      }`}
                      disabled={saving}
                    >
                      <div className="text-2xl mb-2">💪</div>
                      <div className="font-medium">Protein Target</div>
                    </button>
                  </div>

                  <div className="text-center">
                    <button
                      onClick={() => updateTodayEntry({ exercise_completed: !todayEntry.exercise_completed })}
                      className={`w-full p-4 rounded-lg border-2 transition-all ${
                        todayEntry.exercise_completed
                          ? 'border-green-500 bg-green-500/10 text-green-500'
                          : 'border-gray-600 hover:border-gray-500'
                      }`}
                      disabled={saving}
                    >
                      <div className="text-2xl mb-2">🏃</div>
                      <div className="font-medium">Exercise</div>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Streaks */}
          {stats && (
            <>
              <Card className="mb-6">
                <div className="p-6">
                  <h2 className="text-xl font-semibold mb-4">Current Streaks</h2>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="text-center">
                      <div className={`text-3xl font-bold ${getStreakColor(stats.streaks.logged_food)}`}>
                        {stats.streaks.logged_food}
                      </div>
                      <div className="text-sm text-gray-400">Food Logging</div>
                    </div>
                    <div className="text-center">
                      <div className={`text-3xl font-bold ${getStreakColor(stats.streaks.logged_weight)}`}>
                        {stats.streaks.logged_weight}
                      </div>
                      <div className="text-sm text-gray-400">Weight Tracking</div>
                    </div>
                    <div className="text-center">
                      <div className={`text-3xl font-bold ${getStreakColor(stats.streaks.hit_calorie_target)}`}>
                        {stats.streaks.hit_calorie_target}
                      </div>
                      <div className="text-sm text-gray-400">Calorie Targets</div>
                    </div>
                    <div className="text-center">
                      <div className={`text-3xl font-bold ${getStreakColor(stats.streaks.hit_protein_target)}`}>
                        {stats.streaks.hit_protein_target}
                      </div>
                      <div className="text-sm text-gray-400">Protein Targets</div>
                    </div>
                    <div className="text-center">
                      <div className={`text-3xl font-bold ${getStreakColor(stats.streaks.exercise_completed)}`}>
                        {stats.streaks.exercise_completed}
                      </div>
                      <div className="text-sm text-gray-400">Exercise</div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Weekly Patterns */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <Card>
                  <div className="p-6">
                    <h2 className="text-xl font-semibold mb-4">Weekly Patterns</h2>
                    <div className="space-y-3">
                      {Object.entries(stats.weeklyCompletion).map(([day, score]) => (
                        <div key={day} className="flex justify-between items-center">
                          <span>{day}</span>
                          <span className={`font-medium ${getScoreColor(score)}`}>
                            {score}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>

                <Card>
                  <div className="p-6">
                    <h2 className="text-xl font-semibold mb-4">Insights</h2>
                    <div className="space-y-4">
                      <div>
                        <div className="text-sm text-gray-400">Best Day</div>
                        <div className="text-lg font-medium text-green-500">{stats.patterns.bestDay}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-400">Most Challenging Day</div>
                        <div className="text-lg font-medium text-red-500">{stats.patterns.worstDay}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-400">Average Completion</div>
                        <div className={`text-lg font-medium ${getScoreColor(stats.patterns.averageScore)}`}>
                          {stats.patterns.averageScore}%
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            </>
          )}

          {/* Recent History */}
          <Card>
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">Recent History</h2>
              <div className="space-y-3">
                {habitEntries.slice(0, 7).map((entry, index) => {
                  const completionScore = 
                    (entry.logged_food ? 1 : 0) + 
                    (entry.logged_weight ? 1 : 0) + 
                    (entry.hit_calorie_target ? 1 : 0) + 
                    (entry.hit_protein_target ? 1 : 0) + 
                    (entry.exercise_completed ? 1 : 0);
                  const percentage = Math.round((completionScore / 5) * 100);

                  return (
                    <div key={entry.id || index} className="flex justify-between items-center p-4 bg-gray-800/50 rounded-lg">
                      <div>
                        <div className="font-medium">{format(new Date(entry.date), 'MMM d, yyyy')}</div>
                        <div className="text-sm text-gray-400">
                          {entry.logged_food ? '✅' : '❌'} Food • 
                          {entry.logged_weight ? '✅' : '❌'} Weight • 
                          {entry.hit_calorie_target ? '✅' : '❌'} Calories • 
                          {entry.hit_protein_target ? '✅' : '❌'} Protein • 
                          {entry.exercise_completed ? '✅' : '❌'} Exercise
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-lg font-semibold ${getScoreColor(percentage)}`}>
                          {percentage}%
                        </div>
                        <div className="text-sm text-gray-400">
                          {completionScore}/5 completed
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>

          {/* No Data State */}
          {habitEntries.length === 0 && (
            <Card>
              <div className="p-8 text-center">
                <div className="text-gray-400 mb-4">
                  <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2">Start Building Habits</h3>
                <p className="text-gray-400 mb-6">
                  Track your daily nutrition and lifestyle habits to build consistency.
                </p>
                <Button onClick={generateTodayEntry}>
                  Create Today's Entry
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default HabitDashboardPage;