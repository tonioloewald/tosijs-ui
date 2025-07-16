/*#
# blueprint loading

<center>
  <xin-icon icon="blueprint" class="logo" size=256></xin-icon>
</center>

`<xin-loader>` and `<xin-blueprint>` are simple elements provided by `tosijs` for the dynamic loading
of component **blueprints**.

```html
<xin-loader>
  <xin-blueprint tag="swiss-clock" src="https://tonioloewald.github.io/xin-clock/dist/blueprint.js"></xin-blueprint>
</xin-loader>
<swiss-clock></swiss-clock>
```

## Attributes

- `blueprint` is the url of the `blueprint` javascript module (required)
- `tag` is the tagName you wish to use. If the name of the blueprint is
  hyphenated, then that will be used by default
- `property` if the blueprint module exports the blueprint function as
  a property, you can specify the property here.
*/
