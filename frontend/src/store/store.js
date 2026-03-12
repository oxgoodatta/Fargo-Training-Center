import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import studentReducer from './slices/studentSlice';
import registrationReducer from './slices/registrationSlice';
import staffReducer from './slices/staffSlice';
import uiReducer from './slices/uiSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    students: studentReducer,
    registrations: registrationReducer,
    staff: staffReducer,
    ui: uiReducer,
  },
});