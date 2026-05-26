

chrome.storage.local.get("resultsData", ({ resultsData }) => {
    if (!resultsData) return;

    renderToday(resultsData.todayData);
    renderWeekly(resultsData.weeklyHours);
    renderDaily(resultsData.dailyHours);
});

function formatDateSafe(dayStr) {
    const [year, month, day] = dayStr.split("-");
    return `${day}/${month}/${year}`;
}

function renderToday(data) {
    const container = document.getElementById("today");

    if (!data || data.status === "no_data") {
        container.innerHTML = "<p>Sin datos para hoy</p>";
        return;
    }

    if (data.status === "entry_only") {
        container.innerHTML = `<p>Entrada a las ${data.entryTime}. Llevas ${data.hours}h ${data.minutes}m trabajadas (en curso)</p>`;
        return;
    }

    container.innerHTML = `<p>Entrada a las ${data.entryTime}. Total: ${data.hours}h ${data.minutes}m</p>`;
}

function renderWeekly(data) {
    const container = document.getElementById("weekly");
    const sorted = [...data].sort((a, b) => b.firstDay.localeCompare(a.firstDay));

    const table = document.createElement("table");
    table.innerHTML = `
    <thead><tr><th>Semana</th><th>Horas</th></tr></thead>
    <tbody>
      ${sorted.map(item => `
        <tr>
          <td>${formatDateSafe(item.firstDay)} - ${formatDateSafe(item.lastDay)}</td>
          <td>${item.hours}h ${item.minutes}m</td>
        </tr>
      `).join("")}
    </tbody>
  `;
    container.appendChild(table);
}
function renderDaily(data) {
    const container = document.getElementById("daily");

    if (!data || data.length === 0) {
        container.innerHTML = "<p>No hay datos diarios</p>";
        return;
    }

    const sorted = [...data].sort((a, b) => b.day.localeCompare(a.day));

    const table = document.createElement("table");

    const rows = sorted.map(item => {
        const dayId = "day-" + item.day.replace(/-/g, "_");
        const iconGlyphs = [];
        if (item.hadDuplicates) iconGlyphs.push("🔁");
        if (item.hadIntermediates) iconGlyphs.push("✂️");
        const icons = iconGlyphs.length > 0
            ? `<span class="drilldown-icon" data-target="${dayId}" style="cursor:pointer">${iconGlyphs.join(" ")}</span>`
            : "";

        let detailContent = "";
        if (item.hadDuplicates && item.duplicatesList.length > 0) {
            detailContent += `<strong>Duplicados eliminados:</strong> ${item.duplicatesList.map(d => `${d.type} ${d.time}`).join(", ")}<br>`;
        }
        if (item.hadIntermediates && item.intermediatesList.length > 0) {
            detailContent += `<strong>Fichajes descartados:</strong> ${item.intermediatesList.map(d => `${d.type} ${d.time}`).join(", ")}`;
        }

        const detailRow = detailContent
            ? `<tr id="${dayId}" style="display:none"><td colspan="3" style="font-size:0.9em;color:#555;font-style:italic">${detailContent}</td></tr>`
            : "";

        return `
        <tr>
          <td>${formatDateSafe(item.day)}</td>
          <td>${item.hours}h ${item.minutes}m</td>
          <td>${icons}</td>
        </tr>
        ${detailRow}`;
    }).join("");

    table.innerHTML = `
    <thead><tr><th>Día</th><th>Horas</th><th></th></tr></thead>
    <tbody>${rows}</tbody>
    `;

    table.querySelectorAll(".drilldown-icon").forEach(icon => {
        icon.addEventListener("click", () => {
            const target = document.getElementById(icon.dataset.target);
            if (target) target.style.display = target.style.display === "none" ? "" : "none";
        });
    });

    container.appendChild(table);
}