import React, { useContext, useState, useEffect } from "react";
import "./CartItem.css";
import { ShopContext } from "../../Context/ShopContext";
import remove_icon from "../Assets/cart_cross_icon.png";
import { useNavigate } from "react-router-dom";

const CartItem = () => {
  const { 
    getTotalCartAmount, 
    all_product, 
    cartItems, 
    removeFromCart,
    updateCartQuantity,
    fetchOrdersData,
    fetchRevenueData,
    getProductQuantity
  } = useContext(ShopContext);
  
  const [cartItemsList, setCartItemsList] = useState([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [updatingItems, setUpdatingItems] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    // Build cart items list from cartItems
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
  
  const handleRemoveFromCart = async (itemId, size) => {
    const result = await removeFromCart(itemId, size);
    
    if (result.success) {
      // تحديث بيانات الطلبات والإيرادات بعد الحذف
      await fetchOrdersData();
      await fetchRevenueData('daily');
    }
  };
  
  const handleUpdateQuantity = async (itemId, size, newQuantity) => {
    const itemKey = `${itemId}-${size}`;
    setUpdatingItems(prev => ({...prev, [itemKey]: true}));
    
    try {
      // التحقق من أن الكمية الجديدة صالحة
      if (newQuantity < 1) {
        newQuantity = 1;
      } else if (newQuantity > 10) {
        newQuantity = 10;
      }
      
      // الحصول على الكمية الحالية من السياق بدلاً من القائمة المحلية
      const currentQuantity = getProductQuantity(itemId, size);
      
      // إذا كانت الكمية الجديدة هي نفس الحالية، لا تفعل شيئاً
      if (newQuantity === currentQuantity) {
        setUpdatingItems(prev => ({...prev, [itemKey]: false}));
        return;
      }
      
      // استخدام دالة تحديث الكمية الجديدة
      const result = await updateCartQuantity(itemId, size, newQuantity);
      
      if (result.success) {
        // تحديث المبلغ الإجمالي
        setTotalAmount(getTotalCartAmount());
        
        // تحديث بيانات الطلبات والإيرادات بعد التحديث
        await fetchOrdersData();
        await fetchRevenueData('daily');
      } else {
        console.error("Failed to update quantity:", result.error);
        // إظهار رسالة خطأ للمستخدم
        alert(result.error || "Failed to update quantity");
      }
    } catch (error) {
      console.error("Error updating quantity:", error);
      alert("Error updating quantity. Please try again.");
    } finally {
      setUpdatingItems(prev => ({...prev, [itemKey]: false}));
    }
  };
  
  return (
    <div className="cartitem">
      <div className="cartitem-header">
        <h1>Shopping Cart</h1>
        <p>{cartItemsList.length} {cartItemsList.length === 1 ? 'item' : 'items'}</p>
      </div>
      
      <div className="cartitem-format-main">
        <p>Products</p>
        <p>Title</p>
        <p>Price</p>
        <p>Quantity</p>
        <p>Total</p>
        <p>Remove</p>
      </div>
      <hr />
      
      {cartItemsList.length === 0 ? (
        <div className="empty-cart">
          <div className="empty-cart-icon">🛒</div>
          <p>Your cart is empty</p>
          <button className="continue-shopping-btn">Continue Shopping</button>
        </div>
      ) : (
        cartItemsList.map((item) => {
          const itemTotal =
            (item.product.new_price || item.product.newprice) * item.quantity;
          const itemKey = `${item.product.id}-${item.size || 'default'}`;
          const isUpdating = updatingItems[itemKey];
          
          return (
            <div key={item.key} className="cart-item-container">
              <div className="cartitem-format">
                {/* Product Image */}
                <div className="product-image-container">
                  <img
                    src={item.product.image}
                    alt={item.product.name}
                    className="carticon-product-icon"
                  />
                  {item.size && <span className="size-badge">{item.size}</span>}
                </div>
                
                {/* Title */}
                <div className="product-title">
                  <p className="product-name">{item.product.name}</p>
                  <p className="product-category">{item.product.category}</p>
                </div>
                
                {/* Price */}
                <p className="product-price">${item.product.new_price || item.product.newprice}</p>
                
                {/* Quantity */}
                <div className="quantity-container">
                  <button 
                    className="quantity-btn" 
                    onClick={() => handleUpdateQuantity(item.product.id, item.size, item.quantity - 1)}
                    disabled={item.quantity <= 1 || isUpdating}
                    aria-label="Decrease quantity"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                  </button>
                  <span className="cartitem-quantity">{item.quantity}</span>
                  <button 
                    className="quantity-btn" 
                    onClick={() => handleUpdateQuantity(item.product.id, item.size, item.quantity + 1)}
                    disabled={item.quantity >= 10 || isUpdating}
                    aria-label="Increase quantity"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19"></line>
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                  </button>
                </div>
                
                {/* Total */}
                <p className="item-total">${itemTotal.toFixed(2)}</p>
                
                {/* Remove */}
                <div className="remove-container">
                  <img
                    src={remove_icon}
                    alt="Remove"
                    className="remove-icon"
                    onClick={() => handleRemoveFromCart(item.product.id, item.size)}
                  />
                </div>
              </div>
              <hr />
            </div>
          );
        })
      )}
      
      {cartItemsList.length > 0 && (
        <div className="cartitem-down">
          <div className="cartitem-total">
            <h1>Cart Totals</h1>
            <div className="total-details">
              <div className="cartitem-total-item">
                <p>Subtotal</p>
                <p>${totalAmount.toFixed(2)}</p>
              </div>
              <hr />
              <div className="cartitem-total-item">
                <p>Shipping Fee</p>
                <p className="free-shipping">Free</p>
              </div>
              <hr />
              <div className="cartitem-total-item total-final">
                <h3>Total</h3>
                <h3>${totalAmount.toFixed(2)}</h3>
              </div>
            </div>
            <button 
              className="checkout-btn" 
              onClick={() => navigate("/checkout")}
              disabled={cartItemsList.length === 0}
            >
              💳 PROCEED TO CHECKOUT
            </button>
            
            <div className="secure-checkout">
              <div className="lock-icon">🔒</div>
              <span>Secure checkout</span>
            </div>
          </div>
          
          <div className="cartitem-promocode">
            <div className="promo-header">
              <h3>Have a Promo Code?</h3>
              <div className="discount-icon">🎁</div>
            </div>
            <p>Enter your promo code to get a discount</p>
            <div className="cartitem-promobox">
              <input type="text" placeholder="Enter promo code" />
              <button>Apply</button>
            </div>
            <div className="continue-shopping">
              <p>Continue shopping to add more items</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CartItem;