import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  CreditCard, Search, Phone, User, ArrowLeft, 
  CheckCircle, XCircle, Smartphone, Landmark,
  DollarSign, Calendar, Filter, X
} from 'lucide-react';
import { paymentService } from '../../api/services/paymentService';
import { registrationService } from '../../api/services/registrationService';
import { studentService } from '../../api/services/studentService';
import { authService } from '../../api/services/authService';
import toast from 'react-hot-toast';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";

const StaffPayments = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentLocation, setPaymentLocation] = useState('office');
  const [momoPhone, setMomoPhone] = useState('');
  const [processing, setProcessing] = useState(false);
  const [selectedRegistration, setSelectedRegistration] = useState(null);
  
  const staff = authService.getCurrentUser();

  useEffect(() => {
    if (location.state?.selectedStudent) {
      handleSelectStudent(location.state.selectedStudent);
    }
    fetchStudentsWithOutstanding();
  }, [location.state]);

  const fetchStudentsWithOutstanding = async () => {
    try {
      setLoading(true);
      
      // Get all students
      const studentsRes = await studentService.getStudents({ per_page: 1000 });
      const allStudents = studentsRes.data.students || [];
      
      // Get all registrations with outstanding
      const regResponse = await registrationService.getRegistrations({ per_page: 1000 });
      const registrations = regResponse.data.registrations || [];
      
      // Group by student
      const studentMap = new Map();
      
      registrations.forEach(reg => {
        if ((reg.outstanding_balance || 0) > 0) {
          if (!studentMap.has(reg.student_id)) {
            const student = allStudents.find(s => s.id === reg.student_id);
            if (student) {
              studentMap.set(reg.student_id, {
                id: student.id,
                student_id: student.student_id,
                first_name: student.first_name,
                last_name: student.last_name,
                phone: student.phone,
                email: student.email,
                total_outstanding: 0,
                registrations: []
              });
            }
          }
          
          if (studentMap.has(reg.student_id)) {
            const studentData = studentMap.get(reg.student_id);
            studentData.total_outstanding += reg.outstanding_balance;
            studentData.registrations.push({
              id: reg.id,
              course_name: reg.course_name,
              outstanding_balance: reg.outstanding_balance,
              total_fee: reg.total_fee,
              registration_date: reg.registration_date
            });
          }
        }
      });
      
      setStudents(Array.from(studentMap.values()));
      setFilteredStudents(Array.from(studentMap.values()));
    } catch (error) {
      console.error('Error fetching students:', error);
      toast.error('Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (searchTerm) {
      const filtered = students.filter(s => 
        `${s.first_name} ${s.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.student_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.phone?.includes(searchTerm)
      );
      setFilteredStudents(filtered);
    } else {
      setFilteredStudents(students);
    }
  }, [searchTerm, students]);

  const handleSelectStudent = (student) => {
    setSelectedStudent(student);
    setSelectedRegistration(student.registrations[0]);
    setPaymentAmount(student.total_outstanding.toString());
    setShowPaymentModal(true);
  };

  const handleProcessPayment = async () => {
    if (!selectedStudent || !selectedRegistration) return;
    
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (amount > selectedStudent.total_outstanding) {
      toast.error('Amount cannot exceed outstanding balance');
      return;
    }

    if (paymentMethod === 'momo' && (!momoPhone || momoPhone.length < 10)) {
      toast.error('Please enter a valid phone number');
      return;
    }

    setProcessing(true);
    try {
      const paymentData = {
        registration_id: selectedRegistration.id,
        student_id: selectedStudent.id,
        amount: amount,
        payment_method: paymentMethod,
        payment_location: paymentLocation,
        collected_by_staff_id: staff?.id,
        momo_phone_number: momoPhone || null,
        momo_provider: paymentMethod === 'momo' ? 'mtn' : null
      };

      await paymentService.createPayment(paymentData);
      
      toast.success('Payment recorded successfully');
      setShowPaymentModal(false);
      fetchStudentsWithOutstanding();
      
    } catch (error) {
      console.error('Payment error:', error);
      toast.error(error.response?.data?.error || 'Failed to record payment');
    } finally {
      setProcessing(false);
    }
  };

  const formatCurrency = (amount) => {
    return `₵${parseFloat(amount || 0).toFixed(2)}`;
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
            <h1 className="text-2xl font-bold text-primary-800">Record Payment</h1>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search student by name, ID, or phone..."
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
          <div className="space-y-4">
            {filteredStudents.length > 0 ? (
              filteredStudents.map(student => (
                <motion.div
                  key={student.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center mr-3">
                          <User className="w-5 h-5 text-primary-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {student.first_name} {student.last_name}
                          </h3>
                          <p className="text-xs text-gray-500">{student.student_id}</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3">
                        <div className="flex items-center text-sm text-gray-600">
                          <Phone className="w-4 h-4 mr-2" />
                          {student.phone}
                        </div>
                        <div className="flex items-center text-sm font-semibold text-red-600">
                          <DollarSign className="w-4 h-4 mr-2" />
                          Outstanding: {formatCurrency(student.total_outstanding)}
                        </div>
                      </div>

                      <div className="mt-3 space-y-2">
                        {student.registrations.map((reg, idx) => (
                          <div key={idx} className="text-sm bg-gray-50 p-2 rounded-lg flex justify-between">
                            <span>{reg.course_name}</span>
                            <span className="text-red-600 font-medium">{formatCurrency(reg.outstanding_balance)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={() => handleSelectStudent(student)}
                      className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 whitespace-nowrap"
                    >
                      Record Payment
                    </button>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <DollarSign className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">No students with outstanding fees</p>
              </div>
            )}
          </div>
        )}

        {/* Payment Modal */}
        {showPaymentModal && selectedStudent && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center p-4">
              <div className="fixed inset-0 bg-black/50" onClick={() => setShowPaymentModal(false)}></div>
              
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg"
              >
                <div className="px-6 py-4 border-b flex items-center justify-between">
                  <h3 className="text-xl font-bold">Record Payment</h3>
                  <button
                    onClick={() => setShowPaymentModal(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-6 space-y-4">
                  {/* Student Summary */}
                  <div className="bg-primary-50 p-4 rounded-lg">
                    <p className="font-medium">{selectedStudent.first_name} {selectedStudent.last_name}</p>
                    <p className="text-sm text-gray-600">{selectedStudent.student_id}</p>
                    <p className="text-sm text-gray-600 mt-1">{selectedStudent.phone}</p>
                    <div className="mt-3 pt-3 border-t border-primary-200">
                      <p className="text-sm font-semibold text-red-600">
                        Total Outstanding: {formatCurrency(selectedStudent.total_outstanding)}
                      </p>
                    </div>
                  </div>

                  {/* Select Registration (if multiple) */}
                  {selectedStudent.registrations.length > 1 && (
                    <div>
                      <label className="block text-sm font-medium mb-2">Select Course</label>
                      <select
                        value={selectedRegistration?.id}
                        onChange={(e) => {
                          const reg = selectedStudent.registrations.find(r => r.id === parseInt(e.target.value));
                          setSelectedRegistration(reg);
                        }}
                        className="w-full px-4 py-2 border rounded-lg"
                      >
                        {selectedStudent.registrations.map(reg => (
                          <option key={reg.id} value={reg.id}>
                            {reg.course_name} - Due: {formatCurrency(reg.outstanding_balance)}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Amount */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Amount (Max: {formatCurrency(selectedRegistration?.outstanding_balance)})
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₵</span>
                      <input
                        type="number"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        max={selectedRegistration?.outstanding_balance}
                        step="0.01"
                        className="w-full pl-8 pr-4 py-2 border rounded-lg"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  {/* Payment Method */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Payment Method</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setPaymentMethod('cash')}
                        className={`p-3 border rounded-lg flex items-center justify-center space-x-2 ${
                          paymentMethod === 'cash' ? 'border-green-500 bg-green-50' : ''
                        }`}
                      >
                        <Landmark className="w-5 h-5" />
                        <span>Cash</span>
                      </button>
                      <button
                        onClick={() => setPaymentMethod('momo')}
                        className={`p-3 border rounded-lg flex items-center justify-center space-x-2 ${
                          paymentMethod === 'momo' ? 'border-blue-500 bg-blue-50' : ''
                        }`}
                      >
                        <Smartphone className="w-5 h-5" />
                        <span>Mobile Money</span>
                      </button>
                    </div>
                  </div>

                  {/* MoMo Phone */}
                  {paymentMethod === 'momo' && (
                    <div>
                      <label className="block text-sm font-medium mb-2">Phone Number</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                          type="tel"
                          value={momoPhone}
                          onChange={(e) => setMomoPhone(e.target.value.replace(/\D/g, ''))}
                          className="w-full pl-10 pr-4 py-2 border rounded-lg"
                          placeholder="024XXXXXXX"
                        />
                      </div>
                    </div>
                  )}

                  {/* Payment Location */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Payment Location</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setPaymentLocation('office')}
                        className={`p-3 border rounded-lg ${
                          paymentLocation === 'office' ? 'bg-purple-50 border-purple-500' : ''
                        }`}
                      >
                        Office
                      </button>
                      <button
                        onClick={() => setPaymentLocation('field')}
                        className={`p-3 border rounded-lg ${
                          paymentLocation === 'field' ? 'bg-orange-50 border-orange-500' : ''
                        }`}
                      >
                        Field
                      </button>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex space-x-3 pt-4">
                    <button
                      onClick={() => setShowPaymentModal(false)}
                      className="flex-1 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleProcessPayment}
                      disabled={processing}
                      className="flex-1 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
                    >
                      {processing ? 'Processing...' : 'Record Payment'}
                    </button>
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

export default StaffPayments;