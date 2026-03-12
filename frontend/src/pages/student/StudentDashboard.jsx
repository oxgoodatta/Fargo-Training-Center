import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  BookOpen, CreditCard, LogOut, User, Settings,
  Lock, Eye, EyeOff, Phone, X, CheckCircle,
  GraduationCap, Menu, Bell
} from 'lucide-react';
import { authService } from '../../api/services/authService';
import apiClient from '../../api/client';
import toast from 'react-hot-toast';

const StudentDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('my-courses');
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [availableCourses, setAvailableCourses] = useState([]);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  
  // Payment states
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [paymentData, setPaymentData] = useState({
    phone: '',
    provider: 'mtn',
    reference: ''
  });
  const [paymentStep, setPaymentStep] = useState('form');
  const [processing, setProcessing] = useState(false);
  
  // Password change states
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    current: '',
    new: '',
    confirm: ''
  });
  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    const user = authService.getCurrentUser();
    if (!user) {
      navigate('/login');
      return;
    }
    setStudent(user);
    loadDashboardData(user.id);
  }, []);

  const loadDashboardData = async (studentId) => {
    try {
      setLoading(true);

      console.log('========== LOADING DASHBOARD DATA ==========');
      console.log('Student ID:', studentId);

      // Get registrations
      const regResponse = await apiClient.get('/registrations/', {
        params: { student_id: studentId }
      });

      const registrationsData = regResponse.data.registrations || [];
      console.log('Registrations received:', registrationsData);
      console.log('Registered course IDs:', registrationsData.map(r => ({ 
        id: r.course_id, 
        name: r.course_name 
      })));

      setRegistrations(registrationsData);

      // Get available courses from backend
      const availableResponse = await apiClient.get(`/courses/available/${studentId}`);
      console.log('Available courses response:', availableResponse.data);
      console.log('Registered IDs from backend:', availableResponse.data.registered_ids);
      console.log('Available courses:', availableResponse.data.available_courses);

      setAvailableCourses(availableResponse.data.available_courses || []);

      console.log('========== LOADING COMPLETE ==========');

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = (course) => {
    setSelectedCourse(course);
    setPaymentStep('form');
    setShowPaymentModal(true);
  };

  const processPayment = async () => {
    if (!paymentData.phone || paymentData.phone.length < 10) {
      toast.error('Please enter a valid phone number');
      return;
    }

    setProcessing(true);
    setPaymentStep('processing');

    try {
      const reference = `MOMO-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      await new Promise(resolve => setTimeout(resolve, 2000));
      setPaymentData({ ...paymentData, reference });
      setPaymentStep('success');
    } catch (error) {
      toast.error('Payment failed. Please try again.');
      setPaymentStep('form');
    } finally {
      setProcessing(false);
    }
  };

  const completeRegistration = async () => {
    if (!selectedCourse || !student) return;

    try {
      // First create the registration
      const registrationData = {
        student_id: student.id,
        course_id: selectedCourse.id,
        course_name: selectedCourse.name,
        course_fee: selectedCourse.total_fee,
        branch: 'Head Office',
        registration_fee: selectedCourse.registration_fee,
        total_fee: selectedCourse.total_fee,
        registration_date: new Date().toISOString().split('T')[0],
        status: 'active',
        payment_location: 'office',
      };

      // Add payment info if available
      if (paymentData.reference) {
        registrationData.payment_reference = paymentData.reference;
      }
      
      if (paymentData.phone) {
        registrationData.payment_phone = paymentData.phone;
      }

      console.log('Sending registration data:', registrationData);
      
      // Create registration
      const regResponse = await apiClient.post('/registrations/', registrationData);
      const newRegistration = regResponse.data.registration;
      
      // NOW create a payment record in FeePayment table
      const paymentRecord = {
        registration_id: newRegistration.id,
        student_id: student.id,
        amount: selectedCourse.registration_fee,
        payment_method: 'momo',
        payment_location: 'office',
        collected_by_staff_id: null, // Online payments have no staff
        momo_phone_number: paymentData.phone,
        momo_transaction_id: paymentData.reference,
        payment_type: 'registration',
        status: 'completed',
        payment_date: new Date().toISOString().split('T')[0]
      };
      
      console.log('Creating payment record:', paymentRecord);
      await apiClient.post('/payments/', paymentRecord);
      
      toast.success('Registration and payment completed successfully!');
      setShowPaymentModal(false);
      
      // Reset payment data
      setPaymentData({
        phone: '',
        provider: 'mtn',
        reference: ''
      });
      
      // Reload data to refresh both tabs
      loadDashboardData(student.id);
      
    } catch (error) {
      console.error('Registration error:', error.response?.data || error);
      toast.error(error.response?.data?.error || 'Failed to complete registration');
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    
    if (passwordData.new !== passwordData.confirm) {
      toast.error('New passwords do not match');
      return;
    }
    
    if (passwordData.new.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    
    setChangingPassword(true);
    
    try {
      await apiClient.post('/auth/change-password', {
        current_password: passwordData.current,
        new_password: passwordData.new
      });
      
      toast.success('Password changed successfully');
      setShowPasswordModal(false);
      setPasswordData({ current: '', new: '', confirm: '' });
      
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleLogout = () => {
    authService.clearAuth();
    navigate('/login');
    toast.success('Logged out successfully');
  };

  const formatCurrency = (amount) => {
    return `₵${parseFloat(amount || 0).toFixed(2)}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-secondary-200 border-t-secondary-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="lg:hidden p-2 mr-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <Menu className="w-5 h-5" />
              </button>
              <GraduationCap className="w-8 h-8 text-secondary-500 mr-3" />
              <h1 className="text-xl font-bold text-primary-800">Student Portal</h1>
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowPasswordModal(true)}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                title="Change Password"
              >
                <Settings className="w-5 h-5" />
              </button>
              <button
                onClick={handleLogout}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-secondary-500 to-secondary-600 rounded-full flex items-center justify-center text-white font-semibold">
                  {student?.first_name?.[0]}{student?.last_name?.[0]}
                </div>
                <div className="hidden md:block">
                  <p className="text-sm font-medium text-gray-900">
                    {student?.first_name} {student?.last_name}
                  </p>
                  <p className="text-xs text-gray-500">ID: {student?.student_id}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      {showMobileMenu && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowMobileMenu(false)} />
          <div className="fixed left-0 top-0 bottom-0 w-64 bg-white shadow-xl">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-r from-secondary-500 to-secondary-600 rounded-full flex items-center justify-center text-white font-semibold">
                  {student?.first_name?.[0]}{student?.last_name?.[0]}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{student?.first_name}</p>
                  <p className="text-xs text-gray-500">Student</p>
                </div>
              </div>

              <nav className="space-y-2">
                <button
                  onClick={() => {
                    setActiveTab('my-courses');
                    setShowMobileMenu(false);
                  }}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg ${
                    activeTab === 'my-courses' ? 'bg-secondary-50 text-secondary-600' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <BookOpen className="w-5 h-5" />
                  <span>My Courses</span>
                </button>
                <button
                  onClick={() => {
                    setActiveTab('available');
                    setShowMobileMenu(false);
                  }}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg ${
                    activeTab === 'available' ? 'bg-secondary-50 text-secondary-600' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <GraduationCap className="w-5 h-5" />
                  <span>Available Courses</span>
                </button>
                <button
                  onClick={() => {
                    setShowPasswordModal(true);
                    setShowMobileMenu(false);
                  }}
                  className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  <Settings className="w-5 h-5" />
                  <span>Settings</span>
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50"
                >
                  <LogOut className="w-5 h-5" />
                  <span>Logout</span>
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Banner */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-secondary-500 to-secondary-600 rounded-2xl p-6 mb-8 text-white"
        >
          <h2 className="text-2xl font-bold mb-2">
            Welcome back, {student?.first_name}! 👋
          </h2>
          <p className="text-secondary-100">
            Student ID: {student?.student_id}
          </p>
        </motion.div>

        {/* Simple Stats */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-sm text-gray-500">My Courses</p>
            <p className="text-2xl font-bold text-gray-900">{registrations.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Available</p>
            <p className="text-2xl font-bold text-gray-900">{availableCourses.length}</p>
          </div>
        </div>

        {/* Tab Navigation - Simple */}
        <div className="bg-white rounded-xl border border-gray-200 p-1 flex mb-6">
          <button
            onClick={() => setActiveTab('my-courses')}
            className={`flex-1 py-3 rounded-lg font-medium transition-all ${
              activeTab === 'my-courses'
                ? 'bg-secondary-500 text-white'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            My Courses ({registrations.length})
          </button>
          <button
            onClick={() => setActiveTab('available')}
            className={`flex-1 py-3 rounded-lg font-medium transition-all ${
              activeTab === 'available'
                ? 'bg-secondary-500 text-white'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            Available ({availableCourses.length})
          </button>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          {/* My Courses Tab */}
          {activeTab === 'my-courses' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">My Courses</h3>
              {registrations.length > 0 ? (
                <div className="space-y-4">
                  {registrations.map((reg, index) => (
                    <div key={reg.id || index} className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 mb-2">{reg.course_name}</h4>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-gray-500">Reg Fee</p>
                          <p className="font-medium">{formatCurrency(reg.registration_fee)}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Total</p>
                          <p className="font-medium">{formatCurrency(reg.total_fee)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <BookOpen className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500">No courses yet</p>
                </div>
              )}
            </div>
          )}

          {/* Available Courses Tab */}
          {activeTab === 'available' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Available Courses</h3>
              {availableCourses.length > 0 ? (
                <div className="space-y-4">
                  {availableCourses.map((course) => (
                    <div key={course.id} className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 mb-2">{course.name}</h4>
                      <p className="text-sm text-gray-600 mb-3">{course.description}</p>
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div>
                          <p className="text-xs text-gray-500">Registration</p>
                          <p className="font-medium text-secondary-600">{formatCurrency(course.registration_fee)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Tuition</p>
                          <p className="font-medium">{formatCurrency(course.tuition_fee)}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handlePayment(course)}
                        className="w-full py-2 bg-secondary-500 text-white rounded-lg hover:bg-secondary-600"
                      >
                        Register Now
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <GraduationCap className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500">No courses available</p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Payment Modal */}
      {showPaymentModal && selectedCourse && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50" onClick={() => setShowPaymentModal(false)} />
            <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6">
              {paymentStep === 'form' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-bold">Complete Payment</h3>
                  <div className="bg-primary-50 rounded-lg p-3">
                    <p className="font-medium">{selectedCourse.name}</p>
                    <p className="text-xl font-bold text-secondary-600 mt-2">
                      {formatCurrency(selectedCourse.registration_fee)}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setPaymentData({ ...paymentData, provider: 'mtn' })}
                      className={`p-3 border rounded-lg ${paymentData.provider === 'mtn' ? 'border-yellow-500 bg-yellow-50' : ''}`}
                    >
                      MTN MoMo
                    </button>
                    <button
                      onClick={() => setPaymentData({ ...paymentData, provider: 'vodafone' })}
                      className={`p-3 border rounded-lg ${paymentData.provider === 'vodafone' ? 'border-red-500 bg-red-50' : ''}`}
                    >
                      Telecel
                    </button>
                  </div>

                  <div>
                    <input
                      type="tel"
                      value={paymentData.phone}
                      onChange={(e) => setPaymentData({ ...paymentData, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                      placeholder="Phone number"
                      className="w-full p-3 border rounded-lg"
                    />
                  </div>

                  <div className="flex space-x-3">
                    <button
                      onClick={() => setShowPaymentModal(false)}
                      className="flex-1 py-2 border rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={processPayment}
                      disabled={!paymentData.phone || paymentData.phone.length < 10}
                      className="flex-1 py-2 bg-secondary-500 text-white rounded-lg disabled:opacity-50"
                    >
                      Pay
                    </button>
                  </div>
                </div>
              )}

              {paymentStep === 'processing' && (
                <div className="text-center py-8">
                  <div className="w-12 h-12 border-4 border-secondary-200 border-t-secondary-600 rounded-full animate-spin mx-auto mb-4"></div>
                  <p>Processing...</p>
                </div>
              )}

              {paymentStep === 'success' && (
                <div className="text-center py-4">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                  <h3 className="text-lg font-bold mb-4">Payment Successful!</h3>
                  <button
                    onClick={completeRegistration}
                    className="w-full py-2 bg-secondary-500 text-white rounded-lg"
                  >
                    Complete Registration
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50" onClick={() => setShowPasswordModal(false)} />
            <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6">
              <h3 className="text-lg font-bold mb-4">Change Password</h3>
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <input
                  type={showPassword.current ? 'text' : 'password'}
                  value={passwordData.current}
                  onChange={(e) => setPasswordData({ ...passwordData, current: e.target.value })}
                  placeholder="Current password"
                  className="w-full p-3 border rounded-lg"
                  required
                />
                <input
                  type={showPassword.new ? 'text' : 'password'}
                  value={passwordData.new}
                  onChange={(e) => setPasswordData({ ...passwordData, new: e.target.value })}
                  placeholder="New password"
                  className="w-full p-3 border rounded-lg"
                  required
                  minLength="6"
                />
                <input
                  type={showPassword.confirm ? 'text' : 'password'}
                  value={passwordData.confirm}
                  onChange={(e) => setPasswordData({ ...passwordData, confirm: e.target.value })}
                  placeholder="Confirm password"
                  className="w-full p-3 border rounded-lg"
                  required
                />
                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowPasswordModal(false)}
                    className="flex-1 py-2 border rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={changingPassword}
                    className="flex-1 py-2 bg-secondary-500 text-white rounded-lg"
                  >
                    {changingPassword ? 'Changing...' : 'Change'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentDashboard;