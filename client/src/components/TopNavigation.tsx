import { Menu } from 'lucide-react';
import { Button } from './ui/button';

interface TopNavigationProps {
  title: string;
  onMenuClick: () => void;
}

export function TopNavigation({ title, onMenuClick }: TopNavigationProps) {
  return (
    <header className="bg-white border-b border-gray-200">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onMenuClick}
            className="lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
        </div>
      </div>
    </header>
  );
}