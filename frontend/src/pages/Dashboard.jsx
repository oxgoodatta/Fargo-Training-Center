import React from 'react';
import { motion } from 'framer-motion';
import { 
  Users, BookOpen, CreditCard, TrendingUp, 
  ArrowUpRight, Calendar, Clock, Download, LogOut
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import StatCard from '../components/Cards/StatCard';
import ChartCard from '../components/Cards/ChartCard';

const Dashboard = () => {
  const navigate = useNavigate();
  
  const stats = [
    {
      title: 'Total Students',
      value: '1,234',
      change: '+12%',
      icon: Users,
      color: 'from-secondary-400 to-secondary-600',
      delay: 0.1,
    },
    {
      title: 'Active Registrations',
      value: '456',
      change: '+8%',
      icon: BookOpen,
      color: 'from-primary-400 to-primary-600',
      delay: 0.2,
    },
    {
      title: 'Monthly Revenue',
      value: '₵45,230',
      change: '+23%',
      icon: CreditCard,
      color: 'from-secondary-500 to-orange-500',
      delay: 0.3,
    },
    {
      title: 'Collection Rate',
      value: '94%',
      change: '+5%',
      icon: TrendingUp,
      color: 'from-emerald-400 to-emerald-600',
      delay: 0.4,
    },
  ];

  const recentActivities = [
    { student: 'John Doe', action: 'New Registration', time: '10 min ago', status: 'success' },
    { student: 'Jane Smith', action: 'Fee Payment', time: '25 min ago', status: 'success' },
    { student: 'Kwame Asante', action: 'Course Update', time: '1 hour ago', status: 'warning' },
    { student: 'Ama Boateng', action: 'Registration', time: '2 hours ago', status: 'success' },
  ];

  const handleLogout = () => {
    localStorage.removeItem('token');
    toast.success('Logged out successfully! See you soon 👋');
    navigate('/login');
  };

  const handleQuickAction = (action) => {
    switch(action) {
      case 'Register Student':
        navigate('/students/new');
        break;
      case 'Record Payment':
        toast.success('Payment recording modal would open here');
        break;
      case 'Add Staff':
        navigate('/staff/new');
        break;
      case 'Generate Report':
        toast.success('Report generation would start here');
        break;
      default:
        break;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-800 to-secondary-600 bg-clip-text text-transparent">
            Welcome back, Admin! 👋
          </h1>
          <p className="text-primary-500 mt-2">Here's what's happening with your school today</p>
        </div>
        <div className="flex items-center space-x-3 mt-4 md:mt-0">
          <button className="flex items-center space-x-2 px-4 py-2 bg-white border border-primary-200 rounded-xl hover:bg-primary-50 transition-colors">
            <Calendar size={18} className="text-primary-500" />
            <span className="text-sm font-medium">Today</span>
          </button>
          <button className="flex items-center space-x-2 px-4 py-2 bg-secondary-500 text-white rounded-xl hover:bg-secondary-600 transition-colors">
            <Download size={18} />
            <span className="text-sm font-medium">Export</span>
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center space-x-2 px-4 py-2 bg-white border border-primary-200 rounded-xl hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors group"
          >
            <LogOut size={18} className="text-primary-500 group-hover:text-red-500" />
            <span className="text-sm font-medium">Logout</span>
          </button>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <StatCard key={index} {...stat} index={index} />
        ))}
      </div>

      {/* Charts & Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="lg:col-span-2"
        >
          <ChartCard
            title="Revenue Overview"
            subtitle="Last 6 months performance"
            value="₵245,800"
            change="+18.2%"
          />
        </motion.div>

        {/* Recent Activities */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white rounded-2xl border border-primary-200 p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold">Recent Activities</h3>
              <p className="text-sm text-primary-500">Latest school activities</p>
            </div>
            <ArrowUpRight size={20} className="text-primary-400" />
          </div>

          <div className="space-y-4">
            {recentActivities.map((activity, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 + index * 0.1 }}
                className="flex items-center justify-between p-3 hover:bg-primary-50 rounded-xl transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    activity.status === 'success' 
                      ? 'bg-emerald-100 text-emerald-600' 
                      : 'bg-amber-100 text-amber-600'
                  }`}>
                    {activity.status === 'success' ? '✓' : '!'}
                  </div>
                  <div>
                    <p className="font-medium">{activity.student}</p>
                    <p className="text-sm text-primary-500">{activity.action}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 text-sm text-primary-400">
                  <Clock size={14} />
                  <span>{activity.time}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="bg-gradient-to-r from-secondary-50 to-white rounded-2xl border border-secondary-100 p-6"
      >
        <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {['Register Student', 'Record Payment', 'Add Staff', 'Generate Report'].map((action, index) => (
            <button
              key={index}
              onClick={() => handleQuickAction(action)}
              className="p-4 bg-white rounded-xl border border-primary-200 hover:border-secondary-300 hover:shadow-md transition-all group"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium group-hover:text-secondary-600 transition-colors">
                  {action}
                </span>
                <ArrowUpRight size={18} className="text-primary-400 group-hover:text-secondary-500 transition-colors" />
              </div>
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default Dashboard;