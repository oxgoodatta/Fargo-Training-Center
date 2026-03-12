import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { staffService } from '../../api/services/staffService';

export const fetchStaff = createAsyncThunk(
  'staff/fetchStaff',
  async (params, { rejectWithValue }) => {
    try {
      const response = await staffService.getStaff(params);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const createStaff = createAsyncThunk(
  'staff/createStaff',
  async (staffData, { rejectWithValue }) => {
    try {
      const response = await staffService.createStaff(staffData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

const staffSlice = createSlice({
  name: 'staff',
  initialState: {
    items: [],
    dropdown: [],
    selectedStaff: null,
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
    setSelectedStaff: (state, action) => {
      state.selectedStaff = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchStaff.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchStaff.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items = action.payload.staff;
        state.pagination = {
          total: action.payload.total,
          pages: action.payload.pages,
          currentPage: action.payload.current_page,
          perPage: action.payload.per_page,
        };
      })
      .addCase(fetchStaff.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      .addCase(createStaff.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createStaff.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items.unshift(action.payload.staff);
      })
      .addCase(createStaff.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });
  },
});

export const { setSelectedStaff, clearError } = staffSlice.actions;
export default staffSlice.reducer;