import React from 'react';
import { Info } from 'lucide-react';

const Dashboard: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Tableau de Bord</h1>
        <p className="text-gray-600">Bienvenue sur Gepronet</p>
      </div>

      {/* Main Content Area */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Activité Récente</h2>
        <div className="py-8 flex flex-col items-center">
          <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mb-3">
            <Info size={24} className="text-blue-500" />
          </div>
          <p className="text-gray-600">Aucune activité récente</p>
          <p className="text-sm text-gray-500 mt-1">Les activités s'afficheront ici</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;