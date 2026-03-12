import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, Eye, EyeOff, School, Phone } from 'lucide-react';
import toast from 'react-hot-toast';
import { authService } from '../../api/services/authService';

const Login = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    identifier: '',
    password: '',
    rememberMe: false,
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.identifier || !formData.password) {
      toast.error('Please enter both identifier and password');
      return;
    }

    setIsLoading(true);

    try {
      const response = await authService.login(formData.identifier, formData.password);
      
      // Save auth data
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      localStorage.setItem('role', response.data.role);
      localStorage.setItem('user_type', response.data.user_type);
      
      // Save to sessionStorage if remember me is checked
      if (formData.rememberMe) {
        sessionStorage.setItem('token', response.data.token);
      }
      
      toast.success(`Welcome back, ${response.data.user.first_name}!`);
      
      // Redirect based on role
      switch(response.data.role) {
        case 'admin':
          navigate('/admin/dashboard');
          break;
        case 'registrar':
        case 'field_agent':
          navigate('/staff/dashboard');
          break;
        default:
          navigate('/dashboard');
      }
      
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Login failed. Please check your credentials.';
      toast.error(errorMessage);
      console.error('Login error:', error);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-100 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Logo & Header */}
        <div className="text-center mb-10">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="w-20 h-20 bg-gradient-to-br from-secondary-400 to-secondary-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg"
          >
            <School className="w-10 h-10 text-white" />
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-4xl font-bold bg-gradient-to-r from-primary-800 to-secondary-600 bg-clip-text text-transparent"
          >
            SchoolSync
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-primary-500 mt-2"
          >
            Staff & Admin Portal
          </motion.p>
        </div>

        {/* Login Card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white/80 backdrop-blur-lg rounded-3xl border border-primary-200 shadow-xl p-8"
        >
          <h2 className="text-2xl font-bold text-center text-primary-900 mb-2">
            Staff Login 👋
          </h2>
          <p className="text-center text-primary-500 mb-8">
            Sign in to manage student registrations
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Identifier Input */}
            <div>
              <label className="block text-sm font-medium text-primary-700 mb-2">
                Email or Staff ID
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-primary-400 w-5 h-5" />
                <input
                  type="text"
                  name="identifier"
                  value={formData.identifier}
                  onChange={handleChange}
                  placeholder="admin@school.edu / STAFF-001"
                  className="w-full pl-12 pr-4 py-3 bg-primary-50 border border-primary-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary-400 focus:border-transparent transition-all"
                  required
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-primary-700">
                  Password
                </label>
                <button
                  type="button"
                  className="text-sm text-secondary-500 hover:text-secondary-600 font-medium"
                  onClick={() => navigate('/forgot-password')}
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-primary-400 w-5 h-5" />
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full pl-12 pr-12 py-3 bg-primary-50 border border-primary-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary-400 focus:border-transparent transition-all"
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

            {/* Remember Me */}
            <div className="flex items-center">
              <label className="flex items-center space-x-3 cursor-pointer">
                <div className="relative">
                  <input
                    type="checkbox"
                    name="rememberMe"
                    checked={formData.rememberMe}
                    onChange={handleChange}
                    className="sr-only"
                  />
                  <div className={`w-5 h-5 rounded border-2 ${formData.rememberMe ? 'bg-secondary-500 border-secondary-500' : 'border-primary-300'}`}>
                    {formData.rememberMe && (
                      <svg className="w-4 h-4 text-white mx-auto mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>
                <span className="text-sm text-primary-600">Remember me</span>
              </label>
            </div>

            {/* Submit Button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-gradient-to-r from-secondary-500 to-secondary-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Signing in...
                </div>
              ) : (
                'Sign In'
              )}
            </motion.button>
          </form>

          {/* Demo Credentials */}
          <div className="mt-8 p-4 bg-primary-50 rounded-xl border border-primary-200">
            <p className="text-sm text-primary-600">
              <span className="font-semibold block mb-2">Demo Credentials:</span>
              <span className="block mb-1">👨‍💼 Admin: admin@school.edu / admin123</span>
              <span className="block">👨‍🏫 Staff: registrar@school.edu / staff123</span>
            </p>
          </div>

          {/* Footer */}
          <p className="text-center text-primary-500 text-sm mt-8">
            © {new Date().getFullYear()} SchoolSync. All rights reserved.
          </p>
        </motion.div>

        {/* Background Elements */}
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ repeat: Infinity, duration: 3 }}
          className="absolute top-1/4 left-1/4 w-64 h-64 bg-gradient-to-r from-secondary-100 to-transparent rounded-full blur-3xl opacity-30"
        />
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 4, delay: 0.5 }}
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-l from-primary-100 to-transparent rounded-full blur-3xl opacity-30"
        />
      </motion.div>
    </div>
  );
};

export default Login;