import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Bell, Send, MessageSquare, Phone, Users, 
  Clock, CheckCircle, XCircle, AlertCircle, 
  TrendingUp, Calendar, Filter, Download,
  Smartphone, Mail, Settings, Plus, Trash2,
  Edit, Eye, RefreshCw, DollarSign, BookOpen
} from 'lucide-react';
import { notificationService } from '../../api/services/notificationService';
import { studentService } from '../../api/services/studentService';
import { registrationService } from '../../api/services/registrationService';
import toast from 'react-hot-toast';

const Notifications = () => {
  const [activeTab, setActiveTab] = useState('compose');
  const [notifications, setNotifications] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  
  // Compose form state
  const [composeForm, setComposeForm] = useState({
    recipients: 'all', // all, arrears, upcoming, custom
    customRecipients: [],
    course_id: '',
    branch: '',
    messageType: 'sms',
    template: '',
    subject: '',
    message: '',
    schedule: null,
    isScheduled: false,
    scheduledDate: '',
    scheduledTime: ''
  });

  // Template form state
  const [templateForm, setTemplateForm] = useState({
    name: '',
    subject: '',
    message: '',
    type: 'sms'
  });
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);

  // SMS Credits state
  const [smsCredits, setSmsCredits] = useState({
    balance: 1250,
    used: 3450,
    total: 5000,
    expiryDate: '2026-12-31'
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchNotifications(),
        fetchTemplates(),
        fetchStudents(),
        fetchRegistrationsWithArrears()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      const response = await notificationService.getNotifications({ per_page: 50 });
      setNotifications(response.data.notifications || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const fetchTemplates = async () => {
    try {
      const response = await notificationService.getTemplates();
      setTemplates(response.data.templates || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const fetchStudents = async () => {
    try {
      const response = await studentService.getStudents({ active_only: true, per_page: 1000 });
      setStudents(response.data.students || []);
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const fetchRegistrationsWithArrears = async () => {
    try {
      const response = await registrationService.getRegistrations({ 
        outstanding: true,
        per_page: 500 
      });
      setRegistrations(response.data.registrations || []);
    } catch (error) {
      console.error('Error fetching registrations with arrears:', error);
    }
  };

  const handleSendNotification = async () => {
    try {
      setLoading(true);
      
      // Validate
      if (!composeForm.message.trim()) {
        toast.error('Message content is required');
        return;
      }

      let recipientList = [];
      
      // Build recipient list based on selection
      if (composeForm.recipients === 'all') {
        recipientList = students.map(s => s.phone);
      } else if (composeForm.recipients === 'arrears') {
        recipientList = registrations
          .filter(r => r.outstanding_balance > 0)
          .map(r => r.student_phone)
          .filter(Boolean);
      } else if (composeForm.recipients === 'upcoming') {
        // Students with upcoming training
        const upcoming = registrations.filter(r => {
          const regDate = new Date(r.registration_date);
          const now = new Date();
          const daysDiff = Math.ceil((regDate - now) / (1000 * 60 * 60 * 24));
          return daysDiff <= 7 && daysDiff >= 0;
        });
        recipientList = upcoming.map(r => r.student_phone).filter(Boolean);
      }

      if (recipientList.length === 0) {
        toast.error('No recipients found');
        return;
      }

      const notificationData = {
        type: composeForm.messageType,
        recipients: recipientList,
        subject: composeForm.subject,
        message: composeForm.message,
        scheduled_at: composeForm.isScheduled 
          ? `${composeForm.scheduledDate} ${composeForm.scheduledTime}`
          : null
      };

      const response = await notificationService.sendNotification(notificationData);
      
      toast.success(`✅ SMS sent to ${response.data.sent_count} recipients`);
      
      // Reset form
      setComposeForm({
        recipients: 'all',
        customRecipients: [],
        course_id: '',
        branch: '',
        messageType: 'sms',
        template: '',
        subject: '',
        message: '',
        schedule: null,
        isScheduled: false,
        scheduledDate: '',
        scheduledTime: ''
      });
      
      fetchNotifications();
      
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to send notification');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTemplate = async () => {
    try {
      if (!templateForm.name || !templateForm.message) {
        toast.error('Template name and message are required');
        return;
      }

      if (editingTemplate) {
        await notificationService.updateTemplate(editingTemplate.id, templateForm);
        toast.success('Template updated successfully');
      } else {
        await notificationService.createTemplate(templateForm);
        toast.success('Template created successfully');
      }

      setIsTemplateModalOpen(false);
      setTemplateForm({ name: '', subject: '', message: '', type: 'sms' });
      setEditingTemplate(null);
      fetchTemplates();
      
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to save template');
    }
  };

  const handleDeleteTemplate = async (templateId) => {
    if (!window.confirm('Are you sure you want to delete this template?')) return;
    
    try {
      await notificationService.deleteTemplate(templateId);
      toast.success('Template deleted successfully');
      fetchTemplates();
    } catch (error) {
      toast.error('Failed to delete template');
    }
  };

  const handleUseTemplate = (template) => {
    setComposeForm({
      ...composeForm,
      subject: template.subject || '',
      message: template.message,
      messageType: template.type || 'sms'
    });
    toast.success(`Template "${template.name}" applied`);
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'sent':
        return { color: 'bg-green-100 text-green-700', icon: CheckCircle, label: 'Sent' };
      case 'delivered':
        return { color: 'bg-blue-100 text-blue-700', icon: CheckCircle, label: 'Delivered' };
      case 'pending':
        return { color: 'bg-yellow-100 text-yellow-700', icon: Clock, label: 'Pending' };
      case 'failed':
        return { color: 'bg-red-100 text-red-700', icon: XCircle, label: 'Failed' };
      case 'scheduled':
        return { color: 'bg-purple-100 text-purple-700', icon: Calendar, label: 'Scheduled' };
      default:
        return { color: 'bg-gray-100 text-gray-700', icon: AlertCircle, label: status };
    }
  };

  const formatDateTime = (dateTime) => {
    return new Date(dateTime).toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Students with arrears count
  const arrearsCount = registrations.filter(r => r.outstanding_balance > 0).length;
  
  // Students with upcoming training
  const upcomingCount = registrations.filter(r => {
    const regDate = new Date(r.registration_date);
    const now = new Date();
    const daysDiff = Math.ceil((regDate - now) / (1000 * 60 * 60 * 24));
    return daysDiff <= 7 && daysDiff >= 0;
  }).length;

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
            <h1 className="text-2xl font-bold text-primary-800">Notifications & SMS</h1>
            <p className="text-primary-600 mt-2">
              Send automated reminders for arrears and upcoming training programs
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="bg-blue-50 px-4 py-2 rounded-xl flex items-center">
              <Smartphone className="w-5 h-5 text-blue-600 mr-2" />
              <div>
                <p className="text-xs text-blue-600">SMS Credits</p>
                <p className="text-lg font-bold text-blue-700">{smsCredits.balance.toLocaleString()}</p>
              </div>
            </div>
            <button className="p-2 hover:bg-gray-100 rounded-lg">
              <RefreshCw className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>
      </motion.div>

      {/* SMS Credit Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-4 gap-6"
      >
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Credits</p>
              <p className="text-2xl font-bold mt-2 text-gray-900">{smsCredits.total.toLocaleString()}</p>
            </div>
            <div className="bg-primary-100 p-3 rounded-lg">
              <Smartphone className="w-6 h-6 text-primary-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Used</p>
              <p className="text-2xl font-bold mt-2 text-gray-900">{smsCredits.used.toLocaleString()}</p>
            </div>
            <div className="bg-yellow-100 p-3 rounded-lg">
              <Send className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Remaining</p>
              <p className="text-2xl font-bold mt-2 text-green-600">{smsCredits.balance.toLocaleString()}</p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Expiry Date</p>
              <p className="text-lg font-bold mt-2 text-gray-900">
                {new Date(smsCredits.expiryDate).toLocaleDateString()}
              </p>
            </div>
            <div className="bg-purple-100 p-3 rounded-lg">
              <Calendar className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Reminder Summary Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="grid grid-cols-1 md:grid-cols-2 gap-6"
      >
        <div className="bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-2xl p-6 text-white">
          <div className="flex items-start justify-between">
            <div>
              <div className="bg-white/20 p-3 rounded-lg w-fit mb-4">
                <DollarSign className="w-6 h-6" />
              </div>
              <p className="text-yellow-100 text-sm">Outstanding Arrears</p>
              <p className="text-3xl font-bold mt-1">{arrearsCount} Students</p>
              <p className="text-yellow-100 text-sm mt-2">
                Total Outstanding: ₵{registrations.reduce((sum, r) => sum + (r.outstanding_balance || 0), 0).toFixed(2)}
              </p>
              <button
                onClick={() => setComposeForm({ ...composeForm, recipients: 'arrears' })}
                className="mt-4 px-4 py-2 bg-white text-yellow-700 rounded-lg hover:bg-yellow-50 transition-colors text-sm font-medium flex items-center"
              >
                <Send className="w-4 h-4 mr-2" />
                Send Payment Reminders
              </button>
            </div>
            <div className="bg-white/10 p-4 rounded-full">
              <AlertCircle className="w-12 h-12" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl p-6 text-white">
          <div className="flex items-start justify-between">
            <div>
              <div className="bg-white/20 p-3 rounded-lg w-fit mb-4">
                <Calendar className="w-6 h-6" />
              </div>
              <p className="text-blue-100 text-sm">Upcoming Training</p>
              <p className="text-3xl font-bold mt-1">{upcomingCount} Students</p>
              <p className="text-blue-100 text-sm mt-2">
                Starting within the next 7 days
              </p>
              <button
                onClick={() => setComposeForm({ ...composeForm, recipients: 'upcoming' })}
                className="mt-4 px-4 py-2 bg-white text-blue-700 rounded-lg hover:bg-blue-50 transition-colors text-sm font-medium flex items-center"
              >
                <Send className="w-4 h-4 mr-2" />
                Send Reminders
              </button>
            </div>
            <div className="bg-white/10 p-4 rounded-full">
              <BookOpen className="w-12 h-12" />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Main Content Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-xl border border-gray-200 overflow-hidden"
      >
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('compose')}
            className={`flex-1 px-6 py-4 text-sm font-medium ${
              activeTab === 'compose'
                ? 'text-secondary-600 border-b-2 border-secondary-500 bg-secondary-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <Send className="w-4 h-4 inline mr-2" />
            Compose Message
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`flex-1 px-6 py-4 text-sm font-medium ${
              activeTab === 'templates'
                ? 'text-secondary-600 border-b-2 border-secondary-500 bg-secondary-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <MessageSquare className="w-4 h-4 inline mr-2" />
            Templates
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 px-6 py-4 text-sm font-medium ${
              activeTab === 'history'
                ? 'text-secondary-600 border-b-2 border-secondary-500 bg-secondary-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <Clock className="w-4 h-4 inline mr-2" />
            History
          </button>
        </div>

        <div className="p-6">
          {/* Compose Tab */}
          {activeTab === 'compose' && (
            <div className="space-y-6">
              {/* Recipients Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Recipients
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <button
                    onClick={() => setComposeForm({ ...composeForm, recipients: 'all' })}
                    className={`p-4 border rounded-xl text-left transition-all ${
                      composeForm.recipients === 'all'
                        ? 'border-secondary-500 bg-secondary-50 ring-2 ring-secondary-200'
                        : 'border-gray-200 hover:border-secondary-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center mb-2">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mr-3 ${
                        composeForm.recipients === 'all' ? 'bg-secondary-500' : 'bg-gray-100'
                      }`}>
                        <Users className={`w-4 h-4 ${
                          composeForm.recipients === 'all' ? 'text-white' : 'text-gray-600'
                        }`} />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">All Students</p>
                        <p className="text-xs text-gray-500">{students.length} recipients</p>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => setComposeForm({ ...composeForm, recipients: 'arrears' })}
                    className={`p-4 border rounded-xl text-left transition-all ${
                      composeForm.recipients === 'arrears'
                        ? 'border-secondary-500 bg-secondary-50 ring-2 ring-secondary-200'
                        : 'border-gray-200 hover:border-secondary-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center mb-2">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mr-3 ${
                        composeForm.recipients === 'arrears' ? 'bg-secondary-500' : 'bg-gray-100'
                      }`}>
                        <DollarSign className={`w-4 h-4 ${
                          composeForm.recipients === 'arrears' ? 'text-white' : 'text-gray-600'
                        }`} />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Outstanding Arrears</p>
                        <p className="text-xs text-gray-500">{arrearsCount} recipients</p>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => setComposeForm({ ...composeForm, recipients: 'upcoming' })}
                    className={`p-4 border rounded-xl text-left transition-all ${
                      composeForm.recipients === 'upcoming'
                        ? 'border-secondary-500 bg-secondary-50 ring-2 ring-secondary-200'
                        : 'border-gray-200 hover:border-secondary-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center mb-2">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mr-3 ${
                        composeForm.recipients === 'upcoming' ? 'bg-secondary-500' : 'bg-gray-100'
                      }`}>
                        <Calendar className={`w-4 h-4 ${
                          composeForm.recipients === 'upcoming' ? 'text-white' : 'text-gray-600'
                        }`} />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Upcoming Training</p>
                        <p className="text-xs text-gray-500">{upcomingCount} recipients</p>
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Message Type & Template */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Message Type
                  </label>
                  <select
                    value={composeForm.messageType}
                    onChange={(e) => setComposeForm({ ...composeForm, messageType: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary-400 focus:border-transparent"
                  >
                    <option value="sms">SMS (Text Message)</option>
                    <option value="email">Email</option>
                    <option value="both">SMS + Email</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Use Template
                  </label>
                  <div className="flex">
                    <select
                      value={composeForm.template}
                      onChange={(e) => {
                        const template = templates.find(t => t.id.toString() === e.target.value);
                        if (template) handleUseTemplate(template);
                      }}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-secondary-400 focus:border-transparent"
                    >
                      <option value="">Select a template...</option>
                      {templates.map(template => (
                        <option key={template.id} value={template.id}>{template.name}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => {
                        setEditingTemplate(null);
                        setTemplateForm({ name: '', subject: '', message: '', type: 'sms' });
                        setIsTemplateModalOpen(true);
                      }}
                      className="px-4 py-2 bg-primary-50 text-primary-600 border border-l-0 border-gray-300 rounded-r-lg hover:bg-primary-100"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Subject (for email) */}
              {(composeForm.messageType === 'email' || composeForm.messageType === 'both') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={composeForm.subject}
                    onChange={(e) => setComposeForm({ ...composeForm, subject: e.target.value })}
                    placeholder="Enter email subject..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary-400 focus:border-transparent"
                  />
                </div>
              )}

              {/* Message Content */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={composeForm.message}
                  onChange={(e) => setComposeForm({ ...composeForm, message: e.target.value })}
                  rows="6"
                  placeholder="Type your message here... Use {{name}} for student name, {{amount}} for arrears amount, {{course}} for course name"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary-400 focus:border-transparent"
                />
                <div className="flex justify-between mt-2">
                  <p className="text-xs text-gray-500">
                    Characters: {composeForm.message.length} | SMS credits: {Math.ceil(composeForm.message.length / 160)}
                  </p>
                  <p className="text-xs text-gray-500">
                    Available variables: {'{{name}}'} {'{{amount}}'} {'{{course}}'} {'{{date}}'}
                  </p>
                </div>
              </div>

              {/* Schedule Options */}
              <div>
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={composeForm.isScheduled}
                    onChange={(e) => setComposeForm({ ...composeForm, isScheduled: e.target.checked })}
                    className="w-4 h-4 text-secondary-600 border-gray-300 rounded focus:ring-secondary-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Schedule for later</span>
                </label>

                {composeForm.isScheduled && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Date
                      </label>
                      <input
                        type="date"
                        value={composeForm.scheduledDate}
                        onChange={(e) => setComposeForm({ ...composeForm, scheduledDate: e.target.value })}
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary-400 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Time
                      </label>
                      <input
                        type="time"
                        value={composeForm.scheduledTime}
                        onChange={(e) => setComposeForm({ ...composeForm, scheduledTime: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary-400 focus:border-transparent"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Send Button */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    setComposeForm({
                      recipients: 'all',
                      customRecipients: [],
                      course_id: '',
                      branch: '',
                      messageType: 'sms',
                      template: '',
                      subject: '',
                      message: '',
                      schedule: null,
                      isScheduled: false,
                      scheduledDate: '',
                      scheduledTime: ''
                    });
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Clear
                </button>
                <button
                  onClick={handleSendNotification}
                  disabled={loading || !composeForm.message.trim()}
                  className="px-6 py-2 bg-gradient-to-r from-secondary-500 to-secondary-600 text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      {composeForm.isScheduled ? 'Schedule Message' : 'Send Now'}
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Templates Tab */}
          {activeTab === 'templates' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Message Templates</h3>
                <button
                  onClick={() => {
                    setEditingTemplate(null);
                    setTemplateForm({ name: '', subject: '', message: '', type: 'sms' });
                    setIsTemplateModalOpen(true);
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-secondary-500 to-secondary-600 text-white rounded-lg hover:shadow-lg transition-all flex items-center"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Template
                </button>
              </div>

              {templates.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {templates.map((template) => (
                    <div
                      key={template.id}
                      className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-all"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-semibold text-gray-900">{template.name}</h4>
                          <span className="text-xs bg-primary-100 text-primary-700 px-2 py-1 rounded-full mt-1 inline-block">
                            {template.type === 'sms' ? 'SMS' : 'Email'}
                          </span>
                        </div>
                        <div className="flex space-x-1">
                          <button
                            onClick={() => handleUseTemplate(template)}
                            className="p-2 hover:bg-blue-50 rounded-lg text-blue-600"
                            title="Use Template"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingTemplate(template);
                              setTemplateForm({
                                name: template.name,
                                subject: template.subject || '',
                                message: template.message,
                                type: template.type || 'sms'
                              });
                              setIsTemplateModalOpen(true);
                            }}
                            className="p-2 hover:bg-yellow-50 rounded-lg text-yellow-600"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteTemplate(template.id)}
                            className="p-2 hover:bg-red-50 rounded-lg text-red-600"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      {template.subject && (
                        <p className="text-xs text-gray-500 mb-1">
                          <span className="font-medium">Subject:</span> {template.subject}
                        </p>
                      )}
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {template.message}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <MessageSquare className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                  <p className="font-medium">No templates yet</p>
                  <p className="text-sm mt-1">Create your first message template</p>
                  <button
                    onClick={() => {
                      setEditingTemplate(null);
                      setTemplateForm({ name: '', subject: '', message: '', type: 'sms' });
                      setIsTemplateModalOpen(true);
                    }}
                    className="mt-4 px-4 py-2 bg-gradient-to-r from-secondary-500 to-secondary-600 text-white rounded-lg hover:shadow-lg transition-all inline-flex items-center"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Template
                  </button>
                </div>
              )}
            </div>
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Notification History</h3>
              
              {notifications.length > 0 ? (
                <div className="space-y-4">
                  {notifications.map((notification) => {
                    const StatusBadge = getStatusBadge(notification.status);
                    const StatusIcon = StatusBadge.icon;
                    
                    return (
                      <div
                        key={notification.id}
                        className="border border-gray-200 rounded-xl p-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3">
                            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                              {notification.type === 'sms' ? (
                                <Smartphone className="w-5 h-5 text-primary-600" />
                              ) : (
                                <Mail className="w-5 h-5 text-primary-600" />
                              )}
                            </div>
                            <div>
                              <div className="flex items-center space-x-2">
                                <p className="font-medium text-gray-900">
                                  {notification.subject || 'SMS Message'}
                                </p>
                                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${StatusBadge.color}`}>
                                  <StatusIcon className="w-3 h-3 inline mr-1" />
                                  {StatusBadge.label}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                              <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                                <span className="flex items-center">
                                  <Users className="w-3 h-3 mr-1" />
                                  {notification.recipient_count || 0} recipients
                                </span>
                                <span className="flex items-center">
                                  <Clock className="w-3 h-3 mr-1" />
                                  {formatDateTime(notification.created_at)}
                                </span>
                                {notification.scheduled_at && (
                                  <span className="flex items-center text-purple-600">
                                    <Calendar className="w-3 h-3 mr-1" />
                                    Scheduled: {formatDateTime(notification.scheduled_at)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <button className="p-2 hover:bg-gray-200 rounded-lg">
                            <Eye className="w-4 h-4 text-gray-600" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <Bell className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                  <p className="font-medium">No notifications sent yet</p>
                  <p className="text-sm mt-1">Your sent messages will appear here</p>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>

      {/* Template Modal */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsTemplateModalOpen(false)}></div>
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl"
            >
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-xl font-bold text-primary-800">
                  {editingTemplate ? 'Edit Template' : 'Create New Template'}
                </h3>
                <button
                  onClick={() => setIsTemplateModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <XCircle className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Template Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={templateForm.name}
                    onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                    placeholder="e.g., Payment Reminder, Welcome Message"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary-400 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Template Type
                  </label>
                  <select
                    value={templateForm.type}
                    onChange={(e) => setTemplateForm({ ...templateForm, type: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary-400 focus:border-transparent"
                  >
                    <option value="sms">SMS</option>
                    <option value="email">Email</option>
                  </select>
                </div>

                {templateForm.type === 'email' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Subject
                    </label>
                    <input
                      type="text"
                      value={templateForm.subject}
                      onChange={(e) => setTemplateForm({ ...templateForm, subject: e.target.value })}
                      placeholder="Email subject line"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary-400 focus:border-transparent"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Message <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={templateForm.message}
                    onChange={(e) => setTemplateForm({ ...templateForm, message: e.target.value })}
                    rows="6"
                    placeholder="Write your template message here..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary-400 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Variables: {'{{name}}'} {'{{amount}}'} {'{{course}}'} {'{{date}}'} {'{{branch}}'}
                  </p>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end space-x-3">
                <button
                  onClick={() => setIsTemplateModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveTemplate}
                  className="px-6 py-2 bg-gradient-to-r from-secondary-500 to-secondary-600 text-white rounded-lg hover:shadow-lg"
                >
                  {editingTemplate ? 'Update Template' : 'Save Template'}
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Notifications;