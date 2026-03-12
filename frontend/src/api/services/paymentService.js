import apiClient from '../client';

export const paymentService = {
  // Get all payments with filters
  getPayments: (params) => apiClient.get('/payments/', { params }),
  
  // Get single payment
  getPayment: (id) => apiClient.get(`/payments/${id}`),
  
  // Create new payment
  createPayment: (data) => apiClient.post('/payments/', data),
  
  // Process refund
  processRefund: (id) => apiClient.post(`/payments/${id}/refund`),
  
  // Get payment summary
  getPaymentSummary: () => apiClient.get('/payments/summary'),
  
  // Export payments
  exportPayments: (params) => apiClient.get('/payments/export', { 
    params, 
    responseType: 'blob' 
  }),
};