

(function () {
  var root = document.documentElement;

  try {
    var storedTheme = localStorage.getItem("codexa-app-theme");
    var theme = ["light", "dark", "system"].indexOf(storedTheme) === -1
      ? "system"
      : storedTheme;
    var dark =
      theme === "dark" ||
      (theme === "system" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);
    root.classList.add(dark ? "dark" : "light");
  } catch (error) {
    root.classList.add("light");
  }

  try {
    var stored = localStorage.getItem("i18nextLng");
    var detected =
      stored ||
      (navigator.languages && navigator.languages[0]) ||
      navigator.language ||
      "en";
    // Keep in sync with LANGUAGES / RTL_LANGUAGES in src/i18n.ts.
    var base = String(detected).toLowerCase().split("-")[0];
    var lang = ["en", "ar", "ur"].indexOf(base) === -1 ? "en" : base;
    root.setAttribute("lang", lang);
    root.setAttribute("dir", lang === "ar" || lang === "ur" ? "rtl" : "ltr");
  } catch (error) {
    root.setAttribute("dir", "ltr");
  }
})();