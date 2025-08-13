import { X } from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  return (
    <div className={`fixed inset-0 z-40 lg:relative lg:z-0 lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-200 ease-in-out lg:transition-none`}>
      <div className="relative flex w-64 flex-col bg-white shadow-lg">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">메뉴</h2>
          <button
            onClick={onClose}
            className="lg:hidden text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <a href="/admin" className="block px-3 py-2 text-sm font-medium text-gray-900 bg-gray-100 rounded-md">
            관리자 패널
          </a>
        </nav>
      </div>
    </div>
  );
}