import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import ActionBar from '../components/Actionbar';
import { getUserProfile, createOrUpdateUserProfile } from '../utils/database';
import { UserNutritionProfile } from '../utils/types';

const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const [profile, setProfile] = useState<UserNutritionProfile | null>(null);
  const [units, setUnits] = useState<'metric' | 'imperial'>('metric');
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    
    try {
      const userProfile = await getUserProfile(user.id);
      if (userProfile) {
        setProfile(userProfile);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!profile) return;
    
    try {
      await createOrUpdateUserProfile(profile);
      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings.');
    }
  };

  if (loading) {
    return (
      <div className="settings-page min-h-screen bg-gray-900">
        <ActionBar />
        <div className="settings-content pt-24">
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-gray-400">Loading...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-page min-h-screen bg-gray-900">
      <ActionBar />
      <div className="settings-content w-full pt-24 pb-20">
        <div className="max-w-4xl mx-auto px-4">
          <div className="settings-header mb-6">
            <button 
            onClick={() => navigate('/')} 
            className="back-button flex items-center text-gray-400 hover:text-gray-200 mb-4"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
            </button>
            <h1 className="text-2xl font-bold">Settings</h1>
          </div>
          <div className="max-w-2xl mx-auto">
            <div className="settings-sections">
              {/* Profile Settings */}
              <div className="settings-section bg-gray-800 rounded-lg shadow-md p-6 mb-4">
            <h2 className="text-lg font-semibold mb-4">Profile</h2>
            <div className="setting-item">
              <div className="setting-info">
                <label>Activity Level</label>
                <p className="setting-description">
                  Your typical daily activity level affects calorie needs
                </p>
              </div>
              <select
                value={profile?.activity_level || 'moderate'}
                onChange={(e) => setProfile(prev => prev ? { ...prev, activity_level: e.target.value as any } : null)}
                className="setting-select w-full p-2 border rounded-lg"
              >
                <option value="sedentary">Sedentary (little or no exercise)</option>
                <option value="light">Light (exercise 1-3 days/week)</option>
                <option value="moderate">Moderate (exercise 3-5 days/week)</option>
                <option value="active">Active (exercise 6-7 days/week)</option>
                <option value="very_active">Very Active (physical job or 2x/day)</option>
              </select>
            </div>
          </div>

          {/* Units Settings */}
          <div className="settings-section bg-gray-800 rounded-lg shadow-md p-6 mb-4">
            <h2 className="text-lg font-semibold mb-4">Units</h2>
            <div className="setting-item">
              <div className="setting-info">
                <label>Measurement System</label>
                <p className="setting-description">
                  Choose between metric (kg, cm) or imperial (lbs, inches)
                </p>
              </div>
              <select
                value={units}
                onChange={(e) => setUnits(e.target.value as 'metric' | 'imperial')}
                className="setting-select w-full p-2 border rounded-lg"
              >
                <option value="metric">Metric</option>
                <option value="imperial">Imperial</option>
              </select>
            </div>
          </div>

          {/* Macro Targets */}
          <div className="settings-section bg-gray-800 rounded-lg shadow-md p-6 mb-4">
            <h2 className="text-lg font-semibold mb-4">Default Macro Targets</h2>
            <div className="setting-item">
              <div className="setting-info">
                <label>Fiber Target</label>
                <p className="setting-description">
                  Daily fiber goal in grams
                </p>
              </div>
              <input
                type="number"
                value={profile?.target_macros.fiber || 30}
                onChange={(e) => setProfile(prev => prev ? {
                  ...prev,
                  target_macros: { ...prev.target_macros, fiber: Number(e.target.value) }
                } : null)}
                className="setting-input w-full p-2 border rounded-lg"
                min="0"
                max="100"
              />
            </div>
          </div>

          {/* Data Management */}
          <div className="settings-section bg-gray-800 rounded-lg shadow-md p-6 mb-4">
            <h2 className="text-lg font-semibold mb-4">Data Management</h2>
            <div className="setting-item">
              <button
                onClick={() => {
                  if (confirm('This will export all your nutrition data. Continue?')) {
                    // TODO: Implement data export
                    alert('Data export coming soon!');
                  }
                }}
                className="export-button bg-gray-700 text-gray-300 py-2 px-4 rounded-lg hover:bg-gray-600 transition-colors"
              >
                Export My Data
              </button>
            </div>
          </div>

          {/* Save Button */}
          <div className="settings-actions">
            <button
              onClick={handleSaveSettings}
              className="save-button bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 transition-colors"
              disabled={!profile}
            >
              Save Settings
            </button>
          </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;