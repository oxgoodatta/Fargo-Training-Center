import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store/store';
import { Toaster } from 'react-hot-toast';

// Auth Pages
import Login from './pages/auth/Login';
import StudentRegister from './pages/auth/StudentRegister';

// Layouts
import AdminLayout from './components/Layout/AdminLayout';
import StaffLayout from './components/Layout/StaffLayout';
import StudentLayout from './components/Layout/StudentLayout';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminStudents from './pages/admin/Students';
import AdminCourses from './pages/admin/Courses';
import AdminRegistrations from './pages/admin/Registrations';
import AdminStaff from './pages/admin/Staff';
import AdminPayments from './pages/admin/Payments';
import AdminReports from './pages/admin/Reports';
import AdminNotifications from './pages/admin/Notifications';
import AdminSettings from './pages/admin/Settings';

// Staff Pages
import StaffDashboard from './pages/staff/StaffDashboard';
import RegisterStudent from './pages/staff/RegisterStudent';
import StaffPayments from './pages/staff/StaffPayments';
import StaffStudents from './pages/staff/StaffStudents';

// Student Pages
import StudentDashboard from './pages/student/StudentDashboard';
import RegistrationFees from './pages/student/RegistrationFees';

// Protected Route Wrapper
import ProtectedRoute from './components/auth/ProtectedRoute';

function App() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing token on app load
    const token = localStorage.getItem('token');
    if (token) {
      // Verify token with backend
      // This can be implemented later
    }
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-secondary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-primary-600">Loading SchoolSync...</p>
        </div>
      </div>
    );
  }

  return (
    <Provider store={store}>
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'white',
            color: '#171717',
            borderRadius: '12px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
          },
          success: {
            iconTheme: {
              primary: '#f97316',
              secondary: 'white',
            },
          },
        }}
      />
      
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register/student" element={<StudentRegister />} />
          
          {/* ============ PUBLIC REGISTRATION FLOW ============ */}
          <Route path="/student/registration-fees" element={<RegistrationFees />} />
          
          {/* ============ ADMIN ROUTES ============ */}
          <Route path="/admin" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="students" element={<AdminStudents />} />
            <Route path="courses" element={<AdminCourses />} />
            <Route path="registrations" element={<AdminRegistrations />} />
            <Route path="staff" element={<AdminStaff />} />
            <Route path="payments" element={<AdminPayments />} />
            <Route path="reports" element={<AdminReports />} />
            <Route path="notifications" element={<AdminNotifications />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>
          
          {/* ============ STAFF ROUTES (ADMIN CAN ACCESS TOO) ============ */}
          <Route path="/staff" element={
            <ProtectedRoute allowedRoles={['admin', 'registrar', 'field_agent']}>
              <StaffLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="/staff/dashboard" replace />} />
            <Route path="dashboard" element={<StaffDashboard />} />
            <Route path="register" element={<RegisterStudent />} />
            <Route path="payments" element={<StaffPayments />} />
            <Route path="students" element={<StaffStudents />} />
          </Route>
          
          {/* ============ STUDENT ROUTES (PROTECTED) ============ */}
          <Route path="/student" element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="/student/dashboard" replace />} />
            <Route path="dashboard" element={<StudentDashboard />} />
          </Route>
          
          {/* Default Redirect */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          
          {/* 404 Route */}
          <Route path="*" element={
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100">
              <div className="text-center">
                <h1 className="text-6xl font-bold text-secondary-500 mb-4">404</h1>
                <p className="text-xl text-primary-600 mb-6">Page not found</p>
                <a 
                  href="/login" 
                  className="inline-block px-6 py-3 bg-secondary-500 text-white rounded-xl hover:bg-secondary-600 transition-colors"
                >
                  Go to Login
                </a>
              </div>
            </div>
          } />
        </Routes>
      </Router>
    </Provider>
  );
}

export default App;