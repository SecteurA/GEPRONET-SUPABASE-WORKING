import React, { useState } from 'react';
import PurchaseOrderListPage from './PurchaseOrderListPage';
import PurchaseOrderFormPage from './PurchaseOrderFormPage';
import PurchaseOrderDetailPage from './PurchaseOrderDetailPage';

type ViewMode = 'list' | 'form' | 'detail';

interface PurchaseOrderPageProps {
  preFilledData?: any;
  onClearPreFilled?: () => void;
}

const PurchaseOrderPage: React.FC<PurchaseOrderPageProps> = ({ preFilledData, onClearPreFilled }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedPurchaseOrderId, setSelectedPurchaseOrderId] = useState<string | null>(null);

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
    setSelectedPurchaseOrderId(null);
    // Clear pre-filled data when going back to list
    if (onClearPreFilled) {
      onClearPreFilled();
    }
  };

  const handleViewPurchaseOrder = (purchaseOrderId: string) => {
    setSelectedPurchaseOrderId(purchaseOrderId);
    setViewMode('detail');
  };

  switch (viewMode) {
    case 'form':
      return <PurchaseOrderFormPage onBack={handleBackToList} preFilledData={preFilledData} />;
    case 'detail':
      return <PurchaseOrderDetailPage purchaseOrderId={selectedPurchaseOrderId!} onBack={handleBackToList} />;
    default:
      return (
        <PurchaseOrderListPage
          onCreateNew={handleCreateNew}
          onViewPurchaseOrder={handleViewPurchaseOrder}
        />
      );
  }
};

export default PurchaseOrderPage;