import sanitizeHtml from "sanitize-html";

/**
 * Safely converts input to string and removes all HTML tags.
 * Used for plain text fields to prevent any HTML/Script injection.
 */
export function sanitizePlainText(input: unknown): string {
  if (input === null || input === undefined) return "";
  const str = String(input);

  return sanitizeHtml(str, {
    allowedTags: [], // Strip everything
    allowedAttributes: {},
  });
}

/**
 * Sanitizes input while allowing a limited set of safe formatting tags (b, i, strong, em, ul, li, br, p).
 * Automatically removes scripts, event handlers, style tags, and prevents javascript: URLs.
 */
export function sanitizeRichTextOrHtml(input: unknown): string {
  if (input === null || input === undefined) return "";
  const str = String(input);

  return sanitizeHtml(str, {
    allowedTags: ["b", "i", "strong", "em", "ul", "li", "br", "p"],
    allowedAttributes: {}, // Disallow all attributes for maximum security
    allowedSchemes: ["http", "https", "mailto"], // Explicitly block javascript: etc.
  });
}

/**
 * Sanitizes creative HTML content (emails, etc.) allowing a broader range of tags
 * necessary for rendering complex layouts while still stripping scripts and dangerous attributes.
 */
export function sanitizeCreativeHtml(input: unknown): string {
  if (input === null || input === undefined) return "";
  const str = String(input);

  return sanitizeHtml(str, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat([
      "img",
      "style",
      "table",
      "thead",
      "tbody",
      "tfoot",
      "tr",
      "th",
      "td",
      "center",
      "span",
      "div",
      "section",
      "header",
      "footer",
      "main",
      "article",
      "aside",
    ]),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      "*": [
        "style",
        "class",
        "id",
        "align",
        "valign",
        "width",
        "height",
        "bgcolor",
        "cellpadding",
        "cellspacing",
        "border",
      ],
      img: ["src", "alt", "width", "height", "style"],
      a: ["href", "name", "target", "style"],
    },
    allowedStyles: {
      "*": {
        // Allow common CSS properties used in email templates
        color: [
          /^#(?:[0-9a-fA-F]{3}){1,2}$/,
          /^rgb\(\d+,\s*\d+,\s*\d+\)$/,
          /^rgba\(\d+,\s*\d+,\s*\d+,\s*[\d.]+\)$/,
          /^[a-z]+$/i,
        ],
        "background-color": [
          /^#(?:[0-9a-fA-F]{3}){1,2}$/,
          /^rgb\(\d+,\s*\d+,\s*\d+\)$/,
          /^rgba\(\d+,\s*\d+,\s*\d+,\s*[\d.]+\)$/,
          /^[a-z]+$/i,
        ],
        "font-family": [/.*/],
        "font-size": [/.*/],
        "font-weight": [/.*/],
        "text-align": [/^left$/, /^right$/, /^center$/, /^justify$/],
        "text-decoration": [/.*/],
        "line-height": [/.*/],
        margin: [/.*/],
        padding: [/.*/],
        border: [/.*/],
        width: [/.*/],
        height: [/.*/],
        display: [/.*/],
      },
    },
    allowedSchemes: ["http", "https", "mailto", "tel", "data"], // Allow data URIs for embedded images
    allowProtocolRelative: true,
  });
}
