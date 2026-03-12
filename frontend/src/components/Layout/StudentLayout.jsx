import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { authService } from '../../api/services/authService';

// Simple placeholder components
const StudentSidebarComponent = () => (
  <div className="w-64 bg-white border-r border-gray-200 min-h-screen p-6">
    <h2 className="text-xl font-bold text-primary-800">Student Portal</h2>
    <p className="text-sm text-primary-500 mt-2">Self-service dashboard</p>
  </div>
);

const StudentHeaderComponent = () => {
  const navigate = useNavigate();
  const user = authService.getCurrentUser();

  const handleLogout = () => {
    authService.clearAuth();
    navigate('/login');
  };

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Student Dashboard</h1>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-600">
            {user?.first_name} {user?.last_name}
          </span>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
};

const StudentLayout = () => {
  const user = authService.getCurrentUser();
  
  if (!user || !authService.isStudent()) {
    window.location.href = '/login';
    return null;
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <StudentSidebarComponent />
      <div className="flex-1">
        <StudentHeaderComponent />
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default StudentLayout;