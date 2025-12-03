import WelcomeBanner from '../components/WelcomeBanner';
import StatCards from '../components/StatCards';
import Specializations from '../components/Specializations';
import PatientsOverview from '../components/patientsoverviewchart';
import AppointmentsCard from '../components/AppointmentList';
import AppointmentTrendsContainer from '../components/AppointmentsChart';

export default function Dashboard() {
  return (
    <>
      <div className="w-full min-h-screen pt-[64px] bg-[#F4F8FB]">
        <div className="w-full max-w-[1400px] py-3 px-4 sm:px-6 mx-auto flex flex-col">
          <div className="w-full mb-2">
            <WelcomeBanner />
          </div>

          <div className="w-full mb-2">
            <StatCards />
          </div>

          {/* Charts + Side Panel */}
          <div className="flex flex-col lg:flex-row gap-3 lg:gap-4 items-stretch w-full">
            {/* Left Column */}
            <div className="w-full lg:flex-1 flex flex-col gap-3">
              {/* Charts Row */}
              <div className="flex flex-col md:flex-row gap-3">
                <div className="w-full md:w-1/2">
                  <PatientsOverview />
                </div>
                <div className="w-full md:w-1/2">
                  <AppointmentTrendsContainer />
                </div>
              </div>
              {/* Specializations */}
              <div className="w-full">
                 <Specializations />
              </div>
            </div>

            {/* Right Column */}
            <div className="w-full lg:w-[380px] lg:flex-shrink-0">
              <AppointmentsCard />
            </div>
          </div>

          {/* Support Contact */}
          <div className="w-full mt-3 text-center">
            <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
              <p className="text-sm text-gray-600 mb-1">Need help? Contact our support team</p>
              <a
                href="tel:+17793249797"
                className="text-sm font-medium text-[#007C91] hover:text-[#005f6b] transition-colors"
              >
                +1 (779) 324‑9797
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
