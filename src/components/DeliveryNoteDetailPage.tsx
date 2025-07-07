import React, { useState, useEffect } from 'react';
import { ArrowLeft, Printer } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface DeliveryNoteLineItem {
  id: string;
  product_id: string;
  product_sku: string;
  product_name: string;
  quantity: number;
}

interface DeliveryNoteDetail {
  id: string;
  delivery_note_number: string;
  invoice_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_address: string;
  delivery_date: string;
  status: string;
  notes: string;
  created_at: string;
  updated_at: string;
  line_items: DeliveryNoteLineItem[];
}

interface DeliveryNoteDetailPageProps {
  deliveryNoteId: string;
  onBack: () => void;
}

const DeliveryNoteDetailPage: React.FC<DeliveryNoteDetailPageProps> = ({ deliveryNoteId, onBack }) => {
  const [deliveryNote, setDeliveryNote] = useState<DeliveryNoteDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDeliveryNoteDetail();
  }, [deliveryNoteId]);

  const fetchDeliveryNoteDetail = async () => {
    try {
      setLoading(true);
      setError('');

      // Get delivery note details
      const { data: deliveryNoteData, error: deliveryNoteError } = await supabase
        .from('delivery_notes')
        .select('*')
        .eq('id', deliveryNoteId)
        .single();

      if (deliveryNoteError) {
        setError('Bon de livraison non trouvé');
        return;
      }

      // Get line items for the delivery note
      const { data: lineItems, error: lineItemsError } = await supabase
        .from('delivery_note_line_items')
        .select('*')
        .eq('delivery_note_id', deliveryNoteId)
        .order('created_at', { ascending: true });

      if (lineItemsError) {
        console.error('Error fetching line items:', lineItemsError);
      }

      setDeliveryNote({
        ...deliveryNoteData,
        line_items: lineItems || []
      });
    } catch (err) {
      setError('Erreur lors du chargement du bon de livraison');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'En attente';
      case 'delivered':
        return 'Livré';
      case 'cancelled':
        return 'Annulé';
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-[#21522f] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement du bon de livraison...</p>
        </div>
      </div>
    );
  }

  if (error || !deliveryNote) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-[#21522f] transition-colors duration-200"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retour</span>
          </button>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
          <p className="text-red-700">{error || 'Bon de livraison non trouvé'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between print:hidden">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-[#21522f] transition-colors duration-200"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Retour</span>
        </button>
        <div className="flex space-x-3">
          <button
            onClick={handlePrint}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimer</span>
          </button>
        </div>
      </div>

      {/* Delivery Note Layout */}
      <div className="bg-white shadow-sm border border-gray-200 rounded-lg p-8 print:shadow-none print:border-none">
        {/* Header */}
        <div className="border-b border-gray-200 pb-6 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <img 
                src="https://pub-237d2da54b564d23aaa1c3826e1d4e65.r2.dev/gepronet/gepronet.png" 
                alt="Gepronet Logo" 
                className="w-48 h-auto mb-4"
              />
            </div>
            <div className="text-right">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">BON DE LIVRAISON</h1>
              <p className="text-lg font-semibold text-gray-700">{deliveryNote.delivery_note_number}</p>
              <p className="text-sm text-gray-600">Date: {formatDate(deliveryNote.delivery_date)}</p>
              <div className="mt-2">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(deliveryNote.status)}`}>
                  {getStatusText(deliveryNote.status)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Customer Information */}
        <div className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Livré à:</h3>
              <div className="text-gray-700">
                <p className="font-semibold">{deliveryNote.customer_name}</p>
                {deliveryNote.customer_email && <p>{deliveryNote.customer_email}</p>}
                {deliveryNote.customer_phone && <p>{deliveryNote.customer_phone}</p>}
                {deliveryNote.customer_address && (
                  <p className="mt-2 whitespace-pre-line">{deliveryNote.customer_address}</p>
                )}
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Détails du bon de livraison:</h3>
              <div className="text-gray-700 space-y-1">
                <p><span className="font-medium">Numéro:</span> {deliveryNote.delivery_note_number}</p>
                <p><span className="font-medium">Date de livraison:</span> {formatDate(deliveryNote.delivery_date)}</p>
                <p><span className="font-medium">Statut:</span> <span className="capitalize">{getStatusText(deliveryNote.status)}</span></p>
              </div>
            </div>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Articles à livrer</h3>
          {deliveryNote.line_items && deliveryNote.line_items.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-900">Référence</th>
                    <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-900">Article</th>
                    <th className="border border-gray-300 px-4 py-3 text-center text-sm font-semibold text-gray-900">Quantité</th>
                  </tr>
                </thead>
                <tbody>
                  {deliveryNote.line_items.map((item, index) => (
                    <tr key={item.id || index} className="hover:bg-gray-50">
                      <td className="border border-gray-300 px-4 py-3 text-sm text-gray-600">{item.product_sku || '-'}</td>
                      <td className="border border-gray-300 px-4 py-3 text-sm text-gray-900">{item.product_name}</td>
                      <td className="border border-gray-300 px-4 py-3 text-center text-sm text-gray-900">{item.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              Aucun article trouvé pour ce bon de livraison
            </div>
          )}
        </div>

        {/* Notes */}
        {deliveryNote.notes && (
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Notes:</h3>
            <p className="text-gray-700 whitespace-pre-line">{deliveryNote.notes}</p>
          </div>
        )}

        {/* Signature Section */}
        <div className="mt-12 pt-6 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Signature du livreur:</h4>
              <div className="border border-gray-300 h-20 rounded"></div>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Signature du client:</h4>
              <div className="border border-gray-300 h-20 rounded"></div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-gray-200 text-center text-sm text-gray-600">
          <p>Merci pour votre confiance!</p>
          <p className="mt-2">Gepronet - Gestion Professionnelle</p>
        </div>
      </div>
    </div>
  );
};

export default DeliveryNoteDetailPage;