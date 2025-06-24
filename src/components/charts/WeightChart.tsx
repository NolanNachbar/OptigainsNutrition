import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartOptions
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { format } from 'date-fns';
import { WeightEntry } from '../../utils/types';
import { theme } from '../../styles/theme';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface WeightChartProps {
  weightEntries: WeightEntry[];
  trendWeight?: number[];
  targetWeight?: number;
  className?: string;
}

export const WeightChart: React.FC<WeightChartProps> = ({
  weightEntries,
  trendWeight,
  targetWeight,
  className = ''
}) => {
  const sortedEntries = [...weightEntries].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const labels = sortedEntries.map(entry => format(new Date(entry.date), 'MMM d'));
  const actualWeights = sortedEntries.map(entry => entry.weight);

  const datasets: any[] = [
    {
      label: 'Actual Weight',
      data: actualWeights,
      borderColor: theme.colors.blue[500],
      backgroundColor: theme.colors.blue[500] + '20',
      pointBackgroundColor: theme.colors.blue[500],
      pointBorderColor: theme.colors.blue[600],
      pointBorderWidth: 2,
      pointRadius: 4,
      pointHoverRadius: 6,
      tension: 0.1
    }
  ];

  if (trendWeight && trendWeight.length === sortedEntries.length) {
    datasets.push({
      label: 'Trend Weight',
      data: trendWeight,
      borderColor: theme.colors.green[500],
      backgroundColor: 'transparent',
      borderDash: [5, 5] as [number, number],
      pointRadius: 0,
      pointHoverRadius: 0,
      tension: 0.4
    });
  }

  if (targetWeight) {
    datasets.push({
      label: 'Target Weight',
      data: new Array(labels.length).fill(targetWeight),
      borderColor: theme.colors.orange[500],
      backgroundColor: 'transparent',
      borderDash: [10, 5] as [number, number],
      pointRadius: 0,
      pointHoverRadius: 0,
      borderWidth: 2
    });
  }

  const options: ChartOptions<'line'> = {
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
        displayColors: true,
        callbacks: {
          label: (context) => {
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            return `${label}: ${value.toFixed(1)} kg`;
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          color: theme.colors.gray[800],
          display: true
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
          display: true
        },
        ticks: {
          color: theme.colors.gray[400],
          font: {
            size: 11
          },
          callback: (value) => `${value} kg`
        },
        beginAtZero: false
      }
    }
  };

  return (
    <div className={`h-80 ${className}`}>
      <Line data={{ labels, datasets }} options={options} />
    </div>
  );
};