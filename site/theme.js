try {
  const saved = localStorage.getItem('field-guide-theme');
  if (saved === 'light' || saved === 'dark') document.documentElement.dataset.theme = saved;
} catch { /* Use the default theme when storage is unavailable. */ }
