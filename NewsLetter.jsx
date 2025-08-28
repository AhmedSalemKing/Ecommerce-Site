import React, { useState } from "react";
import "./NewsLetter.css";

const NewsLetter = () => {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (email) {
      setSubscribed(true);
      // هنا يمكنك إضافة كود الإشتراك الفعلي
      setTimeout(() => {
        setSubscribed(false);
        setEmail("");
      }, 3000);
    }
  };

  return (
    <div className="news-letter">
      <div className="newsletter-container">
        <div className="newsletter-content">
          <div className="newsletter-text">
            <h1>Get Exclusive Offers On Your Email</h1>
            <p>Subscribe to our newsletter and stay updated with our latest collections and special promotions</p>
          </div>
          
          {!subscribed ? (
            <form className="newsletter-form" onSubmit={handleSubmit}>
              <div className="input-container">
                <input 
                  type="email" 
                  placeholder="Enter your email address" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <button type="submit">
                  <span>Subscribe</span>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
            </form>
          ) : (
            <div className="success-message">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22 11.08V12C21.9988 14.1564 21.3005 16.2547 20.0093 17.9818C18.7182 19.709 16.9033 20.9725 14.8354 21.5839C12.7674 22.1953 10.5573 22.1219 8.53447 21.3746C6.51168 20.6273 4.78465 19.2461 3.61096 17.4371C2.43727 15.628 1.87979 13.4881 2.02168 11.3363C2.16356 9.18455 2.99721 7.13631 4.39828 5.49706C5.79935 3.85781 7.69279 2.71537 9.79619 2.24013C11.8996 1.7649 14.1003 1.98232 16.07 2.85999" stroke="#FF9A3D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M22 4L12 14.01L9 11.01" stroke="#FF9A3D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <h3>Thank you for subscribing!</h3>
              <p>You'll receive our exclusive offers soon.</p>
            </div>
          )}
        </div>
        
        <div className="newsletter-features">
          <div className="feature">
            <div className="feature-icon">🎁</div>
            <h4>Exclusive Deals</h4>
            <p>Special offers only for our subscribers</p>
          </div>
          <div className="feature">
            <div className="feature-icon">⭐</div>
            <h4>Early Access</h4>
            <p>Be the first to know about new collections</p>
          </div>
          <div className="feature">
            <div className="feature-icon">🔒</div>
            <h4>No Spam</h4>
            <p>We respect your privacy</p>
          </div>
        </div>
      </div>
      
      <div className="newsletter-decoration">
        <div className="decoration-circle circle-1"></div>
        <div className="decoration-circle circle-2"></div>
        <div className="decoration-circle circle-3"></div>
      </div>
    </div>
  );
};

export default NewsLetter;