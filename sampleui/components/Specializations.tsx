import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaBone } from 'react-icons/fa';
import { GiBrain } from 'react-icons/gi';
import { MdScience } from 'react-icons/md';
import { AiOutlineUser } from 'react-icons/ai';
import { GoHeart } from 'react-icons/go';
import { RiPulseLine } from 'react-icons/ri';
import { FaArrowRight } from 'react-icons/fa';
import axiosInstance from '../utils/axiosInstance';

type DepartmentStats = Record<string, number>;

const getIconByDepartment = (department: string) => {
  switch (department.toLowerCase()) {
    case 'cardiology':
    case 'cardiologist':
      return <GoHeart className="text-2xl text-emerald-800" />;
    case 'general physician':
      return <RiPulseLine className="text-2xl text-emerald-800" />;
    case 'neurology':
      return <GiBrain className="text-2xl text-emerald-800" />;
    case 'orthopedic':
      return <FaBone className="text-2xl text-emerald-800" />;
    case 'endocrinology':
      return <MdScience className="text-2xl text-emerald-800" />;
    default:
      return <AiOutlineUser className="text-2xl text-emerald-800" />;
  }
};

const Specializations = () => {
  const navigate = useNavigate();
  const [doctorStats, setDoctorStats] = useState<DepartmentStats>({});

  useEffect(() => {
    axiosInstance
      .get<{ doctors: { department: string }[] }>('/dashboard/doctors')
      .then((res) => {
        const stats: DepartmentStats = {};
        res.data.doctors.forEach((doc) => {
          const dept = doc.department?.trim();
          if (dept && dept.toLowerCase() !== 'temp') {
            stats[dept] = (stats[dept] || 0) + 1;
          }
        });
        setDoctorStats(stats);
      })
      .catch((err) => console.error('Failed to fetch doctors:', err));
  }, []);

  const departments = Object.entries(doctorStats);

  return (
    <>
      <div className="w-full h-[180px] p-4 rounded-[10px] bg-white flex flex-col">
        {/* Header */}
        <div className="flex flex-row justify-between items-center w-full mb-3">
          <h2 className="text-lg font-semibold text-gray-900">
            Specializations
          </h2>
          {departments.length > 5 && (
            <button
              className="text-emerald-800 border border-emerald-800 w-[82px] h-[32px] rounded-[4px] text-sm hover:bg-emerald-50 transition"
              onClick={() => navigate('/doctor')}
            >
              View all
            </button>
          )}
        </div>

        {/* Specialization Cards - Scrollable if more than 5 */}
        <div className="flex gap-3 overflow-x-auto overflow-y-hidden flex-1">
          {departments.map(([title, count], index) => (
            <div
              key={index}
              className="flex flex-col w-[145px] min-w-[145px] h-[110px] rounded-lg bg-white hover:shadow-md transition cursor-pointer relative"
              onClick={() => navigate(`/doctor?category=${encodeURIComponent(title)}`)}
            >
              {/* Inner content with borders */}
              <div className="flex flex-col justify-between border-t border-l border-r border-b border-gray-200 rounded-lg p-3 h-[90px]">
                <div className="flex justify-between items-start">
                  <div>{getIconByDepartment(title)}</div>
                  <FaArrowRight className="text-sm text-emerald-600" />
                </div>
                <div className="font-semibold text-black-900 text-sm capitalize text-left">{title}</div>
                <div className="text-xs text-gray-600 text-left">{count} Doctors</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default Specializations;
