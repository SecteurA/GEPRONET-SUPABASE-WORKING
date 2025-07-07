import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle, Settings } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface InvoiceSettings {
  id: string;
  prefix: string;
  year: number;
  current_number: number;
}

interface InvoiceSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

const InvoiceSettingsModal: React.FC<InvoiceSettingsModalProps> = ({ isOpen, onClose, onSave }) => {
  const [settings, setSettings] = useState<InvoiceSettings>({
    id: '',
    prefix: 'FA',
    year: new Date().getFullYear(),
    current_number: 1,
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchSettings();
    }
  }, [isOpen]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError('');

      const { data, error: fetchError } = await supabase
        .from('invoice_settings')
        .select('*')
        .single();

      if (fetchError) {
        setError('Erreur lors du chargement des paramètres');
        return;
      }

      if (data) {
        setSettings(data);
      }
    } catch (err) {
      setError('Erreur lors du chargement des paramètres');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');

      if (!settings.prefix.trim()) {
        setError('Le préfixe est requis');
        return;
      }

      if (settings.current_number < 1) {
        setError('Le numéro actuel doit être supérieur à 0');
        return;
      }

      const { error: updateError } = await supabase
        .from('invoice_settings')
        .update({
          prefix: settings.prefix.trim().toUpperCase(),
          year: settings.year,
          current_number: settings.current_number,
          updated_at: new Date().toISOString(),
        })
        .eq('id', settings.id);

      if (updateError) {
        setError('Erreur lors de la sauvegarde');
        return;
      }

      onSave();
      onClose();
    } catch (err) {
      setError('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: keyof InvoiceSettings, value: string | number) => {
    setSettings(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const getNextInvoiceNumber = () => {
    return `${settings.prefix}-${settings.year}${settings.current_number.toString().padStart(4, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Settings className="w-5 h-5 text-[#21522f]" />
            <h3 className="text-lg font-semibold text-gray-900">Paramètres de Numérotation</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
            <span className="text-sm text-red-700">{error}</span>
          </div>
        )}

        {loading ? (
          <div className="text-center py-8">
            <div className="w-6 h-6 border-2 border-[#21522f] border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-gray-600">Chargement...</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label htmlFor="prefix" className="block text-sm font-medium text-gray-700 mb-1">
                Préfixe
              </label>
              <input
                type="text"
                id="prefix"
                value={settings.prefix}
                onChange={(e) => handleInputChange('prefix', e.target.value.toUpperCase())}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#21522f] focus:border-transparent"
                placeholder="FA"
                maxLength={10}
              />
              <p className="text-xs text-gray-500 mt-1">
                Préfixe pour les numéros de facture (ex: FA, FACT, INV)
              </p>
            </div>

            <div>
              <label htmlFor="year" className="block text-sm font-medium text-gray-700 mb-1">
                Année
              </label>
              <input
                type="number"
                id="year"
                value={settings.year}
                onChange={(e) => handleInputChange('year', parseInt(e.target.value) || new Date().getFullYear())}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#21522f] focus:border-transparent"
                min="2000"
                max="2099"
              />
            </div>

            <div>
              <label htmlFor="current_number" className="block text-sm font-medium text-gray-700 mb-1">
                Numéro actuel
              </label>
              <input
                type="number"
                id="current_number"
                value={settings.current_number}
                onChange={(e) => handleInputChange('current_number', parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#21522f] focus:border-transparent"
                min="1"
              />
              <p className="text-xs text-gray-500 mt-1">
                Prochaine facture aura le numéro: <strong>{getNextInvoiceNumber()}</strong>
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <h4 className="text-sm font-medium text-blue-900 mb-2">Aperçu du format</h4>
              <p className="text-sm text-blue-800">
                Format: <strong>{settings.prefix}-AAAA####</strong>
              </p>
              <p className="text-sm text-blue-800">
                Exemple: <strong>{getNextInvoiceNumber()}</strong>
              </p>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200"
              >
                Annuler
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center space-x-2 px-4 py-2 bg-[#21522f] text-white rounded-lg hover:bg-[#1a4025] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Sauvegarde...' : 'Sauvegarder'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InvoiceSettingsModal;