import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
// Removed unused import
import { createOrUpdateUserProfile } from '../utils/database';
import { UserNutritionProfile, GoalType } from '../utils/types';

interface OnboardingStep {
  id: string;
  title: string;
  subtitle?: string;
  component: React.ReactNode;
}

const OnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  
  // Simplified data collection
  const [data, setData] = useState({
    goal: 'maintenance' as GoalType,
    weight: '',
    weightUnit: 'lbs' as 'kg' | 'lbs',
    height: '',
    heightUnit: 'ft' as 'ft' | 'cm',
    age: '',
    sex: 'male' as 'male' | 'female',
    activityLevel: 'moderate' as 'sedentary' | 'lightly_active' | 'moderate' | 'very_active' | 'extra_active',
  });

  const calculateTDEE = (): number => {
    const weightKg = data.weightUnit === 'kg' 
      ? parseFloat(data.weight) 
      : parseFloat(data.weight) * 0.453592;
    
    const heightCm = data.heightUnit === 'cm'
      ? parseFloat(data.height)
      : parseFloat(data.height) * 30.48; // Rough conversion from feet
    
    const age = parseInt(data.age) || 30;
    
    // Mifflin-St Jeor Equation
    let bmr;
    if (data.sex === 'male') {
      bmr = (10 * weightKg) + (6.25 * heightCm) - (5 * age) + 5;
    } else {
      bmr = (10 * weightKg) + (6.25 * heightCm) - (5 * age) - 161;
    }

    // Activity multipliers
    const activityMultipliers = {
      sedentary: 1.2,
      lightly_active: 1.375,
      moderate: 1.55,
      very_active: 1.725,
      extra_active: 1.9
    };

    return Math.round(bmr * activityMultipliers[data.activityLevel]);
  };

  const getTargetCalories = (tdee: number): number => {
    switch (data.goal) {
      case 'cut':
        return Math.round(tdee * 0.85); // 15% deficit
      case 'gain':
        return Math.round(tdee * 1.1); // 10% surplus
      default:
        return tdee;
    }
  };

  const handleComplete = async () => {
    if (!user) return;
    
    setLoading(true);
    
    try {
      const tdee = calculateTDEE();
      const targetCalories = getTargetCalories(tdee);
      
      // Calculate macros based on goal
      let proteinRatio, carbRatio, fatRatio;
      
      switch (data.goal) {
        case 'cut':
          proteinRatio = 0.35;
          carbRatio = 0.35;
          fatRatio = 0.30;
          break;
        case 'gain':
          proteinRatio = 0.25;
          carbRatio = 0.45;
          fatRatio = 0.30;
          break;
        default:
          proteinRatio = 0.30;
          carbRatio = 0.40;
          fatRatio = 0.30;
      }
      
      const profile: UserNutritionProfile = {
        clerk_user_id: user.id,
        tdee_estimate: tdee,
        coaching_mode: 'coached',
        goal_type: data.goal,
        target_macros: {
          calories: targetCalories,
          protein: Math.round((targetCalories * proteinRatio) / 4),
          carbs: Math.round((targetCalories * carbRatio) / 4),
          fat: Math.round((targetCalories * fatRatio) / 9),
          fiber: 25
        },
        activity_level: data.activityLevel,
        age: parseInt(data.age) || undefined,
        biological_sex: data.sex,
        height_cm: data.heightUnit === 'cm' ? parseFloat(data.height) : parseFloat(data.height) * 30.48,
        weight_kg: data.weightUnit === 'kg' ? parseFloat(data.weight) : parseFloat(data.weight) * 0.453592,
        body_weight_unit: data.weightUnit === 'kg' ? 'metric' : 'imperial',
        food_weight_unit: 'metric'
      };
      
      await createOrUpdateUserProfile(profile);
      navigate('/dashboard');
    } catch (error) {
      console.error('Error creating profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const steps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: 'Welcome to OptiGains!',
      subtitle: 'Let\'s get you started with a few quick questions',
      component: (
        <div className="text-center py-8">
          <div className="w-24 h-24 mx-auto mb-6 bg-blue-500/20 rounded-full flex items-center justify-center">
            <svg className="w-12 h-12 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <p className="text-gray-400 mb-8">
            We'll help you set up your nutrition goals using evidence-based calculations, 
            just like MacroFactor.
          </p>
          <div className="space-y-3 text-left max-w-sm mx-auto">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm">Adaptive TDEE calculation</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm">Personalized macro targets</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm">Weekly adjustments based on progress</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'goal',
      title: 'What\'s your goal?',
      subtitle: 'We\'ll adjust your targets accordingly',
      component: (
        <div className="space-y-4">
          <button
            className={`w-full p-6 rounded-xl border-2 transition-all ${
              data.goal === 'cut' 
                ? 'border-blue-500 bg-blue-500/10' 
                : 'border-gray-700 hover:border-gray-600'
            }`}
            onClick={() => setData({ ...data, goal: 'cut' })}
          >
            <div className="flex items-center justify-between">
              <div className="text-left">
                <h3 className="font-semibold text-lg mb-1">Lose Weight</h3>
                <p className="text-sm text-gray-400">Create a calorie deficit to lose fat</p>
              </div>
              <div className="text-3xl">🎯</div>
            </div>
          </button>
          
          <button
            className={`w-full p-6 rounded-xl border-2 transition-all ${
              data.goal === 'gain' 
                ? 'border-blue-500 bg-blue-500/10' 
                : 'border-gray-700 hover:border-gray-600'
            }`}
            onClick={() => setData({ ...data, goal: 'gain' })}
          >
            <div className="flex items-center justify-between">
              <div className="text-left">
                <h3 className="font-semibold text-lg mb-1">Build Muscle</h3>
                <p className="text-sm text-gray-400">Create a calorie surplus to gain muscle</p>
              </div>
              <div className="text-3xl">💪</div>
            </div>
          </button>
          
          <button
            className={`w-full p-6 rounded-xl border-2 transition-all ${
              data.goal === 'maintenance' 
                ? 'border-blue-500 bg-blue-500/10' 
                : 'border-gray-700 hover:border-gray-600'
            }`}
            onClick={() => setData({ ...data, goal: 'maintenance' })}
          >
            <div className="flex items-center justify-between">
              <div className="text-left">
                <h3 className="font-semibold text-lg mb-1">Maintain Weight</h3>
                <p className="text-sm text-gray-400">Stay at your current weight</p>
              </div>
              <div className="text-3xl">⚖️</div>
            </div>
          </button>
        </div>
      ),
    },
    {
      id: 'basics',
      title: 'Basic Information',
      subtitle: 'For accurate calorie calculations',
      component: (
        <div className="space-y-6">
          {/* Age */}
          <div>
            <label className="block text-sm font-medium mb-2">Age</label>
            <input
              type="number"
              value={data.age}
              onChange={(e) => setData({ ...data, age: e.target.value })}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500"
              placeholder="Enter your age"
              min="18"
              max="100"
            />
          </div>

          {/* Sex */}
          <div>
            <label className="block text-sm font-medium mb-2">Biological Sex</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                className={`p-3 rounded-lg border-2 transition-all ${
                  data.sex === 'male'
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-gray-700 hover:border-gray-600'
                }`}
                onClick={() => setData({ ...data, sex: 'male' })}
              >
                Male
              </button>
              <button
                className={`p-3 rounded-lg border-2 transition-all ${
                  data.sex === 'female'
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-gray-700 hover:border-gray-600'
                }`}
                onClick={() => setData({ ...data, sex: 'female' })}
              >
                Female
              </button>
            </div>
          </div>

          {/* Weight */}
          <div>
            <label className="block text-sm font-medium mb-2">Weight</label>
            <div className="flex gap-2">
              <input
                type="number"
                value={data.weight}
                onChange={(e) => setData({ ...data, weight: e.target.value })}
                className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500"
                placeholder="Enter weight"
                step="0.1"
              />
              <select
                value={data.weightUnit}
                onChange={(e) => setData({ ...data, weightUnit: e.target.value as 'kg' | 'lbs' })}
                className="px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500"
              >
                <option value="lbs">lbs</option>
                <option value="kg">kg</option>
              </select>
            </div>
          </div>

          {/* Height */}
          <div>
            <label className="block text-sm font-medium mb-2">Height</label>
            <div className="flex gap-2">
              <input
                type="number"
                value={data.height}
                onChange={(e) => setData({ ...data, height: e.target.value })}
                className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500"
                placeholder={data.heightUnit === 'ft' ? 'Enter feet (e.g., 5.5)' : 'Enter cm'}
                step="0.1"
              />
              <select
                value={data.heightUnit}
                onChange={(e) => setData({ ...data, heightUnit: e.target.value as 'ft' | 'cm' })}
                className="px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500"
              >
                <option value="ft">ft</option>
                <option value="cm">cm</option>
              </select>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'activity',
      title: 'Activity Level',
      subtitle: 'How active are you on a typical day?',
      component: (
        <div className="space-y-3">
          {[
            { value: 'sedentary', label: 'Sedentary', desc: 'Little to no exercise, desk job' },
            { value: 'lightly_active', label: 'Lightly Active', desc: 'Light exercise 1-3 days/week' },
            { value: 'moderate', label: 'Moderately Active', desc: 'Moderate exercise 3-5 days/week' },
            { value: 'very_active', label: 'Very Active', desc: 'Heavy exercise 6-7 days/week' },
            { value: 'extra_active', label: 'Extra Active', desc: 'Very heavy physical job or training' },
          ].map((level) => (
            <button
              key={level.value}
              className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                data.activityLevel === level.value
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-gray-700 hover:border-gray-600'
              }`}
              onClick={() => setData({ ...data, activityLevel: level.value as any })}
            >
              <div className="font-medium mb-1">{level.label}</div>
              <div className="text-sm text-gray-400">{level.desc}</div>
            </button>
          ))}
        </div>
      ),
    },
    {
      id: 'summary',
      title: 'Your Personalized Plan',
      subtitle: 'Based on your information',
      component: (
        <div className="space-y-6">
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-6 text-center">
            <div className="text-sm text-gray-400 mb-2">Estimated Daily Calories</div>
            <div className="text-4xl font-bold mb-4">
              {data.weight && data.height && data.age ? getTargetCalories(calculateTDEE()) : '---'}
            </div>
            <div className="text-sm text-gray-500">
              TDEE: {data.weight && data.height && data.age ? calculateTDEE() : '---'} cal/day
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-gray-800/50 rounded-lg">
              <span className="text-gray-400">Goal</span>
              <span className="font-medium capitalize">{data.goal.replace('_', ' ')}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-800/50 rounded-lg">
              <span className="text-gray-400">Activity Level</span>
              <span className="font-medium capitalize">{data.activityLevel.replace('_', ' ')}</span>
            </div>
          </div>

          <div className="p-4 bg-gray-800/50 rounded-lg">
            <p className="text-sm text-gray-400">
              💡 Your targets will automatically adjust each week based on your actual intake 
              and weight changes, just like MacroFactor's adherence-neutral approach.
            </p>
          </div>
        </div>
      ),
    },
  ];

  const currentStepData = steps[currentStep];
  const canProceed = currentStep === 0 || (
    (currentStep === 1) ||
    (currentStep === 2 && data.age && data.weight && data.height) ||
    (currentStep === 3) ||
    (currentStep === 4)
  );

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex justify-between mb-2">
            <span className="text-sm text-gray-500">Step {currentStep + 1} of {steps.length}</span>
            <button
              onClick={() => handleComplete()}
              className="text-sm text-gray-500 hover:text-gray-400"
            >
              Skip setup
            </button>
          </div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            />
          </div>
        </div>

        <Card variant="glass" className="p-8">
          <h2 className="text-2xl font-bold mb-2">{currentStepData.title}</h2>
          {currentStepData.subtitle && (
            <p className="text-gray-400 mb-6">{currentStepData.subtitle}</p>
          )}

          <div className="min-h-[300px]">
            {currentStepData.component}
          </div>

          <div className="flex gap-3 mt-8">
            {currentStep > 0 && (
              <Button
                variant="ghost"
                onClick={() => setCurrentStep(currentStep - 1)}
                className="flex-1"
              >
                Back
              </Button>
            )}
            
            {currentStep < steps.length - 1 ? (
              <Button
                variant="primary"
                onClick={() => setCurrentStep(currentStep + 1)}
                disabled={!canProceed}
                className="flex-1"
              >
                Continue
              </Button>
            ) : (
              <Button
                variant="primary"
                onClick={handleComplete}
                loading={loading}
                disabled={!canProceed}
                className="flex-1"
              >
                Get Started
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default OnboardingPage;