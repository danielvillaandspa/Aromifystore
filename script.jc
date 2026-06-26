// ===============================
// PURE AROMA LUXURY SCRIPT
// ===============================

// Loader
window.addEventListener("load", () => {
    const loader = document.getElementById("loader");

    setTimeout(() => {
        if (loader) {
            loader.style.opacity = "0";
            loader.style.visibility = "hidden";
        }
    }, 2500);
});

// Smooth Scroll
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener("click", function (e) {

        const target = document.querySelector(this.getAttribute("href"));

        if (!target) return;

        e.preventDefault();

        target.scrollIntoView({
            behavior: "smooth"
        });

    });
});

// Navbar Background
window.addEventListener("scroll", () => {

    const nav = document.querySelector("nav");

    if (!nav) return;

    if (window.scrollY > 50) {

        nav.style.background = "rgba(0,0,0,.75)";
        nav.style.backdropFilter = "blur(25px)";

    } else {

        nav.style.background = "rgba(0,0,0,.25)";
        nav.style.backdropFilter = "blur(20px)";

    }

});

// Product Card Animation
const cards = document.querySelectorAll(".card");

cards.forEach(card => {

    card.addEventListener("mouseenter", () => {

        card.style.transform = "translateY(-12px) scale(1.03)";

    });

    card.addEventListener("mouseleave", () => {

        card.style.transform = "translateY(0) scale(1)";

    });

});

// Hero Image Floating
const heroImage = document.querySelector(".hero-image img");

if(heroImage){

let angle = 0;

setInterval(() => {

    angle += 0.02;

    heroImage.style.transform =
        `translateY(${Math.sin(angle)*10}px)`;

},30);

}

// Buttons Effect

document.querySelectorAll("button,.gold-btn,.shop-btn").forEach(btn=>{

btn.addEventListener("mousedown",()=>{

btn.style.transform="scale(.96)";

});

btn.addEventListener("mouseup",()=>{

btn.style.transform="scale(1)";

});

});

// Fade In Animation

const observer = new IntersectionObserver(entries=>{

entries.forEach(entry=>{

if(entry.isIntersecting){

entry.target.style.opacity="1";

entry.target.style.transform="translateY(0px)";

}

});

});

document.querySelectorAll(".card,.hero-content,.hero-image").forEach(el=>{

el.style.opacity="0";

el.style.transform="translateY(60px)";

el.style.transition="1s";

observer.observe(el);

});
