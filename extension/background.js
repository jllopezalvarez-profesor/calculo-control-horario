chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: "processTimeEntries",
        title: "Calcular fichajes",
        contexts: ["page"],
        documentUrlPatterns: ["https://app.control-de-horario.com/*"]
    });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "processTimeEntries") {
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            function: processTimeEntries
        });
    }
});

chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "OPEN_RESULTS_TAB") {
        chrome.tabs.create({
            url: chrome.runtime.getURL("results.html")
        });
    }
});

function processTimeEntries() {

    function parseDateTime(dateStr, timeStr) {
        const [d, m, yRaw] = dateStr.split("/");

        // FIX: asegurar año correcto (2026 en vez de 1926)
        let year = Number(yRaw);

        if (year < 100) {
            year += 2000;
        }

        const [hh, mm, ss = "00"] = timeStr.split(":");

        return new Date(
            year,
            Number(m) - 1,
            Number(d),
            Number(hh),
            Number(mm),
            Number(ss)
        );
    }

    function getDayKey(date) {
        return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
    }

    function cleanTimeEntries(entries) {
        const byDay = new Map();

        // 1. Agrupar por día
        for (const item of entries) {
            const day = getDayKey(item.datetime);

            if (!byDay.has(day)) {
                byDay.set(day, []);
            }

            byDay.get(day).push(item);
        }

        const cleaned = [];
        const errors = [];
        const adaptations = new Map();

        // 2. Procesar cada día
        for (const [day, items] of byDay.entries()) {
            const entradas = items.filter(i => i.type === "Entrada");
            const salidas = items.filter(i => i.type === "Salida");

            // ordenar por tiempo
            entradas.sort((a, b) => a.datetime - b.datetime);
            salidas.sort((a, b) => a.datetime - b.datetime);

            const firstEntry = entradas[0];
            const lastExit = salidas[salidas.length - 1];

            // 3. Validación de error lógico
            if (firstEntry && lastExit && firstEntry.datetime > lastExit.datetime) {
                errors.push({
                    day,
                    message: "Entrada posterior a salida",
                    firstEntry,
                    lastExit
                });
                continue;
            }

            const discarded = items.filter(item => item !== firstEntry && item !== lastExit);
            const discardedList = discarded.map(item => ({
                type: item.type,
                time: `${String(item.datetime.getHours()).padStart(2, "0")}:${String(item.datetime.getMinutes()).padStart(2, "0")}`
            }));
            adaptations.set(day, { hadIntermediates: entradas.length > 1 || salidas.length > 1, discardedList });

            if (firstEntry) cleaned.push(firstEntry);
            if (lastExit) cleaned.push(lastExit);
        }

        return { cleaned, errors, adaptations };
    }

    function calculateDailyHours(entries, duplicatesByDay, adaptations) {
        const byDay = new Map();

        for (const item of entries) {
            const day = getDayKey(item.datetime);

            if (!byDay.has(day)) {
                byDay.set(day, []);
            }

            byDay.get(day).push(item);
        }

        const results = [];

        for (const [day, items] of byDay.entries()) {
            items.sort((a, b) => a.datetime - b.datetime);

            const entradas = items.filter(i => i.type === "Entrada");
            const salidas = items.filter(i => i.type === "Salida");

            if (items[0]?.type === "Salida") {
                continue;
            }

            if (entradas.length === 0 || salidas.length === 0) {
                continue;
            }

            let totalMs = 0;
            const pairs = Math.min(entradas.length, salidas.length);

            for (let i = 0; i < pairs; i++) {
                const entrada = entradas[i];
                const salida = salidas[i];

                if (salida.datetime > entrada.datetime) {
                    totalMs += salida.datetime - entrada.datetime;
                }
            }

            const totalMinutes = Math.floor(totalMs / (1000 * 60));
            const hours = Math.floor(totalMinutes / 60);
            const minutes = totalMinutes % 60;

            results.push({
                day,
                hours,
                minutes,
                totalMinutes,
                hadDuplicates: duplicatesByDay.has(day),
                duplicatesList: duplicatesByDay.get(day) || [],
                hadIntermediates: adaptations.get(day)?.hadIntermediates || false,
                intermediatesList: adaptations.get(day)?.discardedList || []
            });
        }

        return results;
    }

    function getISOWeek(date) {
        const temp = new Date(date.getTime());
        temp.setHours(0, 0, 0, 0);

        // Jueves de la semana actual (truco ISO)
        temp.setDate(temp.getDate() + 3 - ((temp.getDay() + 6) % 7));

        const week1 = new Date(temp.getFullYear(), 0, 4);

        return Math.ceil((((temp - week1) / 86400000) + week1.getDay() + 1) / 7);
    }

    function getWeekKey(date) {
        const year = date.getFullYear();
        const week = getISOWeek(date);
        return `${year}-W${week}`;
    }

    function calculateWeeklyHours(dailyEntries) {
        const byWeek = new Map();

        for (const item of dailyEntries) {
            const weekKey = getWeekKey(item.datetime);

            if (!byWeek.has(weekKey)) {
                byWeek.set(weekKey, []);
            }

            byWeek.get(weekKey).push(item);
        }

        const results = [];

        for (const [, items] of byWeek.entries()) {
            let totalMs = 0;

            items.sort((a, b) => a.datetime - b.datetime);

            const byDay = new Map();

            for (const item of items) {
                const dayKey = item.datetime.toISOString().split("T")[0];

                if (!byDay.has(dayKey)) {
                    byDay.set(dayKey, []);
                }

                byDay.get(dayKey).push(item);
            }

            for (const dayItems of byDay.values()) {
                dayItems.sort((a, b) => a.datetime - b.datetime);

                const entradas = dayItems.filter(i => i.type === "Entrada");
                const salidas = dayItems.filter(i => i.type === "Salida");

                const pairs = Math.min(entradas.length, salidas.length);

                for (let i = 0; i < pairs; i++) {
                    const entrada = entradas[i];
                    const salida = salidas[i];

                    if (salida.datetime > entrada.datetime) {
                        totalMs += salida.datetime - entrada.datetime;
                    }
                }
            }

            const totalMinutes = Math.floor(totalMs / (1000 * 60));
            const hours = Math.floor(totalMinutes / 60);
            const minutes = totalMinutes % 60;

            const dates = items.map(i => i.datetime);
            const firstDay = new Date(Math.min(...dates)).toISOString().split("T")[0];
            const lastDay = new Date(Math.max(...dates)).toISOString().split("T")[0];

            results.push({ firstDay, lastDay, hours, minutes, totalMinutes });
        }

        return results;
    }

    const rows = document.querySelectorAll(".mdc-data-table__row");
    const timeEntries = [];

    rows.forEach((row) => {
        const cells = row.querySelectorAll("[role='cell'], .mdc-data-table__cell, td, mat-cell");

        if (cells.length < 3) return;

        const type = cells[1].textContent.trim();

        const thirdCell = cells[2];
        const dateElement = thirdCell.querySelector("b");

        const date = dateElement ? dateElement.textContent.trim() : null;

        const clone = thirdCell.cloneNode(true);
        const bold = clone.querySelector("b");
        if (bold) bold.remove();

        const time = clone.textContent.trim();

        timeEntries.push({
            type,
            datetime: parseDateTime(date, time)
        });
    });

    // Eliminar duplicados
    const uniqueTimeEntries = Array.from(
        new Map(
            timeEntries.map(item => [
                `${item.type}|${item.datetime.getTime()}`,
                item
            ])
        ).values()
    );

    // Ordenar de más reciente a más antigua
    uniqueTimeEntries.sort((a, b) => a.datetime - b.datetime);

    function calculateToday(entries) {
        if (entries.length === 0) return { status: "no_data" };

        const entradas = entries.filter(e => e.type === "Entrada").sort((a, b) => a.datetime - b.datetime);
        const salidas = entries.filter(e => e.type === "Salida").sort((a, b) => a.datetime - b.datetime);

        if (entradas.length === 0) return { status: "no_data" };

        const exitTime = salidas.length > 0 ? salidas[salidas.length - 1].datetime : new Date();
        const status = salidas.length > 0 ? "complete" : "entry_only";

        const totalMs = exitTime - entradas[0].datetime;
        const totalMinutes = Math.floor(totalMs / (1000 * 60));
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;

        const entry = entradas[0].datetime;
        const entryTime = `${String(entry.getHours()).padStart(2, "0")}:${String(entry.getMinutes()).padStart(2, "0")}`;

        return { status, hours, minutes, totalMinutes, entryTime };
    }

    const rawGroupsByDay = new Map();
    timeEntries.forEach(item => {
        const day = getDayKey(item.datetime);
        const key = `${item.type}|${item.datetime.getTime()}`;
        if (!rawGroupsByDay.has(day)) rawGroupsByDay.set(day, new Map());
        const dayMap = rawGroupsByDay.get(day);
        dayMap.set(key, (dayMap.get(key) || 0) + 1);
    });
    const duplicatesByDay = new Map();
    rawGroupsByDay.forEach((keyMap, day) => {
        const dupes = [];
        keyMap.forEach((count, key) => {
            if (count > 1) {
                const sepIdx = key.indexOf("|");
                const type = key.substring(0, sepIdx);
                const dt = new Date(Number(key.substring(sepIdx + 1)));
                const time = `${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}`;
                dupes.push({ type, time });
            }
        });
        if (dupes.length > 0) duplicatesByDay.set(day, dupes);
    });

    const todayKey = getDayKey(new Date());
    const todayEntries = uniqueTimeEntries.filter(e => getDayKey(e.datetime) === todayKey);
    const todayData = calculateToday(todayEntries);

    const cleanedTimeEntries = cleanTimeEntries(uniqueTimeEntries);

    const dailyHours = calculateDailyHours(cleanedTimeEntries.cleaned, duplicatesByDay, cleanedTimeEntries.adaptations);
    const weeklyHours = calculateWeeklyHours(cleanedTimeEntries.cleaned);

    chrome.storage.local.set({
        resultsData: {
            todayData,
            dailyHours,
            weeklyHours
        }
    }, () => {
        chrome.runtime.sendMessage({
            type: "OPEN_RESULTS_TAB"
        });
    });
}