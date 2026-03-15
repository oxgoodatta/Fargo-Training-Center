import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  BookOpen, 
  UserCog, 
  CreditCard,
  BarChart3,
  Settings,
  Bell,
  Book,
  School,
  DollarSign,
  FileText
} from 'lucide-react';
import { authService } from '../../api/services/authService';

const AdminSidebar = () => {
  const user = authService.getCurrentUser();
  
  const navItems = [
    { path: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/admin/students', label: 'Students', icon: Users },
    { path: '/admin/courses', label: 'Courses', icon: Book },
    { path: '/admin/registrations', label: 'Registrations', icon: BookOpen },
    { path: '/admin/staff', label: 'Staff', icon: UserCog },
    { path: '/admin/payments', label: 'Payments', icon: CreditCard },
    { path: '/admin/notifications', label: 'Notifications', icon: Bell },
    { path: '/admin/settings', label: 'Settings', icon: Settings },
  ];

  // Logo URL - using the same logo from login page
  const logoUrl = '/images/logo.jpeg';

  return (
    <div className="w-56 md:w-64 lg:w-72 xl:w-64 bg-white border-r border-gray-200 flex flex-col h-screen sticky top-0 overflow-y-auto">
      <div className="p-4 md:p-5 lg:p-6 xl:p-5 flex-shrink-0">
        <div className="flex items-center space-x-3">
          {/* Logo Image instead of icon */}
          <div className="w-8 h-8 md:w-9 md:h-9 lg:w-10 lg:h-10 xl:w-9 xl:h-9 rounded-lg md:rounded-xl overflow-hidden flex-shrink-0 bg-white border border-gray-100">
            <img 
              src={logoUrl} 
              alt="Fargo Training Center" 
              className="w-full h-full object-contain"
            />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm md:text-base lg:text-lg xl:text-base font-bold text-primary-800 truncate">
              Fargo Training Center
            </h1>
            <p className="text-xs text-primary-500 truncate">Admin Portal</p>
          </div>
        </div>
        {user && (
          <div className="mt-3 md:mt-4 p-2 md:p-3 bg-primary-50 rounded-lg">
            <p className="text-xs md:text-sm font-medium text-primary-800 truncate">
              {user.full_name || `${user.first_name} ${user.last_name}`}
            </p>
            <p className="text-xs text-primary-500">Administrator</p>
          </div>
        )}
      </div>
      
      <nav className="flex-1 px-3 md:px-4 lg:px-5 xl:px-4 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center px-3 md:px-4 lg:px-5 xl:px-4 
                 py-2 md:py-2.5 lg:py-3 xl:py-2.5 
                 text-gray-700 hover:bg-primary-50 hover:text-primary-600 
                 rounded-lg mb-1 transition-colors ${
                  isActive ? 'bg-primary-50 text-primary-600 border-l-4 border-secondary-500' : ''
                }`
              }
            >
              <Icon className="w-4 h-4 md:w-5 md:h-5 lg:w-5 lg:h-5 xl:w-5 xl:h-5 
                             mr-2 md:mr-3 lg:mr-3 xl:mr-3 flex-shrink-0" />
              <span className="text-xs md:text-sm lg:text-sm xl:text-sm font-medium truncate">
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </nav>
      
      <div className="p-4 md:p-5 lg:p-6 xl:p-5 border-t border-gray-200 flex-shrink-0">
        <div className="text-xs text-primary-500">
          <p className="truncate">© {new Date().getFullYear()} Fargo</p>
          <p className="mt-1 truncate text-[10px] md:text-xs">Training Center v1.0.0</p>
        </div>
      </div>
    </div>
  );
};

export default AdminSidebar;