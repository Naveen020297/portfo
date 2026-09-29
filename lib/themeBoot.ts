// Server-safe: imported by the root layout, so no hooks or browser APIs here.

export const THEME_KEY = "gforce-theme";

/** Runs in <head> before first paint so the page never flashes the wrong theme. */
export const THEME_BOOT = `(function(){try{var t=localStorage.getItem("${THEME_KEY}");if(t!=="light"&&t!=="dark")t=matchMedia("(prefers-color-scheme: light)").matches?"light":"dark";var d=document.documentElement;d.dataset.theme=t;d.style.colorScheme=t}catch(e){}})()`;
