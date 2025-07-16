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

// node_modules/tosijs/dist/module.js
var exports_module = {};
__export(exports_module, {
  xinValue: () => x,
  xinProxy: () => Pn,
  xinPath: () => C,
  xin: () => d,
  version: () => An,
  vars: () => Hn,
  varDefault: () => sn,
  updates: () => Jn,
  unobserve: () => J,
  touchElement: () => Cn,
  touch: () => j,
  tosi: () => xe,
  throttle: () => en,
  svgElements: () => Ln,
  settings: () => F,
  on: () => z,
  observe: () => U,
  mathML: () => On,
  makeComponent: () => ln,
  invertLuminance: () => Ge,
  initVars: () => Ue,
  hotReload: () => Re,
  getListItem: () => mn,
  getCssVar: () => Mn,
  elements: () => p,
  debounce: () => vn,
  css: () => V,
  boxedProxy: () => cn,
  boxed: () => Y,
  blueprintLoader: () => oo,
  blueprint: () => eo,
  bindings: () => tn,
  bind: () => h,
  StyleSheet: () => Ve,
  MoreMath: () => Ae,
  Component: () => M,
  Color: () => a,
  BlueprintLoader: () => Wn,
  Blueprint: () => an
});
var F = { debug: false, perf: false };
function T(n) {
  if (n == null || typeof n !== "object")
    return n;
  if (n instanceof Set)
    return new Set(n);
  else if (Array.isArray(n))
    return n.map(T);
  let e = {};
  for (let o in n) {
    let t = n[o];
    if (n != null && typeof n === "object")
      e[o] = T(t);
    else
      e[o] = t;
  }
  return e;
}
var un = "-xin-data";
var v = `.${un}`;
var pn = "-xin-event";
var yn = `.${pn}`;
var m = "xinPath";
var O = "xinValue";
var In = "xinObserve";
var Yn = "xinBind";
var _n = "xinOn";
var C = (n) => {
  return n && n[m] || undefined;
};
function x(n) {
  return typeof n === "object" && n !== null ? n[O] || n : n;
}
var L = new WeakMap;
var E = new WeakMap;
var B = (n) => {
  let e = n.cloneNode();
  if (e instanceof Element) {
    let o = E.get(n), t = L.get(n);
    if (o != null)
      E.set(e, T(o));
    if (t != null)
      L.set(e, T(t));
  }
  for (let o of Array.from(n instanceof HTMLTemplateElement ? n.content.childNodes : n.childNodes))
    if (o instanceof Element || o instanceof DocumentFragment)
      e.appendChild(B(o));
    else
      e.appendChild(o.cloneNode());
  return e;
};
var q = new WeakMap;
var mn = (n) => {
  let e = document.body.parentElement;
  while (n.parentElement != null && n.parentElement !== e) {
    let o = q.get(n);
    if (o != null)
      return o;
    n = n.parentElement;
  }
  return false;
};
var Vn = Symbol("observer should be removed");
var N = [];
var nn = [];
var xn = false;
var hn;
var bn;

class qn {
  description;
  test;
  callback;
  constructor(n, e) {
    let o = typeof e === "string" ? `"${e}"` : `function ${e.name}`, t;
    if (typeof n === "string")
      this.test = (i) => typeof i === "string" && i !== "" && (n.startsWith(i) || i.startsWith(n)), t = `test = "${n}"`;
    else if (n instanceof RegExp)
      this.test = n.test.bind(n), t = `test = "${n.toString()}"`;
    else if (n instanceof Function)
      this.test = n, t = `test = function ${n.name}`;
    else
      throw new Error("expect listener test to be a string, RegExp, or test function");
    if (this.description = `${t}, ${o}`, typeof e === "function")
      this.callback = e;
    else
      throw new Error("expect callback to be a path or function");
    N.push(this);
  }
}
var Jn = async () => {
  if (hn === undefined)
    return;
  await hn;
};
var be = () => {
  if (F.perf)
    console.time("xin async update");
  let n = Array.from(nn);
  for (let e of n)
    N.filter((o) => {
      let t;
      try {
        t = o.test(e);
      } catch (i) {
        throw new Error(`Listener ${o.description} threw "${i}" at "${e}"`);
      }
      if (t === Vn)
        return J(o), false;
      return t;
    }).forEach((o) => {
      let t;
      try {
        t = o.callback(e);
      } catch (i) {
        console.error(`Listener ${o.description} threw "${i}" handling "${e}"`);
      }
      if (t === Vn)
        J(o);
    });
  if (nn.splice(0), xn = false, typeof bn === "function")
    bn();
  if (F.perf)
    console.timeEnd("xin async update");
};
var j = (n) => {
  let e = typeof n === "string" ? n : C(n);
  if (e === undefined)
    throw console.error("touch was called on an invalid target", n), new Error("touch was called on an invalid target");
  if (xn === false)
    hn = new Promise((o) => {
      bn = o;
    }), xn = setTimeout(be);
  if (nn.find((o) => e.startsWith(o)) == null)
    nn.push(e);
};
var gn = (n, e) => {
  return new qn(n, e);
};
var J = (n) => {
  let e = N.indexOf(n);
  if (e > -1)
    N.splice(e, 1);
  else
    throw new Error("unobserve failed, listener not found");
};
var ge = (n) => {
  try {
    return JSON.stringify(n);
  } catch (e) {
    return "{has circular references}";
  }
};
var wn = (...n) => new Error(n.map(ge).join(" "));
var we = () => new Date(parseInt("1000000000", 36) + Date.now()).valueOf().toString(36).slice(1);
var Xe = 0;
var Te = () => (parseInt("10000", 36) + ++Xe).toString(36).slice(-5);
var Ee = () => we() + Te();
var Xn = {};
var Zn = {};
function Qn(n) {
  if (n === "")
    return [];
  if (Array.isArray(n))
    return n;
  else {
    let e = [];
    while (n.length > 0) {
      let o = n.search(/\[[^\]]+\]/);
      if (o === -1) {
        e.push(n.split("."));
        break;
      } else {
        let t = n.slice(0, o);
        if (n = n.slice(o), t !== "")
          e.push(t.split("."));
        if (o = n.indexOf("]") + 1, e.push(n.slice(1, o - 1)), n.slice(o, o + 1) === ".")
          o += 1;
        n = n.slice(o);
      }
    }
    return e;
  }
}
var S = new WeakMap;
function Kn(n, e) {
  if (S.get(n) === undefined)
    S.set(n, {});
  if (S.get(n)[e] === undefined)
    S.get(n)[e] = {};
  let o = S.get(n)[e];
  if (e === "_auto_")
    n.forEach((t, i) => {
      if (t._auto_ === undefined)
        t._auto_ = Ee();
      o[t._auto_ + ""] = i;
    });
  else
    n.forEach((t, i) => {
      o[W(t, e) + ""] = i;
    });
  return o;
}
function Se(n, e) {
  if (S.get(n) === undefined || S.get(n)[e] === undefined)
    return Kn(n, e);
  else
    return S.get(n)[e];
}
function ke(n, e, o) {
  o = o + "";
  let t = Se(n, e)[o];
  if (t === undefined || W(n[t], e) + "" !== o)
    t = Kn(n, e)[o];
  return t;
}
function ve(n, e, o) {
  if (n[e] === undefined && o !== undefined)
    n[e] = o;
  return n[e];
}
function Rn(n, e, o, t) {
  let i = e !== "" ? ke(n, e, o) : o;
  if (t === Xn)
    return n.splice(i, 1), S.delete(n), Symbol("deleted");
  else if (t === Zn) {
    if (e === "" && n[i] === undefined)
      n[i] = {};
  } else if (t !== undefined)
    if (i !== undefined)
      n[i] = t;
    else if (e !== "" && W(t, e) + "" === o + "")
      n.push(t), i = n.length - 1;
    else
      throw new Error(`byIdPath insert failed at [${e}=${o}]`);
  return n[i];
}
function Un(n) {
  if (!Array.isArray(n))
    throw wn("setByPath failed: expected array, found", n);
}
function Gn(n) {
  if (n == null || !(n instanceof Object))
    throw wn("setByPath failed: expected Object, found", n);
}
function W(n, e) {
  let o = Qn(e), t = n, i, s, r, c;
  for (i = 0, s = o.length;t !== undefined && i < s; i++) {
    let l = o[i];
    if (Array.isArray(l))
      for (r = 0, c = l.length;t !== undefined && r < c; r++) {
        let f = l[r];
        t = t[f];
      }
    else if (t.length === 0) {
      if (t = t[Number(l.slice(1))], l[0] !== "=")
        return;
    } else if (l.includes("=")) {
      let [f, ...w] = l.split("=");
      t = Rn(t, f, w.join("="));
    } else
      r = parseInt(l, 10), t = t[r];
  }
  return t;
}
function Nn(n, e, o) {
  let t = n, i = Qn(e);
  while (t != null && i.length > 0) {
    let s = i.shift();
    if (typeof s === "string") {
      let r = s.indexOf("=");
      if (r > -1) {
        if (r === 0)
          Gn(t);
        else
          Un(t);
        let c = s.slice(0, r), l = s.slice(r + 1);
        if (t = Rn(t, c, l, i.length > 0 ? Zn : o), i.length === 0)
          return true;
      } else {
        Un(t);
        let c = parseInt(s, 10);
        if (i.length > 0)
          t = t[c];
        else {
          if (o !== Xn) {
            if (t[c] === o)
              return false;
            t[c] = o;
          } else
            t.splice(c, 1);
          return true;
        }
      }
    } else if (Array.isArray(s) && s.length > 0) {
      Gn(t);
      while (s.length > 0) {
        let r = s.shift();
        if (s.length > 0 || i.length > 0)
          t = ve(t, r, s.length > 0 ? {} : []);
        else {
          if (o !== Xn) {
            if (t[r] === o)
              return false;
            t[r] = o;
          } else {
            if (!Object.prototype.hasOwnProperty.call(t, r))
              return false;
            delete t[r];
          }
          return true;
        }
      }
    } else
      throw new Error(`setByPath failed, bad path ${e}`);
  }
  throw new Error(`setByPath(${n}, ${e}, ${o}) failed`);
}
var Ce = ["sort", "splice", "copyWithin", "fill", "pop", "push", "reverse", "shift", "unshift"];
var En = {};
var Me = true;
var De = /^\.?([^.[\](),])+(\.[^.[\](),]+|\[\d+\]|\[[^=[\](),]*=[^[\]()]+\])*$/;
var Fe = (n) => De.test(n);
var H = (n = "", e = "") => {
  if (n === "")
    return e;
  else if (e.match(/^\d+$/) !== null || e.includes("="))
    return `${n}[${e}]`;
  else
    return `${n}.${e}`;
};
var Le = { string(n) {
  return new String(n);
}, boolean(n) {
  return new Boolean(n);
}, bigint(n) {
  return n;
}, symbol(n) {
  return n;
}, number(n) {
  return new Number(n);
} };
function Tn(n, e) {
  let o = typeof n;
  if (n === undefined || o === "object" || o === "function")
    return n;
  else
    return new Proxy(Le[typeof n](n), I(e, true));
}
var I = (n, e) => ({ get(o, t) {
  switch (t) {
    case m:
      return n;
    case O:
      return o.valueOf ? o.valueOf() : o;
    case In:
      return (r) => {
        let c = gn(n, r);
        return () => J(c);
      };
    case _n:
      return (r, c) => z(r, c, x(o));
    case Yn:
      return (r, c, l) => {
        h(r, n, c, l);
      };
  }
  if (typeof t === "symbol")
    return o[t];
  let i = t, s = i.match(/^([^.[]+)\.(.+)$/) ?? i.match(/^([^\]]+)(\[.+)/) ?? i.match(/^(\[[^\]]+\])\.(.+)$/) ?? i.match(/^(\[[^\]]+\])\[(.+)$/);
  if (s !== null) {
    let [, r, c] = s, l = H(n, r), f = W(o, r);
    return f !== null && typeof f === "object" ? new Proxy(f, I(l, e))[c] : f;
  }
  if (i.startsWith("[") && i.endsWith("]"))
    i = i.substring(1, i.length - 1);
  if (!Array.isArray(o) && o[i] !== undefined || Array.isArray(o) && i.includes("=")) {
    let r;
    if (i.includes("=")) {
      let [c, l] = i.split("=");
      r = o.find((f) => `${W(f, c)}` === l);
    } else
      r = o[i];
    if (r instanceof Object) {
      let c = H(n, i);
      return new Proxy(r instanceof Function ? r.bind(o) : r, I(c, e));
    } else
      return e ? Tn(r, H(n, i)) : r;
  } else if (Array.isArray(o)) {
    let r = o[i];
    return typeof r === "function" ? (...c) => {
      let l = r.apply(o, c);
      if (Ce.includes(i))
        j(n);
      return l;
    } : typeof r === "object" ? new Proxy(r, I(H(n, i), e)) : e ? Tn(r, H(n, i)) : r;
  } else
    return e ? Tn(o[i], H(n, i)) : o[i];
}, set(o, t, i) {
  i = x(i);
  let s = t !== O ? H(n, t) : n;
  if (Me && !Fe(s))
    throw new Error(`setting invalid path ${s}`);
  if (x(d[s]) !== i && Nn(En, s, i))
    j(s);
  return true;
} });
var U = (n, e) => {
  let o = typeof e === "function" ? e : d[e];
  if (typeof o !== "function")
    throw new Error(`observe expects a function or path to a function, ${e} is neither`);
  return gn(n, o);
};
var d = new Proxy(En, I("", false));
var Y = new Proxy(En, I("", true));
var Sn = (n, e) => {
  let o = new Event(e);
  n.dispatchEvent(o);
};
var ee = (n) => {
  if (n instanceof HTMLInputElement)
    return n.type;
  else if (n instanceof HTMLSelectElement && n.hasAttribute("multiple"))
    return "multi-select";
  else
    return "other";
};
var oe = (n, e) => {
  switch (ee(n)) {
    case "radio":
      n.checked = n.value === e;
      break;
    case "checkbox":
      n.checked = !!e;
      break;
    case "date":
      n.valueAsDate = new Date(e);
      break;
    case "multi-select":
      for (let o of Array.from(n.querySelectorAll("option")))
        o.selected = e[o.value];
      break;
    default:
      n.value = e;
  }
};
var te = (n) => {
  switch (ee(n)) {
    case "radio": {
      let e = n.parentElement?.querySelector(`[name="${n.name}"]:checked`);
      return e != null ? e.value : null;
    }
    case "checkbox":
      return n.checked;
    case "date":
      return n.valueAsDate?.toISOString();
    case "multi-select":
      return Array.from(n.querySelectorAll("option")).reduce((e, o) => {
        return e[o.value] = o.selected, e;
      }, {});
    default:
      return n.value;
  }
};
var { ResizeObserver: ne } = globalThis;
var G = ne != null ? new ne((n) => {
  for (let e of n) {
    let o = e.target;
    Sn(o, "resize");
  }
}) : { observe() {}, unobserve() {} };
var kn = (n, e, o = true) => {
  if (n != null && e != null)
    if (typeof e === "string")
      n.textContent = e;
    else if (Array.isArray(e))
      e.forEach((t) => {
        n.append(t instanceof Node && o ? B(t) : t);
      });
    else if (e instanceof Node)
      n.append(o ? B(e) : e);
    else
      throw new Error("expect text content or document node");
};
var vn = (n, e = 250) => {
  let o;
  return (...t) => {
    if (o !== undefined)
      clearTimeout(o);
    o = setTimeout(() => {
      n(...t);
    }, e);
  };
};
var en = (n, e = 250) => {
  let o, t = Date.now() - e, i = false;
  return (...s) => {
    if (clearTimeout(o), o = setTimeout(async () => {
      n(...s), t = Date.now();
    }, e), !i && Date.now() - t >= e) {
      i = true;
      try {
        n(...s), t = Date.now();
      } finally {
        i = false;
      }
    }
  };
};
var on = Symbol("list-binding");
var Oe = 16;
var Be = 100;
function ie(n, e) {
  let o = Array.from(n.querySelectorAll(v));
  if (n.matches(v))
    o.unshift(n);
  for (let t of o) {
    let i = E.get(t);
    for (let s of i) {
      if (s.path.startsWith("^"))
        s.path = `${e}${s.path.substring(1)}`;
      if (s.binding.toDOM != null)
        s.binding.toDOM(t, d[s.path]);
    }
  }
}

class re {
  boundElement;
  listTop;
  listBottom;
  template;
  options;
  itemToElement;
  _array = [];
  _update;
  _previousSlice;
  static filterBoundObservers = new WeakMap;
  constructor(n, e, o = {}) {
    if (this.boundElement = n, this.itemToElement = new WeakMap, n.children.length !== 1)
      throw new Error("ListBinding expects an element with exactly one child element");
    if (n.children[0] instanceof HTMLTemplateElement) {
      let t = n.children[0];
      if (t.content.children.length !== 1)
        throw new Error("ListBinding expects a template with exactly one child element");
      this.template = B(t.content.children[0]);
    } else
      this.template = n.children[0], this.template.remove();
    if (this.listTop = document.createElement("div"), this.listBottom = document.createElement("div"), this.boundElement.append(this.listTop), this.boundElement.append(this.listBottom), this.options = o, o.virtual != null)
      G.observe(this.boundElement), this._update = en(() => {
        this.update(this._array, true);
      }, Oe), this.boundElement.addEventListener("scroll", this._update), this.boundElement.addEventListener("resize", this._update);
  }
  visibleSlice() {
    let { virtual: n, hiddenProp: e, visibleProp: o } = this.options, t = this._array;
    if (e !== undefined)
      t = t.filter((l) => l[e] !== true);
    if (o !== undefined)
      t = t.filter((l) => l[o] === true);
    if (this.options.filter && this.needle !== undefined)
      t = this.options.filter(t, this.needle);
    let i = 0, s = t.length - 1, r = 0, c = 0;
    if (n != null && this.boundElement instanceof HTMLElement) {
      let l = this.boundElement.offsetWidth, f = this.boundElement.offsetHeight, w = n.width != null ? Math.max(1, Math.floor(l / n.width)) : 1, A = Math.ceil(f / n.height) + 1, P = Math.ceil(t.length / w), K = w * A, D = Math.floor(this.boundElement.scrollTop / n.height);
      if (D > P - A + 1)
        D = Math.max(0, P - A + 1);
      i = D * w, s = i + K - 1, r = D * n.height, c = Math.max(P * n.height - f - r, 0);
    }
    return { items: t, firstItem: i, lastItem: s, topBuffer: r, bottomBuffer: c };
  }
  needle;
  filter = en((n) => {
    if (this.needle !== n)
      this.needle = n, this.update(this._array);
  }, Be);
  update(n, e) {
    if (n == null)
      n = [];
    this._array = n;
    let { hiddenProp: o, visibleProp: t } = this.options, i = C(n), s = this.visibleSlice();
    this.boundElement.classList.toggle("-xin-empty-list", s.items.length === 0);
    let r = this._previousSlice, { firstItem: c, lastItem: l, topBuffer: f, bottomBuffer: w } = s;
    if (o === undefined && t === undefined && e === true && r != null && c === r.firstItem && l === r.lastItem)
      return;
    this._previousSlice = s;
    let A = 0, P = 0, K = 0;
    for (let u of Array.from(this.boundElement.children)) {
      if (u === this.listTop || u === this.listBottom)
        continue;
      let X = q.get(u);
      if (X == null)
        u.remove();
      else {
        let y = s.items.indexOf(X);
        if (y < c || y > l)
          u.remove(), this.itemToElement.delete(X), q.delete(u), A++;
      }
    }
    this.listTop.style.height = String(f) + "px", this.listBottom.style.height = String(w) + "px";
    let D = [], { idPath: dn } = this.options;
    for (let u = c;u <= l; u++) {
      let X = s.items[u];
      if (X === undefined)
        continue;
      let y = this.itemToElement.get(x(X));
      if (y == null) {
        if (K++, y = B(this.template), typeof X === "object")
          this.itemToElement.set(x(X), y), q.set(y, x(X));
        if (this.boundElement.insertBefore(y, this.listBottom), dn != null) {
          let fn = X[dn], he = `${i}[${dn}=${fn}]`;
          ie(y, he);
        } else {
          let fn = `${i}[${u}]`;
          ie(y, fn);
        }
      }
      D.push(y);
    }
    let R = null;
    for (let u of D) {
      if (u.previousElementSibling !== R)
        if (P++, R?.nextElementSibling != null)
          this.boundElement.insertBefore(u, R.nextElementSibling);
        else
          this.boundElement.insertBefore(u, this.listBottom);
      R = u;
    }
    if (F.perf)
      console.log(i, "updated", { removed: A, created: K, moved: P });
  }
}
var se = (n, e, o) => {
  let t = n[on];
  if (t === undefined)
    t = new re(n, e, o), n[on] = t;
  return t;
};
var { document: Z, MutationObserver: ce } = globalThis;
var Cn = (n, e) => {
  let o = E.get(n);
  if (o == null)
    return;
  for (let t of o) {
    let { binding: i, options: s } = t, { path: r } = t, { toDOM: c } = i;
    if (c != null) {
      if (r.startsWith("^")) {
        let l = mn(n);
        if (l != null && l[m] != null)
          r = t.path = `${l[m]}${r.substring(1)}`;
        else
          throw console.error(`Cannot resolve relative binding ${r}`, n, "is not part of a list"), new Error(`Cannot resolve relative binding ${r}`);
      }
      if (e == null || r.startsWith(e))
        c(n, d[r], s);
    }
  }
};
if (ce != null)
  new ce((e) => {
    e.forEach((o) => {
      Array.from(o.addedNodes).forEach((t) => {
        if (t instanceof Element)
          Array.from(t.querySelectorAll(v)).forEach((i) => Cn(i));
      });
    });
  }).observe(Z.body, { subtree: true, childList: true });
U(() => true, (n) => {
  let e = Array.from(Z.querySelectorAll(v));
  for (let o of e)
    Cn(o, n);
});
var le = (n) => {
  let e = n.target.closest(v);
  while (e != null) {
    let o = E.get(e);
    for (let t of o) {
      let { binding: i, path: s } = t, { fromDOM: r } = i;
      if (r != null) {
        let c;
        try {
          c = r(e, t.options);
        } catch (l) {
          throw console.error("Cannot get value from", e, "via", t), new Error("Cannot obtain value fromDOM");
        }
        if (c != null) {
          let l = d[s];
          if (l == null)
            d[s] = c;
          else {
            let f = l[m] != null ? l[O] : l, w = c[m] != null ? c[O] : c;
            if (f !== w)
              d[s] = w;
          }
        }
      }
    }
    e = e.parentElement.closest(v);
  }
};
if (globalThis.document != null)
  Z.body.addEventListener("change", le, true), Z.body.addEventListener("input", le, true);
function h(n, e, o, t) {
  if (n instanceof DocumentFragment)
    throw new Error("bind cannot bind to a DocumentFragment");
  let i;
  if (typeof e === "object" && e[m] === undefined && t === undefined) {
    let { value: c } = e;
    i = typeof c === "string" ? c : c[m], t = e, delete t.value;
  } else
    i = typeof e === "string" ? e : e[m];
  if (i == null)
    throw new Error("bind requires a path or object with xin Proxy");
  let { toDOM: s } = o;
  n.classList?.add(un);
  let r = E.get(n);
  if (r == null)
    r = [], E.set(n, r);
  if (r.push({ path: i, binding: o, options: t }), s != null && !i.startsWith("^"))
    j(i);
  if (t?.filter && t?.needle)
    h(n, t.needle, { toDOM(c, l) {
      console.log({ needle: l }), c[on]?.filter(l);
    } });
  return n;
}
var ae = new Set;
var He = (n) => {
  let e = n?.target.closest(yn), o = false, t = new Proxy(n, { get(s, r) {
    if (r === "stopPropagation")
      return () => {
        n.stopPropagation(), o = true;
      };
    else {
      let c = s[r];
      return typeof c === "function" ? c.bind(s) : c;
    }
  } }), i = new Set;
  while (!o && e != null) {
    let r = L.get(e)[n.type] || i;
    for (let c of r) {
      if (typeof c === "function")
        c(t);
      else {
        let l = d[c];
        if (typeof l === "function")
          l(t);
        else
          throw new Error(`no event handler found at path ${c}`);
      }
      if (o)
        continue;
    }
    e = e.parentElement != null ? e.parentElement.closest(yn) : null;
  }
};
function z(n, e, o) {
  let t = L.get(n);
  if (n.classList.add(pn), t == null)
    t = {}, L.set(n, t);
  if (!t[e])
    t[e] = new Set;
  if (t[e].add(o), !ae.has(e))
    ae.add(e), Z.body.addEventListener(e, He, true);
  return () => {
    t[e].delete(o);
  };
}
var tn = { value: { toDOM: oe, fromDOM(n) {
  return te(n);
} }, text: { toDOM(n, e) {
  n.textContent = e;
} }, enabled: { toDOM(n, e) {
  n.disabled = !e;
} }, disabled: { toDOM(n, e) {
  n.disabled = Boolean(e);
} }, list: { toDOM(n, e, o) {
  se(n, e, o).update(e);
} } };
var ze = 180 / Math.PI;
var $e = Math.PI / 180;
function b(n, e, o) {
  return o < n ? NaN : e < n ? n : e > o ? o : e;
}
function k(n, e, o, t = true) {
  if (t)
    o = b(0, o, 1);
  return o * (e - n) + n;
}
var Ae = { RADIANS_TO_DEGREES: ze, DEGREES_TO_RADIANS: $e, clamp: b, lerp: k };
function Mn(n, e = document.body) {
  let o = getComputedStyle(e);
  if (n.endsWith(")") && n.startsWith("var("))
    n = n.slice(4, -1);
  return o.getPropertyValue(n).trim();
}
var Pe = (n, e, o) => {
  return (0.299 * n + 0.587 * e + 0.114 * o) / 255;
};
var $ = (n) => ("00" + Math.round(Number(n)).toString(16)).slice(-2);

class de {
  h;
  s;
  l;
  constructor(n, e, o) {
    n /= 255, e /= 255, o /= 255;
    let t = Math.max(n, e, o), i = t - Math.min(n, e, o), s = i !== 0 ? t === n ? (e - o) / i : t === e ? 2 + (o - n) / i : 4 + (n - e) / i : 0;
    this.h = 60 * s < 0 ? 60 * s + 360 : 60 * s, this.s = i !== 0 ? t <= 0.5 ? i / (2 * t - i) : i / (2 - (2 * t - i)) : 0, this.l = (2 * t - i) / 2;
  }
}
var _ = globalThis.document !== undefined ? globalThis.document.createElement("span") : undefined;

