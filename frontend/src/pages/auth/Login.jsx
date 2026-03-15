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

  // Background image URL
  const backgroundImageUrl = '/images/loginback.png';
  
  // Logo URL
  const logoUrl = '/images/logo.jpeg';

  return (
    <div 
      className="min-h-screen min-h-screen-ios flex items-center justify-center p-4 md:p-6 lg:p-8 xl:p-4 relative overflow-hidden"
      style={{
        backgroundImage: `url(${backgroundImageUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* Subtle blur overlay - tempered white */}
      <div style={{ backdropFilter: 'blur(4px)' }} className="absolute inset-0 bg-white/10"></div>
      
      {/* Very subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-white/5"></div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm md:max-w-md lg:max-w-2xl xl:max-w-lg relative z-10"
      >
        {/* Login Card - Tablet optimized with larger sizes */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white/65 backdrop-blur-sm rounded-2xl md:rounded-3xl lg:rounded-4xl xl:rounded-3xl border border-white/30 shadow-2xl p-6 md:p-8 lg:p-12 xl:p-8"
        >
          {/* Logo - Larger for tablet */}
          <div className="text-center mb-4 md:mb-6 lg:mb-8 xl:mb-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="w-16 h-16 md:w-20 md:h-20 lg:w-28 lg:h-28 xl:w-24 xl:h-24 mx-auto mb-3 md:mb-4 lg:mb-6 xl:mb-4 rounded-xl md:rounded-2xl lg:rounded-3xl xl:rounded-2xl overflow-hidden shadow-lg bg-white p-2 lg:p-3"
            >
              <img 
                src={logoUrl} 
                alt="Company Logo" 
                className="w-full h-full object-contain"
              />
            </motion.div>
            
            <motion.h1 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-2xl md:text-3xl lg:text-4xl xl:text-3xl font-bold text-orange-600 drop-shadow-sm"
            >
              Fargo Training Center
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-gray-500 mt-1 text-xs md:text-sm lg:text-base xl:text-sm"
            >
              Staff & Admin Portal
            </motion.p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 md:space-y-5 lg:space-y-6 xl:space-y-5">
            {/* Identifier Input - Larger for tablet */}
            <div>
              <label className="block text-xs md:text-sm lg:text-base xl:text-sm font-medium text-gray-600 mb-1 lg:mb-2">
                Email or Staff ID
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 xl:w-5 xl:h-5" />
                <input
                  type="text"
                  name="identifier"
                  value={formData.identifier}
                  onChange={handleChange}
                  placeholder="admin@company.com / STAFF-001"
                  className="w-full pl-9 md:pl-11 lg:pl-14 xl:pl-11 pr-3 py-2 md:py-3 lg:py-4 xl:py-3 bg-white border border-gray-200 rounded-lg md:rounded-xl lg:rounded-2xl xl:rounded-xl text-sm md:text-base lg:text-lg xl:text-base focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                  required
                />
              </div>
            </div>

            {/* Password Input - Larger for tablet */}
            <div>
              <div className="flex items-center justify-between mb-1 lg:mb-2">
                <label className="block text-xs md:text-sm lg:text-base xl:text-sm font-medium text-gray-600">
                  Password
                </label>
                <button
                  type="button"
                  className="text-xs md:text-sm lg:text-base xl:text-sm text-orange-600 hover:text-orange-700 font-medium"
                  onClick={() => navigate('/forgot-password')}
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 xl:w-5 xl:h-5" />
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full pl-9 md:pl-11 lg:pl-14 xl:pl-11 pr-9 py-2 md:py-3 lg:py-4 xl:py-3 bg-white border border-gray-200 rounded-lg md:rounded-xl lg:rounded-2xl xl:rounded-xl text-sm md:text-base lg:text-lg xl:text-base focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={16} className="md:w-5 md:h-5 lg:w-6 lg:h-6 xl:w-5 xl:h-5" /> : <Eye size={16} className="md:w-5 md:h-5 lg:w-6 lg:h-6 xl:w-5 xl:h-5" />}
                </button>
              </div>
            </div>

            {/* Remember Me - Larger for tablet */}
            <div className="flex items-center">
              <label className="flex items-center space-x-2 lg:space-x-3 cursor-pointer">
                <div className="relative">
                  <input
                    type="checkbox"
                    name="rememberMe"
                    checked={formData.rememberMe}
                    onChange={handleChange}
                    className="sr-only"
                  />
                  <div className={`w-4 h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 xl:w-5 xl:h-5 rounded border-2 ${formData.rememberMe ? 'bg-orange-500 border-orange-500' : 'border-gray-300 bg-white'}`}>
                    {formData.rememberMe && (
                      <svg className="w-3 h-3 md:w-4 md:h-4 lg:w-5 lg:h-5 xl:w-4 xl:h-4 text-white mx-auto mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>
                <span className="text-xs md:text-sm lg:text-base xl:text-sm text-gray-600">Remember me</span>
              </label>
            </div>

            {/* Submit Button - Larger for tablet */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={isLoading}
              className="w-full py-2 md:py-3 lg:py-4 xl:py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold rounded-lg md:rounded-xl lg:rounded-2xl xl:rounded-xl text-sm md:text-base lg:text-lg xl:text-base hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="w-4 h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 xl:w-5 xl:h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  <span className="text-sm md:text-base lg:text-lg xl:text-base">Signing in...</span>
                </div>
              ) : (
                'Sign In'
              )}
            </motion.button>
          </form>

          {/* Footer */}
          <p className="text-center text-gray-400 text-xs md:text-sm lg:text-base xl:text-sm mt-4 md:mt-5 lg:mt-6 xl:mt-5">
            © {new Date().getFullYear()} Fargo Training Center. All rights reserved.
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Login;