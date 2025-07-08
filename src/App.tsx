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
import QuotePage from './components/QuotePage';
import SalesJournalPage from './components/SalesJournalPage';
import SuppliersPage from './components/SuppliersPage';
import PurchaseOrderPage from './components/PurchaseOrderPage';

function App() {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [preFilledInvoiceData, setPreFilledInvoiceData] = useState<any>(null);
  const [preFilledQuoteData, setPreFilledQuoteData] = useState<any>(null);

  const handleGenerateInvoiceFromOrder = (orderData: any) => {
    setPreFilledInvoiceData(orderData);
    setActiveSection('factures');
  };

  const handleGenerateInvoiceFromDeliveryNotes = (invoiceData: any) => {
    setPreFilledInvoiceData(invoiceData);
    setActiveSection('factures');
  };

  const handleGenerateInvoiceFromQuote = (invoiceData: any) => {
    setPreFilledInvoiceData(invoiceData);
    setActiveSection('factures');
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'ventes':
        return <VentesPage onGenerateInvoice={handleGenerateInvoiceFromOrder} />;
      case 'journal':
        return <SalesJournalPage />;
      case 'factures':
        return <InvoicePage 
          preFilledData={preFilledInvoiceData} 
          onClearPreFilled={() => setPreFilledInvoiceData(null)}
        />;
      case 'livraison':
        return <DeliveryNotePage onGenerateInvoice={handleGenerateInvoiceFromDeliveryNotes} />;
      case 'retour':
        return <ReturnNotePage />;
      case 'devis':
        return <QuotePage 
          preFilledData={preFilledQuoteData} 
          onClearPreFilled={() => setPreFilledQuoteData(null)}
          onGenerateInvoice={handleGenerateInvoiceFromQuote}
        />;
      case 'commandes':
        return <PurchaseOrderPage />;
      case 'fournisseurs':
        return <SuppliersPage />;
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