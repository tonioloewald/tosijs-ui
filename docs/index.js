var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, {
      get: all[name],
      enumerable: true,
      configurable: true,
      set: (newValue) => all[name] = () => newValue
    });
};

// ../xinjs/dist/module.js
var exports_module = {};
__export(exports_module, {
  xinValue: () => Oe,
  xinProxy: () => ie,
  xinPath: () => Ze,
  xin: () => u,
  warnDeprecated: () => J,
  version: () => re,
  vars: () => Uo,
  varDefault: () => uo,
  validateAgainstConstraints: () => No,
  updates: () => le,
  unobserve: () => W,
  touchElement: () => _o,
  touch: () => I,
  tosiValue: () => E,
  tosiSetValue: () => Ge,
  tosiPath: () => M,
  tosi: () => Co,
  throttle: () => mo,
  svgElements: () => Ko,
  settings: () => G,
  on: () => V,
  observe: () => Bo,
  mathML: () => Io,
  makeComponent: () => po,
  invertLuminance: () => cn,
  initVars: () => tn,
  hotReload: () => Tn,
  getListItem: () => vo,
  getListInstance: () => Vo,
  getListBinding: () => yo,
  getCssVar: () => Zo,
  elements: () => y,
  deprecated: () => Ho,
  deleteListItem: () => En,
  debounce: () => Wo,
  css: () => B,
  boxedProxy: () => Eo,
  boxed: () => v,
  blueprintLoader: () => Hn,
  blueprint: () => Sn,
  bindings: () => lo,
  bind: () => H,
  StyleSheet: () => nn,
  MoreMath: () => on,
  Component: () => F,
  Color: () => l,
  BlueprintLoader: () => te,
  Blueprint: () => xo
});
function X(o) {
  if (o == null || typeof o !== "object")
    return o;
  if (o instanceof Set)
    return new Set(o);
  else if (Array.isArray(o))
    return o.map(X);
  let e = {};
  for (let n in o) {
    let r = o[n];
    if (o != null && typeof o === "object")
      e[n] = X(r);
    else
      e[n] = r;
  }
  return e;
}
var bo = "-xin-data";
var Y = `.${bo}`;
var Mo = "-xin-event";
var To = `.${Mo}`;
var a = Symbol.for("xin-path");
var g = Symbol.for("xin-value");
var Lo = "xinObserve";
var ko = "xinBind";
var So = "xinOn";
var _ = Symbol("list-binding");
var so = Symbol("list-instance");
var ce = new Set;
function J(o, e) {
  if (!ce.has(o))
    console.warn(e), ce.add(o);
}
function Ho(o, e) {
  let n = false;
  return (...r) => {
    if (!n)
      console.warn(e), n = true;
    return o(...r);
  };
}
var M = (o) => {
  return o && o[a] || undefined;
};
function E(o) {
  if (typeof o === "object" && o !== null) {
    let e = o[g];
    return e !== undefined ? e : o;
  }
  return o;
}
function Ge(o, e) {
  if (M(o) === undefined)
    throw Error("tosiSetValue requires a xin or boxed proxy");
  o[g] = e;
}
var Ze = Ho(M, "xinPath is deprecated. Use tosiPath instead.");
var Oe = Ho(E, "xinValue is deprecated. Use tosiValue instead.");
var Q = new WeakMap;
var $ = new WeakMap;
var q = (o) => {
  let e = o.cloneNode();
  if (e instanceof Element) {
    let n = $.get(o), r = Q.get(o);
    if (n != null)
      $.set(e, X(n));
    if (r != null)
      Q.set(e, X(r));
  }
  for (let n of Array.from(o instanceof HTMLTemplateElement ? o.content.childNodes : o.childNodes))
    if (n instanceof Element || n instanceof DocumentFragment)
      e.appendChild(q(n));
    else
      e.appendChild(n.cloneNode());
  return e;
};
var G = { debug: false, perf: false };
var fe = Symbol("observer should be removed");
var to = [];
var co = [];
var Xo = false;
var $o;
var go;

class me {
  description;
  test;
  callback;
  constructor(o, e) {
    let n = typeof e === "string" ? `"${e}"` : `function ${e.name}`, r;
    if (typeof o === "string")
      this.test = (i) => typeof i === "string" && i !== "" && (o.startsWith(i) || i.startsWith(o)), r = `test = "${o}"`;
    else if (o instanceof RegExp)
      this.test = o.test.bind(o), r = `test = "${o.toString()}"`;
    else if (o instanceof Function)
      this.test = o, r = `test = function ${o.name}`;
    else
      throw Error("expect listener test to be a string, RegExp, or test function");
    if (this.description = `${r}, ${n}`, typeof e === "function")
      this.callback = e;
    else
      throw Error("expect callback to be a path or function");
    to.push(this);
  }
}
var le = async () => {
  if ($o === undefined)
    return;
  await $o;
};
var Ue = () => {
  if (G.perf)
    console.time("xin async update");
  let o = Array.from(co);
  for (let e of o)
    to.filter((n) => {
      let r;
      try {
        r = n.test(e);
      } catch (i) {
        throw Error(`Listener ${n.description} threw "${i}" at "${e}"`);
      }
      if (r === fe)
        return W(n), false;
      return r;
    }).forEach((n) => {
      let r;
      try {
        r = n.callback(e);
      } catch (i) {
        console.error(`Listener ${n.description} threw "${i}" handling "${e}"`);
      }
      if (r === fe)
        W(n);
    });
  if (co.splice(0), Xo = false, typeof go === "function")
    go();
  if (G.perf)
    console.timeEnd("xin async update");
};
var I = (o) => {
  let e = typeof o === "string" ? o : M(o);
  if (e === undefined)
    throw console.error("touch was called on an invalid target", o), Error("touch was called on an invalid target");
  if (Xo === false)
    $o = new Promise((n) => {
      go = n;
    }), Xo = setTimeout(Ue);
  if (co.find((n) => e.startsWith(n)) == null)
    co.push(e);
};
var j = (o, e) => {
  return new me(o, e);
};
var W = (o) => {
  let e = to.indexOf(o);
  if (e > -1)
    to.splice(e, 1);
  else
    throw Error("unobserve failed, listener not found");
};
var N = {};
var zo = null;
var de = (o) => {
  zo = o;
};
var fo = () => {
  if (zo === null)
    throw Error("xin proxy not initialized");
  return zo;
};
var Do = null;
var Fo = null;
var ye = (o, e) => {
  Do = o, Fo = e;
};
var oo = () => {
  if (Do === null)
    throw Error("bind not initialized");
  return Do;
};
var eo = () => {
  if (Fo === null)
    throw Error("on not initialized");
  return Fo;
};
var Yo = (o, e) => {
  let n = new Event(e);
  o.dispatchEvent(n);
};
var he = (o) => {
  if (o instanceof HTMLInputElement)
    return o.type;
  else if (o instanceof HTMLSelectElement && o.hasAttribute("multiple"))
    return "multi-select";
  else
    return "other";
};
var we = (o, e) => {
  switch (he(o)) {
    case "radio":
      o.checked = o.value === e;
      break;
    case "checkbox":
      o.checked = !!e;
      break;
    case "date":
      o.valueAsDate = new Date(e);
      break;
    case "multi-select":
      for (let n of Array.from(o.querySelectorAll("option")))
        n.selected = e[n.value];
      break;
    default:
      o.value = e;
  }
};
var Ce = (o) => {
  switch (he(o)) {
    case "radio": {
      let e = o.parentElement?.querySelector(`[name="${o.name}"]:checked`);
      return e != null ? e.value : null;
    }
    case "checkbox":
      return o.checked;
    case "date":
      return o.valueAsDate?.toISOString();
    case "multi-select":
      return Array.from(o.querySelectorAll("option")).reduce((e, n) => {
        return e[n.value] = n.selected, e;
      }, {});
    default:
      return o.value;
  }
};
var { ResizeObserver: ue } = globalThis;
var no = ue != null ? new ue((o) => {
  for (let e of o) {
    let n = e.target;
    Yo(n, "resize");
  }
}) : { observe() {}, unobserve() {} };
var Jo = (o, e, n = true) => {
  if (o != null && e != null)
    if (typeof e === "string")
      o.textContent = e;
    else if (Array.isArray(e))
      e.forEach((r) => {
        o.append(r instanceof Node && n ? q(r) : r);
      });
    else if (e instanceof Node)
      o.append(n ? q(e) : e);
    else
      throw Error("expect text content or document node");
};
var Wo = (o, e = 250) => {
  let n;
  return (...r) => {
    if (n !== undefined)
      clearTimeout(n);
    n = setTimeout(() => {
      o(...r);
    }, e);
  };
};
var mo = (o, e = 250) => {
  let n, r = Date.now() - e, i = false;
  return (...s) => {
    if (clearTimeout(n), n = setTimeout(() => {
      o(...s), r = Date.now();
    }, e), !i && Date.now() - r >= e) {
      i = true;
      try {
        o(...s), r = Date.now();
      } finally {
        i = false;
      }
    }
  };
};
var Ae = (o) => {
  try {
    return JSON.stringify(o);
  } catch (e) {
    return "{has circular references}";
  }
};
var jo = (...o) => Error(o.map(Ae).join(" "));
var Re = () => new Date(parseInt("1000000000", 36) + Date.now()).valueOf().toString(36).slice(1);
var Ke = 0;
var Ie = () => (parseInt("10000", 36) + ++Ke).toString(36).slice(-5);
var Pe = () => Re() + Ie();
var qo = Symbol("delete");
var xe = Symbol("new-object");
var Qo = Symbol("automatic-index");
function ae(o) {
  if (o === "")
    return [];
  if (Array.isArray(o))
    return o;
  else {
    let e = [];
    while (o.length > 0) {
      let n = o.search(/\[[^\]]+\]/);
      if (n === -1) {
        e.push(o.split("."));
        break;
      } else {
        let r = o.slice(0, n);
        if (o = o.slice(n), r !== "")
          e.push(r.split("."));
        if (n = o.indexOf("]") + 1, e.push(o.slice(1, n - 1)), o.slice(n, n + 1) === ".")
          n += 1;
        o = o.slice(n);
      }
    }
    return e;
  }
}
var z = new WeakMap;
function be(o, e) {
  if (z.get(o) === undefined)
    z.set(o, {});
  if (z.get(o)[e] === undefined)
    z.get(o)[e] = {};
  let n = z.get(o)[e];
  if (e === "_auto_")
    o.forEach((r, i) => {
      if (r[Qo] === undefined)
        r[Qo] = Pe();
      n[r[Qo] + ""] = i;
    });
  else
    o.forEach((r, i) => {
      n[Z(r, e) + ""] = i;
    });
  return n;
}
function Be(o, e) {
  if (z.get(o) === undefined || z.get(o)[e] === undefined)
    return be(o, e);
  else
    return z.get(o)[e];
}
function Ve(o, e, n) {
  n = n + "";
  let r = Be(o, e)[n];
  if (r === undefined || Z(o[r], e) + "" !== n)
    r = be(o, e)[n];
  return r;
}
function ve(o, e, n) {
  if (o[e] === undefined && n !== undefined)
    o[e] = n;
  return o[e];
}
function Me(o, e, n, r) {
  let i = e !== "" ? Ve(o, e, n) : n;
  if (r === qo)
    return o.splice(i, 1), z.delete(o), Symbol("deleted");
  else if (r === xe) {
    if (e === "" && o[i] === undefined)
      o[i] = {};
  } else if (r !== undefined)
    if (i !== undefined)
      o[i] = r;
    else if (e !== "" && Z(r, e) + "" === n + "")
      o.push(r), i = o.length - 1;
    else
      throw Error(`byIdPath insert failed at [${e}=${n}]`);
  return o[i];
}
function Ee(o) {
  if (!Array.isArray(o))
    throw jo("setByPath failed: expected array, found", o);
}
function pe(o) {
  if (o == null || !(o instanceof Object))
    throw jo("setByPath failed: expected Object, found", o);
}
function Z(o, e) {
  let n = ae(e), r = o, i, s, t, c;
  for (i = 0, s = n.length;r !== undefined && i < s; i++) {
    let f = n[i];
    if (Array.isArray(f))
      for (t = 0, c = f.length;r !== undefined && t < c; t++) {
        let m = f[t];
        r = r[m];
      }
    else if (r.length === 0) {
      if (r = r[Number(f.slice(1))], f[0] !== "=")
        return;
    } else if (f.includes("=")) {
      let [m, ...d] = f.split("=");
      r = Me(r, m, d.join("="));
    } else
      t = parseInt(f, 10), r = r[t];
  }
  return r;
}
function Te(o, e, n) {
  let r = o;
  if (e === "")
    throw Error("setByPath cannot be used to set the root object");
  let i = ae(e);
  while (r != null && i.length > 0) {
    let s = i.shift();
    if (typeof s === "string") {
      let t = s.indexOf("=");
      if (t > -1) {
        if (t === 0)
          pe(r);
        else
          Ee(r);
        let c = s.slice(0, t), f = s.slice(t + 1);
        if (r = Me(r, c, f, i.length > 0 ? xe : n), i.length === 0)
          return true;
      } else {
        Ee(r);
        let c = parseInt(s, 10);
        if (i.length > 0)
          r = r[c];
        else {
          if (n !== qo) {
            if (r[c] === n)
              return false;
            r[c] = n;
          } else
            r.splice(c, 1);
          return true;
        }
      }
    } else if (Array.isArray(s) && s.length > 0) {
      pe(r);
      while (s.length > 0) {
        let t = s.shift();
        if (s.length > 0 || i.length > 0)
          r = ve(r, t, s.length > 0 ? {} : []);
        else {
          if (n !== qo) {
            if (r[t] === n)
              return false;
            r[t] = n;
          } else {
            if (!Object.prototype.hasOwnProperty.call(r, t))
              return false;
            delete r[t];
          }
          return true;
        }
      }
    } else
      throw Error(`setByPath failed, bad path ${e}`);
  }
  throw Error(`setByPath(${o}, ${e}, ${n}) failed`);
}
var lo = { value: { toDOM: we, fromDOM(o) {
  return Ce(o);
} }, text: { toDOM(o, e) {
  o.textContent = e;
} }, enabled: { toDOM(o, e) {
  o.disabled = !e;
} }, disabled: { toDOM(o, e) {
  o.disabled = Boolean(e);
} }, list: { toDOM(o, e, n) {
  yo(o, e, n).update(e);
} } };
function x(o) {
  return o.replace(/[A-Z]/g, (e) => {
    return `-${e.toLocaleLowerCase()}`;
  });
}
function Go(o) {
  return o.replace(/-([a-z])/g, (e, n) => {
    return n.toLocaleUpperCase();
  });
}
var _e = 180 / Math.PI;
var Ne = Math.PI / 180;
function T(o, e, n) {
  return n < o ? NaN : e < o ? o : e > n ? n : e;
}
function D(o, e, n, r = true) {
  if (r)
    n = T(0, n, 1);
  return n * (e - o) + o;
}
var on = { RADIANS_TO_DEGREES: _e, DEGREES_TO_RADIANS: Ne, clamp: T, lerp: D };
function Zo(o, e = document.body) {
  let n = getComputedStyle(e);
  if (o.endsWith(")") && o.startsWith("var("))
    o = o.slice(4, -1);
  return n.getPropertyValue(o).trim();
}
var en = (o, e, n) => {
  return (0.299 * o + 0.587 * e + 0.114 * n) / 255;
};
var O = (o) => ("00" + Math.round(Number(o)).toString(16)).slice(-2);

class Le {
  h;
  s;
  l;
  constructor(o, e, n) {
    o /= 255, e /= 255, n /= 255;
    let r = Math.max(o, e, n), i = r - Math.min(o, e, n), s = i !== 0 ? r === o ? (e - n) / i : r === e ? 2 + (n - o) / i : 4 + (o - e) / i : 0;
    this.h = 60 * s < 0 ? 60 * s + 360 : 60 * s, this.s = i !== 0 ? r <= 0.5 ? i / (2 * r - i) : i / (2 - (2 * r - i)) : 0, this.l = (2 * r - i) / 2;
  }
}
var P = globalThis.document !== undefined ? globalThis.document.createElement("span") : undefined;

class l {
  r;
  g;
  b;
  a;
  static fromVar(o, e = document.body) {
    return l.fromCss(Zo(o, e));
  }
  static fromCss(o) {
    let e = o;
    if (P instanceof HTMLSpanElement)
      P.style.color = "black", P.style.color = o, document.body.appendChild(P), e = getComputedStyle(P).color, P.remove();
    let [n, r, i, s] = e.match(/[\d.]+/g) || ["0", "0", "0", "0"], t = e.startsWith("color(srgb") ? 255 : 1;
    return new l(Number(n) * t, Number(r) * t, Number(i) * t, s == null ? 1 : Number(s));
  }
  static fromHsl(o, e, n, r = 1) {
    let i, s, t;
    if (e === 0)
      i = s = t = n;
    else {
      let f = (p, L, C) => {
        if (C < 0)
          C += 1;
        if (C > 1)
          C -= 1;
        if (C < 0.16666666666666666)
          return p + (L - p) * 6 * C;
        if (C < 0.5)
          return L;
        if (C < 0.6666666666666666)
          return p + (L - p) * (0.6666666666666666 - C) * 6;
        return p;
      }, m = n < 0.5 ? n * (1 + e) : n + e - n * e, d = 2 * n - m, h = (o % 360 + 360) % 360 / 360;
      i = f(d, m, h + 0.3333333333333333), s = f(d, m, h), t = f(d, m, h - 0.3333333333333333);
    }
    let c = new l(i * 255, s * 255, t * 255, r);
    return c.hslCached = { h: (o % 360 + 360) % 360, s: e, l: n }, c;
  }
  static black = new l(0, 0, 0);
  static white = new l(255, 255, 255);
  constructor(o, e, n, r = 1) {
    this.r = T(0, o, 255), this.g = T(0, e, 255), this.b = T(0, n, 255), this.a = T(0, r, 1);
  }
  get inverse() {
    return new l(255 - this.r, 255 - this.g, 255 - this.b, this.a);
  }
  get inverseLuminance() {
    let { h: o, s: e, l: n } = this._hsl;
    return l.fromHsl(o, e, 1 - n, this.a);
  }
  get opaque() {
    return this.a === 1 ? this : new l(this.r, this.g, this.b, 1);
  }
  contrasting(o = 1) {
    return this.opaque.blend(this.brightness > 0.5 ? l.black : l.white, o);
  }
  get rgb() {
    let { r: o, g: e, b: n } = this;
    return `rgb(${o.toFixed(0)},${e.toFixed(0)},${n.toFixed(0)})`;
  }
  get rgba() {
    let { r: o, g: e, b: n, a: r } = this;
    return `rgba(${o.toFixed(0)},${e.toFixed(0)},${n.toFixed(0)},${r.toFixed(2)})`;
  }
  get RGBA() {
    return [this.r / 255, this.g / 255, this.b / 255, this.a];
  }
  get ARGB() {
    return [this.a, this.r / 255, this.g / 255, this.b / 255];
  }
  hslCached;
  get _hsl() {
    if (this.hslCached == null)
      this.hslCached = new Le(this.r, this.g, this.b);
    return this.hslCached;
  }
  get hsl() {
    let { h: o, s: e, l: n } = this._hsl;
    return `hsl(${o.toFixed(0)}deg ${(e * 100).toFixed(0)}% ${(n * 100).toFixed(0)}%)`;
  }
  get hsla() {
    let { h: o, s: e, l: n } = this._hsl;
    return `hsl(${o.toFixed(0)}deg ${(e * 100).toFixed(0)}% ${(n * 100).toFixed(0)}% / ${(this.a * 100).toFixed(0)}%)`;
  }
  get mono() {
    let o = this.brightness * 255;
    return new l(o, o, o);
  }
  get brightness() {
    return en(this.r, this.g, this.b);
  }
  get html() {
    return this.toString();
  }
  toString() {
    return this.a === 1 ? "#" + O(this.r) + O(this.g) + O(this.b) : "#" + O(this.r) + O(this.g) + O(this.b) + O(Math.floor(255 * this.a));
  }
  brighten(o) {
    let { h: e, s: n, l: r } = this._hsl, i = T(0, r + o * (1 - r), 1);
    return l.fromHsl(e, n, i, this.a);
  }
  darken(o) {
    let { h: e, s: n, l: r } = this._hsl, i = T(0, r * (1 - o), 1);
    return l.fromHsl(e, n, i, this.a);
  }
  saturate(o) {
    let { h: e, s: n, l: r } = this._hsl, i = T(0, n + o * (1 - n), 1);
    return l.fromHsl(e, i, r, this.a);
  }
  desaturate(o) {
    let { h: e, s: n, l: r } = this._hsl, i = T(0, n * (1 - o), 1);
    return l.fromHsl(e, i, r, this.a);
  }
  rotate(o) {
    let { h: e, s: n, l: r } = this._hsl, i = (e + 360 + o) % 360;
    return l.fromHsl(i, n, r, this.a);
  }
  opacity(o) {
    let { h: e, s: n, l: r } = this._hsl;
    return l.fromHsl(e, n, r, o);
  }
  swatch() {
    return console.log(`%c      %c ${this.html}, ${this.rgba}`, `background-color: ${this.html}`, "background-color: transparent"), this;
  }
  blend(o, e) {
    return new l(D(this.r, o.r, e), D(this.g, o.g, e), D(this.b, o.b, e), D(this.a, o.a, e));
  }
  static blendHue(o, e, n) {
    let r = (e - o + 720) % 360;
    if (r < 180)
      return o + n * r;
    else
      return o - (360 - r) * n;
  }
  mix(o, e) {
    let n = this._hsl, r = o._hsl;
    return l.fromHsl(n.s === 0 ? r.h : r.s === 0 ? n.h : l.blendHue(n.h, r.h, e), D(n.s, r.s, e), D(n.l, r.l, e), D(this.a, o.a, e));
  }
  colorMix(o, e) {
    return l.fromCss(`color-mix(in hsl, ${this.html}, ${o.html} ${(e * 100).toFixed(0)}%)`);
  }
}
function nn(o, e) {
  let n = y.style(B(e));
  n.id = o, document.head.append(n);
}
var rn = ["animation-iteration-count", "flex", "flex-base", "flex-grow", "flex-shrink", "opacity", "order", "tab-size", "widows", "z-index", "zoom"];
var Oo = (o, e) => {
  if (typeof e === "number" && !rn.includes(o))
    e = `${e}px`;
  if (o.startsWith("_"))
    if (o.startsWith("__"))
      o = "--" + o.substring(2), e = `var(${o}-default, ${e})`;
    else
      o = "--" + o.substring(1);
  return { prop: o, value: String(e) };
};
var sn = (o, e, n) => {
  if (n === undefined)
    return "";
  if (n instanceof l)
    n = n.html;
  let r = Oo(e, n);
  return `${o}  ${r.prop}: ${r.value};`;
};
var ke = (o, e, n = "") => {
  let r = x(o);
  if (typeof e === "object" && !(e instanceof l)) {
    let i = Object.keys(e).map((s) => ke(s, e[s], `${n}  `)).join(`
`);
    return `${n}  ${o} {
${i}
${n}  }`;
  } else
    return sn(n, r, e);
};
var B = (o, e = "") => {
  return Object.keys(o).map((r) => {
    let i = o[r];
    if (typeof i === "string") {
      if (r === "@import")
        return `@import url('${i}');`;
      throw Error("top-level string value only allowed for `@import`");
    }
    let s = Object.keys(i).map((t) => ke(t, i[t])).join(`
`);
    return `${e}${r} {
${s}
}`;
  }).join(`

`);
};
var tn = (o) => {
  J("initVars", "initVars is deprecated. Just use _ and __ prefixes instead.");
  let e = {};
  for (let n of Object.keys(o)) {
    let r = o[n], i = x(n);
    e[`--${i}`] = typeof r === "number" && r !== 0 ? String(r) + "px" : r;
  }
  return e;
};
var cn = (o) => {
  let e = {};
  for (let n of Object.keys(o)) {
    let r = o[n];
    if (r instanceof l)
      e[n] = r.inverseLuminance;
    else if (typeof r === "string" && r.match(/^(#[0-9a-fA-F]{3}|rgba?\(|hsla?\()/))
      e[n] = l.fromCss(r).inverseLuminance;
  }
  return e;
};
var uo = new Proxy({}, { get(o, e) {
  if (o[e] === undefined) {
    let n = "--" + x(e);
    o[e] = (r) => `var(${n}, ${r})`;
  }
  return o[e];
} });
var Uo = new Proxy({}, { get(o, e) {
  if (e === "default")
    return uo;
  if (o[e] == null) {
    e = x(e);
    let [, n, , r, i, s] = e.match(/^([-\w]*?)((_)?(\d+)(\w?))?$/) || ["", e], t = `--${n}`;
    if (i != null) {
      let c = r == null ? Number(i) / 100 : -Number(i) / 100;
      switch (s) {
        case "b":
          {
            let f = l.fromVar(t);
            o[e] = c > 0 ? f.brighten(c).rgba : f.darken(-c).rgba;
          }
          break;
        case "s":
          {
            let f = l.fromVar(t);
            o[e] = c > 0 ? f.saturate(c).rgba : f.desaturate(-c).rgba;
          }
          break;
        case "h":
          {
            let f = l.fromVar(t);
            o[e] = f.rotate(c * 100).rgba;
          }
          break;
        case "o":
          {
            let f = l.fromVar(t);
            o[e] = f.opacity(c).rgba;
          }
          break;
        case "":
          o[e] = `calc(var(${t}) * ${c})`;
          break;
        default:
          throw console.error(s), Error(`Unrecognized method ${s} for css variable ${t}`);
      }
    } else
      o[e] = `var(${t})`;
  }
  return o[e];
} });
var Se = "http://www.w3.org/1998/Math/MathML";
var He = "http://www.w3.org/2000/svg";
var ho = {};
var Xe = (o, e, n) => {
  let r = Oo(x(e), n);
  if (r.prop.startsWith("--"))
    o.style.setProperty(r.prop, r.value);
  else
    o.style[e] = r.value;
};
var fn = (o) => {
  return { toDOM(e, n) {
    Xe(e, o, n);
  } };
};
var $e = (o, e, n) => {
  if (e === "style")
    if (typeof n === "object")
      for (let r of Object.keys(n))
        if (M(n[r]))
          H(o, n[r], fn(r));
        else
          Xe(o, r, n[r]);
    else
      o.setAttribute("style", n);
  else {
    let r = x(e), i = o.constructor.observedAttributes;
    if (i?.includes(e) || i?.includes(r))
      if (typeof n === "boolean")
        n ? o.setAttribute(r, "") : o.removeAttribute(r);
      else
        o.setAttribute(r, n);
    else if (o[e] !== undefined) {
      let { MathMLElement: t } = globalThis;
      if (o instanceof SVGElement || t !== undefined && o instanceof t)
        o.setAttribute(e, n);
      else
        o[e] = n;
    } else if (r === "class")
      n.split(" ").forEach((t) => {
        o.classList.add(t);
      });
    else if (o[r] !== undefined)
      o[r] = n;
    else if (typeof n === "boolean")
      n ? o.setAttribute(r, "") : o.removeAttribute(r);
    else
      o.setAttribute(r, n);
  }
};
var mn = (o) => {
  return { toDOM(e, n) {
    $e(e, o, n);
  } };
};
var ln = (o, e, n) => {
  if (e === "apply")
    n(o);
  else if (e.match(/^on[A-Z]/) != null) {
    let r = e.substring(2).toLowerCase();
    V(o, r, n);
  } else if (e === "bind")
    if ((typeof n.binding === "string" ? lo[n.binding] : n.binding) !== undefined && n.value !== undefined)
      H(o, n.value, n.binding instanceof Function ? { toDOM: n.binding } : n.binding);
    else
      throw Error("bad binding");
  else if (e.match(/^bind[A-Z]/) != null) {
    let r = e.substring(4, 5).toLowerCase() + e.substring(5), i = lo[r];
    if (i !== undefined)
      H(o, n, i);
    else
      throw Error(`${e} is not allowed, bindings.${r} is not defined`);
  } else if (M(n))
    H(o, n, mn(e));
  else
    $e(o, e, n);
};
var Ao = (o, ...e) => {
  if (ho[o] === undefined) {
    let [i, s] = o.split("|");
    if (s === undefined)
      ho[o] = globalThis.document.createElement(i);
    else
      ho[o] = globalThis.document.createElementNS(s, i);
  }
  let n = ho[o].cloneNode(), r = {};
  for (let i of e)
    if (i instanceof Element || i instanceof DocumentFragment || typeof i === "string" || typeof i === "number")
      if (n instanceof HTMLTemplateElement)
        n.content.append(i);
      else
        n.append(i);
    else if (M(i))
      n.append(y.span({ bindText: i }));
    else
      Object.assign(r, i);
  for (let i of Object.keys(r)) {
    let s = r[i];
    ln(n, i, s);
  }
  return n;
};
var Ro = (...o) => {
  let e = globalThis.document.createDocumentFragment();
  for (let n of o)
    e.append(n);
  return e;
};
var y = new Proxy({ fragment: Ro }, { get(o, e) {
  if (e = e.replace(/[A-Z]/g, (n) => `-${n.toLocaleLowerCase()}`), o[e] === undefined)
    o[e] = (...n) => Ao(e, ...n);
  return o[e];
}, set() {
  throw Error("You may not add new properties to elements");
} });
var Ko = new Proxy({ fragment: Ro }, { get(o, e) {
  if (o[e] === undefined)
    o[e] = (...n) => Ao(`${e}|${He}`, ...n);
  return o[e];
}, set() {
  throw Error("You may not add new properties to elements");
} });
var Io = new Proxy({ fragment: Ro }, { get(o, e) {
  if (o[e] === undefined)
    o[e] = (...n) => Ao(`${e}|${Se}`, ...n);
  return o[e];
}, set() {
  throw Error("You may not add new properties to elements");
} });
var dn = ["sort", "splice", "copyWithin", "fill", "pop", "push", "reverse", "shift", "unshift"];
var yn = true;
var un = /^\.?([^.[\](),])+(\.[^.[\](),]+|\[\d+\]|\[[^=[\](),]*=[^[\]()]+\])*$/;
var hn = (o) => un.test(o);
var U = (o = "", e = "") => {
  if (o === "")
    return e;
  else if (e.match(/^\d+$/) !== null || e.includes("="))
    return `${o}[${e}]`;
  else
    return `${o}.${e}`;
};
var De = {};
function Po(o, e) {
  if (o !== null && (typeof o === "object" || typeof o === "function"))
    return o;
  return new Proxy(De, R(e, true));
}
var wo = () => new Proxy({}, R("^", true));
var ge = false;
function A() {
  if (!ge)
    console.warn("xinValue, tosiValue, xinPath, tosiPath, etc. are deprecated. Use value, path, observe, bind, on, binding, listBinding instead."), ge = true;
}
var ze = (o) => {
  return o === De;
};
var R = (o, e) => ({ get(n, r) {
  if (ze(n)) {
    let c = () => Z(N, o);
    switch (r) {
      case "path":
        return o;
      case "value":
        return c();
      case "valueOf":
      case "toJSON":
        return () => c();
      case Symbol.toPrimitive:
        return (f) => {
          let m = c();
          if (f === "number")
            return Number(m);
          if (f === "string")
            return String(m);
          return m;
        };
      case "toString":
        return () => String(c());
      case "observe":
        return (f) => {
          let m = j(o, f);
          return () => W(m);
        };
      case "on":
        return (f, m) => eo()(f, m, c());
      case "bind":
        return (f, m, d) => {
          oo()(f, o, m, d);
        };
      case "binding":
        return (f) => ({ bind: { value: o, binding: f } });
      case "listBinding":
        return (f = ({ span: d }) => d({ bindText: "^" }), m = {}) => [{ bindList: { value: o, ...m } }, y.template(f(y, wo()))];
      case g:
      case "xinValue":
      case "tosiValue":
        return A(), c();
      case a:
      case "xinPath":
      case "tosiPath":
        return A(), o;
      case Lo:
      case "tosiObserve":
        return A(), (f) => {
          let m = j(o, f);
          return () => W(m);
        };
      case So:
      case "tosiOn":
        return A(), (f, m) => eo()(f, m, c());
      case ko:
      case "tosiBind":
        return A(), (f, m, d) => {
          oo()(f, o, m, d);
        };
      case "tosiBinding":
        return A(), (f) => ({ bind: { value: o, binding: f } });
      case "tosiListBinding":
        return A(), (f = ({ span: d }) => d({ bindText: "^" }), m = {}) => [{ bindList: { value: o, ...m } }, y.template(f(y, wo()))];
    }
    if (typeof r === "string" && /^\d+$/.test(r)) {
      let f = c();
      if (typeof f === "string")
        return f[parseInt(r, 10)];
    }
    if (r === "length") {
      let f = c();
      if (typeof f === "string")
        return f.length;
    }
    return;
  }
  if (e && !(r in n))
    switch (r) {
      case "path":
        return o;
      case "value":
        return n.valueOf ? n.valueOf() : n;
      case "valueOf":
      case "toJSON":
        return () => n.valueOf ? n.valueOf() : n;
      case "observe":
        return (c) => {
          let f = j(o, c);
          return () => W(f);
        };
      case "on":
        return (c, f) => eo()(c, f, E(n));
      case "bind":
        return (c, f, m) => {
          oo()(c, o, f, m);
        };
      case "binding":
        return (c) => ({ bind: { value: o, binding: c } });
      case "listBinding":
        return (c = ({ span: m }) => m({ bindText: "^" }), f = {}) => [{ bindList: { value: o, ...f } }, y.template(c(y, wo()))];
    }
  switch (r) {
    case a:
    case "xinPath":
    case "tosiPath":
      return o;
    case g:
    case "xinValue":
    case "tosiValue":
      return n.valueOf ? n.valueOf() : n;
    case Lo:
    case "xinObserve":
    case "tosiObserve":
      return (c) => {
        let f = j(o, c);
        return () => W(f);
      };
    case So:
    case "xinOn":
    case "tosiOn":
      return (c, f) => eo()(c, f, E(n));
    case ko:
    case "xinBind":
    case "tosiBind":
      return (c, f, m) => {
        oo()(c, o, f, m);
      };
    case "tosiBinding":
      return (c) => ({ bind: { value: o, binding: c } });
    case "tosiListBinding":
      return (c = ({ span: m }) => m({ bindText: "^" }), f = {}) => [{ bindList: { value: o, ...f } }, y.template(c(y, wo()))];
  }
  if (typeof r === "symbol")
    return n[r];
  let i = Object.getOwnPropertyDescriptor(n, r);
  if (i && !i.configurable && !i.writable && "value" in i)
    return i.value;
  let s = r, t = s.match(/^([^.[]+)\.(.+)$/) ?? s.match(/^([^\]]+)(\[.+)/) ?? s.match(/^(\[[^\]]+\])\.(.+)$/) ?? s.match(/^(\[[^\]]+\])\[(.+)$/);
  if (t !== null) {
    let [, c, f] = t, m = U(o, c), d = Z(n, c);
    return d !== null && typeof d === "object" ? new Proxy(d, R(m, e))[f] : d;
  }
  if (s.startsWith("[") && s.endsWith("]"))
    s = s.substring(1, s.length - 1);
  if (!Array.isArray(n) && n[s] !== undefined || Array.isArray(n) && s.includes("=")) {
    let c;
    if (s.includes("=")) {
      let [f, m] = s.split("=");
      c = n.find((d) => `${Z(d, f)}` === m);
    } else
      c = n[s];
    if (c instanceof Object) {
      let f = U(o, s);
      return new Proxy(c instanceof Function ? c.bind(n) : c, R(f, e));
    } else
      return e ? Po(c, U(o, s)) : c;
  } else if (Array.isArray(n)) {
    let c = n[s];
    return typeof c === "function" ? (...f) => {
      let m = f.map((h) => E(h)), d = c.apply(n, m);
      if (dn.includes(s))
        I(o);
      return d;
    } : typeof c === "object" ? new Proxy(c, R(U(o, s), e)) : e ? Po(c, U(o, s)) : c;
  } else
    return e ? Po(n[s], U(o, s)) : n[s];
}, set(n, r, i) {
  i = E(i);
  let t = r === g || r === "xinValue" || r === "tosiValue" || r === "value" && (ze(n) || e) ? o : U(o, r);
  if (yn && !hn(t))
    throw Error(`setting invalid path ${t}`);
  if (E(u[t]) !== i && Te(N, t, i))
    I(t);
  return true;
} });
var Bo = (o, e) => {
  let n = typeof e === "function" ? e : u[e];
  if (typeof n !== "function")
    throw Error(`observe expects a function or path to a function, ${e} is neither`);
  return j(o, n);
};
var u = new Proxy(N, R("", false));
de(u);
var v = new Proxy(N, R("", true));
var wn = 16;
var Cn = 100;
function Fe(o, e) {
  let n = Array.from(o.querySelectorAll(Y));
  if (o.matches(Y))
    n.unshift(o);
  for (let r of n) {
    let i = $.get(r);
    for (let s of i) {
      if (s.path.startsWith("^"))
        s.path = `${e}${s.path.substring(1)}`;
      if (s.binding.toDOM != null)
        s.binding.toDOM(r, u[s.path]);
    }
  }
}

class Ye {
  boundElement;
  listTop;
  listBottom;
  template;
  options;
  itemToElement;
  array = [];
  _update;
  _previousSlice;
  static filterBoundObservers = new WeakMap;
  constructor(o, e, n = {}) {
    if (this.boundElement = o, this.itemToElement = new WeakMap, o.children.length !== 1)
      throw Error("ListBinding expects an element with exactly one child element");
    if (o.children[0] instanceof HTMLTemplateElement) {
      let r = o.children[0];
      if (r.content.children.length !== 1)
        throw Error("ListBinding expects a template with exactly one child element");
      this.template = q(r.content.children[0]);
    } else
      this.template = o.children[0], this.template.remove();
    if (this.options = n, this.listTop = document.createElement("div"), this.listBottom = document.createElement("div"), this.listTop.classList.add("virtual-list-padding"), this.listBottom.classList.add("virtual-list-padding"), this.boundElement.append(this.listTop), this.boundElement.append(this.listBottom), n.virtual != null)
      if (no.observe(this.boundElement), this._update = mo(() => {
        this.update(this.array, true);
      }, wn), this.boundElement.addEventListener("resize", this._update), n.virtual.scrollContainer === "window")
        window.addEventListener("scroll", this._update), window.addEventListener("resize", this._update);
      else
        this.boundElement.addEventListener("scroll", this._update);
  }
  visibleSlice() {
    let { virtual: o, hiddenProp: e, visibleProp: n } = this.options, r = this.array;
    if (e !== undefined)
      r = r.filter((f) => f[e] !== true);
    if (n !== undefined)
      r = r.filter((f) => f[n] === true);
    if (this.options.filter && this.needle !== undefined)
      r = this.options.filter(r, this.needle);
    let i = 0, s = r.length - 1, t = 0, c = 0;
    if (o != null && this.boundElement instanceof HTMLElement) {
      let f = this.boundElement.offsetWidth, m = o.scrollContainer === "window", d, h;
      if (m) {
        d = window.innerHeight;
        let K = this.boundElement.getBoundingClientRect();
        h = Math.max(0, -K.top);
      } else
        d = this.boundElement.offsetHeight, h = this.boundElement.scrollTop;
      if (o.visibleColumns == null)
        o.visibleColumns = o.width != null ? Math.max(1, Math.floor(f / o.width)) : 1;
      let p = Math.ceil(d / o.height) + (o.rowChunkSize || 1), L = Math.ceil(r.length / o.visibleColumns), C = o.visibleColumns * p, k = Math.floor(h / o.height);
      if (k > L - p + 1)
        k = Math.max(0, L - p + 1);
      if (o.rowChunkSize)
        k -= k % o.rowChunkSize;
      i = k * o.visibleColumns, s = i + C - 1, t = k * o.height, c = Math.max((L - p) * o.height - t, 0);
    }
    return { items: r, firstItem: i, lastItem: s, topBuffer: t, bottomBuffer: c };
  }
  needle;
  filter = mo((o) => {
    if (this.needle !== o)
      this.needle = o, this.update(this.array);
  }, Cn);
  update(o, e) {
    if (o == null)
      o = [];
    this.array = o;
    let { hiddenProp: n, visibleProp: r } = this.options, i = M(o), s = this.visibleSlice();
    this.boundElement.classList.toggle("-xin-empty-list", s.items.length === 0);
    let t = this._previousSlice, { firstItem: c, lastItem: f, topBuffer: m, bottomBuffer: d } = s;
    if (n === undefined && r === undefined && e === true && t != null && c === t.firstItem && f === t.lastItem)
      return;
    this._previousSlice = s;
    let h = 0, p = 0, L = 0;
    for (let w of Array.from(this.boundElement.children)) {
      if (w === this.listTop || w === this.listBottom)
        continue;
      let S = w[so];
      if (S == null)
        w.remove();
      else {
        let b = s.items.indexOf(S);
        if (b < c || b > f)
          w.remove(), this.itemToElement.delete(S), h++;
      }
    }
    this.listTop.style.height = String(m) + "px", this.listBottom.style.height = String(d) + "px";
    let C = [], { idPath: k } = this.options;
    for (let w = c;w <= f; w++) {
      let S = s.items[w];
      if (S === undefined)
        continue;
      let b = this.itemToElement.get(E(S));
      if (b == null) {
        if (L++, b = q(this.template), typeof S === "object")
          this.itemToElement.set(E(S), b), b[so] = E(S);
        if (this.boundElement.insertBefore(b, this.listBottom), k != null) {
          let ao = S[k], qe = `${i}[${k}=${ao}]`;
          Fe(b, qe);
        } else {
          let ao = `${i}[${w}]`;
          Fe(b, ao);
        }
      }
      C.push(b);
    }
    let K = null;
    for (let w of C) {
      if (w.previousElementSibling !== K)
        if (p++, K?.nextElementSibling != null)
          this.boundElement.insertBefore(w, K.nextElementSibling);
        else
          this.boundElement.insertBefore(w, this.listBottom);
      K = w;
    }
    if (G.perf)
      console.log(i, "updated", { removed: h, created: L, moved: p });
  }
}
var yo = (o, e, n) => {
  let r = o[_];
  if (e && r === undefined)
    r = new Ye(o, e, n), o[_] = r;
  return r;
};
var Vo = (o) => {
  let e;
  while (!(e = o[so]) && o && o.parentElement)
    o = o.parentElement;
  return e ? { element: o, item: e } : undefined;
};
var vo = (o) => {
  let e = Vo(o);
  return e ? e.item : undefined;
};
var En = (o) => {
  let e = Vo(o);
  if (!e)
    return console.error("deleteListItem failed, element is not part of a list instance", o), false;
  let n = yo(e.element.parentElement);
  if (!n.options.idPath)
    return console.error("deleteListItem failed, list binding has no idPath", o.parentElement, n), false;
  let r = n.array.indexOf(e.item);
  if (r > -1)
    return n.array.splice(r, 1), true;
  return false;
};
var { document: ro, MutationObserver: Je } = globalThis;
var _o = (o, e) => {
  let n = $.get(o);
  if (n == null)
    return;
  for (let r of n) {
    let { binding: i, options: s } = r, { path: t } = r, { toDOM: c } = i;
    if (c != null) {
      if (t.startsWith("^")) {
        let f = vo(o);
        if (f != null && f[a] != null)
          t = r.path = `${f[a]}${t.substring(1)}`;
        else
          throw console.error(`Cannot resolve relative binding ${t}`, o, "is not part of a list"), Error(`Cannot resolve relative binding ${t}`);
      }
      if (e == null || t.startsWith(e))
        c(o, fo()[t], s);
    }
  }
};
if (Je != null)
  new Je((e) => {
    e.forEach((n) => {
      Array.from(n.addedNodes).forEach((r) => {
        if (r instanceof Element)
          Array.from(r.querySelectorAll(Y)).forEach((i) => _o(i));
      });
    });
  }).observe(ro.body, { subtree: true, childList: true });
j(() => true, (o) => {
  let e = Array.from(ro.querySelectorAll(Y));
  for (let n of e)
    _o(n, o);
});
var We = (o) => {
  let e = o.target?.closest(Y);
  while (e != null) {
    let n = $.get(e);
    for (let r of n) {
      let { binding: i, path: s } = r, { fromDOM: t } = i;
      if (t != null) {
        let c;
        try {
          c = t(e, r.options);
        } catch (f) {
          throw console.error("Cannot get value from", e, "via", r), Error("Cannot obtain value fromDOM");
        }
        if (c != null) {
          let f = fo(), m = f[s];
          if (m == null)
            f[s] = c;
          else {
            let d = m[a] != null ? m[g] : m, h = c[a] != null ? c[g] : c;
            if (d !== h)
              f[s] = h;
          }
        }
      }
    }
    e = e.parentElement.closest(Y);
  }
};
if (globalThis.document != null)
  ro.body.addEventListener("change", We, true), ro.body.addEventListener("input", We, true);
function H(o, e, n, r) {
  if (o instanceof DocumentFragment)
    throw Error("bind cannot bind to a DocumentFragment");
  let i;
  if (typeof e === "object" && e[a] === undefined && r === undefined) {
    let { value: c } = e;
    i = typeof c === "string" ? c : c[a], r = e, delete r.value;
  } else
    i = typeof e === "string" ? e : e[a];
  if (i == null)
    throw Error("bind requires a path or object with xin Proxy");
  let { toDOM: s } = n;
  o.classList?.add(bo);
  let t = $.get(o);
  if (t == null)
    t = [], $.set(o, t);
  if (t.push({ path: i, binding: n, options: r }), s != null && !i.startsWith("^"))
    I(i);
  if (r?.filter && r?.needle)
    H(o, r.needle, { toDOM(c, f) {
      console.log({ needle: f }), c[_]?.filter(f);
    } });
  return o;
}
var je = new Set;
var pn = (o) => {
  let e = o?.target?.closest(To), n = false, r = new Proxy(o, { get(s, t) {
    if (t === "stopPropagation")
      return () => {
        o.stopPropagation(), n = true;
      };
    else {
      let c = s[t];
      return typeof c === "function" ? c.bind(s) : c;
    }
  } }), i = new Set;
  while (!n && e != null) {
    let t = Q.get(e)[o.type] || i;
    for (let c of t) {
      if (typeof c === "function")
        c(r);
      else {
        let f = fo()[c];
        if (typeof f === "function")
          f(r);
        else
          throw Error(`no event handler found at path ${c}`);
      }
      if (n)
        continue;
    }
    e = e.parentElement != null ? e.parentElement.closest(To) : null;
  }
};
function V(o, e, n) {
  let r = Q.get(o);
  if (o.classList.add(Mo), r == null)
    r = {}, Q.set(o, r);
  if (!r[e])
    r[e] = new Set;
  if (r[e].add(n), !je.has(e))
    je.add(e), ro.body.addEventListener(e, pn, true);
  return () => {
    r[e].delete(n);
  };
}
ye(H, V);
function No(o, e) {
  if (!o.internals)
    return;
  let n = {}, r = "";
  if (o.hasAttribute("required") && e === "")
    n.valueMissing = true, r = "Please fill out this field.";
  let i = o.getAttribute("minlength");
  if (i && e.length < parseInt(i, 10))
    n.tooShort = true, r = `Please use at least ${i} characters.`;
  let s = o.getAttribute("maxlength");
  if (s && e.length > parseInt(s, 10))
    n.tooLong = true, r = `Please use no more than ${s} characters.`;
  let t = o.getAttribute("pattern");
  if (t && e !== "")
    try {
      if (!new RegExp(`^(?:${t})$`).test(e))
        n.patternMismatch = true, r = "Please match the requested format.";
    } catch {}
  if (Object.keys(n).length > 0)
    o.internals.setValidity(n, r, o);
  else
    o.internals.setValidity({});
}
var xn = 0;
function oe() {
  return `custom-elt${(xn++).toString(36)}`;
}
var Qe = 0;
var ee = null;
function an() {
  if (ee === null)
    ee = new MutationObserver((o) => {
      let e = new Set;
      for (let n of o)
        if (n.type === "attributes" && n.target instanceof F) {
          let r = n.target, i = Go(n.attributeName);
          if (r._legacyTrackedAttrs?.has(i))
            e.add(r);
        }
      for (let n of e)
        n.queueRender(false);
    });
  return ee;
}
var io = {};
function bn(o, e) {
  let n = io[o], r = B(e).replace(/:host\b/g, o);
  io[o] = n ? n + `
` + r : r;
}
function Mn(o) {
  if (io[o])
    document.head.append(y.style({ id: o + "-component" }, io[o]));
  delete io[o];
}

class F extends HTMLElement {
  static elements = y;
  static _elementCreator;
  static initAttributes;
  static formAssociated;
  internals;
  get validity() {
    return this.internals?.validity;
  }
  get validationMessage() {
    return this.internals?.validationMessage ?? "";
  }
  get willValidate() {
    return this.internals?.willValidate ?? false;
  }
  checkValidity() {
    return this.internals?.checkValidity() ?? true;
  }
  reportValidity() {
    return this.internals?.reportValidity() ?? true;
  }
  setCustomValidity(o) {
    if (this.internals)
      if (o)
        this.internals.setValidity({ customError: true }, o);
      else
        this.internals.setValidity({});
  }
  setValidity(o, e, n) {
    this.internals?.setValidity(o, e, n);
  }
  setFormValue(o, e) {
    this.internals?.setFormValue(o, e);
  }
  static get observedAttributes() {
    let o = this.initAttributes;
    if (o)
      return ["hidden", ...Object.keys(o).map(x)];
    return ["hidden"];
  }
  instanceId;
  styleNode;
  static styleSpec;
  static styleNode;
  content = y.slot();
  isSlotted;
  static _tagName = null;
  static get tagName() {
    return this._tagName;
  }
  _legacyTrackedAttrs;
  _attrValues;
  _valueChanged = false;
  static StyleNode(o) {
    return console.warn("StyleNode is deprecated, just assign static styleSpec: XinStyleSheet to the class directly"), y.style(B(o));
  }
  static elementCreator(o = {}) {
    let e = this;
    if (e._elementCreator == null) {
      let { tag: n, styleSpec: r } = o, i = o != null ? n : null;
      if (i == null)
        if (typeof e.name === "string" && e.name !== "") {
          if (i = x(e.name), i.startsWith("-"))
            i = i.slice(1);
        } else
          i = oe();
      if (customElements.get(i) != null)
        console.warn(`${i} is already defined`);
      if (i.match(/\w+(-\w+)+/) == null)
        console.warn(`${i} is not a legal tag for a custom-element`), i = oe();
      while (customElements.get(i) !== undefined)
        i = oe();
      if (e._tagName = i, r !== undefined)
        bn(i, r);
      window.customElements.define(i, this, o), e._elementCreator = y[i];
    }
    return e._elementCreator;
  }
  initAttributes(...o) {
    if (J("initAttributes", "initAttributes() is deprecated. Use static initAttributes = { ... } instead."), !this._legacyTrackedAttrs)
      this._legacyTrackedAttrs = new Set;
    for (let i of o)
      this._legacyTrackedAttrs.add(i);
    an().observe(this, { attributes: true });
    let n = {}, r = {};
    o.forEach((i) => {
      n[i] = X(this[i]);
      let s = x(i);
      Object.defineProperty(this, i, { enumerable: false, get() {
        if (typeof n[i] === "boolean")
          return this.hasAttribute(s);
        else if (this.hasAttribute(s))
          return typeof n[i] === "number" ? parseFloat(this.getAttribute(s)) : this.getAttribute(s);
        else if (r[i] !== undefined)
          return r[i];
        else
          return n[i];
      }, set(t) {
        if (typeof n[i] === "boolean") {
          if (t !== this[i]) {
            if (t)
              this.setAttribute(s, "");
            else
              this.removeAttribute(s);
            this.queueRender();
          }
        } else if (typeof n[i] === "number") {
          if (t !== parseFloat(this[i]))
            this.setAttribute(s, t), this.queueRender();
        } else if (typeof t === "object" || `${t}` !== `${this[i]}`) {
          if (t === null || t === undefined || typeof t === "object")
            this.removeAttribute(s);
          else
            this.setAttribute(s, t);
          this.queueRender(), r[i] = t;
        }
      } });
    });
  }
  initValue() {
    let o = Object.getOwnPropertyDescriptor(this, "value");
    if (o === undefined || o.get !== undefined || o.set !== undefined)
      return;
    let e = this.hasAttribute("value") ? this.getAttribute("value") : X(this.value);
    delete this.value, Object.defineProperty(this, "value", { enumerable: false, get() {
      return e;
    }, set(n) {
      if (e !== n)
        e = n, this._valueChanged = true, this.queueRender(true);
    } });
  }
  _parts;
  get parts() {
    let o = this.shadowRoot != null ? this.shadowRoot : this;
    if (this._parts == null)
      this._parts = new Proxy({}, { get(e, n) {
        if (e[n] === undefined) {
          let r = o.querySelector(`[part="${n}"]`);
          if (r == null)
            r = o.querySelector(n);
          if (r == null)
            throw Error(`elementRef "${n}" does not exist!`);
          r.removeAttribute("data-ref"), e[n] = r;
        }
        return e[n];
      } });
    return this._parts;
  }
  attributeChangedCallback(o, e, n) {
    let r = Go(o);
    if (!this._legacyTrackedAttrs?.has(r))
      this.queueRender(false);
  }
  constructor() {
    super();
    if (Qe += 1, this.constructor.formAssociated && typeof this.attachInternals === "function" && !this.internals)
      this.internals = this.attachInternals();
    let o = this.constructor.initAttributes;
    if (o)
      this._setupAttributeAccessors(o);
    this.instanceId = `${this.tagName.toLocaleLowerCase()}-${Qe}`, this._value = X(this.defaultValue);
  }
  _setupAttributeAccessors(o) {
    if (!this._attrValues)
      this._attrValues = new Map;
    for (let e of Object.keys(o)) {
      let n = x(e), r = o[e];
      if (e === "value") {
        console.warn(`${this.tagName}: 'value' cannot be an attribute. Use the Component value property instead.`);
        continue;
      }
      if (typeof r === "object" && r !== null) {
        console.warn(`${this.tagName}: initAttributes.${e} is an object. Use a regular property instead.`);
        continue;
      }
      let i = this, s = false;
      while (i) {
        let t = Object.getOwnPropertyDescriptor(i, e);
        if (t) {
          if (!t.configurable || t.get || t.set) {
            s = true;
            break;
          }
          break;
        }
        i = Object.getPrototypeOf(i);
      }
      if (s)
        continue;
      Object.defineProperty(this, e, { enumerable: false, get: () => {
        if (typeof r === "boolean")
          return this.hasAttribute(n);
        else if (this.hasAttribute(n))
          return typeof r === "number" ? parseFloat(this.getAttribute(n)) : this.getAttribute(n);
        else if (this._attrValues.has(e))
          return this._attrValues.get(e);
        else
          return r;
      }, set: (t) => {
        if (typeof r === "boolean") {
          if (t !== this[e]) {
            if (t)
              this.setAttribute(n, "");
            else
              this.removeAttribute(n);
            this.queueRender();
          }
        } else if (typeof r === "number") {
          if (t !== parseFloat(this[e]))
            this.setAttribute(n, t), this.queueRender();
        } else if (typeof t === "object" || `${t}` !== `${this[e]}`) {
          if (t === null || t === undefined || typeof t === "object")
            this.removeAttribute(n);
          else
            this.setAttribute(n, t);
          this.queueRender(), this._attrValues.set(e, t);
        }
      } });
    }
  }
  connectedCallback() {
    if (Mn(this.constructor.tagName), this.hydrate(), this.role != null)
      this.setAttribute("role", this.role);
    if (this.constructor.formAssociated && !this.hasAttribute("tabindex"))
      this.setAttribute("tabindex", "0");
    if (this.onResize !== undefined) {
      if (no.observe(this), this._onResize == null)
        this._onResize = this.onResize.bind(this);
      this.addEventListener("resize", this._onResize);
    }
    if (this.value != null && this.getAttribute("value") != null)
      this._value = this.getAttribute("value");
    if (this.internals && this.value !== undefined)
      this.internals.setFormValue(this.value), this.validateValue();
    this.queueRender();
  }
  disconnectedCallback() {
    no.unobserve(this);
  }
  formResetCallback() {
    if (this.value !== undefined)
      this.value = this.defaultValue ?? "";
  }
  formDisabledCallback(o) {
    if (o)
      this.setAttribute("disabled", "");
    else
      this.removeAttribute("disabled");
  }
  formStateRestoreCallback(o) {
    if (this.value !== undefined && typeof o === "string")
      this.value = o;
  }
  _changeQueued = false;
  _renderQueued = false;
  queueRender(o = false) {
    if (!this._hydrated)
      return;
    if (!this._changeQueued)
      this._changeQueued = o;
    if (!this._renderQueued)
      this._renderQueued = true, requestAnimationFrame(() => {
        if (this._changeQueued) {
          if (Yo(this, "change"), this.internals && this.value !== undefined)
            this.internals.setFormValue(this.value);
        }
        this._changeQueued = false, this._renderQueued = false, this.render();
      });
  }
  _hydrated = false;
  hydrate() {
    if (!this._hydrated) {
      this.initValue();
      let o = typeof this.content !== "function", e = typeof this.content === "function" ? this.content(y) : this.content, { styleSpec: n } = this.constructor, { styleNode: r } = this.constructor;
      if (n)
        r = this.constructor.styleNode = y.style(B(n)), delete this.constructor.styleNode;
      if (this.styleNode)
        console.warn(this, "styleNode is deprecrated, use static styleNode or statc styleSpec instead"), r = this.styleNode;
      if (r) {
        let i = this.attachShadow({ mode: "open" });
        i.appendChild(r.cloneNode(true)), Jo(i, e, o);
      } else if (e !== null) {
        let i = Array.from(this.childNodes);
        Jo(this, e, o), this.isSlotted = this.querySelector("slot,xin-slot") !== undefined;
        let s = Array.from(this.querySelectorAll("slot"));
        if (s.length > 0)
          s.forEach(ne.replaceSlot);
        if (i.length > 0) {
          let t = { "": this };
          Array.from(this.querySelectorAll("xin-slot")).forEach((c) => {
            t[c.name] = c;
          }), i.forEach((c) => {
            let f = t[""], m = c instanceof Element ? t[c.slot] : f;
            (m !== undefined ? m : f).append(c);
          });
        }
      }
      this._hydrated = true;
    }
  }
  render() {
    if (this._valueChanged && this.internals && this.value !== undefined)
      this.internals.setFormValue(this.value), this.validateValue();
    this._valueChanged = false;
  }
  validateValue() {
    if (!this.internals || this.value === undefined)
      return;
    let o = typeof this.value === "string" ? this.value : String(this.value);
    No(this, o);
  }
}

class ne extends F {
  static initAttributes = { name: "" };
  content = null;
  static replaceSlot(o) {
    let e = document.createElement("xin-slot");
    if (o.name !== "")
      e.setAttribute("name", o.name);
    o.replaceWith(e);
  }
}
var Or = ne.elementCreator({ tag: "xin-slot" });
var Tn = (o = () => true) => {
  let e = localStorage.getItem("xin-state");
  if (e != null) {
    let r = JSON.parse(e);
    for (let i of Object.keys(r).filter(o))
      if (u[i] !== undefined)
        Object.assign(u[i], r[i]);
      else
        u[i] = r[i];
  }
  let n = Wo(() => {
    let r = {}, i = E(u);
    for (let s of Object.keys(i).filter(o))
      r[s] = i[s];
    localStorage.setItem("xin-state", JSON.stringify(r)), console.log("xin state saved to localStorage");
  }, 500);
  Bo(o, n);
};
var re = "1.1.4";
function Co(o) {
  return Object.assign(v, o), v;
}
function Eo(o) {
  return J("boxedProxy", "boxedProxy is deprecated, please use tosi() instead"), Co(o);
}
function ie(o, e = false) {
  if (e)
    return J("xinProxy-boxed", "xinProxy(..., true) is deprecated; use tosi(...) instead"), Eo(o);
  return Object.keys(o).forEach((n) => {
    u[n] = o[n];
  }), u;
}
var Ln = {};
async function po(o, e) {
  let { type: n, styleSpec: r } = await e(o, { Color: l, Component: F, elements: y, svgElements: Ko, mathML: Io, varDefault: uo, vars: Uo, xin: u, boxed: v, xinProxy: ie, boxedProxy: Eo, tosi: Co, makeComponent: po, bind: H, on: V, version: re }), i = { type: n, creator: n.elementCreator({ tag: o, styleSpec: r }) };
  return Ln[o] = i, i;
}
var se = {};
var kn = (o) => import(o);

class xo extends F {
  static initAttributes = { tag: "anon-elt", src: "", property: "default" };
  loaded;
  blueprintLoaded = (o) => {};
  async packaged() {
    let { tag: o, src: e, property: n } = this, r = `${o}.${n}:${e}`;
    if (!this.loaded) {
      if (se[r] === undefined)
        se[r] = kn(e).then((i) => {
          let s = i[n];
          return po(o, s);
        });
      else
        console.log(`using cached ${o} with signature ${r}`);
      this.loaded = await se[r], this.blueprintLoaded(this.loaded);
    }
    return this.loaded;
  }
}
var Sn = xo.elementCreator({ tag: "xin-blueprint", styleSpec: { ":host": { display: "none" } } });

class te extends F {
  allLoaded = () => {};
  constructor() {
    super();
  }
  async load() {
    let e = Array.from(this.querySelectorAll(xo.tagName)).filter((n) => n.src).map((n) => n.packaged());
    await Promise.all(e), this.allLoaded();
  }
  connectedCallback() {
    super.connectedCallback(), this.load();
  }
}
var Hn = te.elementCreator({ tag: "xin-loader", styleSpec: { ":host": { display: "none" } } });

// src/index.ts
var exports_src = {};
__export(exports_src, {
  xrControllersText: () => xrControllersText,
  xrControllers: () => xrControllers,
  xinTagList: () => xinTagList,
  xinTag: () => xinTag,
  xinSizer: () => xinSizer,
  xinSelect: () => xinSelect,
  xinSegmented: () => xinSegmented,
  xinRating: () => xinRating,
  xinPasswordStrength: () => xinPasswordStrength,
  xinNotification: () => xinNotification,
  xinMenu: () => xinMenu,
  xinLocalized: () => xinLocalized,
  xinForm: () => xinForm,
  xinFloat: () => xinFloat,
  xinField: () => xinField,
  xinCarousel: () => xinCarousel,
  version: () => version,
  updateLocalized: () => updateLocalized,
  trackDrag: () => trackDrag,
  tosijs: () => exports_module,
  tosiTagList: () => tosiTagList,
  tosiTag: () => tosiTag,
  tosiSelect: () => tosiSelect,
  tosiSegmented: () => tosiSegmented,
  tosiRichText: () => tosiRichText,
  tosiRating: () => tosiRating,
  tosiMonth: () => tosiMonth,
  tosiForm: () => tosiForm,
  tosiField: () => tosiField,
  tosiDialog: () => tosiDialog,
  tabSelector: () => tabSelector,
  svgIcon: () => svgIcon,
  svg2DataUrl: () => svg2DataUrl,
  styleSheet: () => styleSheet,
  spacer: () => spacer,
  sizeBreak: () => sizeBreak,
  sideNav: () => sideNav,
  setLocale: () => setLocale,
  scriptTag: () => scriptTag,
  runTests: () => runTests,
  richTextWidgets: () => richTextWidgets,
  richText: () => richText,
  rewriteImports: () => rewriteImports,
  removeLastMenu: () => removeLastMenu,
  postNotification: () => postNotification,
  positionFloat: () => positionFloat,
  popMenu: () => popMenu,
  popFloat: () => popFloat,
  menu: () => menu,
  markdownViewer: () => markdownViewer,
  mapBox: () => mapBox,
  makeSorter: () => makeSorter,
  localize: () => localize,
  localePicker: () => localePicker,
  loadTransform: () => loadTransform,
  liveExample: () => liveExample,
  legacyAliases: () => legacyAliases,
  isBreached: () => isBreached,
  insertExamples: () => insertExamples,
  initLocalization: () => initLocalization,
  icons: () => icons,
  i18n: () => i18n,
  gamepadText: () => gamepadText,
  gamepadState: () => gamepadState,
  findHighestZ: () => findHighestZ,
  filterPart: () => filterPart,
  filterBuilder: () => filterBuilder,
  expect: () => expect,
  executeInline: () => executeInline,
  executeInIframe: () => executeInIframe,
  executeCode: () => executeCode,
  elastic: () => elastic,
  editableRect: () => editableRect,
  dragAndDrop: () => exports_drag_and_drop,
  digest: () => digest,
  defineIcons: () => defineIcons,
  defaultColors: () => defaultColors,
  dataTable: () => dataTable,
  createThemeWithLegacy: () => createThemeWithLegacy,
  createTheme: () => createTheme,
  createTestContext: () => createTestContext,
  createSubMenu: () => createSubMenu,
  createMenuItem: () => createMenuItem,
  createMenuAction: () => createMenuAction,
  createDocBrowser: () => createDocBrowser,
  createDarkTheme: () => createDarkTheme,
  componentVars: () => componentVars,
  commandButton: () => commandButton,
  colorInput: () => colorInput,
  codeEditor: () => codeEditor,
  bringToFront: () => bringToFront,
  bodymovinPlayer: () => bodymovinPlayer,
  blockStyle: () => blockStyle,
  baseVariables: () => baseVariables,
  baseTheme: () => baseTheme,
  baseDarkTheme: () => baseDarkTheme,
  b3d: () => b3d,
  availableFilters: () => availableFilters,
  applyTheme: () => applyTheme,
  abTest: () => abTest,
  XinWord: () => XinWord,
  XinTagList: () => XinTagList,
  XinTag: () => XinTag,
  XinSizer: () => XinSizer,
  XinSelect: () => XinSelect,
  XinSegmented: () => XinSegmented,
  XinRating: () => XinRating,
  XinPasswordStrength: () => XinPasswordStrength,
  XinNotification: () => XinNotification,
  XinMenu: () => XinMenu,
  XinLocalized: () => XinLocalized,
  XinForm: () => XinForm,
  XinFloat: () => XinFloat,
  XinField: () => XinField,
  XinCarousel: () => XinCarousel,
  TosiTagList: () => TosiTagList,
  TosiTag: () => TosiTag,
  TosiSelect: () => TosiSelect,
  TosiSegmented: () => TosiSegmented,
  TosiRating: () => TosiRating,
  TosiMonth: () => TosiMonth,
  TosiForm: () => TosiForm,
  TosiField: () => TosiField,
  TosiDialog: () => TosiDialog,
  TabSelector: () => TabSelector,
  SvgIcon: () => SvgIcon,
  SizeBreak: () => SizeBreak,
  SideNav: () => SideNav,
  STORAGE_KEY: () => STORAGE_KEY,
  RichText: () => RichText,
  RemoteSyncManager: () => RemoteSyncManager,
  MarkdownViewer: () => MarkdownViewer,
  MapBox: () => MapBox,
  LocalePicker: () => LocalePicker,
  LiveExample: () => LiveExample,
  FilterPart: () => FilterPart,
  FilterBuilder: () => FilterBuilder,
  EditableRect: () => EditableRect,
  DataTable: () => DataTable,
  CodeEditor: () => CodeEditor,
  BodymovinPlayer: () => BodymovinPlayer,
  B3d: () => B3d,
  AbTest: () => AbTest
});

// src/ab-test.ts
var abTestConditions = {};

class AbTest extends F {
  static set conditions(context) {
    Object.assign(abTestConditions, context);
    for (const abTest of [...AbTest.instances]) {
      abTest.queueRender();
    }
  }
  static initAttributes = {
    condition: "",
    not: false
  };
  static instances = new Set;
  connectedCallback() {
    super.connectedCallback();
    AbTest.instances.add(this);
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    AbTest.instances.delete(this);
  }
  render() {
    if (this.condition !== "" && (this.not ? abTestConditions[this.condition] !== true : abTestConditions[this.condition] === true)) {
      this.toggleAttribute("hidden", false);
    } else {
      this.toggleAttribute("hidden", true);
    }
  }
}
var abTest = AbTest.elementCreator({ tag: "xin-ab" });
// src/via-tag.ts
var loadedScripts = {};
function scriptTag(src, existingSymbolName) {
  if (loadedScripts[src] === undefined) {
    if (existingSymbolName !== undefined) {
      const existing = globalThis[existingSymbolName];
      loadedScripts[src] = Promise.resolve({ [existingSymbolName]: existing });
    }
    const scriptElt = y.script({ src });
    document.head.append(scriptElt);
    loadedScripts[src] = new Promise((resolve) => {
      scriptElt.onload = () => resolve(globalThis);
    });
  }
  return loadedScripts[src];
}
var loadedStyleSheets = {};
function styleSheet(href) {
  if (loadedStyleSheets[href] === undefined) {
    const linkElement = y.link({
      rel: "stylesheet",
      type: "text/css",
      href
    });
    document.head.append(linkElement);
    loadedStyleSheets[href] = new Promise((resolve) => {
      linkElement.onload = resolve;
    });
  }
  return loadedStyleSheets[href];
}

// src/icon-data.ts
var icon_data_default = {
  earth: '<svg class="color" viewBox="0 0 48 48"><g><g><g><path style="fill:#a3d9ff;fill-rule:evenodd;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:2;" d="M7,13.46 C5.1,16.52,4,20.13,4,24 C4,31.81,8.47,38.57,15,41.87 C15,41.87,15,31,15,31 C15,31,9,29,9,29 C9,29,9,19,9,19 C9,19,7,15,7,15 C7,15,7,13.46,7,13.46 z"/><path style="fill:#a3d9ff;fill-rule:evenodd;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:2;" d="M18.4,4.79 C20.18,4.28,22.06,4,24,4 C27.57,4,30.92,4.93,33.82,6.57 C33.82,6.57,29,13,29,13 C29,13,31,19,31,19 C31,19,37,21,37,21 C37,21,39,29,39,29 C39,29,37.35,38.89,37.35,38.89 C33.81,42.07,29.13,44,24,44 C21.03,44,18.22,43.35,15.69,42.2 C15.69,42.2,27,29,27,29 C27,29,27,25,27,25 C27,25,21,23,21,23 C21,23,15,19,15,19 C15,19,11,19,11,19 C11,19,11,13,11,13 C11,13,13,11,13,11 C13,11,15,15,15,15 C15,15,17,15,17,15 C17,15,17,9,17,9 C17,9,18.4,4.79,18.4,4.79 z"/><path style="fill:#274e42;fill-rule:evenodd;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:2;" d="M18.4,4.79 C18.4,4.79,17,9,17,9 C17,9,17,15,17,15 C17,15,15,15,15,15 C15,15,13,11,13,11 C13,11,11,13,11,13 C11,13,11,19,11,19 C11,19,15,19,15,19 C15,19,21,23,21,23 C21,23,27,25,27,25 C27,25,27,29,27,29 C27,29,15.69,42.2,15.69,42.2 C15.46,42.09,15.23,41.98,15,41.87 C15,41.87,15,31,15,31 C15,31,9,29,9,29 C9,29,9,19,9,19 C9,19,7,15,7,15 C7,15,7,13.46,7,13.46 C9.57,9.32,13.62,6.19,18.4,4.79 z"/><path style="fill:#274e42;fill-rule:evenodd;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:2;" d="M33.82,6.57 C33.82,6.57,29,13,29,13 C29,13,31,19,31,19 C31,19,37,21,37,21 C37,21,39,29,39,29 C39,29,37.35,38.89,37.35,38.89 C41.43,35.23,44,29.91,44,24 C44,16.52,39.9,10,33.82,6.57 z"/></g></g></g></svg> ',
  blueprint: '<svg class="color" viewBox="0 0 24 24"><g><path style="fill:#9e9e9e;fill-rule:nonzero;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:1;" d="M10.5,14.5 C10.5,14.5,7.5,15.5,7.5,17.5 C7.5,19.5,10.5,19.5,10.5,19.5"/><path style="fill:#9e9e9e;fill-rule:nonzero;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:1;" d="M18.5,14.5 C18.5,14.5,21.5,15.5,21.5,17.5 C21.5,19.5,18.5,19.5,18.5,19.5"/><path style="fill:#ffffff;fill-rule:evenodd;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:1;" d="M7,5.09 C7,3.94,7.9,3,9,3 C9,3,20,3,20,3 C21.1,3,22,3.94,22,5.09 C22,5.09,22,12.41,22,12.41 C22,13.56,21.1,14.5,20,14.5 C20,14.5,9,14.5,9,14.5 C7.9,14.5,7,13.56,7,12.41 C7,12.41,7,5.09,7,5.09 z"/><path style="fill:#ffffff;fill-rule:nonzero;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:1;" d="M14.5,5.5 C14.5,5.5,14.5,11.5,14.5,11.5"/><path style="fill:#ffffff;fill-rule:nonzero;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:1;" d="M16.5,7.5 C16.5,7.5,16.5,8.5,16.5,8.5"/><path style="fill:#ffffff;fill-rule:nonzero;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:1;" d="M12.5,7.5 C12.5,7.5,12.5,8.5,12.5,8.5"/><g/><path style="fill:none;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:1;" d="M18.5,21.5 C18.5,21.5,17.5,20.5,17.5,20.5 C17.5,20.5,16.5,21.5,16.5,21.5"/><path style="fill:none;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:1;" d="M12.5,21.5 C12.5,21.5,11.5,20.5,11.5,20.5 C11.5,20.5,10.5,21.5,10.5,21.5"/><path style="fill:#e4e4e4;fill-rule:evenodd;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:1;" d="M10.5,14.5 C10.5,14.5,18.5,14.5,18.5,14.5 C18.5,14.5,18.5,19.5,18.5,19.5 C18.5,19.5,10.5,19.5,10.5,19.5 C10.5,19.5,10.5,14.5,10.5,14.5 z"/><g><g><path style="fill:#5e78ca;fill-rule:nonzero;stroke:#f2f2f2;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:1;" d="M14,16.5 C14,16.5,16,16.5,16,16.5 C16,16.5,14.53,19.5,14.53,19.5"/><path style="fill:#5e78ca;fill-rule:evenodd;stroke:none;" d="M3.59,8.5 C3.59,8.5,12.59,8.5,12.59,8.5 C12.59,8.5,14.53,19.5,14.53,19.5 C14.53,19.5,5.53,19.5,5.53,19.5 C5.53,19.5,3.59,8.5,3.59,8.5 z"/><path style="fill:#5e78ca;fill-rule:nonzero;stroke:#f2f2f2;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:1;" d="M12.59,8.5 C12.59,8.5,11.12,11.5,11.12,11.5 C11.12,11.5,2.12,11.5,2.12,11.5 C2.12,11.5,3.59,8.5,3.59,8.5"/><path style="fill:#5e78ca;fill-rule:nonzero;stroke:#f2f2f2;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:1;" d="M12.59,8.5 C12.59,8.5,14.53,19.5,14.53,19.5"/><path style="fill:#5e78ca;fill-rule:nonzero;stroke:#f2f2f2;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:1;" d="M4.12,11.5 C4.12,11.5,5.53,19.5,5.53,19.5"/></g><path style="fill:#9e9e9e;fill-rule:nonzero;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:1;" d="M9.24,12.5 C10.75,12.5,12.2,13.73,12.46,15.24 C12.46,15.24,12.46,15.24,12.46,15.24 C12.68,16.49,11.85,17.5,10.6,17.5 C10.6,17.5,10.55,17.5,10.55,17.5 C10.17,17.5,9.92,17.81,9.98,18.19 C9.98,18.19,9.98,18.19,9.98,18.19 C10.21,19.47,9.36,20.5,8.08,20.5 C8.08,20.5,6.39,20.5,6.39,20.5 C5.1,20.5,3.87,19.45,3.64,18.16 C3.64,18.16,3.12,15.21,3.12,15.21 C2.86,13.71,3.86,12.5,5.35,12.5 C5.35,12.5,9.24,12.5,9.24,12.5 z"/></g></g></svg> ',
  tosiXr: '<svg class="color" viewBox="0 0 24 24"><g><path style="fill:#9e9e9e;fill-rule:nonzero;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:1;" d="M8,14.25 C8,14.25,5,15.25,5,17.25 C5,19.25,8,19.25,8,19.25"/><path style="fill:#9e9e9e;fill-rule:nonzero;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:1;" d="M16,14.25 C16,14.25,19,15.25,19,17.25 C19,19.25,16,19.25,16,19.25"/><path style="fill:#ffffff;fill-rule:evenodd;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:1;" d="M4.5,4.85 C4.5,3.69,5.4,2.75,6.5,2.75 C6.5,2.75,17.5,2.75,17.5,2.75 C18.61,2.75,19.5,3.69,19.5,4.85 C19.5,4.85,19.5,12.16,19.5,12.16 C19.5,13.32,18.61,14.25,17.5,14.25 C17.5,14.25,6.5,14.25,6.5,14.25 C5.4,14.25,4.5,13.32,4.5,12.16 C4.5,12.16,4.5,4.85,4.5,4.85 z"/><path style="fill:#ffffff;fill-rule:nonzero;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:1;" d="M12,5.25 C12,5.25,12,11.25,12,11.25"/><path style="fill:#ffffff;fill-rule:nonzero;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:1;" d="M14,7.25 C14,7.25,14,8.25,14,8.25"/><path style="fill:#ffffff;fill-rule:nonzero;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:1;" d="M10,7.25 C10,7.25,10,8.25,10,8.25"/><path style="fill:none;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:1;" d="M16,21.25 C16,21.25,15,20.25,15,20.25 C15,20.25,14,21.25,14,21.25"/><path style="fill:none;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:1;" d="M10,21.25 C10,21.25,9,20.25,9,20.25 C9,20.25,8,21.25,8,21.25"/><path style="fill:#e4e4e4;fill-rule:evenodd;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:1;" d="M8,14.25 C8,14.25,16,14.25,16,14.25 C16,14.25,16,19.25,16,19.25 C16,19.25,8,19.25,8,19.25 C8,19.25,8,14.25,8,14.25 z"/><path style="fill:#ff7bac;fill-opacity:0.75;fill-rule:evenodd;stroke:#000000;stroke-linecap:butt;stroke-linejoin:miter;stroke-miterlimit:10;stroke-width:1;" d="M12,4 C12,4,11.99,4,11.99,4 C6.19,4,3,4.73,3,8.5 C3,11.39,4.66,13,7.27,13 C9.88,13,10.68,11.13,11.99,11.13 C11.99,11.13,12,11.13,12,11.13 C12,11.13,12.01,11.13,12.01,11.13 C13.32,11.13,14.12,13,16.73,13 C19.34,13,21,11.39,21,8.5 C21,4.73,17.81,4,12.01,4 C12.01,4,12,4,12,4 C12,4,12,4,12,4 z"/></g></svg> ',
  cmy: '<svg class="color filled" viewBox="0 0 24 24"><g><g><path style="fill:#00ff00;fill-rule:evenodd;" d="M12,10.88 C10.9,10.01,9.51,9.5,8,9.5 C7.22,9.5,6.47,9.64,5.78,9.89 C6.37,11.85,7.87,13.42,9.78,14.11 C10.17,12.81,10.96,11.69,12,10.88 z"/><path style="fill:#0000ff;fill-rule:evenodd;" d="M12,10.88 C13.1,10.01,14.49,9.5,16,9.5 C16.78,9.5,17.53,9.64,18.22,9.89 C17.63,11.85,16.13,13.42,14.22,14.11 C13.83,12.81,13.04,11.69,12,10.88 C12,10.88,12,10.88,12,10.88 z"/><path style="fill:#000000;fill-rule:evenodd;" d="M9.78,14.11 C10.17,12.81,10.96,11.69,12,10.88 C13.04,11.69,13.83,12.81,14.22,14.11 C13.53,14.36,12.78,14.5,12,14.5 C11.22,14.5,10.47,14.36,9.78,14.11 C9.78,14.11,9.78,14.11,9.78,14.11 z"/><path style="fill:#ff0000;fill-rule:evenodd;" d="M9.78,14.11 C9.6,14.71,9.5,15.34,9.5,16 C9.5,18.08,10.48,19.93,12,21.12 C13.52,19.93,14.5,18.08,14.5,16 C14.5,15.34,14.4,14.71,14.22,14.11 C13.53,14.36,12.78,14.5,12,14.5 C11.22,14.5,10.47,14.36,9.78,14.11 C9.78,14.11,9.78,14.11,9.78,14.11 z"/><path style="fill:#02fefe;fill-rule:evenodd;" d="M5.78,9.89 C5.6,9.29,5.5,8.66,5.5,8 C5.5,4.41,8.41,1.5,12,1.5 C15.59,1.5,18.5,4.41,18.5,8 C18.5,8.66,18.4,9.29,18.22,9.89 C17.53,9.64,16.78,9.5,16,9.5 C14.49,9.5,13.1,10.01,12,10.88 C10.9,10.01,9.51,9.5,8,9.5 C7.22,9.5,6.47,9.64,5.78,9.89 C5.78,9.89,5.78,9.89,5.78,9.89 z"/><path style="fill:#fffe00;fill-rule:evenodd;" d="M5.78,9.89 C3.28,10.8,1.5,13.19,1.5,16 C1.5,19.59,4.41,22.5,8,22.5 C9.51,22.5,10.9,21.99,12,21.12 C10.48,19.93,9.5,18.08,9.5,16 C9.5,15.34,9.6,14.71,9.78,14.11 C7.87,13.42,6.37,11.85,5.78,9.89 C5.78,9.89,5.78,9.89,5.78,9.89 z"/><path style="fill:#ff00ff;fill-rule:evenodd;" d="M18.22,9.89 C20.72,10.8,22.5,13.19,22.5,16 C22.5,19.59,19.59,22.5,16,22.5 C14.49,22.5,13.1,21.99,12,21.12 C13.52,19.93,14.5,18.08,14.5,16 C14.5,15.34,14.4,14.71,14.22,14.11 C16.13,13.42,17.63,11.85,18.22,9.89 z"/></g></g></svg> ',
  rgb: '<svg class="color filled" viewBox="0 0 24 24"><g><g><path style="fill:#ff00ff;fill-rule:evenodd;" d="M12,10.88 C10.9,10.01,9.51,9.5,8,9.5 C7.22,9.5,6.47,9.64,5.78,9.89 C6.37,11.85,7.87,13.42,9.78,14.11 C10.17,12.81,10.96,11.69,12,10.88 z"/><path style="fill:#ffff00;fill-rule:evenodd;" d="M12,10.88 C13.1,10.01,14.49,9.5,16,9.5 C16.78,9.5,17.53,9.64,18.22,9.89 C17.63,11.85,16.13,13.42,14.22,14.11 C13.83,12.81,13.04,11.69,12,10.88 C12,10.88,12,10.88,12,10.88 z"/><path style="fill:#ffffff;fill-rule:evenodd;" d="M9.78,14.11 C10.17,12.81,10.96,11.69,12,10.88 C13.04,11.69,13.83,12.81,14.22,14.11 C13.53,14.36,12.78,14.5,12,14.5 C11.22,14.5,10.47,14.36,9.78,14.11 C9.78,14.11,9.78,14.11,9.78,14.11 z"/><path style="fill:#00ffff;fill-rule:evenodd;" d="M9.78,14.11 C9.6,14.71,9.5,15.34,9.5,16 C9.5,18.08,10.48,19.93,12,21.12 C13.52,19.93,14.5,18.08,14.5,16 C14.5,15.34,14.4,14.71,14.22,14.11 C13.53,14.36,12.78,14.5,12,14.5 C11.22,14.5,10.47,14.36,9.78,14.11 C9.78,14.11,9.78,14.11,9.78,14.11 z"/><path style="fill:#ff0000;fill-rule:evenodd;" d="M5.78,9.89 C5.6,9.29,5.5,8.66,5.5,8 C5.5,4.41,8.41,1.5,12,1.5 C15.59,1.5,18.5,4.41,18.5,8 C18.5,8.66,18.4,9.29,18.22,9.89 C17.53,9.64,16.78,9.5,16,9.5 C14.49,9.5,13.1,10.01,12,10.88 C10.9,10.01,9.51,9.5,8,9.5 C7.22,9.5,6.47,9.64,5.78,9.89 C5.78,9.89,5.78,9.89,5.78,9.89 z"/><path style="fill:#0000ff;fill-rule:evenodd;" d="M5.78,9.89 C3.28,10.8,1.5,13.19,1.5,16 C1.5,19.59,4.41,22.5,8,22.5 C9.51,22.5,10.9,21.99,12,21.12 C10.48,19.93,9.5,18.08,9.5,16 C9.5,15.34,9.6,14.71,9.78,14.11 C7.87,13.42,6.37,11.85,5.78,9.89 C5.78,9.89,5.78,9.89,5.78,9.89 z"/><path style="fill:#00ff00;fill-rule:evenodd;" d="M18.22,9.89 C20.72,10.8,22.5,13.19,22.5,16 C22.5,19.59,19.59,22.5,16,22.5 C14.49,22.5,13.1,21.99,12,21.12 C13.52,19.93,14.5,18.08,14.5,16 C14.5,15.34,14.4,14.71,14.22,14.11 C16.13,13.42,17.63,11.85,18.22,9.89 z"/></g></g></svg> ',
  xrColor: '<svg class="color filled" viewBox="0 0 40 24"><g><g><g><path style="fill:#000000;fill-rule:evenodd;" d="M20,2 C19.99,2,19.98,2,19.98,2 C8.39,2,2,3.61,2,12 C2,18.41,5.32,22,10.54,22 C15.77,22,17.37,17.85,19.98,17.85 C19.98,17.85,19.99,17.85,20,17.85 C20.01,17.85,20.02,17.85,20.02,17.85 C22.63,17.85,24.23,22,29.46,22 C34.68,22,38,18.41,38,12 C38,3.61,31.61,2,20.02,2 C20.02,2,20.01,2,20,2 C20,2,20,2,20,2 z"/></g><path style="fill:#fbed21;fill-rule:evenodd;" d="M12.2,19.84 C15.79,19.39,17.07,16.46,19.07,16.46 C19.07,16.46,19.08,16.46,19.09,16.46 C19.09,16.46,19.1,16.46,19.11,16.46 C19.44,16.46,19.75,16.54,20.06,16.68 C20.37,16.54,20.68,16.46,21.01,16.46 C21.02,16.46,21.02,16.46,21.03,16.46 C21.04,16.46,21.04,16.46,21.05,16.46 C23.05,16.46,24.33,19.39,27.92,19.84 C31.66,19.4,33.98,16.5,33.98,11.62 C33.98,4.91,29.04,3.44,20.06,3.35 C11.07,3.44,6.14,4.91,6.14,11.62 C6.14,16.5,8.46,19.4,12.2,19.84 z"/><path style="fill:#8cc63f;fill-rule:evenodd;" d="M12.2,19.84 C12.52,19.87,12.86,19.89,13.21,19.89 C16.86,19.89,18.37,17.43,20.06,16.68 C19.75,16.54,19.44,16.46,19.11,16.46 C19.1,16.46,19.09,16.46,19.09,16.46 C19.08,16.46,19.07,16.46,19.07,16.46 C17.07,16.46,15.79,19.39,12.2,19.84 z"/><path style="fill:#8cc63f;fill-rule:evenodd;" d="M20.06,3.35 C20.37,3.35,20.69,3.35,21.01,3.35 C21.02,3.35,21.02,3.35,21.03,3.35 C21.03,3.35,21.03,3.35,21.03,3.35 C21.04,3.35,21.04,3.35,21.05,3.35 C30.64,3.35,35.92,4.68,35.92,11.62 C35.92,16.92,33.18,19.89,28.86,19.89 C28.53,19.89,28.22,19.87,27.92,19.84 C31.66,19.4,33.98,16.5,33.98,11.62 C33.98,4.91,29.04,3.44,20.06,3.35 C20.06,3.35,20.06,3.35,20.06,3.35 z"/><path style="fill:#ff1c23;fill-rule:evenodd;" d="M20.06,16.68 C21.74,17.43,23.25,19.89,26.91,19.89 C27.26,19.89,27.59,19.87,27.92,19.84 C24.33,19.39,23.05,16.46,21.05,16.46 C21.04,16.46,21.04,16.46,21.03,16.46 C21.02,16.46,21.02,16.46,21.01,16.46 C20.68,16.46,20.37,16.54,20.06,16.68 z"/><path style="fill:#ff1c23;fill-rule:evenodd;" d="M12.2,19.84 C11.9,19.87,11.59,19.89,11.26,19.89 C6.94,19.89,4.19,16.92,4.19,11.62 C4.19,4.68,9.48,3.35,19.07,3.35 C19.07,3.35,19.08,3.35,19.09,3.35 C19.09,3.35,19.09,3.35,19.09,3.35 C19.09,3.35,19.1,3.35,19.11,3.35 C19.43,3.35,19.75,3.35,20.06,3.35 C11.07,3.44,6.14,4.91,6.14,11.62 C6.14,16.5,8.46,19.4,12.2,19.84 z"/></g><g><path style="fill:#8cc63e;fill-rule:nonzero;" d="M22.55,8.63 C22.55,9.05,22.55,9.46,22.55,9.88 C22.54,10.25,22.85,10.56,23.2,10.55 C23.54,10.56,23.85,10.25,23.85,9.88 C23.85,9.46,23.85,9.05,23.85,8.63 C23.85,8.26,23.54,7.95,23.2,7.96 C22.85,7.95,22.54,8.26,22.55,8.63 z"/><path style="fill:#8cc63e;fill-rule:nonzero;" d="M17.32,8.63 C17.32,9.05,17.32,9.46,17.32,9.88 C17.31,10.25,17.62,10.56,17.97,10.55 C18.31,10.56,18.62,10.25,18.62,9.88 C18.62,9.46,18.62,9.05,18.62,8.63 C18.62,8.26,18.31,7.95,17.97,7.96 C17.62,7.95,17.31,8.26,17.32,8.63 z"/><path style="fill:#8cc63e;fill-rule:nonzero;" d="M19.99,4.39 C19.99,8.09,19.99,11.8,19.99,15.5 C19.99,15.87,20.3,16.18,20.64,16.17 C20.99,16.18,21.3,15.87,21.29,15.5 C21.29,11.8,21.29,8.09,21.29,4.39 C21.3,4.02,20.99,3.71,20.64,3.72 C20.3,3.71,19.99,4.02,19.99,4.39 z"/><path style="fill:#fe1a22;fill-rule:nonzero;" d="M21.43,8.63 C21.43,9.05,21.43,9.46,21.43,9.88 C21.42,10.25,21.73,10.56,22.08,10.55 C22.42,10.56,22.73,10.25,22.73,9.88 C22.73,9.46,22.73,9.05,22.73,8.63 C22.73,8.26,22.42,7.95,22.08,7.96 C21.73,7.95,21.42,8.26,21.43,8.63 z"/><path style="fill:#fe1a22;fill-rule:nonzero;" d="M16.2,8.63 C16.2,9.05,16.2,9.46,16.2,9.88 C16.19,10.25,16.5,10.56,16.85,10.55 C17.19,10.56,17.5,10.25,17.5,9.88 C17.5,9.46,17.5,9.05,17.5,8.63 C17.5,8.26,17.19,7.95,16.85,7.96 C16.5,7.95,16.19,8.26,16.2,8.63 z"/><path style="fill:#fe1a22;fill-rule:nonzero;" d="M18.87,4.39 C18.87,8.09,18.87,11.8,18.87,15.5 C18.87,15.87,19.18,16.18,19.52,16.17 C19.86,16.18,20.18,15.87,20.17,15.5 C20.17,11.8,20.17,8.09,20.17,4.39 C20.18,4.02,19.86,3.71,19.52,3.72 C19.18,3.71,18.87,4.02,18.87,4.39 z"/><path style="fill:#000000;fill-rule:nonzero;" d="M21.97,8.63 C21.97,9.05,21.97,9.46,21.97,9.88 C21.97,10.25,22.28,10.56,22.62,10.55 C22.97,10.56,23.28,10.25,23.27,9.88 C23.27,9.46,23.27,9.05,23.27,8.63 C23.28,8.26,22.97,7.95,22.62,7.96 C22.28,7.95,21.97,8.26,21.97,8.63 z"/><path style="fill:#000000;fill-rule:nonzero;" d="M16.74,8.63 C16.74,9.05,16.74,9.46,16.74,9.88 C16.74,10.25,17.05,10.56,17.39,10.55 C17.74,10.56,18.05,10.25,18.04,9.88 C18.04,9.46,18.04,9.05,18.04,8.63 C18.05,8.26,17.74,7.95,17.39,7.96 C17.05,7.95,16.74,8.26,16.74,8.63 z"/><path style="fill:#000000;fill-rule:nonzero;" d="M19.41,4.39 C19.41,8.09,19.41,11.8,19.41,15.5 C19.41,15.87,19.72,16.18,20.07,16.17 C20.41,16.18,20.72,15.87,20.72,15.5 C20.72,11.8,20.72,8.09,20.72,4.39 C20.72,4.02,20.41,3.71,20.07,3.72 C19.72,3.71,19.41,4.02,19.41,4.39 z"/></g></g></svg> ',
  tosiUi: '<svg class="color" viewBox="0 0 48 48"><g><g><g><path style="fill:#ffffff;fill-rule:evenodd;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:2;" d="M3,33 C3,31.9,3.9,31,5,31 C5,31,43,31,43,31 C44.1,31,45,31.9,45,33 C45,33,45,43,45,43 C45,44.1,44.1,45,43,45 C43,45,5,45,5,45 C3.9,45,3,44.1,3,43 C3,43,3,33,3,33 z"/><g><path style="fill:#ffffff;fill-rule:evenodd;stroke:#ed247b;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:2;" d="M7,35 C7,35,7,36.34,7,38 C7,39.66,8.34,41,10,41 C11.66,41,13,39.66,13,38 C13,36.34,13,35,13,35"/><path style="fill:#ffffff;fill-rule:nonzero;stroke:#ed247b;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:2;" d="M17,35 C17,35,17,41,17,41"/></g><g><path style="fill:#ed247b;fill-rule:evenodd;stroke:none;" d="M38,33 C40.76,33,43,35.24,43,38 C43,40.76,40.76,43,38,43 C35.24,43,33,40.76,33,38 C33,35.24,35.24,33,38,33 z"/><path style="fill:#ed247b;fill-rule:nonzero;stroke:#ffffff;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:2;" d="M40,36 C40,36,36,40,36,40"/><path style="fill:#ed247b;fill-rule:nonzero;stroke:#ffffff;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:2;" d="M36,36 C36,36,40,40,40,40"/></g></g><g><path style="fill:#9e9e9e;fill-rule:nonzero;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:2;" d="M15.97,21.01 C15.97,21.01,9.97,23.01,9.97,27.01 C9.97,31.01,15.97,31.01,15.97,31.01"/><path style="fill:#9e9e9e;fill-rule:nonzero;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:2;" d="M31.97,21.01 C31.97,21.01,37.97,23.01,37.97,27.01 C37.97,31.01,31.97,31.01,31.97,31.01"/><path style="fill:none;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:2;" d="M31,33 C31,33,29.49,31,29.49,31 C29.49,31,27.97,33,27.97,33"/><path style="fill:none;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:2;" d="M19.97,33 C19.97,33,17.97,31,17.97,31 C17.97,31,15.97,33,15.97,33"/><path style="fill:#e4e4e4;fill-rule:evenodd;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:2;" d="M15.97,21 C15.97,21,31.97,21,31.97,21 C31.97,21,31.97,31,31.97,31 C31.97,31,15.97,31,15.97,31 C15.97,31,15.97,21,15.97,21 z"/><path style="fill:#ffffff;fill-rule:evenodd;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:2;" d="M9,7.18 C9,4.87,10.79,3,13,3 C13,3,35.02,3,35.02,3 C37.23,3,39.03,4.87,39.03,7.18 C39.03,7.18,39.03,21.82,39.03,21.82 C39.03,24.13,37.23,26,35.02,26 C35.02,26,13,26,13,26 C10.79,26,9,24.13,9,21.82 C9,21.82,9,7.18,9,7.18 z"/><path style="fill:#ffffff;fill-rule:nonzero;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:2;" d="M24,11 C24,11,24,23,24,23"/><path style="fill:#ffffff;fill-rule:nonzero;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:2;" d="M28,15 C28,15,28,17,28,17"/><path style="fill:#ffffff;fill-rule:nonzero;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:2;" d="M20,15 C20,15,20,17,20,17"/></g></g></g></svg> ',
  tosiFavicon: '<svg class="color" viewBox="0 0 48 48"><g><g><path style="fill:#ed247b;fill-rule:evenodd;stroke:none;" d="M1,9 C1,4.58,4.58,1,9,1 C9,1,39,1,39,1 C43.42,1,47,4.58,47,9 C47,9,47,39,47,39 C47,43.42,43.42,47,39,47 C39,47,9,47,9,47 C4.58,47,1,43.42,1,39 C1,39,1,9,1,9 z"/><g><path style="fill:#9e9e9e;fill-rule:nonzero;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:2;" d="M16,29 C16,29,10,31,10,35 C10,39,16,39,16,39"/><path style="fill:#9e9e9e;fill-rule:nonzero;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:2;" d="M32,29 C32,29,38,31,38,35 C38,39,32,39,32,39"/><path style="fill:#ffffff;fill-rule:evenodd;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:2;" d="M9,10.18 C9,7.87,10.79,6,13,6 C13,6,35,6,35,6 C37.21,6,39,7.87,39,10.18 C39,10.18,39,24.82,39,24.82 C39,27.13,37.21,29,35,29 C35,29,13,29,13,29 C10.79,29,9,27.13,9,24.82 C9,24.82,9,10.18,9,10.18 z"/><path style="fill:#ffffff;fill-rule:nonzero;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:2;" d="M24,11 C24,11,24,23,24,23"/><path style="fill:#ffffff;fill-rule:nonzero;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:2;" d="M28,15 C28,15,28,17,28,17"/><path style="fill:#ffffff;fill-rule:nonzero;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:2;" d="M20,15 C20,15,20,17,20,17"/><path style="fill:none;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:2;" d="M32,43 C32,43,30,41,30,41 C30,41,28,43,28,43"/><path style="fill:none;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:2;" d="M20,43 C20,43,18,41,18,41 C18,41,16,43,16,43"/><path style="fill:#e4e4e4;fill-rule:evenodd;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:2;" d="M16,29 C16,29,32,29,32,29 C32,29,32,39,32,39 C32,39,16,39,16,39 C16,39,16,29,16,29 z"/></g></g></g></svg> ',
  tosiPlatform: '<svg class="color" viewBox="0 0 48 48"><g><g><g><path style="fill:#3ea9f5;fill-rule:evenodd;stroke:none;" d="M23.97,47 C23.97,47,39,47,39,47 C43.42,47,47,43.42,47,39 C47,39,47,9,47,9 C47,4.58,43.42,1,39,1 C39,1,9,1,9,1 C4.58,1,1,4.58,1,9 C1,9,1,39,1,39 C1,41.64,2.28,43.98,4.25,45.44 C4.09,44.82,4,44.17,4,43.5 C4,39.36,7.36,36,11.5,36 C15.14,36,18.18,38.6,18.86,42.05 C19.07,42.02,19.28,42,19.5,42 C21.99,42,24,44.01,24,46.5 C24,46.67,23.99,46.84,23.97,47 z"/><path style="fill:#ffffff;fill-rule:evenodd;stroke:none;" d="M4.25,45.44 C4.09,44.82,4,44.17,4,43.5 C4,39.36,7.36,36,11.5,36 C15.14,36,18.18,38.6,18.86,42.05 C19.07,42.02,19.28,42,19.5,42 C21.99,42,24,44.01,24,46.5 C24,46.67,23.99,46.84,23.97,47 C23.97,47,9,47,9,47 C7.22,47,5.58,46.42,4.25,45.44 z"/></g><path style="fill:none;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:2;" d="M35,35 C35,35,32.17,35,32.17,35 C32.17,35,32.17,37.83,32.17,37.83"/><path style="fill:none;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:2;" d="M31,39 C31,39,28.17,39,28.17,39 C28.17,39,28.17,41.83,28.17,41.83"/><path style="fill:#9e9e9e;fill-rule:nonzero;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:2;" d="M7.48,16 C4.45,16,2,18.45,2,21.48 C2,21.48,2,21.48,2,21.48 C2,23.98,4.02,26,6.52,26 C6.52,26,6.62,26,6.62,26 C7.38,26,8,26.62,8,27.38 C8,27.38,8,27.38,8,27.38 C8,29.93,10.07,32,12.62,32 C12.62,32,16,32,16,32 C18.58,32,20.68,29.91,20.68,27.32 C20.68,27.32,20.68,21.42,20.68,21.42 C20.68,18.43,18.25,16,15.26,16 C15.26,16,7.48,16,7.48,16 z"/><path style="fill:#e4e4e4;fill-rule:evenodd;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:2;" d="M17,29 C17,29,33,29,33,29 C33,29,33,29,33,29 C33,34.52,28.52,39,23,39 C23,39,23,39,23,39 C19.69,39,17,36.31,17,33 C17,33,17,29,17,29 z"/><path style="fill:#9e9e9e;fill-rule:nonzero;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:2;" d="M40.52,16 C43.55,16,46,18.45,46,21.48 C46,21.48,46,21.48,46,21.48 C46,23.98,43.98,26,41.48,26 C41.48,26,41.38,26,41.38,26 C40.62,26,40,26.62,40,27.38 C40,27.38,40,27.38,40,27.38 C40,29.93,37.93,32,35.38,32 C35.38,32,32,32,32,32 C29.42,32,27.32,29.91,27.32,27.32 C27.32,27.32,27.32,21.42,27.32,21.42 C27.32,18.43,29.75,16,32.74,16 C32.74,16,40.52,16,40.52,16 z"/><g><path style="fill:#ffffff;fill-rule:evenodd;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:2;" d="M6,10.18 C6,7.87,7.79,6,10,6 C10,6,32,6,32,6 C34.21,6,36,7.87,36,10.18 C36,10.18,36,24.82,36,24.82 C36,27.13,34.21,29,32,29 C32,29,10,29,10,29 C7.79,29,6,27.13,6,24.82 C6,24.82,6,10.18,6,10.18 z"/><path style="fill:#ffffff;fill-rule:nonzero;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:2;" d="M21,11 C21,11,21,23,21,23"/><path style="fill:#ffffff;fill-rule:nonzero;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:2;" d="M25,15 C25,15,25,17,25,17"/><path style="fill:#ffffff;fill-rule:nonzero;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:2;" d="M17,15 C17,15,17,17,17,17"/></g></g></g></svg> ',
  tosi: '<svg class="color" viewBox="0 0 48 48"><g><path style="fill:#9e9e9e;fill-rule:nonzero;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:2;" d="M38.35,31.7 C39.78,34.37,38.78,37.69,36.11,39.13 C36.11,39.13,36.11,39.13,36.11,39.13 C33.92,40.31,31.18,39.48,29.99,37.29 C29.99,37.29,29.95,37.2,29.95,37.2 C29.58,36.53,28.75,36.27,28.08,36.64 C28.08,36.64,28.08,36.64,28.08,36.64 C25.83,37.84,23.03,37,21.82,34.76 C21.82,34.76,20.22,31.78,20.22,31.78 C18.99,29.5,19.85,26.67,22.12,25.44 C22.12,25.44,27.32,22.65,27.32,22.65 C29.96,21.23,33.24,22.22,34.66,24.85 C34.66,24.85,38.35,31.7,38.35,31.7 z"/><path style="fill:#9e9e9e;fill-rule:nonzero;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:2;" d="M10.65,31.7 C9.22,34.37,10.22,37.69,12.89,39.13 C12.89,39.13,12.89,39.13,12.89,39.13 C15.08,40.31,17.82,39.48,19.01,37.29 C19.01,37.29,19.05,37.2,19.05,37.2 C19.42,36.53,20.25,36.27,20.92,36.64 C20.92,36.64,20.92,36.64,20.92,36.64 C23.17,37.84,25.97,37,27.18,34.76 C27.18,34.76,28.78,31.78,28.78,31.78 C30.01,29.5,29.15,26.67,26.88,25.44 C26.88,25.44,21.68,22.65,21.68,22.65 C19.04,21.23,15.76,22.22,14.34,24.85 C14.34,24.85,10.65,31.7,10.65,31.7 z"/><path style="fill:none;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:2;" d="M32.5,43 C32.5,43,30.5,41,30.5,41 C30.5,41,28.5,43,28.5,43"/><path style="fill:none;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:2;" d="M20.5,43 C20.5,43,18.5,41,18.5,41 C18.5,41,16.5,43,16.5,43"/><path style="fill:#e4e4e4;fill-rule:evenodd;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:2;" d="M16.5,29 C16.5,29,32.5,29,32.5,29 C32.5,29,32.5,36,32.5,36 C32.5,37.66,31.16,39,29.5,39 C29.5,39,19.5,39,19.5,39 C17.84,39,16.5,37.66,16.5,36 C16.5,36,16.5,29,16.5,29 z"/><g><path style="fill:#ffffff;fill-rule:evenodd;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:2;" d="M9.5,10.18 C9.5,7.87,11.29,6,13.5,6 C13.5,6,35.5,6,35.5,6 C37.71,6,39.5,7.87,39.5,10.18 C39.5,10.18,39.5,24.82,39.5,24.82 C39.5,27.13,37.71,29,35.5,29 C35.5,29,13.5,29,13.5,29 C11.29,29,9.5,27.13,9.5,24.82 C9.5,24.82,9.5,10.18,9.5,10.18 z"/><g><path style="fill:#ffffff;fill-rule:nonzero;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:2;" d="M24.5,11 C24.5,11,24.5,23,24.5,23"/><path style="fill:#ffffff;fill-rule:nonzero;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:2;" d="M28.5,15 C28.5,15,28.5,17,28.5,17"/><path style="fill:#ffffff;fill-rule:nonzero;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:2;" d="M20.5,15 C20.5,15,20.5,17,20.5,17"/></g></g></g></svg> ',
  sortDescending: '<svg class="stroked" viewBox="0 0 24 24"><g><path d="M16.5,14.5 C16.5,14.5,7.5,14.5,7.5,14.5"/><path d="M14.5,18.5 C14.5,18.5,9.5,18.5,9.5,18.5"/><path d="M18.5,10.5 C18.5,10.5,5.5,10.5,5.5,10.5"/><path d="M20.5,6.5 C20.5,6.5,3.5,6.5,3.5,6.5"/></g></svg> ',
  columns: '<svg class="stroked" viewBox="0 0 24 24"><path d="M12 3h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7m0-18H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h7m0-18v18"></path></svg>',
  underline: '<svg class="stroked" viewBox="0 0 24 24"><path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3"></path><line x1="4" y1="21" x2="20" y2="21"></line></svg>',
  grid: '<svg class="stroked" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>',
  triangle: '<svg class="stroked" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path></svg>',
  search: '<svg class="stroked" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>',
  volume2: '<svg class="stroked" viewBox="0 0 24 24"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>',
  arrowUpCircle: '<svg class="stroked" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><polyline points="16 12 12 8 8 12"></polyline><line x1="12" y1="16" x2="12" y2="8"></line></svg>',
  pauseCircle: '<svg class="stroked" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="10" y1="15" x2="10" y2="9"></line><line x1="14" y1="15" x2="14" y2="9"></line></svg>',
  checkSquare: '<svg class="stroked" viewBox="0 0 24 24"><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>',
  arrowDown: '<svg class="stroked" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg>',
  figma: '<svg class="stroked" viewBox="0 0 24 24"><path d="M5 5.5A3.5 3.5 0 0 1 8.5 2H12v7H8.5A3.5 3.5 0 0 1 5 5.5z"></path><path d="M12 2h3.5a3.5 3.5 0 1 1 0 7H12V2z"></path><path d="M12 12.5a3.5 3.5 0 1 1 7 0 3.5 3.5 0 1 1-7 0z"></path><path d="M5 19.5A3.5 3.5 0 0 1 8.5 16H12v3.5a3.5 3.5 0 1 1-7 0z"></path><path d="M5 12.5A3.5 3.5 0 0 1 8.5 9H12v7H8.5A3.5 3.5 0 0 1 5 12.5z"></path></svg>',
  cornerRightUp: '<svg class="stroked" viewBox="0 0 24 24"><polyline points="10 9 15 4 20 9"></polyline><path d="M4 20h7a4 4 0 0 0 4-4V4"></path></svg>',
  chevronsRight: '<svg class="stroked" viewBox="0 0 24 24"><polyline points="13 17 18 12 13 7"></polyline><polyline points="6 17 11 12 6 7"></polyline></svg>',
  list: '<svg class="stroked" viewBox="0 0 24 24"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>',
  chevronsDown: '<svg class="stroked" viewBox="0 0 24 24"><polyline points="7 13 12 18 17 13"></polyline><polyline points="7 6 12 11 17 6"></polyline></svg>',
  wind: '<svg class="stroked" viewBox="0 0 24 24"><path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2"></path></svg>',
  cornerUpRight: '<svg class="stroked" viewBox="0 0 24 24"><polyline points="15 14 20 9 15 4"></polyline><path d="M4 20v-7a4 4 0 0 1 4-4h12"></path></svg>',
  target: '<svg class="stroked" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>',
  scissors: '<svg class="stroked" viewBox="0 0 24 24"><circle cx="6" cy="6" r="3"></circle><circle cx="6" cy="18" r="3"></circle><line x1="20" y1="4" x2="8.12" y2="15.88"></line><line x1="14.47" y1="14.48" x2="20" y2="20"></line><line x1="8.12" y1="8.12" x2="12" y2="12"></line></svg>',
  minimize2: '<svg class="stroked" viewBox="0 0 24 24"><polyline points="4 14 10 14 10 20"></polyline><polyline points="20 10 14 10 14 4"></polyline><line x1="14" y1="10" x2="21" y2="3"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>',
  playCircle: '<svg class="stroked" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><polygon points="10 8 16 12 10 16 10 8"></polygon></svg>',
  crosshair: '<svg class="stroked" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="22" y1="12" x2="18" y2="12"></line><line x1="6" y1="12" x2="2" y2="12"></line><line x1="12" y1="6" x2="12" y2="2"></line><line x1="12" y1="22" x2="12" y2="18"></line></svg>',
  airplay: '<svg class="stroked" viewBox="0 0 24 24"><path d="M5 17H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-1"></path><polygon points="12 15 17 21 7 21 12 15"></polygon></svg>',
  xOctagon: '<svg class="stroked" viewBox="0 0 24 24"><polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"></polygon><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>',
  repeat: '<svg class="stroked" viewBox="0 0 24 24"><polyline points="17 1 21 5 17 9"></polyline><path d="M3 11V9a4 4 0 0 1 4-4h14"></path><polyline points="7 23 3 19 7 15"></polyline><path d="M21 13v2a4 4 0 0 1-4 4H3"></path></svg>',
  edit3: '<svg class="stroked" viewBox="0 0 24 24"><path d="M12 20h9"></path><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>',
  volume1: '<svg class="stroked" viewBox="0 0 24 24"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>',
  sunrise: '<svg class="stroked" viewBox="0 0 24 24"><path d="M17 18a5 5 0 0 0-10 0"></path><line x1="12" y1="2" x2="12" y2="9"></line><line x1="4.22" y1="10.22" x2="5.64" y2="11.64"></line><line x1="1" y1="18" x2="3" y2="18"></line><line x1="21" y1="18" x2="23" y2="18"></line><line x1="18.36" y1="11.64" x2="19.78" y2="10.22"></line><line x1="23" y1="22" x2="1" y2="22"></line><polyline points="8 6 12 2 16 6"></polyline></svg>',
  toggleRight: '<svg class="stroked" viewBox="0 0 24 24"><rect x="1" y="5" width="22" height="14" rx="7" ry="7"></rect><circle cx="16" cy="12" r="3"></circle></svg>',
  umbrella: '<svg class="stroked" viewBox="0 0 24 24"><path d="M23 12a11.05 11.05 0 0 0-22 0zm-5 7a3 3 0 0 1-6 0v-7"></path></svg>',
  user: '<svg class="stroked" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>',
  fileMinus: '<svg class="stroked" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="9" y1="15" x2="15" y2="15"></line></svg>',
  xCircle: '<svg class="stroked" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>',
  circle: '<svg class="stroked" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle></svg>',
  phoneMissed: '<svg class="stroked" viewBox="0 0 24 24"><line x1="23" y1="1" x2="17" y2="7"></line><line x1="17" y1="1" x2="23" y2="7"></line><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>',
  edit2: '<svg class="stroked" viewBox="0 0 24 24"><path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>',
  cornerLeftUp: '<svg class="stroked" viewBox="0 0 24 24"><polyline points="14 9 9 4 4 9"></polyline><path d="M20 20h-7a4 4 0 0 1-4-4V4"></path></svg>',
  home: '<svg class="stroked" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>',
  gitlab: '<svg class="stroked" viewBox="0 0 24 24"><path d="M22.65 14.39L12 22.13 1.35 14.39a.84.84 0 0 1-.3-.94l1.22-3.78 2.44-7.51A.42.42 0 0 1 4.82 2a.43.43 0 0 1 .58 0 .42.42 0 0 1 .11.18l2.44 7.49h8.1l2.44-7.51A.42.42 0 0 1 18.6 2a.43.43 0 0 1 .58 0 .42.42 0 0 1 .11.18l2.44 7.51L23 13.45a.84.84 0 0 1-.35.94z"></path></svg>',
  music: '<svg class="stroked" viewBox="0 0 24 24"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>',
  smartphone: '<svg class="stroked" viewBox="0 0 24 24"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>',
  moreHorizontal: '<svg class="stroked" viewBox="0 0 24 24"><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="12" r="1"></circle></svg>',
  sliders: '<svg class="stroked" viewBox="0 0 24 24"><line x1="4" y1="21" x2="4" y2="14"></line><line x1="4" y1="10" x2="4" y2="3"></line><line x1="12" y1="21" x2="12" y2="12"></line><line x1="12" y1="8" x2="12" y2="3"></line><line x1="20" y1="21" x2="20" y2="16"></line><line x1="20" y1="12" x2="20" y2="3"></line><line x1="1" y1="14" x2="7" y2="14"></line><line x1="9" y1="8" x2="15" y2="8"></line><line x1="17" y1="16" x2="23" y2="16"></line></svg>',
  arrowUpLeft: '<svg class="stroked" viewBox="0 0 24 24"><line x1="17" y1="17" x2="7" y2="7"></line><polyline points="7 17 7 7 17 7"></polyline></svg>',
  chevronDown: '<svg class="stroked" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"></polyline></svg>',
  hexagon: '<svg class="stroked" viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg>',
  github: '<svg class="stroked" viewBox="0 0 24 24"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>',
  crop: '<svg class="stroked" viewBox="0 0 24 24"><path d="M6.13 1L6 16a2 2 0 0 0 2 2h15"></path><path d="M1 6.13L16 6a2 2 0 0 1 2 2v15"></path></svg>',
  tag: '<svg class="stroked" viewBox="0 0 24 24"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>',
  briefcase: '<svg class="stroked" viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>',
  rotateCw: '<svg class="stroked" viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>',
  map: '<svg class="stroked" viewBox="0 0 24 24"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"></polygon><line x1="8" y1="2" x2="8" y2="18"></line><line x1="16" y1="6" x2="16" y2="22"></line></svg>',
  inbox: '<svg class="stroked" viewBox="0 0 24 24"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"></polyline><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path></svg>',
  alignJustify: '<svg class="stroked" viewBox="0 0 24 24"><line x1="21" y1="10" x2="3" y2="10"></line><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="14" x2="3" y2="14"></line><line x1="21" y1="18" x2="3" y2="18"></line></svg>',
  plusSquare: '<svg class="stroked" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>',
  power: '<svg class="stroked" viewBox="0 0 24 24"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path><line x1="12" y1="2" x2="12" y2="12"></line></svg>',
  database: '<svg class="stroked" viewBox="0 0 24 24"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path></svg>',
  cameraOff: '<svg class="stroked" viewBox="0 0 24 24"><line x1="1" y1="1" x2="23" y2="23"></line><path d="M21 21H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3m3-3h6l2 3h4a2 2 0 0 1 2 2v9.34m-7.72-2.06a4 4 0 1 1-5.56-5.56"></path></svg>',
  toggleLeft: '<svg class="stroked" viewBox="0 0 24 24"><rect x="1" y="5" width="22" height="14" rx="7" ry="7"></rect><circle cx="8" cy="12" r="3"></circle></svg>',
  file: '<svg class="stroked" viewBox="0 0 24 24"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>',
  messageCircle: '<svg class="stroked" viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>',
  voicemail: '<svg class="stroked" viewBox="0 0 24 24"><circle cx="5.5" cy="11.5" r="4.5"></circle><circle cx="18.5" cy="11.5" r="4.5"></circle><line x1="5.5" y1="16" x2="18.5" y2="16"></line></svg>',
  terminal: '<svg class="stroked" viewBox="0 0 24 24"><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></svg>',
  move: '<svg class="stroked" viewBox="0 0 24 24"><polyline points="5 9 2 12 5 15"></polyline><polyline points="9 5 12 2 15 5"></polyline><polyline points="15 19 12 22 9 19"></polyline><polyline points="19 9 22 12 19 15"></polyline><line x1="2" y1="12" x2="22" y2="12"></line><line x1="12" y1="2" x2="12" y2="22"></line></svg>',
  maximize: '<svg class="stroked" viewBox="0 0 24 24"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path></svg>',
  chevronUp: '<svg class="stroked" viewBox="0 0 24 24"><polyline points="18 15 12 9 6 15"></polyline></svg>',
  arrowDownLeft: '<svg class="stroked" viewBox="0 0 24 24"><line x1="17" y1="7" x2="7" y2="17"></line><polyline points="17 17 7 17 7 7"></polyline></svg>',
  fileText: '<svg class="stroked" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>',
  droplet: '<svg class="stroked" viewBox="0 0 24 24"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path></svg>',
  zapOff: '<svg class="stroked" viewBox="0 0 24 24"><polyline points="12.41 6.75 13 2 10.57 4.92"></polyline><polyline points="18.57 12.91 21 10 15.66 10"></polyline><polyline points="8 8 3 14 12 14 11 22 16 16"></polyline><line x1="1" y1="1" x2="23" y2="23"></line></svg>',
  x: '<svg class="stroked" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>',
  barChart: '<svg class="stroked" viewBox="0 0 24 24"><line x1="12" y1="20" x2="12" y2="10"></line><line x1="18" y1="20" x2="18" y2="4"></line><line x1="6" y1="20" x2="6" y2="16"></line></svg>',
  lock: '<svg class="stroked" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>',
  logIn: '<svg class="stroked" viewBox="0 0 24 24"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><polyline points="10 17 15 12 10 7"></polyline><line x1="15" y1="12" x2="3" y2="12"></line></svg>',
  shoppingBag: '<svg class="stroked" viewBox="0 0 24 24"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>',
  divide: '<svg class="stroked" viewBox="0 0 24 24"><circle cx="12" cy="6" r="2"></circle><line x1="5" y1="12" x2="19" y2="12"></line><circle cx="12" cy="18" r="2"></circle></svg>',
  cloudDrizzle: '<svg class="stroked" viewBox="0 0 24 24"><line x1="8" y1="19" x2="8" y2="21"></line><line x1="8" y1="13" x2="8" y2="15"></line><line x1="16" y1="19" x2="16" y2="21"></line><line x1="16" y1="13" x2="16" y2="15"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="12" y1="15" x2="12" y2="17"></line><path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25"></path></svg>',
  refreshCw: '<svg class="stroked" viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>',
  chevronRight: '<svg class="stroked" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"></polyline></svg>',
  clipboard: '<svg class="stroked" viewBox="0 0 24 24"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>',
  package: '<svg class="stroked" viewBox="0 0 24 24"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"></line><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>',
  instagram: '<svg class="stroked" viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>',
  link: '<svg class="stroked" viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>',
  videoOff: '<svg class="stroked" viewBox="0 0 24 24"><path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>',
  key: '<svg class="stroked" viewBox="0 0 24 24"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.78 7.78 5.5 5.5 0 0 1 7.78-7.78zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path></svg>',
  meh: '<svg class="stroked" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="8" y1="15" x2="16" y2="15"></line><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line></svg>',
  cornerDownRight: '<svg class="stroked" viewBox="0 0 24 24"><polyline points="15 10 20 15 15 20"></polyline><path d="M4 4v7a4 4 0 0 0 4 4h12"></path></svg>',
  arrowRight: '<svg class="stroked" viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>',
  aperture: '<svg class="stroked" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="14.31" y1="8" x2="20.05" y2="17.94"></line><line x1="9.69" y1="8" x2="21.17" y2="8"></line><line x1="7.38" y1="12" x2="13.12" y2="2.06"></line><line x1="9.69" y1="16" x2="3.95" y2="6.06"></line><line x1="14.31" y1="16" x2="2.83" y2="16"></line><line x1="16.62" y1="12" x2="10.88" y2="21.94"></line></svg>',
  stopCircle: '<svg class="stroked" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><rect x="9" y="9" width="6" height="6"></rect></svg>',
  logOut: '<svg class="stroked" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>',
  arrowLeftCircle: '<svg class="stroked" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><polyline points="12 8 8 12 12 16"></polyline><line x1="16" y1="12" x2="8" y2="12"></line></svg>',
  barChart2: '<svg class="stroked" viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>',
  gitPullRequest: '<svg class="stroked" viewBox="0 0 24 24"><circle cx="18" cy="18" r="3"></circle><circle cx="6" cy="6" r="3"></circle><path d="M13 6h3a2 2 0 0 1 2 2v7"></path><line x1="6" y1="9" x2="6" y2="21"></line></svg>',
  minimize: '<svg class="stroked" viewBox="0 0 24 24"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"></path></svg>',
  minusSquare: '<svg class="stroked" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="8" y1="12" x2="16" y2="12"></line></svg>',
  settings: '<svg class="stroked" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.6.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.6.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.6.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.6.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>',
  cloudSnow: '<svg class="stroked" viewBox="0 0 24 24"><path d="M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25"></path><line x1="8" y1="16" x2="8.01" y2="16"></line><line x1="8" y1="20" x2="8.01" y2="20"></line><line x1="12" y1="18" x2="12.01" y2="18"></line><line x1="12" y1="22" x2="12.01" y2="22"></line><line x1="16" y1="16" x2="16.01" y2="16"></line><line x1="16" y1="20" x2="16.01" y2="20"></line></svg>',
  thumbsDown: '<svg class="stroked" viewBox="0 0 24 24"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"></path></svg>',
  type: '<svg class="stroked" viewBox="0 0 24 24"><polyline points="4 7 4 4 20 4 20 7"></polyline><line x1="9" y1="20" x2="15" y2="20"></line><line x1="12" y1="4" x2="12" y2="20"></line></svg>',
  archive: '<svg class="stroked" viewBox="0 0 24 24"><polyline points="21 8 21 21 3 21 3 8"></polyline><rect x="1" y="3" width="22" height="5"></rect><line x1="10" y1="12" x2="14" y2="12"></line></svg>',
  phoneOutgoing: '<svg class="stroked" viewBox="0 0 24 24"><polyline points="23 7 23 1 17 1"></polyline><line x1="16" y1="8" x2="23" y2="1"></line><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>',
  pocket: '<svg class="stroked" viewBox="0 0 24 24"><path d="M4 3h16a2 2 0 0 1 2 2v6a10 10 0 0 1-10 10A10 10 0 0 1 2 11V5a2 2 0 0 1 2-2z"></path><polyline points="8 10 12 14 16 10"></polyline></svg>',
  mail: '<svg class="stroked" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>',
  shield: '<svg class="stroked" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>',
  download: '<svg class="stroked" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>',
  phoneForwarded: '<svg class="stroked" viewBox="0 0 24 24"><polyline points="19 1 23 5 19 9"></polyline><line x1="15" y1="5" x2="23" y2="5"></line><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>',
  cornerRightDown: '<svg class="stroked" viewBox="0 0 24 24"><polyline points="10 15 15 20 20 15"></polyline><path d="M4 4h7a4 4 0 0 1 4 4v12"></path></svg>',
  bookOpen: '<svg class="stroked" viewBox="0 0 24 24"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>',
  divideSquare: '<svg class="stroked" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="8" y1="12" x2="16" y2="12"></line><line x1="12" y1="16" x2="12" y2="16"></line><line x1="12" y1="8" x2="12" y2="8"></line></svg>',
  server: '<svg class="stroked" viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect><rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect><line x1="6" y1="6" x2="6.01" y2="6"></line><line x1="6" y1="18" x2="6.01" y2="18"></line></svg>',
  tv: '<svg class="stroked" viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="15" rx="2" ry="2"></rect><polyline points="17 2 12 7 7 2"></polyline></svg>',
  skipForward: '<svg class="stroked" viewBox="0 0 24 24"><polygon points="5 4 15 12 5 20 5 4"></polygon><line x1="19" y1="5" x2="19" y2="19"></line></svg>',
  volume: '<svg class="stroked" viewBox="0 0 24 24"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon></svg>',
  userPlus: '<svg class="stroked" viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>',
  batteryCharging: '<svg class="stroked" viewBox="0 0 24 24"><path d="M5 18H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3.19M15 6h2a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-3.19"></path><line x1="23" y1="13" x2="23" y2="11"></line><polyline points="11 6 7 12 13 12 9 18"></polyline></svg>',
  layers: '<svg class="stroked" viewBox="0 0 24 24"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>',
  slash: '<svg class="stroked" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>',
  radio: '<svg class="stroked" viewBox="0 0 24 24"><circle cx="12" cy="12" r="2"></circle><path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14"></path></svg>',
  book: '<svg class="stroked" viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>',
  userMinus: '<svg class="stroked" viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="23" y1="11" x2="17" y2="11"></line></svg>',
  bell: '<svg class="stroked" viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>',
  gitBranch: '<svg class="stroked" viewBox="0 0 24 24"><line x1="6" y1="3" x2="6" y2="15"></line><circle cx="18" cy="6" r="3"></circle><circle cx="6" cy="18" r="3"></circle><path d="M18 9a9 9 0 0 1-9 9"></path></svg>',
  coffee: '<svg class="stroked" viewBox="0 0 24 24"><path d="M18 8h1a4 4 0 0 1 0 8h-1"></path><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path><line x1="6" y1="1" x2="6" y2="4"></line><line x1="10" y1="1" x2="10" y2="4"></line><line x1="14" y1="1" x2="14" y2="4"></line></svg>',
  code: '<svg class="stroked" viewBox="0 0 24 24"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>',
  thermometer: '<svg class="stroked" viewBox="0 0 24 24"><path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"></path></svg>',
  cast: '<svg class="stroked" viewBox="0 0 24 24"><path d="M2 16.1A5 5 0 0 1 5.9 20M2 12.05A9 9 0 0 1 9.95 20M2 8V6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6"></path><line x1="2" y1="20" x2="2.01" y2="20"></line></svg>',
  flag: '<svg class="stroked" viewBox="0 0 24 24"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg>',
  eyeOff: '<svg class="stroked" viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>',
  battery: '<svg class="stroked" viewBox="0 0 24 24"><rect x="1" y="6" width="18" height="12" rx="2" ry="2"></rect><line x1="23" y1="13" x2="23" y2="11"></line></svg>',
  disc: '<svg class="stroked" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="3"></circle></svg>',
  frown: '<svg class="stroked" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><path d="M16 16s-1.5-2-4-2-4 2-4 2"></path><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line></svg>',
  tool: '<svg class="stroked" viewBox="0 0 24 24"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>',
  cpu: '<svg class="stroked" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect><rect x="9" y="9" width="6" height="6"></rect><line x1="9" y1="1" x2="9" y2="4"></line><line x1="15" y1="1" x2="15" y2="4"></line><line x1="9" y1="20" x2="9" y2="23"></line><line x1="15" y1="20" x2="15" y2="23"></line><line x1="20" y1="9" x2="23" y2="9"></line><line x1="20" y1="14" x2="23" y2="14"></line><line x1="1" y1="9" x2="4" y2="9"></line><line x1="1" y1="14" x2="4" y2="14"></line></svg>',
  bold: '<svg class="stroked" viewBox="0 0 24 24"><path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path></svg>',
  hash: '<svg class="stroked" viewBox="0 0 24 24"><line x1="4" y1="9" x2="20" y2="9"></line><line x1="4" y1="15" x2="20" y2="15"></line><line x1="10" y1="3" x2="8" y2="21"></line><line x1="16" y1="3" x2="14" y2="21"></line></svg>',
  share2: '<svg class="stroked" viewBox="0 0 24 24"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>',
  plus: '<svg class="stroked" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>',
  check: '<svg class="stroked" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>',
  rotateCcw: '<svg class="stroked" viewBox="0 0 24 24"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg>',
  hardDrive: '<svg class="stroked" viewBox="0 0 24 24"><line x1="22" y1="12" x2="2" y2="12"></line><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path><line x1="6" y1="16" x2="6.01" y2="16"></line><line x1="10" y1="16" x2="10.01" y2="16"></line></svg>',
  bluetooth: '<svg class="stroked" viewBox="0 0 24 24"><polyline points="6.5 6.5 17.5 17.5 12 23 12 1 17.5 6.5 6.5 17.5"></polyline></svg>',
  pieChart: '<svg class="stroked" viewBox="0 0 24 24"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path><path d="M22 12A10 10 0 0 0 12 2v10z"></path></svg>',
  headphones: '<svg class="stroked" viewBox="0 0 24 24"><path d="M3 18v-6a9 9 0 0 1 18 0v6"></path><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"></path></svg>',
  rss: '<svg class="stroked" viewBox="0 0 24 24"><path d="M4 11a9 9 0 0 1 9 9"></path><path d="M4 4a16 16 0 0 1 16 16"></path><circle cx="5" cy="19" r="1"></circle></svg>',
  wifi: '<svg class="stroked" viewBox="0 0 24 24"><path d="M5 12.55a11 11 0 0 1 14.08 0"></path><path d="M1.42 9a16 16 0 0 1 21.16 0"></path><path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path><line x1="12" y1="20" x2="12.01" y2="20"></line></svg>',
  cornerUpLeft: '<svg class="stroked" viewBox="0 0 24 24"><polyline points="9 14 4 9 9 4"></polyline><path d="M20 20v-7a4 4 0 0 0-4-4H4"></path></svg>',
  watch: '<svg class="stroked" viewBox="0 0 24 24"><circle cx="12" cy="12" r="7"></circle><polyline points="12 9 12 12 13.5 13.5"></polyline><path d="M16.51 17.35l-.35 3.83a2 2 0 0 1-2 1.82H9.83a2 2 0 0 1-2-1.82l-.35-3.83m.01-10.7l.35-3.83A2 2 0 0 1 9.83 1h4.35a2 2 0 0 1 2 1.82l.35 3.83"></path></svg>',
  info: '<svg class="stroked" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>',
  userX: '<svg class="stroked" viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="18" y1="8" x2="23" y2="13"></line><line x1="23" y1="8" x2="18" y2="13"></line></svg>',
  loader: '<svg class="stroked" viewBox="0 0 24 24"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>',
  refreshCcw: '<svg class="stroked" viewBox="0 0 24 24"><polyline points="1 4 1 10 7 10"></polyline><polyline points="23 20 23 14 17 14"></polyline><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"></path></svg>',
  folderPlus: '<svg class="stroked" viewBox="0 0 24 24"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path><line x1="12" y1="11" x2="12" y2="17"></line><line x1="9" y1="14" x2="15" y2="14"></line></svg>',
  gitMerge: '<svg class="stroked" viewBox="0 0 24 24"><circle cx="18" cy="18" r="3"></circle><circle cx="6" cy="6" r="3"></circle><path d="M6 21V9a9 9 0 0 0 9 9"></path></svg>',
  mic: '<svg class="stroked" viewBox="0 0 24 24"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>',
  copy: '<svg class="stroked" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>',
  zoomIn: '<svg class="stroked" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>',
  arrowRightCircle: '<svg class="stroked" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><polyline points="12 16 16 12 12 8"></polyline><line x1="8" y1="12" x2="16" y2="12"></line></svg>',
  alignRight: '<svg class="stroked" viewBox="0 0 24 24"><line x1="21" y1="10" x2="7" y2="10"></line><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="14" x2="3" y2="14"></line><line x1="21" y1="18" x2="7" y2="18"></line></svg>',
  image: '<svg class="stroked" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>',
  maximize2: '<svg class="stroked" viewBox="0 0 24 24"><polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>',
  checkCircle: '<svg class="stroked" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>',
  sunset: '<svg class="stroked" viewBox="0 0 24 24"><path d="M17 18a5 5 0 0 0-10 0"></path><line x1="12" y1="9" x2="12" y2="2"></line><line x1="4.22" y1="10.22" x2="5.64" y2="11.64"></line><line x1="1" y1="18" x2="3" y2="18"></line><line x1="21" y1="18" x2="23" y2="18"></line><line x1="18.36" y1="11.64" x2="19.78" y2="10.22"></line><line x1="23" y1="22" x2="1" y2="22"></line><polyline points="16 5 12 9 8 5"></polyline></svg>',
  save: '<svg class="stroked" viewBox="0 0 24 24"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>',
  smile: '<svg class="stroked" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><path d="M8 14s1.5 2 4 2 4-2 4-2"></path><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line></svg>',
  navigation: '<svg class="stroked" viewBox="0 0 24 24"><polygon points="3 11 22 2 13 21 11 13 3 11"></polygon></svg>',
  cloudLightning: '<svg class="stroked" viewBox="0 0 24 24"><path d="M19 16.9A5 5 0 0 0 18 7h-1.26a8 8 0 1 0-11.62 9"></path><polyline points="13 11 9 17 15 17 11 23"></polyline></svg>',
  paperclip: '<svg class="stroked" viewBox="0 0 24 24"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>',
  fastForward: '<svg class="stroked" viewBox="0 0 24 24"><polygon points="13 19 22 12 13 5 13 19"></polygon><polygon points="2 19 11 12 2 5 2 19"></polygon></svg>',
  xSquare: '<svg class="stroked" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="9" x2="15" y2="15"></line><line x1="15" y1="9" x2="9" y2="15"></line></svg>',
  award: '<svg class="stroked" viewBox="0 0 24 24"><circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline></svg>',
  zoomOut: '<svg class="stroked" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>',
  box: '<svg class="stroked" viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>',
  thumbsUp: '<svg class="stroked" viewBox="0 0 24 24"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg>',
  percent: '<svg class="stroked" viewBox="0 0 24 24"><line x1="19" y1="5" x2="5" y2="19"></line><circle cx="6.5" cy="6.5" r="2.5"></circle><circle cx="17.5" cy="17.5" r="2.5"></circle></svg>',
  sidebar: '<svg class="stroked" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line></svg>',
  square: '<svg class="stroked" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg>',
  play: '<svg class="stroked" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>',
  gitCommit: '<svg class="stroked" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"></circle><line x1="1.05" y1="12" x2="7" y2="12"></line><line x1="17.01" y1="12" x2="22.96" y2="12"></line></svg>',
  table: '<svg class="stroked" viewBox="0 0 24 24"><path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18"></path></svg>',
  send: '<svg class="stroked" viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>',
  phoneCall: '<svg class="stroked" viewBox="0 0 24 24"><path d="M15.05 5A5 5 0 0 1 19 8.95M15.05 1A9 9 0 0 1 23 8.94m-1 7.98v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>',
  speaker: '<svg class="stroked" viewBox="0 0 24 24"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><circle cx="12" cy="14" r="4"></circle><line x1="12" y1="6" x2="12.01" y2="6"></line></svg>',
  facebook: '<svg class="filled" version="1" viewBox="0 0 512 512"><g></g><path d="M464 0h-416c-26 0-48 22-48 48v416c0 26 22 48 48 48h208v-224h-64v-64h64v-32c0-53 43-96 96-96h64v64h-64c-18 0-32 14-32 32v32h96l-16 64h-80v224h144c26 0 48-22 48-48v-416c0-26-22-48-48-48z"></path></svg> ',
  codesandbox: '<svg class="stroked" viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="7.5 4.21 12 6.81 16.5 4.21"></polyline><polyline points="7.5 19.79 7.5 14.6 3 12"></polyline><polyline points="21 12 16.5 14.6 16.5 19.79"></polyline><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>',
  camera: '<svg class="stroked" viewBox="0 0 24 24"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>',
  link2: '<svg class="stroked" viewBox="0 0 24 24"><path d="M15 7h3a5 5 0 0 1 5 5 5 5 0 0 1-5 5h-3m-6 0H6a5 5 0 0 1-5-5 5 5 0 0 1 5-5h3"></path><line x1="8" y1="12" x2="16" y2="12"></line></svg>',
  printer: '<svg class="stroked" viewBox="0 0 24 24"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>',
  folderMinus: '<svg class="stroked" viewBox="0 0 24 24"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path><line x1="9" y1="14" x2="15" y2="14"></line></svg>',
  arrowUpRight: '<svg class="stroked" viewBox="0 0 24 24"><line x1="7" y1="17" x2="17" y2="7"></line><polyline points="7 7 17 7 17 17"></polyline></svg>',
  truck: '<svg class="stroked" viewBox="0 0 24 24"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>',
  lifeBuoy: '<svg class="stroked" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="4"></circle><line x1="4.93" y1="4.93" x2="9.17" y2="9.17"></line><line x1="14.83" y1="14.83" x2="19.07" y2="19.07"></line><line x1="14.83" y1="9.17" x2="19.07" y2="4.93"></line><line x1="14.83" y1="9.17" x2="18.36" y2="5.64"></line><line x1="4.93" y1="19.07" x2="9.17" y2="14.83"></line></svg>',
  penTool: '<svg class="stroked" viewBox="0 0 24 24"><path d="M12 19l7-7 3 3-7 7-3-3z"></path><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path><path d="M2 2l7.59 7.59"></path><circle cx="11" cy="11" r="2"></circle></svg>',
  atSign: '<svg class="stroked" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"></circle><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94"></path></svg>',
  feather: '<svg class="stroked" viewBox="0 0 24 24"><path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"></path><line x1="16" y1="8" x2="2" y2="22"></line><line x1="17.5" y1="15" x2="9" y2="15"></line></svg>',
  trash: '<svg class="stroked" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>',
  wifiOff: '<svg class="stroked" viewBox="0 0 24 24"><line x1="1" y1="1" x2="23" y2="23"></line><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"></path><path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"></path><path d="M10.71 5.05A16 16 0 0 1 22.58 9"></path><path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"></path><path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path><line x1="12" y1="20" x2="12.01" y2="20"></line></svg>',
  cornerLeftDown: '<svg class="stroked" viewBox="0 0 24 24"><polyline points="14 15 9 20 4 15"></polyline><path d="M20 4h-7a4 4 0 0 0-4 4v12"></path></svg>',
  dollarSign: '<svg class="stroked" viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>',
  star: '<svg class="stroked" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>',
  cloudOff: '<svg class="stroked" viewBox="0 0 24 24"><path d="M22.61 16.95A5 5 0 0 0 18 10h-1.26a8 8 0 0 0-7.05-6M5 5a8 8 0 0 0 4 15h9a5 5 0 0 0 1.7-.3"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>',
  sun: '<svg class="stroked" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>',
  messageSquare: '<svg class="stroked" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>',
  edit: '<svg class="stroked" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>',
  anchor: '<svg class="stroked" viewBox="0 0 24 24"><circle cx="12" cy="5" r="3"></circle><line x1="12" y1="22" x2="12" y2="8"></line><path d="M5 12H2a10 10 0 0 0 20 0h-3"></path></svg>',
  alertCircle: '<svg class="stroked" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>',
  chevronsUp: '<svg class="stroked" viewBox="0 0 24 24"><polyline points="17 11 12 6 7 11"></polyline><polyline points="17 18 12 13 7 18"></polyline></svg>',
  uploadCloud: '<svg class="stroked" viewBox="0 0 24 24"><polyline points="16 16 12 12 8 16"></polyline><line x1="12" y1="12" x2="12" y2="21"></line><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"></path><polyline points="16 16 12 12 8 16"></polyline></svg>',
  twitch: '<svg class="stroked" viewBox="0 0 24 24"><path d="M21 2H3v16h5v4l4-4h5l4-4V2zm-10 9V7m5 4V7"></path></svg>',
  youtube: '<svg class="filled" version="1" viewBox="0 0 512 512"><g></g><path d="M507 154c0 0-5-35-20-51-20-20-41-21-51-22-72-5-179-5-179-5h-0c0 0-108 0-179 5-10 1-32 1-51 22-15 16-20 51-20 51s-5 41-5 83v39c0 41 5 83 5 83s5 35 20 51c20 20 45 20 57 22 41 4 174 5 174 5s108-0 179-5c10-1 32-1 51-22 15-16 20-51 20-51s5-41 5-83v-39c-0-41-5-83-5-83zM203 322v-144l138 72-138 72z"></path></svg> ',
  unlock: '<svg class="stroked" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 9.9-1"></path></svg>',
  compass: '<svg class="stroked" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon></svg>',
  plusCircle: '<svg class="stroked" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>',
  creditCard: '<svg class="stroked" viewBox="0 0 24 24"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>',
  cloudRain: '<svg class="stroked" viewBox="0 0 24 24"><line x1="16" y1="13" x2="16" y2="21"></line><line x1="8" y1="13" x2="8" y2="21"></line><line x1="12" y1="15" x2="12" y2="23"></line><path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25"></path></svg>',
  trash2: '<svg class="stroked" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>',
  skipBack: '<svg class="stroked" viewBox="0 0 24 24"><polygon points="19 20 9 12 19 4 19 20"></polygon><line x1="5" y1="19" x2="5" y2="5"></line></svg>',
  filePlus: '<svg class="stroked" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>',
  delete: '<svg class="stroked" viewBox="0 0 24 24"><path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"></path><line x1="18" y1="9" x2="12" y2="15"></line><line x1="12" y1="9" x2="18" y2="15"></line></svg>',
  command: '<svg class="stroked" viewBox="0 0 24 24"><path d="M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3H6a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 3 3 0 0 0-3-3z"></path></svg>',
  clock: '<svg class="stroked" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>',
  octagon: '<svg class="stroked" viewBox="0 0 24 24"><polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"></polygon></svg>',
  phone: '<svg class="stroked" viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>',
  eye: '<svg class="stroked" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>',
  phoneOff: '<svg class="stroked" viewBox="0 0 24 24"><path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91"></path><line x1="23" y1="1" x2="1" y2="23"></line></svg>',
  codepen: '<svg class="stroked" viewBox="0 0 24 24"><polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2"></polygon><line x1="12" y1="22" x2="12" y2="15.5"></line><polyline points="22 8.5 12 15.5 2 8.5"></polyline><polyline points="2 15.5 12 8.5 22 15.5"></polyline><line x1="12" y1="2" x2="12" y2="8.5"></line></svg>',
  dribbble: '<svg class="stroked" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><path d="M8.56 2.75c4.37 6.03 6.02 9.42 8.03 17.72m2.54-15.38c-3.72 4.35-8.94 5.66-16.88 5.85m19.5 1.9c-3.5-.93-6.63-.82-8.94 0-2.58.92-5.01 2.86-7.44 6.32"></path></svg>',
  gift: '<svg class="stroked" viewBox="0 0 24 24"><polyline points="20 12 20 22 4 22 4 12"></polyline><rect x="2" y="7" width="20" height="5"></rect><line x1="12" y1="22" x2="12" y2="7"></line><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"></path><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"></path></svg>',
  externalLink: '<svg class="stroked" viewBox="0 0 24 24"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>',
  zap: '<svg class="stroked" viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>',
  trello: '<svg class="stroked" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><rect x="7" y="7" width="3" height="9"></rect><rect x="14" y="7" width="3" height="5"></rect></svg>',
  moreVertical: '<svg class="stroked" viewBox="0 0 24 24"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>',
  micOff: '<svg class="stroked" viewBox="0 0 24 24"><line x1="1" y1="1" x2="23" y2="23"></line><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>',
  share: '<svg class="stroked" viewBox="0 0 24 24"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line></svg>',
  arrowUp: '<svg class="stroked" viewBox="0 0 24 24"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>',
  bellOff: '<svg class="stroked" viewBox="0 0 24 24"><path d="M13.73 21a2 2 0 0 1-3.46 0"></path><path d="M18.63 13A17.89 17.89 0 0 1 18 8"></path><path d="M6.26 6.26A5.86 5.86 0 0 0 6 8c0 7-3 9-3 9h14"></path><path d="M18 8a6 6 0 0 0-9.33-5"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>',
  linkedin: '<svg class="stroked" viewBox="0 0 24 24"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg>',
  video: '<svg class="stroked" viewBox="0 0 24 24"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>',
  divideCircle: '<svg class="stroked" viewBox="0 0 24 24"><line x1="8" y1="12" x2="16" y2="12"></line><line x1="12" y1="16" x2="12" y2="16"></line><line x1="12" y1="8" x2="12" y2="8"></line><circle cx="12" cy="12" r="10"></circle></svg>',
  activity: '<svg class="stroked" viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>',
  twitter: '<svg class="stroked" viewBox="0 0 24 24"><path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"></path></svg>',
  mapPin: '<svg class="stroked" viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>',
  filter: '<svg class="stroked" viewBox="0 0 24 24"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>',
  phoneIncoming: '<svg class="stroked" viewBox="0 0 24 24"><polyline points="16 2 16 8 22 8"></polyline><line x1="23" y1="1" x2="16" y2="8"></line><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>',
  italic: '<svg class="stroked" viewBox="0 0 24 24"><line x1="19" y1="4" x2="10" y2="4"></line><line x1="14" y1="20" x2="5" y2="20"></line><line x1="15" y1="4" x2="9" y2="20"></line></svg>',
  chevronsLeft: '<svg class="stroked" viewBox="0 0 24 24"><polyline points="11 17 6 12 11 7"></polyline><polyline points="18 17 13 12 18 7"></polyline></svg>',
  calendar: '<svg class="stroked" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>',
  globe: '<svg class="stroked" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>',
  arrowLeft: '<svg class="stroked" viewBox="0 0 24 24"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>',
  alignCenter: '<svg class="stroked" viewBox="0 0 24 24"><line x1="18" y1="10" x2="6" y2="10"></line><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="14" x2="3" y2="14"></line><line x1="18" y1="18" x2="6" y2="18"></line></svg>',
  minusCircle: '<svg class="stroked" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="8" y1="12" x2="16" y2="12"></line></svg>',
  arrowDownRight: '<svg class="stroked" viewBox="0 0 24 24"><line x1="7" y1="7" x2="17" y2="17"></line><polyline points="17 7 17 17 7 17"></polyline></svg>',
  framer: '<svg class="stroked" viewBox="0 0 24 24"><path d="M5 16V9h14V2H5l14 14h-7m-7 0l7 7v-7m-7 0h7"></path></svg>',
  volumeX: '<svg class="stroked" viewBox="0 0 24 24"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>',
  slack: '<svg class="stroked" viewBox="0 0 24 24"><path d="M14.5 10c-.83 0-1.5-.67-1.5-1.5v-5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5v5c0 .83-.67 1.5-1.5 1.5z"></path><path d="M20.5 10H19V8.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"></path><path d="M9.5 14c.83 0 1.5.67 1.5 1.5v5c0 .83-.67 1.5-1.5 1.5S8 21.33 8 20.5v-5c0-.83.67-1.5 1.5-1.5z"></path><path d="M3.5 14H5v1.5c0 .83-.67 1.5-1.5 1.5S2 16.33 2 15.5 2.67 14 3.5 14z"></path><path d="M14 14.5c0-.83.67-1.5 1.5-1.5h5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5h-5c-.83 0-1.5-.67-1.5-1.5z"></path><path d="M15.5 19H14v1.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5-.67-1.5-1.5-1.5z"></path><path d="M10 9.5C10 8.67 9.33 8 8.5 8h-5C2.67 8 2 8.67 2 9.5S2.67 11 3.5 11h5c.83 0 1.5-.67 1.5-1.5z"></path><path d="M8.5 5H10V3.5C10 2.67 9.33 2 8.5 2S7 2.67 7 3.5 7.67 5 8.5 5z"></path></svg>',
  cloud: '<svg class="stroked" viewBox="0 0 24 24"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path></svg>',
  downloadCloud: '<svg class="stroked" viewBox="0 0 24 24"><polyline points="8 17 12 21 16 17"></polyline><line x1="12" y1="12" x2="12" y2="21"></line><path d="M20.88 18.09A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.29"></path></svg>',
  shuffle: '<svg class="stroked" viewBox="0 0 24 24"><polyline points="16 3 21 3 21 8"></polyline><line x1="4" y1="20" x2="21" y2="3"></line><polyline points="21 16 21 21 16 21"></polyline><line x1="15" y1="15" x2="21" y2="21"></line><line x1="4" y1="4" x2="9" y2="9"></line></svg>',
  rewind: '<svg class="stroked" viewBox="0 0 24 24"><polygon points="11 19 2 12 11 5 11 19"></polygon><polygon points="22 19 13 12 22 5 22 19"></polygon></svg>',
  upload: '<svg class="stroked" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>',
  trendingDown: '<svg class="stroked" viewBox="0 0 24 24"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline><polyline points="17 18 23 18 23 12"></polyline></svg>',
  pause: '<svg class="stroked" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>',
  arrowDownCircle: '<svg class="stroked" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><polyline points="8 12 12 16 16 12"></polyline><line x1="12" y1="8" x2="12" y2="16"></line></svg>',
  bookmark: '<svg class="stroked" viewBox="0 0 24 24"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>',
  alertTriangle: '<svg class="stroked" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
  userCheck: '<svg class="stroked" viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><polyline points="17 11 19 13 23 9"></polyline></svg>',
  tablet: '<svg class="stroked" viewBox="0 0 24 24"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>',
  alertOctagon: '<svg class="stroked" viewBox="0 0 24 24"><polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"></polygon><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>',
  menu: '<svg class="stroked" viewBox="0 0 24 24"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>',
  chrome: '<svg class="stroked" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="4"></circle><line x1="21.17" y1="8" x2="12" y2="8"></line><line x1="3.95" y1="6.06" x2="8.54" y2="14"></line><line x1="10.88" y1="21.94" x2="15.46" y2="14"></line></svg>',
  shoppingCart: '<svg class="stroked" viewBox="0 0 24 24"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>',
  folder: '<svg class="stroked" viewBox="0 0 24 24"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>',
  users: '<svg class="stroked" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>',
  cornerDownLeft: '<svg class="stroked" viewBox="0 0 24 24"><polyline points="9 10 4 15 9 20"></polyline><path d="M20 4v7a4 4 0 0 1-4 4H4"></path></svg>',
  monitor: '<svg class="stroked" viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>',
  minus: '<svg class="stroked" viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"></line></svg>',
  helpCircle: '<svg class="stroked" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
  navigation2: '<svg class="stroked" viewBox="0 0 24 24"><polygon points="12 2 19 21 12 17 5 21 12 2"></polygon></svg>',
  chevronLeft: '<svg class="stroked" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"></polyline></svg>',
  film: '<svg class="stroked" viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect><line x1="7" y1="2" x2="7" y2="22"></line><line x1="17" y1="2" x2="17" y2="22"></line><line x1="2" y1="12" x2="22" y2="12"></line><line x1="2" y1="7" x2="7" y2="7"></line><line x1="2" y1="17" x2="7" y2="17"></line><line x1="17" y1="17" x2="22" y2="17"></line><line x1="17" y1="7" x2="22" y2="7"></line></svg>',
  moon: '<svg class="stroked" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>',
  shieldOff: '<svg class="stroked" viewBox="0 0 24 24"><path d="M19.69 14a6.9 6.9 0 0 0 .31-2V5l-8-3-3.16 1.18"></path><path d="M4.73 4.73L4 5v7c0 6 8 10 8 10a20.29 20.29 0 0 0 5.62-4.38"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>',
  layout: '<svg class="stroked" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>',
  mousePointer: '<svg class="stroked" viewBox="0 0 24 24"><path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"></path><path d="M13 13l6 6"></path></svg>',
  alignLeft: '<svg class="stroked" viewBox="0 0 24 24"><line x1="17" y1="10" x2="3" y2="10"></line><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="14" x2="3" y2="14"></line><line x1="17" y1="18" x2="3" y2="18"></line></svg>',
  heart: '<svg class="stroked" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>',
  trendingUp: '<svg class="stroked" viewBox="0 0 24 24"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>',
  listBullet: '<svg class="stroked" viewBox="0 0 24 24"><g><path style="" d="M21,6 C21,6,10,6,10,6"/><path style="" d="M21,12 C21,12,10,12,10,12"/><path style="" d="M21,18 C21,18,10,18,10,18"/><path style="" d="M5.5,5 C6.05,5,6.5,5.45,6.5,6 C6.5,6.55,6.05,7,5.5,7 C4.95,7,4.5,6.55,4.5,6 C4.5,5.45,4.95,5,5.5,5 z"/><path style="" d="M5.5,11 C6.05,11,6.5,11.45,6.5,12 C6.5,12.55,6.05,13,5.5,13 C4.95,13,4.5,12.55,4.5,12 C4.5,11.45,4.95,11,5.5,11 z"/><path style="" d="M5.5,17 C6.05,17,6.5,17.45,6.5,18 C6.5,18.55,6.05,19,5.5,19 C4.95,19,4.5,18.55,4.5,18 C4.5,17.45,4.95,17,5.5,17 z"/></g></svg> ',
  indent: '<svg class="stroked" viewBox="0 0 24 24"><g><path style="" d="M21,10 C21,10,8,10,8,10"/><path style="" d="M21,6 C21,6,8,6,8,6"/><path style="" d="M21,14 C21,14,8,14,8,14"/><path style="" d="M21,18 C21,18,8,18,8,18"/><path style="" d="M2.5,9 C2.5,9,5.5,12,5.5,12 C5.5,12,2.5,15,2.5,15"/></g></svg> ',
  fontBold: '<svg class="stroked" viewBox="0 0 24 24"><g><path style="" d="M13.5,11 C15.71,11,17.5,12.68,17.5,14.75 C17.5,16.82,15.71,18.5,13.5,18.5 C13.5,18.5,8.5,18.5,8.5,18.5 C8.5,18.5,8.5,3.5,8.5,3.5 C8.5,3.5,13.5,3.5,13.5,3.5 C15.71,3.5,17.5,5.18,17.5,7.25 C17.5,9.32,15.71,11,13.5,11 C13.5,11,13.5,11,13.5,11 z"/><path style="" d="M13.5,11 C13.5,11,8.5,11,8.5,11"/><path style="" d="M12.5,11 C14.71,11,16.5,12.68,16.5,14.75 C16.5,16.82,14.71,18.5,12.5,18.5 C12.5,18.5,7.5,18.5,7.5,18.5 C7.5,18.5,7.5,3.5,7.5,3.5 C7.5,3.5,12.5,3.5,12.5,3.5 C14.71,3.5,16.5,5.18,16.5,7.25 C16.5,9.32,14.71,11,12.5,11 C12.5,11,12.5,11,12.5,11 z"/><path style="" d="M12.5,11 C12.5,11,7.5,11,7.5,11"/></g></svg> ',
  fontItalic: '<svg class="stroked" viewBox="0 0 24 24"><g><path style="" d="M17,4.5 C17,4.5,13,4.5,13,4.5"/><path style="" d="M11,19.5 C11,19.5,7,19.5,7,19.5"/><path style="" d="M15,4.5 C15,4.5,9,19.5,9,19.5"/></g></svg> ',
  fontUnderline: '<svg class="stroked" viewBox="0 0 24 24"><g><path style="" d="M7.5,3.5 C7.5,3.5,7.5,10.74,7.5,13.5 C7.5,16.26,9.74,18.5,12.5,18.5 C15.26,18.5,17.5,16.26,17.5,13.5 C17.5,10.74,17.5,3.5,17.5,3.5"/><path style="" d="M7.5,21.5 C7.5,21.5,17.5,21.5,17.5,21.5"/></g></svg> ',
  outdent: '<svg class="stroked" viewBox="0 0 24 24"><g><path style="" d="M21,10 C21,10,8,10,8,10"/><path style="" d="M21,6 C21,6,8,6,8,6"/><path style="" d="M21,14 C21,14,8,14,8,14"/><path style="" d="M21,18 C21,18,8,18,8,18"/><path style="" d="M5.5,9 C5.5,9,2.5,12,2.5,12 C2.5,12,5.5,15,5.5,15"/></g></svg> ',
  listNumber: '<svg class="stroked" viewBox="0 0 24 24"><g><path style="" d="M21,6 C21,6,10,6,10,6"/><path style="" d="M21,12 C21,12,10,12,10,12"/><path style="" d="M21,18 C21,18,10,18,10,18"/><path style="" d="M4.5,5 C4.5,5,5.5,4,5.5,4 C5.5,4,5.5,8,5.5,8"/><path style="" d="M4.5,10 C4.5,10,5.5,10,5.5,10 C6.05,10,6.5,10.45,6.5,11 C6.5,11,6.5,11,6.5,11 C6.5,11.55,6.05,12,5.5,12 C5.5,12,5.5,12,5.5,12 C4.95,12,4.5,12.45,4.5,13 C4.5,13,4.5,14,4.5,14 C4.5,14,6.5,14,6.5,14"/><path style="" d="M4.5,16 C4.5,16,5.5,16,5.5,16 C6.05,16,6.5,16.45,6.5,17 C6.5,17,6.5,17,6.5,17 C6.5,17.55,6.05,18,5.5,18 C5.5,18,4.5,18,4.5,18 C4.5,18,5.5,18,5.5,18 C6.05,18,6.5,18.45,6.5,19 C6.5,19,6.5,19,6.5,19 C6.5,19.55,6.05,20,5.5,20 C5.5,20,4.5,20,4.5,20"/></g></svg> ',
  resize: '<svg class="stroked" version="1.1" viewBox="0, 0, 24, 24"><g><path d="M9,3 L3,3 L3,9"/><path d="M15,21 L21,21 L21,15"/><path d="M3,3 L10,10"/><path d="M21,21 L14,14"/></g></svg> ',
  bug: '<svg class="stroked" viewBox="0 0 24 24"><g><path style="" d="M8,6 C8,3.79,9.79,2,12,2 C14.21,2,16,3.79,16,6 C16,6,8,6,8,6 z"/><path style="" d="M20,7 C20,7,18,9,18,9"/><path style="" d="M20,19 C20,19,18,17,18,17"/><path style="" d="M21,13 C21,13,18,13,18,13"/><path style="" d="M16.44,9 C17.3,9,18,9.7,18,10.56 C18,10.56,18,15,18,15 C18,18.31,15.31,21,12,21 C8.69,21,6,18.31,6,15 C6,15,6,10.56,6,10.56 C6,9.7,6.7,9,7.56,9 C7.56,9,16.44,9,16.44,9 z"/><path style="" d="M4,7 C4,7,6,9,6,9"/><path style="" d="M4,19 C4,19,6,17,6,17"/><path style="" d="M3,13 C3,13,6,13,6,13"/><path style="" d="M12,12 C12,12,12,17,12,17"/></g></svg> ',
  blog: '<svg class="stroked" viewBox="0 0 24 24"><g><path style="" d="M21,10.02 C21,10.02,21,15,21,15 C21,15.53,20.79,16.04,20.41,16.41 C20.04,16.79,19.53,17,19,17 C19,17,7,17,7,17 C5.67,18.33,4.33,19.67,3,21 C3,21,3,5,3,5 C3,4.47,3.21,3.96,3.59,3.59 C3.96,3.21,4.47,3,5,3 C8.53,3,10.49,3,14.02,3"/><path style="" d="M19,2 C19.54,1.46,20.32,1.25,21.05,1.45 C21.78,1.65,22.35,2.22,22.55,2.95 C22.75,3.68,22.54,4.46,22,5 C22,5,15.5,11.5,15.5,11.5 C14.17,11.83,12.83,12.17,11.5,12.5 C11.83,11.17,12.17,9.83,12.5,8.5 C15.67,5.33,15.83,5.17,19,2 z"/><path style="" d="M14.6,3"/><path style="" d="M21,8.77"/><path style="" d="M7,7 C7,7,10,7,10,7"/><path style="" d="M7,10 C7,10,9,10,9,10"/></g></svg> ',
  sortAscending: '<svg class="stroked" viewBox="0 0 24 24"><g><path d="M16.5,10.5 C16.5,10.5,7.5,10.5,7.5,10.5"/><path d="M14.5,6.5 C14.5,6.5,9.5,6.5,9.5,6.5"/><path d="M18.5,14.5 C18.5,14.5,5.5,14.5,5.5,14.5"/><path d="M20.5,18.5 C20.5,18.5,3.5,18.5,3.5,18.5"/></g></svg> ',
  npm: '<svg class="filled" version="1" viewBox="0 0 512 512"><g></g><path d="M0 0v512h512v-512h-512zM416 416h-64v-256h-96v256h-160v-320h320v320z"></path></svg> ',
  game: '<svg class="filled" version="1" viewBox="0 0 704 512"><g></g><path d="M528 97v-1h-336c-88 0-160 72-160 160s72 160 160 160c52 0 99-25 128-64h64c29 39 76 64 128 64 88 0 160-72 160-160 0-83-63-151-144-159zM288 288h-64v64h-64v-64h-64v-64h64v-64h64v64h64v64zM480 288c-18 0-32-14-32-32s14-32 32-32 32 14 32 32-14 32-32 32zM576 288c-18 0-32-14-32-32 0-18 14-32 32-32s32 14 32 32c0 18-14 32-32 32z"></path></svg> ',
  google: '<svg class="filled" version="1" viewBox="0 0 512 512"><g></g><path d="M256 0c-141 0-256 115-256 256s115 256 256 256 256-115 256-256-115-256-256-256zM260 448c-106 0-192-86-192-192s86-192 192-192c52 0 95 19 129 50l-52 50c-14-14-39-30-77-30-66 0-119 54-119 121s54 121 119 121c76 0 105-55 109-83h-109v-66h181c2 10 3 19 3 32 0 110-73 188-184 188z"></path></svg> ',
  discord: '<svg class="filled" version="1" viewBox="0 0 1013 768"><g></g><path d="M858 64c-60-28-131-51-204-64l-5-1c-8 14-17 32-25 51l-1 4c-35-6-75-9-116-9s-81 3-120 9l4-1c-9-22-18-40-28-57l1 3c-79 14-149 36-214 67l5-2c-132 196-168 387-150 575v0c73 55 158 99 250 127l6 2c19-26 38-55 53-85l2-3c-33-13-62-27-89-43l2 1c7-5 14-11 21-16 75 36 163 57 256 57s181-21 260-59l-4 2c7 6 14 11 21 16-25 15-53 29-83 40l-4 1c17 34 36 63 56 90l-1-2c98-30 183-74 259-130l-2 2c21-218-36-407-151-575zM338 524c-50 0-91-45-91-101s40-102 91-102 92 46 91 102-40 101-91 101zM675 524c-50 0-91-45-91-101s40-102 91-102 92 46 91 102-40 101-91 101z"></path></svg> '
};

// src/icons.ts
var defineIcons = (newIcons) => {
  Object.assign(icon_data_default, newIcons);
};
var svg2DataUrl = (svg, fill, stroke, strokeWidth) => {
  svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  for (const path of [
    ...svg.querySelectorAll("path, polygon, line, circle, rect, ellipse, polyline")
  ]) {
    if (fill !== undefined) {
      path.setAttribute("fill", fill);
    }
    if (stroke !== undefined) {
      path.setAttribute("stroke", stroke);
    }
    if (strokeWidth !== undefined) {
      path.setAttribute("stroke-width", String(strokeWidth));
    }
  }
  const styled = svg.querySelectorAll("[style]");
  svg.removeAttribute("style");
  for (const item of [...styled]) {
    const { fill: fill2, stroke: stroke2, strokeWidth: strokeWidth2, strokeLinecap, strokeLinejoin } = item.style;
    if (fill2)
      item.setAttribute("fill", l.fromCss(fill2).html);
    if (stroke2)
      item.setAttribute("stroke", l.fromCss(stroke2).html);
    if (strokeWidth2)
      item.setAttribute("strokeWidth", strokeWidth2);
    if (strokeLinecap)
      item.setAttribute("strokeLinecap", strokeLinecap);
    if (strokeLinejoin)
      item.setAttribute("strokeLinejoin", strokeLinejoin);
    item.removeAttribute("style");
  }
  const text = encodeURIComponent(svg.outerHTML);
  return `url(data:image/svg+xml;charset=UTF-8,${text})`;
};
var icons = new Proxy(icon_data_default, {
  get(target, prop) {
    let iconSpec = icon_data_default[prop];
    if (prop && !iconSpec) {
      console.warn(`icon ${prop} does not exist`);
    }
    if (!iconSpec) {
      iconSpec = icon_data_default.square;
    }
    return (...parts) => {
      const div = y.div();
      div.innerHTML = iconSpec;
      const sourceSvg = div.querySelector("svg");
      const classes = new Set(sourceSvg.classList);
      classes.add("xin-icon");
      const svg = Ko.svg({
        class: Array.from(classes).join(" "),
        viewBox: sourceSvg.getAttribute("viewBox")
      }, ...parts, ...sourceSvg.children);
      svg.style.strokeWidth = uo.tosiIconStrokeWidth("2px");
      svg.style.stroke = uo.tosiIconStroke(classes.has("filled") ? "none" : "currentColor");
      svg.style.fill = uo.tosiIconFill(classes.has("stroked") ? "none" : "currentColor");
      svg.style.height = uo.tosiIconSize("16px");
      return svg;
    };
  }
});

class SvgIcon extends F {
  static initAttributes = {
    icon: "",
    size: 0,
    fill: "",
    stroke: "",
    strokeWidth: 1
  };
  render() {
    super.render();
    this.textContent = "";
    const style = {};
    if (this.size) {
      style.height = this.size + "px";
      this.style.setProperty("--tosi-icon-size", `${this.size}px`);
      this.style.setProperty("--xin-icon-size", `${this.size}px`);
    }
    if (this.stroke) {
      style.stroke = this.stroke;
      style.strokeWidth = this.strokeWidth;
    }
    style.fill = this.fill;
    this.append(icons[this.icon]({ style }));
  }
}
var svgIcon = SvgIcon.elementCreator({
  tag: "xin-icon",
  styleSpec: {
    ":host": {
      "--tosi-icon-size": "var(--xin-icon-size, 16px)",
      "--tosi-icon-stroke-width": "var(--xin-icon-stroke-width, var(--icon-stroke-width, 2px))",
      "--tosi-icon-stroke-linejoin": "var(--icon-stroke-linejoin, round)",
      "--tosi-icon-stroke-linecap": "var(--icon-stroke-linecap, round)",
      "--tosi-icon-fill": "var(--xin-icon-fill, var(--icon-fill, none))",
      display: "inline-flex",
      stroke: "currentColor",
      strokeWidth: uo.tosiIconStrokeWidth("2px"),
      strokeLinejoin: uo.tosiIconStrokeLinejoin("round"),
      strokeLinecap: uo.tosiIconStrokeLinecap("round"),
      fill: uo.tosiIconFill("none")
    },
    ":host, :host svg": {
      height: uo.tosiIconSize("16px")
    }
  }
});

// src/babylon-3d.ts
var noop = () => {};

class B3d extends F {
  babylonReady;
  BABYLON;
  static styleSpec = {
    ":host": {
      display: "block",
      position: "relative"
    },
    ":host canvas": {
      width: "100%",
      height: "100%"
    },
    ":host .babylonVRicon": {
      height: 50,
      width: 80,
      backgroundColor: "transparent",
      filter: "drop-shadow(0 0 4px #000c)",
      backgroundImage: svg2DataUrl(icons.xrColor()),
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
      border: "none",
      borderRadius: 5,
      borderStyle: "none",
      outline: "none",
      transition: "transform 0.125s ease-out"
    },
    ":host .babylonVRicon:hover": {
      transform: "scale(1.1)"
    }
  };
  content = y.canvas({ part: "canvas" });
  constructor() {
    super();
    this.babylonReady = (async () => {
      const { BABYLON } = await scriptTag("https://cdn.babylonjs.com/babylon.js", "BABYLON");
      return BABYLON;
    })();
  }
  scene;
  engine;
  sceneCreated = noop;
  update = noop;
  _update = () => {
    if (this.scene) {
      if (this.update !== undefined) {
        this.update(this, this.BABYLON);
      }
      if (this.scene.activeCamera !== undefined) {
        this.scene.render();
      }
    }
  };
  onResize() {
    if (this.engine) {
      this.engine.resize();
    }
  }
  loadScene = async (path, file, processCallback) => {
    const { BABYLON } = await scriptTag("https://cdn.babylonjs.com/loaders/babylonjs.loaders.min.js", "BABYLON");
    BABYLON.SceneLoader.Append(path, file, this.scene, processCallback);
  };
  loadUI = async (options) => {
    const { BABYLON } = await scriptTag("https://cdn.babylonjs.com/gui/babylon.gui.min.js", "BABYLON");
    const advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("GUI", true, this.scene);
    const { snippetId, jsonUrl, data, size } = options;
    if (size) {
      advancedTexture.idealWidth = size;
      advancedTexture.renderAtIdealSize = true;
    }
    let gui;
    if (snippetId) {
      gui = await advancedTexture.parseFromSnippetAsync(snippetId);
    } else if (jsonUrl) {
      gui = await advancedTexture.parseFromURLAsync(jsonUrl);
    } else if (data) {
      gui = advancedTexture.parseContent(data);
    } else {
      return null;
    }
    const root = advancedTexture.getChildren()[0];
    const widgets = root.children.reduce((map, widget) => {
      map[widget.name] = widget;
      return map;
    }, {});
    return { advancedTexture, gui, root, widgets };
  };
  connectedCallback() {
    super.connectedCallback();
    const { canvas } = this.parts;
    this.babylonReady.then(async (BABYLON) => {
      this.BABYLON = BABYLON;
      this.engine = new BABYLON.Engine(canvas, true);
      this.scene = new BABYLON.Scene(this.engine);
      if (this.sceneCreated) {
        await this.sceneCreated(this, BABYLON);
      }
      if (this.scene.activeCamera === undefined) {
        const camera = new BABYLON.ArcRotateCamera("default-camera", -Math.PI / 2, Math.PI / 2.5, 3, new BABYLON.Vector3(0, 0, 0));
        camera.attachControl(this.parts.canvas, true);
      }
      this.engine.runRenderLoop(this._update);
    });
  }
}
var b3d = B3d.elementCreator({ tag: "xin-3d" });
// src/bodymovin-player.ts
class BodymovinPlayer extends F {
  static initAttributes = {
    src: "",
    json: ""
  };
  content = null;
  config = {
    renderer: "svg",
    loop: true,
    autoplay: true
  };
  static bodymovinAvailable;
  animation;
  static styleSpec = {
    ":host": {
      width: 400,
      height: 400,
      display: "inline-block"
    }
  };
  _loading = false;
  get loading() {
    return this._loading;
  }
  constructor() {
    super();
    if (BodymovinPlayer.bodymovinAvailable === undefined) {
      BodymovinPlayer.bodymovinAvailable = scriptTag("https://cdnjs.cloudflare.com/ajax/libs/bodymovin/5.12.2/lottie.min.js", "bodymovin");
    }
  }
  doneLoading = () => {
    this._loading = false;
  };
  load = ({ bodymovin }) => {
    this._loading = true;
    this.config.container = this.shadowRoot !== null ? this.shadowRoot : undefined;
    if (this.json !== "") {
      this.config.animationData = this.json;
      delete this.config.path;
    } else if (this.src !== "") {
      delete this.config.animationData;
      this.config.path = this.src;
    } else {
      console.log("%c<xin-lottie>%c expected either %cjson%c (animation data) or %csrc% c(url) but found neither.", "color: #44f; background: #fff; padding: 0 5px", "color: default", "color: #44f; background: #fff; padding: 0 5px", "color: default", "color: #44f; background: #fff; padding: 0 5px", "color: default");
    }
    if (this.animation) {
      this.animation.destroy();
      const root = this.shadowRoot;
      if (root !== null) {
        root.querySelector("svg")?.remove();
      }
    }
    this.animation = bodymovin.loadAnimation(this.config);
    this.animation.addEventListener("DOMLoaded", this.doneLoading);
  };
  render() {
    super.render();
    BodymovinPlayer.bodymovinAvailable.then(this.load).catch((e) => {
      console.error(e);
    });
  }
}
var bodymovinPlayer = BodymovinPlayer.elementCreator({
  tag: "xin-lottie"
});
// src/carousel.ts
var { button, slot, div } = y;

class XinCarousel extends F {
  static initAttributes = {
    dots: false,
    arrows: false,
    maxVisibleItems: 1,
    snapDuration: 0.25,
    snapDelay: 0.1,
    loop: false,
    auto: 0
  };
  lastAutoAdvance = Date.now();
  interval;
  autoAdvance = () => {
    if (this.auto > 0 && this.auto * 1000 < Date.now() - this.lastAutoAdvance) {
      this.forward();
    }
  };
  _page = 0;
  get page() {
    return this._page;
  }
  set page(p) {
    const { scroller, back, forward } = this.parts;
    if (this.lastPage <= 0) {
      forward.disabled = back.disabled = true;
      p = 0;
    } else {
      p = Math.max(0, Math.min(this.lastPage, p));
      p = isNaN(p) ? 0 : p;
    }
    if (this._page !== p) {
      this._page = isNaN(p) ? 0 : p;
      this.animateScroll(this._page * scroller.offsetWidth);
      back.disabled = this.page <= 0 && !this.loop;
      forward.disabled = this.page >= this.lastPage && !this.loop;
    }
  }
  get visibleItems() {
    return [...this.children].filter((element) => getComputedStyle(element).display !== "none");
  }
  get lastPage() {
    return Math.max(Math.ceil(this.visibleItems.length / (this.maxVisibleItems || 1)) - 1, 0);
  }
  static styleSpec = {
    ":host": {
      display: "flex",
      flexDirection: "column",
      position: "relative"
    },
    ":host svg": {
      height: Uo.carouselIconSize
    },
    ":host button": {
      outline: "none",
      border: "none",
      boxShadow: "none",
      background: "transparent",
      color: Uo.carouselButtonColor,
      padding: 0
    },
    ":host::part(back), :host::part(forward)": {
      position: "absolute",
      top: 0,
      bottom: 0,
      width: Uo.carouseButtonWidth,
      zIndex: 2
    },
    ":host::part(back)": {
      left: 0
    },
    ":host::part(forward)": {
      right: 0
    },
    ":host button:disabled": {
      opacity: 0.5,
      pointerEvents: "none"
    },
    ":host button:hover": {
      color: Uo.carouselButtonHoverColor
    },
    ":host button:active": {
      color: Uo.carouselButtonActiveColor
    },
    ":host::part(pager)": {
      position: "relative"
    },
    ":host::part(scroller)": {
      overflow: "auto hidden",
      position: "relative"
    },
    ":host::part(grid)": {
      display: "grid",
      justifyItems: "center"
    },
    ":host *::-webkit-scrollbar, *::-webkit-scrollbar-thumb": {
      display: "none"
    },
    ":host .dot": {
      background: Uo.carouselButtonColor,
      borderRadius: Uo.carouselDotSize,
      height: Uo.carouselDotSize,
      width: Uo.carouselDotSize,
      transition: Uo.carouselDotTransition
    },
    ":host .dot:not(.current):hover": {
      background: Uo.carouselButtonHoverColor,
      height: Uo.carouselDotSize150,
      width: Uo.carouselDotSize150,
      margin: Uo.carouselDotSize_25
    },
    ":host .dot:not(.current):active": {
      background: Uo.carouselButtonActiveColor
    },
    ":host .dot.current": {
      background: Uo.carouselDotCurrentColor
    },
    ":host::part(progress)": {
      display: "flex",
      gap: Uo.carouselDotSpacing,
      justifyContent: "center",
      padding: Uo.carouselProgressPadding
    }
  };
  easing = (t) => {
    return Math.sin(t * Math.PI * 0.5);
  };
  indicateCurrent = () => {
    const { scroller, progress } = this.parts;
    const page = scroller.scrollLeft / scroller.offsetWidth;
    [...progress.children].forEach((dot, index) => {
      dot.classList.toggle("current", Math.floor(index / this.maxVisibleItems - page) === 0);
    });
    this.lastAutoAdvance = Date.now();
    clearTimeout(this.snapTimer);
    this.snapTimer = setTimeout(this.snapPosition, this.snapDelay * 1000);
  };
  snapPosition = () => {
    const { scroller } = this.parts;
    const currentPosition = Math.round(scroller.scrollLeft / scroller.offsetWidth);
    if (currentPosition !== this.page) {
      this.page = currentPosition > this.page ? Math.ceil(currentPosition) : Math.floor(currentPosition);
    }
    this.lastAutoAdvance = Date.now();
  };
  back = () => {
    this.page = this.page > 0 ? this.page - 1 : this.lastPage;
  };
  forward = () => {
    this.page = this.page < this.lastPage ? this.page + 1 : 0;
  };
  handleDotClick = (event) => {
    const { progress } = this.parts;
    const index = [...progress.children].indexOf(event.target);
    if (index > -1) {
      this.page = Math.floor(index / this.maxVisibleItems);
    }
  };
  snapTimer;
  animationFrame;
  animateScroll(position, startingPosition = -1, timestamp = 0) {
    cancelAnimationFrame(this.animationFrame);
    const { scroller } = this.parts;
    if (startingPosition === -1) {
      startingPosition = scroller.scrollLeft;
      timestamp = Date.now();
      this.animationFrame = requestAnimationFrame(() => {
        this.animateScroll(position, startingPosition, timestamp);
      });
      return;
    }
    const elapsed = (Date.now() - timestamp) / 1000;
    if (elapsed >= this.snapDuration || Math.abs(scroller.scrollLeft - position) < 2) {
      scroller.scrollLeft = position;
      this.animationFrame = null;
    } else {
      scroller.scrollLeft = startingPosition + this.easing(elapsed / this.snapDuration) * (position - startingPosition);
      this.animationFrame = requestAnimationFrame(() => {
        this.animateScroll(position, startingPosition, timestamp);
      });
    }
  }
  content = () => [
    div({ part: "pager" }, button({ title: "previous slide", part: "back" }, icons.chevronLeft()), div({ title: "slides", role: "group", part: "scroller" }, div({ part: "grid" }, slot())), button({ title: "next slide", part: "forward" }, icons.chevronRight())),
    div({ title: "choose slide to display", role: "group", part: "progress" })
  ];
  connectedCallback() {
    super.connectedCallback();
    this.ariaRoleDescription = "carousel";
    this.ariaOrientation = "horizontal";
    this.ariaReadOnly = "true";
    const { back, forward, scroller, progress } = this.parts;
    back.addEventListener("click", this.back);
    forward.addEventListener("click", this.forward);
    scroller.addEventListener("scroll", this.indicateCurrent);
    progress.addEventListener("click", this.handleDotClick);
    this.lastAutoAdvance = Date.now();
    this.interval = setInterval(this.autoAdvance, 100);
  }
  disconnectedCallback() {
    clearInterval(this.interval);
  }
  render() {
    super.render();
    const { dots, arrows, visibleItems, lastPage } = this;
    const { progress, back, forward, grid } = this.parts;
    visibleItems.forEach((item) => {
      item.role = "group";
    });
    grid.style.gridTemplateColumns = `${100 / this.maxVisibleItems / (1 + this.lastPage)}% `.repeat(visibleItems.length).trim();
    grid.style.width = (1 + this.lastPage) * 100 + "%";
    progress.textContent = "";
    progress.append(...visibleItems.map((_2, index) => button({ title: `item ${index + 1}`, class: "dot" })));
    this.indicateCurrent();
    progress.style.display = dots && lastPage > 0 ? "" : "none";
    back.hidden = forward.hidden = !(arrows && lastPage > 0);
  }
}
var xinCarousel = XinCarousel.elementCreator({
  tag: "xin-carousel",
  styleSpec: {
    ":host": {
      _carouselIconSize: 24,
      _carouselButtonColor: "#0004",
      _carouselButtonHoverColor: "#0006",
      _carouselButtonActiveColor: "#000c",
      _carouseButtonWidth: 48,
      _carouselDotCurrentColor: "#0008",
      _carouselDotSize: 8,
      _carouselDotSpacing: Uo.carouselDotSize,
      _carouselProgressPadding: 12,
      _carouselDotTransition: "0.125s ease-in-out"
    },
    ":host:focus": {
      outline: "none",
      boxShadow: "none"
    }
  }
});
// src/code-editor.ts
var ACE_BASE_URL = "https://cdnjs.cloudflare.com/ajax/libs/ace/1.23.2/";
var DEFAULT_THEME = "ace/theme/tomorrow";
var getAce = async () => {
  const { ace } = await scriptTag(`${ACE_BASE_URL}ace.min.js`);
  return ace;
};
var makeCodeEditor = async (codeElement, mode = "html", options = {}, theme = DEFAULT_THEME) => {
  const ace = await getAce();
  ace.config.set("basePath", ACE_BASE_URL);
  const editor = ace.edit(codeElement, {
    mode: `ace/mode/${mode}`,
    tabSize: 2,
    useSoftTabs: true,
    useWorker: false,
    ...options
  });
  editor.setTheme(theme);
  return { ace, editor };
};

class CodeEditor extends F {
  source = "";
  get value() {
    return this.editor === undefined ? this.source : this.editor.getValue();
  }
  set value(text) {
    if (this.editor === undefined) {
      this.source = text;
    } else {
      this.editor.setValue(text);
      this.editor.clearSelection();
      this.editor.session.getUndoManager().reset();
    }
  }
  static initAttributes = {
    mode: "javascript",
    theme: DEFAULT_THEME,
    disabled: false
  };
  role = "code editor";
  _ace;
  _editor;
  _editorPromise;
  options = {};
  get ace() {
    return this._ace;
  }
  get editor() {
    return this._editor;
  }
  static styleSpec = {
    ":host": {
      display: "block",
      position: "relative",
      width: "100%",
      height: "100%"
    }
  };
  onResize() {
    if (this.editor !== undefined) {
      this.editor.resize(true);
    }
  }
  connectedCallback() {
    super.connectedCallback();
    if (this.source === "") {
      this.value = this.textContent !== null ? this.textContent.trim() : "";
    }
    if (this._editorPromise === undefined) {
      this._editorPromise = makeCodeEditor(this, this.mode, this.options, this.theme);
      this._editorPromise.then(({ ace, editor }) => {
        this._ace = ace;
        this._editor = editor;
        editor.setValue(this.source, 1);
        editor.clearSelection();
        editor.session.getUndoManager().reset();
      });
    }
  }
  render() {
    super.render();
    if (this._editorPromise !== undefined) {
      this._editorPromise.then(({ editor }) => editor.setReadOnly(this.disabled));
    }
  }
}
var codeEditor = CodeEditor.elementCreator({
  tag: "xin-code"
});
// src/color-input.ts
var { input } = y;
var defaultColor = l.fromCss("#8888");

class ColorInput extends F {
  value = defaultColor.rgba;
  color = defaultColor;
  static styleSpec = {
    ":host": {
      _gap: 8,
      _swatchSize: 32,
      _cssWidth: 72,
      _alphaWidth: 72,
      display: "inline-flex",
      gap: Uo.gap,
      alignItems: "center"
    },
    ':host input[type="color"]': {
      border: 0,
      width: Uo.swatchSize,
      height: Uo.swatchSize,
      background: "transparent"
    },
    ":host::part(alpha)": {
      width: Uo.alphaWidth
    },
    ":host::part(css)": {
      width: Uo.cssWidth,
      fontFamily: "monospace"
    }
  };
  content = [
    input({ title: "base color", type: "color", part: "rgb" }),
    input({
      type: "range",
      title: "opacity",
      part: "alpha",
      min: 0,
      max: 1,
      step: 0.05
    }),
    input({ title: "css color spec", part: "css" })
  ];
  valueChanged = false;
  update = (event) => {
    const { rgb, alpha, css } = this.parts;
    if (event.type === "input") {
      this.color = l.fromCss(rgb.value);
      this.color.a = Number(alpha.value);
      css.value = this.color.html;
    } else {
      this.color = l.fromCss(css.value);
      rgb.value = this.color.html.substring(0, 7);
      alpha.value = String(this.color.a);
    }
    rgb.style.opacity = String(this.color.a);
    this.value = this.color.rgba;
    this.valueChanged = true;
  };
  connectedCallback() {
    super.connectedCallback();
    const { rgb, alpha, css } = this.parts;
    rgb.addEventListener("input", this.update);
    alpha.addEventListener("input", this.update);
    css.addEventListener("change", this.update);
  }
  render() {
    if (this.valueChanged) {
      this.valueChanged = false;
      return;
    }
    const { rgb, alpha, css } = this.parts;
    this.color = l.fromCss(this.value);
    rgb.value = this.color.html.substring(0, 7);
    rgb.style.opacity = String(this.color.a);
    alpha.value = String(this.color.a);
    css.value = this.color.html;
  }
}
var colorInput = ColorInput.elementCreator({
  tag: "xin-color"
});
// src/track-drag.ts
var TRACKER = y.div({
  style: {
    content: " ",
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0
  }
});
var PASSIVE = { passive: true };
var trackDrag = (event, callback, cursor = "move") => {
  const isTouchEvent = event.type.startsWith("touch");
  if (!isTouchEvent) {
    const origX = event.clientX;
    const origY = event.clientY;
    TRACKER.style.cursor = cursor;
    bringToFront(TRACKER);
    document.body.append(TRACKER);
    const wrappedCallback = (event2) => {
      const dx = event2.clientX - origX;
      const dy = event2.clientY - origY;
      if (callback(dx, dy, event2) === true) {
        TRACKER.removeEventListener("mousemove", wrappedCallback);
        TRACKER.removeEventListener("mouseup", wrappedCallback);
        TRACKER.remove();
      }
    };
    TRACKER.addEventListener("mousemove", wrappedCallback, PASSIVE);
    TRACKER.addEventListener("mouseup", wrappedCallback, PASSIVE);
  } else if (event instanceof TouchEvent) {
    const touch = event.changedTouches[0];
    const touchId = touch.identifier;
    const origX = touch.clientX;
    const origY = touch.clientY;
    const target = event.target;
    let dx = 0;
    let dy = 0;
    const wrappedCallback = (event2) => {
      const touch2 = [...event2.touches].find((touch3) => touch3.identifier === touchId);
      if (touch2 !== undefined) {
        dx = touch2.clientX - origX;
        dy = touch2.clientY - origY;
      }
      if (event2.type === "touchmove") {
        event2.stopPropagation();
        event2.preventDefault();
      }
      if (callback(dx, dy, event2) === true || touch2 === undefined) {
        target.removeEventListener("touchmove", wrappedCallback);
        target.removeEventListener("touchend", wrappedCallback);
        target.removeEventListener("touchcancel", wrappedCallback);
      }
    };
    target.addEventListener("touchmove", wrappedCallback);
    target.addEventListener("touchend", wrappedCallback, PASSIVE);
    target.addEventListener("touchcancel", wrappedCallback, PASSIVE);
  }
};
var findHighestZ = (selector = "body *") => [...document.querySelectorAll(selector)].map((elt) => parseFloat(getComputedStyle(elt).zIndex)).reduce((z2, highest) => isNaN(z2) || Number(z2) < highest ? highest : Number(z2), 0);
var bringToFront = (element, selector = "body *") => {
  element.style.zIndex = String(findHighestZ(selector) + 1);
};

// src/float.ts
var { slot: slot2 } = y;

class XinFloat extends F {
  static floats = new Set;
  static initAttributes = {
    drag: false,
    remainOnResize: "remove",
    remainOnScroll: "remain"
  };
  content = slot2();
  static styleSpec = {
    ":host": {
      position: "fixed"
    }
  };
  reposition = (event) => {
    const target = event.target;
    if (target?.closest(".no-drag")) {
      return;
    }
    if (this.drag) {
      bringToFront(this);
      const x2 = this.offsetLeft;
      const y2 = this.offsetTop;
      trackDrag(event, (dx, dy, pointerEvent) => {
        this.style.left = `${x2 + dx}px`;
        this.style.top = `${y2 + dy}px`;
        this.style.right = "auto";
        this.style.bottom = "auto";
        if (pointerEvent.type === "mouseup") {
          return true;
        }
      });
    }
  };
  connectedCallback() {
    super.connectedCallback();
    XinFloat.floats.add(this);
    const PASSIVE2 = { passive: true };
    this.addEventListener("touchstart", this.reposition, PASSIVE2);
    this.addEventListener("mousedown", this.reposition, PASSIVE2);
    bringToFront(this);
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    XinFloat.floats.delete(this);
  }
}
var xinFloat = XinFloat.elementCreator({
  tag: "xin-float"
});
window.addEventListener("resize", () => {
  Array.from(XinFloat.floats).forEach((float) => {
    if (float.remainOnResize === "hide") {
      float.hidden = true;
    } else if (float.remainOnResize === "remove") {
      float.remove();
    }
  });
}, { passive: true });
document.addEventListener("scroll", (event) => {
  if (event.target instanceof HTMLElement && event.target.closest(XinFloat.tagName)) {
    return;
  }
  Array.from(XinFloat.floats).forEach((float) => {
    if (float.remainOnScroll === "hide") {
      float.hidden = true;
    } else if (float.remainOnScroll === "remove") {
      float.remove();
    }
  });
}, { passive: true, capture: true });

// src/pop-float.ts
var popFloat = (options) => {
  const {
    content,
    target,
    position,
    remainOnScroll,
    remainOnResize,
    draggable
  } = options;
  const float = Array.isArray(content) ? xinFloat(...content) : xinFloat(content);
  positionFloat(float, target, position, remainOnScroll, remainOnResize, draggable);
  if (options.class) {
    float.setAttribute("class", options.class);
  }
  document.body.append(float);
  return float;
};
var positionFloat = (element, target, position, remainOnScroll, remainOnResize, draggable = false) => {
  {
    const { position: position2 } = getComputedStyle(element);
    if (position2 !== "fixed") {
      element.style.position = "fixed";
    }
    if (remainOnResize)
      element.remainOnResize = remainOnResize;
    if (remainOnScroll)
      element.remainOnScroll = remainOnScroll;
    bringToFront(element);
  }
  element.drag = draggable;
  const { left, top, width, height } = target.getBoundingClientRect();
  const cx = left + width * 0.5;
  const cy = top + height * 0.5;
  const w = window.innerWidth;
  const h = window.innerHeight;
  if (position === "side") {
    position = (cx < w * 0.5 ? "e" : "w") + (cy < h * 0.5 ? "s" : "n");
  } else if (position === "auto" || position === undefined) {
    position = (cy < h * 0.5 ? "s" : "n") + (cx < w * 0.5 ? "e" : "w");
  }
  element.style.top = element.style.left = element.style.right = element.style.bottom = element.style.transform = "";
  if (position.length === 2) {
    const [first, second] = position;
    switch (first) {
      case "n":
        element.style.bottom = (h - top).toFixed(2) + "px";
        break;
      case "e":
        element.style.left = (left + width).toFixed(2) + "px";
        break;
      case "s":
        element.style.top = (top + height).toFixed(2) + "px";
        break;
      case "w":
        element.style.right = (w - left).toFixed(2) + "px";
        break;
    }
    switch (second) {
      case "n":
        element.style.bottom = (h - top - height).toFixed(2) + "px";
        break;
      case "e":
        element.style.left = left.toFixed(2) + "px";
        break;
      case "s":
        element.style.top = top.toFixed(2) + "px";
        break;
      case "w":
        element.style.right = (w - left - width).toFixed(2) + "px";
        break;
    }
    element.style.transform = "";
  } else if (position === "n") {
    element.style.bottom = (h - top).toFixed(2) + "px";
    element.style.left = cx.toFixed(2) + "px";
    element.style.transform = "translateX(-50%)";
  } else if (position === "s") {
    element.style.top = (top + height).toFixed(2) + "px";
    element.style.left = cx.toFixed(2) + "px";
    element.style.transform = "translateX(-50%)";
  } else if (position === "e") {
    element.style.left = (left + width).toFixed(2) + "px";
    element.style.top = cy.toFixed(2) + "px";
    element.style.transform = "translateY(-50%)";
  } else if (position === "w") {
    element.style.right = (w - left).toFixed(2) + "px";
    element.style.top = cy.toFixed(2) + "px";
    element.style.transform = "translateY(-50%)";
  }
  element.style.setProperty("--max-height", `calc(100vh - ${element.style.top || element.style.bottom})`);
  element.style.setProperty("--max-width", `calc(100vw - ${element.style.left || element.style.right})`);
};

// src/make-sorter.ts
function makeSorter(sortValuator, ascending = true) {
  return (p, q2) => {
    const pSort = sortValuator(p);
    const qSort = sortValuator(q2);
    for (const i in pSort) {
      if (pSort[i] !== qSort[i]) {
        const isAscending = Array.isArray(ascending) ? ascending[i] !== false : ascending;
        return isAscending ? pSort[i] > qSort[i] ? 1 : -1 : pSort[i] > qSort[i] ? -1 : 1;
      }
    }
    return 0;
  };
}

// src/select.ts
var { button: button2, span, input: input2 } = y;
var hasValue = (options, value) => {
  return !!options.find((option) => {
    if (option === null || value == null) {
      return false;
    } else if (Array.isArray(option)) {
      return hasValue(option, value);
    } else if (option.value === value || option === value) {
      return true;
    }
  });
};

class TosiSelect extends F {
  static formAssociated = true;
  static initAttributes = {
    editable: false,
    placeholder: "",
    showIcon: false,
    hideCaption: false,
    localized: false,
    disabled: false,
    required: false,
    name: ""
  };
  _options = [];
  get options() {
    return this._options;
  }
  set options(v2) {
    if (typeof v2 === "string") {
      this._options = TosiSelect.parseOptionsString(v2);
    } else {
      this._options = v2;
    }
    this.queueRender();
  }
  static parseOptionsString(optionsStr) {
    return optionsStr.split(",").map((option) => {
      const trimmed = option.trim();
      if (trimmed === "")
        return null;
      const [value, remains] = trimmed.split("=").map((v2) => v2.trim());
      if (!remains) {
        return { value, caption: value };
      }
      const [caption, iconName] = remains.split(":").map((v2) => v2.trim());
      return {
        value,
        caption: caption || value,
        icon: iconName || undefined
      };
    });
  }
  value = "";
  filter = "";
  isExpanded = false;
  formDisabledCallback(disabled) {
    this.disabled = disabled;
  }
  formResetCallback() {
    this.value = "";
  }
  setValue = (value, triggerAction = false) => {
    if (this.value !== value) {
      this.value = value;
      this.queueRender(true);
    }
    if (triggerAction) {
      this.dispatchEvent(new Event("action"));
    }
  };
  getValue = () => this.value;
  get selectOptions() {
    return this.options;
  }
  buildOptionMenuItem = (option) => {
    if (option === null) {
      return null;
    }
    const { setValue, getValue } = this;
    let icon;
    let caption;
    let value;
    if (typeof option === "string") {
      caption = value = option;
    } else {
      ({ icon, caption, value } = option);
    }
    if (this.localized) {
      caption = localize(caption);
    }
    const { options } = option;
    if (options) {
      return {
        icon,
        caption,
        checked: () => hasValue(options, getValue()),
        menuItems: options.map(this.buildOptionMenuItem)
      };
    }
    return {
      icon,
      caption,
      checked: () => getValue() === value,
      action: typeof value === "function" ? async () => {
        const newValue = await value();
        if (newValue !== undefined) {
          setValue(newValue, true);
        }
      } : () => {
        if (typeof value === "string") {
          setValue(value, true);
        }
      }
    };
  };
  poppedOptions = [];
  get optionsMenu() {
    const options = this.selectOptions.map(this.buildOptionMenuItem);
    if (this.filter === "") {
      return options;
    }
    const showOption = (option) => {
      if (option === null) {
        return true;
      } else if (option.menuItems) {
        option.menuItems = option.menuItems.filter(showOption);
        return option.menuItems.length > 0;
      } else {
        return option.caption.toLocaleLowerCase().includes(this.filter);
      }
    };
    return options.filter(showOption);
  }
  handleChange = (event) => {
    const { value } = this.parts;
    const newValue = value.value || "";
    if (this.value !== String(newValue)) {
      this.value = newValue;
      this.dispatchEvent(new Event("change"));
    }
    this.filter = "";
    event.stopPropagation();
    event.preventDefault();
  };
  handleKey = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
    }
  };
  filterMenu = mo(() => {
    this.filter = this.parts.value.value.toLocaleLowerCase();
    removeLastMenu(0);
    this.popOptions();
  });
  popOptions = (event) => {
    if (event && event.type === "click") {
      this.filter = "";
    }
    this.poppedOptions = this.optionsMenu;
    this.isExpanded = true;
    this.updateAriaExpanded();
    popMenu({
      target: this,
      menuItems: this.poppedOptions,
      showChecked: true,
      role: "listbox",
      onClose: () => {
        this.isExpanded = false;
        this.updateAriaExpanded();
      }
    });
  };
  updateAriaExpanded() {
    const { value } = this.parts;
    value.setAttribute("aria-expanded", String(this.isExpanded));
  }
  content = () => [
    button2({
      type: "button",
      part: "button",
      onClick: this.popOptions
    }, span(), input2({
      part: "value",
      value: this.value,
      tabindex: 0,
      role: "combobox",
      ariaHaspopup: "listbox",
      ariaExpanded: "false",
      ariaAutocomplete: this.editable ? "list" : "none",
      onKeydown: this.handleKey,
      onInput: this.filterMenu,
      onChange: this.handleChange
    }), icons.chevronDown())
  ];
  get allOptions() {
    const all = [];
    function flatten(some) {
      for (const option of some) {
        if (typeof option === "string") {
          all.push({ caption: option, value: option });
        } else if (option?.value) {
          all.push(option);
        } else if (option?.options) {
          flatten(option.options);
        }
      }
    }
    flatten(this.selectOptions);
    return all;
  }
  findOption() {
    const found = this.allOptions.find((option) => option.value === this.value);
    return found || { caption: this.value, value: this.value };
  }
  localeChanged = () => {
    this.queueRender();
  };
  connectedCallback() {
    super.connectedCallback();
    const optionsAttr = this.getAttribute("options");
    if (optionsAttr && this._options.length === 0) {
      this._options = TosiSelect.parseOptionsString(optionsAttr);
    }
    if (this.localized) {
      XinLocalized.allInstances.add(this);
    }
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.localized) {
      XinLocalized.allInstances.delete(this);
    }
  }
  render() {
    super.render();
    const { value, button: button3 } = this.parts;
    button3.disabled = this.disabled;
    const icon = value.previousElementSibling;
    const option = this.findOption();
    let newIcon = span();
    value.value = this.localized ? localize(option.caption) : option.caption;
    if (option.icon) {
      if (option.icon instanceof HTMLElement) {
        newIcon = option.icon.cloneNode(true);
      } else {
        newIcon = icons[option.icon]();
      }
    }
    icon.replaceWith(newIcon);
    value.setAttribute("placeholder", this.localized ? localize(this.placeholder) : this.placeholder);
    value.style.pointerEvents = this.editable ? "" : "none";
    value.readOnly = !this.editable;
  }
}
var XinSelect = TosiSelect;
var tosiSelect = TosiSelect.elementCreator({
  tag: "tosi-select",
  styleSpec: {
    ":host": {
      "--tosi-select-gap": "var(--tosi-spacing-sm, 8px)",
      "--tosi-select-touch-size": "var(--tosi-touch-size, 44px)",
      "--tosi-select-padding": "0 var(--tosi-spacing-sm, 8px)",
      "--tosi-select-value-padding": "0 var(--tosi-spacing-sm, 8px)",
      "--tosi-select-icon-width": "24px",
      "--tosi-select-field-width": "140px",
      "--gap": "var(--tosi-select-gap)",
      "--touch-size": "var(--tosi-select-touch-size)",
      "--padding": "var(--tosi-select-padding)",
      "--value-padding": "var(--tosi-select-value-padding)",
      "--icon-width": "var(--tosi-select-icon-width)",
      "--fieldWidth": "var(--tosi-select-field-width)",
      display: "inline-flex",
      position: "relative"
    },
    ":host button": {
      display: "flex",
      alignItems: "center",
      justifyItems: "center",
      gap: Uo.tosiSelectGap,
      textAlign: "left",
      height: Uo.tosiSelectTouchSize,
      padding: Uo.tosiSelectPadding,
      position: "relative",
      width: "100%"
    },
    ":host:not([show-icon]) button > :first-child": {
      display: "none"
    },
    ":host[hide-caption] button > :nth-child(2)": {
      display: "none"
    },
    ':host [part="value"]': {
      width: Uo.tosiSelectFieldWidth,
      padding: Uo.tosiSelectValuePadding,
      height: Uo.tosiSelectTouchSize,
      lineHeight: Uo.tosiSelectTouchSize,
      boxShadow: "none",
      whiteSpace: "nowrap",
      outline: "none",
      background: "transparent",
      flex: "1"
    },
    ':host [part="value"]:not(:focus)': {
      overflow: "hidden",
      textOverflow: "ellipsis",
      background: "transparent"
    }
  }
});
var xinSelect = Ho((...args) => tosiSelect(...args), "xinSelect is deprecated, use tosiSelect instead (tag is now <tosi-select>)");

// src/localize.ts
var { span: span2 } = y;
var { i18n } = Co({
  i18n: {
    locale: window.navigator.language,
    locales: [window.navigator.language],
    languages: [window.navigator.language],
    emoji: [""],
    stringMap: {},
    localeOptions: [
      {
        icon: span2(),
        caption: window.navigator.language,
        value: window.navigator.language
      }
    ]
  }
});
lo.localeOptions = {
  toDOM(select, options) {
    if (select instanceof XinSelect) {
      select.options = options;
    }
  }
};
var setLocale = (language) => {
  if (i18n.locales.value.includes(language)) {
    i18n.locale.value = language;
  } else {
    console.error(`language ${language} is not available`);
  }
};
var updateLocalized = () => {
  const localizeds = Array.from(XinLocalized.allInstances);
  for (const localized of localizeds) {
    localized.localeChanged();
  }
};
i18n.locale.observe(updateLocalized);
var captionSort = makeSorter((locale) => [
  locale.caption.toLocaleLowerCase()
]);
function initLocalization(localizedStrings) {
  const [locales, , languages, emoji, ...strings] = localizedStrings.split(`
`).map((line) => line.split("\t"));
  if (locales && languages && emoji && strings) {
    i18n.locales.value = locales;
    i18n.languages.value = languages;
    i18n.emoji.value = emoji;
    i18n.stringMap.value = strings.reduce((map, strings2) => {
      map[strings2[0].toLocaleLowerCase()] = strings2;
      return map;
    }, {});
    i18n.localeOptions.value = locales.map((locale, index) => ({
      icon: span2({ title: locales[index] }, emoji[index]),
      caption: languages[index],
      value: locale
    })).sort(captionSort);
    if (!i18n.locales.value.includes(i18n.locale.value)) {
      const language = i18n.locale.value.substring(0, 2);
      i18n.locale.value = i18n.locales.value.find((locale) => locale.substring(0, 2) === language) || i18n.locales.value[0];
    }
    updateLocalized();
  }
}
function localize(ref) {
  if (ref.endsWith("…")) {
    return localize(ref.substring(0, ref.length - 1)) + "…";
  }
  const index = i18n.locales.value.indexOf(i18n.locale.value);
  if (index > -1) {
    const stringMapValue = i18n.stringMap.value;
    const map = stringMapValue[ref.toLocaleLowerCase()];
    const localized = map && map[index];
    if (localized) {
      ref = ref.toLocaleLowerCase() === ref ? localized.toLocaleLowerCase() : localized;
    }
  }
  return ref;
}

class LocalePicker extends F {
  static initAttributes = {
    hideCaption: false
  };
  content = () => {
    return xinSelect({
      part: "select",
      showIcon: true,
      title: localize("Language"),
      bindValue: i18n.locale,
      bindLocaleOptions: i18n.localeOptions
    });
  };
  render() {
    super.render();
    this.parts.select.toggleAttribute("hide-caption", this.hideCaption);
  }
}
var localePicker = LocalePicker.elementCreator({
  tag: "xin-locale-picker"
});

class XinLocalized extends F {
  static allInstances = new Set;
  static initAttributes = {
    refString: ""
  };
  contents = () => y.xinSlot();
  connectedCallback() {
    super.connectedCallback();
    XinLocalized.allInstances.add(this);
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    XinLocalized.allInstances.delete(this);
  }
  localeChanged() {
    if (!this.refString) {
      this.refString = this.textContent || "";
    }
    this.textContent = this.refString ? localize(this.refString) : "";
  }
  render() {
    super.render();
    this.localeChanged();
  }
}
var xinLocalized = XinLocalized.elementCreator({
  tag: "xin-localized",
  styleSpec: {
    ":host": {
      pointerEvents: "none"
    }
  }
});

// src/match-shortcut.ts
var matchShortcut = (keystroke, shortcut) => {
  shortcut = shortcut.toLocaleLowerCase();
  const ctrlKey = !!shortcut.match(/\^|ctrl/);
  const metaKey = !!shortcut.match(/⌘|meta/);
  const altKey = !!shortcut.match(/⌥|⎇|alt|option/);
  const shiftKey = !!shortcut.match(/⇧|shift/);
  const baseKey = shortcut.slice(-1);
  return keystroke.key === baseKey && keystroke.metaKey === metaKey && keystroke.ctrlKey === ctrlKey && keystroke.altKey === altKey && keystroke.shiftKey === shiftKey;
};

// src/menu.ts
var { div: div2, button: button3, span: span3, a: a2, xinSlot } = y;
nn("xin-menu-helper", {
  ".xin-menu": {
    overflow: "hidden auto",
    maxHeight: `calc(${Uo.maxHeight} - ${uo.menuInset("8px")})`,
    borderRadius: Uo.spacing50,
    background: uo.menuBg("#fafafa"),
    boxShadow: uo.menuShadow(`${Uo.spacing13} ${Uo.spacing50} ${Uo.spacing} #0004`)
  },
  ".xin-menu > div": {
    width: uo.menuWidth("auto")
  },
  ".xin-menu-trigger": {
    paddingLeft: 0,
    paddingRight: 0,
    minWidth: uo.touchSize("48px")
  },
  ".xin-menu-separator": {
    display: "inline-block",
    content: " ",
    height: "1px",
    width: "100%",
    background: uo.menuSeparatorColor("#2224"),
    margin: uo.menuSeparatorMargin("8px 0")
  },
  ".xin-menu-item": {
    boxShadow: "none",
    border: "none !important",
    display: "grid",
    alignItems: "center",
    justifyContent: "flex-start",
    textDecoration: "none",
    gridTemplateColumns: "0px 1fr 30px",
    width: "100%",
    gap: 0,
    background: "transparent",
    padding: uo.menuItemPadding("0 16px"),
    height: uo.menuItemHeight("48px"),
    lineHeight: uo.menuItemHeight("48px"),
    textAlign: "left"
  },
  ".xin-menu-item, .xin-menu-item > span": {
    color: uo.menuItemColor("#222")
  },
  ".xin-menu-with-icons .xin-menu-item": {
    gridTemplateColumns: "30px 1fr 30px"
  },
  ".xin-menu-item svg": {
    stroke: uo.menuItemIconColor("#222")
  },
  ".xin-menu-item.xin-menu-item-checked": {
    background: uo.menuItemHoverBg("#eee")
  },
  ".xin-menu-item > span:nth-child(2)": {
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    textAlign: "left"
  },
  ".xin-menu-item:hover": {
    boxShadow: "none !important",
    background: uo.menuItemHoverBg("#eee")
  },
  ".xin-menu-item:active": {
    boxShadow: "none !important",
    background: uo.menuItemActiveBg("#aaa"),
    color: uo.menuItemActiveColor("#000")
  },
  ".xin-menu-item:active svg": {
    stroke: uo.menuItemIconActiveColor("#000")
  }
});
var createMenuAction = (item, options) => {
  const checked = item.checked && item.checked() && "check" || false;
  let icon = item?.icon || checked || span3(" ");
  if (typeof icon === "string") {
    icon = icons[icon]();
  }
  const itemRole = options.role === "listbox" ? "option" : "menuitem";
  let menuItem;
  if (typeof item?.action === "string") {
    menuItem = a2({
      class: "xin-menu-item",
      role: itemRole,
      href: item.action
    }, icon, options.localized ? span3(localize(item.caption)) : span3(item.caption), span3(item.shortcut || " "));
  } else {
    menuItem = button3({
      class: "xin-menu-item",
      role: itemRole,
      onClick: item.action
    }, icon, options.localized ? span3(localize(item.caption)) : span3(item.caption), span3(item.shortcut || " "));
  }
  menuItem.classList.toggle("xin-menu-item-checked", checked !== false);
  if (options.role === "listbox" && checked) {
    menuItem.setAttribute("aria-selected", "true");
  }
  if (item?.enabled && !item.enabled()) {
    menuItem.setAttribute("disabled", "");
    menuItem.setAttribute("aria-disabled", "true");
  }
  return menuItem;
};
var createSubMenu = (item, options) => {
  const checked = item.checked && item.checked() && "check" || false;
  let icon = item?.icon || checked || span3(" ");
  if (typeof icon === "string") {
    icon = icons[icon]();
  }
  const submenuItem = button3({
    class: "xin-menu-item",
    disabled: !(!item.enabled || item.enabled()),
    onClick(event) {
      popMenu(Object.assign({}, options, {
        menuItems: item.menuItems,
        target: submenuItem,
        submenuDepth: (options.submenuDepth || 0) + 1,
        position: "side"
      }));
      event.stopPropagation();
      event.preventDefault();
    }
  }, icon, options.localized ? span3(localize(item.caption)) : span3(item.caption), icons.chevronRight({ style: { justifySelf: "flex-end" } }));
  return submenuItem;
};
var createMenuItem = (item, options) => {
  if (item === null) {
    return span3({ class: "xin-menu-separator" });
  } else {
    const createdItem = item?.action ? createMenuAction(item, options) : createSubMenu(item, options);
    if (options.showChecked && item.checked && item.checked()) {
      requestAnimationFrame(() => {
        createdItem.scrollIntoView({ block: "center" });
      });
    }
    return createdItem;
  }
};
var menu = (options) => {
  const { target, width, menuItems, role = "menu" } = options;
  const hasIcons = menuItems.find((item) => item?.icon || item?.checked);
  return div2({
    class: hasIcons ? "xin-menu xin-menu-with-icons" : "xin-menu",
    role,
    onClick() {
      removeLastMenu(0);
    }
  }, div2({
    style: {
      minWidth: target.offsetWidth + "px",
      width: typeof width === "number" ? `${width}px` : width
    },
    onMousedown(event) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, ...menuItems.map((item) => createMenuItem(item, options))));
};
var lastPopped;
var poppedMenus = [];
var removeLastMenu = (depth = 0) => {
  const toBeRemoved = poppedMenus.splice(depth);
  for (const popped of toBeRemoved) {
    popped.menu.remove();
    if (popped.onClose) {
      popped.onClose();
    }
  }
  lastPopped = toBeRemoved[0];
  return depth > 0 ? poppedMenus[depth - 1] : undefined;
};
document.body.addEventListener("mousedown", (event) => {
  if (event.target && !poppedMenus.find((popped) => popped.target.contains(event.target))) {
    removeLastMenu(0);
  }
});
document.body.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    removeLastMenu(0);
  }
});
var popMenu = (options) => {
  options = Object.assign({ submenuDepth: 0 }, options);
  const { target, position, submenuDepth } = options;
  if (lastPopped && !document.body.contains(lastPopped?.menu)) {
    lastPopped = undefined;
  }
  if (poppedMenus.length && !document.body.contains(poppedMenus[0].menu)) {
    poppedMenus.splice(0);
  }
  if (submenuDepth === 0 && lastPopped?.target === target)
    return;
  const popped = removeLastMenu(submenuDepth);
  if (lastPopped?.target === target)
    return;
  if (popped && popped.target === target) {
    removeLastMenu();
    return;
  }
  if (!options.menuItems?.length) {
    return;
  }
  const content = menu(options);
  const float = popFloat({
    content,
    target,
    position
  });
  float.remainOnScroll = "remove";
  poppedMenus.push({
    target,
    menu: float,
    onClose: options.onClose
  });
};
function findShortcutAction(items, event) {
  for (const item of items) {
    if (!item)
      continue;
    const { shortcut } = item;
    const { menuItems } = item;
    if (shortcut) {
      if (matchShortcut(event, shortcut)) {
        return item;
      }
    } else if (menuItems) {
      const foundAction = findShortcutAction(menuItems, event);
      if (foundAction) {
        return foundAction;
      }
    }
  }
  return;
}

class XinMenu extends F {
  static initAttributes = {
    menuWidth: "auto",
    localized: false,
    icon: ""
  };
  menuItems = [];
  showMenu = (event) => {
    if (event.type === "click" || event.code === "Space") {
      popMenu({
        target: this.parts.trigger,
        width: this.menuWidth,
        localized: this.localized,
        menuItems: this.menuItems
      });
      event.stopPropagation();
      event.preventDefault();
    }
  };
  content = () => button3({ tabindex: 0, part: "trigger", onClick: this.showMenu }, xinSlot());
  handleShortcut = async (event) => {
    const menuAction = findShortcutAction(this.menuItems, event);
    if (menuAction) {
      if (menuAction.action instanceof Function) {
        menuAction.action();
      }
    }
  };
  constructor() {
    super();
    this.addEventListener("keydown", this.showMenu);
  }
  connectedCallback() {
    super.connectedCallback();
    document.addEventListener("keydown", this.handleShortcut, true);
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener("keydown", this.handleShortcut);
  }
}
var xinMenu = XinMenu.elementCreator({
  tag: "xin-menu",
  styleSpec: {
    ":host": {
      display: "inline-block"
    },
    ":host button > xin-slot": {
      display: "flex",
      alignItems: "center",
      gap: uo.xinMenuTriggerGap("10px")
    }
  }
});

// src/drag-and-drop.ts
var exports_drag_and_drop = {};
__export(exports_drag_and_drop, {
  init: () => init,
  draggedElement: () => draggedElement
});
var dragInProgress = () => !!document.querySelector(".drag-source");
var isTypeAllowed = (allowedTypes, type) => {
  if (!allowedTypes) {
    return false;
  }
  for (const allowedType of allowedTypes) {
    if (allowedType === "special/any") {
      return true;
    } else if (allowedType.indexOf("*") > -1) {
      const [A2, B2] = allowedType.split("/");
      const [a3, b] = type.split("/");
      if ((A2 === "*" || A2 === a3) && (B2 === "*" || B2 === b)) {
        return true;
      }
    } else {
      if (allowedType === type) {
        return true;
      }
    }
  }
};
var removeClass = (className) => {
  for (const elt of [...document.querySelectorAll(`.${className}`)]) {
    elt.classList.remove(className);
  }
};
var end = () => {
  removeClass("drag-over");
  removeClass("drag-source");
  removeClass("drag-target");
};
var stringToTypes = (s, delimiter = ";") => {
  return (s || "").split(delimiter).map((t) => t.trim()).filter((i) => i !== "");
};
var markDroppable = (types) => {
  if (!types)
    types = [];
  const elements = [
    ...document.querySelectorAll("[data-drop]")
  ];
  for (const element of elements) {
    const dropTypes = stringToTypes(element.dataset.drop);
    if (types.find((type) => isTypeAllowed(dropTypes, type))) {
      element.classList.add("drag-target");
    } else {
      element.classList.remove("drag-target");
    }
  }
};
function start(evt) {
  const target = evt.target?.closest('[draggable="true"],a[href]');
  if (!target) {
    return;
  }
  target.classList.add("drag-source");
  const types = target.matches('[draggable="true"]') ? stringToTypes(target.dataset.drag || "text/html") : stringToTypes(target.dataset.drag || "url");
  for (const type of types) {
    const content = target.dataset.dragContent || (type === "text/html" ? target.innerHTML : target.textContent);
    evt.dataTransfer?.setData(type, content || "");
  }
  markDroppable(evt.dataTransfer?.types);
  evt.stopPropagation();
}
function drag(evt) {
  if (!dragInProgress()) {
    markDroppable(evt.dataTransfer?.types);
  }
  const target = evt.target.closest(".drag-target");
  if (target && evt.dataTransfer) {
    target.classList.add("drag-over");
    evt.dataTransfer.dropEffect = "copy";
  } else {
    evt.preventDefault();
    evt.stopPropagation();
  }
}
function leave() {
  removeClass("drag-over");
}
function drop(evt) {
  const target = evt.target.closest(".drag-target");
  if (target) {
    const dropTypes = (target.dataset?.drop || "").split(";");
    for (const type of dropTypes) {
      if (isTypeAllowed(evt.dataTransfer?.types, type)) {
        if (type === "text/html") {
          target.innerHTML = evt.dataTransfer?.getData(type) || "";
        } else {
          target.textContent = evt.dataTransfer?.getData(type) || "";
        }
      }
    }
  }
  end();
}
var draggedElement = () => document.querySelector(".drag-source");
var isInitialized = false;
var init = () => {
  if (isInitialized) {
    return;
  }
  document.body.addEventListener("dragstart", start);
  document.body.addEventListener("dragenter", drag);
  document.body.addEventListener("dragover", drag);
  document.body.addEventListener("drop", drop);
  document.body.addEventListener("dragleave", leave);
  document.body.addEventListener("dragend", end);
  window.addEventListener("dragover", (evt) => evt.preventDefault());
  window.addEventListener("drop", (evt) => evt.preventDefault());
  isInitialized = true;
};

// src/data-table.ts
function defaultWidth(array, prop, charWidth) {
  const example = array.find((item) => item[prop] !== undefined && item[prop] !== null);
  if (example !== undefined) {
    const value = example[prop];
    switch (typeof value) {
      case "string":
        if (value.match(/^\d+(\.\d+)?$/)) {
          return 6 * charWidth;
        } else if (value.includes(" ")) {
          return 20 * charWidth;
        } else {
          return 12 * charWidth;
        }
      case "number":
        return 6 * charWidth;
      case "boolean":
        return 5 * charWidth;
      case "object":
        return false;
      default:
        return 8 * charWidth;
    }
  }
  return false;
}
var { div: div3, span: span4, button: button4, template } = y;
var passThru = (array) => array;

class DataTable extends F {
  static initAttributes = {
    rowHeight: 30,
    charWidth: 15,
    minColumnWidth: 30,
    select: false,
    multiple: false,
    pinnedTop: 0,
    pinnedBottom: 0,
    nosort: false,
    nohide: false,
    noreorder: false,
    localized: false
  };
  selectionChanged = () => {};
  selectedKey = Symbol("selected");
  selectBinding = (elt, obj) => {
    elt.toggleAttribute("aria-selected", obj[this.selectedKey] === true);
  };
  maxVisibleRows = 1e4;
  get value() {
    return {
      array: this.array,
      filter: this.filter,
      columns: this.columns
    };
  }
  set value(data) {
    const { array, columns, filter } = E(data);
    if (this._array !== array || this._columns !== columns || this._filter !== filter) {
      this.queueRender();
    }
    this._array = array || [];
    this._columns = columns || null;
    this._filter = filter || passThru;
  }
  rowData = {
    visible: [],
    pinnedTop: [],
    pinnedBottom: []
  };
  _array = [];
  _columns = null;
  _filter = passThru;
  get virtual() {
    return this.rowHeight > 0 ? { height: this.rowHeight } : undefined;
  }
  constructor() {
    super();
    this.rowData = Co({
      [this.instanceId]: this.rowData
    })[this.instanceId];
  }
  get array() {
    return this._array;
  }
  set array(newArray) {
    this._array = E(newArray);
    this.queueRender();
  }
  get filter() {
    return this._filter;
  }
  set filter(filterFunc) {
    if (this._filter !== filterFunc) {
      this._filter = filterFunc;
      this.queueRender();
    }
  }
  get sort() {
    if (this._sort) {
      return this._sort;
    }
    const sortColumn = this._columns?.find((c) => c.sort === "ascending" || c.sort === "descending");
    if (!sortColumn) {
      return;
    }
    const { prop } = sortColumn;
    return sortColumn.sort === "ascending" ? (a3, b) => a3[prop] > b[prop] ? 1 : -1 : (a3, b) => a3[prop] > b[prop] ? -1 : 1;
  }
  set sort(sortFunc) {
    if (this._sort !== sortFunc) {
      this._sort = sortFunc;
      this.queueRender();
    }
  }
  get columns() {
    if (!Array.isArray(this._columns)) {
      const { _array } = this;
      this._columns = Object.keys(_array[0] || {}).map((prop) => {
        const width = defaultWidth(_array, prop, this.charWidth);
        return {
          name: prop.replace(/([a-z])([A-Z])/g, "$1 $2").toLocaleLowerCase(),
          prop,
          align: typeof _array[0][prop] === "number" || _array[0][prop] !== "" && !isNaN(_array[0][prop]) ? "right" : "left",
          visible: width !== false,
          width: width ? width : 0
        };
      });
    }
    return this._columns;
  }
  set columns(newColumns) {
    this._columns = newColumns;
    this.queueRender();
  }
  get visibleColumns() {
    return this.columns.filter((c) => c.visible !== false);
  }
  content = null;
  getColumn(event) {
    const x2 = (event.touches !== undefined ? event.touches[0].clientX : event.clientX) - this.getBoundingClientRect().x;
    const epsilon = event.touches !== undefined ? 20 : 5;
    let boundaryX = 0;
    const log = [];
    const column = this.visibleColumns.find((options) => {
      if (options.visible !== false) {
        boundaryX += options.width;
        log.push(boundaryX);
        return Math.abs(x2 - boundaryX) < epsilon;
      }
    });
    return column;
  }
  setCursor = (event) => {
    const column = this.getColumn(event);
    if (column !== undefined) {
      this.style.cursor = "col-resize";
    } else {
      this.style.cursor = "";
    }
  };
  resizeColumn = (event) => {
    const column = this.getColumn(event);
    if (column !== undefined) {
      const origWidth = Number(column.width);
      const isTouchEvent = event.touches !== undefined;
      const touchIdentifier = isTouchEvent ? event.touches[0].identifier : undefined;
      trackDrag(event, (dx, _dy, event2) => {
        const touch = isTouchEvent ? [...event2.touches].find((touch2) => touch2.identifier === touchIdentifier) : true;
        if (touch === undefined) {
          return true;
        }
        const width = origWidth + dx;
        column.width = width > this.minColumnWidth ? width : this.minColumnWidth;
        this.setColumnWidths();
        if (event2.type === "mouseup") {
          return true;
        }
      }, "col-resize");
    }
  };
  selectRow(row, select = true) {
    if (select) {
      row[this.selectedKey] = true;
    } else {
      delete row[this.selectedKey];
    }
  }
  selectRows(rows, select = true) {
    for (const row of rows || this.array) {
      this.selectRow(row, select);
    }
  }
  deSelect(rows) {
    this.selectRows(rows, false);
  }
  rangeStart;
  updateSelection = (event) => {
    if (!this.select && !this.multiple) {
      return;
    }
    const { target } = event;
    if (!(target instanceof HTMLElement)) {
      return;
    }
    const tr = target.closest(".tr");
    if (!(tr instanceof HTMLElement)) {
      return;
    }
    const pickedItem = vo(tr);
    if (pickedItem === false) {
      return;
    }
    const mouseEvent = event;
    const selection = window.getSelection();
    if (selection !== null) {
      selection.removeAllRanges();
    }
    const rows = this.visibleRows;
    if (this.multiple && mouseEvent.shiftKey && rows.length > 0 && this.rangeStart !== pickedItem) {
      const mode = this.rangeStart === undefined || this.rangeStart[this.selectedKey] === true;
      const [start2, finish] = [
        this.rangeStart !== undefined ? rows.indexOf(this.rangeStart) : 0,
        rows.indexOf(pickedItem)
      ].sort((a3, b) => a3 - b);
      if (start2 > -1) {
        for (let idx = start2;idx <= finish; idx++) {
          const row = rows[idx];
          this.selectRow(row, mode);
        }
      }
    } else if (this.multiple && mouseEvent.metaKey) {
      this.selectRow(pickedItem, !pickedItem[this.selectedKey]);
      const pickedIndex = rows.indexOf(pickedItem);
      const nextItem = rows[pickedIndex + 1];
      const previousItem = pickedIndex > 0 ? rows[pickedIndex - 1] : undefined;
      if (nextItem !== undefined && nextItem[this.selectedKey] === true) {
        this.rangeStart = nextItem;
      } else if (previousItem !== undefined && previousItem[this.selectedKey] === true) {
        this.rangeStart = previousItem;
      } else {
        this.rangeStart = undefined;
      }
    } else {
      this.rangeStart = pickedItem;
      this.deSelect();
      this.selectRow(pickedItem, true);
    }
    this.selectionChanged(this.visibleSelectedRows);
    for (const row of Array.from(this.querySelectorAll(".tr"))) {
      const item = vo(row);
      this.selectBinding(row, item);
    }
  };
  connectedCallback() {
    super.connectedCallback();
    this.addEventListener("mousemove", this.setCursor);
    this.addEventListener("mousedown", this.resizeColumn);
    this.addEventListener("touchstart", this.resizeColumn, { passive: true });
    this.addEventListener("mouseup", this.updateSelection);
    this.addEventListener("touchend", this.updateSelection);
  }
  setColumnWidths() {
    const columns = this.visibleColumns.map((c) => c.width + "px").join(" ");
    const rowWidth = this.visibleColumns.reduce((w, c) => w + c.width, 0) + "px";
    this.style.setProperty("--tosi-table-grid-columns", columns);
    this.style.setProperty("--tosi-table-grid-row-width", rowWidth);
    this.style.setProperty("--grid-columns", columns);
    this.style.setProperty("--grid-row-width", rowWidth);
  }
  sortByColumn = (columnOptions, direction = "auto") => {
    for (const column of this.columns.filter((c) => E(c.sort) !== false)) {
      if (E(column) === columnOptions) {
        if (direction === "auto") {
          column.sort = column.sort === "ascending" ? "descending" : "ascending";
        } else {
          column.sort = direction;
        }
        this.queueRender();
      } else {
        delete column.sort;
      }
    }
  };
  popColumnMenu = (target, options) => {
    const { sortByColumn } = this;
    const hiddenColumns = this.columns.filter((column) => column.visible === false);
    const queueRender = this.queueRender.bind(this);
    const menu2 = [];
    if (!this.nosort && options.sort !== false) {
      menu2.push({
        caption: this.localized ? `${localize("Sort")} ${localize("Ascending")}` : "Sort Ascending",
        icon: "sortAscending",
        action() {
          sortByColumn(options);
        }
      }, {
        caption: this.localized ? `${localize("Sort")} ${localize("Descending")}` : "Sort Descending",
        icon: "sortDescending",
        action() {
          sortByColumn(options, "descending");
        }
      });
    }
    if (!this.nohide) {
      if (menu2.length) {
        menu2.push(null);
      }
      menu2.push({
        caption: this.localized ? `${localize("Hide")} ${localize("Column")}` : "Hide Column",
        icon: "eyeOff",
        enabled: () => options.visible !== true,
        action() {
          options.visible = false;
          queueRender();
        }
      }, {
        caption: this.localized ? `${localize("Show")} ${localize("Column")}` : "Show Column",
        icon: "eye",
        enabled: () => hiddenColumns.length > 0,
        menuItems: hiddenColumns.map((column) => {
          return {
            caption: column.name || column.prop,
            action() {
              delete column.visible;
              queueRender();
            }
          };
        })
      });
    }
    popMenu({
      target,
      localized: this.localized,
      menuItems: menu2
    });
  };
  get captionSpan() {
    return this.localized ? xinLocalized : span4;
  }
  headerCell = (options) => {
    const { popColumnMenu } = this;
    let ariaSort = "none";
    let sortIcon;
    switch (options.sort) {
      case "ascending":
        sortIcon = icons.sortAscending();
        ariaSort = "descending";
        break;
      case false:
        break;
      default:
        break;
      case "descending":
        ariaSort = "ascending";
        sortIcon = icons.sortDescending();
    }
    const menuButton = !(this.nosort && this.nohide) ? button4({
      class: "menu-trigger",
      onClick(event) {
        popColumnMenu(event.target, options);
        event.stopPropagation();
      }
    }, sortIcon || icons.moreVertical()) : {};
    return options.headerCell !== undefined ? options.headerCell(options) : span4({
      class: "th",
      role: "columnheader",
      ariaSort,
      style: {
        ...this.cellStyle,
        justifyContent: options.align || "left"
      }
    }, this.captionSpan({ style: { flex: "1" } }, typeof options.name === "string" ? options.name : options.prop), menuButton);
  };
  dataCell = (options) => {
    if (options.dataCell !== undefined) {
      return options.dataCell(options);
    }
    return span4({
      class: "td",
      role: "cell",
      style: {
        ...this.cellStyle,
        justifyContent: options.align || "left"
      },
      bindText: `^.${options.prop}`
    });
  };
  get visibleRows() {
    return E(this.rowData.visible);
  }
  get visibleSelectedRows() {
    return this.visibleRows.filter((obj) => obj[this.selectedKey]);
  }
  get selectedRows() {
    return this.array.filter((obj) => obj[this.selectedKey]);
  }
  rowTemplate(columns) {
    return template(div3({
      class: "tr",
      role: "row",
      bind: {
        value: "^",
        binding: { toDOM: this.selectBinding }
      }
    }, ...columns.map(this.dataCell)));
  }
  draggedColumn;
  dropColumn = (event) => {
    const target = event.target.closest(".drag-over");
    const targetIndex = Array.from(target.parentElement.children).indexOf(target);
    const dropped = this.visibleColumns[targetIndex];
    const draggedIndex = this.columns.indexOf(this.draggedColumn);
    const droppedIndex = this.columns.indexOf(dropped);
    this.columns.splice(draggedIndex, 1);
    this.columns.splice(droppedIndex, 0, this.draggedColumn);
    console.log({ event, target, targetIndex, draggedIndex, droppedIndex });
    this.queueRender();
    event.preventDefault();
    event.stopPropagation();
  };
  render() {
    super.render();
    this.rowData.pinnedTop = this.pinnedTop > 0 ? this._array.slice(0, this.pinnedTop) : [];
    this.rowData.pinnedBottom = this.pinnedBottom > 0 ? this._array.slice(this._array.length - this.pinnedBottom) : [];
    this.rowData.visible = this.filter(this._array.slice(this.pinnedTop, Math.min(this.maxVisibleRows, this._array.length - this.pinnedTop - this.pinnedBottom)));
    const { sort } = this;
    if (sort) {
      this.rowData.visible.sort(sort);
    }
    this.textContent = "";
    this.style.display = "flex";
    this.style.flexDirection = "column";
    const { visibleColumns } = this;
    this.style.setProperty("--tosi-table-row-height", `${this.rowHeight}px`);
    this.style.setProperty("--row-height", `${this.rowHeight}px`);
    this.setColumnWidths();
    if (!this.noreorder) {
      init();
    }
    const dragId = this.instanceId + "-column-header";
    const columnHeaders = visibleColumns.map((column) => {
      const header = this.headerCell(column);
      if (!this.noreorder && header.children[0]) {
        const caption = header.children[0];
        caption.setAttribute("draggable", "true");
        caption.style.pointerEvents = "all";
        caption.dataset.drag = dragId;
        header.dataset.drop = dragId;
        caption.addEventListener("dragstart", () => {
          this.draggedColumn = column;
        });
        header.addEventListener("drop", this.dropColumn);
      }
      return header;
    });
    this.append(div3({ class: "thead", role: "rowgroup", style: { touchAction: "none" } }, div3({
      class: "tr",
      role: "row"
    }, ...columnHeaders)));
    if (this.pinnedTop > 0) {
      this.append(div3({
        part: "pinnedTopRows",
        class: "tbody",
        role: "rowgroup",
        style: {
          flex: "0 0 auto",
          overflow: "hidden",
          height: `${this.rowHeight * this.pinnedTop}px`
        },
        bindList: {
          value: this.rowData.pinnedTop,
          virtual: this.virtual
        }
      }, this.rowTemplate(visibleColumns)));
    }
    this.append(div3({
      part: "visibleRows",
      class: "tbody",
      role: "rowgroup",
      style: {
        content: " ",
        minHeight: "100px",
        flex: "1 1 100px",
        overflow: "hidden auto"
      },
      bindList: {
        value: this.rowData.visible,
        virtual: this.virtual
      }
    }, this.rowTemplate(visibleColumns)));
    if (this.pinnedBottom > 0) {
      this.append(div3({
        part: "pinnedBottomRows",
        class: "tbody",
        role: "rowgroup",
        style: {
          flex: "0 0 auto",
          overflow: "hidden",
          height: `${this.rowHeight * this.pinnedBottom}px`
        },
        bindList: {
          value: this.rowData.pinnedBottom,
          virtual: this.virtual
        }
      }, this.rowTemplate(visibleColumns)));
    }
  }
}
var dataTable = DataTable.elementCreator({
  tag: "xin-table",
  styleSpec: {
    ":host": {
      "--tosi-table-row-height": "32px",
      "--tosi-table-touch-size": "var(--tosi-touch-size, 44px)",
      "--tosi-table-dragged-header-bg": "#0004",
      "--tosi-table-dragged-header-color": "#fff",
      "--tosi-table-drop-header-bg": "#fff4",
      "--row-height": "var(--tosi-table-row-height)",
      "--touch-size": "var(--tosi-table-touch-size)",
      "--dragged-header-bg": "var(--tosi-table-dragged-header-bg)",
      "--dragged-header-color": "var(--tosi-table-dragged-header-color)",
      "--drop-header-bg": "var(--tosi-table-drop-header-bg)",
      overflow: "auto hidden"
    },
    ":host .thead, :host .tbody": {
      width: Uo.tosiTableGridRowWidth
    },
    ":host .tr": {
      display: "grid",
      gridTemplateColumns: Uo.tosiTableGridColumns,
      height: Uo.tosiTableRowHeight,
      lineHeight: Uo.tosiTableRowHeight
    },
    ":host .td, :host .th": {
      overflow: "hidden",
      whiteSpace: "nowrap",
      textOverflow: "ellipsis",
      display: "flex",
      alignItems: "center"
    },
    ":host .th .menu-trigger": {
      color: "currentColor",
      background: "none",
      padding: 0,
      lineHeight: Uo.tosiTableTouchSize,
      height: Uo.tosiTableTouchSize,
      width: Uo.tosiTableTouchSize
    },
    ':host [draggable="true"]': {
      cursor: "ew-resize"
    },
    ':host [draggable="true"]:active': {
      background: Uo.tosiTableDraggedHeaderBg,
      color: Uo.tosiTableDraggedHeaderColor
    },
    ":host .drag-over": {
      background: Uo.tosiTableDropHeaderBg
    }
  }
});
// src/dialog.ts
var { dialog, button: button5, header, footer, xinSlot: xinSlot2, h3, p, label, input: input3, div: div4 } = y;

class TosiDialog extends F {
  static async alert(message, title = "Alert") {
    return new Promise((resolve) => {
      const alertDialog = tosiDialog({
        removeOnClose: true,
        closeOnBackgroundClick: true,
        dialogWillClose() {
          resolve();
        }
      }, h3({ slot: "header" }, title), message.includes(`
`) ? y.pre({ style: { whiteSpace: "pre-wrap", margin: 0 } }, message) : p(message));
      document.body.append(alertDialog);
      alertDialog.showModal();
    });
  }
  static async confirm(message, title = "Confirm") {
    return new Promise((resolve) => {
      const confirmDialog = tosiDialog({
        removeOnClose: true,
        dialogWillClose(reason) {
          resolve(reason === "confirm");
        }
      }, h3({ slot: "header" }, title), p(message), button5({
        slot: "footer",
        onClick() {
          confirmDialog.close();
        }
      }, "Cancel"));
      document.body.append(confirmDialog);
      confirmDialog.showModal();
    });
  }
  static async prompt(message, title = "Prompt", currentValue = "") {
    return new Promise((resolve) => {
      const inputField = input3({ value: currentValue });
      const promptDialog = tosiDialog({
        removeOnClose: true,
        dialogWillClose(reason) {
          resolve(reason === "confirm" ? inputField.value : null);
        },
        initialFocus() {
          inputField.focus();
        }
      }, h3({ slot: "header" }, title), p(label({
        style: {
          display: "flex",
          flexDirection: "column",
          alignItems: "stretch",
          gap: 5
        }
      }, div4(message), inputField)), button5({
        slot: "footer",
        onClick() {
          promptDialog.close();
        }
      }, "Cancel"));
      document.body.append(promptDialog);
      promptDialog.showModal();
    });
  }
  static initAttributes = {
    removeOnClose: false,
    closeOnBackgroundClick: false
  };
  constructor() {
    super();
    V(this, "click", () => {
      if (this.closeOnBackgroundClick) {
        this.close();
      }
    });
  }
  dialogWillClose = (reason = "cancel") => {
    console.log("dialog will close with", reason);
  };
  initialFocus() {
    this.parts.ok.focus();
  }
  #modalResolution = (_outcome) => {};
  showModal = () => {
    this.style.zIndex = String(findHighestZ());
    return new Promise((resolve) => {
      this.#modalResolution = resolve;
      this.parts.dialog.showModal();
      requestAnimationFrame(() => {
        this.initialFocus();
      });
    });
  };
  close = (reason = "cancel") => {
    this.dialogWillClose(reason);
    this.#modalResolution(reason);
    this.parts.dialog.close();
    if (this.removeOnClose) {
      this.remove();
    }
  };
  ok = () => {
    this.close("confirm");
  };
  content = () => dialog({ part: "dialog" }, header(xinSlot2({ name: "header" })), xinSlot2(), footer(xinSlot2({ name: "footer" }), button5({ part: "ok", onClick: this.ok }, "OK")));
}
var tosiDialog = TosiDialog.elementCreator({
  tag: "tosi-dialog",
  styleSpec: {
    ":host > dialog::backdrop": {
      backdropFilter: "blur(8px)"
    },
    ":host > dialog:not([open])": {
      display: "none"
    },
    ":host > dialog[open]": {
      minWidth: 300,
      border: 0,
      borderRadius: 10,
      overflow: "hidden",
      maxHeight: "calc(100% - 20px)",
      padding: 0,
      display: "flex",
      flexDirection: "column",
      gap: 5,
      _dialogShadow: uo.menuShadow("0 5px 10px #0004"),
      _dialogBackground: uo.background("#fafafa"),
      _dialogColor: uo.textColor("#222"),
      boxShadow: Uo.dialogShadow,
      background: Uo.dialogBackground,
      color: Uo.dialogColor
    },
    ":host > dialog > *": {
      padding: "0 20px"
    },
    ":host > dialog > header": {
      display: "flex",
      justifyContent: "center",
      gap: 10
    },
    ":host > dialog > footer": {
      display: "flex",
      justifyContent: "flex-end",
      gap: 10,
      paddingBottom: 20
    }
  }
});
// node_modules/marked/lib/marked.esm.js
function L() {
  return { async: false, breaks: false, extensions: null, gfm: true, hooks: null, pedantic: false, renderer: null, silent: false, tokenizer: null, walkTokens: null };
}
var T2 = L();
function G2(l2) {
  T2 = l2;
}
var E2 = { exec: () => null };
function d(l2, e = "") {
  let t = typeof l2 == "string" ? l2 : l2.source, n = { replace: (r, i) => {
    let s = typeof i == "string" ? i : i.source;
    return s = s.replace(m.caret, "$1"), t = t.replace(r, s), n;
  }, getRegex: () => new RegExp(t, e) };
  return n;
}
var be2 = (() => {
  try {
    return !!new RegExp("(?<=1)(?<!1)");
  } catch {
    return false;
  }
})();
var m = { codeRemoveIndent: /^(?: {1,4}| {0,3}\t)/gm, outputLinkReplace: /\\([\[\]])/g, indentCodeCompensation: /^(\s+)(?:```)/, beginningSpace: /^\s+/, endingHash: /#$/, startingSpaceChar: /^ /, endingSpaceChar: / $/, nonSpaceChar: /[^ ]/, newLineCharGlobal: /\n/g, tabCharGlobal: /\t/g, multipleSpaceGlobal: /\s+/g, blankLine: /^[ \t]*$/, doubleBlankLine: /\n[ \t]*\n[ \t]*$/, blockquoteStart: /^ {0,3}>/, blockquoteSetextReplace: /\n {0,3}((?:=+|-+) *)(?=\n|$)/g, blockquoteSetextReplace2: /^ {0,3}>[ \t]?/gm, listReplaceTabs: /^\t+/, listReplaceNesting: /^ {1,4}(?=( {4})*[^ ])/g, listIsTask: /^\[[ xX]\] /, listReplaceTask: /^\[[ xX]\] +/, anyLine: /\n.*\n/, hrefBrackets: /^<(.*)>$/, tableDelimiter: /[:|]/, tableAlignChars: /^\||\| *$/g, tableRowBlankLine: /\n[ \t]*$/, tableAlignRight: /^ *-+: *$/, tableAlignCenter: /^ *:-+: *$/, tableAlignLeft: /^ *:-+ *$/, startATag: /^<a /i, endATag: /^<\/a>/i, startPreScriptTag: /^<(pre|code|kbd|script)(\s|>)/i, endPreScriptTag: /^<\/(pre|code|kbd|script)(\s|>)/i, startAngleBracket: /^</, endAngleBracket: />$/, pedanticHrefTitle: /^([^'"]*[^\s])\s+(['"])(.*)\2/, unicodeAlphaNumeric: /[\p{L}\p{N}]/u, escapeTest: /[&<>"']/, escapeReplace: /[&<>"']/g, escapeTestNoEncode: /[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/, escapeReplaceNoEncode: /[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/g, unescapeTest: /&(#(?:\d+)|(?:#x[0-9A-Fa-f]+)|(?:\w+));?/ig, caret: /(^|[^\[])\^/g, percentDecode: /%25/g, findPipe: /\|/g, splitPipe: / \|/, slashPipe: /\\\|/g, carriageReturn: /\r\n|\r/g, spaceLine: /^ +$/gm, notSpaceStart: /^\S*/, endingNewline: /\n$/, listItemRegex: (l2) => new RegExp(`^( {0,3}${l2})((?:[	 ][^\\n]*)?(?:\\n|$))`), nextBulletRegex: (l2) => new RegExp(`^ {0,${Math.min(3, l2 - 1)}}(?:[*+-]|\\d{1,9}[.)])((?:[ 	][^\\n]*)?(?:\\n|$))`), hrRegex: (l2) => new RegExp(`^ {0,${Math.min(3, l2 - 1)}}((?:- *){3,}|(?:_ *){3,}|(?:\\* *){3,})(?:\\n+|$)`), fencesBeginRegex: (l2) => new RegExp(`^ {0,${Math.min(3, l2 - 1)}}(?:\`\`\`|~~~)`), headingBeginRegex: (l2) => new RegExp(`^ {0,${Math.min(3, l2 - 1)}}#`), htmlBeginRegex: (l2) => new RegExp(`^ {0,${Math.min(3, l2 - 1)}}<(?:[a-z].*>|!--)`, "i") };
var Re2 = /^(?:[ \t]*(?:\n|$))+/;
var Te2 = /^((?: {4}| {0,3}\t)[^\n]+(?:\n(?:[ \t]*(?:\n|$))*)?)+/;
var Oe2 = /^ {0,3}(`{3,}(?=[^`\n]*(?:\n|$))|~{3,})([^\n]*)(?:\n|$)(?:|([\s\S]*?)(?:\n|$))(?: {0,3}\1[~`]* *(?=\n|$)|$)/;
var I2 = /^ {0,3}((?:-[\t ]*){3,}|(?:_[ \t]*){3,}|(?:\*[ \t]*){3,})(?:\n+|$)/;
var we2 = /^ {0,3}(#{1,6})(?=\s|$)(.*)(?:\n+|$)/;
var F2 = /(?:[*+-]|\d{1,9}[.)])/;
var ie2 = /^(?!bull |blockCode|fences|blockquote|heading|html|table)((?:.|\n(?!\s*?\n|bull |blockCode|fences|blockquote|heading|html|table))+?)\n {0,3}(=+|-+) *(?:\n+|$)/;
var oe2 = d(ie2).replace(/bull/g, F2).replace(/blockCode/g, /(?: {4}| {0,3}\t)/).replace(/fences/g, / {0,3}(?:`{3,}|~{3,})/).replace(/blockquote/g, / {0,3}>/).replace(/heading/g, / {0,3}#{1,6}/).replace(/html/g, / {0,3}<[^\n>]+>\n/).replace(/\|table/g, "").getRegex();
var ye2 = d(ie2).replace(/bull/g, F2).replace(/blockCode/g, /(?: {4}| {0,3}\t)/).replace(/fences/g, / {0,3}(?:`{3,}|~{3,})/).replace(/blockquote/g, / {0,3}>/).replace(/heading/g, / {0,3}#{1,6}/).replace(/html/g, / {0,3}<[^\n>]+>\n/).replace(/table/g, / {0,3}\|?(?:[:\- ]*\|)+[\:\- ]*\n/).getRegex();
var j2 = /^([^\n]+(?:\n(?!hr|heading|lheading|blockquote|fences|list|html|table| +\n)[^\n]+)*)/;
var Pe2 = /^[^\n]+/;
var Q2 = /(?!\s*\])(?:\\[\s\S]|[^\[\]\\])+/;
var Se2 = d(/^ {0,3}\[(label)\]: *(?:\n[ \t]*)?([^<\s][^\s]*|<.*?>)(?:(?: +(?:\n[ \t]*)?| *\n[ \t]*)(title))? *(?:\n+|$)/).replace("label", Q2).replace("title", /(?:"(?:\\"?|[^"\\])*"|'[^'\n]*(?:\n[^'\n]+)*\n?'|\([^()]*\))/).getRegex();
var $e2 = d(/^( {0,3}bull)([ \t][^\n]+?)?(?:\n|$)/).replace(/bull/g, F2).getRegex();
var v2 = "address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|meta|nav|noframes|ol|optgroup|option|p|param|search|section|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul";
var U2 = /<!--(?:-?>|[\s\S]*?(?:-->|$))/;
var _e2 = d("^ {0,3}(?:<(script|pre|style|textarea)[\\s>][\\s\\S]*?(?:</\\1>[^\\n]*\\n+|$)|comment[^\\n]*(\\n+|$)|<\\?[\\s\\S]*?(?:\\?>\\n*|$)|<![A-Z][\\s\\S]*?(?:>\\n*|$)|<!\\[CDATA\\[[\\s\\S]*?(?:\\]\\]>\\n*|$)|</?(tag)(?: +|\\n|/?>)[\\s\\S]*?(?:(?:\\n[ \t]*)+\\n|$)|<(?!script|pre|style|textarea)([a-z][\\w-]*)(?:attribute)*? */?>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n[ \t]*)+\\n|$)|</(?!script|pre|style|textarea)[a-z][\\w-]*\\s*>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n[ \t]*)+\\n|$))", "i").replace("comment", U2).replace("tag", v2).replace("attribute", / +[a-zA-Z:_][\w.:-]*(?: *= *"[^"\n]*"| *= *'[^'\n]*'| *= *[^\s"'=<>`]+)?/).getRegex();
var ae2 = d(j2).replace("hr", I2).replace("heading", " {0,3}#{1,6}(?:\\s|$)").replace("|lheading", "").replace("|table", "").replace("blockquote", " {0,3}>").replace("fences", " {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list", " {0,3}(?:[*+-]|1[.)]) ").replace("html", "</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag", v2).getRegex();
var Le2 = d(/^( {0,3}> ?(paragraph|[^\n]*)(?:\n|$))+/).replace("paragraph", ae2).getRegex();
var K = { blockquote: Le2, code: Te2, def: Se2, fences: Oe2, heading: we2, hr: I2, html: _e2, lheading: oe2, list: $e2, newline: Re2, paragraph: ae2, table: E2, text: Pe2 };
var re2 = d("^ *([^\\n ].*)\\n {0,3}((?:\\| *)?:?-+:? *(?:\\| *:?-+:? *)*(?:\\| *)?)(?:\\n((?:(?! *\\n|hr|heading|blockquote|code|fences|list|html).*(?:\\n|$))*)\\n*|$)").replace("hr", I2).replace("heading", " {0,3}#{1,6}(?:\\s|$)").replace("blockquote", " {0,3}>").replace("code", "(?: {4}| {0,3}\t)[^\\n]").replace("fences", " {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list", " {0,3}(?:[*+-]|1[.)]) ").replace("html", "</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag", v2).getRegex();
var Me2 = { ...K, lheading: ye2, table: re2, paragraph: d(j2).replace("hr", I2).replace("heading", " {0,3}#{1,6}(?:\\s|$)").replace("|lheading", "").replace("table", re2).replace("blockquote", " {0,3}>").replace("fences", " {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list", " {0,3}(?:[*+-]|1[.)]) ").replace("html", "</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag", v2).getRegex() };
var ze2 = { ...K, html: d(`^ *(?:comment *(?:\\n|\\s*$)|<(tag)[\\s\\S]+?</\\1> *(?:\\n{2,}|\\s*$)|<tag(?:"[^"]*"|'[^']*'|\\s[^'"/>\\s]*)*?/?> *(?:\\n{2,}|\\s*$))`).replace("comment", U2).replace(/tag/g, "(?!(?:a|em|strong|small|s|cite|q|dfn|abbr|data|time|code|var|samp|kbd|sub|sup|i|b|u|mark|ruby|rt|rp|bdi|bdo|span|br|wbr|ins|del|img)\\b)\\w+(?!:|[^\\w\\s@]*@)\\b").getRegex(), def: /^ *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +(["(][^\n]+[")]))? *(?:\n+|$)/, heading: /^(#{1,6})(.*)(?:\n+|$)/, fences: E2, lheading: /^(.+?)\n {0,3}(=+|-+) *(?:\n+|$)/, paragraph: d(j2).replace("hr", I2).replace("heading", ` *#{1,6} *[^
]`).replace("lheading", oe2).replace("|table", "").replace("blockquote", " {0,3}>").replace("|fences", "").replace("|list", "").replace("|html", "").replace("|tag", "").getRegex() };
var Ae2 = /^\\([!"#$%&'()*+,\-./:;<=>?@\[\]\\^_`{|}~])/;
var Ee2 = /^(`+)([^`]|[^`][\s\S]*?[^`])\1(?!`)/;
var le2 = /^( {2,}|\\)\n(?!\s*$)/;
var Ie2 = /^(`+|[^`])(?:(?= {2,}\n)|[\s\S]*?(?:(?=[\\<!\[`*_]|\b_|$)|[^ ](?= {2,}\n)))/;
var D2 = /[\p{P}\p{S}]/u;
var W2 = /[\s\p{P}\p{S}]/u;
var ue2 = /[^\s\p{P}\p{S}]/u;
var Ce2 = d(/^((?![*_])punctSpace)/, "u").replace(/punctSpace/g, W2).getRegex();
var pe2 = /(?!~)[\p{P}\p{S}]/u;
var Be2 = /(?!~)[\s\p{P}\p{S}]/u;
var qe = /(?:[^\s\p{P}\p{S}]|~)/u;
var ve2 = d(/link|precode-code|html/, "g").replace("link", /\[(?:[^\[\]`]|(?<a>`+)[^`]+\k<a>(?!`))*?\]\((?:\\[\s\S]|[^\\\(\)]|\((?:\\[\s\S]|[^\\\(\)])*\))*\)/).replace("precode-", be2 ? "(?<!`)()" : "(^^|[^`])").replace("code", /(?<b>`+)[^`]+\k<b>(?!`)/).replace("html", /<(?! )[^<>]*?>/).getRegex();
var ce2 = /^(?:\*+(?:((?!\*)punct)|[^\s*]))|^_+(?:((?!_)punct)|([^\s_]))/;
var De2 = d(ce2, "u").replace(/punct/g, D2).getRegex();
var He2 = d(ce2, "u").replace(/punct/g, pe2).getRegex();
var he2 = "^[^_*]*?__[^_*]*?\\*[^_*]*?(?=__)|[^*]+(?=[^*])|(?!\\*)punct(\\*+)(?=[\\s]|$)|notPunctSpace(\\*+)(?!\\*)(?=punctSpace|$)|(?!\\*)punctSpace(\\*+)(?=notPunctSpace)|[\\s](\\*+)(?!\\*)(?=punct)|(?!\\*)punct(\\*+)(?!\\*)(?=punct)|notPunctSpace(\\*+)(?=notPunctSpace)";
var Ze2 = d(he2, "gu").replace(/notPunctSpace/g, ue2).replace(/punctSpace/g, W2).replace(/punct/g, D2).getRegex();
var Ge2 = d(he2, "gu").replace(/notPunctSpace/g, qe).replace(/punctSpace/g, Be2).replace(/punct/g, pe2).getRegex();
var Ne2 = d("^[^_*]*?\\*\\*[^_*]*?_[^_*]*?(?=\\*\\*)|[^_]+(?=[^_])|(?!_)punct(_+)(?=[\\s]|$)|notPunctSpace(_+)(?!_)(?=punctSpace|$)|(?!_)punctSpace(_+)(?=notPunctSpace)|[\\s](_+)(?!_)(?=punct)|(?!_)punct(_+)(?!_)(?=punct)", "gu").replace(/notPunctSpace/g, ue2).replace(/punctSpace/g, W2).replace(/punct/g, D2).getRegex();
var Fe2 = d(/\\(punct)/, "gu").replace(/punct/g, D2).getRegex();
var je2 = d(/^<(scheme:[^\s\x00-\x1f<>]*|email)>/).replace("scheme", /[a-zA-Z][a-zA-Z0-9+.-]{1,31}/).replace("email", /[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+(@)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+(?![-_])/).getRegex();
var Qe2 = d(U2).replace("(?:-->|$)", "-->").getRegex();
var Ue2 = d("^comment|^</[a-zA-Z][\\w:-]*\\s*>|^<[a-zA-Z][\\w-]*(?:attribute)*?\\s*/?>|^<\\?[\\s\\S]*?\\?>|^<![a-zA-Z]+\\s[\\s\\S]*?>|^<!\\[CDATA\\[[\\s\\S]*?\\]\\]>").replace("comment", Qe2).replace("attribute", /\s+[a-zA-Z:_][\w.:-]*(?:\s*=\s*"[^"]*"|\s*=\s*'[^']*'|\s*=\s*[^\s"'=<>`]+)?/).getRegex();
var q2 = /(?:\[(?:\\[\s\S]|[^\[\]\\])*\]|\\[\s\S]|`+[^`]*?`+(?!`)|[^\[\]\\`])*?/;
var Ke2 = d(/^!?\[(label)\]\(\s*(href)(?:(?:[ \t]*(?:\n[ \t]*)?)(title))?\s*\)/).replace("label", q2).replace("href", /<(?:\\.|[^\n<>\\])+>|[^ \t\n\x00-\x1f]*/).replace("title", /"(?:\\"?|[^"\\])*"|'(?:\\'?|[^'\\])*'|\((?:\\\)?|[^)\\])*\)/).getRegex();
var de2 = d(/^!?\[(label)\]\[(ref)\]/).replace("label", q2).replace("ref", Q2).getRegex();
var ke2 = d(/^!?\[(ref)\](?:\[\])?/).replace("ref", Q2).getRegex();
var We2 = d("reflink|nolink(?!\\()", "g").replace("reflink", de2).replace("nolink", ke2).getRegex();
var se2 = /[hH][tT][tT][pP][sS]?|[fF][tT][pP]/;
var X2 = { _backpedal: E2, anyPunctuation: Fe2, autolink: je2, blockSkip: ve2, br: le2, code: Ee2, del: E2, emStrongLDelim: De2, emStrongRDelimAst: Ze2, emStrongRDelimUnd: Ne2, escape: Ae2, link: Ke2, nolink: ke2, punctuation: Ce2, reflink: de2, reflinkSearch: We2, tag: Ue2, text: Ie2, url: E2 };
var Xe2 = { ...X2, link: d(/^!?\[(label)\]\((.*?)\)/).replace("label", q2).getRegex(), reflink: d(/^!?\[(label)\]\s*\[([^\]]*)\]/).replace("label", q2).getRegex() };
var N2 = { ...X2, emStrongRDelimAst: Ge2, emStrongLDelim: He2, url: d(/^((?:protocol):\/\/|www\.)(?:[a-zA-Z0-9\-]+\.?)+[^\s<]*|^email/).replace("protocol", se2).replace("email", /[A-Za-z0-9._+-]+(@)[a-zA-Z0-9-_]+(?:\.[a-zA-Z0-9-_]*[a-zA-Z0-9])+(?![-_])/).getRegex(), _backpedal: /(?:[^?!.,:;*_'"~()&]+|\([^)]*\)|&(?![a-zA-Z0-9]+;$)|[?!.,:;*_'"~)]+(?!$))+/, del: /^(~~?)(?=[^\s~])((?:\\[\s\S]|[^\\])*?(?:\\[\s\S]|[^\s~\\]))\1(?=[^~]|$)/, text: d(/^([`~]+|[^`~])(?:(?= {2,}\n)|(?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)|[\s\S]*?(?:(?=[\\<!\[`*~_]|\b_|protocol:\/\/|www\.|$)|[^ ](?= {2,}\n)|[^a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-](?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)))/).replace("protocol", se2).getRegex() };
var Je2 = { ...N2, br: d(le2).replace("{2,}", "*").getRegex(), text: d(N2.text).replace("\\b_", "\\b_| {2,}\\n").replace(/\{2,\}/g, "*").getRegex() };
var C = { normal: K, gfm: Me2, pedantic: ze2 };
var M2 = { normal: X2, gfm: N2, breaks: Je2, pedantic: Xe2 };
var Ve2 = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
var ge2 = (l2) => Ve2[l2];
function w(l2, e) {
  if (e) {
    if (m.escapeTest.test(l2))
      return l2.replace(m.escapeReplace, ge2);
  } else if (m.escapeTestNoEncode.test(l2))
    return l2.replace(m.escapeReplaceNoEncode, ge2);
  return l2;
}
function J2(l2) {
  try {
    l2 = encodeURI(l2).replace(m.percentDecode, "%");
  } catch {
    return null;
  }
  return l2;
}
function V2(l2, e) {
  let t = l2.replace(m.findPipe, (i, s, a3) => {
    let o = false, p2 = s;
    for (;--p2 >= 0 && a3[p2] === "\\"; )
      o = !o;
    return o ? "|" : " |";
  }), n = t.split(m.splitPipe), r = 0;
  if (n[0].trim() || n.shift(), n.length > 0 && !n.at(-1)?.trim() && n.pop(), e)
    if (n.length > e)
      n.splice(e);
    else
      for (;n.length < e; )
        n.push("");
  for (;r < n.length; r++)
    n[r] = n[r].trim().replace(m.slashPipe, "|");
  return n;
}
function z2(l2, e, t) {
  let n = l2.length;
  if (n === 0)
    return "";
  let r = 0;
  for (;r < n; ) {
    let i = l2.charAt(n - r - 1);
    if (i === e && !t)
      r++;
    else if (i !== e && t)
      r++;
    else
      break;
  }
  return l2.slice(0, n - r);
}
function fe2(l2, e) {
  if (l2.indexOf(e[1]) === -1)
    return -1;
  let t = 0;
  for (let n = 0;n < l2.length; n++)
    if (l2[n] === "\\")
      n++;
    else if (l2[n] === e[0])
      t++;
    else if (l2[n] === e[1] && (t--, t < 0))
      return n;
  return t > 0 ? -2 : -1;
}
function me2(l2, e, t, n, r) {
  let i = e.href, s = e.title || null, a3 = l2[1].replace(r.other.outputLinkReplace, "$1");
  n.state.inLink = true;
  let o = { type: l2[0].charAt(0) === "!" ? "image" : "link", raw: t, href: i, title: s, text: a3, tokens: n.inlineTokens(a3) };
  return n.state.inLink = false, o;
}
function Ye2(l2, e, t) {
  let n = l2.match(t.other.indentCodeCompensation);
  if (n === null)
    return e;
  let r = n[1];
  return e.split(`
`).map((i) => {
    let s = i.match(t.other.beginningSpace);
    if (s === null)
      return i;
    let [a3] = s;
    return a3.length >= r.length ? i.slice(r.length) : i;
  }).join(`
`);
}
var y2 = class {
  options;
  rules;
  lexer;
  constructor(e) {
    this.options = e || T2;
  }
  space(e) {
    let t = this.rules.block.newline.exec(e);
    if (t && t[0].length > 0)
      return { type: "space", raw: t[0] };
  }
  code(e) {
    let t = this.rules.block.code.exec(e);
    if (t) {
      let n = t[0].replace(this.rules.other.codeRemoveIndent, "");
      return { type: "code", raw: t[0], codeBlockStyle: "indented", text: this.options.pedantic ? n : z2(n, `
`) };
    }
  }
  fences(e) {
    let t = this.rules.block.fences.exec(e);
    if (t) {
      let n = t[0], r = Ye2(n, t[3] || "", this.rules);
      return { type: "code", raw: n, lang: t[2] ? t[2].trim().replace(this.rules.inline.anyPunctuation, "$1") : t[2], text: r };
    }
  }
  heading(e) {
    let t = this.rules.block.heading.exec(e);
    if (t) {
      let n = t[2].trim();
      if (this.rules.other.endingHash.test(n)) {
        let r = z2(n, "#");
        (this.options.pedantic || !r || this.rules.other.endingSpaceChar.test(r)) && (n = r.trim());
      }
      return { type: "heading", raw: t[0], depth: t[1].length, text: n, tokens: this.lexer.inline(n) };
    }
  }
  hr(e) {
    let t = this.rules.block.hr.exec(e);
    if (t)
      return { type: "hr", raw: z2(t[0], `
`) };
  }
  blockquote(e) {
    let t = this.rules.block.blockquote.exec(e);
    if (t) {
      let n = z2(t[0], `
`).split(`
`), r = "", i = "", s = [];
      for (;n.length > 0; ) {
        let a3 = false, o = [], p2;
        for (p2 = 0;p2 < n.length; p2++)
          if (this.rules.other.blockquoteStart.test(n[p2]))
            o.push(n[p2]), a3 = true;
          else if (!a3)
            o.push(n[p2]);
          else
            break;
        n = n.slice(p2);
        let u2 = o.join(`
`), c = u2.replace(this.rules.other.blockquoteSetextReplace, `
    $1`).replace(this.rules.other.blockquoteSetextReplace2, "");
        r = r ? `${r}
${u2}` : u2, i = i ? `${i}
${c}` : c;
        let g2 = this.lexer.state.top;
        if (this.lexer.state.top = true, this.lexer.blockTokens(c, s, true), this.lexer.state.top = g2, n.length === 0)
          break;
        let h = s.at(-1);
        if (h?.type === "code")
          break;
        if (h?.type === "blockquote") {
          let R2 = h, f = R2.raw + `
` + n.join(`
`), O2 = this.blockquote(f);
          s[s.length - 1] = O2, r = r.substring(0, r.length - R2.raw.length) + O2.raw, i = i.substring(0, i.length - R2.text.length) + O2.text;
          break;
        } else if (h?.type === "list") {
          let R2 = h, f = R2.raw + `
` + n.join(`
`), O2 = this.list(f);
          s[s.length - 1] = O2, r = r.substring(0, r.length - h.raw.length) + O2.raw, i = i.substring(0, i.length - R2.raw.length) + O2.raw, n = f.substring(s.at(-1).raw.length).split(`
`);
          continue;
        }
      }
      return { type: "blockquote", raw: r, tokens: s, text: i };
    }
  }
  list(e) {
    let t = this.rules.block.list.exec(e);
    if (t) {
      let n = t[1].trim(), r = n.length > 1, i = { type: "list", raw: "", ordered: r, start: r ? +n.slice(0, -1) : "", loose: false, items: [] };
      n = r ? `\\d{1,9}\\${n.slice(-1)}` : `\\${n}`, this.options.pedantic && (n = r ? n : "[*+-]");
      let s = this.rules.other.listItemRegex(n), a3 = false;
      for (;e; ) {
        let p2 = false, u2 = "", c = "";
        if (!(t = s.exec(e)) || this.rules.block.hr.test(e))
          break;
        u2 = t[0], e = e.substring(u2.length);
        let g2 = t[2].split(`
`, 1)[0].replace(this.rules.other.listReplaceTabs, (H2) => " ".repeat(3 * H2.length)), h = e.split(`
`, 1)[0], R2 = !g2.trim(), f = 0;
        if (this.options.pedantic ? (f = 2, c = g2.trimStart()) : R2 ? f = t[1].length + 1 : (f = t[2].search(this.rules.other.nonSpaceChar), f = f > 4 ? 1 : f, c = g2.slice(f), f += t[1].length), R2 && this.rules.other.blankLine.test(h) && (u2 += h + `
`, e = e.substring(h.length + 1), p2 = true), !p2) {
          let H2 = this.rules.other.nextBulletRegex(f), ee2 = this.rules.other.hrRegex(f), te2 = this.rules.other.fencesBeginRegex(f), ne2 = this.rules.other.headingBeginRegex(f), xe2 = this.rules.other.htmlBeginRegex(f);
          for (;e; ) {
            let Z2 = e.split(`
`, 1)[0], A2;
            if (h = Z2, this.options.pedantic ? (h = h.replace(this.rules.other.listReplaceNesting, "  "), A2 = h) : A2 = h.replace(this.rules.other.tabCharGlobal, "    "), te2.test(h) || ne2.test(h) || xe2.test(h) || H2.test(h) || ee2.test(h))
              break;
            if (A2.search(this.rules.other.nonSpaceChar) >= f || !h.trim())
              c += `
` + A2.slice(f);
            else {
              if (R2 || g2.replace(this.rules.other.tabCharGlobal, "    ").search(this.rules.other.nonSpaceChar) >= 4 || te2.test(g2) || ne2.test(g2) || ee2.test(g2))
                break;
              c += `
` + h;
            }
            !R2 && !h.trim() && (R2 = true), u2 += Z2 + `
`, e = e.substring(Z2.length + 1), g2 = A2.slice(f);
          }
        }
        i.loose || (a3 ? i.loose = true : this.rules.other.doubleBlankLine.test(u2) && (a3 = true));
        let O2 = null, Y2;
        this.options.gfm && (O2 = this.rules.other.listIsTask.exec(c), O2 && (Y2 = O2[0] !== "[ ] ", c = c.replace(this.rules.other.listReplaceTask, ""))), i.items.push({ type: "list_item", raw: u2, task: !!O2, checked: Y2, loose: false, text: c, tokens: [] }), i.raw += u2;
      }
      let o = i.items.at(-1);
      if (o)
        o.raw = o.raw.trimEnd(), o.text = o.text.trimEnd();
      else
        return;
      i.raw = i.raw.trimEnd();
      for (let p2 = 0;p2 < i.items.length; p2++)
        if (this.lexer.state.top = false, i.items[p2].tokens = this.lexer.blockTokens(i.items[p2].text, []), !i.loose) {
          let u2 = i.items[p2].tokens.filter((g2) => g2.type === "space"), c = u2.length > 0 && u2.some((g2) => this.rules.other.anyLine.test(g2.raw));
          i.loose = c;
        }
      if (i.loose)
        for (let p2 = 0;p2 < i.items.length; p2++)
          i.items[p2].loose = true;
      return i;
    }
  }
  html(e) {
    let t = this.rules.block.html.exec(e);
    if (t)
      return { type: "html", block: true, raw: t[0], pre: t[1] === "pre" || t[1] === "script" || t[1] === "style", text: t[0] };
  }
  def(e) {
    let t = this.rules.block.def.exec(e);
    if (t) {
      let n = t[1].toLowerCase().replace(this.rules.other.multipleSpaceGlobal, " "), r = t[2] ? t[2].replace(this.rules.other.hrefBrackets, "$1").replace(this.rules.inline.anyPunctuation, "$1") : "", i = t[3] ? t[3].substring(1, t[3].length - 1).replace(this.rules.inline.anyPunctuation, "$1") : t[3];
      return { type: "def", tag: n, raw: t[0], href: r, title: i };
    }
  }
  table(e) {
    let t = this.rules.block.table.exec(e);
    if (!t || !this.rules.other.tableDelimiter.test(t[2]))
      return;
    let n = V2(t[1]), r = t[2].replace(this.rules.other.tableAlignChars, "").split("|"), i = t[3]?.trim() ? t[3].replace(this.rules.other.tableRowBlankLine, "").split(`
`) : [], s = { type: "table", raw: t[0], header: [], align: [], rows: [] };
    if (n.length === r.length) {
      for (let a3 of r)
        this.rules.other.tableAlignRight.test(a3) ? s.align.push("right") : this.rules.other.tableAlignCenter.test(a3) ? s.align.push("center") : this.rules.other.tableAlignLeft.test(a3) ? s.align.push("left") : s.align.push(null);
      for (let a3 = 0;a3 < n.length; a3++)
        s.header.push({ text: n[a3], tokens: this.lexer.inline(n[a3]), header: true, align: s.align[a3] });
      for (let a3 of i)
        s.rows.push(V2(a3, s.header.length).map((o, p2) => ({ text: o, tokens: this.lexer.inline(o), header: false, align: s.align[p2] })));
      return s;
    }
  }
  lheading(e) {
    let t = this.rules.block.lheading.exec(e);
    if (t)
      return { type: "heading", raw: t[0], depth: t[2].charAt(0) === "=" ? 1 : 2, text: t[1], tokens: this.lexer.inline(t[1]) };
  }
  paragraph(e) {
    let t = this.rules.block.paragraph.exec(e);
    if (t) {
      let n = t[1].charAt(t[1].length - 1) === `
` ? t[1].slice(0, -1) : t[1];
      return { type: "paragraph", raw: t[0], text: n, tokens: this.lexer.inline(n) };
    }
  }
  text(e) {
    let t = this.rules.block.text.exec(e);
    if (t)
      return { type: "text", raw: t[0], text: t[0], tokens: this.lexer.inline(t[0]) };
  }
  escape(e) {
    let t = this.rules.inline.escape.exec(e);
    if (t)
      return { type: "escape", raw: t[0], text: t[1] };
  }
  tag(e) {
    let t = this.rules.inline.tag.exec(e);
    if (t)
      return !this.lexer.state.inLink && this.rules.other.startATag.test(t[0]) ? this.lexer.state.inLink = true : this.lexer.state.inLink && this.rules.other.endATag.test(t[0]) && (this.lexer.state.inLink = false), !this.lexer.state.inRawBlock && this.rules.other.startPreScriptTag.test(t[0]) ? this.lexer.state.inRawBlock = true : this.lexer.state.inRawBlock && this.rules.other.endPreScriptTag.test(t[0]) && (this.lexer.state.inRawBlock = false), { type: "html", raw: t[0], inLink: this.lexer.state.inLink, inRawBlock: this.lexer.state.inRawBlock, block: false, text: t[0] };
  }
  link(e) {
    let t = this.rules.inline.link.exec(e);
    if (t) {
      let n = t[2].trim();
      if (!this.options.pedantic && this.rules.other.startAngleBracket.test(n)) {
        if (!this.rules.other.endAngleBracket.test(n))
          return;
        let s = z2(n.slice(0, -1), "\\");
        if ((n.length - s.length) % 2 === 0)
          return;
      } else {
        let s = fe2(t[2], "()");
        if (s === -2)
          return;
        if (s > -1) {
          let o = (t[0].indexOf("!") === 0 ? 5 : 4) + t[1].length + s;
          t[2] = t[2].substring(0, s), t[0] = t[0].substring(0, o).trim(), t[3] = "";
        }
      }
      let r = t[2], i = "";
      if (this.options.pedantic) {
        let s = this.rules.other.pedanticHrefTitle.exec(r);
        s && (r = s[1], i = s[3]);
      } else
        i = t[3] ? t[3].slice(1, -1) : "";
      return r = r.trim(), this.rules.other.startAngleBracket.test(r) && (this.options.pedantic && !this.rules.other.endAngleBracket.test(n) ? r = r.slice(1) : r = r.slice(1, -1)), me2(t, { href: r && r.replace(this.rules.inline.anyPunctuation, "$1"), title: i && i.replace(this.rules.inline.anyPunctuation, "$1") }, t[0], this.lexer, this.rules);
    }
  }
  reflink(e, t) {
    let n;
    if ((n = this.rules.inline.reflink.exec(e)) || (n = this.rules.inline.nolink.exec(e))) {
      let r = (n[2] || n[1]).replace(this.rules.other.multipleSpaceGlobal, " "), i = t[r.toLowerCase()];
      if (!i) {
        let s = n[0].charAt(0);
        return { type: "text", raw: s, text: s };
      }
      return me2(n, i, n[0], this.lexer, this.rules);
    }
  }
  emStrong(e, t, n = "") {
    let r = this.rules.inline.emStrongLDelim.exec(e);
    if (!r || r[3] && n.match(this.rules.other.unicodeAlphaNumeric))
      return;
    if (!(r[1] || r[2] || "") || !n || this.rules.inline.punctuation.exec(n)) {
      let s = [...r[0]].length - 1, a3, o, p2 = s, u2 = 0, c = r[0][0] === "*" ? this.rules.inline.emStrongRDelimAst : this.rules.inline.emStrongRDelimUnd;
      for (c.lastIndex = 0, t = t.slice(-1 * e.length + s);(r = c.exec(t)) != null; ) {
        if (a3 = r[1] || r[2] || r[3] || r[4] || r[5] || r[6], !a3)
          continue;
        if (o = [...a3].length, r[3] || r[4]) {
          p2 += o;
          continue;
        } else if ((r[5] || r[6]) && s % 3 && !((s + o) % 3)) {
          u2 += o;
          continue;
        }
        if (p2 -= o, p2 > 0)
          continue;
        o = Math.min(o, o + p2 + u2);
        let g2 = [...r[0]][0].length, h = e.slice(0, s + r.index + g2 + o);
        if (Math.min(s, o) % 2) {
          let f = h.slice(1, -1);
          return { type: "em", raw: h, text: f, tokens: this.lexer.inlineTokens(f) };
        }
        let R2 = h.slice(2, -2);
        return { type: "strong", raw: h, text: R2, tokens: this.lexer.inlineTokens(R2) };
      }
    }
  }
  codespan(e) {
    let t = this.rules.inline.code.exec(e);
    if (t) {
      let n = t[2].replace(this.rules.other.newLineCharGlobal, " "), r = this.rules.other.nonSpaceChar.test(n), i = this.rules.other.startingSpaceChar.test(n) && this.rules.other.endingSpaceChar.test(n);
      return r && i && (n = n.substring(1, n.length - 1)), { type: "codespan", raw: t[0], text: n };
    }
  }
  br(e) {
    let t = this.rules.inline.br.exec(e);
    if (t)
      return { type: "br", raw: t[0] };
  }
  del(e) {
    let t = this.rules.inline.del.exec(e);
    if (t)
      return { type: "del", raw: t[0], text: t[2], tokens: this.lexer.inlineTokens(t[2]) };
  }
  autolink(e) {
    let t = this.rules.inline.autolink.exec(e);
    if (t) {
      let n, r;
      return t[2] === "@" ? (n = t[1], r = "mailto:" + n) : (n = t[1], r = n), { type: "link", raw: t[0], text: n, href: r, tokens: [{ type: "text", raw: n, text: n }] };
    }
  }
  url(e) {
    let t;
    if (t = this.rules.inline.url.exec(e)) {
      let n, r;
      if (t[2] === "@")
        n = t[0], r = "mailto:" + n;
      else {
        let i;
        do
          i = t[0], t[0] = this.rules.inline._backpedal.exec(t[0])?.[0] ?? "";
        while (i !== t[0]);
        n = t[0], t[1] === "www." ? r = "http://" + t[0] : r = t[0];
      }
      return { type: "link", raw: t[0], text: n, href: r, tokens: [{ type: "text", raw: n, text: n }] };
    }
  }
  inlineText(e) {
    let t = this.rules.inline.text.exec(e);
    if (t) {
      let n = this.lexer.state.inRawBlock;
      return { type: "text", raw: t[0], text: t[0], escaped: n };
    }
  }
};
var x2 = class l2 {
  tokens;
  options;
  state;
  tokenizer;
  inlineQueue;
  constructor(e) {
    this.tokens = [], this.tokens.links = Object.create(null), this.options = e || T2, this.options.tokenizer = this.options.tokenizer || new y2, this.tokenizer = this.options.tokenizer, this.tokenizer.options = this.options, this.tokenizer.lexer = this, this.inlineQueue = [], this.state = { inLink: false, inRawBlock: false, top: true };
    let t = { other: m, block: C.normal, inline: M2.normal };
    this.options.pedantic ? (t.block = C.pedantic, t.inline = M2.pedantic) : this.options.gfm && (t.block = C.gfm, this.options.breaks ? t.inline = M2.breaks : t.inline = M2.gfm), this.tokenizer.rules = t;
  }
  static get rules() {
    return { block: C, inline: M2 };
  }
  static lex(e, t) {
    return new l2(t).lex(e);
  }
  static lexInline(e, t) {
    return new l2(t).inlineTokens(e);
  }
  lex(e) {
    e = e.replace(m.carriageReturn, `
`), this.blockTokens(e, this.tokens);
    for (let t = 0;t < this.inlineQueue.length; t++) {
      let n = this.inlineQueue[t];
      this.inlineTokens(n.src, n.tokens);
    }
    return this.inlineQueue = [], this.tokens;
  }
  blockTokens(e, t = [], n = false) {
    for (this.options.pedantic && (e = e.replace(m.tabCharGlobal, "    ").replace(m.spaceLine, ""));e; ) {
      let r;
      if (this.options.extensions?.block?.some((s) => (r = s.call({ lexer: this }, e, t)) ? (e = e.substring(r.raw.length), t.push(r), true) : false))
        continue;
      if (r = this.tokenizer.space(e)) {
        e = e.substring(r.raw.length);
        let s = t.at(-1);
        r.raw.length === 1 && s !== undefined ? s.raw += `
` : t.push(r);
        continue;
      }
      if (r = this.tokenizer.code(e)) {
        e = e.substring(r.raw.length);
        let s = t.at(-1);
        s?.type === "paragraph" || s?.type === "text" ? (s.raw += (s.raw.endsWith(`
`) ? "" : `
`) + r.raw, s.text += `
` + r.text, this.inlineQueue.at(-1).src = s.text) : t.push(r);
        continue;
      }
      if (r = this.tokenizer.fences(e)) {
        e = e.substring(r.raw.length), t.push(r);
        continue;
      }
      if (r = this.tokenizer.heading(e)) {
        e = e.substring(r.raw.length), t.push(r);
        continue;
      }
      if (r = this.tokenizer.hr(e)) {
        e = e.substring(r.raw.length), t.push(r);
        continue;
      }
      if (r = this.tokenizer.blockquote(e)) {
        e = e.substring(r.raw.length), t.push(r);
        continue;
      }
      if (r = this.tokenizer.list(e)) {
        e = e.substring(r.raw.length), t.push(r);
        continue;
      }
      if (r = this.tokenizer.html(e)) {
        e = e.substring(r.raw.length), t.push(r);
        continue;
      }
      if (r = this.tokenizer.def(e)) {
        e = e.substring(r.raw.length);
        let s = t.at(-1);
        s?.type === "paragraph" || s?.type === "text" ? (s.raw += (s.raw.endsWith(`
`) ? "" : `
`) + r.raw, s.text += `
` + r.raw, this.inlineQueue.at(-1).src = s.text) : this.tokens.links[r.tag] || (this.tokens.links[r.tag] = { href: r.href, title: r.title }, t.push(r));
        continue;
      }
      if (r = this.tokenizer.table(e)) {
        e = e.substring(r.raw.length), t.push(r);
        continue;
      }
      if (r = this.tokenizer.lheading(e)) {
        e = e.substring(r.raw.length), t.push(r);
        continue;
      }
      let i = e;
      if (this.options.extensions?.startBlock) {
        let s = 1 / 0, a3 = e.slice(1), o;
        this.options.extensions.startBlock.forEach((p2) => {
          o = p2.call({ lexer: this }, a3), typeof o == "number" && o >= 0 && (s = Math.min(s, o));
        }), s < 1 / 0 && s >= 0 && (i = e.substring(0, s + 1));
      }
      if (this.state.top && (r = this.tokenizer.paragraph(i))) {
        let s = t.at(-1);
        n && s?.type === "paragraph" ? (s.raw += (s.raw.endsWith(`
`) ? "" : `
`) + r.raw, s.text += `
` + r.text, this.inlineQueue.pop(), this.inlineQueue.at(-1).src = s.text) : t.push(r), n = i.length !== e.length, e = e.substring(r.raw.length);
        continue;
      }
      if (r = this.tokenizer.text(e)) {
        e = e.substring(r.raw.length);
        let s = t.at(-1);
        s?.type === "text" ? (s.raw += (s.raw.endsWith(`
`) ? "" : `
`) + r.raw, s.text += `
` + r.text, this.inlineQueue.pop(), this.inlineQueue.at(-1).src = s.text) : t.push(r);
        continue;
      }
      if (e) {
        let s = "Infinite loop on byte: " + e.charCodeAt(0);
        if (this.options.silent) {
          console.error(s);
          break;
        } else
          throw new Error(s);
      }
    }
    return this.state.top = true, t;
  }
  inline(e, t = []) {
    return this.inlineQueue.push({ src: e, tokens: t }), t;
  }
  inlineTokens(e, t = []) {
    let n = e, r = null;
    if (this.tokens.links) {
      let o = Object.keys(this.tokens.links);
      if (o.length > 0)
        for (;(r = this.tokenizer.rules.inline.reflinkSearch.exec(n)) != null; )
          o.includes(r[0].slice(r[0].lastIndexOf("[") + 1, -1)) && (n = n.slice(0, r.index) + "[" + "a".repeat(r[0].length - 2) + "]" + n.slice(this.tokenizer.rules.inline.reflinkSearch.lastIndex));
    }
    for (;(r = this.tokenizer.rules.inline.anyPunctuation.exec(n)) != null; )
      n = n.slice(0, r.index) + "++" + n.slice(this.tokenizer.rules.inline.anyPunctuation.lastIndex);
    let i;
    for (;(r = this.tokenizer.rules.inline.blockSkip.exec(n)) != null; )
      i = r[2] ? r[2].length : 0, n = n.slice(0, r.index + i) + "[" + "a".repeat(r[0].length - i - 2) + "]" + n.slice(this.tokenizer.rules.inline.blockSkip.lastIndex);
    n = this.options.hooks?.emStrongMask?.call({ lexer: this }, n) ?? n;
    let s = false, a3 = "";
    for (;e; ) {
      s || (a3 = ""), s = false;
      let o;
      if (this.options.extensions?.inline?.some((u2) => (o = u2.call({ lexer: this }, e, t)) ? (e = e.substring(o.raw.length), t.push(o), true) : false))
        continue;
      if (o = this.tokenizer.escape(e)) {
        e = e.substring(o.raw.length), t.push(o);
        continue;
      }
      if (o = this.tokenizer.tag(e)) {
        e = e.substring(o.raw.length), t.push(o);
        continue;
      }
      if (o = this.tokenizer.link(e)) {
        e = e.substring(o.raw.length), t.push(o);
        continue;
      }
      if (o = this.tokenizer.reflink(e, this.tokens.links)) {
        e = e.substring(o.raw.length);
        let u2 = t.at(-1);
        o.type === "text" && u2?.type === "text" ? (u2.raw += o.raw, u2.text += o.text) : t.push(o);
        continue;
      }
      if (o = this.tokenizer.emStrong(e, n, a3)) {
        e = e.substring(o.raw.length), t.push(o);
        continue;
      }
      if (o = this.tokenizer.codespan(e)) {
        e = e.substring(o.raw.length), t.push(o);
        continue;
      }
      if (o = this.tokenizer.br(e)) {
        e = e.substring(o.raw.length), t.push(o);
        continue;
      }
      if (o = this.tokenizer.del(e)) {
        e = e.substring(o.raw.length), t.push(o);
        continue;
      }
      if (o = this.tokenizer.autolink(e)) {
        e = e.substring(o.raw.length), t.push(o);
        continue;
      }
      if (!this.state.inLink && (o = this.tokenizer.url(e))) {
        e = e.substring(o.raw.length), t.push(o);
        continue;
      }
      let p2 = e;
      if (this.options.extensions?.startInline) {
        let u2 = 1 / 0, c = e.slice(1), g2;
        this.options.extensions.startInline.forEach((h) => {
          g2 = h.call({ lexer: this }, c), typeof g2 == "number" && g2 >= 0 && (u2 = Math.min(u2, g2));
        }), u2 < 1 / 0 && u2 >= 0 && (p2 = e.substring(0, u2 + 1));
      }
      if (o = this.tokenizer.inlineText(p2)) {
        e = e.substring(o.raw.length), o.raw.slice(-1) !== "_" && (a3 = o.raw.slice(-1)), s = true;
        let u2 = t.at(-1);
        u2?.type === "text" ? (u2.raw += o.raw, u2.text += o.text) : t.push(o);
        continue;
      }
      if (e) {
        let u2 = "Infinite loop on byte: " + e.charCodeAt(0);
        if (this.options.silent) {
          console.error(u2);
          break;
        } else
          throw new Error(u2);
      }
    }
    return t;
  }
};
var P2 = class {
  options;
  parser;
  constructor(e) {
    this.options = e || T2;
  }
  space(e) {
    return "";
  }
  code({ text: e, lang: t, escaped: n }) {
    let r = (t || "").match(m.notSpaceStart)?.[0], i = e.replace(m.endingNewline, "") + `
`;
    return r ? '<pre><code class="language-' + w(r) + '">' + (n ? i : w(i, true)) + `</code></pre>
` : "<pre><code>" + (n ? i : w(i, true)) + `</code></pre>
`;
  }
  blockquote({ tokens: e }) {
    return `<blockquote>
${this.parser.parse(e)}</blockquote>
`;
  }
  html({ text: e }) {
    return e;
  }
  def(e) {
    return "";
  }
  heading({ tokens: e, depth: t }) {
    return `<h${t}>${this.parser.parseInline(e)}</h${t}>
`;
  }
  hr(e) {
    return `<hr>
`;
  }
  list(e) {
    let { ordered: t, start: n } = e, r = "";
    for (let a3 = 0;a3 < e.items.length; a3++) {
      let o = e.items[a3];
      r += this.listitem(o);
    }
    let i = t ? "ol" : "ul", s = t && n !== 1 ? ' start="' + n + '"' : "";
    return "<" + i + s + `>
` + r + "</" + i + `>
`;
  }
  listitem(e) {
    let t = "";
    if (e.task) {
      let n = this.checkbox({ checked: !!e.checked });
      e.loose ? e.tokens[0]?.type === "paragraph" ? (e.tokens[0].text = n + " " + e.tokens[0].text, e.tokens[0].tokens && e.tokens[0].tokens.length > 0 && e.tokens[0].tokens[0].type === "text" && (e.tokens[0].tokens[0].text = n + " " + w(e.tokens[0].tokens[0].text), e.tokens[0].tokens[0].escaped = true)) : e.tokens.unshift({ type: "text", raw: n + " ", text: n + " ", escaped: true }) : t += n + " ";
    }
    return t += this.parser.parse(e.tokens, !!e.loose), `<li>${t}</li>
`;
  }
  checkbox({ checked: e }) {
    return "<input " + (e ? 'checked="" ' : "") + 'disabled="" type="checkbox">';
  }
  paragraph({ tokens: e }) {
    return `<p>${this.parser.parseInline(e)}</p>
`;
  }
  table(e) {
    let t = "", n = "";
    for (let i = 0;i < e.header.length; i++)
      n += this.tablecell(e.header[i]);
    t += this.tablerow({ text: n });
    let r = "";
    for (let i = 0;i < e.rows.length; i++) {
      let s = e.rows[i];
      n = "";
      for (let a3 = 0;a3 < s.length; a3++)
        n += this.tablecell(s[a3]);
      r += this.tablerow({ text: n });
    }
    return r && (r = `<tbody>${r}</tbody>`), `<table>
<thead>
` + t + `</thead>
` + r + `</table>
`;
  }
  tablerow({ text: e }) {
    return `<tr>
${e}</tr>
`;
  }
  tablecell(e) {
    let t = this.parser.parseInline(e.tokens), n = e.header ? "th" : "td";
    return (e.align ? `<${n} align="${e.align}">` : `<${n}>`) + t + `</${n}>
`;
  }
  strong({ tokens: e }) {
    return `<strong>${this.parser.parseInline(e)}</strong>`;
  }
  em({ tokens: e }) {
    return `<em>${this.parser.parseInline(e)}</em>`;
  }
  codespan({ text: e }) {
    return `<code>${w(e, true)}</code>`;
  }
  br(e) {
    return "<br>";
  }
  del({ tokens: e }) {
    return `<del>${this.parser.parseInline(e)}</del>`;
  }
  link({ href: e, title: t, tokens: n }) {
    let r = this.parser.parseInline(n), i = J2(e);
    if (i === null)
      return r;
    e = i;
    let s = '<a href="' + e + '"';
    return t && (s += ' title="' + w(t) + '"'), s += ">" + r + "</a>", s;
  }
  image({ href: e, title: t, text: n, tokens: r }) {
    r && (n = this.parser.parseInline(r, this.parser.textRenderer));
    let i = J2(e);
    if (i === null)
      return w(n);
    e = i;
    let s = `<img src="${e}" alt="${n}"`;
    return t && (s += ` title="${w(t)}"`), s += ">", s;
  }
  text(e) {
    return "tokens" in e && e.tokens ? this.parser.parseInline(e.tokens) : ("escaped" in e) && e.escaped ? e.text : w(e.text);
  }
};
var $2 = class {
  strong({ text: e }) {
    return e;
  }
  em({ text: e }) {
    return e;
  }
  codespan({ text: e }) {
    return e;
  }
  del({ text: e }) {
    return e;
  }
  html({ text: e }) {
    return e;
  }
  text({ text: e }) {
    return e;
  }
  link({ text: e }) {
    return "" + e;
  }
  image({ text: e }) {
    return "" + e;
  }
  br() {
    return "";
  }
};
var b = class l3 {
  options;
  renderer;
  textRenderer;
  constructor(e) {
    this.options = e || T2, this.options.renderer = this.options.renderer || new P2, this.renderer = this.options.renderer, this.renderer.options = this.options, this.renderer.parser = this, this.textRenderer = new $2;
  }
  static parse(e, t) {
    return new l3(t).parse(e);
  }
  static parseInline(e, t) {
    return new l3(t).parseInline(e);
  }
  parse(e, t = true) {
    let n = "";
    for (let r = 0;r < e.length; r++) {
      let i = e[r];
      if (this.options.extensions?.renderers?.[i.type]) {
        let a3 = i, o = this.options.extensions.renderers[a3.type].call({ parser: this }, a3);
        if (o !== false || !["space", "hr", "heading", "code", "table", "blockquote", "list", "html", "def", "paragraph", "text"].includes(a3.type)) {
          n += o || "";
          continue;
        }
      }
      let s = i;
      switch (s.type) {
        case "space": {
          n += this.renderer.space(s);
          continue;
        }
        case "hr": {
          n += this.renderer.hr(s);
          continue;
        }
        case "heading": {
          n += this.renderer.heading(s);
          continue;
        }
        case "code": {
          n += this.renderer.code(s);
          continue;
        }
        case "table": {
          n += this.renderer.table(s);
          continue;
        }
        case "blockquote": {
          n += this.renderer.blockquote(s);
          continue;
        }
        case "list": {
          n += this.renderer.list(s);
          continue;
        }
        case "html": {
          n += this.renderer.html(s);
          continue;
        }
        case "def": {
          n += this.renderer.def(s);
          continue;
        }
        case "paragraph": {
          n += this.renderer.paragraph(s);
          continue;
        }
        case "text": {
          let a3 = s, o = this.renderer.text(a3);
          for (;r + 1 < e.length && e[r + 1].type === "text"; )
            a3 = e[++r], o += `
` + this.renderer.text(a3);
          t ? n += this.renderer.paragraph({ type: "paragraph", raw: o, text: o, tokens: [{ type: "text", raw: o, text: o, escaped: true }] }) : n += o;
          continue;
        }
        default: {
          let a3 = 'Token with "' + s.type + '" type was not found.';
          if (this.options.silent)
            return console.error(a3), "";
          throw new Error(a3);
        }
      }
    }
    return n;
  }
  parseInline(e, t = this.renderer) {
    let n = "";
    for (let r = 0;r < e.length; r++) {
      let i = e[r];
      if (this.options.extensions?.renderers?.[i.type]) {
        let a3 = this.options.extensions.renderers[i.type].call({ parser: this }, i);
        if (a3 !== false || !["escape", "html", "link", "image", "strong", "em", "codespan", "br", "del", "text"].includes(i.type)) {
          n += a3 || "";
          continue;
        }
      }
      let s = i;
      switch (s.type) {
        case "escape": {
          n += t.text(s);
          break;
        }
        case "html": {
          n += t.html(s);
          break;
        }
        case "link": {
          n += t.link(s);
          break;
        }
        case "image": {
          n += t.image(s);
          break;
        }
        case "strong": {
          n += t.strong(s);
          break;
        }
        case "em": {
          n += t.em(s);
          break;
        }
        case "codespan": {
          n += t.codespan(s);
          break;
        }
        case "br": {
          n += t.br(s);
          break;
        }
        case "del": {
          n += t.del(s);
          break;
        }
        case "text": {
          n += t.text(s);
          break;
        }
        default: {
          let a3 = 'Token with "' + s.type + '" type was not found.';
          if (this.options.silent)
            return console.error(a3), "";
          throw new Error(a3);
        }
      }
    }
    return n;
  }
};
var S = class {
  options;
  block;
  constructor(e) {
    this.options = e || T2;
  }
  static passThroughHooks = new Set(["preprocess", "postprocess", "processAllTokens", "emStrongMask"]);
  static passThroughHooksRespectAsync = new Set(["preprocess", "postprocess", "processAllTokens"]);
  preprocess(e) {
    return e;
  }
  postprocess(e) {
    return e;
  }
  processAllTokens(e) {
    return e;
  }
  emStrongMask(e) {
    return e;
  }
  provideLexer() {
    return this.block ? x2.lex : x2.lexInline;
  }
  provideParser() {
    return this.block ? b.parse : b.parseInline;
  }
};
var B2 = class {
  defaults = L();
  options = this.setOptions;
  parse = this.parseMarkdown(true);
  parseInline = this.parseMarkdown(false);
  Parser = b;
  Renderer = P2;
  TextRenderer = $2;
  Lexer = x2;
  Tokenizer = y2;
  Hooks = S;
  constructor(...e) {
    this.use(...e);
  }
  walkTokens(e, t) {
    let n = [];
    for (let r of e)
      switch (n = n.concat(t.call(this, r)), r.type) {
        case "table": {
          let i = r;
          for (let s of i.header)
            n = n.concat(this.walkTokens(s.tokens, t));
          for (let s of i.rows)
            for (let a3 of s)
              n = n.concat(this.walkTokens(a3.tokens, t));
          break;
        }
        case "list": {
          let i = r;
          n = n.concat(this.walkTokens(i.items, t));
          break;
        }
        default: {
          let i = r;
          this.defaults.extensions?.childTokens?.[i.type] ? this.defaults.extensions.childTokens[i.type].forEach((s) => {
            let a3 = i[s].flat(1 / 0);
            n = n.concat(this.walkTokens(a3, t));
          }) : i.tokens && (n = n.concat(this.walkTokens(i.tokens, t)));
        }
      }
    return n;
  }
  use(...e) {
    let t = this.defaults.extensions || { renderers: {}, childTokens: {} };
    return e.forEach((n) => {
      let r = { ...n };
      if (r.async = this.defaults.async || r.async || false, n.extensions && (n.extensions.forEach((i) => {
        if (!i.name)
          throw new Error("extension name required");
        if ("renderer" in i) {
          let s = t.renderers[i.name];
          s ? t.renderers[i.name] = function(...a3) {
            let o = i.renderer.apply(this, a3);
            return o === false && (o = s.apply(this, a3)), o;
          } : t.renderers[i.name] = i.renderer;
        }
        if ("tokenizer" in i) {
          if (!i.level || i.level !== "block" && i.level !== "inline")
            throw new Error("extension level must be 'block' or 'inline'");
          let s = t[i.level];
          s ? s.unshift(i.tokenizer) : t[i.level] = [i.tokenizer], i.start && (i.level === "block" ? t.startBlock ? t.startBlock.push(i.start) : t.startBlock = [i.start] : i.level === "inline" && (t.startInline ? t.startInline.push(i.start) : t.startInline = [i.start]));
        }
        "childTokens" in i && i.childTokens && (t.childTokens[i.name] = i.childTokens);
      }), r.extensions = t), n.renderer) {
        let i = this.defaults.renderer || new P2(this.defaults);
        for (let s in n.renderer) {
          if (!(s in i))
            throw new Error(`renderer '${s}' does not exist`);
          if (["options", "parser"].includes(s))
            continue;
          let a3 = s, o = n.renderer[a3], p2 = i[a3];
          i[a3] = (...u2) => {
            let c = o.apply(i, u2);
            return c === false && (c = p2.apply(i, u2)), c || "";
          };
        }
        r.renderer = i;
      }
      if (n.tokenizer) {
        let i = this.defaults.tokenizer || new y2(this.defaults);
        for (let s in n.tokenizer) {
          if (!(s in i))
            throw new Error(`tokenizer '${s}' does not exist`);
          if (["options", "rules", "lexer"].includes(s))
            continue;
          let a3 = s, o = n.tokenizer[a3], p2 = i[a3];
          i[a3] = (...u2) => {
            let c = o.apply(i, u2);
            return c === false && (c = p2.apply(i, u2)), c;
          };
        }
        r.tokenizer = i;
      }
      if (n.hooks) {
        let i = this.defaults.hooks || new S;
        for (let s in n.hooks) {
          if (!(s in i))
            throw new Error(`hook '${s}' does not exist`);
          if (["options", "block"].includes(s))
            continue;
          let a3 = s, o = n.hooks[a3], p2 = i[a3];
          S.passThroughHooks.has(s) ? i[a3] = (u2) => {
            if (this.defaults.async && S.passThroughHooksRespectAsync.has(s))
              return (async () => {
                let g2 = await o.call(i, u2);
                return p2.call(i, g2);
              })();
            let c = o.call(i, u2);
            return p2.call(i, c);
          } : i[a3] = (...u2) => {
            if (this.defaults.async)
              return (async () => {
                let g2 = await o.apply(i, u2);
                return g2 === false && (g2 = await p2.apply(i, u2)), g2;
              })();
            let c = o.apply(i, u2);
            return c === false && (c = p2.apply(i, u2)), c;
          };
        }
        r.hooks = i;
      }
      if (n.walkTokens) {
        let i = this.defaults.walkTokens, s = n.walkTokens;
        r.walkTokens = function(a3) {
          let o = [];
          return o.push(s.call(this, a3)), i && (o = o.concat(i.call(this, a3))), o;
        };
      }
      this.defaults = { ...this.defaults, ...r };
    }), this;
  }
  setOptions(e) {
    return this.defaults = { ...this.defaults, ...e }, this;
  }
  lexer(e, t) {
    return x2.lex(e, t ?? this.defaults);
  }
  parser(e, t) {
    return b.parse(e, t ?? this.defaults);
  }
  parseMarkdown(e) {
    return (n, r) => {
      let i = { ...r }, s = { ...this.defaults, ...i }, a3 = this.onError(!!s.silent, !!s.async);
      if (this.defaults.async === true && i.async === false)
        return a3(new Error("marked(): The async option was set to true by an extension. Remove async: false from the parse options object to return a Promise."));
      if (typeof n > "u" || n === null)
        return a3(new Error("marked(): input parameter is undefined or null"));
      if (typeof n != "string")
        return a3(new Error("marked(): input parameter is of type " + Object.prototype.toString.call(n) + ", string expected"));
      if (s.hooks && (s.hooks.options = s, s.hooks.block = e), s.async)
        return (async () => {
          let o = s.hooks ? await s.hooks.preprocess(n) : n, u2 = await (s.hooks ? await s.hooks.provideLexer() : e ? x2.lex : x2.lexInline)(o, s), c = s.hooks ? await s.hooks.processAllTokens(u2) : u2;
          s.walkTokens && await Promise.all(this.walkTokens(c, s.walkTokens));
          let h = await (s.hooks ? await s.hooks.provideParser() : e ? b.parse : b.parseInline)(c, s);
          return s.hooks ? await s.hooks.postprocess(h) : h;
        })().catch(a3);
      try {
        s.hooks && (n = s.hooks.preprocess(n));
        let p2 = (s.hooks ? s.hooks.provideLexer() : e ? x2.lex : x2.lexInline)(n, s);
        s.hooks && (p2 = s.hooks.processAllTokens(p2)), s.walkTokens && this.walkTokens(p2, s.walkTokens);
        let c = (s.hooks ? s.hooks.provideParser() : e ? b.parse : b.parseInline)(p2, s);
        return s.hooks && (c = s.hooks.postprocess(c)), c;
      } catch (o) {
        return a3(o);
      }
    };
  }
  onError(e, t) {
    return (n) => {
      if (n.message += `
Please report this to https://github.com/markedjs/marked.`, e) {
        let r = "<p>An error occurred:</p><pre>" + w(n.message + "", true) + "</pre>";
        return t ? Promise.resolve(r) : r;
      }
      if (t)
        return Promise.reject(n);
      throw n;
    };
  }
};
var _2 = new B2;
function k(l4, e) {
  return _2.parse(l4, e);
}
k.options = k.setOptions = function(l4) {
  return _2.setOptions(l4), k.defaults = _2.defaults, G2(k.defaults), k;
};
k.getDefaults = L;
k.defaults = T2;
k.use = function(...l4) {
  return _2.use(...l4), k.defaults = _2.defaults, G2(k.defaults), k;
};
k.walkTokens = function(l4, e) {
  return _2.walkTokens(l4, e);
};
k.parseInline = _2.parseInline;
k.Parser = b;
k.parser = b.parse;
k.Renderer = P2;
k.TextRenderer = $2;
k.Lexer = x2;
k.lexer = x2.lex;
k.Tokenizer = y2;
k.Hooks = S;
k.parse = k;
var Zt = k.options;
var Gt = k.setOptions;
var Nt = k.use;
var Ft = k.walkTokens;
var jt = k.parseInline;
var Ut = b.parse;
var Kt = x2.lex;

// src/markdown-viewer.ts
function populate(basePath, source) {
  if (source == null) {
    source = "";
  } else if (typeof source !== "string") {
    source = String(source);
  }
  return source.replace(/\{\{([^}]+)\}\}/g, (original, prop) => {
    const value = u[`${basePath}${prop.startsWith("[") ? prop : "." + prop}`];
    return value === undefined ? original : populate(basePath, String(value));
  });
}

class MarkdownViewer extends F {
  static initAttributes = {
    src: "",
    elements: false
  };
  context = {};
  value = "";
  content = null;
  options = {};
  connectedCallback() {
    super.connectedCallback();
    if (this.src !== "") {
      (async () => {
        const request = await fetch(this.src);
        this.value = await request.text();
      })();
    } else if (this.value === "") {
      if (this.elements) {
        this.value = this.innerHTML;
      } else {
        this.value = this.textContent != null ? this.textContent : "";
      }
    }
  }
  didRender = () => {};
  render() {
    super.render();
    u[this.instanceId] = typeof this.context === "string" ? JSON.parse(this.context) : this.context;
    const source = populate(this.instanceId, this.value);
    if (this.elements) {
      const chunks = source.split(`
`).reduce((chunks2, line) => {
        if (line.startsWith("<") || chunks2.length === 0) {
          chunks2.push(line);
        } else {
          const lastChunk = chunks2[chunks2.length - 1];
          if (!lastChunk.startsWith("<") || !lastChunk.endsWith(">")) {
            chunks2[chunks2.length - 1] += `
` + line;
          } else {
            chunks2.push(line);
          }
        }
        return chunks2;
      }, []);
      this.innerHTML = chunks.map((chunk) => chunk.startsWith("<") && chunk.endsWith(">") ? chunk : k(chunk, this.options)).join("");
    } else {
      this.innerHTML = k(source, this.options);
    }
    this.didRender();
  }
}
var markdownViewer = MarkdownViewer.elementCreator({
  tag: "xin-md"
});

// src/tab-selector.ts
var { div: div5, slot: slot3, span: span5, button: button6 } = y;

class TabSelector extends F {
  static initAttributes = {
    localized: false
  };
  value = 0;
  makeTab(tabs, tabBody, bodyId) {
    const tabName = tabBody.getAttribute("name");
    const tabContent = tabBody.querySelector('template[role="tab"]')?.content.cloneNode(true) || (this.localized ? xinLocalized(tabName) : span5(tabName));
    const tab = div5(tabContent, {
      part: "tab",
      tabindex: 0,
      role: "tab",
      ariaControls: bodyId
    }, tabBody.hasAttribute("data-close") ? button6({
      title: "close",
      class: "close"
    }, icons.x()) : {});
    return tab;
  }
  static styleSpec = {
    ":host": {
      "--tosi-tabs-selected-color": "var(--xin-tabs-selected-color, var(--tosi-accent, currentColor))",
      "--tosi-tabs-bar-color": "var(--xin-tabs-bar-color, #ccc)",
      "--tosi-tabs-bar-height": "var(--xin-tabs-bar-height, 2px)",
      display: "flex",
      flexDirection: "column",
      position: "relative",
      overflow: "hidden",
      boxShadow: "none !important"
    },
    slot: {
      position: "relative",
      display: "block",
      flex: "1",
      overflow: "hidden",
      overflowY: "auto"
    },
    'slot[name="after-tabs"]': {
      flex: "0 0 auto"
    },
    "::slotted([hidden])": {
      display: "none !important"
    },
    ":host::part(tabpanel)": {
      display: "flex",
      flexDirection: "column",
      overflowX: "auto"
    },
    ":host::part(tabrow)": {
      display: "flex"
    },
    ":host .tabs": {
      display: "flex",
      userSelect: "none",
      whiteSpace: "nowrap"
    },
    ":host .tabs > div": {
      padding: `${Uo.spacing50} ${Uo.spacing}`,
      cursor: "default",
      display: "flex",
      alignItems: "baseline"
    },
    ':host .tabs > [aria-selected="true"]': {
      "--text-color": Uo.tosiTabsSelectedColor,
      color: Uo.textColor
    },
    ":host .elastic": {
      flex: "1"
    },
    ":host .border": {
      background: Uo.tosiTabsBarColor
    },
    ":host .border > .selected": {
      content: " ",
      width: 0,
      height: Uo.tosiTabsBarHeight,
      background: Uo.tosiTabsSelectedColor,
      transition: "ease-out 0.2s"
    },
    ":host button.close": {
      border: 0,
      background: "transparent",
      textAlign: "center",
      marginLeft: Uo.spacing50,
      padding: 0
    },
    ":host button.close > svg": {
      height: "12px"
    }
  };
  onCloseTab = null;
  content = [
    div5({ role: "tabpanel", part: "tabpanel" }, div5({ part: "tabrow" }, div5({ class: "tabs", part: "tabs" }), div5({ class: "elastic" }), slot3({ name: "after-tabs" })), div5({ class: "border" }, div5({ class: "selected", part: "selected" }))),
    slot3()
  ];
  addTabBody(body, selectTab = false) {
    if (!body.hasAttribute("name")) {
      console.error("element has no name attribute", body);
      throw new Error("element has no name attribute");
    }
    this.append(body);
    this.setupTabs();
    if (selectTab) {
      this.value = this.bodies.length - 1;
    }
    this.queueRender();
  }
  removeTabBody(body) {
    body.remove();
    this.setupTabs();
    this.queueRender();
  }
  keyTab = (event) => {
    const { tabs } = this.parts;
    const tabIndex = [...tabs.children].indexOf(event.target);
    switch (event.key) {
      case "ArrowLeft":
        this.value = (tabIndex + Number(tabs.children.length) - 1) % tabs.children.length;
        tabs.children[this.value].focus();
        event.preventDefault();
        break;
      case "ArrowRight":
        this.value = (tabIndex + 1) % tabs.children.length;
        tabs.children[this.value].focus();
        event.preventDefault();
        break;
      case " ":
        this.pickTab(event);
        event.preventDefault();
        break;
      default:
    }
  };
  get bodies() {
    return [...this.children].filter((elt) => elt.hasAttribute("name"));
  }
  pickTab = (event) => {
    const { tabs } = this.parts;
    const target = event.target;
    const isCloseEvent = target.closest("button.close") !== null;
    const tab = target.closest(".tabs > div");
    const tabIndex = [...tabs.children].indexOf(tab);
    if (isCloseEvent) {
      const body = this.bodies[tabIndex];
      if (!this.onCloseTab || this.onCloseTab(body) !== false) {
        this.removeTabBody(this.bodies[tabIndex]);
      }
    } else {
      if (tabIndex > -1) {
        this.value = tabIndex;
      }
    }
  };
  setupTabs = () => {
    const { tabs } = this.parts;
    const tabBodies = [...this.children].filter((child) => !child.hasAttribute("slot") && child.hasAttribute("name"));
    tabs.textContent = "";
    if (this.value >= tabBodies.length) {
      this.value = tabBodies.length - 1;
    }
    for (const index in tabBodies) {
      const tabBody = tabBodies[index];
      const bodyId = `${this.instanceId}-${index}`;
      tabBody.id = bodyId;
      const tab = this.makeTab(this, tabBody, bodyId);
      tabs.append(tab);
    }
  };
  connectedCallback() {
    super.connectedCallback();
    const { tabs } = this.parts;
    tabs.addEventListener("click", this.pickTab);
    tabs.addEventListener("keydown", this.keyTab);
    this.setupTabs();
    XinLocalized.allInstances.add(this);
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    XinLocalized.allInstances.delete(this);
  }
  localeChanged = () => {
    this.queueRender();
  };
  onResize() {
    this.queueRender();
  }
  render() {
    const { tabs, selected } = this.parts;
    const tabBodies = this.bodies;
    for (let i = 0;i < tabBodies.length; i++) {
      const tabBody = tabBodies[i];
      const tab = tabs.children[i];
      if (this.value === Number(i)) {
        tab.setAttribute("aria-selected", "true");
        selected.style.marginLeft = `${tab.offsetLeft - tabs.offsetLeft}px`;
        selected.style.width = `${tab.offsetWidth}px`;
        tabBody.toggleAttribute("hidden", false);
      } else {
        tab.toggleAttribute("aria-selected", false);
        tabBody.toggleAttribute("hidden", true);
      }
    }
  }
}
var tabSelector = TabSelector.elementCreator({
  tag: "xin-tabs"
});

// src/live-example/code-transform.ts
var sucraseSrc = () => "https://cdn.jsdelivr.net/npm/sucrase@3.35.0/+esm";
var AsyncFunction = (async () => {}).constructor;
function rewriteImports(code, contextKeys) {
  let result = code;
  for (const moduleName of contextKeys) {
    result = result.replace(new RegExp(`import \\{(.*)\\} from '${moduleName}'`, "g"), `const {$1} = ${moduleName.replace(/-/g, "")}`);
  }
  return result;
}
async function executeCode(code, context, transform) {
  const rewrittenCode = rewriteImports(code, Object.keys(context));
  const transformedCode = transform(rewrittenCode, {
    transforms: ["typescript"]
  }).code;
  const contextKeys = Object.keys(context).map((key) => key.replace(/-/g, ""));
  const contextValues = Object.values(context);
  const func = new AsyncFunction(...contextKeys, transformedCode);
  await func(...contextValues);
}
async function loadTransform() {
  const { transform } = await import(sucraseSrc());
  return transform;
}

// src/live-example/remote-sync.ts
var STORAGE_KEY = "live-example-payload";
function createRemoteKey(prefix, uuid, remoteId) {
  return remoteId !== "" ? `${prefix}-${remoteId}` : `${prefix}-${uuid}`;
}
function sendPayload(storageKey, payload) {
  localStorage.setItem(storageKey, JSON.stringify(payload));
}
function parsePayload(data) {
  if (data === null)
    return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}
function openEditorWindow(prefix, uuid, storageKey, remoteKey, code) {
  const href = location.href.split("?")[0] + `?${prefix}=${uuid}`;
  sendPayload(storageKey, {
    remoteKey,
    sentAt: Date.now(),
    ...code
  });
  window.open(href);
}
function sendCloseSignal(storageKey, remoteKey) {
  sendPayload(storageKey, {
    remoteKey,
    sentAt: Date.now(),
    css: "",
    html: "",
    js: "",
    close: true
  });
}

class RemoteSyncManager {
  storageKey;
  remoteKey;
  lastUpdate = 0;
  interval;
  onReceive;
  constructor(storageKey, remoteKey, onReceive) {
    this.storageKey = storageKey;
    this.remoteKey = remoteKey;
    this.onReceive = onReceive;
  }
  handleChange = (event) => {
    if (event instanceof StorageEvent && event.key !== this.storageKey) {
      return;
    }
    const payload = parsePayload(localStorage.getItem(this.storageKey));
    if (!payload)
      return;
    if (payload.sentAt <= this.lastUpdate)
      return;
    if (payload.remoteKey !== this.remoteKey)
      return;
    this.lastUpdate = payload.sentAt;
    this.onReceive(payload);
  };
  startListening() {
    addEventListener("storage", this.handleChange);
    this.interval = setInterval(this.handleChange, 500);
  }
  stopListening() {
    removeEventListener("storage", this.handleChange);
    if (this.interval) {
      clearInterval(this.interval);
    }
  }
  send(code) {
    sendPayload(this.storageKey, {
      remoteKey: this.remoteKey,
      sentAt: Date.now(),
      ...code
    });
  }
  sendClose() {
    sendCloseSignal(this.storageKey, this.remoteKey);
  }
}

// src/live-example/execution.ts
var { div: div6 } = y;
function registerComponentsInIframe(iframeWindow, context) {
  const iframeCustomElements = iframeWindow.customElements;
  if (!iframeCustomElements)
    return;
  const tosijsui = context["tosijs-ui"];
  if (!tosijsui)
    return;
  for (const [, creator] of Object.entries(tosijsui)) {
    if (typeof creator === "function" && "tagName" in creator) {
      const tagName = creator.tagName;
      if (tagName && !iframeCustomElements.get(tagName)) {
        const ComponentClass = customElements.get(tagName);
        if (ComponentClass) {
          try {
            iframeCustomElements.define(tagName, ComponentClass);
          } catch {}
        }
      }
    }
  }
}
async function executeInline(options) {
  const {
    html,
    css,
    js,
    context,
    transform,
    exampleElement,
    styleElement,
    widgetsElement,
    onError
  } = options;
  const preview = div6({ class: "preview" });
  preview.innerHTML = html;
  styleElement.innerText = css;
  const oldPreview = exampleElement.querySelector(".preview");
  if (oldPreview) {
    oldPreview.replaceWith(preview);
  } else {
    exampleElement.insertBefore(preview, widgetsElement);
  }
  const fullContext = { preview, ...context };
  try {
    const code = rewriteImports(js, Object.keys(context));
    const transformedCode = transform(code, { transforms: ["typescript"] }).code;
    const contextKeys = Object.keys(fullContext).map((key) => key.replace(/-/g, ""));
    const contextValues = Object.values(fullContext);
    const func = new AsyncFunction(...contextKeys, transformedCode);
    await func(...contextValues);
  } catch (e) {
    console.error(e);
    if (onError)
      onError(e);
    else
      window.alert(`Error: ${e}, the console may have more information…`);
  }
  return preview;
}
async function executeInIframe(options) {
  const { html, css, js, context, transform, exampleElement, widgetsElement, onError } = options;
  let iframe = exampleElement.querySelector("iframe.preview-iframe");
  if (!iframe) {
    iframe = document.createElement("iframe");
    iframe.className = "preview-iframe";
    iframe.style.cssText = "width: 100%; height: 100%; border: none;";
    const oldPreview = exampleElement.querySelector(".preview");
    if (oldPreview) {
      oldPreview.replaceWith(iframe);
    } else {
      exampleElement.insertBefore(iframe, widgetsElement);
    }
  }
  const iframeDoc = iframe.contentDocument;
  if (!iframeDoc) {
    console.error("Could not access iframe document");
    return null;
  }
  const iframeWindow = iframe.contentWindow;
  if (context["tosijs"]) {
    iframeWindow.tosijs = context["tosijs"];
  }
  if (context["tosijs-ui"]) {
    iframeWindow.tosijsui = context["tosijs-ui"];
  }
  iframeDoc.open();
  iframeDoc.write(`<!DOCTYPE html>
<html>
<head>
  <style>
    body { margin: 0; }
    .preview { height: 100%; position: relative; }
    ${css}
  </style>
</head>
<body>
  <div class="preview">${html}</div>
</body>
</html>`);
  iframeDoc.close();
  registerComponentsInIframe(iframeWindow, context);
  const preview = iframeDoc.querySelector(".preview");
  if (!preview) {
    console.error("Could not find preview element in iframe");
    return null;
  }
  const fullContext = { preview, ...context };
  try {
    const code = rewriteImports(js, Object.keys(context));
    const transformedCode = transform(code, { transforms: ["typescript"] }).code;
    const IframeAsyncFunction = iframeWindow.eval("(async () => {}).constructor");
    const contextKeys = Object.keys(fullContext).map((key) => key.replace(/-/g, ""));
    const contextValues = Object.values(fullContext);
    const func = new IframeAsyncFunction(...contextKeys, transformedCode);
    await func(...contextValues);
  } catch (e) {
    console.error(e);
    if (onError)
      onError(e);
    else
      window.alert(`Error: ${e}, the console may have more information…`);
  }
  return preview;
}

// src/live-example/insert-examples.ts
function insertExamples(element, context, liveExampleCreator, liveExampleTagName) {
  const sources = [
    ...element.querySelectorAll(".language-html,.language-js,.language-css,.language-test")
  ].filter((el) => !el.closest(liveExampleTagName)).map((code) => ({
    block: code.parentElement,
    language: code.classList[0].split("-").pop(),
    code: code.innerText
  }));
  for (let index = 0;index < sources.length; index += 1) {
    const exampleSources = [sources[index]];
    while (index < sources.length - 1 && sources[index].block.nextElementSibling === sources[index + 1].block) {
      exampleSources.push(sources[index + 1]);
      index += 1;
    }
    const example = liveExampleCreator({ context });
    const parent = exampleSources[0].block.parentElement;
    parent.insertBefore(example, exampleSources[0].block);
    exampleSources.forEach((source) => {
      switch (source.language) {
        case "js":
          example.js = source.code;
          break;
        case "html":
          example.html = source.code;
          break;
        case "css":
          example.css = source.code;
          break;
        case "test":
          example.test = source.code;
          break;
      }
      source.block.remove();
    });
    example.showDefaultTab();
  }
}

// src/live-example/styles.ts
var liveExampleStyleSpec = {
  ":host": {
    "--xin-example-height": "320px",
    "--code-editors-bar-bg": "#777",
    "--code-editors-bar-color": "#fff",
    "--widget-bg": "#fff8",
    "--widget-color": "#000",
    position: "relative",
    display: "flex",
    height: "var(--xin-example-height)",
    background: "var(--background)",
    boxSizing: "border-box"
  },
  ":host.-maximize": {
    position: "fixed",
    left: "0",
    top: "0",
    height: "100vh",
    width: "100vw",
    margin: "0 !important"
  },
  ".-maximize": {
    zIndex: 101
  },
  ":host.-vertical": {
    flexDirection: "column"
  },
  ":host .layout-indicator": {
    transition: "0.5s ease-out",
    transform: "rotateZ(270deg)"
  },
  ":host.-vertical .layout-indicator": {
    transform: "rotateZ(180deg)"
  },
  ":host.-maximize .hide-if-maximized, :host:not(.-maximize) .show-if-maximized": {
    display: "none"
  },
  ':host [part="example"]': {
    flex: "1 1 50%",
    height: "100%",
    position: "relative",
    overflowX: "auto"
  },
  ":host .preview": {
    height: "100%",
    position: "relative",
    overflow: "hidden",
    boxShadow: "inset 0 0 0 2px #8883"
  },
  ':host [part="editors"]': {
    flex: "1 1 200px",
    height: "100%",
    position: "relative"
  },
  ':host [part="exampleWidgets"]': {
    position: "absolute",
    left: "5px",
    bottom: "5px",
    "--widget-color": "var(--brand-color)",
    borderRadius: "5px",
    width: "44px",
    height: "44px",
    lineHeight: "44px",
    zIndex: "100"
  },
  ':host [part="exampleWidgets"] svg': {
    stroke: "var(--widget-color)"
  },
  ":host .code-editors": {
    overflow: "hidden",
    background: "white",
    position: "relative",
    top: "0",
    right: "0",
    flex: "1 1 50%",
    height: "100%",
    flexDirection: "column",
    zIndex: "10"
  },
  ":host .code-editors:not([hidden])": {
    display: "flex"
  },
  ":host .code-editors > h4": {
    padding: "5px",
    margin: "0",
    textAlign: "center",
    background: "var(--code-editors-bar-bg)",
    color: "var(--code-editors-bar-color)",
    cursor: "move"
  },
  ":host button.transparent, :host .sizer": {
    width: "32px",
    height: "32px",
    lineHeight: "32px",
    textAlign: "center",
    padding: "0",
    margin: "0"
  },
  ":host .sizer": {
    cursor: "nwse-resize"
  },
  ':host.-test-failed [part="example"]': {
    boxShadow: "0 0 10px 2px rgba(255, 0, 0, 0.5)"
  },
  ':host.-test-passed [part="exampleWidgets"]': {
    "--widget-color": "#0a0"
  },
  ':host.-test-failed [part="exampleWidgets"]': {
    "--widget-color": "#f00"
  },
  ':host [part="testResults"]': {
    position: "absolute",
    bottom: "54px",
    left: "5px",
    background: "var(--widget-bg)",
    borderRadius: "5px",
    padding: "8px",
    fontSize: "12px",
    maxWidth: "300px",
    maxHeight: "200px",
    overflow: "auto",
    zIndex: "100"
  },
  ':host [part="testResults"][hidden]': {
    display: "none"
  },
  ":host .test-pass": {
    color: "#0a0"
  },
  ":host .test-fail": {
    color: "#f00"
  }
};

// src/live-example/test-harness.ts
class AssertionError extends Error {
  constructor(message) {
    super(message);
    this.name = "AssertionError";
  }
}
function deepEqual(a3, b2) {
  if (a3 === b2)
    return true;
  if (typeof a3 !== typeof b2)
    return false;
  if (a3 === null || b2 === null)
    return a3 === b2;
  if (typeof a3 !== "object")
    return false;
  const aObj = a3;
  const bObj = b2;
  if (Array.isArray(aObj) !== Array.isArray(bObj))
    return false;
  const aKeys = Object.keys(aObj);
  const bKeys = Object.keys(bObj);
  if (aKeys.length !== bKeys.length)
    return false;
  return aKeys.every((key) => deepEqual(aObj[key], bObj[key]));
}
function createMatchers(value, negated = false) {
  const assert = (condition, message) => {
    const result = negated ? !condition : condition;
    if (!result) {
      throw new AssertionError(negated ? `not: ${message}` : message);
    }
  };
  const matchers = {
    toBe(expected) {
      assert(value === expected, `Expected ${JSON.stringify(value)} to be ${JSON.stringify(expected)}`);
    },
    toEqual(expected) {
      assert(deepEqual(value, expected), `Expected ${JSON.stringify(value)} to equal ${JSON.stringify(expected)}`);
    },
    toBeTruthy() {
      assert(!!value, `Expected ${JSON.stringify(value)} to be truthy`);
    },
    toBeFalsy() {
      assert(!value, `Expected ${JSON.stringify(value)} to be falsy`);
    },
    toBeNull() {
      assert(value === null, `Expected ${JSON.stringify(value)} to be null`);
    },
    toBeUndefined() {
      assert(value === undefined, `Expected ${JSON.stringify(value)} to be undefined`);
    },
    toBeDefined() {
      assert(value !== undefined, `Expected ${JSON.stringify(value)} to be defined`);
    },
    toContain(item) {
      if (typeof value === "string") {
        assert(value.includes(item), `Expected "${value}" to contain "${item}"`);
      } else if (Array.isArray(value)) {
        assert(value.includes(item), `Expected array to contain ${JSON.stringify(item)}`);
      } else {
        throw new AssertionError("toContain requires string or array");
      }
    },
    toHaveLength(length) {
      const actual = value.length;
      assert(actual === length, `Expected length ${actual} to be ${length}`);
    },
    toMatch(pattern) {
      assert(pattern.test(value), `Expected "${value}" to match ${pattern}`);
    },
    toBeGreaterThan(n) {
      assert(value > n, `Expected ${value} to be greater than ${n}`);
    },
    toBeLessThan(n) {
      assert(value < n, `Expected ${value} to be less than ${n}`);
    },
    toBeInstanceOf(cls) {
      assert(value instanceof cls, `Expected value to be instance of ${cls.name}`);
    },
    get not() {
      return createMatchers(value, !negated);
    }
  };
  return matchers;
}
function expect(value) {
  return createMatchers(value);
}
function createTestContext(results) {
  let currentDescribe = "";
  return {
    expect,
    test(name, fn2) {
      const fullName = currentDescribe ? `${currentDescribe} > ${name}` : name;
      try {
        const result = fn2();
        if (result instanceof Promise) {
          result.then(() => {
            results.push({ name: fullName, passed: true });
          }).catch((err) => {
            results.push({
              name: fullName,
              passed: false,
              error: err.message
            });
          });
        } else {
          results.push({ name: fullName, passed: true });
        }
      } catch (err) {
        results.push({
          name: fullName,
          passed: false,
          error: err.message
        });
      }
    },
    describe(name, fn2) {
      const previousDescribe = currentDescribe;
      currentDescribe = currentDescribe ? `${currentDescribe} > ${name}` : name;
      fn2();
      currentDescribe = previousDescribe;
    }
  };
}
async function runTests(testCode, preview, context, transform) {
  const results = [];
  const testContext = createTestContext(results);
  const fullContext = {
    preview,
    ...context,
    expect: testContext.expect,
    test: testContext.test,
    describe: testContext.describe
  };
  try {
    const code = rewriteImports(testCode, Object.keys(context));
    const transformedCode = transform(code, { transforms: ["typescript"] }).code;
    const contextKeys = Object.keys(fullContext).map((key) => key.replace(/-/g, ""));
    const contextValues = Object.values(fullContext);
    const func = new AsyncFunction(...contextKeys, transformedCode);
    await func(...contextValues);
  } catch (err) {
    results.push({
      name: "Test execution",
      passed: false,
      error: err.message
    });
  }
  await new Promise((resolve) => setTimeout(resolve, 0));
  return {
    passed: results.filter((r) => r.passed).length,
    failed: results.filter((r) => !r.passed).length,
    tests: results
  };
}

// src/live-example/component.ts
var { div: div7, xinSlot: xinSlot3, style, button: button7, pre, span: span6 } = y;

class LiveExample extends F {
  static initAttributes = {
    persistToDom: false,
    prettier: false,
    iframe: false
  };
  prefix = "lx";
  storageKey = STORAGE_KEY;
  context = {};
  uuid = crypto.randomUUID();
  remoteId = "";
  remoteSync;
  undoInterval;
  testResults;
  static insertExamples(element, context = {}) {
    insertExamples(element, context, liveExample, LiveExample.tagName);
  }
  get activeTab() {
    const { editors } = this.parts;
    return [...editors.children].find((elt) => elt.getAttribute("hidden") === null);
  }
  getEditorValue(which) {
    return this.parts[which].value;
  }
  setEditorValue(which, code) {
    const codeEditor2 = this.parts[which];
    codeEditor2.value = code;
  }
  get css() {
    return this.getEditorValue("css");
  }
  set css(code) {
    this.setEditorValue("css", code);
  }
  get html() {
    return this.getEditorValue("html");
  }
  set html(code) {
    this.setEditorValue("html", code);
  }
  get js() {
    return this.getEditorValue("js");
  }
  set js(code) {
    this.setEditorValue("js", code);
  }
  get test() {
    return this.getEditorValue("test");
  }
  set test(code) {
    this.setEditorValue("test", code);
  }
  get remoteKey() {
    return createRemoteKey(this.prefix, this.uuid, this.remoteId);
  }
  updateUndo = () => {
    const { activeTab } = this;
    const { undo, redo } = this.parts;
    if (activeTab instanceof CodeEditor && activeTab.editor !== undefined) {
      const undoManager = activeTab.editor.session.getUndoManager();
      undo.disabled = !undoManager.hasUndo();
      redo.disabled = !undoManager.hasRedo();
    } else {
      undo.disabled = true;
      redo.disabled = true;
    }
  };
  undo = () => {
    const { activeTab } = this;
    if (activeTab instanceof CodeEditor) {
      activeTab.editor.undo();
    }
  };
  redo = () => {
    const { activeTab } = this;
    if (activeTab instanceof CodeEditor) {
      activeTab.editor.redo();
    }
  };
  get isMaximized() {
    return this.classList.contains("-maximize");
  }
  flipLayout = () => {
    this.classList.toggle("-vertical");
  };
  exampleMenu = () => {
    popMenu({
      target: this.parts.exampleWidgets,
      width: "auto",
      menuItems: [
        {
          icon: "edit2",
          caption: "view/edit code",
          action: this.showCode
        },
        {
          icon: "edit",
          caption: "view/edit code in a new window",
          action: this.openEditorWindow
        },
        null,
        {
          icon: this.isMaximized ? "minimize" : "maximize",
          caption: this.isMaximized ? "restore preview" : "maximize preview",
          action: this.toggleMaximize
        }
      ]
    });
  };
  handleShortcuts = (event) => {
    if (event.metaKey || event.ctrlKey) {
      let block = false;
      switch (event.key) {
        case "s":
        case "r":
          this.refresh();
          block = true;
          break;
        case "/":
          this.flipLayout();
          break;
        case "c":
          if (event.shiftKey) {
            this.copy();
            block = true;
          }
          break;
      }
      if (block) {
        event.preventDefault();
        event.stopPropagation();
      }
    }
  };
  content = () => [
    div7({ part: "example" }, style({ part: "style" }), div7({ part: "testResults", hidden: true }), button7({
      title: "example menu",
      part: "exampleWidgets",
      onClick: this.exampleMenu
    }, icons.code())),
    div7({
      class: "code-editors",
      part: "codeEditors",
      onKeydown: this.handleShortcuts,
      hidden: true
    }, tabSelector({
      part: "editors",
      onChange: this.updateUndo
    }, codeEditor({ name: "js", mode: "javascript", part: "js" }), codeEditor({ name: "html", mode: "html", part: "html" }), codeEditor({ name: "css", mode: "css", part: "css" }), codeEditor({ name: "test", mode: "javascript", part: "test" }), div7({ slot: "after-tabs", class: "row" }, button7({
      title: "undo",
      part: "undo",
      class: "transparent",
      onClick: this.undo
    }, icons.cornerUpLeft()), button7({
      title: "redo",
      part: "redo",
      class: "transparent",
      onClick: this.redo
    }, icons.cornerUpRight()), button7({
      title: "flip direction (⌘/ | ^/)",
      class: "transparent",
      onClick: this.flipLayout
    }, icons.columns({ class: "layout-indicator" })), button7({
      title: "copy as markdown (⌘⇧C | ^⇧C)",
      class: "transparent",
      onClick: this.copy
    }, icons.copy()), button7({
      title: "reload (⌘R | ^R)",
      class: "transparent",
      onClick: this.refreshRemote
    }, icons.refreshCw()), button7({
      title: "close code",
      class: "transparent",
      onClick: this.closeCode
    }, icons.x())))),
    xinSlot3({ part: "sources", hidden: true })
  ];
  connectedCallback() {
    super.connectedCallback();
    const { sources } = this.parts;
    this.initFromElements([...sources.children]);
    this.remoteSync = new RemoteSyncManager(this.storageKey, this.remoteKey, (payload) => {
      if (payload.close) {
        window.close();
        return;
      }
      this.css = payload.css;
      this.html = payload.html;
      this.js = payload.js;
      if (payload.test)
        this.test = payload.test;
      this.refresh();
    });
    this.remoteSync.startListening();
    this.undoInterval = setInterval(this.updateUndo, 250);
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    this.remoteSync?.sendClose();
    this.remoteSync?.stopListening();
    if (this.undoInterval) {
      clearInterval(this.undoInterval);
    }
  }
  copy = () => {
    const js = this.js !== "" ? "```js\n" + this.js.trim() + "\n```\n" : "";
    const html = this.html !== "" ? "```html\n" + this.html.trim() + "\n```\n" : "";
    const css = this.css !== "" ? "```css\n" + this.css.trim() + "\n```\n" : "";
    const test = this.test !== "" ? "```test\n" + this.test.trim() + "\n```\n" : "";
    navigator.clipboard.writeText(js + html + css + test);
  };
  toggleMaximize = () => {
    this.classList.toggle("-maximize");
  };
  showCode = () => {
    this.classList.add("-maximize");
    this.classList.toggle("-vertical", this.offsetHeight > this.offsetWidth);
    this.parts.codeEditors.hidden = false;
  };
  closeCode = () => {
    if (this.remoteId !== "") {
      window.close();
    } else {
      this.classList.remove("-maximize");
      this.parts.codeEditors.hidden = true;
    }
  };
  openEditorWindow = () => {
    const { css, html, js, test } = this;
    openEditorWindow(this.prefix, this.uuid, this.storageKey, this.remoteKey, { css, html, js, test });
  };
  refreshRemote = () => {
    this.remoteSync?.send({
      css: this.css,
      html: this.html,
      js: this.js,
      test: this.test
    });
  };
  updateSources = () => {
    if (this.persistToDom) {
      const { sources } = this.parts;
      sources.innerText = "";
      for (const language of ["js", "css", "html", "test"]) {
        if (this[language]) {
          sources.append(pre({
            class: `language-${language}`,
            innerHTML: this[language]
          }));
        }
      }
    }
  };
  refresh = async () => {
    if (this.remoteId !== "")
      return;
    const transform = await loadTransform();
    const { example, style: styleEl, exampleWidgets } = this.parts;
    let preview;
    if (this.iframe) {
      preview = await executeInIframe({
        html: this.html,
        css: this.css,
        js: this.js,
        context: this.context,
        transform,
        exampleElement: example,
        widgetsElement: exampleWidgets
      });
    } else {
      preview = await executeInline({
        html: this.html,
        css: this.css,
        js: this.js,
        context: this.context,
        transform,
        exampleElement: example,
        styleElement: styleEl,
        widgetsElement: exampleWidgets
      });
    }
    if (this.persistToDom) {
      this.updateSources();
    }
    if (this.test && preview) {
      this.testResults = await runTests(this.test, preview, this.context, transform);
      this.displayTestResults();
    }
  };
  displayTestResults() {
    const { testResults: resultsEl } = this.parts;
    const results = this.testResults;
    if (!results || results.tests.length === 0) {
      resultsEl.hidden = true;
      this.classList.remove("-test-passed", "-test-failed");
      return;
    }
    resultsEl.hidden = false;
    resultsEl.innerHTML = "";
    const summary = div7({ style: { marginBottom: "8px", fontWeight: "bold" } }, `${results.passed}/${results.tests.length} tests passed`);
    resultsEl.append(summary);
    for (const test of results.tests) {
      const icon = test.passed ? "✓" : "✗";
      const cls = test.passed ? "test-pass" : "test-fail";
      const testEl = div7({ class: cls }, span6(icon + " "), test.name, test.error ? span6({ style: { opacity: "0.7" } }, ` - ${test.error}`) : "");
      resultsEl.append(testEl);
    }
    this.classList.toggle("-test-passed", results.failed === 0);
    this.classList.toggle("-test-failed", results.failed > 0);
  }
  initFromElements(elements) {
    for (const element of elements) {
      element.hidden = true;
      const [mode, ...lines] = element.innerHTML.split(`
`);
      if (["js", "html", "css", "test"].includes(mode)) {
        const minIndex = lines.filter((line) => line.trim() !== "").map((line) => line.match(/^\s*/)[0].length).sort()[0];
        const source = (minIndex > 0 ? lines.map((line) => line.substring(minIndex)) : lines).join(`
`);
        this.parts[mode].value = source;
      } else {
        const language = ["js", "html", "css", "test"].find((lang) => element.matches(`.language-${lang}`));
        if (language) {
          this.parts[language].value = language === "html" ? element.innerHTML : element.innerText;
        }
      }
    }
  }
  showDefaultTab() {
    const { editors } = this.parts;
    if (this.js !== "") {
      editors.value = 0;
    } else if (this.html !== "") {
      editors.value = 1;
    } else if (this.css !== "") {
      editors.value = 2;
    } else if (this.test !== "") {
      editors.value = 3;
    }
  }
  render() {
    super.render();
    if (this.remoteId !== "") {
      const data = localStorage.getItem(this.storageKey);
      if (data !== null) {
        const payload = JSON.parse(data);
        if (this.remoteKey !== payload.remoteKey)
          return;
        this.css = payload.css;
        this.html = payload.html;
        this.js = payload.js;
        if (payload.test)
          this.test = payload.test;
        this.parts.example.hidden = true;
        this.parts.codeEditors.hidden = false;
        this.classList.add("-maximize");
        this.updateUndo();
      }
    } else {
      this.refresh();
    }
  }
}
var liveExample = LiveExample.elementCreator({
  tag: "xin-example",
  styleSpec: liveExampleStyleSpec
});
var params = new URL(window.location.href).searchParams;
var remoteId = params.get("lx");
if (remoteId) {
  document.title += " [code editor]";
  document.body.textContent = "";
  document.body.append(liveExample({ remoteId }));
}
// src/side-nav.ts
var { slot: slot4 } = y;

class SideNav extends F {
  static initAttributes = {
    minSize: 800,
    navSize: 200,
    compact: false,
    contentVisible: false
  };
  value = "normal";
  content = [slot4({ name: "nav", part: "nav" }), slot4({ part: "content" })];
  static styleSpec = {
    ":host": {
      display: "grid",
      gridTemplateColumns: `${uo.navWidth("50%")} ${uo.contentWidth("50%")}`,
      gridTemplateRows: "100%",
      position: "relative",
      margin: uo.margin("0 0 0 -100%"),
      transition: uo.sideNavTransition("0.25s ease-out")
    },
    ":host slot": {
      position: "relative"
    },
    ":host slot:not([name])": {
      display: "block"
    },
    ':host slot[name="nav"]': {
      display: "block"
    }
  };
  onResize = () => {
    const { content } = this.parts;
    const parent = this.offsetParent;
    if (parent === null) {
      return;
    }
    let navState = this.value;
    this.compact = parent.offsetWidth < this.minSize;
    const empty = [...this.childNodes].find((node) => node instanceof Element ? node.getAttribute("slot") !== "nav" : true) === undefined;
    if (empty) {
      navState = "compact/nav";
      this.style.setProperty("--nav-width", "100%");
      this.style.setProperty("--content-width", "0%");
    } else if (!this.compact) {
      navState = "normal";
      content.classList.add("-xin-sidenav-visible");
      this.style.setProperty("--nav-width", `${this.navSize}px`);
      this.style.setProperty("--content-width", `calc(100% - ${this.navSize}px)`);
      this.style.setProperty("--margin", "0");
    } else {
      content.classList.remove("-xin-sidenav-visible");
      this.style.setProperty("--nav-width", "50%");
      this.style.setProperty("--content-width", "50%");
      if (this.contentVisible) {
        navState = "compact/content";
        this.style.setProperty("--margin", "0 0 0 -100%");
      } else {
        navState = "compact/nav";
        this.style.setProperty("--margin", "0 -100% 0 0");
      }
    }
    if (this.value !== navState) {
      this.value = navState;
    }
  };
  observer;
  connectedCallback() {
    super.connectedCallback();
    this.contentVisible = this.parts.content.childNodes.length === 0;
    globalThis.addEventListener("resize", this.onResize);
    this.observer = new MutationObserver(this.onResize);
    this.observer.observe(this, { childList: true });
    this.style.setProperty("--side-nav-transition", "0s");
    setTimeout(() => {
      this.style.removeProperty("--side-nav-transition");
    }, 250);
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    this.observer.disconnect();
  }
  render() {
    super.render();
    this.onResize();
  }
}
var sideNav = SideNav.elementCreator({
  tag: "xin-sidenav"
});

// src/doc-browser.ts
var { div: div8, span: span7, a: a3, header: header2, button: button8, template: template2, input: input4, h2 } = y;
function createDocBrowser(options) {
  const {
    docs,
    context = {},
    projectName = "",
    projectLinks = {},
    navSize = 200,
    minSize = 600
  } = options;
  const docName = document.location.search !== "" ? document.location.search.substring(1).split("&")[0] : docs[0]?.filename || "README.md";
  const currentDoc = docs.find((doc) => doc.filename === docName) || docs[0];
  const { app } = Co({
    app: {
      docs,
      currentDoc,
      compact: false
    }
  });
  lo.docLink = {
    toDOM(elt, filename) {
      elt.setAttribute("href", `?${filename}`);
    }
  };
  lo.current = {
    toDOM(elt, currentFile) {
      const boundFile = elt.getAttribute("href") || "";
      elt.classList.toggle("current", currentFile === boundFile.substring(1));
    }
  };
  const filterDocs = Wo(() => {
    const needle = searchField.value.toLocaleLowerCase();
    app.docs.forEach((doc) => {
      doc.hidden = !doc.title.toLocaleLowerCase().includes(needle) && !doc.text.toLocaleLowerCase().includes(needle);
    });
    I(app.docs);
  });
  const searchField = input4({
    slot: "nav",
    placeholder: "search",
    type: "search",
    style: {
      width: "calc(100% - 10px)",
      margin: "5px"
    },
    onInput: filterDocs
  });
  window.addEventListener("popstate", () => {
    const filename = window.location.search.substring(1);
    app.currentDoc = app.docs.find((doc) => doc.filename === filename) || app.docs[0];
  });
  const headerContent = [
    button8({
      class: "iconic",
      style: { color: Uo.linkColor },
      title: "navigation",
      bind: {
        value: app.compact,
        binding: {
          toDOM(element, compact) {
            element.style.display = compact ? "" : "none";
            element.nextSibling.style.display = compact ? "" : "none";
          }
        }
      },
      onClick() {
        const nav = document.querySelector(SideNav.tagName);
        nav.contentVisible = !nav.contentVisible;
      }
    }, icons.menu()),
    span7({ style: { flex: "0 0 10px" } })
  ];
  if (projectName) {
    headerContent.push(a3({
      href: "/",
      style: {
        display: "flex",
        alignItems: "center",
        borderBottom: "none"
      }
    }, projectLinks.tosijs ? icons.tosiUi({
      style: { _xinIconSize: 40, marginRight: 10 }
    }) : span7(), h2(projectName)));
  }
  headerContent.push(span7({ class: "elastic" }));
  if (projectLinks.tosijs) {
    headerContent.push(a3({ class: "iconic", title: "tosijs", target: "_blank" }, icons.tosi(), {
      href: projectLinks.tosijs
    }));
  }
  if (projectLinks.discord) {
    headerContent.push(a3({ class: "iconic", title: "discord", target: "_blank" }, icons.discord(), { href: projectLinks.discord }));
  }
  if (projectLinks.blog) {
    headerContent.push(a3({ class: "iconic", title: "blog", target: "_blank" }, icons.blog(), {
      href: projectLinks.blog
    }));
  }
  if (projectLinks.github) {
    headerContent.push(a3({ class: "iconic", title: "github", target: "_blank" }, icons.github(), { href: projectLinks.github }));
  }
  if (projectLinks.npm) {
    headerContent.push(a3({ class: "iconic", title: "npmjs", target: "_blank" }, icons.npm(), {
      href: projectLinks.npm
    }));
  }
  const container = div8({
    style: {
      display: "flex",
      flexDirection: "column",
      maxWidth: "100vw",
      height: "100vh",
      overflow: "hidden"
    }
  }, header2(...headerContent), sideNav({
    name: "Documentation",
    navSize,
    minSize,
    style: {
      flex: "1 1 auto",
      overflow: "hidden"
    },
    onChange() {
      const nav = document.querySelector(SideNav.tagName);
      app.compact = nav.compact;
    }
  }, searchField, div8({
    slot: "nav",
    style: {
      display: "flex",
      flexDirection: "column",
      width: "100%",
      height: "calc(100% - 44px)",
      overflowY: "scroll"
    },
    bindList: {
      hiddenProp: "hidden",
      value: app.docs
    }
  }, template2(a3({
    class: "doc-link",
    bindCurrent: "app.currentDoc.filename",
    bindDocLink: "^.filename",
    onClick(event) {
      const a4 = event.target;
      const doc = vo(event.target);
      const nav = event.target.closest("xin-sidenav");
      nav.contentVisible = true;
      const { href } = a4;
      window.history.pushState({ href }, "", href);
      app.currentDoc = doc;
      event.preventDefault();
    }
  }, xinLocalized({ bindText: "^.title" })))), div8({
    style: {
      position: "relative",
      overflowY: "scroll",
      height: "100%"
    }
  }, a3({
    class: "view-source",
    target: "_blank",
    style: {
      display: projectLinks.github ? "flex" : "none",
      alignItems: "center",
      gap: "6px",
      position: "fixed",
      top: "calc(var(--xin-header-height, 60px) + 5px)",
      right: "5px",
      fontSize: "0.875em",
      color: "var(--brand-color, inherit)",
      opacity: "0.7",
      borderBottom: "none",
      transition: "opacity 0.2s ease"
    },
    onMouseenter(event) {
      event.target.style.opacity = "0.9";
    },
    onMouseleave(event) {
      event.target.style.opacity = "0.7";
    },
    bind: {
      value: app.currentDoc,
      binding(element, doc) {
        if (projectLinks.github && doc.path && doc.path !== "README.md") {
          element.href = `${projectLinks.github}/blob/main/${doc.path}`;
          element.style.display = "flex";
        } else {
          element.style.display = "none";
        }
      }
    }
  }, icons.github({
    style: {
      _xinIconSize: 16
    }
  }), "View source on GitHub"), markdownViewer({
    style: {
      display: "block",
      maxWidth: "44em",
      margin: "auto",
      padding: `0 1em`,
      overflow: "hidden"
    },
    bindValue: "app.currentDoc.text",
    didRender() {
      LiveExample.insertExamples(this, context);
    }
  }))));
  return container;
}
// src/editable-rect.ts
var { div: div9, slot: slot5 } = y;

class EditableRect extends F {
  static initAttributes = {
    rotationSnap: 0,
    positionSnap: 0
  };
  static angleSize = 15;
  static gridSize = 8;
  static snapAngle = false;
  static snapToGrid = false;
  static styleSpec = {
    ":host": {
      "--handle-bg": "#fff4",
      "--handle-color": "#2228",
      "--handle-hover-bg": "#8ff8",
      "--handle-hover-color": "#222",
      "--handle-size": "20px",
      "--handle-padding": "2px"
    },
    ":host ::slotted(*)": {
      position: "absolute"
    },
    ":host > :not(style,slot)": {
      boxSizing: "border-box",
      content: '" "',
      position: "absolute",
      display: "flex",
      height: Uo.handleSize,
      width: Uo.handleSize,
      padding: Uo.handlePadding,
      "--text-color": Uo.handleColor,
      background: Uo.handleBg
    },
    ":host > .drag-size": {
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
      height: "auto",
      width: "auto",
      background: "transparent",
      cursor: "ew-resize"
    },
    ':host > [part="rotate"]': {
      transform: `translateY(${Uo.handleSize_50})`
    },
    ":host > [locked] > svg:first-child, :host > :not([locked]) > svg+svg": {
      display: "none"
    },
    ":host .icon-unlock": {
      opacity: 0.5
    },
    ":host svg": {
      pointerEvents: "none"
    },
    ":host > *:hover": {
      "--text-color": Uo.handleHoverColor,
      background: Uo.handleHoverBg
    }
  };
  static snappedCoords(event, coords) {
    const { gridSize } = EditableRect;
    return EditableRect.snapToGrid || event.shiftKey ? coords.map((v3) => Math.round(v3 / gridSize) * gridSize) : coords;
  }
  static snappedAngle(event, a4) {
    const { angleSize } = EditableRect;
    return EditableRect.snapAngle || event.shiftKey ? Math.round(a4 / angleSize) * angleSize : a4;
  }
  get locked() {
    const element = this.parentElement;
    if (element.style.inset) {
      return { left: true, top: true, bottom: true, right: true };
    }
    const right = element.style.right.match(/\d/) !== null;
    const left = !right || element.style.left.match(/\d/) !== null;
    const bottom = element.style.bottom.match(/\d/) !== null;
    const top = !bottom || element.style.top.match(/\d/) !== null;
    return { left, top, bottom, right };
  }
  set locked(locks) {
    const { bottom, right } = locks;
    let { left, top } = locks;
    const element = this.parentElement;
    const l4 = element.offsetLeft;
    const t = element.offsetTop;
    const w2 = element.offsetWidth;
    const h = element.offsetHeight;
    const r = element.offsetParent.offsetWidth - l4 - w2;
    const b2 = element.offsetParent.offsetHeight - t - h;
    Object.assign(element.style, {
      left: "",
      right: "",
      top: "",
      bottom: "",
      width: "",
      height: ""
    });
    if (!right)
      left = true;
    if (!bottom)
      top = true;
    if (left)
      element.style.left = l4 + "px";
    if (right)
      element.style.right = r + "px";
    if (left && right) {
      element.style.width = "auto";
    } else {
      element.style.width = w2 + "px";
    }
    if (top)
      element.style.top = t + "px";
    if (bottom)
      element.style.bottom = b2 + "px";
    if (top && bottom) {
      element.style.height = "auto";
    } else {
      element.style.height = h + "px";
    }
    this.queueRender();
  }
  get coords() {
    const { top, left, right, bottom } = this.parentElement.style;
    return {
      top: parseFloat(top),
      left: parseFloat(left),
      right: parseFloat(right),
      bottom: parseFloat(bottom)
    };
  }
  get left() {
    return this.parentElement.offsetLeft;
  }
  get width() {
    return this.parentElement.offsetWidth;
  }
  get right() {
    return this.parentElement.offsetParent.offsetWidth - (this.left + this.width);
  }
  get top() {
    return this.parentElement.offsetTop;
  }
  get height() {
    return this.parentElement.offsetHeight;
  }
  get bottom() {
    return this.parentElement.offsetParent.offsetHeight - (this.top + this.height);
  }
  triggerChange = () => {
    this.parentElement.dispatchEvent(new Event("change", {
      bubbles: true,
      composed: true
    }));
  };
  adjustPosition = (event) => {
    const { locked } = this;
    this.locked = locked;
    const target = this.parentElement;
    const { top, left, bottom, right } = this.coords;
    trackDrag(event, (dx, dy, dragEvent) => {
      [dx, dy] = EditableRect.snappedCoords(dragEvent, [dx, dy]);
      if (!isNaN(top)) {
        target.style.top = top + dy + "px";
      }
      if (!isNaN(bottom)) {
        target.style.bottom = bottom - dy + "px";
      }
      if (!isNaN(left)) {
        target.style.left = left + dx + "px";
      }
      if (!isNaN(right)) {
        target.style.right = right - dx + "px";
      }
      if (dragEvent.type === "mouseup") {
        this.triggerChange();
        return true;
      }
    });
  };
  resize = (event) => {
    const target = this.parentElement;
    const { locked } = this;
    this.locked = Object.assign({
      left: true,
      top: true,
      right: true,
      bottom: true
    });
    const [right, bottom] = [this.right, this.bottom];
    trackDrag(event, (dx, dy, dragEvent) => {
      let r = right - dx;
      let b2 = bottom - dy;
      [r, b2] = EditableRect.snappedCoords(dragEvent, [r, b2]);
      target.style.right = r + "px";
      target.style.bottom = b2 + "px";
      if (dragEvent.type === "mouseup") {
        this.locked = locked;
        this.triggerChange();
        return true;
      }
    });
  };
  adjustSize = (event) => {
    const target = this.parentElement;
    const { locked } = this;
    const dimension = event.target.getAttribute("part");
    this.locked = Object.assign({
      left: true,
      right: true,
      top: true,
      bottom: true
    });
    const original = this[dimension];
    trackDrag(event, (dx, dy, dragEvent) => {
      const [adjusted] = EditableRect.snappedCoords(dragEvent, [
        original + (["left", "right"].includes(dimension) ? dx : dy) * (["right", "bottom"].includes(dimension) ? -1 : 1)
      ]);
      target.style[dimension] = adjusted + "px";
      if (dragEvent.type === "mouseup") {
        this.locked = locked;
        this.triggerChange();
        return true;
      }
    });
  };
  get rect() {
    return this.parentElement.getBoundingClientRect();
  }
  get center() {
    const rect = this.parentElement.getBoundingClientRect();
    return {
      x: rect.x + rect.width * 0.5,
      y: rect.y + rect.height * 0.5
    };
  }
  get element() {
    return this.parentElement;
  }
  adjustRotation = (event) => {
    const { center } = this;
    const { transformOrigin } = this.element.style;
    if (!transformOrigin) {
      this.element.style.transformOrigin = "50% 50%";
    }
    trackDrag(event, (_dx, _dy, dragEvent) => {
      const { clientX, clientY } = dragEvent;
      const x3 = clientX - center.x;
      const y3 = clientY - center.y;
      let alpha = y3 > 0 ? 90 : -90;
      if (x3 !== 0) {
        alpha = Math.atan2(y3, x3) * 180 / Math.PI;
      }
      alpha = EditableRect.snappedAngle(dragEvent, alpha);
      if (alpha === 0) {
        this.element.style.transformOrigin = "";
        this.element.style.transform = "";
      } else {
        this.element.style.transform = `rotate(${alpha}deg)`;
      }
      this.triggerChange();
      return dragEvent.type === "mouseup";
    });
  };
  toggleLock = (event) => {
    const { locked } = this;
    const which = event.target.title.split(" ")[1];
    locked[which] = !locked[which];
    this.locked = locked;
    this.queueRender();
    event.stopPropagation();
    event.preventDefault();
  };
  content = () => [
    div9({
      part: "move",
      style: { top: "50%", left: "50%", transform: "translate(-50%,-50%)" }
    }, icons.move()),
    div9({
      part: "left",
      title: "resize left",
      class: "drag-size",
      style: { left: "-6px", width: "8px" }
    }),
    div9({
      part: "right",
      title: "resize right",
      class: "drag-size",
      style: { left: "calc(100% - 2px)", width: "8px" }
    }),
    div9({
      part: "top",
      title: "resize top",
      class: "drag-size",
      style: { top: "-6px", height: "8px", cursor: "ns-resize" }
    }),
    div9({
      part: "bottom",
      title: "resize bottom",
      class: "drag-size",
      style: { top: "calc(100% - 2px)", height: "8px", cursor: "ns-resize" }
    }),
    div9({
      part: "resize",
      style: { top: "100%", left: "100%" }
    }, icons.resize()),
    div9({
      part: "rotate",
      style: { top: "50%", right: "0" }
    }, icons.refreshCw()),
    div9({
      part: "lockLeft",
      title: "lock left",
      style: { top: "50%", left: 0, transform: "translate(-100%, -50%)" }
    }, icons.unlock(), icons.lock()),
    div9({
      part: "lockRight",
      title: "lock right",
      style: { top: "50%", left: "100%", transform: "translate(0%, -50%)" }
    }, icons.unlock(), icons.lock()),
    div9({
      part: "lockTop",
      title: "lock top",
      style: { top: 0, left: "50%", transform: "translate(-50%, -100%)" }
    }, icons.unlock(), icons.lock()),
    div9({
      part: "lockBottom",
      title: "lock bottom",
      style: { top: "100%", left: "50%", transform: "translate(-50%, 0%)" }
    }, icons.unlock(), icons.lock()),
    slot5()
  ];
  connectedCallback() {
    super.connectedCallback();
    const {
      left,
      right,
      top,
      bottom,
      lockLeft,
      lockRight,
      lockTop,
      lockBottom,
      move,
      resize,
      rotate
    } = this.parts;
    const PASSIVE2 = { passive: true };
    [left, right, top, bottom].forEach((elt) => {
      elt.addEventListener("mousedown", this.adjustSize, PASSIVE2);
      elt.addEventListener("touchstart", this.adjustSize, PASSIVE2);
    });
    [lockLeft, lockRight, lockTop, lockBottom].forEach((elt) => {
      elt.addEventListener("click", this.toggleLock);
    });
    resize.addEventListener("mousedown", this.resize, PASSIVE2);
    move.addEventListener("mousedown", this.adjustPosition, PASSIVE2);
    rotate.addEventListener("mousedown", this.adjustRotation, PASSIVE2);
    resize.addEventListener("touchstart", this.resize, PASSIVE2);
    move.addEventListener("touchstart", this.adjustPosition, PASSIVE2);
    rotate.addEventListener("touchstart", this.adjustRotation, PASSIVE2);
  }
  render() {
    super.render();
    if (!this.parentElement) {
      return;
    }
    const { lockLeft, lockRight, lockTop, lockBottom } = this.parts;
    const { left, right, top, bottom } = this.locked;
    lockLeft.toggleAttribute("locked", left);
    lockRight.toggleAttribute("locked", right);
    lockTop.toggleAttribute("locked", top);
    lockBottom.toggleAttribute("locked", bottom);
  }
}
var editableRect = EditableRect.elementCreator({
  tag: "xin-editable"
});
// src/filter-builder.ts
var { div: div10, input: input5, button: button9, span: span8 } = y;
var passThru2 = (array) => array;
var NULL_FILTER_DESCRIPTION = "null filter, everything matches";
var availableFilters = {
  contains: {
    caption: "contains",
    negative: "does not contain",
    makeTest: (value) => {
      value = value.toLocaleLowerCase();
      return (obj) => String(obj).toLocaleLowerCase().includes(value);
    }
  },
  hasTags: {
    caption: "has tags",
    makeTest: (value) => {
      const tags = value.split(/[\s,]/).map((tag) => tag.trim().toLocaleLowerCase()).filter((tag) => tag !== "");
      return (obj) => Array.isArray(obj) && tags.find((tag) => !obj.includes(tag)) === undefined;
    }
  },
  doesNotHaveTags: {
    caption: "does not have tags",
    makeTest: (value) => {
      const tags = value.split(/[\s,]/).map((tag) => tag.trim().toLocaleLowerCase()).filter((tag) => tag !== "");
      return (obj) => Array.isArray(obj) && tags.find((tag) => obj.includes(tag)) === undefined;
    }
  },
  equals: {
    caption: "=",
    negative: "≠",
    makeTest: (value) => {
      if (isNaN(Number(value))) {
        value = String(value).toLocaleLowerCase();
        return (obj) => String(obj).toLocaleLowerCase() === value;
      }
      const num = Number(value);
      return (obj) => Number(obj) === num;
    }
  },
  after: {
    caption: "is after",
    negative: "is before",
    makeTest: (value) => {
      const date = new Date(value);
      return (obj) => new Date(obj) > date;
    }
  },
  greaterThan: {
    caption: ">",
    negative: "≤",
    makeTest: (value) => {
      if (!isNaN(Number(value))) {
        const num = Number(value);
        return (obj) => Number(obj) > num;
      }
      value = value.toLocaleLowerCase();
      return (obj) => String(obj).toLocaleLowerCase() > value;
    }
  },
  truthy: {
    caption: "is true/non-empty/non-zero",
    negative: "is false/empty/zero",
    needsValue: false,
    makeTest: () => (obj) => !!obj
  },
  isTrue: {
    caption: "= true",
    needsValue: false,
    makeTest: () => (obj) => obj === true
  },
  isFalse: {
    caption: "= false",
    needsValue: false,
    makeTest: () => (obj) => obj === false
  }
};
var passAnything = {
  description: "anything",
  test: () => true
};
function getSelectText(select) {
  return select.options[select.selectedIndex]?.caption || "";
}

class FilterPart extends F {
  static initAttributes = {
    haystack: "*",
    condition: "contains",
    needle: ""
  };
  fields = [];
  filters = availableFilters;
  content = () => [
    tosiSelect({ part: "haystack" }),
    tosiSelect({ part: "condition" }),
    input5({ part: "needle", type: "search" }),
    span8({ part: "padding" }),
    button9({ part: "remove", title: "delete" }, icons.trash())
  ];
  filter = passAnything;
  get state() {
    const { haystack, needle, condition } = this.parts;
    return {
      haystack: haystack.value,
      needle: needle.value,
      condition: condition.value
    };
  }
  set state(newState) {
    Object.assign(this, newState);
  }
  buildFilter = () => {
    const { haystack, condition, needle } = this.parts;
    const negative = condition.value.startsWith("~");
    const key = negative ? condition.value.slice(1) : condition.value;
    const filter = this.filters[key];
    needle.hidden = filter.needsValue === false;
    const baseTest = filter.needsValue === false ? filter.makeTest(undefined) : filter.makeTest(needle.value);
    const field = haystack.value;
    let test;
    if (field !== "*") {
      test = negative ? (obj) => !baseTest(obj[field]) : (obj) => baseTest(obj[field]);
    } else {
      test = negative ? (obj) => Object.values(obj).find((v3) => !baseTest(v3)) !== undefined : (obj) => Object.values(obj).find((v3) => baseTest(v3)) !== undefined;
    }
    const matchValue = filter.needsValue !== false ? ` "${needle.value}"` : "";
    const description = `${getSelectText(haystack)} ${getSelectText(condition)}${matchValue}`;
    this.filter = {
      description,
      test
    };
    this.parentElement?.dispatchEvent(new Event("change"));
  };
  connectedCallback() {
    super.connectedCallback();
    const { haystack, condition, needle, remove } = this.parts;
    haystack.addEventListener("change", this.buildFilter);
    condition.addEventListener("change", this.buildFilter);
    needle.addEventListener("input", this.buildFilter);
    haystack.value = this.haystack;
    condition.value = this.condition;
    needle.value = this.needle;
    remove.addEventListener("click", () => {
      const { parentElement } = this;
      this.remove();
      parentElement?.dispatchEvent(new Event("change"));
    });
  }
  render() {
    super.render();
    const { haystack, condition, needle } = this.parts;
    haystack.options = [
      {
        caption: "any field",
        value: "*"
      },
      ...this.fields.map((field) => field.prop)
    ];
    condition.options = Object.keys(this.filters).map((key) => {
      const filter = this.filters[key];
      return filter.negative !== undefined ? [
        { caption: filter.caption, value: key },
        { caption: filter.negative, value: "~" + key }
      ] : { caption: filter.caption, value: key };
    }).flat();
    if (this.haystack !== "") {
      haystack.value = this.haystack;
    }
    if (this.condition !== "") {
      condition.value = this.condition;
    }
    if (this.needle !== "") {
      needle.value = this.needle;
    }
    this.buildFilter();
  }
}
var filterPart = FilterPart.elementCreator({
  tag: "xin-filter-part",
  styleSpec: {
    ":host": {
      display: "flex"
    },
    ":host .xin-icon:": {
      verticalAlign: "middle",
      pointerEvents: "none"
    },
    ':host [part="haystack"], :host [part="condition"]': {
      flex: "1"
    },
    ':host [part="needle"]': {
      flex: 2
    },
    ':host [hidden]+[part="padding"]': {
      display: "block",
      content: " ",
      flex: "1 1 auto"
    }
  }
});

class FilterBuilder extends F {
  _fields = [];
  get fields() {
    return this._fields;
  }
  set fields(_fields) {
    this._fields = _fields;
    this.queueRender();
  }
  get state() {
    const { filterContainer } = this.parts;
    return [...filterContainer.children].map((part) => part.state);
  }
  set state(parts) {
    const { fields, filters } = this;
    const { filterContainer } = this.parts;
    filterContainer.textContent = "";
    for (const state of parts) {
      filterContainer.append(filterPart({ fields, filters, ...state }));
    }
  }
  filter = passThru2;
  description = NULL_FILTER_DESCRIPTION;
  addFilter = () => {
    const { fields, filters } = this;
    const { filterContainer } = this.parts;
    filterContainer.append(filterPart({ fields, filters }));
  };
  content = () => [
    button9({
      part: "add",
      title: "add filter condition",
      onClick: this.addFilter,
      class: "round"
    }, icons.plus()),
    div10({ part: "filterContainer" }),
    button9({ part: "reset", title: "reset filter", onClick: this.reset }, icons.x())
  ];
  filters = availableFilters;
  reset = () => {
    const { fields, filters } = this;
    const { filterContainer } = this.parts;
    this.description = NULL_FILTER_DESCRIPTION;
    this.filter = passThru2;
    filterContainer.textContent = "";
    filterContainer.append(filterPart({ fields, filters }));
    this.dispatchEvent(new Event("change"));
  };
  buildFilter = () => {
    const { filterContainer } = this.parts;
    if (filterContainer.children.length === 0) {
      this.reset();
      return;
    }
    const filters = [...filterContainer.children].map((filterPart2) => filterPart2.filter);
    const tests = filters.map((filter) => filter.test);
    this.description = filters.map((filter) => filter.description).join(", ");
    this.filter = (array) => array.filter((obj) => tests.find((f) => f(obj) === false) === undefined);
    this.dispatchEvent(new Event("change"));
  };
  connectedCallback() {
    super.connectedCallback();
    const { filterContainer } = this.parts;
    filterContainer.addEventListener("change", this.buildFilter);
    this.reset();
  }
  render() {
    super.render();
  }
}
var filterBuilder = FilterBuilder.elementCreator({
  tag: "xin-filter",
  styleSpec: {
    ":host": {
      height: "auto",
      display: "grid",
      gridTemplateColumns: "32px calc(100% - 64px) 32px",
      alignItems: "center"
    },
    ':host [part="filterContainer"]': {
      display: "flex",
      flexDirection: "column",
      alignItems: "stretch",
      flex: "1 1 auto"
    },
    ':host [part="haystack"]': {
      _fieldWidth: "100px"
    },
    ':host [part="condition"]': {
      _fieldWidth: "60px"
    },
    ':host [part="needle"]': {
      _fieldWidth: "80px"
    },
    ':host [part="add"], :host [part="reset"]': {
      "--button-size": "var(--touch-size, 32px)",
      borderRadius: "999px",
      height: "var(--button-size)",
      lineHeight: "var(--button-size)",
      margin: "0",
      padding: "0",
      textAlign: "center",
      width: "var(--button-size)",
      flex: "0 0 var(--button-size)"
    }
  }
});
// src/form.ts
var { form, slot: slot6, xinSlot: xinSlot4, label: label2, input: input6, span: span9 } = y;
function attr(element, name, value) {
  if (value !== "" && value !== false) {
    element.setAttribute(name, value);
  } else {
    element.removeAttribute(name);
  }
}
function getInputValue(input7) {
  switch (input7.type) {
    case "checkbox":
      return input7.checked;
    case "radio": {
      const picked = input7.parentElement?.querySelector(`input[type="radio"][name="${input7.name}"]:checked`);
      return picked ? picked.value : null;
    }
    case "range":
    case "number":
      return Number(input7.value);
    default:
      return Array.isArray(input7.value) && input7.value.length === 0 ? null : input7.value;
  }
}
function setElementValue(input7, value) {
  if (!(input7 instanceof HTMLElement)) {} else if (input7 instanceof HTMLInputElement) {
    switch (input7.type) {
      case "checkbox":
        input7.checked = value;
        break;
      case "radio":
        input7.checked = value === input7.value;
        break;
      default:
        input7.value = String(value || "");
    }
  } else {
    if (value != null || input7.value != null) {
      input7.value = String(value || "");
    }
  }
}

class TosiField extends F {
  static initAttributes = {
    caption: "",
    key: "",
    type: "",
    optional: false,
    pattern: "",
    placeholder: "",
    min: "",
    max: "",
    step: "",
    fixedPrecision: -1,
    prefix: "",
    suffix: ""
  };
  value = null;
  content = label2(xinSlot4({ part: "caption" }), span9({ part: "field" }, xinSlot4({ part: "input", name: "input" }), input6({ part: "valueHolder" })));
  valueChanged = false;
  handleChange = () => {
    const { input: input7, valueHolder } = this.parts;
    const inputElement = input7.children[0] || valueHolder;
    if (inputElement !== valueHolder) {
      valueHolder.value = inputElement.value;
    }
    this.value = getInputValue(inputElement);
    this.valueChanged = true;
    const form2 = this.closest("tosi-form");
    if (form2 && this.key !== "") {
      switch (this.type) {
        case "checkbox":
          form2.fields[this.key] = inputElement.checked;
          break;
        case "number":
        case "range":
          if (this.fixedPrecision > -1) {
            inputElement.value = Number(inputElement.value).toFixed(this.fixedPrecision);
            form2.fields[this.key] = Number(inputElement.value);
          } else {
            form2.fields[this.key] = Number(inputElement.value);
          }
          break;
        default:
          form2.fields[this.key] = inputElement.value;
      }
    }
  };
  connectedCallback() {
    super.connectedCallback();
    const { input: input7, valueHolder } = this.parts;
    valueHolder.addEventListener("change", this.handleChange);
    input7.addEventListener("change", this.handleChange, true);
  }
  render() {
    if (this.valueChanged) {
      this.valueChanged = false;
      return;
    }
    const { input: input7, caption, valueHolder, field } = this.parts;
    if (caption.textContent?.trim() === "") {
      caption.append(this.caption !== "" ? this.caption : this.key);
    }
    if (this.type === "text") {
      input7.textContent = "";
      const textarea = y.textarea({ value: this.value });
      if (this.placeholder) {
        textarea.setAttribute("placeholder", this.placeholder);
      }
      input7.append(textarea);
    } else if (this.type === "color") {
      input7.textContent = "";
      input7.append(colorInput({ value: this.value }));
    } else if (input7.children.length === 0) {
      attr(valueHolder, "placeholder", this.placeholder);
      attr(valueHolder, "type", this.type);
      attr(valueHolder, "pattern", this.pattern);
      attr(valueHolder, "min", this.min);
      attr(valueHolder, "max", this.max);
      if (this.step) {
        attr(valueHolder, "step", this.step);
      } else if (this.fixedPrecision > 0 && this.type === "number") {
        attr(valueHolder, "step", Math.pow(10, -this.fixedPrecision));
      }
    }
    setElementValue(valueHolder, this.value);
    setElementValue(input7.children[0], this.value);
    this.prefix ? field.setAttribute("prefix", this.prefix) : field.removeAttribute("prefix");
    this.suffix ? field.setAttribute("suffix", this.suffix) : field.removeAttribute("suffix");
    valueHolder.classList.toggle("hidden", input7.children.length > 0);
    if (input7.children.length > 0) {
      valueHolder.setAttribute("tabindex", "-1");
    } else {
      valueHolder.removeAttribute("tabindex");
    }
    input7.style.display = input7.children.length === 0 ? "none" : "";
    attr(valueHolder, "required", !this.optional);
  }
}

class TosiForm extends F {
  context = {};
  value = {};
  get isValid() {
    const widgets = [...this.querySelectorAll("*")].filter((widget) => widget.required !== undefined);
    return widgets.find((widget) => !widget.reportValidity()) === undefined;
  }
  static styleSpec = {
    ":host": {
      display: "flex",
      flexDirection: "column"
    },
    ":host::part(header), :host::part(footer)": {
      display: "flex"
    },
    ":host::part(content)": {
      display: "flex",
      flexDirection: "column",
      overflow: "hidden auto",
      height: "100%",
      width: "100%",
      position: "relative",
      boxSizing: "border-box"
    },
    ":host form": {
      display: "flex",
      flex: "1 1 auto",
      position: "relative",
      overflow: "hidden"
    }
  };
  content = [
    slot6({ part: "header", name: "header" }),
    form({ part: "form" }, slot6({ part: "content" })),
    slot6({ part: "footer", name: "footer" })
  ];
  getField = (key) => {
    return this.querySelector(`tosi-field[key="${key}"]`);
  };
  get fields() {
    if (typeof this.value === "string") {
      try {
        this.value = JSON.parse(this.value);
      } catch (e) {
        console.log("<tosi-form> could not use its value, expects valid JSON");
        this.value = {};
      }
    }
    const { getField } = this;
    const dispatch = this.dispatchEvent.bind(this);
    return new Proxy(this.value, {
      get(target, prop) {
        return target[prop];
      },
      set(target, prop, newValue) {
        if (target[prop] !== newValue) {
          target[prop] = newValue;
          const field = getField(prop);
          if (field) {
            field.value = newValue;
          }
          dispatch(new Event("change"));
        }
        return true;
      }
    });
  }
  set fields(values) {
    const fields = [...this.querySelectorAll("tosi-field")];
    for (const field of fields) {
      field.value = values[field.key];
    }
  }
  submit = () => {
    this.parts.form.dispatchEvent(new Event("submit"));
  };
  handleSubmit = (event) => {
    event.preventDefault();
    event.stopPropagation();
    const value = this.fields;
    this.submitCallback(value, this.isValid);
  };
  submitCallback = (value, isValid) => {
    console.log("override submitCallback to handle this data", {
      value,
      isValid
    });
  };
  connectedCallback() {
    super.connectedCallback();
    const { form: form2 } = this.parts;
    form2.addEventListener("submit", this.handleSubmit);
    this.addEventListener("change", this.handleElementChange, true);
    this.initializeNamedElements();
  }
  handleElementChange = (event) => {
    const target = event.target;
    const name = target.getAttribute("name");
    if (name && "value" in target) {
      this.fields[name] = target.value;
    }
  };
  initializeNamedElements() {
    const formValue = this.fields;
    const namedElements = this.querySelectorAll("[name], [key]");
    for (const el of namedElements) {
      const key = el.getAttribute("name") || el.getAttribute("key");
      if (key && formValue[key] !== undefined) {
        el.value = formValue[key];
      }
    }
  }
}
var XinField = TosiField;
var XinForm = TosiForm;
var fieldStyleSpec = {
  ':host [part="field"]': {
    position: "relative",
    display: "flex",
    alignItems: "center",
    gap: uo.prefixSuffixGap("8px")
  },
  ':host [part="field"][prefix]::before': {
    content: "attr(prefix)"
  },
  ':host [part="field"][suffix]::after': {
    content: "attr(suffix)"
  },
  ':host [part="field"] > *, :host [part="input"] > *': {
    width: "100%"
  },
  ":host textarea": {
    resize: "none"
  },
  ':host input[type="checkbox"]': {
    width: "fit-content"
  },
  ":host .hidden": {
    position: "absolute",
    pointerEvents: "none",
    opacity: 0
  }
};
var tosiField = TosiField.elementCreator({
  tag: "tosi-field",
  styleSpec: fieldStyleSpec
});
var tosiForm = TosiForm.elementCreator({
  tag: "tosi-form"
});
var xinField = tosiField;
var xinForm = tosiForm;
// src/gamepad.ts
function gamepadState() {
  const gamepads = navigator.getGamepads().filter((p2) => p2 !== null);
  return gamepads.map((p2) => {
    const { id, axes, buttons } = p2;
    return {
      id,
      axes,
      buttons: buttons.map((button10, index) => {
        const { pressed, value } = button10;
        return {
          index,
          pressed,
          value
        };
      }).filter((b2) => b2.pressed || b2.value !== 0).reduce((map, button10) => {
        map[button10.index] = button10.value;
        return map;
      }, {})
    };
  });
}
function gamepadText() {
  const state = gamepadState();
  return state.length === 0 ? "no active gamepads" : state.map(({ id, axes, buttons }) => {
    const axesText = axes.map((a4) => a4.toFixed(2)).join(" ");
    const buttonText = Object.keys(buttons).map((key) => `[${key}](${buttons[Number(key)].toFixed(2)})`).join(" ");
    return `${id}
${axesText}
${buttonText}`;
  }).join(`
`);
}
function xrControllers(xrHelper) {
  const controllers = {};
  xrHelper.input.onControllerAddedObservable.add((controller) => {
    controller.onMotionControllerInitObservable.add((mc) => {
      const state = {};
      const componentIds = mc.getComponentIds();
      componentIds.forEach((componentId) => {
        const component = mc.getComponent(componentId);
        state[componentId] = { pressed: component.pressed };
        component.onButtonStateChangedObservable.add(() => {
          state[componentId].pressed = component.pressed;
        });
        if (component.onAxisValueChangedObservable) {
          state[componentId].axes = [];
          component.onAxisValueChangedObservable.add((axes) => {
            state[componentId].axes = axes;
          });
        }
      });
      controllers[mc.handedness] = state;
    });
  });
  return controllers;
}
function xrControllersText(controllers) {
  if (controllers === undefined || Object.keys(controllers).length === 0) {
    return "no xr inputs";
  }
  return Object.keys(controllers).map((controllerId) => {
    const state = controllers[controllerId];
    const buttonText = Object.keys(state).filter((componentId) => state[componentId].pressed).join(" ");
    return `${controllerId}
${buttonText}`;
  }).join(`
`);
}
// src/mapbox.ts
var { div: div11 } = y;

class MapBox extends F {
  static formAssociated = true;
  static initAttributes = {
    coords: "65.01715565258993,25.48081004203459,12",
    token: "",
    mapStyle: "mapbox://styles/mapbox/streets-v12",
    name: ""
  };
  value = "";
  formDisabledCallback(disabled) {}
  formResetCallback() {
    this.value = "";
    this.coords = "65.01715565258993,25.48081004203459,12";
  }
  content = div11({ style: { width: "100%", height: "100%" } });
  get map() {
    return this._map;
  }
  static mapboxCSSAvailable;
  static mapboxAvailable;
  _map;
  static styleSpec = {
    ":host": {
      display: "inline-block",
      position: "relative",
      width: "400px",
      height: "400px",
      textAlign: "left"
    }
  };
  constructor() {
    super();
    if (MapBox.mapboxCSSAvailable === undefined) {
      MapBox.mapboxCSSAvailable = styleSheet("https://api.mapbox.com/mapbox-gl-js/v3.15.0/mapbox-gl.css").catch((e) => {
        console.error("failed to load mapbox-gl.css", e);
      });
      MapBox.mapboxAvailable = scriptTag("https://api.mapbox.com/mapbox-gl-js/v3.15.0/mapbox-gl.js").catch((e) => {
        console.error("failed to load mapbox-gl.js", e);
      });
    }
  }
  connectedCallback() {
    super.connectedCallback();
    if (!this.token) {
      console.error("mapbox requires an access token which you can provide via the token attribute");
    }
  }
  _lastCoords = "";
  _lastStyle = "";
  render() {
    super.render();
    if (!this.token) {
      return;
    }
    if (this._map) {
      if (this.coords !== this._lastCoords) {
        const [long2, lat2, zoom2] = this.coords.split(",").map((x3) => Number(x3));
        this._map.setCenter([lat2, long2]);
        this._map.setZoom(zoom2);
        this._lastCoords = this.coords;
      }
      if (this.mapStyle !== this._lastStyle) {
        this._map.setStyle(this.mapStyle);
        this._lastStyle = this.mapStyle;
      }
      return;
    }
    const { div: div12 } = this.parts;
    const [long, lat, zoom] = this.coords.split(",").map((x3) => Number(x3));
    this._lastCoords = this.coords;
    this._lastStyle = this.mapStyle;
    MapBox.mapboxAvailable.then(({ mapboxgl }) => {
      console.log("%cmapbox may complain about missing css -- don't panic!", "background: orange; color: black; padding: 0 5px;");
      mapboxgl.accessToken = this.token;
      this._map = new mapboxgl.Map({
        container: div12,
        style: this.mapStyle,
        zoom,
        center: [lat, long]
      });
      this._map.on("render", () => this._map.resize());
      this._map.on("moveend", () => {
        const center = this._map.getCenter();
        const currentZoom = this._map.getZoom();
        const newValue = `${center.lat.toFixed(6)},${center.lng.toFixed(6)},${currentZoom.toFixed(1)}`;
        if (newValue !== this.value) {
          if (this.internals) {
            this.internals.setFormValue(newValue);
          }
        }
      });
    });
  }
}
var mapBox = MapBox.elementCreator({
  tag: "xin-map"
});
// src/month.ts
var { div: div12, span: span10, button: button10 } = y;
var DAY_MS = 24 * 3600 * 1000;
var WEEK = [0, 1, 2, 3, 4, 5, 6];
var MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
var padLeft = (value, length = 2, padding = "0") => String(value).padStart(length, padding);
var dateFromYMD = (year, month, date) => new Date(`${year}-${padLeft(month)}-${padLeft(date)}`);

class TosiMonth extends F {
  static formAssociated = true;
  static initAttributes = {
    month: NaN,
    year: NaN,
    weekStart: 0,
    minDate: dateFromYMD(new Date().getFullYear() - 100, 1, 1).toISOString().split("T")[0],
    maxDate: dateFromYMD(new Date().getFullYear() + 10, 12, 31).toISOString().split("T")[0],
    selectable: false,
    multiple: false,
    range: false,
    disabled: false,
    readonly: false,
    required: false,
    name: ""
  };
  selectedDays = [];
  value = "";
  formDisabledCallback(disabled) {
    this.disabled = disabled;
  }
  formResetCallback() {
    this.value = "";
    this.selectedDays = [];
  }
  get endDay() {
    return 1 - this.weekStart;
  }
  get months() {
    return MONTHS.map((value) => ({
      caption: dateFromYMD(2025, value, 1).toString().split(" ")[1],
      value: String(value)
    }));
  }
  get years() {
    const startYear = Number(this.minDate.split("-")[0]);
    const endYear = Number(this.maxDate.split("-")[0]);
    const years = [];
    for (let year = startYear;year <= endYear; year++) {
      years.push(String(year));
    }
    return years;
  }
  monthChanged = (_year, _month) => {};
  gotoMonth(year, month) {
    if (this.month !== month || this.year !== year) {
      this.month = month;
      this.year = year;
      this.monthChanged(year, month);
    }
  }
  setMonth = () => {
    this.gotoMonth(Number(this.parts.year.value), Number(this.parts.month.value));
  };
  get to() {
    return this.selectedDays[1] || "";
  }
  set to(dateString) {
    this.selectedDays[1] = dateString;
    this.selectedDays.splice(2);
  }
  get from() {
    return this.selectedDays[0] || "";
  }
  set from(dateString) {
    this.selectedDays[0] = dateString;
    this.selectedDays.splice(2);
  }
  clickDate = (event) => {
    const dateString = event.target.getAttribute("title");
    this.selectDate(dateString);
  };
  keyDate = (event) => {
    let stopEvent = false;
    switch (event.code) {
      case "Space": {
        const dateString = event.target.getAttribute("title");
        this.selectDate(dateString);
        stopEvent = true;
        break;
      }
      case "Tab":
        break;
      default:
        console.log(event);
    }
    if (stopEvent) {
      event.preventDefault();
      event.stopPropagation();
    }
  };
  #focusDate = "";
  selectDate = (dateString) => {
    this.#focusDate = dateString;
    if (this.range) {
      if (!this.to) {
        this.selectedDays = [dateString, dateString];
      } else if (this.from === dateString && this.to === dateString) {
        this.selectedDays = [];
      } else if (this.from === dateString) {
        this.from = this.to;
      } else if (this.to === dateString) {
        this.to = this.from;
      } else if (dateString < this.from) {
        this.from = dateString;
      } else if (dateString > this.to) {
        this.to = dateString;
      } else {
        this.to = dateString;
      }
      this.value = `${this.from},${this.to}`;
    } else if (this.multiple) {
      if (this.selectedDays.includes(dateString)) {
        this.selectedDays.splice(this.selectedDays.indexOf(dateString), 1);
      } else {
        this.selectedDays.push(dateString);
        this.selectedDays.sort();
      }
      this.value = this.selectedDays.join(",");
    } else if (this.selectable) {
      if (this.selectedDays.includes(dateString)) {
        this.value = "";
        this.selectedDays = [];
      } else {
        this.value = dateString;
        this.selectedDays = [dateString];
      }
    }
  };
  nextMonth = () => {
    if (this.month < 12) {
      this.gotoMonth(this.year, this.month + 1);
    } else {
      this.gotoMonth(this.year + 1, 1);
    }
  };
  previousMonth = () => {
    if (this.month > 1) {
      this.gotoMonth(this.year, this.month - 1);
    } else {
      this.gotoMonth(this.year - 1, 12);
    }
  };
  checkDay = (dateString) => {
    if (!this.range) {
      return this.selectedDays.includes(dateString);
    } else if (this.range) {
      return this.from && dateString >= this.from && dateString <= this.to;
    }
    return false;
  };
  dateMenuItem = (dateString, caption = "") => {
    dateString = dateString.split("T")[0];
    return {
      caption: caption || dateString,
      enabled: () => !dateString.startsWith(`${this.year}-${padLeft(this.month)}-`),
      action: () => {
        this.gotoDate(dateString);
      }
    };
  };
  jumpMenu = () => {
    popMenu({
      target: this.parts.jump,
      menuItems: [
        this.dateMenuItem(new Date().toISOString(), "This Month"),
        ...this.selectedDays.length === 0 ? [] : [null],
        ...this.selectedDays.map((date) => this.dateMenuItem(date))
      ]
    });
  };
  content = () => [
    div12({ part: "header" }, button10({
      part: "previous",
      onClick: this.previousMonth
    }, icons.chevronLeft()), span10({ style: { flex: "1" } }), button10({
      part: "jump",
      onClick: this.jumpMenu
    }, icons.calendar()), tosiSelect({
      part: "month",
      options: this.months,
      onChange: this.setMonth
    }), tosiSelect({
      part: "year",
      options: [this.year],
      onChange: this.setMonth
    }), span10({ style: { flex: "1" } }), button10({
      part: "next",
      onClick: this.nextMonth
    }, icons.chevronRight())),
    div12({ part: "week" }),
    div12({ part: "days" })
  ];
  gotoDate(dateString) {
    const date = new Date(dateString);
    this.gotoMonth(date.getFullYear(), date.getMonth() + 1);
  }
  connectedCallback() {
    super.connectedCallback();
    const date = new Date(this.value.split(",").pop() || Date.now());
    if (isNaN(this.month)) {
      this.month = date.getMonth() + 1;
    }
    if (isNaN(this.year)) {
      this.year = date.getFullYear();
    }
  }
  days = [];
  render() {
    super.render();
    const { week, days, jump, month, year, previous, next } = this.parts;
    this.selectedDays = this.value ? this.value.split(",") : [];
    const firstOfMonth = dateFromYMD(this.year, this.month, 1);
    const weekStart = new Date(firstOfMonth.valueOf() - (7 + firstOfMonth.getDay() - this.weekStart) % 7 * DAY_MS);
    const nextMonth = this.month === 12 ? 1 : this.month + 1;
    const lastOfMonth = new Date(dateFromYMD(this.year + (this.month === 12 ? 1 : 0), nextMonth, 1).valueOf() - DAY_MS);
    const endDay = new Date(lastOfMonth.valueOf() + (this.weekStart * 2 + 5 + this.endDay - lastOfMonth.getDay()) % 7 * DAY_MS);
    const weekDays = WEEK.map((day) => new Date(weekStart.valueOf() + day * DAY_MS).toString().split(" ")[0]);
    this.days = [];
    const today = new Date().toISOString().split("T")[0];
    for (let day = weekStart.valueOf();day <= endDay.valueOf(); day += DAY_MS) {
      const date = new Date(day);
      const dateString = date.toISOString().split("T")[0];
      this.days.push({
        date,
        selected: false,
        inMonth: date.getMonth() + 1 === this.month,
        isToday: dateString === today,
        isWeekend: date.getDay() % 6 === 0,
        inRange: !!(this.from && dateString >= this.from && dateString <= this.to)
      });
    }
    month.value = String(this.month);
    year.value = String(this.year);
    month.disabled = year.disabled = jump.disabled = previous.disabled = next.disabled = this.disabled || this.readonly;
    year.options = this.years;
    week.textContent = "";
    week.append(...weekDays.map((day) => span10({ class: "day" }, day)));
    days.textContent = "";
    let focusElement = null;
    const { to: to2, from } = this;
    days.append(...this.days.map((day) => {
      const classes = ["date"];
      if (day.inMonth) {
        classes.push("in-month");
      }
      if (day.isToday) {
        classes.push("today");
      }
      const dateString = day.date.toISOString().split("T")[0];
      if (this.checkDay(dateString)) {
        classes.push("checked");
      }
      classes.push(day.isWeekend ? "weekend" : "weekday");
      if (this.range) {
        if (to2 === dateString) {
          classes.push("range-end");
        }
        if (from === dateString) {
          classes.push("range-start");
        }
      }
      const element = span10({
        class: classes.join(" "),
        title: dateString,
        onClick: this.clickDate,
        onKeydown: this.keyDate,
        tabindex: "0"
      }, day.date.getDate());
      if (dateString === this.#focusDate) {
        focusElement = element;
      }
      return element;
    }));
    focusElement?.focus();
  }
}
var tosiMonth = TosiMonth.elementCreator({
  tag: "tosi-month",
  styleSpec: {
    ":host": {
      display: "block"
    },
    ":host [part=header]": {
      display: "flex",
      alignItems: "stretch",
      justifyContent: "stretch"
    },
    ":host[disabled]": {
      pointerEvents: "none",
      opacity: uo.disabledOpacity(0.6)
    },
    ':host [part="month"], :host [part="year"]': {
      _fieldWidth: "4em",
      flex: "1"
    },
    ":host [part=week], :host [part=days]": {
      display: "grid",
      gridTemplateColumns: "auto auto auto auto auto auto auto",
      justifyItems: "stretch"
    },
    ":host .today": {
      background: uo.monthTodayBackground("transparent"),
      boxShadow: uo.monthTodayShadow(`none`),
      backdropFilter: uo.monthTodayBackdropFilter("brightness(0.9)"),
      fontWeight: uo.monthTodayFontWeight("800")
    },
    ":host .day, :host .date": {
      padding: 5,
      display: "flex",
      justifyContent: "center",
      userSelect: "none"
    },
    ":host .day": {
      color: uo.monthDayColor("hotpink"),
      background: uo.monthDayBackground("white"),
      fontWeight: uo.monthDayFontWeight("800")
    },
    ":host .date": {
      cursor: "default"
    },
    ":host .weekend": {
      background: uo.monthWeekendBackground("#eee")
    },
    ":host .date:not(.in-month)": {
      opacity: 0.5
    },
    ":host .date.checked": {
      color: uo.monthDateCheckedColor("white"),
      background: uo.monthDateCheckedBackground("hotpink")
    },
    ":host:not([range]) .date.checked": {
      borderRadius: uo.monthDateCheckedBorderRadius("10px")
    },
    ":host .range-start": {
      borderTopLeftRadius: uo.monthDateCheckedBorderRadius("10px"),
      borderBottomLeftRadius: uo.monthDateCheckedBorderRadius("10px")
    },
    ":host .range-end": {
      borderTopRightRadius: uo.monthDateCheckedBorderRadius("10px"),
      borderBottomRightRadius: uo.monthDateCheckedBorderRadius("10px")
    }
  }
});
// src/notifications.ts
var { div: div13, button: button11 } = y;
var COLOR_MAP = {
  error: "red",
  warn: "orange",
  info: "royalblue",
  log: "gray",
  success: "green",
  progress: "royalblue"
};

class XinNotification extends F {
  static singleton;
  static styleSpec = {
    ":host": {
      _notificationSpacing: 8,
      _notificationWidth: 360,
      _notificationPadding: `${Uo.notificationSpacing} ${Uo.notificationSpacing50} ${Uo.notificationSpacing} ${Uo.notificationSpacing200}`,
      _notificationBg: "#fafafa",
      _notificationAccentColor: "#aaa",
      _notificationTextColor: "#444",
      _notificationIconSize: Uo.notificationSpacing300,
      _notificationButtonSize: 48,
      _notificationBorderWidth: "3px 0 0",
      _notificationBorderRadius: Uo.notificationSpacing50,
      position: "fixed",
      left: 0,
      right: 0,
      bottom: 0,
      paddingBottom: Uo.notificationSpacing,
      width: Uo.notificationWidth,
      display: "flex",
      flexDirection: "column-reverse",
      margin: "0 auto",
      gap: Uo.notificationSpacing,
      maxHeight: "50vh",
      overflow: "hidden auto",
      boxShadow: "none !important"
    },
    ":host *": {
      color: Uo.notificationTextColor
    },
    ":host .note": {
      display: "grid",
      background: Uo.notificationBg,
      padding: Uo.notificationPadding,
      gridTemplateColumns: `${Uo.notificationIconSize} 1fr ${Uo.notificationButtonSize}`,
      gap: Uo.notificationSpacing,
      alignItems: "center",
      borderRadius: Uo.notificationBorderRadius,
      boxShadow: `0 2px 8px #0006, inset 0 0 0 2px ${Uo.notificationAccentColor}`,
      borderColor: Uo.notificationAccentColor,
      borderWidth: Uo.notificationBorderWidth,
      borderStyle: "solid",
      transition: "0.5s ease-in",
      transitionProperty: "margin, opacity",
      zIndex: 1
    },
    ":host .note .icon": {
      stroke: Uo.notificationAccentColor
    },
    ":host .note button": {
      display: "flex",
      lineHeight: Uo.notificationButtonSize,
      padding: 0,
      margin: 0,
      height: Uo.notificationButtonSize,
      width: Uo.notificationButtonSize,
      background: "transparent",
      alignItems: "center",
      justifyContent: "center",
      boxShadow: "none",
      border: "none",
      position: "relative"
    },
    ":host .note button:hover svg": {
      stroke: Uo.notificationAccentColor
    },
    ":host .note button:active svg": {
      borderRadius: 99,
      stroke: Uo.notificationBg,
      background: Uo.notificationAccentColor,
      padding: Uo.spacing50
    },
    ":host .note svg": {
      height: Uo.notificationIconSize,
      width: Uo.notificationIconSize,
      pointerEvents: "none"
    },
    ":host .message": {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: Uo.notificationSpacing
    },
    ":host .note.closing": {
      opacity: 0,
      zIndex: 0
    }
  };
  static removeNote(note) {
    note.classList.add("closing");
    note.style.marginBottom = -note.offsetHeight + "px";
    const remove = () => {
      note.remove();
    };
    note.addEventListener("transitionend", remove);
    setTimeout(remove, 1000);
  }
  static post(spec) {
    const { message, duration, type, close, progress, icon, color } = Object.assign({ type: "info", duration: -1 }, typeof spec === "string" ? { message: spec } : spec);
    if (!this.singleton) {
      this.singleton = xinNotification();
    }
    const singleton = this.singleton;
    document.body.append(singleton);
    singleton.style.zIndex = String(findHighestZ() + 1);
    const _notificationAccentColor = color || COLOR_MAP[type];
    const progressBar = progress || type === "progress" ? y.progress() : {};
    const closeCallback = () => {
      if (close) {
        close();
      }
      XinNotification.removeNote(note);
    };
    const iconElement = icon instanceof SVGElement ? icon : icon ? icons[icon]({ class: "icon" }) : icons.info({ class: "icon" });
    const isUrgent = type === "error" || type === "warn";
    const note = div13({
      class: `note ${type}`,
      role: isUrgent ? "alert" : "status",
      ariaLive: isUrgent ? "assertive" : "polite",
      style: {
        _notificationAccentColor
      }
    }, iconElement, div13({ class: "message" }, div13(message), progressBar), button11({
      class: "close",
      title: "close",
      ariaLabel: "Close notification",
      apply(elt) {
        elt.addEventListener("click", closeCallback);
      }
    }, icons.x()));
    singleton.shadowRoot.append(note);
    if (progressBar instanceof HTMLProgressElement && progress instanceof Function) {
      progressBar.setAttribute("max", String(100));
      progressBar.value = progress();
      const interval = setInterval(() => {
        if (!singleton.shadowRoot.contains(note)) {
          clearInterval(interval);
          return;
        }
        const percentage = progress();
        progressBar.value = percentage;
        if (percentage >= 100) {
          XinNotification.removeNote(note);
        }
      }, 1000);
    }
    if (duration > 0) {
      setTimeout(() => {
        XinNotification.removeNote(note);
      }, duration * 1000);
    }
    note.scrollIntoView();
    return closeCallback;
  }
  content = null;
}
var xinNotification = XinNotification.elementCreator({
  tag: "xin-notification"
});
function postNotification(spec) {
  return XinNotification.post(spec);
}
// src/password-strength.ts
var digest = async (s, method = "SHA-1") => {
  const encoder = new TextEncoder;
  const data = encoder.encode(s);
  const hashBuffer = await crypto.subtle.digest(method, data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b2) => b2.toString(16).padStart(2, "0")).join("");
  return hashHex;
};
var isBreached = async (password) => {
  const hashHex = await digest(password);
  const response = await fetch(`https://weakpass.com/api/v1/search/${hashHex}`);
  if (response.ok) {
    const result = await response.json();
    console.log("password found in weakpass database", result);
  }
  return response.status !== 404;
};
var { span: span11, xinSlot: xinSlot5 } = y;

class XinPasswordStrength extends F {
  static initAttributes = {
    minLength: 8,
    goodLength: 12,
    indicatorColors: "#f00,#f40,#f80,#ef0,#8f0,#0a2"
  };
  descriptionColors = "#000,#000,#000,#000,#000,#fff";
  issues = {
    tooShort: true,
    short: true,
    noUpper: true,
    noLower: true,
    noNumber: true,
    noSpecial: true
  };
  issueDescriptions = {
    tooShort: "too short",
    short: "short",
    noUpper: "no upper case",
    noLower: "no lower case",
    noNumber: "no digits",
    noSpecial: "no unusual characters"
  };
  value = 0;
  strengthDescriptions = [
    "unacceptable",
    "very weak",
    "weak",
    "moderate",
    "strong",
    "very strong"
  ];
  strength(password) {
    this.issues = {
      tooShort: password.length < this.minLength,
      short: password.length < this.goodLength,
      noUpper: !password.match(/[A-Z]/),
      noLower: !password.match(/[a-z]/),
      noNumber: !password.match(/[0-9]/),
      noSpecial: !password.match(/[^a-zA-Z0-9]/)
    };
    return this.issues.tooShort ? 0 : Object.values(this.issues).filter((v3) => !v3).length - 1;
  }
  async isBreached() {
    const password = this.querySelector("input")?.value;
    if (!password || typeof password !== "string") {
      return true;
    }
    return await isBreached(password);
  }
  updateIndicator = (password) => {
    const { level, description } = this.parts;
    const colors = this.indicatorColors.split(",");
    const descriptionColors = this.descriptionColors.split(",");
    const strength = this.strength(password);
    if (this.value !== strength) {
      this.value = strength;
      this.dispatchEvent(new Event("change"));
    }
    level.style.width = `${(strength + 1) * 16.67}%`;
    this.style.setProperty("--indicator-color", colors[strength]);
    this.style.setProperty("--description-color", descriptionColors[strength]);
    description.textContent = this.strengthDescriptions[strength];
  };
  update = (event) => {
    const input7 = event.target.closest("input");
    this.updateIndicator(input7?.value || "");
  };
  content = () => [
    xinSlot5({ onInput: this.update }),
    span11({ part: "meter" }, span11({ part: "level" }), span11({ part: "description" }))
  ];
  render() {
    super.render();
    const input7 = this.querySelector("input");
    this.updateIndicator(input7?.value);
  }
}
var xinPasswordStrength = XinPasswordStrength.elementCreator({
  tag: "xin-password-strength",
  styleSpec: {
    ":host": {
      display: "inline-flex",
      flexDirection: "column",
      gap: Uo.spacing50,
      position: "relative"
    },
    ":host xin-slot": {
      display: "flex"
    },
    ':host [part="meter"]': {
      display: "block",
      position: "relative",
      height: uo.meterHeight("24px"),
      background: uo.indicatorBg("white"),
      borderRadius: uo.meterRadius("4px"),
      boxShadow: uo.meterShadow(`inset 0 0 0 2px ${Uo.indicatorColor}`)
    },
    ':host [part="level"]': {
      height: uo.levelHeight("20px"),
      content: '" "',
      display: "inline-block",
      width: 0,
      transition: "0.15s ease-out",
      background: Uo.indicatorColor,
      margin: uo.levelMargin("2px"),
      borderRadius: uo.levelRadius("2px")
    },
    ':host [part="description"]': {
      position: "absolute",
      inset: "0",
      color: Uo.descriptionColor,
      height: uo.meterHeight("24px"),
      lineHeight: uo.meterHeight("24px"),
      textAlign: "center"
    }
  }
});
// src/rating.ts
var { span: span12 } = y;

class TosiRating extends F {
  static formAssociated = true;
  static initAttributes = {
    max: 5,
    min: 1,
    icon: "star",
    step: 1,
    ratingStroke: "#e81",
    ratingFill: "#f91",
    emptyStroke: "none",
    emptyFill: "#ccc",
    readonly: false,
    iconSize: 24,
    hollow: false,
    required: false,
    name: ""
  };
  value = "";
  formDisabledCallback(disabled) {
    this.readonly = disabled;
  }
  formResetCallback() {
    this.value = "";
  }
  static styleSpec = {
    ":host": {
      display: "inline-block",
      position: "relative",
      width: "fit-content"
    },
    ":host::part(container)": {
      position: "relative",
      display: "inline-block"
    },
    ":host::part(empty), :host::part(filled)": {
      height: "100%",
      whiteSpace: "nowrap",
      overflow: "hidden"
    },
    ":host::part(empty)": {
      pointerEvents: "none"
    },
    ":host::part(filled)": {
      position: "absolute",
      left: 0,
      transition: "width 0.15s ease-out"
    },
    ":host svg": {
      transform: "scale(0.9)",
      pointerEvents: "all !important",
      transition: "0.25s ease-in-out"
    },
    ":host svg:hover": {
      transform: "scale(1)"
    },
    ":host svg:active": {
      transform: "scale(1.1)"
    }
  };
  content = () => span12({ part: "container" }, span12({ part: "empty" }), span12({ part: "filled" }));
  displayValue(value) {
    const { empty, filled } = this.parts;
    const roundedValue = Math.round((value || 0) / this.step) * this.step;
    filled.style.width = roundedValue / this.max * empty.offsetWidth + "px";
  }
  update = (event) => {
    if (this.readonly) {
      return;
    }
    const { empty } = this.parts;
    const x3 = event instanceof MouseEvent ? event.pageX - empty.getBoundingClientRect().x : 0;
    const value = Math.min(Math.max(this.min, Math.round(x3 / empty.offsetWidth * this.max / this.step + this.step * 0.5) * this.step), this.max);
    if (event.type === "click") {
      this.value = value;
    } else if (event.type === "mousemove") {
      this.displayValue(value);
    } else {
      this.displayValue(this.value || 0);
    }
  };
  handleKey = (event) => {
    let value = Number(this.value);
    if (value === "" || value == null) {
      value = Math.round((this.min + this.max) * 0.5 * this.step) * this.step;
    }
    let blockEvent = false;
    switch (event.key) {
      case "ArrowUp":
      case "ArrowRight":
        value += this.step;
        blockEvent = true;
        break;
      case "ArrowDown":
      case "ArrowLeft":
        value -= this.step;
        blockEvent = true;
        break;
    }
    this.value = Math.max(Math.min(value, this.max), this.min);
    if (blockEvent) {
      event.stopPropagation();
      event.preventDefault();
    }
  };
  connectedCallback() {
    super.connectedCallback();
    const { container } = this.parts;
    container.tabIndex = 0;
    container.addEventListener("mousemove", this.update, true);
    container.addEventListener("mouseleave", this.update);
    container.addEventListener("blur", this.update);
    container.addEventListener("click", this.update);
    container.addEventListener("keydown", this.handleKey);
  }
  _renderedIcon = "";
  render() {
    super.render();
    const height = this.iconSize + "px";
    this.style.setProperty("--tosi-icon-size", height);
    if (this.readonly) {
      this.role = "image";
    } else {
      this.role = "slider";
    }
    this.ariaLabel = `rating ${this.value} out of ${this.max}`;
    this.ariaValueMax = String(this.max);
    this.ariaValueMin = String(this.min);
    this.ariaValueNow = this.value === "" ? String(-1) : String(this.value);
    const { empty, filled } = this.parts;
    empty.classList.toggle("hollow", this.hollow);
    empty.style.setProperty("--tosi-icon-fill", this.emptyFill);
    empty.style.setProperty("--tosi-icon-stroke", this.emptyStroke);
    filled.style.setProperty("--tosi-icon-fill", this.ratingFill);
    filled.style.setProperty("--tosi-icon-stroke", this.ratingStroke);
    if (this._renderedIcon !== this.icon) {
      this._renderedIcon = this.icon;
      for (let i = 0;i < this.max; i++) {
        empty.append(icons[this.icon]());
        filled.append(icons[this.icon]());
      }
    }
    this.displayValue(this.value);
  }
}
var XinRating = TosiRating;
var tosiRating = TosiRating.elementCreator({
  tag: "tosi-rating"
});
var xinRating = Ho((...args) => tosiRating(...args), "xinRating is deprecated, use tosiRating instead (tag is now <tosi-rating>)");
// src/rich-text.ts
var { xinSlot: xinSlot6, div: div14, button: button12, span: span13 } = y;
var blockStyles = [
  {
    caption: "Title",
    tagType: "H1"
  },
  {
    caption: "Heading",
    tagType: "H2"
  },
  {
    caption: "Subheading",
    tagType: "H3"
  },
  {
    caption: "Minor heading",
    tagType: "H4"
  },
  {
    caption: "Body",
    tagType: "P"
  },
  {
    caption: "Code Block",
    tagType: "PRE"
  }
];
function blockStyle(options = blockStyles) {
  return tosiSelect({
    title: "paragraph style",
    slot: "toolbar",
    class: "block-style",
    options: options.map(({ caption, tagType }) => ({
      caption,
      value: `formatBlock,${tagType}`
    }))
  });
}
function spacer(width = "10px") {
  return span13({
    slot: "toolbar",
    style: { flex: `0 0 ${width}`, content: " " }
  });
}
function elastic(width = "10px") {
  return span13({
    slot: "toolbar",
    style: { flex: `0 0 ${width}`, content: " " }
  });
}
function commandButton(title, dataCommand, icon) {
  return button12({ slot: "toolbar", dataCommand, title }, icon);
}
var paragraphStyleWidgets = () => [
  commandButton("left-justify", "justifyLeft", icons.alignLeft()),
  commandButton("center", "justifyCenter", icons.alignCenter()),
  commandButton("right-justify", "justifyRight", icons.alignRight()),
  spacer(),
  commandButton("bullet list", "insertUnorderedList", icons.listBullet()),
  commandButton("numbered list", "insertOrderedList", icons.listNumber()),
  spacer(),
  commandButton("indent", "indent", icons.indent()),
  commandButton("indent", "outdent", icons.outdent())
];
var characterStyleWidgets = () => [
  commandButton("bold", "bold", icons.fontBold()),
  commandButton("italic", "italic", icons.fontItalic()),
  commandButton("underline", "underline", icons.fontUnderline())
];
var minimalWidgets = () => [
  blockStyle(),
  spacer(),
  ...characterStyleWidgets()
];
var richTextWidgets = () => [
  blockStyle(),
  spacer(),
  ...paragraphStyleWidgets(),
  spacer(),
  ...characterStyleWidgets()
];

class RichText extends F {
  static formAssociated = true;
  static initAttributes = {
    widgets: "default",
    name: "",
    required: false
  };
  isInitialized = false;
  savedValue = "";
  formDisabledCallback(disabled) {
    if (this.isInitialized) {
      this.parts.doc.contentEditable = disabled ? "false" : "true";
    }
  }
  formResetCallback() {
    this.value = "";
  }
  _value = "";
  get value() {
    return this.isInitialized ? this.parts.doc.innerHTML : this._value;
  }
  set value(docHtml) {
    const oldValue = this._value;
    this._value = docHtml;
    if (this.isInitialized) {
      if (this.parts.doc.innerHTML !== docHtml) {
        this.parts.doc.innerHTML = docHtml;
      }
    }
    if (oldValue !== docHtml && this.internals) {
      this.internals.setFormValue(docHtml);
    }
  }
  blockElement(elt) {
    const { doc } = this.parts;
    while (elt.parentElement !== null && elt.parentElement !== doc) {
      elt = elt.parentElement;
    }
    return elt.parentElement === doc ? elt : undefined;
  }
  get selectedBlocks() {
    const { doc } = this.parts;
    const selObject = window.getSelection();
    if (selObject === null) {
      return [];
    }
    const blocks = [];
    for (let i = 0;i < selObject.rangeCount; i++) {
      const range = selObject.getRangeAt(i);
      if (!doc.contains(range.commonAncestorContainer)) {
        continue;
      }
      let block = this.blockElement(range.startContainer);
      const lastBlock = this.blockElement(range.endContainer);
      blocks.push(block);
      while (block !== lastBlock && block !== null) {
        block = block.nextElementSibling;
        blocks.push(block);
      }
    }
    return blocks;
  }
  get selectedText() {
    const selObject = window.getSelection();
    if (selObject === null) {
      return "";
    }
    return this.selectedBlocks.length ? selObject.toString() : "";
  }
  selectionChange = () => {};
  _updatingBlockStyle = false;
  handleSelectChange = (event) => {
    if (this._updatingBlockStyle) {
      return;
    }
    const target = event.target;
    const select = target?.closest(TosiSelect.tagName);
    if (select == null) {
      return;
    }
    this.doCommand(select.value);
  };
  handleButtonClick = (event) => {
    const target = event.target;
    const button13 = target?.closest("button");
    if (button13 == null) {
      return;
    }
    this.doCommand(button13.dataset.command);
  };
  content = [
    xinSlot6({
      name: "toolbar",
      part: "toolbar",
      onClick: this.handleButtonClick,
      onChange: this.handleSelectChange
    }),
    div14({
      part: "doc",
      contenteditable: true,
      style: {
        flex: "1 1 auto",
        outline: "none"
      }
    }),
    xinSlot6({
      part: "content"
    })
  ];
  doCommand(command) {
    if (command === undefined) {
      return;
    }
    const args = command.split(",");
    console.log("execCommand", args[0], false, ...args.slice(1));
    document.execCommand(args[0], false, ...args.slice(1));
  }
  updateBlockStyle() {
    const select = this.parts.toolbar.querySelector(".block-style");
    if (select === null) {
      return;
    }
    let blockTags = this.selectedBlocks.map((block) => block.tagName);
    blockTags = [...new Set(blockTags)];
    this._updatingBlockStyle = true;
    select.value = blockTags.length === 1 ? `formatBlock,${blockTags[0]}` : "";
    this._updatingBlockStyle = false;
  }
  hasContent() {
    const text = this.parts.doc.textContent || "";
    return text.trim().length > 0;
  }
  handleInput = () => {
    if (this.internals) {
      this.internals.setFormValue(this.parts.doc.innerHTML);
      this.updateValidity();
    }
  };
  updateValidity() {
    if (this.internals) {
      if (this.required && !this.hasContent()) {
        this.internals.setValidity({ valueMissing: true }, "Please enter some content", this.parts.doc);
      } else {
        this.internals.setValidity({});
      }
    }
  }
  connectedCallback() {
    super.connectedCallback();
    const { doc, content } = this.parts;
    if (content.innerHTML !== "" && doc.innerHTML === "") {
      doc.innerHTML = content.innerHTML;
      content.innerHTML = "";
    }
    this.isInitialized = true;
    content.style.display = "none";
    doc.addEventListener("input", this.handleInput);
    this.updateValidity();
    document.addEventListener("selectionchange", (event) => {
      this.updateBlockStyle();
      this.selectionChange(event, this);
    });
  }
  render() {
    const { toolbar } = this.parts;
    super.render();
    if (toolbar.children.length === 0) {
      switch (this.widgets) {
        case "minimal":
          toolbar.append(...minimalWidgets());
          break;
        case "default":
          toolbar.append(...richTextWidgets());
          break;
      }
    }
  }
}
var XinWord = RichText;
var tosiRichText = RichText.elementCreator({
  tag: "tosi-rich-text",
  styleSpec: {
    ":host": {
      display: "flex",
      flexDirection: "column",
      height: "100%"
    },
    ':host [part="toolbar"]': {
      padding: 4,
      display: "flex",
      gap: "0px",
      flex: "0 0 auto",
      flexWrap: "wrap"
    },
    ':host [part="toolbar"] > button': {
      _xinIconSize: 18
    }
  }
});
var richText = Ho((...args) => tosiRichText(...args), "richText is deprecated, use tosiRichText instead (tag is now <tosi-rich-text>)");
// src/segmented.ts
var { div: div15, slot: slot7, label: label3, span: span14, input: input7 } = y;

class TosiSegmented extends F {
  static formAssociated = true;
  static initAttributes = {
    direction: "row",
    other: "",
    multiple: false,
    name: "",
    placeholder: "Please specify…",
    localized: false,
    required: false
  };
  _choices = [];
  get choices() {
    return this._choices;
  }
  set choices(v3) {
    if (typeof v3 === "string") {
      this._choices = TosiSegmented.parseChoicesString(v3);
    } else {
      this._choices = v3;
    }
    this.queueRender();
  }
  static parseChoicesString(choicesStr) {
    return choicesStr.split(",").filter((c) => c.trim() !== "").map((c) => {
      const [value, remains] = c.split("=").map((v3) => v3.trim());
      const [caption, iconName] = (remains || value).split(":").map((v3) => v3.trim());
      const icon = iconName ? icons[iconName]() : "";
      return { value, icon, caption };
    });
  }
  value = "";
  formDisabledCallback(disabled) {}
  formResetCallback() {
    this.value = "";
  }
  get values() {
    return (this.value || "").split(",").map((v3) => v3.trim()).filter((v3) => v3 !== "");
  }
  content = () => [
    slot7(),
    div15({ part: "options" }, input7({ part: "custom", hidden: true }))
  ];
  static styleSpec = {
    ":host": {
      display: "inline-flex",
      gap: uo.segmentedOptionGap("8px"),
      alignItems: uo.segmentedAlignItems("center")
    },
    ":host, :host::part(options)": {
      flexDirection: uo.segmentedDirection("row")
    },
    ":host label": {
      display: "inline-grid",
      alignItems: "center",
      gap: uo.segmentedOptionGap("8px"),
      gridTemplateColumns: uo.segmentedOptionGridColumns("0px 24px 1fr"),
      padding: uo.segmentedOptionPadding("4px 12px"),
      font: uo.segmentedOptionFont("16px")
    },
    ":host label:focus": {
      outline: "none",
      boxShadow: uo.segmentedFocusShadow(`inset 0 0 0 2px ${uo.segmentedOptionCurrentBackground("#44a")}`),
      borderRadius: uo.segmentedOptionsBorderRadius("8px")
    },
    ":host label:has(:checked)": {
      color: uo.segmentedOptionCurrentColor("#eee"),
      background: uo.segmentedOptionCurrentBackground("#44a")
    },
    ":host label:has(:checked):focus": {
      boxShadow: uo.segmentedCurrentFocusShadow(`inset 0 0 0 2px ${uo.segmentedOptionCurrentColor("#eee")}`)
    },
    ":host svg": {
      height: uo.segmentOptionIconSize("16px"),
      stroke: uo.segmentedOptionIconColor("currentColor")
    },
    ":host label.no-icon": {
      gap: 0,
      gridTemplateColumns: uo.segmentedOptionGridColumns("0px 1fr")
    },
    ':host input[type="radio"], :host input[type="checkbox"]': {
      visibility: uo.segmentedInputVisibility("hidden")
    },
    ":host::part(options)": {
      display: "flex",
      borderRadius: uo.segmentedOptionsBorderRadius("8px"),
      background: uo.segmentedOptionsBackground("#fff"),
      color: uo.segmentedOptionColor("#222"),
      overflow: "hidden",
      alignItems: uo.segmentedOptionAlignItems("stretch")
    },
    ":host::part(custom)": {
      padding: uo.segmentedOptionPadding("4px 12px"),
      color: uo.segmentedOptionCurrentColor("#eee"),
      background: uo.segmentedOptionCurrentBackground("#44a"),
      font: uo.segmentedOptionFont("16px"),
      border: "0",
      outline: "none"
    },
    ":host::part(custom)::placeholder": {
      color: uo.segmentedOptionCurrentColor("#eee"),
      opacity: uo.segmentedPlaceholderOpacity(0.75)
    }
  };
  valueChanged = false;
  handleChange = () => {
    const { options, custom } = this.parts;
    if (this.multiple) {
      const inputs = [
        ...options.querySelectorAll("input:checked")
      ];
      this.value = inputs.map((input8) => input8.value).join(",");
    } else {
      const input8 = options.querySelector("input:checked");
      if (!input8) {
        this.value = "";
      } else if (input8.value) {
        custom.setAttribute("hidden", "");
        this.value = input8.value;
      } else {
        custom.removeAttribute("hidden");
        custom.focus();
        custom.select();
        this.value = custom.value;
      }
    }
    this.valueChanged = true;
  };
  handleKey = (event) => {
    let blockEvent = false;
    switch (event.code) {
      case "Space":
        if (event.target instanceof HTMLLabelElement) {
          event.target.click();
          blockEvent = true;
        }
        break;
      case "Tab":
        if (!(event.target instanceof HTMLLabelElement)) {
          const label4 = event.target.closest("label");
          label4.focus();
        }
        break;
      case "ArrowLeft":
      case "ArrowUp":
        {
          const label4 = event.target.closest("label");
          if (label4.previousElementSibling instanceof HTMLLabelElement) {
            label4.previousElementSibling.focus();
          }
        }
        blockEvent = true;
        break;
      case "ArrowRight":
      case "ArrowDown":
        {
          const label4 = event.target.closest("label");
          if (label4.nextElementSibling instanceof HTMLLabelElement) {
            label4.nextElementSibling.focus();
          }
        }
        blockEvent = true;
        break;
    }
    if (blockEvent) {
      event.preventDefault();
      event.stopPropagation();
    }
  };
  connectedCallback() {
    super.connectedCallback();
    const choicesAttr = this.getAttribute("choices");
    if (choicesAttr && this._choices.length === 0) {
      this._choices = TosiSegmented.parseChoicesString(choicesAttr);
    }
    const { options } = this.parts;
    if (this.name === "") {
      this.name = this.instanceId;
    }
    options.addEventListener("change", this.handleChange);
    options.addEventListener("keydown", this.handleKey);
    if (this.other && this.multiple) {
      console.warn(this, "is set to [other] and [multiple]; [other] will be ignored");
      this.other = "";
    }
  }
  get _choicesWithOther() {
    const options = [...this.choices];
    if (this.other && !this.multiple) {
      const [caption, icon] = this.other.split(":");
      options.push({
        value: "",
        caption,
        icon
      });
    }
    return options;
  }
  get isOtherValue() {
    return Boolean(this.value === "" || this.value && !this._choicesWithOther.find((choice) => choice.value === this.value));
  }
  render() {
    super.render();
    if (this.valueChanged) {
      this.valueChanged = false;
      return;
    }
    const { options, custom } = this.parts;
    options.textContent = "";
    const type = this.multiple ? "checkbox" : "radio";
    const { values, isOtherValue } = this;
    options.append(...this._choicesWithOther.map((choice) => {
      return label3({ tabindex: 0 }, input7({
        type,
        name: this.name,
        value: choice.value,
        checked: values.includes(choice.value) || choice.value === "" && isOtherValue,
        tabIndex: -1
      }), choice.icon || { class: "no-icon" }, this.localized ? xinLocalized(choice.caption) : span14(choice.caption));
    }));
    if (this.other && !this.multiple) {
      custom.hidden = !isOtherValue;
      custom.value = isOtherValue ? this.value : "";
      custom.placeholder = this.placeholder;
      options.append(custom);
    }
  }
}
var XinSegmented = TosiSegmented;
var tosiSegmented = TosiSegmented.elementCreator({
  tag: "tosi-segmented"
});
var xinSegmented = Ho((...args) => tosiSegmented(...args), "xinSegmented is deprecated, use tosiSegmented instead (tag is now <tosi-segmented>)");
// src/size-break.ts
var { slot: slot8 } = y;

class SizeBreak extends F {
  static initAttributes = {
    minWidth: 0,
    minHeight: 0
  };
  value = "normal";
  content = [slot8({ part: "normal" }), slot8({ part: "small", name: "small" })];
  static styleSpec = {
    ":host": {
      display: "inline-block",
      position: "relative"
    }
  };
  onResize = () => {
    const { normal, small } = this.parts;
    const parent = this.offsetParent;
    if (!(parent instanceof HTMLElement)) {
      return;
    } else if (parent.offsetWidth < this.minWidth || parent.offsetHeight < this.minHeight) {
      normal.hidden = true;
      small.hidden = false;
      this.value = "small";
    } else {
      normal.hidden = false;
      small.hidden = true;
      this.value = "normal";
    }
  };
  connectedCallback() {
    super.connectedCallback();
    globalThis.addEventListener("resize", this.onResize);
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    globalThis.removeEventListener("resize", this.onResize);
  }
}
var sizeBreak = SizeBreak.elementCreator({
  tag: "xin-sizebreak"
});
// src/sizer.ts
class XinSizer extends F {
  target = null;
  static styleSpec = {
    ":host": {
      _resizeIconFill: "#222",
      display: "block",
      position: "absolute",
      bottom: -7,
      right: -7,
      padding: 14,
      width: 44,
      height: 44,
      opacity: 0.25,
      transition: "opacity 0.25s ease-out"
    },
    ":host(:hover)": {
      opacity: 0.5
    },
    ":host svg": {
      width: 16,
      height: 16,
      stroke: Uo.resizeIconFill
    }
  };
  content = icons.resize();
  get minSize() {
    const { minWidth, minHeight } = getComputedStyle(this.target);
    return {
      width: parseFloat(minWidth) || 32,
      height: parseFloat(minHeight) || 32
    };
  }
  resizeTarget = (event) => {
    const { target } = this;
    if (!target)
      return;
    const w2 = target.offsetWidth;
    const h = target.offsetHeight;
    target.style.left = target.offsetLeft + "px";
    target.style.top = target.offsetTop + "px";
    target.style.bottom = "";
    target.style.right = "";
    const { minSize } = this;
    trackDrag(event, (dx, dy, event2) => {
      target.style.width = Math.max(minSize.width, w2 + dx) + "px";
      target.style.height = Math.max(minSize.height, h + dy) + "px";
      if (event2.type === "mouseup") {
        return true;
      }
    }, "nwse-resize");
  };
  connectedCallback() {
    super.connectedCallback();
    if (!this.target) {
      this.target = this.parentElement;
    }
    const PASSIVE2 = { passive: true };
    this.addEventListener("mousedown", this.resizeTarget, PASSIVE2);
    this.addEventListener("touchstart", this.resizeTarget, PASSIVE2);
  }
}
var xinSizer = XinSizer.elementCreator({
  tag: "xin-sizer"
});
// src/tag-list.ts
var { div: div16, input: input8, span: span15, button: button13 } = y;

class TosiTag extends F {
  static initAttributes = {
    caption: "",
    removeable: false
  };
  removeCallback = () => {
    this.remove();
  };
  content = () => [
    span15({ part: "caption" }, this.caption),
    button13(icons.x(), {
      type: "button",
      part: "remove",
      hidden: !this.removeable,
      ariaLabel: `Remove ${this.caption}`,
      onClick: this.removeCallback
    })
  ];
}
var XinTag = TosiTag;
var tosiTag = TosiTag.elementCreator({
  tag: "tosi-tag",
  styleSpec: {
    ":host": {
      "--tag-close-button-color": "#000c",
      "--tag-close-button-bg": "#fffc",
      "--tag-button-opacity": "0.5",
      "--tag-button-hover-opacity": "0.75",
      "--tag-bg": uo.brandColor("blue"),
      "--tag-text-color": uo.brandTextColor("white"),
      display: "inline-flex",
      borderRadius: uo.tagRoundedRadius(Uo.spacing50),
      color: Uo.tagTextColor,
      background: Uo.tagBg,
      padding: `0 ${Uo.spacing75} 0 ${Uo.spacing75}`,
      height: `calc(${Uo.lineHeight} + ${Uo.spacing50})`,
      lineHeight: `calc(${Uo.lineHeight} + ${Uo.spacing50})`
    },
    ':host > [part="caption"]': {
      position: "relative",
      whiteSpace: "nowrap",
      overflow: "hidden",
      flex: "1 1 auto",
      fontSize: uo.fontSize("16px"),
      color: Uo.tagTextColor,
      textOverflow: "ellipsis"
    },
    ':host [part="remove"]': {
      boxShadow: "none",
      margin: `0 ${Uo.spacing_50} 0 ${Uo.spacing25}`,
      padding: 0,
      display: "inline-flex",
      alignItems: "center",
      alignSelf: "center",
      justifyContent: "center",
      height: Uo.spacing150,
      width: Uo.spacing150,
      color: Uo.tagCloseButtonColor,
      background: Uo.tagCloseButtonBg,
      borderRadius: uo.tagCloseButtonRadius("99px"),
      opacity: Uo.tagButtonOpacity
    },
    ':host [part="remove"]:hover': {
      background: Uo.tagCloseButtonBg,
      opacity: Uo.tagButtonHoverOpacity
    }
  }
});
var xinTag = Ho((...args) => tosiTag(...args), "xinTag is deprecated, use tosiTag instead (tag is now <tosi-tag>)");

class TosiTagList extends F {
  static formAssociated = true;
  static initAttributes = {
    name: "",
    textEntry: false,
    editable: false,
    placeholder: "enter tags",
    disabled: false,
    required: false
  };
  value = "";
  get tags() {
    return this.value.split(",").map((tag) => tag.trim()).filter((tag) => tag !== "");
  }
  set tags(v3) {
    this.value = v3.join(",");
  }
  _availableTags = [];
  get availableTags() {
    return this._availableTags;
  }
  set availableTags(v3) {
    if (typeof v3 === "string") {
      this._availableTags = TosiTagList.parseAvailableTagsString(v3);
    } else {
      this._availableTags = v3;
    }
    this.queueRender();
  }
  static parseAvailableTagsString(tagsStr) {
    return tagsStr.split(",").map((tag) => {
      const trimmed = tag.trim();
      return trimmed === "" ? null : trimmed;
    });
  }
  connectedCallback() {
    super.connectedCallback();
    const tagsAttr = this.getAttribute("available-tags");
    if (tagsAttr && this._availableTags.length === 0) {
      this._availableTags = TosiTagList.parseAvailableTagsString(tagsAttr);
    }
  }
  formDisabledCallback(disabled) {
    this.disabled = disabled;
  }
  formResetCallback() {
    this.value = "";
  }
  addTag = (tag) => {
    const trimmed = tag.trim();
    if (trimmed === "" || this.tags.includes(trimmed)) {
      return;
    }
    this.tags = [...this.tags, trimmed];
    this.queueRender(true);
  };
  toggleTag = (toggled) => {
    if (this.tags.includes(toggled)) {
      this.tags = this.tags.filter((t) => t !== toggled);
      this.queueRender(true);
    } else {
      this.addTag(toggled);
    }
  };
  enterTag = (event) => {
    const { tagInput } = this.parts;
    switch (event.key) {
      case ",":
        {
          const tag = tagInput.value.split(",")[0];
          this.addTag(tag);
        }
        break;
      case "Enter":
        {
          const tag = tagInput.value.split(",")[0];
          this.addTag(tag);
        }
        event.stopPropagation();
        event.preventDefault();
        break;
      default:
    }
  };
  popSelectMenu = () => {
    const { toggleTag } = this;
    const { tagMenu } = this.parts;
    const tags = [...this.availableTags];
    const extraTags = this.tags.filter((tag) => !tags.includes(tag));
    if (extraTags.length) {
      tags.push(null, ...extraTags);
    }
    const menuItems = tags.map((tag) => {
      if (tag === "" || tag === null) {
        return null;
      } else if (typeof tag === "object") {
        return {
          checked: () => this.tags.includes(tag.value),
          caption: tag.caption,
          action() {
            toggleTag(tag.value);
          }
        };
      } else {
        return {
          checked: () => this.tags.includes(tag),
          caption: tag,
          action() {
            toggleTag(tag);
          }
        };
      }
    });
    popMenu({
      target: tagMenu,
      width: "auto",
      menuItems
    });
  };
  content = () => [
    button13({ type: "button", style: { visibility: "hidden" }, tabindex: -1 }),
    div16({
      part: "tagContainer",
      class: "row",
      role: "list",
      ariaLabel: "Selected tags"
    }),
    input8({
      part: "tagInput",
      class: "elastic",
      ariaLabel: "Enter new tag",
      onKeydown: this.enterTag
    }),
    button13({
      type: "button",
      title: "add tag",
      ariaLabel: "Select tags from list",
      ariaHaspopup: "listbox",
      part: "tagMenu",
      onClick: this.popSelectMenu
    }, icons.chevronDown())
  ];
  removeTag = (event) => {
    if (this.editable && !this.disabled) {
      const tag = event.target.closest(TosiTag.tagName);
      this.tags = this.tags.filter((t) => t !== tag.caption);
      tag.remove();
      this.queueRender(true);
    }
    event.stopPropagation();
    event.preventDefault();
  };
  render() {
    super.render();
    const { tagContainer, tagMenu, tagInput } = this.parts;
    tagMenu.disabled = this.disabled;
    tagInput.value = "";
    tagInput.setAttribute("placeholder", this.placeholder);
    if (this.editable && !this.disabled) {
      tagMenu.toggleAttribute("hidden", false);
      tagInput.toggleAttribute("hidden", !this.textEntry);
    } else {
      tagMenu.toggleAttribute("hidden", true);
      tagInput.toggleAttribute("hidden", true);
    }
    tagContainer.textContent = "";
    for (const tag of this.tags) {
      tagContainer.append(tosiTag({
        caption: tag,
        removeable: this.editable && !this.disabled,
        removeCallback: this.removeTag
      }));
    }
  }
}
var XinTagList = TosiTagList;
var tosiTagList = TosiTagList.elementCreator({
  tag: "tosi-tag-list",
  styleSpec: {
    ":host": {
      "--tag-list-bg": "#f8f8f8",
      "--touch-size": "44px",
      "--spacing": "16px",
      display: "grid",
      gridTemplateColumns: "auto",
      alignItems: "center",
      background: Uo.tagListBg,
      gap: Uo.spacing25,
      borderRadius: uo.taglistRoundedRadius(Uo.spacing50),
      overflow: "hidden"
    },
    ":host[editable]": {
      gridTemplateColumns: `0px auto ${Uo.touchSize}`
    },
    ":host[editable][text-entry]": {
      gridTemplateColumns: `0px 2fr 1fr ${Uo.touchSize}`
    },
    ':host [part="tagContainer"]': {
      display: "flex",
      content: '" "',
      alignItems: "center",
      background: Uo.inputBg,
      borderRadius: uo.tagContainerRadius(Uo.spacing50),
      boxShadow: Uo.borderShadow,
      flexWrap: "nowrap",
      overflow: "auto hidden",
      gap: Uo.spacing25,
      minHeight: `calc(${Uo.lineHeight} + ${Uo.spacing})`,
      padding: Uo.spacing25
    },
    ':host [part="tagMenu"]': {
      width: Uo.touchSize,
      height: Uo.touchSize,
      lineHeight: Uo.touchSize,
      textAlign: "center",
      padding: 0,
      margin: 0
    },
    ":host [hidden]": {
      display: "none !important"
    },
    ':host button[part="tagMenu"]': {
      background: Uo.brandColor,
      color: Uo.brandTextColor
    }
  }
});
var xinTagList = Ho((...args) => tosiTagList(...args), "xinTagList is deprecated, use tosiTagList instead (tag is now <tosi-tag-list>)");
// src/version.ts
var version = "1.1.1";
// src/theme.ts
var defaultColors = {
  accent: l.fromCss("#EE257B"),
  background: l.fromCss("#fafafa"),
  text: l.fromCss("#222222")
};
var baseVariables = {
  _tosiSpacingXs: "4px",
  _tosiSpacingSm: "8px",
  _tosiSpacing: "12px",
  _tosiSpacingLg: "16px",
  _tosiSpacingXl: "24px",
  _tosiFontFamily: "system-ui, -apple-system, sans-serif",
  _tosiFontSize: "16px",
  _tosiLineHeight: "1.5",
  _tosiCodeFontFamily: "ui-monospace, monospace",
  _tosiCodeFontSize: "14px",
  _tosiTouchSize: "44px",
  _tosiBorderRadius: "4px",
  _tosiBorderRadiusLg: "8px",
  _tosiTransition: "0.15s ease-out"
};
function createColorVariables(colors) {
  const { accent, background, text } = colors;
  const accentText = colors.accentText ?? accent.contrasting();
  const backgroundInset = colors.backgroundInset ?? background.darken(0.03);
  const border = colors.border ?? text.opacity(0.15);
  const shadow = colors.shadow ?? text.opacity(0.1);
  const focus = colors.focus ?? accent.opacity(0.5);
  return {
    _tosiAccent: accent,
    _tosiAccentLight: accent.brighten(0.15),
    _tosiAccentDark: accent.darken(0.15),
    _tosiAccentText: accentText,
    _tosiBg: background,
    _tosiBgInset: backgroundInset,
    _tosiBgHover: background.darken(0.05),
    _tosiBgActive: background.darken(0.1),
    _tosiText: text,
    _tosiTextMuted: text.opacity(0.6),
    _tosiTextDisabled: text.opacity(0.4),
    _tosiBorder: border,
    _tosiBorderFocus: accent,
    _tosiShadow: shadow,
    _tosiShadowColor: shadow,
    _tosiFocusRing: `0 0 0 2px ${focus}`,
    _tosiInputBg: background,
    _tosiInputBorder: border,
    _tosiInputBorderFocus: accent,
    _tosiButtonBg: background,
    _tosiButtonText: text,
    _tosiButtonBorder: border,
    _tosiButtonHoverBg: background.darken(0.05),
    _tosiButtonActiveBg: accent,
    _tosiButtonActiveText: accentText
  };
}
function createTheme(colors) {
  return {
    ":root": {
      ...baseVariables,
      ...createColorVariables(colors)
    }
  };
}
function createDarkTheme(colors) {
  const lightTheme = createTheme(colors);
  const rootStyles = lightTheme[":root"];
  return {
    ":root": cn(rootStyles)
  };
}
function applyTheme(theme, id = "tosi-theme") {
  nn(id, theme);
}
var baseTheme = createTheme(defaultColors);
var baseDarkTheme = createDarkTheme(defaultColors);
var legacyAliases = {
  "--xin-icon-size": Uo.tosiIconSize,
  "--xin-icon-fill": Uo.tosiIconFill,
  "--xin-icon-stroke": Uo.tosiIconStroke,
  "--xin-tabs-bar-color": Uo.tosiTabsBarColor,
  "--xin-tabs-bar-height": Uo.tosiTabsBarHeight,
  "--xin-tabs-selected-color": Uo.tosiTabsSelectedColor,
  "--spacing": Uo.tosiSpacing,
  "--gap": Uo.tosiSpacingSm,
  "--touch-size": Uo.tosiTouchSize,
  "--background": Uo.tosiBg,
  "--text-color": Uo.tosiText,
  "--brand-color": Uo.tosiAccent,
  "--brand-text-color": Uo.tosiAccentText
};
function createThemeWithLegacy(colors) {
  const theme = createTheme(colors);
  return {
    ":root": {
      ...theme[":root"],
      ...legacyAliases
    }
  };
}
function componentVars(componentName, defaults) {
  const result = {};
  for (const [key, value] of Object.entries(defaults)) {
    const varName = `--tosi-${componentName}-${key.replace(/([A-Z])/g, "-$1").toLowerCase()}`;
    result[key] = `var(${varName}, ${value})`;
  }
  return result;
}
// demo/src/style.ts
var brandColor = l.fromCss("#EE257B");
var colors = {
  _textColor: "#222",
  _brandColor: brandColor,
  _background: "#fafafa",
  _buttonBg: "#fdfdfd",
  _inputBg: "#fdfdfd",
  _backgroundShaded: "#f5f5f5",
  _navBg: brandColor.rotate(30).desaturate(0.5).brighten(0.9),
  _barColor: brandColor.opacity(0.4),
  _focusColor: brandColor.opacity(0.7),
  _placeholderColor: brandColor.opacity(0.4),
  _brandTextColor: brandColor.rotate(30).brighten(0.9),
  _insetBg: brandColor.rotate(45).brighten(0.8),
  _codeBg: brandColor.rotate(-15).desaturate(0.5).brighten(0.9),
  _linkColor: brandColor.rotate(-30).darken(0.5),
  _shadowColor: "#0004",
  _menuBg: "#fafafa",
  _menuItemActiveColor: "#000",
  _menuItemIconActiveColor: "#000",
  _menuItemActiveBg: "#aaa",
  _menuItemHoverBg: "#eee",
  _menuItemColor: "#222",
  _menuSeparatorColor: "#2224",
  _menuShadow: "0 4px 8px #0004",
  _scrollThumbColor: "#0006",
  _scrollBarColor: "#0001",
  _inputBorderShadow: "inset 0 0 2px #0006"
};
var styleSpec = {
  "@import": "https://fonts.googleapis.com/css2?family=Aleo:ital,wght@0,100..900;1,100..900&famiSpline+Sans+Mono:ital,wght@0,300..700;1,300..700&display=swap",
  ":root": {
    _fontFamily: "'Aleo', sans-serif",
    _codeFontFamily: "'Spline Sans Mono', monospace",
    _fontSize: "16px",
    _codeFontSize: "14px",
    ...colors,
    _spacing: "10px",
    _lineHeight: "calc(var(--font-size) * 1.6)",
    _h1Scale: "2",
    _h2Scale: "1.5",
    _h3Scale: "1.25",
    _touchSize: "32px",
    _headerHeight: "calc( var(--line-height) * var(--h2-scale) + var(--spacing) * 2 )"
  },
  "@media (prefers-color-scheme: dark)": {
    body: {
      _darkmode: "true"
    }
  },
  ".darkmode": {
    ...cn(colors),
    _shadowColor: brandColor.opacity(0.5),
    _menuShadow: `0 0 0 2px ${brandColor.opacity(0.75)}`,
    _menuSeparatorColor: brandColor.opacity(0.5)
  },
  ".high-contrast": {
    filter: "contrast(2)"
  },
  "*": {
    boxSizing: "border-box",
    scrollbarColor: `${Uo.scrollThumbColor} ${Uo.scrollBarColor}`,
    scrollbarWidth: "thin"
  },
  body: {
    fontFamily: Uo.fontFamily,
    fontSize: Uo.fontSize,
    margin: "0",
    lineHeight: Uo.lineHeight,
    background: Uo.background,
    _xinTabsSelectedColor: Uo.brandColor,
    _xinTabsBarColor: Uo.brandTextColor,
    _menuItemIconColor: Uo.brandColor,
    color: Uo.textColor
  },
  ".center": {
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },
  "input, button, select, textarea": {
    fontFamily: Uo.fontFamily,
    fontSize: Uo.fontSize,
    color: "currentColor",
    background: Uo.inputBg
  },
  select: {
    WebkitAppearance: "none",
    appearance: "none"
  },
  header: {
    background: Uo.brandColor,
    color: Uo.brandTextColor,
    _textColor: Uo.brandTextColor,
    _linkColor: Uo.transTextColor,
    display: "flex",
    alignItems: "center",
    padding: "0 var(--spacing)",
    lineHeight: "calc(var(--line-height) * var(--h1-scale))",
    height: Uo.headerHeight,
    whiteSpace: "nowrap"
  },
  h1: {
    color: Uo.brandColor,
    fontSize: "calc(var(--font-size) * var(--h1-scale))",
    lineHeight: "calc(var(--line-height) * var(--h1-scale))",
    fontWeight: "400",
    borderBottom: `4px solid ${Uo.barColor}`,
    margin: `${Uo.spacing} 0 ${Uo.spacing200}`,
    padding: 0
  },
  "header h2": {
    color: Uo.brandTextColor,
    whiteSpace: "nowrap"
  },
  h2: {
    color: Uo.brandColor,
    fontSize: "calc(var(--font-size) * var(--h2-scale))",
    lineHeight: "calc(var(--line-height) * var(--h2-scale))",
    margin: "calc(var(--spacing) * var(--h2-scale)) 0"
  },
  h3: {
    fontSize: "calc(var(--font-size) * var(--h3-scale))",
    lineHeight: "calc(var(--line-height) * var(--h3-scale))",
    margin: "calc(var(--spacing) * var(--h3-scale)) 0"
  },
  main: {
    alignItems: "stretch",
    display: "flex",
    flexDirection: "column",
    maxWidth: "100vw",
    height: "100vh",
    overflow: "hidden"
  },
  "main > xin-sidenav": {
    height: "calc(100vh - var(--header-height))"
  },
  "main > xin-sidenav::part(nav)": {
    background: Uo.navBg
  },
  "input[type=search]": {
    borderRadius: 99
  },
  blockquote: {
    position: "relative",
    background: Uo.insetBg,
    margin: "0 48px 56px 0",
    borderRadius: Uo.spacing,
    padding: "var(--spacing) calc(var(--spacing) * 2)",
    filter: `drop-shadow(0px 1px 1px ${Uo.shadowColor})`
  },
  "blockquote > :first-child": {
    marginTop: "0"
  },
  "blockquote > :last-child": {
    marginBottom: "0"
  },
  "blockquote::before": {
    content: '" "',
    display: "block",
    width: 1,
    height: 1,
    border: "10px solid transparent",
    borderTopColor: Uo.insetBg,
    borderRightColor: Uo.insetBg,
    position: "absolute",
    bottom: -20,
    right: 24
  },
  "blockquote::after": {
    content: '" "',
    width: 48,
    height: 48,
    display: "block",
    bottom: -48,
    right: -24,
    position: "absolute",
    background: svg2DataUrl(icons.tosi(), undefined, undefined, 2)
  },
  ".bar": {
    display: "flex",
    gap: Uo.spacing,
    justifyContent: "center",
    alignItems: "center",
    padding: Uo.spacing,
    flexWrap: "wrap",
    _textColor: Uo.brandColor,
    background: Uo.barColor
  },
  a: {
    textDecoration: "none",
    color: Uo.linkColor,
    opacity: "0.9",
    borderBottom: "1px solid var(--brand-color)"
  },
  "button, select, .clickable": {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "ease-out 0.2s",
    _textColor: Uo.brandColor,
    color: Uo.textColor,
    textDecoration: "none",
    background: Uo.buttonBg,
    padding: "0 calc(var(--spacing) * 1.25)",
    border: "none",
    borderRadius: "calc(var(--spacing) * 0.5)"
  },
  "button, select, .clickable, input": {
    lineHeight: "calc(var(--line-height) + var(--spacing))"
  },
  "select:has(+ .icon-chevron-down)": {
    paddingRight: "calc(var(--spacing) * 2.7)"
  },
  "select + .icon-chevron-down": {
    marginLeft: "calc(var(--spacing) * -2.7)",
    width: "calc(var(--spacing) * 2.7)",
    alignSelf: "center",
    pointerEvents: "none",
    objectPosition: "left center",
    _textColor: Uo.brandColor
  },
  "label > select + .icon-chevron-down": {
    marginLeft: "calc(var(--spacing) * -3.5)"
  },
  "input, textarea": {
    border: "none",
    outline: "none",
    borderRadius: "calc(var(--spacing) * 0.5)",
    boxShadow: Uo.inputBorderShadow
  },
  input: {
    padding: "0 calc(var(--spacing) * 1.5)"
  },
  "input[type=color], input[type=range]": {
    boxShadow: "none"
  },
  textarea: {
    padding: "var(--spacing) calc(var(--spacing) * 1.25)",
    lineHeight: Uo.lineHeight,
    minHeight: "calc(var(--spacing) + var(--line-height) * 4)"
  },
  "input[type='number']": {
    paddingRight: 0,
    width: "6em",
    textAlign: "right"
  },
  "input[type=number]::-webkit-inner-spin-button": {
    margin: "1px 3px 1px 0.5em",
    opacity: 1,
    inset: 1
  },
  "input[type='checkbox'], input[type='radio']": {
    maxWidth: Uo.lineHeight
  },
  "::placeholder": {
    color: Uo.placeholderColor
  },
  img: {
    verticalAlign: "middle"
  },
  "button:hover, button:hover, .clickable:hover": {
    boxShadow: "inset 0 0 0 2px var(--brand-color)"
  },
  "button:active, button:active, .clickable:active": {
    background: Uo.brandColor,
    color: Uo.brandTextColor
  },
  label: {
    display: "inline-flex",
    gap: "calc(var(--spacing) * 0.5)",
    alignItems: "center"
  },
  ".elastic": {
    flex: "1 1 auto",
    overflow: "hidden",
    position: "relative"
  },
  svg: {
    fill: "currentColor",
    pointerEvents: "none"
  },
  "svg text": {
    fontSize: "16px",
    fontWeight: "bold",
    stroke: "#fff8",
    strokeWidth: "0.5",
    opacity: "0"
  },
  "svg text.hover": {
    opacity: "1"
  },
  ".thead": {
    background: Uo.brandColor,
    color: Uo.brandTextColor
  },
  ".th + .th": {
    border: "1px solid #fff4",
    borderWidth: "0 1px"
  },
  ".th, .td": {
    padding: "0 var(--spacing)"
  },
  ".tr:not([aria-selected]):hover": {
    background: "#08835810"
  },
  "[aria-selected]": {
    background: "#08835820"
  },
  ":disabled": {
    opacity: "0.5",
    filter: "saturate(0)",
    pointerEvents: "none"
  },
  pre: {
    background: Uo.codeBg,
    padding: Uo.spacing,
    borderRadius: "calc(var(--spacing) * 0.25)",
    overflow: "auto",
    fontSize: Uo.codeFontSize,
    lineHeight: "calc(var(--font-size) * 1.2)"
  },
  "pre, code": {
    fontFamily: Uo.codeFontFamily,
    _textColor: Uo.brandColor
  },
  ".-xin-sidenav-visible .close-content": {
    display: "none"
  },
  ".transparent, .iconic": {
    background: "none"
  },
  ".iconic": {
    padding: "0",
    fontSize: "150%",
    height: "calc(var(--line-height) + var(--spacing))",
    lineHeight: "calc(var(--line-height) + var(--spacing))",
    width: "calc(var(--line-height) + var(--spacing))",
    textAlign: "center"
  },
  ".transparent:hover, .iconic:hover": {
    background: "#0002",
    boxShadow: "none",
    color: Uo.textColor
  },
  ".transparent:active, .iconic:active": {
    background: "#0004",
    boxShadow: "none",
    color: Uo.textColor
  },
  "xin-sidenav:not([compact]) .show-within-compact": {
    display: "none"
  },
  ".on.on": {
    background: Uo.brandColor,
    _textColor: Uo.brandTextColor
  },
  ".current": {
    background: Uo.background
  },
  ".doc-link": {
    cursor: "pointer",
    borderBottom: "none",
    transition: "0.15s ease-out",
    marginLeft: "20px",
    padding: "calc(var(--spacing) * 0.5) calc(var(--spacing) * 1.5)"
  },
  ".doc-link:not(.current):hover": {
    background: Uo.background
  },
  ".doc-link:not(.current)": {
    opacity: "0.8",
    marginLeft: 0
  },
  "xin-example": {
    margin: "var(--spacing) 0"
  },
  "xin-example [part=editors]": {
    background: Uo.insetBg
  },
  "[class*='icon-'], xin-icon": {
    color: "currentcolor",
    height: Uo.fontSize,
    pointerEvents: "none"
  },
  "[class*='icon-']": {
    verticalAlign: "middle"
  },
  ".icon-plus": {
    content: "'+'"
  },
  table: {
    borderCollapse: "collapse"
  },
  thead: {
    background: Uo.brandColor,
    color: Uo.brandTextColor
  },
  tbody: {
    background: Uo.background
  },
  "tr:nth-child(2n)": {
    background: Uo.backgroundShaded
  },
  "th, td": {
    padding: "calc(var(--spacing) * 0.5) var(--spacing)"
  },
  "header xin-locale-picker xin-select button": {
    color: "currentcolor",
    background: "transparent",
    gap: "2px"
  },
  "img.logo, xin-icon.logo": {
    animation: "2s ease-in-out 0s infinite alternate logo-swing"
  },
  "@keyframes logo-swing": {
    "0%": {
      transform: "perspective(1000px) rotateY(15deg)"
    },
    "100%": {
      transform: "perspective(1000px) rotateY(-15deg)"
    }
  }
};

// demo/src/localized-strings.ts
var localized_strings_default = `en-US	fr	fi	sv	zh	ja	ko	es	de	it
English	French	Finnish	Swedish	Chinese	Japanese	Korean	Spanish	German	Italian
English	Français	suomi	Svenska	中国人	日本語	한국인	Español	Deutsch	Italiano
\uD83C\uDDFA\uD83C\uDDF8	\uD83C\uDDEB\uD83C\uDDF7	\uD83C\uDDEB\uD83C\uDDEE	\uD83C\uDDF8\uD83C\uDDEA	\uD83C\uDDE8\uD83C\uDDF3	\uD83C\uDDEF\uD83C\uDDF5	\uD83C\uDDF0\uD83C\uDDF7	\uD83C\uDDEA\uD83C\uDDF8	\uD83C\uDDE9\uD83C\uDDEA	\uD83C\uDDEE\uD83C\uDDF9
Ascending	Ascendant	Nouseva	Stigande	上升	上昇	오름차순	Ascendente	Aufsteigend	Ascendente
Body	Corps	Keho	Kropp	身体	体	몸	Cuerpo	Körper	Corpo
Bold	Audacieux	Lihavoitu	Djärv	大胆的	大胆な	용감한	Atrevido	Deutlich	Grassetto
Cancel	Annuler	Peruuttaa	Avboka	取消	キャンセル	취소	Cancelar	Stornieren	Cancellare
Carousel	Carrousel	Karuselli	Karusell	旋转木马	カルーセル	회전목마	Carrusel	Karussell	Giostra
Category	Catégorie	Kategoria	Kategori	类别	カテゴリ	범주	Categoría	Kategorie	Categoria
Center	Centre	Keskusta	Centrum	中心	中心	센터	Centro	Mitte	Centro
Check if Breached	Vérifier si une violation a eu lieu.	Tarkista, onko rikottu	Kontrollera om intrång skett	检查是否违规	違反があったかどうかを確認する	침해되었는지 확인하세요	Comprobar si se ha infringido	Prüfen, ob ein Verstoß vorliegt	Controlla se violato
Close	Fermer	Lähellä	Nära	关闭	近い	닫다	Cerca	Schließen	Vicino
Code	Code	Koodi	Koda	代码	コード	암호	Código	Code	Codice
Color Theme	Thème de couleurs	Väriteema	Färgtema	颜色主题	カラーテーマ	색상 테마	Tema de color	Farbthema	Tema colore
Column	Colonne	Sarake	Kolumn	柱子	カラム	열	Columna	Spalte	Colonna
Copy	Copie	Kopioida	Kopiera	复制	コピー	복사	Copiar	Kopie	Copia
Cut	Couper	Leikata	Skära	切	カット	자르다	Cortar	Schneiden	Taglio
Dark	Sombre	Tumma	Mörk	黑暗的	暗い	어두운	Oscuro	Dunkel	Buio
Delete	Supprimer	Poistaa	Radera	删除	消去	삭제	Borrar	Löschen	Eliminare
Descending	Descendant	Laskeva	Fallande	下降	降順	하강	Descendiendo	Absteigend	Discendente
Document	Document	Asiakirja	Dokumentera	文档	書類	문서	Documento	Dokumentieren	Documento
Emoji	Émoji	Emoji	Emoji	表情符号	絵文字	이모티콘	Emoji	Emoji	Emoji
Example	Exemple	Esimerkki	Exempel	例子	例	예	Ejemplo	Beispiel	Esempio
Exit	Sortie	Uloskäynti	Utgång	出口	出口	출구	Salida	Ausfahrt	Uscita
File	Déposer	Tiedosto	Fil	文件	ファイル	파일	Archivo	Datei	File
Filter	Filtre	Suodattaa	Filtrera	筛选	フィルター	필터	Filtrar	Filter	Filtro
Float	Flotter	Kellua	Flyta	漂浮	フロート	뜨다	Flotar	Schweben	Galleggiante
Forms	Formulaires	Lomakkeet	Formulär	表格	フォーム	양식	Formularios	Formulare	Forme
Heading	Titre	Otsikko	Rubrik	标题	見出し	표제	Título	Überschrift	Intestazione
Hide	Cacher	Piilottaa	Dölja	隐藏	隠れる	숨다	Esconder	Verstecken	Nascondere
High Contrast	Contraste élevé	Korkea kontrasti	Hög kontrast	高对比度	高コントラスト	고대비	Alto contraste	Hoher Kontrast	Contrasto elevato
Icon	Icône	Kuvake	Ikon	图标	アイコン	상	Icono	Symbol	Icona
Italic	Italique	Kursiivi	Kursiv	斜体	イタリック	이탤릭체	Itálico	Kursiv	Corsivo
Justify	Justifier	Perustella	Rättfärdiga	证明合法	正当化する	신이 옳다고 하다	Justificar	Rechtfertigen	Giustificare
Language	Langue	Kieli	Språk	语言	言語	언어	Idioma	Sprache	Lingua
Left	Gauche	Vasen	Vänster	左边	左	왼쪽	Izquierda	Links	Sinistra
Library	Bibliothèque	Kirjasto	Bibliotek	图书馆	図書館	도서관	Biblioteca	Bibliothek	Biblioteca
Light	Lumière	Valo	Ljus	光	ライト	빛	Luz	Licht	Leggero
Localize	Localiser	Paikallistaa	Lokalisera	本地化	ローカライズ	현지화	Localizar	Lokalisieren	Localizzare
Localized Placeholder	Espace réservé localisé	Lokalisoitu paikkamerkki	Lokaliserad platshållare	本地化占位符	ローカライズされたプレースホルダー	지역화된 플레이스홀더	Marcador de posición localizado	Lokalisierter Platzhalter	Segnaposto localizzato
Map	Carte	Kartta	Karta	地图	地図	지도	Mapa	Karte	Mappa
Maximize	Maximiser	Maksimoida	Maximera	最大化	最大化	최대화하다	Maximizar	Maximieren	Massimizzare
Menu	Menu	Valikko	Meny	菜单	メニュー	메뉴	Menú	Speisekarte	Menu
Minimize	Minimiser	Minimoida	Minimera	最小化	最小化	최소화하다	Minimizar	Minimieren	Minimizzare
Moderate	Modéré	Kohtalainen	Måttlig	缓和	適度	보통의	Moderado	Mäßig	Moderare
Move	Se déplacer	Liikkua	Flytta	移动	動く	이동하다	Mover	Bewegen	Mossa
Name	Nom	Nimi	Namn	姓名	名前	이름	Nombre	Name	Nome
New	Nouveau	Uusi	Ny	新的	新しい	새로운	Nuevo	Neu	Nuovo
No	Non	Ei	Inga	不	いいえ	아니요	No	Nein	No
Notifications	Notifications	Ilmoitukset	Aviseringar	通知	通知	알림	Notificaciones	Benachrichtigungen	Notifiche
Okay	D'accord	Kunnossa	Okej	好的	わかった	좋아요	Bueno	Okay	Va bene
Open	Ouvrir	Avata	Öppna	打开	開ける	열려 있는	Abierto	Offen	Aprire
Paste	Coller	Liitä	Klistra	粘贴	ペースト	반죽	Pasta	Paste	Impasto
Quit	Quitter	Lopettaa	Sluta	辞职	やめる	그만두다	Abandonar	Aufhören	Esentato
Rating	Notation	Arvosana	Gradering	等级	評価	평가	Clasificación	Bewertung	Valutazione
Redo	Refaire	Tee uudelleen	Göra om	重做	やり直す	다시 하다	Rehacer	Wiederholen	Rifare
Right	Droite	Oikea	Rätt	正确的	右	오른쪽	Bien	Rechts	Giusto
Save	Sauvegarder	Tallentaa	Spara	节省	保存	구하다	Ahorrar	Speichern	Salva
Select	Sélectionner	Valitse	Välja	选择	選択	선택하다	Seleccionar	Wählen	Selezionare
Show	Montrer	Show	Visa	展示	見せる	보여주다	Espectáculo	Zeigen	Spettacolo
Sidebar	barre latérale	Sivupalkki	Sidofält	侧边栏	サイドバー	사이드바	Barra lateral	Seitenleiste	Barra laterale
Sizer	Calibreur	Mitoitus	Storleksmätare	尺寸	サイザー	사이저	Medidor de tamaño	Größenmesser	Misuratore
Sort	Trier	Järjestellä	Sortera	种类	選別	종류	Clasificar	Sortieren	Ordinare
Strong	Fort	Vahva	Stark	强的	強い	강한	Fuerte	Stark	Forte
Subcategory	Sous-catégorie	Alaluokka	Underkategori	子类别	サブカテゴリ	하위 카테고리	Subcategoría	Unterkategorie	Sottocategoria
System	Système	Järjestelmä	System	系统	システム	체계	Sistema	System	Sistema
Table	Tableau	Taulukko	Tabell	桌子	テーブル	테이블	Mesa	Tisch	Tavolo
Tabs	Onglets	Välilehdet	Flikar	标签页	タブ	탭	Pestañas	Registerkarten	Schede
Unacceptable	Inacceptable	Hyväksymätön	Oacceptabel	不可接受	受け入れられない	받아들일 수 없음	Inaceptable	Unakzeptabel	Inaccettabile
Underline	Souligner	Korostaa	Betona	强调	下線	밑줄	Subrayar	Unterstreichen	Sottolineare
Undo	Défaire	Kumoa	Ångra	撤销	元に戻す	끄르다	Deshacer	Rückgängig machen	Disfare
Untitled	Sans titre	Nimetön	Ofrälse	无题	無題	제목 없음	Intitulado	Ohne Titel	Senza titolo
Very Strong	Très fort	Erittäin vahva	Mycket stark	非常强	非常に強い	매우 강함	Acérrimo	Sehr stark	Molto forte
Very Weak	Très faible	Hyvin heikko	Mycket svag	非常弱	非常に弱い	매우 약함	Muy débil	Sehr schwach	Molto debole
Weak	Faible	Heikko	Svag	虚弱的	弱い	약한	Débil	Schwach	Debole
Yes	Oui	Kyllä	Ja	是的	はい	예	Sí	Ja	Sì`;

// demo/src/css-var-editor.ts
var { h2: h22, code } = y;

class XinCssVarEditor extends F {
  elementSelector = "";
  targetSelector = "";
  constructor() {
    super();
    this.initAttributes("elementSelector", "targetSelector");
  }
  content = () => [
    h22({ part: "title" }, "CSS variables"),
    xinForm({ part: "variables", changeCallback: this.update })
  ];
  loadVars = () => {
    const { title, variables } = this.parts;
    variables.textContent = "";
    if (this.elementSelector) {
      title.textContent = `CSS variables for ${this.elementSelector}`;
      const element = document.querySelector(this.elementSelector);
      if (!element) {
        setTimeout(this.loadVars, 250);
        return;
      }
      const styleNode = element.shadowRoot ? element.shadowRoot.querySelector("style") : document.querySelector(`style#${this.elementSelector}-component`);
      const computedStyle = getComputedStyle(element);
      if (styleNode && styleNode.textContent) {
        const cssVars = [
          ...new Set([...styleNode.textContent.match(/--[\w-]+/g) || []])
        ];
        for (const cssVar of cssVars) {
          let value = computedStyle.getPropertyValue(cssVar);
          const type = value.match(/^(#|rgb|hsl)[\d()a-fA-F]+$/) ? "color" : "string";
          if (type === "color") {
            value = l.fromCss(value).html;
          }
          variables.append(xinField(code(cssVar), { key: cssVar, value, type }));
        }
      }
    }
  };
  update = () => {
    const selector = this.targetSelector || this.elementSelector;
    if (selector) {
      const targets = [
        ...document.querySelectorAll(selector) || []
      ];
      const { value } = this.parts.variables;
      for (const target of targets) {
        for (const key of Object.keys(value)) {
          target.style.setProperty(key, value[key]);
        }
      }
    }
  };
  connectedCallback() {
    super.connectedCallback();
    this.loadVars();
    this.parts.variables.addEventListener("change", this.update);
  }
}
var xinCssVarEditor = XinCssVarEditor.elementCreator({
  tag: "xin-css-var-editor"
});

// demo/docs.json
var docs_default = [
  {
    text: `# tosijs-ui

> \`xinjs-ui\` has been renamed \`tosijs-ui\`. Updating the documentation and links is a
> work in progress. The goal is for the API to remain stable during the transition.

<!--{ "pin": "top" }-->

[ui.tosijs.net live demo](https://ui.tosijs.net) | [tosijs](https://tosijs.net) | [discord](https://discord.gg/ramJ9rgky5) | [github](https://github.com/tonioloewald/tosijs-ui#readme) | [npm](https://www.npmjs.com/package/tosijs-ui)

[![tosijs is on NPM](https://badge.fury.io/js/tosijs-ui.svg)](https://www.npmjs.com/package/tosijs-ui)
[![tosijs is about 10kB gzipped](https://deno.bundlejs.com/?q=tosijs-ui&badge=)](https://bundlejs.com/?q=tosijs-ui&badge=)
[![tosijs on jsdelivr](https://data.jsdelivr.com/v1/package/npm/tosijs-ui/badge)](https://www.jsdelivr.com/package/npm/tosijs-ui)

<center>
  <xin-lottie
    style="width: 280px; height: 280px; background: #da1167; border-radius: 40px;"
    src="/tosi-ui.json"
  ></xin-lottie>
</center>

Copyright ©2023-2025 Tonio Loewald

## the tosijs-ui library

A set of [web-components](https://developer.mozilla.org/en-US/docs/Web/API/Web_components)
created with [xinjs](https://xinjs.net), designed to augment what the browser gives you
for free rather than replace it.

It works beautifully with other web-component libraries, such as [shoelace.style](https://shoelace.style/).

## Quick Start

### Using npm and a bundler

Add tosijs-ui to your project, e.g.

\`\`\`bash
npm add tosijs-ui
\`\`\`

Then you can import the component \`elementCreator\` and create the element any way you
like, the easiest way being to use the \`elementCreator\` itself. A \`tosijs\` \`elementCreator\`
is syntax sugar around \`document.createElement()\`.

\`\`\`ts
import { dataTable } from 'tosijs-ui'

document.body.append(dataTable())
\`\`\`

### Using the iife via cdn

The \`tosijs-ui\` iife build bundles \`tosijs\`, \`tosijs-ui\`, and \`marked\` into
a single minified javascript source file. You can access \`tosijs\` and \`xinjsui\`
as globals which contain all the things exported by \`tosijs\` and \`tosijs-ui\`.

> iife support is new so it may not have propagated to the cdn yet. This
> example loads the library from ui.xinjs.net for now.

\`\`\`
<script src="https://ui.xinjs.net/iife.js"></script>
<button id="menu">Menu <xin-icon icon="chevronDown"></xin-icon></button>
<script>
  import { elements } from 'tosijs'
  import { popMenu, icons } from 'tosijs-ui'

  const button = { elements }

  const showMenu = (target) => {
    popMenu({
      target,
      menuItems: [
        {
          caption: 'Say hello',
          action() {
            alert('hello')
          }
        },
        null,
        {
          caption: 'Version',
          action() {
            alert(\`xinjs \${xinjs.version}\\nxinjs-ui \${xinjsui.version}\`)
          }
        }
      ]
    })
  }

  document.body.append(
    button(
      {
        onClick(event) {
          showMenu(event.target)
        }
      },
      'Menu',
      icons.chevronDown()
    )
  )
</script>
\`\`\`

[Click here to see a simple iife demo](https://ui.xinjs.net/iife.html)

## custom-elements

The simplest way to use these elements is to simply import the element and then either
use HTML or the \`ElementCreator\` function exported.

E.g. to use the markdown viewer:

\`\`\`
import { markdownViewer } from 'tosijs-ui'
document.body.append(markdownViewer('# hello world\\nthis is a test'))
\`\`\`

\`\`\`js
import { markdownViewer } from 'tosijs-ui'

preview.append(
  markdownViewer(\`
## hello world
here is some markdown
\`)
)
\`\`\`

Assuming you import the module somewhere, the HTML will work as well.

\`\`\`
<xin-md>
## hello world
here is some markdown
</xin-md>
\`\`\`

The big difference with using the \`markdownViewer()\` function is that the \`tosijs\` \`Component\`
class will automatically pick a new tag if the expected tag is taken (e.g. by a previously
defined custom-element from another library). \`markdownViewer()\` will create an element of
the correct type.

The other thing is that \`tosijs\` \`ElementCreator\` functions are convenient and composable,
allowing you to build DOM elements with less code than pretty much any other option, including
JSX, TSX, or HTML.

## Philosophy

In general, \`tosijs\` strives to work _with_ the browser rather than trying to _replace_ it.

In a similar vein, \`tosijs-ui\` comprises a collection of [web-components](https://developer.mozilla.org/en-US/docs/Web/API/Web_components)
with the goal of augmenting what _already_ works well, and the components are intended be interoperable as
similar as possible to things that you already use, such as \`<input>\` or \`<select>\` elements.
E.g. where appropriate, the \`value\` of an element is its malleable \`state\`, and when this changes,
the element emits a \`change\` event.

Similarly, the xinjs base \`Component\` class and the components in this collection strive to
be as similar in operation as possible to DOM elements as makes sense. E.g. binary attributes
work as expected. Adding the \`hidden\` attribute makes them disappear. If a component subclass
has a \`value\` property then it will be rendered if the value changes (similarly it will be
rendered if an initialized attribute is changed). Intinsic properties of components will
default to \`null\` rather than \`undefined\`.

Similarly, because web-components are highly interoperable, there's no reason to reinvent
wheels. In particular, this library won't try to replace existing, excellent libraries
such as [shoelace.style](https://shoelace.style/) or wrap perfectly functional HTML
elements, like the venerable \`<input>\` or \`<form>\` elements that are already capable
and accessible.

The goal here is to provide useful components and other utilities that add to what's built
into HTML5 and CSS3 and to make custom-elements work as much as possible like drop-in replacements
for an \`<input>\` or \`<textarea>\` (while mitigating the historical pathologies of things like
\`<select>\` and \`<input type="radio">\`). E.g. the \`<xin-select>\` does not suffer from a
race-condition between having its value set and being given an \`<option>\` with the intended value
and you can differentiate between the user picking a value (\`action\`) and the value changing (\`change\`).

## Credits

\`tosijs-ui\` is being developed using [bun](https://bun.sh/).
\`bun\` is crazy fast (based on Webkit's JS engine, vs. V8), does a lot of stuff
natively, and runs TypeScript (with import and require) directly.

Logo animations by [@anicoremotion](https://pro.fiverr.com/freelancers/anicoremotion).
`,
    title: "tosijs-ui",
    filename: "README.md",
    path: "README.md",
    pin: "top"
  },
  {
    text: `# 3d

A [babylonjs](https://www.babylonjs.com/) wrapper.

A \`<xin-3d>\` element is initialized with an \`engine\`, \`canvas\`, \`scene\`, and an update-loop.

If you view this example with an XR-enabled device, such as the
[Meta Quest 3](https://www.meta.com/quest/quest-3/), then you should be able to view this
as an AR scene.

\`\`\`js
import { b3d, gamepadText, xrControllers, xrControllersText } from 'tosijs-ui'

preview.append(b3d({
  async sceneCreated(element, BABYLON) {
    const camera = new BABYLON.FreeCamera(
      'camera',
      new BABYLON.Vector3(0, 1, -4),
      element.scene
    )
    camera.attachControl(element.parts.canvas, true)

    new BABYLON.HemisphericLight('light', new BABYLON.Vector3(0.25, 1, -0.5))

    this.loadScene('/', 'xin3d.glb')

    const size = 1024
    const textTexture = new BABYLON.DynamicTexture('Text', size, element.scene)
    const textContext = textTexture.getContext()
    textTexture.update()

    const textMaterial = new BABYLON.StandardMaterial('Text', element.scene)
    textMaterial.diffuseTexture = textTexture
    textMaterial.emissiveTexture = textTexture
    textMaterial.backfaceCulling = false

    const plaque = BABYLON.MeshBuilder.CreatePlane('Plaque', {size: 1}, element.scene)
    plaque.position.x = 0
    plaque.position.y = 2
    plaque.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL
    plaque.material = textMaterial

    let controllers
    if (navigator.xr) {
      const xrHelper = await element.scene.createDefaultXRExperienceAsync({
        uiOptions: {
          sessionMode: 'immersive-ar'
        }
      })
      controllers = xrControllers(xrHelper)
    }

    const interval = setInterval(() => {
      if (document.body.contains(element)) {
        textContext.fillStyle = '#204020'
        textContext.fillRect(0, 0, size, size)
        const text = gamepadText() + '\\n' + xrControllersText(controllers)
        const lines = text.split('\\n')
        textContext.fillStyle = '#afa'
        textContext.font = '32px monospace'
        for(let i = 0; i < lines.length; i++) {
          const line = lines[i]
          textContext.fillText(line, 40, 70 + i * 40)
        }
        textContext.fillStyle = '#bbb'
        textContext.fillText('tosijs-xr — debug info', 40, 984)
        textTexture.update()
      } else {
        clearInterval(interval)
      }
    }, 100)
  },
}))
\`\`\`
\`\`\`css
.preview xin-3d {
  width: 100%;
  height: 100%;
}
\`\`\`

You can access the \`scene\` and \`engine\` properties. You can also assign \`sceneCreated\`
and \`update\` callbacks that will be executed when the scene is first initialized and
before each update, respectively. (See the example, it does both.)

Both \`sceneCreated\` and \`update\` may be \`async\`. The component will \`await\` \`sceneCreated\`
before starting the renderLoop, but \`update\` is simply passed to babylon, so be careful.

By default, this component loads \`babylon.js\` from the [babylonjs CDN](https://doc.babylonjs.com/setup/frameworkPackages/CDN),
but if \`BABYLON\` is already defined (e.g. if you've bundled it) then it will use that instead.

If you need additional libraries, e.g. \`https://cdn.babylonjs.com/loaders/babylonjs.loaders.min.js\` for loading models such as \`gltf\` and \`glb\` files, you should load those in \`sceneCreated\`.

Here's a simple example of a terrain mesh comprising 125k triangles, 50% of which is being scaled using a \`profileScale\` function that
takes an array of numbers that use a linear profile to change the landform.

\`\`\`js
import { b3d } from 'tosijs-ui'
import { MoreMath } from 'tosijs'

const debugCutoff = 0.5
const defaultProfile = [0, 1, 5, 8, 10].map(x => x/10)

const { clamp } = MoreMath
function profileScale(t = 0, bypass = false, profile = defaultProfile) {
  if (bypass) {
    return t
  }
  const count = profile.length - 1
  if (count < 1) {
    throw new Error('profile must be of length ≥ 2')
  }

  const s = clamp(0, (t + 1) / 2, 1)
  const index = Math.floor(s * count)
  const dt = (s - index / count) * count
  const min = profile[index]
  const max = profile[index + 1]
  const p = dt * (max - min) + min
  return 2 * p - 1
}

preview.append(b3d({
  async sceneCreated(element, BABYLON) {
    const { scene } = element
    const { createNoise2D } = await import('https://cdn.jsdelivr.net/npm/simplex-noise@4.0.1/+esm')

    new BABYLON.HemisphericLight('light', new BABYLON.Vector3(0.25, 1, 2))

    const terrain = new BABYLON.Mesh('terrain', scene)
    const vertexData = new BABYLON.VertexData()

    const noise2D = createNoise2D()
    const positions = []
    const indices = []
    const gridSize = 100
    const gridResolution = 250
    const gridPoints = gridResolution + 1
    const noiseScale = 0.03
    const heightScale = 4.5
    terrain.position.y = -5
    const scale = t => t * gridSize / gridResolution - gridSize * 0.5
    for(let x = 0; x <= gridResolution; x++) {
      for(let z = 0; z <= gridResolution; z++) {
        const y =  profileScale(noise2D(scale(x) * noiseScale, scale(z) * noiseScale), x < gridResolution * debugCutoff)
        positions.push(scale(x), y * heightScale, scale(z))
        if (x > 0 && z > 0) {
          const i = x * gridPoints + z
          indices.push(
            i, i - gridPoints - 1, i - 1,
            i, i - gridPoints, i - gridPoints - 1,
          )
        }
      }
    }
    const normals = []
    BABYLON.VertexData.ComputeNormals(positions, indices, normals);

    vertexData.positions = positions
    vertexData.indices = indices
    vertexData.normals = normals
    vertexData.applyToMesh(terrain)
  },
}))
\`\`\`

## loadScene

\`<xin-3d>.loadScene(path: string, file: string, callBack(meshes: any[]): void)\` can
be used to load \`.glb\` files.

## loadUI

\`<xin-3d>.loadUI(options: B3dUIOptions)\` loads babylonjs guis, which you can create programmatically or using the [babylonjs gui tool](https://gui.babylonjs.com/).`,
    title: "3d",
    filename: "babylon-3d.ts",
    path: "src/babylon-3d.ts"
  },
  {
    text: `# ab-test

\`<xin-ab>\` provides a simple method for implementing A|B-testing.

\`\`\`js
import { AbTest } from 'tosijs-ui'

function randomize() {
  const conditions = {
    testA: Math.random() < 0.5,
    testB: Math.random() < 0.5,
    testC: Math.random() < 0.5
  }

  AbTest.conditions = conditions

  preview.querySelector('pre').innerText = JSON.stringify(conditions, null, 2)
}

preview.querySelector('.randomize-conditions').addEventListener('click', randomize)

randomize()
\`\`\`
\`\`\`html
<div style="display: flex; gap: 10px; align-items: center;">
  <div style="display: flex; flex-direction: column; gap: 10px;">
    <xin-ab class="a" condition="testA">
      <p>testA</p>
    </xin-ab>
    <xin-ab class="not-a" not condition="testA">
      <p>not testA</p>
    </xin-ab>
    <xin-ab class="b" condition="testB">
      <p>testB</p>
    </xin-ab>
    <xin-ab class="not-b" not condition="testB">
      <p>not testB</p>
    </xin-ab>
    <xin-ab class="c" condition="testC">
      <p>testC</p>
    </xin-ab>
    <xin-ab class="not-c" not condition="testC">
      <p>not testC</p>
    </xin-ab>
  </div>
  <pre>
  </pre>
</div>
<button class="randomize-conditions">Randomize</button>
\`\`\`
\`\`\`css
.preview {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: flex-start;
}
.preview p {
  background: #44c;
  color: white;
  display: block;
  border-radius: 99px;
  padding: 4px 10px;
  margin: 0;
}

.preview xin-ab[not] p {
  background: red;
}
\`\`\`

- Set \`AbTest.conditions\` to anything you like.
- Use \`<xin-ab>\` elements to display conditional content.
- \`condition\` attribute determines which value in \`AbTest.conditions\` controls the element
- \`not\` reverses the condition (so \`<xin-ab not condition="foo">\` will be visible if \`conditions.foo\` is \`false\`)`,
    title: "ab-test",
    filename: "ab-test.ts",
    path: "src/ab-test.ts"
  },
  {
    text: `# blueprint loading

<center>
  <xin-icon icon="blueprint" class="logo" size=256></xin-icon>
</center>

\`<xin-loader>\` and \`<xin-blueprint>\` are simple elements provided by \`tosijs\` for the dynamic loading
of component **blueprints**.

\`\`\`html
<xin-loader>
  <xin-blueprint tag="swiss-clock" src="https://tonioloewald.github.io/xin-clock/dist/blueprint.js"></xin-blueprint>
</xin-loader>
<swiss-clock></swiss-clock>
\`\`\`

## Attributes

- \`blueprint\` is the url of the \`blueprint\` javascript module (required)
- \`tag\` is the tagName you wish to use. If the name of the blueprint is
  hyphenated, then that will be used by default
- \`property\` if the blueprint module exports the blueprint function as
  a property, you can specify the property here.`,
    title: "blueprint loading",
    filename: "bp-loader.ts",
    path: "src/bp-loader.ts"
  },
  {
    text: `# carousel

\`\`\`html
<xin-carousel arrows dots max-visible-items=2 auto=2 snap-delay=4 snap-duration=0.5 loop>
  <xin-icon icon="tosiFavicon" class="thing"></xin-icon>
  <xin-icon icon="tosi" class="thing"></xin-icon>
  <xin-icon icon="tosiUi" class="thing"></xin-icon>
  <xin-icon icon="tosiPlatform" class="thing"></xin-icon>
  <xin-icon icon="tosiXr" class="thing"></xin-icon>
  <xin-icon icon="blueprint" class="thing"></xin-icon>
  <xin-icon icon="cmy" class="thing"></xin-icon>
  <xin-icon icon="rgb" class="thing"></xin-icon>
</xin-carousel>
\`\`\`
\`\`\`css
.thing {
  --xin-icon-size: 160px;
  height: 160px;
  margin: 30px 0 70px;
  position: relative;
}

.thing::after {
  content: attr(icon);
  color: white;
  position: absolute;
  bottom: -50px;
  left: 50%;
  padding: 5px 15px;
  transform: translateX(-50%);
  filter: drop-shadow(0 1px 1px #0008);
  background: #0004;
  border-radius: 5px;
}

.preview xin-carousel {
  background: #8883;
  margin: 10px;
  border-radius: 10px;
}
\`\`\`

This is a minimalist carousel component that supports the usual stuff.

## Attributes

- \`arrows\` (boolean, false by default) shows/hides the arrow paging controls
- \`dots\` (boolean, false by default) shows/hides the dot progress indicators
- \`max-visible-items\` (number, 1 by default) determines how many items are shown at once.
- \`snap-duration\` (number, 0.25 [seconds] by default) determines the time taken to scroll / snap scroll.
- \`snap-delay\` (number, 0.1 [seconds] by default)
- \`loop\` (boolean, false by default) causes next/previous buttons to loop
- \`auto\` (number, 0 [seconds] by default) if > 0, automatically advances after that many seconds (always loops!)

<xin-css-var-editor element-selector="xin-carousel"></xin-css-var-editor>`,
    title: "carousel",
    filename: "carousel.ts",
    path: "src/carousel.ts"
  },
  {
    text: '# code\n\nAn [ACE Editor](https://ace.c9.io/) wrapper.\n\nSometimes, it\'s nice to be able to just toss a code-editor in a web-page.\n\n`<xin-code>`\'s `value` is the code it contains. Its `mode` attribute sets the language, and you can further configure\nthe ACE editor instance via its `options` property.\n\n```html\n<xin-code style="width: 100%; height: 100%" mode="css">\nbody {\n  box-sizing: border-box;\n}\n</xin-code>\n```\n\nThe `<xin-code>` element has an `editor` property that gives you its ACE editor instance,\nand an `ace` property that returns the `ace` module, giving you complete access to the\n[Ace API](https://ace.c9.io/api/index.html).',
    title: "code",
    filename: "code-editor.ts",
    path: "src/code-editor.ts"
  },
  {
    text: `# color input field

This is a color input field that supports opacity

\`\`\`js
const colorInput = preview.querySelector('xin-color')
const circle = preview.querySelector('div')

colorInput.addEventListener('change', () => {
  circle.style.background = colorInput.value
})
\`\`\`
\`\`\`html
<xin-color value="red"></xin-color>
<div
  style="
    width: 200px;
    height: 200px;
    background: red;
    border-radius: 100px;
  "
></div>
\`\`\`


<xin-css-var-editor element-selector="xin-color"></xin-css-var-editor>`,
    title: "color input field",
    filename: "color-input.ts",
    path: "src/color-input.ts"
  },
  {
    text: `# dialog

\`<tosi-dialog>\` is a simple wrapper around the standard HTML \`<dialog>\` element designed
to make creating dialogs as convenient as possible.

\`\`\`html
<button>Show Dialog</button>
<tosi-dialog>
  <h3 slot='header'>A Dialog</h3>
  <p>
    Here is some text
  </p>
  <button slot="footer">Custom Button</button>
</tosi-dialog>
\`\`\`
\`\`\`js
import { on } from 'tosijs'
import { postNotification } from 'tosijs-ui'

on(
  preview.querySelector('button'),
  'click',
  async () => {
    const response = await preview.querySelector('tosi-dialog').showModal()
    postNotification({
      message: \`user clicked \${response}\`,
      duration: 2
    })
  }
)
\`\`\`

## Static Functions

\`TosiDialog\` provides static async functions to replace the built-in dialogs provided by
the browser.

- \`alert(message: string, title = 'Alert'): Promise<undefined>\`
- \`confirm(message: string, title = 'Confirm'): Promise<boolean>\`
- \`prompt(message: string, title = 'Prompt', currentValue = ''): Promise<string | null> \`

You can look at the code that implements them to see how to leverage \`TosiDialog\` to build
more complex, bespoke dialogs that can be used just as conveniently.

\`\`\`js
import { elements } from 'tosijs'
import { TosiDialog, postNotification } from 'tosijs-ui'

const { button, div } = elements

preview.append(
  div(
    {
      style: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 10
      }
    },
    button(
      {
        async onClick() {
          await TosiDialog.alert('This is an alert')
          postNotification({
            message: 'alert dismissed',
            duration: 2
          })
        }
      },
      'TosiDialog.alert',
    ),
    button(
      {
        async onClick() {
          const confirmed = await TosiDialog.confirm('Can you confirm?')
          postNotification({
            message: \`user \${confirmed ? 'confirmed' : 'cancelled'}\`,
            duration: 2
          })
        }
      },
      'TosiDialog.confirm',
    ),
    button(
      {
        async onClick() {
          const text = await TosiDialog.prompt('Enter some text please')
          postNotification({
            message: text !== null ? \`user entered "\${text}"\`: 'user cancelled',
            duration: 2
          })
        }
      },
      'TosiDialog.prompt',
    ),
  ),
)
\`\`\`
\`\`\`css
.preview {
  padding: 10px;
}
\`\`\``,
    title: "dialog",
    filename: "dialog.ts",
    path: "src/dialog.ts"
  },
  {
    text: `# drag & drop

A lightweight library that leverages HTML5 drag and drop behavior.

To use it, simply call \`dragAndDrop.init()\` (it only needs to be called once,
but calling it again is harmless).

\`\`\`
import { dragAndDrop } from 'tosijs-ui'

dragAndDrop.init()
\`\`\`

This module sets up some global event handlers and *just works*&trade; (arguably, it merely does things
that the browser should do, such as add a CSS selector for drop zones that are compatible
with what's being dragged).

You can use \`dragAndDrop.draggedElement()\` to get the element being dragged (if it's
actually from the page you're in).

> ### The beauty of HTML5 drag-and-drop
>
> The nice thing about HTML5 drag-and-drop is that it leverages the OS's drag and
> drop support. This means you can drag from one window to another, from the desktop
> to your app and vice versa. It's all a matter of configuring the DOM elements.

This module uses but *does not define* the following class selectors:

- \`.drag-source\` an element being dragged
- \`.drag-target\` an element on which the dragged object may be dropped
- \`.drag-over\` a \`.drag-target\` which the object is currently over

You may also wish to create style rules for:

- \`[draggable="true"]\` anything other than a \`<a>\` (and perhaps an \`<img>\`) that can be dragged
- \`[data-drag]\` indicates *types* of draggable things that can be dropped on them.
- \`[data-drop]\` indicates potential *drop zones*.

> **Note** \`draggable\` is has to be set to "true", [see documentation on draggable](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/draggable).

## Draggable Objects

To create a draggable element, add \`draggable="true"\`.

    <div draggable="true">Drag Me</div>

To specify the type(s) of content that will be dragged, use the \`data-drag\` attribute:

    <div draggable="true" data-drag="text/plain">Drag Me</div>

To specify the content dragged, use a \`data-drag-content\` attribute.

    <div
      draggable="true"
      data-drag="text/plain"
      data-drag-content="Surprise!"
    >Drag Me</div>

## Drop Zones

To create a drop zone, use the data-drop attribute set to a semicolon-delimited list
of mime types:

    <div data-drop="text/plain">
      Drop plain text here
    </div>
    <div data-drop="text/plain;text/html">
      Drop html or plain text here
    </div>

Finally, you can override default drop behavior (which is to copy the dragged node into
the drop zone node) by adding your own \`drop\` event handler.

E.g.

    element.addEventListener('drop', (event) => {
      // event.target is the dragged element
      ...

      event.stopPropagation()
      event.preventDefault()
    })

And of course \`elementCreator()\`s provide syntax sugar for this:

    elements.div({
      onDrop(event) {
        // ...
      }
    })

### Typed Drop Zones Example

In this example, the types are set using \`data-drag\` attributes and the drop zones are
set using \`data-drop\` attributes, but everything else is default behavior. You can also
drop the draggable objects to another window or the desktop, and similarly you can drag
appropriate stuff into the drop zones. (You can test this out by opening this page in
a second browser window—event a different browser.)

\`\`\`html
<div style="display: grid; grid-template-columns: 50% 50%">
  <div>
    <h4>Draggable</h4>
    <a class="drag" href="javascript: alert('I don't do anything)">Links are draggable by default</a>
    <p draggable="true">
      Just adding the <code>draggable="true"</code>
      makes this paragraph draggable (as text/html by default)
    </p>
    <p draggable="true" data-drag="text/html">
      Draggable as <i>text/html</i>
    </p>
    <p draggable="true" data-drag="text/plain" data-drag-content="Surprise!">
      Draggable as <i>text/plain</i>, with <b>custom content</b>
    </p>
    <p draggable="true" data-drag="text/html;text/plain">
      Draggable as <i>text/html</i> or <i>text/plain</i>
    </p>
    <p draggable="true" data-drag="text/plain">
      Draggable as <i>text/plain</i>
    </p>
  </div>
  <div>
    <h4>Drop Targets</h4>
    <div data-drop="text/html">
      You can drop stuff here
    </div>
    <div data-drop="text/html">
      You can drop HTML here
    </div>
    <div data-drop="text/*">
      You can drop any text
    </div>
    <div data-drop="text/html;url">
      You can drop HTML or urls here
    </div>
    <div
      data-drop="special/any"
      data-event="drop:_component_.drop"
    >
      I accept anything and have special drop handling
    </div>
  </div>
</div>
\`\`\`
\`\`\`css
.drag-source {
  box-shadow: 0 0 2px 2px orange;
  opacity: 0.5;
}
.drag-target {
  min-height: 10px;
  background: rgba(0,0,255,0.25);
}
.drag-target.drag-over {
  background: rgba(0,0,255,0.5);
}
:not([data-drop]) > .drag,
[draggable="true"] {
  border: 1px solid rgba(255,192,0,0.5);
  cursor: pointer;
  display: block;
}

:not([data-drop]) > .drag,
[data-drop],
[draggable="true"] {
  padding: 4px;
  margin: 4px;
  border-radius: 5px;
}
\`\`\`
\`\`\`js
import { dragAndDrop } from 'tosijs-ui'

dragAndDrop.init()
\`\`\`

> Note that you can drag between two browser tabs containing this
> example (or between two different browsers) and it will work.

### Reorderable List Example

This example uses a custom \`drop\` event handler. When you sort the spectrum
into the correct order you "win" and then the items are reshuffled.

Also notice that the \`data-drag\` and \`data-drop\` values are set to a
random dragId so you cannot drag to another window or the desktop.

\`\`\`js
import { elements, tosi, getListItem } from 'tosijs'
import { dragAndDrop, TosiDialog } from 'tosijs-ui'

dragAndDrop.init()

const shuffle = (deck) => {
  var shuffled = [];
  for( const card of deck ){
    shuffled.splice( Math.floor( Math.random() * (1 + shuffled.length) ), 0, card );
  }
  return shuffled;
}

const colors = [
  'red',
  'orange',
  'yellow',
  'green',
  'blue',
  'indigo',
  'violet',
]

let spectrum

const start = () => {
  ({ spectrum } =  tosi({
    spectrum: shuffle(colors).map(color => ({color}))
  }))
}

start()

let dragged = null

const dropColor = (event) => {
  const dropped = getListItem(event.target)
  const draggedIndex = spectrum.indexOf(dragged)
  const droppedIndex = spectrum.indexOf(dropped)
  spectrum.splice(draggedIndex, 1)
  spectrum.splice(droppedIndex, 0, dragged)

  if (JSON.stringify(spectrum.map(c => c.color)) === JSON.stringify(colors)) {
    TosiDialog.alert('You win!').then(start)
  }

  console.log({dragged, draggedIndex, dropped, droppedIndex})

  event.preventDefault()
  event.stopPropagation()
}

const dragId = 'spectrum/' + Math.floor(Math.random() * 1e9)

const { div, button, template } = elements

preview.append(
  div(
    {
      bindList: { value: spectrum, idPath: 'color' }
    },
    template(
      div({
        class: 'spectrum',
        bindText: '^.color',
        draggable: 'true',
        dataDrag: dragId,
        dataDrop: dragId,
        onDrop: dropColor,
        bind: {
          value: '^.color',
          binding(element, value) {
            element.style.backgroundColor = value
          }
        },
        onDragstart(event) {
          dragged = getListItem(event.target)
        }
      })
    )
  ),
)
\`\`\`
\`\`\`css
.spectrum {
  height: 36px;
  color: white;
  font-weight: 700;
  text-shadow: 1px 2px 0 black;
  padding-left: 10px;
}

.spectrum.drag-over {
  box-shadow: 0 0 0 4px blue;
}
\`\`\`

> To prevent this example from allowing drags between windows (which
> wouldn't make sense) a random dragId is assigned to \`data-drag\` and
> \`data-drop\` in this example.
)`,
    title: "drag & drop",
    filename: "drag-and-drop.ts",
    path: "src/drag-and-drop.ts"
  },
  {
    text: `# editable-rect

\`<xin-editable>\` (\`editableRect\` is the \`ElementCreator\` and \`EditableRect\` is the class) is an element
for allowing the adjustment of another element's position and size. Simply insert it in a \`position: absolute\`
or \`position: fixed\` element and you can directly adjust its CSS positioning, including rotation.

Click on an element to adjust its position, dimensions, and rotation.

\`\`\`js
import { editableRect, icons } from 'tosijs-ui'
import { elements } from 'tosijs'
const { button } = elements

function showTools(event) {
  event.stopPropagation()
  event.preventDefault()
}

const editable = editableRect(button({class: 'more-popup', onClick: showTools}, icons.moreVertical()))
preview.addEventListener('click', (event) => {
  const target = event.target
  if (['absolute', 'fixed'].includes(getComputedStyle(target).position)) {
    target.append(editable)
  } else {
    editable.remove()
  }
})
preview.addEventListener('change', event => console.log(event))
\`\`\`
\`\`\`html
<div class="editable" style="top: 20px; left: 20px; width: auto; height: auto; right: 20px; bottom: 20px;">
  <div class="editable" style="top: 20px; left: 20px; width: 200px; height: 150px;">
  </div>
  <div class="editable" style="bottom: 20px; top: 20px; width: 300px; height: auto; right: 20px;">
  </div>
</div>
\`\`\`
\`\`\`css
.preview .editable {
  position: absolute;
  box-shadow: inset 0 0 0 1px #0ccc;
  background: #0cc1;
}

.preview button.more-popup {
  position: absolute;
  width: 44px;
  height: 44px;
  top: 2px;
  right: 2px;
  --text-color: black;
  background: transparent;
  box-shadow: none;
}

.previw button
\`\`\`

## Snapping

When \`EditableRect.snapToGrid === true\` or the shift-key is depresseed, position will snap to \`EditableRect.gridSize\` pixels (default = 8).

Similarly \`EditableRect.snapAngle === true\` or the shift-key will snap rotation to increments of \`EditableRect.angleSize\` degrees (default = 15).

## Events

After an element's position, size, or rotation are adjusted a \`change\` event is triggered on the element.`,
    title: "editable-rect",
    filename: "editable-rect.ts",
    path: "src/editable-rect.ts"
  },
  {
    text: `# example

\`<xin-example>\` makes it easy to insert interactive code examples in a web page. It
started life as a super lightweight, easier-to-embed implementation of
[b8rjs's fiddle component](https://b8rjs.com)—which I dearly missed—but now the student
is, by far, the master. And it's still super lightweight.

*You're probably looking at it right now.*

\`\`\`js
// this code executes in an async function body
// it has tosijs, tosijsui, and preview (the preview div) available as local variables
import { div } from 'tosijs'.elements
preview.append(div({class: 'example'}, 'fiddle de dee!'))
preview.append('Try editing some code and hitting refresh…')
\`\`\`
\`\`\`html
<h2>Example</h2>
\`\`\`
\`\`\`css
.preview {
  padding: 0 var(--spacing);
}

.example {
  animation: throb ease-in-out 1s infinite alternate;
}

@keyframes throb {
  from { color: blue }
  to { color: red }
}
\`\`\`

You can also use Typescript. It will be stripped down to
Javascript using [sucrase](https://github.com/alangpierce/sucrase).

## CSS Isolation with \`iframe\`

Add the \`iframe\` attribute to render the preview inside an iframe for complete CSS isolation.

## Test Blocks

Add \`\\\`\\\`\\\`test\` code blocks to write inline tests that run against the preview:

\`\`\`html
<button class="demo-btn">Click me</button>
\`\`\`
\`\`\`js
preview.querySelector('.demo-btn').onclick = () => {
  preview.querySelector('.demo-btn').textContent = 'Clicked!'
}
\`\`\`
\`\`\`test
test('button exists', () => {
  const btn = preview.querySelector('.demo-btn')
  expect(btn).toBeDefined()
  expect(btn.textContent).toBe('Click me')
})

test('this test intentionally fails', () => {
  expect(1 + 1).toBe(3)
})
\`\`\`

Tests have access to:
- \`preview\` - the DOM element containing the rendered HTML
- \`expect(value)\` - Jest-like assertions (.toBe, .toEqual, .toBeTruthy, etc.)
- \`test(name, fn)\` - define a test case
- \`describe(name, fn)\` - group tests
- All context libraries (tosijs, tosijs-ui, etc.)

## \`context\`

A \`<xin-example>\` is given a \`context\` object which is the set of values available
in the javascript's execution context. The context always includes \`preview\`.

\`\`\`
import * as tosijs from 'tosijs'
import * as tosijsui from 'tosijs-ui'

context = {
  tosijs,
  'tosijs-ui': tosijsui
}
\`\`\``,
    title: "example",
    filename: "component.ts",
    path: "src/live-example/component.ts"
  },
  {
    text: `# filter

Automatically creates \`ArrayFilter\` functions \`(a: any[]) => any[]\` based on the query you build using its
macOS Finder-inspired interface, using an easily customizable / extensible collection of \`Filter\` objects.

\`\`\`js
import { elements } from 'tosijs'
import { dataTable, filterBuilder, availableFilters } from 'tosijs-ui'

const sourceWords = ['acorn', 'bubblegum', 'copper', 'daisy', 'ellipse', 'fabulous', 'gerund', 'hopscotch', 'idiom', 'joke']
function randomWords () {
  let numWords = Math.random() * 4
  const words = []
  while (numWords > 0) {
    numWords -= 1
    words.push(sourceWords[Math.floor(Math.random() * 10)])
  }
  return [...new Set(words)]
}

const array = []
for(let i = 0; i < 1000; i++) {
  array.push({
    date: new Date(Math.random() * Date.now()).toISOString().split('T')[0],
    isLucky: Math.random() < 0.1,
    number: Math.floor(Math.random() * 200 - 100),
    string: randomWords().join(' '),
    tags: randomWords()
  })
}

const { span } = elements
const tagsBinding = {
  value: '^.tags',
  binding: {
    toDOM(element, value) {
      element.classList.add('tag-list')
      element.textContent = ''
      element.append(...value.map(tag => span(tag, {class: 'tag'})))
    }
  }
}

const columns = [
  {
    prop: 'date',
    width: 120
  },
  {
    prop: 'isLucky',
    type: 'boolean',
    width: 90
  },
  {
    prop: 'number',
    align: 'right',
    width: 90
  },
  {
    prop: 'string',
    width: 200
  },
  {
    prop: 'tags',
    width: 200,
    dataCell() {
      return elements.div({ bind: tagsBinding })
    }
  },
]

const table = dataTable({ array, columns })
const filter = filterBuilder({
  fields: columns,
  onChange(event) {
    table.filter = filter.filter
  }
})
preview.append(filter, table)
\`\`\`
\`\`\`css
.preview {
  display: flex;
  flex-direction: column;
}

.preview xin-table {
  flex: 1 1 auto;
}

.preview .tag-list {
  display: flex;
  font-size: 80%;
  align-items: center;
  gap: 2px;
}

.preview .tag {
  display: inline-block;
  border-radius: 4px;
  padding: 0 5px;
  line-height: 20px;
  height: 20px;
  color: var(--brand-text-color);
  background: var(--brand-color);
}
\`\`\`

## serialization

The current state of a \`<xin-filter>\` can be serialized as, and restored from, a Javascript object (which itself
can easily be converted into JSON or a URL component) via its \`state\` property. Obviously, a \`<xin-filter>\` can
only restore state if it has the necessary constituent \`filters\`.

## availableFilters

\`<xin-filter>\` has a default set of \`FilterMaker\` objects which it uses to construct filter function.
In the example above, the default collection of filters is reduced to \`contains\`, \`equals\`, \`after\`, and \`isTrue\`.

The full collection includes:

- **contains** * looks for fields containing a string (ignoring case)
- **equals** * looks for fields containing equivalent values (ignoring case)
- **after** * looks for fields with a date after a provided value
- **greaterThan** * looks for fields with a value greater than a provided value
- **truthy** * looks for fields that are true / non-zero / non-empty
- **true** looks for fields that are \`true\`
- **false** looks for fields that are \`false\`
- **hasTags** looks for fields that are arrays containing all the (space/comma) delimited strings
- **doesNotHaveTags** looks for fields that are arrays containing *none* of the strings

**Note**: the filters marked with an * have negative version (e.g. does not contain).

\`\`\`
type ObjectTest (obj: any) => boolean

interface FilterMaker {
  caption: string                                 // describes the test condition
  negative?: string                               // describes the negative test condition
  needsValue?: boolean                            // if false, the filterMaker doesn't need a needle value
  filterMaker(needle: any) => ObjectTest          // builds an ObjectTest
}
\`\`\``,
    title: "filter",
    filename: "filter-builder.ts",
    path: "src/filter-builder.ts"
  },
  {
    text: `# float

A floating, potentially draggable user interface element.

\`\`\`html
<xin-float class="float" remain-on-resize="remain" remain-on-scroll="remain" drag>
  <h4>Drag Me</h4>
  <div class="no-drag balloon">🎈</div>
  <div class="behavior">I ignore resizing and scrolling</div>
  <footer style="font-size: 75%">neunundneunzig pixel-ballon</footer>
</xin-float>

<xin-float class="float" remain-on-scroll="remain" style="top: 50px; right: 20px;" drag>
  <h4>Drag Me</h4>
  <div class="no-drag balloon">🎈</div>
  <div class="behavior">I disappear on resize</div>
  <footer style="font-size: 75%">neunundneunzig pixel-ballon</footer>
</xin-float>

<xin-float class="float" remain-on-resize="remain" remain-on-scroll="remove" style="bottom: 20px; left: 50px;" drag>
  <h4>Drag Me</h4>
  <div class="no-drag balloon">🎈</div>
  <div class="behavior">I disappear on scroll</div>
  <footer style="font-size: 75%">neunundneunzig pixel-ballon</footer>
</xin-float>
\`\`\`
\`\`\`css
.preview .float {
  width: 220px;
  height: 180px;
  padding: 0;
  gap: 5px;
  display: flex;
  flex-direction: column;
  border-radius: 5px;
  background: #fff8;
  box-shadow: 2px 10px 20px #0004;
  overflow: hidden;
  cursor: move;
}

.preview h4 {
  margin: 0;
  padding: 5px 10px;
  color: white;
  background: red;
}

.preview .balloon {
  cursor: default;
  flex: 1 1 auto;
  font-size: 99px;
  line-height: 120px;
  text-align: center;
  height: auto;
  overflow: hidden;
}

.preview .behavior {
  position: absolute;
  bottom: 16px;
  left: 8px;
  right: 8px;
  background: #fffc;
}

.preview footer {
  text-align: center;
  background: #f008;
  color: white;
\`\`\`

## Styling

Note that the \`<xin-float>\` element has absolutely minimal styling. It's up to you to provide a drop
shadow and background and so on.

## Attributes

- \`drag\` false | true — to make a \`<xin-float>\` element draggable, simply set its \`drag\` attribute.
- \`remain-on-resize\` 'remove' | 'hide' | 'remain' — by default, floats will hide if the window is resized
- \`remain-on-scroll\` 'remain' | 'remove' | 'hide' — by default, floats will remain if the document is scrolled

Note that \`remain-on-scroll\` behavior applies to any scrolling in the document (including within the float) so
if you want finer-grained disappearing behavior triggered by scrolling, you might want to implement it yourself.

To prevent dragging for an interior element (e.g. if you want a floating palette with buttons or input fields)
just add the \`no-drag\` class to an element or its container.`,
    title: "float",
    filename: "float.ts",
    path: "src/float.ts"
  },
  {
    text: `# forms

\`<tosi-form>\` and \`<tosi-field>\` can be used to quickly create forms complete with
[client-side validation](https://developer.mozilla.org/en-US/docs/Learn/Forms/Form_validation#built-in_form_validation_examples).

\`\`\`js
const form = preview.querySelector('tosi-form')
preview.querySelector('.submit').addEventListener('click', form.submit)
\`\`\`
\`\`\`html
<tosi-form value='{"formInitializer": "initial value from form"}'>
  <h3 slot="header">Example Form Header</h3>
  <tosi-field caption="Required field" key="required"></tosi-field>
  <tosi-field optional key="optional"><i>Optional</i> Field</tosi-field>
  <tosi-field key="text" type="text" placeholder="type it in here">Tell us a long story</tosi-field>
  <tosi-field caption="Zip Code" placeholder="12345 or 12345-6789" key="zipcode" pattern="\\d{5}(-\\d{4})?"></tosi-field>
  <tosi-field caption="Date" key="date" type="date"></tosi-field>
  <tosi-field caption="Number" key="number" type="number"></tosi-field>
  <tosi-field caption="Range" key="range" type="range" min="0" max="10"></tosi-field>
  <tosi-field key="boolean" type="checkbox">😃 <b>Agreed?!</b></tosi-field>
  <tosi-field key="color" type="color" value="pink">
    favorite color
  </tosi-field>
  <tosi-field key="select">
    Custom Field
    <select slot="input">
      <option>This</option>
      <option>That</option>
      <option>The Other</option>
    </select>
  </tosi-field>
  <tosi-field key="tags">
    Tag List
    <tosi-tag-list editable slot="input" available-tags="pick me,no pick me"></tosi-tag-list>
  </tosi-field>
  <tosi-field key="rating">
    Rate this form!
    <tosi-rating slot="input"></tosi-rating>
  </tosi-field>
  <tosi-field key="like">
    Do you like it?
    <tosi-segmented
      choices="yes=Yes:thumbsUp,no=No:thumbsDown"
      slot="input"
    ></tosi-segmented>
  </tosi-field>
  <tosi-field key="relationship">
    Relationship Status
    <tosi-segmented
      style="--segmented-direction: column; --segmented-align-items: stretch"
      choices="couple=In a relationship,single=Single"
      other="It's complicated…"
      slot="input"
    ></tosi-segmented>
  </tosi-field>
  <tosi-field key="amount" fixed-precision="2" type="number" prefix="$" suffix="(USD)">
    What's it worth?
  </tosi-field>
  <tosi-field key="valueInitializer" value="initial value from field">
    Initialized by field
  </tosi-field>
  <tosi-field key="formInitializer">
    Initialized by form
  </tosi-field>
  <button slot="footer" class="submit">Submit</button>
</tosi-form>
\`\`\`
\`\`\`css
.preview tosi-form {
  height: 100%;
}

.preview ::part(header), .preview ::part(footer) {
  background: var(--inset-bg);
  justify-content: center;
  padding: calc(var(--spacing) * 0.5) var(--spacing);
}

.preview h3, .preview h4 {
  margin: 0;
  padding: 0;
}

.preview ::part(content) {
  padding: var(--spacing);
  gap: var(--spacing);
  background: var(--background);
}

.preview label {
  display: grid;
  grid-template-columns: 180px auto 100px;
  gap: var(--spacing);
}

.preview label [part="caption"] {
  text-align: right;
}

.preview label:has(:invalid:required)::after {
  content: '* required'
}

@media (max-width: 500px) {
  .preview label [part="caption"] {
    text-align: center;
  }

  .preview label {
    display: flex;
    flex-direction: column;
    position: relative;
    align-items: stretch;
    gap: calc(var(--spacing) * 0.5);
  }

  .preview label:has(:invalid:required)::after {
    position: absolute;
    top: 0;
    right: 0;
    content: '*'
  }

  .preview tosi-field [part="field"],
  .preview tosi-field [part="input"] > * {
    display: flex;
    justify-content: center;
  }
}

.preview :invalid {
  box-shadow: inset 0 0 0 2px #F008;
}
\`\`\`

## \`<tosi-form>\`

\`<tosi-form>\` prevents the default form behavior when a \`submit\` event is triggered and instead validates the
form contents (generating feedback if desired) and calls its \`submitCallback(value: {[key: string]: any}, isValid: boolean): void\`
method.

\`<tosi-form>\` offers a \`fields\` proxy that allows values stored in the form to be updated. Any changes will trigger a \`change\`
event on the \`<tosi-form>\` (in addition to any events fired by form fields).

\`<tosi-form>\` instances have \`value\` and \`isValid\` properties you can access any time. Note that \`isValid\` is computed
and triggers form validation.

\`<tosi-form>\` has \`header\` and \`footer\` \`<slot>\`s in addition to default \`<slot>\`, which is tucked inside a \`<form>\` element.

## \`<tosi-field>\`

\`<tosi-field>\` is a simple web-component with no shadowDOM that combines an \`<input>\` field wrapped with a \`<label>\`. Any
content of the custom-element will become the \`caption\` or you can simply set the \`caption\` attribute.

You can replace the default \`<input>\` field by adding an element to the slot \`input\` (it's a \`xinSlot\`) whereupon
the \`value\` of that element will be used instead of the built-in \`<input>\`. (The \`<input>\` is retained and
is used to drive form-validation.)

\`<tosi-field>\` supports the following attributes:

- \`caption\` labels the field
- \`key\` determines the form property the field will populate
- \`type\` determines the data-type: '' | 'checkbox' | 'number' | 'range' | 'date' | 'text' | 'color'
- \`optional\` turns off the \`required\` attribute (fields are required by default)
- \`pattern\` is an (optional) regex pattern
- \`placeholder\` is an (optional) placeholder

The \`text\` type populates the \`input\` slot with a \`<textarea>\` element.

The \`color\` type populates the \`input\` slot with a \`<xin-color>\` element (and thus supports colors with alpha values).

<xin-css-var-editor element-selector="tosi-field" target-selector=".preview"></xin-css-var-editor>

## Native Form Integration

The following components support native form integration via \`formAssociated\`:

- \`<tosi-rating>\` - star ratings
- \`<tosi-select>\` - custom select dropdowns
- \`<tosi-segmented>\` - segmented button groups
- \`<tosi-tag-list>\` - tag selection lists

These components can be used directly in a standard \`<form>\` element with full support for:
- Form submission (values included in FormData)
- Form reset
- Required field validation
- The \`:invalid\` and \`:valid\` CSS pseudo-classes

\`\`\`html
<form id="native-form" class="native-form">
  <label>
    <span>Rate our service (required):</span>
    <tosi-rating name="rating" required min="1"></tosi-rating>
  </label>

  <label>
    <span>Select your country:</span>
    <tosi-select name="country" required placeholder="-- Select --"
      options="us=United States:flag,uk=United Kingdom:flag,ca=Canada:flag,au=Australia:flag"
    ></tosi-select>
  </label>

  <label>
    <span>Subscription tier:</span>
    <tosi-segmented
      name="tier"
      required
      choices="free=Free,pro=Pro:star,enterprise=Enterprise:tosi"
    ></tosi-segmented>
  </label>

  <label>
    <span>Interests (select at least one):</span>
    <tosi-tag-list
      name="interests"
      required
      editable
      available-tags="Technology,Sports,Music,Art,Travel,Food"
    ></tosi-tag-list>
  </label>

  <div class="buttons">
    <button type="submit">Submit</button>
    <button type="reset">Reset</button>
  </div>
</form>
\`\`\`
\`\`\`css
.preview .native-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
  overflow: auto;
  height: 100%;
}

.preview .native-form label {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.preview .native-form .buttons {
  display: flex;
  gap: 8px;
}

.preview tosi-rating:invalid,
.preview tosi-select:invalid,
.preview tosi-segmented:invalid,
.preview tosi-tag-list:invalid {
  outline: 2px solid #f008;
  outline-offset: 2px;
}

.preview tosi-rating:valid,
.preview tosi-select:valid,
.preview tosi-segmented:valid,
.preview tosi-tag-list:valid {
  outline: 2px solid #0a08;
  outline-offset: 2px;
}
\`\`\`
\`\`\`js
const { TosiDialog } = tosijsui
const form = preview.querySelector('#native-form')

form.addEventListener('submit', (e) => {
  e.preventDefault()
  const formData = new FormData(form)
  const data = Object.fromEntries(formData.entries())
  TosiDialog.alert(JSON.stringify(data, null, 2), 'Form Submitted')
})

form.addEventListener('reset', () => {
  TosiDialog.alert('Form has been reset', 'Reset')
})
\`\`\`

## Using formAssociated Components with tosi-form

While the formAssociated components work with native \`<form>\` elements, using them with \`<tosi-form>\`
provides additional benefits:

- **No submit prevention boilerplate** - \`tosi-form\` automatically prevents the default form submission
- **JSON state management** - Initialize and access form state as a JavaScript object via \`value\` and \`fields\`
- **Validation feedback** - Built-in \`isValid\` property and \`submitCallback\` with validation status
- **Change events** - Unified change events on the form element

Since these components now support \`formAssociated\`, they participate directly in form submission
and validation without needing the hidden input workaround that \`tosi-field\` uses.

\`\`\`html
<tosi-form id="tosi-form" value='{"rating": 3, "tier": "pro"}'>
  <h4 slot="header">tosi-form with formAssociated Components</h4>

  <label class="form-row">
    <span>Service Rating:</span>
    <tosi-rating name="rating" required min="1"></tosi-rating>
  </label>

  <label class="form-row">
    <span>Country:</span>
    <tosi-select name="country" required placeholder="-- Select --"
      options="us=United States:flag,uk=United Kingdom:flag,ca=Canada:flag"
    ></tosi-select>
  </label>

  <label class="form-row">
    <span>Subscription:</span>
    <tosi-segmented
      name="tier"
      required
      choices="free=Free,pro=Pro:star,enterprise=Enterprise:tosi"
    ></tosi-segmented>
  </label>

  <label class="form-row">
    <span>Interests:</span>
    <tosi-tag-list
      name="interests"
      required
      editable
      available-tags="Tech,Sports,Music,Art"
    ></tosi-tag-list>
  </label>

  <div slot="footer" style="display: flex; gap: 8px;">
    <button class="submit-btn">Submit</button>
    <button class="reset-btn">Reset</button>
    <button class="set-values-btn">Set Values</button>
  </div>
</tosi-form>
\`\`\`
\`\`\`css
.preview #tosi-form {
  height: auto;
}

.preview #tosi-form .form-row {
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: 8px;
  align-items: center;
}

.preview #tosi-form .form-row > span {
  text-align: right;
}

.preview #tosi-form ::part(content) {
  padding: 16px;
  gap: 12px;
}

.preview #tosi-form ::part(header) {
  padding: 8px 16px;
}

.preview #tosi-form ::part(footer) {
  padding: 8px 16px;
}
\`\`\`
\`\`\`js
const { TosiDialog } = tosijsui
const tosiForm = preview.querySelector('#tosi-form')

// Set up submit callback
tosiForm.submitCallback = (value, isValid) => {
  const title = isValid ? 'Form Submitted (Valid)' : 'Form Submitted (Invalid)'
  TosiDialog.alert(JSON.stringify(value, null, 2), title)
}

preview.querySelector('.submit-btn').addEventListener('click', () => {
  tosiForm.submit()
})

preview.querySelector('.reset-btn').addEventListener('click', () => {
  tosiForm.value = {}
  tosiForm.querySelectorAll('tosi-rating, tosi-select, tosi-segmented, tosi-tag-list').forEach(el => {
    el.value = el.tagName === 'TOSI-TAG-LIST' ? [] : null
  })
  TosiDialog.alert('Form has been reset', 'Reset')
})

preview.querySelector('.set-values-btn').addEventListener('click', () => {
  // Demonstrate programmatic value setting
  const rating = tosiForm.querySelector('tosi-rating')
  const select = tosiForm.querySelector('tosi-select')
  const segmented = tosiForm.querySelector('tosi-segmented')
  const tagList = tosiForm.querySelector('tosi-tag-list')

  rating.value = 5
  select.value = 'uk'
  segmented.value = 'enterprise'
  tagList.value = ['Tech', 'Music']

  TosiDialog.alert('Values set programmatically:\\n\\nRating: 5\\nCountry: uk\\nTier: enterprise\\nInterests: Tech, Music', 'Values Set')
})
\`\`\``,
    title: "forms",
    filename: "form.ts",
    path: "src/form.ts"
  },
  {
    text: `# gamepads

A couple of utility functions for dealing with gamepads and XRInputs.

\`gamepadState()\` gives you a condensed version of active gamepad state

\`gamepadText()\` provides the above in minimal text form for debugging

\`\`\`js
import { elements } from 'tosijs'
import { gamepadText } from 'tosijs-ui'

const pre = elements.pre()
preview.append(pre)

const interval = setInterval(() => {
  if (!pre.closest('body')) {
    clearInterval(interval)
  } else {
    pre.textContent = gamepadText()
  }
}, 100)
\`\`\`

## XRInput Devices

> This is experimental, the API is changing and stuff doesn't work. Hopefully it
> will become a lot more generally useful once Apple's VisionPro comes out.

\`xrControllers(babylonjsXRHelper)\` returns an \`XinXRControllerMap\` structure that tries to
conveniently render the current state of XR controls. (The babylonjs API for this is horrific!)

\`xrControllerText(controllerMap)\` renders the map output by the above in a compact form
which is useful when debugging.`,
    title: "gamepads",
    filename: "gamepad.ts",
    path: "src/gamepad.ts"
  },
  {
    text: `# icons

<div class="center" style="display: flex; gap: 10px; padding: 10px">
  <xin-icon title="tosijs" icon="tosiFavicon" style="--xin-icon-size: 128px"></xin-icon>
  <xin-icon title="tosijs-ui" icon="tosiUi" style="--xin-icon-size: 128px"></xin-icon>
  <xin-icon title="tosi-platform" icon="tosiPlatform" style="--xin-icon-size: 128px"></xin-icon>
</div>

A library that provides \`ElementCreator\` functions that produce SVG icons. It leverages \`tosijs\`'s
\`svgElements\` proxy and is intended to address all the key use-cases for SVG icons in web
applications along with being very easy to extend and maintain.

> ### Supported Use Cases
> - inline SVGs that can be styled by CSS (for buttons, etc.)
> - allows both stroked and filled icons (unlike font-based systems)
> - support for color icons (without requiring multiple glyphs perfectly aligned)
> - icons can be rendered  as data urls, e.g. to insert into CSS… (the little \`owl\` logo rendered under blockquotes is an example)

### Nice Features
> - no build process magic needed (your icons are "just javascript", no special CSS files needed, no magic glyph mappings). Adding new, or overriding existing, icons is trivial.
> - icons are just regular SVG, not a specialized subset.
> - highly optimized and compressible (the code is comparable in size to what you get with a compressed font built from the same icons, except icon fonts don't support strokes, gradients, etc.)

## icons

\`icons\` is a proxy that generates an \`ElementCreator\` for a given icon on demand,
e.g. \`icons.chevronDown()\` produces an \`<svg>\` element containing a downward-pointing chevron
icon with the class \`icon-chevron-down\`.

\`\`\`js
const  { tosi, elements } = tosijs
import { icons, svgIcon, postNotification } from 'tosijs-ui'

const { div, input } = elements

const { iconDemo } = tosi({
  iconDemo: {
    icon: ''
  }
})

preview.append(
  input({
    placeholder: 'filter icons by name',
    type: 'search',
    onInput(event) {
      const needle = event.target.value.toLocaleLowerCase()
      const tiles = Array.from(preview.querySelectorAll('.tile'))
      tiles.forEach(tile => {
        const xinIcon = tile.children[0]
        tile.style.display = xinIcon.icon.toLocaleLowerCase().includes(needle) ? '' : 'none'
      })
    }
  }),
  div(
    {
      class: 'scroller'
    },
    ...Object.keys(icons).sort().map(iconName => div(
      {
        class: 'tile',
        onClick() {
          iconDemo.icon = iconDemo.icon != iconName ? iconName : ''
          postNotification({
            icon: iconName,
            message: \`\${iconName} clicked\`,
            duration: 2,
            color: 'hotpink'
          })
        },
        onMouseleave() {
          iconDemo.icon = ''
        }
      },
      svgIcon({icon: iconName, size: 24}),
      div(iconName)
    )),
  ),
  svgIcon({
    class: 'icon-detail',
    size: 256,
    bind: {
      binding: {
        toDOM(element, value) {
          element.style.opacity = value ? 1 : 0
          if (value) element.icon = value
        }
      },
      value: iconDemo.icon
    }
  })
)
\`\`\`
\`\`\`css
.preview .scroller {
  display: grid;
  grid-template-columns: calc(33% - 5px) calc(33% - 5px) calc(33% - 5px);
  grid-auto-rows: 44px;
  flex-wrap: wrap;
  padding: var(--spacing);
  gap: var(--spacing);
  overflow: hidden scroll !important;
  height: 100%;
}

.preview input[type=search] {
  margin: 10px 10px 0;
  width: calc(100% - 20px);
}

.preview .tile {
  display: flex;
  text-align: center;
  cursor: pointer;
  background: #8882;
  padding: 10px;
  gap: 10px;
  border-radius: 5px;
}

.preview .tile:hover {
  background: #8884;
  color: var(--brand-color);
}

.preview .tile > div {
  font-family: Menlo, Monaco, monospace;
  whitespace: no-wrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 14px;
  line-height: 1.5;
}

.preview .tile xin-icon {
  font-size: 24px;
}

.preview .icon-detail {
  position: absolute;
  display: block;
  height: 296px;
  opacity: 0;
  transition: 0.5s ease-out;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  padding: 20px;
  background: #8886;
  border-radius: 20px;
  pointer-events: none;
}
\`\`\`

These icons are completely unstyled and can be colored using the css \`fill\` property. This will
probably be broken out as a standalone library to allow the use of whatever icons you like
(its source data is currently generated from an [icomoon](https://icomoon.com/app)
\`selection.json\` file, but could just as easily be generated from a directory full of SVGs).

## Adding and redefining icons

Simply pass a map of icon names to svg source strings…

\`\`\`
defineIcons({
  someIcon: '<svg ....',
  otherIcon: '<svg ...',
})
\`\`\`

### Icon Classes

Icons will be generated with the class \`xin-icon\`.

You can also assign the classes \`filled\`, \`stroked\`, and \`color\` to icons to set default
icon styling.

## \`<xin-icon>\`

\`<xin-icon>\` is a simple component that lets you embed icons as HTML. Check the CSS tab to see
how it's styled.

\`<xin-icon>\` supports four attributes:

- \`size\` (defaults to 0) if non-zero sets the height of the icon in pixels
- \`icon\` is the name of the icon
- \`color\` is the fill color (if you don't want to style it using CSS)
- \`stroke\` is the stroke color
- \`stroke-width\` (defaults to 1) is the width of the stroke assuming the icon's viewBox is 1024 units tall but the
  icon is rendered at 32px (so it's multiplied by 32).

> **Aside**: the tool used to build the icon library scales up the viewBox to 1024 tall and then rounds
> all coordinates to nearest integer on the assumption that this is plenty precise enough for icons and
> makes everything smaller and easier to compress.

## SVGs as data-urls

\`\`\`js
import { elements } from 'tosijs'
import { icons, svg2DataUrl } from 'tosijs-ui'

preview.append(
  elements.span({
    style: {
      display: 'inline-block',
      width: '120px',
      height: '24px',
      content: '" "',
      background: svg2DataUrl(icons.search(), 'none', '#bbb', 3)
    }
  }),
  elements.span({
    style: {
      display: 'inline-block',
      width: '120px',
      height: '24px',
      content: '" "',
      background: svg2DataUrl(icons.star(), 'gold', 'orange', 4)
    }
  }),
  // Note that this is a color icon whose fill and stroke are "baked in"
  elements.span({
    style: {
      display: 'inline-block',
      width: '100px',
      height: '200px',
      content: '" "',
      background: svg2DataUrl(icons.tosi(), undefined, undefined, 2)
    }
  }),
)
\`\`\`

\`svg2DataUrl(svg: SVGElement, fill?: string, stroke?: string, strokeWidth?: number): string\` is provided as a
utility for converting SVG elements into data-urls (e.g. for incorporation into
CSS properties. (It's used by the \`<xin-3d>\` component to render the XR widget.)

If you're using \`SVGElement\`s created using the \`icons\` proxy, you'll want to provide \`fill\` and/or
\`stroke\` values, because images loaded via css properties cannot be styled.

## Color Icons

\`\`\`html
<xin-icon icon="tosiFavicon" class="demo-icon"></xin-icon>
<xin-icon icon="tosiPlatform" class="demo-icon recolored"></xin-icon>
<xin-icon icon="tosiXr" class="demo-icon animated"></xin-icon>
\`\`\`
\`\`\`css
.demo-icon {
  --xin-icon-size: 160px
}

.recolored > svg {
  pointer-events: all;
  transition: 0.25s ease-out;
  transform: scale(1);
  filter: grayscale(0.5)
}

.recolored:hover > svg {
  opacity: 1;
  transform: scale(1.1);
  filter: grayscale(0);
}

.animated > svg {
  animation: 2s linear 0s infinite rainbow;
}

@keyframes rainbow {
  0% {
    filter: hue-rotate(0deg);
  }
  100% {
    filter: hue-rotate(360deg);
  }
}
\`\`\`

Colored icons have the \`color\` class added to them, so you can easily create css rules
that, for example, treat all colored icons inside buttons the same way.

> Earlier versions of this library replaced color specifications with CSS-variables in a
> very convoluted way, but in practice this isn't terribly useful as SVG properties can't
> be animated by CSS, so this functionality has been stripped out.

## Missing Icons

If you ask for an icon that isn't defined, the \`icons\` proxy will print a warning to console
and render a \`square\` (in fact, \`icons.square()\`) as a fallback.

## Why?

My evolution has been:

1. Using Icomoon.io, which I still think is a solid choice for managing custom icon fonts
2. Processing Icomoon selection.json files into icon-data and then generating SVGs dynamically
   from the data
3. Ingesting SVGs directly, with a little cleanup

The goal is always to have a single source of truth for icons, no magic or convoluted tooling, and
be able to quickly and easily add and replace icons, distribute them with components, and
have no mess or fuss.

1. Works well, but…
   - color icons are flaky,
   - doesn't play well with others,
   - can't really distribute the icons with your components.
   - difficult to use icons in CSS \`content\`
   - impossible to use icons in CSS backgrounds
2. This is \`icons.ts\` until just now! Solves all the above, but…
   - no fancy SVG effects, like gradients (goodness knows I experimented with converting CSS gradients to SVG gradients) and, most
   - **strokes** need to be converted to outlines
   - outlined strokes can't be styled the way strokes can
   - blocks use of popular icon libraries
3. This is how everyone else works, except…
   - no build magic needed: \`defineIcons({ myIcon: '<svg....>', ... })\`
   - if you want build magic, \`icons.js\` has no dependencies, finds icons and creates an \`icon-data.ts\` file.
   - smaller icon files, even though I'm now including more icons (including *all the current* feathericons)

## Icon Sources

Many of these icons are sourced from [Feather Icons](https://github.com/feathericons/feather), but
all the icons have been processed to have integer coordinates in a \`viewBox\` typically scaled to 1024  &times; 1024.

The corporate logos (Google, etc.) are from a variety of sources, in many cases ultimately from the
organizations themselves. It's up to you to use them correctly.

The remaining icons I have created myself using the excellent but sometimes flawed
[Amadine](https://apps.apple.com/us/app/amadine-vector-design-art/id1339198386?mt=12)
and generally reliable [Graphic](https://apps.apple.com/us/app/graphic/id404705039?mt=12).

### Feather Icons Copyright Notice

The MIT License (MIT)

Copyright (c) 2013-2023 Cole Bemis

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.`,
    title: "icons",
    filename: "icons.ts",
    path: "src/icons.ts"
  },
  {
    text: `# kitchen sink

This is a testbed for checking styles

## Typography

### This is an H3

You are such a nerd. No wonder you only hang out with boys. Mornings are for coffee and contemplation. We never would've upset you if we knew you had superpowers. 

If anyone asks where I am, I've left the country. It’s finger-lickin’ good. You are such a nerd. No wonder you only hang out with boys.She shut one door! With her mind! Hey kiddo, would you like a balloon? 

Nobody normal ever accomplished anything meaningful in this world. It's just, sometimes... people don't really say what they're really thinking. But when you capture the right moment, it says more.Why are you keeping this curiosity door lock? Mornings are for coffee and contemplation. 


#### This is an H4

> Um, I'm happy you're home. This is not yours to fix alone. 
> ##### This is an H5
> You act like you’re all alone out there in the world, but you’re not. You’re not alone. This is not yours to fix alone.
> You act like you want me to be your friend and then you treat me like garbage. 
> ###### This is an H6
> It’s about the shadow monster, isn’t it? Do you know anything about sensory deprivation tanks? Specifically how to build one? YOU BETTER RUN! She's our friend, and she's crazy!

## HTML Widgets

> These are wrapped in a div with \`display: flex; flex-direction: column; gap: 0.5em\`.

<div style="display: flex; flex-direction: column; gap: 0.5em">
  <select value="That">
    <option>This</option>
    <option>That</option>
    <option>The other</option>
  </select>
  
  <label>
    <span>input field</span>
    <input placeholder="text goes here">
  </label>
  
  <label>
    <span>input[type="date"]</span>
    <input type="date">
  </label>
  
  <label>
    <span>input[type="number"]</span>
    <input type="number" value="17" step="0.5">
  </label>
  
  <label>
    <span>input[type="range"]</span>
    <input type="range" min="1" max="10" step="2" value="3">
  </label>
  
  <label>
    <span>input[type="color"]</span>
    <input type="color" value="hotpink">
  </label>
  
  <progress></progress>
  <progress value="33" max="100"></progress>
  
  <label>
    <span>textarea</span>
    <textarea></textarea>
  </label>
  
  <button>Cancel</button> <button>OK</button>
</div>`,
    title: "kitchen sink",
    filename: "kitchen-sink.md",
    path: "src/kitchen-sink.md"
  },
  {
    text: `# localize

\`tosijs-ui\` provides support for localization via the \`localize\` method and the \`<xin-locale-picker>\`
and \`<xin-localized>\` custom-elements.

> ### Important Note
> This module deals with the **language** used in the user interface. "locale" is
> *not the same thing*. The (usually) two-letter codes used designate **language**
> and **not locale**.
>
> E.g. the US *locale* includes things like measurement systems
> and date format. Most European locales use commas where we use decimal points in the US.
>
> Similarly, \`ja\` is the code for the Japanese **language** while \`jp\` is the **locale**.

## \`initLocalization(localizationData: string)\`

Enables localization from TSV string data.

## XinLocalePicker

A selector that lets the user pick from among supported languages.

\`\`\`html
<h3>Locale Picker</h3>
<xin-locale-picker></xin-locale-picker>

<h3>Locale Picker with <code>hide-captions</code></h3>
<xin-locale-picker hide-caption></xin-locale-picker>
\`\`\`

## \`localize()\`

If you just want to localize a string with code, use \`localize(s: string): string\`.

If the reference string only matches when both are converted to
lowercase, the output string will also be lowercase.

E.g. if you have localized \`Cancel\` as \`Annuler\`, then \`localize("cancel")
will output \`annuler\`.

### ellipses

If you end a string with an ellipsis, \`localize\` will ignore the ellipsis,
localize the string, and then append the ellipsis.

## \`setLocale(language: string)\`

\`\`\`js
import { button, p } from 'tosijs'.elements
import { setLocale } from 'tosijs-ui'

preview.append(
  p(
    button(
      {
        onClick() {
          setLocale('en-US')
        }
      },
      'setLocale("en-US")'
    )
  ),
  p(
    button(
      {
        onClick() {
          setLocale('fr')
        }
      },
      'setLocale("fr")'
    )
  ),
  p(
    button(
      {
        onClick() {
          setLocale('qq')
        }
      },
      'setLocale("qq") (see console for error message)'
    )
  ),
)
\`\`\`

If you want to directly set locale, just use \`setLocale()\`.

## XinLocalized

A span-replacement that automatically localizes its text content.
By default the case in the localized data is preserved unless the
reference text is all lowercase, in which case the localized text
is also lowercased.

While viewing this documentation, all \`<xin-localized>\` elements should display a **red
underline**.

\`\`\`html
<h3>Localized Widgets</h3>
<button><xin-localized>Yes</xin-localized></button>
<button><xin-localized>No</xin-localized></button>
<button><xin-localized>Open…</xin-localized></button> <i>note the ellipsis</i>

<h3>Lowercase is preserved</h3>
<button><xin-localized>yes</xin-localized></button>
<button><xin-localized>no</xin-localized></button>
<button><xin-localized>open…</xin-localized></button>

<h3>Localized Attribute</h3>
<input>
\`\`\`
\`\`\`css
xin-localized {
  border-bottom: 2px solid red;
}
\`\`\`
\`\`\`js
import { xinLocalized, localize } from 'tosijs-ui'

preview.append(xinLocalized({
  refString: 'localized placeholder',
  localeChanged() {
    this.previousElementSibling.setAttribute('placeholder', localize(this.refString))
  }
}))
\`\`\`

\`<xin-localized>\` has a \`refString\` attribute (which defaults to its initial \`textContent\`)
which is the text that it localizes. You can set it directly.

It also has an \`localeChanged\` method which defaults to setting the content of the element
to the localized reference string, but which you can override, to (for example) set a property
or attribute of the parent element.

> \`<xin-localized>\` *can* be used inside the shadowDOM of other custom-elements.

## \`i18n\`

All of the data can be bound in the \`i18n\` proxy (\`xin.i18n\`), including the currently selected
locale (which will default to \`navigator.language\`).

You can take a look at \`xin.i18n\` in the console. \`i18n\` can be used to access localization
data directly, and also to determine which locales are available \`i18n.locales\` and set the
locale programmatically (e.g. \`i18n.locale = 'en'\`).

\`\`\`
if (i18n.locales.includes('fr')) {
  i18n.locale = 'fr'
}
\`\`\`

## Creating Localized String Data

You can create your own localization data using any spreadsheet and exporting TSV.

E.g. you can automatically create localization data
using something like my [localized](https://docs.google.com/spreadsheets/d/1L0_4g_dDhVCwVVxLzYbMj_H86xSp9lsRCKj7IS9psso/edit?usp=sharing)
Google Sheet which leverages \`googletranslate\` to automatically translate reference strings
(and which you can manually override as you like).

E.g. in this demo I've replaced the incorrect translation of "Finnish"
(\`googletranslate\` used the word for Finnish nationality rather than the language).

The format of the input data is a table in TSV format, that looks like this:

en-US | fr | fi | sv | zh
------|----|----|----|----
English (US) | French | Finnish | Swedish | Chinese (Mandarin)
English (US) | Français | suomi | svenska | 中文（普通话）
🇺🇸 | 🇫🇷 | 🇫🇮 | 🇸🇪 | 🇨🇳
Icon | Icône | Kuvake | Ikon | 图标
Ok | D'accord | Ok | Ok | 好的
Cancel | Annuler | Peruuttaa | Avboka | 取消

- Column 1 is your reference language.
- Row 1 is [language code](https://en.wikipedia.org/wiki/List_of_ISO_639_language_codes).
- Row 2 is the name of the language in your reference language.
- Row 3 is the name of the language in itself (because it's silly to expect people
  to know the name of their language in a language they don't know)
- Row 4 is the flag emoji for that language (yes, that's problematic, but languages
  do not have flags, per se)
- Rows 5 and on are user interface strings you want to localize

In the spreadsheet provided, each cell contains a formula that translates the term
in the left-most column from the language in that column to the language in the
destination column. Once you have an automatic translation, you can hand off the
sheet to language experts to vet the translations.

Finally, create a \`tsv\` file and then turn that into a Typescript file by wrapping
the content thus:

\`\`\`
export default \`( content of tsv file )\`
\`\`\`

You use this data using \`initLocalization()\`.

## Leveraging XinLocalized Automatic Updates

If you want to leverage XinLocalized's automatic updates you simply need to
implement \`updateLocale\` and register yourself with \`XinLocalized.allInstances\`
(which is a \`Set<AbstractLocalized>).

Typically, this would look like something like:

\`\`\`
class MyLocalizedComponent extends Component {
  ...

  // register yourself as a localized component
  connectecCallback() {
    super.connectedCallback()

    XinLocalized.allInstances.add(this)
  }

  // avoid leaking!
  disconnectecCallback() {
    super.connectedCallback()

    XinLocalized.allInstances.delete(this)
  }

  // presumably your render method does the right things
  updateLocale = () =>  {
    this.queueRender()
  }
}
\`\`\``,
    title: "localize",
    filename: "localize.ts",
    path: "src/localize.ts"
  },
  {
    text: `# lottie / bodymovin

A [lottie](https://airbnb.io/lottie/#/web) (a.k.a. **bodymovin**) player.

It's designed to work like an \`<img>\` element (just set its \`src\` attribute).

\`\`\`js
import { icons, popFloat, xinSelect } from 'tosijs-ui'
import { div, label, input, select, option, span } from 'tosijs'.elements

const tosiPlatform = preview.querySelector('xin-lottie')
setTimeout(
  () => {
 preview.append(
   popFloat({
     draggable: true,
     content: [
       { class: 'panel' },
       div({ class: 'panel-header' }, 'Player Controls' ),
       label(
         { class: 'no-drag' },
         'speed',
         input({ type: 'range', min: -1, max: 1, step: 0.1, value: 0, onInput(event) {
           const speed = Math.pow(5, Number(event.target.value))
           tosiPlatform.animation.setSpeed(speed)
           event.target.nextSibling.textContent = (speed * 100).toFixed(0) + '%'
         } }),
         span('100%', {style: { textAlign: 'right', width: '40px'}})
       ),
       label(
         { class: 'no-drag' },
         'direction',
         xinSelect({
           value: '1',
           options: [
             { caption: 'Forward', value: '1' },
             { caption: 'Backward', value: '-1' }
           ],
           onChange(event) {
             tosiPlatform.animation.setDirection(event.target.value)
           }
         })
       )
     ],
     target: tosiPlatform,
     position: 's'
   })
 )
  },
  500
)
\`\`\`
\`\`\`html
<xin-lottie
  style="width: 200px; height: 200px;"
  src="/tosi-platform.json"
></xin-lottie>
<div class="caption">
  Animation created by <a target="_blank" href="https://pro.fiverr.com/freelancers/anicoremotion">@anicoremotion</a>
</div>
\`\`\`
\`\`\`css
.preview {
  padding: var(--spacing);
  text-align: center;
}

.preview .panel {
  padding: 10px;
  border-radius: 5px;
  gap: 5px;
  background: var(--background);
  box-shadow: var(--menu-shadow);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.preview .caption {
  position: absolute;
  right: 5px;
  bottom: 5px;
}

.preview .panel-header {
  margin: 0;
  text-align: center;
  font-weight: bold;
  background: var(--brand-color);
  color: white;
  padding: 5px;
  margin: -10px -10px 0 -10px;
  cursor: move;
}
\`\`\`

You can also directly set its \`json\` property to the content of a \`lottie.json\` file.

And of course just access the element's \`animation\` property to [use the bodymovin API](https://airbnb.io/lottie/#/web).

Also see the [documentation for advanced interactions](https://lottiefiles.github.io/lottie-docs/advanced_interactions/)`,
    title: "lottie / bodymovin",
    filename: "bodymovin-player.ts",
    path: "src/bodymovin-player.ts"
  },
  {
    text: `# makeSorter

I'm always confusing myself when writing sort functions, so I wrote \`makeSorter()\`. It's
insanely simple and just works™. It makes writing an array sort callback for anything
other than an array of numbers or strings easier.

\`\`\`js
import { select, option, div, span, ul, li } from 'tosijs'.elements
import { icons, makeSorter } from 'tosijs-ui'

const people = [
  { first: 'Frasier', last: 'Crane', age: 38 },
  { first: 'Lilith', last: 'Crane', age: 37 },
  { first: 'Rebecca', last: 'Howe', age: 35 },
  { first: 'Woody', last: 'Boyd', age: 25 },
  { first: 'Sam', last: 'Malone', age: 40 },
  { first: 'Norm', last: 'Peterson', age: 38 },
]

const sorters = {
  firstSort: makeSorter(person => [person.first]),
  firstDescSort: makeSorter(person => [person.first], false),
  nameSort: makeSorter(person => [person.last, person.first]),
  ageFirst: makeSorter(person => [-person.age, person.last]),
  ageLast: makeSorter(person => [person.age, person.first], [true, false]),
}

function person({first, last, age}) {
  return li(\`\${first} \${last}, \${age}\`)
}

const list = ul()
sortPicker = select(
  option('Sort by first', {value: 'firstSort'}),
  option('Sort by first (desc)', {value: 'firstDescSort'}),
  option('Sort by last, first', {value: 'nameSort'}),
  option('Sort by age (desc), first', {value: 'ageFirst'}),
  option('Sort by age, last (desc)', {value: 'ageLast'}),
  {
    onChange: render,
    value: 'nameSort'
  },
)

function render () {
  list.textContent = ''
  list.append(...people.sort(sorters[sortPicker.value]).map(person))
}

preview.append(
  div(
    sortPicker,
    icons.chevronDown()
  ),
  list
)

render()
\`\`\`
\`\`\`css
.preview {
  padding: var(--spacing);
}

.preview div {
  position: absolute;
  top: var(--spacing);
  right: var(--spacing);
}
\`\`\`

## Details

To create a sort callback that sorts by propA then propB (if propA is tied):

\`\`\`
const sorter = makeSorter(
  obj => [obj.propA, obj.propB]
)
\`\`\`

As above, but sort descending:
\`\`\`
const sorter = makeSorter(
  obj => [obj.propA, obj.propB],
  false
)
\`\`\`

As above but propA is sorted ascending, propB descending
\`\`\`
const sorter = makeSorter(
  obj => [obj.propA, obj.propB],
  [true, false]
)
\`\`\``,
    title: "makeSorter",
    filename: "make-sorter.ts",
    path: "src/make-sorter.ts"
  },
  {
    text: `# map

A [mapboxgl](https://docs.mapbox.com/mapbox-gl-js/api/) wrapper.

\`\`\`js
const pickStyle = preview.querySelector('select')
const mapbox = preview.querySelector('xin-map')
const here = preview.querySelector('button')

pickStyle.addEventListener('change', () => {
  mapbox.mapStyle = pickStyle.value
})

function getUserGPSCoordinates() {
  return new Promise((resolve) => {
    // Check if geolocation is supported
    if (!navigator.geolocation) {
      console.log("Geolocation is not supported by this browser.");
      resolve(null);
      return;
    }

    // Request position with options
    navigator.geolocation.getCurrentPosition(
      // Success callback
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
      },
      // Error callback
      (error) => {
        console.log(\`Error getting location: \${error.message}\`);
        resolve(null);
      },
      // Options
      {
        enableHighAccuracy: true,  // Request high accuracy if available
        timeout: 10000,            // Time to wait for position (10 seconds)
        maximumAge: 0              // Don't use cached position
      }
    );
  });
}

here.addEventListener('click', async () => {
  const location = await getUserGPSCoordinates()
  if (location) {
    mapbox.coords = \`\${location.latitude},\${location.longitude},12\`
  }
})
\`\`\`
\`\`\`html
<!-- please don't abuse my mapbox token -->
<xin-map
  style="width: 100%; height: 100%"
  coords="14.0093606,120.995083,17"
  token="pk.eyJ1IjoicG9kcGVyc29uIiwiYSI6ImNqc2JlbWU0bjA1ZmY0YW5ycHZod3VhbWcifQ.arvqfpOqMgFYkKgQ35UScA"
  map-style="mapbox://styles/mapbox/streets-v12"
></xin-map>
<select>
  <option selected value="mapbox://styles/mapbox/streets-v12">Streets</option>
  <option value="mapbox://styles/mapbox/satellite-v9">Satellite</option>
  <option value="mapbox://styles/mapbox/light-v11">Light</option>
  <option value="mapbox://styles/mapbox/dark-v11">Dark</option>
  <option value="mapbox://styles/mapbox/outdoors-v12">Outdoors</option>
</select>
<button>
  <xin-icon icon="mapPin"></xin-icon>
  <span>Your Location</span>
</button>
\`\`\`
\`\`\`css
.preview button {
  position: absolute;
  right: 10px;
  top: 10px;
  display: flex;
  align-items: center;
  gap: 5px;
}

.preview select {
  position: absolute;
  bottom: 10px;
  right: 10px;
}
\`\`\`

There's no need to learn new APIs or write wrappers, just access the element's \`map\` property
and [use the standard mapbox APIs directly](https://docs.mapbox.com/api/maps/styles/).

## Form Integration

\`<xin-map>\` is form-associated, making it useful as a location picker in forms:

\`\`\`html
<form class="map-form">
  <label>
    <b>Select your location:</b>
    <xin-map
      name="location"
      style="width: 100%; height: 200px"
      coords="40.7128,-74.0060,10"
      token="pk.eyJ1IjoicG9kcGVyc29uIiwiYSI6ImNqc2JlbWU0bjA1ZmY0YW5ycHZod3VhbWcifQ.arvqfpOqMgFYkKgQ35UScA"
    ></xin-map>
  </label>
  <button type="submit">Submit Location</button>
  <button type="reset">Reset</button>
  <span class="output"></span>
</form>
\`\`\`
\`\`\`css
.preview .map-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.preview .map-form label {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
\`\`\`
\`\`\`js
const form = preview.querySelector('.map-form')
form.addEventListener('submit', (e) => {
  e.preventDefault()
  const data = new FormData(form)
  form.querySelector('.output').textContent = 'Location: ' + data.get('location')
})
\`\`\``,
    title: "map",
    filename: "mapbox.ts",
    path: "src/mapbox.ts"
  },
  {
    text: `# markdown

\`<xin-md>\` renders markdown using [marked](https://www.npmjs.com/package/marked).

\`<xin-md>\` renders [markdown](https://www.markdownguide.org/) anywhere, either using the
\`src\` attribute to load the file asynchronously, or rendering the text inside it.

\`\`\`html
<xin-md>
## hello
world

![favicon](/favicon.svg)

| this  | is   | a     | table |
|-------|------|-------|-------|
| one   | two  | three | four  |
| five  | six  | seven | eight |
</xin-md>
\`\`\`
\`\`\`css
xin-md {
  display: block;
  padding: var(--spacing);
}
\`\`\`

Note that, by default, \`<xin-md>\` will use its \`textContent\` (not its \`innerHTML\`) as its source.

## rendering markdown from a url

Again, like an \`<img>\` tag, you can simply set a \`<xin-md>\`'s \`src\` attribute to a URL pointing
to markdown source and it will load it asynchronously and render it.

\`\`\`
<xin-md src="/path/to/file.md">
\`\`\`

## setting its \`value\`

Or, just set the element's \`value\` and it will render it for you. You can try
this in the console, e.g.

\`\`\`
$('.preview xin-md').value = 'testing\\n\\n## this is a test'
\`\`\`

## elements

\`<xin-md>\` also (optionally) allows the embedding of inline HTML elements without blocking markdown
rendering, so that you can embed specific elements while retaining markdown. You need to explicitly set
the \`elements\` property, and for markdown rendering not to be blocked, the html elements need to
start on a new line and not be indented. E.g.

\`\`\`html
<xin-md elements>
<form>
### this is a form
<label>
fill in this field.
**It's important!**
<input>
</label>
</form>
</xin-md>
\`\`\`

In this case \`<xin-md>\` uses its \`innerHTML\` and not its \`textContent\`.

## context and template variables

\`<xin-md>\` also supports **template** values. You need to provide data to the element in the form
of \`context\` (an arbitrary object, or a JSON string), and then embed the template text using
handlebars-style doubled curly braces, e.g. \`{{path.to.value}}\`.

If no value is found, the original text is passed through.

Finally, note that template substitution occurs *before* markdown transformation, which means you can
pass context data through to HTML elements.

\`\`\`html
<xin-md
  elements
  context='{"title": "template example", "foo": {"bar": 17}, "nested": "*work*: {{foo.bar}}"}'
>
## {{title}}

The magic number is <input type="number" value={{foo.bar}}>

Oh, and nested templates {{nested}}.
</xin-md>
\`\`\``,
    title: "markdown",
    filename: "markdown-viewer.ts",
    path: "src/markdown-viewer.ts"
  },
  {
    text: `# menu

Being able to pop a menu up anywhere is just so nice, and \`tosijs-ui\` allows menus
to be generated on-the-fly, and even supports hierarchical menus.

## popMenu and \`<xin-menu>\`

\`popMenu({target, menuItems, …})\` will spawn a menu from a target.

The \`<xin-menu>\` component places creates a trigger button, hosts
menuItems, and (because it persists in the DOM) supports keyboard
shortcuts.

\`\`\`js
import { popMenu, localize, xinMenu, postNotification, xinLocalized, icons } from 'tosijs-ui'
import { elements } from 'tosijs'

let picked = ''
let testingEnabled = false

const menuItems = [
  {
    icon: 'thumbsUp',
    caption: 'Like',
    shortcut: '^L',
    action() {
      postNotification({
        message: 'I like it!',
        icon: 'thumbsUp',
        duration: 1
      })
    }
  },
  {
    icon: 'heart',
    caption: 'Love',
    shortcut: '⌘⇧L',
    action() {
      postNotification({
        type: 'success',
        message: 'I LOVE it!',
        icon: 'heart',
        duration: 1
      })
    }
  },
  {
    icon: 'thumbsDown',
    caption: 'dislike',
    shortcut: '⌘D',
    action() {
      postNotification({
        type: 'error',
        message: 'Awwwwwww…',
        icon: 'thumbsDown',
        duration: 1
      })
    }
  },
  null, // separator
  {
    caption: localize('Localized placeholder'),
    action() {
      alert(localize('Localized placeholder'))
    }
  },
  {
    icon: elements.span('🥹'),
    caption: 'Also see…',
    menuItems: [
      {
        icon: elements.span('😳'),
        caption: 'And that’s not all…',
        menuItems: [
          {
            icon: 'externalLink',
            caption: 'timezones',
            action: 'https://timezones.tosijs.net/'
          },
          {
            icon: 'externalLink',
            caption: 'b8rjs',
            action: 'https://b8rjs.com'
          },
        ]
      },
      {
        icon: 'tosi',
        caption: 'tosi',
        action: 'https://xinjs.net'
      },
      {
        icon: 'tosiPlatform',
        caption: 'tosi-platform',
        action: 'https://xinie.net'
      },
    ]
  },
  {
    icon: testingEnabled ? 'check' : '',
    caption: 'Testing Enabled',
    action() {
      testingEnabled = !testingEnabled
    }
  },
  {
    caption: 'Testing…',
    enabled() {
      return testingEnabled
    },
    menuItems: [
      {
        caption: 'one',
        checked: () => picked === 'one',
        action () {
          picked = 'one'
        }
      },
      {
        caption: 'two',
        checked: () => picked === 'two',
        action () {
          picked = 'two'
        }
      },
      {
        caption: 'three',
        checked: () => picked === 'three',
        action () {
          picked = 'three'
        }
      }
    ]
  }
]

preview.addEventListener('click', (event) => {
  if (!event.target.closest('button')) {
    return
  }
  popMenu({
    target: event.target,
    menuItems
  })
})

preview.append(
  xinMenu(
    {
      menuItems,
      localized: true,
    },
    xinLocalized('Menu'),
    icons.chevronDown()
  )
)
\`\`\`
\`\`\`html
<button title="menu test">
  <xin-icon icon="moreVertical"></xin-icon>
</button>
<button title="menu test from bottom-right" style="position: absolute; bottom: 0; right: 0">
  <xin-icon icon="moreVertical"></xin-icon>
</button>
\`\`\`
\`\`\`css
.preview button {
  min-width: 44px;
  text-align: center;
  height: 44px;
  margin: 5px;
}
\`\`\`

## Overflow test

\`\`\`js
import { popMenu, icons, postNotification } from 'tosijs-ui'
import { elements } from 'tosijs'

preview.querySelector('button').addEventListener('click', (event) => {
  popMenu({
    target: event.target,
    menuItems:  Object.keys(icons).map(icon => ({
      icon,
      caption: icon,
      action() {
        postNotification({
          icon: icon,
          message: icon,
          duration: 1
        })
      }
    }))
  })
})
\`\`\`
\`\`\`html
<button title="big menu test" style="position: absolute; top: 0; left: 0">
  Big Menu Test
</button>
\`\`\`

## popMenu({target, width, menuItems…})

\`\`\`
export interface PopMenuOptions {
  target: HTMLElement
  menuItems: MenuItem[]
  width?: string | number
  position?: FloatPosition
  submenuDepth?: number   // don't set this, it's set internally by popMenu
  submenuOffset?: { x: number; y: number }
  localized?: boolean,
  showChecked?: boolean,  // if true, scroll checked item(s) into view
}
\`\`\`

\`popMenu\` will spawn a menu on a target element. A menu is just a \`MenuItem[]\`.

## MenuItem

A \`MenuItem\` can be one of three things:

- \`null\` denotes a separator
- \`MenuAction\` denotes a labeled button or \`<a>\` tag based on whether the \`action\` provided
  is a url (string) or an event handler (function).
- \`SubMenu\` is a submenu.

### MenuAction

Note that popMenu does not implement shortcuts for you (yet!).

\`\`\`
interface MenuAction {
  caption: string
  shortcut?: string
  checked?: () => boolean
  enabled?: () => boolean
  action: ActionCallback | string
  icon?: string | Element
}
\`\`\`

### SubMenu

\`\`\`
interface SubMenu {
  caption: string
  enabled?: () => boolean
  menuItems: MenuItem[]
  icon?: string | Element
}
\`\`\`

### Keyboard Shortcuts

If a menu is embodied in a \`<xin-menu>\` it is supported by keyboard
shortcuts. Both text and symbolic shortcut descriptions are supported,
e.g.

- \`⌘C\` or \`meta-C\`
- \`⇧P\` for \`shift-P\`
- \`^F\` or \`ctrl-f\`
- \`⌥x\`, \`⎇x\`, \`alt-x\` or \`option-x\`

## Localization

If you set \`localized: true\` in \`PopMenuOptions\` then menu captions will be be
passed through \`localize\`. You'll need to provide the appropriate localized strings,
of course.

> \`<xin-menu>\` supports the \`localized\` attribute but it doesn't localize
> its trigger button.

To see this in action, see the example below, or look at the
[table example](?data-table.ts). It uses a \`localized\` menu
to render column names when you show hidden columns.

\`\`\`js
import { elements } from 'tosijs'
import { xinLocalized, localize, icons, popMenu, postNotification } from 'tosijs-ui'
const { button } = elements
const makeItem = s => ({
  caption: s,
  action() {
    postNotification({
      message: localize(s),
      duration: 1
    })
  }
})
const target = button(
  {
    onClick(event) {
      popMenu({
        target: event.target.closest('button'),
        localized: true,
        menuItems: [
          makeItem('New'),
          makeItem('Open...'),
          makeItem('Save'),
          makeItem('Close'),
        ]
      })
    }
  },
  xinLocalized(
    { style: { marginRight: '5px' }},
    'menu'
  ),
  icons.chevronDown()
)
preview.append(target)
\`\`\`

## Why another menu library?!

Support for menus is sadly lacking in HTML, and unfortunately there's a huge conceptual problem
with menus implemented the way React and React-influenced libraries work, i.e. you need
to have an instance of a menu "wrapped around" the DOM element that triggers it, whereas
a better approach (and one dating back at least as far as the original Mac UI) is to treat
a menu as a separate resource that can be instantiated on demand.

A simple example where this becomes really obvious is if you want to associate a "more options"
menu with every row of a large table. Either you end up having an enormous DOM (virtual or otherwise)
or you have to painfully swap out components on-the-fly.

And, finally, submenus are darn useful for any serious app.

For this reason, \`tosijs-ui\` has its own menu implementation.`,
    title: "menu",
    filename: "menu.ts",
    path: "src/menu.ts"
  },
  {
    text: `# month

This is a component for displaying a month and selecting days within that month.

If the user changes the \`month\` or \`year\` the component's \`monthChanged(year, month)\`
method will be called.

The current date is \`[part="today"]\` and can easily be targeted for styling.

\`\`\`js
import { tosiMonth, postNotification } from 'tosijs-ui'

preview.append(tosiMonth({
  monthChanged(year, month) {
    postNotification({
      icon: 'calendar',
      message: \`Month changed to \${year}-\${month}\`,
      color: 'hotpink',
      duration: 2,
    })
  }
}))
\`\`\`
\`\`\`css
.preview tosi-month {
  margin: 10px;
  border-radius: 5px;
  box-shadow: 0 0 0 2px hotpink;
}
\`\`\`

## \`selectable\`

Setting \`selectable\` allows the user to pick individual dates. It's just a friendlier date picker.

The value of the component is an ISO date string, as per \`<input type="date">\`.

\`week-start\` defaults to \`0\` (Sunday). You can set it to \`1\` (Monday) or some other value
if you want.

> There is a proposed API to obtain the first day of the week for the user's locale from
> [Intl.Locale](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/Locale/getWeekInfo)
> but it is not yet widely supported.

\`\`\`html
<tosi-month week-start=1 selectable></tosi-month>
\`\`\`
\`\`\`js
const month = preview.querySelector('tosi-month')
month.addEventListener('change', event => console.log('date picked', event.target.value))
\`\`\`

## \`range\`

Setting \`range\` allows the user to select date ranges.

\`\`\`html
<tosi-month range></tosi-month>
\`\`\`
\`\`\`js
const month = preview.querySelector('tosi-month')
month.addEventListener('change', event => console.log('date range', event.target.value))
\`\`\`

## \`multiple\`

This allows the user to pick multiple individual dates

\`\`\`html
<tosi-month multiple></tosi-month>
\`\`\`
\`\`\`js
const month = preview.querySelector('tosi-month')
month.addEventListener('change', event => console.log('multple dates', event.target.value))
\`\`\`

## \`readonly\` and \`disabled\`

These prevent the user from changing the displayed month. This example is \`readonly\`.

\`\`\`html
<tosi-month readonly value="1976-04-01"></tosi-month>
\`\`\`

## Form Integration

\`<tosi-month>\` is form-associated, so it works directly in native forms:

\`\`\`html
<form id="date-form" class="date-form">
  <label>
    <span>Select a date (required):</span>
    <tosi-month name="date" selectable required></tosi-month>
  </label>
  <div class="buttons">
    <button type="submit">Submit</button>
    <button type="reset">Reset</button>
  </div>
</form>
\`\`\`
\`\`\`css
.preview .date-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
}

.preview .date-form label {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.preview .date-form .buttons {
  display: flex;
  gap: 8px;
}

.preview tosi-month:invalid {
  outline: 2px solid #f008;
  outline-offset: 2px;
}

.preview tosi-month:valid {
  outline: 2px solid #0a08;
  outline-offset: 2px;
}
\`\`\`
\`\`\`js
const { TosiDialog } = tosijsui
const form = preview.querySelector('#date-form')

form.addEventListener('submit', (e) => {
  e.preventDefault()
  const formData = new FormData(form)
  const data = Object.fromEntries(formData.entries())
  TosiDialog.alert(JSON.stringify(data, null, 2), 'Date Selected')
})

form.addEventListener('reset', () => {
  TosiDialog.alert('Form has been reset', 'Reset')
})
\`\`\``,
    title: "month",
    filename: "month.ts",
    path: "src/month.ts"
  },
  {
    text: `# notifications

\`XinNotification\` provides a singleton custom \`<xin-notification>\` element that manages
a list of notifications.

The notifications are displayed most-recent first. If the notifications would take more than
half the height of the display, they are scrolled.

You can post a notification simply with \`XinNotification.post()\` or \`postNotification()\`.

\`\`\`
interface NotificationSpec {
  message: string
  type?: 'success' | 'info' | 'log' | 'warn' | 'error' | 'progress' // default 'info'
  icon?: SVGElement | string // defaults to an info icon
  duration?: number
  progress?: () => number    // return percentage completion
  close?: () => void
  color?: string             // specify color
}
\`\`\`

If you provide a \`progress\` callback (which is assumed to return a number from \`0-100\`, with
100+ indicating completion) then \`XinNotification\` will poll it every second until the
task completes or the notification is closed. Returning 100 or more will automatically close
the notification.

If you configure a notification's \`type = "progress"\` but don't provide a \`progress\` callback
then an indefinite \`<progress>\` element will be displayed.

If you provide a \`close\` callback, it will be fired if the user closes the notification.

\`postNotification\` returns a callback function that closes the note programmatically (e.g.
when an operation completes). This will *also* call any \`close\` callback function you
provided. (The progress demos in the example exercise this functionality.)

\`\`\`js
import { postNotification, icons } from 'tosijs-ui'

const form = preview.querySelector('xin-form')
const submit = preview.querySelector('.submit')
const closeButton = preview.querySelector('.close')

let close

form.submitCallback = (value, isValid) => {
  if (!isValid) return
  if (value.type.startsWith('progress')) {
    startTime = Date.now()
    const { message, duration, icon } = value
    close = postNotification({
      message,
      type: 'progress',
      icon,
      progress: value.type === 'progress' ? () => (Date.now() - startTime) / (10 * duration) : undefined,
      close: () => { postNotification(\`\${value.message} cancelled\`) },
    })
  } else {
    close = postNotification(value)
  }
  console.log(close)
  closeButton.disabled = false
}

submit.addEventListener('click', form.submit)
closeButton.addEventListener('click', () => {
  if (close) {
    close()
  }
})

postNotification({
  message: 'Welcome to tosijs-ui notifications, this message will disappear in 2s',
  duration: 2
})
\`\`\`
\`\`\`html
<xin-form>
  <h3 slot="header">Notification Test</h3>
  <xin-field caption="Message" key="message" type="string" value="This is a test…"></xin-field>
  <xin-field caption="Type" key="type" value="info">
    <xin-select slot="input"
      options="error,warn,info,success,log,,progress,progress (indefinite)"
    ></xin-select>
  </xin-field>
  <xin-field caption="Icon" key="icon" value="info">
    <xin-select slot="input"
      options="info,bug,thumbsUp,thumbsDown,message"
    ></xin-select>
  </xin-field>
  <xin-field caption="Duration" key="duration" type="number" value="2"></xin-field>
  <button slot="footer" class="close" disabled>Close Last Notification</button>
  <span slot="footer" class="elastic"></span>
  <button slot="footer" class="submit">Post Notification</button>
</xin-form>
\`\`\`
\`\`\`css
xin-form {
  height: 100%;
}

xin-form::part(content) {
  display: flex;
  flex-direction: column;
  padding: 10px;
  gap: 10px;
  background: var(--background);
}

xin-form::part(header),
xin-form::part(footer) {
  background: #eee;
  justify-content: center;
  padding: 10px;
}

xin-form h3 {
  margin: 0;
}

xin-form label {
  display: grid;
  grid-template-columns: 120px 1fr;
}
\`\`\`

## \`postNotification(spec: NotificationSpec | string)\`

This is simply a wrapper for \`XinNotification.post()\`.`,
    title: "notifications",
    filename: "notifications.ts",
    path: "src/notifications.ts"
  },
  {
    text: `# password strength

Just wrap it a \`<xin-password-strength>\` element around an \`<input>\`
and it will gauge its content strength as a password. It will also
let you **securely verify** that the password hasn't been breached.

\`\`\`js
import { xinLocalized, localize } from 'tosijs-ui'

const toggle = preview.querySelector('.toggle')
const icon = preview.querySelector('xin-icon')
const input = preview.querySelector('input')
const breach = preview.querySelector('.breach')
const output = preview.querySelector('.output')
const passwordStrength = preview.querySelector('xin-password-strength')

// Localization Example
passwordStrength.append(xinLocalized({
  refString: 'Yes',
  localeChanged () {
    this.parentElement.strengthDescriptions = [
      'unacceptable',
      'very weak',
      'weak',
      'moderate',
      'strong',
      'very strong',
    ].map(localize)
    this.parentElement.queueRender()
  }
}))

toggle.addEventListener('click', () => {
  if (icon.icon === 'eye') {
    input.type = 'text'
    icon.icon = 'eyeOff'
  } else {
    input.type = 'password'
    icon.icon = 'eye'
  }
})

breach.addEventListener('click', async () => {
  preview.querySelector('xin-password-strength').isBreached().then(isBreached => {
    output.textContent =
      isBreached
      ? 'This password has been breached, look at console for details'
      : 'Seems OK'
    output.classList.toggle('breached', isBreached)
  })
})
\`\`\`
\`\`\`html
<xin-password-strength>
  <input class="password" type="password">
  <button class="toggle">
    <xin-icon icon="eye"></xin-icon>
  </button>
</xin-password-strength>

<br><br>
<button class="breach">
  <xin-localized>Check if breached</xin-localized>
</button>
<div class="output"></div>
\`\`\`
\`\`\`css
input.password {
  box-shadow: inset 0 0 0 2px var(--indicator-color);
}

.breached {
  color: white;
  background: red;
}
\`\`\`

## Algorithm

The password is assessed to have a strength based on:

- **length** one point for at least \`goodLength\` characters long.
- **[a-z]** one point for containing a lowercase letter
- **[A-Z]** one point for containing an uppercase letter
- **[0-9]** one point for containing a numeric character
- **^[a-zA-Z0-9]]** one point for containing some other kind of character

A password smaller than \`minLength\` is an automatic \`0\`.

## Attributes

- \`minLength\` defaults to \`8\`
- \`goodLength\` defaults to \`12\`
- \`indicatorColors\` six HTML colors, separated by commas, defaults to \`'#f00,#f40,#f80,#ef0,#8f0,#0d4'\`
- \`descriptionColors\` six HTML colors, sepeated by commans, defaults to \`'#000,#000,#000,#000,#000,#fff'\`

## Properties

- \`value\`, \`strength\` is a number from 0 to 5
- \`issues\` is a structure which you can use to generate feedback

\`\`\`
<xin-password-strength>.issues = {
  tooShort: boolean,
  short: boolean,
  noUpper: boolean,
  noLower: boolean,
  noNumber: boolean,
  noSpecial: boolean,
}
\`\`\`

## Customizing / Localizing Strings

The following properties control the feedback generated.

\`\`\`
issueDescriptions = {
  tooShort: 'too short',
  short: 'short',
  noUpper: 'no upper case',
  noLower: 'no lower case',
  noNumber: 'no digits',
  noSpecial: 'no unusual characters',
}
\`\`\`

\`\`\`
strengthDescriptions = [
  'unacceptable',
  'very weak',
  'weak',
  'moderate',
  'strong',
  'very strong',
]
\`\`\`

## \`isBreached()\`

\`<xin-password-meter>\` also provides an \`isBreached(): Promise<boolean>\` method
which uses [weakpass.com's API](https://weakpass.com/) to tell you if the password has been
breached.

> Note that \`isBreached\` does not send the plain-text password anywhere. It uses **SHA-1**
to hash the password and then sends that for lookup.

## Utility Functions

Two functions used internally for querying [Weakpass,com](https://weakpass.com/) are
provided in case they're useful on their own.

\`isBreached(password: striing): Promise<boolean>\` will return \`true\` if the password is
found in Weakpass's database (and spit out extra info to the console).

\`digest(s: string, method="sha-1"): Promise<string>\` is just a nice wrapper for \`crypto.digest\`.`,
    title: "password strength",
    filename: "password-strength.ts",
    path: "src/password-strength.ts"
  },
  {
    text: `# popFloat

There are so many cases in user-interfaces where it's useful to pop-up a floating
user interface element that a simple and reliable way of doing this seems like
a good idea.

The problem with many such approaches is that they assume a highly specific
use-case (e.g. popup menu or combo box) and while meeting the creator's intended
purpose admirably, turn out to have some annoying limitation that prevents them
handling the specific case at hand.

\`\`\`js
import { popFloat, positionFloat } from 'tosijs-ui'
import { button } from 'tosijs'.elements
const grid = preview.querySelector('.grid')

grid.addEventListener('click', (event) => {
  const { target } = event
  if (!target.closest('button')) {
    return
  }
  const float = document.querySelector('.popped-float')
  if (float === null) {
    // create and position a float
    popFloat({
      class: 'popped-float',
      content: [
        'hello, I am a float',
        button('close me', {
          onClick(event){
            event.target.closest('xin-float').remove()
          }
        })
      ],
      target,
      position: target.dataset.float,
      remainOnScroll: 'remove',
      remainOnResize: 'remove'
    })
  } else {
    // position an existing float
    positionFloat(float, target, target.dataset.float, 'remove', 'remove')
  }
})
\`\`\`
\`\`\`html
<h2>Pop Float Demo</h2>
<div class="grid">
  <button data-float="nw">nw</button>
  <button data-float="n">n</button>
  <button data-float="ne">ne</button>
  <button data-float="wn">wn</button>
  <span>&nbsp;</span>
  <button data-float="en">en</button>
  <button data-float="w">w</button>
  <button data-float="auto">auto</button>
  <button data-float="e">e</button>
  <button data-float="ws">ws</button>
  <button data-float="side">side</button>
  <button data-float="es">es</button>
  <button data-float="sw">sw</button>
  <button data-float="s">s</button>
  <button data-float="se">se</button>
</div>
\`\`\`
\`\`\`css
.preview .grid {
  display: grid;
  grid-template-columns: 80px 80px 80px;
}

.popped-float {
  display: flex;
  flex-direction: column;
  border-radius: 5px;
  padding: 10px 15px;
  background: var(--inset-bg);
  box-shadow:
    inset 0 0 0 1px var(--brand-color),
    2px 10px 5px #0004;
}
\`\`\`

## popFloat

\`\`\`
export interface PopFloatOptions {
  class?: string
  content: HTMLElement | ElementPart[]
  target: HTMLElement
  position?: FloatPosition
  remainOnResize?: 'hide' | 'remove' | 'remain' // default is 'remove',
  remainOnScroll?: 'hide' | 'remove' | 'remain' // default is 'remain',
  draggable?: boolean
}

export const popFloat = (options: PopFloatOptions): XinFloat
\`\`\`

Create a \`<xin-float>\` with the content provided, positioned as specified (or automatically).

## positionFloat

\`\`\`
export const positionFloat = (
  element: HTMLElement,
  target: HTMLElement,
  position?: FloatPosition,
  remainOnScroll: 'hide' | 'remove' | 'remain' = 'remain',
  remainOnResize: 'hide' | 'remove' | 'remain' = 'remove',
  draggable = false
): void
\`\`\`

This allows you to, for example, provide a global menu that can be used on any element
instead of needing to have a whole instance of the menu wrapped around every instance
of the thing you want the menu to affect (a common anti-pattern of front-end frameworks).

### Handling Overflow

\`positionFloat\` automatically sets two css-variables \`--max-height\` and \`--max-width\` on
the floating element to help you deal with overflow (e.g. in menus). E.g. if the float
is positioned with \`top: 125px\` then it will set \`--max-height: calc(100vh - 125px)\`.

## FloatPosition

\`\`\`
export type FloatPosition =
| 'n'
| 's'
| 'e'
| 'w'
| 'ne'
| 'nw'
| 'se'
| 'sw'
| 'en'
| 'wn'
| 'es'
| 'ws'
| 'side'
| 'auto'
\`\`\`

## Draggable

Sometimes it's nice to have popup palettes and modeless dialogs the user can drag away.
\`popFloat()\` makes this really easy to do.

\`\`\`js
import { elements } from 'tosijs'
import { popFloat, icons } from 'tosijs-ui'

const { button, h4, p } = elements

preview.append(button(
  'Draggable Popup',
  {
    class: 'spawn-draggable',
    onClick(event) {
      popFloat({
        class: 'tearoff',
        content: [
          h4('Move me!'),
          p('I’m delicious!'),
          button(
            icons.x(),
            {
              class: 'no-drag close-tearoff',
              onClick(event) {
                event.target.closest('xin-float').remove()
              }
            }
          )
        ],
        target: event.target,
        remainOnScroll: 'remain',
        remainOnResize: 'remain',
        draggable: true,
      })
    }
  },
))
\`\`\`
\`\`\`css
.tearoff {
  --tearoff-bg: #fff6;
  --tearoff-button-bg: #fff2;
  --tearoff-color: #222;
  --tearoff-hilite: #fff8;
  --tearoff-shadow: #0002;
  display: flex;
  flex-direction: column;
  border-radius: 20px;
  padding: 10px 15px;
  background: var(--tearoff-bg);
  backdrop-filter: blur(6px);
  box-shadow:
    inset 1px 1px 0 1px var(--tearoff-hilite),
    inset -1px -1px 0 1px var(--tearoff-shadow),
    2px 5px 10px var(--tearoff-shadow);
  width: 200px;
  color: var(--tearoff-color);
  --text-color: var(--tearoff-color);
}

.darkmode .tearoff {
  --tearoff-bg: #0004;
  --tearoff-button-bg: #0001;
  --tearoff-color: #fff;
}

.tearoff > :first-child {
  margin-top: 0;
}

.tearoff > :last-child {
  margin-bottom: 0;
}

.spawn-draggable {
  margin: 10px;
}

.close-tearoff {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 32px;
  height: 32px;
  text-align: center;
  padding: 0;
  line-height: 32px;
  background: var(--tearoff-button-bg);
  border-radius: 100px;
  box-shadow:
    inset 1px 1px 0 1px var(--tearoff-hilite),
    inset -1px -1px 0 1px var(--tearoff-shadow);
}
\`\`\``,
    title: "popFloat",
    filename: "pop-float.ts",
    path: "src/pop-float.ts"
  },
  {
    text: `# rating

\`TosiRating\` / \`<tosi-rating>\` provides a drop-in replacement for an \`<input>\`
that renders a rating using icons.

\`\`\`js
const { tosiRating } = tosijsui
preview.append(
  tosiRating({ value: 3.4 }),
  tosiRating({ min: 0, value: 3.4, step: 0.5, hollow: true }),
  tosiRating({ value: 3.4, ratingFill: 'deepskyblue', ratingStroke: 'deepskyblue' }),
  tosiRating({ value: 3.1, max: 10, ratingFill: 'hotpink', ratingStroke: 'hotpink', icon: 'heart', iconSize: 32 }),
  tosiRating({ class: 'color', value: 3.1, max: 5, icon: 'tosiPlatform', iconSize: 32 }),
)
\`\`\`
\`\`\`css
.preview {
  display: flex;
  flex-direction: column;
}

.preview .color::part(empty) {
  filter: grayscale(1);
  opacity: 0.25;
}
\`\`\`

## Attributes

- \`icon-size\` (24 by default) determines the height of the control and along with \`max\` its width
- \`max\` maximum rating
- \`min\` (1 by default) can be 0 or 1 (allowing ratings of 0 to max or 1 to max)
- \`step\` (0.5 by default) granularity of rating
- \`icon\` ('star' by default) determines the icon used
- \`rating-stroke\` (#f91 by default) is the stroke of rating icons
- \`rating-fill\` (#e81 by default) is the color of rating icons
- \`empty-stroke\` (none by default) is the color of background icons
- \`empty-fill\` (#ccc by default) is the color of background icons
- \`readonly\` (false by default) prevents the user from changing the rating
- \`hollow\` (false by default) makes the empty rating icons hollow.
- \`required\` (false by default) marks the field as required for form validation
- \`name\` the form field name (for formAssociated support)

## Form Integration

\`<tosi-rating>\` is form-associated, meaning it works directly in native \`<form>\` elements:

\`\`\`html
<form>
  <tosi-rating name="rating" required></tosi-rating>
  <button type="submit">Submit</button>
</form>
\`\`\`

## Keyboard

\`<tosi-rating>\` should be fully keyboard navigable (and, I hope, accessible).

The up key increases the rating, down descreases it. This is the same
as the behavior of \`<input type="number">\`, [Shoelace's rating widget](https://shoelace.style/components/rating/),
and (in my opinion) common sense, but  not like [MUI's rating widget](https://mui.com/material-ui/react-rating/).`,
    title: "rating",
    filename: "rating.ts",
    path: "src/rating.ts"
  },
  {
    text: `# rich text

\`<tosi-rich-text>\` is a simple and easily extensible \`document.execCommand\` WYSIWYG editor with some conveniences.
The class name is \`RichText\` and the ElementCreator is \`tosiRichText\`.

### \`default\` widgets

\`\`\`html
<tosi-rich-text>
<h3>Heading</h3>
<p>And some <b>text</b></p>
</tosi-rich-text>
\`\`\`
\`\`\`css
tosi-rich-text {
  background: white;
}

tosi-rich-text [part="toolbar"] {
  background: #f8f8f8;
}

tosi-rich-text [part="doc"] {
  padding: 20px;
}
\`\`\`

### \`minimal\` widgets

\`\`\`html
<tosi-rich-text widgets="minimal">
<h3>Heading</h3>
<p>And some <b>text</b></p>
</tosi-rich-text>
\`\`\`
\`\`\`css
tosi-rich-text {
  background: white;
}

tosi-rich-text [part="toolbar"] {
  background: #f8f8f8;
}

tosi-rich-text [part="doc"] {
  padding: 20px;
}
\`\`\`

By default, \`<tosi-rich-text>\` treats its initial contents as its document, but you can also set (and get)
its \`value\`.

## toolbar

\`<tosi-rich-text>\` elements have a \`toolbar\` slot (actually a xin-slot because it doesn't use
the shadowDOM).

If you set the \`widgets\` attribute to \`default\` or \`minimal\` you will get a toolbar
for free. Or you can add your own custom widgets.

## helper functions

A number of helper functions are available, including:

- \`commandButton(title: string, command: string, iconClass: string)\`
- \`blockStyle(options: Array<{caption: string, tagType: string}>)\`
- \`spacer(width = '10px')\`
- \`elastic(width = '10px')\`

These each create a toolbar widget. A \`blockStyle\`-generated \`<select>\` element will
automatically have its value changed based on the current selection.

## properties

A \`<tosi-rich-text>\` element also has \`selectedText\` and \`selectedBlocks\` properties, allowing
you to easily perform operations on text selections, and a \`selectionChange\` callback (which
simply passes through document \`selectionchange\` events, but also passes a reference to
the \`<tosi-rich-text>\` component).

## Form Integration

\`<tosi-rich-text>\` is form-associated, making it work directly in native forms:

\`\`\`html
<form class="richtext-form">
  <label>
    <b>Compose message (required):</b>
    <tosi-rich-text name="content" widgets="minimal" required style="height: 150px">
    </tosi-rich-text>
  </label>
  <button type="submit">Submit</button>
  <button type="reset">Reset</button>
  <pre class="output" style="max-height: 100px; overflow: auto"></pre>
</form>
\`\`\`
\`\`\`css
.preview .richtext-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.preview .richtext-form label {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.preview tosi-rich-text {
  background: white;
}
.preview tosi-rich-text [part="toolbar"] {
  background: #f8f8f8;
}
\`\`\`
\`\`\`js
const form = preview.querySelector('.richtext-form')
form.addEventListener('submit', (e) => {
  e.preventDefault()
  const data = new FormData(form)
  form.querySelector('.output').textContent = 'Content: ' + data.get('content')
})
\`\`\``,
    title: "rich text",
    filename: "rich-text.ts",
    path: "src/rich-text.ts"
  },
  {
    text: `# scriptTag & styleSheet

## scriptTag

If you need to load an old school (cjs) javascript or css library via cdn then use these two functions.

\`tosijs-ui\` uses this library to implement the \`<xin-code>\`, \`<xin-lottie>\`, and \`<xin-map>\`
elements.

\`scriptTag()\` and \`styleSheet()\` return promises that resolve \`globalThis\` when the module in question
has loaded and otherwise behave as much like \`import()\` as possible.

This example uses \`scriptTag\` and \`styleSheet\` to load [quilljs](https://quilljs.com) on-the-fly.

\`\`\`js
import { elements } from 'tosijs'
import { scriptTag, styleSheet } from 'tosijs-ui'

const toolbarOptions = [
  [{ header: [1, 2, 3, 4, false] }],
  ['blockquote', 'code-block'],
  [{ 'align': [] }],
  ['bold', 'italic', 'strike'],
  ['link', 'image', 'video'],
  [{ 'list': 'ordered'}, { 'list': 'bullet' }, { 'list': 'check' }],
  [{ 'indent': '-1'}, { 'indent': '+1' }],
  ['clean']
]

;(async () => {
  await Promise.all([
    styleSheet('https://cdn.jsdelivr.net/npm/quill@2.0.2/dist/quill.core.css'),
    styleSheet('https://cdn.jsdelivr.net/npm/quill@2.0.2/dist/quill.snow.css'),
  ])

  const container = elements.div()
  const { Quill } = await scriptTag('https://cdn.jsdelivr.net/npm/quill@2.0.2/dist/quill.js')
  preview.append(container)

  const quill = new Quill(container, {
    debug: 'info',
    modules: {
      toolbar: toolbarOptions,
    },
    theme: 'snow',
  })
})()
\`\`\`

Note that \`scriptTag\` will resolve \`globalThis\` so it behaves as much like async \`import()\`
as possible.

As an aside:

\`<xin-lottie>\` is implemented in such a way that if you've preloaded the module
(e.g. via a script tag or packaging) it won't load it again, which affords offline
use.

There's no point for \`<xin-map>\` since it won't work without connectivity anyway.

## styleSheet

styleSheet creates a \`<link>\` tag for a specified css file.

Using \`styleSheet\`:

    styleSheet('../path/to/style.css')

This is awaitable, if you care. The stylesheet \`<link>\` will only be inserted _once_.`,
    title: "scriptTag & styleSheet",
    filename: "via-tag.ts",
    path: "src/via-tag.ts"
  },
  {
    text: `# segmented select

This is a fairly general-purpose segmented select control.

\`\`\`html
<div class="grid">
  <tosi-segmented value="yes" choices="yes, no, don't care">
    Should we?
  </tosi-segmented>

  <div>
    <b>Localized!</b><br>
    <tosi-segmented
      localized
      title="do you like?"
      choices="yes=Yes:thumbsUp, no=No:thumbsDown"
    ></tosi-segmented>
  </div>

  <tosi-segmented
    style="--segmented-direction: column; --segmented-align-items: stretch"
    choices="in a relationship, single"
    other="it's complicated..."
    placeholder="please elaborate"
    value="separated"
  >
    Relationship Status
  </tosi-segmented>

  <tosi-segmented
    multiple
    style="--segmented-direction: column; --segmented-align-items: start; --segmented-option-grid-columns: 24px 24px 100px; --segmented-input-visibility: visible;"
    choices="star=Star:star, game=Game:game, bug=Bug:bug, camera=Camera:camera"
    value="star,bug"
  >
    Pick all that apply
  </tosi-segmented>
</div>
\`\`\`
\`\`\`css
.preview .grid {
  --segmented-option-current-background: var(--brand-color);
  --segmented-option-current-color: var(--brand-text-color);
  padding: 16px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
\`\`\`
\`\`\`js
function logEvent(event) {
  const { target } = event
  if (target.matches('tosi-segmented')) {
    console.log((target.textContent || target.title).trim(), target.value)
  }
}
preview.addEventListener('change', logEvent, true)
\`\`\`

> Check the console to see the values being set.

## Form Integration

\`<tosi-segmented>\` is form-associated, meaning it works directly in native \`<form>\` elements:

\`\`\`html
<form class="segmented-form">
  <tosi-segmented name="choice" choices="a,b,c" required></tosi-segmented>
  <button type="submit">Submit</button>
  <span class="output"></span>
</form>
\`\`\`
\`\`\`js
const form = preview.querySelector('.segmented-form')
form.addEventListener('submit', (e) => {
  e.preventDefault()
  const data = new FormData(form)
  form.querySelector('.output').textContent = 'Submitted: ' + data.get('choice')
})
\`\`\`

## Properties

- \`values\` is an array of values (only really useful if \`multiple\` is set to true)

You can set \`choices\` programmatically to an array of \`Choice\` objects:

    interface Choice {
      icon?: string | SVGElement
      value: string
      caption: string
    }

## Attributes

- \`choices\` is a string of comma-delimited options of the form \`value=caption:icon\`,
  where caption and icon are optional
- \`multiple\` allows multiple selection
- \`name\` the form field name (for formAssociated support)
- \`other\` (default '', meaning other is not allowed) is the caption for other options, allowing
  the user to input their choice. It will be reset to '' if \`multiple\` is set.
- \`placeholder\` is the placeholder displayed in the \`<input>\` field for **other** responses
- \`localized\` automatically localizes captions
- \`required\` marks the field as required for form validation

## Styling

The following CSS variables can be used to control customize the \`<tosi-segmented>\` component.

    --segmented-align-items
    --segmented-direction
    --segmented-option-color
    --segmented-option-current-background
    --segmented-option-current-color
    --segmented-option-font
    --segmented-option-gap
    --segmented-option-grid-columns
    --segmented-option-icon-color
    --segmented-option-padding
    --segmented-options-background
    --segmented-options-border-radius
    --segmented-placeholder-opacity`,
    title: "segmented select",
    filename: "segmented.ts",
    path: "src/segmented.ts"
  },
  {
    text: `# select

\`<tosi-select>\` (\`tosiSelect\` is the \`ElementCreator\`) is a replacement for the lamentable
built in \`<select>\` element that addresses its various shortcomings.

- since \`<tosi-select>\` is powered by \`popMenu\`, and supports separators and submenus.
- options can have icons.
- \`<tosi-select>\` will retain and display a value even if the matching option is missing.
- its displayed value can be made \`editable\`, allowing use as a "combo box".
- options can have \`async\` callbacks that return a value.
- picking an item triggers an \`action\` event even if the value hasn't changed.
- available options are set via the \`options\` attribute or the element's \`options\` property (not \`<option>\` elements)

\`\`\`js
const { tosiSelect } = tosijsui
const { icons } = tosijsui

const simpleSelect = tosiSelect({
  title: 'simple select',
  options: 'this,that,,the other',
  value: 'not an option!'
})

const captionsSelect = tosiSelect({
  showIcon: true,
  title: 'has captions',
  class: 'captions',
  value: 'image'
})

const iconsSelect = tosiSelect({
  showIcon: true,
  title: 'combo select with icons',
  class: 'icons',
  editable: true,
  placeholder: 'pick an icon'
})

const iconsOnly = tosiSelect({
  showIcon: true,
  hideCaption: true,
  title: 'icons only',
  class: 'icons-only',
  placeholder: 'pick an icon'
})

preview.append(
  simpleSelect,
  document.createElement('br'),
  captionsSelect,
  document.createElement('br'),
  iconsSelect,
  document.createElement('br'),
  iconsOnly
)

captionsSelect.options = [
  {
    caption: 'a heading',
    value: 'heading'
  },
  {
    caption: 'a paragraph',
    value: 'paragraph'
  },
  null,
  {
    caption: 'choose some other',
    options: [
      {
        icon: 'image',
        caption: 'an image',
        value: 'image'
      },
      {
        icon: 'fileText',
        caption: 'a text file',
        value: 'text',
      },
      {
        icon: 'video',
        caption: 'a video',
        value: 'video'
      },
      null,
      {
        caption: 'anything goes…',
        value: () => prompt('Enter your other', 'other') || undefined
      },
      {
        caption: 'brother… (after 1s delay)',
        value: async () => new Promise(resolve => {
          setTimeout(() => resolve('brother'), 1000)
        })
      }
    ]
  }
]

iconsSelect.options = iconsOnly.options = Object.keys(icons).sort().map(icon =>({
  icon,
  caption: icon,
  value: icon
}))

preview.addEventListener('action', (event) => {
  console.log(event.target.title, 'user picked', event.target.value)
}, true)

preview.addEventListener('change', (event) => {
  console.log(event.target.title, 'changed to', event.target.value)
}, true)
\`\`\`

## Form Integration

\`<tosi-select>\` is form-associated, meaning it works directly in native \`<form>\` elements:

\`\`\`html
<form>
  <tosi-select name="choice" options="a,b,c" required></tosi-select>
  <button type="submit">Submit</button>
</form>
\`\`\`

## \`options\`

    type OptionRequest = () => Promise<string | undefined>

    export interface SelectOption {
      icon?: string | HTMLElement
      caption: string
      value: string | OptionRequest
    }

    export interface SelectOptionSubmenu {
      icon?: string | HTMLElement
      caption: string
      options: SelectOptions
    }

    export type SelectOptions = Array<string | null | SelectOption | SelectOptionSubmenu>

A \`<tosi-select>\` can be assigned \`options\` as a string of comma-delimited choices
in the format \`value=caption:icon\` (where caption and icon are optional),
or be provided a \`SelectOptions\` array (which allows for submenus, separators, etc.).

Examples:
- \`"apple,banana,cherry"\` - simple values (value equals caption)
- \`"us=United States,uk=United Kingdom"\` - value with caption
- \`"us=United States:flag,uk=United Kingdom:flag"\` - value with caption and icon

## Attributes

\`<tosi-select>\` supports several attributes:

- \`editable\` lets the user directly edit the value (like a "combo box").
- \`show-icon\` displays the icon corresponding to the currently selected value.
- \`hide-caption\` hides the caption.
- \`placeholder\` allows you to set a placeholder.
- \`options\` allows you to assign options as a comma-delimited string attribute.
- \`required\` marks the field as required for form validation.
- \`name\` the form field name (for formAssociated support).

## Events

Picking an option triggers an \`action\` event (whether or not this changes the value).

Changing the value, either by typing in an editable \`<tosi-select>\` or picking a new
value triggers a \`change\` event.

You can look at the console to see the events triggered by the second example.

## Localization

\`<tosi-select>\` supports the \`localized\` attribute which automatically localizes
options.

\`\`\`js
const { tosiSelect } = tosijsui

preview.append(
  tosiSelect({
    localized: true,
    placeholder: 'localized placeholder',
    options: 'yes,no,,moderate'
  })
)
\`\`\``,
    title: "select",
    filename: "select.ts",
    path: "src/select.ts"
  },
  {
    text: "# sidebar\n\nThe default layout for iOS / iPadOS apps is to hide the sidebar when displaying content on small\nscreens, and display the sidebar when space is available (with the user able to explicitly hide\nthe sidebar if so desired). `<xin-sidenav>` provides this functionality.\n\n`<xin-sidenav>` is used to handle the layout of the documentation tab panel.\n\n`<xin-sidenav>`'s behavior is controlled by two attributes, `minSize` is the point at which it will toggle between showing the navigation\nsidebar and content, while `navSize` is the width of the sidebar. You can interrogate its `compact` property to find out if it's\ncurrently in `compact` form.",
    title: "sidebar",
    filename: "side-nav.ts",
    path: "src/side-nav.ts"
  },
  {
    text: `# size-break

While we wait for enough browsers to implement [container-queries](https://www.w3.org/TR/css-contain-3/),
and in any event when you simply want to do different things at different sizes (e.g. in the project I'm
working on right now, a row of buttons turns into a menu at narrow widths) there's \`<xin-sizebreak>\`.

Note that the sizes referred to are of the \`<xin-sizebreak>\`'s \`.offsetParent\`, and it watches for
the window's \`resize\` events and its own (via \`ResizeObserver\`).

\`\`\`html
<div class="container">
  <xin-sizebreak min-width="300" min-height="150">
    <h1>BIG!</h1>
    <i slot="small">little</i>
  </xin-sizebreak>
  <xin-sizer></xin-sizer>
</div>
\`\`\`
\`\`\`css
.preview {
  touch-action: none;
}

.preview xin-sizebreak {
  width: 100%;
  height: 100%;
  background: #fff8;
  border: 1px solid #aaa;
}

.preview xin-sizebreak * {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translateX(-50%) translateY(-50%);
}

.preview .container {
  position: relative;
  min-width: 100px;
  min-height: 40px;
  max-height: 100%;
  width: 400px;
  height: 100px;
}

.preview .sizer {
  position: absolute;
  width: 24px;
  height: 24px;
  line-height: 24px;
  text-align: center;
  background: #0002;
  bottom: 0;
  right: 0;
  cursor: nwse-resize;
  opacity: 0.5;
}

.preview .sizer:hover {
  opacity: 1.0;
}
\`\`\`

\`<xin-sizebreak>\` supports both \`min-width\` and/or \`min-height\`, and you can of course target only one
of the slots if you like. The demo site uses them to hide the [bundlejs](https://bundlejs.com/) badge when
space is tight.`,
    title: "size-break",
    filename: "size-break.ts",
    path: "src/size-break.ts"
  },
  {
    text: `# sizer

This is a super-simple component that you can put in a fixed size element allowing it to be resized
from the bottom-right.

\`\`\`html
<div>
  <xin-sizer></xin-sizer>
</div>
\`\`\`
\`\`\`css
.preview div {
  position: absolute;
  top: 10px;
  left: 10px;
  width: 200px;
  height: 100px;
  background: #ff02;
  border: 1px solid #555;
}
\`\`\`

<xin-css-var-editor element-selector="xin-sizer"></xin-css-var-editor>`,
    title: "sizer",
    filename: "sizer.ts",
    path: "src/sizer.ts"
  },
  {
    text: `# table

A virtual data-table, configurable via a \`columns\` array (which will automatically be generated if not provided),
that displays gigantic tables with fixed headers (and live column-resizing) using a minimum of resources and cpu.

\`\`\`js
import { dataTable } from 'tosijs-ui'
import { input } from 'tosijs'.elements

const emojiRequest = await fetch('https://raw.githubusercontent.com/tonioloewald/emoji-metadata/master/emoji-metadata.json')
const emojiData = await emojiRequest.json()

const columns = [
  {
    name: "emoji",
    prop: "chars",
    align: "center",
    width: 80,
    sort: false,
    visible: true
  },
  {
    prop: "name",
    width: 300,
    // custom cell using bindings to make the field editable
    dataCell() {
      return input({
        class: 'td',
        bindValue: '^.name',
        title: 'name',
        onMouseup: (event) => { event.stopPropagation() },
        onTouchend: (event) => { event.stopPropagation() },
      })
    },
  },
  {
    prop: "category",
    sort: "ascending",
    width: 150
  },
  {
    prop: "subcategory",
    width: 150
  },
]

preview.append(dataTable({
  multiple: true,
  array: emojiData,
  localized: true,
  columns,
  rowHeight: 40,
  pinnedBottom: 2
}))
\`\`\`
\`\`\`css
.preview input.td {
  margin: 0;
  border-radius: 0;
  box-shadow: none !important;
  background: #fff4;
}

.preview xin-table {
  height: 100%;
}

.preview xin-table [part="pinnedTopRows"],
.preview xin-table [part="pinnedBottomRows"] {
  background: #ddd;
}
\`\`\`

> In the preceding example, the \`name\` column is *editable* (and *bound*, try editing something and scrolling
> it out of view and back) and \`multiple\` select is enabled. In the console, you can try \`$('xin-table').visibleRows\`
> and $('xin-table').selectedRows\`.

You can set the \`<xin-table>\`'s \`array\`, \`columns\`, and \`filter\` properties directly, or set its \`value\` to:

\`\`\`
{
  array: any[],
  columns: ColumnOptions[] | null,
  filter?: ArrayFilter
}
\`\`\`

## \`ColumnOptions\`

You can configure the table's columns by providing it an array of \`ColumnOptions\`:

\`\`\`
export interface ColumnOptions {
  name?: string
  prop: string
  width: number
  visible?: boolean
  align?: string
  sort?: false | 'ascending' | 'descending'
  headerCell?: (options: ColumnOptions) => HTMLElement
  dataCell?: (options: ColumnOptions) => HTMLElement
}
\`\`\`

## Selection

\`<xin-table>\` supports \`select\` and \`multiple\` boolean properties allowing rows to be selectable. Selected rows will
be given the \`[aria-selected]\` attribute, so style them as you wish.

\`multiple\` select supports shift-clicking and command/meta-clicking.

\`<xin-table>\` provides an \`selectionChanged(visibleSelectedRows: any[]): void\` callback property allowing you to respond to changes
in the selection, and also \`selectedRows\` and \`visibleSelectedRows\` properties.

The following methods are also provided:

- \`<xin-table>.selectRow(row: any, select = true)\` (de)selects specified row
- \`<xin-table>.selectRows(rows?: any[], select = true)\` (de)selects specified rows
- \`<xin-table>.deSelect(rows?: any[])\` deselects all or specified rows.

These are rather fine-grained but they're used internally by the selection code so they may as well be documented.

## Sorting

By default, the user can sort the table by any column which doesn't have a \`sort === false\`.

You can set the initial sort by setting the \`sort\` value of a specific column to \`ascending\`
or \`descending\`.

You can override this by setting the table's sort function (it's an \`Array.sort()\` callback)
to whatever you like, and you can replace the \`headerCell\` or set the \`sort\` of each column
to \`false\` if you have some specific sorting in mind.

You can disable sorting controls by adding the \`nosort\` attribute to the \`<xin-table>\`.

## Hiding (and Showing) Columns

By default, the user can show / hide columns by clicking via the column header menu.
You can remove this option by adding the \`nohide\` attribute to the \`<xin-table>\`

## Reordering Columns

By default, the user can reorder columns by dragging them around. You can disable this
by adding the \`noreorder\` attribute to the \`<xin-table>\`.

## Row Height

If you set the \`<xin-table>\`'s \`rowHeight\` to \`0\` it will render all its elements (i.e. not be virtual). This is
useful for smaller tables, or tables with variable row-heights.

## Styling

Aside from row height (see previous) the component doesn't use the shadowDOM, so it's easy to override
its styles.

## Pinned Rows

The table supports two attributes, \`pinnedTop\` and \`pinnedBottom\` that let you pin the specified number
of top and bottom rows.

## Localization

\`<xin-table>\` supports the \`localized\` attribute which simply causes its default \`headerCell\`
to render a \`<xin-localized>\` element instead of a span for its caption, and localize its
popup menu.

You'll need to make sure your localized strings include:

- Sort
- Show
- Hide
- Column
- Ascending
- Descending

As well as any column names you want localized.`,
    title: "table",
    filename: "data-table.ts",
    path: "src/data-table.ts"
  },
  {
    text: `# tabs

\`<xin-tabs>\` creates a \`tabpanel\` for its children, creating a \`tab\` for each based on its
\`name\` attribute.

\`\`\`js
[...preview.querySelectorAll('div[name]')].forEach(div => {
  div.style.color = \`hsl(\${(Math.random() * 360).toFixed(0)} 50% 50%)\`
})

import { div, button } from 'tosijs'.elements
const tabSelector = preview.querySelector('xin-tabs')

tabSelector.onCloseTab = body => {
  if (!confirm(\`Are you sure you want to close the \${body.getAttribute('name')} tab?\`)) {
    return false
  }
}

let bodycount = 0
preview.querySelector('.add').addEventListener('click', () => {
  const name = \`new tab \${++bodycount}\`
  const body = div(
    {name, dataClose: true},
    name,
  )
  tabSelector.addTabBody(body, true)
})
\`\`\`
\`\`\`html
<xin-tabs>
  <div name="first">first body</div>
  <div name="second" data-close>
    <template role="tab">
      <xin-icon
        style="
          display: inline-block;
          width: 16px;
          height: 16px;
          transform: translateY(2px);
          margin-right: 4px;
          stroke: var(--brand-color);
        "
        icon="eye"
      ></xin-icon>
      <span>Ooooh!!!</span>
    </template>
    look at the html…
  </div>
  <div name="third">third body</div>
  <button class="add" slot="after-tabs">
    <xin-icon icon="plus"></xin-icon>
  </button>
</xin-tabs>
\`\`\`
\`\`\`css
  .preview xin-tabs {
    height: 100%;
  }

  .preview div[name] {
    padding: 20px;
    text-align: center;
    height: 100%;
    font-size: 200%;
  }

  .preview .add {
    width: 38px;
    line-height: 38px;
    height: 38px;
    padding: 0;
  }
\`\`\`

The \`<xin-tabs>\`s \`value\` is the index of its active body.

A \`<xin-tabs>\` has \`addTabBody(body: HTMLElement, select?: boolean)\` and
\`removeTabBody(body: number | HTMLElement)\` methods for updating its content.

You can also just insert or remove tab bodies directly and call \`setupTabs()\`.

## Closeable Tabs

Adding the \`data-close\` attribute to a tab will make it closeable.

When a tab is closed, the \`<xin-tabs>\` element's \`onCloseTab: (tabBody: Element) => boolean | undefined | void\`
will be called. If you override this method and return \`false\`, the tab will
not be closed (e.g. if you want to implement save/cancel behavior).

## Custom Tab Content

You can specify the exact content of the tab for a given body by
adding a \`<template role="tab">\` to that body. The contents of that
template will be cloned into the tab.

## Localized Support

\`\`\`html
<xin-tabs localized>
  <div name="localize"><h2>localize!</h2></div>
  <div name="tabs"><h2>tabs</h2></div>
</xin-tabs>
\`\`\`

\`<xin-tabs>\` supports the \`localized\` attribute. It will automatically localize
tab names (but it won't override custom tab content, so localizing that is on you).`,
    title: "tabs",
    filename: "tab-selector.ts",
    path: "src/tab-selector.ts"
  },
  {
    text: `# tag-list

Building a tag-list from standard HTML elements is a bit of a nightmare.

\`<tosi-tag-list>\` allows you to display an editable or read-only tag list (represented either
as a comma-delimited string or an array of strings).

\`\`\`html
<label style="position: absolute; right: 10px; top: 10px; display: block">
  <input type="checkbox" class="disable-toggle">
  <b>Disable All</b>
</label>
<label>
  <b>Display Only</b>
  <tosi-tag-list
    value="this,that,,the-other"
  ></tosi-tag-list>
</label>
<tosi-tag-list
  class="compact"
  value="this,that,,the-other"
></tosi-tag-list>
<br>
<label>
  <b>Editable</b>
  <tosi-tag-list
    class="editable-tag-list"
    value="belongs,also belongs,custom"
    editable
    available-tags="belongs,also belongs,not initially chosen"
  ></tosi-tag-list>
</label>
<br>
<b>Text-Entry</b>
<tosi-tag-list
  value="this,that,the-other,not,enough,space"
  editable
  text-entry
  available-tags="tomasina,dick,,harriet"
></tosi-tag-list>
\`\`\`
\`\`\`css
.preview .compact {
  --spacing: 8px;
  --font-size: 12px;
  --line-height: 18px;
}
.preview label {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}
\`\`\`
\`\`\`js
preview.addEventListener('change', (event) => {
  if (event.target.matches('tosi-tag-list')) {
    console.log(event.target, event.target.value)
  }
}, true)
preview.querySelector('.disable-toggle').addEventListener('change', (event) => {
  const tagLists = Array.from(preview.querySelectorAll('tosi-tag-list'))
  for(const tagList of tagLists) {
    tagList.disabled = event.target.checked
  }
})
\`\`\`

## Properties

### \`value\`: string | string[]

A list of tags

### \`tags\`: string[]

## \`popSelectMenu\`: () => void

This is the method called when the user clicks the menu button. By default is displays a
pick list of tags, but if you wish to customize the behavior, just replace this method.

A read-only property giving the value as an array.

### \`available-tags\`: string | string[]

A list of tags that will be displayed in the popup menu by default. The popup menu
will always display custom tags (allowing their removal).

### \`editable\`: boolean

Allows the tag list to be modified via menu and removing tags.

### \`text-entry\`: boolean

If \`editable\`, an input field is provided for entering tags directly.

### \`placeholder\`: string = 'enter tags'

Placeholder shown on input field.`,
    title: "tag-list",
    filename: "tag-list.ts",
    path: "src/tag-list.ts"
  },
  {
    text: "# theme\n\nThe theme system provides consistent CSS variables across all tosijs-ui components,\nwith support for automatic dark mode via tosijs's `Color` class and `invertLuminance`.\n\n## Base Variables\n\nAll components use these foundational CSS variables with the `--tosi-` prefix:\n\n| Variable | Default | Description |\n|----------|---------|-------------|\n| `--tosi-spacing-xs` | 4px | Extra small spacing |\n| `--tosi-spacing-sm` | 8px | Small spacing |\n| `--tosi-spacing` | 12px | Default spacing |\n| `--tosi-spacing-lg` | 16px | Large spacing |\n| `--tosi-spacing-xl` | 24px | Extra large spacing |\n| `--tosi-bg` | #fafafa | Background color |\n| `--tosi-bg-inset` | derived | Inset/recessed background |\n| `--tosi-text` | #222 | Text color |\n| `--tosi-accent` | #EE257B | Accent/brand color |\n| `--tosi-accent-text` | derived | Text on accent background |\n| `--tosi-font-family` | system-ui | Font family |\n| `--tosi-font-size` | 16px | Base font size |\n| `--tosi-line-height` | 1.5 | Line height |\n| `--tosi-touch-size` | 44px | Minimum touch target |\n| `--tosi-focus-ring` | derived | Focus outline style |\n\n## Creating Themes\n\n```js\nimport { Color } from 'tosijs'\nimport { createTheme, applyTheme } from 'tosijs-ui'\n\nconst myTheme = createTheme({\n  accent: Color.fromCss('#007AFF'),\n  background: Color.fromCss('#ffffff'),\n  text: Color.fromCss('#1a1a1a'),\n})\n\napplyTheme(myTheme, 'my-theme')\n```\n\n## Dark Mode\n\nDark mode is automatic when using `createDarkTheme`:\n\n```js\nimport { createTheme, createDarkTheme, applyTheme } from 'tosijs-ui'\n\nconst colors = {\n  accent: Color.fromCss('#007AFF'),\n  background: Color.fromCss('#ffffff'),\n  text: Color.fromCss('#1a1a1a'),\n}\n\n// Apply based on user preference\nconst prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches\napplyTheme(prefersDark ? createDarkTheme(colors) : createTheme(colors))\n```\n\n## Component Variables\n\nEach component defines its own variables that derive from base variables.\nFor example, xin-select derives from base:\n\n    --tosi-select-gap: var(--tosi-spacing-sm, 8px);\n    --tosi-select-touch-size: var(--tosi-touch-size, 44px);\n\nThis allows fine-grained customization while maintaining consistency.",
    title: "theme",
    filename: "theme.ts",
    path: "src/theme.ts"
  },
  {
    text: `# trackDrag

Sometimes you want to track a mouse-drag or touch-drag operation without messing around.
This is how the resizeable columns in \`<xin-table>\` work.

Just call \`trackDrag(event, (dx, dy, event) => { ... })\` and you'll get updates on corresponding events until
you return \`true\` from the event-handler (or, in the case of \`touch\` events, the last \`touch\` ends).
For mouse events, a "tracker" element is thrown up in front of everything for the event.

\`\`\`html
<p>
  Try dragging the squares…<br>
  (You can drag them separately with multi-touch!)
</p>
<div class="draggable" style="top: 20px; left: 40px; background: #f008"></div>
<div class="draggable" style="left: 40%; bottom: 30%; background: #0f08"></div>
<div class="draggable" style="bottom: 30px; right: 10px; background: #00f8"></div>
\`\`\`
\`\`\`css
.preview {
  touch-action: none;
}

.draggable {
  content: ' ';
  position: absolute;
  width: 50px;
  height: 50px;
  cursor: move;
}

.preview p {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translateX(-50%) translateY(-50%);
}
\`\`\`
\`\`\`js
import { trackDrag } from 'tosijs-ui'

function dragItem(event) {
  const draggable = event.target
  if (draggable.classList.contains('draggable')) {
    const x = draggable.offsetLeft
    const y = draggable.offsetTop
    trackDrag(event, (dx, dy, event) => {
      draggable.style.left = (x + dx) + 'px'
      draggable.style.top = (y + dy) + 'px'
      draggable.style.bottom = 'auto'
      draggable.style.right = 'auto'
      return event.type === 'mouseup'
    })
  }
}

preview.addEventListener('mousedown', dragItem )
preview.addEventListener('touchstart', dragItem, { passive: true } )
\`\`\`

For \`touch\` events, \`dx\` and \`dy\` are based on tracking \`event.changedTouches[0]\` which
is almost certainly what you want.

To handle multi-touch gestures you will need to track the touches yourself.

## bringToFront

\`bringToFront(element: HTMLElement, selector = 'body *')\`  gives the element the highest
\`z-index\` of any element matching the selector (which is passed to findHighestZ).

## findHighestZ

\`findHighestZ(selector = 'body *'): number\` returns the the highest \`z-index\` of any element
matching \`selector\`.`,
    title: "trackDrag",
    filename: "track-drag.ts",
    path: "src/track-drag.ts"
  },
  {
    text: `# doc-browser

The \`tosijs-ui\` library provides everything you need to create a self-documented testbed similar
to the [tosijs-ui documentation site](https://ui.tosijs.net). It's like Storybook but much simpler
to set up and maintain.

## Quick Start

### 1. Extract Documentation

Use the CLI tool to extract documentation from your source files:

\`\`\`bash
npx tosijs-ui-docs --dirs src,README.md --output docs.json
\`\`\`

This scans for:

- \`.md\` files (uses entire content)
- Multi-line comments starting with \`/*#\` in \`.ts\`, \`.js\`, \`.css\` files

### 2. Create Your Doc Browser

\`\`\`typescript
import { createDocBrowser } from 'tosijs-ui'
import * as mylib from './my-library.js'
import docs from './docs.json'

const browser = createDocBrowser({
  docs,
  context: { mylib },
  projectName: 'My Project',
  projectLinks: {
    github: 'https://github.com/user/project',
    npm: 'https://www.npmjs.com/package/project',
  },
})

document.body.append(browser)
\`\`\`

### 3. Add Live Examples in Your Docs

In your source files or markdown, use code fences. Any sequence of
html, js, and css code examples will be turned in to a live, interactive
example.

    /*#
    # My Component

    This component does amazing things!

    \`\`\`html
    <my-component></my-component>
    \`\`\`
    \`\`\`js
    import { myComponent } from 'mylib'
    preview.append(myComponent({ value: 'Hello!' }))
    \`\`\`
    \`\`\`css
    my-component {
      color: blue;
    }
    \`\`\`
    *‎/

    export class MyComponent extends Component {
      // ...
    }

    export const myComponent = MyComponent.elementCreator({
      tag: 'my-component'
    })

## Documentation Format

### Inline Comments

Start multi-line comments with \`/*#\` to mark them as documentation:

\`\`\`typescript
/*#
# Component Name

Description and examples go here...
*‎/
\`\`\`

### Metadata

Control sort order with JSON metadata:

\`\`\`
<!--{ "pin": "bottom" }-->
\`\`\`

or

\`\`\`
/*{ "pin": "bottom" }*‎/
\`\`\`

## Programmatic API

\`\`\`typescript
import { extractDocs, saveDocsJSON } from 'tosijs-ui'

const docs = extractDocs({
  dirs: ['src', 'README.md'],
  ignore: ['node_modules', 'dist'],
})

saveDocsJSON(docs, './docs.json')

// Or use the docs directly
import { createDocBrowser } from 'tosijs-ui'
const browser = createDocBrowser({ docs, context: { mylib } })
\`\`\`

## createDocBrowser Options

\`\`\`typescript
interface DocBrowserOptions {
  docs: Doc[] // Array of documentation objects
  context?: Record<string, any> // Modules for live examples
  projectName?: string // Display name
  projectLinks?: ProjectLinks // Links to show in header
  navSize?: number // Nav width (default: 200)
  minSize?: number // Min width before compact (default: 600)
}

interface ProjectLinks {
  github?: string
  npm?: string
  discord?: string
  blog?: string
  tosijs?: string
  bundle?: string
  cdn?: string
  [key: string]: string | undefined
}
\`\`\`

## See Also

The \`tosijs-ui\` demo is a complete working example. See:

- \`/demo/src/index.ts\` - How the doc browser is set up
- \`/bin/docs.ts\` - The extraction tool
- \`/src/doc-browser.ts\` - The createDocBrowser implementation`,
    title: "doc-browser",
    filename: "doc-browser.ts",
    path: "src/doc-browser.ts",
    pin: "bottom"
  },
  {
    text: `# docs

Utility for extracting documentation from markdown files and inline comments in source code.

> \`docs.ts\` is intended to be run directly using \`bun\`. You can transpile it to javascript if you
want to run it using node.

This is used by the \`doc-browser\` component to build searchable, navigable documentation
from your project's source files.

## Usage

    import { extractDocs } from 'docs'

    extractDocs({
      paths: ['src', 'README.md'],
      ignore: ['node_modules', 'dist', 'build']
      path: 'public/docs.json'
    })

## API

### \`extractDocs(options)\`

Scans directories for markdown files and source code comments.

**Options:**
- \`paths\`: Array of directory paths or file paths to scan
- \`ignore\`: Array of directory names to ignore (default: ['node_modules', 'dist'])
- \`output\`: if provided, path to write json result.

**Returns:** Array of \`Doc\` objects

### \`Doc\` object structure

    {
      text: string,        // Markdown content
      title: string,       // First heading or filename
      filename: string,    // Just the filename
      path: string,        // Full file path
      pin?: 'top' | 'bottom'  // Optional pinning for sort order
    }

## Documentation Format

### Markdown files

Any \`.md\` file will be included in its entirety.

### Source code comments

Multi-line comments that start with \`/*#\` will be extracted as markdown:

    /*#
    # My Component

    This is documentation for my component.

    \`\`\`html
    <my-component></my-component>
    \`\`\`
    \`\`\`js
    console.log('hello world')
    \`\`\`
    \`\`\`css
    my-componet {
      color: blue
    }
    \`\`\`
    *‎/

    export class MyComponent extends Component {
      // implementation
    }
    ...

The [doc-browser](/?doc-browser.ts) will render the output as a test-bed project with documentation and live examples.

### Metadata

You can include JSON metadata in comments to control sorting:

html:
    <!--{ "pin": "bottom" }-->

ts, js, css:
    /*{ "pin": "bottom" }*‎/

This will pin the document to the top or bottom of the navigation list.`,
    title: "docs",
    filename: "docs.ts",
    path: "bin/docs.ts",
    pin: "bottom"
  }
];

// demo/src/index.ts
nn("demo-style", styleSpec);
initLocalization(localized_strings_default);
Object.assign(window, { tosijs: exports_module, tosijsui: exports_src });
setTimeout(() => {
  const brandColor2 = getComputedStyle(document.body).getPropertyValue("--brand-color");
  console.log("welcome to %ui.tosijs.net", `color: ${brandColor2}; padding: 0 5px;`);
}, 100);
var PROJECT = "tosijs-ui";
var { prefs } = Co({
  prefs: {
    theme: "system",
    highContrast: false,
    locale: ""
  }
});
Tn((path) => {
  if (path.startsWith("prefs")) {
    return true;
  }
  return false;
});
if (prefs.locale) {
  setLocale(prefs.locale.value);
}
setTimeout(() => {
  Object.assign(globalThis, { tosijs: exports_module, tosijsui: exports_src });
}, 1000);
H(document.body, "prefs.theme", {
  toDOM(element, theme2) {
    if (theme2 === "system") {
      theme2 = getComputedStyle(document.body).getPropertyValue("--darkmode") === "true" ? "dark" : "light";
    }
    element.classList.toggle("darkmode", theme2 === "dark");
  }
});
H(document.body, "prefs.highContrast", {
  toDOM(element, highContrast) {
    element.classList.toggle("high-contrast", highContrast);
  }
});
var main = document.querySelector("main");
var browser = createDocBrowser({
  docs: docs_default,
  context: { tosijs: exports_module, "tosijs-ui": exports_src },
  projectName: PROJECT,
  projectLinks: {
    tosijs: "https://tosijs.net",
    github: `https://github.com/tonioloewald/${PROJECT}`,
    npm: `https://www.npmjs.com/package/${PROJECT}`,
    discord: "https://discord.com/invite/ramJ9rgky5",
    blog: "https://loewald.com",
    bundle: `https://bundlejs.com/?q=${PROJECT}`,
    cdn: `https://www.jsdelivr.com/package/npm/${PROJECT}`
  }
});
if (main) {
  const header3 = browser.querySelector("header");
  if (header3) {
    const { img, a: a4, span: span16, button: button14 } = y;
    const sizeBreakElement = header3.querySelector("xin-sizebreak");
    if (sizeBreakElement) {
      const badges = span16({
        style: {
          marginRight: Uo.spacing,
          display: "flex",
          alignItems: "center",
          gap: Uo.spacing50
        }
      }, a4({ href: `https://bundlejs.com/?q=${PROJECT}`, target: "_blank" }, img({
        alt: "bundlejs size badge",
        src: `https://deno.bundlejs.com/?q=${PROJECT}&badge=`
      })), a4({
        href: `https://www.jsdelivr.com/package/npm/${PROJECT}`,
        target: "_blank"
      }, img({
        alt: "jsdelivr",
        src: `https://data.jsdelivr.com/v1/package/npm/${PROJECT}/badge`
      })));
      const largeSlot = sizeBreakElement.querySelector('[slot="large"]');
      if (largeSlot) {
        largeSlot.replaceChildren(badges);
      } else {
        sizeBreakElement.prepend(badges);
      }
    }
    const settingsButton = button14({
      class: "iconic",
      style: { color: Uo.linkColor },
      title: "links and settings",
      onClick(event) {
        popMenu({
          target: event.target,
          localized: true,
          menuItems: [
            {
              caption: "Language",
              icon: "globe",
              menuItems: i18n.localeOptions.value.map((locale) => ({
                caption: locale.caption,
                icon: locale.icon,
                checked: () => locale.value === i18n.locale.value,
                action() {
                  prefs.locale.value = locale.value;
                  setLocale(locale.value);
                }
              }))
            },
            {
              caption: "Color Theme",
              icon: "rgb",
              menuItems: [
                {
                  caption: "System",
                  checked() {
                    return prefs.theme.value === "system";
                  },
                  action() {
                    prefs.theme.value = "system";
                  }
                },
                {
                  caption: "Dark",
                  checked() {
                    return prefs.theme.value === "dark";
                  },
                  action() {
                    prefs.theme.value = "dark";
                  }
                },
                {
                  caption: "Light",
                  checked() {
                    return prefs.theme.value === "light";
                  },
                  action() {
                    prefs.theme.value = "light";
                  }
                },
                null,
                {
                  caption: "High Contrast",
                  checked() {
                    return prefs.highContrast.value;
                  },
                  action() {
                    prefs.highContrast.value = !prefs.highContrast.value;
                  }
                }
              ]
            }
          ]
        });
      }
    }, icons.moreVertical());
    header3.append(settingsButton);
  }
  main.append(browser);
}
console.log(`tosijs ${re}, tosijs-ui ${version}`);
