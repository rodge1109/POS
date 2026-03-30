import React, { useState, createContext, useContext, useEffect } from 'react';
import { ShoppingCart, Plus, Minus, Trash2, ChevronRight, Check, X, Search } from 'lucide-react';

// Cart Context
const CartContext = createContext();

const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within CartProvider');
  return context;
};

// Google Sheets API URL - UPDATE THIS WITH YOUR WEB APP URL
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyQNLHXp9Fzi0_mVxYmV7M0xSA2bqteLxIDzA96nAsaIObDEAhwGN9oX1lOAoY72BaL/exec';

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

const categories = ['All', 'Pizza', 'Burgers', 'Pasta', 'Salads', 'Drinks', 'Desserts'];

// Main App Component
export default function RestaurantApp() {
  const [cartItems, setCartItems] = useState([]);
  const [currentPage, setCurrentPage] = useState('home');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCart, setShowCart] = useState(false);
  const [showSizeModal, setShowSizeModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [pendingOrderNumber, setPendingOrderNumber] = useState(null);

  // Products state
  const [menuData, setMenuData] = useState(fallbackMenuData);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [productsError, setProductsError] = useState(null);

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

  // Fetch products from Google Sheets on mount
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setIsLoadingProducts(true);
        setProductsError(null);

        const response = await fetch(GOOGLE_SCRIPT_URL);
        const data = await response.json();

        if (data.success && data.products && data.products.length > 0) {
          setMenuData(data.products);
        } else {
          setMenuData(fallbackMenuData);
          setProductsError('Using offline menu data');
        }
      } catch (error) {
        console.error('Error fetching products:', error);
        setMenuData(fallbackMenuData);
        setProductsError('Using offline menu data');
      } finally {
        setIsLoadingProducts(false);
      }
    };

    fetchProducts();
  }, []);

  // Initialize OneSignal Push Notifications
  useEffect(() => {
    if (typeof window !== 'undefined' && window.OneSignalDeferred) {
      window.OneSignalDeferred = window.OneSignalDeferred || [];
      window.OneSignalDeferred.push(async function(OneSignal) {
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
    getTotalItems,
    getTotalPrice
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
      `}</style>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-green-900 to-gray-900 pb-16 md:pb-0 pt-[140px] md:pt-[100px]">
        <Header
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          setShowCart={setShowCart}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />
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
          />
        )}
        {currentPage === 'cart' && <CartPage setCurrentPage={setCurrentPage} />}
        {currentPage === 'checkout' && <CheckoutPage setCurrentPage={setCurrentPage} clearCart={clearCart} />}
        {currentPage === 'confirmation' && <ConfirmationPage setCurrentPage={setCurrentPage} orderNumber={pendingOrderNumber} paymentStatus={paymentStatus} />}
        {currentPage === 'payment-failed' && <PaymentFailedPage setCurrentPage={setCurrentPage} orderNumber={pendingOrderNumber} />}
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
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 md:hidden z-50 pb-safe">
          <div className="flex justify-around items-center py-2">
            <button
              onClick={() => setCurrentPage('home')}
              className={`flex flex-col items-center px-4 py-1 ${currentPage === 'home' ? 'text-green-600' : 'text-gray-500'}`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span className="text-xs font-medium">Home</span>
            </button>
            <button
              onClick={() => setCurrentPage('menu')}
              className={`flex flex-col items-center px-4 py-1 ${currentPage === 'menu' ? 'text-green-600' : 'text-gray-500'}`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              <span className="text-xs font-medium">Menu</span>
            </button>
            <button
              onClick={() => setShowCart(true)}
              className={`flex flex-col items-center px-4 py-1 relative ${showCart ? 'text-green-600' : 'text-gray-500'}`}
            >
              <ShoppingCart className="w-6 h-6" />
              {getTotalItems() > 0 && (
                <span className="absolute -top-1 right-2 bg-green-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                  {getTotalItems()}
                </span>
              )}
              <span className="text-xs font-medium">Cart</span>
            </button>
          </div>
        </nav>
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
function Header({ currentPage, setCurrentPage, setShowCart, searchQuery, setSearchQuery }) {
  const { getTotalItems } = useCart();

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <div className="bg-green-600">
        <div className="w-full px-8 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setCurrentPage('home')}>
              <div className="text-4xl font-black text-white drop-shadow-lg">K</div>
              <div>
                <h1 className="text-xl font-black text-white drop-shadow-lg tracking-wider">Kuchefnero.ph</h1>
                <p className="text-[9px] text-white font-bold">Food Ordering System (ver 1.0)</p>
              </div>
            </div>

            <div className="hidden md:flex flex-1 max-w-md mx-6 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-green-700 w-5 h-5" />
              <input
                type="text"
                placeholder="Search for food..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (e.target.value && currentPage !== 'menu') setCurrentPage('menu');
                }}
                className="w-full pl-10 pr-4 py-2 rounded-full border-2 border-green-500 focus:border-green-700 focus:outline-none font-bold text-green-800 bg-green-100 placeholder-green-700/50"
              />
            </div>

            <nav className="hidden md:flex items-center space-x-4">
              <button
                onClick={() => setCurrentPage('home')}
                className={`font-black transition-all px-4 py-2 rounded-lg text-sm tracking-wider ${currentPage === 'home' ? 'bg-green-400 text-green-700' : 'text-green-400 hover:bg-green-700'}`}
              >
                HOME
              </button>
              <button
                onClick={() => setCurrentPage('menu')}
                className={`font-black transition-all px-4 py-2 rounded-lg text-sm tracking-wider ${currentPage === 'menu' ? 'bg-green-400 text-green-700' : 'text-green-400 hover:bg-green-700'}`}
              >
                MENU
              </button>
            </nav>

            <button
              onClick={() => setShowCart(true)}
              className="relative bg-green-400 text-white px-6 py-2 rounded-full hover:shadow-2xl transition-all flex items-center space-x-2 shadow-lg hover:scale-105 font-black text-sm"
            >
              <ShoppingCart className="w-5 h-5" />
              <span>CART</span>
              {getTotalItems() > 0 && (
                <span className="absolute -top-2 -right-2 bg-green-600 text-white text-xs w-6 h-6 rounded-full flex items-center justify-center font-black animate-bounce">
                  {getTotalItems()}
                </span>
              )}
            </button>
          </div>

          <div className="mt-3 md:hidden relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-green-700 w-5 h-5" />
            <input
              type="text"
              placeholder="Search for food..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (e.target.value && currentPage !== 'menu') setCurrentPage('menu');
              }}
              className="w-full pl-10 pr-4 py-2 rounded-full border-2 border-green-500 focus:border-green-700 focus:outline-none font-bold text-green-800 bg-green-100 placeholder-green-700/50"
            />
          </div>
        </div>
      </div>
      {/* Brush stroke edge */}
      <svg className="w-full h-5 -mt-px" viewBox="0 0 1440 20" preserveAspectRatio="none">
        <path fill="#007A33" d="M0,0 L0,10 C40,14 60,8 100,12 C160,18 200,6 280,14 C340,20 400,8 480,11 C560,14 600,6 680,10 C760,15 820,5 900,12 C960,17 1020,7 1100,10 C1180,13 1240,6 1320,11 C1380,15 1420,8 1440,10 L1440,0 Z" />
        <path fill="#007A33" opacity="0.7" d="M0,0 L0,6 C60,10 100,4 160,8 C240,14 300,4 380,9 C460,14 520,5 600,8 C680,12 740,4 820,7 C900,11 960,3 1040,8 C1120,12 1180,5 1260,7 C1340,10 1400,4 1440,6 L1440,0 Z" />
      </svg>
    </header>
  );
}

// Home Page
function HomePage({ setCurrentPage, menuData, isLoading }) {
  const popularItems = menuData.filter(item => item.popular).slice(0, 6);
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
      {/* Hero Carousel Section */}
      <section className="relative overflow-hidden">
        <div className="relative h-[307px] md:h-[400px]">
          {heroSlides.map((slide, index) => (
            <div
              key={index}
              className={`absolute inset-0 text-white transition-all duration-700 ease-in-out transform ${
                index === currentSlide
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
              <div className="relative w-full px-8 h-full flex flex-col justify-center items-center text-center" >
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
              className={`transition-all duration-300 rounded-full ${
                index === currentSlide
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
          <div className="border-t-2 border-green-300 mt-12 pt-8 text-center">
            <p className="text-gray-600 text-sm">
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
      <div className="bg-gray-50 p-4 text-center flex-1 flex flex-col justify-center">
        {item.image && item.image.startsWith('assets/') ? (
          <img src={item.image} alt={item.name} className="object-contain mx-auto rounded-lg h-48 w-48 group-hover:scale-110 transition-transform bg-gray-50" />
        ) : (
          <div className="text-9xl group-hover:scale-110 transition-transform">{item.image}</div>
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
function MenuPage({ selectedCategory, setSelectedCategory, searchQuery, menuData, isLoading }) {
  const filteredItems = menuData.filter(item => {
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Category Filter - Right below header */}
      <div className="bg-white shadow-md sticky top-[140px] md:top-[100px] z-40">
        <div className="w-full px-8">
          <div className="flex overflow-x-auto space-x-1 py-3 scrollbar-hide">
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-3 py-2 rounded-md font-medium whitespace-nowrap transition-all text-xs tracking-wide ${
                  selectedCategory === category
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
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-end" onClick={() => setShowCart(false)}>
      <div className="bg-gray-100 w-full max-w-md h-full overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
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
function CartPage({ setCurrentPage }) {
  const { cartItems, getTotalPrice } = useCart();
  const deliveryFee = 4.99;
  const tax = getTotalPrice() * 0.08;
  const total = getTotalPrice() + deliveryFee + tax;

  if (cartItems.length === 0) {
    return (
      <div className="bg-gray-50 min-h-screen py-8">
        <div className="w-full px-8 text-center">
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
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="w-full px-8">
        <h1 className="text-2xl font-medium text-gray-800 mb-8 text-center">Your Cart</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-3">
            {cartItems.map((item, index) => (
              <CartItemCard key={`${item.id}-${item.selectedSize || 'default'}-${index}`} item={item} detailed />
            ))}
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-5 sticky top-[160px] md:top-[120px]">
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
                  <span>Tax (8%)</span>
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
                className="w-full bg-green-600 text-white py-2.5 rounded-md text-sm font-medium hover:bg-green-700 transition-all"
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
function CheckoutPage({ setCurrentPage, clearCart }) {
  const { getTotalPrice, cartItems } = useCart();
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

  // Check notification subscription status on mount
  useEffect(() => {
    const checkNotificationStatus = async () => {
      try {
        if (window.OneSignalDeferred) {
          window.OneSignalDeferred.push(async function(OneSignal) {
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
        window.OneSignalDeferred.push(async function(OneSignal) {
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

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate payment reference for Bank Transfer only (GCash uses PayMongo)
    if (formData.paymentMethod === 'bank' && !formData.paymentReference.trim()) {
      alert('Please enter the Bank reference number.');
      return;
    }

    setIsSubmitting(true);

    try {
      const deliveryFee = 4.99;
      const tax = getTotalPrice() * 0.08;
      const total = getTotalPrice() + deliveryFee + tax;

      // Format cart items as a string
      const itemsList = cartItems.map(item =>
        `${item.name}${item.selectedSize ? ` (${item.selectedSize})` : ''} (x${item.quantity}) - Php ${(item.price * item.quantity).toFixed(2)}`
      ).join(', ');

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
            window.OneSignalDeferred.push(async function(OneSignal) {
              playerId = await OneSignal.User.PushSubscription.id;
              resolve();
            });
          });
        }
      } catch (err) {
        console.log('Could not get OneSignal player ID:', err);
      }

      // Send data to Google Sheets
      const response = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({
          fullName: formData.name,
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
          city: formData.city,
          barangay: formData.zipCode,
          paymentMethod: paymentMethodDisplay,
          paymentReference: formData.paymentReference || 'N/A',
          playerId: playerId || '',
          items: itemsList,
          subtotal: getTotalPrice().toFixed(2),
          deliveryFee: deliveryFee.toFixed(2),
          tax: tax.toFixed(2),
          total: total.toFixed(2)
        })
      });

      const result = await response.json();

      if (result.success) {
        // If GCash payment, redirect to PayMongo checkout
        if (result.requiresPayment && result.paymentUrl) {
          // Store order number for later reference
          localStorage.setItem('pendingOrder', result.orderNumber);
          // Redirect to GCash payment page
          window.location.href = result.paymentUrl;
        } else {
          // Clear cart and go to confirmation for non-GCash payments
          if (clearCart) clearCart();
          setCurrentPage('confirmation');
        }
      } else {
        alert('Error: ' + (result.error || 'Failed to process order'));
      }
    } catch (error) {
      console.error('Error processing order:', error);
      alert('There was an error processing your order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const deliveryFee = 4.99;
  const tax = getTotalPrice() * 0.08;
  const total = getTotalPrice() + deliveryFee + tax;

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="w-full px-8">
        <h1 className="text-2xl font-medium text-gray-800 mb-8 text-center">Checkout</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm p-6 space-y-6">
            <div>
              <h3 className="text-base font-medium text-gray-700 mb-4">Delivery Address</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Full Name"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2 rounded-md border border-gray-300 focus:border-green-500 focus:outline-none text-sm"
                />
                <input
                  type="email"
                  placeholder="Email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full px-3 py-2 rounded-md border border-gray-300 focus:border-green-500 focus:outline-none text-sm"
                />
                <input
                  type="tel"
                  placeholder="Phone Number"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="w-full px-3 py-2 rounded-md border border-gray-300 focus:border-green-500 focus:outline-none text-sm"
                />
                <input
                  type="text"
                  placeholder="ZIP Code"
                  required
                  value={formData.zipCode}
                  onChange={(e) => setFormData({...formData, zipCode: e.target.value})}
                  className="w-full px-3 py-2 rounded-md border border-gray-300 focus:border-green-500 focus:outline-none text-sm"
                />
              </div>
              <input
                type="text"
                placeholder="Street Address"
                required
                value={formData.address}
                onChange={(e) => setFormData({...formData, address: e.target.value})}
                className="w-full px-3 py-2 rounded-md border border-gray-300 focus:border-green-500 focus:outline-none text-sm mt-3"
              />
              <input
                type="text"
                placeholder="City"
                required
                value={formData.city}
                onChange={(e) => setFormData({...formData, city: e.target.value})}
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
              <div className={`rounded-lg p-4 border-2 ${
                notificationStatus === 'denied'
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
                <label className={`flex items-center space-x-3 p-3 border rounded-md cursor-pointer transition-all ${
                  formData.paymentMethod === 'cash' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:bg-gray-50'
                }`}>
                  <input
                    type="radio"
                    name="payment"
                    value="cash"
                    checked={formData.paymentMethod === 'cash'}
                    onChange={(e) => setFormData({...formData, paymentMethod: e.target.value, paymentReference: ''})}
                    className="w-4 h-4 text-green-600"
                  />
                  <span className="text-sm text-gray-700">Cash on Delivery</span>
                </label>

                <label className={`flex items-center space-x-3 p-3 border rounded-md cursor-pointer transition-all ${
                  formData.paymentMethod === 'gcash' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:bg-gray-50'
                }`}>
                  <input
                    type="radio"
                    name="payment"
                    value="gcash"
                    checked={formData.paymentMethod === 'gcash'}
                    onChange={(e) => setFormData({...formData, paymentMethod: e.target.value})}
                    className="w-4 h-4 text-green-600"
                  />
                  <span className="text-sm text-gray-700">GCash</span>
                </label>

                <label className={`flex items-center space-x-3 p-3 border rounded-md cursor-pointer transition-all ${
                  formData.paymentMethod === 'bank' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:bg-gray-50'
                }`}>
                  <input
                    type="radio"
                    name="payment"
                    value="bank"
                    checked={formData.paymentMethod === 'bank'}
                    onChange={(e) => setFormData({...formData, paymentMethod: e.target.value})}
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
                      <p className="text-lg font-medium text-green-600">Php {(getTotalPrice() + 4.99 + getTotalPrice() * 0.08).toFixed(2)}</p>
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
                      <p className="text-lg font-medium text-blue-600">Php {(getTotalPrice() + 4.99 + getTotalPrice() * 0.08).toFixed(2)}</p>
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
                      onChange={(e) => setFormData({...formData, paymentReference: e.target.value})}
                      className="w-full px-3 py-2 rounded-md border border-gray-300 focus:border-blue-500 focus:outline-none text-sm"
                    />
                  </div>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-3 rounded-md font-medium transition-all text-sm ${
                isSubmitting
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {isSubmitting ? 'Processing...' : `Place Order - Php ${total.toFixed(2)}`}
            </button>
          </form>
        </div>

        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm p-5 sticky top-[160px] md:top-[120px]">
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
                <span>Tax (8%)</span>
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
  // Generate order number if not provided (for non-GCash orders)
  const displayOrderNumber = orderNumber || `ORD-${Date.now()}`;

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="w-full px-8">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
          <h1 className="text-xl font-medium text-gray-800 mb-1">
            {paymentStatus === 'success' ? 'Payment Successful!' : 'Order Confirmed'}
          </h1>
          <p className="text-sm text-gray-500">
            {paymentStatus === 'success' ? 'Your GCash payment has been received' : 'Thank you for your order'}
          </p>
        </div>

        {/* Order Number */}
        <div className="bg-green-600 rounded-lg p-4 mb-6 text-center">
          <div className="text-xs text-green-200 mb-1">Order Number</div>
          <div className="text-xl font-medium text-white">{displayOrderNumber}</div>
        </div>

        {/* Order Status */}
        <div className="bg-white rounded-lg p-5 mb-6 shadow-sm">
          <h3 className="text-base font-medium text-gray-800 mb-4">Order Status</h3>

          <div className="space-y-0">
            {/* Order Confirmed */}
            <div className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="w-0.5 h-8 bg-green-500"></div>
              </div>
              <div className="pb-3">
                <div className="text-sm font-medium text-gray-800">Order Received</div>
                <div className="text-xs text-gray-500">{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}, {new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}</div>
              </div>
            </div>

            {/* Preparing */}
            <div className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <div className="w-6 h-6 rounded-full border-2 border-green-500 flex items-center justify-center flex-shrink-0">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                </div>
                <div className="w-0.5 h-8 bg-gray-200"></div>
              </div>
              <div className="pb-3">
                <div className="text-sm font-medium text-gray-800">Preparing your order</div>
                <div className="text-xs text-gray-500">Estimated: 15-20 mins</div>
              </div>
            </div>

            {/* Out for Delivery */}
            <div className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <div className="w-6 h-6 rounded-full border-2 border-gray-300 flex-shrink-0"></div>
              </div>
              <div>
                <div className="text-sm text-gray-400">Out for delivery</div>
                <div className="text-xs text-gray-400">Estimated arrival: 25-30 mins</div>
              </div>
            </div>
          </div>
        </div>

        {/* SMS Notice */}
        <div className="text-center mb-6">
          <p className="text-xs text-gray-500">You will receive a text message with delivery updates</p>
        </div>

        {/* Action Buttons */}
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