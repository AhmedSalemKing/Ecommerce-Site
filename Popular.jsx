import React, { useEffect, useState, useRef } from "react";
import "./Popular.css";
import Item from "../Item/Item";

const Popular = () => {
  const [popularProducts, setPopularProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showNavigation, setShowNavigation] = useState(false);
  const scrollContainerRef = useRef(null);

  useEffect(() => {
    const fetchPopularProducts = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch('http://localhost:4001/popularinwomen');
        
        if (!response.ok) {
          throw new Error(`Server returned ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        let productsArray = [];

        if (Array.isArray(data)) {
          productsArray = data;
        } else if (data && typeof data === 'object') {
          if (data.products && Array.isArray(data.products)) {
            productsArray = data.products;
          } else if (data.data && Array.isArray(data.data)) {
            productsArray = data.data;
          } else if (data.success && Array.isArray(data.result)) {
            productsArray = data.result;
          } else {
            productsArray = Object.values(data).filter(item => 
              item && typeof item === 'object' && (item.id || item._id)
            );
          }
        }

        setPopularProducts(productsArray.length > 0 ? productsArray : []);
        
      } catch (err) {
        console.error("Error fetching popular products:", err);
        setError(err.message);
        setPopularProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPopularProducts();
  }, []);

  // التحقق مما إذا كان التمرير متاحًا وعرض أزرار التنقل
  useEffect(() => {
    const checkScroll = () => {
      if (scrollContainerRef.current) {
        const { scrollWidth, clientWidth } = scrollContainerRef.current;
        setShowNavigation(scrollWidth > clientWidth);
      }
    };

    checkScroll();
    window.addEventListener('resize', checkScroll);
    
    return () => {
      window.removeEventListener('resize', checkScroll);
    };
  }, [popularProducts]);

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      const scrollAmount = scrollContainerRef.current.clientWidth * 0.8;
      scrollContainerRef.current.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      const scrollAmount = scrollContainerRef.current.clientWidth * 0.8;
      scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const updateCurrentIndex = () => {
    if (scrollContainerRef.current && popularProducts.length > 0) {
      const scrollPos = scrollContainerRef.current.scrollLeft;
      const itemWidth = scrollContainerRef.current.querySelector('.item').offsetWidth + 
                        parseInt(getComputedStyle(scrollContainerRef.current).gap);
      const newIndex = Math.round(scrollPos / itemWidth);
      setCurrentIndex(Math.min(newIndex, popularProducts.length - 1));
    }
  };

  return (
    <div className="popular">
      <h1>POPULAR IN WOMEN</h1>
      
      {loading && (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading popular products...</p>
        </div>
      )}
      
      {error && (
        <div className="error-container">
          <p>Error: {error}</p>
          <button onClick={() => window.location.reload()}>Try Again</button>
        </div>
      )}
      
      {!loading && !error && (
        <div className="popular-wrapper">
          <div 
            className="popular-items"
            ref={scrollContainerRef}
            onScroll={updateCurrentIndex}
          >
            {popularProducts.length > 0 ? (
              popularProducts.map((item, index) => (
                <Item 
                  key={item.id || item._id || index} 
                  id={item.id || item._id} 
                  image={item.image} 
                  name={item.name || item.title} 
                  new_price={item.new_price || item.newprice || 0} 
                  old_price={item.old_price || item.oldprice} 
                />
              ))
            ) : (
              <div className="no-products">
                <p>No popular products found.</p>
              </div>
            )}
          </div>

          {showNavigation && (
            <div className="popular-nav">
              <button onClick={scrollLeft} aria-label="Scroll left">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <button onClick={scrollRight} aria-label="Scroll right">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          )}

          <div className="scroll-indicator">
            {popularProducts.map((_, index) => (
              <div
                key={index}
                className={`scroll-dot ${index === currentIndex ? 'active' : ''}`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Popular;