import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, UserRole, AdminData, DoctorData, ClinicData, ClinicApiResponse, DoctorApiResponse } from '../utils/types';
import { decodeJWT, isTokenExpired } from '../utils/jwtUtils';
import axiosInstance from '../utils/axiosInstance';

interface UserState extends User {
  // Loading state
  isLoading: boolean;
  
  // Actions
  setUser: (user: Partial<User>) => void;
  setAuthToken: (token: string) => void;
  setUserRole: (role: UserRole) => void;
  setUserData: (data: AdminData | DoctorData) => void;
  setClinicData: (data: ClinicData) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
  initializeFromToken: () => Promise<boolean>;
}

const initialState: User = {
  authToken: null,
  userRole: null,
  userData: undefined,
  clinicData: undefined,
  userName: undefined,
  userEmail: undefined,
};

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      ...initialState,
      isLoading: false,

      // Set multiple user fields at once
      setUser: (user: Partial<User>) => {
        set((state) => ({ ...state, ...user }));
      },

      // Set authentication token
      setAuthToken: (token: string) => {
        set({ authToken: token });
        localStorage.setItem('authToken', token);
      },

      // Set user role
      setUserRole: (role: UserRole) => {
        set({ userRole: role });
      },

      // Set user data (admin or doctor)
      setUserData: (data: AdminData | DoctorData) => {
        set({ 
          userData: data,
          userName: `${data.first_name} ${data.last_name}`,
          userEmail: data.email,
        });
      },

      // Set clinic data
      setClinicData: (data: ClinicData) => {
        set({ 
          clinicData: data,
        });
      },

      // Check if user is authenticated
      isAuthenticated: () => {
        const state = get();
        return !!(state.authToken && state.userRole);
      },

      logout: () => {
        // Clear authToken from localStorage
        localStorage.removeItem('authToken');
        // Clear the persisted state from Zustand
        localStorage.removeItem('user-storage');
        set(initialState);
      },

      initializeFromToken: async () => {
        try {
          set({ isLoading: true });
          
          const state = get();
          const authToken = state.authToken || localStorage.getItem('authToken');
          
          if (!authToken) {
            console.log('🚫 No auth token found');
            set({ isLoading: false });
            return false;
          }

          // Check if token is expired
          if (isTokenExpired(authToken)) {
            console.log('🚫 Token is expired');
            get().logout();
            set({ isLoading: false });
            return false;
          }

          // Decode token to get user info
          const decoded = decodeJWT(authToken);
          if (!decoded) {
            console.log('🚫 Failed to decode token');
            get().logout();
            set({ isLoading: false });
            return false;
          }

          const userId = parseInt(decoded.sub, 10);
          const role = decoded.role;

          // Handle admin role - no clinic_id in token
          if (role === 'admin') {
            const nameParts = decoded.name.split(' ');
            const firstName = nameParts[0] || '';
            const lastName = nameParts.slice(1).join(' ') || '';

            const userData: AdminData = {
              id: userId,
              first_name: firstName,
              last_name: lastName,
              email: decoded.email || '',
              clinic_id: 0,
            };

            // Set all admin data in one call
            set({
              authToken,
              userRole: role,
              userData,
              userName: decoded.name,
              userEmail: decoded.email || undefined,
              isLoading: false,
            });

            return true;
          }

          // Handle doctor role - has clinic_id in token
          if (role === 'doctor' && decoded.clinic_id) {
            const doctorId = userId;
            const clinicId = decoded.clinic_id;

            // Fetch doctor and clinic data in parallel
            const [doctorResponse, clinicResponse] = await Promise.all([
              axiosInstance.get<DoctorApiResponse>(`/dashboard/doctors/${doctorId}`),
              axiosInstance.get<ClinicApiResponse>(`/dashboard/clinics/${clinicId}`),
            ]);

            const doctorApiData = doctorResponse.data;
            const clinicApiData = clinicResponse.data;

            // Transform API responses
            const nameParts = doctorApiData.name.split(' ');
            const firstName = nameParts[0] || '';
            const lastName = nameParts.slice(1).join(' ') || '';

            const userData: DoctorData = {
              id: doctorApiData.id,
              first_name: firstName,
              last_name: lastName,
              email: doctorApiData.email,
              clinic_id: doctorApiData.clinic_id,
              department: doctorApiData.department,
            };

            const clinicData: ClinicData = {
              id: clinicApiData.id,
              name: clinicApiData.name,
              phone_number: clinicApiData.phone_number,
              logo_url: clinicApiData.logo_url,
              address: clinicApiData.address,
              created_at: clinicApiData.created_at,
            };

            console.log('✅ Fetched doctor and clinic data successfully');

            // Set all doctor data in one call
            set({
              authToken,
              userRole: role,
              userData,
              clinicData,
              userName: doctorApiData.name,
              userEmail: doctorApiData.email,
              isLoading: false,
            });

            return true;
          }

          // If we get here, something is wrong with the token
          console.error('❌ Invalid token structure');
          get().logout();
          set({ isLoading: false });
          return false;

        } catch (error) {
          console.error('❌ Failed to initialize from token:', error);
          get().logout();
          set({ isLoading: false });
          return false;
        }
      },
    }),
    {
      name: 'user-storage', // name of the item in localStorage
      partialize: (state) => ({
        // Only persist the auth token - everything else is fetched from API on refresh
        authToken: state.authToken,
      }),
    }
  )
);

