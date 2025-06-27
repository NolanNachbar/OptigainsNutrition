import React, { useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import { format, subDays } from 'date-fns';
import Actionbar from '../components/Actionbar';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { 
  getNutritionLogs, 
  getWeightEntries,
  getHabitEntries,
  getExpenditureData,
  getMealsByDate,
  getUserProfile
} from '../utils/database';

interface ExportOptions {
  dateRange: {
    start: string;
    end: string;
  };
  dataTypes: {
    nutrition: boolean;
    weight: boolean;
    habits: boolean;
    expenditure: boolean;
    meals: boolean;
    profile: boolean;
  };
  format: 'csv' | 'json';
}

const DataExportPage: React.FC = () => {
  const { user } = useUser();
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    dateRange: {
      start: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
      end: format(new Date(), 'yyyy-MM-dd')
    },
    dataTypes: {
      nutrition: true,
      weight: true,
      habits: false,
      expenditure: false,
      meals: false,
      profile: false
    },
    format: 'csv'
  });
  const [exporting, setExporting] = useState(false);

  const handleExportOptionChange = (
    category: keyof ExportOptions['dataTypes'], 
    checked: boolean
  ) => {
    setExportOptions(prev => ({
      ...prev,
      dataTypes: {
        ...prev.dataTypes,
        [category]: checked
      }
    }));
  };

  const exportData = async () => {
    if (!user) return;

    setExporting(true);
    try {
      const data: any = {};

      // Fetch selected data types
      if (exportOptions.dataTypes.nutrition) {
        const logs = await getNutritionLogs(user.id, 365); // Get more data for export
        data.nutrition_logs = logs.filter(log => 
          log.date >= exportOptions.dateRange.start && 
          log.date <= exportOptions.dateRange.end
        );
      }

      if (exportOptions.dataTypes.weight) {
        const weights = await getWeightEntries(user.id, 365);
        data.weight_entries = weights.filter(weight => 
          weight.date >= exportOptions.dateRange.start && 
          weight.date <= exportOptions.dateRange.end
        );
      }

      if (exportOptions.dataTypes.habits) {
        const habits = await getHabitEntries(user.id, 365);
        data.habit_entries = habits.filter(habit => 
          habit.date >= exportOptions.dateRange.start && 
          habit.date <= exportOptions.dateRange.end
        );
      }

      if (exportOptions.dataTypes.expenditure) {
        const expenditure = await getExpenditureData(user.id, 365);
        data.expenditure_data = expenditure.filter(exp => 
          exp.date >= exportOptions.dateRange.start && 
          exp.date <= exportOptions.dateRange.end
        );
      }

      if (exportOptions.dataTypes.meals) {
        // Get meals for the date range
        const meals = [];
        const startDate = new Date(exportOptions.dateRange.start);
        const endDate = new Date(exportOptions.dateRange.end);
        
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
          const dateStr = format(d, 'yyyy-MM-dd');
          const dayMeals = await getMealsByDate(user.id, dateStr);
          meals.push(...dayMeals);
        }
        data.meals = meals;
      }

      if (exportOptions.dataTypes.profile) {
        const profile = await getUserProfile(user.id);
        data.user_profile = profile;
      }

      // Export based on format
      if (exportOptions.format === 'json') {
        downloadJSON(data);
      } else {
        downloadCSV(data);
      }

    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const downloadJSON = (data: any) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `optigains-data-${format(new Date(), 'yyyy-MM-dd')}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const downloadCSV = (data: any) => {
    // Convert each data type to CSV format
    const csvFiles: { [key: string]: string } = {};

    Object.keys(data).forEach(key => {
      if (Array.isArray(data[key]) && data[key].length > 0) {
        csvFiles[key] = arrayToCSV(data[key]);
      } else if (typeof data[key] === 'object') {
        csvFiles[key] = objectToCSV(data[key]);
      }
    });

    // If only one data type, download single CSV
    if (Object.keys(csvFiles).length === 1) {
      const [key, csv] = Object.entries(csvFiles)[0];
      downloadSingleCSV(csv, key);
    } else {
      // Create zip file with multiple CSVs
      downloadMultipleCSVs(csvFiles);
    }
  };

  const arrayToCSV = (array: any[]): string => {
    if (array.length === 0) return '';
    
    const headers = Object.keys(array[0]);
    const rows = array.map(obj => 
      headers.map(header => {
        const value = obj[header];
        if (typeof value === 'object') {
          return JSON.stringify(value);
        }
        return `"${String(value).replace(/"/g, '""')}"`;
      }).join(',')
    );
    
    return [headers.join(','), ...rows].join('\n');
  };

  const objectToCSV = (obj: any): string => {
    const rows = Object.entries(obj).map(([key, value]) => {
      if (typeof value === 'object') {
        return `"${key}","${JSON.stringify(value).replace(/"/g, '""')}"`;
      }
      return `"${key}","${String(value).replace(/"/g, '""')}"`;
    });
    
    return ['Property,Value', ...rows].join('\n');
  };

  const downloadSingleCSV = (csv: string, filename: string) => {
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `optigains-${filename}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const downloadMultipleCSVs = (csvFiles: { [key: string]: string }) => {
    // For simplicity, download each CSV separately
    // In a real app, you might want to create a zip file
    Object.entries(csvFiles).forEach(([key, csv], index) => {
      setTimeout(() => {
        downloadSingleCSV(csv, key);
      }, index * 500); // Stagger downloads
    });
  };

  const getEstimatedFileSize = () => {
    const selectedTypes = Object.entries(exportOptions.dataTypes)
      .filter(([, selected]) => selected)
      .length;
    
    const days = Math.ceil(
      (new Date(exportOptions.dateRange.end).getTime() - 
       new Date(exportOptions.dateRange.start).getTime()) / 
      (1000 * 60 * 60 * 24)
    );

    // Rough estimate: 1KB per day per data type
    const estimatedKB = selectedTypes * days * 1;
    
    if (estimatedKB < 1000) {
      return `~${estimatedKB}KB`;
    } else {
      return `~${Math.round(estimatedKB / 1000)}MB`;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <Actionbar />
      
      <div className="w-full pt-20 pb-20">
        <div className="max-w-4xl mx-auto px-4">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold tracking-tight">Data Export</h1>
            <p className="text-gray-400 mt-2">Export your nutrition and health data</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Export Options */}
            <div className="lg:col-span-2 space-y-6">
              {/* Date Range */}
              <Card>
                <div className="p-6">
                  <h2 className="text-xl font-semibold mb-4">Date Range</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Start Date</label>
                      <input
                        type="date"
                        value={exportOptions.dateRange.start}
                        onChange={(e) => setExportOptions(prev => ({
                          ...prev,
                          dateRange: { ...prev.dateRange, start: e.target.value }
                        }))}
                        className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">End Date</label>
                      <input
                        type="date"
                        value={exportOptions.dateRange.end}
                        onChange={(e) => setExportOptions(prev => ({
                          ...prev,
                          dateRange: { ...prev.dateRange, end: e.target.value }
                        }))}
                        className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg"
                      />
                    </div>
                  </div>
                </div>
              </Card>

              {/* Data Types */}
              <Card>
                <div className="p-6">
                  <h2 className="text-xl font-semibold mb-4">Data to Export</h2>
                  <div className="space-y-3">
                    {Object.entries({
                      nutrition: 'Nutrition Logs (calories, macros, daily totals)',
                      weight: 'Weight Entries (daily weigh-ins)',
                      habits: 'Habit Tracking (daily check-ins, streaks)',
                      expenditure: 'Expenditure Data (TDEE estimates, trends)',
                      meals: 'Detailed Meals (foods, portions, timing)',
                      profile: 'User Profile (goals, targets, preferences)'
                    }).map(([key, description]) => (
                      <label key={key} className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={exportOptions.dataTypes[key as keyof typeof exportOptions.dataTypes]}
                          onChange={(e) => handleExportOptionChange(
                            key as keyof typeof exportOptions.dataTypes, 
                            e.target.checked
                          )}
                          className="mt-1"
                        />
                        <div>
                          <div className="font-medium capitalize">{key.replace('_', ' ')}</div>
                          <div className="text-sm text-gray-400">{description}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </Card>

              {/* Format */}
              <Card>
                <div className="p-6">
                  <h2 className="text-xl font-semibold mb-4">Export Format</h2>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="format"
                        value="csv"
                        checked={exportOptions.format === 'csv'}
                        onChange={(e) => setExportOptions(prev => ({
                          ...prev,
                          format: e.target.value as 'csv' | 'json'
                        }))}
                      />
                      <div>
                        <div className="font-medium">CSV</div>
                        <div className="text-sm text-gray-400">
                          Spreadsheet format, compatible with Excel and Google Sheets
                        </div>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="format"
                        value="json"
                        checked={exportOptions.format === 'json'}
                        onChange={(e) => setExportOptions(prev => ({
                          ...prev,
                          format: e.target.value as 'csv' | 'json'
                        }))}
                      />
                      <div>
                        <div className="font-medium">JSON</div>
                        <div className="text-sm text-gray-400">
                          Raw data format, preserves all data structure
                        </div>
                      </div>
                    </label>
                  </div>
                </div>
              </Card>
            </div>

            {/* Export Summary */}
            <div>
              <Card className="sticky top-24">
                <div className="p-6">
                  <h2 className="text-xl font-semibold mb-4">Export Summary</h2>
                  
                  <div className="space-y-3 mb-6">
                    <div className="flex justify-between text-sm">
                      <span>Date Range:</span>
                      <span className="text-gray-400">
                        {Math.ceil(
                          (new Date(exportOptions.dateRange.end).getTime() - 
                           new Date(exportOptions.dateRange.start).getTime()) / 
                          (1000 * 60 * 60 * 24)
                        )} days
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Data Types:</span>
                      <span className="text-gray-400">
                        {Object.values(exportOptions.dataTypes).filter(Boolean).length}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Format:</span>
                      <span className="text-gray-400 uppercase">
                        {exportOptions.format}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Est. Size:</span>
                      <span className="text-gray-400">
                        {getEstimatedFileSize()}
                      </span>
                    </div>
                  </div>

                  <Button
                    onClick={exportData}
                    loading={exporting}
                    disabled={
                      exporting || 
                      Object.values(exportOptions.dataTypes).every(v => !v)
                    }
                    className="w-full"
                  >
                    {exporting ? 'Exporting...' : 'Export Data'}
                  </Button>

                  <div className="mt-4 text-xs text-gray-500">
                    <p>
                      Your data will be downloaded to your device. 
                      No data is sent to external servers.
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* Privacy Notice */}
          <Card className="mt-8">
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">Privacy & Security</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                <div>
                  <div className="font-medium mb-2">🔒 Local Processing</div>
                  <div className="text-gray-400">
                    All data export is processed locally in your browser. 
                    No data is sent to external servers.
                  </div>
                </div>
                <div>
                  <div className="font-medium mb-2">📱 Your Data</div>
                  <div className="text-gray-400">
                    You own your data. Export it anytime and use it with 
                    any other nutrition tracking app.
                  </div>
                </div>
                <div>
                  <div className="font-medium mb-2">🗂️ Standard Formats</div>
                  <div className="text-gray-400">
                    CSV and JSON formats ensure compatibility with 
                    other apps and analysis tools.
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DataExportPage;