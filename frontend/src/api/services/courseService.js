// frontend/src/api/services/courseService.js
import apiClient from '../client';

export const courseService = {
  // Create new course - matches your backend POST @bp.route('/', methods=['POST'])
  createCourse: (data) => apiClient.post('/courses/', data),
  
  // Get all courses - matches your backend GET @bp.route('/', methods=['GET'])
  getCourses: (params) => apiClient.get('/courses/', { params }),
  
  // Get single course - matches your backend GET @bp.route('/<int:course_id>', methods=['GET'])
  getCourse: (id) => apiClient.get(`/courses/${id}`),

  getCourseCount: () => apiClient.get('/courses/count'), // Add this
  
  // Update course - matches your backend PUT @bp.route('/<int:course_id>', methods=['PUT'])
  updateCourse: (id, data) => apiClient.put(`/courses/${id}`, data),
  
  // Delete course - matches your backend DELETE @bp.route('/<int:course_id>', methods=['DELETE'])
  deleteCourse: (id) => apiClient.delete(`/courses/${id}`),
  
  // Get course dropdown for forms (simplified)
  getCourseDropdown: async () => {
    try {
      const response = await apiClient.get('/courses/', { 
        params: { active_only: true, per_page: 100 } 
      });
      return response.data.courses.map(course => ({
        value: course.id,
        label: course.name,
        code: course.course_code,
        registration_fee: course.registration_fee,
        tuition_fee: course.tuition_fee,
        total_fee: course.total_fee,
        duration: course.duration
      }));
    } catch (error) {
      console.error('Error fetching courses:', error);
      return [];
    }
  }
};