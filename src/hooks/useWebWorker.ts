import { useEffect, useRef, useState, useCallback } from 'react';

interface WorkerMessage {
  type: string;
  data?: any;
  error?: string;
}

export function useTDEEWorker() {
  const workerRef = useRef<Worker | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Create worker instance
    workerRef.current = new Worker('/tdee.worker.js');

    // Cleanup on unmount
    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  const calculateTDEE = useCallback(async (data: {
    weights: any[];
    nutritionLogs: any[];
    targetMacros: any;
  }): Promise<any> => {
    return new Promise((resolve, reject) => {
      if (!workerRef.current) {
        reject(new Error('Worker not initialized'));
        return;
      }

      setIsCalculating(true);
      setError(null);

      const handleMessage = (event: MessageEvent<WorkerMessage>) => {
        const { type, data, error } = event.data;

        if (type === 'tdeeResult') {
          setIsCalculating(false);
          resolve(data);
          workerRef.current?.removeEventListener('message', handleMessage);
        } else if (type === 'error') {
          setIsCalculating(false);
          setError(error || 'Unknown error');
          reject(new Error(error));
          workerRef.current?.removeEventListener('message', handleMessage);
        }
      };

      workerRef.current.addEventListener('message', handleMessage);
      workerRef.current.postMessage({ type: 'calculateTDEE', data });
    });
  }, []);

  const calculateTrend = useCallback(async (weights: any[], smoothingFactor?: number): Promise<any> => {
    return new Promise((resolve, reject) => {
      if (!workerRef.current) {
        reject(new Error('Worker not initialized'));
        return;
      }

      const handleMessage = (event: MessageEvent<WorkerMessage>) => {
        const { type, data, error } = event.data;

        if (type === 'trendResult') {
          resolve(data);
          workerRef.current?.removeEventListener('message', handleMessage);
        } else if (type === 'error') {
          reject(new Error(error));
          workerRef.current?.removeEventListener('message', handleMessage);
        }
      };

      workerRef.current.addEventListener('message', handleMessage);
      workerRef.current.postMessage({ 
        type: 'calculateTrend', 
        data: { weights, smoothingFactor } 
      });
    });
  }, []);

  return {
    calculateTDEE,
    calculateTrend,
    isCalculating,
    error
  };
}