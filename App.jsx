
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useTransform, useSpring, useReducedMotion } from 'framer-motion';
import { Menu, X, Globe } from 'lucide-react';

// ==========================================
// 1. نظام الترجمة (Translations)
// ==========================================
const translations = {
  he: {
    nav: { home: "בית", products: "מוצרים", about: "עלינו", contact: "צור קשר" },
    hero: { title: "ניחוחות יוקרתיים לכל מקום", subtitle: "שדרגו את החלל שלכם עם מפיצי הריח החכמים שלנו." },
    loading: "טוען חוויה יוקרתית..."
  },
  en: {
    nav: { home: "Home", products: "Products", about: "About Us", contact: "Contact" },
    hero: { title: "Luxury Scents Everywhere", subtitle: "Elevate your space with our smart aroma diffusers." },
    loading: "Loading luxury experience..."
  },
  ar: {
    nav: { home: "الرئيسية", products: "المنتجات", about: "من نحن", contact: "اتصل بنا" },
    hero: { title: "عطور فاخرة لكل مكان", subtitle: "ارتقِ بمساحتك مع أجهزة التعطير الذكية الخاصة بنا." },
    loading: "جاري تحميل التجربة الفاخرة..."
  }
};

const LanguageContext = createContext();
const useLanguage = () => useContext(LanguageContext);

const LanguageProvider = ({ children }) => {
  const [locale, setLocale] = useState('he');

  useEffect(() => {
    document.documentElement.dir = locale === 'en' ? 'ltr' : 'rtl';
    document.documentElement.lang = locale;
  }, [locale]);

  const t = (key) => {
    return key.split('.').reduce((obj, k) => (obj || {})[k], translations[locale]) || key;
  };

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

// ==========================================
// 2. الخطافات المخصصة (Custom Hooks)
// ==========================================

// א. Scroll Spy - دقيق ومحسن للأداء
const useScrollSpy = (sectionIds) => {
  const [activeId, setActiveId] = useState('');
  const ratiosRef = useRef({});

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          ratiosRef.current[entry.target.id] = entry.isIntersecting ? entry.intersectionRatio : 0;
        });
        const maxRatioId = Object.keys(ratiosRef.current).reduce((a, b) => 
          ratiosRef.current[a] > ratiosRef.current[b] ? a : b
        );
        if (ratiosRef.current[maxRatioId] > 0) setActiveId(maxRatioId);
      },
      { rootMargin: '-20% 0px -40% 0px', threshold: [0.35, 0.4, 0.5] }
    );

    sectionIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [sectionIds]);

  return activeId;
};

// ב. Navbar Visibility - ذكي ويدعم إخفاء سلس
const useNavbarVisibility = (isMenuOpen, isDropdownOpen) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isScrolled, setIsScrolled] = useState(false);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const handleScroll = () => {
      if (!ticking.current) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;
          
          if (currentScrollY <= 80) {
            setIsScrolled(false);
            setIsVisible(true);
          } else {
            setIsScrolled(true);
            if (!isMenuOpen && !isDropdownOpen && !prefersReducedMotion) {
              setIsVisible(currentScrollY < lastScrollY.current);
            } else {
              setIsVisible(true);
            }
          }
          lastScrollY.current = currentScrollY;
          ticking.current = false;
        });
        ticking.current = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isMenuOpen, isDropdownOpen, prefersReducedMotion]);

  return { isVisible, isScrolled };
};

// ג. Mouse Parallax
const useMouseParallax = (multiplier = 10) => {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (prefersReducedMotion) return;
    const handleMouseMove = (e) => {
      const x = (e.clientX / window.innerWidth - 0.5) * multiplier;
      const y = (e.clientY / window.innerHeight - 0.5) * multiplier;
      window.requestAnimationFrame(() => setOffset({ x, y }));
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [multiplier, prefersReducedMotion]);

  return offset;
};

// ==========================================
// 3. المكونات (Components)
// ==========================================

const LoadingScreen = ({ onComplete }) => {
  const { t } = useLanguage();
  return (
    <motion.div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#050505]"
      initial={{ opacity: 1 }}
      animate={{ opacity: 0 }}
      transition={{ duration: 0.8, delay: 2 }}
      onAnimationComplete={onComplete}
    >
      <div className="absolute w-64 h-64 bg-[#D4AF37]/20 rounded-full blur-[100px]" />
      <motion.h1 
        className="text-[#D4AF37] text-3xl font-serif tracking-widest z-10"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1 }}
      >
        {t('loading')}
      </motion.h1>
    </motion.div>
  );
};

