<!--{"pin":"top","order":2,"title":"One Source, Every Artifact","description":"How the tosijs doc system turns a single corpus of doc-comments and markdown into a static SEO site, a self-testing live playground with in-browser TypeScript, an ePub and PDF, and an agent-debuggable page — all deploying as static files."}-->

# One Source, Every Artifact

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

Every capability above is a **projection of a single source**. You write
markdown files and `/*#` doc-comments in your code. One extraction pass reads
that corpus, and everything else is a different way of *weaving* the same input:

- a hydrating single-page doc browser
- pre-rendered, per-page HTML for search engines, agents, and no-JS readers
- a browser test suite (the examples run and assert)
- an ePub and a PDF of the whole corpus
- live, editable examples that save back to source
- an agent-inspectable running page

Nobody is *integrating* these outputs. They fall out of the same pass, so the
marginal cost of each is roughly zero. Add a doc-comment and you have
simultaneously written a web page, a test, a book chapter, and a playground.
That's the tell that it's honest engineering rather than a kitchen sink: the
things that are expensive to maintain separately are here *free*, because they
are not separate.

## …therefore what you get

**It's just static files.** The site is pre-rendered — one real HTML page per
doc, with proper `<head>` metadata, readable with JavaScript disabled, plus
`sitemap.xml`, `robots.txt`, and an `llms.txt` index for agents. "SEO" here is
just "we wrote the page out as HTML," which is exactly why it is so effective and
so boring to explain. When the bundle loads, the static page **hydrates** into
the live doc browser with no flash.

**The examples are live, and they test themselves.** The code blocks you read
are executed in the page; assertions in them become part of a browser test
suite. The documentation cannot drift from the code, because the documentation
*is* the code, and it runs.

**They transpile TypeScript in the browser — with no backend.** This is the
keystone, because "run my TypeScript examples" is exactly where a doc site
normally sprouts infrastructure: a sandbox service, a compile endpoint, a
container to keep alive and pay for. Instead the transpiler ships as a
self-contained browser bundle, and the TypeScript compiler loads as a *static
asset* — lazily, cached same-origin, only when a `ts` example actually needs it.
Nothing computes on a server. The example just below transpiled in your browser
a moment ago:

```ts
// TypeScript — transpiled in your browser, no server, then run:
const artifacts: string[] = ['site', 'book', 'PDF', 'tests', 'live examples', 'agent']
preview.append(
  Object.assign(document.createElement('p'), {
    textContent: `${artifacts.length} artifacts from one source — ${artifacts.join(', ')}`,
  })
)
```

Splitting the compiler out is a *payload optimization, not a dependency*: inline
it and you have a fully offline build at ordinary single-page-app weight. Which
sets up the comparison that does the damage — a stock front-end app ships several
hundred kilobytes of framework and tooling exhaust *to render a page*; this ships
comparable weight, and the payload **is** a TypeScript compiler, a test runner, a
live-example engine, and a literate-programming environment. Same budget everyone
already pays without blinking; an order of magnitude more in return.

**You can edit the examples and save them.** In dev, the running page can write
an edited example back to its source file; the build rebuilds and the page
refreshes. The preview *is* the edit loop.

**It publishes as a book.** The whole corpus becomes an ePub (with a generated
cover) and, via the browser's Print, a PDF. Examples in the book **deep-link back
to their live, editable versions** on the site — so a reader is one tap from
running the thing they're reading about.

**An agent can debug it.** Turn on `haltijaDev` and the dev server gives a coding
agent eyes and hands on the *actual running page* — live DOM, console, network,
and screen capture — with no browser extension and nothing added to your bundle.

## Literate programming that finally has somewhere to live

This is Knuth's idea — one source, woven into a document and tangled into a
program — except the weave targets are a website, a book, and a test harness, and
the substrate is the most widely deployed runtime on Earth. WEB, Oberon, Lilith:
all real, all beautiful, all stranded on bespoke machines nobody could get to.
The idea was never the problem. The address was. This is that idea shipped to a
place everyone already is.

So, once more, and it is all true at the same time:

> **One corpus → an SEO site, a book, a PDF, a self-testing live playground with
> in-browser TypeScript, and an agent that can drive it — deploying as static
> files.**

It sounds like lying because each piece is someone's whole company, and you get
them as side effects of writing a doc-comment.
