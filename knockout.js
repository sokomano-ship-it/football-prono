const basePoints = {
  "Valentin": 62,
  "Anne-Sophie": 61,
  "Timothée": 54,
  "Jonathan": 52
};

const stageLabels = {
  LAST_32: "16e de finale",
  LAST_16: "8e de finale",
  QUARTER_FINALS: "Quart de finale",
  SEMI_FINALS: "Demi-finale",
  THIRD_PLACE: "Match pour la 3e place",
  FINAL: "Finale"
};

const stageOrder = [
  "LAST_32",
  "LAST_16",
  "QUARTER_FINALS",
  "SEMI_FINALS",
  "THIRD_PLACE",
  "FINAL"
];

const countryCodes = {
  "South Africa": "za",
  "Canada": "ca",
  "Brazil": "br",
  "Japan": "jp",
  "Germany": "de",
  "Paraguay": "py",
  "Netherlands": "nl",
  "Morocco": "ma",
  "Ivory Coast": "ci",
  "Norway": "no",
  "France": "fr",
  "Sweden": "se",
  "Mexico": "mx",
  "Ecuador": "ec",
  "England": "gb-eng",
  "Congo DR": "cd",
  "Belgium": "be",
  "Senegal": "sn",
  "United States": "us",
  "Bosnia-Herzegovina": "ba",
  "Spain": "es",
  "Austria": "at",
  "Portugal": "pt",
  "Croatia": "hr",
  "Switzerland": "ch",
  "Algeria": "dz",
  "Australia": "au",
  "Egypt": "eg",
  "Argentina": "ar",
  "Cape Verde Islands": "cv",
  "Colombia": "co",
  "Ghana": "gh"
};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  try {
    const [pronostics, apiData] = await Promise.all([
      loadPronostics(),
      loadOfficialMatches()
    ]);

    const matches = normalizeMatches(apiData.matches || []);
    const knockoutMatches = matches.filter(match => stageOrder.includes(match.stage));

    document.getElementById("api-status").innerHTML =
      `✅ ${knockoutMatches.length} matchs de phase finale récupérés automatiquement`;

    const ranking = calculateRanking(pronostics, knockoutMatches);

    renderOverallRanking(ranking);
    renderKnockoutRanking(ranking);
    renderPointsChart(pronostics, knockoutMatches);
    renderKnockoutTable(pronostics, knockoutMatches);
  } catch (error) {
    console.error(error);
    document.getElementById("api-status").innerHTML =
      `❌ Erreur : ${error.message}`;
  }
}

async function loadPronostics() {
  const res = await fetch("data/pronostics_knockout.json");
  if (!res.ok) throw new Error("Impossible de charger data/pronostics_knockout.json");
  return await res.json();
}

