import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { registrationService } from '../../api/services/registrationService';

export const fetchRegistrations = createAsyncThunk(
  'registrations/fetchRegistrations',
  async (params, { rejectWithValue }) => {
    try {
      const response = await registrationService.getRegistrations(params);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const createRegistration = createAsyncThunk(
  'registrations/createRegistration',
  async (registrationData, { rejectWithValue }) => {
    try {
      const response = await registrationService.createRegistration(registrationData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

const registrationSlice = createSlice({
  name: 'registrations',
  initialState: {
    items: [],
    selectedRegistration: null,
    isLoading: false,
    error: null,
    pagination: {
      total: 0,
      pages: 1,
      currentPage: 1,
      perPage: 10,
    },
  },
  reducers: {
    setSelectedRegistration: (state, action) => {
      state.selectedRegistration = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchRegistrations.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchRegistrations.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items = action.payload.registrations;
        state.pagination = {
          total: action.payload.total,
          pages: action.payload.pages,
          currentPage: action.payload.current_page,
          perPage: action.payload.per_page,
        };
      })
      .addCase(fetchRegistrations.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      .addCase(createRegistration.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createRegistration.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items.unshift(action.payload.registration);
      })
      .addCase(createRegistration.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });
  },
});

export const { setSelectedRegistration, clearError } = registrationSlice.actions;
export default registrationSlice.reducer;