<!--{"pin":"top","order":600,"title":"One Source","description":"How the tosijs doc system turns a single corpus of doc-comments and markdown into a static SEO site, a self-testing live playground with in-browser TypeScript, an ePub and PDF, and an agent-debuggable page — all deploying as static files."}-->

# One Source

## Every Artifact

Here is an honest description of this documentation system, and it will sound
like lying:

It is a **one-step build** that produces a fast, SEO-friendly website; the same
site is a **test bed** that runs and asserts its own examples; those examples are
**live and editable**, and your edits **save back to the source**; the whole
corpus also publishes as an **ePub and a PDF**, and the examples in the book
**link back** to their live versions; a coding **agent can drive the running
page** — read the DOM, run JS, screen-capture it; and the examples **transpile
TypeScript in your browser**, with no server anywhere. The deploy target for all
of it is **a folder of static files.**

That list reads like a pitch because each item is normally somebody's whole
product, and products that claim seven things are usually bad at seven things.
So here is *why it's true*, which is the only thing that makes it believable.

## It's not seven features. It's one mechanism.

Every capability above is a **projection of a single source**. You write markdown
files and `/*#` doc-comments in your code. One extraction pass reads that corpus,
and everything else is a different way of *weaving* the same input:

- a hydrating single-page doc browser
- pre-rendered, per-page HTML for search engines, agents, and no-JS readers
- a browser test suite (the examples run and assert)
- an ePub and a PDF of the whole corpus
- live, editable examples that save back to source
- an agent-inspectable running page

Nobody is *integrating* these outputs. They fall out of the same pass, so the
marginal cost of each is roughly zero. Add a doc-comment and you have
simultaneously written a web page, a test, a book chapter, and a playground.

## The whole thing, running inside itself

The clearest demo is the system embedded in its own page. Below is a complete,
live `<tosi-doc-system>` — the same browser you're reading this in — loading the
same corpus, in an isolated (memory-routed) instance. It runs its own live
examples, transpiles their TypeScript in your browser, and needs no server:

```html
<tosi-doc-system docs="/docs.json" routing="memory" route="data-table"
  style="display:block; height:520px; border-radius:8px; overflow:hidden; box-shadow:0 2px 16px #0004">
</tosi-doc-system>
```

That is the tell that it's honest engineering rather than a kitchen sink: the
things that are expensive to maintain separately are here *free*, because they
are not separate — the page can contain the entire system.

## …therefore what you get

**It's just static files.** The site is pre-rendered — one real HTML page per
doc, with proper `<head>` metadata, readable with JavaScript disabled, plus
`sitemap.xml`, `robots.txt`, and an `llms.txt` index for agents. "SEO" here is
just "we wrote the page out as HTML," which is exactly why it is so effective and
so boring to explain. When the bundle loads, the static page **hydrates** into
the live doc browser with no flash.

**The examples are live, and they test themselves.** The code blocks you read are
executed in the page; assertions in them become part of a browser test suite. The
documentation cannot drift from the code, because the documentation *is* the code,
and it runs.

**They transpile TypeScript in the browser — with no backend.** This is the
keystone, because "run my TypeScript examples" is exactly where a doc site
normally sprouts infrastructure: a sandbox service, a compile endpoint, a
container to keep alive and pay for. Instead the transpiler ships as a
self-contained browser bundle, and the TypeScript compiler loads as a *static
asset* — lazily, cached same-origin, only when a `ts` example actually needs it.
Nothing computes on a server. Splitting the compiler out is a *payload
optimization, not a dependency*: inline it and you have a fully offline build at
ordinary single-page-app weight. A stock front-end app ships several hundred
kilobytes of framework and tooling exhaust *to render a page*; this ships
comparable weight, and the payload **is** a TypeScript compiler, a test runner, a
live-example engine, and a literate-programming environment.

**You can edit the examples and save them.** In dev, the running page can write an
edited example back to its source file; the build rebuilds and the page refreshes.
The preview *is* the edit loop.

**It publishes as a book.** The whole corpus becomes an ePub (with a generated
cover) and, via the browser's Print, a PDF. Examples in the book **deep-link back
to their live, editable versions** on the site.

**An agent can debug it.** Turn on `haltijaDev` and the dev server gives a coding
agent eyes and hands on the *actual running page* — live DOM, console, network,
and screen capture — with no browser extension and nothing added to your bundle.

## Literate programming that finally has somewhere to live

The idea is old and keeps getting reinvented, always brilliantly, always
incompletely, always at the cost of a bespoke apparatus:

- **Donald Knuth's WEB** (1984) gave us *literate programming*: one source, with
  `weave` producing typeset documentation and `tangle` producing compilable code.
  It needed the WEB toolchain and TeX, and the program lived in a format that was
  neither quite prose nor quite code.
- **Niklaus Wirth's Oberon** — a language *and* an operating system published as a
  book (*Project Oberon*), a self-documenting, self-contained system — was as
  complete a realization of the dream as anyone has managed. It ran on bespoke
  hardware and its own environment; you could admire it, not deploy it.
- **Examples-as-tests** — Python's `doctest`, Rust's `rustdoc` doctests, Elixir's
  doctests — run the code in your docs as part of the suite. Real, and narrow:
  compile/runtime-specific, and never *live and editable in the reader's browser*.
- **Storybook** renders components in isolation with docs beside them — but it's a
  separate build and app, not your documentation, and not literate: the docs are
  not the source.
- **Docs-with-live-code** (MDX, Docusaurus) marry markdown and components, but need
  a heavy build, and executable code still wants a sandbox service.
- **Notebooks** — Jupyter (a bespoke kernel and runtime), Observable (reactive JS,
  but a hosted, bespoke format), `nbdev` (literate programming that emits a
  package, docs, and tests — atop the notebook toolchain) — get *closest* to
  "one source, many artifacts," and each still stands on a platform of its own.

Every one of these nailed a slice — weave/tangle, examples-as-tests, live editable
code, component preview — and every one demanded special tooling, a bespoke
runtime, or a machine you can't get to. This does what all of them do, **at once,
from one source**, and it runs **in a browser, in the languages you already know**
(HTML, CSS, JavaScript, TypeScript), deploying as static files to any host on the
most widely deployed runtime on Earth. The idea was never the problem. The address
was.

So, once more, and it is all true at the same time:

> **One corpus → an SEO site, a book, a PDF, a self-testing live playground with
> in-browser TypeScript, and an agent that can drive it — deploying as static
> files.**

It sounds like lying because each piece is someone's whole company, and you get
them as side effects of writing a doc-comment.
