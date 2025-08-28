// App.js - Fixed Routes
import './App.css';
import Navbar from './Components/Navbar/Navbar';
import { Routes, Route } from 'react-router-dom';
import Shop from './Pages/Shop.jsx';
import ShopCategory from './Pages/ShopCategory.jsx';
import Product from './Pages/Product.jsx';
import Cart from './Pages/Cart.jsx';
import LoginSingup from './Pages/LoginSignup.jsx';
import Footer from "./Components/Footer/Footer.jsx";
import ShopContextProvider from './Context/ShopContext.jsx';
import men_banner from "./Components/Assets/banner_mens.png";
import women_banner from "./Components/Assets/banner_women.png";
import kids_banner from "./Components/Assets/banner_kids.png";
import DarkModeToggle from "./Components/DarkModeToggle/DarkModeToggle.jsx";
import Checkout from "./Components/Checkout/Checkout";

function App() {
  return (
    <div className="App">
      <ShopContextProvider> 
        <DarkModeToggle />
        <Navbar />
<Routes>
  <Route path="/" element={<Shop />} />
  <Route path="/men" element={<ShopCategory banner={men_banner} category="men" />} />
  <Route path="/women" element={<ShopCategory banner={women_banner} category="women" />} />
  <Route path="/kids" element={<ShopCategory banner={kids_banner} category="kids" />} />
  <Route path="/product/:productId" element={<Product />} />
  <Route path="/cart" element={<Cart />} />
  <Route path="/login" element={<LoginSingup />} />
<Route path="/checkout" element={<Checkout />} />
</Routes>
        <Footer/>
      </ShopContextProvider>
    </div>
  );
}

export default App;
