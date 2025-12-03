/**
 * JWT utility functions for decoding and validating tokens
 */

export interface DecodedToken {
  sub: string; // user_id (admin_id or doctor_id) as string
  name: string;
  email?: string; // Optional - present in admin and some doctor tokens
  clinic_id?: number; // Optional - only present for doctor tokens
  role: 'doctor' | 'admin';
  exp: number; // expiration timestamp
  impersonated_by?: string; // Admin ID when admin is impersonating a doctor
}

/**
 * Decode a JWT token and return the payload
 */
export const decodeJWT = (token: string): DecodedToken | null => {
  try {
    // Check if token has the correct JWT format (3 parts separated by dots)
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.error('Invalid JWT format: expected 3 parts');
      return null;
    }

    const base64Url = parts[1];
    if (!base64Url) {
      console.error('Invalid JWT: missing payload');
      return null;
    }

    // Decode base64url to base64
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    
    // Decode base64 to JSON string
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    
    const decoded = JSON.parse(jsonPayload) as DecodedToken;
    
    return decoded;
  } catch (error) {
    console.error('Error decoding JWT:', error);
    return null;
  }
};

/**
 * Check if a JWT token is expired
 */
export const isTokenExpired = (token: string): boolean => {
  const decoded = decodeJWT(token);
  if (!decoded || !decoded.exp) {
    return true;
  }
  
  // exp is in seconds, Date.now() is in milliseconds
  return decoded.exp < Date.now() / 1000;
};

/**
 * Get the doctor ID from a JWT token
 */
export const getDoctorIdFromToken = (token: string): number | null => {
  const decoded = decodeJWT(token);
  if (!decoded || !decoded.sub) {
    return null;
  }
  return parseInt(decoded.sub, 10);
};

/**
 * Get the clinic ID from a JWT token
 */
export const getClinicIdFromToken = (token: string): number | null => {
  const decoded = decodeJWT(token);
  return decoded?.clinic_id || null;
};

/**
 * Get the user role from a JWT token
 */
export const getRoleFromToken = (token: string): 'doctor' | 'admin' | null => {
  const decoded = decodeJWT(token);
  return decoded?.role || null;
};

