import React, { useState } from 'react';
import DeliveryNoteListPage from './DeliveryNoteListPage';
import DeliveryNoteFormPage from './DeliveryNoteFormPage';
import DeliveryNoteDetailPage from './DeliveryNoteDetailPage';

type ViewMode = 'list' | 'form' | 'detail';

interface DeliveryNotePageProps {
  preFilledData?: any;
  onClearPreFilled?: () => void;
}

const DeliveryNotePage: React.FC<DeliveryNotePageProps> = ({ preFilledData, onClearPreFilled }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedDeliveryNoteId, setSelectedDeliveryNoteId] = useState<string | null>(null);

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
    setSelectedDeliveryNoteId(null);
    // Clear pre-filled data when going back to list
    if (onClearPreFilled) {
      onClearPreFilled();
    }
  };

  const handleViewDeliveryNote = (deliveryNoteId: string) => {
    setSelectedDeliveryNoteId(deliveryNoteId);
    setViewMode('detail');
  };

  switch (viewMode) {
    case 'form':
      return <DeliveryNoteFormPage onBack={handleBackToList} preFilledData={preFilledData} />;
    case 'detail':
      return <DeliveryNoteDetailPage deliveryNoteId={selectedDeliveryNoteId!} onBack={handleBackToList} />;
    default:
      return (
        <DeliveryNoteListPage
          onCreateNew={handleCreateNew}
          onViewDeliveryNote={handleViewDeliveryNote}
        />
      );
  }
};

export default DeliveryNotePage;