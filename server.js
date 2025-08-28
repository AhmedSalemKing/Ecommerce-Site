// =============================================================================
// ENHANCED E-COMMERCE API (Express + MongoDB/Mongoose)
// Advanced order management with real-time tracking and revenue analytics
//
// Enhanced with:
// - CSRF protection
// - XSS protection
// - CAPTCHA system
// - Secure API requests
// - HTTP security headers
// - Brute force protection
// - Simplified payment options
// - Data validation
// - Payment notifications
// - Improved user experience
// - Performance optimizations
// - Clear error messages
// - Mobile-friendly interface
// - HTTPS configuration
// - Payment gateways (Stripe, PayPal)
// - Activity logging system
// - Notification system
// - Database backup
// - Query optimization
// - Email templates system
//
// Fixed Issues:
// - Fixed token expiration handling with automatic refresh
// - Improved error messages for expired tokens
// - Added token refresh mechanism
// - Fixed frontend error handling
// - Fixed revenue calculation to only include delivered orders
// - Added CSRF protection
// - Increased JWT refresh token expiration
// - Added secure admin login with JWT
// - Protected all admin routes with requireAdmin middleware
// - Fixed CSRF token handling for frontend requests
// - Added error handling for missing environment variables
// - Fixed email notification errors
// - Fixed payment method validation errors
// - Fixed CAPTCHA validation for login and signup
// - Fixed missing express-session middleware for Passport.js
// - Added email templates system for all communications
// =============================================================================
// ENV VARS:
// PORT, MONGO_URI, SSL_CERT_PATH, SSL_KEY_PATH
// STRIPE_KEY, PAYPAL_CLIENT_ID, PAYPAL_SECRET
// EMAIL_SERVICE, EMAIL_USER, EMAIL_PASS
// BACKUP_DIR, JWT_SECRET
// ------------------------------- Environment ---------------------------------
require('dotenv').config();
// ------------------------------- Dependencies --------------------------------
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const Joi = require('joi');
const svgCaptcha = require('svg-captcha');
const https = require('https');
const cron = require('node-cron');
const { exec } = require('child_process');
// OAuth & Sessions
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const session = require('express-session');
const crypto = require('crypto');
// Email notifications
const nodemailer = require('nodemailer');
// Payment gateways
let stripe;
if (process.env.STRIPE_KEY) {
  stripe = require('stripe')(process.env.STRIPE_KEY);
} else {
  console.log('⚠️ STRIPE_KEY not provided. Stripe functionality will be disabled.');
  stripe = {
    paymentIntents: {
      create: async () => {
        throw new Error('Stripe is not configured. Please add STRIPE_KEY to your environment variables.');
      }
    }
  };
}
const paypal = require('paypal-rest-sdk');
// Email Templates
const { sendEmail, templates } = require('./emailTemplates');
// ------------------------------- App & Config --------------------------------
const app = express();
const port = process.env.PORT || 4001;
// Configure PayPal
if (process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_SECRET) {
  paypal.configure({
    'mode': 'sandbox', //sandbox or live
    'client_id': process.env.PAYPAL_CLIENT_ID,
    'client_secret': process.env.PAYPAL_SECRET
  });
} else {
  console.log('⚠️ PayPal credentials not provided. PayPal functionality will be disabled.');
}
// Mandatory secret check (JWT)
if (!process.env.JWT_SECRET) {
  console.error('❌ JWT_SECRET not set in .env — exiting.');
  process.exit(1);
}
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || JWT_SECRET;
const JWT_ACCESS_TTL = process.env.JWT_ACCESS_TTL || '1h';
const JWT_REFRESH_TTL = process.env.JWT_REFRESH_TTL || '30d'; // Increased to 30 days
// ------------------------------- Security & Parsers ---------------------------
// Enhanced security headers with helmet
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: true,
    crossOriginOpenerPolicy: true,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    dnsPrefetchControl: true,
    frameguard: { action: 'deny' },
    hidePoweredBy: true,
    hsts: true,
    ieNoOpen: true,
    noSniff: true,
    originAgentCluster: true,
    permittedCrossDomainPolicies: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    xssFilter: true,
  })
);
// Body parser with size limits and JSON validation
app.use(express.json({ 
  limit: '50mb',
  verify: (req, res, buf, encoding) => {
    try {
      JSON.parse(buf.toString(encoding || 'utf8'));
    } catch (e) {
      res.status(400).json({ error: 'Invalid JSON' });
      throw new Error('Invalid JSON');
    }
  }
}));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
// XSS Protection middleware
const xssProtection = (req, res, next) => {
  // Sanitize user input
  if (req.body) {
    for (const key in req.body) {
      if (typeof req.body[key] === 'string') {
        req.body[key] = req.body[key]
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#x27;');
      }
    }
  }
  next();
};
app.use(xssProtection);
const CLIENT_ORIGINS = process.env.CLIENT_ORIGINS
  ? process.env.CLIENT_ORIGINS.split(',').map((o) => o.trim())
  : ['http://localhost:3000', 'http://127.0.0.1:3000'];