const Navbar = () => {
  const { t, locale, setLocale } = useLanguage();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLangOpen, setIsLangOpen] = useState(false);
  const { isVisible, isScrolled } = useNavbarVisibility(isMenuOpen, isLangOpen);
  const activeSection = useScrollSpy(['home', 'products', 'about', 'contact']);

  const navLinks = [
    { id: 'home', label: t('nav.home') },
    { id: 'products', label: t('nav.products') },
    { id: 'about', label: t('nav.about') },
    { id: 'contact', label: t('nav.contact') }
  ];

  return (
    <motion.nav
      initial={{ y: 0 }}
      animate={{ y: isVisible ? 0 : '-100%' }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        isScrolled 
          ? 'bg-[#050505]/80 backdrop-blur-md border-b border-[#D4AF37]/30 shadow-[0_4px_30px_rgba(212,175,55,0.1)] py-3' 
          : 'bg-transparent py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
        <div className="text-[#D4AF37] text-2xl font-serif font-bold tracking-wider">AromifyStore</div>
        
        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-8 text-white">
          {navLinks.map(link => (
            <a 
              key={link.id} 
              href={`#${link.id}`}
              className={`hover:text-[#D4AF37] transition-colors ${activeSection === link.id ? 'text-[#D4AF37] font-bold border-b border-[#D4AF37]' : ''}`}
            >
              {link.label}
            </a>
          ))}
          
          <div className="relative">
            <button onClick={() => setIsLangOpen(!isLangOpen)} className="flex items-center gap-2 hover:text-[#D4AF37]">
              <Globe size={20} /> {locale.toUpperCase()}
            </button>
            <AnimatePresence>
              {isLangOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute top-full right-0 mt-2 bg-[#111] border border-[#D4AF37]/30 rounded-md overflow-hidden"
                >
                  {['he', 'en', 'ar'].map(lang => (
                    <button 
                      key={lang}
                      onClick={() => { setLocale(lang); setIsLangOpen(false); }}
                      className="block w-full text-left px-4 py-2 hover:bg-[#D4AF37]/20 transition-colors"
                    >
                      {lang.toUpperCase()}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Mobile Menu Toggle */}
        <button className="md:hidden text-white" onClick={() => setIsMenuOpen(!isMenuOpen)}>
          {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-[#050505] border-b border-[#D4AF37]/30 px-6 py-4"
          >
             {navLinks.map(link => (
              <a 
                key={link.id} 
                href={`#${link.id}`}
                onClick={() => setIsMenuOpen(false)}
                className="block py-3 text-white border-b border-gray-800"
              >
                {link.label}
              </a>
            ))}
            <div className="flex gap-4 py-4">
              {['he', 'en', 'ar'].map(lang => (
                <button 
                  key={lang}
                  onClick={() => { setLocale(lang); setIsMenuOpen(false); }}
                  className={`px-3 py-1 border rounded ${locale === lang ? 'border-[#D4AF37] text-[#D4AF37]' : 'border-gray-600 text-gray-400'}`}
                >
                  {lang.toUpperCase()}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
};

const Hero = () => {
  const { t } = useLanguage();
  const mouseOffset = useMouseParallax(20);
  const { scrollY } = useScroll();
  const yParallax = useTransform(scrollY, [0, 500], [0, 150]);
  const opacityParallax = useTransform(scrollY, [0, 300], [1, 0]);

  return (
    <section id="home" className="relative h-screen flex items-center justify-center overflow-hidden bg-[#050505] text-white">
      {/* Scroll Progress Indicator */}
      <motion.div 
        className="fixed top-0 left-0 right-0 h-1 bg-[#D4AF37] z-[60] origin-left"
        style={{ scaleX: useSpring(useTransform(scrollY, [0, document.body.scrollHeight - window.innerHeight], [0, 1]), { stiffness: 100, damping: 30 }) }}
      />

      {/* Gold Particles (Floating) */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute bg-[#D4AF37] rounded-full opacity-40 blur-[1px]"
            style={{
              width: Math.random() * 6 + 2 + 'px',
              height: Math.random() * 6 + 2 + 'px',
              top: Math.random() * 100 + '%',
              left: Math.random() * 100 + '%',
            }}
            animate={{
              y: [0, -100],
              opacity: [0, 0.6, 0],
            }}
            transition={{
              duration: Math.random() * 3 + 3,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        ))}
      </div>

      {/* Steam Effect */}
      <div className="absolute inset-0 pointer-events-none opacity-30 mix-blend-screen flex justify-center">
         <motion.div 
           className="w-full max-w-lg h-full bg-gradient-to-t from-transparent via-white/5 to-transparent blur-3xl"
           animate={{ x: [-20, 20, -20], y: [10, -10, 10] }}
           transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
         />
      </div>

      <motion.div 
        className="relative z-10 text-center px-4"
        style={{ 
          y: yParallax, 
          opacity: opacityParallax,
          x: mouseOffset.x,
        }}
      >
        <h1 className="text-5xl md:text-7xl font-serif mb-6 text-transparent bg-clip-text bg-gradient-to-r from-[#D4AF37] to-[#FFF8DC] drop-shadow-[0_0_20px_rgba(212,175,55,0.5)]">
          {t('hero.title')}
        </h1>
        <p className="text-lg md:text-2xl text-gray-300 max-w-2xl mx-auto">
          {t('hero.subtitle')}
        </p>
      </motion.div>
    </section>
  );
};

const Section = ({ id, title, height = "min-h-screen" }) => (
  <section id={id} className={`w-full ${height} flex items-center justify-center border-t border-[#111] bg-[#050505] text-white`}>
    <h2 className="text-4xl font-serif text-[#D4AF37]">{title}</h2>
  </section>
);

// ==========================================
// 4. التطبيق الرئيسي (Main App Component)
// ==========================================
const AppContent = () => {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <div className="bg-[#050505] min-h-screen font-sans selection:bg-[#D4AF37] selection:text-black">
      <AnimatePresence>
        {isLoading && <LoadingScreen onComplete={() => setIsLoading(false)} />}
      </AnimatePresence>

      {!isLoading && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1 }}>
          <Navbar />
          <Hero />
          {/* أقسام للتجربة وضمان عمل ה-Scroll Spy */}
          <Section id="products" title="המוצרים שלנו / Our Products" />
          <Section id="about" title="עלינו / About Us" />
          <Section id="contact" title="צור קשר / Contact" height="min-h-[70vh]" />
        </motion.div>
      )}
    </div>
  );
};

export default function App() {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
}
