import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  CreditCard, Search, Download, Calendar, User, 
  Phone, CheckCircle, XCircle, Clock, Printer,
  Smartphone, Landmark, Receipt, Filter, Plus, X,
  BookOpen
} from 'lucide-react';
import { paymentService } from '../../api/services/paymentService';
import { registrationService } from '../../api/services/registrationService';
import { studentService } from '../../api/services/studentService';
import { authService } from '../../api/services/authService';
import toast from 'react-hot-toast';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";

const Payments = () => {
  const [payments, setPayments] = useState([]);
  const [studentsWithDebt, setStudentsWithDebt] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('all');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    endDate: new Date()
  });
  
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentLocation, setPaymentLocation] = useState('office');
  const [momoPhone, setMomoPhone] = useState('');
  const [momoProvider, setMomoProvider] = useState('mtn');
  const [transactionId, setTransactionId] = useState('');
  const [confirmTransactionId, setConfirmTransactionId] = useState('');
  const [transactionIdError, setTransactionIdError] = useState('');
  const [processing, setProcessing] = useState(false);
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);
  const [paymentAllocation, setPaymentAllocation] = useState([]);
  
  const user = authService.getCurrentUser();

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (studentSearchTerm) {
      const filtered = studentsWithDebt.filter(s => 
        s.student_name.toLowerCase().includes(studentSearchTerm.toLowerCase()) ||
        s.student_id.toLowerCase().includes(studentSearchTerm.toLowerCase()) ||
        s.phone?.includes(studentSearchTerm)
      );
      setFilteredStudents(filtered);
    } else {
      setFilteredStudents(studentsWithDebt);
    }
  }, [studentSearchTerm, studentsWithDebt]);

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

  const fetchData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchPayments(),
        fetchStudentsWithOutstanding()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPayments = async () => {
    try {
      const response = await paymentService.getPayments({
        per_page: 100
      });
      
      // Get payments from response
      const paymentsData = response.data.payments || [];
      
      // Sort by date (newest first)
      const sortedPayments = [...paymentsData].sort((a, b) => {
        return new Date(b.payment_date) - new Date(a.payment_date);
      });
      
      setPayments(sortedPayments);
      console.log('Total payments:', paymentsData.length);
    } catch (error) {
      console.error('Error fetching payments:', error);
      toast.error('Failed to load payments');
    }
  };

  const fetchStudentsWithOutstanding = async () => {
    try {
      // First get all students
      const studentsRes = await studentService.getStudents({ per_page: 1000 });
      const allStudents = studentsRes.data.students || [];
      
      // Then get all registrations with outstanding balance
      const regResponse = await registrationService.getRegistrations({
        per_page: 1000
      });
      
      const allRegistrations = regResponse.data.registrations || [];
      
      // Filter registrations with outstanding balance > 0
      const registrationsWithDebt = allRegistrations.filter(
        reg => (parseFloat(reg.outstanding_balance || 0)) > 0.01
      );
      
      // Map registrations to students
      const studentsMap = new Map();
      
      registrationsWithDebt.forEach(reg => {
        if (!studentsMap.has(reg.student_id)) {
          const student = allStudents.find(s => s.id === reg.student_id);
          if (student) {
            studentsMap.set(reg.student_id, {
              id: student.id,
              student_id: student.student_id,
              student_name: `${student.first_name} ${student.last_name}`,
              phone: student.phone,
              email: student.email,
              outstanding_total: 0,
              registrations: []
            });
          }
        }
        
        if (studentsMap.has(reg.student_id)) {
          const studentData = studentsMap.get(reg.student_id);
          studentData.outstanding_total += parseFloat(reg.outstanding_balance || 0);
          studentData.registrations.push({
            id: reg.id,
            course_name: reg.course_name,
            outstanding_balance: parseFloat(reg.outstanding_balance || 0),
            total_fee: parseFloat(reg.total_fee || 0),
            registration_date: reg.registration_date
          });
        }
      });
      
      // Sort registrations by date (oldest first) for each student
      studentsMap.forEach(student => {
        student.registrations.sort((a, b) => 
          new Date(a.registration_date) - new Date(b.registration_date)
        );
      });
      
      const studentsArray = Array.from(studentsMap.values());
      setStudentsWithDebt(studentsArray);
      setFilteredStudents(studentsArray);
    } catch (error) {
      console.error('Error fetching students with debt:', error);
    }
  };

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
    setPaymentAmount('');
    setMomoPhone('');
    setMomoProvider('mtn');
    setTransactionId('');
    setConfirmTransactionId('');
    setTransactionIdError('');
    setPaymentMethod('cash');
    setPaymentLocation('office');
    setPaymentAllocation([]);
    setShowStudentDropdown(false);
    setStudentSearchTerm('');
    setShowPaymentModal(true);
  };

  const handleRecordPayment = async () => {
    if (!selectedStudent) return;
    
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (amount > selectedStudent.outstanding_total) {
      toast.error('Amount cannot exceed total outstanding balance');
      return;
    }

    if (paymentMethod === 'momo') {
      if (!momoPhone || momoPhone.length < 10) {
        toast.error('Please enter a valid phone number for MoMo payment');
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
          collected_by_staff_id: user?.id,
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
      resetPaymentForm();
      fetchData();
    } catch (error) {
      console.error('Payment error:', error);
      toast.error(error.response?.data?.error || 'Failed to record payment');
    } finally {
      setProcessing(false);
    }
  };

  const resetPaymentForm = () => {
    setSelectedStudent(null);
    setPaymentAmount('');
    setPaymentMethod('cash');
    setPaymentLocation('office');
    setMomoPhone('');
    setMomoProvider('mtn');
    setTransactionId('');
    setConfirmTransactionId('');
    setTransactionIdError('');
    setStudentSearchTerm('');
    setPaymentAllocation([]);
    setFilteredStudents(studentsWithDebt);
  };

  const getMethodBadge = (method) => {
    switch(method) {
      case 'momo':
        return { color: 'bg-blue-100 text-blue-700', icon: Smartphone, label: 'Mobile Money' };
      case 'cash':
        return { color: 'bg-green-100 text-green-700', icon: Landmark, label: 'Cash' };
      default:
        return { color: 'bg-gray-100 text-gray-700', icon: CreditCard, label: method };
    }
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'completed':
        return { color: 'bg-green-100 text-green-700', icon: CheckCircle, label: 'Completed' };
      case 'pending':
        return { color: 'bg-yellow-100 text-yellow-700', icon: Clock, label: 'Pending' };
      case 'failed':
        return { color: 'bg-red-100 text-red-700', icon: XCircle, label: 'Failed' };
      case 'refunded':
        return { color: 'bg-gray-100 text-gray-700', icon: Clock, label: 'Refunded' };
      default:
        return { color: 'bg-gray-100 text-gray-700', icon: Clock, label: status };
    }
  };

  const formatCurrency = (amount) => {
    return `₵${parseFloat(amount || 0).toFixed(2)}`;
  };

  // Filter payments
  const filteredPayments = payments.filter(p => {
    const matchesSearch = 
      p.student_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.payment_reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.registration_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.transaction_id?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesMethod = selectedMethod === 'all' || p.payment_method === selectedMethod;

    let matchesDate = true;
    if (dateRange.startDate && dateRange.endDate && p.payment_date) {
      const paymentDate = new Date(p.payment_date);
      matchesDate = paymentDate >= dateRange.startDate && paymentDate <= dateRange.endDate;
    }

    return matchesSearch && matchesMethod && matchesDate;
  });

  const totalAmount = filteredPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl border border-gray-200 p-6"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-primary-800">Payments</h1>
            <p className="text-primary-600 mt-2">
              Total: {filteredPayments.length} payments | {formatCurrency(totalAmount)}
            </p>
          </div>
          <button
            onClick={() => setShowPaymentModal(true)}
            className="px-4 py-2 bg-gradient-to-r from-secondary-500 to-secondary-600 text-white rounded-xl hover:shadow-lg transition-all flex items-center"
          >
            <Plus className="w-5 h-5 mr-2" />
            Record Payment
          </button>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-xl border border-gray-200 p-4"
      >
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search payments by student, reference, or transaction ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Calendar className="text-gray-400 w-5 h-5" />
            <DatePicker
              selected={dateRange.startDate}
              onChange={(date) => setDateRange({ ...dateRange, startDate: date })}
              className="px-3 py-2 border rounded-lg w-32 text-sm"
              placeholderText="Start"
            />
            <span>-</span>
            <DatePicker
              selected={dateRange.endDate}
              onChange={(date) => setDateRange({ ...dateRange, endDate: date })}
              className="px-3 py-2 border rounded-lg w-32 text-sm"
              placeholderText="End"
            />
          </div>

          <select
            value={selectedMethod}
            onChange={(e) => setSelectedMethod(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm"
          >
            <option value="all">All Methods</option>
            <option value="momo">Mobile Money</option>
            <option value="cash">Cash</option>
          </select>
        </div>
      </motion.div>

      {/* Payments Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-secondary-200 border-t-secondary-600 rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Reference</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Student</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Date</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Method</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Transaction Details</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Location</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Amount</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredPayments.length > 0 ? (
                    filteredPayments.map((payment) => {
                      const MethodBadge = getMethodBadge(payment.payment_method);
                      const StatusBadge = getStatusBadge(payment.status);
                      return (
                        <tr key={payment.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <span className="font-mono text-sm">{payment.payment_reference}</span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-medium">{payment.student_name}</div>
                            <div className="text-xs text-gray-500">{payment.registration_number}</div>
                          </td>
                          <td className="px-6 py-4 text-sm">
                            {new Date(payment.payment_date).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${MethodBadge.color} mb-1`}>
                                <MethodBadge.icon className="w-3 h-3 mr-1" />
                                {MethodBadge.label}
                              </span>
                              {payment.payment_method === 'momo' && payment.momo_provider && (
                                <span className="text-xs text-gray-500 mt-1">
                                  {payment.momo_provider === 'mtn' ? 'MTN' : 'Telecel Cash'}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {payment.transaction_id ? (
                              <div className="flex flex-col">
                                <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                                  ID: {payment.transaction_id}
                                </span>
                                {payment.momo_phone_number && (
                                  <span className="text-xs text-gray-500 mt-1">
                                    📱 {payment.momo_phone_number}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-400 text-xs">—</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm capitalize">{payment.payment_location}</td>
                          <td className="px-6 py-4 font-medium">{formatCurrency(payment.amount)}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${StatusBadge.color}`}>
                              <StatusBadge.icon className="w-3 h-3 mr-1" />
                              {StatusBadge.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="8" className="px-6 py-20 text-center text-gray-500">
                        <CreditCard className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                        <p>No payments found</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </motion.div>

      {/* Simplified Payment Modal - No course selection */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50" onClick={() => setShowPaymentModal(false)}></div>
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            >
              <div className="px-6 py-4 border-b sticky top-0 bg-white flex items-center justify-between">
                <h3 className="text-xl font-bold">Record Payment</h3>
                <button
                  onClick={() => {
                    setShowPaymentModal(false);
                    resetPaymentForm();
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {/* Student Search */}
                {!selectedStudent && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Search Student with Outstanding Balance</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        type="text"
                        value={studentSearchTerm}
                        onChange={(e) => setStudentSearchTerm(e.target.value)}
                        onFocus={() => setShowStudentDropdown(true)}
                        placeholder="Search by name, ID, or phone..."
                        className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-secondary-400"
                      />
                    </div>
                    
                    {showStudentDropdown && (
                      <div className="mt-2 border rounded-lg max-h-60 overflow-y-auto">
                        {filteredStudents.length > 0 ? (
                          filteredStudents.map(student => (
                            <div
                              key={student.id}
                              onClick={() => handleSelectStudent(student)}
                              className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                            >
                              <div className="font-medium">{student.student_name}</div>
                              <div className="flex justify-between text-sm text-gray-600">
                                <span>ID: {student.student_id}</span>
                                <span className="font-semibold text-red-600">{formatCurrency(student.outstanding_total)}</span>
                              </div>
                              {student.phone && (
                                <div className="text-xs text-gray-500 flex items-center mt-1">
                                  <Phone className="w-3 h-3 mr-1" />
                                  {student.phone}
                                </div>
                              )}
                              <div className="text-xs text-gray-400 mt-1">
                                {student.registrations.length} course(s) with outstanding balance
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="p-4 text-center text-gray-500">
                            No students with outstanding balance found
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Payment Form - Shown after student is selected */}
                {selectedStudent && (
                  <>
                    {/* Student Summary */}
                    <div className="bg-primary-50 p-4 rounded-lg">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">{selectedStudent.student_name}</p>
                          <p className="text-sm text-gray-600">ID: {selectedStudent.student_id}</p>
                          <p className="text-sm text-gray-600 mt-1">{selectedStudent.phone}</p>
                        </div>
                        <button
                          onClick={() => setSelectedStudent(null)}
                          className="text-sm text-secondary-600 hover:text-secondary-700"
                        >
                          Change
                        </button>
                      </div>
                      <div className="mt-3 pt-3 border-t border-primary-200">
                        <p className="text-sm font-semibold text-red-600">
                          Total Outstanding: {formatCurrency(selectedStudent.outstanding_total)}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {selectedStudent.registrations.length} course(s) with outstanding balance
                        </p>
                      </div>
                    </div>

                    {/* Amount - With scroll prevention */}
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Payment Amount (Max: {formatCurrency(selectedStudent.outstanding_total)})
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
                          onWheel={(e) => e.target.blur()}
                          max={selectedStudent.outstanding_total}
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
                              <span className="font-medium">MTN</span> MoMo
                            </button>
                            <button
                              type="button"
                              onClick={() => setMomoProvider('vodafone')}
                              className={`p-2 border rounded-lg ${
                                momoProvider === 'vodafone' ? 'bg-red-50 border-red-500' : 'border-gray-300'
                              }`}
                            >
                              <span className="font-medium">Telecel</span> Cash
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
                              transactionIdError ? 'border-red-500' : 'border-gray-300'
                            }`}
                            placeholder="Re-enter transaction ID to confirm"
                          />
                          {transactionIdError && (
                            <p className="text-xs text-red-600 mt-1">{transactionIdError}</p>
                          )}
                        </div>

                        {/* Transaction Summary */}
                        {transactionId && confirmTransactionId && !transactionIdError && (
                          <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                            <div className="flex items-center text-green-700 text-sm mb-1">
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Transaction verified
                            </div>
                            <div className="text-xs text-gray-600">
                              <span className="font-medium">Provider:</span> {momoProvider === 'mtn' ? 'MTN MoMo' : 'Telecel Cash'}<br/>
                              <span className="font-medium">Transaction ID:</span> {transactionId}<br/>
                              <span className="font-medium">Phone:</span> {momoPhone}
                            </div>
                          </div>
                        )}
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
                        onClick={() => setSelectedStudent(null)}
                        className="flex-1 py-2 border rounded-lg hover:bg-gray-50"
                      >
                        Back
                      </button>
                      <button
                        onClick={handleRecordPayment}
                        disabled={processing || !paymentAmount || parseFloat(paymentAmount) <= 0}
                        className="flex-1 py-2 bg-secondary-500 text-white rounded-lg hover:bg-secondary-600 disabled:opacity-50"
                      >
                        {processing ? 'Processing...' : 'Record Payment'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Payments;