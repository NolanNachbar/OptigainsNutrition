import React, { useState, useEffect } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { ErrorBoundary } from './ErrorBoundary';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: string;
  component?: React.ReactNode;
  isOptional?: boolean;
  dependencies?: string[]; // Steps that must be completed first
  estimatedTime?: string;
  category?: 'essential' | 'recommended' | 'advanced';
}

interface ProgressiveOnboardingProps {
  steps: OnboardingStep[];
  onStepComplete: (stepId: string, data?: any) => void;
  onAllComplete: () => void;
  currentStep?: string;
  completedSteps?: string[];
  allowSkip?: boolean;
  showProgressiveDisclosure?: boolean;
}

export const ProgressiveOnboarding: React.FC<ProgressiveOnboardingProps> = ({
  steps,
  onStepComplete,
  onAllComplete,
  currentStep,
  completedSteps = [],
  allowSkip = false,
  showProgressiveDisclosure = true
}) => {
  const [activeStep, setActiveStep] = useState(currentStep || steps[0]?.id);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['essential']) // Always show essential steps
  );
  const [showAdvancedFeatures, setShowAdvancedFeatures] = useState(false);

  // Group steps by category
  const stepsByCategory = steps.reduce((acc, step) => {
    const category = step.category || 'essential';
    if (!acc[category]) acc[category] = [];
    acc[category].push(step);
    return acc;
  }, {} as Record<string, OnboardingStep[]>);

  // Calculate progress
  const totalEssentialSteps = stepsByCategory.essential?.length || 0;
  const completedEssentialSteps = completedSteps.filter(id => 
    stepsByCategory.essential?.some(step => step.id === id)
  ).length;
  const essentialProgress = totalEssentialSteps > 0 ? (completedEssentialSteps / totalEssentialSteps) * 100 : 0;

  const totalSteps = steps.length;
  const totalProgress = (completedSteps.length / totalSteps) * 100;

  // Check if step is available (dependencies met)
  const isStepAvailable = (step: OnboardingStep): boolean => {
    if (!step.dependencies) return true;
    return step.dependencies.every(dep => completedSteps.includes(dep));
  };

  // Get next available step
  const getNextAvailableStep = (): OnboardingStep | null => {
    return steps.find(step => 
      !completedSteps.includes(step.id) && isStepAvailable(step)
    ) || null;
  };

  // Auto-advance to next step
  useEffect(() => {
    if (activeStep && completedSteps.includes(activeStep)) {
      const nextStep = getNextAvailableStep();
      if (nextStep) {
        setActiveStep(nextStep.id);
      } else {
        // All available steps completed
        const essentialIncomplete = stepsByCategory.essential?.some(step => 
          !completedSteps.includes(step.id)
        );
        
        if (!essentialIncomplete) {
          // Show advanced features after essentials
          setShowAdvancedFeatures(true);
          if (stepsByCategory.recommended?.length) {
            setExpandedCategories(prev => new Set([...prev, 'recommended']));
          }
        }
      }
    }
  }, [completedSteps, activeStep]);

  // Progressive disclosure logic
  useEffect(() => {
    if (showProgressiveDisclosure && essentialProgress >= 100) {
      setShowAdvancedFeatures(true);
      // Auto-expand recommended features
      if (stepsByCategory.recommended?.length) {
        setTimeout(() => {
          setExpandedCategories(prev => new Set([...prev, 'recommended']));
        }, 1000);
      }
    }
  }, [essentialProgress, showProgressiveDisclosure]);

  const handleStepComplete = (stepId: string, data?: any) => {
    onStepComplete(stepId, data);
    
    // Check if all essential steps are complete
    const allEssentialComplete = stepsByCategory.essential?.every(step => 
      completedSteps.includes(step.id) || step.id === stepId
    );
    
    if (allEssentialComplete && !showAdvancedFeatures) {
      setShowAdvancedFeatures(true);
    }

    // Check if completely done
    const allComplete = steps.every(step => 
      completedSteps.includes(step.id) || step.id === stepId || step.isOptional
    );
    
    if (allComplete) {
      onAllComplete();
    }
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  const currentStepData = steps.find(step => step.id === activeStep);

  const categoryOrder = ['essential', 'recommended', 'advanced'];
  const categoryLabels: Record<string, string> = {
    essential: 'Getting Started',
    recommended: 'Enhance Your Experience',
    advanced: 'Power User Features'
  };

  const categoryDescriptions: Record<string, string> = {
    essential: 'Complete these steps to start tracking your nutrition effectively.',
    recommended: 'Optional features that will improve your tracking experience.',
    advanced: 'Advanced features for detailed analysis and optimization.'
  };

  return (
    <ErrorBoundary level="component">
      <div className="space-y-6">
        {/* Progress Overview */}
        <Card variant="glass" className="p-6">
          <div className="text-center mb-4">
            <h2 className="text-2xl font-bold mb-2">Welcome to OptiGains!</h2>
            <p className="text-gray-400">
              Let's get you set up for successful nutrition tracking
            </p>
          </div>
          
          {/* Essential Progress */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Essential Setup</span>
              <span className="text-sm text-gray-400">
                {completedEssentialSteps}/{totalEssentialSteps}
              </span>
            </div>
            <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 transition-all duration-700 ease-out"
                style={{ width: `${essentialProgress}%` }}
              />
            </div>
          </div>

          {/* Total Progress (if showing advanced) */}
          {showAdvancedFeatures && (
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Overall Progress</span>
                <span className="text-sm text-gray-400">
                  {completedSteps.length}/{totalSteps}
                </span>
              </div>
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-500 transition-all duration-700 ease-out"
                  style={{ width: `${totalProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Quick stats */}
          <div className="flex justify-center gap-4 text-sm text-gray-400">
            <span>🎯 Essential: {Math.round(essentialProgress)}%</span>
            {showAdvancedFeatures && (
              <span>📊 Overall: {Math.round(totalProgress)}%</span>
            )}
          </div>
        </Card>

        {/* Step Categories */}
        {categoryOrder.map(category => {
          const categorySteps = stepsByCategory[category] || [];
          if (categorySteps.length === 0) return null;
          
          // Hide advanced until ready
          if (category === 'advanced' && !showAdvancedFeatures) return null;
          if (category === 'recommended' && essentialProgress < 50 && showProgressiveDisclosure) return null;

          const isExpanded = expandedCategories.has(category);
          const categoryCompleted = categorySteps.filter(step => 
            completedSteps.includes(step.id)
          ).length;

          return (
            <Card key={category} variant="elevated" className="overflow-hidden">
              {/* Category Header */}
              <button
                onClick={() => toggleCategory(category)}
                className="w-full p-4 flex items-center justify-between hover:bg-gray-800/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="text-2xl">
                    {category === 'essential' ? '🚀' : 
                     category === 'recommended' ? '⭐' : '🔧'}
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold">{categoryLabels[category]}</h3>
                    <p className="text-sm text-gray-400">
                      {categoryDescriptions[category]}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400">
                    {categoryCompleted}/{categorySteps.length}
                  </span>
                  <div className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                    ▼
                  </div>
                </div>
              </button>

              {/* Category Steps */}
              {isExpanded && (
                <div className="border-t border-gray-800">
                  {categorySteps.map((step, index) => {
                    const isCompleted = completedSteps.includes(step.id);
                    const isActive = activeStep === step.id;
                    const isAvailable = isStepAvailable(step);
                    
                    return (
                      <div
                        key={step.id}
                        className={`p-4 border-l-4 transition-all ${
                          isActive ? 'border-blue-500 bg-blue-500/10' :
                          isCompleted ? 'border-green-500 bg-green-500/5' :
                          isAvailable ? 'border-gray-600' : 'border-gray-800'
                        } ${index > 0 ? 'border-t border-gray-800' : ''}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1">
                            <div className="text-2xl mt-1">
                              {isCompleted ? '✅' : step.icon}
                            </div>
                            <div className="flex-1">
                              <h4 className="font-medium mb-1">
                                {step.title}
                                {step.isOptional && (
                                  <span className="ml-2 text-xs text-gray-500 px-2 py-1 bg-gray-800 rounded">
                                    Optional
                                  </span>
                                )}
                              </h4>
                              <p className="text-sm text-gray-400 mb-2">
                                {step.description}
                              </p>
                              
                              {step.estimatedTime && (
                                <div className="text-xs text-gray-500">
                                  ⏱️ {step.estimatedTime}
                                </div>
                              )}

                              {step.dependencies && step.dependencies.length > 0 && !isAvailable && (
                                <div className="text-xs text-yellow-400 mt-1">
                                  ⚠️ Complete previous steps first
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex gap-2">
                            {!isCompleted && isAvailable && (
                              <>
                                <Button
                                  onClick={() => setActiveStep(step.id)}
                                  variant={isActive ? "primary" : "ghost"}
                                  size="sm"
                                >
                                  {isActive ? 'Current' : 'Start'}
                                </Button>
                                {(allowSkip || step.isOptional) && (
                                  <Button
                                    onClick={() => handleStepComplete(step.id)}
                                    variant="ghost"
                                    size="sm"
                                    className="text-gray-500"
                                  >
                                    Skip
                                  </Button>
                                )}
                              </>
                            )}
                          </div>
                        </div>

                        {/* Step component */}
                        {isActive && step.component && (
                          <div className="mt-4 p-4 bg-gray-800/30 rounded-lg">
                            {step.component}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          );
        })}

        {/* Current Step Detail */}
        {currentStepData && !currentStepData.component && (
          <Card variant="elevated" className="p-6">
            <div className="text-center">
              <div className="text-4xl mb-4">{currentStepData.icon}</div>
              <h3 className="text-xl font-semibold mb-2">{currentStepData.title}</h3>
              <p className="text-gray-400 mb-6">{currentStepData.description}</p>
              
              <div className="flex justify-center gap-3">
                <Button
                  onClick={() => handleStepComplete(currentStepData.id)}
                  variant="primary"
                >
                  Complete Step
                </Button>
                {(allowSkip || currentStepData.isOptional) && (
                  <Button
                    onClick={() => handleStepComplete(currentStepData.id)}
                    variant="ghost"
                  >
                    Skip for Now
                  </Button>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* Success State */}
        {essentialProgress >= 100 && (
          <Card variant="glass" className="p-6 text-center border-green-500/30 bg-green-500/10">
            <div className="text-4xl mb-4">🎉</div>
            <h3 className="text-xl font-semibold mb-2">Great job!</h3>
            <p className="text-gray-400 mb-4">
              You've completed the essential setup. OptiGains is ready to help you track your nutrition!
            </p>
            
            {!showAdvancedFeatures && (
              <Button
                onClick={() => setShowAdvancedFeatures(true)}
                variant="primary"
              >
                Explore Advanced Features
              </Button>
            )}
            
            {showAdvancedFeatures && totalProgress >= 100 && (
              <Button
                onClick={onAllComplete}
                variant="primary"
                size="lg"
              >
                Start Using OptiGains
              </Button>
            )}
          </Card>
        )}
      </div>
    </ErrorBoundary>
  );
};