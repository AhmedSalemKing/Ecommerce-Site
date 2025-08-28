import React, { useState } from "react";

const OrderSummary = () => {
  const [couponCode, setCouponCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState(0);
  
  // بيانات وهمية للمنتج (يمكن تمريرها كـ props أو من context)
  const product = {
    id: 1,
    name: "قميص مانشستر سيتي...",
    image: "https://via.placeholder.com/80x80",
    new_price: 275,
    category: "Clothing"
  };
  
  const selectedSize = "M";
  const quantity = 1;
  const paymentMethod = "cash";

  const productPrice = product.new_price || product.newprice;
  const subtotal = productPrice * quantity;
  const shipping = 0.00; // شحن مجاني
  const discount = (subtotal * appliedDiscount) / 100;
  const total = subtotal - discount + shipping;

  const handleApplyCoupon = () => {
    // محاكاة كوبون خصم
    if (couponCode.toLowerCase() === "discount10") {
      setAppliedDiscount(10);
    } else if (couponCode.toLowerCase() === "save20") {
      setAppliedDiscount(20);
    } else {
      alert("كود الخصم غير صالح");
    }
  };

  const handleContinueShopping = () => {
    // يمكن استبدالها بـ navigation
    console.log("Continue Shopping");
  };

  const handleProceedToCheckout = () => {
    // يمكن استبدالها بـ navigation للدفع
    console.log("Proceed to Checkout", {
      product,
      selectedSize,
      quantity,
      paymentMethod,
      total
    });
  };

  return (
    <div className="order-summary-container">
      {/* القائمة العربية */}
      <div className="arabic-menu">
        <h2>قائمة العربية</h2>
        
        <div className="order-totals">
          <div className="total-row">
            <span>مجموع الطلب</span>
            <span>{subtotal.toFixed(2)}LE</span>
          </div>
          
          <div className="total-row">
            <span>سعر المنتج</span>
            <span>{productPrice}LE</span>
          </div>
          
          <div className="total-row">
            <span>حجم المنتج</span>
            <span>{subtotal.toFixed(2)}LE</span>
          </div>
          
          <div className="total-row">
            <span>الشحن</span>
            <span>{shipping.toFixed(2)}LE</span>
          </div>
          
          <div className="total-row final-total">
            <span>الإجمالي</span>
            <span>{total.toFixed(2)}LE</span>
          </div>
        </div>

        <div className="coupon-section">
          <label>رمز العرض</label>
          <input
            type="text"
            placeholder="أدخل رمز الكوبون هنا"
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value)}
          />
          <button className="apply-coupon-btn" onClick={handleApplyCoupon}>
            تطبيق
          </button>
        </div>

        <div className="order-actions">
          <div className="total-summary">
            <div className="summary-row">
              <span>الإجمالي الفرعي</span>
              <span>{subtotal.toFixed(2)}LE</span>
            </div>
            <div className="summary-row">
              <span>المجربة</span>
              <span>{shipping.toFixed(2)}LE</span>
            </div>
            <div className="summary-row">
              <span>الشحن</span>
              <span>{shipping.toFixed(2)}LE</span>
            </div>
            <div className="summary-row final">
              <span>الإجمالي</span>
              <span>{total.toFixed(2)}LE</span>
            </div>
          </div>

          <button className="checkout-btn" onClick={handleProceedToCheckout}>
            الانتقال إلى التالي
          </button>

          <div className="continue-shopping">
            <button onClick={handleContinueShopping}>
              → متابعة التسوق
            </button>
          </div>
        </div>
      </div>

      {/* قائمة المنتجات */}
      <div className="products-section">
        <div className="section-header">
          <h3>تفاصيل المنتج</h3>
          <div className="store-badge">
            <span>Africa Store</span>
            <span className="checkmark">✓</span>
          </div>
        </div>

        <div className="product-table">
          <div className="table-header">
            <span>الصلة</span>
            <span>تفاصيل التسوق</span>
            <span>السعر</span>
            <span>الخصم</span>
            <span>الكمية</span>
            <span>الإجمالي</span>
          </div>

          <div className="product-row">
            <div className="product-info">
              <img src={product.image} alt={product.name} className="product-image" />
            </div>

            <div className="product-details">
              <h4>{product.name}</h4>
              <p>الحجم: {selectedSize}</p>
              <p>السعر الوحدة: {productPrice.toFixed(2)}LE</p>
            </div>

            <div className="product-price">
              <span>{productPrice.toFixed(2)}LE</span>
            </div>

            <div className="product-discount">
              <span>{shipping.toFixed(2)}LE</span>
            </div>

            <div className="product-quantity">
              <div className="quantity-controls">
                <button className="qty-btn minus">-</button>
                <span className="qty-number">{quantity}</span>
                <button className="qty-btn plus">+</button>
              </div>
            </div>

            <div className="product-total">
              <span>{(productPrice * quantity).toFixed(2)}LE</span>
            </div>
          </div>
        </div>

        <div className="order-notes">
          <label>اترك محادثتك الشحن</label>
          <textarea 
            placeholder="ملاحظة على الطلب (اختياري)"
            rows="4"
          ></textarea>
        </div>
      </div>

      <style jsx>{`
        .order-summary-container {
          display: flex;
          max-width: 1400px;
          margin: 0 auto;
          padding: 20px;
          gap: 30px;
          background: #1a1a1a;
          color: white;
          min-height: 100vh;
          font-family: 'Arial', sans-serif;
          direction: rtl;
        }

        .arabic-menu {
          flex: 0 0 350px;
          background: #2a2a2a;
          padding: 25px;
          border-radius: 10px;
          height: fit-content;
        }

        .arabic-menu h2 {
          color: #fff;
          margin-bottom: 20px;
          font-size: 18px;
          text-align: center;
          border-bottom: 1px solid #444;
          padding-bottom: 10px;
        }

        .order-totals {
          margin-bottom: 25px;
        }

        .total-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #333;
          font-size: 14px;
        }

        .total-row.final-total {
          font-weight: bold;
          font-size: 16px;
          color: #4CAF50;
          margin-top: 10px;
          border-bottom: 2px solid #4CAF50;
        }

        .coupon-section {
          margin-bottom: 25px;
        }

        .coupon-section label {
          display: block;
          margin-bottom: 8px;
          font-size: 14px;
          color: #ccc;
        }

        .coupon-section input {
          width: 100%;
          padding: 10px;
          border: 1px solid #444;
          background: #333;
          color: white;
          border-radius: 5px;
          margin-bottom: 10px;
          font-size: 13px;
        }

        .apply-coupon-btn {
          background: #ff4444;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 5px;
          cursor: pointer;
          font-weight: bold;
          font-size: 12px;
        }

        .order-actions {
          border-top: 1px solid #444;
          padding-top: 20px;
        }

        .total-summary {
          margin-bottom: 20px;
        }

        .summary-row {
          display: flex;
          justify-content: space-between;
          padding: 6px 0;
          font-size: 14px;
        }

        .summary-row.final {
          font-weight: bold;
          font-size: 18px;
          color: #4CAF50;
          border-top: 2px solid #444;
          padding-top: 10px;
          margin-top: 10px;
        }

        .checkout-btn {
          width: 100%;
          background: #ff4444;
          color: white;
          border: none;
          padding: 15px;
          border-radius: 5px;
          font-weight: bold;
          font-size: 16px;
          cursor: pointer;
          margin-bottom: 15px;
        }

        .continue-shopping button {
          background: transparent;
          color: #4CAF50;
          border: none;
          cursor: pointer;
          font-size: 14px;
          text-decoration: underline;
        }

        .products-section {
          flex: 1;
          background: #2a2a2a;
          padding: 25px;
          border-radius: 10px;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 25px;
          padding-bottom: 15px;
          border-bottom: 1px solid #444;
        }

        .section-header h3 {
          color: #fff;
          margin: 0;
          font-size: 18px;
        }

        .store-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #333;
          padding: 8px 12px;
          border-radius: 20px;
          font-size: 12px;
        }

        .checkmark {
          background: #4CAF50;
          color: white;
          border-radius: 50%;
          width: 18px;
          height: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
        }

        .product-table {
          margin-bottom: 25px;
        }

        .table-header {
          display: grid;
          grid-template-columns: 1fr 2fr 1fr 1fr 1fr 1fr;
          gap: 15px;
          padding: 15px;
          background: #333;
          border-radius: 8px;
          font-weight: bold;
          font-size: 13px;
          text-align: center;
          margin-bottom: 10px;
        }

        .product-row {
          display: grid;
          grid-template-columns: 1fr 2fr 1fr 1fr 1fr 1fr;
          gap: 15px;
          padding: 20px 15px;
          background: #333;
          border-radius: 8px;
          align-items: center;
        }

        .product-image {
          width: 60px;
          height: 60px;
          object-fit: cover;
          border-radius: 8px;
        }

        .product-details h4 {
          margin: 0 0 5px 0;
          font-size: 14px;
          color: white;
        }

        .product-details p {
          margin: 2px 0;
          font-size: 12px;
          color: #ccc;
        }

        .product-price, .product-discount, .product-total {
          text-align: center;
          font-weight: bold;
          font-size: 14px;
        }

        .quantity-controls {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }

        .qty-btn {
          width: 30px;
          height: 30px;
          border: 1px solid #555;
          background: #444;
          color: white;
          border-radius: 5px;
          cursor: pointer;
          font-weight: bold;
        }

        .qty-btn:hover {
          background: #555;
        }

        .qty-number {
          min-width: 30px;
          text-align: center;
          font-weight: bold;
        }

        .order-notes {
          margin-top: 25px;
          padding-top: 20px;
          border-top: 1px solid #444;
        }

        .order-notes label {
          display: block;
          margin-bottom: 10px;
          font-size: 14px;
          color: #ccc;
        }

        .order-notes textarea {
          width: 100%;
          padding: 12px;
          border: 1px solid #444;
          background: #333;
          color: white;
          border-radius: 5px;
          resize: vertical;
          font-family: inherit;
        }

        .order-error {
          text-align: center;
          padding: 50px;
          background: #2a2a2a;
          color: white;
          border-radius: 10px;
        }

        .order-error button {
          margin-top: 20px;
          background: #4CAF50;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 5px;
          cursor: pointer;
        }

        @media (max-width: 768px) {
          .order-summary-container {
            flex-direction: column;
            padding: 15px;
          }
          
          .arabic-menu {
            flex: none;
            order: 2;
          }
          
          .products-section {
            order: 1;
          }
          
          .table-header, .product-row {
            grid-template-columns: 1fr 1fr;
            gap: 10px;
          }
          
          .product-info, .product-details {
            grid-column: span 2;
          }
        }
      `}</style>
    </div>
  );
};

export default OrderSummary;