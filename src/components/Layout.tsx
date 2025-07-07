import React from 'react';
import Header from './Header';
import Sidebar from './Sidebar';

interface LayoutProps {
  children: React.ReactNode;
  onSettingsClick: () => void;
  activeSection: string;
  onSectionChange: (section: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, onSettingsClick, activeSection, onSectionChange }) => {
  const handleLogoClick = () => {
    onSectionChange('dashboard');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header onSettingsClick={onSettingsClick} onLogoClick={handleLogoClick} />
      <Sidebar activeSection={activeSection} onSectionChange={onSectionChange} />
      <main className="ml-64 pt-16 p-6">
        {children}
      </main>
    </div>
  );
};

export default Layout;