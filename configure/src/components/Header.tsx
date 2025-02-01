import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";

interface HeaderProps {
  isOpen: boolean;
  toggleSidebar: () => void;
  isHome: boolean;
}

export function Header({ isOpen, toggleSidebar, isHome }: HeaderProps) {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isTransparent = isHome && isMobile;

  return (
    <header className={`flex justify-between items-center p-6 z-10 ${isTransparent ? 'bg-transparent' : 'bg-white'}`}>
      <div className="flex items-center gap-4">
        {isMobile && (
          <button
            onClick={toggleSidebar}
            className={`inline-flex items-center justify-center p-2 rounded-md ${isHome ? ' text-white hover:text-gray-100' : 'text-sidebar hover:bg-gray-100'} shadow-sm`}
          >
            <Menu size={24} />
          </button>
        )}
      </div>
      <div className={`flex items-center gap-4 ${isHome ? 'hidden' : 'block'}`}>
        <img
          src="https://ui-avatars.com/api/?name=silas-alves"
          alt="User"
          className="inline-block w-10 h-10 rounded-full"
        />
      </div>
    </header>
  );
}