async function loadOfficialMatches() {
  const res = await fetch(`/api?apiKey=${encodeURIComponent(API_KEY)}`);

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Erreur API Vercel : ${text}`);
  }

  return await res.json();
}

function normalizeMatches(matches) {
  return matches.map(match => {
    const homeTeam = match.homeTeam?.name || "À déterminer";
    const awayTeam = match.awayTeam?.name || "À déterminer";

    const regularHome =
      match.score?.regularTime?.home ??
      match.score?.fullTime?.home ??
      null;

    const regularAway =
      match.score?.regularTime?.away ??
      match.score?.fullTime?.away ??
      null;

    return {
      id: String(match.id),
      utcDate: match.utcDate,
      status: match.status,
      stage: match.stage,
      homeTeam,
      awayTeam,

      // Score utilisé pour les points : score après 90 minutes
      homeScore: regularHome,
      awayScore: regularAway,

      // Vainqueur/qualifié réel, même après TAB/prolongations
      winner:
        match.score?.winner === "HOME_TEAM" ? homeTeam :
        match.score?.winner === "AWAY_TEAM" ? awayTeam :
        null
    };
  }).sort((a, b) => new Date(a.utcDate) - new Date(b.utcDate));
}

function flagHtml(teamName) {
  const code = countryCodes[teamName];

  if (!code) return "";

  return `<img class="flag" src="https://flagcdn.com/24x18/${code}.png" alt="${teamName}">`;
}

function teamHtml(teamName) {
  return `${flagHtml(teamName)} <span>${teamName}</span>`;
}

function getIssue(homeScore, awayScore) {
  if (Number(homeScore) > Number(awayScore)) return "1";
  if (Number(homeScore) < Number(awayScore)) return "2";
  return "N";
}

function calculatePoints(prediction, match) {
  if (!prediction || !match) return 0;
  if (match.homeScore === null || match.awayScore === null) return 0;

  let points = 0;

  const predictedIssue = getIssue(prediction.homeScore, prediction.awayScore);
  const realIssue = getIssue(match.homeScore, match.awayScore);

  if (prediction.qualified === match.winner) points += 1;
  if (predictedIssue === realIssue) points += 1;

  if (
    Number(prediction.homeScore) === Number(match.homeScore) &&
    Number(prediction.awayScore) === Number(match.awayScore)
  ) {
    points += 1;
  }

  return points;
}

function calculateRanking(pronostics, matches) {
  return pronostics.players.map(player => {
    let knockoutPoints = 0;

    matches.forEach(match => {
      const prediction = pronostics.predictions?.[match.id]?.[player];
      knockoutPoints += calculatePoints(prediction, match);
    });

    return {
      player,
      basePoints: basePoints[player] || 0,
      knockoutPoints,
      totalPoints: (basePoints[player] || 0) + knockoutPoints
    };
  });
}

function renderOverallRanking(ranking) {
  const sorted = [...ranking].sort((a, b) => b.totalPoints - a.totalPoints);

  document.getElementById("overall-ranking").innerHTML = `
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
        ${sorted.map((row, i) => `
          <tr>
            <td>${i + 1}</td>
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
  const sorted = [...ranking].sort((a, b) => b.knockoutPoints - a.knockoutPoints);

  document.getElementById("knockout-ranking").innerHTML = `
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
        ${sorted.map((row, i) => `
          <tr>
            <td>${i + 1}</td>
            <td><strong>${row.player}</strong></td>
            <td>${row.knockoutPoints}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

function buildPointsEvolution(pronostics, matches) {
  const completedMatches = matches
    .filter(match => match.homeScore !== null && match.awayScore !== null)
    .sort((a, b) => new Date(a.utcDate) - new Date(b.utcDate));

  const totals = {};
  pronostics.players.forEach(player => {
    totals[player] = basePoints[player] || 0;
  });

  const evolution = [
    {
      label: "Début phase finale",
      ...totals
    }
  ];

  completedMatches.forEach(match => {
    pronostics.players.forEach(player => {
      const prediction = pronostics.predictions?.[match.id]?.[player];
      totals[player] += calculatePoints(prediction, match);
    });

    evolution.push({
      label: `${match.homeTeam} - ${match.awayTeam}`,
      ...totals
    });
  });

  return evolution;
}

let pointsChart = null;

function renderPointsChart(pronostics, matches) {
  const canvas = document.getElementById("points-chart");
  if (!canvas || typeof Chart === "undefined") return;

  const evolution = buildPointsEvolution(pronostics, matches);

  if (pointsChart) pointsChart.destroy();

  pointsChart = new Chart(canvas, {
    type: "line",
    data: {
      labels: evolution.map(row => row.label),
      datasets: pronostics.players.map(player => ({
        label: player,
        data: evolution.map(row => row[player]),
        tension: 0.25
      }))
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          labels: {
            color: "#f5f7fb"
          }
        }
      },
      scales: {
        x: {
          ticks: {
            color: "#dbe6f3"
          },
          grid: {
            color: "rgba(255,255,255,0.08)"
          }
        },
        y: {
          ticks: {
            color: "#dbe6f3"
          },
          grid: {
            color: "rgba(255,255,255,0.08)"
          }
        }
      }
    }
  });
}

function renderKnockoutTable(pronostics, matches) {
  let html = "";

  stageOrder.forEach(stage => {
    const stageMatches = matches.filter(match => match.stage === stage);
    if (!stageMatches.length) return;

    html += `<h2>${stageLabels[stage]}</h2>`;

    html += `
      <table>
        <thead>
          <tr>
            <th>Match</th>
            <th>Date</th>
            <th>Résultat officiel</th>
            ${pronostics.players.map(player => `<th>${player}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
    `;

    stageMatches.forEach(match => {
      const date = match.utcDate
        ? new Date(match.utcDate).toLocaleString("fr-FR")
        : "-";

      const official = match.homeScore !== null
        ? `${match.homeScore}-${match.awayScore}<br>Qualifié : <strong>${teamHtml(match.winner || "-")}</strong>`
        : `<span class="muted">À venir</span>`;

      html += `
        <tr>
          <td>
            <strong>${teamHtml(match.homeTeam)}</strong><br>
            ${teamHtml(match.awayTeam)}<br>
            <span class="muted">ID : ${match.id}</span>
          </td>
          <td>${date}</td>
          <td>${official}</td>
          ${pronostics.players.map(player => {
            const prediction = pronostics.predictions?.[match.id]?.[player];

            if (!prediction) {
              return `<td class="muted">Pas encore pronostiqué</td>`;
            }

            const pts = calculatePoints(prediction, match);

            return `
              <td>
                ${prediction.homeScore}-${prediction.awayScore}<br>
                Qualifié : <strong>${teamHtml(prediction.qualified)}</strong><br>
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

  document.getElementById("knockout-table").innerHTML = html;
}