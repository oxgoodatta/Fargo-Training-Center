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
  const [selectedRegistrations, setSelectedRegistrations] = useState([]);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentLocation, setPaymentLocation] = useState('office');
  const [momoPhone, setMomoPhone] = useState('');
  const [processing, setProcessing] = useState(false);
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);
  const [paymentStep, setPaymentStep] = useState('select'); // 'select', 'allocate'
  const [allocationMode, setAllocationMode] = useState('single'); // 'single' or 'split'
  
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
    
    // Reverse the array to show newest last (which becomes first when displayed)
    // Since the table shows from top to bottom, reversing will put newest at top
    const reversedPayments = [...paymentsData].reverse();
    
    setPayments(reversedPayments);
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
            total_fee: parseFloat(reg.total_fee || 0)
          });
        }
      });
      
      const studentsArray = Array.from(studentsMap.values());
      setStudentsWithDebt(studentsArray);
      setFilteredStudents(studentsArray);
    } catch (error) {
      console.error('Error fetching students with debt:', error);
    }
  };

  const handleSelectStudent = (student) => {
    setSelectedStudent(student);
    setSelectedRegistrations([]);
    setPaymentStep('select');
    setAllocationMode('single');
    setShowStudentDropdown(false);
    setStudentSearchTerm('');
  };

  const handleContinueToPayment = () => {
    if (selectedRegistrations.length === 0) {
      toast.error('Please select at least one course to pay for');
      return;
    }
    
    // Calculate total selected amount
    const totalSelected = selectedRegistrations.reduce((sum, reg) => sum + reg.amount, 0);
    setPaymentAmount(totalSelected.toString());
    setPaymentStep('payment');
  };

  const handleToggleRegistration = (registration, amount) => {
    const exists = selectedRegistrations.find(r => r.id === registration.id);
    
    if (exists) {
      // Remove
      setSelectedRegistrations(selectedRegistrations.filter(r => r.id !== registration.id));
    } else {
      // Add
      setSelectedRegistrations([...selectedRegistrations, {
        id: registration.id,
        course_name: registration.course_name,
        outstanding_balance: registration.outstanding_balance,
        amount: amount || registration.outstanding_balance
      }]);
    }
  };

  const handleUpdateRegistrationAmount = (registrationId, newAmount) => {
    setSelectedRegistrations(selectedRegistrations.map(reg => 
      reg.id === registrationId 
        ? { ...reg, amount: parseFloat(newAmount) || 0 }
        : reg
    ));
  };

  const handleRecordPayment = async () => {
    if (!selectedStudent || selectedRegistrations.length === 0) {
      toast.error('Please select at least one course');
      return;
    }
    
    const totalAmount = selectedRegistrations.reduce((sum, reg) => sum + reg.amount, 0);
    
    if (totalAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (paymentMethod === 'momo' && (!momoPhone || momoPhone.length < 10)) {
      toast.error('Please enter a valid phone number for MoMo payment');
      return;
    }

    setProcessing(true);
    
    try {
      // Process payments for each selected registration
      for (const reg of selectedRegistrations) {
        if (reg.amount <= 0) continue;
        
        const paymentData = {
          registration_id: reg.id,
          student_id: selectedStudent.id,
          amount: reg.amount,
          payment_method: paymentMethod,
          payment_location: paymentLocation,
          collected_by_staff_id: user?.id,
          momo_phone_number: momoPhone || null
        };

        await paymentService.createPayment(paymentData);
      }
      
      toast.success(`Payment of ${formatCurrency(totalAmount)} recorded successfully`);
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
    setSelectedRegistrations([]);
    setPaymentAmount('');
    setPaymentMethod('cash');
    setPaymentLocation('office');
    setMomoPhone('');
    setStudentSearchTerm('');
    setPaymentStep('select');
    setAllocationMode('single');
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
      p.registration_number?.toLowerCase().includes(searchTerm.toLowerCase());

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
              placeholder="Search payments by student or reference..."
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
                    <th className="px-6 py-4 text-left text-sm font-semibold">Location</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Amount</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Status</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold">Actions</th>
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
                            <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${MethodBadge.color}`}>
                              <MethodBadge.icon className="w-3 h-3 mr-1" />
                              {MethodBadge.label}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm capitalize">{payment.payment_location}</td>
                          <td className="px-6 py-4 font-medium">{formatCurrency(payment.amount)}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${StatusBadge.color}`}>
                              <StatusBadge.icon className="w-3 h-3 mr-1" />
                              {StatusBadge.label}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button className="p-2 hover:bg-gray-100 rounded-lg">
                              <Receipt className="w-4 h-4 text-gray-600" />
                            </button>
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

      {/* Payment Modal */}
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
                        className="w-full pl-10 pr-4 py-2 border rounded-lg"
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

                {/* Student Selected - Show Courses */}
                {selectedStudent && paymentStep === 'select' && (
                  <>
                    <div className="bg-primary-50 p-4 rounded-lg">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">{selectedStudent.student_name}</p>
                          <p className="text-sm text-gray-600">ID: {selectedStudent.student_id}</p>
                        </div>
                        <button
                          onClick={() => setSelectedStudent(null)}
                          className="text-sm text-secondary-600 hover:text-secondary-700"
                        >
                          Change
                        </button>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-3">Select Courses to Pay For:</h4>
                      <div className="space-y-3 max-h-60 overflow-y-auto">
                        {selectedStudent.registrations.map((reg, idx) => (
                          <div key={idx} className="border border-gray-200 rounded-lg p-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center">
                                  <input
                                    type="checkbox"
                                    id={`reg-${reg.id}`}
                                    checked={selectedRegistrations.some(r => r.id === reg.id)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        handleToggleRegistration(reg, reg.outstanding_balance);
                                      } else {
                                        handleToggleRegistration(reg, 0);
                                      }
                                    }}
                                    className="mr-3 mt-1"
                                  />
                                  <div>
                                    <label htmlFor={`reg-${reg.id}`} className="font-medium cursor-pointer">
                                      {reg.course_name}
                                    </label>
                                    <p className="text-sm text-gray-600">
                                      Outstanding: {formatCurrency(reg.outstanding_balance)}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            {selectedRegistrations.some(r => r.id === reg.id) && (
                              <div className="mt-2 pl-7">
                                <label className="block text-xs text-gray-500 mb-1">Amount to pay:</label>
                                <div className="relative w-40">
                                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">₵</span>
                                  <input
                                    type="number"
                                    value={selectedRegistrations.find(r => r.id === reg.id)?.amount || reg.outstanding_balance}
                                    onChange={(e) => handleUpdateRegistrationAmount(reg.id, e.target.value)}
                                    max={reg.outstanding_balance}
                                    step="0.01"
                                    className="w-full pl-8 pr-3 py-1 text-sm border rounded-lg"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="flex justify-between font-medium">
                        <span>Total Selected:</span>
                        <span className="text-secondary-600">
                          {formatCurrency(selectedRegistrations.reduce((sum, r) => sum + r.amount, 0))}
                        </span>
                      </div>
                    </div>

                    <div className="flex space-x-3 pt-4">
                      <button
                        onClick={() => setSelectedStudent(null)}
                        className="flex-1 py-2 border rounded-lg hover:bg-gray-50"
                      >
                        Back
                      </button>
                      <button
                        onClick={handleContinueToPayment}
                        disabled={selectedRegistrations.length === 0}
                        className="flex-1 py-2 bg-secondary-500 text-white rounded-lg hover:bg-secondary-600 disabled:opacity-50"
                      >
                        Continue to Payment
                      </button>
                    </div>
                  </>
                )}

                {/* Payment Details */}
                {selectedStudent && paymentStep === 'payment' && (
                  <>
                    <div className="bg-primary-50 p-4 rounded-lg">
                      <p className="font-medium">{selectedStudent.student_name}</p>
                      <div className="mt-2 space-y-1">
                        {selectedRegistrations.map((reg, idx) => (
                          <div key={idx} className="flex justify-between text-sm">
                            <span>{reg.course_name}</span>
                            <span className="font-medium">{formatCurrency(reg.amount)}</span>
                          </div>
                        ))}
                        <div className="border-t border-primary-200 mt-2 pt-2 flex justify-between font-bold">
                          <span>Total</span>
                          <span className="text-secondary-600">
                            {formatCurrency(selectedRegistrations.reduce((sum, r) => sum + r.amount, 0))}
                          </span>
                        </div>
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

                    {/* Location */}
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
                        onClick={() => setPaymentStep('select')}
                        className="flex-1 py-2 border rounded-lg hover:bg-gray-50"
                      >
                        Back
                      </button>
                      <button
                        onClick={handleRecordPayment}
                        disabled={processing}
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