import { configureStore, createSlice } from '@reduxjs/toolkit';

// Auth Slice
const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: JSON.parse(localStorage.getItem('user') || 'null'),
    token: localStorage.getItem('token') || null,
    isAuthenticated: !!localStorage.getItem('token'),
    loading: false,
  },
  reducers: {
    setCredentials: (state, action) => {
      state.user = action.payload.user;
      state.token = action.payload.accessToken;
      state.isAuthenticated = true;
      state.loading = false;
      localStorage.setItem('user', JSON.stringify(action.payload.user));
      localStorage.setItem('token', action.payload.accessToken);
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      localStorage.removeItem('user');
      localStorage.removeItem('token');
    },
    setLoading: (state, action) => { state.loading = action.payload; },
  },
});

// UI Slice
const uiSlice = createSlice({
  name: 'ui',
  initialState: { sidebarOpen: false, notifications: [], unreadCount: 0 },
  reducers: {
    toggleSidebar: (state) => { state.sidebarOpen = !state.sidebarOpen; },
    setNotifications: (state, action) => { state.notifications = action.payload; },
    setUnreadCount: (state, action) => { state.unreadCount = action.payload; },
  },
});

export const { setCredentials, logout, setLoading } = authSlice.actions;
export const { toggleSidebar, setNotifications, setUnreadCount } = uiSlice.actions;

const store = configureStore({
  reducer: {
    auth: authSlice.reducer,
    ui: uiSlice.reducer,
  },
});

export default store;
