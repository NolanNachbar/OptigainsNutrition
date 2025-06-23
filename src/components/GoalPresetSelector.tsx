import React, { useState } from 'react';
import { GOAL_PRESETS, getPresetsByCategory, applyGoalPreset } from '../utils/goalPresets';
import { UserNutritionProfile } from '../utils/types';

interface GoalPresetSelectorProps {
  profile: UserNutritionProfile;
  onGoalChange: (updatedProfile: UserNutritionProfile) => void;
  onClose: () => void;
}

const GoalPresetSelector: React.FC<GoalPresetSelectorProps> = ({ 
  profile, 
  onGoalChange, 
  onClose 
}) => {
  const [selectedPreset, setSelectedPreset] = useState<string>('');
  const [showDetails, setShowDetails] = useState<string>('');
  const presetCategories = getPresetsByCategory();

  const handleApplyPreset = () => {
    if (selectedPreset) {
      try {
        const updatedProfile = applyGoalPreset(profile, selectedPreset);
        onGoalChange(updatedProfile);
        onClose();
      } catch (error) {
        console.error('Error applying goal preset:', error);
      }
    }
  };

  const getPresetKey = (presetName: string) => {
    return Object.keys(GOAL_PRESETS).find(key => 
      GOAL_PRESETS[key].name === presetName
    ) || '';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Choose Your Goal</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-8">
          {Object.entries(presetCategories).map(([category, presets]) => (
            <div key={category}>
              <h3 className="text-lg font-semibold text-white mb-4">{category}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {presets.map((preset) => {
                  const presetKey = getPresetKey(preset.name);
                  const isSelected = selectedPreset === presetKey;
                  const showingDetails = showDetails === presetKey;

                  return (
                    <div
                      key={presetKey}
                      className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                        isSelected 
                          ? 'border-blue-500 bg-blue-900 bg-opacity-20' 
                          : 'border-gray-600 hover:border-gray-500'
                      }`}
                      onClick={() => setSelectedPreset(presetKey)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold text-white">{preset.name}</h4>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowDetails(showingDetails ? '' : presetKey);
                          }}
                          className="text-gray-400 hover:text-white text-sm"
                        >
                          {showingDetails ? 'Hide' : 'Details'}
                        </button>
                      </div>
                      
                      <p className="text-gray-300 text-sm mb-3">{preset.description}</p>
                      
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">
                          {preset.weeklyWeightTarget === 0 
                            ? 'Maintain weight' 
                            : `${preset.weeklyWeightTarget > 0 ? '+' : ''}${preset.weeklyWeightTarget} lbs/week`
                          }
                        </span>
                        <span className="text-gray-400">
                          {preset.calorieAdjustment === 0 
                            ? 'TDEE calories' 
                            : `${preset.calorieAdjustment > 0 ? '+' : ''}${preset.calorieAdjustment}% calories`
                          }
                        </span>
                      </div>

                      {showingDetails && (
                        <div className="mt-4 pt-4 border-t border-gray-600 space-y-3">
                          <div>
                            <h5 className="text-sm font-medium text-green-400 mb-1">Benefits:</h5>
                            <ul className="text-xs text-gray-300 space-y-1">
                              {preset.benefits.map((benefit, index) => (
                                <li key={index}>• {benefit}</li>
                              ))}
                            </ul>
                          </div>
                          
                          <div>
                            <h5 className="text-sm font-medium text-yellow-400 mb-1">Considerations:</h5>
                            <ul className="text-xs text-gray-300 space-y-1">
                              {preset.drawbacks.map((drawback, index) => (
                                <li key={index}>• {drawback}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-4 mt-8">
          <button
            onClick={onClose}
            className="px-6 py-2 text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleApplyPreset}
            disabled={!selectedPreset}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Apply Goal
          </button>
        </div>
      </div>
    </div>
  );
};

export default GoalPresetSelector;