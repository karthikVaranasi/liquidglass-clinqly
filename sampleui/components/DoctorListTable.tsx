import { useEffect, useState } from 'react';
import axiosInstance from '../utils/axiosInstance';
import { User } from 'lucide-react';


interface Doctor {
  id: number;
  name: string;
  email: string;
  department: string;
}

export default function DoctorListTable() {
  const [uniqueDoctors, setUniqueDoctors] = useState<Doctor[]>([]);

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const response = await axiosInstance.get<{ doctors: Doctor[] }>(`/dashboard/doctors`);

        const filtered = response.data.doctors
          .filter((doc) => doc.id !== 1)
          .map((doc) => ({
            ...doc,
            id: doc.id - 1,
          }));

        // Get only one doctor per department, up to 6 total
        const seenDepartments = new Set<string>();
        const selected: Doctor[] = [];
        var i=0;

        for (const doc of filtered) {
            seenDepartments.add(doc.department);
            selected.push(doc);
            i+=1;
            if (i==5) break;
        }

        setUniqueDoctors(selected);
      } catch (error) {
        console.error("Failed to fetch doctors:", error);
      }
    };

    fetchDoctors();
  }, []);

  return (
    <div className="w-full">
      <div className="w-full bg-white rounded-xl overflow-hidden p-4 sm:p-6">
        <div className="h-auto max-h-[90vh] overflow-y-auto">
          <div className="flex items-center gap-2 mb-4 text-[#0D1A12]">
            <User className="w-5 h-5" />
            <h2 className="text-lg font-semibold">Featured Doctors
                
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[640px] w-full text-sm text-left">
              <thead className="bg-gray-100 text-gray-700 font-medium">
                <tr>
                  <th className="px-3 py-2 whitespace-nowrap">ID</th>
                  <th className="px-3 py-2 whitespace-nowrap">Name</th>
                  <th className="px-3 py-2 whitespace-nowrap">Email</th>
                  <th className="px-3 py-2 whitespace-nowrap">Department</th>
                </tr>
              </thead>
              <tbody>
                {uniqueDoctors.map((doc) => (
                  <tr key={doc.id} className="border-b border-gray-200">
                    <td className="px-3 py-3 whitespace-nowrap font-medium text-gray-900">{doc.id}</td>
                    <td className="px-3 py-3 whitespace-nowrap">{doc.name}</td>
                    <td className="px-3 py-3 whitespace-nowrap">{doc.email}</td>
                    <td className="px-3 py-3 text-teal-600 whitespace-nowrap">{doc.department}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      </div>
    </div>
  );
}
