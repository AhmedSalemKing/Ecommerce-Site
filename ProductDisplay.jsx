import React, { useContext, useState, useEffect, useRef } from "react";
import "./ProductDisplay.css";
import star_icon from "../Assets/star_icon.png";
import star_dull_icon from "../Assets/star_dull_icon.png";
import { ShopContext } from "../../Context/ShopContext";
import { useNavigate } from "react-router-dom";

const ProductDisplay = ({ product }) => {
  const { 
    addToCart, 
    getProductQuantity, 
    cartUpdated,
    fetchOrdersData,
    fetchRevenueData 
  } = useContext(ShopContext);
  
  const navigate = useNavigate();
  const [selectedSize, setSelectedSize] = useState("");
  const [showSizeError, setShowSizeError] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: "", type: "" });
  const [localCartCount, setLocalCartCount] = useState(0);
  const [showPaymentOptions, setShowPaymentOptions] = useState(false);
  const [mainImage, setMainImage] = useState(product?.image || "");
  const [zoomLevel, setZoomLevel] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showMagnifier, setShowMagnifier] = useState(false);
  const [magnifierPosition, setMagnifierPosition] = useState({ x: 0, y: 0 });
  const [activeThumbnail, setActiveThumbnail] = useState(0);
  
  const imageRef = useRef(null);
  const containerRef = useRef(null);
  
  useEffect(() => {
    if (product && selectedSize) {
      const count = getProductQuantity(product.id, selectedSize);
      setLocalCartCount(count);
    }
  }, [cartUpdated, selectedSize, product, getProductQuantity]);
  
  useEffect(() => {
    if (product) {
      setMainImage(product.image);
      setActiveThumbnail(0);
      resetZoom();
    }
  }, [product]);
  
  const resetZoom = () => {
    setZoomLevel(1);
    setPosition({ x: 0, y: 0 });
  };
  
  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.25, 3));
  };
  
  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.25, 1));
  };
  
  const handleMouseDown = (e) => {
    if (zoomLevel > 1) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
    }
  };
  
  const handleMouseMove = (e) => {
    if (isDragging && zoomLevel > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
    
    if (containerRef.current && imageRef.current && zoomLevel === 1) {
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      if (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height) {
        setShowMagnifier(true);
        setMagnifierPosition({ x, y });
      } else {
        setShowMagnifier(false);
      }
    }
  };
  
  const handleMouseUp = () => {
    setIsDragging(false);
  };
  
  const handleMouseLeave = () => {
    setIsDragging(false);
    setShowMagnifier(false);
  };
  
  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoomLevel(prev => Math.max(1, Math.min(3, prev + delta)));
  };
  
  const handleThumbnailClick = (index, img) => {
    setMainImage(img);
    setActiveThumbnail(index);
    resetZoom();
  };
  
  if (!product) {
    return null;
  }
  
  const showNotification = (message, type = "success") => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: "", type: "" }), 4000);
  };
  
  const handleSizeSelect = (size) => {
    setSelectedSize(size);
    setShowSizeError(false);
    const count = getProductQuantity(product.id, size);
    setLocalCartCount(count);
  };
  
  const handleAddToCart = async () => {
    const token = localStorage.getItem("auth-token");
    
    if (!token) {
      showNotification("يرجى تسجيل الدخول أولاً لإضافة المنتجات إلى السلة!", "error");
      setTimeout(() => navigate('/login'), 1500);
      return;
    }
    
    if (!selectedSize) {
      setShowSizeError(true);
      showNotification("يرجى اختيار المقاس أولاً!", "error");
      return;
    }
    
    setShowPaymentOptions(true);
  };
  
  const handlePaymentSelection = async (paymentMethod) => {
    setIsAddingToCart(true);
    
    try {
      const productIdToUse = product.id || product._id;
      const result = await addToCart(productIdToUse, selectedSize, paymentMethod);
      
      if (result.success) {
        const paymentText = paymentMethod === "cash" ? "الدفع عند الاستلام" : "الدفع الآن";
        showNotification(`تمت الإضافة إلى السلة بنجاح! طريقة الدفع: ${paymentText}`, "success");
        setLocalCartCount(prev => prev + 1);
        setShowPaymentOptions(false);
        
        await fetchOrdersData();
        await fetchRevenueData('daily');
      } else {
        if (result.requireLogin) {
          showNotification(result.message, "error");
          setTimeout(() => navigate('/login'), 1500);
        } else {
          showNotification(result.message || "فشلت عملية الإضافة إلى السلة", "error");
        }
      }
    } catch (error) {
      console.error("Error adding to cart:", error);
      showNotification("حدث خطأ أثناء إضافة المنتج إلى السلة!", "error");
    } finally {
      setIsAddingToCart(false);
    }
  };
  
 const handleBuyNow = async () => {
  const token = localStorage.getItem("auth-token");
  
  if (!token) {
    showNotification("يرجى تسجيل الدخول أولاً لإضافة المنتجات إلى السلة!", "error");
    setTimeout(() => navigate('/login'), 1500);
    return;
  }
  
  if (!selectedSize) {
    setShowSizeError(true);
    showNotification("يرجى اختيار المقاس أولاً!", "error");
    return;
  }
  
  setIsAddingToCart(true);
  
  try {
    const productIdToUse = product.id || product._id;
    const result = await addToCart(productIdToUse, selectedSize, "cash"); // استخدام الدفع عند الاستلام كخيار افتراضي
    
    if (result.success) {
      showNotification("تمت إضافة المنتج إلى السلة بنجاح!", "success");
      setLocalCartCount(prev => prev + 1);
      
      await fetchOrdersData();
      await fetchRevenueData('daily');
      
      // التحويل مباشرة إلى صفحة الدفع
      navigate('/checkout');
    } else {
      if (result.requireLogin) {
        showNotification(result.message, "error");
        setTimeout(() => navigate('/login'), 1500);
      } else {
        showNotification(result.message || "فشلت عملية الإضافة إلى السلة", "error");
      }
    }
  } catch (error) {
    console.error("Error adding to cart:", error);
    showNotification("حدث خطأ أثناء إضافة المنتج إلى السلة!", "error");
  } finally {
    setIsAddingToCart(false);
  }
};
  
  const availableSizes = product.sizes || ["S", "M", "L", "XL", "XXL"];
  
  return (
    <div className="product-display-container">
      {notification.show && (
        <div className={`notification ${notification.type} show`}>
          <div className="notification-content">
            <span className="notification-icon">
              {notification.type === "success" ? "✓" : "!"}
            </span>
            <span className="notification-text">{notification.message}</span>
          </div>
        </div>
      )}
      
      <div className="product-display">
        <div className="product-gallery">
          <div className="thumbnail-list">
            {product.images?.map((img, index) => (
              <div 
                key={index} 
                className={`thumbnail ${activeThumbnail === index ? 'active' : ''}`}
                onClick={() => handleThumbnailClick(index, img)}
              >
                <img src={img} alt={`${product.name} view ${index + 1}`} />
              </div>
            ))}
          </div>
          
          <div className="main-image-container" ref={containerRef}>
            <div 
              className="image-wrapper"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
              onWheel={handleWheel}
              style={{ cursor: zoomLevel > 1 ? 'grab' : 'default' }}
            >
              <img 
                ref={imageRef}
                className="main-image" 
                src={mainImage} 
                alt={product.name}
                style={{
                  transform: `scale(${zoomLevel}) translate(${position.x}px, ${position.y}px)`,
                  transition: isDragging ? 'none' : 'transform 0.3s ease'
                }}
              />
              
              {showMagnifier && zoomLevel === 1 && (
                <div 
                  className="magnifier"
                  style={{
                    left: `${magnifierPosition.x - 80}px`,
                    top: `${magnifierPosition.y - 80}px`,
                    backgroundImage: `url(${mainImage})`,
                    backgroundPosition: `-${magnifierPosition.x * 2 - 80}px -${magnifierPosition.y * 2 - 80}px`,
                    backgroundSize: `${imageRef.current?.width * 2}px ${imageRef.current?.height * 2}px`
                  }}
                />
              )}
            </div>
            
            <div className="zoom-controls">
              <button 
                className={`zoom-btn ${zoomLevel <= 1 ? 'disabled' : ''}`}
                onClick={handleZoomOut}
                disabled={zoomLevel <= 1}
                title="Zoom Out"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  <line x1="8" y1="11" x2="14" y2="11"></line>
                </svg>
              </button>
              
              <button 
                className="zoom-btn reset"
                onClick={resetZoom}
                title="Reset Zoom"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="1 4 1 10 7 10"></polyline>
                  <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
                </svg>
              </button>
              
              <button 
                className={`zoom-btn ${zoomLevel >= 3 ? 'disabled' : ''}`}
                onClick={handleZoomIn}
                disabled={zoomLevel >= 3}
                title="Zoom In"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  <line x1="11" y1="8" x2="11" y2="14"></line>
                  <line x1="8" y1="11" x2="14" y2="11"></line>
                </svg>
              </button>
            </div>
            
            <div className="zoom-indicator">
              <div className="zoom-bar">
                <div 
                  className="zoom-level" 
                  style={{ width: `${((zoomLevel - 1) / 2) * 100}%` }}
                ></div>
              </div>
              <span className="zoom-text">{Math.round(zoomLevel * 100)}%</span>
            </div>
          </div>
        </div>
        
        <div className="product-details">
          <div className="product-header">
            <h1 className="product-title">{product.name}</h1>
            <div className="product-rating">
              <div className="stars">
                {[...Array(4)].map((_, i) => (
                  <img key={i} src={star_icon} alt="star" />
                ))}
                <img src={star_dull_icon} alt="half star" />
              </div>
              <span className="review-count">({product.reviews || 122})</span>
            </div>
          </div>
          
          <div className="price-section">
            <div className="current-price">${product.new_price || product.newprice}</div>
            <div className="original-price">${product.old_price || product.oldprice}</div>
            <div className="discount-badge">
              {Math.round((1 - (product.new_price || product.newprice) / (product.old_price || product.oldprice)) * 100)}% OFF
            </div>
          </div>
          
          <div className="product-description">
            <p>Designed for comfort and crafted for style — this lightweight pullover
            hugs your body with a soft, breathable knit that keeps you cool and
            confident all day long.</p>
          </div>
          
          <div className="size-selection">
            <div className="size-header">
              <h2>Select Size</h2>
              <div className="size-guide">
                <span>Size Guide</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="16" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
              </div>
            </div>
            
            <div className="sizes-container">
              {availableSizes.map((size) => (
                <SizeButton 
                  key={size}
                  size={size}
                  isSelected={selectedSize === size}
                  onSelect={handleSizeSelect}
                  quantity={getProductQuantity(product.id, size)}
                />
              ))}
            </div>
            
            {showSizeError && (
              <div className="size-error-message">
                <span className="error-icon">!</span>
                <span>يرجى اختيار المقاس للمتابعة!</span>
              </div>
            )}
            
            {selectedSize && (
              <div className="selected-size-info">
                <span className="info-label">المقاس المختار:</span> 
                <span className="size-value">{selectedSize}</span>
                {localCartCount > 0 && (
                  <span className="cart-count">
                    <span className="cart-icon">🛒</span>
                    {localCartCount} في السلة
                  </span>
                )}
              </div>
            )}
          </div>
          
          <div className="action-buttons">
            <AddToCartButton 
              isDisabled={!selectedSize || isAddingToCart}
              isLoading={isAddingToCart}
              selectedSize={selectedSize}
              onClick={handleAddToCart}
            />
            
            <BuyNowButton 
              isDisabled={!selectedSize || isAddingToCart}
              isLoading={isAddingToCart}
              selectedSize={selectedSize}
              onClick={handleBuyNow}
            />
          </div>
          
          <div className="product-meta">
            <div className="meta-item">
              <span className="meta-label">Category:</span>
              <span className="meta-value">{product.category || "General"}</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Tags:</span>
              <span className="meta-value">Modern, Latest</span>
            </div>
          </div>
          
          <div className="product-highlights">
            <div className="highlight-item">
              <div className="highlight-icon">🚚</div>
              <div className="highlight-text">
                <div className="highlight-title">Free Delivery</div>
                <div className="highlight-subtitle">On orders over $50</div>
              </div>
            </div>
            <div className="highlight-item">
              <div className="highlight-icon">↩️</div>
              <div className="highlight-text">
                <div className="highlight-title">Easy Returns</div>
                <div className="highlight-subtitle">30-day return policy</div>
              </div>
            </div>
            <div className="highlight-item">
              <div className="highlight-icon">🔒</div>
              <div className="highlight-text">
                <div className="highlight-title">Secure Payment</div>
                <div className="highlight-subtitle">100% secure transactions</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {showPaymentOptions && (
        <PaymentOptionsModal 
          onSelect={handlePaymentSelection}
          onClose={() => setShowPaymentOptions(false)}
          isProcessing={isAddingToCart}
        />
      )}
    </div>
  );
};

