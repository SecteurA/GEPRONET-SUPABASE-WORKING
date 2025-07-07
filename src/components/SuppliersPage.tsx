import React, { useState, useEffect } from 'react';
import { RefreshCw, Search, Plus, Edit, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import SupplierForm from './SupplierForm';

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

const SuppliersPage: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchSuppliers();
  }, [searchTerm]);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      setError('');

      let query = supabase
        .from('suppliers')
        .select('*')
        .order('created_at', { ascending: false });

      if (searchTerm) {
        query = query.or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,company_name.ilike.%${searchTerm}%,ice.ilike.%${searchTerm}%`);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        setError('Erreur lors du chargement des fournisseurs');
        return;
      }

      setSuppliers(data || []);
    } catch (err) {
      setError('Erreur lors du chargement des fournisseurs');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingSupplier(null);
    setShowForm(true);
  };

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setShowForm(true);
  };

  const handleDelete = async (supplierId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce fournisseur ?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('suppliers')
        .delete()
        .eq('id', supplierId);

      if (error) {
        setError('Erreur lors de la suppression');
        return;
      }

      setSuccess('Fournisseur supprimé avec succès');
      fetchSuppliers();
    } catch (err) {
      setError('Erreur lors de la suppression');
    }
  };

  const handleFormSubmit = async (supplierData: Partial<Supplier>) => {
    try {
      setError('');
      setSuccess('');

      if (editingSupplier) {
        // Update existing supplier
        const { error } = await supabase
          .from('suppliers')
          .update({
            ...supplierData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingSupplier.id);

        if (error) {
          setError('Erreur lors de la mise à jour');
          return;
        }

        setSuccess('Fournisseur mis à jour avec succès');
      } else {
        // Create new supplier
        const { error } = await supabase
          .from('suppliers')
          .insert([supplierData]);

        if (error) {
          setError('Erreur lors de la création');
          return;
        }

        setSuccess('Fournisseur créé avec succès');
      }

      setShowForm(false);
      setEditingSupplier(null);
      fetchSuppliers();
    } catch (err) {
      setError('Erreur lors de la sauvegarde');
    }
  };

  if (showForm) {
    return (
      <SupplierForm
        supplier={editingSupplier}
        onSubmit={handleFormSubmit}
        onCancel={() => {
          setShowForm(false);
          setEditingSupplier(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fournisseurs</h1>
          <p className="text-gray-600">Gestion des fournisseurs</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleCreate}
            className="flex items-center space-x-2 px-4 py-2 bg-[#21522f] text-white rounded-lg hover:bg-[#1a4025] transition-colors duration-200"
          >
            <Plus className="w-4 h-4" />
            <span>Nouveau Fournisseur</span>
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

      {/* Search */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Rechercher par nom, email, entreprise ou ICE..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#21522f] focus:border-transparent"
          />
        </div>
      </div>

      {/* Suppliers Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nom & Prénom
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Téléphone
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Entreprise
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ICE
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Adresse
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex justify-center items-center space-x-2">
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      <span>Chargement...</span>
                    </div>
                  </td>
                </tr>
              ) : suppliers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    {searchTerm ? 'Aucun fournisseur trouvé pour cette recherche' : 'Aucun fournisseur trouvé'}
                  </td>
                </tr>
              ) : (
                suppliers.map((supplier) => (
                  <tr key={supplier.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {supplier.first_name} {supplier.last_name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{supplier.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{supplier.phone || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{supplier.company_name || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{supplier.ice || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{supplier.address_line1 || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEdit(supplier)}
                          className="text-indigo-600 hover:text-indigo-900 transition-colors duration-200"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(supplier.id)}
                          className="text-red-600 hover:text-red-900 transition-colors duration-200"
                        >
                          <Trash2 className="w-4 h-4" />
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

export default SuppliersPage;