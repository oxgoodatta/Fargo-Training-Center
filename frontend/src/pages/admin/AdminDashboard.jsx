import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, BookOpen, UserPlus } from 'lucide-react';
import { authService } from '../../api/services/authService';
import { studentService } from '../../api/services/studentService';
import { courseService } from '../../api/services/courseService';
import AddStaffModal from '../../components/admin/AddStaffModal';
import AddCourseModal from '../../components/admin/AddCourseModal';

const AdminDashboard = () => {
  const user = authService.getCurrentUser();
  const [isAddStaffModalOpen, setIsAddStaffModalOpen] = useState(false);
  const [isAddCourseModalOpen, setIsAddCourseModalOpen] = useState(false);
  const [totalStudents, setTotalStudents] = useState(0);
  const [totalCourses, setTotalCourses] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      
      // Get total students count using the new count endpoint
      const studentsRes = await studentService.getStudentCount();
      console.log('Students count response:', studentsRes.data);
      setTotalStudents(studentsRes.data.count || 0);
      
      // Get total courses count using the new count endpoint
      const coursesRes = await courseService.getCourseCount();
      console.log('Courses count response:', coursesRes.data);
      setTotalCourses(coursesRes.data.count || 0);
      
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCourseAdded = () => {
    // Refresh courses count after adding a new course
    loadStats();
  };

  const handleStaffAdded = () => {
    // Staff count not needed for now
    console.log('Staff added');
  };

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl border border-gray-200 p-6"
      >
        <h1 className="text-2xl font-bold text-primary-800">
          Welcome, {user?.first_name}! 👑
        </h1>
        <p className="text-primary-600 mt-2">
          Super Admin Dashboard
        </p>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Total Students Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Students</p>
              {loading ? (
                <div className="h-8 w-16 bg-gray-200 rounded animate-pulse mt-2"></div>
              ) : (
                <p className="text-2xl font-bold mt-2">{totalStudents}</p>
              )}
            </div>
            <div className="bg-blue-500 p-3 rounded-lg">
              <Users className="w-6 h-6 text-white" />
            </div>
          </div>
        </motion.div>

        {/* Total Courses Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Courses</p>
              {loading ? (
                <div className="h-8 w-16 bg-gray-200 rounded animate-pulse mt-2"></div>
              ) : (
                <p className="text-2xl font-bold mt-2">{totalCourses}</p>
              )}
            </div>
            <div className="bg-green-500 p-3 rounded-lg">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white rounded-2xl border border-gray-200 p-6"
      >
        <h2 className="text-lg font-semibold text-primary-800 mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Add Course Card */}
          <button
            onClick={() => setIsAddCourseModalOpen(true)}
            className="p-4 text-left rounded-xl border border-gray-200 hover:border-secondary-300 hover:shadow-md transition-all"
          >
            <div className="w-10 h-10 bg-secondary-500 rounded-lg flex items-center justify-center mb-3">
              <span className="text-white font-bold">+</span>
            </div>
            <p className="font-medium text-gray-900">Add New Course</p>
            <p className="text-sm text-gray-500 mt-1">Create course with fees</p>
          </button>
          
          {/* Add Staff Card */}
          <button
            onClick={() => setIsAddStaffModalOpen(true)}
            className="p-4 text-left rounded-xl border border-gray-200 hover:border-primary-300 hover:shadow-md transition-all"
          >
            <div className="w-10 h-10 bg-primary-500 rounded-lg flex items-center justify-center mb-3">
              <span className="text-white font-bold">+</span>
            </div>
            <p className="font-medium text-gray-900">Add Staff Member</p>
            <p className="text-sm text-gray-500 mt-1">Create staff account</p>
          </button>
        </div>
      </motion.div>

      {/* Modals */}
      <AddStaffModal
        isOpen={isAddStaffModalOpen}
        onClose={() => setIsAddStaffModalOpen(false)}
        onSuccess={handleStaffAdded}
      />

      <AddCourseModal
        isOpen={isAddCourseModalOpen}
        onClose={() => setIsAddCourseModalOpen(false)}
        onSuccess={handleCourseAdded}
      />
    </div>
  );
};

export default AdminDashboard;