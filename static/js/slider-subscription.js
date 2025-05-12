document.addEventListener("DOMContentLoaded", () => {
    const slider = document.getElementById("avg-subscriptions");
    const output = document.getElementById("val-subscriptions");
  
    if (slider && output) {
      const data = JSON.parse(localStorage.getItem("options") || "{}");
  
      slider.addEventListener("input", () => {
        output.textContent = `${slider.value} %`;
      });
  
      slider.addEventListener("change", () => {
        data.avr_subscribe = parseInt(slider.value);
        localStorage.setItem("options", JSON.stringify(data));
      });
    }
  });