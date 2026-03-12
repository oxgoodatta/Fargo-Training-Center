import apiClient from '../client';

export const authService = {
  // Unified login for all users
  login: (identifier, password) =>
    apiClient.post('/auth/login', { identifier, password }),
  
  // Student registration
  registerStudent: (studentData) =>
    apiClient.post('/auth/register/student', studentData),
  
  // Staff registration (Admin only)
  registerStaff: (staffData) =>
    apiClient.post('/auth/register/staff', staffData),
  
  // Verify token
  verifyToken: (token) =>
    apiClient.post('/auth/verify-token', { token }),
  
  // Logout
  logout: () =>
    apiClient.post('/auth/logout'),
  
  // Get current user from localStorage
  getCurrentUser: () => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },
  
  // Get user role
  getUserRole: () => localStorage.getItem('role'),
  
  // Get user type (staff/student)
  getUserType: () => localStorage.getItem('user_type'),
  
  // Check if user is authenticated
  isAuthenticated: () => {
    const token = localStorage.getItem('token');
    return !!token;
  },
  
  // Check if user is admin
  isAdmin: () => localStorage.getItem('role') === 'admin',
  
  // Check if user is staff (non-admin)
  isStaff: () => {
    const role = localStorage.getItem('role');
    return role === 'registrar' || role === 'field_agent';
  },
  
  // Check if user is student
  isStudent: () => localStorage.getItem('role') === 'student',
  
  // Clear auth data
  clearAuth: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('role');
    localStorage.removeItem('user_type');
  },
};