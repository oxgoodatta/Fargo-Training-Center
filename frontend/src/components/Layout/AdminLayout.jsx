import React from 'react';
import { Outlet } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';
import AdminHeader from './AdminHeader';
import { authService } from '../../api/services/authService';

const AdminLayout = () => {
  const user = authService.getCurrentUser();
  
  // Redirect if not admin
  if (!user || authService.getUserRole() !== 'admin') {
    window.location.href = '/login';
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-w-0"> {/* Added min-w-0 to prevent overflow */}
        <AdminHeader />
        <main className="flex-1 overflow-y-auto p-4 md:p-5 lg:p-4 xl:p-5">
          <div className="max-w-full mx-auto"> {/* Constrains content width */}
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;