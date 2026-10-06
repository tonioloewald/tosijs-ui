<!--{ "layout": "full-screen", "parent": "Appendices", "order": 900, "title": "Full-screen layout", "description": "A page using layout: full-screen — no reading measure, no nav, the content is the viewport." }-->

<div class="fs-demo">
  <p>
    This box is the whole window.
    <small>No 44&nbsp;em column, no sidebar. Press <b>☰</b> for the navigation.</small>
  </p>
</div>

<style>
  /* Fill the content area. `layout: "full-screen"` gives .doc-content the full height, so a
     child can take 100% of it — in the reading column this would just be a tall box. */
  .fs-demo {
    height: 100%;
    /* Edge to edge — prose block margins would otherwise inset it by a rem each side, which
       reads as a gap around a thing whose whole point is filling the window. */
    margin: 0;
    width: 100%;
    min-height: 20rem;
    display: grid;
    place-items: center;
    background: linear-gradient(135deg, #0064d233, #00d2a033);
    box-sizing: border-box;
    padding: 2rem;
  }
  .fs-demo p {
    margin: 0;
    text-align: center;
    font: 600 clamp(1.25rem, 4vw, 2.5rem) / 1.3 system-ui, sans-serif;
  }
  .fs-demo small {
    display: block;
    margin-top: 0.75em;
    font-weight: 400;
    font-size: clamp(0.9rem, 1.6vw, 1.1rem);
    opacity: 0.75;
  }
</style>
