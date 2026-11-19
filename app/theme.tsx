"use client";

import { useEffect, useState } from "react";

export function usePrintTheme() {
  const [light, setLight] = useState(false);

  useEffect(() => {
    setLight(document.documentElement.getAttribute("data-theme") === "light");
  }, []);

  function toggle() {
    const next = !light;
    setLight(next);
    if (next) {
      localStorage.setItem("printit-theme", "light");
      document.documentElement.setAttribute("data-theme", "light");
    } else {
      localStorage.removeItem("printit-theme");
      document.documentElement.removeAttribute("data-theme");
    }
  }

  return { light, toggle };
}

export function BrandLogo() {
  return (
    <>
      <img className="rev-logo rev-logo-dark" src="/revision/logo-dark.png" alt="Print It" />
      <img className="rev-logo rev-logo-light" src="/revision/logo-light.png" alt="" aria-hidden="true" />
    </>
  );
}

export function ThemeButton() {
  const { light, toggle } = usePrintTheme();
  return (
    <button type="button" className="rev-theme" onClick={toggle} aria-pressed={light}>
      {light ? "Modo oscuro" : "Modo claro"}
    </button>
  );
}
