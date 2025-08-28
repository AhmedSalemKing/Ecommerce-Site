import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import foorer_logo from "../Assets/logo_big.png";
import instagram from "../Assets/instagram_icon.png";
import facebook from "../Assets/facebook_icon.png";
import whatsapp from "../Assets/whatsapp_icon.png";
import "./Footer.css";

const Footer = () => {
    const [particles, setParticles] = useState([]);
    const footerRef = useRef(null);

    // Create floating particles
    useEffect(() => {
        const createParticle = () => {
            if (!footerRef.current) return;
            
            const particle = {
                id: Date.now() + Math.random(),
                x: Math.random() * footerRef.current.offsetWidth,
                y: footerRef.current.offsetHeight + 10,
                size: Math.random() * 3 + 1,
                duration: Math.random() * 3 + 4,
                opacity: Math.random() * 0.4 + 0.1
            };

            setParticles(prev => [...prev, particle]);

            // Remove particle after animation
            setTimeout(() => {
                setParticles(prev => prev.filter(p => p.id !== particle.id));
            }, particle.duration * 1000);
        };

        const particleInterval = setInterval(createParticle, 400);
        return () => clearInterval(particleInterval);
    }, []);

    return (
        <div className="footer" ref={footerRef}>
            {/* Floating particles */}
            {particles.map(particle => (
                <div
                    key={particle.id}
                    className="footer-particle"
                    style={{
                        left: `${particle.x}px`,
                        top: `${particle.y}px`,
                        width: `${particle.size}px`,
                        height: `${particle.size}px`,
                        animationDuration: `${particle.duration}s`,
                        opacity: particle.opacity
                    }}
                />
            ))}
            
            <div className="footer-content">
                <div className="footer-main">
                    <div className="footer-brand">
                        <div className="footer-logo">
                            <img src={foorer_logo} alt="Shopper Logo" />
                            <p>SHOPPER</p>
                        </div>
                        <p className="footer-description">
                            Elevate your shopping experience with our premium products 
                            and exceptional service. We bring quality to your doorstep.
                        </p>
                    </div>

                    <div className="footer-links-grid">
                        <div className="footer-link-section">
                            <h4>Company</h4>
                            <ul>
                                <li><Link to="#">About Us</Link></li>
                                <li><Link to="#">Careers</Link></li>
                                <li><Link to="#">Press</Link></li>
                                <li><Link to="#">Blog</Link></li>
                            </ul>
                        </div>

                        <div className="footer-link-section">
                            <h4>Products</h4>
                            <ul>
                                <li><Link to="#">New Arrivals</Link></li>
                                <li><Link to="#">Best Sellers</Link></li>
                                <li><Link to="#">Sales</Link></li>
                                <li><Link to="#">Accessories</Link></li>
                            </ul>
                        </div>

                        <div className="footer-link-section">
                            <h4>Support</h4>
                            <ul>
                                <li><Link to="#">FAQ</Link></li>
                                <li><Link to="#">Shipping</Link></li>
                                <li><Link to="#">Returns</Link></li>
                                <li><Link to="#">Contact</Link></li>
                            </ul>
                        </div>

                        <div className="footer-link-section">
                            <h4>Stay Connected</h4>
                            <div className="footer-social-icons">
                                <a href="#" className="social-icon">
                                    <img src={instagram} alt="Instagram" />
                                </a>
                                <a href="#" className="social-icon">
                                    <img src={facebook} alt="Facebook" />
                                </a>
                                <a href="#" className="social-icon">
                                    <img src={whatsapp} alt="WhatsApp" />
                                </a>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="footer-bottom">
                    <div className="footer-copyright">
                        <hr />
                        <div className="copyright-content">
                            <p>© 2025 Shopper | All rights reserved — Developed with <span className="heart">♥</span> by Ahmed Salem</p>
                            <div className="legal-links">
                                <Link to="#">Privacy Policy</Link>
                                <Link to="#">Terms of Service</Link>
                                <Link to="#">Cookie Policy</Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Footer;