const SizeButton = ({ size, isSelected, onSelect, quantity }) => {
  return (
    <div 
      className={`size-button ${isSelected ? 'selected' : ''} ${quantity > 0 ? 'in-cart' : ''}`}
      onClick={() => onSelect(size)}
    >
      <span className="size-label">{size}</span>
      {quantity > 0 && (
        <span className="cart-indicator">{quantity}</span>
      )}
    </div>
  );
};

const AddToCartButton = ({ isDisabled, isLoading, selectedSize, onClick }) => {
  return (
    <button 
      onClick={onClick}
      className={`add-to-cart-button ${isDisabled ? 'disabled' : ''} ${isLoading ? 'loading' : ''}`}
      disabled={isDisabled}
    >
      {isLoading ? (
        <div className="button-loading">
          <span className="spinner"></span>
          <span>Adding...</span>
        </div>
      ) : (
        <div className="button-content">
          <span className="button-icon">🛒</span>
          <span className="button-text">
            {selectedSize ? `ADD TO CART` : 'SELECT SIZE'}
          </span>
        </div>
      )}
    </button>
  );
};

const BuyNowButton = ({ isDisabled, isLoading, selectedSize, onClick }) => {
  return (
    <button 
      onClick={onClick}
      className={`buy-now-button ${isDisabled ? 'disabled' : ''} ${isLoading ? 'loading' : ''}`}
      disabled={isDisabled}
    >
      {isLoading ? (
        <div className="button-loading">
          <span className="spinner"></span>
          <span>Processing...</span>
        </div>
      ) : (
        <div className="button-content">
          <span className="button-icon">⚡</span>
          <span className="button-text">
            {selectedSize ? `BUY NOW` : 'SELECT SIZE'}
          </span>
        </div>
      )}
    </button>
  );
};