app.use(
  cors({
    origin: CLIENT_ORIGINS.length ? CLIENT_ORIGINS : true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'auth-token', 'Authorization', 'X-CSRF-Token'],
    credentials: true,
  })
);
// Add this after CORS configuration
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  next();
});
// Enhanced rate limiting for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many authentication attempts, please try again after 15 minutes'
  },
  skipSuccessfulRequests: true // Don't count successful requests
});
// General API rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests, please try again later'
  }
});
app.use(['/login', '/signup', '/admin/login'], authLimiter);
app.use('/api/', apiLimiter);
// ------------------------------- Static Files ---------------------------------
app.use('/images', express.static(path.join(__dirname, 'upload/images')));
// ------------------------------- Mongo Connection -----------------------------
// Function to connect to MongoDB with fallback options
const connectDB = async () => {
  try {
    // Primary connection to MongoDB Atlas
    if (process.env.MONGO_URI) {
      console.log('🔄 Attempting to connect to MongoDB Atlas...');
      await mongoose.connect(process.env.MONGO_URI, {
        serverSelectionTimeoutMS: 15000,
        socketTimeoutMS: 45000,
        connectTimeoutMS: 30000,
        maxPoolSize: 10
      });
      console.log('✅ Connected to MongoDB Atlas');
      return;
    }
    // Fallback to local MongoDB if Atlas URI is not provided
    console.log('🔄 Attempting to connect to local MongoDB...');
    await mongoose.connect('mongodb://localhost:27017/ecommerce', {
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 30000,
      maxPoolSize: 10
    });
    console.log('✅ Connected to local MongoDB');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    // If all connection attempts fail, provide helpful guidance
    console.log('\n📋 Troubleshooting steps:');
    console.log('1. For MongoDB Atlas:');
    console.log(' - Make sure your IP is whitelisted in Atlas: https://www.mongodb.com/docs/atlas/security-whitelist/');
    console.log(' - Verify your MONGO_URI in .env file is correct');
    console.log('2. For local MongoDB:');
    console.log(' - Make sure MongoDB is installed and running on your machine');
    console.log(' - Check if MongoDB service is started');
    console.log('3. If you want to run without MongoDB (limited functionality):');
    console.log(' - Set MONGO_URI=disabled in .env file\n');
    // If MongoDB is explicitly disabled, continue with limited functionality
    if (process.env.MONGO_URI === 'disabled') {
      console.log('⚠️ Running without MongoDB - limited functionality available');
      return;
    }
    // Exit the process if we can't connect to MongoDB
    process.exit(1);
  }
};
// Connect to MongoDB
connectDB();
// Handle MongoDB connection events
mongoose.connection.on('error', err => {
  console.error('❌ MongoDB connection error:', err);
});
mongoose.connection.on('disconnected', () => {
  console.warn('⚠️ MongoDB disconnected');
  // Attempt to reconnect after 5 seconds
  setTimeout(connectDB, 5000);
});
mongoose.connection.on('reconnected', () => {
  console.log('✅ MongoDB reconnected');
});
// =============================================================================
// ENHANCED SCHEMAS/MODELS
// =============================================================================
// ------------------------------- Activity Log Model ----------------------------
const activityLogSchema = new mongoose.Schema(
  {
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, required: true },
    details: { type: mongoose.Schema.Types.Mixed },
    timestamp: { type: Date, default: Date.now }
  },
  { timestamps: true }
);
// Add indexes for performance optimization
activityLogSchema.index({ adminId: 1, timestamp: -1 });
activityLogSchema.index({ action: 1, timestamp: -1 });
const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);
// ------------------------------- Notification Model ----------------------------
const notificationSchema = new mongoose.Schema(
  {
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: String, required: true },
    type: { type: String, enum: ['info', 'warning', 'error', 'success'], default: 'info' },
    timestamp: { type: Date, default: Date.now },
    isRead: { type: Boolean, default: false }
  },
  { timestamps: true }
);
// Add indexes for performance optimization
notificationSchema.index({ adminId: 1, timestamp: -1 });
notificationSchema.index({ isRead: 1, timestamp: -1 });
const Notification = mongoose.model('Notification', notificationSchema);
// ------------------------------- Product Model --------------------------------
const productSchema = new mongoose.Schema(
  {
    id: { type: Number, required: true, unique: true },
    name: { type: String, required: true, trim: true },
    title: String,
    image: String,
    images: [String],
    category: { type: String, required: true, trim: true },
    new_price: { type: Number, default: 0 },
    old_price: { type: Number, default: 0 },
    description: String,
    sizes: [String],
    rating: { type: Number, default: 4 },
    reviews: { type: Number, default: 122 },
    tags: [String],
    sku: String,
    available: { type: Boolean, default: true },
    date: { type: Date, default: Date.now },
  },
  { strict: false, timestamps: true }
);
// Add indexes for performance optimization
productSchema.index({ category: 1 });
productSchema.index({ name: 'text', description: 'text' });
productSchema.index({ available: 1 });
productSchema.index({ date: -1 });
const Product = mongoose.model('Product', productSchema);
// ------------------------------- Enhanced User Model --------------------------
const userSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
    fullName: { type: String, required: true, trim: true },
    email: { type: String, unique: true, required: true, lowercase: true, trim: true, index: true },
    password: { type: String, required: true, select: false },
    phone: { type: String, trim: true },
    address: { type: String, trim: true },
    governorate: { type: String, trim: true },
    cartData: { type: Object, default: {} },
    role: { type: String, enum: ['admin', 'manager', 'support', 'user'], default: 'user' },
    isActive: { type: Boolean, default: true },
    lastLogin: { type: Date },
    profileImage: { type: String },
    googleId: { type: String }, // For Google OAuth
    refreshTokens: [{ token: String }], // Store refresh tokens
    loginAttempts: { type: Number, default: 0 }, // For brute force protection
    lockUntil: { type: Date }, // For brute force protection
    resetToken: { type: String }, // For password reset
    resetTokenExpiry: { type: Date } // For password reset
  },
  { strict: true, timestamps: true }
);
// Add indexes for performance optimization
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });
userSchema.pre('save', async function (next) {
  try {
    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});
const Users = mongoose.model('User', userSchema);
// ------------------------------- Enhanced Order Model -------------------------
const orderSchema = new mongoose.Schema(
  {
    orderId: { type: String, unique: true, required: true, sparse: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    customerInfo: {
      fullName: { type: String, required: true },
      email: { type: String, required: true },
      phone: { type: String, required: true },
      address: { type: String, required: true },
      governorate: { type: String, required: true }
    },
    items: [
      {
        productId: { type: Number, required: true },
        productName: { type: String, required: true },
        productImage: { type: String },
        quantity: { type: Number, required: true },
        price: { type: Number, required: true },
        size: { type: String, default: null },
        itemTotal: { type: Number, required: true },
        status: { type: String, enum: ['in_cart', 'checkedout'], default: 'in_cart' }
      },
    ],
    total: { type: Number, required: true },
    status: { 
      type: String, 
      enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
      default: 'pending' 
    },
    paymentMethod: { 
      type: String, 
      enum: ['cash_on_delivery', 'bank_transfer', 'stripe', 'paypal'],
      default: 'cash_on_delivery' 
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed'],
      default: 'pending'
    },
    transactionId: String,
    notes: { type: String },
    trackingNumber: { type: String },
    deliveredAt: { type: Date },
    cancelledAt: { type: Date },
    cancellationReason: { type: String },
  },
  { timestamps: true }
);
// Add indexes for performance optimization
orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ paymentStatus: 1 });
orderSchema.index({ orderId: 1 }, { unique: true, sparse: true });
// Generate unique order ID before validation
orderSchema.pre('validate', async function(next) {
  if (!this.orderId) {
    try {
      const count = await mongoose.model('Order').countDocuments();
      this.orderId = `ORD${String(count + 1).padStart(6, '0')}`;
      console.log(`🔢 Generated orderId: ${this.orderId}`);
    } catch (error) {
      console.error('Error generating orderId:', error);
      return next(error);
    }
  }
  next();
});
const Order = mongoose.model('Order', orderSchema);
// ------------------------------- Revenue Analytics Model ------------------
const revenueSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    day: { type: Number, required: true },
    month: { type: Number, required: true },
    year: { type: Number, required: true },
    dailyRevenue: { type: Number, default: 0 },
    ordersCount: { type: Number, default: 0 },
    deliveredRevenue: { type: Number, default: 0 },
    pendingRevenue: { type: Number, default: 0 },
    cancelledRevenue: { type: Number, default: 0 },
    checkedoutRevenue: { type: Number, default: 0 }, // New field for checkedout items revenue
  },
  { timestamps: true }
);
// Add indexes for performance optimization
revenueSchema.index({ date: 1 });
revenueSchema.index({ year: 1, month: 1, day: 1 });
const Revenue = mongoose.model('Revenue', revenueSchema);
// ------------------------------- Hero Section Model ----------------------
const heroSectionSchema = new mongoose.Schema({
  title: { type: String, required: true },
  subtitle: { type: String, required: true },
  buttonText: { type: String, required: true },
  buttonLink: { type: String, required: true },
  backgroundImage: { type: String, required: true },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
const HeroSection = mongoose.model('HeroSection', heroSectionSchema);
// ------------------------------- Payment Notification Model ----------------
const paymentNotificationSchema = new mongoose.Schema({
  orderId: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['payment_received', 'payment_failed', 'order_processed'], required: true },
  message: { type: String, required: true },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});
// Add indexes for performance optimization
paymentNotificationSchema.index({ userId: 1, createdAt: -1 });
paymentNotificationSchema.index({ read: 1 });
const PaymentNotification = mongoose.model('PaymentNotification', paymentNotificationSchema);
// =============================================================================
// UTILITIES
// =============================================================================
const readToken = (req) => {
  const h = req.header('auth-token');
  if (h) return h;
  const auth = req.header('Authorization');
  if (auth && auth.startsWith('Bearer ')) return auth.slice(7);
  return null;
};
const fetchUser = async (req, res, next) => {
  const token = readToken(req);
  if (!token) return res.status(401).json({ success: false, error: 'Please authenticate' });
  
  try {
    const data = jwt.verify(token, JWT_SECRET);
    const user = await Users.findById(data.user.id).select('email role fullName isActive phone address governorate');
    if (!user) return res.status(403).json({ success: false, error: 'User not found' });
    if (!user.isActive) return res.status(403).json({ success: false, error: 'User not active' });
    req.user = {
      id: user._id.toString(),
      role: user.role,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      address: user.address,
      governorate: user.governorate
    };
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        error: 'Token expired, please login again',
        code: 'TOKEN_EXPIRED'
      });
    }
    res.status(401).json({ success: false, error: 'Invalid token' });
  }
};
const requireAdmin = async (req, res, next) => {
  try {
    if (!req.user?.id) {
      console.log('❌ No user ID in request');
      return res.status(403).json({ success: false, error: 'Forbidden: No user ID' });
    }
    const u = await Users.findById(req.user.id).lean();
    if (!u) {
      console.log('❌ User not found in database');
      return res.status(403).json({ success: false, error: 'Access denied. User not found.' });
    }
    if (u.role !== 'admin' || !u.isActive) {
      console.log('❌ User is not admin or not active:', {
        userId: req.user.id,
        role: u.role,
        isActive: u.isActive
      });
      return res.status(403).json({ success: false, error: 'Access denied. Admins only.' });
    }
    console.log('✅ Admin access verified for user:', u.email);
    next();
  } catch (e) {
    console.error('Admin verification error:', e);
    res.status(500).json({ success: false, error: e.message });
  }
};
const requireStaff = async (req, res, next) => {
  try {
    if (!req.user?.id) return res.status(403).json({ success: false, error: 'Forbidden' });
    const u = await Users.findById(req.user.id).lean();
    if (!u || !['admin', 'manager', 'support'].includes(u.role) || !u.isActive) {
      return res.status(403).json({ success: false, error: 'Access denied. Staff only.' });
    }
    next();
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};
// Brute force protection
const isLocked = (user) => {
  // Check if the user is currently locked out
  return !!(user.lockUntil && user.lockUntil > Date.now());
};
const failedLogin = async (email) => {
  try {
    const user = await Users.findOne({ email });
    if (!user) return;
    // Increment login attempts
    user.loginAttempts = (user.loginAttempts || 0) + 1;
    // Lock the account if too many attempts
    if (user.loginAttempts >= 5 && !user.lockUntil) {
      // Lock for 15 minutes
      user.lockUntil = Date.now() + 15 * 60 * 1000;
    }
    await user.save();
  } catch (error) {
    console.error('Error updating login attempts:', error);
  }
};
const resetLoginAttempts = async (email) => {
  try {
    await Users.updateOne(
      { email },
      { $unset: { loginAttempts: 1, lockUntil: 1 } }
    );
  } catch (error) {
    console.error('Error resetting login attempts:', error);
  }
};
// Email notification setup with error handling
let transporter;
let isEmailConfigured = false; // Track if email is configured
if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
  isEmailConfigured = true;
} else {
  console.log('⚠️ Email credentials not provided. Email notifications will be disabled.');
  // Create a mock transporter
  transporter = {
    sendMail: async () => {
      console.log('Email not sent: Email service not configured');
    }
  };
}
const sendPaymentNotification = async (userId, type, message, orderId) => {
  try {
    // Check if email is configured before attempting to send
    if (!isEmailConfigured) {
      console.log('Email not sent: Email service not configured');
      return;
    }
    
    // Save notification to database
    await PaymentNotification.create({
      orderId,
      userId,
      type,
      message
    });
    
    // Get user details
    const user = await Users.findById(userId);
    if (!user) {
      console.error('User not found for payment notification');
      return;
    }
    
    // Prepare data for the email template
    const emailData = {
      customerName: user.fullName,
      customerEmail: user.email,
      orderId: orderId,
      message: message
    };
    
    // Choose template based on type
    let templateName;
    switch (type) {
      case 'payment_received':
        templateName = 'orderConfirmation';
        // We need more data for order confirmation, so we'll fetch the order
        const order = await Order.findOne({ orderId: orderId });
        if (order) {
          emailData.orderNumber = order.orderId;
          emailData.totalPrice = order.total;
          emailData.deliveryDate = order.deliveredAt ? order.deliveredAt.toDateString() : 'To be determined';
          // Format product list for the template
          emailData.productList = order.items.map(item => 
            `<tr><td>${item.productName}</td><td>${item.quantity}</td><td>$${item.price}</td></tr>`
          ).join('');
        }
        break;
      case 'payment_failed':
        templateName = 'promo'; // Using promo template for simplicity, but you can create a specific one
        emailData.promoTitle = 'Payment Failed';
        emailData.promoMessage = message;
        emailData.promoDetails = 'Please try again or contact support.';
        emailData.promoCTA = 'View Order';
        emailData.promoLink = `https://yourstore.com/orders/${orderId}`;
        emailData.promoImage = 'https://yourstore.com/images/payment-failed.jpg';
        emailData.promoExpiry = 'N/A';
        emailData.unsubscribeLink = 'https://yourstore.com/unsubscribe';
        break;
      case 'order_processed':
        templateName = 'orderConfirmation';
        // Similar to payment_received, we fetch the order
        const processedOrder = await Order.findOne({ orderId: orderId });
        if (processedOrder) {
          emailData.orderNumber = processedOrder.orderId;
          emailData.totalPrice = processedOrder.total;
          emailData.deliveryDate = processedOrder.deliveredAt ? processedOrder.deliveredAt.toDateString() : 'To be determined';
          emailData.productList = processedOrder.items.map(item => 
            `<tr><td>${item.productName}</td><td>${item.quantity}</td><td>$${item.price}</td></tr>`
          ).join('');
        }
        break;
      default:
        templateName = 'promo';
        emailData.promoTitle = 'Notification';
        emailData.promoMessage = message;
        emailData.promoDetails = '';
        emailData.promoCTA = 'View Account';
        emailData.promoLink = 'https://yourstore.com/account';
        emailData.promoImage = 'https://yourstore.com/images/notification.jpg';
        emailData.promoExpiry = 'N/A';
        emailData.unsubscribeLink = 'https://yourstore.com/unsubscribe';
    }
    
    // Send the email using the template system
    const result = await sendEmail(user.email, templateName, emailData);
    if (result.success) {
      console.log(`Payment notification email sent to ${user.email}`);
    } else {
      console.error(`Failed to send payment notification: ${result.error}`);
    }
  } catch (error) {
    console.error('Error sending payment notification:', error);
  }
};
// =============================================================================
// REVENUE ANALYTICS FUNCTIONS
// =============================================================================
async function updateRevenue(orderData, action = 'add') {
  try {
    const orderDate = new Date(orderData.createdAt || Date.now());
    const day = orderDate.getDate();
    const month = orderDate.getMonth() + 1;
    const year = orderDate.getFullYear();
    const dateKey = new Date(year, month - 1, day);
    let revenue = await Revenue.findOne({ date: dateKey });
    if (!revenue) {
      revenue = new Revenue({
        date: dateKey,
        day,
        month,
        year,
        dailyRevenue: 0,
        ordersCount: 0,
        deliveredRevenue: 0,
        pendingRevenue: 0,
        cancelledRevenue: 0,
        checkedoutRevenue: 0
      });
    }
    const orderTotal = orderData.total || 0;
    if (action === 'add') {
      revenue.ordersCount += 1;
      // Only add to revenue if order is delivered
      if (orderData.status === 'delivered') {
        revenue.deliveredRevenue += orderTotal;
        revenue.dailyRevenue += orderTotal;
      } else if (orderData.status === 'cancelled') {
        revenue.cancelledRevenue += orderTotal;
      } else {
        revenue.pendingRevenue += orderTotal;
      }
      // Calculate checkedout revenue
      const checkedoutTotal = orderData.items
        .filter(item => item.status === 'checkedout')
        .reduce((sum, item) => sum + item.itemTotal, 0);
      revenue.checkedoutRevenue += checkedoutTotal;
    } else if (action === 'update') {
      // Update revenue when order status changes
      if (orderData.status === 'delivered') {
        revenue.deliveredRevenue += orderTotal;
        revenue.dailyRevenue += orderTotal;
      } else if (orderData.status === 'cancelled') {
        revenue.cancelledRevenue += orderTotal;
      } else {
        revenue.pendingRevenue += orderTotal;
      }
      // Calculate checkedout revenue
      const checkedoutTotal = orderData.items
        .filter(item => item.status === 'checkedout')
        .reduce((sum, item) => sum + item.itemTotal, 0);
      revenue.checkedoutRevenue += checkedoutTotal;
    }
    await revenue.save();
  } catch (error) {
    console.error('❌ Error updating revenue:', error);
  }
}
// =============================================================================
// ENHANCED CART-TO-ORDER FUNCTIONS
// =============================================================================
async function createOrUpdateOrder(user, product, quantity, size, paymentMethod, action) {
  try {
    console.log('Creating/updating order:', {
      userId: user._id,
      product: product.name,
      quantity,
      size,
      paymentMethod,
      action
    });
    
    // تحويل قيم paymentMethod إلى القيم الصحيحة
    let normalizedPaymentMethod = paymentMethod;
    if (paymentMethod === 'online') {
      normalizedPaymentMethod = 'bank_transfer'; // أو يمكن استخدام 'stripe' أو 'paypal' حسب الإعداد
    } else if (paymentMethod === 'cash') {
      normalizedPaymentMethod = 'cash_on_delivery';
    }
    
    console.log(`Normalized paymentMethod: ${paymentMethod} -> ${normalizedPaymentMethod}`);
    
    // Find existing pending order for this user
    let order = await Order.findOne({
      userId: user._id,
      status: 'pending'
    });
    
    const itemTotal = (product.new_price || product.newprice || 0) * Math.abs(quantity);
    
    if (!order && action === 'add' && quantity > 0) {
      // Create new order
      const orderItems = [{
        productId: product.id,
        productName: product.name,
        productImage: product.image,
        quantity: Math.abs(quantity),
        price: product.new_price || product.newprice || 0,
        size: size,
        itemTotal: itemTotal,
        status: 'in_cart' // Default status for new items
      }];
      
      // Generate a unique order ID before creating the order
      const count = await Order.countDocuments();
      const orderId = `ORD${String(count + 1).padStart(6, '0')}`;
      
      order = new Order({
        orderId: orderId, // Set the orderId explicitly
        userId: user._id,
        customerInfo: {
          fullName: user.fullName || 'Unknown User',
          email: user.email,
          phone: user.phone || 'غير محدد',
          address: user.address || 'غير محدد',
          governorate: user.governorate || 'غير محدد'
        },
        items: orderItems,
        total: itemTotal,
        status: 'pending',
        paymentMethod: normalizedPaymentMethod // Use normalized payment method
      });
      
      await order.save();
      await updateRevenue(order, 'add');
      console.log(`📦 New order created: ${order.orderId}`);
    } else if (order) {
      // Update existing order
      const existingItemIndex = order.items.findIndex(
        item => item.productId === product.id && item.size === size
      );
      
      if (existingItemIndex >= 0) {
        if (action === 'add' && quantity > 0) {
          order.items[existingItemIndex].quantity += quantity;
          order.items[existingItemIndex].itemTotal += itemTotal;
        } else if (quantity < 0) {
          order.items[existingItemIndex].quantity += quantity; // quantity is negative
          order.items[existingItemIndex].itemTotal =
            order.items[existingItemIndex].price * order.items[existingItemIndex].quantity;
          
          if (order.items[existingItemIndex].quantity <= 0) {
            order.items.splice(existingItemIndex, 1);
          }
        }
      } else if (action === 'add' && quantity > 0) {
        // Add new item to existing order
        order.items.push({
          productId: product.id,
          productName: product.name,
          productImage: product.image,
          quantity: Math.abs(quantity),
          price: product.new_price || product.newprice || 0,
          size: size,
          itemTotal: itemTotal,
          status: 'in_cart' // Default status for new items
        });
      }
      
      // Update payment method if provided
      if (paymentMethod && normalizedPaymentMethod !== order.paymentMethod) {
        order.paymentMethod = normalizedPaymentMethod;
      }
      
      // Recalculate total
      order.total = order.items.reduce((sum, item) => sum + item.itemTotal, 0);
      
      if (order.items.length === 0) {
        // Cancel order if no items left
        order.status = 'cancelled';
        order.cancelledAt = new Date();
        order.cancellationReason = 'All items removed from cart';
      }
      
      await order.save();
      await updateRevenue(order, 'update');
      console.log(`📦 Order updated: ${order.orderId}, Total: ${order.total}`);
    }
    
    console.log('✅ Order created/updated successfully');
  } catch (error) {
    console.error('❌ Error creating/updating order:', error);
    throw error; // إعادة رمي الخطأ للمعالجة في المستوى الأعلى
  }
}
// =============================================================================
// NEW FEATURES: ACTIVITY LOGGING, NOTIFICATIONS, BACKUP
// =============================================================================
// Activity Logging Middleware
const logAdminActivity = (action) => {
  return async (req, res, next) => {
    // Only log for admin routes
    if (req.user && req.user.role === 'admin') {
      try {
        const details = {
          method: req.method,
          url: req.originalUrl,
          body: req.body,
          params: req.params,
          query: req.query
        };
        
        await ActivityLog.create({
          adminId: req.user.id,
          action,
          details
        });
        
        console.log(`📝 Activity logged: ${action} by admin ${req.user.id}`);
      } catch (error) {
        console.error('❌ Error logging activity:', error);
      }
    }
    next();
  };
};
// Send Admin Notification Function
const sendAdminNotification = async (message, type = 'info') => {
  try {
    // Check if email is configured before attempting to send
    if (!isEmailConfigured) {
      console.log('⚠️ Email not configured properly. Email notifications will be disabled.');
      return;
    }
    
    // Find all admin users
    const admins = await Users.find({ role: 'admin', isActive: true });
    
    if (admins.length === 0) {
      console.log('⚠️ No active admins found to send notification');
      return;
    }
    
    // Create notifications for all admins
    const notifications = admins.map(admin => ({
      adminId: admin._id,
      message,
      type
    }));
    
    await Notification.insertMany(notifications);
    
    // Send email notifications
    for (const admin of admins) {
      if (admin.email) {
        try {
          await transporter.sendMail({
            from: process.env.EMAIL_USER || 'noreply@ecommerce.com',
            to: admin.email,
            subject: `Admin Notification - ${type.toUpperCase()}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
                <h2 style="color: #333;">Admin Notification</h2>
                <p>Dear ${admin.fullName},</p>
                <p>${message}</p>
                <p>Please check your admin dashboard for more details.</p>
                <p>Best regards,<br>E-commerce Team</p>
              </div>
            `
          });
          console.log(`📧 Email notification sent to ${admin.email}`);
        } catch (emailError) {
          console.error(`❌ Failed to send email to ${admin.email}:`, emailError.message);
          // Continue with other admins even if one fails
        }
      }
    }
    
    console.log(`📢 Notification sent to ${admins.length} admins: ${message}`);
  } catch (error) {
    console.error('❌ Error sending admin notification:', error);
  }
};
// Database Backup Function
const backupDatabase = async () => {
  try {
    if (!process.env.BACKUP_DIR) {
      console.log('⚠️ BACKUP_DIR not set in environment variables. Skipping backup.');
      return;
    }
    
    const backupDir = process.env.BACKUP_DIR;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `mongodb_backup_${timestamp}`;
    const backupPath = path.join(backupDir, backupFileName);
    
    // Create backup directory if it doesn't exist
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    // Get MongoDB connection URI
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/ecommerce';
    
    console.log(`🔄 Starting database backup at ${timestamp}`);
    
    // Execute mongodump command
    exec(`mongodump --uri="${mongoUri}" --out="${backupPath}"`, (error, stdout, stderr) => {
      if (error) {
        console.error('❌ Database backup failed:', error);
        return;
      }
      
      console.log(`✅ Database backup completed successfully at ${backupPath}`);
      
      // Compress the backup
      exec(`tar -czf "${backupPath}.tar.gz" -C "${backupDir}" "${backupFileName}"`, (error) => {
        if (error) {
          console.error('❌ Backup compression failed:', error);
          return;
        }
        
        // Remove the uncompressed backup
        exec(`rm -rf "${backupPath}"`, (error) => {
          if (error) {
            console.error('❌ Failed to remove uncompressed backup:', error);
          } else {
            console.log(`✅ Backup compressed and saved as ${backupPath}.tar.gz`);
          }
        });
      });
    });
  } catch (error) {
    console.error('❌ Error in backupDatabase function:', error);
  }
};
// Schedule daily backup at 2 AM
cron.schedule('0 2 * * *', () => {
  console.log('📅 Running scheduled database backup...');
  backupDatabase();
});
// =============================================================================
// STARTUP TASKS
// =============================================================================
async function ensureAdminSeed() {
  try {
    const email = (process.env.ADMIN_EMAIL || '').toLowerCase().trim();
    const password = process.env.ADMIN_PASSWORD;
    if (!email || !password) {
      console.warn('⚠️ ADMIN_EMAIL/ADMIN_PASSWORD not set. Skipping admin seed.');
      return;
    }
    const existing = await Users.findOne({ email }).select('+password');
    const hashed = await bcrypt.hash(password, 12);
    if (!existing) {
      await Users.collection.insertOne({
        email,
        password: hashed,
        role: 'admin',
        isActive: true,
        fullName: 'Super Admin',
        cartData: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log(`✅ Admin user created: ${email}`);
    } else {
      const same = await bcrypt.compare(password, existing.password);
      if (!same) {
        await Users.updateOne({ email }, { password: hashed });
        console.log(`🔑 Admin password updated for: ${email}`);
      } else {
        console.log(`✅ Admin exists: ${email}`);
      }
    }
  } catch (e) {
    console.error('❌ ensureAdminSeed error:', e);
  }
}
async function ensureHeroSection() {
  try {
    const heroExists = await HeroSection.findOne();
    if (!heroExists) {
      await HeroSection.create({
        title: 'تسوق الآن بأفضل الأسعار',
        subtitle: 'اكتشف تشكيلتنا المميزة من المنتجات عالية الجودة',
        buttonText: 'تسوق الآن',
        buttonLink: '/products',
        backgroundImage: '/images/hero-bg.jpg'
      });
      console.log('✅ Default hero section created');
    }
  } catch (e) {
    console.error('❌ ensureHeroSection error:', e);
  }
}
async function runStartupFixes() {
  try {
    console.log('🔧 Running startup fixes...');
    const res1 = await Users.updateMany(
      { fullName: { $exists: false } },
      { $set: { fullName: 'Unknown User' } }
    );
    if (res1?.modifiedCount) {
      console.log(`🧩 Backfilled fullName for ${res1.modifiedCount} users`);
    }
    console.log('✅ Startup fixes completed');
  } catch (error) {
    console.error('❌ Error during startup fixes:', error);
  }
}
async function fixOrderIndexes() {
  try {
    // Get all indexes on the orders collection
    const indexes = await Order.collection.indexes();
    console.log('Current indexes on orders collection:', indexes.map(i => ({ name: i.name, key: i.key })));
    
    // List of problematic index names to drop
    const problematicIndexNames = ['order_number_1', 'orderNumber_1', 'order_1'];
    
    // Drop any problematic indexes that exist
    for (const indexName of problematicIndexNames) {
      const index = indexes.find(i => i.name === indexName);
      if (index) {
        try {
          console.log(`Found problematic index: ${indexName}`);
          await Order.collection.dropIndex(indexName);
          console.log(`✅ Dropped problematic index: ${indexName}`);
        } catch (dropError) {
          if (dropError.codeName === 'IndexNotFound') {
            console.log(`⚠️ Index ${indexName} not found (may have been dropped already)`);
          } else {
            console.error(`❌ Error dropping index ${indexName}:`, dropError);
          }
        }
      }
    }
    
    // Check if the orderId index exists
    const orderIdIndex = indexes.find(index => 
      index.key && index.key.orderId !== undefined
    );
    
    if (!orderIdIndex) {
      try {
        // Create the correct index
        await Order.collection.createIndex({ orderId: 1 }, { unique: true, sparse: true });
        console.log('✅ Created unique index on orderId field');
      } catch (createError) {
        console.error('❌ Error creating orderId index:', createError);
      }
    } else {
      console.log('✅ orderId index already exists');
      
      // Check if it has the correct options
      if (!orderIdIndex.sparse) {
        try {
          // Drop and recreate with correct options
          await Order.collection.dropIndex('orderId_1');
          await Order.collection.createIndex({ orderId: 1 }, { unique: true, sparse: true });
          console.log('✅ Recreated orderId index with sparse option');
        } catch (recreateError) {
          console.error('❌ Error recreating orderId index:', recreateError);
        }
      }
    }
    
    // Check for any other potentially problematic indexes
    const otherProblematicIndexes = indexes.filter(index => 
      index.name !== '_id_' && 
      index.name !== 'orderId_1' && 
      index.unique === true &&
      index.key && 
      (Object.keys(index.key).some(k => k.includes('order')) ||
       Object.keys(index.key).some(k => k.includes('number')))
    );
    
    if (otherProblematicIndexes.length > 0) {
      console.log('Found other potentially problematic indexes:', otherProblematicIndexes.map(i => i.name));
      for (const index of otherProblematicIndexes) {
        try {
          await Order.collection.dropIndex(index.name);
          console.log(`✅ Dropped potentially problematic index: ${index.name}`);
        } catch (dropError) {
          if (dropError.codeName === 'IndexNotFound') {
            console.log(`⚠️ Index ${index.name} not found (may have been dropped already)`);
          } else {
            console.error(`❌ Error dropping index ${index.name}:`, dropError);
          }
        }
      }
    }
  } catch (error) {
    console.error('❌ Error fixing order indexes:', error);
  }
}
mongoose.connection.once('open', async () => {
  await ensureAdminSeed();
  await ensureHeroSection();
  await runStartupFixes();
  await fixOrderIndexes();
  
  // Send startup notification only if email is configured
  if (isEmailConfigured) {
    await sendAdminNotification('E-commerce server has started successfully', 'success');
  } else {
    console.log('⚠️ Startup notification not sent: Email service not configured');
  }
});
// =============================================================================
// HTTPS CONFIGURATION
// =============================================================================
let httpsServer = null;
if (process.env.SSL_CERT_PATH && process.env.SSL_KEY_PATH) {
  try {
    const privateKey = fs.readFileSync(process.env.SSL_KEY_PATH, 'utf8');
    const certificate = fs.readFileSync(process.env.SSL_CERT_PATH, 'utf8');
    const credentials = { key: privateKey, cert: certificate };
    
    httpsServer = https.createServer(credentials, app);
    
    // Start HTTPS server
    httpsServer.listen(443, () => {
      console.log(`\n🔒 HTTPS Server running on port 443`);
    });
    
    // Redirect HTTP to HTTPS
    app.use((req, res, next) => {
      if (!req.secure) {
        return res.redirect(`https://${req.headers.host}${req.url}`);
      }
      next();
    });
    
    console.log('✅ HTTPS configuration enabled');
  } catch (error) {
    console.error('❌ Failed to configure HTTPS:', error);
    console.log('⚠️ Continuing with HTTP only');
  }
}
// =============================================================================
// SESSIONS & PASSPORT
// =============================================================================
// Add session middleware BEFORE passport initialization
app.use(
  session({
    secret: process.env.JWT_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production', // استخدام secure في الإنتاج فقط
      httpOnly: true, // منع الوصول إلى الكوكيز من JavaScript
      sameSite: 'lax', // حماية من CSRF
      maxAge: 24 * 60 * 60 * 1000 // 24 ساعة
    }
  })
);
app.use(passport.initialize());
app.use(passport.session());
passport.serializeUser((user, done) => done(null, user._id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await Users.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});
if (
  process.env.GOOGLE_CLIENT_ID &&
  process.env.GOOGLE_CLIENT_SECRET &&
  process.env.GOOGLE_CALLBACK_URL
) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = (profile.emails?.[0]?.value || '').toLowerCase();
          if (!email) {
            return done(new Error('Google profile missing email'), null);
          }
          let user = await Users.findOne({ email });
          if (!user) {
            user = await Users.create({
              fullName: profile.displayName || 'Google User',
              email,
              password: Math.random().toString(36).slice(-8),
              cartData: {},
              googleId: profile.id,
            });
          } else if (!user.googleId) {
            // Link Google account to existing user
            user.googleId = profile.id;
            await user.save();
          }
          done(null, user);
        } catch (err) {
          done(err, null);
        }
      }
    )
  );
}
// =============================================================================
// CSRF Protection
// =============================================================================
// تعديل CSRF middleware للسماح بالحصول على رمز CSRF
const csrfProtection = (req, res, next) => {
  // Skip CSRF for GET requests and specific endpoints
  if (req.method === 'GET' || 
      req.path === '/login' || 
      req.path === '/refresh-token' || 
      req.path === '/signup' ||
      req.path === '/captcha' ||
      req.path === '/csrf-token' ||
      req.path === '/admin/login' ||
      req.path === '/addtocart' || // Allow add to cart without CSRF
      req.path === '/getcartdata' || // Allow get cart data without CSRF
      req.path === '/checkout' || // Allow checkout without CSRF
      req.path.startsWith('/api/') || // Allow all API endpoints during development
      req.path.startsWith('/debug/')) { // Allow debug endpoints
    return next();
  }
  
  const csrfToken = req.headers['x-csrf-token'];
  const sessionCsrfToken = req.session.csrfToken;
  
  // إذا لم يكن هناك رمز CSRF في الجلسة، قم بإنشاء واحد
  if (!sessionCsrfToken) {
    req.session.csrfToken = crypto.randomBytes(100).toString('base64');
  }
  
  // تحقق من وجود رمز CSRF في الطلب
  if (!csrfToken || csrfToken !== sessionCsrfToken) {
    return res.status(403).json({ 
      success: false, 
      error: 'Invalid CSRF token',
      csrfToken: req.session.csrfToken // إرسال رمز CSRF الجديد للاستخدام في المستقبل
    });
  }
  
  next();
};
// تعديل middleware لتوفير رمز CSRF للجلسات المصادقة
app.use((req, res, next) => {
  // إنشاء رمز CSRF للمستخدمين المصادقين
  if (req.user && !req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(100).toString('base64');
  }
  
  // تضمين رمز CSRF في الاستجابة
  if (req.session.csrfToken) {
    res.setHeader('X-CSRF-Token', req.session.csrfToken);
  }
  
  next();
});
// إضافة نقطة نهاية للحصول على رمز CSRF
app.get('/csrf-token', (req, res) => {
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(100).toString('base64');
  }
  res.json({ 
    success: true, 
    csrfToken: req.session.csrfToken 
  });
});
// CAPTCHA endpoint
app.get('/captcha', (req, res) => {
  const captcha = svgCaptcha.create({
    size: 6,
    noise: 2,
    color: true,
    background: '#f0f0f0'
  });
  
  req.session.captcha = captcha.text;
  
  res.type('svg');
  res.status(200).send(captcha.data);
});
// Middleware to validate CAPTCHA
const validateCaptcha = (req, res, next) => {
  const { captcha } = req.body;
  
  // Debug: Log session captcha
  console.log('Session CAPTCHA:', req.session.captcha);
  console.log('User CAPTCHA input:', captcha);
  
  if (!captcha || !req.session.captcha || captcha.toLowerCase() !== req.session.captcha.toLowerCase()) {
    return res.status(400).json({
      success: false,
      error: 'Invalid CAPTCHA. Please try again.'
    });
  }
  
  // Clear CAPTCHA after successful validation
  req.session.captcha = null;
  next();
};
// Apply CSRF protection to all routes
app.use(csrfProtection);
// =============================================================================
// ROUTES
// =============================================================================
const router = express.Router();
app.use('/', router);
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Enhanced E-commerce API is running!',
    timestamp: new Date().toISOString(),
    port: port,
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    https: httpsServer ? 'enabled' : 'disabled'
  });
});
  
  // Clear CAPTCHA after successful validation
