/** Native details semantics with interruptible open AND close animation. */
export function enhanceDisclosure(details) {
  if (!details) return;
  const summary = details.querySelector("summary");
  const body = details.querySelector(".detail-about-body");
  if (!summary || !body || typeof body.animate !== "function") return;
  let animation;
  let expanded = details.open;
  summary.addEventListener("click", (event) => {
    // Native summary synthesizes click for Enter/Space as well as pointer input.
    event.preventDefault();
    const startHeight = details.open ? body.getBoundingClientRect().height : 0;
    const startOpacity = details.open ? getComputedStyle(body).opacity : "0";
    if (animation) {
      animation.onfinish = null;
      animation.cancel();
      animation = undefined;
    }
    expanded = !expanded;
    details.dataset.expanded = String(expanded);
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      details.open = expanded;
      return;
    }
    // Keep content in layout until closing finishes, then return to native state.
    details.open = true;
    animation = body.animate([
      { height: `${startHeight}px`, opacity: startOpacity },
      { height: `${expanded ? body.scrollHeight : 0}px`, opacity: expanded ? 1 : 0 },
    ], { duration: 260, easing: "cubic-bezier(0.32, 0.72, 0, 1)" });
    animation.onfinish = () => {
      details.open = expanded;
      animation = undefined;
    };
  });
}
