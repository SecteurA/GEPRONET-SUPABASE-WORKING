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
import DeliveryNotePage from './components/DeliveryNotePage';
import ReturnNotePage from './components/ReturnNotePage';

function App() {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [preFilledInvoiceData, setPreFilledInvoiceData] = useState<any>(null);
  const [preFilledDeliveryNoteData, setPreFilledDeliveryNoteData] = useState<any>(null);
  const [preFilledReturnNoteData, setPreFilledReturnNoteData] = useState<any>(null);

  const handleGenerateInvoiceFromOrder = (orderData: any) => {
    setPreFilledInvoiceData(orderData);
    setActiveSection('factures');
  };

  const handleGenerateDeliveryNoteFromInvoice = (deliveryNoteData: any) => {
    setPreFilledDeliveryNoteData(deliveryNoteData);
    setActiveSection('livraison');
  };

  const handleGenerateReturnNoteFromInvoice = (returnNoteData: any) => {
    setPreFilledReturnNoteData(returnNoteData);
    setActiveSection('retour');
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'ventes':
        return <VentesPage onGenerateInvoice={handleGenerateInvoiceFromOrder} />;
      case 'factures':
        return <InvoicePage 
          preFilledData={preFilledInvoiceData} 
          onClearPreFilled={() => setPreFilledInvoiceData(null)}
          onGenerateDeliveryNote={handleGenerateDeliveryNoteFromInvoice}
          onGenerateReturnNote={handleGenerateReturnNoteFromInvoice}
        />;
      case 'livraison':
        return <DeliveryNotePage 
          preFilledData={preFilledDeliveryNoteData} 
          onClearPreFilled={() => setPreFilledDeliveryNoteData(null)} 
        />;
      case 'retour':
        return <ReturnNotePage 
          preFilledData={preFilledReturnNoteData} 
          onClearPreFilled={() => setPreFilledReturnNoteData(null)} 
        />;
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