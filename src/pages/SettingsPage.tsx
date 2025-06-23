import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ActionBar from '../components/Actionbar';
import { loadSettings, saveSettings, AppSettings } from '../utils/settings';

const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<AppSettings>(loadSettings());

  const handleSettingChange = <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
  ) => {
    const updatedSettings = { ...settings, [key]: value };
    setSettings(updatedSettings);
    saveSettings(updatedSettings);
  };

  const restTimeOptions = [
    { label: '30 seconds', value: 30 },
    { label: '1 minute', value: 60 },
    { label: '1.5 minutes', value: 90 },
    { label: '2 minutes', value: 120 },
    { label: '3 minutes', value: 180 },
    { label: '5 minutes', value: 300 },
  ];

  const weightIncrementOptions = [
    { label: '2.5 lbs', value: 2.5 },
    { label: '5 lbs', value: 5 },
    { label: '10 lbs', value: 10 },
  ];

  return (
    <div className="settings-page">
      <ActionBar />
      <div className="settings-content">
        <div className="settings-header">
          <button 
            onClick={() => navigate('/')} 
            className="back-button"
          >
            ← Back
          </button>
          <h1>Settings</h1>
        </div>

        <div className="settings-sections">
          {/* Timer Settings */}
          <div className="settings-section">
            <h2>Rest Timers</h2>
            <div className="setting-item">
              <div className="setting-info">
                <label>Show Rest Timers</label>
                <p className="setting-description">
                  Display countdown timers between sets during workouts
                </p>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.showRestTimers}
                  onChange={(e) => handleSettingChange('showRestTimers', e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
            
            {settings.showRestTimers && (
              <div className="setting-item">
                <div className="setting-info">
                  <label>Default Rest Time</label>
                  <p className="setting-description">
                    Default time between sets when rest timers are enabled
                  </p>
                </div>
                <select
                  value={settings.defaultRestTime}
                  onChange={(e) => handleSettingChange('defaultRestTime', Number(e.target.value))}
                  className="setting-select"
                >
                  {restTimeOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Weight Settings */}
          <div className="settings-section">
            <h2>Weight Increments</h2>
            <div className="setting-item">
              <div className="setting-info">
                <label>Default Weight Increment</label>
                <p className="setting-description">
                  Default increment when adjusting weights
                </p>
              </div>
              <select
                value={settings.defaultWeightIncrement}
                onChange={(e) => handleSettingChange('defaultWeightIncrement', Number(e.target.value))}
                className="setting-select"
              >
                {weightIncrementOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Display Settings */}
          <div className="settings-section">
            <h2>Display Preferences</h2>
            <div className="setting-item">
              <div className="setting-info">
                <label>Show Volume Metrics</label>
                <p className="setting-description">
                  Display total volume and other workout metrics
                </p>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.showVolumeMetrics}
                  onChange={(e) => handleSettingChange('showVolumeMetrics', e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
            
            <div className="setting-item">
              <div className="setting-info">
                <label>Collapsible Exercises</label>
                <p className="setting-description">
                  Allow exercises to be collapsed in workout editor
                </p>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.collapsibleExercises}
                  onChange={(e) => handleSettingChange('collapsibleExercises', e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .settings-page {
          background: #121212;
          min-height: 100vh;
          color: #ffffff;
        }

        .settings-content {
          max-width: 800px;
          margin: 0 auto;
          padding: 2rem;
        }

        .settings-header {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .back-button {
          background: none;
          border: none;
          color: #2196F3;
          font-size: 1rem;
          cursor: pointer;
          padding: 0.5rem;
          display: flex;
          align-items: center;
        }

        .back-button:hover {
          color: #1976D2;
        }

        .settings-header h1 {
          margin: 0;
        }

        .settings-sections {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .settings-section {
          background: #1e1e1e;
          border-radius: 12px;
          padding: 1.5rem;
          border: 1px solid #333;
        }

        .settings-section h2 {
          margin: 0 0 1.5rem 0;
          color: #ffffff;
          font-size: 1.25rem;
        }

        .setting-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 0;
          border-bottom: 1px solid #333;
        }

        .setting-item:last-child {
          border-bottom: none;
        }

        .setting-info {
          flex: 1;
        }

        .setting-info label {
          display: block;
          font-size: 1rem;
          font-weight: 500;
          margin-bottom: 0.25rem;
        }

        .setting-description {
          font-size: 0.875rem;
          color: #888;
          margin: 0;
        }

        .toggle-switch {
          position: relative;
          display: inline-block;
          width: 50px;
          height: 24px;
        }

        .toggle-switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }

        .toggle-slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: #333;
          transition: .4s;
          border-radius: 24px;
        }

        .toggle-slider:before {
          position: absolute;
          content: "";
          height: 18px;
          width: 18px;
          left: 3px;
          bottom: 3px;
          background-color: white;
          transition: .4s;
          border-radius: 50%;
        }

        .toggle-switch input:checked + .toggle-slider {
          background-color: #2196F3;
        }

        .toggle-switch input:checked + .toggle-slider:before {
          transform: translateX(26px);
        }

        .setting-select {
          background: #2a2a2a;
          color: #ffffff;
          border: 1px solid #444;
          border-radius: 6px;
          padding: 0.5rem 1rem;
          font-size: 1rem;
          cursor: pointer;
          min-width: 150px;
        }

        .setting-select:hover {
          border-color: #666;
        }

        .setting-select:focus {
          outline: none;
          border-color: #2196F3;
        }

        @media (max-width: 768px) {
          .settings-content {
            padding: 1rem;
          }

          .setting-item {
            flex-direction: column;
            align-items: flex-start;
            gap: 1rem;
          }

          .setting-select {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};

export default SettingsPage;