import React, { useState, useEffect } from 'react';
import { ArrowLeft, Printer, Save } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ReturnNoteLineItem {
  id: string;
  product_id: string;
  product_sku: string;
  product_name: string;
  quantity_returned: number;
  unit_price_ht: number;
  total_ht: number;
}

interface ReturnNoteDetail {
  id: string;
  return_note_number: string;
  invoice_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_address: string;
  return_date: string;
  status: string;
  reason: string;
  notes: string;
  created_at: string;
  updated_at: string;
  line_items: ReturnNoteLineItem[];
}

interface ReturnNoteDetailPageProps {
  returnNoteId: string;
  onBack: () => void;
}

const ReturnNoteDetailPage: React.FC<ReturnNoteDetailPageProps> = ({ returnNoteId, onBack }) => {
  const [returnNote, setReturnNote] = useState<ReturnNoteDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingStatus, setEditingStatus] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchReturnNoteDetail();
  }, [returnNoteId]);

  const fetchReturnNoteDetail = async () => {
    try {
      setLoading(true);
      setError('');

      // Get return note details
      const { data: returnNoteData, error: returnNoteError } = await supabase
        .from('return_notes')
        .select('*')
        .eq('id', returnNoteId)
        .single();

      if (returnNoteError) {
        setError('Bon de retour non trouvé');
        return;
      }

      // Get line items for the return note
      const { data: lineItems, error: lineItemsError } = await supabase
        .from('return_note_line_items')
        .select('*')
        .eq('return_note_id', returnNoteId)
        .order('created_at', { ascending: true });

      if (lineItemsError) {
        console.error('Error fetching line items:', lineItemsError);
      }

      setReturnNote({
        ...returnNoteData,
        line_items: lineItems || []
      });
      setNewStatus(returnNoteData.status);
    } catch (err) {
      setError('Erreur lors du chargement du bon de retour');
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
      case 'processed':
        return 'Traité';
      case 'rejected':
        return 'Rejeté';
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'processed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleStatusSave = async () => {
    if (!returnNote || newStatus === returnNote.status) {
      setEditingStatus(false);
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const { error: updateError } = await supabase
        .from('return_notes')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', returnNoteId);

      if (updateError) {
        setError('Erreur lors de la mise à jour du statut');
        return;
      }

      setReturnNote(prev => prev ? { ...prev, status: newStatus } : null);
      setEditingStatus(false);
      setSuccess('Statut mis à jour avec succès');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);

    } catch (err) {
      setError('Erreur lors de la mise à jour du statut');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusCancel = () => {
    setNewStatus(returnNote?.status || '');
    setEditingStatus(false);
  };

  const calculateTotals = () => {
    if (!returnNote?.line_items) return { totalRefund: 0 };
    const totalRefund = returnNote.line_items.reduce((sum, item) => sum + item.total_ht, 0);
    return { totalRefund };
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-[#21522f] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement du bon de retour...</p>
        </div>
      </div>
    );
  }

  if (error || !returnNote) {
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
          <p className="text-red-700">{error || 'Bon de retour non trouvé'}</p>
        </div>
      </div>
    );
  }

  const { totalRefund } = calculateTotals();

  return (
    <div className="space-y-6">
      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 print:hidden">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-700 print:hidden">
          {success}
        </div>
      )}

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

      {/* Return Note Layout */}
      <div className="bg-white shadow-sm border border-gray-200 rounded-lg p-8 print:shadow-none print:border-none">
        {/* Header */}
        <div className="pb-3 mb-3">
          <div className="flex justify-between items-start">
            <div>
              <div className="w-64 text-center text-sm leading-tight mb-4">
                <div className="font-bold text-lg text-gray-900">GETRADIS</div>
                <div className="font-semibold text-gray-800">Magasin Gepronet</div>
                <div className="text-gray-700 mt-1">111, Avenue Mohamed Belhassan</div>
                <div className="text-gray-700">Elouazani - RABAT</div>
                <div className="text-gray-700 mt-1">Patente : 25903587 - R. C. : 29149</div>
                <div className="text-gray-700">I. F. : 03315202</div>
                <div className="text-gray-700 mt-1">Tél : 0537654006</div>
                <div className="text-gray-700">Fax: 0537756864</div>
                <div className="text-gray-700">e-mail : contact@gepronet.com</div>
              </div>
            </div>
            <div className="text-right">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">BON DE RETOUR</h1>
              <p className="text-lg font-semibold text-gray-700">{returnNote.return_note_number}</p>
              <p className="text-sm text-gray-600">Date: {formatDate(returnNote.return_date)}</p>
              <div className="mt-2">
                {editingStatus ? (
                  <div className="flex items-center space-x-2 print:hidden">
                    <select
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value)}
                      className="px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-[#21522f] focus:border-transparent"
                    >
                      <option value="pending">En attente</option>
                      <option value="processed">Traité</option>
                      <option value="rejected">Rejeté</option>
                    </select>
                    <button
                      onClick={handleStatusSave}
                      disabled={saving}
                      className="flex items-center space-x-1 px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 disabled:opacity-50"
                    >
                      <Save className="w-3 h-3" />
                      <span>{saving ? '...' : 'OK'}</span>
                    </button>
                    <button
                      onClick={handleStatusCancel}
                      className="px-2 py-1 bg-gray-300 text-gray-700 text-xs rounded hover:bg-gray-400"
                    >
                      Annuler
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(returnNote.status)}`}>
                      {getStatusText(returnNote.status)}
                    </span>
                    <button
                      onClick={() => setEditingStatus(true)}
                      className="text-xs text-blue-600 hover:text-blue-800 print:hidden"
                    >
                      Modifier
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Customer Information */}
        <div className="mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Client:</h3>
            <div className="text-gray-700">
              <p className="font-semibold">{returnNote.customer_name}</p>
              {returnNote.customer_address && (
                <p className="mt-1 whitespace-pre-line">{returnNote.customer_address}</p>
              )}
            </div>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="mb-6">
          {returnNote.line_items && returnNote.line_items.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-900">Référence</th>
                    <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-900">Article</th>
                    <th className="border border-gray-300 px-4 py-3 text-center text-sm font-semibold text-gray-900">
                      <span className="print:hidden">Quantité Retournée</span>
                      <span className="hidden print:inline">Qte Ret.</span>
                    </th>
                    <th className="border border-gray-300 px-4 py-3 text-right text-sm font-semibold text-gray-900">Prix Unit. HT</th>
                    <th className="border border-gray-300 px-4 py-3 text-right text-sm font-semibold text-gray-900">Total HT</th>
                  </tr>
                </thead>
                <tbody>
                  {returnNote.line_items.map((item, index) => (
                    <tr key={item.id || index} className="hover:bg-gray-50">
                      <td className="border border-gray-300 px-4 py-3 text-sm text-gray-600">{item.product_sku || '-'}</td>
                      <td className="border border-gray-300 px-4 py-3 text-sm text-gray-900">{item.product_name}</td>
                      <td className="border border-gray-300 px-4 py-3 text-center text-sm text-gray-900">{item.quantity_returned}</td>
                      <td className="border border-gray-300 px-4 py-3 text-right text-sm text-gray-900">
                        {item.unit_price_ht.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DH
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-right text-sm text-gray-900">
                        {item.total_ht.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DH
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              Aucun article trouvé pour ce bon de retour
            </div>
          )}
        </div>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-80">
            <div className="border-t border-gray-300 pt-4">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-gray-900">TOTAL À REMBOURSER:</span>
                <span className="text-xl font-bold text-red-600">
                  {totalRefund.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DH
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        {returnNote.notes && (
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Notes:</h3>
            <p className="text-gray-700 whitespace-pre-line">{returnNote.notes}</p>
          </div>
        )}

      </div>
    </div>
  );
};

export default ReturnNoteDetailPage;