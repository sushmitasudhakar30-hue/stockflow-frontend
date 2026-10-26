import { useCallback, useEffect, useState } from 'react';

/* useReveal — IntersectionObserver-based scroll reveal.
   Uses a callback ref so it still works when the element mounts later
   (e.g. after a loading skeleton, which is what happens on page refresh). */
export function useReveal(options = {}) {
  const [el, setEl] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const ref = useCallback((node) => setEl(node), []);

  useEffect(() => {
    if (!el || revealed) return;
    if (typeof IntersectionObserver === 'undefined') { setRevealed(true); return; }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRevealed(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, ...options }
    );
    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [el, revealed]);

  return [ref, revealed];
}

/* useCountUp — animate a number from 0 to target on first view */
export function useCountUp(target, duration = 1200) {
  const [value, setValue] = useState(0);
  const [started, setStarted] = useState(false);
  const [el, setEl] = useState(null);
  const ref = useCallback((node) => setEl(node), []);

  useEffect(() => {
    if (!el || started) return;
    if (typeof IntersectionObserver === 'undefined') { setStarted(true); return; }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStarted(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [el, started]);

  useEffect(() => {
    if (!started) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setValue(target);
      return;
    }
    let startTime;
    let raf;
    const animate = (ts) => {
      if (!startTime) startTime = ts;
      const progress = Math.min((ts - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [started, target, duration]);

  return [value, ref];
}

/* formatINR — Indian rupee formatting with en-IN grouping */
export function formatINR(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(num) {
  return new Intl.NumberFormat('en-IN').format(num);
}

export function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

/* useTheme — dark mode toggle with localStorage persistence */
export function useTheme() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('stockflow_theme') || 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('stockflow_theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  return { theme, toggleTheme };
}

/* Status helper for stock badges */
export function getStockStatus(totalStock, reorderLevel) {
  if (totalStock === 0) return { label: 'Out of stock', variant: 'danger' };
  if (totalStock <= reorderLevel) return { label: 'Low stock', variant: 'warning' };
  return { label: 'In stock', variant: 'success' };
}
