import React from 'react';
import { BarChart3, TrendingUp, Users, Package, Info } from 'lucide-react';

const StatCard: React.FC<{ title: string; value: string; icon: React.ReactNode; color: string }> = ({ 
  title, 
  value, 
  icon, 
  color 
}) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${color}`}>
          {icon}
        </div>
      </div>
    </div>
  );
};

const Dashboard: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Tableau de Bord</h1>
        <p className="text-gray-600">Bienvenue sur Gepronet</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-6">
        <StatCard
          title="Ventes du Mois" 
          value="0 DH"
          icon={<TrendingUp size={24} className="text-[#21522f]" />}
          color="bg-green-50"
        />
        <StatCard
          title="Devis en Cours"
          value="0"
          icon={<BarChart3 size={24} className="text-green-600" />}
          color="bg-green-50"
        />
        <StatCard
          title="Clients Actifs"
          value="0"
          icon={<Users size={24} className="text-purple-600" />}
          color="bg-purple-50"
        />
        <StatCard
          title="Commandes"
          value="0"
          icon={<Package size={24} className="text-orange-600" />}
          color="bg-orange-50"
        />
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