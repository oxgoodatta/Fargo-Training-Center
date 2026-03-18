import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, BookOpen, DollarSign, Clock, FileText, Hash } from 'lucide-react';
import toast from 'react-hot-toast';
import { courseService } from '../../api/services/courseService';

const AddCourseModal = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    duration: '',
    registration_fee: '',
    tuition_fee: ''
  });
  
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Helper function to round to 2 decimal places
  const roundToTwoDecimals = (value) => {
    return Math.round((parseFloat(value) || 0) * 100) / 100;
  };

  const handleFeeChange = (e) => {
    const { name, value } = e.target;
    // Allow empty string or valid number
    if (value === '' || !isNaN(parseFloat(value))) {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.name.trim()) {
      toast.error('Course name is required');
      return;
    }

    if (!formData.registration_fee || parseFloat(formData.registration_fee) < 0) {
      toast.error('Valid registration fee is required');
      return;
    }

    if (!formData.tuition_fee || parseFloat(formData.tuition_fee) < 0) {
      toast.error('Valid tuition fee is required');
      return;
    }

    setIsLoading(true);
    
    try {
      const courseData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        duration: formData.duration.trim(),
        registration_fee: roundToTwoDecimals(formData.registration_fee),
        tuition_fee: roundToTwoDecimals(formData.tuition_fee)
      };
      
      // POST to /api/courses/ (matches your backend)
      const response = await courseService.createCourse(courseData);
      
      toast.success(`✅ Course created: ${response.data.course.name} (${response.data.course.course_code})`);
      
      onSuccess?.(response.data.course);
      onClose();
      
      // Reset form
      setFormData({
        name: '',
        description: '',
        duration: '',
        registration_fee: '',
        tuition_fee: ''
      });
      
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to create course';
      toast.error(errorMessage);
      console.error('Course creation error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  // Calculate total fee for display
  const totalFee = (parseFloat(formData.registration_fee) || 0) + (parseFloat(formData.tuition_fee) || 0);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-screen items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-primary-800">Add New Course</h2>
                <p className="text-sm text-primary-500 mt-1">
                  Create a training course with registration and tuition fees
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Course Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Course Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <BookOpen className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary-400 focus:border-transparent"
                    placeholder="e.g., Forklift Operation, Truck Driving, CCTV Installation"
                    required
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Course code will be auto-generated (e.g., FORK-001, TRUCK-001)
                </p>
              </div>

              {/* Duration */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Course Duration
                </label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    name="duration"
                    value={formData.duration}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary-400 focus:border-transparent"
                    placeholder="e.g., 3 months, 6 weeks, 1 year"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <div className="relative">
                  <FileText className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows="3"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary-400 focus:border-transparent"
                    placeholder="Brief description of the course content and requirements"
                  />
                </div>
              </div>

              {/* Fees - FIXED SCROLL ISSUE */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Registration Fee (₵) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="number"
                      name="registration_fee"
                      value={formData.registration_fee}
                      onChange={handleFeeChange}
                      onWheel={(e) => e.target.blur()} // Prevents scroll wheel from changing value
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary-400 focus:border-transparent"
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tuition Fee (₵) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="number"
                      name="tuition_fee"
                      value={formData.tuition_fee}
                      onChange={handleFeeChange}
                      onWheel={(e) => e.target.blur()} // Prevents scroll wheel from changing value
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary-400 focus:border-transparent"
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Total Fee Preview */}
              {totalFee > 0 && (
                <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-primary-700">Total Course Fee:</span>
                    <span className="text-lg font-bold text-primary-800">₵{totalFee.toFixed(2)}</span>
                  </div>
                  <p className="text-xs text-primary-600 mt-1">
                    Student will pay registration fee + tuition fee
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="sticky bottom-0 bg-white border-t border-gray-200 pt-4 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-6 py-2 bg-gradient-to-r from-secondary-500 to-secondary-600 text-white font-medium rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Creating...
                    </>
                  ) : (
                    'Create Course'
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
};

export default AddCourseModal;