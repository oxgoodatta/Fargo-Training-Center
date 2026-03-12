import apiClient from '../client';

export const notificationService = {
  // Send notification
  sendNotification: (data) => apiClient.post('/notifications/send', data),
  
  // Get notifications history
  getNotifications: (params) => apiClient.get('/notifications', { params }),
  
  // Get notification by ID
  getNotification: (id) => apiClient.get(`/notifications/${id}`),
  
  // Templates
  getTemplates: () => apiClient.get('/notifications/templates'),
  createTemplate: (data) => apiClient.post('/notifications/templates', data),
  updateTemplate: (id, data) => apiClient.put(`/notifications/templates/${id}`, data),
  deleteTemplate: (id) => apiClient.delete(`/notifications/templates/${id}`),
  
  // SMS Credits
  getSmsCredits: () => apiClient.get('/notifications/credits'),
  
  // Statistics
  getNotificationStats: () => apiClient.get('/notifications/stats')
};