import React, { useState, useEffect } from 'react';
import DeliveryNoteListPage from './DeliveryNoteListPage';
import DeliveryNoteFormPage from './DeliveryNoteFormPage';
import DeliveryNoteDetailPage from './DeliveryNoteDetailPage';
import DeliveryNoteEditPage from './DeliveryNoteEditPage';

type ViewMode = 'list' | 'form' | 'detail' | 'edit';

interface DeliveryNotePageProps {
  onGenerateInvoice?: (invoiceData: any) => void;
  onViewInvoice?: (invoiceId: string) => void;
}

const DeliveryNotePage: React.FC<DeliveryNotePageProps> = ({ onGenerateInvoice, onViewInvoice }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedDeliveryNoteId, setSelectedDeliveryNoteId] = useState<string | null>(null);

  const handleCreateNew = () => {
    setViewMode('form');
  };

  const handleBackToList = () => {
    setViewMode('list');
    setSelectedDeliveryNoteId(null);
  };

  const handleViewDeliveryNote = (deliveryNoteId: string) => {
    setSelectedDeliveryNoteId(deliveryNoteId);
    setViewMode('detail');
  };

  const handleEditDeliveryNote = (deliveryNoteId: string) => {
    setSelectedDeliveryNoteId(deliveryNoteId);
    setViewMode('edit');
  };

  // Listen for edit navigation from detail page
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#edit-')) {
        const deliveryNoteId = hash.replace('#edit-', '');
        handleEditDeliveryNote(deliveryNoteId);
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
      return <DeliveryNoteFormPage onBack={handleBackToList} />;
    case 'edit':
      return <DeliveryNoteEditPage deliveryNoteId={selectedDeliveryNoteId!} onBack={handleBackToList} />;
    case 'detail':
      return <DeliveryNoteDetailPage deliveryNoteId={selectedDeliveryNoteId!} onBack={handleBackToList} />;
    default:
      return (
        <DeliveryNoteListPage
          onCreateNew={handleCreateNew}
          onViewDeliveryNote={handleViewDeliveryNote}
          onEditDeliveryNote={handleEditDeliveryNote}
          onGenerateInvoice={onGenerateInvoice}
          onViewInvoice={onViewInvoice}
        />
      );
  }
};

export default DeliveryNotePage;