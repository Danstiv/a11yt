"use strict";

const status = document.getElementById("status");
const list = document.getElementById("features");

// A successful save isn't announced: the checkbox changing state is already the
// confirmation. A failure has to be reported, though, or the checkbox would
// silently misrepresent what is stored, so it is also reverted.
async function save(feature, checkbox) {
  try {
    await chrome.storage.sync.set({ [feature.id]: checkbox.checked });
    status.textContent = "";
  } catch {
    checkbox.checked = !checkbox.checked;
    status.textContent = `${feature.title} could not be saved.`;
  }
}

function render(feature, checked) {
  const item = document.createElement("div");
  item.className = "feature";

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.id = `feature-${feature.id}`;
  checkbox.checked = checked;
  // The description goes in aria-describedby rather than inside the label: as
  // part of the accessible name it would be re-read in full on every focus
  // move, with no way to skip it.
  checkbox.setAttribute("aria-describedby", `feature-${feature.id}-description`);
  checkbox.addEventListener("change", () => save(feature, checkbox));

  const label = document.createElement("label");
  label.htmlFor = checkbox.id;
  label.textContent = feature.title;

  const description = document.createElement("p");
  description.id = `feature-${feature.id}-description`;
  description.className = "feature-description";
  description.textContent = feature.description;

  item.append(checkbox, " ", label, description);
  return item;
}

(async () => {
  const defaults = featureDefaults();
  let settings;
  try {
    settings = await chrome.storage.sync.get(defaults);
  } catch {
    settings = defaults;
  }

  list.append(
    ...FEATURES.map((feature) => render(feature, Boolean(settings[feature.id]))),
  );
})();
