import apiClient from '../client';

export const staffService = {
  createStaff: (data) => apiClient.post('/staff', data),
  getStaff: (params) => apiClient.get('/staff', { params }),
  getStaffDropdown: () => apiClient.get('/staff/dropdown'),
  getStaffById: (id) => apiClient.get(`/staff/${id}`),
  updateStaff: (id, data) => apiClient.put(`/staff/${id}`, data),
  deactivateStaff: (id) => apiClient.put(`/staff/${id}/deactivate`),
  activateStaff: (id) => apiClient.put(`/staff/${id}/activate`),
  deleteStaff: (id) => apiClient.delete(`/staff/${id}`),  // ADD THIS LINE
  getStaffActivities: (id, startDate, endDate) => 
    apiClient.get(`/staff/${id}/activities`, { params: { start_date: startDate, end_date: endDate } }),
  getStaffSummary: () => apiClient.get('/staff/summary'),
};