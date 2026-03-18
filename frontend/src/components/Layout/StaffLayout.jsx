import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { authService } from '../../api/services/authService';

// Logo URL - using the same logo from login page
const logoUrl = '/images/logo.jpeg';

const StaffSidebarComponent = () => (
  <div className="w-64 bg-white border-r border-gray-200 min-h-screen p-6">
    <div className="flex items-center space-x-3 mb-4">
      <div className="w-10 h-10 rounded-lg overflow-hidden bg-white border border-gray-200">
        <img 
          src={logoUrl} 
          alt="Fargo Training Center" 
          className="w-full h-full object-contain"
        />
      </div>
      <div>
        <h2 className="text-xl font-bold text-primary-800">Fargo Training</h2>
        <p className="text-sm text-primary-500">Staff Portal</p>
      </div>
    </div>
  </div>
);

const StaffHeaderComponent = () => {
  const navigate = useNavigate();
  const user = authService.getCurrentUser();

  const handleLogout = () => {
    authService.clearAuth();
    navigate('/login');
  };

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Staff Dashboard</h1>
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

const StaffLayout = () => {
  const user = authService.getCurrentUser();
  
  if (!user || !authService.isStaff()) {
    window.location.href = '/login';
    return null;
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <StaffSidebarComponent />
      <div className="flex-1">
        <StaffHeaderComponent />
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default StaffLayout;