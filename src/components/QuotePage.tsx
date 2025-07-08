import React, { useState } from 'react';
import QuoteListPage from './QuoteListPage';
import QuoteFormPage from './QuoteFormPage';
import QuoteDetailPage from './QuoteDetailPage';
import QuoteEditPage from './QuoteEditPage';

type ViewMode = 'list' | 'form' | 'detail' | 'edit';

interface QuotePageProps {
  preFilledData?: any;
  onClearPreFilled?: () => void;
  onGenerateInvoice?: (invoiceData: any) => void;
}

const QuotePage: React.FC<QuotePageProps> = ({ preFilledData, onClearPreFilled, onGenerateInvoice }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);

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
    setSelectedQuoteId(null);
    // Clear pre-filled data when going back to list
    if (onClearPreFilled) {
      onClearPreFilled();
    }
  };

  const handleViewQuote = (quoteId: string) => {
    setSelectedQuoteId(quoteId);
    setViewMode('detail');
  };

  const handleEditQuote = (quoteId: string) => {
    setSelectedQuoteId(quoteId);
    setViewMode('edit');
  };

  // Listen for edit navigation from detail page
  React.useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#edit-')) {
        const quoteId = hash.replace('#edit-quote-', '');
        handleEditQuote(quoteId);
        // Clear the hash
        window.location.hash = '';
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    // Check on mount
    handleHashChange();

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleGenerateInvoice = (invoiceData: any) => {
    // Pass the invoice data to parent component for navigation
    if (onGenerateInvoice) {
      onGenerateInvoice(invoiceData);
    }
  };

  switch (viewMode) {
    case 'form':
      return <QuoteFormPage onBack={handleBackToList} preFilledData={preFilledData} />;
    case 'edit':
      return <QuoteEditPage quoteId={selectedQuoteId!} onBack={handleBackToList} />;
    case 'detail':
      return <QuoteDetailPage quoteId={selectedQuoteId!} onBack={handleBackToList} onEditQuote={handleEditQuote} />;
    default:
      return (
        <QuoteListPage
          onCreateNew={handleCreateNew}
          onViewQuote={handleViewQuote}
          onEditQuote={handleEditQuote}
          onGenerateInvoice={handleGenerateInvoice}
        />
      );
  }
};

export default QuotePage;