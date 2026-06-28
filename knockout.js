const roundLabels = {
    R16: "16e de finale",
    R8: "8e de finale",
    QF: "Quart de finale",
    SF: "Demi-finale",
    THIRD: "Match pour la 3e place",
    FINAL: "Finale"
};

function getIssue(homeScore, awayScore) {
    if (Number(homeScore) > Number(awayScore)) return "1";
    if (Number(homeScore) < Number(awayScore)) return "2";
    return "N";
}

function calculateKnockoutPoints(prediction, result) {
    if (!prediction || !result) return 0;
    if (result.homeScore === null || result.awayScore === null) return 0;

    let points = 0;

    const predictedIssue = getIssue(prediction.homeScore, prediction.awayScore);
    const realIssue = getIssue(result.homeScore, result.awayScore);

    if (prediction.qualified === result.qualified) points += 1;
    if (predictedIssue === realIssue) points += 1;

    if (
        Number(prediction.homeScore) === Number(result.homeScore) &&
        Number(prediction.awayScore) === Number(result.awayScore)
    ) {
        points += 1;
    }

    return points;
}

async function loadKnockout() {
    const [pronosticsRes, resultsRes] = await Promise.all([
        fetch("data/pronostics_knockout.json"),
        fetch("data/results_knockout.json")
    ]);

    const pronostics = await pronosticsRes.json();
    const results = await resultsRes.json();

    renderKnockoutTable(pronostics, results);
    renderKnockoutRanking(pronostics, results);
}

function findKnockoutResult(match, results) {
    return results.matches.find(r => r.id === match.id);
}

function renderKnockoutTable(pronostics, results) {
    const container = document.getElementById("knockout-table");
    if (!container) return;

    let html = "";

    const rounds = [...new Set(pronostics.matches.map(m => m.round))];

    rounds.forEach(round => {
        html += `<h2>${roundLabels[round] || round}</h2>`;
        html += `
            <table>
                <thead>
                    <tr>
                        <th>Match</th>
                        <th>Résultat officiel</th>
                        ${pronostics.players.map(p => `<th>${p}</th>`).join("")}
                    </tr>
                </thead>
                <tbody>
        `;

        pronostics.matches
            .filter(match => match.round === round)
            .forEach(match => {
                const result = findKnockoutResult(match, results);

                const official =
                    result && result.homeScore !== null
                        ? `${result.homeScore}-${result.awayScore}, qualifié : ${result.qualified || "-"}`
                        : "-";

                html += `
                    <tr>
                        <td>${match.home} - ${match.away}</td>
                        <td>${official}</td>
                        ${pronostics.players.map(player => {
                            const pred = match.predictions[player];
                            const pts = calculateKnockoutPoints(pred, result);

                            if (!pred) return `<td>-</td>`;

                            return `
                                <td>
                                    ${pred.homeScore}-${pred.awayScore}<br>
                                    Qualifié : ${pred.qualified}<br>
                                    <strong>${pts} pt${pts > 1 ? "s" : ""}</strong>
                                </td>
                            `;
                        }).join("")}
                    </tr>
                `;
            });

        html += `
                </tbody>
            </table>
        `;
    });

    container.innerHTML = html;
}

function renderKnockoutRanking(pronostics, results) {
    const container = document.getElementById("knockout-ranking");
    if (!container) return;

    const ranking = pronostics.players.map(player => {
        let points = 0;

        pronostics.matches.forEach(match => {
            const result = findKnockoutResult(match, results);
            const pred = match.predictions[player];

            points += calculateKnockoutPoints(pred, result);
        });

        return { player, points };
    });

    ranking.sort((a, b) => b.points - a.points);

    container.innerHTML = `
        <h2>Classement phase finale</h2>
        <table>
            <thead>
                <tr>
                    <th>Rang</th>
                    <th>Joueur</th>
                    <th>Points</th>
                </tr>
            </thead>
            <tbody>
                ${ranking.map((row, index) => `
                    <tr>
                        <td>${index + 1}</td>
                        <td>${row.player}</td>
                        <td><strong>${row.points}</strong></td>
                    </tr>
                `).join("")}
            </tbody>
        </table>
    `;
}

document.addEventListener("DOMContentLoaded", loadKnockout);