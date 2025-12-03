import React from 'react';
import rating from '../assets/rating.svg';
import patientIcon from '../assets/patientIcon.svg';

const Feedback: React.FC = () => {
  return (
    <div className="flex gap-[20px]">
      {/* Card 1 */}
      <div className="flex items-center justify-between w-[456px] h-[48px] min-w-[158px] gap-2 px-4 py-2 rounded-[10px] bg-white">
        <div className="flex items-center gap-2">
          <img src={rating} alt="Rating Icon" className="w-8 h-8" />
          <span className="text-sf font-medium">Rating & Reviews</span>
        </div>
        <span className="text-sf font-semibold text-orange-500">4.8 /<span className="text-[#098289]">2500</span></span>
      </div>

      {/* Card 2 */}
      <div className="flex items-center justify-between w-[456px] h-[48px] min-w-[158px] gap-2 px-4 py-2 rounded-[10px] bg-white">
        <div className="flex items-center gap-2">
          <img src={patientIcon} alt="Patients Icon" className="w-8 h-8" />
          <span className="text-sm font-medium">New Patients</span>
        </div>
        <span className="text-sm font-semibold">32</span>
      </div>
    </div>
  );
};

export default Feedback;
