import React from 'react';
import { 
  ShoppingCart, 
  FileText, 
  Receipt, 
  BookOpen, 
  Truck, 
  RotateCcw, 
  ClipboardList, 
  Users,
  UserCheck
} from 'lucide-react';

interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  isActive?: boolean;
  onClick?: () => void;
}

const MenuItem: React.FC<MenuItemProps> = ({ icon, label, isActive = false, onClick }) => {
  return (
    <div className={`flex items-center space-x-3 px-4 py-3 rounded-lg cursor-pointer transition-all duration-200 ${
      isActive 
        ? 'bg-[#21522f] text-white shadow-md' 
        : 'text-gray-700 hover:bg-gray-100 hover:text-[#21522f]'
    }`} onClick={onClick}>
      <div className="w-5 h-5 flex-shrink-0">
        {icon}
      </div>
      <span className="font-medium">{label}</span>
    </div>
  );
};

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeSection, onSectionChange }) => {
  const menuItems = [
    { id: 'ventes', icon: <ShoppingCart size={20} />, label: 'Ventes' },
    { id: 'devis', icon: <FileText size={20} />, label: 'Devis' },
    { id: 'factures', icon: <Receipt size={20} />, label: 'Factures' },
    { id: 'journal', icon: <BookOpen size={20} />, label: 'Journal de vente' },
    { id: 'livraison', icon: <Truck size={20} />, label: 'Bon de Livraison' },
    { id: 'retour', icon: <RotateCcw size={20} />, label: 'Bon de retour' },
    { id: 'commandes', icon: <ClipboardList size={20} />, label: 'Bon de commande' },
    { id: 'fournisseurs', icon: <Users size={20} />, label: 'Fournisseurs' },
    { id: 'clients', icon: <UserCheck size={20} />, label: 'Clients' },
  ];

  return (
    <aside className="fixed left-0 top-16 bottom-0 w-64 bg-white border-r border-gray-200 shadow-sm overflow-y-auto">
      <div className="p-4">
        <nav className="space-y-2">
          {menuItems.map((item, index) => (
            <MenuItem
              key={index}
              icon={item.icon}
              label={item.label}
              isActive={activeSection === item.id}
              onClick={() => onSectionChange(item.id)}
            />
          ))}
        </nav>
      </div>
    </aside>
  );
};

export default Sidebar;