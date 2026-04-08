import React, { useState, createContext, useContext, useEffect, useRef, useMemo } from 'react';
import { ShoppingCart, Plus, Minus, Trash2, ChevronRight, Check, Shield, Box, X, Search, User, UtensilsCrossed, ShoppingBag, Truck, LayoutGrid, ArrowLeft, Receipt, Edit3, TrendingUp, ClipboardList, Package, BarChart2, Settings, AlertTriangle, Clock, Activity, Layout, Zap, FileText, PieChart, Upload, Printer, Mail } from 'lucide-react';
// Fallback alias to avoid missing icon errors in dynamic builds
const Settings2 = Settings;
const LayoutIcon = Layout;
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

const currencySymbols = {
  PHP: '₱',
  USD: '$',
  EUR: '€',
  GBP: '£',
  SGD: 'S$',
  AUD: 'A$',
  CAD: 'C$',
  JPY: '¥'
};

const getCurrencySymbol = (code = 'PHP') => currencySymbols[code] || `${code} `;
const formatCurrency = (amount, code = 'PHP') => {
  const value = Number(amount) || 0;
  return `${getCurrencySymbol(code)}${value.toFixed(2)}`;
};
const toLocalDateInputValue = (dateLike = new Date()) => {
  const d = new Date(dateLike);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
const getClientTimezone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Manila';
  } catch {
    return 'Asia/Manila';
  }
};

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);


// Cart Context
const CartContext = createContext();

const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within CartProvider');
  return context;
};

// API URL - Backend server (proxied via Vite locally, absolute for production)
const API_URL = '/api'; 

// Helper for authenticated API calls
const fetchWithAuth = async (url, options = {}) => {
  const token = localStorage.getItem('auth_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };
  const response = await fetch(url, { cache: 'no-store', ...options, headers });
  if (response.status === 401) {
    localStorage.removeItem('auth_token');
    // Optionally, redirect to login page or show a message
    // window.location.href = '/login';
  }
  return response;
};

// Google Apps Script URL - For saving orders to Google Sheets
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwz43QR4dCr28gtsYnHK1p1D7vcrKtKRCnwnkiWnACwv9PHxp0fwCIKbtOEcdbwlWwO/exec';

// Fallback Menu Data (used if Google Sheets fetch fails)
const fallbackMenuData = [
  { id: 1, name: 'Margherita Pizza', category: 'Pizza', sizes: [{ name: 'Small', price: 10.99 }, { name: 'Medium', price: 12.99 }, { name: 'Large', price: 15.99 }], image: 'assets/images/food/pepperoni.png', description: 'Classic tomato sauce, mozzarella, fresh basil', popular: true },
  { id: 2, name: 'Pepperoni Pizza', category: 'Pizza', sizes: [{ name: 'Small', price: 12.99 }, { name: 'Medium', price: 14.99 }, { name: 'Large', price: 17.99 }], image: 'assets/images/food/burgerpizza.png', description: 'Loaded with pepperoni and mozzarella', popular: true },
  { id: 3, name: 'BBQ Chicken Pizza', category: 'Pizza', sizes: [{ name: 'Small', price: 13.99 }, { name: 'Medium', price: 15.99 }, { name: 'Large', price: 18.99 }], image: 'assets/images/food/pepperoni.png', description: 'BBQ sauce, grilled chicken, red onions', popular: false },
  { id: 4, name: 'Veggie Supreme', category: 'Pizza', sizes: [{ name: 'Small', price: 11.99 }, { name: 'Medium', price: 13.99 }, { name: 'Large', price: 16.99 }], image: 'assets/images/food/pepperoni.png', description: 'Mushrooms, peppers, olives, onions', popular: false },

  { id: 5, name: 'Classic Burger', category: 'Burgers', price: 9.99, image: 'assets/images/food/pepperoni.png', description: 'Beef patty, lettuce, tomato, cheese', popular: true },
  { id: 6, name: 'Bacon Cheeseburger', category: 'Burgers', price: 11.99, image: 'assets/images/food/pepperoni.png', description: 'Double beef, bacon, cheddar cheese', popular: true },
  { id: 7, name: 'Veggie Burger', category: 'Burgers', price: 10.99, image: 'assets/images/food/pepperoni.png', description: 'Plant-based patty, avocado, sprouts', popular: false },
  { id: 8, name: 'Chicken Burger', category: 'Burgers', price: 10.49, image: 'assets/images/food/pepperoni.png', description: 'Grilled chicken breast, mayo, lettuce', popular: false },

  { id: 9, name: 'Spaghetti Carbonara', category: 'Pasta', price: 13.99, image: 'assets/images/food/pepperoni.png', description: 'Creamy sauce, bacon, parmesan', popular: true },
  { id: 10, name: 'Penne Arrabiata', category: 'Pasta', price: 12.49, image: 'assets/images/food/pepperoni.png', description: 'Spicy tomato sauce, garlic, herbs', popular: false },
  { id: 11, name: 'Fettuccine Alfredo', category: 'Pasta', price: 13.49, image: 'assets/images/food/pepperoni.png', description: 'Rich cream sauce, parmesan cheese', popular: true },
  { id: 12, name: 'Lasagna', category: 'Pasta', price: 14.99, image: 'assets/images/food/pepperoni.png', description: 'Layered pasta, beef, ricotta, mozzarella', popular: false },

  { id: 13, name: 'Caesar Salad', category: 'Salads', price: 8.99, image: 'assets/images/food/pepperoni.png', description: 'Romaine, croutons, parmesan, caesar dressing', popular: true },
  { id: 14, name: 'Greek Salad', category: 'Salads', price: 9.49, image: 'assets/images/food/pepperoni.png', description: 'Feta, olives, cucumber, tomatoes', popular: false },
  { id: 15, name: 'Caprese Salad', category: 'Salads', price: 10.99, image: 'assets/images/food/pepperoni.png', description: 'Fresh mozzarella, tomatoes, basil', popular: false },

  { id: 16, name: 'Coca Cola', category: 'Drinks', price: 2.99, image: 'assets/images/food/pepperoni.png', description: 'Classic cola, 500ml', popular: true },
  { id: 17, name: 'Fresh Lemonade', category: 'Drinks', price: 3.49, image: 'assets/images/food/pepperoni.png', description: 'Freshly squeezed lemon juice', popular: true },
  { id: 18, name: 'Iced Tea', category: 'Drinks', price: 2.99, image: 'assets/images/food/pepperoni.png', description: 'Peach iced tea', popular: false },

  { id: 19, name: 'Chocolate Cake', category: 'Desserts', price: 6.99, image: 'assets/images/food/pepperoni.png', description: 'Rich chocolate layer cake', popular: true },
  { id: 20, name: 'Tiramisu', category: 'Desserts', price: 7.49, image: 'assets/images/food/pepperoni.png', description: 'Italian coffee-flavored dessert', popular: true },
];



// Main App Component
export default function App() {
  const [cartItems, setCartItems] = useState([]);
  const [currentPage, setCurrentPage] = useState('home');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCart, setShowCart] = useState(false);
  const [showSizeModal, setShowSizeModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [pendingOrderNumber, setPendingOrderNumber] = useState(null);
  const [isNavDrawerOpen, setIsNavDrawerOpen] = useState(false);

  // Products state
  const [menuData, setMenuData] = useState([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [productsError, setProductsError] = useState(null);

  // Customer state
  const [customer, setCustomer] = useState(() => {
    const saved = localStorage.getItem('customer');
    return saved ? JSON.parse(saved) : null;
  });

  // Employee state (for POS/Management access)
  const [employee, setEmployee] = useState(() => {
    const saved = sessionStorage.getItem('employee');
    return saved ? JSON.parse(saved) : null;
  });

  // Shift state (for POS shift tracking)
  const [currentShift, setCurrentShift] = useState(() => {
    const saved = sessionStorage.getItem('currentShift');
    return saved ? JSON.parse(saved) : null;
  });
  const [showShiftStartModal, setShowShiftStartModal] = useState(false);
  const [showShiftEndModal, setShowShiftEndModal] = useState(false);
  const [shiftReport, setShiftReport] = useState(null);

  // System settings state
  const [sysConfig, setSysConfig] = useState({
    business_name: '', owner_name: '', owner_email: '', business_address: '',
    currency: 'PHP', tax_rate: '12', timezone: 'Asia/Manila',
    report_daily: 'false', report_weekly: 'false', report_monthly: 'false', report_kitchen: 'false',
    smtp_host: 'smtp.gmail.com', smtp_port: '587', smtp_user: '', smtp_pass: '', smtp_from: '',
    printer_auto_receipt: 'true', printer_auto_kitchen: 'true', printer_width: '58mm',
    printer_header: '', printer_footer: '', printer_manual_tear: 'true',
    kiosk_url: 'http://localhost:5173',
    // Loyalty Settings
    loyalty_points_per_php: '0.02', // 1 point per 50 Php
    loyalty_silver_threshold: '100', loyalty_silver_discount: '5',
    loyalty_gold_threshold: '500', loyalty_gold_discount: '10',
    loyalty_diamond_threshold: '1000', loyalty_diamond_discount: '15'
  });

  const currencySymbol = getCurrencySymbol(sysConfig.currency || 'PHP');
  const formatMoney = React.useCallback((value) => formatCurrency(value, sysConfig.currency || 'PHP'), [sysConfig.currency]);

  // Unified permission checker
  const hasPermission = React.useCallback((id) => {
    if (!employee) return false;
    // 1. Check for specific permissions (overrides roles)
    if (employee.permissions && Array.isArray(employee.permissions) && employee.permissions.length > 0) {
      return employee.permissions.includes(id);
    }
    // 2. Fallback to role-based access from navItems definition
    const item = navItems.find(i => i.id === id);
    if (!item) return true; // If not in navItems, assume accessible or handled elsewhere
    if (!item.roles) return true; // Everyone can access if no roles specified
    return item.roles.includes(employee.role);
  }, [employee]);

  // Track the last order for receipt printing
  const [lastOrderData, setLastOrderData] = useState(null);
  const [printMode, setPrintMode] = useState('receipt'); // 'receipt' or 'kitchen'

  // Save customer to localStorage when it changes
  useEffect(() => {
    if (customer) {
      localStorage.setItem('customer', JSON.stringify(customer));
    } else {
      localStorage.removeItem('customer');
    }
  }, [customer]);

  // Derived categories from menuData
  const categories = React.useMemo(() => {
    const cats = ['All', 'Combos'];
    if (menuData && Array.isArray(menuData)) {
      const existing = menuData
        .filter(p => !p.isCombo)
        .map(p => p.category)
        .filter(Boolean);
      return [...cats, ...Array.from(new Set(existing))];
    }
    return cats;
  }, [menuData]);

  // Save employee to sessionStorage when it changes
  useEffect(() => {
    if (employee) {
      sessionStorage.setItem('employee', JSON.stringify(employee));
    } else {
      sessionStorage.removeItem('employee');
    }
  }, [employee]);

  // Save shift to sessionStorage when it changes
  useEffect(() => {
    if (currentShift) {
      sessionStorage.setItem('currentShift', JSON.stringify(currentShift));
    } else {
      sessionStorage.removeItem('currentShift');
    }
  }, [currentShift]);

  const [publicCompanyId, setPublicCompanyId] = useState('00000000-0000-0000-0000-000000000000');

  // Check for active shift and system settings
  useEffect(() => {
    const initializeAppData = async () => {
      try {
        // Fetch system settings globally (publicly if needed)
        const settingsRes = await fetchWithAuth(`${API_URL}/settings/public`);
        const settingsData = await settingsRes.json();
        if (settingsData.success) {
          setSysConfig(prev => ({ ...prev, ...settingsData.settings }));
          if (settingsData.company_id) {
            setPublicCompanyId(settingsData.company_id);
          }
        }

        if (employee) {
          // Give a small delay to ensure localStorage is updated
          await new Promise(r => setTimeout(r, 100));

          // Fetch current shift
          const shiftRes = await fetchWithAuth(`${API_URL}/shifts/current`);
          const shiftData = await shiftRes.json();
          if (shiftData.success && shiftData.data?.shift) {
            setCurrentShift(shiftData.data.shift);
          } else {
            setCurrentShift(null);
          }
        } else {
          setCurrentShift(null);
        }
      } catch (error) {
        console.error('Error initializing app data:', error);
      }
    };
    initializeAppData();
  }, [employee]);

  const handleLogout = () => {
    setCustomer(null);
    setCurrentPage('home');
  };

  const handleEmployeeLogout = async () => {
    try {
      await fetchWithAuth(`${API_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
    setEmployee(null);
    setCurrentShift(null);
    setCurrentPage('dashboard');
    // Clear company context to ensure fresh login starts with 6-digit PIN
    localStorage.removeItem('active_company_id');
    localStorage.removeItem('active_company_name');
  };

  // Start a new shift
  const handleStartShift = async (openingCash, notes) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetchWithAuth(`${API_URL}/shifts/start`, {
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify({ opening_cash: openingCash, notes })
      });
      const result = await response.json();
      if (result.success) {
        setCurrentShift(result.shift);
        setShowShiftStartModal(false);
        return true;
      } else {
        alert(result.error || 'Failed to start shift');
        return false;
      }
    } catch (error) {
      console.error('Error starting shift:', error);
      alert('Failed to start shift. Please try again.');
      return false;
    }
  };

  // End current shift
  const handleEndShift = async (closingCash, notes) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetchWithAuth(`${API_URL}/shifts/end`, {
        method: 'POST',
        body: JSON.stringify({
          closing_cash: closingCash,
          notes,
          shift_id: currentShift?.id
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      const result = await response.json();
      if (result.success) {
        setShiftReport(result.data.report);
        setCurrentShift(null);
        setShowShiftEndModal(false);
        return true;
      } else {
        alert(result.error || 'Failed to end shift');
        return false;
      }
    } catch (error) {
      console.error('Error ending shift:', error);
      if (error.name === 'AbortError') {
        alert('Request timed out. Please check your connection and try again.');
      } else {
        alert('Failed to end shift. Please try again.');
      }
      return false;
    }
  };

  // Fetch products function (extracted so it can be called from child components)
  const fetchProducts = async () => {
    try {
      setIsLoadingProducts(true);
      setProductsError(null);

      // Fetch both products and combos (with ?all=true to include inactive for management)
      const [productsResponse, combosResponse] = await Promise.all([
        fetchWithAuth(`${API_URL}/products?all=true`),
        fetchWithAuth(`${API_URL}/combos`)
      ]);

      const productsData = await productsResponse.json();
      const combosData = await combosResponse.json();

      let allItems = [];

      if (productsData.success && productsData.products) {
        allItems = [...productsData.products];
      } else {
        allItems = [];
        setProductsError('No products found or failed to load');
      }

      // Add combos to menu data with 'Combos' category
      if (combosData.success && combosData.combos && combosData.combos.length > 0) {
        const comboItems = combosData.combos.map(combo => ({
          id: `combo-${combo.id}`,
          comboId: combo.id,
          name: combo.name,
          category: 'Combos',
          price: combo.price,
          description: combo.description || combo.items.map(i => `${i.quantity}x ${i.product_name}`).join(', '),
          image: combo.image,
          isCombo: true,
          comboItems: combo.items
        }));
        allItems = [...comboItems, ...allItems];
      }

      setMenuData(allItems);
    } catch (error) {
      console.error('Error fetching products:', error);
      setMenuData([]);
      setProductsError('Connection error: Failed to fetch online data');
    } finally {
      setIsLoadingProducts(false);
    }
  };

  // Check URL parameters for payment status (after GCash redirect)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const payment = urlParams.get('payment');
    const orderNumber = urlParams.get('order');

    if (payment && orderNumber) {
      setPaymentStatus(payment);
      setPendingOrderNumber(orderNumber);
      setCurrentPage(payment === 'success' ? 'confirmation' : 'payment-failed');
      // Clear cart if payment successful
      if (payment === 'success') {
        setCartItems([]);
        localStorage.removeItem('pendingOrder');
      }
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Fetch products from PostgreSQL API whenever employee changes (login/logout)
  useEffect(() => {
    if (employee) {
      fetchProducts();
    } else {
      setMenuData([]); // Clear menu data when logged out
    }
  }, [employee]);

  // Initialize OneSignal Push Notifications
  useEffect(() => {
    if (typeof window !== 'undefined' && window.OneSignalDeferred) {
      window.OneSignalDeferred = window.OneSignalDeferred || [];
      window.OneSignalDeferred.push(async function (OneSignal) {
        await OneSignal.init({
          appId: "22fa0af9-4790-4b61-9f6d-573237f0585d", // Replace with your OneSignal App ID
          notifyButton: {
            enable: true,
            size: 'small',
            position: 'bottom-right',
            prenotify: true,
            showCredit: false,
            text: {
              'tip.state.unsubscribed': 'Get order updates',
              'tip.state.subscribed': 'You\'re subscribed!',
              'tip.state.blocked': 'Notifications blocked',
              'message.prenotify': 'Click to receive order updates',
              'message.action.subscribed': 'Thanks for subscribing!',
              'dialog.main.title': 'Manage Notifications',
              'dialog.main.button.subscribe': 'SUBSCRIBE',
              'dialog.main.button.unsubscribe': 'UNSUBSCRIBE',
            }
          },
          welcomeNotification: {
            title: "Welcome to Kuchefnero!",
            message: "You'll receive order updates here."
          }
        });
      });
    }
  }, []);

  // Clear cart function
  const clearCart = () => {
    setCartItems([]);
  };

  const addToCart = (item, selectedSize = null) => {
    console.log('addToCart called:', { item, selectedSize, hasSizes: !!item.sizes });

    // For items with sizes, we need size info
    if (item.sizes && !selectedSize) {
      console.log('Opening size modal for:', item.name);
      setSelectedProduct(item);
      setShowSizeModal(true);
      return;
    }

    // Create cart item with size info if applicable
    const cartItem = selectedSize
      ? {
        ...item,
        selectedSize: selectedSize.name,
        size_id: selectedSize.id, // STORE THE SIZE ID
        price: selectedSize.price,
        displayName: `${item.name} (${selectedSize.name})`
      }
      : item;

    // Find existing item by id AND size (if applicable)
    const existingItem = cartItems.find(i =>
      i.id === item.id && (!selectedSize || i.selectedSize === selectedSize.name)
    );

    if (existingItem) {
      setCartItems(cartItems.map(i =>
        (i.id === item.id && (!selectedSize || i.selectedSize === selectedSize.name))
          ? { ...i, quantity: i.quantity + 1 }
          : i
      ));
    } else {
      setCartItems([...cartItems, { ...cartItem, quantity: 1 }]);
    }

    // Close modal if it was open
    setShowSizeModal(false);
    setSelectedProduct(null);
  };

  const removeFromCart = (id, selectedSize = null) => {
    setCartItems(cartItems.filter(item =>
      !(item.id === id && (!selectedSize || item.selectedSize === selectedSize))
    ));
  };

  const updateQuantity = (id, newQuantity, selectedSize = null) => {
    if (newQuantity === 0) {
      removeFromCart(id, selectedSize);
    } else {
      setCartItems(cartItems.map(item =>
        (item.id === id && (!selectedSize || item.selectedSize === selectedSize))
          ? { ...item, quantity: newQuantity }
          : item
      ));
    }
  };

  const setItemNotes = (id, notes, selectedSize = null) => {
    setCartItems(cartItems.map(item =>
      (item.id === id && (!selectedSize || item.selectedSize === selectedSize))
        ? { ...item, notes }
        : item
    ));
  };

  const getTotalItems = () => {
    return cartItems.reduce((sum, item) => sum + item.quantity, 0);
  };

  const getTotalPrice = () => {
    return cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const contextValue = {
    cartItems,
    addToCart,
    removeFromCart,
    updateQuantity,
    setItemNotes,
    getTotalItems,
    getTotalPrice,
    clearCart
  };

  return (
    <CartContext.Provider value={contextValue}>
      <style>{`
        @keyframes fadeIn {

          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.8s ease-out forwards;
        }
        /* Hide scrollbar for category filter */
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        @keyframes reconFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
        @keyframes reconTilt {
          0%, 100% { transform: rotateY(-8deg) rotateX(4deg); }
          50% { transform: rotateY(8deg) rotateX(-3deg); }
        }
        @keyframes reconBlink {
          0%, 45%, 100% { transform: scaleY(1); }
          50% { transform: scaleY(0.2); }
        }
        .recon-robot-wrap {
          perspective: 700px;
        }
        .recon-robot {
          animation: reconFloat 2.6s ease-in-out infinite;
          transform-style: preserve-3d;
        }
        .recon-robot-body {
          animation: reconTilt 3.1s ease-in-out infinite;
          transform-style: preserve-3d;
          box-shadow:
            0 12px 24px rgba(71, 85, 105, 0.35),
            inset -8px -10px 16px rgba(71, 85, 105, 0.45),
            inset 8px 10px 16px rgba(255, 255, 255, 0.35);
        }
        .recon-eye {
          animation: reconBlink 3.2s ease-in-out infinite;
          transform-origin: center;
        }
        .recon-floor-shadow {
          filter: blur(2px);
          opacity: 0.35;
        }
      `}</style>
      <Header
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        setShowCart={setShowCart}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        customer={customer}
        onLogout={handleLogout}
        employee={employee}
        onEmployeeLogout={handleEmployeeLogout}
      />

      {currentPage !== 'home' && (
        <Sidebar
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          employee={employee}
        />
      )}
      <div className={`${currentPage === 'pos' ? 'bg-gray-200 h-screen overflow-hidden pt-14 md:pt-16 pb-16 md:pb-0 md:pl-[50px]' : currentPage === 'home' ? 'bg-gray-100 min-h-screen pt-14 md:pt-16' : 'bg-gray-100 min-h-screen pb-16 md:pb-0 pt-14 md:pt-16 md:pl-[50px]'}`}>
        {currentPage === 'home' && (
          <HomePage
            setCurrentPage={setCurrentPage}
            menuData={menuData}
            isLoading={isLoadingProducts}
          />
        )}
        {currentPage === 'menu' && (
          <MenuPage
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            searchQuery={searchQuery}
            menuData={menuData}
            isLoading={isLoadingProducts}
            categories={categories}
          />
        )}
        {(currentPage.startsWith('menu-') || currentPage === 'products') && (
          employee ? (
            hasPermission('products') ? (
              <ProductManagementPage
                menuData={menuData}
                refreshProducts={fetchProducts}
                currentView={currentPage}
                categories={categories}
              />
            ) : (
              <AccessDeniedPage message="Access Denied. You do not have permission to access Menu setup." onBack={() => setCurrentPage('dashboard')} />
            )
          ) : (
            <EmployeeLoginPage onLogin={(emp) => { setEmployee(emp); setCurrentPage('dashboard'); }} onAction={(page) => setCurrentPage(page)} onBack={() => setCurrentPage('home')} />
          )
        )}
        {currentPage === 'cart' && <CartPage setCurrentPage={setCurrentPage} taxRate={sysConfig.tax_rate} />}
        {currentPage === 'checkout' && <CheckoutPage setCurrentPage={setCurrentPage} clearCart={clearCart} setPendingOrderNumber={setPendingOrderNumber} taxRate={sysConfig.tax_rate} />}
        {currentPage === 'confirmation' && <ConfirmationPage setCurrentPage={setCurrentPage} orderNumber={pendingOrderNumber} paymentStatus={paymentStatus} />}
        {currentPage === 'payment-failed' && <PaymentFailedPage setCurrentPage={setCurrentPage} orderNumber={pendingOrderNumber} />}
        {currentPage === 'pos' && (
          employee ? (
            hasPermission('pos') ? (
              <>
                <POSPage
                  menuData={menuData}
                  categories={categories}
                  isLoading={isLoadingProducts}
                  currentShift={currentShift}
                  employee={employee}
                  sysConfig={sysConfig}
                  setPrintMode={setPrintMode}
                  taxRate={sysConfig.tax_rate}
                  currencySymbol={currencySymbol}
                  formatMoney={formatMoney}
                  lastOrderData={lastOrderData}
                  setLastOrderData={setLastOrderData}
                  onEndShift={() => setShowShiftEndModal(true)}
                  onStartShift={() => setShowShiftStartModal(true)}
                  onRefreshShift={async () => {
                    try {
                      const token = localStorage.getItem('auth_token');
                      if (!token) {
                        console.warn('No auth token, cannot refresh shift');
                        return;
                      }
                      const res = await fetchWithAuth(`${API_URL}/shifts/current`);
                      const data = await res.json();
                      if (data.success && data.data?.shift) {
                        setCurrentShift(data.data.shift);
                      } else {
                        setCurrentShift(null);
                      }
                    } catch (e) {
                      console.error('Error refreshing shift:', e);
                      setCurrentShift(null);
                    }
                  }}
                  onRefreshProducts={fetchProducts}
                />
                {showShiftStartModal && (
                  <ShiftStartModal
                    onShiftStarted={(shift) => setCurrentShift(shift)}
                    onClose={() => setShowShiftStartModal(false)}
                  />
                )}
                {showShiftEndModal && (
                  <ShiftEndModal
                    shift={currentShift}
                    onEnd={handleEndShift}
                    onCancel={() => setShowShiftEndModal(false)}
                  />
                )}
                {shiftReport && (
                  <ShiftReportModal
                    report={shiftReport}
                    onClose={() => setShiftReport(null)}
                  />
                )}
              </>
            ) : (
              <AccessDeniedPage message="Access Denied. You do not have permission to access the Terminal." onBack={() => setCurrentPage('dashboard')} />
            )
          ) : (
            <EmployeeLoginPage onLogin={(emp) => { setEmployee(emp); setCurrentPage('dashboard'); }} onAction={(page) => setCurrentPage(page)} onBack={() => setCurrentPage('home')} />
          )
        )}

        {currentPage.startsWith('reports') && (
          employee ? (
            hasPermission('reports') ? (
              <ReportsPage
                currentReport={currentPage}
                setCurrentPage={setCurrentPage}
                formatMoney={formatMoney}
                currencySymbol={currencySymbol}
              />
            ) : (
              <AccessDeniedPage message="Access Denied. You do not have permission to access Reports." onBack={() => setCurrentPage('dashboard')} />
            )
          ) : (
            <EmployeeLoginPage onLogin={(emp) => { setEmployee(emp); setCurrentPage('dashboard'); }} onAction={(page) => setCurrentPage(page)} onBack={() => setCurrentPage('home')} />
          )
        )}
        {currentPage === 'customers' && (
          employee ? (
            hasPermission('customers') ? (
              <CustomersPage setCurrentPage={setCurrentPage} />
            ) : (
              <AccessDeniedPage message="Access Denied. You do not have permission to access Customers." onBack={() => setCurrentPage('dashboard')} />
            )
          ) : (
            <EmployeeLoginPage onLogin={(emp) => { setEmployee(emp); setCurrentPage('dashboard'); }} onAction={(page) => setCurrentPage(page)} onBack={() => setCurrentPage('home')} />
          )
        )}
        {/* Dashboard - Redirect to POS or Login */}
        {currentPage === 'dashboard' && (
          employee ? (
            hasPermission('dashboard') ? (
              <DashboardPage setCurrentPage={setCurrentPage} employee={employee} />
            ) : (
              <AccessDeniedPage message="Access Denied. You do not have permission to access Analytics Dashboard." onBack={() => setCurrentPage('pos')} />
            )
          ) : (
            <EmployeeLoginPage onLogin={(emp) => { setEmployee(emp); setCurrentPage('dashboard'); }} onAction={(page) => setCurrentPage(page)} onBack={() => setCurrentPage('home')} />
          )
        )}
        {/* Orders Pages */}
        {currentPage.startsWith('orders') && (
          employee ? (
            hasPermission('orders') ? (
              <OrdersPage currentView={currentPage} setCurrentPage={setCurrentPage} />
            ) : (
              <AccessDeniedPage message="Access Denied. You do not have permission to access Orders." onBack={() => setCurrentPage('dashboard')} />
            )
          ) : (
            <EmployeeLoginPage onLogin={(emp) => { setEmployee(emp); setCurrentPage('dashboard'); }} onAction={(page) => setCurrentPage(page)} onBack={() => setCurrentPage('home')} />
          )
        )}
        {/* Kitchen Display */}
        {currentPage === 'kitchen' && (
          employee ? (
            hasPermission('kitchen') ? (
              <KitchenDisplayPage />
            ) : (
              <AccessDeniedPage message="Access Denied. You do not have permission to access the Kitchen." onBack={() => setCurrentPage('dashboard')} />
            )
          ) : (
            <EmployeeLoginPage onLogin={(emp) => { setEmployee(emp); setCurrentPage('dashboard'); }} onAction={(page) => setCurrentPage(page)} onBack={() => setCurrentPage('home')} />
          )
        )}
        {/* Kitchen Report */}
        {currentPage === 'kitchen-report' && (
          employee ? (
            <KitchenReportPage />
          ) : (
            <EmployeeLoginPage onLogin={(emp) => { setEmployee(emp); setCurrentPage('dashboard'); }} onAction={(page) => setCurrentPage(page)} onBack={() => setCurrentPage('home')} />
          )
        )}
        {/* Inventory Pages */}
        {currentPage.startsWith('inventory') && (
          employee ? (
            hasPermission('inventory') ? (
              <InventoryPage currentView={currentPage} setCurrentPage={setCurrentPage} menuData={menuData} refreshProducts={fetchProducts} />
            ) : (
              <AccessDeniedPage message="Access Denied. You do not have permission to access Inventory." onBack={() => setCurrentPage('dashboard')} />
            )
          ) : (
            <EmployeeLoginPage onLogin={(emp) => { setEmployee(emp); setCurrentPage('dashboard'); }} onAction={(page) => setCurrentPage(page)} onBack={() => setCurrentPage('home')} />
          )
        )}
        {/* Staff Pages */}
        {(currentPage === 'staff' || currentPage.startsWith('staff-')) && (
          employee ? (
            hasPermission('staff-employees') ? (
              <StaffPage currentView={currentPage} setCurrentPage={setCurrentPage} />
            ) : (
              <AccessDeniedPage message="Access Denied. You do not have permission to access Staff Management." onBack={() => setCurrentPage('dashboard')} />
            )
          ) : (
            <EmployeeLoginPage onLogin={(emp) => { setEmployee(emp); setCurrentPage('dashboard'); }} onAction={(page) => setCurrentPage(page)} onBack={() => setCurrentPage('home')} />
          )
        )}
        {/* Settings Pages */}
        {currentPage.startsWith('settings-') && (
          employee ? (
            hasPermission('settings-general') ? (
              <SettingsPage
                currentView={currentPage}
                setCurrentPage={setCurrentPage}
                fetchProducts={fetchProducts}
                employee={employee}
                sysConfig={sysConfig}
                setSysConfig={setSysConfig}
              />
            ) : (
              <AccessDeniedPage message="Access Denied. You do not have permission to access Settings." onBack={() => setCurrentPage('pos')} />
            )
          ) : (
            <EmployeeLoginPage onLogin={(emp) => { setEmployee(emp); setCurrentPage('pos'); }} onAction={(page) => setCurrentPage(page)} onBack={() => setCurrentPage('home')} />
          )
        )}
        {currentPage === 'customer-login' && <CustomerLoginPage setCustomer={setCustomer} setCurrentPage={setCurrentPage} companyId={publicCompanyId} />}
        {currentPage === 'customer-dashboard' && <CustomerDashboard customer={customer} onLogout={handleLogout} />}

        {/* Multi-Tenant Registration & Admin Login */}
        {currentPage === 'company-register' && (
          <CompanyRegistrationPage
            onSuccess={(emp, token) => {
              setEmployee(emp);
              setCurrentPage('pos');
            }}
            onBack={() => setCurrentPage('home')}
          />
        )}
        {currentPage === 'admin-login' && (
          <AdminLoginPage
            onLogin={(emp, token) => {
              setEmployee(emp);
              setCurrentPage('pos');
            }}
            onBack={() => setCurrentPage('home')}
          />
        )}
        {currentPage === 'print-test' && (
          <PrintTestPage
            config={sysConfig}
            setCurrentPage={setCurrentPage}
            setLastOrderData={setLastOrderData}
            showSuccessOverlay={showSuccessOverlay}
            setShowSuccessOverlay={setShowSuccessOverlay}
            setPrintMode={setPrintMode}
          />
        )}

        {showCart && <CartDrawer setShowCart={setShowCart} setCurrentPage={setCurrentPage} />}
        {showSizeModal && selectedProduct && (
          <SizeModal
            product={selectedProduct}
            onClose={() => {
              setShowSizeModal(false);
              setSelectedProduct(null);
            }}
            onSelectSize={(size) => {
              addToCart(selectedProduct, size);
            }}
          />
        )}

        {/* Mobile Bottom Navigation */}
        {(currentPage === 'home' || currentPage === 'menu') ? (
          <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 md:hidden z-50 pb-safe">
            <div className="flex items-center justify-between px-4 py-2">
              <button
                onClick={() => setCurrentPage('home')}
                className={`flex flex-col items-center px-3 py-1 ${currentPage === 'home' ? 'text-cyan-600' : 'text-gray-500'}`}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                <span className="text-xs font-medium">Home</span>
              </button>
              <button
                onClick={() => setCurrentPage('menu')}
                className={`flex flex-col items-center px-3 py-1 ${currentPage === 'menu' ? 'text-cyan-600' : 'text-gray-500'}`}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <span className="text-xs font-medium">Menu</span>
              </button>
              {/* Cart Button - Prominent */}
              <button
                onClick={() => {
                  setShowCart(false);
                  if (currentPage === 'pos') {
                    try {
                      window.dispatchEvent(new CustomEvent('open-payment'));
                    } catch (e) {
                      // fallback: navigate to cart
                      setCurrentPage('cart');
                    }
                  } else {
                    setCurrentPage('cart');
                  }
                }}
                className="relative bg-cyan-600 text-white px-6 py-2 rounded-full flex items-center space-x-2 font-bold text-sm shadow-lg"
              >
                <ShoppingCart className="w-5 h-5" />
                <span>Cart</span>
                {getTotalItems() > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                    {getTotalItems()}
                  </span>
                )}
              </button>
              <button
                onClick={() => customer ? setCurrentPage('customer-dashboard') : setCurrentPage('customer-login')}
                className={`flex flex-col items-center px-3 py-1 ${currentPage === 'customer-dashboard' || currentPage === 'customer-login' ? 'text-cyan-600' : 'text-gray-500'}`}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="text-xs font-medium">{customer ? 'Account' : 'Login'}</span>
              </button>
            </div>
          </nav>
        ) : employee && !['company-register', 'admin-login'].includes(currentPage) ? (
          /* Staff/Operational Nav bar - Focused for POS vs General for others */
          <nav className="fixed bottom-0 left-0 right-0 bg-cyan-700 md:hidden z-50 pb-safe">
            {currentPage === 'pos' ? (
              /* POS Focused Navigation - Only 3 Buttons as requested */
              <div className="flex items-center justify-around py-2 px-4 gap-4">
                {/* Scan Button */}
                <button
                  onClick={() => window.dispatchEvent(new CustomEvent('pos-open-scanner'))}
                  className="flex flex-col items-center text-cyan-100 hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v4a1 1 0 001 1h4M21 7v4a1 1 0 01-1 1h-4M3 17v-4a1 1 0 011-1h4M21 17v-4a1 1 0 00-1-1h-4" />
                  </svg>
                  <span className="text-[10px] font-medium mt-1">Scan</span>
                </button>

                {/* Checkout/Pay Button - Prominent */}
                <button
                  onClick={() => window.dispatchEvent(new CustomEvent('pos-open-payment'))}
                  className="relative bg-white text-cyan-700 px-6 py-2.5 rounded-full flex items-center space-x-2 font-bold text-sm shadow-lg transform active:scale-95 transition-all"
                  disabled={cartItems.length === 0}
                >
                  <ShoppingCart className="w-5 h-5 text-cyan-600" />
                  <span>
                    {cartItems.length > 0 ? `Pay ₱${(getTotalPrice() + (getTotalPrice() * (parseFloat(sysConfig.tax_rate) / 100))).toFixed(0)}` : 'Checkout'}
                  </span>
                  {getTotalItems() > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold animate-pulse shadow-md">
                      {getTotalItems()}
                    </span>
                  )}
                </button>

                {/* End Shift Button */}
                <button
                  onClick={() => setShowShiftEndModal(true)}
                  className="flex flex-col items-center text-orange-300 hover:text-orange-100 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-[10px] font-medium mt-1">End Shift</span>
                </button>
              </div>
            ) : (
              /* General Administration Nav bar - Expanded for full operational management */
              <>
                <div className="flex justify-around items-center py-1.5 px-2 bg-gray-100 z-50 relative">
                  {/* Top 4 visible items */}
                  <button onClick={() => setCurrentPage('dashboard')} className={`flex flex-col items-center min-w-[60px] py-1 rounded-lg transition-colors ${currentPage === 'dashboard' ? 'bg-cyan-100 text-cyan-700' : 'text-cyan-600 hover:bg-gray-200'}`}>
                    <TrendingUp className="w-5 h-5" />
                    <span className="text-[10px] font-medium mt-1">Analytics</span>
                  </button>
                  <button onClick={() => setCurrentPage('pos')} className={`flex flex-col items-center min-w-[60px] py-1 rounded-lg transition-colors ${currentPage === 'pos' ? 'bg-cyan-100 text-cyan-700' : 'text-cyan-600 hover:bg-gray-200'}`}>
                    <ShoppingCart className="w-5 h-5" />
                    <span className="text-[10px] font-medium mt-1">POS</span>
                  </button>
                  <button onClick={() => setCurrentPage('pos')} className={`flex flex-col items-center min-w-[60px] py-1 rounded-lg transition-colors ${currentPage === 'pos' ? 'bg-cyan-100 text-cyan-700' : 'text-cyan-600 hover:bg-gray-200'}`}>
                    <LayoutGrid className="w-5 h-5" />
                    <span className="text-[10px] font-medium mt-1">Tables</span>
                  </button>
                  <button onClick={() => setCurrentPage('orders-active')} className={`flex flex-col items-center min-w-[60px] py-1 rounded-lg transition-colors ${currentPage.startsWith('orders') ? 'bg-cyan-100 text-cyan-700' : 'text-cyan-600 hover:bg-gray-200'}`}>
                    <Receipt className="w-5 h-5" />
                    <span className="text-[10px] font-medium mt-1">Orders</span>
                  </button>

                  {/* 5th Icon: Hamburger Drawer Toggle */}
                  <button onClick={() => setIsNavDrawerOpen(prev => !prev)} className={`flex flex-col items-center min-w-[60px] py-1 rounded-lg transition-colors ${isNavDrawerOpen ? 'bg-cyan-100 text-cyan-700' : 'text-cyan-600 hover:bg-gray-200'}`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                    <span className="text-[10px] font-medium mt-1">More</span>
                  </button>
                </div>

                {/* Drawer Menu */}
                <div
                  className={`fixed left-0 right-0 bottom-14 bg-gray-50 shadow-[0_-10px_40px_rgba(0,0,0,0.15)] rounded-t-3xl transition-transform duration-300 ease-in-out z-40 ${isNavDrawerOpen ? 'translate-y-0' : 'translate-y-full'}`}
                  style={{ height: '40vh' }}
                >
                  <div className="p-4 pt-6 h-full overflow-y-auto">
                    <div className="flex justify-between items-center mb-6 pb-2 border-b border-gray-200">
                      <h3 className="font-black text-gray-800 tracking-wider">MORE OPTIONS</h3>
                      <button onClick={() => setIsNavDrawerOpen(false)} className="text-gray-500 p-2 bg-gray-200 hover:bg-gray-300 rounded-full transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    {/* Grid of 3 columns */}
                    <div className="grid grid-cols-3 gap-y-6 gap-x-2 pb-8">
                      <button onClick={() => { setCurrentPage('kitchen'); setIsNavDrawerOpen(false); }} className={`flex flex-col items-center justify-center py-3 rounded-2xl transition-all ${currentPage === 'kitchen' ? 'bg-cyan-100 text-cyan-700 shadow-md scale-105' : 'text-cyan-600 bg-white shadow-sm hover:shadow-md hover:scale-105 border border-gray-100'}`}>
                        <ClipboardList className="w-7 h-7 mb-2" />
                        <span className="text-[11px] font-bold">Kitchen</span>
                      </button>

                      {['admin', 'manager'].includes(employee.role) && (
                        <button onClick={() => { setCurrentPage('products'); setIsNavDrawerOpen(false); }} className={`flex flex-col items-center justify-center py-3 rounded-2xl transition-all ${currentPage === 'products' ? 'bg-cyan-100 text-cyan-700 shadow-md scale-105' : 'text-cyan-600 bg-white shadow-sm hover:shadow-md hover:scale-105 border border-gray-100'}`}>
                          <UtensilsCrossed className="w-7 h-7 mb-2" />
                          <span className="text-[11px] font-bold">Menu</span>
                        </button>
                      )}

                      {['admin', 'manager'].includes(employee.role) && (
                        <button onClick={() => { setCurrentPage('inventory-stock'); setIsNavDrawerOpen(false); }} className={`flex flex-col items-center justify-center py-3 rounded-2xl transition-all ${currentPage === 'inventory-stock' ? 'bg-cyan-100 text-cyan-700 shadow-md scale-105' : 'text-cyan-600 bg-white shadow-sm hover:shadow-md hover:scale-105 border border-gray-100'}`}>
                          <Package className="w-7 h-7 mb-2" />
                          <span className="text-[11px] font-bold">Inventory</span>
                        </button>
                      )}

                      {['admin', 'manager'].includes(employee.role) && (
                        <button onClick={() => { setCurrentPage('customers'); setIsNavDrawerOpen(false); }} className={`flex flex-col items-center justify-center py-3 rounded-2xl transition-all ${currentPage === 'customers' ? 'bg-cyan-100 text-cyan-700 shadow-md scale-105' : 'text-cyan-600 bg-white shadow-sm hover:shadow-md hover:scale-105 border border-gray-100'}`}>
                          <User className="w-7 h-7 mb-2" />
                          <span className="text-[11px] font-bold">Clients</span>
                        </button>
                      )}

                      {employee.role === 'admin' && (
                        <button onClick={() => { setCurrentPage('staff-employees'); setIsNavDrawerOpen(false); }} className={`flex flex-col items-center justify-center py-3 rounded-2xl transition-all ${currentPage === 'staff-employees' ? 'bg-cyan-100 text-cyan-700 shadow-md scale-105' : 'text-cyan-600 bg-white shadow-sm hover:shadow-md hover:scale-105 border border-gray-100'}`}>
                          <User className="w-7 h-7 mb-2 opacity-70" />
                          <span className="text-[11px] font-bold">Staff</span>
                        </button>
                      )}

                      {employee.role === 'admin' && (
                        <button onClick={() => { setCurrentPage('settings-general'); setIsNavDrawerOpen(false); }} className={`flex flex-col items-center justify-center py-3 rounded-2xl transition-all ${currentPage === 'settings-general' ? 'bg-cyan-100 text-cyan-700 shadow-md scale-105' : 'text-cyan-600 bg-white shadow-sm hover:shadow-md hover:scale-105 border border-gray-100'}`}>
                          <Settings className="w-7 h-7 mb-2" />
                          <span className="text-[11px] font-bold">System</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Overlay for clicking outside */}
                {isNavDrawerOpen && (
                  <div
                    className="fixed inset-0 bg-black/40 z-30 transition-opacity backdrop-blur-sm"
                    onClick={() => setIsNavDrawerOpen(false)}
                  />
                )}
              </>

            )}
          </nav>
        ) : (
          /* Default/Auth fallback nav */
          <nav className="fixed bottom-0 left-0 right-0 bg-white md:hidden z-50 pb-safe">
            <div className="flex justify-around items-center py-2">
              <button
                onClick={() => setCurrentPage('home')}
                className={`flex flex-col items-center px-3 py-1 ${currentPage === 'home' ? 'text-cyan-600' : 'text-gray-500'}`}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                <span className="text-xs font-medium">Home</span>
              </button>
              <button
                onClick={() => setCurrentPage('dashboard')}
                className={`flex flex-col items-center px-3 py-1 ${currentPage === 'dashboard' ? 'text-cyan-600' : 'text-gray-500'}`}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span className="text-xs font-medium">{employee ? 'Dashboard' : 'Staff'}</span>
              </button>
            </div>
          </nav>
        )}
      </div>
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px', width: 0, height: 0, overflow: 'hidden' }}>
        <PrintableReceipt order={lastOrderData} config={sysConfig} />
      </div>
    </CartContext.Provider>
  );
}

// Size Selection Modal
function SizeModal({ product, onClose, onSelectSize }) {
  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        // Close when clicking backdrop
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 relative animate-fadeIn">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-all"
        >
          <X className="w-6 h-6" />
        </button>

        <h2 className="text-2xl font-black text-cyan-600 mb-2">Select Size</h2>
        <p className="text-gray-600 font-bold mb-6">{product.name}</p>

        <div className="space-y-3">
          {product.sizes.map((size) => (
            <button
              key={size.name}
              onClick={() => onSelectSize(size)}
              className="w-full bg-gray-50 hover:bg-cyan-50 border-2 border-gray-200 hover:border-cyan-600 rounded-lg p-4 flex items-center justify-between transition-all group"
            >
              <span className="font-bold text-gray-800 group-hover:text-cyan-600">{size.name}</span>
              <span className="text-xl font-black text-cyan-600">Php {size.price.toFixed(2)}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// Header Component
function Header({ currentPage, setCurrentPage, searchQuery, setSearchQuery, employee, onEmployeeLogout }) {
  const [isScrolled, setIsScrolled] = useState(false);
  const activeCompanyId = localStorage.getItem('active_company_id') || '';

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    // Check initial scroll position
    handleScroll();
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Glassmorphism effect when scrolled on home page
  const isGlass = currentPage === 'home' && isScrolled;

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 h-14 md:h-16 ${isGlass ? 'bg-cyan-600/70 backdrop-blur-md shadow-lg' : 'bg-cyan-600'
      } ${currentPage === 'pos' ? 'border-b border-white' : ''}`}>
      <div className="w-full h-full">
        {/* Top bar */}
        <div className="w-full h-full px-4 md:px-8">
          <div className="flex items-center justify-between gap-4 h-full">
            {/* Logo - hidden on mobile when search is shown */}
            <div className={`flex items-center space-x-3 cursor-pointer ${(currentPage === 'home' || currentPage === 'menu') ? 'hidden md:flex' : 'flex'}`} onClick={() => setCurrentPage('home')}>
              <img src="/assets/images/lumina-logo.png" alt="Lumina Logo" className="w-10 h-10 object-contain drop-shadow-md" />
              <div>
                <h1 className="text-lg font-black text-white tracking-wider uppercase">Lumina POS</h1>
                <p className="text-[8px] text-white font-bold opacity-90 uppercase tracking-widest">SME Commerce Engine</p>
              </div>
            </div>

            {/* Mobile search bar - centered in header on home/menu */}
            <div className={`${currentPage === 'home' || currentPage === 'menu' ? 'flex md:hidden' : 'hidden'} flex-1 relative`}>
              <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${isGlass ? 'text-white/70' : 'text-cyan-700'}`} />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (e.target.value && currentPage !== 'menu') setCurrentPage('menu');
                }}
                className={`w-full pl-9 pr-3 py-1.5 rounded-full focus:outline-none font-medium text-sm transition-all ${isGlass
                  ? 'bg-white/20 text-white placeholder-white/60'
                  : 'bg-cyan-100 text-cyan-800 placeholder-cyan-700/50'
                  }`}
              />
            </div>

            {/* Desktop search bar */}
            <div className={`${currentPage === 'home' || currentPage === 'menu' ? 'hidden md:flex' : 'hidden'} flex-1 max-w-xl mx-6 relative`}>
              <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${isGlass ? 'text-white/70' : 'text-cyan-700'}`} />
              <input
                type="text"
                placeholder="Search resources, products, or tools..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (e.target.value && currentPage !== 'menu') setCurrentPage('menu');
                }}
                className={`w-full pl-10 pr-4 py-2 rounded-full focus:outline-none font-medium transition-all ${isGlass
                  ? 'bg-white/20 text-white placeholder-white/60'
                  : 'bg-cyan-100 text-cyan-800 placeholder-cyan-700/50'
                  }`}
              />
            </div>

            <div className="flex items-center space-x-3">
              <div
                className="flex items-center bg-cyan-800/60 text-cyan-100 px-2 py-1 rounded-md text-[10px] font-mono border border-cyan-500/40 max-w-[180px] md:max-w-[260px]"
                title={activeCompanyId || 'No active_company_id in localStorage'}
              >
                <span className="mr-1 opacity-80">CID:</span>
                <span className="truncate">{activeCompanyId || 'not-set'}</span>
              </div>

              {/* User Profile Dropdown - Top Right */}
              {employee && (
                <div className="relative group">
                  <button className="flex items-center space-x-2 bg-cyan-700/50 hover:bg-cyan-700 text-white px-3 py-2 rounded-lg transition-colors">
                    <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4" />
                    </div>
                    <div className="hidden lg:block text-left">
                      <p className="text-sm font-medium leading-tight">{employee.name}</p>
                      <p className="text-xs text-cyan-200 capitalize">{employee.role}</p>
                    </div>
                    <svg className="w-4 h-4 text-cyan-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                    <div className="py-2">
                      <div className="px-4 py-2 border-b border-gray-100">
                        <p className="font-medium text-gray-800">{employee.name}</p>
                        <p className="text-xs text-gray-500 capitalize">{employee.role}</p>
                      </div>
                      <button onClick={() => setCurrentPage('profile')} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-cyan-50 hover:text-cyan-600 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                        My Profile
                      </button>
                      <button onClick={() => setCurrentPage('timesheet')} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-cyan-50 hover:text-cyan-600 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        Clock In/Out
                      </button>
                      <div className="border-t border-gray-100 mt-1 pt-1">
                        <button onClick={onEmployeeLogout} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                          Log Out
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {!employee && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage('dashboard')}
                    className="bg-cyan-600 text-white px-3 py-1.5 md:px-5 md:py-2 hover:bg-cyan-700 transition-all rounded-lg font-bold text-xs md:text-sm flex items-center space-x-1.5 shadow-md active:scale-95 border border-white/20"
                  >
                    <User className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    <span>STAFF LOGIN</span>
                  </button>
                  <button
                    onClick={() => setCurrentPage('settings-general')}
                    className="hidden md:flex bg-cyan-700/50 hover:bg-cyan-700 text-white p-2 rounded-lg transition-colors shadow-sm"
                    title="Settings"
                    aria-label="Settings"
                  >
                    <Settings className="w-5 h-5" />
                  </button>
                </div>
              )}

            </div>
          </div>
        </div>


      </div>
    </header>
  );
}

// NavDropdown — defined at module level so its useRef persists across SubMenu re-renders
function NavDropdown({ name, label, active, alignRight, openMenu, onToggle, children }) {
  const btnRef = useRef(null);

  const getStyle = () => {
    if (!btnRef.current) return { visibility: 'hidden', position: 'fixed', zIndex: 9999 };
    const r = btnRef.current.getBoundingClientRect();
    return {
      position: 'fixed',
      top: r.bottom + 4,
      left: alignRight ? r.right - 144 : r.left,
      zIndex: 9999,
    };
  };

  return (
    <div className="shrink-0">
      <button
        ref={btnRef}
        onClick={() => onToggle(name)}
        className={`px-2 md:px-3 py-1 md:py-1.5 rounded text-[10px] md:text-xs transition-all flex items-center gap-0.5 ${active ? 'bg-cyan-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
      >
        {label}
        <svg className={`w-2.5 h-2.5 transition-transform ${openMenu === name ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
      </button>
      {openMenu === name && (
        <div style={getStyle()} className="w-40 bg-white rounded-lg shadow-xl border border-gray-200 flex flex-col py-1">
          {children}
        </div>
      )}
    </div>
  );
}


// System Navigation Structure
const navItems = [
  { id: 'pos', icon: ShoppingCart, label: 'Terminal', desc: 'Main Checkout Engine' },
  { id: 'dashboard', icon: BarChart2, label: 'Analytics', desc: 'Business Intelligence' },
  { id: 'kitchen', icon: ClipboardList, label: 'Kitchen', desc: 'Active KDS Views' },
  {
    id: 'orders', icon: ShoppingBag, label: 'Orders', roles: ['admin', 'manager'], sub: [
      { id: 'orders-active', label: 'In Progress' },
      { id: 'orders-history', label: 'History' }
    ]
  },
  {
    id: 'products', icon: UtensilsCrossed, label: 'Menu & Products', roles: ['admin', 'manager'], sub: [
      { id: 'products', label: 'Product Matrix' },
      { id: 'menu-categories', label: 'Category Logic' }
    ]
  },
  {
    id: 'inventory', icon: Package, label: 'Inventory Control', roles: ['admin', 'manager'], sub: [
      { id: 'inventory-stock', label: 'Stock Pulse' },
      { id: 'inventory-ingredients', label: 'Raw Materials' },
      { id: 'inventory-recipes', label: 'Composite Recipes' }
    ]
  },
  {
    id: 'reports', icon: FileText, label: 'Reports', roles: ['admin', 'manager'], sub: [
      { id: 'reports-sales', label: 'Sales Reports' },
      { id: 'reports-inventory', label: 'Inventory Audit' },
      { id: 'reports-logs', label: 'Activity Logs' }
    ]
  },
  { id: 'customers', icon: User, label: 'Clients', roles: ['admin', 'manager'] },
  { id: 'staff-employees', icon: LayoutGrid, label: 'Team', roles: ['admin'] },
  { id: 'settings-general', icon: Settings, label: 'Config', roles: ['admin'] },
];

// Global Sidebar Component
function Sidebar({ currentPage, setCurrentPage, employee }) {
  const [expandedItems, setExpandedItems] = useState([]);

  const toggleMenu = (id) => {
    setExpandedItems(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };


  return (
    <aside className="hidden md:flex fixed top-14 md:top-16 left-0 bottom-0 w-[50px] hover:w-64 bg-white/95 backdrop-blur-md border-r border-gray-100 z-[60] flex-col transition-all duration-300 group overflow-hidden">
      <div className="flex-1 px-1.5 group-hover:px-4 space-y-2 overflow-y-auto pt-6 scrollbar-hide">
        {navItems.map((item) => {
          // Permission logic:
          // 1. If employee has specific permissions set, use those
          // 2. Fallback to role-based access if no specific permissions
          if (employee) {
            if (employee.permissions && Array.isArray(employee.permissions) && employee.permissions.length > 0) {
              if (!employee.permissions.includes(item.id)) return null;
            } else if (item.roles && !item.roles.includes(employee.role)) {
              return null;
            }
          } else if (item.roles) {
            return null;
          }

          const isActive = currentPage === item.id || (item.sub && item.sub.some(s => s.id === currentPage)) || (item.id === 'pos' && currentPage === 'pos') || (item.id.includes('settings') && currentPage.includes('settings'));
          const isExpanded = expandedItems.includes(item.id);

          return (
            <div key={item.id} className="relative">
              <button
                onClick={() => item.sub ? toggleMenu(item.id) : setCurrentPage(item.id)}
                className={`w-full flex items-center justify-center group-hover:justify-start gap-4 h-10 group-hover:h-12 rounded-xl transition-all ${isActive
                  ? 'bg-cyan-600 text-white shadow-lg'
                  : 'text-gray-500 hover:bg-cyan-50 hover:text-cyan-600'
                  }`}
              >
                <item.icon className="w-5 h-5 shrink-0 ml-0 group-hover:ml-1" />
                <span className="hidden group-hover:block font-bold text-xs tracking-tight whitespace-nowrap">{item.label}</span>
                {item.sub && (
                  <div className={`hidden group-hover:block ml-auto mr-1 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </div>
                )}
              </button>

              {/* Nested Sub-menu - Only when expanded AND in wide mode */}
              {item.sub && isExpanded && (
                <div className="hidden group-hover:block ml-9 mt-1 space-y-1">
                  {item.sub.map(s => (
                    <button
                      key={s.id}
                      onClick={() => setCurrentPage(s.id)}
                      className={`block w-full text-left px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all ${currentPage === s.id ? 'text-cyan-600 bg-cyan-50' : 'text-gray-400 hover:text-cyan-600 hover:bg-gray-50'}`}
                    >
                      • {s.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="p-1 group-hover:p-4 mt-auto border-t border-gray-50 bg-gray-50/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 group-hover:w-10 group-hover:h-10 rounded-xl bg-cyan-600 flex flex-shrink-0 items-center justify-center text-white font-black text-xs shadow-inner">
            {employee ? employee.name[0] : '?'}
          </div>
          <div className="hidden group-hover:block overflow-hidden transition-all duration-300">
            <p className="font-bold text-gray-900 text-xs truncate max-w-[140px]">{employee ? employee.name : 'Guest User'}</p>
            <p className="font-black text-[9px] text-cyan-600 uppercase tracking-widest leading-none mt-1">LUMINA PRO</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

// Sticky SubMenu Component - Below Header
function SubMenu({ currentPage, setCurrentPage, employee }) {
  const [openMenu, setOpenMenu] = useState(null);
  const [occupiedCount, setOccupiedCount] = useState(0);
  const prevCountRef = useRef(0);
  const navRef = useRef(null);

  const playTableAlert = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      [440, 550].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.15);
        gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + i * 0.15 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.25);
        osc.start(ctx.currentTime + i * 0.15);
        osc.stop(ctx.currentTime + i * 0.15 + 0.3);
      });
    } catch (_) { }
  };

  useEffect(() => {
    if (!employee) return;
    const fetchOccupied = async () => {
      try {
        const res = await fetchWithAuth(`${API_URL}/tables`);
        const data = await res.json();
        if (data.success) {
          const count = data.tables.filter(t => t.status === 'occupied').length;
          if (count > prevCountRef.current) playTableAlert();
          prevCountRef.current = count;
          setOccupiedCount(count);
        }
      } catch (_) { }
    };
    fetchOccupied();
    const interval = setInterval(fetchOccupied, 10000);
    return () => clearInterval(interval);
  }, [employee]);

  useEffect(() => {
    const handler = (e) => {
      if (navRef.current && !navRef.current.contains(e.target)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => { setOpenMenu(null); }, [currentPage]);

  if (currentPage === 'pos' || currentPage === 'home') return null;

  const toggle = (name) => setOpenMenu(prev => prev === name ? null : name);

  const navBtn = (page, label, Icon) => (
    <button
      key={page}
      onClick={() => setCurrentPage(page)}
      className={`w-full flex items-center px-3 py-4 transition-colors shrink-0 group/btn border-l-4 ${currentPage === page ? 'bg-gray-900 border-cyan-500 text-white font-bold' : 'hover:bg-gray-700 border-transparent text-gray-400 hover:text-white font-medium'
        }`}
      title={label}
    >
      <Icon className={`w-6 h-6 shrink-0 ${currentPage === page ? 'text-cyan-500' : 'text-gray-400 group-hover/btn:text-white'}`} />
      <span className="ml-3 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 tracking-wide text-sm pointer-events-none">{label}</span>
    </button>
  );

  const dropItem = (page, label) => (
    <button
      key={page}
      onClick={() => { setCurrentPage(page); setOpenMenu(null); }}
      className={`w-full text-left px-3 py-2 text-xs transition-colors ${currentPage === page ? 'bg-cyan-50 text-cyan-700 font-medium' : 'text-gray-700 hover:bg-gray-50'
        }`}
    >
      {label}
    </button>
  );

  return (
    <div className="fixed top-14 md:top-16 left-0 right-0 z-[51] bg-white border-t-2 border-t-cyan-600 border-b border-gray-200 shadow-sm">
      <div className="w-full px-2 md:px-4">
        <nav ref={navRef} className="flex items-center gap-0.5 md:gap-1 py-1 overflow-x-auto">
          {!employee && (
            <button
              onClick={() => setCurrentPage('dashboard')}
              className={`px-2 md:px-3 py-1 md:py-1.5 rounded text-[10px] md:text-xs transition-all shrink-0 inline-flex items-center gap-1 ${currentPage === 'dashboard' ? 'bg-cyan-600 text-white' : 'text-gray-600 hover:bg-gray-100'
                }`}
            >
              <svg className="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c1.105 0 2 .895 2 2s-.895 2-2 2-2-.895-2-2 .895-2 2-2zm6-2h-1V7a5 5 0 10-10 0v2H6a2 2 0 00-2 2v7a2 2 0 002 2h12a2 2 0 002-2v-7a2 2 0 00-2-2zM9 9V7a3 3 0 116 0v2H9z" />
              </svg>
              <span>Staff</span>
            </button>
          )}

          {employee && (
            <>
              <span className="text-gray-300 mx-0.5 md:mx-1 shrink-0">|</span>
              {navBtn('dashboard', 'Dashboard', TrendingUp)}
              {navBtn('pos', 'POS', ShoppingCart)}
              {navBtn('kitchen', 'KDS', ClipboardList)}

              <div className="relative shrink-0">
                <button
                  onClick={() => setCurrentPage('pos')}
                  className={`px-2 md:px-3 py-1 md:py-1.5 rounded text-[10px] md:text-xs transition-all ${currentPage === 'pos' ? 'bg-cyan-600 text-white' : 'text-gray-600 hover:bg-gray-100'
                    }`}
                >
                  Tables
                </button>
                {occupiedCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] rounded-full min-w-[14px] h-[14px] flex items-center justify-center font-bold px-0.5 leading-none pointer-events-none">
                    {occupiedCount}
                  </span>
                )}
              </div>

              <NavDropdown name="orders" label="Orders" openMenu={openMenu} onToggle={toggle}
                active={currentPage.startsWith('orders') || currentPage === 'kitchen-report'}>
                {dropItem('orders-active', 'Active Orders')}
                {dropItem('orders-history', 'Order History')}
                {dropItem('orders-refunds', 'Refunds / Voids')}
                {dropItem('kitchen-report', 'Kitchen Report')}
              </NavDropdown>

              {['admin', 'manager'].includes(employee.role) && (
                <NavDropdown name="menuMgmt" label="Menu" openMenu={openMenu} onToggle={toggle}
                  active={currentPage.startsWith('menu-manage') || currentPage === 'products'}>
                  {dropItem('products', 'Menu Items')}
                  {dropItem('menu-categories', 'Categories')}
                  {dropItem('menu-modifiers', 'Modifiers')}
                  {dropItem('menu-pricing', 'Pricing')}
                </NavDropdown>
              )}

              {['admin', 'manager'].includes(employee.role) && (
                <NavDropdown name="inventory" label="Inventory" openMenu={openMenu} onToggle={toggle}
                  active={currentPage.startsWith('inventory')}>
                  {dropItem('inventory-stock', 'Stock')}
                  {dropItem('inventory-ingredients', 'Raw Materials')}
                  {dropItem('inventory-recipes', 'Composite')}
                  {dropItem('inventory-status', 'Status')}
                </NavDropdown>
              )}

              {['admin', 'manager'].includes(employee.role) && navBtn('customers', 'Customers', User)}

              {employee.role === 'admin' && (
                <NavDropdown name="staff" label="Staff" openMenu={openMenu} onToggle={toggle}
                  active={currentPage.startsWith('staff')}>
                  {dropItem('staff-employees', 'Employees')}
                  {dropItem('staff-schedules', 'Schedules')}
                  {dropItem('staff-timesheet', 'Time Tracking')}
                  {dropItem('staff-permissions', 'Permissions')}
                </NavDropdown>
              )}

              {['admin', 'manager'].includes(employee.role) && (
                <NavDropdown name="reports" label="Reports" openMenu={openMenu} onToggle={toggle}
                  active={currentPage.startsWith('reports')}>
                  {dropItem('reports-sales', 'Sales Summary')}
                  {dropItem('reports-items', 'Sales by Item')}
                  {dropItem('reports-category', 'Sales by Category')}
                  {dropItem('reports-employees', 'Sales by Employee')}
                  {dropItem('reports-payments', 'Sales by Payment Type')}
                  {dropItem('reports-inventory', 'Inventory Reports')}
                  {dropItem('reports-financial', 'Financial')}
                  {dropItem('reports-tax', 'Tax Reports')}
                </NavDropdown>
              )}

              {employee.role === 'admin' && (
                <NavDropdown name="settings" label="Settings" alignRight openMenu={openMenu} onToggle={toggle}
                  active={currentPage.startsWith('settings')}>
                  {dropItem('settings-general', 'System Config')}
                  {dropItem('settings-payment', 'Payment Setup')}
                  {dropItem('settings-printers', 'Printers')}
                  {dropItem('settings-integrations', 'Integrations')}
                </NavDropdown>
              )}
            </>
          )}
        </nav>
      </div>
    </div>
  );
}

// Dashboard Page - Business Intelligence & Analytics
function DashboardPage({ setCurrentPage, employee, convertAmount = (amount) => Number(amount) || 0, currency = 'PHP' }) {
  const [salesData, setSalesData] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [topProducts, setTopProducts] = useState([]);
  const [lowProducts, setLowProducts] = useState([]);
  const [revenueByCategory, setRevenueByCategory] = useState(null);
  const [serviceTimeData, setServiceTimeData] = useState(null);
  const [peakTimeData, setPeakTimeData] = useState(null);
  const [profitData, setProfitData] = useState(null);
  const [customerMetrics, setCustomerMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('week'); // Default: Week
  const [rawOrders, setRawOrders] = useState([]);
  const [orders, setOrders] = useState([]);

  // Conversion rate logic using props
  const formatCurrency = (amount) => {
    const value = convertAmount ? convertAmount(amount) : amount;
    const symbol = currency === 'PHP' ? '₱' : '$';
    return `${symbol}${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('auth_token');
        const headers = {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        };

        // Get date range based on timeframe using local time
        const today = new Date();
        let startDate = new Date();
        if (timeframe === 'today') {
          startDate.setHours(0, 0, 0, 0);
        } else if (timeframe === 'week') {
          startDate.setDate(today.getDate() - 7);
        } else if (timeframe === 'month') {
          startDate.setMonth(today.getMonth() - 1);
        } else {
          startDate.setFullYear(today.getFullYear() - 1);
        }

        // Use local date strings for backend filtering
        const toDateStr = (date) => toLocalDateInputValue(date);

        const startStr = toDateStr(startDate);
        const endStr = timeframe === 'today' ? startStr : toDateStr(today);

        // Debug log (user can see in dev tools)
        console.log(`[DASHBOARD DEBUG] Loading timeframe: ${timeframe}, Range: ${startStr} to ${endStr}`);

        // DEBUG: Match working OrdersPage URL exactly if it works there but not here
        // Match Orders page source query to avoid backend date filter mismatches.
        const salesUrl = `${API_URL}/orders?include_items=true&limit=1000`;

        const salesResponse = await fetchWithAuth(salesUrl);
        let salesResult = await salesResponse.json();
        if (!salesResponse.ok || !salesResult?.success) {
          console.warn('[DASHBOARD DEBUG] include_items fetch failed, retrying base orders endpoint.');
          const fallbackSalesResponse = await fetchWithAuth(`${API_URL}/orders?limit=1000`);
          salesResult = await fallbackSalesResponse.json();
        }

        let customersResult = { success: false, customers: [] };
        try {
          const customersResponse = await fetchWithAuth(`${API_URL}/customers`);
          customersResult = await customersResponse.json();
        } catch (err) {
          console.warn('[DASHBOARD DEBUG] Customers fetch failed; continuing without customer metrics source.', err);
        }

        if (salesResult.success && salesResult.orders) {
          const orders = Array.isArray(salesResult.orders) ? salesResult.orders : [];
          setRawOrders(orders);
          const allCustomers = customersResult.success ? (customersResult.customers || []) : [];

          // Frontend timeframe filtering (using local time), excluding only terminal non-revenue statuses.
          const excludedStatuses = new Set(['voided', 'refunded', 'cancelled']);
          const filteredOrders = orders.filter((order) => {
            const orderDate = new Date(order.created_at);
            if (Number.isNaN(orderDate.getTime())) return false;
            const status = String(order.order_status || order.status || '').trim().toLowerCase();
            if (excludedStatuses.has(status)) return false;

            if (timeframe === 'today') {
              const orderDay = toDateStr(orderDate);
              return orderDay === startStr;
            }

            const startCheck = new Date(startDate);
            startCheck.setHours(0, 0, 0, 0);
            const endCheck = new Date(today);
            endCheck.setHours(23, 59, 59, 999);
            return orderDate >= startCheck && orderDate <= endCheck;
          });

          console.log(`[DASHBOARD DEBUG] Fetched ${orders.length} orders total. Filtered to ${filteredOrders.length}.`);

          const toNum = (v) => {
            const n = Number(v);
            return Number.isFinite(n) ? n : 0;
          };
          const getOrderRevenue = (order) => {
            const primary = toNum(order.total_amount);
            if (primary > 0) return primary;
            const fallback = toNum(order.subtotal) - toNum(order.discount_amount) + toNum(order.tax_amount) + toNum(order.delivery_fee);
            return fallback > 0 ? fallback : 0;
          };

          // Calculate metrics
          const totalRevenue = filteredOrders.reduce((sum, order) => sum + getOrderRevenue(order), 0);
          const avgOrderValue = filteredOrders.length > 0 ? totalRevenue / filteredOrders.length : 0;
          const totalOrders = filteredOrders.length;
          const totalItems = filteredOrders.reduce((sum, o) => sum + (o.items?.length || 1), 0);
          const avgOrderSize = filteredOrders.length > 0 ? totalItems / filteredOrders.length : 0;

          // Calculate total discounts and identify active customers in this period
          let totalDiscounts = 0;
          const activeCustomerIds = new Set();

          filteredOrders.forEach(o => {
            totalDiscounts += parseFloat(o.discount_amount || 0);
            if (o.customer_id) activeCustomerIds.add(o.customer_id);
          });

          // Accurate New vs Returning Logic
          // NEW: Registered within timeframe
          // RETURNING: Registered before timeframe AND ordered within timeframe
          let newCustomersCount = 0;
          let returningCustomersCount = 0;

          activeCustomerIds.forEach(cid => {
            const cust = allCustomers.find(c => c.id === cid);
            // If we find the customer and they registered AFTER startDate, they are truly NEW
            if (cust && new Date(cust.created_at) >= startDate) {
              newCustomersCount++;
            } else {
              // If they registered before OR we don't have record (legacy), they are RETURNING
              returningCustomersCount++;
            }
          });

          const uniqueCustomersInTimeframe = activeCustomerIds.size;
          const ltvValue = uniqueCustomersInTimeframe > 0 ? totalRevenue / uniqueCustomersInTimeframe : 0;
          const cacValue = newCustomersCount > 0 ? totalDiscounts / newCustomersCount : 0;
          const retentionRate = uniqueCustomersInTimeframe > 0 ? (returningCustomersCount / uniqueCustomersInTimeframe) * 100 : 0;

          setCustomerMetrics({
            newCustomers: newCustomersCount,
            returningCustomers: returningCustomersCount,
            ltv: convertAmount(ltvValue),
            cac: convertAmount(cacValue),
            retention: retentionRate.toFixed(1)
          });

          // Calculate average service time (in minutes)
          const servedOrders = filteredOrders.filter(o => o.served_at && o.created_at);
          let avgServiceTime = 0;
          if (servedOrders.length > 0) {
            const totalMinutes = servedOrders.reduce((sum, o) => {
              const diff = new Date(o.served_at) - new Date(o.created_at);
              return sum + (diff / 1000 / 60);
            }, 0);
            avgServiceTime = (totalMinutes / servedOrders.length).toFixed(1);
          }

          setMetrics({
            totalRevenue,
            avgOrderValue,
            totalOrders,
            avgOrderSize: avgOrderSize.toFixed(1),
            avgServiceTime
          });

          // Sales trend aggregation: hourly for "today", date/month buckets for other ranges.
          const daysToShow = timeframe === 'today' ? 24 : timeframe === 'week' ? 7 : timeframe === 'month' ? 30 : 12;
          let labels = [];
          let chartData = [];

          if (timeframe === 'today') {
            const hourMap = new Array(24).fill(0);
            filteredOrders.forEach((order) => {
              const dt = new Date(order.created_at);
              const hour = dt.getHours();
              if (hour >= 0 && hour <= 23) {
                hourMap[hour] += getOrderRevenue(order);
              }
            });
            labels = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);
            chartData = hourMap.map((v) => convertAmount(v));
          } else {
            const dateMap = {};

            filteredOrders.forEach(order => {
              const date = new Date(order.created_at);
              const dateKey = timeframe === 'year'
                ? date.toLocaleString('en-US', { month: 'short', year: '2-digit' })
                : date.toLocaleDateString();
              dateMap[dateKey] = (dateMap[dateKey] || 0) + getOrderRevenue(order);
            });

            const sortedDates = Object.keys(dateMap).sort();
            labels = sortedDates.slice(-daysToShow);
            chartData = labels.map(d => convertAmount(dateMap[d]));
          }

          setSalesData({
            labels,
            datasets: [{
              label: timeframe === 'today' ? `Hourly Revenue (${currency})` : `Daily Revenue (${currency})`,
              data: chartData,
              borderColor: '#0891b2',
              backgroundColor: 'rgba(8, 145, 178, 0.15)',
              borderWidth: 2,
              fill: true,
              tension: 0.4,
              pointRadius: 4,
              pointBackgroundColor: '#0891b2',
              pointBorderColor: '#fff',
              pointBorderWidth: 2
            }]
          });

          // Calculate revenue by category
          const categoryMap = {};
          const productMap = {};

          filteredOrders.forEach(order => {
            // Accurate Revenue Allocation Logic
            const items = Array.isArray(order.items) ? order.items : [];
            if (items.length === 0) return;

            const discountedSubtotal = Number(order.subtotal || 0) - Number(order.discount_amount || 0);
            const targetRevenueCents = Math.round(discountedSubtotal * 100);

            const baseCents = items.map((it) => {
              const qty = Number(it.quantity || 0);
              const unit = Number(it.unit_price ?? it.price ?? 0);
              const subtotal = Number(it.subtotal);
              const base = Number.isFinite(subtotal) ? subtotal : (qty * unit);
              return Math.max(0, Math.round(base * 100));
            });
            const baseSumCents = baseCents.reduce((a, b) => a + b, 0);

            let allocated = 0;
            items.forEach((item, idx) => {
              let itemRevenueCents = 0;
              if (baseSumCents > 0) {
                if (idx === items.length - 1) {
                  itemRevenueCents = targetRevenueCents - allocated;
                } else {
                  itemRevenueCents = Math.round((baseCents[idx] / baseSumCents) * targetRevenueCents);
                  allocated += itemRevenueCents;
                }
              } else {
                if (idx === items.length - 1) {
                  itemRevenueCents = targetRevenueCents - allocated;
                } else {
                  itemRevenueCents = Math.floor(targetRevenueCents / items.length);
                  allocated += itemRevenueCents;
                }
              }

              const itemRevenue = itemRevenueCents / 100;
              const category = item.category || 'Uncategorized';
              const name = item.product_name || 'Unknown Item';

              categoryMap[category] = (categoryMap[category] || 0) + itemRevenue;

              if (!productMap[name]) {
                productMap[name] = { name, quantity: 0, revenue: 0 };
              }
              productMap[name].quantity += Number(item.quantity || 0);
              productMap[name].revenue += itemRevenue;
            });
          });

          const categoryNames = Object.keys(categoryMap).sort((a, b) => categoryMap[b] - categoryMap[a]);
          setRevenueByCategory({
            labels: categoryNames.length > 0 ? categoryNames : ['No Data'],
            datasets: [{
              label: `Revenue by Category (${currency})`,
              data: categoryNames.length > 0 ? categoryNames.map(c => categoryMap[c]) : [0],
              backgroundColor: [
                '#0891b2', // cyan-600
                '#22d3ee', // cyan-400
                '#0e7490', // cyan-700
                '#3b82f6', // blue-500
                '#60a5fa', // blue-400
                '#1d4ed8', // blue-700
                '#06b6d4', // cyan-500
                '#1e40af'  // blue-800
              ],
              borderColor: '#fff',
              borderWidth: 2
            }]
          });

          // Use already computed productMap for top/low products
          const sortedProds = Object.values(productMap).sort((a, b) => b.revenue - a.revenue);

          setTopProducts(sortedProds.slice(0, 5).map(p => ({
            ...p,
            revenue: convertAmount ? convertAmount(p.revenue) : p.revenue
          })));

          setLowProducts(sortedProds.slice(-5).reverse().map(p => ({
            ...p,
            revenue: convertAmount ? convertAmount(p.revenue) : p.revenue
          })));

          // Service Speed Trend (Last 7 days or based on timeframe)
          const serviceTimeMap = {};
          servedOrders.forEach(order => {
            const date = new Date(order.created_at);
            const dateKey = timeframe === 'year'
              ? date.toLocaleString('en-US', { month: 'short', year: '2-digit' })
              : date.toLocaleDateString();

            const diff = new Date(order.served_at) - new Date(order.created_at);
            const minutes = diff / 1000 / 60;

            if (!serviceTimeMap[dateKey]) {
              serviceTimeMap[dateKey] = { totalMinutes: 0, count: 0 };
            }
            serviceTimeMap[dateKey].totalMinutes += minutes;
            serviceTimeMap[dateKey].count += 1;
          });

          const sortedServiceDates = Object.keys(serviceTimeMap).sort();
          const serviceChartData = sortedServiceDates.slice(-daysToShow).map(d =>
            (serviceTimeMap[d].totalMinutes / serviceTimeMap[d].count).toFixed(1)
          );

          setServiceTimeData({
            labels: sortedServiceDates.slice(-daysToShow),
            datasets: [{
              label: 'Avg Service Time (mins)',
              data: serviceChartData,
              borderColor: '#f59e0b',
              backgroundColor: 'rgba(245, 158, 11, 0.15)',
              borderWidth: 2,
              fill: true,
              tension: 0.4,
              pointButtonStyle: 'circle'
            }]
          });

          // Order Peak Times (Hourly distribution 0-23)
          const hourMap = new Array(24).fill(0);
          filteredOrders.forEach(order => {
            const hour = new Date(order.created_at).getHours();
            hourMap[hour]++;
          });

          setPeakTimeData({
            labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
            datasets: [{
              label: 'Orders',
              data: hourMap,
              backgroundColor: '#0ea5e9',
              borderRadius: 4,
              hoverBackgroundColor: '#0284c7'
            }]
          });

          // Profit & Margin Analysis (Cost vs Revenue)
          const profitMap = {};
          filteredOrders.forEach(order => {
            const date = new Date(order.created_at);
            const dateKey = timeframe === 'year'
              ? date.toLocaleString('en-US', { month: 'short', year: '2-digit' })
              : date.toLocaleDateString();

            if (!profitMap[dateKey]) {
              profitMap[dateKey] = { revenue: 0, cost: 0 };
            }
            profitMap[dateKey].revenue += getOrderRevenue(order);

            if (order.items && Array.isArray(order.items)) {
              order.items.forEach(item => {
                const itemCost = (parseFloat(item.cost) || 0) * (item.quantity || 1);
                profitMap[dateKey].cost += itemCost;
              });
            }
          });

          const sortedProfitDates = Object.keys(profitMap).sort();
          setProfitData({
            labels: sortedProfitDates.slice(-daysToShow),
            datasets: [
              {
                label: `Revenue (${currency})`,
                data: sortedProfitDates.slice(-daysToShow).map(d => convertAmount(profitMap[d].revenue)),
                borderColor: '#0891b2',
                backgroundColor: 'rgba(8, 145, 178, 0.1)',
                borderWidth: 3,
                tension: 0.4,
                fill: true,
                pointBackgroundColor: '#0891b2',
                pointRadius: 4,
                pointHoverRadius: 6
              },
              {
                label: `Cost (${currency})`,
                data: sortedProfitDates.slice(-daysToShow).map(d => convertAmount(profitMap[d].cost)),
                borderColor: '#ef4444',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                borderWidth: 3,
                tension: 0.4,
                fill: true,
                pointBackgroundColor: '#ef4444',
                pointRadius: 4,
                pointHoverRadius: 6
              }
            ]
          });
        }
        setLoading(false);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setLoading(false);
      }
    };

    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, [timeframe, currency]);

  return (
    <div className="bg-gray-100 min-h-screen pt-4 pb-20">
      <div className="max-w-7xl mx-auto px-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
            <div className="w-16 h-16 border-4 border-cyan-200 border-t-cyan-600 rounded-full animate-spin"></div>
            <p className="text-gray-500 font-bold animate-pulse">Initializing Lumina Engine...</p>
          </div>
        ) : (
          <>
            {/* Header with Controls */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">📊 Business Dashboard</h1>
                <p className="text-gray-600">Real-time sales metrics, analytics & business intelligence</p>
              </div>
            </div>

            {/* Timeframe Selector */}
            <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-1 scrollbar-hide whitespace-nowrap">
              {['today', 'week', 'month', 'year'].map(tf => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={`px-4 py-2.5 rounded-lg font-semibold transition-all inline-block ${timeframe === tf
                    ? 'bg-gradient-to-r from-cyan-600 to-cyan-700 text-white shadow-lg transform scale-105'
                    : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-cyan-600 hover:text-cyan-600'
                    }`}
                >
                  {tf === 'today' ? '🕒 Today' : tf === 'week' ? '📅 Week' : tf === 'month' ? '📆 Month' : '📊 Year'}
                </button>
              ))}
            </div>
            {/* Key Metrics - Professional Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
              <div className="bg-gray-100 rounded-xl p-6 border border-gray-300">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-gray-600 text-sm font-bold uppercase tracking-wide">Total Sales</p>
                  <span className="text-2xl">💰</span>
                </div>
                <h3 className="text-3xl font-bold text-gray-900 mb-2">{formatCurrency(metrics?.totalRevenue || 0)}</h3>
                <p className="text-cyan-600 text-sm font-semibold">📈 Period Total</p>
              </div>

              <div className="bg-gray-100 rounded-xl p-6 border border-gray-300">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-gray-600 text-sm font-bold uppercase tracking-wide">Transactions</p>
                  <span className="text-2xl">📦</span>
                </div>
                <h3 className="text-3xl font-bold text-gray-900 mb-2">{metrics?.totalOrders || 0}</h3>
                <p className="text-blue-600 text-sm font-semibold">📊 Total Orders</p>
              </div>

              <div className="bg-gray-100 rounded-xl p-6 border border-gray-300">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-gray-600 text-sm font-bold uppercase tracking-wide">Avg Order Value</p>
                  <span className="text-2xl">💵</span>
                </div>
                <h3 className="text-3xl font-bold text-gray-900 mb-2">{formatCurrency(metrics?.avgOrderValue || 0)}</h3>
                <p className="text-purple-600 text-sm font-semibold">💳 Per Transaction</p>
              </div>

              <div className="bg-gray-100 rounded-xl p-6 border border-gray-300">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-gray-600 text-sm font-bold uppercase tracking-wide">Avg Items/Order</p>
                  <span className="text-2xl">🛒</span>
                </div>
                <h3 className="text-3xl font-bold text-gray-900 mb-2">{metrics?.avgOrderSize || 0}</h3>
                <p className="text-orange-600 text-sm font-semibold">📍 Items per Sale</p>
              </div>
            </div>

            {/* Professional Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {/* Sales Trend Chart */}
              <div className="lg:col-span-2 bg-gray-100 rounded-xl p-8 border border-gray-300">
                <h3 className="text-xl font-bold text-gray-900 mb-1">📈 Sales Trend</h3>
                <p className="text-cyan-600 text-sm font-bold mb-1">🚀 Are we growing?</p>
                <p className="text-gray-500 text-xs mb-6">Daily revenue analysis over time ({currency})</p>
                {salesData && <Line data={salesData} options={{
                  responsive: true,
                  maintainAspectRatio: true,
                  interaction: { mode: 'index', intersect: false },
                  plugins: {
                    filler: { propagate: true },
                    legend: {
                      labels: {
                        font: { size: 13, weight: 'bold' },
                        padding: 15,
                        usePointStyle: true
                      }
                    },
                    tooltip: {
                      backgroundColor: 'rgba(0, 0, 0, 0.8)',
                      padding: 12,
                      titleFont: { size: 14, weight: 'bold' },
                      bodyFont: { size: 13 },
                      cornerRadius: 8,
                      callbacks: {
                        label: (ctx) => `Revenue: ${currency === 'PHP' ? '₱' : '$'}${ctx.parsed.y.toLocaleString()}`
                      }
                    }
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      grid: { color: 'rgba(0, 0, 0, 0.05)' },
                      ticks: {
                        callback: v => (currency === 'PHP' ? '₱' : '$') + v.toLocaleString()
                      }
                    },
                    x: {
                      grid: { display: false }
                    }
                  }
                }} />}
              </div>

              {/* Revenue by Category Doughnut */}
              <div className="bg-gray-100 rounded-xl p-8 border border-gray-300">
                <h3 className="text-xl font-bold text-gray-900 mb-1">🎯 Revenue by Category</h3>
                <p className="text-blue-600 text-sm font-bold mb-1">📊 What's driving sales?</p>
                <p className="text-gray-500 text-xs mb-6">Category breakdown of total revenue</p>
                {revenueByCategory && <Doughnut data={revenueByCategory} options={{
                  responsive: true,
                  maintainAspectRatio: true,
                  plugins: {
                    legend: {
                      position: 'bottom',
                      labels: {
                        font: { size: 12, weight: 'bold' },
                        padding: 15,
                        usePointStyle: true
                      }
                    },
                    tooltip: {
                      backgroundColor: 'rgba(0, 0, 0, 0.8)',
                      padding: 12,
                      titleFont: { size: 13, weight: 'bold' },
                      bodyFont: { size: 12 },
                      cornerRadius: 8,
                      callbacks: {
                        label: (ctx) => `${ctx.label}: ${currency === 'PHP' ? '₱' : '$'}${ctx.parsed.toLocaleString()}`
                      }
                    }
                  }
                }} />}
              </div>
            </div>

            {/* Profit Analysis Chart */}
            <div className="mt-8 bg-gray-100 rounded-xl p-8 border border-gray-300">
              <h3 className="text-xl font-bold text-gray-900 mb-1">📑 Profit & Margin Analysis</h3>
              <p className="text-emerald-600 text-sm font-bold mb-1">💰 Are we making money?</p>
              <p className="text-gray-500 text-xs mb-6">Comparative Revenue vs Cost Analysis ({currency})</p>
              <div className="h-80">
                {profitData && <Line data={profitData} options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  interaction: { mode: 'index', intersect: false },
                  plugins: {
                    legend: { position: 'top', labels: { usePointStyle: true, font: { weight: 'bold' } } },
                    tooltip: {
                      callbacks: {
                        label: (ctx) => `${ctx.dataset.label}: ${currency === 'PHP' ? '₱' : '$'}${ctx.parsed.y.toLocaleString()}`
                      }
                    }
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      grid: { color: 'rgba(0, 0, 0, 0.05)' },
                      ticks: { callback: v => (currency === 'PHP' ? '₱' : '$') + v.toLocaleString() }
                    },
                    x: { grid: { display: false } }
                  }
                }} />}
              </div>
            </div>

            {/* Charts Row 2: Service Speed & Peak Times */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
              {/* Service Speed Chart */}
              <div className="bg-gray-100 rounded-xl p-8 border border-gray-300">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-1">⏱️ Service Speed Trend</h3>
                    <p className="text-orange-600 text-sm font-bold mb-1">⚡ How fast are we?</p>
                    <p className="text-gray-500 text-xs">Average minutes from order to served</p>
                  </div>
                  <div className={`px-4 py-1 rounded-full text-xs font-bold ${metrics?.avgServiceTime > 15 ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`}>
                    AVG: {metrics?.avgServiceTime || 0}m
                  </div>
                </div>
                <div className="h-64 mt-4">
                  {serviceTimeData && <Line data={serviceTimeData} options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { display: false },
                      tooltip: {
                        callbacks: {
                          label: (ctx) => `Avg Time: ${ctx.parsed.y} mins`
                        }
                      }
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        title: { display: true, text: 'Minutes' }
                      },
                      x: { grid: { display: false } }
                    }
                  }} />}
                </div>
              </div>

              {/* Peak Times Bar Chart */}
              <div className="bg-gray-100 rounded-xl p-8 border border-gray-300">
                <h3 className="text-xl font-bold text-gray-900 mb-1">🔥 Order Peak Times</h3>
                <p className="text-blue-600 text-sm font-bold mb-1">🕒 When is the rush?</p>
                <p className="text-gray-500 text-xs mb-6">Hourly order distribution (24h period)</p>
                <div className="h-64">
                  {peakTimeData && <Bar data={peakTimeData} options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { display: false },
                      tooltip: {
                        callbacks: {
                          label: (ctx) => `Orders: ${ctx.parsed.y}`
                        }
                      }
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        ticks: { precision: 0 },
                        title: { display: true, text: 'Total Orders' }
                      },
                      x: { grid: { display: false } }
                    }
                  }} />}
                </div>
              </div>
            </div>

            {/* Customer Insights Row */}
            <div className="mt-8 bg-gray-100 rounded-xl p-8 border border-gray-300">
              <div className="mb-6">
                <h3 className="text-xl font-bold text-gray-900 mb-1">👥 Customer Insights</h3>
                <p className="text-purple-600 text-sm font-bold mb-1">🔍 Who are we serving?</p>
                <p className="text-gray-500 text-xs text-xs mb-6">Audience acquisition & loyalty metrics</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Acquisition Card */}
                <div className="p-6 rounded-xl bg-gray-100 border border-gray-300">
                  <p className="text-[10px] font-bold text-purple-600 uppercase tracking-widest mb-4">Acquisition</p>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-3xl font-black text-gray-900">{customerMetrics?.newCustomers || 0}</p>
                      <p className="text-xs text-gray-500 font-bold">New Customers</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-purple-600">{customerMetrics?.returningCustomers || 0}</p>
                      <p className="text-[10px] text-gray-500 font-bold uppercase">Returning</p>
                    </div>
                  </div>
                  <div className="mt-4 w-full bg-gray-200 rounded-full h-1.5 flex overflow-hidden">
                    <div className="bg-purple-600 h-full" style={{ width: `${(customerMetrics?.newCustomers / ((customerMetrics?.newCustomers + customerMetrics?.returningCustomers) || 1)) * 100}%` }}></div>
                    <div className="bg-purple-300 h-full flex-1"></div>
                  </div>
                </div>

                {/* CAC Card */}
                <div className="p-6 rounded-xl bg-gray-100 border border-gray-300">
                  <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-4">Unit Acquisition Proxy (CAC)</p>
                  <p className="text-3xl font-black text-gray-900">{formatCurrency(customerMetrics?.cac || 0)}</p>
                  <p className="text-xs text-gray-500 font-bold mt-1">Discount cost per new user</p>
                  <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-blue-600">
                    <span>🎯 Target: {currency === 'PHP' ? '₱' : '$'}0.00</span>
                  </div>
                </div>

                {/* LTV Card */}
                <div className="p-6 rounded-xl bg-gray-100 border border-gray-300">
                  <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-4">Lifetime Value (LTV)</p>
                  <p className="text-3xl font-black text-gray-900">{formatCurrency(customerMetrics?.ltv || 0)}</p>
                  <p className="text-xs text-gray-500 font-bold mt-1">Avg. spend per customer</p>
                  <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-emerald-600">
                    <span className="animate-pulse">💎 High Value Audience</span>
                  </div>
                </div>

                {/* Retention Card */}
                <div className="p-6 rounded-xl bg-gray-100 border border-gray-300">
                  <p className="text-[10px] font-bold text-orange-600 uppercase tracking-widest mb-4">Retention Rate</p>
                  <p className="text-3xl font-black text-gray-900">{customerMetrics?.retention || 0}%</p>
                  <p className="text-xs text-gray-500 font-bold mt-1">Returning base percentage</p>
                  <div className="mt-4 w-full bg-orange-100 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-orange-500 h-full" style={{ width: `${customerMetrics?.retention || 0}%` }}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Product Performance Section */}
            <div className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Products */}
              <div className="bg-gray-100 rounded-xl p-8 border border-gray-300">
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-1">🏆 Top Performing Products</h3>
                  <p className="text-cyan-600 text-sm font-bold">🌟 Our Best Sellers</p>
                </div>
                {topProducts.length > 0 ? (
                  <div className="space-y-4">
                    {topProducts.map((prod, idx) => (
                      <div key={idx} className="p-4 bg-gray-100 rounded-lg border border-gray-300">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <div className="text-sm font-bold text-gray-600">#{idx + 1}</div>
                            <p className="font-bold text-gray-900 text-lg">{prod.name}</p>
                            <p className="text-sm text-gray-600">{prod.quantity} units sold</p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-cyan-600">{formatCurrency(prod.revenue)}</p>
                          </div>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-cyan-500 to-cyan-600 h-2.5 rounded-full"
                            style={{
                              width: `${(prod.revenue / (topProducts[0]?.revenue || 1)) * 100}%`
                            }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600 text-center py-8 bg-gray-50 rounded-lg">📊 No sales data available</p>
                )}
              </div>

              {/* Low Performing Products */}
              <div className="bg-gray-100 rounded-xl p-8 border border-gray-300">
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-1">⚠️ Low Performing Products</h3>
                  <p className="text-orange-600 text-sm font-bold">📉 Items needing attention</p>
                </div>
                {lowProducts.length > 0 ? (
                  <div className="space-y-4">
                    {lowProducts.map((prod, idx) => (
                      <div key={idx} className="p-4 bg-gray-100 rounded-lg border border-gray-300">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <div className="text-sm font-bold text-gray-600 text-orange-600">Bottom #{lowProducts.length - idx}</div>
                            <p className="font-bold text-gray-900 text-lg">{prod.name}</p>
                            <p className="text-sm text-gray-600">{prod.quantity} units sold</p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-gray-400">{formatCurrency(prod.revenue)}</p>
                          </div>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-orange-400 to-orange-500 h-2.5 rounded-full"
                            style={{
                              width: `${(prod.revenue / (topProducts[0]?.revenue || 1)) * 100}%`
                            }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600 text-center py-8 bg-gray-50 rounded-lg">✅ All items performing well or no data</p>
                )}
              </div>
            </div>

            {/* Smart Recommendations - Moved to full width */}
            <div className="mt-8 bg-gray-100 rounded-xl p-8 border border-gray-300">
              <h3 className="text-xl font-bold text-gray-900 mb-2">💡 Smart Recommendations</h3>
              <p className="text-gray-600 text-sm mb-6">AI-powered business insights</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 bg-gray-100 rounded-lg border border-gray-300">
                  <p className="font-bold text-gray-900">✅ Inventory Alert</p>
                  <p className="text-sm text-gray-600 mt-1">{lowProducts.length > 0 ? `⚠️ Consider reviewing "${lowProducts[0].name}" menu placement.` : '📊 All items healthy.'}</p>
                </div>
                <div className="p-4 bg-gray-100 rounded-lg border border-gray-300">
                  <p className="font-bold text-gray-900">✅ Best Seller Insight</p>
                  <p className="text-sm text-gray-600 mt-1">{topProducts.length > 0 ? `📍 "${topProducts[0].name}" is your primary engine.` : '📊 Data updates real-time.'}</p>
                </div>
                <div className="p-4 bg-gray-100 rounded-lg border border-gray-300">
                  <p className="font-bold text-gray-900">✅ Premium Upsell</p>
                  <p className="text-sm text-gray-600 mt-1">{metrics?.avgOrderValue > 50 ? '🚀 High AOV - Introduce premium bundles' : '📈 Focus on add-on suggestions'}</p>
                </div>
                <div className="p-4 bg-gray-100 rounded-lg border border-gray-300">
                  <p className="font-bold text-gray-900">✅ Operation Speed</p>
                  <p className="text-sm text-gray-600 mt-1">{metrics?.avgServiceTime < 15 ? '✨ Excellent service speed!' : '⚠️ Kitchen prep optimization recommended'}</p>
                </div>
              </div>
            </div>


            {/* Business Intelligence Insights */}
            <div className="mt-8 bg-gray-100 rounded-xl p-8 border border-gray-300">
              <h3 className="text-xl font-bold text-gray-900 mb-6">📊 Business Intelligence Insights</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-gray-100 rounded-lg p-6 border border-gray-300">
                  <p className="font-bold text-gray-900 mb-4 text-lg">📈 Performance Metrics</p>
                  <ul className="space-y-3 text-sm text-gray-700">
                    <li className="flex items-center gap-2">
                      <span className="text-cyan-600 font-bold">•</span>
                      <span>Avg transaction: <strong>{formatCurrency(metrics?.avgOrderValue || 0)}</strong></span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-cyan-600 font-bold">•</span>
                      <span>Items per order: <strong>{metrics?.avgOrderSize} items</strong></span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-cyan-600 font-bold">•</span>
                      <span>Total period sales: <strong>{metrics?.totalOrders} orders</strong></span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-cyan-600 font-bold">•</span>
                      <span>Total Sales: <strong>{formatCurrency(metrics?.totalRevenue || 0)}</strong></span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-cyan-600 font-bold">•</span>
                      <span>Avg Service Time: <strong className={metrics?.avgServiceTime > 15 ? 'text-orange-500' : 'text-green-600'}>{metrics?.avgServiceTime || '0'} mins</strong></span>
                    </li>
                  </ul>
                </div>
                <div className="bg-gray-100 rounded-lg p-6 border border-gray-300">
                  <p className="font-bold text-gray-900 mb-4 text-lg">🎯 Actionable Insights</p>
                  <ul className="space-y-3 text-sm text-gray-700">
                    <li className="flex items-center gap-2">
                      <span className="text-indigo-600 font-bold">→</span>
                      <span>{topProducts.length > 0 ? `Focus marketing on: "${topProducts[0].name}"` : 'Analyze top performers'}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-indigo-600 font-bold">→</span>
                      <span>{revenueByCategory?.labels?.length ? 'Balance inventory across categories' : 'Build sales baseline'}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-indigo-600 font-bold">→</span>
                      <span>Review pricing based on demand patterns</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-indigo-600 font-bold">→</span>
                      <span>Monitor seasonal trends and adjust inventory</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Home Page
function HomePage({ setCurrentPage, menuData, isLoading }) {
  const [activeTab, setActiveTab] = useState('features');

  return (
    <div className="bg-white">
      {/* Dynamic Hero Section */}
      <section className="relative min-h-[90vh] flex items-center pt-20 overflow-hidden bg-[#0A0F0D]">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 z-0">
          <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-cyan-600/20 rounded-full blur-[120px] animate-pulse"></div>
          <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-cyan-600/10 rounded-full blur-[100px]"></div>
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
        </div>

        <div className="w-full px-4 md:px-12 relative z-10">
          <div className="max-w-6xl">
            <div className="inline-flex items-center space-x-2 bg-white/5 backdrop-blur-sm border border-white/10 px-4 py-2 rounded-full mb-8 animate-bounce">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
              </span>
              <span className="text-white font-bold text-[10px] tracking-widest uppercase">Platform v2.0 Now Live</span>
            </div>

            <h1 className="text-6xl md:text-8xl lg:text-9xl font-black text-white mb-8 leading-[0.9] tracking-tighter uppercase">
              SMARTER <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">POS</span><br />
              ALL BUSINESS
            </h1>

            <p className="text-xl md:text-3xl text-gray-400 font-medium mb-12 max-w-3xl leading-snug">
              From retail boutiques to modern cafes, <span className="text-white font-bold">Lumina</span> powers the next generation of SMEs with cloud-native intelligence.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-6">
              <button
                onClick={() => setCurrentPage('company-register')}
                className="w-full sm:w-auto bg-cyan-600 text-white px-10 py-6 rounded-2xl font-black text-xl hover:bg-cyan-500 transition-all shadow-[0_0_40px_rgba(6,182,212,0.3)] hover:shadow-[0_0_60px_rgba(6,182,212,0.5)] flex items-center justify-center space-x-4 group active:scale-95"
              >
                <span>CREATE YOUR STORE</span>
                <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={() => setCurrentPage('dashboard')}
                className="w-full sm:w-auto bg-white/5 backdrop-blur-md border-2 border-white/10 text-white px-10 py-6 rounded-2xl font-black text-xl hover:bg-white/10 transition-all flex items-center justify-center space-x-3 group active:scale-95"
              >
                <span>DEMO 14 DAYS</span>
              </button>
            </div>

            <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8 border-t border-white/10 pt-12">
              {[
                { val: "10K+", label: "ACTIVE MERCHANTS" },
                { val: "99.9%", label: "UPTIME GUARANTEE" },
                { val: "24/7", label: "GLOBAL SUPPORT" },
                { val: "PRO", label: "ENTERPRISE READY" }
              ].map((stat, i) => (
                <div key={i}>
                  <p className="text-3xl font-black text-white">{stat.val}</p>
                  <p className="text-gray-500 text-[10px] font-bold tracking-widest uppercase">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof Ribbon */}
      <section className="py-12 bg-white border-y border-gray-100 overflow-hidden">
        <div className="w-full px-6">
          <p className="text-center text-[10px] font-black text-gray-400 uppercase tracking-[0.4em] mb-10">POWERING THE NEXT GENERATION OF COMMERCE</p>
          <div className="flex flex-wrap justify-center items-center gap-10 md:gap-20 opacity-30 grayscale hover:opacity-100 hover:grayscale-0 transition-all duration-700">
            <div className="flex items-center space-x-2"><Layout className="w-5 h-5 text-gray-900" /><span className="font-black text-lg tracking-tighter uppercase text-gray-900">RETRO-FIT</span></div>
            <div className="flex items-center space-x-2"><Zap className="w-5 h-5 text-cyan-600" /><span className="font-black text-lg tracking-tighter uppercase text-gray-900">NEO-CAFE</span></div>
            <div className="flex items-center space-x-2"><Shield className="w-5 h-5 text-emerald-600" /><span className="font-black text-lg tracking-tighter uppercase text-gray-900">SAFE-STORE</span></div>
            <div className="flex items-center space-x-2"><Box className="w-5 h-5 text-blue-600" /><span className="font-black text-lg tracking-tighter uppercase text-gray-900">ULTRA-RETAIL</span></div>
            <div className="flex items-center space-x-2"><Activity className="w-5 h-5 text-purple-600" /><span className="font-black text-lg tracking-tighter uppercase text-gray-900">CORE-HUB</span></div>
          </div>
        </div>
      </section>

      {/* System Walkthrough: The Lumina Engine */}
      <section className="py-32 bg-white relative">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="flex flex-col md:flex-row items-end justify-between mb-20 gap-8">
            <div className="max-w-2xl">
              <span className="text-cyan-600 font-black text-[10px] tracking-[0.5em] uppercase border-b-2 border-cyan-600 pb-2 mb-8 inline-block">The Lumina Engine</span>
              <h2 className="text-5xl md:text-8xl font-black text-gray-900 leading-none tracking-tighter uppercase">
                COMPLETE <span className="text-gray-300">ECOSYSTEM</span>
              </h2>
            </div>
            <p className="text-gray-500 font-bold text-lg max-w-sm border-l-4 border-cyan-500 pl-6">
              A unified platform designed for complex operations. From the front counter to the back office, we've got you covered.
            </p>
          </div>

          <div className="space-y-40">
            {/* Module 1: Omni-Channel POS */}
            <div className="flex flex-col lg:flex-row items-center gap-16 md:gap-24 group">
              <div className="lg:w-1/2 order-2 lg:order-1">
                <div className="inline-block px-4 py-1 bg-cyan-100 text-cyan-700 rounded-full text-[10px] font-black tracking-widest uppercase mb-6">Front-of-House</div>
                <h3 className="text-4xl md:text-5xl font-black text-gray-900 mb-6 uppercase tracking-tighter">Unified <span className="text-cyan-600">POS Terminal</span></h3>
                <p className="text-gray-600 text-lg font-medium leading-relaxed mb-10">
                  Our Point-of-Sale is designed for speed and beauty. Whether it's a quick-service cafe or a detailed retail boutique, custom variants and fast-checkout flows ensure your customers never wait.
                  <span className="block mt-4 text-cyan-600 font-black tracking-tight">Includes: Multi-Tax, Loyalty Rewards, Table Management, & Split Bills.</span>
                </p>
                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                    <p className="text-cyan-600 font-black text-xs mb-1 uppercase">Variants</p>
                    <p className="text-gray-400 text-[10px] font-bold">Handle sizes and add-ons effortlessly.</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                    <p className="text-cyan-600 font-black text-xs mb-1 uppercase">Inventory Sync</p>
                    <p className="text-gray-400 text-[10px] font-bold">Stock updates the moment you pay.</p>
                  </div>
                </div>
              </div>
              <div className="lg:w-1/2 order-1 lg:order-2 relative">
                <div className="absolute -inset-4 bg-cyan-600/5 rounded-[3rem] blur-2xl group-hover:bg-cyan-600/10 transition-colors"></div>
                <img src="https://ncompzjefmmdiznhbjjc.supabase.co/storage/v1/object/public/product-images/pos_interface_screenshot_1775480696556.png" alt="POS Screenshot" className="relative rounded-[2.5rem] shadow-2xl border-8 border-white group-hover:scale-[1.02] transition-transform duration-700" />
              </div>
            </div>

            {/* Module 2: Kitchen Display System (KDS) */}
            <div className="flex flex-col lg:flex-row items-center gap-16 md:gap-24 group">
              <div className="lg:w-1/2 relative">
                <div className="absolute -inset-4 bg-orange-600/5 rounded-[3rem] blur-2xl group-hover:bg-orange-600/10 transition-colors"></div>
                <img src="https://ncompzjefmmdiznhbjjc.supabase.co/storage/v1/object/public/product-images/kds_interface_screenshot_1775480719291.png" alt="KDS Screenshot" className="relative rounded-[2.5rem] shadow-2xl border-8 border-white group-hover:scale-[1.02] transition-transform duration-700" />
              </div>
              <div className="lg:w-1/2">
                <div className="inline-block px-4 py-1 bg-orange-100 text-orange-700 rounded-full text-[10px] font-black tracking-widest uppercase mb-6">Back-of-House</div>
                <h3 className="text-4xl md:text-5xl font-black text-gray-900 mb-6 uppercase tracking-tighter">Kitchen <span className="text-orange-600">Command Center</span></h3>
                <p className="text-gray-600 text-lg font-medium leading-relaxed mb-10">
                  Kill the chaos in the kitchen. Our KDS provides real-time order tracking, status management, and performance metrics (Average Prep Time) to keep your staff synchronized and efficient.
                  <span className="block mt-4 text-orange-600 font-black tracking-tight">Includes: Ticket Timers, Sound Alerts, Order Prioritization & Status Sync.</span>
                </p>
                <div className="flex gap-4">
                  <div className="px-6 py-4 bg-orange-50 rounded-2xl border border-orange-100 text-center flex-1">
                    <Clock className="w-6 h-6 text-orange-600 mx-auto mb-2" />
                    <p className="text-[10px] font-black text-orange-800 uppercase">Live Timers</p>
                  </div>
                  <div className="px-6 py-4 bg-orange-50 rounded-2xl border border-orange-100 text-center flex-1">
                    <Activity className="w-6 h-6 text-orange-600 mx-auto mb-2" />
                    <p className="text-[10px] font-black text-orange-800 uppercase">Load Metrics</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Module 3: Analytics & Intelligence */}
            <div className="flex flex-col lg:flex-row items-center gap-16 md:gap-24 group">
              <div className="lg:w-1/2 order-2 lg:order-1">
                <div className="inline-block px-4 py-1 bg-blue-100 text-blue-700 rounded-full text-[10px] font-black tracking-widest uppercase mb-6">Management</div>
                <h3 className="text-4xl md:text-5xl font-black text-gray-900 mb-6 uppercase tracking-tighter">Enterprise <span className="text-blue-600">Analytics</span></h3>
                <p className="text-gray-600 text-lg font-medium leading-relaxed mb-10">
                  Make decisions based on data, not guesses. Monitor daily sales, bestselling categories, and customer demographics across all branches on one unified dashboard.
                  <span className="block mt-4 text-blue-600 font-black tracking-tight">Includes: Weighted Average Cost (WAC), Tax Reports, Daily Snapshots, & Net Growth.</span>
                </p>
                <ul className="space-y-3">
                  {['Sales by Category Matrix', 'Multi-Store Comparison', 'Transaction Trends', 'Payment Method Distribution'].map(r => (
                    <li key={r} className="flex items-center space-x-3 text-sm font-bold text-gray-500">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="lg:w-1/2 order-1 lg:order-2 relative">
                <div className="absolute -inset-4 bg-blue-600/5 rounded-[3rem] blur-2xl group-hover:bg-blue-600/10 transition-colors"></div>
                <img src="https://ncompzjefmmdiznhbjjc.supabase.co/storage/v1/object/public/product-images/reports_analytics_screenshot_1775480741822.png" alt="Analytics Screenshot" className="relative rounded-[2.5rem] shadow-2xl border-8 border-white group-hover:scale-[1.02] transition-transform duration-700" />
              </div>
            </div>

            {/* Module 4: Advanced Inventory */}
            <div className="flex flex-col lg:flex-row items-center gap-16 md:gap-24 group">
              <div className="lg:w-1/2 relative">
                <div className="absolute -inset-4 bg-purple-600/5 rounded-[3rem] blur-2xl group-hover:bg-purple-600/10 transition-colors"></div>
                <img src="https://ncompzjefmmdiznhbjjc.supabase.co/storage/v1/object/public/product-images/inventory_management_screenshot_1775481143562.png" alt="Inventory Screenshot" className="relative rounded-[2.5rem] shadow-2xl border-8 border-white group-hover:scale-[1.02] transition-transform duration-700" />
              </div>
              <div className="lg:w-1/2">
                <div className="inline-block px-4 py-1 bg-purple-100 text-purple-700 rounded-full text-[10px] font-black tracking-widest uppercase mb-6">Logistics</div>
                <h3 className="text-4xl md:text-5xl font-black text-gray-900 mb-6 uppercase tracking-tighter">Precision <span className="text-purple-600">Inventory</span></h3>
                <p className="text-gray-600 text-lg font-medium leading-relaxed mb-10">
                  Total visibility of your supply chain. Monitor raw materials, set automatic reorder levels, and track batch-level expiry dates to eliminate waste and maximize profit.
                  <span className="block mt-4 text-purple-600 font-black tracking-tight">Includes: Expiry Alerts, Automated Reorder, Recipe Management, & Waste Tracking.</span>
                </p>
                <div className="flex items-center gap-8">
                  <div className="text-center">
                    <p className="text-3xl font-black text-gray-900">100%</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Audit Accuracy</p>
                  </div>
                  <div className="w-px h-12 bg-gray-200"></div>
                  <div className="text-center">
                    <p className="text-3xl font-black text-purple-600">-30%</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Waste Reduction</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Modern SME Features & Pricing Block */}
      <section id="pricing" className="py-32 bg-gray-50 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
          <div className="text-center mb-24">
            <h2 className="text-5xl md:text-7xl font-black text-gray-900 uppercase tracking-tighter mb-6">ONE ENGINE. <span className="text-cyan-600">ALL POWER.</span></h2>
            <p className="text-xl text-gray-500 font-bold max-w-2xl mx-auto">Choose the configuration that matches your ambition. From startup to enterprise dominance.</p>
          </div>

          <div className="space-y-16">
            {/* TOP: Pricing Cards (3 Cards) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Starter Plan */}
              <div className="bg-white border-2 border-gray-100 p-10 rounded-[3rem] hover:border-cyan-500 transition-all group relative overflow-hidden flex flex-col">
                <div className="mb-10">
                  <span className="bg-gray-100 text-gray-800 px-4 py-2 rounded-full text-[10px] font-black tracking-widest uppercase">Starter</span>
                  <h3 className="text-6xl font-black text-gray-900 mt-6">$50<span className="text-xl text-gray-400">/mo</span></h3>
                  <p className="text-gray-500 font-bold mt-4">Perfect for boutiques & startups</p>
                </div>
                <ul className="space-y-4 mb-10 flex-1">
                  {['1 Location', 'Up to 5 Users', 'Basic Analytics', 'Mobile App Access'].map((feat, i) => (
                    <li key={i} className="flex items-center space-x-3 text-gray-600 font-bold">
                      <div className="w-5 h-5 bg-cyan-100 text-cyan-600 rounded-full flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3" />
                      </div>
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => setCurrentPage('company-register')}
                  className="w-full bg-gray-900 text-white py-5 rounded-2xl font-black hover:bg-cyan-600 transition-all uppercase tracking-widest text-sm"
                >
                  START FREE TRIAL
                </button>
              </div>

              {/* Pro Plan */}
              <div className="bg-cyan-600 p-10 rounded-[3rem] shadow-[0_30px_60px_rgba(6,182,212,0.3)] relative overflow-hidden group flex flex-col">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                <div className="mb-10">
                  <span className="bg-white/20 text-white px-4 py-2 rounded-full text-[10px] font-black tracking-widest uppercase">Professional</span>
                  <h3 className="text-6xl font-black text-white mt-6">$100<span className="text-xl text-cyan-200">/mo</span></h3>
                  <p className="text-cyan-100 font-bold mt-4">For growing multi-sector SMEs</p>
                </div>
                <ul className="space-y-4 mb-10 flex-1">
                  {['Unlimited Locations', 'Unlimited Users', 'Advanced Inventory', 'CRM & Loyalty'].map((feat, i) => (
                    <li key={i} className="flex items-center space-x-3 text-white font-bold">
                      <div className="w-5 h-5 bg-white/20 text-white rounded-full flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3" />
                      </div>
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => setCurrentPage('company-register')}
                  className="w-full bg-white text-cyan-600 py-5 rounded-2xl font-black hover:bg-gray-100 transition-all uppercase tracking-widest text-sm shadow-xl"
                >
                  UPGRADE NOW
                </button>
              </div>

              {/* POS Source Code Plan */}
              <div className="bg-gray-900 p-10 rounded-[3rem] border-2 border-gray-800 hover:border-cyan-500 transition-all group relative overflow-hidden flex flex-col">
                <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                <div className="mb-10 text-white">
                  <span className="bg-cyan-500 text-white px-4 py-2 rounded-full text-[10px] font-black tracking-widest uppercase font-black">Full Ownership</span>
                  <h3 className="text-6xl font-black text-white mt-6">$2,000</h3>
                  <p className="text-gray-400 font-bold mt-4">Full POS Source Code Ownership</p>
                </div>
                <ul className="space-y-4 mb-10 flex-1">
                  {['Complete Source Code', 'Self-Hosted Authority', 'White-Label Branding', 'Unlimited Stores', 'Lifetime Updates'].map((feat, i) => (
                    <li key={i} className="flex items-center space-x-3 text-white font-bold">
                      <div className="w-5 h-5 bg-cyan-500/20 text-cyan-400 rounded-full flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3" />
                      </div>
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => setCurrentPage('company-register')}
                  className="w-full bg-cyan-600 text-white py-5 rounded-2xl font-black hover:bg-cyan-500 transition-all uppercase tracking-widest text-sm"
                >
                  BUY SOURCE CODE
                </button>
              </div>
            </div>

            {/* BOTTOM: Feature Cards (3 Cards) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { icon: Zap, title: "Instant Deployment", desc: "Get your store running in under 5 minutes with zero technical overhead.", color: "bg-blue-50 text-blue-600" },
                { icon: Shield, title: "Bank-Grade Security", desc: "Encrypted transactions and secure data storage protecting your business 24/7.", color: "bg-emerald-50 text-cyan-600" },
                { icon: Box, title: "Universal Inventory", desc: "Sync physical and digital stock across all locations in real-time.", color: "bg-purple-50 text-purple-600" }
              ].map((feature, i) => (
                <div key={i} className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 hover:shadow-xl transition-all group hover:-translate-y-1">
                  <div className={`w-14 h-14 ${feature.color} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                    <feature.icon className="w-7 h-7" />
                  </div>
                  <h3 className="text-2xl font-black text-gray-900 mb-3">{feature.title}</h3>
                  <p className="text-gray-500 font-medium leading-relaxed">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Segment */}
      <section className="py-32 bg-white px-6 md:px-12">
        <div className="text-center mb-24">
          <span className="text-cyan-600 font-black text-[10px] tracking-[0.5em] uppercase border-b-2 border-cyan-600 pb-2 mb-8 inline-block">Social Proof</span>
          <h2 className="text-5xl md:text-7xl font-black text-gray-900 uppercase tracking-tighter mt-4">VOICE OF <span className="text-gray-400">SUCCESS</span></h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 max-w-7xl mx-auto">
          {[
            { name: "Sarah Jenkins", role: "Boutique Owner", quote: "Lumina transformed how we track our fashion inventory. The real-time sync across our 3 branches is seamless.", img: "👩‍💼", tags: ["Retail", "Multi-branch"] },
            { name: "Marc Rivera", role: "Salon Manager", quote: "The customer loyalty features in the Pro plan increased our repeat bookings by 40% in just two months.", img: "👨‍🎨", tags: ["Service", "Loyalty"] },
            { name: "Elena Chen", role: "Bakery Chain CEO", quote: "Finally, a POS that understands the complexity of multiple SKUs and wholesale ordering. Worth every penny.", img: "👩‍🍳", tags: ["F&B", "Scale"] }
          ].map((t, i) => (
            <div key={i} className="group relative">
              <div className="absolute inset-0 bg-cyan-600 rounded-[3rem] translate-x-3 translate-y-3 opacity-0 group-hover:opacity-10 transition-all"></div>
              <div className="bg-gray-50 p-12 rounded-[3rem] border border-gray-100 relative z-10 hover:bg-white hover:shadow-2xl transition-all duration-500 flex flex-col h-full">
                <div className="flex justify-between items-start mb-8">
                  <div className="text-5xl grayscale group-hover:grayscale-0 transition-all duration-500">{t.img}</div>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map(s => <Plus key={s} className="w-3 h-3 text-cyan-500" />)}
                  </div>
                </div>
                <p className="text-2xl text-gray-800 italic font-medium leading-relaxed mb-10 flex-1">"{t.quote}"</p>
                <div className="pt-8 border-t border-gray-200">
                  <p className="font-black text-gray-900 uppercase tracking-widest text-sm">{t.name}</p>
                  <p className="text-cyan-600 font-bold text-xs mb-4">{t.role}</p>
                  <div className="flex gap-2">
                    {t.tags.map(tag => (
                      <span key={tag} className="text-[9px] font-black uppercase tracking-widest px-2 py-1 bg-gray-200 text-gray-500 rounded-md">{tag}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Rebranded Visionary Footer */}
      <footer className="bg-[#0A0F0D] pt-32 pb-12 text-white">
        <div className="w-full px-6 md:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-20 mb-32">
            <div className="lg:col-span-5">
              <div className="flex items-center space-x-4 mb-10">
                <img src="assets/images/lumina-logo.png" alt="Lumina Logo" className="w-14 h-14 object-contain drop-shadow-md" />
                <h3 className="text-3xl font-black tracking-tighter uppercase">Lumina <span className="text-cyan-500">POS</span></h3>
              </div>
              <h4 className="text-xl font-bold text-gray-400 mb-6 uppercase tracking-[0.2em]">The Vision</h4>
              <p className="text-2xl text-gray-300 font-medium leading-relaxed mb-10 italic">
                "Our mission is to democratize high-end commerce technology, empowering every SME with the tools to dominate their local and digital markets."
              </p>
              <div className="flex space-x-6">
                {['TW', 'IG', 'FB', 'LI'].map((s, i) => (
                  <a key={i} href="#" className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center hover:bg-cyan-600 transition-all font-black text-xs">{s}</a>
                ))}
              </div>
            </div>

            <div className="lg:col-span-7 grid grid-cols-2 md:grid-cols-3 gap-12">
              <div>
                <h5 className="font-black uppercase tracking-widest text-xs text-gray-500 mb-8">Solution</h5>
                <ul className="space-y-4 text-gray-400 font-bold">
                  <li className="hover:text-white transition-all cursor-pointer">Retail Engine</li>
                  <li className="hover:text-white transition-all cursor-pointer">Restaurant Suite</li>
                  <li className="hover:text-white transition-all cursor-pointer">Service Management</li>
                  <li className="hover:text-white transition-all cursor-pointer">Inventory AI</li>
                </ul>
              </div>
              <div>
                <h5 className="font-black uppercase tracking-widest text-xs text-gray-500 mb-8">Company</h5>
                <ul className="space-y-4 text-gray-400 font-bold">
                  <li className="hover:text-white transition-all cursor-pointer">About Us</li>
                  <li className="hover:text-white transition-all cursor-pointer">Careers</li>
                  <li className="hover:text-white transition-all cursor-pointer">Legal</li>
                  <li className="hover:text-white transition-all cursor-pointer">Contact</li>
                </ul>
              </div>
              <div className="col-span-2 md:col-span-1">
                <h5 className="font-black uppercase tracking-widest text-xs text-gray-500 mb-8">Support</h5>
                <p className="text-gray-400 font-bold text-sm mb-6">Need help scaling your business?</p>
                <button className="w-full bg-white/5 border border-white/10 py-4 rounded-xl font-black text-xs hover:bg-white/10 transition-all">
                  HELP CENTER
                </button>
              </div>
            </div>
          </div>

          <div className="border-t border-white/5 pt-12 flex flex-col md:row justify-between items-center gap-6">
            <p className="text-gray-600 text-[10px] font-black uppercase tracking-[0.3em]">
              © 2026 LUMINA COMMERCE ENGINE. SENIOR DEVELOPER-ROGER TONACAO.ALL RIGHTS RESERVED.
            </p>
            <div className="flex space-x-8">
              <button
                onClick={() => setCurrentPage('dashboard')}
                className="text-gray-500 hover:text-white text-[10px] font-black uppercase tracking-widest transition-all"
              >
                Staff Portal
              </button>
              <button
                onClick={() => setCurrentPage('company-register')}
                className="text-gray-500 hover:text-white text-[10px] font-black uppercase tracking-widest transition-all"
              >
                Register Business
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Popular Item Card
function PopularItemCard({ item }) {
  const { addToCart } = useCart();

  return (
    <div className="bg-gray-50 rounded-xl shadow-lg hover:shadow-2xl transition-all overflow-hidden group w-full h-96 flex flex-col">
      <div className="bg-gray-50 p-4 text-center flex-1 flex flex-col justify-center overflow-hidden">
        {item.image && (item.image.startsWith('http') || item.image.startsWith('assets/') || item.image.startsWith('/')) ? (
          <img src={item.image} alt={item.name} className="object-contain mx-auto rounded-lg h-48 w-48 group-hover:scale-110 transition-transform bg-gray-50" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300 group-hover:scale-110 transition-transform">
            {item.image && item.image.length < 5 ? (
              <span className="text-9xl">{item.image}</span>
            ) : (
              <UtensilsCrossed className="w-32 h-32 opacity-20" />
            )}
          </div>
        )}
      </div>
      <div className="p-6 flex flex-col justify-between h-40">
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-base sm:text-lg md:text-xl font-bold text-cyan-600">{item.name}</h3>
          <span className="bg-cyan-600 text-white px-3 py-1 rounded-full text-xs font-black whitespace-nowrap">POPULAR</span>
        </div>
        <p className="text-gray-600 text-sm sm:text-base mb-3 line-clamp-2 font-normal">{item.description}</p>
        <div className="flex items-center justify-between gap-2">
          {item.sizes ? (
            <span className="text-sm sm:text-base md:text-lg font-semibold text-cyan-600 whitespace-nowrap flex-shrink-0">
              From Php {Math.min(...item.sizes.map(s => s.price)).toFixed(2)}
            </span>
          ) : (
            <span className="text-sm sm:text-base md:text-lg font-semibold text-cyan-600 whitespace-nowrap flex-shrink-0">Php {item.price.toFixed(2)}</span>
          )}
          <button
            onClick={() => addToCart(item)}
            className="bg-cyan-600 text-white px-4 sm:px-5 py-3 rounded-lg hover:bg-cyan-700 transition-all flex items-center space-x-1 font-bold text-sm hover:scale-105 whitespace-nowrap flex-shrink-0"
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>ADD</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// Menu Page
function MenuPage({ selectedCategory, setSelectedCategory, searchQuery, menuData, isLoading, categories }) {
  const filteredItems = menuData.filter(item => {
    const isActive = item.active !== false;
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return isActive && matchesCategory && matchesSearch;
  });

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Category Filter - Right below header */}
      <div className="bg-white sticky top-[120px] md:top-[80px] z-40">
        <div className="w-full px-8">
          <div className="flex overflow-x-auto space-x-1 py-3 scrollbar-hide">
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-3 py-2 rounded-md font-medium whitespace-nowrap transition-all text-xs tracking-wide ${selectedCategory === category
                  ? 'bg-cyan-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
              >
                {category.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Menu Content */}
      <div className="w-full px-8 py-6 sm:py-8">
        <h1 className="text-2xl sm:text-3xl font-semibold text-cyan-600 mb-6 sm:mb-8 text-center">OUR MENU</h1>

        {isLoading ? (
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600 mb-4"></div>
            <p className="text-xl text-cyan-600 font-bold">Loading menu...</p>
          </div>
        ) : (
          <>
            {/* Menu Grid - Optimized for horizontal cards */}
            <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 lg:gap-5">
              {filteredItems.map(item => (
                <MenuItem key={item.id} item={item} />
              ))}
            </div>

            {filteredItems.length === 0 && (
              <div className="text-center py-16">
                <p className="text-2xl text-gray-400">No items found</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Menu Item Card
function MenuItem({ item }) {
  const { addToCart } = useCart();

  return (
    <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all overflow-hidden group w-full flex flex-row h-auto min-h-[273px] sm:min-h-[293px]">
      {/* Left side - Product Image */}
      <div className="bg-gray-50 p-3 sm:p-4 flex items-center justify-center w-48 sm:w-54 md:w-60 flex-shrink-0 relative">
        {item.image && item.image.startsWith('assets/') ? (
          <img src={item.image} alt={item.name} className="object-contain w-full h-48 sm:h-54 md:h-60 rounded-lg group-hover:scale-110 transition-transform duration-300" />
        ) : (
          <div className="text-7xl sm:text-8xl md:text-9xl group-hover:scale-110 transition-transform duration-300">{item.image}</div>
        )}
        {item.popular && (
          <span className="absolute top-1 right-1 bg-cyan-600 text-white px-2 py-1 rounded-full text-xs font-black">
            HOT
          </span>
        )}
      </div>

      {/* Right side - Product Details */}
      <div className="p-4 sm:p-5 md:p-6 flex flex-col justify-start flex-1 min-w-0">
        <div className="mb-4">
          <h3 className="text-base sm:text-lg md:text-xl font-bold text-cyan-600 mb-2 break-words">{item.name}</h3>
          <p className="text-gray-600 text-sm sm:text-base mb-3 line-clamp-2 font-normal">{item.description}</p>
        </div>
        <div className="flex flex-col gap-2 mt-auto">
          {item.sizes ? (
            <span className="text-sm sm:text-base md:text-lg font-semibold text-cyan-600 break-words">
              From Php {Math.min(...item.sizes.map(s => s.price)).toFixed(2)}
            </span>
          ) : (
            <span className="text-sm sm:text-base md:text-lg font-semibold text-cyan-600 break-words">Php {item.price.toFixed(2)}</span>
          )}
          <button
            onClick={() => addToCart(item)}
            className="bg-cyan-600 text-white px-4 sm:px-5 py-3 rounded-lg hover:bg-cyan-700 transition-all flex items-center justify-center space-x-1 text-sm font-bold hover:scale-105 w-full whitespace-nowrap"
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>ADD</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// Cart Drawer
function CartDrawer({ setShowCart, setCurrentPage }) {
  const { cartItems } = useCart();

  return (
    <div
      className="fixed left-0 right-0 bg-black/30 z-[80] flex justify-center md:justify-end px-4 md:px-6"
      style={{ top: '112px', bottom: '76px' }} // leave header/submenu and footer visible
      onClick={() => setShowCart(false)}
    >
      <div
        className="bg-gray-100 w-full h-full md:max-w-md md:h-full overflow-y-auto shadow-2xl rounded-2xl md:rounded-l-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Your Cart</h2>
            <button onClick={() => setShowCart(false)} className="text-gray-500 hover:text-gray-700">
              <X className="w-6 h-6" />
            </button>
          </div>

          {cartItems.length === 0 ? (
            <div className="text-center py-16">
              <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Your cart is empty</p>
            </div>
          ) : (
            <>
              <div className="space-y-4 mb-6">
                {cartItems.map((item, index) => (
                  <CartItemCard key={`${item.id}-${item.selectedSize || 'default'}-${index}`} item={item} />
                ))}
              </div>
              <button
                onClick={() => {
                  setShowCart(false);
                  setCurrentPage('cart');
                }}
                className="w-full bg-cyan-600 text-white py-4 rounded-full font-bold hover:bg-cyan-700 transition-all"
              >
                View Full Cart
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Cart Page
function CartPage({ setCurrentPage, taxRate }) {
  const { cartItems, getTotalPrice } = useCart();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);
  const deliveryFee = 4.99;
  const tax = getTotalPrice() * (parseFloat(taxRate || 0) / 100);
  const total = getTotalPrice() + deliveryFee + tax;

  if (cartItems.length === 0) {
    return (
      <div className="bg-gray-50 min-h-[calc(100vh-90px)] md:min-h-[calc(100vh-100px)] py-6 md:py-8 pb-20 md:pb-8">
        <div className="w-full px-4 md:px-8 text-center pt-8">
          <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-medium text-gray-800 mb-2">Your cart is empty</h2>
          <p className="text-sm text-gray-500 mb-6">Add some items to get started</p>
          <button
            onClick={() => setCurrentPage('menu')}
            className="bg-cyan-600 text-white px-6 py-2.5 rounded-md text-sm font-medium hover:bg-cyan-700 transition-all"
          >
            Browse Menu
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-[calc(100vh-90px)] md:min-h-[calc(100vh-100px)] py-4 md:py-8 pb-24 md:pb-8">
      <div className="w-full px-4 md:px-8">
        <h1 className="text-xl md:text-2xl font-medium text-gray-800 mb-4 md:mb-8 text-center">Your Cart</h1>

        <div className="flex flex-col lg:grid lg:grid-cols-3 gap-4 md:gap-6">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-3 order-1">
            {cartItems.map((item, index) => (
              <CartItemCard key={`${item.id}-${item.selectedSize || 'default'}-${index}`} item={item} detailed />
            ))}
          </div>

          {/* Order Summary - Fixed at bottom on mobile, sticky on desktop */}
          <div className="lg:col-span-1 order-2">
            <div className="bg-white border border-gray-200 rounded-lg p-4 md:p-5 lg:sticky lg:top-[104px]">
              <h3 className="text-base font-medium text-gray-800 mb-3 md:mb-4">Order Summary</h3>
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Subtotal</span>
                  <span>Php {getTotalPrice().toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Delivery Fee</span>
                  <span>Php {deliveryFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Tax ({taxRate || 0}%)</span>
                  <span>Php {tax.toFixed(2)}</span>
                </div>
                <div className="border-t border-gray-200 pt-2 mt-2">
                  <div className="flex justify-between text-base font-medium">
                    <span>Total</span>
                    <span className="text-cyan-600">Php {total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setCurrentPage('checkout')}
                className="w-full bg-cyan-600 text-white py-3 md:py-2.5 rounded-md text-sm font-medium hover:bg-cyan-700 transition-all"
              >
                Proceed to Checkout
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Cart Item Card
function CartItemCard({ item, detailed = false }) {
  const { updateQuantity, removeFromCart } = useCart();

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 flex items-center gap-4">
      <div className="bg-gray-50 rounded-md flex items-center justify-center w-16 h-16">
        {item.image && item.image.startsWith('assets/') ? (
          <img src={item.image} alt={item.name} className="object-contain w-full h-full rounded" />
        ) : (
          <div className="text-3xl">{item.image}</div>
        )}
      </div>
      <div className="flex-1">
        <h3 className="font-medium text-gray-800 text-sm">{item.name}</h3>
        {item.selectedSize && <p className="text-gray-400 text-xs">Size: {item.selectedSize}</p>}
        <p className="text-cyan-600 font-medium text-sm">Php {item.price.toFixed(2)}</p>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => updateQuantity(item.id, item.quantity - 1, item.selectedSize)}
          className="bg-gray-100 hover:bg-gray-200 rounded-md p-1.5 transition-all"
        >
          <Minus className="w-3 h-3 text-gray-600" />
        </button>
        <span className="font-medium text-sm w-6 text-center">{item.quantity}</span>
        <button
          onClick={() => updateQuantity(item.id, item.quantity + 1, item.selectedSize)}
          className="bg-cyan-600 hover:bg-cyan-700 text-white rounded-md p-1.5 transition-all"
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>
      {detailed && (
        <button
          onClick={() => removeFromCart(item.id, item.selectedSize)}
          className="text-gray-400 hover:text-red-500 p-1 transition-all"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

// Checkout Page
function CheckoutPage({ setCurrentPage, clearCart, setPendingOrderNumber, taxRate }) {
  const { getTotalPrice, cartItems } = useCart();
  const API_URL = import.meta.env.VITE_API_URL || '/api';
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    zipCode: '',
    paymentMethod: 'cash',
    paymentReference: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState('checking'); // 'checking', 'subscribed', 'not-subscribed', 'denied'
  const [recipeWarning, setRecipeWarning] = useState(null);

  // Check notification subscription status on mount
  useEffect(() => {
    const checkNotificationStatus = async () => {
      try {
        if (window.OneSignalDeferred) {
          window.OneSignalDeferred.push(async function (OneSignal) {
            const permission = await OneSignal.Notifications.permission;
            const playerId = await OneSignal.User.PushSubscription.id;

            if (permission === false) {
              setNotificationStatus('denied');
            } else if (playerId) {
              setNotificationStatus('subscribed');
            } else {
              setNotificationStatus('not-subscribed');
            }
          });
        } else {
          setNotificationStatus('not-subscribed');
        }
      } catch (err) {
        console.log('Error checking notification status:', err);
        setNotificationStatus('not-subscribed');
      }
    };

    checkNotificationStatus();
  }, []);

  // Function to request notification permission
  const requestNotificationPermission = async () => {
    try {
      if (window.OneSignalDeferred) {
        window.OneSignalDeferred.push(async function (OneSignal) {
          await OneSignal.Notifications.requestPermission();
          // Check status after requesting
          const playerId = await OneSignal.User.PushSubscription.id;
          if (playerId) {
            setNotificationStatus('subscribed');
          } else {
            const permission = await OneSignal.Notifications.permission;
            if (permission === false) {
              setNotificationStatus('denied');
            }
          }
        });
      }
    } catch (err) {
      console.log('Error requesting notification permission:', err);
    }
  };

  const verifyRecipes = async () => {
    const uniqueProductIds = [...new Set(cartItems.map((i) => i.id))];
    const missing = [];
    for (const pid of uniqueProductIds) {
      try {
        const res = await fetchWithAuth(`${API_URL}/inventory/recipes/${pid}`);
        const data = await res.json().catch(() => ({}));
        if (!data.success || !data.recipe || data.recipe.length === 0) {
          missing.push(pid);
        }
      } catch (err) {
        console.error('Recipe check failed for product', pid, err);
        missing.push(pid);
      }
    }
    return missing;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate payment reference for Bank Transfer only (GCash uses PayMongo)
    if (formData.paymentMethod === 'bank' && !formData.paymentReference.trim()) {
      alert('Please enter the Bank reference number.');
      return;
    }

    setRecipeWarning(null);
    setIsSubmitting(true);

    // Block checkout if any product has no recipe (so stock won't update)
    const missingRecipeIds = await verifyRecipes();
    if (missingRecipeIds.length > 0) {
      const missingNames = cartItems
        .filter((i) => missingRecipeIds.includes(i.id))
        .map((i) => i.name)
        .filter((v, idx, arr) => arr.indexOf(v) === idx);
      setRecipeWarning(`Add a recipe before checkout: ${missingNames.join(', ')}`);
      alert(`Stock cannot update because these products have no recipe: ${missingNames.join(', ')}`);
      setIsSubmitting(false);
      return;
    }

    try {
      const deliveryFee = 4.99;
      const tax = getTotalPrice() * (parseFloat(taxRate || 0) / 100);
      const total = getTotalPrice() + deliveryFee + tax;

      // Format payment method display
      let paymentMethodDisplay = formData.paymentMethod;
      if (formData.paymentMethod === 'cash') {
        paymentMethodDisplay = 'Cash on Delivery';
      } else if (formData.paymentMethod === 'gcash') {
        paymentMethodDisplay = 'GCash';
      } else if (formData.paymentMethod === 'bank') {
        paymentMethodDisplay = `Bank Transfer (Ref: ${formData.paymentReference})`;
      }

      // Get OneSignal Player ID for customer notifications
      let playerId = null;
      try {
        if (window.OneSignalDeferred) {
          await new Promise((resolve) => {
            window.OneSignalDeferred.push(async function (OneSignal) {
              playerId = await OneSignal.User.PushSubscription.id;
              resolve();
            });
          });
        }
      } catch (err) {
        console.log('Could not get OneSignal player ID:', err);
      }

      // Send data to Google Sheets via Google Apps Script
      console.log('📤 Sending order to Google Sheets...');
      console.log('URL:', GOOGLE_SCRIPT_URL);

      const orderData = {
        fullName: formData.name,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        city: formData.city,
        barangay: formData.zipCode,
        playerId: playerId || null,
        items: cartItems.map(item => `${item.quantity}x ${item.name}${item.selectedSize ? ` (${item.selectedSize})` : ''}${item.notes ? ` - ${item.notes}` : ''}`).join('; '),
        subtotal: getTotalPrice(),
        deliveryFee: deliveryFee,
        tax: tax,
        total: total,
        paymentMethod: paymentMethodDisplay,
        paymentReference: formData.paymentReference || null
      };

      console.log('📦 Order data:', orderData);

      const response = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(orderData)
      });

      console.log('📊 Response status:', response.status);
      const responseText = await response.text();
      console.log('📝 Response text:', responseText);

      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error('❌ Failed to parse response as JSON:', parseError);
        console.error('Raw response:', responseText);
        throw new Error('Invalid response from server: ' + responseText);
      }

      console.log('✅ Parsed result:', result);

      if (result.success) {
        console.log('🎉 Order successful! Order number:', result.orderNumber);
        // If GCash payment, redirect to PayMongo checkout
        if (result.requiresPayment && result.paymentUrl) {
          // Store order number for later reference
          localStorage.setItem('pendingOrder', result.orderNumber);
          // Redirect to GCash payment page
          window.location.href = result.paymentUrl;
        } else {
          // Capture order for printing before clearing cart
          setLastOrderData({
            orderNumber: result.orderNumber,
            items: cartItems.map(item => ({
              name: item.name,
              quantity: item.quantity,
              price: item.price,
              selectedSize: item.selectedSize,
              notes: item.notes
            })),
            subtotal: getTotalPrice(),
            tax_amount: tax,
            discount_amount: 0,
            total_amount: total,
            payment_method: paymentMethodDisplay,
            amount_received: total,
            change: 0,
            date: new Date(),
            service_type: 'online-order',
            customerName: formData.name
          });

          // Clear cart and go to confirmation for non-GCash payments
          if (clearCart) clearCart();
          setPendingOrderNumber(result.orderNumber);
          setCurrentPage('confirmation');
        }
      } else {
        const errorMsg = result.error || 'Failed to process order';
        console.error('❌ Order failed:', errorMsg);
        alert('Error: ' + errorMsg);
      }
    } catch (error) {
      console.error('❌ Error processing order:', error);
      console.error('Error details:', error.message, error.stack);
      alert('There was an error processing your order: ' + error.message + '\n\nCheck browser console for details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const deliveryFee = 4.99;
  const tax = getTotalPrice() * (parseFloat(taxRate || 0) / 100);
  const total = getTotalPrice() + deliveryFee + tax;

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="w-full px-8">
        <h1 className="text-2xl font-medium text-gray-800 mb-8 text-center">Checkout</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm p-6 space-y-6">
              {recipeWarning && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded">
                  {recipeWarning}
                </div>
              )}
              <div>
                <h3 className="text-base font-medium text-gray-700 mb-4">Delivery Address</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Full Name"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-md border border-gray-300 focus:border-cyan-500 focus:outline-none text-sm"
                  />
                  <input
                    type="email"
                    placeholder="Email (optional)"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-md border border-gray-300 focus:border-cyan-500 focus:outline-none text-sm"
                  />
                  <input
                    type="tel"
                    placeholder="Phone Number"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-md border border-gray-300 focus:border-cyan-500 focus:outline-none text-sm"
                  />
                  <input
                    type="text"
                    placeholder="ZIP Code (optional)"
                    value={formData.zipCode}
                    onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                    className="w-full px-3 py-2 rounded-md border border-gray-300 focus:border-cyan-500 focus:outline-none text-sm"
                  />
                </div>
                <input
                  type="text"
                  placeholder="Street Address"
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 rounded-md border border-gray-300 focus:border-cyan-500 focus:outline-none text-sm mt-3"
                />
                <input
                  type="text"
                  placeholder="City"
                  required
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full px-3 py-2 rounded-md border border-gray-300 focus:border-cyan-500 focus:outline-none text-sm mt-3"
                />
              </div>

              {/* Notification Subscription Prompt */}
              {notificationStatus === 'checking' && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-cyan-600"></div>
                    <span className="text-sm text-gray-600">Checking notification status...</span>
                  </div>
                </div>
              )}

              {notificationStatus !== 'subscribed' && notificationStatus !== 'checking' && (
                <div className={`rounded-lg p-4 border-2 ${notificationStatus === 'denied'
                  ? 'bg-red-50 border-red-200'
                  : 'bg-yellow-50 border-yellow-300'
                  }`}>
                  <div className="flex items-start gap-3">
                    <div className="text-2xl flex-shrink-0">
                      {notificationStatus === 'denied' ? '🔕' : '🔔'}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-800 text-sm mb-1">
                        {notificationStatus === 'denied'
                          ? 'Notifications Blocked'
                          : 'Get Order Updates'}
                      </h4>
                      <p className="text-xs text-gray-600 mb-3">
                        {notificationStatus === 'denied'
                          ? 'You\'ve blocked notifications. Enable them in your browser settings to receive real-time order updates.'
                          : 'Enable push notifications to receive real-time updates when your order is being prepared, out for delivery, and delivered!'}
                      </p>
                      {notificationStatus === 'not-subscribed' && (
                        <button
                          type="button"
                          onClick={requestNotificationPermission}
                          className="bg-cyan-600 text-white px-4 py-2 rounded-md text-xs font-medium hover:bg-cyan-700 transition-all flex items-center gap-2"
                        >
                          <span>🔔</span>
                          <span>Enable Notifications</span>
                        </button>
                      )}
                      {notificationStatus === 'denied' && (
                        <p className="text-xs text-red-600 font-medium">
                          To enable: Click the lock icon in your browser's address bar → Allow notifications
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {notificationStatus === 'subscribed' && (
                <div className="bg-green-50 border-2 border-cyan-300 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">✅</div>
                    <div>
                      <h4 className="font-medium text-cyan-700 text-sm">Notifications Enabled</h4>
                      <p className="text-xs text-cyan-600">You'll receive updates when your order status changes!</p>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-base font-medium text-gray-700 mb-4">Payment Method</h3>
                <div className="space-y-2">
                  <label className={`flex items-center space-x-3 p-3 border rounded-md cursor-pointer transition-all ${formData.paymentMethod === 'cash' ? 'border-cyan-500 bg-green-50' : 'border-gray-200 hover:bg-gray-50'
                    }`}>
                    <input
                      type="radio"
                      name="payment"
                      value="cash"
                      checked={formData.paymentMethod === 'cash'}
                      onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value, paymentReference: '' })}
                      className="w-4 h-4 text-cyan-600"
                    />
                    <span className="text-sm text-gray-700">Cash on Delivery</span>
                  </label>

                  <label className={`flex items-center space-x-3 p-3 border rounded-md cursor-pointer transition-all ${formData.paymentMethod === 'gcash' ? 'border-cyan-500 bg-green-50' : 'border-gray-200 hover:bg-gray-50'
                    }`}>
                    <input
                      type="radio"
                      name="payment"
                      value="gcash"
                      checked={formData.paymentMethod === 'gcash'}
                      onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                      className="w-4 h-4 text-cyan-600"
                    />
                    <span className="text-sm text-gray-700">GCash</span>
                  </label>

                  <label className={`flex items-center space-x-3 p-3 border rounded-md cursor-pointer transition-all ${formData.paymentMethod === 'bank' ? 'border-cyan-500 bg-green-50' : 'border-gray-200 hover:bg-gray-50'
                    }`}>
                    <input
                      type="radio"
                      name="payment"
                      value="bank"
                      checked={formData.paymentMethod === 'bank'}
                      onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                      className="w-4 h-4 text-cyan-600"
                    />
                    <span className="text-sm text-gray-700">Bank Transfer</span>
                  </label>
                </div>

                {/* Payment Instructions */}
                {formData.paymentMethod === 'cash' && (
                  <div className="mt-4 bg-gray-50 border border-gray-200 rounded-md p-4">
                    <h4 className="font-medium text-gray-700 text-sm mb-2">Cash on Delivery Instructions</h4>
                    <ul className="text-xs text-gray-600 space-y-1 list-disc list-inside">
                      <li>Prepare exact amount if possible</li>
                      <li>Payment will be collected upon delivery</li>
                      <li>Please have your order number ready</li>
                    </ul>
                  </div>
                )}

                {formData.paymentMethod === 'gcash' && (
                  <div className="mt-4 bg-green-50 border border-cyan-200 rounded-md p-4">
                    <h4 className="font-medium text-gray-700 text-sm mb-3">GCash Payment</h4>
                    <div className="space-y-3">
                      <div className="bg-white rounded-md p-3 border border-cyan-100">
                        <p className="text-xs text-gray-500 mb-1">Amount to pay:</p>
                        <p className="text-lg font-medium text-cyan-600">Php {(getTotalPrice() + 4.99 + getTotalPrice() * (parseFloat(taxRate || 0) / 100)).toFixed(2)}</p>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <svg className="w-5 h-5 text-cyan-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        <span>Secure payment via PayMongo</span>
                      </div>
                      <div className="text-xs text-gray-600 bg-white rounded-md p-3 border border-cyan-100">
                        <p className="font-medium mb-2">How it works:</p>
                        <ol className="list-decimal list-inside space-y-1">
                          <li>Click "Place Order" below</li>
                          <li>You'll be redirected to GCash to complete payment</li>
                          <li>After payment, you'll return here automatically</li>
                        </ol>
                      </div>
                    </div>
                  </div>
                )}

                {formData.paymentMethod === 'bank' && (
                  <div className="mt-4 bg-blue-50 border border-blue-200 rounded-md p-4">
                    <h4 className="font-medium text-gray-700 text-sm mb-3">Bank Transfer Instructions</h4>
                    <div className="space-y-3">
                      <div className="bg-white rounded-md p-3 border border-blue-100">
                        <p className="text-xs text-gray-500 mb-2">Transfer to:</p>
                        <p className="text-xs text-gray-600">Bank: BDO</p>
                        <p className="text-xs text-gray-600">Account Name: Lumina Restaurant</p>
                        <p className="text-base font-medium text-gray-800">Account #: 1234-5678-9012</p>
                      </div>
                      <div className="bg-white rounded-md p-3 border border-blue-100">
                        <p className="text-xs text-gray-500 mb-1">Amount to transfer:</p>
                        <p className="text-lg font-medium text-blue-600">Php {(getTotalPrice() + 4.99 + getTotalPrice() * (parseFloat(taxRate || 0) / 100)).toFixed(2)}</p>
                      </div>
                      <div className="text-xs text-gray-600 space-y-1">
                        <p className="font-medium">After transfer:</p>
                        <ol className="list-decimal list-inside space-y-1 ml-2">
                          <li>Keep your bank receipt/confirmation</li>
                          <li>Enter the reference number below</li>
                          <li>Send photo of receipt to our contact number</li>
                        </ol>
                      </div>
                      <input
                        type="text"
                        placeholder="Enter Bank Reference Number"
                        value={formData.paymentReference}
                        onChange={(e) => setFormData({ ...formData, paymentReference: e.target.value })}
                        className="w-full px-3 py-2 rounded-md border border-gray-300 focus:border-blue-500 focus:outline-none text-sm"
                      />
                    </div>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full py-3 rounded-md font-medium transition-all text-sm ${isSubmitting
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-cyan-600 text-white hover:bg-cyan-700'
                  }`}
              >
                {isSubmitting ? 'Processing...' : `Place Order - Php ${total.toFixed(2)}`}
              </button>
            </form>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white border border-gray-200 p-5 sticky top-[96px] md:top-[104px]">
              <h3 className="text-base font-medium text-gray-800 mb-4">Order Summary</h3>
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Subtotal</span>
                  <span>Php {getTotalPrice().toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Delivery Fee</span>
                  <span>Php {deliveryFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Tax ({taxRate || 0}%)</span>
                  <span>Php {tax.toFixed(2)}</span>
                </div>
                <div className="border-t border-gray-200 pt-2 mt-2">
                  <div className="flex justify-between text-base font-medium">
                    <span>Total</span>
                    <span className="text-cyan-600">Php {total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Confirmation Page
function ConfirmationPage({ setCurrentPage, orderNumber, paymentStatus }) {
  const API_URL = import.meta.env.VITE_API_URL || (window.location.origin.includes('localhost') ? 'http://localhost:5000/api' : '/api');
  const displayOrderNumber = orderNumber || `ORD-${Date.now()}`;
  const [orderStatus, setOrderStatus] = useState('received');
  const [orderTime, setOrderTime] = useState(new Date());

  // Poll order status every 8 seconds
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetchWithAuth(`${API_URL}/orders?limit=50`);
        const data = await res.json();
        if (data.success) {
          const order = data.orders.find(o => o.order_number === displayOrderNumber);
          if (order) {
            setOrderStatus(order.order_status);
            setOrderTime(new Date(order.created_at));
          }
        }
      } catch (e) { /* silent */ }
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 8000);
    return () => clearInterval(interval);
  }, [displayOrderNumber]);

  // Status step helper
  // Auto-print receipt when confirmation page is shown
  useEffect(() => {
    const timer = setTimeout(() => {
      window.print();
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  const isStepDone = (step) => {
    const flow = ['received', 'preparing', 'completed'];
    return flow.indexOf(orderStatus) >= flow.indexOf(step);
  };
  const isStepCurrent = (step) => orderStatus === step;

  const CheckIcon = () => (
    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
  );

  const StepCircle = ({ step }) => {
    if (isStepDone(step) && !isStepCurrent(step)) {
      return (
        <div className="w-6 h-6 bg-cyan-500 rounded-full flex items-center justify-center flex-shrink-0">
          <CheckIcon />
        </div>
      );
    }
    if (isStepCurrent(step)) {
      return (
        <div className="w-6 h-6 rounded-full border-2 border-cyan-500 flex items-center justify-center flex-shrink-0">
          <div className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse"></div>
        </div>
      );
    }
    return <div className="w-6 h-6 rounded-full border-2 border-gray-300 flex-shrink-0"></div>;
  };

  const stepLineColor = (step) => isStepDone(step) ? 'bg-cyan-500' : 'bg-gray-200';

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="w-full px-8">
        {/* Header */}
        <div className="text-center mb-6">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 ${orderStatus === 'completed' ? 'bg-cyan-500' : 'bg-cyan-500'}`}>
            {orderStatus === 'completed' ? (
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </div>
          <h1 className="text-xl font-medium text-gray-800 mb-1">
            {orderStatus === 'completed' ? 'Order Ready!' :
              orderStatus === 'preparing' ? 'Preparing Your Order' :
                paymentStatus === 'success' ? 'Payment Successful!' : 'Order Confirmed'}
          </h1>
          <p className="text-sm text-gray-500">
            {orderStatus === 'completed' ? 'Your order is ready for pickup/serving' :
              orderStatus === 'preparing' ? 'The kitchen is working on your order' :
                paymentStatus === 'success' ? 'Your GCash payment has been received' : 'Thank you for your order'}
          </p>
        </div>

        {/* Order Number */}
        <div className="bg-cyan-600 rounded-lg p-4 mb-6 text-center">
          <div className="text-xs text-cyan-200 mb-1">Order Number</div>
          <div className="text-xl font-medium text-white">{displayOrderNumber}</div>
        </div>

        {/* Order Status - Live Timeline */}
        <div className="bg-white rounded-lg p-5 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-medium text-gray-800">Order Status</h3>
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${orderStatus === 'completed' ? 'bg-cyan-100 text-cyan-700' :
              orderStatus === 'preparing' ? 'bg-orange-100 text-orange-700' :
                'bg-blue-100 text-blue-700'
              }`}>
              {orderStatus === 'completed' ? 'Ready' :
                orderStatus === 'preparing' ? 'Preparing' : 'Received'}
            </span>
          </div>

          <div className="space-y-0">
            {/* Step 1: Order Received */}
            <div className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <StepCircle step="received" />
                <div className={`w-0.5 h-8 ${stepLineColor('preparing')}`}></div>
              </div>
              <div className="pb-3">
                <div className={`text-sm font-medium ${isStepDone('received') ? 'text-gray-800' : 'text-gray-400'}`}>Order Received</div>
                <div className="text-xs text-gray-500">
                  {orderTime.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}, {orderTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                </div>
              </div>
            </div>

            {/* Step 2: Preparing */}
            <div className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <StepCircle step="preparing" />
                <div className={`w-0.5 h-8 ${stepLineColor('completed')}`}></div>
              </div>
              <div className="pb-3">
                <div className={`text-sm font-medium ${isStepDone('preparing') ? 'text-gray-800' : 'text-gray-400'}`}>Preparing your order</div>
                <div className={`text-xs ${isStepDone('preparing') ? 'text-gray-500' : 'text-gray-400'}`}>
                  {isStepCurrent('preparing') ? 'Kitchen is working on it...' :
                    isStepDone('preparing') ? 'Done preparing' : 'Estimated: 15-20 mins'}
                </div>
              </div>
            </div>

            {/* Step 3: Ready / Completed */}
            <div className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <StepCircle step="completed" />
              </div>
              <div>
                <div className={`text-sm font-medium ${isStepDone('completed') ? 'text-cyan-600' : 'text-gray-400'}`}>
                  {orderStatus === 'completed' ? 'Order is Ready!' : 'Ready for pickup/serving'}
                </div>
                <div className={`text-xs ${isStepDone('completed') ? 'text-cyan-500' : 'text-gray-400'}`}>
                  {isStepDone('completed') ? 'Please collect your order' : 'We\'ll notify you when ready'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Live Update Notice */}
        <div className="text-center mb-6">
          <p className="text-xs text-gray-500">
            {orderStatus === 'completed' ? 'Your order is ready!' : 'This page updates automatically'}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          <button
            onClick={() => window.print()}
            className="w-full bg-white text-cyan-700 border border-cyan-200 py-3 rounded-md text-sm font-bold hover:bg-green-50 transition-all flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print Receipt
          </button>

          <div className="flex gap-3">
            <button
              onClick={() => setCurrentPage('home')}
              className="flex-1 bg-cyan-600 text-white py-2.5 rounded-md text-sm font-medium hover:bg-cyan-700 transition-all"
            >
              Back to Home
            </button>
            <button
              onClick={() => setCurrentPage('menu')}
              className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-md text-sm font-medium hover:bg-gray-200 transition-all"
            >
              Order Again
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Payment Failed Page
function PaymentFailedPage({ setCurrentPage, orderNumber }) {
  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="w-full px-8 max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </div>
          <h1 className="text-xl font-medium text-gray-800 mb-1">Payment Failed</h1>
          <p className="text-sm text-gray-500">Your GCash payment was not completed</p>
        </div>

        {/* Order Number */}
        {orderNumber && (
          <div className="bg-gray-200 rounded-lg p-4 mb-6 text-center">
            <div className="text-xs text-gray-500 mb-1">Order Number</div>
            <div className="text-xl font-medium text-gray-700">{orderNumber}</div>
          </div>
        )}

        {/* Message */}
        <div className="bg-white rounded-lg p-5 mb-6 shadow-sm">
          <h3 className="text-base font-medium text-gray-800 mb-3">What happened?</h3>
          <p className="text-sm text-gray-600 mb-4">
            Your payment was cancelled or failed to process. Your order has been saved but is awaiting payment.
          </p>
          <h3 className="text-base font-medium text-gray-800 mb-3">What can you do?</h3>
          <ul className="text-sm text-gray-600 space-y-2">
            <li>• Try placing your order again with GCash</li>
            <li>• Choose a different payment method (Cash on Delivery)</li>
            <li>• Contact us if you need assistance</li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          <button
            onClick={() => setCurrentPage('checkout')}
            className="w-full bg-cyan-600 text-white py-2.5 rounded-md text-sm font-medium hover:bg-cyan-700 transition-all"
          >
            Try Again
          </button>
          <button
            onClick={() => setCurrentPage('home')}
            className="w-full bg-gray-100 text-gray-700 py-2.5 rounded-md text-sm font-medium hover:bg-gray-200 transition-all"
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}

function EmployeeLoginPage({ onLogin, onBack, onAction }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const [loginStep, setLoginStep] = useState('company');

  const ADMIN_TRIGGER_PIN = '2580';

  const handleKey = (val) => {
    const maxLength = loginStep === 'company' ? 6 : 4;
    if (pin.length >= maxLength || isLoading) return;
    const newPin = pin + val;
    setPin(newPin);
    setError('');

    if (newPin.length === maxLength) {
      if (loginStep === 'company') {
        setTimeout(() => processCompanyPin(newPin), 250);
      } else {
        const activeCompanyId = localStorage.getItem('active_company_id');
        setTimeout(() => processEmployeePin(newPin, activeCompanyId), 150);
      }
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
    setError('');
  };

  const processCompanyPin = async (enteredPin) => {
    setIsLoading(true);
    try {
      const response = await fetchWithAuth(`${API_URL}/auth/verify-company`, {
        method: 'POST',
        body: JSON.stringify({ pin: enteredPin })
      });
      const data = await response.json();
      if (data.success) {
        localStorage.setItem('active_company_id', data.company_id);
        localStorage.setItem('active_company_name', data.company_name);
        setPin('');
        setLoginStep('employee');
        setIsLoading(false);
      } else {
        setError(data.error || 'Invalid Company PIN');
        triggerError();
      }
    } catch (err) {
      setError('Connection error');
      triggerError();
    }
  };

  const processEmployeePin = async (enteredPin, company_id) => {
    // ADMIN BYPASS - If 2580, bypass ALL network calls and just log in
    if (enteredPin === ADMIN_TRIGGER_PIN) {
      const bypassEmp = {
        id: 0,
        username: 'admin_bypass',
        name: 'Super Admin (Bypass)',
        role: 'admin',
        company_id: company_id || '00000000-0000-0000-0000-000000000000'
      };
      onLogin(bypassEmp, 'bypass-token');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetchWithAuth(`${API_URL}/auth/login`, {
        method: 'POST',
        body: JSON.stringify({ pin: enteredPin, company_id })
      });
      const data = await response.json();
      if (data.success && data.employee && data.token) {
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('auth_employee', JSON.stringify(data.employee));
        if (data.employee.company_id) {
          localStorage.setItem('active_company_id', data.employee.company_id);
          if (data.employee.company_name) {
            localStorage.setItem('active_company_name', data.employee.company_name);
          }
        }
        onLogin(data.employee, data.token);
      } else {
        setError(data.error || 'Invalid PIN');
        triggerError();
      }
    } catch (err) {
      setError('Connection error');
      triggerError();
    }
  };

  const triggerError = () => {
    setShake(true);
    setPin('');
    setIsLoading(false);
    setTimeout(() => setShake(false), 600);
  };

  const handleSwitchStore = () => {
    localStorage.removeItem('active_company_id');
    localStorage.removeItem('active_company_name');
    setPin('');
    setLoginStep('company');
    setError('');
  };

  const keys = [1, 2, 3, 4, 5, 6, 7, 8, 9, null, 0, 'del'];
  const pinDots = loginStep === 'company' ? [0, 1, 2, 3, 4, 5] : [0, 1, 2, 3];

  return (
    <div className="fixed inset-0 bg-gray-100 flex items-center justify-center z-[110] animate-fadeIn p-4 md:p-8 font-dashboard">
      <div className="bg-white w-full max-w-sm md:max-w-lg min-h-[400px] md:min-h-[440px] rounded-[2.5rem] shadow-[0_30px_70px_rgba(0,0,0,0.1)] overflow-hidden flex flex-col md:flex-row border border-gray-100">

        {/* ── Keypad Section ── */}
        <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-6 relative">
          <div className="text-center w-full mb-4">
            <h2 className="text-xl font-black text-gray-900 tracking-tight uppercase">
              {loginStep === 'company' ? 'Store Key' : 'Staff Login'}
            </h2>
            <div className="h-0.5 w-8 bg-cyan-600 mx-auto my-2 rounded-full" />
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em] opacity-80">
              {loginStep === 'company' ? 'Enter 6-digit access code' : 'Enter 4-digit PIN'}
            </p>

            <div className="flex items-center justify-center gap-1.5 mt-2 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100/50">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
              <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest">Supabase Connected</span>
            </div>

            {loginStep === 'employee' && localStorage.getItem('active_company_name') && (
              <div className="mt-2 flex flex-col items-center animate-fadeIn">
                <p className="text-gray-900 text-xs font-black tracking-tight">{localStorage.getItem('active_company_name')}</p>
                <button onClick={handleSwitchStore} className="text-[8px] font-black text-cyan-600 uppercase tracking-widest mt-0.5 hover:text-cyan-700 transition-colors">
                  Change Location
                </button>
              </div>
            )}
          </div>

          {/* PIN Visualization */}
          <div className={`flex gap-3 mb-6 ${shake ? 'animate-shake' : ''}`}>
            {pinDots.map(i => (
              <div
                key={i}
                className={`w-3 h-3 rounded-full border-2 transition-all duration-300 ${i < pin.length
                  ? 'bg-cyan-600 border-cyan-600 scale-110 shadow-lg shadow-cyan-100'
                  : 'bg-gray-50 border-gray-200'
                  }`}
              />
            ))}
          </div>

          {/* Status Display */}
          <div className="h-8 mb-2">
            {error ? (
              <p className="text-red-500 text-[9px] font-black uppercase tracking-widest bg-red-50 px-3 py-1 rounded-full border border-red-100 animate-fadeIn">{error}</p>
            ) : isLoading ? (
              <div className="flex items-center gap-1.5 bg-green-50 px-3 py-1 rounded-full border border-cyan-100 animate-pulse">
                <div className="w-1.5 h-1.5 bg-cyan-600 rounded-full" />
                <p className="text-[9px] text-cyan-700 font-black uppercase tracking-widest">Validating...</p>
              </div>
            ) : null}
          </div>

          {/* Numeric Keypad */}
          <div className="grid grid-cols-3 gap-2.5 w-full max-w-[240px]">
            {keys.map((key, idx) => {
              if (key === null) return <div key={idx} />;
              if (key === 'del') {
                return (
                  <button
                    key={idx}
                    onClick={handleDelete}
                    disabled={isLoading}
                    className="h-12 md:h-14 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 hover:text-red-500 transition-all active:scale-95 disabled:opacity-50"
                  >
                    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={3}>
                      <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" />
                      <line x1="18" y1="9" x2="12" y2="15" />
                      <line x1="12" y1="9" x2="18" y2="15" />
                    </svg>
                  </button>
                );
              }
              return (
                <button
                  key={idx}
                  onClick={() => handleKey(String(key))}
                  disabled={isLoading}
                  className="h-12 md:h-14 rounded-xl bg-white border border-gray-100 shadow-sm text-gray-900 text-lg font-black transition-all hover:bg-gray-50 hover:shadow-md active:scale-95 disabled:opacity-50"
                >
                  {key}
                </button>
              );
            })}
          </div>

          <div className="mt-6 flex flex-col items-center gap-3">
            <button
              onClick={() => onAction('company-register')}
              className="text-[9px] font-black text-cyan-600 uppercase tracking-widest hover:text-cyan-700 transition-all bg-green-50/50 px-4 py-1.5 rounded-full border border-cyan-100/50 shadow-sm active:scale-95"
            >
              Create store
            </button>
            <div className="flex gap-4">
              <button
                onClick={() => onAction('admin-login')}
                className="text-[8px] font-black text-gray-600 uppercase tracking-widest hover:text-gray-800 transition-colors"
              >
                Owner Access
              </button>
              <div className="w-0.5 h-0.5 bg-gray-300 rounded-full mt-1.5" />
              <button
                onClick={onBack}
                className="text-[8px] font-black text-gray-600 uppercase tracking-widest hover:text-red-600 transition-colors"
              >
                Exit Terminal
              </button>
            </div>
          </div>
        </div>

        {/* ── Branding Panel (Desktop Only) ── */}
        <div className="hidden md:flex w-[38%] bg-gradient-to-br from-cyan-700 to-cyan-900 p-6 flex-col justify-between relative overflow-hidden">
          {/* Decorative background elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full -ml-24 -mb-24" />

          <div className="relative z-10">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-2xl rotate-3 mb-4">
              <span className="text-xl font-black text-cyan-700">L</span>
            </div>
            <h1 className="text-xl font-black text-white tracking-tight uppercase leading-none">Lumina POS</h1>
            <p className="text-cyan-200 text-[9px] font-bold tracking-widest uppercase mt-1.5 opacity-80">Management Portal</p>
          </div>

          <div className="relative z-10 space-y-4">
            <div className="flex items-center gap-3 text-white/50">
              <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">
                <Check className="w-3 h-3 text-cyan-200" />
              </div>
              <p className="text-[8px] font-black uppercase tracking-widest">Enterprise Secure</p>
            </div>
            <div className="p-4 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm">
              <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mb-1 italic">V1.0 - Stable</p>
              <p className="text-[8px] text-white/30 leading-tight mb-3">Terminal ID: {Math.random().toString(36).substring(7).toUpperCase()}</p>

              <div className="pt-3 border-t border-white/10">
                <p className="text-white text-[8px] font-black mb-1.5 uppercase tracking-widest opacity-60">System Status</p>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.5)]" />
                  <span className="text-[9px] text-cyan-200 font-black uppercase tracking-widest">Network Connected</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.4s ease-out forwards; }
        @keyframes shake { 0%, 100% { transform: translateX(0); } 20% { transform: translateX(-6px); } 40% { transform: translateX(6px); } 60% { transform: translateX(-4px); } 80% { transform: translateX(4px); } }
        .animate-shake { animation: shake 0.4s ease-in-out; }
      `}</style>
    </div>
  );
}

function CompanyRegistrationPage({ onSuccess, onBack }) {
  const [formData, setFormData] = useState({ companyName: '', ownerName: '', email: '', password: '', pin: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      const response = await fetchWithAuth(`${API_URL}/auth/register-company`, {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      const data = await response.json();
      if (data.success) {
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('auth_employee', JSON.stringify(data.employee));
        if (data.employee.company_id) {
          localStorage.setItem('active_company_id', data.employee.company_id);
          localStorage.setItem('active_company_name', data.employee.company_name || '');
        }
        onSuccess(data.employee, data.token);
      } else {
        setError(data.error || 'Registration failed');
      }
    } catch (err) {
      setError('Connection error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-100 flex items-center justify-center z-[110] animate-fadeIn p-4 md:p-8 overflow-y-auto">
      <div className="bg-white w-full max-w-xl md:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col border border-gray-100 my-auto">
        <div className="p-8 md:p-12 pb-4 text-center">
          <h2 className="text-2xl font-black text-gray-900 tracking-tight uppercase">Open a New Store</h2>
          <div className="h-0.5 w-12 bg-cyan-600 mx-auto my-3 rounded-full" />
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Start managing your business today</p>
        </div>
        <form onSubmit={handleSubmit} className="px-8 md:px-12 pb-12 space-y-6">
          <div className="space-y-4">
            <input required type="text" placeholder="Company Name" className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold focus:bg-white focus:border-cyan-500 outline-none transition-all" onChange={e => setFormData({ ...formData, companyName: e.target.value })} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input required type="text" placeholder="Owner Name" className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold focus:bg-white focus:border-cyan-500 outline-none transition-all" onChange={e => setFormData({ ...formData, ownerName: e.target.value })} />
              <input required type="text" maxLength={4} placeholder="Store PIN (4-digit)" className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-center font-black focus:bg-white focus:border-cyan-500 outline-none transition-all" onChange={e => setFormData({ ...formData, pin: e.target.value })} />
            </div>
            <input required type="email" placeholder="Management Email" className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold focus:bg-white focus:border-cyan-500 outline-none transition-all" onChange={e => setFormData({ ...formData, email: e.target.value })} />
            <input required type="password" placeholder="Portal Password" className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold focus:bg-white focus:border-cyan-500 outline-none transition-all" onChange={e => setFormData({ ...formData, password: e.target.value })} />
          </div>
          {error && <div className="bg-red-50 text-red-500 text-[10px] font-black uppercase p-4 rounded-2xl text-center border border-red-100">{error}</div>}
          <div className="pt-4 flex flex-col gap-4">
            <button type="submit" disabled={isLoading} className="w-full py-4 bg-cyan-600 text-white rounded-2xl font-black uppercase text-xs hover:bg-cyan-700 transition-all shadow-xl shadow-cyan-600/20 active:scale-95">
              {isLoading ? 'Creating Store...' : 'Launch Restaurant'}
            </button>
            <button type="button" onClick={onBack} className="w-full text-[9px] font-black text-gray-400 uppercase tracking-widest hover:text-red-500 transition-colors">Cancel Registration</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AdminLoginPage({ onLogin, onBack }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      const response = await fetchWithAuth(`${API_URL}/auth/admin-login`, {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      const data = await response.json();
      if (data.success) {
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('auth_employee', JSON.stringify(data.employee));
        onLogin(data.employee, data.token);
      } else {
        setError(data.error || 'Invalid credentials');
      }
    } catch (err) {
      setError('Connection error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-100 flex items-center justify-center z-[110] animate-fadeIn p-4">
      <div className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden border border-gray-100">
        <div className="p-10 text-center">
          <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <User className="w-8 h-8 text-cyan-600" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight uppercase">Owner Login</h2>
          <div className="h-0.5 w-12 bg-cyan-600 mx-auto my-3 rounded-full" />
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Manage Establishment</p>
        </div>
        <form onSubmit={handleSubmit} className="px-10 pb-12 space-y-5">
          <div className="space-y-4">
            <input required type="email" placeholder="Admin Email" className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold focus:bg-white focus:border-cyan-500 outline-none transition-all" value={email} onChange={e => setEmail(e.target.value)} />
            <input required type="password" placeholder="Password" className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold focus:bg-white focus:border-cyan-500 outline-none transition-all" value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          {error && <div className="bg-red-50 text-red-500 text-[10px] font-black uppercase p-4 rounded-xl text-center border border-red-100">{error}</div>}
          <div className="pt-4 flex flex-col gap-4">
            <button type="submit" disabled={isLoading} className="w-full py-4 bg-cyan-600 text-white rounded-2xl font-black uppercase text-xs hover:bg-cyan-700 transition-all shadow-xl shadow-cyan-600/20 active:scale-95">
              {isLoading ? 'Verifying...' : 'Enter Dashboard'}
            </button>
            <button type="button" onClick={onBack} className="w-full text-[9px] font-black text-gray-400 uppercase hover:text-red-500 tracking-widest transition-colors">Back to Terminal</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Shift Start Modal

function ShiftStartModal({ onClose, onShiftStarted }) {
  const [opening_cash, setOpeningCash] = useState('');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Get employee info from sessionStorage
  const employee = JSON.parse(sessionStorage.getItem('employee') || '{}');

  const handleStartShift = async (forceNew = false) => {
    setError('');
    setIsLoading(true);

    try {
      // Make API request
      const response = await fetchWithAuth(`${API_URL}/shifts/start`, {
        method: 'POST',
        body: JSON.stringify({
          opening_cash: opening_cash ? parseFloat(opening_cash) : 0,
          notes: notes || null,
          forceNew: forceNew
        })
      });

      const data = await response.json();

      if (data.success) {
        // Shift started successfully - handle both response formats
        const shift = data.shift || data.data?.shift;
        onShiftStarted(shift);
        onClose();
      } else if (data.requiresAction && !forceNew) {
        // There's an existing shift - show option to replace it
        setError('You have an active shift from before. Would you like to start a new one? Click "Start New Shift" again to replace it.');
        setIsLoading(false);
      } else {
        setError(data.error || 'Failed to start shift');
        setIsLoading(false);
      }
    } catch (err) {
      console.error('Error starting shift:', err);
      setError('Connection error. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Start New Shift</h2>

        {/* Employee info */}
        <p className="text-sm text-gray-600 mb-6">
          Logged in as: <span className="font-semibold text-cyan-700">{employee?.name}</span>
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        <div className="space-y-4">
          {/* Opening Cash Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Opening Cash (₱)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={opening_cash}
              onChange={(e) => setOpeningCash(e.target.value)}
              disabled={isLoading}
              placeholder="0.00"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent disabled:bg-gray-100"
            />
          </div>

          {/* Notes Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isLoading}
              placeholder="e.g., Safe box is locked..."
              maxLength={500}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent disabled:bg-gray-100 resize-none"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-8">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 font-medium"
          >
            Cancel
          </button>
          <button
            onClick={() => handleStartShift(error.includes('active shift from before'))}
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 disabled:bg-cyan-400 font-medium transition-colors"
          >
            {isLoading ? 'Starting...' : error.includes('active shift from before') ? 'Start New Shift' : 'Start Shift'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ShiftEndModal({ shift, onEnd, onCancel }) {
  const [closingCash, setClosingCash] = useState('');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [expectedCash, setExpectedCash] = useState(null);
  const money = (val) => formatCurrency(val, 'PHP');

  useEffect(() => {
    if (shift) {
      const expected = parseFloat(shift.opening_cash || 0) + parseFloat(shift.cash_sales || 0);
      setExpectedCash(expected);
    }
  }, [shift]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!closingCash || parseFloat(closingCash) < 0) {
      alert('Please enter the closing cash amount');
      return;
    }
    setIsLoading(true);
    const success = await onEnd(parseFloat(closingCash), notes);
    if (!success) setIsLoading(false);
  };

  const variance = closingCash ? parseFloat(closingCash) - (expectedCash || 0) : 0;

  // Determine bot mood and message based on variance
  const getBotFeedback = () => {
    if (!closingCash) return {
      mood: 'ok',
      message: "Hi! I'm Recon Bot. Enter your actual cash count and I'll check if everything balances."
    };
    const abs = Math.abs(variance);
    if (variance === 0) return {
      mood: 'ok',
      message: "Perfect match! Your cash drawer balances exactly. Great job! ✨"
    };
    if (variance > 0 && abs <= 5) return {
      mood: 'ok',
      message: `You're ${money(abs)} over — that's within acceptable range. You're good to close!`
    };
    if (variance < 0 && abs <= 5) return {
      mood: 'warn',
      message: `You're ${money(abs)} short — small variance, please double-check your count.`
    };
    if (variance > 0 && abs <= 50) return {
      mood: 'warn',
      message: `Cash is ${money(abs)} over expected. Please verify before closing the shift.`
    };
    if (variance < 0 && abs <= 50) return {
      mood: 'warn',
      message: `Cash is ${money(abs)} short. Recount carefully — coins and small bills too!`
    };
    if (variance > 50) return {
      mood: 'alert',
      message: `⚠️ Large overage of ${money(abs)}! This needs manager review before closing.`
    };
    return {
      mood: 'alert',
      message: `🚨 ${money(abs)} shortage detected! Please recount or notify your manager immediately.`
    };
  };

  const { mood, message } = getBotFeedback();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="bg-red-600 text-white p-4 rounded-t-xl">
          <h2 className="text-xl font-bold">End Shift</h2>
          <p className="text-red-100 text-sm">Complete your cash count</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Recon Bot */}
          <ReconciliationAssistant mood={mood} message={message} />

          {/* Shift Summary */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Opening Cash:</span>
              <span className="font-medium">{money(parseFloat(shift?.opening_cash || 0))}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Cash Sales:</span>
              <span className="font-medium">{money(parseFloat(shift?.cash_sales || 0))}</span>
            </div>
            <div className="flex justify-between border-t pt-2 font-bold">
              <span>Expected Cash:</span>
              <span className="text-cyan-600">{money(expectedCash || 0)}</span>
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>Total Sales:</span>
              <span>{money(parseFloat(shift?.running_total || 0))}</span>
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>Orders:</span>
              <span>{shift?.order_count || 0}</span>
            </div>
          </div>

          {/* Cash Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Actual Cash Count (Php)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={closingCash}
              onChange={(e) => setClosingCash(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-cyan-500 text-lg"
              placeholder="0.00"
              required
              autoFocus
            />
          </div>

          {/* Variance Badge */}
          {closingCash && (
            <div className={`p-3 rounded-lg ${variance === 0 ? 'bg-green-50 text-cyan-800' :
              Math.abs(variance) <= 5 ? 'bg-green-50 text-cyan-800' :
                Math.abs(variance) <= 50 ? 'bg-amber-50 text-amber-800' :
                  'bg-red-50 text-red-800'
              }`}>
              <div className="flex justify-between items-center font-medium">
                <span>Variance:</span>
                <span className={
                  variance >= 0 ? 'text-cyan-600' :
                    Math.abs(variance) <= 50 ? 'text-amber-600' :
                      'text-red-600'
                }>
                  {variance >= 0 ? '+' : ''}Php {variance.toFixed(2)}
                  {variance > 0 ? ' (OVER)' : variance < 0 ? ' (SHORT)' : ' (EXACT)'}
                </span>
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              End of Shift Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-cyan-500"
              placeholder="Any notes about the shift..."
              rows={2}
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || (closingCash && Math.abs(variance) > 50 && mood === 'alert'
                ? false  // still allow submit even on alert, just warn
                : false
              )}
              className={`flex-1 py-3 text-white rounded-lg font-medium transition-colors disabled:opacity-50 ${mood === 'alert' && closingCash
                ? 'bg-red-600 hover:bg-red-700'
                : mood === 'warn' && closingCash
                  ? 'bg-amber-500 hover:bg-amber-600'
                  : 'bg-red-600 hover:bg-red-700'
                }`}
            >
              {isLoading ? 'Ending...' :
                mood === 'alert' && closingCash ? '⚠️ End Shift Anyway' :
                  'End Shift'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Shift Report Modal
function ShiftReportModal({ report, onClose }) {
  const formatTime = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="bg-cyan-600 text-white p-4 rounded-t-xl sticky top-0">
          <h2 className="text-xl font-bold">Shift Report</h2>
          <p className="text-cyan-100 text-sm">{report.employee_name}</p>
        </div>
        <div className="p-6 space-y-6">
          {/* Time Info */}
          <div className="text-center border-b pb-4">
            <p className="text-gray-600 text-sm">{formatDate(report.start_time)}</p>
            <p className="text-lg font-medium">{formatTime(report.start_time)} - {formatTime(report.end_time)}</p>
          </div>

          {/* Sales Summary */}
          <div>
            <h3 className="font-bold text-gray-800 mb-3">SALES SUMMARY</h3>
            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <div className="flex justify-between text-lg font-bold">
                <span>Total Sales:</span>
                <span className="text-cyan-600">Php {(report.total_sales || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Total Orders:</span>
                <span>{report.order_count || 0}</span>
              </div>
            </div>
          </div>

          {/* By Payment Method */}
          {report.sales_by_method && Object.keys(report.sales_by_method).length > 0 && (
            <div>
              <h3 className="font-bold text-gray-800 mb-3">BY PAYMENT METHOD</h3>
              <div className="space-y-2">
                {Object.entries(report.sales_by_method).map(([method, data]) => (
                  <div key={method} className="flex justify-between items-center bg-gray-50 px-4 py-2 rounded">
                    <span className="capitalize">{method}</span>
                    <div className="text-right">
                      <span className="font-medium">Php {data.total.toFixed(2)}</span>
                      <span className="text-gray-500 text-sm ml-2">({data.count} orders)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cash Drawer */}
          <div>
            <h3 className="font-bold text-gray-800 mb-3">CASH DRAWER</h3>
            <div className="bg-gray-50 p-4 rounded-lg space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Opening Cash:</span>
                <span>Php {(report.opening_cash || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>+ Cash Sales:</span>
                <span>Php {((report.sales_by_method?.cash?.total) || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t pt-2 font-medium">
                <span>Expected Cash:</span>
                <span>Php {(report.expected_cash || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>Actual Count:</span>
                <span>Php {(report.closing_cash || 0).toFixed(2)}</span>
              </div>
              <div className={`flex justify-between font-bold pt-2 border-t ${report.cash_variance >= 0 ? 'text-cyan-600' : 'text-red-600'}`}>
                <span>Variance:</span>
                <span>
                  {report.cash_variance >= 0 ? '+' : ''}Php {(report.cash_variance || 0).toFixed(2)}
                  {report.cash_variance > 0 ? ' (OVER)' : report.cash_variance < 0 ? ' (SHORT)' : ''}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full py-3 bg-cyan-600 text-white rounded-lg font-medium hover:bg-cyan-700 transition-colors"
          >
            Close Report
          </button>
        </div>
      </div>
    </div>
  );
}

// POS (Point of Sale) Page
function POSPage({ menuData, isLoading, currentShift, employee, onEndShift, onStartShift, onRefreshShift, onRefreshProducts, categories, taxRate, currencySymbol, formatMoney, lastOrderData, setLastOrderData, sysConfig, setPrintMode }) {
  const { cartItems, addToCart, removeFromCart, updateQuantity, setItemNotes, getTotalPrice, clearCart } = useCart();
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [serviceType, setServiceType] = useState('dine-in');
  const [amountReceived, setAmountReceived] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [scannerBuffer, setScannerBuffer] = useState('');
  const [lastKeyTime, setLastKeyTime] = useState(0);
  const [showScanner, setShowScanner] = useState(false);
  const [scannerError, setScannerError] = useState('');
  const [activeCameraLabel, setActiveCameraLabel] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scannerMode, setScannerMode] = useState('native'); // native | html5
  const [scannerErrorDetail, setScannerErrorDetail] = useState('');
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const html5ScannerRef = useRef(null);
  const html5ScriptPromiseRef = useRef(null);

  // Customer state for credit purchases
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerSearchResults, setCustomerSearchResults] = useState([]);
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [isSearchingCustomer, setIsSearchingCustomer] = useState(false);

  // Note editing state
  const [editingNoteIndex, setEditingNoteIndex] = useState(null);

  // Success overlay state
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);
  const [successOrderNumber, setSuccessOrderNumber] = useState('');
  const [successChange, setSuccessChange] = useState(0);
  const [successMessage, setSuccessMessage] = useState('');
  const [isRefreshingStock, setIsRefreshingStock] = useState(false);

  // Discount state
  const [discountType, setDiscountType] = useState(null); // 'senior', 'pwd', 'loyalty', 'custom'
  const [customDiscountPercent, setCustomDiscountPercent] = useState('');
  const [customDiscountAmount, setCustomDiscountAmount] = useState('');

  // Table management state
  const [tables, setTables] = useState([]);
  const [showTableView, setShowTableView] = useState(false);
  const [selectedTable, setSelectedTable] = useState(null);
  const [isAddingToTable, setIsAddingToTable] = useState(false);
  const [tableCheck, setTableCheck] = useState(null);
  const [showBillOutModal, setShowBillOutModal] = useState(false);
  const [billOutTable, setBillOutTable] = useState(null);
  const [billOutOrder, setBillOutOrder] = useState(null);
  const [billPaymentMethod, setBillPaymentMethod] = useState('cash');
  const [billAmountReceived, setBillAmountReceived] = useState('');
  const [billCustomer, setBillCustomer] = useState(null);
  const [billCustomerSearch, setBillCustomerSearch] = useState('');
  const [billCustomerResults, setBillCustomerResults] = useState([]);
  const [billDiscount, setBillDiscount] = useState(0);
  const [splitPaymentMode, setSplitPaymentMode] = useState(false);
  const [splitPayments, setSplitPayments] = useState([{ method: 'cash', amount: '', reference: '' }]);
  const [showSplitCheckModal, setShowSplitCheckModal] = useState(false);
  const [splitCheckItems, setSplitCheckItems] = useState([]);
  const [tableOrders, setTableOrders] = useState([]);
  const [showOrderSelectModal, setShowOrderSelectModal] = useState(false);
  const [isTabletOrderPanelOpen, setIsTabletOrderPanelOpen] = useState(false);

  // Ready order alerts
  const [readyOrders, setReadyOrders] = useState([]);
  const [knownReadyIds, setKnownReadyIds] = useState(new Set());
  const [showReadyAlert, setShowReadyAlert] = useState(false);
  const [latestReadyOrder, setLatestReadyOrder] = useState(null);
  const money = formatMoney;

  // Void/Comp state
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustItem, setAdjustItem] = useState(null);
  const [adjustType, setAdjustType] = useState('void');
  const [adjustReason, setAdjustReason] = useState('');

  // Poll for ready orders
  useEffect(() => {
    const checkReadyOrders = async () => {
      try {
        const res = await fetchWithAuth(`${API_URL}/orders?status=completed&limit=10`);
        const data = await res.json();
        if (data.success && data.orders) {
          const currentIds = new Set(data.orders.map(o => o.id));
          // Find newly completed orders
          for (const order of data.orders) {
            if (!knownReadyIds.has(order.id)) {
              // New ready order detected
              setLatestReadyOrder(order);
              setShowReadyAlert(true);
              // Play notification sound
              try {
                const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                const playTone = (freq, start, dur) => {
                  const osc = audioCtx.createOscillator();
                  const gain = audioCtx.createGain();
                  osc.connect(gain);
                  gain.connect(audioCtx.destination);
                  osc.frequency.value = freq;
                  osc.type = 'sine';
                  gain.gain.setValueAtTime(0.3, audioCtx.currentTime + start);
                  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + start + dur);
                  osc.start(audioCtx.currentTime + start);
                  osc.stop(audioCtx.currentTime + start + dur);
                };
                playTone(880, 0, 0.15);
                playTone(1100, 0.18, 0.15);
                playTone(1320, 0.36, 0.3);
              } catch (e) { /* audio not available */ }
              // Auto-dismiss after 8 seconds
              setTimeout(() => setShowReadyAlert(false), 8000);
              break;
            }
          }
          setKnownReadyIds(currentIds);
        }
      } catch (err) { /* silent fail */ }
    };
    checkReadyOrders();
    const interval = setInterval(checkReadyOrders, 10000);
    return () => clearInterval(interval);
  }, [knownReadyIds]);

  // Fetch tables
  const fetchTables = async () => {
    try {
      const response = await fetchWithAuth(`${API_URL}/tables`);
      const result = await response.json();
      if (result.success) setTables(result.tables || []);
    } catch (error) {
      console.error('Error fetching tables:', error);
    }
  };

  useEffect(() => {
    fetchTables();
    const interval = setInterval(fetchTables, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 1024px)');
    const handleViewport = (event) => {
      if (event.matches) {
        setIsTabletOrderPanelOpen(false);
      }
    };
    if (mediaQuery.matches) {
      setIsTabletOrderPanelOpen(false);
    }
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleViewport);
      return () => mediaQuery.removeEventListener('change', handleViewport);
    }
    mediaQuery.addListener(handleViewport);
    return () => mediaQuery.removeListener(handleViewport);
  }, []);

  // Fetch check for a table
  const fetchTableCheck = async (tableId) => {
    try {
      const response = await fetchWithAuth(`${API_URL}/tables/${tableId}/check`);
      const result = await response.json();
      if (result.success) return result;
      return null;
    } catch (error) {
      console.error('Error fetching check:', error);
      return null;
    }
  };

  // Open check on table
  const openCheckOnTable = async (tableId) => {
    if (cartItems.length === 0) {
      alert('Cart is empty! Add items before opening a check.');
      return;
    }
    try {
      const response = await fetchWithAuth(`${API_URL}/tables/${tableId}/open-check`, {
        method: 'POST',
        body: JSON.stringify({
          items: cartItems.map(item => ({
            id: item.id,
            product_id: item.isCombo ? null : item.id,
            isCombo: item.isCombo || false,
            name: item.name,
            selectedSize: item.selectedSize,
            quantity: item.quantity,
            price: item.price,
            notes: item.notes || null
          })),
          shift_id: currentShift?.id || null
        })
      });
      const result = await response.json();
      if (result.success) {
        const tableNum = selectedTable?.table_number || '';
        clearCart();
        setSelectedTable(null);
        setShowTableView(false);
        setSuccessOrderNumber(result.orderNumber);
        setSuccessChange(0);
        setSuccessMessage(`Charged to Table ${tableNum}`);
        setShowSuccessOverlay(true);
        fetchTables();
        if (onRefreshShift) onRefreshShift();
      } else if (result.error?.includes('occupied')) {
        // If it failed because it's already occupied, try adding to it instead
        console.warn('Table already occupied, attempting to add items instead...');
        addItemsToTable(tableId);
      } else {
        alert(result.error || 'Failed to open check');
      }
    } catch (error) {
      console.error('Error opening check:', error);
      alert('Network error: Failed to open check');
    }
  };

  // Add items to existing table check
  const addItemsToTable = async (tableId) => {
    if (cartItems.length === 0) {
      alert('Cart is empty!');
      return;
    }
    try {
      const response = await fetchWithAuth(`${API_URL}/tables/${tableId}/add-items`, {
        method: 'POST',
        body: JSON.stringify({
          items: cartItems.map(item => ({
            id: item.id,
            product_id: item.isCombo ? null : item.id,
            isCombo: item.isCombo || false,
            name: item.name,
            selectedSize: item.selectedSize,
            quantity: item.quantity,
            price: item.price
          }))
        })
      });
      const result = await response.json();
      if (result.success) {
        const tableNum = selectedTable?.table_number || '';
        clearCart();
        setIsAddingToTable(false);
        setSelectedTable(null);
        setShowTableView(false);
        setSuccessOrderNumber(result.order?.order_number || '');
        setSuccessChange(0);
        setSuccessMessage(`Items Added to Table ${tableNum}`);
        setShowSuccessOverlay(true);
        fetchTables();
        if (onRefreshShift) onRefreshShift();
      } else {
        alert(result.error || 'Failed to add items');
      }
    } catch (error) {
      console.error('Error adding items:', error);
      alert('Failed to add items');
    }
  };

  // Bill out table
  const processBillOut = async () => {
    if (!billOutTable || !billOutOrder) return;
    const orderTotal = parseFloat(billOutOrder.total_amount);
    const finalTotal = orderTotal - billDiscount;

    if (splitPaymentMode) {
      // Validate split payments
      const totalPaid = splitPayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
      if (totalPaid < finalTotal) {
        alert(`Split payments total (Php ${totalPaid.toFixed(2)}) is less than order total (Php ${finalTotal.toFixed(2)})`);
        return;
      }
      const hasCreditPayment = splitPayments.some(p => p.method === 'credit');
      if (hasCreditPayment && !billCustomer) {
        alert('Please select a customer for credit payment');
        return;
      }
    } else {
      const received = parseFloat(billAmountReceived) || 0;
      if (billPaymentMethod === 'cash' && received < finalTotal) {
        alert('Insufficient amount received!');
        return;
      }
      if (billPaymentMethod === 'credit' && !billCustomer) {
        alert('Please select a customer for credit purchase');
        return;
      }
    }

    try {
      const body = {
        customer_id: billCustomer?.id || null,
        discount_amount: billDiscount,
        order_id: billOutOrder.id
      };

      if (splitPaymentMode) {
        body.payment_method = 'split';
        body.payments = splitPayments.map(p => ({
          method: p.method,
          amount: parseFloat(p.amount) || 0,
          reference: p.reference || null,
          amount_received: p.method === 'cash' ? parseFloat(p.amount_received || p.amount) : undefined
        }));
      } else {
        const received = parseFloat(billAmountReceived) || 0;
        body.payment_method = billPaymentMethod;
        body.payment_reference = billPaymentMethod === 'cash' ? `Cash: ${received.toFixed(2)}` : null;
        body.amount_received = received;
      }

      const response = await fetchWithAuth(`${API_URL}/tables/${billOutTable.id}/bill-out`, {
        method: 'POST',
        body: JSON.stringify(body)
      });
      const result = await response.json();
      if (result.success) {
        // Capture order for printing
        setLastOrderData({
          orderNumber: result.orderNumber,
          items: (billOutOrder.items || []).map(item => ({
            name: item.product_name || item.name,
            quantity: item.quantity,
            price: parseFloat(item.price || item.subtotal / item.quantity || 0),
            selectedSize: item.size_name || item.selectedSize,
            notes: item.notes
          })),
          subtotal: parseFloat(billOutOrder.subtotal || 0),
          tax_amount: parseFloat(billOutOrder.tax_amount || 0),
          discount_amount: (parseFloat(billOutOrder.discount_amount) || 0) + (billDiscount || 0),
          total_amount: (parseFloat(billOutOrder.total_amount) || 0) - (billDiscount || 0),
          payment_method: splitPaymentMode ? 'split' : billPaymentMethod,
          amount_received: splitPaymentMode ?
            splitPayments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0) :
            parseFloat(billAmountReceived || 0),
          change: result.change || 0,
          date: new Date(),
          service_type: 'dine-in',
          customerName: billCustomer?.name
        });

        setShowBillOutModal(false);
        setBillOutTable(null);
        setBillOutOrder(null);
        setBillPaymentMethod('cash');
        setBillAmountReceived('');
        setBillCustomer(null);
        setBillDiscount(0);
        setSplitPaymentMode(false);
        setSplitPayments([{ method: 'cash', amount: '', reference: '' }]);
        setSuccessOrderNumber(result.orderNumber);
        setSuccessChange(result.change || 0);
        setSuccessMessage(`Table ${result.table} Billed Out`);
        setShowSuccessOverlay(true);
        fetchTables();
        if (onRefreshShift) onRefreshShift();
      } else {
        alert(result.error || 'Failed to bill out');
      }
    } catch (error) {
      console.error('Error billing out:', error);
      alert('Failed to bill out');
    }
  };

  // Split check - move items to a new order
  const processSplitCheck = async () => {
    if (!billOutTable || !billOutOrder || splitCheckItems.length === 0) return;
    try {
      const response = await fetchWithAuth(`${API_URL}/tables/${billOutTable.id}/split-check`, {
        method: 'POST',
        body: JSON.stringify({ item_ids: splitCheckItems })
      });
      const result = await response.json();
      if (result.success) {
        setBillOutOrder(result.originalOrder);
        setShowSplitCheckModal(false);
        setSplitCheckItems([]);
        alert(`Check split! New check: ${result.splitOrder.order_number}`);
      } else {
        alert(result.error || 'Failed to split check');
      }
    } catch (error) {
      console.error('Error splitting check:', error);
      alert('Failed to split check');
    }
  };

  // Fetch all open orders for a table (for split check scenario)
  const fetchTableOrders = async (tableId) => {
    try {
      const response = await fetchWithAuth(`${API_URL}/tables/${tableId}/orders`);
      const result = await response.json();
      if (result.success) {
        setTableOrders(result.orders);
        return result.orders;
      }
    } catch (error) {
      console.error('Error fetching table orders:', error);
    }
    return [];
  };

  // Void/comp an item
  const processAdjustment = async () => {
    if (!adjustItem || !adjustReason.trim()) {
      alert('Please select a reason');
      return;
    }
    try {
      const response = await fetchWithAuth(`${API_URL}/orders/${billOutOrder.id}/items/${adjustItem.id}/adjust`, {
        method: 'POST',
        body: JSON.stringify({ type: adjustType, reason: adjustReason, created_by: 'POS' })
      });
      const result = await response.json();
      if (result.success) {
        setBillOutOrder(result.order);
        setShowAdjustModal(false);
        setAdjustItem(null);
        setAdjustReason('');
      } else {
        alert(result.error || 'Failed to process adjustment');
      }
    } catch (error) {
      console.error('Error processing adjustment:', error);
      alert('Failed to process adjustment');
    }
  };

  // Table action modal state
  const [showTableActionModal, setShowTableActionModal] = useState(false);
  const [actionTable, setActionTable] = useState(null);

  // Update table status
  const updateTableStatus = async (tableId, status) => {
    try {
      const response = await fetchWithAuth(`${API_URL}/tables/${tableId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status })
      });
      const result = await response.json();
      if (result.success) {
        fetchTables();
        setShowTableActionModal(false);
        setActionTable(null);
      } else {
        alert(result.error || 'Failed to update status');
      }
    } catch (error) {
      console.error('Error updating table status:', error);
      alert('Failed to update table status');
    }
  };

  // Handle table click
  const handleTableClick = async (table) => {
    const isWaiter = employee?.role === 'waiter';
    if (table.status === 'occupied') {
      if (isWaiter) {
        // Waiters go directly to add-items mode, cannot bill out
        setSelectedTable(table);
        setIsAddingToTable(true);
        setShowTableView(false);
        return;
      }
      // Check if table has multiple open orders (split checks)
      const orders = await fetchTableOrders(table.id);
      if (orders.length > 1) {
        // Multiple checks - show order selection
        setTableOrders(orders);
        setBillOutTable(table);
        setShowOrderSelectModal(true);
      } else {
        // Single check - show bill-out directly
        const checkData = await fetchTableCheck(table.id);
        if (checkData) {
          setBillOutTable(checkData.table);
          setBillOutOrder(checkData.order);
          setShowBillOutModal(true);
        }
      }
    } else {
      // Show action modal for non-occupied tables
      setActionTable(table);
      setShowTableActionModal(true);
    }
  };

  // Search customers by name or phone
  const searchCustomer = async (query) => {
    if (query.trim().length < 2) {
      setCustomerSearchResults([]);
      setIsSearchingCustomer(false);
      return;
    }
    setIsSearchingCustomer(true);
    try {
      const response = await fetchWithAuth(`${API_URL}/customers/search?query=${encodeURIComponent(query)}`);
      const result = await response.json();
      if (result.success) {
        setCustomerSearchResults(result.customers || []);
      } else {
        setCustomerSearchResults([]);
      }
    } catch (error) {
      console.error('Customer search error:', error);
      setCustomerSearchResults([]);
    } finally {
      setIsSearchingCustomer(false);
    }
  };

  // Debounced customer search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (customerSearch) searchCustomer(customerSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [customerSearch]);

  // Global keyboard listener for barcode scanner
  useEffect(() => {
    let bufferTimeout;

    const handleKeyDown = (e) => {
      // Ignore if typing in an input field (except barcode input)
      if (e.target.tagName === 'INPUT' && e.target.id !== 'barcode-input') return;
      if (e.target.tagName === 'TEXTAREA') return;
      if (showPaymentModal) return;

      const currentTime = Date.now();
      const timeDiff = currentTime - lastKeyTime;

      // Barcode scanners type very fast (< 50ms between keys)
      if (timeDiff > 100) {
        setScannerBuffer('');
      }

      setLastKeyTime(currentTime);

      if (e.key === 'Enter' && scannerBuffer.length > 0) {
        e.preventDefault();
        lookupBarcode(scannerBuffer);
        setScannerBuffer('');
      } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        setScannerBuffer(prev => prev + e.key);

        // Clear buffer after 100ms of no input
        clearTimeout(bufferTimeout);
        bufferTimeout = setTimeout(() => setScannerBuffer(''), 100);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(bufferTimeout);
    };
  }, [scannerBuffer, lastKeyTime, showPaymentModal]);

  // Lookup product by barcode and add to cart
  const lookupBarcode = async (barcode) => {
    try {
      const response = await fetchWithAuth(`${API_URL}/products/barcode/${barcode}`);
      const result = await response.json();

      if (result.success && result.product) {
        handleQuickAdd(result.product);
        setBarcodeInput('');
      } else {
        alert(`Product not found for barcode: ${barcode}`);
      }
    } catch (error) {
      console.error('Error looking up barcode:', error);
      alert('Error looking up barcode. Please try again.');
    }
  };

  // Handle manual barcode input
  const handleBarcodeSubmit = (e) => {
    e.preventDefault();
    if (barcodeInput.trim()) {
      lookupBarcode(barcodeInput.trim());
    }
  };

  const stopScanner = () => {
    try {
      setScannerMode('native');
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
      if (html5ScannerRef.current) {
        html5ScannerRef.current.stop().catch(() => { });
        html5ScannerRef.current.clear().catch(() => { });
        html5ScannerRef.current = null;
      }
    } catch (e) {
      // ignore
    }
    setIsScanning(false);
    setShowScanner(false);
    setActiveCameraLabel(null);
  };

  useEffect(() => stopScanner, []);

  const handleScanResult = (code) => {
    if (!code) return;
    lookupBarcode(code);
    stopScanner();
  };

  const startScanner = async () => {
    if (isScanning) return;
    stopScanner();
    setScannerError('');
    setScannerErrorDetail('');
    setShowScanner(true);
    setIsScanning(true);
    setScannerMode('native');
    try {
      // Try to pick a rear-facing camera deviceId when available
      let preferredDeviceId = null;
      let chosenLabel = null;
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter(d => d.kind === 'videoinput');
        const rear = videoInputs.find(d => /rear|back|environment/i.test(d.label));
        const first = videoInputs[0];
        if (rear) {
          preferredDeviceId = rear.deviceId;
          chosenLabel = rear.label || 'Rear camera';
        } else if (videoInputs.length === 1) {
          preferredDeviceId = first.deviceId;
          chosenLabel = first.label || 'Camera';
        }
      } catch (e) {
        console.warn('Could not enumerate devices for camera selection:', e && e.message ? e.message : e);
      }

      // Preferred: native BarcodeDetector
      if ('BarcodeDetector' in window) {
        const videoConstraints = preferredDeviceId ? { deviceId: { exact: preferredDeviceId } } : { facingMode: 'environment' };
        const stream = await navigator.mediaDevices.getUserMedia({ video: videoConstraints });
        streamRef.current = stream;
        try {
          const track = stream.getVideoTracks()[0];
          if (track && track.label) setActiveCameraLabel(track.label);
          else if (chosenLabel) setActiveCameraLabel(chosenLabel);
          else setActiveCameraLabel('Camera');
        } catch (e) {
          // ignore
        }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => { });
        }

        const detector = new window.BarcodeDetector({ formats: ['qr_code', 'ean_13', 'ean_8', 'code_128', 'upc_a', 'upc_e'] });
        const scanFrame = async () => {
          if (!isScanning || !videoRef.current) return;
          try {
            const barcodes = await detector.detect(videoRef.current);
            if (barcodes.length > 0) {
              handleScanResult(barcodes[0].rawValue);
              return;
            }
          } catch (e) { /* ignore frame errors */ }
          requestAnimationFrame(scanFrame);
        };
        requestAnimationFrame(scanFrame);
        return;
      }

      // Fallback: html5-qrcode via local dependency (bundled)
      let Html5Qrcode, Html5QrcodeSupportedFormats;
      try {
        const mod = await import('html5-qrcode');
        Html5Qrcode = mod.Html5Qrcode;
        Html5QrcodeSupportedFormats = mod.Html5QrcodeSupportedFormats;
      } catch (cdnErr2) {
        console.error('Scanner library load failed:', cdnErr2);
        setScannerError('Scanner library not available. Please install html5-qrcode or use manual barcode entry.');
        setIsScanning(false);
        return;
      }

      if (!Html5Qrcode) {
        setScannerError('Scanner library not available. Please use manual barcode entry.');
        setIsScanning(false);
        return;
      }

      const html5 = new Html5Qrcode('html5-scanner-container', {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
        ]
      });
      html5ScannerRef.current = html5;
      setScannerMode('html5');
      const startCameraConfig = preferredDeviceId ? { deviceId: { exact: preferredDeviceId } } : { facingMode: 'environment' };
      if (chosenLabel && !activeCameraLabel) setActiveCameraLabel(chosenLabel);
      html5.start(
        startCameraConfig,
        { fps: 10, qrbox: { width: 260, height: 260 } },
        (decodedText) => handleScanResult(decodedText),
        () => { }
      ).catch(err => {
        setScannerError(err?.message || 'Unable to start camera');
        setIsScanning(false);
      });
    } catch (err) {
      console.error('Scanner error:', err);
      const msg = err?.message || 'Unable to access camera. Please check permissions.';
      setScannerError(msg);
      setScannerErrorDetail(err?.name ? `${err.name}: ${msg}` : msg);
      setIsScanning(false);
      setShowScanner(true);
    }
  };

  const filteredItems = (menuData || []).filter(item => {
    const isActive = item.active !== false;
    const matchesSearch = !barcodeInput.trim() ||
      String(item.name || '').toLowerCase().includes(barcodeInput.toLowerCase()) ||
      (item.barcode && String(item.barcode).toLowerCase().includes(barcodeInput.toLowerCase())) ||
      (item.sku && String(item.sku).toLowerCase().includes(barcodeInput.toLowerCase()));
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    return isActive && matchesSearch && matchesCategory;
  });

  // Calculate discount amount
  const getDiscountAmount = () => {
    const subtotal = getTotalPrice();
    if (discountType === 'senior' || discountType === 'pwd') {
      return subtotal * 0.20; // 20% discount for senior/PWD
    } else if (discountType === 'loyalty') {
      const discountPercent = selectedCustomer?.loyalty_discount || 0;
      return subtotal * (parseFloat(discountPercent) / 100);
    } else if (discountType === 'custom') {
      if (customDiscountPercent) {
        return subtotal * (parseFloat(customDiscountPercent) / 100);
      } else if (customDiscountAmount) {
        return Math.min(parseFloat(customDiscountAmount) || 0, subtotal);
      }
    }
    return 0;
  };

  const discountAmountRaw = getDiscountAmount();
  const discountAmount = Math.round(discountAmountRaw * 100) / 100;
  const discountedSubtotal = getTotalPrice() - discountAmount;
  const tax = Math.round((discountedSubtotal * (parseFloat(taxRate || 0) / 100)) * 100) / 100;
  const total = Math.round((discountedSubtotal + tax) * 100) / 100;

  // Reset discount when modal closes
  const resetDiscount = () => {
    setDiscountType(null);
    setCustomDiscountPercent('');
    setCustomDiscountAmount('');
  };

  const handleAmountKeypadInput = (key) => {
    setAmountReceived((prev) => {
      const current = String(prev || '');
      if (key === 'clear') return '';
      if (key === 'backspace') return current.slice(0, -1);
      if (key === '.') {
        if (current.includes('.')) return current;
        return current ? `${current}.` : '0.';
      }
      if (key === '00') {
        if (!current || current === '0') return '0';
        return `${current}00`;
      }
      if (!/^\d$/.test(key)) return current;
      return current === '0' ? key : `${current}${key}`;
    });
  };

  const playRegisterBeep = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const bufferSize = Math.floor(ctx.sampleRate * 0.02);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
      }
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 3000;
      filter.Q.value = 0.8;
      const gain = ctx.createGain();
      source.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      gain.gain.setValueAtTime(0.6, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.02);
      source.start(ctx.currentTime);
    } catch (_) { }
  };

  const handleQuickAdd = (item) => {
    playRegisterBeep();
    if (item.sizes) {
      // For items with sizes, add the smallest size by default
      const smallestSize = item.sizes.reduce((min, size) => size.price < min.price ? size : min, item.sizes[0]);
      addToCart(item, smallestSize);
    } else {
      addToCart(item);
    }
  };

  const handlePayment = () => {
    if (cartItems.length === 0) {
      alert('Cart is empty!');
      return;
    }
    setShowPaymentModal(true);
  };

  const processPayment = async () => {
    const received = parseFloat(amountReceived) || 0;
    if (paymentMethod === 'cash' && received < total) {
      alert('Insufficient amount received!');
      return;
    }

    // Credit purchase requires a customer
    if (paymentMethod === 'credit') {
      if (!selectedCustomer) {
        alert('Please select a customer for credit purchase');
        return;
      }
      const availableCredit = parseFloat(selectedCustomer.credit_limit) - parseFloat(selectedCustomer.credit_balance);
      if (total > availableCredit) {
        alert(`Insufficient credit! Available: Php ${availableCredit.toFixed(2)}`);
        return;
      }
    }

    try {
      // Save order to PostgreSQL
      const response = await fetchWithAuth(`${API_URL}/orders`, {
        method: 'POST',
        body: JSON.stringify({
          items: cartItems.map(item => ({
            id: item.id,
            product_id: item.isCombo ? null : item.id,
            size_id: item.size_id || null, // PASS THE SIZE ID
            isCombo: item.isCombo || false,
            name: item.name,
            selectedSize: item.selectedSize,
            quantity: item.quantity,
            price: item.price,
            notes: item.notes || null
          })),
          subtotal: getTotalPrice(),
          delivery_fee: 0,
          tax_amount: tax,
          discount_amount: discountAmount,
          total_amount: total,
          payment_method: paymentMethod,
          payment_reference: paymentMethod === 'cash' ? `Cash: ${received.toFixed(2)}` :
            paymentMethod === 'credit' ? `Credit: ${selectedCustomer?.name}` : null,
          payment_status: paymentMethod === 'credit' ? 'credit' : 'paid',
          order_type: 'pos',
          service_type: serviceType,
          customer_id: selectedCustomer?.id || null,
          shift_id: currentShift?.id || null
        })
      });

      const result = await response.json();

      if (result.success) {
        const change = paymentMethod === 'cash' ? received - total : 0;

        // Capture order for printing
        setLastOrderData({
          orderNumber: result.orderNumber,
          items: cartItems.map(item => ({
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            selectedSize: item.selectedSize,
            notes: item.notes
          })),
          subtotal: getTotalPrice(),
          tax_amount: tax,
          discount_amount: discountAmount,
          total_amount: total,
          payment_method: paymentMethod,
          amount_received: received,
          change: change,
          date: new Date(),
          service_type: serviceType,
          customerName: selectedCustomer?.name
        });

        // If credit purchase, update customer balance
        if (paymentMethod === 'credit' && selectedCustomer) {
          await fetchWithAuth(`${API_URL}/customers/${selectedCustomer.id}/adjustment`, {
            method: 'POST',
            body: JSON.stringify({
              amount: total,
              notes: `Credit purchase - Order ${result.orderNumber}`,
              created_by: 'POS'
            })
          });
        }

        // Show success overlay
        setSuccessOrderNumber(result.orderNumber);
        setSuccessChange(change);
        setSuccessMessage('Payment Successful!');
        setShowPaymentModal(false);
        setShowSuccessOverlay(true);

        setIsRefreshingStock(true);
        try {
          // Refresh shift sales
          if (onRefreshShift) await onRefreshShift();
          // Refresh product stocks so Inventory view reflects latest standalone/composite deductions
          if (onRefreshProducts) await onRefreshProducts();
        } finally {
          setIsRefreshingStock(false);
        }

        // Clear cart and reset
        clearCart();
        setAmountReceived('');
        setServiceType('dine-in');
        setSelectedCustomer(null);
        setCustomerSearch('');
      } else {
        alert('Error saving order: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      const msg = error.message || 'Unknown network error';
      alert('Error saving order: ' + msg + '. Please try again or check connection.');
    }
  };

  const quickAmounts = [50, 100, 200, 500, 1000];

  // Handle payment - no shift requirement
  const handlePaymentWithShiftCheck = () => {
    handlePayment();
  };

  // Listen for mobile nav checkout button
  useEffect(() => {
    const handleOpenPayment = () => {
      handlePaymentWithShiftCheck();
    };
    window.addEventListener('pos-open-payment', handleOpenPayment);
    return () => window.removeEventListener('pos-open-payment', handleOpenPayment);
  }, [handlePaymentWithShiftCheck]);

  // Listen for mobile nav scan button
  useEffect(() => {
    const handleOpenScanner = () => {
      startScanner();
    };
    window.addEventListener('pos-open-scanner', handleOpenScanner);
    return () => window.removeEventListener('pos-open-scanner', handleOpenScanner);
  }, [startScanner]);

  return (
    <>
      <div className="bg-gray-200 h-full flex flex-col overflow-hidden">
        <div className="flex flex-col-reverse md:flex-row h-full md:gap-2 lg:gap-0">
          {/* Left Panel - Menu Items */}
          <div className="w-full md:flex-1 md:min-w-0 flex flex-col overflow-hidden flex-1">
            {/* Barcode Scanner Input */}
            <form onSubmit={handleBarcodeSubmit} className="bg-white pt-5 pb-1.5 px-1.5 md:p-2.5 lg:p-3 flex gap-1 md:gap-2 items-center">
              <div className="relative flex-1">
                <input
                  id="barcode-input"
                  type="text"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  placeholder="Search name or scan barcode..."
                  className="w-full pl-7 md:pl-10 pr-2 md:pr-4 py-1.5 md:py-2 bg-gray-100 focus:outline-none focus:bg-gray-50 text-xs md:text-base"
                  autoComplete="off"
                />
                <Search className="absolute left-2 md:left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-gray-400" />
              </div>
              <button
                type="submit"
                className="px-2 md:px-4 py-1.5 md:py-2 bg-cyan-600 text-white hover:bg-cyan-700 transition-colors font-medium text-xs md:text-base"
              >
                Add
              </button>
              <button
                type="button"
                onClick={startScanner}
                className="px-2 py-1.5 md:px-3 md:py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200 rounded-md transition-colors text-xs md:text-sm"
                title="Scan with camera"
              >
                <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7h2M4 17h2m12 0h2m-2-10h2M7 4h10a3 3 0 013 3v10a3 3 0 01-3 3H7a3 3 0 01-3-3V7a3 3 0 013-3zm5 3.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7z" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => setIsTabletOrderPanelOpen(true)}
                className="hidden md:inline-flex lg:hidden items-center gap-1 px-2 py-1.5 bg-cyan-600 text-white hover:bg-cyan-700 rounded-md transition-colors text-xs font-semibold"
                title="Open order panel"
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                <span>{cartItems.length}</span>
              </button>
            </form>

            {/* Category Tabs (mobile-friendly scrollable bar) */}
            <div className="flex bg-gray-100 p-2 md:p-2.5 lg:p-3 overflow-x-auto gap-2 scrollbar-hide border-b border-gray-200">
              {categories.map(category => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-3 md:px-4 py-1.5 md:py-2 rounded-md font-medium text-xs md:text-sm whitespace-nowrap transition-all ${selectedCategory === category
                    ? 'bg-cyan-600 text-white shadow-sm'
                    : 'bg-white text-gray-700 hover:bg-gray-200 border border-gray-200'
                    }`}
                >
                  {category.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Items Grid */}
            <div className="flex-1 overflow-y-auto p-2 md:p-3 lg:p-4 bg-gray-200 scrollbar-hide">
              {isLoading ? (
                <div className="text-center py-16">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600 mb-4"></div>
                  <p className="text-lg text-cyan-600 font-medium">Loading menu...</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-1 md:gap-2.5 lg:gap-2">
                  {filteredItems.map(item => (
                    <button
                      key={item.id}
                      onClick={() => handleQuickAdd(item)}
                      className="bg-white hover:bg-gray-50 text-left transition-all hover:shadow-md border border-gray-200 hover:border-cyan-500 group flex overflow-hidden h-16 md:h-28 lg:h-24"
                    >
                      {/* Left Half - Image */}
                      <div className="w-2/5 md:w-1/2 bg-gray-50 flex items-center justify-center p-1 md:p-2 overflow-hidden border-r border-gray-100">
                        {item.image && (item.image.startsWith('http') || item.image.startsWith('assets/') || item.image.startsWith('/')) ? (
                          <img src={item.image} alt={item.name} className="object-contain h-full w-full group-hover:scale-105 transition-transform" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-300 group-hover:scale-105 transition-transform">
                            {item.image && item.image.length < 5 ? (
                              <span className="text-2xl md:text-3xl">{item.image}</span>
                            ) : (
                              <UtensilsCrossed className="w-8 h-8 md:w-10 md:h-10 opacity-40" />
                            )}
                          </div>
                        )}
                      </div>
                      {/* Right Half - Description */}
                      <div className="w-3/5 md:w-1/2 p-1 md:p-2 flex flex-col justify-center">
                        <h3 className="text-gray-800 font-semibold text-xs md:text-sm leading-[1.3] md:leading-[1.35] mb-0.5 md:mb-1 line-clamp-2 min-h-[2.4em] md:min-h-[2.7em]">{item.name}</h3>
                        <p className="text-gray-500 text-[10px] md:text-xs line-clamp-1 md:line-clamp-2 hidden md:block">{item.description || item.category}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Mobile-only checkout actions (moved here from sidebar) */}
            {cartItems.length > 0 && !selectedTable && !showTableView && (
              <div className="md:hidden p-2 space-y-2 bg-white border-t border-gray-200 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] animate-slideUp">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setShowTableView(true)}
                    className="py-3 rounded-xl font-black text-xs transition-all bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase tracking-widest"
                  >
                    Save to Table
                  </button>
                  <button
                    onClick={handlePaymentWithShiftCheck}
                    className="py-3 rounded-xl font-black text-xs transition-all bg-cyan-600 text-white shadow-sm uppercase tracking-widest"
                  >
                    Quick Charge
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Tablet overlay backdrop */}
          {isTabletOrderPanelOpen && (
            <button
              type="button"
              className="hidden md:block lg:hidden fixed inset-0 bg-black/30 z-[64]"
              onClick={() => setIsTabletOrderPanelOpen(false)}
              aria-label="Close order panel backdrop"
            />
          )}

          {/* Right Panel - Order Summary */}
          <div className={`w-full md:w-[22rem] lg:w-96 xl:w-[26rem] bg-white flex flex-col overflow-hidden h-[52vh] md:h-[calc(100vh-104px)] lg:h-full flex-shrink-0 md:fixed md:top-[104px] md:right-0 md:z-[65] md:max-w-[92vw] md:border-l md:border-gray-200 md:shadow-2xl md:transition-transform md:duration-300 ${isTabletOrderPanelOpen ? 'md:translate-x-0' : 'md:translate-x-full'} lg:translate-x-0 lg:static lg:top-auto lg:right-auto lg:z-auto lg:shadow-none lg:border-l-0`}>
            {/* Header with Shift Info */}
            <div className={`${currentShift ? 'bg-cyan-600' : 'bg-yellow-600'} pt-5 pb-2 px-2 md:p-3 lg:p-4 flex-shrink-0`}>
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  {showTableView ? (
                    <button onClick={() => setShowTableView(false)} className="text-white hover:text-cyan-200">
                      <ArrowLeft className="w-4 h-4 md:w-5 md:h-5" />
                    </button>
                  ) : null}
                  <div>
                    <h2 className="text-white font-bold text-sm md:text-lg">
                      {showTableView ? 'Tables' : selectedTable ? `Table ${selectedTable.table_number}` : 'Current Order'}
                    </h2>
                    <p className={`${currentShift ? 'text-cyan-100' : 'text-yellow-100'} text-xs md:text-sm`}>
                      {showTableView ? `${tables.filter(t => t.status === 'occupied').length} occupied` : `${cartItems.length} item(s)`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setIsTabletOrderPanelOpen(false)}
                    className="hidden md:inline-flex lg:hidden bg-white/20 hover:bg-white/30 text-white p-1 rounded transition-colors"
                    title="Close panel"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                  {!showTableView && (
                    <button
                      onClick={() => setShowTableView(true)}
                      className="bg-white/20 hover:bg-white/30 text-white text-xs px-2 py-1 rounded transition-colors flex items-center gap-1"
                      title="Tables"
                    >
                      <LayoutGrid className="w-3 h-3 md:w-4 md:h-4" />
                      <span className="hidden md:inline text-xs">Tables</span>
                    </button>
                  )}
                  {employee?.role !== 'waiter' && (
                    currentShift ? (
                      <button
                        onClick={onEndShift}
                        className="hidden md:block bg-red-500 hover:bg-red-600 text-white text-xs px-2 py-1 rounded transition-colors"
                        title="End Shift"
                      >
                        End Shift
                      </button>
                    ) : (
                      <button
                        onClick={onStartShift}
                        className="bg-white text-yellow-600 hover:bg-yellow-50 text-xs px-2 py-1 rounded transition-colors font-medium"
                        title="Start Shift"
                      >
                        Start Shift
                      </button>
                    )
                  )}
                </div>
              </div>
              {/* Selected table indicator */}
              {selectedTable && !showTableView && (
                <div className="flex items-center justify-between mt-1 pt-1 border-t border-cyan-500">
                  <span className="text-cyan-100 text-xs">Dine-in → Table {selectedTable.table_number}</span>
                  <button onClick={() => { setSelectedTable(null); setIsAddingToTable(false); }} className="text-cyan-200 hover:text-white text-xs underline">Clear</button>
                </div>
              )}
              {/* Shift Running Total - Desktop only */}
              {currentShift && !selectedTable ? (
                <div className="hidden md:flex justify-between text-cyan-100 text-[11px] lg:text-xs mt-2 pt-2 border-t border-cyan-500">
                  <span>Shift Sales: Php {(currentShift?.running_total || 0).toFixed(2)}</span>
                  <span>{currentShift?.order_count || 0} orders</span>
                </div>
              ) : !currentShift ? (
                <div className="hidden md:block text-yellow-100 text-[11px] lg:text-xs mt-2 pt-2 border-t border-yellow-500">
                  No active shift - Start shift to track sales
                </div>
              ) : null}
            </div>

            {/* Cart Items OR Table Grid */}
            <div className="flex-1 overflow-y-auto bg-gray-50 scrollbar-hide">
              {showTableView ? (
                /* TABLE GRID VIEW */
                <div className="p-2 md:p-3">
                  <div className="grid grid-cols-2 md:grid-cols-2 gap-2 md:gap-3">
                    {tables.map(table => {
                      const statusColors = {
                        'available': 'bg-cyan-100 border-cyan-400 hover:bg-cyan-200',
                        'occupied': 'bg-red-100 border-red-400 hover:bg-red-200',
                        'reserved': 'bg-yellow-100 border-yellow-400 hover:bg-yellow-200',
                        'needs-cleaning': 'bg-gray-200 border-gray-400 hover:bg-gray-300'
                      };
                      const statusDot = {
                        'available': 'bg-cyan-500',
                        'occupied': 'bg-red-500',
                        'reserved': 'bg-yellow-500',
                        'needs-cleaning': 'bg-gray-500'
                      };
                      return (
                        <button
                          key={table.id}
                          onClick={() => handleTableClick(table)}
                          className={`${statusColors[table.status]} border-2 rounded-lg p-2 md:p-3 text-left transition-all`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-gray-800 text-sm md:text-base">T{table.table_number}</span>
                            <span className={`w-2.5 h-2.5 rounded-full ${statusDot[table.status]}`}></span>
                          </div>
                          <p className="text-[10px] md:text-xs text-gray-500">{table.section} · {table.capacity} seats</p>
                          {table.status === 'occupied' && (
                            <div className="mt-1 pt-1 border-t border-gray-300">
                              <p className="text-[10px] md:text-xs text-red-600 font-medium">
                                {table.item_count || 0} items · Php {parseFloat(table.order_total || 0).toFixed(2)}
                              </p>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-[10px] md:text-xs text-gray-500">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-cyan-500"></span>Available</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span>Occupied</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500"></span>Reserved</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-500"></span>Cleaning</span>
                  </div>
                </div>
              ) : (
                /* CART VIEW */
                <>
                  {cartItems.length === 0 ? (
                    <div className="text-center py-6 md:py-12">
                      <ShoppingCart className="w-10 h-10 md:w-16 md:h-16 text-gray-300 mx-auto mb-2 md:mb-3" />
                      <p className="text-gray-400 font-medium text-xs md:text-base">No items</p>
                      <p className="text-gray-400 text-xs hidden md:block">Tap items to add</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200">
                      {cartItems.map((item, index) => (
                        <div key={`${item.id}-${item.selectedSize || 'default'}-${index}`} className="bg-white px-2 md:px-3 py-1.5 md:py-2">
                          <div className="flex items-center gap-1 md:gap-2">
                            {/* Product Thumbnail */}
                            <div className="w-8 h-8 md:w-10 md:h-10 rounded-md overflow-hidden bg-gray-100 flex-shrink-0 flex items-center justify-center">
                              {item.image && (item.image.startsWith('http') || item.image.startsWith('assets/') || item.image.startsWith('/')) ? (
                                <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                              ) : item.image && item.image.length < 5 ? (
                                <span className="text-base md:text-lg">{item.image}</span>
                              ) : (
                                <UtensilsCrossed className="w-4 h-4 md:w-5 md:h-5 text-gray-300" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="text-gray-800 font-medium text-xs md:text-sm truncate block">
                                {item.name}{item.selectedSize ? ` (${item.selectedSize})` : ''}
                              </span>
                              {item.notes && editingNoteIndex !== index && (
                                <span className="text-gray-400 italic text-[10px] md:text-xs truncate block">{item.notes}</span>
                              )}
                            </div>
                            <button
                              onClick={() => setEditingNoteIndex(editingNoteIndex === index ? null : index)}
                              className={`p-0.5 md:p-1 transition-colors ${item.notes ? 'text-orange-500' : 'text-gray-300 hover:text-orange-400'}`}
                              title="Add note"
                            >
                              <Edit3 className="w-2.5 h-2.5 md:w-3 md:h-3" />
                            </button>
                            <div className="flex items-center gap-0.5 md:gap-1">
                              <button
                                onClick={() => updateQuantity(item.id, item.quantity - 1, item.selectedSize)}
                                className="bg-gray-100 hover:bg-gray-200 text-gray-600 p-0.5 md:p-1 transition-colors"
                              >
                                <Minus className="w-2.5 h-2.5 md:w-3 md:h-3" />
                              </button>
                              <span className="text-gray-800 font-semibold w-4 md:w-6 text-center text-xs md:text-sm">{item.quantity}</span>
                              <button
                                onClick={() => updateQuantity(item.id, item.quantity + 1, item.selectedSize)}
                                className="bg-cyan-600 hover:bg-cyan-700 text-white p-0.5 md:p-1 transition-colors"
                              >
                                <Plus className="w-2.5 h-2.5 md:w-3 md:h-3" />
                              </button>
                            </div>
                            <span className="text-cyan-600 font-bold text-xs md:text-sm w-12 md:w-20 text-right">{(item.price * item.quantity).toFixed(2)}</span>
                            <button
                              onClick={() => removeFromCart(item.id, item.selectedSize)}
                              className="text-gray-400 hover:text-red-500 p-0.5 md:p-1 transition-colors"
                            >
                              <Trash2 className="w-2.5 h-2.5 md:w-3 md:h-3" />
                            </button>
                          </div>
                          {editingNoteIndex === index && (
                            <div className="mt-1 flex gap-1">
                              <input
                                type="text"
                                value={item.notes || ''}
                                onChange={(e) => setItemNotes(item.id, e.target.value, item.selectedSize)}
                                placeholder="e.g. no onions, extra cheese..."
                                className="flex-1 text-[10px] md:text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-orange-400"
                                autoFocus
                                onKeyDown={(e) => { if (e.key === 'Enter') setEditingNoteIndex(null); }}
                              />
                              <button
                                onClick={() => setEditingNoteIndex(null)}
                                className="text-[10px] md:text-xs text-cyan-600 font-medium px-2"
                              >OK</button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>


            {/* Totals */}
            <div className="bg-white p-1.5 md:p-3 lg:p-4 space-y-0.5 md:space-y-2 border-t border-gray-200 flex-shrink-0">
              <div className="flex justify-between text-gray-600 text-[10px] md:text-sm">
                <span>Subtotal</span>
                <span>{money(getTotalPrice())}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-cyan-600 font-medium text-[10px] md:text-sm animate-fadeIn">
                  <span>Discount ({discountType === 'senior' ? 'Senior 20%' : discountType === 'pwd' ? 'PWD 20%' : discountType === 'loyalty' ? 'Loyalty 10%' : 'Custom'})</span>
                  <span>-{money(discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-600 text-[10px] md:text-sm">
                <span>Tax ({taxRate || 0}%)</span>
                <span>{money(tax)}</span>
              </div>
              <div className="flex justify-between text-gray-800 font-bold text-sm md:text-xl pt-0.5 md:pt-2 border-t border-gray-200">
                <span>Total</span>
                <span className="text-cyan-600">{money(total)}</span>
              </div>
            </div>

            {/* Action Buttons */}
            {!showTableView && (
              <div className="p-1.5 md:p-3 lg:p-4 space-y-1 md:space-y-2 bg-white border-t border-gray-100 flex-shrink-0">
                {/* Main action button - always use live status from the tables list */}
                {(() => {
                  const liveTable = tables?.find(t => t.id?.toString() === selectedTable?.id?.toString());
                  const isOccupied = liveTable?.status === 'occupied';

                  if (selectedTable && !isOccupied) {
                    return (
                      <button
                        onClick={() => openCheckOnTable(selectedTable.id)}
                        disabled={cartItems.length === 0}
                        className={`w-full py-3 md:py-5 rounded-xl font-black text-xs md:text-lg transition-all flex flex-col items-center justify-center gap-1 ${cartItems.length === 0
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg hover:shadow-indigo-200 active:scale-95'
                          }`}
                      >
                        <span className="uppercase tracking-widest text-[10px] opacity-80">Phase 1: Save Order</span>
                        <span>PLACE ORDER → TABLE {selectedTable.table_number}</span>
                      </button>
                    );
                  } else if (selectedTable && isOccupied) {
                    return (
                      <button
                        onClick={() => addItemsToTable(selectedTable.id)}
                        disabled={cartItems.length === 0}
                        className={`w-full py-3 md:py-5 rounded-xl font-black text-xs md:text-lg transition-all flex flex-col items-center justify-center gap-1 ${cartItems.length === 0
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-orange-600 text-white hover:bg-orange-700 shadow-lg hover:shadow-orange-200 active:scale-95'
                          }`}
                      >
                        <span className="uppercase tracking-widest text-[10px] opacity-80">Update Bill</span>
                        <span>ADD TO TABLE {selectedTable.table_number}</span>
                      </button>
                    );
                  }
                  return null;
                })()}

                {cartItems.length > 0 && !selectedTable ? (
                  /* Items in cart but no table selected */
                  <div className="hidden md:block">
                    <button
                      onClick={handlePaymentWithShiftCheck}
                      className="w-full py-3 md:py-4 rounded-xl font-black text-xs md:text-lg transition-all bg-cyan-600 text-white hover:bg-cyan-700 shadow-md"
                    >
                      CHARGE {money(total)} (NO TABLE)
                    </button>
                  </div>
                ) : employee?.role === 'waiter' ? (
                  /* Waiter — no direct charge, must use table view */
                  <button
                    onClick={() => { setShowTableView(true); }}
                    className="w-full py-2.5 md:py-4 rounded font-bold text-xs md:text-base transition-all bg-cyan-600 text-white hover:bg-cyan-700 shadow-md hover:shadow-lg"
                  >
                    Go to Tables
                  </button>
                ) : (
                  /* Normal charge */
                  <button
                    onClick={handlePaymentWithShiftCheck}
                    disabled={cartItems.length === 0}
                    className={`hidden md:block w-full py-2.5 md:py-4 rounded font-bold text-xs md:text-base transition-all ${cartItems.length === 0
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-cyan-600 text-white hover:bg-cyan-700 shadow-md hover:shadow-lg'
                      }`}
                  >
                    Charge {money(total)}
                  </button>
                )}
                <button
                  onClick={() => cartItems.forEach(item => removeFromCart(item.id, item.selectedSize))}
                  disabled={cartItems.length === 0}
                  className={`hidden md:block w-full py-2.5 rounded font-medium text-sm transition-all ${cartItems.length === 0
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-600'
                    }`}
                >
                  Clear Order
                </button>
                {/* Shift Button - Mobile only (no End Shift on mobile) */}
                {employee?.role !== 'waiter' && !currentShift && (
                  <button
                    onClick={onStartShift}
                    className="md:hidden w-full py-2 rounded font-medium text-xs bg-yellow-100 text-yellow-700 hover:bg-yellow-200 transition-all"
                  >
                    Start Shift
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {showPaymentModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-0 md:p-6 lg:p-10 font-dashboard">
            <div className="w-full max-w-[34rem] md:max-w-[calc(40rem-150px)] h-full md:h-[92vh] lg:h-auto md:max-h-[92vh] lg:max-h-[90vh] flex flex-col bg-white md:rounded-3xl shadow-2xl overflow-hidden relative">
              {/* Green Header */}
              <div className="bg-cyan-600 text-white px-5 py-4 flex-shrink-0">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-xl font-black tracking-tight uppercase">Process Payment</h2>
                    <p className="text-cyan-100 text-[10px] font-bold opacity-80">COMPLETE TRANSACTION • ORDER #{cartItems.length > 0 ? (Date.now() % 10000) : '0000'}</p>
                  </div>
                  <button
                    onClick={() => setShowPaymentModal(false)}
                    className="w-10 h-10 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full transition-all"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="flex-1 min-h-0 md:grid md:grid-cols-[150px_minmax(0,1fr)]">
                <div className={`hidden md:flex flex-col border-r border-gray-100 bg-gray-50 p-2 gap-2 ${paymentMethod === 'cash' ? '' : 'opacity-50'}`}>
                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider px-1 py-1">Numeric Keypad</div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'backspace'].map((key) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => handleAmountKeypadInput(key)}
                        disabled={paymentMethod !== 'cash'}
                        className="h-11 bg-white border border-gray-200 rounded-lg text-sm font-bold text-gray-700 hover:border-cyan-400 hover:text-cyan-700 hover:bg-cyan-50 transition-colors disabled:cursor-not-allowed disabled:hover:border-gray-200 disabled:hover:bg-white disabled:hover:text-gray-700"
                      >
                        {key === 'backspace' ? '⌫' : key}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 mt-auto">
                    <button
                      type="button"
                      onClick={() => handleAmountKeypadInput('clear')}
                      disabled={paymentMethod !== 'cash'}
                      className="h-10 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-600 hover:border-red-300 hover:text-red-600 hover:bg-red-50 transition-colors disabled:cursor-not-allowed"
                    >
                      Clear
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAmountKeypadInput('00')}
                      disabled={paymentMethod !== 'cash'}
                      className="h-10 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-600 hover:border-cyan-400 hover:text-cyan-700 hover:bg-cyan-50 transition-colors disabled:cursor-not-allowed"
                    >
                      00
                    </button>
                  </div>
                </div>

                <div className="overflow-y-auto scrollbar-hide p-3 md:p-4 space-y-3 pb-20">
                {/* Order Summary */}
                <div className="bg-green-50 border border-cyan-100 p-2 rounded-lg">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-gray-500">Items in Cart</span>
                    <span className="font-medium">{cartItems.reduce((sum, item) => sum + item.quantity, 0)}</span>
                  </div>
                  <div className="flex justify-between items-center mt-0.5 pt-0.5 border-t border-cyan-200">
                    <span className="font-bold text-gray-800 text-[10px]">Amount Due</span>
                    <span className="font-bold text-cyan-600 text-xl">{money(total)}</span>
                  </div>
                </div>

                {/* Service Type */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Service Type</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { value: 'dine-in', label: 'DINE-IN', Icon: UtensilsCrossed },
                      { value: 'pick-up', label: 'PICK-UP', Icon: ShoppingBag },
                      { value: 'delivery', label: 'DELIVERY', Icon: Truck }
                    ].map(type => (
                      <button
                        key={type.value}
                        onClick={() => setServiceType(type.value)}
                        className={`py-2 font-medium text-xs transition-all rounded-lg border-2 flex flex-col items-center gap-0.5 ${serviceType === type.value
                          ? 'bg-cyan-600 text-white border-cyan-600'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-cyan-400 hover:bg-green-50'
                          }`}
                      >
                        <type.Icon className="w-4 h-4" />
                        <span className="text-[10px]">{type.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Payment Method */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-tight">Payment Method</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {['cash', 'gcash', 'card', 'credit'].map(method => (
                      <button
                        key={method}
                        onClick={() => setPaymentMethod(method)}
                        className={`py-1.5 font-bold text-[10px] transition-all rounded-lg border-2 ${paymentMethod === method
                          ? method === 'credit' ? 'bg-orange-500 text-white border-orange-500' : 'bg-cyan-600 text-white border-cyan-600'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-cyan-400 hover:bg-green-50'
                          }`}
                      >
                        {method.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Discount Options for Quick Checkout */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-medium text-gray-500">Apply Discount</label>
                    {discountType && (
                      <button onClick={resetDiscount} className="text-[10px] text-red-500 font-medium bg-red-50 px-2 py-0.5 rounded border border-red-100">Clear</button>
                    )}
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    <button onClick={() => setDiscountType('senior')} className={`py-1.5 text-xs font-bold rounded-lg border transition-all ${discountType === 'senior' ? 'bg-orange-600 text-white border-orange-600' : 'bg-gray-50 text-gray-600 border-gray-300 hover:border-orange-400 hover:text-orange-600'}`}>Senior</button>
                    <button onClick={() => setDiscountType('pwd')} className={`py-1.5 text-xs font-bold rounded-lg border transition-all ${discountType === 'pwd' ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 text-gray-600 border-gray-300 hover:border-blue-400 hover:text-blue-600'}`}>PWD</button>
                    <button onClick={() => setDiscountType('loyalty')} className={`py-1.5 text-xs font-bold rounded-lg border transition-all ${discountType === 'loyalty' ? 'bg-purple-600 text-white border-purple-600' : 'bg-gray-50 text-gray-600 border-gray-300 hover:border-purple-400 hover:text-purple-600'}`}>Loyalty</button>
                    <button onClick={() => setDiscountType('custom')} className={`py-1.5 text-xs font-bold rounded-lg border transition-all ${discountType === 'custom' ? 'bg-gray-800 text-white border-gray-800' : 'bg-gray-50 text-gray-600 border-gray-300 hover:border-gray-800 hover:text-gray-800'}`}>Custom</button>
                  </div>
                  {discountType === 'custom' && (
                    <div className="flex gap-2 animate-fadeIn mt-1.5">
                      <div className="flex-1 relative">
                        <input type="number" placeholder="%" value={customDiscountPercent} onChange={(e) => { setCustomDiscountPercent(e.target.value); setCustomDiscountAmount(''); }} className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:border-cyan-500 focus:outline-none pr-6" />
                        <span className="absolute right-2 top-1.5 text-xs text-gray-400">%</span>
                      </div>
                      <div className="flex items-center text-gray-400 text-[10px] md:text-xs">OR</div>
                      <div className="flex-1 relative">
                        <span className="absolute left-2 top-1.5 text-xs text-gray-400">₱</span>
                        <input type="number" placeholder="Amount" value={customDiscountAmount} onChange={(e) => { setCustomDiscountAmount(e.target.value); setCustomDiscountPercent(''); }} className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:border-cyan-500 focus:outline-none pl-6" />
                      </div>
                    </div>
                  )}
                  {discountAmount > 0 && (
                    <div className="mt-1.5 text-right text-xs text-cyan-600 font-bold">
                      - Php {discountAmount.toFixed(2)} applied
                    </div>
                  )}
                </div>

                {/* Customer Selection - Linked to Loyalty/Points */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-medium text-gray-500">Customer (Points / Credit)</label>
                    {selectedCustomer && (
                      <div className="flex items-center gap-1">
                        <span className={`px-1.5 py-0.5 rounded-[4px] text-[10px] font-bold uppercase tracking-wider ${selectedCustomer.loyalty_tier === 'Diamond' ? 'bg-cyan-100 text-cyan-700' :
                          selectedCustomer.loyalty_tier === 'Gold' ? 'bg-amber-100 text-amber-700' :
                            selectedCustomer.loyalty_tier === 'Silver' ? 'bg-gray-100 text-gray-700' :
                              'bg-orange-100 text-orange-700'
                          }`}>
                          {selectedCustomer.loyalty_tier}
                        </span>
                        <span className="text-[10px] bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded border border-purple-100 font-bold">
                          {selectedCustomer.loyalty_points} PTS
                        </span>
                      </div>
                    )}
                  </div>

                  {selectedCustomer ? (
                    <div className={`${paymentMethod === 'credit' ? 'bg-orange-50 border-orange-200' : 'bg-cyan-50 border-cyan-100'} border p-2 rounded-xl transition-colors`}>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[10px] ${paymentMethod === 'credit' ? 'bg-orange-200 text-orange-700' : 'bg-cyan-200 text-cyan-700'}`}>
                            {selectedCustomer.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-gray-800 text-xs leading-tight">{selectedCustomer.name}</p>
                            <p className="text-[9px] text-gray-400 font-medium">{selectedCustomer.phone}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedCustomer(null);
                            if (discountType === 'loyalty') setDiscountType(null);
                          }}
                          className="p-1 hover:bg-white/50 rounded-full text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                        {isSearchingCustomer ? (
                          <div className="w-3.5 h-3.5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <Search className="w-3.5 h-3.5" />
                        )}
                      </div>
                        <input
                          type="text"
                          value={customerSearch}
                          onChange={(e) => setCustomerSearch(e.target.value)}
                          placeholder="Search customer..."
                          className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-cyan-500 text-xs transition-all bg-gray-50/50 uppercase font-bold"
                        />
                      {customerSearchResults.length > 0 && (
                        <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-xl mt-2 z-[60] overflow-hidden animate-scaleIn">
                          {customerSearchResults.map(c => (
                            <button
                              key={c.id}
                              onClick={() => {
                                setSelectedCustomer(c);
                                setCustomerSearch('');
                                setCustomerSearchResults([]);
                                // Automatically apply loyalty discount if they have one
                                if (Number(c.loyalty_discount) > 0) {
                                  setDiscountType('loyalty');
                                }
                              }}
                              className="w-full text-left px-4 py-3 hover:bg-cyan-50 transition-colors border-b border-gray-50 last:border-0 group"
                            >
                              <div className="flex justify-between items-center">
                                <div>
                                  <p className="font-bold text-gray-800 text-sm group-hover:text-cyan-700">{c.name}</p>
                                  <p className="text-xs text-gray-500">{c.phone}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-[10px] font-black text-cyan-600 uppercase tracking-widest">{c.loyalty_tier}</p>
                                  <p className="text-[10px] text-gray-400 font-bold">{c.loyalty_points} PTS</p>
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                      {customerSearch.length >= 2 && customerSearchResults.length === 0 && !isSearchingCustomer && (
                        <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg mt-2 z-[60] p-4 text-center animate-scaleIn">
                          <p className="text-xs text-gray-500">No customers found for "{customerSearch}"</p>
                          <button
                            onClick={() => setCurrentPage('customers')}
                            className="mt-2 text-xs font-bold text-cyan-600 hover:text-cyan-700"
                          >
                            + Add New Customer
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Amount Input for Cash */}
                {paymentMethod === 'cash' && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">Amount Received (Php)</label>
                    <div className="relative bg-white border-2 border-cyan-500 rounded-lg overflow-hidden">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={amountReceived}
                        onChange={(e) => {
                          const value = e.target.value.replace(/[^0-9.]/g, '');
                          setAmountReceived(value);
                        }}
                        placeholder="0.00"
                        className="w-full bg-transparent border-none outline-none font-bold text-center text-cyan-600 appearance-none payment-amount-input"
                        style={{ padding: '8px', height: '56px', fontSize: '1.75rem' }}
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            document.getElementById('complete-payment-btn')?.focus();
                          }
                        }}
                      />
                    </div>
                    <div className="grid grid-cols-5 gap-1 mt-2">
                      {quickAmounts.map(amount => (
                        <button
                          key={amount}
                          onClick={() => setAmountReceived(amount.toString())}
                          className="bg-gray-100 text-gray-700 py-1.5 rounded font-medium text-xs hover:bg-cyan-100 hover:text-cyan-700 transition-colors"
                        >
                          {amount}
                        </button>
                      ))}
                    </div>
                    {parseFloat(amountReceived) >= total && (
                      <div className="bg-cyan-50 border-2 border-cyan-500 p-2 md:p-3 rounded-lg mt-2 shadow-sm animate-bounce-in">
                        <div className="flex justify-between items-center font-black">
                          <span className="text-cyan-800 text-xs uppercase tracking-widest">Return Change:</span>
                          <span className="text-cyan-600 text-2xl md:text-3xl">₱ {(parseFloat(amountReceived) - total).toFixed(2)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                </div>
              </div>

              {/* Action Buttons - Fixed at bottom of modal */}
              <div className="p-3 bg-white border-t border-gray-100 flex gap-2 flex-shrink-0">
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-3 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 transition-colors font-bold text-xs uppercase tracking-wide"
                >
                  Cancel
                </button>
                <button
                  id="complete-payment-btn"
                  onClick={processPayment}
                  className="flex-1 py-3 bg-cyan-600 text-white rounded-lg font-black text-sm hover:bg-cyan-700 transition-all shadow-lg active:scale-95 uppercase tracking-wider"
                >
                  Process & Print Receipt
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Table Action Modal */}
        {showTableActionModal && actionTable && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => { setShowTableActionModal(false); setActionTable(null); }}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-xs" onClick={(e) => e.stopPropagation()}>
              <div className="bg-gray-800 text-white p-3 rounded-t-xl flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-base">Table {actionTable.table_number}</h3>
                  <p className="text-gray-300 text-xs">{actionTable.section} · {actionTable.capacity} seats · {actionTable.status}</p>
                </div>
                <button onClick={() => { setShowTableActionModal(false); setActionTable(null); }} className="text-gray-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-3 space-y-2">
                {/* Select for order (if available) */}
                {actionTable.status === 'available' && (
                  <button
                    onClick={() => {
                      setSelectedTable(actionTable);
                      setShowTableView(false);
                      setShowTableActionModal(false);
                      setActionTable(null);
                    }}
                    className="w-full py-2.5 bg-cyan-600 text-white rounded-lg font-medium text-sm hover:bg-cyan-700 transition-colors"
                  >
                    Select for Order
                  </button>
                )}
                {/* Status change buttons */}
                <p className="text-xs text-gray-500 font-medium pt-1">Change Status:</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { status: 'available', label: 'Available', color: 'bg-cyan-100 text-cyan-700 hover:bg-cyan-200 border-cyan-300' },
                    { status: 'reserved', label: 'Reserved', color: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border-yellow-300' },
                    { status: 'needs-cleaning', label: 'Cleaning', color: 'bg-gray-200 text-gray-700 hover:bg-gray-300 border-gray-400' },
                  ].filter(s => s.status !== actionTable.status).map(s => (
                    <button
                      key={s.status}
                      onClick={() => updateTableStatus(actionTable.id, s.status)}
                      className={`py-2 rounded-lg font-medium text-xs border ${s.color} transition-colors`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bill Out Modal */}
        {showBillOutModal && billOutOrder && (
          <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50">
            <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md max-h-[95vh] flex flex-col">

              {/* Receipt Header */}
              <div className="bg-cyan-600 text-white px-5 py-4 rounded-t-2xl sm:rounded-t-2xl flex-shrink-0">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[11px] text-cyan-100 uppercase tracking-widest font-medium">Table</p>
                    <p className="text-3xl font-bold leading-tight">{billOutTable?.table_number}</p>
                    <p className="text-xs text-cyan-100 mt-0.5">{billOutOrder.order_number}</p>
                  </div>
                  <button
                    onClick={() => { setShowBillOutModal(false); setBillOutTable(null); setBillOutOrder(null); setSplitPaymentMode(false); }}
                    className="text-cyan-200 hover:text-white transition-colors mt-1"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Scrollable body */}
              <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">

                {/* Items */}
                <div>
                  {billOutOrder.items?.map((item, i) => (
                    <div key={i} className={`py-2.5 border-b border-gray-100 last:border-0 ${item.status === 'voided' ? 'opacity-40' : ''}`}>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium text-gray-800 ${item.status !== 'active' ? 'line-through text-gray-400' : ''}`}>
                            <span className="text-gray-400 font-normal">{item.quantity}×</span> {item.product_name}
                            {item.size_name && <span className="text-gray-400 font-normal text-xs"> ({item.size_name})</span>}
                          </p>
                          {item.notes && <p className="text-xs text-gray-400 italic mt-0.5 pl-4">{item.notes}</p>}
                          <div className="flex gap-1 mt-0.5">
                            {item.status === 'voided' && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold">VOIDED</span>}
                            {item.status === 'comped' && <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-bold">COMP</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className={`text-sm font-semibold tabular-nums ${item.status !== 'active' ? 'line-through text-gray-300' : 'text-gray-800'}`}>
                            ₱{parseFloat(item.subtotal).toFixed(2)}
                          </span>
                          {item.status === 'active' && (
                            <div className="flex gap-0.5">
                              <button onClick={() => { setAdjustItem(item); setAdjustType('void'); setAdjustReason(''); setShowAdjustModal(true); }}
                                className="text-[10px] px-1.5 py-0.5 bg-red-50 text-red-500 hover:bg-red-100 rounded font-bold border border-red-100">V</button>
                              <button onClick={() => { setAdjustItem(item); setAdjustType('comp'); setAdjustReason(''); setShowAdjustModal(true); }}
                                className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-500 hover:bg-blue-100 rounded font-bold border border-blue-100">C</button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Totals */}
                <div className="bg-green-50 border border-cyan-100 rounded-xl p-4 space-y-1.5">
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>Subtotal</span>
                    <span className="tabular-nums">₱{parseFloat(billOutOrder.subtotal).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>Tax</span>
                    <span className="tabular-nums">₱{parseFloat(billOutOrder.tax_amount).toFixed(2)}</span>
                  </div>
                  {billDiscount > 0 && (
                    <div className="flex justify-between text-sm text-cyan-600">
                      <span>Discount</span>
                      <span className="tabular-nums">-₱{parseFloat(billDiscount).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-base text-gray-900 pt-2 border-t border-gray-200">
                    <span>Total</span>
                    <span className="tabular-nums">₱{(parseFloat(billOutOrder.total_amount) - billDiscount).toFixed(2)}</span>
                  </div>
                </div>

                {/* Discount Options for Bill Out */}
                <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-700">Apply Discount</p>
                    {billDiscount > 0 && (
                      <button onClick={() => setBillDiscount(0)} className="text-xs text-red-500 font-medium px-2 py-1 bg-red-50 rounded">Clear</button>
                    )}
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <button onClick={() => setBillDiscount(parseFloat(billOutOrder.subtotal) * 0.20)} className={`py-2 text-xs font-bold rounded-lg border transition-all ${billDiscount > 0 && Math.abs(billDiscount - parseFloat(billOutOrder.subtotal) * 0.20) < 0.01 ? 'bg-orange-600 text-white border-orange-600' : 'bg-gray-50 text-gray-600 border-gray-300 hover:border-orange-400 hover:text-orange-600'}`}>Senior</button>
                    <button onClick={() => setBillDiscount(parseFloat(billOutOrder.subtotal) * 0.20)} className={`py-2 text-xs font-bold rounded-lg border transition-all ${billDiscount > 0 && Math.abs(billDiscount - parseFloat(billOutOrder.subtotal) * 0.20) < 0.01 ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 text-gray-600 border-gray-300 hover:border-blue-400 hover:text-blue-600'}`}>PWD</button>
                    <button onClick={() => setBillDiscount(parseFloat(billOutOrder.subtotal) * 0.10)} className={`py-2 text-xs font-bold rounded-lg border transition-all ${billDiscount > 0 && Math.abs(billDiscount - parseFloat(billOutOrder.subtotal) * 0.10) < 0.01 ? 'bg-purple-600 text-white border-purple-600' : 'bg-gray-50 text-gray-600 border-gray-300 hover:border-purple-400 hover:text-purple-600'}`}>Loyalty</button>
                    <div className="relative">
                      <span className="absolute left-2 top-2 text-xs text-gray-400 font-bold">₱</span>
                      <input
                        type="number"
                        placeholder="Amount"
                        value={billDiscount || ''}
                        onChange={e => setBillDiscount(Math.min(parseFloat(e.target.value) || 0, parseFloat(billOutOrder.subtotal)))}
                        className="w-full h-full py-2 pl-6 pr-2 text-xs font-bold rounded-lg border border-gray-300 outline-none focus:border-gray-800 transition-colors"
                      />
                    </div>
                  </div>
                </div>

                {/* Payment */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-gray-700">Payment Method</p>
                    <button
                      onClick={() => { setSplitPaymentMode(!splitPaymentMode); if (!splitPaymentMode) setSplitPayments([{ method: 'cash', amount: '', reference: '' }]); }}
                      className={`text-xs px-3 py-1 rounded-full font-medium transition-all border ${splitPaymentMode ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-purple-600 border-purple-300 hover:bg-purple-50'}`}
                    >
                      {splitPaymentMode ? 'Single Payment' : 'Split Payment'}
                    </button>
                  </div>

                  {!splitPaymentMode ? (
                    <>
                      <div className="grid grid-cols-4 gap-2 mb-3">
                        {['cash', 'gcash', 'card', 'credit'].map(method => (
                          <button
                            key={method}
                            onClick={() => setBillPaymentMethod(method)}
                            className={`py-3 font-semibold text-xs rounded-xl border-2 transition-all ${billPaymentMethod === method
                              ? 'bg-cyan-600 text-white border-cyan-600'
                              : 'bg-white text-gray-500 border-gray-200 hover:border-cyan-400 hover:text-cyan-700'
                              }`}
                          >
                            {method === 'cash' ? '💵' : method === 'gcash' ? '📱' : method === 'card' ? '💳' : '🏦'}
                            <br /><span className="capitalize mt-0.5 inline-block">{method}</span>
                          </button>
                        ))}
                      </div>

                      {billPaymentMethod === 'cash' && (
                        <div>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={billAmountReceived}
                            onChange={(e) => setBillAmountReceived(e.target.value.replace(/[^0-9.]/g, ''))}
                            placeholder="Amount received"
                            className="w-full border-2 border-gray-200 focus:border-cyan-600 rounded-xl px-4 py-3 text-xl font-bold text-center outline-none transition-colors tabular-nums"
                            autoFocus
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById('bill-out-btn')?.focus(); } }}
                          />
                          <div className="grid grid-cols-5 gap-1.5 mt-2">
                            {[50, 100, 200, 500, 1000].map(amount => (
                              <button key={amount} onClick={() => setBillAmountReceived(amount.toString())}
                                className="bg-gray-100 text-gray-700 py-2 rounded-lg font-medium text-xs hover:bg-cyan-100 hover:text-cyan-700 transition-colors">
                                {amount}
                              </button>
                            ))}
                          </div>
                          {parseFloat(billAmountReceived) >= (parseFloat(billOutOrder.total_amount) - billDiscount) && (
                            <div className="bg-green-50 border border-cyan-200 rounded-xl p-3 mt-3 flex justify-between items-center">
                              <span className="text-cyan-700 font-semibold text-sm">Change</span>
                              <span className="text-cyan-600 font-bold text-2xl tabular-nums">
                                ₱{(parseFloat(billAmountReceived) - (parseFloat(billOutOrder.total_amount) - billDiscount)).toFixed(2)}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="space-y-2">
                      {splitPayments.map((payment, idx) => (
                        <div key={idx} className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl p-2.5">
                          <select
                            value={payment.method}
                            onChange={(e) => { const updated = [...splitPayments]; updated[idx].method = e.target.value; setSplitPayments(updated); }}
                            className="border border-gray-300 rounded-lg px-2 py-1.5 text-xs font-medium w-[72px] bg-white"
                          >
                            <option value="cash">Cash</option>
                            <option value="gcash">GCash</option>
                            <option value="card">Card</option>
                            <option value="credit">Credit</option>
                          </select>
                          <input
                            type="text" inputMode="decimal"
                            value={payment.amount}
                            onChange={(e) => { const updated = [...splitPayments]; updated[idx].amount = e.target.value.replace(/[^0-9.]/g, ''); setSplitPayments(updated); }}
                            placeholder="0.00"
                            className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm font-bold text-center bg-white outline-none focus:border-gray-500 tabular-nums"
                          />
                          {splitPayments.length > 1 && (
                            <button onClick={() => setSplitPayments(splitPayments.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600 p-1">
                              <X size={14} />
                            </button>
                          )}
                        </div>
                      ))}
                      <button onClick={() => setSplitPayments([...splitPayments, { method: 'cash', amount: '', reference: '' }])}
                        className="w-full py-2 border-2 border-dashed border-gray-300 rounded-xl text-gray-400 text-xs font-medium hover:border-purple-400 hover:text-purple-600 transition-colors">
                        + Add Payment
                      </button>
                      {(() => {
                        const totalPaid = splitPayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
                        const remaining = (parseFloat(billOutOrder.total_amount) - billDiscount) - totalPaid;
                        return (
                          <div className={`p-2.5 rounded-xl text-sm font-semibold text-center border ${remaining <= 0 ? 'bg-green-50 text-cyan-700 border-cyan-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
                            {remaining <= 0
                              ? `Paid ✓${remaining < 0 ? ` · Change: ₱${Math.abs(remaining).toFixed(2)}` : ''}`
                              : `Still owed: ₱${remaining.toFixed(2)}`}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </div>

              {/* Footer Actions */}
              <div className="px-5 pb-5 pt-3 border-t border-gray-100 flex-shrink-0 space-y-2">
                <div className="flex gap-2">
                  <button
                    onClick={() => { setShowSplitCheckModal(true); setSplitCheckItems([]); }}
                    className="flex-1 py-2.5 bg-purple-50 text-purple-700 rounded-xl font-semibold text-sm border border-purple-200 hover:bg-purple-100 transition-colors"
                  >
                    Split Check
                  </button>
                  <button
                    onClick={() => { setShowBillOutModal(false); setSelectedTable(billOutTable); setIsAddingToTable(true); setShowTableView(false); setBillOutTable(null); setBillOutOrder(null); }}
                    className="flex-1 py-2.5 bg-orange-50 text-orange-700 rounded-xl font-semibold text-sm border border-orange-200 hover:bg-orange-100 transition-colors"
                  >
                    + Add Items
                  </button>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setShowBillOutModal(false); setBillOutTable(null); setBillOutOrder(null); setSplitPaymentMode(false); }}
                    className="px-5 py-3 border border-gray-300 rounded-xl text-gray-600 font-medium text-sm hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  {employee?.role !== 'waiter' && (
                    <button
                      id="bill-out-btn"
                      onClick={processBillOut}
                      className="flex-1 py-3 bg-cyan-600 text-white rounded-xl font-bold text-base hover:bg-cyan-700 transition-colors"
                    >
                      Bill Out · ₱{(parseFloat(billOutOrder.total_amount) - billDiscount).toFixed(2)}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Void/Comp Reason Modal */}
        {showAdjustModal && adjustItem && (
          <div className="fixed inset-0 flex items-center justify-center z-[55] bg-black/50" onClick={() => setShowAdjustModal(false)}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className={`px-4 py-3 ${adjustType === 'void' ? 'bg-red-600' : 'bg-blue-600'} text-white`}>
                <h3 className="font-bold text-base">{adjustType === 'void' ? 'Void' : 'Comp'} Item</h3>
                <p className="text-xs opacity-90">{adjustItem.quantity}x {adjustItem.product_name}</p>
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                  <div className="grid grid-cols-2 gap-1.5 mb-2">
                    {['Customer complaint', 'Wrong item', 'Kitchen error', 'Manager override'].map(r => (
                      <button key={r} onClick={() => setAdjustReason(r)}
                        className={`text-xs py-1.5 px-2 rounded-lg border transition-all ${adjustReason === r ? (adjustType === 'void' ? 'bg-red-50 border-red-400 text-red-700' : 'bg-blue-50 border-blue-400 text-blue-700') : 'border-gray-200 hover:border-gray-400'}`}>
                        {r}
                      </button>
                    ))}
                  </div>
                  <input type="text" value={adjustReason} onChange={e => setAdjustReason(e.target.value)}
                    placeholder="Or type a custom reason..." className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div className="flex gap-2 pt-1">
                  <button onClick={() => setShowAdjustModal(false)} className="flex-1 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
                  <button onClick={processAdjustment}
                    className={`flex-1 py-2 text-white rounded-lg text-sm font-medium ${adjustType === 'void' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
                    Confirm {adjustType === 'void' ? 'Void' : 'Comp'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Order Select Modal (for split checks on same table) */}
        {showOrderSelectModal && billOutTable && tableOrders.length > 0 && (
          <div className="fixed inset-0 flex items-center justify-center z-[50] bg-black/50" onClick={() => setShowOrderSelectModal(false)}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="px-4 py-3 bg-blue-600 text-white">
                <h3 className="font-bold text-base">Table {billOutTable.table_number} — Select Check</h3>
                <p className="text-xs opacity-90">{tableOrders.length} open checks</p>
              </div>
              <div className="p-4 space-y-2">
                {tableOrders.map((order, idx) => (
                  <button
                    key={order.id}
                    onClick={() => {
                      setBillOutOrder(order);
                      setShowOrderSelectModal(false);
                      setShowBillOutModal(true);
                    }}
                    className="w-full text-left p-3 rounded-lg border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-all"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="font-bold text-sm text-gray-800">Check {idx + 1}</span>
                        <span className="text-xs text-gray-500 ml-2">#{order.order_number}</span>
                      </div>
                      <span className="font-bold text-blue-600">Php {parseFloat(order.total_amount).toFixed(2)}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{order.items?.length || 0} items</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Split Check Modal */}
        {showSplitCheckModal && billOutOrder && (
          <div className="fixed inset-0 flex items-center justify-center z-[56] bg-black/50" onClick={() => setShowSplitCheckModal(false)}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="px-4 py-3 bg-purple-600 text-white">
                <h3 className="font-bold text-base">Split Check</h3>
                <p className="text-xs opacity-90">Select items to move to a new check</p>
              </div>
              <div className="p-4 space-y-2 max-h-64 overflow-y-auto">
                {billOutOrder.items?.filter(item => item.status === 'active').map((item) => (
                  <label key={item.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-purple-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={splitCheckItems.includes(item.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSplitCheckItems([...splitCheckItems, item.id]);
                        } else {
                          setSplitCheckItems(splitCheckItems.filter(id => id !== item.id));
                        }
                      }}
                      className="w-4 h-4 text-purple-600 rounded"
                    />
                    <div className="flex-1">
                      <span className="text-sm font-medium text-gray-800">{item.quantity}x {item.product_name}</span>
                      {item.size_name && <span className="text-gray-400 text-xs ml-1">({item.size_name})</span>}
                    </div>
                    <span className="text-sm font-medium text-gray-600">Php {parseFloat(item.subtotal).toFixed(2)}</span>
                  </label>
                ))}
              </div>
              <div className="p-4 border-t border-gray-200 space-y-2">
                {splitCheckItems.length > 0 && (
                  <div className="text-sm text-center text-purple-700 font-medium">
                    Moving {splitCheckItems.length} item(s) — Php {billOutOrder.items?.filter(i => splitCheckItems.includes(i.id)).reduce((s, i) => s + parseFloat(i.subtotal), 0).toFixed(2)}
                  </div>
                )}
                <div className="flex gap-2">
                  <button onClick={() => setShowSplitCheckModal(false)} className="flex-1 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
                  <button
                    onClick={processSplitCheck}
                    disabled={splitCheckItems.length === 0}
                    className={`flex-1 py-2 text-white rounded-lg text-sm font-medium ${splitCheckItems.length > 0 ? 'bg-purple-600 hover:bg-purple-700' : 'bg-gray-300 cursor-not-allowed'}`}
                  >
                    Split ({splitCheckItems.length})
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showSuccessOverlay && (
          <div
            className="fixed inset-0 flex items-center justify-center z-[60] bg-black/40"
            onKeyDown={(e) => { if (e.key === 'Enter') setShowSuccessOverlay(false); }}
            tabIndex={0}
            ref={(el) => el && el.focus()}
          >
            <div className="text-center bg-cyan-600 rounded-2xl px-8 py-6 md:px-10 md:py-8 shadow-2xl mx-4" onClick={(e) => e.stopPropagation()}>
              <div className="w-12 h-12 md:w-14 md:h-14 mx-auto mb-2 md:mb-3 bg-white rounded-full flex items-center justify-center shadow-lg">
                <svg className="w-7 h-7 md:w-8 md:h-8 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl md:text-2xl font-bold mb-1 text-white">{successMessage || 'Payment Successful!'}</h2>
              <p className="text-cyan-100 text-sm md:text-base mb-1">Order: {successOrderNumber}</p>
              {isRefreshingStock && (
                <p className="text-cyan-100 text-xs md:text-sm mt-1 animate-pulse">Refreshing stock...</p>
              )}
              {successChange > 0 && (
                <p className="text-white text-lg md:text-xl font-bold mt-1">Change: {money(successChange)}</p>
              )}
              <div className="flex flex-col gap-2 mt-6">
                <button
                  onClick={() => window.print()}
                  className="w-full bg-white text-cyan-700 font-bold py-3 rounded-xl text-sm md:text-base hover:bg-green-50 transition-colors shadow-lg flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Print Receipt & Slip
                </button>
                <button
                  onClick={() => setShowSuccessOverlay(false)}
                  className="w-full bg-cyan-700 text-white font-bold py-3 rounded-xl text-sm md:text-base hover:bg-cyan-800 transition-colors"
                >
                  Done / Next Order
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Ready Order Alert Toast */}
        {showReadyAlert && latestReadyOrder && (
          <div className="fixed bottom-6 left-6 z-[70] animate-bounce-in">
            <div className="bg-white border-l-4 border-cyan-500 rounded-lg shadow-2xl p-4 max-w-sm" onClick={() => setShowReadyAlert(false)}>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-cyan-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Check className="w-5 h-5 text-cyan-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-800 text-sm">Order Ready!</p>
                  <p className="text-gray-600 text-xs mt-0.5">{latestReadyOrder.order_number}</p>
                  <p className="text-gray-500 text-xs">
                    {latestReadyOrder.service_type === 'dine-in' ? 'Dine-in' :
                      latestReadyOrder.service_type === 'pick-up' ? 'Pick-up' : 'Delivery'}
                    {latestReadyOrder.customer_name ? ` — ${latestReadyOrder.customer_name}` : ''}
                  </p>
                </div>
                <button onClick={(e) => { e.stopPropagation(); setShowReadyAlert(false); }} className="text-gray-400 hover:text-gray-600">
                  <X size={16} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Scanner Overlay */}
      {showScanner && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-800">Scan Barcode</p>
                <p className="text-xs text-gray-500">Align the code within the frame</p>
                {activeCameraLabel && (
                  <p className="text-[11px] text-cyan-600 mt-1 truncate" title={activeCameraLabel}>
                    Camera: {activeCameraLabel}
                  </p>
                )}
              </div>
              <button onClick={stopScanner} className="text-gray-500 hover:text-gray-700 text-sm">Close</button>
            </div>
            <div className="bg-black flex items-center justify-center aspect-video relative">
              {scannerMode === 'native' && (
                <video ref={videoRef} className="w-full h-full object-contain" muted playsInline />
              )}
              {scannerMode === 'html5' && (
                <div id="html5-scanner-container" className="absolute inset-0 w-full h-full"></div>
              )}
            </div>
            <div className="p-3 flex items-center justify-between">
              <div className="text-xs text-gray-600 max-w-[70%]">
                {scannerError ? (
                  <div className="text-red-600 space-y-1">
                    <div>{scannerError}</div>
                    {scannerErrorDetail && <div className="text-red-500 text-[11px]">{scannerErrorDetail}</div>}
                    <div className="text-gray-500 text-[11px]">Check camera permission or HTTPS, then retry.</div>
                  </div>
                ) : isScanning ? 'Scanning…' : 'Starting camera…'}
              </div>
              <button
                onClick={stopScanner}
                className="text-xs px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Product Management Page
function ProductManagementPage({ menuData, refreshProducts, currentView, categories }) {
  const [activeTab, setActiveTab] = useState('products'); // products | combos | categories | modifiers | pricing
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [formData, setFormData] = useState({
    name: '',
    category: 'Pizza',
    price: '',
    description: '',
    image: '',
    popular: false,
    sku: '',
    barcode: '',
    sizes: [],
    active: true,
    stock_quantity: 0,
    low_stock_threshold: 10,
    send_to_kitchen: true,
    cost: ''
  });
  const [lowStockCount, setLowStockCount] = useState(0);
  const [hasSizes, setHasSizes] = useState(false);
  const productModalRef = useRef(null);
  const productModalDragRef = useRef({ offsetX: 0, offsetY: 0 });
  const csvInputRef = useRef(null);
  const [productModalPos, setProductModalPos] = useState({ x: 24, y: 24 });
  const [isDraggingProductModal, setIsDraggingProductModal] = useState(false);
  const [csvImporting, setCsvImporting] = useState(false);
  const [manualCategories, setManualCategories] = useState([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [renameFrom, setRenameFrom] = useState('');
  const [renameTo, setRenameTo] = useState('');
  const [categorySaving, setCategorySaving] = useState(false);
  const [modifiers, setModifiers] = useState([]);
  const [modifierForm, setModifierForm] = useState({ name: '', type: 'addon', price: '', active: true });
  const [pricingCategory, setPricingCategory] = useState('All');
  const [priceAdjustType, setPriceAdjustType] = useState('percent');
  const [priceAdjustValue, setPriceAdjustValue] = useState('');
  const [pricingSaving, setPricingSaving] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [productSaving, setProductSaving] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState([]);
  const [bulkDeleteState, setBulkDeleteState] = useState({ running: false, total: 0, done: 0, current: '' });

  const handlePhotoUpload = async (file, type = 'product') => {
    if (!file) return;
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File is too large. Max 5MB allowed.');
      return;
    }

    setImageUploading(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = async () => {
        const base64data = reader.result;
        
        const response = await fetchWithAuth(`${API_URL}/upload`, {
          method: 'POST',
          body: JSON.stringify({
            fileName: file.name,
            fileData: base64data,
            contentType: file.type
          })
        });

        const result = await response.json();
        if (result.success) {
          if (type === 'combo') {
            setComboFormData(prev => ({ ...prev, image: result.url }));
          } else {
            setFormData(prev => ({ ...prev, image: result.url }));
          }
        } else {
          alert('Upload failed: ' + result.error);
        }
        setImageUploading(false);
      };
    } catch (error) {
      console.error('Photo upload error:', error);
      alert('Failed to upload image. Please check your connection.');
      setImageUploading(false);
    }
  };


  // Combo states
  const [combos, setCombos] = useState([]);
  const [showComboModal, setShowComboModal] = useState(false);
  const [editingCombo, setEditingCombo] = useState(null);
  const [comboFormData, setComboFormData] = useState({
    name: '',
    description: '',
    price: '',
    image: '',
    active: true,
    items: []
  });

  // Fetch combos (with ?all=true to include inactive for management)
  const fetchCombos = async () => {
    try {
      const response = await fetchWithAuth(`${API_URL}/combos?all=true`);
      const data = await response.json();
      if (data.success) {
        setCombos(data.combos);
      }
    } catch (error) {
      console.error('Error fetching combos:', error);
    }
  };

  const fetchModifiers = async () => {
    try {
      const response = await fetchWithAuth(`${API_URL}/modifiers?all=true`);
      const data = await response.json();
      if (response.ok && data.success) {
        setModifiers(data.modifiers || []);
      } else {
        throw new Error(data.error || 'Failed to load modifiers');
      }
    } catch (error) {
      console.error('Error fetching modifiers:', error);
      alert('Unable to load modifiers from server.');
    }
  };

  useEffect(() => {
    fetchCombos();
    fetchModifiers();
  }, []);

  useEffect(() => {
    if (currentView === 'menu-categories') setActiveTab('categories');
    else if (currentView === 'menu-modifiers') setActiveTab('modifiers');
    else if (currentView === 'menu-pricing') setActiveTab('pricing');
    else if (currentView === 'products') setActiveTab('products');
  }, [currentView]);

  useEffect(() => {
    try {
      const rawCats = localStorage.getItem('menu_manual_categories');
      if (rawCats) setManualCategories(JSON.parse(rawCats));
    } catch (e) {
      console.error('Error loading menu setup settings:', e);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('menu_manual_categories', JSON.stringify(manualCategories));
  }, [manualCategories]);

  useEffect(() => {
    if (activeTab === 'modifiers') {
      fetchModifiers();
    }
  }, [activeTab]);

  useEffect(() => {
    const validIds = new Set(regularProducts.map(p => String(p.id)));
    setSelectedProductIds(prev => prev.filter(id => validIds.has(String(id))));
  }, [menuData]);

  // Calculate low stock count from products
  useEffect(() => {
    const count = menuData.filter(p => !p.isCombo && p.stock_quantity <= p.low_stock_threshold).length;
    setLowStockCount(count);
  }, [menuData]);

  // Get only regular products (not combos)
  const regularProducts = menuData.filter(item => !item.isCombo);
  const existingCategories = Array.from(new Set(regularProducts.map(p => p.category).filter(Boolean)));
  const productCategories = Array.from(new Set([
    ...existingCategories,
    ...manualCategories,
    ...categories.filter(c => c !== 'All' && c !== 'Combos')
  ])).sort((a, b) => a.localeCompare(b));

  const filteredProducts = regularProducts.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.barcode && item.barcode.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });
  const isAllFilteredSelected = filteredProducts.length > 0 &&
    filteredProducts.every(p => selectedProductIds.includes(String(p.id)));

  // Combo handlers
  const openAddComboModal = () => {
    setEditingCombo(null);
    setComboFormData({
      name: '',
      description: '',
      price: '',
      image: '',
      active: true,
      items: [{ product_id: '', quantity: 1, size_name: '' }]
    });
    setShowComboModal(true);
  };

  const openEditComboModal = (combo) => {
    setEditingCombo(combo);
    setComboFormData({
      name: combo.name,
      description: combo.description || '',
      price: combo.price,
      image: combo.image || '',
      active: combo.active !== false,
      items: combo.items.length > 0 ? combo.items : [{ product_id: '', quantity: 1, size_name: '' }]
    });
    setShowComboModal(true);
  };

  const handleComboSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      name: comboFormData.name,
      description: comboFormData.description,
      price: parseFloat(comboFormData.price),
      image: comboFormData.image,
      active: comboFormData.active,
      items: comboFormData.items.filter(item => item.product_id)
    };

    if (payload.items.length === 0) {
      alert('Please add at least one item to the combo');
      return;
    }

    try {
      const url = editingCombo
        ? `${API_URL}/combos/${editingCombo.id}`
        : `${API_URL}/combos`;

      const response = await fetchWithAuth(url, {
        method: editingCombo ? 'PUT' : 'POST',
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (result.success) {
        alert(editingCombo ? 'Combo updated!' : 'Combo created!');
        setShowComboModal(false);
        fetchCombos();
        refreshProducts();
      } else {
        alert('Error: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error saving combo:', error);
      alert('Error saving combo');
    }
  };

  const handleDeleteCombo = async (combo) => {
    if (!confirm(`Delete combo "${combo.name}"?`)) return;

    try {
      const response = await fetchWithAuth(`${API_URL}/combos/${combo.id}`, {
        method: 'DELETE'
      });
      const result = await response.json();

      if (result.success) {
        alert('Combo deleted');
        fetchCombos();
        refreshProducts();
      } else {
        alert('Error: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error deleting combo:', error);
      alert('Error deleting combo');
    }
  };

  const addComboItem = () => {
    setComboFormData(prev => ({
      ...prev,
      items: [...prev.items, { product_id: '', quantity: 1, size_name: '' }]
    }));
  };

  const updateComboItem = (index, field, value) => {
    setComboFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) =>
        i === index ? { ...item, [field]: field === 'quantity' ? parseInt(value) || 1 : value } : item
      )
    }));
  };

  const removeComboItem = (index) => {
    setComboFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const getDefaultProductModalPos = () => {
    if (typeof window === 'undefined') return { x: 24, y: 24 };
    const modalWidth = Math.min(512, window.innerWidth - 32);
    const estimatedModalHeight = 720;
    const centeredX = Math.max(8, (window.innerWidth - modalWidth) / 2);
    const centeredY = Math.max(8, (window.innerHeight - estimatedModalHeight) / 2 - 150);
    return { x: centeredX, y: centeredY };
  };

  const startProductModalDrag = (e) => {
    if (e.button !== 0) return;
    if (e.target.closest('button,input,select,textarea,label,a')) return;
    productModalDragRef.current = {
      offsetX: e.clientX - productModalPos.x,
      offsetY: e.clientY - productModalPos.y
    };
    setIsDraggingProductModal(true);
  };

  useEffect(() => {
    if (!isDraggingProductModal) return;

    const onMouseMove = (e) => {
      const modalRect = productModalRef.current?.getBoundingClientRect();
      const modalWidth = modalRect?.width || 512;
      const modalHeight = modalRect?.height || 720;
      const minX = 8;
      const minY = 8;
      const maxX = Math.max(minX, window.innerWidth - modalWidth - 8);
      const maxY = Math.max(minY, window.innerHeight - modalHeight - 8);

      const nextX = Math.min(maxX, Math.max(minX, e.clientX - productModalDragRef.current.offsetX));
      const nextY = Math.min(maxY, Math.max(minY, e.clientY - productModalDragRef.current.offsetY));
      setProductModalPos({ x: nextX, y: nextY });
    };

    const onMouseUp = () => setIsDraggingProductModal(false);

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [isDraggingProductModal]);

  const openAddModal = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      category: 'Pizza',
      price: '',
      description: '',
      image: '',
      popular: false,
      sku: '',
      barcode: '',
      sizes: [],
      active: true,
      stock_quantity: 0,
      low_stock_threshold: 10,
      send_to_kitchen: true,
      cost: ''
    });
    setHasSizes(false);
    setProductModalPos(getDefaultProductModalPos());
    setShowModal(true);
  };

  const openEditModal = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      category: product.category,
      price: product.price || '',
      description: product.description || '',
      image: product.image || '',
      popular: product.popular || false,
      sku: product.sku || '',
      barcode: product.barcode || '',
      active: product.active !== false,
      stock_quantity: product.stock_quantity || 0,
      low_stock_threshold: product.low_stock_threshold || 10,
      send_to_kitchen: product.send_to_kitchen !== false,
      cost: product.cost || '',
      sizes: product.sizes ? product.sizes.map(s => ({ ...s, cost: s.cost || 0 })) : []
    });
    setHasSizes(product.sizes && product.sizes.length > 0);
    setProductModalPos(getDefaultProductModalPos());
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (productSaving) return;

    const payload = {
      name: formData.name,
      category: formData.category,
      price: hasSizes ? null : parseFloat(formData.price) || null,
      description: formData.description,
      image: formData.image,
      popular: formData.popular,
      sku: formData.sku?.trim() || null,
      barcode: formData.barcode || null,
      sizes: hasSizes ? formData.sizes : null,
      active: formData.active,
      stock_quantity: parseInt(formData.stock_quantity) || 0,
      low_stock_threshold: parseInt(formData.low_stock_threshold) || 10,
      send_to_kitchen: formData.send_to_kitchen,
      cost: parseFloat(formData.cost) || 0
    };

    setProductSaving(true);
    try {
      const url = editingProduct
        ? `${API_URL}/products/${editingProduct.id}`
        : `${API_URL}/products`;

      const response = await fetchWithAuth(url, {
        method: editingProduct ? 'PUT' : 'POST',
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (result.success) {
        alert(editingProduct ? 'Product updated!' : 'Product created!');
        setShowModal(false);
        refreshProducts();
      } else {
        alert('Error: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error saving product:', error);
      alert('Error saving product');
    } finally {
      setProductSaving(false);
    }
  };

  const handleDelete = async (product) => {
    if (!confirm(`Delete "${product.name}"?`)) return;

    try {
      const response = await fetchWithAuth(`${API_URL}/products/${product.id}`, {
        method: 'DELETE'
      });
      const result = await response.json();

      if (result.success) {
        alert('Product deleted');
        refreshProducts();
      } else {
        alert('Error: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Error deleting product');
    }
  };

  const toggleProductSelection = (productId) => {
    const id = String(productId);
    setSelectedProductIds(prev => (
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    ));
  };

  const toggleSelectAllFiltered = () => {
    if (isAllFilteredSelected) {
      const filteredIds = new Set(filteredProducts.map(p => String(p.id)));
      setSelectedProductIds(prev => prev.filter(id => !filteredIds.has(id)));
      return;
    }
    const filteredIds = filteredProducts.map(p => String(p.id));
    setSelectedProductIds(prev => Array.from(new Set([...prev, ...filteredIds])));
  };

  const handleBulkDelete = async () => {
    const targets = regularProducts.filter(p => selectedProductIds.includes(String(p.id)));
    if (targets.length === 0) {
      alert('No products selected.');
      return;
    }
    if (!confirm(`Delete ${targets.length} selected product(s)? This cannot be undone.`)) return;

    setBulkDeleteState({ running: true, total: targets.length, done: 0, current: '' });
    let success = 0;
    const failures = [];

    for (let i = 0; i < targets.length; i++) {
      const product = targets[i];
      setBulkDeleteState({ running: true, total: targets.length, done: i, current: product.name });
      try {
        const response = await fetchWithAuth(`${API_URL}/products/${product.id}`, { method: 'DELETE' });
        const result = await response.json().catch(() => ({}));
        if (response.ok && result.success) {
          success += 1;
        } else {
          failures.push(`${product.name}: ${result.error || 'delete failed'}`);
        }
      } catch (error) {
        failures.push(`${product.name}: ${error.message}`);
      }
    }

    setBulkDeleteState({ running: true, total: targets.length, done: targets.length, current: '' });
    await refreshProducts();
    setSelectedProductIds([]);
    setBulkDeleteState({ running: false, total: 0, done: 0, current: '' });

    if (failures.length > 0) {
      const preview = failures.slice(0, 5).join('\n');
      alert(`Bulk delete done.\nDeleted: ${success}\nFailed: ${failures.length}\n\n${preview}`);
    } else {
      alert(`Bulk delete complete. Deleted ${success} product(s).`);
    }
  };

  const addSize = () => {
    setFormData(prev => ({
      ...prev,
      sizes: [...prev.sizes, { name: '', price: '', cost: '' }]
    }));
  };

  const updateSize = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      sizes: prev.sizes.map((size, i) =>
        i === index ? { ...size, [field]: (field === 'price' || field === 'cost') ? parseFloat(value) || '' : value } : size
      )
    }));
  };

  const removeSize = (index) => {
    setFormData(prev => ({
      ...prev,
      sizes: prev.sizes.filter((_, i) => i !== index)
    }));
  };

  const addCategory = () => {
    const name = newCategoryName.trim();
    if (!name) return;
    if (productCategories.some(c => c.toLowerCase() === name.toLowerCase())) {
      alert('Category already exists.');
      return;
    }
    setManualCategories(prev => [...prev, name]);
    setNewCategoryName('');
  };

  const renameCategory = async () => {
    if (!renameFrom || !renameTo.trim()) return;
    const to = renameTo.trim();
    if (renameFrom.toLowerCase() === to.toLowerCase()) return;

    const targets = regularProducts.filter(p => p.category === renameFrom);
    if (targets.length === 0) {
      alert('No products found in selected category.');
      return;
    }

    setCategorySaving(true);
    try {
      let ok = 0;
      for (const product of targets) {
        const payload = {
          name: product.name,
          category: to,
          price: product.price ?? null,
          description: product.description || '',
          image: product.image || '',
          popular: !!product.popular,
          sku: product.sku || null,
          barcode: product.barcode || null,
          sizes: product.sizes || null,
          active: product.active !== false,
          stock_quantity: parseInt(product.stock_quantity || 0, 10),
          low_stock_threshold: parseInt(product.low_stock_threshold || 10, 10),
          send_to_kitchen: product.send_to_kitchen !== false
        };
        const res = await fetchWithAuth(`${API_URL}/products/${product.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.success) ok++;
      }

      setManualCategories(prev => Array.from(new Set([...prev.filter(c => c !== renameFrom), to])));
      await refreshProducts();
      alert(`Category updated for ${ok}/${targets.length} products.`);
      setRenameFrom('');
      setRenameTo('');
    } catch (e) {
      console.error('Error renaming category:', e);
      alert('Failed to rename category.');
    } finally {
      setCategorySaving(false);
    }
  };

  const addModifier = async () => {
    const name = modifierForm.name.trim();
    const price = Number(modifierForm.price || 0);
    if (!name) return;
    if (!Number.isFinite(price)) {
      alert('Modifier price is invalid.');
      return;
    }
    try {
      const res = await fetchWithAuth(`${API_URL}/modifiers`, {
        method: 'POST',
        body: JSON.stringify({
          name,
          type: modifierForm.type,
          price,
          active: !!modifierForm.active
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create modifier');
      }
      await fetchModifiers();
      setModifierForm({ name: '', type: 'addon', price: '', active: true });
    } catch (e) {
      console.error('Error creating modifier:', e);
      alert(e.message || 'Failed to create modifier');
    }
  };

  const removeModifier = async (id) => {
    try {
      const res = await fetchWithAuth(`${API_URL}/modifiers/${id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete modifier');
      }
      await fetchModifiers();
    } catch (e) {
      console.error('Error deleting modifier:', e);
      alert(e.message || 'Failed to delete modifier');
    }
  };

  const toggleModifier = async (id) => {
    const mod = modifiers.find(m => m.id === id);
    if (!mod) return;
    try {
      const res = await fetchWithAuth(`${API_URL}/modifiers/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ active: !mod.active })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update modifier');
      }
      await fetchModifiers();
    } catch (e) {
      console.error('Error updating modifier:', e);
      alert(e.message || 'Failed to update modifier');
    }
  };

  const applyPricingAdjustment = async () => {
    const raw = Number(priceAdjustValue);
    if (!Number.isFinite(raw) || raw === 0) {
      alert('Enter a valid price adjustment value.');
      return;
    }

    const targets = regularProducts.filter(p => pricingCategory === 'All' || p.category === pricingCategory);
    if (targets.length === 0) {
      alert('No products matched the selected category.');
      return;
    }

    setPricingSaving(true);
    try {
      let updated = 0;
      for (const product of targets) {
        const scale = priceAdjustType === 'percent' ? (1 + raw / 100) : null;
        const adjust = (v) => {
          const n = Number(v || 0);
          if (!Number.isFinite(n)) return 0;
          const next = priceAdjustType === 'percent' ? n * scale : n + raw;
          return Math.max(0, Number(next.toFixed(2)));
        };

        const nextSizes = Array.isArray(product.sizes) && product.sizes.length > 0
          ? product.sizes.map(s => ({ ...s, price: adjust(s.price) }))
          : null;

        const nextPrice = nextSizes ? null : adjust(product.price);

        const payload = {
          name: product.name,
          category: product.category,
          price: nextPrice,
          description: product.description || '',
          image: product.image || '',
          popular: !!product.popular,
          sku: product.sku || null,
          barcode: product.barcode || null,
          sizes: nextSizes,
          active: product.active !== false,
          stock_quantity: parseInt(product.stock_quantity || 0, 10),
          low_stock_threshold: parseInt(product.low_stock_threshold || 10, 10),
          send_to_kitchen: product.send_to_kitchen !== false,
          cost: product.cost || 0
        };

        const res = await fetchWithAuth(`${API_URL}/products/${product.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.success) updated++;
      }

      await refreshProducts();
      alert(`Pricing updated for ${updated}/${targets.length} products.`);
      setPriceAdjustValue('');
    } catch (e) {
      console.error('Error applying pricing:', e);
      alert('Failed to apply pricing update.');
    } finally {
      setPricingSaving(false);
    }
  };

  const parseCsvLine = (line) => {
    const out = [];
    let cur = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        out.push(cur.trim());
        cur = '';
      } else {
        cur += ch;
      }
    }
    out.push(cur.trim());
    return out;
  };

  const normalizeCsvBoolean = (v, fallback) => {
    if (v === undefined || v === null || String(v).trim() === '') return fallback;
    const raw = String(v).trim().toLowerCase();
    if (['true', '1', 'yes', 'y'].includes(raw)) return true;
    if (['false', '0', 'no', 'n'].includes(raw)) return false;
    return fallback;
  };

  const downloadCsvTemplate = () => {
    const header = [
      'name',
      'category',
      'price',
      'sku',
      'barcode',
      'stock_quantity',
      'low_stock_threshold',
      'description',
      'image',
      'active',
      'popular',
      'send_to_kitchen',
      'cost'
    ];
    const sampleRow = [
      'Classic Burger',
      'Burgers',
      '159.00',
      'BRG-001',
      '1234567890123',
      '25',
      '10',
      'Beef patty with lettuce and tomato',
      'assets/images/food/burger.jpg',
      'true',
      'false',
      'true',
      '85.00'
    ];
    const csv = `${header.join(',')}\n${sampleRow.join(',')}\n`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'products_import_template.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const importProductsFromCsv = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setCsvImporting(true);
    try {
      const raw = await file.text();
      const lines = raw
        .split(/\r?\n/)
        .map(l => l.trim())
        .filter(Boolean);

      if (lines.length < 2) {
        alert('CSV file has no data rows.');
        return;
      }

      const headers = parseCsvLine(lines[0]).map(h => h.toLowerCase());
      const requiredHeaders = ['name', 'category', 'price'];
      const missing = requiredHeaders.filter(h => !headers.includes(h));
      if (missing.length > 0) {
        alert(`Missing required column(s): ${missing.join(', ')}`);
        return;
      }

      let successCount = 0;
      const errors = [];

      for (let i = 1; i < lines.length; i++) {
        const row = parseCsvLine(lines[i]);
        if (row.length === 1 && !row[0]) continue;

        const getVal = (key) => {
          const idx = headers.indexOf(key);
          return idx >= 0 ? (row[idx] ?? '') : '';
        };

        const name = getVal('name');
        const category = getVal('category');
        const price = parseFloat(getVal('price'));

        if (!name || !category || !Number.isFinite(price)) {
          errors.push(`Row ${i + 1}: invalid name/category/price`);
          continue;
        }

        const payload = {
          name,
          category,
          price,
          sku: getVal('sku') || null,
          barcode: getVal('barcode') || null,
          stock_quantity: parseInt(getVal('stock_quantity'), 10) || 0,
          low_stock_threshold: parseInt(getVal('low_stock_threshold'), 10) || 10,
          description: getVal('description') || '',
          image: getVal('image') || '',
          active: normalizeCsvBoolean(getVal('active'), true),
          popular: normalizeCsvBoolean(getVal('popular'), false),
          send_to_kitchen: normalizeCsvBoolean(getVal('send_to_kitchen'), true),
          cost: parseFloat(getVal('cost')) || 0,
          sizes: null
        };

        try {
          const response = await fetchWithAuth(`${API_URL}/products`, {
            method: 'POST',
            body: JSON.stringify(payload)
          });
          const result = await response.json().catch(() => ({}));
          if (response.ok && result.success) {
            successCount++;
          } else {
            errors.push(`Row ${i + 1}: ${result.error || 'failed to create product'}`);
          }
        } catch (err) {
          errors.push(`Row ${i + 1}: ${err.message}`);
        }
      }

      await refreshProducts();

      if (errors.length > 0) {
        const preview = errors.slice(0, 5).join('\n');
        alert(`CSV import done.\nSuccess: ${successCount}\nFailed: ${errors.length}\n\n${preview}`);
      } else {
        alert(`CSV import complete. ${successCount} products added.`);
      }
    } catch (error) {
      console.error('CSV import error:', error);
      alert(`Failed to import CSV: ${error.message}`);
    } finally {
      setCsvImporting(false);
      if (event.target) event.target.value = '';
    }
  };

  return (
    <div className="bg-gray-100 min-h-screen pt-10 pb-20 md:pb-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header with Tabs */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-gray-800">Product Management</h1>
              {lowStockCount > 0 && (
                <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
                  ⚠️ {lowStockCount} Low Stock
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-end">
              {activeTab === 'products' && (
                <>
                  <input
                    ref={csvInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    onChange={importProductsFromCsv}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={downloadCsvTemplate}
                    className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-50 transition-colors text-sm"
                  >
                    Download CSV Template
                  </button>
                  <button
                    type="button"
                    disabled={csvImporting}
                    onClick={() => csvInputRef.current?.click()}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {csvImporting ? 'Importing...' : 'Upload CSV'}
                  </button>
                  {selectedProductIds.length > 0 && (
                    <button
                      type="button"
                      onClick={handleBulkDelete}
                      disabled={bulkDeleteState.running}
                      className="bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 transition-colors text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {bulkDeleteState.running
                        ? `Deleting ${bulkDeleteState.done}/${bulkDeleteState.total}...`
                        : `Delete Selected (${selectedProductIds.length})`}
                    </button>
                  )}
                </>
              )}
              {activeTab === 'products' && (
                <button
                  onClick={openAddModal}
                  className="bg-cyan-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-cyan-700 transition-colors flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Add Product
                </button>
              )}
              {activeTab === 'combos' && (
                <button
                  onClick={openAddComboModal}
                  className="bg-cyan-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-cyan-700 transition-colors flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Add Combo
                </button>
              )}
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {[
              { id: 'products', label: 'Products' },
              { id: 'combos', label: 'Combos' },
              { id: 'categories', label: 'Categories' },
              { id: 'modifiers', label: 'Modifiers' },
              { id: 'pricing', label: 'Pricing' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 font-medium transition-colors ${activeTab === tab.id
                  ? 'bg-cyan-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'products' && (
          <>
            {bulkDeleteState.running && (
              <div className="bg-white rounded-lg shadow-sm p-4 mb-4 border border-cyan-100">
                <div className="flex items-center justify-between mb-2 text-sm">
                  <span className="font-medium text-cyan-700">
                    Deleting products... {bulkDeleteState.done}/{bulkDeleteState.total}
                  </span>
                  <span className="text-gray-500 truncate ml-3 max-w-[60%]">{bulkDeleteState.current}</span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-cyan-600 transition-all"
                    style={{ width: `${bulkDeleteState.total ? (bulkDeleteState.done / bulkDeleteState.total) * 100 : 0}%` }}
                  />
                </div>
              </div>
            )}

            {/* Filters */}
            <div className="bg-white rounded-lg shadow-sm p-4 mb-4 flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search by name or barcode..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-cyan-500"
                />
              </div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-cyan-500"
              >
                {['All', ...productCategories].map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Products Table */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full font-data-table">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-center px-3 py-3 text-sm font-semibold text-gray-600">
                        <input
                          type="checkbox"
                          checked={isAllFilteredSelected}
                          onChange={toggleSelectAllFiltered}
                          className="w-4 h-4 accent-cyan-600 cursor-pointer"
                          title="Select all in current filter"
                        />
                      </th>
                      <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">Product</th>
                      <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">Category</th>
                      <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">Price</th>
                      <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">Barcode</th>
                      <th className="text-center px-4 py-3 text-sm font-semibold text-gray-600">Stock</th>
                      <th className="text-center px-4 py-3 text-sm font-semibold text-gray-600">Status</th>
                      <th className="text-center px-4 py-3 text-sm font-semibold text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredProducts.map(product => (
                      <tr key={product.id} className="hover:bg-gray-50">
                        <td className="px-3 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={selectedProductIds.includes(String(product.id))}
                            onChange={() => toggleProductSelection(product.id)}
                            className="w-4 h-4 accent-cyan-600 cursor-pointer"
                            title={`Select ${product.name}`}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden border border-gray-100">
                              {product.image && (product.image.startsWith('http') || product.image.startsWith('assets/') || product.image.startsWith('/')) ? (
                                <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-300">
                                  {product.image && product.image.length < 5 ? (
                                    <span className="text-lg">{product.image}</span>
                                  ) : (
                                    <UtensilsCrossed className="w-5 h-5 opacity-40" />
                                  )}
                                </div>
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-gray-800">{product.name}</p>
                              {product.popular && (
                                <span className="text-xs bg-cyan-100 text-cyan-700 px-2 py-0.5 rounded-full">Popular</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{product.category}</td>
                        <td className="px-4 py-3">
                          {product.sizes ? (
                            <span className="text-gray-600 text-sm">
                              Php {Math.min(...product.sizes.map(s => s.price)).toFixed(2)} - {Math.max(...product.sizes.map(s => s.price)).toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-gray-800 font-medium">Php {product.price?.toFixed(2) || '—'}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`font-mono text-sm ${product.barcode ? 'text-gray-800' : 'text-gray-400'}`}>
                            {product.barcode || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {product.ingredient_count > 0 ? (
                            <span className="text-[10px] uppercase font-bold tracking-wider text-blue-600 bg-blue-50 px-2 py-1 rounded">
                              Composite
                            </span>
                          ) : (
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${product.stock_quantity <= product.low_stock_threshold
                              ? 'bg-red-100 text-red-700'
                              : 'bg-gray-100 text-gray-700'
                              }`}>
                              {product.stock_quantity}
                              {product.stock_quantity <= product.low_stock_threshold && ' ⚠️'}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-xs px-2 py-1 rounded-full ${product.active !== false ? 'bg-cyan-100 text-cyan-700' : 'bg-gray-100 text-gray-500'}`}>
                            {product.active !== false ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => openEditModal(product)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDelete(product)}
                              disabled={bulkDeleteState.running}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Delete"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredProducts.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                          No products found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Combos Tab */}
        {activeTab === 'combos' && (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full font-data-table">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">Combo</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">Items Included</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">Price</th>
                    <th className="text-center px-4 py-3 text-sm font-semibold text-gray-600">Status</th>
                    <th className="text-center px-4 py-3 text-sm font-semibold text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {combos.map(combo => (
                    <tr key={combo.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {combo.image ? (
                            <img
                              src={combo.image}
                              alt={combo.name}
                              className="w-12 h-12 object-cover rounded-lg"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = '';
                                e.target.parentElement.innerHTML = `<div class="w-12 h-12 bg-cyan-100 rounded-lg flex items-center justify-center"><span class="text-cyan-600 font-bold text-sm">C${combo.id}</span></div>`;
                              }}
                            />
                          ) : (
                            <div className="w-12 h-12 bg-cyan-100 rounded-lg flex items-center justify-center">
                              <span className="text-cyan-600 font-bold text-sm">C{combo.id}</span>
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-gray-800">{combo.name}</p>
                            {combo.description && (
                              <p className="text-xs text-gray-500 truncate max-w-xs">{combo.description}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-sm">
                        {combo.items.map((item, idx) => (
                          <span key={idx}>
                            {item.quantity}x {item.product_name}{item.size_name ? ` (${item.size_name})` : ''}
                            {idx < combo.items.length - 1 ? ', ' : ''}
                          </span>
                        ))}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-cyan-600 font-bold">Php {combo.price.toFixed(2)}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs px-2 py-1 rounded-full ${combo.active !== false ? 'bg-cyan-100 text-cyan-700' : 'bg-gray-100 text-gray-500'}`}>
                          {combo.active !== false ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openEditComboModal(combo)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteCombo(combo)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {combos.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                        No combos yet. Click "Add Combo" to create one.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {/* Categories Tab */}
        {activeTab === 'categories' && (
          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Add Category</h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Category name"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-cyan-500"
                />
                <button
                  type="button"
                  onClick={addCategory}
                  className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700"
                >
                  Add
                </button>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Rename Category</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <select
                  value={renameFrom}
                  onChange={(e) => setRenameFrom(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-cyan-500"
                >
                  <option value="">Select category</option>
                  {productCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={renameTo}
                  onChange={(e) => setRenameTo(e.target.value)}
                  placeholder="New category name"
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-cyan-500"
                />
                <button
                  type="button"
                  disabled={categorySaving}
                  onClick={renameCategory}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60"
                >
                  {categorySaving ? 'Saving...' : 'Apply Rename'}
                </button>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200">
                <h3 className="font-semibold text-gray-800">Current Categories</h3>
              </div>
              <div className="p-4 flex flex-wrap gap-2">
                {productCategories.map(cat => (
                  <span key={cat} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                    {cat}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Modifiers Tab */}
        {activeTab === 'modifiers' && (
          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Add Modifier</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                <input
                  type="text"
                  value={modifierForm.name}
                  onChange={(e) => setModifierForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Modifier name"
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-cyan-500"
                />
                <select
                  value={modifierForm.type}
                  onChange={(e) => setModifierForm(prev => ({ ...prev, type: e.target.value }))}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-cyan-500"
                >
                  <option value="addon">Add-on</option>
                  <option value="option">Option</option>
                </select>
                <input
                  type="number"
                  step="0.01"
                  value={modifierForm.price}
                  onChange={(e) => setModifierForm(prev => ({ ...prev, price: e.target.value }))}
                  placeholder="Price"
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-cyan-500"
                />
                <button
                  type="button"
                  onClick={addModifier}
                  className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700"
                >
                  Save Modifier
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">Modifiers are stored in database.</p>
            </div>

            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <table className="w-full font-data-table">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">Name</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">Type</th>
                    <th className="text-right px-4 py-3 text-sm font-semibold text-gray-600">Price</th>
                    <th className="text-center px-4 py-3 text-sm font-semibold text-gray-600">Status</th>
                    <th className="text-center px-4 py-3 text-sm font-semibold text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {modifiers.map(mod => (
                    <tr key={mod.id}>
                      <td className="px-4 py-3 text-gray-800">{mod.name}</td>
                      <td className="px-4 py-3 text-gray-600 capitalize">{mod.type}</td>
                      <td className="px-4 py-3 text-right text-gray-700">Php {Number(mod.price || 0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs px-2 py-1 rounded-full ${mod.active ? 'bg-cyan-100 text-cyan-700' : 'bg-gray-100 text-gray-500'}`}>
                          {mod.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button type="button" onClick={() => toggleModifier(mod.id)} className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
                            Toggle
                          </button>
                          <button type="button" onClick={() => removeModifier(mod.id)} className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded">
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {modifiers.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-gray-500">No modifiers yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pricing Tab */}
        {activeTab === 'pricing' && (
          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Bulk Pricing Update</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                <select
                  value={pricingCategory}
                  onChange={(e) => setPricingCategory(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-cyan-500"
                >
                  <option value="All">All Categories</option>
                  {productCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <select
                  value={priceAdjustType}
                  onChange={(e) => setPriceAdjustType(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-cyan-500"
                >
                  <option value="percent">Percent (%)</option>
                  <option value="fixed">Fixed Amount (Php)</option>
                </select>
                <input
                  type="number"
                  step="0.01"
                  value={priceAdjustValue}
                  onChange={(e) => setPriceAdjustValue(e.target.value)}
                  placeholder={priceAdjustType === 'percent' ? 'e.g. 5 or -5' : 'e.g. 10 or -10'}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-cyan-500"
                />
                <button
                  type="button"
                  disabled={pricingSaving}
                  onClick={applyPricingAdjustment}
                  className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 disabled:opacity-60"
                >
                  {pricingSaving ? 'Applying...' : 'Apply Pricing'}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">Updates regular prices and size prices for matched products.</p>
            </div>

            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <table className="w-full font-data-table">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">Product</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">Category</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">Current Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {regularProducts
                    .filter(p => pricingCategory === 'All' || p.category === pricingCategory)
                    .slice(0, 100)
                    .map(p => (
                      <tr key={p.id}>
                        <td className="px-4 py-3 text-gray-800">{p.name}</td>
                        <td className="px-4 py-3 text-gray-600">{p.category}</td>
                        <td className="px-4 py-3 text-gray-700">
                          {Array.isArray(p.sizes) && p.sizes.length > 0
                            ? `Php ${Math.min(...p.sizes.map(s => Number(s.price || 0))).toFixed(2)} - ${Math.max(...p.sizes.map(s => Number(s.price || 0))).toFixed(2)}`
                            : `Php ${Number(p.price || 0).toFixed(2)}`}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Product Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[90]">
          <div
            ref={productModalRef}
            className={`absolute bg-white rounded-xl shadow-2xl w-[min(32rem,calc(100vw-2rem))] max-h-[calc(100vh-16px)] overflow-hidden flex flex-col ${isDraggingProductModal ? 'cursor-grabbing' : ''}`}
            style={{ left: `${productModalPos.x}px`, top: `${productModalPos.y}px` }}
          >
            <div className="h-1 w-full bg-cyan-600 rounded-t-xl"></div>
            <div
              onMouseDown={startProductModalDrag}
              className={`p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white select-none ${isDraggingProductModal ? 'cursor-grabbing' : 'cursor-move'}`}
            >
              <h2 className="text-xl font-bold text-gray-800">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            {productSaving && (
              <div className="px-6 py-2 bg-cyan-50 border-b border-cyan-100">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-cyan-700 font-medium">Saving product...</span>
                  <span className="text-cyan-600">Please wait</span>
                </div>
                <div className="w-full h-1.5 bg-cyan-100 rounded-full overflow-hidden">
                  <div className="h-full w-1/2 bg-cyan-600 animate-pulse"></div>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col min-h-0">
              <div className="p-6 grid grid-cols-2 gap-4 overflow-y-auto scrollbar-hide min-h-0 bg-white">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                  <select
                    required
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-cyan-500"
                  >
                    {productCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Barcode</label>
                  <input
                    type="text"
                    value={formData.barcode}
                    onChange={(e) => setFormData(prev => ({ ...prev, barcode: e.target.value }))}
                    placeholder="Scan or enter barcode"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
                  <input
                    type="text"
                    value={formData.sku}
                    onChange={(e) => setFormData(prev => ({ ...prev, sku: e.target.value }))}
                    placeholder="Enter SKU"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>

                <div className="flex items-center gap-2 col-span-2">
                  <input
                    type="checkbox"
                    id="hasSizes"
                    checked={hasSizes}
                    onChange={(e) => {
                      setHasSizes(e.target.checked);
                      if (e.target.checked && formData.sizes.length === 0) {
                        setFormData(prev => ({ ...prev, sizes: [{ name: 'Small', price: '' }, { name: 'Medium', price: '' }, { name: 'Large', price: '' }] }));
                      }
                    }}
                    className="w-4 h-4 text-cyan-600 rounded focus:ring-cyan-500"
                  />
                  <label htmlFor="hasSizes" className="text-sm font-medium text-gray-700">
                    Has multiple sizes (e.g., Small/Medium/Large)
                  </label>
                </div>

                {hasSizes ? (
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Sizes & Prices *</label>
                    <div className="space-y-2">
                      {formData.sizes.map((size, index) => (
                        <div key={index} className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Size name"
                            value={size.name}
                            onChange={(e) => updateSize(index, 'name', e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-cyan-500"
                          />
                          <input
                            type="number"
                            step="0.01"
                            placeholder="Price"
                            value={size.price}
                            onChange={(e) => updateSize(index, 'price', e.target.value)}
                            className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-cyan-500"
                          />
                          <input
                            type="number"
                            step="0.01"
                            placeholder="Cost"
                            value={size.cost}
                            onChange={(e) => updateSize(index, 'cost', e.target.value)}
                            className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-cyan-500"
                          />
                          <button
                            type="button"
                            onClick={() => removeSize(index)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={addSize}
                      className="mt-2 text-cyan-600 text-sm font-medium hover:text-cyan-700"
                    >
                      + Add Size
                    </button>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Price *</label>
                    <input
                      type="number"
                      step="0.01"
                      required={!hasSizes}
                      value={formData.price}
                      onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit Cost (Php)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.cost}
                    onChange={(e) => setFormData(prev => ({ ...prev, cost: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-cyan-500"
                  />
                  <p className="text-[10px] text-gray-500 mt-1">Foundational for profit tracking</p>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={2}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Product Photo</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formData.image}
                      onChange={(e) => setFormData(prev => ({ ...prev, image: e.target.value }))}
                      placeholder="assets/images/food/..."
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-cyan-500"
                    />
                    <label className="flex items-center justify-center p-2 rounded-lg bg-gray-100 hover:bg-cyan-50 border border-gray-200 cursor-pointer transition-all group" title="Browse Photo">
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={(e) => handlePhotoUpload(e.target.files[0], 'product')}
                        disabled={imageUploading}
                      />
                      {imageUploading ? (
                        <div className="w-5 h-5 border-2 border-cyan-600 border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <Upload className="w-5 h-5 text-gray-500 group-hover:text-cyan-600" />
                      )}
                    </label>
                  </div>
                  {formData.image && (
                    <div className="mt-2 relative inline-block group">
                      <img src={formData.image} alt="Preview" className="w-16 h-16 object-cover rounded-lg border border-gray-100 shadow-sm transition-transform group-hover:scale-110" onError={(e) => { e.target.style.display = 'none'; }} />
                      <button 
                        type="button" 
                        onClick={() => setFormData(prev => ({ ...prev, image: '' }))}
                        className="absolute -top-1 -right-1 bg-red-100 text-red-600 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 col-span-2">
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                      Stock Quantity
                      {editingProduct && editingProduct.ingredient_count > 0 && (
                        <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded tracking-wider uppercase font-bold">Menu Composite</span>
                      )}
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.stock_quantity}
                      disabled={editingProduct && editingProduct.ingredient_count > 0}
                      onChange={(e) => setFormData(prev => ({ ...prev, stock_quantity: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-cyan-500 disabled:bg-gray-100 disabled:text-gray-400"
                    />
                    {editingProduct && editingProduct.ingredient_count > 0 && (
                      <p className="text-[11px] text-gray-500 mt-1 italic">Calculated automatically via recipes. Check Raw Materials.</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Low Stock Alert</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.low_stock_threshold}
                      disabled={editingProduct && editingProduct.ingredient_count > 0}
                      onChange={(e) => setFormData(prev => ({ ...prev, low_stock_threshold: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-cyan-500 disabled:bg-gray-100 disabled:text-gray-400"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 col-span-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="popular"
                      checked={formData.popular}
                      onChange={(e) => setFormData(prev => ({ ...prev, popular: e.target.checked }))}
                      className="w-4 h-4 text-cyan-600 rounded focus:ring-cyan-500"
                    />
                    <label htmlFor="popular" className="text-sm font-medium text-gray-700">
                      Mark as Popular
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="active"
                      checked={formData.active}
                      onChange={(e) => setFormData(prev => ({ ...prev, active: e.target.checked }))}
                      className="w-4 h-4 text-cyan-600 rounded focus:ring-cyan-500"
                    />
                    <label htmlFor="active" className="text-sm font-medium text-gray-700">
                      Active (Show in POS)
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="send_to_kitchen"
                      checked={formData.send_to_kitchen}
                      onChange={(e) => setFormData(prev => ({ ...prev, send_to_kitchen: e.target.checked }))}
                      className="w-4 h-4 text-orange-500 rounded focus:ring-orange-400"
                    />
                    <label htmlFor="send_to_kitchen" className="text-sm font-medium text-gray-700">
                      Send to Kitchen (KDS)
                    </label>
                  </div>
                </div>

              </div>
              <div className="sticky bottom-0 z-10 flex gap-3 p-6 pt-4 border-t border-gray-200 bg-white">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={productSaving}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={productSaving}
                  className="flex-1 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {productSaving ? 'Saving...' : (editingProduct ? 'Update Product' : 'Create Product')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add/Edit Combo Modal */}
      {showComboModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white">
              <h2 className="text-xl font-bold text-gray-800">
                {editingCombo ? 'Edit Combo' : 'Add New Combo'}
              </h2>
              <button
                onClick={() => setShowComboModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleComboSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Combo Name *</label>
                <input
                  type="text"
                  required
                  value={comboFormData.name}
                  onChange={(e) => setComboFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Family Meal Deal"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Combo Price *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={comboFormData.price}
                  onChange={(e) => setComboFormData(prev => ({ ...prev, price: e.target.value }))}
                  placeholder="Total combo price"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={comboFormData.description}
                  onChange={(e) => setComboFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={2}
                  placeholder="Optional description"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Image URL / Upload</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={comboFormData.image}
                    onChange={(e) => setComboFormData(prev => ({ ...prev, image: e.target.value }))}
                    placeholder="e.g., assets/images/food/combo.png"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-cyan-500"
                  />
                  <label className="flex items-center justify-center p-2 rounded-lg bg-gray-100 hover:bg-cyan-50 border border-gray-200 cursor-pointer transition-all group" title="Browse Photo">
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => handlePhotoUpload(e.target.files[0], 'combo')}
                      disabled={imageUploading}
                    />
                    {imageUploading ? (
                      <div className="w-5 h-5 border-2 border-cyan-600 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <Upload className="w-5 h-5 text-gray-500 group-hover:text-cyan-600" />
                    )}
                  </label>
                </div>
                {comboFormData.image && (
                  <div className="mt-2">
                    <img
                      src={comboFormData.image}
                      alt="Preview"
                      className="w-20 h-20 object-cover rounded-lg border border-gray-200"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Items Included *</label>
                <div className="space-y-2">
                  {comboFormData.items.map((item, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <select
                        value={item.product_id}
                        onChange={(e) => updateComboItem(index, 'product_id', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-cyan-500"
                      >
                        <option value="">Select product...</option>
                        {regularProducts.map(product => (
                          <option key={product.id} value={product.id}>
                            {product.name} {product.sizes ? '(has sizes)' : `- Php ${product.price?.toFixed(2)}`}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateComboItem(index, 'quantity', e.target.value)}
                        className="w-16 px-2 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-cyan-500 text-center"
                        title="Quantity"
                      />
                      <input
                        type="text"
                        value={item.size_name || ''}
                        onChange={(e) => updateComboItem(index, 'size_name', e.target.value)}
                        placeholder="Size"
                        className="w-20 px-2 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-cyan-500"
                        title="Size (optional)"
                      />
                      <button
                        type="button"
                        onClick={() => removeComboItem(index)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                        disabled={comboFormData.items.length === 1}
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={addComboItem}
                  className="mt-2 text-cyan-600 text-sm font-medium hover:text-cyan-700"
                >
                  + Add Item
                </button>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="comboActive"
                  checked={comboFormData.active}
                  onChange={(e) => setComboFormData(prev => ({ ...prev, active: e.target.checked }))}
                  className="w-4 h-4 text-cyan-600 rounded focus:ring-cyan-500"
                />
                <label htmlFor="comboActive" className="text-sm font-medium text-gray-700">
                  Active (Show in POS)
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowComboModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors font-medium"
                >
                  {editingCombo ? 'Update Combo' : 'Create Combo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function ReconciliationAssistant({ message, mood = 'ok' }) {
  const moodColors = {
    ok: { bubble: 'bg-green-50 border-cyan-300 text-cyan-800', glow: '#4ADE80', eye: '#22C55E', eyeDark: '#15803D', label: 'text-cyan-600' },
    warn: { bubble: 'bg-amber-50 border-amber-300 text-amber-800', glow: '#FCD34D', eye: '#F59E0B', eyeDark: '#B45309', label: 'text-amber-600' },
    alert: { bubble: 'bg-red-50 border-red-300 text-red-800', glow: '#FCA5A5', eye: '#EF4444', eyeDark: '#991B1B', label: 'text-red-600' },
  };
  const c = moodColors[mood] || moodColors.ok;

  return (
    <div className="relative flex items-start gap-3 py-2">

      {/* ── Robot Avatar ── */}
      <div className="flex-shrink-0 w-16 h-16">
        <svg viewBox="0 0 100 120" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-md">
          <style>{`
            @keyframes rb-bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-3px)} }
            @keyframes rb-blink  { 0%,88%,100%{transform:scaleY(1)} 92%{transform:scaleY(0.08)} }
            @keyframes rb-pulse  { 0%,100%{opacity:1} 50%{opacity:0.4} }
            .rb-root  { animation: rb-bounce 2.4s ease-in-out infinite; }
            .rb-eye   { animation: rb-blink  3.5s ease-in-out infinite; transform-origin: center; }
            .rb-pulse { animation: rb-pulse  1.4s ease-in-out infinite; }
          `}</style>

          <g className="rb-root">
            {/* Shadow */}
            <ellipse cx="50" cy="116" rx="20" ry="4" fill="black" opacity="0.12" />

            {/* Antenna stem */}
            <rect x="47" y="4" width="6" height="14" rx="3" fill="#E2E8F0" />
            {/* Antenna ball */}
            <circle cx="50" cy="3" r="6" fill="white" stroke="#CBD5E1" strokeWidth="1.5" />
            <circle cx="50" cy="3" r="3" fill={c.eye} className="rb-pulse" />

            {/* ── Teardrop Head ──
                Wide at bottom, comes to a gentle point at top-center.
                Path: start at top point, curve out to sides, wide round bottom. */}
            <path
              d="M 50 16
                 C 50 16, 78 28, 78 52
                 C 78 68, 65 80, 50 80
                 C 35 80, 22 68, 22 52
                 C 22 28, 50 16, 50 16 Z"
              fill="white"
              stroke="#E2E8F0"
              strokeWidth="2"
            />

            {/* Head inner highlight */}
            <path
              d="M 50 20 C 50 20 68 30 68 48"
              stroke="white"
              strokeWidth="6"
              strokeLinecap="round"
              opacity="0.5"
              fill="none"
            />

            {/* Eye visor bar — slightly curved to follow teardrop */}
            <path
              d="M 26 46 Q 50 42 74 46 L 74 58 Q 50 62 26 58 Z"
              fill="#1E293B"
              rx="10"
            />

            {/* Left eye */}
            <g className="rb-eye">
              <circle cx="38" cy="52" r="8" fill={c.eye} />
              <circle cx="38" cy="52" r="5" fill={c.eyeDark} />
              <circle cx="38" cy="52" r="2.5" fill="white" />
              <circle cx="40" cy="50" r="1.5" fill="white" opacity="0.85" />
            </g>

            {/* Right eye */}
            <g className="rb-eye">
              <circle cx="62" cy="52" r="8" fill={c.eye} />
              <circle cx="62" cy="52" r="5" fill={c.eyeDark} />
              <circle cx="62" cy="52" r="2.5" fill="white" />
              <circle cx="64" cy="50" r="1.5" fill="white" opacity="0.85" />
            </g>

            {/* Smile */}
            <path
              d="M 38 66 Q 50 76 62 66"
              stroke="#94A3B8"
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
            />

            {/* Blush left */}
            <ellipse cx="28" cy="63" rx="5" ry="3" fill="#FCA5A5" opacity="0.55" />
            {/* Blush right */}
            <ellipse cx="72" cy="63" rx="5" ry="3" fill="#FCA5A5" opacity="0.55" />

            {/* Body */}
            <rect x="30" y="78" width="40" height="18" rx="10"
              fill="white" stroke="#E2E8F0" strokeWidth="1.5" />

            {/* Body chest dot */}
            <circle cx="50" cy="87" r="3" fill={c.eye} opacity="0.7" />

            {/* Left arm */}
            <rect x="12" y="76" width="11" height="20" rx="5.5"
              fill="white" stroke="#E2E8F0" strokeWidth="1.5"
              transform="rotate(-20 17 76)"
            />

            {/* Right arm */}
            <rect x="77" y="76" width="11" height="20" rx="5.5"
              fill="white" stroke="#E2E8F0" strokeWidth="1.5"
              transform="rotate(20 83 76)"
            />
          </g>
        </svg>
      </div>

      {/* ── Speech Bubble ── */}
      <div className={`relative flex-1 rounded-2xl border-2 px-4 py-3 shadow-sm ${c.bubble}`}>
        {/* Tail pointing left toward robot */}
        <span className={`absolute -left-2.5 top-5 w-4 h-4 rotate-45 border-l-2 border-b-2 ${mood === 'alert' ? 'bg-red-50 border-red-300' :
          mood === 'warn' ? 'bg-amber-50 border-amber-300' :
            'bg-green-50 border-cyan-300'
          }`} />

        {/* Bot label */}
        <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${c.label}`}>
          {mood === 'alert' ? '🚨 Recon Bot' : mood === 'warn' ? '⚠️ Recon Bot' : '✅ Recon Bot'}
        </p>

        {/* Message */}
        <p className="text-sm leading-relaxed">{message}</p>
      </div>
    </div>
  );
}

// Customers Management Page
function CustomersPage({ setCurrentPage }) {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', email: '', pin: '0000', address: '', city: '', barangay: '' });
  const [saving, setSaving] = useState(false);

  const loadCustomers = async () => {
    setLoading(true); setError('');
    try {
      const res = await fetchWithAuth(`${API_URL}/customers?limit=200`);
      const data = await res.json();
      if (data.success) setCustomers(data.customers || []);
      else setError(data.error || 'Failed to load customers');
    } catch (e) { setError('Failed to load customers'); }
    setLoading(false);
  };

  useEffect(() => { loadCustomers(); }, []);

  const totalLoyalty = customers.reduce((sum, c) => sum + (Number(c.loyalty_points) || 0), 0);
  const totalCredit = customers.reduce((sum, c) => sum + (Number(c.credit_balance) || 0), 0);

  const saveCustomer = async () => {
    if (!form.name.trim() || !form.phone.trim() || !form.pin.trim()) {
      setError('Name, phone, and PIN are required'); return;
    }
    setSaving(true); setError('');
    try {
      const res = await fetchWithAuth(`${API_URL}/customers/register`, {
        method: 'POST',
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (data.success) {
        setShowForm(false);
        setForm({ name: '', phone: '', email: '', pin: '0000', address: '', city: '', barangay: '' });
        loadCustomers();
      } else {
        setError(data.error || 'Failed to save customer');
      }
    } catch (e) {
      setError('Failed to save customer');
    }
    setSaving(false);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pt-0 pb-12 font-dashboard">
      <div className="max-w-7xl mx-auto px-4 md:px-6 space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight ">Customer Intelligence</h1>
            <p className="text-gray-500 font-medium">Lifecycle management for your most valuable assets.</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setCurrentPage('pos')}
              className="px-6 py-3 bg-white border border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-50 transition-all shadow-sm"
            >
              EXIT TO POS
            </button>
            <button
              onClick={() => setShowForm(true)}
              className="px-6 py-3 bg-cyan-600 text-white rounded-xl font-bold hover:bg-cyan-700 transition-all shadow-lg hover:shadow-cyan-200"
            >
              + NEW CUSTOMER
            </button>
          </div>
        </div>

        {/* CRM Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center space-x-3 text-cyan-600 mb-2">
              <User className="w-5 h-5" />
              <span className="text-xs font-black uppercase tracking-widest">Total Profiles</span>
            </div>
            <p className="text-3xl font-black text-gray-900">{customers.length}</p>
            <p className="text-[10px] text-gray-400 mt-1 uppercase font-bold">Registered Customers</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center space-x-3 text-purple-600 mb-2">
              <TrendingUp className="w-5 h-5" />
              <span className="text-xs font-black uppercase tracking-widest">Loyalty Pool</span>
            </div>
            <p className="text-3xl font-black text-gray-900">{totalLoyalty.toLocaleString()}</p>
            <p className="text-[10px] text-gray-400 mt-1 uppercase font-bold">Total Points Issued</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center space-x-3 text-orange-600 mb-2">
              <AlertTriangle className="w-5 h-5" />
              <span className="text-xs font-black uppercase tracking-widest">Credit Exposure</span>
            </div>
            <p className="text-3xl font-black text-orange-600">₱{totalCredit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            <p className="text-[10px] text-gray-400 mt-1 uppercase font-bold">Outstanding Balances</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center space-x-3 text-emerald-600 mb-2">
              <PieChart className="w-5 h-5" />
              <span className="text-xs font-black uppercase tracking-widest">Avg Engagement</span>
            </div>
            <p className="text-3xl font-black text-gray-900">84%</p>
            <p className="text-[10px] text-gray-400 mt-1 uppercase font-bold">Retention Rate</p>
          </div>
        </div>

        {error && <div className="bg-red-50 text-red-700 border border-red-100 rounded-xl p-4 text-xs font-bold animate-pulse">{error}</div>}

        <div className="bg-white rounded-[2rem] shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-8 py-6 border-b border-gray-50 bg-gray-50/50">
            <h3 className="font-black text-gray-900 uppercase tracking-widest text-sm">Customer Census</h3>
            <button onClick={loadCustomers} className="text-[10px] font-black uppercase tracking-widest px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-all flex items-center space-x-2">
              <Activity className="w-3 h-3 text-cyan-600" />
              <span>SYNC DATA</span>
            </button>
          </div>
          {loading ? (
            <div className="p-20 text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-4 border-cyan-600 mb-4"></div>
              <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Accessing Database...</p>
            </div>
          ) : (
            <div className="overflow-x-auto h-[50vh] scrollbar-hide">
              <table className="w-full text-sm font-data-table">
                <thead className="bg-[#FBFCFE] text-gray-400 border-b border-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-8 py-5 text-left font-black uppercase tracking-widest text-[10px]">Subscriber</th>
                    <th className="px-8 py-5 text-left font-black uppercase tracking-widest text-[10px]">Contact Intel</th>
                    <th className="px-8 py-5 text-left font-black uppercase tracking-widest text-[10px]">Loyalty Stats</th>
                    <th className="px-8 py-5 text-left font-black uppercase tracking-widest text-[10px]">Ledger Status</th>
                    <th className="px-8 py-5 text-left font-black uppercase tracking-widest text-[10px]">Onboarding</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {customers.length === 0 && (
                    <tr><td className="px-8 py-20 text-center text-gray-400 italic" colSpan={5}>No customer profiles currently synchronized.</td></tr>
                  )}
                  {customers.map(c => (
                    <tr key={c.id} className="hover:bg-cyan-50/30 transition-colors group">
                      <td className="px-8 py-5">
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-cyan-100 text-cyan-600 rounded-xl flex items-center justify-center font-black text-sm group-hover:scale-110 transition-transform">
                            {c.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 leading-none mb-1">{c.name}</p>
                            <p className="text-[10px] font-black text-gray-400 tracking-tighter uppercase">ID: LMN-{c.id.toString().padStart(4, '0')}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <p className="text-gray-600 font-bold text-xs">{c.phone || '—'}</p>
                        <p className="text-[10px] text-gray-400 lowercase">{c.email || 'no-email-linked'}</p>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="w-2 h-2 rounded-full bg-cyan-500"></span>
                          <p className="text-gray-800 font-bold text-xs">{(c.loyalty_points || 0)} <span className="text-gray-400 font-normal">pts</span></p>
                        </div>
                        <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 bg-cyan-50 text-cyan-700 rounded-md">{c.loyalty_tier || 'standard'}</span>
                      </td>
                      <td className="px-8 py-5">
                        <p className={`font-black text-xs ${Number(c.credit_balance) > 0 ? 'text-orange-600' : 'text-emerald-600'}`}>
                          ₱{(Number(c.credit_balance) || 0).toFixed(2)}
                        </p>
                        <p className="text-[9px] font-bold text-gray-400 uppercase">Current Balance</p>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center text-gray-500 text-xs font-bold space-x-2">
                          <Clock className="w-3 h-3 opacity-40" />
                          <span>{c.created_at ? new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {showForm && (
          <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-md z-[100] flex items-center justify-center px-4 animate-fadeIn" onClick={(e) => { if (e.target === e.currentTarget) setShowForm(false); }}>
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-xl overflow-hidden border border-gray-100">
              <div className="bg-[#0A0F0D] py-8 px-10 border-b border-gray-800 flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-black text-white uppercase tracking-tight">Onboard Subscriber</h3>
                  <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mt-1">Lumina Identity Protocol</p>
                </div>
                <button onClick={() => setShowForm(false)} className="w-10 h-10 bg-white/5 text-gray-400 hover:text-white rounded-full flex items-center justify-center transition-all">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Full Legal Name</label>
                  <input className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-cyan-500 focus:outline-none transition-all" placeholder="Juan Dela Cruz" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Secure PIN</label>
                  <input className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-cyan-500 focus:outline-none tracking-[1em] font-black" type="password" maxLength="6" placeholder="••••" value={form.pin} onChange={e => setForm({ ...form, pin: e.target.value.replace(/\D/g, '') })} />
                </div>
                <div className="space-y-2 col-span-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Contact Intelligence</label>
                  <div className="grid grid-cols-2 gap-3">
                    <input className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-cyan-500 focus:outline-none transition-all" placeholder="Phone Link" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                    <input className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-cyan-500 focus:outline-none transition-all" type="email" placeholder="Email (Optional)" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-1 col-span-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Geographic Origin</label>
                  <input className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-cyan-500 focus:outline-none transition-all" placeholder="Full Address" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3 col-span-2">
                  <input className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-cyan-500 focus:outline-none transition-all" placeholder="City" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} />
                  <input className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-cyan-500 focus:outline-none transition-all" placeholder="Barangay" value={form.barangay} onChange={e => setForm({ ...form, barangay: e.target.value })} />
                </div>
              </div>
              <div className="px-10 pb-10 flex gap-4">
                <button onClick={() => setShowForm(false)} className="flex-1 py-4 border border-gray-200 rounded-2xl font-bold text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-all">ABORT</button>
                <button onClick={saveCustomer} disabled={saving} className="flex-[2] py-4 bg-cyan-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-cyan-700 disabled:opacity-50 shadow-xl shadow-cyan-200 transition-all">
                  {saving ? 'PROCESSING IDENTITY...' : 'AUTHORIZE SUBSCRIBER'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


// Inventory Reports Section Component
function ReportsPage({ currentReport, setCurrentPage, formatMoney }) {
  const [dateRange, setDateRange] = useState('week');
  const [startDate, setStartDate] = useState(toLocalDateInputValue(new Date()));
  const [endDate, setEndDate] = useState(toLocalDateInputValue(new Date()));
  const [salesData, setSalesData] = useState([]);
  const [itemsData, setItemsData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [employeeData, setEmployeeData] = useState([]);
  const [paymentData, setPaymentData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [reconciliation, setReconciliation] = useState(null);
  const [reconciliationMismatches, setReconciliationMismatches] = useState([]);
  const [reconciliationError, setReconciliationError] = useState('');
  const [customerData, setCustomerData] = useState([]);
  const [channelData, setChannelData] = useState([]);
  const [trendData, setTrendData] = useState([]);
  const [promoData, setPromoData] = useState({ totalDiscounts: 0, discountedOrders: 0, promoRevenue: 0 });
  const [returnData, setReturnData] = useState({ refundedCount: 0, refundedAmount: 0, voidedCount: 0, voidedAmount: 0 });
  const [activityLogs, setActivityLogs] = useState([]);
  const [activityModule, setActivityModule] = useState('all');
  const [emailLoading, setEmailLoading] = useState(false);
  const toNum = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };
  const getOrderRevenue = (order) => {
    const primary = toNum(order?.total_amount);
    if (primary > 0) return primary;
    const fallback = toNum(order?.subtotal) - toNum(order?.discount_amount) + toNum(order?.tax_amount) + toNum(order?.delivery_fee);
    return fallback > 0 ? fallback : 0;
  };
  const extractOrderItems = (orderLike) => {
    if (!orderLike || typeof orderLike !== 'object') return [];
    const candidates = [
      orderLike.items,
      orderLike.order_items,
      orderLike.orderItems,
      orderLike.line_items,
      orderLike.lineItems
    ];
    for (const c of candidates) {
      if (Array.isArray(c)) return c;
    }
    return [];
  };

  const handleEmailReport = async () => {
    let start = startDate;
    let end = endDate;
    const today = new Date();
    const toDateStr = (date) => toLocalDateInputValue(date);

    if (dateRange === 'today') {
      start = end = toDateStr(today);
    } else if (dateRange === 'week') {
      const d = new Date(today);
      d.setDate(d.getDate() - 7);
      start = toDateStr(d);
      end = toDateStr(today);
    } else if (dateRange === 'month') {
      start = new Date(today.getFullYear(), today.getMonth(), 1);
      start = toDateStr(start);
      end = toDateStr(today);
    }

    setEmailLoading(true);
    try {
      const res = await fetchWithAuth(`${API_URL}/reports/email`, {
        method: 'POST',
        body: JSON.stringify({ 
          startDate: start, 
          endDate: end,
          reportType: activeReport 
        })
      });
      const data = await res.json();
      if (data.success) {
        alert('Report has been sent to your email successfully!');
      } else {
        alert('Failed to send email: ' + (data.error || 'Unknown error'));
      }
    } catch (e) {
      console.error('Email report error:', e);
      alert('Failed to send email. Ensure SMTP is configured in System Settings.');
    } finally {
      setEmailLoading(false);
    }
  };


  const activeReport = currentReport || 'reports-sales';
  const reportTypes = [
    { id: 'reports-sales', name: '1. Daily Sales Snapshot', icon: '📅' },
    { id: 'reports-items', name: '2. Product Performance', icon: '🏷️' },
    { id: 'reports-category', name: '3. Category Analysis', icon: '📁' },
    { id: 'reports-trends', name: '5. Time Period Trends', icon: '📈' },
    { id: 'reports-profit', name: '6. Gross Profit & Margin', icon: '💰' },
    { id: 'reports-inventory', name: '7. Inventory & Sell-Through', icon: '📦' },
    { id: 'reports-customers', name: '8. Customer Insights', icon: '👤' },
    { id: 'reports-promos', name: '9. Discounts & Promos', icon: '🎟️' },
    { id: 'reports-returns', name: '10. Returns & Refunds', icon: '🔄' },
    { id: 'reports-employees', name: '11. Staff Performance', icon: '👥' },
    { id: 'reports-channels', name: '12. Channel Breakdown', icon: '🌐' },
    { id: 'reports-logs', name: '13. Activity Logs', icon: '🧾' }
  ];

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const toDateStr = (date) => toLocalDateInputValue(date);

        const today = new Date();
        let start = startDate;
        let end = endDate;
        if (dateRange === 'today') {
          start = end = toDateStr(today);
        } else if (dateRange === 'week') {
          const d = new Date(today);
          d.setDate(d.getDate() - 7);
          start = toDateStr(d);
          end = toDateStr(today);
        } else if (dateRange === 'month') {
          const first = new Date(today.getFullYear(), today.getMonth(), 1);
          start = toDateStr(first);
          end = toDateStr(today);
        }

        if (activeReport === 'reports-logs') {
          const params = new URLSearchParams({
            start,
            end,
            limit: '500',
            module: activityModule || 'all',
            tz: getClientTimezone()
          });
          const logsRes = await fetchWithAuth(`${API_URL}/reports/activity-logs?${params.toString()}`);
          const logsData = await logsRes.json();
          if (logsRes.ok && logsData?.success) {
            setActivityLogs(Array.isArray(logsData.logs) ? logsData.logs : []);
          } else {
            setActivityLogs([]);
          }
          setSalesData([]);
          setItemsData([]);
          setCategoryData([]);
          setEmployeeData([]);
          setPaymentData([]);
          setCustomerData([]);
          setChannelData([]);
          setTrendData([]);
          setPromoData({ totalDiscounts: 0, discountedOrders: 0, promoRevenue: 0 });
          setReturnData({ refundedCount: 0, refundedAmount: 0, voidedCount: 0, voidedAmount: 0 });
          setReconciliation(null);
          setReconciliationMismatches([]);
          setReconciliationError('');
          return;
        }

        const useDirectItemSource = activeReport === 'reports-items' || activeReport === 'reports-category';
        const needsOrderItems = !useDirectItemSource && (activeReport === 'reports-profit' || activeReport === 'reports-inventory');
        const ordersUrl = `${API_URL}/orders?limit=1000${needsOrderItems ? '&include_items=true' : ''}`;
        const res = await fetchWithAuth(ordersUrl);
        let data = await res.json();
        if (!res.ok || !data?.success) {
          const fallbackRes = await fetchWithAuth(`${API_URL}/orders?limit=1000`);
          data = await fallbackRes.json();
        }
        if (data?.success) {
          const allOrders = data.orders || [];
          const startDateObj = new Date(`${start}T00:00:00`);
          const endDateObj = new Date(`${end}T23:59:59.999`);
          let orders = allOrders.filter((o) => {
            const dt = new Date(o.created_at);
            if (Number.isNaN(dt.getTime())) return false;
            return dt >= startDateObj && dt <= endDateObj;
          });

          if (needsOrderItems) {
            const hydrated = await Promise.all(orders.map(async (o) => {
              const existingItems = extractOrderItems(o);
              if (existingItems.length > 0) return { ...o, items: existingItems };
              try {
                const detailRes = await fetchWithAuth(`${API_URL}/orders/${o.id}`);
                const detailData = await detailRes.json();
                if (detailRes.ok && detailData?.success && detailData?.order) {
                  const hydratedItems = extractOrderItems(detailData.order);
                  return { ...o, items: hydratedItems };
                }
              } catch (e) {
                console.warn('[REPORTS DEBUG] Failed to hydrate order items for order', o.id, e);
              }
              return { ...o, items: existingItems };
            }));
            orders = hydrated;
          }

          const ordersWithItems = orders.filter((o) => Array.isArray(o.items) && o.items.length > 0).length;
          const totalLineItems = orders.reduce((sum, o) => sum + (Array.isArray(o.items) ? o.items.length : 0), 0);

          if (!useDirectItemSource && orders.length > 0 && totalLineItems === 0) {
            console.warn('[REPORTS DEBUG] Orders loaded but no line items found after hydration.');
            try {
              const itemRes = await fetchWithAuth(`${API_URL}/reports/sales-items?start=${start}&end=${end}&tz=${encodeURIComponent(getClientTimezone())}`);
              const itemData = await itemRes.json();
              if (itemRes.ok && itemData?.success && Array.isArray(itemData.items)) {
                const itemRows = itemData.items.map((r) => ({
                  name: r.name || 'Unknown Item',
                  quantity: Number(r.quantity || 0),
                  revenue: Number(r.revenue || 0),
                  cost: Number(r.cost || 0),
                  category: r.category || 'Uncategorized'
                }));

                const fallbackItems = itemRows
                  .reduce((acc, row) => {
                    const key = row.name;
                    if (!acc[key]) acc[key] = { name: row.name, quantity: 0, revenue: 0, cost: 0 };
                    acc[key].quantity += row.quantity;
                    acc[key].revenue += row.revenue;
                    acc[key].cost += row.cost;
                    return acc;
                  }, {});

                const fallbackCategories = itemRows
                  .reduce((acc, row) => {
                    const key = row.category;
                    if (!acc[key]) acc[key] = { name: row.category, quantity: 0, revenue: 0, cost: 0 };
                    acc[key].quantity += row.quantity;
                    acc[key].revenue += row.revenue;
                    acc[key].cost += row.cost;
                    return acc;
                  }, {});

                setItemsData(Object.values(fallbackItems).sort((a, b) => b.quantity - a.quantity));
                setCategoryData(Object.values(fallbackCategories).sort((a, b) => b.revenue - a.revenue));
              }
            } catch (e) {
              console.warn('[REPORTS DEBUG] sales-items fallback failed.', e);
            }
          }

          setSalesData(orders);

          const itemsMap = {};
          const categoryMap = {};
          const employeeMap = {};
          const paymentMap = {};
          const customerMap = {};
          const channelMap = {};
          const promoStats = { totalDiscounts: 0, discountedOrders: 0, promoRevenue: 0 };
          const returnStats = { refundedCount: 0, refundedAmount: 0, voidedCount: 0, voidedAmount: 0 };
          const hourlyTrends = Array(24).fill(0).map((_, i) => ({ hour: i, orders: 0, revenue: 0 }));

          orders.forEach((o) => {
            const status = (o.order_status || o.status || '').toLowerCase();
            const isRefundedOrVoided = ['voided', 'refunded', 'cancelled'].includes(status);
            if (isRefundedOrVoided) return;

            const items = Array.isArray(o.items) ? o.items : [];
            const empName = o.employee_name || 'System/Online';
            const payMethod = o.payment_method || 'Unspecified';
            const custName = o.customer_name || 'Walk-in Customer';
            const channel = (o.service_type || 'POS').toUpperCase();
            const date = new Date(o.created_at);
            const hour = date.getHours();

            // Trends
            if (!isRefundedOrVoided) {
              hourlyTrends[hour].orders += 1;
              hourlyTrends[hour].revenue += getOrderRevenue(o);
            }

            // Group by Channel
            if (!channelMap[channel]) channelMap[channel] = { name: channel, orders: 0, revenue: 0 };
            channelMap[channel].orders += 1;
            channelMap[channel].revenue += getOrderRevenue(o);

            // Group by Customer
            if (!customerMap[custName]) customerMap[custName] = { name: custName, orders: 0, revenue: 0, lastVisit: o.created_at };
            customerMap[custName].orders += 1;
            customerMap[custName].revenue += getOrderRevenue(o);
            if (new Date(o.created_at) > new Date(customerMap[custName].lastVisit)) {
              customerMap[custName].lastVisit = o.created_at;
            }

            // Returns & Refunds
            if (status === 'refunded') {
              returnStats.refundedCount += 1;
              returnStats.refundedAmount += getOrderRevenue(o);
            } else if (status === 'voided') {
              returnStats.voidedCount += 1;
              returnStats.voidedAmount += getOrderRevenue(o);
            }

            // Discounts & Promos
            const disc = Number(o.discount_amount || 0);
            if (disc > 0 && !isRefundedOrVoided) {
              promoStats.totalDiscounts += disc;
              promoStats.discountedOrders += 1;
              promoStats.promoRevenue += getOrderRevenue(o);
            }

            // Group by Employee
            if (!employeeMap[empName]) employeeMap[empName] = { name: empName, orders: 0, revenue: 0 };
            employeeMap[empName].orders += 1;
            employeeMap[empName].revenue += getOrderRevenue(o);

            // Group by Payment Method
            if (!paymentMap[payMethod]) paymentMap[payMethod] = { name: payMethod, orders: 0, revenue: 0 };
            paymentMap[payMethod].orders += 1;
            paymentMap[payMethod].revenue += getOrderRevenue(o);

            if (items.length === 0) return;

            // Target revenue is pre-tax: Subtotal - Discount
            const discountedSubtotal = Number(o.subtotal || 0) - Number(o.discount_amount || 0);
            const targetRevenueCents = Math.round(discountedSubtotal * 100);

            const baseCents = items.map((it) => {
              const qty = Number(it.quantity || 0);
              const unit = Number(it.unit_price ?? it.price ?? 0);
              const subtotal = Number(it.subtotal);
              const base = Number.isFinite(subtotal) ? subtotal : (qty * unit);
              return Math.max(0, Math.round(base * 100));
            });
            const baseSumCents = baseCents.reduce((a, b) => a + b, 0);

            let allocated = 0;
            items.forEach((it, idx) => {
              const nameKey = it.product_name || it.name || 'Unknown';
              const catKey = it.category || 'Uncategorized';

              const qty = Number(it.quantity || 0);

              let itemRevenueCents = 0;
              if (baseSumCents > 0) {
                if (idx === items.length - 1) {
                  itemRevenueCents = targetRevenueCents - allocated;
                } else {
                  itemRevenueCents = Math.round((baseCents[idx] / baseSumCents) * targetRevenueCents);
                  allocated += itemRevenueCents;
                }
              } else {
                if (idx === items.length - 1) {
                  itemRevenueCents = targetRevenueCents - allocated;
                } else {
                  itemRevenueCents = Math.floor(targetRevenueCents / items.length);
                  allocated += itemRevenueCents;
                }
              }

              const itemRev = itemRevenueCents / 100;
              const itemCost = Number(it.cost || 0) * qty;

              // Group by Item
              if (!itemsMap[nameKey]) itemsMap[nameKey] = { name: nameKey, quantity: 0, revenue: 0, cost: 0 };
              itemsMap[nameKey].quantity += qty;
              itemsMap[nameKey].revenue += itemRev;
              itemsMap[nameKey].cost += itemCost;

              // Group by Category
              if (!categoryMap[catKey]) categoryMap[catKey] = { name: catKey, quantity: 0, revenue: 0, cost: 0 };
              categoryMap[catKey].quantity += qty;
              categoryMap[catKey].revenue += itemRev;
              categoryMap[catKey].cost += itemCost;
            });
          });

          setItemsData(Object.values(itemsMap).sort((a, b) => b.quantity - a.quantity));
          setCategoryData(Object.values(categoryMap).sort((a, b) => b.revenue - a.revenue));
          setEmployeeData(Object.values(employeeMap).sort((a, b) => b.revenue - a.revenue));
          setPaymentData(Object.values(paymentMap).sort((a, b) => b.revenue - a.revenue));
          // New States (Adding them to the component state if not present)
          setCustomerData(Object.values(customerMap).sort((a, b) => b.revenue - a.revenue));
          setChannelData(Object.values(channelMap).sort((a, b) => b.revenue - a.revenue));
          setTrendData(hourlyTrends);
          setPromoData(promoStats);
          setReturnData(returnStats);

          // Direct source of truth for Product Performance / Category Analysis
          // so these tabs don't depend on nested order->items payload shape.
          if (activeReport === 'reports-items' || activeReport === 'reports-category') {
            try {
              const itemRes = await fetchWithAuth(`${API_URL}/reports/sales-items?start=${start}&end=${end}&tz=${encodeURIComponent(getClientTimezone())}`);
              const itemData = await itemRes.json();
              if (itemRes.ok && itemData?.success && Array.isArray(itemData.items)) {
                const itemRows = itemData.items.map((r) => ({
                  name: r.name || 'Unknown Item',
                  quantity: Number(r.quantity || 0),
                  revenue: Number(r.revenue || 0),
                  cost: Number(r.cost || 0),
                  category: r.category || 'Uncategorized'
                }));

                const directItems = itemRows.reduce((acc, row) => {
                  const key = row.name;
                  if (!acc[key]) acc[key] = { name: row.name, quantity: 0, revenue: 0, cost: 0 };
                  acc[key].quantity += row.quantity;
                  acc[key].revenue += row.revenue;
                  acc[key].cost += row.cost;
                  return acc;
                }, {});

                const directCategories = itemRows.reduce((acc, row) => {
                  const key = row.category;
                  if (!acc[key]) acc[key] = { name: row.category, quantity: 0, revenue: 0, cost: 0 };
                  acc[key].quantity += row.quantity;
                  acc[key].revenue += row.revenue;
                  acc[key].cost += row.cost;
                  return acc;
                }, {});

                setItemsData(Object.values(directItems).sort((a, b) => b.quantity - a.quantity));
                setCategoryData(Object.values(directCategories).sort((a, b) => b.revenue - a.revenue));
              } else {
                console.warn('[REPORTS] sales-items source returned no usable items.', itemData?.error || `HTTP ${itemRes.status}`);
              }
            } catch (e) {
              console.warn('[REPORTS DEBUG] direct sales-items source failed.', e);
            }
          }
        }

        const reconRes = await fetchWithAuth(`${API_URL}/orders/reconciliation?start=${start}&end=${end}&tz=${encodeURIComponent(getClientTimezone())}`);
        const reconData = await reconRes.json().catch(() => ({}));
        if (reconRes.ok && reconData.success) {
          setReconciliation(reconData.reconciliation || null);
          setReconciliationMismatches(reconData.mismatches || []);
          setReconciliationError('');
        } else {
          setReconciliation(null);
          setReconciliationMismatches([]);
          setReconciliationError(reconData.error || 'Unable to load reconciliation summary.');
        }
      } catch (e) {
        console.error('Error loading reports:', e);
        setReconciliation(null);
        setReconciliationMismatches([]);
        setReconciliationError('Unable to load report reconciliation.');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [activeReport, dateRange, startDate, endDate, activityModule]);

  const totals = salesData.reduce((acc, o) => {
    const status = (o.order_status || '').toLowerCase();
    const isRefundedOrVoided = ['voided', 'refunded', 'cancelled'].includes(status);

    // 1. Gross = Subtotal of EVERY order attempted (before discount, before tax)
    const orderSubtotal = toNum(o.subtotal || getOrderRevenue(o));
    acc.gross += orderSubtotal;

    // 2. Separate logic for Active vs Voided
    if (isRefundedOrVoided) {
      // Refund represents the "lost" subtotal
      acc.refunds += orderSubtotal;
    } else {
      // For active orders, track discounts and tax
      acc.discounts += toNum(o.discount_amount);
      acc.tax += toNum(o.tax_amount);
      acc.collection += getOrderRevenue(o);
      acc.orders += 1;
    }
    return acc;
  }, { gross: 0, tax: 0, discounts: 0, refunds: 0, collection: 0, orders: 0 });

  // 3. Final Calculations based on the Audit Formula: Gross - Discounts - Refunds = Net (Pre-tax)
  const netSales = totals.gross - totals.discounts - totals.refunds;
  const avg = totals.orders > 0 ? netSales / totals.orders : 0;
  const itemsRevenueTotal = itemsData.reduce((sum, i) => sum + Number(i.revenue || 0), 0);
  const itemSalesDiff = itemsRevenueTotal - totals.gross;
  const reportAssistantMessage = reconciliationError
    ? `I couldn't load reconciliation details right now: ${reconciliationError}`
    : reconciliation
      ? reconciliation.mismatched_orders > 0
        ? `Heads-up: ${reconciliation.mismatched_orders} of ${reconciliation.total_orders} orders are out of balance. Current net difference is ${formatMoney ? formatMoney(Number(reconciliation.net_difference || 0)) : `Php ${Number(reconciliation.net_difference || 0).toFixed(2)}`}.`
        : `Great news. All ${reconciliation.total_orders} orders are balanced! Discounts, voids, and refunds have been accounted for.`
      : 'I am checking sales and item reconciliation now...';
  const reportAssistantMood = reconciliationError
    ? 'warn'
    : reconciliation?.mismatched_orders > 0
      ? 'alert'
      : 'ok';

  return (
    <div className="reports-lineitems min-h-screen bg-gray-100 pt-0 printable-report">
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-4">
        <div className="flex flex-wrap justify-between gap-2 items-center print:hidden">
          <h1 className="text-2xl font-bold text-gray-800">Reports</h1>
          <div className="flex gap-2">
            <button 
              onClick={() => window.print()}
              className="px-3 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2 text-sm font-medium transition-colors"
              title="Print current report"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Print</span>
            </button>
            <button 
              onClick={handleEmailReport}
              disabled={emailLoading}
              className="px-3 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2 text-sm font-medium transition-colors disabled:opacity-50"
              title="Send report to email"
            >
              {emailLoading ? (
                <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Mail className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">Email</span>
            </button>
            <select value={dateRange} onChange={(e) => setDateRange(e.target.value)} className="px-4 py-2 border rounded-lg text-sm bg-white font-medium focus:ring-2 focus:ring-cyan-500 focus:outline-none">
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">This Month</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>
        </div>
        {dateRange === 'custom' && (
          <div className="flex flex-wrap gap-2">
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="px-3 py-2 border rounded-lg" />
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="px-3 py-2 border rounded-lg" />
          </div>
        )}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {reportTypes.map(r => (
            <button key={r.id} onClick={() => setCurrentPage(r.id)} className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${activeReport === r.id ? 'bg-cyan-600 text-white' : 'bg-white text-gray-600'}`}>
              {r.name}
            </button>
          ))}
        </div>

        {loading && <div className="bg-white rounded-lg p-6 text-gray-500">Loading...</div>}

        {!loading && activeReport === 'reports-sales' && (
          <div className="space-y-3">
            <ReconciliationAssistant message={reportAssistantMessage} mood={reportAssistantMood} />
            {reconciliation?.mismatched_orders > 0 && reconciliationMismatches.length > 0 && (
              <div className="bg-white rounded-lg p-3 border border-red-100">
                <p className="text-sm font-semibold text-gray-700 mb-2">Possible reasons (top mismatches):</p>
                <div className="space-y-2">
                  {reconciliationMismatches.slice(0, 5).map((m) => (
                    <div key={m.order_id} className="text-sm text-gray-700 border-b border-gray-100 pb-2 last:border-b-0">
                      <p className="font-semibold">Order #{m.order_number} · Diff: {formatMoney ? formatMoney(Number(m.difference || 0)) : `Php ${Number(m.difference || 0).toFixed(2)}`}</p>
                      <p className="text-gray-600">{Array.isArray(m.possible_reasons) && m.possible_reasons.length > 0 ? m.possible_reasons.join(' | ') : 'No specific reason detected.'}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="bg-white rounded-lg p-3 shadow-sm border-l-4 border-gray-400">
                <p className="text-xs text-gray-500">Gross Sales (Full Price)</p>
                <p className="text-lg font-bold text-gray-700">{formatMoney ? formatMoney(totals.gross) : `Php ${totals.gross.toFixed(2)}`}</p>
              </div>
              <div className="bg-white rounded-lg p-3 shadow-sm border-l-4 border-yellow-500">
                <p className="text-xs text-gray-500 font-medium">Discounts (Reductions)</p>
                <p className="text-lg font-bold text-yellow-600">{formatMoney ? formatMoney(totals.discounts) : `Php ${totals.discounts.toFixed(2)}`}</p>
              </div>
              <div className="bg-white rounded-lg p-3 shadow-sm border-l-4 border-red-500">
                <p className="text-xs text-gray-500 font-medium">Refunds/Voids (Deductions)</p>
                <p className="text-lg font-bold text-red-600">{formatMoney ? formatMoney(totals.refunds) : `Php ${totals.refunds.toFixed(2)}`}</p>
              </div>
              <div className="bg-white rounded-lg p-3 shadow-sm border-l-4 border-cyan-500">
                <p className="text-xs text-cyan-700 font-bold">Net Sales (Revenue)</p>
                <p className="text-lg font-bold text-cyan-700">{formatMoney ? formatMoney(netSales) : `Php ${netSales.toFixed(2)}`}</p>
                <p className="text-[10px] text-gray-400 font-medium italic">Audit: Gross - Disct - Refund</p>
              </div>
              <div className="bg-white rounded-lg p-3 shadow-sm border-l-4 border-blue-400">
                <p className="text-xs text-gray-500">Tax Collected (Liability)</p>
                <p className="text-lg font-bold text-blue-600">{formatMoney ? formatMoney(totals.tax) : `Php ${totals.tax.toFixed(2)}`}</p>
              </div>
              <div className="bg-white rounded-lg p-3 shadow-sm border-l-4 border-cyan-600 bg-green-50/30">
                <p className="text-xs text-gray-600 font-bold">Total Collection (Cash/Card)</p>
                <p className="text-lg font-bold text-cyan-800">{formatMoney ? formatMoney(totals.collection) : `Php ${totals.collection.toFixed(2)}`}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-lg p-3 shadow-sm border-l-4 border-blue-500">
                <p className="text-xs text-gray-500">Valid Transactions</p>
                <p className="text-lg font-bold text-blue-600">{totals.orders} active</p>
              </div>
              <div className="bg-white rounded-lg p-3 shadow-sm border-l-4 border-purple-500">
                <p className="text-xs text-gray-500">Average Net Sale</p>
                <p className="text-lg font-bold text-purple-600">Php {avg.toFixed(2)}</p>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm overflow-auto">
              <table className="w-full min-w-[980px] font-data-table">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-3 py-2 text-sm font-semibold text-gray-600">Order #</th>
                    <th className="text-left px-3 py-2 text-sm font-semibold text-gray-600">Date/Time</th>
                    <th className="text-left px-3 py-2 text-sm font-semibold text-gray-600">Type</th>
                    <th className="text-left px-3 py-2 text-sm font-semibold text-gray-600">Payment</th>
                    <th className="text-left px-3 py-2 text-sm font-semibold text-gray-600">Status</th>
                    <th className="text-left px-3 py-2 text-sm font-semibold text-gray-600">Items</th>
                    <th className="text-right px-3 py-2 text-sm font-semibold text-gray-600">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {salesData.map((order) => {
                    const orderNo = order.order_number || order.reference || order.id;
                    const orderDateRaw = order.created_at || order.order_date || order.timestamp;
                    const orderDate = orderDateRaw
                      ? new Date(orderDateRaw).toLocaleString()
                      : '-';
                    const items = Array.isArray(order.items) ? order.items : [];
                    const itemText = items.length > 0
                      ? items.map((it) => {
                        const qty = Number(it.quantity || 0);
                        const name = it.product_name || it.name || 'Unknown';
                        return `${qty}x ${name}`;
                      }).join(', ')
                      : '-';

                    return (
                      <tr key={order.id || orderNo} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-sm text-gray-800 font-semibold whitespace-nowrap">{orderNo}</td>
                        <td className="px-3 py-2 text-sm text-gray-700 whitespace-nowrap">{orderDate}</td>
                        <td className="px-3 py-2 text-sm text-gray-700 whitespace-nowrap">{order.order_type || order.type || '-'}</td>
                        <td className="px-3 py-2 text-sm text-gray-700 whitespace-nowrap">{order.payment_method || '-'}</td>
                        <td className="px-3 py-2 text-sm text-gray-700 whitespace-nowrap">{order.status || '-'}</td>
                        <td className="px-3 py-2 text-sm text-gray-700">{itemText}</td>
                        <td className="px-3 py-2 text-sm text-right text-cyan-600 font-semibold whitespace-nowrap">Php {Number(order.total_amount || 0).toFixed(2)}</td>
                      </tr>
                    );
                  })}
                  {salesData.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-3 py-6 text-center text-gray-500 text-sm">
                        No sales records found for this date range.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!loading && activeReport === 'reports-items' && (
          <div className="space-y-3">
            <ReconciliationAssistant
              message={Math.abs(itemSalesDiff) > 0.01
                ? `I still see a mismatch of Php ${itemSalesDiff.toFixed(2)} between Item Gross Sales and Sales Gross totals.`
                : 'Item Gross Sales and Sales Gross totals are perfectly matched for this period.'}
              mood={Math.abs(itemSalesDiff) > 0.01 ? 'alert' : 'ok'}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-white rounded-lg p-4 shadow-sm border-l-4 border-cyan-500">
                <p className="text-sm text-gray-500">Item Sales Total (Gross)</p>
                <p className="text-2xl font-bold text-cyan-600">Php {itemsRevenueTotal.toFixed(2)}</p>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm border-l-4 border-blue-500">
                <p className="text-sm text-gray-500">Sales Report Total (Gross)</p>
                <p className="text-2xl font-bold text-blue-600">Php {totals.gross.toFixed(2)}</p>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <table className="w-full font-data-table">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr><th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">Item</th><th className="text-right px-4 py-3 text-sm font-semibold text-gray-600">Qty</th><th className="text-right px-4 py-3 text-sm font-semibold text-gray-600">Revenue</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {itemsData.map(item => (
                    <tr key={item.name}><td className="px-4 py-3 text-sm text-gray-800">{item.name}</td><td className="px-4 py-3 text-sm text-right text-gray-600">{item.quantity}</td><td className="px-4 py-3 text-sm text-right text-cyan-600">Php {item.revenue.toFixed(2)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!loading && activeReport === 'reports-category' && (
          <div className="space-y-3">
            <div className="bg-white rounded-lg p-4 shadow-sm border-l-4 border-purple-500">
              <p className="text-sm text-gray-500">Total Categories</p>
              <p className="text-2xl font-bold text-purple-600">{categoryData.length}</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <table className="w-full font-data-table">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr><th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">Category</th><th className="text-right px-4 py-3 text-sm font-semibold text-gray-600">Items Sold</th><th className="text-right px-4 py-3 text-sm font-semibold text-gray-600">Revenue</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {categoryData.map(cat => (
                    <tr key={cat.name}><td className="px-4 py-3 text-sm text-gray-800">{cat.name}</td><td className="px-4 py-3 text-sm text-right text-gray-600">{cat.quantity}</td><td className="px-4 py-3 text-sm text-right text-cyan-600">Php {cat.revenue.toFixed(2)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!loading && activeReport === 'reports-employees' && (
          <div className="space-y-3">
            <div className="bg-white rounded-lg p-4 shadow-sm border-l-4 border-blue-500">
              <p className="text-sm text-gray-500">Staff Contribution</p>
              <p className="text-2xl font-bold text-blue-600">{employeeData.length} Employees Active</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <table className="w-full font-data-table">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr><th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">Employee</th><th className="text-right px-4 py-3 text-sm font-semibold text-gray-600">Orders</th><th className="text-right px-4 py-3 text-sm font-semibold text-gray-600">Total Net Sales</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {employeeData.map(emp => (
                    <tr key={emp.name}><td className="px-4 py-3 text-sm text-gray-800 font-medium">{emp.name}</td><td className="px-4 py-3 text-sm text-right text-gray-600">{emp.orders}</td><td className="px-4 py-3 text-sm text-right text-cyan-600">Php {emp.revenue.toFixed(2)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!loading && activeReport === 'reports-payments' && (
          <div className="space-y-3">
            <div className="bg-white rounded-lg p-4 shadow-sm border-l-4 border-cyan-500">
              <p className="text-sm text-gray-500">Payment Breakdown</p>
              <p className="text-2xl font-bold text-cyan-600">Php {netSales.toFixed(2)} Total</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <table className="w-full font-data-table">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr><th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">Payment Method</th><th className="text-right px-4 py-3 text-sm font-semibold text-gray-600">Transactions</th><th className="text-right px-4 py-3 text-sm font-semibold text-gray-600">Collected Amount</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {paymentData.map(pay => (
                    <tr key={pay.name}><td className="px-4 py-3 text-sm text-gray-800 uppercase">{pay.name}</td><td className="px-4 py-3 text-sm text-right text-gray-600">{pay.orders}</td><td className="px-4 py-3 text-sm text-right text-cyan-600 font-medium">Php {pay.revenue.toFixed(2)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!loading && activeReport === 'reports-trends' && (
          <div className="space-y-4">
            <div className="bg-white rounded-lg p-6 shadow-sm border-l-4 border-orange-500">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Peak Sales Hours</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {trendData.filter(t => t.orders > 0).sort((a,b) => b.revenue - a.revenue).slice(0, 4).map((t, idx) => (
                  <div key={t.hour} className="bg-orange-50 p-3 rounded-lg border border-orange-100">
                    <p className="text-xs text-orange-600 font-bold">#{idx + 1} Busy Hour</p>
                    <p className="text-lg font-bold text-gray-800">{t.hour === 0 ? '12 AM' : t.hour <= 11 ? `${t.hour} AM` : t.hour === 12 ? '12 PM' : `${t.hour-12} PM`}</p>
                    <p className="text-sm text-gray-500">{t.orders} Orders | Php {t.revenue.toFixed(2)}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <table className="w-full font-data-table">
                <thead className="bg-gray-50 border-b">
                  <tr><th className="text-left px-4 py-3 text-sm font-semibold">Time Interval</th><th className="text-right px-4 py-3 text-sm font-semibold">Transactions</th><th className="text-right px-4 py-3 text-sm font-semibold">Revenue</th><th className="text-right px-4 py-3 text-sm font-semibold">% of Total</th></tr>
                </thead>
                <tbody className="divide-y">
                  {trendData.map(t => (
                    <tr key={t.hour} className={t.orders > 0 ? 'bg-white' : 'bg-gray-50/30'}>
                      <td className="px-4 py-3 text-sm">{t.hour === 0 ? '12:00 AM' : t.hour <= 11 ? `${t.hour}:00 AM` : t.hour === 12 ? '12:00 PM' : `${t.hour-12}:00 PM`}</td>
                      <td className="px-4 py-3 text-sm text-right">{t.orders}</td>
                      <td className="px-4 py-3 text-sm text-right font-medium">Php {t.revenue.toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-500">{((t.revenue / (netSales || 1)) * 100).toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!loading && activeReport === 'reports-profit' && (
          <div className="space-y-4">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-lg p-4 shadow-sm border-l-4 border-cyan-500">
                <p className="text-sm text-gray-500">Net Sales</p>
                <p className="text-2xl font-bold text-gray-800">Php {netSales.toFixed(2)}</p>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm border-l-4 border-red-400">
                <p className="text-sm text-gray-500">Cost of Goods (COGS)</p>
                <p className="text-2xl font-bold text-red-600">Php {(itemsData.reduce((s, i) => s + (i.cost || 0), 0)).toFixed(2)}</p>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm border-l-4 border-green-500 bg-green-50/20">
                <p className="text-sm text-green-700 font-bold">Estimated Gross Profit</p>
                <p className="text-2xl font-bold text-green-700">Php {(netSales - itemsData.reduce((s, i) => s + (i.cost || 0), 0)).toFixed(2)}</p>
                <p className="text-xs text-green-600 mt-1">Margin: {(((netSales - itemsData.reduce((s, i) => s + (i.cost || 0), 0)) / (netSales || 1)) * 100).toFixed(1)}%</p>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <table className="w-full font-data-table">
                <thead className="bg-gray-50 border-b">
                  <tr><th className="text-left px-4 py-3 text-sm">Product Item</th><th className="text-right px-4 py-3 text-sm">Revenue</th><th className="text-right px-4 py-3 text-sm">COGS</th><th className="text-right px-4 py-3 text-sm">Profit</th><th className="text-right px-4 py-3 text-sm">Margin%</th></tr>
                </thead>
                <tbody className="divide-y">
                  {itemsData.map(item => {
                    const profit = item.revenue - (item.cost || 0);
                    const margin = (profit / (item.revenue || 1)) * 100;
                    return (
                      <tr key={item.name}>
                        <td className="px-4 py-3 text-sm font-medium">{item.name}</td>
                        <td className="px-4 py-3 text-sm text-right">Php {item.revenue.toFixed(2)}</td>
                        <td className="px-4 py-3 text-sm text-right text-gray-500">Php {(item.cost || 0).toFixed(2)}</td>
                        <td className={`px-4 py-3 text-sm text-right font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>Php {profit.toFixed(2)}</td>
                        <td className="px-4 py-3 text-sm text-right font-medium">{margin.toFixed(1)}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!loading && activeReport === 'reports-customers' && (
          <div className="space-y-4">
            <div className="bg-white rounded-lg p-5 shadow-sm border-l-4 border-indigo-500 flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">Unique Customers</p>
                <p className="text-2xl font-bold text-indigo-600">{customerData.length} Identified</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Avg Spend / Visit</p>
                <p className="text-2xl font-bold text-gray-800">Php {(netSales / (salesData.length || 1)).toFixed(2)}</p>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <table className="w-full font-data-table">
                <thead className="bg-gray-50 border-b">
                  <tr><th className="text-left px-4 py-3 text-sm">Customer Name</th><th className="text-right px-4 py-3 text-sm">Visits</th><th className="text-right px-4 py-3 text-sm">Total Spend</th><th className="text-right px-4 py-3 text-sm">Last Ordered</th></tr>
                </thead>
                <tbody className="divide-y">
                  {customerData.map(c => (
                    <tr key={c.name} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-bold text-gray-700">{c.name}</td>
                      <td className="px-4 py-3 text-sm text-right">{c.orders}</td>
                      <td className="px-4 py-3 text-sm text-right text-indigo-600 font-bold">Php {c.revenue.toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-500">{new Date(c.lastVisit).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!loading && activeReport === 'reports-promos' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-lg p-4 shadow-sm border-l-4 border-yellow-500">
                <p className="text-sm text-gray-500">Total Discounts Given</p>
                <p className="text-2xl font-bold text-yellow-600">Php {promoData.totalDiscounts.toFixed(2)}</p>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm border-l-4 border-blue-500">
                <p className="text-sm text-gray-500">Discounted Transactions</p>
                <p className="text-2xl font-bold text-blue-600">{promoData.discountedOrders} Orders</p>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm border-l-4 border-purple-500">
                <p className="text-sm text-gray-500">Promo Redemption Rate</p>
                <p className="text-2xl font-bold text-purple-600">{((promoData.discountedOrders / (salesData.length || 1)) * 100).toFixed(1)}%</p>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-6 text-center text-gray-500 border border-dashed border-gray-300">
              <p className="font-bold text-gray-700 mb-1">Impact Analysis</p>
              <p className="text-sm">Discounted orders generated <strong>Php {promoData.promoRevenue.toFixed(2)}</strong> in gross revenue this period.</p>
            </div>
          </div>
        )}

        {!loading && activeReport === 'reports-returns' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-lg p-5 shadow-sm border-l-4 border-red-500">
                <p className="text-sm text-gray-500">Refunded Transactions</p>
                <p className="text-2xl font-bold text-red-600">{returnData.refundedCount} | Php {returnData.refundedAmount.toFixed(2)}</p>
                <p className="text-xs text-gray-400 mt-1">Impact on net revenue</p>
              </div>
              <div className="bg-white rounded-lg p-5 shadow-sm border-l-4 border-gray-400">
                <p className="text-sm text-gray-500">Voided Transactions</p>
                <p className="text-2xl font-bold text-gray-700">{returnData.voidedCount} | Php {returnData.voidedAmount.toFixed(2)}</p>
                <p className="text-xs text-gray-400 mt-1">Errors/Pre-payment cancellations</p>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
               <p className="p-4 text-sm font-bold text-gray-700 border-b">Recent Canceled/Refunded Activity</p>
               <table className="w-full font-data-table">
                <thead className="bg-gray-50">
                  <tr><th className="text-left px-4 py-3 text-sm">Order #</th><th className="text-left px-4 py-3 text-sm">Reason/Staff</th><th className="text-right px-4 py-3 text-sm">Amount</th></tr>
                </thead>
                <tbody className="divide-y">
                  {salesData.filter(o => ['voided', 'refunded', 'cancelled'].includes(o.order_status.toLowerCase())).slice(0, 10).map(o => (
                    <tr key={o.id}>
                      <td className="px-4 py-3 text-sm font-bold">{o.order_number}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{o.order_status} · {o.employee_name || 'POS'}</td>
                      <td className="px-4 py-3 text-sm text-right text-red-600">Php {Number(o.total_amount || 0).toFixed(2)}</td>
                    </tr>
                  ))}
                  {salesData.filter(o => ['voided', 'refunded', 'cancelled'].includes(o.order_status.toLowerCase())).length === 0 && (
                    <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-400 italic">No refund activity recorded for this period.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!loading && activeReport === 'reports-channels' && (
          <div className="space-y-4">
            <div className="bg-white rounded-lg p-6 shadow-sm border-l-4 border-cyan-600 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-800">Omnichannel Performance</h3>
              <div className="flex gap-4">
                <div className="text-center"><p className="text-xs text-gray-400 font-bold">OFFLINE</p><p className="font-bold text-cyan-600">{((channelData.find(c => c.name === 'POS')?.revenue || 0) / (netSales || 1) * 100).toFixed(1)}%</p></div>
                <div className="text-center"><p className="text-xs text-gray-400 font-bold">ONLINE</p><p className="font-bold text-purple-600">{((channelData.find(c => c.name === 'ONLINE')?.revenue || 0) / (netSales || 1) * 100).toFixed(1)}%</p></div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
               <table className="w-full font-data-table">
                <thead className="bg-gray-50 border-b">
                  <tr><th className="text-left px-4 py-3 text-sm">Sales Channel</th><th className="text-right px-4 py-3 text-sm">Transactions</th><th className="text-right px-4 py-3 text-sm">Net Revenue</th><th className="text-right px-4 py-3 text-sm">Contribution</th></tr>
                </thead>
                <tbody className="divide-y">
                  {channelData.map(c => (
                    <tr key={c.name}>
                      <td className="px-4 py-3 text-sm font-bold uppercase tracking-wider">{c.name === 'DINEOUT' ? 'ONLINE / DELIVERY' : c.name === 'POS' ? 'IN-STORE (POS)' : c.name}</td>
                      <td className="px-4 py-3 text-sm text-right">{c.orders}</td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-cyan-700">Php {c.revenue.toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-500">{((c.revenue / (netSales || 1)) * 100).toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!loading && activeReport === 'reports-logs' && (
          <div className="space-y-4">
            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Module</label>
                <select
                  value={activityModule}
                  onChange={(e) => setActivityModule(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white"
                >
                  <option value="all">All Modules</option>
                  <option value="orders">Orders</option>
                  <option value="inventory">Inventory</option>
                  <option value="shifts">Shifts</option>
                  <option value="schedules">Schedules</option>
                </select>
              </div>
              <div className="text-sm text-gray-500">
                {activityLogs.length} event{activityLogs.length === 1 ? '' : 's'} in selected range
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <table className="w-full font-data-table">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 text-sm">Time</th>
                    <th className="text-left px-4 py-3 text-sm">Module</th>
                    <th className="text-left px-4 py-3 text-sm">Action</th>
                    <th className="text-left px-4 py-3 text-sm">Reference</th>
                    <th className="text-left px-4 py-3 text-sm">Actor</th>
                    <th className="text-left px-4 py-3 text-sm">Details</th>
                    <th className="text-right px-4 py-3 text-sm">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {activityLogs.map((row, idx) => (
                    <tr key={`${row.occurred_at}-${row.module}-${idx}`} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-700">{new Date(row.occurred_at).toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm uppercase text-gray-500">{row.module}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-800">{row.action}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{row.reference || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{row.actor || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{row.details || '-'}</td>
                      <td className="px-4 py-3 text-sm text-right text-cyan-700">{row.amount != null ? `Php ${Number(row.amount).toFixed(2)}` : '-'}</td>
                    </tr>
                  ))}
                  {activityLogs.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400 italic">No activity found for this range and module.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!loading && activeReport === 'reports-inventory' && (
          <InventoryReportsSection
            dateRange={dateRange}
            setDateRange={setDateRange}
            startDate={startDate}
            setStartDate={setStartDate}
            endDate={endDate}
            setEndDate={setEndDate}
            loading={loading}
          />
        )}

        {!loading && activeReport === 'reports-employees' && (
           <div className="space-y-3">
            <div className="bg-white rounded-lg p-4 shadow-sm border-l-4 border-blue-500">
              <p className="text-sm text-gray-500">Staff Contribution</p>
              <p className="text-2xl font-bold text-blue-600">{employeeData.length} Employees Active</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <table className="w-full font-data-table">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr><th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">Employee</th><th className="text-right px-4 py-3 text-sm font-semibold text-gray-600">Orders</th><th className="text-right px-4 py-3 text-sm font-semibold text-gray-600">Total Net Sales</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {employeeData.map(emp => (
                    <tr key={emp.name}><td className="px-4 py-3 text-sm text-gray-800 font-medium">{emp.name}</td><td className="px-4 py-3 text-sm text-right text-gray-600">{emp.orders}</td><td className="px-4 py-3 text-sm text-right text-cyan-600">Php {emp.revenue.toFixed(2)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

function InventoryReportsSection({ dateRange, setDateRange, startDate, setStartDate, endDate, setEndDate, loading }) {
  const [activeInventoryReport, setActiveInventoryReport] = useState('stock-status');
  const [inventoryType, setInventoryType] = useState('ingredient');
  const [reportPayload, setReportPayload] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState('');

  const inventoryTabs = [
    { id: 'stock-status', label: 'Stock Status', icon: '📦' },
    { id: 'movement', label: 'Movement', icon: '📊' },
    { id: 'valuation', label: 'Valuation', icon: '💰' },
    { id: 'abc-analysis', label: 'ABC Analysis', icon: '📈' },
    { id: 'turnover', label: 'Turnover', icon: '⚡' }
  ];

  const toNum = (value) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  };

  const fmt = (value) => {
    if (typeof value === 'number') return Number.isFinite(value) ? value.toLocaleString() : '-';
    if (value === null || value === undefined || value === '') return '-';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  const money = (value) => `Php ${toNum(value).toFixed(2)}`;

  const dateDiffDays = (from, to) => {
    const s = new Date(from);
    const e = new Date(to);
    if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return 30;
    const ms = e.getTime() - s.getTime();
    return Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24)) + 1);
  };

  const getDaysParam = () => {
    if (dateRange === 'today') return 1;
    if (dateRange === 'week') return 7;
    if (dateRange === 'month') return 30;
    if (dateRange === 'custom') return dateDiffDays(startDate, endDate);
    return 30;
  };

  const fetchInventoryReport = async () => {
    setReportLoading(true);
    setReportError('');
    try {
      const days = getDaysParam();
      const needsDays = new Set(['movement', 'waste-shrinkage', 'turnover']).has(activeInventoryReport);

      const params = new URLSearchParams();
      params.append('type', inventoryType);
      if (needsDays) params.append('days', days);

      const response = await fetchWithAuth(`${API_URL}/inventory/reports/${activeInventoryReport}?${params.toString()}`);
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) {
        throw new Error(data.error || `Request failed (${response.status}).`);
      }
      setReportPayload(data.report || null);
    } catch (error) {
      console.error('Error fetching inventory report:', error);
      setReportPayload(null);
      setReportError(error.message || 'Unable to connect to inventory report API.');
    } finally {
      setReportLoading(false);
    }
  };

  useEffect(() => {
    fetchInventoryReport();
  }, [activeInventoryReport, inventoryType, dateRange, startDate, endDate]);

  const renderSummaryCards = () => {
    const summary = reportPayload?.summary;
    if (!summary || typeof summary !== 'object') return null;
    const entries = Object.entries(summary);
    if (entries.length === 0) return null;

    const formatSummaryValue = (key, value) => {
      if (value === null || value === undefined || value === '') return '-';
      if (typeof value !== 'object') {
        const isMoneyValue = /value|amount|sales|cost/i.test(key);
        return isMoneyValue ? money(value) : fmt(value);
      }

      const objEntries = Object.entries(value);
      if (objEntries.length === 0) return '-';

      // Common shape used by ABC summary blocks: { count, value, percentage }
      if (
        ['count', 'value', 'percentage'].every((k) => Object.prototype.hasOwnProperty.call(value, k))
      ) {
        return `${toNum(value.count)} items | ${money(value.value)} | ${toNum(value.percentage).toFixed(2)}%`;
      }

      return objEntries
        .map(([childKey, childVal]) => {
          const isMoneyChild = /value|amount|sales|cost/i.test(childKey);
          const rendered = isMoneyChild ? money(childVal) : fmt(childVal);
          return `${childKey.replace(/_/g, ' ')}: ${rendered}`;
        })
        .join(' | ');
    };

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {entries.map(([key, value]) => {
          const display = formatSummaryValue(key, value);
          return (
            <div key={key} className="bg-white rounded-lg shadow-sm p-3 border border-gray-200">
              <p className="text-xs text-gray-500 uppercase tracking-wide">{key.replace(/_/g, ' ')}</p>
              <p className="text-sm text-gray-800 font-semibold mt-1 break-words">{display}</p>
            </div>
          );
        })}
      </div>
    );
  };

  const renderTable = () => {
    const rows = Array.isArray(reportPayload?.data) ? reportPayload.data : [];
    if (rows.length === 0) {
      return <div className="bg-white rounded-lg shadow-sm p-6 text-gray-600">No inventory report data available.</div>;
    }
    const columns = Object.keys(rows[0]);
    return (
      <div className="bg-white rounded-lg shadow-sm overflow-auto">
        <table className="w-full min-w-[900px] font-data-table">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {columns.map((col) => (
                <th key={col} className="text-left px-3 py-2 text-xs font-semibold text-gray-600 uppercase">
                  {col.replace(/_/g, ' ')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row, idx) => (
              <tr key={`${activeInventoryReport}-${idx}`} className="hover:bg-gray-50">
                {columns.map((col) => {
                  const value = row[col];
                  const isMoney = /price|cost|value|amount|revenue/i.test(col);
                  const display = isMoney && typeof value !== 'object' ? money(value) : fmt(value);
                  return (
                    <td key={`${idx}-${col}`} className="px-3 py-2 text-sm text-gray-700 whitespace-nowrap">
                      {display}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="reports-lineitems space-y-4">
      <div className="bg-white rounded-lg shadow-sm p-4 flex items-center justify-between gap-3 flex-wrap border-l-4 border-cyan-500">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-bold text-gray-800">Inventory Analysis</h3>
            <div className="flex bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setInventoryType('ingredient')}
                className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${inventoryType === 'ingredient' ? 'bg-white shadow-sm text-cyan-600' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Ingredients
              </button>
              <button
                onClick={() => setInventoryType('product')}
                className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${inventoryType === 'product' ? 'bg-white shadow-sm text-cyan-600' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Simple Stocks
              </button>
            </div>
          </div>
          {reportPayload?.title && (
            <span className="text-sm text-gray-500 font-medium">{reportPayload.title}</span>
          )}
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="px-4 py-2 bg-gray-800 text-white rounded-lg text-sm font-bold hover:bg-gray-700 shadow-sm transition-colors flex items-center gap-2"
        >
          <span>🖨️</span> Print Report
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {inventoryTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveInventoryReport(tab.id)}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all border shadow-sm ${activeInventoryReport === tab.id
              ? 'bg-cyan-600 text-white border-cyan-600'
              : 'bg-white text-gray-600 border-gray-200 hover:border-cyan-300 hover:text-cyan-600'
              }`}
          >
            <span className="mr-2 text-base">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {(loading || reportLoading) && (
        <div className="bg-white rounded-lg shadow-sm p-6 text-gray-500">Loading inventory report...</div>
      )}

      {!loading && !reportLoading && reportError && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4">
          {reportError}
        </div>
      )}

      {!loading && !reportLoading && !reportError && (
        <>
          {renderSummaryCards()}
          {renderTable()}
        </>
      )}
    </div>
  );
}
const Ticket = ({ order, formatTimer, getUrgency, updateOrderStatus }) => {
  const urgency = getUrgency(order);
  const isPreparing = String(order.order_status || '').toLowerCase().startsWith('preparing');
  const [doneItems, setDoneItems] = useState(new Set());

  const toggleItemDone = (index) => {
    setDoneItems(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const bumperColor = urgency === 'critical' ? 'bg-red-600' :
    urgency === 'warning' ? 'bg-yellow-500' :
      isPreparing ? 'bg-orange-500' : 'bg-cyan-600';

  const borderColor = urgency === 'critical' ? 'border-red-500' :
    urgency === 'warning' ? 'border-yellow-400' :
      isPreparing ? 'border-orange-400' : 'border-cyan-500';

  return (
    <div className={`flex flex-col bg-gray-800 border-2 ${borderColor} min-w-[220px] max-w-[260px] flex-shrink-0 ${urgency === 'critical' ? 'animate-pulse' : ''}`}>
      <div className={`${bumperColor} px-3 py-2`}>
        <div className="flex items-center justify-between gap-1">
          <span className="text-white font-bold text-xs truncate">#{order.order_number}</span>
          <span className={`font-mono font-bold text-sm flex-shrink-0 ${urgency === 'critical' ? 'text-white' : 'text-white/90'}`}>
            {formatTimer(order)}
          </span>
        </div>
      </div>

      <div className="px-3 py-2 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {order.table_number && (
              <span className="bg-blue-600 text-white px-2 py-0.5 text-xs font-bold">
                TBL {order.table_number}
              </span>
            )}
            <span className={`px-2 py-0.5 text-xs font-bold uppercase ${order.service_type === 'dine-in' ? 'bg-cyan-700 text-white' :
              order.service_type === 'pick-up' ? 'bg-cyan-700 text-white' :
                'bg-purple-700 text-white'
              }`}>
              {order.service_type === 'dine-in' ? 'DINE' :
                order.service_type === 'pick-up' ? 'PICK' : 'DLVR'}
            </span>
          </div>
          <span className="text-gray-500 text-xs uppercase font-medium">
            {order.order_type === 'online' ? 'WEB' : 'POS'}
          </span>
        </div>
        {isPreparing && (
          <div className="mt-1">
            <span className="text-orange-400 text-xs font-bold uppercase tracking-wider">PREPARING</span>
          </div>
        )}
      </div>

      <div className="flex-1 px-3 py-2">
        {(order.items || []).map((item, i) => {
          const isItemDone = doneItems.has(i);
          const isVoided = item.status === 'voided';
          const isComped = item.status === 'comped';
          return (
            <div
              key={i}
              onClick={() => !isVoided && !isComped && toggleItemDone(i)}
              className={`flex gap-2 py-1 border-b border-gray-700/50 last:border-0 cursor-pointer select-none transition-opacity
                ${isVoided || isItemDone ? 'opacity-40' : 'hover:bg-gray-700/30'}`}
            >
              <span className={`text-white font-bold text-lg min-w-[28px] ${isVoided || isItemDone ? 'line-through' : ''}`}>
                {item.quantity}x
              </span>
              <div className="flex-1">
                <span className={`text-white font-medium text-sm ${isVoided || isComped || isItemDone ? 'line-through' : ''} ${isComped ? 'text-blue-400' : ''}`}>
                  {item.product_name}
                </span>
                {item.size_name && <span className="text-gray-400 text-xs ml-1">({item.size_name})</span>}
                {isVoided && <span className="ml-1 text-xs bg-red-600 text-white px-1 rounded font-bold">VOID</span>}
                {isComped && <span className="ml-1 text-xs bg-blue-600 text-white px-1 rounded font-bold">COMP</span>}
                {isItemDone && <span className="ml-1 text-xs bg-gray-600 text-white px-1 rounded font-bold">DONE</span>}
                {item.notes && <div className="text-yellow-400 italic text-xs mt-0.5">{item.notes}</div>}
              </div>
            </div>
          );
        })}
        {(!order.items || order.items.length === 0) && (
          <p className="text-gray-600 text-sm">No items</p>
        )}
      </div>

      <button
        onClick={() => updateOrderStatus(order.id, isPreparing ? 'completed' : 'preparing')}
        className={`w-full py-3 font-bold text-sm uppercase tracking-wider transition-colors ${isPreparing
          ? 'bg-cyan-600 hover:bg-cyan-500 text-white'
          : 'bg-orange-500 hover:bg-orange-400 text-white'
          }`}
      >
        {isPreparing ? 'BUMP DONE' : 'BUMP START'}
      </button>
    </div>
  );
};

function KitchenDisplayPage() {
  const API_URL = import.meta.env.VITE_API_URL || (window.location.origin.includes('localhost') ? 'http://localhost:5000/api' : '/api');
  const [orders, setOrders] = useState([]);
  const [now, setNow] = useState(Date.now());
  const [completedTimes, setCompletedTimes] = useState([]);
  const [prepStartedAtByOrder, setPrepStartedAtByOrder] = useState({});
  const [audioEnabled, setAudioEnabled] = useState(false);
  const lastOrderIdsRef = useRef(null);
  const audioCtxRef = useRef(null);

  const enableAudio = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    setAudioEnabled(true);
  };

  const playNewOrderSound = () => {
    try {
      const ctx = audioCtxRef.current;
      if (!ctx || ctx.state === 'suspended') return;
      const freqs = [660, 880, 1100];
      freqs.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        osc.type = 'square';
        gain.gain.value = 0.4;
        gain.gain.setValueAtTime(0.4, ctx.currentTime + i * 0.2);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.2 + 0.18);
        osc.start(ctx.currentTime + i * 0.2);
        osc.stop(ctx.currentTime + i * 0.2 + 0.2);
      });
    } catch (e) { console.error('Audio error:', e); }
  };

  const fetchKitchenOrders = async () => {
    try {
      const res = await fetchWithAuth(`${API_URL}/orders/kitchen`);
      const data = await res.json();
        if (data.success) {
          const currentNewIds = new Set(
            data.orders
              .filter(o => 
                ['received', 'open', 'preparing', 'preparing-', 'paid', 'pending'].includes(String(o.order_status || '').toLowerCase())
              )
              .map(o => o.id)
          );
        if (lastOrderIdsRef.current !== null) {
          let hasNew = false;
          currentNewIds.forEach(id => {
            if (!lastOrderIdsRef.current.has(id)) hasNew = true;
          });
          if (hasNew) {
            playNewOrderSound();
            document.title = '** NEW ORDER ** Kitchen';
            setTimeout(() => { document.title = 'Kitchen Display'; }, 4000);
          }
        }
        lastOrderIdsRef.current = currentNewIds;
        setOrders(data.orders);
        setPrepStartedAtByOrder(prev => {
          const activePreparingIds = new Set(
            (data.orders || [])
              .filter(o => String(o.order_status || '').toLowerCase().startsWith('preparing'))
              .map(o => o.id)
          );
          const next = {};
          Object.keys(prev).forEach((id) => {
            const key = Number.isNaN(Number(id)) ? id : Number(id);
            if (activePreparingIds.has(key) || activePreparingIds.has(String(id))) {
              next[id] = prev[id];
            }
          });
          return next;
        });
      }
    } catch (err) {
      console.error('Error fetching kitchen orders:', err);
    }
  };

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchKitchenOrders();
    const interval = setInterval(fetchKitchenOrders, 8000);
    return () => clearInterval(interval);
  }, []);

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      if (newStatus === 'preparing') {
        const nowIso = new Date().toISOString();
        setPrepStartedAtByOrder(prev => ({ ...prev, [orderId]: Date.now() }));
        setOrders(prev => prev.map(o => (
          o.id === orderId ? { ...o, order_status: 'preparing', updated_at: nowIso } : o
        )));
      } else if (newStatus === 'completed') {
        setOrders(prev => prev.map(o => (
          o.id === orderId ? { ...o, order_status: 'completed' } : o
        )));
      }

      const res = await fetchWithAuth(`${API_URL}/orders/${orderId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ order_status: newStatus })
      });
      const data = await res.json();
      if (data && data.success) {
        if (newStatus === 'completed') {
          const order = orders.find(o => o.id === orderId);
          if (order) {
            const localPrepStart = prepStartedAtByOrder[orderId];
            const prepAnchor = localPrepStart || order.updated_at || order.created_at;
            const prepTime = Math.max(0, Math.floor((Date.now() - new Date(prepAnchor).getTime()) / 1000));
            setCompletedTimes(prev => [...prev.slice(-19), prepTime]);
          }
          setPrepStartedAtByOrder(prev => {
            const next = { ...prev };
            delete next[orderId];
            return next;
          });
        }
        fetchKitchenOrders();
      } else {
        alert('BACKEND_REJECTED: ' + (data.error || JSON.stringify(data)));
        console.error('Update Rejection:', data);
        fetchKitchenOrders();
      }
    } catch (err) {
      alert('NETWORK_FETCH_CRASH: ' + err.message);
      console.error('Update Error:', err);
      fetchKitchenOrders();
    }
  };

  const getPrepAnchor = (order) => {
    return prepStartedAtByOrder[order?.id] || order?.updated_at || order?.created_at;
  };

  const formatTimer = (order) => {
    const status = String(order?.order_status || '').toLowerCase();
    const isPreparing = status.startsWith('preparing');
    if (!isPreparing) return '00:00';
    const anchor = getPrepAnchor(order);
    const diff = Math.max(0, Math.floor((now - new Date(anchor).getTime()) / 1000));
    const mins = Math.floor(diff / 60);
    const secs = diff % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const getUrgency = (order) => {
    const status = String(order?.order_status || '').toLowerCase();
    if (!status.startsWith('preparing')) return 'normal';
    const anchor = getPrepAnchor(order);
    const diff = Math.floor((now - new Date(anchor).getTime()) / 1000);
    if (diff > 300) return 'critical';
    if (diff > 180) return 'warning';
    return 'normal';
  };

  const activeOrders = orders
    .filter(o => ['received', 'open', 'preparing', 'preparing-', 'paid', 'pending'].includes(String(o.order_status || '').toLowerCase()))
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  const totalActive = activeOrders.length;
  const newCount = activeOrders.filter(o => ['received', 'open', 'paid', 'pending'].includes(String(o.order_status || '').toLowerCase())).length;
  const prepCount = activeOrders.filter(o => String(o.order_status || '').toLowerCase().startsWith('preparing')).length;

  const avgPrepTime = completedTimes.length > 0
    ? Math.floor(completedTimes.reduce((a, b) => a + b, 0) / completedTimes.length)
    : 0;
  const avgMins = Math.floor(avgPrepTime / 60);
  const avgSecs = avgPrepTime % 60;

  return (
    <div className="min-h-screen bg-gray-950 pt-0 flex flex-col" onClick={() => { if (!audioEnabled) enableAudio(); }}>
      {!audioEnabled && (
        <div className="bg-yellow-500 px-4 py-2 text-center cursor-pointer" onClick={enableAudio}>
          <span className="text-black text-sm font-bold">Click anywhere to enable notification sounds</span>
        </div>
      )}
      <div className="bg-gray-900 px-4 py-2 flex items-center justify-between border-b border-gray-800">
        <div className="flex items-center gap-4">
          <h1 className="text-white font-bold text-lg tracking-wide">KDS</h1>
          <div className="h-6 w-px bg-gray-700"></div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 bg-cyan-500 rounded-full"></div>
              <span className="text-cyan-400 text-sm font-medium">{newCount} New</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 bg-orange-500 rounded-full"></div>
              <span className="text-orange-400 text-sm font-medium">{prepCount} Prep</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-gray-400 text-sm">Total:</span>
              <span className="text-white text-sm font-bold">{totalActive}</span>
            </div>
          </div>
          <div className="h-6 w-px bg-gray-700"></div>
          <div className="flex items-center gap-1.5">
            <span className="text-gray-400 text-sm">Avg Time:</span>
            <span className="text-cyan-400 text-sm font-mono font-bold">
              {completedTimes.length > 0 ? `${String(avgMins).padStart(2, '0')}:${String(avgSecs).padStart(2, '0')}` : '--:--'}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-gray-400 text-sm">Done:</span>
            <span className="text-gray-300 text-sm font-medium">{completedTimes.length}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-0.5 rounded ${audioEnabled ? 'bg-cyan-900 text-cyan-400' : 'bg-red-900 text-red-400'}`}>
            {audioEnabled ? 'SOUND ON' : 'SOUND OFF'}
          </span>
          <button
            onClick={fetchKitchenOrders}
            className="text-gray-500 hover:text-white text-xs flex items-center gap-1 px-2 py-1 hover:bg-gray-800 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            REFRESH
          </button>
        </div>
      </div>

      <div className="bg-gray-900/50 px-4 py-1 flex items-center gap-4 border-b border-gray-800/50">
        <span className="text-gray-600 text-xs">URGENCY:</span>
        <div className="flex items-center gap-1"><div className="w-3 h-2 bg-cyan-600"></div><span className="text-gray-500 text-xs">0-3m</span></div>
        <div className="flex items-center gap-1"><div className="w-3 h-2 bg-yellow-500"></div><span className="text-gray-500 text-xs">3-5m</span></div>
        <div className="flex items-center gap-1"><div className="w-3 h-2 bg-red-600"></div><span className="text-gray-500 text-xs">5m+</span></div>
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-hidden p-4">
        {activeOrders.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-gray-600 text-2xl font-bold">ALL CLEAR</p>
              <p className="text-gray-700 text-sm mt-1">No active orders</p>
            </div>
          </div>
        ) : (
          <div className="flex gap-3 h-full">
            {activeOrders.map(order => (
              <Ticket
                key={order.id}
                order={order}
                formatTimer={formatTimer}
                getUrgency={getUrgency}
                updateOrderStatus={updateOrderStatus}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
// Kitchen Report Page
function KitchenReportPage() {
  const API_URL = import.meta.env.VITE_API_URL || (window.location.origin.includes('localhost') ? 'http://localhost:5000/api' : '/api');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(toLocalDateInputValue(new Date()));

  useEffect(() => { fetchReport(); }, [date]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth(`${API_URL}/orders/kitchen-report?date=${date}&limit=200&tz=${encodeURIComponent(getClientTimezone())}`);
      const data = await res.json();
      if (data.success) setOrders(data.orders);
    } catch (e) {
      console.error('Error fetching kitchen report:', e);
    } finally {
      setLoading(false);
    }
  };

  const statusColor = (s) => {
    if (s === 'completed') return 'bg-cyan-100 text-cyan-700';
    if (s === 'preparing') return 'bg-orange-100 text-orange-700';
    if (s === 'received' || s === 'open') return 'bg-blue-100 text-blue-700';
    return 'bg-gray-100 text-gray-600';
  };

  const totalItems = orders.reduce((sum, o) => sum + (o.items?.length || 0), 0);
  const completed = orders.filter(o => o.order_status === 'completed').length;
  const inProgress = orders.filter(o => ['received', 'open', 'preparing'].includes(o.order_status)).length;

  return (
    <div className="min-h-screen bg-gray-100 pt-20">
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Kitchen Report</h1>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm text-center">
            <p className="text-3xl font-bold text-gray-800">{orders.length}</p>
            <p className="text-sm text-gray-500 mt-1">Total Orders</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm text-center">
            <p className="text-3xl font-bold text-cyan-600">{completed}</p>
            <p className="text-sm text-gray-500 mt-1">Completed</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm text-center">
            <p className="text-3xl font-bold text-orange-500">{inProgress}</p>
            <p className="text-sm text-gray-500 mt-1">In Progress</p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading...</div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm">
            <p className="text-gray-400 text-lg font-medium">No kitchen orders for this date</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-sm font-data-table">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Order</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Table / Type</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Kitchen Items</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Time</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orders.map(order => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono font-medium text-gray-800">{order.order_number}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {order.table_number ? <span className="font-semibold">Table {order.table_number}</span> : <span className="capitalize">{order.service_type || order.order_type}</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      <div className="space-y-0.5">
                        {order.items?.map((item, i) => (
                          <div key={i} className={`text-xs ${item.status === 'voided' ? 'line-through text-gray-400' : ''}`}>
                            {item.quantity}× {item.product_name}
                            {item.status === 'voided' && <span className="ml-1 text-red-500 font-bold">VOID</span>}
                            {item.status === 'comped' && <span className="ml-1 text-blue-500 font-bold">COMP</span>}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${statusColor(order.order_status)}`}>
                        {order.order_status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 text-xs text-gray-500">
              {orders.length} orders · {totalItems} kitchen items total
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Orders Page
function OrdersPage({ currentView, setCurrentPage }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [ordersReconciliation, setOrdersReconciliation] = useState(null);
  const [ordersReconciliationError, setOrdersReconciliationError] = useState('');

  const views = [
    { id: 'orders-active', name: 'Active Orders' },
    { id: 'orders-history', name: 'Order History' },
    { id: 'orders-refunds', name: 'Refunds/Voids' },
  ];

  useEffect(() => {
    fetchOrders();
  }, [currentView]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const url = currentView === 'orders-refunds'
        ? `${API_URL}/orders?include_adjustments=true`
        : `${API_URL}/orders`;
      const response = await fetchWithAuth(url);
      const data = await response.json();
      if (data.success) {
        let filtered = data.orders;
        if (currentView === 'orders-active') {
          filtered = data.orders.filter(o => ['pending', 'received', 'preparing', 'open'].includes(o.order_status));
        }
        setOrders(filtered);
      }

      const reconResponse = await fetchWithAuth(`${API_URL}/orders/reconciliation?tz=${encodeURIComponent(getClientTimezone())}`);
      const recon = await reconResponse.json().catch(() => ({}));
      if (reconResponse.ok && recon.success) {
        setOrdersReconciliation(recon.reconciliation || null);
        setOrdersReconciliationError('');
      } else {
        setOrdersReconciliation(null);
        setOrdersReconciliationError(recon.error || 'Unable to load reconciliation.');
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      setOrdersReconciliation(null);
      setOrdersReconciliationError('Unable to load reconciliation.');
    } finally {
      setLoading(false);
    }
  };

  const ordersAssistantMessage = ordersReconciliationError
    ? `I couldn't fetch reconciliation right now: ${ordersReconciliationError}`
    : ordersReconciliation
      ? ordersReconciliation.mismatched_orders > 0
        ? `I found ${ordersReconciliation.mismatched_orders} mismatched orders out of ${ordersReconciliation.total_orders}.`
        : `All ${ordersReconciliation.total_orders} orders are balanced.`
      : 'I am checking order reconciliation now...';
  const ordersAssistantMood = ordersReconciliationError
    ? 'warn'
    : ordersReconciliation?.mismatched_orders > 0
      ? 'alert'
      : 'ok';

  return (
    <div className="orders-lineitems min-h-screen bg-gray-100 pt-0">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Orders</h1>
        </div>
        <div className="mb-4">
          <ReconciliationAssistant message={ordersAssistantMessage} mood={ordersAssistantMood} />
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {views.map(view => (
            <button
              key={view.id}
              onClick={() => setCurrentPage(view.id)}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${currentView === view.id ? 'bg-cyan-600 text-white' : 'bg-white text-gray-600 hover:bg-green-50'
                }`}
            >
              {view.name}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600"></div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full font-data-table">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Order #</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Date/Time</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Type</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Total</th>
                  <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {orders.map(order => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">#{order.order_number}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{new Date(order.created_at).toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${order.order_type === 'pos' ? 'bg-blue-100 text-blue-700' : 'bg-cyan-100 text-cyan-700'
                        }`}>{order.order_type?.toUpperCase()}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${order.order_status === 'completed' ? 'bg-cyan-100 text-cyan-700' :
                        order.order_status === 'received' ? 'bg-blue-100 text-blue-700' :
                          order.order_status === 'preparing' ? 'bg-orange-100 text-orange-700' :
                            order.order_status === 'open' ? 'bg-cyan-100 text-cyan-700' :
                              order.order_status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                order.order_status === 'refunded' ? 'bg-red-100 text-red-700' :
                                  'bg-gray-100 text-gray-700'
                        }`}>{order.order_status}</span>
                      {order.adjustment_count > 0 && (
                        <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-600">{order.adjustment_count} adj</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right font-medium">Php {(parseFloat(order.total_amount) || 0).toFixed(2)}</td>
                    <td className="px-6 py-4 text-center">
                      <button className="text-blue-600 hover:text-blue-800 text-sm">View</button>
                    </td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr><td colSpan="6" className="px-6 py-8 text-center text-gray-500">No orders found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}


//BulkUpload Function
function BulkReceiveModal({ ingredients, API_URL, onRefresh, onClose }) {
  const [step, setStep] = useState('upload'); // 'upload' | 'preview' | 'done'
  const [parsedRows, setParsedRows] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState([]);

  const downloadTemplate = () => {
    const headers = ['ingredient_name', 'quantity', 'supplier', 'notes'];
    const sample = ingredients.slice(0, 3).map(ing => [ing.name, '10', 'Sample Supplier', 'Sample note']);
    const rows = [headers, ...sample];
    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'receive_stock_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target.result;
      const lines = text.trim().split('\n');
      if (lines.length < 2) {
        setErrors(['CSV file is empty or has no data rows.']);
        return;
      }

      // Parse header
      const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim().toLowerCase());
      const nameIdx = headers.indexOf('ingredient_name');
      const qtyIdx = headers.indexOf('quantity');
      const supplierIdx = headers.indexOf('supplier');
      const notesIdx = headers.indexOf('notes');

      if (nameIdx === -1 || qtyIdx === -1) {
        setErrors(['CSV must have "ingredient_name" and "quantity" columns.']);
        return;
      }

      const parsed = [];
      const parseErrors = [];

      lines.slice(1).forEach((line, idx) => {
        if (!line.trim()) return;
        const cols = line.split(',').map(c => c.replace(/"/g, '').trim());
        const name = cols[nameIdx] || '';
        const qty = parseFloat(cols[qtyIdx]);
        const supplier = supplierIdx !== -1 ? (cols[supplierIdx] || '') : '';
        const notes = notesIdx !== -1 ? (cols[notesIdx] || '') : '';

        // Match ingredient by name (case insensitive)
        const matched = ingredients.find(i => i.name.toLowerCase() === name.toLowerCase());

        if (!name) {
          parseErrors.push(`Row ${idx + 2}: ingredient_name is empty`);
          return;
        }
        if (isNaN(qty) || qty <= 0) {
          parseErrors.push(`Row ${idx + 2}: invalid quantity "${cols[qtyIdx]}"`);
          return;
        }

        parsed.push({
          ingredient_name: name,
          ingredient_id: matched?.id || null,
          matched: !!matched,
          current_stock: matched ? parseFloat(matched.current_stock) : null,
          unit: matched?.unit || '',
          quantity: qty,
          supplier,
          notes,
        });
      });

      if (parseErrors.length > 0) {
        setErrors(parseErrors);
        return;
      }

      setErrors([]);
      setParsedRows(parsed);
      setStep('preview');
    };
    reader.readAsText(file);
  };

  const handleSubmit = async () => {
    setLoading(true);
    const res = [];

    for (const row of parsedRows) {
      if (!row.matched) {
        res.push({ ...row, status: 'error', message: 'Ingredient not found' });
        continue;
      }
      try {
        const response = await fetchWithAuth(`${API_URL}/inventory/adjust`, {
          method: 'POST',
          body: JSON.stringify({
            ingredient_id: row.ingredient_id,
            quantity_change: row.quantity,
            notes: `Bulk receive${row.supplier ? ` from ${row.supplier}` : ''}${row.notes ? ` — ${row.notes}` : ''}`
          })
        });
        const data = await response.json();
        if (data.success) {
          res.push({ ...row, status: 'success', message: 'Received successfully' });
        } else {
          res.push({ ...row, status: 'error', message: data.error || 'Failed' });
        }
      } catch (err) {
        res.push({ ...row, status: 'error', message: err.message });
      }
    }

    setResults(res);
    setStep('done');
    setLoading(false);
    onRefresh();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b flex justify-between items-center bg-cyan-600 text-white">
          <h2 className="text-base font-semibold">
            {step === 'upload' && '📦 Bulk Receive Stock'}
            {step === 'preview' && `📋 Preview — ${parsedRows.length} rows`}
            {step === 'done' && '✅ Bulk Receive Complete'}
          </h2>
          <button onClick={onClose} className="text-white hover:text-cyan-200">✕</button>
        </div>

        <div className="overflow-y-auto flex-1 p-4">
          {/* STEP 1: Upload */}
          {step === 'upload' && (
            <div className="space-y-4">
              {/* Download Template */}
              <div className="bg-blue-50 border border-blue-200 rounded p-4">
                <p className="text-sm font-medium text-blue-800 mb-2">Step 1: Download the CSV template</p>
                <p className="text-xs text-blue-600 mb-3">
                  The template includes your current ingredients as sample rows.
                  Fill in the quantities you want to receive.
                </p>
                <button
                  onClick={downloadTemplate}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 flex items-center gap-2"
                >
                  ⬇ Download Template CSV
                </button>
              </div>

              {/* CSV Format Info */}
              <div className="bg-gray-50 border rounded p-3 text-xs text-gray-600">
                <p className="font-semibold text-gray-700 mb-1">CSV Format:</p>
                <code className="block bg-white border rounded p-2 text-[11px] font-mono">
                  ingredient_name,quantity,supplier,notes<br />
                  Rice,50,Metro Mart,Weekly delivery<br />
                  Chicken,20,Local Farm,Fresh batch
                </code>
                <p className="mt-2 text-gray-500">
                  • <strong>ingredient_name</strong> and <strong>quantity</strong> are required<br />
                  • <strong>supplier</strong> and <strong>notes</strong> are optional<br />
                  • ingredient_name must match exactly (case-insensitive)
                </p>
              </div>

              {/* File Upload */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-cyan-400 transition-colors">
                <p className="text-sm font-medium text-gray-700 mb-2">Step 2: Upload your filled CSV</p>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="block mx-auto text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-medium file:bg-cyan-600 file:text-white hover:file:bg-cyan-700 cursor-pointer"
                />
              </div>

              {/* Errors */}
              {errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded p-3">
                  <p className="text-sm font-semibold text-red-700 mb-1">CSV Errors:</p>
                  {errors.map((e, i) => (
                    <p key={i} className="text-xs text-red-600">• {e}</p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Preview */}
          {step === 'preview' && (
            <div className="space-y-3">
              <p className="text-xs text-gray-500">Review the rows before submitting. Unmatched ingredients will be skipped.</p>
              <div className="border rounded overflow-hidden">
                <table className="w-full text-xs font-data-table">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="text-left px-3 py-2 font-semibold text-gray-600">Ingredient</th>
                      <th className="text-center px-3 py-2 font-semibold text-gray-600">Current</th>
                      <th className="text-center px-3 py-2 font-semibold text-gray-600">+Qty</th>
                      <th className="text-center px-3 py-2 font-semibold text-gray-600">New Total</th>
                      <th className="text-left px-3 py-2 font-semibold text-gray-600">Supplier</th>
                      <th className="text-center px-3 py-2 font-semibold text-gray-600">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedRows.map((row, idx) => (
                      <tr key={idx} className={`border-t ${row.matched ? 'bg-white' : 'bg-red-50'}`}>
                        <td className="px-3 py-1.5 font-medium text-gray-800">{row.ingredient_name}</td>
                        <td className="px-3 py-1.5 text-center text-gray-500">
                          {row.matched ? `${row.current_stock.toFixed(2)} ${row.unit}` : '—'}
                        </td>
                        <td className="px-3 py-1.5 text-center text-cyan-600 font-semibold">
                          +{row.quantity} {row.unit}
                        </td>
                        <td className="px-3 py-1.5 text-center font-bold text-gray-800">
                          {row.matched ? `${(row.current_stock + row.quantity).toFixed(2)} ${row.unit}` : '—'}
                        </td>
                        <td className="px-3 py-1.5 text-gray-500">{row.supplier || '—'}</td>
                        <td className="px-3 py-1.5 text-center">
                          {row.matched
                            ? <span className="bg-cyan-100 text-cyan-700 px-1.5 py-0.5 rounded font-medium">✓ Matched</span>
                            : <span className="bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-medium">✗ Not Found</span>
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex gap-2 text-xs text-gray-500">
                <span className="bg-cyan-100 text-cyan-700 px-2 py-1 rounded">
                  ✓ {parsedRows.filter(r => r.matched).length} will be received
                </span>
                <span className="bg-red-100 text-red-700 px-2 py-1 rounded">
                  ✗ {parsedRows.filter(r => !r.matched).length} will be skipped
                </span>
              </div>
            </div>
          )}

          {/* STEP 3: Done */}
          {step === 'done' && (
            <div className="space-y-3">
              <div className="flex gap-3 text-sm">
                <div className="bg-green-50 border border-cyan-200 rounded p-3 flex-1 text-center">
                  <p className="text-2xl font-bold text-cyan-600">{results.filter(r => r.status === 'success').length}</p>
                  <p className="text-cyan-700 text-xs">Successfully received</p>
                </div>
                <div className="bg-red-50 border border-red-200 rounded p-3 flex-1 text-center">
                  <p className="text-2xl font-bold text-red-600">{results.filter(r => r.status === 'error').length}</p>
                  <p className="text-red-700 text-xs">Failed / Skipped</p>
                </div>
              </div>
              <div className="border rounded overflow-hidden">
                <table className="w-full text-xs font-data-table">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="text-left px-3 py-2 font-semibold text-gray-600">Ingredient</th>
                      <th className="text-center px-3 py-2 font-semibold text-gray-600">Qty</th>
                      <th className="text-left px-3 py-2 font-semibold text-gray-600">Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((row, idx) => (
                      <tr key={idx} className={`border-t ${row.status === 'success' ? 'bg-white' : 'bg-red-50'}`}>
                        <td className="px-3 py-1.5 font-medium text-gray-800">{row.ingredient_name}</td>
                        <td className="px-3 py-1.5 text-center text-gray-600">+{row.quantity} {row.unit}</td>
                        <td className="px-3 py-1.5">
                          {row.status === 'success'
                            ? <span className="text-cyan-600 font-medium">✓ {row.message}</span>
                            : <span className="text-red-600 font-medium">✗ {row.message}</span>
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer Buttons */}
        <div className="p-4 border-t flex justify-between items-center bg-gray-50">
          {step === 'upload' && (
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 bg-gray-200 rounded hover:bg-gray-300">
              Cancel
            </button>
          )}
          {step === 'preview' && (
            <>
              <button
                onClick={() => { setStep('upload'); setParsedRows([]); setErrors([]); }}
                className="px-4 py-2 text-sm text-gray-600 bg-gray-200 rounded hover:bg-gray-300"
              >
                ← Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading || parsedRows.filter(r => r.matched).length === 0}
                className="px-6 py-2 text-sm font-medium text-white bg-cyan-600 rounded hover:bg-cyan-700 disabled:opacity-50"
              >
                {loading ? 'Processing...' : `✓ Confirm Receive ${parsedRows.filter(r => r.matched).length} Items`}
              </button>
            </>
          )}
          {step === 'done' && (
            <button onClick={onClose} className="px-6 py-2 text-sm font-medium text-white bg-cyan-600 rounded hover:bg-cyan-700 ml-auto">
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

//RecieveStock Page
function ReceiveStockView({ ingredients, API_URL, onRefresh }) {
  const [form, setForm] = useState({
    ingredientId: '',
    quantity: '',
    cost_per_unit: '',
    supplier: '',
    notes: ''
  });
  const [history, setHistory] = useState([]);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await fetchWithAuth(`${API_URL}/inventory/receive/history`);
      const data = await res.json();
      if (data.success) setHistory(data.history);
    } catch (err) {
      console.error('Error fetching receive history:', err);
    }
  };

  const handleReceive = async () => {
    if (!form.ingredientId || !form.quantity) {
      setMessage({ type: 'error', text: '✗ Ingredient and quantity are required.' });
      return;
    }
    setLoading(true);
    try {
      const res = await fetchWithAuth(`${API_URL}/inventory/adjust`, {
        method: 'POST',
        body: JSON.stringify({
          ingredient_id: parseInt(form.ingredientId),
          quantity_change: parseFloat(form.quantity),
          notes: `Received${form.supplier ? ` from ${form.supplier}` : ''}${form.notes ? ` — ${form.notes}` : ''}`
        })
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: `✓ Stock received successfully!` });
        setForm({ ingredientId: '', quantity: '', cost_per_unit: '', supplier: '', notes: '' });
        onRefresh();
        fetchHistory();
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      } else {
        setMessage({ type: 'error', text: `✗ ${data.error || 'Failed to receive stock'}` });
      }
    } catch (err) {
      setMessage({ type: 'error', text: `✗ Error: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  const selectedIngredient = ingredients.find(i => i.id === parseInt(form.ingredientId));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Receive Form */}
      <div className="bg-white border p-4">
        <h3 className="text-sm font-semibold text-gray-800 mb-4 pb-2 border-b">📦 Receive Stock</h3>

        {message.text && (
          <div className={`p-3 rounded mb-4 text-sm font-medium ${message.type === 'success'
            ? 'bg-green-50 text-cyan-700 border border-cyan-200'
            : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
            {message.text}
          </div>
        )}

        <div className="space-y-3">
          {/* Ingredient Select */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Ingredient *</label>
            <select
              value={form.ingredientId}
              onChange={(e) => setForm({ ...form, ingredientId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-cyan-500"
            >
              <option value="">Select ingredient...</option>
              {ingredients.map(ing => (
                <option key={ing.id} value={ing.id}>
                  {ing.name} — {parseFloat(ing.current_stock).toFixed(2)} {ing.unit} in stock
                </option>
              ))}
            </select>
          </div>

          {/* Current Stock Info */}
          {selectedIngredient && (
            <div className="bg-blue-50 border border-blue-200 rounded p-2 text-xs text-blue-700">
              Current stock: <span className="font-bold">{parseFloat(selectedIngredient.current_stock).toFixed(2)} {selectedIngredient.unit}</span>
              {selectedIngredient.current_stock <= selectedIngredient.reorder_level && (
                <span className="ml-2 bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold">LOW STOCK</span>
              )}
            </div>
          )}

          {/* Quantity */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Quantity Received * {selectedIngredient && <span className="text-gray-400">({selectedIngredient.unit})</span>}
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="e.g. 10, 0.5, 100"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* New Stock Preview */}
          {selectedIngredient && form.quantity && (
            <div className="bg-green-50 border border-cyan-200 rounded p-2 text-xs text-cyan-700">
              New stock after receiving: <span className="font-bold">
                {(parseFloat(selectedIngredient.current_stock) + parseFloat(form.quantity || 0)).toFixed(2)} {selectedIngredient.unit}
              </span>
            </div>
          )}

          {/* Cost per Unit */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Cost per Unit (₱) <span className="text-gray-400">optional</span></label>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="e.g. 25.00"
              value={form.cost_per_unit}
              onChange={(e) => setForm({ ...form, cost_per_unit: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Supplier */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Supplier <span className="text-gray-400">optional</span></label>
            <input
              type="text"
              placeholder="e.g. Metro Mart, Local Farm"
              value={form.supplier}
              onChange={(e) => setForm({ ...form, supplier: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Notes <span className="text-gray-400">optional</span></label>
            <input
              type="text"
              placeholder="e.g. Fresh delivery, Invoice #1234"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Submit */}
          <button
            onClick={handleReceive}
            disabled={loading}
            className="w-full py-2.5 bg-cyan-600 text-white text-sm font-medium rounded hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Processing...' : '📦 Receive Stock'}
          </button>

          <div className="mt-4 pt-4 border-t">
            <button
              onClick={() => setShowBulkModal(true)}
              className="w-full py-2 border-2 border-dashed border-cyan-400 text-cyan-600 text-sm font-medium rounded hover:bg-green-50 transition-colors"
            >
              📂 Bulk Upload via CSV/Excel
            </button>
          </div>

          {showBulkModal && (
            <BulkReceiveModal
              ingredients={ingredients}
              API_URL={API_URL}
              onRefresh={onRefresh}
              onClose={() => setShowBulkModal(false)}
            />
          )}

        </div>
      </div>

      {/* Receive History */}
      <div className="bg-white border">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="text-sm font-semibold text-gray-800">📋 Receive History</h3>
          <button
            onClick={fetchHistory}
            className="text-xs text-blue-600 hover:underline"
          >
            Refresh
          </button>
        </div>
        <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 250px)' }}>
          {history.length === 0 ? (
            <div className="p-6 text-center text-xs text-gray-400">No receive history yet.</div>
          ) : (
            <table className="w-full text-xs border-collapse font-data-table">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="text-left px-3 py-2 font-semibold text-gray-600 border-b">Ingredient</th>
                  <th className="text-center px-3 py-2 font-semibold text-gray-600 border-b">Qty</th>
                  <th className="text-left px-3 py-2 font-semibold text-gray-600 border-b">Notes</th>
                  <th className="text-left px-3 py-2 font-semibold text-gray-600 border-b">Date</th>
                </tr>
              </thead>
              <tbody>
                {history.map((entry, idx) => (
                  <tr key={entry.id || idx} className={`border-b hover:bg-gray-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                    <td className="px-3 py-1.5 font-medium text-gray-800">{entry.ingredient_name}</td>
                    <td className="px-3 py-1.5 text-center">
                      <span className={`font-semibold ${entry.quantity_change > 0 ? 'text-cyan-600' : 'text-red-600'}`}>
                        {entry.quantity_change > 0 ? '+' : ''}{parseFloat(entry.quantity_change).toFixed(2)} {entry.unit}
                      </span>
                    </td>
                    <td className="px-3 py-1.5 text-gray-500 max-w-[120px] truncate">{entry.notes || '—'}</td>
                    <td className="px-3 py-1.5 text-gray-400 whitespace-nowrap">
                      {new Date(entry.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}


// Inventory Page
function InventoryPage({ currentView, setCurrentPage, menuData, refreshProducts }) {
  const API_URL = import.meta.env.VITE_API_URL || (window.location.origin.includes('localhost') ? 'http://localhost:5000/api' : '/api');
  const [products, setProducts] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [trackingFilter, setTrackingFilter] = useState('All');
  const [sortBy, setSortBy] = useState('name');
  const [sortDir, setSortDir] = useState('asc');
  const [showAddIngredientModal, setShowAddIngredientModal] = useState(false);
  const [showAddPackagedModal, setShowAddPackagedModal] = useState(false);
  const [showEditIngredientModal, setShowEditIngredientModal] = useState(false);
  const [importingCsv, setImportingCsv] = useState(false);
  const [ingredientForm, setIngredientForm] = useState({ name: '', unit: '', current_stock: '', reorder_level: '', cost_per_unit: '' });
  const [packagedForm, setPackagedForm] = useState({ product_id: '', name: '', unit: 'pc', stock: '', reorder: '', cost: '', quantity_required: 1 });
  const [editingIngredient, setEditingIngredient] = useState(null);
  const [modalMessage, setModalMessage] = useState({ type: '', text: '' });
  const [showAddRecipeModal, setShowAddRecipeModal] = useState(false);
  const [selectedProductForRecipe, setSelectedProductForRecipe] = useState(null);
  const [productSizes, setProductSizes] = useState([]);
  const [recipeForm, setRecipeForm] = useState({ ingredientId: '', quantity_required: '', size_id: '' });
  const [recipeMessage, setRecipeMessage] = useState({ type: '', text: '' });
  const [expandedProductId, setExpandedProductId] = useState(null);
  const [productIngredients, setProductIngredients] = useState({});
  const [editingRecipeIngredient, setEditingRecipeIngredient] = useState(null);
  const [editQuantity, setEditQuantity] = useState('');
  const [editMessage, setEditMessage] = useState({ type: '', text: '' });
  const [adjustingStock, setAdjustingStock] = useState({});
  const [expandedLedgerId, setExpandedLedgerId] = useState(null); // { id: number, type: 'product' | 'ingredient' } | null
  const [ledgerTransactions, setLedgerTransactions] = useState([]);
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [selectedItemForAdjustment, setSelectedItemForAdjustment] = useState(null);
  const [loadingLedger, setLoadingLedger] = useState(false);
  const ingredientCsvInputRef = useRef(null);
  const productCsvInputRef = useRef(null);
  const [importingProductCsv, setImportingProductCsv] = useState(false);

  const downloadProductTemplate = () => {
    const csv = 'name,category,price,sku,cost,stock_quantity,low_stock_threshold\nCoca-Cola 330ml,Drinks,45.00,COKE-330,25.00,24,10\nMargherita Pizza,Pizza,350.00,PIZ-MARG,120.00,0,5\n';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'menu_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleProductCsvFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setImportingProductCsv(true);
      const text = await file.text();
      const res = await fetchWithAuth(`${API_URL}/products/bulk`, {
        method: 'POST',
        body: JSON.stringify({ csv: text })
      });
      const data = await res.json();
      if (data.success) {
        alert(`Successfully imported ${data.imported} products!`);
        await refreshProducts();
      } else {
        alert(data.error || 'Failed to import products');
      }
    } catch (err) {
      alert('Error importing products: ' + err.message);
    } finally {
      setImportingProductCsv(false);
      e.target.value = '';
    }
  };

  const fetchLedger = async (id, type) => {
    setLoadingLedger(true);
    try {
      const res = await fetchWithAuth(`${API_URL}/inventory/transactions/${id}?type=${type}`);
      const data = await res.json();
      if (data.success) {
        setLedgerTransactions(data.transactions);
      }
    } catch (error) {
      console.error('Error fetching ledger:', error);
    } finally {
      setLoadingLedger(false);
    }
  };

  const toggleLedger = (id, type) => {
    if (expandedLedgerId?.id === id && expandedLedgerId?.type === type) {
      setExpandedLedgerId(null);
      setLedgerTransactions([]);
    } else {
      setExpandedLedgerId({ id, type });
      fetchLedger(id, type);
    }
  };

  const InventoryLedger = ({ transactions, loading, unit }) => (
    <div className="bg-gray-100 p-2 border-t font-sans">
      <div className="flex justify-between items-center mb-1 px-1">
        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Stock Movement Journal</span>
        <span className="text-[9px] text-cyan-600 font-mono italic">Audit Trail Active</span>
      </div>
      {loading ? (
        <div className="py-4 text-center text-[10px] text-gray-400">Loading ledger...</div>
      ) : (
        <div className="bg-white border rounded shadow-sm overflow-hidden border-gray-200">
          <table className="w-full text-[10px] border-collapse">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-2 py-1.5 font-bold text-gray-500 uppercase tracking-tighter">Date / Time</th>
                <th className="text-center px-2 py-1.5 font-bold text-gray-500 uppercase tracking-tighter">Action</th>
                <th className="text-center px-2 py-1.5 font-bold text-gray-500 uppercase tracking-tighter">Change</th>
                <th className="text-center px-2 py-1.5 font-bold text-gray-500 uppercase tracking-tighter">Running Balance</th>
                <th className="text-center px-1 py-1.5 font-bold text-gray-500 uppercase tracking-tighter">Expiry</th>
                <th className="text-left px-2 py-1.5 font-bold text-gray-500 uppercase tracking-tighter">Notes</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-6 text-center text-gray-400 italic font-medium">No movement recorded for this item.</td>
                </tr>
              ) : (
                transactions.map(t => (
                  <tr key={t.id} className="border-b last:border-0 hover:bg-cyan-50/20 transition-colors">
                    <td className="px-2 py-1.5 whitespace-nowrap text-gray-400 font-medium">
                      {new Date(t.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-2 py-1.5 text-center font-black uppercase tracking-tighter">
                      <span className={t.quantity_change > 0 ? 'text-green-600' : 'text-orange-500'}>
                        {t.transaction_type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className={`px-2 py-1.5 text-center font-bold ${t.quantity_change > 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {t.quantity_change > 0 ? '+' : ''}{parseFloat(t.quantity_change).toFixed(2)}
                    </td>
                    <td className="px-2 py-1.5 text-center font-black text-gray-700 bg-gray-50/30">
                      {parseFloat(t.quantity_after || 0).toFixed(2)} <span className="text-[8px] text-gray-300 ml-0.5">{unit || 'pc'}</span>
                    </td>
                    <td className="px-1 py-1.5 text-center">
                      {t.expiry_date ? (
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${new Date(t.expiry_date) < new Date() ? 'bg-red-500 text-white animate-pulse' : 'bg-cyan-100 text-cyan-700 border border-cyan-200'}`}>
                          {new Date(t.expiry_date).toLocaleDateString()}
                        </span>
                      ) : (
                        <span className="text-gray-200 font-bold">—</span>
                      )}
                    </td>
                    <td className="px-2 py-1.5 text-gray-500 truncate max-w-[150px] font-medium" title={t.notes}>
                      {t.notes || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );


  const views = [
    { id: 'inventory-stock', name: 'Stock' },
    { id: 'inventory-ingredients', name: 'Raw Materials' },
    { id: 'inventory-recipes', name: 'Composite' },
    { id: 'inventory-reorder', name: 'Low Stock 📦' },
    { id: 'inventory-expiring', name: 'Expiring Soon ⚠️' },
    { id: 'inventory-status', name: 'Status' },
    { id: 'inventory-receive', name: 'Receive' },
  ];

  const recipeCountByProductId = useMemo(() => {
    const map = {};
    (recipes || []).forEach((r) => {
      const key = String(r.id);
      map[key] = Number(r.ingredient_count || 0);
    });
    return map;
  }, [recipes]);

  useEffect(() => {
    console.log('[InventoryPage] useEffect triggered, currentView:', currentView);
    const regularProducts = menuData.filter(p => !p.isCombo);
    setProducts(regularProducts);

    // Load ingredients and data when needed
    const viewsNeedingIngredients = ['inventory-ingredients', 'inventory-stock', 'inventory-recipes', 'inventory-reorder', 'inventory-expiring', 'inventory-status'];
    if (viewsNeedingIngredients.includes(currentView)) {
      console.log('[InventoryPage] Loading ingredients for view:', currentView);
      fetchIngredients();
      if (currentView === 'inventory-stock' || currentView.startsWith('inventory-recipes')) {
        console.log('[InventoryPage] Also loading recipes');
        fetchRecipes();
      }
    }
  }, [menuData, currentView]);

  const adjustStock = async (productId, adjustment) => {
    if (adjustingStock[productId]) return;
    setAdjustingStock(prev => ({ ...prev, [productId]: true }));
    try {
      const res = await fetchWithAuth(`${API_URL}/products/${productId}/stock`, {
        method: 'POST',
        body: JSON.stringify({ adjustment })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to adjust stock');
      }

      // Apply immediate UI update so buttons do not feel "stuck".
      if (data.product?.stock_quantity !== undefined) {
        setProducts(prev =>
          prev.map(p =>
            p.id === productId ? { ...p, stock_quantity: data.product.stock_quantity } : p
          )
        );
      }

      await refreshProducts();
    } catch (error) {
      console.error('Error adjusting stock:', error);
      alert(error.message || 'Failed to adjust stock');
    } finally {
      setAdjustingStock(prev => {
        const next = { ...prev };
        delete next[productId];
        return next;
      });
    }
  };

  const fetchIngredients = async () => {
    try {
      console.log('[InventoryPage] Fetching ingredients from', `${API_URL}/inventory/ingredients`);
      const res = await fetchWithAuth(`${API_URL}/inventory/ingredients`);
      const data = await res.json();
      console.log('[InventoryPage] Ingredients response:', data);
      if (data.success) {
        console.log('[InventoryPage] Setting', data.ingredients.length, 'ingredients');
        setIngredients(data.ingredients);
      } else {
        console.error('[InventoryPage] API returned success=false:', data.error);
      }
    } catch (error) {
      console.error('[InventoryPage] Error fetching ingredients:', error);
    }
  };

  const downloadIngredientTemplate = async () => {
    try {
      setImportingCsv(true);
      const res = await fetchWithAuth(`${API_URL}/inventory/ingredients/template`, {
        headers: { Accept: 'text/csv,*/*;q=0.9' }
      });
      let text = await res.text();

      // If backend returned an error JSON, fall back to local template.
      const looksLikeErrorJson = text.trim().startsWith('{') && text.includes('"success":false');
      if (!res.ok || looksLikeErrorJson) {
        console.warn('Template download failed, falling back to client CSV. Response:', text);
        text = 'name,unit,current_stock,reorder_level,cost_per_unit,supplier\nSample Ingredient,pc,0,0,0,Supplier Name\n';
      }

      const blob = new Blob([text], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'ingredients_template.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download template:', error);
      alert('Could not download template. Please try again.');
    } finally {
      setImportingCsv(false);
    }
  };

  const handleCsvFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setImportingCsv(true);
      const text = await file.text();
      const res = await fetchWithAuth(`${API_URL}/inventory/ingredients/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ csv: text })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Import failed');
      }
      alert(`Imported ${data.imported} ingredients`);
      fetchIngredients();
    } catch (error) {
      console.error('CSV import failed:', error);
      alert(error.message || 'CSV import failed');
    } finally {
      setImportingCsv(false);
      e.target.value = '';
    }
  };

  const fetchRecipes = async () => {
    try {
      const res = await fetchWithAuth(`${API_URL}/inventory/recipes`);
      const data = await res.json();
      if (data.success) {
        setRecipes(data.products);
      }
    } catch (error) {
      console.error('Error fetching recipes:', error);
    }
  };

  const fetchProductIngredients = async (productId) => {
    try {
      const res = await fetchWithAuth(`${API_URL}/inventory/recipes/${productId}`);
      const data = await res.json();
      if (data.success && data.recipe) {
        // Convert API response format to match UI expectations
        const ingredients = data.recipe.map(r => ({
          ingredient_id: r.ingredient_id,
          ingredient_name: r.ingredient_name || `Unknown (ID: ${r.ingredient_id})`,
          quantity_required: r.quantity_required,
          unit: r.unit || 'units',
          current_stock: r.current_stock || 0,
          cost_per_unit: r.cost_per_unit || 0,
          size_id: r.size_id,
          size_name: r.size_name
        }));
        setProductIngredients(prev => ({
          ...prev,
          [productId]: ingredients
        }));
      } else {
        setProductIngredients(prev => ({
          ...prev,
          [productId]: []
        }));
      }
    } catch (error) {
      console.error('Error fetching product ingredients:', error);
      setProductIngredients(prev => ({
        ...prev,
        [productId]: []
      }));
    }
  };

  const handleProductClick = async (product) => {
    if (expandedProductId === product.id) {
      setExpandedProductId(null);
    } else {
      setExpandedProductId(product.id);
      fetchProductIngredients(product.id);

      // Fetch sizes for modal and display
      try {
        const res = await fetchWithAuth(`${API_URL}/products/${product.id}`);
        const data = await res.json();
        if (data.success && data.product.sizes) {
          setProductSizes(data.product.sizes);
        } else {
          setProductSizes([]);
        }
      } catch (error) {
        console.error('Error fetching product sizes:', error);
        setProductSizes([]);
      }
    }
  };

  const addIngredient = async (name, unit, current_stock, reorder_level, cost_per_unit) => {
    try {
      const res = await fetchWithAuth(`${API_URL}/inventory/ingredients`, {
        method: 'POST',
        body: JSON.stringify({ name, unit, current_stock, reorder_level, cost_per_unit })
      });
      const data = await res.json();
      if (data.success) {
        setModalMessage({ type: 'success', text: `✓ "${name}" added successfully (ID: ${data.ingredient.id})` });
        fetchIngredients();
        // Clear form and close modal after 1.5s
        setTimeout(() => {
          setShowAddIngredientModal(false);
          setIngredientForm({ name: '', unit: '', current_stock: '', reorder_level: '', cost_per_unit: '' });
          setModalMessage({ type: '', text: '' });
        }, 1500);
      } else {
        setModalMessage({ type: 'error', text: `✗ ${data.error || 'Failed to add ingredient'}` });
      }
    } catch (error) {
      console.error('Error adding ingredient:', error);
      setModalMessage({ type: 'error', text: `✗ Error adding ingredient: ${error.message}` });
    }
  };

  const updateInventory = async (ingredientId, quantity_change, notes) => {
    try {
      const res = await fetchWithAuth(`${API_URL}/inventory/adjust`, {
        method: 'POST',
        body: JSON.stringify({ ingredient_id: ingredientId, quantity_change: parseFloat(quantity_change), notes })
      });
      const data = await res.json();
      if (data.success) {
        fetchIngredients();
        alert('Inventory adjusted successfully');
      } else {
        alert(data.error || 'Failed to adjust inventory');
      }
    } catch (error) {
      console.error('Error adjusting inventory:', error);
      alert('Error adjusting inventory');
    }
  };

  const addRecipeIngredient = async (productId, ingredientId, quantity, sizeId = null) => {
    try {
      const res = await fetchWithAuth(`${API_URL}/inventory/recipes/${productId}/ingredients`, {
        method: 'POST',
        body: JSON.stringify({ ingredient_id: ingredientId, quantity_required: quantity, size_id: sizeId })
      });
      const data = await res.json();
      if (data.success) {
        setRecipeMessage({ type: 'success', text: '✓ Ingredient added successfully' });
        fetchProductIngredients(productId);
        setTimeout(() => {
          setShowAddRecipeModal(false);
          setRecipeForm({ ingredientId: '', quantity_required: '', size_id: '' });
          setRecipeMessage({ type: '', text: '' });
        }, 1500);
      } else {
        setRecipeMessage({ type: 'error', text: `✗ ${data.error || 'Failed to add recipe ingredient'}` });
      }
    } catch (error) {
      console.error('Error adding recipe ingredient:', error);
      setRecipeMessage({ type: 'error', text: `✗ Error: ${error.message}` });
    }
  };

  const updateRecipeIngredient = async (productId, ingredientId, quantity_required, sizeId = null) => {
    try {
      const res = await fetchWithAuth(`${API_URL}/inventory/recipes/${productId}/ingredients/${ingredientId}`, {
        method: 'PUT',
        body: JSON.stringify({
          quantity_required: parseFloat(quantity_required),
          size_id: sizeId
        })
      });
      const data = await res.json();
      if (data.success) {
        setEditMessage({ type: 'success', text: '✓ Quantity updated successfully' });
        fetchProductIngredients(productId);
        setTimeout(() => {
          setEditingRecipeIngredient(null);
          setEditQuantity('');
          setEditMessage({ type: '', text: '' });
        }, 1500);
      } else {
        setEditMessage({ type: 'error', text: `✗ ${data.error || 'Failed to update quantity'}` });
      }
    } catch (error) {
      console.error('Error updating recipe ingredient:', error);
      setEditMessage({ type: 'error', text: `✗ Error: ${error.message}` });
    }
  };

  const updateIngredient = async (id, { name, unit, reorder_level, cost_per_unit }) => {
    try {
      const res = await fetchWithAuth(`${API_URL}/inventory/ingredients/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name,
          unit,
          reorder_level: reorder_level === '' ? null : reorder_level,
          cost_per_unit: cost_per_unit === '' ? null : cost_per_unit
        })
      });
      const data = await res.json();
      if (data.success) {
        setShowEditIngredientModal(false);
        setEditingIngredient(null);
        fetchIngredients();
        alert('Ingredient updated.');
      } else {
        alert(data.error || 'Failed to update ingredient');
      }
    } catch (error) {
      console.error('Error updating ingredient:', error);
      alert('Error updating ingredient');
    }
  };

  const createPackagedItem = async ({ product_id, name, unit = 'pc', stock = 0, reorder = 0, cost = 0, quantity_required = 1 }) => {
    try {
      const res = await fetchWithAuth(`${API_URL}/inventory/packaged`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id,
          name,
          unit,
          current_stock: stock,
          reorder_level: reorder,
          cost_per_unit: cost,
          quantity_required
        })
      });
      const data = await res.json();
      if (data.success) {
        fetchIngredients();
        if (typeof fetchRecipes === 'function') fetchRecipes();
        if (typeof fetchProductIngredients === 'function') fetchProductIngredients(product_id);
        alert('Packaged item created and linked.');
      } else {
        alert(data.error || 'Failed to create packaged item');
      }
    } catch (error) {
      console.error('Error creating packaged item:', error);
      alert('Error creating packaged item');
    }
  };

  const deleteIngredient = async (id, name) => {
    if (!confirm(`Are you sure you want to completely delete "${name}"? This action cannot be undone.`)) return;
    try {
      const res = await fetchWithAuth(`${API_URL}/inventory/ingredients/${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        fetchIngredients();
        if (typeof fetchRecipes === 'function') fetchRecipes();
      } else {
        alert(data.error || 'Failed to delete ingredient');
      }
    } catch (error) {
      console.error('Error deleting ingredient:', error);
      alert('Error deleting ingredient');
    }
  };

  const removeRecipeIngredient = async (productId, ingredientId, sizeId = null) => {
    if (!confirm('Remove this ingredient from recipe?')) return;
    try {
      const res = await fetchWithAuth(`${API_URL}/inventory/recipes/${productId}/ingredients/${ingredientId}${sizeId ? `?size_id=${sizeId}` : ''}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        fetchProductIngredients(productId);
        alert('Ingredient removed from recipe');
      } else {
        alert(data.error || 'Failed to remove ingredient');
      }
    } catch (error) {
      console.error('Error removing recipe ingredient:', error);
      alert('Error removing ingredient');
    }
  };

  const handleAutoLink = async () => {
    if (!confirm('This will automatically create 1:1 recipe links for all Products and Ingredients with identical names. Continue?')) return;
    try {
      const res = await fetchWithAuth(`${API_URL}/inventory/recipes/auto-link`, {
        method: 'POST'
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        fetchRecipes();
      } else {
        alert(data.error || 'Auto-link failed');
      }
    } catch (error) {
      console.error('Auto-link error:', error);
      alert('Error during auto-link');
    }
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDir('asc');
    }
  };

  const filteredProducts = products
    .filter(p => {
      const name = (p.name || '').toLowerCase();
      const cat = (p.category || '').toLowerCase();
      const term = (searchTerm || '').toLowerCase();
      return name.includes(term) || cat.includes(term);
    })
    .filter(p => {
      const hasRecipe = ((recipeCountByProductId[String(p.id)] ?? Number(p.ingredient_count || 0)) > 0);
      if (trackingFilter === 'Standalone') return !hasRecipe;
      if (trackingFilter === 'Composite') return hasRecipe;
      return true;
    })
    .sort((a, b) => {
      let aVal = sortBy === 'stock' ? (a.stock_quantity || 0) : a[sortBy];
      let bVal = sortBy === 'stock' ? (b.stock_quantity || 0) : b[sortBy];
      if (aVal === undefined || aVal === null) aVal = '';
      if (bVal === undefined || bVal === null) bVal = '';
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();
      if (sortDir === 'asc') return aVal > bVal ? 1 : -1;
      return aVal < bVal ? 1 : -1;
    });

  return (
    <div className="inventory-lineitems min-h-screen bg-gray-50 pt-0">
      <div className="w-full px-2 py-2">
        {/* Compact Header */}
        <div className="flex items-center justify-between mb-2 bg-white px-3 py-2 border-b">
          <div className="flex items-center gap-4">
            <h1 className="text-sm font-semibold text-gray-700">Inventory</h1>
            <div className="flex gap-1">
              {views.map(view => (
                <button
                  key={view.id}
                  onClick={() => setCurrentPage(view.id)}
                  className={`px-2 py-1 text-xs font-medium transition-all ${currentView === view.id ? 'bg-cyan-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                >
                  {view.name}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={downloadProductTemplate}
              className="px-2 py-1 text-[10px] bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200"
            >
              Get CSV Template
            </button>
            <button
              onClick={() => productCsvInputRef.current?.click()}
              disabled={importingProductCsv}
              className="px-2 py-1 text-[10px] bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {importingProductCsv ? 'Importing...' : 'Bulk Import Menu'}
            </button>
            <input
              ref={productCsvInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleProductCsvFileChange}
            />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-2 py-1 text-[10px] border border-gray-300 w-40 focus:outline-none focus:border-cyan-500 rounded"
            />
            {currentView === 'inventory-stock' && (
              <select
                value={trackingFilter}
                onChange={(e) => setTrackingFilter(e.target.value)}
                className="px-2 py-1 text-[10px] border border-gray-300 rounded focus:outline-none focus:border-cyan-500 bg-white"
              >
                <option value="All">All Tracking Types</option>
                <option value="Standalone">Standalone Only (Retail)</option>
                <option value="Composite">Composite Only (Recipe)</option>
              </select>
            )}
          </div>
        </div>

        {currentView === 'inventory-stock' && (
          <div className="bg-white border overflow-auto" style={{ maxHeight: 'calc(100vh - 160px)' }}>
            <table className="w-full text-xs border-collapse font-data-table">
              <thead className="bg-gray-100 sticky top-0">
                <tr>
                  <th
                    onClick={() => handleSort('name')}
                    className="text-left px-2 py-1.5 font-semibold text-gray-600 border-b cursor-pointer hover:bg-gray-200"
                  >
                    # Product {sortBy === 'name' && (sortDir === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="text-left px-2 py-1.5 font-semibold text-gray-600 border-b w-20">SKU ID</th>
                  <th className="text-left px-2 py-1.5 font-semibold text-gray-600 border-b w-24">Expiry</th>
                  <th
                    onClick={() => handleSort('category')}
                    className="text-left px-2 py-1.5 font-semibold text-gray-600 border-b cursor-pointer hover:bg-gray-200"
                  >
                    Category {sortBy === 'category' && (sortDir === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="text-right px-2 py-1.5 font-semibold text-gray-600 border-b w-16">Price</th>
                  <th
                    onClick={() => handleSort('stock')}
                    className="text-center px-2 py-1.5 font-semibold text-gray-600 border-b w-16 cursor-pointer hover:bg-gray-200"
                  >
                    Qty {sortBy === 'stock' && (sortDir === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="text-center px-2 py-1.5 font-semibold text-gray-600 border-b w-14">Low</th>
                  <th className="text-center px-2 py-1.5 font-semibold text-gray-600 border-b w-16">Status</th>
                  <th className="text-center px-2 py-1.5 font-semibold text-gray-600 border-b w-20">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product, idx) => {
                  const hasRecipe = ((recipeCountByProductId[String(product.id)] ?? Number(product.ingredient_count || 0)) > 0);
                  const isLow = !hasRecipe && (product.stock_quantity || 0) <= (product.low_stock_threshold || 10);
                  const isExpanded = expandedLedgerId?.id === product.id && expandedLedgerId?.type === 'product';
                  return (
                    <React.Fragment key={product.id}>
                      <tr
                        className={`border-b hover:bg-blue-50 cursor-pointer ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} ${isExpanded ? 'bg-cyan-50/50 border-cyan-200' : ''}`}
                        onClick={() => toggleLedger(product.id, 'product')}
                      >
                        <td className="px-2 py-1 text-sm font-medium text-gray-800">
                          <span className="mr-1.5 opacity-40">{isExpanded ? '▼' : '▶'}</span>
                          {product.name}
                        </td>
                        <td className="px-2 py-1 text-gray-600 font-mono text-xs">{product.sku || '-'}</td>
                        <td className="px-2 py-1">
                          {product.last_expiry_date ? (
                            <span className={`text-[10px] font-bold px-1 rounded ${new Date(product.last_expiry_date) < new Date() ? 'bg-red-500 text-white animate-pulse' : (new Date(product.last_expiry_date) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) ? 'bg-yellow-400 text-black' : 'text-gray-500')}`}>
                              {new Date(product.last_expiry_date).toLocaleDateString()}
                            </span>
                          ) : '-'}
                        </td>
                        <td className="px-2 py-1 text-gray-500">{product.category}</td>
                        <td className="px-2 py-1 text-right text-gray-600">₱{(product.price || 0).toFixed(2)}</td>
                        <td className={`px-2 py-1 text-center font-medium ${hasRecipe ? 'text-[10px] text-gray-400 italic' : (isLow ? 'text-red-600' : 'text-gray-800')}`}>
                          {hasRecipe ? 'Made to Order' : (product.stock_quantity || 0)}
                        </td>
                        <td className="px-2 py-1 text-center text-gray-500">
                          {hasRecipe ? '—' : (product.low_stock_threshold || 10)}
                        </td>
                        <td className="px-2 py-1 text-center">
                          {hasRecipe ? (
                            <span className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-600 border border-blue-100 uppercase tracking-wider font-bold rounded">
                              Composite
                            </span>
                          ) : (
                            <span className={`text-xs px-1.5 py-0.5 ${isLow ? 'bg-red-100 text-red-600' : 'bg-cyan-100 text-cyan-600'}`}>
                              {isLow ? 'LOW' : 'OK'}
                            </span>
                          )}
                        </td>
                        <td className="px-2 py-1 text-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedItemForAdjustment({ ...product, type: 'product' });
                              setShowAdjustmentModal(true);
                            }}
                            className="text-[10px] px-2 py-1 bg-cyan-600 text-white font-bold rounded hover:bg-cyan-700 transition-colors uppercase"
                          >
                            Adjust
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan="8" className="p-0 border-b">
                            <InventoryLedger transactions={ledgerTransactions} loading={loadingLedger} unit="pc" />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
            <div className="px-2 py-1 bg-gray-100 text-[10px] text-gray-500 border-t">
              Showing {filteredProducts.length} of {products.length} items
            </div>
          </div>
        )}

        {currentView === 'inventory-receive' && (
          <ReceiveStockView
            ingredients={ingredients}
            API_URL={API_URL}
            onRefresh={fetchIngredients}
          />
        )}
        {currentView === 'inventory-waste' && (
          <div className="bg-white border p-4">
            <h3 className="text-sm font-medium text-gray-800 mb-2">Waste Tracking</h3>
            <p className="text-xs text-gray-500">Waste tracking functionality coming soon.</p>
          </div>
        )}

        {currentView === 'inventory-ingredients' && (
          <div className="bg-white border">
            <div className="p-4 border-b flex justify-between items-center">
              <div className="flex items-center gap-3">
                <h3 className="text-sm font-medium text-gray-800">Raw Materials & Ingredients</h3>
                <button
                  onClick={downloadIngredientTemplate}
                  disabled={importingCsv}
                  className="px-3 py-1 text-xs bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200 disabled:opacity-60"
                >
                  Download CSV Template
                </button>
                <button
                  onClick={() => ingredientCsvInputRef.current?.click()}
                  disabled={importingCsv}
                  className="px-3 py-1 text-xs bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {importingCsv ? 'Importing…' : 'Upload CSV'}
                </button>
                <input
                  ref={ingredientCsvInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={handleCsvFileChange}
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowAddIngredientModal(true)}
                  className="px-3 py-1 text-xs bg-cyan-600 text-white hover:bg-cyan-700"
                >
                  + Add Ingredient
                </button>
                <button
                  onClick={() => setShowAddPackagedModal(true)}
                  className="px-3 py-1 text-xs bg-blue-600 text-white hover:bg-blue-700"
                >
                  + Packaged Item
                </button>
              </div>
            </div>
            <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
              <table className="w-full text-xs border-collapse font-data-table">
                <thead className="bg-gray-100 sticky top-0">
                  <tr>
                    <th className="text-left px-2 py-1.5 font-semibold text-gray-600 border-b">Ingredient</th>
                    <th className="text-center px-2 py-1.5 font-semibold text-gray-600 border-b w-16">Unit</th>
                    <th className="text-center px-2 py-1.5 font-semibold text-gray-600 border-b w-20">Stock</th>
                    <th className="text-center px-2 py-1.5 font-semibold text-gray-600 border-b w-20">Reorder</th>
                    <th className="text-center px-2 py-1.5 font-semibold text-gray-600 border-b w-24">Last Expiry</th>
                    <th className="text-center px-2 py-1.5 font-semibold text-gray-600 border-b w-16">Cost/Unit</th>
                    <th className="text-center px-2 py-1.5 font-semibold text-gray-600 border-b">Status</th>
                    <th className="text-center px-2 py-1.5 font-semibold text-gray-600 border-b w-28">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {ingredients.map((ing, idx) => {
                    const isLow = ing.current_stock <= ing.reorder_level;
                    const isExpanded = expandedLedgerId?.id === ing.id && expandedLedgerId?.type === 'ingredient';
                    return (
                      <React.Fragment key={ing.id}>
                        <tr
                          className={`border-b hover:bg-blue-50 cursor-pointer ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} ${isExpanded ? 'bg-cyan-50/50 border-cyan-200' : ''}`}
                          onClick={() => toggleLedger(ing.id, 'ingredient')}
                        >
                          <td className="px-2 py-1 text-sm font-medium text-gray-800">
                            <span className="mr-1.5 opacity-40">{isExpanded ? '▼' : '▶'}</span>
                            {ing.name}
                          </td>
                          <td className="px-2 py-1 text-center text-gray-500">{ing.unit}</td>
                          <td className={`px-2 py-1 text-center font-semibold ${isLow ? 'text-red-600' : 'text-gray-800'}`}>
                            {parseFloat(ing.current_stock).toFixed(2)}
                          </td>
                          <td className="px-2 py-1 text-center text-gray-500">{parseFloat(ing.reorder_level).toFixed(2)}</td>
                          <td className="px-2 py-1 text-center">
                            {ing.last_expiry_date ? (
                              <span className={`text-[10px] font-bold px-1 rounded ${new Date(ing.last_expiry_date) < new Date() ? 'bg-red-500 text-white animate-pulse' : (new Date(ing.last_expiry_date) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) ? 'bg-yellow-400 text-black' : 'text-gray-500')}`}>
                                {new Date(ing.last_expiry_date).toLocaleDateString()}
                              </span>
                            ) : '-'}
                          </td>
                          <td className="px-2 py-1 text-center text-gray-500">₱{parseFloat(ing.cost_per_unit).toFixed(2)}</td>
                          <td className="px-2 py-1 text-center">
                            <span className={`text-xs px-1.5 py-0.5 ${isLow ? 'bg-red-100 text-red-600 font-bold' : 'bg-cyan-100 text-cyan-600'}`}>
                              {isLow ? 'LOW STOCK' : 'OK'}
                            </span>
                          </td>
                          <td className="px-2 py-1 text-center">
                            <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedItemForAdjustment({ ...ing, type: 'ingredient' });
                                  setShowAdjustmentModal(true);
                                }}
                                className="text-xs px-2 py-0.5 bg-cyan-600 text-white hover:bg-cyan-700"
                              >
                                Adjust
                              </button>
                              <button
                                onClick={() => {
                                  setEditingIngredient(ing);
                                  setIngredientForm({
                                    name: ing.name || '',
                                    unit: ing.unit || '',
                                    current_stock: ing.current_stock,
                                    reorder_level: ing.reorder_level,
                                    cost_per_unit: ing.cost_per_unit
                                  });
                                  setShowEditIngredientModal(true);
                                }}
                                className="text-xs px-2 py-0.5 bg-gray-600 text-white hover:bg-gray-700 ml-1"
                              >
                                Edit</button><button onClick={() => deleteIngredient(ing.id, ing.name)} className="text-xs px-2 py-0.5 bg-red-500 text-white hover:bg-red-600 ml-1">Delete</button></div></td></tr>{isExpanded && (
                                  <tr>
                                    <td colSpan="7" className="p-0 border-b">
                                      <InventoryLedger transactions={ledgerTransactions} loading={loadingLedger} unit={ing.unit} />
                                    </td>
                                  </tr>
                                )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
              {ingredients.length === 0 && (
                <div className="px-4 py-8 text-center text-gray-500 text-xs">
                  No ingredients yet. Add one to get started!
                </div>
              )}
            </div>
          </div>
        )}

        {currentView === 'inventory-recipes' && (
          <div className="bg-white border">
            <div className="p-4 border-b flex justify-between items-center">
              <div className="flex flex-col">
                <h3 className="text-sm font-bold text-gray-800">Product Recipes (Bill of Materials)</h3>
                <p className="text-[10px] text-gray-500">Link menu items to raw materials for automatic stock deduction.</p>
              </div>
              <button
                onClick={handleAutoLink}
                className="px-4 py-1.5 text-xs bg-cyan-600 text-white hover:bg-cyan-700 font-bold rounded-lg shadow-sm flex items-center gap-2 transition-all"
              >
                <span>⚡</span> Auto-Link Matching Names
              </button>
            </div>
            <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
              {recipes.length === 0 ? (
                <div className="px-4 py-8 text-center text-gray-500 text-xs">
                  No products available.
                </div>
              ) : (
                <div className="space-y-0">
                  {recipes.map((product, idx) => {
                    const ingredientCount = product.ingredient_count || 0;
                    const isExpanded = expandedProductId === product.id;
                    const ingredientsList = productIngredients[product.id] || [];
                    return (
                      <div key={product.id} className={`border-b ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                        <div
                          className="px-4 py-2 flex justify-between items-center cursor-pointer hover:bg-blue-50"
                          onClick={() => handleProductClick(product)}
                        >
                          <div>
                            <p className="font-medium text-gray-800 text-sm">{product.name}</p>
                            <p className="text-xs text-gray-500">{product.category} {product.sku && `• SKU: ${product.sku}`}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-semibold text-gray-600">{ingredientCount} ingredients</p>
                            <p className="text-[10px] text-gray-400">{isExpanded ? '▼' : '▶'}</p>
                          </div>
                        </div>
                        {isExpanded && (
                          <div className="px-4 py-3 bg-gray-50 border-t text-xs">
                            {ingredientsList.length === 0 ? (
                              <p className="text-gray-500 mb-3">No ingredients defined yet.</p>
                            ) : (
                              <>
                                <div className="space-y-2 mb-3">
                                  {ingredientsList.map((ing, idx) => (
                                    <div key={idx} className="flex justify-between items-center bg-white p-2 rounded border border-gray-200">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                          <p className="font-medium text-gray-700">{ing.ingredient_name}</p>
                                          {ing.size_name && (
                                            <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-[9px] font-bold border border-blue-100 italic uppercase">
                                              Variant: {ing.size_name}
                                            </span>
                                          )}
                                        </div>
                                        <p className="text-gray-500">Stock Link • ID: {ing.ingredient_id}</p>
                                      </div>
                                      <div className="text-right flex items-center gap-4">
                                        <div className="text-right">
                                          <p className="font-bold text-gray-800">{parseFloat(ing.quantity_required).toFixed(2)} {ing.unit}</p>
                                          <p className="text-[10px] text-gray-400 uppercase">Qty Required</p>
                                        </div>
                                        <div className="text-right border-l pl-4 min-w-[70px]">
                                          <p className="font-bold text-cyan-600">₱{((parseFloat(ing.quantity_required) || 0) * (parseFloat(ing.cost_per_unit) || 0)).toFixed(2)}</p>
                                          <p className="text-[10px] text-gray-400 uppercase">Cost Link</p>
                                        </div>
                                      </div>
                                      <button
                                        onClick={() => {
                                          setEditingRecipeIngredient({
                                            productId: product.id,
                                            ingredientId: ing.ingredient_id,
                                            ingredientName: ing.ingredient_name,
                                            unit: ing.unit,
                                            size_id: ing.size_id
                                          });
                                          setEditQuantity(ing.quantity_required);
                                        }}
                                        className="ml-2 px-2 py-1 text-xs bg-blue-500 text-white hover:bg-blue-600 rounded"
                                      >
                                        Edit
                                      </button>
                                      <button
                                        onClick={() => removeRecipeIngredient(product.id, ing.ingredient_id, ing.size_id)}
                                        className="ml-2 px-2 py-1 text-xs bg-red-500 text-white hover:bg-red-600"
                                      >
                                        Remove
                                      </button>
                                    </div>
                                  ))}
                                </div>
                                <div className="mt-4 p-3 bg-white border border-cyan-100 rounded-lg shadow-sm">
                                  <h4 className="text-[10px] font-bold text-cyan-700 uppercase mb-2 tracking-wider">Recipe Costing Summary</h4>
                                  <div className="space-y-2">
                                    {/* Base product price (if price exists) */}
                                    {product.price > 0 && ingredientsList.some(i => !i.size_id) && (
                                      <div className="flex justify-between items-center text-xs pb-1 border-b border-gray-50 last:border-0 hover:bg-cyan-50/30">
                                        <div>
                                          <span className="font-bold text-gray-700">Standard Product</span>
                                          <span className="text-[10px] text-gray-400 ml-2">Price: ₱{(parseFloat(product.price) || 0).toFixed(2)}</span>
                                        </div>
                                        <div className="text-right">
                                          {(() => {
                                            const cost = ingredientsList
                                              .filter(i => !i.size_id)
                                              .reduce((sum, i) => sum + ((parseFloat(i.quantity_required) || 0) * (parseFloat(i.cost_per_unit) || 0)), 0);
                                            const margin = (parseFloat(product.price) || 0) - cost;
                                            const marginPercent = (parseFloat(product.price) || 0) > 0 ? (margin / (parseFloat(product.price) || 0)) * 100 : 0;
                                            return (
                                              <>
                                                <span className="font-bold text-gray-800">Cost: ₱{cost.toFixed(2)}</span>
                                                <span className={`ml-3 font-bold ${marginPercent > 30 ? 'text-green-600' : 'text-orange-600'}`}>
                                                  Margin: {marginPercent.toFixed(1)}%
                                                </span>
                                              </>
                                            );
                                          })()}
                                        </div>
                                      </div>
                                    )}

                                    {/* Size variant prices */}
                                    {productSizes.map(size => {
                                      const sizeIngredients = ingredientsList.filter(i => i.size_id === size.id);
                                      if (sizeIngredients.length === 0) return null;
                                      const cost = sizeIngredients.reduce((sum, i) => sum + ((parseFloat(i.quantity_required) || 0) * (parseFloat(i.cost_per_unit) || 0)), 0);
                                      const margin = (parseFloat(size.price) || 0) - cost;
                                      const marginPercent = (parseFloat(size.price) || 0) > 0 ? (margin / (parseFloat(size.price) || 0)) * 100 : 0;
                                      return (
                                        <div key={size.id} className="flex justify-between items-center text-xs pb-1 border-b border-gray-50 last:border-0 hover:bg-cyan-50/30">
                                          <div>
                                            <span className="font-bold text-blue-700">{size.name} Variant</span>
                                            <span className="text-[10px] text-gray-400 ml-2">Price: ₱{(parseFloat(size.price) || 0).toFixed(2)}</span>
                                          </div>
                                          <div className="text-right">
                                            <span className="font-bold text-gray-800">Cost: ₱{cost.toFixed(2)}</span>
                                            <span className={`ml-3 font-bold ${marginPercent > 30 ? 'text-green-600' : 'text-orange-600'}`}>
                                              Margin: {marginPercent.toFixed(1)}%
                                            </span>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </>
                            )}
                            <button
                              onClick={() => {
                                setSelectedProductForRecipe(product);
                                setShowAddRecipeModal(true);
                              }}
                              className="px-2 py-1 text-xs bg-cyan-500 text-white hover:bg-cyan-600"
                            >
                              + Add Ingredient
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {currentView === 'inventory-reorder' && (
          <div className="bg-white border rounded shadow-sm overflow-hidden">
            <div className="p-4 bg-red-50 border-b border-red-100">
              <h3 className="text-sm font-black text-red-800 flex items-center gap-2 uppercase tracking-widest">
                📦 Low Stock Replenishment List
              </h3>
              <p className="text-[10px] text-red-600 mt-1 uppercase font-bold">
                Found {ingredients.filter(ing => (ing.current_stock || 0) <= (ing.reorder_level || 0)).length + products.filter(p => p.ingredient_count === 0 && (p.stock_quantity || 0) <= (p.low_stock_threshold || 10)).length} items below minimum safety levels.
              </p>
            </div>
            
            <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 250px)' }}>
              <table className="w-full text-xs font-data-table border-collapse">
                <thead className="bg-gray-50 border-b text-gray-400 uppercase text-[10px] font-black sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 text-left">ITEM NAME</th>
                    <th className="px-4 py-3 text-center w-24">CURRENT</th>
                    <th className="px-4 py-3 text-center w-24">REORDER AT</th>
                    <th className="px-4 py-3 text-center w-24 text-red-500">GAP</th>
                    <th className="px-4 py-3 text-center w-32">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {[
                    ...ingredients.map(ing => ({ ...ing, itemType: 'Raw Material', current: ing.current_stock, threshold: ing.reorder_level })),
                    ...products.filter(p => (p.ingredient_count || 0) === 0).map(p => ({ ...p, itemType: 'Retail Product', current: p.stock_quantity, threshold: p.low_stock_threshold || 10 }))
                  ]
                  .filter(item => (item.current || 0) <= (item.threshold || 0))
                  .sort((a,b) => (a.current / (a.threshold || 1)) - (b.current / (b.threshold || 1)))
                  .map(item => {
                    const gap = (item.threshold || 0) - (item.current || 0);
                    return (
                      <tr key={`${item.itemType}-${item.id}`} className="hover:bg-red-50/20 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-black text-gray-800">{item.name}</div>
                          <div className="text-[9px] uppercase font-bold text-gray-400">{item.itemType}</div>
                        </td>
                        <td className="px-4 py-3 text-center font-black text-red-600">
                          {parseFloat(item.current || 0).toFixed(2)} {item.unit || 'pc'}
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-gray-400">
                          {parseFloat(item.threshold || 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-center font-black bg-red-50 text-red-700">
                          +{parseFloat(gap + (item.threshold * 0.5)).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => {
                              setSelectedItemForAdjustment({ ...item, type: item.itemType === 'Retail Product' ? 'product' : 'ingredient' });
                              setShowAdjustmentModal(true);
                            }}
                            className="text-[9px] font-black uppercase px-3 py-1 bg-cyan-600 text-white rounded hover:bg-cyan-700 shadow-sm"
                          >
                            Restock Now
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {ingredients.filter(ing => ing.current_stock <= ing.reorder_level).length === 0 && products.filter(p => p.ingredient_count === 0 && p.stock_quantity <= p.low_stock_threshold).length === 0 && (
                <div className="py-20 text-center text-gray-400 font-medium italic">All inventory levels are above safety thresholds.</div>
              )}
            </div>
          </div>
        )}
        {currentView === 'inventory-expiring' && (
          <div className="bg-white border rounded shadow-sm overflow-hidden">
            <div className="p-4 bg-orange-50 border-b border-orange-100">
              <h3 className="text-sm font-bold text-orange-800 flex items-center gap-2 uppercase tracking-widest">
                ⚠️ Expiring Items Alert
              </h3>
              <p className="text-[10px] text-orange-600 mt-1">Found {ingredients.filter(ing => ing.last_expiry_date && new Date(ing.last_expiry_date) < new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)).length + products.filter(p => p.last_expiry_date && new Date(p.last_expiry_date) < new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)).length} items nearing or past expiry.</p>
            </div>
            
            <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 250px)' }}>
              <table className="w-full text-xs font-data-table border-collapse">
                <thead className="bg-gray-50 border-b text-gray-500 uppercase text-[10px] font-black sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 text-left w-12">TYPE</th>
                    <th className="px-4 py-3 text-left">ITEM NAME</th>
                    <th className="px-4 py-3 text-center w-32">EXPIRY DATE</th>
                    <th className="px-4 py-3 text-center w-28">DAYS REMAINING</th>
                    <th className="px-4 py-3 text-center w-24">STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {[
                    ...ingredients.map(ing => ({ ...ing, itemType: 'Raw Material' })),
                    ...products.map(p => ({ ...p, itemType: 'Retail Product' }))
                  ]
                  .filter(item => item.last_expiry_date && new Date(item.last_expiry_date) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000))
                  .sort((a,b) => new Date(a.last_expiry_date) - new Date(b.last_expiry_date))
                  .map(item => {
                    const days = Math.ceil((new Date(item.last_expiry_date) - new Date()) / (1000 * 60 * 60 * 24));
                    const isExpired = days <= 0;
                    const isSoon = days <= 7;
                    return (
                      <tr key={`${item.itemType}-${item.id}`} className={isExpired ? 'bg-red-50/30' : ''}>
                        <td className="px-4 py-3">
                          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border border-transparent ${item.itemType === 'Retail Product' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                            {item.itemType}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-bold text-gray-800">{item.name}</td>
                        <td className="px-4 py-3 text-center font-mono">
                          {new Date(item.last_expiry_date).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-center font-black">
                          {isExpired ? (
                            <span className="text-red-600">EXPIRED</span>
                          ) : (
                            <span className={isSoon ? 'text-orange-600' : 'text-gray-600'}>
                              {days} days
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {isExpired ? (
                            <div className="w-3 h-3 bg-red-600 rounded-full mx-auto animate-pulse" />
                          ) : isSoon ? (
                            <div className="w-3 h-3 bg-orange-500 rounded-full mx-auto" />
                          ) : (
                            <div className="w-3 h-3 bg-green-500 rounded-full mx-auto" />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {ingredients.filter(i => i.last_expiry_date).length === 0 && products.filter(p => p.last_expiry_date).length === 0 && (
                <div className="py-20 text-center text-gray-400 font-medium italic">All items are within shelf-life or have no expiry date set.</div>
              )}
            </div>
          </div>
        )}
        {currentView === 'inventory-status' && (
          <div className="bg-white border">
            <div className="p-4 border-b">
              <h3 className="text-sm font-medium text-gray-800">Inventory Status Summary</h3>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-blue-50 rounded p-3 border border-blue-200">
                  <p className="text-xs text-blue-600 font-medium">Total Items</p>
                  <p className="text-xl font-bold text-blue-700">{ingredients.length}</p>
                </div>
                <div className="bg-red-50 rounded p-3 border border-red-200">
                  <p className="text-xs text-red-600 font-medium">Low Stock</p>
                  <p className="text-xl font-bold text-red-700">{ingredients.filter(i => i.current_stock <= i.reorder_level).length}</p>
                </div>
                <div className="bg-green-50 rounded p-3 border border-cyan-200">
                  <p className="text-xs text-cyan-600 font-medium">Inventory Value</p>
                  <p className="text-lg font-bold text-cyan-700">
                    ₱{ingredients.reduce((sum, i) => sum + (i.current_stock * i.cost_per_unit), 0).toFixed(2)}
                  </p>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-gray-800 mb-2">Low Stock Alerts</h4>
                {ingredients.filter(i => i.current_stock <= i.reorder_level).length === 0 ? (
                  <p className="text-xs text-gray-500">All inventory levels are healthy</p>
                ) : (
                  <div className="space-y-1">
                    {ingredients.filter(i => i.current_stock <= i.reorder_level).map(ing => (
                      <div key={ing.id} className="bg-red-50 px-3 py-2 rounded border border-red-200 text-xs">
                        <p className="font-medium text-red-700">
                          {ing.name}: {parseFloat(ing.current_stock).toFixed(2)} {ing.unit} (need {parseFloat(ing.reorder_level).toFixed(2)})
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {currentView === 'inventory-suppliers' && (
          <div className="bg-white border p-4">
            <h3 className="text-sm font-medium text-gray-800 mb-2">Suppliers</h3>
            <p className="text-xs text-gray-500">Supplier management coming soon.</p>
          </div>
        )}

        {/* Add Ingredient Modal */}
        {showAddIngredientModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg w-96 p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Add New Ingredient</h2>

              {modalMessage.text && (
                <div className={`p-3 rounded-lg mb-4 text-sm font-medium ${modalMessage.type === 'success'
                  ? 'bg-green-50 text-cyan-700 border border-cyan-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
                  }`}>
                  {modalMessage.text}
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Ingredient Name *</label>
                  <input
                    type="text"
                    placeholder="e.g., Cassava, Rice, Chicken"
                    value={ingredientForm.name}
                    onChange={(e) => setIngredientForm({ ...ingredientForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Unit of Measure *</label>
                  <select
                    value={ingredientForm.unit}
                    onChange={(e) => setIngredientForm({ ...ingredientForm, unit: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-cyan-500"
                  >
                    <option value="">Select unit...</option>
                    <option value="kg">Kilogram (kg)</option>
                    <option value="g">Gram (g)</option>
                    <option value="l">Liter (l)</option>
                    <option value="ml">Milliliter (ml)</option>
                    <option value="pieces">Pieces</option>
                    <option value="boxes">Boxes</option>
                    <option value="bunches">Bunches</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Initial Stock</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={ingredientForm.current_stock}
                      onChange={(e) => setIngredientForm({ ...ingredientForm, current_stock: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Reorder Level</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={ingredientForm.reorder_level}
                      onChange={(e) => setIngredientForm({ ...ingredientForm, reorder_level: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Cost per Unit (₱)</label>
                  <input
                    type="number"
                    placeholder="0.00"
                    step="0.01"
                    value={ingredientForm.cost_per_unit}
                    onChange={(e) => setIngredientForm({ ...ingredientForm, cost_per_unit: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="flex gap-2 mt-6">
                <button
                  onClick={() => {
                    setShowAddIngredientModal(false);
                    setIngredientForm({ name: '', unit: '', current_stock: '', reorder_level: '', cost_per_unit: '' });
                    setModalMessage({ type: '', text: '' });
                  }}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (!ingredientForm.name || !ingredientForm.unit) {
                      setModalMessage({ type: 'error', text: '✗ Please fill in all required fields' });
                      return;
                    }
                    addIngredient(
                      ingredientForm.name,
                      ingredientForm.unit,
                      parseFloat(ingredientForm.current_stock) || 0,
                      parseFloat(ingredientForm.reorder_level) || 0,
                      parseFloat(ingredientForm.cost_per_unit) || 0
                    );
                  }}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-cyan-600 rounded-lg hover:bg-cyan-700"
                >
                  Add Ingredient
                </button>
              </div>
            </div>
          </div>
        )}

        {showEditIngredientModal && editingIngredient && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50" onClick={(e) => { if (e.target === e.currentTarget) { setShowEditIngredientModal(false); setEditingIngredient(null); } }}>
            <div className="bg-white rounded-lg shadow-lg w-96 p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Edit Ingredient</h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Ingredient Name *</label>
                  <input
                    type="text"
                    value={ingredientForm.name}
                    onChange={(e) => setIngredientForm({ ...ingredientForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Unit</label>
                    <input
                      type="text"
                      value={ingredientForm.unit}
                      onChange={(e) => setIngredientForm({ ...ingredientForm, unit: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Reorder Level</label>
                    <input
                      type="number"
                      value={ingredientForm.reorder_level}
                      onChange={(e) => setIngredientForm({ ...ingredientForm, reorder_level: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Cost per Unit (₱)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={ingredientForm.cost_per_unit}
                    onChange={(e) => setIngredientForm({ ...ingredientForm, cost_per_unit: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-6">
                <button
                  onClick={() => { setShowEditIngredientModal(false); setEditingIngredient(null); }}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    updateIngredient(editingIngredient.id, {
                      name: ingredientForm.name,
                      unit: ingredientForm.unit,
                      reorder_level: ingredientForm.reorder_level,
                      cost_per_unit: ingredientForm.cost_per_unit
                    });
                  }}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-cyan-600 rounded-lg hover:bg-cyan-700"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}

        {showAddPackagedModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50" onClick={(e) => { if (e.target === e.currentTarget) { setShowAddPackagedModal(false); setPackagedForm({ product_id: '', name: '', unit: 'pc', stock: '', reorder: '', cost: '', quantity_required: 1 }); } }}>
            <div className="bg-white rounded-lg shadow-lg w-96 p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Create Packaged Item</h2>
              <div className="space-y-3 text-sm">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Product</label>
                  <select
                    value={packagedForm.product_id}
                    onChange={(e) => setPackagedForm({ ...packagedForm, product_id: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  >
                    <option value="">Select product</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Ingredient Name</label>
                  <input
                    type="text"
                    value={packagedForm.name}
                    onChange={(e) => setPackagedForm({ ...packagedForm, name: e.target.value })}
                    placeholder="e.g., Coca-Cola 330ml (Bottle)"
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Unit</label>
                    <input
                      type="text"
                      value={packagedForm.unit}
                      onChange={(e) => setPackagedForm({ ...packagedForm, unit: e.target.value })}
                      className="w-full border border-gray-300 rounded px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Qty Required</label>
                    <input
                      type="number"
                      value={packagedForm.quantity_required}
                      onChange={(e) => setPackagedForm({ ...packagedForm, quantity_required: e.target.value })}
                      className="w-full border border-gray-300 rounded px-3 py-2"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Stock</label>
                    <input
                      type="number"
                      value={packagedForm.stock}
                      onChange={(e) => setPackagedForm({ ...packagedForm, stock: e.target.value })}
                      className="w-full border border-gray-300 rounded px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Reorder</label>
                    <input
                      type="number"
                      value={packagedForm.reorder}
                      onChange={(e) => setPackagedForm({ ...packagedForm, reorder: e.target.value })}
                      className="w-full border border-gray-300 rounded px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Cost/Unit</label>
                    <input
                      type="number"
                      value={packagedForm.cost}
                      onChange={(e) => setPackagedForm({ ...packagedForm, cost: e.target.value })}
                      className="w-full border border-gray-300 rounded px-3 py-2"
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => { setShowAddPackagedModal(false); setPackagedForm({ product_id: '', name: '', unit: 'pc', stock: '', reorder: '', cost: '', quantity_required: 1 }); }}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (!packagedForm.product_id || !packagedForm.name) {
                      alert('Please select product and enter ingredient name');
                      return;
                    }
                    createPackagedItem({
                      product_id: packagedForm.product_id,
                      name: packagedForm.name,
                      unit: packagedForm.unit || 'pc',
                      stock: parseFloat(packagedForm.stock) || 0,
                      reorder: parseFloat(packagedForm.reorder) || 0,
                      cost: parseFloat(packagedForm.cost) || 0,
                      quantity_required: parseFloat(packagedForm.quantity_required) || 1
                    });
                    setShowAddPackagedModal(false);
                    setPackagedForm({ product_id: '', name: '', unit: 'pc', stock: '', reorder: '', cost: '', quantity_required: 1 });
                  }}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Recipe Ingredient Modal */}
        {editingRecipeIngredient && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg w-96 p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Edit Recipe Ingredient</h2>
              <p className="text-sm text-gray-600 mb-4">Ingredient: <span className="font-semibold">{editingRecipeIngredient.ingredientName}</span></p>

              {editMessage.text && (
                <div className={`p-3 rounded-lg mb-4 text-sm font-medium ${editMessage.type === 'success'
                  ? 'bg-green-50 text-cyan-700 border border-cyan-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
                  }`}>
                  {editMessage.text}
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Quantity Required *</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="e.g., 0.5, 2, 100"
                      step="0.01"
                      value={editQuantity}
                      onChange={(e) => setEditQuantity(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-cyan-500"
                    />
                    <span className="px-3 py-2 bg-gray-100 rounded-lg text-sm text-gray-600 font-medium">
                      {editingRecipeIngredient.unit}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 mt-6">
                <button
                  onClick={() => {
                    setEditingRecipeIngredient(null);
                    setEditQuantity('');
                    setEditMessage({ type: '', text: '' });
                  }}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (!editQuantity) {
                      setEditMessage({ type: 'error', text: '✗ Please enter a quantity' });
                      return;
                    }
                    updateRecipeIngredient(
                      editingRecipeIngredient.productId,
                      editingRecipeIngredient.ingredientId,
                      editQuantity,
                      editingRecipeIngredient.size_id
                    );
                  }}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-cyan-600 rounded-lg hover:bg-cyan-700"
                >
                  Update
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Recipe Ingredient Modal */}
        {showAddRecipeModal && selectedProductForRecipe && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg w-96 p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-2">Add Ingredient to Recipe</h2>
              <p className="text-sm text-gray-600 mb-4">Product: <span className="font-semibold">{selectedProductForRecipe.name}</span></p>

              {recipeMessage.text && (
                <div className={`p-3 rounded-lg mb-4 text-sm font-medium ${recipeMessage.type === 'success'
                  ? 'bg-green-50 text-cyan-700 border border-cyan-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
                  }`}>
                  {recipeMessage.text}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Apply to Specific Size (Optional)</label>
                  <select
                    value={recipeForm.size_id}
                    onChange={(e) => setRecipeForm({ ...recipeForm, size_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-cyan-500 bg-blue-50/30"
                  >
                    <option value="">Standard (Apply to All Sizes)</option>
                    {productSizes.map(size => (
                      <option key={size.id} value={size.id}>
                        {size.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-cyan-600 mt-1 italic">Selecting a size allows variant-specific stock deduction (e.g., Small vs Large).</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Select Physical Ingredient *</label>
                  <select
                    value={recipeForm.ingredientId}
                    onChange={(e) => setRecipeForm({ ...recipeForm, ingredientId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-cyan-500"
                  >
                    <option value="">Choose an ingredient...</option>
                    {ingredients.map(ing => (
                      <option key={ing.id} value={ing.id}>
                        {ing.name} (Stock: {ing.current_stock} {ing.unit})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Deduction Quantity *</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="e.g., 1, 0.5"
                      step="0.01"
                      value={recipeForm.quantity_required}
                      onChange={(e) => setRecipeForm({ ...recipeForm, quantity_required: e.target.value })}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-cyan-500"
                    />
                    {recipeForm.ingredientId && ingredients.find(i => i.id === parseInt(recipeForm.ingredientId)) && (
                      <span className="px-3 py-2 bg-gray-100 rounded-lg text-sm text-gray-600 font-bold">
                        {ingredients.find(i => i.id === parseInt(recipeForm.ingredientId))?.unit}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-2 mt-8">
                <button
                  onClick={() => {
                    setShowAddRecipeModal(false);
                    setSelectedProductForRecipe(null);
                    setRecipeForm({ ingredientId: '', quantity_required: '', size_id: '' });
                    setRecipeMessage({ type: '', text: '' });
                  }}
                  className="flex-1 px-4 py-2.5 text-xs font-black uppercase tracking-widest text-gray-500 bg-gray-100 rounded-xl hover:bg-gray-200 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (!recipeForm.ingredientId || !recipeForm.quantity_required) {
                      setRecipeMessage({ type: 'error', text: '✗ Please fill in all required fields' });
                      return;
                    }
                    addRecipeIngredient(
                      selectedProductForRecipe.id,
                      parseInt(recipeForm.ingredientId),
                      recipeForm.quantity_required,
                      recipeForm.size_id ? parseInt(recipeForm.size_id) : null
                    );
                  }}
                  className="flex-1 px-4 py-2.5 text-xs font-black uppercase tracking-widest text-white bg-cyan-600 rounded-xl hover:shadow-lg hover:shadow-cyan-200 transition-all shadow-sm"
                >
                  Confirm Link
                </button>
              </div>
            </div>
          </div>
        )}
        {showAdjustmentModal && selectedItemForAdjustment && (
          <StockAdjustmentModal
            item={selectedItemForAdjustment}
            API_URL={API_URL}
            onRefresh={() => {
              fetchIngredients();
              refreshProducts();
            }}
            onClose={() => {
              setShowAdjustmentModal(false);
              setSelectedItemForAdjustment(null);
            }}
          />
        )}
      </div>
    </div>
  );
}

// Staff Page
function StaffPage({ currentView, setCurrentPage }) {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ username: '', password: '', name: '', role: 'cashier' });
  const [formError, setFormError] = useState('');

  // Permissions related state
  const [selectedEmpForPerms, setSelectedEmpForPerms] = useState(null);
  const [empPermissions, setEmpPermissions] = useState([]);
  const [permSaving, setPermSaving] = useState(false);
  const [permMsg, setPermMsg] = useState({ type: '', text: '' });
  const [schedules, setSchedules] = useState([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleError, setScheduleError] = useState('');
  const [scheduleForm, setScheduleForm] = useState({
    employee_id: '',
    shift_date: '',
    start_time: '09:00',
    end_time: '18:00',
    break_minutes: 60,
    status: 'published',
    notes: ''
  });
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [timesheetRows, setTimesheetRows] = useState([]);
  const [timesheetLoading, setTimesheetLoading] = useState(false);
  const todayIso = toLocalDateInputValue(new Date());
  const [timesheetRange, setTimesheetRange] = useState({
    start_date: toLocalDateInputValue(new Date(Date.now() - (6 * 24 * 60 * 60 * 1000))),
    end_date: todayIso
  });
  const [scheduleTemplates, setScheduleTemplates] = useState([]);
  const [templateForm, setTemplateForm] = useState({
    employee_id: '',
    day_of_week: 1,
    start_time: '09:00',
    end_time: '18:00',
    break_minutes: 60,
    notes: ''
  });
  const [templateSaving, setTemplateSaving] = useState(false);
  const [scheduleMetrics, setScheduleMetrics] = useState({
    summary: { shifts_count: 0, total_hours: 0, avg_hours_per_shift: 0 },
    by_day: [],
    by_employee: []
  });
  const [scheduleActionsLoading, setScheduleActionsLoading] = useState(false);

  const views = [
    { id: 'staff-employees', name: 'Employees' },
    { id: 'staff-schedules', name: 'Schedules' },
    { id: 'staff-timesheet', name: 'Time Tracking' },
    { id: 'staff-permissions', name: 'Permissions' },
  ];

  const dayOptions = [
    { value: 0, label: 'Sunday' },
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' },
  ];

  const getMondayDate = (dateString) => {
    const date = new Date(`${dateString}T00:00:00`);
    const day = date.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    date.setDate(date.getDate() + diff);
    return toLocalDateInputValue(date);
  };

  const allPossiblePermissions = [
    { id: 'pos', label: 'Terminal / Checkout', group: 'Operations' },
    { id: 'dashboard', label: 'Sales Analytics', group: 'Management' },
    { id: 'kitchen', label: 'Kitchen Display (KDS)', group: 'Operations' },
    { id: 'orders', label: 'Order Management', group: 'Operations' },
    { id: 'products', label: 'Product Matrix', group: 'Management' },
    { id: 'inventory', label: 'Inventory Control', group: 'Management' },
    { id: 'reports', label: 'Detailed Reports', group: 'Management' },
    { id: 'customers', label: 'Customer Directory', group: 'CRM' },
    { id: 'staff-employees', label: 'Staff Management', group: 'Admin' },
    { id: 'settings-general', label: 'System Configuration', group: 'Admin' },
  ];

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (currentView === 'staff-schedules') {
      refreshScheduleWorkspace();
    } else if (currentView === 'staff-timesheet') {
      fetchTimesheet();
    }
  }, [currentView]);

  useEffect(() => {
    if (selectedEmpForPerms) {
      setEmpPermissions(selectedEmpForPerms.permissions || []);
    } else {
      setEmpPermissions([]);
    }
  }, [selectedEmpForPerms]);

  useEffect(() => {
    if (!scheduleForm.employee_id && employees.length > 0) {
      setScheduleForm(prev => ({ ...prev, employee_id: String(employees[0].id) }));
    }
  }, [employees, scheduleForm.employee_id]);

  useEffect(() => {
    if (!templateForm.employee_id && employees.length > 0) {
      setTemplateForm(prev => ({ ...prev, employee_id: String(employees[0].id) }));
    }
  }, [employees, templateForm.employee_id]);

  const fetchEmployees = async () => {
    try {
      const response = await fetchWithAuth(`${API_URL}/auth/employees`);
      const data = await response.json();
      if (data.success) {
        setEmployees(data.employees);
        if (selectedEmpForPerms) {
          const updated = data.employees.find(e => e.id === selectedEmpForPerms.id);
          if (updated) setSelectedEmpForPerms(updated);
        }
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSchedules = async () => {
    setScheduleLoading(true);
    setScheduleError('');
    try {
      const params = new URLSearchParams({
        start_date: timesheetRange.start_date,
        end_date: timesheetRange.end_date
      });
      const response = await fetchWithAuth(`${API_URL}/schedules?${params.toString()}`);
      const data = await response.json();
      if (data.success) {
        setSchedules(data.schedules || []);
      } else {
        setScheduleError(data.error || 'Failed to load schedules');
      }
    } catch (error) {
      console.error('Error loading schedules:', error);
      setScheduleError('Failed to load schedules');
    } finally {
      setScheduleLoading(false);
    }
  };

  const fetchScheduleTemplates = async () => {
    try {
      const response = await fetchWithAuth(`${API_URL}/schedules/templates`);
      const data = await response.json();
      if (data.success) {
        setScheduleTemplates(data.templates || []);
      }
    } catch (error) {
      console.error('Error loading schedule templates:', error);
    }
  };

  const fetchScheduleMetrics = async () => {
    try {
      const params = new URLSearchParams({
        start_date: timesheetRange.start_date,
        end_date: timesheetRange.end_date
      });
      const response = await fetchWithAuth(`${API_URL}/schedules/metrics?${params.toString()}`);
      const data = await response.json();
      if (data.success) {
        setScheduleMetrics(data.metrics || {
          summary: { shifts_count: 0, total_hours: 0, avg_hours_per_shift: 0 },
          by_day: [],
          by_employee: []
        });
      }
    } catch (error) {
      console.error('Error loading schedule metrics:', error);
    }
  };

  const refreshScheduleWorkspace = async () => {
    await Promise.all([
      fetchSchedules(),
      fetchScheduleTemplates(),
      fetchScheduleMetrics()
    ]);
  };

  const fetchTimesheet = async () => {
    setTimesheetLoading(true);
    try {
      const params = new URLSearchParams({
        start_date: timesheetRange.start_date,
        end_date: timesheetRange.end_date,
        limit: '200'
      });
      const response = await fetchWithAuth(`${API_URL}/shifts?${params.toString()}`);
      const data = await response.json();
      if (data.success) {
        setTimesheetRows(data?.data?.shifts || []);
      } else {
        setTimesheetRows([]);
      }
    } catch (error) {
      console.error('Error loading timesheet:', error);
      setTimesheetRows([]);
    } finally {
      setTimesheetLoading(false);
    }
  };

  const handleCreateSchedule = async (e) => {
    e.preventDefault();
    setScheduleSaving(true);
    setScheduleError('');
    try {
      const response = await fetchWithAuth(`${API_URL}/schedules`, {
        method: 'POST',
        body: JSON.stringify({
          ...scheduleForm,
          employee_id: Number(scheduleForm.employee_id),
          break_minutes: Number(scheduleForm.break_minutes) || 0
        })
      });
      const data = await response.json();
      if (!data.success) {
        setScheduleError(data.error || 'Failed to create schedule');
        return;
      }
      setScheduleForm(prev => ({ ...prev, notes: '' }));
      await refreshScheduleWorkspace();
    } catch (error) {
      console.error('Error creating schedule:', error);
      setScheduleError('Failed to create schedule');
    } finally {
      setScheduleSaving(false);
    }
  };

  const handleCancelSchedule = async (id) => {
    try {
      const response = await fetchWithAuth(`${API_URL}/schedules/${id}`, { method: 'DELETE' });
      const data = await response.json();
      if (!data.success) {
        setScheduleError(data.error || 'Failed to cancel schedule');
        return;
      }
      refreshScheduleWorkspace();
    } catch (error) {
      console.error('Error cancelling schedule:', error);
      setScheduleError('Failed to cancel schedule');
    }
  };

  const handleCreateTemplate = async (e) => {
    e.preventDefault();
    setTemplateSaving(true);
    setScheduleError('');
    try {
      const response = await fetchWithAuth(`${API_URL}/schedules/templates`, {
        method: 'POST',
        body: JSON.stringify({
          ...templateForm,
          employee_id: Number(templateForm.employee_id),
          day_of_week: Number(templateForm.day_of_week),
          break_minutes: Number(templateForm.break_minutes) || 0
        })
      });
      const data = await response.json();
      if (!data.success) {
        setScheduleError(data.error || 'Failed to save template');
        return;
      }
      setTemplateForm(prev => ({ ...prev, notes: '' }));
      await fetchScheduleTemplates();
    } catch (error) {
      console.error('Error creating schedule template:', error);
      setScheduleError('Failed to save template');
    } finally {
      setTemplateSaving(false);
    }
  };

  const handleDeleteTemplate = async (id) => {
    try {
      const response = await fetchWithAuth(`${API_URL}/schedules/templates/${id}`, { method: 'DELETE' });
      const data = await response.json();
      if (!data.success) {
        setScheduleError(data.error || 'Failed to delete template');
        return;
      }
      fetchScheduleTemplates();
    } catch (error) {
      console.error('Error deleting schedule template:', error);
      setScheduleError('Failed to delete template');
    }
  };

  const handleApplyTemplates = async () => {
    setScheduleActionsLoading(true);
    setScheduleError('');
    try {
      const week_start = getMondayDate(timesheetRange.start_date);
      const response = await fetchWithAuth(`${API_URL}/schedules/templates/apply`, {
        method: 'POST',
        body: JSON.stringify({ week_start, status: 'scheduled' })
      });
      const data = await response.json();
      if (!data.success) {
        setScheduleError(data.error || 'Failed to apply templates');
        return;
      }
      await refreshScheduleWorkspace();
    } catch (error) {
      console.error('Error applying templates:', error);
      setScheduleError('Failed to apply templates');
    } finally {
      setScheduleActionsLoading(false);
    }
  };

  const handlePublishWeek = async () => {
    setScheduleActionsLoading(true);
    setScheduleError('');
    try {
      const week_start = getMondayDate(timesheetRange.start_date);
      const response = await fetchWithAuth(`${API_URL}/schedules/publish-week`, {
        method: 'POST',
        body: JSON.stringify({ week_start })
      });
      const data = await response.json();
      if (!data.success) {
        setScheduleError(data.error || 'Failed to publish this week');
        return;
      }
      await refreshScheduleWorkspace();
    } catch (error) {
      console.error('Error publishing week:', error);
      setScheduleError('Failed to publish this week');
    } finally {
      setScheduleActionsLoading(false);
    }
  };

  const handleSavePermissions = async () => {
    if (!selectedEmpForPerms) return;
    setPermSaving(true);
    setPermMsg({ type: '', text: '' });
    try {
      const res = await fetchWithAuth(`${API_URL}/auth/employees/${selectedEmpForPerms.id}/permissions`, {
        method: 'PUT',
        body: JSON.stringify({ permissions: empPermissions })
      });
      const data = await res.json();
      if (data.success) {
        setPermMsg({ type: 'success', text: '✓ Permissions updated successfully!' });
        fetchEmployees();
      } else {
        setPermMsg({ type: 'error', text: '✗ ' + (data.error || 'Failed to save.') });
      }
    } catch (e) {
      setPermMsg({ type: 'error', text: '✗ Connection error.' });
    } finally {
      setPermSaving(false);
      setTimeout(() => setPermMsg({ type: '', text: '' }), 5000);
    }
  };

  const togglePermission = (id) => {
    setEmpPermissions(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    try {
      const response = await fetchWithAuth(`${API_URL}/auth/employees`, {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      const data = await response.json();
      if (data.success) {
        fetchEmployees();
        setShowModal(false);
        setFormData({ username: '', password: '', name: '', role: 'cashier' });
        setFormError('');
      } else {
        setFormError(data.error || 'Failed to create employee');
      }
    } catch (error) {
      setFormError('Network error. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 pt-0">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Staff Management</h1>
          <button
            onClick={() => setShowModal(true)}
            className="bg-cyan-600 text-white px-4 py-2 rounded-lg hover:bg-cyan-700 font-medium shadow-sm transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Employee
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1 scrollbar-hide">
          {views.map(view => (
            <button
              key={view.id}
              onClick={() => setCurrentPage(view.id)}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all whitespace-nowrap ${currentView === view.id ? 'bg-cyan-600 text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-50 border border-transparent hover:border-gray-200'
                }`}
            >
              {view.name}
            </button>
          ))}
        </div>

        {currentView === 'staff-employees' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full font-data-table">
              <thead className="bg-gray-50/80">
                <tr>
                  <th className="text-left px-6 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Name / ID</th>
                  <th className="text-left px-6 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Username</th>
                  <th className="text-left px-6 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Role</th>
                  <th className="text-center px-6 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="text-center px-6 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {employees.map(emp => (
                  <tr key={emp.id} className="hover:bg-cyan-50/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-800">{emp.name}</div>
                      <div className="text-[10px] text-gray-400 font-mono">ID: #{emp.id}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 font-medium">{emp.username}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tight ${emp.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                        emp.role === 'manager' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>{emp.role}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${emp.active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                        }`}>
                        <div className={`w-1 h-1 rounded-full ${emp.active ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        {emp.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button className="text-cyan-600 hover:text-cyan-700 text-xs font-bold uppercase tracking-wider hover:underline" onClick={() => {
                        setSelectedEmpForPerms(emp);
                        setCurrentPage('staff-permissions');
                      }}>Permissions</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {currentView === 'staff-permissions' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Employee Selector */}
            <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <h3 className="font-black text-xs text-gray-400 uppercase tracking-widest mb-4">Select Team Member</h3>
              <div className="space-y-1">
                {employees.map(emp => (
                  <button
                    key={emp.id}
                    onClick={() => setSelectedEmpForPerms(emp)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg transition-all group ${selectedEmpForPerms?.id === emp.id ? 'bg-cyan-600 text-white shadow-md' : 'hover:bg-gray-50 text-gray-700'}`}
                  >
                    <div className="font-bold text-sm leading-tight">{emp.name}</div>
                    <div className={`text-[10px] font-medium uppercase tracking-tighter ${selectedEmpForPerms?.id === emp.id ? 'text-cyan-100' : 'text-gray-400 group-hover:text-cyan-600'}`}>{emp.role}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Permission Matrix */}
            <div className="lg:col-span-3 space-y-6">
              {selectedEmpForPerms ? (
                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                  <div className="bg-cyan-600 px-6 py-4 flex items-center justify-between">
                    <div>
                      <h2 className="text-white font-black text-lg">Functional Capabilities</h2>
                      <p className="text-cyan-100 text-xs font-medium">Managing access for <span className="underline decoration-white/30">{selectedEmpForPerms.name}</span></p>
                    </div>
                    {permMsg.text && (
                      <span className={`px-4 py-1.5 rounded-full text-xs font-bold animate-pulse ${permMsg.type === 'success' ? 'bg-white text-emerald-600' : 'bg-red-500 text-white'}`}>
                        {permMsg.text}
                      </span>
                    )}
                  </div>

                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                      {['Operations', 'Management', 'CRM', 'Admin'].map(group => (
                        <div key={group} className="space-y-3">
                          <h4 className="font-black text-[10px] text-gray-400 uppercase tracking-[0.2em] border-b border-gray-100 pb-1">{group} Module</h4>
                          <div className="space-y-2">
                            {allPossiblePermissions.filter(p => p.group === group).map(perm => {
                              const isChecked = empPermissions.includes(perm.id);
                              return (
                                <div
                                  key={perm.id}
                                  onClick={() => togglePermission(perm.id)}
                                  className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer group ${isChecked ? 'bg-cyan-50 border-cyan-100 shadow-sm' : 'border-gray-50 hover:border-gray-200'}`}
                                >
                                  <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${isChecked ? 'bg-cyan-600 text-white' : 'bg-gray-100 text-gray-400 group-hover:text-cyan-600 group-hover:bg-cyan-50'}`}>
                                      {isChecked ? <Check className="w-4 h-4" /> : <div className="w-1.5 h-1.5 rounded-full bg-current" />}
                                    </div>
                                    <span className={`font-bold text-sm ${isChecked ? 'text-cyan-900' : 'text-gray-600'}`}>{perm.label}</span>
                                  </div>
                                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${isChecked ? 'bg-cyan-600 border-cyan-600' : 'border-gray-200 group-hover:border-cyan-300'}`}>
                                    {isChecked && <Check className="w-3 h-3 text-white" />}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-10 pt-6 border-t border-gray-100 flex items-center justify-end gap-3">
                      <p className="text-xs text-gray-400 font-medium italic mr-auto max-w-sm">
                        * Note: Disabling permissions for an active user will take effect on their next dashboard refresh.
                      </p>
                      <button
                        onClick={() => setSelectedEmpForPerms(null)}
                        className="px-6 py-2.5 rounded-xl font-bold text-xs text-gray-500 hover:bg-gray-50 uppercase tracking-widest"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSavePermissions}
                        disabled={permSaving}
                        className="px-8 py-2.5 rounded-xl bg-cyan-600 text-white font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-cyan-100 hover:shadow-cyan-200 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:translate-y-0"
                      >
                        {permSaving ? 'Saving...' : 'Apply Changes'}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-dashed border-gray-300 p-20 flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                    <Shield className="w-8 h-8 text-gray-300" />
                  </div>
                  <h3 className="font-black text-gray-800 text-lg mb-2">Access Control Center</h3>
                  <p className="text-gray-400 text-sm max-w-xs leading-relaxed">Select a member from the left panel to modify their functional access permissions across the platform.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {currentView === 'staff-schedules' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl border border-gray-100 p-4">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Scheduled Shifts</p>
                <p className="text-2xl font-black text-gray-900 mt-1">{Number(scheduleMetrics?.summary?.shifts_count || 0)}</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 p-4">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Labor Hours</p>
                <p className="text-2xl font-black text-cyan-700 mt-1">{Number(scheduleMetrics?.summary?.total_hours || 0).toFixed(2)}h</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 p-4">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Avg Hours / Shift</p>
                <p className="text-2xl font-black text-gray-900 mt-1">{Number(scheduleMetrics?.summary?.avg_hours_per_shift || 0).toFixed(2)}h</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 p-4">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Top Scheduled Staff</p>
                <p className="text-base font-bold text-gray-800 mt-2 truncate">{scheduleMetrics?.by_employee?.[0]?.employee_name || '-'}</p>
                <p className="text-xs text-gray-500">{Number(scheduleMetrics?.by_employee?.[0]?.total_hours || 0).toFixed(2)}h</p>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className="xl:col-span-1 space-y-6">
                <div className="bg-white rounded-xl border border-gray-100 p-5">
                  <h3 className="text-sm font-black text-gray-700 uppercase tracking-wider mb-4">Assign Shift</h3>
                  <form onSubmit={handleCreateSchedule} className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Employee</label>
                      <select
                        required
                        value={scheduleForm.employee_id}
                        onChange={(e) => setScheduleForm(prev => ({ ...prev, employee_id: e.target.value }))}
                        className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-sm"
                      >
                        <option value="" disabled>Select employee</option>
                        {employees.map(emp => (
                          <option key={emp.id} value={emp.id}>{emp.name} ({emp.role})</option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Date</label>
                        <input
                          type="date"
                          required
                          value={scheduleForm.shift_date}
                          onChange={(e) => setScheduleForm(prev => ({ ...prev, shift_date: e.target.value }))}
                          className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Break (min)</label>
                        <input
                          type="number"
                          min="0"
                          value={scheduleForm.break_minutes}
                          onChange={(e) => setScheduleForm(prev => ({ ...prev, break_minutes: e.target.value }))}
                          className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-sm"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Start</label>
                        <input
                          type="time"
                          required
                          value={scheduleForm.start_time}
                          onChange={(e) => setScheduleForm(prev => ({ ...prev, start_time: e.target.value }))}
                          className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">End</label>
                        <input
                          type="time"
                          required
                          value={scheduleForm.end_time}
                          onChange={(e) => setScheduleForm(prev => ({ ...prev, end_time: e.target.value }))}
                          className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Status</label>
                      <select
                        value={scheduleForm.status}
                        onChange={(e) => setScheduleForm(prev => ({ ...prev, status: e.target.value }))}
                        className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-sm"
                      >
                        <option value="published">Published</option>
                        <option value="scheduled">Draft</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Notes</label>
                      <textarea
                        rows={2}
                        value={scheduleForm.notes}
                        onChange={(e) => setScheduleForm(prev => ({ ...prev, notes: e.target.value }))}
                        className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-sm resize-none"
                        placeholder="Optional notes"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={scheduleSaving}
                      className="w-full py-2.5 rounded-lg bg-cyan-600 text-white text-sm font-bold disabled:opacity-50"
                    >
                      {scheduleSaving ? 'Saving...' : 'Save Schedule'}
                    </button>
                  </form>
                </div>

                <div className="bg-white rounded-xl border border-gray-100 p-5">
                  <h3 className="text-sm font-black text-gray-700 uppercase tracking-wider mb-4">Weekly Template</h3>
                  <form onSubmit={handleCreateTemplate} className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Employee</label>
                      <select
                        required
                        value={templateForm.employee_id}
                        onChange={(e) => setTemplateForm(prev => ({ ...prev, employee_id: e.target.value }))}
                        className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-sm"
                      >
                        <option value="" disabled>Select employee</option>
                        {employees.map(emp => (
                          <option key={emp.id} value={emp.id}>{emp.name} ({emp.role})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Day</label>
                      <select
                        value={templateForm.day_of_week}
                        onChange={(e) => setTemplateForm(prev => ({ ...prev, day_of_week: e.target.value }))}
                        className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-sm"
                      >
                        {dayOptions.map(d => (
                          <option key={d.value} value={d.value}>{d.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="time"
                        value={templateForm.start_time}
                        onChange={(e) => setTemplateForm(prev => ({ ...prev, start_time: e.target.value }))}
                        className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-sm"
                      />
                      <input
                        type="time"
                        value={templateForm.end_time}
                        onChange={(e) => setTemplateForm(prev => ({ ...prev, end_time: e.target.value }))}
                        className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-sm"
                      />
                    </div>
                    <input
                      type="number"
                      min="0"
                      value={templateForm.break_minutes}
                      onChange={(e) => setTemplateForm(prev => ({ ...prev, break_minutes: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-sm"
                      placeholder="Break minutes"
                    />
                    <button
                      type="submit"
                      disabled={templateSaving}
                      className="w-full py-2.5 rounded-lg bg-gray-900 text-white text-sm font-bold disabled:opacity-50"
                    >
                      {templateSaving ? 'Saving...' : 'Save Template'}
                    </button>
                  </form>

                  <div className="mt-4 border-t border-gray-100 pt-3 space-y-2 max-h-44 overflow-auto">
                    {scheduleTemplates.length === 0 ? (
                      <p className="text-xs text-gray-500">No templates yet.</p>
                    ) : scheduleTemplates.map(t => (
                      <div key={t.id} className="text-xs border border-gray-200 rounded-lg p-2 flex items-center justify-between gap-2">
                        <div>
                          <p className="font-bold text-gray-700">{t.employee_name} · {dayOptions.find(d => d.value === Number(t.day_of_week))?.label}</p>
                          <p className="text-gray-500">{String(t.start_time).slice(0, 5)} - {String(t.end_time).slice(0, 5)} ({Number(t.break_minutes || 0)}m)</p>
                        </div>
                        <button onClick={() => handleDeleteTemplate(t.id)} className="text-red-600 font-bold">Delete</button>
                      </div>
                    ))}
                  </div>
                </div>

                {scheduleError && <p className="text-xs font-semibold text-red-600">{scheduleError}</p>}
              </div>

              <div className="xl:col-span-2 bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex flex-wrap gap-2 items-end">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">From</label>
                    <input
                      type="date"
                      value={timesheetRange.start_date}
                      onChange={(e) => setTimesheetRange(prev => ({ ...prev, start_date: e.target.value }))}
                      className="px-3 py-2 rounded-lg border border-gray-200 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">To</label>
                    <input
                      type="date"
                      value={timesheetRange.end_date}
                      onChange={(e) => setTimesheetRange(prev => ({ ...prev, end_date: e.target.value }))}
                      className="px-3 py-2 rounded-lg border border-gray-200 text-sm"
                    />
                  </div>
                  <button
                    onClick={refreshScheduleWorkspace}
                    className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm font-bold hover:bg-gray-200"
                  >
                    Refresh
                  </button>
                  <button
                    onClick={handleApplyTemplates}
                    disabled={scheduleActionsLoading}
                    className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-bold disabled:opacity-50"
                  >
                    Apply Templates To Week
                  </button>
                  <button
                    onClick={handlePublishWeek}
                    disabled={scheduleActionsLoading}
                    className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-bold disabled:opacity-50"
                  >
                    Publish Week
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full font-data-table">
                    <thead className="bg-gray-50/80">
                      <tr>
                        <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 uppercase">Date</th>
                        <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 uppercase">Employee</th>
                        <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 uppercase">Shift</th>
                        <th className="text-right px-4 py-3 text-[11px] font-bold text-gray-400 uppercase">Hours</th>
                        <th className="text-center px-4 py-3 text-[11px] font-bold text-gray-400 uppercase">Status</th>
                        <th className="text-center px-4 py-3 text-[11px] font-bold text-gray-400 uppercase">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {scheduleLoading ? (
                        <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">Loading schedules...</td></tr>
                      ) : schedules.length === 0 ? (
                        <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">No schedules found in selected range.</td></tr>
                      ) : schedules.map(row => (
                        <tr key={row.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-700">{new Date(`${row.shift_date}T00:00:00`).toLocaleDateString()}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-gray-800">{row.employee_name}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{String(row.start_time).slice(0, 5)} - {String(row.end_time).slice(0, 5)}</td>
                          <td className="px-4 py-3 text-sm text-right text-gray-700">{Number(row.scheduled_hours || 0).toFixed(2)}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${row.status === 'published' ? 'bg-emerald-100 text-emerald-700' : row.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                              {row.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {row.status !== 'cancelled' ? (
                              <button
                                onClick={() => handleCancelSchedule(row.id)}
                                className="text-xs font-bold text-red-600 hover:underline"
                              >
                                Cancel
                              </button>
                            ) : (
                              <span className="text-xs text-gray-400">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {currentView === 'staff-timesheet' && (
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex flex-wrap items-end gap-2">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">From</label>
                <input
                  type="date"
                  value={timesheetRange.start_date}
                  onChange={(e) => setTimesheetRange(prev => ({ ...prev, start_date: e.target.value }))}
                  className="px-3 py-2 rounded-lg border border-gray-200 text-sm"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">To</label>
                <input
                  type="date"
                  value={timesheetRange.end_date}
                  onChange={(e) => setTimesheetRange(prev => ({ ...prev, end_date: e.target.value }))}
                  className="px-3 py-2 rounded-lg border border-gray-200 text-sm"
                />
              </div>
              <button onClick={fetchTimesheet} className="px-4 py-2 rounded-lg bg-gray-100 text-sm font-bold text-gray-700 hover:bg-gray-200">Refresh</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full font-data-table">
                <thead className="bg-gray-50/80">
                  <tr>
                    <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 uppercase">Employee</th>
                    <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 uppercase">Start</th>
                    <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 uppercase">End</th>
                    <th className="text-right px-4 py-3 text-[11px] font-bold text-gray-400 uppercase">Orders</th>
                    <th className="text-right px-4 py-3 text-[11px] font-bold text-gray-400 uppercase">Sales</th>
                    <th className="text-center px-4 py-3 text-[11px] font-bold text-gray-400 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {timesheetLoading ? (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">Loading time tracking...</td></tr>
                  ) : timesheetRows.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">No shift records in selected range.</td></tr>
                  ) : timesheetRows.map(row => (
                    <tr key={row.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-semibold text-gray-800">{row.employee_name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{new Date(row.start_time).toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{row.end_time ? new Date(row.end_time).toLocaleString() : '-'}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-700">{row.order_count || 0}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-700">Php {Number(row.total_sales || 0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${row.status === 'active' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Add Employee Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-cyan-600" />
              <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
              <h2 className="text-xl font-black text-gray-800 mb-1">New Team Member</h2>
              <p className="text-gray-400 text-xs font-medium mb-6 uppercase tracking-wider">Registration Profile</p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Full Name</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:bg-white transition-all font-medium text-sm"
                      placeholder="e.g. John Doe"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Username</label>
                    <input
                      type="text"
                      required
                      value={formData.username}
                      onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:bg-white transition-all font-medium text-sm text-gray-600"
                      placeholder="johndoe"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Login PIN</label>
                    <input
                      type="text"
                      required
                      maxLength={4}
                      value={formData.PIN || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, PIN: e.target.value }))}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:bg-white transition-all font-medium text-sm tracking-[.5em]"
                      placeholder="0000"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Role Grade</label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:bg-white transition-all font-bold text-sm text-gray-700"
                    >
                      <option value="waiter">WAITER (L1)</option>
                      <option value="cashier">CASHIER (L2)</option>
                      <option value="manager">MANAGER (L3)</option>
                      <option value="admin">ADMINISTRATOR (ROOT)</option>
                    </select>
                  </div>
                </div>

                {formError && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl">
                    <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                    <p className="text-red-600 text-[11px] font-bold">{formError}</p>
                  </div>
                )}

                <div className="flex gap-3 pt-6">
                  <button
                    type="button"
                    onClick={() => { setShowModal(false); setFormError(''); }}
                    className="flex-1 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-3 bg-cyan-600 text-white rounded-xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-cyan-100 hover:shadow-cyan-200 hover:-translate-y-0.5 transition-all"
                  >
                    Create Account
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Settings Page
function SettingsPage({ currentView, setCurrentPage, fetchProducts, employee, sysConfig, setSysConfig }) {
  const views = [
    { id: 'settings-general', name: 'System Config' },
    { id: 'settings-payment', name: 'Payment Setup' },
    { id: 'settings-tables', name: 'Tables' },
    { id: 'settings-practice', name: 'Practice & Reset' },
    { id: 'settings-printers', name: 'Printers' },
    { id: 'settings-loyalty', name: 'Loyalty Program' },
    { id: 'settings-integrations', name: 'Integrations' },
  ];

  const API_URL = import.meta.env.VITE_API_URL || (window.location.origin.includes('localhost') ? 'http://localhost:5000/api' : '/api');

  const [configSaving, setConfigSaving] = useState(false);
  const [configMsg, setConfigMsg] = useState('');
  const [testEmailSending, setTestEmailSending] = useState(false);
  const [testEmailMsg, setTestEmailMsg] = useState('');
  const [showSmtp, setShowSmtp] = useState(false);
  const [seedingData, setSeedingData] = useState(false);
  const [seedMsg, setSeedMsg] = useState('');

  const seedDemoData = async () => {
    if (!window.confirm('This will load demo products, tables, and modifiers into your account. Proceed?')) return;
    setSeedingData(true); setSeedMsg('');
    try {
      const res = await fetchWithAuth(`${API_URL}/settings/seed`, { method: 'POST' });
      const d = await res.json();
      if (d.success) {
        setSeedMsg('✓ Demo data loaded!');
        if (fetchProducts) fetchProducts(); // Refresh products immediately!
      } else {
        setSeedMsg(d.error || 'Failed to load.');
      }
    } catch { setSeedMsg('Failed to load demo data.'); }
    finally { setSeedingData(false); setTimeout(() => setSeedMsg(''), 5000); }
  };

  useEffect(() => {
    if (currentView === 'settings-general' || currentView === 'settings-loyalty') {
      fetchWithAuth(`${API_URL}/settings`)
        .then(r => r.json())
        .then(d => { if (d.success) setSysConfig(prev => ({ ...prev, ...d.settings })); })
        .catch(() => { });
    }
  }, [currentView]);

  const saveConfig = async () => {
    setConfigSaving(true); setConfigMsg('');
    try {
      const res = await fetchWithAuth(`${API_URL}/settings`, {
        method: 'PUT',
        body: JSON.stringify({ settings: sysConfig }),
      });
      const d = await res.json();
      setConfigMsg(d.success ? '✓ Settings saved.' : (d.error || 'Failed to save.'));
    } catch { setConfigMsg('Failed to save.'); }
    finally { setConfigSaving(false); setTimeout(() => setConfigMsg(''), 3000); }
  };

  const downloadKioskLauncher = () => {
    const url = (sysConfig.kiosk_url && sysConfig.kiosk_url.trim()) || window.location.origin;
    const command = `"${navigator.platform.startsWith('Win') ? 'start "" /D "%ProgramFiles%\\Google\\Chrome\\Application" chrome' : 'google-chrome'}" --kiosk --kiosk-printing --disable-print-preview --app=${url}`;

    const isWindows = navigator.userAgent.includes('Windows');
    if (isWindows) {
      const bat = [
        '@echo off',
        ':: Kiosk launcher for POS',
        'set CHROME="%ProgramFiles%\\Google\\Chrome\\Application\\chrome.exe"',
        'if not exist %CHROME% set CHROME="%ProgramFiles(x86)%\\Google\\Chrome\\Application\\chrome.exe"',
        '%CHROME% --kiosk --kiosk-printing --disable-print-preview --app=' + url,
        'exit /b'
      ].join('\r\n');
      const blob = new Blob([bat], { type: 'text/plain' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'pos-kiosk-launcher.bat';
      a.click();
    } else {
      const sh = [
        '#!/usr/bin/env bash',
        'CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"',
        'if [ ! -x "$CHROME" ]; then CHROME="$(command -v google-chrome || command -v chromium || echo google-chrome)"; fi',
        '"$CHROME" --kiosk --kiosk-printing --disable-print-preview --app=' + url + ' &'
      ].join('\n');
      const blob = new Blob([sh], { type: 'text/plain' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'pos-kiosk-launcher.sh';
      a.click();
    }
  };

  const sendTestEmail = async () => {
    setTestEmailSending(true); setTestEmailMsg('');
    try {
      const res = await fetchWithAuth(`${API_URL}/settings/test-email`, { method: 'POST' });
      const d = await res.json();
      setTestEmailMsg(d.success ? '✓ Test email sent! Check your inbox.' : (d.error || 'Failed to send.'));
    } catch { setTestEmailMsg('Failed to send test email.'); }
    finally { setTestEmailSending(false); }
  };

  const cfg = (key) => sysConfig[key] || '';
  const setCfg = (key, val) => setSysConfig(prev => ({ ...prev, [key]: val }));
  const toggle = (key) => setCfg(key, sysConfig[key] === 'true' ? 'false' : 'true');

  // Tables state
  const [settingsTables, setSettingsTables] = useState([]);
  const [showAddTable, setShowAddTable] = useState(false);
  const [editingTable, setEditingTable] = useState(null);
  const [tableForm, setTableForm] = useState({ table_number: '', capacity: 4, section: 'Main' });
  const [tableError, setTableError] = useState('');

  const fetchSettingsTables = async () => {
    try {
      const res = await fetchWithAuth(`${API_URL}/tables`);
      const data = await res.json();
      if (data.success) setSettingsTables(data.tables);
    } catch (err) { console.error('Error fetching tables:', err); }
  };

  useEffect(() => {
    if (currentView === 'settings-tables') fetchSettingsTables();
  }, [currentView]);

  const handleSaveTable = async () => {
    setTableError('');
    if (!tableForm.table_number.trim()) {
      setTableError('Table number is required');
      return;
    }
    try {
      const url = editingTable
        ? `${API_URL}/tables/${editingTable.id}`
        : `${API_URL}/tables`;
      const res = await fetchWithAuth(url, {
        method: editingTable ? 'PUT' : 'POST',
        body: JSON.stringify(tableForm)
      });
      const data = await res.json();
      if (data.success) {
        fetchSettingsTables();
        setShowAddTable(false);
        setEditingTable(null);
        setTableForm({ table_number: '', capacity: 4, section: 'Main' });
      } else {
        setTableError(data.error || 'Failed to save table');
      }
    } catch (err) { setTableError('Failed to save table'); }
  };

  const handleDeleteTable = async (id) => {
    if (!confirm('Are you sure you want to delete this table?')) return;
    try {
      const res = await fetchWithAuth(`${API_URL}/tables/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchSettingsTables();
      } else {
        alert(data.error || 'Failed to delete table');
      }
    } catch (err) { alert('Failed to delete table'); }
  };

  return (
    <div className="min-h-screen bg-gray-100 pt-0">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Settings</h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {views.map(view => (
            <button
              key={view.id}
              onClick={() => setCurrentPage(view.id)}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${currentView === view.id ? 'bg-cyan-600 text-white' : 'bg-white text-gray-600 hover:bg-green-50'
                }`}
            >
              {view.name}
            </button>
          ))}
        </div>

        {employee && !employee.company_id && (
          <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-4 shadow-sm animate-pulse">
            <div className="p-2 bg-amber-100 rounded-lg text-amber-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-amber-900 text-sm">Session Action Required</h4>
              <p className="text-amber-700 text-xs mt-1 leading-relaxed">
                Your current login session is missing multi-tenant context.
                <strong> Please logout and login again</strong> to ensure your settings and data are correctly isolated.
              </p>
            </div>
          </div>
        )}

        {currentView === 'settings-general' && (
          <div className="space-y-6 max-w-3xl">

            {/* Business Info */}
            <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
              <h3 className="font-semibold text-gray-800 text-base">Business Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Business Name</label>
                  <input type="text" value={cfg('business_name')} onChange={e => setCfg('business_name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Currency</label>
                  <select value={cfg('currency')} onChange={e => setCfg('currency', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500">
                    {[
                      { code: 'PHP', label: 'Philippine Peso', icon: '₱' },
                      { code: 'USD', label: 'US Dollar', icon: '$' },
                      { code: 'EUR', label: 'Euro', icon: '€' },
                      { code: 'GBP', label: 'British Pound', icon: '£' },
                      { code: 'SGD', label: 'Singapore Dollar', icon: 'S$' },
                      { code: 'AUD', label: 'Australian Dollar', icon: 'A$' },
                      { code: 'CAD', label: 'Canadian Dollar', icon: 'C$' },
                      { code: 'JPY', label: 'Japanese Yen', icon: '¥' },
                    ].map(opt => (
                      <option key={opt.code} value={opt.code}>{opt.code} — {opt.label} ({opt.icon})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Tax Rate (%)</label>
                  <input type="number" value={cfg('tax_rate')} onChange={e => setCfg('tax_rate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Time Zone</label>
                  <select value={cfg('timezone')} onChange={e => setCfg('timezone', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500">
                    <option value="Asia/Manila">Asia/Manila (UTC+8)</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Business Address</label>
                  <input type="text" value={cfg('business_address')} onChange={e => setCfg('business_address', e.target.value)}
                    placeholder="Street, City, Province"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                </div>
              </div>
            </div>

            {/* Owner Info */}
            <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
              <h3 className="font-semibold text-gray-800 text-base">Owner / Report Recipient</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Owner Name</label>
                  <input type="text" value={cfg('owner_name')} onChange={e => setCfg('owner_name', e.target.value)}
                    placeholder="Full name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Owner Email <span className="text-cyan-600">(reports sent here)</span></label>
                  <input type="email" value={cfg('owner_email')} onChange={e => setCfg('owner_email', e.target.value)}
                    placeholder="owner@example.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                </div>
              </div>
            </div>

            {/* Automated Reports */}
            <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
              <h3 className="font-semibold text-gray-800 text-base">Automated Email Reports</h3>
              <p className="text-xs text-gray-500">Reports are sent automatically to the owner email at end-of-day (11 PM Asia/Manila).</p>
              <div className="space-y-3">
                {[
                  { key: 'report_daily', label: 'Daily Sales Report', sub: 'Sent every night at 11:00 PM' },
                  { key: 'report_weekly', label: 'Weekly Sales Report', sub: 'Sent every Sunday at 11:30 PM' },
                  { key: 'report_monthly', label: 'Monthly Sales Report', sub: 'Sent on the last day of each month at 11:45 PM' },
                  { key: 'report_kitchen', label: 'Include Kitchen Orders', sub: 'Attach kitchen order list to each report' },
                ].map(({ key, label, sub }) => (
                  <div key={key} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-700">{label}</p>
                      <p className="text-xs text-gray-400">{sub}</p>
                    </div>
                    <button onClick={() => toggle(key)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${sysConfig[key] === 'true' ? 'bg-cyan-600' : 'bg-gray-200'}`}>
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${sysConfig[key] === 'true' ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* SMTP Configuration */}
            <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
              <button onClick={() => setShowSmtp(!showSmtp)}
                className="flex items-center justify-between w-full text-left">
                <div>
                  <h3 className="font-semibold text-gray-800 text-base">SMTP Email Configuration</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Required to send automated reports</p>
                </div>
                <svg className={`w-4 h-4 text-gray-400 transition-transform ${showSmtp ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showSmtp && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-gray-100">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">SMTP Host</label>
                    <input type="text" value={cfg('smtp_host')} onChange={e => setCfg('smtp_host', e.target.value)}
                      placeholder="smtp.gmail.com"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">SMTP Port</label>
                    <input type="number" value={cfg('smtp_port')} onChange={e => setCfg('smtp_port', e.target.value)}
                      placeholder="587"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">SMTP Username / Email</label>
                    <input type="text" value={cfg('smtp_user')} onChange={e => setCfg('smtp_user', e.target.value)}
                      placeholder="youremail@gmail.com"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">SMTP Password / App Password</label>
                    <input type="password" value={cfg('smtp_pass')} onChange={e => setCfg('smtp_pass', e.target.value)}
                      placeholder="••••••••••••••••"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-500 mb-1">From Address (optional)</label>
                    <input type="email" value={cfg('smtp_from')} onChange={e => setCfg('smtp_from', e.target.value)}
                      placeholder="noreply@yourbusiness.com (leave blank to use username)"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                  </div>
                  <div className="md:col-span-2 bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
                    <strong>Gmail users:</strong> Use <code>smtp.gmail.com</code>, port <code>587</code>, and go to https://myaccount.google.com/ then, Security & sign in, tap 2 step verification,then tap <strong>App Password,</strong> then generate password (not your regular password). Summary: Enable 2FA in your Google account first, then generate an App Password under Security → App passwords.
                  </div>
                </div>
              )}
            </div>

            {/* Save + Test */}
            <div className="flex items-center gap-3 flex-wrap">
              <button onClick={saveConfig} disabled={configSaving}
                className="bg-cyan-600 text-white px-6 py-2 rounded-lg hover:bg-cyan-700 font-medium text-sm disabled:opacity-60">
                {configSaving ? 'Saving...' : 'Save Settings'}
              </button>
              <button onClick={sendTestEmail} disabled={testEmailSending}
                className="border border-cyan-600 text-cyan-700 px-6 py-2 rounded-lg hover:bg-green-50 font-medium text-sm disabled:opacity-60">
                {testEmailSending ? 'Sending...' : 'Send Test Email'}
              </button>
              <button onClick={seedDemoData} disabled={seedingData}
                className="border border-blue-600 text-blue-700 px-6 py-2 rounded-lg hover:bg-blue-50 font-medium text-sm disabled:opacity-60 ml-auto">
                {seedingData ? 'Loading Demo Data...' : 'Load Demo Data'}
              </button>
              <div className="w-full flex gap-3 text-sm font-medium">
                {configMsg && <span className={configMsg.startsWith('✓') ? 'text-cyan-600' : 'text-red-500'}>{configMsg}</span>}
                {testEmailMsg && <span className={testEmailMsg.startsWith('✓') ? 'text-cyan-600' : 'text-red-500'}>{testEmailMsg}</span>}
                {seedMsg && <span className={seedMsg.startsWith('✓') ? 'text-cyan-600' : 'text-red-500'}>{seedMsg}</span>}
              </div>
            </div>
          </div>
        )}

        {currentView === 'settings-payment' && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="font-semibold text-gray-800 text-lg mb-4">Payment Methods</h3>
            <div className="space-y-4">
              {['Cash', 'GCash', 'Card', 'Credit'].map(method => (
                <div key={method} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{method === 'Cash' ? '💵' : method === 'GCash' ? '📱' : method === 'Card' ? '💳' : '📝'}</span>
                    <span className="font-medium">{method}</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
                  </label>
                </div>
              ))}
            </div>
          </div>
        )}

        {currentView === 'settings-practice' && (
          <div className="space-y-6 max-w-3xl">
            <div className="bg-white rounded-xl shadow-sm p-6 space-y-4 border-l-4 border-amber-500">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-amber-100 rounded-lg text-amber-600">
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 text-lg">Practice Mode</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Use these tools to set up a practice environment or reset your restaurant data.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                <div className="p-4 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors">
                  <h4 className="font-medium text-gray-800 mb-1">Seed Sample Data</h4>
                  <p className="text-xs text-gray-400 mb-4">
                    Instantly add a starter menu (Pizza, Burgers, Drinks) and basic tables. Perfect for training staff.
                  </p>
                  <button
                    onClick={async () => {
                      if (!confirm('This will add sample products to your restaurant. Continue?')) return;
                      try {
                        const res = await fetchWithAuth(`${API_URL}/settings/seed`, { method: 'POST' });
                        const d = await res.json();
                        if (res.status === 401) {
                          alert('Session expired. Please log in again.');
                          return;
                        }
                        alert(d.success ? 'Success! Sample data added. Refreshing...' : (d.error || 'Failed to seed.'));
                        if (d.success) window.location.reload();
                      } catch (err) {
                        console.error('Seed error:', err);
                        alert('Connect error: Failed to seed demo data. Check your network or if the server is up.');
                      }
                    }}
                    className="w-full py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 text-sm font-medium transition-colors"
                  >
                    Load Sample Menu
                  </button>
                </div>

                <div className="p-4 border border-red-100 rounded-xl hover:bg-red-50 transition-colors">
                  <h4 className="font-medium text-red-800 mb-1">Reset All Data</h4>
                  <p className="text-xs text-red-400 mb-4">
                    Permanently delete all orders, products, customers, and inventory. <strong>This cannot be undone.</strong>
                  </p>
                  <button
                    onClick={async () => {
                      const confirm1 = confirm('WARNING: This will permanently delete ALL restaurant data (orders, products, etc.). Are you SURE?');
                      if (!confirm1) return;
                      const confirm2 = confirm('LAST WARNING: This really cannot be undone. Proceed?');
                      if (!confirm2) return;

                      try {
                        const res = await fetchWithAuth(`${API_URL}/settings/purge-data`, { method: 'DELETE' });
                        const d = await res.json();
                        alert(d.success ? 'Restaurant data has been reset.' : (d.error || 'Failed to purge.'));
                        if (d.success) window.location.reload();
                      } catch (err) {
                        alert('Connect error: Failed to purge data.');
                      }
                    }}
                    className="w-full py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium transition-colors text-center"
                  >
                    Purge All Data
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {currentView === 'settings-tables' && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800 text-lg">Manage Tables</h3>
              <button
                onClick={() => { setShowAddTable(true); setEditingTable(null); setTableForm({ table_number: '', capacity: 4, section: 'Main' }); setTableError(''); }}
                className="bg-cyan-600 text-white px-4 py-2 rounded-lg hover:bg-cyan-700 flex items-center gap-2 text-sm font-medium"
              >
                <Plus size={16} /> Add Table
              </button>
            </div>

            {/* Add/Edit Form */}
            {(showAddTable || editingTable) && (
              <div className="mb-6 p-4 border border-cyan-200 bg-green-50 rounded-xl">
                <h4 className="font-medium text-gray-800 mb-3">{editingTable ? 'Edit Table' : 'Add New Table'}</h4>
                {tableError && <p className="text-red-500 text-sm mb-3">{tableError}</p>}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Table Number</label>
                    <input
                      type="text"
                      value={tableForm.table_number}
                      onChange={e => setTableForm({ ...tableForm, table_number: e.target.value })}
                      placeholder="e.g. 11"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Capacity</label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={tableForm.capacity}
                      onChange={e => setTableForm({ ...tableForm, capacity: parseInt(e.target.value) || 1 })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Section</label>
                    <select
                      value={tableForm.section}
                      onChange={e => setTableForm({ ...tableForm, section: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                    >
                      <option value="Main">Main</option>
                      <option value="Patio">Patio</option>
                      <option value="VIP">VIP</option>
                      <option value="Bar">Bar</option>
                      <option value="Outdoor">Outdoor</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleSaveTable} className="bg-cyan-600 text-white px-6 py-2 rounded-lg hover:bg-cyan-700 font-medium text-sm">
                    {editingTable ? 'Update' : 'Add Table'}
                  </button>
                  <button onClick={() => { setShowAddTable(false); setEditingTable(null); setTableError(''); }} className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300 font-medium text-sm">
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Tables List */}
            <div className="overflow-x-auto">
              <table className="w-full font-data-table">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Table #</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Capacity</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Section</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Status</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {settingsTables.map(table => (
                    <tr key={table.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium">Table {table.table_number}</td>
                      <td className="py-3 px-4 text-gray-600">{table.capacity} seats</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${table.section === 'VIP' ? 'bg-purple-100 text-purple-700' :
                          table.section === 'Patio' ? 'bg-blue-100 text-blue-700' :
                            table.section === 'Bar' ? 'bg-amber-100 text-amber-700' :
                              table.section === 'Outdoor' ? 'bg-teal-100 text-teal-700' :
                                'bg-gray-100 text-gray-700'
                          }`}>{table.section}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${table.status === 'available' ? 'bg-cyan-100 text-cyan-700' :
                          table.status === 'occupied' ? 'bg-red-100 text-red-700' :
                            table.status === 'reserved' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-gray-200 text-gray-600'
                          }`}>{table.status}</span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setEditingTable(table);
                              setTableForm({ table_number: table.table_number, capacity: table.capacity, section: table.section });
                              setShowAddTable(false);
                              setTableError('');
                            }}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                            title="Edit"
                          >
                            <Edit3 size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteTable(table.id)}
                            className={`p-2 rounded-lg ${table.status === 'occupied' ? 'text-gray-300 cursor-not-allowed' : 'text-red-600 hover:bg-red-50'}`}
                            disabled={table.status === 'occupied'}
                            title={table.status === 'occupied' ? 'Cannot delete occupied table' : 'Delete'}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {settingsTables.length === 0 && (
                    <tr><td colSpan="5" className="py-8 text-center text-gray-400">No tables configured yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {currentView === 'settings-loyalty' && (
          <div className="space-y-6 max-w-4xl">
            {/* Main Loyalty Header */}
            <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-2xl shadow-lg p-6 text-white relative overflow-hidden">
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <span className="text-xl">💎</span>
                  </div>
                  <h3 className="font-bold text-xl uppercase tracking-tight">Loyalty Program Config</h3>
                </div>
                <p className="text-purple-50 text-sm leading-relaxed max-w-2xl">
                  Configure how your customers earn points and what rewards they unlock at each tier.
                  Points are automatically calculated at checkout when a customer is selected.
                </p>
              </div>
              <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
            </div>

            {/* Core Earning Rule */}
            <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
              <div className="flex items-center gap-2 mb-6">
                <div className="p-1.5 bg-purple-50 rounded-lg text-purple-600">
                  <Settings size={18} />
                </div>
                <h4 className="font-bold text-gray-800 uppercase text-xs tracking-widest">Earning Rules</h4>
              </div>

              <div className="max-w-md">
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Points per PHP Spent</label>
                <div className="flex items-center gap-4">
                  <div className="flex-1 relative">
                    <input
                      type="number"
                      step="0.001"
                      value={sysConfig.loyalty_points_per_php}
                      onChange={e => setSysConfig({ ...sysConfig, loyalty_points_per_php: e.target.value })}
                      className="w-full pl-3 pr-12 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-700"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-400 uppercase">PTS/₱</span>
                  </div>
                  <div className="text-xs text-gray-500 font-medium whitespace-nowrap">
                    Example: 0.02 = 1 pt per ₱50
                  </div>
                </div>
              </div>
            </div>

            {/* Tier Thresholds */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { id: 'silver', label: '🥈 Silver Tier', color: 'gray' },
                { id: 'gold', label: '🥇 Gold Tier', color: 'amber' },
                { id: 'diamond', label: '💎 Diamond Tier', color: 'cyan' }
              ].map(tier => (
                <div key={tier.id} className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100 flex flex-col">
                  <h5 className="font-bold text-gray-800 text-sm mb-4">{tier.label}</h5>

                  <div className="space-y-4 flex-1">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5">Points Threshold</label>
                      <input
                        type="number"
                        value={sysConfig[`loyalty_${tier.id}_threshold`]}
                        onChange={e => setSysConfig({ ...sysConfig, [`loyalty_${tier.id}_threshold`]: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold"
                        placeholder="Points..."
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5">Discount (%)</label>
                      <div className="relative">
                        <input
                          type="number"
                          value={sysConfig[`loyalty_${tier.id}_discount`]}
                          onChange={e => setSysConfig({ ...sysConfig, [`loyalty_${tier.id}_discount`]: e.target.value })}
                          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold"
                          placeholder="Discount..."
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">%</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-gray-100">
              <button
                onClick={saveConfig}
                disabled={configSaving}
                className="bg-purple-600 text-white px-8 py-3 rounded-xl hover:bg-purple-700 font-bold text-sm disabled:opacity-60 shadow-lg shadow-purple-200 transition-all active:scale-95"
              >
                {configSaving ? 'Saving Configurations...' : 'Save Loyalty Rules'}
              </button>
              {configMsg && (
                <span className={`text-sm font-bold ${configMsg.startsWith('✓') ? 'text-green-600' : 'text-red-500'}`}>
                  {configMsg}
                </span>
              )}
            </div>
          </div>
        )}

        {currentView === 'settings-printers' && (
          <div className="space-y-6 max-w-4xl">
            {/* Connection Status & Instructions */}
            <div className="bg-gradient-to-br from-cyan-600 to-cyan-700 rounded-2xl shadow-lg p-6 text-white relative overflow-hidden">
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <span role="img" aria-label="printer">🖨️</span>
                  </div>
                  <h3 className="font-bold text-xl uppercase tracking-tight">Thermal Printer Setup</h3>
                </div>
                <p className="text-green-50 text-sm leading-relaxed max-w-2xl mb-4">
                  Your POS is currently configured for <strong>58mm Thermal Printers</strong>. To achieve 1-click printing without a preview dialog,
                  please follow the "Direct Print" setup below.
                </p>
                <div className="flex gap-4">
                  <div className="bg-black/20 rounded-lg px-4 py-2 border border-white/10">
                    <p className="text-[10px] text-cyan-200 uppercase font-bold">Paper Width</p>
                    <p className="text-lg font-black uppercase">58mm (Small Roll)</p>
                  </div>
                  <div className="bg-black/20 rounded-lg px-4 py-2 border border-white/10">
                    <p className="text-[10px] text-cyan-200 uppercase font-bold">Kitchen Copy</p>
                    <p className="text-lg font-black uppercase">Enabled (Separate)</p>
                  </div>
                </div>
              </div>
              {/* Decorative Circle */}
              <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Printing Behavior */}
              <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 flex flex-col">
                <div className="flex items-center gap-2 mb-6">
                  <Settings size={18} className="text-cyan-600" />
                  <h4 className="font-bold text-gray-800 uppercase text-xs tracking-widest">General Behavior</h4>
                </div>

                <div className="space-y-4 flex-1">
                  {[
                    { key: 'printer_auto_receipt', label: 'Auto-print Receipt', sub: 'Prints immediately after payment' },
                    { key: 'printer_auto_kitchen', label: 'Auto-print Kitchen Slip', sub: 'Prints kitchen copy for chefs' },
                    { key: 'printer_manual_tear', label: 'Manual Paper Tear', sub: 'Adds extra padding at the bottom' },
                  ].map(({ key, label, sub }) => (
                    <div key={key} className="flex items-center justify-between group">
                      <div>
                        <p className="text-sm font-bold text-gray-700">{label}</p>
                        <p className="text-[10px] text-gray-400 uppercase tracking-tighter">{sub}</p>
                      </div>
                      <button
                        onClick={() => toggle(key)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300 ${sysConfig[key] === 'true' ? 'bg-cyan-600 shadow-sm shadow-cyan-200' : 'bg-gray-200'}`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 ${sysConfig[key] === 'true' ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </div>
                  ))}

                  <div className="pt-4 mt-2 border-t border-gray-100">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Paper Roll Width</label>
                    <div className="flex gap-2">
                      {['58mm', '80mm'].map(width => (
                        <button
                          key={width}
                          onClick={() => setCfg('printer_width', width)}
                          className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${cfg('printer_width') === width
                            ? 'bg-cyan-600 border-cyan-600 text-white'
                            : 'bg-white border-gray-200 text-gray-500 hover:border-cyan-300'
                            }`}
                        >
                          {width}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Customization */}
              <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                <div className="flex items-center gap-2 mb-6">
                  <LayoutIcon size={18} className="text-cyan-600" />
                  <h4 className="font-bold text-gray-800 uppercase text-xs tracking-widest">Receipt Content</h4>
                </div>

                <div className="space-y-5">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Kiosk / App URL</label>
                    <input
                      type="text"
                      value={cfg('kiosk_url')}
                      onChange={e => setCfg('kiosk_url', e.target.value)}
                      placeholder="http://localhost:5173"
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all"
                    />
                    <p className="text-[10px] text-gray-500 mt-1">Used by the kiosk launcher & silent-print command.</p>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Header Title (Optional)</label>
                    <input
                      type="text"
                      value={cfg('printer_header')}
                      onChange={e => setCfg('printer_header', e.target.value)}
                      placeholder="e.g. WELLCOME TO BRANCH A"
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Footer Message</label>
                    <textarea
                      rows="3"
                      value={cfg('printer_footer')}
                      onChange={e => setCfg('printer_footer', e.target.value)}
                      placeholder="Thank you message..."
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all"
                    />
                  </div>
                  <button
                    onClick={saveConfig}
                    className="w-full bg-gray-900 border border-black text-white py-3 rounded-lg text-xs font-black uppercase tracking-widest hover:bg-gray-800 transition-all flex items-center justify-center gap-2"
                  >
                    {configSaving ? 'Saving Changes...' : 'Save Printer Config'}
                  </button>
                  <button
                    onClick={() => setCurrentPage('print-test')}
                    className="w-full bg-cyan-600 text-white py-3 rounded-lg text-xs font-black uppercase tracking-widest hover:bg-cyan-700 transition-all flex items-center justify-center gap-2"
                  >
                    Print Test Receipt
                  </button>
                  <button
                    onClick={downloadKioskLauncher}
                    className="w-full bg-amber-500 text-white py-3 rounded-lg text-xs font-black uppercase tracking-widest hover:bg-amber-600 transition-all flex items-center justify-center gap-2"
                  >
                    Download Kiosk Launcher
                  </button>
                </div>
              </div>

              {/* Troubleshooting Card */}
              <div className="md:col-span-2 bg-white rounded-2xl shadow-sm p-6 border-2 border-dashed border-gray-200">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                    <Zap size={20} />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-800 uppercase text-xs tracking-widest mb-1">Industry Standard: 1-Click "Silent" Printing</h4>
                    <p className="text-gray-500 text-xs leading-relaxed mb-4">
                      Browsers show a Print Preview by default. To bypass this, configure your desktop browser using <strong>Kiosk Mode</strong>.
                    </p>
                    <div className="bg-gray-50 p-4 rounded-xl space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 bg-white border border-gray-200 rounded flex items-center justify-center text-[10px] font-bold text-gray-400">1</span>
                        <p className="text-[11px] text-gray-600">Close all Chrome/Edge windows.</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 bg-white border border-gray-200 rounded flex items-center justify-center text-[10px] font-bold text-gray-400">2</span>
                        <p className="text-[11px] text-gray-600">Right-click the browser shortcut &gt; <strong>Properties</strong>.</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 bg-white border border-gray-200 rounded flex items-center justify-center text-[10px] font-bold text-gray-400">3</span>
                        <div className="flex-1">
                          <p className="text-[11px] text-gray-600 mb-1">In "Target", add this at the end:</p>
                          <code className="text-[10px] bg-amber-100 text-amber-900 px-2 py-1 rounded block w-full whitespace-pre-wrap font-mono select-all">--kiosk-printing</code>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {currentView === 'settings-integrations' && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="font-semibold text-gray-800 text-lg mb-4">Integrations</h3>
            <p className="text-gray-500">Third-party integrations coming soon.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Customer Login / Registration Page
function CustomerLoginPage({ setCustomer, setCurrentPage, companyId }) {
  const [isLogin, setIsLogin] = useState(true);
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetchWithAuth(`${API_URL}/customers/login`, {
        method: 'POST',
        body: JSON.stringify({ phone, pin, company_id: companyId })
      });
      const result = await response.json();

      if (result.success) {
        setCustomer(result.customer);
        setCurrentPage('customer-dashboard');
      } else {
        setError(result.error || 'Login failed. Check your phone/PIN.');
      }
    } catch (err) {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetchWithAuth(`${API_URL}/customers/register`, {
        method: 'POST',
        body: JSON.stringify({ name, phone, pin, email: email || null, company_id: companyId })
      });
      const result = await response.json();

      if (result.success) {
        setCustomer(result.customer);
        setCurrentPage('customer-dashboard');
      } else {
        setError(result.error || 'Registration failed');
      }
    } catch (err) {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pt-24 pb-20 flex items-center justify-center px-4 font-dashboard">
      <div className="bg-white rounded-[3rem] shadow-2xl shadow-cyan-900/5 max-w-lg w-full overflow-hidden border border-gray-100 animate-fadeIn">
        <div className="bg-[#0A0F0D] p-12 text-center text-white relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
          <div className="w-20 h-20 bg-white/5 backdrop-blur-md rounded-[2rem] flex items-center justify-center mx-auto mb-8 border border-white/10 group hover:scale-110 transition-transform">
            <User className="w-10 h-10 text-cyan-400" />
          </div>
          <h1 className="text-4xl font-black tracking-tight uppercase mb-3">
            {isLogin ? 'Member Access' : 'Join the Elite'}
          </h1>
          <p className="text-gray-400 font-bold text-sm tracking-widest uppercase">
            {isLogin ? 'Access your private portal' : 'Start your journey with us'}
          </p>
        </div>

        <div className="p-12">
          {error && (
            <div className="bg-red-50 text-red-700 border border-red-100 px-5 py-4 rounded-2xl mb-8 text-xs font-bold animate-pulse">
              {error}
            </div>
          )}

          <form onSubmit={isLogin ? handleLogin : handleRegister} className="space-y-6">
            {!isLogin && (
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Full Legal Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:border-cyan-500 font-bold text-gray-800 transition-all"
                  placeholder="Juan Dela Cruz"
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Secure Phone Link</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:border-cyan-500 font-bold text-gray-800 transition-all"
                placeholder="09171234567"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Access PIN</label>
              <input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                required
                maxLength={6}
                className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:border-cyan-500 font-black text-gray-900 text-center text-3xl tracking-[0.5em] transition-all"
                placeholder="••••"
              />
            </div>

            {!isLogin && (
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Email Intelligence (Optional)</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:border-cyan-500 font-bold text-gray-800 transition-all"
                  placeholder="juan@email.com"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-cyan-600 text-white py-5 rounded-[1.5rem] font-black uppercase tracking-widest text-sm hover:bg-cyan-700 transition-all shadow-xl shadow-cyan-200 active:scale-95 disabled:opacity-50"
            >
              {loading ? 'AUTHENTICATING...' : (isLogin ? 'AUTHORIZE ACCESS' : 'RESERVE MEMBER STATUS')}
            </button>
          </form>

          <div className="mt-10 text-center">
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
              }}
              className="text-gray-400 font-black text-[10px] tracking-widest uppercase hover:text-cyan-600 transition-colors"
            >
              {isLogin ? "Request New Membership" : 'Already a Member? Login'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Customer Dashboard
function CustomerDashboard({ customer, onLogout }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [orders, setOrders] = useState([]);
  const [ledger, setLedger] = useState([]);
  const [loading, setLoading] = useState(true);
  const [displayCustomer, setDisplayCustomer] = useState(customer);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentProcessing, setPaymentProcessing] = useState(false);

  useEffect(() => {
    if (customer?.id) {
      fetchData(customer.id);
    }
  }, [customer?.id]);

  const fetchData = async (customerId) => {
    setLoading(true);
    try {
      const [ordersRes, ledgerRes, customerRes] = await Promise.all([
        fetchWithAuth(`${API_URL}/customers/${customerId}/orders`),
        fetchWithAuth(`${API_URL}/customers/${customerId}/ledger`),
        fetchWithAuth(`${API_URL}/customers/${customerId}`)
      ]);

      const ordersData = await ordersRes.json();
      const ledgerData = await ledgerRes.json();
      const custData = await customerRes.json();

      if (ordersData.success) setOrders(ordersData.orders);
      if (ledgerData.success) setLedger(ledgerData.ledger);
      if (custData.success) setDisplayCustomer(custData.customer);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) {
      alert('Please enter a valid amount');
      return;
    }
    if (amount > parseFloat(displayCustomer.credit_balance)) {
      alert('Payment amount cannot exceed balance');
      return;
    }

    setPaymentProcessing(true);
    try {
      const response = await fetchWithAuth(`${API_URL}/customers/${customer.id}/payment`, {
        method: 'POST',
        body: JSON.stringify({
          amount: amount,
          notes: 'Customer payment',
          created_by: 'Customer'
        })
      });
      const result = await response.json();

      if (result.success) {
        alert(`Payment of ₱${amount.toFixed(2)} recorded successfully!`);
        setShowPaymentModal(false);
        setPaymentAmount('');
        fetchData(customer.id);
      } else {
        alert('Error: ' + (result.error || 'Payment failed'));
      }
    } catch (error) {
      console.error('Payment error:', error);
      alert('Error processing payment');
    } finally {
      setPaymentProcessing(false);
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!customer) {
    return (
      <div className="min-h-screen bg-gray-100 pt-24 pb-20 flex items-center justify-center">
        <p className="text-gray-500 font-black uppercase tracking-widest">Awaiting Authorization...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pt-24 pb-20 font-dashboard">
      <div className="max-w-5xl mx-auto px-4">
        <div className="bg-white rounded-[2.5rem] shadow-xl shadow-gray-200/50 p-8 mb-8 border border-gray-100 animate-fadeIn">
          <div className="flex items-center justify-between flex-wrap gap-6">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 bg-[#0A0F0D] rounded-3xl flex items-center justify-center shadow-lg group hover:rotate-3 transition-transform">
                <span className="text-3xl font-black text-cyan-400">
                  {displayCustomer.name?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h1 className="text-3xl font-black text-gray-900 tracking-tight uppercase leading-none mb-2">{displayCustomer.name}</h1>
                <div className="flex items-center gap-3">
                  <p className="text-gray-400 font-bold text-xs">{displayCustomer.phone}</p>
                  <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                  <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 bg-cyan-50 text-cyan-700 rounded-md">ID: LMN-{displayCustomer.id.toString().padStart(4, '0')}</span>
                </div>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="px-6 py-3 bg-red-50 text-red-600 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-red-100 transition-all group"
            >
              Secure Logout
            </button>
          </div>

          <div className="mt-10 bg-[#0A0F0D] rounded-[2rem] p-10 text-white relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-600/10 rounded-full blur-3xl -mr-32 -mt-32 transition-transform group-hover:scale-125 duration-1000"></div>
            <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
              <div className="text-center md:text-left">
                <p className="text-gray-500 font-black text-[10px] tracking-[0.3em] uppercase mb-4">Current Liability Balance</p>
                <div className="flex items-baseline gap-3">
                  <span className="text-4xl text-cyan-500 font-black">₱</span>
                  <p className="text-7xl font-black tracking-tighter">
                    {parseFloat(displayCustomer.credit_balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="flex items-center gap-4 mt-6">
                  <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl">
                    <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Available Credit</p>
                    <p className="font-black text-cyan-400">₱{(parseFloat(displayCustomer.credit_limit || 0) - parseFloat(displayCustomer.credit_balance || 0)).toFixed(2)}</p>
                  </div>
                  <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl">
                    <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Loyalty Status</p>
                    <p className="font-black text-white">{displayCustomer.loyalty_points || 0} PTS</p>
                  </div>
                </div>
              </div>
              {parseFloat(displayCustomer.credit_balance) > 0 && (
                <button
                  onClick={() => setShowPaymentModal(true)}
                  className="w-full md:w-auto bg-white text-gray-900 px-10 py-6 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-cyan-500 hover:text-white transition-all shadow-xl shadow-white/5 active:scale-95"
                >
                  DEPOSIT PAYMENT
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-4 mb-8">
          {['overview', 'orders', 'ledger'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-8 py-4 rounded-2xl font-black text-[10px] tracking-widest uppercase transition-all flex items-center gap-3 ${activeTab === tab
                ? 'bg-[#0A0F0D] text-cyan-400 shadow-xl shadow-cyan-900/10'
                : 'bg-white text-gray-400 hover:bg-gray-50 border border-transparent'
                }`}
            >
              <div className={`w-2 h-2 rounded-full ${activeTab === tab ? 'bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,1)]' : 'bg-gray-200'}`}></div>
              {tab}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="bg-white rounded-[2rem] shadow-sm p-20 text-center border border-gray-100">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-4 border-cyan-600 mb-6"></div>
            <p className="text-gray-400 font-black uppercase tracking-widest text-xs">Synchronizing Intel...</p>
          </div>
        ) : (
          <div className="animate-slideUp">
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-4 flex flex-col gap-8">
                  <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-gray-100">
                    <h3 className="font-black text-gray-900 uppercase tracking-widest text-xs mb-8">Activity Pulse</h3>
                    <div className="space-y-6">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400 text-xs font-bold uppercase">Volume</span>
                        <span className="font-black text-gray-900">{orders.length} Orders</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400 text-xs font-bold uppercase">Status</span>
                        <span className="text-emerald-500 font-black text-xs uppercase tracking-widest bg-emerald-50 px-3 py-1 rounded-md">PREMIUM ACTIVE</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-cyan-600 rounded-[2rem] p-8 text-white shadow-xl shadow-cyan-600/20">
                    <div className="flex items-center gap-4 mb-6">
                      <TrendingUp className="w-8 h-8 text-cyan-100" />
                      <h3 className="font-black uppercase tracking-widest text-xs">Engagement Boost</h3>
                    </div>
                    <p className="text-2xl font-bold leading-tight mb-4 text-cyan-50">Join our Pro program to unlock up to 20% cashback on every order.</p>
                    <button className="w-full bg-black/10 hover:bg-black/20 text-white font-black text-[10px] tracking-widest uppercase py-4 rounded-xl border border-white/20 transition-all">LEARN MORE</button>
                  </div>
                </div>

                <div className="lg:col-span-8">
                  {orders.length > 0 && (
                    <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden h-full">
                      <div className="px-8 py-6 border-b border-gray-50 flex justify-between items-center">
                        <h2 className="text-xs font-black text-gray-900 uppercase tracking-widest">Chronological Orders</h2>
                        <span className="text-[10px] font-bold text-gray-400">{orders.length} ENTRYS</span>
                      </div>
                      <div className="divide-y divide-gray-50 max-h-[500px] overflow-y-auto scrollbar-hide">
                        {orders.slice(0, 5).map(order => (
                          <div key={order.id} className="flex items-center justify-between p-8 hover:bg-gray-50 transition-all group">
                            <div className="flex items-center gap-6">
                              <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center font-black text-gray-400 group-hover:bg-[#0A0F0D] group-hover:text-cyan-400 transition-all">
                                #{order.order_number.toString().slice(-3)}
                              </div>
                              <div>
                                <p className="font-black text-gray-900 text-sm uppercase mb-1">{order.order_number}</p>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{formatDate(order.created_at)}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-xl font-black text-gray-900">₱{(parseFloat(order.total_amount) || 0).toFixed(2)}</p>
                              <span className={`text-[9px] font-black tracking-widest uppercase px-3 py-1 rounded-md ${order.payment_status === 'paid' ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'
                                }`}>
                                {order.payment_status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'orders' && (
              <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden animate-fadeIn">
                {orders.length === 0 ? (
                  <div className="p-20 text-center">
                    <ShoppingCart className="w-16 h-16 text-gray-100 mx-auto mb-6" />
                    <p className="text-gray-400 font-black uppercase tracking-widest text-xs tracking-[0.3em]">No transaction records found.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto h-[60vh] scrollbar-hide">
                    <table className="w-full text-sm font-data-table">
                      <thead className="bg-[#FBFCFE] sticky top-0 z-10 border-b border-gray-50">
                        <tr>
                          <th className="text-left px-8 py-6 font-black uppercase tracking-widest text-[10px] text-gray-400">Timestamp</th>
                          <th className="text-left px-8 py-6 font-black uppercase tracking-widest text-[10px] text-gray-400">Reference #</th>
                          <th className="text-left px-8 py-6 font-black uppercase tracking-widest text-[10px] text-gray-400">Items Synchronized</th>
                          <th className="text-right px-8 py-6 font-black uppercase tracking-widest text-[10px] text-gray-400">Gross Total</th>
                          <th className="text-center px-8 py-6 font-black uppercase tracking-widest text-[10px] text-gray-400">Settlement</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {orders.map(order => (
                          <tr key={order.id} className="hover:bg-cyan-50/20 transition-all group">
                            <td className="px-8 py-6 text-gray-500 font-bold text-xs whitespace-nowrap">{formatDate(order.created_at)}</td>
                            <td className="px-8 py-6 font-black text-gray-900 group-hover:text-cyan-600 text-xs">{order.order_number}</td>
                            <td className="px-8 py-6">
                              <div className="flex flex-wrap gap-2">
                                {order.items && order.items[0] ?
                                  order.items.filter(i => i.product_name).map((item, idx) => (
                                    <span key={idx} className="bg-gray-100 px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest text-gray-500">
                                      {item.quantity}× {item.product_name}
                                    </span>
                                  ))
                                  : <span className="text-gray-300 italic">—</span>
                                }
                              </div>
                            </td>
                            <td className="px-8 py-6 text-right font-black text-gray-900 text-base whitespace-nowrap">
                              ₱{(parseFloat(order.total_amount) || 0).toFixed(2)}
                            </td>
                            <td className="px-8 py-6 text-center">
                              <span className={`px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-widest ${order.payment_status === 'paid' ? 'bg-emerald-50 text-emerald-600' :
                                order.payment_status === 'credit' ? 'bg-orange-50 text-orange-600' :
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                {order.payment_status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'ledger' && (
              <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden animate-fadeIn">
                <div className="px-8 py-6 border-b border-gray-50 flex justify-between items-center">
                  <h2 className="text-xs font-black text-gray-900 uppercase tracking-widest">Financial Ledger</h2>
                  <span className="text-[10px] font-bold text-gray-400">AUDIT READY</span>
                </div>
                {ledger.length === 0 ? (
                  <div className="p-20 text-center">
                    <Activity className="w-16 h-16 text-gray-100 mx-auto mb-6" />
                    <p className="text-gray-400 font-black uppercase tracking-widest text-xs tracking-[0.3em]">No financial movements recorded.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto max-h-[60vh] scrollbar-hide">
                    <table className="w-full text-sm font-data-table">
                      <thead className="bg-[#FBFCFE] sticky top-0 z-10 border-b border-gray-50">
                        <tr>
                          <th className="text-left px-8 py-6 font-black uppercase tracking-widest text-[10px] text-gray-400">Date</th>
                          <th className="text-left px-8 py-6 font-black uppercase tracking-widest text-[10px] text-gray-400">Description</th>
                          <th className="text-center px-8 py-6 font-black uppercase tracking-widest text-[10px] text-gray-400">Movement</th>
                          <th className="text-right px-8 py-6 font-black uppercase tracking-widest text-[10px] text-gray-400">Magnitude</th>
                          <th className="text-right px-8 py-6 font-black uppercase tracking-widest text-[10px] text-gray-400">New Balance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {ledger.map(entry => (
                          <tr key={entry.id} className="hover:bg-gray-50 transition-all">
                            <td className="px-8 py-6 text-gray-500 font-bold text-xs">{formatDate(entry.created_at)}</td>
                            <td className="px-8 py-6 font-bold text-gray-900 text-xs">
                              {entry.notes || (entry.type === 'purchase' ? 'Inventory Purchase' : 'Balance Settlement')}
                            </td>
                            <td className="px-8 py-6 text-center">
                              <span className={`px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-widest ${entry.type === 'debit' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                {entry.type}
                              </span>
                            </td>
                            <td className={`px-8 py-6 text-right font-black text-sm ${entry.type === 'debit' ? 'text-red-500' : 'text-emerald-500'}`}>
                              {entry.type === 'debit' ? '-' : '+'}₱{parseFloat(entry.amount).toFixed(2)}
                            </td>
                            <td className="px-8 py-6 text-right font-black text-gray-900 text-sm">
                              ₱{parseFloat(entry.current_balance || 0).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {showPaymentModal && (
        <div className="fixed inset-0 bg-[#0A0F0D]/60 backdrop-blur-xl z-[100] flex items-center justify-center px-4 animate-fadeIn">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-slideUp">
            <div className="bg-[#0A0F0D] py-10 px-10 text-white relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/20 rounded-full blur-3xl -mr-16 -mt-16"></div>
              <div className="flex justify-between items-center relative z-10">
                <div>
                  <h3 className="text-2xl font-black uppercase tracking-tight mb-2">Deposit Settlement</h3>
                  <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Balance Liquidation Protocol</p>
                </div>
                <button onClick={() => setShowPaymentModal(false)} className="w-10 h-10 bg-white/5 text-gray-400 hover:text-white rounded-full flex items-center justify-center transition-all">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="p-10 space-y-8">
              <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Full Debt Amount</p>
                <p className="text-4xl font-black text-gray-900 leading-none">₱{parseFloat(displayCustomer.credit_balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Payment Liquidation Amount</label>
                <div className="relative">
                  <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-black text-gray-300">₱</span>
                  <input
                    type="number"
                    step="0.01"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="w-full pl-12 pr-6 py-6 bg-gray-50 border border-gray-200 rounded-[1.5rem] focus:border-cyan-500 focus:outline-none font-black text-3xl transition-all"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="flex-1 py-5 border border-gray-200 rounded-[1.5rem] font-black text-[10px] tracking-widest uppercase text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-all"
                >
                  ABORT
                </button>
                <button
                  onClick={handlePayment}
                  disabled={paymentProcessing}
                  className="flex-[1.5] py-5 bg-cyan-600 text-white rounded-[1.5rem] font-black text-[10px] tracking-widest uppercase hover:bg-cyan-700 transition-all shadow-xl shadow-cyan-200 disabled:opacity-50"
                >
                  {paymentProcessing ? 'TRANSMITTING...' : 'CONFIRM SETTLEMENT'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- PRINTING COMPONENTS ---

function PrintableReceipt({ order, config }) {
  if (!order) return null;

  const money = (value) => formatCurrency(value, config.currency || 'PHP');

  const formatDate = (date) => {
    return new Date(date).toLocaleString('en-PH', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true
    });
  };

  return (
    <div id="printable-receipt" style={{ width: config.printer_width || '58mm' }}>
      {/* Customer Copy */}
      <div className="receipt-section p-4 border-b border-dashed border-gray-400">
        <div className="text-center mb-4">
          {(config.printer_header || config.business_name) && (
            <h2 className="text-lg font-bold uppercase">{config.printer_header || config.business_name}</h2>
          )}
          <p className="text-[10px] leading-tight">{config.business_address || ''}</p>
          <div className="my-2 border-t border-dashed border-gray-300"></div>
          <p className="font-bold text-sm">RECEIPT</p>
        </div>

        <div className="flex justify-between text-[10px] mb-1">
          <span>Order #:</span>
          <span className="font-bold">{order.orderNumber}</span>
        </div>
        <div className="flex justify-between text-[10px] mb-3">
          <span>Date:</span>
          <span>{formatDate(order.date || new Date())}</span>
        </div>

        <div className="border-t border-dashed border-gray-300 pt-2 mb-2">
          {order.items.map((item, idx) => (
            <div key={idx} className="mb-2">
              <div className="flex justify-between text-[11px]">
                <span className="font-bold">{item.quantity}x {item.name}</span>
                <span>{money(item.price * item.quantity)}</span>
              </div>
              {item.selectedSize && (
                <div className="text-[9px] text-gray-600 pl-4">- Size: {item.selectedSize.name || item.selectedSize}</div>
              )}
              {item.notes && (
                <div className="text-[9px] italic text-gray-500 pl-4">- {item.notes}</div>
              )}
            </div>
          ))}
        </div>

        <div className="border-t border-dashed border-gray-300 pt-2 space-y-1 text-[11px]">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>{money(order.subtotal || 0)}</span>
          </div>
          {order.discount_amount > 0 && (
            <div className="flex justify-between">
              <span>Discount:</span>
              <span>-{money(order.discount_amount)}</span>
            </div>
          )}
          {order.tax_amount > 0 && (
            <div className="flex justify-between">
              <span>Tax ({config.tax_rate}%):</span>
              <span>{money(order.tax_amount)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-base pt-1">
            <span>TOTAL:</span>
            <span>{money(order.total_amount || 0)}</span>
          </div>
        </div>

        <div className="mt-4 pt-2 border-t border-dashed border-gray-300 text-[10px]">
          <div className="flex justify-between">
            <span>Payment:</span>
            <span className="uppercase">{order.payment_method}</span>
          </div>
          {order.amount_received > 0 && (
            <>
              <div className="flex justify-between">
                <span>Received:</span>
                <span>{money(order.amount_received)}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>Change:</span>
                <span>{money(order.change || 0)}</span>
              </div>
            </>
          )}
        </div>

        <div className="text-center mt-6 mb-2">
          <p className="text-[10px]">{config.printer_footer || 'Thank you for dining with us!'}</p>
          <p className="text-[8px] text-gray-400 mt-1 italic">Software by AntiGravity POS</p>
        </div>
      </div>

      {/* Manual Page Break for Thermal Printers (Extra Padding) */}
      {config.printer_manual_tear === 'true' && (
        <div className="py-8 border-b-2 border-dashed border-black no-print"></div>
      )}

      {/* Kitchen Copy (Kitchen Slip) */}
      <div className="kitchen-slip p-4 mt-8">
        <div className="text-center mb-4">
          <h2 className="text-xl font-bold uppercase underline">KITCHEN SLIP</h2>
          <p className="text-base font-bold mt-2">#{order.orderNumber}</p>
          <p className="text-xs">{formatDate(order.date || new Date())}</p>
          <div className="my-2 border-t-2 border-black"></div>
        </div>

        <div className="mb-4">
          <div className="flex justify-between font-bold text-sm mb-1">
            <span>Type:</span>
            <span className="uppercase">{order.service_type || 'Take-out'}</span>
          </div>
          {order.customerName && (
            <div className="flex justify-between text-sm">
              <span>Customer:</span>
              <span className="font-bold">{order.customerName}</span>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {order.items.map((item, idx) => (
            <div key={idx} className="border-b border-gray-200 pb-2">
              <div className="flex items-start gap-3">
                <span className="text-xl font-bold bg-black text-white px-2 py-1 rounded min-w-[40px] text-center">
                  {item.quantity}
                </span>
                <div className="flex-1">
                  <div className="text-lg font-bold leading-tight">{item.name}</div>
                  {item.selectedSize && (
                    <div className="text-sm font-bold mt-1 text-gray-700">SIZE: {item.selectedSize.name || item.selectedSize}</div>
                  )}
                  {item.notes && (
                    <div className="text-sm italic mt-1 bg-yellow-100 p-1 font-bold border-l-4 border-yellow-500">
                      NOTE: {item.notes}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <p className="font-bold text-lg">--- END OF ORDER ---</p>
        </div>
      </div>
    </div>
  );
}

function PrintTestPage({ config, setCurrentPage, setLastOrderData, showSuccessOverlay, setShowSuccessOverlay, setPrintMode }) {
  const buildSampleOrder = () => ({
    orderNumber: `TEST-${Date.now().toString().slice(-6)}`,
    items: [
      { name: 'Sample Burger', quantity: 2, price: 120, selectedSize: 'Regular' },
      { name: 'Iced Tea', quantity: 1, price: 45 },
      { name: 'Fries', quantity: 1, price: 60 }
    ],
    subtotal: 345,
    discount_amount: 0,
    tax_amount: 0,
    total_amount: 345,
    payment_method: 'cash',
    amount_received: 500,
    change: 155,
    service_type: 'dine-in',
    date: new Date()
  });

  const handlePrint = () => {
    const sample = buildSampleOrder();
    setLastOrderData(sample);
    setPrintMode('receipt');
    // Render receipt and trigger overlay-driven print flow
    setShowSuccessOverlay(true);
    setTimeout(() => {
      try {
        window.focus();
        window.print();
      } catch (err) {
        alert('Print failed: ' + err.message);
      }
    }, 800);
  };

  return (
    <div className="min-h-screen bg-gray-100 pt-24 pb-12">
      <div className="max-w-2xl mx-auto bg-white shadow-sm rounded-2xl p-6 space-y-4 border border-gray-100">
        <h1 className="text-2xl font-bold text-gray-800">Printer Test</h1>
        <p className="text-sm text-gray-600">
          This prints a sample receipt using your current printer settings (width {config.printer_width || '58mm'},
          auto-receipt {config.printer_auto_receipt === 'true' ? 'ON' : 'OFF'}, auto-kitchen {config.printer_auto_kitchen === 'true' ? 'ON' : 'OFF'}).
        </p>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-700 space-y-2">
          <div className="flex justify-between"><span>Header</span><span>{config.printer_header || '(none)'}</span></div>
          <div className="flex justify-between"><span>Footer</span><span className="truncate max-w-[60%]">{config.printer_footer || '(none)'}</span></div>
          <div className="flex justify-between"><span>Manual Tear Padding</span><span>{config.printer_manual_tear === 'true' ? 'Enabled' : 'Disabled'}</span></div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handlePrint}
            className="flex-1 py-3 bg-cyan-600 text-white rounded-lg font-semibold hover:bg-cyan-700 transition-colors shadow-sm"
          >
            Print Test Receipt
          </button>
          <button
            onClick={() => setCurrentPage('settings-printers')}
            className="px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
          >
            Back
          </button>
        </div>
        <p className="text-xs text-gray-500">
          Tip: For silent printing, launch the browser with <code>--kiosk --kiosk-printing</code> and set your thermal printer as default.
        </p>
      </div>
    </div>
  );
}

function StockAdjustmentModal({ item, API_URL, onRefresh, onClose }) {
  const [qty, setQty] = useState('');
  const [type, setType] = useState('receive'); // receive, waste, correction
  const [expiry, setExpiry] = useState('');
  const [cost, setCost] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!qty || isNaN(qty)) {
      setError('Please enter a valid quantity.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const q = parseFloat(qty);
      // Automatic sign change based on type
      const quantity_change = (type === 'receive' || (type === 'correction' && q > 0)) ? Math.abs(q) : -Math.abs(q);
      
      const payload = {
        quantity_change,
        notes: `${type.toUpperCase()}: ${notes}`,
        expiry_date: expiry || null,
        invoice_cost: cost || null,
        created_by: 'POS'
      };

      if (item.type === 'product') payload.product_id = item.id;
      else payload.ingredient_id = item.id;

      const res = await fetchWithAuth(`${API_URL}/inventory/adjust`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        onRefresh();
        onClose();
      } else {
        setError(data.error || 'Adjustment failed');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden border border-gray-200">
        <div className="px-5 py-4 bg-cyan-600 text-white flex justify-between items-center">
          <div className="flex flex-col">
            <h3 className="font-bold text-sm">Stock Adjustment</h3>
            <p className="text-[10px] opacity-80 uppercase tracking-wider">{item.name}</p>
          </div>
          <button onClick={onClose} className="hover:opacity-70 p-1">✕</button>
        </div>
        
        <div className="p-5 space-y-4">
          {error && <div className="p-3 bg-red-50 text-red-600 text-[10px] rounded border border-red-100 font-bold">{error}</div>}
          
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5 tracking-widest">Movement Type</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'receive', label: 'Receive', color: 'bg-green-500' },
                { id: 'waste', label: 'Waste', color: 'bg-red-500' },
                { id: 'correction', label: 'Correction', color: 'bg-gray-600' }
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setType(t.id)}
                  className={`py-2 text-[10px] font-black rounded border-2 transition-all uppercase tracking-tighter ${type === t.id ? `${t.color} text-white border-transparent shadow-lg` : 'bg-gray-50 text-gray-400 border-gray-100 hover:border-gray-200'}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5 tracking-widest">Amount ({item.unit || 'pc'})</label>
              <input
                type="number"
                value={qty}
                onChange={e => setQty(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 border-2 border-gray-100 rounded focus:border-cyan-500 outline-none text-base font-black text-gray-800 placeholder-gray-200"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5 tracking-widest">Expiry Date</label>
              <input
                type="date"
                value={expiry}
                onChange={e => setExpiry(e.target.value)}
                className="w-full px-3 py-2 border-2 border-gray-100 rounded focus:border-cyan-500 outline-none text-[11px] font-bold text-gray-600 bg-gray-50/50"
              />
            </div>
          </div>

          {type === 'receive' && (
            <div className="animate-in fade-in slide-in-from-top-1 duration-200">
              <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5 tracking-widest text-cyan-600">Unit Buy Cost (₱)</label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-400 font-bold text-sm">₱</span>
                <input
                  type="number"
                  value={cost}
                  onChange={e => setCost(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-7 pr-3 py-2 border-2 border-cyan-100 bg-cyan-50/10 rounded focus:border-cyan-500 outline-none text-sm font-black text-gray-700"
                />
              </div>
              <p className="text-[9px] text-cyan-600/60 mt-1 italic font-medium">Recalculates Weighted Average Cost (WAC).</p>
            </div>
          )}

          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5 tracking-widest">Internal Audit Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Supplier name, Reason for waste, Batch ID, etc."
              className="w-full px-3 py-2 border-2 border-gray-100 rounded focus:border-cyan-500 outline-none text-[11px] h-20 resize-none font-medium placeholder-gray-200"
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading || !qty}
            className={`w-full py-4 text-white font-black rounded-xl transition-all uppercase tracking-[0.2em] text-[11px] shadow-xl ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-cyan-600 hover:bg-cyan-700 hover:scale-[1.02] active:scale-95 shadow-cyan-200/50'}`}
          >
            {loading ? 'Adjusting Stock...' : 'Confirm Transaction'}
          </button>
        </div>
      </div>
    </div>
  );
}




