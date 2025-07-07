import React, { useState } from 'react';
import InvoiceListPage from './InvoiceListPage';
import InvoiceFormPage from './InvoiceFormPage';
import InvoiceDetailPage from './InvoiceDetailPage';

type ViewMode = 'list' | 'form' | 'detail';

const InvoicePage: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);

  const handleCreateNew = () => {
    setViewMode('form');
  };

  const handleBackToList = () => {
    setViewMode('list');
    setSelectedInvoiceId(null);
  };

  const handleViewInvoice = (invoiceId: string) => {
    setSelectedInvoiceId(invoiceId);
    setViewMode('detail');
  };

  switch (viewMode) {
    case 'form':
      return <InvoiceFormPage onBack={handleBackToList} />;
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