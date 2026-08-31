import { createRoot } from "react-dom/client";
import App from "./app/App";
import "./styles/index.css";

// PostHog analytics — only injects when VITE_POSTHOG_KEY is set
// No npm package needed; uses the official PostHog snippet injected into the page
const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
const isControlledDemoPath = typeof window !== "undefined"
  && (window.location.pathname === "/demo" || window.location.pathname.startsWith("/demo/"));
if (POSTHOG_KEY && typeof window !== "undefined" && !isControlledDemoPath) {
  try {
    const script = document.createElement("script");
    script.innerHTML = `
        !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]);t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+" (stub)"},o="init me ws ys dispose debug identify group onFeatureFlags alias setPersonProperties groupIdentify capture createPersonProfile opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing clear_opt_in_out_capturing startSessionRecording stopSessionRecording".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
        posthog.init('${POSTHOG_KEY}',{api_host:'https://us.i.posthog.com',person_profiles:'identified_only',capture_pageview:true});
      `;
    document.head.appendChild(script);
  } catch {
    /* fail silently */
  }
}

createRoot(document.getElementById("root")!).render(<App />);
