import React, { useState, useEffect, useRef } from "react";
import "./CSS/LoginSignup.css";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:4001";

const LoginSignup = () => {
  const [state, setState] = useState("Login");
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    email: "",
    fullName: "",
    phone: "",
    address: "",
    governorate: "",
    captcha: ""
  });
  const [captchaImage, setCaptchaImage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const captchaRef = useRef(null);

  // Load CAPTCHA image on component mount and when switching between login/signup
  useEffect(() => {
    loadCaptcha();
  }, [state]);

  // فحص إذا كان في token جديد من Google OAuth
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const errorParam = urlParams.get('error');
    const success = urlParams.get('success');
    if (token && success === 'true') {
      localStorage.setItem('auth-token', token);
      // تنظيف الـ URL
      window.history.replaceState({}, document.title, window.location.pathname);
      // إظهار رسالة نجاح
      alert('تم تسجيل الدخول بنجاح!');
      // انتظار لحظة ثم الانتقال للصفحة الرئيسية
      setTimeout(() => {
        window.location.replace('/');
      }, 1000);
    } else if (errorParam) {
      let errorMessage = 'فشل في تسجيل الدخول عبر Google';
      if (errorParam === 'authentication_failed') {
        errorMessage = 'فشل في المصادقة مع Google';
      } else if (errorParam === 'token_generation_failed') {
        errorMessage = 'فشل في إنشاء الرمز المميز';
      }
      alert(errorMessage);
      // تنظيف الـ URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Load CAPTCHA image from server
  const loadCaptcha = async () => {
    try {
      const response = await fetch(`${API_BASE}/captcha`, {
        credentials: 'include' // Include cookies for session
      });
      if (!response.ok) {
        throw new Error('Failed to load CAPTCHA');
      }
      const svgText = await response.text();
      setCaptchaImage(svgText);
      setFormData(prev => ({ ...prev, captcha: "" }));
      setError(""); // Clear any previous errors
    } catch (error) {
      console.error("Error loading CAPTCHA:", error);
      setError("Failed to load CAPTCHA. Please refresh the page.");
    }
  };

  // Handle CAPTCHA refresh
  const refreshCaptcha = (e) => {
    e.preventDefault();
    loadCaptcha();
  };

  const handleGoogleLogin = async (response) => {
    try {
      const token = response.credential;
      const res = await fetch(`${API_BASE}/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (res.ok && data.jwt) {
        localStorage.setItem("auth-token", data.jwt);
        window.location.replace("/");
      } else {
        alert(data.error || "Google login failed");
      }
    } catch (err) {
      console.error("Google login error:", err);
      alert("Network error during Google login");
    }
  };

  const changeHandler = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const login = async (e) => {
    e.preventDefault(); // Fix for passive event listener warning
    if (!formData.captcha) {
      setError("Please enter the CAPTCHA");
      return;
    }

    setLoading(true);
    setError("");
    
    try {
      const res = await fetch(`${API_BASE}/login`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        credentials: 'include', // Include cookies for session
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          captcha: formData.captcha
        }),
      });
      
      const data = await res.json();
      
      if (res.ok && data.success) {
        localStorage.setItem("auth-token", data.token);
        window.location.replace("/");
      } else {
        setError(data.error || "Login failed");
        loadCaptcha(); // Refresh CAPTCHA on failed login
      }
    } catch (error) {
      console.error("Login error:", error);
      setError("Network error. Please check your connection.");
      loadCaptcha(); // Refresh CAPTCHA on error
    } finally {
      setLoading(false);
    }
  };

  const signup = async (e) => {
    e.preventDefault(); // Fix for passive event listener warning
    if (!formData.captcha) {
      setError("Please enter the CAPTCHA");
      return;
    }

    if (!formData.fullName || !formData.email || !formData.password) {
      setError("Please fill full name, email and password");
      return;
    }

    setLoading(true);
    setError("");
    
    try {
      const res = await fetch(`${API_BASE}/signup`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        credentials: 'include', // Include cookies for session
        body: JSON.stringify({
          name: formData.username,
          email: formData.email,
          password: formData.password,
          fullName: formData.fullName,
          phone: formData.phone || undefined,
          address: formData.address || undefined,
          governorate: formData.governorate || undefined,
          captcha: formData.captcha
        }),
      });
      
      const data = await res.json();
      
      if (res.ok && data.success) {
        localStorage.setItem("auth-token", data.token);
        window.location.replace("/");
      } else {
        setError(data.error || "Signup failed");
        loadCaptcha(); // Refresh CAPTCHA on failed signup
      }
    } catch (error) {
      console.error("Signup error:", error);
      setError("Network error. Please check your connection.");
      loadCaptcha(); // Refresh CAPTCHA on error
    } finally {
      setLoading(false);
    }
  };

  const googleLogin = () => {
    // تحديد الـ redirect URL ليرجع للصفحة نفسها
    const redirectUrl = `${window.location.origin}/login`;
    window.location.href = `${API_BASE}/auth/google?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div className="loginsignup">
      <div className="loginsignup-container">
        <h1>{state}</h1>
        {error && <div className="error-message">{error}</div>}
        <div className="loginsignup-fields">
          {state === "Sign Up" && (
            <>
              <input
                name="username"
                value={formData.username}
                onChange={changeHandler}
                type="text"
                placeholder="Username"
                autoComplete="username"
              />
              <input
                name="fullName"
                value={formData.fullName}
                onChange={changeHandler}
                type="text"
                placeholder="Full Name"
                required
                autoComplete="name"
              />
              <input
                name="phone"
                value={formData.phone}
                onChange={changeHandler}
                type="tel"
                placeholder="Phone Number"
                autoComplete="tel"
              />
              <input
                name="address"
                value={formData.address}
                onChange={changeHandler}
                type="text"
                placeholder="Address"
                autoComplete="street-address"
              />
              <input
                name="governorate"
                value={formData.governorate}
                onChange={changeHandler}
                type="text"
                placeholder="Governorate"
              />
            </>
          )}
          <input
            name="email"
            value={formData.email}
            onChange={changeHandler}
            type="email"
            placeholder="Email"
            required
            autoComplete="email"
          />
          <input
            name="password"
            value={formData.password}
            onChange={changeHandler}
            type="password"
            placeholder="Password"
            required
            autoComplete={state === "Login" ? "current-password" : "new-password"}
          />
          
          {/* CAPTCHA Section */}
          <div className="captcha-container">
            <div 
              className="captcha-image"
              dangerouslySetInnerHTML={{ __html: captchaImage }}
              ref={captchaRef}
            />
            <button 
              type="button" 
              className="refresh-captcha"
              onClick={refreshCaptcha}
              title="Refresh CAPTCHA"
            >
              ↻
            </button>
          </div>
          <input
            name="captcha"
            value={formData.captcha}
            onChange={changeHandler}
            type="text"
            placeholder="Enter CAPTCHA"
            required
            autoComplete="off"
          />
        </div>
        <div className="sign">
          <button 
            onClick={(e) => (state === "Login" ? login(e) : signup(e))}
            disabled={loading}
          >
            {loading ? "Processing..." : "Continue"}
          </button>
        </div>
        {/* Google Login Button */}
        <div className="google-login">
          <button
            style={{
              marginTop: "10px",
              backgroundColor: "#4285F4",
              color: "white",
              width: "100%",
              padding: "10px",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer",
            }}
            onClick={googleLogin}
          >
            Sign in with Google
          </button>
        </div>
        {state === "Sign Up" ? (
          <p className="loginsignup-login">
            Already have an account?{" "}
            <span onClick={() => setState("Login")}>Login here</span>
          </p>
        ) : (
          <p className="loginsignup-login">
            Create an account?{" "}
            <span onClick={() => setState("Sign Up")}>Click here</span>
          </p>
        )}
        <div className="loginsignup-agree">
          <input type="checkbox" required />
          <p>By continuing, I agree to the terms of use & privacy policy</p>
        </div>
      </div>
    </div>
  );
};

export default LoginSignup;