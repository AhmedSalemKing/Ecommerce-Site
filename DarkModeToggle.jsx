import React, { useState, useRef, useEffect } from 'react';

function DarkModeToggle() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const containerRef = useRef(null);

  // تطبيق التغيير على الصفحة كلها
  useEffect(() => {
    const root = document.documentElement;
    
    if (isDarkMode) {
      // إضافة كلاس الدارك مود
      document.body.classList.add('dark-mode');
      root.classList.add('dark-mode');
      
      // تطبيق الستايلز على العناصر الرئيسية
      document.body.style.backgroundColor = '#1a1a1a';
      document.body.style.color = '#ffffff';
      root.style.backgroundColor = '#1a1a1a';
      root.style.color = '#ffffff';
      
      // تطبيق على الهيدر والنافبار إن وجدوا
      const header = document.querySelector('header');
      const navbar = document.querySelector('nav, .navbar, .header, .top-bar');
      const main = document.querySelector('main');
      
      [header, navbar, main].forEach(element => {
        if (element) {
          element.style.backgroundColor = '#2a2a2a';
          element.style.color = '#ffffff';
          element.style.borderColor = '#404040';
        }
      });
      
      // تطبيق على كل العناصر اللي ممكن تحتاج تغيير
      const allElements = document.querySelectorAll('*');
      allElements.forEach(el => {
        const computedStyle = window.getComputedStyle(el);
        if (computedStyle.backgroundColor === 'rgb(255, 255, 255)' || 
            computedStyle.backgroundColor === 'white' ||
            computedStyle.backgroundColor === 'rgb(248, 249, 250)') {
          el.style.backgroundColor = '#2a2a2a';
        }
        if (computedStyle.color === 'rgb(0, 0, 0)' || 
            computedStyle.color === 'black') {
          el.style.color = '#e5e5e5';
        }
      });
      
    } else {
      // إزالة كلاس الدارك مود
      document.body.classList.remove('dark-mode');
      root.classList.remove('dark-mode');
      
      // إرجاع الألوان الأصلية
      document.body.style.backgroundColor = '#ffffff';
      document.body.style.color = '#000000';
      root.style.backgroundColor = '#ffffff';
      root.style.color = '#000000';
      
      // إرجاع الهيدر والنافبار للألوان الأصلية
      const header = document.querySelector('header');
      const navbar = document.querySelector('nav, .navbar, .header, .top-bar');
      const main = document.querySelector('main');
      
      [header, navbar, main].forEach(element => {
        if (element) {
          element.style.backgroundColor = '';
          element.style.color = '';
          element.style.borderColor = '';
        }
      });
      
      // إرجاع كل العناصر للألوان الأصلية
      const allElements = document.querySelectorAll('*');
      allElements.forEach(el => {
        if (el.style.backgroundColor === 'rgb(42, 42, 42)') {
          el.style.backgroundColor = '';
        }
        if (el.style.color === 'rgb(229, 229, 229)') {
          el.style.color = '';
        }
      });
    }
    
    // إضافة CSS للانتقال السلس
    root.style.transition = 'background-color 0.3s ease, color 0.3s ease';
    document.body.style.transition = 'background-color 0.3s ease, color 0.3s ease';
  }, [isDarkMode]);

  // إغلاق القائمة عند النقر خارجها
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsExpanded(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // أيقونة الشمس
  const SunIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="12" r="4"/>
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 6.34L4.93 4.93M19.07 19.07l-1.41-1.41"/>
    </svg>
  );

  // أيقونة القمر
  const MoonIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
    </svg>
  );

  return (
    <div 
      ref={containerRef}
      style={{
        position: 'fixed',
        top: '50%',
        right: '20px',
        transform: 'translateY(-50%)',
        zIndex: 1000,
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}
    >
      <div 
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          background: isDarkMode 
            ? 'linear-gradient(145deg, #2a2a2a, #1e1e1e)' 
            : 'linear-gradient(145deg, #ffffff, #f0f0f0)',
          borderRadius: '25px',
          padding: '8px',
          boxShadow: isDarkMode
            ? '0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)'
            : '0 8px 32px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.8)',
          border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          minWidth: isExpanded ? '140px' : '50px',
          height: '50px',
          overflow: 'hidden'
        }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* الأيقونة الرئيسية */}
        <div style={{
          width: '34px',
          height: '34px',
          borderRadius: '50%',
          background: isDarkMode 
            ? 'linear-gradient(145deg, #4c1d95, #7c3aed)' 
            : 'linear-gradient(145deg, #3b82f6, #1d4ed8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          flexShrink: 0,
          transition: 'all 0.3s ease',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
        }}>
          {isDarkMode ? <SunIcon /> : <MoonIcon />}
        </div>

        {/* الخيارات */}
        {isExpanded && (
          <div style={{
            display: 'flex',
            marginLeft: '12px',
            gap: '6px'
          }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsDarkMode(false);
                setIsExpanded(false);
              }}
              style={{
                padding: '6px 12px',
                border: 'none',
                borderRadius: '15px',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                background: !isDarkMode 
                  ? (isDarkMode ? '#7c3aed' : '#3b82f6')
                  : (isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'),
                color: !isDarkMode 
                  ? 'white' 
                  : (isDarkMode ? '#e5e5e5' : '#666'),
                boxShadow: !isDarkMode ? '0 2px 8px rgba(0,0,0,0.2)' : 'none'
              }}
            >
              Light
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsDarkMode(true);
                setIsExpanded(false);
              }}
              style={{
                padding: '6px 12px',
                border: 'none',
                borderRadius: '15px',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                background: isDarkMode 
                  ? (isDarkMode ? '#7c3aed' : '#3b82f6')
                  : (isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'),
                color: isDarkMode 
                  ? 'white' 
                  : (isDarkMode ? '#e5e5e5' : '#666'),
                boxShadow: isDarkMode ? '0 2px 8px rgba(0,0,0,0.2)' : 'none'
              }}
            >
              Dark
            </button>
          </div>
        )}

        {/* السهم */}
        <div style={{
          position: 'absolute',
          right: '12px',
          fontSize: '18px',
          color: isDarkMode ? '#a0a0a0' : '#666',
          transform: `rotate(${isExpanded ? '90deg' : '0deg'})`,
          transition: 'transform 0.3s ease',
          pointerEvents: 'none'
        }}>
          ›
        </div>
      </div>

      {/* الخلفية للإغلاق */}
      {isExpanded && (
        <div 
          onClick={() => setIsExpanded(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'transparent',
            zIndex: -1
          }}
        />
      )}
    </div>
  );
}

export default DarkModeToggle;