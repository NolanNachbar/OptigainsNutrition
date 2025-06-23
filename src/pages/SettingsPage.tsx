import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import Actionbar from '../components/Actionbar';
import { Card, CardGroup, MetricCard } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { SelectButtonGroup, RadioButtonGroup } from '../components/ui/SelectButton';
import { getUserProfile, createOrUpdateUserProfile } from '../utils/database';
import { UserNutritionProfile, GoalType } from '../utils/types';

interface SettingsSection {
  id: string;
  title: string;
  icon: React.ReactNode;
}

const SettingsPage: React.FC = () => {
  const { user } = useUser();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserNutritionProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState('profile');
  
  // Form states
  const [age, setAge] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [heightUnit, setHeightUnit] = useState<'cm' | 'ft'>('ft');
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>('lbs');
  const [biologicalSex, setBiologicalSex] = useState<'male' | 'female'>('male');
  const [activityLevel, setActivityLevel] = useState(profile?.activity_level || 'moderate');
  const [goal, setGoal] = useState<GoalType>('maintenance');
  const [proteinTarget, setProteinTarget] = useState<'low' | 'medium' | 'high' | 'very_high'>('high');
  const [dietType, setDietType] = useState<'balanced' | 'low_carb' | 'low_fat' | 'keto' | 'plant_based'>('balanced');
  const [bodyWeightUnit, setBodyWeightUnit] = useState<'metric' | 'imperial'>('imperial');
  const [foodWeightUnit, setFoodWeightUnit] = useState<'metric' | 'imperial'>('metric');

  useEffect(() => {
    fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const userProfile = await getUserProfile(user.id);
      if (userProfile) {
        setProfile(userProfile);
        
        // Initialize form values
        if (userProfile.age) setAge(userProfile.age.toString());
        if (userProfile.biological_sex) setBiologicalSex(userProfile.biological_sex);
        
        // Set unit preferences (default to imperial for body weight, metric for food)
        const profileBodyUnit = userProfile.body_weight_unit || 'imperial';
        const profileFoodUnit = userProfile.food_weight_unit || 'metric';
        setBodyWeightUnit(profileBodyUnit);
        setFoodWeightUnit(profileFoodUnit);
        
        // Set height and weight units based on body weight unit preference
        if (profileBodyUnit === 'imperial') {
          setHeightUnit('ft');
          setWeightUnit('lbs');
        } else {
          setHeightUnit('cm');
          setWeightUnit('kg');
        }
        
        if (userProfile.height_cm) {
          if (profileBodyUnit === 'metric') {
            setHeight(userProfile.height_cm.toString());
          } else {
            setHeight((userProfile.height_cm / 30.48).toFixed(1));
          }
        }
        if (userProfile.weight_kg) {
          if (profileBodyUnit === 'metric') {
            setWeight(userProfile.weight_kg.toString());
          } else {
            setWeight((userProfile.weight_kg * 2.20462).toFixed(1));
          }
        }
        setActivityLevel(userProfile.activity_level || 'moderate');
        setGoal(userProfile.goal_type);
        setProteinTarget(userProfile.protein_target || 'high');
        setDietType(userProfile.diet_type || 'balanced');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateTDEE = (): number => {
    const ageNum = parseInt(age);
    const weightKg = weightUnit === 'kg' 
      ? parseFloat(weight) 
      : parseFloat(weight) * 0.453592;
    const heightCm = heightUnit === 'cm' 
      ? parseFloat(height) 
      : parseFloat(height) * 30.48;

    // Mifflin-St Jeor Equation
    let bmr;
    if (biologicalSex === 'male') {
      bmr = (10 * weightKg) + (6.25 * heightCm) - (5 * ageNum) + 5;
    } else {
      bmr = (10 * weightKg) + (6.25 * heightCm) - (5 * ageNum) - 161;
    }

    // Activity multipliers
    const activityMultipliers = {
      sedentary: 1.2,
      lightly_active: 1.375,
      moderate: 1.55,
      very_active: 1.725,
      extra_active: 1.9
    };

    return Math.round(bmr * activityMultipliers[activityLevel as keyof typeof activityMultipliers]);
  };

  const calculateMacros = (tdee: number) => {
    const weightKg = weightUnit === 'kg' 
      ? parseFloat(weight) 
      : parseFloat(weight) * 0.453592;

    let calories = tdee;
    
    // Protein targets in g per kg bodyweight
    const proteinMultipliers = {
      low: 1.6,
      medium: 2.0,
      high: 2.4,
      very_high: 2.8
    };
    
    let proteinMultiplier = proteinMultipliers[proteinTarget];

    // Adjust calories based on goal
    switch (goal) {
      case 'cut':
        calories = Math.round(tdee * 0.8); // 20% deficit
        break;
      case 'gain':
        calories = Math.round(tdee * 1.15); // 15% surplus
        break;
      case 'recomp':
        calories = Math.round(tdee * 0.95); // 5% deficit
        break;
    }

    let protein = Math.round(weightKg * proteinMultiplier);
    let proteinCals = protein * 4;
    
    let carbs, fat;
    
    // Diet type macro distribution
    switch (dietType) {
      case 'low_carb':
        // 30% carbs, rest fat
        const lowCarbCals = calories * 0.3;
        carbs = Math.round(lowCarbCals / 4);
        fat = Math.round((calories - proteinCals - lowCarbCals) / 9);
        break;
        
      case 'low_fat':
        // 20% fat, rest carbs
        const lowFatCals = calories * 0.2;
        fat = Math.round(lowFatCals / 9);
        carbs = Math.round((calories - proteinCals - lowFatCals) / 4);
        break;
        
      case 'keto':
        // 5% carbs, 75% fat
        carbs = Math.round((calories * 0.05) / 4);
        fat = Math.round((calories * 0.75) / 9);
        break;
        
      case 'plant_based':
        // Lower protein, higher carbs
        const plantProtein = Math.round(weightKg * (proteinMultiplier * 0.85));
        const plantProteinCals = plantProtein * 4;
        fat = Math.round(weightKg * 0.7); // Lower fat
        const plantFatCals = fat * 9;
        carbs = Math.round((calories - plantProteinCals - plantFatCals) / 4);
        protein = plantProtein;
        proteinCals = plantProteinCals;
        break;
        
      default: // balanced
        fat = Math.round(weightKg * 0.8);
        const fatCals = fat * 9;
        carbs = Math.round((calories - proteinCals - fatCals) / 4);
        break;
    }
    
    const fiber = Math.round(calories / 100 * 1.4); // 14g per 1000 calories

    return { calories, protein, carbs, fat, fiber };
  };

  const handleSaveProfile = async () => {
    if (!profile || !user) return;
    
    setSaving(true);
    setSavedMessage(null);
    
    try {
      const heightCm = heightUnit === 'cm' ? parseFloat(height) : parseFloat(height) * 30.48;
      const weightKg = weightUnit === 'kg' ? parseFloat(weight) : parseFloat(weight) * 0.453592;
      
      const tdee = calculateTDEE();
      const macros = calculateMacros(tdee);
      
      const updatedProfile: UserNutritionProfile = {
        ...profile,
        age: parseInt(age),
        biological_sex: biologicalSex,
        height_cm: heightCm,
        weight_kg: weightKg,
        activity_level: activityLevel as any,
        tdee_estimate: tdee,
        target_macros: macros,
        protein_target: proteinTarget,
        diet_type: dietType,
        body_weight_unit: bodyWeightUnit,
        food_weight_unit: foodWeightUnit
      };
      
      await createOrUpdateUserProfile(updatedProfile);
      setProfile(updatedProfile);
      setSavedMessage('Profile updated successfully!');
      setTimeout(() => setSavedMessage(null), 3000);
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveGoal = async () => {
    if (!profile || !user) return;
    
    setSaving(true);
    setSavedMessage(null);
    
    try {
      const tdee = calculateTDEE();
      const macros = calculateMacros(tdee);
      
      const updatedProfile: UserNutritionProfile = {
        ...profile,
        goal_type: goal,
        target_macros: macros,
        tdee_estimate: tdee
      };
      
      await createOrUpdateUserProfile(updatedProfile);
      setProfile(updatedProfile);
      setSavedMessage('Goals updated successfully!');
      setTimeout(() => setSavedMessage(null), 3000);
    } catch (error) {
      console.error('Error saving goal:', error);
      alert('Failed to save goal. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const sections: SettingsSection[] = [
    {
      id: 'profile',
      title: 'Profile',
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      )
    },
    {
      id: 'goals',
      title: 'Goals & Diet',
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      )
    },
    {
      id: 'units',
      title: 'Units & Display',
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      )
    },
    {
      id: 'account',
      title: 'Account',
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Actionbar />
        <div className="pt-24 flex items-center justify-center min-h-screen">
          <div className="text-gray-400">Loading settings...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <Actionbar />
      
      <div className="w-full pt-24 pb-20">
        <div className="max-w-6xl mx-auto px-4">
          <h1 className="text-2xl font-bold mb-6">Settings</h1>
          
          {/* Success message */}
          {savedMessage && (
            <div className="max-w-2xl mx-auto mb-4">
              <div className="bg-green-500/10 border border-green-500/30 text-green-400 px-4 py-3 rounded-lg flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {savedMessage}
              </div>
            </div>
          )}
          
          <div className="flex gap-6">
            {/* Sidebar */}
            <div className="w-64 flex-shrink-0">
              <Card variant="elevated">
                <div className="space-y-1">
                  {sections.map((section) => (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                        activeSection === section.id
                          ? 'bg-blue-600 text-white'
                          : 'hover:bg-gray-800 text-gray-300'
                      }`}
                    >
                      {section.icon}
                      <span className="font-medium">{section.title}</span>
                    </button>
                  ))}
                </div>
              </Card>
            </div>

            {/* Content */}
            <div className="flex-1">
              {activeSection === 'profile' && (
                <Card variant="elevated">
                  <h2 className="text-xl font-semibold mb-6">Profile Information</h2>
                  
                  <div className="space-y-6 max-w-2xl">
                    {/* Age */}
                    <div>
                      <label className="block text-sm font-medium mb-2">Age</label>
                      <input
                        type="number"
                        value={age}
                        onChange={(e) => setAge(e.target.value)}
                        className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none transition-colors"
                        min="1"
                        max="120"
                      />
                    </div>

                    {/* Biological Sex */}
                    <div>
                      <label className="block text-sm font-medium mb-2">Biological Sex</label>
                      <RadioButtonGroup
                        value={biologicalSex}
                        onChange={(value) => setBiologicalSex(value as 'male' | 'female')}
                        options={[
                          { value: 'male', label: 'Male' },
                          { value: 'female', label: 'Female' }
                        ]}
                      />
                    </div>

                    {/* Height */}
                    <div>
                      <label className="block text-sm font-medium mb-2">Height</label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={height}
                          onChange={(e) => setHeight(e.target.value)}
                          className="flex-1 p-3 bg-gray-800 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none transition-colors"
                          step={heightUnit === 'cm' ? '1' : '0.1'}
                          min="0"
                        />
                        <RadioButtonGroup
                          value={heightUnit}
                          onChange={(value) => {
                            const newUnit = value as 'cm' | 'ft';
                            // Convert existing value
                            if (height) {
                              if (newUnit === 'cm' && heightUnit === 'ft') {
                                setHeight((parseFloat(height) * 30.48).toFixed(0));
                              } else if (newUnit === 'ft' && heightUnit === 'cm') {
                                setHeight((parseFloat(height) / 30.48).toFixed(1));
                              }
                            }
                            setHeightUnit(newUnit);
                          }}
                          options={[
                            { value: 'cm', label: 'cm' },
                            { value: 'ft', label: 'ft' }
                          ]}
                        />
                      </div>
                    </div>

                    {/* Weight */}
                    <div>
                      <label className="block text-sm font-medium mb-2">Weight</label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={weight}
                          onChange={(e) => setWeight(e.target.value)}
                          className="flex-1 p-3 bg-gray-800 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none transition-colors"
                          step="0.1"
                          min="0"
                        />
                        <RadioButtonGroup
                          value={weightUnit}
                          onChange={(value) => {
                            const newUnit = value as 'kg' | 'lbs';
                            // Convert existing value
                            if (weight) {
                              if (newUnit === 'kg' && weightUnit === 'lbs') {
                                setWeight((parseFloat(weight) * 0.453592).toFixed(1));
                              } else if (newUnit === 'lbs' && weightUnit === 'kg') {
                                setWeight((parseFloat(weight) * 2.20462).toFixed(1));
                              }
                            }
                            setWeightUnit(newUnit);
                          }}
                          options={[
                            { value: 'kg', label: 'kg' },
                            { value: 'lbs', label: 'lbs' }
                          ]}
                        />
                      </div>
                    </div>

                    {/* Activity Level */}
                    <div>
                      <label className="block text-sm font-medium mb-2">Activity Level</label>
                      <SelectButtonGroup
                        value={activityLevel}
                        onChange={(value) => setActivityLevel(value as any)}
                        variant="compact"
                        options={[
                          {
                            value: 'sedentary',
                            label: 'Sedentary',
                            description: 'Little to no exercise'
                          },
                          {
                            value: 'lightly_active',
                            label: 'Lightly Active',
                            description: '1-3 days/week'
                          },
                          {
                            value: 'moderate',
                            label: 'Moderate',
                            description: '3-5 days/week'
                          },
                          {
                            value: 'very_active',
                            label: 'Very Active',
                            description: '6-7 days/week'
                          },
                          {
                            value: 'extra_active',
                            label: 'Extra Active',
                            description: 'Physical job + exercise'
                          }
                        ]}
                      />
                    </div>

                    <Button
                      onClick={handleSaveProfile}
                      variant="primary"
                      size="lg"
                      loading={saving}
                      disabled={!age || !height || !weight}
                    >
                      Save Profile
                    </Button>
                  </div>
                </Card>
              )}

              {activeSection === 'goals' && (
                <div className="space-y-6">
                  <Card variant="elevated">
                    <h2 className="text-xl font-semibold mb-6">Goals & Targets</h2>
                    
                    <div className="space-y-6 max-w-2xl">
                      {/* Goal */}
                      <div>
                        <label className="block text-sm font-medium mb-2">Goal</label>
                        <SelectButtonGroup
                          value={goal}
                          onChange={(value) => setGoal(value as GoalType)}
                          variant="compact"
                          options={[
                            {
                              value: 'maintenance',
                              label: 'Maintain',
                              description: 'Keep current weight'
                            },
                            {
                              value: 'cut',
                              label: 'Cut',
                              description: 'Lose weight (20% deficit)'
                            },
                            {
                              value: 'gain',
                              label: 'Gain',
                              description: 'Build muscle (15% surplus)'
                            },
                            {
                              value: 'recomp',
                              label: 'Recomp',
                              description: 'Lose fat, maintain muscle'
                            }
                          ]}
                        />
                      </div>

                      {/* Protein Target */}
                      <div>
                        <label className="block text-sm font-medium mb-2">Protein Target</label>
                        <SelectButtonGroup
                          value={proteinTarget}
                          onChange={(value) => setProteinTarget(value as any)}
                          variant="compact"
                          options={[
                            {
                              value: 'low',
                              label: 'Low',
                              description: '1.6g per kg body weight'
                            },
                            {
                              value: 'medium',
                              label: 'Medium',
                              description: '2.0g per kg body weight'
                            },
                            {
                              value: 'high',
                              label: 'High',
                              description: '2.4g per kg body weight'
                            },
                            {
                              value: 'very_high',
                              label: 'Very High',
                              description: '2.8g per kg body weight'
                            }
                          ]}
                        />
                      </div>

                      {/* Diet Type */}
                      <div>
                        <label className="block text-sm font-medium mb-2">Diet Type</label>
                        <SelectButtonGroup
                          value={dietType}
                          onChange={(value) => setDietType(value as any)}
                          variant="compact"
                          options={[
                            {
                              value: 'balanced',
                              label: 'Balanced',
                              description: 'Moderate carbs and fat'
                            },
                            {
                              value: 'low_carb',
                              label: 'Low Carb',
                              description: '30% carbs, higher fat'
                            },
                            {
                              value: 'low_fat',
                              label: 'Low Fat',
                              description: '20% fat, higher carbs'
                            },
                            {
                              value: 'keto',
                              label: 'Keto',
                              description: '5% carbs, 75% fat'
                            },
                            {
                              value: 'plant_based',
                              label: 'Plant Based',
                              description: 'Lower protein, higher carbs'
                            }
                          ]}
                        />
                      </div>

                      <Button
                        onClick={handleSaveGoal}
                        variant="primary"
                        size="lg"
                        loading={saving}
                      >
                        Update Goals
                      </Button>
                    </div>
                  </Card>

                  {/* Current Targets Preview */}
                  {profile && (
                    <Card variant="glass">
                      <h3 className="text-lg font-semibold mb-4">Current Targets</h3>
                      <CardGroup columns={5} gap="sm">
                        <MetricCard
                          title="Calories"
                          value={profile.target_macros.calories}
                        />
                        <MetricCard
                          title="Protein"
                          value={`${profile.target_macros.protein}g`}
                        />
                        <MetricCard
                          title="Carbs"
                          value={`${profile.target_macros.carbs}g`}
                        />
                        <MetricCard
                          title="Fat"
                          value={`${profile.target_macros.fat}g`}
                        />
                        <MetricCard
                          title="Fiber"
                          value={`${profile.target_macros.fiber}g`}
                        />
                      </CardGroup>
                    </Card>
                  )}
                </div>
              )}

              {activeSection === 'units' && (
                <Card variant="elevated">
                  <h2 className="text-xl font-semibold mb-6">Units & Display Preferences</h2>
                  
                  <div className="space-y-6 max-w-2xl">
                    {/* Body Weight Units */}
                    <div>
                      <label className="block text-sm font-medium mb-2">Body Weight Units</label>
                      <p className="text-sm text-gray-400 mb-3">Choose how body weight is displayed throughout the app</p>
                      <RadioButtonGroup
                        value={bodyWeightUnit}
                        onChange={(value) => {
                          const newUnit = value as 'metric' | 'imperial';
                          setBodyWeightUnit(newUnit);
                          
                          // Update height and weight units to match
                          if (newUnit === 'imperial') {
                            // Convert current values to imperial
                            if (height && heightUnit === 'cm') {
                              setHeight((parseFloat(height) / 30.48).toFixed(1));
                            }
                            if (weight && weightUnit === 'kg') {
                              setWeight((parseFloat(weight) * 2.20462).toFixed(1));
                            }
                            setHeightUnit('ft');
                            setWeightUnit('lbs');
                          } else {
                            // Convert current values to metric
                            if (height && heightUnit === 'ft') {
                              setHeight((parseFloat(height) * 30.48).toFixed(0));
                            }
                            if (weight && weightUnit === 'lbs') {
                              setWeight((parseFloat(weight) * 0.453592).toFixed(1));
                            }
                            setHeightUnit('cm');
                            setWeightUnit('kg');
                          }
                        }}
                        options={[
                          { 
                            value: 'metric', 
                            label: 'Metric', 
                            description: 'Kilograms (kg) & Centimeters (cm)' 
                          },
                          { 
                            value: 'imperial', 
                            label: 'Imperial', 
                            description: 'Pounds (lbs) & Feet (ft)' 
                          }
                        ]}
                      />
                    </div>

                    {/* Food Weight Units */}
                    <div>
                      <label className="block text-sm font-medium mb-2">Food Weight Units</label>
                      <p className="text-sm text-gray-400 mb-3">Choose how food portions are displayed</p>
                      <RadioButtonGroup
                        value={foodWeightUnit}
                        onChange={(value) => setFoodWeightUnit(value as 'metric' | 'imperial')}
                        options={[
                          { 
                            value: 'metric', 
                            label: 'Metric', 
                            description: 'Grams (g) & Milliliters (ml)' 
                          },
                          { 
                            value: 'imperial', 
                            label: 'Imperial', 
                            description: 'Ounces (oz) & Fluid ounces (fl oz)' 
                          }
                        ]}
                      />
                    </div>

                    <Button
                      onClick={handleSaveProfile}
                      variant="primary"
                      size="lg"
                      loading={saving}
                    >
                      Save Preferences
                    </Button>
                  </div>
                </Card>
              )}

              {activeSection === 'account' && (
                <Card variant="elevated">
                  <h2 className="text-xl font-semibold mb-6">Account Settings</h2>
                  
                  <div className="space-y-6 max-w-2xl">
                    <div>
                      <h3 className="font-medium mb-2">Email</h3>
                      <p className="text-gray-400">{user?.primaryEmailAddress?.emailAddress}</p>
                    </div>
                    
                    <div>
                      <h3 className="font-medium mb-2">Account ID</h3>
                      <p className="text-gray-400 font-mono text-sm">{user?.id}</p>
                    </div>
                    
                    <div className="pt-6 border-t border-gray-700">
                      <Button
                        onClick={() => navigate('/coaching')}
                        variant="secondary"
                        size="lg"
                      >
                        Coaching Settings
                      </Button>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;