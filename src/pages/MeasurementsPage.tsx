import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { format } from 'date-fns';
import Actionbar from '../components/Actionbar';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { BodyMeasurement } from '../utils/types';
import { getUserProfile } from '../utils/database';
import { convertWeight } from '../utils/unitConversions';

interface MeasurementField {
  key: keyof BodyMeasurement;
  label: string;
  unit: string;
  category: 'core' | 'upper' | 'lower';
  bilateral?: boolean;
}

const measurementFields: MeasurementField[] = [
  // Core measurements
  { key: 'weight', label: 'Weight', unit: 'kg', category: 'core' },
  { key: 'body_fat_percentage', label: 'Body Fat %', unit: '%', category: 'core' },
  { key: 'waist', label: 'Waist', unit: 'cm', category: 'core' },
  { key: 'hips', label: 'Hips', unit: 'cm', category: 'core' },
  
  // Upper body
  { key: 'neck', label: 'Neck', unit: 'cm', category: 'upper' },
  { key: 'shoulders', label: 'Shoulders', unit: 'cm', category: 'upper' },
  { key: 'chest', label: 'Chest', unit: 'cm', category: 'upper' },
  { key: 'left_bicep', label: 'Bicep', unit: 'cm', category: 'upper', bilateral: true },
  { key: 'left_forearm', label: 'Forearm', unit: 'cm', category: 'upper', bilateral: true },
  
  // Lower body
  { key: 'left_thigh', label: 'Thigh', unit: 'cm', category: 'lower', bilateral: true },
  { key: 'left_calf', label: 'Calf', unit: 'cm', category: 'lower', bilateral: true },
];

