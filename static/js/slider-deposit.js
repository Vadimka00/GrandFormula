document.addEventListener("DOMContentLoaded", () => {
    const slider = document.getElementById("avg-deposit");
    const output = document.getElementById("val-deposit");
  
    if (slider && output) {
      const data = JSON.parse(localStorage.getItem("options") || "{}");
  
      slider.addEventListener("input", () => {
        output.textContent = `${slider.value} %`;
      });
  
      slider.addEventListener("change", () => {
        data.avr_deposit = parseInt(slider.value);
        localStorage.setItem("options", JSON.stringify(data));
      });
    }
  });