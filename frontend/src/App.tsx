import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import NewPlant from './pages/NewPlant';
import PlantDetail from './pages/PlantDetail';
import EditPlant from './pages/EditPlant';
import NewRecord from './pages/NewRecord';
import EditRecord from './pages/EditRecord';
import Report from './pages/Report';
import SensorsManagement from './components/SensorsManagement';
import RecordReading from './components/RecordReading';
import './styles/global.css';

function Navigation() {
  const location = useLocation();
  
  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === path ? 'active' : '';
    }
    return location.pathname.startsWith(path) ? 'active' : '';
  };

  return (
    <nav className="nav">
      <ul className="nav-list">
        <li>
          <Link to="/" className={`nav-link ${isActive('/')}`}>
            🏠 Início
          </Link>
        </li>
        <li>
          <Link to="/report" className={`nav-link ${isActive('/report')}`}>
            📊 Relatório
          </Link>
        </li>
      </ul>
    </nav>
  );
}

function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <header className="header">
          <h1>🌱 Sistema de Gerenciamento de Cultivo</h1>
          <p style={{ marginTop: '0.5rem', opacity: 0.9 }}>
            Monitore e gerencie suas plantas com facilidade
          </p>
        </header>

        <Navigation />

        <main style={{ minHeight: 'calc(100vh - 250px)', paddingBottom: '2rem' }}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/new" element={<NewPlant />} />
            <Route path="/report" element={<Report />} />
            <Route path="/plant/:id" element={<PlantDetail />} />
            <Route path="/plant/:id/edit" element={<EditPlant />} />
            <Route path="/plant/:id/new-record" element={<NewRecord />} />
            <Route path="/plant/:id/record/:recordId/edit" element={<EditRecord />} />
            <Route path="/sensors" element={<SensorsManagement />} />
            <Route path="/record-reading" element={<RecordReading />} />
          </Routes>
        </main>

        <footer style={{ 
          textAlign: 'center', 
          padding: '2rem', 
          color: 'var(--text-light)',
          borderTop: '1px solid var(--border)'
        }}>
          <p>🌱 Sistema de Gerenciamento de Cultivo - {new Date().getFullYear()}</p>
        </footer>
      </div>
    </BrowserRouter>
  );
}

export default App;
