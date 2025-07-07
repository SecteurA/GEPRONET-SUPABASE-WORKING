import React, { useState } from 'react';
import InvoiceListPage from './InvoiceListPage';
import InvoiceFormPage from './InvoiceFormPage';
import InvoiceDetailPage from './InvoiceDetailPage';

type ViewMode = 'list' | 'form' | 'detail';

interface InvoicePageProps {
  preFilledData?: any;
  onClearPreFilled?: () => void;
  onGenerateDeliveryNote?: (deliveryNoteData: any) => void;
  onGenerateReturnNote?: (returnNoteData: any) => void;
}

const InvoicePage: React.FC<InvoicePageProps> = ({ preFilledData, onClearPreFilled, onGenerateDeliveryNote, onGenerateReturnNote }) => {
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

  const handleGenerateDeliveryNote = (deliveryNoteData: any) => {
    // Pass the delivery note data to parent component for navigation
    if (onGenerateDeliveryNote) {
      onGenerateDeliveryNote(deliveryNoteData);
    }
  };

  const handleGenerateReturnNote = (returnNoteData: any) => {
    // Pass the return note data to parent component for navigation
    if (onGenerateReturnNote) {
      onGenerateReturnNote(returnNoteData);
    }
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
          onGenerateDeliveryNote={handleGenerateDeliveryNote}
          onGenerateReturnNote={handleGenerateReturnNote}
        />
      );
  }
};

export default InvoicePage;