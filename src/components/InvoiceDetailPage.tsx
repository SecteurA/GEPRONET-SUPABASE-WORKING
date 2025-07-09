import React, { useState, useEffect } from 'react';
import { ArrowLeft, Printer, Save, ChevronDown, Check, Edit } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface InvoiceLineItem {
  id: string;
  product_id: string;
  product_sku: string;
  product_name: string;
  quantity: number;
  unit_price_ht: number;
  total_ht: number;
  vat_percentage: string | number; // Can be tax class string or numeric percentage
  vat_amount: number;
}

interface InvoiceDetail {
  id: string;
  invoice_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_address: string;
  invoice_date: string;
  due_date: string | null;
  status: string;
  subtotal_ht: number;
  total_vat: number;
  total_ttc: number;
  notes: string;
  created_at: string;
  updated_at: string;
  line_items: InvoiceLineItem[];
}

interface InvoiceDetailPageProps {
  invoiceId: string;
  onBack: () => void;
}

const InvoiceDetailPage: React.FC<InvoiceDetailPageProps> = ({ invoiceId, onBack }) => {
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingStatus, setEditingStatus] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showPaymentMethodModal, setShowPaymentMethodModal] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');

  useEffect(() => {
    fetchInvoiceDetail();
  }, [invoiceId]);

  const fetchInvoiceDetail = async () => {
    try {
      setLoading(true);
      setError('');

      // Get invoice details
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', invoiceId)
        .single();

      if (invoiceError) {
        setError('Facture non trouvée');
        return;
      }

      // Get line items for the invoice
      const { data: lineItems, error: lineItemsError } = await supabase
        .from('invoice_line_items')
        .select('*')
        .eq('invoice_id', invoiceId)
        .order('created_at', { ascending: true });

      if (lineItemsError) {
        console.error('Error fetching line items:', lineItemsError);
      }

      setInvoice({
        ...invoiceData,
        line_items: lineItems || []
      });
      setNewStatus(invoiceData.status);
    } catch (err) {
      setError('Erreur lors du chargement de la facture');
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
      case 'paid':
        return 'Payée';
      case 'sent':
        return 'Envoyée';
      case 'overdue':
        return 'En retard';
      case 'draft':
        return 'Brouillon';
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'sent':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'overdue':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'draft':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleStatusSave = async (selectedStatus?: string, bypassModalCheck = false) => {
    const statusToUpdate = selectedStatus || newStatus;
    
    if (!invoice || statusToUpdate === invoice.status) {
      setEditingStatus(false);
      setShowStatusDropdown(false);
      return;
    }

    // If changing to 'paid', show payment method selector (unless bypassing)
    if (statusToUpdate === 'paid' && invoice.status !== 'paid' && !bypassModalCheck) {
      setShowStatusDropdown(false);
      setShowPaymentMethodModal(true);
      setNewStatus(statusToUpdate);
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      // Prepare update data
      const updateData: any = {
        status: statusToUpdate,
        updated_at: new Date().toISOString(),
      };

      // If marking as paid, set paid_date to today
      if (statusToUpdate === 'paid' && invoice.status !== 'paid') {
        updateData.paid_date = new Date().toISOString().split('T')[0];
        updateData.payment_method = selectedPaymentMethod;
      }
      // If changing from paid to another status, clear paid_date
      else if (statusToUpdate !== 'paid' && invoice.status === 'paid') {
        updateData.paid_date = null;
        updateData.payment_method = null;
      }
      const { error: updateError } = await supabase
        .from('invoices')
        .update(updateData)
        .eq('id', invoiceId);

      if (updateError) {
        setError('Erreur lors de la mise à jour du statut');
        return;
      }

      setInvoice(prev => prev ? { ...prev, status: statusToUpdate } : null);
      setEditingStatus(false);
      
      let successMessage = 'Statut mis à jour avec succès';
      if (statusToUpdate === 'paid' && invoice.status !== 'paid') {
        successMessage += ` et paiement enregistré (${selectedPaymentMethod})`;
      }
      setSuccess(successMessage);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);

    } catch (err) {
      setError('Erreur lors de la mise à jour du statut');
    } finally {
      setSaving(false);
      setShowStatusDropdown(false);
      setShowPaymentMethodModal(false);
      setSelectedPaymentMethod('');
    }
  };

  const handleStatusCancel = () => {
    setNewStatus(invoice?.status || '');
    setEditingStatus(false);
    setShowStatusDropdown(false);
  };

  const handlePaymentMethodConfirm = () => {
    if (!selectedPaymentMethod) {
      setError('Veuillez sélectionner un mode de paiement');
      return;
    }
    // Directly proceed with the status update, bypassing the modal check
    handleStatusSave(newStatus, true);
  };

  const handlePaymentMethodCancel = () => {
    setShowPaymentMethodModal(false);
    setSelectedPaymentMethod('');
    setNewStatus(invoice?.status || '');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-[#21522f] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement de la facture...</p>
        </div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-[#21522f] transition-colors duration-200"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retour aux factures</span>
          </button>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
          <p className="text-red-700">{error || 'Facture non trouvée'}</p>
        </div>
      </div>
    );
  }

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
          <span>Retour aux factures</span>
        </button>
        <div className="flex space-x-3">
          {/* Edit Button - only show for draft invoices */}
          {invoice.status === 'draft' && (
            <button
              onClick={() => window.location.href = `#edit-invoice-${invoice.id}`}
              className="flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors duration-200"
            >
              <Edit className="w-4 h-4" />
              <span>Modifier</span>
            </button>
          )}
          
          {/* Status Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowStatusDropdown(!showStatusDropdown)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors duration-200 ${
                getStatusColor(invoice.status).replace('border-', 'bg-opacity-20 border-').replace('text-', 'text-')
              } hover:bg-opacity-30`}
            >
              <span className="font-medium text-sm">{getStatusText(invoice.status)}</span>
              <ChevronDown className="w-4 h-4" />
            </button>
            
            {showStatusDropdown && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                <div className="py-1">
                  {[
                    { value: 'draft', label: 'Brouillon', color: 'text-gray-700' },
                    { value: 'sent', label: 'Envoyée', color: 'text-blue-700' },
                    { value: 'overdue', label: 'En retard', color: 'text-red-700' },
                    { value: 'paid', label: 'Payée', color: 'text-green-700' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setShowStatusDropdown(false);
                        if (option.value === 'paid' && invoice.status !== 'paid') {
                          setShowPaymentMethodModal(true);
                          setNewStatus(option.value);
                        } else {
                          handleStatusSave(option.value);
                        }
                      }}
                      disabled={saving}
                      className={`w-full flex items-center justify-between px-4 py-2 text-left hover:bg-gray-50 transition-colors duration-200 ${
                        invoice.status === option.value ? 'bg-gray-50' : ''
                      } disabled:opacity-50`}
                    >
                      <span className={`${option.color} font-medium`}>
                        {option.label}
                      </span>
                      {invoice.status === option.value && (
                        <Check className="w-4 h-4 text-green-600" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <button
            onClick={handlePrint}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimer</span>
          </button>
        </div>
      </div>

      {/* Click outside to close dropdown */}
      {showStatusDropdown && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowStatusDropdown(false)}
        />
      )}

      {/* Payment Method Modal */}
      {showPaymentMethodModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Sélectionner le mode de paiement
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                Comment cette facture a-t-elle été payée ?
              </p>
              
              <div className="space-y-3 mb-6">
                {[
                  { value: 'Espèces', label: 'Espèces', icon: '💵' },
                  { value: 'Virements', label: 'Virements', icon: '🏦' },
                  { value: 'Chèque', label: 'Chèque', icon: '📝' },
                ].map((method) => (
                  <button
                    key={method.value}
                    onClick={() => setSelectedPaymentMethod(method.value)}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg border transition-colors duration-200 ${
                      selectedPaymentMethod === method.value
                        ? 'border-[#21522f] bg-green-50 text-green-900'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-xl">{method.icon}</span>
                    <span className="font-medium">{method.label}</span>
                    {selectedPaymentMethod === method.value && (
                      <span className="ml-auto text-green-600">✓</span>
                    )}
                  </button>
                ))}
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={handlePaymentMethodCancel}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors duration-200"
                >
                  Annuler
                </button>
                <button
                  onClick={handlePaymentMethodConfirm}
                  disabled={!selectedPaymentMethod || saving}
                  className="px-4 py-2 bg-[#21522f] text-white rounded-lg hover:bg-[#1a4025] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  {saving ? 'Enregistrement...' : 'Confirmer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Layout */}
      <div className="bg-white shadow-sm border border-gray-200 rounded-lg p-8 print:shadow-none print:border-none">
        {/* Invoice Header */}
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
              <h1 className="text-3xl font-bold text-gray-900 mb-2">FACTURE</h1>
              <p className="text-lg font-semibold text-gray-700">{invoice.invoice_number}</p>
              <p className="text-sm text-gray-600">Date: {formatDate(invoice.invoice_date)}</p>
              {invoice.due_date && (
                <p className="text-sm text-gray-600">Échéance: {formatDate(invoice.due_date)}</p>
              )}
              {invoice.status === 'paid' && (invoice as any).payment_method && (
                <p className="text-sm text-green-600">
                  Payé par: {(invoice as any).payment_method}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Customer Information */}
        <div className="mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Facturé à:</h3>
            <div className="text-gray-700">
              <p className="font-semibold">{invoice.customer_name}</p>
              {invoice.customer_address && (
                <p className="mt-1 whitespace-pre-line">{invoice.customer_address}</p>
              )}
            </div>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="mb-6">
          {invoice.line_items && invoice.line_items.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-900">Référence</th>
                    <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-900">Article</th>
                    <th className="border border-gray-300 px-4 py-3 text-center text-sm font-semibold text-gray-900">
                      <span className="print:hidden">Quantité</span>
                      <span className="hidden print:inline">Qte</span>
                    </th>
                    <th className="border border-gray-300 px-4 py-3 text-right text-sm font-semibold text-gray-900">Prix Unit. HT</th>
                    <th className="border border-gray-300 px-4 py-3 text-right text-sm font-semibold text-gray-900">Total HT</th>
                    <th className="border border-gray-300 px-4 py-3 text-center text-sm font-semibold text-gray-900">TVA %</th>
                    <th className="border border-gray-300 px-4 py-3 text-right text-sm font-semibold text-gray-900">TVA</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.line_items.map((item, index) => (
                    <tr key={item.id || index} className="hover:bg-gray-50">
                      <td className="border border-gray-300 px-4 py-3 text-sm text-gray-600">{item.product_sku || '-'}</td>
                      <td className="border border-gray-300 px-4 py-3 text-sm text-gray-900">{item.product_name}</td>
                      <td className="border border-gray-300 px-4 py-3 text-center text-sm text-gray-900">{item.quantity}</td>
                      <td className="border border-gray-300 px-4 py-3 text-right text-sm text-gray-900">
                        {item.unit_price_ht.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DH
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-right text-sm text-gray-900">
                        {item.total_ht.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DH
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-center text-sm text-gray-600">
                        {typeof item.vat_percentage === 'string' ? item.vat_percentage : `${item.vat_percentage}%`}
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-right text-sm text-gray-900">
                        {item.vat_amount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DH
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              Aucun article trouvé pour cette facture
            </div>
          )}
        </div>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-80">
            <div className="border-t border-gray-300 pt-2">
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Sous-total HT:</span>
                <span className="font-medium text-gray-900">
                  {invoice.subtotal_ht.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DH
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-700">TVA:</span>
                <span className="font-medium text-gray-900">
                  {invoice.total_vat.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DH
                </span>
              </div>
              <div className="border-t border-gray-300 pt-1">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-gray-900">TOTAL TTC:</span>
                  <span className="text-xl font-bold text-[#21522f]">
                    {invoice.total_ttc.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DH
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        {invoice.notes && (
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Notes:</h3>
            <p className="text-gray-700 whitespace-pre-line">{invoice.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default InvoiceDetailPage;