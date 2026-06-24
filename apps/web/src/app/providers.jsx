import { Provider } from 'react-redux';
import { ToastContainer } from 'react-toastify';
import store from './store';
import 'react-toastify/dist/ReactToastify.css';

export default function Providers({ children }) {
  return (
    <Provider store={store}>
      {children}
      <ToastContainer position="top-right" autoClose={4000} hideProgressBar={false} closeOnClick pauseOnHover theme="light" />
    </Provider>
  );
}
