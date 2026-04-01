import React, { useState, createContext, useContext, useEffect, useRef } from 'react';
import { ShoppingCart, Plus, Minus, Trash2, ChevronRight, Check, X, Search, User, UtensilsCrossed, ShoppingBag, Truck, LayoutGrid, ArrowLeft, Receipt, Edit3, TrendingUp, ClipboardList, Package, BarChart2, Settings, AlertTriangle, Clock, Activity, Layout, Zap } from 'lucide-react';
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

// API URL - Backend server (proxied via Vite)
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
  const [currentPage, setCurrentPage] = useState('pos');
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
    kiosk_url: 'http://localhost:5173'
  });

  const currencySymbol = getCurrencySymbol(sysConfig.currency || 'PHP');
  const formatMoney = React.useCallback((value) => formatCurrency(value, sysConfig.currency || 'PHP'), [sysConfig.currency]);

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

  // Check for active shift when employee logs in
  useEffect(() => {
    const checkActiveShift = async () => {
      if (employee) {
        try {
          // Give a small delay to ensure localStorage is updated
          await new Promise(r => setTimeout(r, 100));
          const token = localStorage.getItem('auth_token');

          if (!token) {
            console.warn('No auth token found, skipping shift check');
            return;
          }

          // Fetch current shift
          const shiftRes = await fetchWithAuth(`${API_URL}/shifts/current`);
          const shiftData = await shiftRes.json();
          if (shiftData.success && shiftData.data?.shift) {
            setCurrentShift(shiftData.data.shift);
          } else {
            setCurrentShift(null);
          }

          // Fetch system settings
          const settingsRes = await fetchWithAuth(`${API_URL}/settings`);
          const settingsData = await settingsRes.json();
          if (settingsData.success) {
            setSysConfig(prev => ({ ...prev, ...settingsData.settings }));
          }
        } catch (error) {
          console.error('Error checking shift/settings:', error);
          setCurrentShift(null);
        }
      } else {
        setCurrentShift(null);
      }
    };
    checkActiveShift();
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
      ? { ...item, selectedSize: selectedSize.name, price: selectedSize.price, displayName: `${item.name} (${selectedSize.name})` }
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
        @media print {
          /* Hide EVERYTHING except the printable-receipt container */
          body * {
            visibility: hidden !important;
          }
          #printable-receipt, #printable-receipt * {
            visibility: visible !important;
          }
          #printable-receipt {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 80mm !important;
            padding: 0 !important;
            margin: 0 !important;
            background: white !important;
            font-family: 'Courier New', Courier, monospace !important;
            font-size: 11px !important;
            line-height: 1.2 !important;
            color: black !important;
          }
          /* Remove page headers/footers */
          @page {
            size: 80mm auto;
            margin: 0;
          }
          header, footer, nav, .no-print {
            display: none !important;
          }
        }
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
        /* Boston Celtics Green Color Override */
        .bg-green-600 {
          background-color: #007A33 !important;
        }
        .bg-green-500 {
          background-color: #008C3C !important;
        }
        .bg-green-700 {
          background-color: #006129 !important;
        }
        .bg-green-400 {
          background-color: #00A34A !important;
        }
        .bg-green-100 {
          background-color: #E6F4EC !important;
        }
        .text-green-600 {
          color: #007A33 !important;
        }
        .text-green-400 {
          color: #00A34A !important;
        }
        .text-green-100 {
          color: #E6F4EC !important;
        }
        .text-green-700 {
          color: #006129 !important;
        }
        .border-green-600 {
          border-color: #007A33 !important;
        }
        .border-green-300 {
          border-color: #66C299 !important;
        }
        .border-green-400 {
          border-color: #00A34A !important;
        }
        .border-green-500 {
          border-color: #008C3C !important;
        }
        .hover\\:bg-green-700:hover {
          background-color: #006129 !important;
        }
        .hover\\:bg-green-500:hover {
          background-color: #008C3C !important;
        }
        .hover\\:text-green-600:hover {
          color: #007A33 !important;
        }
        .hover\\:bg-green-100:hover {
          background-color: #E6F4EC !important;
        }
        .from-green-900 {
          --tw-gradient-from: #004D20 !important;
        }
        .to-green-900 {
          --tw-gradient-to: #004D20 !important;
        }
        .via-green-900 {
          --tw-gradient-via: #004D20 !important;
        }
        .from-green-400 {
          --tw-gradient-from: #00A34A !important;
        }
        .to-green-500 {
          --tw-gradient-to: #008C3C !important;
        }
        /* Reports typography standard */
        .reports-lineitems,
        .reports-lineitems * {
          font-family: "Arial Narrow", Arial, sans-serif !important;
          line-height: 1 !important;
        }
        .reports-lineitems table th,
        .reports-lineitems table td,
        .reports-lineitems .text-xs,
        .reports-lineitems .text-sm,
        .reports-lineitems .text-base {
          font-size: 14px !important;
        }
        /* Orders typography standard */
        .orders-lineitems,
        .orders-lineitems * {
          font-family: "Arial Narrow", Arial, sans-serif !important;
          line-height: 1 !important;
        }
        .orders-lineitems table th,
        .orders-lineitems table td,
        .orders-lineitems .text-xs,
        .orders-lineitems .text-sm,
        .orders-lineitems .text-base {
          font-size: 14px !important;
        }
        /* Inventory typography standard */
        .inventory-lineitems,
        .inventory-lineitems * {
          font-family: "Arial Narrow", Arial, sans-serif !important;
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
      {currentPage !== 'pos' && currentPage !== 'company-register' && (
        <SubMenu
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          employee={employee}
        />
      )}
      <div className={`${currentPage === 'pos' ? 'bg-gray-200 h-screen overflow-hidden pt-14 md:pt-16 pb-16 md:pb-0' : currentPage === 'home' ? 'bg-gray-100 min-h-screen pb-16 md:pb-0' : 'bg-gray-100 min-h-screen pb-16 md:pb-0 pt-[90px] md:pt-[100px]'}`}>
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
            ['admin', 'manager'].includes(employee.role) ? (
              <ProductManagementPage
                menuData={menuData}
                refreshProducts={fetchProducts}
                currentView={currentPage}
                categories={categories}
              />
            ) : (
              <AccessDeniedPage message="Only managers and administrators can access Menu setup." onBack={() => setCurrentPage('dashboard')} />
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
            <>
              <POSPage
                menuData={menuData}
                categories={categories}
                isLoading={isLoadingProducts}
                currentShift={currentShift}
                employee={employee}
                taxRate={sysConfig.tax_rate}
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
                currencySymbol={currencySymbol}
                formatMoney={formatMoney}
                lastOrderData={lastOrderData}
                setLastOrderData={setLastOrderData}
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
            <EmployeeLoginPage onLogin={(emp) => { setEmployee(emp); setCurrentPage('dashboard'); }} onAction={(page) => setCurrentPage(page)} onBack={() => setCurrentPage('home')} />
          )
        )}

        {currentPage.startsWith('reports') && (
          employee ? (
            ['admin', 'manager'].includes(employee.role) ? (
              <ReportsPage
                currentReport={currentPage}
                setCurrentPage={setCurrentPage}
                formatMoney={formatMoney}
                currencySymbol={currencySymbol}
              />
            ) : (
              <AccessDeniedPage message="Only managers and administrators can access Reports." onBack={() => setCurrentPage('dashboard')} />
            )
          ) : (
            <EmployeeLoginPage onLogin={(emp) => { setEmployee(emp); setCurrentPage('dashboard'); }} onAction={(page) => setCurrentPage(page)} onBack={() => setCurrentPage('home')} />
          )
        )}
        {currentPage === 'customers' && (
          employee ? (
            ['admin', 'manager'].includes(employee.role) ? (
              <CustomersPage setCurrentPage={setCurrentPage} />
            ) : (
              <AccessDeniedPage message="Only managers and administrators can access Customers." onBack={() => setCurrentPage('dashboard')} />
            )
          ) : (
            <EmployeeLoginPage onLogin={(emp) => { setEmployee(emp); setCurrentPage('dashboard'); }} onAction={(page) => setCurrentPage(page)} onBack={() => setCurrentPage('home')} />
          )
        )}
        {/* Dashboard - Redirect to POS or Login */}
        {currentPage === 'dashboard' && (
          employee ? (
            <DashboardPage setCurrentPage={setCurrentPage} employee={employee} />
          ) : (
            <EmployeeLoginPage onLogin={(emp) => { setEmployee(emp); setCurrentPage('dashboard'); }} onAction={(page) => setCurrentPage(page)} onBack={() => setCurrentPage('home')} />
          )
        )}
        {/* Orders Pages */}
        {currentPage.startsWith('orders') && (
          employee ? (
            <OrdersPage currentView={currentPage} setCurrentPage={setCurrentPage} />
          ) : (
            <EmployeeLoginPage onLogin={(emp) => { setEmployee(emp); setCurrentPage('dashboard'); }} onAction={(page) => setCurrentPage(page)} onBack={() => setCurrentPage('home')} />
          )
        )}
        {/* Kitchen Display */}
        {currentPage === 'kitchen' && (
          employee ? (
            <KitchenDisplayPage />
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
            ['admin', 'manager'].includes(employee.role) ? (
              <InventoryPage currentView={currentPage} setCurrentPage={setCurrentPage} menuData={menuData} refreshProducts={fetchProducts} />
            ) : (
              <AccessDeniedPage message="Only managers and administrators can access Inventory." onBack={() => setCurrentPage('dashboard')} />
            )
          ) : (
            <EmployeeLoginPage onLogin={(emp) => { setEmployee(emp); setCurrentPage('dashboard'); }} onAction={(page) => setCurrentPage(page)} onBack={() => setCurrentPage('home')} />
          )
        )}
        {/* Staff Pages */}
        {currentPage.startsWith('staff') && (
          employee ? (
            employee.role === 'admin' ? (
              <StaffPage currentView={currentPage} setCurrentPage={setCurrentPage} />
            ) : (
              <AccessDeniedPage message="Only administrators can access Staff Management." onBack={() => setCurrentPage('dashboard')} />
            )
          ) : (
            <EmployeeLoginPage onLogin={(emp) => { setEmployee(emp); setCurrentPage('dashboard'); }} onAction={(page) => setCurrentPage(page)} onBack={() => setCurrentPage('home')} />
          )
        )}
        {/* Settings Pages */}
        {currentPage.startsWith('settings') && (
          employee ? (
            employee.role === 'admin' ? (
              <SettingsPage
                currentView={currentPage}
                setCurrentPage={setCurrentPage}
                fetchProducts={fetchProducts}
                employee={employee}
                sysConfig={sysConfig}
                setSysConfig={setSysConfig}
              />
            ) : (
              <AccessDeniedPage message="Only administrators can access Settings." onBack={() => setCurrentPage('pos')} />
            )
          ) : (
            <EmployeeLoginPage onLogin={(emp) => { setEmployee(emp); setCurrentPage('pos'); }} onAction={(page) => setCurrentPage(page)} onBack={() => setCurrentPage('home')} />
          )
        )}
        {currentPage === 'customer-login' && <CustomerLoginPage setCustomer={setCustomer} setCurrentPage={setCurrentPage} />}
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
              console.log('Closing size modal');
              setShowSizeModal(false);
              setSelectedProduct(null);
            }}
            onSelectSize={(size) => {
              console.log('Size selected:', size);
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
                className={`flex flex-col items-center px-3 py-1 ${currentPage === 'home' ? 'text-green-600' : 'text-gray-500'}`}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                <span className="text-xs font-medium">Home</span>
              </button>
              <button
                onClick={() => setCurrentPage('menu')}
                className={`flex flex-col items-center px-3 py-1 ${currentPage === 'menu' ? 'text-green-600' : 'text-gray-500'}`}
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
                className="relative bg-green-600 text-white px-6 py-2 rounded-full flex items-center space-x-2 font-bold text-sm shadow-lg"
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
                className={`flex flex-col items-center px-3 py-1 ${currentPage === 'customer-dashboard' || currentPage === 'customer-login' ? 'text-green-600' : 'text-gray-500'}`}
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
          <nav className="fixed bottom-0 left-0 right-0 bg-green-700 md:hidden z-50 pb-safe">
            {currentPage === 'pos' ? (
              /* POS Focused Navigation - Only 3 Buttons as requested */
              <div className="flex items-center justify-around py-2 px-4 gap-4">
                {/* Scan Button */}
                <button
                  onClick={() => window.dispatchEvent(new CustomEvent('pos-open-scanner'))}
                  className="flex flex-col items-center text-green-100 hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v4a1 1 0 001 1h4M21 7v4a1 1 0 01-1 1h-4M3 17v-4a1 1 0 011-1h4M21 17v-4a1 1 0 00-1-1h-4" />
                  </svg>
                  <span className="text-[10px] font-medium mt-1">Scan</span>
                </button>

                {/* Checkout/Pay Button - Prominent */}
                <button
                  onClick={() => window.dispatchEvent(new CustomEvent('pos-open-payment'))}
                  className="relative bg-white text-green-700 px-6 py-2.5 rounded-full flex items-center space-x-2 font-bold text-sm shadow-lg transform active:scale-95 transition-all"
                  disabled={cartItems.length === 0}
                >
                  <ShoppingCart className="w-5 h-5 text-green-600" />
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
                  <button onClick={() => setCurrentPage('dashboard')} className={`flex flex-col items-center min-w-[60px] py-1 rounded-lg transition-colors ${currentPage === 'dashboard' ? 'bg-green-100 text-green-700' : 'text-green-600 hover:bg-gray-200'}`}>
                    <TrendingUp className="w-5 h-5" />
                    <span className="text-[10px] font-medium mt-1">Analytics</span>
                  </button>
                  <button onClick={() => setCurrentPage('pos')} className={`flex flex-col items-center min-w-[60px] py-1 rounded-lg transition-colors ${currentPage === 'pos' ? 'bg-green-100 text-green-700' : 'text-green-600 hover:bg-gray-200'}`}>
                    <ShoppingCart className="w-5 h-5" />
                    <span className="text-[10px] font-medium mt-1">POS</span>
                  </button>
                  <button onClick={() => setCurrentPage('pos')} className={`flex flex-col items-center min-w-[60px] py-1 rounded-lg transition-colors ${currentPage === 'pos' ? 'bg-green-100 text-green-700' : 'text-green-600 hover:bg-gray-200'}`}>
                    <LayoutGrid className="w-5 h-5" />
                    <span className="text-[10px] font-medium mt-1">Tables</span>
                  </button>
                  <button onClick={() => setCurrentPage('orders-active')} className={`flex flex-col items-center min-w-[60px] py-1 rounded-lg transition-colors ${currentPage.startsWith('orders') ? 'bg-green-100 text-green-700' : 'text-green-600 hover:bg-gray-200'}`}>
                    <Receipt className="w-5 h-5" />
                    <span className="text-[10px] font-medium mt-1">Orders</span>
                  </button>

                  {/* 5th Icon: Hamburger Drawer Toggle */}
                  <button onClick={() => setIsNavDrawerOpen(prev => !prev)} className={`flex flex-col items-center min-w-[60px] py-1 rounded-lg transition-colors ${isNavDrawerOpen ? 'bg-green-100 text-green-700' : 'text-green-600 hover:bg-gray-200'}`}>
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
                      <button onClick={() => {setCurrentPage('kitchen'); setIsNavDrawerOpen(false);}} className={`flex flex-col items-center justify-center py-3 rounded-2xl transition-all ${currentPage === 'kitchen' ? 'bg-green-100 text-green-700 shadow-md scale-105' : 'text-green-600 bg-white shadow-sm hover:shadow-md hover:scale-105 border border-gray-100'}`}>
                        <ClipboardList className="w-7 h-7 mb-2" />
                        <span className="text-[11px] font-bold">Kitchen</span>
                      </button>

                      {['admin', 'manager'].includes(employee.role) && (
                        <button onClick={() => {setCurrentPage('products'); setIsNavDrawerOpen(false);}} className={`flex flex-col items-center justify-center py-3 rounded-2xl transition-all ${currentPage === 'products' ? 'bg-green-100 text-green-700 shadow-md scale-105' : 'text-green-600 bg-white shadow-sm hover:shadow-md hover:scale-105 border border-gray-100'}`}>
                          <UtensilsCrossed className="w-7 h-7 mb-2" />
                          <span className="text-[11px] font-bold">Menu</span>
                        </button>
                      )}

                      {['admin', 'manager'].includes(employee.role) && (
                        <button onClick={() => {setCurrentPage('inventory-stock'); setIsNavDrawerOpen(false);}} className={`flex flex-col items-center justify-center py-3 rounded-2xl transition-all ${currentPage === 'inventory-stock' ? 'bg-green-100 text-green-700 shadow-md scale-105' : 'text-green-600 bg-white shadow-sm hover:shadow-md hover:scale-105 border border-gray-100'}`}>
                          <Package className="w-7 h-7 mb-2" />
                          <span className="text-[11px] font-bold">Inventory</span>
                        </button>
                      )}

                      {['admin', 'manager'].includes(employee.role) && (
                        <button onClick={() => {setCurrentPage('customers'); setIsNavDrawerOpen(false);}} className={`flex flex-col items-center justify-center py-3 rounded-2xl transition-all ${currentPage === 'customers' ? 'bg-green-100 text-green-700 shadow-md scale-105' : 'text-green-600 bg-white shadow-sm hover:shadow-md hover:scale-105 border border-gray-100'}`}>
                          <User className="w-7 h-7 mb-2" />
                          <span className="text-[11px] font-bold">Clients</span>
                        </button>
                      )}

                      {employee.role === 'admin' && (
                        <button onClick={() => {setCurrentPage('staff-employees'); setIsNavDrawerOpen(false);}} className={`flex flex-col items-center justify-center py-3 rounded-2xl transition-all ${currentPage === 'staff-employees' ? 'bg-green-100 text-green-700 shadow-md scale-105' : 'text-green-600 bg-white shadow-sm hover:shadow-md hover:scale-105 border border-gray-100'}`}>
                          <User className="w-7 h-7 mb-2 opacity-70" />
                          <span className="text-[11px] font-bold">Staff</span>
                        </button>
                      )}

                      {employee.role === 'admin' && (
                        <button onClick={() => {setCurrentPage('settings-general'); setIsNavDrawerOpen(false);}} className={`flex flex-col items-center justify-center py-3 rounded-2xl transition-all ${currentPage === 'settings-general' ? 'bg-green-100 text-green-700 shadow-md scale-105' : 'text-green-600 bg-white shadow-sm hover:shadow-md hover:scale-105 border border-gray-100'}`}>
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
                className={`flex flex-col items-center px-3 py-1 ${currentPage === 'home' ? 'text-green-600' : 'text-gray-500'}`}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                <span className="text-xs font-medium">Home</span>
              </button>
              <button
                onClick={() => setCurrentPage('dashboard')}
                className={`flex flex-col items-center px-3 py-1 ${currentPage === 'dashboard' ? 'text-green-600' : 'text-gray-500'}`}
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
  console.log('SizeModal rendering with product:', product);

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

        <h2 className="text-2xl font-black text-green-600 mb-2">Select Size</h2>
        <p className="text-gray-600 font-bold mb-6">{product.name}</p>

        <div className="space-y-3">
          {product.sizes.map((size) => (
            <button
              key={size.name}
              onClick={() => onSelectSize(size)}
              className="w-full bg-gray-50 hover:bg-green-50 border-2 border-gray-200 hover:border-green-600 rounded-lg p-4 flex items-center justify-between transition-all group"
            >
              <span className="font-bold text-gray-800 group-hover:text-green-600">{size.name}</span>
              <span className="text-xl font-black text-green-600">Php {size.price.toFixed(2)}</span>
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
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 h-14 md:h-16 ${isGlass ? 'bg-green-600/70 backdrop-blur-md shadow-lg' : 'bg-green-600'
      } ${currentPage === 'pos' ? 'border-b border-white' : ''}`}>
      <div className="w-full h-full">
        {/* Top bar */}
        <div className="w-full h-full px-4 md:px-8">
          <div className="flex items-center justify-between gap-4 h-full">
            {/* Logo - hidden on mobile when search is shown */}
            <div className={`flex items-center space-x-3 cursor-pointer ${(currentPage === 'home' || currentPage === 'menu') ? 'hidden md:flex' : 'flex'}`} onClick={() => setCurrentPage('home')}>
              <div className="text-3xl font-black text-white">K</div>
              <div>
                <h1 className="text-lg font-black text-white tracking-wider">Kuchefnero.ph</h1>
                <p className="text-[8px] text-white font-bold opacity-90">Food Ordering System (ver 1.0)</p>
              </div>
            </div>

            {/* Mobile search bar - centered in header on home/menu */}
            <div className={`${currentPage === 'home' || currentPage === 'menu' ? 'flex md:hidden' : 'hidden'} flex-1 relative`}>
              <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${isGlass ? 'text-white/70' : 'text-green-700'}`} />
              <input
                type="text"
                placeholder="Search for food..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (e.target.value && currentPage !== 'menu') setCurrentPage('menu');
                }}
                className={`w-full pl-9 pr-3 py-1.5 rounded-full focus:outline-none font-medium text-sm transition-all ${isGlass
                  ? 'bg-white/20 text-white placeholder-white/60'
                  : 'bg-green-100 text-green-800 placeholder-green-700/50'
                  }`}
              />
            </div>

            {/* Desktop search bar */}
            <div className={`${currentPage === 'home' || currentPage === 'menu' ? 'hidden md:flex' : 'hidden'} flex-1 max-w-xl mx-6 relative`}>
              <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${isGlass ? 'text-white/70' : 'text-green-700'}`} />
              <input
                type="text"
                placeholder="Search for food..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (e.target.value && currentPage !== 'menu') setCurrentPage('menu');
                }}
                className={`w-full pl-10 pr-4 py-2 rounded-full focus:outline-none font-medium transition-all ${isGlass
                  ? 'bg-white/20 text-white placeholder-white/60'
                  : 'bg-green-100 text-green-800 placeholder-green-700/50'
                  }`}
              />
            </div>

            <div className="flex items-center space-x-3">
              {/* User Profile Dropdown - Top Right */}
              {employee && (
                <div className="relative group">
                  <button className="flex items-center space-x-2 bg-green-700/50 hover:bg-green-700 text-white px-3 py-2 rounded-lg transition-colors">
                    <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4" />
                    </div>
                    <div className="hidden lg:block text-left">
                      <p className="text-sm font-medium leading-tight">{employee.name}</p>
                      <p className="text-xs text-green-200 capitalize">{employee.role}</p>
                    </div>
                    <svg className="w-4 h-4 text-green-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                    <div className="py-2">
                      <div className="px-4 py-2 border-b border-gray-100">
                        <p className="font-medium text-gray-800">{employee.name}</p>
                        <p className="text-xs text-gray-500 capitalize">{employee.role}</p>
                      </div>
                      <button onClick={() => setCurrentPage('profile')} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-600 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                        My Profile
                      </button>
                      <button onClick={() => setCurrentPage('timesheet')} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-600 flex items-center gap-2">
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
                    className="bg-green-600 text-white px-3 py-1.5 md:px-5 md:py-2 hover:bg-green-700 transition-all rounded-lg font-bold text-xs md:text-sm flex items-center space-x-1.5 shadow-md active:scale-95"
                  >
                    <User className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    <span>Staff Login</span>
                  </button>
                  <button
                    onClick={() => setCurrentPage('settings-general')}
                    className="hidden md:flex bg-green-700/50 hover:bg-green-700 text-white p-2 rounded-lg transition-colors shadow-sm"
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
        className={`px-2 md:px-3 py-1 md:py-1.5 rounded text-[10px] md:text-xs transition-all flex items-center gap-0.5 ${active ? 'bg-green-600 text-white' : 'text-gray-600 hover:bg-gray-100'
          }`}
      >
        {label}
        <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d={openMenu === name ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'} />
        </svg>
      </button>
      {openMenu === name && (
        <div style={getStyle()} className="w-40 bg-white rounded-lg shadow-xl border border-gray-200 flex flex-col py-1">
          {children}
        </div>
      )}
    </div>
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

  if (currentPage === 'pos') return null;

  const toggle = (name) => setOpenMenu(prev => prev === name ? null : name);

  const navBtn = (page, label) => (
    <button
      key={page}
      onClick={() => setCurrentPage(page)}
      className={`px-2 md:px-3 py-1 md:py-1.5 rounded text-[10px] md:text-xs transition-all shrink-0 ${currentPage === page ? 'bg-green-600 text-white' : 'text-gray-600 hover:bg-gray-100'
        }`}
    >
      {label}
    </button>
  );

  const dropItem = (page, label) => (
    <button
      key={page}
      onClick={() => { setCurrentPage(page); setOpenMenu(null); }}
      className={`w-full text-left px-3 py-2 text-xs transition-colors ${currentPage === page ? 'bg-green-50 text-green-700 font-medium' : 'text-gray-700 hover:bg-gray-50'
        }`}
    >
      {label}
    </button>
  );

  return (
    <div className="fixed top-14 md:top-16 left-0 right-0 z-[51] bg-white border-t-2 border-t-green-600 border-b border-gray-200 shadow-sm">
      <div className="w-full px-2 md:px-4">
        <nav ref={navRef} className="flex items-center gap-0.5 md:gap-1 py-1 overflow-x-auto">
          {!employee && (
            <button
              onClick={() => setCurrentPage('dashboard')}
              className={`px-2 md:px-3 py-1 md:py-1.5 rounded text-[10px] md:text-xs transition-all shrink-0 inline-flex items-center gap-1 ${currentPage === 'dashboard' ? 'bg-green-600 text-white' : 'text-gray-600 hover:bg-gray-100'
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
              {navBtn('dashboard', 'Dashboard')}
              {navBtn('pos', 'POS')}
              {navBtn('kitchen', 'KDS')}

              <div className="relative shrink-0">
                <button
                  onClick={() => setCurrentPage('pos')}
                  className={`px-2 md:px-3 py-1 md:py-1.5 rounded text-[10px] md:text-xs transition-all ${currentPage === 'pos' ? 'bg-green-600 text-white' : 'text-gray-600 hover:bg-gray-100'
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

              {['admin', 'manager'].includes(employee.role) && navBtn('customers', 'Customers')}

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
function DashboardPage({ setCurrentPage, employee }) {
  const [salesData, setSalesData] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [topProducts, setTopProducts] = useState([]);
  const [revenueByCategory, setRevenueByCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('today'); // Default to Today
  const [currency, setCurrency] = useState('PHP'); // Default: PHP (all data stored in PHP)

  // Conversion rate (1 USD = 55 PHP) - Data is stored in PHP
  const PESO_RATE = 55;
  const formatCurrency = (amount) => {
    // Data is in PHP, convert only if viewing in USD
    const value = currency === 'USD' ? amount / PESO_RATE : amount;
    const symbol = currency === 'PHP' ? '₱' : '$';
    return `${symbol}${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const convertAmount = (amount) => {
    // Data is in PHP, convert only if viewing in USD
    return currency === 'USD' ? amount / PESO_RATE : amount;
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

        // Get date range based on timeframe
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

        // Fetch sales data from API
        const salesResponse = await fetchWithAuth(`${API_URL}/orders?include_items=true`);
        const salesResult = await salesResponse.json();

        if (salesResult.success && salesResult.orders) {
          const orders = Array.isArray(salesResult.orders) ? salesResult.orders : [];

          // Filter by timeframe
          const filteredOrders = orders.filter(order => {
            const orderDate = new Date(order.created_at);
            return orderDate >= startDate && orderDate <= today;
          });

          // Calculate metrics
          const totalRevenue = filteredOrders.reduce((sum, order) => sum + (parseFloat(order.total_amount) || 0), 0);
          const avgOrderValue = filteredOrders.length > 0 ? totalRevenue / filteredOrders.length : 0;
          const totalOrders = filteredOrders.length;
          const totalItems = filteredOrders.reduce((sum, o) => sum + (o.items?.length || 1), 0);
          const avgOrderSize = filteredOrders.length > 0 ? totalItems / filteredOrders.length : 0;

          setMetrics({
            totalRevenue,
            avgOrderValue,
            totalOrders,
            avgOrderSize: avgOrderSize.toFixed(1)
          });

          // Group sales by date for chart (last 7 days or based on timeframe)
          const dateMap = {};
          const daysToShow = timeframe === 'today' ? 1 : timeframe === 'week' ? 7 : timeframe === 'month' ? 30 : 12;

          filteredOrders.forEach(order => {
            const date = new Date(order.created_at);
            const dateKey = timeframe === 'year'
              ? date.toLocaleString('en-US', { month: 'short', year: '2-digit' })
              : date.toLocaleDateString();
            dateMap[dateKey] = (dateMap[dateKey] || 0) + (parseFloat(order.total_amount) || 0);
          });

          const sortedDates = Object.keys(dateMap).sort();
          const chartData = sortedDates.slice(-daysToShow).map(d => convertAmount(dateMap[d]));

          setSalesData({
            labels: sortedDates.slice(-daysToShow),
            datasets: [{
              label: timeframe === 'today' ? `Hourly Revenue (${currency})` : `Daily Revenue (${currency})`,
              data: chartData,
              borderColor: '#007A33',
              backgroundColor: 'rgba(0, 122, 51, 0.15)',
              borderWidth: 2,
              fill: true,
              tension: 0.4,
              pointRadius: 4,
              pointBackgroundColor: '#007A33',
              pointBorderColor: '#fff',
              pointBorderWidth: 2
            }]
          });

          // Calculate revenue by category
          const categoryMap = {};
          filteredOrders.forEach(order => {
            if (order.items && Array.isArray(order.items)) {
              order.items.forEach(item => {
                const category = item.category || 'Other';
                const itemRevenue = parseFloat(item.subtotal || item.unit_price * item.quantity || 0);
                console.log('Category item:', { category, subtotal: item.subtotal, unit_price: item.unit_price, quantity: item.quantity, itemRevenue });
                categoryMap[category] = (categoryMap[category] || 0) + itemRevenue;
              });
            }
          });

          console.log('FINAL Category Map:', categoryMap);

          const categoryNames = Object.keys(categoryMap).sort((a, b) => categoryMap[b] - categoryMap[a]);
          setRevenueByCategory({
            labels: categoryNames.length > 0 ? categoryNames : ['No Data'],
            datasets: [{
              label: `Revenue by Category (${currency})`,
              data: categoryNames.length > 0 ? categoryNames.map(c => categoryMap[c]) : [0],
              backgroundColor: [
                '#007A33',
                '#00A34A',
                '#008C3C',
                '#006129',
                '#66C299',
                '#004D20',
                '#00B856',
                '#1ABC9C'
              ],
              borderColor: '#fff',
              borderWidth: 2
            }]
          });

          // Find top products
          const productMap = {};
          filteredOrders.forEach(order => {
            if (order.items && Array.isArray(order.items)) {
              order.items.forEach(item => {
                const key = item.product_name || 'Unknown Product';
                const itemRevenue = parseFloat(item.subtotal || item.unit_price * item.quantity || 0);
                if (!productMap[key]) {
                  productMap[key] = { name: key, quantity: 0, revenue: 0 };
                }
                productMap[key].quantity += (item.quantity || 1);
                productMap[key].revenue += itemRevenue;
              });
            }
          });

          const topProds = Object.values(productMap)
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5)
            .map(p => ({
              ...p,
              revenue: convertAmount(p.revenue)
            }));
          setTopProducts(topProds);
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
                ? 'bg-gradient-to-r from-green-600 to-green-700 text-white shadow-lg transform scale-105'
                : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-green-600 hover:text-green-600'
                }`}
            >
              {tf === 'today' ? '🕒 Today' : tf === 'week' ? '📅 Week' : tf === 'month' ? '📆 Month' : '📊 Year'}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-green-600"></div>
            <p className="text-gray-600 mt-4 text-lg">Loading dashboard data...</p>
          </div>
        ) : (
          <>
            {/* Key Metrics - Professional Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
              <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-lg p-6 border-t-4 border-t-green-600 hover:shadow-xl transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-gray-600 text-sm font-bold uppercase tracking-wide">Total Sales</p>
                  <span className="text-2xl">💰</span>
                </div>
                <h3 className="text-3xl font-bold text-gray-900 mb-2">{formatCurrency(metrics?.totalRevenue || 0)}</h3>
                <p className="text-green-600 text-sm font-semibold">📈 Period Total</p>
              </div>

              <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-lg p-6 border-t-4 border-t-blue-600 hover:shadow-xl transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-gray-600 text-sm font-bold uppercase tracking-wide">Transactions</p>
                  <span className="text-2xl">📦</span>
                </div>
                <h3 className="text-3xl font-bold text-gray-900 mb-2">{metrics?.totalOrders || 0}</h3>
                <p className="text-blue-600 text-sm font-semibold">📊 Total Orders</p>
              </div>

              <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-lg p-6 border-t-4 border-t-purple-600 hover:shadow-xl transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-gray-600 text-sm font-bold uppercase tracking-wide">Avg Order Value</p>
                  <span className="text-2xl">💵</span>
                </div>
                <h3 className="text-3xl font-bold text-gray-900 mb-2">{formatCurrency(metrics?.avgOrderValue || 0)}</h3>
                <p className="text-purple-600 text-sm font-semibold">💳 Per Transaction</p>
              </div>

              <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-lg p-6 border-t-4 border-t-orange-600 hover:shadow-xl transition-shadow">
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
              <div className="lg:col-span-2 bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition-shadow border border-gray-100">
                <h3 className="text-xl font-bold text-gray-900 mb-2">📈 Sales Trend</h3>
                <p className="text-gray-600 text-sm mb-6">Daily revenue analysis ({currency})</p>
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
              <div className="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition-shadow border border-gray-100">
                <h3 className="text-xl font-bold text-gray-900 mb-2">🎯 Revenue by Category</h3>
                <p className="text-gray-600 text-sm mb-6">Category breakdown ({currency})</p>
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

            {/* Top Products & Recommendations */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Products */}
              <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100">
                <h3 className="text-xl font-bold text-gray-900 mb-2">🏆 Top Performing Products</h3>
                <p className="text-gray-600 text-sm mb-6">Revenue leaders ({currency})</p>
                {topProducts.length > 0 ? (
                  <div className="space-y-4">
                    {topProducts.map((prod, idx) => (
                      <div key={idx} className="p-4 bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-200 hover:border-green-600 hover:shadow-md transition-all">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <div className="text-sm font-bold text-gray-600">#{idx + 1}</div>
                            <p className="font-bold text-gray-900 text-lg">{prod.name}</p>
                            <p className="text-sm text-gray-600">{prod.quantity} units sold</p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-green-600">{formatCurrency(prod.revenue)}</p>
                          </div>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-green-500 to-green-600 h-2.5 rounded-full"
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

              {/* Smart Recommendations */}
              <div className="bg-gradient-to-br from-blue-50 via-green-50 to-emerald-50 rounded-xl shadow-lg p-8 border-2 border-green-200">
                <h3 className="text-xl font-bold text-gray-900 mb-2">💡 Smart Recommendations</h3>
                <p className="text-gray-600 text-sm mb-6">AI-powered business insights</p>
                <div className="space-y-4">
                  <div className="p-4 bg-white rounded-lg border-l-4 border-l-green-600 shadowhover:shadow-md transition-all">
                    <p className="font-bold text-gray-900">✅ Tracks all sales & operations data</p>
                    <p className="text-sm text-gray-600 mt-1">Every transaction is automatically recorded and analyzed real-time</p>
                  </div>
                  <div className="p-4 bg-white rounded-lg border-l-4 border-l-blue-600 hover:shadow-md transition-all">
                    <p className="font-bold text-gray-900">✅ Shows real-time metrics & trends</p>
                    <p className="text-sm text-gray-600 mt-1">{topProducts.length > 0 ? `📍 Top product: "${topProducts[0].name}" - ${formatCurrency(topProducts[0].revenue)} revenue` : '📊 Data updates every 30 seconds'}</p>
                  </div>
                  <div className="p-4 bg-white rounded-lg border-l-4 border-l-purple-600 hover:shadow-md transition-all">
                    <p className="font-bold text-gray-900">✅ Makes smart recommendations</p>
                    <p className="text-sm text-gray-600 mt-1">{metrics?.avgOrderValue > 50 ? '🚀 High AOV - Premium upsell strategy' : '📈 Increase transaction frequency'}</p>
                  </div>
                  <div className="p-4 bg-white rounded-lg border-l-4 border-l-orange-600 hover:shadow-md transition-all">
                    <p className="font-bold text-gray-900">✅ Predicts future needs</p>
                    <p className="text-sm text-gray-600 mt-1">{metrics?.totalOrders > 50 ? '📦 Stock inventory for high demand' : '📍 Monitor popular items'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Business Intelligence Insights */}
            <div className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-l-blue-600 rounded-xl p-8 shadow-lg">
              <h3 className="text-xl font-bold text-gray-900 mb-6">📊 Business Intelligence Insights</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white rounded-lg p-6 border border-blue-200">
                  <p className="font-bold text-gray-900 mb-4 text-lg">📈 Performance Metrics</p>
                  <ul className="space-y-3 text-sm text-gray-700">
                    <li className="flex items-center gap-2">
                      <span className="text-green-600 font-bold">•</span>
                      <span>Avg transaction: <strong>{formatCurrency(metrics?.avgOrderValue || 0)}</strong></span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-600 font-bold">•</span>
                      <span>Items per order: <strong>{metrics?.avgOrderSize} items</strong></span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-600 font-bold">•</span>
                      <span>Total period sales: <strong>{metrics?.totalOrders} orders</strong></span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-600 font-bold">•</span>
                      <span>Total Sales: <strong>{formatCurrency(metrics?.totalRevenue || 0)}</strong></span>
                    </li>
                  </ul>
                </div>
                <div className="bg-white rounded-lg p-6 border border-indigo-200">
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
  const popularItems = menuData.filter(item => item.popular && item.active !== false).slice(0, 6);
  const [currentSlide, setCurrentSlide] = useState(0);

  const heroSlides = [
    {
      title: "TASTE THE SUCCESS",
      subtitle: "DELIVERED FAST!",
      description: "Order your favorite meals and get them delivered hot and fresh",
      bgImage: "assets/images/hero/hero1.jpg"
    },
    {
      title: "FRESH & DELICIOUS",
      subtitle: "EVERY TIME!",
      description: "Made with quality ingredients, cooked with passion",
      bgImage: "assets/images/hero/hero1.jpg"
    },
    {
      title: "30 MINUTES OR LESS",
      subtitle: "GUARANTEED!",
      description: "Fast delivery right to your doorstep",
      bgImage: "assets/images/hero/hero1.jpg"
    },
    {
      title: "ORDER NOW",
      subtitle: "PAY LATER!",
      description: "Multiple payment options available for your convenience",
      bgImage: "assets/images/hero/hero1.jpg"
    }
  ];

  // Auto-rotate carousel every 4 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + heroSlides.length) % heroSlides.length);
  };

  const goToSlide = (index) => {
    setCurrentSlide(index);
  };

  return (
    <div>
      {/* Hero Carousel Section - overlaps with transparent header */}
      <section className="relative overflow-hidden">
        <div className="relative h-[450px] md:h-[550px]">
          {heroSlides.map((slide, index) => (
            <div
              key={index}
              className={`absolute inset-0 text-white transition-all duration-700 ease-in-out transform ${index === currentSlide
                ? 'translate-x-0 opacity-100'
                : index < currentSlide
                  ? '-translate-x-full opacity-0'
                  : 'translate-x-full opacity-0'
                }`}
              style={{
                backgroundImage: `url(${slide.bgImage})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}
            >
              <div className="absolute inset-0 bg-black bg-opacity-50"></div>
              <div className="relative w-full px-8 h-full flex flex-col justify-center items-center text-center pt-16">
                <h1 className="text-3xl md:text-5xl font-black mb-4 drop-shadow-lg animate-fadeIn">
                  {slide.title}
                  <br />
                  <span className="text-yellow-300">{slide.subtitle}</span>
                </h1>
                <p className="text-sm md:text-lg mb-8 text-white font-bold animate-fadeIn">
                  {slide.description}
                </p>
                <button
                  onClick={() => setCurrentPage('menu')}
                  className="bg-yellow-400 text-gray-900 px-8 py-4 rounded-lg text-sm font-black hover:bg-yellow-300 transition-all shadow-xl hover:shadow-2xl inline-flex items-center space-x-2 tracking-wider animate-fadeIn hover:scale-105"
                >
                  <span>ORDER NOW</span>
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Navigation Arrows */}
        <button
          onClick={prevSlide}
          className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/30 hover:bg-white/50 backdrop-blur-sm text-white p-3 rounded-full transition-all z-10 hover:scale-110"
          aria-label="Previous slide"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button
          onClick={nextSlide}
          className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/30 hover:bg-white/50 backdrop-blur-sm text-white p-3 rounded-full transition-all z-10 hover:scale-110"
          aria-label="Next slide"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Dots Navigation */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex space-x-3 z-10">
          {heroSlides.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`transition-all duration-300 rounded-full ${index === currentSlide
                ? 'bg-white w-8 h-3'
                : 'bg-white/50 hover:bg-white/75 w-3 h-3'
                }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </section>

      {/* Popular Items */}
      <section className="bg-gray-50 py-12 sm:py-16">
        <div className="w-full px-8">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-green-600 mb-8 sm:mb-12 text-center drop-shadow-lg">⭐ POPULAR NOW</h2>
          {isLoading ? (
            <div className="text-center py-16">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mb-4"></div>
              <p className="text-xl text-green-600 font-bold">Loading popular items...</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {popularItems.map(item => (
                  <PopularItemCard key={item.id} item={item} />
                ))}
              </div>
              <div className="text-center mt-8 sm:mt-12">
                <button
                  onClick={() => setCurrentPage('menu')}
                  className="bg-red-600 text-white px-8 py-3 rounded-lg font-black hover:bg-red-700 transition-all shadow-lg text-sm tracking-wider"
                >
                  VIEW FULL MENU
                </button>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Features & Contact Info */}
      <section className="bg-gray-50 py-2">
        <div className="w-full px-8">
          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center mb-16">
            <div className="bg-green-600 p-8 rounded-xl shadow-lg hover:shadow-xl transition-all">
              <div className="text-6xl mb-4">🚀</div>
              <h3 className="text-xl font-black text-white mb-2">FAST DELIVERY</h3>
              <p className="text-green-100 font-bold">Get your food delivered in 30 minutes or less</p>
            </div>
            <div className="bg-green-600 p-8 rounded-xl shadow-lg hover:shadow-xl transition-all">
              <div className="text-6xl mb-4">👨‍🍳</div>
              <h3 className="text-xl font-black text-white mb-2">FRESH FOOD</h3>
              <p className="text-green-100 font-bold">Made fresh daily with quality ingredients</p>
            </div>
            <div className="bg-green-600 p-8 rounded-xl shadow-lg hover:shadow-xl transition-all">
              <div className="text-6xl mb-4">⭐</div>
              <h3 className="text-xl font-black text-white mb-2">BEST QUALITY</h3>
              <p className="text-green-100 font-bold">Rated 4.9/5 by our satisfied customers</p>
            </div>
          </div>

          {/* Contact & Info Section */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-left border-t-2 border-green-300 pt-6">
            {/* About */}
            <div>
              <h4 className="text-xl font-black text-green-600 mb-4">ABOUT US</h4>
              <p className="text-gray-700 text-sm leading-relaxed">
                Kuchefnero delivers delicious food right to your doorstep. Quality ingredients, fast service, and satisfied customers since 2020.
              </p>
            </div>

            {/* Contact */}
            <div>
              <h4 className="text-xl font-black text-green-600 mb-4">CONTACT</h4>
              <div className="space-y-3 text-gray-700 text-sm">
                <div className="flex items-start space-x-2">
                  <span>📍</span>
                  <span>Cantecson,Gairan,Bogo,Cebu,Philippines</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span>📞</span>
                  <span>+63 912 345 6789</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span>📧</span>
                  <span>hello@kuchefnero.com</span>
                </div>
              </div>
            </div>

            {/* Hours */}
            <div>
              <h4 className="text-xl font-black text-green-600 mb-4">HOURS</h4>
              <div className="space-y-2 text-gray-700 text-sm">
                <div className="flex justify-between">
                  <span>Monday - Friday:</span>
                  <span>9AM - 11PM</span>
                </div>
                <div className="flex justify-between">
                  <span>Saturday:</span>
                  <span>10AM - 12AM</span>
                </div>
                <div className="flex justify-between">
                  <span>Sunday:</span>
                  <span>10AM - 10PM</span>
                </div>
              </div>
            </div>

            {/* Social Links */}
            <div>
              <h4 className="text-xl font-black text-green-600 mb-4">FOLLOW US</h4>
              <div className="flex space-x-4 mb-4">
                <a href="#" className="w-10 h-10 bg-green-600 hover:bg-green-500 rounded-full flex items-center justify-center text-white text-xl transition-all">
                  📘
                </a>
                <a href="#" className="w-10 h-10 bg-green-600 hover:bg-green-500 rounded-full flex items-center justify-center text-white text-xl transition-all">
                  📷
                </a>
                <a href="#" className="w-10 h-10 bg-green-600 hover:bg-green-500 rounded-full flex items-center justify-center text-white text-xl transition-all">
                  🐦
                </a>
              </div>
              <div className="text-gray-700 text-sm">
                <p className="mb-2">Subscribe to our newsletter:</p>
                <div className="flex space-x-2">
                  <input
                    type="email"
                    placeholder="Your email"
                    className="flex-1 px-3 py-2 rounded-lg text-gray-800 text-xs font-bold"
                  />
                  <button className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-black text-xs transition-all">
                    GO
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Bottom */}
          <div className="border-t-2 border-green-300 mt-12 pt-8">
            {/* Staff Links */}
            <div className="flex justify-center gap-6 mb-4">
              <button
                onClick={() => setCurrentPage('dashboard')}
                className="text-gray-600 hover:text-green-600 transition-all text-sm font-medium flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Staff Login
              </button>
              <button
                onClick={() => setCurrentPage('pos')}
                className="text-gray-600 hover:text-green-600 transition-all text-sm font-medium flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                POS
              </button>
              <button
                onClick={() => setCurrentPage('settings-general')}
                className="text-gray-600 hover:text-green-600 transition-all text-sm font-medium flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Settings
              </button>
            </div>
            {/* Copyright */}
            <p className="text-gray-600 text-sm text-center">
              © 2026 Kuchefnero. All rights reserved. |
              <a href="#" className="hover:text-green-600 transition-all ml-1">Privacy Policy</a> |
              <a href="#" className="hover:text-green-600 transition-all ml-1">Terms of Service</a>
            </p>
          </div>
        </div>
      </section>
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
          <h3 className="text-base sm:text-lg md:text-xl font-bold text-green-600">{item.name}</h3>
          <span className="bg-green-600 text-white px-3 py-1 rounded-full text-xs font-black whitespace-nowrap">POPULAR</span>
        </div>
        <p className="text-gray-600 text-sm sm:text-base mb-3 line-clamp-2 font-normal">{item.description}</p>
        <div className="flex items-center justify-between gap-2">
          {item.sizes ? (
            <span className="text-sm sm:text-base md:text-lg font-semibold text-green-600 whitespace-nowrap flex-shrink-0">
              From Php {Math.min(...item.sizes.map(s => s.price)).toFixed(2)}
            </span>
          ) : (
            <span className="text-sm sm:text-base md:text-lg font-semibold text-green-600 whitespace-nowrap flex-shrink-0">Php {item.price.toFixed(2)}</span>
          )}
          <button
            onClick={() => addToCart(item)}
            className="bg-green-600 text-white px-4 sm:px-5 py-3 rounded-lg hover:bg-green-700 transition-all flex items-center space-x-1 font-bold text-sm hover:scale-105 whitespace-nowrap flex-shrink-0"
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
                  ? 'bg-green-600 text-white'
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
        <h1 className="text-2xl sm:text-3xl font-semibold text-green-600 mb-6 sm:mb-8 text-center">OUR MENU</h1>

        {isLoading ? (
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mb-4"></div>
            <p className="text-xl text-green-600 font-bold">Loading menu...</p>
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
          <span className="absolute top-1 right-1 bg-green-600 text-white px-2 py-1 rounded-full text-xs font-black">
            HOT
          </span>
        )}
      </div>

      {/* Right side - Product Details */}
      <div className="p-4 sm:p-5 md:p-6 flex flex-col justify-start flex-1 min-w-0">
        <div className="mb-4">
          <h3 className="text-base sm:text-lg md:text-xl font-bold text-green-600 mb-2 break-words">{item.name}</h3>
          <p className="text-gray-600 text-sm sm:text-base mb-3 line-clamp-2 font-normal">{item.description}</p>
        </div>
        <div className="flex flex-col gap-2 mt-auto">
          {item.sizes ? (
            <span className="text-sm sm:text-base md:text-lg font-semibold text-green-600 break-words">
              From Php {Math.min(...item.sizes.map(s => s.price)).toFixed(2)}
            </span>
          ) : (
            <span className="text-sm sm:text-base md:text-lg font-semibold text-green-600 break-words">Php {item.price.toFixed(2)}</span>
          )}
          <button
            onClick={() => addToCart(item)}
            className="bg-green-600 text-white px-4 sm:px-5 py-3 rounded-lg hover:bg-green-700 transition-all flex items-center justify-center space-x-1 text-sm font-bold hover:scale-105 w-full whitespace-nowrap"
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
                className="w-full bg-green-600 text-white py-4 rounded-full font-bold hover:bg-green-700 transition-all"
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
            className="bg-green-600 text-white px-6 py-2.5 rounded-md text-sm font-medium hover:bg-green-700 transition-all"
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
                    <span className="text-green-600">Php {total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setCurrentPage('checkout')}
                className="w-full bg-green-600 text-white py-3 md:py-2.5 rounded-md text-sm font-medium hover:bg-green-700 transition-all"
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
        <p className="text-green-600 font-medium text-sm">Php {item.price.toFixed(2)}</p>
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
          className="bg-green-600 hover:bg-green-700 text-white rounded-md p-1.5 transition-all"
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
                    className="w-full px-3 py-2 rounded-md border border-gray-300 focus:border-green-500 focus:outline-none text-sm"
                  />
                  <input
                    type="email"
                    placeholder="Email (optional)"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-md border border-gray-300 focus:border-green-500 focus:outline-none text-sm"
                  />
                  <input
                    type="tel"
                    placeholder="Phone Number"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-md border border-gray-300 focus:border-green-500 focus:outline-none text-sm"
                  />
                  <input
                    type="text"
                    placeholder="ZIP Code (optional)"
                    value={formData.zipCode}
                    onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                    className="w-full px-3 py-2 rounded-md border border-gray-300 focus:border-green-500 focus:outline-none text-sm"
                  />
                </div>
                <input
                  type="text"
                  placeholder="Street Address"
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 rounded-md border border-gray-300 focus:border-green-500 focus:outline-none text-sm mt-3"
                />
                <input
                  type="text"
                  placeholder="City"
                  required
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full px-3 py-2 rounded-md border border-gray-300 focus:border-green-500 focus:outline-none text-sm mt-3"
                />
              </div>

              {/* Notification Subscription Prompt */}
              {notificationStatus === 'checking' && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-600"></div>
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
                          className="bg-green-600 text-white px-4 py-2 rounded-md text-xs font-medium hover:bg-green-700 transition-all flex items-center gap-2"
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
                    {scannerError && (
                      <div className="px-4 pb-3">
                        <button
                          onClick={() => { setScannerError(''); setScannerErrorDetail(''); startScanner(); }}
                          className="text-xs px-3 py-1 rounded bg-green-600 text-white hover:bg-green-700"
                        >
                          Retry camera
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {notificationStatus === 'subscribed' && (
                <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">✅</div>
                    <div>
                      <h4 className="font-medium text-green-700 text-sm">Notifications Enabled</h4>
                      <p className="text-xs text-green-600">You'll receive updates when your order status changes!</p>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-base font-medium text-gray-700 mb-4">Payment Method</h3>
                <div className="space-y-2">
                  <label className={`flex items-center space-x-3 p-3 border rounded-md cursor-pointer transition-all ${formData.paymentMethod === 'cash' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:bg-gray-50'
                    }`}>
                    <input
                      type="radio"
                      name="payment"
                      value="cash"
                      checked={formData.paymentMethod === 'cash'}
                      onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value, paymentReference: '' })}
                      className="w-4 h-4 text-green-600"
                    />
                    <span className="text-sm text-gray-700">Cash on Delivery</span>
                  </label>

                  <label className={`flex items-center space-x-3 p-3 border rounded-md cursor-pointer transition-all ${formData.paymentMethod === 'gcash' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:bg-gray-50'
                    }`}>
                    <input
                      type="radio"
                      name="payment"
                      value="gcash"
                      checked={formData.paymentMethod === 'gcash'}
                      onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                      className="w-4 h-4 text-green-600"
                    />
                    <span className="text-sm text-gray-700">GCash</span>
                  </label>

                  <label className={`flex items-center space-x-3 p-3 border rounded-md cursor-pointer transition-all ${formData.paymentMethod === 'bank' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:bg-gray-50'
                    }`}>
                    <input
                      type="radio"
                      name="payment"
                      value="bank"
                      checked={formData.paymentMethod === 'bank'}
                      onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                      className="w-4 h-4 text-green-600"
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
                  <div className="mt-4 bg-green-50 border border-green-200 rounded-md p-4">
                    <h4 className="font-medium text-gray-700 text-sm mb-3">GCash Payment</h4>
                    <div className="space-y-3">
                      <div className="bg-white rounded-md p-3 border border-green-100">
                        <p className="text-xs text-gray-500 mb-1">Amount to pay:</p>
                        <p className="text-lg font-medium text-green-600">Php {(getTotalPrice() + 4.99 + getTotalPrice() * (parseFloat(taxRate || 0) / 100)).toFixed(2)}</p>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        <span>Secure payment via PayMongo</span>
                      </div>
                      <div className="text-xs text-gray-600 bg-white rounded-md p-3 border border-green-100">
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
                        <p className="text-xs text-gray-600">Account Name: Kuchefnero Restaurant</p>
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
                  : 'bg-green-600 text-white hover:bg-green-700'
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
                    <span className="text-green-600">Php {total.toFixed(2)}</span>
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
        <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
          <CheckIcon />
        </div>
      );
    }
    if (isStepCurrent(step)) {
      return (
        <div className="w-6 h-6 rounded-full border-2 border-green-500 flex items-center justify-center flex-shrink-0">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        </div>
      );
    }
    return <div className="w-6 h-6 rounded-full border-2 border-gray-300 flex-shrink-0"></div>;
  };

  const stepLineColor = (step) => isStepDone(step) ? 'bg-green-500' : 'bg-gray-200';

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="w-full px-8">
        {/* Header */}
        <div className="text-center mb-6">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 ${orderStatus === 'completed' ? 'bg-green-500' : 'bg-green-500'}`}>
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
        <div className="bg-green-600 rounded-lg p-4 mb-6 text-center">
          <div className="text-xs text-green-200 mb-1">Order Number</div>
          <div className="text-xl font-medium text-white">{displayOrderNumber}</div>
        </div>

        {/* Order Status - Live Timeline */}
        <div className="bg-white rounded-lg p-5 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-medium text-gray-800">Order Status</h3>
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${orderStatus === 'completed' ? 'bg-green-100 text-green-700' :
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
                <div className={`text-sm font-medium ${isStepDone('completed') ? 'text-green-600' : 'text-gray-400'}`}>
                  {orderStatus === 'completed' ? 'Order is Ready!' : 'Ready for pickup/serving'}
                </div>
                <div className={`text-xs ${isStepDone('completed') ? 'text-green-500' : 'text-gray-400'}`}>
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
            className="w-full bg-white text-green-700 border border-green-200 py-3 rounded-md text-sm font-bold hover:bg-green-50 transition-all flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print Receipt
          </button>

          <div className="flex gap-3">
            <button
              onClick={() => setCurrentPage('home')}
              className="flex-1 bg-green-600 text-white py-2.5 rounded-md text-sm font-medium hover:bg-green-700 transition-all"
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
            className="w-full bg-green-600 text-white py-2.5 rounded-md text-sm font-medium hover:bg-green-700 transition-all"
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
  const [loginStep, setLoginStep] = useState(() => {
    return localStorage.getItem('active_company_id') ? 'employee' : 'company';
  });

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
    setIsLoading(true);
    try {
      let endpoint = `${API_URL}/auth/login`;
      let body = { pin: enteredPin, company_id };
      if (enteredPin === ADMIN_TRIGGER_PIN) {
        endpoint = `${API_URL}/auth/admin-login`;
        body = { trigger: true };
      }
      const response = await fetchWithAuth(endpoint, {
        method: 'POST',
        body: JSON.stringify(body)
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
            <div className="h-0.5 w-8 bg-green-600 mx-auto my-2 rounded-full" />
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em] opacity-80">
              {loginStep === 'company' ? 'Enter 6-digit access code' : 'Enter 4-digit PIN'}
            </p>
            
            {loginStep === 'employee' && localStorage.getItem('active_company_name') && (
              <div className="mt-2 flex flex-col items-center animate-fadeIn">
                <p className="text-gray-900 text-xs font-black tracking-tight">{localStorage.getItem('active_company_name')}</p>
                <button onClick={handleSwitchStore} className="text-[8px] font-black text-green-600 uppercase tracking-widest mt-0.5 hover:text-green-700 transition-colors">
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
                className={`w-3 h-3 rounded-full border-2 transition-all duration-300 ${
                  i < pin.length
                    ? 'bg-green-600 border-green-600 scale-110 shadow-lg shadow-green-100'
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
              <div className="flex items-center gap-1.5 bg-green-50 px-3 py-1 rounded-full border border-green-100 animate-pulse">
                <div className="w-1.5 h-1.5 bg-green-600 rounded-full" />
                <p className="text-[9px] text-green-700 font-black uppercase tracking-widest">Validating...</p>
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
               className="text-[9px] font-black text-green-600 uppercase tracking-widest hover:text-green-700 transition-all bg-green-50/50 px-4 py-1.5 rounded-full border border-green-100/50 shadow-sm active:scale-95"
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
        <div className="hidden md:flex w-[38%] bg-gradient-to-br from-green-700 to-green-900 p-6 flex-col justify-between relative overflow-hidden">
          {/* Decorative background elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full -ml-24 -mb-24" />
          
          <div className="relative z-10">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-2xl rotate-3 mb-4">
              <span className="text-xl font-black text-green-700">K</span>
            </div>
            <h1 className="text-xl font-black text-white tracking-tight uppercase leading-none">Nero POS</h1>
            <p className="text-green-200 text-[9px] font-bold tracking-widest uppercase mt-1.5 opacity-80">Management Portal</p>
          </div>

          <div className="relative z-10 space-y-4">
            <div className="flex items-center gap-3 text-white/50">
              <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">
                <Check className="w-3 h-3 text-green-200" />
              </div>
              <p className="text-[8px] font-black uppercase tracking-widest">Enterprise Secure</p>
            </div>
            <div className="p-4 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm">
              <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mb-1 italic">V1.0 - Stable</p>
              <p className="text-[8px] text-white/30 leading-tight mb-3">Terminal ID: {Math.random().toString(36).substring(7).toUpperCase()}</p>
              
              <div className="pt-3 border-t border-white/10">
                <p className="text-white text-[8px] font-black mb-1.5 uppercase tracking-widest opacity-60">System Status</p>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.5)]" />
                  <span className="text-[9px] text-green-200 font-black uppercase tracking-widest">Network Connected</span>
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
          <div className="h-0.5 w-12 bg-green-600 mx-auto my-3 rounded-full" />
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Start managing your business today</p>
        </div>
        <form onSubmit={handleSubmit} className="px-8 md:px-12 pb-12 space-y-6">
          <div className="space-y-4">
            <input required type="text" placeholder="Company Name" className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold focus:bg-white focus:border-green-500 outline-none transition-all" onChange={e => setFormData({...formData, companyName: e.target.value})} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input required type="text" placeholder="Owner Name" className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold focus:bg-white focus:border-green-500 outline-none transition-all" onChange={e => setFormData({...formData, ownerName: e.target.value})} />
              <input required type="text" maxLength={4} placeholder="Store PIN (4-digit)" className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-center font-black focus:bg-white focus:border-green-500 outline-none transition-all" onChange={e => setFormData({...formData, pin: e.target.value})} />
            </div>
            <input required type="email" placeholder="Management Email" className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold focus:bg-white focus:border-green-500 outline-none transition-all" onChange={e => setFormData({...formData, email: e.target.value})} />
            <input required type="password" placeholder="Portal Password" className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold focus:bg-white focus:border-green-500 outline-none transition-all" onChange={e => setFormData({...formData, password: e.target.value})} />
          </div>
          {error && <div className="bg-red-50 text-red-500 text-[10px] font-black uppercase p-4 rounded-2xl text-center border border-red-100">{error}</div>}
          <div className="pt-4 flex flex-col gap-4">
            <button type="submit" disabled={isLoading} className="w-full py-4 bg-green-600 text-white rounded-2xl font-black uppercase text-xs hover:bg-green-700 transition-all shadow-xl shadow-green-600/20 active:scale-95">
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
            <User className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight uppercase">Owner Login</h2>
          <div className="h-0.5 w-12 bg-green-600 mx-auto my-3 rounded-full" />
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Manage Establishment</p>
        </div>
        <form onSubmit={handleSubmit} className="px-10 pb-12 space-y-5">
          <div className="space-y-4">
            <input required type="email" placeholder="Admin Email" className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold focus:bg-white focus:border-green-500 outline-none transition-all" value={email} onChange={e => setEmail(e.target.value)} />
            <input required type="password" placeholder="Password" className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold focus:bg-white focus:border-green-500 outline-none transition-all" value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          {error && <div className="bg-red-50 text-red-500 text-[10px] font-black uppercase p-4 rounded-xl text-center border border-red-100">{error}</div>}
          <div className="pt-4 flex flex-col gap-4">
            <button type="submit" disabled={isLoading} className="w-full py-4 bg-green-600 text-white rounded-2xl font-black uppercase text-xs hover:bg-green-700 transition-all shadow-xl shadow-green-600/20 active:scale-95">
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
          Logged in as: <span className="font-semibold text-green-700">{employee?.name}</span>
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
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100"
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
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100 resize-none"
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
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-green-400 font-medium transition-colors"
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
              <span className="text-green-600">{money(expectedCash || 0)}</span>
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
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500 text-lg"
              placeholder="0.00"
              required
              autoFocus
            />
          </div>

          {/* Variance Badge */}
          {closingCash && (
            <div className={`p-3 rounded-lg ${variance === 0 ? 'bg-green-50 text-green-800' :
              Math.abs(variance) <= 5 ? 'bg-green-50 text-green-800' :
                Math.abs(variance) <= 50 ? 'bg-amber-50 text-amber-800' :
                  'bg-red-50 text-red-800'
              }`}>
              <div className="flex justify-between items-center font-medium">
                <span>Variance:</span>
                <span className={
                  variance >= 0 ? 'text-green-600' :
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
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500"
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
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="bg-green-600 text-white p-4 rounded-t-xl sticky top-0">
          <h2 className="text-xl font-bold">Shift Report</h2>
          <p className="text-green-100 text-sm">{report.employee_name}</p>
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
                <span className="text-green-600">Php {(report.total_sales || 0).toFixed(2)}</span>
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
              <div className={`flex justify-between font-bold pt-2 border-t ${report.cash_variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
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
            className="w-full py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
          >
            Close Report
          </button>
        </div>
      </div>
    </div>
  );
}

// POS (Point of Sale) Page
function POSPage({ menuData, isLoading, currentShift, employee, onEndShift, onStartShift, onRefreshShift, categories, taxRate, currencySymbol, formatMoney, lastOrderData, setLastOrderData }) {
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

  // Note editing state
  const [editingNoteIndex, setEditingNoteIndex] = useState(null);

  // Success overlay state
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);
  const [successOrderNumber, setSuccessOrderNumber] = useState('');
  const [successChange, setSuccessChange] = useState(0);
  const [successMessage, setSuccessMessage] = useState('');

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

  // Auto-print logic when success overlay is shown
  useEffect(() => {
    if (showSuccessOverlay && lastOrderData) {
      const handleAutoPrint = async () => {
        // 1. Kitchen Slip
        if (sysConfig.printer_auto_kitchen === 'true') {
          setPrintMode('kitchen');
          await new Promise(r => setTimeout(r, 600)); // Render delay
          window.print();
        }

        // 2. Customer Receipt
        if (sysConfig.printer_auto_receipt === 'true') {
          setPrintMode('receipt');
          await new Promise(r => setTimeout(r, 800)); // Render delay
          window.print();
        }
      };

      const timer = setTimeout(() => {
        handleAutoPrint();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [showSuccessOverlay]);

  // Fetch tables
  const fetchTables = async () => {
    try {
      const response = await fetchWithAuth(`${API_URL}/tables`);
      const result = await response.json();
      if (result.success) setTables(result.tables);
    } catch (error) {
      console.error('Error fetching tables:', error);
    }
  };

  useEffect(() => {
    fetchTables();
    const interval = setInterval(fetchTables, 10000);
    return () => clearInterval(interval);
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
      } else {
        alert(result.error || 'Failed to open check');
      }
    } catch (error) {
      console.error('Error opening check:', error);
      alert('Failed to open check');
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

  // Search customer by phone
  const searchCustomer = async (phone) => {
    if (phone.length < 3) {
      setCustomerSearchResults([]);
      return;
    }
    try {
      const response = await fetchWithAuth(`${API_URL}/customers/phone/${phone}`);
      const result = await response.json();
      if (result.success) {
        setCustomerSearchResults([result.customer]);
      } else {
        setCustomerSearchResults([]);
      }
    } catch (error) {
      setCustomerSearchResults([]);
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

  const filteredItems = menuData.filter(item => {
    const isActive = item.active !== false;
    const matchesSearch = !barcodeInput.trim() ||
      item.name.toLowerCase().includes(barcodeInput.toLowerCase()) ||
      (item.barcode && item.barcode.toLowerCase().includes(barcodeInput.toLowerCase())) ||
      (item.sku && item.sku.toLowerCase().includes(barcodeInput.toLowerCase()));
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    return isActive && matchesSearch && matchesCategory;
  });

  // Calculate discount amount
  const getDiscountAmount = () => {
    const subtotal = getTotalPrice();
    if (discountType === 'senior' || discountType === 'pwd') {
      return subtotal * 0.20; // 20% discount for senior/PWD
    } else if (discountType === 'loyalty') {
      return subtotal * 0.10; // 10% loyalty discount
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

        // Refresh shift sales
        if (onRefreshShift) onRefreshShift();

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
      <div className="bg-gray-200 h-screen overflow-hidden">
        <div className="flex flex-col-reverse md:flex-row h-full">
          {/* Left Panel - Menu Items */}
          <div className="w-full md:flex-1 flex flex-col overflow-hidden flex-1">
            {/* Barcode Scanner Input */}
            <form onSubmit={handleBarcodeSubmit} className="bg-white pt-5 pb-1.5 px-1.5 md:p-3 flex gap-1 md:gap-2 items-center">
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
                className="px-2 md:px-4 py-1.5 md:py-2 bg-green-600 text-white hover:bg-green-700 transition-colors font-medium text-xs md:text-base"
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
            </form>

            {/* Category Tabs (mobile-friendly scrollable bar) */}
            <div className="flex bg-gray-100 p-2 md:p-3 overflow-x-auto gap-2 scrollbar-hide border-b border-gray-200">
              {categories.map(category => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-3 md:px-4 py-1.5 md:py-2 rounded-md font-medium text-xs md:text-sm whitespace-nowrap transition-all ${selectedCategory === category
                    ? 'bg-green-600 text-white shadow-sm'
                    : 'bg-white text-gray-700 hover:bg-gray-200 border border-gray-200'
                    }`}
                >
                  {category.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Items Grid */}
            <div className="flex-1 overflow-y-auto p-2 md:p-4 bg-gray-200 scrollbar-hide">
              {isLoading ? (
                <div className="text-center py-16">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mb-4"></div>
                  <p className="text-lg text-green-600 font-medium">Loading menu...</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-1 md:gap-2">
                  {filteredItems.map(item => (
                    <button
                      key={item.id}
                      onClick={() => handleQuickAdd(item)}
                      className="bg-white hover:bg-gray-50 text-left transition-all hover:shadow-md border border-gray-200 hover:border-green-500 group flex overflow-hidden h-16 md:h-24"
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
                        <h3 className="text-gray-800 font-semibold text-xs md:text-sm leading-tight mb-0.5 md:mb-1 line-clamp-2">{item.name}</h3>
                        <p className="text-gray-500 text-[10px] md:text-xs line-clamp-1 md:line-clamp-2 hidden md:block">{item.description || item.category}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - Order Summary */}
          <div className="w-full md:w-80 lg:w-96 bg-white flex flex-col overflow-hidden h-[52vh] md:h-auto flex-shrink-0">
            {/* Header with Shift Info */}
            <div className={`${currentShift ? 'bg-green-600' : 'bg-yellow-600'} pt-5 pb-2 px-2 md:p-4 flex-shrink-0`}>
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  {showTableView ? (
                    <button onClick={() => setShowTableView(false)} className="text-white hover:text-green-200">
                      <ArrowLeft className="w-4 h-4 md:w-5 md:h-5" />
                    </button>
                  ) : null}
                  <div>
                    <h2 className="text-white font-bold text-sm md:text-lg">
                      {showTableView ? 'Tables' : selectedTable ? `Table ${selectedTable.table_number}` : 'Current Order'}
                    </h2>
                    <p className={`${currentShift ? 'text-green-100' : 'text-yellow-100'} text-xs md:text-sm`}>
                      {showTableView ? `${tables.filter(t => t.status === 'occupied').length} occupied` : `${cartItems.length} item(s)`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
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
                <div className="flex items-center justify-between mt-1 pt-1 border-t border-green-500">
                  <span className="text-green-100 text-xs">Dine-in → Table {selectedTable.table_number}</span>
                  <button onClick={() => { setSelectedTable(null); setIsAddingToTable(false); }} className="text-green-200 hover:text-white text-xs underline">Clear</button>
                </div>
              )}
              {/* Shift Running Total - Desktop only */}
              {currentShift && !selectedTable ? (
                <div className="hidden md:flex justify-between text-green-100 text-xs mt-2 pt-2 border-t border-green-500">
                  <span>Shift Sales: Php {(currentShift?.running_total || 0).toFixed(2)}</span>
                  <span>{currentShift?.order_count || 0} orders</span>
                </div>
              ) : !currentShift ? (
                <div className="hidden md:block text-yellow-100 text-xs mt-2 pt-2 border-t border-yellow-500">
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
                        'available': 'bg-green-100 border-green-400 hover:bg-green-200',
                        'occupied': 'bg-red-100 border-red-400 hover:bg-red-200',
                        'reserved': 'bg-yellow-100 border-yellow-400 hover:bg-yellow-200',
                        'needs-cleaning': 'bg-gray-200 border-gray-400 hover:bg-gray-300'
                      };
                      const statusDot = {
                        'available': 'bg-green-500',
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
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span>Available</span>
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
                                className="bg-green-600 hover:bg-green-700 text-white p-0.5 md:p-1 transition-colors"
                              >
                                <Plus className="w-2.5 h-2.5 md:w-3 md:h-3" />
                              </button>
                            </div>
                            <span className="text-green-600 font-bold text-xs md:text-sm w-12 md:w-20 text-right">{(item.price * item.quantity).toFixed(2)}</span>
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
                                className="text-[10px] md:text-xs text-green-600 font-medium px-2"
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

            {/* Discount UI (hidden on mobile) */}
            {cartItems.length > 0 && (
              <div className="hidden md:block bg-white border-t border-gray-200 p-4 flex-shrink-0">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-700">Apply Discount</span>
                  {discountType && (
                    <button onClick={resetDiscount} className="text-[10px] md:text-xs text-red-500 hover:text-red-700 font-medium px-2 py-0.5 border border-red-200 rounded">
                      Clear ✓
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-4 gap-1 md:gap-2 mb-2">
                  <button
                    onClick={() => setDiscountType('senior')}
                    className={`text-[10px] md:text-xs py-1.5 md:py-2 rounded border font-medium transition-colors ${discountType === 'senior' ? 'bg-orange-600 text-white border-orange-600' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-orange-50 hover:text-orange-600'}`}
                  >
                    Senior
                  </button>
                  <button
                    onClick={() => setDiscountType('pwd')}
                    className={`text-[10px] md:text-xs py-1.5 md:py-2 rounded border font-medium transition-colors ${discountType === 'pwd' ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-blue-50 hover:text-blue-600'}`}
                  >
                    PWD
                  </button>
                  <button
                    onClick={() => setDiscountType('loyalty')}
                    className={`text-[10px] md:text-xs py-1.5 md:py-2 rounded border font-medium transition-colors ${discountType === 'loyalty' ? 'bg-purple-600 text-white border-purple-600' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-purple-50 hover:text-purple-600'}`}
                  >
                    Loyalty
                  </button>
                  <button
                    onClick={() => setDiscountType('custom')}
                    className={`text-[10px] md:text-xs py-1.5 md:py-2 rounded border font-medium transition-colors ${discountType === 'custom' ? 'bg-gray-800 text-white border-gray-800' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-200'}`}
                  >
                    Custom
                  </button>
                </div>

                {discountType === 'custom' && (
                  <div className="flex gap-2 animate-fadeIn mt-2">
                    <div className="flex-1 relative">
                      <input
                        type="number"
                        placeholder="%"
                        value={customDiscountPercent}
                        onChange={(e) => { setCustomDiscountPercent(e.target.value); setCustomDiscountAmount(''); }}
                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:border-gray-800 focus:outline-none pr-6"
                      />
                      <span className="absolute right-2 top-1.5 text-xs text-gray-400">%</span>
                    </div>
                    <div className="flex items-center text-gray-400 text-[10px] md:text-xs">OR</div>
                    <div className="flex-1 relative">
                      <span className="absolute left-2 top-1.5 text-xs text-gray-400">₱</span>
                      <input
                        type="number"
                        placeholder="Amount"
                        value={customDiscountAmount}
                        onChange={(e) => { setCustomDiscountAmount(e.target.value); setCustomDiscountPercent(''); }}
                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:border-gray-800 focus:outline-none pl-6"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Totals */}
            <div className="bg-white p-1.5 md:p-4 space-y-0.5 md:space-y-2 border-t border-gray-200 flex-shrink-0">
              <div className="flex justify-between text-gray-600 text-[10px] md:text-sm">
                <span>Subtotal</span>
                <span>{money(getTotalPrice())}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-green-600 font-medium text-[10px] md:text-sm animate-fadeIn">
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
                <span className="text-green-600">{money(total)}</span>
              </div>
            </div>

            {/* Action Buttons */}
            {!showTableView && (
              <div className="p-1.5 md:p-4 space-y-1 md:space-y-2 bg-white border-t border-gray-100 flex-shrink-0">
                {/* Main action button - context-dependent */}
                {selectedTable && selectedTable.status === 'available' ? (
                  /* Table selected - First order */
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
                ) : isAddingToTable && selectedTable ? (
                  /* Adding items to occupied table */
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
                ) : cartItems.length > 0 && !selectedTable ? (
                  /* Items in cart but no table selected - show a specific 'Save to Table' prompt */
                  <div className="space-y-2">
                    <button
                      onClick={() => setShowTableView(true)}
                      className="w-full py-3 md:py-5 rounded-xl font-black text-xs md:text-lg transition-all bg-indigo-100 text-indigo-700 border-2 border-dashed border-indigo-300 hover:bg-indigo-200"
                    >
                      SELECT TABLE TO SAVE ORDER
                    </button>
                    <button
                      onClick={handlePaymentWithShiftCheck}
                      className="w-full py-3 md:py-5 rounded-xl font-black text-xs md:text-lg transition-all bg-green-600 text-white hover:bg-green-700 shadow-md"
                    >
                      CHARGE {money(total)} (NO TABLE)
                    </button>
                  </div>
                ) : employee?.role === 'waiter' ? (
                  /* Waiter — no direct charge, must use table view */
                  <button
                    onClick={() => { setShowTableView(true); }}
                    className="w-full py-2.5 md:py-4 rounded font-bold text-xs md:text-base transition-all bg-green-600 text-white hover:bg-green-700 shadow-md hover:shadow-lg"
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
                      : 'bg-green-600 text-white hover:bg-green-700 shadow-md hover:shadow-lg'
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

        {/* Payment Modal */}
        {showPaymentModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-0 md:p-10 animate-fadeIn font-dashboard">
            <div className="w-full max-w-[34rem] h-full md:h-auto md:max-h-[90vh] flex flex-col bg-white md:rounded-3xl shadow-2xl overflow-hidden relative">
              {/* Green Header */}
              <div className="bg-green-600 text-white px-5 py-4 flex-shrink-0">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-xl font-black tracking-tight uppercase">Process Payment</h2>
                    <p className="text-green-100 text-[10px] font-bold opacity-80">COMPLETE TRANSACTION • ORDER #{cartItems.length > 0 ? (Date.now() % 10000) : '0000'}</p>
                  </div>
                  <button
                    onClick={() => setShowPaymentModal(false)}
                    className="w-10 h-10 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full transition-all"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto scrollbar-hide p-4 md:p-6 space-y-6 pb-24">
                {/* Order Summary */}
                <div className="bg-green-50 border border-green-100 p-3 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 text-xs">Items in Cart</span>
                    <span className="font-medium text-sm">{cartItems.reduce((sum, item) => sum + item.quantity, 0)}</span>
                  </div>
                  <div className="flex justify-between items-center mt-1.5 pt-1.5 border-t border-green-200">
                    <span className="font-bold text-gray-800 text-sm">Amount Due</span>
                    <span className="font-bold text-green-600 text-3xl">{money(total)}</span>
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
                          ? 'bg-green-600 text-white border-green-600'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-green-400 hover:bg-green-50'
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
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Payment Method</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {['cash', 'gcash', 'card', 'credit'].map(method => (
                      <button
                        key={method}
                        onClick={() => setPaymentMethod(method)}
                        className={`py-2 font-medium text-xs transition-all rounded-lg border-2 ${paymentMethod === method
                          ? method === 'credit' ? 'bg-orange-500 text-white border-orange-500' : 'bg-green-600 text-white border-green-600'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-green-400 hover:bg-green-50'
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
                        <input type="number" placeholder="%" value={customDiscountPercent} onChange={(e) => { setCustomDiscountPercent(e.target.value); setCustomDiscountAmount(''); }} className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:border-green-500 focus:outline-none pr-6" />
                        <span className="absolute right-2 top-1.5 text-xs text-gray-400">%</span>
                      </div>
                      <div className="flex items-center text-gray-400 text-[10px] md:text-xs">OR</div>
                      <div className="flex-1 relative">
                        <span className="absolute left-2 top-1.5 text-xs text-gray-400">₱</span>
                        <input type="number" placeholder="Amount" value={customDiscountAmount} onChange={(e) => { setCustomDiscountAmount(e.target.value); setCustomDiscountPercent(''); }} className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:border-green-500 focus:outline-none pl-6" />
                      </div>
                    </div>
                  )}
                  {discountAmount > 0 && (
                    <div className="mt-1.5 text-right text-xs text-green-600 font-bold">
                      - Php {discountAmount.toFixed(2)} applied
                    </div>
                  )}
                </div>

                {/* Customer Selection for Credit */}
                {paymentMethod === 'credit' && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">Customer</label>
                    {selectedCustomer ? (
                      <div className="bg-orange-50 border border-orange-200 p-3 rounded-lg">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-bold text-gray-800 text-sm">{selectedCustomer.name}</p>
                            <p className="text-xs text-gray-500">{selectedCustomer.phone}</p>
                            <p className="text-xs text-orange-600">
                              Bal: Php {(parseFloat(selectedCustomer.credit_balance) || 0).toFixed(2)} /
                              Lmt: Php {(parseFloat(selectedCustomer.credit_limit) || 0).toFixed(2)}
                            </p>
                          </div>
                          <button onClick={() => setSelectedCustomer(null)} className="text-gray-400 hover:text-red-500">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="relative">
                        <input
                          type="text"
                          value={customerSearch}
                          onChange={(e) => setCustomerSearch(e.target.value)}
                          placeholder="Search by phone..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500 text-sm"
                        />
                        {customerSearchResults.length > 0 && (
                          <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg mt-1 z-10">
                            {customerSearchResults.map(c => (
                              <button
                                key={c.id}
                                onClick={() => {
                                  setSelectedCustomer(c);
                                  setCustomerSearch('');
                                  setCustomerSearchResults([]);
                                }}
                                className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-0 first:rounded-t-lg last:rounded-b-lg"
                              >
                                <p className="font-medium text-gray-800 text-sm">{c.name}</p>
                                <p className="text-xs text-gray-500">{c.phone}</p>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Amount Input for Cash */}
                {paymentMethod === 'cash' && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">Amount Received (Php)</label>
                    <div className="relative bg-white border-2 border-green-500 rounded-lg overflow-hidden">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={amountReceived}
                        onChange={(e) => {
                          const value = e.target.value.replace(/[^0-9.]/g, '');
                          setAmountReceived(value);
                        }}
                        placeholder="0.00"
                        className="w-full bg-transparent border-none outline-none font-bold text-center text-green-600 appearance-none payment-amount-input"
                        style={{ padding: '12px 8px', height: '64px', fontSize: '2rem' }}
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
                          className="bg-gray-100 text-gray-700 py-1.5 rounded font-medium text-xs hover:bg-green-100 hover:text-green-700 transition-colors"
                        >
                          {amount}
                        </button>
                      ))}
                    </div>
                    {parseFloat(amountReceived) >= total && (
                      <div className="bg-green-50 border border-green-200 p-3 rounded-lg mt-2">
                        <div className="flex justify-between items-center font-bold">
                          <span className="text-green-800">Change:</span>
                          <span className="text-green-600 text-2xl">Php {(parseFloat(amountReceived) - total).toFixed(2)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Action Buttons - Pinned to bottom of modal */}
                <div className="sticky bottom-0 p-4 bg-white border-t border-gray-100 flex gap-3 z-[20] shadow-[0_-10px_20px_rgba(0,0,0,0.05)]">
                  <button
                    onClick={() => setShowPaymentModal(false)}
                    className="px-6 py-4 border border-gray-200 rounded-xl text-gray-500 hover:bg-gray-50 transition-colors font-bold text-sm uppercase tracking-wide"
                  >
                    Cancel
                  </button>
                  <button
                    id="complete-payment-btn"
                    onClick={processPayment}
                    className="flex-1 py-4 bg-green-600 text-white rounded-xl font-black text-base hover:bg-green-700 transition-all shadow-lg active:scale-95 uppercase tracking-wider"
                  >
                    Process & Print Receipt
                  </button>
                </div>
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
                    className="w-full py-2.5 bg-green-600 text-white rounded-lg font-medium text-sm hover:bg-green-700 transition-colors"
                  >
                    Select for Order
                  </button>
                )}
                {/* Status change buttons */}
                <p className="text-xs text-gray-500 font-medium pt-1">Change Status:</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { status: 'available', label: 'Available', color: 'bg-green-100 text-green-700 hover:bg-green-200 border-green-300' },
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
              <div className="bg-green-600 text-white px-5 py-4 rounded-t-2xl sm:rounded-t-2xl flex-shrink-0">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[11px] text-green-100 uppercase tracking-widest font-medium">Table</p>
                    <p className="text-3xl font-bold leading-tight">{billOutTable?.table_number}</p>
                    <p className="text-xs text-green-100 mt-0.5">{billOutOrder.order_number}</p>
                  </div>
                  <button
                    onClick={() => { setShowBillOutModal(false); setBillOutTable(null); setBillOutOrder(null); setSplitPaymentMode(false); }}
                    className="text-green-200 hover:text-white transition-colors mt-1"
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
                <div className="bg-green-50 border border-green-100 rounded-xl p-4 space-y-1.5">
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>Subtotal</span>
                    <span className="tabular-nums">₱{parseFloat(billOutOrder.subtotal).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>Tax</span>
                    <span className="tabular-nums">₱{parseFloat(billOutOrder.tax_amount).toFixed(2)}</span>
                  </div>
                  {billDiscount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
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
                              ? 'bg-green-600 text-white border-green-600'
                              : 'bg-white text-gray-500 border-gray-200 hover:border-green-400 hover:text-green-700'
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
                            className="w-full border-2 border-gray-200 focus:border-green-600 rounded-xl px-4 py-3 text-xl font-bold text-center outline-none transition-colors tabular-nums"
                            autoFocus
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById('bill-out-btn')?.focus(); } }}
                          />
                          <div className="grid grid-cols-5 gap-1.5 mt-2">
                            {[50, 100, 200, 500, 1000].map(amount => (
                              <button key={amount} onClick={() => setBillAmountReceived(amount.toString())}
                                className="bg-gray-100 text-gray-700 py-2 rounded-lg font-medium text-xs hover:bg-green-100 hover:text-green-700 transition-colors">
                                {amount}
                              </button>
                            ))}
                          </div>
                          {parseFloat(billAmountReceived) >= (parseFloat(billOutOrder.total_amount) - billDiscount) && (
                            <div className="bg-green-50 border border-green-200 rounded-xl p-3 mt-3 flex justify-between items-center">
                              <span className="text-green-700 font-semibold text-sm">Change</span>
                              <span className="text-green-600 font-bold text-2xl tabular-nums">
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
                          <div className={`p-2.5 rounded-xl text-sm font-semibold text-center border ${remaining <= 0 ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
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
                      className="flex-1 py-3 bg-green-600 text-white rounded-xl font-bold text-base hover:bg-green-700 transition-colors"
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

        {/* Success Overlay */}
        {showSuccessOverlay && (
          <div
            className="fixed inset-0 flex items-center justify-center z-[60] bg-black/40"
            onKeyDown={(e) => { if (e.key === 'Enter') setShowSuccessOverlay(false); }}
            tabIndex={0}
            ref={(el) => el && el.focus()}
          >
            <div className="text-center bg-green-600 rounded-2xl px-8 py-6 md:px-10 md:py-8 shadow-2xl mx-4" onClick={(e) => e.stopPropagation()}>
              <div className="w-12 h-12 md:w-14 md:h-14 mx-auto mb-2 md:mb-3 bg-white rounded-full flex items-center justify-center shadow-lg">
                <svg className="w-7 h-7 md:w-8 md:h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl md:text-2xl font-bold mb-1 text-white">{successMessage || 'Payment Successful!'}</h2>
              <p className="text-green-100 text-sm md:text-base mb-1">Order: {successOrderNumber}</p>
              {successChange > 0 && (
                <p className="text-white text-lg md:text-xl font-bold mt-1">Change: {money(successChange)}</p>
              )}
              <div className="flex flex-col gap-2 mt-6">
                <button
                  onClick={() => window.print()}
                  className="w-full bg-white text-green-700 font-bold py-3 rounded-xl text-sm md:text-base hover:bg-green-50 transition-colors shadow-lg flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Print Receipt & Slip
                </button>
                <button
                  onClick={() => setShowSuccessOverlay(false)}
                  className="w-full bg-green-700 text-white font-bold py-3 rounded-xl text-sm md:text-base hover:bg-green-800 transition-colors"
                >
                  Done / Next Order
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Ready Order Alert Toast */}
        {showReadyAlert && latestReadyOrder && (
          <div className="fixed top-20 left-4 z-[70] animate-bounce-in">
            <div className="bg-white border-l-4 border-green-500 rounded-lg shadow-2xl p-4 max-w-sm" onClick={() => setShowReadyAlert(false)}>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Check className="w-5 h-5 text-green-600" />
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
                  <p className="text-[11px] text-green-600 mt-1 truncate" title={activeCameraLabel}>
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
      sizes: product.sizes || [],
      active: product.active !== false,
      stock_quantity: product.stock_quantity || 0,
      low_stock_threshold: product.low_stock_threshold || 10,
      send_to_kitchen: product.send_to_kitchen !== false,
      cost: product.cost || ''
    });
    setHasSizes(product.sizes && product.sizes.length > 0);
    setProductModalPos(getDefaultProductModalPos());
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

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

  const addSize = () => {
    setFormData(prev => ({
      ...prev,
      sizes: [...prev.sizes, { name: '', price: '' }]
    }));
  };

  const updateSize = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      sizes: prev.sizes.map((size, i) =>
        i === index ? { ...size, [field]: field === 'price' ? parseFloat(value) || '' : value } : size
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
    <div className="bg-gray-100 min-h-screen pt-24 pb-20 md:pb-8">
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
                </>
              )}
              {activeTab === 'products' && (
                <button
                  onClick={openAddModal}
                  className="bg-green-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Add Product
                </button>
              )}
              {activeTab === 'combos' && (
                <button
                  onClick={openAddComboModal}
                  className="bg-green-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center gap-2"
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
                  ? 'bg-green-600 text-white'
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
            {/* Filters */}
            <div className="bg-white rounded-lg shadow-sm p-4 mb-4 flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search by name or barcode..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500"
                />
              </div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500"
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
                                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Popular</span>
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
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${product.stock_quantity <= product.low_stock_threshold
                            ? 'bg-red-100 text-red-700'
                            : 'bg-gray-100 text-gray-700'
                            }`}>
                            {product.stock_quantity}
                            {product.stock_quantity <= product.low_stock_threshold && ' ⚠️'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-xs px-2 py-1 rounded-full ${product.active !== false ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
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
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
                        <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
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
                                e.target.parentElement.innerHTML = `<div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center"><span class="text-green-600 font-bold text-sm">C${combo.id}</span></div>`;
                              }}
                            />
                          ) : (
                            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                              <span className="text-green-600 font-bold text-sm">C{combo.id}</span>
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
                        <span className="text-green-600 font-bold">Php {combo.price.toFixed(2)}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs px-2 py-1 rounded-full ${combo.active !== false ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
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
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500"
                />
                <button
                  type="button"
                  onClick={addCategory}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
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
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500"
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
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500"
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
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500"
                />
                <select
                  value={modifierForm.type}
                  onChange={(e) => setModifierForm(prev => ({ ...prev, type: e.target.value }))}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500"
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
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500"
                />
                <button
                  type="button"
                  onClick={addModifier}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
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
                        <span className={`text-xs px-2 py-1 rounded-full ${mod.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
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
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500"
                >
                  <option value="All">All Categories</option>
                  {productCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <select
                  value={priceAdjustType}
                  onChange={(e) => setPriceAdjustType(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500"
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
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500"
                />
                <button
                  type="button"
                  disabled={pricingSaving}
                  onClick={applyPricingAdjustment}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-60"
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
            <div className="h-1 w-full bg-green-600 rounded-t-xl"></div>
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

            <form onSubmit={handleSubmit} className="flex flex-col min-h-0">
              <div className="p-6 grid grid-cols-2 gap-4 overflow-y-auto min-h-0">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                  <select
                    required
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500"
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
                  <input
                    type="text"
                    value={formData.sku}
                    onChange={(e) => setFormData(prev => ({ ...prev, sku: e.target.value }))}
                    placeholder="Enter SKU"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500 font-mono"
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
                    className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
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
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500"
                          />
                          <input
                            type="number"
                            step="0.01"
                            placeholder="Price"
                            value={size.price}
                            onChange={(e) => updateSize(index, 'price', e.target.value)}
                            className="w-28 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500"
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
                      className="mt-2 text-green-600 text-sm font-medium hover:text-green-700"
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
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500"
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500"
                  />
                  <p className="text-[10px] text-gray-500 mt-1">Foundational for profit tracking</p>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={2}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Image Path</label>
                  <input
                    type="text"
                    value={formData.image}
                    onChange={(e) => setFormData(prev => ({ ...prev, image: e.target.value }))}
                    placeholder="assets/images/food/..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 col-span-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Stock Quantity</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.stock_quantity}
                      onChange={(e) => setFormData(prev => ({ ...prev, stock_quantity: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Low Stock Alert</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.low_stock_threshold}
                      onChange={(e) => setFormData(prev => ({ ...prev, low_stock_threshold: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500"
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
                      className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
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
                      className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
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
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  {editingProduct ? 'Update Product' : 'Create Product'}
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500"
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={comboFormData.description}
                  onChange={(e) => setComboFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={2}
                  placeholder="Optional description"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
                <input
                  type="text"
                  value={comboFormData.image}
                  onChange={(e) => setComboFormData(prev => ({ ...prev, image: e.target.value }))}
                  placeholder="e.g., assets/images/food/combo.png"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500"
                />
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
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500"
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
                        className="w-16 px-2 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500 text-center"
                        title="Quantity"
                      />
                      <input
                        type="text"
                        value={item.size_name || ''}
                        onChange={(e) => updateComboItem(index, 'size_name', e.target.value)}
                        placeholder="Size"
                        className="w-20 px-2 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500"
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
                  className="mt-2 text-green-600 text-sm font-medium hover:text-green-700"
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
                  className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
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
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
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
    ok: { bubble: 'bg-green-50 border-green-300 text-green-800', glow: '#4ADE80', eye: '#22C55E', eyeDark: '#15803D', label: 'text-green-600' },
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
            'bg-green-50 border-green-300'
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
    <div className="min-h-screen bg-gray-100 pt-20 pb-12">
      <div className="max-w-6xl mx-auto px-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Customers</h1>
            <p className="text-sm text-gray-500">Manage customer profiles for loyalty, discounts, and credit.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setCurrentPage('pos')} className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Back to POS</button>
            <button onClick={() => setShowForm(true)} className="px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700">Add Customer</button>
          </div>
        </div>

        {error && <div className="bg-red-50 text-red-700 border border-red-200 rounded p-3 text-sm">{error}</div>}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="text-sm font-semibold text-gray-700">Customer List</span>
            <button onClick={loadCustomers} className="text-xs px-3 py-1 bg-gray-100 rounded hover:bg-gray-200">Refresh</button>
          </div>
          {loading ? (
            <div className="p-6 text-sm text-gray-500">Loading customers...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600 border-b">
                  <tr>
                    <th className="px-4 py-2 text-left">Name</th>
                    <th className="px-4 py-2 text-left">Phone</th>
                    <th className="px-4 py-2 text-left">Email</th>
                    <th className="px-4 py-2 text-left">Loyalty</th>
                    <th className="px-4 py-2 text-left">Discount</th>
                    <th className="px-4 py-2 text-left">Credit</th>
                    <th className="px-4 py-2 text-left">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {customers.length === 0 && (
                    <tr><td className="px-4 py-4 text-center text-gray-400" colSpan={7}>No customers yet</td></tr>
                  )}
                  {customers.map(c => (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 font-medium text-gray-800">{c.name}</td>
                      <td className="px-4 py-2 text-gray-700">{c.phone || '—'}</td>
                      <td className="px-4 py-2 text-gray-700">{c.email || '—'}</td>
                      <td className="px-4 py-2 text-gray-700">{(c.loyalty_points || 0)} pts · {c.loyalty_tier || 'basic'}</td>
                      <td className="px-4 py-2 text-gray-700">{(Number(c.loyalty_discount) || 0).toFixed(1)}%</td>
                      <td className="px-4 py-2 text-gray-700">Bal: {(Number(c.credit_balance) || 0).toFixed(2)}</td>
                      <td className="px-4 py-2 text-gray-500 text-xs">{c.created_at ? new Date(c.created_at).toLocaleDateString() : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {showForm && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4" onClick={(e) => { if (e.target === e.currentTarget) setShowForm(false); }}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
              <div className="flex justify-between items-start">
                <h3 className="text-lg font-bold text-gray-800">Add Customer</h3>
                <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="grid grid-cols-1 gap-3">
                <input className="border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                <input className="border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="Phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                <input className="border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="Email (optional)" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                <input className="border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="PIN (4-6 digits)" value={form.pin} onChange={e => setForm({ ...form, pin: e.target.value })} />
                <input className="border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="Address" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
                <div className="grid grid-cols-2 gap-2">
                  <input className="border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="City" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} />
                  <input className="border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="Barangay" value={form.barangay} onChange={e => setForm({ ...form, barangay: e.target.value })} />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowForm(false)} className="flex-1 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
                <button onClick={saveCustomer} disabled={saving} className="flex-1 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-50">
                  {saving ? 'Saving...' : 'Save'}
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
  const [dateRange, setDateRange] = useState('today');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [salesData, setSalesData] = useState([]);
  const [itemsData, setItemsData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [employeeData, setEmployeeData] = useState([]);
  const [paymentData, setPaymentData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [reconciliation, setReconciliation] = useState(null);
  const [reconciliationMismatches, setReconciliationMismatches] = useState([]);
  const [reconciliationError, setReconciliationError] = useState('');

  const activeReport = currentReport || 'reports-sales';
  const reportTypes = [
    { id: 'reports-sales', name: 'Sales Summary' },
    { id: 'reports-items', name: 'Sales by Item' },
    { id: 'reports-category', name: 'Sales by Category' },
    { id: 'reports-employees', name: 'Sales by Employee' },
    { id: 'reports-payments', name: 'Sales by Payment Type' },
    { id: 'reports-inventory', name: 'Inventory Reports' },
    { id: 'reports-financial', name: 'Financial Reports' },
    { id: 'reports-tax', name: 'Tax Reports' }
  ];

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const today = new Date();
        let start = startDate;
        let end = endDate;
        if (dateRange === 'today') {
          start = end = today.toISOString().split('T')[0];
        } else if (dateRange === 'week') {
          const d = new Date(today);
          d.setDate(d.getDate() - 7);
          start = d.toISOString().split('T')[0];
          end = today.toISOString().split('T')[0];
        } else if (dateRange === 'month') {
          start = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
          end = today.toISOString().split('T')[0];
        }
        const res = await fetchWithAuth(`${API_URL}/orders?start=${start}&end=${end}&include_items=true`);
        const data = await res.json();
        if (res.ok && data.success) {
          const orders = data.orders || [];
          setSalesData(orders);

          const itemsMap = {};
          const categoryMap = {};
          const employeeMap = {};
          const paymentMap = {};

          orders.forEach((o) => {
            const status = (o.order_status || o.status || '').toLowerCase();
            const isRefundedOrVoided = ['voided', 'refunded', 'cancelled'].includes(status);
            if (isRefundedOrVoided) return;

            const items = Array.isArray(o.items) ? o.items : [];
            const empName = o.employee_name || 'System/Online';
            const payMethod = o.payment_method || 'Unspecified';

            // Group by Employee
            if (!employeeMap[empName]) employeeMap[empName] = { name: empName, orders: 0, revenue: 0 };
            employeeMap[empName].orders += 1;
            employeeMap[empName].revenue += Number(o.total_amount || 0);

            // Group by Payment Method
            if (!paymentMap[payMethod]) paymentMap[payMethod] = { name: payMethod, orders: 0, revenue: 0 };
            paymentMap[payMethod].orders += 1;
            paymentMap[payMethod].revenue += Number(o.total_amount || 0);

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

              // Group by Item
              if (!itemsMap[nameKey]) itemsMap[nameKey] = { name: nameKey, quantity: 0, revenue: 0 };
              itemsMap[nameKey].quantity += qty;
              itemsMap[nameKey].revenue += itemRev;

              // Group by Category
              if (!categoryMap[catKey]) categoryMap[catKey] = { name: catKey, quantity: 0, revenue: 0 };
              categoryMap[catKey].quantity += qty;
              categoryMap[catKey].revenue += itemRev;
            });
          });

          setItemsData(Object.values(itemsMap).sort((a, b) => b.quantity - a.quantity));
          setCategoryData(Object.values(categoryMap).sort((a, b) => b.revenue - a.revenue));
          setEmployeeData(Object.values(employeeMap).sort((a, b) => b.revenue - a.revenue));
          setPaymentData(Object.values(paymentMap).sort((a, b) => b.revenue - a.revenue));
        }

        const reconRes = await fetchWithAuth(`${API_URL}/orders/reconciliation?start=${start}&end=${end}`);
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
  }, [activeReport, dateRange, startDate, endDate]);

  const totals = salesData.reduce((acc, o) => {
    const status = (o.order_status || '').toLowerCase();
    const isRefundedOrVoided = ['voided', 'refunded', 'cancelled'].includes(status);

    // 1. Gross = Subtotal of EVERY order attempted (before discount, before tax)
    const orderSubtotal = Number(o.subtotal || 0);
    acc.gross += orderSubtotal;

    // 2. Separate logic for Active vs Voided
    if (isRefundedOrVoided) {
      // Refund represents the "lost" subtotal
      acc.refunds += orderSubtotal;
    } else {
      // For active orders, track discounts and tax
      acc.discounts += Number(o.discount_amount || 0);
      acc.tax += Number(o.tax_amount || 0);
      acc.collection += Number(o.total_amount || 0);
      acc.orders += 1;
    }
    return acc;
  }, { gross: 0, tax: 0, discounts: 0, refunds: 0, collection: 0, orders: 0 });

  // 3. Final Calculations based on the Audit Formula: Gross - Discounts - Refunds = Net (Pre-tax)
  const netSales = totals.gross - totals.discounts - totals.refunds;
  const avg = totals.orders > 0 ? netSales / totals.orders : 0;
  const itemsRevenueTotal = itemsData.reduce((sum, i) => sum + Number(i.revenue || 0), 0);
  const itemSalesDiff = itemsRevenueTotal - netSales;
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
    <div className="reports-lineitems min-h-screen bg-gray-100 pt-20">
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-4">
        <div className="flex flex-wrap justify-between gap-2 items-center">
          <h1 className="text-2xl font-bold text-gray-800">Reports</h1>
          <select value={dateRange} onChange={(e) => setDateRange(e.target.value)} className="px-4 py-2 border rounded-lg">
            <option value="today">Today</option>
            <option value="week">Last 7 Days</option>
            <option value="month">This Month</option>
            <option value="custom">Custom</option>
          </select>
        </div>
        {dateRange === 'custom' && (
          <div className="flex flex-wrap gap-2">
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="px-3 py-2 border rounded-lg" />
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="px-3 py-2 border rounded-lg" />
          </div>
        )}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {reportTypes.map(r => (
            <button key={r.id} onClick={() => setCurrentPage(r.id)} className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${activeReport === r.id ? 'bg-green-600 text-white' : 'bg-white text-gray-600'}`}>
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
              <div className="bg-white rounded-lg p-3 shadow-sm border-l-4 border-green-500">
                <p className="text-xs text-green-700 font-bold">Net Sales (Revenue)</p>
                <p className="text-lg font-bold text-green-700">{formatMoney ? formatMoney(netSales) : `Php ${netSales.toFixed(2)}`}</p>
                <p className="text-[10px] text-gray-400 font-medium italic">Audit: Gross - Disct - Refund</p>
              </div>
              <div className="bg-white rounded-lg p-3 shadow-sm border-l-4 border-blue-400">
                <p className="text-xs text-gray-500">Tax Collected (Liability)</p>
                <p className="text-lg font-bold text-blue-600">{formatMoney ? formatMoney(totals.tax) : `Php ${totals.tax.toFixed(2)}`}</p>
              </div>
              <div className="bg-white rounded-lg p-3 shadow-sm border-l-4 border-green-600 bg-green-50/30">
                <p className="text-xs text-gray-600 font-bold">Total Collection (Cash/Card)</p>
                <p className="text-lg font-bold text-green-800">{formatMoney ? formatMoney(totals.collection) : `Php ${totals.collection.toFixed(2)}`}</p>
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
                        <td className="px-3 py-2 text-sm text-right text-green-600 font-semibold whitespace-nowrap">Php {Number(order.total_amount || 0).toFixed(2)}</td>
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
                ? `I still see a mismatch of Php ${itemSalesDiff.toFixed(2)} between Item Sales and Sales totals.`
                : 'Item Sales and Sales totals are perfectly matched for this period.'}
              mood={Math.abs(itemSalesDiff) > 0.01 ? 'alert' : 'ok'}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-white rounded-lg p-4 shadow-sm border-l-4 border-green-500">
                <p className="text-sm text-gray-500">Item Sales Total</p>
                <p className="text-2xl font-bold text-green-600">Php {itemsRevenueTotal.toFixed(2)}</p>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm border-l-4 border-blue-500">
                <p className="text-sm text-gray-500">Sales Report Total (Net)</p>
                <p className="text-2xl font-bold text-blue-600">Php {netSales.toFixed(2)}</p>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <table className="w-full font-data-table">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr><th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">Item</th><th className="text-right px-4 py-3 text-sm font-semibold text-gray-600">Qty</th><th className="text-right px-4 py-3 text-sm font-semibold text-gray-600">Revenue</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {itemsData.map(item => (
                    <tr key={item.name}><td className="px-4 py-3 text-sm text-gray-800">{item.name}</td><td className="px-4 py-3 text-sm text-right text-gray-600">{item.quantity}</td><td className="px-4 py-3 text-sm text-right text-green-600">Php {item.revenue.toFixed(2)}</td></tr>
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
                    <tr key={cat.name}><td className="px-4 py-3 text-sm text-gray-800">{cat.name}</td><td className="px-4 py-3 text-sm text-right text-gray-600">{cat.quantity}</td><td className="px-4 py-3 text-sm text-right text-green-600">Php {cat.revenue.toFixed(2)}</td></tr>
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
                    <tr key={emp.name}><td className="px-4 py-3 text-sm text-gray-800 font-medium">{emp.name}</td><td className="px-4 py-3 text-sm text-right text-gray-600">{emp.orders}</td><td className="px-4 py-3 text-sm text-right text-green-600">Php {emp.revenue.toFixed(2)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!loading && activeReport === 'reports-payments' && (
          <div className="space-y-3">
            <div className="bg-white rounded-lg p-4 shadow-sm border-l-4 border-green-500">
              <p className="text-sm text-gray-500">Payment Breakdown</p>
              <p className="text-2xl font-bold text-green-600">Php {netSales.toFixed(2)} Total</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <table className="w-full font-data-table">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr><th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">Payment Method</th><th className="text-right px-4 py-3 text-sm font-semibold text-gray-600">Transactions</th><th className="text-right px-4 py-3 text-sm font-semibold text-gray-600">Collected Amount</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {paymentData.map(pay => (
                    <tr key={pay.name}><td className="px-4 py-3 text-sm text-gray-800 uppercase">{pay.name}</td><td className="px-4 py-3 text-sm text-right text-gray-600">{pay.orders}</td><td className="px-4 py-3 text-sm text-right text-green-600 font-medium">Php {pay.revenue.toFixed(2)}</td></tr>
                  ))}
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

        {!loading && ['reports-employees', 'reports-financial', 'reports-tax'].includes(activeReport) && (
          <div className="bg-white rounded-lg p-6 text-gray-600">This report tab is active and ready for configuration.</div>
        )}
      </div>
    </div>
  );
}

function InventoryReportsSection({ dateRange, setDateRange, startDate, setStartDate, endDate, setEndDate, loading }) {
  const [activeInventoryReport, setActiveInventoryReport] = useState('stock-status');
  const [reportPayload, setReportPayload] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState('');

  const inventoryTabs = [
    { id: 'stock-status', label: 'Stock Status', icon: '📦' },
    { id: 'movement', label: 'Movement', icon: '📊' },
    { id: 'valuation', label: 'Valuation', icon: '💰' },
    { id: 'abc-analysis', label: 'ABC Analysis', icon: '📈' },
    { id: 'reorder-analysis', label: 'Reorder Points', icon: '🔄' },
    { id: 'waste-shrinkage', label: 'Waste', icon: '⚠️' },
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
      const queryTabs = new Set(['movement', 'waste-shrinkage', 'turnover']);
      const query = queryTabs.has(activeInventoryReport) ? `?days=${days}` : '';
      const response = await fetchWithAuth(`${API_URL}/inventory/reports/${activeInventoryReport}${query}`);
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
  }, [activeInventoryReport, dateRange, startDate, endDate]);

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
      <div className="bg-white rounded-lg shadow-sm p-4 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-gray-800">Inventory Reports</h3>
          {reportPayload?.title && (
            <span className="text-sm text-gray-500">{reportPayload.title}</span>
          )}
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="px-4 py-2 bg-gray-800 text-white rounded-lg text-sm font-medium hover:bg-gray-700"
        >
          Print Report
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {inventoryTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveInventoryReport(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${activeInventoryReport === tab.id ? 'bg-green-600 text-white' : 'bg-white text-gray-600'
              }`}
          >
            <span className="mr-2">{tab.icon}</span>
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
  const urgency = getUrgency(order.created_at);
  const isPreparing = order.order_status === 'preparing';
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
      isPreparing ? 'bg-orange-500' : 'bg-green-600';

  const borderColor = urgency === 'critical' ? 'border-red-500' :
    urgency === 'warning' ? 'border-yellow-400' :
      isPreparing ? 'border-orange-400' : 'border-green-500';

  return (
    <div className={`flex flex-col bg-gray-800 border-2 ${borderColor} min-w-[220px] max-w-[260px] flex-shrink-0 ${urgency === 'critical' ? 'animate-pulse' : ''}`}>
      <div className={`${bumperColor} px-3 py-2`}>
        <div className="flex items-center justify-between gap-1">
          <span className="text-white font-bold text-xs truncate">#{order.order_number}</span>
          <span className={`font-mono font-bold text-sm flex-shrink-0 ${urgency === 'critical' ? 'text-white' : 'text-white/90'}`}>
            {formatTimer(order.created_at)}
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
            <span className={`px-2 py-0.5 text-xs font-bold uppercase ${order.service_type === 'dine-in' ? 'bg-green-700 text-white' :
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
          ? 'bg-green-600 hover:bg-green-500 text-white'
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
          data.orders.filter(o => o.order_status === 'received' || o.order_status === 'open').map(o => o.id)
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
      const res = await fetchWithAuth(`${API_URL}/orders/${orderId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ order_status: newStatus })
      });
      const data = await res.json();
      if (data.success) {
        if (newStatus === 'completed') {
          const order = orders.find(o => o.id === orderId);
          if (order) {
            const prepTime = Math.floor((Date.now() - new Date(order.created_at).getTime()) / 1000);
            setCompletedTimes(prev => [...prev.slice(-19), prepTime]);
          }
        }
        fetchKitchenOrders();
      } else alert(data.error || 'Failed to update status');
    } catch (err) {
      alert('Failed to update order status');
    }
  };

  const formatTimer = (dateStr) => {
    const diff = Math.max(0, Math.floor((now - new Date(dateStr).getTime()) / 1000));
    const mins = Math.floor(diff / 60);
    const secs = diff % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const getUrgency = (dateStr) => {
    const diff = Math.floor((now - new Date(dateStr).getTime()) / 1000);
    if (diff > 300) return 'critical';
    if (diff > 180) return 'warning';
    return 'normal';
  };

  const activeOrders = orders
    .filter(o => ['received', 'open', 'preparing'].includes(o.order_status))
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  const totalActive = activeOrders.length;
  const newCount = activeOrders.filter(o => o.order_status === 'received' || o.order_status === 'open').length;
  const prepCount = activeOrders.filter(o => o.order_status === 'preparing').length;

  const avgPrepTime = completedTimes.length > 0
    ? Math.floor(completedTimes.reduce((a, b) => a + b, 0) / completedTimes.length)
    : 0;
  const avgMins = Math.floor(avgPrepTime / 60);
  const avgSecs = avgPrepTime % 60;

  return (
    <div className="min-h-screen bg-gray-950 pt-20 flex flex-col" onClick={() => { if (!audioEnabled) enableAudio(); }}>
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
              <div className="w-2.5 h-2.5 bg-green-500 rounded-full"></div>
              <span className="text-green-400 text-sm font-medium">{newCount} New</span>
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
          <span className={`text-xs px-2 py-0.5 rounded ${audioEnabled ? 'bg-green-900 text-green-400' : 'bg-red-900 text-red-400'}`}>
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
        <div className="flex items-center gap-1"><div className="w-3 h-2 bg-green-600"></div><span className="text-gray-500 text-xs">0-3m</span></div>
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
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => { fetchReport(); }, [date]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth(`${API_URL}/orders/kitchen-report?date=${date}&limit=200`);
      const data = await res.json();
      if (data.success) setOrders(data.orders);
    } catch (e) {
      console.error('Error fetching kitchen report:', e);
    } finally {
      setLoading(false);
    }
  };

  const statusColor = (s) => {
    if (s === 'completed') return 'bg-green-100 text-green-700';
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
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm text-center">
            <p className="text-3xl font-bold text-gray-800">{orders.length}</p>
            <p className="text-sm text-gray-500 mt-1">Total Orders</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm text-center">
            <p className="text-3xl font-bold text-green-600">{completed}</p>
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

      const reconResponse = await fetchWithAuth(`${API_URL}/orders/reconciliation`);
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
    <div className="orders-lineitems min-h-screen bg-gray-100 pt-20">
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
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${currentView === view.id ? 'bg-green-600 text-white' : 'bg-white text-gray-600 hover:bg-green-50'
                }`}
            >
              {view.name}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
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
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${order.order_type === 'pos' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                        }`}>{order.order_type?.toUpperCase()}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${order.order_status === 'completed' ? 'bg-green-100 text-green-700' :
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
        <div className="p-4 border-b flex justify-between items-center bg-green-600 text-white">
          <h2 className="text-base font-semibold">
            {step === 'upload' && '📦 Bulk Receive Stock'}
            {step === 'preview' && `📋 Preview — ${parsedRows.length} rows`}
            {step === 'done' && '✅ Bulk Receive Complete'}
          </h2>
          <button onClick={onClose} className="text-white hover:text-green-200">✕</button>
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
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-green-400 transition-colors">
                <p className="text-sm font-medium text-gray-700 mb-2">Step 2: Upload your filled CSV</p>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="block mx-auto text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-medium file:bg-green-600 file:text-white hover:file:bg-green-700 cursor-pointer"
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
                        <td className="px-3 py-1.5 text-center text-green-600 font-semibold">
                          +{row.quantity} {row.unit}
                        </td>
                        <td className="px-3 py-1.5 text-center font-bold text-gray-800">
                          {row.matched ? `${(row.current_stock + row.quantity).toFixed(2)} ${row.unit}` : '—'}
                        </td>
                        <td className="px-3 py-1.5 text-gray-500">{row.supplier || '—'}</td>
                        <td className="px-3 py-1.5 text-center">
                          {row.matched
                            ? <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">✓ Matched</span>
                            : <span className="bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-medium">✗ Not Found</span>
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex gap-2 text-xs text-gray-500">
                <span className="bg-green-100 text-green-700 px-2 py-1 rounded">
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
                <div className="bg-green-50 border border-green-200 rounded p-3 flex-1 text-center">
                  <p className="text-2xl font-bold text-green-600">{results.filter(r => r.status === 'success').length}</p>
                  <p className="text-green-700 text-xs">Successfully received</p>
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
                            ? <span className="text-green-600 font-medium">✓ {row.message}</span>
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
                className="px-6 py-2 text-sm font-medium text-white bg-green-600 rounded hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? 'Processing...' : `✓ Confirm Receive ${parsedRows.filter(r => r.matched).length} Items`}
              </button>
            </>
          )}
          {step === 'done' && (
            <button onClick={onClose} className="px-6 py-2 text-sm font-medium text-white bg-green-600 rounded hover:bg-green-700 ml-auto">
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
            ? 'bg-green-50 text-green-700 border border-green-200'
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
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-green-500"
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
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-green-500"
            />
          </div>

          {/* New Stock Preview */}
          {selectedIngredient && form.quantity && (
            <div className="bg-green-50 border border-green-200 rounded p-2 text-xs text-green-700">
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
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-green-500"
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
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-green-500"
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
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-green-500"
            />
          </div>

          {/* Submit */}
          <button
            onClick={handleReceive}
            disabled={loading}
            className="w-full py-2.5 bg-green-600 text-white text-sm font-medium rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Processing...' : '📦 Receive Stock'}
          </button>

          <div className="mt-4 pt-4 border-t">
            <button
              onClick={() => setShowBulkModal(true)}
              className="w-full py-2 border-2 border-dashed border-green-400 text-green-600 text-sm font-medium rounded hover:bg-green-50 transition-colors"
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
                      <span className={`font-semibold ${entry.quantity_change > 0 ? 'text-green-600' : 'text-red-600'}`}>
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
  const [recipeForm, setRecipeForm] = useState({ ingredientId: '', quantity_required: '' });
  const [recipeMessage, setRecipeMessage] = useState({ type: '', text: '' });
  const [expandedProductId, setExpandedProductId] = useState(null);
  const [productIngredients, setProductIngredients] = useState({});
  const [editingRecipeIngredient, setEditingRecipeIngredient] = useState(null);
  const [editQuantity, setEditQuantity] = useState('');
  const [editMessage, setEditMessage] = useState({ type: '', text: '' });
  const [adjustingStock, setAdjustingStock] = useState({});
  const ingredientCsvInputRef = useRef(null);

  const views = [
    { id: 'inventory-stock', name: 'Stock' },
    { id: 'inventory-ingredients', name: 'Raw Materials' },
    { id: 'inventory-recipes', name: 'Composite' },
    { id: 'inventory-status', name: 'Status' },
    { id: 'inventory-receive', name: 'Receive' },
  ];

  useEffect(() => {
    console.log('[InventoryPage] useEffect triggered, currentView:', currentView);
    const regularProducts = menuData.filter(p => !p.isCombo);
    setProducts(regularProducts);

    // Load ingredients when needed
    if (currentView.startsWith('inventory-ingredients') || currentView.startsWith('inventory-recipes') || currentView.startsWith('inventory-status')) {
      console.log('[InventoryPage] Loading ingredients for view:', currentView);
      fetchIngredients();
      if (currentView.startsWith('inventory-recipes')) {
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
          ingredient_name: r.ingredient_name,
          quantity_required: r.quantity_required,
          unit: r.unit,
          current_stock: r.current_stock
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

  const handleProductClick = (product) => {
    if (expandedProductId === product.id) {
      setExpandedProductId(null);
    } else {
      setExpandedProductId(product.id);
      if (!productIngredients[product.id]) {
        fetchProductIngredients(product.id);
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

  const addRecipeIngredient = async (productId, ingredientId, quantity_required) => {
    try {
      const res = await fetchWithAuth(`${API_URL}/inventory/recipes/${productId}/ingredients`, {
        method: 'POST',
        body: JSON.stringify({ ingredient_id: ingredientId, quantity_required: parseFloat(quantity_required) })
      });
      const data = await res.json();
      if (data.success) {
        setRecipeMessage({ type: 'success', text: `✓ Ingredient added to recipe (ID: ${ingredientId})` });
        fetchRecipes();
        // Clear form and close modal after 1.5s
        setTimeout(() => {
          setShowAddRecipeModal(false);
          setRecipeForm({ ingredientId: '', quantity_required: '' });
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

  const updateRecipeIngredient = async (productId, ingredientId, quantity_required) => {
    try {
      const res = await fetchWithAuth(`${API_URL}/inventory/recipes/${productId}/ingredients/${ingredientId}`, {
        method: 'PUT',
        body: JSON.stringify({ quantity_required: parseFloat(quantity_required) })
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

  const removeRecipeIngredient = async (productId, ingredientId) => {
    if (!confirm('Remove this ingredient from recipe?')) return;
    try {
      const res = await fetchWithAuth(`${API_URL}/inventory/recipes/${productId}/ingredients/${ingredientId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        fetchRecipes();
        alert('Ingredient removed from recipe');
      } else {
        alert(data.error || 'Failed to remove ingredient');
      }
    } catch (error) {
      console.error('Error removing recipe ingredient:', error);
      alert('Error removing ingredient');
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
    .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.category.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      let aVal = sortBy === 'stock' ? (a.stock_quantity || 0) : a[sortBy];
      let bVal = sortBy === 'stock' ? (b.stock_quantity || 0) : b[sortBy];
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();
      if (sortDir === 'asc') return aVal > bVal ? 1 : -1;
      return aVal < bVal ? 1 : -1;
    });

  return (
    <div className="inventory-lineitems min-h-screen bg-gray-50 pt-16">
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
                  className={`px-2 py-1 text-xs font-medium transition-all ${currentView === view.id ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                >
                  {view.name}
                </button>
              ))}
            </div>
          </div>
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-2 py-1 text-[10px] border border-gray-300 w-40 focus:outline-none focus:border-green-500"
          />
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
                  const isLow = (product.stock_quantity || 0) <= (product.low_stock_threshold || 10);
                  return (
                    <tr key={product.id} className={`border-b hover:bg-blue-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                      <td className="px-2 py-1 text-sm font-medium text-gray-800">{product.name}</td>
                      <td className="px-2 py-1 text-gray-600 font-mono text-xs">{product.sku || '-'}</td>
                      <td className="px-2 py-1 text-gray-500">{product.category}</td>
                      <td className="px-2 py-1 text-right text-gray-600">₱{(product.price || 0).toFixed(2)}</td>
                      <td className={`px-2 py-1 text-center font-medium ${isLow ? 'text-red-600' : 'text-gray-800'}`}>
                        {product.stock_quantity || 0}
                      </td>
                      <td className="px-2 py-1 text-center text-gray-500">{product.low_stock_threshold || 10}</td>
                      <td className="px-2 py-1 text-center">
                        <span className={`text-xs px-1.5 py-0.5 ${isLow ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                          {isLow ? 'LOW' : 'OK'}
                        </span>
                      </td>
                      <td className="px-2 py-1 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => adjustStock(product.id, -1)}
                            disabled={!!adjustingStock[product.id]}
                            className="w-5 h-5 bg-red-500 text-white text-xs hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                          >-</button>
                          <button
                            type="button"
                            onClick={() => adjustStock(product.id, 1)}
                            disabled={!!adjustingStock[product.id]}
                            className="w-5 h-5 bg-green-500 text-white text-xs hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {adjustingStock[product.id] ? '…' : '+'}
                          </button>
                        </div>
                      </td>
                    </tr>
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
                  className="px-3 py-1 text-xs bg-green-600 text-white hover:bg-green-700"
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
                    <th className="text-center px-2 py-1.5 font-semibold text-gray-600 border-b w-16">Cost/Unit</th>
                    <th className="text-center px-2 py-1.5 font-semibold text-gray-600 border-b">Status</th>
                    <th className="text-center px-2 py-1.5 font-semibold text-gray-600 border-b w-28">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {ingredients.map((ing, idx) => {
                    const isLow = ing.current_stock <= ing.reorder_level;
                    return (
                      <tr key={ing.id} className={`border-b hover:bg-blue-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                        <td className="px-2 py-1 text-sm font-medium text-gray-800">{ing.name}</td>
                        <td className="px-2 py-1 text-center text-gray-500">{ing.unit}</td>
                        <td className={`px-2 py-1 text-center font-semibold ${isLow ? 'text-red-600' : 'text-gray-800'}`}>
                          {parseFloat(ing.current_stock).toFixed(2)}
                        </td>
                        <td className="px-2 py-1 text-center text-gray-500">{parseFloat(ing.reorder_level).toFixed(2)}</td>
                        <td className="px-2 py-1 text-center text-gray-500">₱{parseFloat(ing.cost_per_unit).toFixed(2)}</td>
                        <td className="px-2 py-1 text-center">
                          <span className={`text-xs px-1.5 py-0.5 ${isLow ? 'bg-red-100 text-red-600 font-bold' : 'bg-green-100 text-green-600'}`}>
                            {isLow ? 'LOW STOCK' : 'OK'}
                          </span>
                        </td>
                        <td className="px-2 py-1 text-center">
                          <button
                            onClick={() => {
                              const change = prompt(`Add/remove ${ing.name} (${ing.unit}):`);
                              if (change) {
                                const notes = prompt('Notes (optional):');
                                updateInventory(ing.id, change, notes);
                              }
                            }}
                            className="text-xs px-2 py-0.5 bg-blue-500 text-white hover:bg-blue-600"
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
                            Edit
                          </button>
                        </td>
                      </tr>
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
            <div className="p-4 border-b">
              <h3 className="text-sm font-medium text-gray-800">Product Recipes (Bill of Materials)</h3>
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
                              <div className="space-y-2 mb-3">
                                {ingredientsList.map((ing, idx) => (
                                  <div key={idx} className="flex justify-between items-center bg-white p-2 rounded border border-gray-200">
                                    <div className="flex-1">
                                      <p className="font-medium text-gray-700">{ing.ingredient_name}</p>
                                      <p className="text-gray-500">ID: {ing.ingredient_id}</p>
                                    </div>
                                    <div className="text-right">
                                      <p className="font-semibold text-gray-800">{parseFloat(ing.quantity_required).toFixed(2)} {ing.unit}</p>
                                    </div>
                                    <button
                                      onClick={() => {
                                        setEditingRecipeIngredient({ productId: product.id, ingredientId: ing.ingredient_id, ingredientName: ing.ingredient_name, unit: ing.unit });
                                        setEditQuantity(ing.quantity_required);
                                      }}
                                      className="ml-2 px-2 py-1 text-xs bg-blue-500 text-white hover:bg-blue-600"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      onClick={() => removeRecipeIngredient(product.id, ing.ingredient_id)}
                                      className="ml-2 px-2 py-1 text-xs bg-red-500 text-white hover:bg-red-600"
                                    >
                                      Remove
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                            <button
                              onClick={() => {
                                setSelectedProductForRecipe(product);
                                setShowAddRecipeModal(true);
                              }}
                              className="px-2 py-1 text-xs bg-green-500 text-white hover:bg-green-600"
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
                <div className="bg-green-50 rounded p-3 border border-green-200">
                  <p className="text-xs text-green-600 font-medium">Inventory Value</p>
                  <p className="text-lg font-bold text-green-700">
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
                  ? 'bg-green-50 text-green-700 border border-green-200'
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-green-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Unit of Measure *</label>
                  <select
                    value={ingredientForm.unit}
                    onChange={(e) => setIngredientForm({ ...ingredientForm, unit: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-green-500"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Reorder Level</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={ingredientForm.reorder_level}
                      onChange={(e) => setIngredientForm({ ...ingredientForm, reorder_level: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-green-500"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-green-500"
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
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-green-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Unit</label>
                    <input
                      type="text"
                      value={ingredientForm.unit}
                      onChange={(e) => setIngredientForm({ ...ingredientForm, unit: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Reorder Level</label>
                    <input
                      type="number"
                      value={ingredientForm.reorder_level}
                      onChange={(e) => setIngredientForm({ ...ingredientForm, reorder_level: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-green-500"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-green-500"
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
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700"
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
                  ? 'bg-green-50 text-green-700 border border-green-200'
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
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-green-500"
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
                    updateRecipeIngredient(editingRecipeIngredient.productId, editingRecipeIngredient.ingredientId, editQuantity);
                  }}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700"
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
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
                  }`}>
                  {recipeMessage.text}
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Select Ingredient *</label>
                  <select
                    value={recipeForm.ingredientId}
                    onChange={(e) => setRecipeForm({ ...recipeForm, ingredientId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-green-500"
                  >
                    <option value="">Choose an ingredient...</option>
                    {ingredients.map(ing => (
                      <option key={ing.id} value={ing.id}>
                        {ing.name} (ID: {ing.id}) - {ing.unit}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Quantity Required *</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="e.g., 0.5, 2, 100"
                      step="0.01"
                      value={recipeForm.quantity_required}
                      onChange={(e) => setRecipeForm({ ...recipeForm, quantity_required: e.target.value })}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-green-500"
                    />
                    {recipeForm.ingredientId && ingredients.find(i => i.id === parseInt(recipeForm.ingredientId)) && (
                      <span className="px-3 py-2 bg-gray-100 rounded-lg text-sm text-gray-600 font-medium">
                        {ingredients.find(i => i.id === parseInt(recipeForm.ingredientId))?.unit}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-2 mt-6">
                <button
                  onClick={() => {
                    setShowAddRecipeModal(false);
                    setSelectedProductForRecipe(null);
                    setRecipeForm({ ingredientId: '', quantity_required: '' });
                    setRecipeMessage({ type: '', text: '' });
                  }}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
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
                      recipeForm.quantity_required
                    );
                  }}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700"
                >
                  Add to Recipe
                </button>
              </div>
            </div>
          </div>
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

  const views = [
    { id: 'staff-employees', name: 'Employees' },
    { id: 'staff-schedules', name: 'Schedules' },
    { id: 'staff-timesheet', name: 'Time Tracking' },
    { id: 'staff-permissions', name: 'Permissions' },
  ];

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const response = await fetchWithAuth(`${API_URL}/auth/employees`);
      const data = await response.json();
      if (data.success) {
        setEmployees(data.employees);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
    } finally {
      setLoading(false);
    }
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
    <div className="min-h-screen bg-gray-100 pt-20">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Staff Management</h1>
          <button
            onClick={() => setShowModal(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
          >
            + Add Employee
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {views.map(view => (
            <button
              key={view.id}
              onClick={() => setCurrentPage(view.id)}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${currentView === view.id ? 'bg-green-600 text-white' : 'bg-white text-gray-600 hover:bg-green-50'
                }`}
            >
              {view.name}
            </button>
          ))}
        </div>

        {currentView === 'staff-employees' && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full font-data-table">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Name</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Username</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Role</th>
                  <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {employees.map(emp => (
                  <tr key={emp.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">{emp.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{emp.username}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${emp.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                        emp.role === 'manager' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>{emp.role}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${emp.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>{emp.active ? 'Active' : 'Inactive'}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button className="text-blue-600 hover:text-blue-800 text-sm">Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {currentView !== 'staff-employees' && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="font-semibold text-gray-800 mb-4">{views.find(v => v.id === currentView)?.name}</h3>
            <p className="text-gray-500">This feature is coming soon.</p>
          </div>
        )}

        {/* Add Employee Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Add New Employee</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                  <input
                    type="text"
                    required
                    value={formData.username}
                    onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <input
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500"
                  >
                    <option value="waiter">Waiter</option>
                    <option value="cashier">Cashier</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                {formError && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{formError}</p>}
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => { setShowModal(false); setFormError(''); }} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">Cancel</button>
                  <button type="submit" className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Add Employee</button>
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
    if (currentView === 'settings-general') {
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
        fetchRecipes();
        alert('Packaged item created and linked.');
      } else {
        alert(data.error || 'Failed to create packaged item');
      }
    } catch (error) {
      console.error('Error creating packaged item:', error);
      alert('Error creating packaged item');
    }
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
    <div className="min-h-screen bg-gray-100 pt-20">
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
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${currentView === view.id ? 'bg-green-600 text-white' : 'bg-white text-gray-600 hover:bg-green-50'
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Currency</label>
                  <select value={cfg('currency')} onChange={e => setCfg('currency', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Time Zone</label>
                  <select value={cfg('timezone')} onChange={e => setCfg('timezone', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                    <option value="Asia/Manila">Asia/Manila (UTC+8)</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Business Address</label>
                  <input type="text" value={cfg('business_address')} onChange={e => setCfg('business_address', e.target.value)}
                    placeholder="Street, City, Province"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Owner Email <span className="text-green-600">(reports sent here)</span></label>
                  <input type="email" value={cfg('owner_email')} onChange={e => setCfg('owner_email', e.target.value)}
                    placeholder="owner@example.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
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
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${sysConfig[key] === 'true' ? 'bg-green-600' : 'bg-gray-200'}`}>
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">SMTP Port</label>
                    <input type="number" value={cfg('smtp_port')} onChange={e => setCfg('smtp_port', e.target.value)}
                      placeholder="587"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">SMTP Username / Email</label>
                    <input type="text" value={cfg('smtp_user')} onChange={e => setCfg('smtp_user', e.target.value)}
                      placeholder="youremail@gmail.com"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">SMTP Password / App Password</label>
                    <input type="password" value={cfg('smtp_pass')} onChange={e => setCfg('smtp_pass', e.target.value)}
                      placeholder="••••••••••••••••"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-500 mb-1">From Address (optional)</label>
                    <input type="email" value={cfg('smtp_from')} onChange={e => setCfg('smtp_from', e.target.value)}
                      placeholder="noreply@yourbusiness.com (leave blank to use username)"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
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
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 font-medium text-sm disabled:opacity-60">
                {configSaving ? 'Saving...' : 'Save Settings'}
              </button>
              <button onClick={sendTestEmail} disabled={testEmailSending}
                className="border border-green-600 text-green-700 px-6 py-2 rounded-lg hover:bg-green-50 font-medium text-sm disabled:opacity-60">
                {testEmailSending ? 'Sending...' : 'Send Test Email'}
              </button>
              <button onClick={seedDemoData} disabled={seedingData}
                className="border border-blue-600 text-blue-700 px-6 py-2 rounded-lg hover:bg-blue-50 font-medium text-sm disabled:opacity-60 ml-auto">
                {seedingData ? 'Loading Demo Data...' : 'Load Demo Data'}
              </button>
              <div className="w-full flex gap-3 text-sm font-medium">
                {configMsg && <span className={configMsg.startsWith('✓') ? 'text-green-600' : 'text-red-500'}>{configMsg}</span>}
                {testEmailMsg && <span className={testEmailMsg.startsWith('✓') ? 'text-green-600' : 'text-red-500'}>{testEmailMsg}</span>}
                {seedMsg && <span className={seedMsg.startsWith('✓') ? 'text-green-600' : 'text-red-500'}>{seedMsg}</span>}
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
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
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
                    className="w-full py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium transition-colors"
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
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2 text-sm font-medium"
              >
                <Plus size={16} /> Add Table
              </button>
            </div>

            {/* Add/Edit Form */}
            {(showAddTable || editingTable) && (
              <div className="mb-6 p-4 border border-green-200 bg-green-50 rounded-xl">
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
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
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
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Section</label>
                    <select
                      value={tableForm.section}
                      onChange={e => setTableForm({ ...tableForm, section: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
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
                  <button onClick={handleSaveTable} className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 font-medium text-sm">
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
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${table.status === 'available' ? 'bg-green-100 text-green-700' :
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

        {currentView === 'settings-printers' && (
          <div className="space-y-6 max-w-4xl">
            {/* Connection Status & Instructions */}
            <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-2xl shadow-lg p-6 text-white relative overflow-hidden">
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
                    <p className="text-[10px] text-green-200 uppercase font-bold">Paper Width</p>
                    <p className="text-lg font-black uppercase">58mm (Small Roll)</p>
                  </div>
                  <div className="bg-black/20 rounded-lg px-4 py-2 border border-white/10">
                    <p className="text-[10px] text-green-200 uppercase font-bold">Kitchen Copy</p>
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
                  <Settings size={18} className="text-green-600" />
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
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300 ${sysConfig[key] === 'true' ? 'bg-green-600 shadow-sm shadow-green-200' : 'bg-gray-200'}`}
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
                            ? 'bg-green-600 border-green-600 text-white'
                            : 'bg-white border-gray-200 text-gray-500 hover:border-green-300'
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
                  <LayoutIcon size={18} className="text-green-600" />
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
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-green-500 transition-all"
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
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-green-500 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Footer Message</label>
                    <textarea
                      rows="3"
                      value={cfg('printer_footer')}
                      onChange={e => setCfg('printer_footer', e.target.value)}
                      placeholder="Thank you message..."
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-green-500 transition-all"
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
                    className="w-full bg-green-600 text-white py-3 rounded-lg text-xs font-black uppercase tracking-widest hover:bg-green-700 transition-all flex items-center justify-center gap-2"
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

// Customer Login Page
function CustomerLoginPage({ setCustomer, setCurrentPage }) {
  const [isLogin, setIsLogin] = useState(true);
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetchWithAuth(`${API_URL}/customers/login`, {
        method: 'POST',
        body: JSON.stringify({ phone, pin })
      });
      const result = await response.json();

      if (result.success) {
        setCustomer(result.customer);
        setCurrentPage('customer-dashboard');
      } else {
        setError(result.error || 'Login failed');
      }
    } catch (err) {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetchWithAuth(`${API_URL}/customers/register`, {
        method: 'POST',
        body: JSON.stringify({ name, phone, pin, email: email || null })
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
    <div className="min-h-screen bg-gray-100 pt-24 pb-20 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">
            {isLogin ? 'Welcome Back!' : 'Create Account'}
          </h1>
          <p className="text-gray-500 mt-2">
            {isLogin ? 'Login to view your orders and credit balance' : 'Register to track orders and use credit'}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg mb-6 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={isLogin ? handleLogin : handleRegister} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500"
                placeholder="Juan Dela Cruz"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500"
              placeholder="09171234567"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">PIN (4-6 digits)</label>
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              required
              maxLength={6}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500 text-center text-2xl tracking-widest"
              placeholder="••••"
            />
          </div>

          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email (optional)</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500"
                placeholder="juan@email.com"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Please wait...' : (isLogin ? 'Login' : 'Create Account')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
            }}
            className="text-green-600 font-medium hover:text-green-700"
          >
            {isLogin ? "Don't have an account? Register" : 'Already have an account? Login'}
          </button>
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
  }, [customer?.id]); // Only re-fetch when customer ID changes

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
        fetchData(customer.id); // Refresh data
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
        <p className="text-gray-500">Please login to view your dashboard</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 pt-24 pb-20">
      <div className="max-w-4xl mx-auto px-4">
        {/* Profile Header */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-2xl font-bold text-green-600">
                  {displayCustomer.name?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">{displayCustomer.name}</h1>
                <p className="text-gray-500">{displayCustomer.phone}</p>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="text-red-500 hover:text-red-600 font-medium"
            >
              Logout
            </button>
          </div>

          {/* Credit Balance Card */}
          <div className="mt-6 bg-gradient-to-r from-green-600 to-green-500 rounded-xl p-5 text-white">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-green-100 text-sm">Outstanding Balance</p>
                <p className="text-3xl font-bold mt-1">
                  ₱{parseFloat(displayCustomer.credit_balance || 0).toFixed(2)}
                </p>
                <p className="text-green-100 text-sm mt-2">
                  Credit Limit: ₱{parseFloat(displayCustomer.credit_limit || 0).toFixed(2)}
                </p>
              </div>
              {parseFloat(displayCustomer.credit_balance) > 0 && (
                <button
                  onClick={() => setShowPaymentModal(true)}
                  className="bg-white text-green-600 px-4 py-2 rounded-lg font-bold text-sm hover:bg-green-50 transition-colors"
                >
                  Pay Now
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm mb-4">
          <div className="flex border-b border-gray-200">
            {['overview', 'orders', 'ledger'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-4 font-medium text-sm transition-colors ${activeTab === tab
                  ? 'text-green-600 border-b-2 border-green-600'
                  : 'text-gray-500 hover:text-gray-700'
                  }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        {loading ? (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            <p className="text-gray-500 mt-4">Loading...</p>
          </div>
        ) : (
          <>
            {activeTab === 'overview' && (
              <div className="space-y-4">
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h2 className="text-lg font-bold text-gray-800 mb-4">Quick Stats</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-gray-500 text-sm">Total Orders</p>
                      <p className="text-2xl font-bold text-gray-800">{orders.length}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-gray-500 text-sm">Outstanding Balance</p>
                      <p className={`text-2xl font-bold ${parseFloat(displayCustomer.credit_balance) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        Php {parseFloat(displayCustomer.credit_balance || 0).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>

                {orders.length > 0 && (
                  <div className="bg-white rounded-xl shadow-sm p-6">
                    <h2 className="text-lg font-bold text-gray-800 mb-4">Recent Orders</h2>
                    <div className="space-y-3">
                      {orders.slice(0, 3).map(order => (
                        <div key={order.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                          <div>
                            <p className="font-medium text-gray-800">{order.order_number}</p>
                            <p className="text-sm text-gray-500">{formatDate(order.created_at)}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-gray-800">Php {(parseFloat(order.total_amount_amount) || 0).toFixed(2)}</p>
                            <span className={`text-xs px-2 py-1 rounded-full ${order.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
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
            )}

            {activeTab === 'orders' && (
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                {orders.length === 0 ? (
                  <div className="p-8 text-center">
                    <p className="text-gray-500">No orders yet</p>
                  </div>
                ) : (
                  <table className="w-full text-sm font-data-table">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Order #</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Items</th>
                        <th className="text-right px-4 py-3 font-medium text-gray-600">Total</th>
                        <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {orders.map(order => (
                        <tr key={order.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDate(order.created_at)}</td>
                          <td className="px-4 py-3 font-medium text-gray-800">{order.order_number}</td>
                          <td className="px-4 py-3 text-gray-600 truncate max-w-xs">
                            {order.items && order.items[0] ?
                              order.items.filter(i => i.product_name).map((item, idx) => (
                                `${item.quantity}x ${item.product_name}${item.size_name ? ` (${item.size_name})` : ''}`
                              )).join(', ')
                              : '-'
                            }
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-green-600 whitespace-nowrap">
                            Php {(parseFloat(order.total_amount_amount) || 0).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${order.payment_status === 'paid' ? 'bg-green-100 text-green-700' :
                              order.payment_status === 'credit' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                              {order.payment_status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {activeTab === 'ledger' && (
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                {ledger.length === 0 ? (
                  <div className="p-8 text-center">
                    <p className="text-gray-500">No credit transactions yet</p>
                  </div>
                ) : (
                  <table className="w-full text-sm font-data-table">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Details</th>
                        <th className="text-right px-4 py-3 font-medium text-gray-600">Amount</th>
                        <th className="text-right px-4 py-3 font-medium text-gray-600">Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {ledger.map(entry => (
                        <tr key={entry.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDate(entry.created_at)}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${entry.transaction_type === 'payment' ? 'bg-green-100 text-green-700' :
                              entry.transaction_type === 'credit_purchase' ? 'bg-red-100 text-red-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                              {entry.transaction_type === 'credit_purchase' ? 'Credit' :
                                entry.transaction_type === 'payment' ? 'Payment' : 'Adjust'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-600 truncate max-w-[200px]">
                            {entry.order_number || entry.notes || '—'}
                          </td>
                          <td className={`px-4 py-3 text-right font-medium whitespace-nowrap ${(parseFloat(entry.amount) || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {(parseFloat(entry.amount) || 0) > 0 ? '+' : ''}₱{(parseFloat(entry.amount) || 0).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-700 whitespace-nowrap">₱{(parseFloat(entry.balance_after) || 0).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800">Make Payment</h2>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-500">Outstanding Balance</p>
              <p className="text-2xl font-bold text-red-600">
                ₱{parseFloat(displayCustomer.credit_balance || 0).toFixed(2)}
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Payment Amount</label>
              <input
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-4 py-3 text-2xl font-bold text-center border border-gray-300 rounded-lg focus:outline-none focus:border-green-500"
              />
            </div>

            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setPaymentAmount((parseFloat(displayCustomer.credit_balance) / 2).toFixed(2))}
                className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
              >
                Half
              </button>
              <button
                onClick={() => setPaymentAmount((parseFloat(displayCustomer.credit_balance) || 0).toFixed(2))}
                className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
              >
                Full
              </button>
            </div>

            <button
              onClick={handlePayment}
              disabled={paymentProcessing || !paymentAmount}
              className="w-full bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {paymentProcessing ? 'Processing...' : `Pay ₱${parseFloat(paymentAmount || 0).toFixed(2)}`}
            </button>

            <p className="text-xs text-gray-400 text-center mt-4">
              Present this to the cashier to complete your payment
            </p>
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
            className="flex-1 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors shadow-sm"
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


