"use strict";

// Each fix has a selector matching the elements to patch and an apply()
// callback that performs the change. Selectors include the "bad" attribute
// value so already-fixed elements stop matching and aren't touched again.
const FIXES = [
  {
    // Feed video headings carry a redundant aria-label that duplicates the text
    // of the link inside them. Because of it, a screen reader announces the h3
    // as a single text node and doesn't expose the nested <a>, so the link
    // can't be focused (e.g. opened in a new tab via Ctrl+Shift+Enter). Remove
    // the aria-label from the h3 while keeping it on the link itself.
    selector: "h3.ytLockupMetadataViewModelHeadingReset[aria-label]",
    apply: (el) => el.removeAttribute("aria-label"),
  },
  {
    // The player's chapter title is an aria-live region, so every time the
    // chapter changes the screen reader interrupts playback to announce the new
    // title. Turn the live region off so it stays silent.
    selector: 'div.ytp-chapter-title-content[aria-live="polite"]',
    apply: (el) => el.setAttribute("aria-live", "off"),
  },
];

const ATTRIBUTE_FILTER = ["aria-label", "aria-live"];

function fixElement(el) {
  for (const fix of FIXES) {
    if (el.matches(fix.selector)) {
      fix.apply(el);
    }
  }
}

function fixTree(root) {
  if (root.nodeType !== Node.ELEMENT_NODE) {
    return;
  }
  fixElement(root);
  for (const fix of FIXES) {
    root.querySelectorAll(fix.selector).forEach(fix.apply);
  }
}

// Handle elements already present on the page.
fixTree(document.documentElement);

// YouTube is an SPA and content loads dynamically, so watch for newly added
// nodes and for the watched attributes appearing on existing ones.
const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    if (mutation.type === "attributes") {
      if (mutation.target.matches) {
        fixElement(mutation.target);
      }
      continue;
    }
    mutation.addedNodes.forEach(fixTree);
  }
});

observer.observe(document.documentElement, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ATTRIBUTE_FILTER,
});
