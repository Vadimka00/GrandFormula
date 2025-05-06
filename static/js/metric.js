document.addEventListener('DOMContentLoaded', () => {
  const metricsList = document.querySelector('.metrics-list');
  const CACHE_KEY = 'metrics';
  const CACHE_TTL_MINUTES = 10;

  async function fetchMetrics() {
    let metrics = null;
    const cache = localStorage.getItem(CACHE_KEY);
    const cacheTime = localStorage.getItem(`${CACHE_KEY}_timestamp`);

    const isCacheFresh = cache && cacheTime &&
      (Date.now() - parseInt(cacheTime)) < CACHE_TTL_MINUTES * 60 * 1000;

    if (isCacheFresh) {
      try {
        metrics = JSON.parse(cache);
        console.log('Метрики из localStorage');
      } catch (err) {
        console.warn('Невозможно распарсить кэш метрик, удаляю:', err);
        localStorage.removeItem(CACHE_KEY);
        localStorage.removeItem(`${CACHE_KEY}_timestamp`);
      }
    }

    // Если нет кэша или он битый/устарел
    if (!metrics) {
      try {
        const response = await fetch('/api/metrics');
        metrics = await response.json();
        localStorage.setItem(CACHE_KEY, JSON.stringify(metrics));
        localStorage.setItem(`${CACHE_KEY}_timestamp`, Date.now().toString());
        console.log('Метрики с сервера');
      } catch (err) {
        console.error('Ошибка при загрузке метрик:', err);
        return;
      }
    }

    updateMetrics(metrics);
  }

  function updateMetrics(metrics) {
    metrics.forEach(metric => {
      const title = metric.metric_title;
      const metricItem = metricsList.querySelector(`[data-title="${title}"]`);

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

      const sliderGroup = document.querySelector(`.slider-group[data-title="${title}"]`);
      if (sliderGroup) {
        const tooltip = sliderGroup.querySelector('.tooltip');
        if (tooltip) tooltip.innerText = metric.tooltip;
      }
    });
  }

  window.updateMetrics = updateMetrics;

  fetchMetrics();
});