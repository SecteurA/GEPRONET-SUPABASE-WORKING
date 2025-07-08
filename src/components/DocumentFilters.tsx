import React, { useState, useEffect } from 'react';
import { Search, Filter, X, Calendar, User, Tag } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface FilterOption {
  value: string;
  label: string;
  color?: string;
}

interface DocumentFiltersProps {
  // Search
  searchTerm: string;
  onSearchChange: (term: string) => void;
  searchPlaceholder?: string;
  
  // Client filter
  selectedClient: string;
  onClientChange: (client: string) => void;
  clientTableName?: string; // e.g., 'delivery_notes', 'invoices', etc.
  clientFieldName?: string; // e.g., 'customer_name'
  
  // Date filter
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (date: string) => void;
  onDateToChange: (date: string) => void;
  dateFieldLabel?: string; // e.g., 'Date de livraison', 'Date de facture'
  
  // Status filter
  selectedStatus: string;
  onStatusChange: (status: string) => void;
  statusOptions: FilterOption[];
  
  // General
  onClearFilters: () => void;
  className?: string;
}

const DocumentFilters: React.FC<DocumentFiltersProps> = ({
  searchTerm,
  onSearchChange,
  searchPlaceholder = "Rechercher...",
  selectedClient,
  onClientChange,
  clientTableName = 'delivery_notes',
  clientFieldName = 'customer_name',
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  dateFieldLabel = "Date",
  selectedStatus,
  onStatusChange,
  statusOptions,
  onClearFilters,
  className = "",
}) => {
  const [clients, setClients] = useState<string[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Fetch unique clients when component mounts or table changes
  useEffect(() => {
    fetchClients();
  }, [clientTableName, clientFieldName]);

  const fetchClients = async () => {
    try {
      setLoadingClients(true);
      
      const { data, error } = await supabase
        .from(clientTableName)
        .select(clientFieldName)
        .not(clientFieldName, 'is', null)
        .not(clientFieldName, 'eq', '');

      if (error) {
        console.error('Error fetching clients:', error);
        return;
      }

      // Extract unique client names and sort them
      const uniqueClients = [...new Set(
        data.map(item => item[clientFieldName])
          .filter(name => name && name.trim())
          .map(name => name.trim())
      )].sort();

      setClients(uniqueClients);
    } catch (err) {
      console.error('Error fetching clients:', err);
    } finally {
      setLoadingClients(false);
    }
  };

  const hasActiveFilters = selectedClient || dateFrom || dateTo || selectedStatus;

  const handleClearFilters = () => {
    onClearFilters();
    setShowFilters(false);
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4 space-y-4 ${className}`}>
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <input
          type="text"
          placeholder={searchPlaceholder}
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#21522f] focus:border-transparent"
        />
      </div>

      {/* Filter Toggle */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors duration-200 ${
            showFilters || hasActiveFilters
              ? 'bg-[#21522f] text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <Filter className="w-4 h-4" />
          <span>Filtres</span>
          {hasActiveFilters && (
            <span className="bg-white text-[#21522f] px-2 py-1 rounded-full text-xs font-medium">
              {[selectedClient, dateFrom || dateTo, selectedStatus].filter(Boolean).length}
            </span>
          )}
        </button>

        {hasActiveFilters && (
          <button
            onClick={handleClearFilters}
            className="flex items-center space-x-1 px-3 py-2 text-gray-600 hover:text-red-600 transition-colors duration-200"
          >
            <X className="w-4 h-4" />
            <span className="text-sm">Effacer</span>
          </button>
        )}
      </div>

      {/* Filter Options */}
      {showFilters && (
        <div className="border-t border-gray-200 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Client Filter */}
            <div>
              <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                <User className="w-4 h-4" />
                <span>Client</span>
              </label>
              <select
                value={selectedClient}
                onChange={(e) => onClientChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#21522f] focus:border-transparent text-sm"
                disabled={loadingClients}
              >
                <option value="">Tous les clients</option>
                {clients.map((client) => (
                  <option key={client} value={client}>
                    {client}
                  </option>
                ))}
              </select>
              {loadingClients && (
                <p className="text-xs text-gray-500 mt-1">Chargement des clients...</p>
              )}
            </div>

            {/* Date Filter */}
            <div>
              <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4" />
                <span>{dateFieldLabel}</span>
              </label>
              <div className="space-y-2">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => onDateFromChange(e.target.value)}
                  placeholder="Date de début"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#21522f] focus:border-transparent text-sm"
                />
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => onDateToChange(e.target.value)}
                  placeholder="Date de fin"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#21522f] focus:border-transparent text-sm"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                <Tag className="w-4 h-4" />
                <span>Statut</span>
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => onStatusChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#21522f] focus:border-transparent text-sm"
              >
                <option value="">Tous les statuts</option>
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Active Filters Summary */}
          {hasActiveFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-sm font-medium text-gray-700 mb-2">Filtres actifs:</p>
              <div className="flex flex-wrap gap-2">
                {selectedClient && (
                  <span className="inline-flex items-center space-x-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                    <User className="w-3 h-3" />
                    <span>{selectedClient}</span>
                    <button
                      onClick={() => onClientChange('')}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {(dateFrom || dateTo) && (
                  <span className="inline-flex items-center space-x-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                    <Calendar className="w-3 h-3" />
                    <span>
                      {dateFrom && dateTo
                        ? `${new Date(dateFrom).toLocaleDateString('fr-FR')} - ${new Date(dateTo).toLocaleDateString('fr-FR')}`
                        : dateFrom
                        ? `Depuis ${new Date(dateFrom).toLocaleDateString('fr-FR')}`
                        : `Jusqu'à ${new Date(dateTo).toLocaleDateString('fr-FR')}`}
                    </span>
                    <button
                      onClick={() => {
                        onDateFromChange('');
                        onDateToChange('');
                      }}
                      className="text-green-600 hover:text-green-800"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {selectedStatus && (
                  <span className="inline-flex items-center space-x-1 px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm">
                    <Tag className="w-3 h-3" />
                    <span>{statusOptions.find(opt => opt.value === selectedStatus)?.label || selectedStatus}</span>
                    <button
                      onClick={() => onStatusChange('')}
                      className="text-purple-600 hover:text-purple-800"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DocumentFilters;