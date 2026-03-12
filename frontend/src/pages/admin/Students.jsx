import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, Search, Trash2, Phone, Mail, X, User, 
  AlertCircle, CheckCircle, Loader, BookOpen, DollarSign,
  UserPlus
} from 'lucide-react';
import { studentService } from '../../api/services/studentService';
import { authService } from '../../api/services/authService';
import RegisterStudentModal from '../../components/admin/RegisterStudentModal'; // Import the modal
import toast from 'react-hot-toast';

const Students = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [expandedStudent, setExpandedStudent] = useState(null);
  
  const user = authService.getCurrentUser();

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const response = await studentService.getStudents({ 
        per_page: 100 
      });
      setStudents(response.data.students || []);
    } catch (error) {
      console.error('Error fetching students:', error);
      toast.error('Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (student) => {
    setSelectedStudent(student);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteStudent = async () => {
    if (!selectedStudent) return;
    
    setDeleting(true);
    try {
      await studentService.deleteStudent(selectedStudent.id);
      toast.success('Student deleted successfully');
      setIsDeleteModalOpen(false);
      setSelectedStudent(null);
      fetchStudents();
    } catch (error) {
      console.error('Error deleting student:', error);
      toast.error(error.response?.data?.error || 'Failed to delete student');
    } finally {
      setDeleting(false);
    }
  };

  const handleRegisterSuccess = () => {
    setIsRegisterModalOpen(false);
    fetchStudents(); // Refresh the list
  };

  const toggleExpand = (studentId) => {
    if (expandedStudent === studentId) {
      setExpandedStudent(null);
    } else {
      setExpandedStudent(studentId);
    }
  };

  const calculateOutstandingFees = (registrations) => {
    if (!registrations || registrations.length === 0) return 0;
    return registrations.reduce((sum, reg) => sum + (reg.outstanding_balance || 0), 0);
  };

  const formatCurrency = (amount) => {
    return `₵${parseFloat(amount || 0).toFixed(2)}`;
  };

  const filteredStudents = students.filter(student => {
    const matchesSearch = 
      student.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.student_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.phone?.includes(searchTerm) ||
      student.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  return (
    <div className="w-full">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl border border-gray-200 p-6"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-primary-800">Student Management</h1>
            <p className="text-primary-600 mt-2">
              Total Students: {students.length}
            </p>
          </div>
          <button
            onClick={() => setIsRegisterModalOpen(true)}
            className="px-4 py-2 bg-gradient-to-r from-secondary-500 to-secondary-600 text-white rounded-xl hover:shadow-lg transition-all flex items-center"
          >
            <UserPlus className="w-5 h-5 mr-2" />
            Register Student
          </button>
        </div>
      </motion.div>

      {/* Search */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-xl border border-gray-200 p-4 mt-6"
      >
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search by name, ID, phone or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary-400 focus:border-transparent"
          />
        </div>
      </motion.div>

      {/* Students Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-xl border border-gray-200 mt-6 overflow-hidden"
      >
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-10 h-10 border-4 border-secondary-200 border-t-secondary-600 rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Student ID</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Name</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Contact</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Gender</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Date of Birth</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Courses</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Outstanding Fees</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredStudents.length > 0 ? (
                  filteredStudents.map((student) => {
                    const outstandingFees = calculateOutstandingFees(student.registrations);
                    
                    return (
                      <React.Fragment key={student.id}>
                        <tr className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <span className="font-mono text-sm font-medium text-primary-600">
                              {student.student_id}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-medium text-gray-900">
                              {student.first_name} {student.last_name}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="space-y-1">
                              <div className="flex items-center text-sm text-gray-600">
                                <Phone className="w-4 h-4 mr-1" />
                                {student.phone}
                              </div>
                              {student.email && (
                                <div className="flex items-center text-sm text-gray-600">
                                  <Mail className="w-4 h-4 mr-1" />
                                  {student.email}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {student.gender}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {student.date_of_birth ? new Date(student.date_of_birth).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="px-6 py-4">
                            {student.registrations && student.registrations.length > 0 ? (
                              <button
                                onClick={() => toggleExpand(student.id)}
                                className="flex items-center text-sm text-secondary-600 hover:text-secondary-700"
                              >
                                <BookOpen className="w-4 h-4 mr-1" />
                                <span>{student.registrations.length} Course{student.registrations.length !== 1 ? 's' : ''}</span>
                              </button>
                            ) : (
                              <span className="text-sm text-gray-400">No courses</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`font-medium ${
                              outstandingFees > 0 ? 'text-red-600' : 'text-green-600'
                            }`}>
                              {formatCurrency(outstandingFees)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => handleDeleteClick(student)}
                              className="p-2 hover:bg-red-50 rounded-lg text-red-600 transition-colors"
                              title="Delete Student"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                        {expandedStudent === student.id && student.registrations && student.registrations.length > 0 && (
                          <tr className="bg-primary-50">
                            <td colSpan="8" className="px-6 py-4">
                              <div className="space-y-2">
                                <p className="text-sm font-medium text-primary-700 mb-2">Registered Courses:</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                  {student.registrations.map((reg, idx) => (
                                    <div key={idx} className="bg-white rounded-lg border border-primary-200 p-3">
                                      <p className="font-medium text-gray-900">{reg.course_name}</p>
                                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                                        <span>Reg Fee: {formatCurrency(reg.registration_fee)}</span>
                                        <span className="capitalize">Status: {reg.status}</span>
                                      </div>
                                      <div className="flex justify-between text-xs mt-1">
                                        <span className="text-gray-500">Paid: {formatCurrency((reg.registration_fee || 0) + (reg.tuition_fee_paid || 0))}</span>
                                        <span className={reg.outstanding_balance > 0 ? 'text-red-600 font-medium' : 'text-green-600'}>
                                          Due: {formatCurrency(reg.outstanding_balance || 0)}
                                        </span>
                                      </div>
                                      <p className="text-xs text-gray-400 mt-1">
                                        Registered: {new Date(reg.registration_date).toLocaleDateString()}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="8" className="px-6 py-20 text-center text-gray-500">
                      <Users className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                      <p className="font-medium">No students found</p>
                      <p className="text-sm mt-1">Get started by registering your first student</p>
                      <button
                        onClick={() => setIsRegisterModalOpen(true)}
                        className="mt-4 px-4 py-2 bg-secondary-500 text-white rounded-lg hover:bg-secondary-600 transition-colors"
                      >
                        Register Student
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && selectedStudent && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50" onClick={() => setIsDeleteModalOpen(false)}></div>
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative bg-white rounded-2xl shadow-xl w-full max-w-md"
            >
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-xl font-bold text-primary-800">Delete Student</h3>
              </div>

              <div className="p-6">
                <div className="flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mx-auto mb-4">
                  <Trash2 className="w-8 h-8 text-red-600" />
                </div>
                
                <p className="text-center text-gray-700 mb-2">
                  Are you sure you want to delete this student?
                </p>
                <p className="text-center font-semibold text-gray-900 mb-6">
                  {selectedStudent.first_name} {selectedStudent.last_name} ({selectedStudent.student_id})
                </p>

                <div className="flex space-x-3">
                  <button
                    onClick={() => setIsDeleteModalOpen(false)}
                    className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteStudent}
                    disabled={deleting}
                    className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                  >
                    {deleting ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      )}

      {/* Register Student Modal */}
      <RegisterStudentModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        onSuccess={handleRegisterSuccess}
        user={user}
      />
    </div>
  );
};

export default Students;