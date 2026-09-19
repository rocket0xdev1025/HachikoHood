/* Hero "Play Game and Earn!" always lands on the film band (#game). */
(() => {
  const pick = (s) => document.querySelector(s);
  const calm = () =>
    !!(
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );

  const cta = pick("#play-cta"),
    game = pick("#game");
  if (cta && game)
    cta.addEventListener("click", (e) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
      e.preventDefault();
      game.scrollIntoView({
        behavior: calm() ? "auto" : "smooth",
        block: "start",
      });
      if (history.replaceState) history.replaceState(null, "", "#game");
    });

  const film = pick(".game-film-video");
  if (film && calm()) {
    film.removeAttribute("autoplay");
    film.pause();
  }
})();
