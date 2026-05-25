

chrome.storage.local.get("resultsData", ({ resultsData }) => {
    if (!resultsData) return;

    renderWeekly(resultsData.weeklyHours);
    renderDaily(resultsData.dailyHours);
});

function formatDateSafe(dayStr) {
    const [year, month, day] = dayStr.split("-");
    return `${day}/${month}/${year}`;
}

function renderWeekly(data) {
    const container = document.getElementById("weekly");
    const sorted = [...data].sort((a, b) => b.firstDay.localeCompare(a.firstDay));

    sorted.forEach(item => {
        const div = document.createElement("div");
        const label = `${formatDateSafe(item.firstDay)} - ${formatDateSafe(item.lastDay)}`;
        div.textContent = `${label}: ${item.hours}h ${item.minutes}m`;
        container.appendChild(div);
    });
}
function renderDaily(data) {
    const container = document.getElementById("daily");

    if (!data || data.length === 0) {
        container.innerHTML = "<p>No hay datos diarios</p>";
        return;
    }

    const table = document.createElement("table");
    table.border = "1";
    table.style.borderCollapse = "collapse";

    table.innerHTML = `
    <thead>
      <tr>
        <th>Día</th>
        <th>Horas</th>
        <th>Minutos</th>
        <th>Total (min)</th>
      </tr>
    </thead>
    <tbody>
      ${[...data].sort((a, b) => {
        const [ay, am, ad] = a.day.split("-").map(Number);
        const [by, bm, bd] = b.day.split("-").map(Number);
        return new Date(by, bm - 1, bd) - new Date(ay, am - 1, ad);
    }).map(item => `
        <tr>
          <td>${formatDateSafe(item.day)}</td>
          <td>${item.hours}</td>
          <td>${item.minutes}</td>
          <td>${item.totalMinutes}</td>
        </tr>
      `).join("")}
    </tbody>
  `;

    container.innerHTML = "";
    container.appendChild(table);
}