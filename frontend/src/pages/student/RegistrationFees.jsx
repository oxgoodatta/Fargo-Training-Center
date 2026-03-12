import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  CreditCard, Smartphone, Phone, Shield, 
  ArrowLeft, CheckCircle, AlertCircle, Info,
  Copy, Users, Clock, RefreshCw, History,
  X, Wallet
} from 'lucide-react';
import { courseService } from '../../api/services/courseService';
import { authService } from '../../api/services/authService';
import toast from 'react-hot-toast';

const RegistrationFees = () => {
  const navigate = useNavigate();
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [momoPhone, setMomoPhone] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('mtn');
  const [transactionStep, setTransactionStep] = useState('select'); // select, processing, awaiting_confirmation, pending_list, complete
  const [studentInfo, setStudentInfo] = useState(null);
  const [transactionId, setTransactionId] = useState('');
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [pendingTransactions, setPendingTransactions] = useState([]);

  useEffect(() => {
    // Get student info from registration
    const pendingStudent = sessionStorage.getItem('pending_registration');
    if (pendingStudent) {
      setStudentInfo(JSON.parse(pendingStudent));
    } else {
      // Check if there are pending transactions (user might have returned)
      loadPendingTransactions();
    }
    
    fetchCourses();
  }, []);

  useEffect(() => {
    // Check for current transaction when component mounts
    const currentTx = sessionStorage.getItem('current_transaction');
    if (currentTx && transactionStep === 'select') {
      const tx = JSON.parse(currentTx);
      if (tx.status === 'pending') {
        setTransactionId(tx.reference);
        setMomoPhone(tx.phone);
        setSelectedProvider(tx.provider);
        
        // Find and set the course
        const course = courses.find(c => c.id === tx.course_id);
        if (course) {
          setSelectedCourse(course);
          setShowPaymentModal(true);
          setTransactionStep('awaiting_confirmation');
        }
      }
    }
  }, [courses, transactionStep]);

  const loadPendingTransactions = () => {
    const pending = sessionStorage.getItem('pending_transactions');
    if (pending) {
      const txs = JSON.parse(pending);
      setPendingTransactions(txs);
      if (txs.length > 0) {
        toast.success(`You have ${txs.length} pending registration(s)`);
      }
    }
  };

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const response = await courseService.getCourses({ active_only: true });
      setCourses(response.data.courses || []);
    } catch (error) {
      console.error('Error fetching courses:', error);
      toast.error('Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  const handleCourseSelect = (course) => {
    setSelectedCourse(course);
    setShowPaymentModal(true);
    setTransactionStep('payment');
    setMomoPhone('');
  };

  const closeModal = () => {
    setShowPaymentModal(false);
    setTransactionStep('select');
    setSelectedCourse(null);
  };

  const handleMomoPayment = async () => {
    if (!momoPhone || momoPhone.length < 10) {
      toast.error('Please enter a valid phone number');
      return;
    }

    setTransactionStep('processing');
    
    try {
      // Generate a unique transaction reference
      const transactionRef = `TXN-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      setTransactionId(transactionRef);
      
      // Store transaction in session
      const pendingTx = {
        reference: transactionRef,
        course_id: selectedCourse.id,
        course_name: selectedCourse.name,
        amount: selectedCourse.registration_fee,
        total_fee: selectedCourse.total_fee,
        phone: momoPhone,
        provider: selectedProvider,
        timestamp: new Date().toISOString(),
        status: 'pending',
        student_data: studentInfo
      };
      
      // Store in session storage
      const existingTx = sessionStorage.getItem('pending_transactions');
      const transactions = existingTx ? JSON.parse(existingTx) : [];
      transactions.push(pendingTx);
      sessionStorage.setItem('pending_transactions', JSON.stringify(transactions));
      
      // Also store current transaction
      sessionStorage.setItem('current_transaction', JSON.stringify(pendingTx));
      
      // Simulate API call to payment gateway
      setTimeout(() => {
        setTransactionStep('awaiting_confirmation');
        toast.success('✅ Payment request sent! Check your phone to complete.', {
          duration: 5000,
          icon: '📱'
        });
      }, 2000);
      
    } catch (error) {
      toast.error('Payment failed. Please try again.');
      setTransactionStep('payment');
    }
  };

  const checkPaymentStatus = async () => {
    setCheckingStatus(true);
    
    try {
      // Simulate checking with payment gateway
      setTimeout(() => {
        // For demo - in production, check actual payment status
        // 80% success rate for demo
        const success = Math.random() > 0.2;
        
        if (success) {
          setTransactionStep('complete');
          
          // Update transaction status in session
          const currentTx = JSON.parse(sessionStorage.getItem('current_transaction'));
          currentTx.status = 'completed';
          sessionStorage.setItem('current_transaction', JSON.stringify(currentTx));
          
          // Remove from pending list
          const allTxs = JSON.parse(sessionStorage.getItem('pending_transactions') || '[]');
          const updatedTxs = allTxs.filter(tx => tx.reference !== currentTx.reference);
          sessionStorage.setItem('pending_transactions', JSON.stringify(updatedTxs));
          
          toast.success('✅ Payment confirmed! You can now complete registration.');
        } else {
          toast.error('⏳ Payment not yet confirmed. Please complete on your phone.', {
            duration: 4000,
            icon: '📱'
          });
        }
        
        setCheckingStatus(false);
      }, 2000);
      
    } catch (error) {
      toast.error('Failed to check status');
      setCheckingStatus(false);
    }
  };

  const retryPayment = () => {
    setTransactionStep('payment');
    setMomoPhone('');
  };

  const viewPendingTransactions = () => {
    const pending = JSON.parse(sessionStorage.getItem('pending_transactions') || '[]');
    if (pending.length === 0) {
      toast('No pending transactions found');
      return;
    }
    
    setPendingTransactions(pending);
    setTransactionStep('pending_list');
  };

  const resumeTransaction = (tx) => {
    setTransactionId(tx.reference);
    setMomoPhone(tx.phone);
    setSelectedProvider(tx.provider);
    
    // Find and set the course
    const course = courses.find(c => c.id === tx.course_id);
    if (course) {
      setSelectedCourse(course);
      setShowPaymentModal(true);
      setTransactionStep('awaiting_confirmation');
      
      // Set current transaction
      sessionStorage.setItem('current_transaction', JSON.stringify(tx));
    }
  };

  const cancelTransaction = (txRef) => {
    if (window.confirm('Remove this pending transaction?')) {
      const allTxs = JSON.parse(sessionStorage.getItem('pending_transactions') || '[]');
      const updatedTxs = allTxs.filter(tx => tx.reference !== txRef);
      sessionStorage.setItem('pending_transactions', JSON.stringify(updatedTxs));
      setPendingTransactions(updatedTxs);
      
      if (updatedTxs.length === 0) {
        setTransactionStep('select');
      }
      
      toast.success('Transaction removed');
    }
  };

  const completeRegistration = async () => {
    try {
      // Get stored student data
      const pendingData = sessionStorage.getItem('pending_registration');
      const currentTx = JSON.parse(sessionStorage.getItem('current_transaction'));
      
      if (!pendingData && !currentTx?.student_data) {
        toast.error('Registration data not found. Please register again.');
        navigate('/register/student');
        return;
      }
      
      // Use either pending registration or data from transaction
      const studentData = pendingData 
        ? JSON.parse(pendingData) 
        : currentTx.student_data;
      
      // Remove any fields that might be empty strings (since we removed them from the model)
      // Clean up the student data to match the updated model
      const cleanStudentData = {
        first_name: studentData.first_name,
        last_name: studentData.last_name,
        date_of_birth: studentData.date_of_birth,
        gender: studentData.gender,
        phone: studentData.phone,
        email: studentData.email || null, // Convert empty string to null
        password: studentData.password
      };
      
      // Add course selection and payment info to data
      cleanStudentData.course_id = selectedCourse?.id || currentTx.course_id;
      cleanStudentData.payment_reference = transactionId || currentTx.reference;
      cleanStudentData.payment_method = 'momo';
      cleanStudentData.payment_phone = momoPhone || currentTx.phone;
      cleanStudentData.registration_fee_paid = selectedCourse?.registration_fee || currentTx.amount;
      
      console.log('Submitting student data:', cleanStudentData); // For debugging
      
      // Call API to create student and registration
      const response = await authService.registerStudent(cleanStudentData);
      
      // Clear session storage
      sessionStorage.removeItem('pending_registration');
      sessionStorage.removeItem('current_transaction');
      
      // Remove from pending transactions
      const allTxs = JSON.parse(sessionStorage.getItem('pending_transactions') || '[]');
      const updatedTxs = allTxs.filter(tx => tx.reference !== currentTx?.reference);
      sessionStorage.setItem('pending_transactions', JSON.stringify(updatedTxs));
      
      // Store auth token
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      localStorage.setItem('role', 'student');
      localStorage.setItem('user_type', 'student');
      
      toast.success('✅ Registration complete! Welcome aboard!');
      
      // Navigate to student dashboard
      navigate('/student/dashboard');
      
    } catch (error) {
      console.error('Registration error details:', error.response?.data || error);
      const errorMessage = error.response?.data?.error || 'Registration failed. Please contact support.';
      toast.error(errorMessage);
    }
  };

  const formatCurrency = (amount) => {
    return `₵${parseFloat(amount || 0).toFixed(2)}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-secondary-200 border-t-secondary-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-100 p-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border border-primary-200 p-6 mb-6"
        >
          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                if (transactionStep === 'pending_list') {
                  setTransactionStep('select');
                } else {
                  navigate(-1);
                }
              }}
              className="flex items-center text-primary-600 hover:text-primary-800 transition-colors"
            >
              <ArrowLeft size={20} className="mr-2" />
              Back
            </button>
            <div className="flex items-center">
              {studentInfo ? (
                <>
                  <Users className="w-5 h-5 text-primary-400 mr-2" />
                  <span className="text-sm text-primary-600">
                    {studentInfo?.first_name || 'Student'}
                  </span>
                </>
              ) : (
                <button
                  onClick={viewPendingTransactions}
                  className="flex items-center text-secondary-600 hover:text-secondary-700"
                >
                  <History className="w-4 h-4 mr-1" />
                  <span className="text-sm">Pending ({pendingTransactions.length})</span>
                </button>
              )}
            </div>
          </div>
        </motion.div>

        {/* Main Content */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left Column - Main Flow */}
          <div className="md:col-span-2 space-y-6">
            {/* Welcome Message */}
            {transactionStep !== 'pending_list' && studentInfo && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-r from-secondary-500 to-secondary-600 rounded-2xl p-6 text-white"
              >
                <h2 className="text-2xl font-bold mb-2">
                  Welcome, {studentInfo?.first_name?.split(' ')[0] || 'Student'}! 👋
                </h2>
                <p className="text-secondary-100">
                  Complete your registration by selecting a course and making payment.
                </p>
              </motion.div>
            )}

            {/* Course Selection */}
            {transactionStep !== 'pending_list' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-2xl border border-primary-200 p-6"
              >
                <h3 className="text-lg font-semibold text-primary-800 mb-4 flex items-center">
                  <CreditCard className="w-5 h-5 mr-2 text-secondary-500" />
                  Select Your Course
                </h3>

                <div className="space-y-4">
                  {courses.map((course, index) => (
                    <motion.div
                      key={course.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="border-2 border-gray-200 rounded-xl p-4 cursor-pointer hover:border-secondary-300 hover:bg-gray-50 transition-all"
                      onClick={() => handleCourseSelect(course)}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold text-gray-900">{course.name}</h4>
                          <p className="text-sm text-gray-500 mt-1">{course.description}</p>
                          {course.duration && (
                            <div className="flex items-center mt-2 text-xs text-gray-500">
                              <Clock className="w-3 h-3 mr-1" />
                              Duration: {course.duration}
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500">Registration Fee</p>
                          <p className="text-xl font-bold text-secondary-600">
                            {formatCurrency(course.registration_fee)}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Tuition: {formatCurrency(course.tuition_fee)}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Pending Transactions List */}
            {transactionStep === 'pending_list' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-2xl border border-primary-200 p-6"
              >
                <h3 className="text-lg font-semibold text-primary-800 mb-4 flex items-center">
                  <History className="w-5 h-5 mr-2 text-secondary-500" />
                  Your Pending Registrations
                </h3>
                
                {pendingTransactions.length > 0 ? (
                  <div className="space-y-4">
                    {pendingTransactions.map((tx, index) => (
                      <div key={index} className="border border-gray-200 rounded-xl p-4 hover:bg-gray-50">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-semibold text-gray-900">{tx.course_name}</p>
                            <p className="text-xs text-gray-500 mt-1">Ref: {tx.reference}</p>
                          </div>
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full">
                            Pending
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                          <div>
                            <p className="text-gray-500">Amount</p>
                            <p className="font-medium text-gray-900">{formatCurrency(tx.amount)}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Phone</p>
                            <p className="font-medium text-gray-900">{tx.phone}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Provider</p>
                            <p className="font-medium text-gray-900">{tx.provider === 'mtn' ? 'MTN' : 'Vodafone'}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Started</p>
                            <p className="font-medium text-gray-900">{new Date(tx.timestamp).toLocaleDateString()}</p>
                          </div>
                        </div>
                        
                        <div className="flex space-x-2">
                          <button
                            onClick={() => resumeTransaction(tx)}
                            className="flex-1 py-2 bg-secondary-500 text-white rounded-lg text-sm hover:bg-secondary-600 transition-colors"
                          >
                            Continue Registration
                          </button>
                          <button
                            onClick={() => cancelTransaction(tx.reference)}
                            className="px-3 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <History className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                    <p className="text-gray-500">No pending transactions</p>
                    <button
                      onClick={() => setTransactionStep('select')}
                      className="mt-4 text-secondary-500 hover:text-secondary-600"
                    >
                      Start New Registration
                    </button>
                  </div>
                )}
                
                <button
                  onClick={() => setTransactionStep('select')}
                  className="w-full mt-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Back to Courses
                </button>
              </motion.div>
            )}
          </div>

          {/* Right Column - Information & Trust */}
          <div className="space-y-6">
            {/* Registration Summary */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white rounded-2xl border border-primary-200 p-6"
            >
              <h3 className="font-semibold text-primary-800 mb-3 flex items-center">
                <Info className="w-4 h-4 mr-2 text-secondary-500" />
                Registration Summary
              </h3>
              {selectedCourse ? (
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">Course: {selectedCourse.name}</p>
                  <div className="border-t border-gray-200 my-2 pt-2">
                    <div className="flex justify-between text-sm">
                      <span>Registration Fee:</span>
                      <span className="font-medium">{formatCurrency(selectedCourse.registration_fee)}</span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                      <span>Tuition Fee:</span>
                      <span className="font-medium">{formatCurrency(selectedCourse.tuition_fee)}</span>
                    </div>
                    <div className="flex justify-between font-bold mt-3 pt-3 border-t border-gray-200">
                      <span>Total:</span>
                      <span className="text-secondary-600">{formatCurrency(selectedCourse.total_fee)}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500">Select a course to see fees</p>
              )}
            </motion.div>

            {/* Trust & Support */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 border border-blue-200"
            >
              <div className="flex items-center mb-4">
                <Shield className="w-8 h-8 text-blue-600 mr-3" />
                <h3 className="font-semibold text-blue-800">Need Help?</h3>
              </div>
              
              <p className="text-sm text-blue-700 mb-4">
                Not comfortable with online payment? Register at any of our branches or call us:
              </p>

              <div className="space-y-3">
                <div className="bg-white rounded-xl p-3 flex items-center">
                  <Phone className="w-5 h-5 text-green-600 mr-3" />
                  <div>
                    <p className="text-xs text-gray-500">Call to Register</p>
                    <p className="font-semibold text-gray-800">030 255 5777</p>
                  </div>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText('0302555777');
                      toast.success('Phone number copied!');
                    }}
                    className="ml-auto p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <Copy className="w-4 h-4 text-gray-400" />
                  </button>
                </div>

                <div className="bg-white rounded-xl p-3 flex items-center">
                  <Users className="w-5 h-5 text-primary-600 mr-3" />
                  <div>
                    <p className="text-xs text-gray-500">Walk-in Registration</p>
                    <p className="font-semibold text-gray-800">Visit any branch</p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  toast.success('We will contact you soon with field registration details');
                }}
                className="w-full mt-4 py-2 bg-white border border-blue-300 text-blue-700 rounded-xl hover:bg-blue-50 transition-colors"
              >
                Contact Me for Field Registration
              </button>
            </motion.div>

            {/* Branch Locations */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-2xl border border-primary-200 p-6"
            >
              <h3 className="font-semibold text-primary-800 mb-3">Our Branches</h3>
              <div className="space-y-2 text-sm">
                <p className="text-gray-600">🏢 Head Office - Accra</p>
                <p className="text-gray-600">🏢 Kumasi Branch</p>
                <p className="text-gray-600">🏢 Takoradi Branch</p>
                <p className="text-gray-600">🏢 Tamale Branch</p>
              </div>
              <p className="text-xs text-primary-400 mt-3">
                Visit any branch to register in person with our staff
              </p>
            </motion.div>

            {/* Recovery Info */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-yellow-50 rounded-2xl p-4 border border-yellow-200"
            >
              <div className="flex items-start">
                <RefreshCw className="w-4 h-4 text-yellow-600 mr-2 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-yellow-800 mb-1">
                    Lost your transaction?
                  </p>
                  <p className="text-xs text-yellow-700">
                    If you closed this window, simply log in again and click "Pending Registrations" to continue.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Security Notice */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-green-50 rounded-2xl p-4 border border-green-200"
            >
              <div className="flex items-start">
                <Shield className="w-4 h-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-green-700">
                  All payments are secure and processed through official mobile money channels. 
                  You will receive an instant confirmation from your network provider.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      <AnimatePresence>
        {showPaymentModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center p-4">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={closeModal}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm"
              />

              {/* Modal */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto"
              >
                {/* Modal Header */}
                <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center">
                    <Wallet className="w-5 h-5 text-secondary-500 mr-2" />
                    <h3 className="text-lg font-bold text-primary-800">Complete Payment</h3>
                  </div>
                  <button
                    onClick={closeModal}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>

                {/* Modal Content */}
                <div className="p-6">
                  {/* Payment Step */}
                  {transactionStep === 'payment' && (
                    <div className="space-y-6">
                      {/* Course Summary */}
                      <div className="bg-primary-50 rounded-xl p-4">
                        <p className="text-sm text-primary-600">Course: {selectedCourse?.name}</p>
                        <p className="text-2xl font-bold text-secondary-600 mt-2">
                          {formatCurrency(selectedCourse?.registration_fee)}
                        </p>
                        <p className="text-xs text-primary-500 mt-1">
                          Registration Fee Only
                        </p>
                      </div>

                      {/* Provider Selection */}
                      <div>
                        <label className="block text-sm font-medium text-primary-700 mb-3">
                          Select Mobile Money Provider
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            onClick={() => setSelectedProvider('mtn')}
                            className={`p-4 border-2 rounded-xl flex flex-col items-center justify-center space-y-2 transition-all ${
                              selectedProvider === 'mtn'
                                ? 'border-yellow-500 bg-yellow-50'
                                : 'border-gray-200 hover:border-yellow-300 hover:bg-gray-50'
                            }`}
                          >
                            <div className="w-12 h-12 bg-yellow-500 rounded-full flex items-center justify-center">
                              <span className="text-white font-bold text-sm">MTN</span>
                            </div>
                            <span className="font-medium text-sm">MTN MoMo</span>
                          </button>
                          <button
                            onClick={() => setSelectedProvider('vodafone')}
                            className={`p-4 border-2 rounded-xl flex flex-col items-center justify-center space-y-2 transition-all ${
                              selectedProvider === 'vodafone'
                                ? 'border-red-500 bg-red-50'
                                : 'border-gray-200 hover:border-red-300 hover:bg-gray-50'
                            }`}
                          >
                            <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center">
                              <span className="text-white font-bold text-sm">VDF</span>
                            </div>
                            <span className="font-medium text-sm">Vodafone Cash</span>
                          </button>
                        </div>
                      </div>

                      {/* Phone Number Input */}
                      <div>
                        <label className="block text-sm font-medium text-primary-700 mb-2">
                          MoMo Phone Number
                        </label>
                        <div className="relative">
                          <Phone className="absolute left-4 top-1/2 transform -translate-y-1/2 text-primary-400 w-5 h-5" />
                          <input
                            type="tel"
                            value={momoPhone}
                            onChange={(e) => setMomoPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                            placeholder="024XXXXXXX"
                            className="w-full pl-12 pr-4 py-3 bg-primary-50 border border-primary-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary-400"
                            autoFocus
                          />
                        </div>
                        <p className="text-xs text-primary-400 mt-2">
                          Enter the phone number you'll use for payment
                        </p>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex space-x-3 pt-4">
                        <button
                          onClick={closeModal}
                          className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all font-medium"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleMomoPayment}
                          disabled={!momoPhone || momoPhone.length < 10}
                          className="flex-1 py-3 bg-gradient-to-r from-secondary-500 to-secondary-600 text-white rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                        >
                          Pay Now
                        </button>
                      </div>

                      <p className="text-xs text-center text-gray-500">
                        You will receive a prompt on your phone to complete the payment
                      </p>
                    </div>
                  )}

                  {/* Processing State */}
                  {transactionStep === 'processing' && (
                    <div className="py-8 text-center">
                      <div className="w-16 h-16 border-4 border-secondary-200 border-t-secondary-600 rounded-full animate-spin mx-auto mb-4"></div>
                      <h3 className="text-lg font-semibold text-primary-800 mb-2">
                        Processing Payment
                      </h3>
                      <p className="text-sm text-primary-500">
                        Please wait while we initiate your payment...
                      </p>
                    </div>
                  )}

                  {/* Awaiting Confirmation State */}
                  {transactionStep === 'awaiting_confirmation' && (
                    <div className="space-y-6">
                      <div className="text-center">
                        <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Smartphone className="w-8 h-8 text-yellow-600" />
                        </div>
                        
                        <h3 className="text-lg font-semibold text-primary-800 mb-2">
                          Check Your Phone 📱
                        </h3>
                        
                        <p className="text-sm text-primary-500 mb-4">
                          We've sent a payment request to <strong className="text-primary-700">{momoPhone}</strong>
                        </p>
                      </div>

                      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-left">
                        <p className="text-xs text-yellow-800 mb-2 flex items-center">
                          <AlertCircle className="w-4 h-4 mr-2" />
                          <span className="font-medium">What to do next:</span>
                        </p>
                        <ol className="text-xs text-yellow-700 space-y-2 ml-6 list-decimal">
                          <li>Check your phone for a payment prompt from {selectedProvider === 'mtn' ? 'MTN' : 'Vodafone'}</li>
                          <li>Enter your MoMo PIN to authorize payment of {formatCurrency(selectedCourse?.registration_fee)}</li>
                          <li>Wait for confirmation message from your network</li>
                          <li>Return here and click "I've Completed Payment"</li>
                        </ol>
                      </div>
                      
                      <div className="bg-gray-50 rounded-xl p-4">
                        <p className="text-xs text-gray-500 mb-2">Transaction Reference (Save this):</p>
                        <p className="font-mono text-sm font-medium text-primary-600 break-all">{transactionId}</p>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(transactionId);
                            toast.success('Transaction reference copied!');
                          }}
                          className="mt-2 text-xs text-secondary-600 hover:text-secondary-700 flex items-center justify-center w-full"
                        >
                          <Copy className="w-3 h-3 mr-1" />
                          Copy Reference
                        </button>
                      </div>
                      
                      <div className="flex flex-col space-y-3">
                        <button
                          onClick={checkPaymentStatus}
                          disabled={checkingStatus}
                          className="w-full py-3 bg-gradient-to-r from-secondary-500 to-secondary-600 text-white rounded-xl hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center"
                        >
                          {checkingStatus ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                              Checking...
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-5 h-5 mr-2" />
                              I've Completed Payment
                            </>
                          )}
                        </button>
                        
                        <button
                          onClick={retryPayment}
                          className="w-full py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all"
                        >
                          Use Different Number
                        </button>
                        
                        <button
                          onClick={closeModal}
                          className="text-sm text-primary-500 hover:text-primary-700"
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Payment Complete State */}
                  {transactionStep === 'complete' && (
                    <div className="space-y-6">
                      <div className="text-center">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <CheckCircle className="w-8 h-8 text-green-600" />
                        </div>
                        
                        <h3 className="text-lg font-semibold text-primary-800 mb-2">
                          Payment Successful! 🎉
                        </h3>
                        
                        <p className="text-sm text-primary-500 mb-4">
                          Your payment has been confirmed.
                        </p>
                      </div>
                      
                      <div className="bg-green-50 rounded-xl p-4 text-left">
                        <p className="text-xs text-green-700 mb-1">Transaction Reference:</p>
                        <p className="font-mono text-sm font-medium text-primary-600 mb-3 break-all">{transactionId}</p>
                        
                        <p className="text-xs text-green-700">
                          Your registration is almost complete. Click below to finish.
                        </p>
                      </div>
                      
                      <div className="flex flex-col space-y-3">
                        <button
                          onClick={completeRegistration}
                          className="w-full py-3 bg-gradient-to-r from-secondary-500 to-secondary-600 text-white rounded-xl hover:shadow-lg transition-all"
                        >
                          Complete Registration Now
                        </button>
                        
                        <button
                          onClick={() => {
                            toast.success('You can complete registration later from your dashboard');
                            closeModal();
                            navigate('/login');
                          }}
                          className="w-full py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all"
                        >
                          Complete Later
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RegistrationFees;