class a {
  r;
  g;
  b;
  a;
  static fromVar(n, e = document.body) {
    return a.fromCss(Mn(n, e));
  }
  static fromCss(n) {
    let e = n;
    if (_ instanceof HTMLSpanElement)
      _.style.color = "black", _.style.color = n, document.body.appendChild(_), e = getComputedStyle(_).color, _.remove();
    let [o, t, i, s] = e.match(/[\d.]+/g), r = e.startsWith("color(srgb") ? 255 : 1;
    return new a(Number(o) * r, Number(t) * r, Number(i) * r, s == null ? 1 : Number(s));
  }
  static fromHsl(n, e, o, t = 1) {
    return a.fromCss(`hsl(${n.toFixed(0)}deg ${(e * 100).toFixed(0)}% ${(o * 100).toFixed(0)}% / ${(t * 100).toFixed(0)}%)`);
  }
  static black = new a(0, 0, 0);
  static white = new a(255, 255, 255);
  constructor(n, e, o, t = 1) {
    this.r = b(0, n, 255), this.g = b(0, e, 255), this.b = b(0, o, 255), this.a = t !== undefined ? b(0, t, 1) : t = 1;
  }
  get inverse() {
    return new a(255 - this.r, 255 - this.g, 255 - this.b, this.a);
  }
  get inverseLuminance() {
    let { h: n, s: e, l: o } = this._hsl;
    return a.fromHsl(n, e, 1 - o, this.a);
  }
  contrasting(n = 1) {
    let { h: e, s: o, l: t } = this._hsl;
    return this.blend(this.brightness > 0.5 ? a.black : a.white, n);
  }
  get rgb() {
    let { r: n, g: e, b: o } = this;
    return `rgb(${n.toFixed(0)},${e.toFixed(0)},${o.toFixed(0)})`;
  }
  get rgba() {
    let { r: n, g: e, b: o, a: t } = this;
    return `rgba(${n.toFixed(0)},${e.toFixed(0)},${o.toFixed(0)},${t.toFixed(2)})`;
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
      this.hslCached = new de(this.r, this.g, this.b);
    return this.hslCached;
  }
  get hsl() {
    let { h: n, s: e, l: o } = this._hsl;
    return `hsl(${n.toFixed(0)}deg ${(e * 100).toFixed(0)}% ${(o * 100).toFixed(0)}%)`;
  }
  get hsla() {
    let { h: n, s: e, l: o } = this._hsl;
    return `hsl(${n.toFixed(0)}deg ${(e * 100).toFixed(0)}% ${(o * 100).toFixed(0)}% / ${(this.a * 100).toFixed(0)}%)`;
  }
  get mono() {
    let n = this.brightness * 255;
    return new a(n, n, n);
  }
  get brightness() {
    return Pe(this.r, this.g, this.b);
  }
  get html() {
    return this.toString();
  }
  toString() {
    return this.a === 1 ? "#" + $(this.r) + $(this.g) + $(this.b) : "#" + $(this.r) + $(this.g) + $(this.b) + $(Math.floor(255 * this.a));
  }
  brighten(n) {
    let { h: e, s: o, l: t } = this._hsl, i = b(0, t + n * (1 - t), 1);
    return a.fromHsl(e, o, i, this.a);
  }
  darken(n) {
    let { h: e, s: o, l: t } = this._hsl, i = b(0, t * (1 - n), 1);
    return a.fromHsl(e, o, i, this.a);
  }
  saturate(n) {
    let { h: e, s: o, l: t } = this._hsl, i = b(0, o + n * (1 - o), 1);
    return a.fromHsl(e, i, t, this.a);
  }
  desaturate(n) {
    let { h: e, s: o, l: t } = this._hsl, i = b(0, o * (1 - n), 1);
    return a.fromHsl(e, i, t, this.a);
  }
  rotate(n) {
    let { h: e, s: o, l: t } = this._hsl, i = (e + 360 + n) % 360;
    return a.fromHsl(i, o, t, this.a);
  }
  opacity(n) {
    let { h: e, s: o, l: t } = this._hsl;
    return a.fromHsl(e, o, t, n);
  }
  swatch() {
    return console.log(`%c      %c ${this.html}, ${this.rgba}`, `background-color: ${this.html}`, "background-color: transparent"), this;
  }
  blend(n, e) {
    return new a(k(this.r, n.r, e), k(this.g, n.g, e), k(this.b, n.b, e), k(this.a, n.a, e));
  }
  static blendHue(n, e, o) {
    let t = (e - n + 720) % 360;
    if (t < 180)
      return n + o * t;
    else
      return n - (360 - t) * o;
  }
  mix(n, e) {
    let o = this._hsl, t = n._hsl;
    return a.fromHsl(o.s === 0 ? t.h : t.s === 0 ? o.h : a.blendHue(o.h, t.h, e), k(o.s, t.s, e), k(o.l, t.l, e), k(this.a, n.a, e));
  }
  colorMix(n, e) {
    return a.fromCss(`color-mix(in hsl, ${this.html}, ${n.html} ${(e * 100).toFixed(0)}%)`);
  }
}
function g(n) {
  return n.replace(/[A-Z]/g, (e) => {
    return `-${e.toLocaleLowerCase()}`;
  });
}
function fe(n) {
  return n.replace(/-([a-z])/g, (e, o) => {
    return o.toLocaleUpperCase();
  });
}
var je = "http://www.w3.org/1998/Math/MathML";
var We = "http://www.w3.org/2000/svg";
var rn = {};
var ue = (n, e, o) => {
  let t = Bn(g(e), o);
  if (t.prop.startsWith("--"))
    n.style.setProperty(t.prop, t.value);
  else
    n.style[e] = t.value;
};
var Ie = (n) => {
  return { toDOM(e, o) {
    ue(e, n, o);
  } };
};
var pe = (n, e, o) => {
  if (e === "style")
    if (typeof o === "object")
      for (let t of Object.keys(o))
        if (C(o[t]))
          h(n, o[t], Ie(t));
        else
          ue(n, t, o[t]);
    else
      n.setAttribute("style", o);
  else if (n[e] !== undefined) {
    let { MathMLElement: t } = globalThis;
    if (n instanceof SVGElement || t !== undefined && n instanceof t)
      n.setAttribute(e, o);
    else
      n[e] = o;
  } else {
    let t = g(e);
    if (t === "class")
      o.split(" ").forEach((i) => {
        n.classList.add(i);
      });
    else if (n[t] !== undefined)
      n[t] = o;
    else if (typeof o === "boolean")
      o ? n.setAttribute(t, "") : n.removeAttribute(t);
    else
      n.setAttribute(t, o);
  }
};
var Ye = (n) => {
  return { toDOM(e, o) {
    pe(e, n, o);
  } };
};
var _e = (n, e, o) => {
  if (e === "apply")
    o(n);
  else if (e.match(/^on[A-Z]/) != null) {
    let t = e.substring(2).toLowerCase();
    z(n, t, o);
  } else if (e === "bind")
    if ((typeof o.binding === "string" ? tn[o.binding] : o.binding) !== undefined && o.value !== undefined)
      h(n, o.value, o.binding instanceof Function ? { toDOM: o.binding } : o.binding);
    else
      throw new Error("bad binding");
  else if (e.match(/^bind[A-Z]/) != null) {
    let t = e.substring(4, 5).toLowerCase() + e.substring(5), i = tn[t];
    if (i !== undefined)
      h(n, o, i);
    else
      throw new Error(`${e} is not allowed, bindings.${t} is not defined`);
  } else if (C(o))
    h(n, o, Ye(e));
  else
    pe(n, e, o);
};
var Dn = (n, ...e) => {
  if (rn[n] === undefined) {
    let [i, s] = n.split("|");
    if (s === undefined)
      rn[n] = globalThis.document.createElement(i);
    else
      rn[n] = globalThis.document.createElementNS(s, i);
  }
  let o = rn[n].cloneNode(), t = {};
  for (let i of e)
    if (i instanceof Element || i instanceof DocumentFragment || typeof i === "string" || typeof i === "number")
      if (o instanceof HTMLTemplateElement)
        o.content.append(i);
      else
        o.append(i);
    else if (i.xinPath)
      o.append(p.span({ bindText: i }));
    else
      Object.assign(t, i);
  for (let i of Object.keys(t)) {
    let s = t[i];
    _e(o, i, s);
  }
  return o;
};
var Fn = (...n) => {
  let e = globalThis.document.createDocumentFragment();
  for (let o of n)
    e.append(o);
  return e;
};
var p = new Proxy({ fragment: Fn }, { get(n, e) {
  if (e = e.replace(/[A-Z]/g, (o) => `-${o.toLocaleLowerCase()}`), n[e] === undefined)
    n[e] = (...o) => Dn(e, ...o);
  return n[e];
}, set() {
  throw new Error("You may not add new properties to elements");
} });
var Ln = new Proxy({ fragment: Fn }, { get(n, e) {
  if (n[e] === undefined)
    n[e] = (...o) => Dn(`${e}|${We}`, ...o);
  return n[e];
}, set() {
  throw new Error("You may not add new properties to elements");
} });
var On = new Proxy({ fragment: Fn }, { get(n, e) {
  if (n[e] === undefined)
    n[e] = (...o) => Dn(`${e}|${je}`, ...o);
  return n[e];
}, set() {
  throw new Error("You may not add new properties to elements");
} });
function Ve(n, e) {
  let o = p.style(V(e));
  o.id = n, document.head.append(o);
}
var qe = ["animation-iteration-count", "flex", "flex-base", "flex-grow", "flex-shrink", "opacity", "order", "tab-size", "widows", "z-index", "zoom"];
var Bn = (n, e) => {
  if (typeof e === "number" && !qe.includes(n))
    e = `${e}px`;
  if (n.startsWith("_"))
    if (n.startsWith("__"))
      n = "--" + n.substring(2), e = `var(${n}-default, ${e})`;
    else
      n = "--" + n.substring(1);
  return { prop: n, value: String(e) };
};
var Je = (n, e, o) => {
  if (o === undefined)
    return "";
  if (o instanceof a)
    o = o.html;
  let t = Bn(e, o);
  return `${n}  ${t.prop}: ${t.value};`;
};
var ye = (n, e, o = "") => {
  let t = g(n);
  if (typeof e === "object" && !(e instanceof a)) {
    let i = Object.keys(e).map((s) => ye(s, e[s], `${o}  `)).join(`
`);
    return `${o}  ${n} {
${i}
${o}  }`;
  } else
    return Je(o, t, e);
};
var V = (n, e = "") => {
  return Object.keys(n).map((t) => {
    let i = n[t];
    if (typeof i === "string") {
      if (t === "@import")
        return `@import url('${i}');`;
      throw new Error("top-level string value only allowed for `@import`");
    }
    let s = Object.keys(i).map((r) => ye(r, i[r])).join(`
`);
    return `${e}${t} {
${s}
}`;
  }).join(`

`);
};
var Ue = (n) => {
  console.warn("initVars is deprecated. Just use _ and __ prefixes instead.");
  let e = {};
  for (let o of Object.keys(n)) {
    let t = n[o], i = g(o);
    e[`--${i}`] = typeof t === "number" && t !== 0 ? String(t) + "px" : t;
  }
  return e;
};
var Ge = (n) => {
  let e = {};
  for (let o of Object.keys(n)) {
    let t = n[o];
    if (t instanceof a)
      e[o] = t.inverseLuminance;
    else if (typeof t === "string" && t.match(/^(#[0-9a-fA-F]{3}|rgba?\(|hsla?\()/))
      e[o] = a.fromCss(t).inverseLuminance;
  }
  return e;
};
var sn = new Proxy({}, { get(n, e) {
  if (n[e] === undefined) {
    let o = "--" + g(e);
    n[e] = (t) => `var(${o}, ${t})`;
  }
  return n[e];
} });
var Hn = new Proxy({}, { get(n, e) {
  if (e === "default")
    return sn;
  if (n[e] == null) {
    e = g(e);
    let [, o, , t, i, s] = e.match(/^([-\w]*?)((_)?(\d+)(\w?))?$/) || ["", e], r = `--${o}`;
    if (i != null) {
      let c = t == null ? Number(i) / 100 : -Number(i) / 100;
      switch (s) {
        case "b":
          {
            let l = a.fromVar(r);
            n[e] = c > 0 ? l.brighten(c).rgba : l.darken(-c).rgba;
          }
          break;
        case "s":
          {
            let l = a.fromVar(r);
            n[e] = c > 0 ? l.saturate(c).rgba : l.desaturate(-c).rgba;
          }
          break;
        case "h":
          {
            let l = a.fromVar(r);
            n[e] = l.rotate(c * 100).rgba;
          }
          break;
        case "o":
          {
            let l = a.fromVar(r);
            n[e] = l.opacity(c).rgba;
          }
          break;
        case "":
          n[e] = `calc(var(${r}) * ${c})`;
          break;
        default:
          throw console.error(s), new Error(`Unrecognized method ${s} for css variable ${r}`);
      }
    } else
      n[e] = `var(${r})`;
  }
  return n[e];
} });
var Ze = 0;
function zn() {
  return `custom-elt${(Ze++).toString(36)}`;
}
var me = 0;
var Q = {};
function Qe(n, e) {
  let o = Q[n], t = V(e).replace(/:host\b/g, n);
  Q[n] = o ? o + `
` + t : t;
}
function Ke(n) {
  if (Q[n])
    document.head.append(p.style({ id: n + "-component" }, Q[n]));
  delete Q[n];
}

class M extends HTMLElement {
  static elements = p;
  static _elementCreator;
  instanceId;
  styleNode;
  static styleSpec;
  static styleNode;
  content = p.slot();
  isSlotted;
  static _tagName = null;
  static get tagName() {
    return this._tagName;
  }
  static StyleNode(n) {
    return console.warn("StyleNode is deprecated, just assign static styleSpec: XinStyleSheet to the class directly"), p.style(V(n));
  }
  static elementCreator(n = {}) {
    if (this._elementCreator == null) {
      let { tag: e, styleSpec: o } = n, t = n != null ? e : null;
      if (t == null)
        if (typeof this.name === "string" && this.name !== "") {
          if (t = g(this.name), t.startsWith("-"))
            t = t.slice(1);
        } else
          t = zn();
      if (customElements.get(t) != null)
        console.warn(`${t} is already defined`);
      if (t.match(/\w+(-\w+)+/) == null)
        console.warn(`${t} is not a legal tag for a custom-element`), t = zn();
      while (customElements.get(t) !== undefined)
        t = zn();
      if (this._tagName = t, o !== undefined)
        Qe(t, o);
      window.customElements.define(t, this, n), this._elementCreator = p[t];
    }
    return this._elementCreator;
  }
  initAttributes(...n) {
    let e = {}, o = {};
    new MutationObserver((i) => {
      let s = false;
      if (i.forEach((r) => {
        s = !!(r.attributeName && n.includes(fe(r.attributeName)));
      }), s && this.queueRender !== undefined)
        this.queueRender(false);
    }).observe(this, { attributes: true }), n.forEach((i) => {
      e[i] = T(this[i]);
      let s = g(i);
      Object.defineProperty(this, i, { enumerable: false, get() {
        if (typeof e[i] === "boolean")
          return this.hasAttribute(s);
        else if (this.hasAttribute(s))
          return typeof e[i] === "number" ? parseFloat(this.getAttribute(s)) : this.getAttribute(s);
        else if (o[i] !== undefined)
          return o[i];
        else
          return e[i];
      }, set(r) {
        if (typeof e[i] === "boolean") {
          if (r !== this[i]) {
            if (r)
              this.setAttribute(s, "");
            else
              this.removeAttribute(s);
            this.queueRender();
          }
        } else if (typeof e[i] === "number") {
          if (r !== parseFloat(this[i]))
            this.setAttribute(s, r), this.queueRender();
        } else if (typeof r === "object" || `${r}` !== `${this[i]}`) {
          if (r === null || r === undefined || typeof r === "object")
            this.removeAttribute(s);
          else
            this.setAttribute(s, r);
          this.queueRender(), o[i] = r;
        }
      } });
    });
  }
  initValue() {
    let n = Object.getOwnPropertyDescriptor(this, "value");
    if (n === undefined || n.get !== undefined || n.set !== undefined)
      return;
    let e = this.hasAttribute("value") ? this.getAttribute("value") : T(this.value);
    delete this.value, Object.defineProperty(this, "value", { enumerable: false, get() {
      return e;
    }, set(o) {
      if (e !== o)
        e = o, this.queueRender(true);
    } });
  }
  _parts;
  get parts() {
    let n = this.shadowRoot != null ? this.shadowRoot : this;
    if (this._parts == null)
      this._parts = new Proxy({}, { get(e, o) {
        if (e[o] === undefined) {
          let t = n.querySelector(`[part="${o}"]`);
          if (t == null)
            t = n.querySelector(o);
          if (t == null)
            throw new Error(`elementRef "${o}" does not exist!`);
          t.removeAttribute("data-ref"), e[o] = t;
        }
        return e[o];
      } });
    return this._parts;
  }
  constructor() {
    super();
    me += 1, this.initAttributes("hidden"), this.instanceId = `${this.tagName.toLocaleLowerCase()}-${me}`, this._value = T(this.defaultValue);
  }
  connectedCallback() {
    if (Ke(this.constructor.tagName), this.hydrate(), this.role != null)
      this.setAttribute("role", this.role);
    if (this.onResize !== undefined) {
      if (G.observe(this), this._onResize == null)
        this._onResize = this.onResize.bind(this);
      this.addEventListener("resize", this._onResize);
    }
    if (this.value != null && this.getAttribute("value") != null)
      this._value = this.getAttribute("value");
    this.queueRender();
  }
  disconnectedCallback() {
    G.unobserve(this);
  }
  _changeQueued = false;
  _renderQueued = false;
  queueRender(n = false) {
    if (!this._hydrated)
      return;
    if (!this._changeQueued)
      this._changeQueued = n;
    if (!this._renderQueued)
      this._renderQueued = true, requestAnimationFrame(() => {
        if (this._changeQueued)
          Sn(this, "change");
        this._changeQueued = false, this._renderQueued = false, this.render();
      });
  }
  _hydrated = false;
  hydrate() {
    if (!this._hydrated) {
      this.initValue();
      let n = typeof this.content !== "function", e = typeof this.content === "function" ? this.content() : this.content, { styleSpec: o } = this.constructor, { styleNode: t } = this.constructor;
      if (o)
        t = this.constructor.styleNode = p.style(V(o)), delete this.constructor.styleNode;
      if (this.styleNode)
        console.warn(this, "styleNode is deprecrated, use static styleNode or statc styleSpec instead"), t = this.styleNode;
      if (t) {
        let i = this.attachShadow({ mode: "open" });
        i.appendChild(t.cloneNode(true)), kn(i, e, n);
      } else if (e !== null) {
        let i = Array.from(this.childNodes);
        kn(this, e, n), this.isSlotted = this.querySelector("slot,xin-slot") !== undefined;
        let s = Array.from(this.querySelectorAll("slot"));
        if (s.length > 0)
          s.forEach($n.replaceSlot);
        if (i.length > 0) {
          let r = { "": this };
          Array.from(this.querySelectorAll("xin-slot")).forEach((c) => {
            r[c.name] = c;
          }), i.forEach((c) => {
            let l = r[""], f = c instanceof Element ? r[c.slot] : l;
            (f !== undefined ? f : l).append(c);
          });
        }
      }
      this._hydrated = true;
    }
  }
  render() {}
}

class $n extends M {
  name = "";
  content = null;
  static replaceSlot(n) {
    let e = document.createElement("xin-slot");
    if (n.name !== "")
      e.setAttribute("name", n.name);
    n.replaceWith(e);
  }
  constructor() {
    super();
    this.initAttributes("name");
  }
}
var at = $n.elementCreator({ tag: "xin-slot" });
var Re = (n = () => true) => {
  let e = localStorage.getItem("xin-state");
  if (e != null) {
    let t = JSON.parse(e);
    for (let i of Object.keys(t).filter(n))
      if (d[i] !== undefined)
        Object.assign(d[i], t[i]);
      else
        d[i] = t[i];
  }
  let o = vn(() => {
    let t = {}, i = x(d);
    for (let s of Object.keys(i).filter(n))
      t[s] = i[s];
    localStorage.setItem("xin-state", JSON.stringify(t)), console.log("xin state saved to localStorage");
  }, 500);
  U(n, o);
};
var An = "1.0.3";
function xe(n) {
  return Object.assign(Y, n), Y;
}
function cn(n) {
  return console.warn("boxedProxy is deprecated, please use tosi() instead"), xe(n);
}
function Pn(n, e = false) {
  if (e)
    return console.warn("xinProxy(..., true) is deprecated; use tosi(...) instead"), cn(n);
  return Object.keys(n).forEach((o) => {
    d[o] = n[o];
  }), d;
}
var Ne = {};
async function ln(n, e) {
  let { type: o, styleSpec: t } = await e(n, { Color: a, Component: M, elements: p, svgElements: Ln, mathML: On, varDefault: sn, vars: Hn, xin: d, boxed: Y, xinProxy: Pn, boxedProxy: cn, makeComponent: ln, bind: h, on: z, version: An }), i = { type: o, creator: o.elementCreator({ tag: n, styleSpec: t }) };
  return Ne[n] = i, i;
}
var jn = {};
var no = (n) => import(n);

class an extends M {
  tag = "anon-elt";
  src = "";
  property = "default";
  loaded;
  blueprintLoaded = (n) => {};
  async packaged() {
    let { tag: n, src: e, property: o } = this, t = `${n}.${o}:${e}`;
    if (!this.loaded) {
      if (jn[t] === undefined)
        jn[t] = no(e).then((i) => {
          let s = i[o];
          return ln(n, s);
        });
      else
        console.log(`using cached ${n}`);
      this.loaded = await jn[t], this.blueprintLoaded(this.loaded);
    }
    return this.loaded;
  }
  constructor() {
    super();
    this.initAttributes("tag", "src", "property");
  }
}
var eo = an.elementCreator({ tag: "xin-blueprint", styleSpec: { ":host": { display: "none" } } });

class Wn extends M {
  allLoaded = () => {};
  constructor() {
    super();
  }
  async load() {
    let e = Array.from(this.querySelectorAll(an.tagName)).filter((o) => o.src).map((o) => o.packaged());
    await Promise.all(e), this.allLoaded();
  }
  connectedCallback() {
    super.connectedCallback(), this.load();
  }
}
var oo = Wn.elementCreator({ tag: "xin-loader", styleSpec: { ":host": { display: "none" } } });

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
  tabSelector: () => tabSelector,
  svgIcon: () => svgIcon,
  svg2DataUrl: () => svg2DataUrl,
  styleSheet: () => styleSheet,
  spacer: () => spacer,
  sizeBreak: () => sizeBreak,
  sideNav: () => sideNav,
  setLocale: () => setLocale,
  scriptTag: () => scriptTag,
  richTextWidgets: () => richTextWidgets,
  richText: () => richText,
  removeLastMenu: () => removeLastMenu,
  postNotification: () => postNotification,
  positionFloat: () => positionFloat,
  popMenu: () => popMenu,
  popFloat: () => popFloat,
  menu: () => menu,
  markdownViewer: () => markdownViewer,
  mapBox: () => mapBox,
  makeSorter: () => makeSorter,
  makeExamplesLive: () => makeExamplesLive,
  localize: () => localize,
  localePicker: () => localePicker,
  liveExample: () => liveExample,
  isBreached: () => isBreached,
  initLocalization: () => initLocalization,
  icons: () => icons,
  i18n: () => i18n,
  gamepadText: () => gamepadText,
  gamepadState: () => gamepadState,
  findHighestZ: () => findHighestZ,
  filterPart: () => filterPart,
  filterBuilder: () => filterBuilder,
  elastic: () => elastic,
  editableRect: () => editableRect,
  dragAndDrop: () => exports_drag_and_drop,
  digest: () => digest,
  defineIcons: () => defineIcons,
  dataTable: () => dataTable,
  createSubMenu: () => createSubMenu,
  createMenuItem: () => createMenuItem,
  createMenuAction: () => createMenuAction,
  commandButton: () => commandButton,
  colorInput: () => colorInput,
  codeEditor: () => codeEditor,
  bringToFront: () => bringToFront,
  bodymovinPlayer: () => bodymovinPlayer,
  blockStyle: () => blockStyle,
  b3d: () => b3d,
  availableFilters: () => availableFilters,
  abTest: () => abTest,
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
  TabSelector: () => TabSelector,
  SvgIcon: () => SvgIcon,
  SizeBreak: () => SizeBreak,
  SideNav: () => SideNav,
  RichText: () => RichText,
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

class AbTest extends M {
  static set conditions(context) {
    Object.assign(abTestConditions, context);
    for (const abTest of [...AbTest.instances]) {
      abTest.queueRender();
    }
  }
  condition = "";
  not = false;
  static instances = new Set;
  constructor() {
    super();
    this.initAttributes("condition", "not");
  }
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
    const scriptElt = p.script({ src });
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
    const linkElement = p.link({
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
  earth: '<svg class="color" viewBox="0 0 48 48"><g><g><path style="fill:#006736;fill-rule:evenodd;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:2;" d="M18.40,4.79 C18.40,4.79,17,9,17,9 C17,9,17,15,17,15 C17,15,15,15,15,15 C15,15,13,11,13,11 C13,11,11,13,11,13 C11,13,11,19,11,19 C11,19,15,19,15,19 C15,19,21,23,21,23 C21,23,27,25,27,25 C27,25,27,29,27,29 C27,29,15.69,42.20,15.69,42.20 C15.46,42.09,15.23,41.98,15,41.87 C15,41.87,15,31,15,31 C15,31,9,29,9,29 C9,29,9,19,9,19 C9,19,7,15,7,15 C7,15,7,13.46,7,13.46 C9.57,9.32,13.62,6.19,18.40,4.79 z"/><path style="fill:#3da8f4;fill-rule:evenodd;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:2;" d="M7,13.46 C5.10,16.52,4,20.13,4,24 C4,31.81,8.47,38.57,15,41.87 C15,41.87,15,31,15,31 C15,31,9,29,9,29 C9,29,9,19,9,19 C9,19,7,15,7,15 C7,15,7,13.46,7,13.46 z"/><path style="fill:#3da8f4;fill-rule:evenodd;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:2;" d="M18.40,4.79 C20.18,4.28,22.06,4,24,4 C27.57,4,30.92,4.93,33.82,6.57 C33.82,6.57,29,13,29,13 C29,13,31,19,31,19 C31,19,37,21,37,21 C37,21,39,29,39,29 C39,29,37.35,38.89,37.35,38.89 C33.81,42.07,29.13,44,24,44 C21.03,44,18.22,43.35,15.69,42.20 C15.69,42.20,27,29,27,29 C27,29,27,25,27,25 C27,25,21,23,21,23 C21,23,15,19,15,19 C15,19,11,19,11,19 C11,19,11,13,11,13 C11,13,13,11,13,11 C13,11,15,15,15,15 C15,15,17,15,17,15 C17,15,17,9,17,9 C17,9,18.40,4.79,18.40,4.79 z"/><path style="fill:#006736;fill-rule:evenodd;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:2;" d="M33.82,6.57 C33.82,6.57,29,13,29,13 C29,13,31,19,31,19 C31,19,37,21,37,21 C37,21,39,29,39,29 C39,29,37.35,38.89,37.35,38.89 C41.43,35.23,44,29.91,44,24 C44,16.52,39.90,10.00,33.82,6.57 z"/></g></g></svg> ',
  blueprint: '<svg class="color" viewBox="0 0 24 24"><g><path style="fill:#9e9e9e;fill-rule:nonzero;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:1;" d="M10.5,14.5 C10.5,14.5,7.5,15.5,7.5,17.5 C7.5,19.5,10.5,19.5,10.5,19.5"/><path style="fill:#9e9e9e;fill-rule:nonzero;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:1;" d="M18.50,14.5 C18.50,14.5,21.50,15.5,21.50,17.5 C21.50,19.5,18.50,19.5,18.50,19.5"/><path style="fill:#ffffff;fill-rule:evenodd;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:1;" d="M7,5.09 C7,3.94,7.90,3,9,3 C9,3,20,3,20,3 C21.10,3,22,3.94,22,5.09 C22,5.09,22,12.41,22,12.41 C22,13.56,21.10,14.5,20,14.5 C20,14.5,9,14.5,9,14.5 C7.90,14.5,7,13.56,7,12.41 C7,12.41,7,5.09,7,5.09 z"/><path style="fill:#ffffff;fill-rule:nonzero;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:1;" d="M14.5,5.5 C14.5,5.5,14.5,11.5,14.5,11.5"/><path style="fill:#ffffff;fill-rule:nonzero;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:1;" d="M16.5,7.5 C16.5,7.5,16.5,8.5,16.5,8.5"/><path style="fill:#ffffff;fill-rule:nonzero;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:1;" d="M12.5,7.5 C12.5,7.5,12.5,8.5,12.5,8.5"/><g/><path style="fill:none;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:1;" d="M18.5,21.5 C18.5,21.5,17.5,20.5,17.5,20.5 C17.5,20.5,16.5,21.5,16.5,21.5"/><path style="fill:none;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:1;" d="M12.5,21.5 C12.5,21.5,11.5,20.5,11.5,20.5 C11.5,20.5,10.5,21.5,10.5,21.5"/><path style="fill:#e4e4e4;fill-rule:evenodd;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:1;" d="M10.5,14.5 C10.5,14.5,18.5,14.5,18.5,14.5 C18.5,14.5,18.5,19.5,18.5,19.5 C18.5,19.5,10.5,19.5,10.5,19.5 C10.5,19.5,10.5,14.5,10.5,14.5 z"/><g><g><path style="fill:#5e78ca;fill-rule:nonzero;stroke:#f2f2f2;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:1;" d="M14,16.5 C14,16.5,16,16.5,16,16.5 C16,16.5,14.53,19.5,14.53,19.5"/><path style="fill:#5e78ca;fill-rule:evenodd;stroke:none;" d="M3.59,8.5 C3.59,8.5,12.59,8.5,12.59,8.5 C12.59,8.5,14.53,19.5,14.53,19.5 C14.53,19.5,5.53,19.5,5.53,19.5 C5.53,19.5,3.59,8.5,3.59,8.5 z"/><path style="fill:#5e78ca;fill-rule:nonzero;stroke:#f2f2f2;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:1;" d="M12.59,8.5 C12.59,8.5,11.12,11.5,11.12,11.5 C11.12,11.5,2.12,11.5,2.12,11.5 C2.12,11.5,3.59,8.5,3.59,8.5"/><path style="fill:#5e78ca;fill-rule:nonzero;stroke:#f2f2f2;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:1;" d="M12.59,8.5 C12.59,8.5,14.53,19.5,14.53,19.5"/><path style="fill:#5e78ca;fill-rule:nonzero;stroke:#f2f2f2;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:1;" d="M4.12,11.5 C4.12,11.5,5.53,19.5,5.53,19.5"/></g><path style="fill:#9e9e9e;fill-rule:nonzero;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:1;" d="M9.24,12.5 C10.75,12.5,12.20,13.73,12.46,15.24 C12.46,15.24,12.46,15.24,12.46,15.24 C12.68,16.49,11.85,17.5,10.60,17.5 C10.60,17.5,10.55,17.5,10.55,17.5 C10.17,17.5,9.92,17.81,9.98,18.19 C9.98,18.19,9.98,18.19,9.98,18.19 C10.21,19.47,9.36,20.5,8.08,20.5 C8.08,20.5,6.39,20.5,6.39,20.5 C5.10,20.5,3.87,19.45,3.64,18.16 C3.64,18.16,3.12,15.21,3.12,15.21 C2.86,13.71,3.86,12.5,5.35,12.5 C5.35,12.5,9.24,12.5,9.24,12.5 z"/></g></g></svg> ',
  tosiXr: '<svg class="color" viewBox="0 0 24 24"><g><path style="fill:#9e9e9e;fill-rule:nonzero;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:1;" d="M8.00,14.25 C8.00,14.25,5.00,15.25,5.00,17.25 C5.00,19.25,8.00,19.25,8.00,19.25"/><path style="fill:#9e9e9e;fill-rule:nonzero;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:1;" d="M16.00,14.25 C16.00,14.25,19.00,15.25,19.00,17.25 C19.00,19.25,16.00,19.25,16.00,19.25"/><path style="fill:#ffffff;fill-rule:evenodd;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:1;" d="M4.50,4.85 C4.50,3.69,5.40,2.75,6.50,2.75 C6.50,2.75,17.50,2.75,17.50,2.75 C18.61,2.75,19.50,3.69,19.50,4.85 C19.50,4.85,19.50,12.16,19.50,12.16 C19.50,13.32,18.61,14.25,17.50,14.25 C17.50,14.25,6.50,14.25,6.50,14.25 C5.40,14.25,4.50,13.32,4.50,12.16 C4.50,12.16,4.50,4.85,4.50,4.85 z"/><path style="fill:#ffffff;fill-rule:nonzero;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:1;" d="M12.00,5.25 C12.00,5.25,12.00,11.25,12.00,11.25"/><path style="fill:#ffffff;fill-rule:nonzero;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:1;" d="M14.00,7.25 C14.00,7.25,14.00,8.25,14.00,8.25"/><path style="fill:#ffffff;fill-rule:nonzero;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:1;" d="M10.00,7.25 C10.00,7.25,10.00,8.25,10.00,8.25"/><path style="fill:none;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:1;" d="M16.00,21.25 C16.00,21.25,15.00,20.25,15.00,20.25 C15.00,20.25,14.00,21.25,14.00,21.25"/><path style="fill:none;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:1;" d="M10.00,21.25 C10.00,21.25,9.00,20.25,9.00,20.25 C9.00,20.25,8.00,21.25,8.00,21.25"/><path style="fill:#e4e4e4;fill-rule:evenodd;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:1;" d="M8.00,14.25 C8.00,14.25,16.00,14.25,16.00,14.25 C16.00,14.25,16.00,19.25,16.00,19.25 C16.00,19.25,8.00,19.25,8.00,19.25 C8.00,19.25,8.00,14.25,8.00,14.25 z"/><path style="fill:#ff7bac;fill-opacity:0.75;fill-rule:evenodd;stroke:#000000;stroke-linecap:butt;stroke-linejoin:miter;stroke-miterlimit:10;stroke-width:1;" d="M12.00,4.00 C12.00,4,11.99,4,11.99,4 C6.19,4,3,4.73,3,8.50 C3,11.39,4.66,13.00,7.27,13 C9.88,13.00,10.68,11.13,11.99,11.13 C11.99,11.13,12.00,11.13,12,11.13 C12.00,11.13,12.01,11.13,12.01,11.13 C13.32,11.13,14.12,13.00,16.73,13 C19.34,13.00,21,11.39,21,8.50 C21,4.73,17.81,4,12.01,4 C12.01,4,12.00,4,12.00,4.00 C12.00,4.00,12.00,4.00,12.00,4.00 z"/></g></svg> ',
  cmy: '<svg class="color filled" viewBox="0 0 24 24"><g><g><path style="fill:#00ff00;fill-rule:evenodd;" d="M12.00,10.88 C10.90,10.01,9.51,9.5,8.00,9.5 C7.22,9.5,6.47,9.64,5.78,9.89 C6.37,11.85,7.87,13.42,9.78,14.11 C10.17,12.81,10.96,11.69,12.00,10.88 z"/><path style="fill:#0000ff;fill-rule:evenodd;" d="M12.00,10.88 C13.10,10.01,14.49,9.5,16,9.5 C16.78,9.5,17.53,9.64,18.22,9.89 C17.63,11.85,16.13,13.42,14.22,14.11 C13.83,12.81,13.04,11.69,12.00,10.88 C12.00,10.88,12.00,10.88,12.00,10.88 z"/><path style="fill:#000000;fill-rule:evenodd;" d="M9.78,14.11 C10.17,12.81,10.96,11.69,12.00,10.88 C13.04,11.69,13.83,12.81,14.22,14.11 C13.53,14.36,12.78,14.5,12,14.5 C11.22,14.5,10.47,14.36,9.78,14.11 C9.78,14.11,9.78,14.11,9.78,14.11 z"/><path style="fill:#ff0000;fill-rule:evenodd;" d="M9.78,14.11 C9.60,14.71,9.5,15.34,9.5,16 C9.5,18.08,10.48,19.93,12.00,21.12 C13.52,19.93,14.50,18.08,14.50,16 C14.50,15.34,14.40,14.71,14.22,14.11 C13.53,14.36,12.78,14.5,12,14.5 C11.22,14.5,10.47,14.36,9.78,14.11 C9.78,14.11,9.78,14.11,9.78,14.11 z"/><path style="fill:#02fefe;fill-rule:evenodd;" d="M5.78,9.89 C5.60,9.29,5.5,8.66,5.5,8 C5.5,4.41,8.41,1.5,12,1.5 C15.59,1.5,18.5,4.41,18.5,8 C18.5,8.66,18.40,9.29,18.22,9.89 C17.53,9.64,16.78,9.5,16,9.5 C14.49,9.5,13.10,10.01,12.00,10.88 C10.90,10.01,9.51,9.5,8.00,9.5 C7.22,9.5,6.47,9.64,5.78,9.89 C5.78,9.89,5.78,9.89,5.78,9.89 z"/><path style="fill:#fffe00;fill-rule:evenodd;" d="M5.78,9.89 C3.28,10.80,1.50,13.19,1.50,16 C1.50,19.59,4.41,22.5,8.00,22.5 C9.51,22.5,10.90,21.99,12.00,21.12 C10.48,19.93,9.5,18.08,9.5,16 C9.5,15.34,9.60,14.71,9.78,14.11 C7.87,13.42,6.37,11.85,5.78,9.89 C5.78,9.89,5.78,9.89,5.78,9.89 z"/><path style="fill:#ff00ff;fill-rule:evenodd;" d="M18.22,9.89 C20.72,10.80,22.5,13.19,22.5,16 C22.5,19.59,19.59,22.5,16,22.5 C14.49,22.5,13.10,21.99,12.00,21.12 C13.52,19.93,14.50,18.08,14.50,16 C14.50,15.34,14.40,14.71,14.22,14.11 C16.13,13.42,17.63,11.85,18.22,9.89 z"/></g></g></svg> ',
  rgb: '<svg class="color filled" viewBox="0 0 24 24"><g><g><path style="fill:#ff00ff;fill-rule:evenodd;" d="M12.00,10.88 C10.90,10.01,9.51,9.5,8.00,9.5 C7.22,9.5,6.47,9.64,5.78,9.89 C6.37,11.85,7.87,13.42,9.78,14.11 C10.17,12.81,10.96,11.69,12.00,10.88 z"/><path style="fill:#ffff00;fill-rule:evenodd;" d="M12.00,10.88 C13.10,10.01,14.49,9.5,16,9.5 C16.78,9.5,17.53,9.64,18.22,9.89 C17.63,11.85,16.13,13.42,14.22,14.11 C13.83,12.81,13.04,11.69,12.00,10.88 C12.00,10.88,12.00,10.88,12.00,10.88 z"/><path style="fill:#ffffff;fill-rule:evenodd;" d="M9.78,14.11 C10.17,12.81,10.96,11.69,12.00,10.88 C13.04,11.69,13.83,12.81,14.22,14.11 C13.53,14.36,12.78,14.5,12,14.5 C11.22,14.5,10.47,14.36,9.78,14.11 C9.78,14.11,9.78,14.11,9.78,14.11 z"/><path style="fill:#00ffff;fill-rule:evenodd;" d="M9.78,14.11 C9.60,14.71,9.5,15.34,9.5,16 C9.5,18.08,10.48,19.93,12.00,21.12 C13.52,19.93,14.50,18.08,14.50,16 C14.50,15.34,14.40,14.71,14.22,14.11 C13.53,14.36,12.78,14.5,12,14.5 C11.22,14.5,10.47,14.36,9.78,14.11 C9.78,14.11,9.78,14.11,9.78,14.11 z"/><path style="fill:#ff0000;fill-rule:evenodd;" d="M5.78,9.89 C5.60,9.29,5.5,8.66,5.5,8 C5.5,4.41,8.41,1.5,12,1.5 C15.59,1.5,18.5,4.41,18.5,8 C18.5,8.66,18.40,9.29,18.22,9.89 C17.53,9.64,16.78,9.5,16,9.5 C14.49,9.5,13.10,10.01,12.00,10.88 C10.90,10.01,9.51,9.5,8.00,9.5 C7.22,9.5,6.47,9.64,5.78,9.89 C5.78,9.89,5.78,9.89,5.78,9.89 z"/><path style="fill:#0000ff;fill-rule:evenodd;" d="M5.78,9.89 C3.28,10.80,1.50,13.19,1.50,16 C1.50,19.59,4.41,22.5,8.00,22.5 C9.51,22.5,10.90,21.99,12.00,21.12 C10.48,19.93,9.5,18.08,9.5,16 C9.5,15.34,9.60,14.71,9.78,14.11 C7.87,13.42,6.37,11.85,5.78,9.89 C5.78,9.89,5.78,9.89,5.78,9.89 z"/><path style="fill:#00ff00;fill-rule:evenodd;" d="M18.22,9.89 C20.72,10.80,22.5,13.19,22.5,16 C22.5,19.59,19.59,22.5,16,22.5 C14.49,22.5,13.10,21.99,12.00,21.12 C13.52,19.93,14.50,18.08,14.50,16 C14.50,15.34,14.40,14.71,14.22,14.11 C16.13,13.42,17.63,11.85,18.22,9.89 z"/></g></g></svg> ',
  xrColor: '<svg class="color filled" viewBox="0 0 40 24"><g><g><g><path style="fill:#000000;fill-rule:evenodd;" d="M20.00,2.00 C19.99,2.00,19.98,2,19.98,2 C8.39,2,2,3.61,2,12.00 C2,18.41,5.32,22.00,10.54,22 C15.77,22.00,17.37,17.85,19.98,17.85 C19.98,17.85,19.99,17.85,20,17.85 C20.01,17.85,20.02,17.85,20.02,17.85 C22.63,17.85,24.23,22.00,29.46,22 C34.68,22.00,38,18.41,38,12.00 C38,3.61,31.61,2,20.02,2 C20.02,2,20.01,2.00,20.00,2.00 C20.00,2.00,20.00,2.00,20.00,2.00 z"/></g><path style="fill:#fbed21;fill-rule:evenodd;" d="M12.20,19.84 C15.79,19.39,17.07,16.46,19.07,16.46 C19.07,16.46,19.08,16.46,19.09,16.46 C19.09,16.46,19.10,16.46,19.11,16.46 C19.44,16.46,19.75,16.54,20.06,16.68 C20.37,16.54,20.68,16.46,21.01,16.46 C21.02,16.46,21.02,16.46,21.03,16.46 C21.04,16.46,21.04,16.46,21.05,16.46 C23.05,16.46,24.33,19.39,27.92,19.84 C31.66,19.40,33.98,16.50,33.98,11.62 C33.98,4.91,29.04,3.44,20.06,3.35 C11.07,3.44,6.14,4.91,6.14,11.62 C6.14,16.50,8.46,19.40,12.20,19.84 z"/><path style="fill:#8cc63f;fill-rule:evenodd;" d="M12.20,19.84 C12.52,19.87,12.86,19.89,13.21,19.89 C16.86,19.89,18.37,17.43,20.06,16.68 C19.75,16.54,19.44,16.46,19.11,16.46 C19.10,16.46,19.09,16.46,19.09,16.46 C19.08,16.46,19.07,16.46,19.07,16.46 C17.07,16.46,15.79,19.39,12.20,19.84 z"/><path style="fill:#8cc63f;fill-rule:evenodd;" d="M20.06,3.35 C20.37,3.35,20.69,3.35,21.01,3.35 C21.02,3.35,21.02,3.35,21.03,3.35 C21.03,3.35,21.03,3.35,21.03,3.35 C21.04,3.35,21.04,3.35,21.05,3.35 C30.64,3.35,35.92,4.68,35.92,11.62 C35.92,16.92,33.18,19.89,28.86,19.89 C28.53,19.89,28.22,19.87,27.92,19.84 C31.66,19.40,33.98,16.50,33.98,11.62 C33.98,4.91,29.04,3.44,20.06,3.35 C20.06,3.35,20.06,3.35,20.06,3.35 z"/><path style="fill:#ff1c23;fill-rule:evenodd;" d="M20.06,16.68 C21.74,17.43,23.25,19.89,26.91,19.89 C27.26,19.89,27.59,19.87,27.92,19.84 C24.33,19.39,23.05,16.46,21.05,16.46 C21.04,16.46,21.04,16.46,21.03,16.46 C21.02,16.46,21.02,16.46,21.01,16.46 C20.68,16.46,20.37,16.54,20.06,16.68 z"/><path style="fill:#ff1c23;fill-rule:evenodd;" d="M12.20,19.84 C11.90,19.87,11.59,19.89,11.26,19.89 C6.94,19.89,4.19,16.92,4.19,11.62 C4.19,4.68,9.48,3.35,19.07,3.35 C19.07,3.35,19.08,3.35,19.09,3.35 C19.09,3.35,19.09,3.35,19.09,3.35 C19.09,3.35,19.1,3.35,19.11,3.35 C19.43,3.35,19.75,3.35,20.06,3.35 C11.07,3.44,6.14,4.91,6.14,11.62 C6.14,16.50,8.46,19.40,12.20,19.84 z"/></g><g><path style="fill:#8cc63e;fill-rule:nonzero;" d="M22.55,8.63 C22.55,9.05,22.55,9.46,22.55,9.88 C22.54,10.25,22.85,10.56,23.20,10.55 C23.54,10.56,23.85,10.25,23.85,9.88 C23.85,9.46,23.85,9.05,23.85,8.63 C23.85,8.26,23.54,7.95,23.20,7.96 C22.85,7.95,22.54,8.26,22.55,8.63 z"/><path style="fill:#8cc63e;fill-rule:nonzero;" d="M17.32,8.63 C17.32,9.05,17.32,9.46,17.32,9.88 C17.31,10.25,17.62,10.56,17.97,10.55 C18.31,10.56,18.62,10.25,18.62,9.88 C18.62,9.46,18.62,9.05,18.62,8.63 C18.62,8.26,18.31,7.95,17.97,7.96 C17.62,7.95,17.31,8.26,17.32,8.63 z"/><path style="fill:#8cc63e;fill-rule:nonzero;" d="M19.99,4.39 C19.99,8.09,19.99,11.80,19.99,15.50 C19.99,15.87,20.30,16.18,20.64,16.17 C20.99,16.18,21.30,15.87,21.29,15.50 C21.29,11.80,21.29,8.09,21.29,4.39 C21.30,4.02,20.99,3.71,20.64,3.72 C20.30,3.71,19.99,4.02,19.99,4.39 z"/><path style="fill:#fe1a22;fill-rule:nonzero;" d="M21.43,8.63 C21.43,9.05,21.43,9.46,21.43,9.88 C21.42,10.25,21.73,10.56,22.08,10.55 C22.42,10.56,22.73,10.25,22.73,9.88 C22.73,9.46,22.73,9.05,22.73,8.63 C22.73,8.26,22.42,7.95,22.08,7.96 C21.73,7.95,21.42,8.26,21.43,8.63 z"/><path style="fill:#fe1a22;fill-rule:nonzero;" d="M16.20,8.63 C16.20,9.05,16.20,9.46,16.20,9.88 C16.19,10.25,16.50,10.56,16.85,10.55 C17.19,10.56,17.50,10.25,17.50,9.88 C17.50,9.46,17.50,9.05,17.50,8.63 C17.50,8.26,17.19,7.95,16.85,7.96 C16.50,7.95,16.19,8.26,16.20,8.63 z"/><path style="fill:#fe1a22;fill-rule:nonzero;" d="M18.87,4.39 C18.87,8.09,18.87,11.80,18.87,15.50 C18.87,15.87,19.18,16.18,19.52,16.17 C19.86,16.18,20.18,15.87,20.17,15.50 C20.17,11.80,20.17,8.09,20.17,4.39 C20.18,4.02,19.86,3.71,19.52,3.72 C19.18,3.71,18.87,4.02,18.87,4.39 z"/><path style="fill:#000000;fill-rule:nonzero;" d="M21.97,8.63 C21.97,9.05,21.97,9.46,21.97,9.88 C21.97,10.25,22.28,10.56,22.62,10.55 C22.97,10.56,23.28,10.25,23.27,9.88 C23.27,9.46,23.27,9.05,23.27,8.63 C23.28,8.26,22.97,7.95,22.62,7.96 C22.28,7.95,21.97,8.26,21.97,8.63 z"/><path style="fill:#000000;fill-rule:nonzero;" d="M16.74,8.63 C16.74,9.05,16.74,9.46,16.74,9.88 C16.74,10.25,17.05,10.56,17.39,10.55 C17.74,10.56,18.05,10.25,18.04,9.88 C18.04,9.46,18.04,9.05,18.04,8.63 C18.05,8.26,17.74,7.95,17.39,7.96 C17.05,7.95,16.74,8.26,16.74,8.63 z"/><path style="fill:#000000;fill-rule:nonzero;" d="M19.41,4.39 C19.41,8.09,19.41,11.80,19.41,15.50 C19.41,15.87,19.72,16.18,20.07,16.17 C20.41,16.18,20.72,15.87,20.72,15.50 C20.72,11.80,20.72,8.09,20.72,4.39 C20.72,4.02,20.41,3.71,20.07,3.72 C19.72,3.71,19.41,4.02,19.41,4.39 z"/></g></g></svg> ',
  tosiUi: '<svg class="color" viewBox="0 0 48 48"><g><g><g><path style="fill:#ffffff;fill-rule:evenodd;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:2;" d="M3,33 C3,31.90,3.90,31,5,31 C5,31,43,31,43,31 C44.10,31,45,31.90,45,33 C45,33,45,43,45,43 C45,44.10,44.10,45,43,45 C43,45,5,45,5,45 C3.90,45,3,44.10,3,43 C3,43,3,33,3,33 z"/><g><path style="fill:#ffffff;fill-rule:evenodd;stroke:#ed247b;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:2;" d="M7,35 C7,35,7,36.34,7,38 C7,39.66,8.34,41,10,41 C11.66,41,13,39.66,13,38 C13,36.34,13,35,13,35"/><path style="fill:#ffffff;fill-rule:nonzero;stroke:#ed247b;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:2;" d="M17,35 C17,35,17,41,17,41"/></g><g><path style="fill:#ed247b;fill-rule:evenodd;stroke:none;" d="M38,33 C40.76,33,43,35.24,43,38 C43,40.76,40.76,43,38,43 C35.24,43,33,40.76,33,38 C33,35.24,35.24,33,38,33 z"/><path style="fill:#ed247b;fill-rule:nonzero;stroke:#ffffff;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:2;" d="M40,36 C40,36,36,40,36,40"/><path style="fill:#ed247b;fill-rule:nonzero;stroke:#ffffff;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:2;" d="M36,36 C36,36,40,40,40,40"/></g></g><g><path style="fill:#9e9e9e;fill-rule:nonzero;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:2;" d="M15.97,21.01 C15.97,21.01,9.97,23.01,9.97,27.01 C9.97,31.01,15.97,31.01,15.97,31.01"/><path style="fill:#9e9e9e;fill-rule:nonzero;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:2;" d="M31.97,21.01 C31.97,21.01,37.97,23.01,37.97,27.01 C37.97,31.01,31.97,31.01,31.97,31.01"/><path style="fill:none;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:2;" d="M31,33 C31,33,29.49,31,29.49,31 C29.49,31,27.97,33,27.97,33"/><path style="fill:none;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:2;" d="M19.97,33 C19.97,33,17.97,31,17.97,31 C17.97,31,15.97,33,15.97,33"/><path style="fill:#e4e4e4;fill-rule:evenodd;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:2;" d="M15.97,21 C15.97,21,31.97,21,31.97,21 C31.97,21,31.97,31,31.97,31 C31.97,31,15.97,31,15.97,31 C15.97,31,15.97,21,15.97,21 z"/><path style="fill:#ffffff;fill-rule:evenodd;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:2;" d="M9,7.18 C9,4.87,10.79,3,13.00,3 C13.00,3,35.02,3,35.02,3 C37.23,3,39.03,4.87,39.03,7.18 C39.03,7.18,39.03,21.82,39.03,21.82 C39.03,24.13,37.23,26,35.02,26 C35.02,26,13.00,26,13.00,26 C10.79,26,9,24.13,9,21.82 C9,21.82,9,7.18,9,7.18 z"/><path style="fill:#ffffff;fill-rule:nonzero;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:2;" d="M24,11 C24,11,24,23,24,23"/><path style="fill:#ffffff;fill-rule:nonzero;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:2;" d="M28,15 C28,15,28,17,28,17"/><path style="fill:#ffffff;fill-rule:nonzero;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:2;" d="M20,15 C20,15,20,17,20,17"/></g></g></g></svg> ',
  tosiFavicon: '<svg class="color" viewBox="0 0 48 48"><g><g><path style="fill:#ed247b;fill-rule:evenodd;stroke:none;" d="M1,9 C1,4.58,4.58,1,9,1 C9,1,39,1,39,1 C43.42,1,47,4.58,47,9 C47,9,47,39,47,39 C47,43.42,43.42,47,39,47 C39,47,9,47,9,47 C4.58,47,1,43.42,1,39 C1,39,1,9,1,9 z"/><g><path style="fill:#9e9e9e;fill-rule:nonzero;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:2;" d="M16,29 C16,29,10,31,10,35 C10,39,16,39,16,39"/><path style="fill:#9e9e9e;fill-rule:nonzero;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:2;" d="M32.00,29 C32.00,29,38.00,31,38.00,35 C38.00,39,32.00,39,32.00,39"/><path style="fill:#ffffff;fill-rule:evenodd;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:2;" d="M9,10.18 C9,7.87,10.79,6,13,6 C13,6,35,6,35,6 C37.21,6,39,7.87,39,10.18 C39,10.18,39,24.82,39,24.82 C39,27.13,37.21,29,35,29 C35,29,13,29,13,29 C10.79,29,9,27.13,9,24.82 C9,24.82,9,10.18,9,10.18 z"/><path style="fill:#ffffff;fill-rule:nonzero;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:2;" d="M24,11 C24,11,24,23,24,23"/><path style="fill:#ffffff;fill-rule:nonzero;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:2;" d="M28,15 C28,15,28,17,28,17"/><path style="fill:#ffffff;fill-rule:nonzero;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:2;" d="M20,15 C20,15,20,17,20,17"/><path style="fill:none;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:2;" d="M32,43 C32,43,30,41,30,41 C30,41,28,43,28,43"/><path style="fill:none;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:2;" d="M20,43 C20,43,18,41,18,41 C18,41,16,43,16,43"/><path style="fill:#e4e4e4;fill-rule:evenodd;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:2;" d="M16,29 C16,29,32,29,32,29 C32,29,32,39,32,39 C32,39,16,39,16,39 C16,39,16,29,16,29 z"/></g></g></g></svg> ',
  tosiPlatform: '<svg class="color" viewBox="0 0 48 48"><g><g><g><path style="fill:#3ea9f5;fill-rule:evenodd;stroke:none;" d="M23.97,47 C23.97,47,39,47,39,47 C43.42,47,47,43.42,47,39 C47,39,47,9,47,9 C47,4.58,43.42,1,39,1 C39,1,9,1,9,1 C4.58,1,1,4.58,1,9 C1,9,1,39,1,39 C1,41.64,2.28,43.98,4.25,45.44 C4.09,44.82,4,44.17,4,43.5 C4,39.36,7.36,36,11.5,36 C15.14,36,18.18,38.60,18.86,42.05 C19.07,42.02,19.28,42,19.5,42 C21.99,42,24,44.01,24,46.5 C24,46.67,23.99,46.84,23.97,47 z"/><path style="fill:#ffffff;fill-rule:evenodd;stroke:none;" d="M4.25,45.44 C4.09,44.82,4,44.17,4,43.5 C4,39.36,7.36,36,11.5,36 C15.14,36,18.18,38.60,18.86,42.05 C19.07,42.02,19.28,42,19.5,42 C21.99,42,24,44.01,24,46.5 C24,46.67,23.99,46.84,23.97,47 C23.97,47,9,47,9,47 C7.22,47,5.58,46.42,4.25,45.44 z"/></g><path style="fill:none;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:2;" d="M35,35 C35,35,32.17,35,32.17,35 C32.17,35,32.17,37.83,32.17,37.83"/><path style="fill:none;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:2;" d="M31,39 C31,39,28.17,39,28.17,39 C28.17,39,28.17,41.83,28.17,41.83"/><path style="fill:#9e9e9e;fill-rule:nonzero;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:2;" d="M7.48,16 C4.45,16,2,18.45,2,21.48 C2,21.48,2,21.48,2,21.48 C2,23.98,4.02,26,6.52,26 C6.52,26,6.62,26,6.62,26 C7.38,26,8,26.62,8,27.38 C8,27.38,8,27.38,8,27.38 C8,29.93,10.07,32,12.62,32 C12.62,32,16,32,16,32 C18.58,32,20.68,29.91,20.68,27.32 C20.68,27.32,20.68,21.42,20.68,21.42 C20.68,18.43,18.25,16,15.26,16 C15.26,16,7.48,16,7.48,16 z"/><path style="fill:#e4e4e4;fill-rule:evenodd;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:2;" d="M17,29 C17,29,33,29,33,29 C33,29,33,29,33,29 C33,34.52,28.52,39,23,39 C23,39,23,39,23,39 C19.69,39,17,36.31,17,33 C17,33,17,29,17,29 z"/><path style="fill:#9e9e9e;fill-rule:nonzero;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:2;" d="M40.52,16 C43.55,16,46,18.45,46,21.48 C46,21.48,46,21.48,46,21.48 C46,23.98,43.98,26,41.48,26 C41.48,26,41.38,26,41.38,26 C40.62,26,40,26.62,40,27.38 C40,27.38,40,27.38,40,27.38 C40,29.93,37.93,32,35.38,32 C35.38,32,32,32,32,32 C29.42,32,27.32,29.91,27.32,27.32 C27.32,27.32,27.32,21.42,27.32,21.42 C27.32,18.43,29.75,16,32.74,16 C32.74,16,40.52,16,40.52,16 z"/><g><path style="fill:#ffffff;fill-rule:evenodd;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:2;" d="M6,10.18 C6,7.87,7.79,6,10,6 C10,6,32,6,32,6 C34.21,6,36,7.87,36,10.18 C36,10.18,36,24.82,36,24.82 C36,27.13,34.21,29,32,29 C32,29,10,29,10,29 C7.79,29,6,27.13,6,24.82 C6,24.82,6,10.18,6,10.18 z"/><path style="fill:#ffffff;fill-rule:nonzero;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:2;" d="M21,11 C21,11,21,23,21,23"/><path style="fill:#ffffff;fill-rule:nonzero;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:2;" d="M25,15 C25,15,25,17,25,17"/><path style="fill:#ffffff;fill-rule:nonzero;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:2;" d="M17,15 C17,15,17,17,17,17"/></g></g></g></svg> ',
  tosi: '<svg class="color" viewBox="0 0 24 24"><g><path style="fill:#9e9e9e;fill-rule:nonzero;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:1;" d="M8.00,14.25 C8.00,14.25,5.00,15.25,5.00,17.25 C5.00,19.25,8.00,19.25,8.00,19.25"/><path style="fill:#9e9e9e;fill-rule:nonzero;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:1;" d="M16.00,14.25 C16.00,14.25,19.00,15.25,19.00,17.25 C19.00,19.25,16.00,19.25,16.00,19.25"/><path style="fill:#ffffff;fill-rule:evenodd;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:1;" d="M4.50,4.85 C4.50,3.69,5.40,2.75,6.50,2.75 C6.50,2.75,17.50,2.75,17.50,2.75 C18.61,2.75,19.50,3.69,19.50,4.85 C19.50,4.85,19.50,12.16,19.50,12.16 C19.50,13.32,18.61,14.25,17.50,14.25 C17.50,14.25,6.50,14.25,6.50,14.25 C5.40,14.25,4.50,13.32,4.50,12.16 C4.50,12.16,4.50,4.85,4.50,4.85 z"/><path style="fill:#ffffff;fill-rule:nonzero;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:1;" d="M12.00,5.25 C12.00,5.25,12.00,11.25,12.00,11.25"/><path style="fill:#ffffff;fill-rule:nonzero;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:1;" d="M14.00,7.25 C14.00,7.25,14.00,8.25,14.00,8.25"/><path style="fill:#ffffff;fill-rule:nonzero;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:1;" d="M10.00,7.25 C10.00,7.25,10.00,8.25,10.00,8.25"/><path style="fill:none;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:1;" d="M16.00,21.25 C16.00,21.25,15.00,20.25,15.00,20.25 C15.00,20.25,14.00,21.25,14.00,21.25"/><path style="fill:none;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:1;" d="M10.00,21.25 C10.00,21.25,9.00,20.25,9.00,20.25 C9.00,20.25,8.00,21.25,8.00,21.25"/><path style="fill:#e4e4e4;fill-rule:evenodd;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:1;" d="M8.00,14.25 C8.00,14.25,16.00,14.25,16.00,14.25 C16.00,14.25,16.00,19.25,16.00,19.25 C16.00,19.25,8.00,19.25,8.00,19.25 C8.00,19.25,8.00,14.25,8.00,14.25 z"/></g></svg> ',
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
  settings: '<svg class="stroked" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>',
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
  facebook: '<svg class="filled" version="1.1" viewBox="0 0 512 512"><g></g><path d="M464 0h-416c-26.4 0-48 21.6-48 48v416c0 26.4 21.6 48 48 48h208v-224h-64v-64h64v-32c0-52.9 43.1-96 96-96h64v64h-64c-17.6 0-32 14.4-32 32v32h96l-16 64h-80v224h144c26.4 0 48-21.6 48-48v-416c0-26.4-21.6-48-48-48z"></path></svg> ',
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
  youtube: '<svg class="filled" version="1.1" viewBox="0 0 512 512"><g></g><path d="M506.9 153.6c0 0-5-35.3-20.4-50.8-19.5-20.4-41.3-20.5-51.3-21.7-71.6-5.2-179.1-5.2-179.1-5.2h-0.2c0 0-107.5 0-179.1 5.2-10 1.2-31.8 1.3-51.3 21.7-15.4 15.5-20.3 50.8-20.3 50.8s-5.1 41.4-5.1 82.9v38.8c0 41.4 5.1 82.9 5.1 82.9s5 35.3 20.3 50.8c19.5 20.4 45.1 19.7 56.5 21.9 41 3.9 174.1 5.1 174.1 5.1s107.6-0.2 179.2-5.3c10-1.2 31.8-1.3 51.3-21.7 15.4-15.5 20.4-50.8 20.4-50.8s5.1-41.4 5.1-82.9v-38.8c-0.1-41.4-5.2-82.9-5.2-82.9zM203.1 322.4v-143.9l138.3 72.2-138.3 71.7z"></path></svg> ',
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
  fontBold: '<svg class="stroked" viewBox="0 0 24 24"><g><path style="" d="M13.5,11 C15.71,11,17.5,12.68,17.5,14.75 C17.5,16.82,15.71,18.5,13.5,18.5 C13.5,18.5,8.5,18.5,8.5,18.5 C8.5,18.5,8.5,3.5,8.5,3.5 C8.5,3.5,13.5,3.5,13.5,3.5 C15.71,3.5,17.5,5.18,17.5,7.25 C17.5,9.32,15.71,11,13.5,11 C13.5,11,13.5,11,13.5,11 z"/><path style="" d="M13.5,11 C13.5,11,8.5,11,8.5,11"/><path style="" d="M12.5,11 C14.71,11,16.5,12.68,16.5,14.75 C16.5,16.82,14.71,18.5,12.5,18.5 C12.5,18.5,7.5,18.5,7.5,18.5 C7.5,18.5,7.5,3.5,7.5,3.5 C7.5,3.5,12.5,3.5,12.5,3.5 C14.71,3.5,16.5,5.18,16.5,7.25 C16.5,9.32,14.71,11,12.5,11 C12.5,11,12.5,11,12.5,11 z"/><path style="" d="M12.5,11 C12.5,11,7.5,11,7.5,11"/></g></svg> ',
  fontItalic: '<svg class="stroked" viewBox="0 0 24 24"><g><path style="" d="M17.00,4.50 C17.00,4.50,13.00,4.50,13.00,4.50"/><path style="" d="M11.00,19.50 C11.00,19.50,7.00,19.50,7.00,19.50"/><path style="" d="M15.00,4.50 C15.00,4.50,9.00,19.50,9.00,19.50"/></g></svg> ',
  fontUnderline: '<svg class="stroked" viewBox="0 0 24 24"><g><path style="" d="M7.5,3.5 C7.5,3.5,7.5,10.74,7.5,13.5 C7.5,16.26,9.74,18.5,12.5,18.5 C15.26,18.5,17.5,16.26,17.5,13.5 C17.5,10.74,17.5,3.5,17.5,3.5"/><path style="" d="M7.5,21.5 C7.5,21.5,17.5,21.5,17.5,21.5"/></g></svg> ',
  resize: '<svg class="stroked" version="1.1" viewBox="0, 0, 24, 24"><g><path d="M9,3 L3,3 L3,9"/><path d="M15,21 L21,21 L21,15"/><path d="M3,3 L10,10"/><path d="M21,21 L14,14"/></g></svg> ',
  bug: '<svg class="stroked" viewBox="0 0 24 24"><g><path style="" d="M8,6 C8,3.79,9.79,2,12,2 C14.21,2,16,3.79,16,6 C16,6,8,6,8,6 z"/><path style="" d="M20,7 C20,7,18,9,18,9"/><path style="" d="M20,19 C20,19,18,17,18,17"/><path style="" d="M21,13 C21,13,18,13,18,13"/><path style="" d="M16.44,9 C17.30,9,18.00,9.70,18.00,10.56 C18.00,10.56,18.00,15.00,18.00,15.00 C18.00,18.31,15.31,21,12,21 C8.69,21,6,18.31,6,15.00 C6,15.00,6,10.56,6,10.56 C6,9.70,6.70,9,7.56,9 C7.56,9,16.44,9,16.44,9 z"/><path style="" d="M4,7 C4,7,6,9,6,9"/><path style="" d="M4,19 C4,19,6,17,6,17"/><path style="" d="M3,13 C3,13,6,13,6,13"/><path style="" d="M12,12 C12,12,12,17,12,17"/></g></svg> ',
  blog: '<svg class="stroked" viewBox="0 0 24 24"><g><path style="" d="M21,10.02 C21,10.02,21,15,21,15 C21,15.53,20.79,16.04,20.41,16.41 C20.04,16.79,19.53,17,19,17 C19,17,7,17,7,17 C5.67,18.33,4.33,19.67,3,21 C3,21,3,5,3,5 C3,4.47,3.21,3.96,3.59,3.59 C3.96,3.21,4.47,3,5,3 C8.53,3,10.49,3,14.02,3"/><path style="" d="M19,2 C19.54,1.46,20.32,1.25,21.05,1.45 C21.78,1.65,22.35,2.22,22.55,2.95 C22.75,3.68,22.54,4.46,22,5 C22,5,15.5,11.5,15.5,11.5 C14.17,11.83,12.83,12.17,11.5,12.5 C11.83,11.17,12.17,9.83,12.5,8.5 C15.67,5.33,15.83,5.17,19,2 z"/><path style="" d="M14.60,3"/><path style="" d="M21,8.77"/><path style="" d="M7,7 C7,7,10,7,10,7"/><path style="" d="M7,10 C7,10,9,10,9,10"/></g></svg> ',
  sortAscending: '<svg class="stroked" viewBox="0 0 24 24"><g><path d="M16.5,10.5 C16.5,10.5,7.5,10.5,7.5,10.5"/><path d="M14.5,6.5 C14.5,6.5,9.5,6.5,9.5,6.5"/><path d="M18.5,14.5 C18.5,14.5,5.5,14.5,5.5,14.5"/><path d="M20.5,18.5 C20.5,18.5,3.5,18.5,3.5,18.5"/></g></svg> ',
  npm: '<svg class="filled" version="1.1" viewBox="0 0 512 512"><g></g><path d="M0 0v512h512v-512h-512zM416 416h-64v-256h-96v256h-160v-320h320v320z"></path></svg> ',
  game: '<svg class="filled" version="1.1" viewBox="0 0 704 512"><g></g><path d="M528 96.79v-0.79h-336c-88.36 0-160 71.64-160 160s71.64 160 160 160c52.34 0 98.82-25.14 128.01-64h63.98c29.19 38.86 75.66 64 128.01 64 88.37 0 160-71.63 160-160 0-82.97-63.15-151.18-144-159.21zM288 288h-64v64h-64v-64h-64v-64h64v-64h64v64h64v64zM480 288c-17.67 0-32-14.33-32-32s14.33-32 32-32 32 14.33 32 32-14.33 32-32 32zM576 288c-17.67 0-32-14.33-32-32 0-17.67 14.33-32 32-32s32 14.33 32 32c0 17.67-14.33 32-32 32z"></path></svg> ',
  google: '<svg class="filled" version="1.1" viewBox="0 0 512 512"><g></g><path d="M256 0c-141.4 0-256 114.6-256 256s114.6 256 256 256 256-114.6 256-256-114.6-256-256-256zM259.8 448c-106.1 0-192-85.9-192-192s85.9-192 192-192c51.8 0 95.2 18.9 128.6 50.2l-52.1 50.2c-14.3-13.7-39.2-29.6-76.5-29.6-65.6 0-119 54.3-119 121.2s53.5 121.2 119 121.2c76 0 104.5-54.6 108.9-82.8h-108.9v-65.8h181.3c1.6 9.6 3 19.2 3 31.8 0.1 109.7-73.4 187.6-184.3 187.6z"></path></svg> ',
  discord: '<svg class="filled" version="1.1" viewBox="0 0 1013 768"><g></g><path d="M858.38 64.32c-60.41-28.44-130.58-50.8-204.05-63.60l-5.01-0.72c-8.35 14.47-17.31 32.35-25.34 50.74l-1.44 3.7c-34.87-5.53-75.06-8.69-116.00-8.69s-81.14 3.16-120.37 9.25l4.37-0.56c-9.48-22.09-18.44-39.97-28.27-57.29l1.49 2.86c-78.56 13.64-148.78 36.05-214.41 66.65l5.19-2.17c-132.30 195.75-168.17 386.63-150.24 574.80v0c73.25 54.65 158.46 98.55 250.43 127.12l5.97 1.60c19.28-25.64 37.51-54.63 53.29-85.10l1.63-3.45c-33.48-12.62-61.98-26.51-88.96-42.66l2.48 1.38c7.25-5.26 14.35-10.68 21.2-15.94 75.07 36.14 163.23 57.26 256.32 57.26s181.25-21.12 259.94-58.83l-3.62 1.56c6.93 5.66 14.03 11.08 21.2 15.94-24.54 14.80-53.09 28.72-82.88 40.10l-3.75 1.26c17.37 33.87 35.61 62.84 56.05 90.05l-1.14-1.58c98.00-30.05 183.28-73.93 258.78-130.22l-2.22 1.58c21.04-218.22-35.95-407.35-150.63-575.04zM338.33 523.56c-49.97 0-91.26-45.35-91.26-101.14s39.85-101.54 91.10-101.54 92.21 45.75 91.34 101.54-40.25 101.14-91.18 101.14zM674.99 523.56c-50.05 0-91.18-45.35-91.18-101.14s39.85-101.54 91.18-101.54 91.97 45.75 91.10 101.54-40.17 101.14-91.10 101.14z"></path></svg> '
};

// src/icons.ts
var defineIcons = (newIcons) => {
  Object.assign(icon_data_default, newIcons);
};
var svg2DataUrl = (svg, fill, stroke, strokeWidth = 1) => {
  svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  if (fill || stroke) {
    for (const path of [...svg.querySelectorAll("path, polygon")]) {
      if (fill) {
        path.setAttribute("fill", fill);
      }
      if (stroke) {
        path.setAttribute("stroke", stroke);
        path.setAttribute("stroke-width", String(strokeWidth));
      }
    }
  }
  const styled = svg.querySelectorAll("[style]");
  svg.removeAttribute("style");
  for (const item of [...styled]) {
    const { fill: fill2, stroke: stroke2, strokeWidth: strokeWidth2, strokeLinecap, strokeLinejoin } = item.style;
    if (fill2)
      item.setAttribute("fill", a.fromCss(fill2).html);
    if (stroke2)
      item.setAttribute("stroke", a.fromCss(stroke2).html);
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
      const div = p.div();
      div.innerHTML = iconSpec;
      const sourceSvg = div.querySelector("svg");
      const classes = new Set(sourceSvg.classList);
      classes.add("xin-icon");
      const svg = Ln.svg({
        class: Array.from(classes).join(" "),
        viewBox: sourceSvg.getAttribute("viewBox")
      }, ...parts, ...sourceSvg.children);
      svg.style.strokeWidth = sn.xinIconStrokeWidth("2px");
      svg.style.stroke = sn.xinIconStroke(classes.has("filled") ? "none" : "currentColor");
      svg.style.fill = sn.xinIconFill(classes.has("stroked") ? "none" : "currentColor");
      svg.style.height = sn.xinIconSize("16px");
      return svg;
    };
  }
});

class SvgIcon extends M {
  icon = "";
  size = 0;
  fill = "";
  stroke = "";
  strokeWidth = 1;
  constructor() {
    super();
    this.initAttributes("icon", "size", "fill", "stroke", "strokeWidth");
  }
  render() {
    this.textContent = "";
    const style = {};
    if (this.size) {
      style.height = this.size;
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
      display: "inline-flex",
      stroke: "currentColor",
      strokeWidth: sn.iconStrokeWidth("2px"),
      strokeLinejoin: sn.iconStrokeLinejoin("round"),
      strokeLinecap: sn.iconStrokeLinecap("round"),
      fill: sn.iconFill("none")
    },
    ":host, :host svg": {
      height: sn.xinIconSize("16px")
    }
  }
});

// src/babylon-3d.ts
var noop = () => {};

class B3d extends M {
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
  content = p.canvas({ part: "canvas" });
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
class BodymovinPlayer extends M {
  content = null;
  src = "";
  json = "";
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
    this.initAttributes("src", "json");
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
var { button, slot, div } = p;

class XinCarousel extends M {
  arrows = false;
  dots = false;
  loop = false;
  maxVisibleItems = 1;
  snapDelay = 0.1;
  snapDuration = 0.25;
  auto = 0;
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
  set page(p2) {
    const { scroller, back, forward } = this.parts;
    if (this.lastPage <= 0) {
      forward.disabled = back.disabled = true;
      p2 = 0;
    } else {
      p2 = Math.max(0, Math.min(this.lastPage, p2));
      p2 = isNaN(p2) ? 0 : p2;
    }
    if (this._page !== p2) {
      this._page = isNaN(p2) ? 0 : p2;
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
      height: Hn.carouselIconSize
    },
    ":host button": {
      outline: "none",
      border: "none",
      boxShadow: "none",
      background: "transparent",
      color: Hn.carouselButtonColor,
      padding: 0
    },
    ":host::part(back), :host::part(forward)": {
      position: "absolute",
      top: 0,
      bottom: 0,
      width: Hn.carouseButtonWidth,
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
      color: Hn.carouselButtonHoverColor
    },
    ":host button:active": {
      color: Hn.carouselButtonActiveColor
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
      background: Hn.carouselButtonColor,
      borderRadius: Hn.carouselDotSize,
      height: Hn.carouselDotSize,
      width: Hn.carouselDotSize,
      transition: Hn.carouselDotTransition
    },
    ":host .dot:not(.current):hover": {
      background: Hn.carouselButtonHoverColor,
      height: Hn.carouselDotSize150,
      width: Hn.carouselDotSize150,
      margin: Hn.carouselDotSize_25
    },
    ":host .dot:not(.current):active": {
      background: Hn.carouselButtonActiveColor
    },
    ":host .dot.current": {
      background: Hn.carouselDotCurrentColor
    },
    ":host::part(progress)": {
      display: "flex",
      gap: Hn.carouselDotSpacing,
      justifyContent: "center",
      padding: Hn.carouselProgressPadding
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
  constructor() {
    super();
    this.initAttributes("dots", "arrows", "maxVisibleItems", "snapDuration", "loop", "auto");
  }
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
      _carouselDotSpacing: Hn.carouselDotSize,
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
var makeCodeEditor = async (codeElement, mode = "html", options = {}, theme = DEFAULT_THEME) => {
  const { ace } = await scriptTag(`${ACE_BASE_URL}ace.min.js`);
  ace.config.set("basePath", ACE_BASE_URL);
  const editor = ace.edit(codeElement, {
    mode: `ace/mode/${mode}`,
    tabSize: 2,
    useSoftTabs: true,
    useWorker: false,
    ...options
  });
  editor.setTheme(theme);
  return editor;
};

class CodeEditor extends M {
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
  mode = "javascript";
  disabled = false;
  role = "code editor";
  get editor() {
    return this._editor;
  }
  _editor;
  _editorPromise;
  options = {};
  theme = DEFAULT_THEME;
  static styleSpec = {
    ":host": {
      display: "block",
      position: "relative",
      width: "100%",
      height: "100%"
    }
  };
  constructor() {
    super();
    this.initAttributes("mode", "theme", "disabled");
  }
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
      this._editorPromise.then((editor) => {
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
      this._editorPromise.then((editor) => editor.setReadOnly(this.disabled));
    }
  }
}
var codeEditor = CodeEditor.elementCreator({
  tag: "xin-code"
});
// src/color-input.ts
var { input } = p;
var defaultColor = a.fromCss("#8888");

class ColorInput extends M {
  value = defaultColor.rgba;
  color = defaultColor;
  static styleSpec = {
    ":host": {
      _gap: 8,
      _swatchSize: 32,
      _cssWidth: 72,
      _alphaWidth: 72,
      display: "inline-flex",
      gap: Hn.gap,
      alignItems: "center"
    },
    ':host input[type="color"]': {
      border: 0,
      width: Hn.swatchSize,
      height: Hn.swatchSize,
      background: "transparent"
    },
    ":host::part(alpha)": {
      width: Hn.alphaWidth
    },
    ":host::part(css)": {
      width: Hn.cssWidth,
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
      this.color = a.fromCss(rgb.value);
      this.color.a = Number(alpha.value);
      css.value = this.color.html;
    } else {
      this.color = a.fromCss(css.value);
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
    this.color = a.fromCss(this.value);
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
var TRACKER = p.div({
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
var { slot: slot2 } = p;

class XinFloat extends M {
  static floats = new Set;
  drag = false;
  remainOnResize = "remove";
  remainOnScroll = "remain";
  content = slot2();
  static styleSpec = {
    ":host": {
      position: "fixed"
    }
  };
  constructor() {
    super();
    this.initAttributes("drag", "remainOnResize", "remainOnScroll");
  }
  reposition = (event) => {
    const target = event.target;
    if (target?.closest(".no-drag")) {
      return;
    }
    if (this.drag) {
      bringToFront(this);
      const x2 = this.offsetLeft;
      const y = this.offsetTop;
      trackDrag(event, (dx, dy, pointerEvent) => {
        this.style.left = `${x2 + dx}px`;
        this.style.top = `${y + dy}px`;
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
  [...XinFloat.floats].forEach((float) => {
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
  [...XinFloat.floats].forEach((float) => {
    if (float.remainOnScroll === "hide") {
      float.hidden = true;
    } else if (float.remainOnScroll === "remove") {
      float.remove();
    }
  });
}, { passive: true, capture: true });

// src/pop-float.ts
var popFloat = (options) => {
  const { content, target, position } = options;
  const float = Array.isArray(content) ? xinFloat(...content) : xinFloat(content);
  positionFloat(float, target, position);
  document.body.append(float);
  return float;
};
var positionFloat = (element, target, position) => {
  {
    const { position: position2 } = getComputedStyle(element);
    if (position2 !== "fixed") {
      element.style.position = "fixed";
    }
    bringToFront(element);
  }
  const { left, top, width, height } = target.getBoundingClientRect();
  const cx = left + width * 0.5;
  const cy = top + height * 0.5;
  const w = window.innerWidth;
  const h2 = window.innerHeight;
  if (position === "side") {
    position = (cx < w * 0.5 ? "e" : "w") + (cy < h2 * 0.5 ? "s" : "n");
  } else if (position === "auto" || position === undefined) {
    position = (cy < h2 * 0.5 ? "s" : "n") + (cx < w * 0.5 ? "e" : "w");
  }
  element.style.top = element.style.left = element.style.right = element.style.bottom = element.style.transform = "";
  if (position.length === 2) {
    const [first, second] = position;
    switch (first) {
      case "n":
        element.style.bottom = (h2 - top).toFixed(2) + "px";
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
        element.style.bottom = (h2 - top - height).toFixed(2) + "px";
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
    element.style.bottom = (h2 - top).toFixed(2) + "px";
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
  return (p2, q2) => {
    const pSort = sortValuator(p2);
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
var { button: button2, span, input: input2 } = p;
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

class XinSelect extends M {
  editable = false;
  showIcon = false;
  hideCaption = false;
  options = "";
  value = "";
  placeholder = "";
  filter = "";
  localized = false;
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
    return typeof this.options === "string" ? this.options.split(",").map((option) => option.trim() || null) : this.options;
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
  filterMenu = en(() => {
    this.filter = this.parts.value.value.toLocaleLowerCase();
    removeLastMenu(0);
    this.popOptions();
  });
  popOptions = (event) => {
    if (event && event.type === "click") {
      this.filter = "";
    }
    this.poppedOptions = this.optionsMenu;
    popMenu({
      target: this,
      menuItems: this.poppedOptions
    });
  };
  content = () => [
    button2({
      onClick: this.popOptions
    }, span(), input2({
      part: "value",
      value: this.value,
      tabindex: 0,
      onKeydown: this.handleKey,
      onInput: this.filterMenu,
      onChange: this.handleChange
    }), icons.chevronDown())
  ];
  constructor() {
    super();
    this.initAttributes("options", "editable", "placeholder", "showIcon", "hideCaption", "localized");
  }
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
    const { value } = this.parts;
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
var xinSelect = XinSelect.elementCreator({
  tag: "xin-select",
  styleSpec: {
    ":host": {
      "--gap": "8px",
      "--touch-size": "44px",
      "--padding": "0 8px",
      "--value-padding": "0 8px",
      "--icon-width": "24px",
      "--fieldWidth": "140px",
      display: "inline-block",
      position: "relative"
    },
    ":host button": {
      display: "grid",
      alignItems: "center",
      gap: Hn.gap,
      textAlign: "left",
      height: Hn.touchSize,
      padding: Hn.padding,
      gridTemplateColumns: `auto ${Hn.iconWidth}`,
      position: "relative"
    },
    ":host[show-icon] button": {
      gridTemplateColumns: `${Hn.iconWidth} auto ${Hn.iconWidth}`
    },
    ":host[hide-caption] button": {
      gridTemplateColumns: `${Hn.iconWidth} ${Hn.iconWidth}`
    },
    ":host:not([show-icon]) button > :first-child": {
      display: "none"
    },
    ":host[hide-caption] button > :nth-child(2)": {
      display: "none"
    },
    ':host [part="value"]': {
      width: Hn.fieldWidth,
      padding: Hn.valuePadding,
      height: Hn.touchSize,
      lineHeight: Hn.touchSize,
      boxShadow: "none",
      whiteSpace: "nowrap",
      outline: "none",
      background: "transparent"
    },
    ':host [part="value"]:not(:focus)': {
      overflow: "hidden",
      textOverflow: "ellipsis",
      background: "transparent"
    }
  }
});

// src/localize.ts
var { span: span2 } = p;
var { i18n } = cn({
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
tn.localeOptions = {
  toDOM(select, options) {
    if (select instanceof XinSelect) {
      select.options = options;
    }
  }
};
var setLocale = (language) => {
  if (i18n.locales.includes(language)) {
    i18n.locale = language;
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
U(i18n.locale.xinPath, updateLocalized);
var captionSort = makeSorter((locale) => [
  locale.caption.toLocaleLowerCase()
]);
function initLocalization(localizedStrings) {
  const [locales, , languages, emoji, ...strings] = localizedStrings.split(`
`).map((line) => line.split("\t"));
  if (locales && languages && emoji && strings) {
    i18n.locales = locales;
    i18n.languages = languages;
    i18n.emoji = emoji;
    i18n.stringMap = strings.reduce((map, strings2) => {
      map[strings2[0].toLocaleLowerCase()] = strings2;
      return map;
    }, {});
    i18n.localeOptions = locales.map((locale, index) => ({
      icon: span2({ title: locales[index] }, emoji[index]),
      caption: languages[index],
      value: locale
    })).sort(captionSort);
    if (!i18n.locales.includes(i18n.locale.valueOf())) {
      const language = i18n.locale.substring(0, 2);
      i18n.locale = i18n.locales.find((locale) => locale.substring(0, 2) === language) || i18n.locales[0];
    }
    updateLocalized();
  }
}
function localize(ref) {
  if (ref.endsWith("…")) {
    return localize(ref.substring(0, ref.length - 1)) + "…";
  }
  const index = i18n.locales.indexOf(i18n.locale.valueOf());
  if (index > -1) {
    const map = i18n.stringMap[ref.toLocaleLowerCase()];
    const localized = map && map[index];
    if (localized) {
      ref = ref.toLocaleLowerCase() === ref ? localized.toLocaleLowerCase() : localized.valueOf();
    }
  }
  return ref;
}

class LocalePicker extends M {
  hideCaption = false;
  content = () => {
    return xinSelect({
      part: "select",
      showIcon: true,
      title: localize("Language"),
      bindValue: i18n.locale,
      bindLocaleOptions: i18n.localeOptions
    });
  };
  constructor() {
    super();
    this.initAttributes("hideCaption");
  }
  render() {
    super.render();
    this.parts.select.toggleAttribute("hide-caption", this.hideCaption);
  }
}
var localePicker = LocalePicker.elementCreator({
  tag: "xin-locale-picker"
});

class XinLocalized extends M {
  static allInstances = new Set;
  contents = () => p.xinSlot();
  refString = "";
  constructor() {
    super();
    this.initAttributes("refString");
  }
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
var { div: div2, button: button3, span: span3, a: a2, xinSlot } = p;
Ve("xin-menu-helper", {
  ".xin-menu": {
    overflow: "hidden auto",
    maxHeight: `calc(${Hn.maxHeight} - ${sn.menuInset("8px")})`,
    borderRadius: Hn.spacing50,
    background: sn.menuBg("#fafafa"),
    boxShadow: sn.menuShadow(`${Hn.spacing13} ${Hn.spacing50} ${Hn.spacing} #0004`)
  },
  ".xin-menu > div": {
    width: sn.menuWidth("auto")
  },
  ".xin-menu-trigger": {
    paddingLeft: 0,
    paddingRight: 0,
    minWidth: sn.touchSize("48px")
  },
  ".xin-menu-separator": {
    display: "inline-block",
    content: " ",
    height: "1px",
    width: "100%",
    background: sn.menuSeparatorColor("#2224"),
    margin: sn.menuSeparatorMargin("8px 0")
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
    padding: sn.menuItemPadding("0 16px"),
    height: sn.menuItemHeight("48px"),
    lineHeight: sn.menuItemHeight("48px"),
    textAlign: "left"
  },
  ".xin-menu-item, .xin-menu-item > span": {
    color: sn.menuItemColor("#222")
  },
  ".xin-menu-with-icons .xin-menu-item": {
    gridTemplateColumns: "30px 1fr 30px"
  },
  ".xin-menu-item svg": {
    stroke: sn.menuItemIconColor("#222")
  },
  ".xin-menu-item.xin-menu-item-checked": {
    background: sn.menuItemHoverBg("#eee")
  },
  ".xin-menu-item > span:nth-child(2)": {
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    textAlign: "left"
  },
  ".xin-menu-item:hover": {
    boxShadow: "none !important",
    background: sn.menuItemHoverBg("#eee")
  },
  ".xin-menu-item:active": {
    boxShadow: "none !important",
    background: sn.menuItemActiveBg("#aaa"),
    color: sn.menuItemActiveColor("#000")
  },
  ".xin-menu-item:active svg": {
    stroke: sn.menuItemIconActiveColor("#000")
  }
});
var createMenuAction = (item, options) => {
  const checked = item.checked && item.checked() && "check" || false;
  let icon = item?.icon || checked || span3(" ");
  if (typeof icon === "string") {
    icon = icons[icon]();
  }
  let menuItem;
  if (typeof item?.action === "string") {
    menuItem = a2({
      class: "xin-menu-item",
      href: item.action
    }, icon, options.localized ? span3(localize(item.caption)) : span3(item.caption), span3(item.shortcut || " "));
  } else {
    menuItem = button3({
      class: "xin-menu-item",
      onClick: item.action
    }, icon, options.localized ? span3(localize(item.caption)) : span3(item.caption), span3(item.shortcut || " "));
  }
  menuItem.classList.toggle("xin-menu-item-checked", checked !== false);
  if (item?.enabled && !item.enabled()) {
    menuItem.setAttribute("disabled", "");
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
  } else if (item?.action) {
    return createMenuAction(item, options);
  } else {
    return createSubMenu(item, options);
  }
};
var menu = (options) => {
  const { target, width, menuItems } = options;
  const hasIcons = menuItems.find((item) => item?.icon || item?.checked);
  return div2({
    class: hasIcons ? "xin-menu xin-menu-with-icons" : "xin-menu",
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
    menu: float
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

class XinMenu extends M {
  menuItems = [];
  menuWidth = "auto";
  localized = false;
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
    this.initAttributes("menuWidth", "localized", "icon");
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
      gap: sn.xinMenuTriggerGap("10px")
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
      const [A, B2] = allowedType.split("/");
      const [a3, b2] = type.split("/");
      if ((A === "*" || A === a3) && (B2 === "*" || B2 === b2)) {
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
var { div: div3, span: span4, button: button4, template } = p;
var passThru = (array) => array;

class DataTable extends M {
  select = false;
  multiple = false;
  nosort = false;
  nohide = false;
  noreorder = false;
  selectionChanged = () => {};
  localized = false;
  selectedKey = Symbol("selected");
  selectBinding = (elt, obj) => {
    elt.toggleAttribute("aria-selected", obj[this.selectedKey] === true);
  };
  pinnedTop = 0;
  pinnedBottom = 0;
  maxVisibleRows = 1e4;
  get value() {
    return {
      array: this.array,
      filter: this.filter,
      columns: this.columns
    };
  }
  set value(data) {
    const { array, columns, filter } = x(data);
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
  charWidth = 15;
  rowHeight = 30;
  minColumnWidth = 30;
  get virtual() {
    return this.rowHeight > 0 ? { height: this.rowHeight } : undefined;
  }
  constructor() {
    super();
    this.rowData = cn({
      [this.instanceId]: this.rowData
    })[this.instanceId];
    this.initAttributes("rowHeight", "charWidth", "minColumnWidth", "select", "multiple", "pinnedTop", "pinnedBottom", "nosort", "nohide", "noreorder", "localized");
  }
  get array() {
    return this._array;
  }
  set array(newArray) {
    this._array = x(newArray);
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
    return sortColumn.sort === "ascending" ? (a3, b2) => a3[prop] > b2[prop] ? 1 : -1 : (a3, b2) => a3[prop] > b2[prop] ? -1 : 1;
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
        const touch2 = isTouchEvent ? [...event2.touches].find((touch3) => touch3.identifier === touchIdentifier) : true;
        if (touch2 === undefined) {
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
    const pickedItem = mn(tr);
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
      ].sort((a3, b2) => a3 - b2);
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
      const item = mn(row);
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
    this.style.setProperty("--grid-columns", this.visibleColumns.map((c) => c.width + "px").join(" "));
    this.style.setProperty("--grid-row-width", this.visibleColumns.reduce((w, c) => w + c.width, 0) + "px");
  }
  sortByColumn = (columnOptions, direction = "auto") => {
    for (const column of this.columns.filter((c) => x(c.sort) !== false)) {
      if (x(column) === columnOptions) {
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
        caption: this.localized ? `${localize("Sort")} ${localize("Descending")}` : "Sort Ascending",
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
        textAlign: options.align || "left"
      }
    }, this.captionSpan(typeof options.name === "string" ? options.name : options.prop), span4({ style: { flex: "1" } }), menuButton);
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
        textAlign: options.align || "left"
      },
      bindText: `^.${options.prop}`
    });
  };
  get visibleRows() {
    return x(this.rowData.visible);
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
    this.style.setProperty("--row-height", `${this.rowHeight}px`);
    this.setColumnWidths();
    if (!this.noreorder) {
      init();
    }
    const dragId = this.instanceId + "-column-header";
    const columnHeaders = visibleColumns.map((column) => {
      const header = this.headerCell(column);
      if (!this.noreorder) {
        header.setAttribute("draggable", "true");
        header.dataset.drag = dragId;
        header.dataset.drop = dragId;
        header.addEventListener("dragstart", () => {
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
      overflow: "auto hidden"
    },
    ":host .thead, :host .tbody": {
      width: Hn.gridRowWidth
    },
    ":host .tr": {
      display: "grid",
      gridTemplateColumns: Hn.gridColumns,
      height: Hn.rowHeight,
      lineHeight: Hn.rowHeight
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
      lineHeight: Hn.touchSize,
      height: Hn.touchSize,
      width: Hn.touchSize
    },
    ':host [draggable="true"]': {
      cursor: "ew-resize"
    },
    ':host [draggable="true"]:active': {
      background: sn.draggedHeaderBg("#0004"),
      color: sn.draggedHeaderColor("#fff")
    },
    ":host .drag-over": {
      background: sn.dropHeaderBg("#fff4")
    }
  }
});
// src/editable-rect.ts
var { div: div4, slot: slot3 } = p;

class EditableRect extends M {
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
      height: Hn.handleSize,
      width: Hn.handleSize,
      padding: Hn.handlePadding,
      "--text-color": Hn.handleColor,
      background: Hn.handleBg
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
      transform: `translateY(${Hn.handleSize_50})`
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
      "--text-color": Hn.handleHoverColor,
      background: Hn.handleHoverBg
    }
  };
  static snappedCoords(event, coords) {
    const { gridSize } = EditableRect;
    return EditableRect.snapToGrid || event.shiftKey ? coords.map((v2) => Math.round(v2 / gridSize) * gridSize) : coords;
  }
  static snappedAngle(event, a3) {
    const { angleSize } = EditableRect;
    return EditableRect.snapAngle || event.shiftKey ? Math.round(a3 / angleSize) * angleSize : a3;
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
    const l = element.offsetLeft;
    const t = element.offsetTop;
    const w = element.offsetWidth;
    const h2 = element.offsetHeight;
    const r = element.offsetParent.offsetWidth - l - w;
    const b2 = element.offsetParent.offsetHeight - t - h2;
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
      element.style.left = l + "px";
    if (right)
      element.style.right = r + "px";
    if (left && right) {
      element.style.width = "auto";
    } else {
      element.style.width = w + "px";
    }
    if (top)
      element.style.top = t + "px";
    if (bottom)
      element.style.bottom = b2 + "px";
    if (top && bottom) {
      element.style.height = "auto";
    } else {
      element.style.height = h2 + "px";
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
      const x2 = clientX - center.x;
      const y = clientY - center.y;
      let alpha = y > 0 ? 90 : -90;
      if (x2 !== 0) {
        alpha = Math.atan2(y, x2) * 180 / Math.PI;
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
    div4({
      part: "move",
      style: { top: "50%", left: "50%", transform: "translate(-50%,-50%)" }
    }, icons.move()),
    div4({
      part: "left",
      title: "resize left",
      class: "drag-size",
      style: { left: "-6px", width: "8px" }
    }),
    div4({
      part: "right",
      title: "resize right",
      class: "drag-size",
      style: { left: "calc(100% - 2px)", width: "8px" }
    }),
    div4({
      part: "top",
      title: "resize top",
      class: "drag-size",
      style: { top: "-6px", height: "8px", cursor: "ns-resize" }
    }),
    div4({
      part: "bottom",
      title: "resize bottom",
      class: "drag-size",
      style: { top: "calc(100% - 2px)", height: "8px", cursor: "ns-resize" }
    }),
    div4({
      part: "resize",
      style: { top: "100%", left: "100%" }
    }, icons.resize()),
    div4({
      part: "rotate",
      style: { top: "50%", right: "0" }
    }, icons.refreshCw()),
    div4({
      part: "lockLeft",
      title: "lock left",
      style: { top: "50%", left: 0, transform: "translate(-100%, -50%)" }
    }, icons.unlock(), icons.lock()),
    div4({
      part: "lockRight",
      title: "lock right",
      style: { top: "50%", left: "100%", transform: "translate(0%, -50%)" }
    }, icons.unlock(), icons.lock()),
    div4({
      part: "lockTop",
      title: "lock top",
      style: { top: 0, left: "50%", transform: "translate(-50%, -100%)" }
    }, icons.unlock(), icons.lock()),
    div4({
      part: "lockBottom",
      title: "lock bottom",
      style: { top: "100%", left: "50%", transform: "translate(-50%, 0%)" }
    }, icons.unlock(), icons.lock()),
    slot3()
  ];
  constructor() {
    super();
    this.initAttributes("rotationSnap", "positionSnap");
  }
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
var { div: div5, input: input3, select, option, button: button5, span: span5 } = p;
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
      console.log(tags);
      return (obj) => Array.isArray(obj) && tags.find((tag) => !obj.includes(tag)) === undefined;
    }
  },
  doesNotHaveTags: {
    caption: "does not have tags",
    makeTest: (value) => {
      const tags = value.split(/[\s,]/).map((tag) => tag.trim().toLocaleLowerCase()).filter((tag) => tag !== "");
      console.log(tags);
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
function getSelectText(select2) {
  return select2.options[select2.selectedIndex].text;
}

class FilterPart extends M {
  fields = [];
  filters = availableFilters;
  haystack = "*";
  condition = "";
  needle = "";
  content = () => [
    select({ part: "haystack" }),
    icons.chevronDown(),
    select({ part: "condition" }),
    icons.chevronDown(),
    input3({ part: "needle", type: "search" }),
    span5({ part: "padding" }),
    button5({ part: "remove", title: "delete" }, icons.trash())
  ];
  filter = passAnything;
  constructor() {
    super();
    this.initAttributes("haystack", "condition", "needle");
  }
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
      test = negative ? (obj) => Object.values(obj).find((v2) => !baseTest(v2)) !== undefined : (obj) => Object.values(obj).find((v2) => baseTest(v2)) !== undefined;
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
    haystack.textContent = "";
    haystack.append(option("any field", { value: "*" }), ...this.fields.map((field) => {
      const caption = field.name || field.prop;
      return option(`${caption}`, { value: field.prop });
    }));
    condition.textContent = "";
    const conditions = Object.keys(this.filters).map((key) => {
      const filter = this.filters[key];
      return filter.negative !== undefined ? [
        option(filter.caption, { value: key }),
        option(filter.negative, { value: "~" + key })
      ] : option(filter.caption, { value: key });
    }).flat();
    condition.append(...conditions);
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

class FilterBuilder extends M {
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
    button5({
      part: "add",
      title: "add filter condition",
      onClick: this.addFilter,
      class: "round"
    }, icons.plus()),
    div5({ part: "filterContainer" }),
    button5({ part: "reset", title: "reset filter", onClick: this.reset }, icons.x())
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
var { form, slot: slot4, xinSlot: xinSlot2, label, input: input4, span: span6 } = p;
function attr(element, name, value) {
  if (value !== "" && value !== false) {
    element.setAttribute(name, value);
  } else {
    element.removeAttribute(name);
  }
}
function getInputValue(input5) {
  switch (input5.type) {
    case "checkbox":
      return input5.checked;
    case "radio": {
      const picked = input5.parentElement?.querySelector(`input[type="radio"][name="${input5.name}"]:checked`);
      return picked ? picked.value : null;
    }
    case "range":
    case "number":
      return Number(input5.value);
    default:
      return Array.isArray(input5.value) && input5.value.length === 0 ? null : input5.value;
  }
}
function setElementValue(input5, value) {
  if (!(input5 instanceof HTMLElement)) {} else if (input5 instanceof HTMLInputElement) {
    switch (input5.type) {
      case "checkbox":
        input5.checked = value;
        break;
      case "radio":
        input5.checked = value === input5.value;
        break;
      default:
        input5.value = String(value || "");
    }
  } else {
    if (value != null || input5.value != null) {
      input5.value = String(value || "");
    }
  }
}

class XinField extends M {
  caption = "";
  key = "";
  type = "";
  optional = false;
  pattern = "";
  placeholder = "";
  min = "";
  max = "";
  step = "";
  fixedPrecision = -1;
  value = null;
  content = label(xinSlot2({ part: "caption" }), span6({ part: "field" }, xinSlot2({ part: "input", name: "input" }), input4({ part: "valueHolder" })));
  constructor() {
    super();
    this.initAttributes("caption", "key", "type", "optional", "pattern", "placeholder", "min", "max", "step", "fixedPrecision", "prefix", "suffix");
  }
  valueChanged = false;
  handleChange = () => {
    const { input: input5, valueHolder } = this.parts;
    const inputElement = input5.children[0] || valueHolder;
    if (inputElement !== valueHolder) {
      valueHolder.value = inputElement.value;
    }
    this.value = getInputValue(inputElement);
    this.valueChanged = true;
    const form2 = this.closest("xin-form");
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
  initialize(form2) {
    const initialValue = form2.fields[this.key] !== undefined ? form2.fields[this.key] : this.value;
    if (initialValue != null && initialValue !== "") {
      if (form2.fields[this.key] == null)
        form2.fields[this.key] = initialValue;
      this.value = initialValue;
    }
  }
  connectedCallback() {
    super.connectedCallback();
    const { input: input5, valueHolder } = this.parts;
    const form2 = this.closest(XinForm.tagName);
    if (form2 instanceof XinForm) {
      this.initialize(form2);
    }
    valueHolder.addEventListener("change", this.handleChange);
    input5.addEventListener("change", this.handleChange, true);
  }
  render() {
    if (this.valueChanged) {
      this.valueChanged = false;
      return;
    }
    const { input: input5, caption, valueHolder, field } = this.parts;
    if (caption.textContent?.trim() === "") {
      caption.append(this.caption !== "" ? this.caption : this.key);
    }
    if (this.type === "text") {
      input5.textContent = "";
      const textarea = p.textarea({ value: this.value });
      if (this.placeholder) {
        textarea.setAttribute("placeholder", this.placeholder);
      }
      input5.append(textarea);
    } else if (this.type === "color") {
      input5.textContent = "";
      input5.append(colorInput({ value: this.value }));
    } else if (input5.children.length === 0) {
      attr(valueHolder, "placeholder", this.placeholder);
      attr(valueHolder, "type", this.type);
      attr(valueHolder, "pattern", this.pattern);
      attr(valueHolder, "min", this.min);
      attr(valueHolder, "max", this.max);
      attr(valueHolder, "step", this.step);
    }
    setElementValue(valueHolder, this.value);
    setElementValue(input5.children[0], this.value);
    this.prefix ? field.setAttribute("prefix", this.prefix) : field.removeAttribute("prefix");
    this.suffix ? field.setAttribute("suffix", this.suffix) : field.removeAttribute("suffix");
    valueHolder.classList.toggle("hidden", input5.children.length > 0);
    if (input5.children.length > 0) {
      valueHolder.setAttribute("tabindex", "-1");
    } else {
      valueHolder.removeAttribute("tabindex");
    }
    input5.style.display = input5.children.length === 0 ? "none" : "";
    attr(valueHolder, "required", !this.optional);
  }
}

class XinForm extends M {
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
    slot4({ part: "header", name: "header" }),
    form({ part: "form" }, slot4({ part: "content" })),
    slot4({ part: "footer", name: "footer" })
  ];
  getField = (key) => {
    return this.querySelector(`xin-field[key="${key}"]`);
  };
  get fields() {
    if (typeof this.value === "string") {
      try {
        this.value = JSON.parse(this.value);
      } catch (e) {
        console.log("<xin-form> could not use its value, expects valid JSON");
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
    const fields = [...this.querySelectorAll(XinField.tagName)];
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
    this.submitCallback(this.value, this.isValid);
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
  }
}
var xinField = XinField.elementCreator({
  tag: "xin-field",
  styleSpec: {
    ':host [part="field"]': {
      position: "relative",
      display: "flex",
      alignItems: "center",
      gap: sn.prefixSuffixGap("8px")
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
  }
});
var xinForm = XinForm.elementCreator({
  tag: "xin-form"
});
// src/gamepad.ts
function gamepadState() {
  const gamepads = navigator.getGamepads().filter((p2) => p2 !== null);
  return gamepads.map((p2) => {
    const { id, axes, buttons } = p2;
    return {
      id,
      axes,
      buttons: buttons.map((button6, index) => {
        const { pressed, value } = button6;
        return {
          index,
          pressed,
          value
        };
      }).filter((b2) => b2.pressed || b2.value !== 0).reduce((map, button6) => {
        map[button6.index] = button6.value;
        return map;
      }, {})
    };
  });
}
function gamepadText() {
  const state = gamepadState();
  return state.length === 0 ? "no active gamepads" : state.map(({ id, axes, buttons }) => {
    const axesText = axes.map((a3) => a3.toFixed(2)).join(" ");
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
// src/tab-selector.ts
var { div: div6, slot: slot5, span: span7, button: button6 } = p;

class TabSelector extends M {
  value = 0;
  localized = false;
  makeTab(tabs, tabBody, bodyId) {
    const tabName = tabBody.getAttribute("name");
    const tabContent = tabBody.querySelector('template[role="tab"]')?.content.cloneNode(true) || (this.localized ? xinLocalized(tabName) : span7(tabName));
    const tab = div6(tabContent, {
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
      padding: `${Hn.spacing50} ${Hn.spacing}`,
      cursor: "default",
      display: "flex",
      alignItems: "baseline"
    },
    ':host .tabs > [aria-selected="true"]': {
      "--text-color": Hn.xinTabsSelectedColor,
      color: Hn.textColor
    },
    ":host .elastic": {
      flex: "1"
    },
    ":host .border": {
      background: "var(--xin-tabs-bar-color, #ccc)"
    },
    ":host .border > .selected": {
      content: " ",
      width: 0,
      height: "var(--xin-tabs-bar-height, 2px)",
      background: Hn.xinTabsSelectedColor,
      transition: "ease-out 0.2s"
    },
    ":host button.close": {
      border: 0,
      background: "transparent",
      textAlign: "center",
      marginLeft: Hn.spacing50,
      padding: 0
    },
    ":host button.close > svg": {
      height: "12px"
    }
  };
  onCloseTab = null;
  content = [
    div6({ role: "tabpanel", part: "tabpanel" }, div6({ part: "tabrow" }, div6({ class: "tabs", part: "tabs" }), div6({ class: "elastic" }), slot5({ name: "after-tabs" })), div6({ class: "border" }, div6({ class: "selected", part: "selected" }))),
    slot5()
  ];
  constructor() {
    super();
    this.initAttributes("localized");
  }
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

// src/live-example.ts
var { div: div7, xinSlot: xinSlot3, style, button: button7, h4, pre } = p;
var AsyncFunction = (async () => {}).constructor;

class LiveExample extends M {
  persistToDom = false;
  prettier = false;
  prefix = "lx";
  storageKey = "live-example-payload";
  context = {};
  uuid = crypto.randomUUID();
  remoteId = "";
  lastUpdate = 0;
  interval;
  static insertExamples(element, context = {}) {
    const sources = [
      ...element.querySelectorAll(".language-html,.language-js,.language-css")
    ].filter((element2) => !element2.closest(LiveExample.tagName)).map((code) => ({
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
      const example = liveExample({ context });
      exampleSources[0].block.parentElement.insertBefore(example, exampleSources[0].block);
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
        }
        source.block.remove();
      });
      example.showDefaultTab();
    }
  }
  constructor() {
    super();
    this.initAttributes("persistToDom", "prettier");
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
  content = () => [
    div7({ part: "example" }, style({ part: "style" }), button7({
      title: "example menu",
      part: "exampleWidgets",
      onClick: this.exampleMenu
    }, icons.code())),
    div7({
      class: "code-editors",
      part: "codeEditors",
      hidden: true
    }, h4("Code"), button7({
      title: "close code",
      class: "transparent close-button",
      onClick: this.closeCode
    }, icons.x()), tabSelector({
      part: "editors",
      onChange: this.updateUndo
    }, codeEditor({
      name: "js",
      mode: "javascript",
      part: "js"
    }), codeEditor({ name: "html", mode: "html", part: "html" }), codeEditor({ name: "css", mode: "css", part: "css" }), div7({
      slot: "after-tabs",
      class: "row"
    }, button7({
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
      title: "flip direction",
      class: "transparent",
      onClick: this.flipLayout
    }, icons.columns({ class: "layout-indicator" })), button7({
      title: "copy as markdown",
      class: "transparent",
      onClick: this.copy
    }, icons.copy()), button7({
      title: "reload",
      class: "transparent",
      onClick: this.refreshRemote
    }, icons.refreshCw())))),
    xinSlot3({ part: "sources", hidden: true })
  ];
  connectedCallback() {
    super.connectedCallback();
    const { sources } = this.parts;
    this.initFromElements([...sources.children]);
    addEventListener("storage", this.remoteChange);
    this.interval = setInterval(this.remoteChange, 500);
    this.undoInterval = setInterval(this.updateUndo, 250);
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    const { storageKey, remoteKey } = this;
    clearInterval(this.interval);
    clearInterval(this.undoInterval);
    localStorage.setItem(storageKey, JSON.stringify({
      remoteKey,
      sentAt: Date.now(),
      close: true
    }));
  }
  copy = () => {
    const js = this.js !== "" ? "```js\n" + this.js.trim() + "\n```\n" : "";
    const html = this.html !== "" ? "```html\n" + this.html.trim() + "\n```\n" : "";
    const css = this.css !== "" ? "```css\n" + this.css.trim() + "\n```\n" : "";
    navigator.clipboard.writeText(js + html + css);
  };
  toggleMaximize = () => {
    this.classList.toggle("-maximize");
  };
  get remoteKey() {
    return this.remoteId !== "" ? this.prefix + "-" + this.remoteId : this.prefix + "-" + this.uuid;
  }
  remoteChange = (event) => {
    const data = localStorage.getItem(this.storageKey);
    if (event instanceof StorageEvent && event.key !== this.storageKey) {
      return;
    }
    if (data === null) {
      return;
    }
    const { remoteKey, sentAt, css, html, js, close } = JSON.parse(data);
    if (sentAt <= this.lastUpdate) {
      return;
    }
    if (remoteKey !== this.remoteKey) {
      return;
    }
    if (close === true) {
      window.close();
    }
    console.log("received new code", sentAt, this.lastUpdate);
    this.lastUpdate = sentAt;
    this.css = css;
    this.html = html;
    this.js = js;
    this.refresh();
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
    const { storageKey, remoteKey, css, html, js, uuid, prefix } = this;
    const href = location.href.split("?")[0] + `?${prefix}=${uuid}`;
    localStorage.setItem(storageKey, JSON.stringify({
      remoteKey,
      sentAt: Date.now(),
      css,
      html,
      js
    }));
    window.open(href);
  };
  refreshRemote = () => {
    const { remoteKey, css, html, js } = this;
    localStorage.setItem(this.storageKey, JSON.stringify({ remoteKey, sentAt: Date.now(), css, html, js }));
  };
  updateSources = () => {
    if (this.persistToDom) {
      const { sources } = this.parts;
      sources.innerText = "";
      for (const language of ["js", "css", "html"]) {
        if (this[language]) {
          sources.append(pre({ class: `language-${language}`, innerHTML: this[language] }));
        }
      }
    }
  };
  refresh = () => {
    if (this.remoteId !== "") {
      return;
    }
    const { example, style: style2 } = this.parts;
    const preview = div7({ class: "preview" });
    preview.innerHTML = this.html;
    style2.innerText = this.css;
    const oldPreview = example.querySelector(".preview");
    if (oldPreview) {
      oldPreview.replaceWith(preview);
    } else {
      example.insertBefore(preview, this.parts.exampleWidgets);
    }
    const context = { preview, ...this.context };
    try {
      const func = new AsyncFunction(...Object.keys(context), this.js);
      func(...Object.values(context)).catch((err) => console.error(err));
      if (this.persistToDom) {
        this.updateSources();
      }
    } catch (e) {
      console.error(e);
      window.alert(`Error: ${e}, the console may have more information…`);
    }
  };
  initFromElements(elements) {
    for (const element of elements) {
      element.hidden = true;
      const [mode, ...lines] = element.innerHTML.split(`
`);
      if (["js", "html", "css"].includes(mode)) {
        const minIndex = lines.filter((line) => line.trim() !== "").map((line) => line.match(/^\s*/)[0].length).sort()[0];
        const source = (minIndex > 0 ? lines.map((line) => line.substring(minIndex)) : lines).join(`
`);
        this.parts[mode].value = source;
      } else {
        const language = ["js", "html", "css"].find((language2) => element.matches(`.language-${language2}`));
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
    }
  }
  render() {
    super.render();
    if (this.remoteId !== "") {
      const data = localStorage.getItem(this.storageKey);
      if (data !== null) {
        const { remoteKey, sentAt, css, html, js } = JSON.parse(data);
        if (this.remoteKey !== remoteKey) {
          return;
        }
        this.lastUpdate = sentAt;
        this.css = css;
        this.html = html;
        this.js = js;
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
  styleSpec: {
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
    ":host .close-button": {
      position: "absolute",
      top: "0",
      right: "0",
      color: "var(--code-editors-bar-color)"
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
    }
  }
});
function makeExamplesLive(element) {
  const preElements = [...element.querySelectorAll("pre")].filter((pre2) => ["js", "html", "css", "json"].includes(pre2.innerText.split(`
`)[0]));
  for (let i = 0;i < preElements.length; i++) {
    const parts = [preElements[i]];
    while (preElements[i].nextElementSibling === preElements[i + 1]) {
      parts.push(preElements[i + 1]);
      i += 1;
    }
    const example = liveExample();
    element.insertBefore(example, parts[0]);
    example.initFromElements(parts);
  }
}
var params = new URL(window.location.href).searchParams;
var remoteId = params.get("lx");
if (remoteId) {
  document.title += " [code editor]";
  document.body.textContent = "";
  document.body.append(liveExample({ remoteId }));
}
// src/mapbox.ts
var { div: div8 } = p;

class MapBox extends M {
  coords = "65.01715565258993,25.48081004203459,12";
  content = div8({ style: { width: "100%", height: "100%" } });
  get map() {
    return this._map;
  }
  mapStyle = "mapbox://styles/mapbox/streets-v12";
  token = "";
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
    this.initAttributes("coords", "token", "mapStyle");
    if (MapBox.mapboxCSSAvailable === undefined) {
      MapBox.mapboxCSSAvailable = styleSheet("https://api.mapbox.com/mapbox-gl-js/v1.4.1/mapbox-gl.css").catch((e) => {
        console.error("failed to load mapbox-gl.css", e);
      });
      MapBox.mapboxAvailable = scriptTag("https://api.mapbox.com/mapbox-gl-js/v1.4.1/mapbox-gl.js").catch((e) => {
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
  render() {
    super.render();
    if (!this.token) {
      return;
    }
    const { div: div9 } = this.parts;
    const [long, lat, zoom] = this.coords.split(",").map((x2) => Number(x2));
    if (this.map) {
      this.map.remove();
    }
    MapBox.mapboxAvailable.then(({ mapboxgl }) => {
      console.log("%cmapbox may complain about missing css -- don't panic!", "background: orange; color: black; padding: 0 5px;");
      mapboxgl.accessToken = this.token;
      this._map = new mapboxgl.Map({
        container: div9,
        style: this.mapStyle,
        zoom,
        center: [lat, long]
      });
      this._map.on("render", () => this._map.resize());
    });
  }
}
var mapBox = MapBox.elementCreator({
  tag: "xin-map"
});
// node_modules/marked/lib/marked.esm.js
function M2() {
  return { async: false, breaks: false, extensions: null, gfm: true, hooks: null, pedantic: false, renderer: null, silent: false, tokenizer: null, walkTokens: null };
}
var w = M2();
function H2(a3) {
  w = a3;
}
var C2 = { exec: () => null };
function h2(a3, e = "") {
  let t = typeof a3 == "string" ? a3 : a3.source, n = { replace: (s, i) => {
    let r = typeof i == "string" ? i : i.source;
    return r = r.replace(m2.caret, "$1"), t = t.replace(s, r), n;
  }, getRegex: () => new RegExp(t, e) };
  return n;
}
var m2 = { codeRemoveIndent: /^(?: {1,4}| {0,3}\t)/gm, outputLinkReplace: /\\([\[\]])/g, indentCodeCompensation: /^(\s+)(?:```)/, beginningSpace: /^\s+/, endingHash: /#$/, startingSpaceChar: /^ /, endingSpaceChar: / $/, nonSpaceChar: /[^ ]/, newLineCharGlobal: /\n/g, tabCharGlobal: /\t/g, multipleSpaceGlobal: /\s+/g, blankLine: /^[ \t]*$/, doubleBlankLine: /\n[ \t]*\n[ \t]*$/, blockquoteStart: /^ {0,3}>/, blockquoteSetextReplace: /\n {0,3}((?:=+|-+) *)(?=\n|$)/g, blockquoteSetextReplace2: /^ {0,3}>[ \t]?/gm, listReplaceTabs: /^\t+/, listReplaceNesting: /^ {1,4}(?=( {4})*[^ ])/g, listIsTask: /^\[[ xX]\] /, listReplaceTask: /^\[[ xX]\] +/, anyLine: /\n.*\n/, hrefBrackets: /^<(.*)>$/, tableDelimiter: /[:|]/, tableAlignChars: /^\||\| *$/g, tableRowBlankLine: /\n[ \t]*$/, tableAlignRight: /^ *-+: *$/, tableAlignCenter: /^ *:-+: *$/, tableAlignLeft: /^ *:-+ *$/, startATag: /^<a /i, endATag: /^<\/a>/i, startPreScriptTag: /^<(pre|code|kbd|script)(\s|>)/i, endPreScriptTag: /^<\/(pre|code|kbd|script)(\s|>)/i, startAngleBracket: /^</, endAngleBracket: />$/, pedanticHrefTitle: /^([^'"]*[^\s])\s+(['"])(.*)\2/, unicodeAlphaNumeric: /[\p{L}\p{N}]/u, escapeTest: /[&<>"']/, escapeReplace: /[&<>"']/g, escapeTestNoEncode: /[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/, escapeReplaceNoEncode: /[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/g, unescapeTest: /&(#(?:\d+)|(?:#x[0-9A-Fa-f]+)|(?:\w+));?/ig, caret: /(^|[^\[])\^/g, percentDecode: /%25/g, findPipe: /\|/g, splitPipe: / \|/, slashPipe: /\\\|/g, carriageReturn: /\r\n|\r/g, spaceLine: /^ +$/gm, notSpaceStart: /^\S*/, endingNewline: /\n$/, listItemRegex: (a3) => new RegExp(`^( {0,3}${a3})((?:[	 ][^\\n]*)?(?:\\n|$))`), nextBulletRegex: (a3) => new RegExp(`^ {0,${Math.min(3, a3 - 1)}}(?:[*+-]|\\d{1,9}[.)])((?:[ 	][^\\n]*)?(?:\\n|$))`), hrRegex: (a3) => new RegExp(`^ {0,${Math.min(3, a3 - 1)}}((?:- *){3,}|(?:_ *){3,}|(?:\\* *){3,})(?:\\n+|$)`), fencesBeginRegex: (a3) => new RegExp(`^ {0,${Math.min(3, a3 - 1)}}(?:\`\`\`|~~~)`), headingBeginRegex: (a3) => new RegExp(`^ {0,${Math.min(3, a3 - 1)}}#`), htmlBeginRegex: (a3) => new RegExp(`^ {0,${Math.min(3, a3 - 1)}}<(?:[a-z].*>|!--)`, "i") };
var xe2 = /^(?:[ \t]*(?:\n|$))+/;
var be2 = /^((?: {4}| {0,3}\t)[^\n]+(?:\n(?:[ \t]*(?:\n|$))*)?)+/;
var Te2 = /^ {0,3}(`{3,}(?=[^`\n]*(?:\n|$))|~{3,})([^\n]*)(?:\n|$)(?:|([\s\S]*?)(?:\n|$))(?: {0,3}\1[~`]* *(?=\n|$)|$)/;
var I2 = /^ {0,3}((?:-[\t ]*){3,}|(?:_[ \t]*){3,}|(?:\*[ \t]*){3,})(?:\n+|$)/;
var we2 = /^ {0,3}(#{1,6})(?=\s|$)(.*)(?:\n+|$)/;
var j2 = /(?:[*+-]|\d{1,9}[.)])/;
var re2 = /^(?!bull |blockCode|fences|blockquote|heading|html|table)((?:.|\n(?!\s*?\n|bull |blockCode|fences|blockquote|heading|html|table))+?)\n {0,3}(=+|-+) *(?:\n+|$)/;
var ie2 = h2(re2).replace(/bull/g, j2).replace(/blockCode/g, /(?: {4}| {0,3}\t)/).replace(/fences/g, / {0,3}(?:`{3,}|~{3,})/).replace(/blockquote/g, / {0,3}>/).replace(/heading/g, / {0,3}#{1,6}/).replace(/html/g, / {0,3}<[^\n>]+>\n/).replace(/\|table/g, "").getRegex();
var ye2 = h2(re2).replace(/bull/g, j2).replace(/blockCode/g, /(?: {4}| {0,3}\t)/).replace(/fences/g, / {0,3}(?:`{3,}|~{3,})/).replace(/blockquote/g, / {0,3}>/).replace(/heading/g, / {0,3}#{1,6}/).replace(/html/g, / {0,3}<[^\n>]+>\n/).replace(/table/g, / {0,3}\|?(?:[:\- ]*\|)+[\:\- ]*\n/).getRegex();
var F2 = /^([^\n]+(?:\n(?!hr|heading|lheading|blockquote|fences|list|html|table| +\n)[^\n]+)*)/;
var Re2 = /^[^\n]+/;
var Q2 = /(?!\s*\])(?:\\.|[^\[\]\\])+/;
var Se2 = h2(/^ {0,3}\[(label)\]: *(?:\n[ \t]*)?([^<\s][^\s]*|<.*?>)(?:(?: +(?:\n[ \t]*)?| *\n[ \t]*)(title))? *(?:\n+|$)/).replace("label", Q2).replace("title", /(?:"(?:\\"?|[^"\\])*"|'[^'\n]*(?:\n[^'\n]+)*\n?'|\([^()]*\))/).getRegex();
var $e2 = h2(/^( {0,3}bull)([ \t][^\n]+?)?(?:\n|$)/).replace(/bull/g, j2).getRegex();
var v2 = "address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|meta|nav|noframes|ol|optgroup|option|p|param|search|section|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul";
var U2 = /<!--(?:-?>|[\s\S]*?(?:-->|$))/;
var _e2 = h2("^ {0,3}(?:<(script|pre|style|textarea)[\\s>][\\s\\S]*?(?:</\\1>[^\\n]*\\n+|$)|comment[^\\n]*(\\n+|$)|<\\?[\\s\\S]*?(?:\\?>\\n*|$)|<![A-Z][\\s\\S]*?(?:>\\n*|$)|<!\\[CDATA\\[[\\s\\S]*?(?:\\]\\]>\\n*|$)|</?(tag)(?: +|\\n|/?>)[\\s\\S]*?(?:(?:\\n[ \t]*)+\\n|$)|<(?!script|pre|style|textarea)([a-z][\\w-]*)(?:attribute)*? */?>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n[ \t]*)+\\n|$)|</(?!script|pre|style|textarea)[a-z][\\w-]*\\s*>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$))", "i").replace("comment", U2).replace("tag", v2).replace("attribute", / +[a-zA-Z:_][\w.:-]*(?: *= *"[^"\n]*"| *= *'[^'\n]*'| *= *[^\s"'=<>`]+)?/).getRegex();
var oe2 = h2(F2).replace("hr", I2).replace("heading", " {0,3}#{1,6}(?:\\s|$)").replace("|lheading", "").replace("|table", "").replace("blockquote", " {0,3}>").replace("fences", " {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list", " {0,3}(?:[*+-]|1[.)]) ").replace("html", "</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag", v2).getRegex();
var Le2 = h2(/^( {0,3}> ?(paragraph|[^\n]*)(?:\n|$))+/).replace("paragraph", oe2).getRegex();
var K = { blockquote: Le2, code: be2, def: Se2, fences: Te2, heading: we2, hr: I2, html: _e2, lheading: ie2, list: $e2, newline: xe2, paragraph: oe2, table: C2, text: Re2 };
var se2 = h2("^ *([^\\n ].*)\\n {0,3}((?:\\| *)?:?-+:? *(?:\\| *:?-+:? *)*(?:\\| *)?)(?:\\n((?:(?! *\\n|hr|heading|blockquote|code|fences|list|html).*(?:\\n|$))*)\\n*|$)").replace("hr", I2).replace("heading", " {0,3}#{1,6}(?:\\s|$)").replace("blockquote", " {0,3}>").replace("code", "(?: {4}| {0,3}\t)[^\\n]").replace("fences", " {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list", " {0,3}(?:[*+-]|1[.)]) ").replace("html", "</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag", v2).getRegex();
var ze2 = { ...K, lheading: ye2, table: se2, paragraph: h2(F2).replace("hr", I2).replace("heading", " {0,3}#{1,6}(?:\\s|$)").replace("|lheading", "").replace("table", se2).replace("blockquote", " {0,3}>").replace("fences", " {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list", " {0,3}(?:[*+-]|1[.)]) ").replace("html", "</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag", v2).getRegex() };
var Me2 = { ...K, html: h2(`^ *(?:comment *(?:\\n|\\s*$)|<(tag)[\\s\\S]+?</\\1> *(?:\\n{2,}|\\s*$)|<tag(?:"[^"]*"|'[^']*'|\\s[^'"/>\\s]*)*?/?> *(?:\\n{2,}|\\s*$))`).replace("comment", U2).replace(/tag/g, "(?!(?:a|em|strong|small|s|cite|q|dfn|abbr|data|time|code|var|samp|kbd|sub|sup|i|b|u|mark|ruby|rt|rp|bdi|bdo|span|br|wbr|ins|del|img)\\b)\\w+(?!:|[^\\w\\s@]*@)\\b").getRegex(), def: /^ *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +(["(][^\n]+[")]))? *(?:\n+|$)/, heading: /^(#{1,6})(.*)(?:\n+|$)/, fences: C2, lheading: /^(.+?)\n {0,3}(=+|-+) *(?:\n+|$)/, paragraph: h2(F2).replace("hr", I2).replace("heading", ` *#{1,6} *[^
]`).replace("lheading", ie2).replace("|table", "").replace("blockquote", " {0,3}>").replace("|fences", "").replace("|list", "").replace("|html", "").replace("|tag", "").getRegex() };
var Pe2 = /^\\([!"#$%&'()*+,\-./:;<=>?@\[\]\\^_`{|}~])/;
var Ae2 = /^(`+)([^`]|[^`][\s\S]*?[^`])\1(?!`)/;
var le2 = /^( {2,}|\\)\n(?!\s*$)/;
var Ee2 = /^(`+|[^`])(?:(?= {2,}\n)|[\s\S]*?(?:(?=[\\<!\[`*_]|\b_|$)|[^ ](?= {2,}\n)))/;
var D = /[\p{P}\p{S}]/u;
var X = /[\s\p{P}\p{S}]/u;
var ae2 = /[^\s\p{P}\p{S}]/u;
var Ce2 = h2(/^((?![*_])punctSpace)/, "u").replace(/punctSpace/g, X).getRegex();
var ce2 = /(?!~)[\p{P}\p{S}]/u;
var Ie2 = /(?!~)[\s\p{P}\p{S}]/u;
var Oe2 = /(?:[^\s\p{P}\p{S}]|~)/u;
var Be2 = /\[[^[\]]*?\]\((?:\\.|[^\\\(\)]|\((?:\\.|[^\\\(\)])*\))*\)|`[^`]*?`|<[^<>]*?>/g;
var pe2 = /^(?:\*+(?:((?!\*)punct)|[^\s*]))|^_+(?:((?!_)punct)|([^\s_]))/;
var qe2 = h2(pe2, "u").replace(/punct/g, D).getRegex();
var ve2 = h2(pe2, "u").replace(/punct/g, ce2).getRegex();
var ue2 = "^[^_*]*?__[^_*]*?\\*[^_*]*?(?=__)|[^*]+(?=[^*])|(?!\\*)punct(\\*+)(?=[\\s]|$)|notPunctSpace(\\*+)(?!\\*)(?=punctSpace|$)|(?!\\*)punctSpace(\\*+)(?=notPunctSpace)|[\\s](\\*+)(?!\\*)(?=punct)|(?!\\*)punct(\\*+)(?!\\*)(?=punct)|notPunctSpace(\\*+)(?=notPunctSpace)";
var De2 = h2(ue2, "gu").replace(/notPunctSpace/g, ae2).replace(/punctSpace/g, X).replace(/punct/g, D).getRegex();
var Ze2 = h2(ue2, "gu").replace(/notPunctSpace/g, Oe2).replace(/punctSpace/g, Ie2).replace(/punct/g, ce2).getRegex();
var Ge2 = h2("^[^_*]*?\\*\\*[^_*]*?_[^_*]*?(?=\\*\\*)|[^_]+(?=[^_])|(?!_)punct(_+)(?=[\\s]|$)|notPunctSpace(_+)(?!_)(?=punctSpace|$)|(?!_)punctSpace(_+)(?=notPunctSpace)|[\\s](_+)(?!_)(?=punct)|(?!_)punct(_+)(?!_)(?=punct)", "gu").replace(/notPunctSpace/g, ae2).replace(/punctSpace/g, X).replace(/punct/g, D).getRegex();
var He2 = h2(/\\(punct)/, "gu").replace(/punct/g, D).getRegex();
var Ne2 = h2(/^<(scheme:[^\s\x00-\x1f<>]*|email)>/).replace("scheme", /[a-zA-Z][a-zA-Z0-9+.-]{1,31}/).replace("email", /[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+(@)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+(?![-_])/).getRegex();
var je2 = h2(U2).replace("(?:-->|$)", "-->").getRegex();
var Fe2 = h2("^comment|^</[a-zA-Z][\\w:-]*\\s*>|^<[a-zA-Z][\\w-]*(?:attribute)*?\\s*/?>|^<\\?[\\s\\S]*?\\?>|^<![a-zA-Z]+\\s[\\s\\S]*?>|^<!\\[CDATA\\[[\\s\\S]*?\\]\\]>").replace("comment", je2).replace("attribute", /\s+[a-zA-Z:_][\w.:-]*(?:\s*=\s*"[^"]*"|\s*=\s*'[^']*'|\s*=\s*[^\s"'=<>`]+)?/).getRegex();
var q2 = /(?:\[(?:\\.|[^\[\]\\])*\]|\\.|`[^`]*`|[^\[\]\\`])*?/;
var Qe2 = h2(/^!?\[(label)\]\(\s*(href)(?:(?:[ \t]*(?:\n[ \t]*)?)(title))?\s*\)/).replace("label", q2).replace("href", /<(?:\\.|[^\n<>\\])+>|[^ \t\n\x00-\x1f]*/).replace("title", /"(?:\\"?|[^"\\])*"|'(?:\\'?|[^'\\])*'|\((?:\\\)?|[^)\\])*\)/).getRegex();
var he = h2(/^!?\[(label)\]\[(ref)\]/).replace("label", q2).replace("ref", Q2).getRegex();
var ke2 = h2(/^!?\[(ref)\](?:\[\])?/).replace("ref", Q2).getRegex();
var Ue2 = h2("reflink|nolink(?!\\()", "g").replace("reflink", he).replace("nolink", ke2).getRegex();
var W2 = { _backpedal: C2, anyPunctuation: He2, autolink: Ne2, blockSkip: Be2, br: le2, code: Ae2, del: C2, emStrongLDelim: qe2, emStrongRDelimAst: De2, emStrongRDelimUnd: Ge2, escape: Pe2, link: Qe2, nolink: ke2, punctuation: Ce2, reflink: he, reflinkSearch: Ue2, tag: Fe2, text: Ee2, url: C2 };
var Ke2 = { ...W2, link: h2(/^!?\[(label)\]\((.*?)\)/).replace("label", q2).getRegex(), reflink: h2(/^!?\[(label)\]\s*\[([^\]]*)\]/).replace("label", q2).getRegex() };
var N2 = { ...W2, emStrongRDelimAst: Ze2, emStrongLDelim: ve2, url: h2(/^((?:ftp|https?):\/\/|www\.)(?:[a-zA-Z0-9\-]+\.?)+[^\s<]*|^email/, "i").replace("email", /[A-Za-z0-9._+-]+(@)[a-zA-Z0-9-_]+(?:\.[a-zA-Z0-9-_]*[a-zA-Z0-9])+(?![-_])/).getRegex(), _backpedal: /(?:[^?!.,:;*_'"~()&]+|\([^)]*\)|&(?![a-zA-Z0-9]+;$)|[?!.,:;*_'"~)]+(?!$))+/, del: /^(~~?)(?=[^\s~])((?:\\.|[^\\])*?(?:\\.|[^\s~\\]))\1(?=[^~]|$)/, text: /^([`~]+|[^`~])(?:(?= {2,}\n)|(?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)|[\s\S]*?(?:(?=[\\<!\[`*~_]|\b_|https?:\/\/|ftp:\/\/|www\.|$)|[^ ](?= {2,}\n)|[^a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-](?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)))/ };
var Xe2 = { ...N2, br: h2(le2).replace("{2,}", "*").getRegex(), text: h2(N2.text).replace("\\b_", "\\b_| {2,}\\n").replace(/\{2,\}/g, "*").getRegex() };
var O2 = { normal: K, gfm: ze2, pedantic: Me2 };
var P = { normal: W2, gfm: N2, breaks: Xe2, pedantic: Ke2 };
var We2 = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
var ge2 = (a3) => We2[a3];
function R(a3, e) {
  if (e) {
    if (m2.escapeTest.test(a3))
      return a3.replace(m2.escapeReplace, ge2);
  } else if (m2.escapeTestNoEncode.test(a3))
    return a3.replace(m2.escapeReplaceNoEncode, ge2);
  return a3;
}
function J2(a3) {
  try {
    a3 = encodeURI(a3).replace(m2.percentDecode, "%");
  } catch {
    return null;
  }
  return a3;
}
function V2(a3, e) {
  let t = a3.replace(m2.findPipe, (i, r, o) => {
    let l = false, c = r;
    for (;--c >= 0 && o[c] === "\\"; )
      l = !l;
    return l ? "|" : " |";
  }), n = t.split(m2.splitPipe), s = 0;
  if (n[0].trim() || n.shift(), n.length > 0 && !n.at(-1)?.trim() && n.pop(), e)
    if (n.length > e)
      n.splice(e);
    else
      for (;n.length < e; )
        n.push("");
  for (;s < n.length; s++)
    n[s] = n[s].trim().replace(m2.slashPipe, "|");
  return n;
}
function A(a3, e, t) {
  let n = a3.length;
  if (n === 0)
    return "";
  let s = 0;
  for (;s < n; ) {
    let i = a3.charAt(n - s - 1);
    if (i === e && !t)
      s++;
    else if (i !== e && t)
      s++;
    else
      break;
  }
  return a3.slice(0, n - s);
}
function fe2(a3, e) {
  if (a3.indexOf(e[1]) === -1)
    return -1;
  let t = 0;
  for (let n = 0;n < a3.length; n++)
    if (a3[n] === "\\")
      n++;
    else if (a3[n] === e[0])
      t++;
    else if (a3[n] === e[1] && (t--, t < 0))
      return n;
  return t > 0 ? -2 : -1;
}
function de2(a3, e, t, n, s) {
  let i = e.href, r = e.title || null, o = a3[1].replace(s.other.outputLinkReplace, "$1");
  n.state.inLink = true;
  let l = { type: a3[0].charAt(0) === "!" ? "image" : "link", raw: t, href: i, title: r, text: o, tokens: n.inlineTokens(o) };
  return n.state.inLink = false, l;
}
function Je2(a3, e, t) {
  let n = a3.match(t.other.indentCodeCompensation);
  if (n === null)
    return e;
  let s = n[1];
  return e.split(`
`).map((i) => {
    let r = i.match(t.other.beginningSpace);
    if (r === null)
      return i;
    let [o] = r;
    return o.length >= s.length ? i.slice(s.length) : i;
  }).join(`
`);
}
var S2 = class {
  options;
  rules;
  lexer;
  constructor(e) {
    this.options = e || w;
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
      return { type: "code", raw: t[0], codeBlockStyle: "indented", text: this.options.pedantic ? n : A(n, `
`) };
    }
  }
  fences(e) {
    let t = this.rules.block.fences.exec(e);
    if (t) {
      let n = t[0], s = Je2(n, t[3] || "", this.rules);
      return { type: "code", raw: n, lang: t[2] ? t[2].trim().replace(this.rules.inline.anyPunctuation, "$1") : t[2], text: s };
    }
  }
  heading(e) {
    let t = this.rules.block.heading.exec(e);
    if (t) {
      let n = t[2].trim();
      if (this.rules.other.endingHash.test(n)) {
        let s = A(n, "#");
        (this.options.pedantic || !s || this.rules.other.endingSpaceChar.test(s)) && (n = s.trim());
      }
      return { type: "heading", raw: t[0], depth: t[1].length, text: n, tokens: this.lexer.inline(n) };
    }
  }
  hr(e) {
    let t = this.rules.block.hr.exec(e);
    if (t)
      return { type: "hr", raw: A(t[0], `
`) };
  }
  blockquote(e) {
    let t = this.rules.block.blockquote.exec(e);
    if (t) {
      let n = A(t[0], `
`).split(`
`), s = "", i = "", r = [];
      for (;n.length > 0; ) {
        let o = false, l = [], c;
        for (c = 0;c < n.length; c++)
          if (this.rules.other.blockquoteStart.test(n[c]))
            l.push(n[c]), o = true;
          else if (!o)
            l.push(n[c]);
          else
            break;
        n = n.slice(c);
        let p2 = l.join(`
`), u = p2.replace(this.rules.other.blockquoteSetextReplace, `
    $1`).replace(this.rules.other.blockquoteSetextReplace2, "");
        s = s ? `${s}
${p2}` : p2, i = i ? `${i}
${u}` : u;
        let d2 = this.lexer.state.top;
        if (this.lexer.state.top = true, this.lexer.blockTokens(u, r, true), this.lexer.state.top = d2, n.length === 0)
          break;
        let g2 = r.at(-1);
        if (g2?.type === "code")
          break;
        if (g2?.type === "blockquote") {
          let x2 = g2, f = x2.raw + `
` + n.join(`
`), y = this.blockquote(f);
          r[r.length - 1] = y, s = s.substring(0, s.length - x2.raw.length) + y.raw, i = i.substring(0, i.length - x2.text.length) + y.text;
          break;
        } else if (g2?.type === "list") {
          let x2 = g2, f = x2.raw + `
` + n.join(`
`), y = this.list(f);
          r[r.length - 1] = y, s = s.substring(0, s.length - g2.raw.length) + y.raw, i = i.substring(0, i.length - x2.raw.length) + y.raw, n = f.substring(r.at(-1).raw.length).split(`
`);
          continue;
        }
      }
      return { type: "blockquote", raw: s, tokens: r, text: i };
    }
  }
  list(e) {
    let t = this.rules.block.list.exec(e);
    if (t) {
      let n = t[1].trim(), s = n.length > 1, i = { type: "list", raw: "", ordered: s, start: s ? +n.slice(0, -1) : "", loose: false, items: [] };
      n = s ? `\\d{1,9}\\${n.slice(-1)}` : `\\${n}`, this.options.pedantic && (n = s ? n : "[*+-]");
      let r = this.rules.other.listItemRegex(n), o = false;
      for (;e; ) {
        let c = false, p2 = "", u = "";
        if (!(t = r.exec(e)) || this.rules.block.hr.test(e))
          break;
        p2 = t[0], e = e.substring(p2.length);
        let d2 = t[2].split(`
`, 1)[0].replace(this.rules.other.listReplaceTabs, (Z2) => " ".repeat(3 * Z2.length)), g2 = e.split(`
`, 1)[0], x2 = !d2.trim(), f = 0;
        if (this.options.pedantic ? (f = 2, u = d2.trimStart()) : x2 ? f = t[1].length + 1 : (f = t[2].search(this.rules.other.nonSpaceChar), f = f > 4 ? 1 : f, u = d2.slice(f), f += t[1].length), x2 && this.rules.other.blankLine.test(g2) && (p2 += g2 + `
`, e = e.substring(g2.length + 1), c = true), !c) {
          let Z2 = this.rules.other.nextBulletRegex(f), ee2 = this.rules.other.hrRegex(f), te2 = this.rules.other.fencesBeginRegex(f), ne2 = this.rules.other.headingBeginRegex(f), me2 = this.rules.other.htmlBeginRegex(f);
          for (;e; ) {
            let G2 = e.split(`
`, 1)[0], E2;
            if (g2 = G2, this.options.pedantic ? (g2 = g2.replace(this.rules.other.listReplaceNesting, "  "), E2 = g2) : E2 = g2.replace(this.rules.other.tabCharGlobal, "    "), te2.test(g2) || ne2.test(g2) || me2.test(g2) || Z2.test(g2) || ee2.test(g2))
              break;
            if (E2.search(this.rules.other.nonSpaceChar) >= f || !g2.trim())
              u += `
` + E2.slice(f);
            else {
              if (x2 || d2.replace(this.rules.other.tabCharGlobal, "    ").search(this.rules.other.nonSpaceChar) >= 4 || te2.test(d2) || ne2.test(d2) || ee2.test(d2))
                break;
              u += `
` + g2;
            }
            !x2 && !g2.trim() && (x2 = true), p2 += G2 + `
`, e = e.substring(G2.length + 1), d2 = E2.slice(f);
          }
        }
        i.loose || (o ? i.loose = true : this.rules.other.doubleBlankLine.test(p2) && (o = true));
        let y = null, Y2;
        this.options.gfm && (y = this.rules.other.listIsTask.exec(u), y && (Y2 = y[0] !== "[ ] ", u = u.replace(this.rules.other.listReplaceTask, ""))), i.items.push({ type: "list_item", raw: p2, task: !!y, checked: Y2, loose: false, text: u, tokens: [] }), i.raw += p2;
      }
      let l = i.items.at(-1);
      if (l)
        l.raw = l.raw.trimEnd(), l.text = l.text.trimEnd();
      else
        return;
      i.raw = i.raw.trimEnd();
      for (let c = 0;c < i.items.length; c++)
        if (this.lexer.state.top = false, i.items[c].tokens = this.lexer.blockTokens(i.items[c].text, []), !i.loose) {
          let p2 = i.items[c].tokens.filter((d2) => d2.type === "space"), u = p2.length > 0 && p2.some((d2) => this.rules.other.anyLine.test(d2.raw));
          i.loose = u;
        }
      if (i.loose)
        for (let c = 0;c < i.items.length; c++)
          i.items[c].loose = true;
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
      let n = t[1].toLowerCase().replace(this.rules.other.multipleSpaceGlobal, " "), s = t[2] ? t[2].replace(this.rules.other.hrefBrackets, "$1").replace(this.rules.inline.anyPunctuation, "$1") : "", i = t[3] ? t[3].substring(1, t[3].length - 1).replace(this.rules.inline.anyPunctuation, "$1") : t[3];
      return { type: "def", tag: n, raw: t[0], href: s, title: i };
    }
  }
  table(e) {
    let t = this.rules.block.table.exec(e);
    if (!t || !this.rules.other.tableDelimiter.test(t[2]))
      return;
    let n = V2(t[1]), s = t[2].replace(this.rules.other.tableAlignChars, "").split("|"), i = t[3]?.trim() ? t[3].replace(this.rules.other.tableRowBlankLine, "").split(`
`) : [], r = { type: "table", raw: t[0], header: [], align: [], rows: [] };
    if (n.length === s.length) {
      for (let o of s)
        this.rules.other.tableAlignRight.test(o) ? r.align.push("right") : this.rules.other.tableAlignCenter.test(o) ? r.align.push("center") : this.rules.other.tableAlignLeft.test(o) ? r.align.push("left") : r.align.push(null);
      for (let o = 0;o < n.length; o++)
        r.header.push({ text: n[o], tokens: this.lexer.inline(n[o]), header: true, align: r.align[o] });
      for (let o of i)
        r.rows.push(V2(o, r.header.length).map((l, c) => ({ text: l, tokens: this.lexer.inline(l), header: false, align: r.align[c] })));
      return r;
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
        let r = A(n.slice(0, -1), "\\");
        if ((n.length - r.length) % 2 === 0)
          return;
      } else {
        let r = fe2(t[2], "()");
        if (r === -2)
          return;
        if (r > -1) {
          let l = (t[0].indexOf("!") === 0 ? 5 : 4) + t[1].length + r;
          t[2] = t[2].substring(0, r), t[0] = t[0].substring(0, l).trim(), t[3] = "";
        }
      }
      let s = t[2], i = "";
      if (this.options.pedantic) {
        let r = this.rules.other.pedanticHrefTitle.exec(s);
        r && (s = r[1], i = r[3]);
      } else
        i = t[3] ? t[3].slice(1, -1) : "";
      return s = s.trim(), this.rules.other.startAngleBracket.test(s) && (this.options.pedantic && !this.rules.other.endAngleBracket.test(n) ? s = s.slice(1) : s = s.slice(1, -1)), de2(t, { href: s && s.replace(this.rules.inline.anyPunctuation, "$1"), title: i && i.replace(this.rules.inline.anyPunctuation, "$1") }, t[0], this.lexer, this.rules);
    }
  }
  reflink(e, t) {
    let n;
    if ((n = this.rules.inline.reflink.exec(e)) || (n = this.rules.inline.nolink.exec(e))) {
      let s = (n[2] || n[1]).replace(this.rules.other.multipleSpaceGlobal, " "), i = t[s.toLowerCase()];
      if (!i) {
        let r = n[0].charAt(0);
        return { type: "text", raw: r, text: r };
      }
      return de2(n, i, n[0], this.lexer, this.rules);
    }
  }
  emStrong(e, t, n = "") {
    let s = this.rules.inline.emStrongLDelim.exec(e);
    if (!s || s[3] && n.match(this.rules.other.unicodeAlphaNumeric))
      return;
    if (!(s[1] || s[2] || "") || !n || this.rules.inline.punctuation.exec(n)) {
      let r = [...s[0]].length - 1, o, l, c = r, p2 = 0, u = s[0][0] === "*" ? this.rules.inline.emStrongRDelimAst : this.rules.inline.emStrongRDelimUnd;
      for (u.lastIndex = 0, t = t.slice(-1 * e.length + r);(s = u.exec(t)) != null; ) {
        if (o = s[1] || s[2] || s[3] || s[4] || s[5] || s[6], !o)
          continue;
        if (l = [...o].length, s[3] || s[4]) {
          c += l;
          continue;
        } else if ((s[5] || s[6]) && r % 3 && !((r + l) % 3)) {
          p2 += l;
          continue;
        }
        if (c -= l, c > 0)
          continue;
        l = Math.min(l, l + c + p2);
        let d2 = [...s[0]][0].length, g2 = e.slice(0, r + s.index + d2 + l);
        if (Math.min(r, l) % 2) {
          let f = g2.slice(1, -1);
          return { type: "em", raw: g2, text: f, tokens: this.lexer.inlineTokens(f) };
        }
        let x2 = g2.slice(2, -2);
        return { type: "strong", raw: g2, text: x2, tokens: this.lexer.inlineTokens(x2) };
      }
    }
  }
  codespan(e) {
    let t = this.rules.inline.code.exec(e);
    if (t) {
      let n = t[2].replace(this.rules.other.newLineCharGlobal, " "), s = this.rules.other.nonSpaceChar.test(n), i = this.rules.other.startingSpaceChar.test(n) && this.rules.other.endingSpaceChar.test(n);
      return s && i && (n = n.substring(1, n.length - 1)), { type: "codespan", raw: t[0], text: n };
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
      let n, s;
      return t[2] === "@" ? (n = t[1], s = "mailto:" + n) : (n = t[1], s = n), { type: "link", raw: t[0], text: n, href: s, tokens: [{ type: "text", raw: n, text: n }] };
    }
  }
  url(e) {
    let t;
    if (t = this.rules.inline.url.exec(e)) {
      let n, s;
      if (t[2] === "@")
        n = t[0], s = "mailto:" + n;
      else {
        let i;
        do
          i = t[0], t[0] = this.rules.inline._backpedal.exec(t[0])?.[0] ?? "";
        while (i !== t[0]);
        n = t[0], t[1] === "www." ? s = "http://" + t[0] : s = t[0];
      }
      return { type: "link", raw: t[0], text: n, href: s, tokens: [{ type: "text", raw: n, text: n }] };
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
var b2 = class a3 {
  tokens;
  options;
  state;
  tokenizer;
  inlineQueue;
  constructor(e) {
    this.tokens = [], this.tokens.links = Object.create(null), this.options = e || w, this.options.tokenizer = this.options.tokenizer || new S2, this.tokenizer = this.options.tokenizer, this.tokenizer.options = this.options, this.tokenizer.lexer = this, this.inlineQueue = [], this.state = { inLink: false, inRawBlock: false, top: true };
    let t = { other: m2, block: O2.normal, inline: P.normal };
    this.options.pedantic ? (t.block = O2.pedantic, t.inline = P.pedantic) : this.options.gfm && (t.block = O2.gfm, this.options.breaks ? t.inline = P.breaks : t.inline = P.gfm), this.tokenizer.rules = t;
  }
  static get rules() {
    return { block: O2, inline: P };
  }
  static lex(e, t) {
    return new a3(t).lex(e);
  }
  static lexInline(e, t) {
    return new a3(t).inlineTokens(e);
  }
  lex(e) {
    e = e.replace(m2.carriageReturn, `
`), this.blockTokens(e, this.tokens);
    for (let t = 0;t < this.inlineQueue.length; t++) {
      let n = this.inlineQueue[t];
      this.inlineTokens(n.src, n.tokens);
    }
    return this.inlineQueue = [], this.tokens;
  }
  blockTokens(e, t = [], n = false) {
    for (this.options.pedantic && (e = e.replace(m2.tabCharGlobal, "    ").replace(m2.spaceLine, ""));e; ) {
      let s;
      if (this.options.extensions?.block?.some((r) => (s = r.call({ lexer: this }, e, t)) ? (e = e.substring(s.raw.length), t.push(s), true) : false))
        continue;
      if (s = this.tokenizer.space(e)) {
        e = e.substring(s.raw.length);
        let r = t.at(-1);
        s.raw.length === 1 && r !== undefined ? r.raw += `
` : t.push(s);
        continue;
      }
      if (s = this.tokenizer.code(e)) {
        e = e.substring(s.raw.length);
        let r = t.at(-1);
        r?.type === "paragraph" || r?.type === "text" ? (r.raw += `
` + s.raw, r.text += `
` + s.text, this.inlineQueue.at(-1).src = r.text) : t.push(s);
        continue;
      }
      if (s = this.tokenizer.fences(e)) {
        e = e.substring(s.raw.length), t.push(s);
        continue;
      }
      if (s = this.tokenizer.heading(e)) {
        e = e.substring(s.raw.length), t.push(s);
        continue;
      }
      if (s = this.tokenizer.hr(e)) {
        e = e.substring(s.raw.length), t.push(s);
        continue;
      }
      if (s = this.tokenizer.blockquote(e)) {
        e = e.substring(s.raw.length), t.push(s);
        continue;
      }
      if (s = this.tokenizer.list(e)) {
        e = e.substring(s.raw.length), t.push(s);
        continue;
      }
      if (s = this.tokenizer.html(e)) {
        e = e.substring(s.raw.length), t.push(s);
        continue;
      }
      if (s = this.tokenizer.def(e)) {
        e = e.substring(s.raw.length);
        let r = t.at(-1);
        r?.type === "paragraph" || r?.type === "text" ? (r.raw += `
` + s.raw, r.text += `
` + s.raw, this.inlineQueue.at(-1).src = r.text) : this.tokens.links[s.tag] || (this.tokens.links[s.tag] = { href: s.href, title: s.title });
        continue;
      }
      if (s = this.tokenizer.table(e)) {
        e = e.substring(s.raw.length), t.push(s);
        continue;
      }
      if (s = this.tokenizer.lheading(e)) {
        e = e.substring(s.raw.length), t.push(s);
        continue;
      }
      let i = e;
      if (this.options.extensions?.startBlock) {
        let r = 1 / 0, o = e.slice(1), l;
        this.options.extensions.startBlock.forEach((c) => {
          l = c.call({ lexer: this }, o), typeof l == "number" && l >= 0 && (r = Math.min(r, l));
        }), r < 1 / 0 && r >= 0 && (i = e.substring(0, r + 1));
      }
      if (this.state.top && (s = this.tokenizer.paragraph(i))) {
        let r = t.at(-1);
        n && r?.type === "paragraph" ? (r.raw += `
` + s.raw, r.text += `
` + s.text, this.inlineQueue.pop(), this.inlineQueue.at(-1).src = r.text) : t.push(s), n = i.length !== e.length, e = e.substring(s.raw.length);
        continue;
      }
      if (s = this.tokenizer.text(e)) {
        e = e.substring(s.raw.length);
        let r = t.at(-1);
        r?.type === "text" ? (r.raw += `
` + s.raw, r.text += `
` + s.text, this.inlineQueue.pop(), this.inlineQueue.at(-1).src = r.text) : t.push(s);
        continue;
      }
      if (e) {
        let r = "Infinite loop on byte: " + e.charCodeAt(0);
        if (this.options.silent) {
          console.error(r);
          break;
        } else
          throw new Error(r);
      }
    }
    return this.state.top = true, t;
  }
  inline(e, t = []) {
    return this.inlineQueue.push({ src: e, tokens: t }), t;
  }
  inlineTokens(e, t = []) {
    let n = e, s = null;
    if (this.tokens.links) {
      let o = Object.keys(this.tokens.links);
      if (o.length > 0)
        for (;(s = this.tokenizer.rules.inline.reflinkSearch.exec(n)) != null; )
          o.includes(s[0].slice(s[0].lastIndexOf("[") + 1, -1)) && (n = n.slice(0, s.index) + "[" + "a".repeat(s[0].length - 2) + "]" + n.slice(this.tokenizer.rules.inline.reflinkSearch.lastIndex));
    }
    for (;(s = this.tokenizer.rules.inline.anyPunctuation.exec(n)) != null; )
      n = n.slice(0, s.index) + "++" + n.slice(this.tokenizer.rules.inline.anyPunctuation.lastIndex);
    for (;(s = this.tokenizer.rules.inline.blockSkip.exec(n)) != null; )
      n = n.slice(0, s.index) + "[" + "a".repeat(s[0].length - 2) + "]" + n.slice(this.tokenizer.rules.inline.blockSkip.lastIndex);
    let i = false, r = "";
    for (;e; ) {
      i || (r = ""), i = false;
      let o;
      if (this.options.extensions?.inline?.some((c) => (o = c.call({ lexer: this }, e, t)) ? (e = e.substring(o.raw.length), t.push(o), true) : false))
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
        let c = t.at(-1);
        o.type === "text" && c?.type === "text" ? (c.raw += o.raw, c.text += o.text) : t.push(o);
        continue;
      }
      if (o = this.tokenizer.emStrong(e, n, r)) {
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
      let l = e;
      if (this.options.extensions?.startInline) {
        let c = 1 / 0, p2 = e.slice(1), u;
        this.options.extensions.startInline.forEach((d2) => {
          u = d2.call({ lexer: this }, p2), typeof u == "number" && u >= 0 && (c = Math.min(c, u));
        }), c < 1 / 0 && c >= 0 && (l = e.substring(0, c + 1));
      }
      if (o = this.tokenizer.inlineText(l)) {
        e = e.substring(o.raw.length), o.raw.slice(-1) !== "_" && (r = o.raw.slice(-1)), i = true;
        let c = t.at(-1);
        c?.type === "text" ? (c.raw += o.raw, c.text += o.text) : t.push(o);
        continue;
      }
      if (e) {
        let c = "Infinite loop on byte: " + e.charCodeAt(0);
        if (this.options.silent) {
          console.error(c);
          break;
        } else
          throw new Error(c);
      }
    }
    return t;
  }
};
var $2 = class {
  options;
  parser;
  constructor(e) {
    this.options = e || w;
  }
  space(e) {
    return "";
  }
  code({ text: e, lang: t, escaped: n }) {
    let s = (t || "").match(m2.notSpaceStart)?.[0], i = e.replace(m2.endingNewline, "") + `
`;
    return s ? '<pre><code class="language-' + R(s) + '">' + (n ? i : R(i, true)) + `</code></pre>
` : "<pre><code>" + (n ? i : R(i, true)) + `</code></pre>
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
  heading({ tokens: e, depth: t }) {
    return `<h${t}>${this.parser.parseInline(e)}</h${t}>
`;
  }
  hr(e) {
    return `<hr>
`;
  }
  list(e) {
    let { ordered: t, start: n } = e, s = "";
    for (let o = 0;o < e.items.length; o++) {
      let l = e.items[o];
      s += this.listitem(l);
    }
    let i = t ? "ol" : "ul", r = t && n !== 1 ? ' start="' + n + '"' : "";
    return "<" + i + r + `>
` + s + "</" + i + `>
`;
  }
  listitem(e) {
    let t = "";
    if (e.task) {
      let n = this.checkbox({ checked: !!e.checked });
      e.loose ? e.tokens[0]?.type === "paragraph" ? (e.tokens[0].text = n + " " + e.tokens[0].text, e.tokens[0].tokens && e.tokens[0].tokens.length > 0 && e.tokens[0].tokens[0].type === "text" && (e.tokens[0].tokens[0].text = n + " " + R(e.tokens[0].tokens[0].text), e.tokens[0].tokens[0].escaped = true)) : e.tokens.unshift({ type: "text", raw: n + " ", text: n + " ", escaped: true }) : t += n + " ";
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
    let s = "";
    for (let i = 0;i < e.rows.length; i++) {
      let r = e.rows[i];
      n = "";
      for (let o = 0;o < r.length; o++)
        n += this.tablecell(r[o]);
      s += this.tablerow({ text: n });
    }
    return s && (s = `<tbody>${s}</tbody>`), `<table>
<thead>
` + t + `</thead>
` + s + `</table>
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
    return `<code>${R(e, true)}</code>`;
  }
  br(e) {
    return "<br>";
  }
  del({ tokens: e }) {
    return `<del>${this.parser.parseInline(e)}</del>`;
  }
  link({ href: e, title: t, tokens: n }) {
    let s = this.parser.parseInline(n), i = J2(e);
    if (i === null)
      return s;
    e = i;
    let r = '<a href="' + e + '"';
    return t && (r += ' title="' + R(t) + '"'), r += ">" + s + "</a>", r;
  }
  image({ href: e, title: t, text: n, tokens: s }) {
    s && (n = this.parser.parseInline(s, this.parser.textRenderer));
    let i = J2(e);
    if (i === null)
      return R(n);
    e = i;
    let r = `<img src="${e}" alt="${n}"`;
    return t && (r += ` title="${R(t)}"`), r += ">", r;
  }
  text(e) {
    return "tokens" in e && e.tokens ? this.parser.parseInline(e.tokens) : ("escaped" in e) && e.escaped ? e.text : R(e.text);
  }
};
var _2 = class {
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
var T2 = class a4 {
  options;
  renderer;
  textRenderer;
  constructor(e) {
    this.options = e || w, this.options.renderer = this.options.renderer || new $2, this.renderer = this.options.renderer, this.renderer.options = this.options, this.renderer.parser = this, this.textRenderer = new _2;
  }
  static parse(e, t) {
    return new a4(t).parse(e);
  }
  static parseInline(e, t) {
    return new a4(t).parseInline(e);
  }
  parse(e, t = true) {
    let n = "";
    for (let s = 0;s < e.length; s++) {
      let i = e[s];
      if (this.options.extensions?.renderers?.[i.type]) {
        let o = i, l = this.options.extensions.renderers[o.type].call({ parser: this }, o);
        if (l !== false || !["space", "hr", "heading", "code", "table", "blockquote", "list", "html", "paragraph", "text"].includes(o.type)) {
          n += l || "";
          continue;
        }
      }
      let r = i;
      switch (r.type) {
        case "space": {
          n += this.renderer.space(r);
          continue;
        }
        case "hr": {
          n += this.renderer.hr(r);
          continue;
        }
        case "heading": {
          n += this.renderer.heading(r);
          continue;
        }
        case "code": {
          n += this.renderer.code(r);
          continue;
        }
        case "table": {
          n += this.renderer.table(r);
          continue;
        }
        case "blockquote": {
          n += this.renderer.blockquote(r);
          continue;
        }
        case "list": {
          n += this.renderer.list(r);
          continue;
        }
        case "html": {
          n += this.renderer.html(r);
          continue;
        }
        case "paragraph": {
          n += this.renderer.paragraph(r);
          continue;
        }
        case "text": {
          let o = r, l = this.renderer.text(o);
          for (;s + 1 < e.length && e[s + 1].type === "text"; )
            o = e[++s], l += `
` + this.renderer.text(o);
          t ? n += this.renderer.paragraph({ type: "paragraph", raw: l, text: l, tokens: [{ type: "text", raw: l, text: l, escaped: true }] }) : n += l;
          continue;
        }
        default: {
          let o = 'Token with "' + r.type + '" type was not found.';
          if (this.options.silent)
            return console.error(o), "";
          throw new Error(o);
        }
      }
    }
    return n;
  }
  parseInline(e, t = this.renderer) {
    let n = "";
    for (let s = 0;s < e.length; s++) {
      let i = e[s];
      if (this.options.extensions?.renderers?.[i.type]) {
        let o = this.options.extensions.renderers[i.type].call({ parser: this }, i);
        if (o !== false || !["escape", "html", "link", "image", "strong", "em", "codespan", "br", "del", "text"].includes(i.type)) {
          n += o || "";
          continue;
        }
      }
      let r = i;
      switch (r.type) {
        case "escape": {
          n += t.text(r);
          break;
        }
        case "html": {
          n += t.html(r);
          break;
        }
        case "link": {
          n += t.link(r);
          break;
        }
        case "image": {
          n += t.image(r);
          break;
        }
        case "strong": {
          n += t.strong(r);
          break;
        }
        case "em": {
          n += t.em(r);
          break;
        }
        case "codespan": {
          n += t.codespan(r);
          break;
        }
        case "br": {
          n += t.br(r);
          break;
        }
        case "del": {
          n += t.del(r);
          break;
        }
        case "text": {
          n += t.text(r);
          break;
        }
        default: {
          let o = 'Token with "' + r.type + '" type was not found.';
          if (this.options.silent)
            return console.error(o), "";
          throw new Error(o);
        }
      }
    }
    return n;
  }
};
var L2 = class {
  options;
  block;
  constructor(e) {
    this.options = e || w;
  }
  static passThroughHooks = new Set(["preprocess", "postprocess", "processAllTokens"]);
  preprocess(e) {
    return e;
  }
  postprocess(e) {
    return e;
  }
  processAllTokens(e) {
    return e;
  }
  provideLexer() {
    return this.block ? b2.lex : b2.lexInline;
  }
  provideParser() {
    return this.block ? T2.parse : T2.parseInline;
  }
};
var B2 = class {
  defaults = M2();
  options = this.setOptions;
  parse = this.parseMarkdown(true);
  parseInline = this.parseMarkdown(false);
  Parser = T2;
  Renderer = $2;
  TextRenderer = _2;
  Lexer = b2;
  Tokenizer = S2;
  Hooks = L2;
  constructor(...e) {
    this.use(...e);
  }
  walkTokens(e, t) {
    let n = [];
    for (let s of e)
      switch (n = n.concat(t.call(this, s)), s.type) {
        case "table": {
          let i = s;
          for (let r of i.header)
            n = n.concat(this.walkTokens(r.tokens, t));
          for (let r of i.rows)
            for (let o of r)
              n = n.concat(this.walkTokens(o.tokens, t));
          break;
        }
        case "list": {
          let i = s;
          n = n.concat(this.walkTokens(i.items, t));
          break;
        }
        default: {
          let i = s;
          this.defaults.extensions?.childTokens?.[i.type] ? this.defaults.extensions.childTokens[i.type].forEach((r) => {
            let o = i[r].flat(1 / 0);
            n = n.concat(this.walkTokens(o, t));
          }) : i.tokens && (n = n.concat(this.walkTokens(i.tokens, t)));
        }
      }
    return n;
  }
  use(...e) {
    let t = this.defaults.extensions || { renderers: {}, childTokens: {} };
    return e.forEach((n) => {
      let s = { ...n };
      if (s.async = this.defaults.async || s.async || false, n.extensions && (n.extensions.forEach((i) => {
        if (!i.name)
          throw new Error("extension name required");
        if ("renderer" in i) {
          let r = t.renderers[i.name];
          r ? t.renderers[i.name] = function(...o) {
            let l = i.renderer.apply(this, o);
            return l === false && (l = r.apply(this, o)), l;
          } : t.renderers[i.name] = i.renderer;
        }
        if ("tokenizer" in i) {
          if (!i.level || i.level !== "block" && i.level !== "inline")
            throw new Error("extension level must be 'block' or 'inline'");
          let r = t[i.level];
          r ? r.unshift(i.tokenizer) : t[i.level] = [i.tokenizer], i.start && (i.level === "block" ? t.startBlock ? t.startBlock.push(i.start) : t.startBlock = [i.start] : i.level === "inline" && (t.startInline ? t.startInline.push(i.start) : t.startInline = [i.start]));
        }
        "childTokens" in i && i.childTokens && (t.childTokens[i.name] = i.childTokens);
      }), s.extensions = t), n.renderer) {
        let i = this.defaults.renderer || new $2(this.defaults);
        for (let r in n.renderer) {
          if (!(r in i))
            throw new Error(`renderer '${r}' does not exist`);
          if (["options", "parser"].includes(r))
            continue;
          let o = r, l = n.renderer[o], c = i[o];
          i[o] = (...p2) => {
            let u = l.apply(i, p2);
            return u === false && (u = c.apply(i, p2)), u || "";
          };
        }
        s.renderer = i;
      }
      if (n.tokenizer) {
        let i = this.defaults.tokenizer || new S2(this.defaults);
        for (let r in n.tokenizer) {
          if (!(r in i))
            throw new Error(`tokenizer '${r}' does not exist`);
          if (["options", "rules", "lexer"].includes(r))
            continue;
          let o = r, l = n.tokenizer[o], c = i[o];
          i[o] = (...p2) => {
            let u = l.apply(i, p2);
            return u === false && (u = c.apply(i, p2)), u;
          };
        }
        s.tokenizer = i;
      }
      if (n.hooks) {
        let i = this.defaults.hooks || new L2;
        for (let r in n.hooks) {
          if (!(r in i))
            throw new Error(`hook '${r}' does not exist`);
          if (["options", "block"].includes(r))
            continue;
          let o = r, l = n.hooks[o], c = i[o];
          L2.passThroughHooks.has(r) ? i[o] = (p2) => {
            if (this.defaults.async)
              return Promise.resolve(l.call(i, p2)).then((d2) => c.call(i, d2));
            let u = l.call(i, p2);
            return c.call(i, u);
          } : i[o] = (...p2) => {
            let u = l.apply(i, p2);
            return u === false && (u = c.apply(i, p2)), u;
          };
        }
        s.hooks = i;
      }
      if (n.walkTokens) {
        let i = this.defaults.walkTokens, r = n.walkTokens;
        s.walkTokens = function(o) {
          let l = [];
          return l.push(r.call(this, o)), i && (l = l.concat(i.call(this, o))), l;
        };
      }
      this.defaults = { ...this.defaults, ...s };
    }), this;
  }
  setOptions(e) {
    return this.defaults = { ...this.defaults, ...e }, this;
  }
  lexer(e, t) {
    return b2.lex(e, t ?? this.defaults);
  }
  parser(e, t) {
    return T2.parse(e, t ?? this.defaults);
  }
  parseMarkdown(e) {
    return (n, s) => {
      let i = { ...s }, r = { ...this.defaults, ...i }, o = this.onError(!!r.silent, !!r.async);
      if (this.defaults.async === true && i.async === false)
        return o(new Error("marked(): The async option was set to true by an extension. Remove async: false from the parse options object to return a Promise."));
      if (typeof n > "u" || n === null)
        return o(new Error("marked(): input parameter is undefined or null"));
      if (typeof n != "string")
        return o(new Error("marked(): input parameter is of type " + Object.prototype.toString.call(n) + ", string expected"));
      r.hooks && (r.hooks.options = r, r.hooks.block = e);
      let l = r.hooks ? r.hooks.provideLexer() : e ? b2.lex : b2.lexInline, c = r.hooks ? r.hooks.provideParser() : e ? T2.parse : T2.parseInline;
      if (r.async)
        return Promise.resolve(r.hooks ? r.hooks.preprocess(n) : n).then((p2) => l(p2, r)).then((p2) => r.hooks ? r.hooks.processAllTokens(p2) : p2).then((p2) => r.walkTokens ? Promise.all(this.walkTokens(p2, r.walkTokens)).then(() => p2) : p2).then((p2) => c(p2, r)).then((p2) => r.hooks ? r.hooks.postprocess(p2) : p2).catch(o);
      try {
        r.hooks && (n = r.hooks.preprocess(n));
        let p2 = l(n, r);
        r.hooks && (p2 = r.hooks.processAllTokens(p2)), r.walkTokens && this.walkTokens(p2, r.walkTokens);
        let u = c(p2, r);
        return r.hooks && (u = r.hooks.postprocess(u)), u;
      } catch (p2) {
        return o(p2);
      }
    };
  }
  onError(e, t) {
    return (n) => {
      if (n.message += `
Please report this to https://github.com/markedjs/marked.`, e) {
        let s = "<p>An error occurred:</p><pre>" + R(n.message + "", true) + "</pre>";
        return t ? Promise.resolve(s) : s;
      }
      if (t)
        return Promise.reject(n);
      throw n;
    };
  }
};
var z2 = new B2;
function k2(a5, e) {
  return z2.parse(a5, e);
}
k2.options = k2.setOptions = function(a5) {
  return z2.setOptions(a5), k2.defaults = z2.defaults, H2(k2.defaults), k2;
};
k2.getDefaults = M2;
k2.defaults = w;
k2.use = function(...a5) {
  return z2.use(...a5), k2.defaults = z2.defaults, H2(k2.defaults), k2;
};
k2.walkTokens = function(a5, e) {
  return z2.walkTokens(a5, e);
};
k2.parseInline = z2.parseInline;
k2.Parser = T2;
k2.parser = T2.parse;
k2.Renderer = $2;
k2.TextRenderer = _2;
k2.Lexer = b2;
k2.lexer = b2.lex;
k2.Tokenizer = S2;
k2.Hooks = L2;
k2.parse = k2;
var Dt = k2.options;
var Zt = k2.setOptions;
var Gt = k2.use;
var Ht = k2.walkTokens;
var Nt = k2.parseInline;
var Ft = T2.parse;
var Qt = b2.lex;

// src/markdown-viewer.ts
function populate(basePath, source) {
  if (source == null) {
    source = "";
  } else if (typeof source !== "string") {
    source = String(source);
  }
  return source.replace(/\{\{([^}]+)\}\}/g, (original, prop) => {
    const value = d[`${basePath}${prop.startsWith("[") ? prop : "." + prop}`];
    return value === undefined ? original : populate(basePath, String(value));
  });
}

class MarkdownViewer extends M {
  src = "";
  value = "";
  content = null;
  elements = false;
  context = {};
  options = {};
  constructor() {
    super();
    this.initAttributes("src", "elements", "context");
  }
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
    d[this.instanceId] = typeof this.context === "string" ? JSON.parse(this.context) : this.context;
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
      this.innerHTML = chunks.map((chunk) => chunk.startsWith("<") && chunk.endsWith(">") ? chunk : k2(chunk, this.options)).join("");
    } else {
      this.innerHTML = k2(source, this.options);
    }
    this.didRender();
  }
}
var markdownViewer = MarkdownViewer.elementCreator({
  tag: "xin-md"
});
// src/notifications.ts
var { div: div9, button: button8 } = p;
var COLOR_MAP = {
  error: "red",
  warn: "orange",
  info: "royalblue",
  log: "gray",
  success: "green",
  progress: "royalblue"
};

class XinNotification extends M {
  static singleton;
  static styleSpec = {
    ":host": {
      _notificationSpacing: 8,
      _notificationWidth: 360,
      _notificationPadding: `${Hn.notificationSpacing} ${Hn.notificationSpacing50} ${Hn.notificationSpacing} ${Hn.notificationSpacing200}`,
      _notificationBg: "#fafafa",
      _notificationAccentColor: "#aaa",
      _notificationTextColor: "#444",
      _notificationIconSize: Hn.notificationSpacing300,
      _notificationButtonSize: 48,
      _notificationBorderWidth: "3px 0 0",
      _notificationBorderRadius: Hn.notificationSpacing50,
      position: "fixed",
      left: 0,
      right: 0,
      bottom: 0,
      paddingBottom: Hn.notificationSpacing,
      width: Hn.notificationWidth,
      display: "flex",
      flexDirection: "column-reverse",
      margin: "0 auto",
      gap: Hn.notificationSpacing,
      maxHeight: "50vh",
      overflow: "hidden auto",
      boxShadow: "none !important"
    },
    ":host *": {
      color: Hn.notificationTextColor
    },
    ":host .note": {
      display: "grid",
      background: Hn.notificationBg,
      padding: Hn.notificationPadding,
      gridTemplateColumns: `${Hn.notificationIconSize} 1fr ${Hn.notificationButtonSize}`,
      gap: Hn.notificationSpacing,
      alignItems: "center",
      borderRadius: Hn.notificationBorderRadius,
      boxShadow: `0 2px 8px #0006, inset 0 0 0 2px ${Hn.notificationAccentColor}`,
      borderColor: Hn.notificationAccentColor,
      borderWidth: Hn.notificationBorderWidth,
      borderStyle: "solid",
      transition: "0.5s ease-in",
      transitionProperty: "margin, opacity",
      zIndex: 1
    },
    ":host .note .icon": {
      stroke: Hn.notificationAccentColor
    },
    ":host .note button": {
      display: "flex",
      lineHeight: Hn.notificationButtonSize,
      padding: 0,
      margin: 0,
      height: Hn.notificationButtonSize,
      width: Hn.notificationButtonSize,
      background: "transparent",
      alignItems: "center",
      justifyContent: "center",
      boxShadow: "none",
      border: "none",
      position: "relative"
    },
    ":host .note button:hover svg": {
      stroke: Hn.notificationAccentColor
    },
    ":host .note button:active svg": {
      borderRadius: 99,
      stroke: Hn.notificationBg,
      background: Hn.notificationAccentColor,
      padding: Hn.spacing50
    },
    ":host .note svg": {
      height: Hn.notificationIconSize,
      width: Hn.notificationIconSize,
      pointerEvents: "none"
    },
    ":host .message": {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: Hn.notificationSpacing
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
    const { message, duration, type, close, progress, icon } = Object.assign({ type: "info", duration: -1 }, typeof spec === "string" ? { message: spec } : spec);
    if (!this.singleton) {
      this.singleton = xinNotification();
    }
    const singleton = this.singleton;
    document.body.append(singleton);
    singleton.style.zIndex = String(findHighestZ() + 1);
    const _notificationAccentColor = COLOR_MAP[type];
    const progressBar = progress || type === "progress" ? p.progress() : {};
    const closeCallback = () => {
      if (close) {
        close();
      }
      XinNotification.removeNote(note);
    };
    const iconElement = icon instanceof SVGElement ? icon : icon ? icons[icon]({ class: "icon" }) : icons.info({ class: "icon" });
    const note = div9({
      class: `note ${type}`,
      style: {
        _notificationAccentColor
      }
    }, iconElement, div9({ class: "message" }, div9(message), progressBar), button8({
      class: "close",
      title: "close",
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
  const hashHex = hashArray.map((b3) => b3.toString(16).padStart(2, "0")).join("");
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
var { span: span8, xinSlot: xinSlot4 } = p;

class XinPasswordStrength extends M {
  minLength = 8;
  goodLength = 12;
  indicatorColors = "#f00,#f40,#f80,#ef0,#8f0,#0a2";
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
  constructor() {
    super();
    this.initAttributes("minLength", "goodLength", "indicatorColors");
  }
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
    const input5 = event.target.closest("input");
    this.updateIndicator(input5?.value || "");
  };
  content = () => [
    xinSlot4({ onInput: this.update }),
    span8({ part: "meter" }, span8({ part: "level" }), span8({ part: "description" }))
  ];
  render() {
    super.render();
    const input5 = this.querySelector("input");
    this.updateIndicator(input5?.value);
  }
}
var xinPasswordStrength = XinPasswordStrength.elementCreator({
  tag: "xin-password-strength",
  styleSpec: {
    ":host": {
      display: "inline-flex",
      flexDirection: "column",
      gap: Hn.spacing50,
      position: "relative"
    },
    ":host xin-slot": {
      display: "flex"
    },
    ':host [part="meter"]': {
      display: "block",
      position: "relative",
      height: sn.meterHeight("24px"),
      background: sn.indicatorBg("white"),
      borderRadius: sn.meterRadius("4px"),
      boxShadow: sn.meterShadow(`inset 0 0 0 2px ${Hn.indicatorColor}`)
    },
    ':host [part="level"]': {
      height: sn.levelHeight("20px"),
      content: '" "',
      display: "inline-block",
      width: 0,
      transition: "0.15s ease-out",
      background: Hn.indicatorColor,
      margin: sn.levelMargin("2px"),
      borderRadius: sn.levelRadius("2px")
    },
    ':host [part="description"]': {
      position: "absolute",
      inset: "0",
      color: Hn.descriptionColor,
      height: sn.meterHeight("24px"),
      lineHeight: sn.meterHeight("24px"),
      textAlign: "center"
    }
  }
});
// src/rating.ts
var { span: span9 } = p;

class XinRating extends M {
  iconSize = 24;
  min = 1;
  max = 5;
  step = 1;
  value = null;
  icon = "star";
  ratingFill = "#f91";
  ratingStroke = "#e81";
  emptyFill = "#ccc";
  emptyStroke = "none";
  readonly = false;
  hollow = false;
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
      pointerEvents: "none",
      _xinIconFill: Hn.emptyFill,
      _xinIconStroke: Hn.emptyStroke
    },
    ":host::part(filled)": {
      position: "absolute",
      left: 0,
      _xinIconFill: Hn.ratingFill,
      _xinIconStroke: Hn.ratingStroke
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
  constructor() {
    super();
    this.initAttributes("max", "min", "icon", "step", "ratingStroke", "ratingColor", "emptyStroke", "emptyColor", "readonly", "iconSize", "hollow");
  }
  content = () => span9({ part: "container" }, span9({ part: "empty" }), span9({ part: "filled" }));
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
    const x2 = event instanceof MouseEvent ? event.pageX - empty.getBoundingClientRect().x : 0;
    const value = Math.min(Math.max(this.min, Math.round(x2 / empty.offsetWidth * this.max / this.step + this.step * 0.5) * this.step), this.max);
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
    if (value == null) {
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
    this.style.setProperty("--rating-fill", this.ratingFill);
    this.style.setProperty("--rating-stroke", this.ratingStroke);
    this.style.setProperty("--empty-fill", this.emptyFill);
    this.style.setProperty("--empty-stroke", this.emptyStroke);
    this.style.setProperty("--xin-icon-size", height);
    if (this.readonly) {
      this.role = "image";
    } else {
      this.role = "slider";
    }
    this.ariaLabel = `rating ${this.value} out of ${this.max}`;
    this.ariaValueMax = String(this.max);
    this.ariaValueMin = String(this.min);
    this.ariaValueNow = this.value === null ? String(-1) : String(this.value);
    const { empty, filled } = this.parts;
    empty.classList.toggle("hollow", this.hollow);
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
var xinRating = XinRating.elementCreator({
  tag: "xin-rating"
});
// src/rich-text.ts
var { xinSlot: xinSlot5, div: div10, button: button9, span: span10 } = p;
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
  return xinSelect({
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
  return span10({
    slot: "toolbar",
    style: { flex: `0 0 ${width}`, content: " " }
  });
}
function elastic(width = "10px") {
  return span10({
    slot: "toolbar",
    style: { flex: `0 0 ${width}`, content: " " }
  });
}
function commandButton(title, dataCommand, icon) {
  return button9({ slot: "toolbar", dataCommand, title }, icon);
}
var paragraphStyleWidgets = () => [
  commandButton("left-justify", "justifyLeft", icons.alignLeft()),
  commandButton("center", "justifyCenter", icons.alignCenter()),
  commandButton("right-justify", "justifyRight", icons.alignRight()),
  spacer(),
  commandButton("bullet list", "insertUnorderedList", icons.listBullet()),
  commandButton("numbered list", "insertOrderedList", icons.listNumber()),
  spacer(),
  commandButton("indent", "indent", icons.blockIndent()),
  commandButton("indent", "outdent", icons.blockOutdent())
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

class RichText extends M {
  widgets = "default";
  isInitialized = false;
  get value() {
    return this.isInitialized ? this.parts.doc.innerHTML : this.savedValue || this.innerHTML;
  }
  set value(docHtml) {
    if (this.isInitialized) {
      this.parts.doc.innerHTML = docHtml;
    } else {
      this.innerHTML = docHtml;
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
  handleSelectChange = (event) => {
    const select2 = event.target.closest(XinSelect.tagName);
    if (select2 == null) {
      return;
    }
    this.doCommand(select2.value);
  };
  handleButtonClick = (event) => {
    const button10 = event.target.closest("button");
    if (button10 == null) {
      return;
    }
    this.doCommand(button10.dataset.command);
  };
  content = [
    xinSlot5({
      name: "toolbar",
      part: "toolbar",
      onClick: this.handleButtonClick,
      onChange: this.handleSelectChange
    }),
    div10({
      part: "doc",
      contenteditable: true,
      style: {
        flex: "1 1 auto",
        outline: "none"
      }
    }),
    xinSlot5({
      part: "content"
    })
  ];
  constructor() {
    super();
    this.initAttributes("widgets");
  }
  doCommand(command) {
    if (command === undefined) {
      return;
    }
    const args = command.split(",");
    console.log("execCommand", args[0], false, ...args.slice(1));
    document.execCommand(args[0], false, ...args.slice(1));
  }
  updateBlockStyle() {
    const select2 = this.parts.toolbar.querySelector(".block-style");
    if (select2 === null) {
      return;
    }
    let blockTags = this.selectedBlocks.map((block) => block.tagName);
    blockTags = [...new Set(blockTags)];
    select2.value = blockTags.length === 1 ? `formatBlock,${blockTags[0]}` : "";
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
var richText = RichText.elementCreator({
  tag: "xin-word",
  styleSpec: {
    ":host": {
      display: "flex",
      flexDirection: "column",
      height: "100%"
    },
    ':host [part="toolbar"]': {
      padding: "4px",
      display: "flex",
      gap: "0px",
      flex: "0 0 auto",
      flexWrap: "wrap"
    }
  }
});
// src/segmented.ts
var { div: div11, slot: slot6, label: label2, span: span11, input: input5 } = p;

class XinSegmented extends M {
  choices = "";
  other = "";
  multiple = false;
  name = "";
  placeholder = "Please specify…";
  localized = false;
  value = null;
  get values() {
    return (this.value || "").split(",").map((v3) => v3.trim()).filter((v3) => v3 !== "");
  }
  content = () => [
    slot6(),
    div11({ part: "options" }, input5({ part: "custom", hidden: true }))
  ];
  static styleSpec = {
    ":host": {
      display: "inline-flex",
      gap: sn.segmentedOptionGap("8px"),
      alignItems: sn.segmentedAlignItems("center")
    },
    ":host, :host::part(options)": {
      flexDirection: sn.segmentedDirection("row")
    },
    ":host label": {
      display: "inline-grid",
      alignItems: "center",
      gap: sn.segmentedOptionGap("8px"),
      gridTemplateColumns: sn.segmentedOptionGridColumns("0px 24px 1fr"),
      padding: sn.segmentedOptionPadding("4px 12px"),
      font: sn.segmentedOptionFont("16px")
    },
    ":host label:has(:checked)": {
      color: sn.segmentedOptionCurrentColor("#eee"),
      background: sn.segmentedOptionCurrentBackground("#44a")
    },
    ":host svg": {
      height: sn.segmentOptionIconSize("16px"),
      stroke: sn.segmentedOptionIconColor("currentColor")
    },
    ":host label.no-icon": {
      gap: 0,
      gridTemplateColumns: sn.segmentedOptionGridColumns("0px 1fr")
    },
    ':host input[type="radio"], :host input[type="checkbox"]': {
      visibility: sn.segmentedInputVisibility("hidden")
    },
    ":host::part(options)": {
      display: "flex",
      borderRadius: sn.segmentedOptionsBorderRadius("8px"),
      background: sn.segmentedOptionsBackground("#fff"),
      color: sn.segmentedOptionColor("#222"),
      overflow: "hidden",
      alignItems: sn.segmentedOptionAlignItems("stretch")
    },
    ":host::part(custom)": {
      padding: sn.segmentedOptionPadding("4px 12px"),
      color: sn.segmentedOptionCurrentColor("#eee"),
      background: sn.segmentedOptionCurrentBackground("#44a"),
      font: sn.segmentedOptionFont("16px"),
      border: "0",
      outline: "none"
    },
    ":host::part(custom)::placeholder": {
      color: sn.segmentedOptionCurrentColor("#eee"),
      opacity: sn.segmentedPlaceholderOpacity(0.75)
    }
  };
  constructor() {
    super();
    this.initAttributes("direction", "choices", "other", "multiple", "name", "placeholder", "localized");
  }
  valueChanged = false;
  handleChange = () => {
    const { options, custom } = this.parts;
    if (this.multiple) {
      const inputs = [
        ...options.querySelectorAll("input:checked")
      ];
      this.value = inputs.map((input6) => input6.value).join(",");
    } else {
      const input6 = options.querySelector("input:checked");
      if (!input6) {
        this.value = null;
      } else if (input6.value) {
        custom.setAttribute("hidden", "");
        this.value = input6.value;
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
    switch (event.code) {
      case "Space":
        ;
        event.target.click();
        break;
    }
  };
  connectedCallback() {
    super.connectedCallback();
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
  get _choices() {
    const options = Array.isArray(this.choices) ? this.choices : this.choices.split(",").filter((c) => c.trim() !== "").map((c) => {
      const [value, remains] = c.split("=").map((v3) => v3.trim());
      const [caption, iconName] = (remains || value).split(":").map((v3) => v3.trim());
      const icon = iconName ? icons[iconName]() : "";
      const choice = { value, icon, caption };
      return choice;
    });
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
    return Boolean(this.value === "" || this.value && !this._choices.find((choice) => choice.value === this.value));
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
    options.append(...this._choices.map((choice) => {
      return label2({ tabindex: 0 }, input5({
        type,
        name: this.name,
        value: choice.value,
        checked: values.includes(choice.value) || choice.value === "" && isOtherValue,
        tabIndex: -1
      }), choice.icon || { class: "no-icon" }, this.localized ? xinLocalized(choice.caption) : span11(choice.caption));
    }));
    if (this.other && !this.multiple) {
      custom.hidden = !isOtherValue;
      custom.value = isOtherValue ? this.value : "";
      custom.placeholder = this.placeholder;
      options.append(custom);
    }
  }
}
var xinSegmented = XinSegmented.elementCreator({
  tag: "xin-segmented"
});
// src/side-nav.ts
var { slot: slot7 } = p;

class SideNav extends M {
  minSize = 800;
  navSize = 200;
  compact = false;
  content = [slot7({ name: "nav", part: "nav" }), slot7({ part: "content" })];
  _contentVisible = false;
  get contentVisible() {
    return this._contentVisible;
  }
  set contentVisible(visible) {
    this._contentVisible = visible;
    this.queueRender();
  }
  static styleSpec = {
    ":host": {
      display: "grid",
      gridTemplateColumns: `${sn.navWidth("50%")} ${sn.contentWidth("50%")}`,
      gridTemplateRows: "100%",
      position: "relative",
      margin: sn.margin("0 0 0 -100%"),
      transition: sn.sideNavTransition("0.25s ease-out")
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
    this.compact = parent.offsetWidth < this.minSize;
    const empty = [...this.childNodes].find((node) => node instanceof Element ? node.getAttribute("slot") !== "nav" : true) === undefined;
    if (empty) {
      this.style.setProperty("--nav-width", "100%");
      this.style.setProperty("--content-width", "0%");
      return;
    }
    if (!this.compact) {
      content.classList.add("-xin-sidenav-visible");
      this.style.setProperty("--nav-width", `${this.navSize}px`);
      this.style.setProperty("--content-width", `calc(100% - ${this.navSize}px)`);
      this.style.setProperty("--margin", "0");
    } else {
      content.classList.remove("-xin-sidenav-visible");
      this.style.setProperty("--nav-width", "50%");
      this.style.setProperty("--content-width", "50%");
      if (this.contentVisible) {
        this.style.setProperty("--margin", "0 0 0 -100%");
      } else {
        this.style.setProperty("--margin", "0 -100% 0 0");
      }
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
  constructor() {
    super();
    this.initAttributes("minSize", "navSize", "compact");
  }
  render() {
    super.render();
    this.onResize();
  }
}
var sideNav = SideNav.elementCreator({
  tag: "xin-sidenav"
});
// src/size-break.ts
var { slot: slot8 } = p;

class SizeBreak extends M {
  minWidth = 0;
  minHeight = 0;
  value = "normal";
  content = [slot8({ part: "normal" }), slot8({ part: "small", name: "small" })];
  static styleSpec = {
    ":host": {
      display: "inline-block",
      position: "relative"
    }
  };
  constructor() {
    super();
    this.initAttributes("minWidth", "minHeight");
  }
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
class XinSizer extends M {
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
      stroke: Hn.resizeIconFill
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
    const h3 = target.offsetHeight;
    target.style.left = target.offsetLeft + "px";
    target.style.top = target.offsetTop + "px";
    target.style.bottom = "";
    target.style.right = "";
    const { minSize } = this;
    trackDrag(event, (dx, dy, event2) => {
      target.style.width = Math.max(minSize.width, w2 + dx) + "px";
      target.style.height = Math.max(minSize.height, h3 + dy) + "px";
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
var { div: div12, input: input6, span: span12, button: button10 } = p;

class XinTag extends M {
  caption = "";
  removeable = false;
  removeCallback = () => {
    this.remove();
  };
  content = () => [
    span12({ part: "caption" }, this.caption),
    button10(icons.x(), {
      part: "remove",
      hidden: !this.removeable,
      onClick: this.removeCallback
    })
  ];
  constructor() {
    super();
    this.initAttributes("caption", "removeable");
  }
}
var xinTag = XinTag.elementCreator({
  tag: "xin-tag",
  styleSpec: {
    ":host": {
      "--tag-close-button-color": "#000c",
      "--tag-close-button-bg": "#fffc",
      "--tag-button-opacity": "0.5",
      "--tag-button-hover-opacity": "0.75",
      "--tag-bg": sn.brandColor("blue"),
      "--tag-text-color": sn.brandTextColor("white"),
      display: "inline-flex",
      borderRadius: sn.tagRoundedRadius(Hn.spacing50),
      color: Hn.tagTextColor,
      background: Hn.tagBg,
      padding: `0 ${Hn.spacing75} 0 ${Hn.spacing75}`,
      height: `calc(${Hn.lineHeight} + ${Hn.spacing50})`,
      lineHeight: `calc(${Hn.lineHeight} + ${Hn.spacing50})`
    },
    ':host > [part="caption"]': {
      position: "relative",
      whiteSpace: "nowrap",
      overflow: "hidden",
      flex: "1 1 auto",
      fontSize: sn.fontSize("16px"),
      color: Hn.tagTextColor,
      textOverflow: "ellipsis"
    },
    ':host [part="remove"]': {
      boxShadow: "none",
      margin: `0 ${Hn.spacing_50} 0 ${Hn.spacing25}`,
      padding: 0,
      display: "inline-flex",
      alignItems: "center",
      alignSelf: "center",
      justifyContent: "center",
      height: Hn.spacing150,
      width: Hn.spacing150,
      "--text-color": Hn.tagCloseButtonColor,
      background: Hn.tagCloseButtonBg,
      borderRadius: sn.tagCloseButtonRadius("99px"),
      opacity: Hn.tagButtonOpacity
    },
    ':host [part="remove"]:hover': {
      background: Hn.tagCloseButtonBg,
      opacity: Hn.tagButtonHoverOpacity
    }
  }
});

class XinTagList extends M {
  disabled = false;
  name = "";
  availableTags = [];
  value = [];
  textEntry = false;
  editable = false;
  placeholder = "enter tags";
  get tags() {
    return typeof this.value === "string" ? this.value.split(",").map((tag) => tag.trim()).filter((tag) => tag !== "") : this.value;
  }
  constructor() {
    super();
    this.initAttributes("name", "value", "textEntry", "availableTags", "editable", "placeholder", "disabled");
  }
  addTag = (tag) => {
    if (tag.trim() === "") {
      return;
    }
    const { tags } = this;
    if (!tags.includes(tag)) {
      tags.push(tag);
    }
    this.value = tags;
    this.queueRender(true);
  };
  toggleTag = (toggled) => {
    if (this.tags.includes(toggled)) {
      this.value = this.tags.filter((tag) => tag !== toggled);
    } else {
      this.addTag(toggled);
    }
    this.queueRender(true);
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
    const tags = typeof this.availableTags === "string" ? this.availableTags.split(",") : this.availableTags;
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
    button10({ style: { visibility: "hidden" }, tabindex: -1 }),
    div12({
      part: "tagContainer",
      class: "row"
    }),
    input6({
      part: "tagInput",
      class: "elastic",
      onKeydown: this.enterTag
    }),
    button10({
      title: "add tag",
      part: "tagMenu",
      onClick: this.popSelectMenu
    }, icons.chevronDown())
  ];
  removeTag = (event) => {
    if (this.editable && !this.disabled) {
      const tag = event.target.closest(XinTag.tagName);
      this.value = this.tags.filter((value) => value !== tag.caption);
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
    const { tags } = this;
    for (const tag of tags) {
      tagContainer.append(xinTag({
        caption: tag,
        removeable: this.editable && !this.disabled,
        removeCallback: this.removeTag
      }));
    }
  }
}
var xinTagList = XinTagList.elementCreator({
  tag: "xin-tag-list",
  styleSpec: {
    ":host": {
      "--tag-list-bg": "#f8f8f8",
      "--touch-size": "44px",
      "--spacing": "16px",
      display: "grid",
      gridTemplateColumns: "auto",
      alignItems: "center",
      background: Hn.tagListBg,
      gap: Hn.spacing25,
      borderRadius: sn.taglistRoundedRadius(Hn.spacing50),
      overflow: "hidden"
    },
    ":host[editable]": {
      gridTemplateColumns: `0px auto ${Hn.touchSize}`
    },
    ":host[editable][text-entry]": {
      gridTemplateColumns: `0px 2fr 1fr ${Hn.touchSize}`
    },
    ':host [part="tagContainer"]': {
      display: "flex",
      content: '" "',
      alignItems: "center",
      background: Hn.inputBg,
      borderRadius: sn.tagContainerRadius(Hn.spacing50),
      boxShadow: Hn.borderShadow,
      flexWrap: "nowrap",
      overflow: "auto hidden",
      gap: Hn.spacing25,
      minHeight: `calc(${Hn.lineHeight} + ${Hn.spacing})`,
      padding: Hn.spacing25
    },
    ':host [part="tagMenu"]': {
      width: Hn.touchSize,
      height: Hn.touchSize,
      lineHeight: Hn.touchSize,
      textAlign: "center",
      padding: 0,
      margin: 0
    },
    ":host [hidden]": {
      display: "none !important"
    },
    ':host button[part="tagMenu"]': {
      background: Hn.brandColor,
      color: Hn.brandTextColor
    }
  }
});
// src/version.ts
var version = "1.0.2";
// demo/src/style.ts
var brandColor = a.fromCss("#EE257B");
var colors = {
  _textColor: "#222",
  _brandColor: brandColor,
  _background: "#fafafa",
  _inputBg: "#fdfdfd",
  _backgroundShaded: "#f5f5f5",
  _navBg: brandColor.rotate(30).desaturate(0.5).brighten(0.9),
  _barColor: "#dae3df",
  _focusColor: brandColor.opacity(0.7),
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
  _scrollThumbColor: "#0006",
  _scrollBarColor: "#0001"
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
    ...Ge(colors),
    _menuShadow: "0 0 0 2px #a0f3d680",
    _menuSeparatorColor: "#a0f3d640"
  },
  ".high-contrast": {
    filter: "contrast(2)"
  },
  "*": {
    boxSizing: "border-box",
    scrollbarColor: `${Hn.scrollThumbColor} ${Hn.scrollBarColor}`,
    scrollbarWidth: "thin"
  },
  body: {
    fontFamily: Hn.fontFamily,
    fontSize: Hn.fontSize,
    margin: "0",
    lineHeight: Hn.lineHeight,
    background: Hn.background,
    _xinTabsSelectedColor: Hn.brandColor,
    _xinTabsBarColor: Hn.brandTextColor,
    _menuItemIconColor: Hn.brandColor,
    color: Hn.textColor
  },
  ".center": {
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },
  "input, button, select, textarea": {
    fontFamily: Hn.fontFamily,
    fontSize: Hn.fontSize,
    color: "currentColor",
    background: Hn.inputBg
  },
  select: {
    WebkitAppearance: "none",
    appearance: "none"
  },
  header: {
    background: Hn.brandColor,
    color: Hn.brandTextColor,
    _textColor: Hn.brandTextColor,
    _linkColor: Hn.transTextColor,
    display: "flex",
    alignItems: "center",
    padding: "0 var(--spacing)",
    lineHeight: "calc(var(--line-height) * var(--h1-scale))",
    height: Hn.headerHeight,
    whiteSpace: "nowrap"
  },
  h1: {
    color: Hn.brandColor,
    fontSize: "calc(var(--font-size) * var(--h1-scale))",
    lineHeight: "calc(var(--line-height) * var(--h1-scale))",
    fontWeight: "400",
    margin: "0",
    padding: Hn.spacing,
    textAlign: "center"
  },
  "header h2": {
    color: Hn.brandTextColor,
    whiteSpace: "nowrap"
  },
  h2: {
    color: Hn.brandColor,
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
    background: Hn.navBg
  },
  "input[type=search]": {
    borderRadius: 99
  },
  blockquote: {
    background: Hn.insetBg,
    margin: "0",
    borderRadius: Hn.spacing50,
    padding: "var(--spacing) calc(var(--spacing) * 2)"
  },
  "blockquote > :first-child": {
    marginTop: "0"
  },
  "blockquote > :last-child": {
    position: "relative",
    width: "100%",
    paddingBottom: 48,
    marginBottom: "0"
  },
  "blockquote > :last-child::after": {
    content: '" "',
    width: 48,
    height: 48,
    display: "block",
    bottom: 0,
    right: 0,
    position: "absolute",
    background: svg2DataUrl(icons.tosi())
  },
  ".bar": {
    display: "flex",
    gap: Hn.spacing,
    justifyContent: "center",
    alignItems: "center",
    padding: Hn.spacing,
    flexWrap: "wrap",
    _textColor: Hn.brandColor,
    background: Hn.barColor
  },
  a: {
    textDecoration: "none",
    color: Hn.linkColor,
    opacity: "0.9",
    borderBottom: "1px solid var(--brand-color)"
  },
  "button, select, .clickable": {
    transition: "ease-out 0.2s",
    background: Hn.brandTextColor,
    _textColor: Hn.brandColor,
    display: "inline-block",
    textDecoration: "none",
    padding: "0 calc(var(--spacing) * 1.25)",
    border: "none",
    borderRadius: "calc(var(--spacing) * 0.5)"
  },
  "button, select, clickable, input": {
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
    _textColor: Hn.brandColor
  },
  "label > select + .icon-chevron-down": {
    marginLeft: "calc(var(--spacing) * -3.5)"
  },
  "input, textarea": {
    border: "none",
    outline: "none",
    borderRadius: "calc(var(--spacing) * 0.5)"
  },
  input: {
    padding: "0 calc(var(--spacing) * 1.5)"
  },
  textarea: {
    padding: "var(--spacing) calc(var(--spacing) * 1.25)",
    lineHeight: Hn.lineHeight,
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
    maxWidth: Hn.lineHeight
  },
  "::placeholder": {
    color: Hn.focusColor
  },
  img: {
    verticalAlign: "middle"
  },
  "button:hover, button:hover, .clickable:hover": {
    boxShadow: "inset 0 0 0 2px var(--brand-color)"
  },
  "button:active, button:active, .clickable:active": {
    background: Hn.brandColor,
    color: Hn.brandTextColor
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
  "svg text": {
    pointerEvents: "none",
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
    background: Hn.brandColor,
    color: Hn.brandTextColor
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
    background: Hn.codeBg,
    padding: Hn.spacing,
    borderRadius: "calc(var(--spacing) * 0.25)",
    overflow: "auto",
    fontSize: Hn.codeFontSize,
    lineHeight: "calc(var(--font-size) * 1.2)"
  },
  "pre, code": {
    fontFamily: Hn.codeFontFamily,
    _textColor: Hn.brandColor
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
    lineHeight: "calc(var(--line-height) + var(--spacing))",
    width: "calc(var(--line-height) + var(--spacing))",
    textAlign: "center"
  },
  ".transparent:hover, .iconic:hover": {
    background: "#0002",
    boxShadow: "none",
    color: Hn.textColor
  },
  ".transparent:active, .iconic:active": {
    background: "#0004",
    boxShadow: "none",
    color: Hn.textColor
  },
  "xin-sidenav:not([compact]) .show-within-compact": {
    display: "none"
  },
  ".on.on": {
    background: Hn.brandColor,
    _textColor: Hn.brandTextColor
  },
  ".current": {
    background: Hn.background
  },
  ".doc-link": {
    cursor: "pointer",
    borderBottom: "none",
    transition: "0.15s ease-out",
    marginLeft: "20px",
    padding: "calc(var(--spacing) * 0.5) calc(var(--spacing) * 1.5)"
  },
  ".doc-link:not(.current):hover": {
    background: Hn.background
  },
  ".doc-link:not(.current)": {
    opacity: "0.8",
    marginLeft: 0
  },
  "xin-example": {
    margin: "var(--spacing) 0"
  },
  "xin-example [part=editors]": {
    background: Hn.insetBg
  },
  "[class*='icon-'], xin-icon": {
    color: "currentcolor",
    height: Hn.fontSize,
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
    background: Hn.brandColor,
    color: Hn.brandTextColor
  },
  tbody: {
    background: Hn.background
  },
  "tr:nth-child(2n)": {
    background: Hn.backgroundShaded
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
English	Français	suomi	svenska	中国人	日本語	한국인	Español	Deutsch	Italiano
\uD83C\uDDFA\uD83C\uDDF8	\uD83C\uDDEB\uD83C\uDDF7	\uD83C\uDDEB\uD83C\uDDEE	\uD83C\uDDF8\uD83C\uDDEA	\uD83C\uDDE8\uD83C\uDDF3	\uD83C\uDDEF\uD83C\uDDF5	\uD83C\uDDF0\uD83C\uDDF7	\uD83C\uDDEA\uD83C\uDDF8	\uD83C\uDDE9\uD83C\uDDEA	\uD83C\uDDEE\uD83C\uDDF9
Ascending	Ascendant	Nouseva	Stigande	升序	上昇	오름차순	Ascendente	Aufsteigend	Ascendente
Body	Corps	Runko	Kropp	身体	体	몸	Cuerpo	Körper	Corpo
Bold	Audacieux	Lihavoitu	Djärv	大胆的	大胆な	용감한	Atrevido	Deutlich	Grassetto
Cancel	Annuler	Peruuttaa	Avboka	取消	キャンセル	취소	Cancelar	Stornieren	Cancellare
Carousel	Carrousel	Karuselli	Karusell	旋转木马	カルーセル	회전목마	Carrusel	Karussell	Giostra
Category	Catégorie	Luokka	Kategori	类别	カテゴリ	범주	Categoría	Kategorie	Categoria
Center	Centre	Keskusta	Centrum	中心	中心	센터	Centro	Center	Centro
Check if Breached	Vérifier si la violation a eu lieu	Tarkista, onko rikottu	Kontrollera om den har brutits	检查是否违反	違反があったかどうかを確認する	침해되었는지 확인하세요	Comprobar si se ha infringido	Auf Verstoß prüfen	Controlla se violato
Close	Fermer	Lähellä	Nära	关闭	近い	닫다	Cerca	Schließen	Vicino
Code	Code	Koodi	Koda	代码	コード	암호	Código	Code	Codice
Color Theme	Thème de couleur	Väriteema	Färgtema	颜色主题	カラーテーマ	색상 테마	Tema de color	Farbthema	Tema colore
Column	Colonne	Sarake	Kolumn	柱子	カラム	열	Columna	Spalte	Colonna
Copy	Copie	Kopioida	Kopiera	复制	コピー	복사	Copiar	Kopie	Copia
Cut	Couper	Leikata	Skära	切	カット	자르다	Cortar	Schneiden	Taglio
Dark	Sombre	Tumma	Mörk	黑暗的	暗い	어두운	Oscuro	Dunkel	Buio
Delete	Supprimer	Poistaa	Radera	删除	消去	삭제	Borrar	Löschen	Eliminare
Descending	Descendant	Laskeva	Fallande	降序	降順	하강	Descendiendo	Absteigend	Discendente
Document	Document	Asiakirja	Dokumentera	文档	書類	문서	Documento	Dokumentieren	Documento
Emoji	Émoji	Emoji	Emoji	表情符号	絵文字	이모티콘	Emoji	Emoji	Emoji
Example	Exemple	Esimerkki	Exempel	例子	例	예	Ejemplo	Beispiel	Esempio
Exit	Sortie	Poistu	Utgång	出口	出口	출구	Salida	Ausfahrt	Uscita
File	Déposer	Tiedosto	Fil	文件	ファイル	파일	Archivo	Datei	File
Filter	Filtre	Suodattaa	Filtrera	筛选	フィルター	필터	Filtrar	Filter	Filtro
Float	Flotter	Kellua	Flyta	漂浮	フロート	뜨다	Flotar	Schweben	Galleggiante
Forms	Formulaires	Lomakkeet	Blanketter	表格	フォーム	양식	Formularios	Formulare	Forme
Heading	Titre	Otsikko	Rubrik	标题	見出し	표제	Título	Überschrift	Intestazione
Hide	Cacher	Piilottaa	Dölja	隐藏	隠れる	숨다	Esconder	Verstecken	Nascondere
High Contrast	Contraste élevé	Korkea kontrasti	Hög kontrast	高对比度	高コントラスト	고대비	Alto contraste	Hoher Kontrast	Contrasto elevato
Icon	Icône	Kuvake	Ikon	图标	アイコン	상	Icono	Symbol	Icona
Italic	Italique	Kursiivi	Kursiv	斜体	イタリック	이탤릭체	Itálico	Kursiv	Corsivo
Justify	Justifier	Perustella	Rättfärdiga	证明合法	正当化する	신이 옳다고 하다	Justificar	Rechtfertigen	Giustificare
Language	Langue	Kieli	Språk	语言	言語	언어	Idioma	Sprache	Lingua
Left	Gauche	Vasen	Vänster	左边	左	왼쪽	Izquierda	Links	Sinistra
Library	Bibliothèque	Kirjasto	Bibliotek	图书馆	図書館	도서관	Biblioteca	Bibliothek	Biblioteca
Light	Lumière	Kevyt	Ljus	光	ライト	빛	Luz	Licht	Leggero
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
Rating	Notation	Luokitus	Gradering	等级	評価	평가	Clasificación	Bewertung	Valutazione
Redo	Refaire	Toista	Göra om	重做	やり直す	다시 하다	Rehacer	Wiederholen	Rifare
Right	Droite	Oikein	Rätt	正确的	右	오른쪽	Bien	Rechts	Giusto
Save	Sauvegarder	Tallentaa	Spara	节省	保存	구하다	Ahorrar	Speichern	Salva
Select	Sélectionner	Valitse	Välja	选择	選択	선택하다	Seleccionar	Wählen	Selezionare
Show	Montrer	Show	Visa	展示	見せる	보여주다	Espectáculo	Zeigen	Spettacolo
Sidebar	Barre latérale	Sivupalkki	Sidofält	侧边栏	サイドバー	사이드바	Barra lateral	Seitenleiste	Barra laterale
Sizer	Calibreur	Mitoitus	Sizer	施瓦兹	サイザー	사이저	Medidor de tamaño	Größenmesser	Misuratore
Sort	Trier	Järjestellä	Sortera	种类	選別	종류	Clasificar	Sortieren	Ordinare
Strong	Fort	Vahva	Stark	强的	強い	강한	Fuerte	Stark	Forte
Subcategory	Sous-catégorie	Alaluokka	Underkategori	子类别	サブカテゴリ	하위 카테고리	Subcategoría	Unterkategorie	Sottocategoria
System	Système	Järjestelmä	System	系统	システム	체계	Sistema	System	Sistema
Table	Tableau	Taulukko	Tabell	桌子	テーブル	테이블	Mesa	Tisch	Tavolo
Tabs	Onglets	Välilehdet	Flikar	标签	タブ	탭	Pestañas	Registerkarten	Schede
Unacceptable	Inacceptable	Ei hyväksyttävää	Oacceptabel	不可接受	受け入れられない	받아들일 수 없음	Inaceptable	Inakzeptabel	Inaccettabile
Underline	Souligner	Korostaa	Betona	强调	下線	밑줄	Subrayar	Unterstreichen	Sottolineare
Undo	Défaire	Kumoa	Ångra	撤消	元に戻す	끄르다	Deshacer	Rückgängig machen	Disfare
Untitled	Sans titre	Nimetön	Ofrälse	无标题	無題	제목 없음	Intitulado	Ohne Titel	Senza titolo
Very Strong	Très fort	Erittäin vahva	Mycket stark	非常强	非常に強い	매우 강함	Acérrimo	Sehr stark	Molto forte
Very Weak	Très faible	Erittäin heikko	Mycket svag	非常弱	非常に弱い	매우 약함	Muy débil	Sehr schwach	Molto debole
Weak	Faible	Heikko	Svag	虚弱的	弱い	약한	Débil	Schwach	Debole
Yes	Oui	Kyllä	Ja	是的	はい	예	Sí	Ja	Sì`;

// demo/src/css-var-editor.ts
var { h2: h22, code } = p;

class XinCssVarEditor extends M {
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
            value = a.fromCss(value).html;
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

> xinjs-ui is now tosijs-ui. This is work in progress.

<!--{ "pin": "top" }-->

[ui.xinjs.net live demo](https://ui.xinjs.net) | [xinjs](https://xinjs.net) | [discord](https://discord.gg/ramJ9rgky5) | [github](https://github.com/tonioloewald/xinjs-ui#readme) | [npm](https://www.npmjs.com/package/xinjs-ui)

<center>
  <xin-icon class="logo" icon="tosiUi" size=300></xin-icon>
</center>

Copyright ©2023-2025 Tonio Loewald

## the tosijs ui library

A set of [web-components](https://developer.mozilla.org/en-US/docs/Web/API/Web_components)
created with [xinjs](https://xinjs.net), designed to augment what the browser gives you
for free rather than replace it.

It works beautifully with other web-component libraries, such as [shoelace.style](https://shoelace.style/).

## Quick Start

### Using npm and a bundler

Add xinjs-ui to your project, e.g.

\`\`\`
npm add xinjs-ui
\`\`\`

Then you can import the component \`elementCreator\` and create the element any way you
like, the easiest way being to use the \`elementCreator\` itself. A \`tosijs\` \`elementCreator\`
is syntax sugar around \`document.createElement()\`.

\`\`\`
import { dataTable } from 'xinjs-ui'

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
  const { elements } = tosijs
  const { popMenu, icons } = tosijsui

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
import { markdownViewer } from 'xinjs-ui'
document.body.append(markdownViewer('# hello world\\nthis is a test'))
\`\`\`

\`\`\`js
const { markdownViewer } = tosijsui

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
const { b3d, gamepadText, xrControllers, xrControllersText } = tosijsui

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
        textContext.fillText('xinjs-xr — debug info', 40, 984)
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
const { b3d } = tosijsui
const { MoreMath } = tosijs

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
const { AbTest } = tosijsui

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
  margin: 10px;
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
    text: `# code

An [ACE Editor](https://ace.c9.io/) wrapper.

Sometimes, it's nice to be able to just toss a code-editor in a web-page.

\`<xin-code>\`'s \`value\` is the code it contains. Its \`mode\` attribute sets the language, and you can further configure
the ACE editor instance via its \`options\` property.

\`\`\`html
<xin-code style="width: 100%; height: 100%" mode="css">
body {
  box-sizing: border-box;
}
</xin-code>
\`\`\``,
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
  console.log(colorInput.value)
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
    text: `# drag & drop

> **Note** this library is a modernized version of the [b8rjs](https://b8rjs.com) drag-and-drop.js library.
> It removes all usage of b8rjs and has no dependencies.

A lightweight library building on top of HTML5 drag and drop behavior.

To use it, simply call \`dragAndDrop.init()\` (it only needs to be called once,
but calling it again is harmless).

\`\`\`
import { dragAndDrop } from 'xinjs-ui'

dragAndDrop.init()
\`\`\`

The library just sets up some event listeners.

You can use \`dragAndDrop.draggedElement()\` to get the element being dragged (if it's
actually from the page you're in).

> ### Important Note
>
> The nice thing about HTML5 drag-and-drop is that it leverages the OS's drag and
> drop support. This means you can drag from one window to another, from the desktop
> to your app and vice versa. It's all a matter of configuring the DOM elements.

This module sets up some global event handlers and *just works*&trade; (arguably, it merely does things
that the browser should do, such as add a CSS selector for drop zones that are compatible
with what's being dragged).

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
the drop zone node) simply using data-event="drop:path.to.drop_handler" as usual.

    <div
      data-drop="custom"
      data-event="drop:path.to.drop_handler"
    >
      Drop some custom thing here
    </div>

### Typed Drop Zones Example

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
const { dragAndDrop } = tosijsui

dragAndDrop.init()
\`\`\`

> Note that you can drag between two browser tabs containing this
> example (or between two different browsers) and it will work.

### Reorderable List Example

\`\`\`js
const { elements, boxedProxy, getListItem } = tosijs
const { dragAndDrop } = tosijsui

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
const { spectrum } = boxedProxy({
  spectrum: shuffle(colors).map(color => ({color}))
})

const { div, template } = elements

let dragged = null

const dropColor = (event) => {
  const dropped = getListItem(event.target)
  const draggedIndex = spectrum.indexOf(dragged)
  const droppedIndex = spectrum.indexOf(dropped)
  spectrum.splice(draggedIndex, 1)
  spectrum.splice(droppedIndex, 0, dragged)

  console.log({dragged, draggedIndex, dropped, droppedIndex})

  event.preventDefault()
  event.stopPropagation()
}

const dragId = 'spectrum/' + Math.floor(Math.random() * 1e9)

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
const { editableRect, icons } = tosijsui
const { elements } = tosijs
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
const { div } = tosijs.elements
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

You can also create a live-example from HTML. And if you add the \`persist-to-dom\`
attribute, it will persist your code to the DOM.

<xin-example persist-to-dom>
  <pre class="language-html">
    <h1 class="make-it-red">Pure HTML!</h1>
    <button>Click Me!</button>
  </pre>
  <pre class="language-js">
    preview.querySelector('button').addEventListener('click', () => {
      alert('you clicked?')
    })
  </pre>
  <pre class="language-css">
    .make-it-red {
      color: red;
    }
  </pre>
</xin-example>

You can simply wrap it around a sequence of code blocks in the DOM with the
languages (js, html, css) as annotations or you can directly set the \`js\`, \`html\`,
and \`css\` properties.

## Code-Editor

The **code-editor** is actually the same component spawned in a new window using
a couple of clever tricks, the most important of which is leveraging
[StorageEvent](https://developer.mozilla.org/en-US/docs/Web/API/StorageEvent).

This functionality was originally added to make working in XR easier, but it turned
out that it's just better than the earlier way of doing things.

It actually uses just one \`localStorage\` item to handle any number of code-editors,
and cleans up after itself when you close the example (including closing stray
windows.

> **To Do** a little refactoring and tweaking to split the the editor off as a
completely separate component that can be used for other things, and make the
example itself lighter-weight.

## context

A \`<xin-example>\` can be given a \`context\` object {[key: string]: any}, which is the
set of values available in the javascript's execution context (it is wrapped in an
async function and passed those values). By default, that context comprises \`preview\`
(the \`<div>\` in which the example is rendered), \`tosijs\` (\`* from 'tosijs'\`),
and \`tosijsui\` (\`* from 'tosijs-ui'\`).

The \`LiveExample\` class provides the static \`insertExamples(element: HTMLElement)\`
function that will replace any sequence of
\`pre code[class="language-html"],pre code[class="language-js"],pre code[class="language-css"]\`
elements with a \`<xin-example>\` instance.`,
    title: "example",
    filename: "live-example.ts",
    path: "src/live-example.ts"
  },
  {
    text: `# filter

Automatically creates \`ArrayFilter\` functions \`(a: any[]) => any[]\` based on the query you build using its
macOS Finder-inspired interface, using an easily customizable / extensible collection of \`Filter\` objects.

\`\`\`js
const { elements } = tosijs
const { dataTable, filterBuilder, availableFilters } = tosijsui

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

\`<xin-form>\` and \`<xin-field>\` can be used to quickly create forms complete with
[client-side validation](https://developer.mozilla.org/en-US/docs/Learn/Forms/Form_validation#built-in_form_validation_examples).

\`\`\`js
const form = preview.querySelector('xin-form')
preview.querySelector('.submit').addEventListener('click', form.submit)
\`\`\`
\`\`\`html
<xin-form value='{"formInitializer": "initial value from form"}'>
  <h3 slot="header">Example Form Header</h3>
  <xin-field caption="Required field" key="required"></xin-field>
  <xin-field optional key="optional"><i>Optional</i> Field</xin-field>
  <xin-field key="text" type="text" placeholder="type it in here">Tell us a long story</xin-field>
  <xin-field caption="Zip Code" placeholder="12345 or 12345-6789" key="zipcode" pattern="\\d{5}(-\\d{4})?"></xin-field>
  <xin-field caption="Date" key="date" type="date"></xin-field>
  <xin-field caption="Number" key="number" type="number"></xin-field>
  <xin-field caption="Range" key="range" type="range" min="0" max="10"></xin-field>
  <xin-field key="boolean" type="checkbox">😃 <b>Agreed?!</b></xin-field>
  <xin-field key="color" type="color" value="pink">
    favorite color
  </xin-field>
  <xin-field key="select">
    Custom Field
    <select slot="input">
      <option>This</option>
      <option>That</option>
      <option>The Other</option>
    </select>
  </xin-field>
  <xin-field key="tags">
    Tag List
    <xin-tag-list editable slot="input" available-tags="pick me,no pick me"></xin-tag-list>
  </xin-field>
  <xin-field key="rating">
    Rate this form!
    <xin-rating slot="input"></xin-rating>
  </xin-field>
  <xin-field key="like">
    Do you like it?
    <xin-segmented
      choices="yes=Yes:thumbsUp,no=No:thumbsDown"
      slot="input"
    ></xin-segmented>
  </xin-field>
  <xin-field key="relationship">
    Relationship Status
    <xin-segmented
      style="--segmented-direction: column; --segmented-align-items: stretch"
      choices="couple=In a relationship,single=Single"
      other="It's complicated…"
      slot="input"
    ></xin-segmented>
  </xin-field>
  <xin-field key="amount" fixed-precision="2" type="number" prefix="$" suffix="(USD)">
    What's it worth?
  </xin-field>
  <xin-field key="valueInitializer" value="initial value from field">
    Initialized by field
  </xin-field>
  <xin-field key="formInitializer">
    Initialized by form
  </xin-field>
  <button slot="footer" class="submit">Submit</button>
</xin-form>
\`\`\`
\`\`\`css
.preview xin-form {
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

  .preview xin-field [part="field"],
  .preview xin-field [part="input"] > * {
    display: flex;
    justify-content: center;
  }
}

.preview :invalid {
  box-shadow: inset 0 0 0 2px #F008;
}
\`\`\`

## \`<xin-form>\`

\`<xin-form>\` prevents the default form behavior when a \`submit\` event is triggered and instead validates the
form contents (generating feedback if desired) and calls its \`submitCallback(value: {[key: string]: any}, isValid: boolean): void\`
method.

\`<xin-form>\` offers a \`fields\` proxy that allows values stored in the form to be updated. Any changes will trigger a \`change\`
event on the \`<xin-form>\` (in addition to any events fired by form fields).

\`<xin-form>\` instances have \`value\` and \`isValid\` properties you can access any time. Note that \`isValid\` is computed
and triggers form validation.

\`<xin-form>\` has \`header\` and \`footer\` \`<slot>\`s in addition to default \`<slot>\`, which is tucked inside a \`<form>\` element.

## \`<xin-field>\`

\`<xin-field>\` is a simple web-component with no shadowDOM that combines an \`<input>\` field wrapped with a \`<label>\`. Any
content of the custom-element will become the \`caption\` or you can simply set the \`caption\` attribute.

You can replace the default \`<input>\` field by adding an element to the slot \`input\` (it's a \`xinSlot\`) whereupon
the \`value\` of that element will be used instead of the built-in \`<input>\`. (The \`<input>\` is retained and
is used to drive form-validation.)

\`<xin-field>\` supports the following attributes:

- \`caption\` labels the field
- \`key\` determines the form property the field will populate
- \`type\` determines the data-type: '' | 'checkbox' | 'number' | 'range' | 'date' | 'text' | 'color'
- \`optional\` turns off the \`required\` attribute (fields are required by default)
- \`pattern\` is an (optional) regex pattern
- \`placeholder\` is an (optional) placeholder

The \`text\` type populates the \`input\` slot with a \`<textarea>\` element.

The \`color\` type populates the \`input\` slot with a \`<xin-color>\` element (and thus supports colors with alpha values).

<xin-css-var-editor element-selector="xin-field" target-selector=".preview"></xin-css-var-editor>`,
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
const { elements } = tosijs
const { gamepadText } = tosijsui

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

<div class="center">
  <xin-icon icon="settings" style="--xin-icon-size: 128px"></xin-icon>
  <xin-icon icon="xrColor" style="--xin-icon-size: 96px"></xin-icon>
  <xin-icon icon="rgb" style="--xin-icon-size: 128px"></xin-icon>
</div>

A library that provides \`ElementCreator\` functions that produce SVG icons. It leverages \`tosijs\`'s
\`svgElements\` proxy and is intended to address all the key use-cases for SVG icons in web
applications along with being very easy to extend and maintain.

> ### Supported Use Cases
> - inline SVGs that can be styled by CSS (for buttons, etc.)
> - allows both stroked and filled icons (unlike font-based systems)
> - No build process magic needed (it's "just javascript")
> - highly optimized and compressible
> - support for color icons (without requiring multiple glyphs perfectly aligned)
> - icons can be rendered  as data urls, e.g. to insert into CSS…

## icons

\`icons\` is a proxy that generates an \`ElementCreator\` for a given icon on demand,
e.g. \`icons.chevronDown()\` produces an \`<svg>\` element containing a downward-pointing chevron
icon with the class \`icon-chevron-down\`.

\`\`\`js
const { icons, svgIcon } = tosijsui
const { div } = tosijs.elements

preview.append(...Object.keys(icons).sort().map(iconName => div(
  { class: 'tile' },
  svgIcon({icon: iconName, size: 24}),
  div(iconName)
)))
\`\`\`
\`\`\`css
.preview {
  display: grid;
  grid-template-columns: calc(33% - 5px) calc(33% - 5px) calc(33% - 5px);
  flex-wrap: wrap;
  padding: var(--spacing);
  gap: var(--spacing);
  overflow: hidden scroll !important;
}

.preview .tile {
  display: flex;
  text-align: center;
  cursor: pointer;
  background: #fff8;
  padding: 10px;
  gap: 10px;
  border-radius: 5px;
}

.preview .tile:hover {
  background: white;
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
const { elements } = tosijs
const { icons, svg2DataUrl } = tosijsui

preview.append(
  elements.span({
    style: {
      display: 'inline-block',
      width: '120px',
      height: '24px',
      content: '" "',
      background: svg2DataUrl(icons.star(), 'none', '#bbb', 3)
    }
  }),
  elements.span({
    style: {
      display: 'inline-block',
      width: '120px',
      height: '24px',
      content: '" "',
      background: svg2DataUrl(icons.star(), 'gold', 'orange', 2)
    }
  }),
  elements.span({
    style: {
      display: 'inline-block',
      width: '100px',
      height: '200px',
      content: '" "',
      background: svg2DataUrl(icons.tosi())
    }
  }),
)
\`\`\`

\`svg2DataUrl(svg: SVGElement, fill?: string, stroke?: string): string\` is provided as a
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
const { button, p } = tosijs.elements
const { setLocale } = tosijsui

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
const { xinLocalized, localize } = tosijsui

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
const { icons, popFloat } = tosijsui
const { div, label, input, select, option, span } = tosijs.elements

const rocket = preview.querySelector('xin-lottie')
setTimeout(
  () => {
 preview.append(
   popFloat({
     content: [
       { class: 'panel', drag: true },
       div({ class: 'panel-header' }, 'Player Controls' ),
       label(
         { class: 'no-drag' },
         'speed',
         input({ type: 'range', min: -1, max: 1, step: 0.1, value: 0, onInput(event) {
           const speed = Math.pow(5, Number(event.target.value))
           rocket.animation.setSpeed(speed)
           event.target.nextSibling.textContent = (speed * 100).toFixed(0) + '%'
         } }),
         span('100%', {style: { textAlign: 'right', width: '40px'}})
       ),
       label(
         { class: 'no-drag' },
         'direction',
         select(
           option('Forwards', {value: 1, selected: true}),
           option('Backwards', {value: -1}),
           {
             onChange(event) {
               rocket.animation.setDirection(event.target.value)
             }
           }
         ),
         icons.chevronDown(),
       )
     ],
     target: rocket,
     position: 's'
   })
 )
  },
  500
)
\`\`\`
\`\`\`html
<xin-lottie
  style="height: 100%; max-width: 100%"
  src="88140-rocket-livetrade.json"
></xin-lottie>
<div class="caption">
  Animation by <a target="_blank" href="https://lottiefiles.com/dvskjbicfc">chiến lê hồng</a>
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
  background: white;
  box-shadow: 0 2px 8px rgba(0,0,0,0.25);
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
const { select, option, div, span, ul, li } = tosijs.elements
const { icons, makeSorter } = tosijsui

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
and [use the standard mapbox APIs directly](https://docs.mapbox.com/api/maps/styles/).`,
    title: "map",
    filename: "mapbox.ts",
    path: "src/mapbox.ts"
  },
  {
    text: "# markdown\n\n`<xin-md>` renders markdown using [marked](https://www.npmjs.com/package/marked).\n\n`<xin-md>` renders [markdown](https://www.markdownguide.org/) anywhere, either using the\n`src` attribute to load the file asynchronously, or rendering the text inside it.\n\n```html\n<xin-md>\n## hello\nworld\n</xin-md>\n```\n```css\nxin-md {\n  display: block;\n  padding: var(--spacing);\n}\n```\n\nNote that, by default, `<xin-md>` will use its `textContent` (not its `innerHTML`) as its source.\n\n## rendering markdown from a url\n\nAgain, like an `<img>` tag, you can simply set a `<xin-md>`'s `src` attribute to a URL pointing\nto markdown source and it will load it asynchronously and render it.\n\n```\n<xin-md src=\"/path/to/file.md\">\n```\n\n## setting its `value`\n\nOr, just set the element's `value` and it will render it for you. You can try\nthis in the console, e.g.\n\n```\n$('.preview xin-md').value = 'testing\\n\\n## this is a test'\n```\n\n## elements\n\n`<xin-md>` also (optionally) allows the embedding of inline HTML elements without blocking markdown\nrendering, so that you can embed specific elements while retaining markdown. You need to explicitly set\nthe `elements` property, and for markdown rendering not to be blocked, the html elements need to\nstart on a new line and not be indented. E.g.\n\n```html\n<xin-md elements>\n<form>\n### this is a form\n<label>\nfill in this field.\n**It's important!**\n<input>\n</label>\n</form>\n</xin-md>\n```\n\nIn this case `<xin-md>` uses its `innerHTML` and not its `textContent`.\n\n## context and template variables\n\n`<xin-md>` also supports **template** values. You need to provide data to the element in the form\nof `context` (an arbitrary object, or a JSON string), and then embed the template text using\nhandlebars-style doubled curly braces, e.g. `{{path.to.value}}`.\n\nIf no value is found, the original text is passed through.\n\nFinally, note that template substitution occurs *before* markdown transformation, which means you can\npass context data through to HTML elements.\n\n```html\n<xin-md\n  elements\n  context='{\"title\": \"template example\", \"foo\": {\"bar\": 17}, \"nested\": \"*work*: {{foo.bar}}\"}'\n>\n## {{title}}\n\nThe magic number is <input type=\"number\" value={{foo.bar}}>\n\nOh, and nested templates {{nested}}.\n</xin-md>\n```",
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
const { popMenu, localize, xinMenu, postNotification, xinLocalized, icons } = tosijsui
const { elements } = tosijs

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
            action: 'https://timezones.xinjs.net/'
          },
          {
            icon: 'externalLink',
            caption: 'b8rjs',
            action: 'https://b8rjs.com'
          },
        ]
      },
      {
        icon: 'xinjs',
        caption: 'xinjs',
        action: 'https://xinjs.net'
      },
      {
        icon: 'xinie',
        caption: 'xinie',
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
const { popMenu, icons, postNotification } = tosijsui
const { elements } = tosijs

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
  localized?: boolean
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
const { elements } = tosijs
const { xinLocalized, localize, icons, popMenu, postNotification } = tosijsui
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
  progress?: () => number // return percentage completion
  close?: () => void
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
const { postNotification, icons } = tosijsui

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
  message: 'Welcome to xinjs-ui notifications, this message will disappear in 2s',
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
const { xinLocalized, localize } = tosijsui

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
const { popFloat, positionFloat } = tosijsui
const { button } = tosijs.elements
const grid = preview.querySelector('.grid')

grid.addEventListener('click', (event) => {
  const { target } = event
  if (!target.closest('button')) {
    return
  }
  const float = preview.querySelector('xin-float')
  if (float === null) {
    // create and position a float
    preview.append(
      popFloat({
        content: [
          'hello, I am a float',
          button('close me', {
            onClick(event){
              event.target.closest('xin-float').remove()
            }
          })
        ],
        target,
        position: target.dataset.float
      })
    )
  } else {
    // position an existing float
    positionFloat(float, target, target.dataset.float)
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

.preview xin-float {
  display: flex;
  flex-direction: column;
  border-radius: 5px;
  padding: 10px;
  background: white;
  box-shadow: 2px 10px 5px #0004;
}
\`\`\`

## popFloat

\`\`\`
export interface PopFloatOptions {
  content: HTMLElement | ElementPart[]
  target: HTMLElement
  position?: FloatPosition
}

export const popFloat = (options: PopFloatOptions): XinFloat
\`\`\`

Create a \`<xin-float>\` with the content provided, positioned as specified (or automatically).

## positionFloat

\`\`\`
export const positionFloat = (
  element: HTMLElement,
  target: HTMLElement,
  position?: FloatPosition
  remainOnScroll?: 'hide' | 'remove' | boolean // default is 'remove'
  remainOnResize?: 'hide' | 'remove' | boolean // default is 'remove'
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
\`\`\``,
    title: "popFloat",
    filename: "pop-float.ts",
    path: "src/pop-float.ts"
  },
  {
    text: '# rating\n\n`XinRating` / `<xin-rating>` provides a drop-in replacement for an `<input>`\nthat renders a rating using <xin-icon icon="star" color="red"></xin-icon>s.\n\n```html\n<xin-rating value=3.4></xin-rating>\n<xin-rating min=0 value=3.4 step=0.5 hollow></xin-rating>\n<xin-rating value=3.4 color="deepskyblue"></xin-rating>\n<xin-rating value=3.1 max=10 color="hotpink" icon="heart" icon-size=32></xin-rating>\n```\n```css\n.preview {\n  display: flex;\n  flex-direction: column;\n}\n```\n\n## Attributes\n\n- `icon-size` (24 by default) determines the height of the control and along with `max` its width\n- `max` maximum rating\n- `min` (1 by default) can be 0 or 1 (allowing ratings of 0 to max or 1 to max)\n- `step` (0.5 by default) granularity of rating\n- `icon` (\'star\' by default) determines the icon used\n- `rating-stroke` (#f91 by default) is the stroke of rating icons\n- `rating-fill` (#e81 by default) is the color of rating icons\n- `empty-stroke` (none by default) is the color of background icons\n- `empty-fill` (#ccc by default) is the color of background icons\n- `readonly` (false by default) prevents the user from changing the rating\n- `hollow` (false by default) makes the empty rating icons hollow.\n\n## Keyboard\n\n`<xin-rating>` should be fully keyboard navigable (and, I hope, accessible).\n\nThe up key increases the rating, down descreases it. This is the same\nas the behavior of `<input type="number">`, [Shoelace\'s rating widget](https://shoelace.style/components/rating/),\nand (in my opinion) common sense, but  not like [MUI\'s rating widget](https://mui.com/material-ui/react-rating/).',
    title: "rating",
    filename: "rating.ts",
    path: "src/rating.ts"
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
const { elements } = tosijs
const { scriptTag, styleSheet } = tosijsui

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
<blockquote>
Check the console to see the values being set.
</blockquote>

<div class="grid">
<xin-segmented value="yes" choices="yes, no, don't care">
  Should we?
</xin-segmented>

<div>
  <b>Localized!</b><br>
  <xin-segmented
    localized
    title="do you like?"
    choices="yes=Yes:thumbsUp, no=No:thumbsDown"
  ></xin-segmented>
</div>

<xin-segmented
  style="--segmented-direction: column; --segmented-align-items: stretch"
  choices="in a relationship, single" other="it's complicated…"
  placeholder="oooh… please elaborate"
  value="separated"
>
  Relationship Status
</xin-segmented>

<xin-segmented
  multiple
  style="
    --segmented-direction: column;
    --segmented-align-items: start;
    --segmented-option-grid-columns: 24px 24px 100px;
    --segmented-input-visibility: visible;
  "
  choices="star=Star:star, game=Game:game, bug=Bug:bug, camera=Camera:camera"
  value="star,bug"
>
  Pick all that apply
</xin-segmented>
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
  if (target.tagName === 'XIN-SEGMENTED') {
    console.log((target.textContent || target.title).trim(), target.value)
  }
}
preview.addEventListener('change', logEvent, true)
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
- \`name\` allows you to set the name of the \`<input>\` elements to a specific value, it will default
  to the component's \`instanceId\`
- \`other\` (default '', meaning other is not allowed) is the caption for other options, allowing
  the user to input their choice. It will be reset to '' if \`multiple\` is set.
- \`placeholder\` is the placeholder displayed in the \`<input>\` field for **other** responses
- \`localized\` automatically localizes captions

## Styling

The following CSS variables can be used to control customize the \`<xin-segmented>\` component.

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

\`<xin-select>\` (\`xinSelect\` is the \`ElementCreator\`) is a replacement for the lamentable
built in \`<select>\` element that addresses its various shortcomings.

- since \`<xin-select>\` is powered by \`popMenu\`, and supports separators and submenus.
- options can have icons.
- \`<xin-select>\` will retain and display a value even if the matching option is missing.
- its displayed value can be made \`editable\`, allowing use as a "combo box".
- options can have \`async\` callbacks that return a value.
- picking an item triggers an \`action\` event even if the value hasn't changed.
- available options are set via the \`options\` attribute or the element's \`options\` property (not \`<option>\` elements)

\`\`\`html
<xin-select
  title="simple select"
  options="this,that,,the other"
  value="not an option!"
></xin-select><br>
<xin-select
  show-icon
  title="has captions"
  class="captions"
  value="image"
></xin-select><br>
<xin-select
  show-icon
  title="combo select with icons"
  class="icons"
  editable
  placeholder="pick an icon"
></xin-select><br>
<xin-select
  show-icon
  hide-caption
  title="icons only"
  class="icons-only"
  placeholder="pick an icon"
></xin-select>
<pre contenteditable>Select some text in here…
…to check for focus stealing</pre>
\`\`\`
\`\`\`js
const { icons } = tosijsui

const captions = preview.querySelector('.captions')

captions.options = [
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

const iconsSelect = preview.querySelector('.icons')
const iconsOnly = preview.querySelector('.icons-only')

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
<xin-css-var-editor element-selector="xin-select"></xin-css-var-editor>

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

A \`<xin-select>\` can be assigned \`options\` as a string of comma-delimited choices,
or be provided a \`SelectOptions\` array (which allows for submenus, separators, etc.).

## Attributes

\`<xin-select>\` supports several attributes:

- \`editable\` lets the user directly edit the value (like a "combo box").
- \`show-icon\` displays the icon corresponding to the currently selected value.
- \`hide-caption\` hides the caption.
- \`placeholder\` allows you to set a placeholder.
- \`options\` allows you to assign options as a comma-delimited string attribute.

## Events

Picking an option triggers an \`action\` event (whether or not this changes the value).

Changing the value, either by typing in an editable \`<xin-select>\` or picking a new
value triggers a \`change\` event.

You can look at the console to see the events triggered by the second example.

## Localization

\`<xin-select>\` supports the \`localized\` attribute which automatically localizes
options.

\`\`\`html
<xin-select
  localized
  placeholder="localized placeholder"
  options="yes,no,,moderate"
></xin-select>
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
    text: `# style

## Convert CSS to Javascript

This is a simple utility for converting CSS into a xinjs \`XinStyleSheet\` object.
Having all of your CSS start as Javascript (or Typescript) has many
benefits, such as being able to do color math using \`tosijs\`'s \`Color\` class,
and use the same values that are in your CSS for inline code when needed.

> ### Caution
>
> - This is not a real parser but regexp hackery!
> - Doesn't handle edge-cases like semicolons inside string values or
>   skipped semicolons for the last property in a rule.
> - Doesn't convert variable references inside style values (e.g. calc(var(--foo) * 0.5))
>   into \`vars\` values.

\`\`\`js
const tabs = preview.querySelector('xin-tabs')
const [css, js] = preview.querySelectorAll('xin-code')
const convertButton = preview.querySelector('button')

function quoteTrim(s, symbol = false) {
  s = s.trim()
  if (s.match(/[^\\w_]/) || !symbol) {
    s = s.replace(/'/g, "\\\\'")
    return \`'\${s}'\`
  } else {
    return s
  }
}

function kebabToCamel(s) {
  s = s.replace(/--/, '_')
  return s.replace(/\\-(\\w)/g, (_, c) => c.toLocaleUpperCase())
}

function css2js () {
  const source = css.value
  const lines = source.split('\\n')
  const output = ['{']
  let rule = ''
  for(const line of lines) {
    if (!line.trim()) {
      continue
    }
    try {
      rule = rule ? rule + ' ' + line.trim() : line
      if (rule.match(/@import .*;/)) {
        const [,url] = rule.match(/@import url\\(['"](.*)['"]\\);/)
        output.push(\`'@import': \${quoteTrim(url)},\`)
        rule = ''
      } else if (rule.match(/\\{\\s*$/)) {
        const [,whitespace, selector] = rule.match(/(\\s*)([^\\s].*)\\{/)
        output.push(\`\${whitespace}\${quoteTrim(selector, true)}: {\`)
        rule = ''
      } else if (line.match(/[^\\s]*\\}\\s*$/)) {
        output.push(line + ',')
        rule = ''
      } else if (rule.match(/.*:.*;/)) {
        let [,whitespace, prop, value] = rule.match(/(\\s*)(.*):(.*);/)
        prop = kebabToCamel(prop)
        output.push(\`\${whitespace}\${quoteTrim(prop, true)}: \${quoteTrim(value)},\`)
        rule = ''
      }
    } catch(e) {
      console.error(e, line)
    }
  }
  output.push('}')
  let code = output.join('\\n')
  code = code.replace(/'var\\(--([^)]*)\\)'/g, (_,v) => {
    if (v.includes(',')) {
      const [variable, content] = v.split(',', 2)
      return \`varDefault.\${kebabToCamel(variable)}('\${content.trim()}')\`
    } else {
      return \`vars.\${kebabToCamel(v)}\`
    }
  })

  js.value = \`import { vars, varDefault } from 'tosijs'\\n\\nexport const styleSpec = \${code}\`
}

convertButton.addEventListener('click', () => {
  css2js()
  tabs.value = 1
})
\`\`\`
\`\`\`html
<xin-tabs>
<button slot="after-tabs">Convert</button>
<xin-code mode="css" name="css">
@import url('https://fonts.googleapis.com/css2?family=Aleo:ital,wght@0,100..900;1,100..900&famiSpline+Sans+Mono:ital,wght@0,300..700;1,300..700&display=swap');

tr:nth-child(2n) {
  background: var(--background-shaded);
}

th,
td {
  padding: calc(var(--spacing) * 0.5) var(--spacing);
}

@keyframes fade-in {
  0% {
    opacity: 0;
  }
  100% {
    opacity: 1;
  }
}

header xin-locale-picker xin-select button {
  --brand-color: var(--brand-text-color);
  background: transparent;
  gap: 2px;
}

header xin-locale-picker xin-select button svg {
  stroke: var(--brand-text-color) !important;
}
</xin-code>
<xin-code mode="javascript" name="js"></xin-code>
</xin-tabs>
\`\`\`
\`\`\`css
.preview xin-tabs {
  background: var(--inset-bg);
}
.preview xin-tabs, .preview textarea, .preview xin-code {
  width: 100%;
  height: 100%;
  resize: none;
}
\`\`\`

## Using the Output

You can turn the output of this utility using \`tosijs\`'s \`StyleSheet\` utility function:

\`\`\`
import { styleSpec } from './my-style'

StyleSheet('base-style', styleSpec) // creates a \`<style id="base-style>\` element in
  the \`<head>\` of the page.
\`\`\`

You can convert the output to Typescript by importing the \`XinStyleSheet\` from \`tosijs\`:

\`\`\`
import { XinStyleSheet, vars } from 'tosijs'

export const styleSpec: XinStyleSheet = ...
\`\`\``,
    title: "style",
    filename: "style.ts",
    path: "demo/src/style.ts"
  },
  {
    text: `# table

A virtual data-table, configurable via a \`columns\` array (which will automatically be generated if not provided),
that displays gigantic tables with fixed headers (and live column-resizing) using a minimum of resources and cpu.

\`\`\`js
const { dataTable } = tosijsui
const { input } = tosijs.elements

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
    // custom cell using xinjs bindings to make the field editable
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

const { div, button } = tosijs.elements
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

\`<xin-tag-list>\` allows you to display an editable or read-only tag list (represented either
as a comma-delimited string or an array of strings).

\`\`\`html
<label style="position: absolute; right: 10px; top: 10px; display: block">
  <input type="checkbox" class="disable-toggle">
  <b>Disable All</b>
</label>
<label>
  <b>Display Only</b>
  <xin-tag-list
    value="this,that,,the-other"
  ></xin-tag-list>
</label>
<xin-tag-list
  class="compact"
  value="this,that,,the-other"
></xin-tag-list>
<br>
<label>
  <b>Editable</b>
  <xin-tag-list
    class="editable-tag-list"
    value="belongs,also belongs,custom"
    editable
    available-tags="belongs,also belongs,not initially chosen"
  ></xin-tag-list>
</label>
<br>
<b>Text-Entry</b>
<xin-tag-list
  value="this,that,the-other,not,enough,space"
  editable
  text-entry
  available-tags="tomasina,dick,,harriet"
></xin-tag-list>
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
  if (event.target.matches('xin-tag-list')) {
    console.log(event.target, event.target.value)
  }
}, true)
preview.querySelector('.disable-toggle').addEventListener('change', (event) => {
  const tagLists = Array.from(preview.querySelectorAll('xin-tag-list'))
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
const { trackDrag } = tosijsui

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
    text: `# word (rich text editor)

\`<xin-word>\` is a simple and easily extensible \`document.execCommand\` WYSIWYG editor with some conveniences.

\`\`\`html
<xin-word widgets="minimal">
<h3>Heading</h3>
<p>And some <b>text</b></p>
</xin-word>
\`\`\`
\`\`\`css
xin-word {
  background: white;
}

xin-word [part="toolbar"] {
  background: #f8f8f8;
}

xin-word [part="doc"] {
  padding: 20px;
}
\`\`\`

By default, \`<xin-word>\` treats its initial contents as its document, but you can also set (and get)
its \`value\`.

## toolbar

\`<xin-word>\` elements have a \`toolbar\` slot (actually a xin-slot because it doesn't use
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

A \`<xin-word>\` element also has \`selectedText\` and \`selectedBlocks\` properties, allowing
you to easily perform operations on text selections, and a \`selectionChange\` callback (which
simply passes through document \`selectionchange\` events, but also passes a reference to
the \`<xin-word>\` component).`,
    title: "word (rich text editor)",
    filename: "rich-text.ts",
    path: "src/rich-text.ts"
  },
  {
    text: `# docs.js

The \`tosijs-ui\` package includes \`docs.js\` which is used to build the documentation
for the [ui.xinjs.net](https://ui.xinjs.net).

This is a simple utility for finding all the markdown files in a directory and also all
multi-line comments in .ts, .js, and .css source files that being with a "!".

These comments are assumed to be in markdown.

It then emits JSON containing all the content.

Comments comprising JSON objects are treated as metadata and added to the
file objects in the JSON data. This includes: \`<!--{ ... }-- >\` and \`/*{...}* /\`
comments (omit the spaces inserted to prevent this text from blowing up docs.js!)

As of now, the only metadata supported by docs.js is \`pin\` which if set to "top"
will force the item to the top of the list, while "bottom" will force it to the
bottom.

This doc is pinned to the bottom. README is pinned to the top.

> **Aside**: the original version of this code was written by ChatGPT.`,
    title: "docs.js",
    filename: "docs.js",
    path: "bin/docs.js",
    pin: "bottom"
  },
  {
    text: `# Work in Progress

- \`localize\`
  - adding automatic localization where appropriate
    - \`<xin-password-strength>\`
    - \`<xin-tag-list>\`
    - \`<xin-filter>\`
- \`<xin-b3d>\`
  - converting this to a blueprint
- \`<xin-filter>\`
  - Leverage \`<xin-select>\` for picking fields etc.
  - Leverage \`<xin-tag-list>\` for displaying filters compactly
  - Leverage \`popFloat\` for disclosing filter-editor
- \`<xin-editable>\`
  - Add support for disabling / enabling options
  - Hide lock icons while resizing
  - Maybe show lines under locks indicating the parent
  - Support snapping to sibling boundaries and centers
- builds
  - better leveraging of tree-shacking
  <!--{"pin": "bottom"}-->
`,
    title: "Work in Progress",
    filename: "TODO.md",
    path: "TODO.md",
    pin: "bottom"
  }
];

// demo/src/index.ts
Ve("demo-style", styleSpec);
initLocalization(localized_strings_default);
Object.assign(window, { tosijs: exports_module, tosijsui: exports_src });
setTimeout(() => {
  const brandColor2 = getComputedStyle(document.body).getPropertyValue("--brand-color");
  console.log("welcome to %cui.xinjs.net", `color: ${brandColor2}; padding: 0 5px;`);
}, 100);
var PROJECT = "tosijs-ui";
var docName = document.location.search !== "" ? document.location.search.substring(1).split("&")[0] : "README.md";
var currentDoc = docs_default.find((doc) => doc.filename === docName) || docs_default[0];
var { app, prefs } = cn({
  app: {
    title: PROJECT,
    blogUrl: `https://loewald.com`,
    discordUrl: `https://discord.com/invite/ramJ9rgky5`,
    githubUrl: `https://github.com/tonioloewald/${PROJECT}#readme`,
    npmUrl: `https://www.npmjs.com/package/${PROJECT}`,
    xinjsUrl: "https://xinjs.net",
    bundleBadgeUrl: `https://deno.bundlejs.com/?q=${PROJECT}&badge=`,
    bundleUrl: `https://bundlejs.com/?q=${PROJECT}`,
    cdnBadgeUrl: `https://data.jsdelivr.com/v1/package/npm/${PROJECT}/badge`,
    cdnUrl: `https://www.jsdelivr.com/package/npm/${PROJECT}`,
    optimizeLottie: false,
    lottieFilename: "",
    lottieData: "",
    docs: docs_default,
    currentDoc
  },
  prefs: {
    theme: "system",
    highContrast: false,
    locale: ""
  }
});
Re((path) => {
  if (path.startsWith("prefs")) {
    return true;
  }
  return false;
});
if (prefs.locale) {
  setLocale(prefs.locale.valueOf());
}
tn.docLink = {
  toDOM(elt, filename) {
    elt.setAttribute("href", `?${filename}`);
  }
};
tn.current = {
  toDOM(elt, currentFile) {
    const boundFile = elt.getAttribute("href") || "";
    elt.classList.toggle("current", currentFile === boundFile.substring(1));
  }
};
setTimeout(() => {
  Object.assign(globalThis, { app, tosi: cn, bindings: tn, elements: p, vars: Hn, touch: j });
}, 1000);
var main = document.querySelector("main");
var { h2: h23, div: div13, span: span13, a: a5, img, header, button: button11, template: template2, input: input7 } = p;
h(document.body, "prefs.theme", {
  toDOM(element, theme) {
    if (theme === "system") {
      theme = getComputedStyle(document.body).getPropertyValue("--darkmode") === "true" ? "dark" : "light";
    }
    element.classList.toggle("darkmode", theme === "dark");
  }
});
h(document.body, "prefs.highContrast", {
  toDOM(element, highContrast) {
    element.classList.toggle("high-contrast", highContrast);
  }
});
window.addEventListener("popstate", () => {
  const filename = window.location.search.substring(1);
  app.currentDoc = app.docs.find((doc) => doc.filename === filename) || app.docs[0];
});
var filterDocs = vn(() => {
  console.time("filter");
  const needle = searchField.value.toLocaleLowerCase();
  app.docs.forEach((doc) => {
    doc.hidden = !doc.title.toLocaleLowerCase().includes(needle) && !doc.text.toLocaleLowerCase().includes(needle);
  });
  j(app.docs);
  console.timeEnd("filter");
});
var searchField = input7({
  slot: "nav",
  placeholder: "search",
  type: "search",
  style: {
    width: "calc(100% - 10px)",
    margin: "5px"
  },
  onInput: filterDocs
});
if (main)
  main.append(header(a5({
    href: "/",
    style: {
      display: "flex",
      alignItems: "center",
      borderBottom: "none"
    },
    title: `tosijs ${An}, tosijs-ui ${version}`
  }, icons.tosiUi({
    style: { _xinIconSize: 40, marginRight: 10 }
  }), h23({ bindText: "app.title" })), span13({ class: "elastic" }), sizeBreak({
    minWidth: 750
  }, span13({
    style: {
      marginRight: Hn.spacing,
      display: "flex",
      alignItems: "center",
      gap: Hn.spacing50
    }
  }, a5({ href: app.bundleUrl }, img({ alt: "bundlejs size badge", src: app.bundleBadgeUrl })), a5({ href: app.cdnUrl }, img({ alt: "jsdelivr", src: app.cdnBadgeUrl }))), span13({ slot: "small" })), a5({ class: "iconic", title: "discord", target: "_blank" }, icons.discord(), {
    href: app.discordUrl
  }), a5({ class: "iconic", title: "blog", target: "_blank" }, icons.blog(), {
    href: app.blogUrl
  }), a5({ class: "iconic", title: "github", target: "_blank" }, icons.github(), {
    href: app.githubUrl
  }), a5({ class: "iconic", title: "npmjs", target: "_blank" }, icons.npm(), {
    href: app.npmUrl
  }), span13({ style: { flex: "0 0 10px" } }), button11({
    class: "iconic",
    style: { color: Hn.linkColor },
    title: "links and settings",
    onClick(event) {
      popMenu({
        target: event.target,
        localized: true,
        menuItems: [
          {
            caption: "Language",
            icon: "globe",
            menuItems: i18n.localeOptions.map((locale) => ({
              caption: locale.caption,
              icon: locale.icon,
              checked: () => locale.value.valueOf() === i18n.locale.valueOf(),
              action() {
                prefs.locale = locale.value.valueOf();
                setLocale(locale.value.valueOf());
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
                  return prefs.theme === "system";
                },
                action() {
                  prefs.theme = "system";
                }
              },
              {
                caption: "Dark",
                checked() {
                  return prefs.theme === "dark";
                },
                action() {
                  prefs.theme = "dark";
                }
              },
              {
                caption: "Light",
                checked() {
                  return prefs.theme === "light";
                },
                action() {
                  prefs.theme = "light";
                }
              },
              null,
              {
                caption: "High Contrast",
                checked() {
                  return prefs.highContrast;
                },
                action() {
                  prefs.highContrast = !prefs.highContrast;
                }
              }
            ]
          }
        ]
      });
    }
  }, icons.moreVertical())), sideNav({
    name: "Documentation",
    navSize: 200,
    minSize: 600,
    style: {
      flex: "1 1 auto",
      overflow: "hidden"
    }
  }, searchField, div13({
    slot: "nav",
    style: {
      display: "flex",
      flexDirection: "column",
      width: "100%",
      height: "100%",
      overflowY: "scroll"
    },
    bindList: {
      hiddenProp: "hidden",
      value: app.docs
    }
  }, template2(a5({
    class: "doc-link",
    bindCurrent: "app.currentDoc.filename",
    bindDocLink: "^.filename",
    onClick(event) {
      const a6 = event.target;
      const doc = mn(event.target);
      const nav = event.target.closest("xin-sidenav");
      nav.contentVisible = true;
      const { href } = a6;
      window.history.pushState({ href }, "", href);
      app.currentDoc = doc;
      event.preventDefault();
    }
  }, xinLocalized({ bindText: "^.title" })))), div13({
    style: {
      position: "relative",
      overflowY: "scroll",
      height: "100%"
    }
  }, button11({
    title: "show navigation",
    class: "transparent close-nav show-within-compact",
    style: {
      marginTop: "2px",
      position: "fixed"
    },
    onClick(event) {
      event.target.closest("xin-sidenav").contentVisible = false;
    }
  }, icons.chevronLeft()), markdownViewer({
    style: {
      display: "block",
      maxWidth: "44em",
      margin: "auto",
      padding: `0 1em`,
      overflow: "hidden"
    },
    bindValue: "app.currentDoc.text",
    didRender() {
      LiveExample.insertExamples(this, { tosijs: exports_module, tosijsui: exports_src });
    }
  }))));
