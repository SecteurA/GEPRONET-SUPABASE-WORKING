import React, { useState, useEffect } from 'react';
import { Search, User, Building, Phone, Mail, MapPin, FileText, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Supplier {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  company_name: string;
  ice: string;
  address_line1: string;
  created_at: string;
  updated_at: string;
}

interface SupplierSelectorProps {
  selectedSupplier?: Supplier | null;
  onSupplierSelect: (supplier: Supplier | null) => void;
  title?: string;
  showFullForm?: boolean;
}

const SupplierSelector: React.FC<SupplierSelectorProps> = ({ 
  selectedSupplier, 
  onSupplierSelect, 
  title = "Informations Fournisseur",
  showFullForm = false 
}) => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [error, setError] = useState('');

  // Debounced search effect
  useEffect(() => {
    if (searchTerm.length < 2) {
      setSuppliers([]);
      setShowResults(false);
      return;
    }

    const timeoutId = setTimeout(() => {
      searchSuppliers();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const searchSuppliers = async () => {
    try {
      setLoading(true);
      setError('');

      let query = supabase
        .from('suppliers')
        .select('*')
        .or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,company_name.ilike.%${searchTerm}%,ice.ilike.%${searchTerm}%`)
        .order('created_at', { ascending: false })
        .limit(10);

      const { data, error: fetchError } = await query;

      if (fetchError) {
        setError('Erreur lors de la recherche');
        return;
      }

      setSuppliers(data || []);
      setShowResults(true);
    } catch (err) {
      setError('Erreur lors de la recherche');
    } finally {
      setLoading(false);
    }
  };

  const handleSupplierSelect = (supplier: Supplier) => {
    onSupplierSelect(supplier);
    setSearchTerm('');
    setShowResults(false);
    setSuppliers([]);
  };

  const handleClearSelection = () => {
    onSupplierSelect(null);
    setSearchTerm('');
    setShowResults(false);
    setSuppliers([]);
  };

  const formatSupplierName = (supplier: Supplier) => {
    return `${supplier.first_name} ${supplier.last_name}`.trim();
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        {selectedSupplier && (
          <button
            onClick={handleClearSelection}
            className="flex items-center space-x-1 px-3 py-1 text-sm text-gray-600 hover:text-red-600 transition-colors duration-200"
            title="Changer de fournisseur"
          >
            <X className="w-4 h-4" />
            <span>Changer</span>
          </button>
        )}
      </div>

      {!selectedSupplier ? (
        <div className="space-y-4">
          {/* Search Section */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Rechercher un fournisseur par nom, email, entreprise ou ICE..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#21522f] focus:border-transparent"
            />
          </div>

          {/* Loading State */}
          {loading && (
            <div className="text-center py-4">
              <div className="inline-flex items-center space-x-2 text-gray-600">
                <div className="w-4 h-4 border-2 border-[#21522f] border-t-transparent rounded-full animate-spin"></div>
                <span>Recherche en cours...</span>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Search Results */}
          {showResults && suppliers.length > 0 && (
            <div className="border border-gray-200 rounded-lg divide-y divide-gray-200 max-h-64 overflow-y-auto">
              {suppliers.map((supplier) => (
                <div
                  key={supplier.id}
                  onClick={() => handleSupplierSelect(supplier)}
                  className="p-4 hover:bg-gray-50 cursor-pointer transition-colors duration-200"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <User className="w-4 h-4 text-gray-400" />
                        <h4 className="font-medium text-gray-900">
                          {formatSupplierName(supplier)}
                        </h4>
                      </div>
                      
                      <div className="space-y-1 text-sm text-gray-600">
                        {supplier.email && (
                          <div className="flex items-center space-x-2">
                            <Mail className="w-3 h-3 text-gray-400" />
                            <span>{supplier.email}</span>
                          </div>
                        )}
                        
                        {supplier.company_name && (
                          <div className="flex items-center space-x-2">
                            <Building className="w-3 h-3 text-gray-400" />
                            <span>{supplier.company_name}</span>
                          </div>
                        )}
                        
                        {supplier.phone && (
                          <div className="flex items-center space-x-2">
                            <Phone className="w-3 h-3 text-gray-400" />
                            <span>{supplier.phone}</span>
                          </div>
                        )}
                        
                        {supplier.ice && (
                          <div className="flex items-center space-x-2">
                            <FileText className="w-3 h-3 text-gray-400" />
                            <span>ICE: {supplier.ice}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* No Results */}
          {showResults && suppliers.length === 0 && !loading && searchTerm.length >= 2 && (
            <div className="text-center py-8 text-gray-500">
              <User className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="font-medium">Aucun fournisseur trouvé</p>
              <p className="text-sm">Aucun fournisseur ne correspond à "{searchTerm}"</p>
            </div>
          )}

          {/* Help Text */}
          {!showResults && searchTerm.length < 2 && (
            <div className="text-center py-8 text-gray-500">
              <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="font-medium">Rechercher un fournisseur existant</p>
              <p className="text-sm">Tapez au moins 2 caractères pour commencer la recherche</p>
            </div>
          )}
        </div>
      ) : (
        /* Selected Supplier Display */
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-3">
              <User className="w-5 h-5 text-[#21522f]" />
              <h3 className="font-semibold text-gray-900">Fournisseur sélectionné</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Nom complet</p>
                <p className="text-gray-900 font-medium">{formatSupplierName(selectedSupplier)}</p>
              </div>
              
              {selectedSupplier.email && (
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Email</p>
                  <p className="text-gray-900">{selectedSupplier.email}</p>
                </div>
              )}
              
              {selectedSupplier.phone && (
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Téléphone</p>
                  <p className="text-gray-900">{selectedSupplier.phone}</p>
                </div>
              )}
              
              {selectedSupplier.company_name && (
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Entreprise</p>
                  <p className="text-gray-900">{selectedSupplier.company_name}</p>
                </div>
              )}
              
              {selectedSupplier.ice && (
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">ICE</p>
                  <p className="text-gray-900">{selectedSupplier.ice}</p>
                </div>
              )}
              
              {selectedSupplier.address_line1 && (
                <div className="md:col-span-2">
                  <p className="text-sm font-medium text-gray-600 mb-1">Adresse</p>
                  <p className="text-gray-900">{selectedSupplier.address_line1}</p>
                </div>
              )}
            </div>
          </div>

          {/* Additional form fields if showFullForm is true */}
          {showFullForm && (
            <div className="space-y-4 pt-4 border-t border-gray-200">
              <h3 className="text-md font-medium text-gray-900">Informations supplémentaires</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date d'échéance
                  </label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#21522f] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Référence
                  </label>
                  <input
                    type="text"
                    placeholder="Référence du document"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#21522f] focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SupplierSelector;