import React, { useState, useEffect } from 'react';
import { Plus, Search, Save, Trash2, Calculator, Package } from 'lucide-react';

interface Product {
  id: number;
  name: string;
  sku: string;
  price: string;
  regular_price: string;
  tax_class: string;
  categories: Array<{
    id: number;
    name: string;
  }>;
}

interface InvoiceLineItem {
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

interface Invoice {
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_address: string;
  invoice_date: string;
  due_date: string;
  notes: string;
  line_items: InvoiceLineItem[];
}

const InvoicePage: React.FC = () => {
  const [invoice, setInvoice] = useState<Invoice>({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    customer_address: '',
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: '',
    notes: '',
    line_items: [],
  });

  const [products, setProducts] = useState<Product[]>([]);
  const [showProductModal, setShowProductModal] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/wc-products`, {
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
      setLoading(false);
    }
  };

  const addProductToInvoice = (product: Product) => {
    const unitPrice = parseFloat(product.regular_price || product.price || '0');
    const vatPercentage = getVATPercentage(product.tax_class);
    const totalHT = unitPrice * 1;
    const vatAmount = totalHT * (vatPercentage / 100);

    const newLineItem: InvoiceLineItem = {
      id: `${product.id}-${Date.now()}`,
      product_id: product.id.toString(),
      product_sku: product.sku || '',
      product_name: product.name,
      quantity: 1,
      unit_price_ht: unitPrice,
      total_ht: totalHT,
      vat_percentage: vatPercentage,
      vat_amount: vatAmount,
    };

    setInvoice(prev => ({
      ...prev,
      line_items: [...prev.line_items, newLineItem],
    }));

    setShowProductModal(false);
  };

  const getVATPercentage = (taxClass: string): number => {
    if (!taxClass || taxClass.toLowerCase().includes('exonerer') || taxClass === 'zero-rate') {
      return 0;
    }
    // Default VAT rate for Morocco
    return 20;
  };

  const updateLineItemQuantity = (itemId: string, quantity: number) => {
    setInvoice(prev => ({
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
    }));
  };

  const removeLineItem = (itemId: string) => {
    setInvoice(prev => ({
      ...prev,
      line_items: prev.line_items.filter(item => item.id !== itemId),
    }));
  };

  const calculateTotals = () => {
    const subtotalHT = invoice.line_items.reduce((sum, item) => sum + item.total_ht, 0);
    const totalVAT = invoice.line_items.reduce((sum, item) => sum + item.vat_amount, 0);
    const totalTTC = subtotalHT + totalVAT;

    return {
      subtotalHT,
      totalVAT,
      totalTTC,
    };
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    (product.sku && product.sku.toLowerCase().includes(productSearch.toLowerCase()))
  );

  const { subtotalHT, totalVAT, totalTTC } = calculateTotals();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nouvelle Facture</h1>
          <p className="text-gray-600">Créer une nouvelle facture</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => {
              setShowProductModal(true);
              if (products.length === 0) fetchProducts();
            }}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
          >
            <Plus className="w-4 h-4" />
            <span>Ajouter Produit</span>
          </button>
          <button
            className="flex items-center space-x-2 px-4 py-2 bg-[#21522f] text-white rounded-lg hover:bg-[#1a4025] transition-colors duration-200"
          >
            <Save className="w-4 h-4" />
            <span>Sauvegarder</span>
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

      {/* Customer Information */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Informations Client</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nom du client
            </label>
            <input
              type="text"
              value={invoice.customer_name}
              onChange={(e) => setInvoice(prev => ({ ...prev, customer_name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#21522f] focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={invoice.customer_email}
              onChange={(e) => setInvoice(prev => ({ ...prev, customer_email: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#21522f] focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Téléphone
            </label>
            <input
              type="tel"
              value={invoice.customer_phone}
              onChange={(e) => setInvoice(prev => ({ ...prev, customer_phone: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#21522f] focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date d'échéance
            </label>
            <input
              type="date"
              value={invoice.due_date}
              onChange={(e) => setInvoice(prev => ({ ...prev, due_date: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#21522f] focus:border-transparent"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Adresse
            </label>
            <textarea
              value={invoice.customer_address}
              onChange={(e) => setInvoice(prev => ({ ...prev, customer_address: e.target.value }))}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#21522f] focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Line Items */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Articles</h2>
          
          {invoice.line_items.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-900">Référence</th>
                    <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-900">Article</th>
                    <th className="border border-gray-300 px-4 py-3 text-center text-sm font-semibold text-gray-900">Quantité</th>
                    <th className="border border-gray-300 px-4 py-3 text-right text-sm font-semibold text-gray-900">Prix Unit. HT</th>
                    <th className="border border-gray-300 px-4 py-3 text-right text-sm font-semibold text-gray-900">Total HT</th>
                    <th className="border border-gray-300 px-4 py-3 text-center text-sm font-semibold text-gray-900">TVA %</th>
                    <th className="border border-gray-300 px-4 py-3 text-right text-sm font-semibold text-gray-900">TVA</th>
                    <th className="border border-gray-300 px-4 py-3 text-center text-sm font-semibold text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.line_items.map((item) => (
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
                      <td className="border border-gray-300 px-4 py-3 text-right text-sm text-gray-900">
                        {item.unit_price_ht.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DH
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-right text-sm text-gray-900">
                        {item.total_ht.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DH
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-center text-sm text-gray-600">
                        {item.vat_percentage}%
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
              <p>Aucun article ajouté à la facture</p>
              <p className="text-sm">Cliquez sur "Ajouter Produit" pour commencer</p>
            </div>
          )}
        </div>

        {/* Totals */}
        {invoice.line_items.length > 0 && (
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
          value={invoice.notes}
          onChange={(e) => setInvoice(prev => ({ ...prev, notes: e.target.value }))}
          rows={3}
          placeholder="Notes additionnelles pour la facture..."
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
                  onClick={() => setShowProductModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Rechercher un produit..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#21522f] focus:border-transparent"
                />
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[50vh]">
              {loading ? (
                <div className="text-center py-8">
                  <div className="w-8 h-8 border-4 border-[#21522f] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-gray-600">Chargement des produits...</p>
                </div>
              ) : filteredProducts.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                  {filteredProducts.map((product) => (
                    <div
                      key={product.id}
                      className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors duration-200"
                      onClick={() => addProductToInvoice(product)}
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
                            {parseFloat(product.regular_price || product.price || '0').toLocaleString('fr-FR', { 
                              minimumFractionDigits: 2, 
                              maximumFractionDigits: 2 
                            })} DH
                          </p>
                          <p className="text-sm text-gray-500">
                            TVA: {getVATPercentage(product.tax_class)}%
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>Aucun produit trouvé</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoicePage;