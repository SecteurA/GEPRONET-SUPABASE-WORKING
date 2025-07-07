import React, { useState } from 'react';
import ReturnNoteListPage from './ReturnNoteListPage';
import ReturnNoteFormPage from './ReturnNoteFormPage';
import ReturnNoteDetailPage from './ReturnNoteDetailPage';

type ViewMode = 'list' | 'form' | 'detail';

interface ReturnNotePageProps {
  preFilledData?: any;
  onClearPreFilled?: () => void;
}

const ReturnNotePage: React.FC<ReturnNotePageProps> = ({ preFilledData, onClearPreFilled }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedReturnNoteId, setSelectedReturnNoteId] = useState<string | null>(null);

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
    setSelectedReturnNoteId(null);
    // Clear pre-filled data when going back to list
    if (onClearPreFilled) {
      onClearPreFilled();
    }
  };

  const handleViewReturnNote = (returnNoteId: string) => {
    setSelectedReturnNoteId(returnNoteId);
    setViewMode('detail');
  };

  switch (viewMode) {
    case 'form':
      return <ReturnNoteFormPage onBack={handleBackToList} preFilledData={preFilledData} />;
    case 'detail':
      return <ReturnNoteDetailPage returnNoteId={selectedReturnNoteId!} onBack={handleBackToList} />;
    default:
      return (
        <ReturnNoteListPage
          onCreateNew={handleCreateNew}
          onViewReturnNote={handleViewReturnNote}
        />
      );
  }
};

export default ReturnNotePage;