// =============================================================================
// NEW FEATURES ENDPOINTS
// =============================================================================
// Activity Logs Endpoints
router.get('/api/activity-logs', fetchUser, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, action } = req.query;
    const skip = (page - 1) * limit;
    
    const filter = {};
    if (action) filter.action = action;
    
    const logs = await ActivityLog.find(filter)
      .populate('adminId', 'fullName email')
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();
    
    const total = await ActivityLog.countDocuments(filter);
    
    res.json({
      success: true,
      logs,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        hasMore: skip + logs.length < total,
        totalLogs: total
      }
    });
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});
// Notifications Endpoints
router.get('/api/notifications', fetchUser, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, type, unreadOnly = false } = req.query;
    const skip = (page - 1) * limit;
    
    const filter = { adminId: req.user.id };
    if (type) filter.type = type;
    if (unreadOnly === 'true') filter.isRead = false;
    
    const notifications = await Notification.find(filter)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();
    
    const total = await Notification.countDocuments(filter);
    
    res.json({
      success: true,
      notifications,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        hasMore: skip + notifications.length < total,
        totalNotifications: total
      }
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});
// Mark notification as read
router.patch('/api/notifications/:id/read', fetchUser, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const notification = await Notification.findOneAndUpdate(
      { _id: id, adminId: req.user.id },
      { isRead: true },
      { new: true }
    );
    
    if (!notification) {
      return res.status(404).json({ success: false, error: 'Notification not found' });
    }
    
    res.json({
      success: true,
      notification
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});
// Mark all notifications as read
router.patch('/api/notifications/read-all', fetchUser, requireAdmin, async (req, res) => {
  try {
    await Notification.updateMany(
      { adminId: req.user.id, isRead: false },
      { isRead: true }
    );
    
    res.json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});
// Payment Gateway Endpoints (Temporary)
router.post('/api/payment/stripe', fetchUser, async (req, res) => {
  try {
    if (!process.env.STRIPE_KEY) {
      return res.status(503).json({
        success: false,
        error: 'Stripe payment is not configured. Please contact administrator.'
      });
    }
    
    const { amount, currency = 'USD', paymentMethodId } = req.body;
    
    if (!amount || !paymentMethodId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Amount and payment method are required' 
      });
    }
    
    // Create a PaymentIntent with the order amount and currency
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency,
      payment_method: paymentMethodId,
      confirm: true,
      return_url: `${req.protocol}://${req.get('host')}/payment/complete`,
    });
    
    res.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    });
  } catch (error) {
    console.error('Stripe payment error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Payment processing failed' 
    });
  }
});
router.post('/api/payment/paypal', fetchUser, async (req, res) => {
  try {
    if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_SECRET) {
      return res.status(503).json({
        success: false,
        error: 'PayPal payment is not configured. Please contact administrator.'
      });
    }
    
    const { amount, currency = 'USD' } = req.body;
    
    if (!amount) {
      return res.status(400).json({ 
        success: false, 
        error: 'Amount is required' 
      });
    }
    
    const create_payment_json = {
      intent: 'sale',
      payer: {
        payment_method: 'paypal'
      },
      redirect_urls: {
        return_url: `${req.protocol}://${req.get('host')}/payment/paypal/return`,
        cancel_url: `${req.protocol}://${req.get('host')}/payment/paypal/cancel`
      },
      transactions: [{
        item_list: {
          items: [{
            name: 'E-commerce Purchase',
            sku: '001',
            price: amount.toFixed(2),
            currency,
            quantity: 1
          }]
        },
        amount: {
          currency,
          total: amount.toFixed(2)
        },
        description: 'E-commerce purchase payment'
      }]
    };
    
    paypal.payment.create(create_payment_json, function (error, payment) {
      if (error) {
        console.error('PayPal payment error:', error);
        return res.status(500).json({ 
          success: false, 
          error: error.response.message || 'Payment processing failed' 
        });
      } else {
        // Find the approval URL
        let approvalUrl;
        for (let i = 0; i < payment.links.length; i++) {
          if (payment.links[i].rel === 'approval_url') {
            approvalUrl = payment.links[i].href;
          }
        }
        
        res.json({
          success: true,
          paymentId: payment.id,
          approvalUrl
        });
      }
    });
  } catch (error) {
    console.error('PayPal payment error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Payment processing failed' 
    });
  }
});
// Manual backup endpoint
router.post('/admin/backup', fetchUser, requireAdmin, async (req, res) => {
  try {
    await backupDatabase();
    res.json({
      success: true,
      message: 'Database backup initiated successfully'
    });
  } catch (error) {
    console.error('Manual backup error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Backup failed' 
    });
  }
});
// =============================================================================
// DEBUG ENDPOINTS
// =============================================================================
// نقطة نهاية للتحقق من المصادقة
app.get('/debug/auth', fetchUser, (req, res) => {
  res.json({
    success: true,
    user: req.user,
    message: 'Authentication successful'
  });
});
// نقطة نهاية للتحقق من صلاحيات الإدمن
app.get('/debug/admin', fetchUser, requireAdmin, (req, res) => {
  res.json({
    success: true,
    user: req.user,
    message: 'Admin access verified'
  });
});
// نقطة نهاية للتحقق من البيانات والمصادقة
app.get('/debug/check-data', async (req, res) => {
  try {
    const token = req.header('auth-token') || req.header('Authorization')?.replace('Bearer ', '');
    console.log('Debug - Token received:', token ? 'Yes' : 'No');
    // التحقق من عدد الطلبات في قاعدة البيانات
    const ordersCount = await Order.countDocuments();
    const revenueCount = await Revenue.countDocuments();
    console.log('Debug - Orders count:', ordersCount);
    console.log('Debug - Revenue count:', revenueCount);
    // التحقق من المصادقة إذا كان هناك توكن
    let user = null;
    if (token) {
      try {
        const data = jwt.verify(token, JWT_SECRET);
        user = await Users.findById(data.user.id);
        console.log('Debug - User found:', user ? 'Yes' : 'No');
      } catch (error) {
        console.log('Debug - Token verification failed:', error.message);
      }
    }
    // جلب عينة من البيانات
    const sampleOrders = await Order.find().limit(3).lean();
    const sampleRevenue = await Revenue.find().limit(3).lean();
    res.json({
      success: true,
      debug: {
        token: token ? 'Present' : 'Missing',
        user: user ? 'Authenticated' : 'Not authenticated',
        userRole: user?.role || 'N/A'
      },
      counts: {
        orders: ordersCount,
        revenue: revenueCount
      },
      samples: {
        orders: sampleOrders,
        revenue: sampleRevenue
      },
      message: ordersCount > 0 ? 'توجد بيانات طلبات في قاعدة البيانات' : 'لا توجد بيانات طلبات'
    });
  } catch (error) {
    console.error('Debug endpoint error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});
// نقطة نهاية خاصة للاختبار بدون مصادقة
app.get('/debug/public-data', async (req, res) => {
  try {
    const ordersCount = await Order.countDocuments();
    const revenueCount = await Revenue.countDocuments();
    const sampleOrders = await Order.find().limit(3).lean();
    const sampleRevenue = await Revenue.find().limit(3).lean();
    res.json({
      success: true,
      counts: {
        orders: ordersCount,
        revenue: revenueCount
      },
      samples: {
        orders: sampleOrders,
        revenue: sampleRevenue
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
// إنشاء بيانات تجريبية
app.post('/debug/create-sample-data', async (req, res) => {
  try {
    console.log('Creating sample data...');
    // البحث عن مستخدم لإنشاء الطلبات
    const user = await Users.findOne();
    if (!user) {
      return res.status(400).json({ success: false, error: 'لا يوجد مستخدمون' });
    }
    console.log('Using user:', user.email);
    // إنشاء طلب تجريبي
    const sampleOrder = new Order({
      userId: user._id,
      customerInfo: {
        fullName: user.fullName || 'عميل تجريبي',
        email: user.email,
        phone: user.phone || '0123456789',
        address: user.address || 'عنوان تجريبي',
        governorate: user.governorate || 'القاهرة'
      },
      items: [{
        productId: 1,
        productName: 'منتج تجريبي',
        productImage: '/images/default.jpg',
        quantity: 2,
        price: 150,
        size: 'M',
        itemTotal: 300,
        status: 'in_cart'
      }],
      total: 300,
      status: 'pending',
      paymentMethod: 'cash_on_delivery'
    });
    await sampleOrder.save();
    console.log('Sample order created:', sampleOrder.orderId);
    // إنشاء طلب مكتمل
    const deliveredOrder = new Order({
      userId: user._id,
      customerInfo: {
        fullName: user.fullName || 'عميل تجريبي',
        email: user.email,
        phone: user.phone || '0123456789',
        address: user.address || 'عنوان تجريبي',
        governorate: user.governorate || 'القاهرة'
      },
      items: [{
        productId: 2,
        productName: 'منتج مكتمل',
        productImage: '/images/default.jpg',
        quantity: 1,
        price: 200,
        size: 'L',
        itemTotal: 200,
        status: 'checkedout'
      }],
      total: 200,
      status: 'delivered',
      paymentMethod: 'cash_on_delivery',
      deliveredAt: new Date()
    });
    await deliveredOrder.save();
    console.log('Delivered order created:', deliveredOrder.orderId);
    // إنشاء بيانات إيرادات لليوم الحالي
    const today = new Date();
    const sampleRevenue = new Revenue({
      date: today,
      day: today.getDate(),
      month: today.getMonth() + 1,
      year: today.getFullYear(),
      dailyRevenue: 200,
      ordersCount: 2,
      deliveredRevenue: 200,
      pendingRevenue: 300,
      cancelledRevenue: 0,
      checkedoutRevenue: 200
    });
    await sampleRevenue.save();
    console.log('Sample revenue created');
    res.json({
      success: true,
      message: 'تم إنشاء بيانات تجريبية بنجاح',
      orders: [sampleOrder.orderId, deliveredOrder.orderId]
    });
  } catch (error) {
    console.error('Create sample data error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});
// =============================================================================
// ENHANCED ADMIN
// =============================================================================
// مسار تسجيل دخول الأدمن الآمن
app.post('/admin/login', validateCaptcha, logAdminActivity('admin_login'), async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'البريد الإلكتروني وكلمة المرور مطلوبان'
      });
    }
    
    // البحث عن المستخدم في قاعدة البيانات
    const user = await Users.findOne({ email: email.toLowerCase().trim() }).select('+password');
    
    if (!user) {
      // Record failed login attempt for security
      await failedLogin(email);
      return res.status(401).json({
        success: false,
        error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة'
      });
    }
    
    // Check if account is locked
    if (isLocked(user)) {
      return res.status(403).json({
        success: false,
        error: 'Account locked due to too many failed login attempts. Please try again later.'
      });
    }
    
    // التحقق من كلمة المرور
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      // Record failed login attempt
      await failedLogin(email);
      return res.status(401).json({
        success: false,
        error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة'
      });
    }
    
    // التحقق من أن المستخدم هو أدمن
    if (user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'غير مصرح لك بالوصول إلى لوحة التحكم'
      });
    }
    
    // Reset login attempts on successful login
    await resetLoginAttempts(email);
    
    // إنشاء توكن JWT
    const token = jwt.sign(
      { user: { id: user._id.toString(), role: user.role } },
      JWT_SECRET,
      { expiresIn: JWT_ACCESS_TTL }
    );
    
    const refreshToken = jwt.sign(
      { user: { id: user._id.toString(), role: user.role } },
      JWT_REFRESH_SECRET,
      { expiresIn: JWT_REFRESH_TTL }
    );
    
    // تحديث تاريخ آخر تسجيل دخول
    user.lastLogin = new Date();
    await user.save();
    
    res.json({
      success: true,
      token,
      refreshToken,
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({
      success: false,
      error: 'حدث خطأ في الخادم'
    });
  }
});
// Get admin metrics - محدث لعرض الإحصائيات الأساسية فقط
app.get('/admin/metrics', fetchUser, requireAdmin, async (req, res) => {
  try {
    const productsCount = await Product.countDocuments();
    const usersCount = await Users.countDocuments();
    
    // حساب الإيرادات فقط من الطلبات المسلمة
    const deliveredOrders = await Order.find({ status: 'delivered' });
    const totalRevenue = deliveredOrders.reduce((sum, order) => sum + order.total, 0);
    
    // حساب عدد الطلبات المسلمة
    const deliveredOrdersCount = await Order.countDocuments({ status: 'delivered' });
    
    res.json({
      success: true,
      metrics: {
        productsCount,
        usersCount,
        deliveredRevenue: totalRevenue,
        deliveredOrdersCount
      }
    });
  } catch (err) {
    console.error('Admin metrics error', err);
    res.status(500).json({ success: false, error: err.message });
  }
});
// Get all users with real data
app.get('/admin/users', fetchUser, requireAdmin, logAdminActivity('view_users'), async (req, res) => {
  try {
    const users = await Users.find({})
      .select('fullName email phone address governorate role isActive createdAt lastLogin')
      .sort({ createdAt: -1 })
      .lean();
    const formattedUsers = users.map(user => ({
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone || 'غير محدد',
      address: user.address || 'غير محدد',
      governorate: user.governorate || 'غير محدد',
      role: user.role,
      isActive: user.isActive,
      joinDate: user.createdAt,
      lastLogin: user.lastLogin || 'لم يسجل دخول مؤخراً'
    }));
    res.json({
      success: true,
      users: formattedUsers,
      total: users.length
    });
  } catch (err) {
    console.error('Get users error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});
// Add new staff member
app.post('/admin/users', fetchUser, requireAdmin, logAdminActivity('add_staff'), async (req, res) => {
  try {
    const { fullName, email, password, phone, address, governorate, role } = req.body;
    // Validation
    if (!fullName || !email || !password || !role) {
      return res.status(400).json({ success: false, error: 'All required fields must be provided' });
    }
    if (!['admin', 'manager', 'support'].includes(role)) {
      return res.status(400).json({ success: false, error: 'Invalid role' });
    }
    // Check if user already exists
    const existingUser = await Users.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, error: 'User with this email already exists' });
    }
    // Create new user
    const newUser = new Users({
      fullName,
      email: email.toLowerCase(),
      password,
      phone,
      address,
      governorate,
      role,
      isActive: true
    });
    await newUser.save();
    // Remove password from response
    const userResponse = newUser.toObject();
    delete userResponse.password;
    
    // Send notification to all admins
    await sendAdminNotification(`New staff member added: ${fullName} (${email})`, 'info');
    
    res.json({
      success: true,
      message: 'Staff member added successfully',
      user: userResponse
    });
  } catch (err) {
    console.error('Add staff error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});
// Update user status (active/inactive)
app.patch('/admin/users/:id/status', fetchUser, requireAdmin, logAdminActivity('update_user_status'), async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;
    const user = await Users.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    user.isActive = isActive;
    await user.save();
    
    // Send notification to all admins
    await sendAdminNotification(`User status updated: ${user.fullName} (${user.email}) is now ${isActive ? 'active' : 'inactive'}`, 'warning');
    
    res.json({
      success: true,
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`
    });
  } catch (err) {
    console.error('Update user status error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});
// Get all orders with customer details - ONLY orders with checkedout items
app.get('/admin/orders', fetchUser, requireAdmin, logAdminActivity('view_orders'), async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;
    let filter = { 'items.status': 'checkedout' }; // فقط إظهار الطلبات التي تحتوي على عناصر مدفوعة
    if (status && status !== 'all') {
      filter.status = status;
    }
    console.log('Fetching orders with filter:', filter);
    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();
    const total = await Order.countDocuments(filter);
    console.log(`Found ${orders.length} orders out of ${total} total`);
    const formattedOrders = orders.map(order => ({
      id: order._id,
      orderId: order.orderId,
      customerInfo: order.customerInfo,
      items: order.items.filter(item => item.status === 'checkedout'), // فقط إظهار العناصر المدفوعة
      total: order.items
        .filter(item => item.status === 'checkedout')
        .reduce((sum, item) => sum + item.itemTotal, 0), // حساب الإجمالي من العناصر المدفوعة فقط
      status: order.status,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      orderDate: order.createdAt,
      deliveredAt: order.deliveredAt,
      cancelledAt: order.cancelledAt,
      notes: order.notes,
      trackingNumber: order.trackingNumber
    }));
    res.json({
      success: true,
      orders: formattedOrders,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        hasMore: skip + orders.length < total
      }
    });
  } catch (err) {
    console.error('Get orders error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});
// Update order status
app.post('/admin/orders/:orderId/status', fetchUser, requireAdmin, logAdminActivity('update_order_status'), async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, notes, trackingNumber } = req.body;
    if (!['pending', 'processing', 'shipped', 'delivered', 'cancelled'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }
    const oldStatus = order.status;
    order.status = status;
    if (notes) order.notes = notes;
    if (trackingNumber) order.trackingNumber = trackingNumber;
    if (status === 'delivered') {
      order.deliveredAt = new Date();
      order.paymentStatus = 'paid';
      // Send payment notification
      await sendPaymentNotification(
        order.userId,
        'payment_received',
        `Your order #${order.orderId} has been delivered and payment has been processed.`,
        order.orderId
      );
    } else if (status === 'cancelled') {
      order.cancelledAt = new Date();
      order.paymentStatus = 'failed';
      if (req.body.cancellationReason) {
        order.cancellationReason = req.body.cancellationReason;
      }
      // Send payment notification
      await sendPaymentNotification(
        order.userId,
        'payment_failed',
        `Your order #${order.orderId} has been cancelled.`,
        order.orderId
      );
    }
    await order.save();
    // Update revenue analytics
    await updateRevenue(order, 'update');
    console.log(`📦 Order ${order.orderId} status updated: ${oldStatus} → ${status}`);
    
    // Send notification to all admins
    await sendAdminNotification(`Order status updated: #${order.orderId} from ${oldStatus} to ${status}`, 'info');
    
    res.json({
      success: true,
      message: `Order status updated to ${status}`,
      order: {
        id: order._id,
        orderId: order.orderId,
        status: order.status,
        paymentStatus: order.paymentStatus,
        deliveredAt: order.deliveredAt,
        cancelledAt: order.cancelledAt
      }
    });
  } catch (err) {
    console.error('Update order status error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});
// Delete order (admin only)
app.delete('/admin/orders/:orderId', fetchUser, requireAdmin, logAdminActivity('delete_order'), async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }
    // Update revenue analytics
    await updateRevenue(order, 'remove');
    await Order.findByIdAndDelete(orderId);
    console.log(`🗑️ Order ${order.orderId} deleted by admin`);
    
    // Send notification to all admins
    await sendAdminNotification(`Order deleted: #${order.orderId}`, 'warning');
    
    res.json({
      success: true,
      message: 'Order deleted successfully'
    });
  } catch (err) {
    console.error('Delete order error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});
// Revenue analytics
app.get('/admin/revenue', fetchUser, requireAdmin, logAdminActivity('view_revenue'), async (req, res) => {
  try {
    const { period = 'daily', year, month } = req.query;
    let pipeline = [];
    console.log('Fetching revenue analytics for period:', period);
    // Filter by year/month if provided
    let matchStage = {};
    if (year) matchStage.year = parseInt(year);
    if (month) matchStage.month = parseInt(month);
    if (Object.keys(matchStage).length > 0) {
      pipeline.push({ $match: matchStage });
    }
    if (period === 'daily') {
      pipeline.push({
        $group: {
          _id: { year: '$year', month: '$month', day: '$day' },
          deliveredRevenue: { $sum: '$deliveredRevenue' },
          ordersCount: { $sum: '$ordersCount' },
          date: { $first: '$date' }
        }
      });
      pipeline.push({ $sort: { date: -1 } });
      pipeline.push({ $limit: 30 });
    } else if (period === 'monthly') {
      pipeline.push({
        $group: {
          _id: { year: '$year', month: '$month' },
          monthlyRevenue: { $sum: '$deliveredRevenue' },
          ordersCount: { $sum: '$ordersCount' }
        }
      });
      pipeline.push({ $sort: { '_id.year': -1, '_id.month': -1 } });
      pipeline.push({ $limit: 12 });
    } else if (period === 'yearly') {
      pipeline.push({
        $group: {
          _id: { year: '$year' },
          yearlyRevenue: { $sum: '$deliveredRevenue' },
          ordersCount: { $sum: '$ordersCount' }
        }
      });
      pipeline.push({ $sort: { '_id.year': -1 } });
    }
    const revenueData = await Revenue.aggregate(pipeline);
    console.log(`Found ${revenueData.length} revenue records for ${period}`);
    res.json({
      success: true,
      period,
      data: revenueData
    });
  } catch (err) {
    console.error('Revenue analytics error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});
// Get hero section data
app.get('/admin/hero', fetchUser, requireAdmin, logAdminActivity('view_hero'), async (req, res) => {
  try {
    const heroSection = await HeroSection.findOne({ isActive: true });
    if (!heroSection) {
      return res.status(404).json({ success: false, error: 'Hero section not found' });
    }
    res.json({
      success: true,
      heroSection
    });
  } catch (err) {
    console.error('Get hero section error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});
// Update hero section
app.put('/admin/hero', fetchUser, requireAdmin, logAdminActivity('update_hero'), async (req, res) => {
  try {
    const { title, subtitle, buttonText, buttonLink, backgroundImage } = req.body;
    let heroSection = await HeroSection.findOne({ isActive: true });
    if (heroSection) {
      // Update existing hero section
      heroSection.title = title;
      heroSection.subtitle = subtitle;
      heroSection.buttonText = buttonText;
      heroSection.buttonLink = buttonLink;
      heroSection.backgroundImage = backgroundImage;
      heroSection.updatedAt = new Date();
      await heroSection.save();
    } else {
      // Create new hero section
      heroSection = new HeroSection({
        title,
        subtitle,
        buttonText,
        buttonLink,
        backgroundImage,
        isActive: true
      });
      await heroSection.save();
    }
    
    // Send notification to all admins
    await sendAdminNotification('Hero section updated', 'info');
    
    res.json({
      success: true,
      message: 'Hero section updated successfully',
      heroSection
    });
  } catch (err) {
    console.error('Update hero section error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});
// Create admin account
app.post('/create-admin', async (req, res) => {
  try {
    const { email, password, fullName } = req.body;
    if (!email || !password || !fullName) {
      return res.status(400).json({
        success: false,
        error: 'Email, password, and fullName are required'
      });
    }
    // Check if admin already exists
    const existingAdmin = await Users.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        error: 'Admin with this email already exists'
      });
    }
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);
    // Create admin user
    const admin = new Users({
      email,
      password: hashedPassword,
      fullName,
      role: 'admin',
      isActive: true,
      cartData: {}
    });
    await admin.save();
    console.log(`✅ Admin account created: ${email}`);
    res.json({
      success: true,
      message: 'Admin account created successfully',
      admin: {
        id: admin._id,
        email: admin.email,
        fullName: admin.fullName,
        role: admin.role
      }
    });
  } catch (error) {
    console.error('❌ Error creating admin account:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});
// Upgrade user to admin
app.post('/upgrade-to-admin', fetchUser, requireAdmin, logAdminActivity('upgrade_to_admin'), async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }
    const user = await Users.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    user.role = 'admin';
    await user.save();
    console.log(`✅ User upgraded to admin: ${user.email}`);
    
    // Send notification to all admins
    await sendAdminNotification(`User upgraded to admin: ${user.fullName} (${user.email})`, 'warning');
    
    res.json({
      success: true,
      message: 'User upgraded to admin successfully',
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        role: user.role
      }
    });
  } catch (error) {
    console.error('❌ Error upgrading user to admin:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});
// Get payment notifications for a user
app.get('/payment-notifications', fetchUser, async (req, res) => {
  try {
    const notifications = await PaymentNotification.find({
      userId: req.user.id
    })
    .sort({ createdAt: -1 })
    .lean();
    
    res.json({
      success: true,
      notifications
    });
  } catch (error) {
    console.error('Get payment notifications error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});
// Mark notification as read
app.patch('/payment-notifications/:id/read', fetchUser, async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await PaymentNotification.findOneAndUpdate(
      { _id: id, userId: req.user.id },
      { read: true },
      { new: true }
    );
    
    if (!notification) {
      return res.status(404).json({ success: false, error: 'Notification not found' });
    }
    
    res.json({
      success: true,
      notification
    });
  } catch (error) {
    console.error('Mark notification as read error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});
// =============================================================================
// UPLOAD
// =============================================================================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dest = path.join(__dirname, 'upload/images');
    fs.mkdirSync(dest, { recursive: true });
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    cb(null, `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`);
  },
});
const upload = multer({ 
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Check file type
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});
app.post('/upload', fetchUser, requireAdmin, logAdminActivity('upload_image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No file uploaded' });
  }
  res.json({
    success: true,
    image_url: `http://localhost:${port}/images/${req.file.filename}`,
  });
});
// =============================================================================
// PRODUCTS
// =============================================================================
app.post('/addproduct', fetchUser, requireAdmin, logAdminActivity('add_product'), async (req, res) => {
  try {
    if (!req.body.name || !req.body.category) {
      return res.status(400).json({ success: false, error: 'Name and category are required' });
    }
    let nextId = 1;
    const last = await Product.findOne().sort({ id: -1 }).lean();
    if (last?.id) nextId = last.id + 1;
    const productData = {
      id: nextId,
      name: String(req.body.name).trim(),
      title: (req.body.title || req.body.name).trim(),
      image: req.body.image || '',
      images: Array.isArray(req.body.images) ? req.body.images : [req.body.image || ''],
      category: String(req.body.category).trim(),
      new_price: Number(req.body.new_price) || 0,
      old_price: Number(req.body.old_price) || 0,
      newprice: Number(req.body.new_price) || 0,
      oldprice: Number(req.body.old_price) || 0,
      description: (req.body.description || `Description for ${req.body.name}`).trim(),
      sizes: Array.isArray(req.body.sizes) ? req.body.sizes : ['S', 'M', 'L', 'XL', 'XXL'],
      rating: Number(req.body.rating) || 4,
      reviews: parseInt(req.body.reviews) || 122,
      tags: Array.isArray(req.body.tags) ? req.body.tags : ['Modern', 'Latest'],
      sku: req.body.sku || `SKU${nextId}`,
      available: req.body.available !== false,
      date: new Date(),
    };
    const product = await Product.create(productData);
    
    // Send notification to all admins
    await sendAdminNotification(`New product added: ${productData.name}`, 'success');
    
    res.json({
      success: true,
      id: nextId,
      _id: product._id.toString(),
      message: 'Product added successfully',
    });
  } catch (err) {
    console.error('❌ Error adding product:', err);
    if (err.code === 11000) {
      return res.status(400).json({ success: false, error: 'Product ID already exists' });
    }
    res.status(500).json({ success: false, error: err.message || 'Failed to add product' });
  }
});
app.get('/allproducts', async (req, res) => {
  try {
    const products = await Product.find({}).lean();
    const formatted = products.map((p, i) => ({
      id: p.id ?? i + 1,
      _id: p._id.toString(),
      name: p.name || p.title || `Product ${i + 1}`,
      title: p.title || p.name || `Product ${i + 1}`,
      image: p.image || `http://localhost:${port}/images/default.jpg`,
      images: p.images?.length ? p.images : [p.image || ''],
      category: p.category || 'general',
      new_price: p.new_price || p.newprice || 0,
      old_price: p.old_price || p.oldprice || 0,
      newprice: p.newprice || p.new_price || 0,
      oldprice: p.oldprice || p.old_price || 0,
      description: p.description || `Description for ${p.name || p.title || `Product ${i + 1}`}`,
      sizes: p.sizes?.length ? p.sizes : ['S', 'M', 'L', 'XL', 'XXL'],
      rating: p.rating || 4,
      reviews: p.reviews || 122,
      tags: p.tags?.length ? p.tags : ['Modern', 'Latest'],
      sku: p.sku || p._id.toString(),
      available: p.available !== false,
      date: p.date || p.createdAt,
    }));
    res.json(formatted);
  } catch (err) {
    console.error('❌ Error fetching products:', err);
    res.status(500).json({ success: false, error: err.message, message: 'Failed to fetch products' });
  }
});
app.get('/product/:id', async (req, res) => {
  try {
    const id = req.params.id;
    let product = null;
    if (mongoose.Types.ObjectId.isValid(id) && String(id).length === 24) {
      product = await Product.findById(id);
    }
    if (!product) {
      product = await Product.findOne({ $or: [{ id: parseInt(id) }, { id: id }] });
    }
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    const p = product;
    const formatted = {
      id: p.id || p._id.toString(),
      _id: p._id.toString(),
      name: p.name || p.title,
      title: p.title || p.name,
      image: p.image,
      images: p.images?.length ? p.images : [p.image, p.image, p.image, p.image].filter(Boolean),
      category: p.category,
      new_price: p.new_price || p.newprice,
      old_price: p.old_price || p.oldprice,
      newprice: p.newprice || p.new_price,
      oldprice: p.oldprice || p.old_price,
      description: p.description,
      sizes: p.sizes?.length ? p.sizes : ['S', 'M', 'L', 'XL', 'XXL'],
      rating: p.rating || 4,
      reviews: p.reviews || 122,
      tags: p.tags?.length ? p.tags : ['Modern', 'Latest'],
      sku: p.sku || p._id.toString(),
      available: p.available !== false,
    };
    res.json({ success: true, product: formatted });
  } catch (err) {
    console.error('❌ Error fetching product:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});
app.get('/products/:category', async (req, res) => {
  try {
    const category = req.params.category;
    const products = await Product.find({ category: { $regex: new RegExp(category, 'i') } });
    const formatted = products.map((p) => ({
      id: p.id || p._id.toString(),
      _id: p._id.toString(),
      name: p.name || p.title,
      title: p.title || p.name,
      image: p.image,
      images: p.images?.length ? p.images : [p.image || ''],
      category: p.category,
      new_price: p.new_price || p.newprice,
      old_price: p.old_price || p.oldprice,
      newprice: p.newprice || p.new_price,
      oldprice: p.oldprice || p.old_price,
      description: p.description,
      sizes: p.sizes?.length ? p.sizes : ['S', 'M', 'L', 'XL', 'XXL'],
      rating: p.rating || 4,
      reviews: p.reviews || 122,
      tags: p.tags?.length ? p.tags : ['Modern', 'Latest'],
      sku: p.sku || p._id.toString(),
      available: p.available !== false,
    }));
    res.json({ success: true, products: formatted, category });
  } catch (err) {
    console.error('❌ Error fetching products by category:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch products by category' });
  }
});
app.post('/removeproduct', fetchUser, requireAdmin, logAdminActivity('remove_product'), async (req, res) => {
  try {
    const { _id } = req.body;
    if (!_id) return res.status(400).json({ success: false, error: 'Missing _id parameter' });
    const product = await Product.findById(_id);
    if (!product) return res.status(404).json({ success: false, error: 'Product not found' });
    await Product.deleteOne({ _id });
    
    // Send notification to all admins
    await sendAdminNotification(`Product removed: ${product.name}`, 'warning');
    
    res.json({
      success: true,
      message: 'Product removed successfully',
      deletedProduct: { _id: product._id, name: product.name },
    });
  } catch (err) {
    console.error('❌ Error removing product:', err);
    res.status(500).json({ success: false, error: err.message, message: 'Failed to remove product' });
  }
});
// Update product
app.put('/updateproduct', fetchUser, requireAdmin, logAdminActivity('update_product'), async (req, res) => {
  try {
    const { _id, name, title, category, new_price, old_price, description, sizes, available } = req.body;
    if (!_id) {
      return res.status(400).json({ success: false, error: 'Product ID is required' });
    }
    const product = await Product.findById(_id);
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    // Update product fields
    if (name) product.name = name;
    if (title) product.title = title;
    if (category) product.category = category;
    if (new_price !== undefined) {
      product.new_price = new_price;
      product.newprice = new_price;
    }
    if (old_price !== undefined) {
      product.old_price = old_price;
      product.oldprice = old_price;
    }
    if (description) product.description = description;
    if (sizes && Array.isArray(sizes)) product.sizes = sizes;
    if (available !== undefined) product.available = available;
    await product.save();
    
    // Send notification to all admins
    await sendAdminNotification(`Product updated: ${product.name}`, 'info');
    
    res.json({
      success: true,
      message: 'Product updated successfully',
      product
    });
  } catch (err) {
    console.error('❌ Error updating product:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});
// =============================================================================
// AUTH
// =============================================================================
app.post('/signup', validateCaptcha, async (req, res) => {
  try {
    const { name, email = '', password = '', fullName, phone, address, governorate } = req.body;
    const normEmail = email.toLowerCase().trim();
    if (!fullName || !normEmail || !password) {
      return res.status(400).json({
        success: false,
        error: 'fullName, email, and password are required',
      });
    }
    const existing = await Users.findOne({ email: normEmail });
    if (existing) {
      return res.status(400).json({ success: false, error: 'Email already registered' });
     }
    const user = await Users.create({
      name,
      email: normEmail,
      password,
      fullName,
      phone,
      address,
      governorate,
      cartData: {},
    });
    const token = jwt.sign({ user: { id: user.id, role: user.role } }, JWT_SECRET, {
      expiresIn: JWT_ACCESS_TTL,
    });
    const refreshToken = jwt.sign({ user: { id: user.id, role: user.role } }, JWT_REFRESH_SECRET, {
      expiresIn: JWT_REFRESH_TTL,
    });
    
    
    // Store refresh token
    user.refreshTokens = [{ token: refreshToken }];
    await user.save();
    
    // Send registration confirmation email
    const registrationData = {
      customerName: user.fullName,
      customerEmail: user.email,
      loginLink: `https://yourstore.com/login?token=${token}`
    };
    sendEmail(user.email, 'registration', registrationData)
      .then(result => {
        if (!result.success) {
          console.error('Failed to send registration email:', result.error);
        }
      });
    
    res.json({
      success: true,
      token,
      refreshToken,
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
    });
  } catch (e) {
    console.error('❌ Signup error:', e);
    if (e.code === 11000) {
      return res.status(400).json({ success: false, error: 'Email already registered' });
    }
    res.status(500).json({ success: false, error: e.message });
  }
});
app.post('/login', validateCaptcha, async (req, res) => {
  try {
    const { email = '', password = '' } = req.body;
    const normEmail = email.toLowerCase().trim();
    const user = await Users.findOne({ email: normEmail, isActive: true }).select('+password');
    
    if (!user) {
      // Record failed login attempt for security
      await failedLogin(normEmail);
      return res.status(401).json({ success: false, error: 'Wrong Email ID' });
    }
    
    // Check if account is locked
    if (isLocked(user)) {
      return res.status(403).json({
        success: false,
        error: 'Account locked due to too many failed login attempts. Please try again later.'
      });
    }    
    
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      // Record failed login attempt
      await failedLogin(normEmail);
      return res.status(401).json({ success: false, error: 'Wrong Password' });
    }
    
    // Reset login attempts on successful login
    await resetLoginAttempts(normEmail);
    
    // Update last login
    user.lastLogin = new Date();
    await user.save();
    
    const token = jwt.sign({ user: { id: user._id.toString(), role: user.role } }, JWT_SECRET, {
      expiresIn: JWT_ACCESS_TTL,
    });
    const refreshToken = jwt.sign({ user: { id: user._id.toString(), role: user.role } }, JWT_REFRESH_SECRET, {
      expiresIn: JWT_REFRESH_TTL,
    });
    
    // Store refresh token
    user.refreshTokens = [{ token: refreshToken }];
    await user.save();
    
    res.json({
      success: true,
      token,
      refreshToken,
      role: user.role,
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
    });
  } catch (e) {
    console.error('❌ Login error:', e);
    res.status(500).json({ success: false, error: e.message || 'Server error occurred' });
  }
});
// Refresh token endpoint
// Refresh token endpoint
// Refresh token endpoint
app.post('/refresh-token', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(401).json({ success: false, error: 'Refresh token is required' });
    }
    
    // Verify refresh token
    const data = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    const user = await Users.findById(data.user.id).select('+refreshTokens');
    
    if (!user || !user.isActive) {
      return res.status(403).json({ success: false, error: 'User not found or inactive' });
    }
    
    // Check if refresh token exists in user's refresh tokens array
    const tokenExists = user.refreshTokens.some(t => t.token === refreshToken);
    if (!tokenExists) {
      return res.status(403).json({ success: false, error: 'Invalid refresh token' });
    }
    
    // Generate new access token
    const newToken = jwt.sign({ user: { id: user._id.toString(), role: user.role } }, JWT_SECRET, {
      expiresIn: JWT_ACCESS_TTL,
    });
    
    // Generate new refresh token
    const newRefreshToken = jwt.sign({ user: { id: user._id.toString(), role: user.role } }, JWT_REFRESH_SECRET, {
      expiresIn: JWT_REFRESH_TTL,
    });
    
    // Update user's refresh tokens
    user.refreshTokens = user.refreshTokens.filter(t => t.token !== refreshToken);
    user.refreshTokens.push({ token: newRefreshToken });
    await user.save();
    
    res.json({
      success: true,
      token: newToken,
      refreshToken: newRefreshToken,
      message: 'Token refreshed successfully'
    });
  } catch (error) {
    console.error('❌ Refresh token error:', error);
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        error: 'Refresh token expired, please login again',
        code: 'REFRESH_TOKEN_EXPIRED'
      });
    }
    res.status(401).json({ success: false, error: 'Invalid refresh token' });
  }
});
// Logout endpoint
app.post('/logout', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ success: false, error: 'Refresh token is required' });
    }
    
    // Remove refresh token from user's tokens array
    const user = await Users.findOne({ 'refreshTokens.token': refreshToken });
    if (user) {
      user.refreshTokens = user.refreshTokens.filter(t => t.token !== refreshToken);
      await user.save();
    }
    
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    console.error('❌ Logout error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});
// Google OAuth routes
app.get('/auth/google', (req, res, next) => {
  const redirectUrl =
    req.query.redirect ||
    `${process.env.CLIENT_URL || 'http://localhost:3000'}/login`;
  req.session.redirectUrl = redirectUrl;
  passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
});
app.get(
  '/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login?error=authentication_failed' }),
  (req, res) => {
    try {
      const token = jwt.sign(
        { user: { id: req.user._id, role: req.user.role } },
        JWT_SECRET,
        { expiresIn: JWT_ACCESS_TTL }
      );
      const refreshToken = jwt.sign(
        { user: { id: req.user._id, role: req.user.role } },
        JWT_REFRESH_SECRET,
        { expiresIn: JWT_REFRESH_TTL }
      );
      
      // Store refresh token
      req.user.refreshTokens = [{ token: refreshToken }];
      req.user.save();
      
      const redirectUrl =
        req.session.redirectUrl ||
        `${process.env.CLIENT_URL || 'http://localhost:3000'}/login`;
      delete req.session.redirectUrl;
      res.redirect(`${redirectUrl}?token=${token}&refreshToken=${refreshToken}&success=true`);
    } catch (error) {
      console.error('OAuth callback error:', error);
      const redirectUrl =
        req.session.redirectUrl ||
        `${process.env.CLIENT_URL || 'http://localhost:3000'}/login`;
      res.redirect(`${redirectUrl}?error=token_generation_failed`);
    }
  }
);
// =============================================================================
// ENHANCED CART
// =============================================================================
// في ملف الخادم (server.js أو index.js)

// إضافة نقطة نهاية لتحديث كمية المنتج في السلة
// دالة جديدة لتحديث كمية المنتج مباشرة
const updateCartQuantity = async (itemId, size, newQuantity) => {
  const token = localStorage.getItem("auth-token");
  if (!token) {
    return { success: false, message: "Please login first" };
  }
  
  // تعريف المتغيرات قبل try block لتكون متاحة في catch block
  let productIdToSend;
  let currentQuantity;
  
  try {
    // Find the product to ensure we have the correct ID format
    const product = all_product.find(p => 
      String(p.id) === String(itemId) || 
      String(p._id) === String(itemId)
    );
    if (!product) {
      console.error('❌ Product not found for update:', { itemId });
      return { success: false, message: "Product not found" };
    }
    
    productIdToSend = product.id || product._id;
    
    // الحصول على الكمية الحالية
    currentQuantity = cartItems[productIdToSend]?.[size] || 0;
    
    // إذا كانت الكمية الجديدة هي نفس الحالية، لا تفعل شيئاً
    if (newQuantity === currentQuantity) {
      return { success: true, message: "No change in quantity" };
    }
    
    console.log('🔄 Updating cart quantity:', { 
      productId: productIdToSend,
      size,
      currentQuantity,
      newQuantity
    });
    
    // تحديث واجهة المستخدم أولاً
    setCartItems(prev => {
      const newCart = { ...prev };
      const key = String(productIdToSend);
      
      if (!newCart[key]) newCart[key] = {};
      
      if (newQuantity <= 0) {
        delete newCart[key][size];
        if (Object.keys(newCart[key]).length === 0) {
          delete newCart[key];
        }
      } else {
        newCart[key][size] = newQuantity;
      }
      
      return newCart;
    });
    
    // إشعار فوري بالتحديث
    setCartUpdated(prev => prev + 1);
    
    // حساب الفرق
    const difference = newQuantity - currentQuantity;
    
    // إعداد البيانات للإرسال
    const requestBody = {
      itemId: productIdToSend,
      productId: productIdToSend,
      quantity: difference,
      size: size,
      paymentMethod: 'cash' // غير مهم عند التحديث
    };
    
    console.log('📡 Sending update request to server:', requestBody);
    
    // محاولة إرسال الطلب إلى الخادم
    let response;
    try {
      response = await fetch(`${API_BASE}/addtocart`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "auth-token": token,
        },
        body: JSON.stringify(requestBody),
      });
    } catch (networkError) {
      console.error('❌ Network error:', networkError);
      throw new Error('Network error. Please check your connection.');
    }
    
    // التعامل مع استجابة الخادم
    let data;
    try {
      data = await response.json();
    } catch (parseError) {
      console.error('❌ Error parsing response:', parseError);
      throw new Error('Invalid server response.');
    }
    
    console.log('📨 Server response:', data);
    
    // إذا كان التوكن منتهي الصلاحية، حاول تجديده
    if (response.status === 401 && (data.code === 'TOKEN_EXPIRED' || data.error?.includes('Token expired'))) {
      console.log('🔄 Token expired, attempting to refresh...');
      const refreshSuccess = await refreshToken();
      
      if (refreshSuccess) {
        console.log('✅ Token refreshed successfully, retrying request...');
        const newToken = localStorage.getItem("auth-token");
        
        // إعادة المحاولة مع التوكن الجديد
        response = await fetch(`${API_BASE}/addtocart`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "auth-token": newToken,
          },
          body: JSON.stringify(requestBody),
        });
        
        data = await response.json();
        console.log('📨 Server response after token refresh:', data);
      } else {
        console.log('❌ Failed to refresh token');
        setIsTokenExpired(true);
        throw new Error('Session expired. Please login again.');
      }
    }
    
    if (!data.success) {
      console.error('❌ Server error:', data.error, data.debug);
      
      // إذا فشل الطلب، نرجع الحالة إلى ما كانت عليه
      setCartItems(prev => {
        const newCart = { ...prev };
        const key = String(productIdToSend);
        
        if (newCart[key]) {
          newCart[key][size] = currentQuantity;
        }
        
        return newCart;
      });
      
      setCartUpdated(prev => prev + 1);
      
      return { 
        success: false, 
        message: data.error || "Failed to update quantity",
        debug: data.debug
      };
    }
    
    // تحديث السلة بالبيانات من الخادم إذا كانت متوفرة
    if (data.cartData) {
      const normalizedCart = normalizeCartData(data.cartData, all_product);
      setCartItems(normalizedCart);
    }
    
    // تحديث بيانات الطلبات
    const ordersData = await fetchOrdersData();
    setOrders(ordersData);
    
    setCartUpdated(prev => prev + 1);
    
    console.log('✅ Quantity updated successfully:', data.productInfo);
    
    return { 
      success: true, 
      message: "Quantity updated successfully!",
      productInfo: data.productInfo
    };
  } catch (error) {
    console.error("❌ Update quantity error:", error);
    
    // استعادة الحالة الأصلية عند الخطأ
    setCartItems(prev => {
      const newCart = { ...prev };
      const key = String(productIdToSend);
      
      if (newCart[key]) {
        newCart[key][size] = currentQuantity;
      }
      
      return newCart;
    });
    
    setCartUpdated(prev => prev + 1);
    
    return { success: false, message: error.message || "Network error. Please try again." };
  }
};
app.post('/updatecartquantity', fetchUser, async (req, res) => {
  try {
    const { itemId, size, quantity } = req.body;
    
    if (!itemId || size === undefined || quantity === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    // البحث عن المستخدم
    const user = await Users.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // البحث عن المنتج
    let product = await Product.findOne({ id: parseInt(itemId) });
    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    // التحقق من صحة الكمية
    const currentQuantity = user.cartData[itemId]?.[size] || 0;
    const newQuantity = currentQuantity + quantity;

    if (newQuantity < 0) {
      return res.status(400).json({
        success: false,
        error: 'Quantity cannot be negative'
      });
    }

    // تحديث بيانات السلة
    if (!user.cartData[itemId]) {
      user.cartData[itemId] = {};
    }

    user.cartData[itemId][size] = newQuantity;

    // إذا أصبحت الكمية صفر، احذف العنصر
    if (newQuantity <= 0) {
      delete user.cartData[itemId][size];
      
      // إذا لم يكن هناك مقاسات أخرى للمنتج، احذف المنتج
      if (Object.keys(user.cartData[itemId]).length === 0) {
        delete user.cartData[itemId];
      }
    }

    user.markModified('cartData');
    await user.save();

    // تحديث الطلب إذا لزم الأمر
    const order = await Order.findOne({
      userId: user._id,
      status: 'pending'
    });

    if (order) {
      const existingItemIndex = order.items.findIndex(
        item => item.productId === parseInt(itemId) && item.size === size
      );

      if (existingItemIndex >= 0) {
        if (newQuantity <= 0) {
          // حذف العنصر من الطلب
          order.items.splice(existingItemIndex, 1);
        } else {
          // تحديث كمية العنصر
          order.items[existingItemIndex].quantity = newQuantity;
          order.items[existingItemIndex].itemTotal = (product.new_price || product.newprice) * newQuantity;
        }
      } else if (newQuantity > 0) {
        // إضافة عنصر جديد إلى الطلب
        order.items.push({
          productId: parseInt(itemId),
          productName: product.name,
          productImage: product.image,
          quantity: newQuantity,
          price: product.new_price || product.newprice,
          size: size,
          itemTotal: (product.new_price || product.newprice) * newQuantity,
          status: 'in_cart'
        });
      }

      // إعادة حساب المبلغ الإجمالي
      order.total = order.items.reduce((sum, item) => sum + item.itemTotal, 0);

      // إذا لم يكن هناك عناصر، ألغِ الطلب
      if (order.items.length === 0) {
        order.status = 'cancelled';
        order.cancelledAt = new Date();
        order.cancellationReason = 'All items removed from cart';
      }

      await order.save();
      await updateRevenue(order, 'update');
    }

    res.json({
      success: true,
      message: 'Cart quantity updated successfully',
      cartData: user.cartData
    });
  } catch (error) {
    console.error('Error updating cart quantity:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});
app.post('/addtocart', fetchUser, async (req, res) => {
  try {
    let itemId = req.body.itemId || req.body.productId;
    const quantity = Number(req.body.quantity ?? 1);
    const size = req.body.size || 'default';
    const paymentMethod = req.body.paymentMethod || 'cash_on_delivery';
    console.log('🛒 Add to cart request:', { itemId, quantity, size, paymentMethod });
    if (isNaN(quantity) || quantity === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid quantity',
      });
    }
    if (!size || size === 'default') {
      return res.status(400).json({
        success: false,
        error: 'Size selection is required',
      });
    }
    let productNumericId;
    let productExists;
    if (mongoose.Types.ObjectId.isValid(itemId) && String(itemId).length === 24) {
      productExists = await Product.findById(itemId);
      if (productExists) {
        productNumericId = productExists.id;
      }
    } else {
      productNumericId = parseInt(itemId);
      if (!isNaN(productNumericId)) {
        productExists = await Product.findOne({ id: productNumericId });
      }
      if (!productExists) {
        productExists = await Product.findOne({
          $or: [
            { id: itemId },
            { id: String(itemId) },
            { _id: itemId }
          ]
        });
        if (productExists) {
          productNumericId = productExists.id;
        }
      }
    }
    if (!productExists || !productNumericId) {
      return res.status(404).json({
        success: false,
        error: 'Product not found',
      });
    }
    const availableSizes = productExists.sizes?.length
      ? productExists.sizes
      : ['S', 'M', 'L', 'XL', 'XXL'];
    if (!availableSizes.includes(size)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid size selected',
        availableSizes
      });
    }
    const user = await Users.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }
    if (!user.cartData) user.cartData = {};
    const productKey = String(productNumericId);
    if (!user.cartData[productKey]) user.cartData[productKey] = {};
    if (!user.cartData[productKey][size]) user.cartData[productKey][size] = 0;
    const oldQuantity = user.cartData[productKey][size];
    user.cartData[productKey][size] += quantity;
    if (user.cartData[productKey][size] <= 0) {
      delete user.cartData[productKey][size];
    }
    if (Object.keys(user.cartData[productKey]).length === 0) {
      delete user.cartData[productKey];
    }
    if (!user.fullName) user.fullName = 'Unknown User';
    user.markModified('cartData');
    await user.save();
    // Create or update order when adding to cart
    await createOrUpdateOrder(user, productExists, quantity, size, paymentMethod, 'add');
    const newQuantity = user.cartData[productKey]?.[size] || 0;
    console.log(`✅ Cart updated for ${user.email}:`, {
      productId: productNumericId,
      size,
      oldQuantity,
      newQuantity
    });
    res.json({
      success: true,
      message: quantity > 0
        ? 'Product added to cart and order created'
        : 'Product removed from cart and order updated',
      cartData: user.cartData,
    });
  } catch (error) {
    console.error('❌ Error in addtocart:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});
app.get('/getcartdata', fetchUser, async (req, res) => {
  try {
    const user = await Users.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }
    const cleanedCartData = {};
    const cartData = user.cartData || {};
    for (const [productId, data] of Object.entries(cartData)) {
      if (typeof data === 'object' && data !== null) {
        const cleanedSizes = {};
        for (const [size, quantity] of Object.entries(data)) {
          if (Number(quantity) > 0) {
            cleanedSizes[size] = Number(quantity);
          }
        }
        if (Object.keys(cleanedSizes).length > 0) {
          cleanedCartData[productId] = cleanedSizes;
        }
      } else if (typeof data === 'number' && data > 0) {
        cleanedCartData[productId] = { default: Number(data) };
      }
    }
    if (JSON.stringify(cleanedCartData) !== JSON.stringify(cartData)) {
      user.cartData = cleanedCartData;
      user.markModified('cartData');
      await user.save();
    }
    res.json({
      success: true,
      cartData: cleanedCartData,
      totalItems: Object.values(cleanedCartData).reduce((total, sizes) => {
        return (
          total + Object.values(sizes).reduce((sum, qty) => sum + Number(qty || 0), 0)
        );
      }, 0),
    });
  } catch (error) {
    console.error('❌ Get cart data error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});
app.get('/cart', (req, res, next) => {
  req.url = '/getcartdata';
  next();
});
app.post('/clearcart', fetchUser, async (req, res) => {
  try {
    const user = await Users.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }
    const itemsCount = Object.keys(user.cartData || {}).length;
    // Cancel pending order when clearing cart
    const pendingOrder = await Order.findOne({ userId: user._id, status: 'pending' });
    if (pendingOrder) {
      pendingOrder.status = 'cancelled';
      pendingOrder.cancelledAt = new Date();
      pendingOrder.cancellationReason = 'Cart cleared by user';
      await pendingOrder.save();
      await updateRevenue(pendingOrder, 'update');
    }
    user.cartData = {};
    user.markModified('cartData');
    await user.save();
    console.log(`🧽 Cart cleared for ${user.email}, removed ${itemsCount} products`);
    res.json({
      success: true,
      message: `Cart cleared successfully. ${itemsCount} items removed.`,
      cartData: {},
    });
  } catch (error) {
    console.error('❌ Clear cart error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});
app.get('/cartdetails', fetchUser, async (req, res) => {
  try {
    const user = await Users.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }
    const cartData = user.cartData || {};
    const cartDetails = [];
    let totalAmount = 0;
    let totalItems = 0;
    for (const [productId, data] of Object.entries(cartData)) {
      const product = await Product.findOne({ id: parseInt(productId) });
      if (!product) continue;
      if (typeof data === 'number' && data > 0) {
        const price = product.new_price || product.newprice || 0;
        const itemTotal = price * data;
        cartDetails.push({
          product: {
            id: product.id,
            name: product.name,
            image: product.image,
            category: product.category,
            new_price: product.new_price || product.newprice,
            old_price: product.old_price || product.oldprice,
          },
          quantity: data,
          size: 'N/A',
          itemTotal,
          key: `${productId}-default`,
        });
        totalAmount += itemTotal;
        totalItems += data;
      } else if (typeof data === 'object' && data !== null) {
        for (const [size, qty] of Object.entries(data)) {
          if (qty > 0) {
            const price = product.new_price || product.newprice || 0;
            const itemTotal = price * qty;
            cartDetails.push({
              product: {
                id: product.id,
                name: product.name,
                image: product.image,
                category: product.category,
                new_price: product.new_price || product.newprice,
                old_price: product.old_price || product.oldprice,
              },
              quantity: qty,
              size: size,
              itemTotal,
              key: `${productId}-${size}`,
            });
            totalAmount += itemTotal;
            totalItems += qty;
          }
        }
      }
    }
    res.json({
      success: true,
      cartDetails: cartDetails.sort((a, b) => a.product.name.localeCompare(b.product.name)),
      summary: {
        totalItems,
        totalAmount: Math.round(totalAmount * 100) / 100,
        itemsCount: cartDetails.length,
      },
    });
  } catch (error) {
    console.error('❌ Get cart details error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});
// =============================================================================
// CHECKOUT API
// =============================================================================
app.post('/checkout', fetchUser, async (req, res) => {
  try {
    const { address, phone, paymentMethod, transactionId } = req.body;
    
    // التحقق من صحة البيانات المدخلة
    if (!address || !phone || !paymentMethod) {
      return res.status(400).json({
        success: false,
        error: 'يرجى توفير جميع البيانات المطلوبة: address, phone, paymentMethod'
      });
    }
    
    // التحقق من صحة طريقة الدفع
    if (!['cash_on_delivery', 'bank_transfer', 'stripe', 'paypal'].includes(paymentMethod)) {
      return res.status(400).json({
        success: false,
        error: 'طريقة الدفع غير صالحة. يرجى اختيار "دفع عند الاستلام" أو "تحويل بنكي" أو "Stripe" أو "PayPal"'
      });
    }
    
    // الحصول على بيانات المستخدم
    const user = await Users.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'المستخدم غير موجود'
      });
    }
    
    // التحقق من وجود عناصر في السلة
    if (!user.cartData || Object.keys(user.cartData).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'السلة فارغة'
      });
    }
    
    // تحديث عناصر السلة وتغيير حالتها إلى "checkedout"
    const updatedItems = [];
    let totalAmount = 0;
    
    for (const [productId, sizes] of Object.entries(user.cartData)) {
      // البحث عن معلومات المنتج
      const product = await Product.findOne({ id: parseInt(productId) });
      if (!product) continue;
      
      // معالجة كل مقاس للمنتج
      for (const [size, quantity] of Object.entries(sizes)) {
        if (quantity > 0) {
          const price = product.new_price || product.newprice || 0;
          const itemTotal = price * quantity;
          
          // إضافة العنصر المحدث إلى القائمة
          updatedItems.push({
            productId: parseInt(productId),
            productName: product.name,
            productImage: product.image,
            quantity: quantity,
            price: price,
            size: size,
            itemTotal: itemTotal,
            status: 'checkedout', // تغيير الحالة إلى checkedout
          });
          
          totalAmount += itemTotal;
        }
      }
    }
    
    // تحديث بيانات المستخدم
    user.cartData = {};
    user.markModified('cartData');
    await user.save();
    
    // إنشاء أو تحديث الطلب
    let order = await Order.findOne({
      userId: user._id,
      status: 'pending'
    });
    
    if (order) {
      // تحديث الطلب الموجود
      order.items = updatedItems;
      order.total = totalAmount;
      order.customerInfo = {
        fullName: user.fullName || 'Unknown User',
        email: user.email,
        phone: phone,
        address: address.address || address,
        governorate: address.governorate || 'غير محدد'
      };
      order.paymentMethod = paymentMethod;
      order.paymentStatus = 'pending';
      order.transactionId = transactionId;
      await order.save();
      
      // تحديث الإيرادات
      await updateRevenue(order, 'update');
    } else {
      // إنشاء طلب جديد
      // Generate a unique order ID before creating the order
      const count = await Order.countDocuments();
      const orderId = `ORD${String(count + 1).padStart(6, '0')}`;
      
      order = new Order({
        orderId: orderId, // Set the orderId explicitly
        userId: user._id,
        customerInfo: {
          fullName: user.fullName || 'Unknown User',
          email: user.email,
          phone: phone,
          address: address.address || address,
          governorate: address.governorate || 'غير محدد'
        },
        items: updatedItems,
        total: totalAmount,
        status: 'pending',
        paymentMethod: paymentMethod,
        paymentStatus: 'pending',
        transactionId: transactionId
      });
      
      await order.save();
      
      // تحديث الإيرادات
      await updateRevenue(order, 'add');
    }
    
    // Send order confirmation email
    const orderConfirmationData = {
      customerName: user.fullName,
      customerEmail: user.email,
      orderNumber: order.orderId,
      totalPrice: order.total,
      deliveryDate: order.deliveredAt ? order.deliveredAt.toDateString() : 'To be determined',
      productList: order.items.map(item => 
        `<tr><td>${item.productName}</td><td>${item.quantity}</td><td>$${item.price}</td></tr>`
      ).join('')
    };
    sendEmail(user.email, 'orderConfirmation', orderConfirmationData)
      .then(result => {
        if (!result.success) {
          console.error('Failed to send order confirmation email:', result.error);
        }
      });
    
    // Send payment notification
    await sendPaymentNotification(
      user._id,
      'order_processed',
      `Your order #${order.orderId} has been processed successfully. Payment method: ${paymentMethod === 'cash_on_delivery' ? 'Cash on Delivery' : paymentMethod === 'bank_transfer' ? 'Bank Transfer' : paymentMethod}.`,
      order.orderId
    );
    
    res.json({
      success: true,
      message: 'تمت عملية الدفع بنجاح! تم تغيير حالة العناصر إلى مدفوع',
      order: {
        id: order._id,
        orderId: order.orderId,
        total: order.total,
        items: updatedItems.length,
        status: order.status,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus
      },
      updatedItems: updatedItems
    });
  } catch (error) {
    console.error('❌ Checkout error:', error);
    res.status(500).json({
      success: false,
      error: 'خطأ في معالجة الدفع',
      details: error.message
    });
  }
});
// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================
async function generateOrderId() {
  try {
    const count = await Order.countDocuments();
    return `ORD${String(count + 1).padStart(6, '0')}`;
  } catch (error) {
    console.error('Error generating order ID:', error);
    // Fallback to timestamp-based ID
    return `ORD${Date.now()}`;
  }
}
// =============================================================================
// ORDERS
// =============================================================================
app.post('/createorder', fetchUser, async (req, res) => {
  try {
    const { shippingAddress, paymentMethod, notes } = req.body;
    // Find existing pending order
    const existingOrder = await Order.findOne({
      userId: req.user.id,
      status: 'pending'
    });
    if (!existingOrder) {
      return res.status(400).json({
        success: false,
        error: 'No pending order found. Please add items to cart first.'
      });
    }
    // Update order with shipping info and confirm it
    if (shippingAddress) {
      existingOrder.customerInfo.address = shippingAddress.address || existingOrder.customerInfo.address;
      existingOrder.customerInfo.phone = shippingAddress.phone || existingOrder.customerInfo.phone;
      existingOrder.customerInfo.governorate = shippingAddress.governorate || existingOrder.customerInfo.governorate;
    }
    existingOrder.paymentMethod = paymentMethod || existingOrder.paymentMethod;
    existingOrder.notes = notes || '';
    existingOrder.status = 'processing'; // Move from pending to processing
    await existingOrder.save();
    // Clear user cart after order confirmation
    await Users.findByIdAndUpdate(req.user.id, { cartData: {} });
    // Update revenue analytics
    await updateRevenue(existingOrder, 'update');
    console.log(`✅ Order confirmed: ${existingOrder.orderId}`);
    res.json({
      success: true,
      message: 'Order confirmed successfully',
      order: {
        id: existingOrder._id,
        orderId: existingOrder.orderId,
        total: existingOrder.total,
        items: existingOrder.items.length,
        status: existingOrder.status,
      },
    });
  } catch (error) {
    console.error('❌ Create order error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});
// Get user orders
app.get('/myorders', fetchUser, async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .lean();
    const formattedOrders = orders.map(order => ({
      id: order._id,
      orderId: order.orderId,
      items: order.items,
      total: order.total,
      status: order.status,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      orderDate: order.createdAt,
      deliveredAt: order.deliveredAt,
      cancelledAt: order.cancelledAt,
      trackingNumber: order.trackingNumber,
      notes: order.notes
    }));
    res.json({
      success: true,
      orders: formattedOrders
    });
  } catch (error) {
    console.error('❌ Get user orders error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});
// =============================================================================
// PASSWORD RESET ENDPOINTS
// =============================================================================
app.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }

    const user = await Users.findOne({ email: email.toLowerCase() });
    if (!user) {
      // Don't reveal that the user doesn't exist
      return res.status(200).json({ 
        success: true, 
        message: 'If your email is registered, you will receive a password reset link.' 
      });
    }

    // Generate a reset token
    const resetToken = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '1h' });
    const resetLink = `https://yourstore.com/reset-password?token=${resetToken}`;

    // Save the reset token to the user document
    user.resetToken = resetToken;
    user.resetTokenExpiry = Date.now() + 3600000; // 1 hour
    await user.save();

    // Send password reset email
    const resetData = {
      customerName: user.fullName,
      customerEmail: user.email,
      resetLink: resetLink
    };
    sendEmail(user.email, 'passwordReset', resetData)
      .then(result => {
        if (!result.success) {
          console.error('Failed to send password reset email:', result.error);
        }
      });

    res.status(200).json({ 
      success: true, 
      message: 'If your email is registered, you will receive a password reset link.' 
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

app.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ 
        success: false, 
        error: 'Token and new password are required' 
      });
    }

    // Verify the token
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await Users.findOne({ 
      _id: decoded.userId, 
      resetToken: token,
      resetTokenExpiry: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid or expired token' 
      });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    user.password = hashedPassword;
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;
    await user.save();

    res.status(200).json({ 
      success: true, 
      message: 'Password has been reset successfully' 
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});
// =============================================================================
// HOME SECTIONS
// =============================================================================
router.get('/newcollections', async (req, res) => {
  try {
    const products = await Product.find({}).sort({ date: -1, createdAt: -1 }).limit(8).lean();
    const normalized = products.map((p) => ({
      id: p.id || p._id.toString(),
      _id: p._id.toString(),
      name: p.name || p.title,
      image: p.image,
      category: p.category,
      newprice: p.newprice || p.new_price,
      oldprice: p.oldprice || p.old_price,
    }));
    res.json(normalized);
  } catch (e) {
    console.error('❌ New collections error:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});
app.get('/popularinwomen', async (req, res) => {
  try {
    const products = await Product.find({ category: 'women' }).limit(4).lean();
    const normalized = products.map((p) => ({
      id: p.id || p._id.toString(),
      _id: p._id.toString(),
      name: p.name || p.title,
      image: p.image,
      category: p.category,
      newprice: p.newprice || p.new_price,
      oldprice: p.oldprice || p.old_price,
    }));
    res.json(normalized);
  } catch (e) {
    console.error('❌ Popular women error:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});
// Get hero section data for frontend
app.get('/hero', async (req, res) => {
  try {
    const heroSection = await HeroSection.findOne({ isActive: true });
    if (!heroSection) {
      return res.status(404).json({ success: false, error: 'Hero section not found' });
    }
    res.json({
      success: true,
      heroSection
    });
  } catch (err) {
    console.error('Get hero section error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});
// =============================================================================
// ERROR HANDLING
// =============================================================================
app.use((req, res, next) => {
  if (req.path === '/' || req.path.startsWith('/images/') || req.path.startsWith('/debug/')) return next();
  if (res.headersSent) return next();
  res.status(404).json({ success: false, error: 'Endpoint not found' });
});
app.use((err, req, res, next) => {
  console.error('💥 Unhandled Error:', err);
  if (res.headersSent) return next(err);
  
  // Don't leak error details in production
  const message = process.env.NODE_ENV === 'production' 
    ? 'Something went wrong' 
    : err.message;
    
  res.status(500).json({ 
    success: false, 
    error: message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});
// =============================================================================
// START
// =============================================================================
app.listen(port, () => {
  console.log(`\n🚀 Enhanced E-commerce Server running on http://localhost:${port}`);
  console.log(`📱 API Base URL: http://localhost:${port}`);
  console.log(`🔗 New Features:`);
  console.log(` - Real-time order tracking from cart to delivery`);
  console.log(` - Advanced revenue analytics (daily/monthly/yearly)`);
  console.log(` - Order status management (pending/delivered/cancelled)`);
  console.log(` - Real user data display in admin panel`);
  console.log(` - Cart-to-order automatic synchronization`);
  console.log(` - Google OAuth authentication`);
  console.log(` - Hero section management`);
  console.log(` - Staff management`);
  console.log(` - Debug endpoints for troubleshooting`);
  console.log(` - Checkout API to change cart items status to checkedout`);
  console.log(` - Admin endpoints showing only checkedout items`);
  console.log(` - Improved token handling with refresh mechanism`);
  console.log(` - Revenue calculation only for delivered orders`);
  console.log(` - CSRF protection`);
  console.log(` - XSS protection`);
  console.log(` - CAPTCHA system`);
  console.log(` - Enhanced security headers`);
  console.log(` - Brute force protection`);
  console.log(` - Simplified payment options (Cash on Delivery + Bank Transfer)`);
  console.log(` - Data validation`);
  console.log(` - Payment notifications`);
  console.log(` - Improved user experience`);
  console.log(` - Performance optimizations`);
  console.log(` - Clear error messages`);
  console.log(` - Mobile-friendly interface`);
  console.log(` - HTTPS configuration`);
  console.log(` - Payment gateways (Stripe, PayPal)`);
  console.log(` - Activity logging system`);
  console.log(` - Notification system`);
  console.log(` - Database backup`);
  console.log(` - Query optimization`);
  console.log(` - Email templates system for all communications`);
  console.log(` - Password reset functionality`);
  console.log(`\n✅ Enhanced startup tasks completed.\n`);
});
module.exports = app;