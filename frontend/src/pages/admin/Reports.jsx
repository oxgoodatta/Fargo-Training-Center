import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart3, Download, Calendar, TrendingUp, Users, 
  BookOpen, CreditCard, DollarSign, MapPin, Printer,
  FileText, PieChart, ArrowDownToLine, Filter,
  ChevronDown, ChevronUp, School, GraduationCap,
  Award, Clock, CheckCircle, AlertCircle
} from 'lucide-react';
import { registrationService } from '../../api/services/registrationService';
import { paymentService } from '../../api/services/paymentService';
import { studentService } from '../../api/services/studentService';
import { courseService } from '../../api/services/courseService';
import toast from 'react-hot-toast';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";

const Reports = () => {
  const [activeTab, setActiveTab] = useState('monthly');
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [selectedCourse, setSelectedCourse] = useState('all');
  const [loading, setLoading] = useState(false);
  
  // Report data
  const [monthlyRegistrations, setMonthlyRegistrations] = useState([]);
  const [monthlySummary, setMonthlySummary] = useState(null);
  const [revenueData, setRevenueData] = useState([]);
  const [branchStats, setBranchStats] = useState([]);
  const [courseStats, setCourseStats] = useState([]);
  const [staffPerformance, setStaffPerformance] = useState([]);
  const [courses, setCourses] = useState([]);
  const [branches, setBranches] = useState([]);

  // Date range for custom reports
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    endDate: new Date()
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (activeTab === 'monthly') {
      fetchMonthlyReport();
    } else if (activeTab === 'revenue') {
      fetchRevenueReport();
    } else if (activeTab === 'branches') {
      fetchBranchReport();
    } else if (activeTab === 'courses') {
      fetchCourseReport();
    } else if (activeTab === 'staff') {
      fetchStaffPerformance();
    }
  }, [activeTab, selectedMonth, selectedYear, selectedBranch, selectedCourse, dateRange]);

  const fetchInitialData = async () => {
    try {
      const [coursesRes, registrationsRes] = await Promise.all([
        courseService.getCourses({ active_only: true, per_page: 100 }),
        registrationService.getRegistrations({ per_page: 1000 })
      ]);
      
      setCourses(coursesRes.data.courses || []);
      
      // Extract unique branches
      const branches = [...new Set(registrationsRes.data.registrations?.map(r => r.branch).filter(Boolean))];
      setBranches(branches);
    } catch (error) {
      console.error('Error fetching initial data:', error);
    }
  };

  const fetchMonthlyReport = async () => {
    try {
      setLoading(true);
      const month = selectedMonth.getMonth() + 1;
      const year = selectedMonth.getFullYear();
      
      const response = await registrationService.getMonthlyRegistrations(year, month, {
        branch: selectedBranch !== 'all' ? selectedBranch : undefined,
        course_id: selectedCourse !== 'all' ? selectedCourse : undefined
      });
      
      setMonthlyRegistrations(response.data.registrations || []);
      setMonthlySummary(response.data.summary || {});
    } catch (error) {
      console.error('Error fetching monthly report:', error);
      toast.error('Failed to load monthly report');
    } finally {
      setLoading(false);
    }
  };

  const fetchRevenueReport = async () => {
    try {
      setLoading(true);
      const response = await paymentService.getPaymentSummary({
        start_date: dateRange.startDate,
        end_date: dateRange.endDate,
        branch: selectedBranch !== 'all' ? selectedBranch : undefined
      });
      
      setRevenueData(response.data.daily_breakdown || []);
    } catch (error) {
      console.error('Error fetching revenue report:', error);
      toast.error('Failed to load revenue report');
    } finally {
      setLoading(false);
    }
  };

  const fetchBranchReport = async () => {
    try {
      setLoading(true);
      const response = await registrationService.getBranchSummary({
        start_date: dateRange.startDate,
        end_date: dateRange.endDate
      });
      
      setBranchStats(response.data.branches || []);
    } catch (error) {
      console.error('Error fetching branch report:', error);
      toast.error('Failed to load branch report');
    } finally {
      setLoading(false);
    }
  };

  const fetchCourseReport = async () => {
    try {
      setLoading(true);
      const response = await registrationService.getCourseStatistics({
        start_date: dateRange.startDate,
        end_date: dateRange.endDate,
        branch: selectedBranch !== 'all' ? selectedBranch : undefined
      });
      
      setCourseStats(response.data.courses || []);
    } catch (error) {
      console.error('Error fetching course report:', error);
      toast.error('Failed to load course report');
    } finally {
      setLoading(false);
    }
  };

  const fetchStaffPerformance = async () => {
    try {
      setLoading(true);
      const response = await registrationService.getStaffPerformance({
        start_date: dateRange.startDate,
        end_date: dateRange.endDate,
        branch: selectedBranch !== 'all' ? selectedBranch : undefined
      });
      
      setStaffPerformance(response.data.staff || []);
    } catch (error) {
      console.error('Error fetching staff performance:', error);
      toast.error('Failed to load staff performance report');
    } finally {
      setLoading(false);
    }
  };

  const handleExportMonthlyList = async () => {
    try {
      const month = selectedMonth.getMonth() + 1;
      const year = selectedMonth.getFullYear();
      
      const response = await registrationService.getMonthlyRegistrations(year, month, {
        export: true,
        branch: selectedBranch !== 'all' ? selectedBranch : undefined,
        course_id: selectedCourse !== 'all' ? selectedCourse : undefined
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `monthly-registrations-${year}-${month}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success('Monthly registration list downloaded');
    } catch (error) {
      toast.error('Failed to export report');
    }
  };

  const handlePrintMonthlyList = () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Monthly Registration List - ${selectedMonth.toLocaleString('default', { month: 'long' })} ${selectedYear}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; }
            h1 { color: #1e3a5f; font-size: 24px; margin-bottom: 5px; }
            h2 { color: #2c3e50; font-size: 18px; margin-top: 0; margin-bottom: 30px; font-weight: normal; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background: #1e3a5f; color: white; padding: 12px; text-align: left; font-size: 14px; }
            td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
            tr:nth-child(even) { background: #f8fafc; }
            .footer { margin-top: 30px; font-size: 12px; color: #64748b; text-align: center; }
            .badge { 
              background: #e6f0fa; 
              color: #1e3a5f; 
              padding: 4px 8px; 
              border-radius: 20px; 
              font-size: 11px;
              display: inline-block;
            }
            .summary { 
              background: #f1f5f9; 
              padding: 20px; 
              border-radius: 8px; 
              margin-bottom: 30px;
              display: flex;
              justify-content: space-between;
            }
            .summary-item { text-align: center; }
            .summary-label { font-size: 12px; color: #64748b; }
            .summary-value { font-size: 24px; font-weight: bold; color: #1e3a5f; }
          </style>
        </head>
        <body>
          <h1>SchoolSync - Monthly Registration Report</h1>
          <h2>${selectedMonth.toLocaleString('default', { month: 'long' })} ${selectedYear} ${selectedBranch !== 'all' ? `- ${selectedBranch}` : ''}</h2>
          
          <div class="summary">
            <div class="summary-item">
              <div class="summary-label">Total Registrations</div>
              <div class="summary-value">${monthlySummary?.total_registrations || 0}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Registration Fees</div>
              <div class="summary-value">₵${(monthlySummary?.total_registration_fees || 0).toFixed(2)}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Tuition Paid</div>
              <div class="summary-value">₵${(monthlySummary?.total_tuition_paid || 0).toFixed(2)}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Office/Field</div>
              <div class="summary-value">${monthlySummary?.office_count || 0}/${monthlySummary?.field_count || 0}</div>
            </div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Reg. Number</th>
                <th>Student Name</th>
                <th>Course</th>
                <th>Registration Date</th>
                <th>Branch</th>
                <th>Location</th>
                <th>Total Fee</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${monthlyRegistrations.map(reg => `
                <tr>
                  <td><strong>${reg.registration_number}</strong></td>
                  <td>${reg.student_name || ''}</td>
                  <td>${reg.course_name || ''}</td>
                  <td>${new Date(reg.registration_date).toLocaleDateString()}</td>
                  <td>${reg.branch || ''}</td>
                  <td><span class="badge">${reg.payment_location === 'office' ? '🏢 Office' : '📍 Field'}</span></td>
                  <td>₵${(reg.total_fee || 0).toFixed(2)}</td>
                  <td><span class="badge">${reg.status || 'active'}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="footer">
            <p>Generated on ${new Date().toLocaleString()} | SchoolSync Management System</p>
            <p>This is an official report. Total Registrations: ${monthlySummary?.total_registrations || 0}</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const formatCurrency = (amount) => {
    return `₵${parseFloat(amount || 0).toFixed(2)}`;
  };

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

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
            <h1 className="text-2xl font-bold text-primary-800">Reports & Analytics</h1>
            <p className="text-primary-600 mt-2">
              Generate monthly registration lists and performance reports
            </p>
          </div>
          <div className="flex items-center space-x-3">
            {activeTab === 'monthly' && (
              <>
                <button
                  onClick={handlePrintMonthlyList}
                  className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all flex items-center"
                >
                  <Printer className="w-5 h-5 mr-2" />
                  Print List
                </button>
                <button
                  onClick={handleExportMonthlyList}
                  className="px-4 py-2 bg-gradient-to-r from-secondary-500 to-secondary-600 text-white rounded-xl hover:shadow-lg transition-all flex items-center"
                >
                  <Download className="w-5 h-5 mr-2" />
                  Export CSV
                </button>
              </>
            )}
          </div>
        </div>
      </motion.div>

      {/* Report Navigation Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-xl border border-gray-200 p-2 flex flex-wrap"
      >
        {[
          { id: 'monthly', label: '📋 Monthly Registration', icon: Calendar },
          { id: 'revenue', label: '💰 Revenue Report', icon: TrendingUp },
          { id: 'branches', label: '🏢 Branch Summary', icon: MapPin },
          { id: 'courses', label: '📚 Course Statistics', icon: BookOpen },
          { id: 'staff', label: '👥 Staff Performance', icon: Users },
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

      {/* Report Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-white rounded-xl border border-gray-200 p-4"
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900 flex items-center">
            <Filter className="w-5 h-5 mr-2 text-primary-500" />
            Report Filters
          </h3>
          {(activeTab !== 'monthly' || selectedBranch !== 'all' || selectedCourse !== 'all') && (
            <button
              onClick={() => {
                setSelectedBranch('all');
                setSelectedCourse('all');
                setDateRange({
                  startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                  endDate: new Date()
                });
              }}
              className="text-sm text-primary-600 hover:text-primary-700"
            >
              Clear Filters
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-4">
          {/* Monthly Specific Filters */}
          {activeTab === 'monthly' && (
            <>
              <div className="flex items-center space-x-2">
                <Calendar className="text-gray-400 w-5 h-5" />
                <select
                  value={selectedMonth.getMonth()}
                  onChange={(e) => {
                    const newDate = new Date(selectedMonth);
                    newDate.setMonth(parseInt(e.target.value));
                    setSelectedMonth(newDate);
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary-400 focus:border-transparent text-sm"
                >
                  {months.map((month, index) => (
                    <option key={month} value={index}>{month}</option>
                  ))}
                </select>
                <select
                  value={selectedMonth.getFullYear()}
                  onChange={(e) => {
                    const newDate = new Date(selectedMonth);
                    newDate.setFullYear(parseInt(e.target.value));
                    setSelectedMonth(newDate);
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary-400 focus:border-transparent text-sm"
                >
                  {years.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* Date Range for other reports */}
          {activeTab !== 'monthly' && (
            <div className="flex items-center space-x-2">
              <Calendar className="text-gray-400 w-5 h-5" />
              <DatePicker
                selected={dateRange.startDate}
                onChange={(date) => setDateRange({ ...dateRange, startDate: date })}
                selectsStart
                startDate={dateRange.startDate}
                endDate={dateRange.endDate}
                className="px-3 py-2 border border-gray-300 rounded-lg w-32 text-sm"
                placeholderText="Start date"
              />
              <span className="text-gray-400">-</span>
              <DatePicker
                selected={dateRange.endDate}
                onChange={(date) => setDateRange({ ...dateRange, endDate: date })}
                selectsEnd
                startDate={dateRange.startDate}
                endDate={dateRange.endDate}
                minDate={dateRange.startDate}
                className="px-3 py-2 border border-gray-300 rounded-lg w-32 text-sm"
                placeholderText="End date"
              />
            </div>
          )}

          {/* Branch Filter (All Reports) */}
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary-400 focus:border-transparent text-sm"
          >
            <option value="all">All Branches</option>
            {branches.map(branch => (
              <option key={branch} value={branch}>{branch}</option>
            ))}
          </select>

          {/* Course Filter (Monthly & Course Reports) */}
          {(activeTab === 'monthly' || activeTab === 'courses') && (
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary-400 focus:border-transparent text-sm"
            >
              <option value="all">All Courses</option>
              {courses.map(course => (
                <option key={course.id} value={course.id}>{course.name}</option>
              ))}
            </select>
          )}
        </div>
      </motion.div>

      {/* Report Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-12 h-12 border-4 border-secondary-200 border-t-secondary-600 rounded-full animate-spin"></div>
          </div>
        ) : (
          <>
            {/* Monthly Registration Report */}
            {activeTab === 'monthly' && (
              <div className="space-y-6">
                {/* Monthly Summary Cards */}
                {monthlySummary && (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl p-6 text-white">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-primary-100 text-sm">Total Registrations</p>
                          <p className="text-3xl font-bold mt-2">{monthlySummary.total_registrations || 0}</p>
                          <p className="text-primary-100 text-xs mt-1">
                            Office: {monthlySummary.office_count || 0} | Field: {monthlySummary.field_count || 0}
                          </p>
                        </div>
                        <div className="bg-white/20 p-3 rounded-lg">
                          <Users className="w-8 h-8" />
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-500">Registration Fees</p>
                          <p className="text-2xl font-bold mt-2 text-gray-900">
                            {formatCurrency(monthlySummary.total_registration_fees)}
                          </p>
                        </div>
                        <div className="bg-blue-100 p-3 rounded-lg">
                          <CreditCard className="w-6 h-6 text-blue-600" />
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-500">Tuition Paid</p>
                          <p className="text-2xl font-bold mt-2 text-gray-900">
                            {formatCurrency(monthlySummary.total_tuition_paid)}
                          </p>
                        </div>
                        <div className="bg-green-100 p-3 rounded-lg">
                          <DollarSign className="w-6 h-6 text-green-600" />
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-500">Outstanding Balance</p>
                          <p className="text-2xl font-bold mt-2 text-gray-900">
                            {formatCurrency(monthlySummary.total_outstanding || 0)}
                          </p>
                        </div>
                        <div className="bg-yellow-100 p-3 rounded-lg">
                          <AlertCircle className="w-6 h-6 text-yellow-600" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Monthly Registrations Table */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900 flex items-center">
                      <FileText className="w-5 h-5 mr-2 text-primary-500" />
                      Registration List - {months[selectedMonth.getMonth()]} {selectedMonth.getFullYear()}
                    </h3>
                    <span className="text-sm text-gray-500">
                      {monthlyRegistrations.length} students
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Reg. Number</th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Student Name</th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Course</th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Registration Date</th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Branch</th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Location</th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Total Fee</th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Paid</th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {monthlyRegistrations.length > 0 ? (
                          monthlyRegistrations.map((reg) => (
                            <tr key={reg.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4">
                                <span className="font-mono text-sm font-medium text-primary-600">
                                  {reg.registration_number}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <div className="font-medium text-gray-900">{reg.student_name}</div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-sm text-gray-900">{reg.course_name}</div>
                                {reg.course_duration && (
                                  <div className="text-xs text-gray-500">{reg.course_duration}</div>
                                )}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-600">
                                {new Date(reg.registration_date).toLocaleDateString()}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-600">{reg.branch}</td>
                              <td className="px-6 py-4">
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                  reg.payment_location === 'office' 
                                    ? 'bg-purple-100 text-purple-700' 
                                    : 'bg-orange-100 text-orange-700'
                                }`}>
                                  {reg.payment_location === 'office' ? 'Office' : 'Field'}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <span className="font-medium text-gray-900">
                                  {formatCurrency(reg.total_fee)}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <span className="font-medium text-green-600">
                                  {formatCurrency((reg.registration_fee || 0) + (reg.tuition_fee_paid || 0))}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                  reg.status === 'active' ? 'bg-green-100 text-green-700' :
                                  reg.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                                  reg.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                  {reg.status || 'active'}
                                </span>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="9" className="px-6 py-12 text-center text-gray-500">
                              <Calendar className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                              <p className="font-medium">No registrations found for this period</p>
                              <p className="text-sm mt-1">Try selecting a different month or branch</p>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  {monthlyRegistrations.length > 0 && (
                    <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                      <div className="text-sm text-gray-600">
                        Total Students: <span className="font-semibold text-gray-900">{monthlyRegistrations.length}</span>
                      </div>
                      <div className="text-sm text-gray-600">
                        Total Revenue: <span className="font-semibold text-secondary-600">
                          {formatCurrency((monthlySummary?.total_registration_fees || 0) + (monthlySummary?.total_tuition_paid || 0))}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Revenue Report */}
            {activeTab === 'revenue' && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <TrendingUp className="w-5 h-5 mr-2 text-primary-500" />
                  Revenue Summary
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div className="bg-green-50 rounded-xl p-4">
                    <p className="text-sm text-green-600 mb-1">Total Revenue</p>
                    <p className="text-2xl font-bold text-green-700">
                      {formatCurrency(revenueData.reduce((sum, d) => sum + (d.total || 0), 0))}
                    </p>
                  </div>
                  <div className="bg-blue-50 rounded-xl p-4">
                    <p className="text-sm text-blue-600 mb-1">Registration Fees</p>
                    <p className="text-2xl font-bold text-blue-700">
                      {formatCurrency(revenueData.reduce((sum, d) => sum + (d.registration_fees || 0), 0))}
                    </p>
                  </div>
                  <div className="bg-purple-50 rounded-xl p-4">
                    <p className="text-sm text-purple-600 mb-1">Tuition Fees</p>
                    <p className="text-2xl font-bold text-purple-700">
                      {formatCurrency(revenueData.reduce((sum, d) => sum + (d.tuition_fees || 0), 0))}
                    </p>
                  </div>
                </div>
                <div className="border-t border-gray-200 pt-4">
                  <p className="text-sm text-gray-500 text-center">
                    Revenue breakdown by day - Detailed view coming soon with charts
                  </p>
                </div>
              </div>
            )}

            {/* Branch Summary Report */}
            {activeTab === 'branches' && (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                  <h3 className="font-semibold text-gray-900 flex items-center">
                    <MapPin className="w-5 h-5 mr-2 text-primary-500" />
                    Branch Performance Summary
                  </h3>
                </div>
                <div className="p-6">
                  {branchStats.length > 0 ? (
                    <div className="space-y-6">
                      {branchStats.map((branch) => (
                        <div key={branch.name} className="border border-gray-200 rounded-xl p-4">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center">
                              <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center mr-3">
                                <School className="w-5 h-5 text-primary-600" />
                              </div>
                              <div>
                                <h4 className="font-semibold text-gray-900">{branch.name}</h4>
                                <p className="text-xs text-gray-500">Branch ID: {branch.id || 'N/A'}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-secondary-600">{formatCurrency(branch.total_revenue || 0)}</p>
                              <p className="text-xs text-gray-500">Total Revenue</p>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                              <p className="text-xs text-gray-500">Registrations</p>
                              <p className="text-lg font-semibold text-gray-900">{branch.total_registrations || 0}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Office/Field</p>
                              <p className="text-lg font-semibold text-gray-900">{branch.office_count || 0}/{branch.field_count || 0}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Active Students</p>
                              <p className="text-lg font-semibold text-gray-900">{branch.active_students || 0}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Staff Count</p>
                              <p className="text-lg font-semibold text-gray-900">{branch.staff_count || 0}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-500">
                      <MapPin className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                      <p className="font-medium">No branch data available</p>
                      <p className="text-sm mt-1">Select a different date range</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Course Statistics Report */}
            {activeTab === 'courses' && (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                  <h3 className="font-semibold text-gray-900 flex items-center">
                    <BookOpen className="w-5 h-5 mr-2 text-primary-500" />
                    Course Enrollment Statistics
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Course Code</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Course Name</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Total Enrolled</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Active</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Completed</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Revenue</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Avg Fee</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {courseStats.length > 0 ? (
                        courseStats.map((course) => (
                          <tr key={course.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4">
                              <span className="font-mono text-sm font-medium text-primary-600">
                                {course.course_code}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="font-medium text-gray-900">{course.name}</span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="font-semibold text-gray-900">{course.total_enrolled || 0}</span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-green-600 font-medium">{course.active_count || 0}</span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-blue-600 font-medium">{course.completed_count || 0}</span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="font-medium text-gray-900">{formatCurrency(course.total_revenue || 0)}</span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-gray-600">{formatCurrency(course.average_fee || 0)}</span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                            <BookOpen className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                            <p className="font-medium">No course statistics available</p>
                            <p className="text-sm mt-1">Select a different date range or branch</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Staff Performance Report */}
            {activeTab === 'staff' && (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                  <h3 className="font-semibold text-gray-900 flex items-center">
                    <Users className="w-5 h-5 mr-2 text-primary-500" />
                    Staff Performance Summary
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Staff ID</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Staff Name</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Role</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Branch</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Registrations</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Payments</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Total Amount</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Office/Field</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {staffPerformance.length > 0 ? (
                        staffPerformance.map((staff) => (
                          <tr key={staff.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4">
                              <span className="font-mono text-sm font-medium text-primary-600">
                                {staff.staff_id}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="font-medium text-gray-900">
                                {staff.first_name} {staff.last_name}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                staff.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                                staff.role === 'registrar' ? 'bg-blue-100 text-blue-700' :
                                'bg-green-100 text-green-700'
                              }`}>
                                {staff.role}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600">{staff.branch}</td>
                            <td className="px-6 py-4">
                              <span className="font-semibold text-gray-900">{staff.total_registrations || 0}</span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="font-semibold text-gray-900">{staff.total_payments || 0}</span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="font-medium text-secondary-600">
                                {formatCurrency(staff.total_amount || 0)}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-sm text-gray-600">
                                {staff.office_count || 0}/{staff.field_count || 0}
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                            <Users className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                            <p className="font-medium">No staff performance data available</p>
                            <p className="text-sm mt-1">Select a different date range or branch</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </motion.div>
    </div>
  );
};

export default Reports;