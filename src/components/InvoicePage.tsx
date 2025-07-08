import React, { useState } from 'react';
import InvoiceListPage from './InvoiceListPage';
import InvoiceFormPage from './InvoiceFormPage';
import InvoiceDetailPage from './InvoiceDetailPage';
import InvoiceEditPage from './InvoiceEditPage';

type ViewMode = 'list' | 'form' | 'detail' | 'edit';

interface InvoicePageProps {
  preFilledData?: any;
  onClearPreFilled?: () => void;
  selectedInvoiceId?: string | null;
}

const InvoicePage: React.FC<InvoicePageProps> = ({ preFilledData, onClearPreFilled, selectedInvoiceId }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [currentInvoiceId, setCurrentInvoiceId] = useState<string | null>(null);

  // If we have pre-filled data, go to form mode immediately
  React.useEffect(() => {
    if (preFilledData) {
      setViewMode('form');
    }
  }, [preFilledData]);

  // If we have a selected invoice ID, go to detail mode immediately
  React.useEffect(() => {
    if (selectedInvoiceId) {
      setCurrentInvoiceId(selectedInvoiceId);
      setViewMode('detail');
    }
  }, [selectedInvoiceId]);

  const handleCreateNew = () => {
    setViewMode('form');
  };

  const handleBackToList = () => {
    setViewMode('list');
    setCurrentInvoiceId(null);
    // Clear pre-filled data when going back to list
    if (onClearPreFilled) {
      onClearPreFilled();
    }
  };

  const handleViewInvoice = (invoiceId: string) => {
    setCurrentInvoiceId(invoiceId);
    setViewMode('detail');
  };

  const handleEditInvoice = (invoiceId: string) => {
    setCurrentInvoiceId(invoiceId);
    setViewMode('edit');
  };

  // Listen for edit navigation from detail page
  React.useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#edit-invoice-')) {
        const invoiceId = hash.replace('#edit-invoice-', '');
        handleEditInvoice(invoiceId);
        // Clear the hash
        window.location.hash = '';
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    // Check on mount
    handleHashChange();

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  switch (viewMode) {
    case 'form':
      return <InvoiceFormPage onBack={handleBackToList} preFilledData={preFilledData} />;
    case 'edit':
      return <InvoiceEditPage invoiceId={currentInvoiceId!} onBack={handleBackToList} />;
    case 'detail':
      return <InvoiceDetailPage invoiceId={currentInvoiceId!} onBack={handleBackToList} />;
    default:
      return (
        <InvoiceListPage
          onCreateNew={handleCreateNew}
          onViewInvoice={handleViewInvoice}
          onEditInvoice={handleEditInvoice}
        />
      );
  }
};

export default InvoicePage;