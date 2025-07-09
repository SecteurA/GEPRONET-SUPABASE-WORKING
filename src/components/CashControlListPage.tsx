import React, { useState, useEffect } from 'react';
import { RefreshCw, Plus, Eye, Calculator, Banknote, CreditCard, FileText } from 'lucide-react';
import { supabase } from '../lib/supabase';
import DocumentFilters from './DocumentFilters';

interface CashControl {
  id: string;
  control_number: string;
  control_date: string;
  cash_total: number;
  transfer_total: number;
  check_total: number;
  total_amount: number;
  status: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

interface CashControlListPageProps {
  onCreateNew: () => void;
  onViewControl: (controlId: string) => void;
}

const CashControlListPage: React.FC<CashControlListPageProps> = ({
  onCreateNew,
  onViewControl,
}) => {
  const [cashControls, setCashControls] = useState<CashControl[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  useEffect(() => {
    fetchCashControls();
  }, [searchTerm, selectedClient, dateFrom, dateTo, selectedStatus]);

  const fetchCashControls = async () => {
    try {
      setLoading(true);
      setError('');

      let query = supabase
        .from('cash_controls')
        .select('*')
        .order('created_at', { ascending: false });

      // Apply filters
      if (searchTerm) {
        query = query.ilike('control_number', `%${searchTerm}%`);
      }

      if (dateFrom) {
        query = query.gte('control_date', dateFrom);
      }

      if (dateTo) {
        query = query.lte('control_date', dateTo);
      }

      if (selectedStatus) {
        query = query.eq('status', selectedStatus);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        setError('Erreur lors du chargement des contrôles de caisse');
        return;
      }

      setCashControls(data || []);
    } catch (err) {
      setError('Erreur lors du chargement des contrôles de caisse');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'closed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'closed':
        return 'Clôturé';
      case 'pending':
        return 'En attente';
      default:
        return status;
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedClient('');
    setDateFrom('');
    setDateTo('');
    setSelectedStatus('');
  };

  const statusOptions = [
    { value: 'closed', label: 'Clôturé' },
    { value: 'pending', label: 'En attente' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contrôle de Caisse</h1>
          <p className="text-gray-600">Gestion des clôtures de caisse quotidiennes</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={onCreateNew}
            className="flex items-center space-x-2 px-4 py-2 bg-[#21522f] text-white rounded-lg hover:bg-[#1a4025] transition-colors duration-200"
          >
            <Plus className="w-4 h-4" />
            <span>Nouvelle Clôture</span>
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

      {/* Filters */}
      <DocumentFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Rechercher par numéro de contrôle..."
        selectedClient={selectedClient}
        onClientChange={setSelectedClient}
        clientTableName="cash_controls"
        clientFieldName="control_number"
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        dateFieldLabel="Date de contrôle"
        selectedStatus={selectedStatus}
        onStatusChange={setSelectedStatus}
        statusOptions={statusOptions}
        onClearFilters={clearFilters}
      />

      {/* Cash Controls Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  N° Contrôle
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Espèces
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Virements
                </th>
               <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                 Chèques
               </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex justify-center items-center space-x-2">
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      <span>Chargement...</span>
                    </div>
                  </td>
                </tr>
              ) : cashControls.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center space-y-2">
                      <Calculator className="w-12 h-12 text-gray-300" />
                      <p>Aucun contrôle de caisse trouvé</p>
                      <p className="text-sm">Créez votre première clôture pour commencer</p>
                    </div>
                  </td>
                </tr>
              ) : (
                cashControls.map((control) => (
                  <tr key={control.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {control.control_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(control.control_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center space-x-2">
                        <Banknote className="w-4 h-4 text-green-600" />
                        <span>{control.cash_total.toLocaleString('fr-FR', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })} DH</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center space-x-2">
                        <CreditCard className="w-4 h-4 text-blue-600" />
                        <span>{control.transfer_total.toLocaleString('fr-FR', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })} DH</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center space-x-2">
                        <FileText className="w-4 h-4 text-purple-600" />
                        <span>{control.check_total.toLocaleString('fr-FR', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })} DH</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {control.total_amount.toLocaleString('fr-FR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })} DH
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(control.status)}`}>
                        {getStatusText(control.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => onViewControl(control.id)}
                          className="text-indigo-600 hover:text-indigo-900 transition-colors duration-200"
                          title="Voir le contrôle"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CashControlListPage;