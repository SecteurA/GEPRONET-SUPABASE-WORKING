import React, { useState, useEffect } from 'react';
import { Save, AlertCircle, CheckCircle } from 'lucide-react';

interface WCSettings {
  id?: string;
  api_url: string;
  consumer_key: string;
  consumer_secret: string;
}

const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<WCSettings>({
    api_url: '',
    consumer_key: '',
    consumer_secret: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/wc-settings`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || 'Erreur lors du chargement des paramètres');
        return;
      }

      if (result.api_url) {
        setSettings(result);
      }
    } catch (err) {
      setError('Erreur lors du chargement des paramètres');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');

      if (!settings.api_url || !settings.consumer_key || !settings.consumer_secret) {
        setError('Tous les champs sont requis');
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/wc-settings`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || 'Erreur lors de la sauvegarde');
        return;
      }

      setSuccess('Paramètres sauvegardés avec succès');
    } catch (err) {
      setError('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: keyof WCSettings, value: string) => {
    setSettings(prev => ({ ...prev, [field]: value }));
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
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Paramètres</h1>
        <p className="text-gray-600">Configuration de l'API WooCommerce</p>
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

      {/* Settings Form */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Configuration WooCommerce</h2>
        
        <div className="space-y-6">
          <div>
            <label htmlFor="api_url" className="block text-sm font-medium text-gray-700 mb-2">
              URL de l'API WooCommerce
            </label>
            <input
              type="url"
              id="api_url"
              value={settings.api_url}
              onChange={(e) => handleInputChange('api_url', e.target.value)}
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
              value={settings.consumer_key}
              onChange={(e) => handleInputChange('consumer_key', e.target.value)}
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
              value={settings.consumer_secret}
              onChange={(e) => handleInputChange('consumer_secret', e.target.value)}
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

          <div className="flex justify-end">
            <button
              onClick={saveSettings}
              disabled={saving}
              className="flex items-center space-x-2 px-6 py-2 bg-[#21522f] text-white rounded-lg hover:bg-[#1a4025] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Sauvegarde...' : 'Sauvegarder'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;