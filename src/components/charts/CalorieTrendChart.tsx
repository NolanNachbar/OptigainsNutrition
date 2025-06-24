import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartOptions
} from 'chart.js';
import { Chart } from 'react-chartjs-2';
import { format } from 'date-fns';
import { NutritionLog } from '../../utils/types';
import { theme } from '../../styles/theme';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface CalorieTrendChartProps {
  nutritionLogs: NutritionLog[];
  targetCalories?: number;
  adaptiveTDEE?: number;
  className?: string;
}

export const CalorieTrendChart: React.FC<CalorieTrendChartProps> = ({
  nutritionLogs,
  targetCalories,
  adaptiveTDEE,
  className = ''
}) => {
  const sortedLogs = [...nutritionLogs].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const labels = sortedLogs.map(log => format(new Date(log.date), 'MMM d'));
  const actualCalories = sortedLogs.map(log => log.calories);
  
  // Calculate 7-day moving average
  const movingAverage = actualCalories.map((_, index) => {
    const start = Math.max(0, index - 6);
    const values = actualCalories.slice(start, index + 1);
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  });

  const datasets: any[] = [
    {
      type: 'bar' as const,
      label: 'Daily Calories',
      data: actualCalories,
      backgroundColor: theme.colors.blue[500] + '40',
      borderColor: theme.colors.blue[500],
      borderWidth: 1,
      borderRadius: 4,
      categoryPercentage: 0.8,
      barPercentage: 0.9
    },
    {
      type: 'line' as const,
      label: '7-Day Average',
      data: movingAverage,
      borderColor: theme.colors.green[500],
      backgroundColor: 'transparent',
      borderWidth: 3,
      pointRadius: 0,
      pointHoverRadius: 4,
      tension: 0.4
    }
  ];

  if (targetCalories) {
    datasets.push({
      type: 'line' as const,
      label: 'Target',
      data: new Array(labels.length).fill(targetCalories),
      borderColor: theme.colors.orange[500],
      backgroundColor: 'transparent',
      borderDash: [10, 5],
      borderWidth: 2,
      pointRadius: 0,
      pointHoverRadius: 0
    });
  }

  if (adaptiveTDEE) {
    datasets.push({
      type: 'line' as const,
      label: 'Adaptive TDEE',
      data: new Array(labels.length).fill(adaptiveTDEE),
      borderColor: theme.colors.purple[500],
      backgroundColor: 'transparent',
      borderDash: [5, 5],
      borderWidth: 2,
      pointRadius: 0,
      pointHoverRadius: 0
    });
  }

  const options: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false
    },
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
        labels: {
          color: theme.colors.gray[300],
          font: {
            size: 12,
            family: theme.typography.fontFamily.sans
          },
          usePointStyle: true,
          padding: 20
        }
      },
      tooltip: {
        backgroundColor: theme.colors.gray[800],
        titleColor: theme.colors.gray[100],
        bodyColor: theme.colors.gray[300],
        borderColor: theme.colors.gray[700],
        borderWidth: 1,
        cornerRadius: 8,
        padding: 12,
        callbacks: {
          label: (context) => {
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            
            if (targetCalories && context.datasetIndex === 0) {
              const diff = value - targetCalories;
              const sign = diff > 0 ? '+' : '';
              return `${label}: ${value} cal (${sign}${diff})`;
            }
            
            return `${label}: ${Math.round(value)} cal`;
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        },
        ticks: {
          color: theme.colors.gray[400],
          font: {
            size: 11
          }
        }
      },
      y: {
        grid: {
          color: theme.colors.gray[800],
          display: false
        },
        ticks: {
          color: theme.colors.gray[400],
          font: {
            size: 11
          },
          callback: (value) => `${value}`
        },
        beginAtZero: false
      }
    }
  };

  return (
    <div className={`h-80 ${className}`}>
      <Chart type='bar' data={{ labels, datasets }} options={options} />
    </div>
  );
};