import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  BookOpen, Search, Download, Eye,
  Calendar, MapPin, User, CreditCard, DollarSign,
  CheckCircle, XCircle, Clock, Printer,
  AlertCircle, FileText, UserCog, Filter, X
} from 'lucide-react';
import { registrationService } from '../../api/services/registrationService';
import { courseService } from '../../api/services/courseService';
import toast from 'react-hot-toast';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";

const Registrations = () => {
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedCourse, setSelectedCourse] = useState('all');
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  
  // Set default date range to last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const [dateRange, setDateRange] = useState({
    startDate: thirtyDaysAgo,  // Last 30 days
    endDate: new Date()         // Today
  });
  
  const [courses, setCourses] = useState([]);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchRegistrations(),
        fetchCourses()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRegistrations = async () => {
    try {
      const response = await registrationService.getRegistrations({
        per_page: 100
      });
      setRegistrations(response.data.registrations || []);
      console.log('Total registrations:', response.data.registrations?.length);
    } catch (error) {
      console.error('Error fetching registrations:', error);
      toast.error('Failed to load registrations');
    }
  };

  const fetchCourses = async () => {
    try {
      const response = await courseService.getCourses({ active_only: true });
      setCourses(response.data.courses || []);
    } catch (error) {
      console.error('Error fetching courses:', error);
    }
  };

  const handleViewMonthlyReport = async () => {
    try {
      setReportLoading(true);
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      const monthName = now.toLocaleString('default', { month: 'long' });
      
      const response = await registrationService.getMonthlyRegistrations(year, month);
      
      if (response.data.registrations?.length === 0) {
        toast.error(`No registrations found for ${monthName} ${year}`);
        setReportLoading(false);
        return;
      }
      
      setReportData({
        ...response.data,
        monthName,
        year,
        month
      });
      setShowReportModal(true);
    } catch (error) {
      console.error('Error fetching monthly report:', error);
      toast.error('Failed to load monthly report');
    } finally {
      setReportLoading(false);
    }
  };

 const handleDownloadCSV = async () => {
  try {
    setDownloading(true);
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const monthName = now.toLocaleString('default', { month: 'long' });
    
    // First, fetch the data to show count
    const previewResponse = await registrationService.getMonthlyRegistrations(year, month);
    const count = previewResponse.data.registrations?.length || 0;
    
    if (count === 0) {
      toast.error(`No registrations found for ${monthName} ${year}`);
      setDownloading(false);
      return;
    }
    
    // Confirm download with user
    if (window.confirm(`Found ${count} registrations for ${monthName} ${year}. Download CSV report?`)) {
      // Then download with export=true parameter
      const response = await registrationService.getMonthlyRegistrations(year, month, { export: true });
      
      // Create CSV file from the blob response
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'text/csv' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `registrations-${year}-${month}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url); // Clean up
      
      toast.success(`${count} registrations downloaded successfully!`);
    }
  } catch (error) {
    console.error('Export error:', error);
    // Handle error properly - check if it's a blob error response
    if (error.response && error.response.data instanceof Blob) {
      // Try to read the error message from blob
      const errorText = await error.response.data.text();
      try {
        const errorJson = JSON.parse(errorText);
        toast.error(errorJson.error || 'Failed to export report');
      } catch {
        toast.error('Failed to export report');
      }
    } else {
      toast.error(error.response?.data?.error || 'Failed to export report');
    }
  } finally {
    setDownloading(false);
  }
};

 const handlePrintRegistration = async (registrationId) => {
  try {
    // Show loading toast
    const loadingToast = toast.loading('Generating registration form...');
    
    // Get the HTML from backend (same as StaffDashboard)
    const response = await registrationService.getPrintableRegistration(registrationId);
    
    // Dismiss loading toast
    toast.dismiss(loadingToast);
    
    // Open a new window
    const printWindow = window.open('', '_blank');
    printWindow.document.write(response.data);
    printWindow.document.close();
    
    // Wait for all images to load before showing print dialog
    setTimeout(() => {
      // Check if there are any images
      const images = printWindow.document.getElementsByTagName('img');
      
      if (images.length === 0) {
        // No images, print immediately
        printWindow.print();
      } else {
        // Wait for images to load
        let loadedCount = 0;
        for (let img of images) {
          if (img.complete) {
            loadedCount++;
          } else {
            img.onload = () => {
              loadedCount++;
              if (loadedCount === images.length) {
                // All images loaded, now print
                printWindow.print();
              }
            };
          }
        }
        
        // If all images already loaded, print now
        if (loadedCount === images.length) {
          printWindow.print();
        }
      }
    }, 500); // Small delay to ensure DOM is ready
    
  } catch (error) {
    console.error('Print error:', error);
    toast.dismiss(); // Dismiss any existing toasts
    toast.error('Failed to generate printable form');
    
    // Fallback to simple format if backend fails
    try {
      // First try to get the registration data for fallback
      const reg = registrations.find(r => r.id === registrationId);
      if (reg) {
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
          <html>
            <head>
              <title>Registration Form - ${reg.registration_number}</title>
              <style>
                body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
                h1 { color: #1e3a5f; text-align: center; border-bottom: 2px solid #f97316; padding-bottom: 10px; }
                h2 { color: #1e3a5f; margin-top: 30px; font-size: 18px; border-left: 4px solid #f97316; padding-left: 10px; }
                .header { text-align: center; margin-bottom: 30px; }
                .reg-number { font-size: 24px; font-weight: bold; color: #f97316; }
                .date { color: #666; margin-top: 5px; }
                .info-row { display: flex; margin-bottom: 10px; }
                .info-label { font-weight: bold; width: 150px; color: #555; }
                .info-value { flex: 1; }
                table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                th { background: #1e3a5f; color: white; padding: 10px; text-align: left; }
                td { padding: 10px; border-bottom: 1px solid #ddd; }
                .signature { margin-top: 50px; display: flex; justify-content: space-between; }
                .signature-line { border-top: 1px solid #333; width: 200px; text-align: center; padding-top: 5px; }
                .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #999; }
              </style>
            </head>
            <body>
              <div class="header">
                <h1>STUDENT REGISTRATION FORM</h1>
                <div class="reg-number">${reg.registration_number || ''}</div>
                <div class="date">Registration Date: ${new Date(reg.registration_date).toLocaleDateString()}</div>
                <div class="date">Print Date: ${new Date().toLocaleDateString()}</div>
                ${reg.processed_by_staff?.name ? `<div class="date">Registered By: ${reg.processed_by_staff.name}</div>` : ''}
              </div>
              
              <div>
                <h2>STUDENT INFORMATION</h2>
                <div class="info-row">
                  <span class="info-label">Student ID:</span>
                  <span class="info-value">${reg.student_id || ''}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Full Name:</span>
                  <span class="info-value">${reg.student_name || ''}</span>
                </div>
              </div>
              
              <div>
                <h2>COURSE INFORMATION</h2>
                <div class="info-row">
                  <span class="info-label">Course:</span>
                  <span class="info-value">${reg.course_name || ''}</span>
                </div>
                ${reg.course_duration ? `
                <div class="info-row">
                  <span class="info-label">Duration:</span>
                  <span class="info-value">${reg.course_duration}</span>
                </div>` : ''}
                <div class="info-row">
                  <span class="info-label">Branch:</span>
                  <span class="info-value">${reg.branch || ''}</span>
                </div>
              </div>
              
              <div>
                <h2>FEE SUMMARY</h2>
                <table>
                  <tr>
                    <th>Description</th>
                    <th>Amount (₵)</th>
                  </tr>
                  <tr>
                    <td>Registration Fee</td>
                    <td>${formatCurrency(reg.registration_fee || 0)}</td>
                  </tr>
                  <tr>
                    <td>Tuition Paid</td>
                    <td>${formatCurrency((reg.tuition_fee_paid || 0))}</td>
                  </tr>
                  <tr>
                    <td><strong>Total Fee</strong></td>
                    <td><strong>${formatCurrency(reg.total_fee || 0)}</strong></td>
                  </tr>
                  <tr>
                    <td>Outstanding Balance</td>
                    <td>${formatCurrency(reg.outstanding_balance || 0)}</td>
                  </tr>
                </table>
              </div>
              
              <div class="signature">
                <div class="signature-line">Student Signature</div>
                <div class="signature-line">Registrar Signature</div>
              </div>
              
              <div class="footer">
                <p>This is an official registration document from SchoolSync</p>
                <p>Generated on ${new Date().toLocaleString()}</p>
              </div>
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    } catch (fallbackError) {
      console.error('Fallback print error:', fallbackError);
      toast.error('Failed to generate printable form');
    }
  }
};

  const getStatusBadge = (status) => {
    switch(status) {
      case 'active':
        return { color: 'bg-green-100 text-green-700', icon: CheckCircle, label: 'Active' };
      case 'completed':
        return { color: 'bg-blue-100 text-blue-700', icon: CheckCircle, label: 'Completed' };
      case 'cancelled':
        return { color: 'bg-red-100 text-red-700', icon: XCircle, label: 'Cancelled' };
      case 'pending':
        return { color: 'bg-yellow-100 text-yellow-700', icon: Clock, label: 'Pending' };
      default:
        return { color: 'bg-gray-100 text-gray-700', icon: AlertCircle, label: status };
    }
  };

  const getPaymentLocationBadge = (location) => {
    return location === 'office' 
      ? { color: 'bg-purple-100 text-purple-700', label: 'Office' }
      : { color: 'bg-orange-100 text-orange-700', label: 'Field' };
  };

  const formatCurrency = (amount) => {
    return `₵${parseFloat(amount || 0).toFixed(2)}`;
  };

  // Filter registrations
  const filteredRegistrations = registrations.filter(reg => {
    const studentName = reg.student_name?.toLowerCase() || '';
    const regNumber = reg.registration_number?.toLowerCase() || '';
    const courseName = reg.course_name?.toLowerCase() || '';
    const staffName = reg.processed_by_staff?.name?.toLowerCase() || '';
    const searchLower = searchTerm.toLowerCase();

    const matchesSearch = 
      studentName.includes(searchLower) ||
      regNumber.includes(searchLower) ||
      courseName.includes(searchLower) ||
      staffName.includes(searchLower) ||
      reg.branch?.toLowerCase().includes(searchLower);

    const matchesBranch = selectedBranch === 'all' || reg.branch === selectedBranch;
    const matchesStatus = selectedStatus === 'all' || reg.status === selectedStatus;
    const matchesCourse = selectedCourse === 'all' || reg.course_id?.toString() === selectedCourse;

    // Date filter - show all if no dates selected
    let matchesDate = true;
    if (dateRange.startDate && dateRange.endDate && reg.registration_date) {
      const regDate = new Date(reg.registration_date);
      matchesDate = regDate >= dateRange.startDate && regDate <= dateRange.endDate;
    } else if (dateRange.startDate && reg.registration_date) {
      const regDate = new Date(reg.registration_date);
      matchesDate = regDate >= dateRange.startDate;
    } else if (dateRange.endDate && reg.registration_date) {
      const regDate = new Date(reg.registration_date);
      matchesDate = regDate <= dateRange.endDate;
    }

    return matchesSearch && matchesBranch && matchesStatus && matchesCourse && matchesDate;
  });

  // Get unique branches and courses for filters
  const branches = ['all', ...new Set(registrations.map(r => r.branch).filter(Boolean))];

  return (
    <div className="space-y-4 md:space-y-5 lg:space-y-4 xl:space-y-5">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-lg md:rounded-xl border border-gray-200 p-4 md:p-5"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-lg md:text-xl font-bold text-primary-800">Registration Management</h1>
            <p className="text-xs md:text-sm text-primary-600 mt-1">
              Total Registrations: {filteredRegistrations.length}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleViewMonthlyReport}
              disabled={reportLoading}
              className="px-3 md:px-4 py-1.5 md:py-2 bg-primary-50 text-primary-700 border border-primary-200 rounded-lg text-xs md:text-sm hover:bg-primary-100 transition-all flex items-center disabled:opacity-50"
            >
              <FileText className="w-4 h-4 mr-1.5" />
              {reportLoading ? 'Loading...' : 'View Report'}
            </button>
            <button
              onClick={handleDownloadCSV}
              disabled={downloading}
              className="px-3 md:px-4 py-1.5 md:py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-xs md:text-sm hover:bg-gray-50 transition-all flex items-center disabled:opacity-50"
            >
              <Download className="w-4 h-4 mr-1.5" />
              {downloading ? 'Processing...' : 'Download CSV'}
            </button>
          </div>
        </div>
      </motion.div>

      {/* Mobile Filter Toggle */}
      <div className="lg:hidden">
        <button
          onClick={() => setShowMobileFilters(!showMobileFilters)}
          className="w-full flex items-center justify-between bg-white rounded-lg border border-gray-200 p-3"
        >
          <div className="flex items-center">
            <Filter className="w-4 h-4 mr-2 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Filters</span>
          </div>
          {showMobileFilters ? (
            <X className="w-4 h-4 text-gray-500" />
          ) : (
            <span className="text-xs text-gray-500">Tap to expand</span>
          )}
        </button>
      </div>

      {/* Filters - Clean Layout */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className={`bg-white rounded-lg md:rounded-xl border border-gray-200 p-4 ${
          showMobileFilters ? 'block' : 'hidden lg:block'
        }`}
      >
        <div className="space-y-3">
          {/* First Row: Search + Clear Button */}
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by student, reg number, course..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary-400 focus:border-transparent"
              />
            </div>
            <button
              onClick={() => {
                setSelectedBranch('all');
                setSelectedStatus('all');
                setSelectedCourse('all');
                setSearchTerm('');
                const newThirtyDaysAgo = new Date();
                newThirtyDaysAgo.setDate(newThirtyDaysAgo.getDate() - 30);
                setDateRange({
                  startDate: newThirtyDaysAgo,
                  endDate: new Date()
                });
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600 text-sm whitespace-nowrap"
            >
              Clear All
            </button>
          </div>

          {/* Second Row: All Filter Options */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Date Range */}
            <div className="flex items-center space-x-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
              <Calendar className="text-gray-400 w-4 h-4" />
              <DatePicker
                selected={dateRange.startDate}
                onChange={(date) => setDateRange({ ...dateRange, startDate: date })}
                selectsStart
                startDate={dateRange.startDate}
                endDate={dateRange.endDate}
                className="w-20 bg-transparent border-none text-sm focus:ring-0"
                placeholderText="Start"
              />
              <span className="text-gray-400 text-sm">-</span>
              <DatePicker
                selected={dateRange.endDate}
                onChange={(date) => setDateRange({ ...dateRange, endDate: date })}
                selectsEnd
                startDate={dateRange.startDate}
                endDate={dateRange.endDate}
                minDate={dateRange.startDate}
                className="w-20 bg-transparent border-none text-sm focus:ring-0"
                placeholderText="End"
              />
            </div>

            {/* Branch Filter */}
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-secondary-400 bg-white min-w-[120px]"
            >
              <option value="all">All Branches</option>
              {branches.filter(b => b !== 'all').map(branch => (
                <option key={branch} value={branch}>{branch}</option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-secondary-400 bg-white min-w-[120px]"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="pending">Pending</option>
            </select>

            {/* Course Filter */}
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-secondary-400 bg-white min-w-[150px]"
            >
              <option value="all">All Courses</option>
              {courses.map(course => (
                <option key={course.id} value={course.id}>{course.name}</option>
              ))}
            </select>
          </div>
        </div>
      </motion.div>

      {/* Registrations Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-10 h-10 border-3 border-secondary-200 border-t-secondary-600 rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="bg-white rounded-lg md:rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px]">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Reg. Number</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Student</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Course</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Branch</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Location</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Registered By</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Fees</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredRegistrations.length > 0 ? (
                    filteredRegistrations.map((reg) => {
                      const StatusBadge = getStatusBadge(reg.status);
                      const StatusIcon = StatusBadge.icon;
                      const LocationBadge = getPaymentLocationBadge(reg.payment_location);
                      return (
                        <tr key={reg.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <span className="font-mono text-xs font-medium text-primary-600">
                              {reg.registration_number}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center">
                              <div className="w-7 h-7 bg-primary-100 rounded-full flex items-center justify-center mr-2 flex-shrink-0">
                                <User className="w-3.5 h-3.5 text-primary-600" />
                              </div>
                              <div className="min-w-0">
                                <div className="text-sm font-medium text-gray-900 truncate max-w-[120px]">
                                  {reg.student_name}
                                </div>
                                <div className="text-xs text-gray-500 truncate">ID: {reg.student_id}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm font-medium text-gray-900 truncate max-w-[120px]">
                              {reg.course_name}
                            </div>
                            {reg.course_duration && (
                              <div className="text-xs text-gray-500">{reg.course_duration}</div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-600">
                            {new Date(reg.registration_date).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-600">{reg.branch}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${LocationBadge.color}`}>
                              {LocationBadge.label}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {reg.processed_by_staff ? (
                              <div className="flex items-center">
                                <UserCog className="w-3.5 h-3.5 mr-1 text-gray-500 flex-shrink-0" />
                                <div className="min-w-0">
                                  <div className="text-xs font-medium text-gray-900 truncate max-w-[100px]">
                                    {reg.processed_by_staff.name}
                                  </div>
                                  <div className="text-xs text-gray-500 capitalize truncate">
                                    {reg.processed_by_staff.role}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">Online</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-xs">
                              <div className="text-gray-900 font-medium">{formatCurrency(reg.total_fee)}</div>
                              <div className="text-gray-500">
                                Paid: {formatCurrency((reg.registration_fee || 0) + (reg.tuition_fee_paid || 0))}
                              </div>
                              {reg.outstanding_balance > 0 && (
                                <div className="text-red-600">
                                  Due: {formatCurrency(reg.outstanding_balance)}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center">
                              <StatusIcon className={`w-3.5 h-3.5 mr-1 ${StatusBadge.color.split(' ')[1]}`} />
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${StatusBadge.color}`}>
                                {StatusBadge.label}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => handlePrintRegistration(reg.id)}
                              className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-600"
                              title="Print Registration Form"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="10" className="px-4 py-12 text-center text-gray-500">
                        <BookOpen className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                        <p className="text-sm">No registrations found</p>
                        <p className="text-xs mt-1">Try adjusting your filters</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </motion.div>

      {/* Summary */}
      {filteredRegistrations.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-lg border border-gray-200 p-3 flex items-center justify-between"
        >
          <div className="text-xs text-gray-600">
            Showing <span className="font-medium">{filteredRegistrations.length}</span> registrations
          </div>
        </motion.div>
      )}

      {/* Monthly Report Modal */}
      {showReportModal && reportData && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          {/* ... modal content (unchanged) ... */}
        </div>
      )}
    </div>
  );
};

export default Registrations;