"use strict";

// The features themselves live in features.js, which the manifest loads before
// this file (scripts of one content_scripts entry run in order and share the
// same isolated-world scope, so FEATURES is visible here).

function fixElement(el, features) {
  for (const feature of features) {
    if (el.matches(feature.selector)) {
      feature.apply(el);
    }
  }
}

function fixTree(root, features) {
  if (root.nodeType !== Node.ELEMENT_NODE) {
    return;
  }
  fixElement(root, features);
  for (const feature of features) {
    root.querySelectorAll(feature.selector).forEach((el) => feature.apply(el));
  }
}

// Settings are read once at startup; changes only take effect once the page is
// reloaded. Awaiting storage costs a few milliseconds of the document_start
// head start, which is harmless: the only timing-sensitive feature is the
// chapter title live region, and the player doesn't exist that early anyway.
(async () => {
  const defaults = featureDefaults();
  let settings;
  try {
    settings = await chrome.storage.sync.get(defaults);
  } catch {
    // Reading can fail when the extension is reloaded or updated while a
    // YouTube tab is open ("Extension context invalidated"). Fall back to the
    // defaults so we degrade gracefully instead of applying nothing at all.
    settings = defaults;
  }

  const enabled = FEATURES.filter((feature) => settings[feature.id]);
  if (enabled.length === 0) {
    return;
  }

  // Handle elements already present on the page, including anything added while
  // the settings were being read.
  fixTree(document.documentElement, enabled);

  // YouTube is an SPA and content loads dynamically, so watch for newly added
  // nodes and for the watched attributes appearing on existing ones.
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === "attributes") {
        if (mutation.target.matches) {
          fixElement(mutation.target, enabled);
        }
        continue;
      }
      mutation.addedNodes.forEach((node) => fixTree(node, enabled));
    }
  });

  // Observing starts in the same synchronous run as the full pass above, so no
  // mutation can slip through in between.
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: [...new Set(enabled.flatMap((f) => f.attributes))],
  });
})();
