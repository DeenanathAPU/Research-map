// script.js

// TODO: replace with your actual published CSV URL from Google Sheets
// Google Sheets -> File -> Share -> Publish to web -> Link -> CSV
const DATA_URL = "https://docs.google.com/spreadsheets/d/1p5InbZtKIlE32CoB_SVQIz9XBcP1OYp58pcEc3s2qac/edit?gid=1781289934#gid=1781289934";

let researchData = [];

// Utility: get URL query parameter (for profile page)
function getQueryParam(name) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(name);
}

// Load and parse CSV once
async function loadData() {
  if (researchData.length > 0) return researchData;

  const response = await fetch(DATA_URL);
  const csvText = await response.text();

  const parsed = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  researchData = parsed.data.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    programme: row.programme,
    state: row.state,
    district: row.district,
    village: row.village,
    latitude: parseFloat(row.latitude),
    longitude: parseFloat(row.longitude),
    theme: row.theme,
    title: row.title,
    abstract: row.abstract,
    supervisor: row.supervisor,
    methods: row.methods,
    year: row.year,
    photo_url: row.photo_url,
    pdf_url: row.pdf_url,
  }));

  return researchData;
}

/* ---------------- INDEX PAGE ---------------- */

function initIndexPage() {
  const totalEl = document.getElementById("stat-total-researchers");
  const statesEl = document.getElementById("stat-total-states");
  const themesEl = document.getElementById("stat-total-themes");

  const total = researchData.length;

  const states = new Set(
    researchData
      .map((d) => (d.state || "").trim())
      .filter((val) => val !== "")
  );
  const themes = new Set(
    researchData
      .map((d) => (d.theme || "").trim())
      .filter((val) => val !== "")
  );

  if (totalEl) totalEl.textContent = total || "–";
  if (statesEl) statesEl.textContent = states.size || "–";
  if (themesEl) themesEl.textContent = themes.size || "–";
}

/* ---------------- MAP PAGE ---------------- */

