import React, { useState, useEffect } from 'react';
import { Search, User, Building, Phone, Mail, MapPin, FileText, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Client {
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

interface ClientSelectorProps {
  selectedClient?: Client | null;
  onClientSelect: (client: Client | null) => void;
  title?: string;
  showFullForm?: boolean;
}

const ClientSelector: React.FC<ClientSelectorProps> = ({ 
  selectedClient, 
  onClientSelect, 
  title = "Informations Client",
  showFullForm = false 
}) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [error, setError] = useState('');

  // Debounced search effect
  useEffect(() => {
    if (searchTerm.length < 2) {
      setClients([]);
      setShowResults(false);
      return;
    }

    const timeoutId = setTimeout(() => {
      searchClients();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const searchClients = async () => {
    try {
      setLoading(true);
      setError('');

      let query = supabase
        .from('clients')
        .select('*')
        .or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,company_name.ilike.%${searchTerm}%,ice.ilike.%${searchTerm}%`)
        .order('created_at', { ascending: false })
        .limit(10);

      const { data, error: fetchError } = await query;

      if (fetchError) {
        setError('Erreur lors de la recherche');
        return;
      }

      setClients(data || []);
      setShowResults(true);
    } catch (err) {
      setError('Erreur lors de la recherche');
    } finally {
      setLoading(false);
    }
  };

  const handleClientSelect = (client: Client) => {
    onClientSelect(client);
    setSearchTerm('');
    setShowResults(false);
    setClients([]);
  };

  const handleClearSelection = () => {
    onClientSelect(null);
    setSearchTerm('');
    setShowResults(false);
    setClients([]);
  };

  const formatClientName = (client: Client) => {
    return `${client.first_name} ${client.last_name}`.trim();
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        {selectedClient && (
          <button
            onClick={handleClearSelection}
            className="flex items-center space-x-1 px-3 py-1 text-sm text-gray-600 hover:text-red-600 transition-colors duration-200"
            title="Changer de client"
          >
            <X className="w-4 h-4" />
            <span>Changer</span>
          </button>
        )}
      </div>

      {!selectedClient ? (
        <div className="space-y-4">
          {/* Search Section */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Rechercher un client par nom, email, entreprise ou ICE..."
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
          {showResults && clients.length > 0 && (
            <div className="border border-gray-200 rounded-lg divide-y divide-gray-200 max-h-64 overflow-y-auto">
              {clients.map((client) => (
                <div
                  key={client.id}
                  onClick={() => handleClientSelect(client)}
                  className="p-4 hover:bg-gray-50 cursor-pointer transition-colors duration-200"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <User className="w-4 h-4 text-gray-400" />
                        <h4 className="font-medium text-gray-900">
                          {formatClientName(client)}
                        </h4>
                      </div>
                      
                      <div className="space-y-1 text-sm text-gray-600">
                        {client.email && (
                          <div className="flex items-center space-x-2">
                            <Mail className="w-3 h-3 text-gray-400" />
                            <span>{client.email}</span>
                          </div>
                        )}
                        
                        {client.company_name && (
                          <div className="flex items-center space-x-2">
                            <Building className="w-3 h-3 text-gray-400" />
                            <span>{client.company_name}</span>
                          </div>
                        )}
                        
                        {client.phone && (
                          <div className="flex items-center space-x-2">
                            <Phone className="w-3 h-3 text-gray-400" />
                            <span>{client.phone}</span>
                          </div>
                        )}
                        
                        {client.ice && (
                          <div className="flex items-center space-x-2">
                            <FileText className="w-3 h-3 text-gray-400" />
                            <span>ICE: {client.ice}</span>
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
          {showResults && clients.length === 0 && !loading && searchTerm.length >= 2 && (
            <div className="text-center py-8 text-gray-500">
              <User className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="font-medium">Aucun client trouvé</p>
              <p className="text-sm">Aucun client ne correspond à "{searchTerm}"</p>
            </div>
          )}

          {/* Help Text */}
          {!showResults && searchTerm.length < 2 && (
            <div className="text-center py-8 text-gray-500">
              <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="font-medium">Rechercher un client existant</p>
              <p className="text-sm">Tapez au moins 2 caractères pour commencer la recherche</p>
            </div>
          )}
        </div>
      ) : (
        /* Selected Client Display */
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-3">
              <User className="w-5 h-5 text-[#21522f]" />
              <h3 className="font-semibold text-gray-900">Client sélectionné</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Nom complet</p>
                <p className="text-gray-900 font-medium">{formatClientName(selectedClient)}</p>
              </div>
              
              {selectedClient.email && (
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Email</p>
                  <p className="text-gray-900">{selectedClient.email}</p>
                </div>
              )}
              
              {selectedClient.phone && (
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Téléphone</p>
                  <p className="text-gray-900">{selectedClient.phone}</p>
                </div>
              )}
              
              {selectedClient.company_name && (
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Entreprise</p>
                  <p className="text-gray-900">{selectedClient.company_name}</p>
                </div>
              )}
              
              {selectedClient.ice && (
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">ICE</p>
                  <p className="text-gray-900">{selectedClient.ice}</p>
                </div>
              )}
              
              {selectedClient.address_line1 && (
                <div className="md:col-span-2">
                  <p className="text-sm font-medium text-gray-600 mb-1">Adresse</p>
                  <p className="text-gray-900">{selectedClient.address_line1}</p>
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

export default ClientSelector;