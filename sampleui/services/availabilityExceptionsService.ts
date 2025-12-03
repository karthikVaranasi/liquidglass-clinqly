/**
 * Service for managing doctor availability exceptions
 */

import axiosInstance from '../utils/axiosInstance';
import type { AvailabilityException, CreateAvailabilityExceptionRequest, UpdateAvailabilityExceptionRequest } from '../utils/types';

/**
 * Get availability exceptions for a doctor
 * @param doctorId - Doctor's ID
 * @param startDate - Optional start date for filtering (YYYY-MM-DD)
 * @param endDate - Optional end date for filtering (YYYY-MM-DD)
 * @returns Array of availability exceptions
 */
export const getAvailabilityExceptions = async (
  doctorId: number,
  startDate?: string,
  endDate?: string
): Promise<AvailabilityException[]> => {
  const params = new URLSearchParams();
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);

  const queryString = params.toString();
  const url = `/dashboard/doctors/availability-exceptions/${doctorId}${queryString ? `?${queryString}` : ''}`;

  const response = await axiosInstance.get<AvailabilityException[]>(url);
  return response.data;
};

/**
 * Create a new availability exception
 * @param data - Exception creation data
 * @returns Created availability exception
 */
export const createAvailabilityException = async (
  data: CreateAvailabilityExceptionRequest
): Promise<AvailabilityException> => {
  const response = await axiosInstance.post<AvailabilityException>(
    '/dashboard/doctors/availability-exceptions',
    data
  );
  return response.data;
};

/**
 * Update an existing availability exception
 * @param exceptionId - Exception's ID
 * @param data - Exception update data
 * @returns Updated availability exception
 */
export const updateAvailabilityException = async (
  exceptionId: number,
  data: UpdateAvailabilityExceptionRequest
): Promise<AvailabilityException> => {
  const response = await axiosInstance.put<AvailabilityException>(
    `/dashboard/doctors/availability-exceptions/${exceptionId}`,
    data
  );
  return response.data;
};

/**
 * Delete an availability exception
 * @param exceptionId - Exception's ID
 */
export const deleteAvailabilityException = async (
  exceptionId: number
): Promise<void> => {
  await axiosInstance.delete(`/dashboard/doctors/availability-exceptions/${exceptionId}`);
};
