import React, { useState } from 'react';
import QuoteListPage from './QuoteListPage';
import QuoteFormPage from './QuoteFormPage';
import QuoteDetailPage from './QuoteDetailPage';

type ViewMode = 'list' | 'form' | 'detail';

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

  const handleGenerateInvoice = (invoiceData: any) => {
    // Pass the invoice data to parent component for navigation
    if (onGenerateInvoice) {
      onGenerateInvoice(invoiceData);
    }
  };

  switch (viewMode) {
    case 'form':
      return <QuoteFormPage onBack={handleBackToList} preFilledData={preFilledData} />;
    case 'detail':
      return <QuoteDetailPage quoteId={selectedQuoteId!} onBack={handleBackToList} />;
    default:
      return (
        <QuoteListPage
          onCreateNew={handleCreateNew}
          onViewQuote={handleViewQuote}
          onGenerateInvoice={handleGenerateInvoice}
        />
      );
  }
};

export default QuotePage;