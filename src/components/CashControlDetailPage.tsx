import React, { useState, useEffect } from 'react';
import { ArrowLeft, Printer, Calculator, Banknote, CreditCard, FileText } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface CashControlDetail {
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

interface CashControlDetailPageProps {
  controlId: string;
  onBack: () => void;
}

const CashControlDetailPage: React.FC<CashControlDetailPageProps> = ({ controlId, onBack }) => {
  const [cashControl, setCashControl] = useState<CashControlDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchCashControlDetail();
  }, [controlId]);

  const fetchCashControlDetail = async () => {
    try {
      setLoading(true);
      setError('');

      const { data, error: fetchError } = await supabase
        .from('cash_controls')
        .select('*')
        .eq('id', controlId)
        .single();

      if (fetchError) {
        setError('Contrôle de caisse non trouvé');
        return;
      }

      setCashControl(data);
    } catch (err) {
      setError('Erreur lors du chargement du contrôle de caisse');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDateTimeWithSeconds = (dateString: string) => {
    return new Date(dateString).toLocaleString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };
  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-[#21522f] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement du contrôle de caisse...</p>
        </div>
      </div>
    );
  }

  if (error || !cashControl) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-[#21522f] transition-colors duration-200"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retour</span>
          </button>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
          <p className="text-red-700">{error || 'Contrôle de caisse non trouvé'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between print:hidden">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-[#21522f] transition-colors duration-200"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Retour</span>
        </button>
        <div className="flex space-x-3">
          <button
            onClick={handlePrint}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimer</span>
          </button>
        </div>
      </div>

      {/* Cash Control Layout */}
      <div className="bg-white shadow-sm border border-gray-200 rounded-lg p-8 print:shadow-none print:border-none">
        {/* Header */}
        <div className="pb-6 mb-6 border-b border-gray-200">
          <div className="flex justify-between items-start">
            <div>
              <div className="w-64 text-center text-sm leading-tight mb-4">
                <div className="font-bold text-lg text-gray-900">GETRADIS</div>
                <div className="font-semibold text-gray-800">Magasin Gepronet</div>
                <div className="text-gray-700 mt-1">111, Avenue Mohamed Belhassan</div>
                <div className="text-gray-700">Elouazani - RABAT</div>
                <div className="text-gray-700 mt-1">Patente : 25903587 - R. C. : 29149</div>
                <div className="text-gray-700">I. F. : 03315202</div>
                <div className="text-gray-700 mt-1">Tél : 0537654006</div>
                <div className="text-gray-700">Fax: 0537756864</div>
                <div className="text-gray-700">e-mail : contact@gepronet.com</div>
              </div>
            </div>
            <div className="text-right">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">CONTRÔLE DE CAISSE</h1>
              <p className="text-lg font-semibold text-gray-700">{cashControl.control_number}</p>
              <p className="text-sm text-gray-600">Date: {formatDate(cashControl.control_date)}</p>
              <p className="text-sm text-gray-600">Créé le: {formatDateTime(cashControl.created_at)}</p>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8 print:hidden">
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <div className="flex items-center space-x-3">
              <Banknote className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-sm font-medium text-green-600">Espèces</p>
                <p className="text-2xl font-bold text-green-900">
                  {cashControl.cash_total.toLocaleString('fr-FR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })} DH
                </p>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-center space-x-3">
              <CreditCard className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-blue-600">Virements</p>
                <p className="text-2xl font-bold text-blue-900">
                  {cashControl.transfer_total.toLocaleString('fr-FR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })} DH
                </p>
              </div>
            </div>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
            <div className="flex items-center space-x-3">
              <FileText className="w-8 h-8 text-purple-600" />
              <div>
                <p className="text-sm font-medium text-purple-600">Chèques</p>
                <p className="text-2xl font-bold text-purple-900">
                  {cashControl.check_total.toLocaleString('fr-FR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })} DH
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
            <div className="flex items-center space-x-3">
              <Calculator className="w-8 h-8 text-gray-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Total</p>
                <p className="text-2xl font-bold text-gray-900">
                  {cashControl.total_amount.toLocaleString('fr-FR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })} DH
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Details Table */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Détails du contrôle</h3>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-900">
                    Mode de paiement
                  </th>
                  <th className="border border-gray-300 px-4 py-3 text-right text-sm font-semibold text-gray-900">
                    Montant
                  </th>
                  <th className="border border-gray-300 px-4 py-3 text-right text-sm font-semibold text-gray-900">
                    Pourcentage
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-gray-300 px-4 py-3 text-sm text-gray-900">
                    <div className="flex items-center space-x-2">
                      <Banknote className="w-4 h-4 text-green-600" />
                      <span>Espèces</span>
                    </div>
                  </td>
                  <td className="border border-gray-300 px-4 py-3 text-right text-sm text-gray-900">
                    {cashControl.cash_total.toLocaleString('fr-FR', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })} DH
                  </td>
                  <td className="border border-gray-300 px-4 py-3 text-right text-sm text-gray-900">
                    {cashControl.total_amount > 0 
                      ? ((cashControl.cash_total / cashControl.total_amount) * 100).toFixed(1)
                      : '0.0'
                    }%
                  </td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-4 py-3 text-sm text-gray-900">
                    <div className="flex items-center space-x-2">
                      <CreditCard className="w-4 h-4 text-blue-600" />
                      <span>Virements</span>
                    </div>
                  </td>
                  <td className="border border-gray-300 px-4 py-3 text-right text-sm text-gray-900">
                    {cashControl.transfer_total.toLocaleString('fr-FR', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })} DH
                  </td>
                  <td className="border border-gray-300 px-4 py-3 text-right text-sm text-gray-900">
                    {cashControl.total_amount > 0 
                      ? ((cashControl.transfer_total / cashControl.total_amount) * 100).toFixed(1)
                      : '0.0'
                    }%
                  </td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-4 py-3 text-sm text-gray-900">
                    <div className="flex items-center space-x-2">
                      <FileText className="w-4 h-4 text-purple-600" />
                      <span>Chèques</span>
                    </div>
                  </td>
                  <td className="border border-gray-300 px-4 py-3 text-right text-sm text-gray-900">
                    {cashControl.check_total.toLocaleString('fr-FR', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })} DH
                  </td>
                  <td className="border border-gray-300 px-4 py-3 text-right text-sm text-gray-900">
                    {cashControl.total_amount > 0 
                      ? ((cashControl.check_total / cashControl.total_amount) * 100).toFixed(1)
                      : '0.0'
                    }%
                  </td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-900">
                    Total
                  </td>
                  <td className="border border-gray-300 px-4 py-3 text-right text-sm font-semibold text-gray-900">
                    {cashControl.total_amount.toLocaleString('fr-FR', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })} DH
                  </td>
                  <td className="border border-gray-300 px-4 py-3 text-right text-sm font-semibold text-gray-900">
                    100.0%
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Notes */}
        {cashControl.notes && (
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Notes:</h3>
            <p className="text-gray-700 whitespace-pre-line">{cashControl.notes}</p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-gray-200 text-center text-sm text-gray-600">
          <p>Contrôle généré le {formatDateTimeWithSeconds(cashControl.created_at)}</p>
          <p>Statut: {cashControl.status === 'closed' ? 'Clôturé' : 'En attente'}</p>
        </div>
      </div>
    </div>
  );
};

export default CashControlDetailPage;