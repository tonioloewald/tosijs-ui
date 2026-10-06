# sidebar

The default layout for iOS / iPadOS apps is to hide the sidebar when displaying content on small
screens, and display the sidebar when space is available (with the user able to explicitly hide
the sidebar if so desired). `<tosi-sidenav>` provides this functionality.

`<tosi-sidenav>` is used to handle the layout of the documentation tab panel.

`<tosi-sidenav>`'s behavior is controlled by two attributes, `minSize` is the point at which it will toggle between showing the navigation
sidebar and content, while `navSize` is the width of the sidebar. You can interrogate its `compact` property to find out if it's
currently in `compact` form.

`navVisible` is the control you want for a "show me the navigation" button: read it, flip it.
It resolves what hiding the nav actually means at the current width — forcing compact mode on a
wide screen, simply showing the content on a narrow one — so a caller never has to. A toggle
button is one line:

```javascript
sidenav.navVisible = !sidenav.navVisible
```

Underneath it, `alwaysCompact` keeps the sidenav compact at any width: nav and content take
turns regardless of how much room there is, and `contentVisible` picks which you see. That is
how the doc-system's `layout: "full-screen"` pages give the content the whole viewport. It is a
named state rather than a `minSize` no viewport can reach, because the second one works and
reads as a bug.
