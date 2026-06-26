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
    loading: "טוען חוויה יוקרתית...",
    ui: {
      coverage: "שטח כיסוי",
      capacity: "קיבולת מיכל",
      orderWhatsApp: "הזמן ב-WhatsApp",
      contactTitle: "צור קשר עמנו",
      location: "עספיא, השכונה המזרחית",
      phones: "0506075320 | 0545700913",
      email: "yosefabo111y@gmail.com"
    }
  },
  en: {
    nav: { home: "Home", products: "Products", about: "About Us", contact: "Contact" },
    hero: { title: "Luxury Scents Everywhere", subtitle: "Elevate your space with our smart aroma diffusers." },
    loading: "Loading luxury experience...",
    ui: {
      coverage: "Coverage Area",
      capacity: "Bottle Capacity",
      orderWhatsApp: "Order via WhatsApp",
      contactTitle: "Contact Us",
      location: "Isfiya, Eastern Neighborhood",
      phones: "0506075320 | 0545700913",
      email: "yosefabo111y@gmail.com"
    }
  },
  ar: {
    nav: { home: "الرئيسية", products: "المنتجات", about: "من نحن", contact: "اتصل بنا" },
    hero: { title: "عطور فاخرة لكل مكان", subtitle: "ارتقِ بمساحتك مع أجهزة التعطير الذكية الخاصة بنا." },
    loading: "جاري تحميل التجربة الفاخرة...",
    ui: {
      coverage: "مساحة التغطية",
      capacity: "سعة العبوة",
      orderWhatsApp: "اطلب عبر واتساب",
      contactTitle: "اتصل بنا",
      location: "عسفيا، الحي الشرقي",
      phones: "0506075320 | 0545700913",
      email: "yosefabo111y@gmail.com"
    }
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
// 2. بيانات المنتجات
// ==========================================
const productsData = [
  {
    id: 'pro-diffuser',
    images: ["IMG_0014.jpeg"], // تأكد أن هذه الصور موجودة في المجلد الرئيسي
    names: { he: "מפיץ ריח יוקרתי Pro", en: "Aroma Diffuser Pro", ar: "جهاز تعطير احترافي برو" },
    specs: {
      he: { coverage: "500 מטרים", capacity: "500 מ\"ל" },
      en: { coverage: "500 meters", capacity: "500 ml" },
      ar: { coverage: "500 متر", capacity: "500 مل" }
    }
  },
  {
    id: 'car-diffuser',
    images: ["IMG_0020.jpeg"],
    names: { he: "מפיץ ריח יוקרתי לרכב", en: "Luxury Car Diffuser", ar: "جهاز تعطير السيارة الفاخر" },
    specs: {
      he: { coverage: "חלל הרכב", capacity: "50 מ\"ל" },
      en: { coverage: "Car Interior", capacity: "50 ml" },
      ar: { coverage: "مقصورة السيارة", capacity: "50 مل" }
    }
  }
];

// ==========================================
// 3. المكونات (Components)
// ==========================================
const LoadingScreen = ({ onComplete }) => {
  const { t } = useLanguage();
  return (
    <motion.div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#050505]"
      initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ duration: 0.8, delay: 1.5 }}
      onAnimationComplete={onComplete}
    >
      <div className="absolute w-64 h-64 bg-[#D4AF37]/20 rounded-full blur-[100px]" />
      <motion.h1 
        className="text-[#D4AF37] text-3xl font-serif tracking-widest z-10"
        initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 1 }}
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

  const navLinks = [
    { id: 'home', label: t('nav.home') },
    { id: 'products', label: t('nav.products') },
    { id: 'contact', label: t('nav.contact') }
  ];

  return (
    <nav className="fixed top-0 w-full z-50 bg-[#050505]/90 backdrop-blur-md border-b border-[#D4AF37]/30 py-4">
      <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
        <div className="text-[#D4AF37] text-2xl font-serif font-bold">AromifyStore</div>
        
        <div className="hidden md:flex items-center gap-8 text-white">
          {navLinks.map(link => (
            <a key={link.id} href={`#${link.id}`} className="hover:text-[#D4AF37] transition-colors">{link.label}</a>
          ))}
          <div className="relative">
            <button onClick={() => setIsLangOpen(!isLangOpen)} className="flex items-center gap-2 hover:text-[#D4AF37]">
              <Globe size={20} /> {locale.toUpperCase()}
            </button>
            <AnimatePresence>
              {isLangOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                  className="absolute top-full right-0 mt-2 bg-[#111] border border-[#D4AF37]/30 rounded-md overflow-hidden"
                >
                  {['he', 'en', 'ar'].map(lang => (
                    <button key={lang} onClick={() => { setLocale(lang); setIsLangOpen(false); }} className="block w-full text-left px-4 py-2 hover:bg-[#D4AF37]/20 text-white">
                      {lang.toUpperCase()}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
        <button className="md:hidden text-white" onClick={() => setIsMenuOpen(!isMenuOpen)}>
          {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
        </button>
      </div>
    </nav>
  );
};

const Hero = () => {
  const { t } = useLanguage();
  return (
    <section id="home" className="relative h-screen flex items-center justify-center overflow-hidden bg-[#050505] text-white pt-20">
      <div className="absolute inset-0 pointer-events-none opacity-30 mix-blend-screen flex justify-center">
         <motion.div className="w-full max-w-lg h-full bg-gradient-to-t from-transparent via-white/5 to-transparent blur-3xl" animate={{ x: [-20, 20, -20], y: [10, -10, 10] }} transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }} />
      </div>
      <div className="relative z-10 text-center px-4">
        <h1 className="text-5xl md:text-7xl font-serif mb-6 text-transparent bg-clip-text bg-gradient-to-r from-[#D4AF37] to-[#FFF8DC] drop-shadow-[0_0_20px_rgba(212,175,55,0.5)]">
          {t('hero.title')}
        </h1>
        <p className="text-lg md:text-2xl text-gray-300 max-w-2xl mx-auto">{t('hero.subtitle')}</p>
      </div>
    </section>
  );
};

const Products = () => {
  const { t, locale } = useLanguage();
  return (
    <section id="products" className="py-24 bg-[#050505] text-white">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-4xl font-serif text-[#D4AF37] mb-16 text-center">{t('nav.products')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {productsData.map((product) => (
            <div key={product.id} className="bg-[#111] border border-[#D4AF37]/20 rounded-2xl overflow-hidden hover:border-[#D4AF37]/50 transition-colors">
              <div className="h-80 bg-black relative">
                <img src={product.images[0]} alt={product.names[locale]} className="w-full h-full object-cover opacity-80 hover:opacity-100 transition-opacity" />
              </div>
              <div className="p-8">
                <h3 className="text-2xl font-serif text-white mb-4">{product.names[locale]}</h3>
                <div className="space-y-3 mb-8 text-gray-400">
                  <div className="flex justify-between border-b border-gray-800 pb-2">
                    <span>{t('ui.coverage')}</span> <span className="text-[#D4AF37]">{product.specs[locale].coverage}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-800 pb-2">
                    <span>{t('ui.capacity')}</span> <span className="text-[#D4AF37]">{product.specs[locale].capacity}</span>
                  </div>
                </div>
                <a href={`https://wa.me/972506075320?text=Hello, I want to order ${product.names.en}`} target="_blank" rel="noreferrer" className="block w-full py-3 text-center border border-[#D4AF37] text-[#D4AF37] rounded hover:bg-[#D4AF37] hover:text-black transition-all">
                  {t('ui.orderWhatsApp')}
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const Contact = () => {
  const { t } = useLanguage();
  return (
    <section id="contact" className="py-24 bg-[#0a0a0a] text-white border-t border-[#111]">
      <div className="max-w-4xl mx-auto px-6 text-center">
        <h2 className="text-4xl font-serif text-[#D4AF37] mb-12">{t('ui.contactTitle')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-6 bg-[#111] rounded-xl border border-gray-800"><p className="text-gray-400">{t('ui.location')}</p></div>
          <div className="p-6 bg-[#111] rounded-xl border border-gray-800"><p className="text-gray-400">{t('ui.phones')}</p></div>
          <div className="p-6 bg-[#111] rounded-xl border border-gray-800"><p className="text-gray-400">{t('ui.email')}</p></div>
        </div>
      </div>
    </section>
  );
};

const Footer = () => (
  <footer className="bg-black py-8 border-t border-[#D4AF37]/20 text-center text-gray-500 text-sm">
    <p>© {new Date().getFullYear()} AromifyStore. All rights reserved.</p>
  </footer>
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
          <Products />
          <Contact />
          <Footer />
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

