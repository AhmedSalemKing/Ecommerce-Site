import React, { useState, useContext, useEffect, useRef } from "react";
import "./Navbar.css";
import { Link } from "react-router-dom";
import logo from "../Assets/Logo.png";
import cart from "../Assets/9041728_cart_icon.png";
import accounticon from "../Assets/accounticon.svg";
import search_icon from "../Assets/search_icon.svg";
import { ShopContext } from "../../Context/ShopContext";
import nav_dropdown from "../Assets/nav_dropdown.png";
import DarkModeToggle from '../DarkModeToggle/DarkModeToggle';

const Navbar = () => {
  const [menu, setMenu] = useState("shop");
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountDropdown, setAccountDropdown] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [authToken, setAuthToken] = useState(localStorage.getItem('auth-token'));
  const { getTotalCartItems } = useContext(ShopContext);
  const dropdownRef = useRef(null);
  const searchRef = useRef(null);
  const searchInputRef = useRef(null);

  // دالة لحساب عدد المنتجات في السلة بشكل صحيح
  const getCartItemCount = () => {
    try {
      const result = getTotalCartItems();
      
      // إذا كانت النتيجة رقم، ارجعها مباشرة
      if (typeof result === 'number') {
        return result;
      }
      
      // إذا كانت object، احسب المجموع
      if (typeof result === 'object' && result !== null) {
        return Object.values(result).reduce((total, quantity) => {
          return total + (Number(quantity) || 0);
        }, 0);
      }
      
      // في حالة أي شيء آخر، ارجع 0
      return 0;
    } catch (error) {
      console.error('Error calculating cart items:', error);
      return 0;
    }
  };

  // فحص الـ token كل فترة قصيرة
  useEffect(() => {
    const checkToken = () => {
      const token = localStorage.getItem('auth-token');
      if (token !== authToken) {
        setAuthToken(token);
      }
    };

    // فحص كل ثانية
    const interval = setInterval(checkToken, 1000);
    
    // فحص عند العودة للـ tab
    const handleFocus = () => checkToken();
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [authToken]);

  const dropdown_toggle = () => {
    setMenuOpen(!menuOpen);
    // إغلاق البحث عند فتح القائمة
    if (!menuOpen && searchOpen) {
      setSearchOpen(false);
    }
  };

  const toggleAccountDropdown = () => {
    setAccountDropdown(!accountDropdown);
  };

  const toggleSearch = () => {
    setSearchOpen(!searchOpen);
    // إغلاق القائمة عند فتح البحث
    if (!searchOpen && menuOpen) {
      setMenuOpen(false);
    }
    
    // تركيز على حقل البحث عند الفتح
    if (!searchOpen) {
      setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }, 100);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      console.log("Searching for:", searchQuery);
      // هنا يمكنك إضافة منطق البحث
      // مثل التوجه إلى صفحة البحث أو فلترة المنتجات
    }
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    // يمكنك إضافة البحث المباشر هنا
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSearchOpen(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('auth-token');
    setAuthToken(null);
    setAccountDropdown(false);
    window.location.replace('/');
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setAccountDropdown(false);
      }
      
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setSearchOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // إغلاق البحث بالضغط على Escape
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setSearchOpen(false);
        setSearchQuery("");
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  return (
    <>
      <div className='navbar'>
        <div className='nav-logo'>
          <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
            <img src={logo} alt="Logo" />
            <p>SHOPPER</p>
          </Link>
        </div>

        <img
          className={`nav-dropdown ${menuOpen ? "open" : ""}`}
          onClick={dropdown_toggle}
          src={nav_dropdown}
          alt="Menu"
        />

        <ul className={`nav-menu ${menuOpen ? "nav-menu-visible" : ""}`}>
          <li onClick={() => setMenu("shop")}>
            <Link to="/" style={{ textDecoration: 'none' }}>Shop</Link>
            {menu === "shop" && <hr />}
          </li>
          <li onClick={() => setMenu("men")}>
            <Link to="/men" style={{ textDecoration: 'none' }}>Men</Link>
            {menu === "men" && <hr />}
          </li>
          <li onClick={() => setMenu("women")}>
            <Link to="/women" style={{ textDecoration: 'none' }}>Women</Link>
            {menu === "women" && <hr />}
          </li>
          <li onClick={() => setMenu("kids")}>
            <Link to="/kids" style={{ textDecoration: 'none' }}>Kids</Link>
            {menu === "kids" && <hr />}
          </li>
        </ul>

        <div className="nav-actions">
          {/* مربع البحث */}
          <div className={`search-container ${searchOpen ? 'search-active' : ''}`} ref={searchRef}>
            <form onSubmit={handleSearchSubmit} className="search-form">
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="search-input"
              />
              <button type="button" onClick={toggleSearch} className="search-toggle">
                <img src={search_icon} alt="Search" className="search-icon" />
              </button>
              {searchQuery && (
                <button type="button" onClick={clearSearch} className="search-clear">
                  ×
                </button>
              )}
            </form>
          </div>

          <div className="nav-login-cart">
            {authToken ? (
              <>
                <div className="account-container" ref={dropdownRef}>
                  <img 
                    src={accounticon} 
                    alt="Account" 
                    className="account-icon"
                    onClick={toggleAccountDropdown}
                  />
                  {accountDropdown && (
                    <div className="account-dropdown">
                      <ul>
                        <li>
                          <Link to="/favorites" onClick={() => setAccountDropdown(false)}>
                            المفضلة
                          </Link>
                        </li>
                        <li onClick={handleLogout}>
                          تسجيل الخروج
                        </li>
                      </ul>
                    </div>
                  )}
                </div>
                <Link to="/cart">
                  <img src={cart} alt="" className="cart-icon" />
                </Link>
                <div className="nav-cart-count">{getCartItemCount()}</div>
              </>
            ) : (
              <>
                <Link to="/login"><button>Login</button></Link>
                <Link to="/cart">
                  <img src={cart} alt="" className="cart-icon" />
                </Link>
                <div className="nav-cart-count">{getCartItemCount()}</div>
              </>
            )}
          </div>
        </div>
      </div>
      
      <DarkModeToggle />
    </>
  );
};

export default Navbar;