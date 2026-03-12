import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { authService } from '../../api/services/authService';

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const location = useLocation();
  const token = localStorage.getItem('token');
  const userRole = authService.getUserRole();

  // Check if user is authenticated
  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role-based access if specified
  if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
    // Redirect based on role
    switch(userRole) {
      case 'admin':
        return <Navigate to="/admin/dashboard" replace />;
      case 'registrar':
      case 'field_agent':
        return <Navigate to="/staff/dashboard" replace />;
      case 'student':
        return <Navigate to="/student/dashboard" replace />;
      default:
        return <Navigate to="/login" replace />;
    }
  }

  return children;
};

export default ProtectedRoute;