'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useToast } from '@/components/ui/ToastProvider';

// Navigation menu items configuration
const menuItems = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/admin',
    icon: '/svg/dashboard.svg',
  },
  {
    id: 'categories',
    label: 'Categories',
    path: '/admin/categories',
    icon: '/svg/file.svg',
  },
  {
    id: 'suppliers',
    label: 'Suppliers',
    path: '/admin/suppliers',
    icon: '/svg/support.svg',
  },
  {
    id: 'devices',
    label: 'Devices',
    path: '/admin/devices',
    icon: '/svg/hardware.svg',
  },
  {
    id: 'products',
    label: 'Products',
    path: '/admin/products',
    icon: '/svg/product.svg',
  },
  {
    id: 'requests',
    label: 'Requests',
    path: '/admin/requests',
    icon: '/svg/notification.svg',
  },
  {
    id: 'orders',
    label: 'Orders',
    path: '/admin/orders',
    icon: '/svg/inventory.svg',
  },
  
  {
    id: 'apikey',
    label: 'API Key',
    path: '/admin/apikey',
    icon: '/svg/key.svg',
  },

  {
    id: 'users',
    label: 'Users',
    path: '/admin/users',
    icon: '/svg/users.svg',
  },
 
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { showToast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false); // Start collapsed
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    // Check screen size and set initial sidebar state
    const handleResize = () => {
      if (window.innerWidth >= 768) { // md breakpoint
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };
    
    // Set initial state
    handleResize();
    
    // Add resize listener
    window.addEventListener('resize', handleResize);
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    // Verify authentication and role
    const token = localStorage.getItem('token');
    const userRole = localStorage.getItem('userRole');
    const userData = localStorage.getItem('user');

    if (!token || userRole !== 'admin') {
      router.push('/?error=unauthorized');
      return;
    }

    if (userData) {
      setUser(JSON.parse(userData));
    }
    setLoading(false);
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('userRole');
    document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    document.cookie = 'userRole=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    showToast('info', 'Logged Out', 'You have been successfully logged out.');
    setTimeout(() => {
      router.push('/');
    }, 500);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <img 
            src="/svg/6-dots-spinner.svg" 
            alt="Loading..." 
            className="w-16 h-16 mx-auto"
          />
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-gray-50 overflow-hidden">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Left Sidebar */}
      <aside className={`
        bg-white shadow-lg transition-all duration-300 flex-shrink-0 overflow-hidden
        md:relative inset-y-0 left-0 z-50
        ${sidebarOpen ? 'w-64 fixed' : 'w-16 relative'}
      `}>
        <div className="h-full overflow-y-auto">
          {/* Logo Section */}
          <div className="border-b border-gray-200 h-18 flex items-center justify-center">
            <img
              src={sidebarOpen ? "/kanban-logo.svg" : "/kanban-square.svg"}
              alt="Kanban Logo"
              className="w-auto transition-all duration-300 h-16"
            />
          </div>

          {/* Navigation Menu */}
          <nav className={`${sidebarOpen ? 'p-4' : 'p-2'}`}>
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => router.push(item.path)}
              className={`w-full flex items-center mb-2 rounded-full transition-colors ${
                sidebarOpen ? 'px-4 py-1.5 justify-start' : 'px-2 py-3 justify-center'
              } ${
                pathname === item.path
                  ? 'bg-gray-100 text-gray-900 border border-gray-400'
                  : 'text-gray-600 border border-transparent hover:bg-gray-50 hover:border hover:border-gray-200'
              }`}
              title={!sidebarOpen ? item.label : ''}
            >
              <img 
                src={item.icon} 
                alt={item.label}
                className={`flex-shrink-0 transition-all duration-300 ${
                  sidebarOpen ? 'w-5 h-5 mr-3' : 'w-5 h-5'
                }`}
              />
              {sidebarOpen && <span className="text-md">{item.label}</span>}
            </button>
          ))}
          </nav>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 h-18 flex-shrink-0">
          <div className="h-full px-6 flex justify-between items-center">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="Toggle Sidebar"
              >
                <svg 
                  className="w-6 h-6 text-gray-700" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M4 6h16M4 12h16M4 18h16" 
                  />
                </svg>
              </button>
            </div>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="w-9 h-9 rounded-fullflex items-center justify-center">
                    <img 
                        src='/svg/user-default.svg'
                        alt='user-icon'
                        className="w-9 h-9 opacity-70"
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-800">Admin</span>
                  <svg className={`w-4 h-4 text-gray-600 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {dropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-20">
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          handleLogout();
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                      >
                        <img 
                            src='/svg/logout.svg'
                            alt='user-icon'
                            className="w-6 h-6 mr-3 opacity-60"
                        />
                        <span>Logout</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Main Content - Children will be rendered here */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
