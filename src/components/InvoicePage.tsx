import React, { useState } from 'react';
import InvoiceListPage from './InvoiceListPage';
import InvoiceFormPage from './InvoiceFormPage';
import InvoiceDetailPage from './InvoiceDetailPage';

type ViewMode = 'list' | 'form' | 'detail';

interface InvoicePageProps {
  preFilledData?: any;
  onClearPreFilled?: () => void;
}

const InvoicePage: React.FC<InvoicePageProps> = ({ preFilledData, onClearPreFilled }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);

  // If we have pre-filled data, go to form mode immediately
  React.useEffect(() => {
    if (preFilledData) {
      setViewMode('form');
    }
  }, [preFilledData]);

  const handleCreateNew = () => {
    setViewMode('form');
  };

  const handleBackToList = () => {
    setViewMode('list');
    setSelectedInvoiceId(null);
    // Clear pre-filled data when going back to list
    if (onClearPreFilled) {
      onClearPreFilled();
    }
  };

  const handleViewInvoice = (invoiceId: string) => {
    setSelectedInvoiceId(invoiceId);
    setViewMode('detail');
  };

  switch (viewMode) {
    case 'form':
      return <InvoiceFormPage onBack={handleBackToList} preFilledData={preFilledData} />;
    case 'detail':
      return <InvoiceDetailPage invoiceId={selectedInvoiceId!} onBack={handleBackToList} />;
    default:
      return (
        <InvoiceListPage
          onCreateNew={handleCreateNew}
          onViewInvoice={handleViewInvoice}
        />
      );
  }
};

export default InvoicePage;