import React, { useState } from 'react';
import { ArrowLeft, Save, Calculator, AlertCircle } from 'lucide-react';

interface CashControlFormPageProps {
  onBack: () => void;
}

const CashControlFormPage: React.FC<CashControlFormPageProps> = ({ onBack }) => {
  const [formData, setFormData] = useState({
    control_date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      setError('');
      setSuccess('');

      if (!formData.control_date) {
        setError('La date de contrôle est requise');
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-cash-control`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || 'Erreur lors de la création du contrôle de caisse');
        return;
      }

      setSuccess(result.message);
      
      // Go back to list after successful creation
      setTimeout(() => {
        onBack();
      }, 2000);

    } catch (err) {
      setError('Erreur lors de la création du contrôle de caisse');
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
            <span>Retour</span>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Nouvelle Clôture de Caisse</h1>
            <p className="text-gray-600">Créer une nouvelle clôture de caisse quotidienne</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-700">
          {success}
        </div>
      )}

      {/* Form */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex items-center space-x-3 mb-6">
            <Calculator className="w-6 h-6 text-[#21522f]" />
            <h2 className="text-lg font-semibold text-gray-900">Informations de clôture</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="control_date" className="block text-sm font-medium text-gray-700 mb-1">
                Date de contrôle *
              </label>
              <input
                type="date"
                id="control_date"
                value={formData.control_date}
                onChange={(e) => setFormData(prev => ({ ...prev, control_date: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#21522f] focus:border-transparent"
                required
              />
              <p className="mt-1 text-sm text-gray-500">
                Date pour laquelle vous voulez clôturer la caisse
              </p>
            </div>
          </div>

          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
              Notes (optionnel)
            </label>
            <textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
              placeholder="Notes additionnelles sur la clôture..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#21522f] focus:border-transparent"
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 mb-2">Informations importantes</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Le système calculera automatiquement les montants en espèces et virements</li>
              <li>• Seules les factures payées et commandes terminées seront incluses</li>
              <li>• Les factures peuvent être payées par Espèces, Virements, ou Chèque</li>
              <li>• Les virements WooCommerce sont identifiés par "Direct bank transfer"</li>
              <li>• Une fois créé, le contrôle ne peut plus être modifié</li>
            </ul>
          </div>

          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onBack}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center space-x-2 px-6 py-2 bg-[#21522f] text-white rounded-lg hover:bg-[#1a4025] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Création...' : 'Créer la Clôture'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CashControlFormPage;