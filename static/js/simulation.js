document.addEventListener("DOMContentLoaded", () => {
  const periodElement = document.querySelector(".period");
  const presetButtons = document.querySelectorAll(".preset");

  const today = new Date();
  const originalDate = new Date(today); // сохраняем неизменную дату
  let currentDate = new Date(today);
  const offset = { d: 0, w: 0, m: 0, y: 0 };

  function formatDate(date) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  }

  // Установка начальной даты
  if (periodElement) {
    periodElement.textContent = formatDate(today);
  }

  let totalDays = 0;

  presetButtons.forEach(button => {
    button.addEventListener("click", async () => {
      const value = parseInt(button.dataset.value);
      const unit = button.dataset.unit;
  
      // Добавляем к totalDays в зависимости от типа
      if (unit === "d") totalDays += value;
      if (unit === "w") totalDays += value * 7;
      if (unit === "m") totalDays += value * 30;
      if (unit === "y") totalDays += value * 365;
  
      // Отображаем диапазон дат
      const newDate = new Date(originalDate);
      newDate.setDate(newDate.getDate() + totalDays);
  
      periodElement.textContent = `${formatDate(originalDate)} - ${formatDate(newDate)}`;
  
      // offset для API
      const offset = { d: totalDays, w: 0, m: 0, y: 0 };
  
      const options = JSON.parse(localStorage.getItem('options') || '{}');
      const metrics = JSON.parse(localStorage.getItem('metrics') || '{}');
      const simData = JSON.parse(localStorage.getItem('simulation_data') || '[]');

      try {
        const response = await fetch('/api/calculate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            options,
            metrics,
            simData,
            offset
          })
        });

        const result = await response.json();
        if (result.status === "ok") {
          const average = result.average;
          const grandCount = result.grand_count;
          const newAllGrand = result.new_all_budget
          const newPlatformGrand = result.new_platform_budget

          // 1. Обновляем только simulation_data

          // Извлекаем только нужные поля
          const newPercents = average.percents;
          const newValues = average.values;

          const simData = JSON.parse(localStorage.getItem("simulation_data") || "[]");

          if (simData.length > 0) {
            simData[0].percents = newPercents;
            simData[0].values = newValues;
            localStorage.setItem("simulation_data", JSON.stringify(simData));
          }
        
          // 2. Обновляем metrics
          const metrics = JSON.parse(localStorage.getItem("metrics") || "[]");
        
          const updateMetric = (title, increment) => {
            const metric = metrics.find(m => m.metric_title === title);
            if (metric) {
              const current = parseFloat(metric.metric_value);
              metric.metric_value = (increment).toFixed(4);
            }
          };
        
          updateMetric("Бюджет платформы", newPlatformGrand);
          updateMetric("Всего Grand", newAllGrand);
        
          // 3. Обновляем "Счёт пользователя"
          const mining = parseFloat(average.values.mining_value);
          const users = average.inputs.users;
          const raiting = average.inputs.raiting;
          const individualIncrement = users && raiting ? mining / (users * raiting) : 0;
          console.log(users, raiting, mining)
          console.log(individualIncrement)
        
          const userMetric = metrics.find(m => m.metric_title === "Счёт пользователя");
          if (userMetric) {
            const current = parseFloat(userMetric.metric_value);
            userMetric.metric_value = (current + individualIncrement).toFixed(4);
          }
        
          // 4. Обновляем "Стоимость Grand"
          const globalBudgetMetric = metrics.find(m => m.metric_title === "Глобальный бюджет");
          const totalGrandMetric = metrics.find(m => m.metric_title === "Всего Grand");
          const priceMetric = metrics.find(m => m.metric_title === "Стоимость Grand");

          if (globalBudgetMetric && totalGrandMetric && priceMetric) {
            const globalBudget = parseFloat(globalBudgetMetric.metric_value);
            const totalGrand = parseFloat(totalGrandMetric.metric_value);

            if (totalGrand > 0) {
              const price = globalBudget / totalGrand;
              priceMetric.metric_value = price.toFixed(4);
            }
          }

          // 5. Обновляем диаграмму после обновления simulation_data
          const updatedSimData = JSON.parse(localStorage.getItem("simulation_data") || "[]");
          const updated = updatedSimData[0];

          if (updated) {
            const chart = document.getElementById("chart");
            chart.innerHTML = '<div class="axis-x"></div>';

            const dataChart = [
              { label: "На добычу:", value: +updated.percents.mining_percent.toFixed(4), amount: updated.values.mining_value },
              { label: "На реф. начисления:", value: +updated.percents.referral_percent.toFixed(4), amount: updated.values.referral_value },
              { label: "В бюджет проекта:", value: +updated.percents.budget_percent.toFixed(4), amount: updated.values.budget_value },
              { label: "На депозиты:", value: +updated.percents.deposit_percent.toFixed(4), amount: updated.values.deposit_value },
              { label: "На бизнес места:", value: +updated.percents.business_place_percent.toFixed(4), amount: updated.values.business_place_value }
            ];

            const vars = getComputedStyle(document.documentElement);
            const colors = [
              vars.getPropertyValue("--accent-warm").trim(),
              vars.getPropertyValue("--accent-mint").trim(),
              vars.getPropertyValue("--accent-sun").trim(),
              vars.getPropertyValue("--accent-teal").trim(),
              vars.getPropertyValue("--accent-navy").trim()
            ];

            dataChart.forEach((item, i) => {
              const bar = document.createElement("div");
              bar.className = "bar";

              const barAmount = document.createElement("div");
              barAmount.className = "bar-amount";
              barAmount.innerHTML = `<span class="g-mask"></span> ${Number(item.amount).toLocaleString('ru-RU', { minimumFractionDigits: 4 })}`;

              const label = document.createElement("div");
              label.className = "bar-label";

              const labelText = document.createElement("span");
              labelText.textContent = `${item.label} `;

              const valueSpan = document.createElement("span");
              valueSpan.className = "bar-percent";
              valueSpan.textContent = `${item.value} %`;

              label.appendChild(labelText);
              label.appendChild(valueSpan);

              const fill = document.createElement("div");
              fill.className = "bar-fill";
              fill.style.background = colors[i % colors.length];
              fill.style.width = "0%";

              bar.appendChild(fill);
              bar.appendChild(label);

              chart.insertBefore(bar, chart.querySelector(".axis-x"));
              chart.insertBefore(barAmount, chart.querySelector(".axis-x"));

              requestAnimationFrame(() => {
                setTimeout(() => {
                  fill.style.width = item.value + "%";
                }, 100);
              });
            });
          }          

          // Сохраняем снова
          localStorage.setItem("metrics", JSON.stringify(metrics));

          // 6. Обновляем отображение .metrics-list
          const metricsListEl = document.querySelector('.metrics-list');

          metrics.forEach(metric => {
            const title = metric.metric_title;
            const metricItem = metricsListEl.querySelector(`[data-title="${title}"]`);

            if (metricItem) {
              const valueEl = metricItem.querySelector('.metric-value');
              const val = Number(metric.metric_value).toLocaleString('ru-RU', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 4
              });

              let prefix = '';
              if (metric.currency?.includes('dollar')) {
                prefix = '$';
              } else if (metric.currency?.includes('grand')) {
                prefix = '<span class="g-mask"></span>';
              }

              valueEl.innerHTML = `${prefix} ${val}`;
              metricItem.querySelector('.tooltip').innerText = metric.tooltip;
            }
          });
        }
      } catch (error) {
        console.error('Ошибка при отправке данных на сервер:', error);
      }
    });
  });
});