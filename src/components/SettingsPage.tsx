import React, { useState, useEffect } from 'react';
import { Save, AlertCircle, CheckCircle, Settings } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface WCSettings {
  id?: string;
  api_url: string;
  consumer_key: string;
  consumer_secret: string;
}

interface InvoiceSettings {
  id: string;
  prefix: string;
  year: number;
  current_number: number;
}

const SettingsPage: React.FC = () => {
  const [wcSettings, setWcSettings] = useState<WCSettings>({
    api_url: '',
    consumer_key: '',
    consumer_secret: '',
  });

  const [invoiceSettings, setInvoiceSettings] = useState<InvoiceSettings>({
    id: '',
    prefix: 'FA',
    year: new Date().getFullYear(),
    current_number: 1,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchAllSettings();
  }, []);

  const fetchAllSettings = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch WooCommerce settings
      const wcResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/wc-settings`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      const wcResult = await wcResponse.json();

      if (!wcResponse.ok) {
        setError(wcResult.error || 'Erreur lors du chargement des paramètres WooCommerce');
        return;
      }

      if (wcResult.api_url) {
        setWcSettings(wcResult);
      }

      // Fetch Invoice settings
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoice_settings')
        .select('*')
        .single();

      if (invoiceError && invoiceError.code !== 'PGRST116') {
        setError('Erreur lors du chargement des paramètres de facturation');
        return;
      }

      if (invoiceData) {
        setInvoiceSettings(invoiceData);
      }
    } catch (err) {
      setError('Erreur lors du chargement des paramètres');
    } finally {
      setLoading(false);
    }
  };

  const saveAllSettings = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');

      // Validate WooCommerce settings
      if (!wcSettings.api_url || !wcSettings.consumer_key || !wcSettings.consumer_secret) {
        setError('Tous les champs WooCommerce sont requis');
        return;
      }

      // Validate Invoice settings
      if (!invoiceSettings.prefix.trim()) {
        setError('Le préfixe de facturation est requis');
        return;
      }

      if (invoiceSettings.current_number < 1) {
        setError('Le numéro actuel doit être supérieur à 0');
        return;
      }

      // Save WooCommerce settings
      const wcResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/wc-settings`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(wcSettings),
      });

      const wcResult = await wcResponse.json();

      if (!wcResponse.ok) {
        setError(wcResult.error || 'Erreur lors de la sauvegarde des paramètres WooCommerce');
        return;
      }

      // Save Invoice settings
      const { error: invoiceUpdateError } = await supabase
        .from('invoice_settings')
        .update({
          prefix: invoiceSettings.prefix.trim().toUpperCase(),
          year: invoiceSettings.year,
          current_number: invoiceSettings.current_number,
          updated_at: new Date().toISOString(),
        })
        .eq('id', invoiceSettings.id);

      if (invoiceUpdateError) {
        setError('Erreur lors de la sauvegarde des paramètres de facturation');
        return;
      }

      setSuccess('Tous les paramètres ont été sauvegardés avec succès');
    } catch (err) {
      setError('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleWcInputChange = (field: keyof WCSettings, value: string) => {
    setWcSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleInvoiceInputChange = (field: keyof InvoiceSettings, value: string | number) => {
    setInvoiceSettings(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const getNextInvoiceNumber = () => {
    return `${invoiceSettings.prefix}-${invoiceSettings.year}${invoiceSettings.current_number.toString().padStart(4, '0')}`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-[#21522f] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des paramètres...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Paramètres</h1>
        <p className="text-gray-600">Configuration de l'application</p>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-2">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
          <span className="text-red-700">{error}</span>
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center space-x-2">
          <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
          <span className="text-green-700">{success}</span>
        </div>
      )}

      {/* WooCommerce Settings */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-2 mb-6">
          <Settings className="w-5 h-5 text-[#21522f]" />
          <h2 className="text-lg font-semibold text-gray-900">Configuration WooCommerce</h2>
        </div>
        
        <div className="space-y-6">
          <div>
            <label htmlFor="api_url" className="block text-sm font-medium text-gray-700 mb-2">
              URL de l'API WooCommerce
            </label>
            <input
              type="url"
              id="api_url"
              value={wcSettings.api_url}
              onChange={(e) => handleWcInputChange('api_url', e.target.value)}
              placeholder="https://example.com/wp-json/wc/v3"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#21522f] focus:border-transparent"
            />
            <p className="mt-1 text-sm text-gray-500">
              L'URL de base de votre API WooCommerce (ex: https://gepronet.ma/wp-json/wc/v3)
            </p>
          </div>

          <div>
            <label htmlFor="consumer_key" className="block text-sm font-medium text-gray-700 mb-2">
              Clé du consommateur (Consumer Key)
            </label>
            <input
              type="text"
              id="consumer_key"
              value={wcSettings.consumer_key}
              onChange={(e) => handleWcInputChange('consumer_key', e.target.value)}
              placeholder="ck_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#21522f] focus:border-transparent font-mono text-sm"
            />
          </div>

          <div>
            <label htmlFor="consumer_secret" className="block text-sm font-medium text-gray-700 mb-2">
              Secret du consommateur (Consumer Secret)
            </label>
            <input
              type="password"
              id="consumer_secret"
              value={wcSettings.consumer_secret}
              onChange={(e) => handleWcInputChange('consumer_secret', e.target.value)}
              placeholder="cs_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#21522f] focus:border-transparent font-mono text-sm"
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-blue-900 mb-2">Comment obtenir vos clés API ?</h3>
            <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
              <li>Connectez-vous à votre administration WordPress</li>
              <li>Allez dans WooCommerce → Paramètres → Avancé → API REST</li>
              <li>Cliquez sur "Ajouter une clé"</li>
              <li>Remplissez les informations et sélectionnez "Lecture/Écriture"</li>
              <li>Copiez la clé du consommateur et le secret généré</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Invoice Settings */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-2 mb-6">
          <Settings className="w-5 h-5 text-[#21522f]" />
          <h2 className="text-lg font-semibold text-gray-900">Configuration de la Numérotation des Factures</h2>
        </div>

        <div className="space-y-6">
          <div>
            <label htmlFor="prefix" className="block text-sm font-medium text-gray-700 mb-2">
              Préfixe
            </label>
            <input
              type="text"
              id="prefix"
              value={invoiceSettings.prefix}
              onChange={(e) => handleInvoiceInputChange('prefix', e.target.value.toUpperCase())}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#21522f] focus:border-transparent"
              placeholder="FA"
              maxLength={10}
            />
            <p className="text-xs text-gray-500 mt-1">
              Préfixe pour les numéros de facture (ex: FA, FACT, INV)
            </p>
          </div>

          <div>
            <label htmlFor="year" className="block text-sm font-medium text-gray-700 mb-2">
              Année
            </label>
            <input
              type="number"
              id="year"
              value={invoiceSettings.year}
              onChange={(e) => handleInvoiceInputChange('year', parseInt(e.target.value) || new Date().getFullYear())}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#21522f] focus:border-transparent"
              min="2000"
              max="2099"
            />
          </div>

          <div>
            <label htmlFor="current_number" className="block text-sm font-medium text-gray-700 mb-2">
              Numéro actuel
            </label>
            <input
              type="number"
              id="current_number"
              value={invoiceSettings.current_number}
              onChange={(e) => handleInvoiceInputChange('current_number', parseInt(e.target.value) || 1)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#21522f] focus:border-transparent"
              min="1"
            />
            <p className="text-xs text-gray-500 mt-1">
              Prochaine facture aura le numéro: <strong>{getNextInvoiceNumber()}</strong>
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-900 mb-2">Aperçu du format</h4>
            <p className="text-sm text-blue-800">
              Format: <strong>{invoiceSettings.prefix}-AAAA####</strong>
            </p>
            <p className="text-sm text-blue-800">
              Exemple: <strong>{getNextInvoiceNumber()}</strong>
            </p>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={saveAllSettings}
          disabled={saving}
          className="flex items-center space-x-2 px-6 py-3 bg-[#21522f] text-white rounded-lg hover:bg-[#1a4025] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
        >
          <Save className="w-5 h-5" />
          <span>{saving ? 'Sauvegarde en cours...' : 'Sauvegarder tous les paramètres'}</span>
        </button>
      </div>
    </div>
  );
};

export default SettingsPage;