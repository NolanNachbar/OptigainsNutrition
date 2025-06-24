import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { format } from 'date-fns';
import { NutritionLog } from '../../utils/types';
import { theme } from '../../styles/theme';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface MacroChartProps {
  nutritionLogs: NutritionLog[];
  className?: string;
}

export const MacroChart: React.FC<MacroChartProps> = ({
  nutritionLogs,
  className = ''
}) => {
  const sortedLogs = [...nutritionLogs].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const labels = sortedLogs.map(log => format(new Date(log.date), 'EEE'));
  
  const datasets = [
    {
      label: 'Protein',
      data: sortedLogs.map(log => log.protein),
      backgroundColor: theme.colors.blue[500],
      borderColor: theme.colors.blue[600],
      borderWidth: 1,
      borderRadius: 4,
      categoryPercentage: 0.8,
      barPercentage: 0.9
    },
    {
      label: 'Carbs',
      data: sortedLogs.map(log => log.carbs),
      backgroundColor: theme.colors.green[500],
      borderColor: theme.colors.green[600],
      borderWidth: 1,
      borderRadius: 4,
      categoryPercentage: 0.8,
      barPercentage: 0.9
    },
    {
      label: 'Fat',
      data: sortedLogs.map(log => log.fat),
      backgroundColor: theme.colors.orange[500],
      borderColor: theme.colors.orange[600],
      borderWidth: 1,
      borderRadius: 4,
      categoryPercentage: 0.8,
      barPercentage: 0.9
    }
  ];

  const options: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
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
            const log = sortedLogs[context.dataIndex];
            const calories = log.calories;
            
            let percentage = 0;
            if (label === 'Protein') percentage = (value * 4 / calories) * 100;
            else if (label === 'Carbs') percentage = (value * 4 / calories) * 100;
            else if (label === 'Fat') percentage = (value * 9 / calories) * 100;
            
            return `${label}: ${value}g (${percentage.toFixed(0)}%)`;
          }
        }
      }
    },
    scales: {
      x: {
        stacked: false,
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
        stacked: false,
        grid: {
          color: theme.colors.gray[800],
          display: false
        },
        ticks: {
          color: theme.colors.gray[400],
          font: {
            size: 11
          },
          callback: (value) => `${value}g`
        },
        beginAtZero: true
      }
    }
  };

  return (
    <div className={`h-80 ${className}`}>
      <Bar data={{ labels, datasets }} options={options} />
    </div>
  );
};