const MeasurementsPage: React.FC = () => {
  const { user } = useUser();
  const [measurements, setMeasurements] = useState<Partial<BodyMeasurement>>({
    date: format(new Date(), 'yyyy-MM-dd')
  });
  const [previousMeasurements, setPreviousMeasurements] = useState<BodyMeasurement[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [saving, setSaving] = useState(false);
  const [useImperial, setUseImperial] = useState(false);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadUserPreferences();
    loadPreviousMeasurements();
  }, [user]);

  const loadUserPreferences = async () => {
    if (!user) return;
    const profile = await getUserProfile(user.id);
    if (profile) {
      setUseImperial(profile.body_weight_unit === 'imperial');
    }
  };

  const loadPreviousMeasurements = async () => {
    // This would load from database
    // For now, using mock data
    setPreviousMeasurements([]);
  };

  const handleFieldChange = (field: keyof BodyMeasurement, value: string) => {
    const numValue = parseFloat(value) || 0;
    
    if (field === 'weight' && useImperial) {
      // Convert pounds to kg for storage
      setMeasurements(prev => ({
        ...prev,
        [field]: convertWeight(numValue, 'lbs', 'kg')
      }));
    } else {
      setMeasurements(prev => ({
        ...prev,
        [field]: numValue
      }));
    }
    
    // Handle bilateral measurements
    if (field.startsWith('left_')) {
      const rightField = field.replace('left_', 'right_') as keyof BodyMeasurement;
      setMeasurements(prev => ({
        ...prev,
        [rightField]: numValue
      }));
    }
  };

  const getDisplayValue = (field: keyof BodyMeasurement, value?: number): string => {
    if (value === undefined || value === 0) return '';
    
    if (field === 'weight' && useImperial) {
      return convertWeight(value, 'kg', 'lbs').toFixed(1);
    }
    
    if (field === 'body_fat_percentage') {
      return value.toFixed(1);
    }
    
    return value.toFixed(0);
  };

  const getDisplayUnit = (field: MeasurementField): string => {
    if (field.key === 'weight' && useImperial) return 'lbs';
    return field.unit;
  };

  const calculateChange = (current?: number, previous?: number): string | null => {
    if (!current || !previous) return null;
    const change = current - previous;
    const sign = change > 0 ? '+' : '';
    return `${sign}${change.toFixed(1)}`;
  };

  const handleSave = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      // Save measurements to database
      const measurementData: BodyMeasurement = {
        ...measurements as BodyMeasurement,
        clerk_user_id: user.id,
        notes,
        created_at: new Date().toISOString()
      };
      
      console.log('Saving measurements:', measurementData);
      
      // Reset form
      setMeasurements({
        date: format(new Date(), 'yyyy-MM-dd')
      });
      setNotes('');
      
      // Reload measurements
      await loadPreviousMeasurements();
    } catch (error) {
      console.error('Error saving measurements:', error);
    } finally {
      setSaving(false);
    }
  };

  const categoryGroups = {
    core: measurementFields.filter(f => f.category === 'core'),
    upper: measurementFields.filter(f => f.category === 'upper'),
    lower: measurementFields.filter(f => f.category === 'lower')
  };

  const latestPrevious = previousMeasurements[0];

  return (
    <div className="min-h-screen bg-gray-900">
      <Actionbar />
      
      <div className="w-full pt-24 pb-20">
        <div className="max-w-4xl mx-auto px-4">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold tracking-tight">Body Measurements</h1>
            <p className="text-gray-400 mt-2">Track your physical progress beyond the scale</p>
          </div>

          {/* Date selector */}
          <Card variant="glass" className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-medium mb-2">Measurement Date</label>
                <input
                  type="date"
                  value={measurements.date}
                  onChange={(e) => setMeasurements(prev => ({ ...prev, date: e.target.value }))}
                  className="p-2 bg-gray-800 border border-gray-700 rounded-lg"
                />
              </div>
              <Button
                onClick={() => setShowHistory(!showHistory)}
                variant="ghost"
                size="sm"
              >
                {showHistory ? 'Hide' : 'Show'} History
              </Button>
            </div>
          </Card>

          {/* Core Measurements */}
          <Card variant="elevated" className="mb-6">
            <h2 className="text-xl font-semibold mb-4">Core Measurements</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {categoryGroups.core.map((field) => (
                <div key={field.key}>
                  <label className="block text-sm font-medium mb-2">
                    {field.label}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step={field.key === 'body_fat_percentage' ? '0.1' : '1'}
                      value={getDisplayValue(field.key, measurements[field.key] as number)}
                      onChange={(e) => handleFieldChange(field.key, e.target.value)}
                      className="flex-1 p-3 bg-gray-800 border border-gray-700 rounded-lg"
                      placeholder="0"
                    />
                    <span className="text-gray-400 w-12">{getDisplayUnit(field)}</span>
                    {latestPrevious && (
                      <span className="text-sm text-gray-500 w-16">
                        {calculateChange(
                          measurements[field.key] as number,
                          latestPrevious[field.key] as number
                        )}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Upper Body */}
          <Card variant="elevated" className="mb-6">
            <h2 className="text-xl font-semibold mb-4">Upper Body</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {categoryGroups.upper.map((field) => (
                <div key={field.key}>
                  <label className="block text-sm font-medium mb-2">
                    {field.bilateral ? `${field.label} (L/R)` : field.label}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.5"
                      value={getDisplayValue(field.key, measurements[field.key] as number)}
                      onChange={(e) => handleFieldChange(field.key, e.target.value)}
                      className="flex-1 p-3 bg-gray-800 border border-gray-700 rounded-lg"
                      placeholder="0"
                    />
                    <span className="text-gray-400 w-12">{getDisplayUnit(field)}</span>
                    {latestPrevious && (
                      <span className="text-sm text-gray-500 w-16">
                        {calculateChange(
                          measurements[field.key] as number,
                          latestPrevious[field.key] as number
                        )}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Lower Body */}
          <Card variant="elevated" className="mb-6">
            <h2 className="text-xl font-semibold mb-4">Lower Body</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {categoryGroups.lower.map((field) => (
                <div key={field.key}>
                  <label className="block text-sm font-medium mb-2">
                    {field.bilateral ? `${field.label} (L/R)` : field.label}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.5"
                      value={getDisplayValue(field.key, measurements[field.key] as number)}
                      onChange={(e) => handleFieldChange(field.key, e.target.value)}
                      className="flex-1 p-3 bg-gray-800 border border-gray-700 rounded-lg"
                      placeholder="0"
                    />
                    <span className="text-gray-400 w-12">{getDisplayUnit(field)}</span>
                    {latestPrevious && (
                      <span className="text-sm text-gray-500 w-16">
                        {calculateChange(
                          measurements[field.key] as number,
                          latestPrevious[field.key] as number
                        )}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Notes */}
          <Card variant="elevated" className="mb-6">
            <h2 className="text-xl font-semibold mb-4">Notes</h2>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg"
              rows={4}
              placeholder="Any observations about your measurements, training, or physique..."
            />
          </Card>

          {/* Save Button */}
          <Button
            onClick={handleSave}
            variant="primary"
            size="lg"
            className="w-full"
            loading={saving}
            disabled={Object.keys(measurements).length <= 1} // Only date is set
          >
            Save Measurements
          </Button>

          {/* History */}
          {showHistory && previousMeasurements.length > 0 && (
            <Card variant="glass" className="mt-6">
              <h3 className="text-lg font-semibold mb-4">Measurement History</h3>
              <div className="space-y-4">
                {previousMeasurements.map((entry, index) => (
                  <div key={index} className="p-4 bg-gray-800/50 rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-medium">
                        {format(new Date(entry.date), 'MMM d, yyyy')}
                      </div>
                      {entry.weight && (
                        <div className="text-sm text-gray-400">
                          {useImperial 
                            ? `${convertWeight(entry.weight, 'kg', 'lbs').toFixed(1)} lbs`
                            : `${entry.weight.toFixed(1)} kg`
                          }
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                      {measurementFields
                        .filter(f => entry[f.key])
                        .map(f => (
                          <div key={f.key} className="text-gray-400">
                            {f.label}: {getDisplayValue(f.key, entry[f.key] as number)} {getDisplayUnit(f)}
                          </div>
                        ))}
                    </div>
                    {entry.notes && (
                      <p className="text-sm text-gray-500 mt-2">{entry.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default MeasurementsPage;