import React from 'react';
interface SimpleRecommendation {
  type: string;
  message: string;
  severity: 'info' | 'warning' | 'success';
  suggestedChanges?: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
  };
}

interface CoachingRecommendationsProps {
  recommendations: SimpleRecommendation[];
  onApplyChanges?: (changes: any) => void;
}

const CoachingRecommendations: React.FC<CoachingRecommendationsProps> = ({ 
  recommendations, 
  onApplyChanges 
}) => {
  if (recommendations.length === 0) {
    return null;
  }

  const getSeverityStyles = (severity: string) => {
    switch (severity) {
      case 'success':
        return 'bg-green-900 border-green-700 text-green-100';
      case 'warning':
        return 'bg-yellow-900 border-yellow-700 text-yellow-100';
      case 'info':
        return 'bg-blue-900 border-blue-700 text-blue-100';
      default:
        return 'bg-gray-800 border-gray-700 text-gray-100';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'success':
        return (
          <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'warning':
        return (
          <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.498 0L3.316 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        );
      case 'info':
        return (
          <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return null;
    }
  };

  const formatSuggestedChanges = (changes: any) => {
    const parts = [];
    if (changes.calories) {
      parts.push(`${changes.calories > 0 ? '+' : ''}${changes.calories} calories`);
    }
    if (changes.protein) {
      parts.push(`${changes.protein > 0 ? '+' : ''}${changes.protein}g protein`);
    }
    if (changes.carbs) {
      parts.push(`${changes.carbs > 0 ? '+' : ''}${changes.carbs}g carbs`);
    }
    if (changes.fat) {
      parts.push(`${changes.fat > 0 ? '+' : ''}${changes.fat}g fat`);
    }
    return parts.join(', ');
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white">Coaching Recommendations</h3>
      
      {recommendations.map((rec, index) => (
        <div 
          key={index}
          className={`rounded-lg border p-4 ${getSeverityStyles(rec.severity)}`}
        >
          <div className="flex items-start gap-3">
            {getSeverityIcon(rec.severity)}
            <div className="flex-1">
              <p className="text-sm leading-relaxed">{rec.message}</p>
              
              {rec.suggestedChanges && (
                <div className="mt-3 flex items-center justify-between">
                  <div className="text-xs opacity-75">
                    Suggested: {formatSuggestedChanges(rec.suggestedChanges)}
                  </div>
                  
                  {onApplyChanges && (
                    <button
                      onClick={() => onApplyChanges(rec.suggestedChanges)}
                      className="text-xs bg-white bg-opacity-10 hover:bg-opacity-20 px-3 py-1 rounded transition-colors"
                    >
                      Apply Changes
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default CoachingRecommendations;