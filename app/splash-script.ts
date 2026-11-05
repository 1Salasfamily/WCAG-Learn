// The logo intro plays once per browser session, on a full load of the start
// page. This runs inline before first paint (like the theme no-flash script)
// so the overlay is already covering the page when it first appears; the
// Splash component then runs the timeline and takes the overlay down.
export const SPLASH_KEY = "wcag-learn:splash:v1";

export const SPLASH_SCRIPT = `(function(){try{if(location.pathname!=="/")return;if(window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches)return;if(sessionStorage.getItem(${JSON.stringify(
  SPLASH_KEY
)}))return;document.documentElement.setAttribute("data-splash","play")}catch(e){}})();`;
