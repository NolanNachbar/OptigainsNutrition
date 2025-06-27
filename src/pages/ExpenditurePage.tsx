import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { format } from 'date-fns';
import Actionbar from '../components/Actionbar';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { MultiProgressRing } from '../components/ui/ProgressRing';
import { 
  getExpenditureData, 
  createExpenditureData,
  getWeightEntries,
  getNutritionLogs,
  getUserProfile
} from '../utils/database';
import { ExpenditureData, UserNutritionProfile, NutritionLog } from '../utils/types';
import { calculateAdaptiveTDEE, TDEEData } from '../utils/adaptiveTDEE';
import { getComponentBreakdown } from '../utils/energyExpenditure';
import { calculateDataQuality } from '../utils/behavioralModeling';

const ExpenditurePage: React.FC = () => {
  const { user } = useUser();
  const [expenditureData, setExpenditureData] = useState<ExpenditureData[]>([]);
  const [tdeeData, setTdeeData] = useState<TDEEData | null>(null);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [userProfile, setUserProfile] = useState<UserNutritionProfile | null>(null);
  const [logs, setLogs] = useState<NutritionLog[]>([]);
  const [dataQuality, setDataQuality] = useState<any>(null);
  const [showComponents, setShowComponents] = useState(false);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const [expenditure, profile, weightData, nutritionLogs] = await Promise.all([
        getExpenditureData(user.id, 30),
        getUserProfile(user.id),
        getWeightEntries(user.id, 30),
        getNutritionLogs(user.id, 30)
      ]);

      setExpenditureData(expenditure);
      setUserProfile(profile);
      setLogs(nutritionLogs);

      // Calculate enhanced TDEE data
      if (profile && weightData.length > 0 && nutritionLogs.length > 0) {
        const biologicalData = {
          age: 30, // This should come from user data
          sex: 'male' as const, // This should come from user data
          weightKg: weightData[0]?.weight || 70,
          heightCm: 175, // This should come from user data
          bodyFatPercentage: undefined
        };

        const activityData = {
          activityLevel: profile.activity_level || 'moderate' as const
        };

        const tdee = calculateAdaptiveTDEE(
          weightData,
          nutritionLogs,
          profile.target_macros,
          biologicalData,
          activityData
        );
        
        setTdeeData(tdee);

        // Calculate data quality
        const quality = calculateDataQuality(nutritionLogs, weightData);
        setDataQuality(quality);
      }
    } catch (error) {
      console.error('Error fetching expenditure data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateNewTDEE = async () => {
    if (!user || !userProfile) return;

    setCalculating(true);
    try {
      await fetchData(); // Refresh all data
      
      if (tdeeData) {
        // Save the TDEE calculation to database
        const expenditureEntry: Omit<ExpenditureData, 'id' | 'created_at'> = {
          clerk_user_id: user.id,
          date: new Date().toISOString().split('T')[0],
          estimated_tdee: tdeeData.currentTDEE,
          confidence: tdeeData.confidence,
          weight_kg: tdeeData.trendWeight,
          calories_consumed: logs.length > 0 ? 
            logs.reduce((sum, log) => sum + log.calories, 0) / logs.length : 0,
          weight_change_7d: tdeeData.dailyChangeRate * 7,
          weight_change_14d: tdeeData.dailyChangeRate * 14,
          trend: tdeeData.weightTrend,
          calorie_average_7d: Math.round(
            logs.slice(0, 7).reduce((sum, log) => sum + log.calories, 0) / Math.min(logs.length, 7)
          ),
          calorie_average_14d: Math.round(
            logs.slice(0, 14).reduce((sum, log) => sum + log.calories, 0) / Math.min(logs.length, 14)
          ),
          algorithm_version: '2.0'
        };
        
        await createExpenditureData(expenditureEntry);
        await fetchData(); // Refresh data
      }
    } catch (error) {
      console.error('Error calculating TDEE:', error);
      alert('Failed to calculate TDEE');
    } finally {
      setCalculating(false);
    }
  };

  const formatTrend = (trend: string) => {
    switch (trend) {
      case 'gaining': return { text: 'Gaining', color: 'text-green-500' };
      case 'losing': return { text: 'Losing', color: 'text-red-500' };
      case 'maintaining': return { text: 'Maintaining', color: 'text-blue-500' };
      default: return { text: 'Unknown', color: 'text-gray-400' };
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-500';
    if (confidence >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Actionbar />
        <div className="pt-24 flex items-center justify-center min-h-screen">
          <div className="text-gray-400">Loading expenditure data...</div>
        </div>
      </div>
    );
  }

  const trendInfo = tdeeData ? formatTrend(tdeeData.weightTrend) : null;

  return (
    <div className="min-h-screen bg-gray-900">
      <Actionbar />
      
      <div className="w-full pt-20 pb-20">
        <div className="max-w-6xl mx-auto px-4">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold tracking-tight">Energy Expenditure</h1>
            <p className="text-gray-400 mt-2">MacroFactor-style adherence-neutral TDEE tracking</p>
          </div>

          {/* Current TDEE Card */}
          <Card className="mb-6">
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-500">
                    {tdeeData ? tdeeData.currentTDEE : userProfile?.tdee_estimate || 'N/A'}
                  </div>
                  <div className="text-sm text-gray-400 mt-1">Current TDEE</div>
                  <div className="text-xs text-gray-500 mt-1">{tdeeData?.methodology || 'initial'} method</div>
                </div>

                <div className="text-center">
                  <div className={`text-2xl font-bold ${getConfidenceColor(tdeeData?.confidence || 0)}`}>
                    {tdeeData?.confidence || 0}%
                  </div>
                  <div className="text-sm text-gray-400 mt-1">Confidence</div>
                  <div className={`text-xs mt-1 ${getConfidenceColor(tdeeData?.confidence || 0)}`}>
                    {tdeeData?.confidenceLevel || 'Low'}
                  </div>
                </div>

                <div className="text-center">
                  {trendInfo && tdeeData && (
                    <>
                      <div className={`text-2xl font-bold ${trendInfo.color}`}>
                        {trendInfo.text}
                      </div>
                      <div className="text-sm text-gray-400 mt-1">Weight Trend</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {tdeeData.weeklyChangeRate > 0 ? '+' : ''}{tdeeData.weeklyChangeRate.toFixed(2)}% / week
                      </div>
                    </>
                  )}
                </div>

                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-500">
                    {tdeeData?.adherenceScore || 0}%
                  </div>
                  <div className="text-sm text-gray-400 mt-1">Adherence</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {tdeeData?.dataQuality || 'low'} quality data
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-center gap-2">
                <Button 
                  onClick={calculateNewTDEE}
                  loading={calculating}
                  disabled={calculating || !tdeeData}
                >
                  {calculating ? 'Calculating...' : 'Save TDEE Update'}
                </Button>
                {tdeeData?.energyComponents && (
                  <Button
                    variant="secondary"
                    onClick={() => setShowComponents(!showComponents)}
                  >
                    {showComponents ? 'Hide' : 'Show'} Components
                  </Button>
                )}
              </div>
            </div>
          </Card>

          {/* Energy Component Breakdown */}
          {showComponents && tdeeData?.energyComponents && (
            <Card className="mb-6">
              <div className="p-6">
                <h2 className="text-xl font-semibold mb-4">Energy Expenditure Breakdown</h2>
                <div className="flex justify-center mb-6">
                  <MultiProgressRing
                    size={200}
                    strokeWidth={24}
                    values={getComponentBreakdown(tdeeData.energyComponents).map(comp => ({
                      value: comp.percentage,
                      color: comp.color,
                      label: comp.label
                    }))}
                  />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {getComponentBreakdown(tdeeData.energyComponents).map(comp => (
                    <div key={comp.label} className="text-center">
                      <div className="text-2xl font-bold" style={{ color: comp.color }}>
                        {comp.value}
                      </div>
                      <div className="text-sm text-gray-400">{comp.label}</div>
                      <div className="text-xs text-gray-500">{Math.round(comp.percentage)}%</div>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-gray-400 mt-4 text-center">
                  {tdeeData.energyComponents.confidence > 0.7 
                    ? 'High confidence breakdown based on your data'
                    : 'Estimated breakdown - provide more data for accuracy'}
                </p>
              </div>
            </Card>
          )}

          {/* Data Quality Card */}
          {dataQuality && (
            <Card className="mb-6">
              <div className="p-6">
                <h2 className="text-xl font-semibold mb-4">Data Quality Analysis</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${getConfidenceColor(dataQuality.overallQuality * 100)}`}>
                      {Math.round(dataQuality.overallQuality * 100)}%
                    </div>
                    <div className="text-sm text-gray-400">Overall Quality</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-500">
                      {Math.round(dataQuality.loggingDensity * 100)}%
                    </div>
                    <div className="text-sm text-gray-400">Logging Density</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-500">
                      {Math.round(dataQuality.weighingFrequency * 100)}%
                    </div>
                    <div className="text-sm text-gray-400">Weighing Frequency</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-500">
                      {Math.round(dataQuality.dataStability * 100)}%
                    </div>
                    <div className="text-sm text-gray-400">Data Stability</div>
                  </div>
                </div>
                
                {dataQuality.patterns.length > 0 && (
                  <div className="mb-4">
                    <h3 className="font-medium mb-2">Detected Patterns</h3>
                    <div className="space-y-2">
                      {dataQuality.patterns.map((pattern: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-800 rounded">
                          <span className="text-sm">{pattern.description}</span>
                          <span className={`text-xs px-2 py-1 rounded ${
                            pattern.impact === 'positive' ? 'bg-green-900 text-green-300' :
                            pattern.impact === 'negative' ? 'bg-red-900 text-red-300' :
                            'bg-gray-700 text-gray-300'
                          }`}>
                            {pattern.impact}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {dataQuality.recommendations.length > 0 && (
                  <div>
                    <h3 className="font-medium mb-2">Recommendations</h3>
                    <ul className="space-y-1">
                      {dataQuality.recommendations.map((rec: string, index: number) => (
                        <li key={index} className="text-sm text-gray-400 flex items-start">
                          <span className="text-blue-500 mr-2">•</span>
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Algorithm Explanation */}
          <Card className="mb-6">
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">How It Works</h2>
              <div className="space-y-3 text-gray-300">
                <p>
                  <strong className="text-white">Adherence-Neutral Algorithm:</strong> Calculates your TDEE 
                  backwards from actual weight changes and logged intake, without assuming you hit targets.
                </p>
                <p>
                  <strong className="text-white">Weight Trend Modeling:</strong> Uses exponential smoothing 
                  to separate signal from noise in weight fluctuations, adapting to rapid changes.
                </p>
                <p>
                  <strong className="text-white">Energy Balance:</strong> TDEE = Average Intake ± 
                  (Weight Change × 7700 cal/kg) ÷ Days
                </p>
                <p>
                  <strong className="text-white">Multi-Factor Confidence:</strong> Considers logging consistency, 
                  weight entry frequency, and data stability to provide confidence scores.
                </p>
                <p>
                  <strong className="text-white">Component Breakdown:</strong> Models BMR, TEF, EAT, and NEAT 
                  to understand why your TDEE might be changing over time.
                </p>
              </div>
            </div>
          </Card>

          {/* Historical Data */}
          {expenditureData.length > 0 && (
            <Card>
              <div className="p-6">
                <h2 className="text-xl font-semibold mb-4">TDEE History</h2>
                <div className="space-y-3">
                  {expenditureData.slice(0, 10).map((data, index) => (
                    <div key={data.id || index} className="flex justify-between items-center p-4 bg-gray-800/50 rounded-lg">
                      <div>
                        <div className="font-medium">{format(new Date(data.date), 'MMM d, yyyy')}</div>
                        <div className="text-sm text-gray-400">
                          Weight: {data.weight_kg.toFixed(1)}kg • 
                          Calories: {Math.round(data.calories_consumed)} • 
                          Change: {data.weight_change_7d > 0 ? '+' : ''}{data.weight_change_7d.toFixed(2)}kg
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-semibold">{data.estimated_tdee} cal</div>
                        <div className={`text-sm ${getConfidenceColor(data.confidence)}`}>
                          {data.confidence}% confidence
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}

          {/* No Data State */}
          {expenditureData.length === 0 && (
            <Card>
              <div className="p-8 text-center">
                <div className="text-gray-400 mb-4">
                  <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2">No Expenditure Data Yet</h3>
                <p className="text-gray-400 mb-6">
                  Start logging your weight and food intake for at least 7 days to get your first TDEE estimate.
                </p>
                <Button onClick={calculateNewTDEE} loading={calculating}>
                  Calculate Initial TDEE
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExpenditurePage;