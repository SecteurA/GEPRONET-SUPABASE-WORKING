import React, { useState, useEffect } from 'react';
import { Plus, Search, Save, Trash2, Package, ArrowLeft } from 'lucide-react';
import SupplierSelector from './SupplierSelector';

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

interface PurchaseOrderLineItem {
  id: string;
  product_id: string;
  product_sku: string;
  product_name: string;
  quantity_ordered: number;
}

interface PurchaseOrder {
  supplier_name: string;
  supplier_email: string;
  supplier_phone: string;
  supplier_address: string;
  order_date: string;
  expected_date: string;
  notes: string;
  line_items: PurchaseOrderLineItem[];
}

interface PurchaseOrderFormPageProps {
  onBack: () => void;
  preFilledData?: any;
  onSupplierSelect?: (supplier: any) => void;
}

const PurchaseOrderFormPage: React.FC<PurchaseOrderFormPageProps> = ({ onBack, preFilledData, onSupplierSelect }) => {
  const [purchaseOrder, setPurchaseOrder] = useState<PurchaseOrder>({
    supplier_name: '',
    supplier_email: '',
    supplier_phone: '',
    supplier_address: '',
    order_date: new Date().toISOString().split('T')[0],
    expected_date: '',
    notes: '',
    line_items: [],
  });

  const [products, setProducts] = useState<Product[]>([]);
  const [showProductModal, setShowProductModal] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  const [searchTouched, setSearchTouched] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);

  // Initialize with pre-filled data if provided
  useEffect(() => {
    if (preFilledData) {
      setPurchaseOrder(preFilledData);
    }
  }, [preFilledData]);

  // Handle supplier selection from SupplierSelector
  const handleSupplierSelect = (supplier: any) => {
    setSelectedSupplier(supplier);
    if (supplier) {
      // Auto-fill purchase order fields with supplier data
      setPurchaseOrder(prev => ({
        ...prev,
        supplier_name: `${supplier.first_name} ${supplier.last_name}`.trim(),
        supplier_email: supplier.email || '',
        supplier_phone: supplier.phone || '',
        supplier_address: supplier.address_line1 || '',
      }));
      
      // Call parent callback if provided
      if (onSupplierSelect) {
        onSupplierSelect(supplier);
      }
    } else {
      // Clear purchase order fields when no supplier is selected
      setPurchaseOrder(prev => ({
        ...prev,
        supplier_name: '',
        supplier_email: '',
        supplier_phone: '',
        supplier_address: '',
      }));
      
      if (onSupplierSelect) {
        onSupplierSelect(null);
      }
    }
  };

  // Debounced search function
  const fetchProducts = async (searchTerm: string) => {
    // Reduced minimum length to 2 characters for faster search
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

  const addProductToPurchaseOrder = (product: Product) => {
    const newLineItem: PurchaseOrderLineItem = {
      id: `${product.id}-${Date.now()}`,
      product_id: product.id.toString(),
      product_sku: product.sku || '',
      product_name: product.name,
      quantity_ordered: 1,
    };

    setPurchaseOrder(prev => ({
      ...prev,
      line_items: [...prev.line_items, newLineItem],
    }));

    setShowProductModal(false);
    // Clear search state for next time
    setProductSearch('');
    setProducts([]);
    setSearchTouched(false);
  };

  const updateLineItemQuantity = (itemId: string, quantity: number) => {
    setPurchaseOrder(prev => ({
      ...prev,
      line_items: prev.line_items.map(item => {
        if (item.id === itemId) {
          return {
            ...item,
            quantity_ordered: quantity,
          };
        }
        return item;
      }),
    }));
  };

  const removeLineItem = (itemId: string) => {
    setPurchaseOrder(prev => ({
      ...prev,
      line_items: prev.line_items.filter(item => item.id !== itemId),
    }));
  };

  const handleOpenProductModal = () => {
    setShowProductModal(true);
    // Reset search state when opening modal
    setProductSearch('');
    setProducts([]);
    setSearchTouched(false);
    setError('');
  };

  const handleCloseProductModal = () => {
    setShowProductModal(false);
    // Clear search state when closing modal
    setProductSearch('');
    setProducts([]);
    setSearchTouched(false);
  };

  const handleSearchChange = (value: string) => {
    setProductSearch(value);
    setSearchTouched(true);
  };

  const savePurchaseOrder = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');

      // Validate required fields
      if (!purchaseOrder.supplier_name.trim()) {
        setError('Le nom du fournisseur est requis');
        return;
      }

      if (purchaseOrder.line_items.length === 0) {
        setError('Au moins un article est requis');
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/save-purchase-order`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(purchaseOrder),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || 'Erreur lors de la sauvegarde du bon de commande');
        return;
      }

      setSuccess(`Bon de commande ${result.purchase_order.purchase_order_number} créé avec succès`);
      
      // Reset form after successful save
      setTimeout(() => {
        setPurchaseOrder({
          supplier_name: '',
          supplier_email: '',
          supplier_phone: '',
          supplier_address: '',
          order_date: new Date().toISOString().split('T')[0],
          expected_date: '',
          notes: '',
          line_items: [],
        });
        setSuccess('');
        onBack(); // Go back to purchase order list
      }, 2000);

    } catch (err) {
      setError('Erreur lors de la sauvegarde du bon de commande');
    } finally {
      setSaving(false);
    }
  };

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
            <span>Retour aux bons de commande</span>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Nouveau Bon de Commande</h1>
            <p className="text-gray-600">Créer un nouveau bon de commande</p>
          </div>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={savePurchaseOrder}
            disabled={saving || purchaseOrder.line_items.length === 0 || !purchaseOrder.supplier_name.trim()}
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

      {/* Supplier Selector */}
      <SupplierSelector
        selectedSupplier={selectedSupplier}
        onSupplierSelect={handleSupplierSelect}
        title="Informations Fournisseur"
      />

      {/* Additional Purchase Order Fields */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Détails du bon de commande</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date de commande
            </label>
            <input
              type="date"
              value={purchaseOrder.order_date}
              onChange={(e) => setPurchaseOrder(prev => ({ ...prev, order_date: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#21522f] focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date de livraison prévue
            </label>
            <input
              type="date"
              value={purchaseOrder.expected_date}
              onChange={(e) => setPurchaseOrder(prev => ({ ...prev, expected_date: e.target.value }))}
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
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Articles</h2>
          
          {purchaseOrder.line_items.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-900">Référence</th>
                    <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-900">Article</th>
                    <th className="border border-gray-300 px-4 py-3 text-center text-sm font-semibold text-gray-900">
                      <span className="print:hidden">Quantité Commandée</span>
                      <span className="hidden print:inline">Qte Cmd.</span>
                    </th>
                    <th className="border border-gray-300 px-4 py-3 text-center text-sm font-semibold text-gray-900 print:hidden">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {purchaseOrder.line_items.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="border border-gray-300 px-4 py-3 text-sm text-gray-600">{item.product_sku || '-'}</td>
                      <td className="border border-gray-300 px-4 py-3 text-sm text-gray-900">{item.product_name}</td>
                      <td className="border border-gray-300 px-4 py-3 text-center">
                        <input
                          type="number"
                          value={item.quantity_ordered}
                          onChange={(e) => updateLineItemQuantity(item.id, parseInt(e.target.value) || 1)}
                          min="1"
                          className="w-20 px-2 py-1 border border-gray-300 rounded text-center focus:ring-2 focus:ring-[#21522f] focus:border-transparent"
                        />
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-center print:hidden">
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
              <p>Aucun article ajouté au bon de commande</p>
              <p className="text-sm">Cliquez sur "Ajouter Produit" pour commencer</p>
            </div>
          )}
        </div>
      </div>

      {/* Notes */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Notes</h2>
        <textarea
          value={purchaseOrder.notes}
          onChange={(e) => setPurchaseOrder(prev => ({ ...prev, notes: e.target.value }))}
          rows={3}
          placeholder="Notes additionnelles pour le bon de commande..."
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
                      onClick={() => addProductToPurchaseOrder(product)}
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

export default PurchaseOrderFormPage;