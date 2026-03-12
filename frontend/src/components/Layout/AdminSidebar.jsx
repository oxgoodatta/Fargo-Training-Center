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

  return (
    <div className="w-64 bg-white border-r border-gray-200 min-h-screen sticky top-0">
      <div className="p-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-secondary-400 to-secondary-600 rounded-xl flex items-center justify-center">
            <School className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-primary-800">SchoolSync</h1>
            <p className="text-xs text-primary-500">Admin Portal</p>
          </div>
        </div>
        {user && (
          <div className="mt-4 p-3 bg-primary-50 rounded-lg">
            <p className="text-sm font-medium text-primary-800">{user.full_name || `${user.first_name} ${user.last_name}`}</p>
            <p className="text-xs text-primary-500">Administrator</p>
          </div>
        )}
      </div>
      
      <nav className="mt-4 px-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center px-4 py-3 text-gray-700 hover:bg-primary-50 hover:text-primary-600 rounded-xl mb-1 transition-colors ${
                  isActive ? 'bg-primary-50 text-primary-600 border-l-4 border-secondary-500' : ''
                }`
              }
            >
              <Icon className="w-5 h-5 mr-3" />
              <span className="font-medium">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
      
      <div className="absolute bottom-0 w-64 p-6 border-t border-gray-200">
        <div className="text-xs text-primary-500">
          <p>© {new Date().getFullYear()} SchoolSync</p>
          <p className="mt-1">v1.0.0 • Admin Portal</p>
        </div>
      </div>
    </div>
  );
};

export default AdminSidebar;