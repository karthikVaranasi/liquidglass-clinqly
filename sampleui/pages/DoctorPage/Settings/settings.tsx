import { useState } from 'react';
import { Settings as SettingsIcon } from 'lucide-react';
import WorkingHours from './WorkingHours';
import AvailabilityExceptions from './AvailabilityExceptions';

type TabType = 'working-hours' | 'exceptions';

const DoctorSettings = () => {
  const [activeTab, setActiveTab] = useState<TabType>('working-hours');

  return (
    <div className="w-full min-h-screen pt-[64px] bg-gradient-to-br from-[#F4F8FB] via-[#F0F5F8] to-[#E8F2F5] page-content-with-topbar">
      <div className="max-w-[1200px] mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <SettingsIcon className="w-5 h-5 text-[#098289]" />
            <h1 className="text-xl font-bold text-[#03585D]">Settings</h1>
          </div>
          <p className="text-sm text-gray-600">Manage your clinic settings and availability</p>
                    </div>
                    
        {/* Tabs */}
        <div className="mb-6">
          <div className="flex gap-2 border-b border-gray-200">
                    <button
              onClick={() => setActiveTab('working-hours')}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                activeTab === 'working-hours'
                  ? 'border-[#098289] text-[#098289]'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
              }`}
            >
              Working Hours
                    </button>
              <button
              onClick={() => setActiveTab('exceptions')}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                activeTab === 'exceptions'
                  ? 'border-[#098289] text-[#098289]'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
              }`}
            >
              Off Days
              </button>
            </div>
        </div>

        {/* Tab Content */}
        <div className=" rounded-lg  ">
          {activeTab === 'working-hours' && <WorkingHours />}
          {activeTab === 'exceptions' && <AvailabilityExceptions />}
        </div>
      </div>
    </div>
  );
};

export default DoctorSettings;