function initMapPage() {
  const mapContainer = document.getElementById("map");
  if (!mapContainer) return;

  // Default centre on India
  const map = L.map("map").setView([22.5, 79], 5);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution: "&copy; OpenStreetMap contributors",
  }).addTo(map);

  const markers = [];
  researchData.forEach((d) => {
    if (!d.latitude || !d.longitude || isNaN(d.latitude) || isNaN(d.longitude)) {
      return;
    }

    const popupHtml = `
      <div>
        <strong>${d.name || "Unnamed"}</strong><br/>
        <em>${d.title || d.theme || ""}</em><br/>
        ${(d.village || "") && (d.district || "") ? `${d.village}, ${d.district}<br/>` : ""}
        ${d.state || ""}<br/>
        ${
          d.id
            ? `<a href="profile.html?id=${encodeURIComponent(
                d.id
              )}">View profile</a>`
            : ""
        }
      </div>
    `;

    const marker = L.marker([d.latitude, d.longitude]).addTo(map);
    marker.bindPopup(popupHtml);
    markers.push(marker);
  });

  // Fit bounds to markers
  if (markers.length > 0) {
    const group = L.featureGroup(markers);
    map.fitBounds(group.getBounds().pad(0.2));
  }
}

/* ---------------- DIRECTORY PAGE ---------------- */

function initDirectoryPage() {
  const tbody = document.getElementById("directory-body");
  const searchInput = document.getElementById("search-input");
  const stateSelect = document.getElementById("filter-state");
  const themeSelect = document.getElementById("filter-theme");

  if (!tbody) return;

  // Populate filter dropdowns
  const states = Array.from(
    new Set(
      researchData
        .map((d) => (d.state || "").trim())
        .filter((v) => v !== "")
    )
  ).sort();

  const themes = Array.from(
    new Set(
      researchData
        .map((d) => (d.theme || "").trim())
        .filter((v) => v !== "")
    )
  ).sort();

  states.forEach((s) => {
    const opt = document.createElement("option");
    opt.value = s;
    opt.textContent = s;
    stateSelect.appendChild(opt);
  });

  themes.forEach((t) => {
    const opt = document.createElement("option");
    opt.value = t;
    opt.textContent = t;
    themeSelect.appendChild(opt);
  });

  function renderRows() {
    const query = (searchInput.value || "").toLowerCase();
    const selectedState = stateSelect.value;
    const selectedTheme = themeSelect.value;

    tbody.innerHTML = "";

    researchData.forEach((d) => {
      const name = d.name || "";
      const theme = d.theme || "";
      const title = d.title || "";
      const state = d.state || "";
      const district = d.district || "";
      const supervisor = d.supervisor || "";

      // Filter by search
      const combinedText = `${name} ${theme} ${title} ${state} ${district} ${supervisor}`.toLowerCase();
      if (query && !combinedText.includes(query)) return;

      // Filter by state
      if (selectedState && state !== selectedState) return;

      // Filter by theme
      if (selectedTheme && theme !== selectedTheme) return;

      const tr = document.createElement("tr");

      const nameCell = document.createElement("td");
      if (d.id) {
        const link = document.createElement("a");
        link.href = `profile.html?id=${encodeURIComponent(d.id)}`;
        link.textContent = name || "Unnamed";
        nameCell.appendChild(link);
      } else {
        nameCell.textContent = name || "Unnamed";
      }

      const titleCell = document.createElement("td");
      titleCell.textContent = title || theme || "";

      const locCell = document.createElement("td");
      locCell.textContent = [d.village, d.district, d.state]
        .filter((v) => v && v.trim() !== "")
        .join(", ");

      const supCell = document.createElement("td");
      supCell.textContent = supervisor || "";

      tr.appendChild(nameCell);
      tr.appendChild(titleCell);
      tr.appendChild(locCell);
      tr.appendChild(supCell);

      tbody.appendChild(tr);
    });
  }

  renderRows();

  searchInput.addEventListener("input", renderRows);
  stateSelect.addEventListener("change", renderRows);
  themeSelect.addEventListener("change", renderRows);
}

/* ---------------- PROFILE PAGE ---------------- */

function initProfilePage() {
  const container = document.getElementById("profile-container");
  if (!container) return;

  const id = getQueryParam("id");
  if (!id) {
    container.innerHTML = "<p>No researcher ID provided.</p>";
    return;
  }

  const d = researchData.find((r) => (r.id || "").toString() === id.toString());

  if (!d) {
    container.innerHTML = "<p>Researcher not found.</p>";
    return;
  }

  const photoHtml = d.photo_url
    ? `<img src="${d.photo_url}" alt="${d.name}" class="profile-photo" />`
    : `<div class="profile-photo"></div>`;

  container.innerHTML = `
    <div class="profile-header">
      ${photoHtml}
      <div class="profile-main">
        <h2>${d.name || "Unnamed Researcher"}</h2>
        <p class="meta"><strong>Title:</strong> ${d.title || d.theme || ""}</p>
        <p class="meta"><strong>Theme:</strong> ${d.theme || "—"}</p>
        <p class="meta">
          <strong>Location:</strong> 
          ${[d.village, d.district, d.state].filter((v) => v && v.trim() !== "").join(", ") || "—"}
        </p>
        <p class="meta"><strong>Supervisor:</strong> ${d.supervisor || "—"}</p>
        <p class="meta"><strong>Year:</strong> ${d.year || "—"}</p>
        ${d.email ? `<p class="meta"><strong>Email:</strong> ${d.email}</p>` : ""}
      </div>
    </div>

    <div class="profile-section">
      <h3>Abstract</h3>
      <p>${d.abstract || "No abstract provided yet."}</p>
    </div>

    <div class="profile-section">
      <h3>Methods</h3>
      <p>${d.methods || "Not specified."}</p>
    </div>

    ${
      d.pdf_url
        ? `<div class="profile-section">
             <h3>Project Document</h3>
             <p><a href="${d.pdf_url}" target="_blank" rel="noopener noreferrer">View / Download PDF</a></p>
           </div>`
        : ""
    }
  `;
}

/* ---------------- MAIN ENTRY ---------------- */

document.addEventListener("DOMContentLoaded", async () => {
  try {
    await loadData();
  } catch (err) {
    console.error("Error loading data:", err);
  }

  const page = document.body.dataset.page;

  if (page === "index") {
    initIndexPage();
  } else if (page === "map") {
    initMapPage();
  } else if (page === "directory") {
    initDirectoryPage();
  } else if (page === "profile") {
    initProfilePage();
  }
});


