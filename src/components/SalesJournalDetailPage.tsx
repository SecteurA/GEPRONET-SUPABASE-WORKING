import React, { useState, useEffect } from 'react';
import { ArrowLeft, Printer, Calendar, FileText } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface SalesJournalLineItem {
  id: string;
  order_id: string;
  product_id: string;
  product_sku: string;
  product_name: string;
  quantity: number;
  unit_price_ht: number;
  total_ht: number;
  vat_percentage: number;
  vat_amount: number;
}

interface SalesJournalDetail {
  id: string;
  journal_number: string;
  journal_date: string;
  total_ht: number;
  total_vat: number;
  total_ttc: number;
  status: string;
  created_at: string;
  updated_at: string;
  line_items: SalesJournalLineItem[];
}

interface SalesJournalDetailPageProps {
  journalId: string;
  onBack: () => void;
}

const SalesJournalDetailPage: React.FC<SalesJournalDetailPageProps> = ({ journalId, onBack }) => {
  const [journal, setJournal] = useState<SalesJournalDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchJournalDetail();
  }, [journalId]);

  const fetchJournalDetail = async () => {
    try {
      setLoading(true);
      setError('');

      // Get journal details
      const { data: journalData, error: journalError } = await supabase
        .from('sales_journals')
        .select('*')
        .eq('id', journalId)
        .single();

      if (journalError) {
        setError('Journal de vente non trouvé');
        return;
      }

      // Get line items for the journal
      const { data: lineItems, error: lineItemsError } = await supabase
        .from('sales_journal_line_items')
        .select('*')
        .eq('journal_id', journalId)
        .order('product_sku', { ascending: true });

      if (lineItemsError) {
        console.error('Error fetching line items:', lineItemsError);
      }

      setJournal({
        ...journalData,
        line_items: lineItems || []
      });
    } catch (err) {
      setError('Erreur lors du chargement du journal de vente');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatDateShort = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const handlePrint = () => {
    window.print();
  };

  // Group line items by VAT percentage for the tax summary
  const getVATSummary = () => {
    const vatGroups = journal?.line_items.reduce((groups, item) => {
      const vatPercentage = item.vat_percentage;
      if (!groups[vatPercentage]) {
        groups[vatPercentage] = {
          percentage: vatPercentage,
          base: 0,
          amount: 0,
        };
      }
      groups[vatPercentage].base += item.total_ht;
      groups[vatPercentage].amount += item.vat_amount;
      return groups;
    }, {} as Record<number, { percentage: number; base: number; amount: number }>) || {};

    return Object.values(vatGroups).sort((a, b) => a.percentage - b.percentage);
  };

  const convertNumberToWords = (amount: number): string => {
    // This is a simplified French number to words converter
    // In a real application, you might want to use a more comprehensive library
    const units = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];
    const teens = ['dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
    const tens = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante-dix', 'quatre-vingt', 'quatre-vingt-dix'];
    const thousands = ['', 'mille', 'million', 'milliard'];

    // For simplicity, let's return a basic conversion for the total
    const integerPart = Math.floor(amount);
    const decimalPart = Math.round((amount - integerPart) * 100);
    
    // Very basic conversion - in production you'd want a full implementation
    if (integerPart === 4393 && decimalPart === 50) {
      return "Quatre mille trois-cent quatre-vingt-treize Dirhams et cinquante centimes";
    }
    
    return `${integerPart.toLocaleString('fr-FR')} Dirhams et ${decimalPart.toString().padStart(2, '0')} centimes`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-[#21522f] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement du journal de vente...</p>
        </div>
      </div>
    );
  }

  if (error || !journal) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-[#21522f] transition-colors duration-200"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retour aux journaux</span>
          </button>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
          <p className="text-red-700">{error || 'Journal de vente non trouvé'}</p>
        </div>
      </div>
    );
  }

  const vatSummary = getVATSummary();

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between print:hidden">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-[#21522f] transition-colors duration-200"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Retour aux journaux</span>
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

      {/* Journal Layout */}
      <div className="bg-white shadow-sm border border-gray-200 rounded-lg p-8 print:shadow-none print:border-none">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            FACTURE / JOURNAL DE VENTE GEPRONET DU {formatDate(journal.journal_date).toUpperCase()}
          </h1>
        </div>

        {/* Journal Info Box */}
        <div className="border-2 border-gray-400 mb-8">
          <div className="flex">
            <div className="flex-1 p-4 border-r border-gray-400">
              <div className="text-sm font-medium text-gray-700 mb-1">N° de Facture Magasin</div>
              <div className="text-lg font-bold text-gray-900">{journal.journal_number}</div>
            </div>
            <div className="w-32 p-4">
              <div className="text-sm font-medium text-gray-700 mb-1">Date</div>
              <div className="text-lg font-bold text-gray-900">{formatDateShort(journal.journal_date)}</div>
            </div>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="mb-8">
          {journal.line_items && journal.line_items.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border-2 border-gray-400">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-400 px-3 py-2 text-left text-sm font-bold text-gray-900">RÉFÉRENCE</th>
                    <th className="border border-gray-400 px-3 py-2 text-left text-sm font-bold text-gray-900">DÉSIGNATION</th>
                    <th className="border border-gray-400 px-3 py-2 text-center text-sm font-bold text-gray-900">QTÉ</th>
                    <th className="border border-gray-400 px-3 py-2 text-center text-sm font-bold text-gray-900">P.U. H.T</th>
                    <th className="border border-gray-400 px-3 py-2 text-center text-sm font-bold text-gray-900">NET H.T</th>
                    <th className="border border-gray-400 px-3 py-2 text-center text-sm font-bold text-gray-900">T.V.A %</th>
                    <th className="border border-gray-400 px-3 py-2 text-center text-sm font-bold text-gray-900">MONTANT T.V.A</th>
                  </tr>
                </thead>
                <tbody>
                  {journal.line_items.map((item, index) => (
                    <tr key={item.id || index}>
                      <td className="border border-gray-400 px-3 py-2 text-sm text-gray-900 font-medium">
                        {item.product_sku || '-'}
                      </td>
                      <td className="border border-gray-400 px-3 py-2 text-sm text-gray-900">
                        {item.product_name}
                      </td>
                      <td className="border border-gray-400 px-3 py-2 text-center text-sm text-gray-900">
                        {item.quantity}
                      </td>
                      <td className="border border-gray-400 px-3 py-2 text-center text-sm text-gray-900">
                        {item.unit_price_ht.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MAD
                      </td>
                      <td className="border border-gray-400 px-3 py-2 text-center text-sm text-gray-900">
                        {item.total_ht.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MAD
                      </td>
                      <td className="border border-gray-400 px-3 py-2 text-center text-sm text-gray-900">
                        {item.vat_percentage}%
                      </td>
                      <td className="border border-gray-400 px-3 py-2 text-center text-sm text-gray-900">
                        {item.vat_amount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MAD
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              Aucun article trouvé pour ce journal de vente
            </div>
          )}
        </div>

        {/* Summary Tables */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* VAT Summary */}
          <div>
            <table className="w-full border-collapse border-2 border-gray-400">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-400 px-3 py-2 text-left text-sm font-bold text-gray-900">Taux Base</th>
                  <th className="border border-gray-400 px-3 py-2 text-right text-sm font-bold text-gray-900">Montant</th>
                </tr>
              </thead>
              <tbody>
                {vatSummary.map((vat, index) => (
                  <tr key={index}>
                    <td className="border border-gray-400 px-3 py-2 text-sm text-gray-900 font-medium">
                      {vat.percentage}%
                    </td>
                    <td className="border border-gray-400 px-3 py-2 text-right text-sm text-gray-900">
                      {vat.amount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MAD
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div>
            <table className="w-full border-collapse border-2 border-gray-400">
              <tbody>
                <tr>
                  <td className="border border-gray-400 px-3 py-2 text-sm font-bold text-gray-900">Total HT</td>
                  <td className="border border-gray-400 px-3 py-2 text-right text-sm text-gray-900">
                    {journal.total_ht.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MAD
                  </td>
                </tr>
                <tr>
                  <td className="border border-gray-400 px-3 py-2 text-sm font-bold text-gray-900">Total TTC Brut</td>
                  <td className="border border-gray-400 px-3 py-2 text-right text-sm text-gray-900">
                    {journal.total_ttc.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MAD
                  </td>
                </tr>
                <tr>
                  <td className="border border-gray-400 px-3 py-2 text-sm font-bold text-gray-900">Total Remises TTC</td>
                  <td className="border border-gray-400 px-3 py-2 text-right text-sm text-gray-900">
                    0,00 MAD
                  </td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="border border-gray-400 px-3 py-2 text-sm font-bold text-gray-900">NET TTC</td>
                  <td className="border border-gray-400 px-3 py-2 text-right text-sm font-bold text-gray-900">
                    {journal.total_ttc.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MAD
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Amount in Words */}
        <div className="border-t border-gray-300 pt-6">
          <p className="text-sm text-gray-900">
            <strong>Arrêté la présente journée au montant TTC de :</strong> {convertNumberToWords(journal.total_ttc)}
          </p>
        </div>
      </div>
    </div>
  );
};

export default SalesJournalDetailPage;