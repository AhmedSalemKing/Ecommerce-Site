import React, { useEffect, useRef, useState } from "react";
import Item from "../Item/Item";
import "./NewCollection.css";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:4001";

const NewCollections = () => {
  const [collections, setCollections] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const r = await fetch(`${API_BASE}/newcollections`);
        if (!r.ok) throw new Error("newcollections not found");
        const data = await r.json();

        if (Array.isArray(data) && data.length > 0) {
          setCollections(data);
        } else {
          const r2 = await fetch(`${API_BASE}/allproducts`);
          const data2 = await r2.json();
          setCollections(data2.slice(-8).reverse());
        }
      } catch (err) {
        console.error("Error loading new collections:", err);
        try {
          const r2 = await fetch(`${API_BASE}/allproducts`);
          const data2 = await r2.json();
          setCollections(data2.slice(-8).reverse());
        } catch (e2) {
          console.error("Fallback failed:", e2);
          setCollections([]);
        }
      }
    };
    load();
  }, []);

  const scrollRef = useRef(null);
  const [isPaused, setIsPaused] = useState(false);
  const [isAtStart, setIsAtStart] = useState(true);
  const [isAtEnd, setIsAtEnd] = useState(false);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    
    const checkScrollPosition = () => {
      setIsAtStart(container.scrollLeft === 0);
      setIsAtEnd(container.scrollLeft >= container.scrollWidth - container.clientWidth - 1);
    };
    
    container.addEventListener('scroll', checkScrollPosition);
    checkScrollPosition();
    
    return () => container.removeEventListener('scroll', checkScrollPosition);
  }, [collections]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container || collections.length === 0) return;
    
    let scrollAmount = 0;
    const scrollStep = 1;
    const interval = setInterval(() => {
      if (!container || isPaused) return;
      
      scrollAmount += scrollStep;
      if (scrollAmount >= container.scrollWidth / 2) scrollAmount = 0;
      
      container.scrollTo({ left: scrollAmount, behavior: "smooth" });
    }, 50);
    
    return () => clearInterval(interval);
  }, [isPaused, collections]);

  const handleUserScroll = () => {
    setIsPaused(true);
    clearTimeout(scrollRef.current?.pauseTimeout);
    scrollRef.current.pauseTimeout = setTimeout(() => setIsPaused(false), 3000);
  };

  const scrollLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -300, behavior: 'smooth' });
      handleUserScroll();
    }
  };

  const scrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 300, behavior: 'smooth' });
      handleUserScroll();
    }
  };

  return (
    <div className="new-collections">
      <div className="collections-header">
        <h1>NEW COLLECTIONS</h1>
        <div className="title-decoration">
          <div className="decoration-line"></div>
          <div className="decoration-dot"></div>
          <div className="decoration-line"></div>
        </div>
        <p className="collections-subtitle">Discover our latest additions</p>
      </div>
      
      <div className="collections-container">
        {!isAtStart && (
          <button className="nav-button nav-button-left" onClick={scrollLeft} aria-label="Scroll left">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
          </button>
        )}
        
        <div
          className="new-collections-items"
          ref={scrollRef}
          onTouchStart={handleUserScroll}
          onWheel={handleUserScroll}
          onScroll={handleUserScroll}
        >
          {[...collections, ...collections].map((item, index) => (
            <Item
              key={`${item.id || item._id}-${index}`}
              id={item.id || item._id}
              image={item.image}
              name={item.name}
              new_price={item.newprice ?? item.new_price ?? 0}
              old_price={item.oldprice ?? item.old_price ?? undefined}
            />
          ))}
        </div>
        
        {!isAtEnd && (
          <button className="nav-button nav-button-right" onClick={scrollRight} aria-label="Scroll right">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </button>
        )}
      </div>
      
      <div className="scroll-indicators">
        {collections.length > 0 && Array.from({ length: Math.min(5, collections.length) }).map((_, i) => (
          <div key={i} className="scroll-dot"></div>
        ))}
      </div>
    </div>
  );
};

export default NewCollections;