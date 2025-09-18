(function () {
  function paramsFromLocation() {
    let params = new URLSearchParams(window.location.search || '');

    if ((!params.has('id') || !params.toString()) && window.__spaParams) {
      params = window.__spaParams;
    }

    if (!params.has('id')) {
      const p = window.location.pathname || '';
      const idx = p.indexOf('&');
      if (idx !== -1) {
        params = new URLSearchParams(p.slice(idx + 1));
      }
    }

    return params;
  }

  function init() {
    const params = paramsFromLocation();
    const levelId = params.get('id');
    console.log('ID уровня:', levelId);

    const el = document.getElementById('level-id-display');
    if (el) el.textContent = levelId ?? '—';
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
