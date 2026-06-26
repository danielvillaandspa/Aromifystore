import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Menu,
  X,
  Phone,
  Mail,
  MapPin,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const translations = {
  he: {
    home: "בית",
    products: "מוצרים",
    about: "אודות",
    contact: "צור קשר",
    heroTitle: "ניחוחות יוקרתיים לכל מקום",
    heroText:
      "מפיצי ריח ושמני בישום איכותיים ללא אלכוהול לבתים, משרדים, בתי מלון ורכבים.",
    explore: "לצפייה במוצרים",
  },

  en: {
    home: "Home",
    products: "Products",
    about: "About",
    contact: "Contact",
    heroTitle: "Luxury Fragrance For Every Space",
    heroText:
      "Premium alcohol-free fragrance oils and smart aroma diffusers.",
    explore: "Explore Products",
  },

  ar: {
    home: "الرئيسية",
    products: "المنتجات",
    about: "من نحن",
    contact: "اتصل بنا",
    heroTitle: "عطور فاخرة لكل مكان",
    heroText:
      "أجهزة تعطير احترافية وزيوت عطرية بدون كحول للمنازل والمكاتب والفنادق.",
    explore: "استكشف المنتجات",
  },
};

export default function App() {
  const [lang, setLang] = useState("he");
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const t = translations[lang];

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 2500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      
  <AnimatePresence>
    {loading && (
      <motion.div
        className="fixed inset-0 bg-black flex items-center justify-center z-50"
        initial={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          animate={{
            scale: [1, 1.15, 1],
            rotate: [0, 3, -3, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
          }}
          className="text-center"
        >
          <h1 className="text-6xl font-bold text-yellow-400">
            AromifyStore
          </h1>

          <p className="text-white mt-4 tracking-[8px]">
            Luxury Fragrance
          </p>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>

  <div className="min-h-screen bg-black text-white">
<div className="min-h-screen bg-black text-white">

  <nav className="fixed top-0 left-0 w-full backdrop-blur-xl bg-black/40 border-b border-yellow-500/20 z-40">
    <div className="max-w-7xl mx-auto flex justify-between items-center px-6 py-5">

      <h2 className="text-yellow-400 text-3xl font-bold">
        AromifyStore
      </h2>

      <div className="hidden md:flex gap-8 text-lg">
        <a href="#home">{t.home}</a>
        <a href="#products">{t.products}</a>
        <a href="#about">{t.about}</a>
        <a href="#contact">{t.contact}</a>
      </div>

      <div className="flex items-center gap-4">

        <select
          value={lang}
          onChange={(e) => setLang(e.target.value)}
          className="bg-black border border-yellow-400 rounded-lg p-2"
        >
          <option value="he">עברית</option>
          <option value="en">English</option>
          <option value="ar">العربية</option>
        </select>

        <button
          className="md:hidden"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X /> : <Menu />}
        </button>

      </div>

    </div>
  </nav>
<section
  id="home"
  className="min-h-screen flex items-center justify-center px-8"
>
  <div className="text-center">

    <motion.h1
      initial={{ opacity: 0, y: 70 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1 }}
      className="text-6xl md:text-8xl font-bold text-yellow-400"
    >
      {t.heroTitle}
    </motion.h1>

    <motion.p
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.5 }}
      className="mt-8 text-xl max-w-3xl mx-auto text-gray-300"
    >
      {t.heroText}
    </motion.p>

    <motion.img
      src="/IMG_0043.jpeg"
      alt="Diffuser"
      className="w-[450px] mx-auto mt-16 drop-shadow-[0_0_50px_gold]"
      animate={{
        y: [0, -20, 0],
      }}
      transition={{
        duration: 4,
        repeat: Infinity,
      }}
    />

  </div>
</section>
  <section
  id="products"
  className="py-24 px-8"
>

  <h2 className="text-center text-5xl font-bold text-yellow-400 mb-16">
    {t.products}
  </h2>

  <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">

    <div className="bg-white/5 rounded-3xl p-6 text-center">
      <img
        src="/IMG_0043.jpeg"
        className="h-52 object-contain mx-auto"
      />
      <h3 className="mt-6 text-xl font-bold">
        Smart Diffuser
      </h3>
    </div>

    <div className="bg-white/5 rounded-3xl p-6 text-center">
      <img
        src="/IMG_0028.jpeg"
        className="h-52 object-contain mx-auto"
      />
      <h3 className="mt-6 text-xl font-bold">
        Commercial Diffuser
      </h3>
    </div>

    <div className="bg-white/5 rounded-3xl p-6 text-center">
      <img
        src="/IMG_0024.jpeg"
        className="h-52 object-contain mx-auto"
      />
      <h3 className="mt-6 text-xl font-bold">
        Car Diffuser
      </h3>
    </div>

    <div className="bg-white/5 rounded-3xl p-6 text-center">
      <img
        src="/IMG_0014.jpeg"
        className="h-52 object-contain mx-auto"
      />
      <h3 className="mt-6 text-xl font-bold">
        Office Diffuser
      </h3>
    </div>

  </div>

</section>
</div>
  </div>
</>
    
  );
}
