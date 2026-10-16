<!--{ "layout": "full-screen", "header": false, "parent": "Documentation System", "order": 95, "title": "Page without the header", "description": "A page using header: false with layout: full-screen — no site chrome at all, for an app page with its own toolbar." }-->

<div class="nh-demo">
  <p>
    No header, no nav: the page is all app.
    <small><a href="/documentation-system/">Back to the Documentation System</a></small>
  </p>
</div>

<style>
  /* With the header gone, .doc-content is the whole window, so 100% is the viewport. */
  .nh-demo {
    height: 100%;
    margin: 0;
    width: 100%;
    min-height: 20rem;
    display: grid;
    place-items: center;
    background: linear-gradient(135deg, #d2640033, #a000d233);
    box-sizing: border-box;
    padding: 2rem;
  }
  .nh-demo p {
    margin: 0;
    text-align: center;
    font: 600 clamp(1.25rem, 4vw, 2.5rem) / 1.3 system-ui, sans-serif;
  }
  .nh-demo small {
    display: block;
    margin-top: 1rem;
    font-size: 1rem;
    font-weight: 400;
  }
</style>

This page sets `"header": false` as well as `"layout": "full-screen"`, so it has no site chrome.
A page that hides the header links back to the docs in its own way, as this one does.
