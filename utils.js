export function decodeHTML(str) {
  const txt = document.createElement('textarea');
  txt.innerHTML = str;
  return txt.value;
}

export function escapeAttr(str) {
  return String(str).replace(/'/g, "&#39;").replace(/"/g, '&quot;');
}

export function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function showToast(message) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3100);
}
