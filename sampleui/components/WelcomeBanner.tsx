import { useMemo } from "react";
import { Phone } from 'lucide-react';
import { useUserStore } from '../stores/useUserStore';

// Helper function to capitalize name parts
const capitalizeName = (name: string): string => {
  return name
    .split(/[.\-_]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

const WelcomeBanner = () => {
  const { userRole, userName, userEmail, clinicData } = useUserStore();

  // Compute welcome name from store data
  const welcomeName = useMemo(() => {
    if (userRole === "admin") {
      return "Admin";
    } else if (userRole === "doctor") {
      if (userName && userName.trim()) {
        return userName;
      } else if (userEmail) {
        const namePart = userEmail.split("@")[0];
        return capitalizeName(namePart);
      } else {
        return "Doctor";
      }
    } else {
      return "User";
    }
  }, [userRole, userName, userEmail]);

  // Use phone_number from clinicData, fallback to placeholder
  const twilioPhone = useMemo(() => {
    return clinicData?.phone_number || "xxx-xxx-xxxx";
  }, [clinicData?.phone_number]);

  return (
    <>
      {/* Call Forwarding Banner - only show if twilio phone number exists and user is NOT admin */}
      {twilioPhone && twilioPhone !== "xxx-xxx-xxxx" && userRole !== "admin" && (
        <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Phone className="w-5 h-5 text-blue-600" />
            <div>
              <p className="text-blue-800 font-medium">
                Please forward your clinic number to <span className="font-bold">{twilioPhone}</span> to enable the service
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="mt-1 flex flex-col sm:flex-row items-start sm:items-center font-geist justify-between bg-white rounded-[10px] px-4 py-3 sm:py-[6px] w-full min-h-[52px] sm:h-[52px] gap-2 sm:gap-0">
        <span className="text-base sm:text-lg font-regular text-gray-800">
          Welcome Back,{" "}
          <span className="text-black-600 font-bold">{welcomeName}</span>
        </span>
      </div>
    </>
  );
};

export default WelcomeBanner;