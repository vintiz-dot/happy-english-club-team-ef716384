import DOMPurify from 'dompurify';

// Force all <a> tags to open in a new tab safely.
// Hook is registered once at module load.
let hookRegistered = false;
const registerLinkHook = () => {
  if (hookRegistered) return;
  hookRegistered = true;
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName === 'A') {
      node.setAttribute('target', '_blank');
      node.setAttribute('rel', 'noopener noreferrer');
    }
  });
};

/**
 * Sanitizes HTML content to prevent XSS attacks.
 * Allows common formatting tags used in rich text editors.
 * Forces all links to open in a new tab.
 */
export const sanitizeHtml = (html: string): string => {
  registerLinkHook();
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 's', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li', 'a', 'blockquote', 'code', 'pre', 'span', 'div', 'sub', 'sup'
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'style'],
    ALLOW_DATA_ATTR: false,
  });
};
