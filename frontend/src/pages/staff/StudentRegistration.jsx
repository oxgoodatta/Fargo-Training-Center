import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  User, Phone, Mail, Calendar, Lock, 
  ArrowLeft, CheckCircle, AlertCircle, Loader,
  BookOpen, CreditCard, Smartphone, Landmark,
  MapPin, IdCard
} from 'lucide-react';
import { staffService } from '../../api/services/staffService';
import { courseService } from '../../api/services/courseService';
import { studentService } from '../../api/services/studentService';
import { paymentService } from '../../api/services/paymentService';
import { authService } from '../../api/services/authService';
import toast from 'react-hot-toast';

const StudentRegistration = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: Student Info, 2: Course Selection, 3: Payment
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [checkingPhone, setCheckingPhone] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [emailError, setEmailError] = useState('');
  
  const staff = authService.getCurrentUser();
  
  const [formData, setFormData] = useState({
    // Student Info
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
    amount_paid: 0,
    momo_phone: '',
    momo_provider: 'mtn'
  });

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const response = await courseService.getCourses({ active_only: true });
      setCourses(response.data.courses || []);
    } catch (error) {
      console.error('Error fetching courses:', error);
      toast.error('Failed to load courses');
    }
  };

  // Check phone existence
  useEffect(() => {
    const checkPhone = async () => {
      if (formData.phone && formData.phone.length >= 10) {
        setCheckingPhone(true);
        try {
          const response = await studentService.checkPhone(formData.phone);
          if (response.data.exists) {
            setPhoneError('Phone number already registered');
          } else {
            setPhoneError('');
          }
        } catch (error) {
          console.error('Error checking phone:', error);
        } finally {
          setCheckingPhone(false);
        }
      } else {
        setPhoneError('');
      }
    };

    const timeoutId = setTimeout(checkPhone, 500);
    return () => clearTimeout(timeoutId);
  }, [formData.phone]);

  // Check email existence
  useEffect(() => {
    const checkEmail = async () => {
      if (formData.email && formData.email.includes('@')) {
        setCheckingPhone(true);
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
          setCheckingPhone(false);
        }
      } else {
        setEmailError('');
      }
    };

    const timeoutId = setTimeout(checkEmail, 500);
    return () => clearTimeout(timeoutId);
  }, [formData.email]);

  const handleNext = () => {
    if (step === 1) {
      // Validate student info
      if (!formData.first_name || !formData.last_name || !formData.date_of_birth || !formData.gender || !formData.phone) {
        toast.error('Please fill all required fields');
        return;
      }
      if (phoneError || emailError) {
        toast.error('Please fix validation errors');
        return;
      }
    }
    
    if (step === 2) {
      // Validate course selection
      if (!formData.course_id) {
        toast.error('Please select a course');
        return;
      }
    }
    
    setStep(step + 1);
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const handleSubmit = async () => {
    setLoading(true);
    
    try {
      // 1. Create student
      const studentData = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        date_of_birth: formData.date_of_birth,
        gender: formData.gender,
        phone: formData.phone,
        email: formData.email || null,
        password: 'password123' // Default password
      };
      
      const studentRes = await studentService.createStudent(studentData);
      const newStudent = studentRes.data.student;
      
      // 2. Get selected course
      const selectedCourse = courses.find(c => c.id === parseInt(formData.course_id));
      
      // 3. Create registration
      const registrationData = {
        student_id: newStudent.id,
        course_id: selectedCourse.id,
        course_name: selectedCourse.name,
        course_fee: selectedCourse.total_fee,
        branch: formData.branch,
        registration_fee: formData.payment_method === 'cash' ? formData.amount_paid : selectedCourse.registration_fee,
        total_fee: selectedCourse.total_fee,
        registration_date: new Date().toISOString().split('T')[0],
        status: 'active',
        payment_location: formData.payment_location
      };
      
      const regRes = await apiClient.post('/registrations/', registrationData);
      const newRegistration = regRes.data.registration;
      
      // 4. Create payment record
      const paymentRecord = {
        registration_id: newRegistration.id,
        student_id: newStudent.id,
        amount: formData.amount_paid || selectedCourse.registration_fee,
        payment_method: formData.payment_method,
        payment_location: formData.payment_location,
        collected_by_staff_id: staff?.id,
        momo_phone_number: formData.momo_phone || null,
        momo_provider: formData.momo_provider,
        payment_type: 'registration',
        status: 'completed'
      };
      
      await paymentService.createPayment(paymentRecord);
      
      toast.success('Student registered successfully!');
      
      // Optional: Send SMS
      // await notificationService.sendSMS(formData.phone, `Welcome! Your account has been created. Login with phone and password: password123`);
      
      // Reset form or navigate
      navigate('/staff/dashboard');
      
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-100 p-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-primary-600 hover:text-primary-800 mb-4"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back
          </button>
          
          {/* Progress Steps */}
          <div className="flex items-center justify-between mb-8">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  s === step ? 'bg-secondary-500 text-white' : 
                  s < step ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'
                }`}>
                  {s < step ? <CheckCircle className="w-5 h-5" /> : s}
                </div>
                {s < 3 && (
                  <div className={`w-16 h-1 mx-2 ${
                    s < step ? 'bg-green-500' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Main Card */}
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="bg-white rounded-2xl border border-gray-200 shadow-xl p-8"
        >
          <h2 className="text-2xl font-bold text-primary-800 mb-6">
            {step === 1 && 'Student Information'}
            {step === 2 && 'Course Selection'}
            {step === 3 && 'Payment Details'}
          </h2>

          {/* Step 1: Student Info */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">First Name *</label>
                  <input
                    type="text"
                    value={formData.first_name}
                    onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                    className="w-full px-4 py-2 border rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Last Name *</label>
                  <input
                    type="text"
                    value={formData.last_name}
                    onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                    className="w-full px-4 py-2 border rounded-lg"
                    required
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
                    className="w-full px-4 py-2 border rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Gender *</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({...formData, gender: e.target.value})}
                    className="w-full px-4 py-2 border rounded-lg"
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
                    className={`w-full pl-10 pr-4 py-2 border rounded-lg ${
                      phoneError ? 'border-red-500' : formData.phone && !phoneError ? 'border-green-500' : ''
                    }`}
                    placeholder="024XXXXXXX"
                  />
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
                    className={`w-full pl-10 pr-4 py-2 border rounded-lg ${
                      emailError ? 'border-red-500' : formData.email && !emailError ? 'border-green-500' : ''
                    }`}
                    placeholder="student@example.com"
                  />
                </div>
                {emailError && <p className="text-xs text-red-600 mt-1">{emailError}</p>}
              </div>
            </div>
          )}

          {/* Step 2: Course Selection */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Select Course *</label>
                <select
                  value={formData.course_id}
                  onChange={(e) => setFormData({...formData, course_id: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg"
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
                  className="w-full px-4 py-2 border rounded-lg"
                >
                  <option value="Head Office">Head Office</option>
                  <option value="Accra Branch">Accra Branch</option>
                  <option value="Kumasi Branch">Kumasi Branch</option>
                  <option value="Takoradi Branch">Takoradi Branch</option>
                </select>
              </div>
            </div>
          )}

          {/* Step 3: Payment */}
          {step === 3 && selectedCourse && (
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg mb-4">
                <p className="text-sm text-blue-800">Registration Fee: {formatCurrency(selectedCourse.registration_fee)}</p>
                <p className="text-sm text-blue-800">Total Course Fee: {formatCurrency(selectedCourse.total_fee)}</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Payment Method</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setFormData({...formData, payment_method: 'cash'})}
                    className={`p-3 border rounded-lg flex items-center justify-center space-x-2 ${
                      formData.payment_method === 'cash' ? 'border-green-500 bg-green-50' : ''
                    }`}
                  >
                    <Landmark className="w-5 h-5" />
                    <span>Cash</span>
                  </button>
                  <button
                    onClick={() => setFormData({...formData, payment_method: 'momo'})}
                    className={`p-3 border rounded-lg flex items-center justify-center space-x-2 ${
                      formData.payment_method === 'momo' ? 'border-blue-500 bg-blue-50' : ''
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
                        onClick={() => setFormData({...formData, momo_provider: 'mtn'})}
                        className={`p-2 border rounded-lg ${
                          formData.momo_provider === 'mtn' ? 'bg-yellow-50 border-yellow-500' : ''
                        }`}
                      >
                        MTN MoMo
                      </button>
                      <button
                        onClick={() => setFormData({...formData, momo_provider: 'vodafone'})}
                        className={`p-2 border rounded-lg ${
                          formData.momo_provider === 'vodafone' ? 'bg-red-50 border-red-500' : ''
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
                        className="w-full pl-10 pr-4 py-2 border rounded-lg"
                        placeholder="024XXXXXXX"
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium mb-2">Payment Location</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setFormData({...formData, payment_location: 'office'})}
                    className={`p-3 border rounded-lg ${
                      formData.payment_location === 'office' ? 'bg-purple-50 border-purple-500' : ''
                    }`}
                  >
                    Office
                  </button>
                  <button
                    onClick={() => setFormData({...formData, payment_location: 'field'})}
                    className={`p-3 border rounded-lg ${
                      formData.payment_location === 'field' ? 'bg-orange-50 border-orange-500' : ''
                    }`}
                  >
                    Field
                  </button>
                </div>
              </div>

              {formData.payment_method === 'cash' && (
                <div>
                  <label className="block text-sm font-medium mb-2">Amount Paid (₵)</label>
                  <input
                    type="number"
                    value={formData.amount_paid}
                    onChange={(e) => setFormData({...formData, amount_paid: parseFloat(e.target.value)})}
                    max={selectedCourse.registration_fee}
                    className="w-full px-4 py-2 border rounded-lg"
                    placeholder="0.00"
                  />
                  {formData.amount_paid < selectedCourse.registration_fee && formData.amount_paid > 0 && (
                    <p className="text-xs text-yellow-600 mt-1">
                      Outstanding balance: {formatCurrency(selectedCourse.registration_fee - formData.amount_paid)}
                    </p>
                  )}
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
            {step < 3 ? (
              <button
                onClick={handleNext}
                className="px-6 py-2 bg-secondary-500 text-white rounded-lg hover:bg-secondary-600"
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="px-6 py-2 bg-gradient-to-r from-secondary-500 to-secondary-600 text-white rounded-lg hover:shadow-lg disabled:opacity-50"
              >
                {loading ? 'Registering...' : 'Complete Registration'}
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default StudentRegistration;