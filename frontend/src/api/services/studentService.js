import apiClient from '../client';

export const studentService = {
  createStudent: (data) => apiClient.post('/students', data),
  getStudents: (params) => apiClient.get('/students', { params }),
  getStudent: (id) => apiClient.get(`/students/${id}`),
  updateStudent: (id, data) => apiClient.put(`/students/${id}`, data),
  deleteStudent: (id) => apiClient.delete(`/students/${id}`),
  getStudentCount: () => apiClient.get('/students/count'), // Add this
  getStudentByPhone: (phone) => apiClient.get(`/students/by-phone/${phone}`),
  
  // Check if phone exists (returns { exists: boolean })
  checkPhone: (phone) => apiClient.get(`/students/check-phone/${phone}`),
  
  // Check if email exists (returns { exists: boolean })
  checkEmail: (email) => apiClient.get(`/students/check-email/${email}`),
};