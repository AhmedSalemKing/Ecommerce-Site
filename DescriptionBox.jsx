import React, { useState } from "react";
import "./DescriptionBox.css";

const DescriptionBox = () => {
  const [activeTab, setActiveTab] = useState('description');

  return (
    <div className="descriptionbox">
      <div className="descriptionbox-header">
        <h2>Product Details</h2>
        <div className="header-divider"></div>
      </div>
      
      <div className="descriptionbox-navigator">
        <div 
          className={`descriptionbox-nav-box ${activeTab === 'description' ? 'active' : ''}`}
          onClick={() => setActiveTab('description')}
        >
          <span className="nav-icon">📋</span>
          Description
        </div>
        <div 
          className={`descriptionbox-nav-box ${activeTab === 'reviews' ? 'active' : ''}`}
          onClick={() => setActiveTab('reviews')}
        >
          <span className="nav-icon">⭐</span>
          Reviews (122)
        </div>
        <div 
          className={`descriptionbox-nav-box ${activeTab === 'specs' ? 'active' : ''}`}
          onClick={() => setActiveTab('specs')}
        >
          <span className="nav-icon">📊</span>
          Specifications
        </div>
        <div 
          className={`descriptionbox-nav-box ${activeTab === 'shipping' ? 'active' : ''}`}
          onClick={() => setActiveTab('shipping')}
        >
          <span className="nav-icon">🚚</span>
          Shipping
        </div>
      </div>
      
      <div className="descriptionbox-content">
        {activeTab === 'description' && (
          <div className="tab-content fade-in">
            <p>
              Explore a world of fashion where comfort meets style. Our clothing collection is thoughtfully 
              designed to suit every mood and moment — from laid-back essentials to standout statement pieces. 
              Crafted with quality fabrics and attention to detail, each item is made to elevate your everyday look. 
              Dress with confidence, live with style.
            </p>
            
            <div className="features-list">
              <div className="feature-item">
                <span className="feature-icon">✔️</span>
                <span>Premium quality materials</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">✔️</span>
                <span>Eco-friendly production</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">✔️</span>
                <span>Designed for comfort</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">✔️</span>
                <span>Modern and trendy designs</span>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'reviews' && (
          <div className="tab-content fade-in">
            <div className="reviews-summary">
              <div className="rating-overview">
                <div className="average-rating">4.8</div>
                <div className="stars">★★★★★</div>
                <div className="total-reviews">122 reviews</div>
              </div>
              
              <div className="rating-bars">
                <div className="rating-bar">
                  <div className="bar-label">5 stars</div>
                  <div className="bar-container">
                    <div className="bar-fill" style={{width: '85%'}}></div>
                  </div>
                  <div className="bar-value">85%</div>
                </div>
                <div className="rating-bar">
                  <div className="bar-label">4 stars</div>
                  <div className="bar-container">
                    <div className="bar-fill" style={{width: '12%'}}></div>
                  </div>
                  <div className="bar-value">12%</div>
                </div>
                <div className="rating-bar">
                  <div className="bar-label">3 stars</div>
                  <div className="bar-container">
                    <div className="bar-fill" style={{width: '2%'}}></div>
                  </div>
                  <div className="bar-value">2%</div>
                </div>
                <div className="rating-bar">
                  <div className="bar-label">2 stars</div>
                  <div className="bar-container">
                    <div className="bar-fill" style={{width: '1%'}}></div>
                  </div>
                  <div className="bar-value">1%</div>
                </div>
                <div className="rating-bar">
                  <div className="bar-label">1 star</div>
                  <div className="bar-container">
                    <div className="bar-fill" style={{width: '0%'}}></div>
                  </div>
                  <div className="bar-value">0%</div>
                </div>
              </div>
            </div>
            
            <button className="view-all-reviews-btn">
              View All Reviews
            </button>
          </div>
        )}
        
        {activeTab === 'specs' && (
          <div className="tab-content fade-in">
            <div className="specs-table">
              <div className="spec-row">
                <div className="spec-name">Material</div>
                <div className="spec-value">100% Organic Cotton</div>
              </div>
              <div className="spec-row">
                <div className="spec-name">Fit</div>
                <div className="spec-value">Regular Fit</div>
              </div>
              <div className="spec-row">
                <div className="spec-name">Care</div>
                <div className="spec-value">Machine Washable</div>
              </div>
              <div className="spec-row">
                <div className="spec-name">Origin</div>
                <div className="spec-value">Made in Turkey</div>
              </div>
              <div className="spec-row">
                <div className="spec-name">SKU</div>
                <div className="spec-value">CLTH-2023-045</div>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'shipping' && (
          <div className="tab-content fade-in">
            <div className="shipping-options">
              <div className="shipping-option">
                <div className="option-icon">🚀</div>
                <div className="option-details">
                  <div className="option-title">Express Delivery</div>
                  <div className="option-desc">1-2 business days • $15.00</div>
                </div>
              </div>
              <div className="shipping-option">
                <div className="option-icon">🚚</div>
                <div className="option-details">
                  <div className="option-title">Standard Delivery</div>
                  <div className="option-desc">3-5 business days • $7.99</div>
                </div>
              </div>
              <div className="shipping-option">
                <div className="option-icon">📦</div>
                <div className="option-details">
                  <div className="option-title">Free Shipping</div>
                  <div className="option-desc">5-7 business days • Orders over $100</div>
                </div>
              </div>
            </div>
            
            <div className="return-policy">
              <h4>Return Policy</h4>
              <p>Easy 30-day return policy. Full refund or exchange for all unworn items with original tags.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default DescriptionBox;