"use strict";

// Single source of truth shared by the content script and the settings page.
//
// Each feature has a selector matching the elements to patch and an apply()
// callback that performs the change. Selectors include the "bad" attribute
// value so already-fixed elements stop matching and aren't touched again.
//
// id is the chrome.storage.sync key and is a permanent contract: renaming one
// silently resets that feature to its default and orphans the stored value.
// attributes lists the attributes the feature needs the observer to watch, so
// the attribute filter can be narrowed to the enabled features only.
const FEATURES = [
  {
    id: "feedLinks",
    title: "Make feed video links reachable",
    description:
      "Removes the redundant label from video headings in the feed so the link inside can be focused and opened in a new tab with Ctrl+Shift+Enter.",
    defaultEnabled: true,
    // Feed video headings carry a redundant aria-label that duplicates the text
    // of the link inside them. Because of it, a screen reader announces the h3
    // as a single text node and doesn't expose the nested <a>, so the link
    // can't be focused (e.g. opened in a new tab via Ctrl+Shift+Enter). Remove
    // the aria-label from the h3 while keeping it on the link itself.
    selector: "h3.ytLockupMetadataViewModelHeadingReset[aria-label]",
    attributes: ["aria-label"],
    apply: (el) => el.removeAttribute("aria-label"),
  },
  {
    id: "chapterAnnouncements",
    title: "Silence chapter title announcements",
    description:
      "Stops the player from announcing each new chapter title, so it no longer interrupts you while watching.",
    defaultEnabled: false,
    // The player's chapter title is an aria-live region, so every time the
    // chapter changes the screen reader interrupts playback to announce the new
    // title. Turn the live region off so it stays silent.
    selector: 'div.ytp-chapter-title-content[aria-live="polite"]',
    attributes: ["aria-live"],
    apply: (el) => el.setAttribute("aria-live", "off"),
  },
  {
    id: "playButtonLabel",
    title: "Shorten the play/pause button label",
    description:
      "Gives the play/pause button a short, clear label that matches its current state.",
    defaultEnabled: false,
    // The play/pause button has an unwanted aria-keyshortcuts and a verbose
    // aria-label ("Press k to activate the Play button"). Drop the shortcut and
    // replace the label with the concise tooltip title. data-tooltip-title
    // changes as the play state toggles, so re-sync the label on each change
    // (guarded to avoid feeding our own mutation back into the observer).
    selector: "button.ytp-play-button",
    attributes: ["data-tooltip-title", "aria-keyshortcuts"],
    apply: (el) => {
      if (el.hasAttribute("aria-keyshortcuts")) {
        el.removeAttribute("aria-keyshortcuts");
      }
      const tooltip = el.getAttribute("data-tooltip-title");
      if (tooltip && el.getAttribute("aria-label") !== tooltip) {
        el.setAttribute("aria-label", tooltip);
      }
    },
  },
];

// Defaults for chrome.storage.sync.get(). Flat per-feature keys, not one nested
// object: get() only substitutes defaults for missing top-level keys and never
// deep-merges, so a nested object would make any feature added after the user's
// first save read as undefined instead of its defaultEnabled.
function featureDefaults() {
  return Object.fromEntries(FEATURES.map((f) => [f.id, f.defaultEnabled]));
}
