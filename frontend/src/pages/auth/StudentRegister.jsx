import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { 
  User, Phone, Mail, Calendar, Lock, 
  Eye, EyeOff, ArrowLeft, CheckCircle, AlertCircle,
  Loader, LogIn
} from 'lucide-react';
import toast from 'react-hot-toast';
import { authService } from '../../api/services/authService';
import { studentService } from '../../api/services/studentService';

const StudentRegister = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isFormValid, setIsFormValid] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [emailError, setEmailError] = useState('');
  
  const [formData, setFormData] = useState({
    // Personal Info
    first_name: '',
    last_name: '',
    date_of_birth: '',
    gender: '',
    phone: '',
    email: '',
    
    // Auth Info
    password: '',
    confirm_password: '',
    
    // Terms
    accept_terms: false,
  });

  // Check if form is valid to enable sign up button
  useEffect(() => {
    const requiredFields = [
      'first_name', 'last_name', 'date_of_birth', 
      'gender', 'phone', 'password', 'confirm_password'
    ];
    
    const allRequiredFilled = requiredFields.every(field => formData[field]?.trim() !== '');
    
    const passwordsMatch = formData.password === formData.confirm_password;
    const passwordValid = formData.password.length >= 6;
    const termsAccepted = formData.accept_terms;
    const noErrors = !phoneError && !emailError;
    
    setIsFormValid(allRequiredFilled && passwordsMatch && passwordValid && termsAccepted && noErrors);
  }, [formData, phoneError, emailError]);

  // Check phone existence
  useEffect(() => {
    const checkPhone = async () => {
      if (formData.phone && formData.phone.length === 12) {
        setIsChecking(true);
        try {
          const response = await studentService.checkPhone(formData.phone);
          if (response.data.exists) {
            setPhoneError('This phone number is already registered. Please login instead.');
          } else {
            setPhoneError('');
          }
        } catch (error) {
          console.error('Error checking phone:', error);
        } finally {
          setIsChecking(false);
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
        setIsChecking(true);
        try {
          const response = await studentService.checkEmail(formData.email);
          if (response.data.exists) {
            setEmailError('This email is already registered. Please login instead.');
          } else {
            setEmailError('');
          }
        } catch (error) {
          console.error('Error checking email:', error);
        } finally {
          setIsChecking(false);
        }
      } else {
        setEmailError('');
      }
    };

    const timeoutId = setTimeout(checkEmail, 500);
    return () => clearTimeout(timeoutId);
  }, [formData.email]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Final validation
    if (phoneError || emailError) {
      toast.error('Please fix the errors before proceeding');
      return;
    }
    
    if (formData.password !== formData.confirm_password) {
      toast.error('Passwords do not match');
      return;
    }
    
    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    
    if (!formData.accept_terms) {
      toast.error('Please accept the terms and conditions');
      return;
    }
    
    setIsLoading(true);

    try {
      // Double-check with backend before proceeding
      const phoneCheck = await studentService.checkPhone(formData.phone);
      if (phoneCheck.data.exists) {
        toast.error('This phone number is already registered. Please login.');
        setIsLoading(false);
        return;
      }
      
      if (formData.email) {
        const emailCheck = await studentService.checkEmail(formData.email);
        if (emailCheck.data.exists) {
          toast.error('This email is already registered. Please login.');
          setIsLoading(false);
          return;
        }
      }
      
      // Create student account directly
      const studentData = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        date_of_birth: formData.date_of_birth,
        gender: formData.gender,
        phone: formData.phone,
        email: formData.email || null,
        password: formData.password
      };
      
      console.log('Creating student:', studentData);
      
      // Register student (this will also return token)
      const response = await authService.registerStudent(studentData);
      
      console.log('Registration response:', response.data);
      
      // Store auth data
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      localStorage.setItem('role', 'student');
      localStorage.setItem('user_type', 'student');
      
      toast.success('✅ Account created successfully! Redirecting to dashboard...');
      
      // Navigate directly to student dashboard
      setTimeout(() => {
        navigate('/student/dashboard');
      }, 1500);
      
    } catch (error) {
      console.error('Registration error:', error.response?.data || error);
      const errorMessage = error.response?.data?.error || 'Registration failed. Please try again.';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handlePhoneChange = (e) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 0 && !value.startsWith('233')) {
      value = '233' + value;
    }
    if (value.length > 12) value = value.slice(0, 12);
    setFormData(prev => ({ ...prev, phone: value }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-100 flex items-center justify-center p-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl"
      >
        {/* Back Button */}
        <button
          onClick={() => navigate('/login')}
          className="flex items-center text-primary-600 hover:text-primary-800 mb-6 transition-colors"
        >
          <ArrowLeft size={20} className="mr-2" />
          Back to Login
        </button>

        {/* Registration Card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/80 backdrop-blur-lg rounded-3xl border border-primary-200 shadow-xl p-8"
        >
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-secondary-400 to-secondary-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <User className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-primary-800 to-secondary-600 bg-clip-text text-transparent">
              Create Student Account 🎓
            </h2>
            <p className="text-primary-500 mt-2">
              Sign up to access courses and manage your learning
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personal Information Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-primary-800 border-b border-primary-200 pb-2">
                Personal Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* First Name */}
                <div>
                  <label className="block text-sm font-medium text-primary-700 mb-2">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-primary-400 w-5 h-5" />
                    <input
                      type="text"
                      name="first_name"
                      value={formData.first_name}
                      onChange={handleChange}
                      placeholder="John"
                      className={`w-full pl-12 pr-4 py-3 bg-primary-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary-400 transition-all ${
                        formData.first_name && formData.first_name.trim() !== '' 
                          ? 'border-green-500 bg-green-50' 
                          : 'border-primary-200'
                      }`}
                      required
                    />
                  </div>
                </div>

                {/* Last Name */}
                <div>
                  <label className="block text-sm font-medium text-primary-700 mb-2">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-primary-400 w-5 h-5" />
                    <input
                      type="text"
                      name="last_name"
                      value={formData.last_name}
                      onChange={handleChange}
                      placeholder="Doe"
                      className={`w-full pl-12 pr-4 py-3 bg-primary-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary-400 transition-all ${
                        formData.last_name && formData.last_name.trim() !== '' 
                          ? 'border-green-500 bg-green-50' 
                          : 'border-primary-200'
                      }`}
                      required
                    />
                  </div>
                </div>

                {/* Date of Birth */}
                <div>
                  <label className="block text-sm font-medium text-primary-700 mb-2">
                    Date of Birth <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 transform -translate-y-1/2 text-primary-400 w-5 h-5" />
                    <input
                      type="date"
                      name="date_of_birth"
                      value={formData.date_of_birth}
                      onChange={handleChange}
                      className={`w-full pl-12 pr-4 py-3 bg-primary-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary-400 transition-all ${
                        formData.date_of_birth ? 'border-green-500 bg-green-50' : 'border-primary-200'
                      }`}
                      required
                    />
                  </div>
                </div>

                {/* Gender */}
                <div>
                  <label className="block text-sm font-medium text-primary-700 mb-2">
                    Gender <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 bg-primary-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary-400 transition-all ${
                      formData.gender ? 'border-green-500 bg-green-50' : 'border-primary-200'
                    }`}
                    required
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* Phone with real-time validation */}
                <div>
                  <label className="block text-sm font-medium text-primary-700 mb-2">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 transform -translate-y-1/2 text-primary-400 w-5 h-5" />
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handlePhoneChange}
                      placeholder="233501234567"
                      className={`w-full pl-12 pr-12 py-3 bg-primary-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary-400 transition-all ${
                        phoneError 
                          ? 'border-red-500 bg-red-50' 
                          : formData.phone && formData.phone.length === 12 && !phoneError
                            ? 'border-green-500 bg-green-50' 
                            : 'border-primary-200'
                      }`}
                      required
                    />
                    {isChecking && (
                      <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                        <Loader className="w-5 h-5 text-primary-400 animate-spin" />
                      </div>
                    )}
                  </div>
                  {phoneError ? (
                    <p className="text-xs text-red-500 mt-1 flex items-center">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      {phoneError}
                    </p>
                  ) : (
                    <p className="text-xs text-primary-400 mt-1">
                      Format: 233XXXXXXXXX
                    </p>
                  )}
                </div>

                {/* Email with real-time validation */}
                <div>
                  <label className="block text-sm font-medium text-primary-700 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-primary-400 w-5 h-5" />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="john.doe@example.com"
                      className={`w-full pl-12 pr-12 py-3 bg-primary-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary-400 transition-all ${
                        emailError 
                          ? 'border-red-500 bg-red-50' 
                          : formData.email && !emailError
                            ? 'border-green-500 bg-green-50' 
                            : 'border-primary-200'
                      }`}
                    />
                    {isChecking && formData.email && (
                      <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                        <Loader className="w-5 h-5 text-primary-400 animate-spin" />
                      </div>
                    )}
                  </div>
                  {emailError && (
                    <p className="text-xs text-red-500 mt-1 flex items-center">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      {emailError}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Password Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-primary-800 border-b border-primary-200 pb-2">
                Account Security
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Password */}
                <div>
                  <label className="block text-sm font-medium text-primary-700 mb-2">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-primary-400 w-5 h-5" />
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="••••••••"
                      className={`w-full pl-12 pr-12 py-3 bg-primary-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary-400 transition-all ${
                        formData.password && formData.password.length >= 6 ? 'border-green-500 bg-green-50' : 'border-primary-200'
                      }`}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-primary-400 hover:text-primary-600"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-sm font-medium text-primary-700 mb-2">
                    Confirm Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-primary-400 w-5 h-5" />
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      name="confirm_password"
                      value={formData.confirm_password}
                      onChange={handleChange}
                      placeholder="••••••••"
                      className={`w-full pl-12 pr-12 py-3 bg-primary-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary-400 transition-all ${
                        formData.confirm_password && formData.password === formData.confirm_password
                          ? 'border-green-500 bg-green-50' 
                          : formData.confirm_password && formData.password !== formData.confirm_password
                            ? 'border-red-500 bg-red-50'
                            : 'border-primary-200'
                      }`}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-primary-400 hover:text-primary-600"
                    >
                      {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Terms and Conditions */}
            <div className="space-y-4">
              <label className="flex items-start space-x-3 cursor-pointer">
                <div className="relative mt-1">
                  <input
                    type="checkbox"
                    name="accept_terms"
                    checked={formData.accept_terms}
                    onChange={handleChange}
                    className="sr-only"
                  />
                  <div className={`w-5 h-5 rounded border-2 transition-colors ${
                    formData.accept_terms 
                      ? 'bg-secondary-500 border-secondary-500' 
                      : 'border-primary-300'
                  }`}>
                    {formData.accept_terms && (
                      <svg className="w-4 h-4 text-white mx-auto mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>
                <div>
                  <span className="text-sm text-primary-600">
                    I agree to the{' '}
                    <Link to="/terms" className="text-secondary-500 hover:text-secondary-600 font-medium">
                      Terms and Conditions
                    </Link>
                    {' '}and{' '}
                    <Link to="/privacy" className="text-secondary-500 hover:text-secondary-600 font-medium">
                      Privacy Policy
                    </Link>
                  </span>
                  <p className="text-xs text-primary-400 mt-1">
                    By signing up, you agree to our school policies and fee structure.
                  </p>
                </div>
              </label>
            </div>

            {/* Real-time validation summary */}
            {(phoneError || emailError) && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                <p className="text-xs text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  Please fix the errors above before proceeding.
                </p>
              </div>
            )}

            {/* Submit Button - SIGN UP */}
            <motion.button
              whileHover={isFormValid ? { scale: 1.02 } : {}}
              whileTap={isFormValid ? { scale: 0.98 } : {}}
              type="submit"
              disabled={!isFormValid || isLoading || isChecking}
              className={`w-full py-4 font-semibold rounded-xl transition-all text-lg flex items-center justify-center ${
                isFormValid && !isLoading && !isChecking
                  ? 'bg-gradient-to-r from-secondary-500 to-secondary-600 text-white hover:shadow-lg cursor-pointer'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isLoading ? (
                <>
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin mr-3"></div>
                  Creating Account...
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5 mr-2" />
                  SIGN UP
                </>
              )}
            </motion.button>

            {/* Trust Building Section */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
              <p className="text-sm text-blue-700">
                <span className="font-semibold">🔒 Secure Sign Up</span> • Create account in seconds
              </p>
            </div>

            {/* Already have account */}
            <p className="text-center text-primary-500">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="text-secondary-500 hover:text-secondary-600 font-medium"
              >
                Sign in here
              </button>
            </p>
          </form>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default StudentRegister;