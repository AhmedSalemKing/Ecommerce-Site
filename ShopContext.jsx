import React, { createContext, useState, useEffect, useCallback } from "react";
export const ShopContext = createContext(null);
const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:4001";
const normalizeCartData = (cartData, products) => {
  const normalized = {};
  
  // تهيئة الهيكل الأساسي
  products.forEach((p) => {
    normalized[String(p.id)] = {};
  });
  
  // ملء البيانات الفعلية
  if (cartData && typeof cartData === 'object') {
    Object.keys(cartData).forEach(key => {
      const value = cartData[key];
      
      if (typeof value === 'number' && value > 0) {
        normalized[key] = { 'default': value };
      } else if (typeof value === 'object' && value !== null) {
        // تنظيف القيم الفارغة أو الصفرية
        const cleanedValue = {};
        Object.keys(value).forEach(size => {
          if (value[size] > 0) {
            cleanedValue[size] = value[size];
          }
        });
        if (Object.keys(cleanedValue).length > 0) {
          normalized[key] = cleanedValue;
        }
      }
    });
  }
  
  return normalized;
};
const ShopContextProvider = ({ children }) => {
  const [all_product, setAll_Product] = useState([]);
  const [cartItems, setCartItems] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [cartUpdated, setCartUpdated] = useState(0);
  const [localCartBackup, setLocalCartBackup] = useState({});
  const [orders, setOrders] = useState([]);
  const [revenue, setRevenue] = useState({ daily: [], monthly: [], yearly: [] });
  const [isAdmin, setIsAdmin] = useState(false);
  const [isTokenExpired, setIsTokenExpired] = useState(false);
  const [isRefreshingToken, setIsRefreshingToken] = useState(false);
  const [user, setUser] = useState(null);
  
  // دالة لجلب بيانات السلة من الخادم
  const fetchCartData = useCallback(async () => {
    const token = localStorage.getItem("auth-token");
    if (!token) return {};
    try {
      const res = await fetch(`${API_BASE}/getcartdata`, {
        headers: { "auth-token": token },
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          return data.cartData || {};
        }
      }
    } catch (error) {
      console.error("Error fetching cart data:", error);
    }
    return {};
  }, []);
  
  // دالة لجلب بيانات الطلبات من الخادم
  const fetchOrdersData = useCallback(async () => {
    const token = localStorage.getItem("auth-token");
    if (!token) return [];
    try {
      const res = await fetch(`${API_BASE}/myorders`, {
        headers: { "auth-token": token },
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          return data.orders || [];
        }
      }
    } catch (error) {
      console.error("Error fetching orders data:", error);
    }
    return [];
  }, []);
  
  // دالة لجلب بيانات الإيرادات من الخادم
  const fetchRevenueData = useCallback(async (period = 'daily') => {
    const token = localStorage.getItem("auth-token");
    if (!token) return [];
    try {
      const res = await fetch(`${API_BASE}/admin/revenue?period=${period}`, {
        headers: { "auth-token": token },
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        console.error('Revenue data fetch error:', errorData);
        
        if (res.status === 403) {
          // قد يكون المستخدم ليس إدمنًا
          console.error('Access denied. User may not be an admin.');
          // التحقق من دور المستخدم
          const user = JSON.parse(localStorage.getItem('user') || '{}');
          console.log('User role:', user.role);
          setIsAdmin(user.role === 'admin');
        }
        
        return [];
      }
      
      const data = await res.json();
      if (data.success) {
        return data.data || [];
      }
    } catch (error) {
      console.error("Error fetching revenue data:", error);
    }
    return [];
  }, []);
  
  // دالة لمزامنة السلة المحلية مع الخادم
  const syncCartWithServer = useCallback(async () => {
    const token = localStorage.getItem("auth-token");
    if (!token) {
      // إذا لم يكن مسجل دخول، استخدم النسخة الاحتياطية المحلية
      const backup = restoreCartFromLocal();
      if (Object.keys(backup).length > 0) {
        const normalizedCart = normalizeCartData(backup, all_product);
        setCartItems(normalizedCart);
      }
      return;
    }
    try {
      const serverCart = await fetchCartData();
      const normalizedCart = normalizeCartData(serverCart, all_product);
      setCartItems(normalizedCart);
      
      // حفظ نسخة احتياطية محلية
      backupCartToLocal(normalizedCart);
      
      // جلب بيانات الطلبات والإيرادات
      const ordersData = await fetchOrdersData();
      setOrders(ordersData);
      
      const dailyRevenue = await fetchRevenueData('daily');
      const monthlyRevenue = await fetchRevenueData('monthly');
      const yearlyRevenue = await fetchRevenueData('yearly');
      setRevenue({
        daily: dailyRevenue,
        monthly: monthlyRevenue,
        yearly: yearlyRevenue
      });
    } catch (error) {
      console.error("Error syncing cart:", error);
    }
  }, [all_product, fetchCartData, fetchOrdersData, fetchRevenueData]);
  
  // حفظ نسخة احتياطية محلية
  const backupCartToLocal = useCallback((cartData) => {
    try {
      localStorage.setItem('cart-backup', JSON.stringify(cartData));
    } catch (error) {
      console.error('Error backing up cart to local storage:', error);
    }
  }, []);
  
  // استعادة النسخة الاحتياطية
  const restoreCartFromLocal = useCallback(() => {
    try {
      const backup = localStorage.getItem('cart-backup');
      if (backup) {
        return JSON.parse(backup);
      }
    } catch (error) {
      console.error('Error restoring cart from local storage:', error);
    }
    return {};
  }, []);
  
  // تحديث النسخة الاحتياطية عند تغيير السلة
  useEffect(() => {
    if (Object.keys(cartItems).length > 0) {
      backupCartToLocal(cartItems);
    }
  }, [cartItems, backupCartToLocal]);
  
  // Check admin status and user data
  useEffect(() => {
    const checkUserStatus = () => {
      const userData = localStorage.getItem('user');
      const token = localStorage.getItem('auth-token');
      const refreshToken = localStorage.getItem('refresh-token');
      
      if (userData) {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        setIsAdmin(parsedUser.role === 'admin');
      }
      
      // Check if token is expired
      if (token) {
        try {
          const decoded = JSON.parse(atob(token.split('.')[1]));
          const currentTime = Math.floor(Date.now() / 1000);
          
          if (decoded.exp < currentTime) {
            setIsTokenExpired(true);
          }
        } catch (error) {
          console.error('Error decoding token:', error);
          setIsTokenExpired(true);
        }
      }
    };
    
    checkUserStatus();
  }, []);
  
  useEffect(() => {
    const initializeData = async () => {
      try {
        setIsLoading(true);
        
        // جلب المنتجات
        const productsRes = await fetch(`${API_BASE}/allproducts`);
        if (productsRes.ok) {
          const productsData = await productsRes.json();
          setAll_Product(productsData);
        }
        
        // جلب ومزامنة بيانات السلة والطلبات والإيرادات
        await syncCartWithServer();
      } catch (error) {
        console.error("Error initializing data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    initializeData();
  }, []);
  
  // إعادة مزامنة عند تحميل المنتجات
  useEffect(() => {
    if (all_product.length > 0) {
      syncCartWithServer();
    }
  }, [all_product, syncCartWithServer]);
  
  // الاستماع لتغيرات localStorage للتحديث التلقائي
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'auth-token' || e.key === 'user') {
        const userData = localStorage.getItem('user');
        if (userData) {
          const parsedUser = JSON.parse(userData);
          setUser(parsedUser);
          setIsAdmin(parsedUser.role === 'admin');
        }
        syncCartWithServer();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [syncCartWithServer]);
  
  // دالة لتجديد التوكن
  const refreshToken = useCallback(async () => {
    const refreshToken = localStorage.getItem("refresh-token");
    if (!refreshToken) {
      return false;
    }
    
    try {
      setIsRefreshingToken(true);
      const response = await fetch(`${API_BASE}/refresh-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          localStorage.setItem("auth-token", data.token);
          setIsTokenExpired(false);
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error("Error refreshing token:", error);
      return false;
    } finally {
      setIsRefreshingToken(false);
    }
  }, []);
  
  // دالة لتسجيل الدخول
  const login = useCallback(async (email, password) => {
    try {
      const response = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        // تخزين التوكن والبيانات
        localStorage.setItem("auth-token", data.token);
        localStorage.setItem("refresh-token", data.refreshToken);
        localStorage.setItem("user", JSON.stringify(data.user));
        
        setUser(data.user);
        setIsAdmin(data.user.role === 'admin');
        setIsTokenExpired(false);
        
        return { success: true };
      } else {
        return { success: false, error: data.error };
      }
    } catch (error) {
      console.error("Login error:", error);
      return { success: false, error: "Network error" };
    }
  }, []);
  
  // دالة لتسجيل الخروج
  const logout = useCallback(() => {
    localStorage.removeItem("auth-token");
    localStorage.removeItem("refresh-token");
    localStorage.removeItem("user");
    setUser(null);
    setIsAdmin(false);
    setIsTokenExpired(false);
    setCartItems({});
  }, []);
  
  const addToCart = async (itemId, selectedSize = 'default', paymentMethod = 'cash') => {
    const token = localStorage.getItem("auth-token");
    
    console.log('🛒 Frontend addToCart called:', { itemId, selectedSize, paymentMethod });
    
    if (!selectedSize || selectedSize === 'default') {
      return { success: false, message: "Please select a size first" };
    }
    if (!token) {
      return { success: false, message: "Please login first", requireLogin: true };
    }
    
    try {
      // Find the product to ensure we have the correct ID format
      const product = all_product.find(p => 
        String(p.id) === String(itemId) || 
        String(p._id) === String(itemId)
      );
      if (!product) {
        console.error('❌ Product not found in frontend:', { itemId, availableProducts: all_product.length });
        return { success: false, message: "Product not found" };
      }
      // Use the numeric ID preferably, fall back to _id
      const productIdToSend = product.id || product._id;
      
      console.log('📦 Product found:', { 
        originalItemId: itemId,
        productIdToSend,
        productName: product.name,
        availableSizes: product.sizes
      });
      
      // تحديث واجهة المستخدم أولاً لتحسين التجربة
      setCartItems(prev => {
        const newCart = { ...prev };
        const key = String(productIdToSend);
        
        if (!newCart[key]) newCart[key] = {};
        newCart[key][selectedSize] = (newCart[key][selectedSize] || 0) + 1;
        
        return newCart;
      });
      
      // إشعار فوري بالتحديث
      setCartUpdated(prev => prev + 1);
      
      // إعداد البيانات للإرسال
      const requestBody = {
        itemId: productIdToSend,        // Primary field
        productId: productIdToSend,     // Backup field
        quantity: 1, 
        size: selectedSize,
        paymentMethod: paymentMethod || 'cash'
      };
      
      console.log('📡 Sending request to server:', requestBody);
      
      // محاولة إرسال الطلب إلى الخادم
      let response;
      try {
        response = await fetch(`${API_BASE}/addtocart`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "auth-token": token,
          },
          body: JSON.stringify(requestBody),
        });
      } catch (networkError) {
        console.error('❌ Network error:', networkError);
        throw new Error('Network error. Please check your connection.');
      }
      
      // التعامل مع استجابة الخادم
      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        console.error('❌ Error parsing response:', parseError);
        throw new Error('Invalid server response.');
      }
      
      console.log('📨 Server response:', data);
      
      // إذا كان التوكن منتهي الصلاحية، حاول تجديده
      if (response.status === 401 && (data.code === 'TOKEN_EXPIRED' || data.error?.includes('Token expired'))) {
        console.log('🔄 Token expired, attempting to refresh...');
        const refreshSuccess = await refreshToken();
        
        if (refreshSuccess) {
          console.log('✅ Token refreshed successfully, retrying request...');
          const newToken = localStorage.getItem("auth-token");
          
          // إعادة المحاولة مع التوكن الجديد
          response = await fetch(`${API_BASE}/addtocart`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "auth-token": newToken,
            },
            body: JSON.stringify(requestBody),
          });
          
          data = await response.json();
          console.log('📨 Server response after token refresh:', data);
        } else {
          console.log('❌ Failed to refresh token');
          setIsTokenExpired(true);
          throw new Error('Session expired. Please login again.');
        }
      }
      
      if (!data.success) {
        console.error('❌ Server error:', data.error, data.debug);
        
        // إذا فشل الطلب، نرجع الحالة إلى ما كانت عليه
        setCartItems(prev => {
          const newCart = { ...prev };
          const key = String(productIdToSend);
          
          if (newCart[key] && newCart[key][selectedSize]) {
            newCart[key][selectedSize] -= 1;
            if (newCart[key][selectedSize] <= 0) {
              delete newCart[key][selectedSize];
            }
            if (Object.keys(newCart[key]).length === 0) {
              delete newCart[key];
            }
          }
          
          return newCart;
        });
        
        setCartUpdated(prev => prev + 1);
        
        return { 
          success: false, 
          message: data.error || "Failed to add to cart",
          debug: data.debug
        };
      }
      
      // تحديث السلة بالبيانات من الخادم إذا كانت متوفرة
      if (data.cartData) {
        const normalizedCart = normalizeCartData(data.cartData, all_product);
        setCartItems(normalizedCart);
      }
      
      // تحديث بيانات الطلبات
      const ordersData = await fetchOrdersData();
      setOrders(ordersData);
      
      setCartUpdated(prev => prev + 1);
      
      console.log('✅ Product added successfully:', data.productInfo);
      
      return { 
        success: true, 
        message: "Product added to cart!",
        productInfo: data.productInfo
      };
    } catch (error) {
      console.error("❌ Add to cart network error:", error);
      
      // استعادة الحالة الأصلية عند الخطأ
      setCartItems(prev => {
        const newCart = { ...prev };
        const key = String(itemId);
        
        if (newCart[key] && newCart[key][selectedSize]) {
          newCart[key][selectedSize] -= 1;
          if (newCart[key][selectedSize] <= 0) {
            delete newCart[key][selectedSize];
          }
          if (Object.keys(newCart[key]).length === 0) {
            delete newCart[key];
          }
        }
        
        return newCart;
      });
      
      setCartUpdated(prev => prev + 1);
      
      return { success: false, message: error.message || "Network error. Please try again." };
    }
  };
  
  const removeFromCart = async (itemId, selectedSize = 'default') => {
    const token = localStorage.getItem("auth-token");
    if (!token) {
      return { success: false, message: "Please login first" };
    }
    try {
      // Find the product to ensure we have the correct ID format
      const product = all_product.find(p => 
        String(p.id) === String(itemId) || 
        String(p._id) === String(itemId)
      );
      if (!product) {
        console.error('❌ Product not found for removal:', { itemId });
        return { success: false, message: "Product not found" };
      }
      const productIdToSend = product.id || product._id;
      
      console.log('🗑️ Removing from cart:', { 
        originalItemId: itemId,
        productIdToSend,
        selectedSize,
        productName: product.name
      });
      
      // تحديث واجهة المستخدم أولاً
      setCartItems(prev => {
        const newCart = { ...prev };
        const key = String(productIdToSend);
        
        if (newCart[key] && newCart[key][selectedSize]) {
          newCart[key][selectedSize] -= 1;
          if (newCart[key][selectedSize] <= 0) {
            delete newCart[key][selectedSize];
          }
          if (Object.keys(newCart[key]).length === 0) {
            delete newCart[key];
          }
        }
        
        return newCart;
      });
      
      setCartUpdated(prev => prev + 1);
      
      // محاولة إرسال الطلب إلى الخادم
      let response;
      try {
        response = await fetch(`${API_BASE}/addtocart`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "auth-token": token,
          },
          body: JSON.stringify({ 
            itemId: productIdToSend,
            productId: productIdToSend, 
            quantity: -1, 
            size: selectedSize 
          }),
        });
      } catch (networkError) {
        console.error('❌ Network error:', networkError);
        throw new Error('Network error. Please check your connection.');
      }
      
      // التعامل مع استجابة الخادم
      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        console.error('❌ Error parsing response:', parseError);
        throw new Error('Invalid server response.');
      }
      
      // إذا كان التوكن منتهي الصلاحية، حاول تجديده
      if (response.status === 401 && (data.code === 'TOKEN_EXPIRED' || data.error?.includes('Token expired'))) {
        console.log('🔄 Token expired, attempting to refresh...');
        const refreshSuccess = await refreshToken();
        
        if (refreshSuccess) {
          console.log('✅ Token refreshed successfully, retrying request...');
          const newToken = localStorage.getItem("auth-token");
          
          // إعادة المحاولة مع التوكن الجديد
          response = await fetch(`${API_BASE}/addtocart`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "auth-token": newToken,
            },
            body: JSON.stringify({ 
              itemId: productIdToSend,
              productId: productIdToSend, 
              quantity: -1, 
              size: selectedSize 
            }),
          });
          
          data = await response.json();
          console.log('📨 Server response after token refresh:', data);
        } else {
          console.log('❌ Failed to refresh token');
          setIsTokenExpired(true);
          throw new Error('Session expired. Please login again.');
        }
      }
      
      if (!data.success) {
        console.error('❌ Failed to remove from server:', data.error);
        // إعادة المزامنة مع الخادم في حالة الخطأ
        syncCartWithServer();
        return { success: false, message: data.error || "Failed to remove from cart" };
      }
      
      // تحديث السلة بالبيانات من الخادم إذا كانت متوفرة
      if (data.cartData) {
        const normalizedCart = normalizeCartData(data.cartData, all_product);
        setCartItems(normalizedCart);
      }
      
      // تحديث بيانات الطلبات
      const ordersData = await fetchOrdersData();
      setOrders(ordersData);
      
      console.log('✅ Successfully removed from cart:', data.productInfo);
      
      return { success: true, message: "Product removed from cart!" };
    } catch (error) {
      console.error("❌ Remove from cart error:", error);
      syncCartWithServer();
      return { success: false, message: error.message || "Network error" };
    }
  };
  
  // دالة جديدة لتحديث كمية المنتج مباشرة
  const updateCartQuantity = async (itemId, size, newQuantity) => {
    const token = localStorage.getItem("auth-token");
    if (!token) {
      return { success: false, message: "Please login first" };
    }
    
    // تعريف المتغيرات قبل try block لتكون متاحة في catch block
    let productIdToSend;
    let currentQuantity;
    
    try {
      // Find the product to ensure we have the correct ID format
      const product = all_product.find(p => 
        String(p.id) === String(itemId) || 
        String(p._id) === String(itemId)
      );
      if (!product) {
        console.error('❌ Product not found for update:', { itemId });
        return { success: false, message: "Product not found" };
      }
      
      productIdToSend = product.id || product._id;
      
      // الحصول على الكمية الحالية
      currentQuantity = cartItems[productIdToSend]?.[size] || 0;
      
      // حساب الفرق
      const difference = newQuantity - currentQuantity;
      
      // إذا لم يكن هناك تغيير، ارجع بنجاح
      if (difference === 0) {
        return { success: true, message: "No change in quantity" };
      }
      
      console.log('🔄 Updating cart quantity:', { 
        productId: productIdToSend,
        size,
        currentQuantity,
        newQuantity,
        difference
      });
      
      // تحديث واجهة المستخدم أولاً
      setCartItems(prev => {
        const newCart = { ...prev };
        const key = String(productIdToSend);
        
        if (!newCart[key]) newCart[key] = {};
        
        if (newQuantity <= 0) {
          delete newCart[key][size];
          if (Object.keys(newCart[key]).length === 0) {
            delete newCart[key];
          }
        } else {
          newCart[key][size] = newQuantity;
        }
        
        return newCart;
      });
      
      // إشعار فوري بالتحديث
      setCartUpdated(prev => prev + 1);
      
      // إعداد البيانات للإرسال
      const requestBody = {
        itemId: productIdToSend,
        productId: productIdToSend,
        quantity: difference,
        size: size,
        paymentMethod: 'cash' // غير مهم عند التحديث
      };
      
      console.log('📡 Sending update request to server:', requestBody);
      
      // محاولة إرسال الطلب إلى الخادم
      let response;
      try {
        response = await fetch(`${API_BASE}/addtocart`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "auth-token": token,
          },
          body: JSON.stringify(requestBody),
        });
      } catch (networkError) {
        console.error('❌ Network error:', networkError);
        throw new Error('Network error. Please check your connection.');
      }
      
      // التعامل مع استجابة الخادم
      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        console.error('❌ Error parsing response:', parseError);
        throw new Error('Invalid server response.');
      }
      
      console.log('📨 Server response:', data);
      
      // إذا كان التوكن منتهي الصلاحية، حاول تجديده
      if (response.status === 401 && (data.code === 'TOKEN_EXPIRED' || data.error?.includes('Token expired'))) {
        console.log('🔄 Token expired, attempting to refresh...');
        const refreshSuccess = await refreshToken();
        
        if (refreshSuccess) {
          console.log('✅ Token refreshed successfully, retrying request...');
          const newToken = localStorage.getItem("auth-token");
          
          // إعادة المحاولة مع التوكن الجديد
          response = await fetch(`${API_BASE}/addtocart`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "auth-token": newToken,
            },
            body: JSON.stringify(requestBody),
          });
          
          data = await response.json();
          console.log('📨 Server response after token refresh:', data);
        } else {
          console.log('❌ Failed to refresh token');
          setIsTokenExpired(true);
          throw new Error('Session expired. Please login again.');
        }
      }
      
      if (!data.success) {
        console.error('❌ Server error:', data.error, data.debug);
        
        // إذا فشل الطلب، نرجع الحالة إلى ما كانت عليه
        setCartItems(prev => {
          const newCart = { ...prev };
          const key = String(productIdToSend);
          
          if (newCart[key]) {
            newCart[key][size] = currentQuantity;
          }
          
          return newCart;
        });
        
        setCartUpdated(prev => prev + 1);
        
        return { 
          success: false, 
          message: data.error || "Failed to update quantity",
          debug: data.debug
        };
      }
      
      // تحديث السلة بالبيانات من الخادم إذا كانت متوفرة
      if (data.cartData) {
        const normalizedCart = normalizeCartData(data.cartData, all_product);
        setCartItems(normalizedCart);
      }
      
      // تحديث بيانات الطلبات
      const ordersData = await fetchOrdersData();
      setOrders(ordersData);
      
      setCartUpdated(prev => prev + 1);
      
      console.log('✅ Quantity updated successfully:', data.productInfo);
      
      return { 
        success: true, 
        message: "Quantity updated successfully!",
        productInfo: data.productInfo
      };
    } catch (error) {
      console.error("❌ Update quantity error:", error);
      
      // استعادة الحالة الأصلية عند الخطأ
      setCartItems(prev => {
        const newCart = { ...prev };
        const key = String(productIdToSend);
        
        if (newCart[key]) {
          newCart[key][size] = currentQuantity;
        }
        
        return newCart;
      });
      
      setCartUpdated(prev => prev + 1);
      
      return { success: false, message: error.message || "Network error. Please try again." };
    }
  };
  
  const clearCart = async () => {
    const token = localStorage.getItem("auth-token");
    if (!token) {
      return { success: false, message: "Please login first" };
    }
    try {
      const res = await fetch(`${API_BASE}/clearcart`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "auth-token": token,
        },
      });
      
      const data = await res.json();
      
      if (data.success) {
        setCartItems({});
        setCartUpdated(prev => prev + 1);
        
        // تحديث بيانات الطلبات
        const ordersData = await fetchOrdersData();
        setOrders(ordersData);
        
        return { success: true, message: "Cart cleared successfully" };
      } else {
        return { success: false, message: data.error };
      }
    } catch (error) {
      console.error("Clear cart error:", error);
      return { success: false, message: "Network error" };
    }
  };
  
  const getTotalCartAmount = useCallback(() => {
    let total = 0;
    for (const itemKey in cartItems) {
      const sizes = cartItems[itemKey] || {};
      for (const size in sizes) {
        const qty = sizes[size] || 0;
        if (qty > 0) {
          const product = all_product.find((p) => String(p.id) === String(itemKey));
          if (product) {
            total += Number(product.new_price || product.newprice || 0) * qty;
          }
        }
      }
    }
    return Math.round(total * 100) / 100; // تدوير لأقرب سنت
  }, [cartItems, all_product]);
  
  const getTotalCartItems = useCallback(() => {
    let total = 0;
    for (const itemKey in cartItems) {
      const sizes = cartItems[itemKey] || {};
      for (const size in sizes) {
        total += sizes[size] || 0;
      }
    }
    return total;
  }, [cartItems]);
  
  const getProductQuantity = useCallback((itemId, size = null) => {
    const key = String(itemId);
    const itemData = cartItems[key] || {};
    
    if (size) {
      return itemData[size] || 0;
    }
    
    let total = 0;
    for (const s in itemData) {
      total += itemData[s] || 0;
    }
    return total;
  }, [cartItems]);
  
  const contextValue = {
    all_product,
    cartItems,
    orders,
    revenue,
    addToCart,
    removeFromCart,
    updateCartQuantity, // إضافة الدالة الجديدة
    clearCart,
    getTotalCartAmount,
    getTotalCartItems,
    getProductQuantity,
    isLoading,
    cartUpdated,
    API_BASE,
    syncCartWithServer,
    fetchOrdersData,
    fetchRevenueData,
    isAdmin,
    isTokenExpired,
    isRefreshingToken,
    refreshToken,
    login,
    logout,
    user,
  };
  
  return (
    <ShopContext.Provider value={contextValue}>
      {children}
    </ShopContext.Provider>
  );
};
export default ShopContextProvider;