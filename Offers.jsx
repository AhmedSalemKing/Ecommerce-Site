import React, { useState, useEffect } from "react";
import "./Offers.css";

const Offers = () => {
  const [activeFeature, setActiveFeature] = useState(0);
  const [darkMode, setDarkMode] = useState(false);

  const features = [
    {
      icon: "🚀",
      title: "Fast Delivery",
      description: "Get your orders delivered within 24 hours in the city"
    },
    {
      icon: "💎",
      title: "Premium Quality",
      description: "All products are carefully selected for excellence"
    },
    {
      icon: "🔄",
      title: "Easy Returns",
      description: "30-day hassle-free return policy on all items"
    },
    {
      icon: "🔒",
      title: "Secure Payment",
      description: "Your transactions are protected with advanced encryption"
    },
    {
      icon: "🎁",
      title: "Free Gifts",
      description: "Special gifts with purchases above $200"
    },
    {
      icon: "⭐",
      title: "VIP Membership",
      description: "Exclusive benefits for our loyal customers"
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % features.length);
    }, 3000);
    
    return () => clearInterval(interval);
  }, [features.length]);

  return (
    <div className={`premium-offers ${darkMode ? 'dark-mode' : ''}`}>
      <div className="theme-toggle">
        <button onClick={() => setDarkMode(!darkMode)} className="toggle-btn">
          {darkMode ? '☀️ Light Mode' : '🌙 Dark Mode'}
        </button>
      </div>
      
      <div className="floating-particles">
        {[...Array(12)].map((_, i) => (
          <div key={i} className="particle"></div>
        ))}
      </div>
      
      <div className="container">
        <div className="header-section">
          <h2 className="section-title">Why Choose <span className="highlight">Us</span></h2>
          <p className="section-subtitle">Experience the difference of premium service and quality</p>
        </div>
        
        <div className="features-grid">
          {features.map((feature, index) => (
            <div 
              key={index}
              className={`feature-card ${index === activeFeature ? 'active' : ''}`}
              onMouseEnter={() => setActiveFeature(index)}
            >
              <div className="feature-icon">{feature.icon}</div>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
              <div className="feature-hover-effect"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Offers;