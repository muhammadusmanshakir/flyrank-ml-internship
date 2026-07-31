// =======================================
// Fade In Animation
// =======================================

const sections = document.querySelectorAll(".section");

const observer = new IntersectionObserver((entries)=>{

    entries.forEach(entry=>{

        if(entry.isIntersecting){

            entry.target.classList.add("show");

        }

    });

},{
    threshold:0.2
});

sections.forEach(section=>{

    observer.observe(section);

});

// =======================================
// Animated Counter
// =======================================

const counters=document.querySelectorAll(".counter");

counters.forEach(counter=>{

    const update=()=>{

        const target=+counter.getAttribute("data-target");

        const count=+counter.innerText.replace(/\D/g,'');

        const increment=target/80;

        if(count<target){

            counter.innerText=Math.ceil(count+increment)+"M+";

            setTimeout(update,20);

        }else{

            counter.innerText=target+"M+";

        }

    }

    update();

});

// =======================================
// Back To Top
// =======================================

const topBtn = document.getElementById("topBtn");

if (topBtn) {

    window.addEventListener("scroll", () => {

        if (window.scrollY > 300) {

            topBtn.style.display = "block";

        } else {

            topBtn.style.display = "none";

        }

    });

    topBtn.addEventListener("click", () => {

        window.scrollTo({

            top: 0,
            behavior: "smooth"

        });

    });

}

// =======================================
// DARK MODE
// =======================================

const themeToggle = document.getElementById("theme-toggle");

if (themeToggle) {

    // Load saved theme
    if (localStorage.getItem("theme") === "dark") {
        document.body.classList.add("dark");
        themeToggle.textContent = "☀️";
    }

    themeToggle.addEventListener("click", () => {

        document.body.classList.toggle("dark");

        if (document.body.classList.contains("dark")) {

            localStorage.setItem("theme", "dark");
            themeToggle.textContent = "☀️";

        } else {

            localStorage.setItem("theme", "light");
            themeToggle.textContent = "🌙";

        }

    });

}

// =======================================
// ACTIVE NAVIGATION
// =======================================

const currentPage = window.location.pathname.split("/").pop();

const navLinks = document.querySelectorAll(".navbar a");

navLinks.forEach(link => {

    const href = link.getAttribute("href");

    if (href === currentPage) {

        link.classList.add("active");

    }

});

// Handle home page
if (currentPage === "" || currentPage === "index.html") {

    document.querySelectorAll('.navbar a[href="index.html"]')
        .forEach(link => link.classList.add("active"));

}

// =======================================
// MOBILE MENU
// =======================================

const menuToggle = document.getElementById("menu-toggle");

const mobileMenu = document.getElementById("nav-links");

if (menuToggle && mobileMenu) {

    menuToggle.addEventListener("click", () => {

        mobileMenu.classList.toggle("active");

    });

}
