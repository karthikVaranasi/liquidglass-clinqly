import React, { useState } from 'react';
import { FaPhone, FaTimes } from 'react-icons/fa';

const ContactInfo: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Contact Button */}
      <button
        onClick={toggleExpanded}
        className="bg-[#007C91] hover:bg-[#005f6b] text-white p-3 rounded-full shadow-lg transition-all duration-300 hover:scale-105 flex items-center justify-center"
        title="Contact Support"
      >
        <FaPhone className="text-lg" />
      </button>

      {/* Contact Info Panel */}
      {isExpanded && (
        <div className="absolute bottom-16 right-0 bg-white rounded-lg shadow-xl border border-gray-200 p-4 min-w-[200px] animate-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-800">Contact Support</h3>
            <button
              onClick={toggleExpanded}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <FaTimes className="text-sm" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="tel:+17793249797"
              className="text-sm text-gray-700 hover:text-[#007C91] transition-colors font-medium"
            >
              +1 (779) 324‑9797
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContactInfo;
