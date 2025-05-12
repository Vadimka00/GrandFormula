document.addEventListener("DOMContentLoaded", () => {
    const MAX_CACHE_AGE_MINUTES = 10;
    const OptionUsers = document.getElementById("val-users");
    const OptionRaiting = document.getElementById("val-rating");
    const OptionShare = document.getElementById("val-pay");
    const OptionDeposit = document.getElementById("val-deposit");
    const OptionSubscription = document.getElementById("val-subscriptions");
  
    function formatNumberWithSpaces(num) {
        const [intPart, decPart] = num.toString().split('.');
        const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
        return decPart ? `${formattedInt}.${decPart}` : formattedInt;
      }
      
      function reverseUsersScale(realUsers, max_users) {
        const midpoint = 500;
      
        if (realUsers <= 50_000_000) {
          const fraction = (realUsers - 1000) / (50_000_000 - 1000);
          return Math.round(fraction * midpoint);
        } else {
          const fraction = (realUsers - 50_000_000) / (max_users - 50_000_000);
          return Math.round(midpoint + fraction * (1000 - midpoint));
        }
      }
  
    const formatPercent = (num) => `${Math.round(num)} %`;
  
    const renderOptions = (data) => {
      // Расчёты
      const grand_generation = data.grand_generation;
      const max_users = data.max_users * data.max_raiting;
      const online_users = data.users * data.raiting;
      const percent = 100 * (max_users - online_users) / (max_users - 100);
  
      const mining_percent = data.max_mining_percent - ((((data.max_mining_percent - data.budget_percent) / 2) / 100) * percent);
      const referral_percent = (data.referral_percent / 100) * percent;
      const budget_percent = data.budget_percent;
      const deposit_percent = (data.deposit_percent / 100) * percent;
      const business_place_percent = (data.business_place_percent / 100) * percent;

      const mining_value = (grand_generation * (mining_percent / 100)).toFixed(4);
      const referral_value = (grand_generation * (referral_percent / 100)).toFixed(4);
      const budget_value = (grand_generation * (budget_percent / 100)).toFixed(4);
      const deposit_value = (grand_generation * (deposit_percent / 100)).toFixed(4);
      const business_place_value = (grand_generation * (business_place_percent / 100)).toFixed(4);


      const simulationEntry = {
        values: {
          mining_value,
          referral_value,
          budget_value,
          deposit_value,
          business_place_value
        },
        percents: {
          mining_percent,
          referral_percent,
          budget_percent,
          deposit_percent,
          business_place_percent
        }
      };
      
      // Сохраняем simulation_data
      const simulationList = JSON.parse(localStorage.getItem('simulation_data') || '[]');

      if (simulationList.length === 0) {
        simulationList.push(simulationEntry);
        localStorage.setItem('simulation_data', JSON.stringify(simulationList));
      }
      

      // Отображение значений
      OptionUsers.textContent = formatNumberWithSpaces(data.users);
      OptionRaiting.textContent = data.raiting.toFixed(1);
      OptionShare.textContent = formatPercent(data.avr_share);
      OptionDeposit.textContent = formatPercent(data.avr_deposit);
      OptionSubscription.textContent = formatPercent(data.avr_subscribe);
  
      // Установка значений слайдеров
      document.getElementById("avg-users").value = reverseUsersScale(data.users, data.max_users);
      document.getElementById("avg-rating").value = data.raiting;
      document.getElementById("pay-percent").value = data.avr_share;
      document.getElementById("avg-deposit").value = data.avr_deposit;
      document.getElementById("avg-subscriptions").value = data.avr_subscribe;
  
      // Диаграмма
      // Попробовать взять данные из localStorage
      const stored = JSON.parse(localStorage.getItem("simulation_data") || "[]");
      const sim = stored.length > 0 ? stored[0] : null;

      const percents = sim?.percents || {
        mining_percent,
        referral_percent,
        budget_percent,
        deposit_percent,
        business_place_percent
      };

      const values = sim?.values || {
        mining_value,
        referral_value,
        budget_value,
        deposit_value,
        business_place_value
      };

      const dataChart = [
        { label: "На добычу:", value: +percents.mining_percent.toFixed(4), amount: values.mining_value },
        { label: "На реф. начисления:", value: +percents.referral_percent.toFixed(4), amount: values.referral_value },
        { label: "В бюджет проекта:", value: +percents.budget_percent.toFixed(4), amount: values.budget_value },
        { label: "На депозиты:", value: +percents.deposit_percent.toFixed(4), amount: values.deposit_value },
        { label: "На бизнес места:", value: +percents.business_place_percent.toFixed(4), amount: values.business_place_value },
      ];
  
      const vars = getComputedStyle(document.documentElement);
      const colors = [
        vars.getPropertyValue("--accent-warm").trim(),
        vars.getPropertyValue("--accent-mint").trim(),
        vars.getPropertyValue("--accent-sun").trim(),
        vars.getPropertyValue("--accent-teal").trim(),
        vars.getPropertyValue("--accent-navy").trim(),
      ];
  
      const chart = document.getElementById("chart");
      chart.innerHTML = '<div class="axis-x"></div>'; // очищаем и восстанавливаем ось
  
      dataChart.forEach((item, i) => {
        const bar = document.createElement("div");
        bar.className = "bar";

        const barAmount = document.createElement("div");
        barAmount.className = "bar-amount";
        const rawAmount = dataChart[i].amount;
        barAmount.innerHTML = `<span class="g-mask"></span> ${formatNumberWithSpaces(rawAmount)}`;
  
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
        const bgColor = colors[i % colors.length];
        fill.style.background = bgColor;
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
        setupLiveRecalculation(data);
      });
    };

    window.renderOptions = renderOptions;

    function usersScale(sliderValue, max_users) {
      const midpoint = 500;
    
      if (sliderValue <= midpoint) {
        const fraction = sliderValue / midpoint;
        return Math.round(1000 + fraction * (50_000_000 - 1000));
      } else {
        const fraction = (sliderValue - midpoint) / (1000 - midpoint);
        return Math.round(50_000_000 + fraction * (max_users - 50_000_000));
      }
    }
    
    const setupLiveRecalculation = (data) => {
        const userInput = document.getElementById("avg-users");
        const ratingInput = document.getElementById("avg-rating");
      
        // Только обновление отображения числа пользователей при движении
        userInput.addEventListener("input", () => {
          const scaledUsers = usersScale(parseInt(userInput.value), data.max_users);
          OptionUsers.textContent = formatNumberWithSpaces(scaledUsers);
        });
      
        ratingInput.addEventListener("input", () => {
          OptionRaiting.textContent = parseFloat(ratingInput.value).toFixed(1);
        });
      
        // После отпускания мыши — расчёты
        const onUpdate = () => {
          data.users = usersScale(parseInt(userInput.value), data.max_users); // здесь трансформация
          data.raiting = parseFloat(ratingInput.value);
          localStorage.setItem("options", JSON.stringify(data));
          updateOutputsOnly(data);
        };
      
        userInput.addEventListener("change", onUpdate);
        ratingInput.addEventListener("change", onUpdate);
      };
      
      
      
      const updateOutputsOnly = (data) => {
        // Пересчёт формул
        const max_users = data.max_users * data.max_raiting;
        const online_users = data.users * data.raiting;
        const percent = 100 * (max_users - online_users) / (max_users - 100);
      
        const mining_percent = data.max_mining_percent - ((((data.max_mining_percent - data.budget_percent) / 2) / 100) * percent);
        const referral_percent = (data.referral_percent / 100) * percent;
        const budget_percent = data.budget_percent;
        const deposit_percent = (data.deposit_percent / 100) * percent;
        const business_place_percent = (data.business_place_percent / 100) * percent;
      
        const values = [
          +mining_percent.toFixed(4),
          +referral_percent.toFixed(4),
          +budget_percent.toFixed(4),
          +deposit_percent.toFixed(4),
          +business_place_percent.toFixed(4),
        ];
      
        console.log("Обновлённые значения:");
        console.table({
          max_users: max_users,
          users: data.users,
          raiting: data.raiting,
          percent: percent.toFixed(2),
          mining_percent: values[0],
          referral_percent: values[1],
          budget_percent: values[2],
          deposit_percent: values[3],
          business_place_percent: values[4],
        });
      
        // Обновление диаграммы
        const chart = document.getElementById("chart");
        const bars = chart.querySelectorAll(".bar");
      
        values.forEach((value, i) => {
          const bar = bars[i];
          if (!bar) return;
          const fill = bar.querySelector(".bar-fill");
          const span = bar.querySelector(".bar-percent");
          fill.style.width = value + "%";
          span.textContent = value + " %";
        });
      
        const grand_generation = data.grand_generation;

        const amounts = [
          grand_generation * (mining_percent / 100),
          grand_generation * (referral_percent / 100),
          grand_generation * (budget_percent / 100),
          grand_generation * (deposit_percent / 100),
          grand_generation * (business_place_percent / 100),
        ];
        
        // Обновляем подписи-суммы под каждым баром
        const barAmounts = chart.querySelectorAll('.bar-amount');
        amounts.forEach((amount, i) => {
          const target = barAmounts[i];
          if (target) {
            target.innerHTML = `<span class="g-mask"></span> ${formatNumberWithSpaces(amount.toFixed(4))}`;
          }
        });

        // Обновление чисел
        OptionRaiting.textContent = data.raiting.toFixed(1);
        // Сохранение новых значений в simulation_data (всегда обновляем последний)
        const simulationList = JSON.parse(localStorage.getItem('simulation_data') || '[]');

        const updatedEntry = {
          values: {
            mining_value: amounts[0].toFixed(4),
            referral_value: amounts[1].toFixed(4),
            budget_value: amounts[2].toFixed(4),
            deposit_value: amounts[3].toFixed(4),
            business_place_value: amounts[4].toFixed(4)
          },
          percents: {
            mining_percent: values[0],
            referral_percent: values[1],
            budget_percent: values[2],
            deposit_percent: values[3],
            business_place_percent: values[4]
          }
        };

        // Обновляем первую (0-ю) запись
        if (simulationList.length > 0) {
          simulationList[0] = updatedEntry;
        } else {
          simulationList.push(updatedEntry);
        }
        
        localStorage.setItem('simulation_data', JSON.stringify(simulationList));

        const periodElement = document.querySelector(".period");
        if (periodElement) {
          const today = new Date();
          const day = String(today.getDate()).padStart(2, '0');
          const month = String(today.getMonth() + 1).padStart(2, '0');
          const year = today.getFullYear();
          periodElement.textContent = `${day}.${month}.${year}`;
        }

      };
      
      

    // Попытка загрузить из localStorage
    const cached = localStorage.getItem("options");
    const cachedTime = localStorage.getItem("options_timestamp");

    if (cached && cachedTime) {
      const age = Date.now() - parseInt(cachedTime);
      const maxAge = MAX_CACHE_AGE_MINUTES * 60 * 1000;

      if (age < maxAge) {
        try {
          const parsed = JSON.parse(cached);
          console.log("Загружено из localStorage");
          renderOptions(parsed);
          return;
        } catch (e) {
          console.warn("Ошибка парсинга options из localStorage:", e);
          localStorage.removeItem("options");
          localStorage.removeItem("options_timestamp");
        }
      } else {
        console.log("Кэш устарел — загружаем с сервера");
        localStorage.removeItem("options");
        localStorage.removeItem("options_timestamp");
      }
    }

    // Загрузка с сервера
    (async () => {
      const loader = document.getElementById("loader");
    
      try {
        loader.style.display = "flex";
    
        const res = await fetch("/api/options");
        if (!res.ok) throw new Error("Ошибка загрузки");
    
        const data = await res.json();
        localStorage.setItem("options", JSON.stringify(data));
        localStorage.setItem("options_timestamp", Date.now().toString());
        renderOptions(data);
      } catch (err) {
        console.error("Ошибка при получении данных:", err);
      } finally {
        loader.style.display = "none";
      }
    })();

});
  