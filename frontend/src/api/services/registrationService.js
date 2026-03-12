import apiClient from '../client';

export const registrationService = {
  createRegistration: (data) => apiClient.post('/registrations', data),
  getRegistrations: (params) => apiClient.get('/registrations', { params }),
  getMonthlyRegistrations: (year, month, options = {}) => {
    const params = { year, month };
    
    // If export is true, add it to params
    if (options.export) {
      params.export = true;
    }
    
    // Configure request based on whether it's an export
    const config = {
      params,
      ...(options.export && { responseType: 'blob' }) // Set responseType to 'blob' for exports
    };
    
    return apiClient.get('/registrations/monthly', config);
  },
  getRegistration: (id) => apiClient.get(`/registrations/${id}`),
  getPrintableRegistration: (id) => apiClient.get(`/registrations/${id}/print`),
  getBranchSummary: () => apiClient.get('/registrations/branches/summary'),
};