document.addEventListener("DOMContentLoaded", () => {
  const faqQuestions = document.querySelectorAll(".faq-question");

  faqQuestions.forEach((question) => {
    // Add keyboard navigation support
    question.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggleFAQ(question);
      }
    });

    // Click handler
    question.addEventListener("click", () => {
      toggleFAQ(question);
    });
  });

  function toggleFAQ(question) {
    const faqItem = question.parentElement;
    const isActive = faqItem.classList.contains("active");
    
    // Close all other FAQ items
    document.querySelectorAll(".faq-item").forEach(item => {
      if (item !== faqItem) {
        item.classList.remove("active");
        const otherQuestion = item.querySelector(".faq-question");
        otherQuestion.setAttribute("aria-expanded", "false");
      }
    });
    
    // Toggle current item
    faqItem.classList.toggle("active", !isActive);
    question.setAttribute("aria-expanded", !isActive ? "true" : "false");
  }
});
