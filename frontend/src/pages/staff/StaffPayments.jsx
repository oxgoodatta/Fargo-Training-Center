import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  CreditCard, Search, Phone, User, ArrowLeft, 
  CheckCircle, XCircle, Smartphone, Landmark,
  DollarSign, Calendar, Filter, X, BookOpen
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
  const [momoProvider, setMomoProvider] = useState('mtn');
  const [transactionId, setTransactionId] = useState('');
  const [confirmTransactionId, setConfirmTransactionId] = useState('');
  const [transactionIdError, setTransactionIdError] = useState('');
  const [processing, setProcessing] = useState(false);
  const [paymentAllocation, setPaymentAllocation] = useState([]);
  
  const staff = authService.getCurrentUser();

  useEffect(() => {
    if (location.state?.selectedStudent) {
      handleSelectStudent(location.state.selectedStudent);
    }
    fetchStudentsWithOutstanding();
  }, [location.state]);

  // Validate transaction IDs match
  useEffect(() => {
    if (paymentMethod === 'momo' && transactionId && confirmTransactionId) {
      if (transactionId !== confirmTransactionId) {
        setTransactionIdError('Transaction IDs do not match');
      } else {
        setTransactionIdError('');
      }
    } else {
      setTransactionIdError('');
    }
  }, [transactionId, confirmTransactionId, paymentMethod]);

  // Calculate payment allocation whenever amount or selected student changes
  useEffect(() => {
    if (selectedStudent && paymentAmount && parseFloat(paymentAmount) > 0) {
      calculateAllocation();
    } else {
      setPaymentAllocation([]);
    }
  }, [paymentAmount, selectedStudent]);

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
      
      // Sort registrations by date (oldest first) for each student
      studentMap.forEach(student => {
        student.registrations.sort((a, b) => 
          new Date(a.registration_date) - new Date(b.registration_date)
        );
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

  // Calculate how the payment will be allocated across multiple courses
  const calculateAllocation = () => {
    if (!selectedStudent) return;
    
    const amount = parseFloat(paymentAmount);
    let remainingAmount = amount;
    const allocation = [];
    
    // Sort registrations by date (oldest first) to pay oldest debts first
    const sortedRegs = [...selectedStudent.registrations].sort((a, b) => 
      new Date(a.registration_date) - new Date(b.registration_date)
    );
    
    for (const reg of sortedRegs) {
      if (remainingAmount <= 0) break;
      
      const amountToPay = Math.min(remainingAmount, reg.outstanding_balance);
      allocation.push({
        registration_id: reg.id,
        course_name: reg.course_name,
        outstanding: reg.outstanding_balance,
        amount_to_pay: amountToPay,
        remaining_after: reg.outstanding_balance - amountToPay
      });
      
      remainingAmount -= amountToPay;
    }
    
    setPaymentAllocation(allocation);
  };

  const handleSelectStudent = (student) => {
    setSelectedStudent(student);
    setPaymentAmount(''); // Empty by default - user must type amount
    setMomoPhone('');
    setMomoProvider('mtn');
    setTransactionId('');
    setConfirmTransactionId('');
    setTransactionIdError('');
    setPaymentMethod('cash');
    setPaymentLocation('office');
    setPaymentAllocation([]);
    setShowPaymentModal(true);
  };

  const handleProcessPayment = async () => {
    if (!selectedStudent) return;
    
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (amount > selectedStudent.total_outstanding) {
      toast.error('Amount cannot exceed total outstanding balance');
      return;
    }

    if (paymentMethod === 'momo') {
      if (!momoPhone || momoPhone.length < 10) {
        toast.error('Please enter a valid phone number');
        return;
      }
      if (!transactionId || !confirmTransactionId) {
        toast.error('Please enter both transaction ID and confirmation');
        return;
      }
      if (transactionId !== confirmTransactionId) {
        toast.error('Transaction IDs do not match');
        return;
      }
    }

    setProcessing(true);
    
    try {
      // Create payments for each registration based on allocation
      const paymentPromises = paymentAllocation.map(async (allocation) => {
        if (allocation.amount_to_pay <= 0) return null;
        
        const paymentData = {
          registration_id: allocation.registration_id,
          student_id: selectedStudent.id,
          amount: allocation.amount_to_pay,
          payment_method: paymentMethod,
          payment_location: paymentLocation,
          collected_by_staff_id: staff?.id,
          momo_phone_number: momoPhone || null,
          momo_provider: paymentMethod === 'momo' ? momoProvider : null,
          transaction_id: paymentMethod === 'momo' ? transactionId : null,
          confirm_transaction_id: paymentMethod === 'momo' ? confirmTransactionId : null,
          payment_type: 'tuition',
          status: 'completed'
        };
        
        return paymentService.createPayment(paymentData);
      }).filter(p => p !== null);
      
      await Promise.all(paymentPromises);
      
      toast.success(`Payment of ${formatCurrency(amount)} recorded successfully across ${paymentAllocation.length} course(s)`);
      setShowPaymentModal(false);
      fetchStudentsWithOutstanding();
      
      // Reset form
      setPaymentAmount('');
      setMomoPhone('');
      setMomoProvider('mtn');
      setTransactionId('');
      setConfirmTransactionId('');
      setPaymentMethod('cash');
      setPaymentLocation('office');
      setPaymentAllocation([]);
      
    } catch (error) {
      console.error('Payment error:', error);
      toast.error(error.response?.data?.error || 'Failed to record payment');
    } finally {
      setProcessing(false);
    }
  };

  // Helper function to round to 2 decimal places
  const roundToTwoDecimals = (value) => {
    return Math.round((value || 0) * 100) / 100;
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
                          Total Outstanding: {formatCurrency(student.total_outstanding)}
                        </div>
                      </div>

                      <div className="mt-3 space-y-2">
                        <p className="text-xs font-medium text-gray-500 flex items-center">
                          <BookOpen className="w-3 h-3 mr-1" />
                          Courses ({student.registrations.length}):
                        </p>
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
                      <p className="text-xs text-gray-500 mt-1">
                        {selectedStudent.registrations.length} course(s) with outstanding balance
                      </p>
                    </div>
                  </div>

                  {/* Amount - FIXED with scroll prevention and no auto-fill */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Payment Amount (Max: {formatCurrency(selectedStudent.total_outstanding)})
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₵</span>
                      <input
                        type="number"
                        value={paymentAmount}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === '' || !isNaN(parseFloat(value))) {
                            // Round to 2 decimal places when setting
                            if (value !== '') {
                              const rounded = Math.round(parseFloat(value) * 100) / 100;
                              setPaymentAmount(rounded.toString());
                            } else {
                              setPaymentAmount(value);
                            }
                          }
                        }}
                        onWheel={(e) => e.target.blur()} // Prevents scroll wheel from changing value
                        max={selectedStudent.total_outstanding}
                        step="0.01"
                        className="w-full pl-8 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-secondary-400"
                        placeholder="Enter amount"
                      />
                    </div>
                  </div>

                  {/* Payment Allocation Summary */}
                  {paymentAllocation.length > 0 && (
                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                      <p className="text-sm font-medium text-blue-800 mb-2 flex items-center">
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Payment Allocation
                      </p>
                      <div className="space-y-2 text-sm">
                        {paymentAllocation.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center text-xs">
                            <span className="text-blue-700">{item.course_name}</span>
                            <div className="text-right">
                              <span className="text-blue-600 font-medium">
                                {formatCurrency(item.amount_to_pay)}
                              </span>
                              {item.remaining_after > 0 ? (
                                <span className="text-gray-500 ml-2">
                                  (remains {formatCurrency(item.remaining_after)})
                                </span>
                              ) : (
                                <span className="text-green-600 ml-2">
                                  ✓ Paid in full
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                        <div className="border-t border-blue-200 pt-2 mt-1">
                          <div className="flex justify-between font-medium">
                            <span>Total Paid:</span>
                            <span className="text-green-600">{formatCurrency(parseFloat(paymentAmount) || 0)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Payment Method */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Payment Method</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => {
                          setPaymentMethod('cash');
                          setTransactionId('');
                          setConfirmTransactionId('');
                          setTransactionIdError('');
                        }}
                        className={`p-3 border rounded-lg flex items-center justify-center space-x-2 ${
                          paymentMethod === 'cash' ? 'border-green-500 bg-green-50' : 'border-gray-300'
                        }`}
                      >
                        <Landmark className="w-5 h-5" />
                        <span>Cash</span>
                      </button>
                      <button
                        onClick={() => {
                          setPaymentMethod('momo');
                        }}
                        className={`p-3 border rounded-lg flex items-center justify-center space-x-2 ${
                          paymentMethod === 'momo' ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                        }`}
                      >
                        <Smartphone className="w-5 h-5" />
                        <span>Mobile Money</span>
                      </button>
                    </div>
                  </div>

                  {/* MoMo Fields */}
                  {paymentMethod === 'momo' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium mb-2">MoMo Provider</label>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => setMomoProvider('mtn')}
                            className={`p-2 border rounded-lg ${
                              momoProvider === 'mtn' ? 'bg-yellow-50 border-yellow-500' : 'border-gray-300'
                            }`}
                          >
                            MTN MoMo
                          </button>
                          <button
                            type="button"
                            onClick={() => setMomoProvider('vodafone')}
                            className={`p-2 border rounded-lg ${
                              momoProvider === 'vodafone' ? 'bg-red-50 border-red-500' : 'border-gray-300'
                            }`}
                          >
                            Telecel Cash
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">Phone Number</label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                          <input
                            type="tel"
                            value={momoPhone}
                            onChange={(e) => setMomoPhone(e.target.value.replace(/\D/g, ''))}
                            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-secondary-400"
                            placeholder="024XXXXXXX"
                          />
                        </div>
                      </div>

                      {/* Transaction ID fields */}
                      <div>
                        <label className="block text-sm font-medium mb-2">Transaction ID *</label>
                        <input
                          type="text"
                          value={transactionId}
                          onChange={(e) => setTransactionId(e.target.value)}
                          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-secondary-400"
                          placeholder="Enter mobile money transaction ID"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">Confirm Transaction ID *</label>
                        <input
                          type="text"
                          value={confirmTransactionId}
                          onChange={(e) => setConfirmTransactionId(e.target.value)}
                          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-secondary-400 ${
                            transactionIdError ? 'border-red-500' : ''
                          }`}
                          placeholder="Re-enter transaction ID to confirm"
                        />
                        {transactionIdError && (
                          <p className="text-xs text-red-600 mt-1">{transactionIdError}</p>
                        )}
                      </div>
                    </>
                  )}

                  {/* Payment Location */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Payment Location</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setPaymentLocation('office')}
                        className={`p-3 border rounded-lg ${
                          paymentLocation === 'office' ? 'bg-purple-50 border-purple-500' : 'border-gray-300'
                        }`}
                      >
                        Office
                      </button>
                      <button
                        onClick={() => setPaymentLocation('field')}
                        className={`p-3 border rounded-lg ${
                          paymentLocation === 'field' ? 'bg-orange-50 border-orange-500' : 'border-gray-300'
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
                      disabled={processing || !paymentAmount || parseFloat(paymentAmount) <= 0}
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