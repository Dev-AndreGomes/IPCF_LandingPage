// script.js - Igreja Presbiteriana em Casa Forte
document.addEventListener("DOMContentLoaded", () => {
  
    // Exemplo de interação: Smooth scroll para seções
    const navLinks = document.querySelectorAll("nav a");
    navLinks.forEach(link => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        const targetId = link.getAttribute("href").substring(1);
        const targetSection = document.getElementById(targetId);
        if (targetSection) {
          targetSection.scrollIntoView({ behavior: "smooth" });
        }
      });
    });
});