import "./chunk-PX6F3LHL.js";

// node_modules/docx/dist/index.mjs
var __commonJSMin = (cb, mod) => () => (mod || (cb((mod = { exports: {} }).exports, mod, mod.exports), cb = null), mod.exports);
function _typeof(o) {
  "@babel/helpers - typeof";
  return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(o2) {
    return typeof o2;
  } : function(o2) {
    return o2 && "function" == typeof Symbol && o2.constructor === Symbol && o2 !== Symbol.prototype ? "symbol" : typeof o2;
  }, _typeof(o);
}
function toPrimitive(t, r) {
  if ("object" != _typeof(t) || !t) return t;
  var e = t[Symbol.toPrimitive];
  if (void 0 !== e) {
    var i2 = e.call(t, r || "default");
    if ("object" != _typeof(i2)) return i2;
    throw new TypeError("@@toPrimitive must return a primitive value.");
  }
  return ("string" === r ? String : Number)(t);
}
function toPropertyKey(t) {
  var i2 = toPrimitive(t, "string");
  return "symbol" == _typeof(i2) ? i2 : i2 + "";
}
function _defineProperty(e, r, t) {
  return (r = toPropertyKey(r)) in e ? Object.defineProperty(e, r, {
    value: t,
    enumerable: true,
    configurable: true,
    writable: true
  }) : e[r] = t, e;
}
var BaseXmlComponent = class {
  /**
  * Creates a new BaseXmlComponent with the specified XML element name.
  *
  * @param rootKey - The XML element name (e.g., "w:p", "w:r", "w:t")
  */
  constructor(rootKey) {
    _defineProperty(
      this,
      /** The XML element name for this component (e.g., "w:p" for paragraph). */
      "rootKey",
      void 0
    );
    this.rootKey = rootKey;
  }
  /**
  * The components written in this one's place, one after another, when it can't be written as a single element,
  * such as a run with another run in its children. Undefined when it is written as itself.
  *
  * @internal
  */
  get writtenAs() {
  }
};
var isXmlComponent = (value) => value instanceof BaseXmlComponent || typeof value === "object" && value !== null && typeof value.prepForXml === "function";
var elementOf = (value) => isXmlComponent(value) ? value.rootKey : void 0;
var EMPTY_OBJECT = Object.seal({});
var XmlComponent = class extends BaseXmlComponent {
  /**
  * Creates a new XmlComponent.
  *
  * @param rootKey - The XML element name (e.g., "w:p", "w:r", "w:t")
  */
  constructor(rootKey) {
    super(rootKey);
    _defineProperty(
      this,
      /**
      * Array of child components, text nodes, and attributes.
      *
      * This array forms the content of the XML element. It can contain other
      * XmlComponents, string values (text nodes), or attribute components.
      */
      "root",
      void 0
    );
    this.root = new Array();
  }
  /**
  * Prepares this component and its children for XML serialization.
  *
  * This method is called by the Formatter to convert the component tree into
  * an object structure compatible with the xml library (https://www.npmjs.com/package/xml).
  * It recursively processes all children and handles special cases like
  * attribute-only elements and empty elements.
  *
  * The method can be overridden by subclasses to customize XML representation
  * or execute side effects during serialization (e.g., creating relationships).
  *
  * @param context - The serialization context containing document state
  * @returns The XML-serializable object, or undefined to exclude from output
  *
  * @example
  * ```typescript
  * // Override to add custom serialization logic
  * prepForXml(context: IContext): IXmlableObject | undefined {
  *   // Custom logic here
  *   return super.prepForXml(context);
  * }
  * ```
  */
  prepForXml(context) {
    var _children$;
    context.stack.push(this);
    const children = this.root.flatMap((comp) => {
      if (isXmlComponent(comp)) {
        const parts = comp.writtenAs;
        return parts ? parts.map((part) => part.prepForXml(context)) : comp.prepForXml(context);
      }
      return comp;
    }).filter((comp) => comp !== void 0);
    context.stack.pop();
    return { [this.rootKey]: children.length ? children.length === 1 && ((_children$ = children[0]) === null || _children$ === void 0 ? void 0 : _children$._attr) ? children[0] : children : EMPTY_OBJECT };
  }
  /**
  * Adds a child element to this component.
  *
  * @deprecated Do not use this method. It is only used internally by the library. It will be removed in a future version.
  * @param child - The child component or text string to add
  * @returns This component (for chaining)
  */
  addChildElement(child2) {
    this.root.push(child2);
    return this;
  }
};
var IgnoreIfEmptyXmlComponent = class extends XmlComponent {
  constructor(rootKey, includeIfEmpty) {
    super(rootKey);
    _defineProperty(this, "includeIfEmpty", void 0);
    this.includeIfEmpty = includeIfEmpty;
  }
  /**
  * Prepares the component for XML serialization, excluding it if empty.
  *
  * @param context - The serialization context
  * @returns The XML-serializable object, or undefined if empty
  */
  prepForXml(context) {
    const result = super.prepForXml(context);
    if (this.includeIfEmpty) return result;
    return result && (typeof result[this.rootKey] !== "object" || Object.keys(result[this.rootKey]).length) ? result : void 0;
  }
};
function ownKeys(e, r) {
  var t = Object.keys(e);
  if (Object.getOwnPropertySymbols) {
    var o = Object.getOwnPropertySymbols(e);
    r && (o = o.filter(function(r2) {
      return Object.getOwnPropertyDescriptor(e, r2).enumerable;
    })), t.push.apply(t, o);
  }
  return t;
}
function _objectSpread2(e) {
  for (var r = 1; r < arguments.length; r++) {
    var t = null != arguments[r] ? arguments[r] : {};
    r % 2 ? ownKeys(Object(t), true).forEach(function(r2) {
      _defineProperty(e, r2, t[r2]);
    }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function(r2) {
      Object.defineProperty(e, r2, Object.getOwnPropertyDescriptor(t, r2));
    });
  }
  return e;
}
var XmlAttributeComponent = class extends BaseXmlComponent {
  /**
  * Creates a new attribute component.
  *
  * @param root - The attribute data object
  */
  constructor(root) {
    super("_attr");
    _defineProperty(this, "root", void 0);
    _defineProperty(
      this,
      /** Optional mapping from property names to XML attribute names. */
      "xmlKeys",
      void 0
    );
    this.root = root;
  }
  /**
  * Converts the attribute data to an XML-serializable object.
  *
  * This method transforms the property names using xmlKeys (if defined)
  * and filters out undefined values.
  *
  * @param _ - Context (unused for attributes)
  * @returns Object with _attr key containing the mapped attributes
  */
  prepForXml(_) {
    const attrs = {};
    Object.entries(this.root).forEach(([key, value]) => {
      if (value !== void 0) {
        const newKey = this.xmlKeys && this.xmlKeys[key] || key;
        attrs[newKey] = value;
      }
    });
    return { _attr: attrs };
  }
};
var NextAttributeComponent = class extends BaseXmlComponent {
  /**
  * Creates a new NextAttributeComponent.
  *
  * @param root - Attribute payload with explicit key-value mappings
  */
  constructor(root) {
    super("_attr");
    _defineProperty(this, "root", void 0);
    this.root = root;
  }
  /**
  * Converts the attribute payload to an XML-serializable object.
  *
  * Extracts the key and value from each property and filters out
  * undefined values.
  *
  * @param _ - Context (unused for attributes)
  * @returns Object with _attr key containing the attributes
  */
  prepForXml(_) {
    return { _attr: Object.values(this.root).filter(({ value }) => value !== void 0).reduce((acc, { key, value }) => _objectSpread2(_objectSpread2({}, acc), {}, { [key]: value }), {}) };
  }
};
var Attributes = class extends XmlAttributeComponent {
  constructor(..._args) {
    super(..._args);
    _defineProperty(this, "xmlKeys", {
      val: "w:val",
      color: "w:color",
      fill: "w:fill",
      space: "w:space",
      sz: "w:sz",
      type: "w:type",
      rsidR: "w:rsidR",
      rsidRPr: "w:rsidRPr",
      rsidSect: "w:rsidSect",
      w: "w:w",
      h: "w:h",
      top: "w:top",
      right: "w:right",
      bottom: "w:bottom",
      left: "w:left",
      header: "w:header",
      footer: "w:footer",
      gutter: "w:gutter",
      linePitch: "w:linePitch",
      pos: "w:pos"
    });
  }
};
function _objectWithoutPropertiesLoose(r, e) {
  if (null == r) return {};
  var t = {};
  for (var n in r) if ({}.hasOwnProperty.call(r, n)) {
    if (e.includes(n)) continue;
    t[n] = r[n];
  }
  return t;
}
function _objectWithoutProperties(e, t) {
  if (null == e) return {};
  var o, r, i2 = _objectWithoutPropertiesLoose(e, t);
  if (Object.getOwnPropertySymbols) {
    var s = Object.getOwnPropertySymbols(e);
    for (r = 0; r < s.length; r++) o = s[r], t.includes(o) || {}.propertyIsEnumerable.call(e, o) && (i2[o] = e[o]);
  }
  return i2;
}
var _excluded$4 = ["elements"];
var PREDEFINED_ENTITIES = /* @__PURE__ */ new Map([
  ["amp", "&"],
  ["lt", "<"],
  ["gt", ">"],
  ["quot", '"'],
  ["apos", "'"]
]);
var ENTITY_REFERENCE = /&([^;]*);?/g;
var decodeEntities = (raw) => raw.indexOf("&") === -1 ? raw : raw.replace(ENTITY_REFERENCE, (reference, name) => {
  if (!reference.endsWith(";")) throw new Error(`Invalid XML: "&" that starts no entity, in "${raw}"`);
  const predefined = PREDEFINED_ENTITIES.get(name);
  if (predefined !== void 0) return predefined;
  const codePoint = /^#x[0-9a-f]+$/i.test(name) ? parseInt(name.slice(2), 16) : /^#[0-9]+$/.test(name) ? parseInt(name.slice(1), 10) : NaN;
  if (!(codePoint > 0 && codePoint <= 1114111)) throw new Error(`Invalid XML: unknown entity "${reference}"`);
  return String.fromCodePoint(codePoint);
});
var isWhitespace = (char) => char === " " || char === "\n" || char === "	" || char === "\r";
var DECLARATION_ATTRIBUTE = /([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
var parseDeclarationAttributes = (body) => Object.fromEntries([...body.matchAll(DECLARATION_ATTRIBUTE)].map(([, name, doubleQuoted, singleQuoted]) => [name, doubleQuoted !== null && doubleQuoted !== void 0 ? doubleQuoted : singleQuoted]));
var parseXml = (text, { keepWhitespaceText = false } = {}) => {
  const document = {};
  const open = [];
  let position = text.charCodeAt(0) === 65279 ? 1 : 0;
  while (position < text.length && isWhitespace(text[position])) position++;
  const append = (node) => {
    var _parent$elements;
    const parent = open.length === 0 ? document : open[open.length - 1];
    ((_parent$elements = parent.elements) !== null && _parent$elements !== void 0 ? _parent$elements : parent.elements = []).push(node);
  };
  const appendText = (raw) => {
    if (raw.trim() === "") {
      if (raw !== "" && keepWhitespaceText) append({
        type: "text",
        text: raw
      });
      return;
    }
    if (open.length === 0) throw new Error(`Invalid XML: text outside of the root element, "${raw.trim()}"`);
    append({
      type: "text",
      text: decodeEntities(raw)
    });
  };
  const indexOfOrThrow = (search, from, what) => {
    const index = text.indexOf(search, from);
    if (index === -1) throw new Error(`Invalid XML: ${what} that isn't closed`);
    return index;
  };
  while (position < text.length) {
    const tagStart = text.indexOf("<", position);
    appendText(text.slice(position, tagStart === -1 ? text.length : tagStart));
    if (tagStart === -1) break;
    if (text.startsWith("<?", tagStart)) {
      const end = indexOfOrThrow("?>", tagStart + 2, "processing instruction");
      const content = text.slice(tagStart + 2, end);
      const nameEnd = content.search(/\s/);
      const name = nameEnd === -1 ? content : content.slice(0, nameEnd);
      const body = nameEnd === -1 ? "" : content.slice(nameEnd).trimStart();
      if (name.toLowerCase() === "xml") {
        const attributes = parseDeclarationAttributes(body);
        document.declaration = Object.keys(attributes).length > 0 ? { attributes } : {};
      } else append({
        type: "instruction",
        name,
        instruction: body
      });
      position = end + 2;
    } else if (text.startsWith("<!--", tagStart)) {
      const end = indexOfOrThrow("-->", tagStart + 4, "comment");
      const comment = text.slice(tagStart + 4, end);
      if (comment !== "") append({
        type: "comment",
        comment
      });
      position = end + 3;
    } else if (text.startsWith("<![CDATA[", tagStart)) {
      const end = indexOfOrThrow("]]>", tagStart + 9, "CDATA section");
      const cdata = text.slice(tagStart + 9, end);
      if (cdata !== "") append({
        type: "cdata",
        cdata
      });
      position = end + 3;
    } else if (text.startsWith("<!DOCTYPE", tagStart)) {
      let end = tagStart + 9;
      let quote;
      let inSubset = false;
      for (; end < text.length; end++) {
        const char = text[end];
        if (quote !== void 0) quote = char === quote ? void 0 : quote;
        else if (char === '"' || char === "'") quote = char;
        else if (char === "[") inSubset = true;
        else if (char === "]") inSubset = false;
        else if (char === ">" && !inSubset) break;
      }
      if (end === text.length) throw new Error("Invalid XML: DOCTYPE that isn't closed");
      append({
        type: "doctype",
        doctype: text.slice(tagStart + 9, end).replace(/^ /, "")
      });
      position = end + 1;
    } else if (text.startsWith("</", tagStart)) {
      const end = indexOfOrThrow(">", tagStart + 2, "closing tag");
      const name = text.slice(tagStart + 2, end).trimEnd();
      const element = open.pop();
      if ((element === null || element === void 0 ? void 0 : element.name) !== name) {
        var _element$name;
        throw new Error(`Invalid XML: closing tag </${name}> doesn't match <${(_element$name = element === null || element === void 0 ? void 0 : element.name) !== null && _element$name !== void 0 ? _element$name : ""}>`);
      }
      position = end + 1;
    } else position = parseStartTag(text, tagStart + 1, (element, selfClosing) => {
      append(element);
      if (!selfClosing) open.push(element);
    });
  }
  if (open.length > 0) throw new Error(`Invalid XML: <${open[open.length - 1].name}> isn't closed`);
  const { elements } = document, rest = _objectWithoutProperties(document, _excluded$4);
  return elements === void 0 ? rest : _objectSpread2(_objectSpread2({}, rest), {}, { elements });
};
var parseStartTag = (text, from, onElement) => {
  let nameEnd = from;
  while (nameEnd < text.length && !isWhitespace(text[nameEnd]) && text[nameEnd] !== "/" && text[nameEnd] !== ">") nameEnd++;
  const name = text.slice(from, nameEnd);
  if (name === "") throw new Error("Invalid XML: tag without a name");
  const attributes = [];
  let position = nameEnd;
  for (; ; ) {
    while (position < text.length && isWhitespace(text[position])) position++;
    if (position >= text.length) throw new Error(`Invalid XML: <${name}> that isn't closed`);
    if (text[position] === ">" || text.startsWith("/>", position)) {
      const selfClosing = text[position] === "/";
      onElement(_objectSpread2({
        type: "element",
        name
      }, attributes.length > 0 ? { attributes: Object.fromEntries(attributes) } : {}), selfClosing);
      return position + (selfClosing ? 2 : 1);
    }
    const equals = text.indexOf("=", position);
    const attributeName = text.slice(position, equals === -1 ? text.length : equals).trimEnd();
    if (equals === -1 || attributeName === "" || /[\s/>]/.test(attributeName)) throw new Error(`Invalid XML: attribute of <${name}> without a value`);
    let valueStart = equals + 1;
    while (valueStart < text.length && isWhitespace(text[valueStart])) valueStart++;
    const quote = text[valueStart];
    if (quote !== '"' && quote !== "'") throw new Error(`Invalid XML: value of ${attributeName} on <${name}> isn't quoted`);
    const valueEnd = text.indexOf(quote, valueStart + 1);
    if (valueEnd === -1) throw new Error(`Invalid XML: value of ${attributeName} on <${name}> isn't closed`);
    if (!attributes.some(([existing]) => existing === attributeName)) attributes.push([attributeName, decodeEntities(text.slice(valueStart + 1, valueEnd))]);
    position = valueEnd + 1;
  }
};
var ESCAPES = /* @__PURE__ */ new Map([
  ["&", "&amp;"],
  ['"', "&quot;"],
  ["'", "&apos;"],
  ["<", "&lt;"],
  [">", "&gt;"]
]);
var escapeAll = (value) => value.replace(/[&"'<>\x00-\x08\x0B\x0C\x0E-\x1F]/g, (char) => {
  var _ESCAPES$get;
  return (_ESCAPES$get = ESCAPES.get(char)) !== null && _ESCAPES$get !== void 0 ? _ESCAPES$get : "";
});
var escapeText = (value) => value.replace(/[&<>\x00-\x08\x0B\x0C\x0E-\x1F]/g, (char) => {
  var _ESCAPES$get2;
  return (_ESCAPES$get2 = ESCAPES.get(char)) !== null && _ESCAPES$get2 !== void 0 ? _ESCAPES$get2 : "";
});
var escapeValue = (value) => typeof value === "string" ? escapeAll(value) : value;
var resolve = (data, indent, depth) => {
  const name = Object.keys(data)[0];
  const values = name === void 0 ? void 0 : data[name];
  const attributes = [];
  const content = [];
  const addAttributes = (attr) => {
    for (const [key, value] of Object.entries(attr)) attributes.push(`${key}="${String(escapeValue(value))}"`);
  };
  if (typeof values === "object") {
    if (values !== null) {
      const { _attr: attr, _cdata: cdata } = values;
      if (attr) addAttributes(attr);
      if (cdata) content.push(`<![CDATA[${cdata.replace(/\]\]>/g, "]]]]><![CDATA[>")}]]>`);
      if (Array.isArray(values)) {
        let isStringContent = false;
        content.push("");
        for (const value of values) if (typeof value === "object") {
          if (Object.keys(value)[0] === "_attr") addAttributes(value._attr);
          else content.push(resolve(value, indent, depth + 1));
        } else {
          content.pop();
          isStringContent = true;
          content.push(escapeValue(value));
        }
        if (!isStringContent) content.push("");
      }
    }
  } else content.push(escapeValue(values));
  return {
    name,
    attributes,
    content,
    indents: depth > 1 ? indent.repeat(depth - 1) : ""
  };
};
var format = (element, indent, isLast) => {
  if (typeof element !== "object") return String(element);
  const { name, attributes, content, indents } = element;
  const { length } = content;
  const open = indents + (name ? `<${name}` : "") + (attributes.length > 0 ? ` ${attributes.join(" ")}` : "") + (length > 0 ? name ? ">" : "" : "/>") + (indent && length > 1 ? "\n" : "");
  if (length === 0) return open + (indent ? "\n" : "");
  return open + content.map((child2) => child2 === void 0 ? "" : format(child2, indent, false)).join("") + (length > 1 ? indents : "") + (name ? `</${name}>` : "") + (indent && !isLast ? "\n" : "");
};
var stringifyXmlable = (input, { indent = "", declaration } = {}) => {
  const items = Array.isArray(input) ? input : [input];
  const startDepth = indent ? 1 : 0;
  const standalone = (declaration === null || declaration === void 0 ? void 0 : declaration.standalone) ? ` standalone="${escapeAll(declaration.standalone)}"` : "";
  return (declaration === void 0 ? "" : `<?xml version="1.0" encoding="${escapeAll(declaration.encoding || "UTF-8")}"${standalone}?>${indent ? "\n" : ""}`) + items.map((item, i2) => format(resolve(item, indent, startDepth), indent, i2 === items.length - 1)).join("");
};
var stringifyAttributes = (attributes) => Object.entries(attributes !== null && attributes !== void 0 ? attributes : {}).flatMap(([key, value]) => value === void 0 || value === null ? [] : [` ${key}="${escapeAll(String(value))}"`]).join("");
var stringifyNode = (node) => {
  switch (node.type) {
    case "element": {
      var _node$elements, _node$attributes;
      const elements = (_node$elements = node.elements) !== null && _node$elements !== void 0 ? _node$elements : [];
      const open = `<${node.name}${stringifyAttributes(node.attributes)}`;
      return elements.length > 0 || ((_node$attributes = node.attributes) === null || _node$attributes === void 0 ? void 0 : _node$attributes["xml:space"]) === "preserve" ? `${open}>${elements.map(stringifyNode).join("")}</${node.name}>` : `${open}/>`;
    }
    case "text":
      return escapeText(String(node.text));
    case "cdata":
      return `<![CDATA[${String(node.cdata).replace(/\]\]>/g, "]]]]><![CDATA[>")}]]>`;
    case "comment":
      return `<!--${node.comment}-->`;
    case "doctype":
      return `<!DOCTYPE ${node.doctype}>`;
    case "instruction":
      return `<?${node.name}${node.instruction ? ` ${node.instruction}` : ""}?>`;
    default:
      return "";
  }
};
var stringifyElement = (document) => {
  var _document$elements;
  return (document.declaration ? `<?xml${stringifyAttributes(document.declaration.attributes)}?>` : "") + ((_document$elements = document.elements) !== null && _document$elements !== void 0 ? _document$elements : []).map(stringifyNode).join("");
};
var convertToXmlComponent = (element) => {
  switch (element.type) {
    case void 0:
    case "element":
      const xmlComponent = new ImportedXmlComponent(element.name, element.attributes);
      const childElements2 = element.elements || [];
      for (const childElm of childElements2) {
        const child2 = convertToXmlComponent(childElm);
        if (child2 !== void 0) xmlComponent.push(child2);
      }
      return xmlComponent;
    case "text":
      return element.text;
    default:
      return;
  }
};
var ImportedXmlComponentAttributes = class extends XmlAttributeComponent {
};
var ImportedXmlComponent = class extends XmlComponent {
  /**
  * Parses an XML string and converts it to an ImportedXmlComponent tree.
  *
  * This static method is the primary way to import external XML content.
  * It parses the XML string into an {@link XmlElement} tree,
  * then converts that into a tree of XmlComponent objects.
  *
  * @param importedContent - The XML content as a string
  * @returns An ImportedXmlComponent representing the parsed XML
  *
  * @example
  * ```typescript
  * const xml = '<w:p><w:r><w:t>Hello</w:t></w:r></w:p>';
  * const component = ImportedXmlComponent.fromXmlString(xml);
  * ```
  */
  static fromXmlString(importedContent) {
    return convertToXmlComponent(parseXml(importedContent));
  }
  /**
  * Creates an ImportedXmlComponent.
  *
  * @param rootKey - The XML element name
  * @param _attr - Optional attributes for the root element
  */
  constructor(rootKey, _attr) {
    super(rootKey);
    if (_attr) this.root.push(new ImportedXmlComponentAttributes(_attr));
  }
  /**
  * Adds a child component or text to this element.
  *
  * @param xmlComponent - The child component or text string to add
  */
  push(xmlComponent) {
    this.root.push(xmlComponent);
  }
};
var ImportedRootElementAttributes = class extends XmlComponent {
  /**
  * Creates an ImportedRootElementAttributes component.
  *
  * @param _attr - The attributes object to pass through
  */
  constructor(_attr) {
    super("");
    _defineProperty(this, "_attr", void 0);
    this._attr = _attr;
  }
  /**
  * Prepares the attributes for XML serialization.
  *
  * @param _ - Context (unused)
  * @returns Object with _attr key containing the raw attributes
  */
  prepForXml(_) {
    return { _attr: this._attr };
  }
};
var InitializableXmlComponent = class extends XmlComponent {
  /**
  * Creates a new InitializableXmlComponent.
  *
  * @param rootKey - The XML element name
  * @param initComponent - Optional component to copy children from
  */
  constructor(rootKey, initComponent) {
    super(rootKey);
    if (initComponent) this.root = initComponent.root;
  }
};
var decimalNumber = (val) => {
  if (!Number.isFinite(val)) throw new Error(`Invalid value '${val}' specified. Must be an integer.`);
  return Math.floor(val);
};
var unsignedDecimalNumber = (val) => {
  const value = decimalNumber(val);
  if (value < 0) throw new Error(`Invalid value '${val}' specified. Must be a positive integer.`);
  return value;
};
var hexBinary = (val, length) => {
  const expectedLength = length * 2;
  if (val.length !== expectedLength || isNaN(Number(`0x${val}`))) throw new Error(`Invalid hex value '${val}'. Expected ${expectedLength} digit hex value`);
  return val;
};
var longHexNumber = (val) => hexBinary(val, 4);
var shortHexNumber = (val) => hexBinary(val, 2);
var uCharHexNumber = (val) => hexBinary(val, 1);
var universalMeasureValue = (val) => {
  const unit = val.slice(-2);
  const amount = val.substring(0, val.length - 2);
  return `${Number(amount)}${unit}`;
};
var TWIPS_PER_UNIT = {
  in: 1440,
  cm: 1440 / 2.54,
  mm: 1440 / 25.4,
  pt: 20,
  pc: 240,
  pi: 240
};
var universalMeasureToTwips = (val) => {
  if (typeof val === "number") return val;
  const unit = val.slice(-2);
  const amount = Number(val.substring(0, val.length - 2));
  const twipsPerUnit = TWIPS_PER_UNIT[unit];
  if (twipsPerUnit === void 0 || Number.isNaN(amount)) throw new Error(`Invalid universal measure '${val}'. Expected a number followed by mm, cm, in, pt, pc or pi.`);
  return amount * twipsPerUnit;
};
var positiveUniversalMeasureValue = (val) => {
  const value = universalMeasureValue(val);
  if (parseFloat(value) < 0) throw new Error(`Invalid value '${value}' specified. Expected a positive number.`);
  return value;
};
var hexColorValue = (val) => {
  if (val === "auto") return val;
  return hexBinary(val.charAt(0) === "#" ? val.substring(1) : val, 3);
};
var signedTwipsMeasureValue = (val) => typeof val === "string" ? universalMeasureValue(val) : decimalNumber(val);
var hpsMeasureValue = (val) => typeof val === "string" ? positiveUniversalMeasureValue(val) : unsignedDecimalNumber(val);
var signedHpsMeasureValue = (val) => typeof val === "string" ? universalMeasureValue(val) : decimalNumber(val);
var twipsMeasureValue = (val) => typeof val === "string" ? positiveUniversalMeasureValue(val) : unsignedDecimalNumber(val);
var percentageValue = (val) => {
  const percent = val.substring(0, val.length - 1);
  return `${Number(percent)}%`;
};
var measurementOrPercentValue = (val) => {
  if (typeof val === "number") return decimalNumber(val);
  return val.slice(-1) === "%" ? percentageValue(val) : universalMeasureValue(val);
};
var eighthPointMeasureValue = unsignedDecimalNumber;
var pointMeasureValue = unsignedDecimalNumber;
var dateTimeValue = (val) => val.toISOString();
var OnOffElement = class extends XmlComponent {
  /**
  * Creates an OnOffElement.
  *
  * @param name - The XML element name (e.g., "w:b", "w:i")
  * @param val - The boolean value (defaults to true)
  */
  constructor(name, val = true) {
    super(name);
    if (val !== true) this.root.push(new Attributes({ val }));
  }
};
var HpsMeasureElement = class extends XmlComponent {
  /**
  * Creates an HpsMeasureElement.
  *
  * @param name - The XML element name
  * @param val - The measurement value (number in half-points or string with units)
  */
  constructor(name, val) {
    super(name);
    this.root.push(new Attributes({ val: hpsMeasureValue(val) }));
  }
};
var EmptyElement = class extends XmlComponent {
};
var StringValueElement = class extends XmlComponent {
  /**
  * Creates a StringValueElement.
  *
  * @param name - The XML element name
  * @param val - The string value
  */
  constructor(name, val) {
    super(name);
    this.root.push(new Attributes({ val }));
  }
};
var createStringElement = (name, value) => new BuilderElement({
  name,
  attributes: { value: {
    key: "w:val",
    value
  } }
});
var NumberValueElement = class extends XmlComponent {
  /**
  * Creates a NumberValueElement.
  *
  * @param name - The XML element name
  * @param val - The numeric value
  */
  constructor(name, val) {
    super(name);
    this.root.push(new Attributes({ val }));
  }
};
var StringEnumValueElement = class extends XmlComponent {
  /**
  * Creates a StringEnumValueElement.
  *
  * @param name - The XML element name
  * @param val - The enum value
  */
  constructor(name, val) {
    super(name);
    this.root.push(new Attributes({ val }));
  }
};
var StringContainer = class extends XmlComponent {
  /**
  * Creates a StringContainer.
  *
  * @param name - The XML element name
  * @param val - The text content
  */
  constructor(name, val) {
    super(name);
    this.root.push(val);
  }
};
var BuilderElement = class extends XmlComponent {
  /**
  * Creates a BuilderElement with the specified configuration.
  *
  * @param config - Element configuration
  * @param config.name - The XML element name
  * @param config.attributes - Optional attributes with explicit key-value pairs
  * @param config.children - Optional child elements
  */
  constructor({ name, attributes, children }) {
    super(name);
    if (attributes) this.root.push(new NextAttributeComponent(attributes));
    if (children) this.root.push(...children);
  }
};
var AlignmentType = {
  /** Align Start: the left in a left-to-right paragraph, and the right in a `bidirectional` (right-to-left) paragraph */
  START: "start",
  /** Align Center */
  CENTER: "center",
  /** Align End: the right in a left-to-right paragraph, and the left in a `bidirectional` (right-to-left) paragraph */
  END: "end",
  /** Justified */
  BOTH: "both",
  /** Medium Kashida Length */
  MEDIUM_KASHIDA: "mediumKashida",
  /** Distribute All Characters Equally */
  DISTRIBUTE: "distribute",
  /** Align to List Tab */
  NUM_TAB: "numTab",
  /** Widest Kashida Length */
  HIGH_KASHIDA: "highKashida",
  /** Low Kashida Length */
  LOW_KASHIDA: "lowKashida",
  /** Thai Language Justification */
  THAI_DISTRIBUTE: "thaiDistribute",
  /** Align Left: a paragraph stays on the left of the page even when it is `bidirectional` (right-to-left) */
  LEFT: "left",
  /** Align Right: a paragraph stays on the right of the page even when it is `bidirectional` (right-to-left) */
  RIGHT: "right",
  /** Justified */
  JUSTIFIED: "both"
};
var createAlignment = (type) => new BuilderElement({
  name: "w:jc",
  attributes: { val: {
    key: "w:val",
    value: type
  } }
});
var COLOR_OOXML_NAMES = {
  dark1: "dk1",
  light1: "lt1",
  dark2: "dk2",
  light2: "lt2",
  accent1: "accent1",
  accent2: "accent2",
  accent3: "accent3",
  accent4: "accent4",
  accent5: "accent5",
  accent6: "accent6",
  hyperlink: "hlink",
  followedHyperlink: "folHlink"
};
var OFFICE_COLORS = {
  dark2: "44546A",
  light2: "E7E6E6",
  accent1: "4472C4",
  accent2: "ED7D31",
  accent3: "A5A5A5",
  accent4: "FFC000",
  accent5: "5B9BD5",
  accent6: "70AD47",
  hyperlink: "0563C1",
  followedHyperlink: "954F72"
};
var OFFICE_SYSTEM_COLORS = {
  dark1: {
    value: "windowText",
    lastColor: "000000"
  },
  light1: {
    value: "window",
    lastColor: "FFFFFF"
  }
};
var rgbColorValue = (name, color) => {
  if (color === "auto") throw new Error(`Invalid theme color ${name} 'auto'. Expected 6 digit hex value`);
  return hexColorValue(color);
};
var themeColorValues = (colors = {}) => Object.fromEntries(Object.keys(COLOR_OOXML_NAMES).map((name) => {
  const color = colors[name];
  const office = name === "dark1" || name === "light1" ? OFFICE_SYSTEM_COLORS[name].lastColor : OFFICE_COLORS[name];
  return [name, color === void 0 ? office : rgbColorValue(name, color)];
}));
var createRgbColor = (name, color) => new BuilderElement({
  name: "a:srgbClr",
  attributes: { value: {
    key: "val",
    value: rgbColorValue(name, color)
  } }
});
var createColor = (name, colors) => {
  const color = colors[name];
  const system = name === "dark1" || name === "light1" ? OFFICE_SYSTEM_COLORS[name] : void 0;
  return new BuilderElement({
    name: `a:${COLOR_OOXML_NAMES[name]}`,
    children: [color === void 0 && system ? new BuilderElement({
      name: "a:sysClr",
      attributes: {
        value: {
          key: "val",
          value: system.value
        },
        lastColor: {
          key: "lastClr",
          value: system.lastColor
        }
      }
    }) : createRgbColor(name, color !== null && color !== void 0 ? color : OFFICE_COLORS[name])]
  });
};
var createColorScheme = (name, colors = {}) => new BuilderElement({
  name: "a:clrScheme",
  attributes: { name: {
    key: "name",
    value: name
  } },
  children: Object.keys(COLOR_OOXML_NAMES).map((color) => createColor(color, colors))
});
var THEME_COLOR_NAMES = /* @__PURE__ */ new Set([
  "dark1",
  "light1",
  "dark2",
  "light2",
  "accent1",
  "accent2",
  "accent3",
  "accent4",
  "accent5",
  "accent6",
  "hyperlink",
  "followedHyperlink"
]);
var THEME_COLOR_SUGGESTIONS = /* @__PURE__ */ new Map([
  ["dk1", "dark1"],
  ["lt1", "light1"],
  ["dk2", "dark2"],
  ["lt2", "light2"],
  ["hlink", "hyperlink"],
  ["folHlink", "followedHyperlink"],
  ["text1", "dark1"],
  ["background1", "light1"],
  ["text2", "dark2"],
  ["background2", "light2"]
]);
var changeValue = (value, option) => {
  if (!(value >= 0 && value <= 100)) throw new Error(`Invalid ${option} ${value}. Expected a number from 0 to 100`);
  return Math.round(255 * (1 - value / 100));
};
var themeColorChange = ({ theme, lighter, darker }) => {
  if (!THEME_COLOR_NAMES.has(theme)) {
    const suggestion = THEME_COLOR_SUGGESTIONS.get(theme);
    throw new Error(`Invalid theme color "${theme}". ${suggestion ? `Did you mean "${suggestion}"?` : `Expected one of ${[...THEME_COLOR_NAMES].join(", ")}`}`);
  }
  if (lighter !== void 0 && darker !== void 0) throw new Error("Invalid theme color. Expected lighter or darker, not both");
  const tint = lighter === void 0 ? void 0 : changeValue(lighter, "lighter");
  const shade = darker === void 0 ? void 0 : changeValue(darker, "darker");
  return {
    tint: tint === 255 ? void 0 : tint,
    shade: shade === 255 ? void 0 : shade
  };
};
var toHsl = (hex) => {
  const [red, green, blue] = [
    0,
    2,
    4
  ].map((index) => parseInt(hex.slice(index, index + 2), 16) / 255);
  const max2 = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const lightness = (max2 + min) / 2;
  const range = max2 - min;
  if (range === 0) return {
    hue: 0,
    saturation: 0,
    lightness
  };
  return {
    hue: (max2 === red ? ((green - blue) / range + 6) % 6 : max2 === green ? (blue - red) / range + 2 : (red - green) / range + 4) * 60,
    saturation: range / (1 - Math.abs(2 * lightness - 1)),
    lightness
  };
};
var toHex = ({ hue, saturation, lightness }) => {
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const second = chroma * (1 - Math.abs(hue / 60 % 2 - 1));
  const [red, green, blue] = hue < 60 ? [
    chroma,
    second,
    0
  ] : hue < 120 ? [
    second,
    chroma,
    0
  ] : hue < 180 ? [
    0,
    chroma,
    second
  ] : hue < 240 ? [
    0,
    second,
    chroma
  ] : hue < 300 ? [
    second,
    0,
    chroma
  ] : [
    chroma,
    0,
    second
  ];
  const lowest = lightness - chroma / 2;
  return [
    red,
    green,
    blue
  ].map((value) => Math.floor((value + lowest) * 255 + 1e-9).toString(16).padStart(2, "0")).join("").toUpperCase();
};
var applyChange = (hex, { tint, shade }) => {
  if (tint === void 0 && shade === void 0) return hex;
  const hsl = toHsl(hex);
  const lightness = tint === void 0 ? hsl.lightness * shade / 255 : hsl.lightness * tint / 255 + (1 - tint / 255);
  return toHex(_objectSpread2(_objectSpread2({}, hsl), {}, { lightness }));
};
var hexByte = (value) => value === void 0 ? void 0 : value.toString(16).padStart(2, "0").toUpperCase();
var checkColor = (color) => typeof color === "string" ? {
  type: "hex",
  value: hexColorValue(color)
} : {
  type: "theme",
  color,
  change: themeColorChange(color)
};
var colorValues = (checked, colors) => checked.type === "hex" ? { color: checked.value } : {
  color: applyChange(colors[checked.color.theme], checked.change),
  theme: checked.color.theme,
  tint: hexByte(checked.change.tint),
  shade: hexByte(checked.change.shade)
};
var OFFICE_THEME_COLORS = themeColorValues();
var ColorAttributeComponent = class extends BaseXmlComponent {
  /**
  * @throws If a color isn't valid
  */
  constructor(attributes) {
    super("_attr");
    _defineProperty(this, "attributes", void 0);
    this.attributes = attributes.map((attribute2) => "keys" in attribute2 ? {
      keys: attribute2.keys,
      color: attribute2.color === void 0 ? void 0 : checkColor(attribute2.color)
    } : attribute2);
  }
  prepForXml(context) {
    var _context$file$Theme$C, _context$file;
    const themeColors = (_context$file$Theme$C = (_context$file = context.file) === null || _context$file === void 0 || (_context$file = _context$file.Theme) === null || _context$file === void 0 ? void 0 : _context$file.Colors) !== null && _context$file$Theme$C !== void 0 ? _context$file$Theme$C : OFFICE_THEME_COLORS;
    const entries = this.attributes.flatMap((attribute2) => {
      if (!("keys" in attribute2)) return [[attribute2.key, attribute2.value]];
      if (attribute2.color === void 0) return [];
      const { keys } = attribute2;
      const values = colorValues(attribute2.color, themeColors);
      return [
        [keys.color, values.color],
        [keys.theme, values.theme],
        [keys.tint, values.tint],
        [keys.shade, values.shade]
      ];
    });
    return { _attr: Object.fromEntries(entries.filter(([, value]) => value !== void 0)) };
  }
};
var ColorElement = class extends XmlComponent {
  constructor(name, attributes) {
    super(name);
    this.root.push(new ColorAttributeComponent(attributes));
  }
};
var createColorElement = (name, attributes) => new ColorElement(name, attributes);
var COLOR_ATTRIBUTES = {
  color: "w:color",
  theme: "w:themeColor",
  tint: "w:themeTint",
  shade: "w:themeShade"
};
var createBorderElement = (elementName, { color, size, space, style }) => createColorElement(elementName, [
  {
    key: "w:val",
    value: style
  },
  {
    keys: COLOR_ATTRIBUTES,
    color
  },
  {
    key: "w:sz",
    value: size === void 0 ? void 0 : eighthPointMeasureValue(size)
  },
  {
    key: "w:space",
    value: space === void 0 ? void 0 : pointMeasureValue(space)
  }
]);
var BorderStyle = {
  /** a single line */
  SINGLE: "single",
  /** a line with a series of alternating thin and thick strokes */
  DASH_DOT_STROKED: "dashDotStroked",
  /** a dashed line */
  DASHED: "dashed",
  /** a dashed line with small gaps */
  DASH_SMALL_GAP: "dashSmallGap",
  /** a line with alternating dots and dashes */
  DOT_DASH: "dotDash",
  /** a line with a repeating dot - dot - dash sequence */
  DOT_DOT_DASH: "dotDotDash",
  /** a dotted line */
  DOTTED: "dotted",
  /** a double line */
  DOUBLE: "double",
  /** a double wavy line */
  DOUBLE_WAVE: "doubleWave",
  /** an inset set of lines */
  INSET: "inset",
  /** no border */
  NIL: "nil",
  /** no border */
  NONE: "none",
  /** an outset set of lines */
  OUTSET: "outset",
  /** a single line */
  THICK: "thick",
  /** a thick line contained within a thin line with a large-sized intermediate gap */
  THICK_THIN_LARGE_GAP: "thickThinLargeGap",
  /** a thick line contained within a thin line with a medium-sized intermediate gap */
  THICK_THIN_MEDIUM_GAP: "thickThinMediumGap",
  /** a thick line contained within a thin line with a small intermediate gap */
  THICK_THIN_SMALL_GAP: "thickThinSmallGap",
  /** a thin line contained within a thick line with a large-sized intermediate gap */
  THIN_THICK_LARGE_GAP: "thinThickLargeGap",
  /** a thick line contained within a thin line with a medium-sized intermediate gap */
  THIN_THICK_MEDIUM_GAP: "thinThickMediumGap",
  /** a thick line contained within a thin line with a small intermediate gap */
  THIN_THICK_SMALL_GAP: "thinThickSmallGap",
  /** a thin-thick-thin line with a large gap */
  THIN_THICK_THIN_LARGE_GAP: "thinThickThinLargeGap",
  /** a thin-thick-thin line with a medium gap */
  THIN_THICK_THIN_MEDIUM_GAP: "thinThickThinMediumGap",
  /** a thin-thick-thin line with a small gap */
  THIN_THICK_THIN_SMALL_GAP: "thinThickThinSmallGap",
  /** a three-staged gradient line, getting darker towards the paragraph */
  THREE_D_EMBOSS: "threeDEmboss",
  /** a three-staged gradient like, getting darker away from the paragraph */
  THREE_D_ENGRAVE: "threeDEngrave",
  /** a triple line */
  TRIPLE: "triple",
  /** a wavy line */
  WAVE: "wave"
};
var Border = class extends IgnoreIfEmptyXmlComponent {
  constructor(options) {
    super("w:pBdr");
    if (options.top) this.root.push(createBorderElement("w:top", options.top));
    if (options.left) this.root.push(createBorderElement("w:left", options.left));
    if (options.bottom) this.root.push(createBorderElement("w:bottom", options.bottom));
    if (options.right) this.root.push(createBorderElement("w:right", options.right));
    if (options.between) this.root.push(createBorderElement("w:between", options.between));
  }
};
var ThematicBreak = class extends XmlComponent {
  constructor() {
    super("w:pBdr");
    const bottom = createBorderElement("w:bottom", {
      color: "auto",
      space: 1,
      style: BorderStyle.SINGLE,
      size: 6
    });
    this.root.push(bottom);
  }
};
var createIndent = ({ start, end, left, right, hanging, firstLine, firstLineChars }) => new BuilderElement({
  name: "w:ind",
  attributes: {
    start: {
      key: "w:start",
      value: start === void 0 ? void 0 : signedTwipsMeasureValue(start)
    },
    end: {
      key: "w:end",
      value: end === void 0 ? void 0 : signedTwipsMeasureValue(end)
    },
    left: {
      key: "w:left",
      value: left === void 0 ? void 0 : signedTwipsMeasureValue(left)
    },
    right: {
      key: "w:right",
      value: right === void 0 ? void 0 : signedTwipsMeasureValue(right)
    },
    hanging: {
      key: "w:hanging",
      value: hanging === void 0 ? void 0 : twipsMeasureValue(hanging)
    },
    firstLine: {
      key: "w:firstLine",
      value: firstLine === void 0 ? void 0 : twipsMeasureValue(firstLine)
    },
    firstLineChars: {
      key: "w:firstLineChars",
      value: firstLineChars === void 0 ? void 0 : decimalNumber(firstLineChars)
    }
  }
});
var createBreak = () => new BuilderElement({ name: "w:br" });
var FieldCharacterType = {
  BEGIN: "begin",
  END: "end",
  SEPARATE: "separate"
};
var createFieldChar = (type, dirty, locked) => new BuilderElement({
  name: "w:fldChar",
  attributes: {
    type: {
      key: "w:fldCharType",
      value: type
    },
    dirty: {
      key: "w:dirty",
      value: dirty
    },
    locked: {
      key: "w:fldLock",
      value: locked
    }
  }
});
var createBegin = (dirty, locked) => createFieldChar(FieldCharacterType.BEGIN, dirty, locked);
var dirtyWithoutPageNumbers = /* @__PURE__ */ new WeakSet();
var BeginDirtyWithoutPageNumbers = class extends BuilderElement {
  constructor() {
    super({
      name: "w:fldChar",
      attributes: {
        type: {
          key: "w:fldCharType",
          value: FieldCharacterType.BEGIN
        },
        dirty: {
          key: "w:dirty",
          value: true
        }
      }
    });
  }
  prepForXml(context) {
    const xml = super.prepForXml(context);
    dirtyWithoutPageNumbers.add(xml);
    return xml;
  }
};
var createBeginDirtyWithoutPageNumbers = () => new BeginDirtyWithoutPageNumbers();
var isDirtyWithoutPageNumbers = (element) => typeof element === "object" && element !== null && dirtyWithoutPageNumbers.has(element);
var createSeparate = (dirty) => createFieldChar(FieldCharacterType.SEPARATE, dirty);
var createEnd = (dirty) => createFieldChar(FieldCharacterType.END, dirty);
var HorizontalPositionAlign = {
  /** Center horizontally */
  CENTER: "center",
  /** Align to inside margin (left on odd, right on even pages) */
  INSIDE: "inside",
  /** Align to left */
  LEFT: "left",
  /** Align to outside margin (right on odd, left on even pages) */
  OUTSIDE: "outside",
  /** Align to right */
  RIGHT: "right"
};
var VerticalPositionAlign = {
  /** Align to bottom */
  BOTTOM: "bottom",
  /** Center vertically */
  CENTER: "center",
  /** Align to inside margin */
  INSIDE: "inside",
  /** Align to outside margin */
  OUTSIDE: "outside",
  /** Align to top */
  TOP: "top"
};
var NumberFormat = {
  DECIMAL: "decimal",
  UPPER_ROMAN: "upperRoman",
  LOWER_ROMAN: "lowerRoman",
  UPPER_LETTER: "upperLetter",
  LOWER_LETTER: "lowerLetter",
  ORDINAL: "ordinal",
  CARDINAL_TEXT: "cardinalText",
  ORDINAL_TEXT: "ordinalText",
  HEX: "hex",
  CHICAGO: "chicago",
  IDEOGRAPH_DIGITAL: "ideographDigital",
  JAPANESE_COUNTING: "japaneseCounting",
  AIUEO: "aiueo",
  IROHA: "iroha",
  DECIMAL_FULL_WIDTH: "decimalFullWidth",
  DECIMAL_HALF_WIDTH: "decimalHalfWidth",
  JAPANESE_LEGAL: "japaneseLegal",
  JAPANESE_DIGITAL_TEN_THOUSAND: "japaneseDigitalTenThousand",
  DECIMAL_ENCLOSED_CIRCLE: "decimalEnclosedCircle",
  DECIMAL_FULL_WIDTH_2: "decimalFullWidth2",
  AIUEO_FULL_WIDTH: "aiueoFullWidth",
  IROHA_FULL_WIDTH: "irohaFullWidth",
  DECIMAL_ZERO: "decimalZero",
  BULLET: "bullet",
  GANADA: "ganada",
  CHOSUNG: "chosung",
  DECIMAL_ENCLOSED_FULL_STOP: "decimalEnclosedFullstop",
  DECIMAL_ENCLOSED_PAREN: "decimalEnclosedParen",
  DECIMAL_ENCLOSED_CIRCLE_CHINESE: "decimalEnclosedCircleChinese",
  IDEOGRAPH_ENCLOSED_CIRCLE: "ideographEnclosedCircle",
  IDEOGRAPH_TRADITIONAL: "ideographTraditional",
  IDEOGRAPH_ZODIAC: "ideographZodiac",
  IDEOGRAPH_ZODIAC_TRADITIONAL: "ideographZodiacTraditional",
  TAIWANESE_COUNTING: "taiwaneseCounting",
  IDEOGRAPH_LEGAL_TRADITIONAL: "ideographLegalTraditional",
  TAIWANESE_COUNTING_THOUSAND: "taiwaneseCountingThousand",
  TAIWANESE_DIGITAL: "taiwaneseDigital",
  CHINESE_COUNTING: "chineseCounting",
  CHINESE_LEGAL_SIMPLIFIED: "chineseLegalSimplified",
  CHINESE_COUNTING_TEN_THOUSAND: "chineseCountingThousand",
  KOREAN_DIGITAL: "koreanDigital",
  KOREAN_COUNTING: "koreanCounting",
  KOREAN_LEGAL: "koreanLegal",
  KOREAN_DIGITAL_2: "koreanDigital2",
  VIETNAMESE_COUNTING: "vietnameseCounting",
  RUSSIAN_LOWER: "russianLower",
  RUSSIAN_UPPER: "russianUpper",
  NONE: "none",
  NUMBER_IN_DASH: "numberInDash",
  HEBREW_1: "hebrew1",
  HEBREW_2: "hebrew2",
  ARABIC_ALPHA: "arabicAlpha",
  ARABIC_ABJAD: "arabicAbjad",
  HINDI_VOWELS: "hindiVowels",
  HINDI_CONSONANTS: "hindiConsonants",
  HINDI_NUMBERS: "hindiNumbers",
  HINDI_COUNTING: "hindiCounting",
  THAI_LETTERS: "thaiLetters",
  THAI_NUMBERS: "thaiNumbers",
  THAI_COUNTING: "thaiCounting",
  BAHT_TEXT: "bahtText",
  DOLLAR_TEXT: "dollarText",
  CUSTOM: "custom"
};
var SpaceType = {
  DEFAULT: "default",
  PRESERVE: "preserve"
};
var TextAttributes = class extends XmlAttributeComponent {
  constructor(..._args) {
    super(..._args);
    _defineProperty(this, "xmlKeys", { space: "xml:space" });
  }
};
var Page = class extends XmlComponent {
  constructor() {
    super("w:instrText");
    this.root.push(new TextAttributes({ space: SpaceType.PRESERVE }));
    this.root.push("PAGE");
  }
};
var NumberOfPages = class extends XmlComponent {
  constructor() {
    super("w:instrText");
    this.root.push(new TextAttributes({ space: SpaceType.PRESERVE }));
    this.root.push("NUMPAGES");
  }
};
var NumberOfPagesSection = class extends XmlComponent {
  constructor() {
    super("w:instrText");
    this.root.push(new TextAttributes({ space: SpaceType.PRESERVE }));
    this.root.push("SECTIONPAGES");
  }
};
var CurrentSection = class extends XmlComponent {
  constructor() {
    super("w:instrText");
    this.root.push(new TextAttributes({ space: SpaceType.PRESERVE }));
    this.root.push("SECTION");
  }
};
var createShading = ({ fill, color, type }) => createColorElement("w:shd", [
  {
    keys: {
      color: "w:fill",
      theme: "w:themeFill",
      tint: "w:themeFillTint",
      shade: "w:themeFillShade"
    },
    color: fill
  },
  {
    keys: COLOR_ATTRIBUTES,
    color
  },
  {
    key: "w:val",
    value: type !== null && type !== void 0 ? type : ShadingType.CLEAR
  }
]);
var ShadingType = {
  /** Clear shading - no pattern, fill color only */
  CLEAR: "clear",
  DIAGONAL_CROSS: "diagCross",
  DIAGONAL_STRIPE: "diagStripe",
  HORIZONTAL_CROSS: "horzCross",
  HORIZONTAL_STRIPE: "horzStripe",
  NIL: "nil",
  PERCENT_5: "pct5",
  PERCENT_10: "pct10",
  PERCENT_12: "pct12",
  PERCENT_15: "pct15",
  PERCENT_20: "pct20",
  PERCENT_25: "pct25",
  PERCENT_30: "pct30",
  PERCENT_35: "pct35",
  PERCENT_37: "pct37",
  PERCENT_40: "pct40",
  PERCENT_45: "pct45",
  PERCENT_50: "pct50",
  PERCENT_55: "pct55",
  PERCENT_60: "pct60",
  PERCENT_62: "pct62",
  PERCENT_65: "pct65",
  PERCENT_70: "pct70",
  PERCENT_75: "pct75",
  PERCENT_80: "pct80",
  PERCENT_85: "pct85",
  PERCENT_87: "pct87",
  PERCENT_90: "pct90",
  PERCENT_95: "pct95",
  REVERSE_DIAGONAL_STRIPE: "reverseDiagStripe",
  SOLID: "solid",
  THIN_DIAGONAL_CROSS: "thinDiagCross",
  THIN_DIAGONAL_STRIPE: "thinDiagStripe",
  THIN_HORIZONTAL_CROSS: "thinHorzCross",
  THIN_REVERSE_DIAGONAL_STRIPE: "thinReverseDiagStripe",
  THIN_VERTICAL_STRIPE: "thinVertStripe",
  VERTICAL_STRIPE: "vertStripe"
};
var ChangeAttributes = class extends XmlAttributeComponent {
  constructor(..._args) {
    super(..._args);
    _defineProperty(this, "xmlKeys", {
      id: "w:id",
      author: "w:author",
      date: "w:date"
    });
  }
};
var DeletionTrackChange = class extends XmlComponent {
  constructor(options) {
    super("w:del");
    this.root.push(new ChangeAttributes({
      id: options.id,
      author: options.author,
      date: options.date
    }));
  }
};
var InsertionTrackChange = class extends XmlComponent {
  constructor(options) {
    super("w:ins");
    this.root.push(new ChangeAttributes({
      id: options.id,
      author: options.author,
      date: options.date
    }));
  }
};
var TwoLinesInOneBrackets = {
  /** No brackets */
  NONE: "none",
  /** Round brackets: ( ) */
  ROUND: "round",
  /** Square brackets: [ ] */
  SQUARE: "square",
  /** Angle brackets: < > */
  ANGLE: "angle",
  /** Curly brackets: { } */
  CURLY: "curly"
};
var createEastAsianLayout = ({ twoLinesInOne, brackets, horizontalInVertical, fitToLine, group }) => new BuilderElement({
  name: "w:eastAsianLayout",
  attributes: {
    id: {
      key: "w:id",
      value: group === void 0 ? void 0 : decimalNumber(group)
    },
    combine: {
      key: "w:combine",
      value: twoLinesInOne
    },
    combineBrackets: {
      key: "w:combineBrackets",
      value: brackets
    },
    vert: {
      key: "w:vert",
      value: horizontalInVertical
    },
    vertCompress: {
      key: "w:vertCompress",
      value: fitToLine
    }
  }
});
var EmphasisMarkType = {
  /** Dot emphasis mark */
  DOT: "dot"
};
var createEmphasisMark = (emphasisMarkType = EmphasisMarkType.DOT) => new BuilderElement({
  name: "w:em",
  attributes: { val: {
    key: "w:val",
    value: emphasisMarkType
  } }
});
var createDotEmphasisMark = () => createEmphasisMark(EmphasisMarkType.DOT);
var urlAlphabet = "57X6y3wQZNzYjJB2L_10pxbackgroundhimselfUTF-8DEMOGRAPHICSVqvt4KW9";
var customAlphabet = (alphabet, defaultSize = 21) => {
  return (size = defaultSize) => {
    let id = "";
    let i2 = size | 0;
    while (i2-- > 0) id += alphabet[Math.random() * alphabet.length | 0];
    return id;
  };
};
var nanoid = (size = 21) => {
  let id = "";
  let i2 = size | 0;
  while (i2-- > 0) id += urlAlphabet[Math.random() * 64 | 0];
  return id;
};
var paddedWords = (data) => {
  const words = new Int32Array(Math.ceil((data.length + 9) / 64) * 16);
  for (let index = 0; index < data.length; index++) words[index >> 2] |= data[index] << 24 - (index & 3) * 8;
  words[data.length >> 2] |= 128 << 24 - (data.length & 3) * 8;
  words[words.length - 2] = Math.floor(data.length / 536870912);
  words[words.length - 1] = data.length * 8;
  return words;
};
var bytesOfWords = (words) => {
  const bytes = new Uint8Array(words.length * 4);
  for (let index = 0; index < bytes.length; index++) bytes[index] = words[index >> 2] >>> 24 - (index & 3) * 8;
  return bytes;
};
var rotateLeft = (word, bits2) => word << bits2 | word >>> 32 - bits2;
var rotateRight = (word, bits2) => word >>> bits2 | word << 32 - bits2;
var SHA1_INITIAL_HASH = [
  1732584193,
  4023233417,
  2562383102,
  271733878,
  3285377520
];
var SHA1_ROUND_CONSTANTS = Int32Array.of(1518500249, 1859775393, 2400959708, 3395469782);
var sha1Schedule = new Int32Array(80);
var sha1 = (data) => {
  const words = paddedWords(data);
  const schedule = sha1Schedule;
  let [h0, h1, h2, h3, h4] = SHA1_INITIAL_HASH;
  for (let block = 0; block < words.length; block += 16) {
    schedule.set(words.subarray(block, block + 16));
    for (let t = 16; t < 80; t++) schedule[t] = rotateLeft(schedule[t - 3] ^ schedule[t - 8] ^ schedule[t - 14] ^ schedule[t - 16], 1);
    let [a, b, c, d, e] = [
      h0,
      h1,
      h2,
      h3,
      h4
    ];
    for (let t = 0; t < 80; t++) {
      const f = t < 20 ? b & c | ~b & d : t >= 40 && t < 60 ? b & c | b & d | c & d : b ^ c ^ d;
      const next = rotateLeft(a, 5) + f + e + SHA1_ROUND_CONSTANTS[Math.floor(t / 20)] + schedule[t] | 0;
      e = d;
      d = c;
      c = rotateLeft(b, 30);
      b = a;
      a = next;
    }
    [h0, h1, h2, h3, h4] = [
      h0 + a | 0,
      h1 + b | 0,
      h2 + c | 0,
      h3 + d | 0,
      h4 + e | 0
    ];
  }
  return bytesOfWords([
    h0,
    h1,
    h2,
    h3,
    h4
  ]);
};
var SHA256_ROUND_CONSTANTS = Int32Array.of(1116352408, 1899447441, 3049323471, 3921009573, 961987163, 1508970993, 2453635748, 2870763221, 3624381080, 310598401, 607225278, 1426881987, 1925078388, 2162078206, 2614888103, 3248222580, 3835390401, 4022224774, 264347078, 604807628, 770255983, 1249150122, 1555081692, 1996064986, 2554220882, 2821834349, 2952996808, 3210313671, 3336571891, 3584528711, 113926993, 338241895, 666307205, 773529912, 1294757372, 1396182291, 1695183700, 1986661051, 2177026350, 2456956037, 2730485921, 2820302411, 3259730800, 3345764771, 3516065817, 3600352804, 4094571909, 275423344, 430227734, 506948616, 659060556, 883997877, 958139571, 1322822218, 1537002063, 1747873779, 1955562222, 2024104815, 2227730452, 2361852424, 2428436474, 2756734187, 3204031479, 3329325298);
var SHA256_INITIAL_HASH = [
  1779033703,
  3144134277,
  1013904242,
  2773480762,
  1359893119,
  2600822924,
  528734635,
  1541459225
];
var sha256Schedule = new Int32Array(64);
var sha256 = (data) => {
  const words = paddedWords(data);
  const schedule = sha256Schedule;
  let [h0, h1, h2, h3, h4, h5, h6, h7] = SHA256_INITIAL_HASH;
  for (let block = 0; block < words.length; block += 16) {
    schedule.set(words.subarray(block, block + 16));
    for (let t = 16; t < 64; t++) {
      const early = schedule[t - 15];
      const late = schedule[t - 2];
      schedule[t] = schedule[t - 16] + (rotateRight(early, 7) ^ rotateRight(early, 18) ^ early >>> 3) + schedule[t - 7] + (rotateRight(late, 17) ^ rotateRight(late, 19) ^ late >>> 10);
    }
    let [a, b, c, d, e, f, g, h] = [
      h0,
      h1,
      h2,
      h3,
      h4,
      h5,
      h6,
      h7
    ];
    for (let t = 0; t < 64; t++) {
      const first = h + (rotateRight(e, 6) ^ rotateRight(e, 11) ^ rotateRight(e, 25)) + (e & f ^ ~e & g) + SHA256_ROUND_CONSTANTS[t] + schedule[t] | 0;
      const second = (rotateRight(a, 2) ^ rotateRight(a, 13) ^ rotateRight(a, 22)) + (a & b ^ a & c ^ b & c) | 0;
      h = g;
      g = f;
      f = e;
      e = d + first | 0;
      d = c;
      c = b;
      b = a;
      a = first + second | 0;
    }
    [h0, h1, h2, h3, h4, h5, h6, h7] = [
      h0 + a | 0,
      h1 + b | 0,
      h2 + c | 0,
      h3 + d | 0,
      h4 + e | 0,
      h5 + f | 0,
      h6 + g | 0,
      h7 + h | 0
    ];
  }
  return bytesOfWords([
    h0,
    h1,
    h2,
    h3,
    h4,
    h5,
    h6,
    h7
  ]);
};
var convertMillimetersToTwip = (millimeters) => Math.floor(millimeters / 25.4 * 72 * 20);
var convertInchesToTwip = (inches) => Math.floor(inches * 72 * 20);
var uniqueNumericIdCreator = (initial = 0) => {
  let currentCount = initial;
  return () => ++currentCount;
};
var abstractNumUniqueNumericIdGen = () => uniqueNumericIdCreator();
var concreteNumUniqueNumericIdGen = () => uniqueNumericIdCreator(1);
var docPropertiesUniqueNumericIdGen = () => uniqueNumericIdCreator();
var docPropertiesUniqueNumericId = docPropertiesUniqueNumericIdGen();
var bookmarkUniqueNumericIdGen = () => uniqueNumericIdCreator();
var bookmarkUniqueNumericId = bookmarkUniqueNumericIdGen();
var fitTextUniqueNumericIdGen = uniqueNumericIdCreator();
var fitTextUniqueNumericId = () => -fitTextUniqueNumericIdGen();
var uniqueId = () => nanoid().toLowerCase();
var hashedId = (data) => Array.from(sha1(typeof data === "string" ? encodeUtf8(data) : ArrayBuffer.isView(data) ? data : new Uint8Array(data)), (byte) => byte.toString(16).padStart(2, "0")).join("");
var generateUuidPart = (count) => customAlphabet("1234567890abcdef", count)();
var uniqueUuid = () => `${generateUuidPart(8)}-${generateUuidPart(4)}-${generateUuidPart(4)}-${generateUuidPart(4)}-${generateUuidPart(12)}`;
var encodeUtf8 = (str) => new Uint8Array(new TextEncoder().encode(str));
var createFitText = ({ width, group }) => new BuilderElement({
  name: "w:fitText",
  attributes: {
    val: {
      key: "w:val",
      value: Math.round(universalMeasureToTwips(twipsMeasureValue(width)))
    },
    id: {
      key: "w:id",
      value: group === void 0 ? fitTextUniqueNumericId() : decimalNumber(group)
    }
  }
});
var CharacterSpacing = class extends XmlComponent {
  constructor(value) {
    super("w:spacing");
    this.root.push(new Attributes({ val: signedTwipsMeasureValue(value) }));
  }
};
var Color = class extends XmlComponent {
  constructor(color) {
    super("w:color");
    this.root.push(new ColorAttributeComponent([{
      keys: _objectSpread2(_objectSpread2({}, COLOR_ATTRIBUTES), {}, { color: "w:val" }),
      color
    }]));
  }
};
var Highlight = class extends XmlComponent {
  constructor(color) {
    super("w:highlight");
    this.root.push(new Attributes({ val: color }));
  }
};
var createLanguageComponent = (options) => new BuilderElement({
  name: "w:lang",
  attributes: {
    value: {
      key: "w:val",
      value: options.value
    },
    eastAsia: {
      key: "w:eastAsia",
      value: options.eastAsia
    },
    bidirectional: {
      key: "w:bidi",
      value: options.bidirectional
    }
  }
});
var createRunFonts = (nameOrAttrs, hint) => {
  if (typeof nameOrAttrs === "string") {
    const name = nameOrAttrs;
    return new BuilderElement({
      name: "w:rFonts",
      attributes: {
        ascii: {
          key: "w:ascii",
          value: name
        },
        cs: {
          key: "w:cs",
          value: name
        },
        eastAsia: {
          key: "w:eastAsia",
          value: name
        },
        hAnsi: {
          key: "w:hAnsi",
          value: name
        },
        hint: {
          key: "w:hint",
          value: hint
        }
      }
    });
  }
  if ("theme" in nameOrAttrs) {
    const theme = nameOrAttrs.theme === "headings" ? "major" : "minor";
    return new BuilderElement({
      name: "w:rFonts",
      attributes: {
        ascii: {
          key: "w:asciiTheme",
          value: `${theme}HAnsi`
        },
        eastAsia: {
          key: "w:eastAsiaTheme",
          value: `${theme}EastAsia`
        },
        hAnsi: {
          key: "w:hAnsiTheme",
          value: `${theme}HAnsi`
        },
        cs: {
          key: "w:cstheme",
          value: `${theme}Bidi`
        }
      }
    });
  }
  const attrs = nameOrAttrs;
  return new BuilderElement({
    name: "w:rFonts",
    attributes: {
      ascii: {
        key: "w:ascii",
        value: attrs.ascii
      },
      cs: {
        key: "w:cs",
        value: attrs.cs
      },
      eastAsia: {
        key: "w:eastAsia",
        value: attrs.eastAsia
      },
      hAnsi: {
        key: "w:hAnsi",
        value: attrs.hAnsi
      },
      hint: {
        key: "w:hint",
        value: attrs.hint
      }
    }
  });
};
var createVerticalAlignRun = (type) => new BuilderElement({
  name: "w:vertAlign",
  attributes: { val: {
    key: "w:val",
    value: type
  } }
});
var createSuperScript = () => createVerticalAlignRun("superscript");
var createSubScript = () => createVerticalAlignRun("subscript");
var UnderlineType = {
  /** Single underline */
  SINGLE: "single",
  /** Underline words only (not spaces) */
  WORDS: "words",
  /** Double underline */
  DOUBLE: "double",
  /** Thick single underline */
  THICK: "thick",
  /** Dotted underline */
  DOTTED: "dotted",
  /** Heavy dotted underline */
  DOTTEDHEAVY: "dottedHeavy",
  /** Dashed underline */
  DASH: "dash",
  /** Heavy dashed underline */
  DASHEDHEAVY: "dashedHeavy",
  /** Long dashed underline */
  DASHLONG: "dashLong",
  /** Heavy long dashed underline */
  DASHLONGHEAVY: "dashLongHeavy",
  /** Dot-dash underline */
  DOTDASH: "dotDash",
  /** Heavy dot-dash underline */
  DASHDOTHEAVY: "dashDotHeavy",
  /** Dot-dot-dash underline */
  DOTDOTDASH: "dotDotDash",
  /** Heavy dot-dot-dash underline */
  DASHDOTDOTHEAVY: "dashDotDotHeavy",
  /** Wave underline */
  WAVE: "wave",
  /** Heavy wave underline */
  WAVYHEAVY: "wavyHeavy",
  /** Double wave underline */
  WAVYDOUBLE: "wavyDouble",
  /** No underline */
  NONE: "none"
};
var createUnderline = (underlineType = UnderlineType.SINGLE, color) => createColorElement("w:u", [{
  key: "w:val",
  value: underlineType
}, {
  keys: COLOR_ATTRIBUTES,
  color
}]);
var TextEffect = {
  /** Blinking background animation */
  BLINK_BACKGROUND: "blinkBackground",
  /** Lights animation effect */
  LIGHTS: "lights",
  /** Black marching ants animation */
  ANTS_BLACK: "antsBlack",
  /** Red marching ants animation */
  ANTS_RED: "antsRed",
  /** Shimmer animation effect */
  SHIMMER: "shimmer",
  /** Sparkle animation effect */
  SPARKLE: "sparkle",
  /** No text effect */
  NONE: "none"
};
var HighlightColor = {
  /** Black highlight */
  BLACK: "black",
  /** Blue highlight */
  BLUE: "blue",
  /** Cyan highlight */
  CYAN: "cyan",
  /** Dark blue highlight */
  DARK_BLUE: "darkBlue",
  /** Dark cyan highlight */
  DARK_CYAN: "darkCyan",
  /** Dark gray highlight */
  DARK_GRAY: "darkGray",
  /** Dark green highlight */
  DARK_GREEN: "darkGreen",
  /** Dark magenta highlight */
  DARK_MAGENTA: "darkMagenta",
  /** Dark red highlight */
  DARK_RED: "darkRed",
  /** Dark yellow highlight */
  DARK_YELLOW: "darkYellow",
  /** Green highlight */
  GREEN: "green",
  /** Light gray highlight */
  LIGHT_GRAY: "lightGray",
  /** Magenta highlight */
  MAGENTA: "magenta",
  /** No highlight */
  NONE: "none",
  /** Red highlight */
  RED: "red",
  /** White highlight */
  WHITE: "white",
  /** Yellow highlight */
  YELLOW: "yellow"
};
var RunProperties = class extends IgnoreIfEmptyXmlComponent {
  constructor(options) {
    super("w:rPr");
    if (!options) return;
    if (options.style) this.push(new StringValueElement("w:rStyle", options.style));
    if (options.font) {
      if (typeof options.font === "string") this.push(createRunFonts(options.font));
      else if ("name" in options.font) this.push(createRunFonts(options.font.name, options.font.hint));
      else this.push(createRunFonts(options.font));
    }
    if (options.bold !== void 0) this.push(new OnOffElement("w:b", options.bold));
    if (options.boldComplexScript === void 0 && options.bold !== void 0 || options.boldComplexScript) {
      var _options$boldComplexS;
      this.push(new OnOffElement("w:bCs", (_options$boldComplexS = options.boldComplexScript) !== null && _options$boldComplexS !== void 0 ? _options$boldComplexS : options.bold));
    }
    if (options.italics !== void 0) this.push(new OnOffElement("w:i", options.italics));
    if (options.italicsComplexScript === void 0 && options.italics !== void 0 || options.italicsComplexScript) {
      var _options$italicsCompl;
      this.push(new OnOffElement("w:iCs", (_options$italicsCompl = options.italicsComplexScript) !== null && _options$italicsCompl !== void 0 ? _options$italicsCompl : options.italics));
    }
    if (options.smallCaps !== void 0) this.push(new OnOffElement("w:smallCaps", options.smallCaps));
    else if (options.allCaps !== void 0) this.push(new OnOffElement("w:caps", options.allCaps));
    if (options.strike !== void 0) this.push(new OnOffElement("w:strike", options.strike));
    if (options.doubleStrike !== void 0) this.push(new OnOffElement("w:dstrike", options.doubleStrike));
    if (options.emboss !== void 0) this.push(new OnOffElement("w:emboss", options.emboss));
    if (options.imprint !== void 0) this.push(new OnOffElement("w:imprint", options.imprint));
    if (options.noProof !== void 0) this.push(new OnOffElement("w:noProof", options.noProof));
    if (options.snapToGrid !== void 0) this.push(new OnOffElement("w:snapToGrid", options.snapToGrid));
    if (options.vanish !== void 0) this.push(new OnOffElement("w:vanish", options.vanish));
    if (options.color) this.push(new Color(options.color));
    if (options.characterSpacing) this.push(new CharacterSpacing(options.characterSpacing));
    if (options.scale !== void 0) this.push(new NumberValueElement("w:w", options.scale));
    if (options.kern) this.push(new HpsMeasureElement("w:kern", options.kern));
    if (options.position) this.push(new StringValueElement("w:position", options.position));
    if (options.size !== void 0) this.push(new HpsMeasureElement("w:sz", options.size));
    const szCs = options.sizeComplexScript === void 0 || options.sizeComplexScript === true ? options.size : options.sizeComplexScript;
    if (szCs) this.push(new HpsMeasureElement("w:szCs", szCs));
    if (options.highlight) this.push(new Highlight(options.highlight));
    if (options.underline) this.push(createUnderline(options.underline.type, options.underline.color));
    if (options.effect) this.push(new StringValueElement("w:effect", options.effect));
    if (options.border) this.push(createBorderElement("w:bdr", options.border));
    if (options.shading) this.push(createShading(options.shading));
    if (options.fitText) this.push(createFitText(options.fitText));
    if (options.subScript) this.push(createSubScript());
    if (options.superScript) this.push(createSuperScript());
    if (options.rightToLeft !== void 0) this.push(new OnOffElement("w:rtl", options.rightToLeft));
    if (options.emphasisMark) this.push(createEmphasisMark(options.emphasisMark.type));
    if (options.language) this.push(createLanguageComponent(options.language));
    if (options.eastAsianLayout) this.push(createEastAsianLayout(options.eastAsianLayout));
    if (options.specVanish !== void 0) this.push(new OnOffElement("w:specVanish", options.specVanish));
    if (options.math !== void 0) this.push(new OnOffElement("w:oMath", options.math));
    if (options.revision) this.push(new RunPropertiesChange(options.revision));
  }
  push(item) {
    this.root.push(item);
  }
};
var ParagraphRunProperties = class extends RunProperties {
  constructor(options) {
    super(options);
    if (options === null || options === void 0 ? void 0 : options.insertion) this.push(new InsertionTrackChange(options.insertion));
    if (options === null || options === void 0 ? void 0 : options.deletion) this.push(new DeletionTrackChange(options.deletion));
  }
};
var RunPropertiesChange = class extends XmlComponent {
  constructor(options) {
    super("w:rPrChange");
    this.root.push(new ChangeAttributes({
      id: options.id,
      author: options.author,
      date: options.date
    }));
    this.addChildElement(new RunProperties(options));
  }
};
var Text = class extends XmlComponent {
  constructor(options) {
    super("w:t");
    if (typeof options === "string") {
      this.root.push(new TextAttributes({ space: SpaceType.PRESERVE }));
      this.root.push(options);
    } else {
      var _options$space;
      this.root.push(new TextAttributes({ space: (_options$space = options.space) !== null && _options$space !== void 0 ? _options$space : SpaceType.DEFAULT }));
      this.root.push(options.text);
    }
  }
};
var PageNumber = {
  /** Inserts the current page number */
  CURRENT: "CURRENT",
  /** Inserts the total number of pages in the document */
  TOTAL_PAGES: "TOTAL_PAGES",
  /** Inserts the total number of pages in the current section */
  TOTAL_PAGES_IN_SECTION: "TOTAL_PAGES_IN_SECTION",
  /** Inserts the current section number */
  CURRENT_SECTION: "SECTION"
};
var pageNumberFieldOf = (child2) => {
  switch (child2) {
    case PageNumber.CURRENT:
      return [
        createBegin(),
        new Page(),
        createSeparate(),
        createEnd()
      ];
    case PageNumber.TOTAL_PAGES:
      return [
        createBegin(),
        new NumberOfPages(),
        createSeparate(),
        createEnd()
      ];
    case PageNumber.TOTAL_PAGES_IN_SECTION:
      return [
        createBegin(),
        new NumberOfPagesSection(),
        createSeparate(),
        createEnd()
      ];
    case PageNumber.CURRENT_SECTION:
      return [
        createBegin(),
        new CurrentSection(),
        createSeparate(),
        createEnd()
      ];
    default:
      return;
  }
};
var Run = class Run2 extends XmlComponent {
  constructor(options) {
    super("w:r");
    _defineProperty(this, "properties", void 0);
    _defineProperty(this, "following", []);
    this.properties = new RunProperties(options);
    this.root.push(this.properties);
    if (options.break) for (let i2 = 0; i2 < options.break; i2++) this.root.push(createBreak());
    if (options.children) for (const [index, child2] of options.children.entries()) {
      if (elementOf(child2) === "w:r") {
        const rest = options.children.slice(index + 1);
        this.following = [child2, ...rest.length > 0 ? [new Run2(_objectSpread2(_objectSpread2({}, options), {}, {
          break: void 0,
          children: rest
        }))] : []];
        break;
      }
      if (typeof child2 === "string") {
        const field = pageNumberFieldOf(child2);
        if (field) {
          const rest = options.children.slice(index + 1);
          const runOf = (children) => new Run2(_objectSpread2(_objectSpread2({}, options), {}, {
            break: void 0,
            children
          }));
          const beginsHere = this.root.length === 1;
          if (beginsHere) this.root.push(field[0]);
          const parts = beginsHere ? field.slice(1) : field;
          this.following = [...parts.map((part) => runOf([part])), ...rest.length > 0 ? [runOf(rest)] : []];
          break;
        }
        this.root.push(new Text(child2));
        continue;
      }
      this.root.push(child2);
    }
    else if (options.text !== void 0) this.root.push(new Text(options.text));
  }
  get writtenAs() {
    return this.following.length > 0 ? [this, ...this.following.flatMap((run) => {
      var _run$writtenAs;
      return (_run$writtenAs = run.writtenAs) !== null && _run$writtenAs !== void 0 ? _run$writtenAs : run;
    })] : void 0;
  }
};
var TextRun = class extends Run {
  constructor(options) {
    super(typeof options === "string" ? { text: options } : options);
  }
};
var SymbolAttributes = class extends XmlAttributeComponent {
  constructor(..._args) {
    super(..._args);
    _defineProperty(this, "xmlKeys", {
      char: "w:char",
      symbolfont: "w:font"
    });
  }
};
var Symbol$1 = class extends XmlComponent {
  constructor(char = "", symbolfont = "Wingdings") {
    super("w:sym");
    this.root.push(new SymbolAttributes({
      char,
      symbolfont
    }));
  }
};
var SymbolRun = class extends Run {
  constructor(options) {
    super(typeof options === "string" ? {} : options);
    this.root.push(typeof options === "string" ? new Symbol$1(options) : new Symbol$1(options.char, options.symbolfont));
  }
};
var convertDataURIToBinary = (dataURI) => {
  const base64Index = dataURI.indexOf(";base64,");
  const base64IndexWithOffset = base64Index === -1 ? 0 : base64Index + 8;
  return new Uint8Array(atob(dataURI.substring(base64IndexWithOffset)).split("").map((c) => c.charCodeAt(0)));
};
var standardizeData = (data) => typeof data === "string" ? convertDataURIToBinary(data) : data;
var SIGNATURES = [
  ["png", [
    137,
    80,
    78,
    71,
    13,
    10,
    26,
    10
  ]],
  ["jpg", [
    255,
    216,
    255
  ]],
  ["gif", [
    71,
    73,
    70,
    56,
    55,
    97
  ]],
  ["gif", [
    71,
    73,
    70,
    56,
    57,
    97
  ]],
  ["bmp", [66, 77]]
];
var imageTypeOf = ({ type, data }, name) => {
  if (type !== void 0) return type;
  const standardized = standardizeData(data);
  const bytes = ArrayBuffer.isView(standardized) ? new Uint8Array(standardized.buffer, standardized.byteOffset, standardized.byteLength) : new Uint8Array(standardized);
  const signature = SIGNATURES.find(([, start]) => start.every((byte, index) => bytes[index] === byte));
  if (signature === void 0) throw new Error(`${name}: type isn't given, and data isn't a PNG, JPEG, GIF or BMP file to read it from. Give its type`);
  return signature[0];
};
var HorizontalPositionRelativeFrom = {
  /**
  * ## Character
  *
  * Specifies that the horizontal positioning shall be relative to the position of the anchor within its run content.
  */
  CHARACTER: "character",
  /**
  * ## Column
  *
  * Specifies that the horizontal positioning shall be relative to the extents of the column which contains its anchor.
  */
  COLUMN: "column",
  /**
  * ## Inside Margin
  *
  * Specifies that the horizontal positioning shall be relative to the inside margin of the current page (the left margin on odd pages, right on even pages).
  */
  INSIDE_MARGIN: "insideMargin",
  /**
  * ## Left Margin
  *
  * Specifies that the horizontal positioning shall be relative to the left margin of the page.
  */
  LEFT_MARGIN: "leftMargin",
  /**
  * ## Page Margin
  *
  * Specifies that the horizontal positioning shall be relative to the page margins.
  */
  MARGIN: "margin",
  /**
  * ## Outside Margin
  *
  * Specifies that the horizontal positioning shall be relative to the outside margin of the current page (the right margin on odd pages, left on even pages).
  */
  OUTSIDE_MARGIN: "outsideMargin",
  /**
  * ## Page Edge
  *
  * Specifies that the horizontal positioning shall be relative to the edge of the page.
  */
  PAGE: "page",
  /**
  * ## Right Margin
  *
  * Specifies that the horizontal positioning shall be relative to the right margin of the page.
  */
  RIGHT_MARGIN: "rightMargin"
};
var VerticalPositionRelativeFrom = {
  /**
  * ## Bottom Margin
  *
  * Specifies that the vertical positioning shall be relative to the bottom margin of the current page.
  */
  BOTTOM_MARGIN: "bottomMargin",
  /**
  * ## Inside Margin
  *
  * Specifies that the vertical positioning shall be relative to the inside margin of the current page.
  */
  INSIDE_MARGIN: "insideMargin",
  /**
  * ## Line
  *
  * Specifies that the vertical positioning shall be relative to the line containing the anchor character.
  */
  LINE: "line",
  /**
  * ## Page Margin
  *
  * Specifies that the vertical positioning shall be relative to the page margins.
  */
  MARGIN: "margin",
  /**
  * ## Outside Margin
  *
  * Specifies that the vertical positioning shall be relative to the outside margin of the current page.
  */
  OUTSIDE_MARGIN: "outsideMargin",
  /**
  * ## Page Edge
  *
  * Specifies that the vertical positioning shall be relative to the edge of the page.
  */
  PAGE: "page",
  /**
  * ## Paragraph
  *
  * Specifies that the vertical positioning shall be relative to the paragraph which contains the drawing anchor.
  */
  PARAGRAPH: "paragraph",
  /**
  * ## Top Margin
  *
  * Specifies that the vertical positioning shall be relative to the top margin of the current page.
  */
  TOP_MARGIN: "topMargin"
};
var createSimplePos = () => new BuilderElement({
  name: "wp:simplePos",
  attributes: {
    x: {
      key: "x",
      value: 0
    },
    y: {
      key: "y",
      value: 0
    }
  }
});
var createAlign = (value) => new BuilderElement({
  name: "wp:align",
  children: [value]
});
var createPositionOffset = (offsetValue) => new BuilderElement({
  name: "wp:posOffset",
  children: [offsetValue.toString()]
});
var createHorizontalPosition = ({ relative, align, offset }) => new BuilderElement({
  name: "wp:positionH",
  attributes: { relativeFrom: {
    key: "relativeFrom",
    value: relative !== null && relative !== void 0 ? relative : HorizontalPositionRelativeFrom.PAGE
  } },
  children: [(() => {
    if (align) return createAlign(align);
    else if (offset !== void 0) return createPositionOffset(offset);
    else throw new Error("There is no configuration provided for floating position (Align or offset)");
  })()]
});
var createVerticalPosition = ({ relative, align, offset }) => new BuilderElement({
  name: "wp:positionV",
  attributes: { relativeFrom: {
    key: "relativeFrom",
    value: relative !== null && relative !== void 0 ? relative : VerticalPositionRelativeFrom.PAGE
  } },
  children: [(() => {
    if (align) return createAlign(align);
    else if (offset !== void 0) return createPositionOffset(offset);
    else throw new Error("There is no configuration provided for floating position (Align or offset)");
  })()]
});
var VerticalAnchor = (function(VerticalAnchor2) {
  VerticalAnchor2["CENTER"] = "ctr";
  VerticalAnchor2["TOP"] = "t";
  VerticalAnchor2["BOTTOM"] = "b";
  return VerticalAnchor2;
})({});
var createBodyProperties = (options = {}) => {
  var _options$margins, _options$margins2, _options$margins3, _options$margins4;
  return new BuilderElement({
    name: "wps:bodyPr",
    attributes: {
      lIns: {
        key: "lIns",
        value: (_options$margins = options.margins) === null || _options$margins === void 0 ? void 0 : _options$margins.left
      },
      rIns: {
        key: "rIns",
        value: (_options$margins2 = options.margins) === null || _options$margins2 === void 0 ? void 0 : _options$margins2.right
      },
      tIns: {
        key: "tIns",
        value: (_options$margins3 = options.margins) === null || _options$margins3 === void 0 ? void 0 : _options$margins3.top
      },
      bIns: {
        key: "bIns",
        value: (_options$margins4 = options.margins) === null || _options$margins4 === void 0 ? void 0 : _options$margins4.bottom
      },
      anchor: {
        key: "anchor",
        value: options.verticalAnchor
      }
    },
    children: [...options.noAutoFit ? [new OnOffElement("a:noAutofit", options.noAutoFit)] : []]
  });
};
var createNonVisualShapeProperties = (options = { txBox: "1" }) => new BuilderElement({
  name: "wps:cNvSpPr",
  attributes: { txBox: {
    key: "txBox",
    value: options.txBox
  } }
});
var createTextBoxContent = (children) => new BuilderElement({
  name: "w:txbxContent",
  children: [...children]
});
var createWpsTextBox = (children) => new BuilderElement({
  name: "wps:txbx",
  children: [createTextBoxContent(children)]
});
var ExtentsAttributes = class extends XmlAttributeComponent {
  constructor(..._args) {
    super(..._args);
    _defineProperty(this, "xmlKeys", {
      cx: "cx",
      cy: "cy"
    });
  }
};
var Extents = class extends XmlComponent {
  constructor(x2, y) {
    super("a:ext");
    _defineProperty(this, "attributes", void 0);
    this.attributes = new ExtentsAttributes({
      cx: x2,
      cy: y
    });
    this.root.push(this.attributes);
  }
};
var OffsetAttributes = class extends XmlAttributeComponent {
  constructor(..._args) {
    super(..._args);
    _defineProperty(this, "xmlKeys", {
      x: "x",
      y: "y"
    });
  }
};
var Offset = class extends XmlComponent {
  constructor(x2, y) {
    super("a:off");
    this.root.push(new OffsetAttributes({
      x: x2 !== null && x2 !== void 0 ? x2 : 0,
      y: y !== null && y !== void 0 ? y : 0
    }));
  }
};
var FormAttributes = class extends XmlAttributeComponent {
  constructor(..._args) {
    super(..._args);
    _defineProperty(this, "xmlKeys", {
      flipVertical: "flipV",
      flipHorizontal: "flipH",
      rotation: "rot"
    });
  }
};
var Form = class extends XmlComponent {
  constructor(options) {
    var _options$flip, _options$flip2, _options$offset, _options$offset2;
    super("a:xfrm");
    _defineProperty(this, "extents", void 0);
    _defineProperty(this, "offset", void 0);
    this.root.push(new FormAttributes({
      flipVertical: (_options$flip = options.flip) === null || _options$flip === void 0 ? void 0 : _options$flip.vertical,
      flipHorizontal: (_options$flip2 = options.flip) === null || _options$flip2 === void 0 ? void 0 : _options$flip2.horizontal,
      rotation: options.rotation
    }));
    this.offset = new Offset((_options$offset = options.offset) === null || _options$offset === void 0 || (_options$offset = _options$offset.emus) === null || _options$offset === void 0 ? void 0 : _options$offset.x, (_options$offset2 = options.offset) === null || _options$offset2 === void 0 || (_options$offset2 = _options$offset2.emus) === null || _options$offset2 === void 0 ? void 0 : _options$offset2.y);
    this.extents = new Extents(options.emus.x, options.emus.y);
    this.root.push(this.offset);
    this.root.push(this.extents);
  }
};
var createNoFill = () => new BuilderElement({ name: "a:noFill" });
var createSolidRgbColor = (options) => new BuilderElement({
  name: "a:srgbClr",
  attributes: { value: {
    key: "val",
    value: options.value
  } }
});
var SchemeColor = {
  /** Background color 1 */
  BG1: "bg1",
  /** Text color 1 */
  TX1: "tx1",
  /** Background color 2 */
  BG2: "bg2",
  /** Text color 2 */
  TX2: "tx2",
  /** Accent color 1 */
  ACCENT1: "accent1",
  /** Accent color 2 */
  ACCENT2: "accent2",
  /** Accent color 3 */
  ACCENT3: "accent3",
  /** Accent color 4 */
  ACCENT4: "accent4",
  /** Accent color 5 */
  ACCENT5: "accent5",
  /** Accent color 6 */
  ACCENT6: "accent6",
  /** Hyperlink color */
  HLINK: "hlink",
  /** Followed hyperlink color */
  FOLHLINK: "folHlink",
  /** Dark color 1 */
  DK1: "dk1",
  /** Light color 1 */
  LT1: "lt1",
  /** Dark color 2 */
  DK2: "dk2",
  /** Light color 2 */
  LT2: "lt2",
  /** Placeholder color */
  PHCLR: "phClr"
};
var createSchemeColor = (options) => new BuilderElement({
  name: "a:schemeClr",
  attributes: { value: {
    key: "val",
    value: options.value
  } }
});
var createSolidFill$1 = (options) => new BuilderElement({
  name: "a:solidFill",
  children: [options.type === "rgb" ? createSolidRgbColor(options) : createSchemeColor(options)]
});
var LineCap = {
  /** Round cap style */
  ROUND: "rnd",
  /** Square cap style */
  SQUARE: "sq",
  /** Flat cap style */
  FLAT: "flat"
};
var CompoundLine = {
  /** Single line */
  SINGLE: "sng",
  /** Double line */
  DOUBLE: "dbl",
  /** Thick-thin double line */
  THICK_THIN: "thickThin",
  /** Thin-thick double line */
  THIN_THICK: "thinThick",
  /** Triple line */
  TRI: "tri"
};
var PenAlignment = {
  /** Center alignment */
  CENTER: "ctr",
  /** Inset alignment */
  INSET: "in"
};
var createOutline = (options) => new BuilderElement({
  name: "a:ln",
  attributes: {
    width: {
      key: "w",
      value: options.width
    },
    cap: {
      key: "cap",
      value: options.cap === void 0 ? void 0 : LineCap[options.cap]
    },
    compoundLine: {
      key: "cmpd",
      value: options.compoundLine === void 0 ? void 0 : CompoundLine[options.compoundLine]
    },
    align: {
      key: "algn",
      value: options.align === void 0 ? void 0 : PenAlignment[options.align]
    }
  },
  children: [options.type === "noFill" ? createNoFill() : options.solidFillType === "rgb" ? createSolidFill$1({
    type: "rgb",
    value: options.value
  }) : createSolidFill$1({
    type: "scheme",
    value: options.value
  })]
});
var AdjustmentValues = class extends XmlComponent {
  constructor() {
    super("a:avLst");
  }
};
var PresetGeometryAttributes = class extends XmlAttributeComponent {
  constructor(..._args) {
    super(..._args);
    _defineProperty(this, "xmlKeys", { prst: "prst" });
  }
};
var PresetGeometry = class extends XmlComponent {
  constructor() {
    super("a:prstGeom");
    this.root.push(new PresetGeometryAttributes({ prst: "rect" }));
    this.root.push(new AdjustmentValues());
  }
};
var ShapePropertiesAttributes = class extends XmlAttributeComponent {
  constructor(..._args) {
    super(..._args);
    _defineProperty(this, "xmlKeys", { bwMode: "bwMode" });
  }
};
var ShapeProperties = class extends XmlComponent {
  constructor({ element, outline, solidFill, transform }) {
    super(`${element}:spPr`);
    _defineProperty(this, "form", void 0);
    this.root.push(new ShapePropertiesAttributes({ bwMode: "auto" }));
    this.form = new Form(transform);
    this.root.push(this.form);
    this.root.push(new PresetGeometry());
    if (solidFill) this.root.push(createSolidFill$1(solidFill));
    else if (outline) this.root.push(createNoFill());
    if (outline) this.root.push(createOutline(outline));
  }
};
var createWpsShape = (options) => new BuilderElement({
  name: "wps:wsp",
  children: [
    createNonVisualShapeProperties(options.nonVisualProperties),
    new ShapeProperties({
      element: "wps",
      transform: options.transformation,
      outline: options.outline,
      solidFill: options.solidFill
    }),
    createWpsTextBox(options.children),
    createBodyProperties(options.bodyProperties)
  ]
});
var GraphicDataAttributes = class extends XmlAttributeComponent {
  constructor(..._args) {
    super(..._args);
    _defineProperty(this, "xmlKeys", { uri: "uri" });
  }
};
var createSvgBlip = (mediaData) => new BuilderElement({
  name: "asvg:svgBlip",
  attributes: {
    asvg: {
      key: "xmlns:asvg",
      value: "http://schemas.microsoft.com/office/drawing/2016/SVG/main"
    },
    embed: {
      key: "r:embed",
      value: `rId{${mediaData.fileName}}`
    }
  }
});
var createExtention = (mediaData) => new BuilderElement({
  name: "a:ext",
  attributes: { uri: {
    key: "uri",
    value: "{96DAC541-7B7A-43D3-8B79-37D633B846F1}"
  } },
  children: [createSvgBlip(mediaData)]
});
var createExtentionList = (mediaData) => new BuilderElement({
  name: "a:extLst",
  children: [createExtention(mediaData)]
});
var createBlip = (mediaData) => new BuilderElement({
  name: "a:blip",
  attributes: {
    embed: {
      key: "r:embed",
      value: `rId{${mediaData.type === "svg" ? mediaData.fallback.fileName : mediaData.fileName}}`
    },
    cstate: {
      key: "cstate",
      value: "none"
    }
  },
  children: mediaData.type === "svg" ? [createExtentionList(mediaData)] : []
});
var SourceRectangleAttributes = class extends XmlAttributeComponent {
  constructor(..._args) {
    super(..._args);
    _defineProperty(this, "xmlKeys", {
      left: "l",
      top: "t",
      right: "r",
      bottom: "b"
    });
  }
};
var cropValue = (value, edge) => {
  if (value === void 0) return;
  if (!(value >= 0 && value <= 100)) throw new Error(`Invalid crop ${edge} ${value}. Expected a number from 0 to 100`);
  return Math.round(value * 1e3);
};
var SourceRectangle = class extends XmlComponent {
  constructor(crop) {
    super("a:srcRect");
    if (crop) this.root.push(new SourceRectangleAttributes({
      left: cropValue(crop.left, "left"),
      top: cropValue(crop.top, "top"),
      right: cropValue(crop.right, "right"),
      bottom: cropValue(crop.bottom, "bottom")
    }));
  }
};
var FillRectangle = class extends XmlComponent {
  constructor() {
    super("a:fillRect");
  }
};
var Stretch = class extends XmlComponent {
  constructor() {
    super("a:stretch");
    this.root.push(new FillRectangle());
  }
};
var BlipFill = class extends XmlComponent {
  constructor(mediaData, crop) {
    super("pic:blipFill");
    this.root.push(createBlip(mediaData));
    this.root.push(new SourceRectangle(crop));
    this.root.push(new Stretch());
  }
};
var PicLocksAttributes = class extends XmlAttributeComponent {
  constructor(..._args) {
    super(..._args);
    _defineProperty(this, "xmlKeys", {
      noChangeAspect: "noChangeAspect",
      noChangeArrowheads: "noChangeArrowheads"
    });
  }
};
var PicLocks = class extends XmlComponent {
  constructor() {
    super("a:picLocks");
    this.root.push(new PicLocksAttributes({
      noChangeAspect: 1,
      noChangeArrowheads: 1
    }));
  }
};
var ChildNonVisualProperties = class extends XmlComponent {
  constructor() {
    super("pic:cNvPicPr");
    this.root.push(new PicLocks());
  }
};
var NonVisualPropertiesAttributes = class extends XmlAttributeComponent {
  constructor(..._args) {
    super(..._args);
    _defineProperty(this, "xmlKeys", {
      id: "id",
      name: "name",
      descr: "descr"
    });
  }
};
var NonVisualProperties = class extends XmlComponent {
  constructor() {
    super("pic:cNvPr");
    this.root.push(new NonVisualPropertiesAttributes({
      id: 0,
      name: "",
      descr: ""
    }));
  }
  prepForXml(context) {
    for (let i2 = context.stack.length - 1; i2 >= 0; i2--) {
      const element = context.stack[i2];
      if (!(element instanceof ConcreteHyperlink)) continue;
      this.root.push(element.createDrawingClick(context, false));
      break;
    }
    const result = super.prepForXml(context);
    this.root.splice(1);
    return result;
  }
};
var NonVisualPicProperties = class extends XmlComponent {
  constructor() {
    super("pic:nvPicPr");
    this.root.push(new NonVisualProperties());
    this.root.push(new ChildNonVisualProperties());
  }
};
var PicAttributes = class extends XmlAttributeComponent {
  constructor(..._args) {
    super(..._args);
    _defineProperty(this, "xmlKeys", { xmlns: "xmlns:pic" });
  }
};
var Pic = class extends XmlComponent {
  constructor({ mediaData, transform, outline, solidFill, crop }) {
    super("pic:pic");
    this.root.push(new PicAttributes({ xmlns: "http://schemas.openxmlformats.org/drawingml/2006/picture" }));
    this.root.push(new NonVisualPicProperties());
    this.root.push(new BlipFill(mediaData, crop));
    this.root.push(new ShapeProperties({
      element: "pic",
      transform,
      outline,
      solidFill
    }));
  }
};
var createGroupTransform = (transformation) => {
  var _transformation$flip, _transformation$flip2, _transformation$offse, _transformation$offse2;
  return new BuilderElement({
    name: "a:xfrm",
    attributes: {
      flipVertical: {
        key: "flipV",
        value: (_transformation$flip = transformation.flip) === null || _transformation$flip === void 0 ? void 0 : _transformation$flip.vertical
      },
      flipHorizontal: {
        key: "flipH",
        value: (_transformation$flip2 = transformation.flip) === null || _transformation$flip2 === void 0 ? void 0 : _transformation$flip2.horizontal
      },
      rotation: {
        key: "rot",
        value: transformation.rotation
      }
    },
    children: [
      new Offset((_transformation$offse = transformation.offset) === null || _transformation$offse === void 0 || (_transformation$offse = _transformation$offse.emus) === null || _transformation$offse === void 0 ? void 0 : _transformation$offse.x, (_transformation$offse2 = transformation.offset) === null || _transformation$offse2 === void 0 || (_transformation$offse2 = _transformation$offse2.emus) === null || _transformation$offse2 === void 0 ? void 0 : _transformation$offse2.y),
      new Extents(transformation.emus.x, transformation.emus.y),
      new BuilderElement({
        name: "a:chOff",
        attributes: {
          x: {
            key: "x",
            value: 0
          },
          y: {
            key: "y",
            value: 0
          }
        }
      }),
      new BuilderElement({
        name: "a:chExt",
        attributes: {
          x: {
            key: "cx",
            value: transformation.emus.x
          },
          y: {
            key: "cy",
            value: transformation.emus.y
          }
        }
      })
    ]
  });
};
var createNonVisualGroupProperties = () => new BuilderElement({ name: "wpg:cNvGrpSpPr" });
var createWpgGroup = (options) => new BuilderElement({
  name: "wpg:wgp",
  children: [
    createNonVisualGroupProperties(),
    new BuilderElement({
      name: "wpg:grpSpPr",
      children: [createGroupTransform(options.transformation)]
    }),
    ...options.children
  ]
});
var GraphicData = class extends XmlComponent {
  constructor({ mediaData, transform, outline, solidFill, crop }) {
    super("a:graphicData");
    if (mediaData.type === "graphic") {
      this.root.push(new GraphicDataAttributes({ uri: mediaData.uri }));
      this.root.push(mediaData.content);
    } else if (mediaData.type === "wps") {
      this.root.push(new GraphicDataAttributes({ uri: "http://schemas.microsoft.com/office/word/2010/wordprocessingShape" }));
      const wps = createWpsShape(_objectSpread2(_objectSpread2({}, mediaData.data), {}, {
        transformation: transform,
        outline,
        solidFill
      }));
      this.root.push(wps);
    } else if (mediaData.type === "wpg") {
      this.root.push(new GraphicDataAttributes({ uri: "http://schemas.microsoft.com/office/word/2010/wordprocessingGroup" }));
      const wpg = createWpgGroup({
        children: mediaData.children.map((child2) => {
          if (child2.type === "wps") return createWpsShape(_objectSpread2(_objectSpread2({}, child2.data), {}, {
            transformation: child2.transformation,
            outline: child2.outline,
            solidFill: child2.solidFill
          }));
          else return new Pic({
            mediaData: child2,
            transform: child2.transformation,
            outline: child2.outline,
            solidFill: child2.solidFill
          });
        }),
        transformation: transform
      });
      this.root.push(wpg);
    } else {
      this.root.push(new GraphicDataAttributes({ uri: "http://schemas.openxmlformats.org/drawingml/2006/picture" }));
      const pic = new Pic({
        mediaData,
        transform,
        outline,
        solidFill,
        crop
      });
      this.root.push(pic);
    }
  }
};
var GraphicAttributes = class extends XmlAttributeComponent {
  constructor(..._args) {
    super(..._args);
    _defineProperty(this, "xmlKeys", { a: "xmlns:a" });
  }
};
var Graphic = class extends XmlComponent {
  constructor({ mediaData, transform, outline, solidFill, crop }) {
    super("a:graphic");
    _defineProperty(this, "data", void 0);
    this.root.push(new GraphicAttributes({ a: "http://schemas.openxmlformats.org/drawingml/2006/main" }));
    this.data = new GraphicData({
      mediaData,
      transform,
      outline,
      solidFill,
      crop
    });
    this.root.push(this.data);
  }
};
var TextWrappingType = {
  /** Text doesn't wrap around the drawing. It is drawn in front of or behind the text */
  NONE: 0,
  /** Text wraps around the drawing's box */
  SQUARE: 1,
  /** Text wraps closely around the drawing's outline */
  TIGHT: 2,
  /** Text sits above and below the drawing, not beside it */
  TOP_AND_BOTTOM: 3,
  /** Text wraps closely around the drawing's outline, and fills any open space inside it */
  THROUGH: 4
};
var TextWrappingSide = {
  /** Text wraps on both sides of the drawing */
  BOTH_SIDES: "bothSides",
  /** Text wraps only on the left side */
  LEFT: "left",
  /** Text wraps only on the right side */
  RIGHT: "right",
  /** Text wraps on the side with more space */
  LARGEST: "largest"
};
var createWrapNone = () => new BuilderElement({ name: "wp:wrapNone" });
var createWrapSquare = (textWrapping, margins = {
  top: 0,
  bottom: 0,
  left: 0,
  right: 0
}) => new BuilderElement({
  name: "wp:wrapSquare",
  attributes: {
    wrapText: {
      key: "wrapText",
      value: textWrapping.side || TextWrappingSide.BOTH_SIDES
    },
    distT: {
      key: "distT",
      value: margins.top
    },
    distB: {
      key: "distB",
      value: margins.bottom
    },
    distL: {
      key: "distL",
      value: margins.left
    },
    distR: {
      key: "distR",
      value: margins.right
    }
  }
});
var WRAP_POLYGON_SIZE = 21600;
var createPoint = (name, { x: x2, y }) => new BuilderElement({
  name,
  attributes: {
    x: {
      key: "x",
      value: x2
    },
    y: {
      key: "y",
      value: y
    }
  }
});
var createWrapPolygon = () => new BuilderElement({
  name: "wp:wrapPolygon",
  attributes: { edited: {
    key: "edited",
    value: false
  } },
  children: [
    createPoint("wp:start", {
      x: 0,
      y: 0
    }),
    createPoint("wp:lineTo", {
      x: 0,
      y: WRAP_POLYGON_SIZE
    }),
    createPoint("wp:lineTo", {
      x: WRAP_POLYGON_SIZE,
      y: WRAP_POLYGON_SIZE
    }),
    createPoint("wp:lineTo", {
      x: WRAP_POLYGON_SIZE,
      y: 0
    }),
    createPoint("wp:lineTo", {
      x: 0,
      y: 0
    })
  ]
});
var createPolygonWrap = (name, margins = {}, textWrapping) => {
  var _textWrapping$side;
  return new BuilderElement({
    name,
    attributes: {
      wrapText: {
        key: "wrapText",
        value: (_textWrapping$side = textWrapping === null || textWrapping === void 0 ? void 0 : textWrapping.side) !== null && _textWrapping$side !== void 0 ? _textWrapping$side : TextWrappingSide.BOTH_SIDES
      },
      distL: {
        key: "distL",
        value: margins.left
      },
      distR: {
        key: "distR",
        value: margins.right
      }
    },
    children: [createWrapPolygon()]
  });
};
var createWrapTight = (margins, textWrapping) => createPolygonWrap("wp:wrapTight", margins, textWrapping);
var createWrapThrough = (margins, textWrapping) => createPolygonWrap("wp:wrapThrough", margins, textWrapping);
var createWrapTopAndBottom = (margins = {
  top: 0,
  bottom: 0
}) => new BuilderElement({
  name: "wp:wrapTopAndBottom",
  attributes: {
    distT: {
      key: "distT",
      value: margins.top
    },
    distB: {
      key: "distB",
      value: margins.bottom
    }
  }
});
var TargetModeType = {
  /** Target is external to the package (e.g., hyperlink to a URL) */
  EXTERNAL: "External"
};
var createRelationship = (id, type, target, targetMode) => new BuilderElement({
  name: "Relationship",
  attributes: {
    id: {
      key: "Id",
      value: id
    },
    type: {
      key: "Type",
      value: type
    },
    target: {
      key: "Target",
      value: target
    },
    targetMode: {
      key: "TargetMode",
      value: targetMode
    }
  }
});
var createHyperlinkClick = (linkId, hasXmlNs) => new BuilderElement({
  name: "a:hlinkClick",
  attributes: _objectSpread2(_objectSpread2({}, hasXmlNs ? { xmlns: {
    key: "xmlns:a",
    value: "http://schemas.openxmlformats.org/drawingml/2006/main"
  } } : {}), {}, { id: {
    key: "r:id",
    value: `rId${linkId}`
  } })
});
var DECORATIVE_EXTENSION_URI = "{C183D7F6-B498-43B3-948B-1728B52AA6E4}";
var createDecorativeExtensionList = (declareNamespace) => new BuilderElement({
  name: "a:extLst",
  attributes: { namespace: {
    key: "xmlns:a",
    value: declareNamespace ? "http://schemas.openxmlformats.org/drawingml/2006/main" : void 0
  } },
  children: [new BuilderElement({
    name: "a:ext",
    attributes: { uri: {
      key: "uri",
      value: DECORATIVE_EXTENSION_URI
    } },
    children: [new BuilderElement({
      name: "adec:decorative",
      attributes: {
        namespace: {
          key: "xmlns:adec",
          value: "http://schemas.microsoft.com/office/drawing/2017/decorative"
        },
        value: {
          key: "val",
          value: 1
        }
      }
    })]
  })]
});
var DrawingLink = class {
  constructor(link) {
    _defineProperty(this, "link", void 0);
    _defineProperty(this, "linkId", uniqueId());
    _defineProperty(this, "addedTo", /* @__PURE__ */ new WeakSet());
    this.link = link;
  }
  createClick(declareNamespace) {
    return createHyperlinkClick(this.linkId, declareNamespace);
  }
  addRelationship(context) {
    const relationships = context.viewWrapper.Relationships;
    if (this.addedTo.has(relationships)) return;
    this.addedTo.add(relationships);
    relationships.addRelationship(this.linkId, "http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink", this.link, TargetModeType.EXTERNAL);
  }
};
var NonVisualDrawingProperties = class extends XmlComponent {
  constructor(name, { id, name: drawingName, description, title, link, decorative }) {
    super(name);
    _defineProperty(this, "link", void 0);
    this.link = link === void 0 ? void 0 : new DrawingLink(link);
    this.root.push(new NextAttributeComponent({
      id: {
        key: "id",
        value: id
      },
      name: {
        key: "name",
        value: drawingName
      },
      description: {
        key: "descr",
        value: description
      },
      title: {
        key: "title",
        value: title
      }
    }));
    if (this.link) this.root.push(this.link.createClick(false));
    if (decorative) this.root.push(createDecorativeExtensionList(false));
  }
  prepForXml(context) {
    var _this$link;
    (_this$link = this.link) === null || _this$link === void 0 || _this$link.addRelationship(context);
    return super.prepForXml(context);
  }
};
var DocProperties = class extends XmlComponent {
  constructor({ name = "", description, title, id } = {}, { link, decorative } = {}) {
    super("wp:docPr");
    _defineProperty(this, "link", void 0);
    _defineProperty(this, "decorative", void 0);
    const attributes = {
      id: {
        key: "id",
        value: id !== null && id !== void 0 ? id : docPropertiesUniqueNumericId()
      },
      name: {
        key: "name",
        value: name
      }
    };
    if (description) attributes.description = {
      key: "descr",
      value: description
    };
    if (title) attributes.title = {
      key: "title",
      value: title
    };
    this.root.push(new NextAttributeComponent(attributes));
    this.link = link === void 0 ? void 0 : new DrawingLink(link);
    this.decorative = decorative;
  }
  prepForXml(context) {
    if (this.link) {
      this.link.addRelationship(context);
      this.root.push(this.link.createClick(true));
    } else for (let i2 = context.stack.length - 1; i2 >= 0; i2--) {
      const element = context.stack[i2];
      if (!(element instanceof ConcreteHyperlink)) continue;
      this.root.push(element.createDrawingClick(context, true));
      break;
    }
    if (this.decorative) this.root.push(createDecorativeExtensionList(true));
    const result = super.prepForXml(context);
    this.root.splice(1);
    return result;
  }
};
var createEffectExtent = ({ top, right, bottom, left }) => new BuilderElement({
  name: "wp:effectExtent",
  attributes: {
    top: {
      key: "t",
      value: top
    },
    right: {
      key: "r",
      value: right
    },
    bottom: {
      key: "b",
      value: bottom
    },
    left: {
      key: "l",
      value: left
    }
  }
});
var MAX_EXTENT = 2147483647;
var EMUS_PER_PIXEL$1 = 9525;
var checkExtent = (dimension, value) => {
  if (value !== void 0 && value > MAX_EXTENT) throw new Error(`Invalid drawing ${dimension} ${value} EMUs (${Math.round(value / EMUS_PER_PIXEL$1)} pixels). Word won't open a drawing with a ${dimension} over ${MAX_EXTENT} EMUs (${Math.floor(MAX_EXTENT / EMUS_PER_PIXEL$1)} pixels). Sizes such as an ImageRun's transformation are in pixels, not EMUs`);
  return value;
};
var createExtent = ({ x: x2, y }) => new BuilderElement({
  name: "wp:extent",
  attributes: {
    x: {
      key: "cx",
      value: checkExtent("width", x2)
    },
    y: {
      key: "cy",
      value: checkExtent("height", y)
    }
  }
});
var GraphicFrameLockAttributes = class extends XmlAttributeComponent {
  constructor(..._args) {
    super(..._args);
    _defineProperty(this, "xmlKeys", {
      xmlns: "xmlns:a",
      noChangeAspect: "noChangeAspect"
    });
  }
};
var GraphicFrameLocks = class extends XmlComponent {
  constructor() {
    super("a:graphicFrameLocks");
    this.root.push(new GraphicFrameLockAttributes({
      xmlns: "http://schemas.openxmlformats.org/drawingml/2006/main",
      noChangeAspect: 1
    }));
  }
};
var createGraphicFrameProperties = (lockAspectRatio = true) => new BuilderElement({
  name: "wp:cNvGraphicFramePr",
  children: lockAspectRatio ? [new GraphicFrameLocks()] : []
});
var AnchorAttributes = class extends XmlAttributeComponent {
  constructor(..._args) {
    super(..._args);
    _defineProperty(this, "xmlKeys", {
      distT: "distT",
      distB: "distB",
      distL: "distL",
      distR: "distR",
      allowOverlap: "allowOverlap",
      behindDoc: "behindDoc",
      layoutInCell: "layoutInCell",
      locked: "locked",
      relativeHeight: "relativeHeight",
      simplePos: "simplePos"
    });
  }
};
var Anchor = class extends XmlComponent {
  constructor({ mediaData, transform, drawingOptions }) {
    var _drawingOptions$effec;
    super("wp:anchor");
    const floating = _objectSpread2({
      allowOverlap: true,
      behindDocument: false,
      lockAnchor: false,
      layoutInCell: true,
      verticalPosition: {},
      horizontalPosition: {}
    }, drawingOptions.floating);
    this.root.push(new AnchorAttributes({
      distT: floating.margins ? floating.margins.top || 0 : 0,
      distB: floating.margins ? floating.margins.bottom || 0 : 0,
      distL: floating.margins ? floating.margins.left || 0 : 0,
      distR: floating.margins ? floating.margins.right || 0 : 0,
      simplePos: "0",
      allowOverlap: floating.allowOverlap === true ? "1" : "0",
      behindDoc: floating.behindDocument === true ? "1" : "0",
      locked: floating.lockAnchor === true ? "1" : "0",
      layoutInCell: floating.layoutInCell === true ? "1" : "0",
      relativeHeight: floating.zIndex ? floating.zIndex : transform.emus.y
    }));
    this.root.push(createSimplePos());
    this.root.push(createHorizontalPosition(floating.horizontalPosition));
    this.root.push(createVerticalPosition(floating.verticalPosition));
    this.root.push(createExtent({
      x: transform.emus.x,
      y: transform.emus.y
    }));
    this.root.push(createEffectExtent((_drawingOptions$effec = drawingOptions.effectExtent) !== null && _drawingOptions$effec !== void 0 ? _drawingOptions$effec : {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0
    }));
    if (drawingOptions.floating !== void 0 && drawingOptions.floating.wrap !== void 0) switch (drawingOptions.floating.wrap.type) {
      case TextWrappingType.SQUARE:
        this.root.push(createWrapSquare(drawingOptions.floating.wrap, drawingOptions.floating.margins));
        break;
      case TextWrappingType.TIGHT:
        this.root.push(createWrapTight(drawingOptions.floating.margins, drawingOptions.floating.wrap));
        break;
      case TextWrappingType.THROUGH:
        this.root.push(createWrapThrough(drawingOptions.floating.margins, drawingOptions.floating.wrap));
        break;
      case TextWrappingType.TOP_AND_BOTTOM:
        this.root.push(createWrapTopAndBottom(drawingOptions.floating.margins));
        break;
      case TextWrappingType.NONE:
      default:
        this.root.push(createWrapNone());
    }
    else this.root.push(createWrapNone());
    this.root.push(new DocProperties(drawingOptions.docProperties, {
      link: drawingOptions.link,
      decorative: drawingOptions.decorative
    }));
    this.root.push(createGraphicFrameProperties(mediaData.type !== "graphic" || mediaData.lockAspectRatio !== false));
    this.root.push(new Graphic({
      mediaData,
      transform,
      outline: drawingOptions.outline,
      solidFill: drawingOptions.solidFill,
      crop: drawingOptions.crop
    }));
  }
};
var createInline = ({ mediaData, transform, docProperties, outline, solidFill, crop, effectExtent, link, decorative }) => {
  var _outline$width, _outline$width2, _outline$width3, _outline$width4;
  return new BuilderElement({
    name: "wp:inline",
    attributes: {
      distanceTop: {
        key: "distT",
        value: 0
      },
      distanceBottom: {
        key: "distB",
        value: 0
      },
      distanceLeft: {
        key: "distL",
        value: 0
      },
      distanceRight: {
        key: "distR",
        value: 0
      }
    },
    children: [
      createExtent({
        x: transform.emus.x,
        y: transform.emus.y
      }),
      createEffectExtent(effectExtent !== null && effectExtent !== void 0 ? effectExtent : outline ? {
        top: ((_outline$width = outline.width) !== null && _outline$width !== void 0 ? _outline$width : 9525) * 2,
        right: ((_outline$width2 = outline.width) !== null && _outline$width2 !== void 0 ? _outline$width2 : 9525) * 2,
        bottom: ((_outline$width3 = outline.width) !== null && _outline$width3 !== void 0 ? _outline$width3 : 9525) * 2,
        left: ((_outline$width4 = outline.width) !== null && _outline$width4 !== void 0 ? _outline$width4 : 9525) * 2
      } : {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0
      }),
      new DocProperties(docProperties, {
        link,
        decorative
      }),
      createGraphicFrameProperties(mediaData.type !== "graphic" || mediaData.lockAspectRatio !== false),
      new Graphic({
        mediaData,
        transform,
        outline,
        solidFill,
        crop
      })
    ]
  });
};
var Drawing = class extends XmlComponent {
  constructor(imageData, drawingOptions = {}) {
    super("w:drawing");
    if (!drawingOptions.floating) this.root.push(createInline({
      mediaData: imageData,
      transform: imageData.transformation,
      docProperties: drawingOptions.docProperties,
      outline: drawingOptions.outline,
      solidFill: drawingOptions.solidFill,
      crop: drawingOptions.crop,
      effectExtent: drawingOptions.effectExtent,
      link: drawingOptions.link,
      decorative: drawingOptions.decorative
    }));
    else this.root.push(new Anchor({
      mediaData: imageData,
      transform: imageData.transformation,
      drawingOptions
    }));
  }
};
var createImageData = (options, key) => ({
  data: standardizeData(options.data),
  fileName: key,
  transformation: {
    pixels: {
      x: Math.round(options.transformation.width),
      y: Math.round(options.transformation.height)
    },
    emus: {
      x: Math.round(options.transformation.width * 9525),
      y: Math.round(options.transformation.height * 9525)
    },
    flip: options.transformation.flip,
    rotation: options.transformation.rotation ? options.transformation.rotation * 6e4 : void 0
  }
});
var createRegularImageData = (options, transformation, name) => {
  const type = imageTypeOf(options, name);
  return _objectSpread2({ type }, createImageData(_objectSpread2(_objectSpread2({}, options), {}, { transformation }), `${hashedId(options.data)}.${type}`));
};
var createDeletion = ({ id, author, date }, run) => new BuilderElement({
  name: "w:del",
  attributes: {
    id: {
      key: "w:id",
      value: id
    },
    author: {
      key: "w:author",
      value: author
    },
    date: {
      key: "w:date",
      value: date
    }
  },
  children: [run]
});
var ImageRun = class extends XmlComponent {
  constructor(options) {
    var _options$insertion;
    const imageData = options.type === "svg" ? _objectSpread2(_objectSpread2({ type: options.type }, createImageData(options, `${hashedId(options.data)}.svg`)), {}, { fallback: createRegularImageData(options.fallback, options.transformation, "ImageRun fallback") }) : createRegularImageData(options, options.transformation, "ImageRun");
    const drawing = new Drawing(imageData, {
      floating: options.floating,
      docProperties: options.altText,
      outline: options.outline,
      solidFill: options.solidFill,
      crop: options.crop,
      link: options.link,
      decorative: options.decorative
    });
    const properties = new RunProperties(options.run);
    const revision = (_options$insertion = options.insertion) !== null && _options$insertion !== void 0 ? _options$insertion : options.deletion;
    const rootName = options.insertion ? "w:ins" : options.deletion ? "w:del" : "w:r";
    super(rootName);
    _defineProperty(this, "imageData", void 0);
    if (revision) {
      this.root.push(new ChangeAttributes({
        id: revision.id,
        author: revision.author,
        date: revision.date
      }));
      const run = new BuilderElement({
        name: "w:r",
        children: [properties, drawing]
      });
      this.addChildElement(options.insertion && options.deletion ? createDeletion(options.deletion, run) : run);
    } else {
      this.root.push(properties);
      this.root.push(drawing);
    }
    this.imageData = imageData;
  }
  prepForXml(context) {
    context.file.Media.addImage(this.imageData.fileName, this.imageData);
    if (this.imageData.type === "svg") context.file.Media.addImage(this.imageData.fallback.fileName, this.imageData.fallback);
    return super.prepForXml(context);
  }
};
var createTransformation = (options) => {
  var _options$offset$left, _options$offset, _options$offset$top, _options$offset2, _options$offset$left2, _options$offset3, _options$offset$top2, _options$offset4;
  return {
    offset: {
      pixels: {
        x: Math.round((_options$offset$left = (_options$offset = options.offset) === null || _options$offset === void 0 ? void 0 : _options$offset.left) !== null && _options$offset$left !== void 0 ? _options$offset$left : 0),
        y: Math.round((_options$offset$top = (_options$offset2 = options.offset) === null || _options$offset2 === void 0 ? void 0 : _options$offset2.top) !== null && _options$offset$top !== void 0 ? _options$offset$top : 0)
      },
      emus: {
        x: Math.round(((_options$offset$left2 = (_options$offset3 = options.offset) === null || _options$offset3 === void 0 ? void 0 : _options$offset3.left) !== null && _options$offset$left2 !== void 0 ? _options$offset$left2 : 0) * 9525),
        y: Math.round(((_options$offset$top2 = (_options$offset4 = options.offset) === null || _options$offset4 === void 0 ? void 0 : _options$offset4.top) !== null && _options$offset$top2 !== void 0 ? _options$offset$top2 : 0) * 9525)
      }
    },
    pixels: {
      x: Math.round(options.width),
      y: Math.round(options.height)
    },
    emus: {
      x: Math.round(options.width * 9525),
      y: Math.round(options.height * 9525)
    },
    flip: options.flip,
    rotation: options.rotation ? options.rotation * 6e4 : void 0
  };
};
var WpsShapeRun = class extends Run {
  constructor(options) {
    super({});
    _defineProperty(this, "wpsShapeData", void 0);
    this.wpsShapeData = {
      type: options.type,
      transformation: createTransformation(options.transformation),
      data: _objectSpread2({}, options)
    };
    const drawing = new Drawing(this.wpsShapeData, {
      floating: options.floating,
      docProperties: options.altText,
      outline: options.outline,
      solidFill: options.solidFill
    });
    this.root.push(drawing);
  }
};
var WpgGroupRun = class extends Run {
  constructor(options) {
    super({});
    _defineProperty(this, "wpgGroupData", void 0);
    _defineProperty(this, "mediaDatas", void 0);
    this.wpgGroupData = {
      type: options.type,
      transformation: createTransformation(options.transformation),
      children: options.children
    };
    const drawing = new Drawing(this.wpgGroupData, {
      floating: options.floating,
      docProperties: options.altText
    });
    this.mediaDatas = options.children.filter((child2) => child2.type !== "wps").map((child2) => child2);
    this.root.push(drawing);
  }
  prepForXml(context) {
    this.mediaDatas.forEach((child2) => {
      context.file.Media.addImage(child2.fileName, child2);
      if (child2.type === "svg") context.file.Media.addImage(child2.fallback.fileName, child2.fallback);
    });
    return super.prepForXml(context);
  }
};
var SequentialIdentifierInstruction = class extends XmlComponent {
  constructor(identifier) {
    super("w:instrText");
    this.root.push(new TextAttributes({ space: SpaceType.PRESERVE }));
    this.root.push(`SEQ ${identifier}`);
  }
};
var SequentialIdentifier = class extends Run {
  constructor(identifier) {
    super({});
    this.root.push(createBeginDirtyWithoutPageNumbers());
    this.root.push(new SequentialIdentifierInstruction(identifier));
    this.root.push(createSeparate());
    this.root.push(createEnd());
  }
};
var MARKER_FIELD = /^\s*(?:XE|TC|TA|RD|PRIVATE)\b/i;
var FieldInstructionText = class extends XmlComponent {
  constructor(instruction) {
    super("w:instrText");
    this.root.push(new TextAttributes({ space: SpaceType.PRESERVE }));
    this.root.push(instruction);
  }
};
var FldSimpleAttrs = class extends XmlAttributeComponent {
  constructor(..._args) {
    super(..._args);
    _defineProperty(this, "xmlKeys", {
      instr: "w:instr",
      fldLock: "w:fldLock"
    });
  }
};
var SimpleField = class extends XmlComponent {
  constructor(instruction, cachedValue, options = {}) {
    const marker = MARKER_FIELD.test(instruction);
    super(marker ? "w:r" : "w:fldSimple");
    if (marker) {
      this.root.push(createBegin(void 0, options.locked ? true : void 0));
      this.root.push(new FieldInstructionText(instruction));
      this.root.push(createEnd());
      return;
    }
    this.root.push(new FldSimpleAttrs({
      instr: instruction,
      fldLock: options.locked ? true : void 0
    }));
    if (cachedValue !== void 0) this.root.push(new TextRun(cachedValue));
  }
};
var SimpleMailMergeField = class extends SimpleField {
  constructor(fieldName) {
    super(` MERGEFIELD ${fieldName} `, `«${fieldName}»`);
  }
};
var LARGEST_ROMAN = 32767;
var LARGEST_LETTERS = 780;
var ROMAN = [
  [1e3, "M"],
  [900, "CM"],
  [500, "D"],
  [400, "CD"],
  [100, "C"],
  [90, "XC"],
  [50, "L"],
  [40, "XL"],
  [10, "X"],
  [9, "IX"],
  [5, "V"],
  [4, "IV"],
  [1, "I"]
];
var roman = (value) => value <= LARGEST_ROMAN ? ROMAN.reduce(({ rest, text }, [amount, numeral]) => ({
  rest: rest % amount,
  text: text + numeral.repeat(Math.floor(rest / amount))
}), {
  rest: value,
  text: ""
}).text : void 0;
var letters = (value) => value === 0 ? "" : value <= LARGEST_LETTERS ? String.fromCharCode(65 + (value - 1) % 26).repeat(Math.ceil(value / 26)) : void 0;
var ordinal = (value) => {
  var _ref;
  return `${value}${value % 100 >= 11 && value % 100 <= 13 ? "th" : (_ref = [
    "th",
    "st",
    "nd",
    "rd"
  ][value % 10]) !== null && _ref !== void 0 ? _ref : "th"}`;
};
var numberWriterOf = (format2) => {
  const small = format2.charAt(0) !== format2.charAt(0).toUpperCase();
  const inCase = (write) => (value) => {
    var _write;
    return small ? (_write = write(value)) === null || _write === void 0 ? void 0 : _write.toLowerCase() : write(value);
  };
  switch (format2.toLowerCase()) {
    case "arabic":
      return String;
    case "roman":
      return inCase(roman);
    case "alphabetic":
      return inCase(letters);
    case "ordinal":
      return (value) => value > 0 ? ordinal(value) : void 0;
    case "arabicdash":
      return (value) => `- ${value} -`;
    default:
      return;
  }
};
var PLAIN_FORMATS = /* @__PURE__ */ new Set([
  "mergeformat",
  "charformat",
  "mergeformatinet"
]);
var CASE_FORMATS = /* @__PURE__ */ new Set([
  "upper",
  "lower",
  "firstcap",
  "caps"
]);
var isNumberPicture = (picture) => /^[#0,]*[#0][#0,]*$/.test(picture);
var inNumberPicture = (value, picture) => {
  const zeros = [...picture].filter((character) => character === "0").length;
  const places = zeros + [...picture].filter((character) => character === "#").length;
  const digits = String(value).padStart(zeros, "0");
  if (digits.length < places || zeros === 0 && value === 0) return;
  return picture.includes(",") ? digits.replace(/\B(?=(\d{3})+$)/g, ",") : digits;
};
var inCapitals = (text, capitals) => {
  switch (capitals) {
    case "upper":
      return text.toUpperCase();
    case "lower":
      return text.toLowerCase();
    case "firstcap":
      return text.charAt(0).toUpperCase() + text.slice(1);
    default:
      return text;
  }
};
var numberFieldOf = (instruction) => {
  var _match;
  const field = new RegExp("^\\s*(PAGEREF|NUMPAGES|SECTIONPAGES)\\b(.*)$", "is").exec(instruction);
  const reference = (field === null || field === void 0 ? void 0 : field[1].toUpperCase()) === "PAGEREF" ? new RegExp('^\\s*("?)([^\\s"\\\\]+)\\1(.*)$', "s").exec(field[2]) : void 0;
  if (!field || field[1].toUpperCase() === "PAGEREF" && !reference) return;
  const parts = (_match = (reference ? reference[3] : field[2]).match(/"[^"]*"|\S+/g)) !== null && _match !== void 0 ? _match : [];
  let numberFormat;
  let picture;
  const capitals = [];
  let relative = false;
  let written = true;
  for (let index = 0; index < parts.length; index++) {
    const part = parts[index];
    const argument = () => {
      var _parts$index;
      return (part.length > 2 ? part.slice(2) : (_parts$index = parts[++index]) !== null && _parts$index !== void 0 ? _parts$index : "").replace(/^"(.*)"$/, "$1");
    };
    if (/^\\p$/i.test(part)) relative = true;
    else if (part.startsWith("\\#")) {
      var _picture;
      const value = argument();
      written && (written = picture === void 0 && isNumberPicture(value));
      (_picture = picture) !== null && _picture !== void 0 || (picture = value);
    } else if (part.startsWith("\\*")) {
      const name = argument();
      const lower = name.toLowerCase();
      if (CASE_FORMATS.has(lower)) capitals.push(lower);
      else if (name !== "" && !PLAIN_FORMATS.has(lower)) {
        var _numberFormat;
        written && (written = numberFormat === void 0 && numberWriterOf(name) !== void 0);
        (_numberFormat = numberFormat) !== null && _numberFormat !== void 0 || (numberFormat = name);
      }
    }
  }
  const own = _objectSpread2(_objectSpread2(_objectSpread2(_objectSpread2({}, numberFormat === void 0 ? {} : { numberFormat }), picture === void 0 ? {} : { picture }), capitals.length === 0 ? {} : { capitals: capitals[0] }), {}, { written: written && capitals.length <= 1 && capitals[0] !== "caps" && (numberFormat === void 0 || picture === void 0) });
  return reference ? _objectSpread2({
    type: "pageReference",
    bookmark: reference[2],
    relative
  }, own) : _objectSpread2({
    type: "pageCount",
    scope: field[1].toUpperCase() === "NUMPAGES" ? "document" : "section"
  }, own);
};
var prefixesPageNumbers = (instruction) => new RegExp("^\\s*TOC\\b.*\\\\s\\b", "is").test(instruction);
var resultFrom = (instruction, { enclosing, within, inTextBox }, { estimate, sectionPageCount, blank, relativeTo }) => {
  const field = numberFieldOf(instruction);
  if (field === void 0) return;
  const { bookmarks, pageCount, bookmarkPageNumbers } = estimate;
  const { numberFormat, picture, capitals, written } = field;
  const writesNumber = numberFormat !== void 0 || picture !== void 0;
  const inFormat = (value) => value === void 0 ? void 0 : picture === void 0 ? numberWriterOf(numberFormat !== null && numberFormat !== void 0 ? numberFormat : "arabic")(value) : inNumberPicture(value, picture);
  const position = field.type === "pageReference" && field.relative && within === "counted" && !inTextBox ? relativeTo === null || relativeTo === void 0 ? void 0 : relativeTo(field.bookmark) : void 0;
  let result;
  if (!written) result = void 0;
  else if (field.type === "pageCount") result = inFormat(field.scope === "document" ? pageCount : sectionPageCount);
  else if (enclosing.some(prefixesPageNumbers)) result = void 0;
  else if (writesNumber) result = inFormat(bookmarkPageNumbers === null || bookmarkPageNumbers === void 0 ? void 0 : bookmarkPageNumbers.get(field.bookmark));
  else result = field.relative ? position : bookmarks.get(field.bookmark);
  return result === void 0 ? blank ? "" : void 0 : inCapitals(result, capitals);
};
var placeIn = (name, within) => name === "mc:Fallback" || within === "fallback" ? "fallback" : name === "w:del" || name === "w:moveFrom" ? "deleted" : within;
var fillFields = (tree, elements, open, filling, within = "counted", inTextBox = false) => {
  for (let index = 0; index < elements.length; index++) {
    const element = elements[index];
    const name = tree.nameOf(element);
    if (name === void 0) continue;
    const current = open[open.length - 1];
    if (name === "w:fldChar") {
      const type = tree.attributeOf(element, "w:fldCharType");
      if (type === "begin") open.push({
        begin: element,
        instruction: "",
        inResult: false
      });
      else if (type === "separate" && current) {
        tree.writeClean(current.begin, current.instruction);
        current.inResult = true;
        current.result = filling.resultOf(current.instruction, {
          within,
          enclosing: open.slice(0, -1).map((field) => field.instruction),
          inTextBox
        });
        if (current.result !== void 0) {
          elements.splice(index + 1, 0, tree.textElement(current.result));
          index++;
        }
      } else if (type === "end") open.pop();
    } else if (name === "w:instrText" && current && !current.inResult) current.instruction += tree.textOf(element);
    else if ((name === "w:t" || name === "w:tab" || name === "w:br" || name === "w:cr") && (current === null || current === void 0 ? void 0 : current.result) !== void 0) {
      elements.splice(index, 1);
      index--;
    } else if (name === "w:fldSimple") {
      const result = filling.resultOf(String(tree.attributeOf(element, "w:instr")), {
        within,
        enclosing: open.map((field) => field.instruction),
        inTextBox
      });
      if (result === void 0) {
        var _tree$contentOf;
        fillFields(tree, (_tree$contentOf = tree.contentOf(element)) !== null && _tree$contentOf !== void 0 ? _tree$contentOf : [], [], filling, within, inTextBox);
      } else tree.setSimpleFieldResult(element, result);
    } else {
      var _tree$contentOf2;
      if (name === "w:p") {
        var _filling$beforeParagr;
        (_filling$beforeParagr = filling.beforeParagraph) === null || _filling$beforeParagr === void 0 || _filling$beforeParagr.call(filling, element);
      }
      fillFields(tree, (_tree$contentOf2 = tree.contentOf(element)) !== null && _tree$contentOf2 !== void 0 ? _tree$contentOf2 : [], open, filling, placeIn(name, within), inTextBox || name === "w:txbxContent");
      if (name === "w:p") filling.afterParagraph(element);
    }
  }
};
var sectionPropertiesIn = (tree, elements) => elements.flatMap((element) => {
  var _tree$contentOf3;
  const name = tree.nameOf(element);
  if (name === void 0) return [];
  return name === "w:sectPr" ? [element] : sectionPropertiesIn(tree, (_tree$contentOf3 = tree.contentOf(element)) !== null && _tree$contentOf3 !== void 0 ? _tree$contentOf3 : []);
});
var endsSection = (tree, paragraph) => {
  var _tree$contentOf4;
  return ((_tree$contentOf4 = tree.contentOf(paragraph)) !== null && _tree$contentOf4 !== void 0 ? _tree$contentOf4 : []).some((child2) => {
    var _tree$contentOf5;
    return tree.nameOf(child2) === "w:pPr" && ((_tree$contentOf5 = tree.contentOf(child2)) !== null && _tree$contentOf5 !== void 0 ? _tree$contentOf5 : []).some((part) => tree.nameOf(part) === "w:sectPr");
  });
};
var partPageCountsOf = (tree, body, sectionPageCounts) => {
  const countsOfParts = sectionPropertiesIn(tree, [body]).reduce((all, properties) => {
    var _tree$contentOf6, _all;
    const references = ((_tree$contentOf6 = tree.contentOf(properties)) !== null && _tree$contentOf6 !== void 0 ? _tree$contentOf6 : []).flatMap((child2) => {
      const name = tree.nameOf(child2);
      return name === "w:headerReference" || name === "w:footerReference" ? [[`${name} ${String(tree.attributeOf(child2, "w:type"))}`, String(tree.attributeOf(child2, "r:id"))]] : [];
    });
    return [...all, new Map([...(_all = all[all.length - 1]) !== null && _all !== void 0 ? _all : [], ...references])];
  }, []).reduce((counts, parts, section) => {
    for (const id of parts.values()) {
      var _counts$get;
      counts.set(id, [...(_counts$get = counts.get(id)) !== null && _counts$get !== void 0 ? _counts$get : [], sectionPageCounts[section]]);
    }
    return counts;
  }, /* @__PURE__ */ new Map());
  return new Map([...countsOfParts].flatMap(([id, [first, ...rest]]) => first !== void 0 && rest.every((count) => count === first) ? [[id, first]] : []));
};
var fillBodyFields = (tree, body, estimate, { blank }) => {
  const { sectionPageCounts = [], relativePositions } = estimate;
  let section = 0;
  const relativeCounts = /* @__PURE__ */ new Map();
  const relativeTo = (bookmark2) => {
    var _relativeCounts$get, _relativePositions$ge;
    const count = (_relativeCounts$get = relativeCounts.get(bookmark2)) !== null && _relativeCounts$get !== void 0 ? _relativeCounts$get : 0;
    relativeCounts.set(bookmark2, count + 1);
    return relativePositions === null || relativePositions === void 0 || (_relativePositions$ge = relativePositions.get(bookmark2)) === null || _relativePositions$ge === void 0 ? void 0 : _relativePositions$ge[count];
  };
  fillFields(tree, [body], [], {
    resultOf: (instruction, place) => resultFrom(instruction, place, {
      estimate,
      sectionPageCount: sectionPageCounts[section],
      blank,
      relativeTo
    }),
    afterParagraph: (paragraph) => {
      section += endsSection(tree, paragraph) ? 1 : 0;
    }
  });
  return partPageCountsOf(tree, body, sectionPageCounts);
};
var fillPartFields = (tree, part, estimate, { blank, sectionPageCount, notes = false }) => {
  const onPage = (bookmark2) => {
    const page = estimate.bookmarks.get(bookmark2);
    return page === void 0 ? void 0 : `on page ${page}`;
  };
  fillFields(tree, [part], [], {
    resultOf: (instruction, place) => resultFrom(instruction, place, _objectSpread2({
      estimate,
      sectionPageCount,
      blank
    }, notes ? { relativeTo: onPage } : {})),
    afterParagraph: () => void 0
  });
};
var fillSequenceFields = (tree, body, { beforeParagraph, resultOf }) => fillFields(tree, [body], [], {
  resultOf: (instruction, { within }) => resultOf(instruction, within),
  beforeParagraph,
  afterParagraph: () => void 0
});
var FieldInstruction = class extends XmlComponent {
  constructor(properties = {}) {
    super("w:instrText");
    _defineProperty(this, "properties", void 0);
    this.properties = properties;
    this.root.push(new TextAttributes({ space: SpaceType.PRESERVE }));
    let instruction = "TOC";
    if (this.properties.captionLabel) instruction = `${instruction} \\a "${this.properties.captionLabel}"`;
    if (this.properties.entriesFromBookmark) instruction = `${instruction} \\b "${this.properties.entriesFromBookmark}"`;
    if (this.properties.captionLabelIncludingNumbers) instruction = `${instruction} \\c "${this.properties.captionLabelIncludingNumbers}"`;
    if (this.properties.sequenceAndPageNumbersSeparator) instruction = `${instruction} \\d "${this.properties.sequenceAndPageNumbersSeparator}"`;
    if (this.properties.tcFieldIdentifier) instruction = `${instruction} \\f "${this.properties.tcFieldIdentifier}"`;
    if (this.properties.hyperlink) instruction = `${instruction} \\h`;
    if (this.properties.tcFieldLevelRange) instruction = `${instruction} \\l "${this.properties.tcFieldLevelRange}"`;
    if (this.properties.pageNumbersEntryLevelsRange) instruction = `${instruction} \\n "${this.properties.pageNumbersEntryLevelsRange}"`;
    if (this.properties.headingStyleRange) instruction = `${instruction} \\o "${this.properties.headingStyleRange}"`;
    if (this.properties.entryAndPageNumberSeparator) instruction = `${instruction} \\p "${this.properties.entryAndPageNumberSeparator}"`;
    if (this.properties.seqFieldIdentifierForPrefix) instruction = `${instruction} \\s "${this.properties.seqFieldIdentifierForPrefix}"`;
    if (this.properties.stylesWithLevels && this.properties.stylesWithLevels.length) {
      const styles = this.properties.stylesWithLevels.map((sl) => `${sl.styleName},${sl.level}`).join(",");
      instruction = `${instruction} \\t "${styles}"`;
    }
    if (this.properties.useAppliedParagraphOutlineLevel) instruction = `${instruction} \\u`;
    if (this.properties.preserveTabInEntries) instruction = `${instruction} \\w`;
    if (this.properties.preserveNewLineInEntries) instruction = `${instruction} \\x`;
    if (this.properties.hideTabAndPageNumbersInWebView) instruction = `${instruction} \\z`;
    this.root.push(instruction);
  }
};
var StructuredDocumentTagContent = class extends XmlComponent {
  constructor() {
    super("w:sdtContent");
  }
};
var beginOf = (beginDirty) => beginDirty === void 0 ? createBeginDirtyWithoutPageNumbers() : createBegin(beginDirty);
var writtenTables = /* @__PURE__ */ new WeakMap();
var recordTableOfContents = (table, fillWith) => {
  writtenTables.set(table, fillWith);
};
var HeadingBookmarkIds = class {
  constructor() {
    _defineProperty(this, "ids", []);
  }
  get(index) {
    var _this$ids, _this$ids$index;
    (_this$ids$index = (_this$ids = this.ids)[index]) !== null && _this$ids$index !== void 0 || (_this$ids[index] = bookmarkUniqueNumericId());
    return this.ids[index];
  }
};
var nameOf$4 = (element) => typeof element === "object" && element !== null ? Object.keys(element)[0] : void 0;
var childrenOf$1 = (element) => {
  const name = nameOf$4(element);
  const content = name === void 0 ? void 0 : element[name];
  return Array.isArray(content) ? content : content === void 0 ? [] : [content];
};
var childOf$2 = (element, name) => childrenOf$1(element).find((child2) => nameOf$4(child2) === name);
var attributeOf = (element, attribute2) => {
  var _childOf;
  return (_childOf = childOf$2(element, "_attr")) === null || _childOf === void 0 || (_childOf = _childOf._attr) === null || _childOf === void 0 ? void 0 : _childOf[attribute2];
};
var numberAttributeOf = (element, attribute2) => {
  const value = attributeOf(element, attribute2);
  return value === void 0 ? void 0 : Number(value);
};
var BLOCK_CONTAINERS = /* @__PURE__ */ new Set([
  "w:tbl",
  "w:tr",
  "w:tc",
  "w:sdt",
  "w:sdtContent",
  "w:customXml"
]);
var blocksOf = (elements) => elements.flatMap((element) => {
  const name = nameOf$4(element);
  if (name === "w:p" || writtenTables.has(element)) return [element];
  return name !== void 0 && BLOCK_CONTAINERS.has(name) ? blocksOf(childrenOf$1(element)) : [];
});
var TEXT_CONTAINERS = /* @__PURE__ */ new Set([
  "w:r",
  "w:hyperlink",
  "w:ins",
  "w:moveTo",
  "w:smartTag",
  "w:customXml",
  "w:sdt",
  "w:sdtContent",
  "w:fldSimple",
  "w:dir",
  "w:bdo"
]);
var textOfRunContent = (element) => {
  switch (nameOf$4(element)) {
    case "w:t":
      return childrenOf$1(element).filter((child2) => typeof child2 === "string").join("");
    case "w:tab":
      return "	";
    case "w:br":
      return [void 0, "textWrapping"].includes(attributeOf(element, "w:type")) ? "\n" : "";
    case "w:cr":
      return "\n";
    case "w:noBreakHyphen":
      return "-";
    default:
      return "";
  }
};
var textOf$1 = (paragraph) => {
  const fields = [];
  const read = (element) => {
    const name = nameOf$4(element);
    if (name !== void 0 && TEXT_CONTAINERS.has(name)) return childrenOf$1(element).map(read).join("");
    if (name === "w:fldChar") {
      const type = attributeOf(element, "w:fldCharType");
      if (type === "begin") fields.push(false);
      else if (type === "separate") fields[fields.length - 1] = true;
      else fields.pop();
      return "";
    }
    return fields.every(Boolean) ? textOfRunContent(element) : "";
  };
  return childrenOf$1(paragraph).map(read).join("");
};
var bookmarkMarksOf = (element) => {
  const name = nameOf$4(element);
  if (name === "w:bookmarkStart") return [{
    start: true,
    id: attributeOf(element, "w:id"),
    name: attributeOf(element, "w:name")
  }];
  if (name === "w:bookmarkEnd") return [{
    start: false,
    id: attributeOf(element, "w:id")
  }];
  return name === void 0 || name === "_attr" ? [] : childrenOf$1(element).flatMap(bookmarkMarksOf);
};
var bookmarksOf = (paragraphs) => {
  const open = /* @__PURE__ */ new Map();
  return paragraphs.map((paragraph) => {
    const marks = bookmarkMarksOf(paragraph);
    const names = /* @__PURE__ */ new Set([...open.values(), ...marks.flatMap((mark) => mark.start ? [mark.name] : [])]);
    for (const mark of marks) if (mark.start) open.set(mark.id, mark.name);
    else open.delete(mark.id);
    return names;
  });
};
var paragraphDetailsOf = (paragraphs, followBookmarks) => {
  const bookmarks = followBookmarks ? bookmarksOf(paragraphs) : [];
  return paragraphs.map((element, index) => {
    var _bookmarks$index;
    const properties = childOf$2(element, "w:pPr");
    return {
      element,
      styleId: attributeOf(childOf$2(properties, "w:pStyle"), "w:val"),
      outlineLevel: numberAttributeOf(childOf$2(properties, "w:outlineLvl"), "w:val"),
      text: textOf$1(element),
      bookmarks: (_bookmarks$index = bookmarks[index]) !== null && _bookmarks$index !== void 0 ? _bookmarks$index : /* @__PURE__ */ new Set()
    };
  });
};
var stylesOf = (context) => {
  var _context$file;
  const styles = (_context$file = context.file) === null || _context$file === void 0 || (_context$file = _context$file.Styles) === null || _context$file === void 0 ? void 0 : _context$file.prepForXml(context);
  return new Map(childrenOf$1(styles).filter((style) => nameOf$4(style) === "w:style" && ["paragraph", void 0].includes(attributeOf(style, "w:type"))).map((style) => [attributeOf(style, "w:styleId"), {
    name: attributeOf(childOf$2(style, "w:name"), "w:val"),
    basedOn: attributeOf(childOf$2(style, "w:basedOn"), "w:val"),
    outlineLevel: numberAttributeOf(childOf$2(childOf$2(style, "w:pPr"), "w:outlineLvl"), "w:val")
  }]));
};
var parseRange = (range) => {
  const match = /^\s*(\d+)\s*-\s*(\d+)\s*$/.exec(range);
  return match ? [Number(match[1]), Number(match[2])] : void 0;
};
var isWithin = (level, [from, to]) => level >= from && level <= to;
var headingLevelOf = (styleId, styles) => {
  var _styles$get$name, _styles$get;
  if (styleId === void 0) return;
  const match = /^heading ?([1-9])$/i.exec((_styles$get$name = (_styles$get = styles.get(styleId)) === null || _styles$get === void 0 ? void 0 : _styles$get.name) !== null && _styles$get$name !== void 0 ? _styles$get$name : styleId);
  return match ? Number(match[1]) : void 0;
};
var styleOutlineLevelOf = (styleId, styles, depth = 0) => {
  var _style$outlineLevel;
  if (styleId === void 0 || depth > styles.size) return;
  const style = styles.get(styleId);
  const heading = headingLevelOf(styleId, styles);
  return (_style$outlineLevel = style === null || style === void 0 ? void 0 : style.outlineLevel) !== null && _style$outlineLevel !== void 0 ? _style$outlineLevel : heading === void 0 ? styleOutlineLevelOf(style === null || style === void 0 ? void 0 : style.basedOn, styles, depth + 1) : heading - 1;
};
var headingLevels = (context) => {
  const styles = stylesOf(context);
  return (paragraph) => {
    const properties = childOf$2(paragraph, "w:pPr");
    const styleId = attributeOf(childOf$2(properties, "w:pStyle"), "w:val");
    const heading = headingLevelOf(styleId, styles);
    const outlineLevel = outlineLevelOf({
      styleId,
      outlineLevel: numberAttributeOf(childOf$2(properties, "w:outlineLvl"), "w:val")
    }, styles);
    const outline = outlineLevel === void 0 || outlineLevel >= 9 ? void 0 : outlineLevel + 1;
    if (heading !== void 0 && (outline === void 0 || outline === heading)) return heading;
    return outline === void 0 ? void 0 : "unclear";
  };
};
var outlineLevelOf = (paragraph, styles) => {
  var _paragraph$outlineLev;
  return (_paragraph$outlineLev = paragraph.outlineLevel) !== null && _paragraph$outlineLev !== void 0 ? _paragraph$outlineLev : styleOutlineLevelOf(paragraph.styleId, styles);
};
var levelIn = (properties, paragraph, styles) => {
  var _styles$get2;
  const { entriesFromBookmark, headingStyleRange, stylesWithLevels = [], useAppliedParagraphOutlineLevel } = properties;
  if (paragraph.text.trim() === "" || entriesFromBookmark && !paragraph.bookmarks.has(entriesFromBookmark)) return;
  const names = [paragraph.styleId, paragraph.styleId === void 0 ? void 0 : (_styles$get2 = styles.get(paragraph.styleId)) === null || _styles$get2 === void 0 ? void 0 : _styles$get2.name].filter((name) => name !== void 0).map((name) => name.toLowerCase());
  const listed = stylesWithLevels.find((style) => names.includes(style.styleName.toLowerCase()));
  if (listed) return listed.level;
  const namesItsEntries = Boolean(headingStyleRange) || stylesWithLevels.length > 0 || Boolean(useAppliedParagraphOutlineLevel) || Boolean(properties.tcFieldIdentifier) || Boolean(properties.tcFieldLevelRange) || Boolean(properties.captionLabel) || Boolean(properties.captionLabelIncludingNumbers);
  const headingRange = headingStyleRange ? parseRange(headingStyleRange) : namesItsEntries ? void 0 : [1, 9];
  const heading = headingLevelOf(paragraph.styleId, styles);
  if (headingRange && heading !== void 0 && isWithin(heading, headingRange)) return heading;
  const outlineLevel = useAppliedParagraphOutlineLevel ? outlineLevelOf(paragraph, styles) : void 0;
  return outlineLevel !== void 0 && isWithin(outlineLevel + 1, headingRange !== null && headingRange !== void 0 ? headingRange : [1, 9]) ? outlineLevel + 1 : void 0;
};
var titleRunsOf = (title, properties) => {
  const text = properties.preserveTabInEntries ? title : title.replace(/\t/g, " ");
  return (properties.preserveNewLineInEntries ? text.split("\n") : [text.replace(/\n/g, " ")]).map((line, index) => new TextRun({
    break: index > 0 ? 1 : void 0,
    children: line.split("	").flatMap((part, partIndex) => [...partIndex > 0 ? [new Tab()] : [], ...part === "" ? [] : [part]])
  }));
};
var numberRunsOf = ({ text, separator }) => separator === "tab" ? [new TextRun(text), new TextRun({ children: [new Tab()] })] : [new TextRun(`${text} `)];
var numberTabStopOf = (level, width) => {
  const end = 240 * (level - 1) + width + 240;
  return end <= 1920 ? Math.ceil(end / 240) * 240 : Math.round(end);
};
var entryStyleOf = (level, styles) => {
  var _find$, _find;
  return (_find$ = (_find = [...styles].find(([, style]) => {
    var _style$name;
    return ((_style$name = style.name) === null || _style$name === void 0 ? void 0 : _style$name.toLowerCase()) === `toc ${level}`;
  })) === null || _find === void 0 ? void 0 : _find[0]) !== null && _find$ !== void 0 ? _find$ : `TOC${level}`;
};
var contentOf = ({ properties, beginDirty, textWidth, tabLeader }, entries, styles, context) => {
  var _parseRange;
  const withoutPageNumbers = properties.pageNumbersEntryLevelsRange ? (_parseRange = parseRange(properties.pageNumbersEntryLevelsRange)) !== null && _parseRange !== void 0 ? _parseRange : [1, 9] : void 0;
  const content = new StructuredDocumentTagContent();
  entries.forEach((entry, index) => {
    var _entry$listNumber;
    const hasPageNumber = withoutPageNumbers === void 0 || !isWithin(entry.level, withoutPageNumbers);
    const children = [
      ...entry.listNumber ? numberRunsOf(entry.listNumber) : [],
      ...titleRunsOf(entry.title, properties),
      ...hasPageNumber ? [new TextRun({ children: [properties.entryAndPageNumberSeparator || new Tab()] }), new PageReference(entry.bookmark, { hyperlink: properties.hyperlink })] : []
    ];
    content.addChildElement(new Paragraph({
      style: entryStyleOf(entry.level, styles),
      tabStops: [...((_entry$listNumber = entry.listNumber) === null || _entry$listNumber === void 0 ? void 0 : _entry$listNumber.separator) === "tab" ? [{
        type: "left",
        position: numberTabStopOf(entry.level, entry.listNumber.width)
      }] : [], {
        type: "right",
        position: textWidth,
        leader: tabLeader
      }],
      children: [...index === 0 ? [new Run({ children: [
        beginOf(beginDirty),
        new FieldInstruction(properties),
        createSeparate()
      ] })] : [], ...properties.hyperlink ? [new InternalHyperlink({
        anchor: entry.bookmark,
        children
      })] : children]
    }));
  });
  content.addChildElement(new Paragraph({ children: [new Run({ children: [createEnd()] })] }));
  return content.prepForXml(context);
};
var bookmark = (paragraph, name, id, context) => {
  const children = childrenOf$1(paragraph);
  const start = children.findIndex((child2) => nameOf$4(child2) === "w:pPr") + 1;
  paragraph["w:p"] = [
    ...children.slice(0, start),
    new BookmarkStart(name, id).prepForXml(context),
    ...children.slice(start),
    new BookmarkEnd(id).prepForXml(context)
  ];
};
var fillTablesOfContents = (body, context, bookmarkIds, listNumbersOf) => {
  const blocks = blocksOf(childrenOf$1(body));
  const tables = blocks.flatMap((block) => {
    const options = writtenTables.get(block);
    return options ? [[block, options]] : [];
  });
  if (tables.length === 0) return;
  const styles = stylesOf(context);
  const followBookmarks = tables.some(([, { properties }]) => Boolean(properties.entriesFromBookmark));
  const headings = paragraphDetailsOf(blocks.filter((block) => nameOf$4(block) === "w:p"), followBookmarks).map((paragraph) => ({
    paragraph,
    levels: tables.map(([, { properties }]) => levelIn(properties, paragraph, styles))
  })).filter(({ levels }) => levels.some((level) => level !== void 0)).map((heading, index) => _objectSpread2(_objectSpread2({}, heading), {}, { id: bookmarkIds.get(index) }));
  for (const { paragraph, id } of headings) bookmark(paragraph.element, `_Toc${id}`, id, context);
  const listNumbers = headings.length > 0 ? listNumbersOf === null || listNumbersOf === void 0 ? void 0 : listNumbersOf(body) : void 0;
  tables.forEach(([table, options], index) => {
    const entries = headings.flatMap(({ paragraph, levels, id }) => {
      const level = levels[index];
      const listNumber = listNumbers === null || listNumbers === void 0 ? void 0 : listNumbers.get(`_Toc${id}`);
      return level === void 0 ? [] : [_objectSpread2({
        title: paragraph.text,
        level,
        bookmark: `_Toc${id}`
      }, listNumber ? { listNumber } : {})];
    });
    if (entries.length === 0) return;
    table["w:sdt"] = childrenOf$1(table).map((child2) => nameOf$4(child2) === "w:sdtContent" ? contentOf(options, entries, styles, context) : child2);
  });
};
var IDENTIFIER = new RegExp("^\\p{L}[\\p{L}\\p{N}_]*$", "u");
var sequenceOf = (switches) => {
  var _step, _format;
  let step;
  let hidden = false;
  let format2;
  let caseFormat = false;
  let picture = false;
  for (let index = 0; index < switches.length; index++) {
    var _switches, _next;
    const name = switches[index];
    const argument = (_switches = switches[index + 1]) !== null && _switches !== void 0 ? _switches : "";
    let next;
    if (index === 0 && !name.startsWith("\\")) next = { type: "bookmark" };
    else if (name === "\\c" || name === "\\n") next = { type: name === "\\c" ? "repeat" : "next" };
    else if ((name === "\\r" || name === "\\s") && /^\d+$/.test(argument)) {
      index++;
      next = name === "\\r" ? {
        type: "reset",
        to: Number(argument)
      } : {
        type: "heading",
        level: Number(argument)
      };
    } else if (name === "\\h") hidden = true;
    else if (name === "\\#" && index + 1 < switches.length) {
      index++;
      picture = true;
    } else if (name === "\\*" && index + 1 < switches.length) {
      const value = switches[++index];
      if (CASE_FORMATS.has(value.toLowerCase())) caseFormat = true;
      else if (!PLAIN_FORMATS.has(value.toLowerCase())) {
        if (format2 !== void 0) return;
        format2 = value;
      }
    } else return;
    if (next && step) return;
    step = (_next = next) !== null && _next !== void 0 ? _next : step;
  }
  if ((step === null || step === void 0 ? void 0 : step.type) === "bookmark" && switches.length > 1) return;
  const written = !picture && !(caseFormat && format2 !== void 0 && format2.toLowerCase() !== "arabic");
  return {
    step: (_step = step) !== null && _step !== void 0 ? _step : { type: "next" },
    hidden: hidden && format2 === void 0,
    format: written ? (_format = format2) !== null && _format !== void 0 ? _format : "ARABIC" : ""
  };
};
var sequenceFieldOf = (instruction) => {
  var _match$1$match;
  const match = new RegExp("^\\s*SEQ\\b(.*)$", "is").exec(instruction);
  if (!match) return;
  const [written, ...switches] = (_match$1$match = match[1].match(/"[^"]*"|\S+/g)) !== null && _match$1$match !== void 0 ? _match$1$match : [];
  if (written === void 0) return {};
  const identifier = written.replace(/^"(.*)"$/, "$1");
  return IDENTIFIER.test(identifier) ? {
    identifier,
    sequence: sequenceOf(switches)
  } : { identifier };
};
var isSequenceField = (instruction) => sequenceFieldOf(instruction) !== void 0;
var identifiersIn = (element) => {
  if (typeof element !== "object" || element === null) return [];
  if (Array.isArray(element)) return element.flatMap(identifiersIn);
  return Object.entries(element).flatMap(([name, content]) => {
    return [...(name === "w:instrText" && Array.isArray(content) ? content : name === "_attr" ? [content["w:instr"]] : []).flatMap((instruction) => {
      const field = typeof instruction === "string" ? sequenceFieldOf(instruction) : void 0;
      return (field === null || field === void 0 ? void 0 : field.identifier) === void 0 ? [] : [field.identifier.toLowerCase()];
    }), ...identifiersIn(content)];
  });
};
var identifiersInCommentsOf = (context) => {
  var _context$file;
  const comments = (_context$file = context.file) === null || _context$file === void 0 ? void 0 : _context$file.Comments;
  if (!comments) return /* @__PURE__ */ new Set();
  const wrapper = {
    View: comments,
    Relationships: comments.Relationships
  };
  return new Set(identifiersIn(comments.prepForXml(_objectSpread2(_objectSpread2({}, context), {}, {
    viewWrapper: wrapper,
    stack: []
  }))));
};
var sequenceNumbering = (context) => {
  const levelOf = headingLevels(context);
  const numbers = /* @__PURE__ */ new Map();
  const counted = /* @__PURE__ */ new Map();
  const headingsAt = [];
  let unclearAt = -1;
  let paragraph = -1;
  let unknown;
  const afterHeading = (key, level) => {
    var _counted$get;
    const headingAt = Math.max(-1, ...headingsAt.slice(1, level + 1).filter((at) => at !== void 0));
    const since = ((_counted$get = counted.get(key)) !== null && _counted$get !== void 0 ? _counted$get : []).filter((field) => field.paragraph >= headingAt);
    const followed = since.every(({ step }) => (step === null || step === void 0 ? void 0 : step.type) === "next" || (step === null || step === void 0 ? void 0 : step.type) === "heading" && step.level === level);
    return unclearAt > headingAt || !followed ? void 0 : since.length + 1;
  };
  return {
    startParagraph: (element) => {
      paragraph++;
      const level = levelOf(element);
      if (level === "unclear") unclearAt = paragraph;
      else if (level !== void 0) headingsAt[level] = paragraph;
    },
    numberOf: (instruction, place) => {
      var _unknown, _counted$get2, _numberWriterOf;
      const { identifier, sequence } = sequenceFieldOf(instruction);
      if (identifier === void 0 || place === "fallback") return;
      (_unknown = unknown) !== null && _unknown !== void 0 || (unknown = identifiersInCommentsOf(context));
      const key = identifier.toLowerCase();
      if ((sequence === null || sequence === void 0 ? void 0 : sequence.step.type) === "bookmark" && place === "counted" && !unknown.has(key)) return;
      const before = numbers.has(key) ? numbers.get(key) : 0;
      const step = unknown.has(key) || place === "deleted" ? void 0 : sequence === null || sequence === void 0 ? void 0 : sequence.step;
      const value = (step === null || step === void 0 ? void 0 : step.type) === "reset" ? step.to : (step === null || step === void 0 ? void 0 : step.type) === "repeat" ? before : (step === null || step === void 0 ? void 0 : step.type) === "heading" ? afterHeading(key, step.level) : (step === null || step === void 0 ? void 0 : step.type) === "next" && before !== void 0 ? before + 1 : void 0;
      numbers.set(key, value);
      counted.set(key, [...(_counted$get2 = counted.get(key)) !== null && _counted$get2 !== void 0 ? _counted$get2 : [], _objectSpread2({ paragraph }, value === void 0 ? {} : { step })]);
      return value === void 0 || sequence === void 0 ? void 0 : sequence.hidden ? "" : (_numberWriterOf = numberWriterOf(sequence.format)) === null || _numberWriterOf === void 0 ? void 0 : _numberWriterOf(value);
    }
  };
};
var nameOf$3 = (element) => {
  const name = typeof element === "object" && element !== null && !Array.isArray(element) ? Object.keys(element)[0] : void 0;
  return name === "_attr" ? void 0 : name;
};
var textElement = (text) => ({ "w:t": [{ _attr: { "xml:space": "preserve" } }, text] });
var FORMATTED = {
  nameOf: nameOf$3,
  contentOf: (element) => {
    const content = element[nameOf$3(element)];
    return Array.isArray(content) ? content : void 0;
  },
  attributeOf: (element, attribute2) => {
    var _holder$_attr;
    const content = element[nameOf$3(element)];
    const holder = Array.isArray(content) ? content.find((child2) => typeof child2 === "object" && child2 !== null && "_attr" in child2) : content;
    return holder === null || holder === void 0 || (_holder$_attr = holder._attr) === null || _holder$_attr === void 0 ? void 0 : _holder$_attr[attribute2];
  },
  textOf: (element) => FORMATTED.contentOf(element).filter((part) => typeof part === "string").join(""),
  textElement,
  writeClean: (begin) => {
    if (isDirtyWithoutPageNumbers(begin)) {
      const attributes = begin["w:fldChar"]._attr;
      begin["w:fldChar"] = { _attr: Object.fromEntries(Object.entries(attributes).filter(([key]) => key !== "w:dirty")) };
    }
  },
  setSimpleFieldResult: (element, text) => {
    const content = element["w:fldSimple"];
    element["w:fldSimple"] = [...(Array.isArray(content) ? content : [content]).filter((child2) => typeof child2 === "object" && child2 !== null && "_attr" in child2), { "w:r": [textElement(text)] }];
  }
};
var estimates = /* @__PURE__ */ new WeakMap();
var fillSequenceNumbers = (body, context) => {
  const { startParagraph, numberOf } = sequenceNumbering(context);
  fillSequenceFields(FORMATTED, body, {
    beforeParagraph: (paragraph) => startParagraph(paragraph),
    resultOf: (instruction, within) => isSequenceField(instruction) ? numberOf(instruction, within) : void 0
  });
};
var fillPageNumbers = (body, context, estimator) => {
  const estimate = estimator(body, context);
  const partPageCounts = fillBodyFields(FORMATTED, body, estimate, { blank: false });
  if (context.file) estimates.set(context.file, {
    estimate,
    partPageCounts
  });
};
var fillPartPageNumbers = (part, context, referenceId) => {
  const written = context.file && estimates.get(context.file);
  if (!part || !written) return;
  const sectionPageCount = referenceId === void 0 ? void 0 : written.partPageCounts.get(`rId${referenceId}`);
  const notes = "w:footnotes" in part || "w:endnotes" in part;
  fillPartFields(FORMATTED, part, written.estimate, {
    blank: false,
    sectionPageCount,
    notes
  });
};
var RelationshipsAttributes = class extends XmlAttributeComponent {
  constructor(..._args) {
    super(..._args);
    _defineProperty(this, "xmlKeys", { xmlns: "xmlns" });
  }
};
var Relationships = class Relationships2 extends XmlComponent {
  constructor() {
    super("Relationships");
    this.root.push(new RelationshipsAttributes({ xmlns: "http://schemas.openxmlformats.org/package/2006/relationships" }));
  }
  /**
  * Creates a new relationship to another part in the package.
  *
  * @param id - Unique identifier for this relationship (will be prefixed with "rId")
  * @param type - Relationship type URI (e.g., image, header, hyperlink)
  * @param target - Path to the target part
  * @param targetMode - Optional mode indicating if target is external
  */
  addRelationship(id, type, target, targetMode) {
    this.root.push(createRelationship(`rId${id}`, type, target, targetMode));
  }
  /**
  * Creates a copy of the relationships given. Relationships added to the copy aren't added to them, so the compiler
  * adds the ones it writes for a part, such as to its images, to a copy, and packing a document again doesn't add
  * them a second time.
  *
  * Static, as `IContext` is public and has `Relationships`, so a new instance member would change the public API.
  *
  * @param relationships - The relationships to copy
  */
  static copy(relationships) {
    const copy = new Relationships2();
    copy.root.push(...relationships.root.slice(1));
    return copy;
  }
  /**
  * Gets the count of relationships in this collection.
  * Excludes the attributes element from the count.
  */
  get RelationshipCount() {
    return this.root.length - 1;
  }
};
var CommentAttributes = class extends XmlAttributeComponent {
  constructor(..._args) {
    super(..._args);
    _defineProperty(this, "xmlKeys", {
      id: "w:id",
      initials: "w:initials",
      author: "w:author",
      date: "w:date"
    });
  }
};
var CommentRangeAttributes = class extends XmlAttributeComponent {
  constructor(..._args2) {
    super(..._args2);
    _defineProperty(this, "xmlKeys", { id: "w:id" });
  }
};
var RootCommentsAttributes = class extends XmlAttributeComponent {
  constructor(..._args3) {
    super(..._args3);
    _defineProperty(this, "xmlKeys", {
      "xmlns:wpc": "xmlns:wpc",
      "xmlns:cx": "xmlns:cx",
      "xmlns:cx1": "xmlns:cx1",
      "xmlns:cx2": "xmlns:cx2",
      "xmlns:cx3": "xmlns:cx3",
      "xmlns:cx4": "xmlns:cx4",
      "xmlns:cx5": "xmlns:cx5",
      "xmlns:cx6": "xmlns:cx6",
      "xmlns:cx7": "xmlns:cx7",
      "xmlns:cx8": "xmlns:cx8",
      "xmlns:mc": "xmlns:mc",
      "xmlns:aink": "xmlns:aink",
      "xmlns:am3d": "xmlns:am3d",
      "xmlns:o": "xmlns:o",
      "xmlns:r": "xmlns:r",
      "xmlns:m": "xmlns:m",
      "xmlns:v": "xmlns:v",
      "xmlns:wp14": "xmlns:wp14",
      "xmlns:wp": "xmlns:wp",
      "xmlns:w10": "xmlns:w10",
      "xmlns:w": "xmlns:w",
      "xmlns:w14": "xmlns:w14",
      "xmlns:w15": "xmlns:w15",
      "xmlns:w16cex": "xmlns:w16cex",
      "xmlns:w16cid": "xmlns:w16cid",
      "xmlns:w16": "xmlns:w16",
      "xmlns:w16sdtdh": "xmlns:w16sdtdh",
      "xmlns:w16se": "xmlns:w16se",
      "xmlns:wpg": "xmlns:wpg",
      "xmlns:wpi": "xmlns:wpi",
      "xmlns:wne": "xmlns:wne",
      "xmlns:wps": "xmlns:wps",
      "mc:Ignorable": "mc:Ignorable"
    });
  }
};
var CommentRangeStart = class extends XmlComponent {
  constructor(id) {
    super("w:commentRangeStart");
    this.root.push(new CommentRangeAttributes({ id }));
  }
};
var CommentRangeEnd = class extends XmlComponent {
  constructor(id) {
    super("w:commentRangeEnd");
    this.root.push(new CommentRangeAttributes({ id }));
  }
};
var CommentReference = class extends XmlComponent {
  constructor(id) {
    super("w:commentReference");
    this.root.push(new CommentRangeAttributes({ id }));
  }
};
var Comment = class extends XmlComponent {
  constructor({ id, initials, author, date = /* @__PURE__ */ new Date(), children }, paraId) {
    super("w:comment");
    _defineProperty(this, "paraId", void 0);
    this.paraId = paraId;
    this.root.push(new CommentAttributes({
      id,
      initials,
      author,
      date: date.toISOString()
    }));
    for (const child2 of children) this.root.push(child2);
  }
  /**
  * Serializes this comment to XML, injecting w14:paraId and w14:textId into the last
  * paragraph when threading is active. These attributes link the comment to its
  * corresponding w15:commentEx entry in commentsExtended.xml.
  */
  prepForXml(context) {
    const result = super.prepForXml(context);
    if (!result || !this.paraId) return result;
    const commentChildren = result["w:comment"];
    if (!Array.isArray(commentChildren)) return result;
    for (let i2 = commentChildren.length - 1; i2 >= 0; i2--) {
      const child2 = commentChildren[i2];
      if (child2 && typeof child2 === "object" && "w:p" in child2) {
        const pChildren = child2["w:p"];
        if (Array.isArray(pChildren)) pChildren.unshift({ _attr: {
          "w14:paraId": this.paraId,
          "w14:textId": this.paraId
        } });
        break;
      }
    }
    return result;
  }
};
var commentIdToParaId = (id) => (id + 1).toString(16).toUpperCase().padStart(8, "0");
var Comments = class extends XmlComponent {
  constructor({ children }) {
    super("w:comments");
    _defineProperty(this, "relationships", void 0);
    _defineProperty(this, "threadData", void 0);
    _defineProperty(this, "commentIdsData", void 0);
    _defineProperty(this, "isEmpty", void 0);
    this.isEmpty = children.length === 0;
    this.root.push(new RootCommentsAttributes({
      "xmlns:wpc": "http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas",
      "xmlns:cx": "http://schemas.microsoft.com/office/drawing/2014/chartex",
      "xmlns:cx1": "http://schemas.microsoft.com/office/drawing/2015/9/8/chartex",
      "xmlns:cx2": "http://schemas.microsoft.com/office/drawing/2015/10/21/chartex",
      "xmlns:cx3": "http://schemas.microsoft.com/office/drawing/2016/5/9/chartex",
      "xmlns:cx4": "http://schemas.microsoft.com/office/drawing/2016/5/10/chartex",
      "xmlns:cx5": "http://schemas.microsoft.com/office/drawing/2016/5/11/chartex",
      "xmlns:cx6": "http://schemas.microsoft.com/office/drawing/2016/5/12/chartex",
      "xmlns:cx7": "http://schemas.microsoft.com/office/drawing/2016/5/13/chartex",
      "xmlns:cx8": "http://schemas.microsoft.com/office/drawing/2016/5/14/chartex",
      "xmlns:mc": "http://schemas.openxmlformats.org/markup-compatibility/2006",
      "xmlns:aink": "http://schemas.microsoft.com/office/drawing/2016/ink",
      "xmlns:am3d": "http://schemas.microsoft.com/office/drawing/2017/model3d",
      "xmlns:o": "urn:schemas-microsoft-com:office:office",
      "xmlns:r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
      "xmlns:m": "http://schemas.openxmlformats.org/officeDocument/2006/math",
      "xmlns:v": "urn:schemas-microsoft-com:vml",
      "xmlns:wp14": "http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing",
      "xmlns:wp": "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing",
      "xmlns:w10": "urn:schemas-microsoft-com:office:word",
      "xmlns:w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
      "xmlns:w14": "http://schemas.microsoft.com/office/word/2010/wordml",
      "xmlns:w15": "http://schemas.microsoft.com/office/word/2012/wordml",
      "xmlns:w16cex": "http://schemas.microsoft.com/office/word/2018/wordml/cex",
      "xmlns:w16cid": "http://schemas.microsoft.com/office/word/2016/wordml/cid",
      "xmlns:w16": "http://schemas.microsoft.com/office/word/2018/wordml",
      "xmlns:w16sdtdh": "http://schemas.microsoft.com/office/word/2020/wordml/sdtdatahash",
      "xmlns:w16se": "http://schemas.microsoft.com/office/word/2015/wordml/symex",
      "xmlns:wpg": "http://schemas.microsoft.com/office/word/2010/wordprocessingGroup",
      "xmlns:wpi": "http://schemas.microsoft.com/office/word/2010/wordprocessingInk",
      "xmlns:wne": "http://schemas.microsoft.com/office/word/2006/wordml",
      "xmlns:wps": "http://schemas.microsoft.com/office/word/2010/wordprocessingShape",
      "mc:Ignorable": "w14 w15 wp14"
    }));
    const hasThreading = children.some((child2) => child2.parentId !== void 0);
    const hasDurableIds = children.some((child2) => child2.durableId !== void 0);
    if (hasThreading || hasDurableIds) {
      const idToParaId = new Map(children.map((child2) => [child2.id, commentIdToParaId(child2.id)]));
      for (const child2 of children) this.root.push(new Comment(child2, idToParaId.get(child2.id)));
      if (hasThreading) this.threadData = children.map((child2) => ({
        paraId: idToParaId.get(child2.id),
        parentParaId: child2.parentId !== void 0 ? idToParaId.get(child2.parentId) : void 0,
        done: child2.resolved
      }));
      if (hasDurableIds) this.commentIdsData = children.map((child2) => {
        var _child$durableId;
        return {
          paraId: idToParaId.get(child2.id),
          durableId: (_child$durableId = child2.durableId) !== null && _child$durableId !== void 0 ? _child$durableId : idToParaId.get(child2.id)
        };
      });
    } else for (const child2 of children) this.root.push(new Comment(child2));
    this.relationships = new Relationships();
  }
  get Relationships() {
    return this.relationships;
  }
  /** Thread data for commentsExtended.xml, or undefined when no comments use parentId. */
  get ThreadData() {
    return this.threadData;
  }
  /** Comment id data for commentsIds.xml, or undefined when no comments carry a durableId. */
  get CommentIdsData() {
    return this.commentIdsData;
  }
  /** Whether there are no comments, in which case the document has no comments.xml part. */
  get IsEmpty() {
    return this.isEmpty;
  }
  /**
  * Formats the comments, with the page numbers worked out for their document written into their fields, when the
  * document's body is written with an estimate of its pages.
  */
  prepForXml(context) {
    const xml = super.prepForXml(context);
    fillPartPageNumbers(xml, context);
    return xml;
  }
};
var EditableRangeStartAttributes = class extends XmlAttributeComponent {
  constructor(..._args) {
    super(..._args);
    _defineProperty(this, "xmlKeys", {
      id: "w:id",
      editorGroup: "w:edGrp"
    });
  }
};
var EditableRangeEndAttributes = class extends XmlAttributeComponent {
  constructor(..._args2) {
    super(..._args2);
    _defineProperty(this, "xmlKeys", { id: "w:id" });
  }
};
var EditableRangeStart = class extends XmlComponent {
  constructor(id) {
    super("w:permStart");
    this.root.push(new EditableRangeStartAttributes({
      id,
      editorGroup: "everyone"
    }));
  }
};
var EditableRangeEnd = class extends XmlComponent {
  constructor(id) {
    super("w:permEnd");
    this.root.push(new EditableRangeEndAttributes({ id }));
  }
};
var CommentsExtendedAttributes = class extends XmlAttributeComponent {
  constructor(..._args) {
    super(..._args);
    _defineProperty(this, "xmlKeys", {
      "xmlns:wpc": "xmlns:wpc",
      "xmlns:mc": "xmlns:mc",
      "xmlns:w15": "xmlns:w15",
      "mc:Ignorable": "mc:Ignorable"
    });
  }
};
var CommentExAttributes = class extends XmlAttributeComponent {
  constructor(..._args2) {
    super(..._args2);
    _defineProperty(this, "xmlKeys", {
      paraId: "w15:paraId",
      paraIdParent: "w15:paraIdParent",
      done: "w15:done"
    });
  }
};
var CommentEx = class extends XmlComponent {
  constructor(options) {
    super("w15:commentEx");
    this.root.push(new CommentExAttributes({
      paraId: options.paraId,
      paraIdParent: options.parentParaId,
      done: options.done !== void 0 ? options.done ? "1" : "0" : void 0
    }));
  }
};
var CommentsExtended = class extends XmlComponent {
  constructor(threadData) {
    super("w15:commentsEx");
    this.root.push(new CommentsExtendedAttributes({
      "xmlns:wpc": "http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas",
      "xmlns:mc": "http://schemas.openxmlformats.org/markup-compatibility/2006",
      "xmlns:w15": "http://schemas.microsoft.com/office/word/2012/wordml",
      "mc:Ignorable": "w15"
    }));
    for (const data of threadData) this.root.push(new CommentEx(data));
  }
};
var CommentIdAttributes = class extends XmlAttributeComponent {
  constructor(..._args3) {
    super(..._args3);
    _defineProperty(this, "xmlKeys", {
      paraId: "w16cid:paraId",
      durableId: "w16cid:durableId"
    });
  }
};
var CommentId = class extends XmlComponent {
  constructor(options) {
    super("w16cid:commentId");
    this.root.push(new CommentIdAttributes({
      paraId: options.paraId,
      durableId: options.durableId
    }));
  }
};
var CommentsIdsAttributes = class extends XmlAttributeComponent {
  constructor(..._args4) {
    super(..._args4);
    _defineProperty(this, "xmlKeys", {
      "xmlns:w16cid": "xmlns:w16cid",
      "xmlns:mc": "xmlns:mc",
      "mc:Ignorable": "mc:Ignorable"
    });
  }
};
var CommentsIds = class extends XmlComponent {
  constructor(commentIdsData) {
    super("w16cid:commentsIds");
    this.root.push(new CommentsIdsAttributes({
      "xmlns:w16cid": "http://schemas.microsoft.com/office/word/2016/wordml/cid",
      "xmlns:mc": "http://schemas.openxmlformats.org/markup-compatibility/2006",
      "mc:Ignorable": "w16cid"
    }));
    for (const data of commentIdsData) this.root.push(new CommentId(data));
  }
};
var NoBreakHyphen = class extends EmptyElement {
  constructor() {
    super("w:noBreakHyphen");
  }
};
var SoftHyphen = class extends EmptyElement {
  constructor() {
    super("w:softHyphen");
  }
};
var DayShort = class extends EmptyElement {
  constructor() {
    super("w:dayShort");
  }
};
var MonthShort = class extends EmptyElement {
  constructor() {
    super("w:monthShort");
  }
};
var YearShort = class extends EmptyElement {
  constructor() {
    super("w:yearShort");
  }
};
var DayLong = class extends EmptyElement {
  constructor() {
    super("w:dayLong");
  }
};
var MonthLong = class extends EmptyElement {
  constructor() {
    super("w:monthLong");
  }
};
var YearLong = class extends EmptyElement {
  constructor() {
    super("w:yearLong");
  }
};
var AnnotationReference = class extends EmptyElement {
  constructor() {
    super("w:annotationRef");
  }
};
var FootnoteReferenceElement = class extends EmptyElement {
  constructor() {
    super("w:footnoteRef");
  }
};
var EndnoteReference = class extends EmptyElement {
  constructor() {
    super("w:endnoteRef");
  }
};
var Separator = class extends EmptyElement {
  constructor() {
    super("w:separator");
  }
};
var ContinuationSeparator = class extends EmptyElement {
  constructor() {
    super("w:continuationSeparator");
  }
};
var PageNumberElement = class extends EmptyElement {
  constructor() {
    super("w:pgNum");
  }
};
var CarriageReturn = class extends EmptyElement {
  constructor() {
    super("w:cr");
  }
};
var Tab = class extends EmptyElement {
  constructor() {
    super("w:tab");
  }
};
var LastRenderedPageBreak = class extends EmptyElement {
  constructor() {
    super("w:lastRenderedPageBreak");
  }
};
var PositionalTabAlignment = {
  /** Left-aligned tab */
  LEFT: "left",
  /** Center-aligned tab */
  CENTER: "center",
  /** Right-aligned tab */
  RIGHT: "right"
};
var PositionalTabRelativeTo = {
  /** Position relative to margin */
  MARGIN: "margin",
  /** Position relative to indent */
  INDENT: "indent"
};
var PositionalTabLeader = {
  /** No leader character */
  NONE: "none",
  /** Dot leader (...) */
  DOT: "dot",
  /** Hyphen leader (---) */
  HYPHEN: "hyphen",
  /** Underscore leader (___) */
  UNDERSCORE: "underscore",
  /** Middle dot leader (···) */
  MIDDLE_DOT: "middleDot"
};
var PositionalTabAttributes = class extends XmlAttributeComponent {
  constructor(..._args) {
    super(..._args);
    _defineProperty(this, "xmlKeys", {
      alignment: "w:alignment",
      relativeTo: "w:relativeTo",
      leader: "w:leader"
    });
  }
};
var PositionalTab = class extends XmlComponent {
  constructor(options) {
    super("w:ptab");
    this.root.push(new PositionalTabAttributes({
      alignment: options.alignment,
      relativeTo: options.relativeTo,
      leader: options.leader
    }));
  }
};
var BreakType = {
  /** Column break - text continues at the beginning of the next column */
  COLUMN: "column",
  /** Page break - text continues at the beginning of the next page */
  PAGE: "page"
};
var Break = class extends XmlComponent {
  constructor(type) {
    super("w:br");
    this.root.push(new Attributes({ type }));
  }
};
var PageBreak = class extends Run {
  constructor() {
    super({});
    this.root.push(new Break(BreakType.PAGE));
  }
};
var ColumnBreak = class extends Run {
  constructor() {
    super({});
    this.root.push(new Break(BreakType.COLUMN));
  }
};
var PageBreakBefore = class extends XmlComponent {
  constructor() {
    super("w:pageBreakBefore");
  }
};
var LineRuleType = {
  /** Line spacing is at least the specified value */
  AT_LEAST: "atLeast",
  /** Writes `exactly`, which isn't a value the schema allows, so Word ignores it. Use {@link LineRuleType.EXACT} for an exact line height. */
  EXACTLY: "exactly",
  /** Line spacing is exactly the specified value */
  EXACT: "exact",
  /** Line spacing is automatically determined based on content */
  AUTO: "auto"
};
var createSpacing = ({ after, before, line, lineRule, beforeAutoSpacing, afterAutoSpacing }) => new BuilderElement({
  name: "w:spacing",
  attributes: {
    after: {
      key: "w:after",
      value: after
    },
    before: {
      key: "w:before",
      value: before
    },
    line: {
      key: "w:line",
      value: line
    },
    lineRule: {
      key: "w:lineRule",
      value: lineRule
    },
    beforeAutoSpacing: {
      key: "w:beforeAutospacing",
      value: beforeAutoSpacing
    },
    afterAutoSpacing: {
      key: "w:afterAutospacing",
      value: afterAutoSpacing
    }
  }
});
var HeadingLevel = {
  /** Heading 1 style */
  HEADING_1: "Heading1",
  /** Heading 2 style */
  HEADING_2: "Heading2",
  /** Heading 3 style */
  HEADING_3: "Heading3",
  /** Heading 4 style */
  HEADING_4: "Heading4",
  /** Heading 5 style */
  HEADING_5: "Heading5",
  /** Heading 6 style */
  HEADING_6: "Heading6",
  /** Title style */
  TITLE: "Title"
};
var createParagraphStyle = (styleId) => new BuilderElement({
  name: "w:pStyle",
  attributes: { val: {
    key: "w:val",
    value: styleId
  } }
});
var TabStopType = {
  /** Left-aligned tab stop */
  LEFT: "left",
  /** Right-aligned tab stop */
  RIGHT: "right",
  /** Center-aligned tab stop */
  CENTER: "center",
  /** Bar tab stop - inserts a vertical bar at the position */
  BAR: "bar",
  /** Clears a tab stop at the specified position */
  CLEAR: "clear",
  /** Decimal-aligned tab stop - aligns on decimal point */
  DECIMAL: "decimal",
  /** End-aligned tab stop (right-to-left equivalent) */
  END: "end",
  /** List tab stop for numbered lists */
  NUM: "num",
  /** Start-aligned tab stop (left-to-right equivalent) */
  START: "start"
};
var LeaderType = {
  /** Dot leader (....) */
  DOT: "dot",
  /** Hyphen leader (----) */
  HYPHEN: "hyphen",
  /** Middle dot leader (····) */
  MIDDLE_DOT: "middleDot",
  /** No leader */
  NONE: "none",
  /** Underscore leader (____) */
  UNDERSCORE: "underscore"
};
var TabStopPosition = {
  /** Maximum tab stop position (right margin) */
  MAX: 9026
};
var createTabStopItem = ({ type, position, leader }) => new BuilderElement({
  name: "w:tab",
  attributes: {
    val: {
      key: "w:val",
      value: type
    },
    pos: {
      key: "w:pos",
      value: signedTwipsMeasureValue(position)
    },
    leader: {
      key: "w:leader",
      value: leader
    }
  }
});
var createTabStop = (tabDefinitions) => new BuilderElement({
  name: "w:tabs",
  children: tabDefinitions.map((tabDefinition) => createTabStopItem(tabDefinition))
});
var NumberProperties = class extends XmlComponent {
  constructor(numberId, indentLevel) {
    super("w:numPr");
    this.root.push(new IndentLevel(indentLevel));
    this.root.push(new NumberId(numberId));
  }
};
var IndentLevel = class extends XmlComponent {
  constructor(level) {
    super("w:ilvl");
    if (level > 9) throw new Error("Level cannot be greater than 9. Read more here: https://answers.microsoft.com/en-us/msoffice/forum/all/does-word-support-more-than-9-list-levels/d130fdcd-1781-446d-8c84-c6c79124e4d7");
    this.root.push(new Attributes({ val: level }));
  }
};
var NumberId = class extends XmlComponent {
  constructor(id) {
    super("w:numId");
    this.root.push(new Attributes({ val: typeof id === "string" ? `{${id}}` : id }));
  }
};
var FileChild = class extends XmlComponent {
  constructor(..._args) {
    super(..._args);
    _defineProperty(
      this,
      /** Marker property identifying this as a FileChild */
      "fileChild",
      /* @__PURE__ */ Symbol()
    );
  }
};
var HyperlinkAttributes = class extends XmlAttributeComponent {
  constructor(..._args) {
    super(..._args);
    _defineProperty(this, "xmlKeys", {
      id: "r:id",
      history: "w:history",
      anchor: "w:anchor"
    });
  }
};
var HyperlinkType = {
  /** Internal hyperlink to a bookmark within the document */
  INTERNAL: "INTERNAL",
  /** External hyperlink to a URL outside the document */
  EXTERNAL: "EXTERNAL"
};
var ConcreteHyperlink = class extends XmlComponent {
  /**
  * @param children - Inline content of the hyperlink
  * @param relationshipId - Id of the external relationship, without the rId prefix
  * @param anchor - Bookmark name or external URL fragment
  * @param externalLink - The full address of an external hyperlink, so the relationship id is kept alongside its anchor
  */
  constructor(children, relationshipId, anchor, externalLink) {
    super("w:hyperlink");
    _defineProperty(this, "linkId", void 0);
    _defineProperty(this, "drawingLink", void 0);
    this.linkId = relationshipId;
    this.drawingLink = anchor && externalLink !== void 0 ? new DrawingLink(externalLink) : void 0;
    const attributes = new HyperlinkAttributes({
      history: 1,
      anchor: anchor ? anchor : void 0,
      id: !anchor || externalLink !== void 0 ? `rId${this.linkId}` : void 0
    });
    this.root.push(attributes);
    children.forEach((child2) => {
      this.root.push(child2);
    });
  }
  /**
  * Creates the `a:hlinkClick` of a picture in the hyperlink, which links to the same address.
  *
  * The hyperlink decides which relationship its pictures use, rather than the pictures reading `linkId`, because only it
  * knows whether that relationship has lost the fragment to `w:anchor`. The picture's relationship is added as the
  * picture is written, through the context's relationships, so it lands in the part the picture is in, both when
  * packing and when patching.
  *
  * @param context - The context the picture is written in, whose relationships get the picture's link if it has its own
  * @param declareNamespace - Declares the DrawingML namespace, for elements outside `a:graphic` such as `wp:docPr`
  */
  createDrawingClick(context, declareNamespace) {
    if (!this.drawingLink) return createHyperlinkClick(this.linkId, declareNamespace);
    this.drawingLink.addRelationship(context);
    return this.drawingLink.createClick(declareNamespace);
  }
};
var InternalHyperlink = class extends ConcreteHyperlink {
  constructor(options) {
    super(options.children, uniqueId(), options.anchor);
  }
};
var ExternalHyperlink = class extends XmlComponent {
  constructor(options) {
    super("w:externalHyperlink");
    _defineProperty(this, "options", void 0);
    this.options = options;
  }
};
var BookmarkStartAttributes = class extends XmlAttributeComponent {
  constructor(..._args) {
    super(..._args);
    _defineProperty(this, "xmlKeys", {
      id: "w:id",
      name: "w:name"
    });
  }
};
var BookmarkEndAttributes = class extends XmlAttributeComponent {
  constructor(..._args2) {
    super(..._args2);
    _defineProperty(this, "xmlKeys", { id: "w:id" });
  }
};
var Bookmark = class Bookmark2 {
  constructor(options) {
    _defineProperty(this, "start", void 0);
    _defineProperty(this, "children", void 0);
    _defineProperty(this, "end", void 0);
    const linkId = bookmarkUniqueNumericId();
    this.start = new BookmarkStart(options.id, linkId);
    this.children = options.children;
    this.end = new BookmarkEnd(linkId);
  }
  /**
  * The components written in this bookmark's place: its start, its children and its end. A bookmark in its
  * children is written the same way, so one bookmark can hold another.
  *
  * @internal
  */
  get writtenAs() {
    return [
      this.start,
      ...this.children.flatMap((child2) => child2 instanceof Bookmark2 ? child2.writtenAs : [child2]),
      this.end
    ];
  }
};
var BookmarkStart = class extends XmlComponent {
  constructor(id, linkId) {
    super("w:bookmarkStart");
    const attributes = new BookmarkStartAttributes({
      name: id,
      id: linkId
    });
    this.root.push(attributes);
  }
};
var BookmarkEnd = class extends XmlComponent {
  constructor(linkId) {
    super("w:bookmarkEnd");
    const attributes = new BookmarkEndAttributes({ id: linkId });
    this.root.push(attributes);
  }
};
var NumberedItemReferenceFormat = (function(NumberedItemReferenceFormat2) {
  NumberedItemReferenceFormat2["NONE"] = "none";
  NumberedItemReferenceFormat2["RELATIVE"] = "relative";
  NumberedItemReferenceFormat2["NO_CONTEXT"] = "no_context";
  NumberedItemReferenceFormat2["FULL_CONTEXT"] = "full_context";
  return NumberedItemReferenceFormat2;
})({});
var SWITCH_MAP = {
  ["relative"]: "\\r",
  ["no_context"]: "\\n",
  ["full_context"]: "\\w",
  ["none"]: void 0
};
var NumberedItemReference = class extends SimpleField {
  constructor(bookmarkId, cachedValue, options = {}) {
    const { hyperlink = true, referenceFormat = "full_context" } = options;
    const instruction = `${`REF ${bookmarkId}`} ${[...hyperlink ? ["\\h"] : [], ...[SWITCH_MAP[referenceFormat]].filter((a) => !!a)].join(" ")}`;
    super(instruction, cachedValue);
  }
};
var createOutlineLevel = (level) => new BuilderElement({
  name: "w:outlineLvl",
  attributes: { val: {
    key: "w:val",
    value: level
  } }
});
var PageReferenceFieldInstruction = class extends XmlComponent {
  constructor(bookmarkId, options = {}) {
    super("w:instrText");
    this.root.push(new TextAttributes({ space: SpaceType.PRESERVE }));
    let instruction = `PAGEREF ${bookmarkId}`;
    if (options.hyperlink) instruction = `${instruction} \\h`;
    if (options.useRelativePosition) instruction = `${instruction} \\p`;
    this.root.push(instruction);
  }
};
var PageReference = class extends Run {
  constructor(bookmarkId, options = {}) {
    super({ children: [
      createBeginDirtyWithoutPageNumbers(),
      new PageReferenceFieldInstruction(bookmarkId, options),
      createSeparate(),
      createEnd()
    ] });
  }
};
var MAX_ANCHOR_LENGTH = 255;
var externalHyperlinkTarget = (link) => {
  const index = link.indexOf("#");
  const fragmentLength = link.length - index - 1;
  return index > 0 && fragmentLength > 0 && fragmentLength <= MAX_ANCHOR_LENGTH ? {
    target: link.slice(0, index),
    anchor: link.slice(index + 1)
  } : { target: link };
};
var listKey = (reference, instance, restartedListId) => restartedListId === void 0 ? `${reference}-${instance}` : `${reference}-restart ${restartedListId}`;
var CharacterSet = {
  ANSI: "00",
  DEFAULT: "01",
  SYMBOL: "02",
  MAC: "4D",
  JIS: "80",
  HANGUL: "81",
  JOHAB: "82",
  GB_2312: "86",
  CHINESEBIG5: "88",
  GREEK: "A1",
  TURKISH: "A2",
  VIETNAMESE: "A3",
  HEBREW: "B1",
  ARABIC: "B2",
  BALTIC: "BA",
  RUSSIAN: "CC",
  THAI: "DE",
  EASTEUROPE: "EE",
  OEM: "FF"
};
var createFontRelationship = ({ id, fontKey, subsetted }, name) => new BuilderElement({
  name,
  attributes: _objectSpread2({ id: {
    key: "r:id",
    value: id
  } }, fontKey ? { fontKey: {
    key: "w:fontKey",
    value: `{${fontKey.toUpperCase()}}`
  } } : {}),
  children: [...subsetted ? [new OnOffElement("w:subsetted", subsetted)] : []]
});
var createFont = ({ name, altName, panose1, charset, family, notTrueType, pitch, sig, embedRegular, embedBold, embedItalic, embedBoldItalic }) => new BuilderElement({
  name: "w:font",
  attributes: { name: {
    key: "w:name",
    value: name
  } },
  children: [
    ...altName ? [createStringElement("w:altName", altName)] : [],
    ...panose1 ? [createStringElement("w:panose1", panose1)] : [],
    ...charset ? [createStringElement("w:charset", charset)] : [],
    ...family ? [createStringElement("w:family", family)] : [],
    ...notTrueType ? [new OnOffElement("w:notTrueType", notTrueType)] : [],
    ...pitch ? [createStringElement("w:pitch", pitch)] : [],
    ...sig ? [new BuilderElement({
      name: "w:sig",
      attributes: {
        usb0: {
          key: "w:usb0",
          value: sig.usb0
        },
        usb1: {
          key: "w:usb1",
          value: sig.usb1
        },
        usb2: {
          key: "w:usb2",
          value: sig.usb2
        },
        usb3: {
          key: "w:usb3",
          value: sig.usb3
        },
        csb0: {
          key: "w:csb0",
          value: sig.csb0
        },
        csb1: {
          key: "w:csb1",
          value: sig.csb1
        }
      }
    })] : [],
    ...embedRegular ? [createFontRelationship(embedRegular, "w:embedRegular")] : [],
    ...embedBold ? [createFontRelationship(embedBold, "w:embedBold")] : [],
    ...embedItalic ? [createFontRelationship(embedItalic, "w:embedItalic")] : [],
    ...embedBoldItalic ? [createFontRelationship(embedBoldItalic, "w:embedBoldItalic")] : []
  ]
});
var createEmbeddedFont = ({ name, characterSet, embedRegular, embedBold, embedItalic, embedBoldItalic }) => createFont({
  name,
  sig: {
    usb0: "E0002AFF",
    usb1: "C000247B",
    usb2: "00000009",
    usb3: "00000000",
    csb0: "000001FF",
    csb1: "00000000"
  },
  charset: characterSet,
  family: "auto",
  pitch: "variable",
  embedRegular,
  embedBold,
  embedItalic,
  embedBoldItalic
});
var createFontTable = (fonts) => new BuilderElement({
  name: "w:fonts",
  attributes: {
    mc: {
      key: "xmlns:mc",
      value: "http://schemas.openxmlformats.org/markup-compatibility/2006"
    },
    r: {
      key: "xmlns:r",
      value: "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
    },
    w: {
      key: "xmlns:w",
      value: "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
    },
    w14: {
      key: "xmlns:w14",
      value: "http://schemas.microsoft.com/office/word/2010/wordml"
    },
    w15: {
      key: "xmlns:w15",
      value: "http://schemas.microsoft.com/office/word/2012/wordml"
    },
    w16cex: {
      key: "xmlns:w16cex",
      value: "http://schemas.microsoft.com/office/word/2018/wordml/cex"
    },
    w16cid: {
      key: "xmlns:w16cid",
      value: "http://schemas.microsoft.com/office/word/2016/wordml/cid"
    },
    w16: {
      key: "xmlns:w16",
      value: "http://schemas.microsoft.com/office/word/2018/wordml"
    },
    w16sdtdh: {
      key: "xmlns:w16sdtdh",
      value: "http://schemas.microsoft.com/office/word/2020/wordml/sdtdatahash"
    },
    w16se: {
      key: "xmlns:w16se",
      value: "http://schemas.microsoft.com/office/word/2015/wordml/symex"
    },
    Ignorable: {
      key: "mc:Ignorable",
      value: "w14 w15 w16se w16cid w16 w16cex w16sdtdh"
    }
  },
  children: fonts.map(createEmbeddedFont)
});
var FACES = [
  {
    option: "data",
    element: "embedRegular",
    bold: false,
    italic: false
  },
  {
    option: "bold",
    element: "embedBold",
    bold: true,
    italic: false
  },
  {
    option: "italic",
    element: "embedItalic",
    bold: false,
    italic: true
  },
  {
    option: "boldItalic",
    element: "embedBoldItalic",
    bold: true,
    italic: true
  }
];
var FontWrapper = class {
  constructor(options) {
    _defineProperty(this, "options", void 0);
    _defineProperty(this, "fontTable", void 0);
    _defineProperty(this, "relationships", void 0);
    _defineProperty(
      this,
      /** @deprecated Use `files`, which has the file and key of each face a font embeds, not only the regular face's key */
      "fontOptionsWithKey",
      []
    );
    _defineProperty(
      this,
      /** The files of the faces the fonts embed, in order: the Nth is `fonts/font<N>.odttf`, with the relationship `rId<N>` */
      "files",
      []
    );
    this.options = options;
    const faces = options.map((font) => FACES.flatMap(({ option, element, bold, italic }) => {
      const data = font[option];
      return data ? [{
        element,
        file: {
          name: font.name,
          data,
          bold,
          italic,
          fontKey: uniqueUuid()
        }
      }] : [];
    }));
    this.files = faces.flatMap((ofFont) => ofFont.map(({ file }) => file));
    this.fontOptionsWithKey = options.map((font, index) => _objectSpread2(_objectSpread2({}, font), {}, { fontKey: faces[index][0].file.fontKey }));
    this.fontTable = createFontTable(options.map((font, index) => _objectSpread2({
      name: font.name,
      characterSet: font.characterSet
    }, Object.fromEntries(faces[index].map(({ element, file }) => [element, {
      id: `rId${this.files.indexOf(file) + 1}`,
      fontKey: file.fontKey
    }])))));
    this.relationships = new Relationships();
    for (let i2 = 0; i2 < this.files.length; i2++) this.relationships.addRelationship(i2 + 1, "http://schemas.openxmlformats.org/officeDocument/2006/relationships/font", `fonts/font${i2 + 1}.odttf`);
  }
  get View() {
    return this.fontTable;
  }
  get Relationships() {
    return this.relationships;
  }
};
var createWordWrap = () => new BuilderElement({
  name: "w:wordWrap",
  attributes: { val: {
    key: "w:val",
    value: 0
  } }
});
var DropCapType = {
  /** No drop cap effect */
  NONE: "none",
  /** Drop cap that drops down into the paragraph text */
  DROP: "drop",
  /** Drop cap that extends into the margin */
  MARGIN: "margin"
};
var FrameAnchorType = {
  /** Anchor relative to the page margin */
  MARGIN: "margin",
  /** Anchor relative to the page edge */
  PAGE: "page",
  /** Anchor relative to the text column */
  TEXT: "text"
};
var FrameWrap = {
  /** Wrap text around the frame on all sides */
  AROUND: "around",
  /** Automatic wrapping based on available space */
  AUTO: "auto",
  /** No text wrapping */
  NONE: "none",
  /** Do not allow text beside the frame */
  NOT_BESIDE: "notBeside",
  /** Allow text to flow through the frame */
  THROUGH: "through",
  /** Wrap text tightly around the frame */
  TIGHT: "tight"
};
var createFrameProperties = (options) => {
  var _options$space, _options$space2;
  return new BuilderElement({
    name: "w:framePr",
    attributes: {
      anchorLock: {
        key: "w:anchorLock",
        value: options.anchorLock
      },
      dropCap: {
        key: "w:dropCap",
        value: options.dropCap
      },
      width: {
        key: "w:w",
        value: options.width
      },
      height: {
        key: "w:h",
        value: options.height
      },
      x: {
        key: "w:x",
        value: options.position ? options.position.x : void 0
      },
      y: {
        key: "w:y",
        value: options.position ? options.position.y : void 0
      },
      anchorHorizontal: {
        key: "w:hAnchor",
        value: options.anchor.horizontal
      },
      anchorVertical: {
        key: "w:vAnchor",
        value: options.anchor.vertical
      },
      spaceHorizontal: {
        key: "w:hSpace",
        value: (_options$space = options.space) === null || _options$space === void 0 ? void 0 : _options$space.horizontal
      },
      spaceVertical: {
        key: "w:vSpace",
        value: (_options$space2 = options.space) === null || _options$space2 === void 0 ? void 0 : _options$space2.vertical
      },
      rule: {
        key: "w:hRule",
        value: options.rule
      },
      alignmentX: {
        key: "w:xAlign",
        value: options.alignment ? options.alignment.x : void 0
      },
      alignmentY: {
        key: "w:yAlign",
        value: options.alignment ? options.alignment.y : void 0
      },
      lines: {
        key: "w:lines",
        value: options.lines
      },
      wrap: {
        key: "w:wrap",
        value: options.wrap
      }
    }
  });
};
var currentRestartedLists = /* @__PURE__ */ new WeakMap();
var restartedListIds = uniqueNumericIdCreator();
var RIGHT_TO_LEFT_ALIGNMENTS = {
  left: "right",
  right: "left"
};
var ParagraphProperties = class extends IgnoreIfEmptyXmlComponent {
  /**
  * Creates paragraph properties.
  *
  * @param options - The paragraph formatting to emit
  * @param config - Controls how the element is assembled; see {@link IParagraphPropertiesConfig}
  */
  constructor(options, { implicitListParagraphStyle = true, inListOrder = true } = {}) {
    super("w:pPr", options === null || options === void 0 ? void 0 : options.includeIfEmpty);
    _defineProperty(this, "numbering", void 0);
    _defineProperty(
      this,
      /** The paragraph's `w:numPr`, which is written again with its list's id each time the paragraph is written */
      "numberProperties",
      void 0
    );
    if (!options) return this;
    if (options.heading) this.push(createParagraphStyle(options.heading));
    if (implicitListParagraphStyle) {
      if (options.bullet) this.push(createParagraphStyle("ListParagraph"));
      if (options.numbering && !options.numbering.custom && !options.style && !options.heading) this.push(createParagraphStyle("ListParagraph"));
    }
    if (options.style) this.push(createParagraphStyle(options.style));
    if (options.keepNext !== void 0) this.push(new OnOffElement("w:keepNext", options.keepNext));
    if (options.keepLines !== void 0) this.push(new OnOffElement("w:keepLines", options.keepLines));
    if (options.pageBreakBefore) this.push(new PageBreakBefore());
    if (options.frame) this.push(createFrameProperties(options.frame));
    if (options.widowControl !== void 0) this.push(new OnOffElement("w:widowControl", options.widowControl));
    if (options.bullet) this.push(new NumberProperties(1, options.bullet.level));
    if (options.numbering) {
      const { reference: list, instance, level, restart } = options.numbering;
      const reference = typeof list === "string" ? list : list.reference;
      const numberProperties = new NumberProperties(listKey(reference, instance !== null && instance !== void 0 ? instance : 0), level);
      this.numbering = {
        reference,
        level,
        instance,
        restartedListId: restart && inListOrder && instance === void 0 ? restartedListIds() : void 0,
        definition: typeof list === "string" ? void 0 : list
      };
      this.numberProperties = numberProperties;
      this.push(numberProperties);
    } else if (options.numbering === false) this.push(new NumberProperties(0, 0));
    if (options.border) this.push(new Border(options.border));
    if (options.thematicBreak) this.push(new ThematicBreak());
    if (options.shading) this.push(createShading(options.shading));
    if (options.wordWrap) this.push(createWordWrap());
    if (options.overflowPunctuation) this.push(new OnOffElement("w:overflowPunct", options.overflowPunctuation));
    const tabDefinitions = [
      ...options.rightTabStop !== void 0 ? [{
        type: TabStopType.RIGHT,
        position: options.rightTabStop
      }] : [],
      ...options.tabStops ? options.tabStops : [],
      ...options.leftTabStop !== void 0 ? [{
        type: TabStopType.LEFT,
        position: options.leftTabStop
      }] : []
    ];
    if (tabDefinitions.length > 0) this.push(createTabStop(tabDefinitions));
    if (options.bidirectional !== void 0) this.push(new OnOffElement("w:bidi", options.bidirectional));
    if (options.spacing) this.push(createSpacing(options.spacing));
    if (options.indent) this.push(createIndent(options.indent));
    if (options.contextualSpacing !== void 0) this.push(new OnOffElement("w:contextualSpacing", options.contextualSpacing));
    if (options.alignment) this.push(createAlignment(options.bidirectional && RIGHT_TO_LEFT_ALIGNMENTS[options.alignment] || options.alignment));
    if (options.outlineLevel !== void 0) this.push(createOutlineLevel(options.outlineLevel));
    if (options.suppressLineNumbers !== void 0) this.push(new OnOffElement("w:suppressLineNumbers", options.suppressLineNumbers));
    if (options.autoSpaceEastAsianText !== void 0) this.push(new OnOffElement("w:autoSpaceDN", options.autoSpaceEastAsianText));
    if (options.run) this.push(new ParagraphRunProperties(options.run));
    if (options.revision) this.push(new ParagraphPropertiesChange(options.revision));
  }
  /**
  * Adds a property element to the paragraph properties.
  *
  * @param item - The XML component to add to the paragraph properties
  */
  push(item) {
    this.root.push(item);
  }
  /**
  * Adds the section properties (`w:sectPr`) of the section this paragraph ends.
  *
  * They go after the paragraph's run properties and before its revision (`w:pPrChange`),
  * the order CT_PPr gives them.
  *
  * @param sectionProperties - The properties of the section the paragraph ends
  */
  addSectionProperties(sectionProperties) {
    const revisionIndex = this.root.findIndex((item) => item instanceof ParagraphPropertiesChange);
    if (revisionIndex === -1) {
      this.root.push(sectionProperties);
      return;
    }
    this.root.splice(revisionIndex, 0, sectionProperties);
  }
  /**
  * Removes the section properties added with {@link addSectionProperties}.
  *
  * @param sectionProperties - The properties of the section to remove
  */
  removeSectionProperties(sectionProperties) {
    const index = this.root.indexOf(sectionProperties);
    if (index !== -1) this.root.splice(index, 1);
  }
  /**
  * Prepares the paragraph properties for XML serialization.
  *
  * This method works out which list instance a numbered paragraph is in, from where it is in its part when it
  * leaves out `instance`, and creates the concrete numbering instance for it before the properties are converted to XML.
  *
  * @param context - The XML context containing document and file information
  * @returns The prepared XML object, or undefined if the component should be ignored
  */
  prepForXml(context) {
    var _this$numbering;
    if (this.numbering) {
      var _this$numbering$resta, _currentRestartedList;
      const { reference, level, instance = 0, definition } = this.numbering;
      const restartedListId = this.numbering.instance === void 0 ? (_this$numbering$resta = this.numbering.restartedListId) !== null && _this$numbering$resta !== void 0 ? _this$numbering$resta : (_currentRestartedList = currentRestartedLists.get(context)) === null || _currentRestartedList === void 0 ? void 0 : _currentRestartedList.get(reference) : void 0;
      if (!(context.viewWrapper instanceof FontWrapper)) context.file.Numbering.createConcreteNumberingInstance(reference, instance, definition, restartedListId);
      const numberProperties = new NumberProperties(listKey(reference, instance, restartedListId), level);
      this.root.splice(this.root.indexOf(this.numberProperties), 1, numberProperties);
      this.numberProperties = numberProperties;
    }
    const result = super.prepForXml(context);
    if (((_this$numbering = this.numbering) === null || _this$numbering === void 0 ? void 0 : _this$numbering.restartedListId) !== void 0) {
      var _currentRestartedList2;
      currentRestartedLists.set(context, new Map([...(_currentRestartedList2 = currentRestartedLists.get(context)) !== null && _currentRestartedList2 !== void 0 ? _currentRestartedList2 : [], [this.numbering.reference, this.numbering.restartedListId]]));
    }
    return result;
  }
};
var ParagraphPropertiesChange = class extends XmlComponent {
  constructor(options) {
    super("w:pPrChange");
    this.root.push(new ChangeAttributes({
      id: options.id,
      author: options.author,
      date: options.date
    }));
    this.root.push(new ParagraphProperties(_objectSpread2(_objectSpread2({}, options), {}, { includeIfEmpty: true }), { inListOrder: false }));
  }
};
var Paragraph = class Paragraph2 extends FileChild {
  constructor(options) {
    super("w:p");
    _defineProperty(
      this,
      /** The options the paragraph was made with. A paragraph made from a string has it as its `text` */
      "options",
      void 0
    );
    _defineProperty(this, "properties", void 0);
    _defineProperty(this, "alignment", void 0);
    this.options = typeof options === "string" ? { text: options } : options;
    if (typeof options === "string") {
      this.alignment = {};
      this.properties = new ParagraphProperties({});
      this.root.push(this.properties);
      this.root.push(new TextRun(options));
      return this;
    }
    this.alignment = {
      alignment: options.alignment,
      bidirectional: options.bidirectional
    };
    this.properties = new ParagraphProperties(options);
    this.root.push(this.properties);
    if (options.text) this.root.push(new TextRun(options.text));
    if (options.children) for (const child2 of options.children) {
      if (child2 instanceof Bookmark) {
        this.root.push(...child2.writtenAs);
        continue;
      }
      this.root.push(child2);
    }
  }
  prepForXml(context) {
    for (const element of this.root) if (elementOf(element) === "w:externalHyperlink") {
      const index = this.root.indexOf(element);
      const { options } = element;
      const { target, anchor } = externalHyperlinkTarget(options.link);
      const concreteHyperlink = new ConcreteHyperlink(options.children, uniqueId(), anchor, options.link);
      context.viewWrapper.Relationships.addRelationship(concreteHyperlink.linkId, "http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink", target, TargetModeType.EXTERNAL);
      this.root[index] = concreteHyperlink;
    }
    return super.prepForXml(context);
  }
  /**
  * Ends a section at this paragraph by adding the section's properties to the paragraph's properties,
  * as Word does with the last paragraph of each section but the last.
  *
  * The body adds them only while it is written and removes them afterwards with
  * {@link removeSectionProperties}, so the same paragraph can be used in other documents.
  *
  * @internal
  * @param sectionProperties - The properties of the section the paragraph ends
  */
  addSectionProperties(sectionProperties) {
    this.properties.addSectionProperties(sectionProperties);
  }
  /**
  * Removes the section properties added with {@link addSectionProperties}.
  *
  * @internal
  * @param sectionProperties - The properties of the section to remove
  */
  removeSectionProperties(sectionProperties) {
    this.properties.removeSectionProperties(sectionProperties);
  }
  /**
  * The paragraph's alignment and direction, which a table gives the empty paragraphs of the cells it adds below a
  * cell merged down rows (`rowSpan`), so that the merged cell is aligned as one.
  *
  * @internal
  */
  get Alignment() {
    return this.alignment;
  }
  /**
  * Makes a new paragraph with the paragraph's options and these, which take the place of its own, such as to indent
  * the paragraphs a parser made. The paragraph itself is left as it is, and the new one has the same children.
  *
  * Each option given replaces the paragraph's whole option: to keep the rest of its spacing, give
  * `spacing: { ...paragraph.options.spacing, before: 240 }`. An option given as `undefined` is removed.
  *
  * @example
  * ```typescript
  * const indented = paragraphs.map((paragraph) => paragraph.with({ indent: { left: 720, right: 720 } }));
  * ```
  */
  with(options) {
    return new Paragraph2(_objectSpread2(_objectSpread2({}, this.options), options));
  }
  addRunToFront(run) {
    this.root.splice(1, 0, run);
    return this;
  }
};
var Math$1 = class extends XmlComponent {
  constructor(options) {
    super("m:oMath");
    for (const child2 of options.children) this.root.push(child2);
  }
};
var MathText = class extends XmlComponent {
  constructor(text) {
    super("m:t");
    if (/^[\s\u200B]|[\s\u200B]$/.test(text)) this.root.push(new TextAttributes({ space: SpaceType.PRESERVE }));
    this.root.push(text);
  }
};
var _excluded$3 = [
  "text",
  "normalText",
  "script",
  "literal"
];
var STYLES = {
  plain: "p",
  bold: "b",
  italic: "i",
  boldItalic: "bi"
};
var SCRIPTS = {
  roman: "roman",
  script: "script",
  fraktur: "fraktur",
  doubleStruck: "double-struck",
  sansSerif: "sans-serif",
  monospace: "monospace"
};
var createValueElement = (name, value) => new BuilderElement({
  name,
  attributes: { value: {
    key: "m:val",
    value
  } }
});
var MathRun = class extends XmlComponent {
  constructor(options) {
    var _rest$style;
    super("m:r");
    const _ref = typeof options === "string" ? { text: options } : options, { text, normalText, script, literal } = _ref;
    const style = (_rest$style = _objectWithoutProperties(_ref, _excluded$3).style) !== null && _rest$style !== void 0 ? _rest$style : script === void 0 || script === "roman" ? void 0 : "plain";
    if (normalText && (style !== void 0 || script !== void 0)) throw new Error("MathRun: normalText can't be given with style or script, which are for math. Give one or the other");
    if (style !== void 0 && !Object.keys(STYLES).includes(style)) throw new Error(`MathRun: style is "${style}", which isn't one of ${Object.keys(STYLES).join(", ")}`);
    if (script !== void 0 && !Object.keys(SCRIPTS).includes(script)) throw new Error(`MathRun: script is "${script}", which isn't one of ${Object.keys(SCRIPTS).join(", ")}`);
    const properties = [
      ...literal ? [createValueElement("m:lit", 1)] : [],
      ...normalText ? [createValueElement("m:nor", 1)] : [],
      ...script === void 0 ? [] : [createValueElement("m:scr", SCRIPTS[script])],
      ...style === void 0 ? [] : [createValueElement("m:sty", STYLES[style])]
    ];
    if (properties.length > 0) this.root.push(new BuilderElement({
      name: "m:rPr",
      children: properties
    }));
    this.root.push(new MathText(text));
  }
};
var MathDenominator = class extends XmlComponent {
  constructor(children) {
    super("m:den");
    for (const child2 of children) this.root.push(child2);
  }
};
var MathNumerator = class extends XmlComponent {
  constructor(children) {
    super("m:num");
    for (const child2 of children) this.root.push(child2);
  }
};
var TYPES = {
  stacked: "bar",
  skewed: "skw",
  linear: "lin",
  noBar: "noBar"
};
var MathFraction = class extends XmlComponent {
  constructor(options) {
    super("m:f");
    if (options.type !== void 0) {
      if (!Object.keys(TYPES).includes(options.type)) throw new Error(`MathFraction: type is "${options.type}", which isn't one of ${Object.keys(TYPES).join(", ")}`);
      this.root.push(new BuilderElement({
        name: "m:fPr",
        children: [new BuilderElement({
          name: "m:type",
          attributes: { value: {
            key: "m:val",
            value: TYPES[options.type]
          } }
        })]
      }));
    }
    this.root.push(new MathNumerator(options.numerator));
    this.root.push(new MathDenominator(options.denominator));
  }
};
var createMathAccentCharacter = ({ accent }) => new BuilderElement({
  name: "m:chr",
  attributes: { accent: {
    key: "m:val",
    value: accent
  } }
});
var createMathBase = ({ children }) => new BuilderElement({
  name: "m:e",
  children
});
var createMathLimitLocation = ({ value }) => new BuilderElement({
  name: "m:limLoc",
  attributes: { value: {
    key: "m:val",
    value: value || "undOvr"
  } }
});
var createMathSubScriptHide = () => new BuilderElement({
  name: "m:subHide",
  attributes: { hide: {
    key: "m:val",
    value: 1
  } }
});
var createMathSuperScriptHide = () => new BuilderElement({
  name: "m:supHide",
  attributes: { hide: {
    key: "m:val",
    value: 1
  } }
});
var createMathNAryProperties = ({ accent, hasSuperScript, hasSubScript, limitLocationVal }) => new BuilderElement({
  name: "m:naryPr",
  children: [
    ...!!accent ? [createMathAccentCharacter({ accent })] : [],
    createMathLimitLocation({ value: limitLocationVal }),
    ...!hasSubScript ? [createMathSubScriptHide()] : [],
    ...!hasSuperScript ? [createMathSuperScriptHide()] : []
  ]
});
var createMathSubScriptElement = ({ children }) => new BuilderElement({
  name: "m:sub",
  children
});
var LOCATIONS = {
  aboveBelow: "undOvr",
  side: "subSup"
};
var limitLocationValue = (owner, limits, defaultValue) => {
  if (limits === void 0) return defaultValue;
  if (!Object.keys(LOCATIONS).includes(limits)) throw new Error(`${owner}: limits is "${limits}", which isn't one of ${Object.keys(LOCATIONS).join(", ")}`);
  return LOCATIONS[limits];
};
var createMathSuperScriptElement = ({ children }) => new BuilderElement({
  name: "m:sup",
  children
});
var MathSum = class extends XmlComponent {
  constructor(options) {
    var _options$subScript, _options$superScript;
    super("m:nary");
    this.root.push(createMathNAryProperties({
      accent: "∑",
      hasSuperScript: !!options.superScript,
      hasSubScript: !!options.subScript,
      limitLocationVal: limitLocationValue("MathSum", options.limits, "undOvr")
    }));
    this.root.push(createMathSubScriptElement({ children: (_options$subScript = options.subScript) !== null && _options$subScript !== void 0 ? _options$subScript : [] }));
    this.root.push(createMathSuperScriptElement({ children: (_options$superScript = options.superScript) !== null && _options$superScript !== void 0 ? _options$superScript : [] }));
    this.root.push(createMathBase({ children: options.children }));
  }
};
var MathIntegral = class extends XmlComponent {
  constructor(options) {
    var _options$subScript, _options$superScript;
    super("m:nary");
    this.root.push(createMathNAryProperties({
      accent: "",
      hasSuperScript: !!options.superScript,
      hasSubScript: !!options.subScript,
      limitLocationVal: limitLocationValue("MathIntegral", options.limits, "subSup")
    }));
    this.root.push(createMathSubScriptElement({ children: (_options$subScript = options.subScript) !== null && _options$subScript !== void 0 ? _options$subScript : [] }));
    this.root.push(createMathSuperScriptElement({ children: (_options$superScript = options.superScript) !== null && _options$superScript !== void 0 ? _options$superScript : [] }));
    this.root.push(createMathBase({ children: options.children }));
  }
};
var MathLimit = class extends XmlComponent {
  constructor(children) {
    super("m:lim");
    for (const child2 of children) this.root.push(child2);
  }
};
var MathLimitUpper = class extends XmlComponent {
  constructor(options) {
    super("m:limUpp");
    this.root.push(createMathBase({ children: options.children }));
    this.root.push(new MathLimit(options.limit));
  }
};
var MathLimitLower = class extends XmlComponent {
  constructor(options) {
    super("m:limLow");
    this.root.push(createMathBase({ children: options.children }));
    this.root.push(new MathLimit(options.limit));
  }
};
var createMathSuperScriptProperties = () => new BuilderElement({ name: "m:sSupPr" });
var MathSuperScript = class extends XmlComponent {
  constructor(options) {
    super("m:sSup");
    this.root.push(createMathSuperScriptProperties());
    this.root.push(createMathBase({ children: options.children }));
    this.root.push(createMathSuperScriptElement({ children: options.superScript }));
  }
};
var createMathSubScriptProperties = () => new BuilderElement({ name: "m:sSubPr" });
var MathSubScript = class extends XmlComponent {
  constructor(options) {
    super("m:sSub");
    this.root.push(createMathSubScriptProperties());
    this.root.push(createMathBase({ children: options.children }));
    this.root.push(createMathSubScriptElement({ children: options.subScript }));
  }
};
var createMathSubSuperScriptProperties = () => new BuilderElement({ name: "m:sSubSupPr" });
var MathSubSuperScript = class extends XmlComponent {
  constructor(options) {
    super("m:sSubSup");
    this.root.push(createMathSubSuperScriptProperties());
    this.root.push(createMathBase({ children: options.children }));
    this.root.push(createMathSubScriptElement({ children: options.subScript }));
    this.root.push(createMathSuperScriptElement({ children: options.superScript }));
  }
};
var createMathPreSubSuperScriptProperties = () => new BuilderElement({ name: "m:sPrePr" });
var MathPreSubSuperScript = class extends BuilderElement {
  constructor({ children, subScript, superScript }) {
    super({
      name: "m:sPre",
      children: [
        createMathPreSubSuperScriptProperties(),
        createMathSubScriptElement({ children: subScript }),
        createMathSuperScriptElement({ children: superScript }),
        createMathBase({ children })
      ]
    });
  }
};
var MathDegree = class extends XmlComponent {
  constructor(children) {
    super("m:deg");
    if (!!children) for (const child2 of children) this.root.push(child2);
  }
};
var MathDegreeHideAttributes = class extends XmlAttributeComponent {
  constructor(..._args) {
    super(..._args);
    _defineProperty(this, "xmlKeys", { hide: "m:val" });
  }
};
var MathDegreeHide = class extends XmlComponent {
  constructor() {
    super("m:degHide");
    this.root.push(new MathDegreeHideAttributes({ hide: 1 }));
  }
};
var MathRadicalProperties = class extends XmlComponent {
  constructor(hasDegree) {
    super("m:radPr");
    if (!hasDegree) this.root.push(new MathDegreeHide());
  }
};
var MathRadical = class extends XmlComponent {
  constructor(options) {
    super("m:rad");
    this.root.push(new MathRadicalProperties(!!options.degree));
    this.root.push(new MathDegree(options.degree));
    this.root.push(createMathBase({ children: options.children }));
  }
};
var MathFunctionName = class extends XmlComponent {
  constructor(children) {
    super("m:fName");
    for (const child2 of children) this.root.push(child2);
  }
};
var MathFunctionProperties = class extends XmlComponent {
  constructor() {
    super("m:funcPr");
  }
};
var MathFunction = class extends XmlComponent {
  constructor(options) {
    super("m:func");
    this.root.push(new MathFunctionProperties());
    this.root.push(new MathFunctionName(options.name));
    this.root.push(createMathBase({ children: options.children }));
  }
};
var createMathBeginningCharacter = ({ character }) => new BuilderElement({
  name: "m:begChr",
  attributes: { character: {
    key: "m:val",
    value: character
  } }
});
var createMathEndingCharacter = ({ character }) => new BuilderElement({
  name: "m:endChr",
  attributes: { character: {
    key: "m:val",
    value: character
  } }
});
var createMathBracketProperties = ({ characters }) => new BuilderElement({
  name: "m:dPr",
  children: !!characters ? [createMathBeginningCharacter({ character: characters.beginningCharacter }), createMathEndingCharacter({ character: characters.endingCharacter })] : []
});
var MathRoundBrackets = class extends XmlComponent {
  constructor(options) {
    super("m:d");
    this.root.push(createMathBracketProperties({}));
    this.root.push(createMathBase({ children: options.children }));
  }
};
var MathSquareBrackets = class extends XmlComponent {
  constructor(options) {
    super("m:d");
    this.root.push(createMathBracketProperties({ characters: {
      beginningCharacter: "[",
      endingCharacter: "]"
    } }));
    this.root.push(createMathBase({ children: options.children }));
  }
};
var MathCurlyBrackets = class extends XmlComponent {
  constructor(options) {
    super("m:d");
    this.root.push(createMathBracketProperties({ characters: {
      beginningCharacter: "{",
      endingCharacter: "}"
    } }));
    this.root.push(createMathBase({ children: options.children }));
  }
};
var MathAngledBrackets = class extends XmlComponent {
  constructor(options) {
    super("m:d");
    this.root.push(createMathBracketProperties({ characters: {
      beginningCharacter: "⟨",
      endingCharacter: "⟩"
    } }));
    this.root.push(createMathBase({ children: options.children }));
  }
};
var VerticalAlignTable = {
  TOP: "top",
  CENTER: "center",
  BOTTOM: "bottom"
};
var VerticalAlignSection = _objectSpread2(_objectSpread2({}, VerticalAlignTable), {}, { BOTH: "both" });
var VerticalAlign = VerticalAlignSection;
var createVerticalAlign = (value) => new BuilderElement({
  name: "w:vAlign",
  attributes: { verticalAlign: {
    key: "w:val",
    value
  } }
});
var createColumns = ({ space, count, separate, equalWidth, children }) => new BuilderElement({
  name: "w:cols",
  attributes: {
    space: {
      key: "w:space",
      value: space === void 0 ? void 0 : twipsMeasureValue(space)
    },
    count: {
      key: "w:num",
      value: count === void 0 ? void 0 : decimalNumber(count)
    },
    separate: {
      key: "w:sep",
      value: separate
    },
    equalWidth: {
      key: "w:equalWidth",
      value: equalWidth
    }
  },
  children: !equalWidth && children ? children : void 0
});
var DocumentGridType = {
  /**
  * Specifies that no document grid shall be applied to the contents of the current section in the document.
  */
  DEFAULT: "default",
  /**
  * Specifies that the parent section shall have additional line pitch added to each line within it (as specified on the <docGrid> element (§2.6.5)) in order to maintain the specified number of lines per page.
  */
  LINES: "lines",
  /**
  * Specifies that the parent section shall have both the additional line pitch and character pitch added to each line and character within it (as specified on the <docGrid> element (§2.6.5)) in order to maintain a specific number of lines per page and characters per line.
  *
  * When this value is set, the input specified via the user interface may be allowed in exact number of line/character pitch units. */
  LINES_AND_CHARS: "linesAndChars",
  /**
  * Specifies that the parent section shall have both the additional line pitch and character pitch added to each line and character within it (as specified on the <docGrid> element (§2.6.5)) in order to maintain a specific number of lines per page and characters per line.
  *
  * When this value is set, the input specified via the user interface may be restricted to the number of lines per page and characters per line, with the consumer or producer translating this information based on the current font data to get the resulting line and character pitch values
  */
  SNAP_TO_CHARS: "snapToChars"
};
var createDocumentGrid = ({ type, linePitch, charSpace }) => new BuilderElement({
  name: "w:docGrid",
  attributes: {
    type: {
      key: "w:type",
      value: type
    },
    linePitch: {
      key: "w:linePitch",
      value: decimalNumber(linePitch)
    },
    charSpace: {
      key: "w:charSpace",
      value: charSpace ? decimalNumber(charSpace) : void 0
    }
  }
});
var HeaderFooterReferenceType = {
  /** Specifies that this header or footer shall appear on every page in this section which is not overridden with a specific `even` or `first` page header/footer. In a section with all three types specified, this type shall be used on all odd numbered pages (counting from the `first` page in the section, not the section numbering). */
  DEFAULT: "default",
  /** Specifies that this header or footer shall appear on the first page in this section. The appearance of this header or footer is contingent on the setting of the `titlePg` element (§2.10.6). */
  FIRST: "first",
  /** Specifies that this header or footer shall appear on all even numbered pages in this section (counting from the first page in the section, not the section numbering). The appearance of this header or footer is contingent on the setting of the `evenAndOddHeaders` element (§2.10.1). */
  EVEN: "even"
};
var HeaderFooterType = {
  HEADER: "w:headerReference",
  FOOTER: "w:footerReference"
};
var createHeaderFooterReference = (type, options) => new BuilderElement({
  name: type,
  attributes: {
    type: {
      key: "w:type",
      value: options.type || HeaderFooterReferenceType.DEFAULT
    },
    id: {
      key: "r:id",
      value: `rId${options.id}`
    }
  }
});
var LineNumberRestartFormat = {
  /**
  * ## Restart Line Numbering on Each Page
  *
  * Specifies that line numbering for the parent section shall restart to the starting value whenever a new page is displayed.
  */
  NEW_PAGE: "newPage",
  /**
  * ## Restart Line Numbering for Each Section
  *
  * Specifies that line numbering for the parent section shall restart to the starting value whenever the parent begins.
  */
  NEW_SECTION: "newSection",
  /**
  * ## Continue Line Numbering From Previous Section
  *
  * Specifies that line numbering for the parent section shall continue from the line numbering from the end of the previous section, if any.
  */
  CONTINUOUS: "continuous"
};
var createLineNumberType = ({ countBy, start, restart, distance }) => new BuilderElement({
  name: "w:lnNumType",
  attributes: {
    countBy: {
      key: "w:countBy",
      value: countBy === void 0 ? void 0 : decimalNumber(countBy)
    },
    start: {
      key: "w:start",
      value: start === void 0 ? void 0 : decimalNumber(start)
    },
    restart: {
      key: "w:restart",
      value: restart
    },
    distance: {
      key: "w:distance",
      value: distance === void 0 ? void 0 : twipsMeasureValue(distance)
    }
  }
});
var FootnotePosition = {
  /** At the bottom of each page */
  PAGE_BOTTOM: "pageBottom",
  /** Directly below the text on each page */
  BENEATH_TEXT: "beneathText",
  /** At the end of the section */
  SECTION_END: "sectEnd",
  /** At the end of the document */
  DOCUMENT_END: "docEnd"
};
var EndnotePosition = {
  /** At the end of the section */
  SECTION_END: "sectEnd",
  /** At the end of the document */
  DOCUMENT_END: "docEnd"
};
var NoteNumberRestart = {
  /** Numbering never restarts */
  CONTINUOUS: "continuous",
  /** Numbering restarts in each section */
  EACH_SECTION: "eachSect",
  /** Numbering restarts on each page */
  EACH_PAGE: "eachPage"
};
var createNoteProperties = ({ name, position, numberFormat, start, restart }) => new BuilderElement({
  name,
  children: [
    ...position === void 0 ? [] : [new BuilderElement({
      name: "w:pos",
      attributes: { val: {
        key: "w:val",
        value: position
      } }
    })],
    ...numberFormat ? [new BuilderElement({
      name: "w:numFmt",
      attributes: {
        val: {
          key: "w:val",
          value: numberFormat.type
        },
        format: {
          key: "w:format",
          value: numberFormat.format
        }
      }
    })] : [],
    ...start === void 0 ? [] : [new BuilderElement({
      name: "w:numStart",
      attributes: { val: {
        key: "w:val",
        value: decimalNumber(start)
      } }
    })],
    ...restart === void 0 ? [] : [new BuilderElement({
      name: "w:numRestart",
      attributes: { val: {
        key: "w:val",
        value: restart
      } }
    })]
  ]
});
var createFootnoteProperties = (options) => createNoteProperties(_objectSpread2({ name: "w:footnotePr" }, options));
var createEndnoteProperties = (options) => createNoteProperties(_objectSpread2({ name: "w:endnotePr" }, options));
var PageBorderDisplay = {
  /** Display border on all pages */
  ALL_PAGES: "allPages",
  /** Display border only on first page */
  FIRST_PAGE: "firstPage",
  /** Display border on all pages except first page */
  NOT_FIRST_PAGE: "notFirstPage"
};
var PageBorderOffsetFrom = {
  /** Position border relative to page edge */
  PAGE: "page",
  /** Position border relative to text (default) */
  TEXT: "text"
};
var PageBorderZOrder = {
  /** Display border behind page contents */
  BACK: "back",
  /** Display border in front of page contents (default) */
  FRONT: "front"
};
var PageBordersAttributes = class extends XmlAttributeComponent {
  constructor(..._args) {
    super(..._args);
    _defineProperty(this, "xmlKeys", {
      display: "w:display",
      offsetFrom: "w:offsetFrom",
      zOrder: "w:zOrder"
    });
  }
};
var PageBorders = class extends IgnoreIfEmptyXmlComponent {
  constructor(options) {
    super("w:pgBorders");
    if (!options) return this;
    if (options.pageBorders) this.root.push(new PageBordersAttributes({
      display: options.pageBorders.display,
      offsetFrom: options.pageBorders.offsetFrom,
      zOrder: options.pageBorders.zOrder
    }));
    else this.root.push(new PageBordersAttributes({}));
    if (options.pageBorderTop) this.root.push(createBorderElement("w:top", options.pageBorderTop));
    if (options.pageBorderLeft) this.root.push(createBorderElement("w:left", options.pageBorderLeft));
    if (options.pageBorderBottom) this.root.push(createBorderElement("w:bottom", options.pageBorderBottom));
    if (options.pageBorderRight) this.root.push(createBorderElement("w:right", options.pageBorderRight));
  }
};
var createPageMargin = (top, right, bottom, left, header, footer, gutter) => new BuilderElement({
  name: "w:pgMar",
  attributes: {
    top: {
      key: "w:top",
      value: signedTwipsMeasureValue(top)
    },
    right: {
      key: "w:right",
      value: twipsMeasureValue(right)
    },
    bottom: {
      key: "w:bottom",
      value: signedTwipsMeasureValue(bottom)
    },
    left: {
      key: "w:left",
      value: twipsMeasureValue(left)
    },
    header: {
      key: "w:header",
      value: twipsMeasureValue(header)
    },
    footer: {
      key: "w:footer",
      value: twipsMeasureValue(footer)
    },
    gutter: {
      key: "w:gutter",
      value: twipsMeasureValue(gutter)
    }
  }
});
var PageNumberSeparator = {
  /** Hyphen separator (-) */
  HYPHEN: "hyphen",
  /** Period separator (.) */
  PERIOD: "period",
  /** Colon separator (:) */
  COLON: "colon",
  /** Em dash separator (—) */
  EM_DASH: "emDash",
  /** En dash separator (–), written as `enDash` */
  EN_DASH: "endash"
};
var createPageNumberType = ({ start, formatType, separator, chapterHeadingLevel }) => new BuilderElement({
  name: "w:pgNumType",
  attributes: {
    start: {
      key: "w:start",
      value: start === void 0 ? void 0 : decimalNumber(start)
    },
    formatType: {
      key: "w:fmt",
      value: formatType
    },
    separator: {
      key: "w:chapSep",
      value: separator === PageNumberSeparator.EN_DASH ? "enDash" : separator
    },
    chapterHeadingLevel: {
      key: "w:chapStyle",
      value: chapterHeadingLevel === void 0 ? void 0 : decimalNumber(chapterHeadingLevel)
    }
  }
});
var PageOrientation = {
  /**
  * ## Portrait Mode
  *
  * Specifies that pages in this section shall be printed in portrait mode.
  */
  PORTRAIT: "portrait",
  /**
  * ## Landscape Mode
  *
  * Specifies that pages in this section shall be printed in landscape mode, which prints the page contents with a 90 degree rotation with respect to the normal page orientation.
  */
  LANDSCAPE: "landscape"
};
var createPageSize = ({ width, height, orientation, code }) => {
  const widthTwips = twipsMeasureValue(width);
  const heightTwips = twipsMeasureValue(height);
  return new BuilderElement({
    name: "w:pgSz",
    attributes: {
      width: {
        key: "w:w",
        value: orientation === PageOrientation.LANDSCAPE ? heightTwips : widthTwips
      },
      height: {
        key: "w:h",
        value: orientation === PageOrientation.LANDSCAPE ? widthTwips : heightTwips
      },
      orientation: {
        key: "w:orient",
        value: orientation
      },
      code: {
        key: "w:code",
        value: code
      }
    }
  });
};
var PageTextDirectionType = {
  /** Left-to-right, top-to-bottom (standard Western text flow) */
  LEFT_TO_RIGHT_TOP_TO_BOTTOM: "lrTb",
  /** Top-to-bottom, right-to-left (vertical East Asian text flow) */
  TOP_TO_BOTTOM_RIGHT_TO_LEFT: "tbRl"
};
var PageTextDirectionAttributes = class extends XmlAttributeComponent {
  constructor(..._args) {
    super(..._args);
    _defineProperty(this, "xmlKeys", { val: "w:val" });
  }
};
var PageTextDirection = class extends XmlComponent {
  constructor(value) {
    super("w:textDirection");
    this.root.push(new PageTextDirectionAttributes({ val: value }));
  }
};
var SectionType = {
  /** Section begins on the next page */
  NEXT_PAGE: "nextPage",
  /** Section begins on the next column */
  NEXT_COLUMN: "nextColumn",
  /** Section begins immediately following the previous section */
  CONTINUOUS: "continuous",
  /** Section begins on the next even-numbered page */
  EVEN_PAGE: "evenPage",
  /** Section begins on the next odd-numbered page */
  ODD_PAGE: "oddPage"
};
var createSectionType = (value) => new BuilderElement({
  name: "w:type",
  attributes: { val: {
    key: "w:val",
    value
  } }
});
var sectionMarginDefaults = {
  /** Top margin: 1440 twips (1 inch) */
  TOP: 1440,
  /** Right margin: 1440 twips (1 inch) */
  RIGHT: 1440,
  /** Bottom margin: 1440 twips (1 inch) */
  BOTTOM: 1440,
  /** Left margin: 1440 twips (1 inch) */
  LEFT: 1440,
  /** Header margin from top: 708 twips (0.5 inches) */
  HEADER: 708,
  /** Footer margin from bottom: 708 twips (0.5 inches) */
  FOOTER: 708,
  /** Gutter margin for binding: 0 twips */
  GUTTER: 0
};
var sectionPageSizeDefaults = {
  /** Page width: 11906 twips (8.27 inches, 210mm) */
  WIDTH: 11906,
  /** Page height: 16838 twips (11.69 inches, 297mm) */
  HEIGHT: 16838,
  /** Page orientation: portrait */
  ORIENTATION: PageOrientation.PORTRAIT
};
var SectionProperties = class SectionProperties2 extends XmlComponent {
  constructor({ page: { size: { width = sectionPageSizeDefaults.WIDTH, height = sectionPageSizeDefaults.HEIGHT, orientation = sectionPageSizeDefaults.ORIENTATION, code } = {}, margin: { top = sectionMarginDefaults.TOP, right = sectionMarginDefaults.RIGHT, bottom = sectionMarginDefaults.BOTTOM, left = sectionMarginDefaults.LEFT, header = sectionMarginDefaults.HEADER, footer = sectionMarginDefaults.FOOTER, gutter = sectionMarginDefaults.GUTTER } = {}, pageNumbers = {}, borders, textDirection } = {}, grid: { linePitch = 360, charSpace, type: gridType } = {}, headerWrapperGroup = {}, footerWrapperGroup = {}, lineNumbers, titlePage, verticalAlign, column, type, footnoteProperties, endnoteProperties, revision } = {}) {
    super("w:sectPr");
    _defineProperty(
      this,
      /**
      * Width, in twips, available to block-level content in this section.
      *
      * This is the page width (accounting for orientation) minus the left and right
      * margins and the gutter. When the section is laid out in several columns, it is
      * the width of a single column. Percentage table widths are resolved against it.
      */
      "availableTextWidth",
      void 0
    );
    this.availableTextWidth = SectionProperties2.calculateAvailableTextWidth({
      pageWidth: orientation === PageOrientation.LANDSCAPE ? height : width,
      left,
      right,
      gutter,
      column
    });
    this.addHeaderFooterGroup(HeaderFooterType.HEADER, headerWrapperGroup);
    this.addHeaderFooterGroup(HeaderFooterType.FOOTER, footerWrapperGroup);
    if (footnoteProperties) this.root.push(createFootnoteProperties(footnoteProperties));
    if (endnoteProperties) this.root.push(createEndnoteProperties(endnoteProperties));
    if (type) this.root.push(createSectionType(type));
    this.root.push(createPageSize({
      width,
      height,
      orientation,
      code
    }));
    this.root.push(createPageMargin(top, right, bottom, left, header, footer, gutter));
    if (borders) this.root.push(new PageBorders(borders));
    if (lineNumbers) this.root.push(createLineNumberType(lineNumbers));
    this.root.push(createPageNumberType(pageNumbers));
    if (column) this.root.push(createColumns(column));
    if (verticalAlign) this.root.push(createVerticalAlign(verticalAlign));
    if (titlePage !== void 0) this.root.push(new OnOffElement("w:titlePg", titlePage));
    if (textDirection) this.root.push(new PageTextDirection(textDirection));
    this.root.push(createDocumentGrid({
      linePitch,
      charSpace,
      type: gridType
    }));
    if (revision) this.root.push(new SectionPropertiesChange(revision));
  }
  /**
  * Width, in twips, available to block-level content (paragraphs and tables) in this section.
  *
  * Page width minus the left and right margins and the gutter, divided among the
  * section's columns when there is more than one. Tables use this to resolve
  * percentage widths into the absolute twip grid that Google Docs, Apple Pages and
  * other consumers lay tables out from.
  *
  * @example
  * ```typescript
  * // A4 portrait with 1 inch margins
  * new SectionProperties().AvailableTextWidth; // 11906 - 1440 - 1440 = 9026
  * ```
  */
  get AvailableTextWidth() {
    return this.availableTextWidth;
  }
  static calculateAvailableTextWidth({ pageWidth, left, right, gutter, column }) {
    var _column$count, _column$space;
    const textWidth = universalMeasureToTwips(pageWidth) - universalMeasureToTwips(left) - universalMeasureToTwips(right) - universalMeasureToTwips(gutter);
    const columnCount = (_column$count = column === null || column === void 0 ? void 0 : column.count) !== null && _column$count !== void 0 ? _column$count : 1;
    if (columnCount <= 1) return textWidth;
    return (textWidth - universalMeasureToTwips((_column$space = column === null || column === void 0 ? void 0 : column.space) !== null && _column$space !== void 0 ? _column$space : 720) * (columnCount - 1)) / columnCount;
  }
  addHeaderFooterGroup(type, group) {
    if (group.default) this.root.push(createHeaderFooterReference(type, {
      type: HeaderFooterReferenceType.DEFAULT,
      id: group.default.View.ReferenceId
    }));
    if (group.first) this.root.push(createHeaderFooterReference(type, {
      type: HeaderFooterReferenceType.FIRST,
      id: group.first.View.ReferenceId
    }));
    if (group.even) this.root.push(createHeaderFooterReference(type, {
      type: HeaderFooterReferenceType.EVEN,
      id: group.even.View.ReferenceId
    }));
  }
};
var SectionPropertiesChange = class extends XmlComponent {
  constructor(options) {
    super("w:sectPrChange");
    this.root.push(new ChangeAttributes({
      id: options.id,
      author: options.author,
      date: options.date
    }));
    this.root.push(new SectionProperties(options));
  }
};
var Body = class extends XmlComponent {
  constructor({ pageNumbers } = {}) {
    super("w:body");
    _defineProperty(this, "sections", []);
    _defineProperty(
      this,
      /**
      * Section properties that were moved into a paragraph at the end of their section
      * by {@link addSection}, keyed by that paragraph. Used to find the section that
      * governs a given child of the body, and to write each section's properties into
      * its paragraph while the body is written.
      */
      "sectionParagraphs",
      /* @__PURE__ */ new Map()
    );
    _defineProperty(this, "headingBookmarkIds", new HeadingBookmarkIds());
    _defineProperty(this, "pageNumbers", void 0);
    this.pageNumbers = pageNumbers;
  }
  /**
  * Finds the section properties that govern a top-level child of the body.
  *
  * A section's properties are stored after its content (either in the closing
  * paragraph of the section or, for the last section, at the end of the body), so
  * the governing section is the first one found at or after the child. When no
  * child is given (or it is not a direct child of the body), the first section is
  * returned.
  *
  * @param child - A direct child of the body (paragraph, table, etc.)
  * @returns The governing section properties, or undefined if the body has no sections
  */
  getSectionPropertiesFor(child2) {
    const start = child2 ? Math.max(this.root.indexOf(child2), 0) : 0;
    for (let i2 = start; i2 < this.root.length; i2++) {
      const component = this.root[i2];
      if (component instanceof SectionProperties) return component;
      const section = this.sectionParagraphs.get(component);
      if (section) return section;
    }
    return this.sections[this.sections.length - 1];
  }
  /**
  * Adds new section properties to the document body.
  *
  * Creates a new section by moving the previous section's properties into the last
  * paragraph of that section, and then adding the new section as the current section.
  * When that section doesn't end with a paragraph of its own (it ends with a table, or
  * it is empty), an empty paragraph is added to hold its properties.
  *
  * According to the OOXML specification:
  * - Section properties for all sections except the last must be stored in a paragraph's
  *   properties (pPr/sectPr) at the end of each section
  * - The last section's properties are stored as a direct child of the body element (w:body/w:sectPr)
  *
  * @param options - Section properties configuration (page size, margins, headers, footers, etc.)
  */
  addSection(options) {
    const currentSection = this.sections.pop();
    const lastParagraph = this.lastParagraphOfSection();
    if (currentSection && lastParagraph) this.sectionParagraphs.set(lastParagraph, currentSection);
    else {
      const sectionParagraph = this.createSectionParagraph();
      this.root.push(sectionParagraph);
      if (currentSection) this.sectionParagraphs.set(sectionParagraph, currentSection);
    }
    this.sections.push(new SectionProperties(options));
  }
  /**
  * Prepares the body element for XML serialization.
  *
  * Ensures that the last section's properties are placed as a direct child of the body
  * element, as required by the OOXML specification. Once the body is written, its tables
  * of contents are filled in from its headings, and, when the body has a page number
  * estimator, its page references are given their page numbers. Its SEQ fields are given
  * their numbers after the tables of contents are filled in, as Word leaves a heading's SEQ
  * number out of its entry.
  *
  * @param context - The XML serialization context
  * @returns The prepared XML object or undefined
  */
  prepForXml(context) {
    var _this$pageNumbers;
    if (this.sections.length === 1) {
      this.root.splice(0, 1);
      this.root.push(this.sections.pop());
    }
    for (const [paragraph, section] of this.sectionParagraphs) paragraph.addSectionProperties(section);
    let xml;
    try {
      xml = super.prepForXml(context);
    } finally {
      for (const [paragraph, section] of this.sectionParagraphs) paragraph.removeSectionProperties(section);
    }
    const listNumbers = (_this$pageNumbers = this.pageNumbers) === null || _this$pageNumbers === void 0 ? void 0 : _this$pageNumbers.listNumbers;
    fillTablesOfContents(xml, context, this.headingBookmarkIds, listNumbers && ((body) => listNumbers(body, context)));
    if (this.pageNumbers) {
      fillSequenceNumbers(xml, context);
      fillPageNumbers(xml, context, this.pageNumbers);
    }
    return xml;
  }
  /**
  * Adds a block-level component to the body.
  *
  * This method is used internally by the Document class to add paragraphs,
  * tables, and other block-level elements to the document body.
  *
  * @param component - The XML component to add (paragraph, table, etc.)
  */
  push(component) {
    const section = component instanceof Paragraph ? this.sectionParagraphs.get(component) : void 0;
    if (section) {
      const sectionParagraph = this.createSectionParagraph();
      this.root.splice(this.root.indexOf(component) + 1, 0, sectionParagraph);
      this.sectionParagraphs.delete(component);
      this.sectionParagraphs.set(sectionParagraph, section);
    }
    this.root.push(component);
  }
  /**
  * The paragraph the current section ends with, which can hold its properties.
  *
  * There is none when the section ends with something other than a paragraph, or is empty:
  * its last child is then the placeholder at the start of the body (removed when the body is
  * written) or the paragraph that ends the section before, which has properties of its own.
  */
  lastParagraphOfSection() {
    const last = this.root[this.root.length - 1];
    return last instanceof Paragraph && last !== this.root[0] && !this.sectionParagraphs.has(last) && this.root.indexOf(last) === this.root.length - 1 ? last : void 0;
  }
  /**
  * An empty paragraph to end a section that has no paragraph of its own to end it. The section's
  * properties are written into it with the others, when the body is written.
  */
  createSectionParagraph() {
    return new Paragraph({});
  }
};
var WidthType = {
  /** Auto. */
  AUTO: "auto",
  /** Value is in twentieths of a point */
  DXA: "dxa",
  /** No (empty) value. */
  NIL: "nil",
  /** Value is in percentage. */
  PERCENTAGE: "pct"
};
var createTableWidthElement = (name, { type = WidthType.AUTO, size }) => {
  let tableWidthValue = size;
  if (type === WidthType.PERCENTAGE && typeof size === "number") tableWidthValue = Math.round(size * 50);
  return new BuilderElement({
    name,
    attributes: {
      type: {
        key: "w:type",
        value: type
      },
      size: {
        key: "w:w",
        value: measurementOrPercentValue(tableWidthValue)
      }
    }
  });
};
var DEFAULT_AVAILABLE_WIDTH = sectionPageSizeDefaults.WIDTH - sectionMarginDefaults.LEFT - sectionMarginDefaults.RIGHT - sectionMarginDefaults.GUTTER;
var columnSpanOf = (cell) => cell.options.columnSpan || 1;
var resolvePreferredWidth = (width, referenceWidth) => {
  if (!width) return;
  const { type = WidthType.AUTO, size } = width;
  if (type !== WidthType.PERCENTAGE && type !== WidthType.DXA) return;
  const twips = typeof size === "number" ? type === WidthType.PERCENTAGE ? size / 100 * referenceWidth : size : size.endsWith("%") ? Number(size.slice(0, -1)) / 100 * referenceWidth : universalMeasureToTwips(size);
  return twips > 0 ? twips : void 0;
};
var resolveTableWidth = (width, availableWidth) => {
  var _resolvePreferredWidt;
  return (_resolvePreferredWidt = resolvePreferredWidth(width, availableWidth)) !== null && _resolvePreferredWidt !== void 0 ? _resolvePreferredWidt : availableWidth;
};
var countGridColumns = (rows) => Math.max(0, ...rows.map((row) => row.cells.reduce((count, cell) => count + columnSpanOf(cell), 0)));
var resolveColumnWidths = ({ rows, width, availableWidth }) => {
  const columnCount = countGridColumns(rows);
  if (columnCount === 0) return [];
  const tableWidth = resolveTableWidth(width, availableWidth);
  const widths = Array.from({ length: columnCount }, () => void 0);
  const spanningCells = [];
  for (const row of rows) {
    let column = 0;
    for (const cell of row.cells) {
      const span = columnSpanOf(cell);
      const cellWidth = resolvePreferredWidth(cell.options.width, tableWidth);
      if (cellWidth !== void 0) {
        if (span === 1) {
          var _column, _widths$_column;
          (_widths$_column = widths[_column = column]) !== null && _widths$_column !== void 0 || (widths[_column] = cellWidth);
        } else spanningCells.push({
          start: column,
          span,
          width: cellWidth
        });
      }
      column += span;
    }
  }
  for (const { start, span, width: cellWidth } of spanningCells) {
    const columns = Array.from({ length: span }, (_, i2) => start + i2).filter((column) => column < columnCount);
    const unresolvedSpanColumns = columns.filter((column) => widths[column] === void 0);
    const remaining = cellWidth - columns.reduce((sum, column) => {
      var _widths$column;
      return sum + ((_widths$column = widths[column]) !== null && _widths$column !== void 0 ? _widths$column : 0);
    }, 0);
    if (unresolvedSpanColumns.length > 0 && remaining > 0) for (const column of unresolvedSpanColumns) widths[column] = remaining / unresolvedSpanColumns.length;
  }
  const unresolvedColumns = widths.flatMap((columnWidth, column) => columnWidth === void 0 ? [column] : []);
  if (unresolvedColumns.length > 0) {
    const remaining = tableWidth - widths.reduce((sum, columnWidth) => sum + (columnWidth !== null && columnWidth !== void 0 ? columnWidth : 0), 0);
    const share = remaining > 0 ? remaining / unresolvedColumns.length : tableWidth / columnCount;
    for (const column of unresolvedColumns) widths[column] = share;
  }
  return widths.map((columnWidth) => Math.round(columnWidth));
};
var createGridCol = (width) => new BuilderElement({
  name: "w:gridCol",
  attributes: width !== void 0 ? { width: {
    key: "w:w",
    value: twipsMeasureValue(width)
  } } : void 0
});
var TableGrid = class extends XmlComponent {
  constructor(widths, revision) {
    super("w:tblGrid");
    for (const width of widths) this.root.push(createGridCol(width));
    if (revision) this.root.push(new TableGridChange(revision));
  }
};
var TableGridChangeAttributes = class extends XmlAttributeComponent {
  constructor(..._args) {
    super(..._args);
    _defineProperty(this, "xmlKeys", { id: "w:id" });
  }
};
var TableGridChange = class extends XmlComponent {
  constructor(options) {
    super("w:tblGridChange");
    this.root.push(new TableGridChangeAttributes({ id: options.id }));
    this.root.push(new TableGrid(options.columnWidths));
  }
};
var InsertedTextRun = class extends XmlComponent {
  constructor(options) {
    super("w:ins");
    this.root.push(new ChangeAttributes({
      id: options.id,
      author: options.author,
      date: options.date
    }));
    this.addChildElement(new TextRun(options));
  }
};
var DeletedPage = class extends XmlComponent {
  constructor() {
    super("w:delInstrText");
    this.root.push(new TextAttributes({ space: SpaceType.PRESERVE }));
    this.root.push("PAGE");
  }
};
var DeletedNumberOfPages = class extends XmlComponent {
  constructor() {
    super("w:delInstrText");
    this.root.push(new TextAttributes({ space: SpaceType.PRESERVE }));
    this.root.push("NUMPAGES");
  }
};
var DeletedNumberOfPagesSection = class extends XmlComponent {
  constructor() {
    super("w:delInstrText");
    this.root.push(new TextAttributes({ space: SpaceType.PRESERVE }));
    this.root.push("SECTIONPAGES");
  }
};
var DeletedText = class extends XmlComponent {
  constructor(text) {
    super("w:delText");
    this.root.push(new TextAttributes({ space: SpaceType.PRESERVE }));
    this.root.push(text);
  }
};
var deletedPageNumberFieldOf = (child2) => {
  switch (child2) {
    case PageNumber.CURRENT:
      return [
        createBegin(),
        new DeletedPage(),
        createSeparate(),
        createEnd()
      ];
    case PageNumber.TOTAL_PAGES:
      return [
        createBegin(),
        new DeletedNumberOfPages(),
        createSeparate(),
        createEnd()
      ];
    case PageNumber.TOTAL_PAGES_IN_SECTION:
      return [
        createBegin(),
        new DeletedNumberOfPagesSection(),
        createSeparate(),
        createEnd()
      ];
    default:
      return;
  }
};
var DeletedTextRun = class extends XmlComponent {
  constructor(options) {
    super("w:del");
    _defineProperty(this, "deletedTextRunWrapper", void 0);
    this.root.push(new ChangeAttributes({
      id: options.id,
      author: options.author,
      date: options.date
    }));
    this.deletedTextRunWrapper = new DeletedTextRunWrapper(options);
    this.addChildElement(this.deletedTextRunWrapper);
  }
};
var DeletedTextRunWrapper = class DeletedTextRunWrapper2 extends XmlComponent {
  constructor(options) {
    super("w:r");
    _defineProperty(this, "following", []);
    this.root.push(new RunProperties(options));
    if (options.children) for (const [index, child2] of options.children.entries()) {
      if (child2 instanceof Run) {
        const rest = options.children.slice(index + 1);
        this.following = [child2, ...rest.length > 0 ? [new DeletedTextRunWrapper2(_objectSpread2(_objectSpread2({}, options), {}, {
          break: void 0,
          children: rest
        }))] : []];
        break;
      }
      if (typeof child2 === "string") {
        const field = deletedPageNumberFieldOf(child2);
        if (field) {
          const rest = options.children.slice(index + 1);
          const runOf = (children) => new DeletedTextRunWrapper2(_objectSpread2(_objectSpread2({}, options), {}, {
            break: void 0,
            children
          }));
          const beginsHere = this.root.length === 1;
          if (beginsHere) this.root.push(field[0]);
          const parts = beginsHere ? field.slice(1) : field;
          this.following = [...parts.map((part) => runOf([part])), ...rest.length > 0 ? [runOf(rest)] : []];
          break;
        }
        this.root.push(new DeletedText(child2));
        continue;
      }
      this.root.push(child2);
    }
    else if (options.text) this.root.push(new DeletedText(options.text));
    if (options.break) for (let i2 = 0; i2 < options.break; i2++) this.root.splice(1, 0, createBreak());
  }
  get writtenAs() {
    return this.following.length > 0 ? [this, ...this.following.flatMap((run) => {
      var _run$writtenAs;
      return (_run$writtenAs = run.writtenAs) !== null && _run$writtenAs !== void 0 ? _run$writtenAs : run;
    })] : void 0;
  }
};
var InsertedTableRow = class extends XmlComponent {
  constructor(options) {
    super("w:ins");
    this.root.push(new ChangeAttributes({
      id: options.id,
      author: options.author,
      date: options.date
    }));
  }
};
var DeletedTableRow = class extends XmlComponent {
  constructor(options) {
    super("w:del");
    this.root.push(new ChangeAttributes({
      id: options.id,
      author: options.author,
      date: options.date
    }));
  }
};
var InsertedTableCell = class extends XmlComponent {
  constructor(options) {
    super("w:cellIns");
    this.root.push(new ChangeAttributes({
      id: options.id,
      author: options.author,
      date: options.date
    }));
  }
};
var DeletedTableCell = class extends XmlComponent {
  constructor(options) {
    super("w:cellDel");
    this.root.push(new ChangeAttributes({
      id: options.id,
      author: options.author,
      date: options.date
    }));
  }
};
var VerticalMergeRevisionType = {
  /**
  * Cell that is merged with upper one.
  */
  CONTINUE: "cont",
  /**
  * Cell that is starting the vertical merge.
  */
  RESTART: "rest"
};
var CellMergeAttributes = class extends XmlAttributeComponent {
  constructor(..._args) {
    super(..._args);
    _defineProperty(this, "xmlKeys", {
      id: "w:id",
      author: "w:author",
      date: "w:date",
      verticalMerge: "w:vMerge",
      verticalMergeOriginal: "w:vMergeOrig"
    });
  }
};
var CellMerge = class extends XmlComponent {
  constructor(options) {
    super("w:cellMerge");
    this.root.push(new CellMergeAttributes(options));
  }
};
var buildMarginChildren = ({ marginUnitType = WidthType.DXA, top, left, bottom, right }) => [
  {
    name: "w:top",
    size: top
  },
  {
    name: "w:left",
    size: left
  },
  {
    name: "w:bottom",
    size: bottom
  },
  {
    name: "w:right",
    size: right
  }
].filter((entry) => entry.size !== void 0).map(({ name, size }) => createTableWidthElement(name, {
  type: marginUnitType,
  size
}));
var createTableCellMargin = (options) => {
  const children = buildMarginChildren(options);
  if (children.length === 0) return;
  return new BuilderElement({
    name: "w:tblCellMar",
    children
  });
};
var createCellMargin = (options) => {
  const children = buildMarginChildren(options);
  if (children.length === 0) return;
  return new BuilderElement({
    name: "w:tcMar",
    children
  });
};
var TableCellBorders = class extends IgnoreIfEmptyXmlComponent {
  constructor(options) {
    super("w:tcBorders");
    if (options.top) this.root.push(createBorderElement("w:top", options.top));
    if (options.start) this.root.push(createBorderElement("w:start", options.start));
    if (options.left) this.root.push(createBorderElement("w:left", options.left));
    if (options.bottom) this.root.push(createBorderElement("w:bottom", options.bottom));
    if (options.end) this.root.push(createBorderElement("w:end", options.end));
    if (options.right) this.root.push(createBorderElement("w:right", options.right));
    if (options.diagonalDown) this.root.push(createBorderElement("w:tl2br", options.diagonalDown));
    if (options.diagonalUp) this.root.push(createBorderElement("w:tr2bl", options.diagonalUp));
  }
};
var GridSpanAttributes = class extends XmlAttributeComponent {
  constructor(..._args) {
    super(..._args);
    _defineProperty(this, "xmlKeys", { val: "w:val" });
  }
};
var GridSpan = class extends XmlComponent {
  constructor(value) {
    super("w:gridSpan");
    this.root.push(new GridSpanAttributes({ val: decimalNumber(value) }));
  }
};
var VerticalMergeType = {
  /**
  * Cell that is merged with upper one.
  * This cell continues a vertical merge started by a cell above it.
  */
  CONTINUE: "continue",
  /**
  * Cell that is starting the vertical merge.
  * This cell begins a new vertical merge region.
  */
  RESTART: "restart"
};
var VerticalMergeAttributes = class extends XmlAttributeComponent {
  constructor(..._args2) {
    super(..._args2);
    _defineProperty(this, "xmlKeys", { val: "w:val" });
  }
};
var VerticalMerge = class extends XmlComponent {
  constructor(value) {
    super("w:vMerge");
    this.root.push(new VerticalMergeAttributes({ val: value }));
  }
};
var TextDirection = {
  /** Text flows from bottom to top, left to right */
  BOTTOM_TO_TOP_LEFT_TO_RIGHT: "btLr",
  /** Text flows from left to right, top to bottom (default) */
  LEFT_TO_RIGHT_TOP_TO_BOTTOM: "lrTb",
  /** Text flows from top to bottom, right to left */
  TOP_TO_BOTTOM_RIGHT_TO_LEFT: "tbRl"
};
var TDirectionAttributes = class extends XmlAttributeComponent {
  constructor(..._args3) {
    super(..._args3);
    _defineProperty(this, "xmlKeys", { val: "w:val" });
  }
};
var TDirection = class extends XmlComponent {
  constructor(value) {
    super("w:textDirection");
    this.root.push(new TDirectionAttributes({ val: value }));
  }
};
var TableCellProperties = class extends IgnoreIfEmptyXmlComponent {
  constructor(options) {
    super("w:tcPr", options.includeIfEmpty);
    _defineProperty(this, "hasWidth", void 0);
    _defineProperty(this, "hasColumnWidth", false);
    this.hasWidth = options.width !== void 0;
    if (options.width) this.root.push(createTableWidthElement("w:tcW", options.width));
    if (options.columnSpan) this.root.push(new GridSpan(options.columnSpan));
    if (options.verticalMerge) this.root.push(new VerticalMerge(options.verticalMerge));
    else if (options.rowSpan && options.rowSpan > 1) this.root.push(new VerticalMerge(VerticalMergeType.RESTART));
    if (options.borders) this.root.push(new TableCellBorders(options.borders));
    if (options.shading) this.root.push(createShading(options.shading));
    if (options.margins) {
      const cellMargin = createCellMargin(options.margins);
      if (cellMargin) this.root.push(cellMargin);
    }
    if (options.textDirection) this.root.push(new TDirection(options.textDirection));
    if (options.verticalAlign) this.root.push(createVerticalAlign(options.verticalAlign));
    if (options.insertion) this.root.push(new InsertedTableCell(options.insertion));
    if (options.deletion) this.root.push(new DeletedTableCell(options.deletion));
    if (options.cellMerge) this.root.push(new CellMerge(options.cellMerge));
    if (options.revision) this.root.push(new TableCellPropertiesChange(options.revision));
  }
  /**
  * Gives a cell without a width of its own the width of the table's columns it spans, in twips.
  *
  * @internal
  */
  setColumnWidth(twips) {
    if (this.hasWidth) return;
    this.root.splice(0, this.hasColumnWidth ? 1 : 0, createTableWidthElement("w:tcW", {
      size: twips,
      type: WidthType.DXA
    }));
    this.hasColumnWidth = true;
  }
};
var TableCellPropertiesChange = class extends XmlComponent {
  constructor(options) {
    super("w:tcPrChange");
    this.root.push(new ChangeAttributes({
      id: options.id,
      author: options.author,
      date: options.date
    }));
    this.root.push(new TableCellProperties(_objectSpread2(_objectSpread2({}, options), {}, { includeIfEmpty: true })));
  }
};
var TableCell = class extends XmlComponent {
  constructor(options) {
    super("w:tc");
    _defineProperty(
      this,
      /**
      * The options the cell was created with.
      *
      * Its borders and shading are declared with hex colors, as they were before they took colors of the document's
      * theme, so that code reading them still compiles. A cell given a theme color has it here as it was given.
      */
      "options",
      void 0
    );
    _defineProperty(this, "properties", void 0);
    this.options = options;
    this.properties = new TableCellProperties(options);
    this.root.push(this.properties);
    for (const child2 of options.children) this.root.push(child2);
  }
  /**
  * Gives the cell, unless it has a width of its own, the width of the table's columns it spans, in twips.
  *
  * @internal
  */
  setColumnWidth(twips) {
    this.properties.setColumnWidth(twips);
  }
  prepForXml(context) {
    if (elementOf(this.root[this.root.length - 1]) !== "w:p") this.root.push(new Paragraph({}));
    return super.prepForXml(context);
  }
};
var createOnOffOnlyElement = (name, value) => value ? new OnOffElement(name) : new StringValueElement(name, "off");
var NONE_BORDER = {
  style: BorderStyle.NONE,
  size: 0,
  color: "auto"
};
var DEFAULT_BORDER = {
  style: BorderStyle.SINGLE,
  size: 4,
  color: "auto"
};
var TableBorders = class extends IgnoreIfEmptyXmlComponent {
  constructor(options, { fillMissingSides = true } = {}) {
    super("w:tblBorders");
    const sides = [
      ["w:top", options.top],
      ["w:left", options.left],
      ["w:bottom", options.bottom],
      ["w:right", options.right],
      ["w:insideH", options.insideHorizontal],
      ["w:insideV", options.insideVertical]
    ];
    for (const [elementName, border] of sides) {
      const resolved = border !== null && border !== void 0 ? border : fillMissingSides ? DEFAULT_BORDER : void 0;
      if (resolved) this.root.push(createBorderElement(elementName, resolved));
    }
  }
};
_defineProperty(TableBorders, "NONE", {
  top: NONE_BORDER,
  bottom: NONE_BORDER,
  left: NONE_BORDER,
  right: NONE_BORDER,
  insideHorizontal: NONE_BORDER,
  insideVertical: NONE_BORDER
});
var TableAnchorType = {
  MARGIN: "margin",
  PAGE: "page",
  TEXT: "text"
};
var RelativeHorizontalPosition = {
  CENTER: "center",
  INSIDE: "inside",
  LEFT: "left",
  OUTSIDE: "outside",
  RIGHT: "right"
};
var RelativeVerticalPosition = {
  CENTER: "center",
  INSIDE: "inside",
  BOTTOM: "bottom",
  OUTSIDE: "outside",
  /**
  * In line with the text, with no text beside it. Word places a floating table lined up inline at the top of the
  * paragraph after it, with text beside it, so the table is written in line with the text instead.
  */
  INLINE: "inline",
  TOP: "top"
};
var OverlapType = {
  NEVER: "never",
  OVERLAP: "overlap"
};
var createTableFloatProperties = ({ horizontalAnchor, verticalAnchor, absoluteHorizontalPosition, relativeHorizontalPosition, absoluteVerticalPosition, relativeVerticalPosition, bottomFromText, topFromText, leftFromText, rightFromText }) => new BuilderElement({
  name: "w:tblpPr",
  attributes: {
    leftFromText: {
      key: "w:leftFromText",
      value: leftFromText === void 0 ? void 0 : twipsMeasureValue(leftFromText)
    },
    rightFromText: {
      key: "w:rightFromText",
      value: rightFromText === void 0 ? void 0 : twipsMeasureValue(rightFromText)
    },
    topFromText: {
      key: "w:topFromText",
      value: topFromText === void 0 ? void 0 : twipsMeasureValue(topFromText)
    },
    bottomFromText: {
      key: "w:bottomFromText",
      value: bottomFromText === void 0 ? void 0 : twipsMeasureValue(bottomFromText)
    },
    absoluteHorizontalPosition: {
      key: "w:tblpX",
      value: absoluteHorizontalPosition === void 0 ? void 0 : signedTwipsMeasureValue(absoluteHorizontalPosition)
    },
    absoluteVerticalPosition: {
      key: "w:tblpY",
      value: absoluteVerticalPosition === void 0 ? void 0 : signedTwipsMeasureValue(absoluteVerticalPosition)
    },
    horizontalAnchor: {
      key: "w:horzAnchor",
      value: horizontalAnchor
    },
    relativeHorizontalPosition: {
      key: "w:tblpXSpec",
      value: relativeHorizontalPosition
    },
    relativeVerticalPosition: {
      key: "w:tblpYSpec",
      value: relativeVerticalPosition
    },
    verticalAnchor: {
      key: "w:vertAnchor",
      value: verticalAnchor
    }
  }
});
var TableLayoutType = {
  /** Auto-fit layout - column widths are adjusted based on content */
  AUTOFIT: "autofit",
  /** Fixed layout - column widths are fixed as specified */
  FIXED: "fixed"
};
var createTableLayout = (type) => new BuilderElement({
  name: "w:tblLayout",
  attributes: { type: {
    key: "w:type",
    value: type
  } }
});
var CellSpacingType = {
  /** Value is in twentieths of a point */
  DXA: "dxa",
  /** No (empty) value. */
  NIL: "nil"
};
var createTableCellSpacing = ({ type = CellSpacingType.DXA, value }) => new BuilderElement({
  name: "w:tblCellSpacing",
  attributes: {
    type: {
      key: "w:type",
      value: type
    },
    value: {
      key: "w:w",
      value: measurementOrPercentValue(value)
    }
  }
});
var createTableLook = ({ firstRow, lastRow, firstColumn, lastColumn, noHBand, noVBand }) => new BuilderElement({
  name: "w:tblLook",
  attributes: {
    firstRow: {
      key: "w:firstRow",
      value: firstRow
    },
    lastRow: {
      key: "w:lastRow",
      value: lastRow
    },
    firstColumn: {
      key: "w:firstColumn",
      value: firstColumn
    },
    lastColumn: {
      key: "w:lastColumn",
      value: lastColumn
    },
    noHBand: {
      key: "w:noHBand",
      value: noHBand
    },
    noVBand: {
      key: "w:noVBand",
      value: noVBand
    }
  }
});
var createTableOverlap = (overlap) => new BuilderElement({
  name: "w:tblOverlap",
  attributes: { val: {
    key: "w:val",
    value: overlap
  } }
});
var INLINE_ALIGNMENTS = {
  [RelativeHorizontalPosition.LEFT]: AlignmentType.LEFT,
  [RelativeHorizontalPosition.CENTER]: AlignmentType.CENTER,
  [RelativeHorizontalPosition.RIGHT]: AlignmentType.RIGHT
};
var TableProperties = class extends IgnoreIfEmptyXmlComponent {
  constructor(options) {
    var _options$float, _options$alignment, _options$float2;
    super("w:tblPr", options.includeIfEmpty);
    if (options.style) this.root.push(new StringValueElement("w:tblStyle", options.style));
    const inline = ((_options$float = options.float) === null || _options$float === void 0 ? void 0 : _options$float.relativeVerticalPosition) === RelativeVerticalPosition.INLINE;
    const float = inline ? void 0 : options.float;
    if (float) this.root.push(createTableFloatProperties(float));
    if (float === null || float === void 0 ? void 0 : float.overlap) this.root.push(createTableOverlap(float.overlap));
    if (options.visuallyRightToLeft !== void 0) this.root.push(createOnOffOnlyElement("w:bidiVisual", options.visuallyRightToLeft));
    if (options.width) this.root.push(createTableWidthElement("w:tblW", options.width));
    const alignment = (_options$alignment = options.alignment) !== null && _options$alignment !== void 0 ? _options$alignment : inline && ((_options$float2 = options.float) === null || _options$float2 === void 0 ? void 0 : _options$float2.relativeHorizontalPosition) ? INLINE_ALIGNMENTS[options.float.relativeHorizontalPosition] : void 0;
    if (alignment) this.root.push(createAlignment(alignment));
    if (options.cellSpacing) this.root.push(createTableCellSpacing(options.cellSpacing));
    if (options.indent) this.root.push(createTableWidthElement("w:tblInd", options.indent));
    if (options.borders) this.root.push(new TableBorders(options.borders, { fillMissingSides: !options.style }));
    if (options.shading) this.root.push(createShading(options.shading));
    if (options.layout) this.root.push(createTableLayout(options.layout));
    if (options.cellMargin) {
      const cellMargin = createTableCellMargin(options.cellMargin);
      if (cellMargin) this.root.push(cellMargin);
    }
    if (options.tableLook) this.root.push(createTableLook(options.tableLook));
    if (options.revision) this.root.push(new TablePropertiesChange(options.revision));
  }
};
var TablePropertiesChange = class extends XmlComponent {
  constructor(options) {
    super("w:tblPrChange");
    this.root.push(new ChangeAttributes({
      id: options.id,
      author: options.author,
      date: options.date
    }));
    this.root.push(new TableProperties(_objectSpread2(_objectSpread2({}, options), {}, { includeIfEmpty: true })));
  }
};
var HeightRule = {
  /** Height is determined based on the content, so value is ignored. */
  AUTO: "auto",
  /** At least the value specified */
  ATLEAST: "atLeast",
  /** Exactly the value specified */
  EXACT: "exact"
};
var createTableRowHeight = (value, rule) => new BuilderElement({
  name: "w:trHeight",
  attributes: {
    value: {
      key: "w:val",
      value: twipsMeasureValue(value)
    },
    rule: {
      key: "w:hRule",
      value: rule
    }
  }
});
var TableRowProperties = class extends IgnoreIfEmptyXmlComponent {
  constructor(options) {
    super("w:trPr", options.includeIfEmpty);
    if (options.cantSplit !== void 0) this.root.push(createOnOffOnlyElement("w:cantSplit", options.cantSplit));
    if (options.tableHeader !== void 0) this.root.push(createOnOffOnlyElement("w:tblHeader", options.tableHeader));
    if (options.height) this.root.push(createTableRowHeight(options.height.value, options.height.rule));
    if (options.cellSpacing) this.root.push(createTableCellSpacing(options.cellSpacing));
    if (options.insertion) this.root.push(new InsertedTableRow(options.insertion));
    if (options.deletion) this.root.push(new DeletedTableRow(options.deletion));
    if (options.revision) this.root.push(new TableRowPropertiesChange(options.revision));
  }
};
var TableRowPropertiesChange = class extends XmlComponent {
  constructor(options) {
    super("w:trPrChange");
    this.root.push(new ChangeAttributes({
      id: options.id,
      author: options.author,
      date: options.date
    }));
    this.root.push(new TableRowProperties(_objectSpread2(_objectSpread2({}, options), {}, { includeIfEmpty: true })));
  }
};
var childrenOf = (element, name) => {
  const content = element[name];
  return Array.isArray(content) ? content : [];
};
var nameOf$2 = (element) => Object.keys(element)[0];
var withKeepNext = (paragraph, keepNext) => {
  const children = childrenOf(paragraph, "w:p");
  const properties = children.find((child2) => nameOf$2(child2) === "w:pPr");
  if (!properties) return { "w:p": [{ "w:pPr": [keepNext] }, ...children] };
  const settings = childrenOf(properties, "w:pPr");
  if (settings.some((setting) => nameOf$2(setting) === "w:keepNext")) return paragraph;
  const before = settings.filter((setting) => nameOf$2(setting) === "w:pStyle").length;
  const newProperties = { "w:pPr": [
    ...settings.slice(0, before),
    keepNext,
    ...settings.slice(before)
  ] };
  return { "w:p": children.map((child2) => child2 === properties ? newProperties : child2) };
};
var TableRow = class extends XmlComponent {
  constructor(options) {
    super("w:tr");
    _defineProperty(this, "options", void 0);
    this.options = options;
    this.root.push(new TableRowProperties(options));
    for (const child2 of options.children) this.root.push(child2);
  }
  prepForXml(context) {
    if (this.cells.length === 0) return;
    const xml = super.prepForXml(context);
    if (!xml || this.options.keepNext === void 0) return xml;
    const keepNext = new OnOffElement("w:keepNext", this.options.keepNext).prepForXml(context);
    return { "w:tr": childrenOf(xml, "w:tr").map((child2) => nameOf$2(child2) === "w:tc" ? { "w:tc": childrenOf(child2, "w:tc").map((content) => nameOf$2(content) === "w:p" ? withKeepNext(content, keepNext) : content) } : child2) };
  }
  get CellCount() {
    return this.options.children.length;
  }
  get cells() {
    return this.root.filter((xmlComponent) => elementOf(xmlComponent) === "w:tc");
  }
  addCellToIndex(cell, index) {
    this.root.splice(index + 1, 0, cell);
  }
  addCellToColumnIndex(cell, columnIndex) {
    const rootIndex = this.columnIndexToRootIndex(columnIndex, true);
    this.addCellToIndex(cell, rootIndex - 1);
  }
  rootIndexToColumnIndex(rootIndex) {
    if (rootIndex < 1 || rootIndex >= this.root.length) throw new Error(`cell 'rootIndex' should between 1 to ${this.root.length - 1}`);
    let colIdx = 0;
    for (let rootIdx = 1; rootIdx < rootIndex; rootIdx++) {
      const cell = this.root[rootIdx];
      colIdx += cell.options.columnSpan || 1;
    }
    return colIdx;
  }
  columnIndexToRootIndex(columnIndex, allowEndNewCell = false) {
    if (columnIndex < 0) throw new Error(`cell 'columnIndex' should not less than zero`);
    let colIdx = 0;
    let rootIdx = 1;
    while (colIdx <= columnIndex) {
      if (rootIdx >= this.root.length) {
        if (allowEndNewCell) return this.root.length;
        else throw new Error(`cell 'columnIndex' should not great than ${colIdx - 1}`);
      }
      const cell = this.root[rootIdx];
      rootIdx += 1;
      colIdx += cell && cell.options.columnSpan || 1;
    }
    return rootIdx - 1;
  }
};
var Table = class Table2 extends FileChild {
  constructor({ rows, width, columnWidths, columnWidthsRevision, margins, indent, float, layout, style, borders, alignment, visuallyRightToLeft, tableLook, cellSpacing, revision }) {
    super("w:tbl");
    _defineProperty(this, "rows", void 0);
    _defineProperty(this, "width", void 0);
    _defineProperty(this, "columnWidths", void 0);
    _defineProperty(this, "columnWidthsRevision", void 0);
    _defineProperty(
      this,
      /**
      * Grid column widths in twips: the explicit `columnWidths`, or the widths derived
      * from the table and cell widths (re-resolved against the actual page or parent
      * cell every time the table is serialized).
      */
      "resolvedColumnWidths",
      void 0
    );
    this.rows = rows;
    this.width = width !== null && width !== void 0 ? width : { size: 100 };
    this.columnWidths = columnWidths;
    this.columnWidthsRevision = columnWidthsRevision;
    rows.forEach((row, rowIndex) => {
      if (rowIndex === rows.length - 1) return;
      let columnIndex = 0;
      row.cells.forEach((cell) => {
        if (cell.options.rowSpan && cell.options.rowSpan > 1) {
          const lastChild = cell.options.children[cell.options.children.length - 1];
          const continueCell = new TableCell({
            rowSpan: cell.options.rowSpan - 1,
            columnSpan: cell.options.columnSpan,
            width: cell.options.width,
            borders: cell.options.borders,
            shading: cell.options.shading,
            margins: cell.options.margins,
            textDirection: cell.options.textDirection,
            verticalAlign: cell.options.verticalAlign,
            children: lastChild instanceof Paragraph ? [new Paragraph(lastChild.Alignment)] : [],
            verticalMerge: VerticalMergeType.CONTINUE
          });
          rows[rowIndex + 1].addCellToColumnIndex(continueCell, columnIndex);
        }
        columnIndex += cell.options.columnSpan || 1;
      });
    });
    this.setCellWidths(DEFAULT_AVAILABLE_WIDTH);
    this.resolvedColumnWidths = columnWidths !== null && columnWidths !== void 0 ? columnWidths : resolveColumnWidths({
      rows,
      width: this.width,
      availableWidth: DEFAULT_AVAILABLE_WIDTH
    });
    this.root.push(new TableProperties({
      borders: style ? borders : borders !== null && borders !== void 0 ? borders : {},
      width: this.width,
      indent,
      float,
      layout,
      style,
      alignment,
      cellMargin: margins,
      visuallyRightToLeft,
      tableLook,
      cellSpacing,
      revision
    }));
    this.root.push(new TableGrid(this.resolvedColumnWidths, columnWidthsRevision));
    for (const row of rows) this.root.push(row);
  }
  /**
  * Widths of the grid columns in twips, as they will be written to `w:tblGrid`.
  *
  * These are the explicit `columnWidths` when given, otherwise the widths derived
  * from the table and cell widths. Derived widths are resolved against the page (or
  * the parent cell for nested tables) during serialization, so before that they
  * reflect the default page size.
  */
  get ColumnWidths() {
    return this.resolvedColumnWidths;
  }
  /**
  * Width in twips, according to the grid, of a cell in one of this table's rows.
  *
  * Used by nested tables to resolve their own widths against the cell they sit in.
  *
  * @param row - A row of this table
  * @param cell - A cell of that row
  * @returns The summed width of the grid columns the cell spans, or undefined if the cell cannot be located on the grid
  */
  getCellWidth(row, cell) {
    const { cells } = row;
    const cellIndex = cells.indexOf(cell);
    if (cellIndex === -1) return;
    const start = cells.slice(0, cellIndex).reduce((column, previous) => column + (previous.options.columnSpan || 1), 0);
    const columns = this.resolvedColumnWidths.slice(start, start + (cell.options.columnSpan || 1));
    return columns.length === 0 ? void 0 : columns.reduce((sum, columnWidth) => sum + columnWidth, 0);
  }
  /**
  * Resolves derived grid column widths against the width actually available to the
  * table (the section's text width, or the parent cell for nested tables) before
  * serializing.
  */
  prepForXml(context) {
    this.setCellWidths(this.resolveAvailableWidth(context));
    if (this.columnWidths === void 0) {
      this.resolvedColumnWidths = resolveColumnWidths({
        rows: this.rows,
        width: this.width,
        availableWidth: this.resolveAvailableWidth(context)
      });
      const gridIndex = this.root.findIndex((component) => component instanceof TableGrid);
      this.root[gridIndex] = new TableGrid(this.resolvedColumnWidths, this.columnWidthsRevision);
    }
    return super.prepForXml(context);
  }
  /**
  * Gives each cell without a width of its own the width of the `columnWidths` it spans, as Word sizes the columns of
  * cells without a width to their content, whatever the grid says. When the table's width is wider than the columns
  * add up to, they are scaled up to fill it, as Word and LibreOffice lay them out, so columns given as proportions
  * keep them.
  */
  setCellWidths(availableWidth) {
    var _resolvePreferredWidt;
    if (this.columnWidths === void 0) return;
    const total = this.columnWidths.reduce((sum, columnWidth) => sum + columnWidth, 0);
    const tableWidth = (_resolvePreferredWidt = resolvePreferredWidth(this.width, availableWidth)) !== null && _resolvePreferredWidt !== void 0 ? _resolvePreferredWidt : 0;
    const scale = total > 0 && tableWidth > total ? tableWidth / total : 1;
    for (const row of this.rows) {
      let column = 0;
      for (const cell of row.cells) {
        const span = cell.options.columnSpan || 1;
        const spanned = this.columnWidths.slice(column, column + span);
        const cellWidth = Math.round(spanned.reduce((sum, columnWidth) => sum + columnWidth, 0) * scale);
        if (spanned.length === span && cellWidth > 0) cell.setColumnWidth(cellWidth);
        column += span;
      }
    }
  }
  /**
  * Finds the width in twips available to this table from the serialization context:
  * the parent cell for a nested table, otherwise the text width of the section the
  * table belongs to (the first section for headers, footers and other parts). Falls
  * back to the default page when the context carries no document.
  */
  resolveAvailableWidth(context) {
    var _context$file, _stack, _section$AvailableTex;
    const { stack } = context;
    const cell = stack[stack.length - 1];
    const row = stack[stack.length - 2];
    const parentTable = stack[stack.length - 3];
    if (cell instanceof TableCell && row instanceof TableRow && parentTable instanceof Table2) {
      const cellWidth = parentTable.getCellWidth(row, cell);
      if (cellWidth !== void 0) return cellWidth;
    }
    const bodyIndex = stack.findIndex((component) => component instanceof Body);
    const documentBody = (_context$file = context.file) === null || _context$file === void 0 || (_context$file = _context$file.Document) === null || _context$file === void 0 ? void 0 : _context$file.View.Body;
    const section = bodyIndex >= 0 ? stack[bodyIndex].getSectionPropertiesFor((_stack = stack[bodyIndex + 1]) !== null && _stack !== void 0 ? _stack : this) : documentBody === null || documentBody === void 0 ? void 0 : documentBody.getSectionPropertiesFor();
    return (_section$AvailableTex = section === null || section === void 0 ? void 0 : section.AvailableTextWidth) !== null && _section$AvailableTex !== void 0 ? _section$AvailableTex : DEFAULT_AVAILABLE_WIDTH;
  }
};
var AppPropertiesAttributes = class extends XmlAttributeComponent {
  constructor(..._args) {
    super(..._args);
    _defineProperty(this, "xmlKeys", {
      xmlns: "xmlns",
      vt: "xmlns:vt"
    });
  }
};
var AppProperties = class extends XmlComponent {
  constructor() {
    super("Properties");
    this.root.push(new AppPropertiesAttributes({
      xmlns: "http://schemas.openxmlformats.org/officeDocument/2006/extended-properties",
      vt: "http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"
    }));
  }
};
var ContentTypeAttributes = class extends XmlAttributeComponent {
  constructor(..._args) {
    super(..._args);
    _defineProperty(this, "xmlKeys", { xmlns: "xmlns" });
  }
};
var createDefault = (contentType, extension) => new BuilderElement({
  name: "Default",
  attributes: {
    contentType: {
      key: "ContentType",
      value: contentType
    },
    extension: {
      key: "Extension",
      value: extension
    }
  }
});
var createOverride = (contentType, partName) => new BuilderElement({
  name: "Override",
  attributes: {
    contentType: {
      key: "ContentType",
      value: contentType
    },
    partName: {
      key: "PartName",
      value: partName
    }
  }
});
var ContentTypes = class extends XmlComponent {
  /**
  * @param options.macros - Whether the document has VBA macros, which makes its main part a macro-enabled document
  * and adds the VBA project (word/vbaProject.bin)
  */
  constructor({ macros = false } = {}) {
    super("Types");
    this.root.push(new ContentTypeAttributes({ xmlns: "http://schemas.openxmlformats.org/package/2006/content-types" }));
    this.root.push(createDefault("image/png", "png"));
    this.root.push(createDefault("image/jpeg", "jpeg"));
    this.root.push(createDefault("image/jpeg", "jpg"));
    this.root.push(createDefault("image/bmp", "bmp"));
    this.root.push(createDefault("image/gif", "gif"));
    this.root.push(createDefault("image/svg+xml", "svg"));
    this.root.push(createDefault("application/vnd.openxmlformats-package.relationships+xml", "rels"));
    this.root.push(createDefault("application/xml", "xml"));
    this.root.push(createDefault("application/vnd.openxmlformats-officedocument.obfuscatedFont", "odttf"));
    this.root.push(createOverride(macros ? "application/vnd.ms-word.document.macroEnabled.main+xml" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml", "/word/document.xml"));
    this.root.push(createOverride("application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml", "/word/styles.xml"));
    this.root.push(createOverride("application/vnd.openxmlformats-package.core-properties+xml", "/docProps/core.xml"));
    this.root.push(createOverride("application/vnd.openxmlformats-officedocument.custom-properties+xml", "/docProps/custom.xml"));
    this.root.push(createOverride("application/vnd.openxmlformats-officedocument.extended-properties+xml", "/docProps/app.xml"));
    this.root.push(createOverride("application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml", "/word/numbering.xml"));
    this.root.push(createOverride("application/vnd.openxmlformats-officedocument.wordprocessingml.footnotes+xml", "/word/footnotes.xml"));
    this.root.push(createOverride("application/vnd.openxmlformats-officedocument.wordprocessingml.endnotes+xml", "/word/endnotes.xml"));
    this.root.push(createOverride("application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml", "/word/settings.xml"));
    this.root.push(createOverride("application/vnd.openxmlformats-officedocument.wordprocessingml.fontTable+xml", "/word/fontTable.xml"));
    this.root.push(createOverride("application/vnd.openxmlformats-officedocument.theme+xml", "/word/theme/theme1.xml"));
    if (macros) this.root.push(createOverride("application/vnd.ms-office.vbaProject", "/word/vbaProject.bin"));
  }
  /**
  * Registers the comments part in the content types.
  */
  addComments() {
    this.root.push(createOverride("application/vnd.openxmlformats-officedocument.wordprocessingml.comments+xml", "/word/comments.xml"));
  }
  /**
  * Registers the commentsExtended part in the content types.
  */
  addCommentsExtended() {
    this.root.push(createOverride("application/vnd.openxmlformats-officedocument.wordprocessingml.commentsExtended+xml", "/word/commentsExtended.xml"));
  }
  /**
  * Registers the commentsIds part in the content types.
  */
  addCommentsIds() {
    this.root.push(createOverride("application/vnd.openxmlformats-officedocument.wordprocessingml.commentsIds+xml", "/word/commentsIds.xml"));
  }
  /**
  * Registers a footer part in the content types.
  *
  * @param index - Footer index number (e.g., 1 for footer1.xml)
  */
  addFooter(index) {
    this.root.push(createOverride("application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml", `/word/footer${index}.xml`));
  }
  /**
  * Registers a part by its name, such as a chart or an embedded workbook that a drawing adds to the package.
  *
  * @param contentType - The part's content type
  * @param partName - The part's name, from the root of the package, such as "/word/charts/chart1.xml"
  */
  addOverride(contentType, partName) {
    this.root.push(createOverride(contentType, partName));
  }
  /**
  * Registers a header part in the content types.
  *
  * @param index - Header index number (e.g., 1 for header1.xml)
  */
  addHeader(index) {
    this.root.push(createOverride("application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml", `/word/header${index}.xml`));
  }
};
var DocumentAttributeNamespaces = {
  wpc: "http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas",
  mc: "http://schemas.openxmlformats.org/markup-compatibility/2006",
  o: "urn:schemas-microsoft-com:office:office",
  r: "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
  m: "http://schemas.openxmlformats.org/officeDocument/2006/math",
  v: "urn:schemas-microsoft-com:vml",
  wp14: "http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing",
  wp: "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing",
  w10: "urn:schemas-microsoft-com:office:word",
  w: "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
  w14: "http://schemas.microsoft.com/office/word/2010/wordml",
  w15: "http://schemas.microsoft.com/office/word/2012/wordml",
  wpg: "http://schemas.microsoft.com/office/word/2010/wordprocessingGroup",
  wpi: "http://schemas.microsoft.com/office/word/2010/wordprocessingInk",
  wne: "http://schemas.microsoft.com/office/word/2006/wordml",
  wps: "http://schemas.microsoft.com/office/word/2010/wordprocessingShape",
  cp: "http://schemas.openxmlformats.org/package/2006/metadata/core-properties",
  dc: "http://purl.org/dc/elements/1.1/",
  dcterms: "http://purl.org/dc/terms/",
  dcmitype: "http://purl.org/dc/dcmitype/",
  xsi: "http://www.w3.org/2001/XMLSchema-instance",
  cx: "http://schemas.microsoft.com/office/drawing/2014/chartex",
  cx1: "http://schemas.microsoft.com/office/drawing/2015/9/8/chartex",
  cx2: "http://schemas.microsoft.com/office/drawing/2015/10/21/chartex",
  cx3: "http://schemas.microsoft.com/office/drawing/2016/5/9/chartex",
  cx4: "http://schemas.microsoft.com/office/drawing/2016/5/10/chartex",
  cx5: "http://schemas.microsoft.com/office/drawing/2016/5/11/chartex",
  cx6: "http://schemas.microsoft.com/office/drawing/2016/5/12/chartex",
  cx7: "http://schemas.microsoft.com/office/drawing/2016/5/13/chartex",
  cx8: "http://schemas.microsoft.com/office/drawing/2016/5/14/chartex",
  aink: "http://schemas.microsoft.com/office/drawing/2016/ink",
  am3d: "http://schemas.microsoft.com/office/drawing/2017/model3d",
  w16cex: "http://schemas.microsoft.com/office/word/2018/wordml/cex",
  w16cid: "http://schemas.microsoft.com/office/word/2016/wordml/cid",
  w16: "http://schemas.microsoft.com/office/word/2018/wordml",
  w16sdtdh: "http://schemas.microsoft.com/office/word/2020/wordml/sdtdatahash",
  w16se: "http://schemas.microsoft.com/office/word/2015/wordml/symex"
};
var DocumentAttributes = class extends XmlAttributeComponent {
  constructor(ns, Ignorable) {
    super(_objectSpread2({ Ignorable }, Object.fromEntries(ns.map((n) => [n, DocumentAttributeNamespaces[n]]))));
    _defineProperty(this, "xmlKeys", _objectSpread2({ Ignorable: "mc:Ignorable" }, Object.fromEntries(Object.keys(DocumentAttributeNamespaces).map((key) => [key, `xmlns:${key}`]))));
  }
};
var CoreProperties = class extends XmlComponent {
  constructor(options) {
    super("cp:coreProperties");
    this.root.push(new DocumentAttributes([
      "cp",
      "dc",
      "dcterms",
      "dcmitype",
      "xsi"
    ]));
    if (options.title) this.root.push(new StringContainer("dc:title", options.title));
    if (options.subject) this.root.push(new StringContainer("dc:subject", options.subject));
    if (options.creator) this.root.push(new StringContainer("dc:creator", options.creator));
    if (options.keywords) this.root.push(new StringContainer("cp:keywords", options.keywords));
    if (options.description) this.root.push(new StringContainer("dc:description", options.description));
    if (options.lastModifiedBy) this.root.push(new StringContainer("cp:lastModifiedBy", options.lastModifiedBy));
    if (options.revision) this.root.push(new StringContainer("cp:revision", String(options.revision)));
    this.root.push(new TimestampElement("dcterms:created"));
    this.root.push(new TimestampElement("dcterms:modified"));
  }
};
var TimestampElementProperties = class extends XmlAttributeComponent {
  constructor(..._args) {
    super(..._args);
    _defineProperty(this, "xmlKeys", { type: "xsi:type" });
  }
};
var TimestampElement = class extends XmlComponent {
  constructor(name) {
    super(name);
    this.root.push(new TimestampElementProperties({ type: "dcterms:W3CDTF" }));
    this.root.push(dateTimeValue(/* @__PURE__ */ new Date()));
  }
};
var CustomPropertiesAttributes = class extends XmlAttributeComponent {
  constructor(..._args) {
    super(..._args);
    _defineProperty(this, "xmlKeys", {
      xmlns: "xmlns",
      vt: "xmlns:vt"
    });
  }
};
var CustomPropertyAttributes = class extends XmlAttributeComponent {
  constructor(..._args) {
    super(..._args);
    _defineProperty(this, "xmlKeys", {
      formatId: "fmtid",
      pid: "pid",
      name: "name"
    });
  }
};
var CustomProperty = class extends XmlComponent {
  constructor(id, properties) {
    super("property");
    this.root.push(new CustomPropertyAttributes({
      formatId: "{D5CDD505-2E9C-101B-9397-08002B2CF9AE}",
      pid: id.toString(),
      name: properties.name
    }));
    this.root.push(new CustomPropertyValue(properties.value));
  }
};
var CustomPropertyValue = class extends XmlComponent {
  constructor(value) {
    super("vt:lpwstr");
    this.root.push(value);
  }
};
var CustomProperties = class extends XmlComponent {
  constructor(properties) {
    super("Properties");
    _defineProperty(this, "nextId", void 0);
    _defineProperty(this, "properties", []);
    this.root.push(new CustomPropertiesAttributes({
      xmlns: "http://schemas.openxmlformats.org/officeDocument/2006/custom-properties",
      vt: "http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"
    }));
    this.nextId = 2;
    for (const property of properties) this.addCustomProperty(property);
  }
  prepForXml(context) {
    this.root.splice(1, this.root.length - 1, ...this.properties);
    return super.prepForXml(context);
  }
  addCustomProperty(property) {
    this.properties.push(new CustomProperty(this.nextId++, property));
  }
};
var ColumnAttributes = class extends XmlAttributeComponent {
  constructor(..._args) {
    super(..._args);
    _defineProperty(this, "xmlKeys", {
      width: "w:w",
      space: "w:space"
    });
  }
};
var Column = class extends XmlComponent {
  constructor(options) {
    super("w:col");
    this.root.push(new ColumnAttributes({
      width: twipsMeasureValue(options.width),
      space: options.space === void 0 ? void 0 : twipsMeasureValue(options.space)
    }));
  }
};
var createSourcesProperties = (itemId) => new BuilderElement({
  name: "ds:datastoreItem",
  attributes: {
    itemId: {
      key: "ds:itemID",
      value: itemId
    },
    namespace: {
      key: "xmlns:ds",
      value: "http://schemas.openxmlformats.org/officeDocument/2006/customXml"
    }
  },
  children: [new BuilderElement({
    name: "ds:schemaRefs",
    children: [new BuilderElement({
      name: "ds:schemaRef",
      attributes: { uri: {
        key: "ds:uri",
        value: "http://schemas.openxmlformats.org/officeDocument/2006/bibliography"
      } }
    })]
  })]
});
var EVENT_ELEMENTS = {
  new: "wne:eventDocNew",
  open: "wne:eventDocOpen",
  close: "wne:eventDocClose",
  sync: "wne:eventDocSync",
  xmlAfterInsert: "wne:eventDocXmlAfterInsert",
  xmlBeforeDelete: "wne:eventDocXmlBeforeDelete",
  contentControlAfterAdd: "wne:eventDocContentControlAfterInsert",
  contentControlBeforeDelete: "wne:eventDocContentControlBeforeDelete",
  contentControlOnExit: "wne:eventDocContentControlOnExit",
  contentControlOnEnter: "wne:eventDocContentControlOnEnter",
  contentControlBeforeStoreUpdate: "wne:eventDocStoreUpdate",
  contentControlBeforeContentUpdate: "wne:eventDocContentControlContentUpdate",
  buildingBlockInsert: "wne:eventDocBuildingBlockAfterInsert"
};
var createMacroEvents = (events) => new BuilderElement({
  name: "wne:vbaSuppData",
  attributes: { namespace: {
    key: "xmlns:wne",
    value: "http://schemas.microsoft.com/office/word/2006/wordml"
  } },
  children: [new BuilderElement({
    name: "wne:docEvents",
    children: Object.entries(EVENT_ELEMENTS).filter(([event]) => events.includes(event)).map(([, name]) => new BuilderElement({ name }))
  })]
});
var DocumentBackgroundAttributes = class extends XmlAttributeComponent {
  constructor(..._args) {
    super(..._args);
    _defineProperty(this, "xmlKeys", {
      color: "w:color",
      themeColor: "w:themeColor",
      themeShade: "w:themeShade",
      themeTint: "w:themeTint"
    });
  }
};
var DocumentBackground = class extends XmlComponent {
  /**
  * @throws If a color isn't valid, or `color` is a theme color and `themeColor`, `themeShade` or `themeTint` is given
  */
  constructor({ color, themeColor, themeShade, themeTint }) {
    super("w:background");
    if (typeof color === "object" && (themeColor !== void 0 || themeShade !== void 0 || themeTint !== void 0)) throw new Error("Invalid background. Expected a theme color in color, or themeColor, themeShade and themeTint, not both");
    this.root.push(new ColorAttributeComponent([
      {
        keys: COLOR_ATTRIBUTES,
        color
      },
      {
        key: "w:themeColor",
        value: themeColor
      },
      {
        key: "w:themeShade",
        value: themeShade === void 0 ? void 0 : uCharHexNumber(themeShade)
      },
      {
        key: "w:themeTint",
        value: themeTint === void 0 ? void 0 : uCharHexNumber(themeTint)
      }
    ]));
  }
};
var Document = class extends XmlComponent {
  constructor(options) {
    super("w:document");
    _defineProperty(this, "body", void 0);
    this.root.push(new DocumentAttributes([
      "wpc",
      "mc",
      "o",
      "r",
      "m",
      "v",
      "wp14",
      "wp",
      "w10",
      "w",
      "w14",
      "w15",
      "wpg",
      "wpi",
      "wne",
      "wps",
      "cx",
      "cx1",
      "cx2",
      "cx3",
      "cx4",
      "cx5",
      "cx6",
      "cx7",
      "cx8",
      "aink",
      "am3d",
      "w16cex",
      "w16cid",
      "w16",
      "w16sdtdh",
      "w16se"
    ], "w14 w15 wp14"));
    this.body = new Body({ pageNumbers: options.pageNumbers });
    if (options.background) this.root.push(new DocumentBackground(options.background));
    this.root.push(this.body);
  }
  /**
  * Adds a block-level element to the document body.
  *
  * @param item - The element to add (paragraph, table, table of contents, hyperlink, or any other file child)
  * @returns The Document instance for method chaining
  */
  add(item) {
    this.body.push(item);
    return this;
  }
  /**
  * Gets the document body element.
  *
  * @returns The Body instance containing all document content
  */
  get Body() {
    return this.body;
  }
};
var DocumentWrapper = class {
  constructor(options) {
    _defineProperty(this, "document", void 0);
    _defineProperty(this, "relationships", void 0);
    this.document = new Document(options);
    this.relationships = new Relationships();
  }
  get View() {
    return this.document;
  }
  get Relationships() {
    return this.relationships;
  }
};
var EndnotesAttributes = class extends XmlAttributeComponent {
  constructor(..._args) {
    super(..._args);
    _defineProperty(this, "xmlKeys", {
      wpc: "xmlns:wpc",
      mc: "xmlns:mc",
      o: "xmlns:o",
      r: "xmlns:r",
      m: "xmlns:m",
      v: "xmlns:v",
      wp14: "xmlns:wp14",
      wp: "xmlns:wp",
      w10: "xmlns:w10",
      w: "xmlns:w",
      w14: "xmlns:w14",
      w15: "xmlns:w15",
      wpg: "xmlns:wpg",
      wpi: "xmlns:wpi",
      wne: "xmlns:wne",
      wps: "xmlns:wps",
      Ignorable: "mc:Ignorable"
    });
  }
};
var FirstNoteParagraph = class extends XmlComponent {
  constructor(paragraph, mark) {
    super("w:p");
    _defineProperty(this, "paragraph", void 0);
    _defineProperty(this, "mark", void 0);
    this.paragraph = paragraph;
    this.mark = mark;
  }
  prepForXml(context) {
    const content = this.paragraph.prepForXml(context)["w:p"];
    const children = Array.isArray(content) ? content : [];
    const index = children.length > 0 && "w:pPr" in children[0] ? 1 : 0;
    return { "w:p": [
      ...children.slice(0, index),
      this.mark.prepForXml(context),
      ...children.slice(index)
    ] };
  }
};
var EndnoteAttributes = class extends XmlAttributeComponent {
  constructor(..._args) {
    super(..._args);
    _defineProperty(this, "xmlKeys", {
      type: "w:type",
      id: "w:id"
    });
  }
};
var EndnoteRefRun = class extends Run {
  constructor() {
    super({ style: "EndnoteReference" });
    this.root.push(new EndnoteReference());
  }
};
var EndnoteType = {
  SEPARATOR: "separator",
  CONTINUATION_SEPARATOR: "continuationSeparator"
};
var Endnote = class extends XmlComponent {
  constructor(options) {
    super("w:endnote");
    this.root.push(new EndnoteAttributes({
      type: options.type,
      id: options.id
    }));
    for (const [index, child2] of options.children.entries()) this.root.push(index === 0 ? new FirstNoteParagraph(child2, new EndnoteRefRun()) : child2);
  }
};
var ContinuationSeperator = class extends XmlComponent {
  constructor() {
    super("w:continuationSeparator");
  }
};
var ContinuationSeperatorRun = class extends Run {
  constructor() {
    super({});
    this.root.push(new ContinuationSeperator());
  }
};
var Seperator = class extends XmlComponent {
  constructor() {
    super("w:separator");
  }
};
var SeperatorRun = class extends Run {
  constructor() {
    super({});
    this.root.push(new Seperator());
  }
};
var Endnotes = class extends XmlComponent {
  constructor() {
    super("w:endnotes");
    _defineProperty(this, "ownNotes", /* @__PURE__ */ new Map());
    _defineProperty(this, "highestId", 0);
    this.root.push(new EndnotesAttributes({
      wpc: "http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas",
      mc: "http://schemas.openxmlformats.org/markup-compatibility/2006",
      o: "urn:schemas-microsoft-com:office:office",
      r: "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
      m: "http://schemas.openxmlformats.org/officeDocument/2006/math",
      v: "urn:schemas-microsoft-com:vml",
      wp14: "http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing",
      wp: "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing",
      w10: "urn:schemas-microsoft-com:office:word",
      w: "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
      w14: "http://schemas.microsoft.com/office/word/2010/wordml",
      w15: "http://schemas.microsoft.com/office/word/2012/wordml",
      wpg: "http://schemas.microsoft.com/office/word/2010/wordprocessingGroup",
      wpi: "http://schemas.microsoft.com/office/word/2010/wordprocessingInk",
      wne: "http://schemas.microsoft.com/office/word/2006/wordml",
      wps: "http://schemas.microsoft.com/office/word/2010/wordprocessingShape",
      Ignorable: "w14 w15 wp14"
    }));
    const begin = new Endnote({
      id: -1,
      type: EndnoteType.SEPARATOR,
      children: [new Paragraph({
        spacing: {
          after: 0,
          line: 240,
          lineRule: LineRuleType.AUTO
        },
        children: [new SeperatorRun()]
      })]
    });
    this.root.push(begin);
    const spacing = new Endnote({
      id: 0,
      type: EndnoteType.CONTINUATION_SEPARATOR,
      children: [new Paragraph({
        spacing: {
          after: 0,
          line: 240,
          lineRule: LineRuleType.AUTO
        },
        children: [new ContinuationSeperatorRun()]
      })]
    });
    this.root.push(spacing);
  }
  createEndnote(id, paragraph) {
    const endnote = new Endnote({
      id,
      children: paragraph
    });
    this.root.push(endnote);
    if (Number.isFinite(id)) this.highestId = Math.max(this.highestId, Math.floor(id));
  }
  /**
  * The id of the endnote that a reference run brings with it, which is added to the endnotes the first time the run
  * is written, with an id no other endnote has. Word has endnotes only in a document's body, so a run written
  * anywhere else, such as in a header, has none, and its endnote isn't added.
  *
  * @internal
  * @param reference - The run, which has the same endnote each time it is written
  * @param endnote - The endnote's content
  * @param context - The context the run is written in
  * @returns The endnote's id, or undefined outside the document's body
  */
  idOf(reference, endnote, context) {
    if (context.viewWrapper !== context.file.Document) return;
    const existing = this.ownNotes.get(reference);
    if (existing !== void 0) return existing;
    const id = this.highestId + 1;
    this.createEndnote(id, endnote.children);
    this.ownNotes.set(reference, id);
    return id;
  }
  /**
  * Formats the endnotes, with the page numbers worked out for their document written into their fields, when the
  * document's body is written with an estimate of its pages.
  */
  prepForXml(context) {
    const xml = super.prepForXml(context);
    fillPartPageNumbers(xml, context);
    return xml;
  }
};
var EndnotesWrapper = class {
  constructor() {
    _defineProperty(this, "endnotes", void 0);
    _defineProperty(this, "relationships", void 0);
    this.endnotes = new Endnotes();
    this.relationships = new Relationships();
  }
  get View() {
    return this.endnotes;
  }
  get Relationships() {
    return this.relationships;
  }
};
var FooterAttributes = class extends XmlAttributeComponent {
  constructor(..._args) {
    super(..._args);
    _defineProperty(this, "xmlKeys", {
      wpc: "xmlns:wpc",
      mc: "xmlns:mc",
      o: "xmlns:o",
      r: "xmlns:r",
      m: "xmlns:m",
      v: "xmlns:v",
      wp14: "xmlns:wp14",
      wp: "xmlns:wp",
      w10: "xmlns:w10",
      w: "xmlns:w",
      w14: "xmlns:w14",
      w15: "xmlns:w15",
      wpg: "xmlns:wpg",
      wpi: "xmlns:wpi",
      wne: "xmlns:wne",
      wps: "xmlns:wps",
      cp: "xmlns:cp",
      dc: "xmlns:dc",
      dcterms: "xmlns:dcterms",
      dcmitype: "xmlns:dcmitype",
      xsi: "xmlns:xsi",
      type: "xsi:type"
    });
  }
};
var Footer$1 = class extends InitializableXmlComponent {
  constructor(referenceNumber, initContent) {
    super("w:ftr", initContent);
    _defineProperty(this, "refId", void 0);
    this.refId = referenceNumber;
    if (!initContent) this.root.push(new FooterAttributes({
      wpc: "http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas",
      mc: "http://schemas.openxmlformats.org/markup-compatibility/2006",
      o: "urn:schemas-microsoft-com:office:office",
      r: "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
      m: "http://schemas.openxmlformats.org/officeDocument/2006/math",
      v: "urn:schemas-microsoft-com:vml",
      wp14: "http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing",
      wp: "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing",
      w10: "urn:schemas-microsoft-com:office:word",
      w: "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
      w14: "http://schemas.microsoft.com/office/word/2010/wordml",
      w15: "http://schemas.microsoft.com/office/word/2012/wordml",
      wpg: "http://schemas.microsoft.com/office/word/2010/wordprocessingGroup",
      wpi: "http://schemas.microsoft.com/office/word/2010/wordprocessingInk",
      wne: "http://schemas.microsoft.com/office/word/2006/wordml",
      wps: "http://schemas.microsoft.com/office/word/2010/wordprocessingShape"
    }));
  }
  get ReferenceId() {
    return this.refId;
  }
  add(item) {
    this.root.push(item);
  }
  /**
  * Formats the footer, with the page numbers worked out for its document written into its fields, when the document's
  * body is written with an estimate of its pages.
  */
  prepForXml(context) {
    const xml = super.prepForXml(context);
    fillPartPageNumbers(xml, context, this.refId);
    return xml;
  }
};
var FooterWrapper = class {
  constructor(media, referenceId, initContent) {
    _defineProperty(this, "media", void 0);
    _defineProperty(this, "footer", void 0);
    _defineProperty(this, "relationships", void 0);
    this.media = media;
    this.footer = new Footer$1(referenceId, initContent);
    this.relationships = new Relationships();
  }
  add(item) {
    this.footer.add(item);
  }
  addChildElement(childElement) {
    this.footer.addChildElement(childElement);
  }
  get View() {
    return this.footer;
  }
  get Relationships() {
    return this.relationships;
  }
  get Media() {
    return this.media;
  }
};
var FootnoteAttributes = class extends XmlAttributeComponent {
  constructor(..._args) {
    super(..._args);
    _defineProperty(this, "xmlKeys", {
      type: "w:type",
      id: "w:id"
    });
  }
};
var FootnoteRef = class extends XmlComponent {
  constructor() {
    super("w:footnoteRef");
  }
};
var FootnoteRefRun = class extends Run {
  constructor() {
    super({ style: "FootnoteReference" });
    this.root.push(new FootnoteRef());
  }
};
var FootnoteType = {
  /** Separator line between body text and footnotes */
  SEPERATOR: "separator",
  /** Continuation separator for footnotes spanning pages */
  CONTINUATION_SEPERATOR: "continuationSeparator"
};
var Footnote = class extends XmlComponent {
  constructor(options) {
    super("w:footnote");
    this.root.push(new FootnoteAttributes({
      type: options.type,
      id: options.id
    }));
    for (const [index, child2] of options.children.entries()) this.root.push(index === 0 ? new FirstNoteParagraph(child2, new FootnoteRefRun()) : child2);
  }
};
var FootnotesAttributes = class extends XmlAttributeComponent {
  constructor(..._args) {
    super(..._args);
    _defineProperty(this, "xmlKeys", {
      wpc: "xmlns:wpc",
      mc: "xmlns:mc",
      o: "xmlns:o",
      r: "xmlns:r",
      m: "xmlns:m",
      v: "xmlns:v",
      wp14: "xmlns:wp14",
      wp: "xmlns:wp",
      w10: "xmlns:w10",
      w: "xmlns:w",
      w14: "xmlns:w14",
      w15: "xmlns:w15",
      wpg: "xmlns:wpg",
      wpi: "xmlns:wpi",
      wne: "xmlns:wne",
      wps: "xmlns:wps",
      Ignorable: "mc:Ignorable"
    });
  }
};
var FootNotes = class extends XmlComponent {
  constructor() {
    super("w:footnotes");
    _defineProperty(this, "ownNotes", /* @__PURE__ */ new Map());
    _defineProperty(this, "highestId", 0);
    this.root.push(new FootnotesAttributes({
      wpc: "http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas",
      mc: "http://schemas.openxmlformats.org/markup-compatibility/2006",
      o: "urn:schemas-microsoft-com:office:office",
      r: "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
      m: "http://schemas.openxmlformats.org/officeDocument/2006/math",
      v: "urn:schemas-microsoft-com:vml",
      wp14: "http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing",
      wp: "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing",
      w10: "urn:schemas-microsoft-com:office:word",
      w: "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
      w14: "http://schemas.microsoft.com/office/word/2010/wordml",
      w15: "http://schemas.microsoft.com/office/word/2012/wordml",
      wpg: "http://schemas.microsoft.com/office/word/2010/wordprocessingGroup",
      wpi: "http://schemas.microsoft.com/office/word/2010/wordprocessingInk",
      wne: "http://schemas.microsoft.com/office/word/2006/wordml",
      wps: "http://schemas.microsoft.com/office/word/2010/wordprocessingShape",
      Ignorable: "w14 w15 wp14"
    }));
    const begin = new Footnote({
      id: -1,
      type: FootnoteType.SEPERATOR,
      children: [new Paragraph({
        spacing: {
          after: 0,
          line: 240,
          lineRule: LineRuleType.AUTO
        },
        children: [new SeperatorRun()]
      })]
    });
    this.root.push(begin);
    const spacing = new Footnote({
      id: 0,
      type: FootnoteType.CONTINUATION_SEPERATOR,
      children: [new Paragraph({
        spacing: {
          after: 0,
          line: 240,
          lineRule: LineRuleType.AUTO
        },
        children: [new ContinuationSeperatorRun()]
      })]
    });
    this.root.push(spacing);
  }
  /**
  * Creates and adds a new footnote to the collection.
  *
  * @param id - Unique numeric identifier for the footnote
  * @param paragraph - Array of paragraphs that make up the footnote content
  */
  createFootNote(id, paragraph) {
    const footnote = new Footnote({
      id,
      children: paragraph
    });
    this.root.push(footnote);
    if (Number.isFinite(id)) this.highestId = Math.max(this.highestId, Math.floor(id));
  }
  /**
  * The id of the footnote that a reference run brings with it, which is added to the footnotes the first time the
  * run is written, with an id no other footnote has. Word has footnotes only in a document's body, so a run written
  * anywhere else, such as in a header, has none, and its footnote isn't added.
  *
  * @internal
  * @param reference - The run, which has the same footnote each time it is written
  * @param footnote - The footnote's content
  * @param context - The context the run is written in
  * @returns The footnote's id, or undefined outside the document's body
  */
  idOf(reference, footnote, context) {
    if (context.viewWrapper !== context.file.Document) return;
    const existing = this.ownNotes.get(reference);
    if (existing !== void 0) return existing;
    const id = this.highestId + 1;
    this.createFootNote(id, footnote.children);
    this.ownNotes.set(reference, id);
    return id;
  }
  /**
  * Formats the footnotes, with the page numbers worked out for their document written into their fields, when the
  * document's body is written with an estimate of its pages.
  */
  prepForXml(context) {
    const xml = super.prepForXml(context);
    fillPartPageNumbers(xml, context);
    return xml;
  }
};
var FootnotesWrapper = class {
  constructor() {
    _defineProperty(this, "footnotess", void 0);
    _defineProperty(this, "relationships", void 0);
    this.footnotess = new FootNotes();
    this.relationships = new Relationships();
  }
  get View() {
    return this.footnotess;
  }
  get Relationships() {
    return this.relationships;
  }
};
var HeaderAttributes = class extends XmlAttributeComponent {
  constructor(..._args) {
    super(..._args);
    _defineProperty(this, "xmlKeys", {
      wpc: "xmlns:wpc",
      mc: "xmlns:mc",
      o: "xmlns:o",
      r: "xmlns:r",
      m: "xmlns:m",
      v: "xmlns:v",
      wp14: "xmlns:wp14",
      wp: "xmlns:wp",
      w10: "xmlns:w10",
      w: "xmlns:w",
      w14: "xmlns:w14",
      w15: "xmlns:w15",
      wpg: "xmlns:wpg",
      wpi: "xmlns:wpi",
      wne: "xmlns:wne",
      wps: "xmlns:wps",
      cp: "xmlns:cp",
      dc: "xmlns:dc",
      dcterms: "xmlns:dcterms",
      dcmitype: "xmlns:dcmitype",
      xsi: "xmlns:xsi",
      type: "xsi:type",
      cx: "xmlns:cx",
      cx1: "xmlns:cx1",
      cx2: "xmlns:cx2",
      cx3: "xmlns:cx3",
      cx4: "xmlns:cx4",
      cx5: "xmlns:cx5",
      cx6: "xmlns:cx6",
      cx7: "xmlns:cx7",
      cx8: "xmlns:cx8",
      w16cid: "xmlns:w16cid",
      w16se: "xmlns:w16se"
    });
  }
};
var Header$1 = class extends InitializableXmlComponent {
  constructor(referenceNumber, initContent) {
    super("w:hdr", initContent);
    _defineProperty(this, "refId", void 0);
    this.refId = referenceNumber;
    if (!initContent) this.root.push(new HeaderAttributes({
      wpc: "http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas",
      mc: "http://schemas.openxmlformats.org/markup-compatibility/2006",
      o: "urn:schemas-microsoft-com:office:office",
      r: "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
      m: "http://schemas.openxmlformats.org/officeDocument/2006/math",
      v: "urn:schemas-microsoft-com:vml",
      wp14: "http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing",
      wp: "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing",
      w10: "urn:schemas-microsoft-com:office:word",
      w: "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
      w14: "http://schemas.microsoft.com/office/word/2010/wordml",
      w15: "http://schemas.microsoft.com/office/word/2012/wordml",
      wpg: "http://schemas.microsoft.com/office/word/2010/wordprocessingGroup",
      wpi: "http://schemas.microsoft.com/office/word/2010/wordprocessingInk",
      wne: "http://schemas.microsoft.com/office/word/2006/wordml",
      wps: "http://schemas.microsoft.com/office/word/2010/wordprocessingShape",
      cx: "http://schemas.microsoft.com/office/drawing/2014/chartex",
      cx1: "http://schemas.microsoft.com/office/drawing/2015/9/8/chartex",
      cx2: "http://schemas.microsoft.com/office/drawing/2015/10/21/chartex",
      cx3: "http://schemas.microsoft.com/office/drawing/2016/5/9/chartex",
      cx4: "http://schemas.microsoft.com/office/drawing/2016/5/10/chartex",
      cx5: "http://schemas.microsoft.com/office/drawing/2016/5/11/chartex",
      cx6: "http://schemas.microsoft.com/office/drawing/2016/5/12/chartex",
      cx7: "http://schemas.microsoft.com/office/drawing/2016/5/13/chartex",
      cx8: "http://schemas.microsoft.com/office/drawing/2016/5/14/chartex",
      w16cid: "http://schemas.microsoft.com/office/word/2016/wordml/cid",
      w16se: "http://schemas.microsoft.com/office/word/2015/wordml/symex"
    }));
  }
  get ReferenceId() {
    return this.refId;
  }
  add(item) {
    this.root.push(item);
  }
  /**
  * Formats the header, with the page numbers worked out for its document written into its fields, when the document's
  * body is written with an estimate of its pages.
  */
  prepForXml(context) {
    const xml = super.prepForXml(context);
    fillPartPageNumbers(xml, context, this.refId);
    return xml;
  }
};
var HeaderWrapper = class {
  constructor(media, referenceId, initContent) {
    _defineProperty(this, "media", void 0);
    _defineProperty(this, "header", void 0);
    _defineProperty(this, "relationships", void 0);
    this.media = media;
    this.header = new Header$1(referenceId, initContent);
    this.relationships = new Relationships();
  }
  add(item) {
    this.header.add(item);
    return this;
  }
  addChildElement(childElement) {
    this.header.addChildElement(childElement);
  }
  get View() {
    return this.header;
  }
  get Relationships() {
    return this.relationships;
  }
  get Media() {
    return this.media;
  }
};
var Media = class {
  constructor() {
    _defineProperty(this, "map", void 0);
    this.map = /* @__PURE__ */ new Map();
  }
  /**
  * Adds an image to the media collection.
  *
  * @param key - Unique identifier for this image
  * @param mediaData - Complete image data including file name, transformation, and raw data
  */
  addImage(key, mediaData) {
    this.map.set(key, mediaData);
  }
  /**
  * Gets all images as an array.
  *
  * @returns Read-only array of all media data in the collection
  */
  get Array() {
    return Array.from(this.map.values());
  }
};
var LevelFormat = {
  /** Decimal numbering (1, 2, 3...). */
  DECIMAL: "decimal",
  /** Uppercase roman numerals (I, II, III...). */
  UPPER_ROMAN: "upperRoman",
  /** Lowercase roman numerals (i, ii, iii...). */
  LOWER_ROMAN: "lowerRoman",
  /** Uppercase letters (A, B, C...). */
  UPPER_LETTER: "upperLetter",
  /** Lowercase letters (a, b, c...). */
  LOWER_LETTER: "lowerLetter",
  /** Ordinal numbers (1st, 2nd, 3rd...). */
  ORDINAL: "ordinal",
  /** Cardinal text (one, two, three...). */
  CARDINAL_TEXT: "cardinalText",
  /** Ordinal text (first, second, third...). */
  ORDINAL_TEXT: "ordinalText",
  /** Hexadecimal numbering. */
  HEX: "hex",
  /** Chicago Manual of Style numbering. */
  CHICAGO: "chicago",
  /** Ideograph digital numbering. */
  IDEOGRAPH__DIGITAL: "ideographDigital",
  /** Japanese counting system. */
  JAPANESE_COUNTING: "japaneseCounting",
  /** Japanese aiueo ordering. */
  AIUEO: "aiueo",
  /** Japanese iroha ordering. */
  IROHA: "iroha",
  /** Full-width decimal numbering. */
  DECIMAL_FULL_WIDTH: "decimalFullWidth",
  /** Half-width decimal numbering. */
  DECIMAL_HALF_WIDTH: "decimalHalfWidth",
  /** Japanese legal numbering. */
  JAPANESE_LEGAL: "japaneseLegal",
  /** Japanese digital ten thousand numbering. */
  JAPANESE_DIGITAL_TEN_THOUSAND: "japaneseDigitalTenThousand",
  /** Decimal numbers enclosed in circles. */
  DECIMAL_ENCLOSED_CIRCLE: "decimalEnclosedCircle",
  /** Full-width decimal numbering variant 2. */
  DECIMAL_FULL_WIDTH2: "decimalFullWidth2",
  /** Full-width aiueo ordering. */
  AIUEO_FULL_WIDTH: "aiueoFullWidth",
  /** Full-width iroha ordering. */
  IROHA_FULL_WIDTH: "irohaFullWidth",
  /** Decimal with leading zeros. */
  DECIMAL_ZERO: "decimalZero",
  /** Bullet points. */
  BULLET: "bullet",
  /** Korean ganada ordering. */
  GANADA: "ganada",
  /** Korean chosung ordering. */
  CHOSUNG: "chosung",
  /** Decimal enclosed with fullstop. */
  DECIMAL_ENCLOSED_FULLSTOP: "decimalEnclosedFullstop",
  /** Decimal enclosed in parentheses. */
  DECIMAL_ENCLOSED_PARENTHESES: "decimalEnclosedParen",
  /** Decimal enclosed in circles (Chinese). */
  DECIMAL_ENCLOSED_CIRCLE_CHINESE: "decimalEnclosedCircleChinese",
  /** Ideograph enclosed in circles. */
  IDEOGRAPH_ENCLOSED_CIRCLE: "ideographEnclosedCircle",
  /** Traditional ideograph numbering. */
  IDEOGRAPH_TRADITIONAL: "ideographTraditional",
  /** Ideograph zodiac numbering. */
  IDEOGRAPH_ZODIAC: "ideographZodiac",
  /** Traditional ideograph zodiac numbering. */
  IDEOGRAPH_ZODIAC_TRADITIONAL: "ideographZodiacTraditional",
  /** Taiwanese counting system. */
  TAIWANESE_COUNTING: "taiwaneseCounting",
  /** Traditional ideograph legal numbering. */
  IDEOGRAPH_LEGAL_TRADITIONAL: "ideographLegalTraditional",
  /** Taiwanese counting thousand system. */
  TAIWANESE_COUNTING_THOUSAND: "taiwaneseCountingThousand",
  /** Taiwanese digital numbering. */
  TAIWANESE_DIGITAL: "taiwaneseDigital",
  /** Chinese counting system. */
  CHINESE_COUNTING: "chineseCounting",
  /** Simplified Chinese legal numbering. */
  CHINESE_LEGAL_SIMPLIFIED: "chineseLegalSimplified",
  /** Chinese counting thousand system. */
  CHINESE_COUNTING_THOUSAND: "chineseCountingThousand",
  /** Korean digital numbering. */
  KOREAN_DIGITAL: "koreanDigital",
  /** Korean counting system. */
  KOREAN_COUNTING: "koreanCounting",
  /** Korean legal numbering. */
  KOREAN_LEGAL: "koreanLegal",
  /** Korean digital numbering variant 2. */
  KOREAN_DIGITAL2: "koreanDigital2",
  /** Vietnamese counting system. */
  VIETNAMESE_COUNTING: "vietnameseCounting",
  /** Russian lowercase numbering. */
  RUSSIAN_LOWER: "russianLower",
  /** Russian uppercase numbering. */
  RUSSIAN_UPPER: "russianUpper",
  /** No numbering. */
  NONE: "none",
  /** Number enclosed in dashes. */
  NUMBER_IN_DASH: "numberInDash",
  /** Hebrew numbering variant 1. */
  HEBREW1: "hebrew1",
  /** Hebrew numbering variant 2. */
  HEBREW2: "hebrew2",
  /** Arabic alpha numbering. */
  ARABIC_ALPHA: "arabicAlpha",
  /** Arabic abjad numbering. */
  ARABIC_ABJAD: "arabicAbjad",
  /** Hindi vowels. */
  HINDI_VOWELS: "hindiVowels",
  /** Hindi consonants. */
  HINDI_CONSONANTS: "hindiConsonants",
  /** Hindi numbers. */
  HINDI_NUMBERS: "hindiNumbers",
  /** Hindi counting system. */
  HINDI_COUNTING: "hindiCounting",
  /** Thai letters. */
  THAI_LETTERS: "thaiLetters",
  /** Thai numbers. */
  THAI_NUMBERS: "thaiNumbers",
  /** Thai counting system. */
  THAI_COUNTING: "thaiCounting",
  /** Thai Baht text. */
  BAHT_TEXT: "bahtText",
  /** Dollar text. */
  DOLLAR_TEXT: "dollarText",
  /** Custom numbering format. */
  CUSTOM: "custom"
};
var LevelAttributes = class extends XmlAttributeComponent {
  constructor(..._args) {
    super(..._args);
    _defineProperty(this, "xmlKeys", {
      ilvl: "w:ilvl",
      tentative: "w:tentative"
    });
  }
};
var NumberFormat$1 = class extends XmlComponent {
  constructor(value) {
    super("w:numFmt");
    this.root.push(new Attributes({ val: value }));
  }
};
var LevelText = class extends XmlComponent {
  constructor(value) {
    super("w:lvlText");
    this.root.push(new Attributes({ val: value }));
  }
};
var levelAlignment = (value) => {
  switch (value) {
    case AlignmentType.CENTER:
      return "center";
    case AlignmentType.END:
    case AlignmentType.RIGHT:
      return "right";
    default:
      return "left";
  }
};
var LevelJc = class extends XmlComponent {
  constructor(value) {
    super("w:lvlJc");
    this.root.push(new Attributes({ val: levelAlignment(value) }));
  }
};
var LevelSuffix = {
  /** No separator after the numbering. */
  NOTHING: "nothing",
  /** Space character after the numbering. */
  SPACE: "space",
  /** Tab character after the numbering. */
  TAB: "tab"
};
var Suffix = class extends XmlComponent {
  constructor(value) {
    super("w:suff");
    this.root.push(new Attributes({ val: value }));
  }
};
var IsLegalNumberingStyle = class extends XmlComponent {
  constructor() {
    super("w:isLgl");
  }
};
var LevelBase = class extends XmlComponent {
  /**
  * Creates a new numbering level.
  *
  * @param options - Level configuration options
  * @throws Error if level is greater than 9 (Word limitation)
  */
  constructor({ level, format: format2, text, alignment = AlignmentType.START, start = 1, style, suffix, isLegalNumberingStyle }) {
    super("w:lvl");
    _defineProperty(this, "paragraphProperties", void 0);
    _defineProperty(this, "runProperties", void 0);
    this.root.push(new NumberValueElement("w:start", decimalNumber(start)));
    if (format2) this.root.push(new NumberFormat$1(format2));
    if (style === null || style === void 0 ? void 0 : style.style) this.root.push(createParagraphStyle(style.style));
    if (isLegalNumberingStyle) this.root.push(new IsLegalNumberingStyle());
    if (suffix) this.root.push(new Suffix(suffix));
    if (text) this.root.push(new LevelText(text));
    this.root.push(new LevelJc(alignment));
    this.paragraphProperties = new ParagraphProperties(style && style.paragraph, {
      implicitListParagraphStyle: false,
      inListOrder: false
    });
    this.runProperties = new RunProperties((style === null || style === void 0 ? void 0 : style.run) && _objectSpread2(_objectSpread2({}, style.run), {}, {
      highlight: void 0,
      math: void 0,
      revision: void 0
    }));
    this.root.push(this.paragraphProperties);
    this.root.push(this.runProperties);
    if (level > 9) throw new Error("Level cannot be greater than 9. Read more here: https://answers.microsoft.com/en-us/msoffice/forum/all/does-word-support-more-than-9-list-levels/d130fdcd-1781-446d-8c84-c6c79124e4d7");
    this.root.push(new LevelAttributes({
      ilvl: decimalNumber(level),
      tentative: 1
    }));
  }
};
var Level = class extends LevelBase {
};
var LevelForOverride = class extends LevelBase {
};
var MultiLevelType = class extends XmlComponent {
  /**
  * Creates a new multi-level type specification.
  *
  * @param value - The multi-level type: "singleLevel", "multilevel", or "hybridMultilevel"
  */
  constructor(value) {
    super("w:multiLevelType");
    this.root.push(new Attributes({ val: value }));
  }
};
var AbstractNumberingAttributes = class extends XmlAttributeComponent {
  constructor(..._args) {
    super(..._args);
    _defineProperty(this, "xmlKeys", {
      abstractNumId: "w:abstractNumId",
      restartNumberingAfterBreak: "w15:restartNumberingAfterBreak"
    });
  }
};
var AbstractNumbering = class extends XmlComponent {
  /**
  * Creates a new abstract numbering definition.
  *
  * @param id - Unique identifier for this abstract numbering definition
  * @param levelOptions - Array of level definitions (up to 9 levels)
  */
  constructor(id, levelOptions) {
    super("w:abstractNum");
    _defineProperty(
      this,
      /** The unique identifier for this abstract numbering definition. */
      "id",
      void 0
    );
    this.root.push(new AbstractNumberingAttributes({
      abstractNumId: decimalNumber(id),
      restartNumberingAfterBreak: 0
    }));
    this.root.push(new MultiLevelType("hybridMultilevel"));
    this.id = id;
    for (const option of levelOptions) this.root.push(new Level(option));
  }
};
var AbstractNumId = class extends XmlComponent {
  constructor(value) {
    super("w:abstractNumId");
    this.root.push(new Attributes({ val: value }));
  }
};
var NumAttributes = class extends XmlAttributeComponent {
  constructor(..._args) {
    super(..._args);
    _defineProperty(this, "xmlKeys", { numId: "w:numId" });
  }
};
var ConcreteNumbering = class extends XmlComponent {
  /**
  * Creates a new concrete numbering instance.
  *
  * @param options - Configuration options for the numbering instance
  */
  constructor(options) {
    super("w:num");
    _defineProperty(
      this,
      /** The unique identifier for this numbering instance. */
      "numId",
      void 0
    );
    _defineProperty(
      this,
      /** The reference name for this numbering instance. */
      "reference",
      void 0
    );
    _defineProperty(
      this,
      /** The instance number for tracking multiple uses. */
      "instance",
      void 0
    );
    _defineProperty(
      this,
      /** For a list a paragraph restarts, the id of that restart, as {@link IConcreteNumberingOptions.restartedListId} describes. */
      "restartedListId",
      void 0
    );
    this.numId = options.numId;
    this.reference = options.reference;
    this.instance = options.instance;
    this.restartedListId = options.restartedListId;
    this.root.push(new NumAttributes({ numId: decimalNumber(options.numId) }));
    this.root.push(new AbstractNumId(decimalNumber(options.abstractNumId)));
    if (options.overrideLevels && options.overrideLevels.length) for (const level of options.overrideLevels) this.root.push(new LevelOverride(level.num, level.start));
  }
};
var LevelOverrideAttributes = class extends XmlAttributeComponent {
  constructor(..._args2) {
    super(..._args2);
    _defineProperty(this, "xmlKeys", { ilvl: "w:ilvl" });
  }
};
var LevelOverride = class extends XmlComponent {
  /**
  * Creates a new level override.
  *
  * @param levelNum - The level number to override (0-8)
  * @param start - Optional starting number for the level
  */
  constructor(levelNum, start) {
    super("w:lvlOverride");
    this.root.push(new LevelOverrideAttributes({ ilvl: levelNum }));
    if (start !== void 0) this.root.push(new StartOverride(start));
  }
};
var StartOverrideAttributes = class extends XmlAttributeComponent {
  constructor(..._args3) {
    super(..._args3);
    _defineProperty(this, "xmlKeys", { val: "w:val" });
  }
};
var StartOverride = class extends XmlComponent {
  /**
  * Creates a new start override.
  *
  * @param start - The starting number
  */
  constructor(start) {
    super("w:startOverride");
    this.root.push(new StartOverrideAttributes({ val: start }));
  }
};
var Numbering = class extends XmlComponent {
  /**
  * Creates a new numbering definition collection.
  *
  * Initializes the numbering with a default bullet list configuration and
  * any custom numbering configurations provided in the options.
  *
  * @param options - Configuration options for numbering definitions
  */
  constructor(options) {
    super("w:numbering");
    _defineProperty(this, "abstractNumberingMap", /* @__PURE__ */ new Map());
    _defineProperty(this, "concreteNumberingMap", /* @__PURE__ */ new Map());
    _defineProperty(this, "referenceConfigMap", /* @__PURE__ */ new Map());
    _defineProperty(this, "abstractNumUniqueNumericId", abstractNumUniqueNumericIdGen());
    _defineProperty(this, "concreteNumUniqueNumericId", concreteNumUniqueNumericIdGen());
    this.root.push(new DocumentAttributes([
      "wpc",
      "mc",
      "o",
      "r",
      "m",
      "v",
      "wp14",
      "wp",
      "w10",
      "w",
      "w14",
      "w15",
      "wpg",
      "wpi",
      "wne",
      "wps"
    ], "w14 w15 wp14"));
    const abstractNumbering = new AbstractNumbering(this.abstractNumUniqueNumericId(), [
      {
        level: 0,
        format: LevelFormat.BULLET,
        text: "●",
        alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: {
          left: convertInchesToTwip(0.5),
          hanging: convertInchesToTwip(0.25)
        } } }
      },
      {
        level: 1,
        format: LevelFormat.BULLET,
        text: "○",
        alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: {
          left: convertInchesToTwip(1),
          hanging: convertInchesToTwip(0.25)
        } } }
      },
      {
        level: 2,
        format: LevelFormat.BULLET,
        text: "■",
        alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: {
          left: 2160,
          hanging: convertInchesToTwip(0.25)
        } } }
      },
      {
        level: 3,
        format: LevelFormat.BULLET,
        text: "●",
        alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: {
          left: 2880,
          hanging: convertInchesToTwip(0.25)
        } } }
      },
      {
        level: 4,
        format: LevelFormat.BULLET,
        text: "○",
        alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: {
          left: 3600,
          hanging: convertInchesToTwip(0.25)
        } } }
      },
      {
        level: 5,
        format: LevelFormat.BULLET,
        text: "■",
        alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: {
          left: 4320,
          hanging: convertInchesToTwip(0.25)
        } } }
      },
      {
        level: 6,
        format: LevelFormat.BULLET,
        text: "●",
        alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: {
          left: 5040,
          hanging: convertInchesToTwip(0.25)
        } } }
      },
      {
        level: 7,
        format: LevelFormat.BULLET,
        text: "●",
        alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: {
          left: 5760,
          hanging: convertInchesToTwip(0.25)
        } } }
      },
      {
        level: 8,
        format: LevelFormat.BULLET,
        text: "●",
        alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: {
          left: 6480,
          hanging: convertInchesToTwip(0.25)
        } } }
      }
    ]);
    this.concreteNumberingMap.set("default-bullet-numbering", new ConcreteNumbering({
      numId: 1,
      abstractNumId: abstractNumbering.id,
      reference: "default-bullet-numbering",
      instance: 0,
      overrideLevels: [{
        num: 0,
        start: 1
      }]
    }));
    this.abstractNumberingMap.set("default-bullet-numbering", abstractNumbering);
    for (const con of options.config) {
      this.abstractNumberingMap.set(con.reference, new AbstractNumbering(this.abstractNumUniqueNumericId(), con.levels));
      this.referenceConfigMap.set(con.reference, con.levels);
    }
  }
  /**
  * Prepares the numbering definitions for XML serialization.
  *
  * Adds all abstract and concrete numbering definitions to the XML tree.
  *
  * @param context - The XML context
  * @returns The prepared XML object
  */
  prepForXml(context) {
    this.root.splice(1, this.root.length - 1, ...this.abstractNumberingMap.values(), ...this.concreteNumberingMap.values());
    return super.prepForXml(context);
  }
  /**
  * Creates a concrete numbering instance from an abstract numbering definition.
  *
  * This method creates a new concrete numbering instance that references an
  * abstract numbering definition. It's used internally when paragraphs reference
  * numbering configurations.
  *
  * @param reference - The reference name of the abstract numbering definition
  * @param instance - The instance number for this concrete numbering
  * @param definition - The list's definition, for a list a paragraph gives its own definition of. It is added with
  * its reference, unless the numbering already has a list with that reference, such as one of the document's
  * `numbering` option, which is kept
  * @param restartedListId - For a list a paragraph starts again with `restart`, the id of that restart. The list is
  * then that restart's own, not the `instance`'s
  */
  createConcreteNumberingInstance(reference, instance, definition, restartedListId) {
    var _this$referenceConfig;
    if (definition && !this.abstractNumberingMap.has(definition.reference)) {
      this.abstractNumberingMap.set(definition.reference, new AbstractNumbering(this.abstractNumUniqueNumericId(), definition.levels));
      this.referenceConfigMap.set(definition.reference, definition.levels);
    }
    const abstractNumbering = this.abstractNumberingMap.get(reference);
    if (!abstractNumbering) return;
    const fullReference = listKey(reference, instance, restartedListId);
    if (this.concreteNumberingMap.has(fullReference)) return;
    const referenceConfigLevels = (_this$referenceConfig = this.referenceConfigMap.get(reference)) !== null && _this$referenceConfig !== void 0 ? _this$referenceConfig : [{ level: 0 }];
    const concreteNumberingSettings = {
      numId: this.concreteNumUniqueNumericId(),
      abstractNumId: abstractNumbering.id,
      reference,
      instance,
      restartedListId,
      overrideLevels: referenceConfigLevels.map(({ level, start = 1 }) => ({
        num: level,
        start: decimalNumber(start)
      }))
    };
    this.concreteNumberingMap.set(fullReference, new ConcreteNumbering(concreteNumberingSettings));
  }
  /**
  * Gets all concrete numbering instances.
  *
  * @returns An array of all concrete numbering instances
  */
  get ConcreteNumbering() {
    return Array.from(this.concreteNumberingMap.values());
  }
  /**
  * Gets all reference configurations.
  *
  * @returns An array of all numbering reference configurations
  */
  get ReferenceConfig() {
    return Array.from(this.referenceConfigMap.values());
  }
};
var PATH_PART = /^[\w-]+$/;
var RESERVED_FOLDERS = /* @__PURE__ */ new Set([
  "_rels",
  "fonts",
  "theme"
]);
var PackagePart = class {
  /**
  * @throws If the folder isn't a single folder name, or is one of the folders docx writes parts of its own in
  * @throws If the name or the extension isn't a single part of a file name, which could lead out of the folder
  */
  constructor(options) {
    _defineProperty(this, "options", void 0);
    _defineProperty(this, "id", uniqueId());
    _defineProperty(
      this,
      /** The id of the relationship to the part, such as a chart's `r:id` in the document */
      "relationshipId",
      `rId${this.id}`
    );
    _defineProperty(this, "addedTo", /* @__PURE__ */ new WeakSet());
    this.options = options;
    if (!PATH_PART.test(options.folder) || RESERVED_FOLDERS.has(options.folder)) throw new Error(`Invalid package part folder "${options.folder}". Expected a folder name docx doesn't use, such as "charts"`);
    if (!PATH_PART.test(options.name)) throw new Error(`Invalid package part name "${options.name}". Expected letters, digits, "_" and "-", such as "chart"`);
    if (!PATH_PART.test(options.extension)) throw new Error(`Invalid package part extension "${options.extension}". Expected letters, digits, "_" and "-", such as "xml"`);
  }
  /**
  * Adds the part to the package being written, once, and a relationship to it from the part being written.
  */
  addTo(context) {
    const parts = context.file.PackageParts;
    const path = parts.add(this);
    const relationships = context.viewWrapper.Relationships;
    if (this.addedTo.has(relationships)) return;
    this.addedTo.add(relationships);
    relationships.addRelationship(this.id, this.options.relationshipType, parts.getTarget(relationships, path));
  }
};
var PackageParts = class {
  /**
  * @param contentTypes - Where each part's content type is added
  * @param existingPaths - The paths under word/ of the parts the package already has, such as a template's charts,
  * which new parts don't take
  */
  constructor(contentTypes, existingPaths = /* @__PURE__ */ new Set()) {
    _defineProperty(this, "contentTypes", void 0);
    _defineProperty(this, "existingPaths", void 0);
    _defineProperty(this, "paths", /* @__PURE__ */ new Map());
    _defineProperty(this, "folders", /* @__PURE__ */ new WeakMap());
    this.contentTypes = contentTypes;
    this.existingPaths = existingPaths;
  }
  /**
  * Adds a part, and its content type, once.
  *
  * @returns The part's path under word/, such as "charts/chart1.xml"
  */
  add(part) {
    const added = this.paths.get(part);
    if (added !== void 0) return added;
    const { folder, name, extension, contentType } = part.options;
    const taken = /* @__PURE__ */ new Set([...this.existingPaths, ...this.paths.values()]);
    let index = 1;
    while (taken.has(`${folder}/${name}${index}.${extension}`)) index++;
    const path = `${folder}/${name}${index}.${extension}`;
    this.paths.set(part, path);
    this.contentTypes.addOverride(contentType, `/word/${path}`);
    return path;
  }
  /**
  * Each part added, with its path under word/, in the order they were added.
  *
  * A part related as an OLE object is listed too, though the parts are typed as they were before a part could be:
  * `File`, whose type is public, has these parts, and the compiler only writes their content.
  */
  get Array() {
    return [...this.paths].map(([part, path]) => ({
      part,
      path
    }));
  }
  /**
  * Creates the relationships of a part whose XML is being written, so the parts its XML refers to are found from its
  * folder.
  *
  * @param path - The part's path under word/
  */
  createRelationships(path) {
    const relationships = new Relationships();
    this.folders.set(relationships, path.slice(0, path.indexOf("/")));
    return relationships;
  }
  /**
  * The target of a relationship to a part, relative to the part the relationships are from. The document, headers,
  * footers, footnotes, endnotes and comments are all in word/.
  *
  * @param path - The part's path under word/
  */
  getTarget(relationships, path) {
    const from = this.folders.get(relationships);
    if (from === void 0) return path;
    return path.startsWith(`${from}/`) ? path.slice(from.length + 1) : `../${path}`;
  }
};
var createCompatibilitySetting = (version) => new BuilderElement({
  name: "w:compatSetting",
  attributes: {
    version: {
      key: "w:val",
      value: version
    },
    name: {
      key: "w:name",
      value: "compatibilityMode"
    },
    uri: {
      key: "w:uri",
      value: "http://schemas.microsoft.com/office/word"
    }
  }
});
var Compatibility = class extends XmlComponent {
  constructor(options) {
    super("w:compat");
    if (options.useSingleBorderforContiguousCells) this.root.push(new OnOffElement("w:useSingleBorderforContiguousCells", options.useSingleBorderforContiguousCells));
    if (options.wordPerfectJustification) this.root.push(new OnOffElement("w:wpJustification", options.wordPerfectJustification));
    if (options.noTabStopForHangingIndent) this.root.push(new OnOffElement("w:noTabHangInd", options.noTabStopForHangingIndent));
    if (options.noLeading) this.root.push(new OnOffElement("w:noLeading", options.noLeading));
    if (options.spaceForUnderline) this.root.push(new OnOffElement("w:spaceForUL", options.spaceForUnderline));
    if (options.noColumnBalance) this.root.push(new OnOffElement("w:noColumnBalance", options.noColumnBalance));
    if (options.balanceSingleByteDoubleByteWidth) this.root.push(new OnOffElement("w:balanceSingleByteDoubleByteWidth", options.balanceSingleByteDoubleByteWidth));
    if (options.noExtraLineSpacing) this.root.push(new OnOffElement("w:noExtraLineSpacing", options.noExtraLineSpacing));
    if (options.doNotLeaveBackslashAlone) this.root.push(new OnOffElement("w:doNotLeaveBackslashAlone", options.doNotLeaveBackslashAlone));
    if (options.underlineTrailingSpaces) this.root.push(new OnOffElement("w:ulTrailSpace", options.underlineTrailingSpaces));
    if (options.doNotExpandShiftReturn) this.root.push(new OnOffElement("w:doNotExpandShiftReturn", options.doNotExpandShiftReturn));
    if (options.spacingInWholePoints) this.root.push(new OnOffElement("w:spacingInWholePoints", options.spacingInWholePoints));
    if (options.lineWrapLikeWord6) this.root.push(new OnOffElement("w:lineWrapLikeWord6", options.lineWrapLikeWord6));
    if (options.printBodyTextBeforeHeader) this.root.push(new OnOffElement("w:printBodyTextBeforeHeader", options.printBodyTextBeforeHeader));
    if (options.printColorsBlack) this.root.push(new OnOffElement("w:printColBlack", options.printColorsBlack));
    if (options.spaceWidth) this.root.push(new OnOffElement("w:wpSpaceWidth", options.spaceWidth));
    if (options.showBreaksInFrames) this.root.push(new OnOffElement("w:showBreaksInFrames", options.showBreaksInFrames));
    if (options.subFontBySize) this.root.push(new OnOffElement("w:subFontBySize", options.subFontBySize));
    if (options.suppressBottomSpacing) this.root.push(new OnOffElement("w:suppressBottomSpacing", options.suppressBottomSpacing));
    if (options.suppressTopSpacing) this.root.push(new OnOffElement("w:suppressTopSpacing", options.suppressTopSpacing));
    if (options.suppressSpacingAtTopOfPage) this.root.push(new OnOffElement("w:suppressSpacingAtTopOfPage", options.suppressSpacingAtTopOfPage));
    if (options.suppressTopSpacingWP) this.root.push(new OnOffElement("w:suppressTopSpacingWP", options.suppressTopSpacingWP));
    if (options.suppressSpBfAfterPgBrk) this.root.push(new OnOffElement("w:suppressSpBfAfterPgBrk", options.suppressSpBfAfterPgBrk));
    if (options.swapBordersFacingPages) this.root.push(new OnOffElement("w:swapBordersFacingPages", options.swapBordersFacingPages));
    if (options.convertMailMergeEsc) this.root.push(new OnOffElement("w:convMailMergeEsc", options.convertMailMergeEsc));
    if (options.truncateFontHeightsLikeWP6) this.root.push(new OnOffElement("w:truncateFontHeightsLikeWP6", options.truncateFontHeightsLikeWP6));
    if (options.macWordSmallCaps) this.root.push(new OnOffElement("w:mwSmallCaps", options.macWordSmallCaps));
    if (options.usePrinterMetrics) this.root.push(new OnOffElement("w:usePrinterMetrics", options.usePrinterMetrics));
    if (options.doNotSuppressParagraphBorders) this.root.push(new OnOffElement("w:doNotSuppressParagraphBorders", options.doNotSuppressParagraphBorders));
    if (options.wrapTrailSpaces) this.root.push(new OnOffElement("w:wrapTrailSpaces", options.wrapTrailSpaces));
    if (options.footnoteLayoutLikeWW8) this.root.push(new OnOffElement("w:footnoteLayoutLikeWW8", options.footnoteLayoutLikeWW8));
    if (options.shapeLayoutLikeWW8) this.root.push(new OnOffElement("w:shapeLayoutLikeWW8", options.shapeLayoutLikeWW8));
    if (options.alignTablesRowByRow) this.root.push(new OnOffElement("w:alignTablesRowByRow", options.alignTablesRowByRow));
    if (options.forgetLastTabAlignment) this.root.push(new OnOffElement("w:forgetLastTabAlignment", options.forgetLastTabAlignment));
    if (options.adjustLineHeightInTable) this.root.push(new OnOffElement("w:adjustLineHeightInTable", options.adjustLineHeightInTable));
    if (options.autoSpaceLikeWord95) this.root.push(new OnOffElement("w:autoSpaceLikeWord95", options.autoSpaceLikeWord95));
    if (options.noSpaceRaiseLower) this.root.push(new OnOffElement("w:noSpaceRaiseLower", options.noSpaceRaiseLower));
    if (options.doNotUseHTMLParagraphAutoSpacing) this.root.push(new OnOffElement("w:doNotUseHTMLParagraphAutoSpacing", options.doNotUseHTMLParagraphAutoSpacing));
    if (options.layoutRawTableWidth) this.root.push(new OnOffElement("w:layoutRawTableWidth", options.layoutRawTableWidth));
    if (options.layoutTableRowsApart) this.root.push(new OnOffElement("w:layoutTableRowsApart", options.layoutTableRowsApart));
    if (options.useWord97LineBreakRules) this.root.push(new OnOffElement("w:useWord97LineBreakRules", options.useWord97LineBreakRules));
    if (options.doNotBreakWrappedTables) this.root.push(new OnOffElement("w:doNotBreakWrappedTables", options.doNotBreakWrappedTables));
    if (options.doNotSnapToGridInCell) this.root.push(new OnOffElement("w:doNotSnapToGridInCell", options.doNotSnapToGridInCell));
    if (options.selectFieldWithFirstOrLastCharacter) this.root.push(new OnOffElement("w:selectFldWithFirstOrLastChar", options.selectFieldWithFirstOrLastCharacter));
    if (options.applyBreakingRules) this.root.push(new OnOffElement("w:applyBreakingRules", options.applyBreakingRules));
    if (options.doNotWrapTextWithPunctuation) this.root.push(new OnOffElement("w:doNotWrapTextWithPunct", options.doNotWrapTextWithPunctuation));
    if (options.doNotUseEastAsianBreakRules) this.root.push(new OnOffElement("w:doNotUseEastAsianBreakRules", options.doNotUseEastAsianBreakRules));
    if (options.useWord2002TableStyleRules) this.root.push(new OnOffElement("w:useWord2002TableStyleRules", options.useWord2002TableStyleRules));
    if (options.growAutofit) this.root.push(new OnOffElement("w:growAutofit", options.growAutofit));
    if (options.useFELayout) this.root.push(new OnOffElement("w:useFELayout", options.useFELayout));
    if (options.useNormalStyleForList) this.root.push(new OnOffElement("w:useNormalStyleForList", options.useNormalStyleForList));
    if (options.doNotUseIndentAsNumberingTabStop) this.root.push(new OnOffElement("w:doNotUseIndentAsNumberingTabStop", options.doNotUseIndentAsNumberingTabStop));
    if (options.useAlternateEastAsianLineBreakRules) this.root.push(new OnOffElement("w:useAltKinsokuLineBreakRules", options.useAlternateEastAsianLineBreakRules));
    if (options.allowSpaceOfSameStyleInTable) this.root.push(new OnOffElement("w:allowSpaceOfSameStyleInTable", options.allowSpaceOfSameStyleInTable));
    if (options.doNotSuppressIndentation) this.root.push(new OnOffElement("w:doNotSuppressIndentation", options.doNotSuppressIndentation));
    if (options.doNotAutofitConstrainedTables) this.root.push(new OnOffElement("w:doNotAutofitConstrainedTables", options.doNotAutofitConstrainedTables));
    if (options.autofitToFirstFixedWidthCell) this.root.push(new OnOffElement("w:autofitToFirstFixedWidthCell", options.autofitToFirstFixedWidthCell));
    if (options.underlineTabInNumberingList) this.root.push(new OnOffElement("w:underlineTabInNumList", options.underlineTabInNumberingList));
    if (options.displayHangulFixedWidth) this.root.push(new OnOffElement("w:displayHangulFixedWidth", options.displayHangulFixedWidth));
    if (options.splitPgBreakAndParaMark) this.root.push(new OnOffElement("w:splitPgBreakAndParaMark", options.splitPgBreakAndParaMark));
    if (options.doNotVerticallyAlignCellWithSp) this.root.push(new OnOffElement("w:doNotVertAlignCellWithSp", options.doNotVerticallyAlignCellWithSp));
    if (options.doNotBreakConstrainedForcedTable) this.root.push(new OnOffElement("w:doNotBreakConstrainedForcedTable", options.doNotBreakConstrainedForcedTable));
    if (options.ignoreVerticalAlignmentInTextboxes) this.root.push(new OnOffElement("w:doNotVertAlignInTxbx", options.ignoreVerticalAlignmentInTextboxes));
    if (options.useAnsiKerningPairs) this.root.push(new OnOffElement("w:useAnsiKerningPairs", options.useAnsiKerningPairs));
    if (options.cachedColumnBalance) this.root.push(new OnOffElement("w:cachedColBalance", options.cachedColumnBalance));
    if (options.version) this.root.push(createCompatibilitySetting(options.version));
  }
};
var PROTECTION_PASSWORD_SPIN_COUNT = 1e5;
var MAX_PASSWORD_LENGTH = 15;
var INITIAL_CODES = [
  57840,
  7439,
  52380,
  33984,
  4364,
  3600,
  61902,
  12606,
  6258,
  57657,
  54287,
  34041,
  10252,
  43370,
  20163
];
var ENCRYPTION_MATRIX = [
  [
    44796,
    19929,
    39858,
    10053,
    20106,
    40212,
    10761
  ],
  [
    31585,
    63170,
    64933,
    60267,
    50935,
    40399,
    11199
  ],
  [
    17763,
    35526,
    1453,
    2906,
    5812,
    11624,
    23248
  ],
  [
    885,
    1770,
    3540,
    7080,
    14160,
    28320,
    56640
  ],
  [
    55369,
    41139,
    20807,
    41614,
    21821,
    43642,
    17621
  ],
  [
    28485,
    56970,
    44341,
    19019,
    38038,
    14605,
    29210
  ],
  [
    60195,
    50791,
    40175,
    10751,
    21502,
    43004,
    24537
  ],
  [
    18387,
    36774,
    3949,
    7898,
    15796,
    31592,
    63184
  ],
  [
    47201,
    24803,
    49606,
    37805,
    14203,
    28406,
    56812
  ],
  [
    17824,
    35648,
    1697,
    3394,
    6788,
    13576,
    27152
  ],
  [
    43601,
    17539,
    35078,
    557,
    1114,
    2228,
    4456
  ],
  [
    30388,
    60776,
    51953,
    34243,
    7079,
    14158,
    28316
  ],
  [
    14128,
    28256,
    56512,
    43425,
    17251,
    34502,
    7597
  ],
  [
    13105,
    26210,
    52420,
    35241,
    883,
    1766,
    3532
  ],
  [
    4129,
    8258,
    16516,
    33032,
    4657,
    9314,
    18628
  ]
];
var rotateLeft15 = (value) => value >> 14 & 1 | value << 1 & 32767;
var legacyPasswordKey = (password) => {
  const bytes = password.slice(0, MAX_PASSWORD_LENGTH).split("").map((character) => {
    const code = character.charCodeAt(0);
    return (code & 255) !== 0 ? code & 255 : code >> 8 & 255;
  });
  const highOrderWord = bytes.reduce((word, byte, index) => ENCRYPTION_MATRIX[MAX_PASSWORD_LENGTH - bytes.length + index].reduce((current, code, bit) => byte >> bit & 1 ? current ^ code : current, word), INITIAL_CODES[bytes.length - 1]);
  const lowOrderWord = (rotateLeft15(bytes.reduceRight((word, byte) => rotateLeft15(word) ^ byte, 0)) ^ bytes.length ^ 52811) & 65535;
  return [
    lowOrderWord & 255,
    lowOrderWord >> 8,
    highOrderWord & 255,
    highOrderWord >> 8
  ].map((byte) => byte.toString(16).toUpperCase().padStart(2, "0")).join("");
};
var hashProtectionPassword = (password, salt, spinCount) => {
  const key = [...legacyPasswordKey(password)].flatMap((character) => [character.charCodeAt(0), 0]);
  let digest = sha256(Uint8Array.from([...salt, ...key]));
  const block = new Uint8Array(digest.length + 4);
  const view = new DataView(block.buffer);
  for (let iteration = 0; iteration < spinCount; iteration++) {
    block.set(digest);
    view.setUint32(digest.length, iteration, true);
    digest = sha256(block);
  }
  return Array.from(digest);
};
var randomSalt = (length) => {
  var _globalThis$crypto;
  const bytes = new Uint8Array(length);
  if (typeof ((_globalThis$crypto = globalThis.crypto) === null || _globalThis$crypto === void 0 ? void 0 : _globalThis$crypto.getRandomValues) === "function") {
    globalThis.crypto.getRandomValues(bytes);
    return [...bytes];
  }
  return [...bytes].map(() => Math.floor(Math.random() * 256));
};
var DocumentProtectionType = {
  /**
  * ## No Changes (Read Only)
  *
  * Nothing can be changed, except in the document's editable ranges (`EditableRangeStart` to `EditableRangeEnd`).
  */
  READ_ONLY: "readOnly",
  /**
  * ## Comments
  *
  * Only comments can be added, and the editable ranges changed.
  */
  COMMENTS: "comments",
  /**
  * ## Tracked Changes
  *
  * Anything can be changed, and every change is tracked, as a revision people can accept or reject.
  */
  TRACKED_CHANGES: "trackedChanges",
  /**
  * ## Filling in Forms
  *
  * Only form fields can be filled in.
  */
  FORMS: "forms"
};
var DocumentProtectionAttributes = class extends XmlAttributeComponent {
  constructor(..._args) {
    super(..._args);
    _defineProperty(this, "xmlKeys", {
      edit: "w:edit",
      enforcement: "w:enforcement",
      cryptProviderType: "w:cryptProviderType",
      cryptAlgorithmClass: "w:cryptAlgorithmClass",
      cryptAlgorithmType: "w:cryptAlgorithmType",
      cryptAlgorithmSid: "w:cryptAlgorithmSid",
      cryptSpinCount: "w:cryptSpinCount",
      hash: "w:hash",
      salt: "w:salt"
    });
  }
};
var toBase64 = (bytes) => btoa(String.fromCharCode(...bytes));
var DocumentProtection = class extends XmlComponent {
  constructor({ type, password }) {
    super("w:documentProtection");
    if (password === void 0 || password === "") {
      this.root.push(new DocumentProtectionAttributes({
        edit: type,
        enforcement: true
      }));
      return;
    }
    const salt = randomSalt(16);
    this.root.push(new DocumentProtectionAttributes({
      edit: type,
      enforcement: true,
      cryptProviderType: "rsaAES",
      cryptAlgorithmClass: "hash",
      cryptAlgorithmType: "typeAny",
      cryptAlgorithmSid: 12,
      cryptSpinCount: PROTECTION_PASSWORD_SPIN_COUNT,
      hash: toBase64(hashProtectionPassword(password, salt, PROTECTION_PASSWORD_SPIN_COUNT)),
      salt: toBase64(salt)
    }));
  }
};
var SettingsAttributes = class extends XmlAttributeComponent {
  constructor(..._args) {
    super(..._args);
    _defineProperty(this, "xmlKeys", {
      wpc: "xmlns:wpc",
      mc: "xmlns:mc",
      o: "xmlns:o",
      r: "xmlns:r",
      m: "xmlns:m",
      v: "xmlns:v",
      wp14: "xmlns:wp14",
      wp: "xmlns:wp",
      w10: "xmlns:w10",
      w: "xmlns:w",
      w14: "xmlns:w14",
      w15: "xmlns:w15",
      wpg: "xmlns:wpg",
      wpi: "xmlns:wpi",
      wne: "xmlns:wne",
      wps: "xmlns:wps",
      Ignorable: "mc:Ignorable"
    });
  }
};
var Settings = class extends XmlComponent {
  constructor(options) {
    var _options$defaultTabSt, _options$hyphenation, _options$hyphenation2, _options$hyphenation3, _options$hyphenation4, _options$compatibilit, _ref, _options$compatibilit2, _options$compatibilit3;
    super("w:settings");
    this.root.push(new SettingsAttributes({
      wpc: "http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas",
      mc: "http://schemas.openxmlformats.org/markup-compatibility/2006",
      o: "urn:schemas-microsoft-com:office:office",
      r: "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
      m: "http://schemas.openxmlformats.org/officeDocument/2006/math",
      v: "urn:schemas-microsoft-com:vml",
      wp14: "http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing",
      wp: "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing",
      w10: "urn:schemas-microsoft-com:office:word",
      w: "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
      w14: "http://schemas.microsoft.com/office/word/2010/wordml",
      w15: "http://schemas.microsoft.com/office/word/2012/wordml",
      wpg: "http://schemas.microsoft.com/office/word/2010/wordprocessingGroup",
      wpi: "http://schemas.microsoft.com/office/word/2010/wordprocessingInk",
      wne: "http://schemas.microsoft.com/office/word/2006/wordml",
      wps: "http://schemas.microsoft.com/office/word/2010/wordprocessingShape",
      Ignorable: "w14 w15 wp14"
    }));
    this.root.push(new OnOffElement("w:displayBackgroundShape", true));
    if (options.embedFonts !== void 0) this.root.push(new OnOffElement("w:embedTrueTypeFonts", options.embedFonts));
    if (options.trackRevisions !== void 0) this.root.push(new OnOffElement("w:trackRevisions", options.trackRevisions));
    if (options.protection !== void 0) this.root.push(new DocumentProtection(options.protection));
    this.root.push(new NumberValueElement("w:defaultTabStop", (_options$defaultTabSt = options.defaultTabStop) !== null && _options$defaultTabSt !== void 0 ? _options$defaultTabSt : 720));
    if (((_options$hyphenation = options.hyphenation) === null || _options$hyphenation === void 0 ? void 0 : _options$hyphenation.autoHyphenation) !== void 0) this.root.push(new OnOffElement("w:autoHyphenation", options.hyphenation.autoHyphenation));
    if (((_options$hyphenation2 = options.hyphenation) === null || _options$hyphenation2 === void 0 ? void 0 : _options$hyphenation2.consecutiveHyphenLimit) !== void 0) this.root.push(new NumberValueElement("w:consecutiveHyphenLimit", options.hyphenation.consecutiveHyphenLimit));
    if (((_options$hyphenation3 = options.hyphenation) === null || _options$hyphenation3 === void 0 ? void 0 : _options$hyphenation3.hyphenationZone) !== void 0) this.root.push(new NumberValueElement("w:hyphenationZone", options.hyphenation.hyphenationZone));
    if (((_options$hyphenation4 = options.hyphenation) === null || _options$hyphenation4 === void 0 ? void 0 : _options$hyphenation4.doNotHyphenateCaps) !== void 0) this.root.push(new OnOffElement("w:doNotHyphenateCaps", options.hyphenation.doNotHyphenateCaps));
    if (options.evenAndOddHeaders !== void 0) this.root.push(new OnOffElement("w:evenAndOddHeaders", options.evenAndOddHeaders));
    if (options.updateFields !== void 0) this.root.push(new OnOffElement("w:updateFields", options.updateFields));
    this.root.push(new Compatibility(_objectSpread2(_objectSpread2({}, (_options$compatibilit = options.compatibility) !== null && _options$compatibilit !== void 0 ? _options$compatibilit : {}), {}, { version: (_ref = (_options$compatibilit2 = (_options$compatibilit3 = options.compatibility) === null || _options$compatibilit3 === void 0 ? void 0 : _options$compatibilit3.version) !== null && _options$compatibilit2 !== void 0 ? _options$compatibilit2 : options.compatibilityModeVersion) !== null && _ref !== void 0 ? _ref : 15 })));
  }
};
var ComponentAttributes = class extends XmlAttributeComponent {
  constructor(..._args) {
    super(..._args);
    _defineProperty(this, "xmlKeys", { val: "w:val" });
  }
};
var Name = class extends XmlComponent {
  constructor(value) {
    super("w:name");
    this.root.push(new ComponentAttributes({ val: value }));
  }
};
var UiPriority = class extends XmlComponent {
  constructor(value) {
    super("w:uiPriority");
    this.root.push(new ComponentAttributes({ val: decimalNumber(value) }));
  }
};
var StyleAttributes = class extends XmlAttributeComponent {
  constructor(..._args) {
    super(..._args);
    _defineProperty(this, "xmlKeys", {
      type: "w:type",
      styleId: "w:styleId",
      default: "w:default",
      customStyle: "w:customStyle"
    });
  }
};
var Style = class extends XmlComponent {
  constructor(attributes, options) {
    super("w:style");
    this.root.push(new StyleAttributes(attributes));
    if (options.name) this.root.push(new Name(options.name));
    if (options.basedOn && options.basedOn !== attributes.styleId) this.root.push(new StringValueElement("w:basedOn", options.basedOn));
    if (options.next) this.root.push(new StringValueElement("w:next", options.next));
    if (options.link) this.root.push(new StringValueElement("w:link", options.link));
    if (options.uiPriority !== void 0) this.root.push(new UiPriority(options.uiPriority));
    if (options.semiHidden !== void 0) this.root.push(new OnOffElement("w:semiHidden", options.semiHidden));
    if (options.unhideWhenUsed !== void 0) this.root.push(new OnOffElement("w:unhideWhenUsed", options.unhideWhenUsed));
    if (options.quickFormat !== void 0) this.root.push(new OnOffElement("w:qFormat", options.quickFormat));
  }
};
var StyleForParagraph = class extends Style {
  constructor(options) {
    super({
      type: "paragraph",
      styleId: options.id
    }, options);
    _defineProperty(this, "paragraphProperties", void 0);
    _defineProperty(this, "runProperties", void 0);
    this.paragraphProperties = new ParagraphProperties(options.paragraph, {
      implicitListParagraphStyle: false,
      inListOrder: false
    });
    this.runProperties = new RunProperties(options.run);
    this.root.push(this.paragraphProperties);
    this.root.push(this.runProperties);
  }
};
var StyleForCharacter = class extends Style {
  constructor(options) {
    super({
      type: "character",
      styleId: options.id
    }, _objectSpread2({
      uiPriority: 99,
      unhideWhenUsed: true
    }, options));
    _defineProperty(this, "runProperties", void 0);
    this.runProperties = new RunProperties(options.run);
    this.root.push(this.runProperties);
  }
};
var HeadingStyle = class extends StyleForParagraph {
  constructor(options) {
    super(_objectSpread2({
      basedOn: "Normal",
      next: "Normal",
      quickFormat: true
    }, options));
  }
};
var TitleStyle = class extends HeadingStyle {
  constructor(options) {
    super(_objectSpread2({
      id: "Title",
      name: "Title"
    }, options));
  }
};
var Heading1Style = class extends HeadingStyle {
  constructor(options) {
    super(_objectSpread2({
      id: "Heading1",
      name: "Heading 1"
    }, options));
  }
};
var Heading2Style = class extends HeadingStyle {
  constructor(options) {
    super(_objectSpread2({
      id: "Heading2",
      name: "Heading 2"
    }, options));
  }
};
var Heading3Style = class extends HeadingStyle {
  constructor(options) {
    super(_objectSpread2({
      id: "Heading3",
      name: "Heading 3"
    }, options));
  }
};
var Heading4Style = class extends HeadingStyle {
  constructor(options) {
    super(_objectSpread2({
      id: "Heading4",
      name: "Heading 4"
    }, options));
  }
};
var Heading5Style = class extends HeadingStyle {
  constructor(options) {
    super(_objectSpread2({
      id: "Heading5",
      name: "Heading 5"
    }, options));
  }
};
var Heading6Style = class extends HeadingStyle {
  constructor(options) {
    super(_objectSpread2({
      id: "Heading6",
      name: "Heading 6"
    }, options));
  }
};
var StrongStyle = class extends HeadingStyle {
  constructor(options) {
    super(_objectSpread2({
      id: "Strong",
      name: "Strong"
    }, options));
  }
};
var ListParagraph = class extends StyleForParagraph {
  constructor(options) {
    super(_objectSpread2({
      id: "ListParagraph",
      name: "List Paragraph",
      basedOn: "Normal",
      quickFormat: true
    }, options));
  }
};
var CaptionStyle = class extends StyleForParagraph {
  constructor(options) {
    super(_objectSpread2({
      id: "Caption",
      name: "caption",
      basedOn: "Normal",
      next: "Normal",
      uiPriority: 35,
      semiHidden: true,
      unhideWhenUsed: true,
      quickFormat: true,
      paragraph: { spacing: { after: 200 } },
      run: {
        italics: true,
        color: { theme: "dark2" },
        size: 18
      }
    }, options));
  }
};
var BibliographyStyle = class extends StyleForParagraph {
  constructor(options) {
    super(_objectSpread2({
      id: "Bibliography",
      name: "Bibliography",
      basedOn: "Normal",
      next: "Normal",
      uiPriority: 37,
      unhideWhenUsed: true
    }, options));
  }
};
var tableOfContentsStyles = /* @__PURE__ */ new WeakSet();
var isDefaultTableOfContentsStyle = (style) => tableOfContentsStyles.has(style);
var TableOfContentsStyle = class extends StyleForParagraph {
  /**
  * @param level - The level of the entries, 1 to 9
  * @param levelIndent - How much more each level is indented than the level above, in twips
  */
  constructor(level, levelIndent) {
    super({
      id: `TOC${level}`,
      name: `toc ${level}`,
      basedOn: "Normal",
      next: "Normal",
      uiPriority: 39,
      semiHidden: true,
      unhideWhenUsed: true,
      paragraph: _objectSpread2({ spacing: { after: 100 } }, level > 1 ? { indent: { left: (level - 1) * levelIndent } } : {})
    });
  }
  prepForXml(context) {
    const xml = super.prepForXml(context);
    tableOfContentsStyles.add(xml);
    return xml;
  }
};
var FootnoteText = class extends StyleForParagraph {
  constructor(options) {
    super(_objectSpread2({
      id: "FootnoteText",
      name: "footnote text",
      link: "FootnoteTextChar",
      basedOn: "Normal",
      uiPriority: 99,
      semiHidden: true,
      unhideWhenUsed: true,
      paragraph: { spacing: {
        after: 0,
        line: 240,
        lineRule: LineRuleType.AUTO
      } },
      run: { size: 20 }
    }, options));
  }
};
var FootnoteReferenceStyle = class extends StyleForCharacter {
  constructor(options) {
    super(_objectSpread2({
      id: "FootnoteReference",
      name: "footnote reference",
      basedOn: "DefaultParagraphFont",
      semiHidden: true,
      run: { superScript: true }
    }, options));
  }
};
var FootnoteTextChar = class extends StyleForCharacter {
  constructor(options) {
    super(_objectSpread2({
      id: "FootnoteTextChar",
      name: "Footnote Text Char",
      basedOn: "DefaultParagraphFont",
      link: "FootnoteText",
      semiHidden: true,
      run: { size: 20 }
    }, options));
  }
};
var EndnoteText = class extends StyleForParagraph {
  constructor(options) {
    super(_objectSpread2({
      id: "EndnoteText",
      name: "endnote text",
      link: "EndnoteTextChar",
      basedOn: "Normal",
      uiPriority: 99,
      semiHidden: true,
      unhideWhenUsed: true,
      paragraph: { spacing: {
        after: 0,
        line: 240,
        lineRule: LineRuleType.AUTO
      } },
      run: { size: 20 }
    }, options));
  }
};
var EndnoteReferenceStyle = class extends StyleForCharacter {
  constructor(options) {
    super(_objectSpread2({
      id: "EndnoteReference",
      name: "endnote reference",
      basedOn: "DefaultParagraphFont",
      semiHidden: true,
      run: { superScript: true }
    }, options));
  }
};
var EndnoteTextChar = class extends StyleForCharacter {
  constructor(options) {
    super(_objectSpread2({
      id: "EndnoteTextChar",
      name: "Endnote Text Char",
      basedOn: "DefaultParagraphFont",
      link: "EndnoteText",
      semiHidden: true,
      run: { size: 20 }
    }, options));
  }
};
var HyperlinkStyle = class extends StyleForCharacter {
  constructor(options) {
    super(_objectSpread2({
      id: "Hyperlink",
      name: "Hyperlink",
      basedOn: "DefaultParagraphFont",
      run: {
        color: "0563C1",
        underline: { type: UnderlineType.SINGLE }
      }
    }, options));
  }
};
var LineNumberStyle = class extends StyleForCharacter {
  constructor(options) {
    super(_objectSpread2({
      id: "LineNumber",
      name: "line number",
      basedOn: "DefaultParagraphFont",
      semiHidden: true
    }, options));
  }
};
var NormalTableStyle = class extends Style {
  constructor() {
    super({
      type: "table",
      styleId: "TableNormal",
      default: true
    }, {
      name: "Normal Table",
      uiPriority: 99,
      semiHidden: true,
      unhideWhenUsed: true
    });
    this.root.push(new TableProperties({
      indent: {
        size: 0,
        type: WidthType.DXA
      },
      cellMargin: {
        top: 0,
        left: 108,
        bottom: 0,
        right: 108
      }
    }));
  }
};
var nameOf$1 = (child2) => typeof child2 === "object" ? Object.keys(child2)[0] : void 0;
var attributesOf = (style) => {
  var _flat$find;
  return (_flat$find = [style["w:style"]].flat().find((part) => part._attr)) === null || _flat$find === void 0 ? void 0 : _flat$find._attr;
};
var styleIdOf = (style) => {
  var _attributesOf;
  return (_attributesOf = attributesOf(style)) === null || _attributesOf === void 0 ? void 0 : _attributesOf["w:styleId"];
};
var styleNameOf = (style) => {
  var _flat$find2;
  const name = (_flat$find2 = [style["w:style"]].flat().find((part) => nameOf$1(part) === "w:name")) === null || _flat$find2 === void 0 || (_flat$find2 = _flat$find2["w:name"]) === null || _flat$find2 === void 0 || (_flat$find2 = _flat$find2._attr) === null || _flat$find2 === void 0 ? void 0 : _flat$find2["w:val"];
  return name === void 0 ? void 0 : String(name).toLowerCase();
};
var isParagraphStyle = (child2) => {
  var _attributesOf$wType, _attributesOf2;
  return nameOf$1(child2) === "w:style" && ((_attributesOf$wType = (_attributesOf2 = attributesOf(child2)) === null || _attributesOf2 === void 0 ? void 0 : _attributesOf2["w:type"]) !== null && _attributesOf$wType !== void 0 ? _attributesOf$wType : "paragraph") === "paragraph";
};
var isDefaultParagraphStyle = (child2) => {
  const attributes = isParagraphStyle(child2) ? attributesOf(child2) : void 0;
  return (attributes === null || attributes === void 0 ? void 0 : attributes["w:default"]) !== void 0 && ![
    "0",
    "false",
    "off"
  ].includes(String(attributes["w:default"]));
};
var markedAsDefault = (style) => ({ "w:style": [style["w:style"]].flat().map((part) => part._attr ? { _attr: _objectSpread2(_objectSpread2({}, part._attr), {}, { "w:default": "1" }) } : part) });
var Styles = class extends XmlComponent {
  constructor(options) {
    super("w:styles");
    if (options.initialStyles) this.root.push(options.initialStyles);
    if (options.importedStyles) for (const style of options.importedStyles) this.root.push(style);
    if (options.paragraphStyles) for (const style of options.paragraphStyles) this.root.push(new StyleForParagraph(style));
    if (options.characterStyles) for (const style of options.characterStyles) this.root.push(new StyleForCharacter(style));
  }
  /**
  * Writes the styles in the schema's order: the document defaults, the latent styles, then the styles. A style id
  * can only be used once, so a style replaces an earlier one with its id. That way external styles replace docx's
  * default styles, and paragraph and character styles replace the default and imported ones. docx's TOC 1 to TOC 9
  * styles are also replaced by a paragraph style with their name, such as a template's in another language, with an id
  * of its own. Of several document defaults, or several latent styles, the last is kept. Normal is marked as the
  * default paragraph style when no style is.
  */
  prepForXml(context) {
    const xml = super.prepForXml(context);
    const children = xml["w:styles"];
    if (!Array.isArray(children)) return xml;
    const named = (name) => children.filter((child2) => nameOf$1(child2) === name);
    const ids = children.map((child2) => nameOf$1(child2) === "w:style" ? styleIdOf(child2) : void 0);
    const unique = children.filter((child2, index) => ![
      "_attr",
      "w:docDefaults",
      "w:latentStyles"
    ].includes(nameOf$1(child2)) && (ids[index] === void 0 || ids.lastIndexOf(ids[index]) === index));
    const otherNames = new Set(unique.filter((child2) => isParagraphStyle(child2) && !isDefaultTableOfContentsStyle(child2)).map(styleNameOf));
    const kept = unique.filter((child2) => !isDefaultTableOfContentsStyle(child2) || !otherNames.has(styleNameOf(child2)));
    const styles = kept.some(isDefaultParagraphStyle) ? kept : kept.map((child2) => isParagraphStyle(child2) && styleIdOf(child2) === "Normal" ? markedAsDefault(child2) : child2);
    return { "w:styles": [
      ...named("_attr"),
      ...named("w:docDefaults").slice(-1),
      ...named("w:latentStyles").slice(-1),
      ...styles
    ] };
  }
};
var ParagraphPropertiesDefaults = class extends XmlComponent {
  constructor(options) {
    super("w:pPrDefault");
    this.root.push(new ParagraphProperties(options, {
      implicitListParagraphStyle: false,
      inListOrder: false
    }));
  }
};
var RunPropertiesDefaults = class extends XmlComponent {
  constructor(options) {
    super("w:rPrDefault");
    this.root.push(new RunProperties(options));
  }
};
var DocumentDefaults = class extends XmlComponent {
  constructor(options) {
    super("w:docDefaults");
    _defineProperty(this, "runPropertiesDefaults", void 0);
    _defineProperty(this, "paragraphPropertiesDefaults", void 0);
    this.runPropertiesDefaults = new RunPropertiesDefaults(options.run);
    this.paragraphPropertiesDefaults = new ParagraphPropertiesDefaults(options.paragraph);
    this.root.push(this.runPropertiesDefaults);
    this.root.push(this.paragraphPropertiesDefaults);
  }
};
var ExternalStylesFactory = class {
  /**
  * Creates new Styles based on the given XML data.
  *
  * Parses the styles XML and converts them to XmlComponent instances.
  *
  * Example content from styles.xml:
  * ```xml
  * <?xml version="1.0"?>
  * <w:styles xmlns:mc="some schema" ...>
  *   <w:style w:type="paragraph" w:styleId="Heading1">
  *     <w:name w:val="heading 1"/>
  *     ...
  *   </w:style>
  *   <w:style w:type="paragraph" w:styleId="Heading2">
  *     <w:name w:val="heading 2"/>
  *     ...
  *   </w:style>
  *   <w:docDefaults>...</w:docDefaults>
  * </w:styles>
  * ```
  *
  * @param xmlData - XML string containing styles data from styles.xml
  * @returns Styles object containing all parsed styles
  * @throws Error if styles element cannot be found in the XML
  */
  newInstance(xmlData) {
    const xmlObj = parseXml(xmlData);
    let stylesXmlElement;
    for (const xmlElm of xmlObj.elements || []) if (xmlElm.name === "w:styles") stylesXmlElement = xmlElm;
    if (stylesXmlElement === void 0) throw new Error("can not find styles element");
    const stylesElements = stylesXmlElement.elements || [];
    return {
      initialStyles: new ImportedRootElementAttributes(stylesXmlElement.attributes),
      importedStyles: stylesElements.map((childElm) => convertToXmlComponent(childElm))
    };
  }
};
var tableOfContentsLevelIndentOf = (options) => {
  var _options$document;
  const size = (_options$document = options.document) === null || _options$document === void 0 || (_options$document = _options$document.run) === null || _options$document === void 0 ? void 0 : _options$document.size;
  if (size === void 0) return 200;
  return Math.round(typeof size === "number" ? size * 10 : universalMeasureToTwips(size));
};
var createTableOfContentsStyles = (levelIndent) => ({
  tableOfContents1: new TableOfContentsStyle(1, levelIndent),
  tableOfContents2: new TableOfContentsStyle(2, levelIndent),
  tableOfContents3: new TableOfContentsStyle(3, levelIndent),
  tableOfContents4: new TableOfContentsStyle(4, levelIndent),
  tableOfContents5: new TableOfContentsStyle(5, levelIndent),
  tableOfContents6: new TableOfContentsStyle(6, levelIndent),
  tableOfContents7: new TableOfContentsStyle(7, levelIndent),
  tableOfContents8: new TableOfContentsStyle(8, levelIndent),
  tableOfContents9: new TableOfContentsStyle(9, levelIndent)
});
var createDefaultStyles = (options = {}) => {
  var _options$document2;
  return _objectSpread2(_objectSpread2({
    normal: new StyleForParagraph({
      id: "Normal",
      name: "Normal",
      quickFormat: true
    }),
    normalTable: new NormalTableStyle(),
    document: new DocumentDefaults((_options$document2 = options.document) !== null && _options$document2 !== void 0 ? _options$document2 : {}),
    title: new TitleStyle(_objectSpread2({ run: { size: 56 } }, options.title)),
    heading1: new Heading1Style(_objectSpread2({ run: {
      color: "2E74B5",
      size: 32
    } }, options.heading1)),
    heading2: new Heading2Style(_objectSpread2({ run: {
      color: "2E74B5",
      size: 26
    } }, options.heading2)),
    heading3: new Heading3Style(_objectSpread2({ run: {
      color: "1F4D78",
      size: 24
    } }, options.heading3)),
    heading4: new Heading4Style(_objectSpread2({ run: {
      color: "2E74B5",
      italics: true
    } }, options.heading4)),
    heading5: new Heading5Style(_objectSpread2({ run: { color: "2E74B5" } }, options.heading5)),
    heading6: new Heading6Style(_objectSpread2({ run: { color: "1F4D78" } }, options.heading6)),
    strong: new StrongStyle(_objectSpread2({ run: { bold: true } }, options.strong)),
    listParagraph: new ListParagraph(options.listParagraph || {}),
    caption: new CaptionStyle(options.caption || {}),
    bibliography: new BibliographyStyle(options.bibliography || {})
  }, createTableOfContentsStyles(tableOfContentsLevelIndentOf(options))), {}, {
    hyperlink: new HyperlinkStyle(options.hyperlink || {}),
    footnoteReference: new FootnoteReferenceStyle(options.footnoteReference || {}),
    footnoteText: new FootnoteText(options.footnoteText || {}),
    footnoteTextChar: new FootnoteTextChar(options.footnoteTextChar || {}),
    endnoteReference: new EndnoteReferenceStyle(options.endnoteReference || {}),
    endnoteText: new EndnoteText(options.endnoteText || {}),
    endnoteTextChar: new EndnoteTextChar(options.endnoteTextChar || {}),
    lineNumber: new LineNumberStyle(options.lineNumber || {})
  });
};
var DefaultStylesFactory = class {
  newInstance(options = {}) {
    return {
      initialStyles: new DocumentAttributes([
        "mc",
        "r",
        "w",
        "w14",
        "w15"
      ], "w14 w15"),
      importedStyles: Object.values(createDefaultStyles(options))
    };
  }
};
var OFFICE_FONTS = {
  headings: {
    latin: "Calibri Light",
    panose: "020F0302020204030204"
  },
  body: {
    latin: "Calibri",
    panose: "020F0502020204030204"
  }
};
var OFFICE_SCRIPT_FONTS = [
  [
    "Jpan",
    "游ゴシック Light",
    "游明朝"
  ],
  ["Hang", "맑은 고딕"],
  [
    "Hans",
    "等线 Light",
    "等线"
  ],
  ["Hant", "新細明體"],
  [
    "Arab",
    "Times New Roman",
    "Arial"
  ],
  [
    "Hebr",
    "Times New Roman",
    "Arial"
  ],
  [
    "Thai",
    "Angsana New",
    "Cordia New"
  ],
  ["Ethi", "Nyala"],
  ["Beng", "Vrinda"],
  ["Gujr", "Shruti"],
  [
    "Khmr",
    "MoolBoran",
    "DaunPenh"
  ],
  ["Knda", "Tunga"],
  ["Guru", "Raavi"],
  ["Cans", "Euphemia"],
  ["Cher", "Plantagenet Cherokee"],
  ["Yiii", "Microsoft Yi Baiti"],
  ["Tibt", "Microsoft Himalaya"],
  ["Thaa", "MV Boli"],
  ["Deva", "Mangal"],
  ["Telu", "Gautami"],
  ["Taml", "Latha"],
  ["Syrc", "Estrangelo Edessa"],
  ["Orya", "Kalinga"],
  ["Mlym", "Kartika"],
  ["Laoo", "DokChampa"],
  ["Sinh", "Iskoola Pota"],
  ["Mong", "Mongolian Baiti"],
  [
    "Viet",
    "Times New Roman",
    "Arial"
  ],
  ["Uigh", "Microsoft Uighur"],
  ["Geor", "Sylfaen"],
  ["Armn", "Arial"],
  ["Bugi", "Leelawadee UI"],
  ["Bopo", "Microsoft JhengHei"],
  ["Java", "Javanese Text"],
  ["Lisu", "Segoe UI"],
  ["Mymr", "Myanmar Text"],
  ["Nkoo", "Ebrima"],
  ["Olck", "Nirmala UI"],
  ["Osma", "Ebrima"],
  ["Phag", "Phagspa"],
  ["Syrn", "Estrangelo Edessa"],
  ["Syrj", "Estrangelo Edessa"],
  ["Syre", "Estrangelo Edessa"],
  ["Sora", "Nirmala UI"],
  ["Tale", "Microsoft Tai Le"],
  ["Talu", "Microsoft New Tai Lue"],
  ["Tfng", "Ebrima"]
];
var createTextFont = (name, typeface, panose) => new BuilderElement({
  name,
  attributes: {
    typeface: {
      key: "typeface",
      value: typeface
    },
    panose: {
      key: "panose",
      value: panose
    }
  }
});
var themeLatinFont = (use, fonts) => {
  const font = fonts[use];
  const latin = typeof font === "string" ? font : font === null || font === void 0 ? void 0 : font.latin;
  return latin !== null && latin !== void 0 ? latin : OFFICE_FONTS[use].latin;
};
var themeScriptFonts = (use, scripts = {}) => {
  const office = OFFICE_SCRIPT_FONTS.map(([script, headings, body = headings]) => {
    var _scripts$script;
    return [script, (_scripts$script = scripts[script]) !== null && _scripts$script !== void 0 ? _scripts$script : use === "headings" ? headings : body];
  });
  const officeScripts = new Set(office.map(([script]) => script));
  return [...office, ...Object.entries(scripts).filter(([script]) => !officeScripts.has(script))];
};
var createFontCollection = (use, fonts) => {
  const font = fonts[use];
  const { eastAsia = "", complexScript = "", scripts } = typeof font === "object" ? font : {};
  const latin = themeLatinFont(use, fonts);
  const office = OFFICE_FONTS[use];
  return new BuilderElement({
    name: use === "headings" ? "a:majorFont" : "a:minorFont",
    children: [
      createTextFont("a:latin", latin, latin === office.latin ? office.panose : void 0),
      createTextFont("a:ea", eastAsia),
      createTextFont("a:cs", complexScript),
      ...themeScriptFonts(use, scripts).map(([script, typeface]) => new BuilderElement({
        name: "a:font",
        attributes: {
          script: {
            key: "script",
            value: script
          },
          typeface: {
            key: "typeface",
            value: typeface
          }
        }
      }))
    ]
  });
};
var createFontScheme = (name, fonts = {}) => new BuilderElement({
  name: "a:fontScheme",
  attributes: { name: {
    key: "name",
    value: name
  } },
  children: [createFontCollection("headings", fonts), createFontCollection("body", fonts)]
});
var createStyleColor = (changes = []) => new BuilderElement({
  name: "a:schemeClr",
  attributes: { value: {
    key: "val",
    value: "phClr"
  } },
  children: changes.map(([name, value]) => new BuilderElement({
    name: `a:${name}`,
    attributes: { value: {
      key: "val",
      value
    } }
  }))
});
var createSolidFill = (changes) => new BuilderElement({
  name: "a:solidFill",
  children: [createStyleColor(changes)]
});
var createGradientFill = (stops) => new BuilderElement({
  name: "a:gradFill",
  attributes: { rotateWithShape: {
    key: "rotWithShape",
    value: true
  } },
  children: [new BuilderElement({
    name: "a:gsLst",
    children: stops.map((changes, index) => new BuilderElement({
      name: "a:gs",
      attributes: { position: {
        key: "pos",
        value: index * 5e4
      } },
      children: [createStyleColor(changes)]
    }))
  }), new BuilderElement({
    name: "a:lin",
    attributes: {
      angle: {
        key: "ang",
        value: 54e5
      },
      scaled: {
        key: "scaled",
        value: false
      }
    }
  })]
});
var createLine = (width) => new BuilderElement({
  name: "a:ln",
  attributes: {
    width: {
      key: "w",
      value: width
    },
    cap: {
      key: "cap",
      value: "flat"
    },
    compound: {
      key: "cmpd",
      value: "sng"
    },
    alignment: {
      key: "algn",
      value: "ctr"
    }
  },
  children: [
    createSolidFill(),
    new BuilderElement({
      name: "a:prstDash",
      attributes: { value: {
        key: "val",
        value: "solid"
      } }
    }),
    new BuilderElement({
      name: "a:miter",
      attributes: { limit: {
        key: "lim",
        value: 8e5
      } }
    })
  ]
});
var createEffectStyle = (effects) => new BuilderElement({
  name: "a:effectStyle",
  children: [new BuilderElement({
    name: "a:effectLst",
    children: effects
  })]
});
var createShadow = () => new BuilderElement({
  name: "a:outerShdw",
  attributes: {
    blurRadius: {
      key: "blurRad",
      value: 57150
    },
    distance: {
      key: "dist",
      value: 19050
    },
    direction: {
      key: "dir",
      value: 54e5
    },
    alignment: {
      key: "algn",
      value: "ctr"
    },
    rotateWithShape: {
      key: "rotWithShape",
      value: false
    }
  },
  children: [new BuilderElement({
    name: "a:srgbClr",
    attributes: { value: {
      key: "val",
      value: "000000"
    } },
    children: [new BuilderElement({
      name: "a:alpha",
      attributes: { value: {
        key: "val",
        value: 63e3
      } }
    })]
  })]
});
var createFormatScheme = () => new BuilderElement({
  name: "a:fmtScheme",
  attributes: { name: {
    key: "name",
    value: "Office"
  } },
  children: [
    new BuilderElement({
      name: "a:fillStyleLst",
      children: [
        createSolidFill(),
        createGradientFill([
          [
            ["lumMod", 11e4],
            ["satMod", 105e3],
            ["tint", 67e3]
          ],
          [
            ["lumMod", 105e3],
            ["satMod", 103e3],
            ["tint", 73e3]
          ],
          [
            ["lumMod", 105e3],
            ["satMod", 109e3],
            ["tint", 81e3]
          ]
        ]),
        createGradientFill([
          [
            ["satMod", 103e3],
            ["lumMod", 102e3],
            ["tint", 94e3]
          ],
          [
            ["satMod", 11e4],
            ["lumMod", 1e5],
            ["shade", 1e5]
          ],
          [
            ["lumMod", 99e3],
            ["satMod", 12e4],
            ["shade", 78e3]
          ]
        ])
      ]
    }),
    new BuilderElement({
      name: "a:lnStyleLst",
      children: [
        createLine(6350),
        createLine(12700),
        createLine(19050)
      ]
    }),
    new BuilderElement({
      name: "a:effectStyleLst",
      children: [
        createEffectStyle([]),
        createEffectStyle([]),
        createEffectStyle([createShadow()])
      ]
    }),
    new BuilderElement({
      name: "a:bgFillStyleLst",
      children: [
        createSolidFill(),
        createSolidFill([["tint", 95e3], ["satMod", 17e4]]),
        createGradientFill([
          [
            ["tint", 93e3],
            ["satMod", 15e4],
            ["shade", 98e3],
            ["lumMod", 102e3]
          ],
          [
            ["tint", 98e3],
            ["satMod", 13e4],
            ["shade", 9e4],
            ["lumMod", 103e3]
          ],
          [["shade", 63e3], ["satMod", 12e4]]
        ])
      ]
    })
  ]
});
var Theme = class extends XmlComponent {
  constructor({ name = "Office Theme", colors, fonts } = {}) {
    super("a:theme");
    _defineProperty(this, "colors", void 0);
    this.colors = themeColorValues(colors);
    this.root.push(new NextAttributeComponent({
      namespace: {
        key: "xmlns:a",
        value: "http://schemas.openxmlformats.org/drawingml/2006/main"
      },
      name: {
        key: "name",
        value: name
      }
    }));
    this.root.push(new BuilderElement({
      name: "a:themeElements",
      children: [
        createColorScheme(colors ? name : "Office", colors),
        createFontScheme(fonts ? name : "Office", fonts),
        createFormatScheme()
      ]
    }));
    this.root.push(new BuilderElement({ name: "a:objectDefaults" }));
    this.root.push(new BuilderElement({ name: "a:extraClrSchemeLst" }));
  }
  /**
  * The hex color of each of the theme's colors. The system's window text and window colors are black and white.
  */
  get Colors() {
    return this.colors;
  }
};
var relationshipsPathOf = (path) => {
  const slash = path.lastIndexOf("/");
  return `${path.slice(0, slash + 1)}_rels/${path.slice(slash + 1)}.rels`;
};
var sourceOfRelationships = (path) => path.replace(/(^|\/)_rels\/([^/]*)\.rels$/, "$1$2");
var folderOf = (path) => path.slice(0, path.lastIndexOf("/") + 1);
var resolveTarget = (from, target) => {
  const normalized = target.replace(/\\/g, "/");
  return (normalized.startsWith("/") ? normalized : `${folderOf(from)}${normalized}`).split("/").reduce((segments, segment) => {
    if (segment === "" || segment === ".") return segments;
    return segment === ".." ? segments.slice(0, -1) : [...segments, segment];
  }, []).join("/");
};
var relativeTarget = (from, to) => {
  const folders = folderOf(from).split("/").filter(Boolean);
  const segments = to.split("/");
  const common = folders.findIndex((folder, index) => index >= segments.length - 1 || segments[index] !== folder);
  const shared = common === -1 ? folders.length : common;
  return [...folders.slice(shared).map(() => ".."), ...segments.slice(shared)].join("/");
};
var isSamePart = (path, other) => path.toLowerCase() === other.toLowerCase();
var u8 = Uint8Array;
var u16 = Uint16Array;
var i32 = Int32Array;
var fleb = new u8([
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  1,
  1,
  1,
  1,
  2,
  2,
  2,
  2,
  3,
  3,
  3,
  3,
  4,
  4,
  4,
  4,
  5,
  5,
  5,
  5,
  0,
  0,
  0,
  0
]);
var fdeb = new u8([
  0,
  0,
  0,
  0,
  1,
  1,
  2,
  2,
  3,
  3,
  4,
  4,
  5,
  5,
  6,
  6,
  7,
  7,
  8,
  8,
  9,
  9,
  10,
  10,
  11,
  11,
  12,
  12,
  13,
  13,
  0,
  0
]);
var clim = new u8([
  16,
  17,
  18,
  0,
  8,
  7,
  9,
  6,
  10,
  5,
  11,
  4,
  12,
  3,
  13,
  2,
  14,
  1,
  15
]);
var freb = function(eb, start) {
  var b = new u16(31);
  for (var i2 = 0; i2 < 31; ++i2) b[i2] = start += 1 << eb[i2 - 1];
  var r = new i32(b[30]);
  for (var i2 = 1; i2 < 30; ++i2) for (var j = b[i2]; j < b[i2 + 1]; ++j) r[j] = j - b[i2] << 5 | i2;
  return {
    b,
    r
  };
};
var _a = freb(fleb, 2);
var fl = _a.b;
var revfl = _a.r;
fl[28] = 258, revfl[258] = 28;
var _b = freb(fdeb, 0);
var fd = _b.b;
var revfd = _b.r;
var rev = new u16(32768);
for (i = 0; i < 32768; ++i) {
  x = (i & 43690) >> 1 | (i & 21845) << 1;
  x = (x & 52428) >> 2 | (x & 13107) << 2;
  x = (x & 61680) >> 4 | (x & 3855) << 4;
  rev[i] = ((x & 65280) >> 8 | (x & 255) << 8) >> 1;
}
var x;
var i;
var hMap = (function(cd, mb, r) {
  var s = cd.length;
  var i2 = 0;
  var l = new u16(mb);
  for (; i2 < s; ++i2) if (cd[i2]) ++l[cd[i2] - 1];
  var le = new u16(mb);
  for (i2 = 1; i2 < mb; ++i2) le[i2] = le[i2 - 1] + l[i2 - 1] << 1;
  var co;
  if (r) {
    co = new u16(1 << mb);
    var rvb = 15 - mb;
    for (i2 = 0; i2 < s; ++i2) if (cd[i2]) {
      var sv = i2 << 4 | cd[i2];
      var r_1 = mb - cd[i2];
      var v = le[cd[i2] - 1]++ << r_1;
      for (var m = v | (1 << r_1) - 1; v <= m; ++v) co[rev[v] >> rvb] = sv;
    }
  } else {
    co = new u16(s);
    for (i2 = 0; i2 < s; ++i2) if (cd[i2]) co[i2] = rev[le[cd[i2] - 1]++] >> 15 - cd[i2];
  }
  return co;
});
var flt = new u8(288);
for (i = 0; i < 144; ++i) flt[i] = 8;
var i;
for (i = 144; i < 256; ++i) flt[i] = 9;
var i;
for (i = 256; i < 280; ++i) flt[i] = 7;
var i;
for (i = 280; i < 288; ++i) flt[i] = 8;
var i;
var fdt = new u8(32);
for (i = 0; i < 32; ++i) fdt[i] = 5;
var i;
var flm = hMap(flt, 9, 0);
var flrm = hMap(flt, 9, 1);
var fdm = hMap(fdt, 5, 0);
var fdrm = hMap(fdt, 5, 1);
var max = function(a) {
  var m = a[0];
  for (var i2 = 1; i2 < a.length; ++i2) if (a[i2] > m) m = a[i2];
  return m;
};
var bits = function(d, p, m) {
  var o = p / 8 | 0;
  return (d[o] | d[o + 1] << 8) >> (p & 7) & m;
};
var bits16 = function(d, p) {
  var o = p / 8 | 0;
  return (d[o] | d[o + 1] << 8 | d[o + 2] << 16) >> (p & 7);
};
var shft = function(p) {
  return (p + 7) / 8 | 0;
};
var slc = function(v, s, e) {
  if (s == null || s < 0) s = 0;
  if (e == null || e > v.length) e = v.length;
  return new u8(v.subarray(s, e));
};
var ec = [
  "unexpected EOF",
  "invalid block type",
  "invalid length/literal",
  "invalid distance",
  "stream finished",
  "no stream handler",
  ,
  "no callback",
  "invalid UTF-8 data",
  "extra field too long",
  "date not in range 1980-2099",
  "filename too long",
  "stream finishing",
  "invalid zip data"
];
var err = function(ind, msg, nt) {
  var e = new Error(msg || ec[ind]);
  e.code = ind;
  if (Error.captureStackTrace) Error.captureStackTrace(e, err);
  if (!nt) throw e;
  return e;
};
var inflt = function(dat, st, buf, dict) {
  var sl = dat.length, dl = dict ? dict.length : 0;
  if (!sl || st.f && !st.l) return buf || new u8(0);
  var noBuf = !buf;
  var resize2 = noBuf || st.i != 2;
  var noSt = st.i;
  if (noBuf) buf = new u8(sl * 3);
  var cbuf = function(l2) {
    var bl = buf.length;
    if (l2 > bl) {
      var nbuf = new u8(Math.max(bl * 2, l2));
      nbuf.set(buf);
      buf = nbuf;
    }
  };
  var final = st.f || 0, pos = st.p || 0, bt = st.b || 0, lm = st.l, dm = st.d, lbt = st.m, dbt = st.n;
  var tbts = sl * 8;
  do {
    if (!lm) {
      final = bits(dat, pos, 1);
      var type = bits(dat, pos + 1, 3);
      pos += 3;
      if (!type) {
        var s = shft(pos) + 4, l = dat[s - 4] | dat[s - 3] << 8, t = s + l;
        if (t > sl) {
          if (noSt) err(0);
          break;
        }
        if (resize2) cbuf(bt + l);
        buf.set(dat.subarray(s, t), bt);
        st.b = bt += l, st.p = pos = t * 8, st.f = final;
        continue;
      } else if (type == 1) lm = flrm, dm = fdrm, lbt = 9, dbt = 5;
      else if (type == 2) {
        var hLit = bits(dat, pos, 31) + 257, hcLen = bits(dat, pos + 10, 15) + 4;
        var tl = hLit + bits(dat, pos + 5, 31) + 1;
        pos += 14;
        var ldt = new u8(tl);
        var clt = new u8(19);
        for (var i2 = 0; i2 < hcLen; ++i2) clt[clim[i2]] = bits(dat, pos + i2 * 3, 7);
        pos += hcLen * 3;
        var clb = max(clt), clbmsk = (1 << clb) - 1;
        var clm = hMap(clt, clb, 1);
        for (var i2 = 0; i2 < tl; ) {
          var r = clm[bits(dat, pos, clbmsk)];
          pos += r & 15;
          var s = r >> 4;
          if (s < 16) ldt[i2++] = s;
          else {
            var c = 0, n = 0;
            if (s == 16) n = 3 + bits(dat, pos, 3), pos += 2, c = ldt[i2 - 1];
            else if (s == 17) n = 3 + bits(dat, pos, 7), pos += 3;
            else if (s == 18) n = 11 + bits(dat, pos, 127), pos += 7;
            while (n--) ldt[i2++] = c;
          }
        }
        var lt = ldt.subarray(0, hLit), dt = ldt.subarray(hLit);
        lbt = max(lt);
        dbt = max(dt);
        lm = hMap(lt, lbt, 1);
        dm = hMap(dt, dbt, 1);
      } else err(1);
      if (pos > tbts) {
        if (noSt) err(0);
        break;
      }
    }
    if (resize2) cbuf(bt + 131072);
    var lms = (1 << lbt) - 1, dms = (1 << dbt) - 1;
    var lpos = pos;
    for (; ; lpos = pos) {
      var c = lm[bits16(dat, pos) & lms], sym = c >> 4;
      pos += c & 15;
      if (pos > tbts) {
        if (noSt) err(0);
        break;
      }
      if (!c) err(2);
      if (sym < 256) buf[bt++] = sym;
      else if (sym == 256) {
        lpos = pos, lm = null;
        break;
      } else {
        var add = sym - 254;
        if (sym > 264) {
          var i2 = sym - 257, b = fleb[i2];
          add = bits(dat, pos, (1 << b) - 1) + fl[i2];
          pos += b;
        }
        var d = dm[bits16(dat, pos) & dms], dsym = d >> 4;
        if (!d) err(3);
        pos += d & 15;
        var dt = fd[dsym];
        if (dsym > 3) {
          var b = fdeb[dsym];
          dt += bits16(dat, pos) & (1 << b) - 1, pos += b;
        }
        if (pos > tbts) {
          if (noSt) err(0);
          break;
        }
        if (resize2) cbuf(bt + 131072);
        var end = bt + add;
        if (bt < dt) {
          var shift = dl - dt, dend = Math.min(dt, end);
          if (shift + bt < 0) err(3);
          for (; bt < dend; ++bt) buf[bt] = dict[shift + bt];
        }
        for (; bt < end; ++bt) buf[bt] = buf[bt - dt];
      }
    }
    st.l = lm, st.p = lpos, st.b = bt, st.f = final;
    if (lm) final = 1, st.m = lbt, st.d = dm, st.n = dbt;
  } while (!final);
  return bt != buf.length && noBuf ? slc(buf, 0, bt) : buf.subarray(0, bt);
};
var wbits = function(d, p, v) {
  v <<= p & 7;
  var o = p / 8 | 0;
  d[o] |= v;
  d[o + 1] |= v >> 8;
};
var wbits16 = function(d, p, v) {
  v <<= p & 7;
  var o = p / 8 | 0;
  d[o] |= v;
  d[o + 1] |= v >> 8;
  d[o + 2] |= v >> 16;
};
var hTree = function(d, mb) {
  var t = [];
  for (var i2 = 0; i2 < d.length; ++i2) if (d[i2]) t.push({
    s: i2,
    f: d[i2]
  });
  var s = t.length;
  var t2 = t.slice();
  if (!s) return {
    t: et,
    l: 0
  };
  if (s == 1) {
    var v = new u8(t[0].s + 1);
    v[t[0].s] = 1;
    return {
      t: v,
      l: 1
    };
  }
  t.sort(function(a, b) {
    return a.f - b.f;
  });
  t.push({
    s: -1,
    f: 25001
  });
  var l = t[0], r = t[1], i0 = 0, i1 = 1, i22 = 2;
  t[0] = {
    s: -1,
    f: l.f + r.f,
    l,
    r
  };
  while (i1 != s - 1) {
    l = t[t[i0].f < t[i22].f ? i0++ : i22++];
    r = t[i0 != i1 && t[i0].f < t[i22].f ? i0++ : i22++];
    t[i1++] = {
      s: -1,
      f: l.f + r.f,
      l,
      r
    };
  }
  var maxSym = t2[0].s;
  for (var i2 = 1; i2 < s; ++i2) if (t2[i2].s > maxSym) maxSym = t2[i2].s;
  var tr = new u16(maxSym + 1);
  var mbt = ln(t[i1 - 1], tr, 0);
  if (mbt > mb) {
    var i2 = 0, dt = 0;
    var lft = mbt - mb, cst = 1 << lft;
    t2.sort(function(a, b) {
      return tr[b.s] - tr[a.s] || a.f - b.f;
    });
    for (; i2 < s; ++i2) {
      var i2_1 = t2[i2].s;
      if (tr[i2_1] > mb) {
        dt += cst - (1 << mbt - tr[i2_1]);
        tr[i2_1] = mb;
      } else break;
    }
    dt >>= lft;
    while (dt > 0) {
      var i2_2 = t2[i2].s;
      if (tr[i2_2] < mb) dt -= 1 << mb - tr[i2_2]++ - 1;
      else ++i2;
    }
    for (; i2 >= 0 && dt; --i2) {
      var i2_3 = t2[i2].s;
      if (tr[i2_3] == mb) {
        --tr[i2_3];
        ++dt;
      }
    }
    mbt = mb;
  }
  return {
    t: new u8(tr),
    l: mbt
  };
};
var ln = function(n, l, d) {
  return n.s == -1 ? Math.max(ln(n.l, l, d + 1), ln(n.r, l, d + 1)) : l[n.s] = d;
};
var lc = function(c) {
  var s = c.length;
  while (s && !c[--s]) ;
  var cl = new u16(++s);
  var cli = 0, cln = c[0], cls = 1;
  var w = function(v) {
    cl[cli++] = v;
  };
  for (var i2 = 1; i2 <= s; ++i2) if (c[i2] == cln && i2 != s) ++cls;
  else {
    if (!cln && cls > 2) {
      for (; cls > 138; cls -= 138) w(32754);
      if (cls > 2) {
        w(cls > 10 ? cls - 11 << 5 | 28690 : cls - 3 << 5 | 12305);
        cls = 0;
      }
    } else if (cls > 3) {
      w(cln), --cls;
      for (; cls > 6; cls -= 6) w(8304);
      if (cls > 2) w(cls - 3 << 5 | 8208), cls = 0;
    }
    while (cls--) w(cln);
    cls = 1;
    cln = c[i2];
  }
  return {
    c: cl.subarray(0, cli),
    n: s
  };
};
var clen = function(cf, cl) {
  var l = 0;
  for (var i2 = 0; i2 < cl.length; ++i2) l += cf[i2] * cl[i2];
  return l;
};
var wfblk = function(out, pos, dat) {
  var s = dat.length;
  var o = shft(pos + 2);
  out[o] = s & 255;
  out[o + 1] = s >> 8;
  out[o + 2] = out[o] ^ 255;
  out[o + 3] = out[o + 1] ^ 255;
  for (var i2 = 0; i2 < s; ++i2) out[o + i2 + 4] = dat[i2];
  return (o + 4 + s) * 8;
};
var wblk = function(dat, out, final, syms, lf, df, eb, li, bs, bl, p) {
  wbits(out, p++, final);
  ++lf[256];
  var _a2 = hTree(lf, 15), dlt = _a2.t, mlb = _a2.l;
  var _b2 = hTree(df, 15), ddt = _b2.t, mdb = _b2.l;
  var _c = lc(dlt), lclt = _c.c, nlc = _c.n;
  var _d = lc(ddt), lcdt = _d.c, ndc = _d.n;
  var lcfreq = new u16(19);
  for (var i2 = 0; i2 < lclt.length; ++i2) ++lcfreq[lclt[i2] & 31];
  for (var i2 = 0; i2 < lcdt.length; ++i2) ++lcfreq[lcdt[i2] & 31];
  var _e = hTree(lcfreq, 7), lct = _e.t, mlcb = _e.l;
  var nlcc = 19;
  for (; nlcc > 4 && !lct[clim[nlcc - 1]]; --nlcc) ;
  var flen = bl + 5 << 3;
  var ftlen = clen(lf, flt) + clen(df, fdt) + eb;
  var dtlen = clen(lf, dlt) + clen(df, ddt) + eb + 14 + 3 * nlcc + clen(lcfreq, lct) + 2 * lcfreq[16] + 3 * lcfreq[17] + 7 * lcfreq[18];
  if (bs >= 0 && flen <= ftlen && flen <= dtlen) return wfblk(out, p, dat.subarray(bs, bs + bl));
  var lm, ll, dm, dl;
  wbits(out, p, 1 + (dtlen < ftlen)), p += 2;
  if (dtlen < ftlen) {
    lm = hMap(dlt, mlb, 0), ll = dlt, dm = hMap(ddt, mdb, 0), dl = ddt;
    var llm = hMap(lct, mlcb, 0);
    wbits(out, p, nlc - 257);
    wbits(out, p + 5, ndc - 1);
    wbits(out, p + 10, nlcc - 4);
    p += 14;
    for (var i2 = 0; i2 < nlcc; ++i2) wbits(out, p + 3 * i2, lct[clim[i2]]);
    p += 3 * nlcc;
    var lcts = [lclt, lcdt];
    for (var it = 0; it < 2; ++it) {
      var clct = lcts[it];
      for (var i2 = 0; i2 < clct.length; ++i2) {
        var len = clct[i2] & 31;
        wbits(out, p, llm[len]), p += lct[len];
        if (len > 15) wbits(out, p, clct[i2] >> 5 & 127), p += clct[i2] >> 12;
      }
    }
  } else lm = flm, ll = flt, dm = fdm, dl = fdt;
  for (var i2 = 0; i2 < li; ++i2) {
    var sym = syms[i2];
    if (sym > 255) {
      var len = sym >> 18 & 31;
      wbits16(out, p, lm[len + 257]), p += ll[len + 257];
      if (len > 7) wbits(out, p, sym >> 23 & 31), p += fleb[len];
      var dst = sym & 31;
      wbits16(out, p, dm[dst]), p += dl[dst];
      if (dst > 3) wbits16(out, p, sym >> 5 & 8191), p += fdeb[dst];
    } else wbits16(out, p, lm[sym]), p += ll[sym];
  }
  wbits16(out, p, lm[256]);
  return p + ll[256];
};
var deo = new i32([
  65540,
  131080,
  131088,
  131104,
  262176,
  1048704,
  1048832,
  2114560,
  2117632
]);
var et = new u8(0);
var dflt = function(dat, lvl, plvl, pre, post, st) {
  var s = st.z || dat.length;
  var o = new u8(pre + s + 5 * (1 + Math.ceil(s / 7e3)) + post);
  var w = o.subarray(pre, o.length - post);
  var lst = st.l;
  var pos = (st.r || 0) & 7;
  if (lvl) {
    if (pos) w[0] = st.r >> 3;
    var opt = deo[lvl - 1];
    var n = opt >> 13, c = opt & 8191;
    var msk_1 = (1 << plvl) - 1;
    var prev = st.p || new u16(32768), head = st.h || new u16(msk_1 + 1);
    var bs1_1 = Math.ceil(plvl / 3), bs2_1 = 2 * bs1_1;
    var hsh = function(i3) {
      return (dat[i3] ^ dat[i3 + 1] << bs1_1 ^ dat[i3 + 2] << bs2_1) & msk_1;
    };
    var syms = new i32(25e3);
    var lf = new u16(288), df = new u16(32);
    var lc_1 = 0, eb = 0, i2 = st.i || 0, li = 0, wi = st.w || 0, bs = 0;
    for (; i2 + 2 < s; ++i2) {
      var hv = hsh(i2);
      var imod = i2 & 32767, pimod = head[hv];
      prev[imod] = pimod;
      head[hv] = imod;
      if (wi <= i2) {
        var rem = s - i2;
        if ((lc_1 > 7e3 || li > 24576) && (rem > 423 || !lst)) {
          pos = wblk(dat, w, 0, syms, lf, df, eb, li, bs, i2 - bs, pos);
          li = lc_1 = eb = 0, bs = i2;
          for (var j = 0; j < 286; ++j) lf[j] = 0;
          for (var j = 0; j < 30; ++j) df[j] = 0;
        }
        var l = 2, d = 0, ch_1 = c, dif = imod - pimod & 32767;
        if (rem > 2 && hv == hsh(i2 - dif)) {
          var maxn = Math.min(n, rem) - 1;
          var maxd = Math.min(32767, i2);
          var ml = Math.min(258, rem);
          while (dif <= maxd && --ch_1 && imod != pimod) {
            if (dat[i2 + l] == dat[i2 + l - dif]) {
              var nl = 0;
              for (; nl < ml && dat[i2 + nl] == dat[i2 + nl - dif]; ++nl) ;
              if (nl > l) {
                l = nl, d = dif;
                if (nl > maxn) break;
                var mmd = Math.min(dif, nl - 2);
                var md = 0;
                for (var j = 0; j < mmd; ++j) {
                  var ti = i2 - dif + j & 32767;
                  var cd = ti - prev[ti] & 32767;
                  if (cd > md) md = cd, pimod = ti;
                }
              }
            }
            imod = pimod, pimod = prev[imod];
            dif += imod - pimod & 32767;
          }
        }
        if (d) {
          syms[li++] = 268435456 | revfl[l] << 18 | revfd[d];
          var lin = revfl[l] & 31, din = revfd[d] & 31;
          eb += fleb[lin] + fdeb[din];
          ++lf[257 + lin];
          ++df[din];
          wi = i2 + l;
          ++lc_1;
        } else {
          syms[li++] = dat[i2];
          ++lf[dat[i2]];
        }
      }
    }
    for (i2 = Math.max(i2, wi); i2 < s; ++i2) {
      syms[li++] = dat[i2];
      ++lf[dat[i2]];
    }
    pos = wblk(dat, w, lst, syms, lf, df, eb, li, bs, i2 - bs, pos);
    if (!lst) {
      st.r = pos & 7 | w[pos / 8 | 0] << 3;
      pos -= 7;
      st.h = head, st.p = prev, st.i = i2, st.w = wi;
    }
  } else {
    for (var i2 = st.w || 0; i2 < s + lst; i2 += 65535) {
      var e = i2 + 65535;
      if (e >= s) {
        w[pos / 8 | 0] = lst;
        e = s;
      }
      pos = wfblk(w, pos + 1, dat.subarray(i2, e));
    }
    st.i = s;
  }
  return slc(o, 0, pre + shft(pos) + post);
};
var crct = (function() {
  var t = new Int32Array(256);
  for (var i2 = 0; i2 < 256; ++i2) {
    var c = i2, k = 9;
    while (--k) c = (c & 1 && -306674912) ^ c >>> 1;
    t[i2] = c;
  }
  return t;
})();
var crc = function() {
  var c = -1;
  return {
    p: function(d) {
      var cr = c;
      for (var i2 = 0; i2 < d.length; ++i2) cr = crct[cr & 255 ^ d[i2]] ^ cr >>> 8;
      c = cr;
    },
    d: function() {
      return ~c;
    }
  };
};
var dopt = function(dat, opt, pre, post, st) {
  if (!st) {
    st = { l: 1 };
    if (opt.dictionary) {
      var dict = opt.dictionary.subarray(-32768);
      var newDat = new u8(dict.length + dat.length);
      newDat.set(dict);
      newDat.set(dat, dict.length);
      dat = newDat;
      st.w = dict.length;
    }
  }
  return dflt(dat, opt.level == null ? 6 : opt.level, opt.mem == null ? st.l ? Math.ceil(Math.max(8, Math.min(13, Math.log(dat.length))) * 1.5) : 20 : 12 + opt.mem, pre, post, st);
};
var mrg = function(a, b) {
  var o = {};
  for (var k in a) o[k] = a[k];
  for (var k in b) o[k] = b[k];
  return o;
};
var b2 = function(d, b) {
  return d[b] | d[b + 1] << 8;
};
var b4 = function(d, b) {
  return (d[b] | d[b + 1] << 8 | d[b + 2] << 16 | d[b + 3] << 24) >>> 0;
};
var b8 = function(d, b) {
  return b4(d, b) + b4(d, b + 4) * 4294967296;
};
var wbytes = function(d, b, v) {
  for (; v; ++b) d[b] = v, v >>>= 8;
};
function deflateSync(data, opts) {
  return dopt(data, opts || {}, 0, 0);
}
function inflateSync(data, opts) {
  return inflt(data, { i: 2 }, opts && opts.out, opts && opts.dictionary);
}
var fltn = function(d, p, t, o) {
  for (var k in d) {
    var val = d[k], n = p + k, op = o;
    if (Array.isArray(val)) op = mrg(o, val[1]), val = val[0];
    if (ArrayBuffer.isView(val)) t[n] = [val, op];
    else {
      t[n += "/"] = [new u8(0), op];
      fltn(val, n, t, o);
    }
  }
};
var te = typeof TextEncoder != "undefined" && new TextEncoder();
var td = typeof TextDecoder != "undefined" && new TextDecoder();
try {
  td.decode(et, { stream: true });
} catch (e) {
}
var dutf8 = function(d) {
  for (var r = "", i2 = 0; ; ) {
    var c = d[i2++];
    var eb = (c > 127) + (c > 223) + (c > 239);
    if (i2 + eb > d.length) return {
      s: r,
      r: slc(d, i2 - 1)
    };
    if (!eb) r += String.fromCharCode(c);
    else if (eb == 3) c = ((c & 15) << 18 | (d[i2++] & 63) << 12 | (d[i2++] & 63) << 6 | d[i2++] & 63) - 65536, r += String.fromCharCode(55296 | c >> 10, 56320 | c & 1023);
    else if (eb & 1) r += String.fromCharCode((c & 31) << 6 | d[i2++] & 63);
    else r += String.fromCharCode((c & 15) << 12 | (d[i2++] & 63) << 6 | d[i2++] & 63);
  }
};
function strToU8(str, latin1) {
  if (latin1) {
    var ar_1 = new u8(str.length);
    for (var i2 = 0; i2 < str.length; ++i2) ar_1[i2] = str.charCodeAt(i2);
    return ar_1;
  }
  if (te) return te.encode(str);
  var l = str.length;
  var ar = new u8(str.length + (str.length >> 1));
  var ai = 0;
  var w = function(v) {
    ar[ai++] = v;
  };
  for (var i2 = 0; i2 < l; ++i2) {
    if (ai + 5 > ar.length) {
      var n = new u8(ai + 8 + (l - i2 << 1));
      n.set(ar);
      ar = n;
    }
    var c = str.charCodeAt(i2);
    if (c < 128 || latin1) w(c);
    else if (c < 2048) w(192 | c >> 6), w(128 | c & 63);
    else if (c > 55295 && c < 57344) c = 65536 + (c & 1047552) | str.charCodeAt(++i2) & 1023, w(240 | c >> 18), w(128 | c >> 12 & 63), w(128 | c >> 6 & 63), w(128 | c & 63);
    else w(224 | c >> 12), w(128 | c >> 6 & 63), w(128 | c & 63);
  }
  return slc(ar, 0, ai);
}
function strFromU8(dat, latin1) {
  if (latin1) {
    var r = "";
    for (var i2 = 0; i2 < dat.length; i2 += 16384) r += String.fromCharCode.apply(null, dat.subarray(i2, i2 + 16384));
    return r;
  } else if (td) return td.decode(dat);
  else {
    var _a2 = dutf8(dat), s = _a2.s, r = _a2.r;
    if (r.length) err(8);
    return s;
  }
}
var slzh = function(d, b) {
  return b + 30 + b2(d, b + 26) + b2(d, b + 28);
};
var zh = function(d, b, z) {
  var fnl = b2(d, b + 28), efl = b2(d, b + 30), fn = strFromU8(d.subarray(b + 46, b + 46 + fnl), !(b2(d, b + 8) & 2048)), es = b + 46 + fnl;
  var _a2 = z64hs(d, es, efl, z, b4(d, b + 20), b4(d, b + 24), b4(d, b + 42)), sc = _a2[0], su = _a2[1], off = _a2[2];
  return [
    b2(d, b + 10),
    sc,
    su,
    fn,
    es + efl + b2(d, b + 32),
    off
  ];
};
var z64hs = function(d, b, l, z, sc, su, off) {
  var nsc = sc == 4294967295, nsu = su == 4294967295, noff = off == 4294967295, e = b + l;
  var nf = nsc + nsu + noff;
  if (z && nf) {
    for (; b + 4 < e; b += 4 + b2(d, b + 2)) if (b2(d, b) == 1) return [
      nsc ? b8(d, b + 4 + 8 * nsu) : sc,
      nsu ? b8(d, b + 4) : su,
      noff ? b8(d, b + 4 + 8 * (nsu + nsc)) : off,
      1
    ];
    if (z < 2) err(13);
  }
  return [
    sc,
    su,
    off,
    0
  ];
};
var exfl = function(ex) {
  var le = 0;
  if (ex) for (var k in ex) {
    var l = ex[k].length;
    if (l > 65535) err(9);
    le += l + 4;
  }
  return le;
};
var wzh = function(d, b, f, fn, u, c, ce, co) {
  var fl2 = fn.length, ex = f.extra, col = co && co.length;
  var exl = exfl(ex);
  wbytes(d, b, ce != null ? 33639248 : 67324752), b += 4;
  if (ce != null) d[b++] = 20, d[b++] = f.os;
  d[b] = 20, b += 2;
  d[b++] = f.flag << 1 | (c < 0 && 8), d[b++] = u && 8;
  d[b++] = f.compression & 255, d[b++] = f.compression >> 8;
  var dt = new Date(f.mtime == null ? Date.now() : f.mtime), y = dt.getFullYear() - 1980;
  if (y < 0 || y > 119) err(10);
  wbytes(d, b, y << 25 | dt.getMonth() + 1 << 21 | dt.getDate() << 16 | dt.getHours() << 11 | dt.getMinutes() << 5 | dt.getSeconds() >> 1), b += 4;
  if (c != -1) {
    wbytes(d, b, f.crc);
    wbytes(d, b + 4, c < 0 ? -c - 2 : c);
    wbytes(d, b + 8, f.size);
  }
  wbytes(d, b + 12, fl2);
  wbytes(d, b + 14, exl), b += 16;
  if (ce != null) {
    wbytes(d, b, col);
    wbytes(d, b + 6, f.attrs);
    wbytes(d, b + 10, ce), b += 14;
  }
  d.set(fn, b);
  b += fl2;
  if (exl) for (var k in ex) {
    var exf = ex[k], l = exf.length;
    wbytes(d, b, +k);
    wbytes(d, b + 2, l);
    d.set(exf, b + 4), b += 4 + l;
  }
  if (col) d.set(co, b), b += col;
  return b;
};
var wzf = function(o, b, c, d, e) {
  wbytes(o, b, 101010256);
  wbytes(o, b + 8, c);
  wbytes(o, b + 10, c);
  wbytes(o, b + 12, d);
  wbytes(o, b + 16, e);
};
function zipSync(data, opts) {
  if (!opts) opts = {};
  var r = {};
  var files = [];
  fltn(data, "", r, opts);
  var o = 0;
  var tot = 0;
  for (var fn in r) {
    var _a2 = r[fn], file = _a2[0], p = _a2[1];
    var compression = p.level == 0 ? 0 : 8;
    var f = strToU8(fn), s = f.length;
    var com = p.comment, m = com && strToU8(com), ms = m && m.length;
    var exl = exfl(p.extra);
    if (s > 65535) err(11);
    var d = compression ? deflateSync(file, p) : file, l = d.length;
    var c = crc();
    c.p(file);
    files.push(mrg(p, {
      size: file.length,
      crc: c.d(),
      c: d,
      f,
      m,
      u: s != fn.length || m && com.length != ms,
      o,
      compression
    }));
    o += 30 + s + exl + l;
    tot += 76 + 2 * (s + exl) + (ms || 0) + l;
  }
  var out = new u8(tot + 22), oe = o, cdl = tot - o;
  for (var i2 = 0; i2 < files.length; ++i2) {
    var f = files[i2];
    wzh(out, f.o, f, f.f, f.u, f.c.length);
    var badd = 30 + f.f.length + exfl(f.extra);
    out.set(f.c, f.o + badd);
    wzh(out, o, f, f.f, f.u, f.c.length, f.o, f.m), o += 16 + badd + (f.m ? f.m.length : 0);
  }
  wzf(out, o, files.length, cdl, oe);
  return out;
}
function unzipSync(data, opts) {
  var files = {};
  var e = data.length - 22;
  for (; b4(data, e) != 101010256; --e) if (!e || data.length - e > 65558) err(13);
  var c = b2(data, e + 8);
  if (!c) return {};
  var o = b4(data, e + 16);
  var z = b4(data, e - 20) == 117853008;
  if (z) {
    var ze = b4(data, e - 12);
    z = b4(data, ze) == 101075792;
    if (z) {
      c = b4(data, ze + 32);
      o = b4(data, ze + 48);
    }
  }
  var fltr = opts && opts.filter;
  for (var i2 = 0; i2 < c; ++i2) {
    var _a2 = zh(data, o, z), c_2 = _a2[0], sc = _a2[1], su = _a2[2], fn = _a2[3], no = _a2[4], off = _a2[5], b = slzh(data, off);
    o = no;
    if (!fltr || fltr({
      name: fn,
      size: sc,
      originalSize: su,
      compression: c_2
    })) {
      if (!c_2) files[fn] = slc(data, b, b + sc);
      else if (c_2 == 8) files[fn] = inflateSync(data.subarray(b, b + sc), { out: new u8(su) });
      else err(14, "unknown compression type " + c_2);
    }
  }
  return files;
}
var bytesOf$2 = (data) => typeof data === "string" ? encodeUtf8(data) : ArrayBuffer.isView(data) ? new Uint8Array(data.buffer, data.byteOffset, data.byteLength) : new Uint8Array(data);
var zipFiles = (files) => zipSync(Object.fromEntries([...files].map(([path, data]) => [path, bytesOf$2(data)])));
var MAX_DEFLATE_RATIO = 1032;
var wrongSize = (path) => new Error(`Corrupted zip: ${path} isn't the size the zip file gives it`);
var unzipFiles = (data, include = () => true) => {
  const sizes = /* @__PURE__ */ new Map();
  let compressed = 0;
  const files = unzipSync(data, { filter: ({ name, size, originalSize }) => {
    if (name.endsWith("/") || !include(name)) return false;
    compressed += size;
    if (compressed > data.length || originalSize > size * MAX_DEFLATE_RATIO) throw wrongSize(name);
    sizes.set(name, originalSize);
    return true;
  } });
  const wrong = Object.entries(files).find(([path, file]) => file.length !== sizes.get(path));
  if (wrong !== void 0) throw wrongSize(wrong[0]);
  return new Map(Object.entries(files));
};
var binaryStringOf = (data) => {
  let text = "";
  for (let start = 0; start < data.length; start += 32768) text += String.fromCharCode(...data.subarray(start, start + 32768));
  return text;
};
var unsupported = (type) => new Error(`${type} is not supported by this platform`);
var OUTPUTS = {
  uint8array: (data) => data,
  arraybuffer: (data) => data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength),
  array: (data) => Array.from(data),
  string: binaryStringOf,
  binarystring: binaryStringOf,
  base64: (data) => btoa(binaryStringOf(data)),
  blob: (data, mimeType) => {
    if (typeof Blob === "undefined") throw unsupported("blob");
    return new Blob([data], { type: mimeType });
  },
  nodebuffer: (data) => {
    if (typeof Buffer === "undefined") throw unsupported("nodebuffer");
    return Buffer.from(data.buffer, data.byteOffset, data.byteLength);
  },
  text: () => {
    throw unsupported("text");
  }
};
var zipOutput = (data, type, mimeType) => {
  const output = Object.prototype.hasOwnProperty.call(OUTPUTS, type.toLowerCase()) ? OUTPUTS[type.toLowerCase()] : void 0;
  if (output === void 0) throw unsupported(type);
  return output(data, mimeType);
};
var COLOR_NAMES = /* @__PURE__ */ new Map([
  ["dk1", "dark1"],
  ["lt1", "light1"],
  ["dk2", "dark2"],
  ["lt2", "light2"],
  ["accent1", "accent1"],
  ["accent2", "accent2"],
  ["accent3", "accent3"],
  ["accent4", "accent4"],
  ["accent5", "accent5"],
  ["accent6", "accent6"],
  ["hlink", "hyperlink"],
  ["folHlink", "followedHyperlink"]
]);
var DEFAULT_SYSTEM_COLORS = /* @__PURE__ */ new Map([["dark1", "windowText"], ["light1", "window"]]);
var MAIN_PART_TYPES = /* @__PURE__ */ new Set(["http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument", "http://purl.oclc.org/ooxml/officeDocument/relationships/officeDocument"]);
var THEME_TYPES = /* @__PURE__ */ new Set(["http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme", "http://purl.oclc.org/ooxml/officeDocument/relationships/theme"]);
var localName$1 = (element) => {
  var _element$name$slice, _element$name;
  return (_element$name$slice = element === null || element === void 0 || (_element$name = element.name) === null || _element$name === void 0 ? void 0 : _element$name.slice(element.name.indexOf(":") + 1)) !== null && _element$name$slice !== void 0 ? _element$name$slice : "";
};
var childElements = (element) => {
  var _element$elements$fil, _element$elements;
  return (_element$elements$fil = element === null || element === void 0 || (_element$elements = element.elements) === null || _element$elements === void 0 ? void 0 : _element$elements.filter((item) => item.type === "element")) !== null && _element$elements$fil !== void 0 ? _element$elements$fil : [];
};
var child = (element, name) => childElements(element).find((item) => localName$1(item) === name);
var attribute = (element, name) => {
  var _element$attributes;
  const value = element === null || element === void 0 || (_element$attributes = element.attributes) === null || _element$attributes === void 0 ? void 0 : _element$attributes[name];
  return value === void 0 ? void 0 : String(value);
};
var isZip = (bytes) => bytes[0] === 80 && bytes[1] === 75 && bytes[2] === 3 && bytes[3] === 4;
var decode$1 = (bytes) => new TextDecoder(bytes[0] === 255 && bytes[1] === 254 ? "utf-16le" : bytes[0] === 254 && bytes[1] === 255 ? "utf-16be" : "utf-8").decode(bytes);
var defined = (object) => Object.fromEntries(Object.entries(object).filter(([, value]) => value !== void 0));
var relatedPart = (files, from, types) => {
  const relationships = files.get(relationshipsPathOf(from));
  const target = attribute(relationships && childElements(child(parseXml(decode$1(relationships)), "Relationships")).find((item) => {
    var _attribute;
    return types.has((_attribute = attribute(item, "Type")) !== null && _attribute !== void 0 ? _attribute : "");
  }), "Target");
  return target === void 0 ? void 0 : resolveTarget(from, target);
};
var themePathOf = (files, part) => relatedPart(files, part, THEME_TYPES);
var packageThemeXml = (bytes) => {
  const relationships = unzipFiles(bytes, (path) => path.endsWith(".rels"));
  const mainPart = relatedPart(relationships, "", MAIN_PART_TYPES);
  if (mainPart === void 0) throw new Error("Invalid file: a zip file that isn't a Word, PowerPoint or Excel file or an Office theme (.thmx)");
  const themePath = themePathOf(relationships, mainPart);
  const theme = themePath === void 0 ? void 0 : [...unzipFiles(bytes, (path) => isSamePart(path, themePath)).values()][0];
  if (theme === void 0) throw new Error(`The file has no theme: its main part, ${mainPart}, refers to none`);
  return decode$1(theme);
};
var colorValue = (name, color, withSystemColors) => {
  const [value] = childElements(color);
  const hex = localName$1(value) === "srgbClr" ? attribute(value, "val") : localName$1(value) === "sysClr" && (withSystemColors || attribute(value, "val") !== DEFAULT_SYSTEM_COLORS.get(name)) ? attribute(value, "lastClr") : void 0;
  return hex !== void 0 && /^[0-9A-Fa-f]{6}$/.test(hex) ? hex.toUpperCase() : void 0;
};
var readColors = (scheme, withSystemColors = false) => Object.fromEntries(childElements(scheme).flatMap((color) => {
  const name = COLOR_NAMES.get(localName$1(color));
  const value = name && colorValue(name, color, withSystemColors);
  return name && value ? [[name, value]] : [];
}));
var readThemeColorValues = (xml) => {
  const [root] = childElements(parseXml(xml));
  const scheme = localName$1(root) === "theme" ? child(child(root, "themeElements"), "clrScheme") : void 0;
  return scheme ? readColors(scheme, true) : {};
};
var typefaceOf = (font) => attribute(font, "typeface") || void 0;
var readFont = (collection) => {
  const scripts = childElements(collection).filter((font) => localName$1(font) === "font").flatMap((font) => {
    const script = attribute(font, "script");
    const typeface = attribute(font, "typeface");
    return script && typeface !== void 0 ? [[script, typeface]] : [];
  });
  return defined({
    latin: typefaceOf(child(collection, "latin")),
    eastAsia: typefaceOf(child(collection, "ea")),
    complexScript: typefaceOf(child(collection, "cs")),
    scripts: scripts.length > 0 ? Object.fromEntries(scripts) : void 0
  });
};
var readFonts = (scheme) => ({
  headings: readFont(child(scheme, "majorFont")),
  body: readFont(child(scheme, "minorFont"))
});
var xmlOf = (data) => {
  if (typeof data === "string") return data;
  const bytes = ArrayBuffer.isView(data) ? new Uint8Array(data.buffer, data.byteOffset, data.byteLength) : new Uint8Array(data);
  return isZip(bytes) ? packageThemeXml(bytes) : decode$1(bytes);
};
var readTheme = (data) => {
  const [root] = childElements(parseXml(xmlOf(data)));
  if (localName$1(root) === "clrScheme") return { colors: readColors(root) };
  if (localName$1(root) === "fontScheme") return { fonts: readFonts(root) };
  if (localName$1(root) !== "theme") {
    var _root$name;
    throw new Error(`Invalid theme: expected the XML of a theme, such as a document's word/theme/theme1.xml, but its root element is ${(_root$name = root === null || root === void 0 ? void 0 : root.name) !== null && _root$name !== void 0 ? _root$name : "missing"}`);
  }
  const elements = child(root, "themeElements");
  const colorScheme = child(elements, "clrScheme");
  const fontScheme = child(elements, "fontScheme");
  return defined({
    name: attribute(root, "name") || void 0,
    colors: colorScheme && readColors(colorScheme),
    fonts: fontScheme && readFonts(fontScheme)
  });
};
var COMPOUND_FILE_SIGNATURE = [
  208,
  207,
  17,
  224,
  161,
  177,
  26,
  225
];
var File = class {
  constructor(options) {
    var _options$creator, _options$revision, _options$lastModified, _options$comments, _options$customProper, _this$macros, _options$features, _options$features2, _options$fonts, _options$hyphenation, _options$hyphenation2, _options$hyphenation3, _options$hyphenation4, _options$fonts2;
    _defineProperty(this, "currentRelationshipId", 1);
    _defineProperty(this, "documentWrapper", void 0);
    _defineProperty(this, "headers", []);
    _defineProperty(this, "footers", []);
    _defineProperty(this, "coreProperties", void 0);
    _defineProperty(this, "numbering", void 0);
    _defineProperty(this, "media", void 0);
    _defineProperty(this, "fileRelationships", void 0);
    _defineProperty(this, "footnotesWrapper", void 0);
    _defineProperty(this, "endnotesWrapper", void 0);
    _defineProperty(this, "settings", void 0);
    _defineProperty(this, "contentTypes", void 0);
    _defineProperty(this, "customProperties", void 0);
    _defineProperty(this, "appProperties", void 0);
    _defineProperty(this, "styles", void 0);
    _defineProperty(this, "comments", void 0);
    _defineProperty(
      this,
      /** Extended comment data for reply threading and resolved state (word/commentsExtended.xml). */
      "commentsExtended",
      void 0
    );
    _defineProperty(
      this,
      /** Durable comment id mapping (word/commentsIds.xml). */
      "commentsIds",
      void 0
    );
    _defineProperty(this, "fontWrapper", void 0);
    _defineProperty(this, "theme", void 0);
    _defineProperty(this, "packageParts", void 0);
    _defineProperty(this, "macros", void 0);
    _defineProperty(this, "bibliography", void 0);
    if (options.macros !== void 0) {
      const { project, events = [] } = options.macros;
      const bytes = project instanceof Uint8Array ? project : new Uint8Array(project);
      if (!COMPOUND_FILE_SIGNATURE.every((byte, index) => bytes[index] === byte)) throw new Error("macros.project isn't a VBA project. Use createMacros from docx/macros, or the word/vbaProject.bin in a .docm rather than the .docm itself");
      const relationships = new Relationships();
      if (events.length > 0) relationships.addRelationship(1, "http://schemas.microsoft.com/office/2006/relationships/wordVbaData", "vbaData.xml");
      this.macros = {
        project: bytes,
        events: events.length > 0 ? createMacroEvents(events) : void 0,
        relationships
      };
    }
    this.coreProperties = new CoreProperties(_objectSpread2(_objectSpread2({}, options), {}, {
      creator: (_options$creator = options.creator) !== null && _options$creator !== void 0 ? _options$creator : "Un-named",
      revision: (_options$revision = options.revision) !== null && _options$revision !== void 0 ? _options$revision : 1,
      lastModifiedBy: (_options$lastModified = options.lastModifiedBy) !== null && _options$lastModified !== void 0 ? _options$lastModified : "Un-named"
    }));
    this.numbering = new Numbering(options.numbering ? options.numbering : { config: [] });
    this.comments = new Comments((_options$comments = options.comments) !== null && _options$comments !== void 0 ? _options$comments : { children: [] });
    if (this.comments.ThreadData) this.commentsExtended = new CommentsExtended(this.comments.ThreadData);
    if (this.comments.CommentIdsData) this.commentsIds = new CommentsIds(this.comments.CommentIdsData);
    this.fileRelationships = new Relationships();
    this.customProperties = new CustomProperties((_options$customProper = options.customProperties) !== null && _options$customProper !== void 0 ? _options$customProper : []);
    this.appProperties = new AppProperties();
    this.footnotesWrapper = new FootnotesWrapper();
    this.endnotesWrapper = new EndnotesWrapper();
    this.contentTypes = new ContentTypes({ macros: this.macros !== void 0 });
    if (((_this$macros = this.macros) === null || _this$macros === void 0 ? void 0 : _this$macros.events) !== void 0) this.contentTypes.addOverride("application/vnd.ms-word.vbaData+xml", "/word/vbaData.xml");
    if (options.bibliography !== void 0) {
      const relationships = new Relationships();
      relationships.addRelationship(1, "http://schemas.openxmlformats.org/officeDocument/2006/relationships/customXmlProps", "itemProps1.xml");
      this.bibliography = {
        sources: options.bibliography.sources,
        properties: createSourcesProperties(`{${uniqueUuid().toUpperCase()}}`),
        relationships
      };
      this.contentTypes.addOverride("application/vnd.openxmlformats-officedocument.customXmlProperties+xml", "/customXml/itemProps1.xml");
    }
    this.packageParts = new PackageParts(this.contentTypes);
    this.documentWrapper = new DocumentWrapper({
      background: options.background,
      pageNumbers: options.pageNumbers
    });
    this.settings = new Settings({
      compatibilityModeVersion: options.compatabilityModeVersion,
      compatibility: options.compatibility,
      evenAndOddHeaders: options.evenAndOddHeaderAndFooters ? true : false,
      trackRevisions: (_options$features = options.features) === null || _options$features === void 0 ? void 0 : _options$features.trackRevisions,
      updateFields: (_options$features2 = options.features) === null || _options$features2 === void 0 ? void 0 : _options$features2.updateFields,
      embedFonts: ((_options$fonts = options.fonts) === null || _options$fonts === void 0 ? void 0 : _options$fonts.length) ? true : void 0,
      defaultTabStop: options.defaultTabStop,
      protection: options.protection,
      hyphenation: {
        autoHyphenation: (_options$hyphenation = options.hyphenation) === null || _options$hyphenation === void 0 ? void 0 : _options$hyphenation.autoHyphenation,
        hyphenationZone: (_options$hyphenation2 = options.hyphenation) === null || _options$hyphenation2 === void 0 ? void 0 : _options$hyphenation2.hyphenationZone,
        consecutiveHyphenLimit: (_options$hyphenation3 = options.hyphenation) === null || _options$hyphenation3 === void 0 ? void 0 : _options$hyphenation3.consecutiveHyphenLimit,
        doNotHyphenateCaps: (_options$hyphenation4 = options.hyphenation) === null || _options$hyphenation4 === void 0 ? void 0 : _options$hyphenation4.doNotHyphenateCaps
      }
    });
    this.media = new Media();
    if (options.externalStyles !== void 0) {
      var _options$styles$defau, _options$styles, _options$styles2, _options$styles3;
      const given = (_options$styles$defau = (_options$styles = options.styles) === null || _options$styles === void 0 ? void 0 : _options$styles.default) !== null && _options$styles$defau !== void 0 ? _options$styles$defau : {};
      const defaultStyles = Object.entries(createDefaultStyles(given));
      const isGiven = ([key]) => given[key] !== void 0;
      const externalStyles = new ExternalStylesFactory().newInstance(options.externalStyles);
      this.styles = new Styles(_objectSpread2(_objectSpread2({}, externalStyles), {}, {
        paragraphStyles: (_options$styles2 = options.styles) === null || _options$styles2 === void 0 ? void 0 : _options$styles2.paragraphStyles,
        characterStyles: (_options$styles3 = options.styles) === null || _options$styles3 === void 0 ? void 0 : _options$styles3.characterStyles,
        importedStyles: [
          ...defaultStyles.filter((entry) => !isGiven(entry)).map(([, style]) => style),
          ...externalStyles.importedStyles,
          ...defaultStyles.filter(isGiven).map(([, style]) => style)
        ]
      }));
    } else if (options.styles) {
      const defaultStyles = new DefaultStylesFactory().newInstance(options.styles.default);
      this.styles = new Styles(_objectSpread2(_objectSpread2({}, defaultStyles), options.styles));
    } else {
      const stylesFactory = new DefaultStylesFactory();
      this.styles = new Styles(stylesFactory.newInstance());
    }
    this.addDefaultRelationships();
    for (const section of options.sections) this.addSection(section);
    if (options.footnotes) for (const key in options.footnotes) this.footnotesWrapper.View.createFootNote(parseFloat(key), options.footnotes[key].children);
    if (options.endnotes) for (const key in options.endnotes) this.endnotesWrapper.View.createEndnote(parseFloat(key), options.endnotes[key].children);
    this.fontWrapper = new FontWrapper((_options$fonts2 = options.fonts) !== null && _options$fonts2 !== void 0 ? _options$fonts2 : []);
    this.theme = new Theme(options.theme);
    this.documentWrapper.Relationships.addRelationship(this.currentRelationshipId++, "http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme", "theme/theme1.xml");
    if (this.macros !== void 0) this.documentWrapper.Relationships.addRelationship(this.currentRelationshipId++, "http://schemas.microsoft.com/office/2006/relationships/vbaProject", "vbaProject.bin");
    if (this.bibliography !== void 0) this.documentWrapper.Relationships.addRelationship(this.currentRelationshipId++, "http://schemas.openxmlformats.org/officeDocument/2006/relationships/customXml", "../customXml/item1.xml");
  }
  addSection({ headers = {}, footers = {}, children, properties }) {
    this.documentWrapper.View.Body.addSection(_objectSpread2(_objectSpread2({}, properties), {}, {
      headerWrapperGroup: {
        default: headers.default ? this.createHeader(headers.default) : void 0,
        first: headers.first ? this.createHeader(headers.first) : void 0,
        even: headers.even ? this.createHeader(headers.even) : void 0
      },
      footerWrapperGroup: {
        default: footers.default ? this.createFooter(footers.default) : void 0,
        first: footers.first ? this.createFooter(footers.first) : void 0,
        even: footers.even ? this.createFooter(footers.even) : void 0
      }
    }));
    for (const child2 of children) this.documentWrapper.View.add(child2);
  }
  createHeader(header) {
    const wrapper = new HeaderWrapper(this.media, this.currentRelationshipId++);
    for (const child2 of header.options.children) wrapper.add(child2);
    this.addHeaderToDocument(wrapper);
    return wrapper;
  }
  createFooter(footer) {
    const wrapper = new FooterWrapper(this.media, this.currentRelationshipId++);
    for (const child2 of footer.options.children) wrapper.add(child2);
    this.addFooterToDocument(wrapper);
    return wrapper;
  }
  addHeaderToDocument(header, type = HeaderFooterReferenceType.DEFAULT) {
    this.headers.push({
      header,
      type
    });
    this.documentWrapper.Relationships.addRelationship(header.View.ReferenceId, "http://schemas.openxmlformats.org/officeDocument/2006/relationships/header", `header${this.headers.length}.xml`);
    this.contentTypes.addHeader(this.headers.length);
  }
  addFooterToDocument(footer, type = HeaderFooterReferenceType.DEFAULT) {
    this.footers.push({
      footer,
      type
    });
    this.documentWrapper.Relationships.addRelationship(footer.View.ReferenceId, "http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer", `footer${this.footers.length}.xml`);
    this.contentTypes.addFooter(this.footers.length);
  }
  addDefaultRelationships() {
    this.fileRelationships.addRelationship(1, "http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument", "word/document.xml");
    this.fileRelationships.addRelationship(2, "http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties", "docProps/core.xml");
    this.fileRelationships.addRelationship(3, "http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties", "docProps/app.xml");
    this.fileRelationships.addRelationship(4, "http://schemas.openxmlformats.org/officeDocument/2006/relationships/custom-properties", "docProps/custom.xml");
    this.documentWrapper.Relationships.addRelationship(this.currentRelationshipId++, "http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles", "styles.xml");
    this.documentWrapper.Relationships.addRelationship(this.currentRelationshipId++, "http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering", "numbering.xml");
    this.documentWrapper.Relationships.addRelationship(this.currentRelationshipId++, "http://schemas.openxmlformats.org/officeDocument/2006/relationships/footnotes", "footnotes.xml");
    this.documentWrapper.Relationships.addRelationship(this.currentRelationshipId++, "http://schemas.openxmlformats.org/officeDocument/2006/relationships/endnotes", "endnotes.xml");
    this.documentWrapper.Relationships.addRelationship(this.currentRelationshipId++, "http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings", "settings.xml");
    if (!this.comments.IsEmpty) {
      this.documentWrapper.Relationships.addRelationship(this.currentRelationshipId++, "http://schemas.openxmlformats.org/officeDocument/2006/relationships/comments", "comments.xml");
      this.contentTypes.addComments();
    }
    if (this.commentsExtended) {
      this.documentWrapper.Relationships.addRelationship(this.currentRelationshipId++, "http://schemas.microsoft.com/office/2011/relationships/commentsExtended", "commentsExtended.xml");
      this.contentTypes.addCommentsExtended();
    }
    if (this.commentsIds) {
      this.documentWrapper.Relationships.addRelationship(this.currentRelationshipId++, "http://schemas.microsoft.com/office/2016/09/relationships/commentsIds", "commentsIds.xml");
      this.contentTypes.addCommentsIds();
    }
  }
  get Document() {
    return this.documentWrapper;
  }
  get Styles() {
    return this.styles;
  }
  get CoreProperties() {
    return this.coreProperties;
  }
  get Numbering() {
    return this.numbering;
  }
  get Media() {
    return this.media;
  }
  get FileRelationships() {
    return this.fileRelationships;
  }
  get Headers() {
    return this.headers.map((item) => item.header);
  }
  get Footers() {
    return this.footers.map((item) => item.footer);
  }
  get ContentTypes() {
    return this.contentTypes;
  }
  get CustomProperties() {
    return this.customProperties;
  }
  get AppProperties() {
    return this.appProperties;
  }
  get FootNotes() {
    return this.footnotesWrapper;
  }
  get Endnotes() {
    return this.endnotesWrapper;
  }
  get Settings() {
    return this.settings;
  }
  get Comments() {
    return this.comments;
  }
  /** Extended comments part for reply threading. Undefined when no comment threads exist. */
  get CommentsExtended() {
    return this.commentsExtended;
  }
  /** Durable comment id part. Undefined when no comment carries a durableId. */
  get CommentsIds() {
    return this.commentsIds;
  }
  get FontTable() {
    return this.fontWrapper;
  }
  /** The document's theme (word/theme/theme1.xml). */
  get Theme() {
    return this.theme;
  }
  /** The parts that drawings, such as charts, add to the package when it is written. */
  get PackageParts() {
    return this.packageParts;
  }
  /**
  * The document's macros, when it has any: its VBA project (word/vbaProject.bin), the events of the document it
  * handles (word/vbaData.xml), and the project's relationships, to the events.
  */
  get Macros() {
    return this.macros;
  }
  /**
  * The document's sources, when it has a bibliography: the part they're in (customXml/item1.xml), its properties
  * (customXml/itemProps1.xml), and its relationships, to its properties.
  */
  get Bibliography() {
    return this.bibliography;
  }
};
var StructuredDocumentTagProperties = class extends XmlComponent {
  constructor(alias) {
    super("w:sdtPr");
    if (alias) this.root.push(new StringValueElement("w:alias", alias));
  }
};
var createDocumentPartObject = (gallery) => new BuilderElement({
  name: "w:docPartObj",
  children: [new StringValueElement("w:docPartGallery", gallery), new BuilderElement({ name: "w:docPartUnique" })]
});
var _excluded$2 = [
  "contentChildren",
  "cachedEntries",
  "beginDirty",
  "tabLeader"
];
var TableOfContents = class extends FileChild {
  constructor(alias = "Table of Contents", _ref = {}) {
    let { contentChildren = [], cachedEntries = [], beginDirty, tabLeader = LeaderType.DOT } = _ref, properties = _objectWithoutProperties(_ref, _excluded$2);
    super("w:sdt");
    _defineProperty(
      this,
      /** What it is filled in with from the headings, when it isn't given its content */
      "fromHeadings",
      void 0
    );
    const sdtProperties = new StructuredDocumentTagProperties(alias);
    sdtProperties.addChildElement(createDocumentPartObject("Table of Contents"));
    this.root.push(sdtProperties);
    const content = new StructuredDocumentTagContent();
    const beginParagraphMandatoryChildren = [new Run({ children: [
      beginOf(beginDirty),
      new FieldInstruction(properties),
      createSeparate()
    ] })];
    const endParagraphMandatoryChildren = [new Run({ children: [createEnd()] })];
    if (cachedEntries !== void 0 && cachedEntries.length > 0) {
      const { stylesWithLevels } = properties;
      const cachedParagraphs = cachedEntries.map((entry, i2) => {
        var _stylesWithLevels$fin, _stylesWithLevels$fin2;
        const contentChild = this.buildCachedContentParagraphChild(entry, properties);
        const style = (_stylesWithLevels$fin = stylesWithLevels === null || stylesWithLevels === void 0 || (_stylesWithLevels$fin2 = stylesWithLevels.find((s) => s.level === entry.level)) === null || _stylesWithLevels$fin2 === void 0 ? void 0 : _stylesWithLevels$fin2.styleName) !== null && _stylesWithLevels$fin !== void 0 ? _stylesWithLevels$fin : `TOC${entry.level}`;
        const children = i2 === 0 ? [...beginParagraphMandatoryChildren, contentChild] : i2 === cachedEntries.length - 1 ? [contentChild, ...endParagraphMandatoryChildren] : [contentChild];
        return new Paragraph({
          style,
          tabStops: this.getTabStopsForLevel(entry.level, tabLeader),
          children
        });
      });
      let paragraphs = cachedParagraphs;
      if (cachedEntries.length <= 1) paragraphs = [...cachedParagraphs, new Paragraph({ children: endParagraphMandatoryChildren })];
      for (const paragraph of paragraphs) content.addChildElement(paragraph);
    } else {
      const beginParagraph = new Paragraph({ children: beginParagraphMandatoryChildren });
      content.addChildElement(beginParagraph);
      for (const child2 of contentChildren) content.addChildElement(child2);
      const endParagraph = new Paragraph({ children: endParagraphMandatoryChildren });
      content.addChildElement(endParagraph);
      if (contentChildren.length === 0) this.fromHeadings = {
        properties,
        beginDirty,
        tabLeader
      };
    }
    this.root.push(content);
  }
  /**
  * Written empty, and filled in from the headings once the body it is in is written, unless it was given its content.
  * The page numbers are aligned to the right of the text in its section.
  */
  prepForXml(context) {
    const xml = super.prepForXml(context);
    recordTableOfContents(xml, this.fromHeadings && _objectSpread2(_objectSpread2({}, this.fromHeadings), {}, { textWidth: this.textWidthIn(context) }));
    return xml;
  }
  /** The width of the text in the section it is in */
  textWidthIn(context) {
    var _context$file$Documen, _context$file;
    return (_context$file$Documen = (_context$file = context.file) === null || _context$file === void 0 || (_context$file = _context$file.Document) === null || _context$file === void 0 || (_context$file = _context$file.View.Body.getSectionPropertiesFor(this)) === null || _context$file === void 0 ? void 0 : _context$file.AvailableTextWidth) !== null && _context$file$Documen !== void 0 ? _context$file$Documen : DEFAULT_AVAILABLE_WIDTH;
  }
  getTabStopsForLevel(level, leader, pageWidth = 9025) {
    return [{
      type: "clear",
      position: pageWidth + 1 - (level - 1) * 240
    }, {
      type: "right",
      position: pageWidth,
      leader
    }];
  }
  buildCachedContentRun(entry, properties) {
    var _entry$page$toString, _entry$page;
    return new Run({
      style: (properties === null || properties === void 0 ? void 0 : properties.hyperlink) && entry.href !== void 0 ? "IndexLink" : void 0,
      children: [
        new Text({ text: entry.title }),
        new Tab(),
        new Text({ text: (_entry$page$toString = (_entry$page = entry.page) === null || _entry$page === void 0 ? void 0 : _entry$page.toString()) !== null && _entry$page$toString !== void 0 ? _entry$page$toString : "" })
      ]
    });
  }
  buildCachedContentParagraphChild(entry, properties) {
    const run = this.buildCachedContentRun(entry, properties);
    if ((properties === null || properties === void 0 ? void 0 : properties.hyperlink) && entry.href !== void 0) return new InternalHyperlink({
      anchor: entry.href,
      children: [run]
    });
    return run;
  }
};
var StyleLevel = class {
  constructor(styleName, level) {
    _defineProperty(
      this,
      /** The name of the paragraph style. */
      "styleName",
      void 0
    );
    _defineProperty(
      this,
      /** The TOC level (1-9) to assign to this style. */
      "level",
      void 0
    );
    this.styleName = styleName;
    this.level = level;
  }
};
var Header = class {
  constructor(options = { children: [] }) {
    _defineProperty(this, "options", void 0);
    this.options = options;
  }
};
var Footer = class {
  constructor(options = { children: [] }) {
    _defineProperty(this, "options", void 0);
    this.options = options;
  }
};
var FootNoteReferenceRunAttributes = class extends XmlAttributeComponent {
  constructor(..._args) {
    super(..._args);
    _defineProperty(this, "xmlKeys", { id: "w:id" });
  }
};
var FootnoteReference = class extends XmlComponent {
  constructor(id) {
    super("w:footnoteReference");
    this.root.push(new FootNoteReferenceRunAttributes({ id }));
  }
};
var FootnoteReferenceRun = class extends Run {
  /**
  * Creates a new footnote reference run.
  *
  * @param footnote - The id of one of the document's `footnotes`, or the footnote's content, for a footnote of the
  * run's own. Word has footnotes only in a document's body, so a run with its footnote's content is left out of
  * headers, footers, comments and notes
  */
  constructor(footnote) {
    super({ style: "FootnoteReference" });
    _defineProperty(this, "footnote", void 0);
    if (typeof footnote === "number") this.root.push(new FootnoteReference(footnote));
    else this.footnote = footnote;
  }
  /**
  * Formats the run, with its own footnote added to the document's footnotes, and referred to by the id it has there.
  */
  prepForXml(context) {
    var _context$file;
    if (this.footnote === void 0) return super.prepForXml(context);
    const id = (_context$file = context.file) === null || _context$file === void 0 ? void 0 : _context$file.FootNotes.View.idOf(this, this.footnote, context);
    if (id === void 0) return;
    this.root.push(new FootnoteReference(id));
    try {
      return super.prepForXml(context);
    } finally {
      this.root.pop();
    }
  }
};
var EndnoteReferenceRunAttributes = class extends XmlAttributeComponent {
  constructor(..._args) {
    super(..._args);
    _defineProperty(this, "xmlKeys", { id: "w:id" });
  }
};
var EndnoteIdReference = class extends XmlComponent {
  constructor(id) {
    super("w:endnoteReference");
    this.root.push(new EndnoteReferenceRunAttributes({ id }));
  }
};
var EndnoteReferenceRun = class extends Run {
  /**
  * @param endnote - The id of one of the document's `endnotes`, or the endnote's content, for an endnote of the run's
  * own. Word has endnotes only in a document's body, so a run with its endnote's content is left out of headers,
  * footers, comments and notes
  */
  constructor(endnote) {
    super({ style: "EndnoteReference" });
    _defineProperty(this, "endnote", void 0);
    if (typeof endnote === "number") this.root.push(new EndnoteIdReference(endnote));
    else this.endnote = endnote;
  }
  /**
  * Formats the run, with its own endnote added to the document's endnotes, and referred to by the id it has there.
  */
  prepForXml(context) {
    var _context$file;
    if (this.endnote === void 0) return super.prepForXml(context);
    const id = (_context$file = context.file) === null || _context$file === void 0 ? void 0 : _context$file.Endnotes.View.idOf(this, this.endnote, context);
    if (id === void 0) return;
    this.root.push(new EndnoteIdReference(id));
    try {
      return super.prepForXml(context);
    } finally {
      this.root.pop();
    }
  }
};
var CheckboxSymbolAttributes = class extends XmlAttributeComponent {
  constructor(..._args) {
    super(..._args);
    _defineProperty(this, "xmlKeys", {
      val: "w14:val",
      symbolfont: "w14:font"
    });
  }
};
var CheckBoxSymbolElement = class extends XmlComponent {
  constructor(name, val, font) {
    super(name);
    if (font) this.root.push(new CheckboxSymbolAttributes({
      val: shortHexNumber(val),
      symbolfont: font
    }));
    else this.root.push(new CheckboxSymbolAttributes({ val }));
  }
};
var CheckBoxUtil = class extends XmlComponent {
  constructor(options) {
    var _options$checkedState, _options$checkedState2, _options$checkedState3, _options$checkedState4, _options$uncheckedSta, _options$uncheckedSta2, _options$uncheckedSta3, _options$uncheckedSta4;
    super("w14:checkbox");
    _defineProperty(this, "DEFAULT_UNCHECKED_SYMBOL", "2610");
    _defineProperty(this, "DEFAULT_CHECKED_SYMBOL", "2612");
    _defineProperty(this, "DEFAULT_FONT", "MS Gothic");
    const value = (options === null || options === void 0 ? void 0 : options.checked) ? "1" : "0";
    let symbol;
    let font;
    this.root.push(new CheckBoxSymbolElement("w14:checked", value));
    symbol = (options === null || options === void 0 || (_options$checkedState = options.checkedState) === null || _options$checkedState === void 0 ? void 0 : _options$checkedState.value) ? options === null || options === void 0 || (_options$checkedState2 = options.checkedState) === null || _options$checkedState2 === void 0 ? void 0 : _options$checkedState2.value : this.DEFAULT_CHECKED_SYMBOL;
    font = (options === null || options === void 0 || (_options$checkedState3 = options.checkedState) === null || _options$checkedState3 === void 0 ? void 0 : _options$checkedState3.font) ? options === null || options === void 0 || (_options$checkedState4 = options.checkedState) === null || _options$checkedState4 === void 0 ? void 0 : _options$checkedState4.font : this.DEFAULT_FONT;
    this.root.push(new CheckBoxSymbolElement("w14:checkedState", symbol, font));
    symbol = (options === null || options === void 0 || (_options$uncheckedSta = options.uncheckedState) === null || _options$uncheckedSta === void 0 ? void 0 : _options$uncheckedSta.value) ? options === null || options === void 0 || (_options$uncheckedSta2 = options.uncheckedState) === null || _options$uncheckedSta2 === void 0 ? void 0 : _options$uncheckedSta2.value : this.DEFAULT_UNCHECKED_SYMBOL;
    font = (options === null || options === void 0 || (_options$uncheckedSta3 = options.uncheckedState) === null || _options$uncheckedSta3 === void 0 ? void 0 : _options$uncheckedSta3.font) ? options === null || options === void 0 || (_options$uncheckedSta4 = options.uncheckedState) === null || _options$uncheckedSta4 === void 0 ? void 0 : _options$uncheckedSta4.font : this.DEFAULT_FONT;
    this.root.push(new CheckBoxSymbolElement("w14:uncheckedState", symbol, font));
  }
};
var CheckBox = class extends XmlComponent {
  constructor(options) {
    var _options$checkedState, _options$checkedState2, _options$uncheckedSta, _options$uncheckedSta2;
    super("w:sdt");
    _defineProperty(this, "DEFAULT_UNCHECKED_SYMBOL", "2610");
    _defineProperty(this, "DEFAULT_CHECKED_SYMBOL", "2612");
    _defineProperty(this, "DEFAULT_FONT", "MS Gothic");
    const properties = new StructuredDocumentTagProperties(options === null || options === void 0 ? void 0 : options.alias);
    properties.addChildElement(new CheckBoxUtil(options));
    this.root.push(properties);
    const content = new StructuredDocumentTagContent();
    const checkedFont = options === null || options === void 0 || (_options$checkedState = options.checkedState) === null || _options$checkedState === void 0 ? void 0 : _options$checkedState.font;
    const checkedText = options === null || options === void 0 || (_options$checkedState2 = options.checkedState) === null || _options$checkedState2 === void 0 ? void 0 : _options$checkedState2.value;
    const uncheckedFont = options === null || options === void 0 || (_options$uncheckedSta = options.uncheckedState) === null || _options$uncheckedSta === void 0 ? void 0 : _options$uncheckedSta.font;
    const uncheckedText = options === null || options === void 0 || (_options$uncheckedSta2 = options.uncheckedState) === null || _options$uncheckedSta2 === void 0 ? void 0 : _options$uncheckedSta2.value;
    let symbolFont;
    let char;
    if (options === null || options === void 0 ? void 0 : options.checked) {
      symbolFont = checkedFont ? checkedFont : this.DEFAULT_FONT;
      char = checkedText ? checkedText : this.DEFAULT_CHECKED_SYMBOL;
    } else {
      symbolFont = uncheckedFont ? uncheckedFont : this.DEFAULT_FONT;
      char = uncheckedText ? uncheckedText : this.DEFAULT_UNCHECKED_SYMBOL;
    }
    const initialRenderedChar = new SymbolRun({
      char,
      symbolfont: symbolFont
    });
    content.addChildElement(initialRenderedChar);
    this.root.push(content);
  }
};
var vmlTrueFalse = (value) => value === void 0 ? void 0 : value ? "t" : "f";
var createPict = ({ children }) => new BuilderElement({
  name: "w:pict",
  children
});
var STYLE_KEY_MAP = {
  flip: "flip",
  height: "height",
  left: "left",
  marginBottom: "margin-bottom",
  marginLeft: "margin-left",
  marginRight: "margin-right",
  marginTop: "margin-top",
  positionHorizontal: "mso-position-horizontal",
  positionHorizontalRelative: "mso-position-horizontal-relative",
  positionVertical: "mso-position-vertical",
  positionVerticalRelative: "mso-position-vertical-relative",
  wrapDistanceBottom: "mso-wrap-distance-bottom",
  wrapDistanceLeft: "mso-wrap-distance-left",
  wrapDistanceRight: "mso-wrap-distance-right",
  wrapDistanceTop: "mso-wrap-distance-top",
  wrapEdited: "mso-wrap-edited",
  wrapStyle: "mso-wrap-style",
  position: "position",
  rotation: "rotation",
  top: "top",
  visibility: "visibility",
  width: "width",
  zIndex: "z-index"
};
var formatVmlShapeStyle = (style) => style ? Object.entries(style).filter(([, value]) => value !== void 0).map(([key, value]) => `${STYLE_KEY_MAP[key]}:${value}`).join(";") : void 0;
var createVmlShape = ({ id, type, style, coordinateSize, adjustment, path, presetShapeType, allowInCell, alt, title, fillColor, filled, stroked, strokeColor, strokeWeight, children = [] }) => new BuilderElement({
  name: "v:shape",
  attributes: {
    id: {
      key: "id",
      value: id
    },
    type: {
      key: "type",
      value: type
    },
    style: {
      key: "style",
      value: formatVmlShapeStyle(style)
    },
    coordinateSize: {
      key: "coordsize",
      value: coordinateSize
    },
    adjustment: {
      key: "adj",
      value: adjustment
    },
    path: {
      key: "path",
      value: path
    },
    presetShapeType: {
      key: "o:spt",
      value: presetShapeType
    },
    allowInCell: {
      key: "o:allowincell",
      value: vmlTrueFalse(allowInCell)
    },
    alt: {
      key: "alt",
      value: alt
    },
    title: {
      key: "title",
      value: title
    },
    fillColor: {
      key: "fillcolor",
      value: fillColor
    },
    filled: {
      key: "filled",
      value: vmlTrueFalse(filled)
    },
    stroked: {
      key: "stroked",
      value: vmlTrueFalse(stroked)
    },
    strokeColor: {
      key: "strokecolor",
      value: strokeColor
    },
    strokeWeight: {
      key: "strokeweight",
      value: strokeWeight
    }
  },
  children
});
var createPictElement = ({ shape }) => createPict({ children: [shape] });
var createTextboxContent = ({ children = [] }) => new BuilderElement({
  name: "w:txbxContent",
  children
});
var createVmlTextbox = ({ style, children, inset }) => new BuilderElement({
  name: "v:textbox",
  attributes: {
    style: {
      key: "style",
      value: style
    },
    inset: {
      key: "inset",
      value: inset ? `${inset.left}, ${inset.top}, ${inset.right}, ${inset.bottom}` : void 0
    }
  },
  children: [createTextboxContent({ children })]
});
var SHAPE_TYPE = "#_x0000_t202";
var createShape = ({ id, children, type = SHAPE_TYPE, style }) => createVmlShape({
  id,
  type,
  style,
  children: [createVmlTextbox({
    style: "mso-fit-shape-to-text:t;",
    children
  })]
});
var _excluded$1 = ["style", "children"];
var Textbox = class extends FileChild {
  constructor(_ref) {
    let { style, children } = _ref, rest = _objectWithoutProperties(_ref, _excluded$1);
    super("w:p");
    _defineProperty(this, "run", void 0);
    this.root.push(new ParagraphProperties(rest));
    this.run = new BuilderElement({
      name: "w:r",
      children: [createPictElement({ shape: createShape({
        children,
        id: uniqueId(),
        style
      }) })]
    });
    this.root.push(this.run);
  }
  prepForXml(context) {
    return elementOf(context.stack[context.stack.length - 1]) === "w:p" ? this.run.prepForXml(context) : super.prepForXml(context);
  }
};
var obfuscatedStartOffset = 0;
var obfuscatedEndOffset = 32;
var guidSize = 32;
var obfuscate = (buf, fontKey) => {
  const guid = fontKey.replace(/-/g, "");
  if (guid.length !== guidSize) throw new Error(`Error: Cannot extract GUID from font filename: ${fontKey}`);
  const hexNumbers = guid.replace(/(..)/g, "$1 ").trim().split(" ").map((hexString) => parseInt(hexString, 16));
  hexNumbers.reverse();
  const obfuscatedBytes = buf.slice(obfuscatedStartOffset, obfuscatedEndOffset).map((byte, i2) => byte ^ hexNumbers[i2 % hexNumbers.length]);
  const out = new Uint8Array(obfuscatedStartOffset + obfuscatedBytes.length + Math.max(0, buf.length - obfuscatedEndOffset));
  out.set(buf.slice(0, obfuscatedStartOffset));
  out.set(obfuscatedBytes, obfuscatedStartOffset);
  out.set(buf.slice(obfuscatedEndOffset), obfuscatedStartOffset + obfuscatedBytes.length);
  return out;
};
var Formatter = class {
  /**
  * Formats an XML component into a serializable object.
  *
  * @param input - The XML component to format
  * @param context - The context containing file state and relationships
  * @returns A serializable XML object structure
  * @throws Error if the component cannot be formatted correctly
  */
  format(input, context = { stack: [] }) {
    const output = input.prepForXml(context);
    if (output) return output;
    else throw Error("XMLComponent did not format correctly");
  }
};
var PLACEHOLDER = /\{([^{}]+)\}/g;
var replacePlaceholders = (xmlData, values) => values.size === 0 ? xmlData : xmlData.replace(PLACEHOLDER, (placeholder, key) => {
  var _values$get;
  return (_values$get = values.get(key)) !== null && _values$get !== void 0 ? _values$get : placeholder;
});
var findPlaceholders = (xmlData) => new Set(Array.from(xmlData.matchAll(PLACEHOLDER), ([, key]) => key));
var ImageReplacer = class {
  /**
  * Replaces image placeholder tokens with relationship IDs.
  *
  * @param xmlData - The XML string containing image placeholders
  * @param mediaData - Array of media data to replace
  * @param offset - Starting offset for relationship IDs
  * @returns XML string with placeholders replaced by relationship IDs
  */
  replace(xmlData, mediaData, offset) {
    return replacePlaceholders(xmlData, new Map(mediaData.map((image, i2) => [image.fileName, (offset + i2).toString()])));
  }
  /**
  * Extracts media data referenced in the XML content.
  *
  * @param xmlData - The XML string to search for media references
  * @param media - The media collection to search within
  * @returns Array of media data found in the XML
  */
  getMediaData(xmlData, media) {
    const placeholders = findPlaceholders(xmlData);
    return media.Array.filter((image) => placeholders.has(image.fileName));
  }
};
var NumberingReplacer = class {
  /**
  * Replaces numbering placeholder tokens with actual numbering IDs.
  *
  * Placeholder format: {reference-instance} where reference identifies the
  * numbering definition and instance is the specific usage.
  *
  * @param xmlData - The XML string containing numbering placeholders
  * @param concreteNumberings - Array of concrete numbering instances to replace
  * @returns XML string with placeholders replaced by numbering IDs
  */
  replace(xmlData, concreteNumberings) {
    return replacePlaceholders(xmlData, new Map(concreteNumberings.map(({ reference, instance, restartedListId, numId }) => [listKey(reference, instance, restartedListId), numId.toString()])));
  }
};
var formatter$4 = new Formatter();
var xmlifyPart = (file, content, prettify, relationships, standalone = true) => stringifyXmlable(formatter$4.format(content, {
  viewWrapper: {
    View: content,
    Relationships: relationships
  },
  file,
  stack: []
}), {
  indent: prettify,
  declaration: standalone ? {
    standalone: "yes",
    encoding: "UTF-8"
  } : { encoding: "UTF-8" }
});
var xmlifyPackagePart = (file, part, path, prettify) => {
  const { content } = part.options;
  if (content instanceof Uint8Array) return [{
    data: content,
    path: `word/${path}`
  }];
  if ("files" in content) return [{
    data: zipFiles(content.files.map(({ path: filePath, content: fileContent }) => [filePath, fileContent instanceof Uint8Array ? fileContent : xmlifyPart(file, fileContent, prettify, new Relationships())])),
    path: `word/${path}`
  }];
  const relationships = file.PackageParts.createRelationships(path);
  const data = xmlifyPart(file, content, prettify, relationships);
  const folder = path.slice(0, path.lastIndexOf("/"));
  const name = path.slice(path.lastIndexOf("/") + 1);
  return [{
    data,
    path: `word/${path}`
  }, ...relationships.RelationshipCount > 0 ? [{
    data: xmlifyPart(file, relationships, prettify, relationships, false),
    path: `word/${folder}/_rels/${name}.rels`
  }] : []];
};
var xmlifyPackageParts = (file, prettify, from = 0) => {
  const parts = file.PackageParts.Array.slice(from);
  if (parts.length === 0) return [];
  return [...parts.flatMap(({ part, path }) => xmlifyPackagePart(file, part, path, prettify)), ...xmlifyPackageParts(file, prettify, from + parts.length)];
};
var _excluded = ["PackageParts"];
var Compiler = class {
  /**
  * Creates a new Compiler instance.
  *
  * Initializes the formatter and replacer utilities used during compilation.
  */
  constructor() {
    _defineProperty(this, "formatter", void 0);
    _defineProperty(this, "imageReplacer", void 0);
    _defineProperty(this, "numberingReplacer", void 0);
    this.formatter = new Formatter();
    this.imageReplacer = new ImageReplacer();
    this.numberingReplacer = new NumberingReplacer();
  }
  /**
  * Compiles a File object into the files of the complete OOXML package, which the Packer zips.
  *
  * This method orchestrates the entire compilation process:
  * - Converts all document components to XML
  * - Manages image and numbering placeholder replacements
  * - Creates relationship files
  * - Packages fonts and media files
  *
  * @param file - The document to compile
  * @param prettifyXml - Optional XML formatting style
  * @param overrides - Optional custom XML file overrides
  * @returns The package's files by their paths, in the order they are zipped
  */
  compile(file, prettifyXml, overrides = []) {
    const _this$xmlifyFile = this.xmlifyFile(file, prettifyXml), { PackageParts: packageParts } = _this$xmlifyFile, xmlifiedFileMapping = _objectWithoutProperties(_this$xmlifyFile, _excluded);
    const xmlifiedFiles = Object.values(xmlifiedFileMapping).flatMap((obj) => Array.isArray(obj) ? obj : [obj]);
    return new Map([
      ...xmlifiedFiles.map(({ path, data }) => [path, data]),
      ...packageParts.map(({ path, data }) => [path, data]),
      ...overrides.map(({ path, data }) => [path, data]),
      ...file.Macros === void 0 ? [] : [["word/vbaProject.bin", file.Macros.project]],
      ...file.Media.Array.flatMap((data) => data.type !== "svg" ? [[`word/media/${data.fileName}`, data.data]] : [[`word/media/${data.fileName}`, data.data], [`word/media/${data.fallback.fileName}`, data.fallback.data]]),
      ...file.FontTable.files.map(({ data: buffer, fontKey }, i2) => [`word/fonts/font${i2 + 1}.odttf`, obfuscate(buffer, fontKey)])
    ]);
  }
  xmlifyFile(file, prettify) {
    var _file$Macros;
    const documentXmlData = stringifyXmlable(this.formatter.format(file.Document.View, {
      viewWrapper: file.Document,
      file,
      stack: []
    }), {
      indent: prettify,
      declaration: {
        standalone: "yes",
        encoding: "UTF-8"
      }
    });
    const commentXmlData = stringifyXmlable(this.formatter.format(file.Comments, {
      viewWrapper: {
        View: file.Comments,
        Relationships: file.Comments.Relationships
      },
      file,
      stack: []
    }), {
      indent: prettify,
      declaration: {
        standalone: "yes",
        encoding: "UTF-8"
      }
    });
    const footnoteXmlData = stringifyXmlable(this.formatter.format(file.FootNotes.View, {
      viewWrapper: file.FootNotes,
      file,
      stack: []
    }), {
      indent: prettify,
      declaration: {
        standalone: "yes",
        encoding: "UTF-8"
      }
    });
    const endnoteXmlData = stringifyXmlable(this.formatter.format(file.Endnotes.View, {
      viewWrapper: file.Endnotes,
      file,
      stack: []
    }), {
      indent: prettify,
      declaration: { encoding: "UTF-8" }
    });
    const documentRelationshipCount = file.Document.Relationships.RelationshipCount + 1;
    const commentRelationshipCount = file.Comments.Relationships.RelationshipCount + 1;
    const footnoteRelationshipCount = file.FootNotes.Relationships.RelationshipCount + 1;
    const endnoteRelationshipCount = file.Endnotes.Relationships.RelationshipCount + 1;
    const documentMediaDatas = this.imageReplacer.getMediaData(documentXmlData, file.Media);
    const commentMediaDatas = this.imageReplacer.getMediaData(commentXmlData, file.Media);
    const footnoteMediaDatas = this.imageReplacer.getMediaData(footnoteXmlData, file.Media);
    const endnoteMediaDatas = this.imageReplacer.getMediaData(endnoteXmlData, file.Media);
    return _objectSpread2(_objectSpread2(_objectSpread2(_objectSpread2(_objectSpread2(_objectSpread2({
      Relationships: {
        data: (() => {
          const relationships = Relationships.copy(file.Document.Relationships);
          documentMediaDatas.forEach((mediaData, i2) => {
            relationships.addRelationship(documentRelationshipCount + i2, "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image", `media/${mediaData.fileName}`);
          });
          relationships.addRelationship(relationships.RelationshipCount + 1, "http://schemas.openxmlformats.org/officeDocument/2006/relationships/fontTable", "fontTable.xml");
          return stringifyXmlable(this.formatter.format(relationships, {
            viewWrapper: file.Document,
            file,
            stack: []
          }), {
            indent: prettify,
            declaration: { encoding: "UTF-8" }
          });
        })(),
        path: "word/_rels/document.xml.rels"
      },
      Document: {
        data: (() => {
          const xmlData = this.imageReplacer.replace(documentXmlData, documentMediaDatas, documentRelationshipCount);
          return this.numberingReplacer.replace(xmlData, file.Numbering.ConcreteNumbering);
        })(),
        path: "word/document.xml"
      },
      Styles: {
        data: (() => {
          const xmlStyles = stringifyXmlable(this.formatter.format(file.Styles, {
            viewWrapper: file.Document,
            file,
            stack: []
          }), {
            indent: prettify,
            declaration: {
              standalone: "yes",
              encoding: "UTF-8"
            }
          });
          return this.numberingReplacer.replace(xmlStyles, file.Numbering.ConcreteNumbering);
        })(),
        path: "word/styles.xml"
      },
      Properties: {
        data: stringifyXmlable(this.formatter.format(file.CoreProperties, {
          viewWrapper: file.Document,
          file,
          stack: []
        }), {
          indent: prettify,
          declaration: {
            standalone: "yes",
            encoding: "UTF-8"
          }
        }),
        path: "docProps/core.xml"
      },
      FileRelationships: {
        data: stringifyXmlable(this.formatter.format(file.FileRelationships, {
          viewWrapper: file.Document,
          file,
          stack: []
        }), {
          indent: prettify,
          declaration: { encoding: "UTF-8" }
        }),
        path: "_rels/.rels"
      },
      HeaderRelationships: file.Headers.map((headerWrapper, index) => {
        const xmlData = stringifyXmlable(this.formatter.format(headerWrapper.View, {
          viewWrapper: headerWrapper,
          file,
          stack: []
        }), {
          indent: prettify,
          declaration: { encoding: "UTF-8" }
        });
        const mediaDatas = this.imageReplacer.getMediaData(xmlData, file.Media);
        const relationships = Relationships.copy(headerWrapper.Relationships);
        mediaDatas.forEach((mediaData, i2) => {
          relationships.addRelationship(i2, "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image", `media/${mediaData.fileName}`);
        });
        return {
          data: stringifyXmlable(this.formatter.format(relationships, {
            viewWrapper: headerWrapper,
            file,
            stack: []
          }), {
            indent: prettify,
            declaration: { encoding: "UTF-8" }
          }),
          path: `word/_rels/header${index + 1}.xml.rels`
        };
      }),
      FooterRelationships: file.Footers.map((footerWrapper, index) => {
        const xmlData = stringifyXmlable(this.formatter.format(footerWrapper.View, {
          viewWrapper: footerWrapper,
          file,
          stack: []
        }), {
          indent: prettify,
          declaration: { encoding: "UTF-8" }
        });
        const mediaDatas = this.imageReplacer.getMediaData(xmlData, file.Media);
        const relationships = Relationships.copy(footerWrapper.Relationships);
        mediaDatas.forEach((mediaData, i2) => {
          relationships.addRelationship(i2, "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image", `media/${mediaData.fileName}`);
        });
        return {
          data: stringifyXmlable(this.formatter.format(relationships, {
            viewWrapper: footerWrapper,
            file,
            stack: []
          }), {
            indent: prettify,
            declaration: { encoding: "UTF-8" }
          }),
          path: `word/_rels/footer${index + 1}.xml.rels`
        };
      }),
      Headers: file.Headers.map((headerWrapper, index) => {
        const tempXmlData = stringifyXmlable(this.formatter.format(headerWrapper.View, {
          viewWrapper: headerWrapper,
          file,
          stack: []
        }), {
          indent: prettify,
          declaration: { encoding: "UTF-8" }
        });
        const mediaDatas = this.imageReplacer.getMediaData(tempXmlData, file.Media);
        const xmlData = this.imageReplacer.replace(tempXmlData, mediaDatas, 0);
        return {
          data: this.numberingReplacer.replace(xmlData, file.Numbering.ConcreteNumbering),
          path: `word/header${index + 1}.xml`
        };
      }),
      Footers: file.Footers.map((footerWrapper, index) => {
        const tempXmlData = stringifyXmlable(this.formatter.format(footerWrapper.View, {
          viewWrapper: footerWrapper,
          file,
          stack: []
        }), {
          indent: prettify,
          declaration: { encoding: "UTF-8" }
        });
        const mediaDatas = this.imageReplacer.getMediaData(tempXmlData, file.Media);
        const xmlData = this.imageReplacer.replace(tempXmlData, mediaDatas, 0);
        return {
          data: this.numberingReplacer.replace(xmlData, file.Numbering.ConcreteNumbering),
          path: `word/footer${index + 1}.xml`
        };
      }),
      CustomProperties: {
        data: stringifyXmlable(this.formatter.format(file.CustomProperties, {
          viewWrapper: file.Document,
          file,
          stack: []
        }), {
          indent: prettify,
          declaration: {
            standalone: "yes",
            encoding: "UTF-8"
          }
        }),
        path: "docProps/custom.xml"
      },
      AppProperties: {
        data: stringifyXmlable(this.formatter.format(file.AppProperties, {
          viewWrapper: file.Document,
          file,
          stack: []
        }), {
          indent: prettify,
          declaration: {
            standalone: "yes",
            encoding: "UTF-8"
          }
        }),
        path: "docProps/app.xml"
      },
      FootNotes: {
        data: (() => {
          const xmlData = this.imageReplacer.replace(footnoteXmlData, footnoteMediaDatas, footnoteRelationshipCount);
          return this.numberingReplacer.replace(xmlData, file.Numbering.ConcreteNumbering);
        })(),
        path: "word/footnotes.xml"
      },
      FootNotesRelationships: {
        data: (() => {
          const relationships = Relationships.copy(file.FootNotes.Relationships);
          footnoteMediaDatas.forEach((mediaData, i2) => {
            relationships.addRelationship(footnoteRelationshipCount + i2, "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image", `media/${mediaData.fileName}`);
          });
          return stringifyXmlable(this.formatter.format(relationships, {
            viewWrapper: file.FootNotes,
            file,
            stack: []
          }), {
            indent: prettify,
            declaration: { encoding: "UTF-8" }
          });
        })(),
        path: "word/_rels/footnotes.xml.rels"
      },
      Endnotes: {
        data: (() => {
          const xmlData = this.imageReplacer.replace(endnoteXmlData, endnoteMediaDatas, endnoteRelationshipCount);
          return this.numberingReplacer.replace(xmlData, file.Numbering.ConcreteNumbering);
        })(),
        path: "word/endnotes.xml"
      },
      EndnotesRelationships: {
        data: (() => {
          const relationships = Relationships.copy(file.Endnotes.Relationships);
          endnoteMediaDatas.forEach((mediaData, i2) => {
            relationships.addRelationship(endnoteRelationshipCount + i2, "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image", `media/${mediaData.fileName}`);
          });
          return stringifyXmlable(this.formatter.format(relationships, {
            viewWrapper: file.Endnotes,
            file,
            stack: []
          }), {
            indent: prettify,
            declaration: { encoding: "UTF-8" }
          });
        })(),
        path: "word/_rels/endnotes.xml.rels"
      },
      Settings: {
        data: stringifyXmlable(this.formatter.format(file.Settings, {
          viewWrapper: file.Document,
          file,
          stack: []
        }), {
          indent: prettify,
          declaration: {
            standalone: "yes",
            encoding: "UTF-8"
          }
        }),
        path: "word/settings.xml"
      }
    }, file.Comments.IsEmpty ? {} : {
      Comments: {
        data: (() => {
          const xmlData = this.imageReplacer.replace(commentXmlData, commentMediaDatas, commentRelationshipCount);
          return this.numberingReplacer.replace(xmlData, file.Numbering.ConcreteNumbering);
        })(),
        path: "word/comments.xml"
      },
      CommentsRelationships: {
        data: (() => {
          const relationships = Relationships.copy(file.Comments.Relationships);
          commentMediaDatas.forEach((mediaData, i2) => {
            relationships.addRelationship(commentRelationshipCount + i2, "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image", `media/${mediaData.fileName}`);
          });
          return stringifyXmlable(this.formatter.format(relationships, {
            viewWrapper: {
              View: file.Comments,
              Relationships: file.Comments.Relationships
            },
            file,
            stack: []
          }), {
            indent: prettify,
            declaration: { encoding: "UTF-8" }
          });
        })(),
        path: "word/_rels/comments.xml.rels"
      }
    }), file.CommentsExtended ? { CommentsExtended: {
      data: stringifyXmlable(this.formatter.format(file.CommentsExtended, {
        viewWrapper: {
          View: file.CommentsExtended,
          Relationships: file.Comments.Relationships
        },
        file,
        stack: []
      }), {
        indent: prettify,
        declaration: {
          standalone: "yes",
          encoding: "UTF-8"
        }
      }),
      path: "word/commentsExtended.xml"
    } } : {}), file.CommentsIds ? { CommentsIds: {
      data: stringifyXmlable(this.formatter.format(file.CommentsIds, {
        viewWrapper: {
          View: file.CommentsIds,
          Relationships: file.Comments.Relationships
        },
        file,
        stack: []
      }), {
        indent: prettify,
        declaration: {
          standalone: "yes",
          encoding: "UTF-8"
        }
      }),
      path: "word/commentsIds.xml"
    } } : {}), {}, {
      FontTable: {
        data: stringifyXmlable(this.formatter.format(file.FontTable.View, {
          viewWrapper: file.Document,
          file,
          stack: []
        }), {
          indent: prettify,
          declaration: {
            standalone: "yes",
            encoding: "UTF-8"
          }
        }),
        path: "word/fontTable.xml"
      },
      FontTableRelationships: {
        data: (() => stringifyXmlable(this.formatter.format(file.FontTable.Relationships, {
          viewWrapper: file.Document,
          file,
          stack: []
        }), {
          indent: prettify,
          declaration: { encoding: "UTF-8" }
        }))(),
        path: "word/_rels/fontTable.xml.rels"
      },
      Theme: {
        data: stringifyXmlable(this.formatter.format(file.Theme, {
          viewWrapper: file.Document,
          file,
          stack: []
        }), {
          indent: prettify,
          declaration: {
            standalone: "yes",
            encoding: "UTF-8"
          }
        }),
        path: "word/theme/theme1.xml"
      }
    }, ((_file$Macros = file.Macros) === null || _file$Macros === void 0 ? void 0 : _file$Macros.events) ? {
      MacroEvents: {
        data: stringifyXmlable(this.formatter.format(file.Macros.events, {
          viewWrapper: file.Document,
          file,
          stack: []
        }), {
          indent: prettify,
          declaration: {
            standalone: "yes",
            encoding: "UTF-8"
          }
        }),
        path: "word/vbaData.xml"
      },
      MacroRelationships: {
        data: stringifyXmlable(this.formatter.format(file.Macros.relationships, {
          viewWrapper: file.Document,
          file,
          stack: []
        }), {
          indent: prettify,
          declaration: { encoding: "UTF-8" }
        }),
        path: "word/_rels/vbaProject.bin.rels"
      }
    } : {}), file.Bibliography ? {
      BibliographySources: {
        data: stringifyXmlable(this.formatter.format(file.Bibliography.sources, {
          viewWrapper: file.Document,
          file,
          stack: []
        }), {
          indent: prettify,
          declaration: {
            standalone: "yes",
            encoding: "UTF-8"
          }
        }),
        path: "customXml/item1.xml"
      },
      BibliographySourcesProperties: {
        data: stringifyXmlable(this.formatter.format(file.Bibliography.properties, {
          viewWrapper: file.Document,
          file,
          stack: []
        }), {
          indent: prettify,
          declaration: {
            standalone: "no",
            encoding: "UTF-8"
          }
        }),
        path: "customXml/itemProps1.xml"
      },
      BibliographySourcesRelationships: {
        data: stringifyXmlable(this.formatter.format(file.Bibliography.relationships, {
          viewWrapper: file.Document,
          file,
          stack: []
        }), {
          indent: prettify,
          declaration: {
            standalone: "yes",
            encoding: "UTF-8"
          }
        }),
        path: "customXml/_rels/item1.xml.rels"
      }
    } : {}), {}, {
      PackageParts: xmlifyPackageParts(file, prettify),
      Numbering: {
        data: stringifyXmlable(this.formatter.format(file.Numbering, {
          viewWrapper: file.Document,
          file,
          stack: []
        }), {
          indent: prettify,
          declaration: {
            standalone: "yes",
            encoding: "UTF-8"
          }
        }),
        path: "word/numbering.xml"
      },
      ContentTypes: {
        data: stringifyXmlable(this.formatter.format(file.ContentTypes, {
          viewWrapper: file.Document,
          file,
          stack: []
        }), {
          indent: prettify,
          declaration: { encoding: "UTF-8" }
        }),
        path: "[Content_Types].xml"
      }
    });
  }
};
var import_events = __commonJSMin(((exports, module) => {
  var R = typeof Reflect === "object" ? Reflect : null;
  var ReflectApply = R && typeof R.apply === "function" ? R.apply : function ReflectApply2(target, receiver, args) {
    return Function.prototype.apply.call(target, receiver, args);
  };
  var ReflectOwnKeys;
  if (R && typeof R.ownKeys === "function") ReflectOwnKeys = R.ownKeys;
  else if (Object.getOwnPropertySymbols) ReflectOwnKeys = function ReflectOwnKeys2(target) {
    return Object.getOwnPropertyNames(target).concat(Object.getOwnPropertySymbols(target));
  };
  else ReflectOwnKeys = function ReflectOwnKeys2(target) {
    return Object.getOwnPropertyNames(target);
  };
  function ProcessEmitWarning(warning) {
    if (console && console.warn) console.warn(warning);
  }
  var NumberIsNaN = Number.isNaN || function NumberIsNaN2(value) {
    return value !== value;
  };
  function EventEmitter() {
    EventEmitter.init.call(this);
  }
  module.exports = EventEmitter;
  module.exports.once = once;
  EventEmitter.EventEmitter = EventEmitter;
  EventEmitter.prototype._events = void 0;
  EventEmitter.prototype._eventsCount = 0;
  EventEmitter.prototype._maxListeners = void 0;
  var defaultMaxListeners = 10;
  function checkListener(listener) {
    if (typeof listener !== "function") throw new TypeError('The "listener" argument must be of type Function. Received type ' + typeof listener);
  }
  Object.defineProperty(EventEmitter, "defaultMaxListeners", {
    enumerable: true,
    get: function() {
      return defaultMaxListeners;
    },
    set: function(arg) {
      if (typeof arg !== "number" || arg < 0 || NumberIsNaN(arg)) throw new RangeError('The value of "defaultMaxListeners" is out of range. It must be a non-negative number. Received ' + arg + ".");
      defaultMaxListeners = arg;
    }
  });
  EventEmitter.init = function() {
    if (this._events === void 0 || this._events === Object.getPrototypeOf(this)._events) {
      this._events = /* @__PURE__ */ Object.create(null);
      this._eventsCount = 0;
    }
    this._maxListeners = this._maxListeners || void 0;
  };
  EventEmitter.prototype.setMaxListeners = function setMaxListeners(n) {
    if (typeof n !== "number" || n < 0 || NumberIsNaN(n)) throw new RangeError('The value of "n" is out of range. It must be a non-negative number. Received ' + n + ".");
    this._maxListeners = n;
    return this;
  };
  function _getMaxListeners(that) {
    if (that._maxListeners === void 0) return EventEmitter.defaultMaxListeners;
    return that._maxListeners;
  }
  EventEmitter.prototype.getMaxListeners = function getMaxListeners() {
    return _getMaxListeners(this);
  };
  EventEmitter.prototype.emit = function emit(type) {
    var args = [];
    for (var i2 = 1; i2 < arguments.length; i2++) args.push(arguments[i2]);
    var doError = type === "error";
    var events = this._events;
    if (events !== void 0) doError = doError && events.error === void 0;
    else if (!doError) return false;
    if (doError) {
      var er;
      if (args.length > 0) er = args[0];
      if (er instanceof Error) throw er;
      var err2 = new Error("Unhandled error." + (er ? " (" + er.message + ")" : ""));
      err2.context = er;
      throw err2;
    }
    var handler = events[type];
    if (handler === void 0) return false;
    if (typeof handler === "function") ReflectApply(handler, this, args);
    else {
      var len = handler.length;
      var listeners = arrayClone(handler, len);
      for (var i2 = 0; i2 < len; ++i2) ReflectApply(listeners[i2], this, args);
    }
    return true;
  };
  function _addListener(target, type, listener, prepend) {
    var m;
    var events;
    var existing;
    checkListener(listener);
    events = target._events;
    if (events === void 0) {
      events = target._events = /* @__PURE__ */ Object.create(null);
      target._eventsCount = 0;
    } else {
      if (events.newListener !== void 0) {
        target.emit("newListener", type, listener.listener ? listener.listener : listener);
        events = target._events;
      }
      existing = events[type];
    }
    if (existing === void 0) {
      existing = events[type] = listener;
      ++target._eventsCount;
    } else {
      if (typeof existing === "function") existing = events[type] = prepend ? [listener, existing] : [existing, listener];
      else if (prepend) existing.unshift(listener);
      else existing.push(listener);
      m = _getMaxListeners(target);
      if (m > 0 && existing.length > m && !existing.warned) {
        existing.warned = true;
        var w = new Error("Possible EventEmitter memory leak detected. " + existing.length + " " + String(type) + " listeners added. Use emitter.setMaxListeners() to increase limit");
        w.name = "MaxListenersExceededWarning";
        w.emitter = target;
        w.type = type;
        w.count = existing.length;
        ProcessEmitWarning(w);
      }
    }
    return target;
  }
  EventEmitter.prototype.addListener = function addListener(type, listener) {
    return _addListener(this, type, listener, false);
  };
  EventEmitter.prototype.on = EventEmitter.prototype.addListener;
  EventEmitter.prototype.prependListener = function prependListener(type, listener) {
    return _addListener(this, type, listener, true);
  };
  function onceWrapper() {
    if (!this.fired) {
      this.target.removeListener(this.type, this.wrapFn);
      this.fired = true;
      if (arguments.length === 0) return this.listener.call(this.target);
      return this.listener.apply(this.target, arguments);
    }
  }
  function _onceWrap(target, type, listener) {
    var state = {
      fired: false,
      wrapFn: void 0,
      target,
      type,
      listener
    };
    var wrapped = onceWrapper.bind(state);
    wrapped.listener = listener;
    state.wrapFn = wrapped;
    return wrapped;
  }
  EventEmitter.prototype.once = function once2(type, listener) {
    checkListener(listener);
    this.on(type, _onceWrap(this, type, listener));
    return this;
  };
  EventEmitter.prototype.prependOnceListener = function prependOnceListener(type, listener) {
    checkListener(listener);
    this.prependListener(type, _onceWrap(this, type, listener));
    return this;
  };
  EventEmitter.prototype.removeListener = function removeListener(type, listener) {
    var list, events, position, i2, originalListener;
    checkListener(listener);
    events = this._events;
    if (events === void 0) return this;
    list = events[type];
    if (list === void 0) return this;
    if (list === listener || list.listener === listener) {
      if (--this._eventsCount === 0) this._events = /* @__PURE__ */ Object.create(null);
      else {
        delete events[type];
        if (events.removeListener) this.emit("removeListener", type, list.listener || listener);
      }
    } else if (typeof list !== "function") {
      position = -1;
      for (i2 = list.length - 1; i2 >= 0; i2--) if (list[i2] === listener || list[i2].listener === listener) {
        originalListener = list[i2].listener;
        position = i2;
        break;
      }
      if (position < 0) return this;
      if (position === 0) list.shift();
      else spliceOne(list, position);
      if (list.length === 1) events[type] = list[0];
      if (events.removeListener !== void 0) this.emit("removeListener", type, originalListener || listener);
    }
    return this;
  };
  EventEmitter.prototype.off = EventEmitter.prototype.removeListener;
  EventEmitter.prototype.removeAllListeners = function removeAllListeners(type) {
    var listeners, events = this._events, i2;
    if (events === void 0) return this;
    if (events.removeListener === void 0) {
      if (arguments.length === 0) {
        this._events = /* @__PURE__ */ Object.create(null);
        this._eventsCount = 0;
      } else if (events[type] !== void 0) {
        if (--this._eventsCount === 0) this._events = /* @__PURE__ */ Object.create(null);
        else delete events[type];
      }
      return this;
    }
    if (arguments.length === 0) {
      var keys = Object.keys(events);
      var key;
      for (i2 = 0; i2 < keys.length; ++i2) {
        key = keys[i2];
        if (key === "removeListener") continue;
        this.removeAllListeners(key);
      }
      this.removeAllListeners("removeListener");
      this._events = /* @__PURE__ */ Object.create(null);
      this._eventsCount = 0;
      return this;
    }
    listeners = events[type];
    if (typeof listeners === "function") this.removeListener(type, listeners);
    else if (listeners !== void 0) for (i2 = listeners.length - 1; i2 >= 0; i2--) this.removeListener(type, listeners[i2]);
    return this;
  };
  function _listeners(target, type, unwrap) {
    var events = target._events;
    if (events === void 0) return [];
    var evlistener = events[type];
    if (evlistener === void 0) return [];
    if (typeof evlistener === "function") return unwrap ? [evlistener.listener || evlistener] : [evlistener];
    return unwrap ? unwrapListeners(evlistener) : arrayClone(evlistener, evlistener.length);
  }
  EventEmitter.prototype.listeners = function listeners(type) {
    return _listeners(this, type, true);
  };
  EventEmitter.prototype.rawListeners = function rawListeners(type) {
    return _listeners(this, type, false);
  };
  EventEmitter.listenerCount = function(emitter, type) {
    if (typeof emitter.listenerCount === "function") return emitter.listenerCount(type);
    else return listenerCount.call(emitter, type);
  };
  EventEmitter.prototype.listenerCount = listenerCount;
  function listenerCount(type) {
    var events = this._events;
    if (events !== void 0) {
      var evlistener = events[type];
      if (typeof evlistener === "function") return 1;
      else if (evlistener !== void 0) return evlistener.length;
    }
    return 0;
  }
  EventEmitter.prototype.eventNames = function eventNames() {
    return this._eventsCount > 0 ? ReflectOwnKeys(this._events) : [];
  };
  function arrayClone(arr, n) {
    var copy = new Array(n);
    for (var i2 = 0; i2 < n; ++i2) copy[i2] = arr[i2];
    return copy;
  }
  function spliceOne(list, index) {
    for (; index + 1 < list.length; index++) list[index] = list[index + 1];
    list.pop();
  }
  function unwrapListeners(arr) {
    var ret = new Array(arr.length);
    for (var i2 = 0; i2 < ret.length; ++i2) ret[i2] = arr[i2].listener || arr[i2];
    return ret;
  }
  function once(emitter, name) {
    return new Promise(function(resolve2, reject) {
      function errorListener(err2) {
        emitter.removeListener(name, resolver);
        reject(err2);
      }
      function resolver() {
        if (typeof emitter.removeListener === "function") emitter.removeListener("error", errorListener);
        resolve2([].slice.call(arguments));
      }
      eventTargetAgnosticAddListener(emitter, name, resolver, { once: true });
      if (name !== "error") addErrorHandlerIfEventEmitter(emitter, errorListener, { once: true });
    });
  }
  function addErrorHandlerIfEventEmitter(emitter, handler, flags) {
    if (typeof emitter.on === "function") eventTargetAgnosticAddListener(emitter, "error", handler, flags);
  }
  function eventTargetAgnosticAddListener(emitter, name, listener, flags) {
    if (typeof emitter.on === "function") {
      if (flags.once) emitter.once(name, listener);
      else emitter.on(name, listener);
    } else if (typeof emitter.addEventListener === "function") emitter.addEventListener(name, function wrapListener(arg) {
      if (flags.once) emitter.removeEventListener(name, wrapListener);
      listener(arg);
    });
    else throw new TypeError('The "emitter" argument must be of type EventEmitter. Received type ' + typeof emitter);
  }
}))();
var Stream = class extends import_events.EventEmitter {
  pipe(destination, options) {
    const source = this;
    const dest = destination;
    const ondata = (chunk) => {
      if (dest.writable) {
        if (false === dest.write(chunk) && source.pause) source.pause();
      }
    };
    source.on("data", ondata);
    const ondrain = () => {
      if (source.readable && source.resume) source.resume();
    };
    dest.on("drain", ondrain);
    if (!dest._isStdio && (!options || options.end !== false)) {
      source.on("end", onend);
      source.on("close", onclose);
    }
    let didOnEnd = false;
    function onend() {
      if (didOnEnd) return;
      didOnEnd = true;
      dest.end();
    }
    function onclose() {
      if (didOnEnd) return;
      didOnEnd = true;
      if (typeof dest.destroy === "function") dest.destroy();
    }
    function onerror(error) {
      cleanup();
      if (import_events.EventEmitter.listenerCount(this, "error") === 0) throw error;
    }
    source.on("error", onerror);
    dest.on("error", onerror);
    function cleanup() {
      source.removeListener("data", ondata);
      dest.removeListener("drain", ondrain);
      source.removeListener("end", onend);
      source.removeListener("close", onclose);
      source.removeListener("error", onerror);
      dest.removeListener("error", onerror);
      source.removeListener("end", cleanup);
      source.removeListener("close", cleanup);
      dest.removeListener("close", cleanup);
    }
    source.on("end", cleanup);
    source.on("close", cleanup);
    dest.on("close", cleanup);
    dest.emit("pipe", source);
    return dest;
  }
};
function asyncGeneratorStep(n, t, e, r, o, a, c) {
  try {
    var i2 = n[a](c), u = i2.value;
  } catch (n2) {
    e(n2);
    return;
  }
  i2.done ? t(u) : Promise.resolve(u).then(r, o);
}
function _asyncToGenerator(n) {
  return function() {
    var t = this, e = arguments;
    return new Promise(function(r, o) {
      var a = n.apply(t, e);
      function _next(n2) {
        asyncGeneratorStep(a, r, o, _next, _throw, "next", n2);
      }
      function _throw(n2) {
        asyncGeneratorStep(a, r, o, _next, _throw, "throw", n2);
      }
      _next(void 0);
    });
  };
}
var PrettifyType = {
  /** No prettification (smallest file size) */
  NONE: "",
  /** Indent with 2 spaces */
  WITH_2_BLANKS: "  ",
  /** Indent with 4 spaces */
  WITH_4_BLANKS: "    ",
  /** Indent with tab character */
  WITH_TAB: "	"
};
var convertPrettifyType = (prettify) => prettify === true ? PrettifyType.WITH_2_BLANKS : prettify === false ? void 0 : prettify;
var mimeTypeOf = (file) => file.Macros === void 0 ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document" : "application/vnd.ms-word.document.macroEnabled.12";
var Packer = class Packer2 {
  /**
  * Exports a document to the specified output format.
  *
  * @param file - The document to export
  * @param type - The output format type (e.g., "nodebuffer", "blob", "string")
  * @param prettify - Whether to prettify the XML output (boolean or PrettifyType)
  * @param overrides - Optional array of file overrides for custom XML content
  * @returns A promise resolving to the exported document in the specified format
  */
  static pack(_x, _x2, _x3) {
    var _this = this;
    return _asyncToGenerator(function* (file, type, prettify, overrides = []) {
      return zipOutput(zipFiles(_this.compiler.compile(file, convertPrettifyType(prettify), overrides)), type, mimeTypeOf(file));
    }).apply(this, arguments);
  }
  /**
  * Exports a document to a string representation.
  *
  * @param file - The document to export
  * @param prettify - Whether to prettify the XML output
  * @param overrides - Optional array of file overrides
  * @returns A promise resolving to the document as a string
  */
  static toString(file, prettify, overrides = []) {
    return Packer2.pack(file, "string", prettify, overrides);
  }
  /**
  * Exports a document to a Node.js Buffer.
  *
  * @param file - The document to export
  * @param prettify - Whether to prettify the XML output
  * @param overrides - Optional array of file overrides
  * @returns A promise resolving to the document as a Buffer
  */
  static toBuffer(file, prettify, overrides = []) {
    return Packer2.pack(file, "nodebuffer", prettify, overrides);
  }
  /**
  * Exports a document to a base64-encoded string.
  *
  * @param file - The document to export
  * @param prettify - Whether to prettify the XML output
  * @param overrides - Optional array of file overrides
  * @returns A promise resolving to the document as a base64 string
  */
  static toBase64String(file, prettify, overrides = []) {
    return Packer2.pack(file, "base64", prettify, overrides);
  }
  /**
  * Exports a document to a Blob (for browser environments).
  *
  * @param file - The document to export
  * @param prettify - Whether to prettify the XML output
  * @param overrides - Optional array of file overrides
  * @returns A promise resolving to the document as a Blob
  */
  static toBlob(file, prettify, overrides = []) {
    return Packer2.pack(file, "blob", prettify, overrides);
  }
  /**
  * Exports a document to an ArrayBuffer.
  *
  * @param file - The document to export
  * @param prettify - Whether to prettify the XML output
  * @param overrides - Optional array of file overrides
  * @returns A promise resolving to the document as an ArrayBuffer
  */
  static toArrayBuffer(file, prettify, overrides = []) {
    return Packer2.pack(file, "arraybuffer", prettify, overrides);
  }
  /**
  * Exports a document to a Node.js Stream.
  *
  * The stream gives the document as one Node.js Buffer, then ends. Where there's no Buffer, as in a browser, it
  * emits an `error` event instead, so use `toBlob` there.
  *
  * @param file - The document to export
  * @param prettify - Whether to prettify the XML output
  * @param overrides - Optional array of file overrides
  * @returns A readable stream containing the document data
  */
  static toStream(file, prettify, overrides = []) {
    const stream = new Stream();
    const files = this.compiler.compile(file, convertPrettifyType(prettify), overrides);
    new Promise((resolve2) => setTimeout(resolve2)).then(() => zipOutput(zipFiles(files), "nodebuffer", mimeTypeOf(file))).then((data) => {
      stream.emit("data", data);
      stream.emit("end");
    }, (error) => stream.emit("error", error));
    return stream;
  }
};
_defineProperty(Packer, "compiler", new Compiler());
var bookmarkIdOf = (element) => {
  var _element$attributes;
  if (element.name !== "w:bookmarkStart" && element.name !== "w:bookmarkEnd") return;
  const id = Number((_element$attributes = element.attributes) === null || _element$attributes === void 0 ? void 0 : _element$attributes["w:id"]);
  return Number.isInteger(id) ? id : void 0;
};
var findBookmarkIds = (element) => {
  var _element$elements;
  const id = bookmarkIdOf(element);
  return [...id === void 0 ? [] : [id], ...((_element$elements = element.elements) !== null && _element$elements !== void 0 ? _element$elements : []).flatMap(findBookmarkIds)];
};
var renumberBookmarksAvoiding = (idsInDocument) => {
  const usedIds = new Set(idsInDocument);
  const newIds = /* @__PURE__ */ new Map();
  let highestId = idsInDocument.reduce((highest, id) => Math.max(highest, id), 0);
  const newIdFor = (id) => {
    const knownId = newIds.get(id);
    if (knownId !== void 0) return knownId;
    const newId = usedIds.has(id) ? highestId + 1 : id;
    highestId = Math.max(highestId, newId);
    usedIds.add(newId);
    newIds.set(id, newId);
    return newId;
  };
  const renumber = (element) => {
    const id = bookmarkIdOf(element);
    return _objectSpread2(_objectSpread2(_objectSpread2({}, element), id === void 0 ? {} : { attributes: _objectSpread2(_objectSpread2({}, element.attributes), {}, { "w:id": String(newIdFor(id)) }) }), element.elements === void 0 ? {} : { elements: element.elements.map(renumber) });
  };
  return (elements) => elements.map(renumber);
};
var formatter$3 = new Formatter();
var decodeUtf8 = (bytes) => new TextDecoder("utf-8", { ignoreBOM: true }).decode(bytes);
var toJson = (xmlData) => {
  return parseXml(xmlData, { keepWhitespaceText: true });
};
var createTextElementContents = (text) => {
  var _textJson$elements$0$;
  return (_textJson$elements$0$ = toJson(stringifyXmlable(formatter$3.format(new Text({ text })))).elements[0].elements) !== null && _textJson$elements$0$ !== void 0 ? _textJson$elements$0$ : [];
};
var patchSpaceAttribute = (element) => _objectSpread2(_objectSpread2({}, element), {}, { attributes: { "xml:space": "preserve" } });
var getFirstLevelElements = (relationships, id) => {
  var _relationships$elemen, _parent$elements;
  const parent = (_relationships$elemen = relationships.elements) === null || _relationships$elemen === void 0 ? void 0 : _relationships$elemen.find((e) => e.name === id);
  if (parent === void 0) return [];
  (_parent$elements = parent.elements) !== null && _parent$elements !== void 0 || (parent.elements = []);
  return parent.elements;
};
var appendContentType = (element, contentType, extension) => {
  const relationshipElements = getFirstLevelElements(element, "Types");
  if (relationshipElements.some((el) => {
    var _el$attributes, _el$attributes2;
    return el.type === "element" && el.name === "Default" && (el === null || el === void 0 || (_el$attributes = el.attributes) === null || _el$attributes === void 0 ? void 0 : _el$attributes.ContentType) === contentType && (el === null || el === void 0 || (_el$attributes2 = el.attributes) === null || _el$attributes2 === void 0 ? void 0 : _el$attributes2.Extension) === extension;
  })) return;
  relationshipElements.push({
    attributes: {
      ContentType: contentType,
      Extension: extension
    },
    name: "Default",
    type: "element"
  });
};
var appendContentTypeOverride = (element, contentType, partName) => {
  const contentTypeElements = getFirstLevelElements(element, "Types");
  if (contentTypeElements.some((el) => {
    var _el$attributes3;
    return el.type === "element" && el.name === "Override" && ((_el$attributes3 = el.attributes) === null || _el$attributes3 === void 0 ? void 0 : _el$attributes3.PartName) === partName;
  })) return;
  contentTypeElements.push({
    attributes: {
      ContentType: contentType,
      PartName: partName
    },
    name: "Override",
    type: "element"
  });
};
var removeContentTypeOverride = (element, partName) => {
  var _element$elements;
  const types = (_element$elements = element.elements) === null || _element$elements === void 0 ? void 0 : _element$elements.find((el) => el.name === "Types");
  if ((types === null || types === void 0 ? void 0 : types.elements) === void 0) return;
  types.elements = types.elements.filter((el) => {
    var _el$attributes$PartNa, _el$attributes4;
    return !(el.name === "Override" && String((_el$attributes$PartNa = (_el$attributes4 = el.attributes) === null || _el$attributes4 === void 0 ? void 0 : _el$attributes4.PartName) !== null && _el$attributes$PartNa !== void 0 ? _el$attributes$PartNa : "").toLowerCase() === partName.toLowerCase());
  });
};
var getIdFromRelationshipId = (relationshipId) => {
  const output = parseInt(relationshipId.substring(3), 10);
  return isNaN(output) ? 0 : output;
};
var getNextRelationshipIndex = (relationships) => {
  return getFirstLevelElements(relationships, "Relationships").map((e) => {
    var _e$attributes$Id$toSt, _e$attributes;
    return getIdFromRelationshipId((_e$attributes$Id$toSt = (_e$attributes = e.attributes) === null || _e$attributes === void 0 || (_e$attributes = _e$attributes.Id) === null || _e$attributes === void 0 ? void 0 : _e$attributes.toString()) !== null && _e$attributes$Id$toSt !== void 0 ? _e$attributes$Id$toSt : "");
  }).reduce((acc, curr) => Math.max(acc, curr), 0) + 1;
};
var appendRelationship = (relationships, id, type, target, targetMode) => {
  const relationshipElements = getFirstLevelElements(relationships, "Relationships");
  relationshipElements.push({
    attributes: {
      Id: `rId${id}`,
      Type: type,
      Target: target,
      TargetMode: targetMode
    },
    name: "Relationship",
    type: "element"
  });
  return relationshipElements;
};
var createRelationshipFile = () => ({
  declaration: { attributes: {
    version: "1.0",
    encoding: "UTF-8",
    standalone: "yes"
  } },
  elements: [{
    type: "element",
    name: "Relationships",
    attributes: { xmlns: "http://schemas.openxmlformats.org/package/2006/relationships" },
    elements: []
  }]
});
var CORE_PROPERTIES_RELATIONSHIP_TYPE = "http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties";
var CORE_PROPERTIES_CONTENT_TYPE = "application/vnd.openxmlformats-package.core-properties+xml";
var PACKAGE_RELATIONSHIPS_PATH = "_rels/.rels";
var CORE_PROPERTIES_PATH = "docProps/core.xml";
var NAMESPACES = {
  cp: "http://schemas.openxmlformats.org/package/2006/metadata/core-properties",
  dc: "http://purl.org/dc/elements/1.1/"
};
var ELEMENTS = {
  title: {
    namespace: "dc",
    name: "title"
  },
  subject: {
    namespace: "dc",
    name: "subject"
  },
  creator: {
    namespace: "dc",
    name: "creator"
  },
  keywords: {
    namespace: "cp",
    name: "keywords"
  },
  description: {
    namespace: "dc",
    name: "description"
  },
  lastModifiedBy: {
    namespace: "cp",
    name: "lastModifiedBy"
  },
  revision: {
    namespace: "cp",
    name: "revision"
  }
};
var textOf = (value) => value === "" ? [] : [{
  type: "text",
  text: String(value)
}];
var localName = (element) => {
  var _element$name;
  return (_element$name = element.name) === null || _element$name === void 0 ? void 0 : _element$name.slice(element.name.indexOf(":") + 1);
};
var prefixOf = (root, namespace) => {
  var _Object$entries$find;
  const declaration = (_Object$entries$find = Object.entries(_objectSpread2({}, root.attributes)).find(([name, value]) => (name === "xmlns" || name.startsWith("xmlns:")) && value === NAMESPACES[namespace])) === null || _Object$entries$find === void 0 ? void 0 : _Object$entries$find[0];
  if (declaration === void 0) {
    root.attributes = _objectSpread2(_objectSpread2({}, root.attributes), {}, { [`xmlns:${namespace}`]: NAMESPACES[namespace] });
    return `${namespace}:`;
  }
  return declaration === "xmlns" ? "" : `${declaration.slice(6)}:`;
};
var decode = (bytes) => {
  const encoding = bytes[0] === 255 && bytes[1] === 254 ? "utf-16le" : bytes[0] === 254 && bytes[1] === 255 ? "utf-16be" : "utf-8";
  return new TextDecoder(encoding).decode(bytes);
};
var readPart = (parts, binaryParts, path) => {
  var _part$declaration;
  const bytes = binaryParts.get(path);
  if (bytes === void 0) return parts.get(path);
  const part = toJson(decode(bytes));
  if ((_part$declaration = part.declaration) === null || _part$declaration === void 0 ? void 0 : _part$declaration.attributes) part.declaration.attributes.encoding = "UTF-8";
  binaryParts.delete(path);
  parts.set(path, part);
  return part;
};
var corePropertiesPathOf = (parts) => {
  var _parts$get, _getFirstLevelElement;
  const relationships = (_parts$get = parts.get(PACKAGE_RELATIONSHIPS_PATH)) !== null && _parts$get !== void 0 ? _parts$get : createRelationshipFile();
  const target = (_getFirstLevelElement = getFirstLevelElements(relationships, "Relationships").find((relationship) => {
    var _relationship$attribu;
    return ((_relationship$attribu = relationship.attributes) === null || _relationship$attribu === void 0 ? void 0 : _relationship$attribu.Type) === CORE_PROPERTIES_RELATIONSHIP_TYPE;
  })) === null || _getFirstLevelElement === void 0 || (_getFirstLevelElement = _getFirstLevelElement.attributes) === null || _getFirstLevelElement === void 0 ? void 0 : _getFirstLevelElement.Target;
  if (typeof target === "string") return resolveTarget("", target);
  appendRelationship(relationships, getNextRelationshipIndex(relationships), CORE_PROPERTIES_RELATIONSHIP_TYPE, CORE_PROPERTIES_PATH);
  parts.set(PACKAGE_RELATIONSHIPS_PATH, relationships);
  return CORE_PROPERTIES_PATH;
};
var patchCoreProperties = (parts, binaryParts, properties, { addContentTypeOverride }) => {
  var _part$elements, _root$elements;
  const path = corePropertiesPathOf(parts);
  const existing = readPart(parts, binaryParts, path);
  const part = existing !== null && existing !== void 0 ? existing : {
    declaration: { attributes: {
      version: "1.0",
      encoding: "UTF-8",
      standalone: "yes"
    } },
    elements: [{
      type: "element",
      name: "cp:coreProperties",
      attributes: { "xmlns:cp": NAMESPACES.cp },
      elements: []
    }]
  };
  if (existing === void 0) {
    parts.set(path, part);
    addContentTypeOverride(CORE_PROPERTIES_CONTENT_TYPE, `/${path}`);
  }
  const root = (_part$elements = part.elements) === null || _part$elements === void 0 ? void 0 : _part$elements.find((element) => localName(element) === "coreProperties");
  if (root === void 0) throw new Error(`Could not find the core properties in ${path}`);
  (_root$elements = root.elements) !== null && _root$elements !== void 0 || (root.elements = []);
  for (const [key, { namespace, name }] of Object.entries(ELEMENTS)) {
    const value = properties[key];
    if (value === void 0) continue;
    const element = root.elements.find((item) => localName(item) === name);
    if (element) element.elements = textOf(value);
    else root.elements.push({
      type: "element",
      name: `${prefixOf(root, namespace)}${name}`,
      elements: textOf(value)
    });
  }
};
var DRAWINGS = /* @__PURE__ */ new Set(["wp:inline", "wp:anchor"]);
var ID_ELEMENTS = /* @__PURE__ */ new Set([
  "wp:docPr",
  "wps:cNvPr",
  "wpg:cNvPr"
]);
var REFERENCE_ELEMENTS = /* @__PURE__ */ new Set(["a:stCxn", "a:endCxn"]);
var idOf$1 = (element, names) => {
  var _element$name, _element$attributes;
  if (!names.has((_element$name = element.name) !== null && _element$name !== void 0 ? _element$name : "")) return;
  const id = Number((_element$attributes = element.attributes) === null || _element$attributes === void 0 ? void 0 : _element$attributes.id);
  return Number.isInteger(id) ? id : void 0;
};
var findDrawingIds = (element) => {
  var _element$elements;
  const id = idOf$1(element, ID_ELEMENTS);
  return [...id === void 0 ? [] : [id], ...((_element$elements = element.elements) !== null && _element$elements !== void 0 ? _element$elements : []).flatMap(findDrawingIds)];
};
var ownIdsOf = (drawing) => {
  const idsIn = (element) => {
    var _element$elements2;
    const id = idOf$1(element, ID_ELEMENTS);
    return [...id === void 0 ? [] : [id], ...((_element$elements2 = element.elements) !== null && _element$elements2 !== void 0 ? _element$elements2 : []).flatMap((child2) => {
      var _child$name;
      return DRAWINGS.has((_child$name = child2.name) !== null && _child$name !== void 0 ? _child$name : "") ? [] : idsIn(child2);
    })];
  };
  return idsIn(drawing);
};
var renumberDrawingsAvoiding = (idsInDocument) => {
  const usedIds = new Set(idsInDocument);
  let highestId = idsInDocument.reduce((highest, id) => Math.max(highest, id), 0);
  const newIdFor = (id) => {
    const newId = usedIds.has(id) ? highestId + 1 : id;
    highestId = Math.max(highestId, newId);
    usedIds.add(newId);
    return newId;
  };
  const renumberDrawing = (drawing) => {
    const newIds = new Map([...new Set(ownIdsOf(drawing))].map((id) => [id, newIdFor(id)]));
    const renumberIn = (element) => {
      var _element$name2, _idOf;
      if (element !== drawing && DRAWINGS.has((_element$name2 = element.name) !== null && _element$name2 !== void 0 ? _element$name2 : "")) return renumberDrawing(element);
      const id = (_idOf = idOf$1(element, ID_ELEMENTS)) !== null && _idOf !== void 0 ? _idOf : idOf$1(element, REFERENCE_ELEMENTS);
      const newId = id === void 0 ? void 0 : newIds.get(id);
      return _objectSpread2(_objectSpread2(_objectSpread2({}, element), newId === void 0 ? {} : { attributes: _objectSpread2(_objectSpread2({}, element.attributes), {}, { id: String(newId) }) }), element.elements === void 0 ? {} : { elements: element.elements.map(renumberIn) });
    };
    return renumberIn(drawing);
  };
  const renumber = (element) => {
    var _element$name3;
    return DRAWINGS.has((_element$name3 = element.name) !== null && _element$name3 !== void 0 ? _element$name3 : "") ? renumberDrawing(element) : _objectSpread2(_objectSpread2({}, element), element.elements === void 0 ? {} : { elements: element.elements.map(renumber) });
  };
  return (elements) => elements.map(renumber);
};
var PatchType = {
  /** Replace entire file-level elements (e.g., whole paragraphs) */
  DOCUMENT: "file",
  /** Replace content within paragraphs (inline replacement) */
  PARAGRAPH: "paragraph",
  /**
  * Repeat the rows of a table that hold the placeholder's fields, such as `{{items.name}}`, once for each row of
  * data. See {@link TableRowsPatch}
  */
  TABLE_ROWS: "tableRows",
  /**
  * Change a drawing whose alt text holds the placeholder, and the parts it refers to, such as the data of a chart made
  * in Word. See {@link DrawingPatch}
  */
  DRAWING: "drawing"
};
var DrawingPatch = class {
  constructor() {
    _defineProperty(this, "type", PatchType.DRAWING);
  }
};
var DRAWING_PROPERTIES = /* @__PURE__ */ new Map([
  ["wp:inline", "wp:docPr"],
  ["wp:anchor", "wp:docPr"],
  ["wpg:graphicFrame", "wpg:cNvPr"],
  ["wpc:graphicFrame", "wpg:cNvPr"]
]);
var findDrawings = (element) => {
  var _element$elements;
  return ((_element$elements = element.elements) !== null && _element$elements !== void 0 ? _element$elements : []).flatMap((child2) => {
    var _child$elements;
    const name = child2.name === void 0 ? void 0 : DRAWING_PROPERTIES.get(child2.name);
    const properties = name === void 0 ? void 0 : (_child$elements = child2.elements) === null || _child$elements === void 0 ? void 0 : _child$elements.find((e) => e.name === name);
    return [...properties ? [{
      element: child2,
      properties
    }] : [], ...findDrawings(child2)];
  });
};
var altTextOf = (properties) => {
  var _properties$attribute, _properties$attribute2;
  return [(_properties$attribute = properties.attributes) === null || _properties$attribute === void 0 ? void 0 : _properties$attribute.descr, (_properties$attribute2 = properties.attributes) === null || _properties$attribute2 === void 0 ? void 0 : _properties$attribute2.title].flatMap((text) => text === void 0 ? [] : [String(text)]);
};
var CONTENT_TYPES$1 = "[Content_Types].xml";
var relationshipsIn = (relationships) => {
  var _relationships$elemen;
  if (!((_relationships$elemen = relationships.elements) === null || _relationships$elemen === void 0 ? void 0 : _relationships$elemen.some((element) => element.name === "Relationships"))) {
    var _relationships$elemen2;
    relationships.elements = [...(_relationships$elemen2 = relationships.elements) !== null && _relationships$elemen2 !== void 0 ? _relationships$elemen2 : [], ...createRelationshipFile().elements];
  }
  return getFirstLevelElements(relationships, "Relationships");
};
var RELATIONSHIPS_NAMESPACE = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
var relationshipPrefixesIn = (element) => {
  var _element$attributes, _element$elements2;
  return /* @__PURE__ */ new Set([
    "r",
    ...Object.entries((_element$attributes = element.attributes) !== null && _element$attributes !== void 0 ? _element$attributes : {}).flatMap(([name, value]) => name.startsWith("xmlns:") && value === RELATIONSHIPS_NAMESPACE ? [name.slice(6)] : []),
    ...((_element$elements2 = element.elements) !== null && _element$elements2 !== void 0 ? _element$elements2 : []).flatMap((child2) => [...relationshipPrefixesIn(child2)])
  ]);
};
var relationshipIdsIn = (element, prefixes) => {
  var _element$attributes2, _element$elements3;
  return /* @__PURE__ */ new Set([...Object.entries((_element$attributes2 = element.attributes) !== null && _element$attributes2 !== void 0 ? _element$attributes2 : {}).flatMap(([name, value]) => name.includes(":") && prefixes.has(name.slice(0, name.indexOf(":"))) ? [String(value)] : []), ...((_element$elements3 = element.elements) !== null && _element$elements3 !== void 0 ? _element$elements3 : []).flatMap((child2) => [...relationshipIdsIn(child2, prefixes)])]);
};
var contentsOf = (parts, binaryParts) => {
  const has = (path) => parts.has(path) || binaryParts.has(path);
  const findPath = (path) => {
    if (has(path)) return path;
    const decoded = (() => {
      try {
        return decodeURI(path);
      } catch (_unused) {
        return;
      }
    })();
    if (decoded !== void 0 && has(decoded)) return decoded;
    const lower = path.toLowerCase();
    return [...parts.keys(), ...binaryParts.keys()].find((key) => key.toLowerCase() === lower);
  };
  const findRelationship = (from, id) => {
    const relationships = parts.get(relationshipsPathOf(from));
    return relationships === void 0 ? void 0 : getFirstLevelElements(relationships, "Relationships").find((relationship) => {
      var _relationship$attribu;
      return relationship.name === "Relationship" && ((_relationship$attribu = relationship.attributes) === null || _relationship$attribu === void 0 ? void 0 : _relationship$attribu.Id) === id;
    });
  };
  const pathOf = (from, relationship) => {
    var _relationship$attribu2, _relationship$attribu3;
    const target = (_relationship$attribu2 = relationship.attributes) === null || _relationship$attribu2 === void 0 ? void 0 : _relationship$attribu2.Target;
    return ((_relationship$attribu3 = relationship.attributes) === null || _relationship$attribu3 === void 0 ? void 0 : _relationship$attribu3.TargetMode) === "External" || target === void 0 ? void 0 : findPath(resolveTarget(from, String(target)));
  };
  const isReferenced = (path) => [...parts].some(([relationshipsPath, relationships]) => relationshipsPath.endsWith(".rels") && getFirstLevelElements(relationships, "Relationships").some((relationship) => pathOf(sourceOfRelationships(relationshipsPath), relationship) === path));
  const removeIfUnreferenced = (from, path) => {
    if (path === void 0 || path === from || path === CONTENT_TYPES$1 || path.endsWith(".rels") || isReferenced(path)) return;
    const relationships = parts.get(relationshipsPathOf(path));
    parts.delete(path);
    binaryParts.delete(path);
    parts.delete(relationshipsPathOf(path));
    const contentTypes = parts.get(CONTENT_TYPES$1);
    if (contentTypes !== void 0) removeContentTypeOverride(contentTypes, `/${path}`);
    for (const relationship of relationships === void 0 ? [] : getFirstLevelElements(relationships, "Relationships")) removeIfUnreferenced(path, pathOf(path, relationship));
  };
  const removeRelationships = (from, ids) => {
    var _parts$get, _relationships$elemen3;
    const relationships = (_parts$get = parts.get(relationshipsPathOf(from))) === null || _parts$get === void 0 || (_parts$get = _parts$get.elements) === null || _parts$get === void 0 ? void 0 : _parts$get.find((element) => element.name === "Relationships");
    const removed = ((_relationships$elemen3 = relationships === null || relationships === void 0 ? void 0 : relationships.elements) !== null && _relationships$elemen3 !== void 0 ? _relationships$elemen3 : []).filter((relationship) => {
      var _relationship$attribu4;
      return relationship.name === "Relationship" && ids.has(String((_relationship$attribu4 = relationship.attributes) === null || _relationship$attribu4 === void 0 ? void 0 : _relationship$attribu4.Id));
    });
    if (relationships === void 0 || removed.length === 0) return;
    relationships.elements = relationships.elements.filter((element) => !removed.includes(element));
    for (const relationship of removed) removeIfUnreferenced(from, pathOf(from, relationship));
  };
  return {
    findRelationship,
    pathOf,
    removeIfUnreferenced,
    removeRelationships
  };
};
var createTemplatePackage = (parts, { findRelationship, pathOf, removeIfUnreferenced }, file, context) => {
  const formatter2 = new Formatter();
  return {
    getRelatedPart: (from, relationshipId) => {
      const relationship = findRelationship(from.path, relationshipId);
      const path = relationship === void 0 ? void 0 : pathOf(from.path, relationship);
      return path === void 0 ? void 0 : {
        path,
        xml: parts.get(path)
      };
    },
    replaceRelatedPart: (from, relationshipId, part) => {
      const path = `word/${file.PackageParts.add(part)}`;
      const { relationshipType } = part.options;
      const target = relativeTarget(from.path, path);
      const relationship = relationshipId === void 0 ? void 0 : findRelationship(from.path, relationshipId);
      if (relationship === void 0) {
        var _parts$get2;
        const relationshipsPath = relationshipsPathOf(from.path);
        const relationships = (_parts$get2 = parts.get(relationshipsPath)) !== null && _parts$get2 !== void 0 ? _parts$get2 : createRelationshipFile();
        parts.set(relationshipsPath, relationships);
        const id = relationshipId !== null && relationshipId !== void 0 ? relationshipId : `rId${getNextRelationshipIndex(relationships)}`;
        relationshipsIn(relationships).push({
          type: "element",
          name: "Relationship",
          attributes: {
            Id: id,
            Type: relationshipType,
            Target: target
          }
        });
        return id;
      }
      const previous = pathOf(from.path, relationship);
      relationship.attributes = _objectSpread2(_objectSpread2({}, Object.fromEntries(Object.entries(relationship.attributes).filter(([name]) => name !== "TargetMode"))), {}, {
        Type: relationshipType,
        Target: target
      });
      removeIfUnreferenced(from.path, previous);
      return String(relationship.attributes.Id);
    },
    format: (content) => toJson(stringifyXmlable(formatter2.format(content, context))).elements[0]
  };
};
var patchDrawings = ({ parts, binaryParts, file, patches, delimiters }, createContext) => {
  const placeholders = patches.map(([key, patch]) => ({
    placeholder: `${delimiters.start}${key}${delimiters.end}`,
    patch
  }));
  const found = [...parts].filter(([path]) => path.startsWith("word/") && !path.endsWith(".rels")).flatMap(([path, xmlPart]) => findDrawings(xmlPart).flatMap((drawing) => {
    const altText = altTextOf(drawing.properties);
    const matches = placeholders.filter(({ placeholder }) => altText.some((text) => text.includes(placeholder)));
    if (matches.length > 1) {
      var _drawing$properties$a, _drawing$properties$a2;
      throw new Error(`The drawing "${(_drawing$properties$a = (_drawing$properties$a2 = drawing.properties.attributes) === null || _drawing$properties$a2 === void 0 ? void 0 : _drawing$properties$a2.name) !== null && _drawing$properties$a !== void 0 ? _drawing$properties$a : ""}" in ${path} has the placeholders ${matches.map(({ placeholder }) => placeholder).join(" and ")} in its alt text. A drawing can only be patched once`);
    }
    return matches.map(({ placeholder, patch }) => ({
      drawing: _objectSpread2(_objectSpread2({ placeholder }, drawing), {}, { part: {
        path,
        xml: xmlPart
      } }),
      patch
    }));
  }));
  const contents = contentsOf(parts, binaryParts);
  for (const { drawing, patch } of found) {
    const referenced = relationshipIdsIn(drawing.element, relationshipPrefixesIn(drawing.part.xml));
    patch.patch(drawing, createTemplatePackage(parts, contents, file, createContext(drawing.part.path)));
    const used = relationshipIdsIn(drawing.part.xml, relationshipPrefixesIn(drawing.part.xml));
    contents.removeRelationships(drawing.part.path, new Set([...referenced].filter((id) => !used.has(id))));
  }
};
var isStream = (data) => typeof data === "object" && data !== null && "on" in data && typeof data.on === "function";
var isZipArchive = (data) => typeof data === "object" && data !== null && "generateAsync" in data && typeof data.generateAsync === "function";
var isBlob = (data) => ["[object Blob]", "[object File]"].includes(Object.prototype.toString.call(data));
var readStream = (stream) => new Promise((resolve2, reject) => {
  const chunks = [];
  stream.on("data", (chunk) => {
    if (ArrayBuffer.isView(chunk)) chunks.push(new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength));
    else if (typeof chunk === "number") chunks.push(chunk);
    else reject(new TypeError(`A template stream must give bytes, but it gave a ${typeof chunk}. A stream with an encoding set gives text, so do not set one.`));
  });
  stream.on("error", reject);
  stream.on("end", () => {
    const bytes = new Uint8Array(chunks.reduce((length, chunk) => length + (typeof chunk === "number" ? 1 : chunk.length), 0));
    chunks.reduce((offset, chunk) => {
      if (typeof chunk === "number") {
        bytes[offset] = chunk;
        return offset + 1;
      }
      bytes.set(chunk, offset);
      return offset + chunk.length;
    }, 0);
    resolve2(bytes);
  });
});
var bytesOf$1 = (function() {
  var _ref = _asyncToGenerator(function* (data) {
    if (isZipArchive(data)) return data.generateAsync({ type: "uint8array" });
    if (isStream(data)) return readStream(data);
    if (isBlob(data)) return new Uint8Array(yield data.arrayBuffer());
    if (typeof data === "string") return Uint8Array.from({ length: data.length }, (_, index) => data.charCodeAt(index));
    if (Array.isArray(data)) return Uint8Array.from(data);
    return ArrayBuffer.isView(data) ? new Uint8Array(data.buffer, data.byteOffset, data.byteLength) : new Uint8Array(data);
  });
  return function bytesOf2(_x) {
    return _ref.apply(this, arguments);
  };
})();
var loadZip = (function() {
  var _ref2 = _asyncToGenerator(function* (data, include) {
    return unzipFiles(yield bytesOf$1(data), include);
  });
  return function loadZip2(_x2, _x3) {
    return _ref2.apply(this, arguments);
  };
})();
var formatter$2 = new Formatter();
var DOCUMENT_PATH$1 = "word/document.xml";
var FOOTNOTES = {
  path: "word/footnotes.xml",
  rootName: "w:footnotes",
  noteName: "w:footnote",
  referenceName: "w:footnoteReference",
  contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.footnotes+xml",
  relationshipType: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/footnotes",
  create: {
    part: () => new FootNotes(),
    mark: () => new FootnoteRefRun(),
    styles: () => [
      new FootnoteText({}),
      new FootnoteTextChar({}),
      new FootnoteReferenceStyle({})
    ]
  }
};
var ENDNOTES = {
  path: "word/endnotes.xml",
  rootName: "w:endnotes",
  noteName: "w:endnote",
  referenceName: "w:endnoteReference",
  contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.endnotes+xml",
  relationshipType: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/endnotes",
  create: {
    part: () => new Endnotes(),
    mark: () => new EndnoteRefRun(),
    styles: () => [
      new EndnoteText({}),
      new EndnoteTextChar({}),
      new EndnoteReferenceStyle({})
    ]
  }
};
var formatElement$1 = (component, context) => toJson(stringifyXmlable(formatter$2.format(component, context))).elements[0];
var findIds = (element, names) => {
  var _element$name, _element$attributes, _element$elements;
  const id = names.includes((_element$name = element.name) !== null && _element$name !== void 0 ? _element$name : "") ? Number((_element$attributes = element.attributes) === null || _element$attributes === void 0 ? void 0 : _element$attributes["w:id"]) : NaN;
  return [...Number.isInteger(id) ? [id] : [], ...((_element$elements = element.elements) !== null && _element$elements !== void 0 ? _element$elements : []).flatMap((child2) => findIds(child2, names))];
};
var withMark = (paragraph, mark) => {
  var _paragraph$elements, _elements$;
  const elements = (_paragraph$elements = paragraph.elements) !== null && _paragraph$elements !== void 0 ? _paragraph$elements : [];
  const index = ((_elements$ = elements[0]) === null || _elements$ === void 0 ? void 0 : _elements$.name) === "w:pPr" ? 1 : 0;
  return _objectSpread2(_objectSpread2({}, paragraph), {}, { elements: [
    ...elements.slice(0, index),
    mark,
    ...elements.slice(index)
  ] });
};
var patchNotesOfKind = (kind, notes, parts, { createContext, addContentTypeOverride, renumberBookmarks, renumberDrawings, renumberLists, useStyles }) => {
  const givenNotes = new Map(Object.entries(notes).map(([id, note]) => [Number(id), note]));
  const carriedIds = /* @__PURE__ */ new Map();
  let highestGivenId = [...givenNotes.keys()].filter(Number.isFinite).reduce((highest, id) => Math.max(highest, Math.floor(id)), 0);
  const noteOfId = /* @__PURE__ */ new Map();
  let highestId;
  const renumber = (element) => {
    var _element$attributes2, _highestId;
    const note = element.name === kind.referenceName ? givenNotes.get(Number((_element$attributes2 = element.attributes) === null || _element$attributes2 === void 0 ? void 0 : _element$attributes2["w:id"])) : void 0;
    if (note === void 0) return element.elements === void 0 ? element : _objectSpread2(_objectSpread2({}, element), {}, { elements: element.elements.map(renumber) });
    highestId = ((_highestId = highestId) !== null && _highestId !== void 0 ? _highestId : [...parts.values()].flatMap((part) => findIds(part, [kind.noteName, kind.referenceName])).reduce((highest, id) => Math.max(highest, id), 0)) + 1;
    noteOfId.set(highestId, note);
    return _objectSpread2(_objectSpread2({}, element), {}, { attributes: _objectSpread2(_objectSpread2({}, element.attributes), {}, { "w:id": String(highestId) }) });
  };
  const findOrAddPart = () => {
    var _parts$get;
    const relationship = getFirstLevelElements((_parts$get = parts.get(relationshipsPathOf(DOCUMENT_PATH$1))) !== null && _parts$get !== void 0 ? _parts$get : {}, "Relationships").find((element) => {
      var _element$attributes3;
      return ((_element$attributes3 = element.attributes) === null || _element$attributes3 === void 0 ? void 0 : _element$attributes3.Type) === kind.relationshipType;
    });
    const path = relationship ? resolveTarget(DOCUMENT_PATH$1, String(relationship.attributes.Target)) : kind.path;
    if (!parts.has(path)) {
      parts.set(path, {
        declaration: { attributes: {
          version: "1.0",
          encoding: "UTF-8",
          standalone: "yes"
        } },
        elements: [formatElement$1(kind.create.part(), createContext(path))]
      });
      addContentTypeOverride(kind.contentType, `/${path}`);
    }
    if (!relationship) createContext(DOCUMENT_PATH$1).viewWrapper.Relationships.addRelationship(uniqueId(), kind.relationshipType, relativeTarget(DOCUMENT_PATH$1, path));
    return path;
  };
  const write = () => {
    if (noteOfId.size === 0) return;
    const path = findOrAddPart();
    const context = createContext(path);
    const contentOfNote = new Map([...new Set(noteOfId.values())].map((note) => {
      const mark = formatElement$1(kind.create.mark(), context);
      return [note, useStyles(renumberLists(renumberBookmarks(note.children.map((paragraph) => formatElement$1(paragraph, context)).map((paragraph, index) => index === 0 ? withMark(paragraph, mark) : paragraph))))];
    }));
    getFirstLevelElements(parts.get(path), kind.rootName).push(...[...noteOfId].map(([id, note]) => ({
      type: "element",
      name: kind.noteName,
      attributes: { "w:id": String(id) },
      elements: [...renumberDrawings(contentOfNote.get(note))]
    })));
    const stylesPart = parts.get("word/styles.xml");
    if (stylesPart) {
      const styles = getFirstLevelElements(stylesPart, "w:styles");
      const styleIds = new Set(styles.map((style) => {
        var _style$attributes;
        return (_style$attributes = style.attributes) === null || _style$attributes === void 0 ? void 0 : _style$attributes["w:styleId"];
      }));
      styles.push(...kind.create.styles().map((style) => formatElement$1(style, context)).filter((style) => {
        var _style$attributes2;
        return !styleIds.has((_style$attributes2 = style.attributes) === null || _style$attributes2 === void 0 ? void 0 : _style$attributes2["w:styleId"]);
      }));
    }
  };
  const carry = (reference, note) => {
    const existing = carriedIds.get(reference);
    if (existing !== void 0) return existing;
    highestGivenId++;
    givenNotes.set(highestGivenId, note);
    carriedIds.set(reference, highestGivenId);
    return highestGivenId;
  };
  return {
    renumber: (elements) => elements.map(renumber),
    write,
    carry
  };
};
var patchNotes = ({ footnotes = {}, endnotes = {} }, parts, helpers) => {
  const patchers = {
    footnotes: patchNotesOfKind(FOOTNOTES, footnotes, parts, helpers),
    endnotes: patchNotesOfKind(ENDNOTES, endnotes, parts, helpers)
  };
  return {
    carry: (kind, reference, note) => patchers[kind].carry(reference, note),
    renumber: (elements) => Object.values(patchers).reduce((renumbered, patcher) => patcher.renumber(renumbered), elements),
    write: () => {
      for (const patcher of Object.values(patchers)) patcher.write();
    }
  };
};
var formatter$1 = new Formatter();
var DOCUMENT_PATH = "word/document.xml";
var NUMBERING_PATH = "word/numbering.xml";
var NUMBERING_CONTENT_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml";
var NUMBERING_RELATIONSHIP = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering";
var BULLET_REFERENCE = "default-bullet-numbering";
var BULLET_NUM_ID = "1";
var formatElement = (component, context) => toJson(stringifyXmlable(formatter$1.format(component, context))).elements[0];
var highestOf = (ids) => ids.reduce((highest, id) => Math.max(highest, id), 0);
var patchNumbering = (numbering, parts, { createContext, addContentTypeOverride }) => {
  const newNumIds = /* @__PURE__ */ new Map();
  let highestNumId;
  const numberingRelationship = () => {
    var _parts$get;
    return getFirstLevelElements((_parts$get = parts.get(relationshipsPathOf(DOCUMENT_PATH))) !== null && _parts$get !== void 0 ? _parts$get : {}, "Relationships").find((element) => {
      var _element$attributes;
      return ((_element$attributes = element.attributes) === null || _element$attributes === void 0 ? void 0 : _element$attributes.Type) === NUMBERING_RELATIONSHIP;
    });
  };
  const numberingPath = (relationship = numberingRelationship()) => relationship ? resolveTarget(DOCUMENT_PATH, String(relationship.attributes.Target)) : NUMBERING_PATH;
  const idsInTemplate = (name, attribute2) => {
    var _parts$get2;
    return getFirstLevelElements((_parts$get2 = parts.get(numberingPath())) !== null && _parts$get2 !== void 0 ? _parts$get2 : {}, "w:numbering").filter((element) => element.name === name).map((element) => Number(element.attributes[attribute2]));
  };
  const listOf = (numId) => {
    if (numId === BULLET_NUM_ID) return numbering.ConcreteNumbering.find(({ reference }) => reference === BULLET_REFERENCE);
    if (!numId.startsWith("{")) return;
    const list = numbering.ConcreteNumbering.find(({ reference, instance }) => numId === `{${reference}-${instance}}`);
    if (!list) {
      const reference = numId.slice(1, -1).replace(/-\d+$/, "");
      throw new Error(`A paragraph in a patch uses the numbering "${reference}", which isn't in the numbering option of patchDocument. Add it there with its levels, as in a Document`);
    }
    return list;
  };
  const newNumIdOf = (list) => {
    var _highestNumId;
    const knownId = newNumIds.get(list.numId);
    if (knownId !== void 0) return knownId;
    highestNumId = ((_highestNumId = highestNumId) !== null && _highestNumId !== void 0 ? _highestNumId : highestOf(idsInTemplate("w:num", "w:numId"))) + 1;
    newNumIds.set(list.numId, highestNumId);
    return highestNumId;
  };
  const renumber = (element) => {
    const list = element.name === "w:numId" ? listOf(String(element.attributes["w:val"])) : void 0;
    if (list === void 0) return element.elements === void 0 ? element : _objectSpread2(_objectSpread2({}, element), {}, { elements: element.elements.map(renumber) });
    return _objectSpread2(_objectSpread2({}, element), {}, { attributes: _objectSpread2(_objectSpread2({}, element.attributes), {}, { "w:val": String(newNumIdOf(list)) }) });
  };
  const findOrAddPart = (written) => {
    const relationship = numberingRelationship();
    const path = numberingPath(relationship);
    if (!parts.has(path)) {
      parts.set(path, {
        declaration: { attributes: {
          version: "1.0",
          encoding: "UTF-8",
          standalone: "yes"
        } },
        elements: [_objectSpread2(_objectSpread2({}, written), {}, { elements: [] })]
      });
      addContentTypeOverride(NUMBERING_CONTENT_TYPE, `/${path}`);
    }
    if (!relationship) createContext(DOCUMENT_PATH).viewWrapper.Relationships.addRelationship(uniqueId(), NUMBERING_RELATIONSHIP, relativeTarget(DOCUMENT_PATH, path));
    return path;
  };
  const write = () => {
    var _root$attributes$mcI, _root$attributes;
    if (newNumIds.size === 0) return;
    const written = formatElement(numbering, createContext(numberingPath()));
    const abstractNumIdOf = (list) => Number(list.elements.find((element) => element.name === "w:abstractNumId").attributes["w:val"]);
    const lists = written.elements.filter((element) => element.name === "w:num" && newNumIds.has(Number(element.attributes["w:numId"])));
    const highestAbstractNumId = highestOf(idsInTemplate("w:abstractNum", "w:abstractNumId"));
    const newAbstractNumIds = new Map([...new Set(lists.map(abstractNumIdOf))].map((id, index) => [id, highestAbstractNumId + index + 1]));
    const abstractLists = written.elements.flatMap((element) => {
      const newId = element.name === "w:abstractNum" ? newAbstractNumIds.get(Number(element.attributes["w:abstractNumId"])) : void 0;
      return newId === void 0 ? [] : [_objectSpread2(_objectSpread2({}, element), {}, { attributes: _objectSpread2(_objectSpread2({}, element.attributes), {}, { "w:abstractNumId": String(newId) }) })];
    });
    const path = findOrAddPart(written);
    const root = parts.get(path).elements.find((element) => element.name === "w:numbering");
    root.attributes = _objectSpread2(_objectSpread2(_objectSpread2({}, Object.fromEntries(Object.entries(written.attributes).filter(([name]) => name.startsWith("xmlns:")))), root.attributes), {}, { "mc:Ignorable": [.../* @__PURE__ */ new Set([...String((_root$attributes$mcI = (_root$attributes = root.attributes) === null || _root$attributes === void 0 ? void 0 : _root$attributes["mc:Ignorable"]) !== null && _root$attributes$mcI !== void 0 ? _root$attributes$mcI : "").split(" "), ...String(written.attributes["mc:Ignorable"]).split(" ")])].filter((prefix) => prefix !== "").join(" ") });
    const elements = getFirstLevelElements(parts.get(path), "w:numbering");
    const firstIndexOf = (names) => {
      const index = elements.findIndex((element) => names.includes(element.name));
      return index === -1 ? elements.length : index;
    };
    elements.splice(firstIndexOf(["w:num", "w:numIdMacAtCleanup"]), 0, ...abstractLists);
    elements.splice(firstIndexOf(["w:numIdMacAtCleanup"]), 0, ...lists.map((list) => _objectSpread2(_objectSpread2({}, list), {}, {
      attributes: _objectSpread2(_objectSpread2({}, list.attributes), {}, { "w:numId": String(newNumIds.get(Number(list.attributes["w:numId"]))) }),
      elements: list.elements.map((element) => element.name === "w:abstractNumId" ? _objectSpread2(_objectSpread2({}, element), {}, { attributes: { "w:val": String(newAbstractNumIds.get(abstractNumIdOf(list))) } }) : element)
    })));
  };
  return {
    renumber: (elements) => elements.map(renumber),
    write
  };
};
var PARSED = {
  nameOf: (element) => element.type === "element" ? element.name : void 0,
  contentOf: (element) => element.elements,
  attributeOf: (element, attribute2) => {
    var _element$attributes;
    return (_element$attributes = element.attributes) === null || _element$attributes === void 0 ? void 0 : _element$attributes[attribute2];
  },
  textOf: (element) => {
    var _element$elements;
    return ((_element$elements = element.elements) !== null && _element$elements !== void 0 ? _element$elements : []).filter(({ type }) => type === "text").map(({ text }) => String(text)).join("");
  },
  textElement: (text) => ({
    type: "element",
    name: "w:t",
    attributes: { "xml:space": "preserve" },
    elements: [{
      type: "text",
      text
    }]
  }),
  writeClean: (begin, instruction) => {
    var _begin$attributes;
    if (/^\s*(PAGEREF|TOC)\b/i.test(instruction) && ((_begin$attributes = begin.attributes) === null || _begin$attributes === void 0 ? void 0 : _begin$attributes["w:dirty"]) !== void 0) begin.attributes = Object.fromEntries(Object.entries(begin.attributes).filter(([key]) => key !== "w:dirty"));
  },
  setSimpleFieldResult: (element, text) => {
    element.elements = [{
      type: "element",
      name: "w:r",
      elements: [PARSED.textElement(text)]
    }];
  }
};
var DOCUMENT = "word/document.xml";
var IMPORT = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/aFChunk";
var ZIP = [
  80,
  75,
  3,
  4
];
var readPackage = (function() {
  var _ref = _asyncToGenerator(function* (data) {
    if (!ZIP.every((byte, index) => data[index] === byte)) return;
    try {
      const parts = /* @__PURE__ */ new Map();
      const binaryParts = /* @__PURE__ */ new Map();
      for (const [path, file] of unzipFiles(data)) if (/\.(xml|rels)$/.test(path)) parts.set(path, toJson(decodeUtf8(file)));
      else binaryParts.set(path, file);
      const importedDocuments = yield readImportedDocuments(parts, binaryParts);
      return _objectSpread2({
        parts,
        binaryParts
      }, importedDocuments.size > 0 ? { importedDocuments } : {});
    } catch (_unused) {
      return;
    }
  });
  return function readPackage2(_x) {
    return _ref.apply(this, arguments);
  };
})();
var readImportedDocuments = (function() {
  var _ref2 = _asyncToGenerator(function* (parts, binaryParts) {
    const imported = /* @__PURE__ */ new Map();
    for (const [path, relationships] of parts) {
      var _rootOf$elements, _rootOf;
      if (!path.endsWith(".rels")) continue;
      for (const { attributes = {} } of (_rootOf$elements = (_rootOf = rootOf(relationships)) === null || _rootOf === void 0 ? void 0 : _rootOf.elements) !== null && _rootOf$elements !== void 0 ? _rootOf$elements : []) {
        const target = resolveTarget(sourceOfRelationships(path), String(attributes.Target));
        const data = binaryParts.get(target);
        const read = attributes.Type === IMPORT && attributes.TargetMode !== "External" && data ? yield readPackage(data) : void 0;
        if (read) imported.set(target, read);
      }
    }
    return imported;
  });
  return function readImportedDocuments2(_x2, _x3) {
    return _ref2.apply(this, arguments);
  };
})();
var rootOf = (part) => {
  var _part$elements;
  return part === null || part === void 0 || (_part$elements = part.elements) === null || _part$elements === void 0 ? void 0 : _part$elements.find(({ type }) => type === "element");
};
var fillTemplatePageNumbers = (function() {
  var _ref3 = _asyncToGenerator(function* (parts, estimator, binaryParts = /* @__PURE__ */ new Map()) {
    var _rootOf$elements2, _rootOf2;
    const document = rootOf(parts.get(DOCUMENT));
    if (!document) return;
    const importedDocuments = yield readImportedDocuments(parts, binaryParts);
    const estimate = estimator(_objectSpread2({
      parts,
      binaryParts
    }, importedDocuments.size > 0 ? { importedDocuments } : {}));
    const partPageCounts = fillBodyFields(PARSED, document, estimate, { blank: true });
    const relationships = (_rootOf$elements2 = (_rootOf2 = rootOf(parts.get(relationshipsPathOf(DOCUMENT)))) === null || _rootOf2 === void 0 ? void 0 : _rootOf2.elements) !== null && _rootOf$elements2 !== void 0 ? _rootOf$elements2 : [];
    for (const { attributes = {} } of relationships) {
      const part = /\/(header|footer)$/.test(String(attributes.Type)) ? rootOf(parts.get(resolveTarget(DOCUMENT, String(attributes.Target)))) : void 0;
      if (part) fillPartFields(PARSED, part, estimate, {
        blank: true,
        sectionPageCount: partPageCounts.get(String(attributes.Id))
      });
    }
  });
  return function fillTemplatePageNumbers2(_x4, _x5) {
    return _ref3.apply(this, arguments);
  };
})();
var TokenNotFoundError = class extends Error {
  constructor(token) {
    super(`Token ${token} not found`);
    this.name = "TokenNotFoundError";
  }
};
var findRunElementIndexWithToken = (paragraphElement, token) => {
  var _paragraphElement$ele;
  for (let i2 = 0; i2 < ((_paragraphElement$ele = paragraphElement.elements) !== null && _paragraphElement$ele !== void 0 ? _paragraphElement$ele : []).length; i2++) {
    const element = paragraphElement.elements[i2];
    if (element.type === "element" && element.name === "w:r") {
      var _element$elements;
      const textElement2 = ((_element$elements = element.elements) !== null && _element$elements !== void 0 ? _element$elements : []).filter((e) => e.type === "element" && e.name === "w:t");
      for (const text of textElement2) {
        var _text$elements, _text$elements$0$text;
        if (!((_text$elements = text.elements) === null || _text$elements === void 0 ? void 0 : _text$elements[0])) continue;
        if ((_text$elements$0$text = text.elements[0].text) === null || _text$elements$0$text === void 0 ? void 0 : _text$elements$0$text.includes(token)) return i2;
      }
    }
  }
  throw new TokenNotFoundError(token);
};
var splitRunElement = (runElement, token) => {
  var _runElement$elements$, _runElement$elements;
  let splitIndex = -1;
  const splitElements = (_runElement$elements$ = (_runElement$elements = runElement.elements) === null || _runElement$elements === void 0 ? void 0 : _runElement$elements.map((e, i2) => {
    if (splitIndex !== -1) return e;
    if (e.type === "element" && e.name === "w:t") {
      var _e$elements$0$text, _e$elements;
      const splitText = ((_e$elements$0$text = (_e$elements = e.elements) === null || _e$elements === void 0 || (_e$elements = _e$elements[0]) === null || _e$elements === void 0 ? void 0 : _e$elements.text) !== null && _e$elements$0$text !== void 0 ? _e$elements$0$text : "").split(token);
      const newElements = splitText.map((t) => _objectSpread2(_objectSpread2(_objectSpread2({}, e), patchSpaceAttribute(e)), {}, { elements: createTextElementContents(t) }));
      if (splitText.length > 1) splitIndex = i2;
      return newElements;
    } else return e;
  }).flat()) !== null && _runElement$elements$ !== void 0 ? _runElement$elements$ : [];
  return {
    left: _objectSpread2(_objectSpread2({}, JSON.parse(JSON.stringify(runElement))), {}, { elements: splitElements.slice(0, splitIndex + 1) }),
    right: _objectSpread2(_objectSpread2({}, JSON.parse(JSON.stringify(runElement))), {}, { elements: splitElements.slice(splitIndex + 1) })
  };
};
var ReplaceMode = {
  /** Looking for the start of the replacement text */
  START: 0,
  /** Processing runs in the middle of the replacement text */
  MIDDLE: 1,
  /** Reached the end of the replacement text */
  END: 2
};
var replaceTokenInParagraphElement = ({ paragraphElement, renderedParagraph, originalText, replacementText, fromIndex = 0 }) => {
  const startIndex = renderedParagraph.text.indexOf(originalText, fromIndex);
  const endIndex = startIndex + originalText.length - 1;
  let replaceMode = ReplaceMode.START;
  for (const run of renderedParagraph.runs) for (const { text, index, start, end } of run.parts) switch (replaceMode) {
    case ReplaceMode.START:
      if (startIndex >= start && startIndex <= end) {
        const offsetStartIndex = startIndex - start;
        const offsetEndIndex = Math.min(endIndex, end) - start;
        if (text.substring(offsetStartIndex, offsetEndIndex + 1) === "") continue;
        const firstPart = text.substring(0, offsetStartIndex) + replacementText + text.substring(offsetEndIndex + 1);
        patchTextElement(paragraphElement.elements[run.index].elements[index], firstPart);
        replaceMode = ReplaceMode.MIDDLE;
        continue;
      }
      break;
    case ReplaceMode.MIDDLE:
      if (endIndex <= end) {
        const lastPart = text.substring(endIndex - start + 1);
        patchTextElement(paragraphElement.elements[run.index].elements[index], lastPart);
        const currentElement = paragraphElement.elements[run.index].elements[index];
        paragraphElement.elements[run.index].elements[index] = patchSpaceAttribute(currentElement);
        replaceMode = ReplaceMode.END;
      } else patchTextElement(paragraphElement.elements[run.index].elements[index], "");
  }
  return paragraphElement;
};
var patchTextElement = (element, text) => {
  element.elements = createTextElementContents(text);
  return element;
};
var renderParagraphNode = (node) => {
  if (node.element.name !== "w:p") throw new Error(`Invalid node type: ${node.element.name}`);
  if (!node.element.elements) return {
    text: "",
    runs: [],
    index: -1,
    pathToParagraph: []
  };
  let currentRunStringLength = 0;
  const runs = node.element.elements.map((element, i2) => ({
    element,
    i: i2
  })).filter(({ element }) => element.name === "w:r").map(({ element, i: i2 }) => {
    const renderedRunNode = renderRunNode(element, i2, currentRunStringLength);
    currentRunStringLength += renderedRunNode.text.length;
    return renderedRunNode;
  }).filter((e) => !!e);
  return {
    text: runs.reduce((acc, curr) => acc + curr.text, ""),
    runs,
    index: node.index,
    pathToParagraph: buildNodePath(node)
  };
};
var renderRunNode = (node, index, currentRunStringIndex) => {
  if (!node.elements) return {
    text: "",
    parts: [],
    index: -1,
    start: currentRunStringIndex,
    end: currentRunStringIndex
  };
  let currentTextStringIndex = currentRunStringIndex;
  const parts = node.elements.map((element, i2) => {
    var _element$elements$0$t, _element$elements$0$t2;
    if (element.name !== "w:t" || !element.elements || element.elements.length === 0) return;
    const partText = (_element$elements$0$t = (_element$elements$0$t2 = element.elements[0].text) === null || _element$elements$0$t2 === void 0 ? void 0 : _element$elements$0$t2.toString()) !== null && _element$elements$0$t !== void 0 ? _element$elements$0$t : "";
    const start = currentTextStringIndex;
    currentTextStringIndex += partText.length;
    return {
      text: partText,
      index: i2,
      start,
      end: start + partText.length - 1
    };
  }).filter((e) => !!e).map((e) => e);
  return {
    text: parts.reduce((acc, curr) => acc + curr.text, ""),
    parts,
    index,
    start: currentRunStringIndex,
    end: parts.length > 0 ? parts[parts.length - 1].end : currentRunStringIndex
  };
};
var buildNodePath = (node) => node.parent ? [...buildNodePath(node.parent), node.index] : [node.index];
var elementsToWrapper = (wrapper) => {
  var _wrapper$element$elem, _wrapper$element$elem2;
  return (_wrapper$element$elem = (_wrapper$element$elem2 = wrapper.element.elements) === null || _wrapper$element$elem2 === void 0 ? void 0 : _wrapper$element$elem2.map((e, i2) => ({
    element: e,
    index: i2,
    parent: wrapper
  }))) !== null && _wrapper$element$elem !== void 0 ? _wrapper$element$elem : [];
};
var traverse = (node) => {
  let renderedParagraphs = [];
  const queue = [...elementsToWrapper({
    element: node,
    index: 0,
    parent: void 0
  })];
  let currentNode;
  while (queue.length > 0) {
    currentNode = queue.shift();
    if (currentNode.element.name === "w:p") renderedParagraphs = [...renderedParagraphs, renderParagraphNode(currentNode)];
    queue.push(...elementsToWrapper(currentNode));
  }
  return renderedParagraphs;
};
var findLocationOfText = (node, text) => traverse(node).filter((p) => p.text.includes(text));
var SPLIT_TOKEN = "￿";
var replacer = ({ json, patch, patchText, context, keepOriginalStyles = true, recursive = true, renumberIds = (elements) => elements }) => {
  const renderedParagraphs = findLocationOfText(json, patchText);
  if (renderedParagraphs.length === 0) return {
    element: json,
    didFindOccurrence: false
  };
  const paragraphsInPatchOrder = [...renderedParagraphs].reverse();
  const paragraphsToPatch = patch.type === PatchType.DOCUMENT ? withoutNestedParagraphs(paragraphsInPatchOrder) : paragraphsInPatchOrder;
  for (const renderedParagraph of paragraphsToPatch) switch (patch.type) {
    case PatchType.DOCUMENT: {
      var _children;
      const parentElement = goToParentElementFromPath(json, renderedParagraph.pathToParagraph);
      const elementIndex = getLastElementIndexFromPath(renderedParagraph.pathToParagraph);
      const children = formatChildren(patch, context, renumberIds);
      const endParagraph = parentElement.name === "w:tc" && elementIndex === parentElement.elements.length - 1 && ((_children = children[children.length - 1]) === null || _children === void 0 ? void 0 : _children.name) !== "w:p" ? [{
        type: "element",
        name: "w:p"
      }] : [];
      parentElement.elements.splice(elementIndex, 1, ...children, ...endParagraph);
      break;
    }
    case PatchType.PARAGRAPH:
    default: {
      const paragraphElement = goToElementFromPath(json, renderedParagraph.pathToParagraph);
      let paragraph = renderedParagraph;
      let fromIndex = 0;
      do {
        const nextRunIndex = replaceOccurrenceInParagraph({
          paragraphElement,
          renderedParagraph: paragraph,
          patchText,
          fromIndex,
          children: formatChildren(patch, context, renumberIds),
          keepOriginalStyles
        });
        paragraph = renderParagraphNode({
          element: paragraphElement,
          index: renderedParagraph.index,
          parent: void 0
        });
        fromIndex = paragraph.runs.filter((run) => run.index < nextRunIndex).reduce((length, run) => length + run.text.length, 0);
      } while (recursive && paragraph.text.includes(patchText, fromIndex));
      break;
    }
  }
  return {
    element: json,
    didFindOccurrence: true
  };
};
var formatChildren = (patch, context, renumberIds) => renumberIds(patch.children.flatMap((c) => {
  var _c$writtenAs;
  return (_c$writtenAs = c.writtenAs) !== null && _c$writtenAs !== void 0 ? _c$writtenAs : c;
}).flatMap((c) => {
  const formatted = c.prepForXml(context);
  return formatted ? [toJson(stringifyXmlable(formatted)).elements[0]] : [];
}));
var replaceOccurrenceInParagraph = ({ paragraphElement, renderedParagraph, patchText, fromIndex, children, keepOriginalStyles }) => {
  replaceTokenInParagraphElement({
    paragraphElement,
    renderedParagraph,
    originalText: patchText,
    replacementText: SPLIT_TOKEN,
    fromIndex
  });
  const index = findRunElementIndexWithToken(paragraphElement, SPLIT_TOKEN);
  const runElementToBeReplaced = paragraphElement.elements[index];
  const { left, right } = splitRunElement(runElementToBeReplaced, SPLIT_TOKEN);
  const runProperties = runElementToBeReplaced.elements.find((e) => e.type === "element" && e.name === "w:rPr");
  const newRunElements = keepOriginalStyles && runProperties ? children.map((e) => withRunPropertiesOnRuns(e, runProperties)) : children;
  const patchedRightElement = runProperties ? _objectSpread2(_objectSpread2({}, right), {}, { elements: [runProperties, ...right.elements] }) : right;
  paragraphElement.elements.splice(index, 1, left, ...newRunElements, patchedRightElement);
  return index + 1 + newRunElements.length;
};
var withRunPropertiesOnRuns = (element, originalRunProperties) => {
  if (element.name === "w:r") return withRunProperties(element, originalRunProperties);
  return element.elements ? _objectSpread2(_objectSpread2({}, element), {}, { elements: element.elements.map((e) => withRunPropertiesOnRuns(e, originalRunProperties)) }) : element;
};
var withRunProperties = (runElement, originalRunProperties) => {
  const ownRunProperties = childElementsOf(runElement).find((e) => e.type === "element" && e.name === "w:rPr");
  if (!ownRunProperties) return _objectSpread2(_objectSpread2({}, runElement), {}, { elements: [originalRunProperties, ...childElementsOf(runElement)] });
  const ownPropertyNames = new Set(childElementsOf(ownRunProperties).map((e) => e.name));
  const properties = [...childElementsOf(originalRunProperties).filter((e) => !ownPropertyNames.has(e.name)), ...childElementsOf(ownRunProperties)];
  const mergedRunProperties = _objectSpread2(_objectSpread2({}, ownRunProperties), {}, { elements: [...properties].sort((a, b) => runPropertyRank(a) - runPropertyRank(b)) });
  return _objectSpread2(_objectSpread2({}, runElement), {}, { elements: childElementsOf(runElement).map((e) => e === ownRunProperties ? mergedRunProperties : e) });
};
var RUN_PROPERTY_ORDER = [
  "w:rStyle",
  "w:rFonts",
  "w:b",
  "w:bCs",
  "w:i",
  "w:iCs",
  "w:caps",
  "w:smallCaps",
  "w:strike",
  "w:dstrike",
  "w:outline",
  "w:shadow",
  "w:emboss",
  "w:imprint",
  "w:noProof",
  "w:snapToGrid",
  "w:vanish",
  "w:webHidden",
  "w:color",
  "w:spacing",
  "w:w",
  "w:kern",
  "w:position",
  "w:sz",
  "w:szCs",
  "w:highlight",
  "w:u",
  "w:effect",
  "w:bdr",
  "w:shd",
  "w:fitText",
  "w:vertAlign",
  "w:rtl",
  "w:cs",
  "w:em",
  "w:lang",
  "w:eastAsianLayout",
  "w:specVanish",
  "w:oMath",
  "w14:glow",
  "w14:shadow",
  "w14:reflection",
  "w14:textOutline",
  "w14:textFill",
  "w14:scene3d",
  "w14:props3d",
  "w14:ligatures",
  "w14:numForm",
  "w14:numSpacing",
  "w14:stylisticSets",
  "w14:cntxtAlts"
];
var runPropertyRank = (element) => {
  var _element$name;
  if (element.name === "w:rPrChange") return RUN_PROPERTY_ORDER.length + 1;
  const index = RUN_PROPERTY_ORDER.indexOf((_element$name = element.name) !== null && _element$name !== void 0 ? _element$name : "");
  return index === -1 ? RUN_PROPERTY_ORDER.length : index;
};
var childElementsOf = (element) => {
  var _element$elements;
  return (_element$elements = element.elements) !== null && _element$elements !== void 0 ? _element$elements : [];
};
var isInsideElementAtPath = (path, ancestorPath) => path.length > ancestorPath.length && ancestorPath.every((index, i2) => path[i2] === index);
var withoutNestedParagraphs = (paragraphs) => paragraphs.filter((paragraph) => !paragraphs.some((other) => isInsideElementAtPath(paragraph.pathToParagraph, other.pathToParagraph)));
var goToElementFromPath = (json, path) => {
  let element = json;
  for (let i2 = 1; i2 < path.length; i2++) {
    const index = path[i2];
    element = element.elements[index];
  }
  return element;
};
var goToParentElementFromPath = (json, path) => goToElementFromPath(json, path.slice(0, path.length - 1));
var getLastElementIndexFromPath = (path) => path[path.length - 1];
var formatter = new Formatter();
var STYLES_PATH = "word/styles.xml";
var REFERENCES = /* @__PURE__ */ new Set([
  "w:pStyle",
  "w:rStyle",
  "w:tblStyle",
  "w:basedOn",
  "w:next",
  "w:link"
]);
var idOf = (style) => {
  var _style$attributes;
  return String((_style$attributes = style.attributes) === null || _style$attributes === void 0 ? void 0 : _style$attributes["w:styleId"]);
};
var nameOf = (style) => {
  var _style$elements;
  const name = (_style$elements = style.elements) === null || _style$elements === void 0 || (_style$elements = _style$elements.find((element) => element.name === "w:name")) === null || _style$elements === void 0 || (_style$elements = _style$elements.attributes) === null || _style$elements === void 0 ? void 0 : _style$elements["w:val"];
  return name === void 0 ? void 0 : String(name).toLowerCase();
};
var childOf$1 = (element, name) => {
  var _element$elements;
  return element === null || element === void 0 || (_element$elements = element.elements) === null || _element$elements === void 0 ? void 0 : _element$elements.find((child2) => child2.name === name);
};
var sizeIn = (runProperties) => {
  var _childOf;
  const size = Number((_childOf = childOf$1(runProperties, "w:sz")) === null || _childOf === void 0 || (_childOf = _childOf.attributes) === null || _childOf === void 0 ? void 0 : _childOf["w:val"]);
  return Number.isNaN(size) ? void 0 : size;
};
var normalSizeOf = (elements) => {
  var _styles$find, _sizeIn;
  const styles = elements.filter((element) => element.name === "w:style");
  const normal = (_styles$find = styles.find((style) => idOf(style) === "Normal")) !== null && _styles$find !== void 0 ? _styles$find : styles.find((style) => {
    var _style$attributes2;
    return ((_style$attributes2 = style.attributes) === null || _style$attributes2 === void 0 ? void 0 : _style$attributes2["w:type"]) === "paragraph" && nameOf(style) === "normal";
  });
  const defaults = elements.find((element) => element.name === "w:docDefaults");
  return (_sizeIn = sizeIn(childOf$1(normal, "w:rPr"))) !== null && _sizeIn !== void 0 ? _sizeIn : sizeIn(childOf$1(childOf$1(defaults, "w:rPrDefault"), "w:rPr"));
};
var formatDefaultStyles = (context, normalSize) => new Map(Object.values(createDefaultStyles({ document: { run: { size: normalSize } } })).map((style) => toJson(stringifyXmlable(formatter.format(style, context))).elements[0]).filter((style) => style.name === "w:style").map((style) => [idOf(style), style]));
var patchStyles = (parts, createContext) => {
  var _parts$get;
  const templateElements = getFirstLevelElements((_parts$get = parts.get(STYLES_PATH)) !== null && _parts$get !== void 0 ? _parts$get : {}, "w:styles");
  const templateStyles = templateElements.filter((element) => element.name === "w:style");
  const templateIds = new Set(templateStyles.map(idOf));
  let defaultStyles;
  const defaultStyleOf = (id) => {
    var _defaultStyles;
    (_defaultStyles = defaultStyles) !== null && _defaultStyles !== void 0 || (defaultStyles = formatDefaultStyles(createContext(STYLES_PATH), normalSizeOf(templateElements)));
    return defaultStyles.get(id);
  };
  const missingIds = /* @__PURE__ */ new Set();
  const idsInDocument = /* @__PURE__ */ new Map();
  const findIdInDocument = (id) => {
    const style = templateIds.has(id) ? void 0 : defaultStyleOf(id);
    if (style === void 0) return id;
    const sameStyle = templateStyles.find((templateStyle) => {
      var _templateStyle$attrib, _style$attributes3;
      return ((_templateStyle$attrib = templateStyle.attributes) === null || _templateStyle$attrib === void 0 ? void 0 : _templateStyle$attrib["w:type"]) === ((_style$attributes3 = style.attributes) === null || _style$attributes3 === void 0 ? void 0 : _style$attributes3["w:type"]) && nameOf(templateStyle) === nameOf(style);
    });
    if (sameStyle !== void 0) return idOf(sameStyle);
    missingIds.add(id);
    return id;
  };
  const idInDocument = (id) => {
    if (!idsInDocument.has(id)) idsInDocument.set(id, findIdInDocument(id));
    return idsInDocument.get(id);
  };
  const withIdsInDocument = (element) => {
    var _element$name;
    if (REFERENCES.has((_element$name = element.name) !== null && _element$name !== void 0 ? _element$name : "")) return _objectSpread2(_objectSpread2({}, element), {}, { attributes: _objectSpread2(_objectSpread2({}, element.attributes), {}, { "w:val": idInDocument(String(element.attributes["w:val"])) }) });
    return element.elements === void 0 ? element : _objectSpread2(_objectSpread2({}, element), {}, { elements: element.elements.map(withIdsInDocument) });
  };
  const write = () => {
    const stylesPart = parts.get(STYLES_PATH);
    if (!stylesPart) return;
    const styles = getFirstLevelElements(stylesPart, "w:styles");
    const ids = new Set(styles.map(idOf));
    for (const id of missingIds) if (!ids.has(id)) {
      ids.add(id);
      styles.push(withIdsInDocument(defaultStyleOf(id)));
    }
  };
  return {
    use: (elements) => elements.map(withIdsInDocument),
    write
  };
};
var EMPTY = {
  type: PatchType.PARAGRAPH,
  children: []
};
var patchTableRows = ({ json, key, patch, delimiters: { start, end }, patchPlaceholder, renumberDrawings }) => {
  const fieldStart = `${start}${key}.`;
  for (const rows of findRowsToRepeat(json, fieldStart)) {
    const fields = fieldsIn(rows.elements, fieldStart, end);
    const copies = patch.rows.flatMap((row, index) => {
      const copy = {
        type: "element",
        name: "w:tbl",
        elements: [...index === 0 ? rows.elements.map(copyOf) : renumberDrawings(withoutIds(rows.elements))]
      };
      const fieldPatches = new Map(Object.entries(row).flatMap(([field, p]) => p === void 0 ? [] : [[field, p]]));
      for (const [field, fieldPatch] of fieldPatches) patchPlaceholder(copy, `${key}.${field}`, fieldPatch);
      for (const field of fields.filter((f) => !fieldPatches.has(f))) patchPlaceholder(copy, `${key}.${field}`, EMPTY);
      return copy.elements;
    });
    rows.parent.elements.splice(rows.parent.elements.indexOf(rows.elements[0]), rows.elements.length, ...copies);
    if (rows.table && !hasRows(rows.table.element)) rows.table.parent.elements.splice(rows.table.parent.elements.indexOf(rows.table.element), 1);
  }
};
var findRowsToRepeat = (json, fieldStart) => {
  const found = findLocationOfText(json, fieldStart).flatMap((paragraph) => {
    const row = rowHolding(json, paragraph.pathToParagraph);
    return row ? [row] : [];
  });
  const rows = found.filter((row) => !found.some((other) => isInside(row.path, other.path))).filter((row, index, all) => all.findIndex((other) => other.row === row.row) === index);
  return [...new Set(rows.map((row) => row.parent))].flatMap((parent) => {
    const siblingRows = parent.elements.filter((e) => e.name === "w:tr");
    const positions = rows.filter((row) => row.parent === parent).map((row) => siblingRows.indexOf(row.row)).sort((a, b) => a - b);
    const { table } = rows.find((row) => row.parent === parent);
    return positions.reduce((all, position) => {
      const previous = all[all.length - 1];
      return (previous === null || previous === void 0 ? void 0 : previous[previous.length - 1]) === position - 1 ? [...all.slice(0, -1), [...previous, position]] : [...all, [position]];
    }, []).map((group) => {
      const first = parent.elements.indexOf(siblingRows[group[0]]);
      const last = parent.elements.indexOf(siblingRows[group[group.length - 1]]);
      return {
        parent,
        table,
        elements: parent.elements.slice(first, last + 1)
      };
    });
  });
};
var rowHolding = (json, pathToParagraph) => {
  let element = json;
  let row;
  let table;
  for (let i2 = 1; i2 < pathToParagraph.length; i2++) {
    const child2 = element.elements[pathToParagraph[i2]];
    if (child2.name === "w:tbl") table = {
      element: child2,
      parent: element
    };
    if (child2.name === "w:tr") row = {
      parent: element,
      table,
      row: child2,
      path: pathToParagraph.slice(0, i2 + 1)
    };
    element = child2;
  }
  return row;
};
var isInside = (path, ancestorPath) => path.length > ancestorPath.length && ancestorPath.every((index, i2) => path[i2] === index);
var hasRows = (table) => {
  var _table$elements;
  return ((_table$elements = table.elements) !== null && _table$elements !== void 0 ? _table$elements : []).some((e) => e.name === "w:tr" || e.name !== "w:tblPr" && e.name !== "w:tblGrid" && hasRows(e));
};
var fieldsIn = (elements, fieldStart, end) => {
  const fields = findLocationOfText({ elements: [...elements] }, fieldStart).flatMap(({ text }) => text.split(fieldStart).slice(1).flatMap((after) => {
    const fieldEnd = after.indexOf(end);
    return fieldEnd > 0 ? [after.slice(0, fieldEnd)] : [];
  }));
  return [...new Set(fields)];
};
var copyOf = (element) => JSON.parse(JSON.stringify(element));
var ATTRIBUTES_TO_REMOVE = ["w14:paraId", "w14:textId"];
var ELEMENTS_TO_REMOVE = ["w:bookmarkStart", "w:bookmarkEnd"];
var withoutIds = (elements, parent) => elements.filter((e) => {
  var _e$name;
  return !ELEMENTS_TO_REMOVE.includes((_e$name = e.name) !== null && _e$name !== void 0 ? _e$name : "") && !((parent === null || parent === void 0 ? void 0 : parent.name) === "w:sdtPr" && e.name === "w:id");
}).map((e) => _objectSpread2(_objectSpread2(_objectSpread2({}, e), e.attributes === void 0 ? {} : { attributes: Object.fromEntries(Object.entries(e.attributes).filter(([name]) => !ATTRIBUTES_TO_REMOVE.includes(name))) }), e.elements === void 0 ? {} : { elements: [...withoutIds(e.elements, e)] }));
var isUtf16 = (bytes) => bytes[0] === 255 && bytes[1] === 254 || bytes[0] === 254 && bytes[1] === 255;
var readThemeColors = (files) => {
  var _find;
  const path = themePathOf(files, "word/document.xml");
  const theme = path === void 0 ? void 0 : (_find = [...files].find(([name]) => isSamePart(name, path))) === null || _find === void 0 ? void 0 : _find[1];
  return theme === void 0 || isUtf16(theme) ? void 0 : themeColorValues(readThemeColorValues(decodeUtf8(theme)));
};
var findSpacedPlaceholder = (text, from, { start, end }, isKey) => {
  for (let index = text.indexOf(start, from); index !== -1; index = text.indexOf(start, index + 1)) {
    const endIndex = text.indexOf(end, index + start.length);
    if (endIndex === -1) return;
    const content = text.slice(index + start.length, endIndex);
    const key = content.trim();
    if (key !== content && isKey(key)) return {
      index,
      placeholder: text.slice(index, endIndex + end.length),
      trimmed: `${start}${key}${end}`
    };
  }
};
var trimInText = (text, delimiters, isKey) => {
  let trimmed = text;
  for (let found = findSpacedPlaceholder(trimmed, 0, delimiters, isKey); found !== void 0; found = findSpacedPlaceholder(trimmed, found.index + found.trimmed.length, delimiters, isKey)) trimmed = `${trimmed.slice(0, found.index)}${found.trimmed}${trimmed.slice(found.index + found.placeholder.length)}`;
  return trimmed;
};
var paragraphsIn = (element) => {
  var _element$elements;
  return ((_element$elements = element.elements) !== null && _element$elements !== void 0 ? _element$elements : []).flatMap((child2) => [...child2.name === "w:p" ? [child2] : [], ...paragraphsIn(child2)]);
};
var trimInParagraph = (paragraph, delimiters, isKey) => {
  const render = () => renderParagraphNode({
    element: paragraph,
    index: 0,
    parent: void 0
  });
  for (let rendered = render(), found = findSpacedPlaceholder(rendered.text, 0, delimiters, isKey); found !== void 0; rendered = render(), found = findSpacedPlaceholder(rendered.text, found.index + found.trimmed.length, delimiters, isKey)) replaceTokenInParagraphElement({
    paragraphElement: paragraph,
    renderedParagraph: rendered,
    originalText: found.placeholder,
    replacementText: found.trimmed,
    fromIndex: found.index
  });
};
var trimPlaceholders = (json, { delimiters, textKeys, tableRowsKeys, drawingKeys }) => {
  const isTextKey = (key) => textKeys.has(key) || tableRowsKeys.some((tableRowsKey) => key.startsWith(`${tableRowsKey}.`));
  for (const paragraph of paragraphsIn(json)) trimInParagraph(paragraph, delimiters, isTextKey);
  const isDrawingKey = (key) => drawingKeys.has(key);
  for (const { properties } of findDrawings(json)) for (const name of ["descr", "title"]) {
    var _properties$attribute;
    const text = (_properties$attribute = properties.attributes) === null || _properties$attribute === void 0 ? void 0 : _properties$attribute[name];
    if (text !== void 0) properties.attributes[name] = trimInText(String(text), delimiters, isDrawingKey);
  }
};
var shapeTypeIdOf = (element) => {
  var _element$attributes;
  return element.name === "v:shapetype" && ((_element$attributes = element.attributes) === null || _element$attributes === void 0 ? void 0 : _element$attributes.id) !== void 0 ? String(element.attributes.id) : void 0;
};
var findShapeTypeIds = (element) => {
  var _element$elements;
  const id = shapeTypeIdOf(element);
  return [...id === void 0 ? [] : [id], ...((_element$elements = element.elements) !== null && _element$elements !== void 0 ? _element$elements : []).flatMap(findShapeTypeIds)];
};
var removeShapeTypesIn = (part) => {
  const idsInPart = new Set(findShapeTypeIds(part));
  const remove = (element) => {
    const id = shapeTypeIdOf(element);
    if (id !== void 0) {
      if (idsInPart.has(id)) return [];
      idsInPart.add(id);
      return [element];
    }
    return [element.elements === void 0 ? element : _objectSpread2(_objectSpread2({}, element), {}, { elements: element.elements.flatMap(remove) })];
  };
  return (elements) => elements.flatMap(remove);
};
var IMAGE_RELATIONSHIP = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image";
var CONTENT_TYPES = {
  png: "image/png",
  jpg: "image/jpeg",
  gif: "image/gif",
  bmp: "image/bmp",
  svg: "image/svg+xml"
};
var REGULAR_TYPES = [
  "png",
  "jpg",
  "gif",
  "bmp"
];
var EMUS_PER_PIXEL = 9525;
var SVG_EXTENSION = "{96DAC541-7B7A-43D3-8B79-37D633B846F1}";
var IMAGE_PROPERTIES_EXTENSION = "{BEBA8EAE-BF5A-486C-A8C5-ECC9F3942E4B}";
var childOf = (element, name) => {
  var _element$elements;
  return element === null || element === void 0 || (_element$elements = element.elements) === null || _element$elements === void 0 ? void 0 : _element$elements.find((child2) => child2.name === name);
};
var bytesOf = (data) => {
  const standardized = standardizeData(data);
  return ArrayBuffer.isView(standardized) ? new Uint8Array(standardized.buffer, standardized.byteOffset, standardized.byteLength) : new Uint8Array(standardized);
};
var imagePart = (type, data) => new PackagePart({
  folder: "media",
  name: "image",
  extension: type,
  contentType: CONTENT_TYPES[type],
  relationshipType: IMAGE_RELATIONSHIP,
  content: bytesOf(data)
});
var regularImagePart = (options, name) => {
  const type = imageTypeOf(options, name);
  if (!REGULAR_TYPES.includes(type)) throw new Error(`${name}: invalid type "${type}". Expected "png", "jpg", "gif", "bmp" or, with a fallback, "svg"`);
  return imagePart(type, options.data);
};
var NOT_PICTURES = /* @__PURE__ */ new Map([
  ["c:chart", "It is a chart, not a picture. Give a chart new data with ChartDataPatch from docx/charts"],
  ["cx:chart", "It is a chart, not a picture. Give a chart new data with ChartDataPatch from docx/charts"],
  ["wpg:wgp", "It is a group of drawings. Ungroup the picture in Word, and put the placeholder in its alt text"],
  ["wpc:wpc", "It is a drawing canvas. Move the picture out of it in Word, and put the placeholder in its alt text"],
  ["wps:wsp", "It is a shape, not a picture"]
]);
var pictureOf = (drawing, placeholder) => {
  var _graphicData$elements, _NOT_PICTURES$get;
  const graphicData = childOf(childOf(drawing, "a:graphic"), "a:graphicData");
  const picture = childOf(graphicData, "pic:pic");
  if (picture !== void 0) return picture;
  const content = graphicData === null || graphicData === void 0 || (_graphicData$elements = graphicData.elements) === null || _graphicData$elements === void 0 || (_graphicData$elements = _graphicData$elements.find((element) => element.type === "element")) === null || _graphicData$elements === void 0 ? void 0 : _graphicData$elements.name;
  throw new Error(`Can't patch the picture ${placeholder}. ${(_NOT_PICTURES$get = NOT_PICTURES.get(content !== null && content !== void 0 ? content : "")) !== null && _NOT_PICTURES$get !== void 0 ? _NOT_PICTURES$get : "It isn't a picture"}`);
};
var withExtensions = (blip, svgId) => {
  var _blip$elements, _list$elements;
  const elements = (_blip$elements = blip.elements) !== null && _blip$elements !== void 0 ? _blip$elements : [];
  const list = childOf(blip, "a:extLst");
  const svg = svgId === void 0 ? [] : [{
    type: "element",
    name: "a:ext",
    attributes: { uri: SVG_EXTENSION },
    elements: [{
      type: "element",
      name: "asvg:svgBlip",
      attributes: {
        "xmlns:asvg": "http://schemas.microsoft.com/office/drawing/2016/SVG/main",
        "r:embed": svgId
      }
    }]
  }];
  const extensions = [...((_list$elements = list === null || list === void 0 ? void 0 : list.elements) !== null && _list$elements !== void 0 ? _list$elements : []).filter((extension) => {
    var _extension$attributes;
    return extension.name === "a:ext" && ![SVG_EXTENSION, IMAGE_PROPERTIES_EXTENSION].includes(String((_extension$attributes = extension.attributes) === null || _extension$attributes === void 0 ? void 0 : _extension$attributes.uri).toUpperCase());
  }), ...svg];
  const newList = extensions.length === 0 ? [] : [_objectSpread2(_objectSpread2({}, list), {}, {
    type: "element",
    name: "a:extLst",
    elements: extensions
  })];
  return [...elements.filter((element) => element !== list), ...newList];
};
var setAltText = (properties, placeholder, altText) => {
  var _altText$description, _altText$title;
  const without = (name) => {
    var _properties$attribute;
    const text = (_properties$attribute = properties.attributes) === null || _properties$attribute === void 0 ? void 0 : _properties$attribute[name];
    return text === void 0 ? void 0 : String(text).split(placeholder).join("").trim();
  };
  const description = (_altText$description = altText === null || altText === void 0 ? void 0 : altText.description) !== null && _altText$description !== void 0 ? _altText$description : without("descr");
  const title = (_altText$title = altText === null || altText === void 0 ? void 0 : altText.title) !== null && _altText$title !== void 0 ? _altText$title : without("title");
  properties.attributes = Object.fromEntries(Object.entries(_objectSpread2(_objectSpread2({}, properties.attributes), {}, {
    descr: description || void 0,
    title: title || void 0
  })).filter(([, value]) => value !== void 0));
};
var resize = (element, { width, height }) => {
  if (element !== void 0) element.attributes = _objectSpread2(_objectSpread2({}, element.attributes), {}, {
    cx: Math.round(width * EMUS_PER_PIXEL),
    cy: Math.round(height * EMUS_PER_PIXEL)
  });
};
var ImagePatch = class extends DrawingPatch {
  /**
  * @throws If the image's type isn't one an `ImageRun` takes, an SVG image has no fallback, or the size isn't a number
  * of pixels greater than 0
  */
  constructor(options) {
    super();
    _defineProperty(this, "image", void 0);
    _defineProperty(this, "svg", void 0);
    _defineProperty(this, "transformation", void 0);
    _defineProperty(this, "altText", void 0);
    if (options.type === "svg") {
      if (options.fallback === void 0) throw new Error("ImagePatch: an SVG image needs a fallback, a PNG, JPEG, GIF or BMP image for applications that can't show SVG");
      this.image = regularImagePart(options.fallback, "ImagePatch fallback");
      this.svg = imagePart("svg", options.data);
    } else this.image = regularImagePart(options, "ImagePatch");
    const { transformation } = options;
    if (transformation !== void 0) {
      for (const name of ["width", "height"]) {
        const value = transformation[name];
        if (!(typeof value === "number" && value > 0 && Number.isFinite(value))) throw new Error(`ImagePatch: invalid ${name} ${String(value)}. Expected a number of pixels greater than 0`);
      }
      this.transformation = {
        width: transformation.width,
        height: transformation.height
      };
    }
    this.altText = options.altText && _objectSpread2({}, options.altText);
  }
  /**
  * Replaces the picture's image, and sets its size and alt text.
  *
  * @throws If the drawing isn't a picture, such as a chart, a shape or a group, or has no image
  */
  patch({ element, properties, placeholder, part }, template) {
    var _blip$attributes;
    const picture = pictureOf(element, placeholder);
    const fill = childOf(picture, "pic:blipFill");
    const blip = childOf(fill, "a:blip");
    if (fill === void 0 || blip === void 0) throw new Error(`Can't patch the picture ${placeholder}. It has no image: it has no a:blip`);
    const id = template.replaceRelatedPart(part, void 0, this.image);
    const svgId = this.svg && template.replaceRelatedPart(part, void 0, this.svg);
    blip.attributes = _objectSpread2({ "r:embed": id }, Object.fromEntries(Object.entries((_blip$attributes = blip.attributes) !== null && _blip$attributes !== void 0 ? _blip$attributes : {}).filter(([name]) => !/^[^:]+:(embed|link)$/.test(name))));
    blip.elements = [...withExtensions(blip, svgId)];
    fill.elements = fill.elements.filter((child2) => child2.name !== "a:srcRect");
    if (this.transformation !== void 0) {
      resize(childOf(element, "wp:extent"), this.transformation);
      resize(childOf(childOf(childOf(picture, "pic:spPr"), "a:xfrm"), "a:ext"), this.transformation);
    }
    setAltText(properties, placeholder, this.altText);
    const pictureProperties = childOf(childOf(picture, "pic:nvPicPr"), "pic:cNvPr");
    if (pictureProperties !== void 0) setAltText(pictureProperties, placeholder, this.altText);
  }
};
var assertValidPatch = (key, patch, { inTableRow }) => {
  if ((patch === null || patch === void 0 ? void 0 : patch.type) === PatchType.TABLE_ROWS && Array.isArray(patch.rows)) {
    for (const row of patch.rows) {
      if (typeof row !== "object" || row === null) throw new Error(`Invalid patch "${key}". Expected each of its rows to be an object of patches, by the name of their field`);
      for (const [field, fieldPatch] of Object.entries(row)) if (fieldPatch !== void 0) assertValidPatch(`${key}.${field}`, fieldPatch, { inTableRow: true });
    }
    return;
  }
  if (!((patch === null || patch === void 0 ? void 0 : patch.type) === PatchType.DRAWING ? !inTableRow && typeof patch.patch === "function" : (patch === null || patch === void 0 ? void 0 : patch.type) !== PatchType.TABLE_ROWS && Array.isArray(patch === null || patch === void 0 ? void 0 : patch.children))) throw new Error(`Invalid patch "${key}". Expected { type: PatchType.PARAGRAPH or PatchType.DOCUMENT, children: [...] }, ${inTableRow ? "or { type: PatchType.TABLE_ROWS, rows: [...] }" : "{ type: PatchType.TABLE_ROWS, rows: [...] }, or a drawing patch such as ImagePatch, or ChartDataPatch from docx/charts"}`);
};
var imageReplacer = new ImageReplacer();
var UTF16LE = new Uint8Array([255, 254]);
var UTF16BE = new Uint8Array([254, 255]);
var PATCHED_PART_ROOTS = /* @__PURE__ */ new Set([
  "w:document",
  "w:hdr",
  "w:ftr",
  "w:footnotes",
  "w:endnotes",
  "w:comments"
]);
var compareByteArrays = (a, b) => {
  if (a.length !== b.length) return false;
  for (let i2 = 0; i2 < a.length; i2++) if (a[i2] !== b[i2]) return false;
  return true;
};
var patchDocument = (function() {
  var _ref = _asyncToGenerator(function* ({ outputType, data, patches, keepOriginalStyles, placeholderDelimiters = {
    start: "{{",
    end: "}}"
  }, recursive = true, trimPlaceholders: trimPlaceholders$1 = false, footnotes, endnotes, numbering = { config: [] }, pageNumbers, properties }) {
    const zipContent = yield loadZip(data);
    const contexts = /* @__PURE__ */ new Map();
    const themeColors = readThemeColors(zipContent);
    const contentTypeOverrides = [];
    const file = {
      Media: new Media(),
      Numbering: new Numbering(numbering),
      Theme: themeColors && { Colors: themeColors },
      FootNotes: { View: { idOf: (reference, note, context) => carryNote("footnotes", reference, note, context) } },
      Endnotes: { View: { idOf: (reference, note, context) => carryNote("endnotes", reference, note, context) } },
      PackageParts: new PackageParts({ addOverride: (contentType, partName) => contentTypeOverrides.push({
        contentType,
        partName
      }) }, new Set([...zipContent.keys()].filter((path) => path.startsWith("word/")).map((path) => path.slice(5))))
    };
    const map = /* @__PURE__ */ new Map();
    const imageRelationshipAdditions = [];
    const relationshipAdditions = [];
    let hasMedia = false;
    const binaryContentMap = /* @__PURE__ */ new Map();
    if (!(placeholderDelimiters === null || placeholderDelimiters === void 0 ? void 0 : placeholderDelimiters.start.trim()) || !(placeholderDelimiters === null || placeholderDelimiters === void 0 ? void 0 : placeholderDelimiters.end.trim())) throw new Error("Both start and end delimiters must be non-empty strings.");
    const { start, end } = placeholderDelimiters;
    for (const [key, patch] of Object.entries(patches)) assertValidPatch(key, patch, { inTableRow: false });
    for (const [key, binaryValue] of zipContent) {
      var _json$elements;
      const startBytes = binaryValue.slice(0, 2);
      if (compareByteArrays(startBytes, UTF16LE) || compareByteArrays(startBytes, UTF16BE)) {
        binaryContentMap.set(key, binaryValue);
        continue;
      }
      if (!key.endsWith(".xml") && !key.endsWith(".rels")) {
        binaryContentMap.set(key, binaryValue);
        continue;
      }
      const json = toJson(decodeUtf8(binaryValue));
      const root = (_json$elements = json.elements) === null || _json$elements === void 0 ? void 0 : _json$elements.find((i2) => {
        var _i$name;
        return PATCHED_PART_ROOTS.has((_i$name = i2.name) !== null && _i$name !== void 0 ? _i$name : "");
      });
      if (root && root.attributes) {
        for (const ns of [
          "mc",
          "wp",
          "r",
          "w15",
          "m",
          "v",
          "o"
        ]) root.attributes[`xmlns:${ns}`] = DocumentAttributeNamespaces[ns];
        root.attributes["mc:Ignorable"] = `${root.attributes["mc:Ignorable"] || ""} w15`.trim();
      }
      map.set(key, json);
    }
    const renumberBookmarks = renumberBookmarksAvoiding([...map.values()].flatMap(findBookmarkIds));
    const renumberDrawings = renumberDrawingsAvoiding([...map.values()].flatMap(findDrawingIds));
    const viewWrappers = /* @__PURE__ */ new Map();
    const viewWrapperOf = (key) => {
      const existing = viewWrappers.get(key);
      if (existing) return existing;
      const viewWrapper = { Relationships: { addRelationship: (id, type, target, targetMode) => {
        relationshipAdditions.push({
          key,
          id,
          type,
          target,
          targetMode
        });
      } } };
      viewWrappers.set(key, viewWrapper);
      return viewWrapper;
    };
    const createContext = (key) => ({
      file,
      viewWrapper: viewWrapperOf(key),
      stack: []
    });
    const addContentTypeOverride = (contentType, partName) => {
      contentTypeOverrides.push({
        contentType,
        partName
      });
    };
    const styles = patchStyles(map, createContext);
    const lists = patchNumbering(file.Numbering, map, {
      createContext,
      addContentTypeOverride
    });
    const notes = patchNotes({
      footnotes,
      endnotes
    }, map, {
      createContext,
      addContentTypeOverride,
      renumberBookmarks,
      renumberDrawings,
      renumberLists: lists.renumber,
      useStyles: styles.use
    });
    const carryNote = (kind, reference, note, context) => context.viewWrapper === viewWrapperOf("word/document.xml") ? notes.carry(kind, reference, note) : void 0;
    if (trimPlaceholders$1) {
      const keysWhere = (test) => Object.entries(patches).flatMap(([key, patch]) => test(patch.type) ? [key] : []);
      const keys = {
        delimiters: {
          start,
          end
        },
        textKeys: new Set(keysWhere((type) => type !== PatchType.TABLE_ROWS && type !== PatchType.DRAWING)),
        tableRowsKeys: keysWhere((type) => type === PatchType.TABLE_ROWS),
        drawingKeys: new Set(keysWhere((type) => type === PatchType.DRAWING))
      };
      for (const [key, json] of map) if (key.startsWith("word/") && !key.endsWith(".rels")) trimPlaceholders(json, keys);
    }
    patchDrawings({
      parts: map,
      binaryParts: binaryContentMap,
      file,
      patches: Object.entries(patches).flatMap(([key, patch]) => patch.type === PatchType.DRAWING ? [[key, patch]] : []),
      delimiters: {
        start,
        end
      }
    }, createContext);
    const textPatches = Object.entries(patches).flatMap(([key, patch]) => patch.type === PatchType.DRAWING ? [] : [[key, patch]]);
    const patchesInOrder = [...textPatches.filter(([, patch]) => patch.type === PatchType.TABLE_ROWS), ...textPatches.filter(([, patch]) => patch.type !== PatchType.TABLE_ROWS)];
    for (const [key, json] of [...map]) {
      if (!key.startsWith("word/") || key.endsWith(".xml.rels")) continue;
      const context = createContext(key);
      contexts.set(key, context);
      const removeShapeTypes = removeShapeTypesIn(json);
      const patchPlaceholder = (element, patchKey, patchValue) => {
        if (patchValue.type === PatchType.TABLE_ROWS) {
          patchTableRows({
            json: element,
            key: patchKey,
            patch: patchValue,
            delimiters: {
              start,
              end
            },
            patchPlaceholder,
            renumberDrawings
          });
          return;
        }
        const hyperlinkRelationships = [];
        const { didFindOccurrence } = replacer({
          json: element,
          patch: _objectSpread2(_objectSpread2({}, patchValue), {}, { children: patchValue.children.flatMap((child2) => child2 instanceof Bookmark ? child2.writtenAs : [child2]).map((child2) => {
            if (child2 instanceof ExternalHyperlink) {
              const { target, anchor } = externalHyperlinkTarget(child2.options.link);
              const concreteHyperlink = new ConcreteHyperlink(child2.options.children, uniqueId(), anchor, child2.options.link);
              hyperlinkRelationships.push({
                key,
                id: concreteHyperlink.linkId,
                type: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink",
                target,
                targetMode: TargetModeType.EXTERNAL
              });
              return concreteHyperlink;
            } else return child2;
          }) }),
          patchText: `${start}${patchKey}${end}`,
          context,
          keepOriginalStyles,
          recursive,
          renumberIds: (elements) => styles.use(lists.renumber(notes.renumber(renumberBookmarks(renumberDrawings(removeShapeTypes(elements))))))
        });
        if (didFindOccurrence) relationshipAdditions.push(...hyperlinkRelationships);
      };
      for (const [patchKey, patchValue] of patchesInOrder) patchPlaceholder(json, patchKey, patchValue);
    }
    notes.write();
    lists.write();
    styles.write();
    for (const [key, json] of map) {
      if (!key.startsWith("word/") || key.endsWith(".xml.rels")) continue;
      const mediaDatas = imageReplacer.getMediaData(JSON.stringify(json), file.Media);
      if (mediaDatas.length > 0) {
        hasMedia = true;
        imageRelationshipAdditions.push({
          key,
          mediaDatas
        });
      }
    }
    for (const { key, mediaDatas } of imageRelationshipAdditions) {
      var _map$get;
      const relationshipKey = relationshipsPathOf(key);
      const relationshipsJson = (_map$get = map.get(relationshipKey)) !== null && _map$get !== void 0 ? _map$get : createRelationshipFile();
      map.set(relationshipKey, relationshipsJson);
      const index = getNextRelationshipIndex(relationshipsJson);
      const newJson = imageReplacer.replace(JSON.stringify(map.get(key)), mediaDatas, index);
      map.set(key, JSON.parse(newJson));
      for (let i2 = 0; i2 < mediaDatas.length; i2++) {
        const { fileName } = mediaDatas[i2];
        appendRelationship(relationshipsJson, index + i2, "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image", `media/${fileName}`);
      }
    }
    for (const { key, id, type, target, targetMode } of relationshipAdditions) {
      var _map$get2;
      const relationshipKey = relationshipsPathOf(key);
      const relationshipsJson = (_map$get2 = map.get(relationshipKey)) !== null && _map$get2 !== void 0 ? _map$get2 : createRelationshipFile();
      map.set(relationshipKey, relationshipsJson);
      appendRelationship(relationshipsJson, id, type, target, targetMode);
    }
    if (pageNumbers) yield fillTemplatePageNumbers(map, pageNumbers, binaryContentMap);
    if (properties) patchCoreProperties(map, binaryContentMap, properties, { addContentTypeOverride });
    const packageParts = xmlifyPackageParts(file, void 0);
    if (hasMedia || contentTypeOverrides.length > 0) {
      const contentTypesJson = map.get("[Content_Types].xml");
      if (!contentTypesJson) throw new Error("Could not find content types file");
      if (hasMedia) {
        appendContentType(contentTypesJson, "image/png", "png");
        appendContentType(contentTypesJson, "image/jpeg", "jpeg");
        appendContentType(contentTypesJson, "image/jpeg", "jpg");
        appendContentType(contentTypesJson, "image/bmp", "bmp");
        appendContentType(contentTypesJson, "image/gif", "gif");
        appendContentType(contentTypesJson, "image/svg+xml", "svg");
      }
      for (const { contentType, partName } of contentTypeOverrides) appendContentTypeOverride(contentTypesJson, contentType, partName);
    }
    return zipOutput(zipFiles([
      ...[...map].map(([key, value]) => [key, stringifyElement(value)]),
      ...binaryContentMap,
      ...file.Media.Array.map(({ data: media, fileName }) => [`word/media/${fileName}`, media]),
      ...packageParts.map(({ path, data: partData }) => [path, partData])
    ]), outputType, "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
  });
  return function patchDocument2(_x) {
    return _ref.apply(this, arguments);
  };
})();
var isSearched = (path) => path.startsWith("word/") && /\.(xml|rels)$/.test(path) && !path.endsWith(".xml.rels");
var patchDetector = (function() {
  var _ref = _asyncToGenerator(function* ({ data, trimPlaceholders: trimPlaceholders2 = false }) {
    const zipContent = yield loadZip(data, isSearched);
    const patches = /* @__PURE__ */ new Set();
    for (const [, value] of zipContent) {
      const json = toJson(decodeUtf8(value));
      [...traverse(json).map((p) => p.text), ...findDrawings(json).flatMap(({ properties }) => altTextOf(properties))].flatMap((text) => findPatchKeys(text)).map((patch) => trimPlaceholders2 ? patch.trim() : patch).filter((patch) => patch !== "").forEach((patch) => patches.add(patch));
    }
    return Array.from(patches);
  });
  return function patchDetector2(_x) {
    return _ref.apply(this, arguments);
  };
})();
var findPatchKeys = (text) => {
  var _text$match;
  const pattern = new RegExp("(?<=\\{\\{).+?(?=\\}\\})", "gs");
  return (_text$match = text.match(pattern)) !== null && _text$match !== void 0 ? _text$match : [];
};
export {
  AbstractNumbering,
  AlignmentType,
  AnnotationReference,
  Attributes,
  BaseXmlComponent,
  Body,
  Bookmark,
  BookmarkEnd,
  BookmarkStart,
  Border,
  BorderStyle,
  BuilderElement,
  CarriageReturn,
  CellMerge,
  CellMergeAttributes,
  CharacterSet,
  CheckBox,
  CheckBoxSymbolElement,
  CheckBoxUtil,
  Column,
  ColumnBreak,
  Comment,
  CommentRangeEnd,
  CommentRangeStart,
  CommentReference,
  Comments,
  CommentsExtended,
  CommentsIds,
  ConcreteHyperlink,
  ConcreteNumbering,
  ContinuationSeparator,
  DayLong,
  DayShort,
  DeletedTableCell,
  DeletedTableRow,
  DeletedTextRun,
  File as Document,
  DocumentAttributeNamespaces,
  DocumentAttributes,
  DocumentBackground,
  DocumentBackgroundAttributes,
  DocumentDefaults,
  DocumentGridType,
  DocumentProtectionType,
  Drawing,
  DrawingPatch,
  DropCapType,
  EMPTY_OBJECT,
  EditableRangeEnd,
  EditableRangeStart,
  EmphasisMarkType,
  EmptyElement,
  EndnoteIdReference,
  EndnotePosition,
  EndnoteReference,
  EndnoteReferenceRun,
  EndnoteReferenceRunAttributes,
  Endnotes,
  ExternalHyperlink,
  File,
  FileChild,
  FootNoteReferenceRunAttributes,
  FootNotes,
  Footer,
  FooterWrapper,
  FootnotePosition,
  FootnoteReference,
  FootnoteReferenceElement,
  FootnoteReferenceRun,
  FrameAnchorType,
  FrameWrap,
  GridSpan,
  Header,
  HeaderFooterReferenceType,
  HeaderFooterType,
  HeaderWrapper,
  HeadingLevel,
  HeightRule,
  HighlightColor,
  HorizontalPositionAlign,
  HorizontalPositionRelativeFrom,
  HpsMeasureElement,
  HyperlinkType,
  IgnoreIfEmptyXmlComponent,
  ImagePatch,
  ImageRun,
  ImportedRootElementAttributes,
  ImportedXmlComponent,
  InitializableXmlComponent,
  InsertedTableCell,
  InsertedTableRow,
  InsertedTextRun,
  InternalHyperlink,
  LastRenderedPageBreak,
  LeaderType,
  Level,
  LevelBase,
  LevelForOverride,
  LevelFormat,
  LevelOverride,
  LevelSuffix,
  LineNumberRestartFormat,
  LineRuleType,
  Math$1 as Math,
  MathAngledBrackets,
  MathCurlyBrackets,
  MathDegree,
  MathDenominator,
  MathFraction,
  MathFunction,
  MathFunctionName,
  MathFunctionProperties,
  MathIntegral,
  MathLimit,
  MathLimitLower,
  MathLimitUpper,
  MathNumerator,
  MathPreSubSuperScript,
  MathRadical,
  MathRadicalProperties,
  MathRoundBrackets,
  MathRun,
  MathSquareBrackets,
  MathSubScript,
  MathSubSuperScript,
  MathSum,
  MathSuperScript,
  Media,
  MonthLong,
  MonthShort,
  NextAttributeComponent,
  NoBreakHyphen,
  NonVisualDrawingProperties,
  NoteNumberRestart,
  NumberFormat,
  NumberProperties,
  NumberValueElement,
  NumberedItemReference,
  NumberedItemReferenceFormat,
  Numbering,
  OnOffElement,
  OverlapType,
  PackagePart,
  Packer,
  PageBorderDisplay,
  PageBorderOffsetFrom,
  PageBorderZOrder,
  PageBorders,
  PageBreak,
  PageBreakBefore,
  PageNumber,
  PageNumberElement,
  PageNumberSeparator,
  PageOrientation,
  PageReference,
  PageTextDirection,
  PageTextDirectionType,
  Paragraph,
  ParagraphProperties,
  ParagraphPropertiesChange,
  ParagraphPropertiesDefaults,
  ParagraphRunProperties,
  PatchType,
  PositionalTab,
  PositionalTabAlignment,
  PositionalTabLeader,
  PositionalTabRelativeTo,
  PrettifyType,
  RelativeHorizontalPosition,
  RelativeVerticalPosition,
  Run,
  RunProperties,
  RunPropertiesChange,
  RunPropertiesDefaults,
  SchemeColor,
  SectionProperties,
  SectionPropertiesChange,
  SectionType,
  Separator,
  SequentialIdentifier,
  ShadingType,
  SimpleField,
  SimpleMailMergeField,
  SoftHyphen,
  SpaceType,
  StringContainer,
  StringEnumValueElement,
  StringValueElement,
  StyleForCharacter,
  StyleForParagraph,
  StyleLevel,
  Styles,
  SymbolRun,
  TDirection,
  Tab,
  TabStopPosition,
  TabStopType,
  Table,
  TableAnchorType,
  TableBorders,
  TableCell,
  TableCellBorders,
  TableLayoutType,
  TableOfContents,
  TableProperties,
  TableRow,
  TableRowProperties,
  TableRowPropertiesChange,
  TextDirection,
  TextEffect,
  TextRun,
  TextWrappingSide,
  TextWrappingType,
  Textbox,
  ThematicBreak,
  Theme,
  TwoLinesInOneBrackets,
  UnderlineType,
  VerticalAlign,
  VerticalAlignSection,
  VerticalAlignTable,
  VerticalAnchor,
  VerticalMerge,
  VerticalMergeRevisionType,
  VerticalMergeType,
  VerticalPositionAlign,
  VerticalPositionRelativeFrom,
  WidthType,
  WpgGroupRun,
  WpsShapeRun,
  XmlAttributeComponent,
  XmlComponent,
  YearLong,
  YearShort,
  abstractNumUniqueNumericIdGen,
  bookmarkUniqueNumericId,
  bookmarkUniqueNumericIdGen,
  commentIdToParaId,
  concreteNumUniqueNumericIdGen,
  convertInchesToTwip,
  convertMillimetersToTwip,
  convertToXmlComponent,
  createAlignment,
  createBodyProperties,
  createBorderElement,
  createColumns,
  createDocumentGrid,
  createDotEmphasisMark,
  createEastAsianLayout,
  createEmphasisMark,
  createEndnoteProperties,
  createFitText,
  createFootnoteProperties,
  createFrameProperties,
  createHeaderFooterReference,
  createHorizontalPosition,
  createIndent,
  createLineNumberType,
  createMathAccentCharacter,
  createMathBase,
  createMathLimitLocation,
  createMathNAryProperties,
  createMathPreSubSuperScriptProperties,
  createMathSubScriptElement,
  createMathSubScriptProperties,
  createMathSubSuperScriptProperties,
  createMathSuperScriptElement,
  createMathSuperScriptProperties,
  createOutlineLevel,
  createPageMargin,
  createPageNumberType,
  createPageSize,
  createParagraphStyle,
  createRunFonts,
  createSectionType,
  createShading,
  createSimplePos,
  createSpacing,
  createStringElement,
  createTabStop,
  createTabStopItem,
  createTableFloatProperties,
  createTableLayout,
  createTableLook,
  createTableRowHeight,
  createTableWidthElement,
  createTransformation,
  createUnderline,
  createVerticalAlign,
  createVerticalPosition,
  createVmlShape,
  createWrapNone,
  createWrapSquare,
  createWrapThrough,
  createWrapTight,
  createWrapTopAndBottom,
  dateTimeValue,
  decimalNumber,
  docPropertiesUniqueNumericId,
  docPropertiesUniqueNumericIdGen,
  eighthPointMeasureValue,
  elementOf,
  encodeUtf8,
  fillPageNumbers,
  fillPartPageNumbers,
  fillSequenceNumbers,
  fitTextUniqueNumericId,
  hashedId,
  hexColorValue,
  hpsMeasureValue,
  isXmlComponent,
  longHexNumber,
  measurementOrPercentValue,
  patchDetector,
  patchDocument,
  percentageValue,
  pointMeasureValue,
  positiveUniversalMeasureValue,
  readTheme,
  sectionMarginDefaults,
  sectionPageSizeDefaults,
  shortHexNumber,
  signedHpsMeasureValue,
  signedTwipsMeasureValue,
  standardizeData,
  twipsMeasureValue,
  uCharHexNumber,
  uniqueId,
  uniqueNumericIdCreator,
  uniqueUuid,
  universalMeasureToTwips,
  universalMeasureValue,
  unsignedDecimalNumber
};
//# sourceMappingURL=docx.js.map
