import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import SignatureCanvas from 'react-signature-canvas';
import { 
  User, Phone, Mail, Calendar, ArrowLeft, CheckCircle, AlertCircle, Loader,
  BookOpen, CreditCard, Smartphone, Landmark, MapPin, X, Search, UserPlus,
  PenTool, RotateCcw, Save
} from 'lucide-react';
import { courseService } from '../../api/services/courseService';
import { studentService } from '../../api/services/studentService';
import { paymentService } from '../../api/services/paymentService';
import { authService } from '../../api/services/authService';
import apiClient from '../../api/client';
import toast from 'react-hot-toast';

const RegisterStudent = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const signatureRef = useRef(null);
  
  const [step, setStep] = useState(1);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [searchMode, setSearchMode] = useState('new');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [signatureData, setSignatureData] = useState(null);
  const [signatureEmpty, setSignatureEmpty] = useState(true);
  
  // New state for transaction ID fields
  const [transactionId, setTransactionId] = useState('');
  const [confirmTransactionId, setConfirmTransactionId] = useState('');
  const [transactionIdError, setTransactionIdError] = useState('');
  
  // Check if coming from admin
  const searchParams = new URLSearchParams(location.search);
  const isFromAdmin = searchParams.get('source') === 'admin';
  
  const staff = authService.getCurrentUser();
  
  const [formData, setFormData] = useState({
    // Student Info (for new students)
    first_name: '',
    last_name: '',
    date_of_birth: '',
    gender: '',
    phone: '',
    email: '',
    
    // Course Selection
    course_id: '',
    branch: 'Head Office',
    
    // Payment
    payment_method: 'cash',
    payment_location: 'office',
    amount_paid: '',
    momo_phone: '',
    momo_provider: 'mtn'
  });

  useEffect(() => {
    fetchCourses();
  }, []);

  // Auto-save signature when user draws
  const handleSignatureChange = () => {
    if (signatureRef.current && !signatureRef.current.isEmpty()) {
      const signature = signatureRef.current.toDataURL();
      setSignatureData(signature);
      setSignatureEmpty(false);
    } else {
      setSignatureEmpty(true);
      setSignatureData(null);
    }
  };

  const fetchCourses = async () => {
    try {
      const response = await courseService.getCourses({ active_only: true });
      setCourses(response.data.courses || []);
    } catch (error) {
      console.error('Error fetching courses:', error);
      toast.error('Failed to load courses');
    }
  };

  // Search for existing students
  useEffect(() => {
    const searchStudents = async () => {
      if (searchTerm.length >= 3) {
        setSearching(true);
        try {
          const response = await studentService.getStudents({ 
            search: searchTerm,
            per_page: 10 
          });
          setSearchResults(response.data.students || []);
        } catch (error) {
          console.error('Error searching students:', error);
        } finally {
          setSearching(false);
        }
      } else {
        setSearchResults([]);
      }
    };

    const timeoutId = setTimeout(searchStudents, 500);
    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  // Check phone existence (for new students only)
  useEffect(() => {
    if (searchMode === 'new') {
      const checkPhone = async () => {
        if (formData.phone && formData.phone.length >= 10) {
          setChecking(true);
          try {
            const response = await studentService.checkPhone(formData.phone);
            if (response.data.exists) {
              setPhoneError('Phone number already registered. Use "Search Existing" instead.');
            } else {
              setPhoneError('');
            }
          } catch (error) {
            console.error('Error checking phone:', error);
          } finally {
            setChecking(false);
          }
        } else {
          setPhoneError('');
        }
      };

      const timeoutId = setTimeout(checkPhone, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [formData.phone, searchMode]);

  // Check email existence (for new students only)
  useEffect(() => {
    if (searchMode === 'new') {
      const checkEmail = async () => {
        if (formData.email && formData.email.includes('@')) {
          setChecking(true);
          try {
            const response = await studentService.checkEmail(formData.email);
            if (response.data.exists) {
              setEmailError('Email already registered');
            } else {
              setEmailError('');
            }
          } catch (error) {
            console.error('Error checking email:', error);
          } finally {
            setChecking(false);
          }
        } else {
          setEmailError('');
        }
      };

      const timeoutId = setTimeout(checkEmail, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [formData.email, searchMode]);

  // Validate transaction IDs match
  useEffect(() => {
    if (formData.payment_method === 'momo' && transactionId && confirmTransactionId) {
      if (transactionId !== confirmTransactionId) {
        setTransactionIdError('Transaction IDs do not match');
      } else {
        setTransactionIdError('');
      }
    } else {
      setTransactionIdError('');
    }
  }, [transactionId, confirmTransactionId, formData.payment_method]);

  const handleSelectStudent = (student) => {
    setSelectedStudent(student);
    setSearchMode('existing');
    setStep(2);
  };

  const handleNext = () => {
    if (step === 1) {
      if (searchMode === 'new') {
        if (!formData.first_name || !formData.last_name || !formData.date_of_birth || !formData.gender || !formData.phone) {
          toast.error('Please fill all required fields');
          return;
        }
        if (phoneError || emailError) {
          toast.error('Please fix validation errors');
          return;
        }
      } else if (searchMode === 'existing' && !selectedStudent) {
        toast.error('Please select a student');
        return;
      }
    }
    
    if (step === 2) {
      if (!formData.course_id) {
        toast.error('Please select a course');
        return;
      }
    }
    
    if (step === 3) {
      // Check signature data
      if (!signatureData || signatureEmpty) {
        toast.error('Please provide a signature');
        return;
      }
    }
    
    setStep(step + 1);
  };

  const handleBack = () => {
    if (step === 2 && searchMode === 'existing') {
      setSearchMode('new');
      setSelectedStudent(null);
      setStep(1);
    } else {
      setStep(step - 1);
    }
  };

  const clearSignature = () => {
    if (signatureRef.current) {
      signatureRef.current.clear();
      setSignatureEmpty(true);
      setSignatureData(null);
    }
  };

  // Helper function to round to 2 decimal places
  const roundToTwoDecimals = (value) => {
    return Math.round((value || 0) * 100) / 100;
  };

  // Helper function to check if amount is valid (at least 100 GHS)
  const isAmountValid = () => {
    const amount = parseFloat(formData.amount_paid);
    return !isNaN(amount) && amount >= 100;
  };

  const handleSubmit = async () => {
    if (!signatureData) {
      toast.error('Signature is required');
      return;
    }

    if (!formData.amount_paid || parseFloat(formData.amount_paid) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    // Check minimum amount
    if (!isAmountValid()) {
      toast.error('Minimum payment amount is ₵100.00');
      return;
    }

    // Validate transaction ID for mobile money
    if (formData.payment_method === 'momo') {
      if (!transactionId || !confirmTransactionId) {
        toast.error('Please enter both transaction ID and confirmation');
        return;
      }
      if (transactionId !== confirmTransactionId) {
        toast.error('Transaction IDs do not match');
        return;
      }
    }
    
    setLoading(true);
    
    try {
      let studentId;
      
      if (searchMode === 'new') {
        const studentData = {
          first_name: formData.first_name,
          last_name: formData.last_name,
          date_of_birth: formData.date_of_birth,
          gender: formData.gender,
          phone: formData.phone,
          email: formData.email || null,
          password: 'password123'
        };
        
        const studentRes = await studentService.createStudent(studentData);
        studentId = studentRes.data.student.id;
      } else {
        studentId = selectedStudent.id;
      }
      
      const selectedCourse = courses.find(c => c.id === parseInt(formData.course_id));
      
      // Check if student already registered for this course
      console.log('Checking registration for student:', studentId, 'course:', selectedCourse.id);
      
      const studentRegsResponse = await apiClient.get('/registrations/', {
        params: { 
          student_id: studentId,
          status: 'active'
        }
      });
      
      const studentRegs = studentRegsResponse.data.registrations || [];
      console.log('Student existing registrations:', studentRegs);
      
      const alreadyRegistered = studentRegs.some(reg => 
        Number(reg.course_id) === Number(selectedCourse.id)
      );
      
      if (alreadyRegistered) {
        toast.error('Student is already registered for this course');
        setLoading(false);
        return;
      }
      
      // Round the amount paid to 2 decimal places
      const amountPaid = roundToTwoDecimals(parseFloat(formData.amount_paid));
      
      // Create registration with signature
      const registrationData = {
        student_id: studentId,
        course_id: selectedCourse.id,
        course_name: selectedCourse.name,
        course_fee: selectedCourse.total_fee,
        branch: formData.branch,
        registration_fee: amountPaid,
        total_fee: selectedCourse.total_fee,
        registration_date: new Date().toISOString().split('T')[0],
        status: 'active',
        payment_location: formData.payment_location,
        processed_by_staff_id: staff?.id,
        signature: signatureData 
      };
      
      console.log('Creating registration:', registrationData);
      const regRes = await apiClient.post('/registrations/', registrationData);
      const newRegistration = regRes.data.registration;
      
      // Create payment record with transaction IDs
      const paymentRecord = {
        registration_id: newRegistration.id,
        student_id: studentId,
        amount: amountPaid,
        payment_method: formData.payment_method,
        payment_location: formData.payment_location,
        collected_by_staff_id: staff?.id,
        momo_phone_number: formData.momo_phone || null,
        momo_provider: formData.momo_provider,
        transaction_id: formData.payment_method === 'momo' ? transactionId : null,
        confirm_transaction_id: formData.payment_method === 'momo' ? confirmTransactionId : null,
        payment_type: 'registration',
        status: 'completed'
      };
      
      console.log('Creating payment:', paymentRecord);
      await paymentService.createPayment(paymentRecord);
      
      toast.success(searchMode === 'new' ? 'Student registered successfully!' : 'Course added successfully!');
      
      // Navigate back to appropriate dashboard
      if (isFromAdmin) {
        navigate('/admin/students');
      } else {
        navigate('/staff/dashboard');
      }
      
    } catch (error) {
      console.error('Registration error:', error);
      toast.error(error.response?.data?.error || 'Failed to register student');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return `₵${parseFloat(amount || 0).toFixed(2)}`;
  };

  const selectedCourse = courses.find(c => c.id === parseInt(formData.course_id));

  const handleGoBack = () => {
    if (isFromAdmin) {
      navigate('/admin/students');
    } else {
      navigate('/staff/dashboard');
    }
  };

  // Calculate rounded values for display
  const amountPaidNum = roundToTwoDecimals(parseFloat(formData.amount_paid) || 0);
  const registrationFeeNum = selectedCourse ? roundToTwoDecimals(selectedCourse.registration_fee) : 0;
  const totalFeeNum = selectedCourse ? roundToTwoDecimals(selectedCourse.total_fee) : 0;
  const registrationPortion = Math.min(amountPaidNum, registrationFeeNum);
  const tuitionPortion = Math.max(0, amountPaidNum - registrationFeeNum);
  const outstandingBalance = roundToTwoDecimals(totalFeeNum - amountPaidNum);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-100 p-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center">
          <button
            onClick={handleGoBack}
            className="p-2 hover:bg-gray-200 rounded-lg mr-4"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold text-primary-800">
            {searchMode === 'new' ? 'Register New Student' : 'Add Course for Student'}
          </h1>
        </div>

        {/* Mode Toggle (only at step 1) */}
        {step === 1 && (
          <div className="flex space-x-4 mb-6">
            <button
              onClick={() => {
                setSearchMode('new');
                setSelectedStudent(null);
                setSearchTerm('');
              }}
              className={`flex-1 py-3 rounded-lg font-medium transition-all ${
                searchMode === 'new'
                  ? 'bg-secondary-500 text-white'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <UserPlus className="w-5 h-5 inline mr-2" />
              New Student
            </button>
            <button
              onClick={() => {
                setSearchMode('existing');
                setSelectedStudent(null);
              }}
              className={`flex-1 py-3 rounded-lg font-medium transition-all ${
                searchMode === 'existing'
                  ? 'bg-secondary-500 text-white'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Search className="w-5 h-5 inline mr-2" />
              Existing Student
            </button>
          </div>
        )}

        {/* Progress Steps - 4 steps */}
        <div className="flex items-center justify-between mb-8 px-4">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                s === step ? 'bg-secondary-500 text-white' : 
                s < step ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                {s < step ? <CheckCircle className="w-5 h-5" /> : s}
              </div>
              {s < 4 && (
                <div className={`w-16 h-1 mx-2 ${
                  s < step ? 'bg-green-500' : 'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Main Card */}
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="bg-white rounded-2xl border border-gray-200 shadow-xl p-8"
        >
          <h2 className="text-xl font-semibold text-primary-800 mb-6">
            {step === 1 && (searchMode === 'new' ? 'Student Information' : 'Find Existing Student')}
            {step === 2 && 'Course Selection'}
            {step === 3 && 'Student Signature'}
            {step === 4 && 'Payment Details'}
          </h2>

          {/* Step 1: Student Info or Search */}
          {step === 1 && (
            <div className="space-y-4">
              {searchMode === 'new' ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">First Name *</label>
                      <input
                        type="text"
                        value={formData.first_name}
                        onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-secondary-400"
                        placeholder="John"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Last Name *</label>
                      <input
                        type="text"
                        value={formData.last_name}
                        onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-secondary-400"
                        placeholder="Doe"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Date of Birth *</label>
                      <input
                        type="date"
                        value={formData.date_of_birth}
                        onChange={(e) => setFormData({...formData, date_of_birth: e.target.value})}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-secondary-400"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Gender *</label>
                      <select
                        value={formData.gender}
                        onChange={(e) => setFormData({...formData, gender: e.target.value})}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-secondary-400"
                      >
                        <option value="">Select</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Phone Number *</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value.replace(/\D/g, '')})}
                        className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-secondary-400 ${
                          phoneError ? 'border-red-500' : formData.phone && !phoneError ? 'border-green-500' : ''
                        }`}
                        placeholder="024XXXXXXX"
                      />
                      {checking && <Loader className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 animate-spin" />}
                    </div>
                    {phoneError && <p className="text-xs text-red-600 mt-1">{phoneError}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-secondary-400 ${
                          emailError ? 'border-red-500' : formData.email && !emailError ? 'border-green-500' : ''
                        }`}
                        placeholder="student@example.com"
                      />
                    </div>
                    {emailError && <p className="text-xs text-red-600 mt-1">{emailError}</p>}
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Search Student</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-secondary-400"
                        placeholder="Search by name, phone, or ID..."
                      />
                      {searching && <Loader className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 animate-spin" />}
                    </div>
                  </div>

                  {searchResults.length > 0 && (
                    <div className="border rounded-lg divide-y max-h-60 overflow-y-auto">
                      {searchResults.map(student => (
                        <button
                          key={student.id}
                          onClick={() => handleSelectStudent(student)}
                          className="w-full p-4 text-left hover:bg-gray-50 transition-colors"
                        >
                          <div className="font-medium">{student.first_name} {student.last_name}</div>
                          <div className="text-sm text-gray-600 flex items-center mt-1">
                            <Phone className="w-3 h-3 mr-1" />
                            {student.phone}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">ID: {student.student_id}</div>
                        </button>
                      ))}
                    </div>
                  )}

                  {searchTerm.length >= 3 && searchResults.length === 0 && !searching && (
                    <div className="text-center py-8 text-gray-500">
                      <User className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                      <p>No students found</p>
                      <button
                        onClick={() => setSearchMode('new')}
                        className="mt-2 text-secondary-500 hover:text-secondary-600"
                      >
                        Register as new student instead
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Course Selection */}
          {step === 2 && (
            <div className="space-y-4">
              {selectedStudent && (
                <div className="bg-primary-50 p-4 rounded-lg mb-4">
                  <div className="flex items-center">
                    <User className="w-5 h-5 text-primary-600 mr-2" />
                    <div>
                      <p className="font-medium">{selectedStudent.first_name} {selectedStudent.last_name}</p>
                      <p className="text-sm text-gray-600">ID: {selectedStudent.student_id} | Phone: {selectedStudent.phone}</p>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-2">Select Course *</label>
                <select
                  value={formData.course_id}
                  onChange={(e) => setFormData({...formData, course_id: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-secondary-400"
                >
                  <option value="">Choose a course...</option>
                  {courses.map(course => (
                    <option key={course.id} value={course.id}>
                      {course.name} - Reg: {formatCurrency(course.registration_fee)} | Total: {formatCurrency(course.total_fee)}
                    </option>
                  ))}
                </select>
              </div>

              {selectedCourse && (
                <div className="bg-primary-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">{selectedCourse.name}</h3>
                  <p className="text-sm text-gray-600 mb-3">{selectedCourse.description}</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-gray-500">Registration Fee</p>
                      <p className="font-bold text-secondary-600">{formatCurrency(selectedCourse.registration_fee)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Tuition Fee</p>
                      <p className="font-bold">{formatCurrency(selectedCourse.tuition_fee)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Duration</p>
                      <p className="font-medium">{selectedCourse.duration || 'TBD'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Total</p>
                      <p className="font-bold text-secondary-600">{formatCurrency(selectedCourse.total_fee)}</p>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-2">Branch *</label>
                <select
                  value={formData.branch}
                  onChange={(e) => setFormData({...formData, branch: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-secondary-400"
                >
                  <option value="Head Office">Head Office</option>
                  <option value="Accra Branch">Accra Branch</option>
                  <option value="Kumasi Branch">Kumasi Branch</option>
                  <option value="Takoradi Branch">Takoradi Branch</option>
                  <option value="Tamale Branch">Tamale Branch</option>
                </select>
              </div>
            </div>
          )}

          {/* Step 3: Signature - Auto-save on draw */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="bg-primary-50 p-4 rounded-lg">
                <p className="text-sm text-primary-700 flex items-center">
                  <PenTool className="w-4 h-4 mr-2" />
                  Please sign below to confirm registration (auto-saved)
                </p>
                {selectedCourse && (
                  <p className="text-xs text-primary-600 mt-2">
                    Course: {selectedCourse.name} | Fee: {formatCurrency(selectedCourse.registration_fee)}
                  </p>
                )}
              </div>

              <div className="border-2 border-gray-300 rounded-lg overflow-hidden bg-white">
                <SignatureCanvas
                  ref={signatureRef}
                  onEnd={handleSignatureChange}
                  canvasProps={{
                    className: 'w-full h-48',
                    style: { 
                      backgroundColor: 'white',
                      width: '100%',
                      height: '200px'
                    }
                  }}
                  onBegin={() => setSignatureEmpty(false)}
                />
              </div>

              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={clearSignature}
                  className="px-4 py-2 border border-gray-300 rounded-lg flex items-center hover:bg-gray-50"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Clear Signature
                </button>
              </div>

              {signatureData && !signatureEmpty && (
                <div className="bg-green-50 p-3 rounded-lg text-green-700 text-sm flex items-center">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Signature captured successfully
                </div>
              )}
            </div>
          )}

          {/* Step 4: Payment with Transaction ID - WITH MINIMUM AMOUNT VALIDATION */}
          {step === 4 && selectedCourse && (
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-800">Registration Fee: {formatCurrency(registrationFeeNum)}</p>
                <p className="text-sm text-blue-800">Tuition Fee: {formatCurrency(selectedCourse.tuition_fee)}</p>
                <p className="text-sm text-blue-800 font-semibold">Total Course Fee: {formatCurrency(totalFeeNum)}</p>
                {signatureData && (
                  <p className="text-xs text-green-600 mt-2 flex items-center">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Signature verified
                  </p>
                )}
                <p className="text-xs text-blue-600 mt-2 flex items-center">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Minimum payment: ₵100.00
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Payment Method</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setFormData({...formData, payment_method: 'cash'});
                      setTransactionId('');
                      setConfirmTransactionId('');
                    }}
                    className={`p-3 border rounded-lg flex items-center justify-center space-x-2 ${
                      formData.payment_method === 'cash' ? 'border-green-500 bg-green-50' : 'border-gray-300'
                    }`}
                  >
                    <Landmark className="w-5 h-5" />
                    <span>Cash</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFormData({...formData, payment_method: 'momo'});
                    }}
                    className={`p-3 border rounded-lg flex items-center justify-center space-x-2 ${
                      formData.payment_method === 'momo' ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                    }`}
                  >
                    <Smartphone className="w-5 h-5" />
                    <span>Mobile Money</span>
                  </button>
                </div>
              </div>

              {formData.payment_method === 'momo' && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-2">MoMo Provider</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, momo_provider: 'mtn'})}
                        className={`p-2 border rounded-lg ${
                          formData.momo_provider === 'mtn' ? 'bg-yellow-50 border-yellow-500' : 'border-gray-300'
                        }`}
                      >
                        MTN MoMo
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, momo_provider: 'vodafone'})}
                        className={`p-2 border rounded-lg ${
                          formData.momo_provider === 'vodafone' ? 'bg-red-50 border-red-500' : 'border-gray-300'
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
                        value={formData.momo_phone}
                        onChange={(e) => setFormData({...formData, momo_phone: e.target.value.replace(/\D/g, '')})}
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

                  {/* FIXED: Amount field for MoMo - with scroll prevention and minimum validation */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Amount Paid (₵) *</label>
                    <input
                      type="number"
                      value={formData.amount_paid}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '' || !isNaN(parseFloat(value))) {
                          // Round to 2 decimal places when setting
                          if (value !== '') {
                            const rounded = Math.round(parseFloat(value) * 100) / 100;
                            setFormData({...formData, amount_paid: rounded.toString()});
                          } else {
                            setFormData({...formData, amount_paid: value});
                          }
                        }
                      }}
                      onWheel={(e) => e.target.blur()} // Prevents scroll wheel from changing value
                      max={totalFeeNum}
                      min="0"
                      step="0.01"
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-secondary-400"
                      placeholder="Enter amount paid"
                    />
                    {formData.amount_paid && parseFloat(formData.amount_paid) < 100 && (
                      <p className="text-xs text-red-600 mt-1 flex items-center">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        Minimum payment amount is ₵100.00
                      </p>
                    )}
                  </div>
                </>
              )}

              {/* FIXED: Amount field for Cash - with scroll prevention and minimum validation */}
              {formData.payment_method === 'cash' && (
                <div>
                  <label className="block text-sm font-medium mb-2">Amount Paid (₵) *</label>
                  <input
                    type="number"
                    value={formData.amount_paid}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '' || !isNaN(parseFloat(value))) {
                        // Round to 2 decimal places when setting
                        if (value !== '') {
                          const rounded = Math.round(parseFloat(value) * 100) / 100;
                          setFormData({...formData, amount_paid: rounded.toString()});
                        } else {
                          setFormData({...formData, amount_paid: value});
                        }
                      }
                    }}
                    onWheel={(e) => e.target.blur()} // Prevents scroll wheel from changing value
                    max={totalFeeNum}
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-secondary-400"
                    placeholder="Enter amount paid"
                  />
                  {formData.amount_paid && parseFloat(formData.amount_paid) < 100 && (
                    <p className="text-xs text-red-600 mt-1 flex items-center">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      Minimum payment amount is ₵100.00
                    </p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-2">Payment Location</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({...formData, payment_location: 'office'})}
                    className={`p-3 border rounded-lg ${
                      formData.payment_location === 'office' ? 'bg-purple-50 border-purple-500' : 'border-gray-300'
                    }`}
                  >
                    Office
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({...formData, payment_location: 'field'})}
                    className={`p-3 border rounded-lg ${
                      formData.payment_location === 'field' ? 'bg-orange-50 border-orange-500' : 'border-gray-300'
                    }`}
                  >
                    Field
                  </button>
                </div>
              </div>

              {/* Payment Summary - FIXED DECIMAL HANDLING WITH ROUNDING */}
              {formData.amount_paid && parseFloat(formData.amount_paid) > 0 && (
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h3 className="font-medium text-gray-700 mb-2">Payment Summary</h3>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Registration Fee:</span>
                      <span className="font-medium">{formatCurrency(registrationFeeNum)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Amount Paid:</span>
                      <span className="font-medium text-green-600">{formatCurrency(amountPaidNum)}</span>
                    </div>
                    {amountPaidNum < 100 && (
                      <div className="flex justify-between text-red-600">
                        <span>⚠️ Minimum not met:</span>
                        <span>Need ₵100.00 minimum</span>
                      </div>
                    )}
                    <div className="border-t border-gray-200 my-1 pt-1">
                      <div className="flex justify-between font-semibold">
                        <span>Allocation:</span>
                        <span></span>
                      </div>
                      <div className="flex justify-between text-xs pl-2">
                        <span>→ Registration portion:</span>
                        <span>{formatCurrency(registrationPortion)}</span>
                      </div>
                      <div className="flex justify-between text-xs pl-2">
                        <span>→ Tuition portion:</span>
                        <span>{formatCurrency(tuitionPortion)}</span>
                      </div>
                    </div>
                    <div className="flex justify-between font-semibold text-primary-700 border-t border-gray-200 pt-1 mt-1">
                      <span>Outstanding Balance:</span>
                      <span>{formatCurrency(outstandingBalance)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8">
            {step > 1 && (
              <button
                onClick={handleBack}
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Back
              </button>
            )}
            <div className="flex-1" />
            {step < 4 ? (
              <button
                onClick={handleNext}
                disabled={step === 1 && searchMode === 'existing' && !selectedStudent}
                className="px-6 py-2 bg-secondary-500 text-white rounded-lg hover:bg-secondary-600 disabled:opacity-50"
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading || !signatureData || !formData.amount_paid || parseFloat(formData.amount_paid) <= 0 || !isAmountValid()}
                className="px-6 py-2 bg-gradient-to-r from-secondary-500 to-secondary-600 text-white rounded-lg hover:shadow-lg disabled:opacity-50 disabled:bg-gray-400 disabled:from-gray-400 disabled:to-gray-500"
              >
                {loading ? 'Processing...' : 'Complete Registration'}
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default RegisterStudent;