import React from 'react';
import { 
  BarChart3, 
  ShoppingCart, 
  FileText, 
  Package, 
  Truck,
  RotateCcw, 
  Users, 
  Building2, 
  BookOpen, 
  Settings,
  Receipt
} from 'lucide-react';

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeSection, onSectionChange }) => {
  const menuItems = [
    {
      id: 'dashboard',
      label: 'Tableau de bord',
      icon: BarChart3,
    },
    {
      id: 'ventes',
      label: 'Ventes',
      icon: ShoppingCart,
    },
    {
      id: 'devis',
      label: 'Devis',
      icon: FileText,
    },
    {
      id: 'livraison',
      label: 'Bon de livraison',
      icon: Truck,
    },
    {
      id: 'factures',
      label: 'Factures',
      icon: Receipt,
    },
    {
      id: 'retour',
      label: 'Bon de retour',
      icon: RotateCcw,
    },
    {
      id: 'journal',
      label: 'Journal de vente',
      icon: BookOpen,
    },
    {
      id: 'commandes',
      label: 'Bons de commande',
      icon: Package,
    },
    {
      id: 'fournisseurs',
      label: 'Fournisseurs',
      icon: Building2,
    },
    {
      id: 'clients',
      label: 'Clients',
      icon: Users,
    },
    {
      id: 'settings',
      label: 'Paramètres',
      icon: Settings,
    },
  ];

  return (
    <aside className="fixed left-0 top-16 h-full w-64 bg-white border-r border-gray-200 z-30">
      <nav className="p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            
            return (
              <li key={item.id}>
                <button
                  onClick={() => onSectionChange(item.id)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors duration-200 ${
                    isActive
                      ? 'bg-[#21522f] text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;