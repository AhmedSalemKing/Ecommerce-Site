import React, { useContext, useState, useEffect } from "react";
import "./Checkout.css";
import { ShopContext } from "../../Context/ShopContext";
import { useNavigate } from "react-router-dom";

const Checkout = () => {
  const { 
    getTotalCartAmount, 
    all_product, 
    cartItems, 
    removeFromCart,
    fetchOrdersData,
    fetchRevenueData
  } = useContext(ShopContext);
  
  const [cartItemsList, setCartItemsList] = useState([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    address: "",
    governorate: "",
    city: "",
    postalCode: "",
    paymentMethod: "cash_on_delivery",
    notes: ""
  });
  
  const navigate = useNavigate();
  
  // Build cart items list from cartItems
  useEffect(() => {
    const list = [];
    for (const productId in cartItems) {
      const product = all_product.find(p => String(p.id) === String(productId));
      if (!product) continue;
      
      const productCartData = cartItems[productId];
      if (typeof productCartData === "number" && productCartData > 0) {
        list.push({
          product,
          quantity: productCartData,
          key: `${productId}-default`,
        });
      } else if (typeof productCartData === "object" && productCartData !== null) {
        for (const size in productCartData) {
          const quantity = productCartData[size];
          if (quantity > 0) {
            list.push({
              product,
              quantity,
              size,
              key: `${productId}-${size}`,
            });
          }
        }
      }
    }
    
    setCartItemsList(list);
    setTotalAmount(getTotalCartAmount());
  }, [cartItems, all_product, getTotalCartAmount]);
  
  // Load user data if available
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user) {
      setFormData(prev => ({
        ...prev,
        fullName: user.fullName || "",
        email: user.email || "",
        phone: user.phone || "",
        address: user.address || "",
        governorate: user.governorate || ""
      }));
    }
  }, []);
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const token = localStorage.getItem("auth-token");
      if (!token) {
        alert("يرجى تسجيل الدخول أولا");
        navigate("/login");
        return;
      }
      
      // إنشاء كائن عنوان الشحن من بيانات النموذج
      const shippingAddress = {
        address: formData.address,
        governorate: formData.governorate,
        city: formData.city,
        postalCode: formData.postalCode
      };
      
      // استدعاء API الدفع
      const response = await fetch("http://localhost:4001/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "auth-token": token,
        },
        body: JSON.stringify({
          paymentMethod: formData.paymentMethod,
          address: shippingAddress,
          phone: formData.phone,
          notes: formData.notes
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setOrderSuccess(true);
        // تحديث بيانات الطلبات والإيرادات
        await fetchOrdersData();
        await fetchRevenueData('daily');
        
        // التحويل إلى صفحة الطلبات
        setTimeout(() => {
          navigate("/myorders");
        }, 3000);
      } else {
        alert(data.error || "فشلت عملية الدفع، يرجى المحاولة مرة أخرى");
      }
    } catch (error) {
      console.error("Checkout error:", error);
      alert("حدث خطأ أثناء معالجة طلبك، يرجى المحاولة مرة أخرى");
    } finally {
      setLoading(false);
    }
  };
  
  const handleRemoveItem = (itemKey) => {
    // Extract product ID and size from the key
    const [productId, size] = itemKey.split('-');
    
    if (size === 'default') {
      // If it's a default item (without size)
      removeFromCart(productId);
    } else {
      // If it's an item with size
      removeFromCart(productId, size);
    }
  };
  
  if (orderSuccess) {
    return (
      <div className="checkout-success">
        <div className="success-icon">✓</div>
        <h2>تم تقديم طلبك بنجاح!</h2>
        <p>شكراً لك على طلبك. سيتم تأكيد الطلب قريباً.</p>
        <p>سيتم تحويلك إلى صفحة الطلبات...</p>
      </div>
    );
  }
  
  return (
    <div className="checkout">
      <div className="checkout-container">
        <div className="checkout-left">
          <h1>تفاصيل الطلب</h1>
          
          {cartItemsList.length === 0 ? (
            <div className="empty-checkout">
              <p>سلة التسوق فارغة</p>
              <button onClick={() => navigate("/")} className="continue-shopping-btn">
                العودة للتسوق
              </button>
            </div>
          ) : (
            <>
              <div className="checkout-items">
                {cartItemsList.map((item) => {
                  const itemTotal =
                    (item.product.new_price || item.product.newprice) * item.quantity;
                  return (
                    <div key={item.key} className="checkout-item">
                      <div className="item-image">
                        <img
                          src={item.product.image}
                          alt={item.product.name}
                          className="checkout-product-icon"
                        />
                      </div>
                      <div className="item-details">
                        <p className="item-name">{item.product.name}</p>
                        {item.size && <p className="item-size">المقاس: {item.size}</p>}
                        <p className="item-quantity">الكمية: {item.quantity}</p>
                        <p className="item-price">${itemTotal.toFixed(2)}</p>
                      </div>
                      <button 
                        className="remove-item-btn"
                        onClick={() => handleRemoveItem(item.key)}
                        title="إزالة من السلة"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                      </button>
                    </div>
                  );
                })}
              </div>
              
              <div className="checkout-summary">
                <div className="summary-row">
                  <p>المجموع الفرعي:</p>
                  <p>${totalAmount.toFixed(2)}</p>
                </div>
                <div className="summary-row">
                  <p>رسوم الشحن:</p>
                  <p>مجاني</p>
                </div>
                <div className="summary-row total">
                  <p>المجموع:</p>
                  <p>${totalAmount.toFixed(2)}</p>
                </div>
              </div>
            </>
          )}
        </div>
        
        <div className="checkout-right">
          <h1>معلومات الدفع</h1>
          <form onSubmit={handleSubmit} className="checkout-form">
            <div className="form-group">
              <label htmlFor="fullName">الاسم الكامل</label>
              <input
                type="text"
                id="fullName"
                name="fullName"
                value={formData.fullName}
                onChange={handleInputChange}
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="email">البريد الإلكتروني</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="phone">رقم الهاتف</label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="address">العنوان</label>
              <input
                type="text"
                id="address"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                required
              />
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="governorate">المحافظة</label>
                <select
                  id="governorate"
                  name="governorate"
                  value={formData.governorate}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">اختر المحافظة</option>
                  <option value="القاهرة">القاهرة</option>
                  <option value="الإسكندرية">الإسكندرية</option>
                  <option value="الجيزة">الجيزة</option>
                  <option value="القليوبية">القليوبية</option>
                  <option value="الدقهلية">الدقهلية</option>
                  <option value="الشرقية">الشرقية</option>
                  <option value="المنوفية">المنوفية</option>
                  <option value="الغربية">الغربية</option>
                  <option value="كفر الشيخ">كفر الشيخ</option>
                  <option value="دمياط">دمياط</option>
                  <option value="بورسعيد">بورسعيد</option>
                  <option value="الإسماعيلية">الإسماعيلية</option>
                  <option value="السويس">السويس</option>
                  <option value="شمال سيناء">شمال سيناء</option>
                  <option value="جنوب سيناء">جنوب سيناء</option>
                  <option value="الفيوم">الفيوم</option>
                  <option value="بني سويف">بني سويف</option>
                  <option value="المنيا">المنيا</option>
                  <option value="أسيوط">أسيوط</option>
                  <option value="سوهاج">سوهاج</option>
                  <option value="قنا">قنا</option>
                  <option value="الأقصر">الأقصر</option>
                  <option value="أسوان">أسوان</option>
                  <option value="الوادي الجديد">الوادي الجديد</option>
                  <option value="البحر الأحمر">البحر الأحمر</option>
                  <option value="مطروح">مطروح</option>
                </select>
              </div>
              
              <div className="form-group">
                <label htmlFor="city" className="no-required">المدينة</label>
                <input
                  type="text"
                  id="city"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                />
              </div>
            </div>
            
            <div className="form-group">
              <label htmlFor="postalCode" className="no-required">الرمز البريدي</label>
              <input
                type="text"
                id="postalCode"
                name="postalCode"
                value={formData.postalCode}
                onChange={handleInputChange}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="paymentMethod">طريقة الدفع</label>
              <select
                id="paymentMethod"
                name="paymentMethod"
                value={formData.paymentMethod}
                onChange={handleInputChange}
                required
              >
                <option value="cash_on_delivery">الدفع عند الاستلام</option>
                <option value="credit_card">بطاقة ائتمان</option>
                <option value="paypal">باي بال</option>
              </select>
            </div>
            
            <div className="form-group">
              <label htmlFor="notes" className="no-required">ملاحظات إضافية</label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows="3"
              ></textarea>
            </div>
            
            <button 
              type="submit" 
              className="checkout-btn" 
              disabled={loading || cartItemsList.length === 0}
            >
              <span>{loading ? "جاري المعالجة..." : "إتمام الطلب"}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Checkout;