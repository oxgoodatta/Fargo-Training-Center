import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Search, User, Phone, Mail, BookOpen, 
  DollarSign, ArrowLeft, CreditCard, Calendar,
  MapPin, IdCard, ChevronRight, Eye
} from 'lucide-react';
import { studentService } from '../../api/services/studentService';
import { registrationService } from '../../api/services/registrationService';
import toast from 'react-hot-toast';

const StaffStudents = () => {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    fetchStudents();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = students.filter(s => 
        `${s.first_name} ${s.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.student_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.phone?.includes(searchTerm) ||
        s.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredStudents(filtered);
    } else {
      setFilteredStudents(students);
    }
  }, [searchTerm, students]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const response = await studentService.getStudents({ per_page: 1000 });
      const studentsList = response.data.students || [];
      
      // Fetch registrations for each student
      const studentsWithRegs = await Promise.all(
        studentsList.map(async (student) => {
          try {
            const regResponse = await registrationService.getRegistrations({
              student_id: student.id
            });
            return {
              ...student,
              registrations: regResponse.data.registrations || []
            };
          } catch (error) {
            return {
              ...student,
              registrations: []
            };
          }
        })
      );
      
      setStudents(studentsWithRegs);
      setFilteredStudents(studentsWithRegs);
    } catch (error) {
      console.error('Error fetching students:', error);
      toast.error('Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  const calculateTotalOutstanding = (registrations) => {
    return registrations.reduce((sum, reg) => sum + (reg.outstanding_balance || 0), 0);
  };

  const formatCurrency = (amount) => {
    return `₵${parseFloat(amount || 0).toFixed(2)}`;
  };

  // Fixed handleMakePayment function
  const handleMakePayment = (student) => {
    // Find the registration with outstanding balance
    const registrationWithOutstanding = student.registrations?.find(reg => 
      (reg.outstanding_balance || 0) > 0
    );

    if (registrationWithOutstanding) {
      // Navigate to payment page with registration data
      navigate('/staff/payments', { 
        state: { 
          selectedRegistration: registrationWithOutstanding,
          student: student,
          from: 'students' 
        } 
      });
    } else {
      // If no specific registration found but student has outstanding total
      const totalOutstanding = calculateTotalOutstanding(student.registrations);
      if (totalOutstanding > 0 && student.registrations?.length > 0) {
        // Use the first registration (most recent) as fallback
        const mostRecentReg = [...student.registrations].sort(
          (a, b) => new Date(b.registration_date) - new Date(a.registration_date)
        )[0];
        
        navigate('/staff/payments', { 
          state: { 
            selectedRegistration: mostRecentReg,
            student: student,
            from: 'students' 
          } 
        });
      } else {
        toast.error('No outstanding balance found for this student');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center">
            <button
              onClick={() => navigate('/staff/dashboard')}
              className="p-2 hover:bg-gray-200 rounded-lg mr-4"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-bold text-primary-800">Students</h1>
          </div>
          <button
            onClick={() => navigate('/staff/register')}
            className="px-4 py-2 bg-secondary-500 text-white rounded-lg hover:bg-secondary-600"
          >
            + Register New
          </button>
        </div>

        {/* Search */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by name, ID, phone, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary-400"
            />
          </div>
        </div>

        {/* Students List */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-secondary-200 border-t-secondary-600 rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* Table Header */}
            <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-500 uppercase tracking-wider">
              <div className="col-span-3">Student</div>
              <div className="col-span-2">Contact</div>
              <div className="col-span-2">ID & Details</div>
              <div className="col-span-2">Courses</div>
              <div className="col-span-2">Outstanding</div>
              <div className="col-span-1">Actions</div>
            </div>

            {/* Student Rows */}
            <div className="divide-y divide-gray-200">
              {filteredStudents.map((student, index) => {
                const outstanding = calculateTotalOutstanding(student.registrations);
                const hasOutstanding = outstanding > 0;
                
                return (
                  <motion.div
                    key={student.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-4 md:p-0 hover:bg-gray-50 transition-colors"
                  >
                    {/* Mobile View */}
                    <div className="md:hidden space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                            <User className="w-5 h-5 text-primary-600" />
                          </div>
                          <div className="ml-3">
                            <h3 className="font-medium text-gray-900">
                              {student.first_name} {student.last_name}
                            </h3>
                            <p className="text-xs text-gray-500">{student.student_id}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedStudent(student);
                            setShowDetails(true);
                          }}
                          className="p-2 text-secondary-600 hover:bg-secondary-50 rounded-lg"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-xs text-gray-500">Phone</p>
                          <p className="font-medium">{student.phone}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Courses</p>
                          <p className="font-medium">{student.registrations?.length || 0}</p>
                        </div>
                      </div>
                      
                      {hasOutstanding && (
                        <div className="flex items-center justify-between bg-yellow-50 p-2 rounded-lg">
                          <span className="text-sm text-yellow-700">Outstanding Balance</span>
                          <span className="font-bold text-yellow-700">{formatCurrency(outstanding)}</span>
                        </div>
                      )}
                      
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            setSelectedStudent(student);
                            setShowDetails(true);
                          }}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
                        >
                          View Details
                        </button>
                        {hasOutstanding && (
                          <button
                            onClick={() => handleMakePayment(student)}
                            className="flex-1 px-3 py-2 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600 flex items-center justify-center"
                          >
                            <CreditCard className="w-4 h-4 mr-1" />
                            Pay
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Desktop View */}
                    <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-4 items-center">
                      {/* Student Name & Avatar */}
                      <div className="col-span-3 flex items-center">
                        <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center mr-3">
                          <User className="w-4 h-4 text-primary-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {student.first_name} {student.last_name}
                          </p>
                        </div>
                      </div>

                      {/* Contact Info */}
                      <div className="col-span-2">
                        <div className="flex items-center text-sm">
                          <Phone className="w-3 h-3 text-gray-400 mr-1" />
                          <span>{student.phone}</span>
                        </div>
                        {student.email && (
                          <div className="flex items-center text-sm text-gray-600 mt-1">
                            <Mail className="w-3 h-3 text-gray-400 mr-1" />
                            <span className="truncate">{student.email}</span>
                          </div>
                        )}
                      </div>

                      {/* ID & Details */}
                      <div className="col-span-2">
                        <p className="text-sm font-mono text-gray-600">{student.student_id}</p>
                        <div className="flex items-center text-xs text-gray-500 mt-1">
                          <Calendar className="w-3 h-3 mr-1" />
                          {new Date(student.date_of_birth).toLocaleDateString()}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{student.gender}</p>
                      </div>

                      {/* Courses Count */}
                      <div className="col-span-2">
                        <div className="flex items-center">
                          <BookOpen className="w-4 h-4 text-gray-400 mr-2" />
                          <span className="font-medium">{student.registrations?.length || 0}</span>
                          <span className="text-gray-500 ml-1">courses</span>
                        </div>
                      </div>

                      {/* Outstanding Balance */}
                      <div className="col-span-2">
                        {hasOutstanding ? (
                          <div>
                            <span className="font-semibold text-red-600">{formatCurrency(outstanding)}</span>
                            <span className="ml-2 text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full">
                              Due
                            </span>
                          </div>
                        ) : (
                          <span className="text-green-600 font-medium">No outstanding</span>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="col-span-1 flex items-center justify-end space-x-1">
                        <button
                          onClick={() => {
                            setSelectedStudent(student);
                            setShowDetails(true);
                          }}
                          className="p-2 text-secondary-600 hover:bg-secondary-50 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        {hasOutstanding && (
                          <button
                            onClick={() => handleMakePayment(student)}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Make Payment"
                          >
                            <CreditCard className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Empty State */}
            {filteredStudents.length === 0 && (
              <div className="text-center py-12">
                <User className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No students found</p>
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="mt-2 text-secondary-600 hover:text-secondary-700"
                  >
                    Clear search
                  </button>
                )}
              </div>
            )}

            {/* Results Count */}
            {filteredStudents.length > 0 && (
              <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 text-sm text-gray-500">
                Showing {filteredStudents.length} of {students.length} students
              </div>
            )}
          </div>
        )}

        {/* Student Details Modal */}
        {showDetails && selectedStudent && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center p-4">
              <div className="fixed inset-0 bg-black/50" onClick={() => setShowDetails(false)}></div>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
              >
                <div className="px-6 py-4 border-b sticky top-0 bg-white flex justify-between items-center">
                  <h2 className="text-xl font-bold">Student Details</h2>
                  <button
                    onClick={() => setShowDetails(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    ✕
                  </button>
                </div>

                <div className="p-6 space-y-6">
                  {/* Basic Info */}
                  <div className="bg-primary-50 p-4 rounded-lg">
                    <h3 className="font-semibold mb-3">Personal Information</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-500">Name</p>
                        <p className="font-medium">{selectedStudent.first_name} {selectedStudent.last_name}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Student ID</p>
                        <p className="font-medium">{selectedStudent.student_id}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Phone</p>
                        <p className="font-medium">{selectedStudent.phone}</p>
                      </div>
                      {selectedStudent.email && (
                        <div>
                          <p className="text-xs text-gray-500">Email</p>
                          <p className="font-medium">{selectedStudent.email}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-xs text-gray-500">Gender</p>
                        <p className="font-medium">{selectedStudent.gender}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Date of Birth</p>
                        <p className="font-medium">
                          {new Date(selectedStudent.date_of_birth).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Registrations */}
                  <div>
                    <h3 className="font-semibold mb-3">Course Registrations</h3>
                    {selectedStudent.registrations?.length > 0 ? (
                      <div className="space-y-3">
                        {selectedStudent.registrations.map((reg, idx) => {
                          const outstanding = reg.outstanding_balance || 0;
                          return (
                            <div key={idx} className="border border-gray-200 rounded-lg p-4">
                              <div className="flex justify-between items-start mb-2">
                                <h4 className="font-medium">{reg.course_name}</h4>
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                  reg.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                                }`}>
                                  {reg.status}
                                </span>
                              </div>
                              <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                  <p className="text-gray-500">Reg Date</p>
                                  <p>{new Date(reg.registration_date).toLocaleDateString()}</p>
                                </div>
                                <div>
                                  <p className="text-gray-500">Branch</p>
                                  <p>{reg.branch}</p>
                                </div>
                                <div>
                                  <p className="text-gray-500">Total Fee</p>
                                  <p>{formatCurrency(reg.total_fee)}</p>
                                </div>
                                <div>
                                  <p className="text-gray-500">Paid</p>
                                  <p className="text-green-600">{formatCurrency((reg.registration_fee || 0) + (reg.tuition_fee_paid || 0))}</p>
                                </div>
                                <div>
                                  <p className="text-gray-500">Outstanding</p>
                                  <p className="text-red-600">{formatCurrency(outstanding)}</p>
                                </div>
                                <div>
                                  <p className="text-gray-500">Location</p>
                                  <p className="capitalize">{reg.payment_location}</p>
                                </div>
                              </div>
                              
                              {/* Quick Payment Button for this registration */}
                              {outstanding > 0 && (
                                <div className="mt-3 flex justify-end">
                                  <button
                                    onClick={() => {
                                      setShowDetails(false);
                                      navigate('/staff/payments', { 
                                        state: { 
                                          selectedRegistration: reg,
                                          student: selectedStudent,
                                          from: 'students' 
                                        } 
                                      });
                                    }}
                                    className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600 flex items-center"
                                  >
                                    <CreditCard className="w-4 h-4 mr-2" />
                                    Pay for this course
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-4">No course registrations found</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex space-x-3 pt-4">
                    <button
                      onClick={() => setShowDetails(false)}
                      className="flex-1 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Close
                    </button>
                    {calculateTotalOutstanding(selectedStudent.registrations) > 0 && (
                      <button
                        onClick={() => {
                          setShowDetails(false);
                          handleMakePayment(selectedStudent);
                        }}
                        className="flex-1 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center justify-center"
                      >
                        <CreditCard className="w-4 h-4 mr-2" />
                        Make Payment
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StaffStudents;