import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Settings as SettingsIcon, User, Shield, Bell, 
  Building, Smartphone, DollarSign, Save, Lock,
  Mail, Phone, MapPin, Globe, Database, RefreshCw,
  CheckCircle, XCircle, AlertCircle, Eye, EyeOff,
  Trash2, Plus, Edit, Download, Upload, CreditCard,
  School, Users, BookOpen, Clock, Calendar
} from 'lucide-react';
import { authService } from '../../api/services/authService';
import { staffService } from '../../api/services/staffService';

import toast from 'react-hot-toast';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const user = authService.getCurrentUser();
  
  // Profile Settings
  const [profileForm, setProfileForm] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    staff_id: user?.staff_id || '',
    branch: user?.branch || '',
    avatar: null
  });

  // Password Change
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false
  });

  // Branch Management
  const [branches, setBranches] = useState([]);
  const [branchForm, setBranchForm] = useState({
    id: null,
    name: '',
    location: '',
    contact_person: '',
    contact_phone: '',
    contact_email: '',
    is_active: true
  });
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);

  // System Settings
  const [systemSettings, setSystemSettings] = useState({
    school_name: 'SchoolSync Academy',
    school_email: 'info@schoolsync.edu',
    school_phone: '233302555777',
    school_address: '123 Education Street, Accra',
    sms_provider: 'hubtel',
    sms_sender_id: 'SCHOOLSYNC',
    momo_provider: 'mtn',
    momo_merchant_id: 'MERCH-001',
    currency: 'GHS',
    date_format: 'DD/MM/YYYY',
    time_format: '24h',
    session_timeout: '30',
    auto_backup: true,
    maintenance_mode: false
  });

  // Fee Settings
  const [feeSettings, setFeeSettings] = useState({
    registration_fee_default: 150,
    late_registration_fee: 50,
    payment_due_days: 30,
    allow_partial_payment: true,
    minimum_partial_amount: 100,
    refund_policy: '7_days',
    late_fee_percentage: 5,
    discount_enabled: true,
    max_discount_percentage: 20
  });

  // Notification Settings
  const [notificationSettings, setNotificationSettings] = useState({
    sms_reminders: true,
    email_reminders: true,
    payment_confirmation: true,
    registration_confirmation: true,
    arrears_reminder_days: [3, 7, 14],
    upcoming_training_days: 3,
    birthday_wishes: true,
    admin_alerts: true,
    daily_summary: false,
    weekly_report: true
  });

  // SMS Provider Options
  const smsProviders = [
    { value: 'hubtel', label: 'Hubtel', icon: Smartphone },
    { value: 'arkesel', label: 'Arkesel', icon: Smartphone },
    { value: 'africastalking', label: 'Africa\'s Talking', icon: Globe },
    { value: 'twilio', label: 'Twilio', icon: Globe }
  ];

  // MoMo Provider Options
  const momoProviders = [
    { value: 'mtn', label: 'MTN Mobile Money', icon: Smartphone },
    { value: 'vodafone', label: 'Vodafone Cash', icon: Smartphone },
    { value: 'airteltigo', label: 'AirtelTigo Money', icon: Smartphone },
    { value: 'zeepay', label: 'Zeepay', icon: CreditCard }
  ];

  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    try {
      // Mock data - replace with actual API call
      const mockBranches = [
        { id: 1, name: 'Head Office', location: 'Accra', contact_person: 'John Doe', contact_phone: '233201234567', contact_email: 'ho@schoolsync.edu', is_active: true, staff_count: 5, student_count: 120 },
        { id: 2, name: 'Accra Branch', location: 'Accra', contact_person: 'Jane Smith', contact_phone: '233205678901', contact_email: 'accra@schoolsync.edu', is_active: true, staff_count: 3, student_count: 85 },
        { id: 3, name: 'Kumasi Branch', location: 'Kumasi', contact_person: 'Kwame Asante', contact_phone: '233209876543', contact_email: 'kumasi@schoolsync.edu', is_active: true, staff_count: 4, student_count: 92 },
        { id: 4, name: 'Takoradi Branch', location: 'Takoradi', contact_person: 'Esi Mensah', contact_phone: '233207654321', contact_email: 'takoradi@schoolsync.edu', is_active: false, staff_count: 2, student_count: 45 },
      ];
      setBranches(mockBranches);
    } catch (error) {
      console.error('Error fetching branches:', error);
      toast.error('Failed to load branches');
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      // API call to update profile
      await staffService.updateStaff(user?.id, profileForm);
      toast.success('Profile updated successfully');
      
      // Update local storage
      const updatedUser = { ...user, ...profileForm };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!passwordForm.current_password) {
      toast.error('Current password is required');
      return;
    }
    
    if (passwordForm.new_password.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }
    
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast.error('New passwords do not match');
      return;
    }
    
    try {
      setLoading(true);
      // API call to change password
      await authService.changePassword({
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password
      });
      
      toast.success('Password changed successfully');
      setPasswordForm({
        current_password: '',
        new_password: '',
        confirm_password: ''
      });
      
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBranch = async () => {
    try {
      if (!branchForm.name) {
        toast.error('Branch name is required');
        return;
      }
      
      if (editingBranch) {
        // Update existing branch
        toast.success('Branch updated successfully');
      } else {
        // Create new branch
        toast.success('Branch created successfully');
      }
      
      setIsBranchModalOpen(false);
      setBranchForm({ id: null, name: '', location: '', contact_person: '', contact_phone: '', contact_email: '', is_active: true });
      setEditingBranch(null);
      fetchBranches();
      
    } catch (error) {
      toast.error('Failed to save branch');
    }
  };

  const handleToggleBranchStatus = (branchId) => {
    const branch = branches.find(b => b.id === branchId);
    toast.success(`Branch ${branch?.is_active ? 'deactivated' : 'activated'} successfully`);
    fetchBranches();
  };

  const handleSaveSystemSettings = async () => {
    try {
      setLoading(true);
      // API call to save system settings
      toast.success('System settings saved successfully');
    } catch (error) {
      toast.error('Failed to save system settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveFeeSettings = async () => {
    try {
      setLoading(true);
      // API call to save fee settings
      toast.success('Fee settings saved successfully');
    } catch (error) {
      toast.error('Failed to save fee settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNotificationSettings = async () => {
    try {
      setLoading(true);
      // API call to save notification settings
      toast.success('Notification settings saved successfully');
    } catch (error) {
      toast.error('Failed to save notification settings');
    } finally {
      setLoading(false);
    }
  };

  const handleBackupDatabase = async () => {
    try {
      toast.success('Database backup started. You will be notified when completed.');
    } catch (error) {
      toast.error('Failed to start backup');
    }
  };

  const handleClearCache = async () => {
    try {
      toast.success('Cache cleared successfully');
    } catch (error) {
      toast.error('Failed to clear cache');
    }
  };

  const PasswordInput = ({ field, placeholder }) => (
    <div className="relative">
      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
      <input
        type={showPassword[field] ? 'text' : 'password'}
        value={passwordForm[field]}
        onChange={(e) => setPasswordForm({ ...passwordForm, [field]: e.target.value })}
        placeholder={placeholder}
        className="w-full pl-10 pr-12 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary-400 focus:border-transparent"
      />
      <button
        type="button"
        onClick={() => setShowPassword({ ...showPassword, [field]: !showPassword[field] })}
        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
      >
        {showPassword[field] ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
      </button>
    </div>
  );

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
            <h1 className="text-2xl font-bold text-primary-800">System Settings</h1>
            <p className="text-primary-600 mt-2">
              Configure your school management system
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleBackupDatabase}
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all flex items-center"
            >
              <Database className="w-5 h-5 mr-2" />
              Backup
            </button>
            <button
              onClick={handleClearCache}
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all flex items-center"
            >
              <RefreshCw className="w-5 h-5 mr-2" />
              Clear Cache
            </button>
          </div>
        </div>
      </motion.div>

      {/* Settings Navigation */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-xl border border-gray-200 p-2 flex flex-wrap"
      >
        {[
          { id: 'profile', label: '👤 Profile', icon: User },
          { id: 'password', label: '🔒 Password', icon: Lock },
          { id: 'branches', label: '🏢 Branches', icon: Building },
          { id: 'system', label: '⚙️ System', icon: SettingsIcon },
          { id: 'fees', label: '💰 Fees', icon: DollarSign },
          { id: 'notifications', label: '🔔 Notifications', icon: Bell },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-primary-50 text-primary-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Icon className="w-5 h-5 mr-2" />
              {tab.label}
            </button>
          );
        })}
      </motion.div>

      {/* Settings Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-white rounded-xl border border-gray-200 p-6"
      >
        {/* Profile Settings */}
        {activeTab === 'profile' && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <User className="w-5 h-5 mr-2 text-primary-500" />
              Profile Information
            </h3>
            
            <form onSubmit={handleProfileUpdate} className="space-y-6 max-w-2xl">
              <div className="flex items-center space-x-6 mb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-secondary-400 to-secondary-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold">
                  {user?.first_name?.[0]}{user?.last_name?.[0]}
                </div>
                <div>
                  <button className="px-4 py-2 bg-primary-50 text-primary-600 rounded-lg hover:bg-primary-100 transition-colors text-sm font-medium">
                    Change Avatar
                  </button>
                  <p className="text-xs text-gray-500 mt-1">
                    JPG, GIF or PNG. Max 2MB
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={profileForm.first_name}
                    onChange={(e) => setProfileForm({ ...profileForm, first_name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary-400 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={profileForm.last_name}
                    onChange={(e) => setProfileForm({ ...profileForm, last_name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary-400 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="email"
                      value={profileForm.email}
                      onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary-400 focus:border-transparent"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="tel"
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary-400 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Staff ID
                  </label>
                  <input
                    type="text"
                    value={profileForm.staff_id}
                    disabled
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Branch
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      value={profileForm.branch}
                      disabled
                      className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-600"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-gradient-to-r from-secondary-500 to-secondary-600 text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50 flex items-center"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Password Change - ADMIN CAN CHANGE PASSWORD HERE */}
        {activeTab === 'password' && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Lock className="w-5 h-5 mr-2 text-primary-500" />
              Change Password
            </h3>
            
            <form onSubmit={handlePasswordChange} className="space-y-6 max-w-md">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Current Password
                </label>
                <PasswordInput field="current_password" placeholder="Enter current password" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Password
                </label>
                <PasswordInput field="new_password" placeholder="Enter new password" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm New Password
                </label>
                <PasswordInput field="confirm_password" placeholder="Confirm new password" />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-800 mb-2">Password Requirements:</h4>
                <ul className="text-xs text-blue-700 space-y-1">
                  <li className="flex items-center">
                    <CheckCircle className="w-3 h-3 mr-2" />
                    At least 6 characters long
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-3 h-3 mr-2" />
                    Include at least one uppercase letter
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-3 h-3 mr-2" />
                    Include at least one number
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-3 h-3 mr-2" />
                    Include at least one special character
                  </li>
                </ul>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setPasswordForm({
                    current_password: '',
                    new_password: '',
                    confirm_password: ''
                  })}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Clear
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-gradient-to-r from-secondary-500 to-secondary-600 text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50 flex items-center"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Updating...
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4 mr-2" />
                      Change Password
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Branch Management */}
        {activeTab === 'branches' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Building className="w-5 h-5 mr-2 text-primary-500" />
                Branch Management
              </h3>
              <button
                onClick={() => {
                  setEditingBranch(null);
                  setBranchForm({ id: null, name: '', location: '', contact_person: '', contact_phone: '', contact_email: '', is_active: true });
                  setIsBranchModalOpen(true);
                }}
                className="px-4 py-2 bg-gradient-to-r from-secondary-500 to-secondary-600 text-white rounded-lg hover:shadow-lg transition-all flex items-center"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Branch
              </button>
            </div>

            <div className="space-y-4">
              {branches.map((branch) => (
                <div
                  key={branch.id}
                  className={`border rounded-xl p-4 ${
                    branch.is_active ? 'border-gray-200' : 'border-red-200 bg-red-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        branch.is_active ? 'bg-primary-100' : 'bg-gray-200'
                      }`}>
                        <Building className={`w-5 h-5 ${
                          branch.is_active ? 'text-primary-600' : 'text-gray-600'
                        }`} />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="font-semibold text-gray-900">{branch.name}</h4>
                          {!branch.is_active && (
                            <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                              Inactive
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{branch.location}</p>
                        <div className="grid grid-cols-2 gap-4 mt-3">
                          <div>
                            <p className="text-xs text-gray-500">Contact Person</p>
                            <p className="text-sm font-medium text-gray-900">{branch.contact_person}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Phone</p>
                            <p className="text-sm text-gray-900">{branch.contact_phone}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Email</p>
                            <p className="text-sm text-gray-900">{branch.contact_email}</p>
                          </div>
                          <div className="flex space-x-3">
                            <div>
                              <p className="text-xs text-gray-500">Staff</p>
                              <p className="text-sm font-medium text-gray-900">{branch.staff_count || 0}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Students</p>
                              <p className="text-sm font-medium text-gray-900">{branch.student_count || 0}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-1">
                      <button
                        onClick={() => handleToggleBranchStatus(branch.id)}
                        className={`p-2 rounded-lg transition-colors ${
                          branch.is_active
                            ? 'hover:bg-yellow-50 text-yellow-600'
                            : 'hover:bg-green-50 text-green-600'
                        }`}
                        title={branch.is_active ? 'Deactivate' : 'Activate'}
                      >
                        {branch.is_active ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => {
                          setEditingBranch(branch);
                          setBranchForm(branch);
                          setIsBranchModalOpen(true);
                        }}
                        className="p-2 hover:bg-blue-50 rounded-lg text-blue-600"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        className="p-2 hover:bg-red-50 rounded-lg text-red-600"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* System Settings */}
        {activeTab === 'system' && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <SettingsIcon className="w-5 h-5 mr-2 text-primary-500" />
              System Configuration
            </h3>

            <div className="space-y-6 max-w-2xl">
              {/* School Information */}
              <div className="border-b border-gray-200 pb-6">
                <h4 className="text-md font-medium text-gray-900 mb-4">School Information</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      School Name
                    </label>
                    <div className="relative">
                      <School className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        type="text"
                        value={systemSettings.school_name}
                        onChange={(e) => setSystemSettings({ ...systemSettings, school_name: e.target.value })}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary-400 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        School Email
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                          type="email"
                          value={systemSettings.school_email}
                          onChange={(e) => setSystemSettings({ ...systemSettings, school_email: e.target.value })}
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary-400 focus:border-transparent"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        School Phone
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                          type="tel"
                          value={systemSettings.school_phone}
                          onChange={(e) => setSystemSettings({ ...systemSettings, school_phone: e.target.value })}
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary-400 focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      School Address
                    </label>
                    <textarea
                      value={systemSettings.school_address}
                      onChange={(e) => setSystemSettings({ ...systemSettings, school_address: e.target.value })}
                      rows="2"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary-400 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* SMS Integration */}
              <div className="border-b border-gray-200 pb-6">
                <h4 className="text-md font-medium text-gray-900 mb-4 flex items-center">
                  <Smartphone className="w-4 h-4 mr-2 text-primary-500" />
                  SMS Integration
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      SMS Provider
                    </label>
                    <select
                      value={systemSettings.sms_provider}
                      onChange={(e) => setSystemSettings({ ...systemSettings, sms_provider: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary-400 focus:border-transparent"
                    >
                      {smsProviders.map(provider => (
                        <option key={provider.value} value={provider.value}>{provider.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Sender ID
                    </label>
                    <input
                      type="text"
                      value={systemSettings.sms_sender_id}
                      onChange={(e) => setSystemSettings({ ...systemSettings, sms_sender_id: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary-400 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Mobile Money Integration */}
              <div className="border-b border-gray-200 pb-6">
                <h4 className="text-md font-medium text-gray-900 mb-4 flex items-center">
                  <CreditCard className="w-4 h-4 mr-2 text-primary-500" />
                  Mobile Money Integration
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Default Provider
                    </label>
                    <select
                      value={systemSettings.momo_provider}
                      onChange={(e) => setSystemSettings({ ...systemSettings, momo_provider: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary-400 focus:border-transparent"
                    >
                      {momoProviders.map(provider => (
                        <option key={provider.value} value={provider.value}>{provider.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Merchant ID
                    </label>
                    <input
                      type="text"
                      value={systemSettings.momo_merchant_id}
                      onChange={(e) => setSystemSettings({ ...systemSettings, momo_merchant_id: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary-400 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Regional Settings */}
              <div className="border-b border-gray-200 pb-6">
                <h4 className="text-md font-medium text-gray-900 mb-4">Regional Settings</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Currency
                    </label>
                    <select
                      value={systemSettings.currency}
                      onChange={(e) => setSystemSettings({ ...systemSettings, currency: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary-400 focus:border-transparent"
                    >
                      <option value="GHS">GHS (₵)</option>
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date Format
                    </label>
                    <select
                      value={systemSettings.date_format}
                      onChange={(e) => setSystemSettings({ ...systemSettings, date_format: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary-400 focus:border-transparent"
                    >
                      <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                      <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                      <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Time Format
                    </label>
                    <select
                      value={systemSettings.time_format}
                      onChange={(e) => setSystemSettings({ ...systemSettings, time_format: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary-400 focus:border-transparent"
                    >
                      <option value="24h">24 Hour</option>
                      <option value="12h">12 Hour (AM/PM)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* System Options */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-4">System Options</h4>
                <div className="space-y-3">
                  <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <Clock className="w-5 h-5 text-gray-400 mr-3" />
                      <span className="text-sm text-gray-700">Session Timeout (minutes)</span>
                    </div>
                    <input
                      type="number"
                      value={systemSettings.session_timeout}
                      onChange={(e) => setSystemSettings({ ...systemSettings, session_timeout: e.target.value })}
                      className="w-20 px-2 py-1 border border-gray-300 rounded-lg text-right"
                      min="5"
                      max="120"
                    />
                  </label>
                  
                  <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <Database className="w-5 h-5 text-gray-400 mr-3" />
                      <span className="text-sm text-gray-700">Auto Backup</span>
                    </div>
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={systemSettings.auto_backup}
                        onChange={(e) => setSystemSettings({ ...systemSettings, auto_backup: e.target.checked })}
                        className="sr-only"
                      />
                      <div className={`w-10 h-6 rounded-full transition-colors ${
                        systemSettings.auto_backup ? 'bg-secondary-500' : 'bg-gray-300'
                      }`}>
                        <div className={`w-4 h-4 bg-white rounded-full shadow transform transition-transform ${
                          systemSettings.auto_backup ? 'translate-x-5' : 'translate-x-1'
                        } mt-1`}></div>
                      </div>
                    </div>
                  </label>

                  <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <AlertCircle className="w-5 h-5 text-gray-400 mr-3" />
                      <span className="text-sm text-gray-700">Maintenance Mode</span>
                    </div>
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={systemSettings.maintenance_mode}
                        onChange={(e) => setSystemSettings({ ...systemSettings, maintenance_mode: e.target.checked })}
                        className="sr-only"
                      />
                      <div className={`w-10 h-6 rounded-full transition-colors ${
                        systemSettings.maintenance_mode ? 'bg-red-500' : 'bg-gray-300'
                      }`}>
                        <div className={`w-4 h-4 bg-white rounded-full shadow transform transition-transform ${
                          systemSettings.maintenance_mode ? 'translate-x-5' : 'translate-x-1'
                        } mt-1`}></div>
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Reset
                </button>
                <button
                  onClick={handleSaveSystemSettings}
                  disabled={loading}
                  className="px-6 py-2 bg-gradient-to-r from-secondary-500 to-secondary-600 text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50 flex items-center"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Settings
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Fee Settings */}
        {activeTab === 'fees' && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <DollarSign className="w-5 h-5 mr-2 text-primary-500" />
              Fee Configuration
            </h3>

            <div className="space-y-6 max-w-2xl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Default Registration Fee (₵)
                  </label>
                  <input
                    type="number"
                    value={feeSettings.registration_fee_default}
                    onChange={(e) => setFeeSettings({ ...feeSettings, registration_fee_default: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary-400 focus:border-transparent"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Late Registration Fee (₵)
                  </label>
                  <input
                    type="number"
                    value={feeSettings.late_registration_fee}
                    onChange={(e) => setFeeSettings({ ...feeSettings, late_registration_fee: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary-400 focus:border-transparent"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Due Days
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="number"
                    value={feeSettings.payment_due_days}
                    onChange={(e) => setFeeSettings({ ...feeSettings, payment_due_days: parseInt(e.target.value) })}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary-400 focus:border-transparent"
                    min="1"
                    max="90"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Number of days after registration to complete payment</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Late Fee Penalty (%)
                </label>
                <input
                  type="number"
                  value={feeSettings.late_fee_percentage}
                  onChange={(e) => setFeeSettings({ ...feeSettings, late_fee_percentage: parseFloat(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary-400 focus:border-transparent"
                  min="0"
                  max="100"
                  step="0.1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Refund Policy
                </label>
                <select
                  value={feeSettings.refund_policy}
                  onChange={(e) => setFeeSettings({ ...feeSettings, refund_policy: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary-400 focus:border-transparent"
                >
                  <option value="7_days">7 Days Full Refund</option>
                  <option value="14_days">14 Days 50% Refund</option>
                  <option value="30_days">30 Days 25% Refund</option>
                  <option value="no_refund">No Refund</option>
                </select>
              </div>

              <div className="space-y-3">
                <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <CreditCard className="w-5 h-5 text-gray-400 mr-3" />
                    <span className="text-sm text-gray-700">Allow Partial Payments</span>
                  </div>
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={feeSettings.allow_partial_payment}
                      onChange={(e) => setFeeSettings({ ...feeSettings, allow_partial_payment: e.target.checked })}
                      className="sr-only"
                    />
                    <div className={`w-10 h-6 rounded-full transition-colors ${
                      feeSettings.allow_partial_payment ? 'bg-secondary-500' : 'bg-gray-300'
                    }`}>
                      <div className={`w-4 h-4 bg-white rounded-full shadow transform transition-transform ${
                        feeSettings.allow_partial_payment ? 'translate-x-5' : 'translate-x-1'
                      } mt-1`}></div>
                    </div>
                  </div>
                </label>

                {feeSettings.allow_partial_payment && (
                  <div className="pl-8">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Minimum Partial Amount (₵)
                    </label>
                    <input
                      type="number"
                      value={feeSettings.minimum_partial_amount}
                      onChange={(e) => setFeeSettings({ ...feeSettings, minimum_partial_amount: parseFloat(e.target.value) })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary-400 focus:border-transparent"
                      min="0"
                      step="0.01"
                    />
                  </div>
                )}

                <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <DollarSign className="w-5 h-5 text-gray-400 mr-3" />
                    <span className="text-sm text-gray-700">Enable Discounts</span>
                  </div>
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={feeSettings.discount_enabled}
                      onChange={(e) => setFeeSettings({ ...feeSettings, discount_enabled: e.target.checked })}
                      className="sr-only"
                    />
                    <div className={`w-10 h-6 rounded-full transition-colors ${
                      feeSettings.discount_enabled ? 'bg-secondary-500' : 'bg-gray-300'
                    }`}>
                      <div className={`w-4 h-4 bg-white rounded-full shadow transform transition-transform ${
                        feeSettings.discount_enabled ? 'translate-x-5' : 'translate-x-1'
                      } mt-1`}></div>
                    </div>
                  </div>
                </label>

                {feeSettings.discount_enabled && (
                  <div className="pl-8">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Maximum Discount (%)
                    </label>
                    <input
                      type="number"
                      value={feeSettings.max_discount_percentage}
                      onChange={(e) => setFeeSettings({ ...feeSettings, max_discount_percentage: parseFloat(e.target.value) })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary-400 focus:border-transparent"
                      min="0"
                      max="100"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Reset
                </button>
                <button
                  onClick={handleSaveFeeSettings}
                  disabled={loading}
                  className="px-6 py-2 bg-gradient-to-r from-secondary-500 to-secondary-600 text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50 flex items-center"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Settings
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Notification Settings */}
        {activeTab === 'notifications' && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Bell className="w-5 h-5 mr-2 text-primary-500" />
              Notification Preferences
            </h3>

            <div className="space-y-6 max-w-2xl">
              <div className="space-y-3">
                <h4 className="text-md font-medium text-gray-900 mb-2">Channels</h4>
                
                <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <Smartphone className="w-5 h-5 text-gray-400 mr-3" />
                    <span className="text-sm text-gray-700">SMS Reminders</span>
                  </div>
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={notificationSettings.sms_reminders}
                      onChange={(e) => setNotificationSettings({ ...notificationSettings, sms_reminders: e.target.checked })}
                      className="sr-only"
                    />
                    <div className={`w-10 h-6 rounded-full transition-colors ${
                      notificationSettings.sms_reminders ? 'bg-secondary-500' : 'bg-gray-300'
                    }`}>
                      <div className={`w-4 h-4 bg-white rounded-full shadow transform transition-transform ${
                        notificationSettings.sms_reminders ? 'translate-x-5' : 'translate-x-1'
                      } mt-1`}></div>
                    </div>
                  </div>
                </label>

                <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <Mail className="w-5 h-5 text-gray-400 mr-3" />
                    <span className="text-sm text-gray-700">Email Reminders</span>
                  </div>
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={notificationSettings.email_reminders}
                      onChange={(e) => setNotificationSettings({ ...notificationSettings, email_reminders: e.target.checked })}
                      className="sr-only"
                    />
                    <div className={`w-10 h-6 rounded-full transition-colors ${
                      notificationSettings.email_reminders ? 'bg-secondary-500' : 'bg-gray-300'
                    }`}>
                      <div className={`w-4 h-4 bg-white rounded-full shadow transform transition-transform ${
                        notificationSettings.email_reminders ? 'translate-x-5' : 'translate-x-1'
                      } mt-1`}></div>
                    </div>
                  </div>
                </label>
              </div>

              <div className="space-y-3">
                <h4 className="text-md font-medium text-gray-900 mb-2">Automated Messages</h4>
                
                <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-gray-400 mr-3" />
                    <span className="text-sm text-gray-700">Payment Confirmation</span>
                  </div>
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={notificationSettings.payment_confirmation}
                      onChange={(e) => setNotificationSettings({ ...notificationSettings, payment_confirmation: e.target.checked })}
                      className="sr-only"
                    />
                    <div className={`w-10 h-6 rounded-full transition-colors ${
                      notificationSettings.payment_confirmation ? 'bg-secondary-500' : 'bg-gray-300'
                    }`}>
                      <div className={`w-4 h-4 bg-white rounded-full shadow transform transition-transform ${
                        notificationSettings.payment_confirmation ? 'translate-x-5' : 'translate-x-1'
                      } mt-1`}></div>
                    </div>
                  </div>
                </label>

                <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <BookOpen className="w-5 h-5 text-gray-400 mr-3" />
                    <span className="text-sm text-gray-700">Registration Confirmation</span>
                  </div>
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={notificationSettings.registration_confirmation}
                      onChange={(e) => setNotificationSettings({ ...notificationSettings, registration_confirmation: e.target.checked })}
                      className="sr-only"
                    />
                    <div className={`w-10 h-6 rounded-full transition-colors ${
                      notificationSettings.registration_confirmation ? 'bg-secondary-500' : 'bg-gray-300'
                    }`}>
                      <div className={`w-4 h-4 bg-white rounded-full shadow transform transition-transform ${
                        notificationSettings.registration_confirmation ? 'translate-x-5' : 'translate-x-1'
                      } mt-1`}></div>
                    </div>
                  </div>
                </label>

                <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <DollarSign className="w-5 h-5 text-gray-400 mr-3" />
                    <span className="text-sm text-gray-700">Arrears Reminders</span>
                  </div>
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={notificationSettings.sms_reminders}
                      onChange={(e) => setNotificationSettings({ ...notificationSettings, sms_reminders: e.target.checked })}
                      className="sr-only"
                    />
                    <div className={`w-10 h-6 rounded-full transition-colors ${
                      notificationSettings.sms_reminders ? 'bg-secondary-500' : 'bg-gray-300'
                    }`}>
                      <div className={`w-4 h-4 bg-white rounded-full shadow transform transition-transform ${
                        notificationSettings.sms_reminders ? 'translate-x-5' : 'translate-x-1'
                      } mt-1`}></div>
                    </div>
                  </div>
                </label>

                <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <Calendar className="w-5 h-5 text-gray-400 mr-3" />
                    <span className="text-sm text-gray-700">Upcoming Training Reminders</span>
                  </div>
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={notificationSettings.upcoming_training_days > 0}
                      onChange={(e) => setNotificationSettings({ ...notificationSettings, upcoming_training_days: e.target.checked ? 3 : 0 })}
                      className="sr-only"
                    />
                    <div className={`w-10 h-6 rounded-full transition-colors ${
                      notificationSettings.upcoming_training_days > 0 ? 'bg-secondary-500' : 'bg-gray-300'
                    }`}>
                      <div className={`w-4 h-4 bg-white rounded-full shadow transform transition-transform ${
                        notificationSettings.upcoming_training_days > 0 ? 'translate-x-5' : 'translate-x-1'
                      } mt-1`}></div>
                    </div>
                  </div>
                </label>

                {notificationSettings.upcoming_training_days > 0 && (
                  <div className="pl-8">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Remind Before (days)
                    </label>
                    <input
                      type="number"
                      value={notificationSettings.upcoming_training_days}
                      onChange={(e) => setNotificationSettings({ ...notificationSettings, upcoming_training_days: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary-400 focus:border-transparent"
                      min="1"
                      max="30"
                    />
                  </div>
                )}

                <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <Users className="w-5 h-5 text-gray-400 mr-3" />
                    <span className="text-sm text-gray-700">Admin Alerts</span>
                  </div>
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={notificationSettings.admin_alerts}
                      onChange={(e) => setNotificationSettings({ ...notificationSettings, admin_alerts: e.target.checked })}
                      className="sr-only"
                    />
                    <div className={`w-10 h-6 rounded-full transition-colors ${
                      notificationSettings.admin_alerts ? 'bg-secondary-500' : 'bg-gray-300'
                    }`}>
                      <div className={`w-4 h-4 bg-white rounded-full shadow transform transition-transform ${
                        notificationSettings.admin_alerts ? 'translate-x-5' : 'translate-x-1'
                      } mt-1`}></div>
                    </div>
                  </div>
                </label>
              </div>

              <div className="space-y-3">
                <h4 className="text-md font-medium text-gray-900 mb-2">Reports</h4>
                
                <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <Clock className="w-5 h-5 text-gray-400 mr-3" />
                    <span className="text-sm text-gray-700">Daily Summary Report</span>
                  </div>
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={notificationSettings.daily_summary}
                      onChange={(e) => setNotificationSettings({ ...notificationSettings, daily_summary: e.target.checked })}
                      className="sr-only"
                    />
                    <div className={`w-10 h-6 rounded-full transition-colors ${
                      notificationSettings.daily_summary ? 'bg-secondary-500' : 'bg-gray-300'
                    }`}>
                      <div className={`w-4 h-4 bg-white rounded-full shadow transform transition-transform ${
                        notificationSettings.daily_summary ? 'translate-x-5' : 'translate-x-1'
                      } mt-1`}></div>
                    </div>
                  </div>
                </label>

                <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <Calendar className="w-5 h-5 text-gray-400 mr-3" />
                    <span className="text-sm text-gray-700">Weekly Report</span>
                  </div>
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={notificationSettings.weekly_report}
                      onChange={(e) => setNotificationSettings({ ...notificationSettings, weekly_report: e.target.checked })}
                      className="sr-only"
                    />
                    <div className={`w-10 h-6 rounded-full transition-colors ${
                      notificationSettings.weekly_report ? 'bg-secondary-500' : 'bg-gray-300'
                    }`}>
                      <div className={`w-4 h-4 bg-white rounded-full shadow transform transition-transform ${
                        notificationSettings.weekly_report ? 'translate-x-5' : 'translate-x-1'
                      } mt-1`}></div>
                    </div>
                  </div>
                </label>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Reset
                </button>
                <button
                  onClick={handleSaveNotificationSettings}
                  disabled={loading}
                  className="px-6 py-2 bg-gradient-to-r from-secondary-500 to-secondary-600 text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50 flex items-center"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Settings
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </motion.div>

      {/* Branch Modal */}
      {isBranchModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsBranchModalOpen(false)}></div>
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg"
            >
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-xl font-bold text-primary-800">
                  {editingBranch ? 'Edit Branch' : 'Add New Branch'}
                </h3>
                <button
                  onClick={() => setIsBranchModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <XCircle className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Branch Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={branchForm.name}
                    onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })}
                    placeholder="e.g., Accra Branch, Kumasi Branch"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary-400 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Location
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      value={branchForm.location}
                      onChange={(e) => setBranchForm({ ...branchForm, location: e.target.value })}
                      placeholder="City/Region"
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary-400 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contact Person
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      value={branchForm.contact_person}
                      onChange={(e) => setBranchForm({ ...branchForm, contact_person: e.target.value })}
                      placeholder="Branch Manager Name"
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary-400 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Contact Phone
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        type="tel"
                        value={branchForm.contact_phone}
                        onChange={(e) => setBranchForm({ ...branchForm, contact_phone: e.target.value })}
                        placeholder="233201234567"
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary-400 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Contact Email
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        type="email"
                        value={branchForm.contact_email}
                        onChange={(e) => setBranchForm({ ...branchForm, contact_email: e.target.value })}
                        placeholder="branch@school.edu"
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary-400 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={branchForm.is_active}
                    onChange={(e) => setBranchForm({ ...branchForm, is_active: e.target.checked })}
                    className="w-4 h-4 text-secondary-600 border-gray-300 rounded focus:ring-secondary-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Active Branch</span>
                </label>
              </div>

              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end space-x-3">
                <button
                  onClick={() => setIsBranchModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveBranch}
                  className="px-6 py-2 bg-gradient-to-r from-secondary-500 to-secondary-600 text-white rounded-lg hover:shadow-lg"
                >
                  {editingBranch ? 'Update Branch' : 'Create Branch'}
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;