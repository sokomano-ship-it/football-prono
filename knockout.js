const basePoints = {
  "Valentin": 62,
  "Anne-Sophie": 61,
  "Timothée": 54,
  "Jonathan": 52
};

const roundLabels = {
  R32: "16e de finale",
  R16: "8e de finale",
  QF: "Quart de finale",
  SF: "Demi-finale",
  THIRD: "Match pour la 3e place",
  FINAL: "Finale"
};

document.addEventListener("DOMContentLoaded", loadKnockout);

async function loadKnockout() {
  const [pronosticsRes, resultsRes] = await Promise.all([
    fetch("data/pronostics_knockout.json"),
    fetch("data/results_knockout.json")
  ]);

  const pronostics = await pronosticsRes.json();
  const results = await resultsRes.json();

  const knockoutRanking = calculateKnockoutRanking(pronostics, results);

  renderOverallRanking(knockoutRanking);
  renderKnockoutRanking(knockoutRanking);
  renderKnockoutTable(pronostics, results);
}

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

function findResult(match, results) {
  return results.matches.find(r => r.id === match.id);
}

function calculateKnockoutRanking(pronostics, results) {
  return pronostics.players.map(player => {
    let points = 0;

    pronostics.matches.forEach(match => {
      const result = findResult(match, results);
      const prediction = match.predictions[player];
      points += calculateKnockoutPoints(prediction, result);
    });

    return {
      player,
      knockoutPoints: points,
      basePoints: basePoints[player] || 0,
      totalPoints: (basePoints[player] || 0) + points
    };
  });
}

function renderOverallRanking(ranking) {
  const container = document.getElementById("overall-ranking");

  const sorted = [...ranking].sort((a, b) => b.totalPoints - a.totalPoints);

  container.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Rang</th>
          <th>Joueur</th>
          <th>Phase 1</th>
          <th>Phase finale</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        ${sorted.map((row, index) => `
          <tr>
            <td>${index + 1}</td>
            <td><strong>${row.player}</strong></td>
            <td>${row.basePoints}</td>
            <td>${row.knockoutPoints}</td>
            <td><strong>${row.totalPoints}</strong></td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

function renderKnockoutRanking(ranking) {
  const container = document.getElementById("knockout-ranking");

  const sorted = [...ranking].sort((a, b) => b.knockoutPoints - a.knockoutPoints);

  container.innerHTML = `
    <h2>Classement phase finale</h2>
    <table>
      <thead>
        <tr>
          <th>Rang</th>
          <th>Joueur</th>
          <th>Points phase finale</th>
        </tr>
      </thead>
      <tbody>
        ${sorted.map((row, index) => `
          <tr>
            <td>${index + 1}</td>
            <td><strong>${row.player}</strong></td>
            <td>${row.knockoutPoints}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

function renderKnockoutTable(pronostics, results) {
  const container = document.getElementById("knockout-table");
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
        const result = findResult(match, results);

        const official =
          result && result.homeScore !== null
            ? `${result.homeScore}-${result.awayScore}<br>Qualifié : <strong>${result.qualified}</strong>`
            : `<span class="muted">À venir</span>`;

        html += `
          <tr>
            <td><strong>${match.home}</strong><br>${match.away}</td>
            <td>${official}</td>
            ${pronostics.players.map(player => {
              const pred = match.predictions[player];

              if (!pred) return `<td class="muted">-</td>`;

              const pts = calculateKnockoutPoints(pred, result);

              return `
                <td>
                  ${pred.homeScore}-${pred.awayScore}<br>
                  Qualifié : <strong>${pred.qualified}</strong><br>
                  <span class="points">${pts} pt${pts > 1 ? "s" : ""}</span>
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