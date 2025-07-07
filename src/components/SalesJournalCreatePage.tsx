import React, { useState } from 'react';
import { ArrowLeft, Calendar, FileText, Save } from 'lucide-react';

interface SalesJournalCreatePageProps {
  onBack: () => void;
}

const SalesJournalCreatePage: React.FC<SalesJournalCreatePageProps> = ({ onBack }) => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleCreateJournal = async () => {
    if (!selectedDate) {
      setError('Veuillez sélectionner une date');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-sales-journal`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          journal_date: selectedDate,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || 'Erreur lors de la création du journal de vente');
        return;
      }

      setSuccess(`${result.message}. ${result.stats.orders_count} commandes et ${result.stats.line_items_count} articles traités.`);
      
      // Redirect back to list after success
      setTimeout(() => {
        onBack();
      }, 3000);

    } catch (err) {
      setError('Erreur lors de la création du journal de vente');
    } finally {
      setLoading(false);
    }
  };

  const formatDateDisplay = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-[#21522f] transition-colors duration-200"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Retour aux journaux</span>
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nouveau Journal de Vente</h1>
          <p className="text-gray-600">Créer un journal de vente pour une date spécifique</p>
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

      {/* Date Selection */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="max-w-md mx-auto text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-[#21522f] rounded-full flex items-center justify-center">
              <Calendar className="w-8 h-8 text-white" />
            </div>
          </div>
          
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Sélectionner la date</h2>
            <p className="text-gray-600">
              Choisissez la date pour laquelle vous souhaitez créer le journal de vente.
              Toutes les commandes de cette date seront automatiquement importées.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">
                Date du journal
              </label>
              <input
                type="date"
                id="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#21522f] focus:border-transparent text-center text-lg"
              />
            </div>

            {selectedDate && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 text-blue-800">
                  <FileText className="w-5 h-5" />
                  <span className="font-medium">Date sélectionnée:</span>
                </div>
                <p className="text-blue-700 text-lg font-semibold mt-1 capitalize">
                  {formatDateDisplay(selectedDate)}
                </p>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <button
              onClick={handleCreateJournal}
              disabled={loading || !selectedDate}
              className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-[#21522f] text-white rounded-lg hover:bg-[#1a4025] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Création en cours...</span>
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  <span>Créer le Journal de Vente</span>
                </>
              )}
            </button>

            <div className="text-sm text-gray-500 space-y-1">
              <p>• Le journal importera automatiquement toutes les commandes de la date sélectionnée</p>
              <p>• Chaque article sera listé individuellement avec ses détails de TVA</p>
              <p>• Un numéro unique sera généré (ex: FG20250001)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesJournalCreatePage;