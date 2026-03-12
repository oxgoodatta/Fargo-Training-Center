import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Menu, X, Home, Users, BookOpen, UserCog, 
  CreditCard, BarChart3, Bell, Settings,
  ChevronRight, Search
} from 'lucide-react';
import { Toaster } from 'react-hot-toast';

const ModernLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'students', label: 'Students', icon: Users },
    { id: 'registrations', label: 'Registrations', icon: BookOpen },
    { id: 'staff', label: 'Staff', icon: UserCog },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100">
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
        }}
      />
      
      {/* Mobile Sidebar Toggle */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-xl shadow-lg"
      >
        {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            className="fixed inset-y-0 left-0 z-40 w-72 bg-white/95 backdrop-blur-lg lg:hidden"
          >
            <SidebarContent 
              navItems={navItems} 
              activeTab={activeTab} 
              setActiveTab={setActiveTab}
              onClose={() => setSidebarOpen(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <div className="hidden lg:block fixed inset-y-0 left-0 z-30 w-72">
        <SidebarContent 
          navItems={navItems} 
          activeTab={activeTab} 
          setActiveTab={setActiveTab}
        />
      </div>

      {/* Main Content */}
      <div className="lg:ml-72">
        {/* Top Navigation Bar */}
        <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-lg border-b border-primary-200">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex-1 max-w-2xl">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-primary-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search students, payments, staff..."
                    className="w-full pl-12 pr-4 py-3 bg-primary-50 border-0 rounded-2xl focus:outline-none focus:ring-2 focus:ring-secondary-400 focus:bg-white transition-all"
                  />
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <button className="relative p-2 hover:bg-primary-100 rounded-xl transition-colors">
                  <Bell size={22} className="text-primary-600" />
                  <span className="absolute top-1 right-1 w-2 h-2 bg-secondary-500 rounded-full animate-pulse"></span>
                </button>
                
                <div className="flex items-center space-x-3 p-2 hover:bg-primary-100 rounded-2xl cursor-pointer transition-colors">
                  <div className="w-10 h-10 bg-gradient-to-br from-secondary-400 to-secondary-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-lg">A</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Admin User</p>
                    <p className="text-xs text-primary-500">Administrator</p>
                  </div>
                  <ChevronRight size={16} className="text-primary-400" />
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content with Parallax Effect */}
        <main className="min-h-[calc(100vh-80px)]">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="p-6"
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  );
};

const SidebarContent = ({ navItems, activeTab, setActiveTab, onClose }) => {
  return (
    <div className="h-full flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-primary-100">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-gradient-to-br from-secondary-400 to-secondary-600 rounded-2xl flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-secondary-500 to-secondary-700 bg-clip-text text-transparent">
              SchoolSync
            </h1>
            <p className="text-sm text-primary-500">Student Management</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-6 overflow-y-auto">
        <ul className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            
            return (
              <li key={item.id}>
                <button
                  onClick={() => {
                    setActiveTab(item.id);
                    onClose?.();
                  }}
                  className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all duration-300 ${
                    isActive
                      ? 'bg-gradient-to-r from-secondary-50 to-secondary-100 text-secondary-700 border-l-4 border-secondary-500'
                      : 'text-primary-600 hover:bg-primary-50 hover:text-secondary-600'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon size={20} />
                    <span className="font-medium">{item.label}</span>
                  </div>
                  {isActive && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-2 h-2 bg-secondary-500 rounded-full"
                    />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Quick Stats */}
      <div className="p-6 border-t border-primary-100">
        <div className="bg-gradient-to-br from-primary-50 to-white p-4 rounded-2xl border border-primary-200">
          <p className="text-sm text-primary-600 mb-2">Quick Stats</p>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold">1,234</p>
              <p className="text-xs text-primary-500">Students</p>
            </div>
            <div className="w-12 h-12 bg-secondary-100 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-secondary-600" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModernLayout;