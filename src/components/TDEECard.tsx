import React from 'react';
interface SimpleTDEEData {
  currentTDEE: number;
  weeklyChange: number;
  confidence: 'low' | 'medium' | 'high';
  trendDirection: 'gaining' | 'losing' | 'maintaining';
  adherenceScore: number;
}

interface TDEECardProps {
  tdeeData: SimpleTDEEData | null;
  isLoading?: boolean;
}

const TDEECard: React.FC<TDEECardProps> = ({ tdeeData, isLoading }) => {
  if (isLoading) {
    return (
      <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-700 rounded w-1/3 mb-2"></div>
          <div className="h-8 bg-gray-700 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (!tdeeData) {
    return (
      <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-white mb-2">TDEE Estimate</h3>
        <p className="text-gray-400 text-sm">Need more data to calculate TDEE</p>
      </div>
    );
  }

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high': return 'text-green-400';
      case 'medium': return 'text-yellow-400';
      case 'low': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'gaining': return '↗';
      case 'losing': return '↘';
      case 'maintaining': return '→';
      default: return '→';
    }
  };

  const formatWeeklyChange = (change: number) => {
    if (Math.abs(change) < 0.1) return 'maintaining';
    const direction = change > 0 ? 'gaining' : 'losing';
    return `${direction} ${Math.abs(change).toFixed(1)} lbs/week`;
  };

  return (
    <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-lg font-semibold text-white">Your Metabolism</h3>
        <span className={`text-sm font-medium ${getConfidenceColor(tdeeData.confidence)}`}>
          {tdeeData.confidence} confidence
        </span>
      </div>

      <div className="space-y-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-white">{tdeeData.currentTDEE}</span>
            <span className="text-gray-400">calories/day</span>
          </div>
          <p className="text-sm text-gray-400">Estimated TDEE</p>
        </div>

        <div className="flex justify-between items-center">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg">{getTrendIcon(tdeeData.trendDirection)}</span>
              <span className="text-sm text-gray-300">
                {formatWeeklyChange(tdeeData.weeklyChange)}
              </span>
            </div>
            <p className="text-xs text-gray-500">Weight trend</p>
          </div>

          <div className="text-right">
            <div className="text-lg font-semibold text-white">
              {tdeeData.adherenceScore}%
            </div>
            <p className="text-xs text-gray-500">Adherence</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TDEECard;