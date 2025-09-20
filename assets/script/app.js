const routes = {
  '/': '/pages/home.html',
  '/main-list': '/pages/lists/main-list.html',
  '/extended-list': '/pages/lists/extended-list.html',
  '/full-list': '/pages/lists/full-list.html',
  // '/level': '/pages/level.html',
  '/roulette': '/pages/roulette.html',
  '/error': '/pages/error.html'
};

function stripOrigin(path) {
  try {
    const url = new URL(path);
    return url.pathname + url.search + url.hash;
  } catch (e) {
    return path;
  }
}

function splitPathAndQuery(rawPath) {
  const path = stripOrigin(rawPath);
  const idxQ = path.indexOf('?');
  const idxA = path.indexOf('&');
  const indices = [idxQ, idxA].filter(i => i !== -1);
  const sepIndex = indices.length ? Math.min(...indices) : -1;

  if (sepIndex === -1) return { pathname: path || '/', queryString: '' };
  return {
    pathname: path.slice(0, sepIndex) || '/',
    queryString: path.slice(sepIndex + 1)
  };
}

function resolveAgainstPage(pageUrl, resourceHref) {
  const base = new URL(pageUrl, window.location.origin);
  return new URL(resourceHref, base).href;
}

async function loadHeader() {
  try {
    const navbar = document.querySelector('.navbar');
    if (!navbar) return;

    const resp = await fetch('/pages/templates/header.html', { cache: 'no-store' });
    if (resp.ok) {
      navbar.innerHTML = await resp.text();
    } else {
      console.warn('Не удалось загрузить header.html:', resp.status);
    }
  } catch (e) {
    console.error('Ошибка загрузки header.html:', e);
  }
}

async function loadPage(rawPath) {
  try {
    const { pathname, queryString } = splitPathAndQuery(rawPath);
    const route = Object.keys(routes).find(r => r === pathname);
    if (!route) {
      return loadPage('/error'); // при неизвестном пути
    }

    const pageUrl = routes[route];
    const resp = await fetch(pageUrl, { cache: 'no-store' });
    if (!resp.ok) {
      return loadPage('/error'); // при ошибке загрузки страницы
    }

    const htmlText = await resp.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlText, 'text/html');

    const newTitle = doc.querySelector('title')?.textContent;
    if (newTitle) document.title = newTitle;

    doc.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
      const href = link.getAttribute('href');
      if (!href) return;
      const absHref = resolveAgainstPage(pageUrl, href);
      if (!document.head.querySelector(`link[rel="stylesheet"][href="${absHref}"]`)) {
        const newLink = document.createElement('link');
        newLink.rel = 'stylesheet';
        newLink.href = absHref;
        document.head.appendChild(newLink);
      }
    });

    const app = document.getElementById('app');
    app.innerHTML = doc.body.innerHTML;

    window.__spaQueryString = queryString;
    window.__spaParams = new URLSearchParams(queryString);

    const scripts = Array.from(doc.querySelectorAll('script'));
    for (const oldScript of scripts) {
      const newScript = document.createElement('script');

      if (oldScript.type) newScript.type = oldScript.type;
      if (oldScript.noModule) newScript.noModule = true;
      if (oldScript.defer) newScript.defer = true;

      const srcAttr = oldScript.getAttribute('src');
      if (srcAttr) {
        const absSrc = resolveAgainstPage(pageUrl, srcAttr);
        await new Promise(resolve => {
          newScript.async = false;
          newScript.src = absSrc;
          newScript.onload = () => resolve();
          newScript.onerror = () => {
            console.warn('Не удалось загрузить скрипт', absSrc);
            resolve();
          };
          document.body.appendChild(newScript);
        });
      } else {
        newScript.textContent = oldScript.textContent;
        document.body.appendChild(newScript);
      }
    }

    if (typeof window.onSpaPageLoaded === 'function') {
      try { window.onSpaPageLoaded({ pathname, queryString, pageUrl }); } catch (e) { console.error(e); }
    }

    await loadHeader();

  } catch (err) {
    console.error('Ошибка loadPage:', err);
    return loadPage('/error'); // при любой другой ошибке
  }
}

function navigate(event) {
  const anchor = event.target.closest ? event.target.closest('a') : null;
  if (!anchor) return;
  if (anchor.origin !== location.origin) return;
  if (anchor.target && anchor.target !== '' && anchor.target !== '_self') return;

  const href = anchor.getAttribute('href');
  if (!href) return;

  event.preventDefault();
  window.history.pushState({}, '', href);
  loadPage(href);
}

window.addEventListener('popstate', () => loadPage(location.pathname + location.search));
document.addEventListener('click', navigate);

loadPage(location.pathname + location.search);
