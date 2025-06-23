import React from 'react';
import Actionbar from '../components/Actionbar';
import { WeeklyCheckIn } from '../components/WeeklyCheckIn';

const WeeklyCheckInPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-900">
      <Actionbar />
      
      <div className="w-full pt-24 pb-20">
        <div className="max-w-2xl mx-auto px-4">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold tracking-tight">Weekly Check-In</h1>
            <p className="text-gray-400 mt-2">Review your week and get personalized recommendations</p>
          </div>
          
          {/* Weekly Check-In Component */}
          <WeeklyCheckIn />
        </div>
      </div>
    </div>
  );
};

export default WeeklyCheckInPage;