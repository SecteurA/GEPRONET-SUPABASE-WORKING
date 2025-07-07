import React from 'react';
import { LogOut, Settings } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface HeaderProps {
  onSettingsClick: () => void;
  onLogoClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onSettingsClick, onLogoClick }) => {
  const { signOut, user } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 shadow-sm z-50">
      <div className="flex items-center justify-between h-full px-6">
        <div className="flex items-center cursor-pointer" onClick={onLogoClick}>
          <img 
            src="https://pub-237d2da54b564d23aaa1c3826e1d4e65.r2.dev/gepronet/gepronet.png" 
            alt="Gepronet Logo" 
            className="w-[200px] h-auto"
          />
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <button
              onClick={onSettingsClick}
              className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-[#21522f] transition-colors duration-200"
              title="Paramètres"
            >
              <Settings size={18} />
            </button>
            <div className="w-8 h-8 bg-[#21522f] rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-medium">
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
            <span className="text-gray-700 font-medium">
              {user?.email || 'Utilisateur'}
            </span>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-[#21522f] transition-colors duration-200"
            title="Se déconnecter"
          >
            <LogOut size={18} />
            <span className="text-sm">Déconnexion</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;