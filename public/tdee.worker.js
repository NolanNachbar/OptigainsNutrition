// Web Worker for TDEE calculations
// This runs in a separate thread to avoid blocking the UI

// Simplified TDEE calculation functions
function calculateWeightTrend(weights, smoothingFactor = 0.1) {
  if (!weights || weights.length === 0) return [];
  
  const sortedWeights = [...weights].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  
  const trendPoints = [];
  let trendWeight = sortedWeights[0].weight;
  
  sortedWeights.forEach((entry) => {
    trendWeight = entry.weight * smoothingFactor + trendWeight * (1 - smoothingFactor);
    trendPoints.push({
      date: entry.date,
      actualWeight: entry.weight,
      trendWeight: trendWeight,
      deviation: entry.weight - trendWeight
    });
  });
  
  return trendPoints;
}

function analyzeWeightTrend(trendPoints) {
  if (!trendPoints || trendPoints.length < 2) {
    return { weeklyChange: 0, direction: 'maintaining' };
  }
  
  const recent = trendPoints.slice(-7);
  const weekAgo = recent[0];
  const today = recent[recent.length - 1];
  
  const weeklyChange = today.trendWeight - weekAgo.trendWeight;
  let direction = 'maintaining';
  
  if (weeklyChange > 0.2) direction = 'gaining';
  else if (weeklyChange < -0.2) direction = 'losing';
  
  return { weeklyChange, direction };
}

function calculateAdherenceScore(actualCalories, targetCalories) {
  if (!targetCalories) return 0;
  const ratio = actualCalories / targetCalories;
  return Math.min(100, Math.max(0, 100 - Math.abs(1 - ratio) * 100));
}

// Main calculation function
function calculateAdaptiveTDEE({ weights, nutritionLogs, targetMacros }) {
  // Calculate weight trend
  const trendPoints = calculateWeightTrend(weights);
  const { weeklyChange, direction } = analyzeWeightTrend(trendPoints);
  
  // Calculate average intake
  const recentLogs = nutritionLogs.slice(-14); // Last 2 weeks
  const avgCalories = recentLogs.reduce((sum, log) => sum + log.calories, 0) / recentLogs.length;
  
  // Adherence-neutral TDEE calculation
  // TDEE = Average Intake ± (Weight Change × 7700 cal/kg) ÷ Days
  const daysTracked = recentLogs.length;
  const calorieAdjustment = (weeklyChange * 7700) / 7; // Daily calorie equivalent
  const calculatedTDEE = Math.round(avgCalories - calorieAdjustment);
  
  // Calculate confidence based on data quality
  let confidence = 0;
  if (weights.length >= 14) confidence += 30;
  if (weights.length >= 7) confidence += 20;
  if (recentLogs.length >= 14) confidence += 30;
  if (recentLogs.length >= 7) confidence += 20;
  
  const confidenceLevel = confidence >= 80 ? 'high' : confidence >= 50 ? 'medium' : 'low';
  
  // Calculate adherence
  const todayLog = nutritionLogs[nutritionLogs.length - 1];
  const adherenceScore = todayLog ? calculateAdherenceScore(todayLog.calories, targetMacros.calories) : 0;
  
  return {
    currentTDEE: calculatedTDEE || targetMacros.calories,
    weeklyChange,
    confidence: confidenceLevel,
    trendDirection: direction,
    adherenceScore,
    dataPoints: {
      weights: weights.length,
      logs: nutritionLogs.length
    }
  };
}

// Listen for messages from main thread
self.addEventListener('message', (event) => {
  const { type, data } = event.data;
  
  switch (type) {
    case 'calculateTDEE':
      try {
        const result = calculateAdaptiveTDEE(data);
        self.postMessage({ type: 'tdeeResult', data: result });
      } catch (error) {
        self.postMessage({ type: 'error', error: error.message });
      }
      break;
      
    case 'calculateTrend':
      try {
        const trend = calculateWeightTrend(data.weights, data.smoothingFactor);
        self.postMessage({ type: 'trendResult', data: trend });
      } catch (error) {
        self.postMessage({ type: 'error', error: error.message });
      }
      break;
      
    default:
      self.postMessage({ type: 'error', error: 'Unknown message type' });
  }
});