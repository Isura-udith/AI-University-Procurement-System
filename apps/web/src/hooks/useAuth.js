import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { setCredentials, logout as logoutAction } from '../app/store';
import authService from '../services/auth.service';

export function useAuth() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, isAuthenticated, loading } = useSelector((state) => state.auth);

  const login = async (email, password) => {
    const res = await authService.login({ email, password });
    dispatch(setCredentials(res.data));
    navigate('/dashboard');
    return res;
  };

  const register = async (data) => {
    const res = await authService.register(data);
    dispatch(setCredentials(res.data));
    navigate('/dashboard');
    return res;
  };

  const logout = () => {
    dispatch(logoutAction());
    navigate('/login');
  };

  return { user, isAuthenticated, loading, login, register, logout };
}

export default useAuth;
