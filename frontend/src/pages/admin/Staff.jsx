import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  UserCog, Plus, Search, Filter, Edit, Trash2, 
  Mail, Phone, MapPin, Briefcase, IdCard, 
  CheckCircle, XCircle, Shield, Calendar,
  UserCheck, Users, LayoutGrid, Table, AlertCircle
} from 'lucide-react';
import { staffService } from '../../api/services/staffService';
import { authService } from '../../api/services/authService';
import AddStaffModal from '../../components/admin/AddStaffModal';
import toast from 'react-hot-toast';

const Staff = () => {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [viewMode, setViewMode] = useState('grid');
  
  const user = authService.getCurrentUser();

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const response = await staffService.getStaff({ 
        active_only: false,
        per_page: 100 
      });
      setStaff(response.data.staff || []);
    } catch (error) {
      console.error('Error fetching staff:', error);
      toast.error('Failed to load staff members');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (staffId, currentStatus) => {
    try {
      if (currentStatus) {
        await staffService.deactivateStaff(staffId);
        toast.success('Staff member deactivated');
      } else {
        await staffService.activateStaff(staffId);
        toast.success('Staff member activated');
      }
      fetchStaff();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update status');
    }
  };

  const handleDeleteClick = (member) => {
    setSelectedStaff(member);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteStaff = async () => {
    if (!selectedStaff) return;
    
    setDeleting(true);
    try {
      await staffService.deleteStaff(selectedStaff.id);
      toast.success('Staff member deleted successfully');
      setIsDeleteModalOpen(false);
      setSelectedStaff(null);
      fetchStaff();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error(error.response?.data?.error || 'Failed to delete staff');
    } finally {
      setDeleting(false);
    }
  };

  // Role-based styling
  const getRoleBadge = (role) => {
    switch(role) {
      case 'admin':
        return { color: 'bg-purple-100 text-purple-700', icon: Shield, label: 'Admin' };
      case 'registrar':
        return { color: 'bg-blue-100 text-blue-700', icon: UserCheck, label: 'Registrar' };
      case 'field_agent':
        return { color: 'bg-green-100 text-green-700', icon: UserCog, label: 'Field Agent' };
      default:
        return { color: 'bg-gray-100 text-gray-700', icon: Users, label: role };
    }
  };

  // Filter staff
  const filteredStaff = staff.filter(member => {
    const matchesSearch = 
      member.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.staff_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.phone?.includes(searchTerm);
    
    const matchesRole = selectedRole === 'all' || member.role === selectedRole;
    const matchesBranch = selectedBranch === 'all' || member.branch === selectedBranch;
    
    return matchesSearch && matchesRole && matchesBranch;
  });

  // Get unique branches for filter
  const branches = ['all', ...new Set(staff.map(s => s.branch).filter(Boolean))];

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border border-gray-200 p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-primary-800">Staff Management</h1>
              <p className="text-primary-600 mt-2">
                Total Staff: {staff.length}
              </p>
            </div>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2 bg-gradient-to-r from-secondary-500 to-secondary-600 text-white rounded-xl hover:shadow-lg transition-all flex items-center"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Staff Member
            </button>
          </div>
        </motion.div>

        {/* Search & Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl border border-gray-200 p-4"
        >
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by name, ID, email or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary-400 focus:border-transparent"
              />
            </div>
            
            {/* Filters and View Toggle */}
            <div className="flex gap-2">
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary-400 focus:border-transparent"
              >
                <option value="all">All Roles</option>
                <option value="admin">Admin</option>
                <option value="registrar">Registrar</option>
                <option value="field_agent">Field Agent</option>
              </select>
              
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary-400 focus:border-transparent"
              >
                <option value="all">All Branches</option>
                {branches.filter(b => b !== 'all').map(branch => (
                  <option key={branch} value={branch}>{branch}</option>
                ))}
              </select>

              {/* View Toggle */}
              <div className="flex border border-gray-300 rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 ${viewMode === 'grid' ? 'bg-primary-50 text-primary-600' : 'bg-white text-gray-600'} hover:bg-primary-50`}
                  title="Grid View"
                >
                  <LayoutGrid className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-2 ${viewMode === 'table' ? 'bg-primary-50 text-primary-600' : 'bg-white text-gray-600'} hover:bg-primary-50`}
                  title="Table View"
                >
                  <Table className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Staff Display */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="w-12 h-12 border-4 border-secondary-200 border-t-secondary-600 rounded-full animate-spin"></div>
            </div>
          ) : viewMode === 'grid' ? (
            /* Grid View */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredStaff.length > 0 ? (
                filteredStaff.map((member) => {
                  const RoleIcon = getRoleBadge(member.role).icon;
                  return (
                    <motion.div
                      key={member.id}
                      whileHover={{ y: -4 }}
                      className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all"
                    >
                      {/* Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                            member.role === 'admin' ? 'bg-purple-100' :
                            member.role === 'registrar' ? 'bg-blue-100' :
                            'bg-green-100'
                          }`}>
                            <RoleIcon className={`w-6 h-6 ${
                              member.role === 'admin' ? 'text-purple-600' :
                              member.role === 'registrar' ? 'text-blue-600' :
                              'text-green-600'
                            }`} />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">
                              {member.first_name} {member.last_name}
                            </h3>
                            <div className="flex items-center mt-1">
                              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getRoleBadge(member.role).color}`}>
                                {getRoleBadge(member.role).label}
                              </span>
                              {member.is_active === false && (
                                <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                                  Inactive
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Details */}
                      <div className="space-y-2 mt-4">
                        <div className="flex items-center text-sm">
                          <IdCard className="w-4 h-4 text-gray-400 mr-2" />
                          <span className="font-mono text-gray-600">{member.staff_id}</span>
                        </div>
                        <div className="flex items-center text-sm">
                          <Mail className="w-4 h-4 text-gray-400 mr-2" />
                          <span className="text-gray-600">{member.email}</span>
                        </div>
                        <div className="flex items-center text-sm">
                          <Phone className="w-4 h-4 text-gray-400 mr-2" />
                          <span className="text-gray-600">{member.phone}</span>
                        </div>
                        <div className="flex items-center text-sm">
                          <MapPin className="w-4 h-4 text-gray-400 mr-2" />
                          <span className="text-gray-600">{member.branch}</span>
                        </div>
                        <div className="flex items-center text-sm">
                          <Briefcase className="w-4 h-4 text-gray-400 mr-2" />
                          <span className="text-gray-600 capitalize">{member.role}</span>
                        </div>
                        <div className="flex items-center text-sm">
                          <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                          <span className="text-gray-600">
                            Joined {new Date(member.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex justify-end space-x-2 mt-6 pt-4 border-t border-gray-100">
                        <button
                          onClick={() => handleToggleStatus(member.id, member.is_active !== false)}
                          className={`p-2 rounded-lg transition-colors ${
                            member.is_active !== false
                              ? 'hover:bg-yellow-50 text-yellow-600'
                              : 'hover:bg-green-50 text-green-600'
                          }`}
                          title={member.is_active !== false ? 'Deactivate' : 'Activate'}
                        >
                          {member.is_active !== false ? (
                            <XCircle className="w-4 h-4" />
                          ) : (
                            <CheckCircle className="w-4 h-4" />
                          )}
                        </button>
                        <button 
                          className="p-2 hover:bg-yellow-50 rounded-lg text-yellow-600 transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        {user?.id !== member.id && (
                          <button 
                            onClick={() => handleDeleteClick(member)}
                            className="p-2 hover:bg-red-50 rounded-lg text-red-600 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </motion.div>
                  );
                })
              ) : (
                <div className="col-span-full bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500">
                  <UserCog className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-700 mb-2">No staff members found</h3>
                  <p className="mb-4">Get started by adding your first staff member</p>
                  <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="px-4 py-2 bg-gradient-to-r from-secondary-500 to-secondary-600 text-white rounded-lg hover:shadow-md transition-all inline-flex items-center"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Staff Member
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Table View */
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Staff ID</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Name</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Role</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Contact</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Branch</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Status</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredStaff.map((member) => {
                      const RoleIcon = getRoleBadge(member.role).icon;
                      return (
                        <tr key={member.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <span className="font-mono text-sm font-medium text-primary-600">
                              {member.staff_id}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-medium text-gray-900">
                              {member.first_name} {member.last_name}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              <RoleIcon className={`w-4 h-4 mr-2 ${
                                member.role === 'admin' ? 'text-purple-600' :
                                member.role === 'registrar' ? 'text-blue-600' :
                                'text-green-600'
                              }`} />
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleBadge(member.role).color}`}>
                                {getRoleBadge(member.role).label}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-600">{member.email}</div>
                            <div className="text-sm text-gray-500">{member.phone}</div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">{member.branch}</td>
                          <td className="px-6 py-4">
                            {member.is_active !== false ? (
                              <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                                Active
                              </span>
                            ) : (
                              <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                                Inactive
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => handleToggleStatus(member.id, member.is_active !== false)}
                              className={`p-2 rounded-lg mr-1 ${
                                member.is_active !== false
                                  ? 'text-yellow-600 hover:bg-yellow-50'
                                  : 'text-green-600 hover:bg-green-50'
                              }`}
                            >
                              {member.is_active !== false ? (
                                <XCircle className="w-4 h-4" />
                              ) : (
                                <CheckCircle className="w-4 h-4" />
                              )}
                            </button>
                            <button className="p-2 hover:bg-yellow-50 rounded-lg text-yellow-600 mr-1">
                              <Edit className="w-4 h-4" />
                            </button>
                            {user?.id !== member.id && (
                              <button 
                                onClick={() => handleDeleteClick(member)}
                                className="p-2 hover:bg-red-50 rounded-lg text-red-600"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* Add Staff Modal */}
      <AddStaffModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={(newStaff) => {
          toast.success(`✅ Staff created: ${newStaff.first_name} ${newStaff.last_name}`);
          fetchStaff();
        }}
      />

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && selectedStaff && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50" onClick={() => setIsDeleteModalOpen(false)}></div>
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative bg-white rounded-2xl shadow-xl w-full max-w-md"
            >
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-xl font-bold text-primary-800">Delete Staff Member</h3>
              </div>

              <div className="p-6">
                <div className="flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mx-auto mb-4">
                  <Trash2 className="w-8 h-8 text-red-600" />
                </div>
                
                <p className="text-center text-gray-700 mb-2">
                  Are you sure you want to delete this staff member?
                </p>
                <p className="text-center font-semibold text-gray-900 mb-4">
                  {selectedStaff.first_name} {selectedStaff.last_name} ({selectedStaff.staff_id})
                </p>

                <p className="text-center text-sm text-yellow-600 bg-yellow-50 p-3 rounded-lg mb-4">
                  <AlertCircle className="w-4 h-4 inline mr-1" />
                  This action cannot be undone.
                </p>

                <div className="flex space-x-3">
                  <button
                    onClick={() => setIsDeleteModalOpen(false)}
                    className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteStaff}
                    disabled={deleting}
                    className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                  >
                    {deleting ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </>
  );
};

export default Staff;