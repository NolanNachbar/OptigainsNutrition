import React, { createContext, useContext, useState, useEffect } from 'react';

interface DateContextType {
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
  isDevelopment: boolean;
}

const DateContext = createContext<DateContextType | undefined>(undefined);

export const DateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // Check if there's a stored dev date
  const getInitialDate = () => {
    if (isDevelopment) {
      const storedDate = localStorage.getItem('devCurrentDate');
      if (storedDate) {
        return new Date(storedDate);
      }
    }
    return new Date();
  };

  const [currentDate, setCurrentDateState] = useState<Date>(getInitialDate());

  const setCurrentDate = (date: Date) => {
    setCurrentDateState(date);
    if (isDevelopment) {
      localStorage.setItem('devCurrentDate', date.toISOString());
    }
  };

  // Update the date every minute to keep it current (unless in dev mode with custom date)
  useEffect(() => {
    if (!isDevelopment || !localStorage.getItem('devCurrentDate')) {
      const interval = setInterval(() => {
        setCurrentDateState(new Date());
      }, 60000); // Update every minute

      return () => clearInterval(interval);
    }
  }, [isDevelopment]);

  return (
    <DateContext.Provider value={{ currentDate, setCurrentDate, isDevelopment }}>
      {children}
    </DateContext.Provider>
  );
};

export const useDate = () => {
  const context = useContext(DateContext);
  if (context === undefined) {
    throw new Error('useDate must be used within a DateProvider');
  }
  return context;
};

// Helper function to get current date that can be used outside of components
export const getCurrentDate = (): Date => {
  if (process.env.NODE_ENV === 'development') {
    const storedDate = localStorage.getItem('devCurrentDate');
    if (storedDate) {
      return new Date(storedDate);
    }
  }
  return new Date();
};