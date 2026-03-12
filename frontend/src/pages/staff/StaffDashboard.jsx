import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, LogOut, Users, CreditCard, DollarSign, Printer, FileText } from 'lucide-react';
import { authService } from '../../api/services/authService';
import { registrationService } from '../../api/services/registrationService';
import { studentService } from '../../api/services/studentService';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

const StaffDashboard = () => {
  const navigate = useNavigate();
  const user = authService.getCurrentUser();
  const [outstandingCount, setOutstandingCount] = useState(0);
  const [totalStudents, setTotalStudents] = useState(0);
  const [todayRegistrations, setTodayRegistrations] = useState(0);
  const [loading, setLoading] = useState(true);
  const [recentRegistrations, setRecentRegistrations] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch total students
      const studentsRes = await studentService.getStudents({ per_page: 1 });
      setTotalStudents(studentsRes.data.total || 0);
      
      // Fetch all registrations for counts
      const regResponse = await registrationService.getRegistrations({
        per_page: 1000
      });
      
      const registrations = regResponse.data.registrations || [];
      
      // Calculate outstanding count
      const outstanding = registrations.filter(
        reg => (reg.outstanding_balance || 0) > 0
      ).length;
      setOutstandingCount(outstanding);
      
      // Calculate today's registrations
      const today = new Date().toDateString();
      const todayCount = registrations.filter(reg => {
        const regDate = new Date(reg.registration_date).toDateString();
        return regDate === today;
      }).length;
      setTodayRegistrations(todayCount);
      
      // Get 20 most recent registrations (changed from 5 to 20)
      const recent = [...registrations]
        .sort((a, b) => new Date(b.registration_date) - new Date(a.registration_date))
        .slice(0, 20);
      setRecentRegistrations(recent);
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handlePrintRegistration = async (registration) => {
    try {
      // Show loading toast
      const loadingToast = toast.loading('Generating registration form...');
      
      // Get the HTML from backend
      const response = await registrationService.getPrintableRegistration(registration.id);
      
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
      toast.error('Failed to generate printable form');
      
      // Fallback to simple format if backend fails
      try {
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
          <html>
            <head>
              <title>Registration Form - ${registration.registration_number}</title>
              <style>
                body { font-family: Arial, sans-serif; padding: 40px; }
                h1 { color: #1e3a5f; }
                .reg-number { font-size: 18px; color: #f97316; margin-bottom: 20px; }
                table { width: 100%; border-collapse: collapse; }
                td { padding: 8px; border-bottom: 1px solid #ddd; }
                .label { font-weight: bold; width: 150px; }
              </style>
            </head>
            <body>
              <h1>STUDENT REGISTRATION FORM</h1>
              <div class="reg-number">${registration.registration_number}</div>
              <p><strong>Date:</strong> ${new Date(registration.registration_date).toLocaleDateString()}</p>
              
              <h2>Student Information</h2>
              <table>
                <tr><td class="label">Student ID:</td><td>${registration.student_id}</td></tr>
                <tr><td class="label">Name:</td><td>${registration.student_name}</td></tr>
              </table>
              
              <h2>Course Information</h2>
              <table>
                <tr><td class="label">Course:</td><td>${registration.course_name}</td></tr>
                <tr><td class="label">Branch:</td><td>${registration.branch}</td></tr>
                <tr><td class="label">Registration Fee:</td><td>${formatCurrency(registration.registration_fee)}</td></tr>
                <tr><td class="label">Total Fee:</td><td>${formatCurrency(registration.total_fee)}</td></tr>
              </table>
              
              <div style="margin-top: 50px;">
                <p>_________________________</p>
                <p>Staff Signature</p>
              </div>
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      } catch (fallbackError) {
        toast.error('Failed to generate printable form');
      }
    }
  };

  const formatCurrency = (amount) => {
    return `₵${parseFloat(amount || 0).toFixed(2)}`;
  };

  const handleLogout = () => {
    authService.clearAuth();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-primary-800">
              Staff Dashboard
            </h1>
            <p className="text-primary-600 mt-2">
              Welcome back, {user?.first_name}! 👋
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center space-x-2"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Outstanding Fees</p>
                {loading ? (
                  <div className="h-8 w-16 bg-gray-200 animate-pulse rounded mt-2"></div>
                ) : (
                  <p className="text-2xl font-bold text-yellow-600 mt-2">{outstandingCount}</p>
                )}
              </div>
              <div className="bg-yellow-100 p-3 rounded-lg">
                <DollarSign className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Students</p>
                {loading ? (
                  <div className="h-8 w-16 bg-gray-200 animate-pulse rounded mt-2"></div>
                ) : (
                  <p className="text-2xl font-bold text-blue-600 mt-2">{totalStudents}</p>
                )}
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Today's Registrations</p>
                {loading ? (
                  <div className="h-8 w-16 bg-gray-200 animate-pulse rounded mt-2"></div>
                ) : (
                  <p className="text-2xl font-bold text-green-600 mt-2">{todayRegistrations}</p>
                )}
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <UserPlus className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons - Small on Top */}
        <div className="flex flex-wrap gap-3 mb-8">
          <button
            onClick={() => navigate('/staff/register')}
            className="inline-flex items-center px-4 py-2 bg-secondary-600 text-white rounded-lg hover:bg-secondary-700 transition-colors shadow-sm"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Register Student
          </button>
          
          <button
            onClick={() => navigate('/staff/payments')}
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm"
          >
            <CreditCard className="w-4 h-4 mr-2" />
            Make Payment
          </button>
          
          <button
            onClick={() => navigate('/staff/students')}
            className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors shadow-sm"
          >
            <Users className="w-4 h-4 mr-2" />
            View Students
          </button>
        </div>

        {/* Recent Registrations List - Now at bottom, up to 20 items */}
        {!loading && recentRegistrations.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Recent Registrations (Last 20)</h2>
              <button
                onClick={() => navigate('/staff/students')}
                className="text-sm text-secondary-600 hover:text-secondary-700"
              >
                View All
              </button>
            </div>
            
            {/* List of recent registrations with print buttons */}
            <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
              {recentRegistrations.map((reg, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg border-b border-gray-100 last:border-0">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900">{reg.student_name}</p>
                      <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                        {reg.registration_number}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">
                      {reg.course_name} • {new Date(reg.registration_date).toLocaleDateString()} • 
                      <span className="ml-1 font-medium text-primary-600">{formatCurrency(reg.total_fee)}</span>
                      {reg.outstanding_balance > 0 && (
                        <span className="ml-2 text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full">
                          Owe: {formatCurrency(reg.outstanding_balance)}
                        </span>
                      )}
                    </p>
                  </div>
                  <button
                    onClick={() => handlePrintRegistration(reg)}
                    className="p-2 hover:bg-blue-50 rounded-lg text-blue-600 transition-colors"
                    title="Print Registration Form"
                  >
                    <Printer className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
            
            {/* Show count of registrations */}
            <div className="mt-4 text-sm text-gray-500 border-t pt-3">
              Showing {recentRegistrations.length} most recent registrations
            </div>
          </div>
        )}

        {/* Quick Print All Button */}
        {recentRegistrations.length > 0 && (
          <div className="mt-6 text-center">
          </div>
        )}
      </div>
    </div>
  );
};

export default StaffDashboard;