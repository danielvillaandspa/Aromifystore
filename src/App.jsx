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
    </>
  );
}
