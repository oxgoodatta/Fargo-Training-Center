import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { studentService } from '../../api/services/studentService';

export const fetchStudents = createAsyncThunk(
  'students/fetchStudents',
  async (params, { rejectWithValue }) => {
    try {
      const response = await studentService.getStudents(params);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const createStudent = createAsyncThunk(
  'students/createStudent',
  async (studentData, { rejectWithValue }) => {
    try {
      const response = await studentService.createStudent(studentData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

const studentSlice = createSlice({
  name: 'students',
  initialState: {
    items: [],
    selectedStudent: null,
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
    setSelectedStudent: (state, action) => {
      state.selectedStudent = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchStudents.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchStudents.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items = action.payload.students;
        state.pagination = {
          total: action.payload.total,
          pages: action.payload.pages,
          currentPage: action.payload.current_page,
          perPage: action.payload.per_page,
        };
      })
      .addCase(fetchStudents.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      .addCase(createStudent.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createStudent.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items.unshift(action.payload.student);
      })
      .addCase(createStudent.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });
  },
});

export const { setSelectedStudent, clearError } = studentSlice.actions;
export default studentSlice.reducer;