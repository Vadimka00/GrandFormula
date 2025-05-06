document.addEventListener("DOMContentLoaded", () => {
    const resetBtn = document.getElementById("reset-btn");
  
    if (!resetBtn) return;
  
    resetBtn.addEventListener("click", async () => {
      // 1. Очистка localStorage
      localStorage.removeItem("metrics");
      localStorage.removeItem("options");
      localStorage.removeItem("simulation_data");
  
      // 2. Загрузка новых options
      try {
        const optionsRes = await fetch("/api/options");
        if (!optionsRes.ok) throw new Error("Ошибка загрузки options");
        const options = await optionsRes.json();
        localStorage.setItem("options", JSON.stringify(options));
  
        if (typeof renderOptions === "function") {
          renderOptions(options);
        } else {
          console.warn("Функция renderOptions не определена");
        }
      } catch (err) {
        console.error("Ошибка при загрузке options:", err);
      }
  
      // 3. Загрузка новых metrics
      try {
        const metricsRes = await fetch("/api/metrics");
        if (!metricsRes.ok) throw new Error("Ошибка загрузки metrics");
        const metrics = await metricsRes.json();
        localStorage.setItem("metrics", JSON.stringify(metrics));
  
        if (typeof updateMetrics === "function") {
          updateMetrics(metrics);
        } else {
          console.warn("Функция updateMetrics не определена");
        }
      } catch (err) {
        console.error("Ошибка при загрузке metrics:", err);
      }

    // 4. Обновление даты
    const periodElement = document.querySelector(".period");
    if (periodElement) {
      const today = new Date();
      const day = String(today.getDate()).padStart(2, '0');
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const year = today.getFullYear();
      periodElement.textContent = `${day}.${month}.${year}`;
    }
    });
  });