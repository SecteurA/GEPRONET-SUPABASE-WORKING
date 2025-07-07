import React, { useState } from 'react';
import DeliveryNoteListPage from './DeliveryNoteListPage';
import DeliveryNoteDetailPage from './DeliveryNoteDetailPage';

type ViewMode = 'list' | 'detail';

const DeliveryNotePage: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedDeliveryNoteId, setSelectedDeliveryNoteId] = useState<string | null>(null);

  const handleBackToList = () => {
    setViewMode('list');
    setSelectedDeliveryNoteId(null);
  };

  const handleViewDeliveryNote = (deliveryNoteId: string) => {
    setSelectedDeliveryNoteId(deliveryNoteId);
    setViewMode('detail');
  };

  switch (viewMode) {
    case 'detail':
      return <DeliveryNoteDetailPage deliveryNoteId={selectedDeliveryNoteId!} onBack={handleBackToList} />;
    default:
      return (
        <DeliveryNoteListPage
          onViewDeliveryNote={handleViewDeliveryNote}
        />
      );
  }
};

export default DeliveryNotePage;