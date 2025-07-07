import React, { useState } from 'react';
import SalesJournalListPage from './SalesJournalListPage';
import SalesJournalCreatePage from './SalesJournalCreatePage';
import SalesJournalDetailPage from './SalesJournalDetailPage';

type ViewMode = 'list' | 'create' | 'detail';

const SalesJournalPage: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedJournalId, setSelectedJournalId] = useState<string | null>(null);

  const handleCreateNew = () => {
    setViewMode('create');
  };

  const handleBackToList = () => {
    setViewMode('list');
    setSelectedJournalId(null);
  };

  const handleViewJournal = (journalId: string) => {
    setSelectedJournalId(journalId);
    setViewMode('detail');
  };

  switch (viewMode) {
    case 'create':
      return <SalesJournalCreatePage onBack={handleBackToList} />;
    case 'detail':
      return <SalesJournalDetailPage journalId={selectedJournalId!} onBack={handleBackToList} />;
    default:
      return (
        <SalesJournalListPage
          onCreateNew={handleCreateNew}
          onViewJournal={handleViewJournal}
        />
      );
  }
};

export default SalesJournalPage;