const PaymentOptionsModal = ({ onSelect, onClose, isProcessing }) => {
  const [selectedMethod, setSelectedMethod] = useState("");
  
  const handleConfirm = () => {
    if (selectedMethod) {
      onSelect(selectedMethod);
    }
  };
  
  return (
    <div className="payment-modal-overlay" onClick={onClose}>
      <div className="payment-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Payment Method</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <p className="modal-subtitle">How would you like to pay for this product?</p>
        
        <div className="payment-methods">
          <div 
            className={`payment-method ${selectedMethod === 'cash' ? 'selected' : ''}`}
            onClick={() => setSelectedMethod('cash')}
          >
            <div className="method-icon">💵</div>
            <div className="method-details">
              <div className="method-name">Cash on Delivery</div>
              <div className="method-description">Pay when you receive the product</div>
            </div>
            <div className="method-selector">
              <div className={`radio-button ${selectedMethod === 'cash' ? 'selected' : ''}`}></div>
            </div>
          </div>
          
          <div 
            className={`payment-method ${selectedMethod === 'online' ? 'selected' : ''}`}
            onClick={() => setSelectedMethod('online')}
          >
            <div className="method-icon">💳</div>
            <div className="method-details">
              <div className="method-name">Pay Now</div>
              <div className="method-description">Pay immediately with credit card</div>
            </div>
            <div className="method-selector">
              <div className={`radio-button ${selectedMethod === 'online' ? 'selected' : ''}`}></div>
            </div>
          </div>
        </div>
        
        <button 
          className={`confirm-button ${!selectedMethod ? 'disabled' : ''}`}
          onClick={handleConfirm}
          disabled={!selectedMethod || isProcessing}
        >
          {isProcessing ? (
            <>
              <span className="spinner"></span>
              Processing...
            </>
          ) : (
            'Confirm and Add to Cart'
          )}
        </button>
      </div>
    </div>
  );
};

export default ProductDisplay;