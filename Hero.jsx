import React, { useState, useEffect, useRef } from "react";
import "./Hero.css";
import arrow from "../Assets/arrow-pointing-right_32199.png"; 
import hero from "../Assets/pngwing.com.png";

const Hero = () => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const [bubbles, setBubbles] = useState([]);
  const [particles, setParticles] = useState([]);
  const [gridLines, setGridLines] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const heroRef = useRef(null);
  
  // Check for dark mode preference
  useEffect(() => {
    const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setIsDarkMode(darkModeMediaQuery.matches);
    
    const handleChange = (e) => {
      setIsDarkMode(e.matches);
    };
    
    darkModeMediaQuery.addEventListener('change', handleChange);
    
    return () => {
      darkModeMediaQuery.removeEventListener('change', handleChange);
    };
  }, []);
  
  // Create bubbles
  useEffect(() => {
    const createBubble = () => {
      const size = Math.random() * 30 + 10;
      const bubble = {
        id: Math.random(),
        size,
        left: Math.random() * 100,
        animationDuration: Math.random() * 10 + 10,
        opacity: Math.random() * 0.5 + 0.1,
        delay: Math.random() * 5,
        color: isDarkMode 
          ? `hsla(${Math.random() * 30 + 15}, 100%, 70%, 0.4)`
          : `hsla(${Math.random() * 30 + 15}, 100%, 60%, 0.5)`
      };
      setBubbles(prev => [...prev, bubble]);
      
      // Remove bubble after animation
      setTimeout(() => {
        setBubbles(prev => prev.filter(b => b.id !== bubble.id));
      }, (bubble.animationDuration + bubble.delay) * 1000);
    };
    
    // Create bubbles periodically
    const bubbleInterval = setInterval(createBubble, 800);
    
    return () => clearInterval(bubbleInterval);
  }, [isDarkMode]);
  
  // Create particles
  useEffect(() => {
    const createParticle = () => {
      const size = Math.random() * 6 + 2;
      const particle = {
        id: Math.random(),
        size,
        left: Math.random() * 100,
        top: Math.random() * 100,
        animationDuration: Math.random() * 15 + 10,
        opacity: Math.random() * 0.7 + 0.1,
        delay: Math.random() * 5,
        color: isDarkMode 
          ? `hsla(${Math.random() * 30 + 15}, 100%, 70%, 0.4)`
          : `hsla(${Math.random() * 30 + 15}, 100%, 60%, 0.5)`
      };
      setParticles(prev => [...prev, particle]);
      
      // Remove particle after animation
      setTimeout(() => {
        setParticles(prev => prev.filter(p => p.id !== particle.id));
      }, (particle.animationDuration + particle.delay) * 1000);
    };
    
    // Create particles periodically
    const particleInterval = setInterval(createParticle, 300);
    
    return () => clearInterval(particleInterval);
  }, [isDarkMode]);
  
  // Create grid lines
  useEffect(() => {
    const lines = [];
    for (let i = 0; i < 15; i++) {
      lines.push({
        id: i,
        position: Math.random() * 100,
        length: Math.random() * 30 + 10,
        animationDuration: Math.random() * 10 + 5,
        delay: Math.random() * 5,
        opacity: Math.random() * 0.2 + 0.05
      });
    }
    setGridLines(lines);
  }, []);
  
  // Loading simulation
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);
  
  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);
  
  const calculateGlowPosition = () => {
    if (!heroRef.current) return { x: '50%', y: '50%' };
    
    const rect = heroRef.current.getBoundingClientRect();
    const x = ((mousePosition.x - rect.left) / rect.width) * 100;
    const y = ((mousePosition.y - rect.top) / rect.height) * 100;
    
    return { x: `${x}%`, y: `${y}%` };
  };
  
  if (isLoading) {
    return (
      <div className="hero-loading">
        <div className="loader">
          <div className="loader-circle"></div>
        </div>
      </div>
    );
  }
  
  return (
    <div className={`hero ${isDarkMode ? 'dark-mode' : 'light-mode'}`} ref={heroRef}>
      {/* Enhanced Mouse follow effect */}
      <div 
        className="mouse-follow"
        style={{
          left: mousePosition.x,
          top: mousePosition.y,
          backdropFilter: isDarkMode ? 'blur(50px) brightness(1.2)' : 'blur(40px) brightness(1.3)'
        }}
      ></div>
      
      {/* Background elements */}
      <div className="hero-background">
        <div className="hero-bg-glass"></div>
        <div 
          className="hero-glow-effect" 
          style={{
            background: `radial-gradient(circle at ${calculateGlowPosition().x} ${calculateGlowPosition().y}, ${isDarkMode ? 'rgba(255, 107, 53, 0.3)' : 'rgba(255, 107, 53, 0.2)'} 0%, transparent 70%)`
          }}
        ></div>
        
        {/* Grid lines */}
        <div className="hero-grid">
          {gridLines.map(line => (
            <div
              key={line.id}
              className="grid-line"
              style={{
                top: `${line.position}%`,
                left: `${line.position}%`,
                width: `${line.length}%`,
                height: '1px',
                opacity: line.opacity,
                animation: `pulse ${line.animationDuration}s infinite ${line.delay}s`
              }}
            />
          ))}
        </div>
        
        {/* Floating particles */}
        <div className="hero-particles">
          {particles.map(particle => (
            <div
              key={particle.id}
              className="particle"
              style={{
                width: `${particle.size}px`,
                height: `${particle.size}px`,
                left: `${particle.left}%`,
                top: `${particle.top}%`,
                opacity: particle.opacity,
                background: particle.color,
                animation: `float ${particle.animationDuration}s infinite ${particle.delay}s`,
                backdropFilter: 'blur(2px)'
              }}
            />
          ))}
        </div>
      </div>
      
      {/* Floating bubbles */}
      <div className="hero-bubbles">
        {bubbles.map(bubble => (
          <div
            key={bubble.id}
            className="bubble"
            style={{
              width: `${bubble.size}px`,
              height: `${bubble.size}px`,
              left: `${bubble.left}%`,
              bottom: '-50px',
              opacity: bubble.opacity,
              background: `radial-gradient(circle at 30% 30%, ${bubble.color}, transparent)`,
              animation: `rise ${bubble.animationDuration}s linear ${bubble.delay}s infinite`,
              backdropFilter: 'blur(3px)'
            }}
          />
        ))}
      </div>
      
      {/* Left content */}
      <div className="hero-left">
        <h2 className="subtitle">
          <span className="subtitle-text">NEW ARRIVALS ONLY</span>
          <div className="subtitle-glow"></div>
        </h2>
        <div className="main-title">
          <div className="hand-icon">
            <span className="collections-text">collections</span>
            <span role="img" aria-label="hand" className="hand-emoji">👋</span>
          </div>
          <span className="for-everyone-text">for everyone</span>
        </div>
        <button className="hero-btn">
          <span className="btn-text">Latest Collection</span>
          <img src={arrow} alt="arrow" className="btn-arrow" />
          <div className="btn-ripple"></div>
        </button>
      </div>
      
      {/* Right content with dynamic image */}
      <div className="hero-right">
        <div className="hero-image-container">
          <img 
            src={hero} 
            alt="hero" 
            className="hero-image"
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
            style={{
              transform: isHovering ? 'scale(1.05) rotateY(5deg)' : 'scale(1)',
              filter: isHovering ? `drop-shadow(0 25px 50px ${isDarkMode ? 'rgba(255, 107, 53, 0.4)' : 'rgba(255, 107, 53, 0.3)'})` : `drop-shadow(0 20px 40px ${isDarkMode ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.2)'})`,
              backdropFilter: 'blur(15px)'
            }}
          />
          
          {/* Image overlay */}
          <div className="hero-image-overlay"></div>
          
          {/* Floating badges */}
          <div className="floating-badges">
            <div className="badge new">
              <span>NEW</span>
              <div className="badge-glow"></div>
            </div>
          </div>
          
          {/* Image glow effect */}
          <div className="hero-image-glow"></div>
        </div>
      </div>
    </div>
  );
}

export default Hero;