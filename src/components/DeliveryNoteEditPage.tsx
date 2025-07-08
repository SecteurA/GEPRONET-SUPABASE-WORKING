import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, Package, Plus, Search, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import ClientSelector from './ClientSelector';

interface DeliveryNoteLineItem {
  id: string;
  product_id: string;
  product_sku: string;
  product_name: string;
  quantity: number;
  unit_price_ht: number;
  total_ht: number;
  vat_percentage: number;
  vat_amount: number;
}

interface DeliveryNote {
  id: string;
  delivery_note_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_address: string;
  delivery_date: string;
  status: string;
  notes: string;
  subtotal_ht: number;
  total_vat: number;
  total_ttc: number;
  line_items: DeliveryNoteLineItem[];
}

interface Product {
  id: number;
  name: string;
  sku: string;
  price: string;
  regular_price: string;
  tax_class: string;
  tax_rates?: any[];
  categories: Array<{
    id: number;
    name: string;
  }>;
}

interface DeliveryNoteEditPageProps {
  deliveryNoteId: string;
  onBack: () => void;
}

const DeliveryNoteEditPage: React.FC<DeliveryNoteEditPageProps> = ({ deliveryNoteId, onBack }) => {
  const [deliveryNote, setDeliveryNote] = useState<DeliveryNote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [showProductModal, setShowProductModal] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchTouched, setSearchTouched] = useState(false);

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

      // Check if delivery note can be edited
      if (deliveryNoteData.status !== 'pending') {
        setError('Seuls les bons de livraison en attente peuvent être modifiés');
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

      const deliveryNoteWithItems = {
        ...deliveryNoteData,
        line_items: lineItems || []
      };

      setDeliveryNote(deliveryNoteWithItems);

      // Create client object from delivery note data
      if (deliveryNoteData.customer_name) {
        const nameParts = deliveryNoteData.customer_name.split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';
        
        const mockClient = {
          id: 'existing-client',
          first_name: firstName,
          last_name: lastName,
          email: deliveryNoteData.customer_email || '',
          phone: deliveryNoteData.customer_phone || '',
          company_name: '',
          ice: '',
          address_line1: deliveryNoteData.customer_address || '',
          created_at: '',
          updated_at: '',
        };
        setSelectedClient(mockClient);
      }
    } catch (err) {
      setError('Erreur lors du chargement du bon de livraison');
    } finally {
      setLoading(false);
    }
  };

  // Handle client selection from ClientSelector
  const handleClientSelect = (client: any) => {
    setSelectedClient(client);
    if (client && deliveryNote) {
      setDeliveryNote(prev => prev ? {
        ...prev,
        customer_name: `${client.first_name} ${client.last_name}`.trim(),
        customer_email: client.email || '',
        customer_phone: client.phone || '',
        customer_address: client.address_line1 || '',
      } : null);
    }
  };

  // Debounced search function for products
  const fetchProducts = async (searchTerm: string) => {
    if (searchTerm.length < 2) {
      setProducts([]);
      return;
    }

    try {
      setSearchLoading(true);
      setError('');

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/wc-products?search=${encodeURIComponent(searchTerm)}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || 'Erreur lors du chargement des produits');
        return;
      }

      setProducts(result);
    } catch (err) {
      setError('Erreur lors du chargement des produits');
    } finally {
      setSearchLoading(false);
    }
  };

  // Debounce search to avoid too many API calls
  useEffect(() => {
    if (!searchTouched) return;
    
    const timeoutId = setTimeout(() => {
      fetchProducts(productSearch);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [productSearch, searchTouched]);

  const getVATPercentage = (taxClass: string, taxRates?: any[]): number => {
    // If we have tax rates data from WooCommerce, use it
    if (taxRates && taxRates.length > 0) {
      const matchingRate = taxRates.find(rate => 
        rate.class === taxClass || 
        (taxClass === '' && rate.class === 'standard') ||
        (taxClass === 'standard' && rate.class === '')
      );
      
      if (matchingRate) {
        return parseFloat(matchingRate.rate || '0');
      }
    }

    // Fallback logic for common tax classes
    if (!taxClass || taxClass.toLowerCase().includes('exonerer') || taxClass === 'zero-rate') {
      return 0;
    }
    
    if (taxClass.toLowerCase().includes('reduced') || taxClass.toLowerCase().includes('reduit')) {
      return 10;
    }
    
    return 20;
  };

  const addProductToDeliveryNote = (product: Product) => {
    if (!deliveryNote) return;

    const priceFromWC = parseFloat(product.regular_price || product.price || '0');
    const vatPercentage = getVATPercentage(product.tax_class, product.tax_rates);
    
    const unitPriceHT = vatPercentage > 0 ? priceFromWC / (1 + vatPercentage / 100) : priceFromWC;
    const totalHT = unitPriceHT * 1;
    const vatAmount = totalHT * (vatPercentage / 100);

    const newLineItem: DeliveryNoteLineItem = {
      id: `new-${product.id}-${Date.now()}`,
      product_id: product.id.toString(),
      product_sku: product.sku || '',
      product_name: product.name,
      quantity: 1,
      unit_price_ht: unitPriceHT,
      total_ht: totalHT,
      vat_percentage: vatPercentage,
      vat_amount: vatAmount,
    };

    setDeliveryNote(prev => prev ? {
      ...prev,
      line_items: [...prev.line_items, newLineItem],
    } : null);

    setShowProductModal(false);
    setProductSearch('');
    setProducts([]);
    setSearchTouched(false);
  };

  const updateLineItemQuantity = (itemId: string, quantity: number) => {
    if (!deliveryNote) return;

    setDeliveryNote(prev => prev ? {
      ...prev,
      line_items: prev.line_items.map(item => {
        if (item.id === itemId) {
          const totalHT = item.unit_price_ht * quantity;
          const vatAmount = totalHT * (item.vat_percentage / 100);
          return {
            ...item,
            quantity,
            total_ht: totalHT,
            vat_amount: vatAmount,
          };
        }
        return item;
      }),
    } : null);
  };

  const updateLineItemPrice = (itemId: string, unitPriceHT: number) => {
    if (!deliveryNote) return;

    setDeliveryNote(prev => prev ? {
      ...prev,
      line_items: prev.line_items.map(item => {
        if (item.id === itemId) {
          const totalHT = unitPriceHT * item.quantity;
          const vatAmount = totalHT * (item.vat_percentage / 100);
          return {
            ...item,
            unit_price_ht: unitPriceHT,
            total_ht: totalHT,
            vat_amount: vatAmount,
          };
        }
        return item;
      }),
    } : null);
  };

  const updateLineItemVAT = (itemId: string, vatPercentage: number) => {
    if (!deliveryNote) return;

    setDeliveryNote(prev => prev ? {
      ...prev,
      line_items: prev.line_items.map(item => {
        if (item.id === itemId) {
          const vatAmount = item.total_ht * (vatPercentage / 100);
          return {
            ...item,
            vat_percentage: vatPercentage,
            vat_amount: vatAmount,
          };
        }
        return item;
      }),
    } : null);
  };

  const removeLineItem = (itemId: string) => {
    if (!deliveryNote) return;

    setDeliveryNote(prev => prev ? {
      ...prev,
      line_items: prev.line_items.filter(item => item.id !== itemId),
    } : null);
  };

  const calculateTotals = () => {
    if (!deliveryNote) return { subtotalHT: 0, totalVAT: 0, totalTTC: 0 };

    const subtotalHT = deliveryNote.line_items.reduce((sum, item) => sum + item.total_ht, 0);
    const totalVAT = deliveryNote.line_items.reduce((sum, item) => sum + item.vat_amount, 0);
    const totalTTC = subtotalHT + totalVAT;

    return { subtotalHT, totalVAT, totalTTC };
  };

  const handleOpenProductModal = () => {
    setShowProductModal(true);
    setProductSearch('');
    setProducts([]);
    setSearchTouched(false);
    setError('');
  };

  const handleCloseProductModal = () => {
    setShowProductModal(false);
    setProductSearch('');
    setProducts([]);
    setSearchTouched(false);
  };

  const handleSearchChange = (value: string) => {
    setProductSearch(value);
    setSearchTouched(true);
  };

  const saveDeliveryNote = async () => {
    if (!deliveryNote) return;

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      // Validate required fields
      if (!deliveryNote.customer_name.trim()) {
        setError('Le nom du client est requis');
        return;
      }

      if (deliveryNote.line_items.length === 0) {
        setError('Au moins un article est requis');
        return;
      }

      const { subtotalHT, totalVAT, totalTTC } = calculateTotals();

      // Update delivery note
      const { error: updateError } = await supabase
        .from('delivery_notes')
        .update({
          customer_name: deliveryNote.customer_name,
          customer_email: deliveryNote.customer_email,
          customer_phone: deliveryNote.customer_phone,
          customer_address: deliveryNote.customer_address,
          delivery_date: deliveryNote.delivery_date,
          notes: deliveryNote.notes,
          subtotal_ht: subtotalHT,
          total_vat: totalVAT,
          total_ttc: totalTTC,
          updated_at: new Date().toISOString(),
        })
        .eq('id', deliveryNoteId);

      if (updateError) {
        setError('Erreur lors de la mise à jour du bon de livraison');
        return;
      }

      // Delete existing line items
      const { error: deleteError } = await supabase
        .from('delivery_note_line_items')
        .delete()
        .eq('delivery_note_id', deliveryNoteId);

      if (deleteError) {
        setError('Erreur lors de la mise à jour des articles');
        return;
      }

      // Insert updated line items
      const lineItemsData = deliveryNote.line_items.map(item => ({
        delivery_note_id: deliveryNoteId,
        product_id: item.product_id,
        product_sku: item.product_sku,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price_ht: item.unit_price_ht,
        total_ht: item.total_ht,
        vat_percentage: item.vat_percentage,
        vat_amount: item.vat_amount,
      }));

      const { error: insertError } = await supabase
        .from('delivery_note_line_items')
        .insert(lineItemsData);

      if (insertError) {
        setError('Erreur lors de la mise à jour des articles');
        return;
      }

      setSuccess('Bon de livraison mis à jour avec succès');
      
      // Go back to detail view after successful save
      setTimeout(() => {
        onBack();
      }, 1500);

    } catch (err) {
      setError('Erreur lors de la sauvegarde du bon de livraison');
    } finally {
      setSaving(false);
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

  if (error && !deliveryNote) {
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
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  if (!deliveryNote) return null;

  const { subtotalHT, totalVAT, totalTTC } = calculateTotals();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-[#21522f] transition-colors duration-200"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retour</span>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Modifier Bon de Livraison</h1>
            <p className="text-gray-600">{deliveryNote.delivery_note_number}</p>
          </div>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={saveDeliveryNote}
            disabled={saving || deliveryNote.line_items.length === 0 || !deliveryNote.customer_name.trim()}
            className="flex items-center space-x-2 px-4 py-2 bg-[#21522f] text-white rounded-lg hover:bg-[#1a4025] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Sauvegarde...' : 'Sauvegarder'}</span>
          </button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-700">
          {success}
        </div>
      )}

      {/* Client Selector */}
      <ClientSelector
        selectedClient={selectedClient}
        onClientSelect={handleClientSelect}
        title="Informations Client"
      />

      {/* Additional Delivery Note Fields */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Détails du bon de livraison</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date de livraison
            </label>
            <input
              type="date"
              value={deliveryNote.delivery_date}
              onChange={(e) => setDeliveryNote(prev => prev ? { ...prev, delivery_date: e.target.value } : null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#21522f] focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Add Product Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Ajouter des produits</h2>
        <button
          onClick={handleOpenProductModal}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
        >
          <Plus className="w-4 h-4" />
          <span>Ajouter Produit</span>
        </button>
      </div>

      {/* Line Items */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Articles à livrer</h2>
          
          {deliveryNote.line_items.length > 0 ? (
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
                    <th className="border border-gray-300 px-4 py-3 text-center text-sm font-semibold text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {deliveryNote.line_items.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="border border-gray-300 px-4 py-3 text-sm text-gray-600">{item.product_sku || '-'}</td>
                      <td className="border border-gray-300 px-4 py-3 text-sm text-gray-900">{item.product_name}</td>
                      <td className="border border-gray-300 px-4 py-3 text-center">
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateLineItemQuantity(item.id, parseInt(e.target.value) || 1)}
                          min="1"
                          className="w-20 px-2 py-1 border border-gray-300 rounded text-center focus:ring-2 focus:ring-[#21522f] focus:border-transparent"
                        />
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-right">
                        <input
                          type="number"
                          value={item.unit_price_ht.toFixed(2)}
                          onChange={(e) => updateLineItemPrice(item.id, parseFloat(e.target.value) || 0)}
                          min="0"
                          step="0.01"
                          className="w-28 px-2 py-1 border border-gray-300 rounded text-right focus:ring-2 focus:ring-[#21522f] focus:border-transparent"
                        />
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-right text-sm text-gray-900">
                        {item.total_ht.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DH
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-center">
                        <input
                          type="number"
                          value={item.vat_percentage}
                          onChange={(e) => updateLineItemVAT(item.id, parseFloat(e.target.value) || 0)}
                          min="0"
                          max="100"
                          step="0.01"
                          className="w-16 px-2 py-1 border border-gray-300 rounded text-center focus:ring-2 focus:ring-[#21522f] focus:border-transparent"
                        />
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-right text-sm text-gray-900">
                        {item.vat_amount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DH
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-center">
                        <button
                          onClick={() => removeLineItem(item.id)}
                          className="text-red-600 hover:text-red-900 transition-colors duration-200"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p>Aucun article ajouté au bon de livraison</p>
              <p className="text-sm">Cliquez sur "Ajouter Produit" pour commencer</p>
            </div>
          )}
        </div>

        {deliveryNote.line_items.length > 0 && (
          <div className="bg-gray-50 p-6 border-t border-gray-200">
            <div className="flex justify-end">
              <div className="w-80">
                <div className="space-y-2">
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-700">Sous-total HT:</span>
                    <span className="font-medium text-gray-900">
                      {subtotalHT.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DH
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-700">TVA:</span>
                    <span className="font-medium text-gray-900">
                      {totalVAT.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DH
                    </span>
                  </div>
                  <div className="border-t border-gray-300 pt-2 mt-2">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold text-gray-900">TOTAL TTC:</span>
                      <span className="text-xl font-bold text-[#21522f]">
                        {totalTTC.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DH
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Notes */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Notes</h2>
        <textarea
          value={deliveryNote.notes}
          onChange={(e) => setDeliveryNote(prev => prev ? { ...prev, notes: e.target.value } : null)}
          rows={3}
          placeholder="Notes additionnelles pour le bon de livraison..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#21522f] focus:border-transparent"
        />
      </div>

      {/* Product Selection Modal */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Sélectionner un produit</h3>
                <button
                  onClick={handleCloseProductModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Tapez au moins 2 caractères pour rechercher..."
                  value={productSearch}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  autoFocus
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#21522f] focus:border-transparent"
                />
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[50vh]">
              {searchLoading ? (
                <div className="text-center py-8">
                  <div className="w-8 h-8 border-4 border-[#21522f] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-gray-600">Chargement des produits...</p>
                </div>
              ) : !searchTouched ? (
                <div className="text-center py-8 text-gray-500">
                  <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p>Tapez au moins 2 caractères pour rechercher des produits</p>
                  <p className="text-sm mt-2">Recherche par nom ou référence (SKU)</p>
                </div>
              ) : productSearch.length < 2 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>Tapez au moins 2 caractères pour lancer la recherche</p>
                </div>
              ) : products.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                  {products.map((product) => (
                    <div
                      key={product.id}
                      className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors duration-200"
                      onClick={() => addProductToDeliveryNote(product)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{product.name}</h4>
                          {product.sku && (
                            <p className="text-sm text-gray-500">SKU: {product.sku}</p>
                          )}
                          {product.categories.length > 0 && (
                            <p className="text-sm text-gray-500">
                              Catégorie: {product.categories.map(cat => cat.name).join(', ')}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-[#21522f]">
                            {(() => {
                              const priceFromWC = parseFloat(product.regular_price || product.price || '0');
                              const vatPercentage = getVATPercentage(product.tax_class, product.tax_rates);
                              const unitPriceHT = vatPercentage > 0 ? priceFromWC / (1 + vatPercentage / 100) : priceFromWC;
                              return unitPriceHT.toLocaleString('fr-FR', { 
                                minimumFractionDigits: 2, 
                                maximumFractionDigits: 2 
                              }) + ' DH HT';
                            })()}
                          </p>
                          <p className="text-sm text-gray-500">
                            TVA: {getVATPercentage(product.tax_class, product.tax_rates)}%
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p>Aucun produit trouvé pour "{productSearch}"</p>
                  <p className="text-sm mt-2">Essayez avec d'autres mots-clés</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeliveryNoteEditPage;