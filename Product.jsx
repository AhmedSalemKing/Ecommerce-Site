import React, { useContext, useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ShopContext } from '../Context/ShopContext';
import ProductDisplay from '../Components/ProductDisplay/ProductDisplay';
import Breadcrum from '../Components/Breadcrums/Breadcrums';
import DescriptionBox from '../Components/DescriptionBox/DescriptionBox';
import RelatedProducts from '../Components/RelatedProducts/RelatedProducts';
const Product = () => {
  const { productId } = useParams();
  const { all_product, API_BASE } = useContext(ShopContext);
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  useEffect(() => {
    const fetchProduct = async () => {
      if (!productId) {
        setError('Product ID is missing');
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        // أول محاولة: البحث في المنتجات المحملة محلياً
        if (all_product && all_product.length > 0) {
          const foundProduct = all_product.find(p => 
            p.id === productId || 
            p._id === productId || 
            p.id === parseInt(productId) ||
            String(p._id) === productId
          );
          
          if (foundProduct) {
            setProduct(foundProduct);
            setLoading(false);
            return;
          }
        }
        // ثاني محاولة: جلب المنتج من السيرفر
        const response = await fetch(`${API_BASE}/product/${productId}`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.product) {
          setProduct(data.product);
        } else {
          throw new Error(data.message || 'Product not found');
        }
      } catch (err) {
        console.error('Error fetching product:', err);
        setError(err.message || 'Failed to load product');
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [productId, all_product, API_BASE]);
  // Loading State
  if (loading) {
    return (
      <div className="product-loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading product details...</p>
        </div>
      </div>
    );
  }
  // Error State
  if (error) {
    return (
      <div className="product-error">
        <div className="error-container">
          <h2>Oops! Something went wrong</h2>
          <p>{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="retry-btn"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }
  // No Product Found
  if (!product) {
    return (
      <div className="product-not-found">
        <div className="not-found-container">
          <h2>Product Not Found</h2>
          <p>The product you're looking for doesn't exist or has been removed.</p>
          <a href="/" className="back-home-btn">Back to Home</a>
        </div>
      </div>
    );
  }
  return (
    <div className="product-page">
      <Breadcrum product={product} />
      <ProductDisplay product={product} />
      <DescriptionBox />
      <RelatedProducts category={product.category} currentProductId={product.id || product._id} />
    </div>
  );
};
export default Product;