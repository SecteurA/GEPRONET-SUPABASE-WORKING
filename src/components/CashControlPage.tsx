import React, { useState } from 'react';
import CashControlListPage from './CashControlListPage';
import CashControlFormPage from './CashControlFormPage';
import CashControlDetailPage from './CashControlDetailPage';

type ViewMode = 'list' | 'form' | 'detail';

const CashControlPage: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedControlId, setSelectedControlId] = useState<string | null>(null);

  const handleCreateNew = () => {
    setViewMode('form');
  };

  const handleBackToList = () => {
    setViewMode('list');
    setSelectedControlId(null);
  };

  const handleViewControl = (controlId: string) => {
    setSelectedControlId(controlId);
    setViewMode('detail');
  };

  switch (viewMode) {
    case 'form':
      return <CashControlFormPage onBack={handleBackToList} />;
    case 'detail':
      return <CashControlDetailPage controlId={selectedControlId!} onBack={handleBackToList} />;
    default:
      return (
        <CashControlListPage
          onCreateNew={handleCreateNew}
          onViewControl={handleViewControl}
        />
      );
  }
};

export default CashControlPage;