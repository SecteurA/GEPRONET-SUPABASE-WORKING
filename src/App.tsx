import React from 'react';
import { useState } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import VentesPage from './components/VentesPage';
import SettingsPage from './components/SettingsPage';
import ClientsPage from './components/ClientsPage';
import InvoicePage from './components/InvoicePage';

function App() {
  const [activeSection, setActiveSection] = useState('dashboard');

  const renderContent = () => {
    switch (activeSection) {
      case 'ventes':
        return <VentesPage />;
      case 'factures':
        return <InvoicePage />;
      case 'settings':
        return <SettingsPage />;
      case 'clients':
        return <ClientsPage />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <AuthProvider>
      <ProtectedRoute>
        <Layout 
          onSettingsClick={() => setActiveSection('settings')}
          activeSection={activeSection}
          onSectionChange={setActiveSection}
        >
          {renderContent()}
        </Layout>
      </ProtectedRoute>
    </AuthProvider>
  );
}

export default App;