import React from 'react';
import { BarChart3, TrendingUp, Users, Package, Receipt } from 'lucide-react';

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
          value="€42,350"
          icon={<TrendingUp size={24} className="text-[#21522f]" />}
          color="bg-green-50"
        />
        <StatCard
          title="Devis en Cours"
          value="23"
          icon={<BarChart3 size={24} className="text-green-600" />}
          color="bg-green-50"
        />
        <StatCard
          title="Clients Actifs"
          value="186"
          icon={<Users size={24} className="text-purple-600" />}
          color="bg-purple-50"
        />
        <StatCard
          title="Commandes"
          value="47"
          icon={<Package size={24} className="text-orange-600" />}
          color="bg-orange-50"
        />
      </div>

      {/* Main Content Area */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Activité Récente</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <Receipt size={16} className="text-[#21522f]" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Nouvelle facture créée</p>
                <p className="text-sm text-gray-500">Facture #F-2024-001</p>
              </div>
            </div>
            <span className="text-sm text-gray-500">Il y a 2 heures</span>
          </div>
          
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <Package size={16} className="text-green-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Commande expédiée</p>
                <p className="text-sm text-gray-500">Commande #C-2024-045</p>
              </div>
            </div>
            <span className="text-sm text-gray-500">Il y a 4 heures</span>
          </div>
          
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                <Users size={16} className="text-purple-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Nouveau client ajouté</p>
                <p className="text-sm text-gray-500">Client ABC Industries</p>
              </div>
            </div>
            <span className="text-sm text-gray-500">Il y a 6 heures</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;