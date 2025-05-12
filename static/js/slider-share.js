document.addEventListener("DOMContentLoaded", () => {
    const slider = document.getElementById("pay-percent");
    const output = document.getElementById("val-pay");
  
    if (slider && output) {
      const data = JSON.parse(localStorage.getItem("options") || "{}");
  
      slider.addEventListener("input", () => {
        output.textContent = `${slider.value} %`;
      });
  
      slider.addEventListener("change", () => {
        data.avr_share = parseInt(slider.value);
        localStorage.setItem("options", JSON.stringify(data));
      });
    }
  });