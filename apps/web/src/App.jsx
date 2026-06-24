import { BrowserRouter } from 'react-router-dom';
import RoutesConfig from './app/routes';
import Providers from './app/providers';
import './index.css';

function App() {
  return (
    <Providers>
      <BrowserRouter>
        <RoutesConfig />
      </BrowserRouter>
    </Providers>
  );
}

export default App;
